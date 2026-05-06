import playersData from "../../../../html/data/players.json";
import { supportedDeckDefinitions } from "@rewrite-core/engine/cards/deckDefinitions";
import { resolveDeckId, resolvePlayerCount, type AnyGameCatalogEntry } from "@rewrite-core/engine/game/catalog";
import { createLocalGameSession, type CardGameSession } from "@rewrite-core/engine/game/session";
import type { CardGameEvent } from "@rewrite-core/engine/game/types";
import type {
    RewriteServerMessage,
    RewriteSessionConfig,
    SessionPlayerSummary
} from "@rewrite-core/session/protocol";
import {
    DEFAULT_GAME_ID,
    getGameCatalogEntryById
} from "@rewrite-core/games/catalog";

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
    private entry: AnyGameCatalogEntry;
    private session: CardGameSession<any>;
    private sessionSubscription: { unsubscribe(): void } | null = null;
    private readonly listeners = new Set<() => void>();

    constructor(options: RewriteSessionHostOptions = {}) {
        this.sessionId = options.sessionId ?? "main";
        this.entry = resolveGame(options.gameId);
        this.session = this.createSession(options);
        this.startSession();
    }

    subscribe(listener: () => void): { unsubscribe(): void } {
        this.listeners.add(listener);
        return {
            unsubscribe: () => {
                this.listeners.delete(listener);
            }
        };
    }

    configure(config: RewriteSessionConfig): void {
        this.sessionSubscription?.unsubscribe();
        this.session.stop();
        this.entry = resolveGame(config.gameId);
        this.session = this.createSession(config);
        this.startSession();
        this.notify();
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
        this.sessionSubscription?.unsubscribe();
        this.sessionSubscription = null;
        this.session.stop();
    }

    private getPlayers(): SessionPlayerSummary[] {
        return this.session.getViewModel(null).players.map((player) => ({
            id: player.id,
            name: player.nameLabel
        }));
    }

    private createSession(options: RewriteSessionHostOptions): CardGameSession<any> {
        const playerCount = resolvePlayerCount(
            this.entry,
            options.playerCount,
            getSeedPlayerNames().length
        );
        const deckId = resolveDeckId(this.entry, options.deckId);
        const deckDefinition = supportedDeckDefinitions[deckId];

        return createLocalGameSession({
            id: this.sessionId,
            entry: this.entry,
            playerNames: getSeedPlayerNames().slice(0, playerCount),
            options: {
                deckDefinition,
                cardsPerPlayer: options.cardsPerPlayer
            }
        });
    }

    private startSession(): void {
        this.sessionSubscription = this.session.subscribe(() => {
            this.notify();
        });
        this.session.start();
        this.session.send({ type: "START" });
    }

    private notify(): void {
        this.listeners.forEach((listener) => {
            listener();
        });
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
