import type { CardGameSession } from '@engine/engine/game/session';
import type { CardGameViewModel } from '@engine/engine/game/viewModel';
import * as Phaser from 'phaser';
import { buildPhaserConfig } from '../phaser/buildPhaserConfig';
import { PlayerTableScene } from './scenes/PlayerTableScene';

export const PLAYER_GAME_WIDTH = 390;
export const PLAYER_GAME_HEIGHT = 694;

export function createPlayerGame(
    parent: string,
    session: CardGameSession<CardGameViewModel>,
): Phaser.Game {
    return new Phaser.Game(buildPhaserConfig(PLAYER_GAME_WIDTH, PLAYER_GAME_HEIGHT, {
        parent,
        backgroundColor: '#06140f',
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
        },
        scene: [new PlayerTableScene(session)],
    }));
}
