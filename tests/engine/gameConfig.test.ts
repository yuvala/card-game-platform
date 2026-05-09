import { createConfiguredPiles, defineCardGameConfig } from "@engine/engine/game/config";
import type { CardGamePlayer } from "@engine/engine/game/types";

interface TestCard {
    id: string;
}

type TestPlayer = CardGamePlayer<TestCard>;

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
    assert(actual === expected, `${message} Expected ${String(expected)}, got ${String(actual)}.`);
}

const config = defineCardGameConfig({
    id: "test-game",
    label: "Test Game",
    description: "Config test.",
    minPlayers: 2,
    maxPlayers: 4,
    defaultPlayerCount: 2,
    supportedDeckIds: ["french"],
    defaultDeckId: "french",
    openingHandSize: 3,
    piles: [
        {
            id: "stock",
            role: "stock",
            label: "Stock",
            owner: "table",
            visibility: "face-down"
        },
        {
            id: "trick",
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
            visibility: "owner-only",
            getPlayerPileId: (playerId) => "hand:" + playerId,
            getPlayerPileLabel: (playerName) => playerName + " Hand"
        }
    ]
});

const players: TestPlayer[] = [
    { id: "p1", name: "Avi" },
    { id: "p2", name: "Dany" }
];

const piles = createConfiguredPiles(config, players);

assertEqual(piles.stock.role, "stock", "createConfiguredPiles should create table stock pile.");
assertEqual(piles.stock.isFaceUp, false, "face-down piles should not be face up.");
assertEqual(piles.stock.isVisibleToAll, false, "face-down piles should not be visible to all.");

assertEqual(piles.trick.role, "table", "createConfiguredPiles should create table trick pile.");
assertEqual(piles.trick.isFaceUp, true, "face-up piles should be face up.");
assertEqual(piles.trick.isVisibleToAll, true, "face-up piles should be visible to all.");

assertEqual(piles["hand:p1"].ownerId, "p1", "player piles should keep owner id.");
assertEqual(piles["hand:p1"].label, "Avi Hand", "player piles should use player labels.");
assertEqual(piles["hand:p1"].isFaceUp, true, "owner-only piles should be face up.");
assertEqual(piles["hand:p1"].isVisibleToAll, false, "owner-only piles should not be visible to all.");
assertEqual(piles["hand:p2"].ownerId, "p2", "createConfiguredPiles should create one pile per player.");

console.log("gameConfig.test.ts passed");
