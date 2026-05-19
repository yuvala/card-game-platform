import type { DeckDefinition } from '../cards/types';
import type { CardGameEffect } from './effects';

export interface CardGameDefinition {
    id: string;
    name: string;
}

export type CardPileRole = 'stock' | 'discard' | 'hand' | 'table' | 'capture' | 'trump' | 'custom';

export interface CardPile<TCard> {
    id: string;
    role: CardPileRole;
    label: string;
    ownerId?: string;
    cards: TCard[];
    isFaceUp: boolean;
    isVisibleToAll: boolean;
}

export type CardPileMap<TCard> = Record<string, CardPile<TCard>>;

export interface CardGamePlayer<TCard> {
    id: string;
    name: string;
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
    TPlayedCard,
> extends CardGameTurn<TPlayedCard> {
    deckDefinition: DeckDefinition;
    lastEffects: CardGameEffect[];
    playedCardHistory: TPlayedCard[];
    piles: CardPileMap<TCard>;
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
    | { type: 'START' }
    | { type: 'SELECT_CARD'; cardId: string }
    | { type: 'PLAY_CARD' }
    | { type: 'ANIMATION_DONE' }
    | { type: 'RESTART' };
