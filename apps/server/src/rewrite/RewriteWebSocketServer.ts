import http from "node:http";
import { WebSocket, WebSocketServer } from "ws";

import {
    isRewriteClientMessage,
    type RewriteClientMessage,
    type RewriteServerMessage
} from "@rewrite-core/session/protocol";
import { RewriteGameSessionHost, type RewriteSessionHostOptions } from "./GameSessionHost";

interface RewriteClient {
    socket: WebSocket;
    viewerId: string | null;
}

export interface RewriteWebSocketServer {
    server: http.Server;
    wss: WebSocketServer;
    gameHost: RewriteGameSessionHost;
    close(): Promise<void>;
}

export function createRewriteWebSocketServer(options: RewriteSessionHostOptions = {}): RewriteWebSocketServer {
    const gameHost = new RewriteGameSessionHost(options);
    const clients = new Set<RewriteClient>();

    const server = http.createServer((_request, response) => {
        response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({
            ok: true,
            service: "rewrite-websocket",
            sessionId: gameHost.sessionId
        }));
    });
    const wss = new WebSocketServer({ server });

    gameHost.subscribe(() => {
        sanitizeClientViewers(gameHost, clients);
        broadcastViews(gameHost, clients);
    });

    wss.on("connection", (socket) => {
        const client: RewriteClient = {
            socket,
            viewerId: null
        };
        clients.add(client);
        sendView(gameHost, client);

        socket.on("message", (payload) => {
            handleSocketMessage(gameHost, client, payload.toString());
        });

        socket.on("close", () => {
            clients.delete(client);
        });
    });

    return {
        server,
        wss,
        gameHost,
        close: () => closeRewriteWebSocketServer(server, wss, gameHost)
    };
}

function handleSocketMessage(
    gameHost: RewriteGameSessionHost,
    client: RewriteClient,
    rawMessage: string
): void {
    let parsed: unknown;
    try {
        parsed = JSON.parse(rawMessage);
    } catch {
        sendError(client, "Invalid JSON message.");
        return;
    }

    if (!isRewriteClientMessage(parsed)) {
        sendError(client, "Unsupported client message.");
        return;
    }

    handleClientMessage(gameHost, client, parsed);
}

function handleClientMessage(
    gameHost: RewriteGameSessionHost,
    client: RewriteClient,
    message: RewriteClientMessage
): void {
    switch (message.type) {
        case "watch-session":
            sendView(gameHost, client);
            return;
        case "set-viewer":
            client.viewerId = message.playerId;
            sendView(gameHost, client);
            return;
        case "configure-session":
            gameHost.configure(message.config);
            return;
        case "game-event":
            {
                const result = gameHost.sendClientEvent(client.viewerId, message.event, message.expectedSequence);
                if (!result.ok) {
                    sendError(client, result.message ?? "Illegal player event.");
                }
            }
            return;
    }
}

function sanitizeClientViewers(gameHost: RewriteGameSessionHost, clients: Set<RewriteClient>): void {
    const sessionView = gameHost.getSessionView(null);
    if (sessionView.type !== "session-view") {
        return;
    }

    const activePlayerIds = new Set(sessionView.players.map((player) => player.id));
    clients.forEach((client) => {
        if (client.viewerId && !activePlayerIds.has(client.viewerId)) {
            client.viewerId = null;
        }
    });
}

function broadcastViews(gameHost: RewriteGameSessionHost, clients: Set<RewriteClient>): void {
    clients.forEach((client) => {
        sendView(gameHost, client);
    });
}

function sendView(gameHost: RewriteGameSessionHost, client: RewriteClient): void {
    send(client, gameHost.getSessionView(client.viewerId));
}

function sendError(client: RewriteClient, message: string): void {
    send(client, { type: "error", message });
}

function send(client: RewriteClient, message: RewriteServerMessage): void {
    if (client.socket.readyState !== WebSocket.OPEN) {
        return;
    }

    client.socket.send(JSON.stringify(message));
}

function closeRewriteWebSocketServer(
    server: http.Server,
    wss: WebSocketServer,
    gameHost: RewriteGameSessionHost
): Promise<void> {
    gameHost.stop();
    wss.clients.forEach((client) => {
        client.close();
    });
    wss.close();

    return new Promise((resolve, reject) => {
        server.close((error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
}
