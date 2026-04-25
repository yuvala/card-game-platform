import type { CardInstance } from "../../engine/cards/types";
import {
    appendCardsToPile,
    clearPile,
    getPileCards,
    moveCardBetweenPiles,
    moveTopCardBetweenPiles
} from "../../engine/game/piles";
import { syncBriscaLiteContextFromPiles } from "./setup";
import type {
    BriscaLiteContext,
    BriscaLitePlayedCard,
    BriscaLitePlayer
} from "./types";
import {
    BRISCA_LITE_STOCK_PILE_ID,
    BRISCA_LITE_TRICK_PILE_ID,
    BRISCA_LITE_TRUMP_PILE_ID,
    getBriscaLiteCapturePileId,
    getBriscaLiteHandPileId
} from "./types";

function getCurrentPlayer(context: BriscaLiteContext): BriscaLitePlayer {
    return context.players[context.turnIndex];
}

function getSelectedCard(context: BriscaLiteContext): CardInstance | null {
    const player = getCurrentPlayer(context);
    if (!player || !context.selectedCardId) {
        return null;
    }

    return getPileCards(context.piles, getBriscaLiteHandPileId(player.id)).find((card) => {
        return card.id === context.selectedCardId;
    }) ?? null;
}

function getNextPlayerIndex(context: BriscaLiteContext): number {
    return (context.turnIndex + 1) % context.players.length;
}

function getTrumpSummary(context: BriscaLiteContext): string {
    if (context.trumpCard) {
        return context.trumpCard.displayLabel;
    }

    if (context.trumpSuitId) {
        return context.trumpSuitId;
    }

    return "none";
}

function compareCards(
    currentWinningCard: CardInstance,
    challengerCard: CardInstance,
    leadSuitId: string,
    trumpSuitId: string | null
): number {
    if (challengerCard.suitId === currentWinningCard.suitId) {
        return challengerCard.sortOrder - currentWinningCard.sortOrder;
    }

    if (challengerCard.suitId === trumpSuitId && currentWinningCard.suitId !== trumpSuitId) {
        return 1;
    }

    if (currentWinningCard.suitId === trumpSuitId && challengerCard.suitId !== trumpSuitId) {
        return -1;
    }

    if (challengerCard.suitId === leadSuitId && currentWinningCard.suitId !== leadSuitId) {
        return 1;
    }

    return -1;
}

function getWinningPlayedCard(context: BriscaLiteContext): BriscaLitePlayedCard | null {
    const leadCard = context.roundCards[0];
    if (!leadCard) {
        return null;
    }

    const leadSuitId = leadCard.card.suitId;
    let winningCard = leadCard;

    context.roundCards.slice(1).forEach((playedCard) => {
        if (compareCards(winningCard.card, playedCard.card, leadSuitId, context.trumpSuitId) > 0) {
            winningCard = playedCard;
        }
    });

    return winningCard;
}

function getWinnerIndex(context: BriscaLiteContext, winnerId: string | null): number {
    const winnerIndex = context.players.findIndex((player) => player.id === winnerId);
    return winnerIndex >= 0 ? winnerIndex : 0;
}

function drawCardsForPlayers(
    context: BriscaLiteContext,
    winnerId: string | null
): Pick<BriscaLiteContext, "piles" | "trumpCard" | "trumpSuitId"> {
    let piles = context.piles;
    const winnerIndex = getWinnerIndex(context, winnerId);

    for (let offset = 0; offset < context.players.length; offset += 1) {
        const playerIndex = (winnerIndex + offset) % context.players.length;
        const player = context.players[playerIndex];
        if (!player) {
            continue;
        }

        const stockDraw = moveTopCardBetweenPiles(
            piles,
            BRISCA_LITE_STOCK_PILE_ID,
            getBriscaLiteHandPileId(player.id)
        );
        piles = stockDraw.piles;
        if (stockDraw.card) {
            continue;
        }

        const trumpDraw = moveTopCardBetweenPiles(
            piles,
            BRISCA_LITE_TRUMP_PILE_ID,
            getBriscaLiteHandPileId(player.id)
        );
        piles = trumpDraw.piles;
    }

    const nextContext = syncBriscaLiteContextFromPiles({
        ...context,
        piles
    });

    return {
        piles: nextContext.piles,
        trumpCard: nextContext.trumpCard,
        trumpSuitId: nextContext.trumpSuitId
    };
}

function collectTrickToWinner(context: BriscaLiteContext): BriscaLiteContext {
    if (!context.trickWinnerId) {
        return context;
    }

    const trickCards = getPileCards(context.piles, BRISCA_LITE_TRICK_PILE_ID);
    const capturePileId = getBriscaLiteCapturePileId(context.trickWinnerId);
    const nextPiles = clearPile(
        appendCardsToPile(context.piles, capturePileId, trickCards),
        BRISCA_LITE_TRICK_PILE_ID
    );

    return syncBriscaLiteContextFromPiles({
        ...context,
        piles: nextPiles
    });
}

export function canCurrentPlayerPlay(context: BriscaLiteContext): boolean {
    return Boolean(getSelectedCard(context));
}

export function setTrickStatus(context: BriscaLiteContext): BriscaLiteContext {
    const currentPlayer = getCurrentPlayer(context);
    const selectedCard = getSelectedCard(context);

    if (!currentPlayer) {
        return context;
    }

    if (selectedCard) {
        return {
            ...context,
            statusText:
                "Trick " +
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
            "Trick " +
            context.round +
            ": " +
            currentPlayer.name +
            " to play. Trump is " +
            getTrumpSummary(context) +
            "."
    };
}

export function selectCard(context: BriscaLiteContext, cardId: string): BriscaLiteContext {
    const currentPlayer = getCurrentPlayer(context);
    const clickedCard = currentPlayer
        ? getPileCards(context.piles, getBriscaLiteHandPileId(currentPlayer.id)).find((card) => {
            return card.id === cardId;
        }) ?? null
        : null;
    if (!clickedCard) {
        return context;
    }

    const selectedCardId = context.selectedCardId === cardId ? null : cardId;
    const selectedCard = selectedCardId
        ? getPileCards(context.piles, getBriscaLiteHandPileId(currentPlayer.id)).find((card) => {
            return card.id === selectedCardId;
        }) ?? null
        : null;

    return {
        ...context,
        selectedCardId,
        statusText: selectedCard
            ? currentPlayer.name + " selected " + selectedCard.displayLabel + ". Click Play Card."
            : currentPlayer.name + " cleared the selection."
    };
}

export function queuePlayedCard(context: BriscaLiteContext): BriscaLiteContext {
    const currentPlayer = getCurrentPlayer(context);
    const selectedCard = getSelectedCard(context);
    if (!currentPlayer || !selectedCard) {
        return context;
    }

    return {
        ...context,
        statusText: currentPlayer.name + " is playing " + selectedCard.displayLabel + "...",
        lastPlayedCard: {
            id: "queue-" + context.round + "-" + context.turnIndex,
            card: selectedCard,
            playerId: currentPlayer.id,
            playerName: currentPlayer.name,
            round: context.round
        },
        selectedCardId: selectedCard.id
    };
}

export function commitPlayedCard(context: BriscaLiteContext): BriscaLiteContext {
    const currentPlayer = getCurrentPlayer(context);
    const selectedCard = getSelectedCard(context);
    if (!currentPlayer || !selectedCard) {
        return context;
    }

    const playedCard: BriscaLitePlayedCard = {
        id: "played-" + context.round + "-" + context.turnIndex,
        card: selectedCard,
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        round: context.round
    };

    const playedCardState = moveCardBetweenPiles(
        context.piles,
        getBriscaLiteHandPileId(currentPlayer.id),
        BRISCA_LITE_TRICK_PILE_ID,
        (card) => card.id === selectedCard.id
    );

    return syncBriscaLiteContextFromPiles({
        ...context,
        piles: playedCardState.piles,
        roundCards: context.roundCards.concat(playedCard),
        lastPlayedCard: playedCard,
        selectedCardId: null
    });
}

export function finalizeTurn(context: BriscaLiteContext): BriscaLiteContext {
    const lastPlayedCard = context.lastPlayedCard;
    if (!lastPlayedCard) {
        return context;
    }

    if (context.roundCards.length < context.players.length) {
        const nextPlayer = context.players[getNextPlayerIndex(context)];

        return {
            ...context,
            statusText:
                lastPlayedCard.playerName +
                " played " +
                lastPlayedCard.card.displayLabel +
                ". " +
                nextPlayer.name +
                " responds."
        };
    }

    const winningCard = getWinningPlayedCard(context);
    if (!winningCard) {
        return context;
    }

    const winnerIndex = getWinnerIndex(context, winningCard.playerId);

    return {
        ...context,
        players: context.players.map((player) => {
            if (player.id !== winningCard.playerId) {
                return player;
            }

            return {
                ...player,
                score: player.score + 1
            };
        }),
        winningPlayerIds: [winningCard.playerId],
        trickWinnerId: winningCard.playerId,
        leadPlayerId: winningCard.playerId,
        turnIndex: winnerIndex,
        lastPlayedCard: winningCard,
        statusText:
            "Trick " +
            context.round +
            " goes to " +
            winningCard.playerName +
            " with " +
            winningCard.card.displayLabel +
            "."
    };
}

export function advanceToNextPlayer(context: BriscaLiteContext): BriscaLiteContext {
    return {
        ...context,
        turnIndex: getNextPlayerIndex(context),
        selectedCardId: null,
        winningPlayerIds: [],
        trickWinnerId: null
    };
}

export function advanceToNextTrick(context: BriscaLiteContext): BriscaLiteContext {
    const collectedContext = collectTrickToWinner(context);
    const nextRoundState = drawCardsForPlayers(collectedContext, collectedContext.trickWinnerId);
    const nextLeaderId =
        collectedContext.trickWinnerId ??
        collectedContext.leadPlayerId ??
        collectedContext.players[0]?.id ??
        null;
    const nextLeaderIndex = getWinnerIndex(collectedContext, nextLeaderId);

    return {
        ...collectedContext,
        ...nextRoundState,
        discardPile: collectedContext.discardPile.concat(collectedContext.roundCards),
        roundCards: [],
        round: collectedContext.round + 1,
        turnIndex: nextLeaderIndex,
        selectedCardId: null,
        lastPlayedCard: null,
        winningPlayerIds: [],
        trickWinnerId: null,
        leadPlayerId: nextLeaderId,
        statusText:
            collectedContext.players[nextLeaderIndex].name +
            " leads trick " +
            (collectedContext.round + 1) +
            ". Trump is " +
            getTrumpSummary({
                ...collectedContext,
                ...nextRoundState
            } as BriscaLiteContext) +
            "."
    };
}

export function hasMoreTricksRemaining(context: BriscaLiteContext): boolean {
    return (
        getPileCards(context.piles, BRISCA_LITE_STOCK_PILE_ID).length > 0 ||
        getPileCards(context.piles, BRISCA_LITE_TRUMP_PILE_ID).length > 0 ||
        context.players.some((player) => getPileCards(context.piles, getBriscaLiteHandPileId(player.id)).length > 0)
    );
}

export function finishGame(context: BriscaLiteContext): BriscaLiteContext {
    const collectedContext = collectTrickToWinner(context);
    const highestScore = context.players.reduce((bestScore, player) => {
        return Math.max(bestScore, player.score);
    }, 0);
    const winningPlayers = collectedContext.players.filter((player) => player.score === highestScore);
    const winningPlayerIds = winningPlayers.map((player) => player.id);

    let winnerLabel = "No winner.";
    if (winningPlayers.length === 1) {
        winnerLabel = winningPlayers[0].name + " wins Brisca-lite with " + highestScore + " tricks.";
    } else if (winningPlayers.length > 1) {
        winnerLabel =
            "Tie between " +
            winningPlayers.map((player) => player.name).join(", ") +
            " at " +
            highestScore +
            " tricks.";
    }

    return {
        ...collectedContext,
        discardPile: collectedContext.discardPile.concat(collectedContext.roundCards),
        winningPlayerIds,
        statusText:
            collectedContext.deckDefinition.name +
            " finished after " +
            collectedContext.round +
            " tricks. " +
            winnerLabel
    };
}
