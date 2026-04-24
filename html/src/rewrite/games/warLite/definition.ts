import type { CardGameViewModel } from "../../engine/game/viewModel";
import type { GameDefinition } from "../../engine/game/definition";
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
import type { WarLiteContext, WarLiteOptions, WarLiteViewSnapshot } from "./types";

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
        return state.players.every((player) => player.hand.length === 0) && state.roundCards.length === 0;
    },
    getAutomaticMove: (state) => {
        if (state.players.every((player) => player.hand.length === 0)) {
            return { type: "finish-game" };
        }

        return { type: "advance-next-round" };
    },
    toViewModel: (snapshot) => {
        return getWarLiteViewModel(snapshot);
    }
};
