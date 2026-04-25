import type { CardInstance } from "../../engine/cards/types";
import type {
    CardGameEvent,
    CardGameOptions,
    CardGamePlayer,
    CardGameSession
} from "../../engine/game/types";

export type PokerLitePlayer = CardGamePlayer<CardInstance> & {
    score: number;
};

export const POKER_LITE_STOCK_PILE_ID = "stock";
export const POKER_LITE_DISCARD_PILE_ID = "discard";
export const POKER_LITE_HAND_PILE_PREFIX = "hand:";

export function getPokerLiteHandPileId(playerId: string): string {
    return POKER_LITE_HAND_PILE_PREFIX + playerId;
}

export interface PokerLitePlayedCard {
    id: string;
    card: CardInstance;
    playerId: string;
    playerName: string;
    round: number;
}

export interface PokerLiteContext
    extends CardGameSession<CardInstance, PokerLitePlayer, PokerLitePlayedCard> {
    roundCards: PokerLitePlayedCard[];
}

export type PokerLiteOptions = CardGameOptions;

export type PokerLiteEvent = CardGameEvent;

export interface PokerLiteViewSnapshot {
    value: string;
    context: PokerLiteContext;
    matches(stateValue: string): boolean;
}
