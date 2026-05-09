import * as Phaser from "phaser";

import { isMoveCardEffect, type CardGameEffect, type MoveCardEffect } from "@engine/engine/game/effects";
import type { CardGameEffectReason } from "@engine/engine/game/effects";
import type { CardGameViewCard, CardGameViewModel } from "@engine/engine/game/viewModel";
import { CARD_HEIGHT, CARD_WIDTH } from "../layout/constants";
import { getTableCardDisplayState, getTableCardPosition } from "../layout/tableCardLayouts";
import {
    animateCollectCards,
    animateCardToStack,
    createCardMoveGhost,
    getCollectedCardMoveDelay,
    getCollectedPileCardPoint,
    getStackedCardMoveDelay,
    prepareCollectedCardGhostTexture,
    prepareCardMoveGhostTexture
} from "../animations/cardStackAnimations";
import { playCardFlipSound, playCardMoveSound } from "../audio/cardSoundEffects";
import type { PrimaryPileVisuals } from "./pilePresenter";
import type { OwnedPileVisual } from "./pilePresenter";
import type { HandSlotVisual } from "./handPresenter";
import type { TableCardVisual } from "../factories/createTableCardVisual";

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
    tableCardVisuals: TableCardVisual[];
    handSlots: Map<string, HandSlotVisual[]>;
    ownedPileVisuals: Map<string, OwnedPileVisual>;
    activeEffectBatchKey: string;
    textureApi: EffectTextureApi;
    onEffectsDone?: () => void;
}

function getEffectBatchKey(effects: readonly CardGameEffect[]): string {
    return effects.map((effect) => effect.key).join("|");
}

const DEAL_MAX_STEP_MS = 88;
const DEAL_TARGET_TOTAL_MS = 1500;

function getDealDelayStep(dealCount: number): number {
    if (dealCount <= 1) {
        return DEAL_MAX_STEP_MS;
    }

    return Math.min(DEAL_MAX_STEP_MS, Math.floor(DEAL_TARGET_TOTAL_MS / dealCount));
}

function getEffectProfile(reason: CardGameEffectReason, dealDelayStep = DEAL_MAX_STEP_MS): {
    duration: number;
    delayStep: number;
    ease: string;
    peakScale: number;
} {
    switch (reason) {
        case "deal":
            return {
                duration: 310,
                delayStep: dealDelayStep,
                ease: "Quart.easeOut",
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
                delayStep: getStackedCardMoveDelay(1),
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

function getEffectDelays(effects: readonly MoveCardEffect[]): number[] {
    const dealCount = effects.filter((e) => e.reason === "deal").length;
    const dealDelayStep = getDealDelayStep(dealCount);

    const delays: number[] = [];
    let groupStartDelay = 0;
    let groupReason: CardGameEffectReason | null = null;
    let groupIndex = 0;
    let previousProfile = getEffectProfile("deal", dealDelayStep);

    effects.forEach((effect) => {
        const profile = getEffectProfile(effect.reason, dealDelayStep);
        if (groupReason !== null && groupReason !== effect.reason) {
            groupStartDelay += previousProfile.duration + (groupIndex - 1) * previousProfile.delayStep + 120;
            groupIndex = 0;
        }

        delays.push(
            groupStartDelay +
                (effect.reason === "play"
                    ? getStackedCardMoveDelay(groupIndex)
                    : groupIndex * profile.delayStep)
        );
        groupReason = effect.reason;
        groupIndex += 1;
        previousProfile = profile;
    });

    return delays;
}

function getTableMoveVisual(input: {
    effect: MoveCardEffect;
    viewModel: CardGameViewModel;
    tableCardVisuals: readonly TableCardVisual[];
}): TableCardVisual | null {
    const { effect, viewModel, tableCardVisuals } = input;
    if (!(viewModel.tablePileIds ?? []).includes(effect.toPileId)) {
        return null;
    }

    const tableCardIndex = getEffectTableCardIndex({ effect, viewModel });
    return tableCardIndex === null ? null : tableCardVisuals[tableCardIndex] ?? null;
}

function getSourceTableMoveVisual(input: {
    effect: MoveCardEffect;
    viewModel: CardGameViewModel;
    tableCardVisuals: readonly TableCardVisual[];
}): TableCardVisual | null {
    const { effect, viewModel, tableCardVisuals } = input;
    if (!(viewModel.tablePileIds ?? []).includes(effect.fromPileId)) {
        return null;
    }

    const tableCardIndex = getEffectTableCardIndex({ effect, viewModel });
    return tableCardIndex === null ? null : tableCardVisuals[tableCardIndex] ?? null;
}

function getEffectTableCardIndex(input: {
    effect: MoveCardEffect;
    viewModel: CardGameViewModel;
}): number | null {
    const { effect, viewModel } = input;
    if (viewModel.tableCards.length === 0) {
        return null;
    }

    const directIndex = viewModel.tableCards.findIndex((card) => {
        return card.id === effect.card.id || (card.sourceCardIds ?? []).includes(effect.card.id);
    });
    if (directIndex >= 0) {
        return directIndex;
    }

    if (!effect.card.isFaceUp) {
        const hiddenStackIndex = viewModel.tableCards.findIndex((card) => {
            return !card.isFaceUp && (card.stackCount ?? 0) > 1;
        });
        if (hiddenStackIndex >= 0) {
            return hiddenStackIndex;
        }
    }

    return null;
}

function getEffectTableCardPoint(input: {
    effect: MoveCardEffect;
    viewModel: CardGameViewModel;
}): { x: number; y: number; angle: number } | null {
    const tableCardIndex = getEffectTableCardIndex(input);
    if (tableCardIndex === null) {
        return null;
    }

    const displayState = getTableCardDisplayState(input.viewModel.tableCards, tableCardIndex);
    return {
        x: displayState.x,
        y: displayState.y,
        angle: displayState.angle
    };
}

function getSourcePoint(input: {
    effect: MoveCardEffect;
    viewModel: CardGameViewModel;
    primaryPileVisuals: PrimaryPileVisuals;
    handSlots: Map<string, HandSlotVisual[]>;
}): { x: number; y: number } | null {
    const { effect, viewModel, primaryPileVisuals, handSlots } = input;
    if (effect.fromOwnerId) {
        const slots = handSlots.get(effect.fromOwnerId);
        const sourceSlot = slots?.[effect.fromIndex ?? 0];
        if (sourceSlot) {
            return {
                x: sourceSlot.container.x,
                y: sourceSlot.container.y
            };
        }
    }

    if (effect.fromPileId === "stock") {
        return {
            x: primaryPileVisuals.drawPileFrame.x,
            y: primaryPileVisuals.drawPileFrame.y
        };
    }

    if ((viewModel.tablePileIds ?? []).includes(effect.fromPileId)) {
        const visibleTablePoint = getEffectTableCardPoint({ effect, viewModel });
        if (visibleTablePoint) {
            return {
                x: visibleTablePoint.x,
                y: visibleTablePoint.y
            };
        }

        const position = getTableCardPosition(effect.fromIndex ?? 0, effect.fromPileCardCount ?? 2);
        return {
            x: position.x,
            y: position.y
        };
    }

    return {
        x: primaryPileVisuals.discardPileFrame.x,
        y: primaryPileVisuals.discardPileFrame.y
    };
}

function getDestinationSlot(input: {
    effect: MoveCardEffect;
    handSlots: Map<string, HandSlotVisual[]>;
}): HandSlotVisual | null {
    const { effect, handSlots } = input;
    if (!effect.toOwnerId) {
        return null;
    }

    const slots = handSlots.get(effect.toOwnerId);
    return slots?.[effect.toIndex ?? 0] ?? null;
}

function getDestinationPoint(input: {
    effect: MoveCardEffect;
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

    if ((viewModel.tablePileIds ?? []).includes(effect.toPileId)) {
        const visibleTablePoint = getEffectTableCardPoint({ effect, viewModel });
        if (visibleTablePoint) {
            return {
                x: visibleTablePoint.x,
                y: visibleTablePoint.y,
                angle: visibleTablePoint.angle
            };
        }

        const tableCardCount = Math.max(viewModel.tableCards.length, (effect.toIndex ?? 0) + 1, 2);
        const position = getTableCardPosition(effect.toIndex ?? 0, tableCardCount);
        return {
            x: position.x,
            y: position.y,
            angle: 0
        };
    }

    if (effect.toPileId !== "stock") {
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

function setOwnedPileCardLayersAlpha(visual: OwnedPileVisual, alpha: number): void {
    visual.stackBacks.forEach((stackBack) => {
        stackBack.setAlpha(alpha);
    });
    visual.image.setAlpha(alpha);
    visual.outline.setAlpha(alpha);
}

function restoreOwnedPileCardLayersAlpha(visual: OwnedPileVisual): void {
    visual.stackBacks.forEach((stackBack, index) => {
        stackBack.setAlpha(stackBack.visible ? 0.86 - index * 0.12 : 0);
    });
    visual.image.setAlpha(1);
    visual.outline.setAlpha(1);
}

function isWarCollectEffect(effect: MoveCardEffect): boolean {
    return effect.key.startsWith("battle-collect-") || effect.key.startsWith("battle-tie-discard-");
}

function getCollectAnimationProfile(effect: MoveCardEffect, index: number): {
    delay: number;
    duration: number;
    ease: string;
    peakScale: number;
    landingScale: number;
} {
    if (isWarCollectEffect(effect)) {
        return {
            delay: index * 92,
            duration: 460,
            ease: "Cubic.easeInOut",
            peakScale: 1.04,
            landingScale: 0.82
        };
    }

    return {
        delay: getCollectedCardMoveDelay(index),
        duration: 330,
        ease: "Cubic.easeInOut",
        peakScale: 0.9,
        landingScale: 0.78
    };
}

function flashOwnedPileCollectTarget(scene: Phaser.Scene, visual: OwnedPileVisual): void {
    const ring = scene.add.rectangle(
        visual.container.x,
        visual.container.y,
        CARD_WIDTH + 30,
        CARD_HEIGHT + 30,
        0x000000,
        0
    )
        .setAngle(visual.container.angle)
        .setStrokeStyle(3, 0xffd166, 0.8)
        .setDepth(151)
        .setScale(0.86);

    scene.tweens.add({
        targets: ring,
        alpha: 0,
        scaleX: 1.28,
        scaleY: 1.28,
        duration: 520,
        ease: "Sine.easeOut",
        onComplete: () => {
            ring.destroy();
        }
    });
}

function runCollectEffects(input: EffectPresentationInput, collectEffects: MoveCardEffect[]): string {
    const {
        scene,
        viewModel,
        primaryPileVisuals,
        tableCardVisuals,
        handSlots,
        ownedPileVisuals,
        textureApi,
        onEffectsDone
    } = input;
    const effectBatchKey = getEffectBatchKey(collectEffects);
    const destinationPileVisuals = new Set<OwnedPileVisual>();
    const warDestinationPileVisuals = new Set<OwnedPileVisual>();
    const collectItems = collectEffects.flatMap((effect, index) => {
        const sourcePoint = getSourcePoint({ effect, viewModel, primaryPileVisuals, handSlots });
        const destinationPoint = getDestinationPoint({
            effect,
            viewModel,
            primaryPileVisuals,
            handSlots,
            ownedPileVisuals
        });
        const ownedPileVisual = ownedPileVisuals.get(effect.toPileId);
        if (!sourcePoint || !destinationPoint) {
            return [];
        }

        getSourceTableMoveVisual({
            effect,
            viewModel,
            tableCardVisuals
        })?.container.setAlpha(0);
        if (ownedPileVisual) {
            destinationPileVisuals.add(ownedPileVisual);
            if (isWarCollectEffect(effect)) {
                warDestinationPileVisuals.add(ownedPileVisual);
            }
            setOwnedPileCardLayersAlpha(ownedPileVisual, 0);
        }

        const ghost = createCardMoveGhost({
            scene,
            source: sourcePoint,
            textureApi
        });
        prepareCollectedCardGhostTexture({
            ghost,
            textureApi
        });
        const profile = getCollectAnimationProfile(effect, index);

        return [{
            ghost,
            effect,
            destination: getCollectedPileCardPoint(destinationPoint, index),
            delay: profile.delay,
            duration: profile.duration,
            ease: profile.ease,
            peakScale: profile.peakScale,
            landingScale: profile.landingScale
        }];
    });

    if (collectItems.length === 0) {
        scene.time.delayedCall(0, () => {
            onEffectsDone?.();
        });
        return effectBatchKey;
    }

    animateCollectCards({
        scene,
        items: collectItems,
        textureApi,
        onCardLanded: (item) => {
            playCardMoveSound(scene, item.effect.reason);
        },
        onComplete: () => {
            warDestinationPileVisuals.forEach((visual) => {
                flashOwnedPileCollectTarget(scene, visual);
            });
            destinationPileVisuals.forEach((visual) => {
                restoreOwnedPileCardLayersAlpha(visual);
            });
            onEffectsDone?.();
        }
    });

    return effectBatchKey;
}

export function runViewEffects(input: EffectPresentationInput): string {
    const {
        scene,
        viewModel,
        primaryPileVisuals,
        tableCardVisuals,
        handSlots,
        ownedPileVisuals,
        activeEffectBatchKey,
        textureApi,
        onEffectsDone
    } = input;
    const effects = viewModel.effects.filter(isMoveCardEffect);
    if (effects.length === 0) {
        return "";
    }

    const effectBatchKey = getEffectBatchKey(effects);
    if (effectBatchKey === activeEffectBatchKey) {
        return activeEffectBatchKey;
    }

    if (effects.every((effect) => effect.reason === "collect")) {
        return runCollectEffects(input, effects);
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

        const destinationVisual = getTableMoveVisual({
            effect,
            viewModel,
            tableCardVisuals
        });
        if (destinationVisual && effect.reason === "play") {
            destinationVisual.container.setAlpha(0);
        }

        const ghost = createCardMoveGhost({
            scene,
            source: sourcePoint,
            textureApi
        });
        prepareCardMoveGhostTexture({
            ghost,
            effect,
            textureApi
        });

        animateCardToStack({
            scene,
            ghost,
            effect,
            destination: destinationPoint,
            profile: {
                duration: profile.duration,
                delay: effectDelays[index],
                ease: profile.ease,
                peakScale: profile.peakScale
            },
            textureApi,
            onLanded: () => {
                playCardMoveSound(scene, effect.reason);
            },
            onReveal: () => {
                playCardFlipSound(scene);
            },
            onComplete: () => {
                destinationVisual?.container.setAlpha(1);
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
