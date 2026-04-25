import * as Phaser from "phaser";

import { TABLE_TEXT_RESOLUTION } from "../layout/constants";
import type { SeatLayout } from "../layout/types";

export interface SeatBadge {
    container: Phaser.GameObjects.Container;
    iconCircle: Phaser.GameObjects.Arc;
    iconText: Phaser.GameObjects.Text;
    nameText: Phaser.GameObjects.Text;
    metaText: Phaser.GameObjects.Text;
}

export function createSeatBadge(scene: Phaser.Scene, layout: SeatLayout): SeatBadge {
    const isRightAligned = layout.labelAlign === "right";
    const isCentered = layout.labelAlign === "center";
    const iconX = isCentered ? -48 : (isRightAligned ? 54 : -54);
    const textX = isCentered ? 16 : (isRightAligned ? 28 : -30);
    const textOrigin = isCentered ? 0.5 : (isRightAligned ? 1 : 0);
    const iconCircle = scene.add.circle(iconX, 16, 14, 0x15382c, 0.98)
        .setStrokeStyle(2, 0x5d7b70, 0.95);
    const iconText = scene.add.text(iconX, 16, "", {
        fontFamily: "Arial",
        fontSize: "12px",
        color: "#f6ecd2",
        fontStyle: "bold"
    }).setOrigin(0.5).setResolution(TABLE_TEXT_RESOLUTION);
    const nameText = scene.add.text(textX, 6, "", {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#f6ecd2"
    }).setOrigin(textOrigin, 0.5).setResolution(TABLE_TEXT_RESOLUTION);
    const metaText = scene.add.text(textX, 24, "", {
        fontFamily: "Arial",
        fontSize: "11px",
        color: "rgba(246,236,210,0.72)"
    }).setOrigin(textOrigin, 0.5).setResolution(TABLE_TEXT_RESOLUTION);
    const container = scene.add.container(layout.labelX, layout.labelY, [
        iconCircle,
        iconText,
        nameText,
        metaText
    ]);

    return {
        container,
        iconCircle,
        iconText,
        nameText,
        metaText
    };
}
