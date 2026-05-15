import type { GameDefinition } from "../engine/game/definition";
import type { CardGameOptions } from "../engine/game/types";
import { simulateGame, type SimulationOptions } from "./runner";

export interface BatchResult {
    gamesPlayed: number;
    stuckCount: number;
    conservationFailures: number;
    winRates: Record<string, number>;
    rounds: { avg: number; min: number; max: number };
}

export function runBatch<
    TState extends { piles: Record<string, { cards: unknown[] }> },
    TMove extends { type: string },
    TOptions extends CardGameOptions
>(
    definition: GameDefinition<TState, TMove, unknown, unknown, TOptions, string, unknown>,
    options: SimulationOptions<TState, TMove, TOptions>,
    count: number,
    startSeed = 1
): BatchResult {
    let stuckCount = 0;
    let conservationFailures = 0;
    let totalRounds = 0;
    let minRounds = Infinity;
    let maxRounds = 0;
    const winCounts: Record<string, number> = {};

    for (let index = 0; index < count; index += 1) {
        const result = simulateGame(definition, options, startSeed + index);

        if (result.stuck) { stuckCount += 1; }
        if (!result.cardConservationOk) { conservationFailures += 1; }

        totalRounds += result.rounds;
        if (result.rounds < minRounds) { minRounds = result.rounds; }
        if (result.rounds > maxRounds) { maxRounds = result.rounds; }

        for (const winnerId of result.winnerIds) {
            winCounts[winnerId] = (winCounts[winnerId] ?? 0) + 1;
        }
    }

    const winRates: Record<string, number> = {};
    for (const [id, wins] of Object.entries(winCounts)) {
        winRates[id] = wins / count;
    }

    return {
        gamesPlayed: count,
        stuckCount,
        conservationFailures,
        winRates,
        rounds: {
            avg: count > 0 ? totalRounds / count : 0,
            min: isFinite(minRounds) ? minRounds : 0,
            max: maxRounds
        }
    };
}
