# TODO

## Priority 1: Fix

- Finish `War Lite` as the first end-to-end vertical slice:
  - Start from the Create Game drawer and deal opening stacks.
  - Each player reveals exactly one card from their own hidden stack in turn.
  - The first revealed card stays on the table while waiting for the next player.
  - After all players reveal, the battle resolves and cards move into the winner's `Won` pile.
  - If a player stack is empty, their `Won` pile shuffles back into their stack.
  - If a player has no stack and no `Won` cards, the game reaches `gameOver`.
  - HUD text and enabled actions match the current step.
  - No central stock/discard UI appears for War Lite.
- Add more edge-case rules/state assertions for the concrete games beyond the current happy-path machine coverage.
- Review whether the current `playedCardHistory` field should stay generic or move behind a more explicit history contract.
- Review the new `GameConfig` layer after the next feature pass and decide whether more setup defaults belong there.
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
- Tighten typing around `machineFactory`, the configured catalog helper, and remaining catalog-side casts.
- Continue removing transitional legacy shapes where `piles` already cover the same meaning.

## Priority 3: Optimize

- Reduce rewrite bundle size with code splitting.
- Review `viewModel` shape and remove remaining legacy duplication where possible.
- Add more repeatable runtime smoke tests so refactors do not rely only on manual verification.

## Frozen

- The legacy DOM path at `game.html` is frozen and kept for reference only.
- New features should continue in the rewrite path at `rewrite.html`.
