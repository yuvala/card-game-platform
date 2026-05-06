# TODO

## Priority 1: Fix / Stabilize

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
- `Won` piles show face-down card backs and no active-card outline.
- Brisca Lite has a combined stock/trump table presentation.
- Card movement, collection, reveal, shuffle, and procedural SFX are separated from game rules.

## Frozen

- The legacy DOM path at `game.html` is frozen and kept for reference only.
- New features should continue in the rewrite path at `rewrite.html`.
