import type { DeckDefinition } from "../cards/types";

export interface CardGameDefinition {
    id: string;
    name: string;
}

export interface CardGamePlayer<TCard> {
    id: string;
    name: string;
    hand: TCard[];
}

export interface CardGameTurn<TPlayedCard> {
    turnIndex: number;
    round: number;
    maxRounds: number;
    selectedCardId: string | null;
    lastPlayedCard: TPlayedCard | null;
    winningPlayerIds: string[];
}

export interface CardGameSession<
    TCard,
    TPlayer extends CardGamePlayer<TCard>,
    TPlayedCard
> extends CardGameTurn<TPlayedCard> {
    deckDefinition: DeckDefinition;
    drawPile: TCard[];
    discardPile: TPlayedCard[];
    players: TPlayer[];
    cardsPerPlayer: number;
    statusText: string;
}

export interface CardGameOptions {
    deckDefinition: DeckDefinition;
    cardsPerPlayer?: number;
    random?: () => number;
}

export type CardGameEvent =
    | { type: "START" }
    | { type: "SELECT_CARD"; cardId: string }
    | { type: "PLAY_CARD" }
    | { type: "ANIMATION_DONE" }
    | { type: "RESTART" };
