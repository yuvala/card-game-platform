import { createDeck, shuffleDeck } from "../../engine/cards/createDeck";
import type { DeckDefinition } from "../../engine/cards/types";
import type { RewriteGameContext, RewritePlayer } from "./types";

function createPlayers(names: string[]): RewritePlayer[] {
    return names.map((name, index) => ({
        id: "p" + (index + 1),
        name,
        hand: [],
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
): RewriteGameContext {
    const cardsPerPlayer = resolveCardsPerPlayer(deckDefinition, playerNames.length, requestedCardsPerPlayer);

    return {
        deckDefinition,
        drawPile: [],
        discardPile: [],
        roundCards: [],
        players: createPlayers(playerNames),
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
): RewriteGameContext {
    const baseContext = createInitialContext(playerNames, deckDefinition, requestedCardsPerPlayer);

    return {
        ...baseContext,
        drawPile: shuffleDeck(createDeck(deckDefinition), random),
        statusText: "Shuffling the " + deckDefinition.name + "..."
    };
}

export function dealOpeningHands(context: RewriteGameContext): RewriteGameContext {
    const drawPile = context.drawPile.slice();
    const players = context.players.map((player) => ({
        ...player,
        hand: player.hand.slice()
    }));

    for (let cardIndex = 0; cardIndex < context.cardsPerPlayer; cardIndex += 1) {
        players.forEach((player) => {
            const card = drawPile.pop();
            if (card) {
                player.hand.push(card);
            }
        });
    }

    return {
        ...context,
        drawPile,
        players,
        turnIndex: 0,
        round: 1,
        discardPile: [],
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
