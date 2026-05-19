import type { SupportedDeckId } from '@engine/engine/cards/deckDefinitions';

export interface GameSelection {
    gameId: string;
    playerCount: number;
    deckId: SupportedDeckId;
}

export interface ActiveTableSummary {
    gameLabel: string;
    deckLabel: string;
    playerNames: string[];
}
