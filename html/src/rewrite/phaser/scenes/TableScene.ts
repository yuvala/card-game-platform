import * as Phaser from "phaser";

import { supportedDeckDefinitions } from "../../engine/cards/deckDefinitions";
import { getCardSkinById } from "../../engine/cards/skinPacks";
import type {
    CardGameActor,
    CardGameViewCard,
    CardGameViewTableCard,
    CardGameViewModel,
    CardGameViewModelFactory
} from "../../engine/game/viewModel";
import {
    ensureDeckTextures,
    getCardBackTextureKey,
    getCardFaceTextureKey
} from "../cards/CardTextureFactory";
import { REWRITE_HEIGHT, TABLE_CENTER_X, TABLE_CENTER_Y, TABLE_WIDTH } from "../layout";

const CARD_WIDTH = 60;
const CARD_HEIGHT = 88;
const DISCARD_CARD_WIDTH = 76;
const DISCARD_CARD_HEIGHT = 108;
const TABLE_CARD_WIDTH = 74;
const TABLE_CARD_HEIGHT = 104;
const DEFAULT_HAND_SLOT_COUNT = 5;
const CARD_BACK_STROKE = 0xc4b06a;
const SELECTED_CARD_SCALE = 1;
const HOVER_CARD_SCALE = 1.01;
const SELECTED_CARD_LIFT_Y = -8;
const SELECTED_CARD_SHIFT_X = 5;
const HOVER_CARD_LIFT_Y = -4;
const HOVER_CARD_SHIFT_X = 3;

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
    image: Phaser.GameObjects.Image;
    outline: Phaser.GameObjects.Rectangle;
}

interface SeatBadge {
    container: Phaser.GameObjects.Container;
    iconCircle: Phaser.GameObjects.Arc;
    iconText: Phaser.GameObjects.Text;
    nameText: Phaser.GameObjects.Text;
    metaText: Phaser.GameObjects.Text;
}

interface TableCardVisual {
    container: Phaser.GameObjects.Container;
    image: Phaser.GameObjects.Image;
    outline: Phaser.GameObjects.Rectangle;
    caption: Phaser.GameObjects.Text;
}

interface CardDisplaySize {
    width: number;
    height: number;
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
    private discardCardImage!: Phaser.GameObjects.Image;
    private discardCardOutline!: Phaser.GameObjects.Rectangle;
    private seatBadges = new Map<string, SeatBadge>();
    private handSlots = new Map<string, CardSlot[]>();
    private tableCardVisuals: TableCardVisual[] = [];
    private activeAnimationKey = "";
    private activeTableCardFlipKey = "";
    private seatLayoutKey = "";
    private activeDeckId = "";
    private activeCardSkinId = "";

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

        this.discardCardImage = this.add.image(0, 0, "__MISSING")
            .setDisplaySize(DISCARD_CARD_WIDTH, DISCARD_CARD_HEIGHT);
        this.discardCardImage.setData("cardDisplaySize", {
            width: DISCARD_CARD_WIDTH,
            height: DISCARD_CARD_HEIGHT
        } satisfies CardDisplaySize);
        this.discardCardOutline = this.add.rectangle(0, 0, DISCARD_CARD_WIDTH + 4, DISCARD_CARD_HEIGHT + 4, 0x000000, 0)
            .setStrokeStyle(2, 0xffd166, 0.9);
        this.discardCard = this.add.container(TABLE_CENTER_X, 392, [this.discardCardImage, this.discardCardOutline]).setVisible(false);
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
            const image = this.add.image(0, 0, this.getActiveBackTextureKey())
                .setDisplaySize(CARD_WIDTH, CARD_HEIGHT);
            image.setData("cardDisplaySize", {
                width: CARD_WIDTH,
                height: CARD_HEIGHT
            } satisfies CardDisplaySize);
            const outline = this.add.rectangle(0, 0, CARD_WIDTH + 4, CARD_HEIGHT + 4, 0x000000, 0)
                .setStrokeStyle(2, 0x17352b, 0.72);
            const slotX = startX + layout.gapX * i;
            const slotY = startY + layout.gapY * i;
            const container = this.add.container(slotX, slotY, [image, outline]).setAngle(layout.angle);
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
                    const scale = isSelected ? SELECTED_CARD_SCALE : HOVER_CARD_SCALE;
                    container.setScale(scale);
                }
            });
            hitTarget.on(Phaser.Input.Events.POINTER_OUT, () => {
                container.setData("isHovered", false);
                if (!hitTarget.input?.enabled) {
                    container.setScale(1);
                    return;
                }

                const isSelected = container.getData("isSelected") === true;
                const scale = isSelected ? SELECTED_CARD_SCALE : 1;
                container.setScale(scale);
            });

            slots.push({
                container,
                hitTarget,
                originX: slotX,
                originY: slotY,
                originAngle: layout.angle,
                image,
                outline
            });
        }

        return slots;
    }

    private syncViewModel(viewModel: CardGameViewModel): void {
        this.ensureCardTextures(viewModel);
        this.ensureSeatVisuals(viewModel);
        this.updatePileSummary(viewModel);

        this.updateSeatLabels(viewModel);
        this.updateHandSlots(viewModel);
        this.updateTableCards(viewModel);
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
            const badge = this.createSeatBadge(layout);

            this.seatBadges.set(player.id, badge);
            this.handSlots.set(player.id, this.createHandSlots(player.id, layout, handSlotCount));
        });

        this.seatLayoutKey = layoutKey;
    }

    private destroySeatVisuals(): void {
        this.seatBadges.forEach((badge) => {
            badge.container.destroy(true);
        });
        this.seatBadges.clear();

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
            labelY: REWRITE_HEIGHT - 72,
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

    private ensureCardTextures(viewModel: CardGameViewModel): void {
        if (this.activeDeckId === viewModel.deckId && this.activeCardSkinId === viewModel.cardSkinId) {
            return;
        }

        const deckDefinition = supportedDeckDefinitions[viewModel.deckId as keyof typeof supportedDeckDefinitions];
        if (!deckDefinition) {
            return;
        }

        const skin = getCardSkinById(viewModel.cardSkinId);
        ensureDeckTextures(this, deckDefinition, skin);

        this.activeDeckId = deckDefinition.id;
        this.activeCardSkinId = skin.id;
        this.activeTableCardFlipKey = "";
    }

    private getActiveBackTextureKey(): string {
        return getCardBackTextureKey(this.activeDeckId || "french", this.activeCardSkinId || "vintage-european");
    }

    private updateSeatLabels(viewModel: CardGameViewModel): void {
        viewModel.players.forEach((player) => {
            const badge = this.seatBadges.get(player.id);
            if (!badge) {
                return;
            }

            const isHighlighted = player.isCurrentTurn || player.isRoundWinner;
            badge.iconText.setText(player.iconLabel);
            badge.nameText.setText(player.nameLabel);
            badge.metaText.setText(player.metaLabel);

            badge.iconCircle.setFillStyle(
                player.isCurrentTurn ? 0xffd166 : (player.isRoundWinner ? 0x93c47d : 0x15382c),
                0.98
            );
            badge.iconCircle.setStrokeStyle(
                2,
                player.isCurrentTurn ? 0xfff1bf : (player.isRoundWinner ? 0xc7e6b6 : 0x5d7b70),
                0.95
            );
            badge.iconText.setColor(player.isCurrentTurn ? "#10251c" : "#f6ecd2");
            badge.nameText.setColor(isHighlighted ? "#ffd166" : "#f6ecd2");
            badge.metaText.setColor(isHighlighted ? "rgba(255,209,102,0.82)" : "rgba(246,236,210,0.72)");
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
                    const selectedOffsetX = slot.originAngle === 0
                        ? 0
                        : (slot.originAngle > 0 ? -SELECTED_CARD_SHIFT_X : SELECTED_CARD_SHIFT_X);
                    const selectedOffsetY = slot.originAngle === 0 ? SELECTED_CARD_LIFT_Y : 0;
                    const hoverOffsetX = !isSelected && isHovered
                        ? (slot.originAngle > 0 ? -HOVER_CARD_SHIFT_X : (slot.originAngle < 0 ? HOVER_CARD_SHIFT_X : 0))
                        : 0;
                    const hoverOffsetY = !isSelected && isHovered
                        ? (slot.originAngle === 0 ? HOVER_CARD_LIFT_Y : 0)
                        : 0;
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
                const slotScale = isSelected ? SELECTED_CARD_SCALE : (isHovered ? HOVER_CARD_SCALE : 1);
                const slotDepth = isSelected ? 30 + slotIndex : (isHovered ? 20 + slotIndex : slotIndex);
                slot.container.setScale(slotScale);
                slot.hitTarget.setScale(1);
                slot.container.setDepth(slotDepth);
                slot.hitTarget.setDepth(slotDepth + 0.5);
                if (slot.hitTarget.input) {
                    slot.hitTarget.input.enabled = Boolean(card && player.canInteract);
                }
                slot.outline.setStrokeStyle(
                    3,
                    isSelected ? 0xffd166 : (isHovered && player.isCurrentTurn ? 0xd4f0a7 : (player.isCurrentTurn ? 0x9dc08b : 0x17352b))
                );
                this.applyCardTexture(slot.image, card ?? null, "compact");
                if (card && !card.isFaceUp) {
                    slot.outline.setStrokeStyle(
                        3,
                        isSelected ? 0xffd166 : (isHovered ? 0xd4f0a7 : CARD_BACK_STROKE)
                    );
                }
            }
        });
    }

    private updateDiscard(viewModel: CardGameViewModel): void {
        const secondaryPile = viewModel.piles[1] ?? null;
        if (!secondaryPile) {
            this.discardCard.setVisible(false);
            return;
        }

        if (viewModel.tableCards.length > 0 && secondaryPile.role === "discard") {
            this.discardCard.setVisible(false);
            return;
        }

        if (!secondaryPile.topCard && secondaryPile.cardCount <= 0) {
            this.discardCard.setVisible(false);
            return;
        }

        if (secondaryPile.topCard) {
            this.applyCardTexture(this.discardCardImage, secondaryPile.topCard, "showcase");
            this.discardCardOutline.setStrokeStyle(
                3,
                secondaryPile.topCard.isFaceUp ? 0xffd166 : CARD_BACK_STROKE
            );
        } else {
            this.applyCardBackTexture(this.discardCardImage);
            this.discardCardOutline.setStrokeStyle(3, CARD_BACK_STROKE);
        }

        this.discardCard.setVisible(true);
    }

    private updateTableCards(viewModel: CardGameViewModel): void {
        const tableCards = viewModel.tableCards;
        this.ensureTableCardVisuals(tableCards.length);

        if (tableCards.length === 0) {
            this.tableCardVisuals.forEach((visual) => {
                visual.container.setVisible(false);
            });
            this.activeTableCardFlipKey = "";
            return;
        }

        const flipKey = tableCards.map((card) => card.id).join("|");
        const shouldAnimateFlip = flipKey !== this.activeTableCardFlipKey;

        tableCards.forEach((card, index) => {
            const visual = this.tableCardVisuals[index];
            const position = this.getTableCardPosition(index, tableCards.length);
            visual.container.setPosition(position.x, position.y);
            visual.caption.setText(card.caption ?? "");
            visual.container.setVisible(true);
            visual.outline.setStrokeStyle(3, card.isFaceUp ? 0xffd166 : CARD_BACK_STROKE, 0.9);

            if (!shouldAnimateFlip) {
                visual.container.setScale(1);
                this.applyCardTexture(visual.image, card, "showcase");
                return;
            }

            this.applyCardBackTexture(visual.image);
            visual.container.setScale(1);

            this.tweens.killTweensOf(visual.container);
            this.tweens.add({
                targets: visual.container,
                scaleX: 0.08,
                duration: 110,
                delay: index * 90,
                ease: "Sine.easeIn",
                onComplete: () => {
                    this.applyCardTexture(visual.image, card, "showcase");
                    this.tweens.add({
                        targets: visual.container,
                        scaleX: 1,
                        duration: 160,
                        ease: "Sine.easeOut"
                    });
                }
            });
        });

        for (let index = tableCards.length; index < this.tableCardVisuals.length; index += 1) {
            this.tableCardVisuals[index].container.setVisible(false);
        }

        this.activeTableCardFlipKey = flipKey;
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

    private updatePileSummary(viewModel: CardGameViewModel): void {
        const primaryPile = viewModel.piles[0] ?? null;
        const secondaryPile = viewModel.piles[1] ?? null;
        const showSecondaryTitle = !(viewModel.tableCards.length > 0 && secondaryPile?.role === "discard");

        this.drawPileTitle.setText(primaryPile?.label ?? "Draw Pile");
        this.deckText.setText(primaryPile?.countLabel ?? viewModel.drawPileLabel);
        this.drawPileTitle.setVisible(Boolean(primaryPile) || viewModel.drawPileLabel.length > 0);
        this.deckText.setVisible(Boolean(primaryPile) || viewModel.drawPileLabel.length > 0);

        this.discardPileTitle.setText(secondaryPile?.label ?? "Discard");
        this.discardPileTitle.setVisible(showSecondaryTitle && (Boolean(secondaryPile) || viewModel.discardPileLabel.length > 0));
        this.discardText.setText(secondaryPile?.countLabel ?? viewModel.discardPileLabel);
        this.discardText.setVisible(Boolean(secondaryPile) || viewModel.discardPileLabel.length > 0);
    }

    private applyCardTexture(
        image: Phaser.GameObjects.Image,
        card: CardGameViewCard | CardGameViewTableCard | null,
        variant: "compact" | "showcase"
    ): void {
        if (!card || !card.isFaceUp) {
            this.applyCardBackTexture(image);
            return;
        }

        this.setImageTexturePreservingDisplaySize(
            image,
            getCardFaceTextureKey(card.id, this.activeCardSkinId, variant)
        );
    }

    private applyCardBackTexture(image: Phaser.GameObjects.Image): void {
        this.setImageTexturePreservingDisplaySize(image, this.getActiveBackTextureKey());
    }

    private setImageTexturePreservingDisplaySize(
        image: Phaser.GameObjects.Image,
        textureKey: string
    ): void {
        const displaySize = image.getData("cardDisplaySize") as CardDisplaySize | undefined;
        const displayWidth = displaySize?.width ?? image.displayWidth;
        const displayHeight = displaySize?.height ?? image.displayHeight;

        image.setTexture(textureKey);
        image.setDisplaySize(displayWidth, displayHeight);
    }

    private createSeatBadge(layout: SeatLayout): SeatBadge {
        const iconCircle = this.add.circle(-54, 16, 14, 0x15382c, 0.98)
            .setStrokeStyle(2, 0x5d7b70, 0.95);
        const iconText = this.add.text(-54, 16, "", {
            fontFamily: "Arial",
            fontSize: "12px",
            color: "#f6ecd2",
            fontStyle: "bold"
        }).setOrigin(0.5);
        const nameText = this.add.text(-30, 6, "", {
            fontFamily: "Arial",
            fontSize: "16px",
            color: "#f6ecd2"
        }).setOrigin(0, 0.5);
        const metaText = this.add.text(-30, 24, "", {
            fontFamily: "Arial",
            fontSize: "11px",
            color: "rgba(246,236,210,0.72)"
        }).setOrigin(0, 0.5);
        const container = this.add.container(layout.labelX, layout.labelY, [
            iconCircle,
            iconText,
            nameText,
            metaText
        ]);

        return {
            container,
            iconCircle,
            iconText,
            nameText,
            metaText
        };
    }

    private ensureTableCardVisuals(cardCount: number): void {
        while (this.tableCardVisuals.length < cardCount) {
            this.tableCardVisuals.push(this.createTableCardVisual());
        }
    }

    private createTableCardVisual(): TableCardVisual {
        const image = this.add.image(0, 0, this.getActiveBackTextureKey())
            .setDisplaySize(TABLE_CARD_WIDTH, TABLE_CARD_HEIGHT);
        image.setData("cardDisplaySize", {
            width: TABLE_CARD_WIDTH,
            height: TABLE_CARD_HEIGHT
        } satisfies CardDisplaySize);
        const outline = this.add.rectangle(0, 0, TABLE_CARD_WIDTH + 4, TABLE_CARD_HEIGHT + 4, 0x000000, 0)
            .setStrokeStyle(3, 0xffd166, 0.9);
        const caption = this.add.text(0, -72, "", {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#f6ecd2"
        }).setOrigin(0.5);
        const container = this.add.container(TABLE_CENTER_X, 392, [caption, image, outline]).setVisible(false).setDepth(80);

        return {
            container,
            image,
            outline,
            caption
        };
    }

    private getTableCardPosition(index: number, cardCount: number): { x: number; y: number } {
        if (cardCount <= 1) {
            return { x: TABLE_CENTER_X, y: 392 };
        }

        const spacing = 156;
        const startX = TABLE_CENTER_X - (spacing * (cardCount - 1)) / 2;

        return {
            x: startX + spacing * index,
            y: 392
        };
    }
}
