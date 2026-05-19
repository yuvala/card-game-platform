import * as Phaser from "phaser";

import type { CardGameSession } from "@engine/engine/game/session";
import type { CardGameViewModel } from "@engine/engine/game/viewModel";
import { PlayerTableScene } from "./scenes/PlayerTableScene";

export const PLAYER_GAME_WIDTH = 390;
export const PLAYER_GAME_HEIGHT = 694;

export function createPlayerGame(
    parent: string,
    session: CardGameSession<CardGameViewModel>
): Phaser.Game {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    return new Phaser.Game({
        type: Phaser.AUTO,
        parent,
        width: PLAYER_GAME_WIDTH * dpr,
        height: PLAYER_GAME_HEIGHT * dpr,
        backgroundColor: "#06140f",
        render: {
            antialias: true,
            antialiasGL: true,
            roundPixels: true,
            mipmapFilter: "LINEAR"
        },
        scale: {
            mode: Phaser.Scale.FIT,
            autoRound: true,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            zoom: 1 / dpr
        },
        scene: [new PlayerTableScene(session, dpr)]
    });
}
