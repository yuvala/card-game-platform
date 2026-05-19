import React, { useEffect } from "react";

export function PlayerRoute() {
    useEffect(() => {
        const shell = document.querySelector(".playerShell") as HTMLElement | null;
        const isDebug = localStorage.getItem("player-dbg-bar") === "on" ||
            new URLSearchParams(location.search).get("debug") === "1";
        if (isDebug && shell) shell.classList.add("debug");

        import("../app/playerMain").then((m) => m.init());
    }, []);

    return (
        <div className="playerShell">
            <div className="playerSettings" id="player-settings">
                <div className="playerSettingsBackdrop" id="player-settings-backdrop"></div>
                <div className="playerSettingsPanel">
                    <p className="playerSettingsTitle">Settings</p>
                    <label className="playerSettingsRow">
                        Show debug bar
                        <input type="checkbox" id="settings-debug-bar" />
                    </label>
                    <label className="playerSettingsRow">
                        Zone overlay (D)
                        <input type="checkbox" id="settings-zones" />
                    </label>
                </div>
            </div>
            <header className="playerHeader">
                <label className="playerSelectLabel" htmlFor="player-viewer-select">Viewing Seat</label>
                <select id="player-viewer-select" className="playerSelect"></select>
                <p id="player-status" className="playerStatus">Connecting to table...</p>
            </header>
            <main className="playerDeviceFrame">
                <div id="player-root" className="playerRoot"></div>
            </main>
            <footer className="playerFooter">
                <kbd>D</kbd> — toggle zone overlay
                <span className="appDevSep">|</span>
                <label className="appDevCheck"><input type="checkbox" id="pdbg-hand" /> HAND</label>
                <label className="appDevCheck"><input type="checkbox" id="pdbg-table" /> TABLE</label>
                <label className="appDevCheck"><input type="checkbox" id="pdbg-piles" /> PILES</label>
                <label className="appDevCheck"><input type="checkbox" id="pdbg-seats" /> SEATS</label>
                <label className="appDevCheck"><input type="checkbox" id="pdbg-zones" /> ZONES</label>
            </footer>
        </div>
    );
}
