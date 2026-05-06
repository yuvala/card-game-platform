import type { CardGameSession } from "../game/session";
import type { CardGameEvent } from "../game/types";
import type { CardGameViewModel } from "../game/viewModel";
import {
    isRewriteServerMessage,
    type SessionPlayerSummary,
    type RewriteClientMessage,
    type RewriteServerMessage
} from "./protocol";

interface RemoteGameSessionInput {
    url: string;
    viewerId?: string | null;
    sessionId?: string;
}

type RemoteSessionListener = (snapshot: CardGameViewModel) => void;

export interface RemoteGameSession extends CardGameSession<CardGameViewModel> {
    getPlayers(): SessionPlayerSummary[];
    getViewerId(): string | null;
    setViewer(playerId: string | null): void;
}

export async function createRemoteGameSession(
    input: RemoteGameSessionInput
): Promise<RemoteGameSession> {
    const socket = new WebSocket(input.url);
    const initialMessage = await waitForInitialSessionView(socket, input.sessionId);
    return createConnectedRemoteGameSession(socket, initialMessage, input.viewerId ?? null);
}

function createConnectedRemoteGameSession(
    socket: WebSocket,
    initialMessage: Extract<RewriteServerMessage, { type: "session-view" }>,
    viewerId: string | null
): RemoteGameSession {
    let latestMessage = initialMessage;
    let activeViewerId = viewerId;
    const listeners = new Set<RemoteSessionListener>();

    socket.addEventListener("message", (event) => {
        const message = parseServerMessage(event.data);
        if (!message) {
            return;
        }

        if (message.type === "error") {
            console.error("Rewrite WebSocket error:", message.message);
            return;
        }

        latestMessage = message;
        listeners.forEach((listener) => {
            listener(latestMessage.viewModel);
        });
    });

    return {
        id: latestMessage.sessionId,
        gameId: latestMessage.gameId,
        get playerNames() {
            return latestMessage.players.map((player) => player.name);
        },
        getSnapshot: () => latestMessage.viewModel,
        subscribe: (listener) => {
            listeners.add(listener);
            return {
                unsubscribe: () => {
                    listeners.delete(listener);
                }
            };
        },
        send: (event: CardGameEvent) => {
            sendClientMessage(socket, {
                type: "game-event",
            playerId: activeViewerId,
                event
            });
        },
        start: () => {
            sendClientMessage(socket, {
                type: "watch-session",
                sessionId: latestMessage.sessionId
            });
        },
        stop: () => {
            socket.close();
        },
        getViewModel: () => latestMessage.viewModel,
        getPlayers: () => latestMessage.players,
        getViewerId: () => activeViewerId,
        setViewer: (playerId) => {
            activeViewerId = playerId;
            sendClientMessage(socket, {
                type: "set-viewer",
                playerId
            });
        }
    };
}

function waitForInitialSessionView(
    socket: WebSocket,
    sessionId?: string
): Promise<Extract<RewriteServerMessage, { type: "session-view" }>> {
    return new Promise((resolve, reject) => {
        const cleanup = () => {
            socket.removeEventListener("open", handleOpen);
            socket.removeEventListener("message", handleMessage);
            socket.removeEventListener("error", handleError);
            socket.removeEventListener("close", handleClose);
        };

        const handleOpen = () => {
            sendClientMessage(socket, {
                type: "watch-session",
                sessionId
            });
        };

        const handleMessage = (event: MessageEvent) => {
            const message = parseServerMessage(event.data);
            if (!message) {
                return;
            }

            if (message.type === "error") {
                cleanup();
                reject(new Error(message.message));
                return;
            }

            cleanup();
            resolve(message);
        };

        const handleError = () => {
            cleanup();
            reject(new Error("Rewrite WebSocket connection failed."));
        };

        const handleClose = () => {
            cleanup();
            reject(new Error("Rewrite WebSocket closed before the first session view."));
        };

        socket.addEventListener("open", handleOpen);
        socket.addEventListener("message", handleMessage);
        socket.addEventListener("error", handleError);
        socket.addEventListener("close", handleClose);
    });
}

function parseServerMessage(data: unknown): RewriteServerMessage | null {
    if (typeof data !== "string") {
        return null;
    }

    try {
        const parsed = JSON.parse(data) as unknown;
        return isRewriteServerMessage(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function sendClientMessage(socket: WebSocket, message: RewriteClientMessage): void {
    if (socket.readyState !== WebSocket.OPEN) {
        return;
    }

    socket.send(JSON.stringify(message));
}
