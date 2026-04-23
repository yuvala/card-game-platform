import { Card, type CardClickHandler } from "./Card";
import type { Box } from "./types";

export class Player {
    playerName: string;
    playerId = "";
    money: number | string = 10;
    hand: Card[] = [];
    tableSpot: Box;

    constructor(name: string, tableSpot: Box) {
        this.playerName = name;
        this.tableSpot = tableSpot;
    }

    getHand(): Card[] {
        return this.hand;
    }

    grantTurn(callback: CardClickHandler | null): void {
        for (let i = 0; i < this.hand.length; i += 1) {
            if (callback) {
                this.hand[i].setEvent("click", callback);
            } else {
                this.hand[i].removeEvent("click");
            }
        }
    }

    revokeTurn(): void {
        for (let i = 0; i < this.hand.length; i += 1) {
            this.hand[i].removeEvent("click");
        }
    }
}
