import * as Phaser from 'phaser';

import type { CardGameViewModel, CardGameViewPlayer } from '@engine/engine/game/viewModel';
import { PLAYER_GAME_WIDTH } from '../createPlayerGame';
import {
    getOpponentFanCardPoint,
    playerPovCardSizes,
    type PlayerPovSeatLayout,
} from '../playerPovLayout';
import { getPlayerPovOpponentSeats, type PlayerPovPlayerCounters } from '../playerPovUiModel';
import { CREAM, DIM, GOLD, createRoundedPanel, setCardDisplaySize, drawCapturePileWidget } from './playerDrawUtils';

const OPP_CARD_W = playerPovCardSizes.opponent.width;
const OPP_CARD_H = playerPovCardSizes.opponent.height;

export function drawOpponents(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    viewModel: CardGameViewModel,
    backTextureKey: string,
): void {
    getPlayerPovOpponentSeats(viewModel).forEach((seat) => {
        if (seat.layout.side === 'left' || seat.layout.side === 'right') {
            drawSideOpponent(scene, layer, seat.player, seat.layout, seat.counters, backTextureKey);
        } else {
            drawTopOpponent(scene, layer, seat.player, seat.layout, seat.counters, backTextureKey);
        }
    });
}

function drawTopOpponent(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    player: CardGameViewPlayer,
    layout: PlayerPovSeatLayout,
    counters: PlayerPovPlayerCounters,
    backTextureKey: string,
): void {
    const { x, y } = layout;
    const seatWidth = 116;
    const seatHeight = 36;
    const seatY = y + 6;

    const avatarX = x - seatWidth / 2 + 16;
    const textX = avatarX + 24;

    const cardCount = Math.min(counters.cards, 8);
    const fanCenterY = seatY + seatHeight / 2 + 6 + OPP_CARD_H / 2;

    const wonX = x - seatWidth / 2 - OPP_CARD_W / 2 - 6;
    drawCapturePileWidget(scene, layer, { x: wonX, y: fanCenterY, cardCount: counters.captureCount, backTextureKey, cardW: OPP_CARD_W, cardH: OPP_CARD_H });

    if (cardCount > 0) {
        for (let i = 0; i < cardCount; i++) {
            const pt = getOpponentFanCardPoint(cardCount, i, x, fanCenterY, 'top');
            const back = scene.add
                .image(pt.x, pt.y, backTextureKey)
                .setDisplaySize(OPP_CARD_W, OPP_CARD_H)
                .setAngle(pt.angle);
            setCardDisplaySize(back, OPP_CARD_W, OPP_CARD_H);
            layer.add(back);
        }
    }

    layer.add(
        createRoundedPanel(
            scene,
            x,
            seatY,
            seatWidth,
            seatHeight,
            14,
            0x071a13,
            0.7,
            player.isCurrentTurn ? GOLD : 0x7fb896,
            1,
            player.isCurrentTurn ? 0.58 : 0.22,
        ),
    );

    layer.add(
        scene.add
            .circle(avatarX, seatY, 14, player.isCurrentTurn ? GOLD : 0x1d7f54, 0.96)
            .setStrokeStyle(2, player.isCurrentTurn ? 0xfff1bf : 0x83d0ae, 0.85),
    );
    layer.add(
        scene.add.circle(avatarX - 12, seatY - 12, 4, player.isCurrentTurn ? GOLD : 0x68d184, 0.96),
    );
    layer.add(
        scene.add
            .text(avatarX, seatY, player.iconLabel, {
                fontFamily: 'Arial',
                fontSize: '9px',
                fontStyle: '700',
                color: player.isCurrentTurn ? '#10251c' : CREAM,
            })
            .setOrigin(0.5),
    );
    layer.add(
        scene.add
            .text(textX, seatY - 7, player.nameLabel, {
                fontFamily: 'Arial',
                fontSize: '10px',
                fontStyle: '700',
                color: CREAM,
            })
            .setOrigin(0, 0.5),
    );
    layer.add(
        scene.add
            .text(textX, seatY + 8, String(counters.score), {
                fontFamily: 'Arial',
                fontSize: '10px',
                fontStyle: '700',
                color: 'rgba(255,209,102,0.96)',
            })
            .setOrigin(0, 0.5),
    );
    layer.add(
        scene.add
            .text(textX + 20, seatY + 8, '· ' + counters.cards, {
                fontFamily: 'Arial',
                fontSize: '8px',
                color: counters.cards < 10 ? 'rgba(255,140,60,0.96)' : DIM,
            })
            .setOrigin(0, 0.5),
    );
}

interface SidePanelLayout {
    isLeft: boolean;
    panelCenterX: number;
    panelY: number;
    panelWidth: number;
    panelHeight: number;
}

function drawSideFanCards(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    counters: PlayerPovPlayerCounters,
    panel: SidePanelLayout,
    backTextureKey: string,
): void {
    const { isLeft, panelCenterX, panelY, panelHeight } = panel;
    const cardCount = Math.min(counters.cards, 6);
    if (cardCount === 0) return;
    const fanSide = isLeft ? 'left' : 'right';
    const spread = cardCount > 1 ? Math.min(14, 84 / (cardCount - 1)) : 0;
    const fanTopY = panelY + panelHeight / 2 + 6 + OPP_CARD_H / 2;
    const fanCenterY = fanTopY + ((cardCount - 1) / 2) * spread;
    for (let i = 0; i < cardCount; i++) {
        const pt = getOpponentFanCardPoint(cardCount, i, panelCenterX, fanCenterY, fanSide);
        const back = scene.add
            .image(pt.x, pt.y, backTextureKey)
            .setDisplaySize(OPP_CARD_W, OPP_CARD_H)
            .setAngle(pt.angle);
        setCardDisplaySize(back, OPP_CARD_W, OPP_CARD_H);
        layer.add(back);
    }
}

function drawSideBadge(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    player: CardGameViewPlayer,
    counters: PlayerPovPlayerCounters,
    panel: SidePanelLayout,
): void {
    const { isLeft, panelCenterX, panelY, panelWidth, panelHeight } = panel;
    const active = player.isCurrentTurn;
    const avatarX = isLeft ? panelCenterX - panelWidth / 2 + 16 : panelCenterX + panelWidth / 2 - 16;
    const dotOffsetX = isLeft ? -12 : 12;
    const textX = isLeft ? avatarX + 22 : avatarX - 22;
    const originX = isLeft ? 0 : 1;

    layer.add(createRoundedPanel(scene, panelCenterX, panelY, panelWidth, panelHeight, 14, 0x071a13, 0.7, active ? GOLD : 0x7fb896, 1, active ? 0.58 : 0.22));
    layer.add(scene.add.circle(avatarX, panelY, 14, active ? GOLD : 0x1d7f54, 0.96).setStrokeStyle(2, active ? 0xfff1bf : 0x83d0ae, 0.85));
    layer.add(scene.add.circle(avatarX + dotOffsetX, panelY - 12, 4, active ? GOLD : 0x68d184, 0.96));
    layer.add(scene.add.text(avatarX, panelY, player.iconLabel, { fontFamily: 'Arial', fontSize: '9px', fontStyle: '700', color: active ? '#10251c' : CREAM }).setOrigin(0.5));
    layer.add(scene.add.text(textX, panelY - 7, player.nameLabel, { fontFamily: 'Arial', fontSize: '9px', fontStyle: '700', color: CREAM }).setOrigin(originX, 0.5));
    layer.add(scene.add.text(textX, panelY + 7, String(counters.score), { fontFamily: 'Arial', fontSize: '11px', fontStyle: '700', color: 'rgba(255,209,102,0.96)' }).setOrigin(originX, 0.5));
    const scoreWidth = String(counters.score).length * 7 + 4;
    const cardsX = isLeft ? textX + scoreWidth : textX - scoreWidth;
    layer.add(scene.add.text(cardsX, panelY + 8, '· ' + String(counters.cards), { fontFamily: 'Arial', fontSize: '8px', color: counters.cards < 10 ? 'rgba(255,140,60,0.96)' : DIM }).setOrigin(originX, 0.5));
}

function drawSideOpponent(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    player: CardGameViewPlayer,
    layout: PlayerPovSeatLayout,
    counters: PlayerPovPlayerCounters,
    backTextureKey: string,
): void {
    const isLeft = layout.side === 'left';
    const panelWidth = 112;
    const panelHeight = 36;
    const panel: SidePanelLayout = {
        isLeft,
        panelCenterX: isLeft ? panelWidth / 2 : PLAYER_GAME_WIDTH - panelWidth / 2,
        panelY: layout.y,
        panelWidth,
        panelHeight,
    };

    drawSideFanCards(scene, layer, counters, panel, backTextureKey);

    const wonY = panel.panelY + panelHeight / 2 + 6 + OPP_CARD_H + (isLeft ? -90 : 64);
    drawCapturePileWidget(scene, layer, { x: panel.panelCenterX, y: wonY, cardCount: counters.captureCount, backTextureKey, cardW: OPP_CARD_W, cardH: OPP_CARD_H, angle: isLeft ? 0 : 90 });

    drawSideBadge(scene, layer, player, counters, panel);
}
