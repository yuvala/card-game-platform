import type { CardSandboxExample } from "../types";
import { addSandboxButton, addStatusText, drawExamplePanel } from "../examplePanel";

export const stackExample: CardSandboxExample = {
    id: "animation-layer-stack",
    panel: {
        x: 70,
        y: 610,
        width: 260,
        height: 270,
        title: "Animation-layer stack",
        description: "Click Build stack: clear the animation layer and rebuild a temporary messy stack."
    },
    render: (context) => {
        const panel = context.panel ?? stackExample.panel;
        drawExamplePanel(context, panel);

        const stackX = panel.x + 80;
        const stackY = panel.y + 170;
        const status = addStatusText(context, panel.x + 114, panel.y + 292, "idle");
        const run = () => {
            context.animationLayer.clear();
            status.setText("building stack").setColor("#ffd166");

            context.deck.slice(12, 17).forEach((_card, index) => {
                const ghost = context.animationLayer.createGhostCard({
                    textureKey: context.getBackTexture(),
                    x: stackX,
                    y: stackY,
                    width: 88,
                    height: 130,
                    angle: 0,
                    alpha: 0,
                    depth: 30 + index
                });

                context.scene.tweens.add({
                    targets: ghost.image,
                    x: stackX + index * 8,
                    y: stackY + index * 5,
                    angle: -8 + index * 4,
                    alpha: 1,
                    delay: index * 90,
                    duration: 260,
                    ease: "Back.easeOut",
                    onComplete: () => {
                        if (index === 4) {
                            status.setText("done: temporary ghosts").setColor("#78d9a0");
                        }
                    }
                });
            });
        };
        const clear = () => {
            context.animationLayer.clear();
            status.setText("idle").setColor(context.colors.dim);
        };

        addSandboxButton(context, {
            x: panel.x + 112,
            y: panel.y + 330,
            label: "Build stack",
            onClick: run
        });
        addSandboxButton(context, {
            x: panel.x + 224,
            y: panel.y + 330,
            label: "Clear",
            width: 88,
            onClick: clear
        });

        return { run, clear };
    }
};
