import type { CardInstance } from '../../engine/cards/types';
import type {
    CardGameEvent,
    CardGameOptions,
    CardGamePlayer,
    CardGameSession,
} from '../../engine/game/types';

export type ScopaPlayer = CardGamePlayer<CardInstance> & {
    score: number;
    scopaCount: number;
};

export const SCOPA_TABLE_PILE_ID = 'scopa-table';
export const SCOPA_STOCK_PILE_ID = 'scopa-stock';
export const SCOPA_HAND_PILE_PREFIX = 'scopa-hand:';
export const SCOPA_CAPTURE_PILE_PREFIX = 'scopa-capture:';

export function getScopaHandPileId(playerId: string): string {
    return SCOPA_HAND_PILE_PREFIX + playerId;
}

export function getScopaCapturePileId(playerId: string): string {
    return SCOPA_CAPTURE_PILE_PREFIX + playerId;
}

export interface ScopaContext
    extends CardGameSession<CardInstance, ScopaPlayer, null> {
    currentPlayerIndex: number;
    phase: 'playing' | 'roundOver' | 'gameOver';
    lastCapturePlayerId: string | null;
}

export type ScopaOptions = CardGameOptions;

export type ScopaEvent = CardGameEvent;

export interface ScopaViewSnapshot {
    value: string;
    context: ScopaContext;
    matches(stateValue: string): boolean;
}
