export interface SessionPlayerSummary {
    id: string;
    name: string;
}

export type RewriteProtocolGameEvent =
    | { type: 'START' }
    | { type: 'SELECT_CARD'; cardId: string }
    | { type: 'PLAY_CARD' }
    | { type: 'ANIMATION_DONE' }
    | { type: 'RESTART' };

export interface SessionConfig {
    gameId: string;
    playerCount: number;
    deckId: string;
    cardsPerPlayer?: number;
    seed?: string;
    debugScenarioId?: string;
    botSeats?: number[];
}

export type ClientRole = 'admin' | 'player';

export type ClientMessage =
    | { type: 'watch-session'; sessionId?: string; role?: ClientRole }
    | { type: 'configure-session'; config: SessionConfig }
    | { type: 'set-viewer'; playerId: string | null }
    | { type: 'game-event'; expectedSequence?: number; event: RewriteProtocolGameEvent };

export type ServerMessage =
    | {
          type: 'session-view';
          sessionId: string;
          gameId: string;
          sequence: number;
          players: SessionPlayerSummary[];
          viewerId: string | null;
          viewModel: unknown;
      }
    | { type: 'error'; message: string };

export function isClientMessage(value: unknown): value is ClientMessage {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const message = value as {
        type?: unknown;
        role?: unknown;
        event?: unknown;
        config?: unknown;
        playerId?: unknown;
        expectedSequence?: unknown;
    };
    if (message.type === 'watch-session') {
        return (
            typeof message.role === 'undefined' ||
            message.role === 'admin' ||
            message.role === 'player'
        );
    }

    if (message.type === 'set-viewer') {
        return typeof message.playerId === 'string' || message.playerId === null;
    }

    if (message.type === 'configure-session') {
        return isSessionConfig(message.config);
    }

    return (
        message.type === 'game-event' &&
        typeof message.playerId === 'undefined' &&
        (typeof message.expectedSequence === 'undefined' ||
            (typeof message.expectedSequence === 'number' &&
                Number.isFinite(message.expectedSequence))) &&
        isRewriteProtocolGameEvent(message.event)
    );
}

export function isServerMessage(value: unknown): value is ServerMessage {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const message = value as { type?: unknown; viewModel?: unknown; players?: unknown };
    if (message.type === 'error') {
        return typeof (message as { message?: unknown }).message === 'string';
    }

    return (
        message.type === 'session-view' &&
        typeof (message as { sessionId?: unknown }).sessionId === 'string' &&
        typeof (message as { gameId?: unknown }).gameId === 'string' &&
        typeof (message as { sequence?: unknown }).sequence === 'number' &&
        Number.isFinite((message as { sequence?: number }).sequence) &&
        Array.isArray(message.players) &&
        Boolean(message.viewModel)
    );
}

function isRewriteProtocolGameEvent(value: unknown): value is RewriteProtocolGameEvent {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const event = value as { type?: unknown; cardId?: unknown };
    switch (event.type) {
        case 'START':
        case 'PLAY_CARD':
        case 'ANIMATION_DONE':
        case 'RESTART':
            return true;
        case 'SELECT_CARD':
            return typeof event.cardId === 'string';
        default:
            return false;
    }
}

function isSessionConfig(value: unknown): value is SessionConfig {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const config = value as {
        gameId?: unknown;
        playerCount?: unknown;
        deckId?: unknown;
        cardsPerPlayer?: unknown;
        seed?: unknown;
        debugScenarioId?: unknown;
        botSeats?: unknown;
    };

    return (
        typeof config.gameId === 'string' &&
        typeof config.playerCount === 'number' &&
        Number.isFinite(config.playerCount) &&
        typeof config.deckId === 'string' &&
        (typeof config.cardsPerPlayer === 'undefined' ||
            (typeof config.cardsPerPlayer === 'number' &&
                Number.isFinite(config.cardsPerPlayer))) &&
        (typeof config.seed === 'undefined' || typeof config.seed === 'string') &&
        (typeof config.debugScenarioId === 'undefined' ||
            typeof config.debugScenarioId === 'string') &&
        (typeof config.botSeats === 'undefined' ||
            (Array.isArray(config.botSeats) && config.botSeats.every((s) => typeof s === 'number')))
    );
}
