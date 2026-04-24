import { ActorRefFrom, SnapshotFrom, assign, setup } from "xstate";

import { frenchDeckDefinition } from "../../engine/cards/deckDefinitions";
import { drawPokerGameDefinition } from "./definition";
import type { RewriteGameContext, RewriteGameEvent, RewriteGameOptions } from "./types";

function getCurrentActorId(context: RewriteGameContext): string | null {
    return context.players[context.turnIndex]?.id ?? null;
}

function hasLegalMove(context: RewriteGameContext, moveType: string): boolean {
    return drawPokerGameDefinition.getLegalMoves(context, getCurrentActorId(context)).some((move) => {
        return move.type === moveType;
    });
}

function applyDefinitionMove(context: RewriteGameContext, move: Parameters<typeof drawPokerGameDefinition.applyMove>[1]) {
    return drawPokerGameDefinition.applyMove(context, move).state;
}

function getAutomaticMove(context: RewriteGameContext) {
    return drawPokerGameDefinition.getAutomaticMove?.(context) ?? null;
}

export function createRewriteGameMachine(playerNames: string[], options?: RewriteGameOptions) {
    const deckDefinition = options?.deckDefinition ?? frenchDeckDefinition;
    const cardsPerPlayer = options?.cardsPerPlayer ?? 5;
    const random = options?.random ?? Math.random;
    const definitionOptions: RewriteGameOptions = {
        deckDefinition,
        cardsPerPlayer,
        random
    };

    return setup({
        types: {
            context: {} as RewriteGameContext,
            events: {} as RewriteGameEvent
        },
        actions: {
            resetToIdle: assign(() => drawPokerGameDefinition.setup({
                playerNames,
                options: definitionOptions
            })),
            prepareShuffle: assign(({ context }) => applyDefinitionMove(context, {
                type: "prepare-shuffle",
                random
            })),
            prepareDeal: assign(({ context }) => applyDefinitionMove(context, {
                type: "deal-opening-hands"
            })),
            beginTurn: assign(({ context }) => applyDefinitionMove(context, {
                type: "begin-turn"
            })),
            selectCard: assign(({ context, event }) => {
                if (event.type !== "SELECT_CARD") {
                    return context;
                }

                return applyDefinitionMove(context, {
                    type: "select-card",
                    cardId: event.cardId
                });
            }),
            queuePlayedCard: assign(({ context }) => applyDefinitionMove(context, {
                type: "queue-play"
            })),
            commitPlayedCard: assign(({ context }) => applyDefinitionMove(context, {
                type: "commit-play"
            })),
            finalizeTurn: assign(({ context }) => applyDefinitionMove(context, {
                type: "finalize-turn"
            })),
            advanceAfterResolution: assign(({ context }) => {
                const move = getAutomaticMove(context);
                return move ? applyDefinitionMove(context, move) : context;
            })
        },
        guards: {
            currentPlayerCanPlay: ({ context }) => hasLegalMove(context, "queue-play"),
            shouldAdvanceNextPlayer: ({ context }) => getAutomaticMove(context)?.type === "advance-next-player",
            shouldAdvanceNextRound: ({ context }) => getAutomaticMove(context)?.type === "advance-next-round"
        }
    }).createMachine({
        id: drawPokerGameDefinition.id,
        initial: "idle",
        context: drawPokerGameDefinition.setup({
            playerNames,
            options: definitionOptions
        }),
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
                        actions: "beginTurn"
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
                            guard: "shouldAdvanceNextPlayer",
                            target: "playerTurn",
                            actions: "advanceAfterResolution"
                        },
                        {
                            guard: "shouldAdvanceNextRound",
                            target: "playerTurn",
                            actions: "advanceAfterResolution"
                        },
                        {
                            target: "gameOver",
                            actions: "advanceAfterResolution"
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
