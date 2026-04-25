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
import { pokerLiteGameDefinition } from "./pokerLite/definition";
import { createPokerLiteMachine } from "./pokerLite/machine";
import type { PokerLiteOptions, PokerLiteViewSnapshot } from "./pokerLite/types";
import { warLiteGameDefinition } from "./warLite/definition";
import { createWarLiteMachine } from "./warLite/machine";
import type { WarLiteOptions, WarLiteViewSnapshot } from "./warLite/types";

const pokerLiteSupportedDeckIds = ["french", "spanish", "italian"] as const satisfies readonly SupportedDeckId[];
const warLiteSupportedDeckIds = ["french", "spanish", "italian"] as const satisfies readonly SupportedDeckId[];
const briscaLiteSupportedDeckIds = ["spanish", "italian"] as const satisfies readonly SupportedDeckId[];

const pokerLiteCatalogEntry = defineGameCatalogEntry<PokerLiteViewSnapshot, PokerLiteOptions>({
    id: "poker-lite",
    label: "Poker Lite",
    description: "Prototype high-card ruleset for the rewrite runtime. Every player reveals and plays a card each round.",
    minPlayers: 2,
    maxPlayers: 8,
    defaultPlayerCount: 3,
    supportedDeckIds: pokerLiteSupportedDeckIds,
    defaultDeckId: "french",
    definition: pokerLiteGameDefinition,
    getViewModel: (snapshot) => {
        const toViewModel = pokerLiteGameDefinition.toViewModel;
        if (!toViewModel) {
            throw new Error("Poker Lite game definition is missing a view model adapter.");
        }

        return toViewModel(snapshot);
    },
    createActor: (playerNames, options) => {
        return createActor(createPokerLiteMachine(playerNames, options)) as CardGameActorRuntime<PokerLiteViewSnapshot>;
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
    "poker-lite": pokerLiteCatalogEntry,
    "war-lite": warLiteCatalogEntry,
    "brisca-lite": briscaLiteCatalogEntry
} satisfies Record<string, AnyGameCatalogEntry>;

export type GameCatalogId = keyof typeof gameCatalog;

export const DEFAULT_GAME_ID: GameCatalogId = "poker-lite";

export const gameCatalogEntries = Object.values(gameCatalog);

const legacyGameCatalogAliases: Record<string, GameCatalogId> = {
    "draw-poker": "poker-lite"
};

export function getGameCatalogEntryById(gameId: string | null | undefined): AnyGameCatalogEntry | null {
    if (!gameId) {
        return null;
    }

    const normalizedGameId = gameId.toLowerCase();
    const resolvedGameId = legacyGameCatalogAliases[normalizedGameId] ?? (normalizedGameId as GameCatalogId);
    return gameCatalog[resolvedGameId] ?? null;
}
