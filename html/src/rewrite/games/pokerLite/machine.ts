import { ActorRefFrom, SnapshotFrom } from "xstate";

import { frenchDeckDefinition } from "../../engine/cards/deckDefinitions";
import { createCardGameMachine } from "../../engine/game/machineFactory";
import { pokerLiteConfig } from "./config";
import { pokerLiteGameDefinition } from "./definition";
import type { PokerLiteContext, PokerLiteEvent, PokerLiteOptions } from "./types";

export function createPokerLiteMachine(playerNames: string[], options?: PokerLiteOptions) {
    const deckDefinition = options?.deckDefinition ?? frenchDeckDefinition;
    const cardsPerPlayer = options?.cardsPerPlayer ?? pokerLiteConfig.openingHandSize;
    const random = options?.random ?? Math.random;
    const definitionOptions: PokerLiteOptions = {
        deckDefinition,
        cardsPerPlayer,
        random
    };

    return createCardGameMachine<PokerLiteContext, PokerLiteEvent, Parameters<typeof pokerLiteGameDefinition.applyMove>[1], PokerLiteOptions>({
        definition: pokerLiteGameDefinition,
        playerNames,
        definitionOptions,
        prepareShuffleMove: {
            type: "prepare-shuffle",
            random
        },
        prepareDealMove: {
            type: "deal-opening-hands"
        },
        getCurrentActorId: (context) => context.players[context.turnIndex]?.id ?? null,
        flow: {
            readyState: "playerTurn",
            resolvingState: "resolvingTurn",
            shuffleDelayMs: 650,
            dealDelayMs: 900,
            resolveDelayMs: 700,
            prepareReadyMove: {
                type: "begin-turn"
            },
            selectCardMove: (cardId) => ({
                type: "select-card",
                cardId
            }),
            playMove: {
                type: "queue-play"
            },
            playGuardMoveType: "queue-play",
            animation: {
                kind: "event",
                state: "animatingPlay",
                commitMove: {
                    type: "commit-play"
                }
            },
            finalizeMove: {
                type: "finalize-turn"
            },
            resolutionTargets: [
                {
                    automaticMoveType: "advance-next-player",
                    target: "playerTurn"
                },
                {
                    automaticMoveType: "advance-next-round",
                    target: "playerTurn"
                }
            ]
        }
    });
}

export type PokerLiteMachine = ReturnType<typeof createPokerLiteMachine>;
export type PokerLiteActor = ActorRefFrom<PokerLiteMachine>;
export type PokerLiteSnapshot = SnapshotFrom<PokerLiteMachine>;
