import type { DeckDefinition } from "../types";

export const spanishDeckDefinition: DeckDefinition = {
    id: "spanish",
    name: "Spanish Deck",
    suits: [
        { id: "oros", label: "Oros", shortLabel: "O" },
        { id: "copas", label: "Copas", shortLabel: "C" },
        { id: "espadas", label: "Espadas", shortLabel: "E" },
        { id: "bastos", label: "Bastos", shortLabel: "B" }
    ],
    ranks: [
        { id: "2", label: "2", shortLabel: "2", sortOrder: 2 },
        { id: "3", label: "3", shortLabel: "3", sortOrder: 3 },
        { id: "4", label: "4", shortLabel: "4", sortOrder: 4 },
        { id: "5", label: "5", shortLabel: "5", sortOrder: 5 },
        { id: "6", label: "6", shortLabel: "6", sortOrder: 6 },
        { id: "7", label: "7", shortLabel: "7", sortOrder: 7 },
        { id: "sota", label: "Sota", shortLabel: "S", sortOrder: 10 },
        { id: "caballo", label: "Caballo", shortLabel: "C", sortOrder: 11 },
        { id: "rey", label: "Rey", shortLabel: "R", sortOrder: 12 },
        { id: "ace", label: "As", shortLabel: "A", sortOrder: 14 }
    ]
};
