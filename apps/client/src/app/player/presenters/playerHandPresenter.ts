import * as Phaser from 'phaser';

import type { CardGameViewModel } from '@engine/engine/game/viewModel';
import { getCardFaceTextureKey } from '../../phaser/cards/CardTextureFactory';
import { PLAYER_GAME_WIDTH } from '../createPlayerGame';
import { getHandCardPoint, playerPovCardSizes, playerPovZones } from '../playerPovLayout';
import { GOLD, setCardDisplaySize, drawCapturePileWidget } from './playerDrawUtils';

const HAND_CARD_W = playerPovCardSizes.hand.width;
const HAND_CARD_H = playerPovCardSizes.hand.height;

export function drawPlayerHand(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    viewModel: CardGameViewModel,
    backTextureKey: string,
    skinId: string,
    onPlayCard: () => void,
    onSelectCard: (cardId: string) => void,
): { x: number; y: number } | null {
    const player = viewModel.players[0];
    if (!player) {
        return null;
    }

    let deckPoint: { x: number; y: number } | null = null;
    const cards = player.hand;
    const capturePile = viewModel.piles.find(
        (p) => p.role === 'capture' && p.ownerId === player.id,
    );
    const captureCount = capturePile?.cardCount ?? 0;
    const captureX = PLAYER_GAME_WIDTH - HAND_CARD_W / 2 - 8;
    const captureY = playerPovZones.handY - 10;

    if (cards.length === 0 && player.deckPile) {
        const deckX = PLAYER_GAME_WIDTH / 2 - 62;
        const deckY = playerPovZones.handY - 10;

        if (player.deckPile.cardCount > 0) {
            deckPoint = { x: deckX, y: deckY };
            drawPlayerDeckVisual(
                scene, layer, deckX, deckY,
                player.deckPile.cardCount,
                player.isCurrentTurn,
                player.canInteract,
                backTextureKey,
                onPlayCard,
            );
        }
    }

    if (capturePile) {
        drawCapturePileWidget(scene, layer, {
            x: captureX,
            y: captureY,
            cardCount: captureCount,
            backTextureKey,
            cardW: HAND_CARD_W,
            cardH: HAND_CARD_H,
        });
    }

    cards.forEach((card, index) => {
        const isSelected = card.id === viewModel.selectedCardId;
        const point = getHandCardPoint({ cardCount: cards.length, index, selected: isSelected });

        if (isSelected) {
            const glow = scene.add.graphics();
            glow.lineStyle(4, GOLD, 0.88);
            glow.strokeRoundedRect(
                -HAND_CARD_W / 2 - 5,
                -HAND_CARD_H / 2 - 5,
                HAND_CARD_W + 10,
                HAND_CARD_H + 10,
                10,
            );
            glow.setPosition(point.x, point.y);
            glow.setAngle(point.angle);
            glow.setDepth(29 + index);
            layer.add(glow);
        }

        const textureKey = card.isFaceUp
            ? getCardFaceTextureKey(card.id, skinId, 'showcase')
            : backTextureKey;
        const image = scene.add
            .image(point.x, point.y, textureKey)
            .setDisplaySize(HAND_CARD_W, HAND_CARD_H)
            .setAngle(point.angle)
            .setDepth(30 + index)
            .setData('cardId', card.id);
        setCardDisplaySize(image, HAND_CARD_W, HAND_CARD_H);

        if (player.canInteract && card.isFaceUp) {
            image.setInteractive({ useHandCursor: true });
            image.on(Phaser.Input.Events.POINTER_DOWN, () => {
                onSelectCard(card.id);
            });
        }
        layer.add(image);
    });

    return deckPoint;
}

function drawPlayerDeckVisual(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    x: number,
    y: number,
    cardCount: number,
    isCurrentTurn: boolean,
    canInteract: boolean,
    backTextureKey: string,
    onPlayCard: () => void,
): void {
    const isLow = cardCount < 10;
    const backCount = cardCount <= 3 ? 1 : cardCount <= 7 ? 2 : 3;
    for (let i = backCount - 1; i >= 0; i--) {
        const back = scene.add
            .image(x + i * 2, y - i * 2, backTextureKey)
            .setDisplaySize(HAND_CARD_W, HAND_CARD_H)
            .setAlpha(0.6 + i * 0.14)
            .setAngle(0)
            .setDepth(28 + i);
        setCardDisplaySize(back, HAND_CARD_W, HAND_CARD_H);
        layer.add(back);
    }

    if (isCurrentTurn) {
        const glowColor = isLow ? 0xff7020 : GOLD;
        const glow = scene.add.graphics().setDepth(27);
        glow.lineStyle(3, glowColor, 0.72);
        glow.strokeRoundedRect(
            x - HAND_CARD_W / 2 - 4,
            y - HAND_CARD_H / 2 - 4,
            HAND_CARD_W + 8,
            HAND_CARD_H + 8,
            8,
        );
        layer.add(glow);
    }

    layer.add(
        scene.add
            .text(x + HAND_CARD_W / 2 - 2, y - HAND_CARD_H / 2 + 2, String(cardCount), {
                fontFamily: 'Arial',
                fontSize: '11px',
                fontStyle: '700',
                color: isLow ? '#ffaa70' : '#ffffff',
                backgroundColor: isLow ? 'rgba(150,40,0,0.82)' : 'rgba(0,0,0,0.78)',
                padding: { x: 4, y: 2 },
            })
            .setOrigin(1, 0)
            .setDepth(32),
    );

    if (canInteract) {
        const hit = scene.add
            .rectangle(x, y, HAND_CARD_W, HAND_CARD_H, 0x000000, 0.001)
            .setDepth(33)
            .setInteractive({ useHandCursor: true });
        hit.on(Phaser.Input.Events.POINTER_DOWN, onPlayCard);
        layer.add(hit);
    }
}
