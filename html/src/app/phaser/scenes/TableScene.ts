import * as Phaser from "phaser";

import { supportedDeckDefinitions } from "@engine/engine/cards/deckDefinitions";
import { getCardSkinById } from "@engine/engine/cards/skinPacks";
import type { CardGameSession } from "@engine/engine/game/session";
import type {
    CardGameViewCard,
    CardGameViewTableCard,
    CardGameViewModel
} from "@engine/engine/game/viewModel";
import {
    ensureDeckTextures,
    getCardBackTextureKey,
    getCardFaceTextureKey
} from "../cards/CardTextureFactory";
import { TABLE_WIDTH } from "../layout";
import {
    CARD_HEIGHT,
    CARD_WIDTH,
    DEFAULT_HAND_SLOT_COUNT,
    HOVER_CARD_SCALE,
    SELECTED_CARD_SCALE,
    TABLE_FELT,
    TABLE_FELT_DARK,
    TABLE_GOLD,
    TABLE_CREAM,
    TABLE_CREAM_DIM
} from "./layout/constants";
import { createSeatBadge, type SeatBadge } from "./factories/createSeatBadge";
import { createTableCardVisual, type TableCardVisual } from "./factories/createTableCardVisual";
import { createCardAnimationLayer, type CardAnimationLayer } from "./animations/cardAnimationLayer";
import { animateRiffleShuffle } from "./animations/cardMotionAnimations";
import { playShuffleSound } from "./audio/cardSoundEffects";
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
import { runViewEffects } from "./presenters/effectPresenter";
import { runPlayedCardAnimation, syncTableCardPresentation } from "./presenters/tableCardPresenter";
import { drawDebugZoneOverlay } from "./debug/debugZoneOverlay";
import type { DebugOverlay } from "./debug/debugZoneOverlay";

interface CardDisplaySize {
    width: number;
    height: number;
}

export class TableScene<TSnapshot> extends Phaser.Scene {
    private readonly session: CardGameSession<TSnapshot>;
    private readonly viewerId: string | null;
    private subscription?: { unsubscribe(): void };
    private primaryPileVisuals!: PrimaryPileVisuals;
    private readonly seatBadges = new Map<string, SeatBadge>();
    private readonly handSlots = new Map<string, HandSlotVisual[]>();
    private readonly ownedPileVisuals = new Map<string, OwnedPileVisual>();
    private readonly supplementalPileVisuals = new Map<string, SupplementalPileVisual>();
    private readonly tableCardVisuals: TableCardVisual[] = [];
    private activeAnimationKey = "";
    private activeTableCardFlipKey = "";
    private activeEffectBatchKey = "";
    private activeShuffleAnimationKey = "";
    private shuffleAnimationLayer!: CardAnimationLayer;
    private seatLayoutKey = "";
    private activeDeckId = "";
    private activeCardSkinId = "";
    private debugOverlay?: DebugOverlay;

    constructor(session: CardGameSession<TSnapshot>, viewerId?: string | null) {
        super("rewrite-table");
        this.session = session;
        this.viewerId = viewerId ?? null;
    }

    create(): void {
        const { height } = this.scale;

        if (this.textures.exists("rewrite-table-bg")) {
            this.add.image(TABLE_WIDTH / 2, height / 2, "rewrite-table-bg")
                .setDisplaySize(TABLE_WIDTH + 60, height + 60)
                .setAlpha(0.24);
        }

        this.add.rectangle(TABLE_WIDTH / 2, height / 2, TABLE_WIDTH, height, TABLE_FELT_DARK, 0.78);
        this.add.ellipse(TABLE_WIDTH / 2, height / 2, TABLE_WIDTH * 0.76, height * 0.7, TABLE_FELT, 0.26);
        this.add.rectangle(TABLE_WIDTH / 2, height / 2, TABLE_WIDTH - 42, height - 40, TABLE_FELT, 0.28)
            .setStrokeStyle(2, TABLE_GOLD, 0.12);
        this.add.rectangle(TABLE_WIDTH / 2, height / 2, TABLE_WIDTH - 84, height - 82, 0x000000, 0)
            .setStrokeStyle(1, TABLE_GOLD, 0.08);

        this.createPiles();
        this.shuffleAnimationLayer = createCardAnimationLayer(this, 135);

        this.subscription = this.session.subscribe(() => {
            const viewModel = this.session.getViewModel(this.viewerId);
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

        this.input.keyboard?.addKey("D").on("down", () => {
            this.toggleDebugOverlay();
        });

        if (localStorage.getItem("debug-zones") === "on") {
            this.toggleDebugOverlay();
        }

        globalThis.addEventListener("debug-layer-change", () => {
            if (this.debugOverlay) {
                this.redrawDebugOverlay();
            }
        });

        this.add.text(TABLE_WIDTH / 2, height - 6, "[D] zones", {
            fontFamily: "monospace",
            fontSize: "10px",
            color: "rgba(255,255,255,0.18)"
        }).setOrigin(0.5, 1).setDepth(5000);

        this.syncViewModel(this.session.getViewModel(this.viewerId));
    }

    private toggleDebugOverlay(): void {
        if (this.debugOverlay) {
            this.debugOverlay.destroy();
            this.debugOverlay = undefined;
            localStorage.removeItem("debug-zones");
            return;
        }
        this.redrawDebugOverlay();
        localStorage.setItem("debug-zones", "on");
    }

    private redrawDebugOverlay(): void {
        this.debugOverlay?.destroy();
        this.debugOverlay = drawDebugZoneOverlay({
            scene: this,
            primaryPileVisuals: this.primaryPileVisuals,
            seatBadges: this.seatBadges,
            handSlots: this.handSlots,
            ownedPileVisuals: this.ownedPileVisuals,
            supplementalPileVisuals: this.supplementalPileVisuals,
            tableCardVisuals: this.tableCardVisuals,
            layers: {
                origins: localStorage.getItem("debug-layer-origins") === "on",
                slots: localStorage.getItem("debug-layer-slots") === "on",
                piles: localStorage.getItem("debug-layer-piles") === "on"
            }
        });
    }

    private createPiles(): void {
        this.primaryPileVisuals = createPrimaryPileVisuals(this);
    }

    private createHandSlots(
        _playerId: string,
        layout: SeatLayout,
        slotCount: number
    ): HandSlotVisual[] {
        const slots: HandSlotVisual[] = [];
        const startX = layout.handCenterX - (layout.gapX * (slotCount - 1)) / 2;
        const startY = layout.handCenterY - (layout.gapY * (slotCount - 1)) / 2;

        for (let i = 0; i < slotCount; i += 1) {
            const stackBacks = [-8, -4].map((offset) => {
                const back = this.add.image(offset, offset, this.getActiveBackTextureKey())
                    .setDisplaySize(CARD_WIDTH, CARD_HEIGHT)
                    .setVisible(false);
                back.setData("cardDisplaySize", {
                    width: CARD_WIDTH,
                    height: CARD_HEIGHT
                } satisfies CardDisplaySize);
                return back;
            });
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
            const container = this.add.container(slotX, slotY, [...stackBacks, image, outline]).setAngle(layout.angle);
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
                const cardClickAction = container.getData("cardClickAction");
                if (cardClickAction === "play") {
                    this.session.send({ type: "PLAY_CARD" });
                    return;
                }

                if (typeof cardId === "string") {
                    this.session.send({ type: "SELECT_CARD", cardId });
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
                stackBacks,
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
        this.activeEffectBatchKey = runViewEffects({
            scene: this,
            viewModel,
            primaryPileVisuals: this.primaryPileVisuals,
            tableCardVisuals: this.tableCardVisuals,
            handSlots: this.handSlots,
            ownedPileVisuals: this.ownedPileVisuals,
            activeEffectBatchKey: this.activeEffectBatchKey,
            textureApi: {
                getActiveBackTextureKey: () => this.getActiveBackTextureKey(),
                applyCardTexture: (image, card, variant) => this.applyCardTexture(image, card, variant)
            },
            onEffectsDone: () => {
                this.session.send({ type: "ANIMATION_DONE" });
            }
        });
        this.runShuffleAnimation(viewModel);
        if (this.debugOverlay) {
            this.redrawDebugOverlay();
        }
    }

    private runShuffleAnimation(viewModel: CardGameViewModel): void {
        if (viewModel.phaseLabel !== "SHUFFLING") {
            this.activeShuffleAnimationKey = "";
            return;
        }

        const shuffleAnimationKey = [
            viewModel.deckId,
            viewModel.cardSkinId,
            viewModel.roundLabel
        ].join(":");
        if (this.activeShuffleAnimationKey === shuffleAnimationKey) {
            return;
        }

        this.activeShuffleAnimationKey = shuffleAnimationKey;
        this.shuffleAnimationLayer.clear();
        playShuffleSound(this);
        animateRiffleShuffle({
            scene: this,
            animationLayer: this.shuffleAnimationLayer,
            textureKey: this.getActiveBackTextureKey(),
            center: {
                x: this.primaryPileVisuals.drawPileFrame.x,
                y: this.primaryPileVisuals.drawPileFrame.y
            },
            size: { width: CARD_WIDTH, height: CARD_HEIGHT },
            count: 10,
            depth: 135,
            onComplete: () => {
                this.shuffleAnimationLayer.clear();
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
        this.activeEffectBatchKey = "";
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
            badge.panel.setFillStyle(player.isCurrentTurn ? 0x1f2f20 : 0x071a13, player.isCurrentTurn ? 0.46 : 0.28);
            badge.panel.setStrokeStyle(1, player.isCurrentTurn ? TABLE_GOLD : 0x5d7b70, player.isCurrentTurn ? 0.28 : 0.08);
            badge.iconCircle.setStrokeStyle(
                2,
                player.isCurrentTurn ? 0xfff1bf : (player.isRoundWinner ? 0xc7e6b6 : 0x5d7b70),
                0.95
            );
            badge.iconText.setColor(player.isCurrentTurn ? "#10251c" : TABLE_CREAM);
            badge.nameText.setColor(isHighlighted ? "#ffd166" : TABLE_CREAM);
            badge.metaText.setColor(isHighlighted ? "rgba(255,209,102,0.82)" : TABLE_CREAM_DIM);
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
                this.session.send({ type: "ANIMATION_DONE" });
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
