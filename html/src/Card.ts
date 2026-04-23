import type { Suit } from "./types";

export type CardClickHandler = (event: MouseEvent, card: Card) => void;

const suitEnum: Record<Suit, string> = {
    heart: "&hearts;",
    club: "&clubs;",
    spade: "&spades;",
    diamond: "&diams;"
};

function normalizePosition(value: number | string): string {
    if (typeof value === "number") {
        return value + "px";
    }

    if (/^-?\d+(\.\d+)?$/.test(value)) {
        return value + "px";
    }

    return value;
}

export class Card {
    readonly num: string;
    readonly suit: Suit;
    getCard: HTMLDivElement | null = null;
    status: string | null = null;

    constructor(num: string, suit: Suit) {
        this.num = num;
        this.suit = suit;
    }

    cardId(): string {
        return this.num + this.suit;
    }

    createCard(): HTMLDivElement {
        const card = document.createElement("div");
        const container = document.createElement("div");
        const front = document.createElement("div");
        const back = document.createElement("div");

        container.className = "cardContainer";
        card.className = "card";
        front.className = "front " + this.suit;
        back.className = "back";

        front.innerHTML = this.num + '<span class="symbol">' + this.getSymbol() + "</span>";
        card.id = this.cardId();

        card.appendChild(front);
        card.appendChild(back);
        container.appendChild(card);
        this.getCard = container;

        return container;
    }

    getSymbol(): string {
        return suitEnum[this.suit];
    }

    domElement(): HTMLDivElement {
        const element = document.getElementById(this.cardId());
        if (!(element instanceof HTMLDivElement)) {
            throw new Error("Missing DOM element for card " + this.cardId());
        }

        return element;
    }

    private containerElement(): HTMLDivElement {
        if (!(this.getCard instanceof HTMLDivElement)) {
            throw new Error("Card container was not created for " + this.cardId());
        }

        return this.getCard;
    }

    getLeft(): string {
        return this.domElement().parentElement?.style.left || "";
    }

    setLeft(left: number | string): void {
        const parent = this.domElement().parentElement;
        if (parent instanceof HTMLDivElement) {
            parent.style.left = normalizePosition(left);
        }
    }

    getTop(): string {
        return this.domElement().parentElement?.style.top || "";
    }

    setTop(top: number | string): void {
        const parent = this.domElement().parentElement;
        if (parent instanceof HTMLDivElement) {
            parent.style.top = normalizePosition(top);
        }
    }

    setClassName(cssClass: string): void {
        const parent = this.domElement().parentElement;
        if (parent instanceof HTMLDivElement) {
            parent.classList.add(cssClass);
        }
    }

    setEvent(type: "click", callback: CardClickHandler): void {
        if (type !== "click") {
            return;
        }

        const container = this.containerElement();
        container.classList.add("activated");
        container.onclick = (event: MouseEvent) => {
            console.log("card clicked!");
            callback(event, this);
        };
    }

    markAsSelected(left: number | string, top: number | string): void {
        this.setTop(top);
        this.setLeft(left);
    }

    removeClassName(cssClass: string): void {
        this.containerElement().classList.remove(cssClass);
    }

    removeEvent(type: "click"): void {
        this.removeClassName("activated");
        if (type === "click") {
            this.containerElement().onclick = null;
        }
    }

    resetClassName(): void {
        const parent = this.domElement().parentElement;
        if (parent instanceof HTMLDivElement) {
            parent.className = "cardContainer";
        }
    }
}
