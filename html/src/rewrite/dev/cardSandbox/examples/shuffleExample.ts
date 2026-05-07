import type { CardSandboxExample } from "../types";
import { addSandboxButton, addStatusText, drawExamplePanel } from "../examplePanel";

export const shuffleExample: CardSandboxExample = {
    id: "shuffle-preview",
    panel: {
        x: 720,
        y: 610,
        width: 260,
        height: 270,
        title: "Shuffle preview",
        description: "Click Shuffle: split one deck into two packets, riffle them inward, then square the pile."
    },
    render: (context) => {
        const panel = context.panel ?? shuffleExample.panel;
        drawExamplePanel(context, panel);

        const centerX = panel.x + 130;
        const cardY = panel.y + 170;
        const status = addStatusText(context, centerX, panel.y + 292, "idle");
        const run = () => {
            context.animationLayer.clear();
            status.setText("riffle shuffle").setColor("#ffd166");
            const ghosts = Array.from({ length: 10 }, (_, index) => {
                const isLeftPacket = index < 5;
                return context.animationLayer.createGhostCard({
                    textureKey: context.getBackTexture(),
                    x: isLeftPacket ? centerX - 50 - index * 3 : centerX + 50 + (index - 5) * 3,
                    y: cardY + (index % 5) * 2,
                    width: 72,
                    height: 106,
                    angle: isLeftPacket ? -16 : 16,
                    alpha: 1,
                    depth: 50 + index
                });
            });

            ghosts.forEach((ghost, index) => {
                const riffleIndex = index % 5;
                context.scene.tweens.add({
                    targets: ghost.image,
                    x: centerX - 2 + (index - 4.5) * 3,
                    y: cardY + riffleIndex * 3,
                    angle: -7 + index * 1.5,
                    delay: riffleIndex * 80,
                    duration: 330,
                    ease: "Sine.easeInOut",
                    onComplete: () => {
                        context.scene.tweens.add({
                            targets: ghost.image,
                            x: centerX + index * 1.2,
                            y: cardY + index * 1.5,
                            angle: -4 + index * 0.8,
                            duration: 220,
                            ease: "Back.easeOut",
                            onComplete: () => {
                                if (index === ghosts.length - 1) {
                                    status.setText("done: squared deck").setColor("#78d9a0");
                                }
                            }
                        });
                    }
                });
            });
        };

        addSandboxButton(context, {
            x: centerX,
            y: panel.y + 330,
            label: "Shuffle",
            onClick: run
        });

        return { run };
    }
};
