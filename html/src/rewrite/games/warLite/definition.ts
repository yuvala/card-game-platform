import type { CardGameViewModel } from "../../engine/game/viewModel";
import type { GameDefinition } from "../../engine/game/definition";
import { getPileCards } from "../../engine/game/piles";
import { createInitialContext, createShuffledContext, dealOpeningHands } from "./setup";
import {
    advanceToNextRound,
    canRevealBattle,
    finalizeBattle,
    finishGame,
    revealBattle,
    setBattleStatus
} from "./rules";
import { getWarLiteViewModel } from "./viewModel";
import {
    getWarLiteHandPileId,
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

function areAllStacksEmpty(state: WarLiteContext): boolean {
    return state.players.every((player) => {
        return getPileCards(state.piles, getWarLiteHandPileId(player.id)).length === 0;
    });
}

export const warLiteGameDefinition: GameDefinition<
    WarLiteContext,
    WarLiteMove,
    CardGameViewModel,
    never,
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
                return {
                    state: dealOpeningHands(state)
                };
            case "prepare-battle":
                return {
                    state: setBattleStatus(state)
                };
            case "reveal-battle":
                return {
                    state: revealBattle(state)
                };
            case "finalize-battle":
                return {
                    state: finalizeBattle(state)
                };
            case "advance-next-round":
                return {
                    state: setBattleStatus(advanceToNextRound(state))
                };
            case "finish-game":
                return {
                    state: finishGame(state)
                };
        }
    },
    isGameOver: (state) => {
        return areAllStacksEmpty(state) && state.roundCards.length === 0;
    },
    getAutomaticMove: (state) => {
        if (areAllStacksEmpty(state)) {
            return { type: "finish-game" };
        }

        return { type: "advance-next-round" };
    },
    toViewModel: (snapshot) => {
        return getWarLiteViewModel(snapshot);
    }
};
