import { assign, setup } from "xstate";

import type { GameDefinition } from "./definition";
import type { CardGameEvent } from "./types";

type CardGameMove = { type: string };

interface ResolutionTarget<TMove extends CardGameMove> {
    automaticMoveType: TMove["type"];
    target: string;
}

type TimedAnimationStep = {
    kind: "timed";
    state: string;
    delayMs: number;
};

type EventAnimationStep<TMove extends CardGameMove> = {
    kind: "event";
    state: string;
    commitMove: TMove;
    eventType?: "ANIMATION_DONE";
};

type AnimationStep<TMove extends CardGameMove> = TimedAnimationStep | EventAnimationStep<TMove>;

export interface CardGameMachineFlow<TMove extends CardGameMove> {
    readyState: string;
    resolvingState: string;
    shuffleDelayMs: number;
    dealDelayMs: number;
    resolveDelayMs: number;
    prepareReadyMove: TMove;
    playMove: TMove;
    playGuardMoveType: TMove["type"];
    finalizeMove: TMove;
    animation: AnimationStep<TMove>;
    resolutionTargets: readonly ResolutionTarget<TMove>[];
    selectCardMove?: (cardId: string) => TMove;
}

export interface CreateCardGameMachineInput<
    TContext extends object,
    TEvent extends CardGameEvent,
    TMove extends CardGameMove,
    TOptions
> {
    definition: GameDefinition<TContext, TMove, unknown, unknown, TOptions, string, unknown>;
    playerNames: string[];
    definitionOptions: TOptions;
    prepareShuffleMove: TMove;
    prepareDealMove: TMove;
    flow: CardGameMachineFlow<TMove>;
    getCurrentActorId?: (context: TContext) => string | null;
}

export function createCardGameMachine<
    TContext extends object,
    TEvent extends CardGameEvent,
    TMove extends CardGameMove,
    TOptions
>(input: CreateCardGameMachineInput<TContext, TEvent, TMove, TOptions>) {
    const {
        definition,
        playerNames,
        definitionOptions,
        prepareShuffleMove,
        prepareDealMove,
        flow,
        getCurrentActorId = () => null
    } = input;

    const applyDefinitionMove = (context: TContext, move: TMove): TContext => {
        return definition.applyMove(context, move).state;
    };

    const getAutomaticMove = (context: TContext): TMove | null => {
        return definition.getAutomaticMove?.(context) ?? null;
    };

    const hasLegalMove = (context: TContext, moveType: TMove["type"]): boolean => {
        return definition.getLegalMoves(context, getCurrentActorId(context)).some((move) => {
            return move.type === moveType;
        });
    };

    const initialContext = definition.setup({
        playerNames,
        options: definitionOptions
    });

    const readyStateOn: Record<string, object> = {
        PLAY_CARD: {
            target: flow.animation.state,
            guard: ({ context }: { context: TContext }) => hasLegalMove(context, flow.playGuardMoveType),
            actions: assign(({ context }: { context: TContext }) => {
                return applyDefinitionMove(context, flow.playMove);
            })
        }
    };

    if (flow.selectCardMove) {
        readyStateOn.SELECT_CARD = {
            actions: assign(({ context, event }: { context: TContext; event: TEvent }) => {
                if (event.type !== "SELECT_CARD") {
                    return context;
                }

                return applyDefinitionMove(context, flow.selectCardMove!(event.cardId));
            })
        };
    }

    const resolutionTransitions: Array<any> = flow.resolutionTargets.map(({ automaticMoveType, target }) => {
        return {
            guard: ({ context }: { context: TContext }) => getAutomaticMove(context)?.type === automaticMoveType,
            target,
            actions: assign(({ context }: { context: TContext }) => {
                const move = getAutomaticMove(context);
                return move ? applyDefinitionMove(context, move) : context;
            })
        };
    });

    resolutionTransitions.push({
        target: "gameOver",
        actions: assign(({ context }: { context: TContext }) => {
            const move = getAutomaticMove(context);
            return move ? applyDefinitionMove(context, move) : context;
        })
    });

    const states: Record<string, object> = {
        idle: {
            entry: assign(() => definition.setup({
                playerNames,
                options: definitionOptions
            })),
            on: {
                START: {
                    target: "shuffling",
                    actions: assign(({ context }: { context: TContext }) => {
                        return applyDefinitionMove(context, prepareShuffleMove);
                    })
                }
            }
        },
        shuffling: {
            after: {
                [flow.shuffleDelayMs]: {
                    target: "dealing",
                    actions: assign(({ context }: { context: TContext }) => {
                        return applyDefinitionMove(context, prepareDealMove);
                    })
                }
            }
        },
        dealing: {
            after: {
                [flow.dealDelayMs]: {
                    target: flow.readyState,
                    actions: assign(({ context }: { context: TContext }) => {
                        return applyDefinitionMove(context, flow.prepareReadyMove);
                    })
                }
            }
        },
        [flow.readyState]: {
            on: readyStateOn
        },
        [flow.resolvingState]: {
            entry: assign(({ context }: { context: TContext }) => {
                return applyDefinitionMove(context, flow.finalizeMove);
            }),
            after: {
                [flow.resolveDelayMs]: resolutionTransitions
            }
        },
        gameOver: {
            on: {
                RESTART: {
                    target: "idle",
                    actions: assign(() => definition.setup({
                        playerNames,
                        options: definitionOptions
                    }))
                }
            }
        }
    };

    const animation = flow.animation;

    if (animation.kind === "event") {
        states[animation.state] = {
            on: {
                [animation.eventType ?? "ANIMATION_DONE"]: {
                    target: flow.resolvingState,
                    actions: assign(({ context }: { context: TContext }) => {
                        return applyDefinitionMove(context, animation.commitMove);
                    })
                }
            }
        };
    } else {
        states[animation.state] = {
            after: {
                [animation.delayMs]: {
                    target: flow.resolvingState
                }
            }
        };
    }

    return setup({
        types: {
            context: {} as TContext,
            events: {} as TEvent
        }
    }).createMachine({
        id: definition.id,
        initial: "idle",
        context: initialContext,
        states
    });
}
