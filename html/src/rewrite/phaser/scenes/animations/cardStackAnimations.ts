import * as Phaser from "phaser";

import type { MoveCardEffect } from "../../../engine/game/effects";
import type { CardGameViewCard } from "../../../engine/game/viewModel";
import { CARD_HEIGHT, CARD_WIDTH } from "../layout/constants";

export interface CardAnimationPoint {
    x: number;
    y: number;
    angle: number;
}

export interface CardAnimationProfile {
    duration: number;
    delay: number;
    ease: string;
    peakScale: number;
}

export interface CollectCardAnimationItem {
    ghost: Phaser.GameObjects.Image;
    effect: MoveCardEffect;
    destination: CardAnimationPoint;
    delay: number;
    duration: number;
    ease: string;
    peakScale: number;
    landingScale: number;
}

export interface CardAnimationTextureApi {
    getActiveBackTextureKey(): string;
    applyCardTexture(
        image: Phaser.GameObjects.Image,
        card: CardGameViewCard | null,
        variant: "compact" | "showcase"
    ): void;
}

interface CardDisplaySize {
    width: number;
    height: number;
}

export function getStackedCardMoveDelay(index: number): number {
    return index * 115;
}

export function getCollectedCardMoveDelay(index: number): number {
    return index * 58;
}

export function getCollectedPileCardPoint(basePoint: CardAnimationPoint, index: number): CardAnimationPoint {
    const scatterPattern = [
        { x: -12, y: -8, angle: -8 },
        { x: 8, y: -6, angle: 5 },
        { x: -6, y: 5, angle: -4 },
        { x: 12, y: 4, angle: 7 },
        { x: -2, y: -2, angle: 2 },
        { x: 5, y: 8, angle: -6 },
        { x: -10, y: 2, angle: 6 },
        { x: 10, y: -1, angle: -3 }
    ];
    const scatter = scatterPattern[index % scatterPattern.length];
    const layer = Math.floor(index / scatterPattern.length);
    const layerOffset = Math.min(layer * 3, 9);

    return {
        x: basePoint.x + scatter.x + (index % 2 === 0 ? -layerOffset : layerOffset),
        y: basePoint.y + scatter.y - layerOffset,
        angle: basePoint.angle + scatter.angle
    };
}

export function createCardMoveGhost(input: {
    scene: Phaser.Scene;
    source: { x: number; y: number };
    textureApi: CardAnimationTextureApi;
}): Phaser.GameObjects.Image {
    const { scene, source, textureApi } = input;
    const ghost = scene.add.image(source.x, source.y, textureApi.getActiveBackTextureKey())
        .setDisplaySize(CARD_WIDTH, CARD_HEIGHT)
        .setDepth(140)
        .setAngle(0);

    ghost.setData("cardDisplaySize", {
        width: CARD_WIDTH,
        height: CARD_HEIGHT
    } satisfies CardDisplaySize);

    return ghost;
}

export function prepareCollectedCardGhostTexture(input: {
    ghost: Phaser.GameObjects.Image;
    textureApi: CardAnimationTextureApi;
}): void {
    input.textureApi.applyCardTexture(input.ghost, null, "compact");
}

export function shouldRevealFinalCard(effect: MoveCardEffect): boolean {
    return effect.type === "move-card" && effect.fromFaceUp === false && effect.card.isFaceUp;
}

export function prepareCardMoveGhostTexture(input: {
    ghost: Phaser.GameObjects.Image;
    effect: MoveCardEffect;
    textureApi: CardAnimationTextureApi;
}): void {
    const { ghost, effect, textureApi } = input;
    if (!shouldRevealFinalCard(effect)) {
        textureApi.applyCardTexture(ghost, effect.card, "compact");
    }
}

export function animateFinalCardReveal(input: {
    scene: Phaser.Scene;
    ghost: Phaser.GameObjects.Image;
    effect: MoveCardEffect;
    textureApi: CardAnimationTextureApi;
    onComplete: () => void;
}): void {
    const { scene, ghost, effect, textureApi, onComplete } = input;

    scene.tweens.add({
        targets: ghost,
        scaleX: 0.08,
        duration: 95,
        ease: "Sine.easeIn",
        onComplete: () => {
            textureApi.applyCardTexture(ghost, effect.card, "compact");
            scene.tweens.add({
                targets: ghost,
                scaleX: 1,
                duration: 145,
                ease: "Sine.easeOut",
                onComplete
            });
        }
    });
}

export function animateCardToStack(input: {
    scene: Phaser.Scene;
    ghost: Phaser.GameObjects.Image;
    effect: MoveCardEffect;
    destination: CardAnimationPoint;
    profile: CardAnimationProfile;
    textureApi: CardAnimationTextureApi;
    onComplete: () => void;
}): void {
    const { scene, ghost, effect, destination, profile, textureApi, onComplete } = input;

    scene.tweens.add({
        targets: ghost,
        x: destination.x,
        y: destination.y,
        angle: destination.angle,
        scaleX: profile.peakScale,
        scaleY: profile.peakScale,
        duration: profile.duration,
        delay: profile.delay,
        ease: profile.ease,
        onComplete: () => {
            ghost.setScale(1);
            if (!shouldRevealFinalCard(effect)) {
                onComplete();
                return;
            }

            animateFinalCardReveal({
                scene,
                ghost,
                effect,
                textureApi,
                onComplete
            });
        }
    });
}

export function animateCollectCards(input: {
    scene: Phaser.Scene;
    items: readonly CollectCardAnimationItem[];
    textureApi: CardAnimationTextureApi;
    onCardLanded?: (item: CollectCardAnimationItem) => void;
    onComplete?: () => void;
}): void {
    const { scene, items, onCardLanded, onComplete } = input;
    if (items.length === 0) {
        onComplete?.();
        return;
    }

    let landedCount = 0;
    const landedGhosts: Phaser.GameObjects.Image[] = [];

    items.forEach((item, index) => {
        const landingY = item.destination.y;
        scene.tweens.add({
            targets: item.ghost,
            x: item.destination.x,
            y: landingY - 6,
            angle: item.destination.angle,
            scaleX: item.peakScale,
            scaleY: item.peakScale,
            duration: item.duration,
            delay: item.delay,
            ease: item.ease,
            onComplete: () => {
                scene.tweens.add({
                    targets: item.ghost,
                    y: landingY,
                    scaleX: item.landingScale,
                    scaleY: item.landingScale,
                    duration: 80,
                    ease: "Back.easeOut",
                    onComplete: () => {
                        landedGhosts.push(item.ghost);
                        onCardLanded?.(item);
                        landedCount += 1;
                        if (landedCount !== items.length) {
                            return;
                        }

                        scene.time.delayedCall(140, () => {
                            landedGhosts.forEach((ghost) => {
                                ghost.destroy();
                            });
                            onComplete?.();
                        });
                    }
                });
            }
        });
        item.ghost.setDepth(142 + index);
    });
}
