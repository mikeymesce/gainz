# Architecture

> Technical reference for the GAINZ codebase.
>
> **This file MUST be updated whenever files are added, removed, renamed, or responsibilities change. See CLAUDE.md.**

---

## How It Loads

```
Browser loads index.html
  -> styles.css (all styling)
  -> js/main.js (type="module")
       -> imports all ES modules (config, data, utils, etc.)
       -> exposes everything to window via Object.assign
       -> creates <script> tag for js/app-legacy.js
            -> app-legacy.js reads from window, runs immediately
```

**Why the hybrid approach?** The app was originally one giant file. The refactor extracted pure logic into ES modules, but `app-legacy.js` still uses inline `onclick` handlers that need globals on `window`. A full migration to event listeners would let us drop the `window` bridge.

---

## File Map

### Root

| File | Lines | Role |
|---|---|---|
| `index.html` | 146 | HTML structure, modals, debug panel, ambient particles |
| `styles.css` | 813 | All styling, CSS variables, animations, cinematic + onboarding |
| `CLAUDE.md` | — | Project instructions for Claude |
| `CHANGELOG.md` | — | Mike's changelog |
| `README.md` | — | Project overview |

### js/ Modules

| Module | Lines | Responsibility | Exports |
|---|---|---|---|
| `main.js` | 125 | Entry point — imports modules, exposes to window, loads legacy, SW cleanup, ambient particles | — |
| `app-legacy.js` | ~2,900 | Render pipeline, workout actions, picker, stacks, tests, debug | globals |
| `challenge.js` | ~260 | 30-day push-up/sit-up challenge — state, logging, rendering | `getChallengeState`, `startChallenge`, `renderChallenge`, `renderInlineChallenge`, etc. |
| `config.js` | 29 | Feature flags, version, constants | `FEATURES`, `VERSION`, `SCHEMA_VERSION`, etc. |
| `data.js` | 349 | Exercise DB, programs, splits, research tips, MRV | `ALL_SPLITS`, `PROGRAMS`, `RESEARCH_TIPS`, etc. |
| `state.js` | 23 | Schema migration logic | `migrateState` |
| `utils.js` | 44 | Formatting, DOM helpers, toast, haptics, confetti | `fmt`, `vol`, `est1RM`, `showToast`, etc. |
| `audio.js` | 18 | Timer completion beep (Web Audio API) | `playBeep` |
| `onboarding.js` | 379 | Cinematic intro, splash carousel, coach tips, rotating citations, particles | `showSplash`, `dismissSplash`, `maybeShowCinematic`, `dismissCinematic`, etc. |
| `import.js` | 811 | Text log import (paste -> parse -> clarify -> preview -> commit) | `openImportModal`, `importStartParse`, etc. |
| `persistence.js` | 74 | Save/load localStorage, wake lock, storage quota, export | `save`, `saveImmediate`, `exportData`, etc. |
| `workout-logic.js` | 89 | Active splits, recommendations, PR detection, suggested weight | `getActiveSplits`, `isPR`, `getSuggestedWeight`, etc. |
| `timers.js` | 77 | Rest timer (auto-start, adjust, skip) + workout duration timer | `startTimer`, `adjTimer`, `skipTimer`, etc. |
| `research-tips.js` | 123 | Tip panel UI, library modal, category filtering | `openTip`, `openLibrary`, `buildTipPanel`, etc. |
| `progress-chart.js` | 102 | SVG line chart, 1RM/volume toggle | `buildProgChart`, `setProgChartMode` |
| `supabase.js` | ~160 | Cloud sync via Supabase — auth, push/pull state | `syncToCloud`, `syncFromCloud`, `signIn`, `signUp`, etc. |

### docs/

| File | Purpose |
|---|---|
| `architecture.md` | This file — technical reference |
| `vision.md` | Product roadmap (4 phases) |

---

## State Management

All app state lives in one object, persisted to localStorage under key `gainz_v5`.

```
state (localStorage)          activeWorkout (in-memory only)
├── workouts[]                ├── split
├── exerciseRests{}           ├── exercises[]
├── streak                    ├── startTime
├── lastWorkoutDate           └── notes
├── splitNames{}
├── stacks[]
├── program
├── customSplits[]
├── bodyweight[]
├── templates[]
├── supplements[]             // daily creatine & vitamin log
│   └── { date, timestamp, creatine (g), creatineDose, vitamins (bool) }
└── schemaVersion: 7
```

**Save flow:** `save()` -> `debouncedSave()` -> writes to localStorage. Use `saveImmediate()` after modals.

**Active workout** is NOT in state until `finishWorkout()` pushes it to `state.workouts[]`.

---

## Screen Router

```js
screen = "start" | "log" | "me" | "settings" | "programBuilder" | "history"
```

The `render()` function in `app-legacy.js` switches on `screen` and sets `#content` innerHTML. Navigation is via `nav()` calls that set `screen` and call `render()`.

---

## Design System

```css
/* Backgrounds */
--bg: #080808    --bg2: #0f0f0f    --bg3: #161616    --bg4: #1e1e1e
--cardBg: #0f0f12    --inputBg: #111215

/* Borders */
--border: #1c1c1c    --border2: #242424    --borderCard: #1e1e24

/* Accent */
--accent: #e8d5a0  (gold — single hero color, used sparingly)

/* Text */
--text: #f0ece0    --muted: #6a6560    --dim: #3a3630    --ghost: #242220

/* Semantic */
--superset: #8b72e0    --green: #52c87a    --danger: #c0404a
```

- Fonts: Bebas Neue (headings/numbers) + DM Sans (body)
- Dark only. No light theme.
- Mobile-first, max-width 430px
- No gradients. Borders and subtle shadows for depth.

---

## What's Left in app-legacy.js

The remaining ~2,900 lines contain:

1. **Render pipeline** — `render()` + all screen-specific render functions. Heavy inline HTML.
2. **Workout actions** — add/delete/reorder exercises and sets, warmup toggle, notes.
3. **Exercise picker** — modal with search, filters, custom exercise input.
4. **Stacks** — superset template CRUD.
5. **Unit tests** — 45 tests, custom framework, accessible via debug panel.
6. **Debug panel** — app state inspector + event log.
7. **Shared mutable state** — `screen`, `activeWorkout`, `collapsedEx`, `doneExSet`, etc.

Extracting these further requires decoupling the shared mutable state, which is the hardest remaining refactor.

---

*Last updated: March 30, 2026*
