import { createDeck, shuffleDeck } from "../../engine/cards/createDeck";
import type { DeckDefinition } from "../../engine/cards/types";
import type { WarLiteContext, WarLitePlayer } from "./types";

function createPlayers(names: string[]): WarLitePlayer[] {
    return names.slice(0, 2).map((name, index) => ({
        id: "p" + (index + 1),
        name,
        hand: [],
        score: 0
    }));
}

function resolveCardsPerPlayer(deckDefinition: DeckDefinition, playerCount: number): number {
    const totalCards = deckDefinition.suits.length * deckDefinition.ranks.length;
    return Math.max(1, Math.floor(totalCards / Math.max(playerCount, 1)));
}

export function createInitialContext(
    playerNames: string[],
    deckDefinition: DeckDefinition
): WarLiteContext {
    const players = createPlayers(playerNames);
    const cardsPerPlayer = resolveCardsPerPlayer(deckDefinition, players.length || 2);

    return {
        deckDefinition,
        drawPile: [],
        discardPile: [],
        roundCards: [],
        players,
        turnIndex: 0,
        round: 1,
        maxRounds: cardsPerPlayer,
        cardsPerPlayer,
        statusText:
            "Press Deal Cards to split the " +
            deckDefinition.name +
            " between both players. Each battle reveals the top card from each stack.",
        lastPlayedCard: null,
        selectedCardId: null,
        winningPlayerIds: []
    };
}

export function createShuffledContext(
    playerNames: string[],
    deckDefinition: DeckDefinition,
    random: () => number = Math.random
): WarLiteContext {
    const baseContext = createInitialContext(playerNames, deckDefinition);

    return {
        ...baseContext,
        drawPile: shuffleDeck(createDeck(deckDefinition), random),
        statusText: "Shuffling the " + deckDefinition.name + " for War Lite..."
    };
}

export function dealOpeningHands(context: WarLiteContext): WarLiteContext {
    const drawPile = context.drawPile.slice();
    const players = context.players.map((player) => ({
        ...player,
        hand: [] as typeof player.hand
    }));

    let dealingIndex = 0;
    while (drawPile.length > 0) {
        const card = drawPile.shift();
        if (!card) {
            break;
        }

        const player = players[dealingIndex % players.length];
        if (player) {
            player.hand.push(card);
        }
        dealingIndex += 1;
    }

    return {
        ...context,
        drawPile: [],
        players,
        turnIndex: 0,
        round: 1,
        discardPile: [],
        roundCards: [],
        lastPlayedCard: null,
        selectedCardId: null,
        winningPlayerIds: [],
        statusText:
            "The " +
            context.deckDefinition.name +
            " is split. Press Play Card to reveal the first battle."
    };
}
