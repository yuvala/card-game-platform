import { createDeck, shuffleDeck } from "../../engine/cards/createDeck";
import type { DeckDefinition } from "../../engine/cards/types";
import type { BriscaLiteContext, BriscaLitePlayer } from "./types";

const DEFAULT_CARDS_PER_PLAYER = 3;

function createPlayers(names: string[]): BriscaLitePlayer[] {
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
    const supportedCardsPerPlayer = Math.floor(totalCards / Math.max(playerCount, 1));

    return Math.max(1, Math.min(DEFAULT_CARDS_PER_PLAYER, requestedCardsPerPlayer, supportedCardsPerPlayer));
}

export function createInitialContext(
    playerNames: string[],
    deckDefinition: DeckDefinition,
    requestedCardsPerPlayer: number = DEFAULT_CARDS_PER_PLAYER
): BriscaLiteContext {
    const players = createPlayers(playerNames);
    const cardsPerPlayer = resolveCardsPerPlayer(deckDefinition, players.length, requestedCardsPerPlayer);
    const totalCards = deckDefinition.suits.length * deckDefinition.ranks.length;

    return {
        deckDefinition,
        drawPile: [],
        discardPile: [],
        roundCards: [],
        players,
        turnIndex: 0,
        round: 1,
        maxRounds: Math.floor(totalCards / Math.max(players.length, 1)),
        cardsPerPlayer,
        statusText:
            "Press Start Game to deal Brisca-lite from the " +
            deckDefinition.name +
            ". The winner of each trick draws first.",
        lastPlayedCard: null,
        selectedCardId: null,
        winningPlayerIds: [],
        trumpCard: null,
        trumpSuitId: null,
        leadPlayerId: players[0]?.id ?? null,
        trickWinnerId: null
    };
}

export function createShuffledContext(
    playerNames: string[],
    deckDefinition: DeckDefinition,
    requestedCardsPerPlayer: number = DEFAULT_CARDS_PER_PLAYER,
    random: () => number = Math.random
): BriscaLiteContext {
    const baseContext = createInitialContext(playerNames, deckDefinition, requestedCardsPerPlayer);

    return {
        ...baseContext,
        drawPile: shuffleDeck(createDeck(deckDefinition), random),
        statusText: "Shuffling the " + deckDefinition.name + " for Brisca-lite..."
    };
}

export function dealOpeningHands(context: BriscaLiteContext): BriscaLiteContext {
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

    const trumpCard = drawPile.pop() ?? null;
    const leadPlayerId = players[0]?.id ?? null;

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
        trumpCard,
        trumpSuitId: trumpCard?.suitId ?? null,
        leadPlayerId,
        trickWinnerId: null,
        statusText: trumpCard
            ? players[0].name + " leads. Trump is " + trumpCard.displayLabel + "."
            : players[0].name + " leads the first trick."
    };
}
