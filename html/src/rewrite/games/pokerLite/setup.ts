import { createDeck, shuffleDeck } from "../../engine/cards/createDeck";
import type { DeckDefinition } from "../../engine/cards/types";
import { createConfiguredPiles } from "../../engine/game/config";
import {
    moveTopCardBetweenPiles,
    setPileCards
} from "../../engine/game/piles";
import { pokerLiteConfig } from "./config";
import {
    POKER_LITE_STOCK_PILE_ID,
    getPokerLiteHandPileId,
    type PokerLiteContext,
    type PokerLitePlayer
} from "./types";

function createPlayers(names: string[]): PokerLitePlayer[] {
    return names.map((name, index) => ({
        id: "p" + (index + 1),
        name,
        score: 0
    }));
}

function resolveCardsPerPlayer(
    deckDefinition: DeckDefinition,
    playerCount: number,
    requestedCardsPerPlayer: number
): number {
    const totalCards = deckDefinition.suits.length * deckDefinition.ranks.length;
    const supportedCardsPerPlayer = Math.floor(totalCards / playerCount);

    return Math.max(1, Math.min(requestedCardsPerPlayer, supportedCardsPerPlayer));
}

export function createInitialContext(
    playerNames: string[],
    deckDefinition: DeckDefinition,
    requestedCardsPerPlayer: number = 5
): PokerLiteContext {
    const players = createPlayers(playerNames);
    const cardsPerPlayer = resolveCardsPerPlayer(deckDefinition, playerNames.length, requestedCardsPerPlayer);

    return {
        deckDefinition,
        playedCardHistory: [],
        piles: createConfiguredPiles(pokerLiteConfig, players),
        roundCards: [],
        players,
        turnIndex: 0,
        round: 1,
        maxRounds: cardsPerPlayer,
        cardsPerPlayer,
        statusText:
            "Press Start Rewrite to deal from the " +
            deckDefinition.name +
            ". Try ?deck=spanish or ?deck=italian.",
        lastPlayedCard: null,
        selectedCardId: null,
        winningPlayerIds: []
    };
}

export function createShuffledContext(
    playerNames: string[],
    deckDefinition: DeckDefinition,
    requestedCardsPerPlayer: number = 5,
    random: () => number = Math.random
): PokerLiteContext {
    const baseContext = createInitialContext(playerNames, deckDefinition, requestedCardsPerPlayer);

    return {
        ...baseContext,
        piles: setPileCards(baseContext.piles, POKER_LITE_STOCK_PILE_ID, shuffleDeck(createDeck(deckDefinition), random)),
        statusText: "Shuffling the " + deckDefinition.name + "..."
    };
}

export function dealOpeningHands(context: PokerLiteContext): PokerLiteContext {
    let piles = context.piles;

    for (let cardIndex = 0; cardIndex < context.cardsPerPlayer; cardIndex += 1) {
        context.players.forEach((player) => {
            const nextState = moveTopCardBetweenPiles(
                piles,
                POKER_LITE_STOCK_PILE_ID,
                getPokerLiteHandPileId(player.id)
            );
            piles = nextState.piles;
        });
    }

    return {
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
            "Dealing " +
            context.cardsPerPlayer +
            " cards to each player from the " +
            context.deckDefinition.name +
            "."
    };
}
