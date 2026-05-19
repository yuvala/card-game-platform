import React, { useEffect } from "react";
import { App as LobbyApp } from "../lobby/App";

export function LobbyRoute() {
    useEffect(() => {
        const panelIndex = Math.floor(Math.random() * 3);
        const bg = document.getElementById("lobby-bg");
        const root = document.getElementById("lobby-root");
        if (!bg || !root) return;

        let removeResize: (() => void) | null = null;
        const img = new Image();
        img.src = "/assets/lobby-bg.jpg";
        img.decode().then(() => {
            const shifts = [8, 0, -21];
            function position() {
                const scale = window.innerHeight / img.naturalHeight;
                const fullW = Math.round(img.naturalWidth * scale);
                const panelW = Math.round(fullW / 3);
                bg.style.width = panelW + "px";
                bg.style.backgroundSize = fullW + "px 100%";
                bg.style.backgroundPosition = (-panelIndex * panelW + shifts[panelIndex]) + "px 0";
                root.style.width = panelW + "px";
            }
            position();
            window.addEventListener("resize", position);
            removeResize = () => window.removeEventListener("resize", position);
        }).catch(() => {});

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
