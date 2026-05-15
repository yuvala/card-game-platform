import { frenchDeckDefinition } from "@engine/engine/cards/deckDefinitions";
import { runBatch } from "@engine/simulation/batch";
import { warLiteGameDefinition } from "@engine/games/warLite/definition";
import type { WarLiteMove } from "@engine/games/warLite/definition";
import type { WarLiteContext } from "@engine/games/warLite/types";

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

const warLiteOptions = {
    playerNames: ["Alice", "Bob"],
    gameOptions: { deckDefinition: frenchDeckDefinition },
    getStartupMoves: (random: () => number): WarLiteMove[] => [
        { type: "prepare-shuffle", random },
        { type: "deal-opening-hands" }
    ],
    getFinalizeMove: (): WarLiteMove => ({ type: "finalize-battle" }),
    getWinnerIds: (state: WarLiteContext) => state.winningPlayerIds
};

console.log("\nbatch.test.ts");

test("war-lite batch: no stuck games in 200 runs", () => {
    const result = runBatch(warLiteGameDefinition, warLiteOptions, 200);
    assert(result.stuckCount === 0, "stuck in " + result.stuckCount + " / " + result.gamesPlayed + " games");
});

test("war-lite batch: card conservation holds across 200 runs", () => {
    const result = runBatch(warLiteGameDefinition, warLiteOptions, 200);
    assert(result.conservationFailures === 0, "conservation failed in " + result.conservationFailures + " games");
});

test("war-lite batch: win rates sum to ~1", () => {
    const result = runBatch(warLiteGameDefinition, warLiteOptions, 200);
    const total = Object.values(result.winRates).reduce((sum, r) => sum + r, 0);
    assert(total > 0.98 && total <= 1.0, "win rates sum to " + total.toFixed(3));
});

test("war-lite batch: neither player wins more than 70%", () => {
    const result = runBatch(warLiteGameDefinition, warLiteOptions, 200);
    for (const [id, rate] of Object.entries(result.winRates)) {
        assert(rate < 0.70, id + " win rate too high: " + (rate * 100).toFixed(1) + "%");
    }
});

test("war-lite batch: same startSeed produces same result", () => {
    const a = runBatch(warLiteGameDefinition, warLiteOptions, 50);
    const b = runBatch(warLiteGameDefinition, warLiteOptions, 50);
    assert(a.rounds.avg === b.rounds.avg, "avg rounds differ: " + a.rounds.avg + " vs " + b.rounds.avg);
    assert(a.stuckCount === b.stuckCount, "stuck counts differ");
});
