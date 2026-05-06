export interface DeckSuitDefinition {
    id: string;
    label: string;
    shortLabel: string;
}

export interface DeckRankDefinition {
    id: string;
    label: string;
    shortLabel: string;
    sortOrder: number;
}

export interface DeckDefinition {
    id: string;
    name: string;
    suits: readonly DeckSuitDefinition[];
    ranks: readonly DeckRankDefinition[];
}

export interface CardInstance {
    id: string;
    deckId: string;
    suitId: string;
    suitLabel: string;
    suitShortLabel: string;
    rankId: string;
    rankLabel: string;
    rankShortLabel: string;
    sortOrder: number;
    displayLabel: string;
}
