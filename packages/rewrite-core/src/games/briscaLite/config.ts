import type { SupportedDeckId } from "../../engine/cards/deckDefinitions";
import { defineCardGameConfig } from "../../engine/game/config";
import {
    BRISCA_LITE_STOCK_PILE_ID,
    BRISCA_LITE_TRICK_PILE_ID,
    BRISCA_LITE_TRUMP_PILE_ID,
    getBriscaLiteCapturePileId,
    getBriscaLiteHandPileId
} from "./types";

export const briscaLiteSupportedDeckIds = ["spanish", "italian"] as const satisfies readonly SupportedDeckId[];

export const briscaLiteConfig = defineCardGameConfig({
    id: "brisca-lite",
    label: "Brisca-lite",
    description: "Trump-led trick play on the 40-card Iberian decks. Winner draws first and scores one point per trick.",
    minPlayers: 2,
    maxPlayers: 5,
    defaultPlayerCount: 2,
    playerCountOptions: [2, 4, 5],
    supportedDeckIds: briscaLiteSupportedDeckIds,
    defaultDeckId: "spanish",
    openingHandSize: 3,
    piles: [
        {
            id: BRISCA_LITE_STOCK_PILE_ID,
            role: "stock",
            label: "Stock",
            owner: "table",
            visibility: "face-down"
        },
        {
            id: BRISCA_LITE_TRUMP_PILE_ID,
            role: "trump",
            label: "Trump",
            owner: "table",
            visibility: "face-up"
        },
        {
            id: BRISCA_LITE_TRICK_PILE_ID,
            role: "table",
            label: "Trick",
            owner: "table",
            visibility: "face-up"
        },
        {
            id: "hand",
            role: "hand",
            label: "Hand",
            owner: "player",
            visibility: "face-down",
            getPlayerPileId: getBriscaLiteHandPileId,
            getPlayerPileLabel: (playerName) => playerName + " Hand"
        },
        {
            id: "capture",
            role: "capture",
            label: "Capture",
            owner: "player",
            visibility: "owner-only",
            getPlayerPileId: getBriscaLiteCapturePileId,
            getPlayerPileLabel: (playerName) => playerName + " Capture"
        }
    ]
});
