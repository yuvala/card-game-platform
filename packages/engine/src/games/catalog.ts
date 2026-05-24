import { createActor } from 'xstate';

import {
    type CardGameCatalogOptions,
    defineGameCatalogEntry,
    type CardGameActorRuntime,
    type AnyGameCatalogEntry,
} from '../engine/game/catalog';
import type { CardGameConfig } from '../engine/game/config';
import type { GameDefinition } from '../engine/game/definition';
import type { CardGameViewModelFactory } from '../engine/game/viewModel';
import { briscaLiteConfig } from './briscaLite/config';
import { briscaLiteGameDefinition } from './briscaLite/definition';
import { createBriscaLiteMachine } from './briscaLite/machine';
import type { BriscaLiteOptions, BriscaLiteViewSnapshot } from './briscaLite/types';
import { scopaConfig } from './scopa/config';
import { scopaGameDefinition } from './scopa/definition';
import { createScopaMachine } from './scopa/machine';
import type { ScopaOptions, ScopaViewSnapshot } from './scopa/types';
import { pokerLiteConfig } from './pokerLite/config';
import { pokerLiteGameDefinition } from './pokerLite/definition';
import { createPokerLiteMachine } from './pokerLite/machine';
import type { PokerLiteOptions, PokerLiteViewSnapshot } from './pokerLite/types';
import { warLiteConfig } from './warLite/config';
import { warLiteGameDefinition } from './warLite/definition';
import { createWarLiteMachine } from './warLite/machine';
import type { WarLiteOptions, WarLiteViewSnapshot } from './warLite/types';

function createConfiguredCatalogEntry<TSnapshot, TOptions extends CardGameCatalogOptions>(input: {
    config: CardGameConfig;
    definition: GameDefinition<any, any, any, any, TOptions, any, TSnapshot>;
    createMachine: (playerNames: string[], options: TOptions) => Parameters<typeof createActor>[0];
}) {
    const { config, definition, createMachine } = input;

    return defineGameCatalogEntry<TSnapshot, TOptions>({
        id: config.id,
        label: config.label,
        description: config.description,
        minPlayers: config.minPlayers,
        maxPlayers: config.maxPlayers,
        defaultPlayerCount: config.defaultPlayerCount,
        playerCountOptions: config.playerCountOptions,
        supportedDeckIds: config.supportedDeckIds,
        defaultDeckId: config.defaultDeckId,
        definition,
        getViewModel: ((snapshot: TSnapshot, viewerId?: string | null) => {
            const toViewModel = definition.toViewModel;
            if (!toViewModel) {
                throw new Error(config.label + ' game definition is missing a view model adapter.');
            }

            return toViewModel(snapshot, viewerId);
        }) as CardGameViewModelFactory<TSnapshot>,
        createActor: (playerNames, options) => {
            return createActor(
                createMachine(playerNames, options),
            ) as CardGameActorRuntime<TSnapshot>;
        },
    });
}

const pokerLiteCatalogEntry = createConfiguredCatalogEntry<PokerLiteViewSnapshot, PokerLiteOptions>(
    {
        config: pokerLiteConfig,
        definition: pokerLiteGameDefinition,
        createMachine: createPokerLiteMachine,
    },
);

const warLiteCatalogEntry = createConfiguredCatalogEntry<WarLiteViewSnapshot, WarLiteOptions>({
    config: warLiteConfig,
    definition: warLiteGameDefinition,
    createMachine: createWarLiteMachine,
});

const briscaLiteCatalogEntry = createConfiguredCatalogEntry<
    BriscaLiteViewSnapshot,
    BriscaLiteOptions
>({
    config: briscaLiteConfig,
    definition: briscaLiteGameDefinition,
    createMachine: createBriscaLiteMachine,
});

const scopaCatalogEntry = createConfiguredCatalogEntry<ScopaViewSnapshot, ScopaOptions>({
    config: scopaConfig,
    definition: scopaGameDefinition,
    createMachine: createScopaMachine,
});

export const gameCatalog = {
    'poker-lite': pokerLiteCatalogEntry,
    'war-lite': warLiteCatalogEntry,
    'brisca-lite': briscaLiteCatalogEntry,
    'scopa-lite': scopaCatalogEntry,
} satisfies Record<string, AnyGameCatalogEntry>;

export type GameCatalogId = keyof typeof gameCatalog;

export const DEFAULT_GAME_ID: GameCatalogId = 'poker-lite';

export const gameCatalogEntries = Object.values(gameCatalog);

const legacyGameCatalogAliases: Record<string, GameCatalogId> = {
    'draw-poker': 'poker-lite',
};

export function getGameCatalogEntryById(
    gameId: string | null | undefined,
): AnyGameCatalogEntry | null {
    if (!gameId) {
        return null;
    }

    const normalizedGameId = gameId.toLowerCase();
    const resolvedGameId =
        legacyGameCatalogAliases[normalizedGameId] ?? (normalizedGameId as GameCatalogId);
    return gameCatalog[resolvedGameId] ?? null;
}
