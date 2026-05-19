import React, { useEffect } from 'react';
import { AdminToolbar } from '../components/AdminToolbar';
import { GamePanel } from '../app/app/GamePanel';
import { AdminRoomList } from '../components/AdminRoomList';

export function TableAdminRoute() {
    useEffect(() => {
        const layers: Record<string, string> = {
            origins: 'dbg-origins',
            slots: 'dbg-slots',
            piles: 'dbg-piles',
        };
        Object.entries(layers).forEach(([layer, id]) => {
            const el = document.getElementById(id) as HTMLInputElement | null;
            if (!el) return;
            el.checked = localStorage.getItem('debug-layer-' + layer) === 'on';
            el.addEventListener('change', () => {
                localStorage.setItem('debug-layer-' + layer, el.checked ? 'on' : 'off');
                globalThis.dispatchEvent(new Event('debug-layer-change'));
            });
        });

        import('../app/main').then((m) => m.init());
    }, []);

    return (
        <div className="adminShell">
            <AdminToolbar>
                <span id="game-title" className="adminToolbarGameTitle">
                    Card Game
                </span>
            </AdminToolbar>
            <GamePanel />
            <div id="game-root" className="appRoot"></div>
            <AdminRoomList />
            <div className="appDevHints">
                <kbd>D</kbd>
                {' — toggle zone overlay '}
                <span className="appDevSep">|</span>
                <label className="appDevCheck">
                    <input type="checkbox" id="dbg-origins" /> ORIGIN
                </label>
                <label className="appDevCheck">
                    <input type="checkbox" id="dbg-slots" /> SLOT
                </label>
                <label className="appDevCheck">
                    <input type="checkbox" id="dbg-piles" /> PILE
                </label>
            </div>
        </div>
    );
}
