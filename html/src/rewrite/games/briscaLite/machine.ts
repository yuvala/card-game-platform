import { ActorRefFrom, SnapshotFrom, assign, setup } from "xstate";

import { spanishDeckDefinition } from "../../engine/cards/deckDefinitions";
import { briscaLiteGameDefinition } from "./definition";
import type {
    BriscaLiteContext,
    BriscaLiteEvent,
    BriscaLiteOptions
} from "./types";

function getCurrentActorId(context: BriscaLiteContext): string | null {
    return context.players[context.turnIndex]?.id ?? null;
}

function hasLegalMove(context: BriscaLiteContext, moveType: string): boolean {
    return briscaLiteGameDefinition.getLegalMoves(context, getCurrentActorId(context)).some((move) => {
        return move.type === moveType;
    });
}

function applyDefinitionMove(context: BriscaLiteContext, move: Parameters<typeof briscaLiteGameDefinition.applyMove>[1]) {
    return briscaLiteGameDefinition.applyMove(context, move).state;
}

function getAutomaticMove(context: BriscaLiteContext) {
    return briscaLiteGameDefinition.getAutomaticMove?.(context) ?? null;
}

export function createBriscaLiteMachine(playerNames: string[], options?: BriscaLiteOptions) {
    const deckDefinition = options?.deckDefinition ?? spanishDeckDefinition;
    const cardsPerPlayer = options?.cardsPerPlayer ?? 3;
    const random = options?.random ?? Math.random;
    const definitionOptions: BriscaLiteOptions = {
        deckDefinition,
        cardsPerPlayer,
        random
    };

    return setup({
        types: {
            context: {} as BriscaLiteContext,
            events: {} as BriscaLiteEvent
        },
        actions: {
            resetToIdle: assign(() => briscaLiteGameDefinition.setup({
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
            beginTrick: assign(({ context }) => applyDefinitionMove(context, {
                type: "begin-trick"
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
            shouldAdvanceNextTrick: ({ context }) => getAutomaticMove(context)?.type === "advance-next-trick"
        }
    }).createMachine({
        id: briscaLiteGameDefinition.id,
        initial: "idle",
        context: briscaLiteGameDefinition.setup({
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
                        actions: "beginTrick"
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
                    850: [
                        {
                            guard: "shouldAdvanceNextPlayer",
                            target: "playerTurn",
                            actions: "advanceAfterResolution"
                        },
                        {
                            guard: "shouldAdvanceNextTrick",
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

export type BriscaLiteMachine = ReturnType<typeof createBriscaLiteMachine>;
export type BriscaLiteActor = ActorRefFrom<BriscaLiteMachine>;
export type BriscaLiteSnapshot = SnapshotFrom<BriscaLiteMachine>;
