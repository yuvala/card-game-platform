import type { Arena } from "./Arena";
import type { Card } from "./Card";
import { Player } from "./Player";

export class TurnsManager {
    private readonly arena: Arena;
    private round = 0;
    private turnDone = false;
    private playerNum = 0;
    private totalRounds = 0;
    private totalPlayers = 0;
    currentPlayer: Player | null = null;

    constructor(arena: Arena) {
        this.arena = arena;
    }

    start(totalPlayers: number, totalRounds: number): void {
        this.round = 0;
        this.playerNum = 0;
        this.turnDone = false;
        this.totalPlayers = totalPlayers;
        this.totalRounds = totalRounds;
        this.playRound();
    }

    playRound(): void {
        if (this.round < this.totalRounds) {
            this.allowedAction();
        }
    }

    doTurn(card: Card): void {
        this.arena.cardSelected(this.playerNum, card);
        this.arena.notifyBoard(0, this.arena.players[this.playerNum].playerName + " played his turn");
        this.removeClickFunc();
        this.playerNum += 1;
        this.playRound();
    }

    private allowedAction(): void {
        if (this.playerNum > this.totalPlayers - 1) {
            window.setTimeout(() => {
                this.processLastRound();
            }, 2000);

            this.playerNum = 0;
            this.round += 1;

            if (this.round === this.totalRounds) {
                this.turnDone = true;
                this.arena.notifyBoard(0, "<b>all round finnished!!!</b>");
            }
        }

        if (!this.turnDone) {
            window.setTimeout(() => {
                this.addClickFunc(this.arena.players[this.playerNum]);
                this.arena.notifyBoard(1, this.playerNum);
            }, 2000);
        }
    }

    private addClickFunc(player: Player | undefined): void {
        if (!player) {
            return;
        }

        this.currentPlayer = player;
        player.grantTurn((_event, card) => {
            this.doTurn(card);
        });
    }

    private removeClickFunc(): void {
        if (this.currentPlayer) {
            this.currentPlayer.revokeTurn();
            this.currentPlayer = null;
        }
    }

    private processLastRound(): void {
        this.arena.cleanDump();
    }
}
