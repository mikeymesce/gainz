# Gainz — Progress Tracker

## Last Session
- **Date:** 2026-04-19 (work done across Apr 12–16)
- **What we did:**
  - **⋮ overflow menu fix** — was completely broken (raw JSON.stringify in onclick broke HTML attributes). Fixed with esc(). Made button bigger (40×40px with border) for easier tapping on mobile.
  - **Tappable confirmed sets** — tap any confirmed ✓ row in buildSetGrid to edit weight/reps or delete. Shows ✎ pencil icon next to ✓ so it's obvious.
  - **Syntax error fix** — Load Workout modal had JSON.stringify inside onclick, causing SyntaxError. Refactored to helper function.
  - **Timer/duration bug fix** — crash recovery had a 15-min idle cap that was truncating workout duration (40 min → 16 min). Removed. Duration is now just finish − start, no adjustments.
  - **Bulletproof crash recovery** — auto-saves to localStorage on every render(), beforeunload, visibilitychange (phone lock/app switch), plus existing 20s interval.
  - **Mid-workout cloud sync** — active workout syncs to Supabase `active_workout` column after each completed exercise (nextExercise). Cloud recovery fallback if localStorage is empty. Clears on finish.
  - **Per-muscle weekly volume milestones** — congrats modal at MEV+2 sets/week (growth zone), hard warning modal at MRV−2 (approaching junk volume). Both cite Schoenfeld 2017 + Israetel volume landmarks. Rolling 7-day window (not calendar week).
  - **MEV/MRV values updated** — triceps MEV 6→8, hamstrings MEV 6→8, glutes MEV 4→6. Quads/hamstrings/glutes kept separate (briefly merged into "legs" then reverted — hamstring neglect is a real training problem).
  - **Auto-detect muscle groups for custom exercises** — keyword pattern matching (high confidence = auto-assign, low/no confidence = muscle picker modal). Saved to state._customMuscles, restored on load.
  - **Version tag** — `GAINZ_VERSION = '2026-04-14a'` logs to console for cache debugging.

- **Status:** All coded and pushed. Needs browser testing on phone (hard refresh required — check for version tag in debug panel).

## Next Steps
- **Verify on phone:** ⋮ menu works, confirmed sets tappable, congrats/warning modals fire correctly
- **Verify cloud sync:** check Supabase `user_state.active_workout` column populates during workout
- Test on iOS Safari — all features from Apr 11 session too
- Verify supplements tracker works end-to-end
- Bodyweight logging screen — polish and verify
- Onboarding — what does a brand new user see on first open?

## Notes
- ⋮ menu: uses `eName2=esc(e.name)` for all onclick handlers (not JSON.stringify)
- Crash recovery: `recoverWorkout()` no longer adjusts startTime — duration is pure timestamp diff
- Cloud sync: `syncActiveWorkoutToCloud()` fires in `nextExercise()`, `clearActiveWorkoutFromCloud()` fires in `finishWorkout()`, `getActiveWorkoutFromCloud()` checked on load if no local recovery
- Muscle milestones: `congratsAt = mrvData.mev + 2`, `warnAt = mrvData.mrv - 2`, dedupe keyed by `goal:YYYY-MM-DD:muscle` / `warn:YYYY-MM-DD:muscle`
- Auto-detect muscles: `detectMusclesFromName()` in data.js, pattern order matters (specific before generic: "nordic curl" → hamstrings before generic "curl" → biceps)
- Custom muscle mappings: stored in `state._customMuscles`, merged into `EX_MUSCLES` on app load
