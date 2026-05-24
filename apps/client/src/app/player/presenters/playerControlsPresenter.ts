import * as Phaser from 'phaser';

import type { CardGameViewModel } from '@engine/engine/game/viewModel';
import { PLAYER_GAME_WIDTH } from '../createPlayerGame';
import { playerPovZones } from '../playerPovLayout';
import { normalizeActionLabel } from '../playerPovUiModel';
import { GOLD, DIM, createRoundedPanel } from './playerDrawUtils';

export type PlayerSessionStatus =
    | { type: 'connected' }
    | { type: 'error'; message: string }
    | { type: 'closed'; message: string };

export function drawBottomControls(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    viewModel: CardGameViewModel,
    onPlayCard: () => void,
): void {
    const action = viewModel.primaryAction;
    const canPlay = viewModel.controls.canPlay || action?.eventType === 'PLAY_CARD';
    const label = normalizeActionLabel(
        action?.label ?? (viewModel.players[0]?.isCurrentTurn ? 'Select Card' : 'Waiting'),
    );
    const buttonX = PLAYER_GAME_WIDTH / 2;
    const buttonWidth = 144;
    layer.add(
        createRoundedPanel(
            scene,
            buttonX,
            playerPovZones.actionButtonY,
            buttonWidth,
            48,
            18,
            canPlay ? 0xffd166 : 0x244034,
            canPlay ? 1 : 0.76,
            canPlay ? 0xffc840 : 0x6c806f,
            2,
            canPlay ? 0.72 : 0.2,
        ),
    );
    layer.add(
        scene.add
            .text(buttonX, playerPovZones.actionButtonY, label, {
                fontFamily: 'Arial',
                fontSize: canPlay ? '14px' : '16px',
                fontStyle: '700',
                color: canPlay ? '#10251c' : DIM,
            })
            .setOrigin(0.5),
    );

    if (canPlay && action?.eventType === 'PLAY_CARD') {
        const hitTarget = scene.add
            .rectangle(buttonX, playerPovZones.actionButtonY, buttonWidth, 48, 0x000000, 0.001)
            .setInteractive({ useHandCursor: true });
        hitTarget.on(Phaser.Input.Events.POINTER_DOWN, onPlayCard);
        layer.add(hitTarget);
    }

    const statusX = PLAYER_GAME_WIDTH / 2;
    const statusWidth = PLAYER_GAME_WIDTH - 60;
    layer.add(
        createRoundedPanel(scene, statusX, playerPovZones.actionStatusY, statusWidth, 30, 14, 0x071a13, 0.54, 0x5ea65d, 1, 0.12),
    );
    layer.add(
        scene.add
            .text(statusX, playerPovZones.actionStatusY, viewModel.statusText, {
                fontFamily: 'Arial',
                fontSize: '10px',
                color: DIM,
                align: 'center',
                wordWrap: { width: PLAYER_GAME_WIDTH - 82 },
            })
            .setOrigin(0.5),
    );
}

export function drawSessionStatus(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    status: PlayerSessionStatus | null,
): void {
    if (!status || status.type === 'connected') return;

    const isClosed = status.type === 'closed';
    const panelColor = isClosed ? 0x42231f : 0x4b3216;
    const strokeColor = isClosed ? 0xff9b8d : GOLD;
    const textColor = isClosed ? '#ffb6aa' : '#ffd166';
    layer.add(
        createRoundedPanel(scene, PLAYER_GAME_WIDTH / 2, 612, PLAYER_GAME_WIDTH - 44, 42, 12, panelColor, 0.94, strokeColor, 1, 0.6),
    );
    layer.add(
        scene.add
            .text(PLAYER_GAME_WIDTH / 2, 612, status.message, {
                fontFamily: 'Arial',
                fontSize: '12px',
                fontStyle: '700',
                color: textColor,
                align: 'center',
                wordWrap: { width: PLAYER_GAME_WIDTH - 72 },
            })
            .setOrigin(0.5),
    );
}
