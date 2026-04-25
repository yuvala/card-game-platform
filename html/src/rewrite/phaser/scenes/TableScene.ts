import * as Phaser from "phaser";

import { supportedDeckDefinitions } from "../../engine/cards/deckDefinitions";
import { getCardSkinById } from "../../engine/cards/skinPacks";
import type {
    CardGameActor,
    CardGameViewCard,
    CardGameViewPile,
    CardGameViewTableCard,
    CardGameViewModel,
    CardGameViewModelFactory
} from "../../engine/game/viewModel";
import {
    ensureDeckTextures,
    getCardBackTextureKey,
    getCardFaceTextureKey
} from "../cards/CardTextureFactory";
import { TABLE_CENTER_X, TABLE_WIDTH } from "../layout";
import {
    CARD_HEIGHT,
    CARD_WIDTH,
    DEFAULT_HAND_SLOT_COUNT,
    HOVER_CARD_SCALE,
    SELECTED_CARD_SCALE
} from "./layout/constants";
import { createSeatBadge, type SeatBadge } from "./factories/createSeatBadge";
import { createTableCardVisual, type TableCardVisual } from "./factories/createTableCardVisual";
import { getSeatLayouts } from "./layout/seatLayouts";
import type { SeatLayout } from "./layout/types";
import { syncHandPresentation, type HandSlotVisual } from "./presenters/handPresenter";
import {
    createOwnedPileVisual,
    createPrimaryPileVisuals,
    createSupplementalPileVisual,
    syncOwnedPilePresentation,
    syncPrimaryPilePresentation,
    syncSupplementalPilePresentation,
    type OwnedPileVisual,
    type PrimaryPileVisuals,
    type SupplementalPileVisual
} from "./presenters/pilePresenter";
import { runPlayedCardAnimation, syncTableCardPresentation } from "./presenters/tableCardPresenter";

interface CardDisplaySize {
    width: number;
    height: number;
}

export class TableScene<TSnapshot> extends Phaser.Scene {
    private readonly actor: CardGameActor<TSnapshot>;
    private readonly getViewModel: CardGameViewModelFactory<TSnapshot>;
    private subscription?: { unsubscribe(): void };
    private primaryPileVisuals!: PrimaryPileVisuals;
    private seatBadges = new Map<string, SeatBadge>();
    private handSlots = new Map<string, HandSlotVisual[]>();
    private ownedPileVisuals = new Map<string, OwnedPileVisual>();
    private supplementalPileVisuals = new Map<string, SupplementalPileVisual>();
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
        this.primaryPileVisuals = createPrimaryPileVisuals(this);
    }

    private createHandSlots(
        playerId: string,
        layout: SeatLayout,
        slotCount: number
    ): HandSlotVisual[] {
        const slots: HandSlotVisual[] = [];
        const startX = layout.handCenterX - (layout.gapX * (slotCount - 1)) / 2;
        const startY = layout.handCenterY - (layout.gapY * (slotCount - 1)) / 2;

        for (let i = 0; i < slotCount; i += 1) {
            const image = this.add.image(0, 0, this.getActiveBackTextureKey())
                .setDisplaySize(CARD_WIDTH, CARD_HEIGHT);
            image.setData("cardDisplaySize", {
                width: CARD_WIDTH,
                height: CARD_HEIGHT
            } satisfies CardDisplaySize);
            const outline = this.add.rectangle(0, 0, CARD_WIDTH + 8, CARD_HEIGHT + 8, 0x000000, 0)
                .setStrokeStyle(1, 0x17352b, 0.28);
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
        syncPrimaryPilePresentation({
            playerCount: viewModel.players.length,
            viewModel,
            visuals: this.primaryPileVisuals,
            textureApi: {
                getActiveBackTextureKey: () => this.getActiveBackTextureKey(),
                applyCardTexture: (image, card, variant) => this.applyCardTexture(image, card, variant),
                applyCardBackTexture: (image) => this.applyCardBackTexture(image),
                setCardDisplaySize: (image, width, height) => this.setCardDisplaySize(image, width, height)
            }
        });

        this.updateSeatLabels(viewModel);
        syncHandPresentation({
            viewModel,
            handSlots: this.handSlots,
            textureApi: {
                applyCardTexture: (image, card, variant) => this.applyCardTexture(image, card, variant)
            }
        });
        syncOwnedPilePresentation({
            viewModel,
            seatBadges: this.seatBadges,
            handSlots: this.handSlots,
            ownedPileVisuals: this.ownedPileVisuals,
            createOwnedPileVisual: (pileId) => {
                const visual = createOwnedPileVisual(this, pileId, () => this.getActiveBackTextureKey());
                this.ownedPileVisuals.set(pileId, visual);
                return visual;
            },
            textureApi: {
                applyCardTexture: (image, card, variant) => this.applyCardTexture(image, card, variant),
                applyCardBackTexture: (image) => this.applyCardBackTexture(image)
            }
        });
        syncSupplementalPilePresentation({
            viewModel,
            supplementalPileVisuals: this.supplementalPileVisuals,
            createSupplementalPileVisual: (pileId) => {
                const visual = createSupplementalPileVisual(this, pileId, () => this.getActiveBackTextureKey());
                this.supplementalPileVisuals.set(pileId, visual);
                return visual;
            },
            textureApi: {
                applyCardTexture: (image, card, variant) => this.applyCardTexture(image, card, variant),
                applyCardBackTexture: (image) => this.applyCardBackTexture(image)
            }
        });
        this.activeTableCardFlipKey = syncTableCardPresentation({
            scene: this,
            viewModel,
            tableCardVisuals: this.tableCardVisuals,
            createTableCardVisual: () => createTableCardVisual(this, this.getActiveBackTextureKey()),
            activeTableCardFlipKey: this.activeTableCardFlipKey,
            textureApi: {
                applyCardTexture: (image, card, variant) => this.applyCardTexture(image, card, variant),
                applyCardBackTexture: (image) => this.applyCardBackTexture(image)
            }
        });
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
        const seatLayouts = getSeatLayouts(viewModel.players.length);

        viewModel.players.forEach((player, index) => {
            const layout = seatLayouts[index];
            const badge = createSeatBadge(this, layout);

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

    private animatePlayedCard(viewModel: CardGameViewModel): void {
        this.activeAnimationKey = runPlayedCardAnimation({
            scene: this,
            viewModel,
            handSlots: this.handSlots,
            discardCard: this.primaryPileVisuals.discardCard,
            activeAnimationKey: this.activeAnimationKey,
            onAnimationDone: () => {
                this.actor.send({ type: "ANIMATION_DONE" });
            }
        });
    }

    private setCardDisplaySize(image: Phaser.GameObjects.Image, width: number, height: number): void {
        image.setDisplaySize(width, height);
        image.setData("cardDisplaySize", {
            width,
            height
        } satisfies CardDisplaySize);
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

}
