import React, { useEffect } from 'react';
import { AdminToolbar } from '../components/AdminToolbar';

export function SandboxRoute() {
    useEffect(() => {
        import('../app/dev/cardSandboxMain').then((m) => m.init());
    }, []);

    return (
        <div className="adminShell">
            <AdminToolbar>
                <label className="playerSelectLabel" htmlFor="card-sandbox-deck">
                    Deck
                </label>
                <select id="card-sandbox-deck" className="playerSelect"></select>
                <button id="card-sandbox-replay" className="appPrimaryButton" type="button">
                    Replay
                </button>
            </AdminToolbar>
            <nav className="cardSandboxTabs" aria-label="Card sandbox sections">
                <button
                    className="cardSandboxTab is-active"
                    type="button"
                    data-card-sandbox-section="cards"
                >
                    All Decks
                </button>
                <button className="cardSandboxTab" type="button" data-card-sandbox-section="real">
                    Real Cards
                </button>
                <button
                    className="cardSandboxTab"
                    type="button"
                    data-card-sandbox-section="ghost"
                >
                    Ghost Cards
                </button>
                <button
                    className="cardSandboxTab"
                    type="button"
                    data-card-sandbox-section="layer"
                >
                    Animation Layers
                </button>
            </nav>
            <main id="card-sandbox-root" className="cardSandboxRoot"></main>
        </div>
    );
}
