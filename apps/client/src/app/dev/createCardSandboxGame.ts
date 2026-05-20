import * as Phaser from 'phaser';

import { buildPhaserConfig } from '../phaser/buildPhaserConfig';
import { CardSandboxScene } from './scenes/CardSandboxScene';

const CARD_SANDBOX_WIDTH = 1280;
const CARD_SANDBOX_HEIGHT = 1760;

export interface CardSandboxGame {
    game: Phaser.Game;
    setDeck(deckId: string): void;
    setSection(section: CardSandboxSection): void;
    replay(): void;
}

export type CardSandboxSection = 'real' | 'ghost' | 'layer' | 'cards';

export function createCardSandboxGame(parent: string, initialDeckId: string): CardSandboxGame {
    const scene = new CardSandboxScene(initialDeckId);
    const game = new Phaser.Game(buildPhaserConfig(CARD_SANDBOX_WIDTH, CARD_SANDBOX_HEIGHT, {
        parent,
        backgroundColor: '#07140f',
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [scene],
    }));

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
        },
    };
}
