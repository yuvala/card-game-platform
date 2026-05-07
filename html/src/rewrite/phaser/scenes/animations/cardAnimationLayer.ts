import type * as Phaser from "phaser";

export interface CardGhostOptions {
    textureKey: string;
    x: number;
    y: number;
    width: number;
    height: number;
    angle?: number;
    depth?: number;
    alpha?: number;
}

export interface CardGhost {
    image: Phaser.GameObjects.Image;
    destroy(): void;
}

export interface CardAnimationLayer {
    readonly container: Phaser.GameObjects.Container;
    createGhostCard(options: CardGhostOptions): CardGhost;
    clear(): void;
    destroy(): void;
}

export function createCardAnimationLayer(scene: Phaser.Scene, depth = 1000): CardAnimationLayer {
    const container = scene.add.container(0, 0).setDepth(depth);

    return {
        container,
        createGhostCard: (options) => {
            const image = scene.add.image(options.x, options.y, options.textureKey)
                .setDisplaySize(options.width, options.height)
                .setAngle(options.angle ?? 0)
                .setAlpha(options.alpha ?? 1)
                .setDepth(options.depth ?? 0);
            container.add(image);

            return {
                image,
                destroy: () => {
                    image.destroy();
                }
            };
        },
        clear: () => {
            container.removeAll(true);
        },
        destroy: () => {
            container.destroy(true);
        }
    };
}
