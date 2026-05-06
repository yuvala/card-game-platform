import { RewriteGameSessionHost } from "../../apps/server/src/rewrite/GameSessionHost";
import type { CardGameViewModel } from "@rewrite-core/engine/game/viewModel";

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
} finally {
    host.stop();
}

console.log("rewriteSessionHost.test.ts passed");
