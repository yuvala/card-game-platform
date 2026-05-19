import * as Phaser from 'phaser';

import {
    TABLE_CREAM,
    TABLE_CREAM_DIM,
    TABLE_FONT_FAMILY,
    TABLE_GOLD,
    TABLE_TEXT_RESOLUTION,
} from '../layout/constants';
import type { SeatLayout } from '../layout/types';

export interface SeatBadge {
    container: Phaser.GameObjects.Container;
    panel: Phaser.GameObjects.Rectangle;
    iconCircle: Phaser.GameObjects.Arc;
    iconText: Phaser.GameObjects.Text;
    nameText: Phaser.GameObjects.Text;
    metaText: Phaser.GameObjects.Text;
}

export function createSeatBadge(scene: Phaser.Scene, layout: SeatLayout): SeatBadge {
    const isRightAligned = layout.labelAlign === 'right';
    const isCentered = layout.labelAlign === 'center';
    const iconX = isCentered ? -48 : isRightAligned ? 54 : -54;
    const textX = isCentered ? 16 : isRightAligned ? 28 : -30;
    const textOrigin = isCentered ? 0.5 : isRightAligned ? 1 : 0;
    const panel = scene.add
        .rectangle(isCentered ? 0 : isRightAligned ? 10 : -10, 16, 138, 42, 0x071a13, 0.28)
        .setStrokeStyle(1, TABLE_GOLD, 0.08);
    const iconCircle = scene.add
        .circle(iconX, 16, 14, 0x15382c, 0.98)
        .setStrokeStyle(2, 0x5d7b70, 0.95);
    const iconText = scene.add
        .text(iconX, 16, '', {
            fontFamily: TABLE_FONT_FAMILY,
            fontSize: '12px',
            color: TABLE_CREAM,
            fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setResolution(TABLE_TEXT_RESOLUTION);
    const nameText = scene.add
        .text(textX, 6, '', {
            fontFamily: TABLE_FONT_FAMILY,
            fontSize: '16px',
            color: TABLE_CREAM,
            fontStyle: 'bold',
        })
        .setOrigin(textOrigin, 0.5)
        .setResolution(TABLE_TEXT_RESOLUTION);
    const metaText = scene.add
        .text(textX, 24, '', {
            fontFamily: TABLE_FONT_FAMILY,
            fontSize: '11px',
            color: TABLE_CREAM_DIM,
        })
        .setOrigin(textOrigin, 0.5)
        .setResolution(TABLE_TEXT_RESOLUTION);
    const container = scene.add.container(layout.labelX, layout.labelY, [
        panel,
        iconCircle,
        iconText,
        nameText,
        metaText,
    ]);

    return {
        container,
        panel,
        iconCircle,
        iconText,
        nameText,
        metaText,
    };
}
