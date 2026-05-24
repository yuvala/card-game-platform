import * as Phaser from 'phaser';

import type { CardGameViewModel } from '@engine/engine/game/viewModel';
import { PLAYER_GAME_WIDTH, PLAYER_GAME_HEIGHT } from '../createPlayerGame';
import { playerPovZones } from '../playerPovLayout';
import { CREAM, createRoundedPanel } from './playerDrawUtils';

export interface PlayerTheme {
    felt: number;
    feltInner: number;
    feltInnerBorder: number;
    bg: number;
    bgOverlayAlpha: number;
    turnBg: number;
    bgImage: string;
    bgAlpha: number;
    showFelt: boolean;
}

export const THEMES: Record<string, PlayerTheme> = {
    default: {
        felt: 0x246f34,
        feltInner: 0x2e8a3d,
        feltInnerBorder: 0x77bf69,
        bg: 0x07140f,
        bgOverlayAlpha: 0.18,
        turnBg: 0x163b2b,
        bgImage: 'bg-brisca',
        bgAlpha: 1,
        showFelt: false,
    },
    war: {
        felt: 0x1a3a6b,
        feltInner: 0x1e4a88,
        feltInnerBorder: 0x4d7cc9,
        bg: 0x0a1a2e,
        bgOverlayAlpha: 0.92,
        turnBg: 0x0f2850,
        bgImage: 'bg-war',
        bgAlpha: 0.18,
        showFelt: true,
    },
    poker: {
        felt: 0x1a5c32,
        feltInner: 0x226b3c,
        feltInnerBorder: 0x4da870,
        bg: 0x071a10,
        bgOverlayAlpha: 0.22,
        turnBg: 0x0f3322,
        bgImage: '',
        bgAlpha: 0,
        showFelt: true,
    },
};

export function getTheme(themeId?: string): PlayerTheme {
    return THEMES[themeId ?? 'default'] ?? THEMES.default;
}

export function drawBackground(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    theme: PlayerTheme,
): void {
    layer.add(
        scene.add.rectangle(
            PLAYER_GAME_WIDTH / 2,
            PLAYER_GAME_HEIGHT / 2,
            PLAYER_GAME_WIDTH,
            PLAYER_GAME_HEIGHT,
            theme.bg,
            1,
        ),
    );

    if (scene.textures.exists(theme.bgImage)) {
        layer.add(
            scene.add
                .image(PLAYER_GAME_WIDTH / 2, PLAYER_GAME_HEIGHT / 2, theme.bgImage)
                .setDisplaySize(PLAYER_GAME_WIDTH + 80, PLAYER_GAME_HEIGHT + 80)
                .setAlpha(theme.bgAlpha),
        );
    }

    layer.add(
        scene.add.rectangle(
            PLAYER_GAME_WIDTH / 2,
            PLAYER_GAME_HEIGHT / 2,
            PLAYER_GAME_WIDTH,
            PLAYER_GAME_HEIGHT,
            theme.bg,
            theme.bgOverlayAlpha,
        ),
    );

    if (theme.showFelt) {
        layer.add(
            createRoundedPanel(scene, PLAYER_GAME_WIDTH / 2, 350, 312, 412, 68, theme.felt, 0.96, theme.bg, 5, 0.96),
        );
        layer.add(
            createRoundedPanel(scene, PLAYER_GAME_WIDTH / 2, 352, 286, 374, 50, theme.feltInner, 0.55, theme.feltInnerBorder, 1, 0.18),
        );
    }
}

export function drawTopBar(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    viewModel: CardGameViewModel,
    theme: PlayerTheme,
): void {
    const isPlayerTurn = viewModel.players[0]?.isCurrentTurn === true;
    layer.add(
        createRoundedPanel(
            scene,
            PLAYER_GAME_WIDTH / 2,
            playerPovZones.topBarY,
            94,
            30,
            15,
            isPlayerTurn ? 0xf7efe0 : theme.turnBg,
            0.98,
        ),
    );
    layer.add(
        scene.add
            .text(
                PLAYER_GAME_WIDTH / 2,
                playerPovZones.topBarY,
                isPlayerTurn ? 'Your turn' : viewModel.phaseLabel,
                {
                    fontFamily: 'Arial',
                    fontSize: '14px',
                    fontStyle: '700',
                    color: isPlayerTurn ? '#10251c' : CREAM,
                },
            )
            .setOrigin(0.5),
    );
}
