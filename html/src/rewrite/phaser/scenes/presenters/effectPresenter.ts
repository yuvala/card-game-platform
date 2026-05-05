import * as Phaser from "phaser";

import type { CardGameEffect } from "../../../engine/game/effects";
import type { CardGameEffectReason } from "../../../engine/game/effects";
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

interface CardDisplaySize {
    width: number;
    height: number;
}

function getEffectBatchKey(effects: readonly CardGameEffect[]): string {
    return effects.map((effect) => effect.key).join("|");
}

function getEffectProfile(reason: CardGameEffectReason): {
    duration: number;
    delayStep: number;
    ease: string;
    peakScale: number;
} {
    switch (reason) {
        case "deal":
            return {
                duration: 190,
                delayStep: 18,
                ease: "Cubic.easeInOut",
                peakScale: 1
            };
        case "draw":
            return {
                duration: 220,
                delayStep: 42,
                ease: "Cubic.easeOut",
                peakScale: 1.02
            };
        case "play":
            return {
                duration: 260,
                delayStep: 60,
                ease: "Back.easeOut",
                peakScale: 1.08
            };
        case "collect":
            return {
                duration: 300,
                delayStep: 48,
                ease: "Cubic.easeIn",
                peakScale: 0.96
            };
    }
}

function getEffectDelays(effects: readonly CardGameEffect[]): number[] {
    const delays: number[] = [];
    let groupStartDelay = 0;
    let groupReason: CardGameEffectReason | null = null;
    let groupIndex = 0;
    let previousProfile = getEffectProfile("deal");

    effects.forEach((effect) => {
        const profile = getEffectProfile(effect.reason);
        if (groupReason !== null && groupReason !== effect.reason) {
            groupStartDelay += previousProfile.duration + (groupIndex - 1) * previousProfile.delayStep + 120;
            groupIndex = 0;
        }

        delays.push(groupStartDelay + groupIndex * profile.delayStep);
        groupReason = effect.reason;
        groupIndex += 1;
        previousProfile = profile;
    });

    return delays;
}

function getSourcePoint(input: {
    effect: CardGameEffect;
    viewModel: CardGameViewModel;
    primaryPileVisuals: PrimaryPileVisuals;
    handSlots: Map<string, HandSlotVisual[]>;
}): { x: number; y: number } | null {
    const { effect, viewModel, primaryPileVisuals, handSlots } = input;
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

    if (effect.type === "move-card" && (viewModel.tablePileIds ?? []).includes(effect.fromPileId)) {
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
    viewModel: CardGameViewModel;
    primaryPileVisuals: PrimaryPileVisuals;
    handSlots: Map<string, HandSlotVisual[]>;
    ownedPileVisuals: Map<string, OwnedPileVisual>;
}): { x: number; y: number; angle: number } | null {
    const { effect, viewModel, primaryPileVisuals, handSlots, ownedPileVisuals } = input;
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

    if (effect.type === "move-card" && (viewModel.tablePileIds ?? []).includes(effect.toPileId)) {
        const tableCardCount = Math.max(viewModel.tableCards.length, (effect.toIndex ?? 0) + 1, 2);
        const position = getTableCardPosition(effect.toIndex ?? 0, tableCardCount);
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

function flashDestination(input: {
    scene: Phaser.Scene;
    point: { x: number; y: number; angle: number };
    reason: CardGameEffectReason;
}): void {
    const { scene, point, reason } = input;
    const color = reason === "collect" ? 0x93c47d : 0xffd166;
    const ring = scene.add.rectangle(
        point.x,
        point.y,
        CARD_WIDTH + 18,
        CARD_HEIGHT + 18,
        0x000000,
        0
    )
        .setAngle(point.angle)
        .setStrokeStyle(2, color, 0.85)
        .setDepth(139)
        .setScale(0.92);

    scene.tweens.add({
        targets: ring,
        alpha: 0,
        scaleX: 1.24,
        scaleY: 1.24,
        duration: 260,
        ease: "Sine.easeOut",
        onComplete: () => {
            ring.destroy();
        }
    });
}

function shouldRevealMidFlight(effect: CardGameEffect): boolean {
    return effect.type === "move-card" && effect.fromFaceUp === false && effect.card.isFaceUp;
}

function shouldStartFaceUp(effect: CardGameEffect): boolean {
    return effect.type === "move-card" && effect.card.isFaceUp && effect.fromFaceUp !== false;
}

function scheduleMidFlightReveal(input: {
    scene: Phaser.Scene;
    ghost: Phaser.GameObjects.Image;
    effect: CardGameEffect;
    delay: number;
    duration: number;
    textureApi: EffectTextureApi;
}): void {
    const { scene, ghost, effect, delay, duration, textureApi } = input;
    if (!shouldRevealMidFlight(effect)) {
        return;
    }

    scene.time.delayedCall(delay + Math.round(duration * 0.46), () => {
        if (!ghost.active) {
            return;
        }

        textureApi.applyCardTexture(ghost, effect.card, "compact");
    });
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
    const effectDelays = getEffectDelays(effects);

    const completeEffect = () => {
        completedEffectCount += 1;
        if (completedEffectCount === scheduledEffectCount) {
            onEffectsDone?.();
        }
    };

    effects.forEach((effect, index) => {
        const profile = getEffectProfile(effect.reason);
        const sourcePoint = getSourcePoint({ effect, viewModel, primaryPileVisuals, handSlots });
        const destinationPoint = getDestinationPoint({
            effect,
            viewModel,
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
        ghost.setData("cardDisplaySize", {
            width: CARD_WIDTH,
            height: CARD_HEIGHT
        } satisfies CardDisplaySize);
        if (shouldStartFaceUp(effect) || !shouldRevealMidFlight(effect)) {
            textureApi.applyCardTexture(ghost, effect.card, "compact");
        }
        scheduleMidFlightReveal({
            scene,
            ghost,
            effect,
            delay: effectDelays[index],
            duration: profile.duration,
            textureApi
        });

        scene.tweens.add({
            targets: ghost,
            x: destinationPoint.x,
            y: destinationPoint.y,
            angle: destinationPoint.angle,
            scaleX: profile.peakScale,
            scaleY: profile.peakScale,
            duration: profile.duration,
            delay: effectDelays[index],
            ease: profile.ease,
            onComplete: () => {
                ghost.destroy();
                flashDestination({
                    scene,
                    point: destinationPoint,
                    reason: effect.reason
                });
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
