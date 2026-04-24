import type { SupportedDeckId } from "../cards/deckDefinitions";
import type { DeckDefinition } from "../cards/types";
import type { GameDefinition } from "./definition";
import type { CardGameActor, CardGameViewModelFactory } from "./viewModel";

export interface CardGameActorRuntime<TSnapshot> extends CardGameActor<TSnapshot> {
    start(): void;
    stop(): void;
}

export interface CardGameCatalogOptions {
    deckDefinition: DeckDefinition;
    cardsPerPlayer?: number;
    random?: () => number;
}

export interface GameCatalogEntry<
    TSnapshot = unknown,
    TOptions extends CardGameCatalogOptions = CardGameCatalogOptions
> {
    id: string;
    label: string;
    description: string;
    minPlayers: number;
    maxPlayers: number;
    defaultPlayerCount: number;
    supportedDeckIds: readonly SupportedDeckId[];
    defaultDeckId: SupportedDeckId;
    definition: GameDefinition<any, any, any, any, TOptions, any, TSnapshot>;
    getViewModel: CardGameViewModelFactory<TSnapshot>;
    createActor: (playerNames: string[], options: TOptions) => CardGameActorRuntime<TSnapshot>;
}

export type AnyGameCatalogEntry = GameCatalogEntry<any, any>;

export function defineGameCatalogEntry<
    TSnapshot,
    TOptions extends CardGameCatalogOptions = CardGameCatalogOptions
>(entry: GameCatalogEntry<TSnapshot, TOptions>): GameCatalogEntry<TSnapshot, TOptions> {
    return entry;
}

export function resolvePlayerCount(
    entry: Pick<GameCatalogEntry, "minPlayers" | "maxPlayers" | "defaultPlayerCount">,
    requestedPlayerCount: number | null | undefined,
    availablePlayerCount: number
): number {
    const availableCount = Math.max(availablePlayerCount, 0);
    if (availableCount === 0) {
        return 0;
    }

    const upperBound = Math.max(1, Math.min(entry.maxPlayers, availableCount));
    const lowerBound = Math.min(Math.max(entry.minPlayers, 1), upperBound);
    const fallbackCount = Math.min(Math.max(entry.defaultPlayerCount, lowerBound), upperBound);
    const normalizedRequested =
        typeof requestedPlayerCount === "number" && Number.isFinite(requestedPlayerCount)
            ? Math.floor(requestedPlayerCount)
            : fallbackCount;

    return Math.min(Math.max(normalizedRequested, lowerBound), upperBound);
}

export function resolveDeckId(
    entry: Pick<GameCatalogEntry, "supportedDeckIds" | "defaultDeckId">,
    requestedDeckId: string | null | undefined
): SupportedDeckId {
    if (requestedDeckId) {
        const normalizedDeckId = requestedDeckId.toLowerCase() as SupportedDeckId;
        if (entry.supportedDeckIds.includes(normalizedDeckId)) {
            return normalizedDeckId;
        }
    }

    return entry.defaultDeckId;
}
