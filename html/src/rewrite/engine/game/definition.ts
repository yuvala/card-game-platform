import type { CardGameDefinition, CardGameOptions } from "./types";

export interface CardGameSetupInput<TOptions = CardGameOptions> {
    playerNames: string[];
    options: TOptions;
}

export interface GameTransition<TState, TEffect = never> {
    state: TState;
    effects?: TEffect[];
}

export interface GameDefinition<
    TState,
    TMove extends { type: string },
    TViewModel = unknown,
    TEffect = never,
    TOptions = CardGameOptions,
    TActorId = string,
    TViewSource = TState
> extends CardGameDefinition {
    setup(input: CardGameSetupInput<TOptions>): TState;
    getLegalMoves(state: TState, actorId?: TActorId | null): readonly TMove[];
    applyMove(state: TState, move: TMove): GameTransition<TState, TEffect>;
    isGameOver(state: TState): boolean;
    getAutomaticMove?(state: TState): TMove | null;
    toViewModel?(source: TViewSource, viewerId?: TActorId | null): TViewModel;
}
