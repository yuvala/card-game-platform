import { createActor } from "xstate";

import type { SupportedDeckId } from "../engine/cards/deckDefinitions";
import {
    defineGameCatalogEntry,
    type AnyGameCatalogEntry
} from "../engine/game/catalog";
import { drawPokerGameDefinition } from "./drawPoker/definition";
import { createRewriteGameMachine } from "./drawPoker/machine";
import type { RewriteGameOptions, RewriteGameViewSnapshot } from "./drawPoker/types";
import { warLiteGameDefinition } from "./warLite/definition";
import { createWarLiteMachine } from "./warLite/machine";
import type { WarLiteOptions, WarLiteViewSnapshot } from "./warLite/types";

const drawPokerSupportedDeckIds = ["french", "spanish", "italian"] as const satisfies readonly SupportedDeckId[];
const warLiteSupportedDeckIds = ["french", "spanish", "italian"] as const satisfies readonly SupportedDeckId[];

const drawPokerCatalogEntry = defineGameCatalogEntry<RewriteGameViewSnapshot, RewriteGameOptions>({
    id: "draw-poker",
    label: "Draw Poker",
    description: "Prototype ruleset for the rewrite runtime. Every player reveals and plays a card each round.",
    minPlayers: 1,
    maxPlayers: 6,
    defaultPlayerCount: 3,
    supportedDeckIds: drawPokerSupportedDeckIds,
    defaultDeckId: "french",
    definition: drawPokerGameDefinition,
    getViewModel: (snapshot) => {
        const toViewModel = drawPokerGameDefinition.toViewModel;
        if (!toViewModel) {
            throw new Error("Draw Poker game definition is missing a view model adapter.");
        }

        return toViewModel(snapshot);
    },
    createActor: (playerNames, options) => {
        return createActor(createRewriteGameMachine(playerNames, options));
    }
});

const warLiteCatalogEntry = defineGameCatalogEntry<WarLiteViewSnapshot, WarLiteOptions>({
    id: "war-lite",
    label: "War Lite",
    description: "Two hidden stacks. Each battle flips the top card from both players, and the higher rank wins the point.",
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayerCount: 2,
    supportedDeckIds: warLiteSupportedDeckIds,
    defaultDeckId: "french",
    definition: warLiteGameDefinition,
    getViewModel: (snapshot) => {
        const toViewModel = warLiteGameDefinition.toViewModel;
        if (!toViewModel) {
            throw new Error("War Lite game definition is missing a view model adapter.");
        }

        return toViewModel(snapshot);
    },
    createActor: (playerNames, options) => {
        return createActor(createWarLiteMachine(playerNames, options));
    }
});

export const gameCatalog = {
    "draw-poker": drawPokerCatalogEntry,
    "war-lite": warLiteCatalogEntry
} satisfies Record<string, AnyGameCatalogEntry>;

export type GameCatalogId = keyof typeof gameCatalog;

export const DEFAULT_GAME_ID: GameCatalogId = "draw-poker";

export const gameCatalogEntries = Object.values(gameCatalog);

export function getGameCatalogEntryById(gameId: string | null | undefined): AnyGameCatalogEntry | null {
    if (!gameId) {
        return null;
    }

    const normalizedGameId = gameId.toLowerCase() as GameCatalogId;
    return gameCatalog[normalizedGameId] ?? null;
}
