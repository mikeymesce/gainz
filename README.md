# GAINZ

> One app that knows everything about your body and helps you train smarter.

GAINZ is a mobile-first PWA fitness tracker built with vanilla HTML, CSS, and JavaScript. No frameworks, no build step, no backend — runs entirely in the browser with localStorage.

## Features

- Workout logging with sets, reps, and weight tracking
- Progressive overload suggestions (science-backed percentages per exercise)
- Rest timer with per-exercise recommendations
- Supersets and exercise stacks
- Personal records with confetti celebration
- Workout templates (save and reload)
- Progress charts (1RM and volume over time)
- Research tips database (25+ exercises with evidence-based guidance)
- Streak tracking
- Import workouts from text logs
- Onboarding carousel for new users
- Debug panel with 45 unit tests

## Quick Start

ES modules require a local server:

```bash
python3 -m http.server 8080
open http://localhost:8080
```

## Vision

GAINZ has a 4-phase product roadmap:

1. **Gym Tracker** (current) — manual workout logging, PRs, templates, charts
2. **AI Personal Trainer** — science-backed coaching, trainer opinions, personalized advice
3. **Body Data Aggregator** — integrate Whoop, Oura, Strava, Apple Health, MFP into one dashboard
4. **Injury Tracking** — log injuries, auto-adjust suggestions, track recovery

See `docs/vision.md` for the full roadmap.

## Project Structure

```
index.html              HTML structure (167 lines)
styles.css              All styling + design system (663 lines)
app.js                  [DEAD CODE - not loaded, predates refactor]
js/
  main.js               Module entry point — wires everything together
  app-legacy.js         Render pipeline, workout actions, tests (~2,468 lines)
  config.js             Feature flags, version, constants
  data.js               Exercises, programs, splits, research tips
  state.js              State migration logic
  utils.js              Pure helpers (formatting, DOM, toast, haptics)
  audio.js              Rest timer beep
  onboarding.js         Splash carousel + coach tips
  import.js             Import system (paste -> parse -> confirm)
  persistence.js        Save/storage, wake lock, offline, export
  workout-logic.js      Split recs, PR detection, suggested weight
  timers.js             Rest timer + workout duration timer
  research-tips.js      Tip panels + research library
  progress-chart.js     SVG progress chart
docs/
  architecture.md       Technical architecture + file map
  vision.md             Product roadmap
CLAUDE.md               AI collaborator instructions
CHANGELOG.md            What changed, when, why
```

See `docs/architecture.md` for detailed technical documentation.

## Team

- **Mike Mesce** — Product owner, creative vision
- **Jeremy (jpul)** — Lead engineer
- **Claude** — AI collaborator

---

*March 2026*
