// ═══════════════════════════════════════════
// PERSISTENCE — Save, storage, wake lock, offline
// ═══════════════════════════════════════════
import { FEATURES } from './config.js';

let saveTimer = null;

function _writeStorage(){
  try{
    localStorage.setItem('gainz_v5', JSON.stringify(window.state));
    checkStorageQuota();
  } catch(e){
    logDebug('❌ Save failed: ' + e.message);
  }
}

export function debouncedSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    _writeStorage();
  }, 300);
}

export function saveImmediate() {
  clearTimeout(saveTimer);
  _writeStorage();
}

export function save() {
  if (window.statsCache) window.statsCache.dirty = true;
  debouncedSave();
  logDebug("💾 save()");
}

export function checkStorageQuota() {
  try {
    const used = new Blob([localStorage.getItem("gainz_v5") || ""]).size;
    if (used > 4 * 1024 * 1024) showToast("Storage nearly full — export your data in Settings");
  } catch(e) {}
}

// ── Screen Wake Lock ──
let wakeLock = null;

export async function requestWakeLock(){
  if(!FEATURES.screenWakeLock) return;
  try{ if("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen"); }catch(e){}
}

export function releaseWakeLock(){
  if(wakeLock){ wakeLock.release(); wakeLock = null; }
}

// ── Offline Detection ──
export function checkOnline(){
  if(!FEATURES.offlineDetection) return;
  if(!navigator.onLine) showToast("Offline — app works fine, fonts may not load");
}

// ── Cloud Sync Helper ──
export function saveAndSync() {
  saveImmediate();
  if (window.syncToCloud) {
    window.syncToCloud();
  }
  if (window.maybeSaveBackup) {
    window.maybeSaveBackup();
  }
}

window.addEventListener("offline", () => showToast("Gone offline — data saves locally"));
window.addEventListener("online", () => {
  showToast("Back online — syncing...");
  if (window.syncToCloud) window.syncToCloud();
});

// ── Export Data ──
export function exportData(){
  const json = JSON.stringify(window.state, null, 2);
  const blob = new Blob([json], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gainz-backup-' + todayStr().replace(/[^a-z0-9]/gi, '-') + '.json';
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.createObjectURL(url); a.remove(); }, 1000);
  showToast('Data exported ✓');
}
