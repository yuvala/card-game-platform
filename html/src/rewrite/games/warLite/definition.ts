import type { CardGameViewModel } from "../../engine/game/viewModel";
import type { GameDefinition } from "../../engine/game/definition";
import type { CardGameEffect } from "../../engine/game/effects";
import { createInitialContext, createShuffledContext, dealOpeningHands } from "./setup";
import {
    advanceToNextRound,
    canRevealBattle,
    finalizeBattleWithEffects,
    finishGame,
    getPlayerAvailableCardCount,
    recycleEmptyPlayerStacks,
    revealBattleWithEffects,
    setBattleStatus
} from "./rules";
import { getWarLiteViewModel } from "./viewModel";
import {
    type WarLiteContext,
    type WarLiteOptions,
    type WarLiteViewSnapshot
} from "./types";

export type WarLiteMove =
    | { type: "prepare-shuffle"; random?: () => number }
    | { type: "deal-opening-hands" }
    | { type: "prepare-battle" }
    | { type: "reveal-battle" }
    | { type: "finalize-battle" }
    | { type: "advance-next-round" }
    | { type: "finish-game" };

function getPlayerNames(context: WarLiteContext): string[] {
    return context.players.map((player) => player.name);
}

function getPlayersWithAvailableCards(state: WarLiteContext): number {
    return state.players.filter((player) => {
        return getPlayerAvailableCardCount(state, player.id) > 0;
    }).length;
}

function hasMorePlayersToReveal(state: WarLiteContext): boolean {
    return state.roundCards.length > 0 && state.roundCards.length < state.players.length;
}

export const warLiteGameDefinition: GameDefinition<
    WarLiteContext,
    WarLiteMove,
    CardGameViewModel,
    CardGameEffect,
    WarLiteOptions,
    string,
    WarLiteViewSnapshot
> = {
    id: "rewriteWarLite",
    name: "War Lite",
    setup: ({ playerNames, options }) => {
        return createInitialContext(playerNames, options.deckDefinition);
    },
    getLegalMoves: (state) => {
        return canRevealBattle(state) ? [{ type: "reveal-battle" }] : [];
    },
    applyMove: (state, move) => {
        switch (move.type) {
            case "prepare-shuffle":
                return {
                    state: createShuffledContext(
                        getPlayerNames(state),
                        state.deckDefinition,
                        move.random
                    )
                };
            case "deal-opening-hands":
                return dealOpeningHands(state);
            case "prepare-battle":
                return {
                    state: setBattleStatus(recycleEmptyPlayerStacks(state))
                };
            case "reveal-battle":
                return revealBattleWithEffects(state);
            case "finalize-battle":
                return finalizeBattleWithEffects(state);
            case "advance-next-round":
                return {
                    state: setBattleStatus(recycleEmptyPlayerStacks(advanceToNextRound(state)))
                };
            case "finish-game":
                return {
                    state: finishGame(state)
                };
        }
    },
    isGameOver: (state) => {
        return getPlayersWithAvailableCards(state) < 2 && state.roundCards.length === 0;
    },
    getAutomaticMove: (state) => {
        if (getPlayersWithAvailableCards(state) < 2) {
            return { type: "finish-game" };
        }

        if (hasMorePlayersToReveal(state)) {
            return { type: "prepare-battle" };
        }

        return { type: "advance-next-round" };
    },
    toViewModel: (snapshot) => {
        return getWarLiteViewModel(snapshot);
    }
};
