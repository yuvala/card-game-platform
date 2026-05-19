import * as Phaser from 'phaser';

import { TABLE_CENTER_X } from '../../layout';
import {
    TABLE_CARD_HEIGHT,
    TABLE_CARD_WIDTH,
    TABLE_CREAM,
    TABLE_FONT_FAMILY,
    TABLE_GOLD,
    TABLE_TEXT_RESOLUTION,
} from '../layout/constants';

interface CardDisplaySize {
    width: number;
    height: number;
}

export interface TableCardVisual {
    container: Phaser.GameObjects.Container;
    shadow: Phaser.GameObjects.Rectangle;
    stackBacks: Phaser.GameObjects.Image[];
    image: Phaser.GameObjects.Image;
    outline: Phaser.GameObjects.Graphics;
    stackCountBadge: Phaser.GameObjects.Rectangle;
    stackCountText: Phaser.GameObjects.Text;
    caption: Phaser.GameObjects.Text;
}

export function createTableCardVisual(
    scene: Phaser.Scene,
    backTextureKey: string,
): TableCardVisual {
    const shadow = scene.add.rectangle(
        5,
        8,
        TABLE_CARD_WIDTH + 8,
        TABLE_CARD_HEIGHT + 8,
        0x000000,
        0.22,
    );
    const stackBacks = [
        { x: -10, y: -8 },
        { x: -5, y: -4 },
    ].map((offset) => {
        const back = scene.add
            .image(offset.x, offset.y, backTextureKey)
            .setDisplaySize(TABLE_CARD_WIDTH, TABLE_CARD_HEIGHT)
            .setVisible(false);
        back.setData('cardDisplaySize', {
            width: TABLE_CARD_WIDTH,
            height: TABLE_CARD_HEIGHT,
        } satisfies CardDisplaySize);
        return back;
    });
    const image = scene.add
        .image(0, 0, backTextureKey)
        .setDisplaySize(TABLE_CARD_WIDTH, TABLE_CARD_HEIGHT);
    image.setData('cardDisplaySize', {
        width: TABLE_CARD_WIDTH,
        height: TABLE_CARD_HEIGHT,
    } satisfies CardDisplaySize);
    const outline = scene.add.graphics();
    const stackCountBadge = scene.add
        .rectangle(20, 35, 54, 22, 0x06140f, 0.78)
        .setStrokeStyle(1, TABLE_GOLD, 0.78)
        .setVisible(false);
    const stackCountText = scene.add
        .text(20, 35, '', {
            fontFamily: TABLE_FONT_FAMILY,
            fontSize: '11px',
            color: TABLE_CREAM,
            fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setResolution(TABLE_TEXT_RESOLUTION)
        .setVisible(false);
    const caption = scene.add
        .text(0, -72, '', {
            fontFamily: TABLE_FONT_FAMILY,
            fontSize: '14px',
            color: TABLE_CREAM,
            fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setResolution(TABLE_TEXT_RESOLUTION);
    const container = scene.add
        .container(TABLE_CENTER_X, 392, [
            caption,
            shadow,
            ...stackBacks,
            image,
            outline,
            stackCountBadge,
            stackCountText,
        ])
        .setVisible(false)
        .setDepth(80);

    return {
        container,
        shadow,
        stackBacks,
        image,
        outline,
        stackCountBadge,
        stackCountText,
        caption,
    };
}
