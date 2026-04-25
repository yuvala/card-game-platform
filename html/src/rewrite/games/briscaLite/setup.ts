import { createDeck, shuffleDeck } from "../../engine/cards/createDeck";
import type { DeckDefinition } from "../../engine/cards/types";
import { createConfiguredPiles } from "../../engine/game/config";
import {
    getPileCards,
    moveTopCardBetweenPiles,
    setPileCards
} from "../../engine/game/piles";
import { briscaLiteConfig } from "./config";
import type { BriscaLiteContext, BriscaLitePlayer } from "./types";
import {
    BRISCA_LITE_STOCK_PILE_ID,
    BRISCA_LITE_TRICK_PILE_ID,
    BRISCA_LITE_TRUMP_PILE_ID,
    getBriscaLiteHandPileId
} from "./types";

function createPlayers(names: string[]): BriscaLitePlayer[] {
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
    const supportedCardsPerPlayer = Math.floor(totalCards / Math.max(playerCount, 1));

    return Math.max(1, Math.min(briscaLiteConfig.openingHandSize, requestedCardsPerPlayer, supportedCardsPerPlayer));
}

export function syncBriscaLiteContextFromPiles(context: BriscaLiteContext): BriscaLiteContext {
    const trumpCards = getPileCards(context.piles, BRISCA_LITE_TRUMP_PILE_ID);
    const trumpCard = trumpCards[trumpCards.length - 1] ?? null;

    return {
        ...context,
        trumpCard,
        trumpSuitId: trumpCard?.suitId ?? null
    };
}

export function createInitialContext(
    playerNames: string[],
    deckDefinition: DeckDefinition,
    requestedCardsPerPlayer: number = briscaLiteConfig.openingHandSize
): BriscaLiteContext {
    const players = createPlayers(playerNames);
    const cardsPerPlayer = resolveCardsPerPlayer(deckDefinition, players.length, requestedCardsPerPlayer);
    const totalCards = deckDefinition.suits.length * deckDefinition.ranks.length;

    return {
        deckDefinition,
        playedCardHistory: [],
        piles: createConfiguredPiles(briscaLiteConfig, players),
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
    requestedCardsPerPlayer: number = briscaLiteConfig.openingHandSize,
    random: () => number = Math.random
): BriscaLiteContext {
    const baseContext = createInitialContext(playerNames, deckDefinition, requestedCardsPerPlayer);
    const shuffledDeck = shuffleDeck(createDeck(deckDefinition), random);

    return syncBriscaLiteContextFromPiles({
        ...baseContext,
        piles: setPileCards(baseContext.piles, BRISCA_LITE_STOCK_PILE_ID, shuffledDeck),
        statusText: "Shuffling the " + deckDefinition.name + " for Brisca-lite..."
    });
}

export function dealOpeningHands(context: BriscaLiteContext): BriscaLiteContext {
    let piles = context.piles;

    for (let cardIndex = 0; cardIndex < context.cardsPerPlayer; cardIndex += 1) {
        context.players.forEach((player) => {
            const nextState = moveTopCardBetweenPiles(
                piles,
                BRISCA_LITE_STOCK_PILE_ID,
                getBriscaLiteHandPileId(player.id)
            );
            piles = nextState.piles;
        });
    }

    const trumpDraw = moveTopCardBetweenPiles(
        piles,
        BRISCA_LITE_STOCK_PILE_ID,
        BRISCA_LITE_TRUMP_PILE_ID
    );
    piles = trumpDraw.piles;
    const leadPlayerId = context.players[0]?.id ?? null;

    return syncBriscaLiteContextFromPiles({
        ...context,
        piles,
        turnIndex: 0,
        round: 1,
        playedCardHistory: [],
        roundCards: [],
        lastPlayedCard: null,
        selectedCardId: null,
        winningPlayerIds: [],
        leadPlayerId,
        trickWinnerId: null,
        statusText: trumpDraw.card
            ? context.players[0].name + " leads. Trump is " + trumpDraw.card.displayLabel + "."
            : context.players[0].name + " leads the first trick."
    });
}
