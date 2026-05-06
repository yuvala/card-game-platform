import type { DeckDefinition } from "../types";

export const frenchDeckDefinition: DeckDefinition = {
    id: "french",
    name: "French Deck",
    suits: [
        { id: "hearts", label: "Hearts", shortLabel: "H" },
        { id: "spades", label: "Spades", shortLabel: "S" },
        { id: "diamonds", label: "Diamonds", shortLabel: "D" },
        { id: "clubs", label: "Clubs", shortLabel: "C" }
    ],
    ranks: [
        { id: "2", label: "2", shortLabel: "2", sortOrder: 2 },
        { id: "3", label: "3", shortLabel: "3", sortOrder: 3 },
        { id: "4", label: "4", shortLabel: "4", sortOrder: 4 },
        { id: "5", label: "5", shortLabel: "5", sortOrder: 5 },
        { id: "6", label: "6", shortLabel: "6", sortOrder: 6 },
        { id: "7", label: "7", shortLabel: "7", sortOrder: 7 },
        { id: "8", label: "8", shortLabel: "8", sortOrder: 8 },
        { id: "9", label: "9", shortLabel: "9", sortOrder: 9 },
        { id: "10", label: "10", shortLabel: "10", sortOrder: 10 },
        { id: "jack", label: "Jack", shortLabel: "J", sortOrder: 11 },
        { id: "queen", label: "Queen", shortLabel: "Q", sortOrder: 12 },
        { id: "king", label: "King", shortLabel: "K", sortOrder: 13 },
        { id: "ace", label: "Ace", shortLabel: "A", sortOrder: 14 }
    ]
};
