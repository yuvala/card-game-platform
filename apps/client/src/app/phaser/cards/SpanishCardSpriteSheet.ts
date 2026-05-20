import type Phaser from 'phaser';

import { createDeck } from '@engine/engine/cards/createDeck';
import { spanishDeckDefinition } from '@engine/engine/cards/deckDefinitions';
import type { CardSkinDefinition } from '@engine/engine/cards/skinPacks';

import { getCardBackTextureKey, getCardFaceTextureKey } from './CardTextureFactory';

export const SPANISH_SHEET_KEY = 'spanish-raw-sheet';
export const SPANISH_SHEET_PATH = '/assets/cards/spanish/sheet.png';

// Sheet layout: 13 columns (ranks 1–12 + back card at col 12) × 4 rows (suits)
// No margins or gaps — cards are butted together in the source image.
const SHEET_COLS = 13; // used for cell-width calculation
const SHEET_ROWS = 4;

// Suit → row index (top = 0)
const SUIT_ROW: Record<string, number> = {
    oros: 0,
    copas: 1,
    espadas: 2,
    bastos: 3,
};

// Rank → column index. Ranks 8 and 9 (cols 7–8) are not in our 40-card deck.
const RANK_COL: Record<string, number> = {
    ace: 0,
    '2': 1,
    '3': 2,
    '4': 3,
    '5': 4,
    '6': 5,
    '7': 6,
    sota: 9,
    caballo: 10,
    rey: 11,
};

// Back card is at column 12, row 0 in the sheet
const BACK_COL = 12;
const BACK_ROW = 0;

// Output canvas size — matches CardTextureFactory (3× logical card size 180×264)
const OUTPUT_W = 540;
const OUTPUT_H = 792;

export function preloadSpanishSheetTexture(scene: Phaser.Scene): void {
    if (!scene.textures.exists(SPANISH_SHEET_KEY)) {
        scene.load.image(SPANISH_SHEET_KEY, SPANISH_SHEET_PATH);
    }
}

export function ensureSpanishTextures(scene: Phaser.Scene, skin: CardSkinDefinition): boolean {
    const rawTexture = scene.textures.get(SPANISH_SHEET_KEY);
    if (!rawTexture || rawTexture.key === '__MISSING') {
        return false;
    }

    const source = rawTexture.source[0];
    if (!source) {
        return false;
    }

    const sheetImg = source.image as HTMLImageElement | HTMLCanvasElement;
    const cellW = sheetImg.width / SHEET_COLS;
    const cellH = sheetImg.height / SHEET_ROWS;

    // Back card
    const backKey = getCardBackTextureKey('spanish', skin.id);
    if (!scene.textures.exists(backKey)) {
        cropToTexture(scene, sheetImg, backKey, BACK_COL, BACK_ROW, cellW, cellH);
    }

    // Face cards
    createDeck(spanishDeckDefinition).forEach((card) => {
        const col = RANK_COL[card.rankId];
        const row = SUIT_ROW[card.suitId];
        if (col === undefined || row === undefined) {
            return;
        }

        (['compact', 'showcase'] as const).forEach((variant) => {
            const key = getCardFaceTextureKey(card.id, skin.id, variant);
            if (scene.textures.exists(key)) {
                return;
            }
            cropToTexture(scene, sheetImg, key, col, row, cellW, cellH);
        });
    });

    return true;
}

function cropToTexture(
    scene: Phaser.Scene,
    sheetImg: HTMLImageElement | HTMLCanvasElement,
    key: string,
    col: number,
    row: number,
    cellW: number,
    cellH: number,
): void {
    const tex = scene.textures.createCanvas(key, OUTPUT_W, OUTPUT_H);
    if (!tex) {
        return;
    }
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
        sheetImg,
        col * cellW, row * cellH, cellW, cellH,
        0, 0, OUTPUT_W, OUTPUT_H,
    );
    tex.refresh();
}
