import { ActorRefFrom, SnapshotFrom } from "xstate";

import { frenchDeckDefinition } from "../../engine/cards/deckDefinitions";
import { createCardGameMachine } from "../../engine/game/machineFactory";
import { warLiteGameDefinition } from "./definition";
import type { WarLiteContext, WarLiteEvent, WarLiteOptions } from "./types";

export function createWarLiteMachine(playerNames: string[], options?: WarLiteOptions) {
    const deckDefinition = options?.deckDefinition ?? frenchDeckDefinition;
    const random = options?.random ?? Math.random;
    const definitionOptions: WarLiteOptions = {
        deckDefinition,
        random
    };

    return createCardGameMachine<WarLiteContext, WarLiteEvent, Parameters<typeof warLiteGameDefinition.applyMove>[1], WarLiteOptions>({
        definition: warLiteGameDefinition,
        playerNames,
        definitionOptions,
        prepareShuffleMove: {
            type: "prepare-shuffle",
            random
        },
        prepareDealMove: {
            type: "deal-opening-hands"
        },
        flow: {
            readyState: "battleReady",
            resolvingState: "resolvingBattle",
            shuffleDelayMs: 650,
            dealDelayMs: 900,
            resolveDelayMs: 1200,
            prepareReadyMove: {
                type: "prepare-battle"
            },
            playMove: {
                type: "reveal-battle"
            },
            playGuardMoveType: "reveal-battle",
            animation: {
                kind: "timed",
                state: "revealingBattle",
                delayMs: 900
            },
            finalizeMove: {
                type: "finalize-battle"
            },
            resolutionTargets: [
                {
                    automaticMoveType: "advance-next-round",
                    target: "battleReady"
                }
            ]
        }
    });
}

export type WarLiteMachine = ReturnType<typeof createWarLiteMachine>;
export type WarLiteActor = ActorRefFrom<WarLiteMachine>;
export type WarLiteSnapshot = SnapshotFrom<WarLiteMachine>;
