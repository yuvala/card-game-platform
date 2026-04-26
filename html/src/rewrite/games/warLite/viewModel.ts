import type { CardGameViewModel } from "../../engine/game/viewModel";
import { DEFAULT_CARD_SKIN_ID } from "../../engine/cards/skinPacks";
import { getPileCards } from "../../engine/game/piles";
import type { WarLiteViewSnapshot } from "./types";
import {
    WAR_LITE_BATTLE_PILE_ID,
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
    const isGameOver = snapshot.matches("gameOver");
    const nextRevealPlayerId = snapshot.context.players[snapshot.context.roundCards.length]?.id ?? null;
    const nextRevealPlayer = snapshot.context.players.find((player) => player.id === nextRevealPlayerId) ?? null;
    const remainingStackCards = snapshot.context.players.reduce((count, player) => {
        return count + getPileCards(snapshot.context.piles, getWarLiteHandPileId(player.id)).length;
    }, 0);
    const totalAvailableCards = snapshot.context.players.reduce((count, player) => {
        return (
            count +
            getPileCards(snapshot.context.piles, getWarLiteHandPileId(player.id)).length +
            getPileCards(snapshot.context.piles, getWarLiteCapturePileId(player.id)).length
        );
    }, 0);
    return {
        phaseLabel: currentPhase.toUpperCase(),
        roundLabel: "Battle " + snapshot.context.round,
        deckId: snapshot.context.deckDefinition.id,
        cardSkinId: DEFAULT_CARD_SKIN_ID,
        deckLabel:
            snapshot.context.deckDefinition.name +
            " | " +
            totalAvailableCards +
            " cards still in play",
        drawPileLabel: "",
        discardPileLabel: "",
        discardCardLabel: null,
        scoreLines: snapshot.context.players.map((player) => {
            const stackCount = getPileCards(snapshot.context.piles, getWarLiteHandPileId(player.id)).length;
            const wonCount = getPileCards(snapshot.context.piles, getWarLiteCapturePileId(player.id)).length;
            return player.name + ": " + stackCount + " stack | " + wonCount + " won";
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
                    " stack | " +
                    String(player.score) +
                    " wins",
                hand: stackPreviewCards,
                handPresentation: "hidden-stack",
                isCurrentTurn: isBattleReady && player.id === nextRevealPlayerId,
                isRoundWinner: snapshot.context.winningPlayerIds.includes(player.id),
                canInteract: isBattleReady && player.id === nextRevealPlayerId && stackCards.length > 0,
                cardClickAction: "play"
            };
        }),
        tableCards: snapshot.context.roundCards.map((playedCard) => ({
            id: playedCard.card.id,
            label: playedCard.card.displayLabel,
            isFaceUp: true,
            playerId: playedCard.playerId,
            caption: playedCard.playerName
        })),
        tablePresentation: "table-row",
        tablePileIds: [WAR_LITE_BATTLE_PILE_ID],
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
                    presentation: "capture-pile" as const,
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
        outcome: isGameOver
            ? {
                  title: snapshot.context.winningPlayerIds.length === 1 ? "Winner" : "Tie",
                  detail: snapshot.context.statusText,
                  winnerPlayerIds: snapshot.context.winningPlayerIds
              }
            : null,
        primaryAction: isBattleReady && nextRevealPlayer
            ? {
                  label: "Reveal Card",
                  hint: "Click " + nextRevealPlayer.name + "'s stack to reveal the next card.",
                  eventType: "PLAY_CARD",
                  target: {
                      type: "player-hand",
                      playerId: nextRevealPlayer.id
                  }
              }
            : null,
        animation: null,
        effects: snapshot.context.lastEffects
    };
}
