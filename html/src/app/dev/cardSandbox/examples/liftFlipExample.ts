import * as Phaser from "phaser";

import type { CardSandboxExample } from "../types";
import { drawExamplePanel } from "../examplePanel";

export const liftFlipExample: CardSandboxExample = {
    id: "tilt-flip",
    panel: {
        x: 790,
        y: 298,
        width: 160,
        height: 270,
        title: "",
        description: ""
    },
    render: (context) => {
        const panel = context.panel ?? liftFlipExample.panel;
        drawExamplePanel(context, panel);

        const { scene, renderLayer, deck, colors } = context;
        const card = deck[12];
        const centerX = panel.x + 82;
        const centerY = panel.y + 170;
        const liftedY = centerY - 34;
        const shadow = scene.add.ellipse(centerX + 8, centerY + 86, 102, 18, 0x000000, 0.28);
        const image = scene.add.image(centerX, centerY, context.getFaceTexture(card, "showcase"))
            .setDisplaySize(112, 164)
            .setInteractive({ useHandCursor: true });
        const outline = scene.add.rectangle(centerX, centerY, 122, 174, 0x000000, 0)
            .setStrokeStyle(2, colors.gold, 0.86);
        const label = scene.add.text(centerX, centerY + 106, "tilt", {
            fontFamily: "Arial",
            fontSize: "13px",
            fontStyle: "700",
            color: colors.dim
        }).setOrigin(0.5);
        let isFaceUp = true;
        let isFlipping = false;

        image.on(Phaser.Input.Events.POINTER_DOWN, () => {
            if (isFlipping) {
                return;
            }

            isFlipping = true;
            image.disableInteractive();
            scene.tweens.killTweensOf([image, outline, shadow]);
            image.setAngle(0);
            image.setScale(1);
            image.setDisplaySize(112, 164);

            scene.tweens.add({
                targets: [image, outline],
                y: liftedY,
                angle: -7,
                scaleY: 0.93,
                duration: 150,
                ease: "Sine.easeOut",
                onStart: () => {
                    scene.tweens.add({
                        targets: shadow,
                        scaleX: 0.72,
                        alpha: 0.16,
                        duration: 150,
                        ease: "Sine.easeOut"
                    });
                },
                onComplete: () => {
                    scene.tweens.add({
                        targets: image,
                        displayWidth: 2,
                        angle: -13,
                        duration: 140,
                        ease: "Sine.easeIn",
                        onComplete: () => {
                            isFaceUp = !isFaceUp;
                            image.setTexture(isFaceUp ? context.getFaceTexture(card, "showcase") : context.getBackTexture());
                            image.displayWidth = 2;
                            image.displayHeight = 164;
                            scene.tweens.add({
                                targets: image,
                                displayWidth: 112,
                                angle: -7,
                                duration: 140,
                                ease: "Sine.easeOut",
                                onComplete: () => {
                                    image.setY(liftedY);
                                    outline.setY(liftedY);
                                    image.setAngle(-7);
                                    outline.setAngle(-7);
                                    scene.tweens.add({
                                        targets: [image, outline],
                                        y: centerY,
                                        angle: 0,
                                        scaleY: 1,
                                        duration: 150,
                                        ease: "Back.easeOut",
                                        onComplete: () => {
                                            shadow.setScale(1);
                                            shadow.setAlpha(0.28);
                                            image.setAngle(0);
                                            image.setScale(1);
                                            image.setDisplaySize(112, 164);
                                            outline.setY(centerY);
                                            outline.setAngle(0);
                                            isFlipping = false;
                                            image.setInteractive({ useHandCursor: true });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        });

        renderLayer.add([shadow, outline, image, label]);
        return {};
    }
};
