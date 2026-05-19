import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

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
        <div className="appShell">
            <div className="appIntro">
                <p className="appEyebrow">Card Game</p>
                <h1 id="game-title">Card Game</h1>
                <nav className="appAdminNav">
                    <Link to="/sandbox" className="appAdminNavLink">Card Sandbox</Link>
                    <Link to="/" className="appAdminNavLink">Lobby</Link>
                </nav>
            </div>
            <div id="game-setup" className="appSetupMount"></div>
            <div id="game-root" className="appRoot"></div>
            <div className="appDevHints">
                <kbd>D</kbd> — toggle zone overlay
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
