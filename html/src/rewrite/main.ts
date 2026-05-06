import playersData from "../../data/players.json";
import { supportedDeckDefinitions } from "@rewrite-core/engine/cards/deckDefinitions";
import { resolveDeckId, resolvePlayerCount, type AnyGameCatalogEntry } from "@rewrite-core/engine/game/catalog";
import { createLocalGameSession, type CardGameSession } from "@rewrite-core/engine/game/session";
import { createRemoteGameSession } from "./session/remoteSession";
import {
    DEFAULT_GAME_ID,
    gameCatalogEntries,
    getGameCatalogEntryById
} from "@rewrite-core/games/catalog";
import { createGamePanel, type RewriteGameSelection } from "./app/createGamePanel";
import { getRewriteDebugScenarioById, type RewriteDebugScenario } from "./app/debugScenarios";
import { createRewriteGame } from "./phaser/createRewriteGame";

interface ActiveRewriteRuntime {
    session: CardGameSession<any>;
    game: ReturnType<typeof createRewriteGame>;
}

const seedPlayerNames = playersData.players.map((player) => player.playerName);
const rewriteRoot = document.getElementById("rewrite-root");
const rewriteSetupMount = document.getElementById("rewrite-setup");
const rewriteGameTitle = document.getElementById("rewrite-game-title");
const requestedParams = new URLSearchParams(window.location.search);
const requestedDebugScenario = getRewriteDebugScenarioById(requestedParams.get("scenario"));
const shouldAutostart = requestedParams.get("autostart") === "1" || requestedDebugScenario?.autostart === true;
const shouldUseWebSocketSession = requestedParams.get("transport") === "ws" || requestedParams.get("ws") === "1";

if (!rewriteRoot || !rewriteSetupMount || !rewriteGameTitle) {
    throw new Error("Rewrite app requires #rewrite-root, #rewrite-setup, and #rewrite-game-title containers.");
}

const rootElement = rewriteRoot;
const setupMountElement = rewriteSetupMount;
const gameTitleElement = rewriteGameTitle;

let activeRuntime: ActiveRewriteRuntime | null = null;

const initialSelection = getInitialSelection(requestedParams, requestedDebugScenario);
setPageGameTitle(initialSelection.gameId);
const setupPanel = createGamePanel({
    container: setupMountElement,
    entries: gameCatalogEntries,
    initialSelection,
    initialOpen: !shouldAutostart,
    getDeckLabel: (deckId) => supportedDeckDefinitions[deckId].name,
    getPlayerNames: (playerCount) => buildPlayerNames(playerCount),
    onSelectionChange: (selection) => {
        setPageGameTitle(selection.gameId);
    },
    onStart: (selection) => {
        startGame(selection).catch((error) => {
            renderStartError(error);
        });
    }
});

renderEmptyTable();

if (shouldAutostart) {
    startGame(setupPanel.getSelection()).catch((error) => {
        renderStartError(error);
    });
}

async function startGame(selection: RewriteGameSelection): Promise<void> {
    const selectedGame = resolveSelectedGame(selection.gameId);
    setPageGameTitle(selectedGame.id);
    const normalizedSelection = {
        gameId: selectedGame.id,
        playerCount: resolvePlayerCount(selectedGame, selection.playerCount, selectedGame.maxPlayers),
        deckId: resolveDeckId(selectedGame, selection.deckId)
    };
    const playerNames = buildPlayerNames(normalizedSelection.playerCount);
    const deckDefinition = supportedDeckDefinitions[normalizedSelection.deckId];
    const activeDebugScenario = getActiveDebugScenario(normalizedSelection, requestedDebugScenario);
    const requestedCardsPerPlayer = getRequestedCardsPerPlayer(requestedParams, activeDebugScenario);
    const requestedSeed = getRequestedSeed(requestedParams, activeDebugScenario);

    teardownActiveRuntime();

    rootElement.replaceChildren();
    rootElement.classList.remove("is-empty");

    const session = await createActiveSession({
        selectedGame,
        playerNames,
        deckDefinition,
        requestedCardsPerPlayer,
        requestedSeed
    });

    const game = createRewriteGame("rewrite-root", session);
    if (!shouldUseWebSocketSession) {
        session.send({ type: "START" });
        runDebugScenario(activeDebugScenario, session);
    }

    activeRuntime = {
        session,
        game
    };

    const viewModel = session.getViewModel(null);
    setPageGameTitle(session.gameId);
    setupPanel.updateActiveTable({
        gameLabel: shouldUseWebSocketSession ? resolveSelectedGame(session.gameId).label : selectedGame.label,
        deckLabel: viewModel.deckLabel || deckDefinition.name,
        playerNames: session.playerNames.length > 0 ? [...session.playerNames] : playerNames
    });

    syncUrl(normalizedSelection, requestedCardsPerPlayer, requestedSeed, activeDebugScenario);
}

function teardownActiveRuntime(): void {
    if (!activeRuntime) {
        return;
    }

    activeRuntime.session.stop();
    activeRuntime.game.destroy(true);
    activeRuntime = null;
}

function renderEmptyTable(): void {
    rootElement.classList.add("is-empty");
    rootElement.replaceChildren(createEmptyState());
}

function renderStartError(error: unknown): void {
    rootElement.classList.add("is-empty");
    const emptyState = createEmptyState();
    const errorMessage = document.createElement("p");
    errorMessage.className = "rewriteEmptyCopy";
    errorMessage.textContent = error instanceof Error ? error.message : "Failed to start table.";
    emptyState.append(errorMessage);
    rootElement.replaceChildren(emptyState);
}

function createEmptyState(): HTMLElement {
    const emptyState = document.createElement("div");
    emptyState.className = "rewriteEmptyState";
    emptyState.innerHTML = `
        <p class="rewriteEmptyEyebrow">Table Closed</p>
        <h2 class="rewriteEmptyTitle">Open the Create Game drawer</h2>
        <p class="rewriteEmptyCopy">
            Choose a game, seat count, and deck from the Create Game button.
            Start Game will open the table and deal the first hand immediately.
        </p>
    `;
    return emptyState;
}

function getInitialSelection(
    params: URLSearchParams,
    debugScenario: RewriteDebugScenario | null
): RewriteGameSelection {
    const selectedGame = resolveSelectedGame(debugScenario?.selection.gameId ?? params.get("game"));

    return {
        gameId: selectedGame.id,
        playerCount: resolvePlayerCount(
            selectedGame,
            Number(params.get("players") ?? debugScenario?.selection.playerCount),
            debugScenario?.selection.playerCount ?? selectedGame.maxPlayers
        ),
        deckId: resolveDeckId(selectedGame, params.get("deck") ?? debugScenario?.selection.deckId)
    };
}

function resolveSelectedGame(gameId: string | null | undefined): AnyGameCatalogEntry {
    const selectedGame =
        getGameCatalogEntryById(gameId) ??
        getGameCatalogEntryById(DEFAULT_GAME_ID);

    if (!selectedGame) {
        throw new Error("No rewrite game is registered in the game catalog.");
    }

    return selectedGame;
}

function setPageGameTitle(gameId: string): void {
    gameTitleElement.textContent = resolveSelectedGame(gameId).label;
}

function buildPlayerNames(playerCount: number): string[] {
    return Array.from({ length: playerCount }, (_, index) => {
        return seedPlayerNames[index] ?? "Player " + String(index + 1);
    });
}

function getRequestedCardsPerPlayer(
    params: URLSearchParams,
    debugScenario: RewriteDebugScenario | null
): number | undefined {
    const requestedCards = Number(params.get("cards"));
    if (!Number.isFinite(requestedCards) || requestedCards <= 0) {
        return debugScenario?.cardsPerPlayer;
    }

    return Math.floor(requestedCards);
}

function getRequestedSeed(
    params: URLSearchParams,
    debugScenario: RewriteDebugScenario | null
): string | undefined {
    const seed = params.get("seed")?.trim();
    return seed || debugScenario?.seed;
}

function createSeededRandom(seed: string): () => number {
    let state = 2166136261;
    for (let index = 0; index < seed.length; index += 1) {
        state ^= seed.charCodeAt(index);
        state = Math.imul(state, 16777619);
    }

    return () => {
        state += 0x6d2b79f5;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}

function createLocalSessionId(): string {
    return "local-" + Date.now().toString(36);
}

interface CreateActiveSessionInput {
    selectedGame: AnyGameCatalogEntry;
    playerNames: string[];
    deckDefinition: typeof supportedDeckDefinitions[keyof typeof supportedDeckDefinitions];
    requestedCardsPerPlayer?: number;
    requestedSeed?: string;
}

async function createActiveSession(input: CreateActiveSessionInput): Promise<CardGameSession<any>> {
    if (shouldUseWebSocketSession) {
        const session = await createRemoteGameSession({
            url: getRequestedWebSocketUrl(requestedParams),
            sessionId: requestedParams.get("session") ?? undefined
        });
        session.start();
        return session;
    }

    const session = createLocalGameSession({
        id: createLocalSessionId(),
        entry: input.selectedGame,
        playerNames: input.playerNames,
        options: {
            deckDefinition: input.deckDefinition,
            cardsPerPlayer: input.requestedCardsPerPlayer,
            random: input.requestedSeed ? createSeededRandom(input.requestedSeed) : undefined
        }
    });
    session.start();
    return session;
}

function getRequestedWebSocketUrl(params: URLSearchParams): string {
    const explicitUrl = params.get("wsUrl");
    if (explicitUrl) {
        return explicitUrl;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return protocol + "//" + window.location.hostname + ":8787/";
}

function getActiveDebugScenario(
    selection: RewriteGameSelection,
    debugScenario: RewriteDebugScenario | null
): RewriteDebugScenario | null {
    if (
        !debugScenario ||
        selection.gameId !== debugScenario.selection.gameId ||
        selection.playerCount !== debugScenario.selection.playerCount ||
        selection.deckId !== debugScenario.selection.deckId
    ) {
        return null;
    }

    return debugScenario;
}

function runDebugScenario(
    debugScenario: RewriteDebugScenario | null,
    actor: ActiveRewriteRuntime["session"]
): void {
    if (!debugScenario?.run) {
        return;
    }

    debugScenario.run(actor).catch((error) => {
        console.error("Rewrite debug scenario failed:", error);
    });
}

function syncUrl(
    selection: RewriteGameSelection,
    cardsPerPlayer?: number,
    seed?: string,
    debugScenario?: RewriteDebugScenario | null
): void {
    const nextParams = new URLSearchParams();
    nextParams.set("game", selection.gameId);
    nextParams.set("players", String(selection.playerCount));
    nextParams.set("deck", selection.deckId);
    nextParams.set("autostart", "1");
    if (cardsPerPlayer) {
        nextParams.set("cards", String(cardsPerPlayer));
    }
    if (seed) {
        nextParams.set("seed", seed);
    }
    if (debugScenario) {
        nextParams.set("scenario", debugScenario.id);
    }
    if (shouldUseWebSocketSession) {
        nextParams.set("transport", "ws");
        const explicitWsUrl = requestedParams.get("wsUrl");
        if (explicitWsUrl) {
            nextParams.set("wsUrl", explicitWsUrl);
        }
    }

    const nextUrl = window.location.pathname + "?" + nextParams.toString();
    window.history.replaceState({}, "", nextUrl);
}
