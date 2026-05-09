import { createRemoteGameSession, type RemoteGameSession } from "./session/remoteSession";
import { createPlayerGame } from "./player/createPlayerGame";

const playerRootElement = document.getElementById("player-root");
const playerSelectElement = document.getElementById("player-viewer-select");
const playerStatusElement = document.getElementById("player-status");
const requestedParams = new URLSearchParams(window.location.search);

if (
    !playerRootElement ||
    !(playerSelectElement instanceof HTMLSelectElement) ||
    !playerStatusElement
) {
    throw new Error("Player POV requires #player-root, #player-viewer-select, and #player-status.");
}

const playerSelect = playerSelectElement;
const playerStatus = playerStatusElement;

let activeSession: RemoteGameSession | null = null;
let activeGame: ReturnType<typeof createPlayerGame> | null = null;

startPlayerPov().catch((error) => {
    playerStatus.textContent = error instanceof Error ? error.message : "Failed to connect to table.";
});

async function startPlayerPov(): Promise<void> {
    const session = await createRemoteGameSession({
        url: getRequestedWebSocketUrl(requestedParams),
        role: "player",
        sessionId: requestedParams.get("session") ?? undefined
    });

    activeSession = session;
    activeGame = createPlayerGame("player-root", session);
    renderPlayerOptions(session);
    selectInitialViewer(session);
    session.start();

    session.subscribe(() => {
        renderPlayerOptions(session);
        syncStatus(session);
    });
    syncStatus(session);

    playerSelect.addEventListener("change", () => {
        session.setViewer(playerSelect.value || null);
        syncStatus(session);
    });

    window.addEventListener("beforeunload", () => {
        activeGame?.destroy(true);
        activeSession?.stop();
    });
}

function renderPlayerOptions(session: RemoteGameSession): void {
    const players = session.getPlayers();
    const currentViewerId = session.getViewerId();
    const currentSelectValue = playerSelect.value;
    const selectedPlayerId =
        players.find((player) => player.id === currentViewerId)?.id ??
        players.find((player) => player.id === currentSelectValue)?.id ??
        players[0]?.id ??
        "";
    playerSelect.replaceChildren(...players.map((player) => {
        const option = document.createElement("option");
        option.value = player.id;
        option.textContent = player.name;
        option.selected = player.id === selectedPlayerId;
        return option;
    }));

    if (selectedPlayerId && selectedPlayerId !== currentViewerId) {
        session.setViewer(selectedPlayerId);
    }
}

function selectInitialViewer(session: RemoteGameSession): void {
    const requestedViewerId = requestedParams.get("player");
    const players = session.getPlayers();
    const selectedPlayerId =
        players.find((player) => player.id === requestedViewerId)?.id ??
        players[0]?.id ??
        null;

    playerSelect.value = selectedPlayerId ?? "";
    session.setViewer(selectedPlayerId);
}

function syncStatus(session: RemoteGameSession): void {
    const status = session.getStatus();
    if (status.type !== "connected") {
        playerStatus.textContent = status.message;
        return;
    }

    const viewerName = session.getPlayers().find((player) => player.id === session.getViewerId())?.name;
    playerStatus.textContent = viewerName
        ? "Live seat: " + viewerName
        : "Live table connection";
}

function getRequestedWebSocketUrl(params: URLSearchParams): string {
    const explicitUrl = params.get("wsUrl");
    if (explicitUrl) {
        return explicitUrl;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return protocol + "//" + window.location.hostname + ":8787/";
}
