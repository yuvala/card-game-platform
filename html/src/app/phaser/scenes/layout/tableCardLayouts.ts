import { TABLE_CENTER_X, TABLE_CENTER_Y } from "../../layout";

import type { CardGameViewPlayer, CardGameViewTableCard } from "@engine/engine/game/viewModel";
import { getSeatLayouts } from "./seatLayouts";
import type { ScenePoint } from "./types";

export interface TableCardDisplayState extends ScenePoint {
    angle: number;
    stackIndex: number;
}

export function getTableCardPosition(index: number, cardCount: number): ScenePoint {
    if (cardCount <= 1) {
        return { x: TABLE_CENTER_X, y: 392 };
    }

    const maxSpread = 650;
    const spacing = Math.min(156, maxSpread / Math.max(cardCount - 1, 1));
    const startX = TABLE_CENTER_X - (spacing * (cardCount - 1)) / 2;

    return {
        x: startX + spacing * index,
        y: 392
    };
}

function getTableCardGroupId(card: CardGameViewTableCard, index: number): string {
    return card.playerId ?? card.id + "-" + String(index);
}

function getTableCardGroupIds(cards: readonly CardGameViewTableCard[]): string[] {
    const groupIds: string[] = [];
    cards.forEach((card, index) => {
        const groupId = getTableCardGroupId(card, index);
        if (!groupIds.includes(groupId)) {
            groupIds.push(groupId);
        }
    });

    return groupIds;
}

function getStackIndex(cards: readonly CardGameViewTableCard[], index: number): number {
    const groupId = getTableCardGroupId(cards[index], index);
    let stackIndex = 0;

    for (let cardIndex = 0; cardIndex < index; cardIndex += 1) {
        if (getTableCardGroupId(cards[cardIndex], cardIndex) === groupId) {
            stackIndex += 1;
        }
    }

    return stackIndex;
}

function getStackSide(groupIndex: number, groupCount: number): number {
    if (groupCount <= 1) {
        return 1;
    }

    const midpoint = (groupCount - 1) / 2;
    if (groupIndex < midpoint) {
        return -1;
    }

    return 1;
}

function getStackAngle(stackIndex: number, side: number): number {
    if (stackIndex === 0) {
        return 0;
    }

    const anglePattern = [-7, 5, -4, 8, -5, 6];
    return anglePattern[(stackIndex - 1) % anglePattern.length] * side;
}

function getGroupCards(cards: readonly CardGameViewTableCard[], groupId: string): CardGameViewTableCard[] {
    return cards.filter((card, index) => getTableCardGroupId(card, index) === groupId);
}

function getFaceDownStackIndex(groupCards: readonly CardGameViewTableCard[], card: CardGameViewTableCard): number {
    let faceDownIndex = 0;
    for (const groupCard of groupCards) {
        if (groupCard.id === card.id) {
            return faceDownIndex;
        }

        if (!groupCard.isFaceUp) {
            faceDownIndex += 1;
        }
    }

    return faceDownIndex;
}

function getLayeredBattleStackOffset(input: {
    card: CardGameViewTableCard;
    groupCards: readonly CardGameViewTableCard[];
    stackIndex: number;
    side: number;
}): { x: number; y: number; angle: number } | null {
    const { card, groupCards, stackIndex, side } = input;
    const hasFaceDownStack = groupCards.some((groupCard) => !groupCard.isFaceUp);
    const hasVisibleComparison = groupCards.some((groupCard) => groupCard.isFaceUp);
    if (!hasFaceDownStack || !hasVisibleComparison || groupCards.length < 3) {
        return null;
    }

    if (stackIndex === 0) {
        return {
            x: 0,
            y: 4,
            angle: 0
        };
    }

    if (!card.isFaceUp) {
        const faceDownIndex = getFaceDownStackIndex(groupCards, card);
        const anglePattern = [-6, 4, -3, 5];

        return {
            x: side * (10 + faceDownIndex * 7),
            y: -8 - faceDownIndex * 7,
            angle: anglePattern[faceDownIndex % anglePattern.length] * side
        };
    }

    return {
        x: side * 46,
        y: -18,
        angle: side * 4
    };
}

export function getTableCardDisplayState(
    cards: readonly CardGameViewTableCard[],
    index: number,
    players?: readonly CardGameViewPlayer[]
): TableCardDisplayState {
    const card = cards[index];
    const groupId = getTableCardGroupId(card, index);

    let groupIndex: number;
    let groupCount: number;
    if (players && players.length > 0 && card.playerId) {
        const playerIndex = players.findIndex((p) => p.id === card.playerId);
        groupIndex = Math.max(playerIndex, 0);
        groupCount = players.length;
    } else {
        const groupIds = getTableCardGroupIds(cards);
        groupIndex = Math.max(groupIds.indexOf(groupId), 0);
        groupCount = groupIds.length;
    }

    const stackIndex = getStackIndex(cards, index);
    const basePosition = getTableCardPosition(groupIndex, groupCount);
    const side = getStackSide(groupIndex, groupCount);
    const layeredBattleOffset = getLayeredBattleStackOffset({
        card: cards[index],
        groupCards: getGroupCards(cards, groupId),
        stackIndex,
        side
    });

    if (layeredBattleOffset) {
        return {
            x: basePosition.x + layeredBattleOffset.x,
            y: basePosition.y + layeredBattleOffset.y,
            angle: layeredBattleOffset.angle,
            stackIndex
        };
    }

    return {
        x: basePosition.x + side * stackIndex * 12,
        y: basePosition.y - stackIndex * 9,
        angle: getStackAngle(stackIndex, side),
        stackIndex
    };
}

function getTrickSeatFallbackPosition(index: number, cardCount: number): ScenePoint {
    const radiusX = 150;
    const radiusY = 118;
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(cardCount, 1);

    return {
        x: TABLE_CENTER_X + Math.cos(angle) * radiusX,
        y: TABLE_CENTER_Y + Math.sin(angle) * radiusY
    };
}

function getTrickSeatPosition(playerIndex: number, playerCount: number): ScenePoint {
    if (playerCount <= 1) {
        return {
            x: TABLE_CENTER_X,
            y: TABLE_CENTER_Y + 78
        };
    }

    if (playerCount === 2) {
        return playerIndex === 0
            ? { x: TABLE_CENTER_X, y: TABLE_CENTER_Y + 118 }
            : { x: TABLE_CENTER_X, y: TABLE_CENTER_Y - 118 };
    }

    if (playerCount === 3) {
        const positions = [
            { x: TABLE_CENTER_X, y: TABLE_CENTER_Y + 118 },
            { x: TABLE_CENTER_X + 148, y: TABLE_CENTER_Y - 48 },
            { x: TABLE_CENTER_X - 148, y: TABLE_CENTER_Y - 48 }
        ];
        return positions[playerIndex] ?? getTrickSeatFallbackPosition(playerIndex, playerCount);
    }

    if (playerCount === 4) {
        const positions = [
            { x: TABLE_CENTER_X, y: TABLE_CENTER_Y + 124 },
            { x: TABLE_CENTER_X + 168, y: TABLE_CENTER_Y },
            { x: TABLE_CENTER_X, y: TABLE_CENTER_Y - 124 },
            { x: TABLE_CENTER_X - 168, y: TABLE_CENTER_Y }
        ];
        return positions[playerIndex] ?? getTrickSeatFallbackPosition(playerIndex, playerCount);
    }

    if (playerCount === 5) {
        const positions = [
            { x: TABLE_CENTER_X, y: TABLE_CENTER_Y + 126 },
            { x: TABLE_CENTER_X + 150, y: TABLE_CENTER_Y + 34 },
            { x: TABLE_CENTER_X + 84, y: TABLE_CENTER_Y - 104 },
            { x: TABLE_CENTER_X - 84, y: TABLE_CENTER_Y - 104 },
            { x: TABLE_CENTER_X - 150, y: TABLE_CENTER_Y + 34 }
        ];
        return positions[playerIndex] ?? getTrickSeatFallbackPosition(playerIndex, playerCount);
    }

    if (playerCount === 6) {
        const positions = [
            { x: TABLE_CENTER_X, y: TABLE_CENTER_Y + 130 },
            { x: TABLE_CENTER_X + 150, y: TABLE_CENTER_Y + 62 },
            { x: TABLE_CENTER_X + 150, y: TABLE_CENTER_Y - 62 },
            { x: TABLE_CENTER_X, y: TABLE_CENTER_Y - 130 },
            { x: TABLE_CENTER_X - 150, y: TABLE_CENTER_Y - 62 },
            { x: TABLE_CENTER_X - 150, y: TABLE_CENTER_Y + 62 }
        ];
        return positions[playerIndex] ?? getTrickSeatFallbackPosition(playerIndex, playerCount);
    }

    return getTrickSeatFallbackPosition(playerIndex, playerCount);
}

export function getTrickSeatCardDisplayState(input: {
    cards: readonly CardGameViewTableCard[];
    players: readonly CardGameViewPlayer[];
    index: number;
}): TableCardDisplayState {
    const { cards, players, index } = input;
    const card = cards[index];
    const playerIndex = Math.max(players.findIndex((player) => player.id === card.playerId), 0);
    const seatLayout = getSeatLayouts(players.length)[playerIndex];
    const position = getTrickSeatPosition(playerIndex, players.length);

    return {
        x: position.x,
        y: position.y,
        angle: seatLayout?.angle ?? 0,
        stackIndex: 0
    };
}
