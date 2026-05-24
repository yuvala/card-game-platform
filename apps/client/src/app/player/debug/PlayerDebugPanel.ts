import type { CardGameViewModel } from '@engine/engine/game/viewModel';
import type { ZoneEntry } from './playerDebugOverlay';

const LAYERS = [
    { key: 'hand',  storageKey: 'player-dbg-hand',  label: 'Hand' },
    { key: 'table', storageKey: 'player-dbg-table', label: 'Table' },
    { key: 'piles', storageKey: 'player-dbg-piles', label: 'Piles' },
    { key: 'seats', storageKey: 'player-dbg-seats', label: 'Seats' },
    { key: 'zones', storageKey: 'player-dbg-zones', label: 'Zones' },
] as const;

export class PlayerDebugPanel {
    readonly element: HTMLElement;

    private playerNames = new Map<string, string>();
    private legend!: HTMLElement;
    private readonly onZonesUpdated: (e: Event) => void;

    constructor() {
        this.element = this.buildDOM();
        this.onZonesUpdated = (e: Event) => {
            const zones = (e as CustomEvent<ZoneEntry[]>).detail;
            this.renderLegend(zones);
        };
        globalThis.addEventListener('player-debug-zones-updated', this.onZonesUpdated);
    }

    syncViewModel(vm: CardGameViewModel): void {
        this.playerNames.clear();
        for (const p of vm.players) {
            this.playerNames.set(p.id, p.nameLabel);
        }
    }

    destroy(): void {
        globalThis.removeEventListener('player-debug-zones-updated', this.onZonesUpdated);
        this.element.remove();
    }

    private buildDOM(): HTMLElement {
        const root = document.createElement('div');
        root.className = 'playerDebugPanel';

        const title = document.createElement('p');
        title.className = 'tableControlsEyebrow';
        title.textContent = 'Debug';
        root.appendChild(title);

        const hint = document.createElement('p');
        hint.className = 'tableDebugHint';
        hint.innerHTML = '<kbd>D</kbd> toggle';
        root.appendChild(hint);

        for (const layer of LAYERS) {
            root.appendChild(makeSep());
            const label = document.createElement('label');
            label.className = 'tableDebugCheck';

            const input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = localStorage.getItem(layer.storageKey) === 'on';
            input.addEventListener('change', () => {
                localStorage.setItem(layer.storageKey, input.checked ? 'on' : 'off');
                globalThis.dispatchEvent(new Event('player-debug-layer-change'));
            });

            label.appendChild(input);
            label.append(' ' + layer.label);
            root.appendChild(label);
        }

        root.appendChild(makeSep());
        this.legend = document.createElement('div');
        this.legend.className = 'tableDebugLegend';
        root.appendChild(this.legend);

        return root;
    }

    private renderLegend(zones: ZoneEntry[]): void {
        this.legend.replaceChildren();
        if (zones.length === 0) return;

        // Group zones that belong to a player under a player header
        const playerZoneMap = new Map<string, ZoneEntry[]>();
        const globalZones: ZoneEntry[] = [];

        for (const zone of zones) {
            const key = zoneKey(zone);
            const match = /^owned:capture:(\w+)$/.exec(key) ??
                          /^seat\[\d+\]:[a-z]+$/.exec(key) !== null ? null :
                          /^(?:badge|owned|deck):(\w+)/.exec(key);
            const playerId = match?.[1];
            if (playerId) {
                if (!playerZoneMap.has(playerId)) playerZoneMap.set(playerId, []);
                playerZoneMap.get(playerId)!.push(zone);
            } else {
                globalZones.push(zone);
            }
        }

        for (const zone of globalZones) {
            this.legend.appendChild(makeZoneRow(zone));
        }

        for (const [playerId, pzones] of playerZoneMap) {
            const name = this.playerNames.get(playerId) ?? playerId;
            this.legend.appendChild(makePlayerHeader(name));
            for (const zone of pzones) {
                this.legend.appendChild(makeZoneRow(zone, true));
            }
        }
    }
}

function zoneKey(zone: ZoneEntry): string {
    return zone.label.split(' ')[0];
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

function makeSep(): HTMLElement {
    const sep = document.createElement('div');
    sep.className = 'tableDebugSep';
    return sep;
}
