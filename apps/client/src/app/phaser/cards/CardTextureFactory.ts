import type Phaser from 'phaser';

import { createDeck } from '@engine/engine/cards/createDeck';
import { frenchDeckDefinition } from '@engine/engine/cards/deckDefinitions';
import type { CardInstance, DeckDefinition } from '@engine/engine/cards/types';
import type {
    CardSkinDefinition,
    CardSuitAppearance,
    SuitEmblemKind,
} from '@engine/engine/cards/skinPacks';

const FRENCH_SUIT_FILE: Record<string, string> = {
    hearts: 'heart',
    spades: 'spade',
    diamonds: 'diamond',
    clubs: 'club',
};

const FRENCH_RANK_FILE: Record<string, string> = {
    ace: '1',
};

export function preloadFrenchCardTextures(scene: Phaser.Scene, skinId: string): void {
    const backKey = getCardBackTextureKey('french', skinId);
    if (!scene.textures.exists(backKey)) {
        scene.load.image(backKey, '/assets/cards/french/back.png');
    }

    createDeck(frenchDeckDefinition).forEach((card) => {
        const dashAfterDeckId = card.id.indexOf('-');
        const rest = card.id.slice(dashAfterDeckId + 1);
        const secondDash = rest.indexOf('-');
        const rankId = rest.slice(0, secondDash);
        const suitId = rest.slice(secondDash + 1);
        const fileRank = FRENCH_RANK_FILE[rankId] ?? rankId;
        const fileSuit = FRENCH_SUIT_FILE[suitId];
        const path = `/assets/cards/french/${fileSuit}_${fileRank}.png`;

        FACE_VARIANTS.forEach((variant) => {
            const key = getCardFaceTextureKey(card.id, skinId, variant);
            if (!scene.textures.exists(key)) {
                scene.load.image(key, path);
            }
        });
    });
}

const TEXTURE_WIDTH = 180;
const TEXTURE_HEIGHT = 264;
const TEXTURE_SCALE = 3;
const CANVAS_TEXTURE_WIDTH = TEXTURE_WIDTH * TEXTURE_SCALE;
const CANVAS_TEXTURE_HEIGHT = TEXTURE_HEIGHT * TEXTURE_SCALE;
const TEXTURE_VERSION = 'v4';
const CORNER_RADIUS = 18;
const FACE_VARIANTS = ['compact', 'showcase'] as const;

export type CardTextureVariant = (typeof FACE_VARIANTS)[number];

export function getCardFaceTextureKey(
    cardId: string,
    skinId: string,
    variant: CardTextureVariant = 'showcase',
): string {
    return 'rewrite-card-face:' + TEXTURE_VERSION + ':' + skinId + ':' + variant + ':' + cardId;
}

export function getCardBackTextureKey(deckId: string, skinId: string): string {
    return 'rewrite-card-back:' + TEXTURE_VERSION + ':' + skinId + ':' + deckId;
}

export function ensureDeckTextures(
    scene: Phaser.Scene,
    deckDefinition: DeckDefinition,
    skin: CardSkinDefinition,
): void {
    const backTextureKey = getCardBackTextureKey(deckDefinition.id, skin.id);
    if (!scene.textures.exists(backTextureKey)) {
        const texture = scene.textures.createCanvas(
            backTextureKey,
            CANVAS_TEXTURE_WIDTH,
            CANVAS_TEXTURE_HEIGHT,
        );
        if (texture) {
            drawCardBack(texture.getContext(), deckDefinition, skin);
            texture.refresh();
        }
    }

    createDeck(deckDefinition).forEach((card) => {
        FACE_VARIANTS.forEach((variant) => {
            const textureKey = getCardFaceTextureKey(card.id, skin.id, variant);
            if (scene.textures.exists(textureKey)) {
                return;
            }

            const texture = scene.textures.createCanvas(
                textureKey,
                CANVAS_TEXTURE_WIDTH,
                CANVAS_TEXTURE_HEIGHT,
            );
            if (!texture) {
                return;
            }

            drawCardFace(texture.getContext(), card, deckDefinition, skin, variant);
            texture.refresh();
        });
    });
}

function drawCardFace(
    context: CanvasRenderingContext2D,
    card: CardInstance,
    deckDefinition: DeckDefinition,
    skin: CardSkinDefinition,
    variant: CardTextureVariant,
): void {
    const suitAppearance = skin.getSuitAppearance(deckDefinition.id, card.suitId);

    clearCanvas(context);
    drawCardShadow(context);
    drawCardSurface(context, skin, variant);
    drawCornerIndex(context, 24, 18, card.rankShortLabel, suitAppearance, skin, variant, false);
    drawCornerIndex(
        context,
        TEXTURE_WIDTH - 24,
        TEXTURE_HEIGHT - 20,
        card.rankShortLabel,
        suitAppearance,
        skin,
        variant,
        true,
    );

    if (variant === 'compact') {
        drawCompactCenterPanel(context, suitAppearance, skin);
        return;
    }

    drawShowcaseCenterPanel(context, card, suitAppearance, skin);
}

function drawCardBack(
    context: CanvasRenderingContext2D,
    deckDefinition: DeckDefinition,
    skin: CardSkinDefinition,
): void {
    clearCanvas(context);
    drawCardShadow(context);
    drawRoundedRect(
        context,
        2,
        2,
        TEXTURE_WIDTH - 4,
        TEXTURE_HEIGHT - 4,
        CORNER_RADIUS,
        skin.backBase,
    );

    context.save();
    context.strokeStyle = skin.backAccent;
    context.lineWidth = 4;
    context.strokeRect(16, 16, TEXTURE_WIDTH - 32, TEXTURE_HEIGHT - 32);
    context.strokeStyle = skin.backLine;
    context.lineWidth = 2;
    context.strokeRect(26, 26, TEXTURE_WIDTH - 52, TEXTURE_HEIGHT - 52);

    context.translate(TEXTURE_WIDTH / 2, TEXTURE_HEIGHT / 2);
    for (let index = 0; index < 8; index += 1) {
        context.save();
        context.rotate((Math.PI / 4) * index);
        context.strokeStyle = index % 2 === 0 ? skin.backAccent : skin.backLine;
        context.lineWidth = index % 2 === 0 ? 2 : 1.5;
        context.beginPath();
        context.moveTo(0, -74);
        context.lineTo(0, -26);
        context.stroke();
        context.restore();
    }

    context.fillStyle = skin.backAccent;
    context.beginPath();
    context.arc(0, 0, 42, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = skin.backBase;
    context.beginPath();
    context.arc(0, 0, 30, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = '#f7f1de';
    context.font = '700 20px Georgia';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(deckDefinition.name.toUpperCase(), 0, 0, 124);
    context.restore();
}

function clearCanvas(context: CanvasRenderingContext2D): void {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, CANVAS_TEXTURE_WIDTH, CANVAS_TEXTURE_HEIGHT);
    context.scale(TEXTURE_SCALE, TEXTURE_SCALE);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
}

function drawCardShadow(context: CanvasRenderingContext2D): void {
    context.save();
    drawRoundedRect(
        context,
        10,
        12,
        TEXTURE_WIDTH - 18,
        TEXTURE_HEIGHT - 18,
        CORNER_RADIUS,
        'rgba(12, 10, 8, 0.18)',
    );
    context.restore();
}

function drawCardSurface(
    context: CanvasRenderingContext2D,
    skin: CardSkinDefinition,
    variant: CardTextureVariant,
): void {
    const gradient = context.createLinearGradient(0, 0, 0, TEXTURE_HEIGHT);
    gradient.addColorStop(0, '#fffaf0');
    gradient.addColorStop(0.35, skin.paperLight);
    gradient.addColorStop(1, skin.paperDark);

    drawRoundedRect(context, 2, 2, TEXTURE_WIDTH - 4, TEXTURE_HEIGHT - 4, CORNER_RADIUS, gradient);

    context.save();
    context.strokeStyle = skin.borderDark;
    context.lineWidth = 4;
    roundRectPath(context, 4, 4, TEXTURE_WIDTH - 8, TEXTURE_HEIGHT - 8, CORNER_RADIUS - 2);
    context.stroke();

    context.strokeStyle = skin.borderSoft;
    context.lineWidth = 2;
    roundRectPath(context, 12, 12, TEXTURE_WIDTH - 24, TEXTURE_HEIGHT - 24, CORNER_RADIUS - 8);
    context.stroke();

    context.strokeStyle =
        variant === 'compact' ? 'rgba(75, 54, 33, 0.03)' : 'rgba(75, 54, 33, 0.05)';
    context.lineWidth = 1;
    for (let y = 32; y < TEXTURE_HEIGHT - 32; y += variant === 'compact' ? 26 : 22) {
        context.beginPath();
        context.moveTo(18, y);
        context.lineTo(TEXTURE_WIDTH - 18, y);
        context.stroke();
    }
    context.restore();
}

function drawCornerIndex(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    rankShortLabel: string,
    suitAppearance: CardSuitAppearance,
    skin: CardSkinDefinition,
    variant: CardTextureVariant,
    isRotated: boolean,
): void {
    context.save();
    context.translate(x, y);
    if (isRotated) {
        context.rotate(Math.PI);
    }

    context.fillStyle = suitAppearance.primaryColor;
    context.font = variant === 'compact' ? '700 30px Georgia' : '700 24px Georgia';
    context.textAlign = 'center';
    context.textBaseline = 'top';
    context.fillText(rankShortLabel, 0, 0, 26);

    drawSuitEmblem(
        context,
        suitAppearance.emblem,
        0,
        variant === 'compact' ? 36 : 34,
        variant === 'compact' ? 20 : 18,
        suitAppearance,
        skin,
    );
    context.restore();
}

function drawCompactCenterPanel(
    context: CanvasRenderingContext2D,
    suitAppearance: CardSuitAppearance,
    skin: CardSkinDefinition,
): void {
    context.save();
    context.translate(TEXTURE_WIDTH / 2, TEXTURE_HEIGHT / 2);

    context.fillStyle = withAlpha(suitAppearance.secondaryColor, 0.11);
    context.beginPath();
    context.ellipse(0, -6, 48, 70, 0, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = withAlpha(suitAppearance.primaryColor, 0.24);
    context.lineWidth = 1.5;
    context.beginPath();
    context.ellipse(0, -6, 48, 70, 0, 0, Math.PI * 2);
    context.stroke();

    context.strokeStyle = withAlpha(skin.borderSoft, 0.45);
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-30, 54);
    context.lineTo(30, 54);
    context.stroke();

    drawSuitEmblem(context, suitAppearance.emblem, 0, -8, 54, suitAppearance, skin);
    context.restore();
}

// Face card rank IDs across all supported decks
const FACE_RANK_IDS = new Set([
    'jack',
    'queen',
    'king', // French
    'sota',
    'caballo',
    'rey', // Spanish
    'fante',
    'cavallo',
    're', // Italian
]);
const ACE_RANK_IDS = new Set(['ace']);

function drawShowcaseCenterPanel(
    context: CanvasRenderingContext2D,
    card: CardInstance,
    suitAppearance: CardSuitAppearance,
    skin: CardSkinDefinition,
): void {
    if (ACE_RANK_IDS.has(card.rankId)) {
        drawAceCenterPanel(context, suitAppearance, skin);
        return;
    }
    if (FACE_RANK_IDS.has(card.rankId)) {
        drawFaceCenterPanel(context, card, suitAppearance, skin);
        return;
    }

    // Number cards — oval + emblem + rank name
    context.save();
    context.translate(TEXTURE_WIDTH / 2, TEXTURE_HEIGHT / 2);

    context.fillStyle = withAlpha(suitAppearance.secondaryColor, 0.14);
    context.beginPath();
    context.ellipse(0, -12, 50, 72, 0, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = withAlpha(suitAppearance.primaryColor, 0.34);
    context.lineWidth = 1.8;
    context.beginPath();
    context.ellipse(0, -12, 50, 72, 0, 0, Math.PI * 2);
    context.stroke();

    drawSuitEmblem(context, suitAppearance.emblem, 0, -20, 44, suitAppearance, skin);

    context.fillStyle = skin.inkDark;
    context.font = '700 13px Georgia';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(card.rankLabel.toUpperCase(), 0, 50, 96);

    context.restore();
}

function drawAceCenterPanel(
    context: CanvasRenderingContext2D,
    suitAppearance: CardSuitAppearance,
    skin: CardSkinDefinition,
): void {
    const cx = TEXTURE_WIDTH / 2;
    const cy = TEXTURE_HEIGHT / 2 - 4;

    context.save();

    context.fillStyle = withAlpha(suitAppearance.secondaryColor, 0.13);
    context.beginPath();
    context.ellipse(cx, cy, 56, 76, 0, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = withAlpha(suitAppearance.primaryColor, 0.32);
    context.lineWidth = 1.5;
    context.beginPath();
    context.ellipse(cx, cy, 56, 76, 0, 0, Math.PI * 2);
    context.stroke();

    drawSuitEmblem(context, suitAppearance.emblem, cx, cy - 6, 66, suitAppearance, skin);

    context.restore();
}

function drawFaceCenterPanel(
    context: CanvasRenderingContext2D,
    card: CardInstance,
    suitAppearance: CardSuitAppearance,
    skin: CardSkinDefinition,
): void {
    const PX = 18,
        PY = 56;
    const PW = TEXTURE_WIDTH - 36; // 144
    const PH = TEXTURE_HEIGHT - 112; // 152
    const PR = 8;
    const CX = TEXTURE_WIDTH / 2;
    const CE = 15; // corner emblem size
    const CI = 19; // corner emblem inset from panel edge

    context.save();

    // Panel background
    context.fillStyle = withAlpha(suitAppearance.primaryColor, 0.1);
    roundRectPath(context, PX, PY, PW, PH, PR);
    context.fill();

    // Outer border
    context.strokeStyle = suitAppearance.primaryColor;
    context.lineWidth = 2;
    roundRectPath(context, PX, PY, PW, PH, PR);
    context.stroke();

    // Inner border
    context.strokeStyle = withAlpha(suitAppearance.primaryColor, 0.35);
    context.lineWidth = 1;
    roundRectPath(context, PX + 8, PY + 8, PW - 16, PH - 16, PR - 4);
    context.stroke();

    // Large rank letter — upper section of panel
    context.fillStyle = suitAppearance.primaryColor;
    context.font = '700 54px Georgia';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(card.rankShortLabel, CX, PY + PH * 0.36);

    // Divider
    const divY = PY + PH * 0.54;
    context.strokeStyle = withAlpha(suitAppearance.primaryColor, 0.26);
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(PX + 22, divY);
    context.lineTo(PX + PW - 22, divY);
    context.stroke();

    // Suit emblem — lower section of panel
    drawSuitEmblem(context, suitAppearance.emblem, CX, PY + PH * 0.74, 36, suitAppearance, skin);

    // Top-left corner emblem
    drawSuitEmblem(context, suitAppearance.emblem, PX + CI, PY + CI, CE, suitAppearance, skin);
    // Top-right corner emblem
    drawSuitEmblem(context, suitAppearance.emblem, PX + PW - CI, PY + CI, CE, suitAppearance, skin);

    // Bottom-left (rotated 180°)
    context.save();
    context.translate(PX + CI, PY + PH - CI);
    context.rotate(Math.PI);
    drawSuitEmblem(context, suitAppearance.emblem, 0, 0, CE, suitAppearance, skin);
    context.restore();

    // Bottom-right (rotated 180°)
    context.save();
    context.translate(PX + PW - CI, PY + PH - CI);
    context.rotate(Math.PI);
    drawSuitEmblem(context, suitAppearance.emblem, 0, 0, CE, suitAppearance, skin);
    context.restore();

    context.restore();
}

function drawSuitEmblem(
    context: CanvasRenderingContext2D,
    emblem: SuitEmblemKind,
    x: number,
    y: number,
    size: number,
    suitAppearance: CardSuitAppearance,
    skin: CardSkinDefinition,
): void {
    context.save();
    context.translate(x, y);
    context.fillStyle = suitAppearance.primaryColor;
    context.strokeStyle = suitAppearance.secondaryColor;
    context.lineWidth = Math.max(2, size * 0.08);

    switch (emblem) {
        case 'heart':
            drawHeart(context, size);
            break;
        case 'diamond':
            drawDiamond(context, size);
            break;
        case 'spade':
            drawSpade(context, size);
            break;
        case 'club':
            drawClub(context, size);
            break;
        case 'coin':
            drawCoin(context, size, suitAppearance);
            break;
        case 'cup':
            drawCup(context, size, suitAppearance, skin);
            break;
        case 'sword':
            drawSword(context, size, suitAppearance, skin);
            break;
        case 'baton':
            drawBaton(context, size, suitAppearance);
            break;
    }

    context.restore();
}

function drawHeart(context: CanvasRenderingContext2D, size: number): void {
    const s = size / 2;

    context.beginPath();
    context.moveTo(0, s);
    context.bezierCurveTo(-s * 1.2, s * 0.2, -s * 1.3, -s * 0.7, 0, -s * 0.15);
    context.bezierCurveTo(s * 1.3, -s * 0.7, s * 1.2, s * 0.2, 0, s);
    context.closePath();
    context.fill();
}

function drawDiamond(context: CanvasRenderingContext2D, size: number): void {
    const s = size / 2;

    context.beginPath();
    context.moveTo(0, -s);
    context.lineTo(s * 0.85, 0);
    context.lineTo(0, s);
    context.lineTo(-s * 0.85, 0);
    context.closePath();
    context.fill();
}

function drawSpade(context: CanvasRenderingContext2D, size: number): void {
    const s = size / 2;

    context.beginPath();
    context.moveTo(0, -s);
    context.bezierCurveTo(-s, -s * 0.2, -s * 0.9, s * 0.7, 0, s * 0.18);
    context.bezierCurveTo(s * 0.9, s * 0.7, s, -s * 0.2, 0, -s);
    context.closePath();
    context.fill();

    context.beginPath();
    context.moveTo(-s * 0.22, s * 0.14);
    context.lineTo(s * 0.22, s * 0.14);
    context.lineTo(s * 0.12, s * 0.96);
    context.lineTo(-s * 0.12, s * 0.96);
    context.closePath();
    context.fill();
}

function drawClub(context: CanvasRenderingContext2D, size: number): void {
    const s = size / 3.2;

    context.beginPath();
    context.arc(0, -s * 0.35, s, 0, Math.PI * 2);
    context.arc(-s * 0.95, s * 0.55, s, 0, Math.PI * 2);
    context.arc(s * 0.95, s * 0.55, s, 0, Math.PI * 2);
    context.fill();

    context.beginPath();
    context.moveTo(-s * 0.35, s * 0.62);
    context.lineTo(s * 0.35, s * 0.62);
    context.lineTo(s * 0.14, s * 2.25);
    context.lineTo(-s * 0.14, s * 2.25);
    context.closePath();
    context.fill();
}

function drawCoin(
    context: CanvasRenderingContext2D,
    size: number,
    suitAppearance: CardSuitAppearance,
): void {
    const radius = size / 2;

    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = suitAppearance.secondaryColor;
    context.beginPath();
    context.arc(0, 0, radius * 0.74, 0, Math.PI * 2);
    context.stroke();

    context.fillStyle = suitAppearance.secondaryColor;
    context.beginPath();
    context.arc(0, 0, radius * 0.18, 0, Math.PI * 2);
    context.fill();
}

function drawCup(
    context: CanvasRenderingContext2D,
    size: number,
    suitAppearance: CardSuitAppearance,
    skin: CardSkinDefinition,
): void {
    const s = size / 2;

    context.beginPath();
    context.moveTo(-s * 0.72, -s * 0.62);
    context.lineTo(s * 0.72, -s * 0.62);
    context.lineTo(s * 0.44, s * 0.18);
    context.lineTo(-s * 0.44, s * 0.18);
    context.closePath();
    context.fill();

    context.fillStyle = suitAppearance.secondaryColor;
    context.fillRect(-s * 0.16, s * 0.18, s * 0.32, s * 0.62);
    context.fillRect(-s * 0.58, s * 0.8, s * 1.16, s * 0.18);

    context.strokeStyle = skin.borderDark;
    context.beginPath();
    context.arc(s * 0.62, -s * 0.12, s * 0.34, -Math.PI / 2, Math.PI / 2);
    context.stroke();
}

function drawSword(
    context: CanvasRenderingContext2D,
    size: number,
    suitAppearance: CardSuitAppearance,
    skin: CardSkinDefinition,
): void {
    const s = size / 2;

    context.fillStyle = suitAppearance.secondaryColor;
    context.beginPath();
    context.moveTo(0, -s);
    context.lineTo(s * 0.24, s * 0.18);
    context.lineTo(0, s * 0.82);
    context.lineTo(-s * 0.24, s * 0.18);
    context.closePath();
    context.fill();

    context.fillStyle = suitAppearance.primaryColor;
    context.fillRect(-s * 0.1, -s * 0.2, s * 0.2, s * 1.18);
    context.fillRect(-s * 0.68, s * 0.16, s * 1.36, s * 0.16);

    context.fillStyle = skin.borderDark;
    context.fillRect(-s * 0.18, s * 0.32, s * 0.36, s * 0.38);
}

function drawBaton(
    context: CanvasRenderingContext2D,
    size: number,
    suitAppearance: CardSuitAppearance,
): void {
    const s = size / 2;

    context.rotate(-Math.PI / 5);
    context.fillStyle = suitAppearance.primaryColor;
    context.fillRect(-s * 0.18, -s, s * 0.36, s * 2);

    context.fillStyle = suitAppearance.secondaryColor;
    context.beginPath();
    context.arc(0, -s, s * 0.28, 0, Math.PI * 2);
    context.arc(0, s, s * 0.28, 0, Math.PI * 2);
    context.fill();

    context.fillRect(-s * 0.38, -s * 0.08, s * 0.76, s * 0.18);
}

function roundRectPath(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
): void {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
}

function drawRoundedRect(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fillStyle: string | CanvasGradient,
): void {
    context.save();
    roundRectPath(context, x, y, width, height, radius);
    context.fillStyle = fillStyle;
    context.fill();
    context.restore();
}

function withAlpha(hexColor: string, alpha: number): string {
    const sanitized = hexColor.replace('#', '');
    const red = Number.parseInt(sanitized.slice(0, 2), 16);
    const green = Number.parseInt(sanitized.slice(2, 4), 16);
    const blue = Number.parseInt(sanitized.slice(4, 6), 16);

    return 'rgba(' + red + ', ' + green + ', ' + blue + ', ' + alpha + ')';
}
