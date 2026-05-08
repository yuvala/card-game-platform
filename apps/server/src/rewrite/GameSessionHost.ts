import playersData from "../../../../html/data/players.json";
import { supportedDeckDefinitions } from "@rewrite-core/engine/cards/deckDefinitions";
import { resolveDeckId, resolvePlayerCount, type AnyGameCatalogEntry } from "@rewrite-core/engine/game/catalog";
import { createSeededRandom } from "@rewrite-core/engine/game/random";
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
import { runRewriteDebugScenario } from "./debugScenarios";

interface PlayerSeedRecord {
    playerName?: string;
}

export interface RewriteSessionHostOptions {
    sessionId?: string;
    gameId?: string;
    playerCount?: number;
    deckId?: string;
    cardsPerPlayer?: number;
    seed?: string;
    debugScenarioId?: string;
}

export interface RewriteClientEventResult {
    ok: boolean;
    message?: string;
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
        runRewriteDebugScenario(options.debugScenarioId, this.session);
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
        runRewriteDebugScenario(config.debugScenarioId, this.session);
        this.notify();
    }

    send(event: CardGameEvent): void {
        this.session.send(event);
    }

    sendClientEvent(playerId: string | null | undefined, event: CardGameEvent): RewriteClientEventResult {
        if (!playerId) {
            this.session.send(event);
            return { ok: true };
        }

        const validation = this.validatePlayerEvent(playerId, event);
        if (!validation.ok) {
            return validation;
        }

        this.session.send(event);
        return { ok: true };
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
                cardsPerPlayer: options.cardsPerPlayer,
                random: options.seed ? createSeededRandom(options.seed) : undefined
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

    private validatePlayerEvent(playerId: string, event: CardGameEvent): RewriteClientEventResult {
        const viewModel = this.session.getViewModel(playerId);
        const player = viewModel.players.find((candidate) => candidate.id === playerId);
        if (!player) {
            return {
                ok: false,
                message: "Unknown player for this session."
            };
        }

        switch (event.type) {
            case "SELECT_CARD": {
                const selectedCard = player.hand.find((card) => card.id === event.cardId);
                if (
                    !player.canInteract ||
                    !selectedCard?.isFaceUp ||
                    player.cardClickAction === "play"
                ) {
                    return {
                        ok: false,
                        message: "Player cannot select that card now."
                    };
                }

                return { ok: true };
            }
            case "PLAY_CARD":
                if (!viewModel.controls.canPlay || viewModel.primaryAction?.eventType !== "PLAY_CARD") {
                    return {
                        ok: false,
                        message: "Player cannot play now."
                    };
                }

                return { ok: true };
            case "START":
            case "RESTART":
            case "ANIMATION_DONE":
                return {
                    ok: false,
                    message: "Only the admin table can send table control events."
                };
            default:
                return {
                    ok: false,
                    message: "Unsupported player event."
                };
        }
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
