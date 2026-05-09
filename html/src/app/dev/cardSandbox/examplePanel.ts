import * as Phaser from "phaser";

import type { CardSandboxExampleContext, CardSandboxExamplePanel } from "./types";

interface ButtonInput {
    label: string;
    x: number;
    y: number;
    width?: number;
    onClick(): void;
}

export function drawExamplePanel(
    context: CardSandboxExampleContext,
    panel: CardSandboxExamplePanel
): void {
    const { scene, renderLayer, colors } = context;
    renderLayer.add(scene.add.rectangle(
        panel.x + panel.width / 2,
        panel.y + 162,
        panel.width + 28,
        350,
        0x07140f,
        0.42
    ).setStrokeStyle(1, colors.gold, 0.14));

    if (panel.title.length > 0) {
        renderLayer.add(scene.add.text(panel.x, panel.y, panel.title, {
            fontFamily: "Arial",
            fontSize: "17px",
            fontStyle: "700",
            color: colors.cream
        }));
    }
    if (panel.description.length > 0) {
        renderLayer.add(scene.add.text(panel.x, panel.y + 30, panel.description, {
            fontFamily: "Arial",
            fontSize: "13px",
            color: colors.dim,
            wordWrap: { width: panel.width }
        }));
    }
}

export function addSandboxButton(
    context: CardSandboxExampleContext,
    input: ButtonInput
): void {
    const { scene, renderLayer, colors } = context;
    const width = input.width ?? 112;
    const panel = scene.add.rectangle(input.x, input.y, width, 34, colors.gold, 1)
        .setInteractive({ useHandCursor: true });
    const text = scene.add.text(input.x, input.y, input.label, {
        fontFamily: "Arial",
        fontSize: "13px",
        fontStyle: "700",
        color: "#10251c"
    }).setOrigin(0.5);

    panel.on(Phaser.Input.Events.POINTER_DOWN, input.onClick);
    panel.on(Phaser.Input.Events.POINTER_OVER, () => {
        panel.setScale(1.04);
        text.setScale(1.04);
    });
    panel.on(Phaser.Input.Events.POINTER_OUT, () => {
        panel.setScale(1);
        text.setScale(1);
    });

    renderLayer.add([panel, text]);
}

export function addStatusText(
    context: CardSandboxExampleContext,
    x: number,
    y: number,
    text: string
): Phaser.GameObjects.Text {
    const status = context.scene.add.text(x, y, text, {
        fontFamily: "Arial",
        fontSize: "12px",
        fontStyle: "700",
        color: context.colors.dim
    }).setOrigin(0.5);
    context.renderLayer.add(status);
    return status;
}
