import { TABLE_CENTER_X } from "../../layout";

import type { ScenePoint } from "./types";

export function getTableCardPosition(index: number, cardCount: number): ScenePoint {
    if (cardCount <= 1) {
        return { x: TABLE_CENTER_X, y: 392 };
    }

    const spacing = 156;
    const startX = TABLE_CENTER_X - (spacing * (cardCount - 1)) / 2;

    return {
        x: startX + spacing * index,
        y: 392
    };
}
