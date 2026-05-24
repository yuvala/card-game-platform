import * as Phaser from 'phaser';

import type { CardGameViewModel } from '@engine/engine/game/viewModel';
import { PLAYER_GAME_WIDTH } from '../createPlayerGame';
import { playerPovZones } from '../playerPovLayout';
import type { PlayerPovPresentation } from '../playerPovPresentation';
import { GOLD, CREAM, DIM, createRoundedPanel } from './playerDrawUtils';

export function drawGameInfo(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    viewModel: CardGameViewModel,
    presentation: PlayerPovPresentation,
): void {
    if (presentation.infoPanel === 'none') return;

    if (presentation.infoPanel !== 'trump') {
        drawCompactGameInfo(scene, layer, presentation);
        return;
    }

    const trumpLabel = presentation.trumpLabel ?? 'spent';
    layer.add(
        createRoundedPanel(scene, PLAYER_GAME_WIDTH / 2, playerPovZones.gameInfoY, 256, 52, 22, 0x082417, 0.9, 0x5ea65d, 2, 0.3),
    );
    layer.add(
        scene.add
            .circle(PLAYER_GAME_WIDTH / 2 - 102, playerPovZones.gameInfoY, 18, 0xd3a22e, 1)
            .setStrokeStyle(2, GOLD, 0.72),
    );
    layer.add(
        scene.add
            .text(PLAYER_GAME_WIDTH / 2 - 102, playerPovZones.gameInfoY, 'T', {
                fontFamily: 'Arial',
                fontSize: '12px',
                fontStyle: '700',
                color: '#10251c',
            })
            .setOrigin(0.5),
    );
    layer.add(
        scene.add
            .text(PLAYER_GAME_WIDTH / 2 - 74, playerPovZones.gameInfoY - 8, presentation.infoPrimaryLabel + ': ' + trumpLabel, {
                fontFamily: 'Arial',
                fontSize: '13px',
                fontStyle: '700',
                color: CREAM,
            })
            .setOrigin(0, 0.5),
    );
    layer.add(
        scene.add
            .text(PLAYER_GAME_WIDTH / 2 - 74, playerPovZones.gameInfoY + 9, presentation.infoSecondaryValue, {
                fontFamily: 'Arial',
                fontSize: '10px',
                color: DIM,
            })
            .setOrigin(0, 0.5),
    );
    layer.add(
        scene.add.line(PLAYER_GAME_WIDTH / 2 + 52, playerPovZones.gameInfoY, 0, -18, 0, 18, 0x5ea65d, 0.35),
    );
    layer.add(
        scene.add
            .text(PLAYER_GAME_WIDTH / 2 + 68, playerPovZones.gameInfoY - 8, presentation.infoSecondaryLabel, {
                fontFamily: 'Arial',
                fontSize: '10px',
                color: DIM,
            })
            .setOrigin(0, 0.5),
    );
    layer.add(
        scene.add
            .text(PLAYER_GAME_WIDTH / 2 + 68, playerPovZones.gameInfoY + 9, String(viewModel.tableCards.length) + ' cards', {
                fontFamily: 'Arial',
                fontSize: '13px',
                fontStyle: '700',
                color: CREAM,
            })
            .setOrigin(0, 0.5),
    );
}

function drawCompactGameInfo(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    presentation: PlayerPovPresentation,
): void {
    const accentColor = presentation.infoPanel === 'battle' ? GOLD : 0x83d0ae;
    const iconLabel = presentation.infoPanel === 'battle' ? 'B' : 'D';
    layer.add(
        createRoundedPanel(scene, PLAYER_GAME_WIDTH / 2, playerPovZones.gameInfoY, 256, 48, 20, 0x082417, 0.88, accentColor, 2, 0.28),
    );
    layer.add(
        scene.add
            .circle(PLAYER_GAME_WIDTH / 2 - 102, playerPovZones.gameInfoY, 16, accentColor, 0.94)
            .setStrokeStyle(2, 0xf6ecd2, 0.4),
    );
    layer.add(
        scene.add
            .text(PLAYER_GAME_WIDTH / 2 - 102, playerPovZones.gameInfoY, iconLabel, {
                fontFamily: 'Arial',
                fontSize: '11px',
                fontStyle: '700',
                color: '#10251c',
            })
            .setOrigin(0.5),
    );
    layer.add(
        scene.add
            .text(PLAYER_GAME_WIDTH / 2 - 74, playerPovZones.gameInfoY - 8, presentation.infoPrimaryLabel, {
                fontFamily: 'Arial',
                fontSize: '10px',
                color: DIM,
            })
            .setOrigin(0, 0.5),
    );
    layer.add(
        scene.add
            .text(PLAYER_GAME_WIDTH / 2 - 74, playerPovZones.gameInfoY + 8, presentation.infoPrimaryValue, {
                fontFamily: 'Arial',
                fontSize: '11px',
                fontStyle: '700',
                color: CREAM,
            })
            .setOrigin(0, 0.5),
    );
    layer.add(
        scene.add.line(PLAYER_GAME_WIDTH / 2 + 36, playerPovZones.gameInfoY, 0, -15, 0, 15, 0x5ea65d, 0.3),
    );
    layer.add(
        scene.add
            .text(PLAYER_GAME_WIDTH / 2 + 52, playerPovZones.gameInfoY - 8, presentation.infoSecondaryLabel, {
                fontFamily: 'Arial',
                fontSize: '10px',
                color: DIM,
            })
            .setOrigin(0, 0.5),
    );
    layer.add(
        scene.add
            .text(PLAYER_GAME_WIDTH / 2 + 52, playerPovZones.gameInfoY + 8, presentation.infoSecondaryValue, {
                fontFamily: 'Arial',
                fontSize: '10px',
                fontStyle: '700',
                color: CREAM,
                wordWrap: { width: 70 },
            })
            .setOrigin(0, 0.5),
    );
}
