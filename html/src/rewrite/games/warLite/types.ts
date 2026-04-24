import type { CardInstance } from "../../engine/cards/types";
import type {
    CardGameEvent,
    CardGameOptions,
    CardGamePlayer,
    CardGameSession
} from "../../engine/game/types";

export type WarLitePlayer = CardGamePlayer<CardInstance> & {
    score: number;
};

export interface WarLitePlayedCard {
    id: string;
    card: CardInstance;
    playerId: string;
    playerName: string;
    round: number;
}

export interface WarLiteContext
    extends CardGameSession<CardInstance, WarLitePlayer, WarLitePlayedCard> {
    roundCards: WarLitePlayedCard[];
}

export type WarLiteOptions = CardGameOptions;

export type WarLiteEvent = CardGameEvent;

export interface WarLiteViewSnapshot {
    value: string;
    context: WarLiteContext;
    matches(stateValue: string): boolean;
}
