import http from "node:http";
import { WebSocket, WebSocketServer } from "ws";

import {
    isRewriteClientMessage,
    type RewriteClientMessage,
    type RewriteServerMessage
} from "../../../../packages/rewrite-core/src/session/protocol";
import { RewriteGameSessionHost } from "./GameSessionHost";

interface RewriteClient {
    socket: WebSocket;
    viewerId: string | null;
}

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 8787);
const gameHost = new RewriteGameSessionHost({
    gameId: process.env.GAME_ID,
    playerCount: Number(process.env.PLAYERS || 2),
    deckId: process.env.DECK_ID,
    cardsPerPlayer: process.env.CARDS ? Number(process.env.CARDS) : undefined
});
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
    broadcastViews();
});

wss.on("connection", (socket) => {
    const client: RewriteClient = {
        socket,
        viewerId: null
    };
    clients.add(client);
    sendView(client);

    socket.on("message", (payload) => {
        handleSocketMessage(client, payload.toString());
    });

    socket.on("close", () => {
        clients.delete(client);
    });
});

server.listen(port, host, () => {
    console.log(`Rewrite WebSocket server running at ws://${host}:${port}/`);
});

process.on("SIGINT", () => {
    gameHost.stop();
    wss.close();
    server.close(() => {
        process.exit(0);
    });
});

function handleSocketMessage(client: RewriteClient, rawMessage: string): void {
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

    handleClientMessage(client, parsed);
}

function handleClientMessage(client: RewriteClient, message: RewriteClientMessage): void {
    switch (message.type) {
        case "watch-session":
            sendView(client);
            return;
        case "set-viewer":
            client.viewerId = message.playerId;
            sendView(client);
            return;
        case "game-event":
            gameHost.send(message.event);
            return;
    }
}

function broadcastViews(): void {
    clients.forEach((client) => {
        sendView(client);
    });
}

function sendView(client: RewriteClient): void {
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
