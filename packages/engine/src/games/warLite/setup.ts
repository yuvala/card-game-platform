import { createDeck, shuffleDeck } from '../../engine/cards/createDeck';
import type { DeckDefinition } from '../../engine/cards/types';
import { createConfiguredPiles } from '../../engine/game/config';
import { createDealCardEffect, type CardGameEffect } from '../../engine/game/effects';
import { drawTopCardFromPile, getPileCards, setPileCards } from '../../engine/game/piles';
import { warLiteConfig } from './config';
import type { WarLiteContext, WarLitePlayer } from './types';
import { WAR_LITE_STOCK_PILE_ID, getWarLiteHandPileId } from './types';

function createPlayers(names: string[]): WarLitePlayer[] {
    return names.slice(0, 2).map((name, index) => ({
        id: 'p' + (index + 1),
        name,
        score: 0,
    }));
}

function resolveCardsPerPlayer(
    deckDefinition: DeckDefinition,
    playerCount: number,
    requestedCardsPerPlayer?: number,
): number {
    const totalCards = deckDefinition.suits.length * deckDefinition.ranks.length;
    const maximumCardsPerPlayer = Math.max(1, Math.floor(totalCards / Math.max(playerCount, 1)));
    if (typeof requestedCardsPerPlayer === 'number' && Number.isFinite(requestedCardsPerPlayer)) {
        return Math.min(Math.max(1, Math.floor(requestedCardsPerPlayer)), maximumCardsPerPlayer);
    }

    return maximumCardsPerPlayer;
}

function resolveWarFaceDownCount(requestedWarFaceDownCount?: number): number {
    if (
        typeof requestedWarFaceDownCount === 'number' &&
        Number.isFinite(requestedWarFaceDownCount)
    ) {
        return Math.max(0, Math.floor(requestedWarFaceDownCount));
    }

    return warLiteConfig.warRule.faceDownCount;
}

export function createInitialContext(
    playerNames: string[],
    deckDefinition: DeckDefinition,
    requestedCardsPerPlayer?: number,
    requestedWarFaceDownCount?: number,
): WarLiteContext {
    const players = createPlayers(playerNames);
    const cardsPerPlayer = resolveCardsPerPlayer(
        deckDefinition,
        players.length || 2,
        requestedCardsPerPlayer,
    );
    const warFaceDownCount = resolveWarFaceDownCount(requestedWarFaceDownCount);

    return {
        deckDefinition,
        lastEffects: [],
        piles: createConfiguredPiles(warLiteConfig, players),
        comparisonCards: [],
        roundCards: [],
        players,
        turnIndex: 0,
        round: 1,
        maxRounds: cardsPerPlayer,
        cardsPerPlayer,
        warFaceDownCount,
        warState: null,
        statusText:
            'Press Deal Cards to split the ' +
            deckDefinition.name +
            ' between both players. Each battle reveals the top card from each stack.',
        lastPlayedCard: null,
        selectedCardId: null,
        winningPlayerIds: [],
    };
}

export function createShuffledContext(
    playerNames: string[],
    deckDefinition: DeckDefinition,
    requestedCardsPerPlayer?: number,
    requestedWarFaceDownCount?: number,
    random: () => number = Math.random,
): WarLiteContext {
    const baseContext = createInitialContext(
        playerNames,
        deckDefinition,
        requestedCardsPerPlayer,
        requestedWarFaceDownCount,
    );
    const shuffledDeck = shuffleDeck(createDeck(deckDefinition), random).reverse();

    return {
        ...baseContext,
        piles: setPileCards(baseContext.piles, WAR_LITE_STOCK_PILE_ID, shuffledDeck),
        lastEffects: [],
        random,
        statusText: 'Shuffling the ' + deckDefinition.name + ' for War Lite...',
    };
}

export function dealOpeningHands(context: WarLiteContext): {
    state: WarLiteContext;
    effects: CardGameEffect[];
} {
    let piles = context.piles;
    let dealingIndex = 0;
    const effects: CardGameEffect[] = [];

    while (getPileCards(piles, WAR_LITE_STOCK_PILE_ID).length > 0) {
        if (dealingIndex >= context.cardsPerPlayer * context.players.length) {
            break;
        }

        const player = context.players[dealingIndex % context.players.length];
        if (!player) {
            break;
        }

        const drawResult = drawTopCardFromPile(piles, WAR_LITE_STOCK_PILE_ID);
        if (!drawResult.card) {
            break;
        }

        const toPileId = getWarLiteHandPileId(player.id);
        piles = setPileCards(drawResult.piles, toPileId, [
            drawResult.card,
            ...getPileCards(drawResult.piles, toPileId),
        ]);
        effects.push(
            createDealCardEffect({
                card: drawResult.card,
                fromPileId: WAR_LITE_STOCK_PILE_ID,
                toPileId,
                toOwnerId: player.id,
                toIndex: 0,
                isFaceUp: false,
                keyPrefix: 'deal-' + String(dealingIndex) + '-' + player.id,
            }),
        );
        dealingIndex += 1;
    }

    return {
        state: {
            ...context,
            piles,
            turnIndex: 0,
            round: 1,
            comparisonCards: [],
            roundCards: [],
            lastPlayedCard: null,
            selectedCardId: null,
            winningPlayerIds: [],
            warState: null,
            statusText:
                'The ' +
                context.deckDefinition.name +
                ' is split. Press Play Card to reveal the first battle.',
        },
        effects,
    };
}
