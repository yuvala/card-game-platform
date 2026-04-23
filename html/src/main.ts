import playersData from "../data/players.json";
import { Arena } from "./Arena";

let arena: Arena | null = null;

function beginGame(): void {
    const entryPoint = document.getElementById("main");
    if (!(entryPoint instanceof HTMLElement) || arena) {
        return;
    }

    arena = new Arena(entryPoint, playersData);
}

function bindStartButton(): void {
    const startButton = document.getElementById("startGame");
    if (!(startButton instanceof HTMLInputElement)) {
        return;
    }

    startButton.addEventListener("click", beginGame);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindStartButton);
} else {
    bindStartButton();
}
