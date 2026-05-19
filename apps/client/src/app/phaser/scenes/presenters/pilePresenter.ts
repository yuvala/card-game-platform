import * as Phaser from 'phaser';

import type {
    CardGameViewCard,
    CardGameViewModel,
    CardGameViewPile,
    CardGameViewTableCard,
} from '@engine/engine/game/viewModel';
import { TABLE_CENTER_X, TABLE_CENTER_Y } from '../../layout';
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
    TABLE_CREAM,
    TABLE_CREAM_DIM,
    TABLE_FONT_FAMILY,
    TABLE_GOLD,
    TABLE_TEXT_RESOLUTION,
} from '../layout/constants';
import {
    getOwnedPilePosition,
    getPrimaryPileLayout,
    getSupplementalPilePosition,
} from '../layout/pileLayouts';
import type { SeatLayout } from '../layout/types';

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
    stackBacks: Phaser.GameObjects.Image[];
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
    drawCard: Phaser.GameObjects.Container;
    drawCardImage: Phaser.GameObjects.Image;
    drawCardOutline: Phaser.GameObjects.Rectangle;
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
        variant: 'compact' | 'showcase',
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
    seatLayouts: Map<string, SeatLayout>;
    ownedPileVisuals: Map<string, OwnedPileVisual>;
    createOwnedPileVisual: (pileId: string) => OwnedPileVisual;
    textureApi: Pick<CardTextureApi, 'applyCardTexture' | 'applyCardBackTexture'>;
}

interface SupplementalPilePresentationInput {
    viewModel: CardGameViewModel;
    supplementalPileVisuals: Map<string, SupplementalPileVisual>;
    createSupplementalPileVisual: (pileId: string) => SupplementalPileVisual;
    textureApi: Pick<CardTextureApi, 'applyCardTexture' | 'applyCardBackTexture'>;
}

function setCardImageDisplaySize(
    image: Phaser.GameObjects.Image,
    width: number,
    height: number,
): void {
    image.setDisplaySize(width, height);
    image.setData('cardDisplaySize', {
        width,
        height,
    } satisfies CardDisplaySize);
}

function getOwnedPileOwner(viewModel: CardGameViewModel, ownerId: string): OwnedPileOwner | null {
    return viewModel.players.find((player) => player.id === ownerId) ?? null;
}

function getPrimaryPile(viewModel: CardGameViewModel): CardGameViewPile | null {
    return (
        viewModel.piles.find((pile) => {
            return !pile.ownerId && (pile.role === 'draw' || pile.role === 'stock');
        }) ?? null
    );
}

function getSecondaryPile(viewModel: CardGameViewModel): CardGameViewPile | null {
    return (
        viewModel.piles.find((pile) => {
            return !pile.ownerId && (pile.role === 'discard' || pile.role === 'trump');
        }) ?? null
    );
}

function getPilePresentation(
    pile: CardGameViewPile,
): NonNullable<CardGameViewPile['presentation']> {
    if (pile.presentation) {
        return pile.presentation;
    }

    if (pile.ownerId || pile.role === 'capture') {
        return 'capture-pile';
    }

    if (pile.role === 'draw' || pile.role === 'stock') {
        return 'hidden-stack';
    }

    if (pile.role === 'trump') {
        return 'single-card';
    }

    return 'face-up-stack';
}

function syncPileSummary(viewModel: CardGameViewModel, visuals: PrimaryPileVisuals): void {
    const primaryPile = getPrimaryPile(viewModel);
    const secondaryPile = getSecondaryPile(viewModel);
    const showTrumpWithDrawPile = secondaryPile?.role === 'trump';
    const showSecondaryTitle = !(
        viewModel.tableCards.length > 0 && secondaryPile?.role === 'discard'
    );
    const showPrimaryPile =
        Boolean(primaryPile && primaryPile.cardCount > 0) || viewModel.drawPileLabel.length > 0;
    const showSecondaryPile =
        !showTrumpWithDrawPile && (Boolean(secondaryPile) || viewModel.discardPileLabel.length > 0);

    visuals.drawPileTitle.setText(primaryPile?.label ?? 'Draw Pile');
    visuals.deckText.setText(primaryPile?.countLabel ?? viewModel.drawPileLabel);
    visuals.drawPileFrame.setVisible(showPrimaryPile && !showTrumpWithDrawPile);
    visuals.drawPileTitle.setVisible(showPrimaryPile && !showTrumpWithDrawPile);
    visuals.deckText.setVisible(showPrimaryPile);

    visuals.discardPileTitle.setText(secondaryPile?.label ?? 'Discard');
    visuals.discardPileFrame.setVisible(showSecondaryPile);
    visuals.discardPileTitle.setVisible(showSecondaryTitle && showSecondaryPile);
    visuals.discardText.setText(secondaryPile?.countLabel ?? viewModel.discardPileLabel);
    visuals.discardText.setVisible(showSecondaryPile);
}

function syncDrawPileCard(
    viewModel: CardGameViewModel,
    visuals: PrimaryPileVisuals,
    textureApi: Pick<CardTextureApi, 'applyCardBackTexture'>,
): void {
    const primaryPile = getPrimaryPile(viewModel);
    const showDrawDeck = Boolean(primaryPile && primaryPile.cardCount > 0);

    if (!showDrawDeck) {
        visuals.drawCard.setVisible(false);
        return;
    }

    textureApi.applyCardBackTexture(visuals.drawCardImage);
    visuals.drawCardOutline.setStrokeStyle(2, CARD_BACK_STROKE, 0.9);
    visuals.drawCard.setVisible(true);
}

function syncDiscardPileCard(
    viewModel: CardGameViewModel,
    visuals: PrimaryPileVisuals,
    textureApi: Pick<CardTextureApi, 'applyCardTexture' | 'applyCardBackTexture'>,
): void {
    const secondaryPile = getSecondaryPile(viewModel);
    if (!secondaryPile) {
        visuals.discardCard.setVisible(false);
        return;
    }

    if (viewModel.tableCards.length > 0 && secondaryPile.role === 'discard') {
        visuals.discardCard.setVisible(false);
        return;
    }

    if (!secondaryPile.topCard && secondaryPile.cardCount <= 0) {
        visuals.discardCard.setVisible(false);
        return;
    }

    if (secondaryPile.topCard) {
        textureApi.applyCardTexture(visuals.discardCardImage, secondaryPile.topCard, 'showcase');
        if (
            secondaryPile.role === 'trump' ||
            getPilePresentation(secondaryPile) === 'single-card'
        ) {
            visuals.discardCardOutline.setVisible(false);
        } else {
            visuals.discardCardOutline
                .setVisible(true)
                .setStrokeStyle(3, secondaryPile.topCard.isFaceUp ? 0xffd166 : CARD_BACK_STROKE);
        }
    } else {
        textureApi.applyCardBackTexture(visuals.discardCardImage);
        visuals.discardCardOutline.setVisible(true).setStrokeStyle(3, CARD_BACK_STROKE);
    }

    visuals.discardCard.setVisible(true);
}

export function createPrimaryPileVisuals(scene: Phaser.Scene): PrimaryPileVisuals {
    const pileStyle = {
        fontFamily: TABLE_FONT_FAMILY,
        fontSize: '18px',
        color: TABLE_CREAM,
    };

    const drawPileFrame = scene.add
        .rectangle(
            TABLE_CENTER_X,
            184,
            PRIMARY_PILE_FRAME_WIDTH,
            PRIMARY_PILE_FRAME_HEIGHT,
            0x13372b,
            0.75,
        )
        .setStrokeStyle(3, TABLE_GOLD, 0.25);
    const drawPileTitle = scene.add
        .text(TABLE_CENTER_X, 120, 'Draw Pile', pileStyle)
        .setOrigin(0.5, 0.5)
        .setResolution(TABLE_TEXT_RESOLUTION);
    const deckText = scene.add
        .text(TABLE_CENTER_X, 184, '', {
            ...pileStyle,
            fontSize: '24px',
        })
        .setOrigin(0.5)
        .setResolution(TABLE_TEXT_RESOLUTION);
    const drawCardImage = scene.add.image(0, 0, '__MISSING');
    setCardImageDisplaySize(drawCardImage, DISCARD_CARD_WIDTH, DISCARD_CARD_HEIGHT);
    const drawCardOutline = scene.add
        .rectangle(0, 0, DISCARD_CARD_WIDTH + 4, DISCARD_CARD_HEIGHT + 4, 0x000000, 0)
        .setStrokeStyle(2, CARD_BACK_STROKE, 0.9);
    const drawCard = scene.add
        .container(TABLE_CENTER_X, 184, [drawCardImage, drawCardOutline])
        .setDepth(62)
        .setVisible(false);

    const discardPileFrame = scene.add
        .rectangle(
            TABLE_CENTER_X,
            392,
            PRIMARY_PILE_FRAME_WIDTH,
            PRIMARY_PILE_FRAME_HEIGHT,
            0x35261a,
            0.75,
        )
        .setStrokeStyle(3, TABLE_GOLD, 0.25);
    const discardPileTitle = scene.add
        .text(TABLE_CENTER_X, 318, 'Discard', pileStyle)
        .setOrigin(0.5, 0.5)
        .setResolution(TABLE_TEXT_RESOLUTION);
    const discardText = scene.add
        .text(TABLE_CENTER_X, 474, '', pileStyle)
        .setOrigin(0.5)
        .setResolution(TABLE_TEXT_RESOLUTION);

    const discardCardImage = scene.add.image(0, 0, '__MISSING');
    setCardImageDisplaySize(discardCardImage, DISCARD_CARD_WIDTH, DISCARD_CARD_HEIGHT);
    const discardCardOutline = scene.add
        .rectangle(0, 0, DISCARD_CARD_WIDTH + 4, DISCARD_CARD_HEIGHT + 4, 0x000000, 0)
        .setStrokeStyle(2, TABLE_GOLD, 0.9);
    const discardCard = scene.add
        .container(TABLE_CENTER_X, 392, [discardCardImage, discardCardOutline])
        .setVisible(false);

    return {
        drawPileFrame,
        drawPileTitle,
        drawCard,
        drawCardImage,
        drawCardOutline,
        deckText,
        discardPileFrame,
        discardPileTitle,
        discardText,
        discardCard,
        discardCardImage,
        discardCardOutline,
    };
}

export function createOwnedPileVisual(
    scene: Phaser.Scene,
    pileId: string,
    getActiveBackTextureKey: () => string,
): OwnedPileVisual {
    const stackBacks = [
        { x: -7, y: -5, angle: -7 },
        { x: 5, y: -4, angle: 5 },
        { x: -3, y: 5, angle: -3 },
    ].map((offset) => {
        const back = scene.add
            .image(offset.x, offset.y, getActiveBackTextureKey())
            .setDisplaySize(OWNED_PILE_CARD_WIDTH, OWNED_PILE_CARD_HEIGHT)
            .setAlpha(0.8)
            .setAngle(offset.angle);
        back.setData('cardDisplaySize', {
            width: OWNED_PILE_CARD_WIDTH,
            height: OWNED_PILE_CARD_HEIGHT,
        } satisfies CardDisplaySize);
        return back;
    });
    const stackBack = stackBacks[0];
    const image = scene.add
        .image(0, 0, getActiveBackTextureKey())
        .setDisplaySize(OWNED_PILE_CARD_WIDTH, OWNED_PILE_CARD_HEIGHT);
    image.setData('cardDisplaySize', {
        width: OWNED_PILE_CARD_WIDTH,
        height: OWNED_PILE_CARD_HEIGHT,
    } satisfies CardDisplaySize);
    const outline = scene.add
        .rectangle(0, 0, OWNED_PILE_CARD_WIDTH + 4, OWNED_PILE_CARD_HEIGHT + 4, 0x000000, 0)
        .setStrokeStyle(2, CARD_BACK_STROKE, 0.9);
    const labelText = scene.add
        .text(0, -42, '', {
            fontFamily: TABLE_FONT_FAMILY,
            fontSize: '11px',
            color: TABLE_CREAM,
            fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setResolution(TABLE_TEXT_RESOLUTION);
    const countText = scene.add
        .text(0, 44, '', {
            fontFamily: TABLE_FONT_FAMILY,
            fontSize: '11px',
            color: 'rgba(255,209,102,0.86)',
        })
        .setOrigin(0.5)
        .setResolution(TABLE_TEXT_RESOLUTION);
    const container = scene.add
        .container(0, 0, [labelText, ...stackBacks, image, outline, countText])
        .setDepth(65);

    container.setData('pileId', pileId);

    return {
        container,
        stackBack,
        stackBacks,
        image,
        outline,
        labelText,
        countText,
    };
}

export function createSupplementalPileVisual(
    scene: Phaser.Scene,
    pileId: string,
    getActiveBackTextureKey: () => string,
): SupplementalPileVisual {
    const image = scene.add
        .image(0, 0, getActiveBackTextureKey())
        .setDisplaySize(SUPPLEMENTAL_PILE_CARD_WIDTH, SUPPLEMENTAL_PILE_CARD_HEIGHT);
    image.setData('cardDisplaySize', {
        width: SUPPLEMENTAL_PILE_CARD_WIDTH,
        height: SUPPLEMENTAL_PILE_CARD_HEIGHT,
    } satisfies CardDisplaySize);
    const outline = scene.add
        .rectangle(
            0,
            0,
            SUPPLEMENTAL_PILE_CARD_WIDTH + 4,
            SUPPLEMENTAL_PILE_CARD_HEIGHT + 4,
            0x000000,
            0,
        )
        .setStrokeStyle(2, CARD_BACK_STROKE, 0.9);
    const labelText = scene.add
        .text(0, -48, '', {
            fontFamily: TABLE_FONT_FAMILY,
            fontSize: '12px',
            color: TABLE_CREAM_DIM,
            fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setResolution(TABLE_TEXT_RESOLUTION);
    const countText = scene.add
        .text(0, 52, '', {
            fontFamily: TABLE_FONT_FAMILY,
            fontSize: '12px',
            color: 'rgba(255,209,102,0.86)',
        })
        .setOrigin(0.5)
        .setResolution(TABLE_TEXT_RESOLUTION);
    const container = scene.add
        .container(0, 0, [labelText, image, outline, countText])
        .setDepth(62);

    container.setData('pileId', pileId);

    return {
        container,
        image,
        outline,
        labelText,
        countText,
    };
}

export function syncPrimaryPilePresentation(input: PrimaryPilePresentationInput): void {
    const { playerCount, viewModel, visuals, textureApi } = input;
    const layout = getPrimaryPileLayout(playerCount);
    const secondaryPile = getSecondaryPile(viewModel);
    const showTrumpWithDrawPile = secondaryPile?.role === 'trump';
    const drawCenterY =
        showTrumpWithDrawPile || !secondaryPile ? TABLE_CENTER_Y : layout.drawCenterY;

    visuals.drawPileFrame
        .setPosition(TABLE_CENTER_X, drawCenterY)
        .setSize(layout.frameWidth, layout.frameHeight);
    visuals.drawPileTitle
        .setPosition(TABLE_CENTER_X, drawCenterY - layout.drawTitleOffsetY)
        .setFontSize(`${layout.titleFontSize}px`);
    visuals.deckText
        .setPosition(TABLE_CENTER_X, drawCenterY + layout.discardTextOffsetY)
        .setFontSize(
            `${showTrumpWithDrawPile ? Math.round(layout.deckCountFontSize * 0.5) : layout.deckCountFontSize}px`,
        );
    visuals.drawCard.setPosition(TABLE_CENTER_X, drawCenterY);
    visuals.drawCard.setDepth(showTrumpWithDrawPile ? 62 : 60);
    textureApi.setCardDisplaySize(
        visuals.drawCardImage,
        layout.discardCardWidth,
        layout.discardCardHeight,
    );
    visuals.drawCardOutline.setSize(layout.discardCardWidth + 4, layout.discardCardHeight + 4);

    const discardCenterY = showTrumpWithDrawPile ? drawCenterY : layout.discardCenterY;
    const discardCenterX = showTrumpWithDrawPile
        ? TABLE_CENTER_X - Math.round(layout.discardCardHeight * 0.34)
        : TABLE_CENTER_X;
    visuals.discardPileFrame
        .setPosition(discardCenterX, discardCenterY)
        .setSize(layout.frameWidth, layout.frameHeight);
    visuals.discardPileTitle
        .setPosition(discardCenterX, discardCenterY - layout.discardTitleOffsetY)
        .setFontSize(`${layout.titleFontSize}px`);
    visuals.discardText
        .setPosition(discardCenterX, discardCenterY + layout.discardTextOffsetY)
        .setFontSize(`${layout.countFontSize}px`);
    visuals.discardCard
        .setPosition(discardCenterX, discardCenterY)
        .setAngle(showTrumpWithDrawPile ? 90 : 0)
        .setDepth(showTrumpWithDrawPile ? 58 : 60);
    textureApi.setCardDisplaySize(
        visuals.discardCardImage,
        layout.discardCardWidth,
        layout.discardCardHeight,
    );
    visuals.discardCardOutline.setSize(layout.discardCardWidth + 4, layout.discardCardHeight + 4);

    syncPileSummary(viewModel, visuals);
    syncDrawPileCard(viewModel, visuals, textureApi);
    syncDiscardPileCard(viewModel, visuals, textureApi);
}

export function syncOwnedPilePresentation(input: OwnedPilePresentationInput): void {
    const {
        viewModel,
        seatBadges,
        seatLayouts,
        ownedPileVisuals,
        createOwnedPileVisual,
        textureApi,
    } = input;

    const ownedPiles = viewModel.piles.filter((pile) => {
        return Boolean(pile.ownerId);
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

        const layout = seatLayouts.get(ownerId);
        if (!layout) {
            return;
        }
        const position = getOwnedPilePosition(ownerPileIndex, layout);
        visual.container.setPosition(position.x, position.y);
        visual.labelText.setText('');
        visual.countText.setText(pile.countLabel);
        visual.container.setVisible(true);
        const presentation = getPilePresentation(pile);
        const visibleStackBackCount =
            presentation !== 'single-card' && pile.cardCount > 1
                ? Math.min(visual.stackBacks.length, pile.cardCount - 1)
                : 0;
        visual.stackBacks.forEach((stackBack, index) => {
            textureApi.applyCardBackTexture(stackBack);
            stackBack.setVisible(index < visibleStackBackCount);
            stackBack.setAlpha(index < visibleStackBackCount ? 0.86 - index * 0.12 : 0);
        });

        if (pile.topCard) {
            textureApi.applyCardBackTexture(visual.image);
            visual.image.setAlpha(1);
            visual.image.setVisible(true);
            visual.outline.setVisible(false);
            visual.outline.setAlpha(0);
        } else {
            const shouldShowEmptyStack = pile.cardCount > 0 || presentation === 'hidden-stack';
            textureApi.applyCardBackTexture(visual.image);
            visual.image.setVisible(shouldShowEmptyStack);
            visual.image.setAlpha(shouldShowEmptyStack ? 0.96 : 0);
            visual.outline.setVisible(false);
            visual.outline.setAlpha(0);
        }
    });
}

export function syncSupplementalPilePresentation(input: SupplementalPilePresentationInput): void {
    const { viewModel, supplementalPileVisuals, createSupplementalPileVisual, textureApi } = input;

    const primaryPile = getPrimaryPile(viewModel);
    const secondaryPile = getSecondaryPile(viewModel);
    const supplementalPiles = viewModel.piles.filter((pile) => {
        return !pile.ownerId && pile.id !== primaryPile?.id && pile.id !== secondaryPile?.id;
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
        const visual =
            supplementalPileVisuals.get(pile.id) ?? createSupplementalPileVisual(pile.id);
        const position = getSupplementalPilePosition(index);

        visual.container.setPosition(position.x, position.y);
        visual.labelText.setText(pile.label);
        visual.countText.setText(pile.countLabel);
        visual.container.setVisible(true);
        const presentation = getPilePresentation(pile);

        if (pile.topCard) {
            textureApi.applyCardTexture(visual.image, pile.topCard, 'compact');
            visual.outline.setStrokeStyle(
                2,
                pile.topCard.isFaceUp ? 0xffd166 : CARD_BACK_STROKE,
                0.9,
            );
            visual.image.setAlpha(1);
        } else {
            textureApi.applyCardBackTexture(visual.image);
            visual.outline.setStrokeStyle(2, pile.cardCount > 0 ? CARD_BACK_STROKE : 0x355449, 0.9);
            visual.image.setAlpha(
                pile.cardCount > 0 || presentation === 'hidden-stack' ? 0.96 : 0.32,
            );
        }
    });
}
