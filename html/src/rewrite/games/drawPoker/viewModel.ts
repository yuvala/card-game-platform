import type { CardGameViewModel } from "../../engine/game/viewModel";
import { DEFAULT_CARD_SKIN_ID } from "../../engine/cards/skinPacks";
import { getPileCards } from "../../engine/game/piles";
import type { RewriteGameViewSnapshot } from "./types";
import {
    DRAW_POKER_DISCARD_PILE_ID,
    DRAW_POKER_STOCK_PILE_ID,
    getDrawPokerHandPileId
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

export function getDrawPokerViewModel(snapshot: RewriteGameViewSnapshot): CardGameViewModel {
    const currentPhase = String(snapshot.value);
    const hasSelection = Boolean(snapshot.context.selectedCardId);
    const isPlayerTurn = snapshot.matches("playerTurn");
    const drawCards = getPileCards(snapshot.context.piles, DRAW_POKER_STOCK_PILE_ID);
    const discardCards = getPileCards(snapshot.context.piles, DRAW_POKER_DISCARD_PILE_ID);
    const discardTopCard =
        snapshot.matches("animatingPlay") || discardCards.length === 0
            ? null
            : {
                  id: discardCards[discardCards.length - 1].id,
                  label: discardCards[discardCards.length - 1].displayLabel,
                  isFaceUp: true
              };
    const animation =
        snapshot.matches("animatingPlay") && snapshot.context.lastPlayedCard
            ? {
                  key:
                      snapshot.context.lastPlayedCard.id +
                      "-" +
                      snapshot.context.discardPile.length +
                      "-" +
                      snapshot.context.players[snapshot.context.turnIndex]?.hand.length,
                  playerId: snapshot.context.players[snapshot.context.turnIndex]?.id ?? "",
                  cardId: snapshot.context.lastPlayedCard.card.id
              }
            : null;

    return {
        phaseLabel: currentPhase.toUpperCase(),
        roundLabel: "Round " + snapshot.context.round + " / " + snapshot.context.maxRounds,
        deckId: snapshot.context.deckDefinition.id,
        cardSkinId: DEFAULT_CARD_SKIN_ID,
        deckLabel:
            snapshot.context.deckDefinition.name +
            " | " +
            drawCards.length +
            " cards left in draw pile",
        drawPileLabel: String(drawCards.length) + " cards",
        discardPileLabel: String(discardCards.length) + " cards",
        discardCardLabel:
            snapshot.matches("animatingPlay") || discardCards.length === 0
                ? null
                : discardCards[discardCards.length - 1].displayLabel,
        scoreLines: snapshot.context.players.map((player) => {
            return player.name + ": " + player.score + " pts";
        }),
        statusText: snapshot.context.statusText,
        selectedCardId: snapshot.context.selectedCardId,
        players: snapshot.context.players.map((player, index) => {
            const isCurrentTurn = isPlayerTurn && index === snapshot.context.turnIndex;
            const isRoundWinner = snapshot.context.winningPlayerIds.includes(player.id);

            return {
                id: player.id,
                iconLabel: getPlayerIconLabel(player.name),
                nameLabel: player.name,
                metaLabel:
                    String(getPileCards(snapshot.context.piles, getDrawPokerHandPileId(player.id)).length) +
                    " cards | " +
                    String(player.score) +
                    " pts",
                hand: getPileCards(snapshot.context.piles, getDrawPokerHandPileId(player.id)).map((card) => ({
                    id: card.id,
                    label: card.displayLabel,
                    isFaceUp: true
                })),
                isCurrentTurn,
                isRoundWinner,
                canInteract: isCurrentTurn && isPlayerTurn
            };
        }),
        tableCards: [],
        piles: [
            {
                id: "draw-pile",
                role: "draw",
                label: "Draw Pile",
                cardCount: drawCards.length,
                countLabel: String(drawCards.length) + " cards",
                topCard: null
            },
            {
                id: "discard-pile",
                role: "discard",
                label: "Discard",
                cardCount: discardCards.length,
                countLabel: String(discardCards.length) + " cards",
                topCard: discardTopCard
            }
        ],
        controls: {
            canStart: snapshot.matches("idle"),
            canPlay: isPlayerTurn && hasSelection,
            canRestart: snapshot.matches("gameOver")
        },
        animation: animation && animation.playerId ? animation : null
    };
}
