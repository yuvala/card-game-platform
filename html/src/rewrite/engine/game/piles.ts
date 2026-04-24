import type { CardPile, CardPileMap, CardPileRole } from "./types";

interface CreateCardPileOptions<TCard> {
    id: string;
    role: CardPileRole;
    label: string;
    ownerId?: string;
    cards?: readonly TCard[];
    isFaceUp?: boolean;
    isVisibleToAll?: boolean;
}

export function createCardPile<TCard>(options: CreateCardPileOptions<TCard>): CardPile<TCard> {
    return {
        id: options.id,
        role: options.role,
        label: options.label,
        ownerId: options.ownerId,
        cards: options.cards ? options.cards.slice() : [],
        isFaceUp: options.isFaceUp ?? false,
        isVisibleToAll: options.isVisibleToAll ?? false
    };
}

export function getPile<TCard>(piles: CardPileMap<TCard>, pileId: string): CardPile<TCard> | null {
    return piles[pileId] ?? null;
}

export function getPileCards<TCard>(piles: CardPileMap<TCard>, pileId: string): TCard[] {
    return piles[pileId]?.cards.slice() ?? [];
}

export function setPileCards<TCard>(
    piles: CardPileMap<TCard>,
    pileId: string,
    cards: readonly TCard[]
): CardPileMap<TCard> {
    const pile = getPile(piles, pileId);
    if (!pile) {
        return piles;
    }

    return {
        ...piles,
        [pileId]: {
            ...pile,
            cards: cards.slice()
        }
    };
}

export function appendCardsToPile<TCard>(
    piles: CardPileMap<TCard>,
    pileId: string,
    cards: readonly TCard[]
): CardPileMap<TCard> {
    const pile = getPile(piles, pileId);
    if (!pile || cards.length === 0) {
        return piles;
    }

    return {
        ...piles,
        [pileId]: {
            ...pile,
            cards: pile.cards.concat(cards)
        }
    };
}

export function clearPile<TCard>(piles: CardPileMap<TCard>, pileId: string): CardPileMap<TCard> {
    return setPileCards(piles, pileId, []);
}

export function drawTopCardFromPile<TCard>(
    piles: CardPileMap<TCard>,
    pileId: string
): { piles: CardPileMap<TCard>; card: TCard | null } {
    const pile = getPile(piles, pileId);
    if (!pile || pile.cards.length === 0) {
        return {
            piles,
            card: null
        };
    }

    const cards = pile.cards.slice();
    const card = cards.pop() ?? null;

    return {
        piles: setPileCards(piles, pileId, cards),
        card
    };
}

export function moveTopCardBetweenPiles<TCard>(
    piles: CardPileMap<TCard>,
    fromPileId: string,
    toPileId: string
): { piles: CardPileMap<TCard>; card: TCard | null } {
    const drawn = drawTopCardFromPile(piles, fromPileId);
    if (!drawn.card) {
        return drawn;
    }

    return {
        piles: appendCardsToPile(drawn.piles, toPileId, [drawn.card]),
        card: drawn.card
    };
}

export function removeCardFromPile<TCard>(
    piles: CardPileMap<TCard>,
    pileId: string,
    predicate: (card: TCard) => boolean
): { piles: CardPileMap<TCard>; card: TCard | null } {
    const pile = getPile(piles, pileId);
    if (!pile) {
        return {
            piles,
            card: null
        };
    }

    const cardIndex = pile.cards.findIndex(predicate);
    if (cardIndex < 0) {
        return {
            piles,
            card: null
        };
    }

    const cards = pile.cards.slice();
    const [card] = cards.splice(cardIndex, 1);

    return {
        piles: setPileCards(piles, pileId, cards),
        card: card ?? null
    };
}

export function moveCardBetweenPiles<TCard>(
    piles: CardPileMap<TCard>,
    fromPileId: string,
    toPileId: string,
    predicate: (card: TCard) => boolean
): { piles: CardPileMap<TCard>; card: TCard | null } {
    const removed = removeCardFromPile(piles, fromPileId, predicate);
    if (!removed.card) {
        return removed;
    }

    return {
        piles: appendCardsToPile(removed.piles, toPileId, [removed.card]),
        card: removed.card
    };
}
