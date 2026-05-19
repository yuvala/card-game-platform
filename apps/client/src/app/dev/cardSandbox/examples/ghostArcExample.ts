import type { CardSandboxExample } from '../types';
import { addSandboxButton, addStatusText, drawExamplePanel } from '../examplePanel';
import { animateGhostArcMove } from '../../../phaser/scenes/animations/cardMotionAnimations';

export const ghostArcExample: CardSandboxExample = {
    id: 'ghost-card-arc',
    panel: {
        x: 720,
        y: 298,
        width: 260,
        height: 270,
        title: 'Ghost arc move',
        description:
            'Click Run arc: move a ghost through an arced path with rotation and a small landing bounce.',
    },
    render: (context) => {
        const panel = context.panel ?? ghostArcExample.panel;
        drawExamplePanel(context, panel);

        const { scene, renderLayer, colors } = context;
        const sourceX = panel.x + 50;
        const targetX = panel.x + 200;
        const cardY = panel.y + 172;
        const cardWidth = 88;
        const cardHeight = 128;
        const control = {
            x: panel.x + 125,
            y: panel.y + 78,
        };
        renderLayer.add(
            scene.add
                .rectangle(sourceX, cardY, cardWidth, cardHeight, 0x000000, 0)
                .setStrokeStyle(2, 0x78d9a0, 0.28),
        );
        renderLayer.add(
            scene.add
                .rectangle(targetX, cardY, cardWidth, cardHeight, 0x000000, 0)
                .setStrokeStyle(2, colors.gold, 0.28),
        );
        renderLayer.add(
            scene.add
                .text(sourceX, cardY + 78, 'source', {
                    fontFamily: 'Arial',
                    fontSize: '12px',
                    color: colors.dim,
                })
                .setOrigin(0.5),
        );
        renderLayer.add(
            scene.add
                .text(targetX, cardY + 78, 'target', {
                    fontFamily: 'Arial',
                    fontSize: '12px',
                    color: colors.dim,
                })
                .setOrigin(0.5),
        );

        const status = addStatusText(context, panel.x + 125, panel.y + 292, 'idle');
        const run = () => {
            context.animationLayer.clear();
            status.setText('arc ghost moving').setColor('#ffd166');
            const card = context.deck[11];
            const start = {
                x: sourceX,
                y: cardY,
            };
            const end = {
                x: targetX,
                y: cardY,
            };
            animateGhostArcMove({
                scene,
                animationLayer: context.animationLayer,
                textureKey: context.getFaceTexture(card, 'showcase'),
                source: start,
                controlIn: control,
                target: end,
                size: {
                    width: cardWidth,
                    height: cardHeight,
                },
                sourceAngle: -12,
                targetAngle: 10,
                depth: 24,
                onComplete: () => {
                    status.setText('done: arc landed').setColor('#78d9a0');
                },
            });
        };

        addSandboxButton(context, {
            x: panel.x + 125,
            y: panel.y + 330,
            label: 'Run arc',
            onClick: run,
        });

        return { run };
    },
};
