import type { Arena } from "./Arena";
import { Card } from "./Card";
import { Deck } from "./Deck";
import { Player } from "./Player";

export class CardsManager {
    readonly arena: Arena;
    readonly deck: Deck;
    readonly cardsToDeal = 5;
    cardsDisplayed = false;
    players: Player[] = [];
    usedCards: Card[] = [];

    constructor(arena: Arena) {
        this.arena = arena;
        this.deck = new Deck();
        this.createHand();
        this.showDeck();
    }

    showDeck(): void {
        console.log("showDeck");
        let left = 0;
        let zIndex = 100;

        if (this.cardsDisplayed) {
            return;
        }

        for (let i = 0; i < this.deck.cards.length; i += 1) {
            const card = this.deck.cards[i].createCard();
            left += 20;
            zIndex += 10;
            card.style.left = left + "px";
            card.style.top = this.arena.drawPile.top + "px";
            card.style.zIndex = String(zIndex);
            this.arena.entryPoint.appendChild(card);
        }

        this.cardsDisplayed = true;
    }

    createHand(): void {
        this.players = this.arena.getPlayers();
    }

    stackShuffle(): void {
        const deck = this.deck.cards;
        let currentIndex = deck.length;

        for (let i = 0; i < deck.length; i += 1) {
            const card = document.getElementById(this.deck.cards[i].cardId());
            if (!card?.parentElement) {
                continue;
            }

            card.parentElement.style.left = Math.floor(Math.random() * 622) + "px";
            card.parentElement.style.top = Math.floor(Math.random() * 600) + "px";
        }

        while (currentIndex !== 0) {
            const randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            const temporaryValue = deck[currentIndex];
            deck[currentIndex] = deck[randomIndex];
            deck[randomIndex] = temporaryValue;
        }

        window.setTimeout(() => {
            const left = this.arena.drawPile.left;
            let zIndex = 100;

            for (let i = 0; i < deck.length; i += 1) {
                const card = document.getElementById(this.deck.cards[i].cardId());
                if (!card?.parentElement) {
                    continue;
                }

                zIndex += 10;
                card.parentElement.style.left = left + "px";
                card.parentElement.style.top = this.arena.drawPile.top + "px";
                card.parentElement.style.zIndex = String(zIndex);
            }
        }, 1000);
    }

    stackDeal(callback?: () => void): void {
        const cardsAmount = this.cardsToDeal * this.players.length;
        let remaining = cardsAmount;
        let currentPlayerIndex = 0;
        let left = 0;
        let top = 0;

        const loopNumbers = () => {
            if (remaining <= 0) {
                console.log("cone");
                callback?.();
                return;
            }

            if (currentPlayerIndex > this.players.length - 1) {
                currentPlayerIndex = 0;
            }

            const player = this.players[currentPlayerIndex];
            const lastDeckIndex = this.deck.cards.length - 1;
            let gap = 0;

            if (player.hand.length - 1 !== -1) {
                gap = 90;
                left = parseInt(player.hand[player.hand.length - 1].getLeft(), 10);
                top = parseInt(player.hand[player.hand.length - 1].getTop(), 10);
            } else {
                left = player.tableSpot.left;
                top = player.tableSpot.top;
            }

            player.hand.push(this.deck.cards.splice(lastDeckIndex, 1)[0]);
            const currentCard = player.hand[player.hand.length - 1];
            const spotId = player.tableSpot.spotId;

            if (spotId === "secondSpot" || spotId === "thirdSpot") {
                currentCard.setLeft(left);
                currentCard.setClassName(spotId);
                currentCard.setTop(top + gap);
            } else {
                currentCard.setLeft(left + gap);
                currentCard.setClassName(spotId);
                currentCard.setTop(player.tableSpot.top);
            }

            currentPlayerIndex += 1;
            remaining -= 1;
            window.setTimeout(loopNumbers, 200);
        };

        loopNumbers();
    }

    doSelectCard(playerNum: number, card: Card): void {
        card.removeClassName("activated");
        const player = this.players[playerNum];
        const spotId = player.tableSpot.spotId;
        const cardbox = this.arena.getBox(card.cardId());
        const dump = this.arena.getDumpPile();

        if (spotId === "secondSpot") {
            const top = dump.top - cardbox.width / 2;
            card.markAsSelected(dump.left + dump.width, top);
        } else if (spotId === "thirdSpot") {
            const left = dump.left - cardbox.height;
            const top = dump.top - cardbox.width / 2;
            card.markAsSelected(left, top);
        } else {
            const left = dump.left - Math.abs(dump.width / 2 - cardbox.width / 2);
            card.markAsSelected(left, dump.top + dump.height);
        }

        const index = player.hand.indexOf(card);
        if (index !== -1) {
            this.usedCards.push(player.hand.splice(index, 1)[0]);
        }
    }

    clearOldCards(): void {
        for (let i = 0; i < this.usedCards.length; i += 1) {
            this.usedCards[i].resetClassName();
            this.usedCards[i].setTop(-500);
            this.usedCards[i].setLeft(-50);
        }

        this.usedCards = [];
    }
}
