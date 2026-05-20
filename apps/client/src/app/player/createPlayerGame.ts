import * as Phaser from 'phaser';

import type { CardGameSession } from '@engine/engine/game/session';
import type { CardGameViewModel } from '@engine/engine/game/viewModel';
import { PlayerTableScene } from './scenes/PlayerTableScene';

export const PLAYER_GAME_WIDTH = 390;
export const PLAYER_GAME_HEIGHT = 694;

export function createPlayerGame(
    parent: string,
    session: CardGameSession<CardGameViewModel>,
): Phaser.Game {
    return new Phaser.Game({
        type: Phaser.AUTO,
        parent,
        width: PLAYER_GAME_WIDTH,
        height: PLAYER_GAME_HEIGHT,
        backgroundColor: '#06140f',
        render: {
            antialias: true,
            antialiasGL: true,
            roundPixels: true,
            mipmapFilter: 'LINEAR',
        },
        scale: {
            mode: Phaser.Scale.FIT,
            autoRound: true,
            autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
        },
        scene: [new PlayerTableScene(session)],
    });
}
