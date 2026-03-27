// ═══════════════════════════════════════════
// TIMERS — Rest timer + workout duration timer
// ═══════════════════════════════════════════
import { GLOBAL_DEFAULT } from './config.js';

let timerInterval = null;
let timerLeft = 0;
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
  timerLeft = seconds;
  clearInterval(timerInterval);
  const bar = document.getElementById("timer-bar");
  bar.classList.add("active");
  document.getElementById("timer-label").textContent = label;
  refreshTimerNum();
  let overCount = 0;
  timerInterval = setInterval(() => {
    timerLeft--;
    if(timerLeft > 0){
      refreshTimerNum();
    } else if(timerLeft === 0){
      clearInterval(timerInterval);
      playBeep();
      const d = document.getElementById("timer-display");
      if(d) d.innerHTML = `<div class="timer-done">✓ GO</div>`;
      timerInterval = setInterval(() => {
        overCount++;
        const d2 = document.getElementById("timer-display");
        if(d2) d2.innerHTML = `<div class="timer-num" id="timer-num" style="color:var(--muted);font-size:20px;">+${fmt(overCount)}</div>`;
      }, 1000);
    }
  }, 1000);
}

export function refreshTimerNum(){
  const e = document.getElementById("timer-num");
  if(e) e.textContent = fmt(timerLeft);
}

export function adjTimer(d){
  timerLeft = Math.max(5, timerLeft + d);
  refreshTimerNum();
}

export function skipTimer(){
  clearInterval(timerInterval);
  const b = document.getElementById("timer-bar");
  if(b) b.classList.remove("active");
  const d = document.getElementById("timer-display");
  if(d) d.innerHTML = `<div class="timer-num" id="timer-num">0:00</div>`;
}

export function getTimerExercise(){ return currentTimerExercise; }

export function startWoTimer(){
  woStartTime = Date.now();
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
