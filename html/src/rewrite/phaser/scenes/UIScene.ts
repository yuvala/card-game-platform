import * as Phaser from "phaser";

import type {
    CardGameActor,
    CardGameViewModel,
    CardGameViewModelFactory
} from "../../engine/game/viewModel";
import { HUD_WIDTH, HUD_X, REWRITE_HEIGHT } from "../layout";

interface ButtonRefs {
    start: Phaser.GameObjects.Text;
    play: Phaser.GameObjects.Text;
    restart: Phaser.GameObjects.Text;
}

export class UIScene<TSnapshot> extends Phaser.Scene {
    private readonly actor: CardGameActor<TSnapshot>;
    private readonly getViewModel: CardGameViewModelFactory<TSnapshot>;
    private subscription?: { unsubscribe(): void };
    private phaseBadge!: Phaser.GameObjects.Text;
    private roundText!: Phaser.GameObjects.Text;
    private deckText!: Phaser.GameObjects.Text;
    private scoreText!: Phaser.GameObjects.Text;
    private statusText!: Phaser.GameObjects.Text;
    private buttons!: ButtonRefs;

    constructor(actor: CardGameActor<TSnapshot>, getViewModel: CardGameViewModelFactory<TSnapshot>) {
        super("rewrite-ui");
        this.actor = actor;
        this.getViewModel = getViewModel;
    }

    create(): void {
        this.add.rectangle(HUD_X + HUD_WIDTH / 2, REWRITE_HEIGHT / 2, HUD_WIDTH - 28, REWRITE_HEIGHT - 40, 0x08150f, 0.9)
            .setStrokeStyle(2, 0xffd166, 0.14);

        this.add.text(HUD_X + 34, 40, "CONTROL PANEL", {
            fontFamily: "Arial",
            fontSize: "13px",
            color: "#ffd166",
            letterSpacing: 2
        });

        this.phaseBadge = this.add.text(HUD_X + 34, 96, "", {
            fontFamily: "Arial",
            fontSize: "24px",
            color: "#10251c",
            backgroundColor: "#ffd166",
            padding: { left: 16, right: 16, top: 10, bottom: 10 }
        });

        this.roundText = this.add.text(HUD_X + 34, 164, "", {
            fontFamily: "Arial",
            fontSize: "20px",
            color: "#f6ecd2"
        });

        this.deckText = this.add.text(HUD_X + 34, 206, "", {
            fontFamily: "Arial",
            fontSize: "16px",
            color: "#f6ecd2",
            wordWrap: { width: HUD_WIDTH - 70 }
        });

        this.add.text(HUD_X + 34, 252, "Switch decks with ?deck=french, ?deck=spanish, or ?deck=italian.", {
            fontFamily: "Arial",
            fontSize: "15px",
            color: "rgba(246,236,210,0.7)",
            wordWrap: { width: HUD_WIDTH - 70 }
        });

        this.scoreText = this.add.text(HUD_X + 34, 306, "", {
            fontFamily: "Arial",
            fontSize: "16px",
            color: "#f6ecd2",
            wordWrap: { width: HUD_WIDTH - 70 },
            lineSpacing: 4
        });

        this.buttons = {
            start: this.createButton(HUD_X + HUD_WIDTH / 2, 398, "Start Rewrite", () => {
                this.actor.send({ type: "START" });
            }),
            play: this.createButton(HUD_X + HUD_WIDTH / 2, 458, "Play Card", () => {
                this.actor.send({ type: "PLAY_CARD" });
            }),
            restart: this.createButton(HUD_X + HUD_WIDTH / 2, 518, "Restart", () => {
                this.actor.send({ type: "RESTART" });
            })
        };

        this.add.rectangle(HUD_X + HUD_WIDTH / 2, 620, HUD_WIDTH - 68, 118, 0x10221b, 0.84)
            .setStrokeStyle(2, 0xffd166, 0.18);
        this.add.text(HUD_X + 34, 550, "STATUS", {
            fontFamily: "Arial",
            fontSize: "13px",
            color: "#ffd166",
            letterSpacing: 2
        });
        this.statusText = this.add.text(HUD_X + 42, 580, "", {
            fontFamily: "Arial",
            fontSize: "16px",
            color: "#f6ecd2",
            wordWrap: { width: HUD_WIDTH - 84 },
            lineSpacing: 5
        });

        this.subscription = this.actor.subscribe((snapshot) => {
            this.syncViewModel(this.getViewModel(snapshot));
        });

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.subscription?.unsubscribe();
            this.subscription = undefined;
        });

        this.syncViewModel(this.getViewModel(this.actor.getSnapshot()));
    }

    private createButton(
        x: number,
        y: number,
        label: string,
        onClick: () => void
    ): Phaser.GameObjects.Text {
        const button = this.add.text(x, y, label, {
            fontFamily: "Arial",
            fontSize: "20px",
            color: "#10251c",
            backgroundColor: "#f6ecd2",
            padding: { left: 18, right: 18, top: 12, bottom: 12 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        button.on(Phaser.Input.Events.POINTER_OVER, () => {
            if (button.input?.enabled) {
                button.setScale(1.03);
            }
        });

        button.on(Phaser.Input.Events.POINTER_OUT, () => {
            button.setScale(1);
        });

        button.on(Phaser.Input.Events.POINTER_DOWN, () => {
            if (button.input?.enabled) {
                onClick();
            }
        });

        return button;
    }

    private syncViewModel(viewModel: CardGameViewModel): void {
        this.phaseBadge.setText(viewModel.phaseLabel);
        this.roundText.setText(viewModel.roundLabel);
        this.deckText.setText(viewModel.deckLabel);
        this.scoreText.setText(viewModel.scoreLines.join("\n"));
        this.statusText.setText(viewModel.statusText);

        this.setButtonState(this.buttons.start, viewModel.controls.canStart);
        this.setButtonState(this.buttons.play, viewModel.controls.canPlay);
        this.setButtonState(this.buttons.restart, viewModel.controls.canRestart);
    }

    private setButtonState(button: Phaser.GameObjects.Text, isEnabled: boolean): void {
        button.setAlpha(isEnabled ? 1 : 0.35);
        if (isEnabled) {
            button.setInteractive({ useHandCursor: true });
        } else {
            button.disableInteractive();
            button.setScale(1);
        }
    }
}
