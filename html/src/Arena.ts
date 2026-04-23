import type { Card } from "./Card";
import { CardsManager } from "./CardsManager";
import { Player } from "./Player";
import { StatusBoard } from "./StatusBoard";
import { TurnsManager } from "./TurnsManager";
import type { Box, PlayersDocument } from "./types";

interface Controls {
    start: HTMLInputElement | null;
    shuffle: HTMLInputElement | null;
    deal: HTMLInputElement | null;
}

export class Arena {
    readonly entryPoint: HTMLElement;
    readonly cardsManager: CardsManager;
    readonly tm: TurnsManager;
    readonly controls: Controls;
    readonly jsonFile: PlayersDocument;
    drawPile: Box = { top: 0, left: 0, height: 0, width: 0, spotId: "drawPile" };
    players: Player[] = [];
    readonly spotId = ["firstSpot", "secondSpot", "thirdSpot"];
    tableSpotPos: Box[] = [];
    cardsDisplayed = false;
    isShuffled = false;
    hasDealt = false;

    constructor(entryPoint: HTMLElement, playersDocument: PlayersDocument) {
        this.entryPoint = entryPoint;
        this.jsonFile = playersDocument;
        this.controls = {
            start: document.getElementById("startGame") as HTMLInputElement | null,
            shuffle: document.getElementById("shuff") as HTMLInputElement | null,
            deal: document.getElementById("deal") as HTMLInputElement | null
        };

        this.setPlayers(3);
        this.initDrawPile();
        this.cardsManager = new CardsManager(this);
        this.initBoard();
        this.tm = new TurnsManager(this);

        this.controls.shuffle?.addEventListener("click", () => {
            this.shuffleCards();
        });

        this.controls.deal?.addEventListener("click", () => {
            this.stackDeal();
        });

        if (this.controls.start) {
            this.controls.start.disabled = true;
        }

        this.updateControls();
    }

    notifyBoard(type: number, arg: string | number): void {
        if (type === 1 && typeof arg === "number") {
            StatusBoard.getInstance().currentTurn(arg);
            return;
        }

        StatusBoard.getInstance().insertLog(String(arg));
    }

    showDeck(): void {
        this.cardsManager.showDeck();
    }

    shuffleCards(): void {
        if (this.hasDealt) {
            return;
        }

        this.cardsManager.stackShuffle();
        this.isShuffled = true;
        this.updateControls();
    }

    stackDeal(): void {
        if (!this.isShuffled || this.hasDealt) {
            return;
        }

        this.hasDealt = true;
        this.updateControls();
        this.cardsManager.stackDeal(() => {
            this.tm.start(this.players.length, this.cardsManager.cardsToDeal);
        });
    }

    getBox(id: string): Box {
        let element = document.getElementById(id);
        if (!element) {
            throw new Error("Missing table element: " + id);
        }

        let top = 0;
        let left = 0;
        const width = element.clientWidth;
        const height = element.clientHeight;

        while (element.tagName !== "BODY") {
            top += element.offsetTop;
            left += element.offsetLeft;
            if (!element.offsetParent) {
                break;
            }

            element = element.offsetParent as HTMLElement;
        }

        return {
            top,
            left,
            height,
            width,
            spotId: id
        };
    }

    getDumpPile(): Box {
        return this.getBox("dumpPile");
    }

    getPlayers(): Player[] {
        return this.players;
    }

    initDrawPile(): void {
        this.drawPile = this.getBox("drawPile");
    }

    initBoard(): void {
        const board = StatusBoard.getInstance();
        board.update({ players: this.players });
        this.entryPoint.appendChild(board.getEl());
    }

    cardSelected(playerNum: number, card: Card): void {
        this.cardsManager.doSelectCard(playerNum, card);
    }

    cleanDump(): void {
        this.cardsManager.clearOldCards();
    }

    updateControls(): void {
        if (this.controls.shuffle) {
            this.controls.shuffle.disabled = this.hasDealt;
        }

        if (this.controls.deal) {
            this.controls.deal.disabled = !this.isShuffled || this.hasDealt;
        }
    }

    private setPlayers(num: number): void {
        console.log("set players");
        const playerSeeds = this.jsonFile.players || [];
        const limit = Math.min(num, playerSeeds.length, this.spotId.length);

        for (let i = 0; i < limit; i += 1) {
            const player = new Player("player" + (i + 1), this.getBox(this.spotId[i]));
            player.playerName = playerSeeds[i].playerName;
            player.money = playerSeeds[i].money;
            this.players.push(player);
        }
    }
}
