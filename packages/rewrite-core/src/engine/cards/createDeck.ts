import type { CardInstance, DeckDefinition } from "./types";

export function createDeck(definition: DeckDefinition): CardInstance[] {
    const cards: CardInstance[] = [];

    definition.suits.forEach((suit) => {
        definition.ranks.forEach((rank) => {
            cards.push({
                id: definition.id + "-" + rank.id + "-" + suit.id,
                deckId: definition.id,
                suitId: suit.id,
                suitLabel: suit.label,
                suitShortLabel: suit.shortLabel,
                rankId: rank.id,
                rankLabel: rank.label,
                rankShortLabel: rank.shortLabel,
                sortOrder: rank.sortOrder,
                displayLabel: rank.shortLabel + suit.shortLabel
            });
        });
    });

    return cards;
}

export function shuffleDeck(cards: CardInstance[], random: () => number = Math.random): CardInstance[] {
    const shuffled = cards.slice();

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        const current = shuffled[index];
        shuffled[index] = shuffled[swapIndex];
        shuffled[swapIndex] = current;
    }

    return shuffled;
}
