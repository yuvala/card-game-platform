import type { AddressInfo } from "node:net";
import { WebSocket, type RawData } from "ws";

import { createGameWebSocketServer } from "../../apps/server/src/GameWebSocketServer";
import type { CardGameViewModel } from "@engine/engine/game/viewModel";
import { isClientMessage, isServerMessage, type ClientMessage, type ServerMessage } from "@engine/session/protocol";

declare const process: { exitCode?: number };

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

async function main(): Promise<void> {
    const rewriteServer = createGameWebSocketServer({
        gameId: "war-lite",
        playerCount: 2,
        deckId: "french",
        cardsPerPlayer: 1
    });

    try {
        const url = await listen(rewriteServer.server);
        const admin = await connect(url);
        const player = await connect(url);

        sendClientMessage(admin, {
            type: "watch-session",
            role: "admin"
        });
        sendClientMessage(player, {
            type: "watch-session",
            role: "player"
        });
        const initialAdminView = await waitForServerMessage(admin, (message) => message.type === "session-view");
        await waitForServerMessage(player, (message) => message.type === "session-view");
        assert(
            initialAdminView.type === "session-view" && Number.isFinite(initialAdminView.sequence),
            "WebSocket server should include a finite sequence in session views."
        );

        sendClientMessage(admin, {
            type: "configure-session",
            config: {
                gameId: "war-lite",
                playerCount: 2,
                deckId: "french",
                cardsPerPlayer: 5,
                seed: "war-manual-0",
                debugScenarioId: "war-animation"
            }
        });
        await waitForSessionView(admin, (view) => {
            const viewModel = view.viewModel as CardGameViewModel;
            return (
                view.gameId === "war-lite" &&
                viewModel.phaseLabel === "BATTLEREADY" &&
                viewModel.roundLabel.includes("War 1") &&
                viewModel.statusText.includes("tied")
            );
        }, 10000);

        sendClientMessage(player, {
            type: "configure-session",
            config: {
                gameId: "poker-lite",
                playerCount: 2,
                deckId: "french"
            }
        });
        await waitForServerMessage(player, (message) => {
            return message.type === "error" && message.message.includes("admin");
        });

        sendClientMessage(admin, {
            type: "configure-session",
            config: {
                gameId: "brisca-lite",
                playerCount: 4,
                deckId: "spanish",
                cardsPerPlayer: 3,
                seed: "server-ws-smoke"
            }
        });

        const configuredAdminView = await waitForSessionView(admin, (view) => view.gameId === "brisca-lite" && view.players.length === 4);
        const configuredPlayerView = await waitForSessionView(player, (view) => view.gameId === "brisca-lite" && view.players.length === 4);
        assert(
            configuredAdminView.sequence > initialAdminView.sequence,
            "WebSocket server should advance sequence after configuring the session."
        );
        assert(configuredPlayerView.players.length === configuredAdminView.players.length, "Player client should receive configured session broadcasts.");

        await waitForSessionView(admin, (view) => (view.viewModel as CardGameViewModel).phaseLabel === "DEALING");
        sendClientMessage(admin, {
            type: "game-event",
            event: { type: "ANIMATION_DONE" }
        });

        const readyAdminView = await waitForSessionView(admin, (view) => {
            const viewModel = view.viewModel as CardGameViewModel;
            return viewModel.phaseLabel === "PLAYERTURN" && Boolean(viewModel.players.find((candidate) => candidate.canInteract)?.hand[0]);
        });
        const readyViewModel = readyAdminView.viewModel as CardGameViewModel;
        const actingPlayer = readyViewModel.players.find((candidate) => candidate.canInteract);
        const waitingPlayer = readyViewModel.players.find((candidate) => !candidate.canInteract);
        const selectableCardId = actingPlayer?.hand[0]?.id;
        assert(actingPlayer && waitingPlayer && selectableCardId, "WebSocket test requires an acting player with one card.");

        assert(
            !isClientMessage({
                type: "game-event",
                playerId: waitingPlayer.id,
                event: {
                    type: "SELECT_CARD",
                    cardId: selectableCardId
                }
            }),
            "Protocol guard should reject client-supplied playerId on game events."
        );

        sendClientMessage(player, {
            type: "set-viewer",
            playerId: waitingPlayer.id
        });
        await waitForSessionView(player, (view) => view.viewerId === waitingPlayer.id);
        sendClientMessage(player, {
            type: "game-event",
            event: {
                type: "SELECT_CARD",
                cardId: selectableCardId
            }
        });
        await waitForServerMessage(player, (message) => message.type === "error");

        sendClientMessage(admin, {
            type: "set-viewer",
            playerId: actingPlayer.id
        });
        await waitForServerMessage(admin, (message) => {
            return message.type === "error" && message.message.includes("player");
        });

        sendClientMessage(player, {
            type: "set-viewer",
            playerId: actingPlayer.id
        });
        await waitForSessionView(player, (view) => view.viewerId === actingPlayer.id);
        sendClientMessage(player, {
            type: "game-event",
            expectedSequence: Math.max(0, readyAdminView.sequence - 1),
            event: {
                type: "SELECT_CARD",
                cardId: selectableCardId
            }
        });
        await waitForServerMessage(player, (message) => {
            return message.type === "error" && message.message.includes("stale");
        });
        sendClientMessage(player, {
            type: "game-event",
            expectedSequence: readyAdminView.sequence,
            event: {
                type: "SELECT_CARD",
                cardId: selectableCardId
            }
        });
        const selectedAdminView = await waitForSessionView(admin, (view) => {
            return (view.viewModel as CardGameViewModel).selectedCardId === selectableCardId;
        });
        assert(
            selectedAdminView.sequence > readyAdminView.sequence,
            "WebSocket server should advance sequence after an accepted player event."
        );
        assert(
            (selectedAdminView.viewModel as CardGameViewModel).selectedCardId === selectableCardId,
            "Legal player selection should broadcast the updated session to admin clients."
        );

        admin.close();
        player.close();
    } finally {
        await rewriteServer.close();
    }
}

function listen(server: ReturnType<typeof createGameWebSocketServer>["server"]): Promise<string> {
    return new Promise((resolve) => {
        server.listen(0, "127.0.0.1", () => {
            const address = server.address() as AddressInfo;
            resolve(`ws://127.0.0.1:${address.port}/`);
        });
    });
}

function connect(url: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
        const socket = new WebSocket(url);
        socket.once("open", () => {
            resolve(socket);
        });
        socket.once("error", reject);
    });
}

function sendClientMessage(socket: WebSocket, message: ClientMessage): void {
    socket.send(JSON.stringify(message));
}

function waitForSessionView(
    socket: WebSocket,
    predicate: (message: Extract<ServerMessage, { type: "session-view" }>) => boolean,
    timeoutMs = 4000
): Promise<Extract<ServerMessage, { type: "session-view" }>> {
    return waitForServerMessage(socket, (message): message is Extract<ServerMessage, { type: "session-view" }> => {
        return message.type === "session-view" && predicate(message);
    }, timeoutMs);
}

function waitForServerMessage<TMessage extends ServerMessage>(
    socket: WebSocket,
    predicate: (message: ServerMessage) => message is TMessage,
    timeoutMs?: number
): Promise<TMessage>;
function waitForServerMessage(
    socket: WebSocket,
    predicate: (message: ServerMessage) => boolean,
    timeoutMs?: number
): Promise<ServerMessage>;
function waitForServerMessage(
    socket: WebSocket,
    predicate: (message: ServerMessage) => boolean,
    timeoutMs = 4000
): Promise<ServerMessage> {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error("Timed out while waiting for WebSocket server message."));
        }, timeoutMs);

        const cleanup = () => {
            clearTimeout(timeout);
            socket.off("message", handleMessage);
            socket.off("error", handleError);
            socket.off("close", handleClose);
        };

        const handleMessage = (payload: RawData) => {
            const parsed = parseServerMessage(payload.toString());
            if (!parsed || !predicate(parsed)) {
                return;
            }

            cleanup();
            resolve(parsed);
        };

        const handleError = (error: Error) => {
            cleanup();
            reject(error);
        };

        const handleClose = () => {
            cleanup();
            reject(new Error("WebSocket closed before the expected message arrived."));
        };

        socket.on("message", handleMessage);
        socket.on("error", handleError);
        socket.on("close", handleClose);
    });
}

function parseServerMessage(rawMessage: string): ServerMessage | null {
    try {
        const parsed = JSON.parse(rawMessage) as unknown;
        return isServerMessage(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

main()
    .then(() => {
        console.log("GameWebSocketServer.test.ts passed");
    })
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
