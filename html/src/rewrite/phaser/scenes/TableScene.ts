import * as Phaser from "phaser";

import type { RewriteGameActor, RewriteGameSnapshot } from "../../games/drawPoker/machine";
import { REWRITE_HEIGHT, TABLE_CENTER_X, TABLE_CENTER_Y, TABLE_WIDTH } from "../layout";

interface CardSlot {
    container: Phaser.GameObjects.Container;
    originX: number;
    originY: number;
    originAngle: number;
    face: Phaser.GameObjects.Rectangle;
}

export class TableScene extends Phaser.Scene {
    private readonly actor: RewriteGameActor;
    private subscription?: { unsubscribe(): void };
    private deckText!: Phaser.GameObjects.Text;
    private discardText!: Phaser.GameObjects.Text;
    private discardCard!: Phaser.GameObjects.Container;
    private discardCardFace!: Phaser.GameObjects.Rectangle;
    private discardCardLabel!: Phaser.GameObjects.Text;
    private seatLabels = new Map<string, Phaser.GameObjects.Text>();
    private handSlots = new Map<string, CardSlot[]>();
    private activeAnimationKey = "";

    constructor(actor: RewriteGameActor) {
        super("rewrite-table");
        this.actor = actor;
    }

    create(): void {
        const { height } = this.scale;

        if (this.textures.exists("rewrite-table-bg")) {
            this.add.image(TABLE_WIDTH / 2, height / 2, "rewrite-table-bg")
                .setDisplaySize(TABLE_WIDTH + 60, height + 60)
                .setAlpha(0.24);
        }

        this.add.rectangle(TABLE_WIDTH / 2, height / 2, TABLE_WIDTH, height, 0x08150f, 0.72);
        this.add.rectangle(TABLE_WIDTH / 2, height / 2, TABLE_WIDTH - 42, height - 40, 0x0d231b, 0.32)
            .setStrokeStyle(2, 0xffd166, 0.12);

        this.createSeatLabels();
        this.createHands();
        this.createPiles();

        this.subscription = this.actor.subscribe((snapshot) => {
            this.syncSnapshot(snapshot);
            if (snapshot.matches("animatingPlay")) {
                this.animatePlayedCard(snapshot);
            } else {
                this.activeAnimationKey = "";
            }
        });

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.subscription?.unsubscribe();
            this.subscription = undefined;
        });

        this.syncSnapshot(this.actor.getSnapshot());
    }

    private createSeatLabels(): void {
        this.seatLabels.set("p1", this.add.text(TABLE_CENTER_X, REWRITE_HEIGHT - 148, "", this.getSeatLabelStyle()).setOrigin(0.5, 0));
        this.seatLabels.set("p2", this.add.text(TABLE_WIDTH - 150, TABLE_CENTER_Y - 210, "", this.getSeatLabelStyle()).setOrigin(0.5, 0));
        this.seatLabels.set("p3", this.add.text(150, TABLE_CENTER_Y - 210, "", this.getSeatLabelStyle()).setOrigin(0.5, 0));
    }

    private createHands(): void {
        this.handSlots.set("p1", this.createHandSlots(TABLE_CENTER_X - 146, 606, 74, 0, 0));
        this.handSlots.set("p2", this.createHandSlots(TABLE_WIDTH - 120, 254, 0, 56, 90));
        this.handSlots.set("p3", this.createHandSlots(120, 254, 0, 56, -90));
    }

    private createPiles(): void {
        const pileStyle = {
            fontFamily: "Arial",
            fontSize: "18px",
            color: "#f6ecd2"
        };

        this.add.rectangle(TABLE_CENTER_X, 184, 132, 176, 0x13372b, 0.75).setStrokeStyle(3, 0xffd166, 0.25);
        this.add.text(TABLE_CENTER_X, 120, "Draw Pile", pileStyle).setOrigin(0.5, 0.5);
        this.deckText = this.add.text(TABLE_CENTER_X, 184, "", {
            ...pileStyle,
            fontSize: "24px"
        }).setOrigin(0.5);

        this.add.rectangle(TABLE_CENTER_X, 392, 132, 176, 0x35261a, 0.75).setStrokeStyle(3, 0xffd166, 0.25);
        this.add.text(TABLE_CENTER_X, 318, "Discard", pileStyle).setOrigin(0.5, 0.5);
        this.discardText = this.add.text(TABLE_CENTER_X, 474, "", pileStyle).setOrigin(0.5);

        this.discardCardFace = this.add.rectangle(0, 0, 76, 108, 0xf7efe0, 1).setStrokeStyle(3, 0x17352b);
        this.discardCardLabel = this.add.text(0, 0, "", {
            fontFamily: "Arial",
            fontSize: "22px",
            color: "#17352b"
        }).setOrigin(0.5);
        this.discardCard = this.add.container(TABLE_CENTER_X, 392, [this.discardCardFace, this.discardCardLabel]).setVisible(false);
    }

    private createHandSlots(
        startX: number,
        startY: number,
        gapX: number,
        gapY: number,
        angle: number
    ): CardSlot[] {
        const slots: CardSlot[] = [];

        for (let i = 0; i < 5; i += 1) {
            const face = this.add.rectangle(0, 0, 60, 88, 0xf7efe0, 0.95).setStrokeStyle(2, 0x17352b);
            const label = this.add.text(0, 0, "CARD", {
                fontFamily: "Arial",
                fontSize: "14px",
                color: "#17352b"
            }).setOrigin(0.5);
            const container = this.add.container(startX + gapX * i, startY + gapY * i, [face, label]).setAngle(angle);

            slots.push({
                container,
                originX: startX + gapX * i,
                originY: startY + gapY * i,
                originAngle: angle,
                face
            });
        }

        return slots;
    }

    private syncSnapshot(snapshot: RewriteGameSnapshot): void {
        this.deckText.setText(String(snapshot.context.deckCount) + " cards");
        this.discardText.setText(String(snapshot.context.discardCount) + " cards");

        this.updateSeatLabels(snapshot);
        this.updateHandSlots(snapshot);
        this.updateDiscard(snapshot);
    }

    private updateSeatLabels(snapshot: RewriteGameSnapshot): void {
        snapshot.context.players.forEach((player, index) => {
            const label = this.seatLabels.get(player.id);
            if (!label) {
                return;
            }

            const isCurrentPlayer = snapshot.matches("playerTurn") && index === snapshot.context.turnIndex;
            label.setText(
                (isCurrentPlayer ? "> " : "") +
                    player.name +
                    " (" +
                    player.handCount +
                    " cards)"
            );
            label.setColor(isCurrentPlayer ? "#ffd166" : "#f6ecd2");
        });
    }

    private updateHandSlots(snapshot: RewriteGameSnapshot): void {
        snapshot.context.players.forEach((player, index) => {
            const slots = this.handSlots.get(player.id) || [];
            const isCurrentPlayer = snapshot.matches("playerTurn") && index === snapshot.context.turnIndex;

            for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
                const slot = slots[slotIndex];
                if (!snapshot.matches("animatingPlay")) {
                    slot.container.setPosition(slot.originX, slot.originY);
                    slot.container.setAngle(slot.originAngle);
                    slot.container.setAlpha(1);
                }

                slot.container.setVisible(slotIndex < player.handCount);
                slot.face.setStrokeStyle(2, isCurrentPlayer ? 0xffd166 : 0x17352b);
            }
        });
    }

    private updateDiscard(snapshot: RewriteGameSnapshot): void {
        const card = snapshot.context.lastPlayedCard;
        if (!card || snapshot.matches("animatingPlay")) {
            this.discardCard.setVisible(false);
            return;
        }

        this.discardCardLabel.setText(card.label);
        this.discardCardFace.setStrokeStyle(3, 0xffd166);
        this.discardCard.setVisible(true);
    }

    private animatePlayedCard(snapshot: RewriteGameSnapshot): void {
        const currentPlayer = snapshot.context.players[snapshot.context.turnIndex];
        const slots = this.handSlots.get(currentPlayer.id);
        if (!slots || currentPlayer.handCount <= 0 || !snapshot.context.lastPlayedCard) {
            this.actor.send({ type: "ANIMATION_DONE" });
            return;
        }

        const animationKey =
            snapshot.context.lastPlayedCard.id +
            "-" +
            snapshot.context.discardCount +
            "-" +
            currentPlayer.handCount;

        if (this.activeAnimationKey === animationKey) {
            return;
        }

        this.activeAnimationKey = animationKey;

        const slot = slots[currentPlayer.handCount - 1];
        this.discardCard.setVisible(false);

        this.tweens.add({
            targets: slot.container,
            x: TABLE_CENTER_X,
            y: 392,
            angle: 0,
            duration: 420,
            ease: "Cubic.easeInOut",
            onComplete: () => {
                this.actor.send({ type: "ANIMATION_DONE" });
            }
        });
    }

    private getSeatLabelStyle(): Phaser.Types.GameObjects.Text.TextStyle {
        return {
            fontFamily: "Arial",
            fontSize: "22px",
            color: "#f6ecd2"
        };
    }
}
