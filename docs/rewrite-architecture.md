# Rewrite Architecture

This document describes the architecture of the `Phaser + XState` rewrite under `html/src/rewrite/`.

The goal is not to build one giant state shape that magically fits every card game. The goal is to build:

- a small generic engine kernel
- game-specific rule modules
- generic UI scenes that render a game through a view model adapter

## Current Status

The rewrite is already beyond a single `drawPoker` prototype. It currently includes:

- a game catalog and Create Game flow
- three concrete games: `draw-poker`, `war-lite`, and `brisca-lite`
- generic `piles` as the source of truth for card locations
- a shared `machineFactory` for the common `XState` shell
- shared `Phaser` scenes that render through a generic view model

This document therefore describes both the design goal and the parts that are already implemented.

## Why This Exists

The rewrite started with `drawPoker`, but the long-term goal is broader:

- support multiple card games on the same runtime
- keep game rules separate from rendering
- make it possible to add games like `Brisca` without rewriting the UI shell
- avoid hard-coding one game's assumptions into the engine

## Design Principle

Keep only the stable parts generic.

Generic engine concerns:

- cards and deck definitions
- players
- piles / zones
- turn ownership
- card selection
- session status
- UI-facing view model contract

Game-specific concerns:

- trick resolution
- trump rules
- scoring rules
- legal moves
- hidden information rules
- betting, capture, drafting, melding, or any other game mechanic

The engine is the table.  
Each game brings its own rulebook.

## Current Structure

Current rewrite code is split into these areas:

- `html/src/rewrite/engine/cards/`
  Generic card and deck support.
- `html/src/rewrite/engine/game/types.ts`
  Base session, player, turn, options, and event types.
- `html/src/rewrite/engine/game/definition.ts`
  The generic game contract used by concrete games.
- `html/src/rewrite/engine/game/piles.ts`
  Generic pile helpers such as create, move, draw, append, and clear.
- `html/src/rewrite/engine/game/machineFactory.ts`
  Shared `XState` shell for the common card-game runtime flow.
- `html/src/rewrite/engine/game/viewModel.ts`
  Generic actor and view model contracts used by the UI.
- `html/src/rewrite/engine/game/catalog.ts`
  Shared catalog metadata and runtime entry contract.
- `html/src/rewrite/games/drawPoker/`
  Concrete game implementation.
- `html/src/rewrite/games/warLite/`
  Concrete game implementation.
- `html/src/rewrite/games/briscaLite/`
  Concrete game implementation.
- `html/src/rewrite/games/catalog.ts`
  Registration of currently available games.
- `html/src/rewrite/phaser/`
  Generic `Phaser` scenes and game bootstrap.
- `html/src/rewrite/phaser/scenes/layout/`
  Pure layout helpers for seats, hands, table cards, and pile placement.

## Visual Overview

The diagrams below use `Mermaid`, so they render in Markdown viewers that support it.

### System Map

```mermaid
flowchart LR
    subgraph Engine
        Cards[engine/cards<br/>DeckDefinition + CardInstance]
        GameCore[engine/game<br/>types + definition + piles + viewModel]
        MachineFactory[engine/game<br/>machineFactory]
    end

    subgraph GameModule
        DrawPoker[games/drawPoker]
        WarLite[games/warLite]
        BriscaLite[games/briscaLite]
        FutureGame[games/futureGame]
    end

    subgraph Runtime
        Machine[XState machine]
        Scenes[Phaser scenes]
    end

    Cards --> DrawPoker
    Cards --> WarLite
    Cards --> BriscaLite
    Cards --> FutureGame
    GameCore --> DrawPoker
    GameCore --> WarLite
    GameCore --> BriscaLite
    GameCore --> FutureGame
    DrawPoker --> MachineFactory
    WarLite --> MachineFactory
    BriscaLite --> MachineFactory
    FutureGame --> MachineFactory
    MachineFactory --> Machine
    Scenes --> Machine
    Machine --> Scenes
```

### Contract Ownership

```mermaid
classDiagram
    class GameDefinition {
        +id
        +name
        +setup()
        +getLegalMoves()
        +applyMove()
        +isGameOver()
        +getAutomaticMove()
        +toViewModel()
    }

    class DrawPokerDefinition
    class MachineFactory
    class CardPileMap
    class CardGameViewModel
    class TableScene
    class UIScene

    GameDefinition <|.. DrawPokerDefinition
    DrawPokerDefinition --> CardPileMap : uses
    MachineFactory --> DrawPokerDefinition : drives
    DrawPokerDefinition --> CardGameViewModel : builds
    TableScene --> CardGameViewModel : renders
    UIScene --> CardGameViewModel : renders
```

## What Must Stay Generic

These parts belong in the engine:

- `DeckDefinition`
- `CardInstance`
- `CardPile` / `CardPileMap`
- generic game/session/turn types
- generic UI events such as `START`, `SELECT_CARD`, `PLAY_CARD`, `ANIMATION_DONE`, `RESTART`
- generic `CardGameViewModel`
- generic machine shell
- generic `Phaser` scenes that render the view model

If a new game can reuse it without changing its meaning, it is a good candidate for the engine.

## What Must Not Be Generic

These parts belong inside each game module:

- card ranking logic
- card point values
- rules for who wins a trick or round
- game-over conditions
- hand size rules
- draw timing
- visibility rules for opponent cards
- special zones like trump cards, captured piles, betting pots, meld areas, or trick stacks

If a rule only makes sense for one family of games, it should not be pushed into the engine.

## How Game-Specific Logic Should Be Implemented

Each game should own its own module under:

- `html/src/rewrite/games/<game-name>/`

Recommended files:

- `types.ts`
- `definition.ts`
- `setup.ts`
- `rules.ts`
- `viewModel.ts`

Expected responsibilities:

- `types.ts`
  Game-specific state and helper types.
- `definition.ts`
  The public contract that plugs the game into the engine shell.
- `setup.ts`
  Initial game creation and initial dealing logic.
- `rules.ts`
  Pure rule functions that compute legal moves and state transitions.
- `viewModel.ts`
  Adapter from internal game state to generic UI data.

## Implemented Game Contract

The generic game contract now lives at:

- `html/src/rewrite/engine/game/definition.ts`

Concrete games implement it through files such as:

- `html/src/rewrite/games/drawPoker/definition.ts`
- `html/src/rewrite/games/warLite/definition.ts`
- `html/src/rewrite/games/briscaLite/definition.ts`

Example shape:

```ts
interface GameDefinition<TState, TMove, TViewModel, TEffect = never> {
  id: string;
  name: string;
  setup(input: { playerNames: string[]; options: CardGameOptions }): TState;
  getLegalMoves(state: TState, actorId?: string | null): TMove[];
  applyMove(state: TState, move: TMove): {
    state: TState;
    effects?: TEffect[];
  };
  isGameOver(state: TState): boolean;
  getAutomaticMove?(state: TState): TMove | null;
  toViewModel?(state: TState, viewerId?: string | null): TViewModel;
}
```

This lets the engine ask a game:

- how to start
- what moves are allowed
- what happens after a move
- when the game ends
- what the UI should render

### Runtime Flow

```mermaid
sequenceDiagram
    participant User
    participant Scene as Phaser Scene
    participant Actor as XState Actor
    participant Machine as XState Machine
    participant Factory as machineFactory
    participant Definition as GameDefinition

    User->>Scene: click button / select card
    Scene->>Actor: send(CardGameEvent)
    Actor->>Machine: event transition
    Machine->>Factory: shared shell step
    Factory->>Definition: applyMove(...)
    Definition-->>Machine: next state
    Machine->>Definition: toViewModel(...)
    Definition-->>Scene: CardGameViewModel
    Scene-->>User: render updated table + HUD
```

## Source Of Truth

The rewrite now treats `piles` as the authoritative location for cards.

That means:

- player identity and score live on `players`
- card location lives in `piles`
- hand, stock, trump, trick, capture, and similar zones are represented as piles

This avoids keeping the same card location in multiple places at once.

The one notable remaining exception is `discardPile` in some game contexts, where it still acts as played-card history rather than a raw card zone.

Example shape:

```ts
interface CardPile<TCard> {
  id: string;
  role: "stock" | "discard" | "hand" | "table" | "capture" | "trump" | "custom";
  label: string;
  ownerId?: string;
  cards: TCard[];
  isFaceUp: boolean;
  isVisibleToAll: boolean;
}
```

## Shared Machine Shell

The rewrite also now uses:

- `html/src/rewrite/engine/game/machineFactory.ts`

This file holds the shared `XState` shell for the common runtime flow:

- `idle`
- `shuffling`
- `dealing`
- ready state such as `playerTurn` or `battleReady`
- optional animation/reveal state
- resolve state
- `gameOver`

Each game now plugs in:

- its own move types
- its own timing values
- which move prepares the ready state
- which move is the playable action
- how automatic resolution advances

## How This Applies To Brisca

`Brisca` is a useful example because it proves why game-specific rules must stay out of the engine.

`Brisca` needs concepts such as:

- a trump card / trump suit
- trick winner logic
- card point values that differ from simple rank order
- draw-after-trick flow
- lead player ownership for the next trick

Those should live in:

- `games/brisca/types.ts`
- `games/brisca/rules.ts`
- `games/brisca/viewModel.ts`

The engine should not know what a trump suit is.  
It should only know how to host a game that does.

### Adding A New Game

```mermaid
flowchart TD
    A[Create games/newGame folder] --> B[Define game-specific types]
    B --> C[Implement rules and setup]
    C --> D[Implement definition.ts]
    D --> E[Implement viewModel.ts]
    E --> F[Plug definition into machine/bootstrap]
    F --> G[Reuse generic Phaser scenes]
```

## Simple Mental Model

Think about the system like this:

- `engine/cards` = what cards exist
- `engine/game` = what a playable game session looks like
- `games/<name>` = the rules for one specific game
- `phaser/scenes/layout` = where table geometry is computed
- `phaser/scenes` = where a session is orchestrated and drawn on screen

The UI should never ask:

- "Is this Brisca?"
- "Who wins a trick in Spanish deck games?"
- "How many points is an Ace worth?"

The UI should only ask:

- "What do I draw?"
- "What can the player click?"
- "What text should I show?"

`TableScene` should act mostly like a director:

- subscribe to the current view model
- ask layout helpers for positions
- create or reuse display objects
- apply visual state and animations

It should not be the long-term home for all seat math, pile placement rules, and card spacing formulas.

## Recommended Next Steps

1. Continue removing transitional legacy fields where `piles` already provide the same information.
2. Replace more scene-local layout assumptions with view-model-driven layout hints where useful.
3. Keep `discardPile` only where it is truly history data and not just another card zone.
4. Add tests around pile helpers and machine transitions so architecture changes stay safe.
5. Move to a fuller `Brisca` ruleset only after the current `Brisca-lite` contract remains stable.

## Short Version

Do not try to make all rules generic.  
Make the runtime generic, and let each game provide its own rules.
