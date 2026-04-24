import {
    appendCardsToPile,
    clearPile,
    getPileCards,
    moveTopCardBetweenPiles
} from "../../engine/game/piles";
import { syncWarLiteContextFromPiles } from "./setup";
import type { WarLiteContext, WarLitePlayedCard, WarLitePlayer } from "./types";
import {
    WAR_LITE_BATTLE_PILE_ID,
    WAR_LITE_DISCARD_PILE_ID,
    getWarLiteHandPileId
} from "./types";

function getCurrentPlayer(context: WarLiteContext): WarLitePlayer {
    return context.players[context.turnIndex];
}

function getPlayerStackCards(context: WarLiteContext, playerId: string) {
    return getPileCards(context.piles, getWarLiteHandPileId(playerId));
}

function rankPlayedCards(roundCards: readonly WarLitePlayedCard[]): WarLitePlayedCard[] {
    return roundCards.slice().sort((leftCard, rightCard) => {
        return rightCard.card.sortOrder - leftCard.card.sortOrder;
    });
}

export function canRevealBattle(context: WarLiteContext): boolean {
    return context.players.length >= 2 && context.players.every((player) => {
        return getPlayerStackCards(context, player.id).length > 0;
    });
}

export function setBattleStatus(context: WarLiteContext): WarLiteContext {
    if (!canRevealBattle(context)) {
        return {
            ...context,
            statusText: "One of the stacks is empty. Finish the table to see who won the most battles."
        };
    }

    return {
        ...context,
        statusText:
            "Battle " +
            context.round +
            ": both players are ready. Press Play Card to reveal the next battle."
    };
}

export function revealBattle(context: WarLiteContext): WarLiteContext {
    if (!canRevealBattle(context)) {
        return context;
    }

    const playedCards: WarLitePlayedCard[] = [];
    let piles = context.piles;

    context.players.forEach((player) => {
        const revealResult = moveTopCardBetweenPiles(
            piles,
            getWarLiteHandPileId(player.id),
            WAR_LITE_BATTLE_PILE_ID
        );
        piles = revealResult.piles;
        const topCard = revealResult.card;
        if (!topCard) {
            return;
        }

        playedCards.push({
            id: "battle-" + context.round + "-" + player.id,
            card: topCard,
            playerId: player.id,
            playerName: player.name,
            round: context.round
        });
    });

    const rankedCards = rankPlayedCards(playedCards);
    const leadingCard = rankedCards[0] ?? null;

    return syncWarLiteContextFromPiles({
        ...context,
        piles,
        roundCards: playedCards,
        lastPlayedCard: leadingCard,
        winningPlayerIds: [],
        selectedCardId: null,
        statusText: playedCards
            .map((playedCard) => {
                return playedCard.playerName + " flips " + playedCard.card.displayLabel;
            })
            .join(". ") + "."
    });
}

export function finalizeBattle(context: WarLiteContext): WarLiteContext {
    if (context.roundCards.length === 0) {
        return context;
    }

    const rankedCards = rankPlayedCards(context.roundCards);
    const highestSortOrder = rankedCards[0]?.card.sortOrder ?? 0;
    const winningCards = rankedCards.filter((playedCard) => playedCard.card.sortOrder === highestSortOrder);
    const winningPlayerIds = winningCards.length === 1 ? [winningCards[0].playerId] : [];
    const winnerNames = winningCards.map((playedCard) => playedCard.playerName).join(", ");
    const leadCard = winningCards[0] ?? rankedCards[0] ?? context.roundCards[0];
    const battleCards = getPileCards(context.piles, WAR_LITE_BATTLE_PILE_ID);
    const piles = clearPile(
        appendCardsToPile(context.piles, WAR_LITE_DISCARD_PILE_ID, battleCards),
        WAR_LITE_BATTLE_PILE_ID
    );
    const syncedContext = syncWarLiteContextFromPiles({
        ...context,
        piles
    });

    return {
        ...syncedContext,
        players: syncedContext.players.map((player) => {
            if (!winningPlayerIds.includes(player.id)) {
                return player;
            }

            return {
                ...player,
                score: player.score + 1
            };
        }),
        discardPile: context.discardPile.concat(context.roundCards),
        lastPlayedCard: leadCard,
        winningPlayerIds,
        statusText:
            winningCards.length === 1
                ? "Battle " +
                  context.round +
                  " goes to " +
                  winnerNames +
                  " with " +
                  winningCards[0].card.displayLabel +
                  "."
                : "Battle " +
                  context.round +
                  " is a tie at " +
                  winningCards[0].card.displayLabel +
                  ". No point awarded."
    };
}

export function advanceToNextRound(context: WarLiteContext): WarLiteContext {
    return {
        ...context,
        round: context.round + 1,
        roundCards: [],
        selectedCardId: null,
        winningPlayerIds: []
    };
}

export function finishGame(context: WarLiteContext): WarLiteContext {
    const highestScore = context.players.reduce((bestScore, player) => {
        return Math.max(bestScore, player.score);
    }, 0);
    const winningPlayers = context.players.filter((player) => player.score === highestScore);
    const winningPlayerIds = winningPlayers.map((player) => player.id);

    let winnerLabel = "No winner.";
    if (winningPlayers.length === 1) {
        winnerLabel = winningPlayers[0].name + " wins War Lite with " + highestScore + " battle wins.";
    } else if (winningPlayers.length > 1) {
        winnerLabel =
            "Tie between " +
            winningPlayers.map((player) => player.name).join(", ") +
            " at " +
            highestScore +
            " battle wins.";
    }

    return {
        ...context,
        roundCards: [],
        winningPlayerIds,
        statusText:
            context.deckDefinition.name +
            " finished after " +
            context.maxRounds +
            " battles. " +
            winnerLabel
    };
}
