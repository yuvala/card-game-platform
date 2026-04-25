# Card Game

Legacy browser card game prototype migrated to Vite and TypeScript.

## Status

- `rewrite.html` is the active development path
- `game.html` is the legacy DOM implementation
- the legacy DOM path is frozen and kept for reference/comparison only
- new features should go into the rewrite, not the legacy DOM path

## Run

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:8000/game.html
```

Rewrite sandbox:

```text
http://127.0.0.1:8000/rewrite.html
```

The rewrite currently includes a Create Game flow and these games:

- `Draw Poker`
- `War Lite`
- `Brisca-lite`

## Scripts

- `npm run dev` - start the Vite dev server
- `npm run build` - run TypeScript checks and create a production build in `dist/`
- `npm run preview` - preview the production build
- `npm run serve:legacy` - run the old static Node.js server for comparison

## Docs

- `docs/rewrite-architecture.md` - architecture notes for the Phaser + XState rewrite and future multi-game support
- `TODO.md` - prioritized fix/build/optimize backlog for the rewrite

## Main Files

- `html/game.html` - game page entrypoint for Vite
- `html/rewrite.html` - Phaser + XState rewrite entrypoint
- `html/src/` - TypeScript game logic and bootstrapping
- `html/src/rewrite/` - parallel greenfield rewrite scaffold
- `html/src/rewrite/engine/game/` - generic game contracts, piles, catalog, and machine factory
- `html/src/rewrite/games/` - concrete game modules and game catalog
- `html/src/rewrite/phaser/scenes/layout/` - pure layout helpers used by the rewrite scenes
- `html/css/main.css` - styles
- `html/css/rewrite.css` - rewrite shell styles
- `html/data/players.json` - player seed data
- `vite.config.js` - Vite configuration for the legacy `html/` root
