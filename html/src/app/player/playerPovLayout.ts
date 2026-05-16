import { PLAYER_GAME_WIDTH } from "./createPlayerGame";

export type PlayerPovSeatSide = "top" | "left" | "right" | "bottom";

export interface PlayerPovPoint {
    x: number;
    y: number;
}

export interface PlayerPovOrientedPoint extends PlayerPovPoint {
    angle: number;
}

export interface PlayerPovSeatLayout extends PlayerPovOrientedPoint {
    side: PlayerPovSeatSide;
}

export const playerPovCardSizes = {
    hand: {
        width: 82,
        height: 120
    },
    opponent: {
        width: 42,
        height: 62
    },
    table: {
        width: 62,
        height: 91
    },
    stockTrump: {
        width: 46,
        height: 68
    }
} as const;

export const playerPovZones = {
    topBarY: 36,
    connectionStatusY: 74,
    gameInfoY: 100,
    tableCardY: 334,
    stockTrumpY: 638,
    playerHudY: 488,
    handY: 566,
    actionStatusY: 624,
    actionButtonY: 660
} as const;

export function getOpponentSeatLayouts(count: number): PlayerPovSeatLayout[] {
    switch (count) {
        case 0:
            return [];
        case 1:
            return [{ side: "top", x: PLAYER_GAME_WIDTH / 2, y: 188, angle: 0 }];
        case 2:
            return [
                { side: "left", x: 44, y: 326, angle: -90 },
                { side: "right", x: PLAYER_GAME_WIDTH - 44, y: 326, angle: 90 }
            ];
        default: {
            const layouts: PlayerPovSeatLayout[] = [
                { side: "top", x: PLAYER_GAME_WIDTH / 2, y: 188, angle: 0 },
                { side: "right", x: PLAYER_GAME_WIDTH - 44, y: 326, angle: 90 },
                { side: "left", x: 44, y: 326, angle: -90 },
                { side: "top", x: PLAYER_GAME_WIDTH / 2, y: 232, angle: 0 }
            ];
            return layouts.slice(0, count);
        }
    }
}

export function getHandCardPoint(input: {
    cardCount: number;
    index: number;
    selected?: boolean;
}): PlayerPovOrientedPoint {
    const slotCount = Math.max(input.cardCount, input.index + 1, 1);
    const slotIndex = Math.max(0, Math.min(input.index, slotCount - 1));
    const spacing = Math.min(58, slotCount > 1 ? 230 / (slotCount - 1) : 0);
    const startX = PLAYER_GAME_WIDTH / 2 - (spacing * (slotCount - 1)) / 2;
    const angle = (slotIndex - (slotCount - 1) / 2) * 7;

    return {
        x: startX + slotIndex * spacing,
        y:
            playerPovZones.handY -
            Math.abs(slotIndex - (slotCount - 1) / 2) * 6 -
            (input.selected ? 18 : 0),
        angle
    };
}

export function getTableRowCardPoint(input: {
    cardCount: number;
    index: number;
}): PlayerPovOrientedPoint {
    const slotCount = Math.max(input.cardCount, input.index + 1, 1);
    const slotIndex = Math.max(0, Math.min(input.index, slotCount - 1));
    const startX = PLAYER_GAME_WIDTH / 2 - ((slotCount - 1) * 54) / 2;

    return {
        x: startX + slotIndex * 54,
        y: playerPovZones.tableCardY + (slotIndex % 2) * 8,
        angle: (slotIndex - (slotCount - 1) / 2) * 4
    };
}

export function getTrickCardPoint(side: PlayerPovSeatSide): PlayerPovOrientedPoint {
    switch (side) {
        case "top":
            return {
                x: PLAYER_GAME_WIDTH / 2,
                y: 282,
                angle: 0
            };
        case "left":
            return {
                x: PLAYER_GAME_WIDTH / 2 - 66,
                y: 352,
                angle: -7
            };
        case "right":
            return {
                x: PLAYER_GAME_WIDTH / 2 + 66,
                y: 352,
                angle: 7
            };
        case "bottom":
            return {
                x: PLAYER_GAME_WIDTH / 2,
                y: 420,
                angle: 0
            };
    }
}

// Battle surface: 216×146 centered at (195, 352) → x=87–303, y=279–425
// Local player (bottom) clusters on the left half; opponent (top) on the right half.
// Face-down cards form a compact cascading stack; the reveal card floats above.
export function getWarBattleCardPoint(
    side: "bottom" | "top",
    isComparisonCard: boolean,
    faceDownIndex: number
): PlayerPovOrientedPoint {
    const baseX = side === "bottom" ? 148 : 242;

    if (isComparisonCard) {
        return { x: baseX, y: 322, angle: 0 };
    }

    return {
        x: baseX + faceDownIndex * 4,
        y: 368 - faceDownIndex * 2,
        angle: -6 + faceDownIndex * 4
    };
}

export function getStockTrumpPoint(): PlayerPovPoint {
    return {
        x: 76,
        y: playerPovZones.stockTrumpY
    };
}
