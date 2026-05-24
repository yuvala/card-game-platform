import type { CardInstance } from '../../engine/cards/types';
import {
    createCollectCardEffect,
    createPlayCardEffect,
    type CardGameEffect,
} from '../../engine/game/effects';
import {
    appendCardsToPile,
    clearPile,
    getPileCards,
    moveCardBetweenPiles,
} from '../../engine/game/piles';
import { dealRefillHands } from './setup';
import type { ScopaContext, ScopaPlayer } from './types';
import {
    SCOPA_STOCK_PILE_ID,
    SCOPA_TABLE_PILE_ID,
    getScopaCapturePileId,
    getScopaHandPileId,
} from './types';

// ---------------------------------------------------------------------------
// Card value
// ---------------------------------------------------------------------------

export function getScopaCardValue(rankId: string): number {
    switch (rankId) {
        case 'ace':
            return 1;
        case '2':
            return 2;
        case '3':
            return 3;
        case '4':
            return 4;
        case '5':
            return 5;
        case '6':
            return 6;
        case '7':
            return 7;
        case 'sota':
            return 8;
        case 'caballo':
            return 9;
        case 'rey':
            return 10;
        default:
            return 0;
    }
}

// ---------------------------------------------------------------------------
// Primiera value (for end-of-round scoring)
// ---------------------------------------------------------------------------

function getPrimieraValue(rankId: string): number {
    switch (rankId) {
        case '7':
            return 21;
        case '6':
            return 18;
        case 'ace':
            return 16;
        case '5':
            return 15;
        case '4':
            return 14;
        case '3':
            return 13;
        case '2':
            return 12;
        default:
            // sota, caballo, rey
            return 10;
    }
}

// ---------------------------------------------------------------------------
// Capture combination finding
// ---------------------------------------------------------------------------

export function findCaptureCombinations(
    tableCards: CardInstance[],
    playedValue: number,
): CardInstance[][] {
    const results: CardInstance[][] = [];

    function search(startIndex: number, currentSum: number, currentCombo: CardInstance[]): void {
        if (currentSum === playedValue && currentCombo.length > 0) {
            results.push(currentCombo.slice());
        }
        if (currentSum >= playedValue) {
            return;
        }
        for (let i = startIndex; i < tableCards.length; i += 1) {
            const card = tableCards[i];
            if (!card) {
                continue;
            }
            const cardValue = getScopaCardValue(card.rankId);
            if (currentSum + cardValue <= playedValue) {
                currentCombo.push(card);
                search(i + 1, currentSum + cardValue, currentCombo);
                currentCombo.pop();
            }
        }
    }

    search(0, 0, []);
    return results;
}

// ---------------------------------------------------------------------------
// Best capture selection: most cards, then any
// ---------------------------------------------------------------------------

function selectBestCapture(combinations: CardInstance[][]): CardInstance[] {
    if (combinations.length === 0) {
        return [];
    }
    let best = combinations[0]!;
    for (let i = 1; i < combinations.length; i += 1) {
        if (combinations[i]!.length > best.length) {
            best = combinations[i]!;
        }
    }
    return best;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCurrentPlayer(context: ScopaContext): ScopaPlayer {
    return context.players[context.currentPlayerIndex]!;
}

function allHandsEmpty(context: ScopaContext): boolean {
    return context.players.every(
        (player) => getPileCards(context.piles, getScopaHandPileId(player.id)).length === 0,
    );
}

// ---------------------------------------------------------------------------
// Round-end scoring
// ---------------------------------------------------------------------------

function scoreRound(context: ScopaContext): ScopaContext {
    // Last capture player takes remaining table cards (no scopa bonus)
    let piles = context.piles;
    const tableCards = getPileCards(piles, SCOPA_TABLE_PILE_ID);
    if (tableCards.length > 0 && context.lastCapturePlayerId) {
        const capturePileId = getScopaCapturePileId(context.lastCapturePlayerId);
        piles = appendCardsToPile(piles, capturePileId, tableCards);
        piles = clearPile(piles, SCOPA_TABLE_PILE_ID);
    }

    // Tally captured cards per player
    const capturedCounts = context.players.map((player) => ({
        id: player.id,
        cards: getPileCards(piles, getScopaCapturePileId(player.id)),
    }));

    // +1 for most captured cards (tie = no point)
    const maxCards = Math.max(...capturedCounts.map((p) => p.cards.length));
    const cardWinners = capturedCounts.filter((p) => p.cards.length === maxCards);

    // +1 for most oros captured (tie = no point)
    const orosCounts = capturedCounts.map((p) => ({
        id: p.id,
        count: p.cards.filter((c) => c.suitId === 'oros').length,
    }));
    const maxOros = Math.max(...orosCounts.map((p) => p.count));
    const orosWinners = orosCounts.filter((p) => p.count === maxOros);

    // +1 for settebello (7 of oros)
    const settebelloOwnerId = capturedCounts.find((p) =>
        p.cards.some((c) => c.rankId === '7' && c.suitId === 'oros'),
    )?.id ?? null;

    // +1 for primiera
    const suitIds = context.deckDefinition.suits.map((s) => s.id);
    const primieraScores = context.players.map((player) => {
        const cards = capturedCounts.find((p) => p.id === player.id)?.cards ?? [];
        let total = 0;
        for (const suitId of suitIds) {
            const suitCards = cards.filter((c) => c.suitId === suitId);
            if (suitCards.length === 0) {
                total = 0;
                break;
            }
            const best = Math.max(...suitCards.map((c) => getPrimieraValue(c.rankId)));
            total += best;
        }
        return { id: player.id, total };
    });
    const maxPrimiera = Math.max(...primieraScores.map((p) => p.total));
    const primieraWinners =
        maxPrimiera > 0
            ? primieraScores.filter((p) => p.total === maxPrimiera && p.total > 0)
            : [];

    const updatedPlayers = context.players.map((player) => {
        let bonus = 0;

        // Most cards (no tie)
        if (cardWinners.length === 1 && cardWinners[0]!.id === player.id) {
            bonus += 1;
        }

        // Most oros (no tie)
        if (orosWinners.length === 1 && orosWinners[0]!.id === player.id) {
            bonus += 1;
        }

        // Settebello
        if (settebelloOwnerId === player.id) {
            bonus += 1;
        }

        // Primiera (no tie)
        if (primieraWinners.length === 1 && primieraWinners[0]!.id === player.id) {
            bonus += 1;
        }

        // Scopa points (already accumulated per scopa during play)
        const scopaBonus = player.scopaCount;

        return {
            ...player,
            score: player.score + bonus + scopaBonus,
        };
    });

    const highestScore = Math.max(...updatedPlayers.map((p) => p.score));
    const winners = updatedPlayers.filter((p) => p.score === highestScore);
    const winningPlayerIds = winners.map((p) => p.id);

    let winnerLabel: string;
    if (winners.length === 1) {
        winnerLabel = winners[0]!.name + ' wins with ' + highestScore + ' points!';
    } else {
        winnerLabel = 'Tie at ' + highestScore + ' points.';
    }

    return {
        ...context,
        piles,
        players: updatedPlayers,
        phase: 'gameOver',
        winningPlayerIds,
        statusText: 'Round over. ' + winnerLabel,
    };
}

// ---------------------------------------------------------------------------
// getLegalMoves
// ---------------------------------------------------------------------------

export type ScopaMove = {
    type: 'PLAY_CARD';
    cardId: string;
    captureCardIds?: string[];
};

export function getLegalMoves(context: ScopaContext, actorId?: string | null): ScopaMove[] {
    if (context.phase !== 'playing') {
        return [];
    }

    const currentPlayer = getCurrentPlayer(context);
    if (!currentPlayer) {
        return [];
    }

    if (actorId && actorId !== currentPlayer.id) {
        return [];
    }

    const handCards = getPileCards(context.piles, getScopaHandPileId(currentPlayer.id));
    const tableCards = getPileCards(context.piles, SCOPA_TABLE_PILE_ID);

    return handCards.map((card) => {
        const value = getScopaCardValue(card.rankId);
        const combinations = findCaptureCombinations(tableCards, value);
        const bestCapture = selectBestCapture(combinations);
        return {
            type: 'PLAY_CARD' as const,
            cardId: card.id,
            captureCardIds: bestCapture.map((c) => c.id),
        };
    });
}

// ---------------------------------------------------------------------------
// applyMove
// ---------------------------------------------------------------------------

export function applyMove(
    context: ScopaContext,
    move: { type: 'PLAY_CARD'; cardId: string; captureCardIds?: string[] },
): { state: ScopaContext; effects?: CardGameEffect[] } {
    if (context.phase !== 'playing') {
        return { state: context };
    }

    const currentPlayer = getCurrentPlayer(context);
    if (!currentPlayer) {
        return { state: context };
    }

    const handPileId = getScopaHandPileId(currentPlayer.id);
    const capturePileId = getScopaCapturePileId(currentPlayer.id);

    // Find played card in hand
    const handCards = getPileCards(context.piles, handPileId);
    const playedCard = handCards.find((c) => c.id === move.cardId);
    if (!playedCard) {
        return { state: context };
    }

    const fromIndex = handCards.findIndex((c) => c.id === move.cardId);
    const effects: CardGameEffect[] = [];

    // Move played card from hand to table temporarily (for animation)
    const tableCards = getPileCards(context.piles, SCOPA_TABLE_PILE_ID);
    const captureCardIds = move.captureCardIds ?? [];

    // Validate capture: recalculate to prevent cheating / bad auto-select
    const playedValue = getScopaCardValue(playedCard.rankId);
    const validTableCards = getPileCards(context.piles, SCOPA_TABLE_PILE_ID);
    const captureCards = captureCardIds
        .map((id) => validTableCards.find((c) => c.id === id))
        .filter((c): c is CardInstance => c !== undefined);

    const captureSum = captureCards.reduce(
        (sum, c) => sum + getScopaCardValue(c.rankId),
        0,
    );
    const isValidCapture = captureCards.length > 0 && captureSum === playedValue;

    let piles = context.piles;

    // Play card effect: hand → table (for animation)
    effects.push(
        createPlayCardEffect({
            card: playedCard,
            fromPileId: handPileId,
            fromOwnerId: currentPlayer.id,
            fromIndex: Math.max(0, fromIndex),
            fromFaceUp: true,
            toPileId: SCOPA_TABLE_PILE_ID,
            toIndex: tableCards.length,
            isFaceUp: true,
            keyPrefix:
                'play-' + String(context.round) + '-' + String(context.currentPlayerIndex),
        }),
    );

    if (isValidCapture) {
        // Move played card from hand to capture
        const removePlayedFromHand = moveCardBetweenPiles(
            piles,
            handPileId,
            capturePileId,
            (c) => c.id === playedCard.id,
        );
        piles = removePlayedFromHand.piles;

        // Collect capture effect for the played card
        const capturedCountBefore = getPileCards(context.piles, capturePileId).length;
        effects.push(
            createCollectCardEffect({
                card: playedCard,
                fromPileId: SCOPA_TABLE_PILE_ID,
                fromIndex: tableCards.length,
                fromPileCardCount: tableCards.length + 1,
                toPileId: capturePileId,
                toOwnerId: currentPlayer.id,
                toIndex: capturedCountBefore,
                isFaceUp: true,
                keyPrefix:
                    'capture-played-' +
                    String(context.round) +
                    '-' +
                    String(context.currentPlayerIndex),
            }),
        );

        // Move each captured table card to capture pile
        captureCards.forEach((capturedCard, index) => {
            const capturedFromIndex = tableCards.findIndex((c) => c.id === capturedCard.id);
            const capturedCountSoFar =
                capturedCountBefore + 1 + index;

            effects.push(
                createCollectCardEffect({
                    card: capturedCard,
                    fromPileId: SCOPA_TABLE_PILE_ID,
                    fromIndex: Math.max(0, capturedFromIndex),
                    fromPileCardCount: tableCards.length,
                    toPileId: capturePileId,
                    toOwnerId: currentPlayer.id,
                    toIndex: capturedCountSoFar,
                    isFaceUp: true,
                    keyPrefix:
                        'capture-' +
                        String(context.round) +
                        '-' +
                        String(context.currentPlayerIndex) +
                        '-' +
                        capturedCard.id,
                }),
            );

            const removed = moveCardBetweenPiles(
                piles,
                SCOPA_TABLE_PILE_ID,
                capturePileId,
                (c) => c.id === capturedCard.id,
            );
            piles = removed.piles;
        });

        // Check for scopa: table is now empty after capture
        const remainingTableCards = getPileCards(piles, SCOPA_TABLE_PILE_ID);
        const isLastPlay =
            getPileCards(piles, SCOPA_STOCK_PILE_ID).length === 0 &&
            context.players.every((player) => {
                const hid = getScopaHandPileId(player.id);
                const remaining = getPileCards(piles, hid).length;
                return remaining === 0;
            });

        const isScopa = remainingTableCards.length === 0 && !isLastPlay;

        const updatedPlayers = isScopa
            ? context.players.map((player) =>
                  player.id === currentPlayer.id
                      ? { ...player, scopaCount: player.scopaCount + 1 }
                      : player,
              )
            : context.players;

        // Determine next player
        const nextPlayerIndex =
            (context.currentPlayerIndex + 1) % context.players.length;
        const nextPlayer = context.players[nextPlayerIndex]!;

        // Check if all hands are empty after this play
        const handsNowEmpty = context.players.every((player) => {
            const hid = getScopaHandPileId(player.id);
            return getPileCards(piles, hid).length === 0;
        });

        const stockEmpty = getPileCards(piles, SCOPA_STOCK_PILE_ID).length === 0;

        let phase: ScopaContext['phase'] = 'playing';
        let statusText: string;

        if (handsNowEmpty) {
            phase = 'roundOver';
            statusText = stockEmpty
                ? 'Round over — calculating scores...'
                : 'Refilling hands...';
        } else if (isScopa) {
            statusText = currentPlayer.name + ' scores a Scopa! ' + nextPlayer.name + ' to play.';
        } else {
            statusText = nextPlayer.name + ' to play.';
        }

        return {
            state: {
                ...context,
                piles,
                players: updatedPlayers,
                currentPlayerIndex: nextPlayerIndex,
                turnIndex: nextPlayerIndex,
                lastCapturePlayerId: currentPlayer.id,
                phase,
                statusText,
                lastPlayedCard: null,
                selectedCardId: null,
            },
            effects,
        };
    } else {
        // No capture: place card on the table
        const removed = moveCardBetweenPiles(
            piles,
            handPileId,
            SCOPA_TABLE_PILE_ID,
            (c) => c.id === playedCard.id,
        );
        piles = removed.piles;

        const nextPlayerIndex =
            (context.currentPlayerIndex + 1) % context.players.length;
        const nextPlayer = context.players[nextPlayerIndex]!;

        const handsNowEmpty = context.players.every((player) => {
            const hid = getScopaHandPileId(player.id);
            return getPileCards(piles, hid).length === 0;
        });

        const stockEmpty = getPileCards(piles, SCOPA_STOCK_PILE_ID).length === 0;

        let phase: ScopaContext['phase'] = 'playing';
        let statusText: string;

        if (handsNowEmpty) {
            phase = 'roundOver';
            statusText = stockEmpty
                ? 'Round over — calculating scores...'
                : 'Refilling hands...';
        } else {
            statusText = nextPlayer.name + ' to play.';
        }

        return {
            state: {
                ...context,
                piles,
                currentPlayerIndex: nextPlayerIndex,
                turnIndex: nextPlayerIndex,
                phase,
                statusText,
                lastPlayedCard: null,
                selectedCardId: null,
            },
            effects,
        };
    }
}

// ---------------------------------------------------------------------------
// isGameOver
// ---------------------------------------------------------------------------

export function isGameOver(context: ScopaContext): boolean {
    return context.phase === 'gameOver';
}

// ---------------------------------------------------------------------------
// Automatic moves
// ---------------------------------------------------------------------------

export type ScopaInternalMove =
    | { type: 'prepare-shuffle'; random?: () => number }
    | { type: 'deal-opening-hands' }
    | { type: 'begin-turn' }
    | { type: 'PLAY_CARD'; cardId: string; captureCardIds?: string[] }
    | { type: 'refill-hands' }
    | { type: 'score-round' };

export function getAutomaticMove(context: ScopaContext): ScopaInternalMove | null {
    if (context.phase === 'roundOver') {
        // Check if we should refill or score
        const stockEmpty = getPileCards(context.piles, SCOPA_STOCK_PILE_ID).length === 0;
        if (stockEmpty) {
            return { type: 'score-round' };
        }
        return { type: 'refill-hands' };
    }

    return null;
}

// ---------------------------------------------------------------------------
// Apply internal moves (used by definition.ts applyMove dispatch)
// ---------------------------------------------------------------------------

export function applyInternalMove(
    context: ScopaContext,
    move: ScopaInternalMove,
): { state: ScopaContext; effects?: CardGameEffect[] } {
    switch (move.type) {
        case 'refill-hands': {
            const result = dealRefillHands(context);
            const currentPlayer = result.state.players[result.state.currentPlayerIndex]!;
            return {
                state: {
                    ...result.state,
                    phase: 'playing',
                    statusText: currentPlayer.name + ' to play.',
                },
                effects: result.effects,
            };
        }
        case 'score-round':
            return { state: scoreRound(context) };
        default:
            return { state: context };
    }
}
