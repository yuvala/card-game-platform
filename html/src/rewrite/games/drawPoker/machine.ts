import { ActorRefFrom, SnapshotFrom, assign, setup } from "xstate";

import { frenchDeckDefinition } from "../../engine/cards/deckDefinitions";
import {
    advanceToNextPlayer,
    advanceToNextRound,
    canCurrentPlayerPlay,
    commitPlayedCard,
    finalizeTurn,
    finishGame,
    hasMorePlayersInRound,
    hasMoreRoundsRemaining,
    queuePlayedCard,
    selectCard,
    setTurnStatus
} from "./rules";
import { createInitialContext, createShuffledContext, dealOpeningHands } from "./setup";
import type { RewriteGameContext, RewriteGameEvent, RewriteGameOptions } from "./types";

export function createRewriteGameMachine(playerNames: string[], options?: RewriteGameOptions) {
    const deckDefinition = options?.deckDefinition ?? frenchDeckDefinition;
    const cardsPerPlayer = options?.cardsPerPlayer ?? 5;
    const random = options?.random ?? Math.random;

    return setup({
        types: {
            context: {} as RewriteGameContext,
            events: {} as RewriteGameEvent
        },
        actions: {
            resetToIdle: assign(() => createInitialContext(playerNames, deckDefinition, cardsPerPlayer)),
            prepareShuffle: assign(() =>
                createShuffledContext(playerNames, deckDefinition, cardsPerPlayer, random)
            ),
            prepareDeal: assign(({ context }) => dealOpeningHands(context)),
            setTurnStatus: assign(({ context }) => setTurnStatus(context)),
            selectCard: assign(({ context, event }) => {
                if (event.type !== "SELECT_CARD") {
                    return context;
                }

                return selectCard(context, event.cardId);
            }),
            queuePlayedCard: assign(({ context }) => queuePlayedCard(context)),
            commitPlayedCard: assign(({ context }) => commitPlayedCard(context)),
            finalizeTurn: assign(({ context }) => finalizeTurn(context)),
            advanceToNextPlayer: assign(({ context }) => advanceToNextPlayer(context)),
            advanceToNextRound: assign(({ context }) => advanceToNextRound(context)),
            finishGame: assign(({ context }) => finishGame(context))
        },
        guards: {
            currentPlayerCanPlay: ({ context }) => canCurrentPlayerPlay(context),
            hasMorePlayersInRound: ({ context }) => hasMorePlayersInRound(context),
            hasMoreRoundsRemaining: ({ context }) => hasMoreRoundsRemaining(context)
        }
    }).createMachine({
        id: "rewriteDrawPoker",
        initial: "idle",
        context: createInitialContext(playerNames, deckDefinition, cardsPerPlayer),
        states: {
            idle: {
                entry: "resetToIdle",
                on: {
                    START: {
                        target: "shuffling",
                        actions: "prepareShuffle"
                    }
                }
            },
            shuffling: {
                after: {
                    650: {
                        target: "dealing",
                        actions: "prepareDeal"
                    }
                }
            },
            dealing: {
                after: {
                    900: {
                        target: "playerTurn",
                        actions: "setTurnStatus"
                    }
                }
            },
            playerTurn: {
                on: {
                    SELECT_CARD: {
                        actions: "selectCard"
                    },
                    PLAY_CARD: {
                        target: "animatingPlay",
                        guard: "currentPlayerCanPlay",
                        actions: "queuePlayedCard"
                    }
                }
            },
            animatingPlay: {
                on: {
                    ANIMATION_DONE: {
                        target: "resolvingTurn",
                        actions: "commitPlayedCard"
                    }
                }
            },
            resolvingTurn: {
                entry: "finalizeTurn",
                after: {
                    700: [
                        {
                            guard: "hasMorePlayersInRound",
                            target: "playerTurn",
                            actions: ["advanceToNextPlayer", "setTurnStatus"]
                        },
                        {
                            guard: "hasMoreRoundsRemaining",
                            target: "playerTurn",
                            actions: ["advanceToNextRound", "setTurnStatus"]
                        },
                        {
                            target: "gameOver",
                            actions: "finishGame"
                        }
                    ]
                }
            },
            gameOver: {
                on: {
                    RESTART: {
                        target: "idle",
                        actions: "resetToIdle"
                    }
                }
            }
        }
    });
}

export type RewriteGameMachine = ReturnType<typeof createRewriteGameMachine>;
export type RewriteGameActor = ActorRefFrom<RewriteGameMachine>;
export type RewriteGameSnapshot = SnapshotFrom<RewriteGameMachine>;
