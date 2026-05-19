import React, { useEffect } from 'react';
import { App as LobbyApp } from '../lobby/App';

export function LobbyRoute() {
    useEffect(() => {
        const images = [
            '/assets/lobby/lobby-bg_01.png',
            '/assets/lobby/lobby-bg_02.png',
            '/assets/lobby/lobby-bg_03.png',
        ];
        const src = images[Math.floor(Math.random() * images.length)];
        const bg = document.getElementById('lobby-bg');
        const root = document.getElementById('lobby-root');
        if (!bg || !root) return;

        let removeResize: (() => void) | null = null;
        const img = new Image();
        img.src = src;
        img.decode()
            .then(() => {
                bg.style.backgroundImage = `url('${src}')`;
                function position() {
                    const scale = window.innerHeight / img.naturalHeight;
                    const w = Math.round(img.naturalWidth * scale);
                    bg.style.width = w + 'px';
                    bg.style.backgroundSize = w + 'px 100%';
                    root.style.width = w + 'px';
                }
                position();
                window.addEventListener('resize', position);
                removeResize = () => window.removeEventListener('resize', position);
            })
            .catch(() => {});

        return () => { removeResize?.(); };
    }, []);

    return (
        <>
            <div className="lobby-bg" id="lobby-bg" />
            <div id="lobby-root" className="lobbyShell">
                <LobbyApp />
            </div>
        </>
    );
}
