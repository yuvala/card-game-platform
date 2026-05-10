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
    createDealCardEffect,
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

function getPlayerById(context: WarLiteContext, playerId: string): WarLitePlayer | null {
    return context.players.find((player) => player.id === playerId) ?? null;
}

function getActiveContenderIds(context: WarLiteContext): string[] {
    return context.warState?.contenders.slice() ?? context.players.map((player) => player.id);
}

function getActiveContenders(context: WarLiteContext): WarLitePlayer[] {
    return getActiveContenderIds(context).flatMap((playerId) => {
        const player = getPlayerById(context, playerId);
        return player ? [player] : [];
    });
}

function getContenderNames(context: WarLiteContext, playerIds: readonly string[]): string {
    return playerIds
        .map((playerId) => getPlayerById(context, playerId)?.name ?? playerId)
        .join(", ");
}

function getRequiredComparisonCount(context: WarLiteContext): number {
    return getActiveContenderIds(context).length;
}

function getNextRevealPlayer(context: WarLiteContext): WarLitePlayer | null {
    const nextPlayerId = getActiveContenderIds(context)[context.comparisonCards.length];
    return nextPlayerId ? getPlayerById(context, nextPlayerId) : null;
}

export function getNextBattleActionPlayer(context: WarLiteContext): WarLitePlayer | null {
    if (context.warState?.stage === "face-down") {
        const firstContenderId = context.warState.contenders[0];
        return firstContenderId ? getPlayerById(context, firstContenderId) : null;
    }

    return getNextRevealPlayer(context);
}

function rankPlayedCards(roundCards: readonly WarLitePlayedCard[]): WarLitePlayedCard[] {
    return roundCards.slice().sort((leftCard, rightCard) => {
        return rightCard.card.sortOrder - leftCard.card.sortOrder;
    });
}

function createBattleCard(input: {
    context: WarLiteContext;
    card: WarLitePlayedCard["card"];
    player: WarLitePlayer;
    isFaceUp: boolean;
    isComparisonCard: boolean;
}): WarLitePlayedCard {
    const warDepth = input.context.warState?.depth ?? 0;
    const visibilityKey = input.isFaceUp ? "up" : "down";

    return {
        id: [
            "battle",
            input.context.round,
            warDepth,
            visibilityKey,
            input.player.id,
            input.context.roundCards.length
        ].join("-"),
        card: input.card,
        playerId: input.player.id,
        playerName: input.player.name,
        round: input.context.round,
        isFaceUp: input.isFaceUp,
        isComparisonCard: input.isComparisonCard,
        warDepth
    };
}

function getRoundCardFaceUp(context: WarLiteContext, cardId: string): boolean {
    return context.roundCards.find((playedCard) => playedCard.card.id === cardId)?.isFaceUp ?? true;
}

function collectBattlePileWithEffects(input: {
    context: WarLiteContext;
    targetPileId: string;
    targetOwnerId?: string;
    keyPrefix: string;
}): { piles: WarLiteContext["piles"]; effects: CardGameEffect[] } {
    const battleCards = getPileCards(input.context.piles, WAR_LITE_BATTLE_PILE_ID);
    const targetPileCardCount = getPileCards(input.context.piles, input.targetPileId).length;
    const effects = battleCards.map((card, index) => {
        const isFaceUp = getRoundCardFaceUp(input.context, card.id);

        return createCollectCardEffect({
            card,
            fromPileId: WAR_LITE_BATTLE_PILE_ID,
            fromIndex: index,
            fromPileCardCount: battleCards.length,
            fromFaceUp: isFaceUp,
            toPileId: input.targetPileId,
            toOwnerId: input.targetOwnerId,
            toIndex: targetPileCardCount + index,
            isFaceUp,
            keyPrefix: input.keyPrefix
        });
    });
    const piles = clearPile(
        appendCardsToPile(input.context.piles, input.targetPileId, battleCards),
        WAR_LITE_BATTLE_PILE_ID
    );

    return {
        piles,
        effects
    };
}

function collectBattleToWinnerWithEffects(input: {
    context: WarLiteContext;
    winningCard: WarLitePlayedCard;
    statusText?: string;
}): { state: WarLiteContext; effects: CardGameEffect[] } {
    const targetPileId = getWarLiteCapturePileId(input.winningCard.playerId);
    const battleCardCount = getPileCards(input.context.piles, WAR_LITE_BATTLE_PILE_ID).length;
    const collectTransition = collectBattlePileWithEffects({
        context: input.context,
        targetPileId,
        targetOwnerId: input.winningCard.playerId,
        keyPrefix:
            "battle-collect-" +
            String(input.context.round) +
            "-war-" +
            String(input.context.warState?.depth ?? 0)
    });
    const winningPlayerIds = [input.winningCard.playerId];
    const statusText =
        input.statusText ??
        (
            input.context.warState
                ? input.winningCard.playerName +
                  " wins the war with " +
                  input.winningCard.card.displayLabel +
                  " and collects " +
                  battleCardCount +
                  " cards."
                : "Battle " +
                  input.context.round +
                  " goes to " +
                  input.winningCard.playerName +
                  " with " +
                  input.winningCard.card.displayLabel +
                  "."
        );

    return {
        state: {
            ...input.context,
            piles: collectTransition.piles,
            players: input.context.players.map((player) => {
                if (!winningPlayerIds.includes(player.id)) {
                    return player;
                }

                return {
                    ...player,
                    score: player.score + 1
                };
            }),
            playedCardHistory: input.context.playedCardHistory.concat(input.context.roundCards),
            lastPlayedCard: input.winningCard,
            winningPlayerIds,
            warState: null,
            statusText
        },
        effects: collectTransition.effects
    };
}

function collectUnresolvedTieWithEffects(context: WarLiteContext): { state: WarLiteContext; effects: CardGameEffect[] } {
    const collectTransition = collectBattlePileWithEffects({
        context,
        targetPileId: WAR_LITE_DISCARD_PILE_ID,
        keyPrefix:
            "battle-tie-discard-" +
            String(context.round) +
            "-war-" +
            String(context.warState?.depth ?? 0)
    });

    return {
        state: {
            ...context,
            piles: collectTransition.piles,
            playedCardHistory: context.playedCardHistory.concat(context.roundCards),
            winningPlayerIds: [],
            warState: null,
            statusText:
                "Battle " +
                context.round +
                " is an unresolved war. No tied player has cards left to continue."
        },
        effects: collectTransition.effects
    };
}

export function hasPendingBattleAction(context: WarLiteContext): boolean {
    if (context.warState?.stage === "face-down") {
        return true;
    }

    if (context.warState?.stage === "reveal") {
        return context.comparisonCards.length < context.warState.contenders.length;
    }

    const requiredComparisonCount = getRequiredComparisonCount(context);
    return context.comparisonCards.length > 0 && context.comparisonCards.length < requiredComparisonCount;
}

export function canRevealBattle(context: WarLiteContext): boolean {
    if (context.warState?.stage === "face-down") {
        return context.warState.contenders.length >= 2;
    }

    const nextPlayer = getNextRevealPlayer(context);
    return Boolean(
        context.players.length >= 2 &&
        nextPlayer &&
        context.comparisonCards.length < getRequiredComparisonCount(context) &&
        getPlayerStackCards(context, nextPlayer.id).length > 0
    );
}

export function recycleEmptyPlayerStacks(context: WarLiteContext): { context: WarLiteContext; effects: CardGameEffect[] } {
    let piles = context.piles;
    const recycledPlayerNames: string[] = [];
    const effects: CardGameEffect[] = [];

    context.players.forEach((player) => {
        const stackPileId = getWarLiteHandPileId(player.id);
        const wonPileId = getWarLiteCapturePileId(player.id);
        const stackCards = getPileCards(piles, stackPileId);
        const wonCards = getPileCards(piles, wonPileId);

        if (stackCards.length > 0 || wonCards.length === 0) {
            return;
        }

        wonCards.forEach((card, index) => {
            effects.push(createDealCardEffect({
                card,
                fromPileId: wonPileId,
                fromOwnerId: player.id,
                fromIndex: index,
                fromPileCardCount: wonCards.length,
                fromFaceUp: false,
                toPileId: stackPileId,
                toOwnerId: player.id,
                toIndex: index,
                isFaceUp: false,
                keyPrefix: "recycle-" + player.id + "-" + String(context.round)
            }));
        });

        piles = setPileCards(piles, stackPileId, shuffleDeck(wonCards));
        piles = clearPile(piles, wonPileId);
        recycledPlayerNames.push(player.name);
    });

    if (recycledPlayerNames.length === 0) {
        return { context, effects: [] };
    }

    return {
        context: {
            ...context,
            piles,
            statusText: recycledPlayerNames.join(", ") + " shuffled won cards back into their stack."
        },
        effects
    };
}

export function setBattleStatus(context: WarLiteContext): WarLiteContext {
    if (context.warState?.stage === "face-down") {
        return {
            ...context,
            statusText:
                "War! " +
                getContenderNames(context, context.warState.contenders) +
                " tied. Click Play Card to place up to " +
                context.warFaceDownCount +
                " face-down cards each."
        };
    }

    if (!canRevealBattle(context)) {
        return {
            ...context,
            statusText: "A player has no cards left to reveal. Finish the table to see the result."
        };
    }

    const nextPlayer = getNextRevealPlayer(context);
    const waitingPrefix = context.comparisonCards.length > 0
        ? "Waiting for " + nextPlayer?.name + " to reveal. "
        : "";
    const isWarReveal = context.warState?.stage === "reveal";

    return {
        ...context,
        statusText:
            waitingPrefix +
            (isWarReveal ? "War " + context.warState?.depth : "Battle " + context.round) +
            ": click " +
            nextPlayer?.name +
            "'s stack to reveal the next card."
    };
}

export function revealBattle(context: WarLiteContext): WarLiteContext {
    return revealBattleWithEffects(context).state;
}

function placeWarFaceDownWithEffects(context: WarLiteContext): { state: WarLiteContext; effects: CardGameEffect[] } {
    if (context.warState?.stage !== "face-down") {
        return {
            state: context,
            effects: []
        };
    }

    const warState = context.warState;
    let piles = context.piles;
    const effects: CardGameEffect[] = [];
    const faceDownCards: WarLitePlayedCard[] = [];

    getActiveContenders(context).forEach((player) => {
        const fromPileId = getWarLiteHandPileId(player.id);
        const availableStackCards = getPileCards(piles, fromPileId).length;
        const faceDownCount = Math.min(context.warFaceDownCount, Math.max(availableStackCards - 1, 0));

        for (let cardIndex = 0; cardIndex < faceDownCount; cardIndex += 1) {
            const moveResult = moveTopCardBetweenPiles(piles, fromPileId, WAR_LITE_BATTLE_PILE_ID);
            piles = moveResult.piles;
            if (!moveResult.card) {
                break;
            }

            const playedCard = createBattleCard({
                context: {
                    ...context,
                    roundCards: context.roundCards.concat(faceDownCards)
                },
                card: moveResult.card,
                player,
                isFaceUp: false,
                isComparisonCard: false
            });
            faceDownCards.push(playedCard);

            effects.push(createPlayCardEffect({
                card: moveResult.card,
                fromPileId,
                fromOwnerId: player.id,
                fromIndex: 0,
                fromFaceUp: false,
                toPileId: WAR_LITE_BATTLE_PILE_ID,
                toIndex: getPileCards(piles, WAR_LITE_BATTLE_PILE_ID).length - 1,
                isFaceUp: false,
                keyPrefix:
                    "war-down-" +
                    String(context.round) +
                    "-" +
                    String(warState.depth) +
                    "-" +
                    player.id +
                    "-" +
                    String(cardIndex)
            }));
        }
    });

    return {
        state: {
            ...context,
            piles,
            comparisonCards: [],
            roundCards: context.roundCards.concat(faceDownCards),
            warState: {
                ...context.warState,
                stage: "reveal"
            },
            statusText:
                faceDownCards.length > 0
                    ? "War cards are face down. Reveal one card from each tied player."
                    : "No face-down war cards were available. Reveal one card from each tied player."
        },
        effects
    };
}

function revealComparisonCardWithEffects(context: WarLiteContext): { state: WarLiteContext; effects: CardGameEffect[] } {
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

    const playedCard = createBattleCard({
        context,
        card: topCard,
        player: nextPlayer,
        isFaceUp: true,
        isComparisonCard: true
    });
    const playedCards = context.roundCards.concat(playedCard);
    const comparisonCards = context.comparisonCards.concat(playedCard);
    effects.push(createPlayCardEffect({
        card: topCard,
        fromPileId,
        fromOwnerId: nextPlayer.id,
        fromIndex: 0,
        fromFaceUp: false,
        toPileId: WAR_LITE_BATTLE_PILE_ID,
        toIndex: playedCards.length - 1,
        isFaceUp: true,
        keyPrefix:
            (context.warState ? "war-reveal-" : "battle-play-") +
            String(context.round) +
            "-" +
            String(context.warState?.depth ?? 0) +
            "-" +
            nextPlayer.id
    }));

    const rankedCards = rankPlayedCards(comparisonCards);
    const leadingCard = rankedCards[0] ?? null;
    const requiredComparisonCount = getRequiredComparisonCount(context);
    const isWarReveal = context.warState?.stage === "reveal";

    return {
        state: {
            ...context,
            piles,
            comparisonCards,
            roundCards: playedCards,
            lastPlayedCard: leadingCard,
            winningPlayerIds: [],
            selectedCardId: null,
            statusText:
                nextPlayer.name +
                " flips " +
                topCard.displayLabel +
                (comparisonCards.length < requiredComparisonCount
                    ? ". Waiting for the next player."
                    : isWarReveal
                        ? ". Resolving the war."
                        : ". Resolving battle.")
        },
        effects
    };
}

export function revealBattleWithEffects(context: WarLiteContext): { state: WarLiteContext; effects: CardGameEffect[] } {
    if (context.warState?.stage === "face-down") {
        return placeWarFaceDownWithEffects(context);
    }

    return revealComparisonCardWithEffects(context);
}

export function finalizeBattle(context: WarLiteContext): WarLiteContext {
    return finalizeBattleWithEffects(context).state;
}

export function finalizeBattleWithEffects(context: WarLiteContext): { state: WarLiteContext; effects: CardGameEffect[] } {
    if (context.comparisonCards.length === 0) {
        return {
            state: context,
            effects: []
        };
    }

    if (context.comparisonCards.length < getRequiredComparisonCount(context)) {
        return {
            state: context,
            effects: []
        };
    }

    const rankedCards = rankPlayedCards(context.comparisonCards);
    const highestSortOrder = rankedCards[0]?.card.sortOrder ?? 0;
    const winningCards = rankedCards.filter((playedCard) => playedCard.card.sortOrder === highestSortOrder);
    const leadCard = winningCards[0] ?? rankedCards[0] ?? context.comparisonCards[0];

    if (winningCards.length === 1) {
        return collectBattleToWinnerWithEffects({
            context,
            winningCard: winningCards[0]
        });
    }

    const contendersWithCards = winningCards.filter((playedCard) => {
        return getPlayerAvailableCardCount(context, playedCard.playerId) > 0;
    });

    if (contendersWithCards.length === 1) {
        const winner = contendersWithCards[0];
        return collectBattleToWinnerWithEffects({
            context,
            winningCard: winner,
            statusText:
                winner.playerName +
                " wins the war because the other tied player has no cards left to continue."
        });
    }

    if (contendersWithCards.length < 2) {
        return collectUnresolvedTieWithEffects(context);
    }

    const contenderIds = contendersWithCards.map((playedCard) => playedCard.playerId);
    const nextWarDepth = (context.warState?.depth ?? 0) + 1;

    return {
        state: {
            ...context,
            comparisonCards: [],
            lastPlayedCard: leadCard,
            selectedCardId: null,
            warState: {
                contenders: contenderIds,
                depth: nextWarDepth,
                stage: "face-down"
            },
            winningPlayerIds: [],
            statusText:
                "War! " +
                getContenderNames(context, contenderIds) +
                " tied at " +
                winningCards[0].card.displayLabel +
                "."
        },
        effects: []
    };
}

export function advanceToNextRound(context: WarLiteContext): WarLiteContext {
    return {
        ...context,
        round: context.round + 1,
        comparisonCards: [],
        roundCards: [],
        selectedCardId: null,
        warState: null,
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
        comparisonCards: [],
        roundCards: [],
        warState: null,
        winningPlayerIds,
        statusText:
            context.deckDefinition.name +
            " finished. " +
            winnerLabel
    };
}
