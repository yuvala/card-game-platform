# Testing The Rewrite

Use this page as the short QA checklist for `rewrite.html`.

## Fast Commands

Run the rewrite logic tests:

```bash
npm run test-rewrite
```

Run the full local smoke check:

```bash
npm run smoke:rewrite
```

`smoke:rewrite` runs the rewrite tests and then the production build.

For a quick TypeScript and production bundle check:

```bash
npm run build
```

## Manual War Lite Smoke URL

Use a short deterministic War Lite game:

```text
/rewrite.html?game=war-lite&players=2&deck=french&cards=3&seed=war-smoke-1&autostart=1
```

What to check:

- The table opens directly in War Lite.
- Each player starts with 3 face-down stack cards.
- Press the play button to auto-run.
- The first revealed card stays on the table until the second player reveals.
- Cards collect into the winner's `Won` pile with visible movement.
- `Won` pile cards are face-down and do not show an active-card outline.
- If both revealed cards tie, War starts: tied cards stay in the battle pile, each tied player places up to 3 face-down cards, then each reveals one face-up card, and the winner collects the full pot.
- The game reaches `Game Over` quickly.
- The winner text appears in the HUD.

## Manual War Tie Smoke URL

Use this URL to force War on the first battle:

```text
/rewrite.html?game=war-lite&players=2&deck=french&cards=5&seed=war-manual-0&autostart=1
```

What to check:

- The first battle ties on two `10` cards.
- The UI enters `War 1`.
- Each tied player places 3 face-down cards on top of their own open tied card.
- Face-down war cards are slightly offset and rotated, not perfectly overlapped.
- Each tied player reveals one face-up war card.
- The winner collects all 10 cards from the battle area into the `Won` pile.
- Collection is animated one card at a time and the target pile looks messy/natural.

## War Animation Test Pack

Use this URL when working specifically on the War animation:

```text
/rewrite.html?scenario=war-animation
```

What it does:

- Selects `War Lite`, 2 players, the French deck, 5 cards per player, and seed `war-manual-0`.
- Starts the table automatically.
- Advances through the opening tie.
- Pauses at `Battle 1 | War 1` before the face-down war cards are placed.

What to check:

- Press `Place War Cards`.
- Each tied player should place 3 face-down cards on top of their own open tied card.
- The three face-down cards should sit as a shifted/tilted stack.
- Press `Reveal War Card`.
- Each tied player should reveal one face-up war card onto that same player stack.
- The reveal should look like a flip, not a stretched card.
- Collection should pull the full pot from the visible table positions into the winner's `Won` pile.

## Manual Brisca Lite Smoke URL

Use a deterministic Brisca Lite game:

```text
/rewrite.html?game=brisca-lite&players=2&deck=spanish-40&autostart=1
```

What to check:

- The stock is shown as a face-down deck in the table center.
- The trump card is face-up, rotated sideways, and partially covered by the stock so its value/suit remain visible.
- The `Stock` frame and `Stock` title are hidden in this combined stock/trump layout.
- The stock count text is small and does not dominate the table.
- Captured/`Won` piles show face-down card backs, not exposed card faces.
- Trick cards play to the center row and collect into the winner's `Won` pile.

## Sound QA

The rewrite currently uses procedural Web Audio sound effects, not external audio files.

What to check after a user gesture starts the game:

- Shuffle produces a short multi-click shuffle sound.
- Deal/draw/play/card collection produce subtle card sounds.
- War final-card reveal produces a flip sound.
- Sounds should be quiet and should not dominate the table.
- Rapid multi-card movement should not sound like a loud burst.

If a browser blocks audio before interaction, start or click the table once and test again.

## Useful URL Parameters

- `game=war-lite` chooses War Lite.
- `game=brisca-lite` chooses Brisca Lite.
- `game=poker-lite` chooses Poker Lite.
- `players=2` keeps the table small.
- `deck=french` chooses the French deck where supported.
- `deck=spanish-40` chooses the 40-card Spanish deck where supported.
- `cards=3` deals only 3 cards per player where the game supports short QA.
- `seed=war-smoke-1` makes War Lite shuffle deterministic.
- `autostart=1` starts the table immediately.

Remove `cards=...` for a normal full-length game.

## Visual QA Focus

- The Create Game drawer does not push the table down.
- The auto-run button changes state while auto-run is active.
- Text remains readable after antialiasing and resolution changes.
- Top and bottom player piles stay inside the table area.
- `Won` pile card backs use a messy stack and no active-card outline.
- Brisca stock/trump stays vertically centered in the table, not in the top half.
