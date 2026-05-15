import { spanishDeckDefinition } from "@engine/engine/cards/deckDefinitions";
import { simulateGame } from "@engine/simulation/runner";
import { runBatch } from "@engine/simulation/batch";
import { briscaLiteGameDefinition } from "@engine/games/briscaLite/definition";
import type { BriscaLiteMove } from "@engine/games/briscaLite/definition";
import type { BriscaLiteContext } from "@engine/games/briscaLite/types";

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

const briscaOptions = {
    playerNames: ["Alice", "Bob"],
    gameOptions: { deckDefinition: spanishDeckDefinition },
    getStartupMoves: (random: () => number): BriscaLiteMove[] => [
        { type: "prepare-shuffle", random },
        { type: "deal-opening-hands" }
    ],
    getFinalizeMove: (): BriscaLiteMove[] => [
        { type: "commit-play" },
        { type: "finalize-turn" }
    ],
    getWinnerIds: (state: BriscaLiteContext) => {
        const maxScore = Math.max(...state.players.map((p) => p.score));
        return state.players.filter((p) => p.score === maxScore).map((p) => p.id);
    }
};

console.log("\nbriscaLite.test.ts");

test("brisca-lite: completes without getting stuck", () => {
    const result = simulateGame(briscaLiteGameDefinition, briscaOptions, 42);
    assert(!result.stuck, "game got stuck after " + result.rounds + " rounds");
    assert(result.rounds > 0, "no rounds played");
});

test("brisca-lite: card conservation holds", () => {
    const result = simulateGame(briscaLiteGameDefinition, briscaOptions, 42);
    assert(result.cardConservationOk, "card count changed: started with " + result.totalCards);
});

test("brisca-lite: same seed produces same round count", () => {
    const a = simulateGame(briscaLiteGameDefinition, briscaOptions, 1234);
    const b = simulateGame(briscaLiteGameDefinition, briscaOptions, 1234);
    assert(a.rounds === b.rounds, "rounds differ: " + a.rounds + " vs " + b.rounds);
    assert(!a.stuck, "game got stuck");
});

test("brisca-lite batch: no stuck games in 200 runs", () => {
    const result = runBatch(briscaLiteGameDefinition, briscaOptions, 200);
    assert(result.stuckCount === 0, "stuck in " + result.stuckCount + " / " + result.gamesPlayed + " games");
});

test("brisca-lite batch: card conservation holds across 200 runs", () => {
    const result = runBatch(briscaLiteGameDefinition, briscaOptions, 200);
    assert(result.conservationFailures === 0, "conservation failed in " + result.conservationFailures + " games");
});

test("brisca-lite batch: win rates sum to ~1", () => {
    const result = runBatch(briscaLiteGameDefinition, briscaOptions, 200);
    const total = Object.values(result.winRates).reduce((sum, r) => sum + r, 0);
    assert(total > 0.98 && total <= 1, "win rates sum to " + total.toFixed(3));
});
