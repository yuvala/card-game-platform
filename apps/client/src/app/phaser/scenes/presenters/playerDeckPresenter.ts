import * as Phaser from 'phaser';

import type { CardGameViewModel } from '@engine/engine/game/viewModel';
import {
    CARD_BACK_STROKE,
    CARD_HEIGHT,
    CARD_WIDTH,
    TABLE_CREAM_DIM,
    TABLE_FONT_FAMILY,
    TABLE_TEXT_RESOLUTION,
    PLAYER_ZONE_LEFT_X,
    PLAYER_ZONE_RIGHT_X,
} from '../layout/constants';
import { TABLE_CENTER_Y } from '../../layout';
import type { SeatLayout } from '../layout/types';

export interface PlayerDeckVisual {
    container: Phaser.GameObjects.Container;
    image: Phaser.GameObjects.Image;
    stackBacks: Phaser.GameObjects.Image[];
    outline: Phaser.GameObjects.Rectangle;
    countText: Phaser.GameObjects.Text;
    hitTarget: Phaser.GameObjects.Rectangle;
}

interface PlayerDeckTextureApi {
    applyCardBackTexture(image: Phaser.GameObjects.Image): void;
    getActiveBackTextureKey(): string;
}

function getDeckPosition(layout: SeatLayout): { x: number; y: number } {
    if (layout.angle === 0) {
        const isUpper = layout.handCenterY < TABLE_CENTER_Y;
        return {
            x: isUpper ? PLAYER_ZONE_RIGHT_X : PLAYER_ZONE_LEFT_X,
            y: layout.handCenterY,
        };
    }
    return { x: layout.handCenterX, y: layout.handCenterY };
}

export function createPlayerDeckVisual(
    scene: Phaser.Scene,
    layout: SeatLayout,
    textureApi: PlayerDeckTextureApi,
    onPlay: () => void,
): PlayerDeckVisual {
    const pos = getDeckPosition(layout);

    const stackBacks = [-8, -4].map((offset) => {
        return scene.add
            .image(offset, offset, textureApi.getActiveBackTextureKey())
            .setDisplaySize(CARD_WIDTH, CARD_HEIGHT)
            .setVisible(false);
    });

    const image = scene.add
        .image(0, 0, textureApi.getActiveBackTextureKey())
        .setDisplaySize(CARD_WIDTH, CARD_HEIGHT);

    const outline = scene.add
        .rectangle(0, 0, CARD_WIDTH + 8, CARD_HEIGHT + 8, 0x000000, 0)
        .setStrokeStyle(1, CARD_BACK_STROKE, 0.28);

    const countText = scene.add
        .text(0, CARD_HEIGHT / 2 + 10, '', {
            fontFamily: TABLE_FONT_FAMILY,
            fontSize: '11px',
            color: TABLE_CREAM_DIM,
            align: 'center',
        })
        .setOrigin(0.5, 0)
        .setResolution(TABLE_TEXT_RESOLUTION);

    const container = scene.add
        .container(pos.x, pos.y, [...stackBacks, image, outline, countText])
        .setDepth(30);

    const hitTarget = scene.add
        .rectangle(pos.x, pos.y, CARD_WIDTH, CARD_HEIGHT, 0x000000, 0.001)
        .setDepth(31);

    hitTarget.setInteractive({ useHandCursor: true });
    hitTarget.on(Phaser.Input.Events.POINTER_DOWN, () => {
        if (hitTarget.input?.enabled) {
            onPlay();
        }
    });

    return { container, image, stackBacks, outline, countText, hitTarget };
}

export function syncPlayerDeckPresentation(input: {
    viewModel: CardGameViewModel;
    playerDeckVisuals: Map<string, PlayerDeckVisual>;
    seatLayouts: Map<string, SeatLayout>;
    createVisual: (playerId: string) => PlayerDeckVisual;
    textureApi: PlayerDeckTextureApi;
}): void {
    const { viewModel, playerDeckVisuals, seatLayouts, createVisual, textureApi } = input;

    viewModel.players.forEach((player) => {
        if (!player.deckPile) {
            const existing = playerDeckVisuals.get(player.id);
            existing?.container.setVisible(false);
            existing?.hitTarget.setVisible(false);
            return;
        }

        let visual = playerDeckVisuals.get(player.id);
        if (!visual) {
            visual = createVisual(player.id);
            playerDeckVisuals.set(player.id, visual);
        }

        const { cardCount, topCard } = player.deckPile;
        const isEmpty = cardCount === 0 || !topCard;

        visual.container.setVisible(true);
        visual.container.setAlpha(isEmpty ? 0.25 : 1);
        visual.hitTarget.setVisible(!isEmpty);

        textureApi.applyCardBackTexture(visual.image);

        const stackBacks = visual.stackBacks;
        const visibleBackCount = isEmpty
            ? 0
            : Math.min(stackBacks.length, Math.max(0, Math.floor(cardCount / 8)));
        stackBacks.forEach((back, i) => {
            const show = i < visibleBackCount;
            back.setVisible(show);
            back.setAlpha(show ? 0.72 - i * 0.14 : 0);
            if (show) {
                textureApi.applyCardBackTexture(back);
            }
        });

        visual.outline.setStrokeStyle(
            1,
            !isEmpty && player.canInteract ? 0xffd166 : CARD_BACK_STROKE,
            !isEmpty && player.canInteract ? 0.9 : 0.28,
        );

        if (visual.hitTarget.input) {
            visual.hitTarget.input.enabled = player.canInteract && !isEmpty;
        }

        visual.countText.setText(isEmpty ? '' : String(cardCount));

        const layout = seatLayouts.get(player.id);
        if (layout) {
            const pos = getDeckPosition(layout);
            visual.container.setPosition(pos.x, pos.y);
            visual.hitTarget.setPosition(pos.x, pos.y);
        }
    });
}
