import * as Phaser from 'phaser';

import { TABLE_TEXT_RESOLUTION } from '../layout/constants';
import type { SeatBadge } from '../factories/createSeatBadge';
import type { TableCardVisual } from '../factories/createTableCardVisual';
import type { HandSlotVisual } from '../presenters/handPresenter';
import type {
    OwnedPileVisual,
    PrimaryPileVisuals,
    SupplementalPileVisual,
} from '../presenters/pilePresenter';
import type { PlayerDeckVisual } from '../presenters/playerDeckPresenter';

export interface ZoneEntry {
    label: string;
    x: number;
    y: number;
    color: number;
    width?: number;
    height?: number;
    dashed?: boolean;
}

export interface DebugLayerFlags {
    origins: boolean;
    slots: boolean;
    piles: boolean;
}

interface DebugZoneOverlayInput {
    scene: Phaser.Scene;
    primaryPileVisuals: PrimaryPileVisuals;
    seatBadges: Map<string, SeatBadge>;
    handSlots: Map<string, HandSlotVisual[]>;
    ownedPileVisuals: Map<string, OwnedPileVisual>;
    playerDeckVisuals: Map<string, PlayerDeckVisual>;
    supplementalPileVisuals: Map<string, SupplementalPileVisual>;
    tableCardVisuals: TableCardVisual[];
    layers: DebugLayerFlags;
}

export interface DebugOverlay {
    graphics: Phaser.GameObjects.Graphics;
    texts: Phaser.GameObjects.Text[];
    destroy(): void;
}

function fmt(x: number, y: number): string {
    return `(${Math.round(x)}, ${Math.round(y)})`;
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

function collectZones(input: DebugZoneOverlayInput): ZoneEntry[] {
    const {
        primaryPileVisuals,
        seatBadges,
        handSlots,
        ownedPileVisuals,
        playerDeckVisuals,
        supplementalPileVisuals,
        tableCardVisuals,
        layers,
    } = input;

    const zones: ZoneEntry[] = [];

    if (layers.piles) {
        // Primary piles — solid yellow/orange
        const drawFrame = primaryPileVisuals.drawPileFrame;
        zones.push({
            label: `draw ${fmt(drawFrame.x, drawFrame.y)}`,
            x: drawFrame.x,
            y: drawFrame.y,
            color: 0xffd166,
            width: drawFrame.width,
            height: drawFrame.height,
        });
        if (primaryPileVisuals.discardPileFrame.visible) {
            const discardFrame = primaryPileVisuals.discardPileFrame;
            zones.push({
                label: `discard ${fmt(discardFrame.x, discardFrame.y)}`,
                x: discardFrame.x,
                y: discardFrame.y,
                color: 0xffa040,
                width: discardFrame.width,
                height: discardFrame.height,
            });
        }

        // Seat badges — solid green
        seatBadges.forEach((badge, playerId) => {
            zones.push({
                label: `badge:${playerId} ${fmt(badge.container.x, badge.container.y)}`,
                x: badge.container.x,
                y: badge.container.y,
                color: 0x44ff88,
                width: 60,
                height: 28,
            });
        });

        // Owned piles — solid purple
        ownedPileVisuals.forEach((visual, ownerId) => {
            zones.push({
                label: `owned:${ownerId} ${fmt(visual.container.x, visual.container.y)}`,
                x: visual.container.x,
                y: visual.container.y,
                color: 0xcc66ff,
                width: 60,
                height: 88,
            });
        });

        // Player decks — solid blue
        playerDeckVisuals.forEach((visual, playerId) => {
            zones.push({
                label: `deck:${playerId} ${fmt(visual.container.x, visual.container.y)}`,
                x: visual.container.x,
                y: visual.container.y,
                color: 0x4488ff,
                width: 60,
                height: 88,
            });
        });

        // Supplemental piles — solid cyan
        supplementalPileVisuals.forEach((visual, pileId) => {
            zones.push({
                label: `supp:${pileId} ${fmt(visual.container.x, visual.container.y)}`,
                x: visual.container.x,
                y: visual.container.y,
                color: 0x00eeff,
                width: 52,
                height: 74,
            });
        });

        // Table cards — solid red (visible only)
        tableCardVisuals.forEach((visual, i) => {
            if (!visual.container.visible) {
                return;
            }
            zones.push({
                label: `table[${i}] ${fmt(visual.container.x, visual.container.y)}`,
                x: visual.container.x,
                y: visual.container.y,
                color: 0xff4444,
                width: 74,
                height: 104,
            });
        });
    }

    handSlots.forEach((slots, playerId) => {
        slots.forEach((slot, i) => {
            const isVisible = slot.container.visible;
            const movedFromOrigin =
                slot.originX !== slot.container.x || slot.originY !== slot.container.y;

            if (!isVisible) {
                if (layers.origins) {
                    zones.push({
                        label: `origin:${playerId}[${i}] ${fmt(slot.originX, slot.originY)}`,
                        x: slot.originX,
                        y: slot.originY,
                        color: 0x446688,
                        width: 60,
                        height: 88,
                        dashed: true,
                    });
                }
                return;
            }

            if (layers.slots) {
                zones.push({
                    label: `slot:${playerId}[${i}] ${fmt(slot.container.x, slot.container.y)}`,
                    x: slot.container.x,
                    y: slot.container.y,
                    color: 0x66aaff,
                    width: 60,
                    height: 88,
                });
            }

            if (layers.origins && movedFromOrigin) {
                zones.push({
                    label: `origin:${playerId}[${i}] ${fmt(slot.originX, slot.originY)}`,
                    x: slot.originX,
                    y: slot.originY,
                    color: 0x3366cc,
                    width: 60,
                    height: 88,
                    dashed: true,
                });
            }
        });
    });

    return zones;
}

export function drawDebugZoneOverlay(input: DebugZoneOverlayInput): DebugOverlay {
    const { scene } = input;
    const graphics = scene.add.graphics().setDepth(9999);
    const texts: Phaser.GameObjects.Text[] = [];
    const zones = collectZones(input);
    globalThis.dispatchEvent(new CustomEvent('debug-zones-updated', { detail: zones }));

    zones.forEach((zone) => {
        const { x, y, color, label: zoneLabel, dashed } = zone;
        const w = zone.width ?? 60;
        const h = zone.height ?? 60;

        graphics.fillStyle(color, dashed ? 0.05 : 0.12);
        graphics.fillRect(x - w / 2, y - h / 2, w, h);

        graphics.lineStyle(1.5, color, dashed ? 0.6 : 0.85);
        if (dashed) {
            strokeDashedRect(graphics, x - w / 2, y - h / 2, w, h);
        } else {
            graphics.strokeRect(x - w / 2, y - h / 2, w, h);
        }

        graphics.lineStyle(1, color, 0.7);
        graphics.lineBetween(x - 6, y, x + 6, y);
        graphics.lineBetween(x, y - 6, x, y + 6);

        const text = scene.add
            .text(x, y - h / 2 - 3, zoneLabel, {
                fontSize: '10px',
                fontFamily: 'monospace',
                color: '#' + color.toString(16).padStart(6, '0'),
                backgroundColor: 'rgba(0,0,0,0.7)',
                padding: { x: 3, y: 1 },
            })
            .setOrigin(0.5, 1)
            .setDepth(10000)
            .setResolution(TABLE_TEXT_RESOLUTION);

        texts.push(text);
    });

    return {
        graphics,
        texts,
        destroy() {
            graphics.destroy();
            texts.forEach((t) => {
                t.destroy();
            });
            globalThis.dispatchEvent(new CustomEvent('debug-zones-updated', { detail: [] }));
        },
    };
}
