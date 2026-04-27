import * as Phaser from "phaser";

import type {
    CardGameViewCard,
    CardGameViewHandPresentation,
    CardGameViewModel
} from "../../../engine/game/viewModel";
import { CARD_BACK_STROKE, PLAYER_ZONE_LEFT_X, PLAYER_ZONE_RIGHT_X } from "../layout/constants";
import { getHandSlotDisplayStates } from "../layout/handLayouts";
import type { HandSlotOrigin } from "../layout/types";
import { TABLE_CENTER_Y } from "../../layout";

export interface HandSlotVisual extends HandSlotOrigin {
    container: Phaser.GameObjects.Container;
    hitTarget: Phaser.GameObjects.Rectangle;
    stackBacks: Phaser.GameObjects.Image[];
    image: Phaser.GameObjects.Image;
    outline: Phaser.GameObjects.Rectangle;
}

interface HandTextureApi {
    applyCardTexture(
        image: Phaser.GameObjects.Image,
        card: CardGameViewCard | null,
        variant: "compact" | "showcase"
    ): void;
}

interface HandPresentationInput {
    viewModel: CardGameViewModel;
    handSlots: Map<string, HandSlotVisual[]>;
    textureApi: HandTextureApi;
}

function getHoveredSlotIndexes(
    slots: readonly HandSlotVisual[],
    canInteract: boolean
): ReadonlySet<number> {
    if (!canInteract) {
        slots.forEach((slot) => {
            slot.container.setData("isHovered", false);
        });
        return new Set();
    }

    return new Set(
        slots.flatMap((slot, slotIndex) => {
            return slot.container.getData("isHovered") === true ? [slotIndex] : [];
        })
    );
}

function getOutlineColor(input: {
    isSelected: boolean;
    isHovered: boolean;
    isFaceUp: boolean;
    isCurrentTurn: boolean;
}): number {
    const { isSelected, isHovered, isFaceUp, isCurrentTurn } = input;
    if (isFaceUp) {
        if (isSelected) {
            return 0xffd166;
        }

        return isCurrentTurn ? 0x9dc08b : 0x17352b;
    }

    if (isSelected) {
        return 0xffd166;
    }

    return CARD_BACK_STROKE;
}

function getOutlineStyle(input: {
    isSelected: boolean;
    isHovered: boolean;
    isFaceUp: boolean;
    isCurrentTurn: boolean;
}): { width: number; alpha: number } {
    if (input.isSelected) {
        return { width: 2, alpha: 0.95 };
    }

    if (input.isCurrentTurn) {
        return { width: 1, alpha: 0.44 };
    }

    return { width: 1, alpha: input.isFaceUp ? 0.16 : 0.28 };
}

function syncStackBacks(input: {
    card: CardGameViewCard | null;
    handPresentation: CardGameViewHandPresentation;
    stackBacks: Phaser.GameObjects.Image[];
    textureApi: HandTextureApi;
}): void {
    const { card, handPresentation, stackBacks, textureApi } = input;
    const stackCount = card?.stackCount ?? 0;
    const showsStackDepth = handPresentation === "hidden-stack" || stackCount > 1;
    const visibleBackCount = showsStackDepth && !card?.isFaceUp && stackCount > 1
        ? Math.min(stackBacks.length, Math.max(1, Math.floor(stackCount / 8)))
        : 0;

    stackBacks.forEach((stackBack, index) => {
        const isVisible = index < visibleBackCount;
        stackBack.setVisible(isVisible);
        stackBack.setAlpha(isVisible ? 0.72 - index * 0.14 : 0);
        textureApi.applyCardTexture(stackBack, null, "compact");
    });
}

function getCardForSlot(input: {
    handPresentation: CardGameViewHandPresentation;
    cards: readonly CardGameViewCard[];
    slots: readonly HandSlotVisual[];
    slotIndex: number;
}): CardGameViewCard | null {
    const { handPresentation, cards, slots, slotIndex } = input;
    if (handPresentation !== "hidden-stack" || cards.length === 0 || slots.length === 0) {
        return cards[slotIndex] ?? null;
    }

    const isUpperSeat = slots[0].originAngle === 0 && slots[0].originY < TABLE_CENTER_Y;
    const stackSlotIndex = isUpperSeat ? slots.length - 1 : 0;
    return slotIndex === stackSlotIndex ? cards[0] : null;
}

function getHiddenStackPosition(input: {
    handPresentation: CardGameViewHandPresentation;
    card: CardGameViewCard | null;
    slot: HandSlotVisual;
}): { x: number; y: number } | null {
    const { handPresentation, card, slot } = input;
    if (handPresentation !== "hidden-stack" || !card || slot.originAngle !== 0) {
        return null;
    }

    return {
        x: slot.originY < TABLE_CENTER_Y ? PLAYER_ZONE_RIGHT_X : PLAYER_ZONE_LEFT_X,
        y: slot.originY
    };
}

export function syncHandPresentation(input: HandPresentationInput): void {
    const { viewModel, handSlots, textureApi } = input;

    viewModel.players.forEach((player) => {
        const slots = handSlots.get(player.id) || [];
        const handPresentation = player.handPresentation ?? "hand-fan";
        const displayCards: Array<CardGameViewCard | null> = handPresentation === "hidden-stack" && player.hand[0]
            ? slots.map((_, slotIndex) => getCardForSlot({
                  handPresentation,
                  cards: player.hand,
                  slots,
                  slotIndex
              }))
            : player.hand;
        const slotStates = getHandSlotDisplayStates({
            slots,
            cards: displayCards,
            isCurrentTurn: player.isCurrentTurn,
            canInteract: player.canInteract,
            selectedCardId: viewModel.selectedCardId,
            hoveredSlotIndexes: getHoveredSlotIndexes(slots, player.canInteract),
            hasAnimation: Boolean(viewModel.animation)
        });

        for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
            const slot = slots[slotIndex];
            const card = getCardForSlot({
                handPresentation,
                cards: player.hand,
                slots,
                slotIndex
            });
            const slotState = slotStates[slotIndex];

            if (slotState.position) {
                const hiddenStackPosition = getHiddenStackPosition({
                    handPresentation,
                    card,
                    slot
                });
                const nextPosition = hiddenStackPosition ?? slotState.position;
                slot.container.setPosition(nextPosition.x, nextPosition.y);
                slot.hitTarget.setPosition(nextPosition.x, nextPosition.y);
                slot.container.setAngle(slotState.angle ?? slot.originAngle);
                slot.hitTarget.setAngle(slotState.angle ?? slot.originAngle);
                slot.container.setAlpha(1);
            }

            slot.container.setVisible(slotState.visible);
            slot.hitTarget.setVisible(slotState.visible);
            slot.container.setData("cardId", slotState.cardId);
            slot.container.setData("isSelected", slotState.isSelected);
            slot.container.setData("cardClickAction", player.cardClickAction ?? "select");
            if (!card || !slotState.interactiveEnabled) {
                slot.container.setData("isHovered", false);
            }
            const isHovered = slotState.interactiveEnabled && slotState.isHovered;
            slot.container.setScale(slotState.scale);
            slot.hitTarget.setScale(1);
            slot.container.setDepth(slotState.depth);
            slot.hitTarget.setDepth(slotState.depth + 0.5);
            if (slot.hitTarget.input) {
                slot.hitTarget.input.enabled = slotState.interactiveEnabled;
            }

            const outlineInput = {
                isSelected: slotState.isSelected,
                isHovered,
                isFaceUp: card?.isFaceUp ?? false,
                isCurrentTurn: player.isCurrentTurn
            };
            const outlineStyle = getOutlineStyle(outlineInput);
            slot.outline.setStrokeStyle(outlineStyle.width, getOutlineColor(outlineInput), outlineStyle.alpha);

            syncStackBacks({
                card,
                handPresentation,
                stackBacks: slot.stackBacks,
                textureApi
            });
            textureApi.applyCardTexture(slot.image, card, "compact");
        }
    });
}
