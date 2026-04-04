# GAINZ — Product Vision

> One app that knows everything about your body and helps you train smarter.

---

## Phase 1: Gym Tracker (NOW)
Polished manual workout logging — sets, reps, weight, PRs, streaks, templates, supersets, rest timers, progress charts, split-based programming.

## Phase 2: AI Personal Trainer
The app becomes a coach.

- **Science-backed insights** — real research on every exercise (muscles, rep ranges, mistakes, alternatives you haven't tried)
- **Trainer opinions** — curated takes from Jeff Nippard, Dr. Mike, Cavaliere, Cbum, etc. Each trainer's specific opinion on your exercises. Pick a "coach voice" or compare all perspectives.
- **Personalized advice** — analyzes your data to catch stalls, imbalances, and fatigue. "Your bench stalled 3 weeks — try paused reps or switch to dumbbells."
- **Periodization** — understands hypertrophy, strength, deload, cut, bulk phases. Adjusts recommendations to where you are in your program.

## Phase 3: Body Data Aggregator
Every device and app feeds into one place.

```
Whoop ──┐
Oura ────┤
Strava ──┤──→ GAINZ SERVER ──→ UNIFIED DATA ──→ ONE DASHBOARD
Peloton ─┤
Apple ───┤
MFP ─────┘
```

**Integrations:** Whoop (HRV, recovery, strain) · Oura (sleep, readiness) · Strava (runs, rides, swims) · Peloton/SoulCycle/CycleBar · Apple Health · MyFitnessPal (nutrition, macros) · CrossFit/Ironman/Pilates apps

**Meta-analysis:** Each wearable gives you its analysis in isolation. GAINZ combines all of them. "Whoop says recovery is low + Oura says 5hrs sleep + you hit legs yesterday → light upper day or active recovery." Finds correlations: "You PR more on 7+ hrs sleep and 150g+ protein days."

## Phase 4: Injury Tracking
Log injuries → app adjusts exercise suggestions → flags overloading injured areas → tracks recovery → tells you when it's safe to reintroduce movements.

## Phase 5: Motion Tracking
Phone replaces manual logging — auto-detects exercises, counts reps, flags form issues.

- **Camera-based (near-term):** TensorFlow.js + MoveNet pose estimation in-browser. Phone propped up, watches you lift. Identifies exercise, counts reps, estimates ROM. Weight still entered manually.
- **Wearable-based (mid-term):** Apple Watch companion app (requires native Swift). Best accuracy for rep counting via accelerometer/gyroscope. Also captures heart rate during sets.
- **Full auto (long-term):** Camera detects plates on bar → auto-logs weight. Combined with wearable for rep count. True hands-free logging.

---

## Tech Roadmap

| What | When |
|---|---|
| Split codebase into multiple files | ✅ Done |
| User accounts & auth | ✅ Done (Supabase) |
| AI/LLM layer for advice | Phase 2 |
| Backend server + database | Phase 3 |
| API integration layer | Phase 3 |
| Camera pose estimation (TF.js) | Phase 5 |
| Apple Watch companion (native) | Phase 5 |

## Principles

1. **Your data, your control** — exportable, never locked in
2. **Offline first** — core tracking works without internet
3. **Simple default, powerful depth** — beginner sees clean tracker, power user sees everything
4. **Science over bro-science** — recommendations backed by research
5. **One screen** — stop opening 5 apps to understand your body

---

*March 2026 · Mike Mesce + Claude*
