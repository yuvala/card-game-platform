import * as Phaser from "phaser";

import type { RewriteGameActor } from "../games/drawPoker/machine";
import { HUD_WIDTH, REWRITE_HEIGHT, REWRITE_WIDTH } from "./layout";
import { BootScene } from "./scenes/BootScene";
import { TableScene } from "./scenes/TableScene";
import { UIScene } from "./scenes/UIScene";

export function createRewriteGame(parent: string, actor: RewriteGameActor): Phaser.Game {
    return new Phaser.Game({
        type: Phaser.AUTO,
        parent,
        width: REWRITE_WIDTH,
        height: REWRITE_HEIGHT,
        backgroundColor: "#0a1b14",
        render: {
            antialias: true
        },
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        scene: [new BootScene(), new TableScene(actor), new UIScene(actor)],
        callbacks: {
            postBoot: (game) => {
                game.canvas.setAttribute("data-hud-width", String(HUD_WIDTH));
            }
        }
    });
}
