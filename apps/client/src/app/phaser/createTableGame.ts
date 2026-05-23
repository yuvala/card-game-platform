import * as Phaser from 'phaser';

import type { CardGameSession } from '@engine/engine/game/session';
import { TABLE_WIDTH, REWRITE_HEIGHT } from './layout';
import { buildPhaserConfig } from './buildPhaserConfig';
import { BootScene } from './scenes/BootScene';
import { TableScene } from './scenes/TableScene';
import { TableControlsPanel } from './ui/TableControlsPanel';
import { TableDebugPanel } from './ui/TableDebugPanel';

export interface TableGame {
    destroy(removeCanvas: boolean): void;
}

export function createTableGame<TSnapshot>(
    parentId: string,
    session: CardGameSession<TSnapshot>,
    viewerId?: string | null,
): TableGame {
    const parentEl = document.getElementById(parentId)!;

    const wrapper = document.createElement('div');
    wrapper.className = 'tableGameWrapper';
    parentEl.appendChild(wrapper);

    const debug = new TableDebugPanel(session);
    wrapper.appendChild(debug.element);

    const canvasMount = document.createElement('div');
    canvasMount.className = 'tableGameCanvas';
    wrapper.appendChild(canvasMount);

    const panel = new TableControlsPanel(session, viewerId);
    wrapper.appendChild(panel.element);

    const game = new Phaser.Game(
        buildPhaserConfig(TABLE_WIDTH, REWRITE_HEIGHT, {
            parent: canvasMount,
            backgroundColor: '#0a1b14',
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
            },
            scene: [new BootScene(), new TableScene(session, viewerId)],
        }),
    );

    return {
        destroy(removeCanvas: boolean): void {
            game.destroy(removeCanvas);
            panel.destroy();
            debug.destroy();
            wrapper.remove();
        },
    };
}
