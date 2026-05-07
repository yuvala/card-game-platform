import type { CardSandboxExample } from "../types";
import { addSandboxButton, addStatusText, drawExamplePanel } from "../examplePanel";

interface ArcPoint {
    x: number;
    y: number;
}

export const ghostArcExample: CardSandboxExample = {
    id: "ghost-card-arc",
    panel: {
        x: 720,
        y: 298,
        width: 260,
        height: 270,
        title: "Ghost arc move",
        description: "Click Run arc: move a ghost through an arced path with rotation and a small landing bounce."
    },
    render: (context) => {
        const panel = context.panel ?? ghostArcExample.panel;
        drawExamplePanel(context, panel);

        const { scene, renderLayer, colors } = context;
        const sourceX = panel.x + 50;
        const targetX = panel.x + 200;
        const cardY = panel.y + 172;
        const control = {
            x: panel.x + 125,
            y: panel.y + 78
        };
        renderLayer.add(scene.add.rectangle(sourceX, cardY, 88, 128, 0x000000, 0).setStrokeStyle(2, 0x78d9a0, 0.28));
        renderLayer.add(scene.add.rectangle(targetX, cardY, 88, 128, 0x000000, 0).setStrokeStyle(2, colors.gold, 0.28));
        renderLayer.add(scene.add.text(sourceX, cardY + 78, "source", {
            fontFamily: "Arial",
            fontSize: "12px",
            color: colors.dim
        }).setOrigin(0.5));
        renderLayer.add(scene.add.text(targetX, cardY + 78, "target", {
            fontFamily: "Arial",
            fontSize: "12px",
            color: colors.dim
        }).setOrigin(0.5));

        const status = addStatusText(context, panel.x + 125, panel.y + 292, "idle");
        const run = () => {
            context.animationLayer.clear();
            status.setText("arc ghost moving").setColor("#ffd166");
            const card = context.deck[11];
            const start = {
                x: sourceX,
                y: cardY
            };
            const end = {
                x: targetX,
                y: cardY
            };
            const ghost = context.animationLayer.createGhostCard({
                textureKey: context.getFaceTexture(card, "showcase"),
                x: start.x,
                y: start.y,
                width: 88,
                height: 128,
                angle: -12,
                depth: 24
            });
            const progress = {
                t: 0
            };

            scene.tweens.add({
                targets: progress,
                t: 1,
                duration: 780,
                ease: "Sine.easeInOut",
                onUpdate: () => {
                    const point = getQuadraticBezierPoint(start, control, end, progress.t);
                    ghost.image.setPosition(point.x, point.y);
                    ghost.image.setAngle(-12 + progress.t * 22);
                },
                onComplete: () => {
                    ghost.image.setPosition(end.x, end.y - 8);
                    ghost.image.setAngle(10);
                    scene.tweens.add({
                        targets: ghost.image,
                        y: end.y,
                        scaleX: 1.02,
                        scaleY: 0.98,
                        duration: 120,
                        ease: "Back.easeOut",
                        onComplete: () => {
                            ghost.image.setPosition(end.x, end.y);
                            ghost.image.setScale(1);
                            status.setText("done: arc landed").setColor("#78d9a0");
                        }
                    });
                }
            });
        };

        addSandboxButton(context, {
            x: panel.x + 125,
            y: panel.y + 330,
            label: "Run arc",
            onClick: run
        });

        return { run };
    }
};

function getQuadraticBezierPoint(start: ArcPoint, control: ArcPoint, end: ArcPoint, t: number): ArcPoint {
    const inverse = 1 - t;

    return {
        x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
        y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y
    };
}
