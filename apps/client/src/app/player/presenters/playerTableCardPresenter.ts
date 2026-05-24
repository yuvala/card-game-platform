import * as Phaser from 'phaser';

import type { CardGameViewModel, CardGameViewTableCard } from '@engine/engine/game/viewModel';
import { getCardFaceTextureKey } from '../../phaser/cards/CardTextureFactory';
import { PLAYER_GAME_WIDTH } from '../createPlayerGame';
import {
    getTableRowCardPoint,
    getTrickCardPoint,
    getWarBattleCardPoint,
    playerPovCardSizes,
} from '../playerPovLayout';
import type { PlayerPovPresentation } from '../playerPovPresentation';
import { getPlayerPovSeatSide, getPrimaryPileText } from '../playerPovUiModel';
import {
    drawCenterStockPile,
    drawCenterDeckWidget,
    drawStockTrumpWidget,
    drawDeckWidget,
} from './playerPilePresenter';
import { GOLD, DIM, createRoundedPanel, setCardDisplaySize } from './playerDrawUtils';

const TABLE_CARD_W = playerPovCardSizes.table.width;
const TABLE_CARD_H = playerPovCardSizes.table.height;

export function drawTableCards(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    viewModel: CardGameViewModel,
    presentation: PlayerPovPresentation,
    backTextureKey: string,
    skinId: string,
): { x: number; y: number } | null {
    let stockPilePoint: { x: number; y: number } | null = null;

    if (presentation.centerArea === 'battle') {
        drawBattleSurface(scene, layer);
    } else if (presentation.centerArea === 'showdown') {
        drawShowdownSurface(scene, layer, presentation);
    }

    if (presentation.centerDock === 'stock') {
        stockPilePoint = drawCenterStockPile(scene, layer, viewModel, backTextureKey);
    } else if (presentation.centerDock === 'deck') {
        stockPilePoint = drawCenterDeckWidget(scene, layer, viewModel, presentation, backTextureKey, skinId);
    }

    const cards = viewModel.tableCards;
    const battlePoints = new Map<string, { x: number; y: number; angle: number }>();
    if (presentation.centerArea === 'battle') {
        const localPlayerId = viewModel.players[0]?.id ?? '';
        const faceDownCounts = new Map<string, number>();
        cards.forEach((card) => {
            const side = card.playerId === localPlayerId ? 'bottom' : 'top';
            const isComparison = card.isFaceUp === true;
            const fdIndex = isComparison ? 0 : (faceDownCounts.get(card.playerId ?? '') ?? 0);
            if (!isComparison) {
                faceDownCounts.set(card.playerId ?? '', fdIndex + 1);
            }
            battlePoints.set(card.id, getWarBattleCardPoint(side, isComparison, fdIndex));
        });
    }

    const getTexture = (card: CardGameViewTableCard) =>
        card.isFaceUp ? getCardFaceTextureKey(card.id, skinId, 'compact') : backTextureKey;

    cards.forEach((card, index) => {
        const point =
            battlePoints.get(card.id) ??
            (presentation.centerArea === 'trick'
                ? getTrickCardPoint(getPlayerPovSeatSide(viewModel, card.playerId))
                : getTableRowCardPoint({ cardCount: cards.length, index }));
        const image = scene.add
            .image(point.x, point.y, getTexture(card))
            .setDisplaySize(TABLE_CARD_W, TABLE_CARD_H)
            .setAngle(point.angle)
            .setData('cardId', card.id);
        setCardDisplaySize(image, TABLE_CARD_W, TABLE_CARD_H);
        layer.add(image);

        if (card.stackBadgeLabel) {
            layer.add(
                scene.add
                    .text(
                        point.x + TABLE_CARD_W / 2 - 2,
                        point.y - TABLE_CARD_H / 2 + 2,
                        card.stackBadgeLabel,
                        {
                            fontFamily: 'Arial',
                            fontSize: '9px',
                            fontStyle: '700',
                            color: '#ffffff',
                            backgroundColor: 'rgba(0,0,0,0.72)',
                            padding: { x: 3, y: 2 },
                        },
                    )
                    .setOrigin(1, 0)
                    .setDepth(32),
            );
        }
    });

    if (presentation.bottomDock === 'stock-trump') {
        stockPilePoint = drawStockTrumpWidget(scene, layer, viewModel, presentation, backTextureKey, skinId);
    } else if (presentation.bottomDock === 'deck') {
        stockPilePoint = drawDeckWidget(scene, layer, viewModel, presentation, backTextureKey, skinId);
    }

    const pileText = getPrimaryPileText(viewModel);
    if (pileText && presentation.bottomDock !== 'stock-trump' && presentation.centerDock === 'none') {
        layer.add(
            scene.add
                .text(PLAYER_GAME_WIDTH / 2, 368, pileText, {
                    fontFamily: 'Arial',
                    fontSize: '13px',
                    fontStyle: '700',
                    color: 'rgba(255,209,102,0.86)',
                })
                .setOrigin(0.5),
        );
    }

    return stockPilePoint;
}

function drawBattleSurface(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
): void {
    layer.add(
        createRoundedPanel(scene, PLAYER_GAME_WIDTH / 2, 352, 216, 146, 28, 0x092018, 0.36, GOLD, 1, 0.22),
    );
}

function drawShowdownSurface(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    presentation: PlayerPovPresentation,
): void {
    layer.add(
        createRoundedPanel(scene, PLAYER_GAME_WIDTH / 2, 352, 198, 126, 26, 0x0a2a18, 0.28, 0x83d0ae, 1, 0.2),
    );
    layer.add(
        scene.add
            .text(PLAYER_GAME_WIDTH / 2, 302, presentation.centerLabel, {
                fontFamily: 'Arial',
                fontSize: '11px',
                color: DIM,
            })
            .setOrigin(0.5),
    );
}
