import { createRemoteGameSession, type RemoteGameSession } from './session/remoteSession';
import { createPlayerGame } from './player/createPlayerGame';
import { getGameCatalogEntryById } from '@engine/games/catalog';

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
        const myNickname = requestedParams.get('nickname') ?? 'Player 1';
        const gameId = requestedParams.get('game') ?? 'war-lite';
        const allPlayerNames = parsePlayerNames(requestedParams);

        // Seat index is deterministic: order from Supabase join time (passed in URL)
        const myIndex = allPlayerNames.length > 0 ? allPlayerNames.indexOf(myNickname) : 0;
        const isSessionHost = botCount > 0 || myIndex === 0;

        const session = await createRemoteGameSession({
            url: getRequestedWebSocketUrl(requestedParams),
            role: isSessionHost ? 'operator' : 'player',
            sessionId: requestedParams.get('session') ?? undefined,
        });

        if (isSessionHost) {
            const game = getGameCatalogEntryById(gameId);
            const deckId = game?.defaultDeckId ?? 'french';

            if (botCount > 0) {
                const realPlayers = allPlayerNames.length > 0 ? allPlayerNames : [myNickname];
                const playerCount = realPlayers.length + botCount;
                const botSeats = Array.from({ length: botCount }, (_, i) => realPlayers.length + i);
                const playerNames = [
                    ...realPlayers,
                    ...Array.from({ length: botCount }, (_, i) => `Player ${realPlayers.length + i + 1}`),
                ];
                await session.configure({ gameId, playerCount, playerNames, deckId, botSeats });
            } else {
                const playerCount = allPlayerNames.length || 2;
                await session.configure({
                    gameId,
                    playerCount,
                    playerNames: allPlayerNames.length > 0 ? allPlayerNames : undefined,
                    deckId,
                });
            }
        }

        activeSession = session;
        clearState();
        activeGame = createPlayerGame('player-root', session);

        // Set viewer BEFORE renderPlayerOptions so it doesn't override our seat selection
        const myPlayerId = `p${myIndex + 1}`;
        session.setViewer(myPlayerId);
        playerSelect.value = myPlayerId;
        renderPlayerOptions(session);

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

function parsePlayerNames(params: URLSearchParams): string[] {
    const raw = params.get('players');
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed)
            ? parsed.filter((n): n is string => typeof n === 'string')
            : [];
    } catch {
        return [];
    }
}
