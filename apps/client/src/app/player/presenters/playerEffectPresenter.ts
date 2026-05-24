import * as Phaser from 'phaser';

import type { MoveCardEffect, CardGameEffectReason } from '@engine/engine/game/effects';
import { isMoveCardEffect } from '@engine/engine/game/effects';
import type { CardGameViewModel } from '@engine/engine/game/viewModel';
import { getCardFaceTextureKey } from '../../phaser/cards/CardTextureFactory';
import type { CardAnimationLayer } from '../../phaser/scenes/animations/cardAnimationLayer';
import { sfxPlayer } from '../../../audio/sfxPlayer';
import { PLAYER_GAME_WIDTH } from '../createPlayerGame';
import {
    getHandCardPoint,
    getOpponentFanCardPoint,
    getOpponentFanCenter,
    getOpponentSeatLayouts,
    getStockTrumpPoint,
    getTableRowCardPoint,
    getTrickCardPoint,
    getWarBattleCardPoint,
    playerPovCardSizes,
    playerPovZones,
} from '../playerPovLayout';
import { getPlayerPovSeatSide, parsePlayerCounters } from '../playerPovUiModel';

const HAND_CARD_W = playerPovCardSizes.hand.width;
const HAND_CARD_H = playerPovCardSizes.hand.height;
const TABLE_CARD_W = playerPovCardSizes.table.width;
const TABLE_CARD_H = playerPovCardSizes.table.height;

const DEAL_MAX_STEP_MS = 88;
const DEAL_TARGET_TOTAL_MS = 1500;

interface EffectAnimProfile {
    duration: number;
    delayStep: number;
    ease: string;
    peakScale: number;
}

function getDealDelayStep(dealCount: number): number {
    if (dealCount <= 1) return DEAL_MAX_STEP_MS;
    return Math.min(DEAL_MAX_STEP_MS, Math.floor(DEAL_TARGET_TOTAL_MS / dealCount));
}

function getEffectProfile(reason: CardGameEffectReason, dealDelayStep = DEAL_MAX_STEP_MS): EffectAnimProfile {
    switch (reason) {
        case 'deal': return { duration: 310, delayStep: dealDelayStep, ease: 'Quart.easeOut', peakScale: 2.5 };
        case 'draw': return { duration: 220, delayStep: 42, ease: 'Cubic.easeOut', peakScale: 1.8 };
        case 'play': return { duration: 260, delayStep: 60, ease: 'Back.easeOut', peakScale: 1 };
        case 'collect': return { duration: 300, delayStep: 48, ease: 'Cubic.easeIn', peakScale: 1 };
    }
}

function computeEffectDelays(effects: readonly MoveCardEffect[]): number[] {
    const dealCount = effects.filter((e) => e.reason === 'deal').length;
    const dealDelayStep = getDealDelayStep(dealCount);
    const delays: number[] = [];
    let groupStartDelay = 0;
    let groupReason: CardGameEffectReason | null = null;
    let groupIndex = 0;
    let previousProfile = getEffectProfile('deal', dealDelayStep);

    effects.forEach((effect) => {
        const profile = getEffectProfile(effect.reason, dealDelayStep);
        if (groupReason !== null && groupReason !== effect.reason) {
            groupStartDelay += previousProfile.duration + (groupIndex - 1) * previousProfile.delayStep + 120;
            groupIndex = 0;
        }
        delays.push(groupStartDelay + groupIndex * profile.delayStep + (effect.delayMs ?? 0));
        groupReason = effect.reason;
        groupIndex += 1;
        previousProfile = profile;
    });

    return delays;
}

export interface PlayerEffectContext {
    animationLayer: CardAnimationLayer;
    skinId: string;
    backTextureKey: string;
    localPlayerDeckPoint: { x: number; y: number } | null;
    stockPilePoint: { x: number; y: number } | null;
}

export function presentMoveEffects(
    scene: Phaser.Scene,
    viewModel: CardGameViewModel,
    ctx: PlayerEffectContext,
    currentBatchKey: string,
    onBatchKeyChange: (key: string) => void,
    onAnimationDone: () => void,
): void {
    const effects = viewModel.effects.filter(isMoveCardEffect);
    const effectBatchKey = effects.map((e) => e.key).join('|');

    if (!effectBatchKey) {
        onBatchKeyChange('');
        return;
    }
    if (effectBatchKey === currentBatchKey) {
        return;
    }

    onBatchKeyChange(effectBatchKey);

    const delays = computeEffectDelays(effects);
    const dealCount = effects.filter((e) => e.reason === 'deal').length;
    const dealDelayStep = getDealDelayStep(dealCount);

    let scheduledCount = 0;
    let completedCount = 0;
    const onEffectDone = () => {
        completedCount += 1;
        if (completedCount === scheduledCount) {
            onAnimationDone();
        }
    };

    effects.forEach((effect, index) => {
        const points = getMoveEffectPoints(effect, viewModel, ctx);
        if (!points) return;

        scheduledCount += 1;
        const profile = getEffectProfile(effect.reason, dealDelayStep);
        const ghostSize = getGhostSizeForEffect(effect, viewModel);
        animateMoveGhost(scene, effect, points.from, points.to, profile, delays[index] ?? 0, ghostSize, ctx, onEffectDone);
    });

    if (scheduledCount === 0) {
        scene.time.delayedCall(0, onAnimationDone);
    }
}

function getGhostSizeForEffect(
    effect: MoveCardEffect,
    viewModel: CardGameViewModel,
): { width: number; height: number } {
    if (effect.toOwnerId) {
        const playerIndex = viewModel.players.findIndex((p) => p.id === effect.toOwnerId);
        return playerIndex === 0
            ? { width: HAND_CARD_W, height: HAND_CARD_H }
            : { width: playerPovCardSizes.opponent.width, height: playerPovCardSizes.opponent.height };
    }
    return { width: TABLE_CARD_W, height: TABLE_CARD_H };
}

function getMoveEffectPoints(
    effect: MoveCardEffect,
    viewModel: CardGameViewModel,
    ctx: PlayerEffectContext,
): { from: { x: number; y: number }; to: { x: number; y: number; angle: number } } | null {
    const from = getEffectSourcePoint(effect, viewModel, ctx);
    const to = getEffectDestinationPoint(effect, viewModel);
    if (!from || !to) return null;
    return { from, to };
}

function getEffectSourcePoint(
    effect: MoveCardEffect,
    viewModel: CardGameViewModel,
    ctx: PlayerEffectContext,
): { x: number; y: number } | null {
    if (effect.fromOwnerId) {
        const playerIndex = viewModel.players.findIndex((p) => p.id === effect.fromOwnerId);
        if (playerIndex === 0 && ctx.localPlayerDeckPoint && (viewModel.players[0]?.hand.length ?? 0) === 0) {
            return ctx.localPlayerDeckPoint;
        }
        return getPlayerHandPoint(viewModel, effect.fromOwnerId, effect.fromIndex ?? 0);
    }

    if (effect.fromPileId === 'stock' || effect.fromPileId === 'draw') {
        return ctx.stockPilePoint ?? { x: PLAYER_GAME_WIDTH / 2, y: playerPovZones.gameInfoY + 60 };
    }

    if ((viewModel.tablePileIds ?? []).includes(effect.fromPileId)) {
        return getTableCardPoint(viewModel, effect.fromIndex ?? 0);
    }

    return { x: PLAYER_GAME_WIDTH / 2, y: playerPovZones.stockTrumpY };
}

function getEffectDestinationPoint(
    effect: MoveCardEffect,
    viewModel: CardGameViewModel,
): { x: number; y: number; angle: number } | null {
    if (effect.toOwnerId) {
        const point = getPlayerHandPoint(viewModel, effect.toOwnerId, effect.toIndex ?? 0);
        return point ? { ...point, angle: 0 } : null;
    }

    if ((viewModel.tablePileIds ?? []).includes(effect.toPileId)) {
        if (viewModel.tablePresentation === 'trick-seats' && effect.fromOwnerId) {
            const alreadyOnTable = viewModel.tableCards.some(
                (c) => c.id === effect.card.id || (c.sourceCardIds ?? []).includes(effect.card.id),
            );
            if (!alreadyOnTable) {
                return getTrickCardPoint(getPlayerPovSeatSide(viewModel, effect.fromOwnerId));
            }
        }
        return getTableCardPoint(viewModel, effect.toIndex ?? viewModel.tableCards.length - 1, effect.card.id);
    }

    if (effect.toPileId === 'stock' || effect.toPileId === 'draw') {
        const stockPoint = getStockTrumpPoint();
        return { x: stockPoint.x + 20, y: stockPoint.y - 2, angle: 0 };
    }

    return null;
}

function getPlayerHandPoint(
    viewModel: CardGameViewModel,
    playerId: string,
    index: number,
): { x: number; y: number; angle: number } | null {
    const playerIndex = viewModel.players.findIndex((p) => p.id === playerId);
    if (playerIndex < 0) return null;

    if (playerIndex === 0) {
        const cards = viewModel.players[0]?.hand ?? [];
        return getHandCardPoint({ cardCount: cards.length, index });
    }

    const positions = getOpponentSeatLayouts(Math.max(viewModel.players.length - 1, 0));
    const opponentPosition = positions[playerIndex - 1];
    if (!opponentPosition) return null;

    const player = viewModel.players[playerIndex];
    const fanCount = Math.min(parsePlayerCounters(player?.metaLabel ?? '').cards, 8);
    const { cx, cy } = getOpponentFanCenter(opponentPosition, fanCount);
    const pt = getOpponentFanCardPoint(fanCount, index, cx, cy, opponentPosition.side as 'top' | 'left' | 'right');
    return { x: pt.x, y: pt.y, angle: pt.angle };
}

function getTableCardPoint(
    viewModel: CardGameViewModel,
    index: number,
    cardId?: string,
): { x: number; y: number; angle: number } {
    const tableCard = cardId
        ? viewModel.tableCards.find((c) => c.id === cardId || (c.sourceCardIds ?? []).includes(cardId))
        : viewModel.tableCards[index];

    if (tableCard && viewModel.tablePresentation === 'trick-seats') {
        return getTrickCardPoint(getPlayerPovSeatSide(viewModel, tableCard.playerId));
    }
    if (tableCard && viewModel.tablePresentation === 'battle-formation') {
        return getWarCardPoint(tableCard, viewModel);
    }
    return getTableRowCardPoint({ cardCount: viewModel.tableCards.length, index });
}

function getWarCardPoint(
    card: { id: string; playerId?: string; isFaceUp?: boolean },
    viewModel: CardGameViewModel,
): { x: number; y: number; angle: number } {
    const localPlayerId = viewModel.players[0]?.id ?? '';
    let fdIndex = 0;
    for (const c of viewModel.tableCards) {
        if (c.id === card.id) break;
        if (c.playerId === card.playerId && !c.isFaceUp) fdIndex++;
    }
    const side = card.playerId === localPlayerId ? 'bottom' : 'top';
    return getWarBattleCardPoint(side, card.isFaceUp === true, fdIndex);
}

function animateMoveGhost(
    scene: Phaser.Scene,
    effect: MoveCardEffect,
    from: { x: number; y: number },
    to: { x: number; y: number; angle: number },
    profile: EffectAnimProfile,
    delay: number,
    ghostSize: { width: number; height: number },
    ctx: PlayerEffectContext,
    onComplete?: () => void,
): void {
    const shouldFlip = effect.card.isFaceUp && effect.fromFaceUp === false;
    const textureKey =
        effect.card.isFaceUp && !shouldFlip
            ? getCardFaceTextureKey(effect.card.id, ctx.skinId, 'compact')
            : ctx.backTextureKey;

    const ghost = ctx.animationLayer.createGhostCard({
        textureKey,
        x: from.x,
        y: from.y,
        width: ghostSize.width,
        height: ghostSize.height,
        alpha: 0.94,
        depth: 90,
    });

    const baseScaleX = ghost.image.scaleX;
    const baseScaleY = ghost.image.scaleY;

    scene.tweens.add({
        targets: ghost.image,
        x: to.x,
        y: to.y,
        angle: to.angle,
        scaleX: baseScaleX * profile.peakScale,
        scaleY: baseScaleY * profile.peakScale,
        alpha: 0.96,
        duration: profile.duration,
        delay,
        ease: profile.ease,
        onComplete: () => {
            ghost.image.setDisplaySize(ghostSize.width, ghostSize.height);
            sfxPlayer.play(effect.reason);
            if (shouldFlip) {
                animateCardFlip(scene, ghost.image, effect.card.id, ctx.skinId, ghostSize, () => {
                    ghost.destroy();
                    onComplete?.();
                });
            } else {
                scene.tweens.add({
                    targets: ghost.image,
                    alpha: 0,
                    duration: 80,
                    delay: 50,
                    onComplete: () => {
                        ghost.destroy();
                        onComplete?.();
                    },
                });
            }
        },
    });
}

function animateCardFlip(
    scene: Phaser.Scene,
    image: Phaser.GameObjects.Image,
    cardId: string,
    skinId: string,
    size: { width: number; height: number },
    onComplete: () => void,
): void {
    scene.tweens.add({
        targets: image,
        displayWidth: 2,
        duration: 110,
        ease: 'Sine.easeIn',
        onComplete: () => {
            sfxPlayer.play('flip');
            image.setTexture(getCardFaceTextureKey(cardId, skinId, 'compact'));
            image.displayWidth = 2;
            image.displayHeight = size.height;
            scene.tweens.add({
                targets: image,
                displayWidth: size.width,
                duration: 140,
                ease: 'Sine.easeOut',
                onComplete: () => {
                    image.setDisplaySize(size.width, size.height);
                    scene.tweens.add({
                        targets: image,
                        alpha: 0,
                        duration: 80,
                        delay: 100,
                        onComplete,
                    });
                },
            });
        },
    });
}
