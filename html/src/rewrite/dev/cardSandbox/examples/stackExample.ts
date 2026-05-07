import type { CardSandboxExample } from "../types";
import { addSandboxButton, addStatusText, drawExamplePanel } from "../examplePanel";
import { animateLayerStack } from "../../../phaser/scenes/animations/cardMotionAnimations";

export const stackExample: CardSandboxExample = {
    id: "animation-layer-stack",
    panel: {
        x: 70,
        y: 610,
        width: 260,
        height: 270,
        title: "Animation-layer stack",
        description: ""
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
            animateLayerStack({
                scene: context.scene,
                animationLayer: context.animationLayer,
                textureKey: context.getBackTexture(),
                origin: {
                    x: stackX,
                    y: stackY
                },
                size: {
                    width: 88,
                    height: 130
                },
                count: 5,
                depth: 30,
                onComplete: () => {
                    status.setText("done: temporary ghosts").setColor("#78d9a0");
                }
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
