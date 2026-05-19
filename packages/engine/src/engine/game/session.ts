import type { CardGameCatalogOptions, GameCatalogEntry } from './catalog';
import type { CardGameEvent } from './types';
import type { CardGameActor, CardGameViewModel } from './viewModel';

export interface CardGameSession<TSnapshot> extends CardGameActor<TSnapshot> {
    readonly id: string;
    readonly gameId: string;
    readonly playerNames: readonly string[];
    start(): void;
    stop(): void;
    getViewModel(viewerId?: string | null): CardGameViewModel;
}

interface LocalGameSessionInput<TSnapshot, TOptions extends CardGameCatalogOptions> {
    id: string;
    entry: GameCatalogEntry<TSnapshot, TOptions>;
    playerNames: string[];
    options: TOptions;
}

export function createLocalGameSession<TSnapshot, TOptions extends CardGameCatalogOptions>(
    input: LocalGameSessionInput<TSnapshot, TOptions>,
): CardGameSession<TSnapshot> {
    const { id, entry, playerNames, options } = input;
    const actor = entry.createActor(playerNames, options);

    return {
        id,
        gameId: entry.id,
        playerNames: [...playerNames],
        getSnapshot: () => actor.getSnapshot(),
        subscribe: (listener) => actor.subscribe(listener),
        send: (event: CardGameEvent) => {
            actor.send(event);
        },
        start: () => {
            actor.start();
        },
        stop: () => {
            actor.stop();
        },
        getViewModel: (viewerId) => {
            return entry.getViewModel(actor.getSnapshot(), viewerId);
        },
    };
}
