import { TABLE_CENTER_X, TABLE_CENTER_Y } from '../../layout';

import {
    DISCARD_CARD_HEIGHT,
    DISCARD_CARD_WIDTH,
    PLAYER_ZONE_LEFT_X,
    PLAYER_ZONE_RIGHT_X,
    PRIMARY_PILE_FRAME_HEIGHT,
    PRIMARY_PILE_FRAME_WIDTH,
    PRIMARY_PILE_TARGET_CENTER_Y,
    PRIMARY_PILE_VERTICAL_SHIFT,
} from './constants';
import type { PrimaryPileLayout, ScenePoint, SeatLayout } from './types';

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
            return {
                frameWidth: PRIMARY_PILE_FRAME_WIDTH,
                frameHeight: PRIMARY_PILE_FRAME_HEIGHT,
                drawY: 500,
                discardY: 300,
                drawTitleOffsetY: 56,
                discardTitleOffsetY: 66,
                discardTextOffsetY: 74,
                discardCardWidth: DISCARD_CARD_WIDTH,
                discardCardHeight: DISCARD_CARD_HEIGHT,
                titleFontSize: 18,
                countFontSize: 18,
                deckCountFontSize: 24,
            };
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
                deckCountFontSize: 24,
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
                deckCountFontSize: 20,
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
                deckCountFontSize: 18,
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
                deckCountFontSize: 24,
            };
    }
}

export function getPrimaryPileLayout(playerCount: number): PrimaryPileLayout {
    const layout = getPrimaryPileTemplate(playerCount);
    const shiftedDrawY = layout.drawY + PRIMARY_PILE_VERTICAL_SHIFT;
    const shiftedDiscardY = layout.discardY + PRIMARY_PILE_VERTICAL_SHIFT;
    const centerOffsetY = PRIMARY_PILE_TARGET_CENTER_Y - (shiftedDrawY + shiftedDiscardY) / 2;

    return {
        ...layout,
        drawCenterY: shiftedDrawY + centerOffsetY,
        discardCenterY: shiftedDiscardY + centerOffsetY,
    };
}

export function getOwnedPilePosition(ownerPileIndex: number, layout: SeatLayout): ScenePoint {
    const pileOffset = ownerPileIndex * 58;
    const { handCenterX, handCenterY, angle, gapY } = layout;

    if (angle === 0) {
        const isUpperSeat = handCenterY < TABLE_CENTER_Y;
        if (isUpperSeat) {
            return {
                x: PLAYER_ZONE_LEFT_X + pileOffset,
                y: handCenterY + 6,
            };
        }

        return {
            x: PLAYER_ZONE_RIGHT_X + pileOffset,
            y: handCenterY - 6,
        };
    }

    // Side players: slots are vertical. Place owned pile outside the slot chain.
    // angle > 0 (right side, P2): "right" from player's POV = downward → below last slot
    // angle < 0 (left side, P4): "right" from player's POV = upward → above first slot
    const halfSpan = 2 * gapY;
    if (angle > 0) {
        return {
            x: handCenterX,
            y: handCenterY - halfSpan - 58 - pileOffset,
        };
    }

    return {
        x: handCenterX,
        y: handCenterY + halfSpan + 58 + pileOffset,
    };
}

export function getSupplementalPilePosition(index: number): ScenePoint {
    const row = Math.floor(index / 2);
    const column = index % 2;

    return {
        x: column === 0 ? TABLE_CENTER_X - 182 : TABLE_CENTER_X + 182,
        y: 168 + row * 124,
    };
}
