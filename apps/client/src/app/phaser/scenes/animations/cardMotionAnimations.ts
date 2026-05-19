import type * as Phaser from 'phaser';

import type { CardAnimationLayer } from './cardAnimationLayer';

export interface CardMotionPoint {
    x: number;
    y: number;
}

export interface CardMotionSize {
    width: number;
    height: number;
}

export interface AnimateGhostMoveRevealInput {
    scene: Phaser.Scene;
    animationLayer: CardAnimationLayer;
    backTextureKey: string;
    faceTextureKey: string;
    source: CardMotionPoint;
    target: CardMotionPoint;
    size: CardMotionSize;
    sourceAngle?: number;
    targetAngle?: number;
    depth?: number;
    moveDuration?: number;
    revealInDuration?: number;
    revealOutDuration?: number;
    onMoveComplete?: () => void;
    onComplete?: () => void;
}

export interface AnimateGhostArcMoveInput {
    scene: Phaser.Scene;
    animationLayer: CardAnimationLayer;
    textureKey: string;
    source: CardMotionPoint;
    controlIn: CardMotionPoint;
    target: CardMotionPoint;
    size: CardMotionSize;
    sourceAngle?: number;
    targetAngle?: number;
    depth?: number;
    duration?: number;
    onComplete?: () => void;
}

export interface AnimateDealRevealInput {
    scene: Phaser.Scene;
    animationLayer: CardAnimationLayer;
    backTextureKey: string;
    faceTextureKey: string;
    source: CardMotionPoint;
    target: CardMotionPoint;
    size: CardMotionSize;
    sourceAngle?: number;
    targetAngle?: number;
    depth?: number;
    dealDuration?: number;
    revealDelay?: number;
    onLanded?: () => void;
    onComplete?: () => void;
}

export interface AnimateLayerStackInput {
    scene: Phaser.Scene;
    animationLayer: CardAnimationLayer;
    textureKey: string;
    origin: CardMotionPoint;
    size: CardMotionSize;
    count: number;
    depth?: number;
    delayStep?: number;
    duration?: number;
    onComplete?: () => void;
}

export interface CollectPileCardInput {
    textureKey: string;
    source: CardMotionPoint;
    target: CardMotionPoint;
    size: CardMotionSize;
    sourceAngle?: number;
    targetAngle?: number;
    depth?: number;
}

export interface AnimateCollectPileInput {
    scene: Phaser.Scene;
    animationLayer: CardAnimationLayer;
    cards: readonly CollectPileCardInput[];
    delayStep?: number;
    duration?: number;
    onComplete?: () => void;
}

export interface AnimateRiffleShuffleInput {
    scene: Phaser.Scene;
    animationLayer: CardAnimationLayer;
    textureKey: string;
    center: CardMotionPoint;
    size: CardMotionSize;
    count?: number;
    depth?: number;
    onComplete?: () => void;
}

export interface AnimateTransientShuffleDeckInput {
    scene: Phaser.Scene;
    textureKey: string;
    center: CardMotionPoint;
    size: CardMotionSize;
    count?: number;
    depth?: number;
    onComplete?: () => void;
}

export interface AnimateImageMoveInput {
    scene: Phaser.Scene;
    image: Phaser.GameObjects.Image;
    target: CardMotionPoint;
    targetAngle?: number;
    scaleX?: number;
    scaleY?: number;
    duration: number;
    delay?: number;
    ease: string;
    onComplete?: () => void;
}

export interface CreateCardMotionImageInput {
    scene: Phaser.Scene;
    textureKey: string;
    center: CardMotionPoint;
    size: CardMotionSize;
    angle?: number;
    depth?: number;
    alpha?: number;
    storeDisplaySize?: boolean;
}

export interface AnimateImageHorizontalFlipInput {
    scene: Phaser.Scene;
    image: Phaser.GameObjects.Image;
    size: CardMotionSize;
    revealInDuration?: number;
    revealOutDuration?: number;
    onMidpoint: () => void;
    onComplete?: () => void;
}

export interface ImageCollectMotionItem {
    image: Phaser.GameObjects.Image;
    target: CardMotionPoint;
    targetAngle?: number;
    delay?: number;
    duration?: number;
    ease?: string;
    peakScale?: number;
    landingScale?: number;
}

export interface AnimateImageCollectMotionsInput {
    scene: Phaser.Scene;
    items: readonly ImageCollectMotionItem[];
    landingDuration?: number;
    destroyDelay?: number;
    onItemLanded?: (item: ImageCollectMotionItem) => void;
    onComplete?: () => void;
}

export interface AnimateCardHoldHighlightInput {
    scene: Phaser.Scene;
    image: Phaser.GameObjects.Image;
    width: number;
    height: number;
    duration: number;
    color?: number;
    strokeAlpha?: number;
}

export function animateGhostMoveReveal(
    input: AnimateGhostMoveRevealInput,
): Phaser.GameObjects.Image {
    const {
        scene,
        animationLayer,
        backTextureKey,
        faceTextureKey,
        source,
        target,
        size,
        sourceAngle = 0,
        targetAngle = 0,
        depth = 0,
        moveDuration = 760,
        revealInDuration = 120,
        revealOutDuration = 120,
        onMoveComplete,
        onComplete,
    } = input;
    const ghost = animationLayer.createGhostCard({
        textureKey: backTextureKey,
        x: source.x,
        y: source.y,
        width: size.width,
        height: size.height,
        angle: sourceAngle,
        depth,
    });

    scene.tweens.add({
        targets: ghost.image,
        x: target.x,
        y: target.y,
        angle: targetAngle,
        duration: moveDuration,
        ease: 'Cubic.easeInOut',
        onComplete: () => {
            onMoveComplete?.();
            animateImageHorizontalFlip({
                scene,
                image: ghost.image,
                size,
                revealInDuration,
                revealOutDuration,
                onMidpoint: () => {
                    ghost.image.setTexture(faceTextureKey);
                },
                onComplete,
            });
        },
    });

    return ghost.image;
}

export function createCardMotionImage(input: CreateCardMotionImageInput): Phaser.GameObjects.Image {
    const {
        scene,
        textureKey,
        center,
        size,
        angle = 0,
        depth = 0,
        alpha = 1,
        storeDisplaySize = true,
    } = input;
    const image = scene.add
        .image(center.x, center.y, textureKey)
        .setDisplaySize(size.width, size.height)
        .setAngle(angle)
        .setDepth(depth)
        .setAlpha(alpha);

    if (storeDisplaySize) {
        image.setData('cardDisplaySize', {
            width: size.width,
            height: size.height,
        } satisfies CardMotionSize);
    }

    return image;
}

export function animateImageMove(input: AnimateImageMoveInput): void {
    const {
        scene,
        image,
        target,
        targetAngle = image.angle,
        scaleX = image.scaleX,
        scaleY = image.scaleY,
        duration,
        delay = 0,
        ease,
        onComplete,
    } = input;

    scene.tweens.add({
        targets: image,
        x: target.x,
        y: target.y,
        angle: targetAngle,
        scaleX,
        scaleY,
        duration,
        delay,
        ease,
        onComplete,
    });
}

export function animateImageHorizontalFlip(input: AnimateImageHorizontalFlipInput): void {
    const {
        scene,
        image,
        size,
        revealInDuration = 130,
        revealOutDuration = 130,
        onMidpoint,
        onComplete,
    } = input;

    scene.tweens.add({
        targets: image,
        displayWidth: 2,
        duration: revealInDuration,
        ease: 'Sine.easeIn',
        onComplete: () => {
            onMidpoint();
            image.displayWidth = 2;
            image.displayHeight = size.height;
            scene.tweens.add({
                targets: image,
                displayWidth: size.width,
                duration: revealOutDuration,
                ease: 'Sine.easeOut',
                onComplete: () => {
                    image.setDisplaySize(size.width, size.height);
                    onComplete?.();
                },
            });
        },
    });
}

export function animateImageCollectMotions(input: AnimateImageCollectMotionsInput): void {
    const {
        scene,
        items,
        landingDuration = 80,
        destroyDelay = 140,
        onItemLanded,
        onComplete,
    } = input;
    if (items.length === 0) {
        onComplete?.();
        return;
    }

    let landedCount = 0;
    const landedImages: Phaser.GameObjects.Image[] = [];

    items.forEach((item, index) => {
        const baseScaleX = item.image.scaleX;
        const baseScaleY = item.image.scaleY;
        const landingY = item.target.y;
        scene.tweens.add({
            targets: item.image,
            x: item.target.x,
            y: landingY - 6,
            angle: item.targetAngle ?? item.image.angle,
            scaleX: (item.peakScale ?? 1) * baseScaleX,
            scaleY: (item.peakScale ?? 1) * baseScaleY,
            duration: item.duration ?? 330,
            delay: item.delay ?? 0,
            ease: item.ease ?? 'Cubic.easeInOut',
            onComplete: () => {
                scene.tweens.add({
                    targets: item.image,
                    y: landingY,
                    scaleX: (item.landingScale ?? 1) * baseScaleX,
                    scaleY: (item.landingScale ?? 1) * baseScaleY,
                    duration: landingDuration,
                    ease: 'Back.easeOut',
                    onComplete: () => {
                        landedImages.push(item.image);
                        onItemLanded?.(item);
                        landedCount += 1;
                        if (landedCount !== items.length) {
                            return;
                        }

                        scene.time.delayedCall(destroyDelay, () => {
                            landedImages.forEach((image) => {
                                image.destroy();
                            });
                            onComplete?.();
                        });
                    },
                });
            },
        });
        item.image.setDepth(142 + index);
    });
}

export function animateCardHoldHighlight(
    input: AnimateCardHoldHighlightInput,
): Phaser.GameObjects.Rectangle {
    const { scene, image, width, height, duration, color = 0xffd166, strokeAlpha = 0.96 } = input;
    const highlight = scene.add
        .rectangle(image.x, image.y, width, height, 0x000000, 0)
        .setAngle(image.angle)
        .setStrokeStyle(3, color, strokeAlpha)
        .setDepth(image.depth + 1)
        .setScale(0.92);

    scene.tweens.add({
        targets: highlight,
        scaleX: 1.18,
        scaleY: 1.18,
        alpha: 0.18,
        duration: Math.max(180, duration - 80),
        ease: 'Sine.easeOut',
    });

    return highlight;
}

export function animateGhostArcMove(input: AnimateGhostArcMoveInput): Phaser.GameObjects.Image {
    const {
        scene,
        animationLayer,
        textureKey,
        source,
        controlIn,
        target,
        size,
        sourceAngle = 0,
        targetAngle = 0,
        depth = 0,
        duration = 780,
        onComplete,
    } = input;
    const ghost = animationLayer.createGhostCard({
        textureKey,
        x: source.x,
        y: source.y,
        width: size.width,
        height: size.height,
        angle: sourceAngle,
        depth,
    });
    const progress = { t: 0 };
    const controlOut = {
        x: target.x,
        y: target.y,
    };

    scene.tweens.add({
        targets: progress,
        t: 1,
        duration,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
            const point = getCubicBezierPoint(source, controlIn, controlOut, target, progress.t);
            ghost.image.setPosition(point.x, point.y);
            ghost.image.setAngle(sourceAngle + progress.t * (targetAngle - sourceAngle));
        },
        onComplete: () => {
            ghost.image.setPosition(target.x, target.y);
            ghost.image.setAngle(targetAngle);
            ghost.image.setDisplaySize(size.width, size.height);
            onComplete?.();
        },
    });

    return ghost.image;
}

export function animateDealReveal(input: AnimateDealRevealInput): Phaser.GameObjects.Image {
    const {
        scene,
        animationLayer,
        backTextureKey,
        faceTextureKey,
        source,
        target,
        size,
        sourceAngle = 0,
        targetAngle = 0,
        depth = 0,
        dealDuration = 520,
        revealDelay = 320,
        onLanded,
        onComplete,
    } = input;
    const ghost = animationLayer.createGhostCard({
        textureKey: backTextureKey,
        x: source.x,
        y: source.y,
        width: size.width,
        height: size.height,
        angle: sourceAngle,
        depth,
    });

    scene.tweens.add({
        targets: ghost.image,
        x: target.x,
        y: target.y,
        angle: targetAngle,
        duration: dealDuration,
        ease: 'Cubic.easeOut',
        onComplete: () => {
            onLanded?.();
            scene.time.delayedCall(revealDelay, () => {
                animateImageHorizontalFlip({
                    scene,
                    image: ghost.image,
                    size,
                    onMidpoint: () => {
                        ghost.image.setTexture(faceTextureKey);
                    },
                    onComplete,
                });
            });
        },
    });

    return ghost.image;
}

export function animateLayerStack(input: AnimateLayerStackInput): Phaser.GameObjects.Image[] {
    const {
        scene,
        animationLayer,
        textureKey,
        origin,
        size,
        count,
        depth = 0,
        delayStep = 90,
        duration = 260,
        onComplete,
    } = input;
    const ghosts: Phaser.GameObjects.Image[] = [];
    let completedCount = 0;

    Array.from({ length: count }).forEach((_, index) => {
        const ghost = animationLayer.createGhostCard({
            textureKey,
            x: origin.x,
            y: origin.y,
            width: size.width,
            height: size.height,
            angle: 0,
            alpha: 0,
            depth: depth + index,
        });
        ghosts.push(ghost.image);

        scene.tweens.add({
            targets: ghost.image,
            x: origin.x + index * 8,
            y: origin.y + index * 5,
            angle: -8 + index * 4,
            alpha: 1,
            delay: index * delayStep,
            duration,
            ease: 'Back.easeOut',
            onComplete: () => {
                completedCount += 1;
                if (completedCount === count) {
                    onComplete?.();
                }
            },
        });
    });

    return ghosts;
}

export function animateCollectPile(input: AnimateCollectPileInput): Phaser.GameObjects.Image[] {
    const { scene, animationLayer, cards, delayStep = 110, duration = 420, onComplete } = input;
    const ghosts: Phaser.GameObjects.Image[] = [];
    let completedCount = 0;

    cards.forEach((card, index) => {
        const ghost = animationLayer.createGhostCard({
            textureKey: card.textureKey,
            x: card.source.x,
            y: card.source.y,
            width: card.size.width,
            height: card.size.height,
            angle: card.sourceAngle ?? 0,
            alpha: 1,
            depth: card.depth ?? 0,
        });
        ghosts.push(ghost.image);

        scene.tweens.add({
            targets: ghost.image,
            x: card.target.x,
            y: card.target.y,
            angle: card.targetAngle ?? 0,
            delay: index * delayStep,
            duration,
            ease: 'Cubic.easeInOut',
            onComplete: () => {
                ghost.image.setDisplaySize(card.size.width, card.size.height);
                completedCount += 1;
                if (completedCount === cards.length) {
                    onComplete?.();
                }
            },
        });
    });

    if (cards.length === 0) {
        onComplete?.();
    }

    return ghosts;
}

export function animateRiffleShuffle(input: AnimateRiffleShuffleInput): Phaser.GameObjects.Image[] {
    const {
        scene,
        animationLayer,
        textureKey,
        center,
        size,
        count = 10,
        depth = 50,
        onComplete,
    } = input;
    const ghosts = Array.from({ length: count }, (_, index) => {
        const midpoint = count / 2;
        const isLeftPacket = index < midpoint;
        return animationLayer.createGhostCard({
            textureKey,
            x: isLeftPacket ? center.x - 50 - index * 3 : center.x + 50 + (index - midpoint) * 3,
            y: center.y + (index % midpoint) * 2,
            width: size.width,
            height: size.height,
            angle: isLeftPacket ? -16 : 16,
            alpha: 1,
            depth: depth + index,
        }).image;
    });
    let completedCount = 0;

    ghosts.forEach((ghost, index) => {
        const riffleIndex = index % Math.max(1, count / 2);
        scene.tweens.add({
            targets: ghost,
            x: center.x - 2 + (index - (count - 1) / 2) * 3,
            y: center.y + riffleIndex * 3,
            angle: -7 + index * 1.5,
            delay: riffleIndex * 80,
            duration: 330,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                scene.tweens.add({
                    targets: ghost,
                    x: center.x + index * 1.2,
                    y: center.y + index * 1.5,
                    angle: -4 + index * 0.8,
                    duration: 220,
                    ease: 'Back.easeOut',
                    onComplete: () => {
                        ghost.setDisplaySize(size.width, size.height);
                        completedCount += 1;
                        if (completedCount === ghosts.length) {
                            onComplete?.();
                        }
                    },
                });
            },
        });
    });

    return ghosts;
}

export function animateTransientShuffleDeck(
    input: AnimateTransientShuffleDeckInput,
): Phaser.GameObjects.Image[] {
    const { scene, textureKey, center, size, count = 8, depth = 132, onComplete } = input;
    const cards = Array.from({ length: count }, (_, index) => {
        return createCardMotionImage({
            scene,
            textureKey,
            center,
            size,
            depth: depth + index,
            angle: index % 2 === 0 ? -2 : 2,
        });
    });
    let completedCount = 0;

    cards.forEach((card, index) => {
        const side = index % 2 === 0 ? -1 : 1;
        const cutX = center.x + side * (34 + (index % 4) * 5);
        const cutY = center.y + (index - cards.length / 2) * 2;
        const bridgeX = center.x - side * (10 + (index % 3) * 4);
        const bridgeY = center.y - 8 + (index % 4) * 4;
        const delay = index * 42;

        scene.tweens.add({
            targets: card,
            x: cutX,
            y: cutY,
            angle: side * (10 + (index % 3) * 2),
            duration: 170,
            delay,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                scene.tweens.add({
                    targets: card,
                    x: bridgeX,
                    y: bridgeY,
                    angle: -side * (5 + (index % 2) * 3),
                    duration: 210,
                    ease: 'Sine.easeInOut',
                    onComplete: () => {
                        scene.tweens.add({
                            targets: card,
                            x: center.x,
                            y: center.y,
                            angle: 0,
                            scaleX: card.scaleX * 0.94,
                            scaleY: card.scaleY * 1.04,
                            duration: 140,
                            ease: 'Back.easeOut',
                            onComplete: () => {
                                completedCount += 1;
                                card.destroy();
                                if (completedCount === cards.length) {
                                    onComplete?.();
                                }
                            },
                        });
                    },
                });
            },
        });
    });

    return cards;
}

function getCubicBezierPoint(
    start: CardMotionPoint,
    controlIn: CardMotionPoint,
    controlOut: CardMotionPoint,
    end: CardMotionPoint,
    t: number,
): CardMotionPoint {
    const inverse = 1 - t;

    return {
        x:
            inverse * inverse * inverse * start.x +
            3 * inverse * inverse * t * controlIn.x +
            3 * inverse * t * t * controlOut.x +
            t * t * t * end.x,
        y:
            inverse * inverse * inverse * start.y +
            3 * inverse * inverse * t * controlIn.y +
            3 * inverse * t * t * controlOut.y +
            t * t * t * end.y,
    };
}
