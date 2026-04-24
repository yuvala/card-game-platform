import type { DeckDefinition } from "../types";
import { frenchDeckDefinition } from "./french";
import { italianDeckDefinition } from "./italian";
import { spanishDeckDefinition } from "./spanish";

export const supportedDeckDefinitions = {
    french: frenchDeckDefinition,
    spanish: spanishDeckDefinition,
    italian: italianDeckDefinition
} satisfies Record<string, DeckDefinition>;

export type SupportedDeckId = keyof typeof supportedDeckDefinitions;

export const DEFAULT_DECK_ID: SupportedDeckId = "french";

export function getDeckDefinitionById(deckId: string | null | undefined): DeckDefinition | null {
    if (!deckId) {
        return null;
    }

    const normalizedDeckId = deckId.toLowerCase() as SupportedDeckId;
    return supportedDeckDefinitions[normalizedDeckId] ?? null;
}

export {
    frenchDeckDefinition,
    italianDeckDefinition,
    spanishDeckDefinition
};
