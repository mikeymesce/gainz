# Architecture

> Technical reference for the GAINZ codebase. Update this when files change.

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
| `index.html` | 167 | HTML structure, modals, debug panel |
| `styles.css` | 663 | All styling, CSS variables, animations |
| `app.js` | 4,324 | **DEAD CODE** — not loaded. Pre-refactor copy. Delete when ready. |
| `CLAUDE.md` | — | Project instructions for Claude |
| `CHANGELOG.md` | — | Mike's changelog |
| `README.md` | — | Project overview |

### js/ Modules

| Module | Lines | Responsibility | Exports |
|---|---|---|---|
| `main.js` | 92 | Entry point — imports modules, exposes to window, loads legacy | — |
| `app-legacy.js` | 2,468 | Render pipeline, workout actions, picker, stacks, tests, debug | globals |
| `config.js` | 29 | Feature flags, version, constants | `FEATURES`, `VERSION`, `SCHEMA_VERSION`, etc. |
| `data.js` | 349 | Exercise DB, programs, splits, research tips, MRV | `ALL_SPLITS`, `PROGRAMS`, `RESEARCH_TIPS`, etc. |
| `state.js` | 23 | Schema migration logic | `migrateState` |
| `utils.js` | 44 | Formatting, DOM helpers, toast, haptics, confetti | `fmt`, `vol`, `est1RM`, `showToast`, etc. |
| `audio.js` | 18 | Timer completion beep (Web Audio API) | `playBeep` |
| `onboarding.js` | 171 | Splash carousel, coach tips | `showSplash`, `dismissSplash`, etc. |
| `import.js` | 796 | Text log import (paste -> parse -> clarify -> preview -> commit) | `openImportModal`, `importStartParse`, etc. |
| `persistence.js` | 74 | Save/load localStorage, wake lock, storage quota, export | `save`, `saveImmediate`, `exportData`, etc. |
| `workout-logic.js` | 89 | Active splits, recommendations, PR detection, suggested weight | `getActiveSplits`, `isPR`, `getSuggestedWeight`, etc. |
| `timers.js` | 77 | Rest timer (auto-start, adjust, skip) + workout duration timer | `startTimer`, `adjTimer`, `skipTimer`, etc. |
| `research-tips.js` | 123 | Tip panel UI, library modal, category filtering | `openTip`, `openLibrary`, `buildTipPanel`, etc. |
| `progress-chart.js` | 108 | SVG line charts, sparklines, 1RM/volume toggle | `buildProgChart`, `buildSparkline`, etc. |

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
└── schemaVersion: 6
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
--bg: #080808    --bg2: #0f0f0f    --bg3: #161616

/* Accent */
--accent: #e8d5a0  (gold — single hero color, used sparingly)

/* Text */
--text: #f0ece0    --muted: #6a6560    --dim: #3a3630

/* Semantic */
--superset: #8b72e0    --green: #52c87a    --danger: #c0404a
```

- Fonts: Bebas Neue (headings/numbers) + DM Sans (body)
- Dark only. No light theme.
- Mobile-first, max-width 430px
- No gradients. Borders and subtle shadows for depth.

---

## What's Left in app-legacy.js

The remaining ~2,468 lines contain:

1. **Render pipeline** — `render()` + all screen-specific render functions. Heavy inline HTML.
2. **Workout actions** — add/delete/reorder exercises and sets, warmup toggle, notes.
3. **Exercise picker** — modal with search, filters, custom exercise input.
4. **Stacks** — superset template CRUD.
5. **Unit tests** — 45 tests, custom framework, accessible via debug panel.
6. **Debug panel** — app state inspector + event log.
7. **Shared mutable state** — `screen`, `activeWorkout`, `collapsedEx`, `doneExSet`, etc.

Extracting these further requires decoupling the shared mutable state, which is the hardest remaining refactor.

---

*Last updated: March 9, 2026*
