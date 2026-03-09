# GAINZ — Changelog

> Skim this to get up to speed. Recent work on top, older stuff condensed.

---

## Latest — March 9 (Session 2)

### Modular Refactor (Phase 1 & 2)
Broke `app.js` (4,324 lines) into native ES modules — no bundler, no frameworks.

| Module | What's in it |
|---|---|
| `js/config.js` | Feature flags, version, constants |
| `js/data.js` | Exercises, programs, splits, research tips |
| `js/state.js` | State migration logic |
| `js/utils.js` | Pure helpers (formatting, DOM, toast, haptics) |
| `js/audio.js` | Rest timer beep |
| `js/onboarding.js` | Splash carousel + coach tips |
| `js/import.js` | Full import system (paste → parse → confirm) |

`js/main.js` wires modules together → loads `js/app-legacy.js` (~2,915 lines remaining).

**Next up (Phase 3):** Break up `app-legacy.js` — workout logic, render pipeline, settings. Hardest part because of shared mutable state.

### Removed Quick Start Pills
Redundant — split sequence on home screen is already tappable.

---

## Earlier — March 9 (Session 1)

- **File split:** Monolithic `index.html` (5,142 lines) → `index.html` + `styles.css` + `app.js`
- **Load Template button:** Saved templates show on empty workout screen
- **Vision doc:** `VISION.md` — product roadmap (gym tracker → AI coach → wearables)
- **Repo setup:** Git + GitHub + gh CLI
