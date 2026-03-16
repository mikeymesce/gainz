// ═══════════════════════════════════════════
// SUPABASE — Cloud sync for GAINZ
// Local-first: localStorage is source of truth,
// Supabase syncs at key moments (finish workout, log BW, supplements)
// ═══════════════════════════════════════════
import { FEATURES } from './config.js';

const SUPABASE_URL = 'https://bvnkzimwskuruhdmzpbt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2bmt6aW13c2t1cnVoZG16cGJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MTc3NzgsImV4cCI6MjA4OTE5Mzc3OH0.6layiAl75f5YeAQRzU55j41JBAS9_e1QL0tpq-l3DpE';

let sb = null;

function getClient() {
  if (sb) return sb;
  if (!window.supabase) return null;
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return sb;
}

// ── Auth ──

export async function getUser() {
  const client = getClient();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data?.user || null;
}

export async function signUp(email, password) {
  const client = getClient();
  if (!client) return { error: 'Supabase not loaded' };
  const { data, error } = await client.auth.signUp({ email, password });
  return { data, error };
}

export async function signIn(email, password) {
  const client = getClient();
  if (!client) return { error: 'Supabase not loaded' };
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signOut() {
  const client = getClient();
  if (!client) return;
  await client.auth.signOut();
}

export async function isLoggedIn() {
  const user = await getUser();
  return !!user;
}

// ── Sync ──

export async function syncToCloud() {
  if (!FEATURES.cloudSync) return;
  const client = getClient();
  if (!client) return;
  if (!navigator.onLine) return;

  try {
    const user = await getUser();
    if (!user) return;

    const state = window.state;
    if (!state) return;

    state._localUpdatedAt = Date.now();

    const { error } = await client
      .from('user_state')
      .upsert({
        user_id: user.id,
        state: state,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) {
      console.warn('[GAINZ sync] Push failed:', error.message);
    } else {
      state._lastSyncedAt = Date.now();
      if (window.logDebug) window.logDebug('☁️ Synced to cloud');
    }
  } catch (e) {
    console.warn('[GAINZ sync] Push error:', e.message);
  }
}

export async function syncFromCloud() {
  if (!FEATURES.cloudSync) return null;
  const client = getClient();
  if (!client) return null;
  if (!navigator.onLine) return null;

  try {
    const user = await getUser();
    if (!user) return null;

    const { data, error } = await client
      .from('user_state')
      .select('state, updated_at')
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      // No cloud data yet — push local up
      if (error?.code === 'PGRST116') {
        await syncToCloud();
      }
      return null;
    }

    const cloudTime = new Date(data.updated_at).getTime();
    const localTime = window.state?._localUpdatedAt || 0;

    if (cloudTime > localTime) {
      // Cloud is newer — use it
      if (window.logDebug) window.logDebug('☁️ Cloud data is newer, pulling');
      return data.state;
    } else {
      // Local is newer — push up
      await syncToCloud();
      return null;
    }
  } catch (e) {
    console.warn('[GAINZ sync] Pull error:', e.message);
    return null;
  }
}

// ── Settings UI helper ──

export function renderCloudSyncCard(sectionHead) {
  const client = getClient();
  if (!client) return sectionHead('Cloud Sync') + '<div class="card" style="padding:14px 18px;"><div style="font-size:12px;color:var(--dim);">Supabase client not loaded. Check your connection.</div></div>';

  return sectionHead('Cloud Sync') + `
    <div class="card" style="padding:14px 18px;" id="cloud-sync-card">
      <div id="sync-ui">Loading...</div>
    </div>`;
}

export async function renderSyncUI() {
  const el = document.getElementById('sync-ui');
  if (!el) return;

  const user = await getUser();
  const lastSync = window.state?._lastSyncedAt;
  const syncTime = lastSync ? new Date(lastSync).toLocaleTimeString() : 'never';

  if (user) {
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <div style="width:8px;height:8px;border-radius:50%;background:var(--green);flex-shrink:0;"></div>
        <div style="flex:1;">
          <div style="font-size:12px;color:var(--text);">${user.email}</div>
          <div style="font-size:9px;color:var(--dim);margin-top:2px;">Last synced: ${syncTime}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <button onclick="cloudSyncNow()" class="btn ghost small" style="flex:1;">SYNC NOW</button>
        <button onclick="cloudSignOut()" class="btn ghost small" style="color:var(--danger);border-color:rgba(192,64,74,0.3);">SIGN OUT</button>
      </div>`;
  } else {
    el.innerHTML = `
      <div style="font-size:11px;color:var(--muted);margin-bottom:12px;">Sign in to sync your data across devices</div>
      <input id="sync-email" class="input" type="email" placeholder="email" style="margin-bottom:8px;font-size:13px;"/>
      <input id="sync-pass" class="input" type="password" placeholder="password" style="margin-bottom:12px;font-size:13px;"/>
      <div style="display:flex;gap:8px;">
        <button onclick="cloudSignIn()" class="btn primary small" style="flex:1;">SIGN IN</button>
        <button onclick="cloudSignUp()" class="btn ghost small" style="flex:1;">SIGN UP</button>
      </div>
      <div id="sync-error" style="font-size:10px;color:var(--danger);margin-top:8px;display:none;"></div>`;
  }
}
