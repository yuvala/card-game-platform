import { ActorRefFrom, SnapshotFrom } from 'xstate';

import { spanishDeckDefinition } from '../../engine/cards/deckDefinitions';
import { createCardGameMachine } from '../../engine/game/machineFactory';
import { briscaLiteConfig } from './config';
import { briscaLiteGameDefinition } from './definition';
import type { BriscaLiteContext, BriscaLiteEvent, BriscaLiteOptions } from './types';

export function createBriscaLiteMachine(playerNames: string[], options?: BriscaLiteOptions) {
    const deckDefinition = options?.deckDefinition ?? spanishDeckDefinition;
    const cardsPerPlayer = options?.cardsPerPlayer ?? briscaLiteConfig.openingHandSize;
    const random = options?.random ?? Math.random;
    const definitionOptions: BriscaLiteOptions = {
        deckDefinition,
        cardsPerPlayer,
        random,
    };

    return createCardGameMachine<
        BriscaLiteContext,
        BriscaLiteEvent,
        Parameters<typeof briscaLiteGameDefinition.applyMove>[1],
        BriscaLiteOptions
    >({
        definition: briscaLiteGameDefinition,
        playerNames,
        definitionOptions,
        prepareShuffleMove: {
            type: 'prepare-shuffle',
            random,
        },
        prepareDealMove: {
            type: 'deal-opening-hands',
        },
        getCurrentActorId: (context) => context.players[context.turnIndex]?.id ?? null,
        flow: {
            readyState: 'playerTurn',
            resolvingState: 'resolvingTurn',
            shuffleDelayMs: 650,
            dealDelayMs: 900,
            resolveDelayMs: 850,
            prepareReadyMove: {
                type: 'begin-trick',
            },
            selectCardMove: (cardId) => ({
                type: 'select-card',
                cardId,
            }),
            playMove: {
                type: 'queue-play',
            },
            playGuardMoveType: 'queue-play',
            animation: {
                kind: 'event',
                state: 'animatingPlay',
                commitMove: {
                    type: 'commit-play',
                },
            },
            finalizeMove: {
                type: 'finalize-turn',
            },
            resolutionTargets: [
                {
                    automaticMoveType: 'advance-next-player',
                    target: 'playerTurn',
                },
                {
                    automaticMoveType: 'advance-next-trick',
                    target: 'playerTurn',
                },
            ],
        },
    });
}

export type BriscaLiteMachine = ReturnType<typeof createBriscaLiteMachine>;
export type BriscaLiteActor = ActorRefFrom<BriscaLiteMachine>;
export type BriscaLiteSnapshot = SnapshotFrom<BriscaLiteMachine>;
