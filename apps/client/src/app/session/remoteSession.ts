import type { CardGameSession } from '@engine/engine/game/session';
import type { CardGameEvent } from '@engine/engine/game/types';
import type { CardGameViewModel } from '@engine/engine/game/viewModel';
import {
    isServerMessage,
    type SessionPlayerSummary,
    type ClientRole,
    type ClientMessage,
    type SessionConfig,
    type ServerMessage,
} from '@engine/session/protocol';

interface RemoteGameSessionInput {
    url: string;
    role?: ClientRole;
    viewerId?: string | null;
    sessionId?: string;
}

type RemoteSessionListener = (snapshot: CardGameViewModel) => void;

export type RemoteSessionStatus =
    | { type: 'connected' }
    | { type: 'error'; message: string }
    | { type: 'closed'; message: string };

export interface RemoteGameSession extends CardGameSession<CardGameViewModel> {
    getPlayers(): SessionPlayerSummary[];
    getViewerId(): string | null;
    getStatus(): RemoteSessionStatus;
    configure(config: SessionConfig): Promise<void>;
    setViewer(playerId: string | null): void;
}

export async function createRemoteGameSession(
    input: RemoteGameSessionInput,
): Promise<RemoteGameSession> {
    const socket = new WebSocket(input.url);
    const initialMessage = await waitForInitialSessionView(socket, {
        sessionId: input.sessionId,
        role: input.role,
    });
    return createConnectedRemoteGameSession(
        socket,
        initialMessage,
        input.viewerId ?? null,
        input.role ?? 'operator',
    );
}

function createConnectedRemoteGameSession(
    socket: WebSocket,
    initialMessage: Extract<ServerMessage, { type: 'session-view' }>,
    viewerId: string | null,
    role: ClientRole,
): RemoteGameSession {
    let latestMessage = initialMessage;
    let activeViewerId = viewerId;
    const activeRole = role;
    let status: RemoteSessionStatus = { type: 'connected' };
    const listeners = new Set<RemoteSessionListener>();
    const pendingSessionViewResolvers = new Set<() => void>();

    const notifyListeners = () => {
        const viewModel = getLatestViewModel(latestMessage);
        listeners.forEach((listener) => {
            listener(viewModel);
        });
    };

    socket.addEventListener('message', (event) => {
        const message = parseServerMessage(event.data);
        if (!message) {
            return;
        }

        if (message.type === 'error') {
            status = {
                type: 'error',
                message: message.message,
            };
            notifyListeners();
            return;
        }

        if (message.sequence < latestMessage.sequence) {
            return;
        }

        latestMessage = message;
        activeViewerId = message.viewerId;
        status = { type: 'connected' };
        notifyListeners();
        pendingSessionViewResolvers.forEach((resolve) => {
            resolve();
        });
        pendingSessionViewResolvers.clear();
    });

    socket.addEventListener('close', () => {
        status = {
            type: 'closed',
            message: 'Connection to the table was closed.',
        };
        notifyListeners();
    });

    socket.addEventListener('error', () => {
        status = {
            type: 'error',
            message: 'Connection to the table failed.',
        };
        notifyListeners();
    });

    return {
        get id() {
            return latestMessage.sessionId;
        },
        get gameId() {
            return latestMessage.gameId;
        },
        get playerNames() {
            return latestMessage.players.map((player) => player.name);
        },
        getSnapshot: () => getLatestViewModel(latestMessage),
        subscribe: (listener) => {
            listeners.add(listener);
            return {
                unsubscribe: () => {
                    listeners.delete(listener);
                },
            };
        },
        send: (event: CardGameEvent) => {
            sendClientMessage(socket, {
                type: 'game-event',
                expectedSequence: latestMessage.sequence,
                event,
            });
        },
        start: () => {
            sendClientMessage(socket, {
                type: 'watch-session',
                sessionId: latestMessage.sessionId,
                role: activeRole,
            });
        },
        stop: () => {
            socket.close();
        },
        getViewModel: () => getLatestViewModel(latestMessage),
        getPlayers: () => latestMessage.players,
        getViewerId: () => activeViewerId,
        getStatus: () => status,
        configure: (config) => {
            return waitForNextSessionView(socket, pendingSessionViewResolvers, () => {
                sendClientMessage(socket, {
                    type: 'configure-session',
                    config,
                });
            });
        },
        setViewer: (playerId) => {
            activeViewerId = playerId;
            sendClientMessage(socket, {
                type: 'set-viewer',
                playerId,
            });
        },
    };
}

function waitForNextSessionView(
    socket: WebSocket,
    resolvers: Set<() => void>,
    sendMessage: () => void,
): Promise<void> {
    if (socket.readyState !== WebSocket.OPEN) {
        return Promise.reject(new Error('WebSocket is not open.'));
    }

    return new Promise((resolve, reject) => {
        const cleanup = () => {
            resolvers.delete(handleSessionView);
            socket.removeEventListener('close', handleClose);
            socket.removeEventListener('error', handleError);
        };

        const handleSessionView = () => {
            cleanup();
            resolve();
        };

        const handleClose = () => {
            cleanup();
            reject(new Error('WebSocket closed before session configuration completed.'));
        };

        const handleError = () => {
            cleanup();
            reject(new Error('WebSocket failed before session configuration completed.'));
        };

        resolvers.add(handleSessionView);
        socket.addEventListener('close', handleClose);
        socket.addEventListener('error', handleError);
        sendMessage();
    });
}

function getLatestViewModel(
    message: Extract<ServerMessage, { type: 'session-view' }>,
): CardGameViewModel {
    return message.viewModel as CardGameViewModel;
}

function waitForInitialSessionView(
    socket: WebSocket,
    input: {
        sessionId?: string;
        role?: ClientRole;
    },
): Promise<Extract<ServerMessage, { type: 'session-view' }>> {
    return new Promise((resolve, reject) => {
        const cleanup = () => {
            socket.removeEventListener('open', handleOpen);
            socket.removeEventListener('message', handleMessage);
            socket.removeEventListener('error', handleError);
            socket.removeEventListener('close', handleClose);
        };

        const handleOpen = () => {
            const role = input.role ?? 'operator';
            sendClientMessage(socket, {
                type: 'watch-session',
                sessionId: input.sessionId,
                role,
            });
        };

        const handleMessage = (event: MessageEvent) => {
            const message = parseServerMessage(event.data);
            if (!message) {
                return;
            }

            if (message.type === 'error') {
                cleanup();
                reject(new Error(message.message));
                return;
            }

            cleanup();
            resolve(message);
        };

        const handleError = () => {
            cleanup();
            reject(new Error('WebSocket connection failed.'));
        };

        const handleClose = () => {
            cleanup();
            reject(new Error('WebSocket closed before the first session view.'));
        };

        socket.addEventListener('open', handleOpen);
        socket.addEventListener('message', handleMessage);
        socket.addEventListener('error', handleError);
        socket.addEventListener('close', handleClose);
    });
}

function parseServerMessage(data: unknown): ServerMessage | null {
    if (typeof data !== 'string') {
        return null;
    }

    try {
        const parsed = JSON.parse(data) as unknown;
        return isServerMessage(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function sendClientMessage(socket: WebSocket, message: ClientMessage): void {
    if (socket.readyState !== WebSocket.OPEN) {
        return;
    }

    socket.send(JSON.stringify(message));
}
