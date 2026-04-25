import { ActorRefFrom, SnapshotFrom } from "xstate";

import { frenchDeckDefinition } from "../../engine/cards/deckDefinitions";
import { createCardGameMachine } from "../../engine/game/machineFactory";
import { drawPokerGameDefinition } from "./definition";
import type { RewriteGameContext, RewriteGameEvent, RewriteGameOptions } from "./types";

export function createRewriteGameMachine(playerNames: string[], options?: RewriteGameOptions) {
    const deckDefinition = options?.deckDefinition ?? frenchDeckDefinition;
    const cardsPerPlayer = options?.cardsPerPlayer ?? 5;
    const random = options?.random ?? Math.random;
    const definitionOptions: RewriteGameOptions = {
        deckDefinition,
        cardsPerPlayer,
        random
    };

    return createCardGameMachine<RewriteGameContext, RewriteGameEvent, Parameters<typeof drawPokerGameDefinition.applyMove>[1], RewriteGameOptions>({
        definition: drawPokerGameDefinition,
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

export type RewriteGameMachine = ReturnType<typeof createRewriteGameMachine>;
export type RewriteGameActor = ActorRefFrom<RewriteGameMachine>;
export type RewriteGameSnapshot = SnapshotFrom<RewriteGameMachine>;
