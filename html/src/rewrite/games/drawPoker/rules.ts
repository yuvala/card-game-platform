import { getPileCards, moveCardBetweenPiles } from "../../engine/game/piles";
import type { RewriteGameContext, RewritePlayedCard, RewritePlayer } from "./types";
import {
    DRAW_POKER_DISCARD_PILE_ID,
    getDrawPokerHandPileId
} from "./types";

function getCurrentPlayer(context: RewriteGameContext): RewritePlayer {
    return context.players[context.turnIndex];
}

function getPreviewCard(context: RewriteGameContext) {
    const player = getCurrentPlayer(context);
    if (context.selectedCardId) {
        return getPileCards(context.piles, getDrawPokerHandPileId(player.id)).find((card) => {
            return card.id === context.selectedCardId;
        }) ?? null;
    }

    return null;
}

function rankPlayedCards(roundCards: RewritePlayedCard[]): RewritePlayedCard[] {
    return roundCards.slice().sort((leftCard, rightCard) => {
        return rightCard.card.sortOrder - leftCard.card.sortOrder;
    });
}

export function canCurrentPlayerPlay(context: RewriteGameContext): boolean {
    return Boolean(getPreviewCard(context));
}

export function setTurnStatus(context: RewriteGameContext): RewriteGameContext {
    const currentPlayer = getCurrentPlayer(context);
    const selectedCard = getPreviewCard(context);

    if (selectedCard) {
        return {
            ...context,
            statusText:
                "Round " +
                context.round +
                ": " +
                currentPlayer.name +
                " selected " +
                selectedCard.displayLabel +
                ". Click Play Card."
        };
    }

    return {
        ...context,
        statusText:
            "Round " +
            context.round +
            ": " +
            currentPlayer.name +
            " is up. Select a card to play."
    };
}

export function selectCard(context: RewriteGameContext, cardId: string): RewriteGameContext {
    const currentPlayer = getCurrentPlayer(context);
    const clickedCard = getPileCards(context.piles, getDrawPokerHandPileId(currentPlayer.id)).find((card) => {
        return card.id === cardId;
    });

    if (!clickedCard) {
        return context;
    }

    const selectedCardId = context.selectedCardId === cardId ? null : cardId;
    const selectedCard = selectedCardId
        ? getPileCards(context.piles, getDrawPokerHandPileId(currentPlayer.id)).find((card) => {
            return card.id === selectedCardId;
        }) ?? null
        : null;

    return {
        ...context,
        selectedCardId,
        statusText: selectedCard
            ? currentPlayer.name + " selected " + selectedCard.displayLabel + ". Click Play Card."
            : currentPlayer.name + " cleared the selection. Pick a card to continue."
    };
}

export function queuePlayedCard(context: RewriteGameContext): RewriteGameContext {
    const currentPlayer = getCurrentPlayer(context);
    const previewCard = getPreviewCard(context);

    if (!previewCard) {
        return context;
    }

    return {
        ...context,
        statusText: currentPlayer.name + " is moving " + previewCard.displayLabel + " to the discard pile...",
        lastPlayedCard: {
            id: "round-" + context.round + "-turn-" + context.turnIndex,
            card: previewCard,
            playerId: currentPlayer.id,
            playerName: currentPlayer.name,
            round: context.round
        },
        selectedCardId: previewCard.id
    };
}

export function commitPlayedCard(context: RewriteGameContext): RewriteGameContext {
    const currentPlayer = getCurrentPlayer(context);
    const previewCard = getPreviewCard(context);

    if (!previewCard) {
        return context;
    }

    const playedCard: RewritePlayedCard = {
        id: "played-" + context.round + "-" + context.turnIndex,
        card: previewCard,
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        round: context.round
    };
    const playedCardState = moveCardBetweenPiles(
        context.piles,
        getDrawPokerHandPileId(currentPlayer.id),
        DRAW_POKER_DISCARD_PILE_ID,
        (card) => card.id === previewCard.id
    );

    return {
        ...context,
        piles: playedCardState.piles,
        discardPile: context.discardPile.concat(playedCard),
        roundCards: context.roundCards.concat(playedCard),
        lastPlayedCard: playedCard,
        selectedCardId: null
    };
}

export function finalizeTurn(context: RewriteGameContext): RewriteGameContext {
    const lastPlayedCard = context.lastPlayedCard;
    if (!lastPlayedCard) {
        return context;
    }

    if (context.roundCards.length < context.players.length) {
        return {
            ...context,
            statusText:
                lastPlayedCard.playerName +
                " committed " +
                lastPlayedCard.card.displayLabel +
                "."
        };
    }

    const rankedCards = rankPlayedCards(context.roundCards);
    const highestSortOrder = rankedCards[0].card.sortOrder;
    const winningCards = rankedCards.filter((playedCard) => playedCard.card.sortOrder === highestSortOrder);
    const winningPlayerIds = winningCards.map((playedCard) => playedCard.playerId);
    const winningLabel = winningCards
        .map((playedCard) => playedCard.playerName)
        .join(", ");

    return {
        ...context,
        players: context.players.map((player) => {
            if (!winningPlayerIds.includes(player.id)) {
                return player;
            }

            return {
                ...player,
                score: player.score + 1
            };
        }),
        winningPlayerIds,
        statusText:
            "Round " +
            context.round +
            (winningCards.length > 1 ? " ties between " : " goes to ") +
            winningLabel +
            " with " +
            winningCards[0].card.displayLabel +
            "."
    };
}

export function advanceToNextPlayer(context: RewriteGameContext): RewriteGameContext {
    return {
        ...context,
        turnIndex: context.turnIndex + 1,
        selectedCardId: null
    };
}

export function advanceToNextRound(context: RewriteGameContext): RewriteGameContext {
    return {
        ...context,
        round: context.round + 1,
        turnIndex: 0,
        roundCards: [],
        selectedCardId: null,
        winningPlayerIds: []
    };
}

export function hasMorePlayersInRound(context: RewriteGameContext): boolean {
    return context.turnIndex < context.players.length - 1;
}

export function hasMoreRoundsRemaining(context: RewriteGameContext): boolean {
    return context.round < context.maxRounds && context.players.some((player) => {
        return getPileCards(context.piles, getDrawPokerHandPileId(player.id)).length > 0;
    });
}

export function finishGame(context: RewriteGameContext): RewriteGameContext {
    const highestScore = context.players.reduce((bestScore, player) => {
        return Math.max(bestScore, player.score);
    }, 0);

    const winningPlayers = context.players.filter((player) => player.score === highestScore);
    const winningPlayerIds = winningPlayers.map((player) => player.id);

    let winnerLabel = "No winner.";
    if (winningPlayers.length === 1) {
        winnerLabel = winningPlayers[0].name + " wins with " + highestScore + " rounds.";
    } else if (winningPlayers.length > 1) {
        winnerLabel =
            "Tie between " +
            winningPlayers.map((player) => player.name).join(", ") +
            " at " +
            highestScore +
            " rounds.";
    }

    return {
        ...context,
        winningPlayerIds,
        statusText:
            context.deckDefinition.name +
            " finished after " +
            context.maxRounds +
            " rounds. " +
            winnerLabel
    };
}
