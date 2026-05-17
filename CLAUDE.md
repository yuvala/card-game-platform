# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev                  # Vite dev server (browser UI, port 8000)
npm run build                # tsc type-check + Vite production build
npm run test                 # run all engine + server tests
npm run smoke                # tests + production build combined
npm run serve:ws             # compile and start WebSocket server (port 8787)
npm run build:server         # type-check server TypeScript only
```

Running a single test — compile and execute it directly:
```bash
node scripts/run-tests.cjs   # runs all; individual tests can't be run in isolation yet
```

Full manual QA flow:
1. `npm run serve:ws` in one terminal
2. `npm run dev` in another
3. Open `http://127.0.0.1:8000/lobby.html` — create a room, play vs computer

Single-player shortcut (no lobby): `player.html?game=war-lite&wsUrl=ws://localhost:8787&bots=1`
Admin table view: `rewrite.html?autostart=1`
Fallback (no WebSocket server): `rewrite.html?transport=local&autostart=1`

## Architecture

This is a monorepo with four areas:

| Path | Role |
|---|---|
| `packages/engine/src/` | Game engine + all game rules. Shared between browser and server. |
| `apps/server/src/` | WebSocket server that owns the authoritative game session. |
| `html/src/app/` | Phaser 4 rendering and browser UI. Never imported by server or engine. |
| `html/src/lobby/` | React lobby UI — Supabase auth, room creation/join, bot launch. |

### Import alias
All engine code is imported via `@engine/...` — e.g. `import { ... } from "@engine/engine/game/viewModel"`.

---

### Engine (`packages/engine/src/`)

**The engine is the table. Each game brings its own rulebook.**

Generic engine concerns (`engine/`):
- `cards/` — `DeckDefinition`, `CardInstance`, `createDeck`, deck definitions (french, spanish, italian), skin packs
- `game/types.ts` — `CardPile`, `CardPileMap`, `CardPileRole`, session/player/turn types
- `game/definition.ts` — `GameDefinition<TState, TMove, TViewModel, TEffect>` contract
- `game/piles.ts` — pure pile helpers: create, get, set, move, draw, append, clear
- `game/effects.ts` — `MoveCardEffect` and helpers (`createDealCardEffect`, etc.)
- `game/viewModel.ts` — `CardGameViewModel` and all view types the UI consumes
- `game/machineFactory.ts` — shared XState shell: idle → shuffling → dealing → playerTurn → resolve → gameOver
- `game/session.ts` — `createLocalGameSession` (browser-owned fallback)
- `session/protocol.ts` — `ClientMessage` / `ServerMessage` / `SessionConfig` WebSocket types

Game-specific modules (`games/<name>/`):
- `config.ts` — catalog metadata + pile definitions
- `definition.ts` — implements `GameDefinition`, plugs into `machineFactory`
- `setup.ts` — initial shuffle + deal
- `rules.ts` — `getLegalMoves`, `applyMove`, `isGameOver`
- `viewModel.ts` — `toViewModel(state, viewerId?)` adapter

**Piles are the source of truth for card location.** `CardPile` has `id, role, label, ownerId?, cards[], isFaceUp, isVisibleToAll`.

`GameDefinition` contract:
```ts
setup(input) → TState
getLegalMoves(state, actorId?) → TMove[]
applyMove(state, move) → { state, effects? }
isGameOver(state) → boolean
getAutomaticMove?(state) → TMove | null
toViewModel?(state, viewerId?) → TViewModel   // viewerId: null = admin/table view
```

---

### Server (`apps/server/src/`)

Owns the authoritative `GameSession` and broadcasts view models to all connected clients.

- `gameServer.ts` — entry point, starts WebSocket server on port 8787
- `GameWebSocketServer.ts` — WebSocket protocol handling, client role enforcement
- `GameSessionHost.ts` — wraps the XState actor, runs `toViewModel` per viewer

**Security model**: the server derives the acting player from the socket's declared `viewerId`. Clients cannot send a `playerId` in `game-event` messages. The server rejects events whose `expectedSequence` is older than the current session sequence, preventing stale-UI mutations.

Client roles:
- `admin` — can configure the session, set viewer, send table-level events
- `player` — can set viewer, send only viewer-scoped events

**Bot seats**: `GameSessionHost` accepts `botSeats: number[]` (seat indices). After each state change it waits 600ms then sends a legal move (`SELECT_CARD` / `PLAY_CARD`) on behalf of the first bot seat that has `canInteract`. Bots use `getLegalMoves` — no AI, random legal pick.

---

### Phaser rendering (`html/src/app/`)

The UI reads `CardGameViewModel` only. It never touches game state directly.

Key scenes:
- `TableScene.ts` — main admin table, subscribes to session, renders seats/hands/piles
- `UIScene.ts` — HUD overlay (scores, phase, primary action button)
- `BootScene.ts` — loads assets, transitions to TableScene + UIScene
- `player/scenes/PlayerTableScene.ts` — player POV scene (mobile proportions)

Presenter pipeline: `TableScene` → presenters → `effectPresenter` → animations → sound

**Animation policy (hybrid):**
- *Real card object*: hover lift, selected outline, flip-in-place (card stays in its slot)
- *Ghost card via animation layer*: deal, draw, play to table, collect, war movement (card crosses zones)

`cardAnimationLayer.ts` owns ghost card lifecycle. Ghost cards must match the original card's size, texture, angle, and depth.

**Effect flow:**
1. `applyMove` returns `effects[]` (e.g. `MoveCardEffect`)
2. `effectPresenter.ts` reads effects from `viewModel.effects`
3. `cardStackAnimations.ts` executes the animation
4. Phaser calls `onEffectsDone` → UI sends `ANIMATION_DONE` if the machine is waiting

**Animation timing constants** (in `effectPresenter.ts` `getEffectProfile`):
- `deal`: 190ms duration, 18ms stagger, `Cubic.easeInOut`
- `draw`: 220ms, 42ms stagger, `Cubic.easeOut`
- `play`: 260ms, `Back.easeOut`
- `collect`: 300ms, 48ms stagger, `Cubic.easeIn`

**Card size constants** (`scenes/layout/constants.ts`):
- Hand cards: 60×88 px
- Table cards: 74×104 px
- Owned pile cards: 42×60 px
- Supplemental pile cards: 52×74 px

---

### WebSocket protocol

```
Client → Server: watch-session | configure-session | set-viewer | game-event
Server → Client: session-view (sessionId, sequence, players, viewerId, viewModel) | error
```

`viewerId: null` = admin view. Every `session-view` carries a monotonically increasing `sequence`. Clients include `expectedSequence` on `game-event`; the server rejects stale ones.

---

### Lobby (`html/src/lobby/`)

React app served at `lobby.html`. Uses **Supabase** for anonymous auth, room persistence, and realtime updates.

Flow:
1. User enters nickname → Supabase anonymous sign-in
2. Creates or joins a room (`rooms` table) → inserted into `players` table
3. When room is full → `tryStartGame` sets `status=playing, ws_url=<fly_url>`
4. Supabase realtime fires on all clients → redirect to `player.html?room=…&game=…&wsUrl=…`
5. "Play vs Computer" → skip waiting, redirect immediately with `?bots=N`

`player.html` reads `?bots=N`: if N>0, connects as `admin`, sends `configure-session` with `botSeats`.

Supabase env vars (`.env.local`):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_WS_URL` — WebSocket server URL (default: `ws://localhost:8787`)

### CSS classes

Shell UI uses `.app*` prefix (`.appShell`, `.appSetupDock`, `.appSetupToggle`, `.appGameChoice`, `.appSegmentButton`, `.appPrimaryButton`, etc.). Defined in `html/css/app.css`, generated by `html/src/app/app/createGamePanel.ts`.

Lobby uses `.lobby*` prefix. Defined in `html/css/lobby.css`.

Player POV (`player.html`) uses `.player*` prefix — compact top bar (label + dropdown + status) + game frame + debug footer. No scroll; layout is `100vh` grid with `auto / 1fr / auto` rows.

---

## Adding a new game

1. Create `packages/engine/src/games/<name>/`
2. Implement `config.ts`, `types.ts`, `setup.ts`, `rules.ts`, `definition.ts`, `viewModel.ts`
3. Register in `packages/engine/src/games/catalog.ts`
4. No Phaser changes needed — the generic scenes render through the view model

## What must not cross boundaries

- Game rules must not call Phaser APIs
- `TableScene` must not check which game is running (no `if game === "brisca"`)
- Sound calls belong in presenters/animations, not in game rules
- Player clients must not receive real card ids/labels for hidden cards — sanitize in `toViewModel`
