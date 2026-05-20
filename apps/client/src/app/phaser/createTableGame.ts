import * as Phaser from 'phaser';

import type { CardGameSession } from '@engine/engine/game/session';
import { HUD_WIDTH, REWRITE_HEIGHT, REWRITE_WIDTH } from './layout';
import { buildPhaserConfig } from './buildPhaserConfig';
import { BootScene } from './scenes/BootScene';
import { TableScene } from './scenes/TableScene';
import { UIScene } from './scenes/UIScene';

export function createTableGame<TSnapshot>(
    parent: string,
    session: CardGameSession<TSnapshot>,
    viewerId?: string | null,
): Phaser.Game {
    return new Phaser.Game(buildPhaserConfig(REWRITE_WIDTH, REWRITE_HEIGHT, {
        parent,
        backgroundColor: '#0a1b14',
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [new BootScene(), new TableScene(session, viewerId), new UIScene(session, viewerId)],
        callbacks: {
            postBoot: (game) => {
                game.canvas.dataset.hudWidth = String(HUD_WIDTH);
            },
        },
    }));
}
