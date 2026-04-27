import {
    HOVER_CARD_LIFT_Y,
    HOVER_CARD_SCALE,
    HOVER_CARD_SHIFT_X,
    SELECTED_CARD_LIFT_Y,
    SELECTED_CARD_SCALE,
    SELECTED_CARD_SHIFT_X
} from "./constants";
import type { HandSlotDisplayState, HandSlotOrigin } from "./types";

interface HandCardLike {
    id: string;
}

interface GetHandSlotDisplayStatesInput {
    slots: readonly HandSlotOrigin[];
    cards: readonly (HandCardLike | null)[];
    isCurrentTurn: boolean;
    canInteract: boolean;
    selectedCardId: string | null;
    hoveredSlotIndexes: ReadonlySet<number>;
    hasAnimation: boolean;
}

export function getHandSlotDisplayStates(
    input: GetHandSlotDisplayStatesInput
): HandSlotDisplayState[] {
    const {
        slots,
        cards,
        isCurrentTurn,
        canInteract,
        selectedCardId,
        hoveredSlotIndexes,
        hasAnimation
    } = input;
    const visibleCardCount = cards.filter(Boolean).length;
    const baseStartX = slots[0]?.originX ?? 0;
    const baseStartY = slots[0]?.originY ?? 0;
    const baseGapX = slots.length > 1 ? slots[1].originX - slots[0].originX : 0;
    const baseGapY = slots.length > 1 ? slots[1].originY - slots[0].originY : 0;
    const visibleSlots = slots.slice(0, visibleCardCount);
    const baseCenterX = visibleSlots.length > 0
        ? (visibleSlots[0].originX + visibleSlots[visibleSlots.length - 1].originX) / 2
        : baseStartX;
    const baseCenterY = visibleSlots.length > 0
        ? (visibleSlots[0].originY + visibleSlots[visibleSlots.length - 1].originY) / 2
        : baseStartY;
    let layoutStartX = baseStartX;
    let layoutStartY = baseStartY;
    let layoutGapX = baseGapX;
    let layoutGapY = baseGapY;

    if (isCurrentTurn && visibleCardCount > 1) {
        if (layoutGapX !== 0 && Math.abs(layoutGapX) < 74) {
            layoutGapX = Math.sign(layoutGapX) * 74;
        }

        if (layoutGapY !== 0 && Math.abs(layoutGapY) < 72) {
            layoutGapY = Math.sign(layoutGapY) * 72;
        }

        if (layoutGapX !== 0) {
            layoutStartX = baseCenterX - ((visibleCardCount - 1) * layoutGapX) / 2;
        }

        if (layoutGapY !== 0) {
            layoutStartY = baseCenterY - ((visibleCardCount - 1) * layoutGapY) / 2;
        }
    }

    return slots.map((slot, slotIndex) => {
        const card = cards[slotIndex] ?? null;
        const isSelected = selectedCardId === card?.id;
        const isHovered = hoveredSlotIndexes.has(slotIndex);

        let position = null;

        if (!hasAnimation) {
            const selectedOffsetX = slot.originAngle === 0
                ? 0
                : (slot.originAngle > 0 ? -SELECTED_CARD_SHIFT_X : SELECTED_CARD_SHIFT_X);
            const selectedOffsetY = slot.originAngle === 0 ? SELECTED_CARD_LIFT_Y : 0;
            const hoverOffsetX = !isSelected && isHovered
                ? (slot.originAngle > 0 ? -HOVER_CARD_SHIFT_X : (slot.originAngle < 0 ? HOVER_CARD_SHIFT_X : 0))
                : 0;
            const hoverOffsetY = !isSelected && isHovered
                ? (slot.originAngle === 0 ? HOVER_CARD_LIFT_Y : 0)
                : 0;

            position = {
                x: layoutStartX + layoutGapX * slotIndex + (isSelected ? selectedOffsetX : hoverOffsetX),
                y: layoutStartY + layoutGapY * slotIndex + (isSelected ? selectedOffsetY : hoverOffsetY)
            };
        }

        return {
            cardId: card?.id ?? null,
            visible: Boolean(card),
            interactiveEnabled: Boolean(card && canInteract),
            isSelected,
            isHovered,
            scale: isSelected ? SELECTED_CARD_SCALE : (isHovered ? HOVER_CARD_SCALE : 1),
            depth: isSelected ? 30 + slotIndex : (isHovered ? 20 + slotIndex : slotIndex),
            position,
            angle: hasAnimation ? null : slot.originAngle
        };
    });
}
