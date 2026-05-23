import type { CardGameSession } from '@engine/engine/game/session';
import type { CardGameViewModel } from '@engine/engine/game/viewModel';
import type { ZoneEntry } from '../scenes/debug/debugZoneOverlay';

const LAYERS = [
    { key: 'origins', id: 'dbg-origins', label: 'Origin' },
    { key: 'slots',   id: 'dbg-slots',   label: 'Slot' },
    { key: 'piles',   id: 'dbg-piles',   label: 'Pile' },
] as const;

export class TableDebugPanel {
    readonly element: HTMLElement;

    private readonly session: CardGameSession<any>;
    private readonly subscription: { unsubscribe(): void };
    private readonly onZonesUpdated: (e: Event) => void;

    private playerNames = new Map<string, string>();

    private legendOrigin!: HTMLElement;
    private legendSlot!: HTMLElement;
    private legendPile!: HTMLElement;

    constructor(session: CardGameSession<any>) {
        this.session = session;
        this.element = this.buildDOM();

        this.onZonesUpdated = (e: Event) => {
            const zones = (e as CustomEvent<ZoneEntry[]>).detail;
            this.renderZoneLegends(zones);
        };
        globalThis.addEventListener('debug-zones-updated', this.onZonesUpdated);

        this.subscription = session.subscribe(() => {
            this.syncPlayerNames(session.getViewModel(null));
        });
        this.syncPlayerNames(session.getViewModel(null));
    }

    destroy(): void {
        globalThis.removeEventListener('debug-zones-updated', this.onZonesUpdated);
        this.subscription.unsubscribe();
        this.element.remove();
    }

    private buildDOM(): HTMLElement {
        const root = document.createElement('div');
        root.className = 'tableDebugPanel';

        const eyebrow = document.createElement('p');
        eyebrow.className = 'tableControlsEyebrow';
        eyebrow.textContent = 'Debug';
        root.appendChild(eyebrow);

        const hint = document.createElement('p');
        hint.className = 'tableDebugHint';
        hint.innerHTML = '<kbd>D</kbd> zone overlay';
        root.appendChild(hint);

        const legends: HTMLElement[] = [];

        for (const layer of LAYERS) {
            root.appendChild(makeSep());

            const label = document.createElement('label');
            label.className = 'tableDebugCheck';

            const input = document.createElement('input');
            input.type = 'checkbox';
            input.id = layer.id;
            input.checked = localStorage.getItem('debug-layer-' + layer.key) === 'on';
            input.addEventListener('change', () => {
                localStorage.setItem('debug-layer-' + layer.key, input.checked ? 'on' : 'off');
                globalThis.dispatchEvent(new Event('debug-layer-change'));
            });

            label.appendChild(input);
            label.append(' ' + layer.label);
            root.appendChild(label);

            const legend = document.createElement('div');
            legend.className = 'tableDebugLegend';
            root.appendChild(legend);
            legends.push(legend);
        }

        [this.legendOrigin, this.legendSlot, this.legendPile] = legends;

        return root;
    }

    private syncPlayerNames(vm: CardGameViewModel): void {
        this.playerNames.clear();
        for (const p of vm.players) {
            this.playerNames.set(p.id, p.nameLabel);
        }
    }

    private renderZoneLegends(zones: ZoneEntry[]): void {
        const pileZones: ZoneEntry[] = [];
        const slotZones: ZoneEntry[] = [];
        const originZones: ZoneEntry[] = [];

        for (const zone of zones) {
            const key = zoneKey(zone);
            if (key.startsWith('slot:')) slotZones.push(zone);
            else if (key.startsWith('origin:')) originZones.push(zone);
            else pileZones.push(zone);
        }

        renderPlayerGrouped(this.legendOrigin, originZones, 'origin:', this.playerNames);
        renderPlayerGrouped(this.legendSlot, slotZones, 'slot:', this.playerNames);
        this.renderPileLegend(pileZones);
    }

    private renderPileLegend(zones: ZoneEntry[]): void {
        const isPlayerZone = (key: string) =>
            key.startsWith('badge:') || key.startsWith('owned:') || key.startsWith('deck:');

        const globalZones = zones.filter((z) => !isPlayerZone(zoneKey(z)));
        const playerZoneMap = new Map<string, ZoneEntry[]>();

        for (const zone of zones) {
            const key = zoneKey(zone);
            if (!isPlayerZone(key)) continue;
            const playerId = key.split(':')[1];
            if (!playerZoneMap.has(playerId)) playerZoneMap.set(playerId, []);
            playerZoneMap.get(playerId)!.push(zone);
        }

        this.legendPile.replaceChildren();

        for (const zone of globalZones) {
            this.legendPile.appendChild(makeZoneRow(zone));
        }

        for (const [playerId, pzones] of playerZoneMap) {
            const name = this.playerNames.get(playerId) ?? playerId;
            this.legendPile.appendChild(makePlayerHeader(name));
            for (const zone of pzones) {
                this.legendPile.appendChild(makeZoneRow(zone, true));
            }
        }
    }
}

function renderPlayerGrouped(
    el: HTMLElement,
    zones: ZoneEntry[],
    prefix: string,
    playerNames: Map<string, string>,
): void {
    el.replaceChildren();
    const order: string[] = [];
    const byPlayer = new Map<string, ZoneEntry[]>();

    for (const zone of zones) {
        const key = zoneKey(zone);
        const playerId = key.slice(prefix.length).replace(/\[\d+\]$/, '');
        if (!byPlayer.has(playerId)) {
            order.push(playerId);
            byPlayer.set(playerId, []);
        }
        byPlayer.get(playerId)!.push(zone);
    }

    for (const playerId of order) {
        const name = playerNames.get(playerId) ?? playerId;
        el.appendChild(makePlayerHeader(name));
        for (const zone of byPlayer.get(playerId)!) {
            el.appendChild(makeZoneRow(zone, true));
        }
    }
}

function makePlayerHeader(name: string): HTMLElement {
    const el = document.createElement('p');
    el.className = 'tableDebugPlayerHeader';
    el.textContent = name;
    return el;
}

function makeZoneRow(zone: ZoneEntry, indented = false): HTMLElement {
    const row = document.createElement('div');
    row.className = 'tableDebugLegendRow' + (indented ? ' tableDebugLegendRow--indented' : '');

    const color = '#' + zone.color.toString(16).padStart(6, '0');

    const swatch = document.createElement('span');
    swatch.className = 'tableDebugSwatch' + (zone.dashed ? ' tableDebugSwatch--dashed' : '');
    swatch.style.borderColor = color;
    if (!zone.dashed) swatch.style.background = color + '33';

    const key = zoneKey(zone);
    const coords = zone.label.slice(key.length).trim();

    const keyEl = document.createElement('span');
    keyEl.className = 'tableDebugLegendLabel';
    keyEl.style.color = color;
    keyEl.textContent = key;

    const coordsEl = document.createElement('span');
    coordsEl.className = 'tableDebugLegendCoords';
    coordsEl.textContent = coords;

    row.appendChild(swatch);
    row.appendChild(keyEl);
    row.appendChild(coordsEl);

    return row;
}

function zoneKey(zone: ZoneEntry): string {
    return zone.label.split(' ')[0];
}

function makeSep(): HTMLElement {
    const sep = document.createElement('div');
    sep.className = 'tableDebugSep';
    return sep;
}
