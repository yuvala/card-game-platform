import * as Phaser from "phaser";

import type { CardSandboxExample } from "../types";
import { drawExamplePanel } from "../examplePanel";

const CARD_WIDTH = 112;
const CARD_HEIGHT = 164;

export const liftFlipExample: CardSandboxExample = {
    id: "perspective-flip",
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
            .setDisplaySize(CARD_WIDTH, CARD_HEIGHT)
            .setInteractive({ useHandCursor: true });
        const outline = scene.add.rectangle(centerX, centerY, 122, 174, 0x000000, 0)
            .setStrokeStyle(2, colors.gold, 0.86);
        const perspectiveCard = scene.add.graphics()
            .setVisible(false);
        const label = scene.add.text(centerX, centerY + 106, "perspective", {
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
            image.setDisplaySize(CARD_WIDTH, CARD_HEIGHT);

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
                    image.setVisible(false);
                    outline.setVisible(false);
                    perspectiveCard.setVisible(true);
                    drawPerspectiveCard(perspectiveCard, {
                        x: centerX,
                        y: liftedY,
                        width: CARD_WIDTH,
                        height: CARD_HEIGHT,
                        farScale: 0.74,
                        faceUp: isFaceUp,
                        gold: colors.gold
                    });
                    const flipState = { t: 0 };
                    scene.tweens.add({
                        targets: flipState,
                        t: 1,
                        duration: 170,
                        ease: "Sine.easeIn",
                        onUpdate: () => {
                            drawPerspectiveCard(perspectiveCard, {
                                x: centerX,
                                y: liftedY,
                                width: CARD_WIDTH * (1 - flipState.t * 0.96),
                                height: CARD_HEIGHT,
                                farScale: 0.74 - flipState.t * 0.18,
                                faceUp: isFaceUp,
                                gold: colors.gold
                            });
                        },
                        onComplete: () => {
                            isFaceUp = !isFaceUp;
                            image.setTexture(isFaceUp ? context.getFaceTexture(card, "showcase") : context.getBackTexture());
                            flipState.t = 0;
                            scene.tweens.add({
                                targets: flipState,
                                t: 1,
                                duration: 170,
                                ease: "Sine.easeOut",
                                onUpdate: () => {
                                    drawPerspectiveCard(perspectiveCard, {
                                        x: centerX,
                                        y: liftedY,
                                        width: CARD_WIDTH * (0.04 + flipState.t * 0.96),
                                        height: CARD_HEIGHT,
                                        farScale: 0.56 + flipState.t * 0.18,
                                        faceUp: isFaceUp,
                                        gold: colors.gold
                                    });
                                },
                                onComplete: () => {
                                    perspectiveCard.clear().setVisible(false);
                                    image.setVisible(true);
                                    outline.setVisible(true);
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
                                            image.setDisplaySize(CARD_WIDTH, CARD_HEIGHT);
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

        renderLayer.add([shadow, outline, image, perspectiveCard, label]);
        return {};
    }
};

function drawPerspectiveCard(
    graphics: Phaser.GameObjects.Graphics,
    input: {
        x: number;
        y: number;
        width: number;
        height: number;
        farScale: number;
        faceUp: boolean;
        gold: number;
    }
): void {
    const halfWidth = Math.max(2, input.width / 2);
    const halfHeight = input.height / 2;
    const farHalfHeight = halfHeight * input.farScale;
    const fillColor = input.faceUp ? 0xf6ecd2 : 0x244c40;
    const inkColor = input.faceUp ? 0xc4513f : 0xffd166;

    graphics.clear();
    graphics.fillStyle(fillColor, 1);
    graphics.lineStyle(2, input.gold, 0.9);
    graphics.beginPath();
    graphics.moveTo(input.x - halfWidth, input.y - halfHeight);
    graphics.lineTo(input.x + halfWidth, input.y - farHalfHeight);
    graphics.lineTo(input.x + halfWidth, input.y + farHalfHeight);
    graphics.lineTo(input.x - halfWidth, input.y + halfHeight);
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();

    graphics.lineStyle(1, inkColor, 0.34);
    graphics.strokeEllipse(input.x, input.y, Math.max(12, halfWidth * 0.78), Math.max(20, input.height * 0.46 * input.farScale));
    graphics.fillStyle(inkColor, 0.78);
    graphics.fillCircle(input.x, input.y, Math.max(3, halfWidth * 0.12));
}
