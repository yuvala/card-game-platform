import type * as Phaser from 'phaser';

import type { CardInstance } from '@engine/engine/cards/types';
import type { CardAnimationLayer } from '../../phaser/scenes/animations/cardAnimationLayer';

export interface CardSandboxExamplePanel {
    x: number;
    y: number;
    width: number;
    height: number;
    title: string;
    description: string;
}

export interface CardSandboxExampleContext {
    scene: Phaser.Scene;
    renderLayer: Phaser.GameObjects.Container;
    animationLayer: CardAnimationLayer;
    panel?: CardSandboxExamplePanel;
    deck: CardInstance[];
    deckId: string;
    skinId: string;
    colors: {
        gold: number;
        cream: string;
        dim: string;
    };
    getFaceTexture(card: CardInstance, variant?: 'compact' | 'showcase'): string;
    getBackTexture(): string;
}

export interface CardSandboxExampleRuntime {
    run?(): void;
    clear?(): void;
    destroy?(): void;
}

export interface CardSandboxExample {
    id: string;
    panel: CardSandboxExamplePanel;
    render(context: CardSandboxExampleContext): CardSandboxExampleRuntime;
}
