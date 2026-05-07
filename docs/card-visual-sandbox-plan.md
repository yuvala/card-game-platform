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

Suggested implementation files:

```text
html/src/rewrite/dev/cardSandboxMain.ts
html/src/rewrite/dev/CardSandboxScene.ts
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

## First Visual States

The first sandbox version should show a grid of real cards in common rendering states:

- face-up card
- face-down card
- compact variant
- showcase variant
- selected card outline
- disabled/dimmed card
- rotated card
- top/left/right/bottom player orientation
- small stacked pile
- messy collected pile

## First Animation Previews

Add a small animation preview area with explicit buttons:

- Flip face-down to face-up
- Flip face-up to face-down
- Spin
- Deal/move card
- Scatter stack
- Collect to pile
- War-style stack preview
- Shuffle preview

The goal is to inspect the movement clearly, not to simulate a full game.

## Suggested UI

Basic controls:

```text
Deck: French | Spanish
Skin: Vintage European
Variant: Compact | Showcase
Animation: Flip | Spin | Stack | Collect | Shuffle
Replay
```

The page should expose enough controls to test visuals quickly without editing game state.

## Reuse Rules

Reusable card effects should be implemented as generic functions that receive explicit visual inputs:

```ts
animateFlipCard(scene, cardImage, options)
animateSpinCard(scene, cardImage, options)
animateScatterStack(scene, cards, target, options)
animateCollectCards(scene, cards, targetPile, options)
```

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

Status: initial slice exists. It includes a deck selector, real-card flip/hover, ghost-card move, and animation-layer stack preview.

## Later Slices

- Add curated animation controls for deal, collect, shuffle, and war stack.
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
