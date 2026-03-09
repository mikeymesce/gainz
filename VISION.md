# GAINZ — Product Vision

> The goal: one app that knows everything about your body and helps you train smarter.

---

## What GAINZ Is Today

A gym tracking app. You log your workouts manually — exercises, sets, weights, reps. It tracks your PRs, streaks, volume, and progress over time. Single-file PWA, works offline, no account needed.

---

## Where GAINZ Is Going

### Phase 1: Best-in-Class Gym Tracker (NOW)
What we have, but polished. Fast, clean, reliable workout logging.
- Manual exercise logging with smart defaults
- PR detection, progressive overload suggestions
- Templates, supersets, rest timers
- Workout history and progress charts
- Split-based programming (PPL, Bro, Upper/Lower, Arnold, Custom)

### Phase 2: AI Personal Trainer
The app stops being a notebook and starts being a coach.

**Science-Backed Exercise Intelligence**
- Each exercise gets tagged with real research — what muscles it hits, optimal rep ranges, common mistakes, injury risks
- "Did you know? Studies show incline dumbbell press activates upper chest 69% more than flat bench" type insights
- Suggestions for exercises you haven't tried but science says are effective for your goals

**Trainer Personality Opinions**
- Curated takes from popular fitness voices (Jeff Nippard, Jeff Cavaliere, Dr. Mike Israetel, Cbum, etc.)
- Each trainer's SPECIFIC opinion on exercises, programming, and form
- "Jeff Nippard says: 3-4 sets of 8-12 reps, controlled eccentric" vs "Dr. Mike says: take this closer to failure, 2 RIR max"
- You could pick a "coach voice" or see all perspectives side by side

**Personalized Training Advice**
- Analyzes YOUR data (volume, frequency, progress trends, stall points)
- "Your bench has stalled for 3 weeks — try adding paused reps or switching to dumbbell press"
- "You're hitting chest 3x/week but back only 1x — that imbalance could cause shoulder issues"
- Deload recommendations based on accumulated fatigue

**Periodization Awareness**
- Understands training phases: hypertrophy, strength, deload, peak, cut, bulk
- Adjusts recommendations based on what phase you're in
- "You're in week 6 of a hypertrophy block — consider a deload next week"
- Long-term programming, not just day-to-day logging

### Phase 3: Wearable Integration & Body Data Aggregator
Every device you wear feeds into one place.

**How it works (the 3 layers):**

```
LAYER 1 — THE PIPES (Integrations)
Every app has an API (a door that lets other apps pull data).
GAINZ connects to each one and pulls your data in.

  Whoop ──┐
  Aura ────┤
  Strava ──┤
  Peloton ─┤──→  GAINZ SERVER  ──→  UNIFIED DATABASE  ──→  YOUR DASHBOARD
  Apple ───┤       (fetches)          (translates)           (displays)
  MFP ─────┘

LAYER 2 — THE WAREHOUSE (Unified Data)
Every app stores data differently. GAINZ translates it all
into one common format so it can be compared and analyzed.

  Whoop says: "HRV: 45, Recovery: 78%"
  Strava says: "Run: 3.2mi, pace: 8:15/mi"
  Peloton says: "45min ride, 320kJ output"
  MyFitnessPal says: "2,400 cal, 180g protein"

  GAINZ says: here's ALL of that, together, on one screen.

LAYER 3 — THE DASHBOARD (What you see)
One unified view of your entire physical life.
```

**Integrations roadmap:**
- **Whoop** — HRV, recovery score, strain, sleep stages
- **Aura/Oura Ring** — sleep quality, readiness, body temperature
- **Strava** — runs, rides, swims, outdoor activities
- **Peloton/SoulCycle/CycleBar** — indoor cycling metrics
- **Apple Health** — steps, heart rate, general activity
- **MyFitnessPal** — nutrition, calories, macros
- **CrossFit / Ironman / Pilates apps** — class data, benchmarks

**Meta-Analysis**
- Each wearable gives you ITS analysis in isolation
- GAINZ gives you THE analysis — combining all of them
- "Your Whoop says recovery is low, your Oura says you slept 5 hours, and you hit legs hard yesterday — maybe do a light upper body day or active recovery"
- Correlations you'd never see on your own: "You PR more often on days where you slept 7+ hours and ate 150g+ protein"

### Phase 4: Injury Tracking & Prevention
- Log injuries and pain points ("left shoulder, mild, started March 2026")
- App adjusts exercise suggestions to work around injuries
- Flags when you're loading a previously injured area too aggressively
- Track recovery progress over time
- "Your shoulder has been pain-free for 4 weeks — safe to reintroduce overhead pressing gradually"

---

## Technical Requirements (What Needs to Be Built)

| What | Why | When |
|---|---|---|
| Split codebase into multiple files | One 291KB file is unmaintainable with 2+ people | NOW |
| Backend server (Node.js or Python) | APIs require a server to talk to securely | Phase 3 |
| Real database (PostgreSQL or similar) | localStorage can't handle multi-source data | Phase 3 |
| User accounts & auth | Need to identify who's pulling what data | Phase 3 |
| API integration layer | Standardized way to connect new data sources | Phase 3 |
| AI/LLM layer | For personalized advice and trainer opinions | Phase 2 |

---

## Core Principles

1. **Your data, your control** — everything exportable, nothing locked in
2. **Offline first** — the gym has bad wifi. Core tracking always works without internet
3. **Simple by default, powerful when you dig** — a beginner sees a clean tracker, a power user sees everything
4. **Science over bro-science** — every recommendation backed by research, with sources
5. **One screen to rule them all** — stop opening 5 apps to understand your own body

---

## What GAINZ Is NOT

- Not a social media app (maybe someday, not now)
- Not a meal planner (integrates with MFP, doesn't replace it)
- Not a medical device (insights, not diagnoses)

---

*Last updated: March 2026*
*Written by Mike Mesce with help from Claude*
