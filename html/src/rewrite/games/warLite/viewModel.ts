import type { CardGameViewCard, CardGameViewModel } from "../../engine/game/viewModel";
import { DEFAULT_CARD_SKIN_ID } from "../../engine/cards/skinPacks";
import type { WarLiteViewSnapshot } from "./types";

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

export function getWarLiteViewModel(snapshot: WarLiteViewSnapshot): CardGameViewModel {
    const currentPhase = String(snapshot.value);
    const remainingStackCards = snapshot.context.players.reduce((count, player) => {
        return count + player.hand.length;
    }, 0);
    const discardTopCard = snapshot.context.lastPlayedCard
        ? {
              id: snapshot.context.lastPlayedCard.card.id,
              label: snapshot.context.lastPlayedCard.card.displayLabel,
              isFaceUp: true
          }
        : null;

    return {
        phaseLabel: currentPhase.toUpperCase(),
        roundLabel: "Battle " + snapshot.context.round + " / " + snapshot.context.maxRounds,
        deckId: snapshot.context.deckDefinition.id,
        cardSkinId: DEFAULT_CARD_SKIN_ID,
        deckLabel:
            snapshot.context.deckDefinition.name +
            " | " +
            remainingStackCards +
            " hidden cards still in player stacks",
        drawPileLabel: String(remainingStackCards) + " hidden cards",
        discardPileLabel: String(snapshot.context.discardPile.length) + " cards revealed",
        discardCardLabel: discardTopCard?.label ?? null,
        scoreLines: snapshot.context.players.map((player) => {
            return player.name + ": " + player.score + " battle wins";
        }),
        statusText: snapshot.context.statusText,
        selectedCardId: null,
        players: snapshot.context.players.map((player) => {
            const revealedCard = snapshot.context.roundCards.find((card) => card.playerId === player.id);
            const hiddenCards = player.hand.map((card) => ({
                id: card.id,
                label: card.displayLabel,
                isFaceUp: false
            }));
            const previewCards = revealedCard
                ? [
                      {
                          id: revealedCard.card.id,
                          label: revealedCard.card.displayLabel,
                          isFaceUp: true
                      },
                      ...createHiddenPreviewCards(hiddenCards, 2)
                  ]
                : createHiddenPreviewCards(hiddenCards, 3);

            return {
                id: player.id,
                iconLabel: getPlayerIconLabel(player.name),
                nameLabel: player.name,
                metaLabel:
                    String(player.hand.length + (revealedCard ? 1 : 0)) +
                    " cards | " +
                    String(player.score) +
                    " wins",
                hand: previewCards,
                isCurrentTurn: false,
                isRoundWinner: snapshot.context.winningPlayerIds.includes(player.id),
                canInteract: false
            };
        }),
        tableCards:
            snapshot.matches("revealingBattle") || snapshot.matches("resolvingBattle")
                ? snapshot.context.roundCards.map((playedCard) => ({
                      id: playedCard.card.id,
                      label: playedCard.card.displayLabel,
                      isFaceUp: true,
                      playerId: playedCard.playerId,
                      caption: playedCard.playerName
                  }))
                : [],
        piles: [
            {
                id: "stack-summary",
                role: "draw",
                label: "Stacks",
                cardCount: remainingStackCards,
                countLabel: String(remainingStackCards) + " hidden cards",
                topCard: null
            },
            {
                id: "battle-history",
                role: "discard",
                label: "Battle Log",
                cardCount: snapshot.context.discardPile.length,
                countLabel: String(snapshot.context.discardPile.length) + " cards revealed",
                topCard: discardTopCard
            }
        ],
        controls: {
            canStart: snapshot.matches("idle"),
            canPlay: snapshot.matches("battleReady"),
            canRestart: snapshot.matches("gameOver")
        },
        animation: null
    };
}
