import * as Phaser from "phaser";

import type { CardGameEffect } from "../../../engine/game/effects";
import type { CardGameViewCard, CardGameViewModel } from "../../../engine/game/viewModel";
import { CARD_HEIGHT, CARD_WIDTH } from "../layout/constants";
import { getTableCardPosition } from "../layout/tableCardLayouts";
import type { PrimaryPileVisuals } from "./pilePresenter";
import type { OwnedPileVisual } from "./pilePresenter";
import type { HandSlotVisual } from "./handPresenter";

interface EffectTextureApi {
    getActiveBackTextureKey(): string;
    applyCardTexture(
        image: Phaser.GameObjects.Image,
        card: CardGameViewCard | null,
        variant: "compact" | "showcase"
    ): void;
}

interface EffectPresentationInput {
    scene: Phaser.Scene;
    viewModel: CardGameViewModel;
    primaryPileVisuals: PrimaryPileVisuals;
    handSlots: Map<string, HandSlotVisual[]>;
    ownedPileVisuals: Map<string, OwnedPileVisual>;
    activeEffectBatchKey: string;
    textureApi: EffectTextureApi;
    onEffectsDone?: () => void;
}

function getEffectBatchKey(effects: readonly CardGameEffect[]): string {
    return effects.map((effect) => effect.key).join("|");
}

function getSourcePoint(input: {
    effect: CardGameEffect;
    primaryPileVisuals: PrimaryPileVisuals;
    handSlots: Map<string, HandSlotVisual[]>;
}): { x: number; y: number } | null {
    const { effect, primaryPileVisuals, handSlots } = input;
    if (effect.type === "move-card" && effect.fromOwnerId) {
        const slots = handSlots.get(effect.fromOwnerId);
        const sourceSlot = slots?.[effect.fromIndex ?? 0];
        if (sourceSlot) {
            return {
                x: sourceSlot.container.x,
                y: sourceSlot.container.y
            };
        }
    }

    if (effect.type === "move-card" && effect.fromPileId === "stock") {
        return {
            x: primaryPileVisuals.drawPileFrame.x,
            y: primaryPileVisuals.drawPileFrame.y
        };
    }

    if (effect.type === "move-card" && (effect.fromPileId === "trick" || effect.fromPileId === "battle")) {
        const position = getTableCardPosition(effect.fromIndex ?? 0, effect.fromPileCardCount ?? 2);
        return {
            x: position.x,
            y: position.y
        };
    }

    if (effect.type === "move-card") {
        return {
            x: primaryPileVisuals.discardPileFrame.x,
            y: primaryPileVisuals.discardPileFrame.y
        };
    }

    return null;
}

function getDestinationSlot(input: {
    effect: CardGameEffect;
    handSlots: Map<string, HandSlotVisual[]>;
}): HandSlotVisual | null {
    const { effect, handSlots } = input;
    if (effect.type !== "move-card" || !effect.toOwnerId) {
        return null;
    }

    const slots = handSlots.get(effect.toOwnerId);
    return slots?.[effect.toIndex ?? 0] ?? null;
}

function getDestinationPoint(input: {
    effect: CardGameEffect;
    primaryPileVisuals: PrimaryPileVisuals;
    handSlots: Map<string, HandSlotVisual[]>;
    ownedPileVisuals: Map<string, OwnedPileVisual>;
}): { x: number; y: number; angle: number } | null {
    const { effect, primaryPileVisuals, handSlots, ownedPileVisuals } = input;
    const ownedPileVisual = ownedPileVisuals.get(effect.toPileId);
    if (ownedPileVisual) {
        return {
            x: ownedPileVisual.container.x,
            y: ownedPileVisual.container.y,
            angle: ownedPileVisual.container.angle
        };
    }

    const destinationSlot = getDestinationSlot({ effect, handSlots });
    if (destinationSlot) {
        return {
            x: destinationSlot.container.x,
            y: destinationSlot.container.y,
            angle: destinationSlot.container.angle
        };
    }

    if (effect.type === "move-card" && (effect.toPileId === "trick" || effect.toPileId === "battle")) {
        const position = getTableCardPosition(effect.toIndex ?? 0, 2);
        return {
            x: position.x,
            y: position.y,
            angle: 0
        };
    }

    if (effect.type === "move-card" && effect.toPileId !== "stock") {
        return {
            x: primaryPileVisuals.discardPileFrame.x,
            y: primaryPileVisuals.discardPileFrame.y,
            angle: 0
        };
    }

    return null;
}

export function runViewEffects(input: EffectPresentationInput): string {
    const {
        scene,
        viewModel,
        primaryPileVisuals,
        handSlots,
        ownedPileVisuals,
        activeEffectBatchKey,
        textureApi,
        onEffectsDone
    } = input;
    const effects = viewModel.effects.filter((effect) => effect.type === "move-card");
    if (effects.length === 0) {
        return "";
    }

    const effectBatchKey = getEffectBatchKey(effects);
    if (effectBatchKey === activeEffectBatchKey) {
        return activeEffectBatchKey;
    }

    let scheduledEffectCount = 0;
    let completedEffectCount = 0;

    const completeEffect = () => {
        completedEffectCount += 1;
        if (completedEffectCount === scheduledEffectCount) {
            onEffectsDone?.();
        }
    };

    effects.forEach((effect, index) => {
        const sourcePoint = getSourcePoint({ effect, primaryPileVisuals, handSlots });
        const destinationPoint = getDestinationPoint({
            effect,
            primaryPileVisuals,
            handSlots,
            ownedPileVisuals
        });
        if (!sourcePoint || !destinationPoint) {
            return;
        }
        scheduledEffectCount += 1;

        const ghost = scene.add.image(sourcePoint.x, sourcePoint.y, textureApi.getActiveBackTextureKey())
            .setDisplaySize(CARD_WIDTH, CARD_HEIGHT)
            .setDepth(140)
            .setAngle(0);
        textureApi.applyCardTexture(ghost, effect.card, "compact");

        scene.tweens.add({
            targets: ghost,
            x: destinationPoint.x,
            y: destinationPoint.y,
            angle: destinationPoint.angle,
            duration: 190,
            delay: index * 18,
            ease: "Cubic.easeInOut",
            onComplete: () => {
                ghost.destroy();
                completeEffect();
            }
        });
    });

    if (scheduledEffectCount === 0) {
        scene.time.delayedCall(0, () => {
            onEffectsDone?.();
        });
    }

    return effectBatchKey;
}
