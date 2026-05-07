import type { CardSandboxExample } from "../types";
import { addSandboxButton, addStatusText, drawExamplePanel } from "../examplePanel";

export const ghostMoveExample: CardSandboxExample = {
    id: "ghost-card-move",
    panel: {
        x: 430,
        y: 298,
        width: 260,
        height: 270,
        title: "Ghost move + flip",
        description: "Click Run: move one temporary face-down ghost card to the target, then reveal it with a horizontal flip."
    },
    render: (context) => {
        const panel = context.panel ?? ghostMoveExample.panel;
        drawExamplePanel(context, panel);

        const { scene, renderLayer, colors } = context;
        const sourceX = panel.x + 58;
        const targetX = panel.x + 194;
        const cardY = panel.y + 172;
        const labelY = cardY + 86;
        const statusY = panel.y + 292;
        const buttonY = panel.y + 330;

        renderLayer.add(scene.add.rectangle(sourceX, cardY, 96, 140, 0x000000, 0).setStrokeStyle(2, 0x78d9a0, 0.28));
        renderLayer.add(scene.add.rectangle(targetX, cardY, 96, 140, 0x000000, 0).setStrokeStyle(2, colors.gold, 0.28));
        renderLayer.add(scene.add.text(sourceX, labelY, "source", {
            fontFamily: "Arial",
            fontSize: "12px",
            color: colors.dim
        }).setOrigin(0.5));
        renderLayer.add(scene.add.text(targetX, labelY, "target", {
            fontFamily: "Arial",
            fontSize: "12px",
            color: colors.dim
        }).setOrigin(0.5));

        const status = addStatusText(context, panel.x + 126, statusY, "idle");
        const run = () => {
            context.animationLayer.clear();
            status.setText("face-down ghost moving").setColor("#ffd166");
            const card = context.deck[10];
            const ghost = context.animationLayer.createGhostCard({
                textureKey: context.getBackTexture(),
                x: sourceX,
                y: cardY,
                width: 96,
                height: 140,
                angle: -4,
                depth: 20
            });

            scene.tweens.add({
                targets: ghost.image,
                x: targetX,
                y: cardY,
                angle: 8,
                duration: 760,
                ease: "Cubic.easeInOut",
                onComplete: () => {
                    status.setText("reveal flip").setColor("#ffd166");
                    scene.tweens.add({
                        targets: ghost.image,
                        displayWidth: 2,
                        duration: 120,
                        ease: "Sine.easeIn",
                        onComplete: () => {
                            ghost.image.setTexture(context.getFaceTexture(card, "showcase"));
                            ghost.image.displayWidth = 2;
                            ghost.image.displayHeight = 140;
                            scene.tweens.add({
                                targets: ghost.image,
                                displayWidth: 96,
                                duration: 120,
                                ease: "Sine.easeOut",
                                onComplete: () => {
                                    status.setText("done: moved and revealed").setColor("#78d9a0");
                                }
                            });
                        }
                    });
                }
            });
        };

        addSandboxButton(context, {
            x: panel.x + 126,
            y: buttonY,
            label: "Run",
            onClick: run
        });

        return { run };
    }
};
