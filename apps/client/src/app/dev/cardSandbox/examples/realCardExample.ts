import * as Phaser from 'phaser';

import type { CardSandboxExample } from '../types';
import { drawExamplePanel } from '../examplePanel';

export const realCardExample: CardSandboxExample = {
    id: 'real-card-local-effect',
    panel: {
        x: 70,
        y: 298,
        width: 260,
        height: 270,
        title: '',
        description: '',
    },
    render: (context) => {
        const panel = context.panel ?? realCardExample.panel;
        drawExamplePanel(context, panel);

        const { scene, renderLayer, deck, colors } = context;
        const card = deck[8];
        const centerX = panel.x + 114;
        const centerY = panel.y + 170;
        const image = scene.add
            .image(centerX, centerY, context.getFaceTexture(card, 'showcase'))
            .setDisplaySize(112, 164)
            .setInteractive({ useHandCursor: true });
        const outline = scene.add
            .rectangle(centerX, centerY, 122, 174, 0x000000, 0)
            .setStrokeStyle(2, colors.gold, 0.86);
        const label = scene.add
            .text(centerX, centerY + 108, 'real card', {
                fontFamily: 'Arial',
                fontSize: '13px',
                fontStyle: '700',
                color: colors.dim,
            })
            .setOrigin(0.5);
        let isFaceUp = true;
        let isFlipping = false;

        image.on(Phaser.Input.Events.POINTER_OVER, () => {
            if (isFlipping) {
                return;
            }

            scene.tweens.killTweensOf([image, outline]);
            scene.tweens.add({
                targets: [image, outline],
                y: centerY - 18,
                duration: 120,
                ease: 'Sine.easeOut',
            });
        });
        image.on(Phaser.Input.Events.POINTER_OUT, () => {
            if (isFlipping) {
                return;
            }

            scene.tweens.killTweensOf([image, outline]);
            scene.tweens.add({
                targets: [image, outline],
                y: centerY,
                duration: 120,
                ease: 'Sine.easeOut',
            });
        });
        image.on(Phaser.Input.Events.POINTER_DOWN, () => {
            if (isFlipping) {
                return;
            }

            isFlipping = true;
            image.disableInteractive();
            scene.tweens.killTweensOf(image);
            scene.tweens.killTweensOf(outline);
            image.setY(centerY);
            outline.setY(centerY);
            image.setScale(1);
            image.setDisplaySize(112, 164);
            scene.tweens.add({
                targets: image,
                displayWidth: 2,
                duration: 130,
                ease: 'Sine.easeIn',
                onComplete: () => {
                    isFaceUp = !isFaceUp;
                    image.setTexture(
                        isFaceUp
                            ? context.getFaceTexture(card, 'showcase')
                            : context.getBackTexture(),
                    );
                    image.displayWidth = 2;
                    image.displayHeight = 164;
                    scene.tweens.add({
                        targets: image,
                        displayWidth: 112,
                        duration: 130,
                        ease: 'Sine.easeOut',
                        onComplete: () => {
                            image.setScale(1);
                            image.setDisplaySize(112, 164);
                            outline.setY(centerY);
                            isFlipping = false;
                            image.setInteractive({ useHandCursor: true });
                        },
                    });
                },
            });
        });

        renderLayer.add([outline, image, label]);
        return {};
    },
};
