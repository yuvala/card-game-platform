import { createDeck, shuffleDeck } from "../../engine/cards/createDeck";
import type { CardInstance, DeckDefinition } from "../../engine/cards/types";
import type { CardPileMap } from "../../engine/game/types";
import {
    createCardPile,
    drawTopCardFromPile,
    getPileCards,
    setPileCards
} from "../../engine/game/piles";
import type { WarLiteContext, WarLitePlayer } from "./types";
import {
    WAR_LITE_BATTLE_PILE_ID,
    WAR_LITE_DISCARD_PILE_ID,
    WAR_LITE_STOCK_PILE_ID,
    getWarLiteHandPileId
} from "./types";

function createPlayers(names: string[]): WarLitePlayer[] {
    return names.slice(0, 2).map((name, index) => ({
        id: "p" + (index + 1),
        name,
        score: 0
    }));
}

function resolveCardsPerPlayer(deckDefinition: DeckDefinition, playerCount: number): number {
    const totalCards = deckDefinition.suits.length * deckDefinition.ranks.length;
    return Math.max(1, Math.floor(totalCards / Math.max(playerCount, 1)));
}

function createInitialPiles(players: readonly WarLitePlayer[]): CardPileMap<CardInstance> {
    const piles: CardPileMap<CardInstance> = {
        [WAR_LITE_STOCK_PILE_ID]: createCardPile<CardInstance>({
            id: WAR_LITE_STOCK_PILE_ID,
            role: "stock",
            label: "Stock",
            isFaceUp: false,
            isVisibleToAll: false
        }),
        [WAR_LITE_BATTLE_PILE_ID]: createCardPile<CardInstance>({
            id: WAR_LITE_BATTLE_PILE_ID,
            role: "table",
            label: "Battle",
            isFaceUp: true,
            isVisibleToAll: true
        }),
        [WAR_LITE_DISCARD_PILE_ID]: createCardPile<CardInstance>({
            id: WAR_LITE_DISCARD_PILE_ID,
            role: "discard",
            label: "Battle Log",
            isFaceUp: true,
            isVisibleToAll: true
        })
    };

    return players.reduce<CardPileMap<CardInstance>>((nextPiles, player) => {
        return {
            ...nextPiles,
            [getWarLiteHandPileId(player.id)]: createCardPile<CardInstance>({
                id: getWarLiteHandPileId(player.id),
                role: "hand",
                ownerId: player.id,
                label: player.name + " Stack",
                isFaceUp: false,
                isVisibleToAll: false
            })
        };
    }, piles);
}

export function createInitialContext(
    playerNames: string[],
    deckDefinition: DeckDefinition
): WarLiteContext {
    const players = createPlayers(playerNames);
    const cardsPerPlayer = resolveCardsPerPlayer(deckDefinition, players.length || 2);

    return {
        deckDefinition,
        playedCardHistory: [],
        piles: createInitialPiles(players),
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
    const shuffledDeck = shuffleDeck(createDeck(deckDefinition), random).reverse();

    return {
        ...baseContext,
        piles: setPileCards(baseContext.piles, WAR_LITE_STOCK_PILE_ID, shuffledDeck),
        statusText: "Shuffling the " + deckDefinition.name + " for War Lite..."
    };
}

export function dealOpeningHands(context: WarLiteContext): WarLiteContext {
    let piles = context.piles;
    let dealingIndex = 0;

    while (getPileCards(piles, WAR_LITE_STOCK_PILE_ID).length > 0) {
        const player = context.players[dealingIndex % context.players.length];
        if (!player) {
            break;
        }

        const drawResult = drawTopCardFromPile(piles, WAR_LITE_STOCK_PILE_ID);
        if (!drawResult.card) {
            break;
        }

        piles = setPileCards(drawResult.piles, getWarLiteHandPileId(player.id), [
            drawResult.card,
            ...getPileCards(drawResult.piles, getWarLiteHandPileId(player.id))
        ]);
        dealingIndex += 1;
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
            "The " +
            context.deckDefinition.name +
            " is split. Press Play Card to reveal the first battle."
    };
}
