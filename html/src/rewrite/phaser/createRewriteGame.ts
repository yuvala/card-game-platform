import * as Phaser from "phaser";

import type { CardGameActor, CardGameViewModelFactory } from "../engine/game/viewModel";
import { HUD_WIDTH, REWRITE_HEIGHT, REWRITE_WIDTH } from "./layout";
import { BootScene } from "./scenes/BootScene";
import { TableScene } from "./scenes/TableScene";
import { UIScene } from "./scenes/UIScene";

export function createRewriteGame<TSnapshot>(
    parent: string,
    actor: CardGameActor<TSnapshot>,
    getViewModel: CardGameViewModelFactory<TSnapshot>
): Phaser.Game {
    return new Phaser.Game({
        type: Phaser.AUTO,
        parent,
        width: REWRITE_WIDTH,
        height: REWRITE_HEIGHT,
        backgroundColor: "#0a1b14",
        render: {
            antialias: false,
            antialiasGL: false,
            roundPixels: true
        },
        scale: {
            mode: Phaser.Scale.FIT,
            autoRound: true,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        scene: [new BootScene(), new TableScene(actor, getViewModel), new UIScene(actor, getViewModel)],
        callbacks: {
            postBoot: (game) => {
                game.canvas.setAttribute("data-hud-width", String(HUD_WIDTH));
            }
        }
    });
}
