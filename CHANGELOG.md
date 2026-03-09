# GAINZ — Changelog

> What changed, when, and why. Most important stuff first.

---

## March 9, 2026

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
