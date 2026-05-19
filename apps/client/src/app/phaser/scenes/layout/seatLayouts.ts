import { TABLE_CENTER_X, TABLE_CENTER_Y, TABLE_WIDTH } from '../../layout';

import type { SeatLayout } from './types';

function createBottomSeat(centerX: number): SeatLayout {
    return {
        labelX: centerX,
        labelY: 520,
        labelAlign: 'center',
        handCenterX: centerX,
        handCenterY: 598,
        gapX: 74,
        gapY: 0,
        angle: 0,
    };
}

function createHorizontalSeat(
    centerX: number,
    labelY: number,
    handCenterY: number,
    gapX: number,
): SeatLayout {
    return {
        labelX: centerX,
        labelY,
        labelAlign: 'center',
        handCenterX: centerX,
        handCenterY,
        gapX,
        gapY: 0,
        angle: 0,
    };
}

function createVerticalSeat(side: 'left' | 'right', handCenterY: number, gapY: number): SeatLayout {
    const isRight = side === 'right';
    const handCenterX = isRight ? TABLE_WIDTH - 120 : 120;

    return {
        labelX: handCenterX + (isRight ? -84 : 84),
        labelY: handCenterY,
        labelAlign: isRight ? 'right' : 'left',
        handCenterX,
        handCenterY,
        gapX: 0,
        gapY,
        angle: isRight ? 90 : -90,
    };
}

function getTemplateSeatLayouts(playerCount: number): SeatLayout[] {
    switch (playerCount) {
        case 0:
            return [];
        case 1:
            return [createBottomSeat(TABLE_CENTER_X)];
        case 2:
            return [
                createBottomSeat(TABLE_CENTER_X),
                createHorizontalSeat(TABLE_CENTER_X, 168, 122, 60),
            ];
        case 3:
            return [
                createBottomSeat(TABLE_CENTER_X),
                createVerticalSeat('right', 366, 56),
                createVerticalSeat('left', 366, 56),
            ];
        case 4:
            return [
                createBottomSeat(TABLE_CENTER_X),
                createVerticalSeat('right', 366, 56),
                createHorizontalSeat(TABLE_CENTER_X, 168, 122, 60),
                createVerticalSeat('left', 366, 56),
            ];
        case 5:
            return [
                createBottomSeat(TABLE_CENTER_X),
                createVerticalSeat('right', 366, 56),
                createHorizontalSeat(TABLE_WIDTH - 256, 190, 136, 52),
                createHorizontalSeat(256, 190, 136, 52),
                createVerticalSeat('left', 366, 56),
            ];
        case 6:
            return [
                createBottomSeat(TABLE_CENTER_X),
                createVerticalSeat('right', 468, 32),
                createVerticalSeat('right', 214, 32),
                createHorizontalSeat(TABLE_CENTER_X, 168, 122, 60),
                createVerticalSeat('left', 214, 32),
                createVerticalSeat('left', 468, 32),
            ];
        default:
            return [];
    }
}

function getFallbackSeatLayout(playerIndex: number, playerCount: number): SeatLayout {
    if (playerIndex === 0) {
        return createBottomSeat(TABLE_CENTER_X);
    }

    const upperSeatCount = Math.max(playerCount - 1, 1);
    const progress = upperSeatCount === 1 ? 0.5 : (playerIndex - 1) / (upperSeatCount - 1);
    const angleDegrees = 215 + progress * 110;
    const angleRadians = (angleDegrees * Math.PI) / 180;
    const seatX = TABLE_CENTER_X + Math.cos(angleRadians) * 300;
    const seatY = TABLE_CENTER_Y + Math.sin(angleRadians) * 210;

    if (Math.abs(seatX - TABLE_CENTER_X) < 92) {
        return createHorizontalSeat(
            Math.min(Math.max(seatX, 240), TABLE_WIDTH - 240),
            Math.min(Math.max(seatY + 58, 132), 182),
            94,
            54,
        );
    }

    if (seatX < TABLE_CENTER_X) {
        return createVerticalSeat('left', Math.min(Math.max(seatY + 30, 180), 460), 36);
    }

    return createVerticalSeat('right', Math.min(Math.max(seatY + 30, 180), 460), 36);
}

export function getSeatLayouts(playerCount: number): SeatLayout[] {
    const layouts = getTemplateSeatLayouts(playerCount);
    if (layouts.length > 0) {
        return layouts;
    }

    return Array.from({ length: playerCount }, (_, index) =>
        getFallbackSeatLayout(index, playerCount),
    );
}
