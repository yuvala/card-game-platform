import type { CardGameViewModel } from '../../engine/game/viewModel';
import type { GameDefinition } from '../../engine/game/definition';
import type { CardGameEffect } from '../../engine/game/effects';
import { getPileCards } from '../../engine/game/piles';
import { briscaLiteConfig } from './config';
import { createInitialContext, createShuffledContext, dealOpeningHands } from './setup';
import {
    advanceToNextPlayerWithEffects,
    advanceToNextTrickWithEffects,
    canCurrentPlayerPlay,
    commitPlayedCard,
    finalizeTurn,
    finishGameWithEffects,
    hasMoreTricksRemaining,
    queuePlayedCardWithEffects,
    selectCard,
    setTrickStatus,
} from './rules';
import { getBriscaLiteViewModel } from './viewModel';
import type { BriscaLiteContext, BriscaLiteOptions, BriscaLiteViewSnapshot } from './types';
import { getBriscaLiteHandPileId } from './types';

export type BriscaLiteMove =
    | { type: 'prepare-shuffle'; random?: () => number }
    | { type: 'deal-opening-hands' }
    | { type: 'begin-trick' }
    | { type: 'select-card'; cardId: string }
    | { type: 'queue-play' }
    | { type: 'commit-play' }
    | { type: 'finalize-turn' }
    | { type: 'advance-next-player' }
    | { type: 'advance-next-trick' }
    | { type: 'finish-game' };

function getPlayerNames(context: BriscaLiteContext): string[] {
    return context.players.map((player) => player.name);
}

function hasMorePlayersInTrick(context: BriscaLiteContext): boolean {
    return context.roundCards.length < context.players.length;
}

export const briscaLiteGameDefinition: GameDefinition<
    BriscaLiteContext,
    BriscaLiteMove,
    CardGameViewModel,
    CardGameEffect,
    BriscaLiteOptions,
    string,
    BriscaLiteViewSnapshot
> = {
    id: 'rewriteBriscaLite',
    name: 'Brisca-lite',
    setup: ({ playerNames, options }) => {
        return createInitialContext(
            playerNames,
            options.deckDefinition,
            options.cardsPerPlayer ?? briscaLiteConfig.openingHandSize,
        );
    },
    getLegalMoves: (state, actorId) => {
        const currentPlayer = state.players[state.turnIndex];
        if (!currentPlayer || (actorId && actorId !== currentPlayer.id)) {
            return [];
        }

        if (state.roundCards.some((rc) => rc.playerId === currentPlayer.id)) {
            return [];
        }

        const moves: BriscaLiteMove[] = getPileCards(
            state.piles,
            getBriscaLiteHandPileId(currentPlayer.id),
        ).map((card) => ({
            type: 'select-card',
            cardId: card.id,
        }));

        if (canCurrentPlayerPlay(state)) {
            moves.push({ type: 'queue-play' });
        }

        return moves;
    },
    applyMove: (state, move) => {
        switch (move.type) {
            case 'prepare-shuffle':
                return {
                    state: createShuffledContext(
                        getPlayerNames(state),
                        state.deckDefinition,
                        state.cardsPerPlayer,
                        move.random,
                    ),
                };
            case 'deal-opening-hands':
                return dealOpeningHands(state);
            case 'begin-trick':
                return {
                    state: setTrickStatus(state),
                };
            case 'select-card':
                return {
                    state: selectCard(state, move.cardId),
                };
            case 'queue-play':
                return queuePlayedCardWithEffects(state);
            case 'commit-play':
                return {
                    state: commitPlayedCard(state),
                };
            case 'finalize-turn':
                return {
                    state: finalizeTurn(state),
                };
            case 'advance-next-player': {
                const transition = advanceToNextPlayerWithEffects(state);
                return {
                    state: setTrickStatus(transition.state),
                    effects: transition.effects,
                };
            }
            case 'advance-next-trick': {
                const transition = advanceToNextTrickWithEffects(state);
                return {
                    state: setTrickStatus(transition.state),
                    effects: transition.effects,
                };
            }
            case 'finish-game':
                return finishGameWithEffects(state);
        }
    },
    isGameOver: (state) => {
        return state.roundCards.length === state.players.length && !hasMoreTricksRemaining(state);
    },
    getAutomaticMove: (state) => {
        if (hasMorePlayersInTrick(state)) {
            return { type: 'advance-next-player' };
        }

        if (briscaLiteGameDefinition.isGameOver(state)) {
            return { type: 'finish-game' };
        }

        return { type: 'advance-next-trick' };
    },
    toViewModel: (snapshot, viewerId) => {
        return getBriscaLiteViewModel(snapshot, viewerId);
    },
};
