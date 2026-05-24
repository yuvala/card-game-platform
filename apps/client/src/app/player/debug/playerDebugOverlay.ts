import * as Phaser from 'phaser';

import type { CardGameViewModel } from '@engine/engine/game/viewModel';
import {
    getHandCardPoint,
    getOpponentSeatLayouts,
    getStockTrumpPoint,
    getTableRowCardPoint,
    getTrickCardPoint,
    playerPovCardSizes,
    playerPovZones,
    type PlayerPovSeatSide,
} from '../playerPovLayout';
import { getPlayerPovPresentation } from '../playerPovPresentation';
import { getPlayerPovOpponentSeats } from '../playerPovUiModel';
import { PLAYER_GAME_WIDTH } from '../createPlayerGame';

export interface PlayerDebugLayerFlags {
    hand: boolean;
    table: boolean;
    piles: boolean;
    seats: boolean;
    zones: boolean;
}

export interface ZoneEntry {
    label: string;
    x: number;
    y: number;
    w: number;
    h: number;
    angle?: number;
    color: number;
    dashed?: boolean;
}

function fmt(x: number, y: number): string {
    return `(${Math.round(x)},${Math.round(y)})`;
}

function strokeDashedRect(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    dash = 5,
    gap = 4,
): void {
    const sides = [
        { x1: x, y1: y, x2: x + w, y2: y },
        { x1: x + w, y1: y, x2: x + w, y2: y + h },
        { x1: x + w, y1: y + h, x2: x, y2: y + h },
        { x1: x, y1: y + h, x2: x, y2: y },
    ];
    sides.forEach(({ x1, y1, x2, y2 }) => {
        const len = Math.hypot(x2 - x1, y2 - y1);
        const nx = (x2 - x1) / len;
        const ny = (y2 - y1) / len;
        let drawn = 0;
        let drawing = true;
        while (drawn < len) {
            const segLen = Math.min(drawing ? dash : gap, len - drawn);
            if (drawing) {
                g.lineBetween(
                    x1 + nx * drawn,
                    y1 + ny * drawn,
                    x1 + nx * (drawn + segLen),
                    y1 + ny * (drawn + segLen),
                );
            }
            drawn += segLen;
            drawing = !drawing;
        }
    });
}

function collectHandZones(viewModel: CardGameViewModel): ZoneEntry[] {
    const player = viewModel.players[0];
    if (!player) return [];
    const count = Math.max(player.hand.length, 1);
    return Array.from({ length: count }, (_, i) => {
        const pt = getHandCardPoint({ cardCount: count, index: i });
        return {
            label: `hand[${i}] ${fmt(pt.x, pt.y)}`,
            x: pt.x, y: pt.y,
            w: playerPovCardSizes.hand.width, h: playerPovCardSizes.hand.height,
            angle: pt.angle, color: 0xffd166,
        };
    });
}

function collectTableZones(viewModel: CardGameViewModel): ZoneEntry[] {
    const presentation = getPlayerPovPresentation(viewModel);
    const count = Math.max(viewModel.tableCards.length, 1);
    if (presentation.centerArea === 'trick') {
        const sides: PlayerPovSeatSide[] = ['bottom', 'top', 'left', 'right'];
        return sides.slice(0, viewModel.players.length).map((side, i) => {
            const pt = getTrickCardPoint(side);
            return {
                label: `trick[${i}]:${side} ${fmt(pt.x, pt.y)}`,
                x: pt.x, y: pt.y,
                w: playerPovCardSizes.table.width, h: playerPovCardSizes.table.height,
                angle: pt.angle, color: 0xff6666,
            };
        });
    }
    return Array.from({ length: count }, (_, i) => {
        const pt = getTableRowCardPoint({ cardCount: count, index: i });
        return {
            label: `table[${i}] ${fmt(pt.x, pt.y)}`,
            x: pt.x, y: pt.y,
            w: playerPovCardSizes.table.width, h: playerPovCardSizes.table.height,
            angle: pt.angle, color: 0xff6666,
        };
    });
}

function collectPileZones(viewModel: CardGameViewModel): ZoneEntry[] {
    const stockPt = getStockTrumpPoint();
    const entries: ZoneEntry[] = [
        {
            label: `stock ${fmt(stockPt.x, stockPt.y)}`,
            x: stockPt.x, y: stockPt.y,
            w: playerPovCardSizes.stockTrump.width, h: playerPovCardSizes.stockTrump.height,
            color: 0x44ddff,
        },
        {
            label: `trump ${fmt(stockPt.x + 24, stockPt.y + 8)}`,
            x: stockPt.x + 24, y: stockPt.y + 8,
            w: playerPovCardSizes.stockTrump.width, h: playerPovCardSizes.stockTrump.height,
            angle: 90, color: 0x88eeff, dashed: true,
        },
    ];

    const localPlayer = viewModel.players[0];
    if (localPlayer) {
        const localCapture = viewModel.piles.find(
            (p) => p.role === 'capture' && p.ownerId === localPlayer.id,
        );
        if (localCapture) {
            const cx = PLAYER_GAME_WIDTH - playerPovCardSizes.hand.width / 2 - 8;
            const cy = playerPovZones.handY - 10;
            entries.push({
                label: `owned:capture:${localPlayer.id} ${fmt(cx, cy)}`,
                x: cx, y: cy,
                w: playerPovCardSizes.hand.width, h: playerPovCardSizes.hand.height,
                color: 0xaa44ff,
            });
        }
    }

    getPlayerPovOpponentSeats(viewModel).forEach((seat) => {
        const hasCapture = viewModel.piles.some(
            (p) => p.role === 'capture' && p.ownerId === seat.player.id,
        );
        if (!hasCapture) return;
        const panelH = 36;
        const oppH = playerPovCardSizes.opponent.height;
        const wonY = seat.layout.y + panelH / 2 + 6 + oppH + 10;
        let wonX = seat.layout.x;
        if (seat.layout.side === 'left') wonX = 56;
        else if (seat.layout.side === 'right') wonX = PLAYER_GAME_WIDTH - 56;
        entries.push({
            label: `owned:capture:${seat.player.id} ${fmt(wonX, wonY)}`,
            x: wonX, y: wonY,
            w: playerPovCardSizes.opponent.width, h: playerPovCardSizes.opponent.height,
            color: 0xaa44ff,
        });
    });

    return entries;
}

function collectSeatZones(viewModel: CardGameViewModel): ZoneEntry[] {
    const opponentSeats = getPlayerPovOpponentSeats(viewModel);
    return getOpponentSeatLayouts(opponentSeats.length).map((layout, i) => ({
        label: `seat[${i}]:${layout.side} ${fmt(layout.x, layout.y)}`,
        x: layout.x, y: layout.y,
        w: playerPovCardSizes.opponent.width, h: playerPovCardSizes.opponent.height,
        angle: layout.angle, color: 0x66ff99,
    }));
}

function collectLayoutZones(): ZoneEntry[] {
    return [
        { key: 'topBar',     y: playerPovZones.topBarY,      h: 30, color: 0xcc88ff },
        { key: 'gameInfo',   y: playerPovZones.gameInfoY,    h: 56, color: 0xcc88ff },
        { key: 'playerHud',  y: playerPovZones.playerHudY,   h: 40, color: 0xffaa44 },
        { key: 'actionBtn',  y: playerPovZones.actionButtonY, h: 48, color: 0xffaa44 },
        { key: 'actionText', y: playerPovZones.actionStatusY, h: 24, color: 0xffdd88 },
    ].map(({ key, y, h, color }) => ({
        label: `${key} y=${y}`,
        x: PLAYER_GAME_WIDTH / 2, y,
        w: PLAYER_GAME_WIDTH, h,
        color, dashed: true,
    }));
}

function collectZones(viewModel: CardGameViewModel, layers: PlayerDebugLayerFlags): ZoneEntry[] {
    return [
        ...(layers.hand  ? collectHandZones(viewModel)   : []),
        ...(layers.table ? collectTableZones(viewModel)  : []),
        ...(layers.piles ? collectPileZones(viewModel)   : []),
        ...(layers.seats ? collectSeatZones(viewModel)   : []),
        ...(layers.zones ? collectLayoutZones()          : []),
    ];
}

export interface PlayerDebugOverlay {
    graphics: Phaser.GameObjects.Graphics;
    texts: Phaser.GameObjects.Text[];
    destroy(): void;
}

export function drawPlayerDebugOverlay(input: {
    scene: Phaser.Scene;
    viewModel: CardGameViewModel;
    layers: PlayerDebugLayerFlags;
}): PlayerDebugOverlay {
    const { scene, viewModel, layers } = input;
    const g = scene.add.graphics().setDepth(9999);
    const texts: Phaser.GameObjects.Text[] = [];

    const zones = collectZones(viewModel, layers);
    globalThis.dispatchEvent(new CustomEvent<ZoneEntry[]>('player-debug-zones-updated', { detail: zones }));

    zones.forEach((zone) => {
        const { x, y, w, h, color, label, dashed, angle = 0 } = zone;

        g.fillStyle(color, dashed ? 0.05 : 0.12);
        g.fillRect(x - w / 2, y - h / 2, w, h);

        g.lineStyle(1.5, color, dashed ? 0.5 : 0.85);
        if (dashed) {
            strokeDashedRect(g, x - w / 2, y - h / 2, w, h);
        } else {
            g.strokeRect(x - w / 2, y - h / 2, w, h);
        }

        g.lineStyle(1, color, 0.7);
        g.lineBetween(x - 6, y, x + 6, y);
        g.lineBetween(x, y - 6, x, y + 6);

        const text = scene.add
            .text(x, y - h / 2 - 3, label, {
                fontSize: '9px',
                fontFamily: 'monospace',
                color: '#' + color.toString(16).padStart(6, '0'),
                backgroundColor: 'rgba(0,0,0,0.75)',
                padding: { x: 2, y: 1 },
            })
            .setOrigin(0.5, 1)
            .setDepth(10000)
            .setResolution(2);

        if (angle !== 0) {
            text.setAngle(angle);
        }

        texts.push(text);
    });

    return {
        graphics: g,
        texts,
        destroy() {
            g.destroy();
            texts.forEach((t) => {
                t.destroy();
            });
        },
    };
}
