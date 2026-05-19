import type { GameDefinition } from '../engine/game/definition';
import type { CardGameOptions } from '../engine/game/types';
import { createSeededRandom } from '../engine/game/random';

export interface SimulationResult {
    seed: number;
    rounds: number;
    winnerIds: string[];
    totalCards: number;
    cardConservationOk: boolean;
    stuck: boolean;
}

export interface SimulationOptions<
    TState,
    TMove extends { type: string },
    TOptions extends CardGameOptions,
> {
    playerNames: string[];
    gameOptions: Omit<TOptions, 'random'>;
    /**
     * Moves applied before the main loop (shuffle, deal, etc.).
     * Receives the seeded random so moves like prepare-shuffle can use it.
     */
    getStartupMoves?: (random: () => number) => TMove[];
    /**
     * Moves applied after each manual (getLegalMoves) move, in order, before the next loop iteration.
     * Use this for moves the XState machine applies after animation events
     * (e.g. commit-play + finalize-turn, or finalize-battle).
     * Guards inside each move's applyMove handler make them no-ops when not applicable.
     */
    getFinalizeMove?: (state: TState) => TMove[];
    /**
     * Extract winner IDs from the final state.
     */
    getWinnerIds?: (state: TState) => string[];
    maxRounds?: number;
}

const DEFAULT_MAX_ROUNDS = 10000;

function countAllCards(piles: Record<string, { cards: unknown[] }>): number {
    return Object.values(piles).reduce((sum, pile) => sum + pile.cards.length, 0);
}

type StateWithPiles = { piles: Record<string, { cards: unknown[] }> };

export function simulateGame<
    TState extends StateWithPiles,
    TMove extends { type: string },
    TOptions extends CardGameOptions,
>(
    definition: GameDefinition<TState, TMove, unknown, unknown, TOptions, string, unknown>,
    options: SimulationOptions<TState, TMove, TOptions>,
    seed?: number,
): SimulationResult {
    const resolvedSeed = seed ?? Date.now();
    const random = createSeededRandom(String(resolvedSeed));

    let state = definition.setup({
        playerNames: options.playerNames,
        options: { ...options.gameOptions, random } as TOptions,
    });

    const startupMoves = options.getStartupMoves?.(random) ?? [];
    for (const move of startupMoves) {
        state = definition.applyMove(state, move).state;
    }

    const totalCards = countAllCards(state.piles);
    let rounds = 0;
    let stuck = false;

    while (!definition.isGameOver(state)) {
        if (rounds >= (options.maxRounds ?? DEFAULT_MAX_ROUNDS)) {
            stuck = true;
            break;
        }

        // Manual moves take priority — matches machine behaviour where getAutomaticMove
        // is only called after finalize, never while a player action is pending.
        const legal = definition.getLegalMoves(state);
        if (legal.length > 0) {
            const move = legal[Math.floor(random() * legal.length)];
            if (!move) {
                stuck = true;
                break;
            }
            state = definition.applyMove(state, move).state;
            rounds += 1;

            for (const finalizeMove of options.getFinalizeMove?.(state) ?? []) {
                state = definition.applyMove(state, finalizeMove).state;
            }
            continue;
        }

        const auto = definition.getAutomaticMove?.(state);
        if (auto) {
            state = definition.applyMove(state, auto).state;
            rounds += 1;
            continue;
        }

        stuck = true;
        break;
    }

    return {
        seed: resolvedSeed,
        rounds,
        winnerIds: options.getWinnerIds?.(state) ?? [],
        totalCards,
        cardConservationOk: countAllCards(state.piles) === totalCards,
        stuck,
    };
}
