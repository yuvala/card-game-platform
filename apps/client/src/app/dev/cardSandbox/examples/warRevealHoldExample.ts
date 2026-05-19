import type { CardSandboxExample } from '../types';
import { addSandboxButton, addStatusText, drawExamplePanel } from '../examplePanel';
import {
    animateCardHoldHighlight,
    animateImageHorizontalFlip,
} from '../../../phaser/scenes/animations/cardMotionAnimations';

export const warRevealHoldExample: CardSandboxExample = {
    id: 'war-reveal-hold',
    panel: {
        x: 70,
        y: 610,
        width: 260,
        height: 270,
        title: 'War reveal hold',
        description: '',
    },
    render: (context) => {
        const panel = context.panel ?? warRevealHoldExample.panel;
        drawExamplePanel(context, panel);

        const { scene, renderLayer } = context;
        const card = context.deck[20];
        const centerX = panel.x + 126;
        const centerY = panel.y + 170;
        const width = 88;
        const height = 130;
        const holdDuration = 650;
        const status = addStatusText(context, centerX, panel.y + 292, 'idle');
        let activeImage: Phaser.GameObjects.Image | null = null;
        let activeHighlight: Phaser.GameObjects.Rectangle | null = null;

        const clearActive = () => {
            activeHighlight?.destroy();
            activeImage?.destroy();
            activeHighlight = null;
            activeImage = null;
        };

        const run = () => {
            clearActive();
            status.setText('hold before reveal').setColor('#ffd166');
            const image = scene.add
                .image(centerX, centerY, context.getBackTexture())
                .setDisplaySize(width, height)
                .setAngle(-3)
                .setDepth(42);
            activeImage = image;
            activeHighlight = animateCardHoldHighlight({
                scene,
                image,
                width: width + 18,
                height: height + 18,
                duration: holdDuration,
            });
            context.animationLayer.container.add(image);
            context.animationLayer.container.add(activeHighlight);

            scene.time.delayedCall(holdDuration, () => {
                activeHighlight?.destroy();
                activeHighlight = null;
                status.setText('flip reveal').setColor('#ffd166');
                animateImageHorizontalFlip({
                    scene,
                    image,
                    size: {
                        width,
                        height,
                    },
                    revealInDuration: 170,
                    revealOutDuration: 230,
                    onMidpoint: () => {
                        image.setTexture(context.getFaceTexture(card, 'showcase'));
                    },
                    onComplete: () => {
                        status.setText('done: war reveal').setColor('#78d9a0');
                    },
                });
            });
        };

        addSandboxButton(context, {
            x: centerX,
            y: panel.y + 330,
            label: 'Reveal',
            onClick: run,
        });

        renderLayer.add(
            scene.add
                .rectangle(centerX, centerY, width + 8, height + 8, 0x000000, 0)
                .setStrokeStyle(2, context.colors.gold, 0.24),
        );

        return { run, clear: clearActive };
    },
};
