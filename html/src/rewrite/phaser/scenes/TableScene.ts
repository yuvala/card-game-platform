import * as Phaser from "phaser";

import type { RewriteGameActor, RewriteGameSnapshot } from "../../games/drawPoker/machine";
import { REWRITE_HEIGHT, TABLE_CENTER_X, TABLE_CENTER_Y, TABLE_WIDTH } from "../layout";

const CARD_WIDTH = 60;
const CARD_HEIGHT = 88;

interface CardSlot {
    container: Phaser.GameObjects.Container;
    hitTarget: Phaser.GameObjects.Rectangle;
    originX: number;
    originY: number;
    originAngle: number;
    face: Phaser.GameObjects.Rectangle;
    label: Phaser.GameObjects.Text;
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
        this.handSlots.set("p1", this.createHandSlots("p1", TABLE_CENTER_X - 146, 606, 74, 0, 0));
        this.handSlots.set("p2", this.createHandSlots("p2", TABLE_WIDTH - 120, 254, 0, 56, 90));
        this.handSlots.set("p3", this.createHandSlots("p3", 120, 254, 0, 56, -90));
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
        playerId: string,
        startX: number,
        startY: number,
        gapX: number,
        gapY: number,
        angle: number
    ): CardSlot[] {
        const slots: CardSlot[] = [];

        for (let i = 0; i < 5; i += 1) {
            const face = this.add.rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, 0xf7efe0, 0.95)
                .setStrokeStyle(2, 0x17352b);
            const label = this.add.text(0, 0, "CARD", {
                fontFamily: "Arial",
                fontSize: "16px",
                color: "#17352b"
            }).setOrigin(0.5);
            const container = this.add.container(startX + gapX * i, startY + gapY * i, [face, label]).setAngle(angle);
            const hitTarget = this.add.rectangle(
                startX + gapX * i,
                startY + gapY * i,
                CARD_WIDTH,
                CARD_HEIGHT,
                0x000000,
                0.001
            ).setAngle(angle);

            hitTarget.setInteractive({ useHandCursor: true });
            if (hitTarget.input) {
                hitTarget.input.enabled = false;
            }
            hitTarget.on(Phaser.Input.Events.POINTER_DOWN, () => {
                if (!hitTarget.input?.enabled) {
                    return;
                }

                const cardId = container.getData("cardId");
                if (typeof cardId === "string") {
                    this.actor.send({ type: "SELECT_CARD", cardId });
                }
            });
            hitTarget.on(Phaser.Input.Events.POINTER_OVER, () => {
                if (hitTarget.input?.enabled) {
                    container.setData("isHovered", true);
                    const isSelected = container.getData("isSelected") === true;
                    const scale = isSelected ? 1.08 : 1.06;
                    container.setScale(scale);
                    hitTarget.setScale(scale);
                }
            });
            hitTarget.on(Phaser.Input.Events.POINTER_OUT, () => {
                container.setData("isHovered", false);
                if (!hitTarget.input?.enabled) {
                    container.setScale(1);
                    hitTarget.setScale(1);
                    return;
                }

                const isSelected = container.getData("isSelected") === true;
                const scale = isSelected ? 1.05 : 1;
                container.setScale(scale);
                hitTarget.setScale(scale);
            });

            slots.push({
                container,
                hitTarget,
                originX: startX + gapX * i,
                originY: startY + gapY * i,
                originAngle: angle,
                face,
                label
            });
        }

        return slots;
    }

    private syncSnapshot(snapshot: RewriteGameSnapshot): void {
        this.deckText.setText(String(snapshot.context.drawPile.length) + " cards");
        this.discardText.setText(String(snapshot.context.discardPile.length) + " cards");

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
            const isRoundWinner = snapshot.context.winningPlayerIds.includes(player.id);
            label.setText(
                (isCurrentPlayer ? "> " : "") +
                    player.name +
                    " (" +
                    player.hand.length +
                    " cards, " +
                    player.score +
                    " pts)"
            );
            label.setColor(isCurrentPlayer || isRoundWinner ? "#ffd166" : "#f6ecd2");
        });
    }

    private updateHandSlots(snapshot: RewriteGameSnapshot): void {
        snapshot.context.players.forEach((player, index) => {
            const slots = this.handSlots.get(player.id) || [];
            const isCurrentPlayer = snapshot.matches("playerTurn") && index === snapshot.context.turnIndex;
            const visibleCardCount = player.hand.length;
            const baseStartX = slots[0]?.originX ?? 0;
            const baseStartY = slots[0]?.originY ?? 0;
            const baseGapX = slots.length > 1 ? slots[1].originX - slots[0].originX : 0;
            const baseGapY = slots.length > 1 ? slots[1].originY - slots[0].originY : 0;
            let layoutStartX = baseStartX;
            let layoutStartY = baseStartY;
            let layoutGapX = baseGapX;
            let layoutGapY = baseGapY;

            if (isCurrentPlayer && visibleCardCount > 1) {
                if (layoutGapX !== 0 && Math.abs(layoutGapX) < 74) {
                    layoutGapX = Math.sign(layoutGapX) * 74;
                }

                if (layoutGapY !== 0 && Math.abs(layoutGapY) < 92) {
                    layoutGapY = Math.sign(layoutGapY) * 92;
                }

                if (layoutGapX !== 0) {
                    layoutStartX = TABLE_CENTER_X - ((visibleCardCount - 1) * layoutGapX) / 2;
                }

                if (layoutGapY !== 0) {
                    layoutStartY = TABLE_CENTER_Y - ((visibleCardCount - 1) * layoutGapY) / 2;
                }
            }

            for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
                const slot = slots[slotIndex];
                const card = player.hand[slotIndex];
                const isSelected = snapshot.context.selectedCardId === card?.id;
                const isHovered = slot.container.getData("isHovered") === true;
                if (!snapshot.matches("animatingPlay")) {
                    const selectedOffsetX = slot.originAngle === 0 ? 0 : (slot.originAngle > 0 ? -14 : 14);
                    const selectedOffsetY = slot.originAngle === 0 ? -18 : 0;
                    const hoverOffsetX = !isSelected && isHovered ? (slot.originAngle > 0 ? -10 : (slot.originAngle < 0 ? 10 : 0)) : 0;
                    const hoverOffsetY = !isSelected && isHovered ? (slot.originAngle === 0 ? -14 : 0) : 0;
                    const slotX = layoutStartX + layoutGapX * slotIndex + (isSelected ? selectedOffsetX : hoverOffsetX);
                    const slotY = layoutStartY + layoutGapY * slotIndex + (isSelected ? selectedOffsetY : hoverOffsetY);
                    slot.container.setPosition(slotX, slotY);
                    slot.hitTarget.setPosition(slotX, slotY);
                    slot.container.setAngle(slot.originAngle);
                    slot.hitTarget.setAngle(slot.originAngle);
                    slot.container.setAlpha(1);
                }

                slot.container.setVisible(Boolean(card));
                slot.hitTarget.setVisible(Boolean(card));
                slot.container.setData("cardId", card?.id ?? null);
                slot.container.setData("isSelected", isSelected);
                if (!card || !isCurrentPlayer || !snapshot.matches("playerTurn")) {
                    slot.container.setData("isHovered", false);
                }
                const slotScale = isSelected ? 1.05 : (isHovered ? 1.06 : 1);
                const slotDepth = isSelected ? 30 + slotIndex : (isHovered ? 20 + slotIndex : slotIndex);
                slot.container.setScale(slotScale);
                slot.hitTarget.setScale(slotScale);
                slot.container.setDepth(slotDepth);
                slot.hitTarget.setDepth(slotDepth + 0.5);
                if (slot.hitTarget.input) {
                    slot.hitTarget.input.enabled = Boolean(card && isCurrentPlayer && snapshot.matches("playerTurn"));
                }
                slot.face.setStrokeStyle(
                    3,
                    isSelected ? 0xffd166 : (isHovered && isCurrentPlayer ? 0xd4f0a7 : (isCurrentPlayer ? 0x9dc08b : 0x17352b))
                );
                slot.label.setText(card?.displayLabel ?? "");
            }
        });
    }

    private updateDiscard(snapshot: RewriteGameSnapshot): void {
        const card = snapshot.context.lastPlayedCard;
        if (!card || snapshot.matches("animatingPlay")) {
            this.discardCard.setVisible(false);
            return;
        }

        this.discardCardLabel.setText(card.card.displayLabel);
        this.discardCardFace.setStrokeStyle(3, 0xffd166);
        this.discardCard.setVisible(true);
    }

    private animatePlayedCard(snapshot: RewriteGameSnapshot): void {
        const currentPlayer = snapshot.context.players[snapshot.context.turnIndex];
        const slots = this.handSlots.get(currentPlayer.id);
        if (!slots || currentPlayer.hand.length <= 0 || !snapshot.context.lastPlayedCard) {
            this.actor.send({ type: "ANIMATION_DONE" });
            return;
        }

        const animationKey =
            snapshot.context.lastPlayedCard.id +
            "-" +
            snapshot.context.discardPile.length +
            "-" +
            currentPlayer.hand.length;

        if (this.activeAnimationKey === animationKey) {
            return;
        }

        this.activeAnimationKey = animationKey;

        const selectedSlotIndex = currentPlayer.hand.findIndex((card) => {
            return card.id === snapshot.context.lastPlayedCard?.card.id;
        });
        const slot = slots[selectedSlotIndex];
        if (!slot) {
            this.actor.send({ type: "ANIMATION_DONE" });
            return;
        }

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
