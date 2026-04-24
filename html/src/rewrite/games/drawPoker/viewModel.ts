import type { CardGameViewModel } from "../../engine/game/viewModel";
import type { RewriteGameViewSnapshot } from "./types";

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
    const discardTopCard =
        snapshot.matches("animatingPlay") || !snapshot.context.lastPlayedCard
            ? null
            : {
                  id: snapshot.context.lastPlayedCard.card.id,
                  label: snapshot.context.lastPlayedCard.card.displayLabel,
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
        deckLabel:
            snapshot.context.deckDefinition.name +
            " | " +
            snapshot.context.drawPile.length +
            " cards left in draw pile",
        drawPileLabel: String(snapshot.context.drawPile.length) + " cards",
        discardPileLabel: String(snapshot.context.discardPile.length) + " cards",
        discardCardLabel:
            snapshot.matches("animatingPlay") || !snapshot.context.lastPlayedCard
                ? null
                : snapshot.context.lastPlayedCard.card.displayLabel,
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
                    String(player.hand.length) +
                    " cards | " +
                    String(player.score) +
                    " pts",
                hand: player.hand.map((card) => ({
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
                cardCount: snapshot.context.drawPile.length,
                countLabel: String(snapshot.context.drawPile.length) + " cards",
                topCard: null
            },
            {
                id: "discard-pile",
                role: "discard",
                label: "Discard",
                cardCount: snapshot.context.discardPile.length,
                countLabel: String(snapshot.context.discardPile.length) + " cards",
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
