import * as Phaser from "phaser";

import { TABLE_CENTER_X } from "../../layout";
import { TABLE_CARD_HEIGHT, TABLE_CARD_WIDTH } from "../layout/constants";

interface CardDisplaySize {
    width: number;
    height: number;
}

export interface TableCardVisual {
    container: Phaser.GameObjects.Container;
    image: Phaser.GameObjects.Image;
    outline: Phaser.GameObjects.Rectangle;
    caption: Phaser.GameObjects.Text;
}

export function createTableCardVisual(scene: Phaser.Scene, backTextureKey: string): TableCardVisual {
    const image = scene.add.image(0, 0, backTextureKey)
        .setDisplaySize(TABLE_CARD_WIDTH, TABLE_CARD_HEIGHT);
    image.setData("cardDisplaySize", {
        width: TABLE_CARD_WIDTH,
        height: TABLE_CARD_HEIGHT
    } satisfies CardDisplaySize);
    const outline = scene.add.rectangle(0, 0, TABLE_CARD_WIDTH + 4, TABLE_CARD_HEIGHT + 4, 0x000000, 0)
        .setStrokeStyle(3, 0xffd166, 0.9);
    const caption = scene.add.text(0, -72, "", {
        fontFamily: "Arial",
        fontSize: "14px",
        color: "#f6ecd2"
    }).setOrigin(0.5);
    const container = scene.add.container(TABLE_CENTER_X, 392, [caption, image, outline]).setVisible(false).setDepth(80);

    return {
        container,
        image,
        outline,
        caption
    };
}
