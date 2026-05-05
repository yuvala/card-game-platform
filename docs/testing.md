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

## Manual War Lite Smoke URL

Use a short deterministic War Lite game:

```text
/rewrite.html?game=war-lite&players=2&deck=french&cards=3&seed=war-smoke-1&autostart=1
```

What to check:

- The table opens directly in War Lite.
- Each player starts with 3 stack cards.
- Press `▶` to auto-run.
- The first revealed card stays on the table until the second player reveals.
- Cards collect into the winner's `Won` pile.
- If both revealed cards tie, War starts: tied cards stay in the battle pile, each tied player places up to 3 face-down cards, then each reveals one face-up card, and the winner collects the full pot.
- The game reaches `Game Over` quickly.
- The winner text appears in the HUD.

## Useful URL Parameters

- `game=war-lite` chooses War Lite.
- `players=2` keeps the table small.
- `deck=french` chooses the French deck.
- `cards=3` deals only 3 cards per player for short QA.
- `seed=war-smoke-1` makes the shuffle deterministic.
- `autostart=1` starts the table immediately.

Remove `cards=...` for a normal full-length game.

## Manual War Tie Smoke URL

Use this URL to force War on the first battle:

```text
/rewrite.html?game=war-lite&players=2&deck=french&cards=5&seed=war-manual-0&autostart=1
```

What to check:

- The first battle ties on two `10` cards.
- The UI enters `War 1`.
- Each tied player places 3 face-down cards.
- Each tied player reveals one face-up war card.
- The winner collects all 10 cards from the battle pile.

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
- The three face-down cards should sit as a small shifted/tilted stack, not as one exact card-on-card overlap.
- Press `Reveal War Card`.
- Each tied player should reveal one face-up war card onto that same player stack.
- Collection should pull the full pot from the visible table positions into the winner's `Won` pile.

## Visual QA Focus

- Top player stack and bottom player `Won` pile align on the right-side player zone.
- Top player `Won` pile and bottom player stack align on the left-side player zone.
- The `Create Game` drawer does not push the table down.
- `▶` changes to `■` while auto-run is active.
