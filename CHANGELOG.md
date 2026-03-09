# GAINZ — Changelog

> What changed, when, and why. Most important stuff first.

---

## March 9, 2026 (Session 2)

### Modular Refactor — Phase 1 & 2
Broke `app.js` (4,324 lines) into ES modules. No build step, no frameworks — just native `import`/`export`.

**Phase 1 — Foundation modules:**
- `js/config.js` — feature flags, version, constants
- `js/data.js` — exercise data, programs, split definitions, research tips
- `js/state.js` — state migration logic
- `js/utils.js` — pure helpers (formatting, DOM utils, toast, haptics)

**Phase 2 — Feature modules:**
- `js/audio.js` — rest timer beep sound
- `js/onboarding.js` — splash carousel + coach tips
- `js/import.js` — full import system (paste → parse → confirm)

`js/app-legacy.js` is now ~2,915 lines (down from 4,324). `js/main.js` wires modules together and loads the legacy script.

### Removed Quick Start Pills
The "Quick start" buttons on the home screen were redundant — you can already tap any split in "Your split sequence." Removed to declutter.

---

## March 9, 2026 (Session 1)

### Codebase Split
Broke the single `index.html` (5,142 lines) into 3 files:
- `index.html` — HTML structure only (167 lines)
- `styles.css` — all styling (663 lines)
- `app.js` — all logic (4,310 lines)

Same app, zero behavior changes. Done so Mike and Jeremy can work on different files without stepping on each other.

### Load Template Button (in-workout)
When you start a workout and haven't added exercises yet, your saved templates now show up as tappable buttons right on the empty state screen. No more digging through settings.

### Vision Doc
Added `VISION.md` — full product roadmap from gym tracker → AI coach → wearable aggregator. Jeremy, read this first.

### Repo Setup
- Git initialized, connected to GitHub
- First push of all project files
- GitHub CLI installed and authenticated
