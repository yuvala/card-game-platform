import type { CardInstance } from "../cards/types";

export type CardGameEffectReason = "deal" | "play" | "draw" | "collect";

export interface MoveCardEffect {
    type: "move-card";
    key: string;
    reason: CardGameEffectReason;
    card: {
        id: string;
        label: string;
        isFaceUp: boolean;
    };
    fromPileId: string;
    fromOwnerId?: string;
    fromIndex?: number;
    toPileId: string;
    toOwnerId?: string;
    toIndex?: number;
}

export type CardGameEffect = MoveCardEffect;

export function createMoveCardEffect(input: {
    reason: CardGameEffectReason;
    card: CardInstance;
    fromPileId: string;
    fromOwnerId?: string;
    fromIndex?: number;
    toPileId: string;
    toOwnerId?: string;
    toIndex?: number;
    isFaceUp?: boolean;
    keyPrefix?: string;
}): MoveCardEffect {
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
        toPileId: input.toPileId,
        toOwnerId: input.toOwnerId,
        toIndex: input.toIndex
    };
}
