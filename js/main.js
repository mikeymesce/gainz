// ═══════════════════════════════════════════
// GAINZ — Module Entry Point
// Imports from ES modules and exposes to window
// for the legacy script (onclick handlers need globals)
// ═══════════════════════════════════════════

// Clean up broken service worker from earlier builds
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(r => r.unregister());
  });
  caches.delete('gainz-v1');
}
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
  maybeShowCoachTip, removeCoachTip,
  maybeShowCinematic, dismissCinematic
} from './onboarding.js';
import {
  openImportModal, closeImportModal, renderImportStep,
  importStartParse, importToggle, importCommit,
  importSelectAll, importSelectNone, importGoToStep,
  importRestart, importViewHistory
} from './import.js';
import {
  save, saveImmediate, saveAndSync, debouncedSave, checkStorageQuota,
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
  buildProgChart, setProgChartMode
} from './progress-chart.js';
import {
  getUser, signUp, signIn, signOut, resetPassword, isLoggedIn,
  syncToCloud, syncFromCloud,
  renderCloudSyncCard, renderSyncUI
} from './supabase.js';

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
  maybeShowCinematic, dismissCinematic,
  // Import
  openImportModal, closeImportModal, renderImportStep,
  importStartParse, importToggle, importCommit,
  importSelectAll, importSelectNone, importGoToStep,
  importRestart, importViewHistory,
  // Persistence
  save, saveImmediate, saveAndSync, debouncedSave, checkStorageQuota,
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
  buildProgChart, setProgChartMode,
  // Cloud sync
  getUser, signUp, signIn, signOut, resetPassword, isLoggedIn,
  syncToCloud, syncFromCloud,
  renderCloudSyncCard, renderSyncUI,
});

// ── Ambient particles (persistent floating embers) ──
(function spawnAmbientParticles() {
  const container = document.getElementById('ambient-particles');
  if (!container) return;
  for (let i = 0; i < 25; i++) {
    const p = document.createElement('div');
    p.className = 'amb-particle';
    const x = Math.random() * 100;
    const delay = Math.random() * 8;
    const dur = 6 + Math.random() * 6;
    const size = 1 + Math.random() * 2;
    p.style.cssText = `left:${x}%;bottom:-10px;width:${size}px;height:${size}px;animation-delay:${delay}s;animation-duration:${dur}s;`;
    container.appendChild(p);
  }
})();

// Load legacy script — guaranteed to run after modules are ready
const script = document.createElement('script');
script.src = 'js/app-legacy.js';
document.body.appendChild(script);
