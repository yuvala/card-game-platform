import type { CardInstance } from "../cards/types";

export type CardGameEffectReason = "deal" | "play" | "draw" | "collect";

export type CardGameEffectType =
    | "move-card"
    | "shuffle-deck"
    | "flip-card"
    | "discard-card"
    | "sort-hand"
    | "highlight-playable"
    | "invalid-move";

interface BaseCardGameEffect<TType extends CardGameEffectType> {
    type: TType;
    key: string;
    delayMs?: number;
}

export interface MoveCardEffect {
    type: "move-card";
    key: string;
    delayMs?: number;
    reason: CardGameEffectReason;
    card: {
        id: string;
        label: string;
        isFaceUp: boolean;
    };
    fromPileId: string;
    fromOwnerId?: string;
    fromIndex?: number;
    fromPileCardCount?: number;
    fromFaceUp?: boolean;
    toPileId: string;
    toOwnerId?: string;
    toIndex?: number;
}

export interface ShuffleDeckEffect extends BaseCardGameEffect<"shuffle-deck"> {
    pileId: string;
}

export interface FlipCardEffect extends BaseCardGameEffect<"flip-card"> {
    cardId: string;
    faceUp: boolean;
    pileId?: string;
    ownerId?: string;
}

export interface DiscardCardEffect extends BaseCardGameEffect<"discard-card"> {
    cardId: string;
    fromPileId: string;
    toPileId: string;
}

export interface SortHandEffect extends BaseCardGameEffect<"sort-hand"> {
    ownerId: string;
    cardIds: string[];
}

export interface HighlightPlayableEffect extends BaseCardGameEffect<"highlight-playable"> {
    ownerId: string;
    cardIds: string[];
}

export interface InvalidMoveEffect extends BaseCardGameEffect<"invalid-move"> {
    cardId?: string;
    ownerId?: string;
    pileId?: string;
}

export type CardGameEffect =
    | MoveCardEffect
    | ShuffleDeckEffect
    | FlipCardEffect
    | DiscardCardEffect
    | SortHandEffect
    | HighlightPlayableEffect
    | InvalidMoveEffect;

type MoveCardEffectInput = {
    reason: CardGameEffectReason;
    card: CardInstance;
    fromPileId: string;
    fromOwnerId?: string;
    fromIndex?: number;
    fromPileCardCount?: number;
    fromFaceUp?: boolean;
    toPileId: string;
    toOwnerId?: string;
    toIndex?: number;
    isFaceUp?: boolean;
    keyPrefix?: string;
};

type SpecificMoveCardEffectInput = Omit<MoveCardEffectInput, "reason">;

export function createMoveCardEffect(input: MoveCardEffectInput): MoveCardEffect {
    return {
        type: "move-card",
        key: [
            input.keyPrefix ?? input.reason,
            input.card.id,
            input.fromPileId,
            input.toPileId,
            String(input.toIndex ?? "")
        ].join(":"),
        reason: input.reason,
        card: {
            id: input.card.id,
            label: input.card.displayLabel,
            isFaceUp: input.isFaceUp ?? false
        },
        fromPileId: input.fromPileId,
        fromOwnerId: input.fromOwnerId,
        fromIndex: input.fromIndex,
        fromPileCardCount: input.fromPileCardCount,
        fromFaceUp: input.fromFaceUp,
        toPileId: input.toPileId,
        toOwnerId: input.toOwnerId,
        toIndex: input.toIndex
    };
}

export function createDealCardEffect(input: SpecificMoveCardEffectInput): MoveCardEffect {
    return createMoveCardEffect({
        ...input,
        reason: "deal"
    });
}

export function createDrawCardEffect(input: SpecificMoveCardEffectInput): MoveCardEffect {
    return createMoveCardEffect({
        ...input,
        reason: "draw"
    });
}

export function createPlayCardEffect(input: SpecificMoveCardEffectInput): MoveCardEffect {
    return createMoveCardEffect({
        ...input,
        reason: "play"
    });
}

export function createCollectCardEffect(input: SpecificMoveCardEffectInput): MoveCardEffect {
    return createMoveCardEffect({
        ...input,
        reason: "collect"
    });
}
