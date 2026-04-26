import type { CardGameViewModel } from "../../engine/game/viewModel";
import { DEFAULT_CARD_SKIN_ID } from "../../engine/cards/skinPacks";
import { getPileCards } from "../../engine/game/piles";
import type { WarLiteViewSnapshot } from "./types";
import {
    getWarLiteCapturePileId,
    getWarLiteHandPileId
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

export function getWarLiteViewModel(snapshot: WarLiteViewSnapshot): CardGameViewModel {
    const currentPhase = String(snapshot.value);
    const isBattleReady = snapshot.matches("battleReady");
    const nextRevealPlayerId = snapshot.context.players[snapshot.context.roundCards.length]?.id ?? null;
    const remainingStackCards = snapshot.context.players.reduce((count, player) => {
        return count + getPileCards(snapshot.context.piles, getWarLiteHandPileId(player.id)).length;
    }, 0);
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
        drawPileLabel: "",
        discardPileLabel: "",
        discardCardLabel: null,
        scoreLines: snapshot.context.players.map((player) => {
            return player.name + ": " + player.score + " battle wins";
        }),
        statusText: snapshot.context.statusText,
        selectedCardId: null,
        players: snapshot.context.players.map((player) => {
            const stackCards = getPileCards(snapshot.context.piles, getWarLiteHandPileId(player.id));
            const hiddenCards = stackCards.map((card) => ({
                id: card.id,
                label: card.displayLabel,
                isFaceUp: false,
                stackCount: stackCards.length
            }));
            const stackPreviewCards = hiddenCards[0] ? [hiddenCards[0]] : [];

            return {
                id: player.id,
                iconLabel: getPlayerIconLabel(player.name),
                nameLabel: player.name,
                metaLabel:
                    String(stackCards.length) +
                    " cards | " +
                    String(player.score) +
                    " wins",
                hand: stackPreviewCards,
                isCurrentTurn: isBattleReady && player.id === nextRevealPlayerId,
                isRoundWinner: snapshot.context.winningPlayerIds.includes(player.id),
                canInteract: isBattleReady && player.id === nextRevealPlayerId && stackCards.length > 0,
                cardClickAction: "play"
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
            ...snapshot.context.players.map((player) => {
                const capturedCards = getPileCards(snapshot.context.piles, getWarLiteCapturePileId(player.id));
                const topCapturedCard = capturedCards[capturedCards.length - 1] ?? null;

                return {
                    id: getWarLiteCapturePileId(player.id),
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
            canPlay: snapshot.matches("battleReady"),
            canRestart: snapshot.matches("gameOver")
        },
        animation: null,
        effects: snapshot.context.lastEffects
    };
}
