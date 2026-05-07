import type { CardSandboxExample } from "../types";
import { addSandboxButton, addStatusText, drawExamplePanel } from "../examplePanel";

export const dealerRevealExample: CardSandboxExample = {
    id: "dealer-reveal",
    panel: {
        x: 70,
        y: 610,
        width: 260,
        height: 270,
        title: "Dealer reveal",
        description: "Click Reveal: deal one face-down card, pause briefly, then flip it face-up in the destination slot."
    },
    render: (context) => {
        const panel = context.panel ?? dealerRevealExample.panel;
        drawExamplePanel(context, panel);

        const { scene, renderLayer, colors } = context;
        const sourceX = panel.x + 52;
        const targetX = panel.x + 172;
        const cardY = panel.y + 172;
        const status = addStatusText(context, panel.x + 126, panel.y + 292, "idle");

        renderLayer.add(scene.add.rectangle(sourceX, cardY, 90, 132, 0x000000, 0).setStrokeStyle(2, 0x78d9a0, 0.24));
        renderLayer.add(scene.add.rectangle(targetX, cardY, 96, 140, 0x000000, 0).setStrokeStyle(2, colors.gold, 0.28));

        const run = () => {
            context.animationLayer.clear();
            status.setText("dealing face-down").setColor("#ffd166");
            const card = context.deck[18];
            const ghost = context.animationLayer.createGhostCard({
                textureKey: context.getBackTexture(),
                x: sourceX,
                y: cardY,
                width: 88,
                height: 130,
                angle: -5,
                depth: 40
            });

            scene.tweens.add({
                targets: ghost.image,
                x: targetX,
                y: cardY,
                angle: 0,
                duration: 520,
                ease: "Cubic.easeOut",
                onComplete: () => {
                    status.setText("pause before reveal").setColor("#ffd166");
                    scene.time.delayedCall(320, () => {
                        scene.tweens.add({
                            targets: ghost.image,
                            displayWidth: 2,
                            duration: 130,
                            ease: "Sine.easeIn",
                            onComplete: () => {
                                ghost.image.setTexture(context.getFaceTexture(card, "showcase"));
                                ghost.image.displayWidth = 2;
                                ghost.image.displayHeight = 130;
                                scene.tweens.add({
                                    targets: ghost.image,
                                    displayWidth: 88,
                                    duration: 130,
                                    ease: "Sine.easeOut",
                                    onComplete: () => {
                                        status.setText("done: revealed").setColor("#78d9a0");
                                    }
                                });
                            }
                        });
                    });
                }
            });
        };

        addSandboxButton(context, {
            x: panel.x + 126,
            y: panel.y + 330,
            label: "Reveal",
            onClick: run
        });

        return { run };
    }
};
