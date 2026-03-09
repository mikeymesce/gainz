// ═══════════════════════════════════════════
// GAINZ — Module Entry Point
// Imports from ES modules and exposes to window
// for the legacy script (onclick handlers need globals)
// ═══════════════════════════════════════════
import { FEATURES, SCHEMA_VERSION, VERSION, GLOBAL_DEFAULT, SPLIT_COLORS, TAG_COLORS } from './config.js';
import {
  OVERLOAD_PCT, DEFAULT_OVERLOAD_PCT, ALL_SPLITS, SPLIT_META, PROGRAMS,
  SPLIT, BW_EXERCISES, DEFAULT_RESTS, THEMES, MRV, EX_MUSCLES, REST_RECS,
  TIP_CATEGORIES, RESEARCH_TIPS
} from './data.js';
import { migrateState } from './state.js';
import {
  today, todayStr, fmt, fmtMs, vol, est1RM, sid, esc, sanitize,
  showToast, haptic, confetti
} from './utils.js';
import { playBeep } from './audio.js';
import {
  showSplash, dismissSplash, maybeShowSplash,
  maybeShowCoachTip, removeCoachTip
} from './onboarding.js';
import {
  openImportModal, closeImportModal, renderImportStep,
  importStartParse, importToggle, importCommit,
  importSelectAll, importSelectNone, importGoToStep,
  importRestart, importViewHistory
} from './import.js';
import {
  save, saveImmediate, debouncedSave, checkStorageQuota,
  requestWakeLock, releaseWakeLock, checkOnline, exportData
} from './persistence.js';
import {
  getActiveSplits, getRec, getLastSession, isPR,
  getWeeklyMuscleSets, getSuggestedWeight, splitName,
  setProgram
} from './workout-logic.js';
import {
  startTimer, startTimerRaw, refreshTimerNum, adjTimer,
  skipTimer, startWoTimer, stopWoTimer
} from './timers.js';
import {
  getTips, hasTipShown, openTip, dismissTip, setTipCat, cycleTipCat,
  buildTipPanel, openLibrary, closeLibrary, libToggle, libSetCat
} from './research-tips.js';
import {
  buildProgChart, buildSparkline, setProgChartMode
} from './progress-chart.js';

// Expose all module exports to window so app-legacy.js can use them
Object.assign(window, {
  // Config
  FEATURES, SCHEMA_VERSION, VERSION, GLOBAL_DEFAULT, SPLIT_COLORS, TAG_COLORS,
  // Data
  OVERLOAD_PCT, DEFAULT_OVERLOAD_PCT, ALL_SPLITS, SPLIT_META, PROGRAMS,
  SPLIT, BW_EXERCISES, DEFAULT_RESTS, THEMES, MRV, EX_MUSCLES, REST_RECS,
  TIP_CATEGORIES, RESEARCH_TIPS,
  // State
  migrateState,
  // Utils
  today, todayStr, fmt, fmtMs, vol, est1RM, sid, esc, sanitize,
  showToast, haptic, confetti,
  // Audio
  playBeep,
  // Onboarding
  showSplash, dismissSplash, maybeShowSplash,
  maybeShowCoachTip, removeCoachTip,
  // Import
  openImportModal, closeImportModal, renderImportStep,
  importStartParse, importToggle, importCommit,
  importSelectAll, importSelectNone, importGoToStep,
  importRestart, importViewHistory,
  // Persistence
  save, saveImmediate, debouncedSave, checkStorageQuota,
  requestWakeLock, releaseWakeLock, checkOnline, exportData,
  // Workout logic
  getActiveSplits, getRec, getLastSession, isPR,
  getWeeklyMuscleSets, getSuggestedWeight, splitName,
  setProgram,
  // Timers
  startTimer, startTimerRaw, refreshTimerNum, adjTimer,
  skipTimer, startWoTimer, stopWoTimer,
  // Research tips
  getTips, hasTipShown, openTip, dismissTip, setTipCat, cycleTipCat,
  buildTipPanel, openLibrary, closeLibrary, libToggle, libSetCat,
  // Progress chart
  buildProgChart, buildSparkline, setProgChartMode,
});

// Load legacy script — guaranteed to run after modules are ready
const script = document.createElement('script');
script.src = 'js/app-legacy.js';
document.body.appendChild(script);
