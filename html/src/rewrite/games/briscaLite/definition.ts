import type { CardGameViewModel } from "../../engine/game/viewModel";
import type { GameDefinition } from "../../engine/game/definition";
import { createInitialContext, createShuffledContext, dealOpeningHands } from "./setup";
import {
    advanceToNextPlayer,
    advanceToNextTrick,
    canCurrentPlayerPlay,
    commitPlayedCard,
    finalizeTurn,
    finishGame,
    hasMoreTricksRemaining,
    queuePlayedCard,
    selectCard,
    setTrickStatus
} from "./rules";
import { getBriscaLiteViewModel } from "./viewModel";
import type {
    BriscaLiteContext,
    BriscaLiteOptions,
    BriscaLiteViewSnapshot
} from "./types";

export type BriscaLiteMove =
    | { type: "prepare-shuffle"; random?: () => number }
    | { type: "deal-opening-hands" }
    | { type: "begin-trick" }
    | { type: "select-card"; cardId: string }
    | { type: "queue-play" }
    | { type: "commit-play" }
    | { type: "finalize-turn" }
    | { type: "advance-next-player" }
    | { type: "advance-next-trick" }
    | { type: "finish-game" };

function getPlayerNames(context: BriscaLiteContext): string[] {
    return context.players.map((player) => player.name);
}

function hasMorePlayersInTrick(context: BriscaLiteContext): boolean {
    return context.roundCards.length < context.players.length;
}

export const briscaLiteGameDefinition: GameDefinition<
    BriscaLiteContext,
    BriscaLiteMove,
    CardGameViewModel,
    never,
    BriscaLiteOptions,
    string,
    BriscaLiteViewSnapshot
> = {
    id: "rewriteBriscaLite",
    name: "Brisca-lite",
    setup: ({ playerNames, options }) => {
        return createInitialContext(playerNames, options.deckDefinition, options.cardsPerPlayer ?? 3);
    },
    getLegalMoves: (state, actorId) => {
        const currentPlayer = state.players[state.turnIndex];
        if (!currentPlayer || (actorId && actorId !== currentPlayer.id)) {
            return [];
        }

        const moves: BriscaLiteMove[] = currentPlayer.hand.map((card) => ({
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
            case "begin-trick":
                return {
                    state: setTrickStatus(state)
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
                    state: setTrickStatus(advanceToNextPlayer(state))
                };
            case "advance-next-trick":
                return {
                    state: setTrickStatus(advanceToNextTrick(state))
                };
            case "finish-game":
                return {
                    state: finishGame(state)
                };
        }
    },
    isGameOver: (state) => {
        return (
            state.roundCards.length === state.players.length &&
            !hasMoreTricksRemaining(state)
        );
    },
    getAutomaticMove: (state) => {
        if (hasMorePlayersInTrick(state)) {
            return { type: "advance-next-player" };
        }

        if (briscaLiteGameDefinition.isGameOver(state)) {
            return { type: "finish-game" };
        }

        return { type: "advance-next-trick" };
    },
    toViewModel: (snapshot) => {
        return getBriscaLiteViewModel(snapshot);
    }
};
