import type { DeckDefinition } from "../types";

export const italianDeckDefinition: DeckDefinition = {
    id: "italian",
    name: "Italian Deck",
    suits: [
        { id: "coins", label: "Coins", shortLabel: "O" },
        { id: "cups", label: "Cups", shortLabel: "C" },
        { id: "swords", label: "Swords", shortLabel: "S" },
        { id: "batons", label: "Batons", shortLabel: "B" }
    ],
    ranks: [
        { id: "2", label: "2", shortLabel: "2", sortOrder: 2 },
        { id: "3", label: "3", shortLabel: "3", sortOrder: 3 },
        { id: "4", label: "4", shortLabel: "4", sortOrder: 4 },
        { id: "5", label: "5", shortLabel: "5", sortOrder: 5 },
        { id: "6", label: "6", shortLabel: "6", sortOrder: 6 },
        { id: "7", label: "7", shortLabel: "7", sortOrder: 7 },
        { id: "fante", label: "Fante", shortLabel: "F", sortOrder: 10 },
        { id: "cavallo", label: "Cavallo", shortLabel: "C", sortOrder: 11 },
        { id: "re", label: "Re", shortLabel: "R", sortOrder: 12 },
        { id: "ace", label: "Asso", shortLabel: "A", sortOrder: 14 }
    ]
};
