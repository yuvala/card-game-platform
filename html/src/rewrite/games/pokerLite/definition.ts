import type { CardGameViewModel } from "../../engine/game/viewModel";
import type { GameDefinition } from "../../engine/game/definition";
import { getPileCards } from "../../engine/game/piles";
import { createInitialContext, createShuffledContext, dealOpeningHands } from "./setup";
import {
    advanceToNextPlayer,
    advanceToNextRound,
    canCurrentPlayerPlay,
    commitPlayedCard,
    finalizeTurn,
    finishGame,
    queuePlayedCard,
    selectCard,
    setTurnStatus
} from "./rules";
import type {
    PokerLiteContext,
    PokerLiteOptions,
    PokerLiteViewSnapshot
} from "./types";
import { getPokerLiteViewModel } from "./viewModel";
import { getPokerLiteHandPileId } from "./types";

export type PokerLiteMove =
    | { type: "prepare-shuffle"; random?: () => number }
    | { type: "deal-opening-hands" }
    | { type: "begin-turn" }
    | { type: "select-card"; cardId: string }
    | { type: "queue-play" }
    | { type: "commit-play" }
    | { type: "finalize-turn" }
    | { type: "advance-next-player" }
    | { type: "advance-next-round" }
    | { type: "finish-game" };

function getPlayerNames(context: PokerLiteContext): string[] {
    return context.players.map((player) => player.name);
}

function hasMorePlayersInRound(context: PokerLiteContext): boolean {
    return context.turnIndex < context.players.length - 1;
}

function areAllHandsEmpty(state: PokerLiteContext): boolean {
    return state.players.every((player) => {
        return getPileCards(state.piles, getPokerLiteHandPileId(player.id)).length === 0;
    });
}

export const pokerLiteGameDefinition: GameDefinition<
    PokerLiteContext,
    PokerLiteMove,
    CardGameViewModel,
    never,
    PokerLiteOptions,
    string,
    PokerLiteViewSnapshot
> = {
    id: "rewritePokerLite",
    name: "Poker Lite",
    setup: ({ playerNames, options }) => {
        return createInitialContext(playerNames, options.deckDefinition, options.cardsPerPlayer);
    },
    getLegalMoves: (state, actorId) => {
        const currentPlayer = state.players[state.turnIndex];
        if (!currentPlayer || (actorId && actorId !== currentPlayer.id)) {
            return [];
        }

        const moves: PokerLiteMove[] = getPileCards(state.piles, getPokerLiteHandPileId(currentPlayer.id)).map((card) => ({
            type: "select-card",
            cardId: card.id
        }));

        if (canCurrentPlayerPlay(state)) {
            moves.push({ type: "queue-play" });
        }

        return moves;
    },
    applyMove: (state, move) => {
        switch (move.type) {
            case "prepare-shuffle":
                return {
                    state: createShuffledContext(
                        getPlayerNames(state),
                        state.deckDefinition,
                        state.cardsPerPlayer,
                        move.random
                    )
                };
            case "deal-opening-hands":
                return {
                    state: dealOpeningHands(state)
                };
            case "begin-turn":
                return {
                    state: setTurnStatus(state)
                };
            case "select-card":
                return {
                    state: selectCard(state, move.cardId)
                };
            case "queue-play":
                return {
                    state: queuePlayedCard(state)
                };
            case "commit-play":
                return {
                    state: commitPlayedCard(state)
                };
            case "finalize-turn":
                return {
                    state: finalizeTurn(state)
                };
            case "advance-next-player":
                return {
                    state: setTurnStatus(advanceToNextPlayer(state))
                };
            case "advance-next-round":
                return {
                    state: setTurnStatus(advanceToNextRound(state))
                };
            case "finish-game":
                return {
                    state: finishGame(state)
                };
        }
    },
    isGameOver: (state) => {
        return state.round >= state.maxRounds && areAllHandsEmpty(state);
    },
    getAutomaticMove: (state) => {
        if (hasMorePlayersInRound(state)) {
            return { type: "advance-next-player" };
        }

        if (pokerLiteGameDefinition.isGameOver(state)) {
            return { type: "finish-game" };
        }

        return { type: "advance-next-round" };
    },
    toViewModel: (snapshot) => {
        return getPokerLiteViewModel(snapshot);
    }
};
