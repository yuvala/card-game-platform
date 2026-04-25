import { createActor } from "xstate";

import type { SupportedDeckId } from "../engine/cards/deckDefinitions";
import {
    defineGameCatalogEntry,
    type CardGameActorRuntime,
    type AnyGameCatalogEntry
} from "../engine/game/catalog";
import { briscaLiteGameDefinition } from "./briscaLite/definition";
import { createBriscaLiteMachine } from "./briscaLite/machine";
import type { BriscaLiteOptions, BriscaLiteViewSnapshot } from "./briscaLite/types";
import { drawPokerGameDefinition } from "./drawPoker/definition";
import { createRewriteGameMachine } from "./drawPoker/machine";
import type { RewriteGameOptions, RewriteGameViewSnapshot } from "./drawPoker/types";
import { warLiteGameDefinition } from "./warLite/definition";
import { createWarLiteMachine } from "./warLite/machine";
import type { WarLiteOptions, WarLiteViewSnapshot } from "./warLite/types";

const drawPokerSupportedDeckIds = ["french", "spanish", "italian"] as const satisfies readonly SupportedDeckId[];
const warLiteSupportedDeckIds = ["french", "spanish", "italian"] as const satisfies readonly SupportedDeckId[];
const briscaLiteSupportedDeckIds = ["spanish", "italian"] as const satisfies readonly SupportedDeckId[];

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
        return createActor(createRewriteGameMachine(playerNames, options)) as CardGameActorRuntime<RewriteGameViewSnapshot>;
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
        return createActor(createWarLiteMachine(playerNames, options)) as CardGameActorRuntime<WarLiteViewSnapshot>;
    }
});

const briscaLiteCatalogEntry = defineGameCatalogEntry<BriscaLiteViewSnapshot, BriscaLiteOptions>({
    id: "brisca-lite",
    label: "Brisca-lite",
    description: "Trump-led trick play on the 40-card Iberian decks. Winner draws first and scores one point per trick.",
    minPlayers: 2,
    maxPlayers: 5,
    defaultPlayerCount: 2,
    playerCountOptions: [2, 4, 5],
    supportedDeckIds: briscaLiteSupportedDeckIds,
    defaultDeckId: "spanish",
    definition: briscaLiteGameDefinition,
    getViewModel: (snapshot) => {
        const toViewModel = briscaLiteGameDefinition.toViewModel;
        if (!toViewModel) {
            throw new Error("Brisca-lite game definition is missing a view model adapter.");
        }

        return toViewModel(snapshot);
    },
    createActor: (playerNames, options) => {
        return createActor(createBriscaLiteMachine(playerNames, options)) as CardGameActorRuntime<BriscaLiteViewSnapshot>;
    }
});

export const gameCatalog = {
    "draw-poker": drawPokerCatalogEntry,
    "war-lite": warLiteCatalogEntry,
    "brisca-lite": briscaLiteCatalogEntry
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
