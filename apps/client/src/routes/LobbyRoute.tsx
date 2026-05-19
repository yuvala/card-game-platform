import React from "react";
import { App as LobbyApp } from "../lobby/App";

export function LobbyRoute() {
    return (
        <div id="lobby-root" className="lobbyShell">
            <LobbyApp />
        </div>
    );
}
