import * as Phaser from "phaser";

import { CardSandboxScene } from "./scenes/CardSandboxScene";

const CARD_SANDBOX_WIDTH = 1040;
const CARD_SANDBOX_HEIGHT = 980;

export interface CardSandboxGame {
    game: Phaser.Game;
    setDeck(deckId: string): void;
    setSection(section: CardSandboxSection): void;
    replay(): void;
}

export type CardSandboxSection = "real" | "ghost" | "layer";

export function createCardSandboxGame(parent: string, initialDeckId: string): CardSandboxGame {
    const scene = new CardSandboxScene(initialDeckId);
    const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent,
        width: CARD_SANDBOX_WIDTH,
        height: CARD_SANDBOX_HEIGHT,
        backgroundColor: "#07140f",
        render: {
            antialias: true,
            antialiasGL: true,
            roundPixels: false
        },
        scale: {
            mode: Phaser.Scale.FIT,
            autoRound: true,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        scene: [scene]
    });

    return {
        game,
        setDeck: (deckId) => {
            scene.setDeck(deckId);
        },
        setSection: (section) => {
            scene.setSection(section);
        },
        replay: () => {
            scene.replayAnimations();
        }
    };
}
