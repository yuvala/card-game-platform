import { createDeck, shuffleDeck } from '../../engine/cards/createDeck';
import type { DeckDefinition } from '../../engine/cards/types';
import { createConfiguredPiles } from '../../engine/game/config';
import { createDealCardEffect, type CardGameEffect } from '../../engine/game/effects';
import { moveTopCardBetweenPiles, setPileCards } from '../../engine/game/piles';
import { pokerLiteConfig } from './config';
import {
    POKER_LITE_STOCK_PILE_ID,
    getPokerLiteHandPileId,
    type PokerLiteContext,
    type PokerLitePlayer,
} from './types';

function createPlayers(names: string[]): PokerLitePlayer[] {
    return names.map((name, index) => ({
        id: 'p' + (index + 1),
        name,
        score: 0,
    }));
}

function resolveCardsPerPlayer(
    deckDefinition: DeckDefinition,
    playerCount: number,
    requestedCardsPerPlayer: number,
): number {
    const totalCards = deckDefinition.suits.length * deckDefinition.ranks.length;
    const supportedCardsPerPlayer = Math.floor(totalCards / playerCount);

    return Math.max(1, Math.min(requestedCardsPerPlayer, supportedCardsPerPlayer));
}

export function createInitialContext(
    playerNames: string[],
    deckDefinition: DeckDefinition,
    requestedCardsPerPlayer: number = 5,
): PokerLiteContext {
    const players = createPlayers(playerNames);
    const cardsPerPlayer = resolveCardsPerPlayer(
        deckDefinition,
        playerNames.length,
        requestedCardsPerPlayer,
    );

    return {
        deckDefinition,
        lastEffects: [],
        playedCardHistory: [],
        piles: createConfiguredPiles(pokerLiteConfig, players),
        roundCards: [],
        players,
        turnIndex: 0,
        round: 1,
        maxRounds: cardsPerPlayer,
        cardsPerPlayer,
        statusText:
            'Press Start Rewrite to deal from the ' +
            deckDefinition.name +
            '. Try ?deck=spanish or ?deck=italian.',
        lastPlayedCard: null,
        selectedCardId: null,
        winningPlayerIds: [],
    };
}

export function createShuffledContext(
    playerNames: string[],
    deckDefinition: DeckDefinition,
    requestedCardsPerPlayer: number = 5,
    random: () => number = Math.random,
): PokerLiteContext {
    const baseContext = createInitialContext(playerNames, deckDefinition, requestedCardsPerPlayer);

    return {
        ...baseContext,
        piles: setPileCards(
            baseContext.piles,
            POKER_LITE_STOCK_PILE_ID,
            shuffleDeck(createDeck(deckDefinition), random),
        ),
        lastEffects: [],
        statusText: 'Shuffling the ' + deckDefinition.name + '...',
    };
}

export function dealOpeningHands(context: PokerLiteContext): {
    state: PokerLiteContext;
    effects: CardGameEffect[];
} {
    let piles = context.piles;
    const effects: CardGameEffect[] = [];

    for (let cardIndex = 0; cardIndex < context.cardsPerPlayer; cardIndex += 1) {
        context.players.forEach((player) => {
            const toPileId = getPokerLiteHandPileId(player.id);
            const nextState = moveTopCardBetweenPiles(piles, POKER_LITE_STOCK_PILE_ID, toPileId);
            piles = nextState.piles;
            if (nextState.card) {
                effects.push(
                    createDealCardEffect({
                        card: nextState.card,
                        fromPileId: POKER_LITE_STOCK_PILE_ID,
                        toPileId,
                        toOwnerId: player.id,
                        toIndex: cardIndex,
                        isFaceUp: true,
                        keyPrefix: 'deal-' + String(cardIndex) + '-' + player.id,
                    }),
                );
            }
        });
    }

    return {
        state: {
            ...context,
            piles,
            turnIndex: 0,
            round: 1,
            playedCardHistory: [],
            roundCards: [],
            lastPlayedCard: null,
            selectedCardId: null,
            winningPlayerIds: [],
            statusText:
                'Dealing ' +
                context.cardsPerPlayer +
                ' cards to each player from the ' +
                context.deckDefinition.name +
                '.',
        },
        effects,
    };
}
