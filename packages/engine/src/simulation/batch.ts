import type { GameDefinition } from '../engine/game/definition';
import type { CardGameOptions } from '../engine/game/types';
import { simulateGame, type SimulationOptions, type SimulationResult } from './runner';

export interface BatchResult {
    gamesPlayed: number;
    stuckCount: number;
    conservationFailures: number;
    winRates: Record<string, number>;
    rounds: { avg: number; min: number; max: number };
}

interface Accumulator {
    stuckCount: number;
    conservationFailures: number;
    totalRounds: number;
    minRounds: number;
    maxRounds: number;
    winCounts: Record<string, number>;
}

function accumulateResult(acc: Accumulator, result: SimulationResult): void {
    if (result.stuck) {
        acc.stuckCount += 1;
    }
    if (!result.cardConservationOk) {
        acc.conservationFailures += 1;
    }

    acc.totalRounds += result.rounds;
    if (result.rounds < acc.minRounds) {
        acc.minRounds = result.rounds;
    }
    if (result.rounds > acc.maxRounds) {
        acc.maxRounds = result.rounds;
    }

    if (result.winnerIds.length > 0) {
        const share = 1 / result.winnerIds.length;
        for (const winnerId of result.winnerIds) {
            acc.winCounts[winnerId] = (acc.winCounts[winnerId] ?? 0) + share;
        }
    }
}

export function runBatch<
    TState extends { piles: Record<string, { cards: unknown[] }> },
    TMove extends { type: string },
    TOptions extends CardGameOptions,
>(
    definition: GameDefinition<TState, TMove, unknown, unknown, TOptions, string, unknown>,
    options: SimulationOptions<TState, TMove, TOptions>,
    count: number,
    startSeed = 1,
): BatchResult {
    const acc: Accumulator = {
        stuckCount: 0,
        conservationFailures: 0,
        totalRounds: 0,
        minRounds: Infinity,
        maxRounds: 0,
        winCounts: {},
    };

    for (let index = 0; index < count; index += 1) {
        accumulateResult(acc, simulateGame(definition, options, startSeed + index));
    }

    const winRates: Record<string, number> = {};
    for (const [id, wins] of Object.entries(acc.winCounts)) {
        winRates[id] = wins / count;
    }

    return {
        gamesPlayed: count,
        stuckCount: acc.stuckCount,
        conservationFailures: acc.conservationFailures,
        winRates,
        rounds: {
            avg: count > 0 ? acc.totalRounds / count : 0,
            min: Number.isFinite(acc.minRounds) ? acc.minRounds : 0,
            max: acc.maxRounds,
        },
    };
}
