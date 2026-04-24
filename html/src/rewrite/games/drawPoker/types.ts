import type { CardInstance, DeckDefinition } from "../../engine/cards/types";

export interface RewritePlayer {
    id: string;
    name: string;
    hand: CardInstance[];
    score: number;
}

export interface RewritePlayedCard {
    id: string;
    card: CardInstance;
    playerId: string;
    playerName: string;
    round: number;
}

export interface RewriteGameContext {
    deckDefinition: DeckDefinition;
    drawPile: CardInstance[];
    discardPile: RewritePlayedCard[];
    roundCards: RewritePlayedCard[];
    players: RewritePlayer[];
    turnIndex: number;
    round: number;
    maxRounds: number;
    cardsPerPlayer: number;
    statusText: string;
    lastPlayedCard: RewritePlayedCard | null;
    selectedCardId: string | null;
    winningPlayerIds: string[];
}

export interface RewriteGameOptions {
    deckDefinition: DeckDefinition;
    cardsPerPlayer?: number;
    random?: () => number;
}

export type RewriteGameEvent =
    | { type: "START" }
    | { type: "SELECT_CARD"; cardId: string }
    | { type: "PLAY_CARD" }
    | { type: "ANIMATION_DONE" }
    | { type: "RESTART" };
