import { Player } from "./Player";

interface GameData {
    players: Player[];
}

export class StatusBoard {
    private static instance: StatusBoard | null = null;

    private gameData: GameData = { players: [] };
    private element: HTMLDivElement | null = null;
    private playersTitle: HTMLDivElement | null = null;
    private logDiv: HTMLDivElement | null = null;

    static getInstance(): StatusBoard {
        if (!StatusBoard.instance) {
            console.log("initial");
            StatusBoard.instance = new StatusBoard();
        }

        return StatusBoard.instance;
    }

    getEl(): HTMLDivElement {
        if (this.element) {
            return this.element;
        }

        const container = document.createElement("div");
        const gameTitle = document.createElement("div");
        const playersTitle = document.createElement("div");
        const logDiv = document.createElement("div");

        container.className = "board";
        gameTitle.className = "title";
        playersTitle.className = "title";
        logDiv.className = "logs";

        container.appendChild(gameTitle);
        container.appendChild(playersTitle);
        container.appendChild(logDiv);

        gameTitle.innerHTML = "Game Begin";

        this.element = container;
        this.playersTitle = playersTitle;
        this.logDiv = logDiv;
        this.renderPlayers();

        return container;
    }

    update(data: GameData): void {
        this.gameData = data;
        this.renderPlayers();
    }

    insertLog(arg: string): void {
        if (!this.logDiv) {
            return;
        }

        this.logDiv.innerHTML = arg + "<br>" + this.logDiv.innerHTML;
    }

    currentTurn(index: number): void {
        const players = this.element?.getElementsByClassName("_player");
        if (!players) {
            return;
        }

        for (let i = 0; i < players.length; i += 1) {
            players[i].classList.remove("currentTurn");
        }

        const current = players.item(index);
        if (current) {
            current.classList.add("currentTurn");
        }
    }

    private renderPlayers(): void {
        if (!this.playersTitle) {
            return;
        }

        this.playersTitle.innerHTML = "Players:";
        for (let i = 0; i < this.gameData.players.length; i += 1) {
            const div = document.createElement("div");
            div.className = "_player";
            div.innerHTML = "<span>player " + (i + 1) + ": </span><span>" + this.gameData.players[i].playerName + "</span>";
            this.playersTitle.appendChild(div);
        }
    }
}
