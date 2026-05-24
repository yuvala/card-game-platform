import { ActorRefFrom, SnapshotFrom } from 'xstate';

import { spanishDeckDefinition } from '../../engine/cards/deckDefinitions';
import { createCardGameMachine } from '../../engine/game/machineFactory';
import { scopaConfig } from './config';
import { scopaGameDefinition } from './definition';
import type { ScopaContext, ScopaEvent, ScopaOptions } from './types';

export function createScopaMachine(playerNames: string[], options?: ScopaOptions) {
    const deckDefinition = options?.deckDefinition ?? spanishDeckDefinition;
    const random = options?.random ?? Math.random;
    const definitionOptions: ScopaOptions = {
        deckDefinition,
        cardsPerPlayer: options?.cardsPerPlayer ?? scopaConfig.openingHandSize,
        random,
    };

    return createCardGameMachine<
        ScopaContext,
        ScopaEvent,
        Parameters<typeof scopaGameDefinition.applyMove>[1],
        ScopaOptions
    >({
        definition: scopaGameDefinition,
        playerNames,
        definitionOptions,
        prepareShuffleMove: {
            type: 'prepare-shuffle',
            random,
        },
        prepareDealMove: {
            type: 'deal-opening-hands',
        },
        flow: {
            readyState: 'playerTurn',
            resolvingState: 'resolvingTurn',
            shuffleDelayMs: 650,
            dealDelayMs: 900,
            resolveDelayMs: 600,
            prepareReadyMove: {
                type: 'begin-turn',
            },
            // SELECT_CARD stores the chosen card id; PLAY_CARD then executes it
            selectCardMove: (cardId) => ({
                type: 'select-card',
                cardId,
            }),
            // PLAY_CARD with empty cardId — definition falls back to selectedCardId
            playMove: {
                type: 'PLAY_CARD',
                cardId: '',
            },
            playGuardMoveType: 'PLAY_CARD',
            animation: {
                kind: 'event',
                state: 'animatingPlay',
                commitMove: {
                    type: 'begin-turn',
                },
            },
            finalizeMove: {
                type: 'begin-turn',
            },
            resolutionTargets: [
                {
                    automaticMoveType: 'refill-hands',
                    target: 'playerTurn',
                },
            ],
        },
        getCurrentActorId: (context) => context.players[context.currentPlayerIndex]?.id ?? null,
    });
}

export type ScopaMachine = ReturnType<typeof createScopaMachine>;
export type ScopaActor = ActorRefFrom<ScopaMachine>;
export type ScopaSnapshot = SnapshotFrom<ScopaMachine>;
