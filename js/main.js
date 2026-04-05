// ═══════════════════════════════════════════
// GAINZ — Module Entry Point
// Imports from ES modules and exposes to window
// for the legacy script (onclick handlers need globals)
// ═══════════════════════════════════════════

// Register service worker for auto-updates + offline support
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/gainz/sw.js').then(reg => {
    // Check for updates every time the app loads
    reg.update();
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'activated') {
          // New version available — reload to get it
          window.location.reload();
        }
      });
    });
  }).catch(err => console.warn('[SW] Registration failed:', err));
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
  maybeShowCinematic, dismissCinematic, skipCinematic
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
  setProgram,
  roundToNearest5, calcWarmupSets, loadWarmups
} from './workout-logic.js';
import {
  startTimer, startTimerRaw, refreshTimerNum, adjTimer,
  skipTimer, startWoTimer, stopWoTimer, getTimerExercise
} from './timers.js';
import {
  getTips, hasTipShown, openTip, dismissTip, setTipCat, cycleTipCat,
  buildTipPanel, openLibrary, closeLibrary, libToggle, libSetCat
} from './research-tips.js';
import {
  buildProgChart, setProgChartMode
} from './progress-chart.js';
import {
  getChallengeState, startChallenge, toggleChallengeEx, challengeNavDay,
  logChallengeDay, addChallengeQuick, addChallengeQuickSilent, addChallengeSet,
  deleteChallengeSet, resetChallenge, renderChallenge, renderInlineChallenge,
  inlineChallengeAdd
} from './challenge.js';
import {
  DEFAULT_VITAMINS, getVitaminList, getTodaySupp, ensureTodaySupp,
  toggleCreatine, toggleVitamin, toggleAllVitamins, adjustCreatineDose,
  addWater, removeWater, adjustCreatine, saveCreatineDose,
  openVitaminSettings, addVitaminRow, saveVitaminList,
  suppWeekCount, renderSuppCard,
  renderDailyCheckin, openDailyCheckin, openCheckinSettings, saveCheckinSettings,
  CARDIO_TYPES, getTodayCardio, openCardioLog, saveCardio, deleteCardio, renderCardioCard
} from './daily-tracking.js';
import {
  toggleHomeCal, homeCalNav, openCalDay, openCalWorkout,
  toggleCalVitamin, adjustCalWater, saveCalBW,
  adjustCalCreatine, toggleCalCreatine,
  buildHomeCalInner, buildHomeCal
} from './home-calendar.js';
import {
  runTests, logDebug, openDebug, closeDebug, initTestsAndDebug, TEST_RESULTS
} from './tests.js';
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
  maybeShowCinematic, dismissCinematic, skipCinematic,
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
  roundToNearest5, calcWarmupSets, loadWarmups,
  // Timers
  startTimer, startTimerRaw, refreshTimerNum, adjTimer,
  skipTimer, startWoTimer, stopWoTimer, getTimerExercise,
  // Research tips
  getTips, hasTipShown, openTip, dismissTip, setTipCat, cycleTipCat,
  buildTipPanel, openLibrary, closeLibrary, libToggle, libSetCat,
  // Progress chart
  buildProgChart, setProgChartMode,
  // Challenge
  getChallengeState, startChallenge, toggleChallengeEx, challengeNavDay,
  logChallengeDay, addChallengeQuick, addChallengeQuickSilent, addChallengeSet,
  deleteChallengeSet, resetChallenge, renderChallenge, renderInlineChallenge,
  inlineChallengeAdd,
  // Daily tracking
  DEFAULT_VITAMINS, getVitaminList, getTodaySupp, ensureTodaySupp,
  toggleCreatine, toggleVitamin, toggleAllVitamins, adjustCreatineDose,
  addWater, removeWater, adjustCreatine, saveCreatineDose,
  openVitaminSettings, addVitaminRow, saveVitaminList,
  suppWeekCount, renderSuppCard,
  renderDailyCheckin, openDailyCheckin, openCheckinSettings, saveCheckinSettings,
  CARDIO_TYPES, getTodayCardio, openCardioLog, saveCardio, deleteCardio, renderCardioCard,
  // Home calendar
  toggleHomeCal, homeCalNav, openCalDay, openCalWorkout,
  toggleCalVitamin, adjustCalWater, saveCalBW,
  adjustCalCreatine, toggleCalCreatine,
  buildHomeCalInner, buildHomeCal,
  // Tests & debug
  runTests, logDebug, openDebug, closeDebug, initTestsAndDebug, TEST_RESULTS,
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

// Pause workout clock when app is backgrounded so background time isn't
// counted toward workout duration. Shifts startTime forward by however long
// the app was hidden, which also fixes the "3-hour workout" bug.
{
  let _bgHiddenAt = null;
  document.addEventListener('visibilitychange', () => {
    if(document.hidden){
      if(window.activeWorkout) _bgHiddenAt = Date.now();
    } else {
      if(window.activeWorkout && _bgHiddenAt){
        window.activeWorkout.startTime += Date.now() - _bgHiddenAt;
        try{ localStorage.setItem('gainz_recovery', JSON.stringify(window.activeWorkout)); }catch(e){}
      }
      _bgHiddenAt = null;
    }
  });
}

// Load legacy script — guaranteed to run after modules are ready
const script = document.createElement('script');
script.src = 'js/app-legacy.js';
document.body.appendChild(script);
