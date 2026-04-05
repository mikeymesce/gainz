// ═══════════════════════════════════════════
// NUTRITION — AI meal logging with macro parsing
// Mic/text → Groq Edge Function → editable cards → Supabase + state
// ═══════════════════════════════════════════

const GROQ_NUTRITION_URL = 'https://bvnkzimwskuruhdmzpbt.supabase.co/functions/v1/groq-nutrition';
const SUPABASE_URL = 'https://bvnkzimwskuruhdmzpbt.supabase.co';
// anon key is safe in client-side JS — it's a public read key, not a secret
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2bmt6aW13c2t1cnVoZG16cGJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MTc3NzgsImV4cCI6MjA4OTE5Mzc3OH0.6layiAl75f5YeAQRzU55j41JBAS9_e1QL0tpq-l3DpE';

// ── Module state ─────────────────────────────────────────────────────────────
let _pendingItems = [];  // items returned from API, before user confirms
let _micActive = false;

// ── Edge Function call ────────────────────────────────────────────────────────
async function analyzeMeal(mealText) {
  const res = await fetch(GROQ_NUTRITION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({ meal: mealText })
  });
  if (!res.ok) throw new Error(await res.text() || 'Edge function error');
  return res.json();
}

// ── Pending item helpers (called from inline onclick handlers) ────────────────
export function editPendingItem(idx, field, value) {
  if (_pendingItems[idx]) _pendingItems[idx][field] = parseFloat(value) || 0;
}

export function clearPendingItems() {
  _pendingItems = [];
  window.render?.();
}

export async function confirmNutritionLog() {
  if (!_pendingItems.length) return;
  const items = _pendingItems.map(i => ({...i}));
  _pendingItems = [];

  // Save to local state
  const dateStr = window.today?.() || new Date().toISOString().slice(0, 10);
  if (!window.state.nutritionLog) window.state.nutritionLog = {};
  if (!window.state.nutritionLog[dateStr]) window.state.nutritionLog[dateStr] = [];
  window.state.nutritionLog[dateStr].push(...items);

  // Prune to last 60 days
  const keys = Object.keys(window.state.nutritionLog).sort();
  if (keys.length > 60) {
    keys.slice(0, keys.length - 60).forEach(k => delete window.state.nutritionLog[k]);
  }

  window.saveAndSync?.();

  // Save to Supabase nutrition_log if logged in
  try {
    const user = await window.getUser?.();
    if (user && window.supabase) {
      const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: { session } } = await client.auth.getSession();
      if (session?.access_token) {
        await fetch(`${SUPABASE_URL}/rest/v1/nutrition_log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': SUPABASE_ANON_KEY
          },
          body: JSON.stringify({ user_id: user.id, date: dateStr, items })
        });
      }
    }
  } catch(e) {
    console.warn('[GAINZ nutrition] Supabase save failed:', e.message);
  }

  window.showToast?.('Meal logged ✓');
  window.render?.();
}

// ── Get today's items from state ──────────────────────────────────────────────
export function getTodayNutrition() {
  const dateStr = window.today?.() || new Date().toISOString().slice(0, 10);
  return window.state?.nutritionLog?.[dateStr] || [];
}

// ── Mic + text input ─────────────────────────────────────────────────────────
export function startMicCapture() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { showMealTextInput(); return; }
  if (_micActive) return;
  _micActive = true;

  const btn = document.getElementById('nutrition-mic-btn');
  if (btn) { btn.textContent = '🔴'; btn.style.boxShadow = '0 0 20px rgba(255,50,50,0.4)'; }

  const rec = new SR();
  rec.lang = 'en-US';
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  rec.onresult = async (e) => {
    const text = e.results[0][0].transcript;
    _micActive = false;
    _resetMicBtn();
    await processMealText(text);
  };

  rec.onerror = (e) => {
    _micActive = false;
    _resetMicBtn();
    if (e.error !== 'aborted') { window.showToast?.('Mic error — try typing'); showMealTextInput(); }
  };

  rec.onend = () => { _micActive = false; _resetMicBtn(); };
  rec.start();
}

function _resetMicBtn() {
  const btn = document.getElementById('nutrition-mic-btn');
  if (btn) { btn.textContent = '🎙️'; btn.style.boxShadow = ''; }
}

export function showMealTextInput() {
  window.showModal?.(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:14px;">LOG A MEAL</div>
    <input id="nutrition-text-input" class="input" type="text"
      placeholder="e.g. cheeseburger and fries"
      style="font-size:15px;margin-bottom:14px;" autofocus/>
    <button class="btn primary" onclick="
      const v=document.getElementById('nutrition-text-input').value.trim();
      if(!v){window.showToast('Describe your meal');return;}
      window.hideModal();
      window.processMealText(v);
    ">ANALYZE</button>
    <button class="btn ghost" onclick="hideModal()" style="margin-top:8px;">CANCEL</button>
  `);
  setTimeout(() => document.getElementById('nutrition-text-input')?.focus(), 100);
}

export async function processMealText(text) {
  // Show loading inside the pending area without a full re-render
  const area = document.getElementById('nutrition-pending-area');
  if (area) area.innerHTML = `
    <div style="text-align:center;padding:32px 0;color:var(--muted);">
      <div style="font-size:22px;margin-bottom:8px;">⏳</div>
      <div style="font-size:12px;letter-spacing:1px;">Analyzing "${text}"…</div>
    </div>`;

  try {
    const result = await analyzeMeal(text);
    // Edge function may return {items:[...]} or [...] directly
    const items = Array.isArray(result) ? result : (result.items || []);
    if (!items.length) { window.showToast?.('Could not parse — try again'); if (area) area.innerHTML = ''; return; }
    _pendingItems = items.map(i => ({...i}));
    window.render?.();
  } catch(e) {
    console.error('[GAINZ nutrition]', e);
    window.showToast?.('AI unavailable — try again');
    if (area) area.innerHTML = '';
  }
}

// ── Render ────────────────────────────────────────────────────────────────────
export function renderNutrition() {
  const todayItems = getTodayNutrition();
  const totals = todayItems.reduce((acc, item) => ({
    calories: acc.calories + (item.calories || 0),
    protein:  acc.protein  + (item.protein  || 0),
    carbs:    acc.carbs    + (item.carbs    || 0),
    fat:      acc.fat      + (item.fat      || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const macroStat = (val, label, color) => `
    <div style="text-align:center;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:26px;color:${color};line-height:1;">${Math.round(val)}${label==='CAL'?'':' g'}</div>
      <div style="font-size:9px;color:var(--muted);letter-spacing:1px;margin-top:3px;">${label}</div>
    </div>`;

  // Pending items (returned from AI, before user confirms)
  const pendingHtml = _pendingItems.length ? `
    <div style="margin-bottom:20px;">
      <div style="font-size:10px;letter-spacing:2px;color:var(--muted);margin-bottom:10px;">REVIEW & CONFIRM</div>
      ${_pendingItems.map((item, i) => `
        <div class="card" style="margin-bottom:8px;">
          <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:10px;">${item.name}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;">
            ${[['calories','CAL','var(--accent)'],['protein','PRO','#52c87a'],['carbs','CARB','#7aacff'],['fat','FAT','#ffb347']].map(([field,lbl,color]) => `
              <div style="text-align:center;">
                <div style="font-size:9px;color:var(--muted);letter-spacing:1px;margin-bottom:4px;">${lbl}</div>
                <input type="number" inputmode="decimal" value="${Math.round(item[field]||0)}"
                  onchange="window.editPendingItem(${i},'${field}',this.value)"
                  style="width:100%;background:var(--bg3);border:1px solid var(--border2);border-radius:8px;color:${color};font-family:'Bebas Neue',sans-serif;font-size:18px;padding:6px 2px;text-align:center;"/>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button onclick="window.confirmNutritionLog()"
          style="flex:1;background:var(--accent);color:#080808;border:none;border-radius:12px;padding:13px;font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:2px;cursor:pointer;">LOG MEAL</button>
        <button onclick="window.clearPendingItems()"
          style="background:var(--bg3);border:1px solid var(--border2);color:var(--dim);border-radius:12px;padding:13px 16px;font-size:16px;cursor:pointer;">✕</button>
      </div>
    </div>
  ` : `<div id="nutrition-pending-area"></div>`;

  const logHtml = todayItems.length ? `
    <div>
      <div style="font-size:10px;letter-spacing:2px;color:var(--muted);margin-bottom:10px;">TODAY'S LOG</div>
      ${todayItems.map(item => `
        <div class="card" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;padding:10px 14px;">
          <span style="font-size:13px;color:var(--text);flex:1;">${item.name}</span>
          <div style="display:flex;gap:10px;align-items:center;flex-shrink:0;">
            <span style="font-family:'Bebas Neue',sans-serif;font-size:16px;color:var(--accent);">${Math.round(item.calories||0)}</span>
            <span style="font-size:11px;color:#52c87a;">${Math.round(item.protein||0)}g P</span>
          </div>
        </div>
      `).join('')}
    </div>
  ` : '';

  const micSection = !_pendingItems.length ? `
    <div style="text-align:center;margin-bottom:24px;">
      <button id="nutrition-mic-btn" onclick="window.startMicCapture()"
        style="width:80px;height:80px;border-radius:50%;background:rgba(232,255,0,0.08);border:2px solid var(--accent);font-size:32px;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;justify-content:center;">
        🎙️
      </button>
      <div style="font-size:11px;color:var(--dim);margin-top:10px;letter-spacing:1px;">TAP TO LOG A MEAL</div>
      <button onclick="window.showMealTextInput()"
        style="background:none;border:none;color:var(--muted);font-size:11px;cursor:pointer;margin-top:6px;letter-spacing:1px;display:block;margin-left:auto;margin-right:auto;">
        type instead
      </button>
    </div>
  ` : '';

  return `
    <div style="padding:16px 16px 100px;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:32px;letter-spacing:2px;margin-bottom:16px;">NUTRITION</div>

      <div class="card" style="margin-bottom:20px;">
        <div style="font-size:10px;color:var(--dim);letter-spacing:1px;margin-bottom:12px;">TODAY</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;">
          ${macroStat(totals.calories, 'CAL', 'var(--accent)')}
          ${macroStat(totals.protein, 'PROTEIN', '#52c87a')}
          ${macroStat(totals.carbs, 'CARBS', '#7aacff')}
          ${macroStat(totals.fat, 'FAT', '#ffb347')}
        </div>
      </div>

      ${micSection}
      ${pendingHtml}
      ${logHtml}
    </div>
  `;
}
