import { Card } from "./Card";
import type { Suit } from "./types";

const suits: Suit[] = ["heart", "spade", "diamond", "club"];
const cardNumbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "j", "q", "k"];

export class Deck {
    cards: Card[] = [];

    constructor() {
        this.create();
    }

    create(): void {
        this.cards = [];
        suits.forEach((suit) => {
            for (let i = 0; i < cardNumbers.length; i += 1) {
                this.cards.push(new Card(cardNumbers[i], suit));
            }
        });
    }
}
