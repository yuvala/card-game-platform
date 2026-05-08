import { RewriteGameSessionHost } from "../../apps/server/src/rewrite/GameSessionHost";
import type { CardGameViewModel } from "@rewrite-core/engine/game/viewModel";
import { isRewriteClientMessage } from "@rewrite-core/session/protocol";

declare const process: { exitCode?: number };

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function waitFor(condition: () => boolean, timeoutMs = 3000): Promise<void> {
    const startedAt = Date.now();

    while (!condition()) {
        if (Date.now() - startedAt > timeoutMs) {
            throw new Error("Timed out while waiting for rewrite session host state.");
        }

        await wait(25);
    }
}

async function main(): Promise<void> {
    const host = new RewriteGameSessionHost({
        sessionId: "smoke-session",
        gameId: "war-lite",
        playerCount: 2,
        deckId: "french",
        cardsPerPlayer: 1
    });

    try {
        const adminView = host.getSessionView(null);
        assert(adminView.type === "session-view", "Host should produce session-view messages.");
        assert(adminView.sessionId === "smoke-session", "Host should expose its session id.");
        assert(adminView.players.length === 2, "Host should expose current players.");

        const playerView = host.getSessionView(adminView.players[0].id);
        assert(playerView.type === "session-view", "Host should return a player session-view message.");
        assert(playerView.viewerId === adminView.players[0].id, "Host should produce viewer-specific session views.");
        const playerViewModel = playerView.viewModel as CardGameViewModel;
        assert(playerViewModel.players.length === 2, "Host should include a renderable view model.");

        let updateCount = 0;
        const subscription = host.subscribe(() => {
            updateCount += 1;
        });

        host.configure({
            gameId: "brisca-lite",
            playerCount: 4,
            deckId: "spanish",
            cardsPerPlayer: 3
        });

        const configuredView = host.getSessionView(null);
        assert(configuredView.type === "session-view", "Host should produce a configured session-view message.");
        assert(configuredView.gameId === "brisca-lite", "Host should switch to the configured game.");
        assert(configuredView.players.length === 4, "Host should switch to the configured player count.");
        assert(updateCount > 0, "Host should notify subscribers after replacing the session.");

        host.configure({
            gameId: "war-lite",
            playerCount: 2,
            deckId: "french",
            cardsPerPlayer: 5,
            seed: "war-manual-0",
            debugScenarioId: "war-animation"
        });
        await waitFor(() => {
            const view = host.getSessionView(null);
            if (view.type !== "session-view") {
                return false;
            }

            const viewModel = view.viewModel as CardGameViewModel;
            return (
                view.gameId === "war-lite" &&
                viewModel.phaseLabel === "BATTLEREADY" &&
                viewModel.roundLabel.includes("War 1") &&
                viewModel.statusText.includes("tied")
            );
        }, 10000);

        host.configure({
            gameId: "brisca-lite",
            playerCount: 4,
            deckId: "spanish",
            cardsPerPlayer: 3
        });
        await waitFor(() => {
            const view = host.getSessionView(null);
            return view.type === "session-view" && (view.viewModel as CardGameViewModel).phaseLabel === "DEALING";
        });
        host.send({ type: "ANIMATION_DONE" });

        const readyView = host.getSessionView(null);
        assert(readyView.type === "session-view", "Host should expose the ready configured view.");
        const readyViewModel = readyView.viewModel as CardGameViewModel;
        const actingPlayer = readyViewModel.players.find((player) => player.canInteract);
        const waitingPlayer = readyViewModel.players.find((player) => !player.canInteract);
        const selectableCardId = actingPlayer?.hand[0]?.id;
        assert(actingPlayer && waitingPlayer && selectableCardId, "Validation test requires an acting player with a hand card.");

        const invalidSelect = host.sendClientEvent(waitingPlayer.id, {
            type: "SELECT_CARD",
            cardId: selectableCardId
        });
        assert(!invalidSelect.ok, "Host should reject selecting another player's card.");
        const afterInvalidSelectView = host.getSessionView(null);
        assert(afterInvalidSelectView.type === "session-view", "Host should expose a view after rejecting player selection.");
        assert(
            (afterInvalidSelectView.viewModel as CardGameViewModel).selectedCardId === null,
            "Rejected player events should not mutate the game session."
        );

        const validSelect = host.sendClientEvent(actingPlayer.id, {
            type: "SELECT_CARD",
            cardId: selectableCardId
        });
        assert(validSelect.ok, "Host should accept a legal player card selection.");
        const afterValidSelectView = host.getSessionView(null);
        assert(afterValidSelectView.type === "session-view", "Host should expose a view after accepting player selection.");
        assert(
            (afterValidSelectView.viewModel as CardGameViewModel).selectedCardId === selectableCardId,
            "Accepted player selection should update the server-owned session."
        );
        assert(!host.sendClientEvent(waitingPlayer.id, { type: "PLAY_CARD" }).ok, "Host should reject plays from the wrong player.");
        assert(host.sendClientEvent(actingPlayer.id, { type: "PLAY_CARD" }).ok, "Host should accept the current player's legal play.");

        assert(
            isRewriteClientMessage({
                type: "configure-session",
                config: {
                    gameId: "war-lite",
                    playerCount: 2,
                    deckId: "french",
                    seed: "server-seed-smoke",
                    debugScenarioId: "war-animation"
                }
            }),
            "Protocol guard should accept configure-session messages."
        );
        subscription.unsubscribe();
    } finally {
        host.stop();
    }
}

main()
    .then(() => {
        console.log("rewriteSessionHost.test.ts passed");
    })
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
