import * as Phaser from 'phaser';

import type { CardGameViewModel } from '@engine/engine/game/viewModel';
import { PLAYER_GAME_WIDTH, PLAYER_GAME_HEIGHT } from '../createPlayerGame';
import { GOLD } from './playerDrawUtils';

export interface BattleFlashState {
    lastKey: string;
    container?: Phaser.GameObjects.Container;
}

export function checkBattleFlash(
    scene: Phaser.Scene,
    viewModel: CardGameViewModel,
    state: BattleFlashState,
): void {
    const outcome = viewModel.outcome;
    if (!outcome) return;

    const flashKey = 'outcome:' + outcome.winnerPlayerIds.join(',');
    if (flashKey === state.lastKey) return;

    state.lastKey = flashKey;
    const localPlayerId = viewModel.players[0]?.id ?? '';
    const isLocalWin = outcome.winnerPlayerIds.includes(localPlayerId);
    const winnerName =
        viewModel.players.find((p) => outcome.winnerPlayerIds.includes(p.id))?.nameLabel ?? '';
    showBattleFlash(scene, winnerName, isLocalWin, state);
}

function showBattleFlash(
    scene: Phaser.Scene,
    winnerName: string,
    isLocalPlayer: boolean,
    state: BattleFlashState,
): void {
    state.container?.destroy(true);

    const cx = PLAYER_GAME_WIDTH / 2;
    const cy = PLAYER_GAME_HEIGHT / 2;
    const container = scene.add.container(cx, cy);
    container.setDepth(2000);
    container.setAlpha(0);
    state.container = container;

    const overlay = scene.add.rectangle(0, 0, PLAYER_GAME_WIDTH, PLAYER_GAME_HEIGHT, 0x000000, 0.52);
    const panelW = 262;
    const panelH = 92;
    const panelBg = scene.add.graphics();
    const panelFill = isLocalPlayer ? 0x1a5c2a : 0x0f2850;
    const panelBorder = isLocalPlayer ? GOLD : 0x6699cc;
    panelBg.fillStyle(panelFill, 0.97);
    panelBg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 22);
    panelBg.lineStyle(2, panelBorder, 0.9);
    panelBg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 22);

    const titleLabel = isLocalPlayer ? 'YOU WIN!' : winnerName + ' wins';
    const title = scene.add
        .text(0, -16, titleLabel, {
            fontFamily: 'Arial',
            fontSize: isLocalPlayer ? '30px' : '24px',
            fontStyle: '700',
            color: isLocalPlayer ? '#ffd166' : '#c8dff8',
        })
        .setOrigin(0.5);

    const sub = scene.add
        .text(0, 20, 'Battle won', {
            fontFamily: 'Arial',
            fontSize: '12px',
            color: isLocalPlayer ? 'rgba(255,240,180,0.65)' : 'rgba(180,210,255,0.65)',
        })
        .setOrigin(0.5);

    const items: Phaser.GameObjects.GameObject[] = [overlay, panelBg];
    if (isLocalPlayer && scene.textures.exists('win-bg')) {
        const winBg = scene.add.image(0, 0, 'win-bg').setDisplaySize(panelW, panelH);
        items.push(winBg);
    }
    items.push(title, sub);
    container.add(items);

    scene.tweens.add({
        targets: container,
        alpha: 1,
        scaleX: { from: 0.88, to: 1 },
        scaleY: { from: 0.88, to: 1 },
        duration: 180,
        ease: 'Back.easeOut',
        onComplete: () => {
            scene.tweens.add({
                targets: container,
                alpha: 0,
                duration: 360,
                delay: 780,
                ease: 'Sine.easeIn',
                onComplete: () => {
                    container.destroy(true);
                    if (state.container === container) {
                        state.container = undefined;
                    }
                },
            });
        },
    });
}
