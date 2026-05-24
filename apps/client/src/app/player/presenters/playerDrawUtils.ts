import * as Phaser from 'phaser';

export const GOLD = 0xffd166;
export const CREAM = '#f6ecd2';
export const DIM = 'rgba(246,236,210,0.72)';

export interface CardDisplaySize {
    width: number;
    height: number;
}

export function createRoundedPanel(
    scene: Phaser.Scene,
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    radius: number,
    fillColor: number,
    fillAlpha: number,
    strokeColor?: number,
    strokeWidth = 1,
    strokeAlpha = 0,
): Phaser.GameObjects.Graphics {
    const panel = scene.add.graphics();
    panel.fillStyle(fillColor, fillAlpha);
    panel.fillRoundedRect(centerX - width / 2, centerY - height / 2, width, height, radius);
    if (strokeColor !== undefined && strokeAlpha > 0) {
        panel.lineStyle(strokeWidth, strokeColor, strokeAlpha);
        panel.strokeRoundedRect(centerX - width / 2, centerY - height / 2, width, height, radius);
    }
    return panel;
}

export interface CapturePileWidgetOptions {
    x: number;
    y: number;
    cardCount: number;
    backTextureKey: string;
    cardW: number;
    cardH: number;
}

export function drawCapturePileWidget(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    opts: CapturePileWidgetOptions,
): void {
    const { x, y, cardCount, backTextureKey, cardW, cardH } = opts;
    if (cardCount > 0) {
        let stackCount = 1;
        if (cardCount > 7) stackCount = 3;
        else if (cardCount > 3) stackCount = 2;
        for (let i = stackCount - 1; i >= 0; i--) {
            const back = scene.add
                .image(x - i * 2, y - i * 2, backTextureKey)
                .setDisplaySize(cardW, cardH)
                .setAlpha(0.6 + i * 0.14);
            layer.add(back);
        }
        layer.add(
            scene.add
                .text(x + cardW / 2 - 2, y - cardH / 2 + 2, String(cardCount), {
                    fontFamily: 'Arial',
                    fontSize: '9px',
                    fontStyle: '700',
                    color: '#ffffff',
                    backgroundColor: 'rgba(30,100,50,0.88)',
                    padding: { x: 3, y: 1 },
                })
                .setOrigin(1, 0),
        );
    } else {
        const g = scene.add.graphics();
        g.lineStyle(1, 0x4d7c5a, 0.35);
        g.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 5);
        layer.add(g);
    }
    layer.add(
        scene.add
            .text(x, y + cardH / 2 + 5, 'Won', {
                fontFamily: 'Arial',
                fontSize: '9px',
                color: cardCount > 0 ? 'rgba(100,220,140,0.86)' : 'rgba(100,180,120,0.38)',
            })
            .setOrigin(0.5, 0),
    );
}

export function setCardDisplaySize(
    image: Phaser.GameObjects.Image,
    width: number,
    height: number,
): void {
    image.setDisplaySize(width, height);
    image.setData('cardDisplaySize', { width, height } satisfies CardDisplaySize);
}
