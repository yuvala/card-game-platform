import type { CardGameEvent } from "./types";
import type { CardGameEffect } from "./effects";

export interface CardGameActor<TSnapshot> {
    getSnapshot(): TSnapshot;
    subscribe(listener: (snapshot: TSnapshot) => void): { unsubscribe(): void };
    send(event: CardGameEvent): void;
}

export interface CardGameViewCard {
    id: string;
    label: string;
    isFaceUp: boolean;
    stackCount?: number;
}

export interface CardGameViewPlayer {
    id: string;
    iconLabel: string;
    nameLabel: string;
    metaLabel: string;
    hand: CardGameViewCard[];
    isCurrentTurn: boolean;
    isRoundWinner: boolean;
    canInteract: boolean;
    cardClickAction?: "select" | "play";
}

export interface CardGameViewControls {
    canStart: boolean;
    canPlay: boolean;
    canRestart: boolean;
}

export interface CardGameViewAnimation {
    key: string;
    playerId: string;
    cardId: string;
}

export interface CardGameViewTableCard extends CardGameViewCard {
    playerId?: string;
    caption?: string;
}

export interface CardGameViewPile {
    id: string;
    role: string;
    label: string;
    ownerId?: string;
    cardCount: number;
    countLabel: string;
    topCard: CardGameViewCard | null;
}

export interface CardGameViewModel {
    phaseLabel: string;
    roundLabel: string;
    deckId: string;
    cardSkinId: string;
    deckLabel: string;
    drawPileLabel: string;
    discardPileLabel: string;
    discardCardLabel: string | null;
    scoreLines: string[];
    statusText: string;
    selectedCardId: string | null;
    players: CardGameViewPlayer[];
    tableCards: CardGameViewTableCard[];
    piles: CardGameViewPile[];
    controls: CardGameViewControls;
    animation: CardGameViewAnimation | null;
    effects: CardGameEffect[];
}

export type CardGameViewModelFactory<TSnapshot> = (snapshot: TSnapshot) => CardGameViewModel;
