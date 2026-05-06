# TODO

## Priority 1: Fix / Stabilize

- Finish War Lite product polish in this order:
  1. Add rule tests for War edge cases:
     - tie inside War
     - player has fewer than 3 cards during War
     - player has exactly 1 card during War
     - unresolved War when no tied player can continue
     - recycle of `Won` pile after a battle
     - Critical for correctness, low visual regression risk.
  2. Add repeatable visual screenshots for War tie / War stack / collection.
     - High value, but depends on stable visuals.
  3. Improve War HUD text for battle pot size and next player.
     - Useful polish, lower priority than stack clarity and tests.
- Add more edge-case rules/state assertions for the concrete games beyond the current happy-path machine coverage.
- Add visual regression coverage or repeatable screenshots for the highest-risk table states:
  - War Lite tie / war stack / collection
  - Brisca Lite stock + trump layout
  - crowded 5-6 player tables
- Add a mute/volume control for the new card SFX layer before adding louder or longer audio assets.
- Review whether the current `playedCardHistory` field should stay generic or move behind a more explicit history contract.
- Review UI states manually for crowded tables:
  - `5-6` players
  - trick-taking layouts
  - pile placement
  - narrow/mobile sizes

## Priority 2: Build

- Upgrade `Brisca-lite` toward real `Brisca`:
  - real card rank order
  - real point values
  - proper supported player counts
  - 40/48-card variant decision
- Continue shrinking [TableScene.ts](/d:/yuval/card/cardGame/html/src/rewrite/phaser/scenes/TableScene.ts:1) by moving more layout intent into view-model/layout hints where useful.
- Tighten typing around `machineFactory`, the configured catalog helper, and remaining catalog-side casts.
- Continue turning effect concepts into generic typed effects:
  - `shuffle-deck`
  - `flip-card`
  - `discard-card`
  - `sort-hand`
  - `highlight-playable`
  - `invalid-move`
- Replace procedural SFX with curated `mp3`/`ogg` assets if better sounds are needed, while keeping the existing semantic sound API.
- Continue removing transitional legacy shapes where `piles` already cover the same meaning.

## Priority 3: Optimize

- Reduce rewrite bundle size with code splitting.
- Review `viewModel` shape and remove remaining legacy duplication where possible.
- Add more repeatable runtime smoke tests so refactors do not rely only on manual verification.

## Completed / No Longer Open

- War Lite is now the first end-to-end vertical slice:
  - opening stacks deal through the Create Game flow
  - battles reveal one card per player
  - ties enter War
  - war face-down cards stack with offsets/rotation
  - final war cards reveal
  - battle cards collect into the winner's `Won` pile
  - empty stacks can recycle `Won` cards when the rules allow it
- War face-down stacks show a small `3 down` style badge.
- War table stacks use clearer grouped offsets/depths for tie cards, face-down cards, and reveal cards.
- War Lite has a full-deck auto-run smoke test that reaches `gameOver`.
- `Won` piles show face-down card backs and no active-card outline.
- Brisca Lite has a combined stock/trump table presentation.
- Brisca Lite uses generic `trick-seats` table-card placement for trick cards.
- Card movement, collection, reveal, shuffle, and procedural SFX are separated from game rules.

## Frozen

- The legacy DOM path at `game.html` is frozen and kept for reference only.
- New features should continue in the rewrite path at `rewrite.html`.
