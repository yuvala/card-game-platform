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

export function setCardDisplaySize(
    image: Phaser.GameObjects.Image,
    width: number,
    height: number,
): void {
    image.setDisplaySize(width, height);
    image.setData('cardDisplaySize', { width, height } satisfies CardDisplaySize);
}
