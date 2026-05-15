import { frenchDeckDefinition } from "@engine/engine/cards/deckDefinitions";
import { simulateGame } from "@engine/simulation/runner";
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

function runWarLite(seed: number) {
    return simulateGame(
        warLiteGameDefinition,
        {
            playerNames: ["Alice", "Bob"],
            gameOptions: { deckDefinition: frenchDeckDefinition },
            getStartupMoves: (random): WarLiteMove[] => [
                { type: "prepare-shuffle", random },
                { type: "deal-opening-hands" }
            ],
            getFinalizeMove: (): WarLiteMove => ({ type: "finalize-battle" }),
            getWinnerIds: (state) => (state as WarLiteContext).winningPlayerIds
        },
        seed
    );
}

console.log("\nsimulation.test.ts");

test("war-lite: completes without getting stuck", () => {
    const result = runWarLite(42);
    assert(!result.stuck, "game got stuck after " + result.rounds + " rounds");
    assert(result.rounds > 0, "no rounds played");
});

test("war-lite: card conservation holds", () => {
    const result = runWarLite(42);
    assert(result.cardConservationOk, "card count changed: started with " + result.totalCards);
});

test("war-lite: same seed produces same round count", () => {
    const a = runWarLite(1234);
    const b = runWarLite(1234);
    assert(a.rounds === b.rounds, "rounds differ: " + a.rounds + " vs " + b.rounds);
    assert(!a.stuck, "game got stuck");
});

test("war-lite: different seeds produce different games", () => {
    const rounds = [1, 2, 3, 4, 5].map(runWarLite).map((r) => r.rounds);
    const unique = new Set(rounds);
    assert(unique.size > 1, "all seeds produced identical round counts — RNG may not be working");
});
