import type { CardInstance } from "../../engine/cards/types";
import type {
    CardGameEvent,
    CardGameOptions,
    CardGamePlayer,
    CardGameSession
} from "../../engine/game/types";

export type BriscaLitePlayer = CardGamePlayer<CardInstance> & {
    score: number;
};

export interface BriscaLitePlayedCard {
    id: string;
    card: CardInstance;
    playerId: string;
    playerName: string;
    round: number;
}

export interface BriscaLiteContext
    extends CardGameSession<CardInstance, BriscaLitePlayer, BriscaLitePlayedCard> {
    roundCards: BriscaLitePlayedCard[];
    trumpCard: CardInstance | null;
    trumpSuitId: string | null;
    leadPlayerId: string | null;
    trickWinnerId: string | null;
}

export type BriscaLiteOptions = CardGameOptions;

export type BriscaLiteEvent = CardGameEvent;

export interface BriscaLiteViewSnapshot {
    value: string;
    context: BriscaLiteContext;
    matches(stateValue: string): boolean;
}
