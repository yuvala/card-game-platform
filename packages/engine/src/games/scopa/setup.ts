import { createDeck, shuffleDeck } from '../../engine/cards/createDeck';
import type { DeckDefinition } from '../../engine/cards/types';
import { createConfiguredPiles } from '../../engine/game/config';
import { createDealCardEffect, type CardGameEffect } from '../../engine/game/effects';
import { getPileCards, moveTopCardBetweenPiles, setPileCards } from '../../engine/game/piles';
import { scopaConfig } from './config';
import type { ScopaContext, ScopaPlayer } from './types';
import {
    SCOPA_STOCK_PILE_ID,
    SCOPA_TABLE_PILE_ID,
    getScopaHandPileId,
} from './types';

const SCOPA_INITIAL_TABLE_CARDS = 4;

function createPlayers(names: string[]): ScopaPlayer[] {
    return names.map((name, index) => ({
        id: 'p' + (index + 1),
        name,
        score: 0,
        scopaCount: 0,
    }));
}

export function createInitialContext(
    playerNames: string[],
    deckDefinition: DeckDefinition,
): ScopaContext {
    const players = createPlayers(playerNames);

    return {
        deckDefinition,
        lastEffects: [],
        piles: createConfiguredPiles(scopaConfig, players),
        players,
        currentPlayerIndex: 0,
        turnIndex: 0,
        round: 1,
        maxRounds: 1,
        cardsPerPlayer: scopaConfig.openingHandSize,
        phase: 'playing',
        lastCapturePlayerId: null,
        statusText: 'Press Start Game to deal Scopa.',
        lastPlayedCard: null,
        selectedCardId: null,
        winningPlayerIds: [],
    };
}

export function createShuffledContext(
    playerNames: string[],
    deckDefinition: DeckDefinition,
    random: () => number = Math.random,
): ScopaContext {
    const baseContext = createInitialContext(playerNames, deckDefinition);
    const shuffledDeck = shuffleDeck(createDeck(deckDefinition), random);

    return {
        ...baseContext,
        piles: setPileCards(baseContext.piles, SCOPA_STOCK_PILE_ID, shuffledDeck),
        lastEffects: [],
        statusText: 'Shuffling for Scopa...',
    };
}

export function dealOpeningHands(context: ScopaContext): {
    state: ScopaContext;
    effects: CardGameEffect[];
} {
    let piles = context.piles;
    const effects: CardGameEffect[] = [];

    // Deal 4 cards face-up to the table
    for (let cardIndex = 0; cardIndex < SCOPA_INITIAL_TABLE_CARDS; cardIndex += 1) {
        const nextState = moveTopCardBetweenPiles(piles, SCOPA_STOCK_PILE_ID, SCOPA_TABLE_PILE_ID);
        piles = nextState.piles;
        if (nextState.card) {
            effects.push(
                createDealCardEffect({
                    card: nextState.card,
                    fromPileId: SCOPA_STOCK_PILE_ID,
                    toPileId: SCOPA_TABLE_PILE_ID,
                    toIndex: cardIndex,
                    isFaceUp: true,
                    keyPrefix: 'deal-table-' + String(cardIndex),
                }),
            );
        }
    }

    // Deal 3 cards to each player
    for (let cardIndex = 0; cardIndex < scopaConfig.openingHandSize; cardIndex += 1) {
        context.players.forEach((player) => {
            const toPileId = getScopaHandPileId(player.id);
            const nextState = moveTopCardBetweenPiles(piles, SCOPA_STOCK_PILE_ID, toPileId);
            piles = nextState.piles;
            if (nextState.card) {
                effects.push(
                    createDealCardEffect({
                        card: nextState.card,
                        fromPileId: SCOPA_STOCK_PILE_ID,
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

    const firstPlayer = context.players[0];

    return {
        state: {
            ...context,
            piles,
            currentPlayerIndex: 0,
            turnIndex: 0,
            round: 1,
            lastPlayedCard: null,
            selectedCardId: null,
            winningPlayerIds: [],
            lastCapturePlayerId: null,
            phase: 'playing',
            statusText: firstPlayer ? firstPlayer.name + ' plays first.' : 'Game ready.',
        },
        effects,
    };
}

export function dealRefillHands(context: ScopaContext): {
    state: ScopaContext;
    effects: CardGameEffect[];
} {
    let piles = context.piles;
    const effects: CardGameEffect[] = [];
    const stockCards = getPileCards(piles, SCOPA_STOCK_PILE_ID);

    if (stockCards.length === 0) {
        return { state: context, effects };
    }

    for (let cardIndex = 0; cardIndex < scopaConfig.openingHandSize; cardIndex += 1) {
        context.players.forEach((player) => {
            const toPileId = getScopaHandPileId(player.id);
            const currentHandCount = getPileCards(piles, toPileId).length;
            const nextState = moveTopCardBetweenPiles(piles, SCOPA_STOCK_PILE_ID, toPileId);
            piles = nextState.piles;
            if (nextState.card) {
                effects.push(
                    createDealCardEffect({
                        card: nextState.card,
                        fromPileId: SCOPA_STOCK_PILE_ID,
                        toPileId,
                        toOwnerId: player.id,
                        toIndex: currentHandCount + cardIndex,
                        isFaceUp: true,
                        keyPrefix:
                            'refill-' +
                            String(context.round) +
                            '-' +
                            String(cardIndex) +
                            '-' +
                            player.id,
                    }),
                );
            }
        });
    }

    return {
        state: {
            ...context,
            piles,
        },
        effects,
    };
}
