# GAINZ — Changelog

> Skim this to get up to speed. Recent work on top, older stuff condensed.

---

## Latest — March 9 (Session 3)

### Modular Refactor Complete (Phase 1–3)
Broke `app.js` (4,324 lines) into 14 native ES modules. No bundler, no frameworks.

| Module | What's in it |
|---|---|
| `js/config.js` | Feature flags, version, constants |
| `js/data.js` | Exercises, programs, splits, research tips |
| `js/state.js` | State migration logic |
| `js/utils.js` | Pure helpers (formatting, DOM, toast, haptics) |
| `js/audio.js` | Rest timer beep |
| `js/onboarding.js` | Splash carousel + coach tips |
| `js/import.js` | Full import system (paste → parse → confirm) |
| `js/persistence.js` | Save/storage, wake lock, offline detection, export |
| `js/workout-logic.js` | Split recs, PR detection, suggested weight, weekly sets |
| `js/timers.js` | Rest timer + workout duration timer |
| `js/research-tips.js` | Tip panels + research library |
| `js/progress-chart.js` | SVG progress chart (no libs) |

`js/main.js` wires modules → loads `js/app-legacy.js` (2,468 lines remaining).

**What's left in legacy:** Render pipeline, workout actions, exercise picker, stacks, tests, debug. These share mutable state (`screen`, `activeWorkout`, etc.) that would need a state management migration to extract further.

### Removed Quick Start Pills
Redundant — split sequence on home screen is already tappable.

---

## Earlier — March 9 (Sessions 1–2)

- **File split:** Monolithic `index.html` (5,142 lines) → `index.html` + `styles.css` + `app.js`
- **Load Template button:** Saved templates show on empty workout screen
- **Vision doc:** `VISION.md` — product roadmap (gym tracker → AI coach → wearables)
- **Repo setup:** Git + GitHub + gh CLI
