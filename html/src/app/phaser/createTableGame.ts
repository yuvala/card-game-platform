import * as Phaser from "phaser";

import type { CardGameSession } from "@engine/engine/game/session";
import { HUD_WIDTH, REWRITE_HEIGHT, REWRITE_WIDTH } from "./layout";
import { BootScene } from "./scenes/BootScene";
import { TableScene } from "./scenes/TableScene";
import { UIScene } from "./scenes/UIScene";

export function createTableGame<TSnapshot>(
    parent: string,
    session: CardGameSession<TSnapshot>,
    viewerId?: string | null
): Phaser.Game {
    return new Phaser.Game({
        type: Phaser.AUTO,
        parent,
        width: REWRITE_WIDTH,
        height: REWRITE_HEIGHT,
        backgroundColor: "#0a1b14",
        render: {
            antialias: true,
            antialiasGL: true,
            roundPixels: true,
            mipmapFilter: "LINEAR"
        },
        scale: {
            mode: Phaser.Scale.FIT,
            autoRound: true,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        scene: [new BootScene(), new TableScene(session, viewerId), new UIScene(session, viewerId)],
        callbacks: {
            postBoot: (game) => {
                game.canvas.dataset.hudWidth = String(HUD_WIDTH);
            }
        }
    });
}
