import { TABLE_CENTER_X, TABLE_CENTER_Y, TABLE_WIDTH } from "../../layout";

import {
    DISCARD_CARD_HEIGHT,
    DISCARD_CARD_WIDTH,
    PRIMARY_PILE_FRAME_HEIGHT,
    PRIMARY_PILE_FRAME_WIDTH,
    PRIMARY_PILE_TARGET_CENTER_Y,
    PRIMARY_PILE_VERTICAL_SHIFT
} from "./constants";
import type { HandSlotOrigin, PrimaryPileLayout, ScenePoint } from "./types";

interface PrimaryPileTemplate {
    drawY: number;
    discardY: number;
    frameWidth: number;
    frameHeight: number;
    drawTitleOffsetY: number;
    discardTitleOffsetY: number;
    discardTextOffsetY: number;
    discardCardWidth: number;
    discardCardHeight: number;
    titleFontSize: number;
    countFontSize: number;
    deckCountFontSize: number;
}

function getPrimaryPileTemplate(playerCount: number): PrimaryPileTemplate {
    switch (playerCount) {
        case 1:
        case 2:
        case 3:
        case 4:
            return {
                frameWidth: PRIMARY_PILE_FRAME_WIDTH,
                frameHeight: PRIMARY_PILE_FRAME_HEIGHT,
                drawY: 224,
                discardY: 432,
                drawTitleOffsetY: 56,
                discardTitleOffsetY: 66,
                discardTextOffsetY: 74,
                discardCardWidth: DISCARD_CARD_WIDTH,
                discardCardHeight: DISCARD_CARD_HEIGHT,
                titleFontSize: 18,
                countFontSize: 18,
                deckCountFontSize: 24
            };
        case 5:
            return {
                frameWidth: 104,
                frameHeight: 132,
                drawY: 220,
                discardY: 390,
                drawTitleOffsetY: 46,
                discardTitleOffsetY: 52,
                discardTextOffsetY: 60,
                discardCardWidth: 62,
                discardCardHeight: 88,
                titleFontSize: 16,
                countFontSize: 15,
                deckCountFontSize: 20
            };
        case 6:
            return {
                frameWidth: 96,
                frameHeight: 120,
                drawY: 232,
                discardY: 382,
                drawTitleOffsetY: 42,
                discardTitleOffsetY: 48,
                discardTextOffsetY: 54,
                discardCardWidth: 58,
                discardCardHeight: 82,
                titleFontSize: 15,
                countFontSize: 14,
                deckCountFontSize: 18
            };
        default:
            return {
                frameWidth: PRIMARY_PILE_FRAME_WIDTH,
                frameHeight: PRIMARY_PILE_FRAME_HEIGHT,
                drawY: 184,
                discardY: 392,
                drawTitleOffsetY: 56,
                discardTitleOffsetY: 66,
                discardTextOffsetY: 74,
                discardCardWidth: DISCARD_CARD_WIDTH,
                discardCardHeight: DISCARD_CARD_HEIGHT,
                titleFontSize: 18,
                countFontSize: 18,
                deckCountFontSize: 24
            };
    }
}

export function getPrimaryPileLayout(playerCount: number): PrimaryPileLayout {
    const layout = getPrimaryPileTemplate(playerCount);
    const shiftedDrawY = layout.drawY + PRIMARY_PILE_VERTICAL_SHIFT;
    const shiftedDiscardY = layout.discardY + PRIMARY_PILE_VERTICAL_SHIFT;
    const centerOffsetY = PRIMARY_PILE_TARGET_CENTER_Y - ((shiftedDrawY + shiftedDiscardY) / 2);

    return {
        ...layout,
        drawCenterY: shiftedDrawY + centerOffsetY,
        discardCenterY: shiftedDiscardY + centerOffsetY
    };
}

export function getOwnedPilePosition(
    ownerPileIndex: number,
    slots: readonly HandSlotOrigin[],
    badgePosition: ScenePoint
): ScenePoint {
    const horizontalOffset = ownerPileIndex * 58;

    if (slots.length > 0) {
        const minX = Math.min(...slots.map((slot) => slot.originX));
        const maxX = Math.max(...slots.map((slot) => slot.originX));
        const minY = Math.min(...slots.map((slot) => slot.originY));
        const maxY = Math.max(...slots.map((slot) => slot.originY));
        const anchorAngle = slots[0].originAngle;

        if (anchorAngle === 0) {
            return {
                x: maxX + 92 + horizontalOffset,
                y: (minY + maxY) / 2 - (minY > TABLE_CENTER_Y ? 6 : -6)
            };
        }

        if (anchorAngle > 0) {
            return {
                x: minX - 84 - horizontalOffset,
                y: (minY + maxY) / 2
            };
        }

        return {
            x: maxX + 84 + horizontalOffset,
            y: (minY + maxY) / 2
        };
    }

    const { x, y } = badgePosition;

    if (x > TABLE_CENTER_X + 110) {
        return {
            x: x - 96 - horizontalOffset,
            y: y + 16
        };
    }

    if (x < TABLE_CENTER_X - 110) {
        return {
            x: x + 96 + horizontalOffset,
            y: y + 16
        };
    }

    if (y < TABLE_CENTER_Y) {
        return {
            x: x + 92 + horizontalOffset,
            y: y + 18
        };
    }

    return {
        x: x + 110 + horizontalOffset,
        y: y - 8
    };
}

export function getSupplementalPilePosition(index: number): ScenePoint {
    const row = Math.floor(index / 2);
    const column = index % 2;

    return {
        x: column === 0 ? TABLE_CENTER_X - 182 : TABLE_CENTER_X + 182,
        y: 168 + row * 124
    };
}
