import type { CardInstance } from '../../engine/cards/types';
import type {
    CardGameEvent,
    CardGameOptions,
    CardGamePlayer,
    CardGameSession,
} from '../../engine/game/types';

export type BriscaLitePlayer = CardGamePlayer<CardInstance> & {
    score: number;
};

export const BRISCA_LITE_STOCK_PILE_ID = 'stock';
export const BRISCA_LITE_TRUMP_PILE_ID = 'trump';
export const BRISCA_LITE_TRICK_PILE_ID = 'trick';
export const BRISCA_LITE_HAND_PILE_PREFIX = 'hand:';
export const BRISCA_LITE_CAPTURE_PILE_PREFIX = 'capture:';

export function getBriscaLiteHandPileId(playerId: string): string {
    return BRISCA_LITE_HAND_PILE_PREFIX + playerId;
}

export function getBriscaLiteCapturePileId(playerId: string): string {
    return BRISCA_LITE_CAPTURE_PILE_PREFIX + playerId;
}

export interface BriscaLitePlayedCard {
    id: string;
    card: CardInstance;
    playerId: string;
    playerName: string;
    round: number;
}

export interface BriscaLiteContext extends CardGameSession<
    CardInstance,
    BriscaLitePlayer,
    BriscaLitePlayedCard
> {
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
