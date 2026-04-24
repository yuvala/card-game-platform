import * as Phaser from "phaser";

import type {
    CardGameActor,
    CardGameViewCard,
    CardGameViewPile,
    CardGameViewModel,
    CardGameViewModelFactory
} from "../../engine/game/viewModel";
import { REWRITE_HEIGHT, TABLE_CENTER_X, TABLE_CENTER_Y, TABLE_WIDTH } from "../layout";

const CARD_WIDTH = 60;
const CARD_HEIGHT = 88;
const DEFAULT_HAND_SLOT_COUNT = 5;
const CARD_FACE_FILL = 0xf7efe0;
const CARD_FACE_TEXT = "#17352b";
const CARD_BACK_FILL = 0x1e4d3f;
const CARD_BACK_STROKE = 0xc4b06a;
const CARD_BACK_TEXT = "#f6ecd2";

interface SeatLayout {
    labelX: number;
    labelY: number;
    handCenterX: number;
    handCenterY: number;
    gapX: number;
    gapY: number;
    angle: number;
}

interface CardSlot {
    container: Phaser.GameObjects.Container;
    hitTarget: Phaser.GameObjects.Rectangle;
    originX: number;
    originY: number;
    originAngle: number;
    face: Phaser.GameObjects.Rectangle;
    label: Phaser.GameObjects.Text;
}

export class TableScene<TSnapshot> extends Phaser.Scene {
    private readonly actor: CardGameActor<TSnapshot>;
    private readonly getViewModel: CardGameViewModelFactory<TSnapshot>;
    private subscription?: { unsubscribe(): void };
    private drawPileTitle!: Phaser.GameObjects.Text;
    private deckText!: Phaser.GameObjects.Text;
    private discardPileTitle!: Phaser.GameObjects.Text;
    private discardText!: Phaser.GameObjects.Text;
    private discardCard!: Phaser.GameObjects.Container;
    private discardCardFace!: Phaser.GameObjects.Rectangle;
    private discardCardLabel!: Phaser.GameObjects.Text;
    private seatLabels = new Map<string, Phaser.GameObjects.Text>();
    private handSlots = new Map<string, CardSlot[]>();
    private activeAnimationKey = "";
    private seatLayoutKey = "";

    constructor(actor: CardGameActor<TSnapshot>, getViewModel: CardGameViewModelFactory<TSnapshot>) {
        super("rewrite-table");
        this.actor = actor;
        this.getViewModel = getViewModel;
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

        this.createPiles();

        this.subscription = this.actor.subscribe((snapshot) => {
            const viewModel = this.getViewModel(snapshot);
            this.syncViewModel(viewModel);
            if (viewModel.animation) {
                this.animatePlayedCard(viewModel);
            } else {
                this.activeAnimationKey = "";
            }
        });

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.subscription?.unsubscribe();
            this.subscription = undefined;
        });

        this.syncViewModel(this.getViewModel(this.actor.getSnapshot()));
    }

    private createPiles(): void {
        const pileStyle = {
            fontFamily: "Arial",
            fontSize: "18px",
            color: "#f6ecd2"
        };

        this.add.rectangle(TABLE_CENTER_X, 184, 132, 176, 0x13372b, 0.75).setStrokeStyle(3, 0xffd166, 0.25);
        this.drawPileTitle = this.add.text(TABLE_CENTER_X, 120, "Draw Pile", pileStyle).setOrigin(0.5, 0.5);
        this.deckText = this.add.text(TABLE_CENTER_X, 184, "", {
            ...pileStyle,
            fontSize: "24px"
        }).setOrigin(0.5);

        this.add.rectangle(TABLE_CENTER_X, 392, 132, 176, 0x35261a, 0.75).setStrokeStyle(3, 0xffd166, 0.25);
        this.discardPileTitle = this.add.text(TABLE_CENTER_X, 318, "Discard", pileStyle).setOrigin(0.5, 0.5);
        this.discardText = this.add.text(TABLE_CENTER_X, 474, "", pileStyle).setOrigin(0.5);

        this.discardCardFace = this.add.rectangle(0, 0, 76, 108, CARD_FACE_FILL, 1).setStrokeStyle(3, 0x17352b);
        this.discardCardLabel = this.add.text(0, 0, "", {
            fontFamily: "Arial",
            fontSize: "22px",
            color: CARD_FACE_TEXT
        }).setOrigin(0.5);
        this.discardCard = this.add.container(TABLE_CENTER_X, 392, [this.discardCardFace, this.discardCardLabel]).setVisible(false);
    }

    private createHandSlots(
        playerId: string,
        layout: SeatLayout,
        slotCount: number
    ): CardSlot[] {
        const slots: CardSlot[] = [];
        const startX = layout.handCenterX - (layout.gapX * (slotCount - 1)) / 2;
        const startY = layout.handCenterY - (layout.gapY * (slotCount - 1)) / 2;

        for (let i = 0; i < slotCount; i += 1) {
            const face = this.add.rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, CARD_FACE_FILL, 0.95)
                .setStrokeStyle(2, 0x17352b);
            const label = this.add.text(0, 0, "CARD", {
                fontFamily: "Arial",
                fontSize: "16px",
                color: CARD_FACE_TEXT
            }).setOrigin(0.5);
            const slotX = startX + layout.gapX * i;
            const slotY = startY + layout.gapY * i;
            const container = this.add.container(slotX, slotY, [face, label]).setAngle(layout.angle);
            const hitTarget = this.add.rectangle(
                slotX,
                slotY,
                CARD_WIDTH,
                CARD_HEIGHT,
                0x000000,
                0.001
            ).setAngle(layout.angle);

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
                originX: slotX,
                originY: slotY,
                originAngle: layout.angle,
                face,
                label
            });
        }

        return slots;
    }

    private syncViewModel(viewModel: CardGameViewModel): void {
        this.ensureSeatVisuals(viewModel);
        this.updatePileSummary(viewModel);

        this.updateSeatLabels(viewModel);
        this.updateHandSlots(viewModel);
        this.updateDiscard(viewModel);
    }

    private ensureSeatVisuals(viewModel: CardGameViewModel): void {
        const handSlotCount = Math.max(
            DEFAULT_HAND_SLOT_COUNT,
            ...viewModel.players.map((player) => player.hand.length)
        );
        const layoutKey =
            viewModel.players.map((player) => player.id).join("|") +
            "::" +
            String(handSlotCount);
        if (this.seatLayoutKey === layoutKey) {
            return;
        }

        this.destroySeatVisuals();
        const seatLayouts = this.getSeatLayouts(viewModel.players.length);

        viewModel.players.forEach((player, index) => {
            const layout = seatLayouts[index] ?? this.getFallbackSeatLayout(index, viewModel.players.length);
            const label = this.add.text(layout.labelX, layout.labelY, "", this.getSeatLabelStyle()).setOrigin(0.5, 0);

            this.seatLabels.set(player.id, label);
            this.handSlots.set(player.id, this.createHandSlots(player.id, layout, handSlotCount));
        });

        this.seatLayoutKey = layoutKey;
    }

    private destroySeatVisuals(): void {
        this.seatLabels.forEach((label) => {
            label.destroy();
        });
        this.seatLabels.clear();

        this.handSlots.forEach((slots) => {
            slots.forEach((slot) => {
                slot.container.destroy(true);
                slot.hitTarget.destroy();
            });
        });
        this.handSlots.clear();
        this.seatLayoutKey = "";
    }

    private getSeatLayouts(playerCount: number): SeatLayout[] {
        const layouts = this.getTemplateSeatLayouts(playerCount);
        if (layouts.length > 0) {
            return layouts;
        }

        return Array.from({ length: playerCount }, (_, index) => this.getFallbackSeatLayout(index, playerCount));
    }

    private getTemplateSeatLayouts(playerCount: number): SeatLayout[] {
        switch (playerCount) {
            case 0:
                return [];
            case 1:
                return [this.createBottomSeat(TABLE_CENTER_X)];
            case 2:
                return [
                    this.createBottomSeat(TABLE_CENTER_X),
                    this.createHorizontalSeat(TABLE_CENTER_X, 24, 78, 60)
                ];
            case 3:
                return [
                    this.createBottomSeat(TABLE_CENTER_X),
                    this.createVerticalSeat("right", 150, 366, 56),
                    this.createVerticalSeat("left", 150, 366, 56)
                ];
            case 4:
                return [
                    this.createBottomSeat(TABLE_CENTER_X),
                    this.createVerticalSeat("right", 150, 366, 56),
                    this.createHorizontalSeat(TABLE_CENTER_X, 24, 78, 60),
                    this.createVerticalSeat("left", 150, 366, 56)
                ];
            case 5:
                return [
                    this.createBottomSeat(TABLE_CENTER_X),
                    this.createVerticalSeat("right", 150, 366, 56),
                    this.createHorizontalSeat(TABLE_WIDTH - 256, 56, 112, 52),
                    this.createHorizontalSeat(256, 56, 112, 52),
                    this.createVerticalSeat("left", 150, 366, 56)
                ];
            case 6:
                return [
                    this.createBottomSeat(TABLE_CENTER_X),
                    this.createVerticalSeat("right", 298, 446, 32),
                    this.createVerticalSeat("right", 46, 206, 32),
                    this.createHorizontalSeat(TABLE_CENTER_X, 24, 78, 60),
                    this.createVerticalSeat("left", 46, 206, 32),
                    this.createVerticalSeat("left", 298, 446, 32)
                ];
            default:
                return [];
        }
    }

    private getFallbackSeatLayout(playerIndex: number, playerCount: number): SeatLayout {
        if (playerIndex === 0) {
            return this.createBottomSeat(TABLE_CENTER_X);
        }

        const upperSeatCount = Math.max(playerCount - 1, 1);
        const progress = upperSeatCount === 1 ? 0.5 : (playerIndex - 1) / (upperSeatCount - 1);
        const angleDegrees = 215 + progress * 110;
        const angleRadians = Phaser.Math.DegToRad(angleDegrees);
        const seatX = TABLE_CENTER_X + Math.cos(angleRadians) * 300;
        const seatY = TABLE_CENTER_Y + Math.sin(angleRadians) * 210;

        if (Math.abs(seatX - TABLE_CENTER_X) < 92) {
            return this.createHorizontalSeat(
                Phaser.Math.Clamp(seatX, 240, TABLE_WIDTH - 240),
                40,
                94,
                54
            );
        }

        if (seatX < TABLE_CENTER_X) {
            return this.createVerticalSeat(
                "left",
                Phaser.Math.Clamp(seatY - 130, 40, 310),
                Phaser.Math.Clamp(seatY + 30, 180, 460),
                36
            );
        }

        return this.createVerticalSeat(
            "right",
            Phaser.Math.Clamp(seatY - 130, 40, 310),
            Phaser.Math.Clamp(seatY + 30, 180, 460),
            36
        );
    }

    private createBottomSeat(centerX: number): SeatLayout {
        return {
            labelX: centerX,
            labelY: REWRITE_HEIGHT - 148,
            handCenterX: centerX,
            handCenterY: 606,
            gapX: 74,
            gapY: 0,
            angle: 0
        };
    }

    private createHorizontalSeat(centerX: number, labelY: number, handCenterY: number, gapX: number): SeatLayout {
        return {
            labelX: centerX,
            labelY,
            handCenterX: centerX,
            handCenterY,
            gapX,
            gapY: 0,
            angle: 0
        };
    }

    private createVerticalSeat(
        side: "left" | "right",
        labelY: number,
        handCenterY: number,
        gapY: number
    ): SeatLayout {
        const isRight = side === "right";

        return {
            labelX: isRight ? TABLE_WIDTH - 150 : 150,
            labelY,
            handCenterX: isRight ? TABLE_WIDTH - 120 : 120,
            handCenterY,
            gapX: 0,
            gapY,
            angle: isRight ? 90 : -90
        };
    }

    private updateSeatLabels(viewModel: CardGameViewModel): void {
        viewModel.players.forEach((player) => {
            const label = this.seatLabels.get(player.id);
            if (!label) {
                return;
            }

            label.setText(player.seatLabel);
            label.setColor(player.isCurrentTurn || player.isRoundWinner ? "#ffd166" : "#f6ecd2");
        });
    }

    private updateHandSlots(viewModel: CardGameViewModel): void {
        viewModel.players.forEach((player) => {
            const slots = this.handSlots.get(player.id) || [];
            const visibleCardCount = player.hand.length;
            const baseStartX = slots[0]?.originX ?? 0;
            const baseStartY = slots[0]?.originY ?? 0;
            const baseGapX = slots.length > 1 ? slots[1].originX - slots[0].originX : 0;
            const baseGapY = slots.length > 1 ? slots[1].originY - slots[0].originY : 0;
            let layoutStartX = baseStartX;
            let layoutStartY = baseStartY;
            let layoutGapX = baseGapX;
            let layoutGapY = baseGapY;

            if (player.isCurrentTurn && visibleCardCount > 1) {
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
                const isSelected = viewModel.selectedCardId === card?.id;
                const isHovered = slot.container.getData("isHovered") === true;
                if (!viewModel.animation) {
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
                if (!card || !player.canInteract) {
                    slot.container.setData("isHovered", false);
                }
                const slotScale = isSelected ? 1.05 : (isHovered ? 1.06 : 1);
                const slotDepth = isSelected ? 30 + slotIndex : (isHovered ? 20 + slotIndex : slotIndex);
                slot.container.setScale(slotScale);
                slot.hitTarget.setScale(slotScale);
                slot.container.setDepth(slotDepth);
                slot.hitTarget.setDepth(slotDepth + 0.5);
                if (slot.hitTarget.input) {
                    slot.hitTarget.input.enabled = Boolean(card && player.canInteract);
                }
                slot.face.setStrokeStyle(
                    3,
                    isSelected ? 0xffd166 : (isHovered && player.isCurrentTurn ? 0xd4f0a7 : (player.isCurrentTurn ? 0x9dc08b : 0x17352b))
                );
                this.applyCardVisual(slot.face, slot.label, card ?? null);
                if (card && !card.isFaceUp) {
                    slot.face.setStrokeStyle(
                        3,
                        isSelected ? 0xffd166 : (isHovered ? 0xd4f0a7 : CARD_BACK_STROKE)
                    );
                }
            }
        });
    }

    private updateDiscard(viewModel: CardGameViewModel): void {
        const discardPile = this.getPile(viewModel, "discard");
        const discardCard = discardPile?.topCard ?? null;

        if (!discardCard) {
            this.discardCard.setVisible(false);
            return;
        }

        this.applyCardVisual(this.discardCardFace, this.discardCardLabel, discardCard);
        this.discardCardFace.setStrokeStyle(3, discardCard.isFaceUp ? 0xffd166 : CARD_BACK_STROKE);
        this.discardCard.setVisible(true);
    }

    private animatePlayedCard(viewModel: CardGameViewModel): void {
        const animation = viewModel.animation;
        if (!animation) {
            return;
        }

        const currentPlayer = viewModel.players.find((player) => player.id === animation.playerId);
        const slots = this.handSlots.get(animation.playerId);
        if (!slots || !currentPlayer || currentPlayer.hand.length <= 0) {
            this.actor.send({ type: "ANIMATION_DONE" });
            return;
        }

        const animationKey = animation.key;

        if (this.activeAnimationKey === animationKey) {
            return;
        }

        this.activeAnimationKey = animationKey;

        const selectedSlotIndex = currentPlayer.hand.findIndex((card) => {
            return card.id === animation.cardId;
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

    private updatePileSummary(viewModel: CardGameViewModel): void {
        const drawPile = this.getPile(viewModel, "draw");
        const discardPile = this.getPile(viewModel, "discard");

        this.drawPileTitle.setText(drawPile?.label ?? "Draw Pile");
        this.deckText.setText(drawPile?.countLabel ?? viewModel.drawPileLabel);

        this.discardPileTitle.setText(discardPile?.label ?? "Discard");
        this.discardText.setText(discardPile?.countLabel ?? viewModel.discardPileLabel);
    }

    private getPile(viewModel: CardGameViewModel, role: string): CardGameViewPile | null {
        return viewModel.piles.find((pile) => pile.role === role) ?? null;
    }

    private applyCardVisual(
        face: Phaser.GameObjects.Rectangle,
        label: Phaser.GameObjects.Text,
        card: CardGameViewCard | null
    ): void {
        if (!card) {
            face.setFillStyle(CARD_FACE_FILL, 0.95);
            face.setStrokeStyle(2, 0x17352b);
            label.setText("");
            label.setColor(CARD_FACE_TEXT);
            return;
        }

        if (card.isFaceUp) {
            face.setFillStyle(CARD_FACE_FILL, 0.95);
            label.setText(card.label);
            label.setColor(CARD_FACE_TEXT);
            return;
        }

        face.setFillStyle(CARD_BACK_FILL, 0.98);
        label.setText("CARD");
        label.setColor(CARD_BACK_TEXT);
    }
}
