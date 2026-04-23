import { ActorRefFrom, SnapshotFrom, assign, setup } from "xstate";

export interface RewritePlayer {
    id: string;
    name: string;
    handCount: number;
}

export interface RewritePlayedCard {
    id: string;
    label: string;
    playerId: string;
    playerName: string;
    round: number;
}

export interface RewriteGameContext {
    players: RewritePlayer[];
    deckCount: number;
    discardCount: number;
    turnIndex: number;
    round: number;
    maxRounds: number;
    statusText: string;
    lastPlayedCard: RewritePlayedCard | null;
}

export type RewriteGameEvent =
    | { type: "START" }
    | { type: "PLAY_CARD" }
    | { type: "ANIMATION_DONE" }
    | { type: "RESTART" };

const demoCardLabels = ["AS", "KH", "QD", "JC", "10S", "9H", "8D", "7C", "6S"];

function createPlayers(names: string[]): RewritePlayer[] {
    return names.map((name, index) => ({
        id: "p" + (index + 1),
        name,
        handCount: 0
    }));
}

function createInitialContext(names: string[]): RewriteGameContext {
    return {
        players: createPlayers(names),
        deckCount: 52,
        discardCount: 0,
        turnIndex: 0,
        round: 1,
        maxRounds: 5,
        statusText: "Press Start Rewrite to boot the Phaser + XState flow.",
        lastPlayedCard: null
    };
}

function getPlayedCardLabel(turnIndex: number, round: number): string {
    const labelIndex = (round - 1) * 3 + turnIndex;
    return demoCardLabels[labelIndex % demoCardLabels.length];
}

export function createRewriteGameMachine(playerNames: string[]) {
    return setup({
        types: {
            context: {} as RewriteGameContext,
            events: {} as RewriteGameEvent
        },
        actions: {
            resetToIdle: assign(() => createInitialContext(playerNames)),
            prepareShuffle: assign(() => ({
                ...createInitialContext(playerNames),
                statusText: "Shuffling the rewrite deck..."
            })),
            prepareDeal: assign(({ context }) => ({
                ...context,
                players: context.players.map((player) => ({
                    ...player,
                    handCount: 5
                })),
                deckCount: 37,
                discardCount: 0,
                turnIndex: 0,
                round: 1,
                statusText: "Dealing five cards to each player..."
            })),
            setTurnStatus: assign(({ context }) => ({
                ...context,
                statusText:
                    "Round " +
                    context.round +
                    ": " +
                    context.players[context.turnIndex].name +
                    " is up. Click Play Card."
            })),
            queuePlayedCard: assign(({ context }) => {
                const currentPlayer = context.players[context.turnIndex];
                return {
                    ...context,
                    statusText: currentPlayer.name + " is moving a card to the discard pile...",
                    lastPlayedCard: {
                        id: "round-" + context.round + "-turn-" + context.turnIndex,
                        label: getPlayedCardLabel(context.turnIndex, context.round),
                        playerId: currentPlayer.id,
                        playerName: currentPlayer.name,
                        round: context.round
                    }
                };
            }),
            commitPlayedCard: assign(({ context }) => ({
                ...context,
                players: context.players.map((player, index) => {
                    if (index !== context.turnIndex) {
                        return player;
                    }

                    return {
                        ...player,
                        handCount: Math.max(player.handCount - 1, 0)
                    };
                }),
                discardCount: context.discardCount + 1
            })),
            setResolveStatus: assign(({ context }) => ({
                ...context,
                statusText:
                    context.lastPlayedCard?.playerName +
                    " committed " +
                    context.lastPlayedCard?.label +
                    ". Resolving skeleton turn..."
            })),
            advanceToNextPlayer: assign(({ context }) => ({
                ...context,
                turnIndex: context.turnIndex + 1
            })),
            advanceToNextRound: assign(({ context }) => ({
                ...context,
                round: context.round + 1,
                turnIndex: 0,
                statusText: "Starting round " + (context.round + 1) + "."
            })),
            finishGame: assign(({ context }) => ({
                ...context,
                statusText: "Rewrite skeleton complete. Ready to add real rules next."
            }))
        },
        guards: {
            hasMorePlayersInRound: ({ context }) => context.turnIndex < context.players.length - 1,
            hasMoreRoundsRemaining: ({ context }) =>
                context.round < context.maxRounds && context.players.some((player) => player.handCount > 0)
        }
    }).createMachine({
        id: "rewriteDrawPoker",
        initial: "idle",
        context: createInitialContext(playerNames),
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
                    PLAY_CARD: {
                        target: "animatingPlay",
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
                entry: "setResolveStatus",
                after: {
                    450: [
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
