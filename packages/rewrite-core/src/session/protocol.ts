export interface SessionPlayerSummary {
    id: string;
    name: string;
}

export type RewriteProtocolGameEvent =
    | { type: "START" }
    | { type: "SELECT_CARD"; cardId: string }
    | { type: "PLAY_CARD" }
    | { type: "ANIMATION_DONE" }
    | { type: "RESTART" };

export interface RewriteSessionConfig {
    gameId: string;
    playerCount: number;
    deckId: string;
    cardsPerPlayer?: number;
}

export type RewriteClientMessage =
    | { type: "watch-session"; sessionId?: string }
    | { type: "configure-session"; config: RewriteSessionConfig }
    | { type: "set-viewer"; playerId: string | null }
    | { type: "game-event"; playerId?: string | null; event: RewriteProtocolGameEvent };

export type RewriteServerMessage =
    | {
        type: "session-view";
        sessionId: string;
        gameId: string;
        players: SessionPlayerSummary[];
        viewerId: string | null;
        viewModel: unknown;
    }
    | { type: "error"; message: string };

export function isRewriteClientMessage(value: unknown): value is RewriteClientMessage {
    if (!value || typeof value !== "object") {
        return false;
    }

    const message = value as { type?: unknown; event?: unknown; config?: unknown };
    if (message.type === "watch-session" || message.type === "set-viewer") {
        return true;
    }

    if (message.type === "configure-session") {
        return isRewriteSessionConfig(message.config);
    }

    return message.type === "game-event" && isRewriteProtocolGameEvent(message.event);
}

export function isRewriteServerMessage(value: unknown): value is RewriteServerMessage {
    if (!value || typeof value !== "object") {
        return false;
    }

    const message = value as { type?: unknown; viewModel?: unknown; players?: unknown };
    if (message.type === "error") {
        return typeof (message as { message?: unknown }).message === "string";
    }

    return (
        message.type === "session-view" &&
        typeof (message as { sessionId?: unknown }).sessionId === "string" &&
        typeof (message as { gameId?: unknown }).gameId === "string" &&
        Array.isArray(message.players) &&
        Boolean(message.viewModel)
    );
}

function isRewriteProtocolGameEvent(value: unknown): value is RewriteProtocolGameEvent {
    if (!value || typeof value !== "object") {
        return false;
    }

    const event = value as { type?: unknown; cardId?: unknown };
    switch (event.type) {
        case "START":
        case "PLAY_CARD":
        case "ANIMATION_DONE":
        case "RESTART":
            return true;
        case "SELECT_CARD":
            return typeof event.cardId === "string";
        default:
            return false;
    }
}

function isRewriteSessionConfig(value: unknown): value is RewriteSessionConfig {
    if (!value || typeof value !== "object") {
        return false;
    }

    const config = value as {
        gameId?: unknown;
        playerCount?: unknown;
        deckId?: unknown;
        cardsPerPlayer?: unknown;
    };

    return (
        typeof config.gameId === "string" &&
        typeof config.playerCount === "number" &&
        Number.isFinite(config.playerCount) &&
        typeof config.deckId === "string" &&
        (
            typeof config.cardsPerPlayer === "undefined" ||
            (
                typeof config.cardsPerPlayer === "number" &&
                Number.isFinite(config.cardsPerPlayer)
            )
        )
    );
}
