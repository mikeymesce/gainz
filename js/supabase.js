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

export async function resetPassword(email) {
  const client = getClient();
  if (!client) return { error: 'Supabase not loaded' };
  const { data, error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://mikeymesce.github.io/gainz/'
  });
  return { data, error };
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

    // Safety guard: never push an empty state over real cloud data
    const localWorkouts = (state.workouts || []).length;
    if (localWorkouts === 0) {
      // Check if cloud has real data before overwriting
      const { data: existing } = await client
        .from('user_state')
        .select('state')
        .eq('user_id', user.id)
        .single();
      const cloudWorkouts = (existing?.state?.workouts || []).length;
      if (cloudWorkouts > 0) {
        console.warn('[GAINZ sync] Blocked push: local has 0 workouts, cloud has', cloudWorkouts);
        return;
      }
    }

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
      // Detect storage/quota errors and alert user
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('quota') || msg.includes('storage') || msg.includes('disk') || msg.includes('full') || msg.includes('limit')) {
        window.showToast?.('⚠ Cloud storage full — contact support');
      }
    } else {
      state._lastSyncedAt = Date.now();
      if (window.logDebug) window.logDebug('☁️ Synced to cloud');

      // Per-user size warning: if state > 5MB, warn user
      try {
        const sizeBytes = new Blob([JSON.stringify(state)]).size;
        if (sizeBytes > 5 * 1024 * 1024 && !state._sizeWarned) {
          window.showToast?.(`⚠ Your data is ${(sizeBytes/1024/1024).toFixed(1)}MB — consider exporting old workouts`);
          state._sizeWarned = true;
        }
      } catch(e) {}
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
    const localWorkouts = (window.state?.workouts || []).length;
    const cloudWorkouts = (data.state?.workouts || []).length;

    // Safety: never pull cloud data that has fewer workouts than local
    if (cloudWorkouts < localWorkouts) {
      if (window.logDebug) window.logDebug('☁️ Local has more workouts, pushing up');
      await syncToCloud();
      return null;
    }

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

// ── Backup snapshot on workout / weight / meal events ──
// Rules:
//   - Every 3 workouts (workout milestone)
//   - OR every 3 days since last backup (time-based fallback for passive users)

export async function maybeSaveBackup() {
  if (!FEATURES.cloudSync) return;
  const client = getClient();
  if (!client) return;
  if (!navigator.onLine) return;

  try {
    const user = await getUser();
    if (!user) return;

    const state = window.state;
    const workoutCount = (state?.workouts || []).length;
    const now = Date.now();
    const lastBackupAt = state._lastBackupAt || 0;
    const lastBackupCount = state._lastBackupCount || 0;
    const daysSince = (now - lastBackupAt) / (1000 * 60 * 60 * 24);

    // Trigger conditions
    const hitWorkoutMilestone = workoutCount > 0 && workoutCount % 3 === 0 && lastBackupCount !== workoutCount;
    const hitTimeWindow = daysSince >= 3;

    if (!hitWorkoutMilestone && !hitTimeWindow) return;

    await client.from('gainz_backups').insert({
      user_id: user.id,
      state: state,
      workout_count: workoutCount,
    });

    // Keep only the last 75 backups
    const { data: all } = await client
      .from('gainz_backups')
      .select('id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (all && all.length > 75) {
      const toDelete = all.slice(75).map(r => r.id);
      await client.from('gainz_backups').delete().in('id', toDelete);
    }

    state._lastBackupCount = workoutCount;
    state._lastBackupAt = now;
    if (window.logDebug) window.logDebug(`☁️ Backup saved (${workoutCount} workouts)`);
  } catch (e) {
    console.warn('[GAINZ backup] Save error:', e.message);
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
      <button onclick="cloudResetPw()" style="background:none;border:none;color:var(--dim);font-size:10px;margin-top:10px;cursor:pointer;font-family:'DM Sans',sans-serif;letter-spacing:0.5px;">Forgot password?</button>
      <div id="sync-error" style="font-size:10px;color:var(--danger);margin-top:8px;display:none;"></div>`;
  }
}
