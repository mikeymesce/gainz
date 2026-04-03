// ═══════════════════════════════════════════
// TIMERS — Rest timer + workout duration timer
// ═══════════════════════════════════════════
import { GLOBAL_DEFAULT } from './config.js';

let timerInterval = null;
let timerEnd = null;     // wall-clock timestamp (ms) when rest timer expires
let timerDone = false;   // true once beep fires, prevents double-fire
let woTimerInterval = null;
let woStartTime = null;
let currentTimerExercise = null;

export function startTimer(exercise){
  currentTimerExercise = exercise;
  const rest = window.state.exerciseRests[exercise] ?? GLOBAL_DEFAULT;
  startTimerRaw(rest, exercise.toUpperCase());
}

// Used by superset flow and nextExercise — starts timer with arbitrary seconds/label
export function startTimerRaw(seconds, label){
  clearInterval(timerInterval);
  timerDone = false;
  timerEnd = Date.now() + seconds * 1000;
  const bar = document.getElementById("timer-bar");
  bar.classList.add("active");
  document.getElementById("timer-label").textContent = label;
  refreshTimerNum();
  // Poll at 250ms so the display stays accurate even after browser throttling
  timerInterval = setInterval(() => {
    const remaining = Math.ceil((timerEnd - Date.now()) / 1000);
    if(remaining > 0){
      refreshTimerNum();
    } else if(!timerDone){
      timerDone = true;
      clearInterval(timerInterval);
      playBeep();
      const d = document.getElementById("timer-display");
      if(d) d.innerHTML = `<div class="timer-done">✓ GO</div>`;
      const overStart = Date.now();
      timerInterval = setInterval(() => {
        const over = Math.floor((Date.now() - overStart) / 1000);
        const d2 = document.getElementById("timer-display");
        if(d2) d2.innerHTML = `<div class="timer-num" id="timer-num" style="color:var(--muted);font-size:20px;">+${fmt(over)}</div>`;
      }, 500);
    }
  }, 250);
}

export function refreshTimerNum(){
  const remaining = timerEnd ? Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000)) : 0;
  const e = document.getElementById("timer-num");
  if(e) e.textContent = fmt(remaining);
}

export function adjTimer(d){
  if(timerEnd) timerEnd += d * 1000;
  refreshTimerNum();
}

export function skipTimer(){
  clearInterval(timerInterval);
  timerEnd = null;
  timerDone = false;
  const b = document.getElementById("timer-bar");
  if(b) b.classList.remove("active");
  const d = document.getElementById("timer-display");
  if(d) d.innerHTML = `<div class="timer-num" id="timer-num">0:00</div>`;
}

export function getTimerExercise(){ return currentTimerExercise; }

export function startWoTimer(){
  // Use activeWorkout.startTime if available so timer survives app backgrounding
  woStartTime = (window.activeWorkout && window.activeWorkout.startTime) || Date.now();
  clearInterval(woTimerInterval);
  const el = document.getElementById("wo-timer");
  el.style.display = "block";
  woTimerInterval = setInterval(() => {
    const el = document.getElementById("wo-timer");
    if(el && woStartTime) el.textContent = fmtMs(Date.now() - woStartTime);
  }, 1000);
}

export function stopWoTimer(){
  clearInterval(woTimerInterval);
  woStartTime = null;
  const el = document.getElementById("wo-timer");
  if(el) el.style.display = "none";
}
