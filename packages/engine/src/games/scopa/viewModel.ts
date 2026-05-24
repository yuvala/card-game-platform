import type { CardGameViewModel } from '../../engine/game/viewModel';
import { getPileCards } from '../../engine/game/piles';
import { DEFAULT_CARD_SKIN_ID } from '../../engine/cards/skinPacks';
import { applyPlayerPovViewModel } from '../../engine/game/playerPovViewModel';
import type { ScopaViewSnapshot } from './types';
import {
    SCOPA_STOCK_PILE_ID,
    SCOPA_TABLE_PILE_ID,
    getScopaCapturePileId,
    getScopaHandPileId,
} from './types';

function getPlayerIconLabel(playerName: string): string {
    const initials = playerName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');

    return initials || 'P';
}

export function getScopaViewModel(
    snapshot: ScopaViewSnapshot,
    viewerId?: string | null,
): CardGameViewModel {
    const currentPhase = String(snapshot.value);
    const isPlayerTurn = snapshot.matches('playerTurn');
    const isGameOver = snapshot.matches('gameOver');
    const context = snapshot.context;
    const currentPlayerId = context.players[context.currentPlayerIndex]?.id ?? null;
    const stockCards = getPileCards(context.piles, SCOPA_STOCK_PILE_ID);
    const tableCards = getPileCards(context.piles, SCOPA_TABLE_PILE_ID);

    return applyPlayerPovViewModel(
        {
            phaseLabel: currentPhase.toUpperCase(),
            roundLabel: 'Round ' + String(context.round),
            deckId: context.deckDefinition.id,
            cardSkinId: DEFAULT_CARD_SKIN_ID,
            deckLabel: context.deckDefinition.name,
            drawPileLabel: String(stockCards.length) + ' cards',
            discardPileLabel: 'Table',
            discardCardLabel: null,
            scoreLines: context.players.map((player) => {
                return (
                    player.name +
                    ': ' +
                    String(player.score) +
                    ' pts, ' +
                    String(player.scopaCount) +
                    ' scopas'
                );
            }),
            statusText: context.statusText,
            selectedCardId: context.selectedCardId,
            players: context.players.map((player) => {
                const isCurrentTurn = isPlayerTurn && player.id === currentPlayerId;
                const revealHand = viewerId
                    ? player.id === viewerId
                    : player.id === currentPlayerId;
                const faceUpCards = getPileCards(
                    context.piles,
                    getScopaHandPileId(player.id),
                ).map((card) => ({
                    id: card.id,
                    label: card.displayLabel,
                    isFaceUp: true,
                }));
                const handCount = faceUpCards.length;

                return {
                    id: player.id,
                    iconLabel: getPlayerIconLabel(player.name),
                    nameLabel: player.name,
                    metaLabel:
                        String(handCount) +
                        ' cards · ' +
                        String(player.score) +
                        ' pts · ' +
                        String(player.scopaCount) +
                        ' scopa' +
                        (player.scopaCount === 1 ? '' : 's'),
                    hand: revealHand
                        ? faceUpCards
                        : faceUpCards.map((card, cardIndex) => ({
                              ...card,
                              id: 'hidden:hand:' + player.id + ':' + String(cardIndex),
                              label: 'Hidden card',
                              isFaceUp: false,
                          })),
                    handSlotCount: context.cardsPerPlayer,
                    handPresentation: 'hand-fan' as const,
                    isCurrentTurn,
                    isRoundWinner: context.winningPlayerIds.includes(player.id),
                    canInteract: isCurrentTurn && isPlayerTurn,
                };
            }),
            tableCards: tableCards.map((card) => ({
                id: card.id,
                label: card.displayLabel,
                isFaceUp: true,
            })),
            themeId: 'scopa',
            tablePresentation: 'table-row',
            tablePileIds: [SCOPA_TABLE_PILE_ID],
            piles: [
                {
                    id: SCOPA_STOCK_PILE_ID,
                    role: 'draw',
                    label: 'Stock',
                    cardCount: stockCards.length,
                    countLabel: String(stockCards.length) + ' cards',
                    topCard: null,
                    presentation: 'hidden-stack',
                },
                ...context.players.map((player) => {
                    const capturedCards = getPileCards(
                        context.piles,
                        getScopaCapturePileId(player.id),
                    );
                    const topCapturedCard = capturedCards[capturedCards.length - 1] ?? null;

                    return {
                        id: getScopaCapturePileId(player.id),
                        role: 'capture',
                        ownerId: player.id,
                        label: 'Captured',
                        cardCount: capturedCards.length,
                        countLabel: String(capturedCards.length) + ' captured',
                        presentation: 'capture-pile' as const,
                        topCard: topCapturedCard
                            ? {
                                  id: topCapturedCard.id,
                                  label: topCapturedCard.displayLabel,
                                  isFaceUp: true,
                              }
                            : null,
                    };
                }),
            ],
            controls: {
                canStart: snapshot.matches('idle'),
                canPlay: isPlayerTurn,
                canRestart: snapshot.matches('gameOver'),
            },
            outcome: isGameOver
                ? {
                      title:
                          context.winningPlayerIds.length === 1 ? 'Winner' : 'Tie',
                      detail: context.statusText,
                      winnerPlayerIds: context.winningPlayerIds,
                  }
                : null,
            primaryAction: isPlayerTurn
                ? {
                      label: 'Play Card',
                      hint: 'Select a card from your hand to play.',
                      eventType: 'PLAY_CARD',
                      target: currentPlayerId
                          ? {
                                type: 'player-hand',
                                playerId: currentPlayerId,
                            }
                          : undefined,
                  }
                : null,
            animation: null,
            effects: context.lastEffects,
        },
        viewerId,
    );
}
