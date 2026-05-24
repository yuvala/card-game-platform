import type { CardGameViewModel } from '../../engine/game/viewModel';
import type { GameDefinition } from '../../engine/game/definition';
import type { CardGameEffect } from '../../engine/game/effects';
import { getPileCards } from '../../engine/game/piles';
import { createShuffledContext, createInitialContext, dealOpeningHands } from './setup';
import {
    getLegalMoves,
    applyMove,
    applyInternalMove,
    isGameOver,
    getAutomaticMove,
    findCaptureCombinations,
    getScopaCardValue,
} from './rules';
import { getScopaViewModel } from './viewModel';
import type { ScopaContext, ScopaOptions, ScopaViewSnapshot } from './types';
import { getScopaHandPileId, SCOPA_TABLE_PILE_ID } from './types';

export type ScopaMove =
    | { type: 'prepare-shuffle'; random?: () => number }
    | { type: 'deal-opening-hands' }
    | { type: 'begin-turn' }
    | { type: 'select-card'; cardId: string }
    | { type: 'PLAY_CARD'; cardId: string; captureCardIds?: string[] }
    | { type: 'refill-hands' }
    | { type: 'score-round' };

function resolveCapture(state: ScopaContext, cardId: string): string[] {
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer) {
        return [];
    }
    const handCards = getPileCards(state.piles, getScopaHandPileId(currentPlayer.id));
    const playedCard = handCards.find((c) => c.id === cardId);
    if (!playedCard) {
        return [];
    }
    const tableCards = getPileCards(state.piles, SCOPA_TABLE_PILE_ID);
    const value = getScopaCardValue(playedCard.rankId);
    const combinations = findCaptureCombinations(tableCards, value);
    if (combinations.length === 0) {
        return [];
    }
    // Pick the combination with the most cards; tie-break by first found
    let best = combinations[0] ?? [];
    for (let i = 1; i < combinations.length; i += 1) {
        const candidate = combinations[i] ?? [];
        if (candidate.length > best.length) {
            best = candidate;
        }
    }
    return best.map((c) => c.id);
}

export const scopaGameDefinition: GameDefinition<
    ScopaContext,
    ScopaMove,
    CardGameViewModel,
    CardGameEffect,
    ScopaOptions,
    string,
    ScopaViewSnapshot
> = {
    id: 'scopaLite',
    name: 'Scopa',

    setup: ({ playerNames, options }) => {
        return createInitialContext(playerNames, options.deckDefinition);
    },

    getLegalMoves: (state, actorId) => {
        return getLegalMoves(state, actorId);
    },

    applyMove: (state, move) => {
        switch (move.type) {
            case 'prepare-shuffle':
                return {
                    state: createShuffledContext(
                        state.players.map((p) => p.name),
                        state.deckDefinition,
                        move.random,
                    ),
                };
            case 'deal-opening-hands':
                return dealOpeningHands(state);
            case 'begin-turn':
                return {
                    state: {
                        ...state,
                        statusText:
                            state.players[state.currentPlayerIndex]?.name + ' to play.',
                    },
                };
            case 'select-card':
                return {
                    state: {
                        ...state,
                        selectedCardId: move.cardId,
                    },
                };
            case 'PLAY_CARD': {
                const cardId = move.cardId || state.selectedCardId || '';
                const captureCardIds =
                    move.captureCardIds ?? resolveCapture(state, cardId);
                return applyMove(state, { type: 'PLAY_CARD', cardId, captureCardIds });
            }
            case 'refill-hands':
                return applyInternalMove(state, { type: 'refill-hands' });
            case 'score-round':
                return applyInternalMove(state, { type: 'score-round' });
        }
    },

    isGameOver: (state) => isGameOver(state),

    getAutomaticMove: (state) => {
        return getAutomaticMove(state);
    },

    toViewModel: (snapshot, viewerId) => {
        return getScopaViewModel(snapshot, viewerId);
    },
};
