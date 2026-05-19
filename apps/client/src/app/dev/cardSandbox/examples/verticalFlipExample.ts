import * as Phaser from 'phaser';

import type { CardSandboxExample } from '../types';
import { drawExamplePanel } from '../examplePanel';

export const verticalFlipExample: CardSandboxExample = {
    id: 'flip-variants',
    panel: {
        x: 320,
        y: 298,
        width: 520,
        height: 270,
        title: '',
        description: '',
    },
    render: (context) => {
        const panel = context.panel ?? verticalFlipExample.panel;
        drawExamplePanel(context, panel);

        const { scene, renderLayer, deck, colors } = context;
        const cardSlots = [
            { card: deck[9], x: panel.x + 74, label: 'vertical', flip: 'vertical' as const },
            { card: deck[10], x: panel.x + 224, label: 'snap', flip: 'snap' as const },
            { card: deck[11], x: panel.x + 374, label: 'spin', flip: 'spin' as const },
        ];
        const centerY = panel.y + 170;
        const visuals: Phaser.GameObjects.GameObject[] = [];

        cardSlots.forEach(({ card, x, label, flip }) => {
            const image = scene.add
                .image(x, centerY, context.getFaceTexture(card, 'showcase'))
                .setDisplaySize(112, 164)
                .setInteractive({ useHandCursor: true });
            const outline = scene.add
                .rectangle(x, centerY, 122, 174, 0x000000, 0)
                .setStrokeStyle(2, colors.gold, 0.86);
            const labelText = scene.add
                .text(x, centerY + 106, label, {
                    fontFamily: 'Arial',
                    fontSize: '13px',
                    fontStyle: '700',
                    color: colors.dim,
                })
                .setOrigin(0.5);
            let isFaceUp = true;
            let isFlipping = false;

            image.on(Phaser.Input.Events.POINTER_DOWN, () => {
                if (isFlipping) {
                    return;
                }

                isFlipping = true;
                image.disableInteractive();
                scene.tweens.killTweensOf(image);
                image.setScale(1);
                image.setDisplaySize(112, 164);

                const finish = () => {
                    image.setScale(1);
                    image.setDisplaySize(112, 164);
                    isFlipping = false;
                    image.setInteractive({ useHandCursor: true });
                };
                const swapTexture = () => {
                    isFaceUp = !isFaceUp;
                    image.setTexture(
                        isFaceUp
                            ? context.getFaceTexture(card, 'showcase')
                            : context.getBackTexture(),
                    );
                };

                if (flip === 'snap') {
                    scene.tweens.add({
                        targets: image,
                        displayWidth: 4,
                        duration: 70,
                        ease: 'Linear',
                        onComplete: () => {
                            swapTexture();
                            image.displayWidth = 4;
                            image.displayHeight = 164;
                            scene.tweens.add({
                                targets: image,
                                displayWidth: 112,
                                duration: 70,
                                ease: 'Back.easeOut',
                                onComplete: finish,
                            });
                        },
                    });
                    return;
                }

                if (flip === 'spin') {
                    scene.tweens.add({
                        targets: image,
                        displayWidth: 2,
                        angle: image.angle + 180,
                        duration: 150,
                        ease: 'Sine.easeIn',
                        onComplete: () => {
                            swapTexture();
                            image.displayWidth = 2;
                            image.displayHeight = 164;
                            scene.tweens.add({
                                targets: image,
                                displayWidth: 112,
                                angle: image.angle + 180,
                                duration: 170,
                                ease: 'Sine.easeOut',
                                onComplete: () => {
                                    image.setAngle(0);
                                    finish();
                                },
                            });
                        },
                    });
                    return;
                }

                scene.tweens.add({
                    targets: image,
                    displayHeight: 2,
                    duration: 130,
                    ease: 'Sine.easeIn',
                    onComplete: () => {
                        swapTexture();
                        image.displayWidth = 112;
                        image.displayHeight = 2;
                        scene.tweens.add({
                            targets: image,
                            displayHeight: 164,
                            duration: 130,
                            ease: 'Sine.easeOut',
                            onComplete: finish,
                        });
                    },
                });
            });

            visuals.push(outline, image, labelText);
        });

        renderLayer.add(visuals);
        return {};
    },
};
