import * as Phaser from 'phaser';

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
            const depth = options.depth ?? 0;
            const angle = options.angle ?? 0;

            const shadow = scene.add
                .image(options.x + 5, options.y + 7, options.textureKey)
                .setDisplaySize(options.width, options.height)
                .setAngle(angle)
                .setAlpha(0.38)
                .setDepth(depth - 0.5)
                .setTint(0x000000);
            container.add(shadow);

            const image = scene.add
                .image(options.x, options.y, options.textureKey)
                .setDisplaySize(options.width, options.height)
                .setAngle(angle)
                .setAlpha(options.alpha ?? 1)
                .setDepth(depth);
            container.add(image);

            const syncShadow = () => {
                shadow.setPosition(image.x + 5, image.y + 7);
                shadow.setAngle(image.angle);
                shadow.setDepth(image.depth - 0.5);
                shadow.setAlpha(image.alpha * 0.38);
            };
            scene.events.on(Phaser.Scenes.Events.POST_UPDATE, syncShadow);

            return {
                image,
                destroy: () => {
                    scene.events.off(Phaser.Scenes.Events.POST_UPDATE, syncShadow);
                    shadow.destroy();
                    image.destroy();
                },
            };
        },
        clear: () => {
            container.removeAll(true);
        },
        destroy: () => {
            container.destroy(true);
        },
    };
}
