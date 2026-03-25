# GAINZ — Changelog

> Skim this to get up to speed. Recent work on top, older stuff condensed.

---

## Latest — March 24-25 (Sessions 8-10)

### BREAK FREE — New App for Morgan
- **Separate calorie + weight loss tracker** at `/breakfree/`
- Pink/feminine theme, personalized for Morgan
- **Calorie budget** — 1,500 cal countdown with progress bar, turns yellow/red as she approaches limit
- **254-item food database** — instant search-as-you-type, covers proteins, veggies, fast food, snacks, drinks, vegetarian staples
- **CalorieNinjas API** — automatic fallback for foods not in database, shows protein/carbs/fat breakdown
- **ChatGPT integration** — copy a prompt, tell ChatGPT what you ate, paste answer back to auto-log meals
- **Frequent foods** — most-eaten foods show at top of search for one-tap re-logging
- **Serving size picker** — ½, 1x, 1.5x, 2x portions or enter exact calories
- **Daily weigh-in** with goal progress bar (135 → 115 lb)
- **Calendar tab** — full history, tap any day to see/edit meals, weight, calories burned
- **Weekly trends** — average calories eaten/burned/net, weight chart, calorie chart
- **Cloud sync** — Supabase login to back up data
- **Onboarding** — splash intro explaining the app, weight setup on first open, pink tour tip bubbles
- **Sign-in popup** on first load — sign in, create account, or continue as guest

### Home Screen Overhaul
- **Daily Check-in** — merged creatine, vitamins, weigh-in, water into one compact button/modal
- **Water tracking** in ounces with +/- buttons and quick-add (+16oz, +24oz, +32oz), goal: 100oz
- **Individual supplement toggles** — Vitamin D, Zinc, Magnesium, Fish Oil, Allergy Pill, Zyrtec
- **Adjustable daily goals** — water, creatine dose, supplement list editable from check-in
- **Cardio** moved to split carousel alongside Push/Pull/Legs
- **Quick Start button** on home screen — jump into workout without picking a split
- **Removed clutter** — weekly report moved to Me tab, fun stat removed, supplements+cardio merged
- **Calendar button** more visible with 📅 emoji and "TAP FOR CALENDAR" hint

### Calendar Upgrades
- **Tappable days** — tap any day to see workouts, bodyweight, creatine, cardio
- **Green dots** for creatine days, gold dots for workouts, weight numbers on each day
- **Retroactive creatine logging** — toggle creatine on/off for past days
- **Edit past workouts** from calendar with save/discard confirmation
- **Cardio shows in calendar** day view

### Workout Features
- **Drop sets** — mark any set as a drop set, add multiple weight drops with reps
- **Sauna tracking** — toggle on during workout, log minutes + temperature
- **Editable workout duration** on summary screen
- **Previous sets always visible** — last session's sets expanded by default
- **Quick Start via LOG button** — starts workout with all exercises available, auto-categorizes split at finish

### Post-Workout Experience
- **3 Pillars tips** — nutrition, sleep, exercise tips rotate after each workout (28 total)
- **12 myth-busters** with "MYTH BUSTED" badge — protein window, soreness, ice baths, muscle memory, etc.
- **Post-workout signup nudge** — prompts unsigned users to create account after first workout to prevent data loss

### Opening Experience
- **Cinematic quotes show every open** — motivational stats, tap to skip after 0.5s
- **Smoother fade** — 1.2s dissolve into home screen
- **No more blink** — splash starts visible, covers app from first paint
- **Particles start lower** — more dramatic rising effect

### Fixes & Polish
- **GAINZ centered in header**
- **Safe-area padding** on header + recovery banner for iPhone PWA
- **Recovery banner buttons tappable** — no longer hidden behind status bar
- **Nav bar full-width** — no longer constrained to 430px
- **App icon** — gold GAINZ text on black for home screen
- **Cache-busting** — no-cache headers + version strings on CSS/JS
- **Password reset** for Cloud Sync
- **Save confirmation** on workout edits — save or discard changes
- **Modal scroll** — modals capped at 85vh with overflow scroll

---

## March 16 (Session 7)

### Supplement Tracker (New Feature)
- **Creatine toggle** on home screen — tap to check off daily, adjustable dose in 0.5g steps
- **Vitamins toggle** — customizable list (Vitamin D, Fish Oil, Multivitamin by default), tap individual chips or toggle all, edit to add/remove
- **Weigh-in button** on home screen — quick bodyweight log with time-of-day tagging (morning/afternoon/night)
- **Creatine X/7** stat added to Me screen stats strip

### Cloud Sync via Supabase (New Feature)
- **Supabase integration** — data persists across devices (phone + laptop)
- **Email/password auth** in Settings > Cloud Sync (optional, app works without it)
- **Syncs at key moments** — finish workout, log bodyweight, toggle creatine/vitamins
- **Auto-pulls on app load**, auto-pushes on reconnect
- **Offline-first** — localStorage stays source of truth, cloud is backup + sync

### Deployment
- **GitHub Pages** — app live at mikeymesce.github.io/gainz
- Added `.nojekyll` for clean static serving

### Small Changes
- Removed "live 23% longer" onboarding stat
- Schema bumped to v7 (supplements, vitaminTypes, sync timestamps)

---

## March 10 (Session 6)

### Cinematic → Onboarding Transition Polish
- **GAINZ logo emerges slowly** — 3.5s fade with heavy ease-in curve (`cubic-bezier(0.8,0,1,1)`) + scale-down from 115% → 100%, matching the cinematic headline feel
- **Tightened dead space** — cinematic-to-GAINZ gap reduced to ~200ms (was ~700ms)
- **Rebalanced onboarding delays** — tagline 3.0s, cards 4.0s, dots 4.4s, skip 4.8s to match new logo timing

### Bug Fixes
- **Tour tooltips scroll fix** — tooltips that land off-screen on mobile now auto-scroll into view
- **Tip reorder** — "66 days" stat tip shows first, "12 weeks" pushed to last

### Codebase Health
- **Service worker removed** — broken cache-first SW in app-legacy.js was preventing the app from loading in regular browsers. Added one-time cleanup in main.js.
- **Dead code removed** — deleted `app.js` (4,324 lines, pre-refactor), `copyLastSet`, `buildSparkline`, `getProgChartMode`
- **CSS cleanup** — replaced 20+ hardcoded hex values with CSS variables, removed 15 unused selectors
- **Import parser fixes** — dash-date support, dynamic year default, combined exercise+sets line parsing, fixed Skip handling

---

## March 10 (Session 5)

### Cinematic Intro Polish
- **"Literally." enters separately** — split from headline into its own `.cin-punch` element with scale-in animation (italic, 1.15 scale)
- **Slower dramatic entrance** — 2s opacity, 3s scale on "Literally." for weight
- **Gold headline text** — `.cin-headline` and `.cin-punch` use `var(--accent)` instead of white, font-weight bumped to 500
- **Crossfade transition** — cinematic text fades out first (`.cin-content-fade`), then black bg dissolves into GAINZ onboarding
- **More legible citation** — bumped `.cin-cite` opacity from 0.2 to 0.45
- **Rotating study citations** — first cinematic stat cycles through 6 citations (Pereira 2007 → Zhao 2025), one per app open
- **Pinned card order** — Personal Coach → Science-Backed → Wild Stats → random 4th from remaining pool

### Bug Fixes
- **Fixed blank screen** — cinematic overlay stayed visible (display:flex) when `gainz_onboard_views >= 10`. Now explicitly hidden.
- **Fixed silent JS crash** — duplicate `const cite` in `showCinematic()` killed the module. Renamed to `citeEl`.

---

## March 9 (Session 4)

### Home Screen Overhaul
- **Muscle volume tracker** on home screen — weekly sets per muscle group vs MRV, color-coded bars (under MEV / good / near MRV / exceeded). Source: Israetel et al.
- **Moved daily insight/quote** from bottom of home page to right below the day streak — more visible now.

### Workout Flow
- **Smart Start**: `startWorkout()` auto-loads exercises from your last same-split workout. Shows toast ("Loaded last Push day"). Picker only opens if it's your first time doing that split.
- **Auto-save templates**: Workouts silently save as templates on finish (replaces existing for that split). No more manual "Save as Template" button.
- **Removed Done button** from exercise cards — redundant with Next Exercise.
- **Next Exercise on last exercise** now opens the exercise picker instead of scrolling to Finish.
- **Removed "Repeat last" button** — redundant with Smart Start.

### History & Settings
- **History search** — search bar filters workouts by exercise name.
- **Calendar heat map** — 8-week activity grid in the history tab.
- **Bodyweight trend chart** — SVG chart in Settings showing weight over time with delta.

### Import
- **Always ask about unknowns** — all unrecognized exercise terms get flagged for clarification (removed filtering that skipped "plain full names").
- **Clarification limit** bumped from 10 to 20.

---

## March 9 (Session 3)

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
