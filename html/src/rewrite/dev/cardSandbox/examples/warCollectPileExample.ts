import type { CardSandboxExample } from "../types";
import { addSandboxButton, addStatusText, drawExamplePanel } from "../examplePanel";
import { animateCollectPile } from "../../../phaser/scenes/animations/cardMotionAnimations";

export const warCollectPileExample: CardSandboxExample = {
    id: "war-collect-pile",
    panel: {
        x: 70,
        y: 610,
        width: 260,
        height: 270,
        title: "War collect pile",
        description: ""
    },
    render: (context) => {
        const panel = context.panel ?? warCollectPileExample.panel;
        drawExamplePanel(context, panel);

        const { scene, renderLayer, colors } = context;
        const centerY = panel.y + 170;
        const tableX = panel.x + 44;
        const pileX = panel.x + 218;
        const status = addStatusText(context, panel.x + 130, panel.y + 292, "idle");
        const sourceCards = Array.from({ length: 6 }, (_, index) => {
            return {
                x: tableX + (index % 3) * 36,
                y: centerY - 34 + Math.floor(index / 3) * 54,
                angle: -8 + index * 3
            };
        });

        sourceCards.forEach((position) => {
            renderLayer.add(scene.add.rectangle(position.x, position.y, 40, 58, 0x000000, 0)
                .setAngle(position.angle)
                .setStrokeStyle(2, 0x78d9a0, 0.2));
        });
        renderLayer.add(scene.add.rectangle(pileX, centerY, 78, 116, 0x000000, 0)
            .setStrokeStyle(2, colors.gold, 0.34));

        const run = () => {
            context.animationLayer.clear();
            status.setText("war collecting").setColor("#ffd166");
            animateCollectPile({
                scene,
                animationLayer: context.animationLayer,
                cards: sourceCards.map((position, index) => {
                    return {
                        textureKey: context.getBackTexture(),
                        source: {
                            x: position.x,
                            y: position.y
                        },
                        target: {
                            x: pileX + (index % 3) * 5,
                            y: centerY + Math.floor(index / 3) * 4
                        },
                        size: {
                            width: 40,
                            height: 58
                        },
                        sourceAngle: position.angle,
                        targetAngle: -10 + index * 5,
                        depth: 40 + index
                    };
                }),
                delayStep: 92,
                duration: 460,
                onComplete: () => {
                    const ring = scene.add.rectangle(pileX, centerY, 98, 136, 0x000000, 0)
                        .setStrokeStyle(3, colors.gold, 0.8)
                        .setDepth(120)
                        .setScale(0.86);
                    context.animationLayer.container.add(ring);
                    scene.tweens.add({
                        targets: ring,
                        alpha: 0,
                        scaleX: 1.28,
                        scaleY: 1.28,
                        duration: 520,
                        ease: "Sine.easeOut",
                        onComplete: () => {
                            ring.destroy();
                        }
                    });
                    status.setText("done: winner pile").setColor("#78d9a0");
                }
            });
        };

        addSandboxButton(context, {
            x: panel.x + 130,
            y: panel.y + 330,
            label: "Collect",
            onClick: run
        });

        return { run };
    }
};
