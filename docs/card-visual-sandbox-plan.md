# Card Visual Sandbox Plan

## Goal

Create a dedicated development sandbox for card visuals and card animations.

The sandbox should let us inspect and tune card rendering without running a full game such as War Lite, Brisca Lite, or Poker Lite.

This is a developer tool, not a player-facing game mode.

## Why This Matters

Today, checking card visuals requires reaching a specific game state. That makes visual work slow and noisy:

- card face/back rendering is tied to game flow
- flip and collect animations require specific game states
- stacked-card behavior is hard to inspect in isolation
- French and Spanish decks are not easy to compare side by side
- changes in shared Phaser card helpers can regress multiple games without an isolated preview surface

A sandbox gives us a focused place to test card texture quality, sizing, outlines, orientation, stacking, and animations before connecting changes back into the games.

## Proposed Entry

Prefer a standalone HTML page:

```text
html/card-sandbox.html
```

Current entry:

```text
http://127.0.0.1:8000/card-sandbox.html
```

Current implementation files:

```text
html/src/rewrite/dev/cardSandboxMain.ts
html/src/rewrite/dev/createCardSandboxGame.ts
html/src/rewrite/dev/scenes/CardSandboxScene.ts
html/src/rewrite/dev/cardSandbox/
html/src/rewrite/phaser/scenes/animations/cardAnimationLayer.ts
html/src/rewrite/phaser/scenes/animations/cardMotionAnimations.ts
```

This keeps the sandbox separate from:

- `rewrite.html` admin/table UI
- `player.html` player POV UI
- game rules
- WebSocket session flow

## Architecture Boundaries

The sandbox should not create or own a game session.

It should not use:

- XState game actors
- `GameSession`
- WebSocket server/client
- War/Brisca/Poker rules

It should use shared visual infrastructure:

```text
html/src/rewrite/phaser/cards/CardTextureFactory.ts
html/src/rewrite/phaser/scenes/animations/
html/src/rewrite/phaser/scenes/audio/
packages/rewrite-core/src/engine/cards/
```

If animation helpers are too game-specific, extract generic pieces into reusable animation functions under:

```text
html/src/rewrite/phaser/scenes/animations/
```

## Deck Support

The sandbox must use the real deck definitions already used by the games.

Source:

```ts
import { supportedDeckDefinitions } from "@rewrite-core/engine/cards/deckDefinitions";
import { createDeck } from "@rewrite-core/engine/cards/createDeck";
```

Expected deck choices:

- French
- Spanish

The sandbox should not define fake cards unless a test-only visual case requires it.

## Texture Flow

Use the same texture pipeline as the actual table scenes:

```ts
import { getCardSkinById } from "@rewrite-core/engine/cards/skinPacks";
import {
  ensureDeckTextures,
  getCardBackTextureKey,
  getCardFaceTextureKey
} from "../phaser/cards/CardTextureFactory";
```

Flow:

1. Select `deckId`.
2. Resolve `deckDefinition` from `supportedDeckDefinitions`.
3. Create sample cards with `createDeck(deckDefinition)`.
4. Resolve skin with `getCardSkinById`.
5. Call `ensureDeckTextures(scene, deckDefinition, skin)`.
6. Render face/back images with `getCardFaceTextureKey` and `getCardBackTextureKey`.

Example:

```ts
const deckDefinition = supportedDeckDefinitions[selectedDeckId];
const deck = createDeck(deckDefinition);
const skin = getCardSkinById("vintage-european");

ensureDeckTextures(scene, deckDefinition, skin);

const card = deck[0];
const textureKey = getCardFaceTextureKey(card.id, skin.id, "showcase");
scene.add.image(x, y, textureKey);
```

## Current Visual States

The sandbox currently has a `Real Cards` tab with a deck-state gallery and local real-card effects.

Current state gallery:

- face-up card
- face-down card
- compact variant
- showcase variant
- selected card outline
- disabled/dimmed card
- rotated card

Current real-card effect previews:

- horizontal flip with hover lift
- vertical flip
- snap flip
- spin flip
- tilt flip

Not yet covered here:

- top/left/right/bottom player orientation
- selected outline variants beyond the basic state gallery

## Current Animation Previews

The sandbox uses tabs instead of one large mixed preview.

Current `Ghost Cards` tab:

- `Ghost move + flip`
- `Ghost arc move`

Current `Animation Layers` tab:

- `Dealer reveal`
- `Animation-layer stack`
- `Collect pile`
- `Shuffle preview`

The goal is to inspect the movement clearly, not to simulate a full game.

## Suggested UI

Current controls:

```text
Deck: French | Spanish
Replay
Tabs: Real Cards | Ghost Cards | Animation Layers
```

The current skin is fixed to `vintage-european`.

## Reuse Rules

Reusable card effects should be implemented as generic functions that receive explicit visual inputs.

Current reusable ghost/animation-layer API:

```ts
animateGhostMoveReveal(...)
animateGhostArcMove(...)
animateDealReveal(...)
animateLayerStack(...)
animateCollectPile(...)
animateRiffleShuffle(...)
```

Source:

```text
html/src/rewrite/phaser/scenes/animations/cardMotionAnimations.ts
```

Current real-card effects are still implemented inside sandbox examples. They should be extracted later if they are needed by production presenters.

Game logic should decide what happened.

Animation helpers should only decide how it looks.

## Animation Policy: Hybrid

Use a hybrid strategy instead of forcing every animation through one mechanism.

### Real Card Visuals

Animate the real card visual when the effect is local and the card stays in the same layout slot.

Use this for:

- hover
- selected lift
- selected outline
- highlight
- pulse
- dim / disabled
- flip in place, when the card remains in the same slot

Why:

- avoids unnecessary duplicate visuals
- keeps simple local interactions direct
- makes selection and hover feel responsive

Risks:

- the presenter must avoid fighting the tween
- layout sync must not reset the object mid-animation

### Ghost Cards / Animation Layer

Use temporary ghost cards in a dedicated animation layer when a card moves between zones or when the table layout should stay stable while the animation runs.

Use this for:

- deal
- draw
- play from hand to table
- collect to won/capture pile
- war stack movement
- discard movement
- shuffle preview

Why:

- the view model remains the source of truth
- hand/table/pile layout can stay stable during movement
- depth and cleanup can be managed in one place
- cross-zone animation does not mutate persistent presenter objects

Risks:

- ghost card must match the original card size, texture, angle, and depth
- original visuals may need to be hidden temporarily to avoid duplicates
- cleanup must be reliable after animation completion or scene shutdown

### Animation Layer Rule

Ghost cards should not be created ad hoc across presenters.

Prefer a single dedicated animation layer / overlay API that owns temporary visuals:

```ts
animationLayer.createCardGhost(...)
animationLayer.clear()
```

This keeps depth, lifecycle, and cleanup predictable.

Current implementation:

```text
html/src/rewrite/phaser/scenes/animations/cardAnimationLayer.ts
```

### State Rule

Game state never depends on Phaser animation objects.

Flow:

1. Game logic emits effects or view-model changes.
2. Presenter starts animation.
3. Animation uses real card visuals or ghost cards according to this policy.
4. When animation finishes, UI sends `ANIMATION_DONE` if the game is waiting for it.
5. Presenter re-syncs from the latest view model.

## First Implementation Slice

1. Add `html/card-sandbox.html`.
2. Add `cardSandboxMain.ts`.
3. Add `CardSandboxScene.ts`.
4. Render French and Spanish deck options.
5. Display several sample cards from the selected deck.
6. Display the matching card back.
7. Add simple flip and spin previews.
8. Add a small stacked-card preview.
9. Add a split preview for the hybrid policy:
   - real card local effect
   - ghost card move
   - animation-layer stack/collect
10. Run:

```bash
npm run build
npm run test-rewrite
```

Status: complete. The initial slice exists and now includes deck selection, real-card state gallery, real-card flip variants, ghost-card movement previews, and animation-layer previews.

## Reusable API Status

Implemented reusable functions:

- `animateGhostMoveReveal`
- `animateGhostArcMove`
- `animateDealReveal`
- `animateLayerStack`
- `animateCollectPile`
- `animateRiffleShuffle`

Current sandbox examples consume this API for ghost and animation-layer previews.

Production usage:

- War Lite card movement/reveal now goes through the shared motion helpers via `cardStackAnimations.ts`.
- War reveal cards (`war-reveal-*`) intentionally pause briefly after landing, show a gold hold highlight, then flip face-up. This matches the `Deal + reveal` pattern from the sandbox while preserving the existing War table layout and game logic.

Still sandbox-local:

- horizontal real-card flip
- vertical flip
- snap flip
- spin flip
- tilt flip

These can be extracted to a real-card effects module when a production scene needs them.

## Later Slices

- Connect reusable motion animations back into War first.
- Decide what remains in `cardStackAnimations.ts` versus `cardMotionAnimations.ts`.
- Extract real-card local flip effects if needed by production presenters.
- Add visual snapshots for high-risk card states.
- Add side-by-side French vs Spanish deck comparison.
- Add card scale/orientation controls.
- Add sound toggles for card SFX.
- Add focused regression checks for card texture generation if needed.

## Done Criteria For v1

The sandbox is useful when we can open one page and quickly answer:

- Does this deck render correctly?
- Does this card back match the selected deck?
- Does flip stretch or look natural?
- Is this animation using the correct real-card vs ghost-card strategy?
- Does selected outline hug the card shape?
- Does stacked card offset look natural?
- Does a Spanish card behave the same as a French card?
