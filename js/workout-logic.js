// ═══════════════════════════════════════════
// WORKOUT LOGIC — Pure computation helpers
// ═══════════════════════════════════════════
import { OVERLOAD_PCT, DEFAULT_OVERLOAD_PCT, PROGRAMS, EX_MUSCLES, MRV } from './data.js';

export function getActiveSplits(){
  const prog = window.state.program || "ppl";
  if(prog === "custom") return window.state.customSplits && window.state.customSplits.length ? window.state.customSplits : ["Push","Pull","Legs"];
  return PROGRAMS[prog]?.splits || ["Push","Pull","Legs","Core"];
}

export function getRec(){
  const sp = getActiveSplits();
  const last = window.state.workouts.slice(0, sp.length+2).map(w => w.split);
  for(const s of sp) if(!last.includes(s)) return s;
  const c = sp.map(s => last.filter(x => x===s).length);
  return sp[c.indexOf(Math.min(...c))];
}

export function getLastSession(name){
  for(const w of window.state.workouts){
    const e = w.exercises.find(e => e.name===name);
    if(e && e.sets.length) return e;
  }
  return null;
}

export function isPR(name, weight, isWarmup, currentWorkout){
  if(isWarmup) return false;
  if(!weight || isNaN(parseFloat(weight))) return false;
  const w = parseFloat(weight);
  for(const wo of window.state.workouts){
    const e = wo.exercises.find(e => e.name===name);
    if(e) for(const s of e.sets) if(!s.bw && !s.warmup && parseFloat(s.weight)>=w) return false;
  }
  if(currentWorkout){
    const e = currentWorkout.exercises.find(e => e.name===name);
    if(e) for(const s of e.sets) if(!s.bw && !s.warmup && parseFloat(s.weight)>=w) return false;
  }
  return true;
}

export function getWeeklyMuscleSets(){
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0,0,0,0);
  const counts = {};
  Object.keys(MRV).forEach(m => counts[m] = 0);
  window.state.workouts.filter(w => new Date(w.timestamp) >= weekStart).forEach(w => {
    w.exercises.forEach(e => {
      const muscles = EX_MUSCLES[e.name] || [];
      const workSets = e.sets.filter(s => !s.warmup).length;
      muscles.forEach((m, mi) => {
        counts[m] = (counts[m]||0) + (mi===0 ? workSets : Math.ceil(workSets*0.5));
      });
    });
  });
  return counts;
}

export function getSuggestedWeight(name){
  const last = getLastSession(name);
  if(!last || !last.sets.length) return null;
  const weightedSets = last.sets.filter(s => !s.bw && parseFloat(s.weight) > 0);
  if(!weightedSets.length) return null;
  const lastWeight = parseFloat(weightedSets[weightedSets.length-1].weight);
  const lastReps = parseInt(weightedSets[weightedSets.length-1].reps);
  if(!lastWeight || !lastReps) return null;
  const pct = (OVERLOAD_PCT[name] ?? DEFAULT_OVERLOAD_PCT) / 100;
  const minRepsToProgress = (OVERLOAD_PCT[name] >= 5) ? 5 : 8;
  const shouldIncrease = lastReps >= minRepsToProgress;
  if(!shouldIncrease) return { weight: lastWeight, same: true };
  const raw = lastWeight * (1 + pct);
  const rounded = Math.round(raw / 2.5) * 2.5;
  return { weight: rounded, same: false, pct: OVERLOAD_PCT[name] ?? DEFAULT_OVERLOAD_PCT };
}

export function splitName(key){
  return (window.state.splitNames && window.state.splitNames[key]) || key;
}

export function setProgram(p){
  window.state.program = p;
  if(p !== "custom") window.state.customSplits = [...(PROGRAMS[p]?.splits || [])];
  saveImmediate();
  render();
  showToast('Switched to ' + (PROGRAMS[p]?.label || p));
}

