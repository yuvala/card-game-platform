import http from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';

import {
    isClientMessage,
    ROLE_CAN_CONFIGURE,
    ROLE_CAN_GAME_EVENTS,
    type ClientRole,
    type ClientMessage,
    type ServerMessage,
} from '@engine/session/protocol';
import { GameSessionHost, type RewriteSessionHostOptions } from './GameSessionHost';
import { SessionLifecycle } from './SessionLifecycle';
import { logger } from './logger';

const DEFAULT_ROOM_ID = '__default__';

interface RewriteClient {
    socket: WebSocket;
    role: ClientRole;
    viewerId: string | null;
    roomId: string;
}

interface RoomSession {
    gameHost: GameSessionHost;
    clients: Set<RewriteClient>;
    lifecycle: SessionLifecycle;
    configOwner: RewriteClient | null;
}

export interface GameWebSocketServer {
    server: http.Server;
    wss: WebSocketServer;
    getGameHost(roomId?: string): GameSessionHost | undefined;
    close(): Promise<void>;
}

export function createGameWebSocketServer(
    options: RewriteSessionHostOptions = {},
): GameWebSocketServer {
    const rooms = new Map<string, RoomSession>();

    function getOrCreateRoom(roomId: string): RoomSession {
        const existing = rooms.get(roomId);
        if (existing) return existing;

        const gameHost = new GameSessionHost(options);
        const clients = new Set<RewriteClient>();
        const lifecycle = new SessionLifecycle({
            onAbandoned: () => {
                gameHost.stop();
                rooms.delete(roomId);
                logger.info({ roomId }, 'room destroyed after idle timeout');
            },
        });

        const session: RoomSession = { gameHost, clients, lifecycle, configOwner: null };

        gameHost.subscribe(() => {
            const view = gameHost.getSessionView(null);
            if (view.type === 'session-view') {
                const vm = view.viewModel as { controls?: { canRestart?: boolean } };
                if (vm?.controls?.canRestart) {
                    session.configOwner = null;
                }
            }
            sanitizeClientViewers(gameHost, clients);
            broadcastViews(gameHost, clients);
        });
        rooms.set(roomId, session);
        logger.info({ roomId, totalRooms: rooms.size }, 'room created');
        return session;
    }

    const server = http.createServer((_request, response) => {
        response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        response.end(
            JSON.stringify({
                ok: true,
                service: 'rewrite-websocket',
                rooms: rooms.size,
            }),
        );
    });
    const wss = new WebSocketServer({ server });

    wss.on('connection', (socket) => {
        const client: RewriteClient = {
            socket,
            role: 'spectator',
            viewerId: null,
            roomId: DEFAULT_ROOM_ID,
        };

        const defaultRoom = getOrCreateRoom(DEFAULT_ROOM_ID);
        defaultRoom.clients.add(client);
        defaultRoom.lifecycle.onClientConnected(defaultRoom.clients.size);
        logger.info({ rooms: rooms.size, clients: defaultRoom.clients.size }, 'client connected');

        socket.on('message', (payload) => {
            handleSocketMessage(rooms, getOrCreateRoom, client, toUtf8(payload));
        });

        socket.on('close', () => {
            const room = rooms.get(client.roomId);
            if (room) {
                room.clients.delete(client);
                if (room.configOwner === client) {
                    room.configOwner = null;
                }
                room.lifecycle.onClientDisconnected(room.clients.size);
                logger.info({ roomId: client.roomId, clients: room.clients.size }, 'client disconnected');
            }
        });
    });

    return {
        server,
        wss,
        getGameHost: (roomId = DEFAULT_ROOM_ID) => rooms.get(roomId)?.gameHost,
        close: () => closeGameWebSocketServer(server, wss, rooms),
    };
}

function assignClientToRoom(
    rooms: Map<string, RoomSession>,
    getOrCreateRoom: (roomId: string) => RoomSession,
    client: RewriteClient,
    newRoomId: string,
): RoomSession {
    if (client.roomId !== newRoomId) {
        const oldRoom = rooms.get(client.roomId);
        if (oldRoom) {
            oldRoom.clients.delete(client);
            oldRoom.lifecycle.onClientDisconnected(oldRoom.clients.size);
        }
        client.roomId = newRoomId;
        const newRoom = getOrCreateRoom(newRoomId);
        newRoom.clients.add(client);
        newRoom.lifecycle.onClientConnected(newRoom.clients.size);
        return newRoom;
    }
    return getOrCreateRoom(client.roomId);
}

function toUtf8(payload: Buffer | ArrayBuffer | Buffer[]): string {
    if (Buffer.isBuffer(payload)) return payload.toString('utf8');
    if (payload instanceof ArrayBuffer) return Buffer.from(payload).toString('utf8');
    return Buffer.concat(payload).toString('utf8');
}

function handleSocketMessage(
    rooms: Map<string, RoomSession>,
    getOrCreateRoom: (roomId: string) => RoomSession,
    client: RewriteClient,
    rawMessage: string,
): void {
    let parsed: unknown;
    try {
        parsed = JSON.parse(rawMessage);
    } catch {
        sendError(client, 'Invalid JSON message.');
        return;
    }

    if (!isClientMessage(parsed)) {
        logger.warn({ raw: rawMessage.slice(0, 200) }, 'rejected invalid client message');
        sendError(client, 'Unsupported client message.');
        return;
    }

    handleClientMessage(rooms, getOrCreateRoom, client, parsed);
}

function handleClientMessage(
    rooms: Map<string, RoomSession>,
    getOrCreateRoom: (roomId: string) => RoomSession,
    client: RewriteClient,
    message: ClientMessage,
): void {
    switch (message.type) {
        case 'watch-session': {
            const roomId = message.sessionId ?? DEFAULT_ROOM_ID;
            if (message.role) {
                client.role = message.role;
                if (!ROLE_CAN_GAME_EVENTS.has(client.role)) {
                    client.viewerId = null;
                }
            }
            const room = assignClientToRoom(rooms, getOrCreateRoom, client, roomId);
            sendView(room.gameHost, client);
            return;
        }
        case 'set-viewer': {
            const room = rooms.get(client.roomId);
            if (room) {
                client.viewerId = message.playerId;
                sendView(room.gameHost, client);
            }
            return;
        }
        case 'configure-session': {
            const room = rooms.get(client.roomId);
            if (!room) return;
            if (!ROLE_CAN_CONFIGURE.has(client.role)) {
                logger.warn({ role: client.role }, 'configure-session rejected — not operator');
                sendError(client, 'Only operator clients can configure the session.');
                return;
            }
            if (room.configOwner !== null && room.configOwner !== client) {
                logger.warn({ roomId: client.roomId }, 'configure-session rejected — game in progress');
                sendError(client, 'A game is already in progress in this room.');
                return;
            }
            logger.info(
                { roomId: client.roomId, gameId: message.config.gameId, playerCount: message.config.playerCount },
                'configure-session',
            );
            room.gameHost.configure(message.config);
            room.configOwner = client;
            return;
        }
        case 'game-event': {
            const room = rooms.get(client.roomId);
            if (!room) return;
            if (!ROLE_CAN_GAME_EVENTS.has(client.role)) {
                sendError(client, 'Spectators cannot send game events.');
                return;
            }
            if (client.role === 'player' && !client.viewerId) {
                sendError(client, 'Player clients must select a viewer before sending game events.');
                return;
            }
            const result = room.gameHost.sendClientEvent(
                client.viewerId,
                message.event,
                message.expectedSequence,
            );
            if (!result.ok) {
                sendError(client, result.message ?? 'Illegal player event.');
            }
            return;
        }
    }
}

function sanitizeClientViewers(gameHost: GameSessionHost, clients: Set<RewriteClient>): void {
    const sessionView = gameHost.getSessionView(null);
    if (sessionView.type !== 'session-view') return;

    const activePlayerIds = new Set(sessionView.players.map((player) => player.id));
    clients.forEach((client) => {
        if (client.viewerId && !activePlayerIds.has(client.viewerId)) {
            client.viewerId = null;
        }
    });
}

function broadcastViews(gameHost: GameSessionHost, clients: Set<RewriteClient>): void {
    clients.forEach((client) => sendView(gameHost, client));
}

function sendView(gameHost: GameSessionHost, client: RewriteClient): void {
    send(client, gameHost.getSessionView(client.viewerId));
}

function sendError(client: RewriteClient, message: string): void {
    send(client, { type: 'error', message });
}

function send(client: RewriteClient, message: ServerMessage): void {
    if (client.socket.readyState !== WebSocket.OPEN) return;
    client.socket.send(JSON.stringify(message));
}

function closeGameWebSocketServer(
    server: http.Server,
    wss: WebSocketServer,
    rooms: Map<string, RoomSession>,
): Promise<void> {
    rooms.forEach((room) => {
        room.lifecycle.destroy();
        room.gameHost.stop();
    });
    rooms.clear();
    wss.clients.forEach((client) => client.close());
    wss.close();

    return new Promise((resolve, reject) => {
        server.close((error) => {
            if (error) { reject(error); return; }
            resolve();
        });
    });
}
