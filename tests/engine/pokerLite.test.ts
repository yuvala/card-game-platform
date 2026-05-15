import { frenchDeckDefinition } from "@engine/engine/cards/deckDefinitions";
import { simulateGame } from "@engine/simulation/runner";
import { runBatch } from "@engine/simulation/batch";
import { pokerLiteGameDefinition } from "@engine/games/pokerLite/definition";
import type { PokerLiteMove } from "@engine/games/pokerLite/definition";
import type { PokerLiteContext } from "@engine/games/pokerLite/types";

declare const process: { exitCode?: number };

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error("FAIL: " + message);
    }
}

function test(name: string, fn: () => void): void {
    try {
        fn();
        console.log("  PASS " + name);
    } catch (err) {
        console.error("  FAIL " + name);
        console.error("       " + (err instanceof Error ? err.message : String(err)));
        process.exitCode = 1;
    }
}

const pokerOptions = {
    playerNames: ["Alice", "Bob"],
    gameOptions: { deckDefinition: frenchDeckDefinition },
    getStartupMoves: (random: () => number): PokerLiteMove[] => [
        { type: "prepare-shuffle", random },
        { type: "deal-opening-hands" }
    ],
    getFinalizeMove: (): PokerLiteMove[] => [
        { type: "commit-play" },
        { type: "finalize-turn" }
    ],
    getWinnerIds: (state: PokerLiteContext) => {
        const maxScore = Math.max(...state.players.map((p) => p.score));
        return state.players.filter((p) => p.score === maxScore).map((p) => p.id);
    }
};

console.log("\npokerLite.test.ts");

test("poker-lite: completes without getting stuck", () => {
    const result = simulateGame(pokerLiteGameDefinition, pokerOptions, 42);
    assert(!result.stuck, "game got stuck after " + result.rounds + " rounds");
    assert(result.rounds > 0, "no rounds played");
});

test("poker-lite: card conservation holds", () => {
    const result = simulateGame(pokerLiteGameDefinition, pokerOptions, 42);
    assert(result.cardConservationOk, "card count changed: started with " + result.totalCards);
});

test("poker-lite: same seed produces same round count", () => {
    const a = simulateGame(pokerLiteGameDefinition, pokerOptions, 1234);
    const b = simulateGame(pokerLiteGameDefinition, pokerOptions, 1234);
    assert(a.rounds === b.rounds, "rounds differ: " + a.rounds + " vs " + b.rounds);
    assert(!a.stuck, "game got stuck");
});

test("poker-lite batch: no stuck games in 200 runs", () => {
    const result = runBatch(pokerLiteGameDefinition, pokerOptions, 200);
    assert(result.stuckCount === 0, "stuck in " + result.stuckCount + " / " + result.gamesPlayed + " games");
});

test("poker-lite batch: card conservation holds across 200 runs", () => {
    const result = runBatch(pokerLiteGameDefinition, pokerOptions, 200);
    assert(result.conservationFailures === 0, "conservation failed in " + result.conservationFailures + " games");
});

test("poker-lite batch: win rates sum to ~1", () => {
    const result = runBatch(pokerLiteGameDefinition, pokerOptions, 200);
    const total = Object.values(result.winRates).reduce((sum, r) => sum + r, 0);
    assert(total > 0.98 && total <= 1, "win rates sum to " + total.toFixed(3));
});
