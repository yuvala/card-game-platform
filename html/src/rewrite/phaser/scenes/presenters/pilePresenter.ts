import * as Phaser from "phaser";

import type {
    CardGameViewCard,
    CardGameViewModel,
    CardGameViewPile,
    CardGameViewTableCard
} from "../../../engine/game/viewModel";
import { TABLE_CENTER_X, TABLE_CENTER_Y } from "../../layout";
import {
    CARD_BACK_STROKE,
    DISCARD_CARD_HEIGHT,
    DISCARD_CARD_WIDTH,
    OWNED_PILE_CARD_HEIGHT,
    OWNED_PILE_CARD_WIDTH,
    PRIMARY_PILE_FRAME_HEIGHT,
    PRIMARY_PILE_FRAME_WIDTH,
    SUPPLEMENTAL_PILE_CARD_HEIGHT,
    SUPPLEMENTAL_PILE_CARD_WIDTH,
    TABLE_TEXT_RESOLUTION
} from "../layout/constants";
import {
    getOwnedPilePosition,
    getPrimaryPileLayout,
    getSupplementalPilePosition
} from "../layout/pileLayouts";
import type { HandSlotOrigin } from "../layout/types";

interface CardDisplaySize {
    width: number;
    height: number;
}

interface SeatBadgeLike {
    container: Phaser.GameObjects.Container;
}

interface OwnedPileOwner {
    id: string;
    isRoundWinner: boolean;
}

export interface OwnedPileVisual {
    container: Phaser.GameObjects.Container;
    stackBack: Phaser.GameObjects.Image;
    image: Phaser.GameObjects.Image;
    outline: Phaser.GameObjects.Rectangle;
    labelText: Phaser.GameObjects.Text;
    countText: Phaser.GameObjects.Text;
}

export interface SupplementalPileVisual {
    container: Phaser.GameObjects.Container;
    image: Phaser.GameObjects.Image;
    outline: Phaser.GameObjects.Rectangle;
    labelText: Phaser.GameObjects.Text;
    countText: Phaser.GameObjects.Text;
}

export interface PrimaryPileVisuals {
    drawPileFrame: Phaser.GameObjects.Rectangle;
    drawPileTitle: Phaser.GameObjects.Text;
    deckText: Phaser.GameObjects.Text;
    discardPileFrame: Phaser.GameObjects.Rectangle;
    discardPileTitle: Phaser.GameObjects.Text;
    discardText: Phaser.GameObjects.Text;
    discardCard: Phaser.GameObjects.Container;
    discardCardImage: Phaser.GameObjects.Image;
    discardCardOutline: Phaser.GameObjects.Rectangle;
}

interface CardTextureApi {
    getActiveBackTextureKey(): string;
    applyCardTexture(
        image: Phaser.GameObjects.Image,
        card: CardGameViewCard | CardGameViewTableCard | null,
        variant: "compact" | "showcase"
    ): void;
    applyCardBackTexture(image: Phaser.GameObjects.Image): void;
    setCardDisplaySize(image: Phaser.GameObjects.Image, width: number, height: number): void;
}

interface PrimaryPilePresentationInput {
    playerCount: number;
    viewModel: CardGameViewModel;
    visuals: PrimaryPileVisuals;
    textureApi: CardTextureApi;
}

interface OwnedPilePresentationInput {
    viewModel: CardGameViewModel;
    seatBadges: Map<string, SeatBadgeLike>;
    handSlots: Map<string, HandSlotOrigin[]>;
    ownedPileVisuals: Map<string, OwnedPileVisual>;
    createOwnedPileVisual: (pileId: string) => OwnedPileVisual;
    textureApi: Pick<CardTextureApi, "applyCardTexture" | "applyCardBackTexture">;
}

interface SupplementalPilePresentationInput {
    viewModel: CardGameViewModel;
    supplementalPileVisuals: Map<string, SupplementalPileVisual>;
    createSupplementalPileVisual: (pileId: string) => SupplementalPileVisual;
    textureApi: Pick<CardTextureApi, "applyCardTexture" | "applyCardBackTexture">;
}

function setCardImageDisplaySize(image: Phaser.GameObjects.Image, width: number, height: number): void {
    image.setDisplaySize(width, height);
    image.setData("cardDisplaySize", {
        width,
        height
    } satisfies CardDisplaySize);
}

function getOwnedPileOwner(viewModel: CardGameViewModel, ownerId: string): OwnedPileOwner | null {
    return viewModel.players.find((player) => player.id === ownerId) ?? null;
}

function syncPileSummary(viewModel: CardGameViewModel, visuals: PrimaryPileVisuals): void {
    const primaryPile = viewModel.piles[0] ?? null;
    const secondaryPile = viewModel.piles[1] ?? null;
    const showSecondaryTitle = !(viewModel.tableCards.length > 0 && secondaryPile?.role === "discard");

    visuals.drawPileTitle.setText(primaryPile?.label ?? "Draw Pile");
    visuals.deckText.setText(primaryPile?.countLabel ?? viewModel.drawPileLabel);
    visuals.drawPileTitle.setVisible(Boolean(primaryPile) || viewModel.drawPileLabel.length > 0);
    visuals.deckText.setVisible(Boolean(primaryPile) || viewModel.drawPileLabel.length > 0);

    visuals.discardPileTitle.setText(secondaryPile?.label ?? "Discard");
    visuals.discardPileTitle.setVisible(
        showSecondaryTitle && (Boolean(secondaryPile) || viewModel.discardPileLabel.length > 0)
    );
    visuals.discardText.setText(secondaryPile?.countLabel ?? viewModel.discardPileLabel);
    visuals.discardText.setVisible(Boolean(secondaryPile) || viewModel.discardPileLabel.length > 0);
}

function syncDiscardPileCard(
    viewModel: CardGameViewModel,
    visuals: PrimaryPileVisuals,
    textureApi: Pick<CardTextureApi, "applyCardTexture" | "applyCardBackTexture">
): void {
    const secondaryPile = viewModel.piles[1] ?? null;
    if (!secondaryPile) {
        visuals.discardCard.setVisible(false);
        return;
    }

    if (viewModel.tableCards.length > 0 && secondaryPile.role === "discard") {
        visuals.discardCard.setVisible(false);
        return;
    }

    if (!secondaryPile.topCard && secondaryPile.cardCount <= 0) {
        visuals.discardCard.setVisible(false);
        return;
    }

    if (secondaryPile.topCard) {
        textureApi.applyCardTexture(visuals.discardCardImage, secondaryPile.topCard, "showcase");
        visuals.discardCardOutline.setStrokeStyle(
            3,
            secondaryPile.topCard.isFaceUp ? 0xffd166 : CARD_BACK_STROKE
        );
    } else {
        textureApi.applyCardBackTexture(visuals.discardCardImage);
        visuals.discardCardOutline.setStrokeStyle(3, CARD_BACK_STROKE);
    }

    visuals.discardCard.setVisible(true);
}

export function createPrimaryPileVisuals(scene: Phaser.Scene): PrimaryPileVisuals {
    const pileStyle = {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#f6ecd2"
    };

    const drawPileFrame = scene.add.rectangle(
        TABLE_CENTER_X,
        184,
        PRIMARY_PILE_FRAME_WIDTH,
        PRIMARY_PILE_FRAME_HEIGHT,
        0x13372b,
        0.75
    )
        .setStrokeStyle(3, 0xffd166, 0.25);
    const drawPileTitle = scene.add.text(TABLE_CENTER_X, 120, "Draw Pile", pileStyle)
        .setOrigin(0.5, 0.5)
        .setResolution(TABLE_TEXT_RESOLUTION);
    const deckText = scene.add.text(TABLE_CENTER_X, 184, "", {
        ...pileStyle,
        fontSize: "24px"
    }).setOrigin(0.5).setResolution(TABLE_TEXT_RESOLUTION);

    const discardPileFrame = scene.add.rectangle(
        TABLE_CENTER_X,
        392,
        PRIMARY_PILE_FRAME_WIDTH,
        PRIMARY_PILE_FRAME_HEIGHT,
        0x35261a,
        0.75
    )
        .setStrokeStyle(3, 0xffd166, 0.25);
    const discardPileTitle = scene.add.text(TABLE_CENTER_X, 318, "Discard", pileStyle)
        .setOrigin(0.5, 0.5)
        .setResolution(TABLE_TEXT_RESOLUTION);
    const discardText = scene.add.text(TABLE_CENTER_X, 474, "", pileStyle)
        .setOrigin(0.5)
        .setResolution(TABLE_TEXT_RESOLUTION);

    const discardCardImage = scene.add.image(0, 0, "__MISSING");
    setCardImageDisplaySize(discardCardImage, DISCARD_CARD_WIDTH, DISCARD_CARD_HEIGHT);
    const discardCardOutline = scene.add.rectangle(0, 0, DISCARD_CARD_WIDTH + 4, DISCARD_CARD_HEIGHT + 4, 0x000000, 0)
        .setStrokeStyle(2, 0xffd166, 0.9);
    const discardCard = scene.add.container(TABLE_CENTER_X, 392, [discardCardImage, discardCardOutline]).setVisible(false);

    return {
        drawPileFrame,
        drawPileTitle,
        deckText,
        discardPileFrame,
        discardPileTitle,
        discardText,
        discardCard,
        discardCardImage,
        discardCardOutline
    };
}

export function createOwnedPileVisual(
    scene: Phaser.Scene,
    pileId: string,
    getActiveBackTextureKey: () => string
): OwnedPileVisual {
    const stackBack = scene.add.image(-4, -4, getActiveBackTextureKey())
        .setDisplaySize(OWNED_PILE_CARD_WIDTH, OWNED_PILE_CARD_HEIGHT)
        .setAlpha(0.8);
    stackBack.setData("cardDisplaySize", {
        width: OWNED_PILE_CARD_WIDTH,
        height: OWNED_PILE_CARD_HEIGHT
    } satisfies CardDisplaySize);
    const image = scene.add.image(0, 0, getActiveBackTextureKey())
        .setDisplaySize(OWNED_PILE_CARD_WIDTH, OWNED_PILE_CARD_HEIGHT);
    image.setData("cardDisplaySize", {
        width: OWNED_PILE_CARD_WIDTH,
        height: OWNED_PILE_CARD_HEIGHT
    } satisfies CardDisplaySize);
    const outline = scene.add.rectangle(0, 0, OWNED_PILE_CARD_WIDTH + 4, OWNED_PILE_CARD_HEIGHT + 4, 0x000000, 0)
        .setStrokeStyle(2, CARD_BACK_STROKE, 0.9);
    const labelText = scene.add.text(0, -42, "", {
        fontFamily: "Arial",
        fontSize: "11px",
        color: "rgba(246,236,210,0.84)"
    }).setOrigin(0.5).setResolution(TABLE_TEXT_RESOLUTION);
    const countText = scene.add.text(0, 44, "", {
        fontFamily: "Arial",
        fontSize: "11px",
        color: "rgba(255,209,102,0.86)"
    }).setOrigin(0.5).setResolution(TABLE_TEXT_RESOLUTION);
    const container = scene.add.container(0, 0, [labelText, stackBack, image, outline, countText]).setDepth(65);

    container.setData("pileId", pileId);

    return {
        container,
        stackBack,
        image,
        outline,
        labelText,
        countText
    };
}

export function createSupplementalPileVisual(
    scene: Phaser.Scene,
    pileId: string,
    getActiveBackTextureKey: () => string
): SupplementalPileVisual {
    const image = scene.add.image(0, 0, getActiveBackTextureKey())
        .setDisplaySize(SUPPLEMENTAL_PILE_CARD_WIDTH, SUPPLEMENTAL_PILE_CARD_HEIGHT);
    image.setData("cardDisplaySize", {
        width: SUPPLEMENTAL_PILE_CARD_WIDTH,
        height: SUPPLEMENTAL_PILE_CARD_HEIGHT
    } satisfies CardDisplaySize);
    const outline = scene.add.rectangle(
        0,
        0,
        SUPPLEMENTAL_PILE_CARD_WIDTH + 4,
        SUPPLEMENTAL_PILE_CARD_HEIGHT + 4,
        0x000000,
        0
    ).setStrokeStyle(2, CARD_BACK_STROKE, 0.9);
    const labelText = scene.add.text(0, -48, "", {
        fontFamily: "Arial",
        fontSize: "12px",
        color: "rgba(246,236,210,0.86)"
    }).setOrigin(0.5).setResolution(TABLE_TEXT_RESOLUTION);
    const countText = scene.add.text(0, 52, "", {
        fontFamily: "Arial",
        fontSize: "12px",
        color: "rgba(255,209,102,0.86)"
    }).setOrigin(0.5).setResolution(TABLE_TEXT_RESOLUTION);
    const container = scene.add.container(0, 0, [labelText, image, outline, countText]).setDepth(62);

    container.setData("pileId", pileId);

    return {
        container,
        image,
        outline,
        labelText,
        countText
    };
}

export function syncPrimaryPilePresentation(input: PrimaryPilePresentationInput): void {
    const { playerCount, viewModel, visuals, textureApi } = input;
    const layout = getPrimaryPileLayout(playerCount);

    visuals.drawPileFrame
        .setPosition(TABLE_CENTER_X, layout.drawCenterY)
        .setSize(layout.frameWidth, layout.frameHeight);
    visuals.drawPileTitle
        .setPosition(TABLE_CENTER_X, layout.drawCenterY - layout.drawTitleOffsetY)
        .setFontSize(`${layout.titleFontSize}px`);
    visuals.deckText
        .setPosition(TABLE_CENTER_X, layout.drawCenterY)
        .setFontSize(`${layout.deckCountFontSize}px`);

    visuals.discardPileFrame
        .setPosition(TABLE_CENTER_X, layout.discardCenterY)
        .setSize(layout.frameWidth, layout.frameHeight);
    visuals.discardPileTitle
        .setPosition(TABLE_CENTER_X, layout.discardCenterY - layout.discardTitleOffsetY)
        .setFontSize(`${layout.titleFontSize}px`);
    visuals.discardText
        .setPosition(TABLE_CENTER_X, layout.discardCenterY + layout.discardTextOffsetY)
        .setFontSize(`${layout.countFontSize}px`);
    visuals.discardCard.setPosition(TABLE_CENTER_X, layout.discardCenterY);
    textureApi.setCardDisplaySize(visuals.discardCardImage, layout.discardCardWidth, layout.discardCardHeight);
    visuals.discardCardOutline.setSize(layout.discardCardWidth + 4, layout.discardCardHeight + 4);

    syncPileSummary(viewModel, visuals);
    syncDiscardPileCard(viewModel, visuals, textureApi);
}

export function syncOwnedPilePresentation(input: OwnedPilePresentationInput): void {
    const {
        viewModel,
        seatBadges,
        handSlots,
        ownedPileVisuals,
        createOwnedPileVisual,
        textureApi
    } = input;

    const ownedPiles = viewModel.piles.filter((pile, index) => {
        return index >= 2 && Boolean(pile.ownerId);
    });
    const ownedPileIds = new Set(ownedPiles.map((pile) => pile.id));

    ownedPileVisuals.forEach((visual, pileId) => {
        if (ownedPileIds.has(pileId)) {
            return;
        }

        visual.container.destroy(true);
        ownedPileVisuals.delete(pileId);
    });

    const ownerCounts = new Map<string, number>();

    ownedPiles.forEach((pile) => {
        const ownerId = pile.ownerId;
        if (!ownerId) {
            return;
        }

        const badge = seatBadges.get(ownerId);
        const owner = getOwnedPileOwner(viewModel, ownerId);
        if (!badge) {
            return;
        }

        const visual = ownedPileVisuals.get(pile.id) ?? createOwnedPileVisual(pile.id);
        const ownerPileIndex = ownerCounts.get(ownerId) ?? 0;
        ownerCounts.set(ownerId, ownerPileIndex + 1);

        const position = getOwnedPilePosition(ownerPileIndex, handSlots.get(ownerId) ?? [], {
            x: badge.container.x,
            y: badge.container.y
        });
        visual.container.setPosition(position.x, position.y);
        visual.labelText.setText(pile.label);
        visual.countText.setText(pile.countLabel);
        visual.container.setVisible(true);
        textureApi.applyCardBackTexture(visual.stackBack);
        visual.stackBack.setVisible(pile.cardCount > 1);

        if (pile.topCard) {
            textureApi.applyCardTexture(visual.image, pile.topCard, "compact");
            visual.image.setAlpha(1);
            visual.stackBack.setAlpha(0.92);
            visual.outline.setStrokeStyle(
                2,
                owner?.isRoundWinner ? 0xffd166 : (pile.topCard.isFaceUp ? 0xffd166 : CARD_BACK_STROKE),
                0.9
            );
        } else {
            textureApi.applyCardBackTexture(visual.image);
            visual.image.setAlpha(pile.cardCount > 0 ? 0.96 : 0.35);
            visual.stackBack.setAlpha(pile.cardCount > 0 ? 0.78 : 0);
            visual.outline.setStrokeStyle(
                2,
                owner?.isRoundWinner ? 0xffd166 : (pile.cardCount > 0 ? CARD_BACK_STROKE : 0x355449),
                0.9
            );
        }
    });
}

export function syncSupplementalPilePresentation(input: SupplementalPilePresentationInput): void {
    const {
        viewModel,
        supplementalPileVisuals,
        createSupplementalPileVisual,
        textureApi
    } = input;

    const supplementalPiles = viewModel.piles.filter((pile, index) => {
        return index >= 2 && !pile.ownerId;
    });
    const supplementalPileIds = new Set(supplementalPiles.map((pile) => pile.id));

    supplementalPileVisuals.forEach((visual, pileId) => {
        if (supplementalPileIds.has(pileId)) {
            return;
        }

        visual.container.destroy(true);
        supplementalPileVisuals.delete(pileId);
    });

    supplementalPiles.forEach((pile, index) => {
        const visual = supplementalPileVisuals.get(pile.id) ?? createSupplementalPileVisual(pile.id);
        const position = getSupplementalPilePosition(index);

        visual.container.setPosition(position.x, position.y);
        visual.labelText.setText(pile.label);
        visual.countText.setText(pile.countLabel);
        visual.container.setVisible(true);

        if (pile.topCard) {
            textureApi.applyCardTexture(visual.image, pile.topCard, "compact");
            visual.outline.setStrokeStyle(2, pile.topCard.isFaceUp ? 0xffd166 : CARD_BACK_STROKE, 0.9);
            visual.image.setAlpha(1);
        } else {
            textureApi.applyCardBackTexture(visual.image);
            visual.outline.setStrokeStyle(2, pile.cardCount > 0 ? CARD_BACK_STROKE : 0x355449, 0.9);
            visual.image.setAlpha(pile.cardCount > 0 ? 0.96 : 0.32);
        }
    });
}
