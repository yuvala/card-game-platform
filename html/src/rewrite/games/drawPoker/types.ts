import type { CardInstance } from "../../engine/cards/types";
import type {
    CardGameEvent,
    CardGameOptions,
    CardGamePlayer,
    CardGameSession
} from "../../engine/game/types";

export type RewritePlayer = CardGamePlayer<CardInstance> & {
    score: number;
};

export interface RewritePlayedCard {
    id: string;
    card: CardInstance;
    playerId: string;
    playerName: string;
    round: number;
}

export interface RewriteGameContext
    extends CardGameSession<CardInstance, RewritePlayer, RewritePlayedCard> {
    roundCards: RewritePlayedCard[];
}

export type RewriteGameOptions = CardGameOptions;

export type RewriteGameEvent = CardGameEvent;

export interface RewriteGameViewSnapshot {
    value: string;
    context: RewriteGameContext;
    matches(stateValue: string): boolean;
}
