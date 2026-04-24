import { ActorRefFrom, SnapshotFrom, assign, setup } from "xstate";

import { frenchDeckDefinition } from "../../engine/cards/deckDefinitions";
import { warLiteGameDefinition } from "./definition";
import type { WarLiteContext, WarLiteEvent, WarLiteOptions } from "./types";

function hasLegalMove(context: WarLiteContext, moveType: string): boolean {
    return warLiteGameDefinition.getLegalMoves(context).some((move) => {
        return move.type === moveType;
    });
}

function applyDefinitionMove(context: WarLiteContext, move: Parameters<typeof warLiteGameDefinition.applyMove>[1]) {
    return warLiteGameDefinition.applyMove(context, move).state;
}

function getAutomaticMove(context: WarLiteContext) {
    return warLiteGameDefinition.getAutomaticMove?.(context) ?? null;
}

export function createWarLiteMachine(playerNames: string[], options?: WarLiteOptions) {
    const deckDefinition = options?.deckDefinition ?? frenchDeckDefinition;
    const random = options?.random ?? Math.random;
    const definitionOptions: WarLiteOptions = {
        deckDefinition,
        random
    };

    return setup({
        types: {
            context: {} as WarLiteContext,
            events: {} as WarLiteEvent
        },
        actions: {
            resetToIdle: assign(() => warLiteGameDefinition.setup({
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
            prepareBattle: assign(({ context }) => applyDefinitionMove(context, {
                type: "prepare-battle"
            })),
            revealBattle: assign(({ context }) => applyDefinitionMove(context, {
                type: "reveal-battle"
            })),
            finalizeBattle: assign(({ context }) => applyDefinitionMove(context, {
                type: "finalize-battle"
            })),
            advanceAfterResolution: assign(({ context }) => {
                const move = getAutomaticMove(context);
                return move ? applyDefinitionMove(context, move) : context;
            })
        },
        guards: {
            canRevealBattle: ({ context }) => hasLegalMove(context, "reveal-battle"),
            shouldAdvanceNextRound: ({ context }) => getAutomaticMove(context)?.type === "advance-next-round"
        }
    }).createMachine({
        id: warLiteGameDefinition.id,
        initial: "idle",
        context: warLiteGameDefinition.setup({
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
                        target: "battleReady",
                        actions: "prepareBattle"
                    }
                }
            },
            battleReady: {
                on: {
                    PLAY_CARD: {
                        target: "revealingBattle",
                        guard: "canRevealBattle",
                        actions: "revealBattle"
                    }
                }
            },
            revealingBattle: {
                after: {
                    900: {
                        target: "resolvingBattle"
                    }
                }
            },
            resolvingBattle: {
                entry: "finalizeBattle",
                after: {
                    1200: [
                        {
                            guard: "shouldAdvanceNextRound",
                            target: "battleReady",
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

export type WarLiteMachine = ReturnType<typeof createWarLiteMachine>;
export type WarLiteActor = ActorRefFrom<WarLiteMachine>;
export type WarLiteSnapshot = SnapshotFrom<WarLiteMachine>;
