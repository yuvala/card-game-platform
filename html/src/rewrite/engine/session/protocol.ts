import type { CardGameEvent } from "../game/types";
import type { CardGameViewModel } from "../game/viewModel";

export interface SessionPlayerSummary {
    id: string;
    name: string;
}

export type RewriteClientMessage =
    | { type: "watch-session"; sessionId?: string }
    | { type: "set-viewer"; playerId: string | null }
    | { type: "game-event"; playerId?: string | null; event: CardGameEvent };

export type RewriteServerMessage =
    | {
        type: "session-view";
        sessionId: string;
        gameId: string;
        players: SessionPlayerSummary[];
        viewerId: string | null;
        viewModel: CardGameViewModel;
    }
    | { type: "error"; message: string };

export function isRewriteClientMessage(value: unknown): value is RewriteClientMessage {
    if (!value || typeof value !== "object") {
        return false;
    }

    const message = value as { type?: unknown; event?: unknown };
    if (message.type === "watch-session" || message.type === "set-viewer") {
        return true;
    }

    return message.type === "game-event" && isCardGameEvent(message.event);
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

function isCardGameEvent(value: unknown): value is CardGameEvent {
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
