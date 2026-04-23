# Card Game

Legacy browser card game prototype migrated to Vite and TypeScript.

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

## Scripts

- `npm run dev` - start the Vite dev server
- `npm run build` - run TypeScript checks and create a production build in `dist/`
- `npm run preview` - preview the production build
- `npm run serve:legacy` - run the old static Node.js server for comparison

## Main Files

- `html/game.html` - game page entrypoint for Vite
- `html/rewrite.html` - Phaser + XState rewrite entrypoint
- `html/src/` - TypeScript game logic and bootstrapping
- `html/src/rewrite/` - parallel greenfield rewrite scaffold
- `html/css/main.css` - styles
- `html/css/rewrite.css` - rewrite shell styles
- `html/data/players.json` - player seed data
- `vite.config.js` - Vite configuration for the legacy `html/` root
