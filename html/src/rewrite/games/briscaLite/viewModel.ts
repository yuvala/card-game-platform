import type { CardGameViewCard, CardGameViewModel } from "../../engine/game/viewModel";
import { getPileCards } from "../../engine/game/piles";
import { DEFAULT_CARD_SKIN_ID } from "../../engine/cards/skinPacks";
import type { BriscaLiteViewSnapshot } from "./types";
import {
    BRISCA_LITE_STOCK_PILE_ID,
    BRISCA_LITE_TRUMP_PILE_ID,
    getBriscaLiteCapturePileId,
    getBriscaLiteHandPileId
} from "./types";

function getPlayerIconLabel(playerName: string): string {
    const initials = playerName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("");

    return initials || "P";
}

function createHiddenPreviewCards(cards: readonly CardGameViewCard[], count: number): CardGameViewCard[] {
    return cards.slice(0, count).map((card) => ({
        ...card,
        isFaceUp: false
    }));
}

export function getBriscaLiteViewModel(snapshot: BriscaLiteViewSnapshot): CardGameViewModel {
    const currentPhase = String(snapshot.value);
    const isPlayerTurn = snapshot.matches("playerTurn");
    const currentPlayerId = snapshot.context.players[snapshot.context.turnIndex]?.id ?? null;
    const stockCards = getPileCards(snapshot.context.piles, BRISCA_LITE_STOCK_PILE_ID);
    const trumpCards = getPileCards(snapshot.context.piles, BRISCA_LITE_TRUMP_PILE_ID);
    const trumpCard = trumpCards[trumpCards.length - 1] ?? null;
    const trumpTopCard = trumpCard
        ? {
              id: trumpCard.id,
              label: trumpCard.displayLabel,
              isFaceUp: true
          }
        : null;
    const animation =
        snapshot.matches("animatingPlay") && snapshot.context.lastPlayedCard
            ? {
                  key:
                      snapshot.context.lastPlayedCard.id +
                      "-" +
                      snapshot.context.roundCards.length +
                      "-" +
                      snapshot.context.turnIndex,
                  playerId: currentPlayerId ?? "",
                  cardId: snapshot.context.lastPlayedCard.card.id
              }
            : null;

    return {
        phaseLabel: currentPhase.toUpperCase(),
        roundLabel: "Trick " + snapshot.context.round + " / " + snapshot.context.maxRounds,
        deckId: snapshot.context.deckDefinition.id,
        cardSkinId: DEFAULT_CARD_SKIN_ID,
        deckLabel:
            snapshot.context.deckDefinition.name +
            " | Trump: " +
            (trumpCard?.suitLabel ?? snapshot.context.trumpSuitId ?? "spent"),
        drawPileLabel: trumpCard
            ? String(stockCards.length) + " stock + trump"
            : String(stockCards.length) + " stock",
        discardPileLabel: trumpCard?.displayLabel ?? "Trump spent",
        discardCardLabel: trumpTopCard?.label ?? null,
        scoreLines: snapshot.context.players.map((player) => {
            return player.name + ": " + player.score + " tricks";
        }),
        statusText: snapshot.context.statusText,
        selectedCardId: snapshot.context.selectedCardId,
        players: snapshot.context.players.map((player) => {
            const isCurrentTurn = isPlayerTurn && player.id === currentPlayerId;
            const revealHand = (snapshot.matches("playerTurn") || snapshot.matches("animatingPlay")) && player.id === currentPlayerId;
            const faceUpCards = getPileCards(snapshot.context.piles, getBriscaLiteHandPileId(player.id)).map((card) => ({
                id: card.id,
                label: card.displayLabel,
                isFaceUp: true
            }));

            return {
                id: player.id,
                iconLabel: getPlayerIconLabel(player.name),
                nameLabel: player.name,
                metaLabel:
                    String(player.hand.length) +
                    " cards | " +
                    String(player.score) +
                    " tricks",
                hand: revealHand
                    ? faceUpCards
                    : createHiddenPreviewCards(faceUpCards, Math.min(player.hand.length, 3)),
                isCurrentTurn,
                isRoundWinner: snapshot.context.winningPlayerIds.includes(player.id),
                canInteract: isCurrentTurn && isPlayerTurn
            };
        }),
        tableCards: snapshot.context.roundCards.map((playedCard) => ({
            id: playedCard.card.id,
            label: playedCard.card.displayLabel,
            isFaceUp: true,
            playerId: playedCard.playerId,
            caption: playedCard.playerName
        })),
        piles: [
            {
                id: "stock-pile",
                role: "draw",
                label: "Stock",
                cardCount: stockCards.length,
                countLabel: trumpCard
                    ? String(stockCards.length) + " + trump"
                    : String(stockCards.length) + " cards",
                topCard: null
            },
            {
                id: BRISCA_LITE_TRUMP_PILE_ID,
                role: "trump",
                label: "Trump",
                cardCount: trumpCards.length,
                countLabel: trumpCard?.displayLabel ?? "spent",
                topCard: trumpTopCard
            },
            ...snapshot.context.players.map((player) => {
                const capturedCards = getPileCards(
                    snapshot.context.piles,
                    getBriscaLiteCapturePileId(player.id)
                );
                const topCapturedCard = capturedCards[capturedCards.length - 1] ?? null;

                return {
                    id: getBriscaLiteCapturePileId(player.id),
                    role: "capture",
                    ownerId: player.id,
                    label: "Won",
                    cardCount: capturedCards.length,
                    countLabel: String(capturedCards.length) + " won",
                    topCard: topCapturedCard
                        ? {
                              id: topCapturedCard.id,
                              label: topCapturedCard.displayLabel,
                              isFaceUp: true
                          }
                        : null
                };
            })
        ],
        controls: {
            canStart: snapshot.matches("idle"),
            canPlay: isPlayerTurn && Boolean(snapshot.context.selectedCardId),
            canRestart: snapshot.matches("gameOver")
        },
        animation: animation && animation.playerId ? animation : null
    };
}
