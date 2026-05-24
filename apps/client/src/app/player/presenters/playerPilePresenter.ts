import * as Phaser from 'phaser';

import type { CardGameViewModel, CardGameViewCard } from '@engine/engine/game/viewModel';
import { getCardFaceTextureKey } from '../../phaser/cards/CardTextureFactory';
import { PLAYER_GAME_WIDTH } from '../createPlayerGame';
import { playerPovCardSizes, playerPovZones, getStockTrumpPoint } from '../playerPovLayout';
import { getPileByRole, type PlayerPovPresentation } from '../playerPovPresentation';
import { CREAM, DIM, createRoundedPanel, setCardDisplaySize } from './playerDrawUtils';

const STOCK_W = playerPovCardSizes.stockTrump.width;
const STOCK_H = playerPovCardSizes.stockTrump.height;

function getCardTexture(
    card: Pick<CardGameViewCard, 'id' | 'isFaceUp'>,
    backTextureKey: string,
    skinId: string,
): string {
    if (!card.isFaceUp) return backTextureKey;
    return getCardFaceTextureKey(card.id, skinId, 'compact');
}

export function drawCenterStockPile(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    viewModel: CardGameViewModel,
    backTextureKey: string,
): { x: number; y: number } | null {
    const stockPile = getPileByRole(viewModel, 'stock') ?? getPileByRole(viewModel, 'draw');
    if (!stockPile || stockPile.cardCount === 0) {
        return null;
    }

    const cx = PLAYER_GAME_WIDTH / 2;
    const cy = 222;
    const w = STOCK_W;
    const h = STOCK_H;

    layer.add(
        createRoundedPanel(scene, cx, cy, w + 20, h + 16, 12, 0x082417, 0.72, 0x4d7cc9, 1, 0.3),
    );

    for (let i = 2; i >= 0; i--) {
        const back = scene.add
            .image(cx - i * 2, cy + i * 2, backTextureKey)
            .setDisplaySize(w, h)
            .setAlpha(0.6 + i * 0.13)
            .setAngle(-3 + i * 3);
        setCardDisplaySize(back, w, h);
        layer.add(back);
    }

    layer.add(
        scene.add
            .text(cx + w / 2 - 2, cy - h / 2 + 2, String(stockPile.cardCount), {
                fontFamily: 'Arial',
                fontSize: '10px',
                fontStyle: '700',
                color: '#ffffff',
                backgroundColor: 'rgba(0,0,0,0.78)',
                padding: { x: 3, y: 2 },
            })
            .setOrigin(1, 0)
            .setDepth(32),
    );

    return { x: cx, y: cy };
}

export function drawCenterDeckWidget(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    viewModel: CardGameViewModel,
    presentation: PlayerPovPresentation,
    backTextureKey: string,
    skinId: string,
): { x: number; y: number } | null {
    const drawPile = getPileByRole(viewModel, 'draw');
    const discardPile = getPileByRole(viewModel, 'discard');
    if (!drawPile && !discardPile) {
        return null;
    }

    const cy = 252;
    const drawX = PLAYER_GAME_WIDTH / 2 - 38;
    const discardX = PLAYER_GAME_WIDTH / 2 + 38;
    const w = STOCK_W;
    const h = STOCK_H;

    layer.add(
        createRoundedPanel(
            scene,
            PLAYER_GAME_WIDTH / 2,
            cy,
            w * 2 + 52,
            h + 18,
            14,
            0x082417,
            0.82,
            0x5ea65d,
            1,
            0.22,
        ),
    );

    if (drawPile) {
        for (let i = 2; i >= 0; i--) {
            const back = scene.add
                .image(drawX - i * 2, cy - i, backTextureKey)
                .setDisplaySize(w, h)
                .setAngle(-2 + i * 2)
                .setAlpha(drawPile.cardCount > 0 ? 0.82 : 0.25);
            setCardDisplaySize(back, w, h);
            layer.add(back);
        }
        layer.add(
            scene.add
                .text(drawX + w / 2 - 2, cy - h / 2 + 2, String(drawPile.cardCount), {
                    fontFamily: 'Arial',
                    fontSize: '10px',
                    fontStyle: '700',
                    color: '#ffffff',
                    backgroundColor: 'rgba(0,0,0,0.72)',
                    padding: { x: 3, y: 2 },
                })
                .setOrigin(1, 0)
                .setDepth(32),
        );
        layer.add(
            scene.add
                .text(drawX, cy + h / 2 + 7, presentation.infoPrimaryValue, {
                    fontFamily: 'Arial',
                    fontSize: '9px',
                    color: DIM,
                })
                .setOrigin(0.5, 0),
        );
    }

    if (discardPile?.topCard) {
        const discardCard = scene.add
            .image(discardX, cy, getCardTexture(discardPile.topCard, backTextureKey, skinId))
            .setDisplaySize(w, h)
            .setAngle(3);
        setCardDisplaySize(discardCard, w, h);
        layer.add(discardCard);
    } else {
        layer.add(
            createRoundedPanel(scene, discardX, cy, w, h, 5, 0x0b2118, 0.35, 0x7fb896, 1, 0.22),
        );
    }

    layer.add(
        scene.add
            .text(discardX, cy + h / 2 + 7, presentation.infoSecondaryValue, {
                fontFamily: 'Arial',
                fontSize: '9px',
                color: DIM,
            })
            .setOrigin(0.5, 0),
    );

    return { x: drawX, y: cy };
}

export function drawStockTrumpWidget(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    viewModel: CardGameViewModel,
    presentation: PlayerPovPresentation,
    backTextureKey: string,
    skinId: string,
): { x: number; y: number } | null {
    const drawPile = getPileByRole(viewModel, 'draw') ?? getPileByRole(viewModel, 'stock');
    const trumpPile = getPileByRole(viewModel, 'trump');
    if (!drawPile || !trumpPile || !trumpPile.topCard) {
        return null;
    }

    const stockTrumpPoint = getStockTrumpPoint();
    const stockX = stockTrumpPoint.x;
    const centerY = stockTrumpPoint.y;
    const trumpOffset = Math.round(STOCK_H * 0.34);
    const trumpX = stockX + trumpOffset;
    const cardTopY = centerY - Math.round(STOCK_H / 2);
    const labelCenterX = stockX;

    const trumpCard = scene.add
        .image(trumpX, centerY, getCardTexture(trumpPile.topCard, backTextureKey, skinId))
        .setDisplaySize(STOCK_W, STOCK_H)
        .setAngle(90)
        .setAlpha(0.98)
        .setDepth(56);
    setCardDisplaySize(trumpCard, STOCK_W, STOCK_H);
    layer.add(trumpCard);

    for (let i = 2; i >= 0; i--) {
        const back = scene.add
            .image(stockX + i * 2, centerY - i * 2, backTextureKey)
            .setDisplaySize(STOCK_W, STOCK_H)
            .setAlpha(drawPile.cardCount > 0 ? 0.78 + i * 0.08 : 0.24)
            .setAngle(0)
            .setDepth(57 + i);
        setCardDisplaySize(back, STOCK_W, STOCK_H);
        layer.add(back);
    }

    layer.add(
        scene.add
            .text(labelCenterX, cardTopY - 30, 'Trump', {
                fontFamily: 'Arial',
                fontSize: '12px',
                fontStyle: '700',
                color: CREAM,
            })
            .setOrigin(0.5, 1),
    );
    layer.add(
        scene.add
            .text(labelCenterX, cardTopY - 16, presentation.trumpLabel ?? 'spent', {
                fontFamily: 'Arial',
                fontSize: '11px',
                fontStyle: '700',
                color: 'rgba(255,209,102,0.9)',
            })
            .setOrigin(0.5, 1),
    );
    layer.add(
        scene.add
            .text(labelCenterX, cardTopY - 4, drawPile.countLabel.replace(' + trump', ''), {
                fontFamily: 'Arial',
                fontSize: '9px',
                color: DIM,
            })
            .setOrigin(0.5, 1),
    );

    return { x: stockX, y: centerY };
}

export function drawDeckWidget(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    viewModel: CardGameViewModel,
    presentation: PlayerPovPresentation,
    backTextureKey: string,
    skinId: string,
): { x: number; y: number } | null {
    const drawPile = getPileByRole(viewModel, 'draw');
    const discardPile = getPileByRole(viewModel, 'discard');
    if (!drawPile && !discardPile) {
        return null;
    }

    const centerY = playerPovZones.stockTrumpY;
    const centerX = 118;

    layer.add(
        createRoundedPanel(scene, centerX, centerY, 206, 78, 18, 0x082417, 0.57, 0x5ea65d, 1, 0.22),
    );

    if (drawPile) {
        for (let index = 0; index < 3; index += 1) {
            const stockBack = scene.add
                .image(centerX - 64 + index * 3, centerY - index, backTextureKey)
                .setDisplaySize(STOCK_W, STOCK_H)
                .setAngle(-2 + index * 2)
                .setAlpha(drawPile.cardCount > 0 ? 0.82 : 0.25);
            setCardDisplaySize(stockBack, STOCK_W, STOCK_H);
            layer.add(stockBack);
        }
    }

    if (discardPile?.topCard) {
        const discardCard = scene.add
            .image(
                centerX - 10,
                centerY,
                getCardTexture(discardPile.topCard, backTextureKey, skinId),
            )
            .setDisplaySize(STOCK_W, STOCK_H)
            .setAngle(3);
        setCardDisplaySize(discardCard, STOCK_W, STOCK_H);
        layer.add(discardCard);
    } else {
        layer.add(
            createRoundedPanel(
                scene,
                centerX - 10,
                centerY,
                STOCK_W,
                STOCK_H,
                5,
                0x0b2118,
                0.35,
                0x7fb896,
                1,
                0.22,
            ),
        );
    }

    layer.add(
        scene.add
            .text(centerX + 36, centerY - 15, presentation.infoPrimaryLabel, {
                fontFamily: 'Arial',
                fontSize: '11px',
                fontStyle: '700',
                color: CREAM,
            })
            .setOrigin(0, 0.5),
    );
    layer.add(
        scene.add
            .text(centerX + 36, centerY + 3, presentation.infoPrimaryValue, {
                fontFamily: 'Arial',
                fontSize: '10px',
                color: DIM,
            })
            .setOrigin(0, 0.5),
    );
    layer.add(
        scene.add
            .text(centerX + 36, centerY + 20, presentation.infoSecondaryValue, {
                fontFamily: 'Arial',
                fontSize: '9px',
                color: 'rgba(255,209,102,0.86)',
            })
            .setOrigin(0, 0.5),
    );

    return { x: centerX - 64, y: centerY };
}
