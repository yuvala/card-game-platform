import React, { useEffect } from "react";

export function TableAdminRoute() {
    useEffect(() => {
        import("../app/main").then((m) => m.init());
    }, []);

    return (
        <div className="appShell">
            <div className="appIntro">
                <p className="appEyebrow">Card Game</p>
                <h1 id="game-title">Card Game</h1>
            </div>
            <div id="game-setup" className="appSetupMount"></div>
            <div id="game-root" className="appRoot"></div>
            <div className="appDevHints">
                <kbd>D</kbd> — toggle zone overlay
                <span className="appDevSep">|</span>
                <label className="appDevCheck"><input type="checkbox" id="dbg-origins" /> ORIGIN</label>
                <label className="appDevCheck"><input type="checkbox" id="dbg-slots" /> SLOT</label>
                <label className="appDevCheck"><input type="checkbox" id="dbg-piles" /> PILE</label>
            </div>
        </div>
    );
}
