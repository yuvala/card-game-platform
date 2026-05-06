import playersData from "../../../../html/data/players.json";
import { supportedDeckDefinitions } from "../../../../html/src/rewrite/engine/cards/deckDefinitions";
import { resolveDeckId, resolvePlayerCount, type AnyGameCatalogEntry } from "../../../../html/src/rewrite/engine/game/catalog";
import { createLocalGameSession, type CardGameSession } from "../../../../html/src/rewrite/engine/game/session";
import type { CardGameEvent } from "../../../../html/src/rewrite/engine/game/types";
import type {
    RewriteServerMessage,
    SessionPlayerSummary
} from "../../../../html/src/rewrite/engine/session/protocol";
import {
    DEFAULT_GAME_ID,
    getGameCatalogEntryById
} from "../../../../html/src/rewrite/games/catalog";

interface PlayerSeedRecord {
    playerName?: string;
}

export interface RewriteSessionHostOptions {
    sessionId?: string;
    gameId?: string;
    playerCount?: number;
    deckId?: string;
    cardsPerPlayer?: number;
}

export class RewriteGameSessionHost {
    readonly sessionId: string;
    private readonly entry: AnyGameCatalogEntry;
    private readonly session: CardGameSession<any>;

    constructor(options: RewriteSessionHostOptions = {}) {
        this.entry = resolveGame(options.gameId);
        this.sessionId = options.sessionId ?? "main";

        const playerCount = resolvePlayerCount(
            this.entry,
            options.playerCount,
            getSeedPlayerNames().length
        );
        const deckId = resolveDeckId(this.entry, options.deckId);
        const deckDefinition = supportedDeckDefinitions[deckId];

        this.session = createLocalGameSession({
            id: this.sessionId,
            entry: this.entry,
            playerNames: getSeedPlayerNames().slice(0, playerCount),
            options: {
                deckDefinition,
                cardsPerPlayer: options.cardsPerPlayer
            }
        });
        this.session.start();
        this.session.send({ type: "START" });
    }

    subscribe(listener: () => void): { unsubscribe(): void } {
        return this.session.subscribe(() => {
            listener();
        });
    }

    send(event: CardGameEvent): void {
        this.session.send(event);
    }

    getSessionView(viewerId: string | null): RewriteServerMessage {
        return {
            type: "session-view",
            sessionId: this.sessionId,
            gameId: this.entry.id,
            players: this.getPlayers(),
            viewerId,
            viewModel: this.session.getViewModel(viewerId)
        };
    }

    stop(): void {
        this.session.stop();
    }

    private getPlayers(): SessionPlayerSummary[] {
        return this.session.getViewModel(null).players.map((player) => ({
            id: player.id,
            name: player.nameLabel
        }));
    }
}

function resolveGame(gameId: string | null | undefined): AnyGameCatalogEntry {
    const entry = getGameCatalogEntryById(gameId) ?? getGameCatalogEntryById(DEFAULT_GAME_ID);
    if (!entry) {
        throw new Error("No rewrite game is registered in the game catalog.");
    }

    return entry;
}

function getSeedPlayerNames(): string[] {
    const records = (playersData as { players?: PlayerSeedRecord[] }).players ?? [];
    return records.map((player) => player.playerName).filter((name): name is string => Boolean(name));
}
