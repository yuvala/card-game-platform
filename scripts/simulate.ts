import { runBatch, type BatchResult } from "@engine/simulation/batch";
import { warLiteGameDefinition } from "@engine/games/warLite/definition";
import type { WarLiteMove } from "@engine/games/warLite/definition";
import type { WarLiteContext } from "@engine/games/warLite/types";
import { briscaLiteGameDefinition } from "@engine/games/briscaLite/definition";
import type { BriscaLiteMove } from "@engine/games/briscaLite/definition";
import type { BriscaLiteContext } from "@engine/games/briscaLite/types";
import { pokerLiteGameDefinition } from "@engine/games/pokerLite/definition";
import type { PokerLiteMove } from "@engine/games/pokerLite/definition";
import type { PokerLiteContext } from "@engine/games/pokerLite/types";
import { frenchDeckDefinition, spanishDeckDefinition } from "@engine/engine/cards/deckDefinitions";

interface Preset {
    label: string;
    playerNames: string[];
    run: (count: number, startSeed: number) => BatchResult;
}

const presets: Record<string, Preset> = {
    "war-lite": {
        label: "War Lite",
        playerNames: ["Alice", "Bob"],
        run: (count, startSeed) => runBatch(
            warLiteGameDefinition,
            {
                playerNames: ["Alice", "Bob"],
                gameOptions: { deckDefinition: frenchDeckDefinition },
                getStartupMoves: (random): WarLiteMove[] => [
                    { type: "prepare-shuffle", random },
                    { type: "deal-opening-hands" }
                ],
                getFinalizeMove: (): WarLiteMove[] => [{ type: "finalize-battle" }],
                getWinnerIds: (state: WarLiteContext) => state.winningPlayerIds
            },
            count,
            startSeed
        )
    },
    "brisca-lite": {
        label: "Brisca Lite",
        playerNames: ["Alice", "Bob"],
        run: (count, startSeed) => runBatch(
            briscaLiteGameDefinition,
            {
                playerNames: ["Alice", "Bob"],
                gameOptions: { deckDefinition: spanishDeckDefinition },
                getStartupMoves: (random): BriscaLiteMove[] => [
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
            },
            count,
            startSeed
        )
    },
    "poker-lite": {
        label: "Poker Lite",
        playerNames: ["Alice", "Bob"],
        run: (count, startSeed) => runBatch(
            pokerLiteGameDefinition,
            {
                playerNames: ["Alice", "Bob"],
                gameOptions: { deckDefinition: frenchDeckDefinition },
                getStartupMoves: (random): PokerLiteMove[] => [
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
            },
            count,
            startSeed
        )
    }
};

function printResult(label: string, playerNames: string[], count: number, startSeed: number, result: BatchResult): void {
    const stuckPct = ((result.stuckCount / count) * 100).toFixed(1);
    const playerIds = Object.keys(result.winRates).sort((a, b) => a.localeCompare(b));
    console.log("\n" + label + " × " + count + "  (seeds " + startSeed + "–" + (startSeed + count - 1) + ")");
    console.log("");
    console.log("  Games:         " + result.gamesPlayed);
    console.log("  Stuck:         " + result.stuckCount + "  (" + stuckPct + "%)");
    console.log("  Conservation:  " + result.conservationFailures + " failures");
    console.log("");
    console.log("  Rounds:  avg " + result.rounds.avg.toFixed(1) + "  |  min " + result.rounds.min + "  |  max " + result.rounds.max);
    console.log("");
    console.log("  Win rates:");
    playerIds.forEach((id, index) => {
        const name = playerNames[index] ?? id;
        const rate = result.winRates[id] ?? 0;
        console.log("    " + name.padEnd(10) + (rate * 100).toFixed(1) + "%");
    });
    console.log("");
}

const [rawGame = "", rawCount = "100", rawSeed = "1"] = process.argv.slice(2);
const count = Math.max(1, Number.parseInt(rawCount, 10) || 100);
const startSeed = Math.max(1, Number.parseInt(rawSeed, 10) || 1);

const preset = presets[rawGame];
if (!preset) {
    console.error("Usage: simulate <game> [count] [startSeed]");
    console.error("Games: " + Object.keys(presets).join(", "));
    process.exit(1);
}

printResult(preset.label, preset.playerNames, count, startSeed, preset.run(count, startSeed));
