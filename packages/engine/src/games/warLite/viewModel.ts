import type { CardGameViewModel, CardGameViewTableCard } from "../../engine/game/viewModel";
import { DEFAULT_CARD_SKIN_ID } from "../../engine/cards/skinPacks";
import { applyPlayerPovViewModel } from "../../engine/game/playerPovViewModel";
import { getPileCards } from "../../engine/game/piles";
import type { WarLiteViewSnapshot } from "./types";
import { getNextBattleActionPlayer } from "./rules";
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

function getWarLiteTableCards(snapshot: WarLiteViewSnapshot): CardGameViewTableCard[] {
    const faceDownCountsByPlayer = new Map<string, number>();
    const lastFaceDownCardIdByPlayer = new Map<string, string>();

    snapshot.context.roundCards.forEach((playedCard) => {
        if (playedCard.isFaceUp) {
            return;
        }

        faceDownCountsByPlayer.set(
            playedCard.playerId,
            (faceDownCountsByPlayer.get(playedCard.playerId) ?? 0) + 1
        );
        lastFaceDownCardIdByPlayer.set(playedCard.playerId, playedCard.id);
    });

    return snapshot.context.roundCards.map((playedCard) => {
        const faceDownCount = faceDownCountsByPlayer.get(playedCard.playerId) ?? 0;
        const isLastFaceDownCard = lastFaceDownCardIdByPlayer.get(playedCard.playerId) === playedCard.id;

        return {
            id: playedCard.card.id,
            label: playedCard.card.displayLabel,
            isFaceUp: playedCard.isFaceUp,
            playerId: playedCard.playerId,
            caption: playedCard.isComparisonCard ? playedCard.playerName : "",
            stackBadgeLabel: !playedCard.isFaceUp && isLastFaceDownCard && faceDownCount > 1
                ? String(faceDownCount) + " down"
                : undefined
        };
    });
}

export function getWarLiteViewModel(snapshot: WarLiteViewSnapshot, viewerId?: string | null): CardGameViewModel {
    const currentPhase = String(snapshot.value);
    const isBattleReady = snapshot.matches("battleReady");
    const isGameOver = snapshot.matches("gameOver");
    const nextRevealPlayer = getNextBattleActionPlayer(snapshot.context);
    const nextRevealPlayerId = nextRevealPlayer?.id ?? null;
    const isWarFaceDown = snapshot.context.warState?.stage === "face-down";
    const isWarReveal = snapshot.context.warState?.stage === "reveal";
    const battleCards = getPileCards(snapshot.context.piles, WAR_LITE_BATTLE_PILE_ID);
    const totalAvailableCards = snapshot.context.players.reduce((count, player) => {
        return (
            count +
            getPileCards(snapshot.context.piles, getWarLiteHandPileId(player.id)).length +
            getPileCards(snapshot.context.piles, getWarLiteCapturePileId(player.id)).length
        );
    }, battleCards.length);
    return applyPlayerPovViewModel({
        phaseLabel: currentPhase.toUpperCase(),
        roundLabel: snapshot.context.warState
            ? "Battle " + snapshot.context.round + " | War " + snapshot.context.warState.depth
            : "Battle " + snapshot.context.round,
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
            const topStackCard = stackCards[0] ?? null;

            return {
                id: player.id,
                iconLabel: getPlayerIconLabel(player.name),
                nameLabel: player.name,
                metaLabel:
                    String(stackCards.length) +
                    " stack | " +
                    String(player.score) +
                    " wins",
                hand: [],
                deckPile: {
                    cardCount: stackCards.length,
                    topCard: topStackCard
                        ? { id: topStackCard.id, label: topStackCard.displayLabel, isFaceUp: false }
                        : null
                },
                isCurrentTurn: isBattleReady && player.id === nextRevealPlayerId,
                isRoundWinner: snapshot.context.winningPlayerIds.includes(player.id),
                canInteract:
                    isBattleReady &&
                    player.id === nextRevealPlayerId &&
                    (stackCards.length > 0 || isWarFaceDown),
                cardClickAction: "play"
            };
        }),
        tableCards: getWarLiteTableCards(snapshot),
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
                              isFaceUp: false
                          }
                        : null
                };
            })
        ],
        controls: {
            canStart: snapshot.matches("idle"),
            canPlay: snapshot.matches("battleReady") && Boolean(nextRevealPlayer || isWarFaceDown),
            canRestart: snapshot.matches("gameOver")
        },
        outcome: isGameOver
            ? {
                  title: snapshot.context.winningPlayerIds.length === 1 ? "Winner" : "Tie",
                  detail: snapshot.context.statusText,
                  winnerPlayerIds: snapshot.context.winningPlayerIds
              }
            : null,
        primaryAction: isBattleReady && (nextRevealPlayer || isWarFaceDown)
            ? {
                  label: isWarFaceDown
                      ? "Place War Cards"
                      : isWarReveal
                          ? "Reveal War Card"
                          : "Reveal Card",
                  hint: isWarFaceDown
                      ? "Place up to " +
                        snapshot.context.warFaceDownCount +
                        " face-down cards for each tied player."
                      : "Click " + nextRevealPlayer?.name + "'s stack to reveal the next card.",
                  eventType: "PLAY_CARD",
                  target: nextRevealPlayer
                      ? {
                            type: "player-hand",
                            playerId: nextRevealPlayer.id
                        }
                      : {
                            type: "table"
                        }
              }
            : null,
        animation: null,
        effects: snapshot.context.lastEffects
    }, viewerId);
}
