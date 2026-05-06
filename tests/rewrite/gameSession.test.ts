import { supportedDeckDefinitions } from "@rewrite-core/engine/cards/deckDefinitions";
import { createLocalGameSession } from "@rewrite-core/engine/game/session";
import { gameCatalog } from "@rewrite-core/games/catalog";

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

const session = createLocalGameSession({
    id: "test-session",
    entry: gameCatalog["war-lite"],
    playerNames: ["Avi", "Dany"],
    options: {
        deckDefinition: supportedDeckDefinitions.french,
        cardsPerPlayer: 1,
        random: () => 0.42
    }
});

let subscriptionCount = 0;
const subscription = session.subscribe(() => {
    subscriptionCount += 1;
});

session.start();
assert(session.id === "test-session", "Session should expose the configured id.");
assert(session.gameId === "war-lite", "Session should expose the catalog game id.");
assert(session.playerNames.length === 2, "Session should expose the configured players.");

session.send({ type: "START" });

const snapshot = session.getSnapshot();
const viewModel = session.getViewModel("p1");

assert(snapshot.value !== "idle", "Session should proxy actor snapshots after events are sent.");
assert(viewModel.players.length === 2, "Session should produce a view model from the current snapshot.");
assert(subscriptionCount > 0, "Session should proxy actor subscriptions.");

subscription.unsubscribe();
session.stop();

console.log("gameSession.test.ts passed");
