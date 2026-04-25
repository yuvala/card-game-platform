import { createDeck, shuffleDeck } from "../../engine/cards/createDeck";
import type { CardInstance, DeckDefinition } from "../../engine/cards/types";
import type { CardPileMap } from "../../engine/game/types";
import {
    createCardPile,
    moveTopCardBetweenPiles,
    setPileCards
} from "../../engine/game/piles";
import type { RewriteGameContext, RewritePlayer } from "./types";
import {
    DRAW_POKER_DISCARD_PILE_ID,
    DRAW_POKER_STOCK_PILE_ID,
    getDrawPokerHandPileId
} from "./types";

function createPlayers(names: string[]): RewritePlayer[] {
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

function createInitialPiles(players: readonly RewritePlayer[]): CardPileMap<CardInstance> {
    const piles: CardPileMap<CardInstance> = {
        [DRAW_POKER_STOCK_PILE_ID]: createCardPile<CardInstance>({
            id: DRAW_POKER_STOCK_PILE_ID,
            role: "stock",
            label: "Draw Pile",
            isFaceUp: false,
            isVisibleToAll: false
        }),
        [DRAW_POKER_DISCARD_PILE_ID]: createCardPile<CardInstance>({
            id: DRAW_POKER_DISCARD_PILE_ID,
            role: "discard",
            label: "Discard",
            isFaceUp: true,
            isVisibleToAll: true
        })
    };

    return players.reduce<CardPileMap<CardInstance>>((nextPiles, player) => {
        return {
            ...nextPiles,
            [getDrawPokerHandPileId(player.id)]: createCardPile<CardInstance>({
                id: getDrawPokerHandPileId(player.id),
                role: "hand",
                ownerId: player.id,
                label: player.name + " Hand",
                isFaceUp: true,
                isVisibleToAll: true
            })
        };
    }, piles);
}

export function syncDrawPokerContextFromPiles(context: RewriteGameContext): RewriteGameContext {
    return context;
}

export function createInitialContext(
    playerNames: string[],
    deckDefinition: DeckDefinition,
    requestedCardsPerPlayer: number = 5
): RewriteGameContext {
    const players = createPlayers(playerNames);
    const cardsPerPlayer = resolveCardsPerPlayer(deckDefinition, playerNames.length, requestedCardsPerPlayer);

    return {
        deckDefinition,
        discardPile: [],
        piles: createInitialPiles(players),
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
): RewriteGameContext {
    const baseContext = createInitialContext(playerNames, deckDefinition, requestedCardsPerPlayer);

    return {
        ...baseContext,
        piles: setPileCards(baseContext.piles, DRAW_POKER_STOCK_PILE_ID, shuffleDeck(createDeck(deckDefinition), random)),
        statusText: "Shuffling the " + deckDefinition.name + "..."
    };
}

export function dealOpeningHands(context: RewriteGameContext): RewriteGameContext {
    let piles = context.piles;

    for (let cardIndex = 0; cardIndex < context.cardsPerPlayer; cardIndex += 1) {
        context.players.forEach((player) => {
            const nextState = moveTopCardBetweenPiles(
                piles,
                DRAW_POKER_STOCK_PILE_ID,
                getDrawPokerHandPileId(player.id)
            );
            piles = nextState.piles;
        });
    }

    return {
        ...context,
        piles,
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
