// ═══════════════════════════════════════════
// NUTRITION — AI meal logging with macro parsing
// Mic/text → Groq Edge Function → editable cards → Supabase + state
// ═══════════════════════════════════════════

const GROQ_NUTRITION_URL = 'https://bvnkzimwskuruhdmzpbt.supabase.co/functions/v1/groq-nutrition';
const SUPABASE_URL = 'https://bvnkzimwskuruhdmzpbt.supabase.co';
// anon key is safe in client-side JS — it's a public read key, not a secret
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2bmt6aW13c2t1cnVoZG16cGJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MTc3NzgsImV4cCI6MjA4OTE5Mzc3OH0.6layiAl75f5YeAQRzU55j41JBAS9_e1QL0tpq-l3DpE';

// ── Module state ─────────────────────────────────────────────────────────────
let _pendingItems = [];     // items returned from API, before user confirms
let _servingCounts = [];    // multiplier per pending item (default 1)
let _micActive = false;
let _calYear = null;   // null = use current month
let _calMonth = null;  // 0-indexed

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

export function adjustServing(idx, rawValue) {
  const count = Math.max(0.01, parseFloat(rawValue) || 1);
  _servingCounts[idx] = count;
  // Update the displayed macros for this item in-place — no full re-render
  const item = _pendingItems[idx];
  if (!item) return;
  [['calories',''],['protein','g'],['carbs','g'],['fat','g']].forEach(([field, unit]) => {
    const el = document.getElementById(`pend-${field}-${idx}`);
    if (el) el.textContent = Math.round((item[field] || 0) * count) + unit;
  });
}

export function clearPendingItems() {
  _pendingItems = [];
  _servingCounts = [];
  window.render?.();
}

export async function confirmNutritionLog() {
  if (!_pendingItems.length) return;
  // Apply serving multipliers before saving
  const items = _pendingItems.map((item, i) => {
    const count = _servingCounts[i] ?? 1;
    return {
      ...item,
      calories: Math.round((item.calories || 0) * count),
      protein:  Math.round((item.protein  || 0) * count),
      carbs:    Math.round((item.carbs    || 0) * count),
      fat:      Math.round((item.fat      || 0) * count),
    };
  });
  _pendingItems = [];
  _servingCounts = [];

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

// ── Delete a logged meal item ─────────────────────────────────────────────────
export function deleteNutritionItem(idx) {
  const dateStr = window.today?.() || new Date().toISOString().slice(0, 10);
  if (!window.state?.nutritionLog?.[dateStr]) return;
  window.state.nutritionLog[dateStr].splice(idx, 1);
  if (!window.state.nutritionLog[dateStr].length) delete window.state.nutritionLog[dateStr];
  window.saveAndSync?.();
  window.render?.();
}

// ── Water tracking ────────────────────────────────────────────────────────────
export function addWater(oz) {
  const dateStr = window.today?.() || new Date().toISOString().slice(0, 10);
  if (!window.state.waterLog) window.state.waterLog = {};
  window.state.waterLog[dateStr] = (window.state.waterLog[dateStr] || 0) + oz;
  // Prune to last 60 days
  const keys = Object.keys(window.state.waterLog).sort();
  if (keys.length > 60) keys.slice(0, keys.length - 60).forEach(k => delete window.state.waterLog[k]);
  window.saveAndSync?.();
  window.render?.();
}

export function addCustomWater() {
  window.showModal?.(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:14px;">CUSTOM AMOUNT</div>
    <input id="custom-water-inp" type="number" inputmode="decimal" placeholder="oz"
      style="width:100%;background:var(--bg3);border:1px solid var(--border2);border-radius:10px;color:#7aacff;font-family:'Bebas Neue',sans-serif;font-size:36px;padding:12px;text-align:center;box-sizing:border-box;margin-bottom:14px;" autofocus/>
    <button class="btn primary" onclick="
      const v=parseFloat(document.getElementById('custom-water-inp').value);
      if(!v||v<=0){window.showToast('Enter an amount');return;}
      window.hideModal();window.addWater(v);
    " style="background:#7aacff;color:#080808;">LOG WATER</button>
    <button class="btn ghost" onclick="hideModal()" style="margin-top:8px;">CANCEL</button>
  `);
  setTimeout(() => document.getElementById('custom-water-inp')?.focus(), 100);
}

export function resetWater() {
  const dateStr = window.today?.() || new Date().toISOString().slice(0, 10);
  if (window.state.waterLog) delete window.state.waterLog[dateStr];
  window.saveAndSync?.();
  window.render?.();
}

function getTodayWater() {
  const dateStr = window.today?.() || new Date().toISOString().slice(0, 10);
  return window.state?.waterLog?.[dateStr] || 0;
}

function getWaterGoal() {
  return window.state?.macroTargets?.waterGoal || 64;
}

// Returns last 7 days of water data as [{dateStr, oz, hit}]
function getWaterHistory() {
  const log = window.state?.waterLog || {};
  const goal = getWaterGoal();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const oz = log[dateStr] || 0;
    const day = d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1);
    return { dateStr, oz, hit: oz >= goal, day, isToday: i === 0 };
  }).reverse();
}

// ── Macro targets — get with defaults ────────────────────────────────────────
function getMacroTargets() {
  const defaults = { calories: 2500, protein: 180, carbs: 250, fat: 80, waterGoal: 64 };
  const saved = window.state?.macroTargets;
  if (!saved) return defaults;
  return {
    calories:  saved.calories  || defaults.calories,
    protein:   saved.protein   || defaults.protein,
    carbs:     saved.carbs     || defaults.carbs,
    fat:       saved.fat       || defaults.fat,
    waterGoal: saved.waterGoal || defaults.waterGoal,
  };
}

// ── Macro targets modal ───────────────────────────────────────────────────────
export function openMacroTargetsModal() {
  const t = getMacroTargets();
  // Suggest water goal based on bodyweight: 0.5 oz per lb
  const bwEntries = window.state?.bodyweight || [];
  const latestBw = bwEntries.length ? bwEntries[0].weight : null;
  const suggestedWater = latestBw ? Math.round(latestBw * 0.5 / 8) * 8 : null; // round to nearest 8oz

  window.showModal?.(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:16px;">DAILY TARGETS</div>
    <div style="font-size:9px;color:var(--dim);letter-spacing:2px;margin-bottom:8px;">MACROS</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
      ${[
        ['calories','CALORIES','var(--accent)','kcal'],
        ['protein','PROTEIN','#52c87a','g'],
        ['carbs','CARBS','#7aacff','g'],
        ['fat','FAT','#ffb347','g']
      ].map(([field, lbl, color, unit]) => `
        <div>
          <div style="font-size:9px;color:${color};letter-spacing:1px;margin-bottom:6px;">${lbl} (${unit})</div>
          <input id="mt-${field}" type="number" inputmode="decimal" value="${t[field]||0}"
            style="width:100%;background:var(--bg3);border:1px solid var(--border2);border-radius:10px;color:var(--text);font-family:'Bebas Neue',sans-serif;font-size:22px;padding:10px 8px;text-align:center;box-sizing:border-box;"/>
        </div>
      `).join('')}
    </div>
    <div style="font-size:9px;color:var(--dim);letter-spacing:2px;margin-bottom:8px;">WATER GOAL</div>
    <div style="margin-bottom:6px;">
      <div style="font-size:9px;color:#7aacff;letter-spacing:1px;margin-bottom:6px;">DAILY GOAL (oz)</div>
      <input id="mt-waterGoal" type="number" inputmode="decimal" value="${t.waterGoal||64}"
        style="width:100%;background:var(--bg3);border:1px solid var(--border2);border-radius:10px;color:#7aacff;font-family:'Bebas Neue',sans-serif;font-size:22px;padding:10px 8px;text-align:center;box-sizing:border-box;"/>
    </div>
    ${suggestedWater ? `
      <div style="font-size:10px;color:var(--dim);margin-bottom:14px;">
        Based on your weight (${latestBw}lb), suggested goal is <span style="color:#7aacff;cursor:pointer;" onclick="document.getElementById('mt-waterGoal').value=${suggestedWater}">${suggestedWater} oz</span> — tap to use it
      </div>` : `<div style="font-size:10px;color:var(--dim);margin-bottom:14px;">Log your bodyweight to get a personalized suggestion (0.5 oz per lb)</div>`}
    <button class="btn primary" onclick="window.saveMacroTargets()">SAVE TARGETS</button>
    <button class="btn ghost" onclick="hideModal()" style="margin-top:8px;">CANCEL</button>
  `);
}

export function saveMacroTargets() {
  const fields = ['calories','protein','carbs','fat','waterGoal'];
  const targets = {};
  fields.forEach(f => {
    const el = document.getElementById(`mt-${f}`);
    targets[f] = el ? (parseFloat(el.value) || 0) : getMacroTargets()[f];
  });
  if (!window.state.macroTargets) window.state.macroTargets = {};
  Object.assign(window.state.macroTargets, targets);
  window.saveAndSync?.();
  window.hideModal?.();
  window.showToast?.('Targets saved ✓');
  window.render?.();
}

// ── Weekly weight projection ──────────────────────────────────────────────────
// Formula: 3,500 cal surplus = +1 lb gained, 3,500 cal deficit = -1 lb lost
function getWeeklyProjection() {
  const log = window.state?.nutritionLog || {};
  const targetCals = getMacroTargets().calories || 2500;

  let weeklyNet = 0;
  let daysWithData = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const items = log[dateStr] || [];
    if (items.length) {
      const dayCals = items.reduce((sum, item) => sum + (item.calories || 0), 0);
      weeklyNet += dayCals - targetCals;
      daysWithData++;
    }
  }

  if (!daysWithData) return null;

  // Project the full 7-day week based on the days we have data for
  const avgDailySurplus = weeklyNet / daysWithData;
  const projectedWeeklyNet = avgDailySurplus * 7;
  const weightChangeLbs = projectedWeeklyNet / 3500;

  return {
    daysWithData,
    avgDailySurplus: Math.round(avgDailySurplus),
    projectedWeeklyNet: Math.round(projectedWeeklyNet),
    weightChangeLbs: Math.round(weightChangeLbs * 10) / 10  // 1 decimal
  };
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
    _servingCounts = items.map(() => 1);
    window.render?.();
  } catch(e) {
    console.error('[GAINZ nutrition]', e);
    window.showToast?.('AI unavailable — try again');
    if (area) area.innerHTML = '';
  }
}

// ── Calorie calendar navigation ───────────────────────────────────────────────
export function calNavPrev() {
  const now = new Date();
  let y = _calYear ?? now.getFullYear();
  let m = _calMonth ?? now.getMonth();
  m--; if (m < 0) { m = 11; y--; }
  _calYear = y; _calMonth = m;
  window.render?.();
}
export function calNavNext() {
  const now = new Date();
  let y = _calYear ?? now.getFullYear();
  let m = _calMonth ?? now.getMonth();
  m++; if (m > 11) { m = 0; y++; }
  // Don't navigate past current month
  const curY = now.getFullYear(), curM = now.getMonth();
  if (y > curY || (y === curY && m > curM)) return;
  _calYear = y; _calMonth = m;
  window.render?.();
}

// ── Day detail modal — view & edit a specific day's log ───────────────────────
export function openDayDetail(dateStr) {
  const items = window.state?.nutritionLog?.[dateStr] || [];
  const targets = getMacroTargets();
  const totals = items.reduce((a, it) => ({
    calories: a.calories + (it.calories || 0),
    protein:  a.protein  + (it.protein  || 0),
    carbs:    a.carbs    + (it.carbs    || 0),
    fat:      a.fat      + (it.fat      || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const d = new Date(dateStr + 'T12:00:00');
  const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const itemRows = items.length ? items.map((it, i) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;${i < items.length - 1 ? 'border-bottom:1px solid #1e1e24;' : ''}">
      <div style="flex:1;padding-right:8px;">
        <div style="font-size:13px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${it.name}</div>
        <div style="display:flex;gap:8px;margin-top:2px;">
          <span style="font-size:10px;color:#52c87a;">${Math.round(it.protein || 0)}g P</span>
          <span style="font-size:10px;color:#7aacff;">${Math.round(it.carbs || 0)}g C</span>
          <span style="font-size:10px;color:#ffb347;">${Math.round(it.fat || 0)}g F</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
        <span style="font-family:'Bebas Neue',sans-serif;font-size:16px;color:var(--accent);">${Math.round(it.calories || 0)}</span>
        <button onclick="window.deleteDayItem('${dateStr}',${i});window.openDayDetail('${dateStr}');"
          style="background:none;border:none;color:var(--dim);font-size:15px;cursor:pointer;padding:0;line-height:1;">✕</button>
      </div>
    </div>`).join('') : `<div style="padding:16px 0;text-align:center;font-size:12px;color:var(--dim);">Nothing logged</div>`;

  const over = totals.calories > targets.calories && targets.calories > 0;
  const calColor = over ? '#ff6b6b' : totals.calories > 0 ? 'var(--accent)' : 'var(--dim)';

  window.showModal?.(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:4px;">CALORIES</div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px;">
      <div style="font-size:17px;color:var(--text);font-weight:600;">${label}</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:26px;color:${calColor};">${Math.round(totals.calories)}<span style="font-size:12px;color:var(--dim);"> / ${targets.calories}</span></div>
    </div>
    <div style="max-height:40vh;overflow-y:auto;margin-bottom:14px;">${itemRows}</div>
    <button class="btn primary" onclick="window.showDayTextInput('${dateStr}')">+ LOG MEAL</button>
    <button class="btn ghost" onclick="window.hideModal()" style="margin-top:8px;">CLOSE</button>
  `);
}

export function deleteDayItem(dateStr, idx) {
  if (!window.state?.nutritionLog?.[dateStr]) return;
  window.state.nutritionLog[dateStr].splice(idx, 1);
  if (!window.state.nutritionLog[dateStr].length) delete window.state.nutritionLog[dateStr];
  window.saveAndSync?.();
  window.render?.();
}

export function showDayTextInput(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  window.showModal?.(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:4px;">LOG MEAL</div>
    <div style="font-size:13px;color:var(--dim);margin-bottom:12px;">${label}</div>
    <input id="day-meal-inp" class="input" type="text" placeholder="e.g. chicken and rice" style="font-size:15px;margin-bottom:14px;" autofocus/>
    <button class="btn primary" onclick="
      const v=document.getElementById('day-meal-inp').value.trim();
      if(!v){window.showToast('Describe the meal');return;}
      window.hideModal();
      window.processMealForDate('${dateStr}',v);
    ">ANALYZE</button>
    <button class="btn ghost" onclick="window.hideModal()" style="margin-top:8px;">CANCEL</button>
  `);
  setTimeout(() => document.getElementById('day-meal-inp')?.focus(), 100);
}

export async function processMealForDate(dateStr, text) {
  window.showToast?.('Analyzing…');
  try {
    const res = await fetch(GROQ_NUTRITION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ meal: text })
    });
    if (!res.ok) throw new Error('Edge function error');
    const result = await res.json();
    const items = Array.isArray(result) ? result : (result.items || []);
    if (!items.length) { window.showToast?.('Could not parse — try again'); return; }
    if (!window.state.nutritionLog) window.state.nutritionLog = {};
    if (!window.state.nutritionLog[dateStr]) window.state.nutritionLog[dateStr] = [];
    window.state.nutritionLog[dateStr].push(...items.map(i => ({...i})));
    window.saveAndSync?.();
    window.render?.();
    window.openDayDetail?.(dateStr);
  } catch(e) {
    console.error('[GAINZ nutrition]', e);
    window.showToast?.('AI unavailable — try again');
  }
}

// ── Calorie calendar renderer ─────────────────────────────────────────────────
function renderCalorieCalendar() {
  const now = new Date();
  const viewYear  = _calYear  ?? now.getFullYear();
  const viewMonth = _calMonth ?? now.getMonth();
  const targets   = getMacroTargets();
  const log       = window.state?.nutritionLog || {};
  const todayStr  = now.toISOString().slice(0, 10);

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  // Build day cells
  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells = [];
  // Empty leading cells
  for (let i = 0; i < firstDay; i++) cells.push('<div></div>');

  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const dateStr = `${viewYear}-${mm}-${dd}`;
    const items = log[dateStr] || [];
    const cals = Math.round(items.reduce((s, it) => s + (it.calories || 0), 0));
    const isToday = dateStr === todayStr;
    const isFuture = dateStr > todayStr;
    const hasData = cals > 0;

    // Color the cell based on calories vs target
    let dotColor = 'transparent';
    let calText = '';
    if (hasData && !isFuture) {
      const pct = targets.calories > 0 ? cals / targets.calories : 0;
      dotColor = pct > 1.05 ? '#ff6b6b' : pct >= 0.85 ? '#52c87a' : '#ffb347';
      calText = cals >= 1000 ? (cals / 1000).toFixed(1) + 'k' : String(cals);
    }

    cells.push(`
      <div onclick="window.openDayDetail('${dateStr}')"
        style="cursor:${isFuture?'default':'pointer'};padding:4px 2px;border-radius:8px;text-align:center;
          background:${isToday?'rgba(232,213,160,0.1)':'transparent'};
          border:${isToday?'1px solid rgba(232,213,160,0.3)':'1px solid transparent'};
          transition:background 0.15s;">
        <div style="font-size:11px;color:${isToday?'var(--accent)':isFuture?'var(--dim)':'var(--muted)'};">${d}</div>
        ${hasData && !isFuture ? `
          <div style="width:6px;height:6px;border-radius:50%;background:${dotColor};margin:2px auto 1px;"></div>
          <div style="font-size:8px;color:${dotColor};line-height:1;">${calText}</div>
        ` : '<div style="height:15px;"></div>'}
      </div>`);
  }

  return `
    <div class="card" style="margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <button onclick="window.calNavPrev()" style="background:none;border:none;color:var(--muted);font-size:18px;cursor:pointer;padding:0 4px;">‹</button>
        <div style="font-size:11px;letter-spacing:1px;color:var(--text);">${monthName.toUpperCase()}</div>
        <button onclick="window.calNavNext()" style="background:none;border:none;color:${isCurrentMonth?'var(--dim)':'var(--muted)'};font-size:18px;cursor:pointer;padding:0 4px;">›</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:6px;">
        ${['S','M','T','W','T','F','S'].map(d => `<div style="text-align:center;font-size:9px;color:var(--dim);padding-bottom:4px;">${d}</div>`).join('')}
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;">
        ${cells.join('')}
      </div>
      <div style="display:flex;gap:12px;margin-top:10px;padding-top:10px;border-top:1px solid #1e1e24;">
        <div style="display:flex;align-items:center;gap:4px;"><div style="width:6px;height:6px;border-radius:50%;background:#52c87a;"></div><span style="font-size:9px;color:var(--dim);">On target</span></div>
        <div style="display:flex;align-items:center;gap:4px;"><div style="width:6px;height:6px;border-radius:50%;background:#ffb347;"></div><span style="font-size:9px;color:var(--dim);">Under</span></div>
        <div style="display:flex;align-items:center;gap:4px;"><div style="width:6px;height:6px;border-radius:50%;background:#ff6b6b;"></div><span style="font-size:9px;color:var(--dim);">Over</span></div>
      </div>
    </div>`;
}

// ── Render ────────────────────────────────────────────────────────────────────
export function renderNutrition() {
  const todayItems = getTodayNutrition();
  const targets = getMacroTargets();
  const targetsSet = !!window.state?.macroTargets?.calories;

  const totals = todayItems.reduce((acc, item) => ({
    calories: acc.calories + (item.calories || 0),
    protein:  acc.protein  + (item.protein  || 0),
    carbs:    acc.carbs    + (item.carbs    || 0),
    fat:      acc.fat      + (item.fat      || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  // Progress bar macro stat — value shown once (above bar), no duplicate below
  const macroStat = (val, target, label, color) => {
    const pct = target > 0 ? Math.min(100, Math.round((val / target) * 100)) : 0;
    const over = val > target && target > 0;
    const unit = label === 'CAL' ? '' : ' g';
    return `
      <div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px;">
          <div style="font-size:9px;color:var(--muted);letter-spacing:1px;">${label}</div>
          <div style="font-size:9px;color:var(--dim);">${Math.round(val)}${unit} <span style="color:${over?'#ff6b6b':color};">/ ${target}${unit}</span></div>
        </div>
        <div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${over?'#ff6b6b':color};border-radius:3px;transition:width .3s;"></div>
        </div>
      </div>`;
  };

  // Mic / log entry section (primary action — shown first)
  const micSection = !_pendingItems.length ? `
    <div style="text-align:center;margin-bottom:24px;">
      <button id="nutrition-mic-btn" onclick="window.startMicCapture()"
        style="width:80px;height:80px;border-radius:50%;background:rgba(232,255,0,0.08);border:2px solid var(--accent);font-size:32px;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;justify-content:center;">
        🎙️
      </button>
      <div style="font-size:11px;color:var(--dim);margin-top:10px;letter-spacing:1px;">TAP TO LOG A MEAL</div>
      <button onclick="window.showMealTextInput()"
        style="background:none;border:none;color:var(--accent);font-size:11px;cursor:pointer;margin-top:8px;letter-spacing:1px;display:block;margin-left:auto;margin-right:auto;opacity:0.7;text-decoration:underline;">
        type instead
      </button>
    </div>
  ` : '';

  // Pending items (AI parsed, before user confirms)
  const pendingHtml = _pendingItems.length ? `
    <div style="margin-bottom:20px;">
      <div style="font-size:10px;letter-spacing:2px;color:var(--muted);margin-bottom:10px;">REVIEW & CONFIRM</div>
      ${_pendingItems.map((item, i) => {
        const count = _servingCounts[i] ?? 1;
        const cal  = Math.round((item.calories || 0) * count);
        const pro  = Math.round((item.protein  || 0) * count);
        const carb = Math.round((item.carbs    || 0) * count);
        const fat  = Math.round((item.fat      || 0) * count);
        return `
        <div class="card" style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
            <div style="font-size:14px;font-weight:600;color:var(--text);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:8px;">${item.name}</div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:10px;">
            <div style="font-size:11px;color:var(--dim);flex:1;">${item.serving || '1 serving'}</div>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
              <input type="number" inputmode="decimal" min="0.01" step="0.25" value="${count}"
                oninput="window.adjustServing(${i},this.value)"
                style="width:64px;background:var(--bg3);border:1px solid var(--border2);border-radius:8px;
                  color:var(--accent);font-family:'Bebas Neue',sans-serif;font-size:18px;
                  padding:6px 4px;text-align:center;box-sizing:border-box;"/>
              <span style="font-size:11px;color:var(--dim);">×</span>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;">
            ${[['calories','CAL','var(--accent)',''],['protein','PRO','#52c87a','g'],['carbs','CARB','#7aacff','g'],['fat','FAT','#ffb347','g']].map(([field,lbl,color,unit]) => `
              <div style="text-align:center;background:var(--bg3);border-radius:8px;padding:8px 4px;">
                <div style="font-size:8px;color:var(--muted);letter-spacing:1px;margin-bottom:4px;">${lbl}</div>
                <div id="pend-${field}-${i}" style="font-family:'Bebas Neue',sans-serif;font-size:18px;color:${color};">${field==='calories'?cal:field==='protein'?pro+'g':field==='carbs'?carb+'g':fat+'g'}</div>
              </div>`).join('')}
          </div>
        </div>`;
      }).join('')}
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button onclick="window.confirmNutritionLog()"
          style="flex:1;background:var(--accent);color:#080808;border:none;border-radius:12px;padding:13px;font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:2px;cursor:pointer;">LOG MEAL</button>
        <button onclick="window.clearPendingItems()"
          style="background:var(--bg3);border:1px solid var(--border2);color:var(--dim);border-radius:12px;padding:13px 16px;font-size:16px;cursor:pointer;">✕</button>
      </div>
    </div>
  ` : `<div id="nutrition-pending-area"></div>`;

  // Today's log — all 4 macros visible per item
  const logHtml = todayItems.length ? `
    <div style="margin-bottom:20px;">
      <div style="font-size:10px;letter-spacing:2px;color:var(--muted);margin-bottom:10px;">TODAY'S LOG</div>
      ${todayItems.map((item, i) => `
        <div class="card" style="margin-bottom:6px;padding:10px 14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-size:13px;color:var(--text);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:8px;">${item.name}</span>
            <button onclick="window.deleteNutritionItem(${i})"
              style="background:none;border:none;color:var(--dim);font-size:16px;cursor:pointer;padding:0;line-height:1;flex-shrink:0;">✕</button>
          </div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <span style="font-family:'Bebas Neue',sans-serif;font-size:15px;color:var(--accent);">${Math.round(item.calories||0)} cal</span>
            <span style="font-size:11px;color:#52c87a;">${Math.round(item.protein||0)}g P</span>
            <span style="font-size:11px;color:#7aacff;">${Math.round(item.carbs||0)}g C</span>
            <span style="font-size:11px;color:#ffb347;">${Math.round(item.fat||0)}g F</span>
          </div>
        </div>
      `).join('')}
    </div>
  ` : '';

  // Targets not set — nudge (only if user hasn't set them yet)
  const targetsHint = !targetsSet ? `
    <div style="margin-bottom:16px;padding:10px 14px;background:rgba(232,213,160,0.06);border:1px solid rgba(232,213,160,0.15);border-radius:10px;display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:11px;color:var(--muted);">Set your macro targets to track progress</div>
      <button onclick="window.openMacroTargetsModal()" style="background:none;border:none;color:var(--accent);font-size:11px;cursor:pointer;letter-spacing:1px;font-family:inherit;white-space:nowrap;">SET →</button>
    </div>
  ` : '';

  // Macro summary card
  const macroCard = `
    <div class="card" style="margin-bottom:20px;">
      <div style="font-size:10px;color:var(--dim);letter-spacing:1px;margin-bottom:14px;">TODAY</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        ${macroStat(totals.calories, targets.calories, 'CAL', 'var(--accent)')}
        ${macroStat(totals.protein,  targets.protein,  'PRO', '#52c87a')}
        ${macroStat(totals.carbs,    targets.carbs,    'CARBS', '#7aacff')}
        ${macroStat(totals.fat,      targets.fat,      'FAT', '#ffb347')}
      </div>
    </div>`;

  // Water card
  const waterOz = getTodayWater();
  const waterGoal = getWaterGoal();
  const waterPct = Math.min(100, Math.round((waterOz / waterGoal) * 100));
  const waterCups = (waterOz / 8).toFixed(1);
  const waterHit = waterOz >= waterGoal;
  const waterColor = waterHit ? '#52c87a' : '#7aacff';
  const ozLeft = Math.max(0, waterGoal - waterOz);
  const statusMsg = waterHit
    ? `Goal crushed! 💧`
    : ozLeft <= 16
      ? `Almost there — ${ozLeft} oz to go`
      : `${ozLeft} oz to go`;
  const waterHistory = getWaterHistory();
  const streakDots = waterHistory.map(d => `
    <div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
      <div style="width:28px;height:28px;border-radius:50%;
        background:${d.oz === 0 ? 'var(--bg3)' : d.hit ? '#52c87a' : '#7aacff'};
        border:${d.isToday ? '2px solid ' + waterColor : '2px solid transparent'};
        display:flex;align-items:center;justify-content:center;
        font-size:9px;color:${d.oz === 0 ? 'var(--dim)' : '#080808'};font-weight:700;">
        ${d.oz > 0 ? (d.hit ? '✓' : Math.round(d.oz/8)) : ''}
      </div>
      <div style="font-size:8px;color:${d.isToday ? waterColor : 'var(--dim)'};">${d.day}</div>
    </div>`).join('');
  const waterCardHtml = `
    <div class="card" style="margin-bottom:20px;${waterHit ? 'border-color:#52c87a44;' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:32px;color:${waterColor};line-height:1;">💧 ${waterOz}<span style="font-size:14px;"> oz</span></div>
          <div style="font-size:10px;color:var(--dim);margin-top:2px;">${statusMsg}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:9px;color:var(--dim);">${waterCups} cups</div>
          <div style="font-size:9px;color:var(--dim);">goal: ${waterGoal} oz</div>
          ${waterOz > 0 ? `<button onclick="window.resetWater()" style="background:none;border:none;color:var(--dim);font-size:10px;cursor:pointer;padding:2px 0;display:block;margin-top:4px;">reset</button>` : ''}
        </div>
      </div>
      <div style="height:8px;background:var(--bg3);border-radius:4px;overflow:hidden;margin-bottom:14px;">
        <div style="height:100%;width:${waterPct}%;background:${waterColor};border-radius:4px;transition:width .4s;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:14px;">
        ${streakDots}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;">
        ${[8, 16, 24, 32].map(oz => `
          <button onclick="window.addWater(${oz})"
            style="padding:11px 0;background:rgba(122,172,255,0.08);border:1px solid rgba(122,172,255,0.2);border-radius:12px;color:#7aacff;font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:1px;cursor:pointer;">
            +${oz}
          </button>`).join('')}
      </div>
      <button onclick="window.addCustomWater()"
        style="width:100%;margin-top:8px;padding:9px;background:none;border:1px solid var(--border2);border-radius:12px;color:var(--muted);font-family:'Bebas Neue',sans-serif;font-size:12px;letter-spacing:1px;cursor:pointer;">
        + CUSTOM AMOUNT
      </button>
    </div>`;

  // 7-day calorie chart
  const chartHtml = (() => {
    const log = window.state?.nutritionLog || {};
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const items = log[key] || [];
      const cals = items.reduce((s, it) => s + (it.calories || 0), 0);
      const pro  = items.reduce((s, it) => s + (it.protein  || 0), 0);
      const dayName = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });
      days.push({ dayName, cals: Math.round(cals), pro: Math.round(pro), hasData: items.length > 0 });
    }
    if (!days.some(d => d.hasData)) return '';
    const maxCal = Math.max(targets.calories, ...days.map(d => d.cals), 1);
    const bars = days.map(d => {
      const h = d.cals > 0 ? Math.max(4, Math.round((d.cals / maxCal) * 80)) : 0;
      const over = d.cals > targets.calories && targets.calories > 0;
      const color = d.cals === 0 ? 'var(--bg3)' : over ? '#ff6b6b' : 'var(--accent)';
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:3px;flex:1;">
        <div style="font-size:8px;color:var(--dim);">${d.cals || '-'}</div>
        <div style="width:100%;max-width:28px;height:80px;display:flex;align-items:flex-end;justify-content:center;">
          <div style="width:100%;height:${h}px;background:${color};border-radius:4px 4px 2px 2px;transition:height .3s;"></div>
        </div>
        <div style="font-size:8px;color:${d.dayName==='Today'?'var(--accent)':'var(--dim)'};">${d.dayName}</div>
        ${d.pro ? `<div style="font-size:7px;color:#52c87a;">${d.pro}g P</div>` : ''}
      </div>`;
    }).join('');
    const targetLineY = targetsSet ? Math.round((1 - targets.calories / maxCal) * 80) : -1;
    return `
      <div class="card" style="margin-bottom:20px;">
        <div style="font-size:10px;color:var(--dim);letter-spacing:1px;margin-bottom:12px;">7-DAY CALORIES</div>
        <div style="position:relative;">
          ${targetsSet ? `
            <div style="position:absolute;top:${targetLineY}px;left:0;right:0;border-top:1px dashed rgba(232,213,160,0.25);z-index:1;"></div>
            <div style="position:absolute;top:${targetLineY - 8}px;right:0;font-size:7px;color:var(--dim);z-index:2;">goal</div>
          ` : ''}
          <div style="display:flex;gap:4px;padding-top:14px;">${bars}</div>
        </div>
      </div>`;
  })();

  // Weekly projection — only meaningful if targets are set
  const proj = getWeeklyProjection();
  const projHtml = (() => {
    if (!targetsSet) return '';
    if (!proj) return '';
    const surplus = proj.projectedWeeklyNet;
    const lbs = proj.weightChangeLbs;
    const gaining = surplus > 0;
    const color = gaining ? '#ff9f43' : '#52c87a';
    const arrow = gaining ? '↑' : '↓';
    const label = gaining ? 'projected gain' : 'projected loss';
    return `
      <div class="card" style="margin-bottom:20px;border-color:${color}33;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">
          <div style="font-size:10px;letter-spacing:1px;color:var(--dim);">WEEKLY PROJECTION</div>
          <div style="font-size:9px;color:var(--dim);">${proj.daysWithData}/7 days logged</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-top:8px;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:42px;color:${color};line-height:1;">${arrow} ${Math.abs(lbs)} lb</div>
          <div>
            <div style="font-size:11px;color:${color};letter-spacing:1px;">${label} this week</div>
            <div style="font-size:10px;color:var(--dim);margin-top:2px;">${Math.abs(surplus)} cal ${gaining?'surplus':'deficit'} projected</div>
            <div style="font-size:9px;color:var(--muted);margin-top:2px;">~${Math.abs(proj.avgDailySurplus)} cal/day ${gaining?'over':'under'} target</div>
          </div>
        </div>
      </div>`;
  })();

  return `
    <div style="padding:16px 16px 100px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:32px;letter-spacing:2px;">NUTRITION</div>
        <button onclick="window.openMacroTargetsModal()"
          style="background:var(--bg3);border:1px solid var(--border2);border-radius:10px;color:var(--muted);font-family:inherit;font-size:10px;letter-spacing:1px;padding:8px 12px;cursor:pointer;">
          SET TARGETS
        </button>
      </div>

      ${targetsHint}
      ${micSection}
      ${pendingHtml}
      ${logHtml}
      ${macroCard}
      ${waterCardHtml}
      ${chartHtml}
      ${projHtml}
      ${renderCalorieCalendar()}

      ${typeof window.renderDailyCheckin === 'function' ? window.renderDailyCheckin() : ''}
    </div>
  `;
}
