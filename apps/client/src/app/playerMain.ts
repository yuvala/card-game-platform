import { createRemoteGameSession, type RemoteGameSession } from './session/remoteSession';
import { createPlayerGame } from './player/createPlayerGame';

export function init(): void {
    const playerRootElement = document.getElementById('player-root');
    const playerSelectElement = document.getElementById('player-viewer-select');
    const playerStatusElement = document.getElementById('player-status');
    const requestedParams = new URLSearchParams(globalThis.location.search);

    if (
        !playerRootElement ||
        !(playerSelectElement instanceof HTMLSelectElement) ||
        !playerStatusElement
    ) {
        throw new Error(
            'Player POV requires #player-root, #player-viewer-select, and #player-status.',
        );
    }

    const playerSelect = playerSelectElement;
    const playerStatus = playerStatusElement;

    let activeSession: RemoteGameSession | null = null;
    let activeGame: ReturnType<typeof createPlayerGame> | null = null;

    function showLoading(): void {
        playerRootElement!.innerHTML = `<div class="playerState"><div class="playerStateSpinner"></div><p class="playerStateMsg">Connecting…</p></div>`;
    }

    function showError(message: string): void {
        const wrap = document.createElement('div');
        wrap.className = 'playerState playerState--error';
        const msg = document.createElement('p');
        msg.className = 'playerStateMsg';
        msg.textContent = message;
        const btn = document.createElement('button');
        btn.className = 'playerStateRetry';
        btn.textContent = 'Retry';
        btn.addEventListener('click', retry);
        wrap.appendChild(msg);
        wrap.appendChild(btn);
        playerRootElement!.replaceChildren(wrap);
    }

    function clearState(): void {
        playerRootElement!.replaceChildren();
    }

    function retry(): void {
        activeGame?.destroy(true);
        activeGame = null;
        activeSession?.stop();
        activeSession = null;
        startPlayerPov().catch((error) => {
            showError(error instanceof Error ? error.message : 'Failed to connect');
        });
    }

    showLoading();
    startPlayerPov().catch((error) => {
        const message = error instanceof Error ? error.message : 'Failed to connect to table.';
        playerStatus.textContent = message;
        showError(message);
    });

    async function startPlayerPov(): Promise<void> {
        showLoading();
        const botCount = Number.parseInt(requestedParams.get('bots') ?? '0', 10);
        const session = await createRemoteGameSession({
            url: getRequestedWebSocketUrl(requestedParams),
            role: botCount > 0 ? 'admin' : 'player',
            sessionId: requestedParams.get('session') ?? undefined,
        });

        if (botCount > 0) {
            const gameId = requestedParams.get('game') ?? 'war-lite';
            const playerCount = botCount + 1;
            const botSeats = Array.from({ length: botCount }, (_, i) => i + 1);
            await session.configure({
                gameId,
                playerCount,
                deckId: 'french',
                botSeats,
            });
        }

        activeSession = session;
        clearState();
        activeGame = createPlayerGame('player-root', session);
        renderPlayerOptions(session);
        selectInitialViewer(session);
        session.start();

        session.subscribe(() => {
            renderPlayerOptions(session);
            syncStatus(session);
        });
        syncStatus(session);

        playerSelect.addEventListener('change', () => {
            session.setViewer(playerSelect.value || null);
            syncStatus(session);
        });

        globalThis.addEventListener('beforeunload', () => {
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
            '';
        playerSelect.replaceChildren(
            ...players.map((player) => {
                const option = document.createElement('option');
                option.value = player.id;
                option.textContent = player.name;
                option.selected = player.id === selectedPlayerId;
                return option;
            }),
        );

        if (selectedPlayerId && selectedPlayerId !== currentViewerId) {
            session.setViewer(selectedPlayerId);
        }
    }

    function selectInitialViewer(session: RemoteGameSession): void {
        const requestedViewerId = requestedParams.get('player');
        const players = session.getPlayers();
        const selectedPlayerId =
            players.find((player) => player.id === requestedViewerId)?.id ?? players[0]?.id ?? null;

        playerSelect.value = selectedPlayerId ?? '';
        session.setViewer(selectedPlayerId);
    }

    function syncStatus(session: RemoteGameSession): void {
        const status = session.getStatus();
        if (status.type !== 'connected') {
            playerStatus.textContent = status.message;
            return;
        }

        const viewerName = session
            .getPlayers()
            .find((player) => player.id === session.getViewerId())?.name;
        playerStatus.textContent = viewerName
            ? 'Live seat: ' + viewerName
            : 'Live table connection';
    }

    function getRequestedWebSocketUrl(params: URLSearchParams): string {
        const explicitUrl = params.get('wsUrl');
        if (explicitUrl) {
            return explicitUrl;
        }

        const envUrl = import.meta.env.VITE_WS_URL as string | undefined;
        if (envUrl) {
            return envUrl;
        }

        const protocol = globalThis.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return protocol + '//' + globalThis.location.hostname + ':8787/';
    }
}
