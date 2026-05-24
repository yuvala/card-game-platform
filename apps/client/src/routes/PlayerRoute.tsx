import React, { useEffect, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { audioManager } from '../audio/audioManager';

export function PlayerRoute() {
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);
    const [sfxEnabled, setSfxEnabled] = useState(() => audioManager.getSettings().sfxEnabled);
    const [musicEnabled, setMusicEnabled] = useState(() => audioManager.getSettings().musicEnabled);
    useEffect(() => {
        const onGameOver = () => setIsGameOver(true);
        globalThis.addEventListener('player-game-over', onGameOver);
        return () => globalThis.removeEventListener('player-game-over', onGameOver);
    }, []);
    useEffect(() => {
        const shell = document.querySelector('.playerShell') as HTMLElement | null;
        const settings = document.getElementById('player-settings');
        const backdrop = document.getElementById('player-settings-backdrop');
        const debugBarToggle = document.getElementById(
            'settings-debug-bar',
        ) as HTMLInputElement | null;
        const zonesToggle = document.getElementById('settings-zones') as HTMLInputElement | null;

        // debug bar
        const isDebug =
            localStorage.getItem('player-dbg-bar') === 'on' ||
            new URLSearchParams(location.search).get('debug') === '1';
        if (debugBarToggle) debugBarToggle.checked = isDebug;
        if (isDebug && shell) shell.classList.add('debug');
        debugBarToggle?.addEventListener('change', () => {
            localStorage.setItem('player-dbg-bar', debugBarToggle.checked ? 'on' : 'off');
            shell?.classList.toggle('debug', debugBarToggle.checked);
        });

        // debug panel toggle
        if (zonesToggle) zonesToggle.checked = localStorage.getItem('player-debug-zones') === 'on';
        zonesToggle?.addEventListener('change', () => {
            localStorage.setItem('player-debug-zones', zonesToggle.checked ? 'on' : 'off');
            globalThis.dispatchEvent(new Event('player-debug-toggle'));
        });
        const onDebugStateChanged = (e: Event) => {
            if (zonesToggle) zonesToggle.checked = (e as CustomEvent<{ open: boolean }>).detail.open;
        };
        globalThis.addEventListener('player-debug-state-changed', onDebugStateChanged);

        // settings panel open/close
        const onSettingsToggle = () => settings?.classList.toggle('open');
        const onBackdropClick = () => settings?.classList.remove('open');
        globalThis.addEventListener('player-settings-toggle', onSettingsToggle);
        backdrop?.addEventListener('click', onBackdropClick);

        // footer debug checkboxes
        const footerKeys: Record<string, string> = {
            hand: 'pdbg-hand',
            table: 'pdbg-table',
            piles: 'pdbg-piles',
            seats: 'pdbg-seats',
            zones: 'pdbg-zones',
        };
        Object.entries(footerKeys).forEach(([layer, id]) => {
            const el = document.getElementById(id) as HTMLInputElement | null;
            if (!el) return;
            el.checked = localStorage.getItem('player-dbg-' + layer) === 'on';
            el.addEventListener('change', () => {
                localStorage.setItem('player-dbg-' + layer, el.checked ? 'on' : 'off');
                globalThis.dispatchEvent(new Event('player-debug-layer-change'));
            });
        });

        import('../app/playerMain').then((m) => m.init());

        return () => {
            globalThis.removeEventListener('player-settings-toggle', onSettingsToggle);
            globalThis.removeEventListener('player-debug-state-changed', onDebugStateChanged);
            backdrop?.removeEventListener('click', onBackdropClick);
        };
    }, []);

    return (
        <div className="playerShell">
            <div className="playerSettings" id="player-settings">
                <div className="playerSettingsBackdrop" id="player-settings-backdrop"></div>
                <div className="playerSettingsPanel">
                    <p className="playerSettingsTitle">Settings</p>
                    <label className="playerSettingsRow">
                        SFX
                        <input type="checkbox" checked={sfxEnabled} onChange={(e) => {
                            setSfxEnabled(e.target.checked);
                            audioManager.update({ sfxEnabled: e.target.checked });
                        }} />
                    </label>
                    <label className="playerSettingsRow">
                        Music
                        <input type="checkbox" checked={musicEnabled} onChange={(e) => {
                            setMusicEnabled(e.target.checked);
                            audioManager.update({ musicEnabled: e.target.checked });
                        }} />
                    </label>
                    <label className="playerSettingsRow">
                        Show debug bar
                        <input type="checkbox" id="settings-debug-bar" />
                    </label>
                    <label className="playerSettingsRow">
                        Debug show
                        <input type="checkbox" id="settings-zones" />
                    </label>
                </div>
            </div>
            <header className="playerHeader">
                 
                <select id="player-viewer-select" className="playerSelect"></select>
            </header>
            <ConfirmDialog
                open={showLeaveDialog}
                title="Leave the game?"
                confirmLabel="Leave"
                cancelLabel="Stay"
                onConfirm={() => { location.href = '/'; }}
                onCancel={() => setShowLeaveDialog(false)}
            />
            <main className="playerDeviceFrame">
                <div id="player-root" className="playerRoot"></div>
                <div className="playerCanvasButtons">
                    {isGameOver ? (
                        <button
                            className="playerBackToLobbyButton"
                            onClick={() => { location.href = '/'; }}
                        >
                            Back to Lobby
                        </button>
                    ) : (
                        <button
                            className="playerLeaveButton"
                            onClick={() => { setShowLeaveDialog(true); }}
                            aria-label="Leave game"
                        >
                            ←
                        </button>
                    )}
                    <button
                        className="playerSettingsButton"
                        onClick={() => globalThis.dispatchEvent(new CustomEvent('player-settings-toggle'))}
                        aria-label="Settings"
                    >
                        ⚙
                    </button>
                </div>
            </main>
            <footer className="playerFooter">
                <kbd>D</kbd> — toggle zone overlay
                <span className="appDevSep">|</span>
                <label className="appDevCheck">
                    <input type="checkbox" id="pdbg-hand" /> HAND
                </label>
                <label className="appDevCheck">
                    <input type="checkbox" id="pdbg-table" /> TABLE
                </label>
                <label className="appDevCheck">
                    <input type="checkbox" id="pdbg-piles" /> PILES
                </label>
                <label className="appDevCheck">
                    <input type="checkbox" id="pdbg-seats" /> SEATS
                </label>
                <label className="appDevCheck">
                    <input type="checkbox" id="pdbg-zones" /> ZONES
                </label>
            </footer>
        </div>
    );
}
