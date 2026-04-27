import playersData from "../../data/players.json";
import { supportedDeckDefinitions } from "./engine/cards/deckDefinitions";
import { resolveDeckId, resolvePlayerCount, type AnyGameCatalogEntry } from "./engine/game/catalog";
import {
    DEFAULT_GAME_ID,
    gameCatalogEntries,
    getGameCatalogEntryById
} from "./games/catalog";
import { createGamePanel, type RewriteGameSelection } from "./app/createGamePanel";
import { createRewriteGame } from "./phaser/createRewriteGame";

interface ActiveRewriteRuntime {
    actor: ReturnType<AnyGameCatalogEntry["createActor"]>;
    game: ReturnType<typeof createRewriteGame>;
}

const seedPlayerNames = playersData.players.map((player) => player.playerName);
const rewriteRoot = document.getElementById("rewrite-root");
const rewriteSetupMount = document.getElementById("rewrite-setup");
const requestedParams = new URLSearchParams(window.location.search);

if (!rewriteRoot || !rewriteSetupMount) {
    throw new Error("Rewrite app requires #rewrite-root and #rewrite-setup containers.");
}

const rootElement = rewriteRoot;
const setupMountElement = rewriteSetupMount;

let activeRuntime: ActiveRewriteRuntime | null = null;

const initialSelection = getInitialSelection(requestedParams);
const setupPanel = createGamePanel({
    container: setupMountElement,
    entries: gameCatalogEntries,
    initialSelection,
    initialOpen: requestedParams.get("autostart") !== "1",
    getDeckLabel: (deckId) => supportedDeckDefinitions[deckId].name,
    getPlayerNames: (playerCount) => buildPlayerNames(playerCount),
    onStart: (selection) => {
        startGame(selection);
    }
});

renderEmptyTable();

if (requestedParams.get("autostart") === "1") {
    startGame(setupPanel.getSelection());
}

function startGame(selection: RewriteGameSelection): void {
    const selectedGame = resolveSelectedGame(selection.gameId);
    const normalizedSelection = {
        gameId: selectedGame.id,
        playerCount: resolvePlayerCount(selectedGame, selection.playerCount, selectedGame.maxPlayers),
        deckId: resolveDeckId(selectedGame, selection.deckId)
    };
    const playerNames = buildPlayerNames(normalizedSelection.playerCount);
    const deckDefinition = supportedDeckDefinitions[normalizedSelection.deckId];
    const requestedCardsPerPlayer = getRequestedCardsPerPlayer(requestedParams);
    const requestedSeed = getRequestedSeed(requestedParams);

    teardownActiveRuntime();

    rootElement.replaceChildren();
    rootElement.classList.remove("is-empty");

    const actor = selectedGame.createActor(playerNames, {
        deckDefinition,
        cardsPerPlayer: requestedCardsPerPlayer,
        random: requestedSeed ? createSeededRandom(requestedSeed) : undefined
    });
    actor.start();

    const game = createRewriteGame("rewrite-root", actor, selectedGame.getViewModel);
    actor.send({ type: "START" });

    activeRuntime = {
        actor,
        game
    };

    setupPanel.updateActiveTable({
        gameLabel: selectedGame.label,
        deckLabel: deckDefinition.name,
        playerNames
    });

    syncUrl(normalizedSelection, requestedCardsPerPlayer, requestedSeed);
}

function teardownActiveRuntime(): void {
    if (!activeRuntime) {
        return;
    }

    activeRuntime.actor.stop();
    activeRuntime.game.destroy(true);
    activeRuntime = null;
}

function renderEmptyTable(): void {
    rootElement.classList.add("is-empty");
    rootElement.replaceChildren(createEmptyState());
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

function getInitialSelection(params: URLSearchParams): RewriteGameSelection {
    const selectedGame = resolveSelectedGame(params.get("game"));

    return {
        gameId: selectedGame.id,
        playerCount: resolvePlayerCount(selectedGame, Number(params.get("players")), selectedGame.maxPlayers),
        deckId: resolveDeckId(selectedGame, params.get("deck"))
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

function buildPlayerNames(playerCount: number): string[] {
    return Array.from({ length: playerCount }, (_, index) => {
        return seedPlayerNames[index] ?? "Player " + String(index + 1);
    });
}

function getRequestedCardsPerPlayer(params: URLSearchParams): number | undefined {
    const requestedCards = Number(params.get("cards"));
    if (!Number.isFinite(requestedCards) || requestedCards <= 0) {
        return undefined;
    }

    return Math.floor(requestedCards);
}

function getRequestedSeed(params: URLSearchParams): string | undefined {
    const seed = params.get("seed")?.trim();
    return seed || undefined;
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

function syncUrl(selection: RewriteGameSelection, cardsPerPlayer?: number, seed?: string): void {
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

    const nextUrl = window.location.pathname + "?" + nextParams.toString();
    window.history.replaceState({}, "", nextUrl);
}
