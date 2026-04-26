import {
    shuffleDeck
} from "../../engine/cards/createDeck";
import {
    appendCardsToPile,
    clearPile,
    getPileCards,
    moveTopCardBetweenPiles,
    setPileCards
} from "../../engine/game/piles";
import {
    createCollectCardEffect,
    createPlayCardEffect,
    type CardGameEffect
} from "../../engine/game/effects";
import type { WarLiteContext, WarLitePlayedCard, WarLitePlayer } from "./types";
import {
    WAR_LITE_BATTLE_PILE_ID,
    WAR_LITE_DISCARD_PILE_ID,
    getWarLiteCapturePileId,
    getWarLiteHandPileId
} from "./types";

function getPlayerStackCards(context: WarLiteContext, playerId: string) {
    return getPileCards(context.piles, getWarLiteHandPileId(playerId));
}

function getPlayerWonCards(context: WarLiteContext, playerId: string) {
    return getPileCards(context.piles, getWarLiteCapturePileId(playerId));
}

export function getPlayerAvailableCardCount(context: WarLiteContext, playerId: string): number {
    return getPlayerStackCards(context, playerId).length + getPlayerWonCards(context, playerId).length;
}

function getNextRevealPlayer(context: WarLiteContext): WarLitePlayer | null {
    return context.players[context.roundCards.length] ?? null;
}

function rankPlayedCards(roundCards: readonly WarLitePlayedCard[]): WarLitePlayedCard[] {
    return roundCards.slice().sort((leftCard, rightCard) => {
        return rightCard.card.sortOrder - leftCard.card.sortOrder;
    });
}

export function canRevealBattle(context: WarLiteContext): boolean {
    const nextPlayer = getNextRevealPlayer(context);
    return Boolean(
        context.players.length >= 2 &&
        nextPlayer &&
        context.roundCards.length < context.players.length &&
        getPlayerStackCards(context, nextPlayer.id).length > 0
    );
}

export function recycleEmptyPlayerStacks(context: WarLiteContext): WarLiteContext {
    let piles = context.piles;
    const recycledPlayerNames: string[] = [];

    context.players.forEach((player) => {
        const stackPileId = getWarLiteHandPileId(player.id);
        const wonPileId = getWarLiteCapturePileId(player.id);
        const stackCards = getPileCards(piles, stackPileId);
        const wonCards = getPileCards(piles, wonPileId);

        if (stackCards.length > 0 || wonCards.length === 0) {
            return;
        }

        piles = setPileCards(piles, stackPileId, shuffleDeck(wonCards));
        piles = clearPile(piles, wonPileId);
        recycledPlayerNames.push(player.name);
    });

    if (recycledPlayerNames.length === 0) {
        return context;
    }

    return {
        ...context,
        piles,
        statusText: recycledPlayerNames.join(", ") + " shuffled won cards back into their stack."
    };
}

export function setBattleStatus(context: WarLiteContext): WarLiteContext {
    if (!canRevealBattle(context)) {
        return {
            ...context,
            statusText: "A player has no cards left to reveal. Finish the table to see the result."
        };
    }

    const nextPlayer = getNextRevealPlayer(context);
    const waitingPrefix = context.roundCards.length > 0
        ? "Waiting for " + nextPlayer?.name + " to reveal. "
        : "";

    return {
        ...context,
        statusText:
            waitingPrefix +
            "Battle " +
            context.round +
            ": click " +
            nextPlayer?.name +
            "'s stack to reveal the next card."
    };
}

export function revealBattle(context: WarLiteContext): WarLiteContext {
    return revealBattleWithEffects(context).state;
}

export function revealBattleWithEffects(context: WarLiteContext): { state: WarLiteContext; effects: CardGameEffect[] } {
    if (!canRevealBattle(context)) {
        return {
            state: context,
            effects: []
        };
    }

    const nextPlayer = getNextRevealPlayer(context);
    if (!nextPlayer) {
        return {
            state: context,
            effects: []
        };
    }

    const effects: CardGameEffect[] = [];
    let piles = context.piles;
    const fromPileId = getWarLiteHandPileId(nextPlayer.id);
    const revealResult = moveTopCardBetweenPiles(
        piles,
        fromPileId,
        WAR_LITE_BATTLE_PILE_ID
    );
    piles = revealResult.piles;
    const topCard = revealResult.card;
    if (!topCard) {
        return {
            state: context,
            effects: []
        };
    }

    const playedCard: WarLitePlayedCard = {
        id: "battle-" + context.round + "-" + nextPlayer.id,
        card: topCard,
        playerId: nextPlayer.id,
        playerName: nextPlayer.name,
        round: context.round
    };
    const playedCards = context.roundCards.concat(playedCard);
    effects.push(createPlayCardEffect({
        card: topCard,
        fromPileId,
        fromOwnerId: nextPlayer.id,
        fromIndex: 0,
        fromFaceUp: false,
        toPileId: WAR_LITE_BATTLE_PILE_ID,
        toIndex: context.roundCards.length,
        isFaceUp: true,
        keyPrefix: "battle-play-" + String(context.round) + "-" + nextPlayer.id
    }));

    const rankedCards = rankPlayedCards(playedCards);
    const leadingCard = rankedCards[0] ?? null;

    return {
        state: {
            ...context,
            piles,
            roundCards: playedCards,
            lastPlayedCard: leadingCard,
            winningPlayerIds: [],
            selectedCardId: null,
            statusText:
                nextPlayer.name +
                " flips " +
                topCard.displayLabel +
                (playedCards.length < context.players.length ? ". Waiting for the next player." : ". Resolving battle.")
        },
        effects
    };
}

export function finalizeBattle(context: WarLiteContext): WarLiteContext {
    return finalizeBattleWithEffects(context).state;
}

export function finalizeBattleWithEffects(context: WarLiteContext): { state: WarLiteContext; effects: CardGameEffect[] } {
    if (context.roundCards.length === 0) {
        return {
            state: context,
            effects: []
        };
    }

    if (context.roundCards.length < context.players.length) {
        return {
            state: context,
            effects: []
        };
    }

    const rankedCards = rankPlayedCards(context.roundCards);
    const highestSortOrder = rankedCards[0]?.card.sortOrder ?? 0;
    const winningCards = rankedCards.filter((playedCard) => playedCard.card.sortOrder === highestSortOrder);
    const winningPlayerIds = winningCards.length === 1 ? [winningCards[0].playerId] : [];
    const winnerNames = winningCards.map((playedCard) => playedCard.playerName).join(", ");
    const leadCard = winningCards[0] ?? rankedCards[0] ?? context.roundCards[0];
    const battleCards = getPileCards(context.piles, WAR_LITE_BATTLE_PILE_ID);
    const targetPileId = winningPlayerIds.length === 1
        ? getWarLiteCapturePileId(winningPlayerIds[0])
        : WAR_LITE_DISCARD_PILE_ID;
    const targetPileCardCount = getPileCards(context.piles, targetPileId).length;
    const effects = battleCards.map((card, index) => {
        return createCollectCardEffect({
            card,
            fromPileId: WAR_LITE_BATTLE_PILE_ID,
            fromIndex: index,
            fromPileCardCount: battleCards.length,
            toPileId: targetPileId,
            toOwnerId: winningPlayerIds[0],
            toIndex: targetPileCardCount + index,
            isFaceUp: true,
            keyPrefix: "battle-collect-" + String(context.round)
        });
    });
    const piles = clearPile(
        appendCardsToPile(context.piles, targetPileId, battleCards),
        WAR_LITE_BATTLE_PILE_ID
    );
    return {
        state: {
            ...context,
            piles,
            players: context.players.map((player) => {
                if (!winningPlayerIds.includes(player.id)) {
                    return player;
                }

                return {
                    ...player,
                    score: player.score + 1
                };
            }),
            playedCardHistory: context.playedCardHistory.concat(context.roundCards),
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
        },
        effects
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
    const playerTotals = context.players.map((player) => {
        return {
            player,
            totalCards: getPlayerAvailableCardCount(context, player.id)
        };
    });
    const highestTotalCards = playerTotals.reduce((bestTotal, entry) => {
        return Math.max(bestTotal, entry.totalCards);
    }, 0);
    const winningPlayers = playerTotals
        .filter((entry) => entry.totalCards === highestTotalCards)
        .map((entry) => entry.player);
    const winningPlayerIds = winningPlayers.map((player) => player.id);

    let winnerLabel = "No winner.";
    if (winningPlayers.length === 1) {
        winnerLabel = winningPlayers[0].name + " wins War Lite with " + highestTotalCards + " cards.";
    } else if (winningPlayers.length > 1) {
        winnerLabel =
            "Tie between " +
            winningPlayers.map((player) => player.name).join(", ") +
            " with " +
            highestTotalCards +
            " cards each.";
    }

    return {
        ...context,
        roundCards: [],
        winningPlayerIds,
        statusText:
            context.deckDefinition.name +
            " finished. " +
            winnerLabel
    };
}
