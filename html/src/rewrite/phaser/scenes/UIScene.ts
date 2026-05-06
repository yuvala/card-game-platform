import * as Phaser from "phaser";

import type { CardGameSession } from "@rewrite-core/engine/game/session";
import type {
    CardGameViewModel
} from "@rewrite-core/engine/game/viewModel";
import { HUD_WIDTH, HUD_X, REWRITE_HEIGHT } from "../layout";
import {
    TABLE_CREAM,
    TABLE_CREAM_DIM,
    TABLE_FONT_FAMILY,
    TABLE_GOLD,
    TABLE_GOLD_DARK,
    TABLE_PANEL,
    TABLE_TEXT_RESOLUTION
} from "./layout/constants";

interface ButtonRefs {
    start: Phaser.GameObjects.Text;
    play: Phaser.GameObjects.Text;
    autoRun: Phaser.GameObjects.Text;
    restart: Phaser.GameObjects.Text;
}

const UI_TEXT_RESOLUTION = TABLE_TEXT_RESOLUTION;

export class UIScene<TSnapshot> extends Phaser.Scene {
    private readonly session: CardGameSession<TSnapshot>;
    private readonly viewerId: string | null;
    private subscription?: { unsubscribe(): void };
    private phaseBadge!: Phaser.GameObjects.Text;
    private roundText!: Phaser.GameObjects.Text;
    private deckText!: Phaser.GameObjects.Text;
    private scoreText!: Phaser.GameObjects.Text;
    private outcomeTitleText!: Phaser.GameObjects.Text;
    private outcomeDetailText!: Phaser.GameObjects.Text;
    private actionHintText!: Phaser.GameObjects.Text;
    private statusText!: Phaser.GameObjects.Text;
    private buttons!: ButtonRefs;
    private isAutoRunEnabled = false;
    private pendingAutoRunStep?: Phaser.Time.TimerEvent;

    constructor(session: CardGameSession<TSnapshot>, viewerId?: string | null) {
        super("rewrite-ui");
        this.session = session;
        this.viewerId = viewerId ?? null;
    }

    create(): void {
        this.add.rectangle(HUD_X + HUD_WIDTH / 2 + 8, REWRITE_HEIGHT / 2 + 8, HUD_WIDTH - 28, REWRITE_HEIGHT - 40, 0x000000, 0.2);
        this.add.rectangle(HUD_X + HUD_WIDTH / 2, REWRITE_HEIGHT / 2, HUD_WIDTH - 28, REWRITE_HEIGHT - 40, TABLE_PANEL, 0.92)
            .setStrokeStyle(2, TABLE_GOLD, 0.18);

        this.add.text(HUD_X + 34, 40, "TABLE CONTROLS", {
            fontFamily: TABLE_FONT_FAMILY,
            fontSize: "13px",
            color: "#ffd166",
            letterSpacing: 2
        }).setResolution(UI_TEXT_RESOLUTION);

        this.phaseBadge = this.add.text(HUD_X + 34, 96, "", {
            fontFamily: TABLE_FONT_FAMILY,
            fontSize: "24px",
            color: "#10251c",
            backgroundColor: "#ffd166",
            padding: { left: 16, right: 16, top: 10, bottom: 10 }
        }).setResolution(UI_TEXT_RESOLUTION);

        this.roundText = this.add.text(HUD_X + 34, 164, "", {
            fontFamily: TABLE_FONT_FAMILY,
            fontSize: "20px",
            color: TABLE_CREAM,
            fontStyle: "bold"
        }).setResolution(UI_TEXT_RESOLUTION);

        this.deckText = this.add.text(HUD_X + 34, 206, "", {
            fontFamily: TABLE_FONT_FAMILY,
            fontSize: "16px",
            color: TABLE_CREAM,
            wordWrap: { width: HUD_WIDTH - 70 }
        }).setResolution(UI_TEXT_RESOLUTION);

        this.add.text(HUD_X + 34, 252, "Use the Create Game drawer to change the ruleset, seats, or deck.", {
            fontFamily: TABLE_FONT_FAMILY,
            fontSize: "15px",
            color: TABLE_CREAM_DIM,
            wordWrap: { width: HUD_WIDTH - 70 }
        }).setResolution(UI_TEXT_RESOLUTION);

        this.scoreText = this.add.text(HUD_X + 34, 306, "", {
            fontFamily: TABLE_FONT_FAMILY,
            fontSize: "16px",
            color: TABLE_CREAM,
            wordWrap: { width: HUD_WIDTH - 70 },
            lineSpacing: 4
        }).setResolution(UI_TEXT_RESOLUTION);

        this.outcomeTitleText = this.add.text(HUD_X + 34, 348, "", {
            fontFamily: TABLE_FONT_FAMILY,
            fontSize: "18px",
            color: "#ffd166",
            wordWrap: { width: HUD_WIDTH - 70 }
        }).setResolution(UI_TEXT_RESOLUTION).setVisible(false);
        this.outcomeDetailText = this.add.text(HUD_X + 34, 376, "", {
            fontFamily: TABLE_FONT_FAMILY,
            fontSize: "14px",
            color: "rgba(246,236,210,0.86)",
            wordWrap: { width: HUD_WIDTH - 70 },
            lineSpacing: 3
        }).setResolution(UI_TEXT_RESOLUTION).setVisible(false);

        this.buttons = {
            start: this.createButton(HUD_X + HUD_WIDTH / 2, 398, "Deal Cards", () => {
                this.session.send({ type: "START" });
            }),
            play: this.createButton(HUD_X + HUD_WIDTH / 2 - 58, 458, "Play Card", () => {
                this.session.send({ type: "PLAY_CARD" });
            }),
            autoRun: this.createButton(HUD_X + HUD_WIDTH / 2 + 76, 458, "▶", () => {
                this.toggleAutoRun();
            }),
            restart: this.createButton(HUD_X + HUD_WIDTH / 2, 518, "Restart", () => {
                this.stopAutoRun();
                this.session.send({ type: "RESTART" });
            })
        };

        this.actionHintText = this.add.text(HUD_X + 34, 548, "", {
            fontFamily: TABLE_FONT_FAMILY,
            fontSize: "14px",
            color: "rgba(255,209,102,0.86)",
            wordWrap: { width: HUD_WIDTH - 70 },
            lineSpacing: 3
        }).setResolution(UI_TEXT_RESOLUTION).setVisible(false);

        this.add.rectangle(HUD_X + HUD_WIDTH / 2, 620, HUD_WIDTH - 68, 118, 0x10221b, 0.84)
            .setStrokeStyle(2, TABLE_GOLD, 0.18);
        this.add.text(HUD_X + 34, 550, "STATUS", {
            fontFamily: TABLE_FONT_FAMILY,
            fontSize: "13px",
            color: "#ffd166",
            letterSpacing: 2
        }).setResolution(UI_TEXT_RESOLUTION);
        this.statusText = this.add.text(HUD_X + 42, 580, "", {
            fontFamily: TABLE_FONT_FAMILY,
            fontSize: "16px",
            color: TABLE_CREAM,
            wordWrap: { width: HUD_WIDTH - 84 },
            lineSpacing: 5
        }).setResolution(UI_TEXT_RESOLUTION);

        this.subscription = this.session.subscribe(() => {
            this.syncViewModel(this.session.getViewModel(this.viewerId));
        });

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.stopAutoRun();
            this.subscription?.unsubscribe();
            this.subscription = undefined;
        });

        this.syncViewModel(this.session.getViewModel(this.viewerId));
    }

    private createButton(
        x: number,
        y: number,
        label: string,
        onClick: () => void
    ): Phaser.GameObjects.Text {
        const button = this.add.text(x, y, label, {
            fontFamily: TABLE_FONT_FAMILY,
            fontSize: "20px",
            color: "#10251c",
            backgroundColor: "#f7d46c",
            padding: { left: 18, right: 18, top: 12, bottom: 12 }
        }).setOrigin(0.5).setResolution(UI_TEXT_RESOLUTION).setInteractive({ useHandCursor: true });

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
        this.syncOutcome(viewModel);
        this.syncPrimaryAction(viewModel);

        this.setButtonState(this.buttons.start, viewModel.controls.canStart);
        this.setButtonState(this.buttons.play, viewModel.controls.canPlay);
        this.setButtonState(this.buttons.restart, viewModel.controls.canRestart);
        this.syncAutoRun(viewModel);
    }

    private syncOutcome(viewModel: CardGameViewModel): void {
        const outcome = viewModel.outcome;
        if (!outcome) {
            this.outcomeTitleText.setVisible(false);
            this.outcomeDetailText.setVisible(false);
            this.statusText.setY(580);
            return;
        }

        this.outcomeTitleText
            .setText(outcome.title)
            .setVisible(true);
        this.outcomeDetailText
            .setText(outcome.detail)
            .setVisible(true);
        this.statusText.setY(642);
    }

    private syncPrimaryAction(viewModel: CardGameViewModel): void {
        const action = viewModel.primaryAction;
        if (!action) {
            this.actionHintText.setVisible(false);
            this.buttons.play.setText("Play Card");
            return;
        }

        this.buttons.play.setText(action.label);
        this.actionHintText
            .setText(action.hint)
            .setVisible(Boolean(action.hint));
    }

    private toggleAutoRun(): void {
        if (this.isAutoRunEnabled) {
            this.stopAutoRun();
            this.syncViewModel(this.session.getViewModel(this.viewerId));
            return;
        }

        this.isAutoRunEnabled = true;
        this.syncViewModel(this.session.getViewModel(this.viewerId));
    }

    private stopAutoRun(): void {
        this.isAutoRunEnabled = false;
        this.pendingAutoRunStep?.remove(false);
        this.pendingAutoRunStep = undefined;
    }

    private syncAutoRun(viewModel: CardGameViewModel): void {
        const canStep = viewModel.controls.canStart || viewModel.controls.canPlay;
        if (viewModel.outcome || viewModel.controls.canRestart) {
            this.stopAutoRun();
        }

        this.buttons.autoRun.setText(this.isAutoRunEnabled ? "■" : "▶");
        this.setButtonState(this.buttons.autoRun, this.isAutoRunEnabled || canStep);

        if (!this.isAutoRunEnabled || !canStep || this.pendingAutoRunStep) {
            return;
        }

        this.pendingAutoRunStep = this.time.delayedCall(420, () => {
            this.pendingAutoRunStep = undefined;
            const latestViewModel = this.session.getViewModel(this.viewerId);
            if (!this.isAutoRunEnabled) {
                return;
            }

            if (latestViewModel.controls.canStart) {
                this.session.send({ type: "START" });
                return;
            }

            if (latestViewModel.controls.canPlay) {
                this.session.send({ type: "PLAY_CARD" });
            }
        });
    }

    private setButtonState(button: Phaser.GameObjects.Text, isEnabled: boolean): void {
        button.setAlpha(isEnabled ? 1 : 0.35);
        button.setColor(isEnabled ? "#10251c" : "#26352d");
        button.setBackgroundColor(isEnabled ? "#f7d46c" : "#" + TABLE_GOLD_DARK.toString(16).padStart(6, "0"));
        if (isEnabled) {
            button.setInteractive({ useHandCursor: true });
        } else {
            button.disableInteractive();
            button.setScale(1);
        }
    }
}
