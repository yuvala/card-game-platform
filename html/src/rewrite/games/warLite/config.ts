import type { SupportedDeckId } from "../../engine/cards/deckDefinitions";
import { defineCardGameConfig } from "../../engine/game/config";
import {
    WAR_LITE_BATTLE_PILE_ID,
    WAR_LITE_DISCARD_PILE_ID,
    WAR_LITE_STOCK_PILE_ID,
    getWarLiteCapturePileId,
    getWarLiteHandPileId
} from "./types";

export const warLiteSupportedDeckIds = ["french", "spanish", "italian"] as const satisfies readonly SupportedDeckId[];

export const warLiteConfig = defineCardGameConfig({
    id: "war-lite",
    label: "War Lite",
    description: "Two hidden stacks. Each battle flips the top card from both players, and the higher rank wins the point.",
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayerCount: 2,
    supportedDeckIds: warLiteSupportedDeckIds,
    defaultDeckId: "french",
    openingHandSize: 0,
    piles: [
        {
            id: WAR_LITE_STOCK_PILE_ID,
            role: "stock",
            label: "Stock",
            owner: "table",
            visibility: "face-down"
        },
        {
            id: WAR_LITE_BATTLE_PILE_ID,
            role: "table",
            label: "Battle",
            owner: "table",
            visibility: "face-up"
        },
        {
            id: WAR_LITE_DISCARD_PILE_ID,
            role: "discard",
            label: "Battle Log",
            owner: "table",
            visibility: "face-up"
        },
        {
            id: "stack",
            role: "hand",
            label: "Stack",
            owner: "player",
            visibility: "face-down",
            getPlayerPileId: getWarLiteHandPileId,
            getPlayerPileLabel: (playerName) => playerName + " Stack"
        },
        {
            id: "won",
            role: "capture",
            label: "Won",
            owner: "player",
            visibility: "face-up",
            getPlayerPileId: getWarLiteCapturePileId,
            getPlayerPileLabel: (playerName) => playerName + " Won"
        }
    ]
});
