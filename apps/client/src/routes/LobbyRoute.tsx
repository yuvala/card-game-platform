import { useEffect } from 'react';
import { App as LobbyApp } from '../lobby/App';
import { audioManager } from '../audio/audioManager';
import { musicPlayer } from '../audio/musicPlayer';

export function LobbyRoute() {
    useEffect(() => {
        audioManager.init();
    }, []);

    useEffect(() => {
        const images = [
            '/assets/lobby/lobby-bg_01.png',
            '/assets/lobby/lobby-bg_02.png',
            '/assets/lobby/lobby-bg_03.png',
            '/assets/lobby/lobby-bg_04.png',
            '/assets/lobby/lobby-bg_05.png',
        ] as const;
        const index = Math.floor(Math.random() * images.length);
        const src = images[index];
        musicPlayer.setMode(`lobby-${index + 1}` as `lobby-${1 | 2 | 3 | 4 | 5}`);

        const bgEl = document.getElementById('lobby-bg');
        const rootEl = document.getElementById('lobby-root');
        if (!bgEl || !rootEl) return;
        const bg = bgEl;
        const root = rootEl;

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
