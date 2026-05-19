import { createDeck } from '@engine/engine/cards/createDeck';
import { supportedDeckDefinitions } from '@engine/engine/cards/deckDefinitions';
import type { CardInstance } from '@engine/engine/cards/types';
import {
    getCardBackTextureKey,
    getCardFaceTextureKey,
} from '../../phaser/cards/CardTextureFactory';
import type { CardSandboxExampleContext } from './types';

// Card dimensions — large enough to clearly see card quality
const CARD_W = 72;
const CARD_H = 106;
const H_GAP = 8;
const SLOT_H = CARD_H + 12; // 118px per row

// Horizontal zones
const LEFT = 36; // left page margin
const BACK_X = LEFT + 24; // back-card center x (48px thumbnail, sits left of suit labels)
const BACK_DISPLAY_W = 48;
const BACK_DISPLAY_H = 70;
const SUIT_LABEL_RIGHT = 100; // right edge of suit label column
const GRID_LEFT = 108; // card grid starts here
const GRID_RIGHT = 1252; // card grid ends here

// Vertical spacing between deck sections
const DECK_GAP = 26;

export function drawAllCardsGallery(context: CardSandboxExampleContext): void {
    const { scene, renderLayer, colors, skinId } = context;

    const deckIds = Object.keys(supportedDeckDefinitions) as Array<
        keyof typeof supportedDeckDefinitions
    >;

    let y = 42;

    renderLayer.add(
        scene.add.text(LEFT, y, 'All Decks', {
            fontFamily: 'Arial',
            fontSize: '20px',
            fontStyle: '700',
            color: colors.cream,
        }),
    );
    y += 36;

    deckIds.forEach((deckId, deckIdx) => {
        if (deckIdx > 0) {
            renderLayer.add(scene.add.rectangle(640, y + 2, 1200, 1, 0xffd166, 0.1));
            y += DECK_GAP;
        }

        const deckDef = supportedDeckDefinitions[deckId];
        const deck = createDeck(deckDef);

        const suits: string[] = [];
        const suitMap = new Map<string, { label: string; cards: CardInstance[] }>();
        for (const card of deck) {
            if (!suitMap.has(card.suitId)) {
                suits.push(card.suitId);
                suitMap.set(card.suitId, { label: card.suitLabel, cards: [] });
            }
            suitMap.get(card.suitId)?.cards.push(card);
        }

        const rankCount = suitMap.get(suits[0])?.cards.length ?? 0;
        const gridWidth = rankCount * CARD_W + Math.max(0, rankCount - 1) * H_GAP;
        const cardStartX = GRID_LEFT + Math.max(0, (GRID_RIGHT - GRID_LEFT - gridWidth) / 2);

        // Deck title + card count
        renderLayer.add(
            scene.add.text(GRID_LEFT, y, deckDef.name, {
                fontFamily: 'Arial',
                fontSize: '13px',
                fontStyle: '700',
                color: colors.cream,
            }),
        );
        renderLayer.add(
            scene.add.text(
                GRID_LEFT + 110,
                y + 1,
                `${deck.length} cards · ${suits.length} suits · ${rankCount} ranks`,
                {
                    fontFamily: 'Arial',
                    fontSize: '11px',
                    color: colors.dim,
                },
            ),
        );
        y += 22;

        // Rank labels
        const firstSuitCards = suitMap.get(suits[0])?.cards ?? [];
        firstSuitCards.forEach((card, i) => {
            const x = cardStartX + i * (CARD_W + H_GAP) + CARD_W / 2;
            renderLayer.add(
                scene.add
                    .text(x, y, card.rankShortLabel, {
                        fontFamily: 'Arial',
                        fontSize: '10px',
                        color: colors.dim,
                    })
                    .setOrigin(0.5, 0),
            );
        });
        y += 14;

        const gridStartY = y;
        const gridMidY = gridStartY + (suits.length * SLOT_H) / 2;

        // Card back — vertically centered on the suit rows, in the left margin
        const backKey = getCardBackTextureKey(deckId, skinId);
        renderLayer.add(
            scene.add
                .image(BACK_X, gridMidY, backKey)
                .setDisplaySize(BACK_DISPLAY_W, BACK_DISPLAY_H),
        );

        // Suit rows
        suits.forEach((suitId, suitIdx) => {
            const suitEntry = suitMap.get(suitId);
            if (!suitEntry) return;
            const { label, cards } = suitEntry;
            const rowCenterY = gridStartY + suitIdx * SLOT_H + CARD_H / 2;

            renderLayer.add(
                scene.add
                    .text(SUIT_LABEL_RIGHT, rowCenterY, label, {
                        fontFamily: 'Arial',
                        fontSize: '10px',
                        fontStyle: '700',
                        color: colors.cream,
                    })
                    .setOrigin(1, 0.5),
            );

            cards.forEach((card, i) => {
                const x = cardStartX + i * (CARD_W + H_GAP) + CARD_W / 2;
                renderLayer.add(
                    scene.add
                        .image(x, rowCenterY, getCardFaceTextureKey(card.id, skinId, 'compact'))
                        .setDisplaySize(CARD_W, CARD_H),
                );
            });
        });

        y += suits.length * SLOT_H;
    });
}
