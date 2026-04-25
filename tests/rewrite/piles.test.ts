import {
    appendCardsToPile,
    createCardPile,
    drawTopCardFromPile,
    getPile,
    getPileCards,
    moveCardBetweenPiles,
    moveTopCardBetweenPiles,
    removeCardFromPile,
    setPileCards
} from "../../html/src/rewrite/engine/game/piles";

interface TestCard {
    id: string;
}

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
    assert(actual === expected, `${message} Expected ${String(expected)}, got ${String(actual)}.`);
}

function assertJsonEqual(actual: unknown, expected: unknown, message: string) {
    const actualJson = JSON.stringify(actual);
    const expectedJson = JSON.stringify(expected);
    assert(actualJson === expectedJson, `${message} Expected ${expectedJson}, got ${actualJson}.`);
}

const sourceCards: TestCard[] = [{ id: "a" }, { id: "b" }];
const pile = createCardPile({
    id: "stock",
    role: "stock",
    label: "Stock",
    cards: sourceCards,
    isFaceUp: true
});

assertEqual(pile.id, "stock", "createCardPile should keep the pile id.");
assertEqual(pile.cards.length, 2, "createCardPile should copy cards.");
assertEqual(pile.isFaceUp, true, "createCardPile should keep explicit face-up state.");
sourceCards.push({ id: "c" });
assertEqual(pile.cards.length, 2, "createCardPile should clone the input card array.");

const piles = {
    stock: pile,
    discard: createCardPile<TestCard>({
        id: "discard",
        role: "discard",
        label: "Discard"
    }),
    hand: createCardPile<TestCard>({
        id: "hand",
        role: "hand",
        label: "Hand",
        cards: [{ id: "x" }]
    })
};

assert(getPile(piles, "missing") === null, "getPile should return null for a missing pile.");
assertJsonEqual(getPileCards(piles, "hand"), [{ id: "x" }], "getPileCards should return a shallow copy.");

const replaced = setPileCards(piles, "hand", [{ id: "y" }, { id: "z" }]);
assertJsonEqual(getPileCards(replaced, "hand"), [{ id: "y" }, { id: "z" }], "setPileCards should replace cards.");
assertJsonEqual(getPileCards(piles, "hand"), [{ id: "x" }], "setPileCards should not mutate the original pile.");

const appended = appendCardsToPile(replaced, "discard", [{ id: "d1" }, { id: "d2" }]);
assertJsonEqual(getPileCards(appended, "discard"), [{ id: "d1" }, { id: "d2" }], "appendCardsToPile should append cards.");

const drawn = drawTopCardFromPile(appended, "stock");
assertEqual(drawn.card?.id ?? null, "b", "drawTopCardFromPile should draw the last card.");
assertJsonEqual(getPileCards(drawn.piles, "stock"), [{ id: "a" }], "drawTopCardFromPile should remove the top card.");

const movedTop = moveTopCardBetweenPiles(drawn.piles, "stock", "discard");
assertEqual(movedTop.card?.id ?? null, "a", "moveTopCardBetweenPiles should move the top card.");
assertJsonEqual(
    getPileCards(movedTop.piles, "discard"),
    [{ id: "d1" }, { id: "d2" }, { id: "a" }],
    "moveTopCardBetweenPiles should append the moved card to the destination."
);

const removed = removeCardFromPile(movedTop.piles, "discard", (card) => card.id === "d2");
assertEqual(removed.card?.id ?? null, "d2", "removeCardFromPile should remove the matching card.");
assertJsonEqual(
    getPileCards(removed.piles, "discard"),
    [{ id: "d1" }, { id: "a" }],
    "removeCardFromPile should keep the remaining cards in order."
);

const movedByPredicate = moveCardBetweenPiles(removed.piles, "discard", "hand", (card) => card.id === "a");
assertEqual(movedByPredicate.card?.id ?? null, "a", "moveCardBetweenPiles should move the matching card.");
assertJsonEqual(
    getPileCards(movedByPredicate.piles, "hand"),
    [{ id: "y" }, { id: "z" }, { id: "a" }],
    "moveCardBetweenPiles should append the moved card to the destination pile."
);
assertJsonEqual(
    getPileCards(movedByPredicate.piles, "discard"),
    [{ id: "d1" }],
    "moveCardBetweenPiles should remove the card from the source pile."
);

console.log("piles.test.ts passed");
