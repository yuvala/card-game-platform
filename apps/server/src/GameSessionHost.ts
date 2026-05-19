import playersData from '../../../apps/client/data/players.json';
import { supportedDeckDefinitions } from '@engine/engine/cards/deckDefinitions';
import {
    resolveDeckId,
    resolvePlayerCount,
    type AnyGameCatalogEntry,
} from '@engine/engine/game/catalog';
import { createSeededRandom } from '@engine/engine/game/random';
import { createLocalGameSession, type CardGameSession } from '@engine/engine/game/session';
import type { CardGameEvent } from '@engine/engine/game/types';
import type { ServerMessage, SessionConfig, SessionPlayerSummary } from '@engine/session/protocol';
import { DEFAULT_GAME_ID, getGameCatalogEntryById } from '@engine/games/catalog';
import { runDebugScenario } from './debugScenarios';

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

export class GameSessionHost {
    readonly sessionId: string;
    private entry: AnyGameCatalogEntry;
    private session: CardGameSession<any>;
    private sessionSubscription: { unsubscribe(): void } | null = null;
    private readonly listeners = new Set<() => void>();
    private sequence = 0;
    private botSeatIndices: Set<number> = new Set();
    private botTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(options: RewriteSessionHostOptions = {}) {
        this.sessionId = options.sessionId ?? 'main';
        this.entry = resolveGame(options.gameId);
        this.session = this.createSession(options);
        this.startSession();
        runDebugScenario(options.debugScenarioId, this.session);
    }

    setBotSeats(indices: number[]): void {
        this.botSeatIndices = new Set(indices);
    }

    subscribe(listener: () => void): { unsubscribe(): void } {
        this.listeners.add(listener);
        return {
            unsubscribe: () => {
                this.listeners.delete(listener);
            },
        };
    }

    configure(config: SessionConfig): void {
        this.sessionSubscription?.unsubscribe();
        this.session.stop();
        this.entry = resolveGame(config.gameId);
        this.session = this.createSession(config);
        if (config.botSeats) {
            this.setBotSeats(config.botSeats);
        }
        this.startSession();
        runDebugScenario(config.debugScenarioId, this.session);
        this.notify();
    }

    send(event: CardGameEvent): void {
        this.session.send(event);
    }

    sendClientEvent(
        playerId: string | null | undefined,
        event: CardGameEvent,
        expectedSequence?: number,
    ): RewriteClientEventResult {
        if (typeof expectedSequence === 'number' && expectedSequence < this.sequence) {
            return {
                ok: false,
                message: 'Client action is stale. Refreshing table state.',
            };
        }

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

    getSessionView(viewerId: string | null): ServerMessage {
        return {
            type: 'session-view',
            sessionId: this.sessionId,
            gameId: this.entry.id,
            sequence: this.sequence,
            players: this.getPlayers(),
            viewerId,
            viewModel: this.session.getViewModel(viewerId),
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
            name: player.nameLabel,
        }));
    }

    private createSession(options: RewriteSessionHostOptions): CardGameSession<any> {
        const playerCount = resolvePlayerCount(
            this.entry,
            options.playerCount,
            getSeedPlayerNames().length,
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
                random: options.seed ? createSeededRandom(options.seed) : undefined,
            },
        });
    }

    private startSession(): void {
        this.sessionSubscription = this.session.subscribe(() => {
            this.notify();
        });
        this.session.start();
        this.session.send({ type: 'START' });
    }

    private notify(): void {
        this.sequence += 1;
        this.listeners.forEach((listener) => {
            listener();
        });
        this.scheduleBotMove();
    }

    private scheduleBotMove(): void {
        if (this.botSeatIndices.size === 0) return;
        if (this.botTimer) clearTimeout(this.botTimer);
        this.botTimer = setTimeout(() => {
            this.botTimer = null;
            this.runBotMove();
        }, 600);
    }

    private runBotMove(): void {
        const viewModel = this.session.getViewModel(null);
        const botPlayer = viewModel.players.find(
            (p, i) => this.botSeatIndices.has(i) && p.canInteract,
        );
        if (!botPlayer) return;

        const snapshot = this.session.getSnapshot();
        const moves = this.entry.definition.getLegalMoves(snapshot.context, botPlayer.id);
        if (moves.length === 0) return;

        // For games that need select-card then queue-play, send both
        const selectMove = moves.find((m: any) => m.type === 'select-card');
        const playMove = moves.find((m: any) => m.type === 'queue-play');

        if (selectMove && !playMove) {
            const cardMoves = moves.filter((m: any) => m.type === 'select-card');
            const pick = cardMoves[Math.floor(Math.random() * cardMoves.length)];
            this.session.send({ type: 'SELECT_CARD', cardId: pick.cardId });
        } else if (playMove) {
            this.session.send({ type: 'PLAY_CARD' });
        }
    }

    private validatePlayerEvent(playerId: string, event: CardGameEvent): RewriteClientEventResult {
        const viewModel = this.session.getViewModel(playerId);
        const player = viewModel.players.find((candidate) => candidate.id === playerId);
        if (!player) {
            return {
                ok: false,
                message: 'Unknown player for this session.',
            };
        }

        switch (event.type) {
            case 'SELECT_CARD': {
                const selectedCard = player.hand.find((card) => card.id === event.cardId);
                if (
                    !player.canInteract ||
                    !selectedCard?.isFaceUp ||
                    player.cardClickAction === 'play'
                ) {
                    return {
                        ok: false,
                        message: 'Player cannot select that card now.',
                    };
                }

                return { ok: true };
            }
            case 'PLAY_CARD':
                if (
                    !viewModel.controls.canPlay ||
                    viewModel.primaryAction?.eventType !== 'PLAY_CARD'
                ) {
                    return {
                        ok: false,
                        message: 'Player cannot play now.',
                    };
                }

                return { ok: true };
            case 'ANIMATION_DONE':
                return { ok: true };
            case 'START':
            case 'RESTART':
                return {
                    ok: false,
                    message: 'Only the admin table can send table control events.',
                };
            default:
                return {
                    ok: false,
                    message: 'Unsupported player event.',
                };
        }
    }
}

function resolveGame(gameId: string | null | undefined): AnyGameCatalogEntry {
    const entry = getGameCatalogEntryById(gameId) ?? getGameCatalogEntryById(DEFAULT_GAME_ID);
    if (!entry) {
        throw new Error('No game is registered in the game catalog.');
    }

    return entry;
}

function getSeedPlayerNames(): string[] {
    const records = (playersData as { players?: PlayerSeedRecord[] }).players ?? [];
    return records
        .map((player) => player.playerName)
        .filter((name): name is string => Boolean(name));
}
