# Gainz — Progress Tracker

## Last Session
- **Date:** 2026-04-11
- **What we did:**
  - **Edit logged nutrition macros** — pencil ✎ button on each food item in day detail modal; edit name, calories, protein, carbs, fat
  - **Workout categorization on finish** — Quick Start workouts now show a multi-select chip modal (Push/Pull/Legs/Arms/Chest/Back/Shoulders/Core) before saving; pre-selects based on auto-detect; saves as `tags` array on workout record
  - **Challenge exercise toggle** — ↔ button added to home screen inline card; now cycles SIT-UPS → BW SQUATS → DEAD BUGS (was only situps/squats, and toggle was hidden inside modal)
  - **Auto-fill sets from set 1** — after confirming set 1, remaining unfilled rows prefill with set 1's weight/reps instead of last session's values
  - **Dumbbell volume fix** — `vol()` in utils.js now correctly doubles volume for DB sets and unilateral sets (was only doubled in per-set display, not totals)
  - **Confirmed already built:** delete exercise (⋮ → Remove), edit exercise name (⋮ → Rename), edit sets during workout (tap any confirmed set), dumbbell display (2×45 DB)

- **Status:** All coded, needs browser testing

## Next Steps
- **Test tonight's changes** in browser — especially: macro edit modal, categorize-on-finish flow, challenge toggle cycling, auto-fill sets, volume totals with DB mode
- Test on iOS Safari
- Verify supplements tracker works end-to-end
- Bodyweight logging screen — polish and verify
- Onboarding — what does a brand new user see on first open?

## Notes
- Workout categorization: stored as `tags: ['Push', 'Chest', ...]` on workout records; `.split` set to first tag for backwards compat
- Challenge exercise: `state.challenge.secondEx` cycles through `situps`, `squats`, `deadbugs`; data always stored under `situps`/`sitSets` keys regardless of display label
- Auto-fill: in `buildSetGrid()`, unconfirmed rows now check last confirmed set before falling back to last session
- Volume fix: `vol()` multiplies by 2 for `s.db` and by 2 for `s.unilateral`
