import { RewriteGameSessionHost } from "../../apps/server/src/rewrite/GameSessionHost";
import type { CardGameViewModel } from "@rewrite-core/engine/game/viewModel";
import { isRewriteClientMessage } from "@rewrite-core/session/protocol";

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

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

    host.send({ type: "ANIMATION_DONE" });

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
    assert(
        isRewriteClientMessage({
            type: "configure-session",
            config: {
                gameId: "war-lite",
                playerCount: 2,
                deckId: "french"
            }
        }),
        "Protocol guard should accept configure-session messages."
    );
    subscription.unsubscribe();
} finally {
    host.stop();
}

console.log("rewriteSessionHost.test.ts passed");
