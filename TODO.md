# TODO

## Priority 1: Fix

- Add deeper rules/state assertions for the concrete games beyond the current machine-flow coverage.
- Decide whether `discardPile` should remain explicit history data or move to a cleaner history model.
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
- Continue shrinking [html/src/rewrite/phaser/scenes/TableScene.ts](/d:/yuval/card/cardGame/html/src/rewrite/phaser/scenes/TableScene.ts:1) by moving more layout intent into view-model/layout hints where useful.
- Tighten typing around `machineFactory` and reduce catalog-side casts.
- Continue removing transitional legacy shapes where `piles` already cover the same meaning.

## Priority 3: Optimize

- Reduce rewrite bundle size with code splitting.
- Review `viewModel` shape and remove remaining legacy duplication where possible.
- Add more repeatable runtime smoke tests so refactors do not rely only on manual verification.

## Frozen

- The legacy DOM path at `game.html` is frozen and kept for reference only.
- New features should continue in the rewrite path at `rewrite.html`.
