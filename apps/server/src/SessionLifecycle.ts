import { logger } from './logger';

interface SessionLifecycleOptions {
    idleTimeoutMs?: number;
    onAbandoned: () => void;
}

export class SessionLifecycle {
    private readonly idleTimeoutMs: number;
    private readonly onAbandoned: () => void;
    private idleTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(options: SessionLifecycleOptions) {
        this.idleTimeoutMs = options.idleTimeoutMs ?? 30_000;
        this.onAbandoned = options.onAbandoned;
    }

    onClientConnected(clientCount: number): void {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
            logger.info({ clientCount }, 'client reconnected — idle timer cancelled');
        }
    }

    onClientDisconnected(clientCount: number): void {
        if (clientCount > 0) return;

        logger.info({ idleTimeoutMs: this.idleTimeoutMs }, 'no clients — starting idle timer');
        this.idleTimer = setTimeout(() => {
            this.idleTimer = null;
            logger.warn('session abandoned — cleaning up');
            this.onAbandoned();
        }, this.idleTimeoutMs);
    }

    destroy(): void {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }
    }
}
