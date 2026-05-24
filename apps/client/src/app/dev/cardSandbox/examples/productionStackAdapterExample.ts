import type { MoveCardEffect } from '@engine/engine/game/effects';
import type { CardGameViewCard } from '@engine/engine/game/viewModel';
import type { CardSandboxExample } from '../types';
import { addSandboxButton, addStatusText, drawExamplePanel } from '../examplePanel';
import {
    animateCardToStack,
    createCardMoveGhost,
    prepareCardMoveGhostTexture,
    type CardAnimationTextureApi,
} from '../../../phaser/scenes/animations/cardStackAnimations';

export const productionStackAdapterExample: CardSandboxExample = {
    id: 'production-stack-adapter',
    panel: {
        x: 70,
        y: 610,
        width: 260,
        height: 270,
        title: 'Production stack adapter',
        description: '',
    },
    render: (context) => {
        const panel = context.panel ?? productionStackAdapterExample.panel;
        drawExamplePanel(context, panel);

        const { scene, renderLayer, colors } = context;
        const source = {
            x: panel.x + 58,
            y: panel.y + 170,
        };
        const target = {
            x: panel.x + 186,
            y: panel.y + 170,
            angle: -4,
        };
        const card = context.deck[24];
        const status = addStatusText(context, panel.x + 130, panel.y + 292, 'idle');
        const textureApi: CardAnimationTextureApi = {
            getActiveBackTextureKey: context.getBackTexture,
            applyCardTexture: (image, viewCard, variant) => {
                if (!viewCard?.isFaceUp) {
                    image.setTexture(context.getBackTexture());
                    return;
                }

                image.setTexture(context.getFaceTexture(card, variant));
            },
        };

        renderLayer.add(
            scene.add
                .rectangle(source.x, source.y, 88, 130, 0x000000, 0)
                .setStrokeStyle(2, 0x78d9a0, 0.22),
        );
        renderLayer.add(
            scene.add
                .rectangle(target.x, target.y, 96, 140, 0x000000, 0)
                .setStrokeStyle(2, colors.gold, 0.32),
        );

        const run = () => {
            context.animationLayer.clear();
            status.setText('move + war reveal').setColor('#ffd166');

            const effect: MoveCardEffect = {
                type: 'move-card',
                key: 'war-reveal-sandbox',
                reason: 'play',
                animationProfile: 'war-reveal',
                card: {
                    id: card.id,
                    label: card.displayLabel,
                    isFaceUp: true,
                } satisfies CardGameViewCard,
                fromPileId: 'source',
                fromFaceUp: false,
                toPileId: 'battle',
            };
            const ghost = createCardMoveGhost({
                scene,
                source,
                textureApi,
            });
            context.animationLayer.container.add(ghost);
            prepareCardMoveGhostTexture({
                ghost,
                effect,
                textureApi,
            });
            animateCardToStack({
                scene,
                ghost,
                effect,
                destination: target,
                profile: {
                    duration: 430,
                    delay: 0,
                    ease: 'Cubic.easeInOut',
                    peakScale: 1.05,
                },
                textureApi,
                onLanded: () => {
                    status.setText('hold before flip').setColor('#ffd166');
                },
                onReveal: () => {
                    status.setText('revealed').setColor('#ffd166');
                },
                onComplete: () => {
                    status.setText('done: adapter path').setColor('#78d9a0');
                },
            });
        };

        addSandboxButton(context, {
            x: panel.x + 130,
            y: panel.y + 330,
            label: 'Run',
            onClick: run,
        });

        return { run };
    },
};
