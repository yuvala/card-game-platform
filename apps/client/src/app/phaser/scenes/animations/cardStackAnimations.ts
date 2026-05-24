import * as Phaser from 'phaser';

import type { MoveCardEffect } from '@engine/engine/game/effects';
import type { CardGameViewCard } from '@engine/engine/game/viewModel';
import { CARD_HEIGHT, CARD_WIDTH } from '../layout/constants';
import {
    animateCardHoldHighlight,
    animateImageCollectMotions,
    animateImageHorizontalFlip,
    animateImageMove,
    animateTransientShuffleDeck,
    createCardMotionImage,
} from './cardMotionAnimations';

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
        variant: 'compact' | 'showcase',
    ): void;
}

interface CardDisplaySize {
    width: number;
    height: number;
}

function restoreCardDisplaySize(image: Phaser.GameObjects.Image): void {
    const displaySize = image.getData('cardDisplaySize') as CardDisplaySize | undefined;
    if (!displaySize) {
        return;
    }

    image.setDisplaySize(displaySize.width, displaySize.height);
}

export function getStackedCardMoveDelay(index: number): number {
    return index * 115;
}

export function animateShuffleDeck(input: {
    scene: Phaser.Scene;
    x: number;
    y: number;
    textureApi: CardAnimationTextureApi;
    onComplete?: () => void;
}): void {
    const { scene, x, y, textureApi, onComplete } = input;
    animateTransientShuffleDeck({
        scene,
        textureKey: textureApi.getActiveBackTextureKey(),
        center: {
            x,
            y,
        },
        size: {
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
        },
        count: 8,
        depth: 132,
        onComplete,
    });
}

export function getCollectedCardMoveDelay(index: number): number {
    return index * 58;
}

export function getCollectedPileCardPoint(
    basePoint: CardAnimationPoint,
    index: number,
): CardAnimationPoint {
    const scatterPattern = [
        { x: -12, y: -8, angle: -8 },
        { x: 8, y: -6, angle: 5 },
        { x: -6, y: 5, angle: -4 },
        { x: 12, y: 4, angle: 7 },
        { x: -2, y: -2, angle: 2 },
        { x: 5, y: 8, angle: -6 },
        { x: -10, y: 2, angle: 6 },
        { x: 10, y: -1, angle: -3 },
    ];
    const scatter = scatterPattern[index % scatterPattern.length];
    const layer = Math.floor(index / scatterPattern.length);
    const layerOffset = Math.min(layer * 3, 9);

    return {
        x: basePoint.x + scatter.x + (index % 2 === 0 ? -layerOffset : layerOffset),
        y: basePoint.y + scatter.y - layerOffset,
        angle: basePoint.angle + scatter.angle,
    };
}

export function createCardMoveGhost(input: {
    scene: Phaser.Scene;
    source: { x: number; y: number };
    textureApi: CardAnimationTextureApi;
}): Phaser.GameObjects.Image {
    const { scene, source, textureApi } = input;
    return createCardMotionImage({
        scene,
        textureKey: textureApi.getActiveBackTextureKey(),
        center: source,
        size: {
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
        },
        depth: 140,
    });
}

export function prepareCollectedCardGhostTexture(input: {
    ghost: Phaser.GameObjects.Image;
    textureApi: CardAnimationTextureApi;
}): void {
    input.textureApi.applyCardTexture(input.ghost, null, 'compact');
}

export function shouldRevealFinalCard(effect: MoveCardEffect): boolean {
    return effect.type === 'move-card' && effect.fromFaceUp === false && effect.card.isFaceUp;
}

function getFinalRevealDelay(effect: MoveCardEffect): number {
    return effect.animationProfile === 'war-reveal' ? 650 : 0;
}

function getFinalRevealDurations(effect: MoveCardEffect): {
    revealInDuration: number;
    revealOutDuration: number;
} {
    return effect.animationProfile === 'war-reveal'
        ? {
              revealInDuration: 170,
              revealOutDuration: 230,
          }
        : {
              revealInDuration: 95,
              revealOutDuration: 145,
          };
}

function isWarRevealEffect(effect: MoveCardEffect): boolean {
    return effect.animationProfile === 'war-reveal';
}

export function prepareCardMoveGhostTexture(input: {
    ghost: Phaser.GameObjects.Image;
    effect: MoveCardEffect;
    textureApi: CardAnimationTextureApi;
}): void {
    const { ghost, effect, textureApi } = input;
    if (!shouldRevealFinalCard(effect)) {
        textureApi.applyCardTexture(ghost, effect.card, 'compact');
        restoreCardDisplaySize(ghost);
    }
}

export function animateFinalCardReveal(input: {
    scene: Phaser.Scene;
    ghost: Phaser.GameObjects.Image;
    effect: MoveCardEffect;
    textureApi: CardAnimationTextureApi;
    onReveal?: () => void;
    onComplete: () => void;
}): void {
    const { scene, ghost, effect, textureApi, onReveal, onComplete } = input;
    const durations = getFinalRevealDurations(effect);

    animateImageHorizontalFlip({
        scene,
        image: ghost,
        size: {
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
        },
        revealInDuration: durations.revealInDuration,
        revealOutDuration: durations.revealOutDuration,
        onMidpoint: () => {
            onReveal?.();
            ghost.setScale(1);
            restoreCardDisplaySize(ghost);
            textureApi.applyCardTexture(ghost, effect.card, 'compact');
            restoreCardDisplaySize(ghost);
        },
        onComplete,
    });
}

export function animateCardToStack(input: {
    scene: Phaser.Scene;
    ghost: Phaser.GameObjects.Image;
    effect: MoveCardEffect;
    destination: CardAnimationPoint;
    profile: CardAnimationProfile;
    textureApi: CardAnimationTextureApi;
    onLanded?: () => void;
    onReveal?: () => void;
    onComplete: () => void;
}): void {
    const {
        scene,
        ghost,
        effect,
        destination,
        profile,
        textureApi,
        onLanded,
        onReveal,
        onComplete,
    } = input;
    const baseScaleX = ghost.scaleX;
    const baseScaleY = ghost.scaleY;

    animateImageMove({
        scene,
        image: ghost,
        target: {
            x: destination.x,
            y: destination.y,
        },
        targetAngle: destination.angle,
        scaleX: baseScaleX * profile.peakScale,
        scaleY: baseScaleY * profile.peakScale,
        duration: profile.duration,
        delay: profile.delay,
        ease: profile.ease,
        onComplete: () => {
            onLanded?.();
            restoreCardDisplaySize(ghost);
            if (!shouldRevealFinalCard(effect)) {
                onComplete();
                return;
            }

            const revealDelay = getFinalRevealDelay(effect);
            const revealHighlight = isWarRevealEffect(effect)
                ? animateCardHoldHighlight({
                      scene,
                      image: ghost,
                      width: CARD_WIDTH + 18,
                      height: CARD_HEIGHT + 18,
                      duration: revealDelay,
                  })
                : null;
            const reveal = () => {
                revealHighlight?.destroy();
                animateFinalCardReveal({
                    scene,
                    ghost,
                    effect,
                    textureApi,
                    onReveal,
                    onComplete,
                });
            };

            if (revealDelay > 0) {
                scene.time.delayedCall(revealDelay, reveal);
                return;
            }

            reveal();
        },
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

    animateImageCollectMotions({
        scene,
        items: items.map((item) => {
            return {
                image: item.ghost,
                target: {
                    x: item.destination.x,
                    y: item.destination.y,
                },
                targetAngle: item.destination.angle,
                delay: item.delay,
                duration: item.duration,
                ease: item.ease,
                peakScale: item.peakScale,
                landingScale: item.landingScale,
            };
        }),
        onItemLanded: (motionItem) => {
            const item = items.find((candidate) => candidate.ghost === motionItem.image);
            if (item) {
                onCardLanded?.(item);
            }
        },
        onComplete,
    });
}
