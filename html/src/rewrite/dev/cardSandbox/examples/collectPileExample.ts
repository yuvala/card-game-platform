import type { CardSandboxExample } from "../types";
import { addSandboxButton, addStatusText, drawExamplePanel } from "../examplePanel";

export const collectPileExample: CardSandboxExample = {
    id: "collect-pile",
    panel: {
        x: 430,
        y: 610,
        width: 260,
        height: 270,
        title: "Collect pile",
        description: "Click Collect: move several table ghosts one by one into a messy pile with staggered timing."
    },
    render: (context) => {
        const panel = context.panel ?? collectPileExample.panel;
        drawExamplePanel(context, panel);

        const { scene, renderLayer, colors } = context;
        const baseX = panel.x + 40;
        const cardY = panel.y + 170;
        const pileX = panel.x + 220;
        const tablePositions = [
            { x: baseX, y: cardY, angle: -8 },
            { x: baseX + 70, y: cardY - 8, angle: 5 },
            { x: baseX + 140, y: cardY + 2, angle: 10 }
        ];
        tablePositions.forEach((position, index) => {
            renderLayer.add(scene.add.rectangle(position.x, position.y, 76, 112, 0x000000, 0)
                .setAngle(position.angle)
                .setStrokeStyle(2, 0x78d9a0, 0.22));
            renderLayer.add(scene.add.text(position.x, cardY + 66, "card " + String(index + 1), {
                fontFamily: "Arial",
                fontSize: "11px",
                color: colors.dim
            }).setOrigin(0.5));
        });
        renderLayer.add(scene.add.rectangle(pileX, cardY, 78, 116, 0x000000, 0).setStrokeStyle(2, colors.gold, 0.3));
        renderLayer.add(scene.add.text(pileX, cardY + 66, "pile", {
            fontFamily: "Arial",
            fontSize: "11px",
            color: colors.dim
        }).setOrigin(0.5));

        const status = addStatusText(context, panel.x + 130, panel.y + 292, "idle");
        const run = () => {
            context.animationLayer.clear();
            status.setText("collecting cards").setColor("#ffd166");
            tablePositions.forEach((position, index) => {
                const card = context.deck[18 + index];
                const ghost = context.animationLayer.createGhostCard({
                    textureKey: context.getFaceTexture(card, "showcase"),
                    x: position.x,
                    y: position.y,
                    width: 76,
                    height: 112,
                    angle: position.angle,
                    alpha: 1,
                    depth: 40 + index
                });

                scene.tweens.add({
                    targets: ghost.image,
                    x: pileX + index * 5,
                    y: cardY + index * 4,
                    angle: -7 + index * 7,
                    delay: index * 110,
                    duration: 420,
                    ease: "Cubic.easeInOut",
                    onComplete: () => {
                        if (index === tablePositions.length - 1) {
                            status.setText("done: messy pile").setColor("#78d9a0");
                        }
                    }
                });
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
