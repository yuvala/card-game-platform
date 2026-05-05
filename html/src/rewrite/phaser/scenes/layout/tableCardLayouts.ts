import { TABLE_CENTER_X } from "../../layout";

import type { CardGameViewTableCard } from "../../../engine/game/viewModel";
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

export function getTableCardDisplayState(
    cards: readonly CardGameViewTableCard[],
    index: number
): TableCardDisplayState {
    const groupIds = getTableCardGroupIds(cards);
    const groupId = getTableCardGroupId(cards[index], index);
    const groupIndex = Math.max(groupIds.indexOf(groupId), 0);
    const stackIndex = getStackIndex(cards, index);
    const basePosition = getTableCardPosition(groupIndex, groupIds.length);
    const side = getStackSide(groupIndex, groupIds.length);

    return {
        x: basePosition.x + side * stackIndex * 12,
        y: basePosition.y - stackIndex * 9,
        angle: getStackAngle(stackIndex, side),
        stackIndex
    };
}
