import type { CardSandboxExample } from "../types";
import { addSandboxButton, addStatusText, drawExamplePanel } from "../examplePanel";
import { animateRiffleShuffle } from "../../../phaser/scenes/animations/cardMotionAnimations";

export const shuffleExample: CardSandboxExample = {
    id: "shuffle-preview",
    panel: {
        x: 720,
        y: 610,
        width: 260,
        height: 270,
        title: "Shuffle preview",
        description: ""
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
            animateRiffleShuffle({
                scene: context.scene,
                animationLayer: context.animationLayer,
                textureKey: context.getBackTexture(),
                center: {
                    x: centerX,
                    y: cardY
                },
                size: {
                    width: 72,
                    height: 106
                },
                count: 10,
                depth: 50,
                onComplete: () => {
                    status.setText("done: squared deck").setColor("#78d9a0");
                }
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
