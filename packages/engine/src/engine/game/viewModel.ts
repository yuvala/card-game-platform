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
    stackBadgeLabel?: string;
}

export type CardGameViewHandPresentation =
    | "hand-fan"
    | "hidden-stack";

export interface CardGameViewPlayerDeckPile {
    cardCount: number;
    topCard: CardGameViewCard | null;
}

export interface CardGameViewPlayer {
    id: string;
    iconLabel: string;
    nameLabel: string;
    metaLabel: string;
    hand: CardGameViewCard[];
    handPresentation?: CardGameViewHandPresentation;
    deckPile?: CardGameViewPlayerDeckPile;
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

export interface CardGameViewOutcome {
    title: string;
    detail: string;
    winnerPlayerIds: string[];
}

export type CardGameViewActionTarget =
    | { type: "table" }
    | { type: "player-hand"; playerId: string }
    | { type: "pile"; pileId: string };

export interface CardGameViewPrimaryAction {
    label: string;
    hint: string;
    eventType: CardGameEvent["type"];
    target?: CardGameViewActionTarget;
}

export interface CardGameViewAnimation {
    key: string;
    playerId: string;
    cardId: string;
}

export interface CardGameViewTableCard extends CardGameViewCard {
    playerId?: string;
    caption?: string;
    sourceCardIds?: string[];
}

export type CardGameViewTablePresentation =
    | "table-row"
    | "trick-seats";

export type CardGameViewPilePresentation =
    | "hidden-stack"
    | "face-up-stack"
    | "capture-pile"
    | "single-card";

export interface CardGameViewPile {
    id: string;
    role: string;
    label: string;
    ownerId?: string;
    cardCount: number;
    countLabel: string;
    topCard: CardGameViewCard | null;
    presentation?: CardGameViewPilePresentation;
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
    tablePresentation?: CardGameViewTablePresentation;
    tablePileIds?: string[];
    piles: CardGameViewPile[];
    controls: CardGameViewControls;
    outcome: CardGameViewOutcome | null;
    primaryAction: CardGameViewPrimaryAction | null;
    animation: CardGameViewAnimation | null;
    effects: CardGameEffect[];
}

export type CardGameViewModelFactory<TSnapshot> = (
    snapshot: TSnapshot,
    viewerId?: string | null
) => CardGameViewModel;
