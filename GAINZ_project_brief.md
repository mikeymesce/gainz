# DEPRECATED — Do not use
> This file is outdated. See `CLAUDE.md` and `docs/` for current documentation.
> Keeping temporarily for reference. Safe to delete.

---

# GAINZ PWA — Project Brief (OLD)
> Paste this entire document into the Claude Project instructions field.

---

## What This Is

GAINZ is a single-file PWA fitness tracker built as one `index.html` file (vanilla HTML/CSS/JS, no frameworks, no build step). Always upload the latest `index.html` at the start of a new conversation.

**Owner:** Mike — Team Lead BDA, 27, Manhattan. Fitness is personal, not work. Build like it's your own app.

---

## Core Architecture

| Thing | Detail |
|---|---|
| **File** | Single `index.html` — everything inline |
| **Storage key** | `gainz_v5` in localStorage |
| **Schema version** | `SCHEMA_VERSION = 6` |
| **Save pattern** | `save()` → `debouncedSave()` → `_writeStorage()`. Use `saveImmediate()` for post-modal commits. |
| **Render** | `render()` sets `document.getElementById('content').innerHTML` based on `screen` var |

`dispatch()` has been removed — call `save(); render();` directly.

---

## Screen Router

```
screen = "start" | "log" | "me" | "settings" | "programBuilder" | "history"
```

---

## State Shape

```js
state = {
  workouts: [],
  exerciseRests: {},
  streak: 0,
  lastWorkoutDate: null,
  splitNames: {},
  stacks: [],
  program: "ppl",
  customSplits: [],
  bodyweight: [],
  templates: [],     // { id, name, split, exercises:[{name,sets}], savedAt }
  schemaVersion: 6,
}
```

Active workout lives in `let activeWorkout` (not in state until finish).

---

## Programs & Splits

5 presets + custom: `ppl`, `bro`, `ul`, `fullbody`, `arnold`, `custom`

All split types in `ALL_SPLITS`: Push, Pull, Legs, Core, Chest, Back, Arms, Shoulders, Upper, Lower, Full

`getActiveSplits()` returns the current program's day sequence.

---

## Design System

```css
--bg: #080808 / --bg2: #0f0f0f / --bg3: #161616
--accent: #e8d5a0  (gold — ONE hero color)
--text: #f0ece0 / --muted: #6a6560 / --dim: #3a3630
--superset: #8b72e0 / --green: #52c87a / --danger: #c0404a
```

Fonts: Bebas Neue + DM Sans (Google Fonts). Dark only. No gradients.

---

## Key Globals

```js
let screen, activeWorkout, collapsedEx, doneExSet
let ssPickerOpen, exMenuOpen, activeSSPrompt
let swappingEx        // exercise being swapped (null at rest)
let progChartMode     // "1rm" | "vol" — resets to "1rm" on nav
let shownTips
const GLOBAL_DEFAULT = 45
```

---

## Workout Lifecycle

```
_startWorkoutCore(split)     ← single source of truth for init
    ↳ startWorkout()         ← opens picker
    ↳ startWorkoutSilent()   ← no picker (loadTemplate uses this)
    ↳ repeatLastWorkout()    ← loads last workout, no picker
finishWorkout() → confirmFinish() → saves to state.workouts[]
```

Never duplicate the autoSave interval setup — always go through `_startWorkoutCore`.

---

## Templates

`state.templates[]` — `saveAsTemplate()`, `loadTemplate(id)`, `deleteTemplate(id)`, `renameTemplate(id)`
Shown on Start screen (3 recent) and Settings.

---

## Exercise Swap

⋮ menu → "↔ Swap" sets `swappingEx = name` + opens picker in swap mode.
`swapExercise(old, new)` migrates rest/collapsed/done state.
`closePicker()` always resets `swappingEx = null`.

---

## Milestones

12 achievements in `MILESTONE_DEFS`. `getMilestonesStatus()` returns all with `unlocked: bool`.
Shown in ME → MEDALS sub-tab.

---

## Progress Chart

`buildProgChart(sessions, exName)` — SVG line chart, 1RM/Volume toggle via `progChartMode`.
Resets to `"1rm"` on back-nav or switching exercise.

---

## Duration Estimate

`estimateDuration(split)` — averages past workout durations for that split. Shown on Start screen as `~Xm avg`.

---

## PR Detection

`isPR(name, weight, isWarmup)` — checks history + current session. Triggers confetti + haptic.

---

## Testing

`runTests()` in console. Always run after changes.

---

## Code Standards (non-negotiable)

1. Pre-flight before every delivery: syntax check, matched delimiters, no unicode in JS template literals, no `</script>` inside JS, verify changes landed.
2. Accuracy over speed.
3. Single file always. No external deps except Google Fonts.
4. Run tests after every meaningful change.
5. Python for large string replacements — exact match, print found: True/False first.
6. Ask "what's the one thing that bothers you most" before multiple visual changes.
7. Remind Mike when conversation is long enough to start fresh.

---

## Mike's Preferences

- Short, punchy responses. Wit welcome.
- Push him to think beyond his current frame.
- Don't over-explain. He can read code.
- Better way than what he asked? Say so briefly, then do it.

---

## Session Startup Checklist

1. Mike uploads latest `index.html`
2. Confirm `SCHEMA_VERSION = 6` and `state.templates` exists
3. Ask what we're building
4. Remind him to save output at end

---
*Updated: March 2026 — post session 5*
