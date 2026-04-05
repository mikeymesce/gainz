# Gainz — Progress Tracker

## Last Session
- **Date:** 2026-04-05
- **What we did:**
  - Verified Groq Edge Function is live and returning correct JSON (`groq-nutrition`)
  - Added **macro targets** to state — calories, protein, carbs, fat — with defaults (2500/180g/250g/80g)
  - Upgraded Nutrition daily dashboard to show **progress bars** for each macro (actual vs target, goes red if over)
  - Added **SET TARGETS** button in Nutrition tab — opens modal to customize all 4 goals, saved to state
  - Built **weekly weight projection card** using 3,500 cal = 1 lb formula
    - Looks at last 7 days logged, compares each day's calories to target
    - Projects full-week surplus/deficit → shows ↑/↓ X lb with avg daily surplus info

- **Status:** All shipped and pushed to GitHub

## Next Steps
- Test macro targets UI on device — make sure SET TARGETS modal inputs work on iOS
- Add ability to delete individual meals from today's log
- Body measurements: add a history view (tap a measurement to see all past entries)
- Consider kg/lbs toggle for the weekly weight projection
- Warmup calculator: confirm it surfaces correctly in the UI

## Notes
- Nutrition module: `js/nutrition.js` — macro targets in `state.macroTargets`, weekly projection via `getWeeklyProjection()`
- Weight formula: 3,500 cal surplus = +1 lb, 3,500 cal deficit = -1 lb (projected over 7 days)
- Groq Edge Function URL: `https://bvnkzimwskuruhdmzpbt.supabase.co/functions/v1/groq-nutrition`
- SW cache still at v13 — bump if nutrition.js changes break cached sessions
