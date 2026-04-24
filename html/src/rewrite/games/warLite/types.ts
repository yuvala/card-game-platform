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

export const WAR_LITE_STOCK_PILE_ID = "stock";
export const WAR_LITE_BATTLE_PILE_ID = "battle";
export const WAR_LITE_DISCARD_PILE_ID = "discard";
export const WAR_LITE_HAND_PILE_PREFIX = "stack:";

export function getWarLiteHandPileId(playerId: string): string {
    return WAR_LITE_HAND_PILE_PREFIX + playerId;
}

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
