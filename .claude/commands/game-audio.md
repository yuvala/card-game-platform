# Game Audio Engineer

Audio integration specialist for the card game platform. Handles music, SFX, user settings, and Phaser/React integration.

---

## Project Context

| Layer | Technology | Relevant path |
|---|---|---|
| Rendering | Phaser 4 | `apps/client/src/app/` |
| Effects pipeline | `effectPresenter.ts` | `apps/client/src/app/presenters/` |
| Lobby / UI | React | `apps/client/src/lobby/` |
| Audio library | **Howler.js** | shared — works in every layer |
| Settings | localStorage | `audioSettings.ts` (to create) |

**Key rule:** Do not use Phaser's built-in audio. Howler.js only — so lobby, Operator, and game share one mechanism.

---

## Architecture

```
apps/client/src/
└── audio/
    ├── audioManager.ts       ← singleton: manages all audio
    ├── musicPlayer.ts        ← loops, fade in/out, music states
    ├── sfxPlayer.ts          ← one-shot effects
    └── audioSettings.ts      ← load/save settings in localStorage
```

---

## Howler.js — Core principles

```ts
import { Howl, Howler } from 'howler';

// Background music — loop
const music = new Howl({
    src: ['/audio/music/lobby-ambient.ogg', '/audio/music/lobby-ambient.mp3'],
    loop: true,
    volume: 0.4,
});

// SFX — one-shot
const dealCard = new Howl({
    src: ['/audio/sfx/deal.ogg', '/audio/sfx/deal.mp3'],
    volume: 0.7,
});

dealCard.play();
```

**Always** provide OGG + MP3 (OGG first — smaller; MP3 as Safari fallback).

---

## Music states

| State | File | When |
|---|---|---|
| `lobby` | `lobby-ambient.ogg` | In lobby / waiting room |
| `game` | `game-ambient.ogg` | During gameplay |
| `win` | `win.ogg` | Victory — one-shot |
| `lose` | `lose.ogg` | Defeat — one-shot |

Always transition between states with **fade** (0.5–1s) — never a hard cut.

---

## Required SFX

| Event | File | Code trigger |
|---|---|---|
| Card deal | `deal.ogg` | `effectPresenter.ts` → effect type `deal` |
| Card play | `play.ogg` | effect type `play` |
| Card collect | `collect.ogg` | effect type `collect` |
| Round win | `round-win.ogg` | score change in viewModel |
| Game win | `game-win.ogg` | `isGameOver === true` |
| UI click | `click.ogg` | Lobby buttons |
| Player joins room | `player-join.ogg` | `RoomList.tsx` — fetchPlayers |

**Recommended free SFX sources:**
- [kenney.nl/assets/casino-audio](https://kenney.nl/assets/casino-audio) — Casino Audio Pack (free, ready to use)
- [freesound.org](https://freesound.org) — search "card deal", "card flip"
- [zapsplat.com](https://zapsplat.com) — high quality, free license

---

## effectPresenter integration

```ts
// apps/client/src/app/presenters/effectPresenter.ts
import { sfxPlayer } from '../../audio/sfxPlayer';

case 'deal':    sfxPlayer.play('deal');    break;
case 'play':    sfxPlayer.play('play');    break;
case 'collect': sfxPlayer.play('collect'); break;
```

**Rule:** SFX in presenters only — never in rules or engine.

---

## Game Settings — Audio tab

```ts
interface AudioSettings {
    musicEnabled: boolean;  // default: true
    sfxEnabled: boolean;    // default: true
    musicVolume: number;    // 0–1, default: 0.4
    sfxVolume: number;      // 0–1, default: 0.7
}
```

Persist in `localStorage` under key `'audio-settings'`.
Load in `audioManager.ts` on initialize.

---

## Do's ✓

- Always provide OGG + MP3 fallback
- Fade between music states — never hard cut
- Persist settings in localStorage across sessions
- Trigger SFX from presenter layer only
- First play must follow a user gesture (Chrome autoplay policy — Howler handles this automatically)

## Don'ts ✗

- Do not use Phaser's built-in audio system
- Do not play audio from engine / rules
- Do not call `new Howl()` on every render — create once in a singleton
- Do not forget to dispose when leaving a scene

---

## Task Breakdown

### Phase 1 — Infrastructure
- [ ] Install `howler` + `@types/howler`
- [ ] Create `apps/client/src/audio/audioManager.ts`
- [ ] Create `apps/client/src/audio/audioSettings.ts` (localStorage)
- [ ] Create `apps/client/public/audio/music/` and `/sfx/` directories

### Phase 2 — Music
- [ ] Move existing music files into the correct directory
- [ ] Map files to states (lobby / game / win / lose)
- [ ] Implement `musicPlayer.ts` with fade between states
- [ ] Wire to lobby — lobby music starts on `LobbyRoute` mount
- [ ] Wire to Phaser — game music starts when `TableScene` starts

### Phase 3 — SFX
- [ ] Acquire SFX files (start with kenney.nl Casino Audio Pack)
- [ ] Implement `sfxPlayer.ts`
- [ ] Wire to `effectPresenter.ts` — deal / play / collect
- [ ] Add click sound to lobby buttons
- [ ] Add player-join sound in `RoomList.tsx`

### Phase 4 — Settings UI
- [ ] Add Audio tab in Game Settings
- [ ] Music toggle + SFX toggle
- [ ] Music volume slider + SFX volume slider
- [ ] Save/load via `audioSettings.ts`

### Phase 5 — QA
- [ ] Test Chrome autoplay (open lobby → wait for user gesture → verify music starts)
- [ ] Test Safari (MP3 fallback)
- [ ] Verify no duplicate music — music does not start twice
- [ ] Verify dispose on scene exit

---

## Project-specific notes

- **XState**: never trigger audio from the state machine — only from the UI layer reacting to viewModel
- **Mobile**: Howler handles AudioContext resume automatically
- **Lobby**: call `musicPlayer.setMode('lobby')` on `LobbyRoute` mount
- **Game**: call `musicPlayer.setMode('game')` when `TableScene` starts
