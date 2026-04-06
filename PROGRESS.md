# Gainz — Progress Tracker

## Last Session
- **Date:** 2026-04-06
- **What we did:**
  - **Exercise notes fix** — old `this.replaceWith()` hack wiped notes on every re-render; replaced with `noteActiveFor` Set + `openNoteInput()` so textarea survives logging sets
  - **Delete meals** — ✕ button on every item in today's nutrition log
  - **Body measurements history** — tap any measurement row to see full date history for that field
  - **Warmup message** — clarified "no previous session found" instead of confusing "log a working set first"
  - **Water tracker upgrade** — custom goal in SET TARGETS modal, bodyweight-based suggestion (0.5 oz/lb), 7-day streak dots, adaptive status message, +8/16/24/32 quick buttons + custom amount modal, card glows green on goal hit
  - **All-time Notes viewer** — History tab → "📝 VIEW ALL NOTES" shows every session + exercise note ever written with date and time, newest first
  - **Confirmed already built:** delete a set (✕ on each set row), 3-dot menu has Remove, exercise notes show in history detail view

- **Status:** All shipped and pushed to GitHub

## Next Steps
- Verify supplements tracker works end-to-end
- Bodyweight logging screen — polish and verify it's solid
- Onboarding — what does a brand new user see on first open?
- Test everything on iOS Safari (notes, water tracker, macro targets)

## Notes
- Delete set: `deleteSet()` at line 719 in app-legacy.js — already wired to ✕ on each set row
- Exercise notes: `noteActiveFor` Set in app-legacy.js controls visibility; `updateNote()` saves to `activeWorkout`
- Water: `state.waterLog` (date-keyed oz), `state.macroTargets.waterGoal` (default 64oz)
- All notes modal: `openNotesModal()` in app-legacy.js — collects from all workouts
