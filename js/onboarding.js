// ═══════════════════════════════════════════
// ONBOARDING — Setup flow + Cinematic intro + Splash carousel + coach tips
// ═══════════════════════════════════════════

// ── First-run setup flow ─────────────────────────────────────────────────────

let _setupStep = 1;           // 1, 2, or 3
export let _setupData = {};  // { name, goal, bodyweight } — exported so main.js can put it on window

function _calcTargets(goal, bw, weeklyRate) {
  // Uses TDEE estimate (BW × 15) ± weekly rate adjustment
  // 1 lb of fat = 3500 cal → 500 cal/day per lb/week
  const hasBW = bw && bw > 0;
  const round50 = n => Math.round(n / 50) * 50;
  const round5  = n => Math.round(n / 5) * 5;
  const round10 = n => Math.round(n / 10) * 10;

  if (goal === 'muscle') {
    const rate = weeklyRate || 0.5;
    const tdee = hasBW ? bw * 15 : 2500;
    const cal  = round50(tdee + rate * 500);
    const pro  = hasBW ? Math.round(bw)   : 180;
    const fat  = hasBW ? round5(bw * 0.4) : 80;
    const carb = Math.max(round10((cal - pro*4 - fat*9) / 4), 50);
    const water= hasBW ? round5(bw * 0.5) : 64;
    return { calories: cal, protein: pro, carbs: carb, fat, waterGoal: water };
  }
  if (goal === 'fat') {
    const rate = weeklyRate || 1.0;
    const tdee = hasBW ? bw * 15 : 2500;
    const cal  = round50(Math.max(tdee - rate * 500, 1200)); // floor at 1200
    const pro  = hasBW ? Math.round(bw * 0.9) : 150;
    const fat  = hasBW ? round5(bw * 0.35)    : 60;
    const carb = Math.max(round10((cal - pro*4 - fat*9) / 4), 30);
    const water= hasBW ? round5(bw * 0.5) : 64;
    return { calories: cal, protein: pro, carbs: carb, fat, waterGoal: water };
  }
  // maintain
  const tdee = hasBW ? bw * 15 : 2200;
  const cal  = round50(tdee);
  const pro  = hasBW ? Math.round(bw * 0.75) : 150;
  const fat  = hasBW ? round5(bw * 0.45)     : 65;
  const carb = Math.max(round10((cal - pro*4 - fat*9) / 4), 100);
  const water= hasBW ? round5(bw * 0.5) : 64;
  return { calories: cal, protein: pro, carbs: carb, fat, waterGoal: water };
}

function _weeksToGoal(bw, goalWeight, weeklyRate) {
  if (!bw || !goalWeight || !weeklyRate || bw === goalWeight) return null;
  const diff = Math.abs(goalWeight - bw);
  const weeks = Math.round(diff / weeklyRate);
  if (weeks <= 0) return null;
  return weeks;
}

// Updates just the live preview card on step 2 — no full re-render so keyboard stays up
function _updateStep2Preview() {
  const preview = document.getElementById('setup-step2-preview');
  if (!preview) return;
  const { goal, bodyweight: bw, goalWeight, weeklyRate } = _setupData;
  if (!bw || bw <= 0) { preview.innerHTML = ''; return; }

  const t = _calcTargets(goal, bw, weeklyRate);
  const weeks = _weeksToGoal(bw, goalWeight, weeklyRate);
  const timelineHtml = weeks && goalWeight ? `
    <div style="margin-top:10px;padding:8px 12px;background:rgba(232,213,160,0.06);border-radius:8px;font-size:11px;color:var(--muted);text-align:center;">
      At this pace → <strong style="color:var(--accent);">${goalWeight} lb</strong> in ~<strong style="color:var(--accent);">${weeks} weeks</strong>
    </div>` : '';

  preview.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;padding:12px;background:var(--bg2);border-radius:12px;border:1px solid var(--border2);">
      ${[['CAL','calories','var(--accent)',''],['PRO','protein','#52c87a','g'],['CARBS','carbs','#7aacff','g'],['FAT','fat','#ffb347','g']].map(([lbl,key,color,unit])=>`
        <div style="text-align:center;">
          <div style="font-size:8px;color:var(--muted);letter-spacing:1px;margin-bottom:3px;">${lbl}</div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;color:${color};">${t[key]}${unit}</div>
        </div>`).join('')}
    </div>
    ${timelineHtml}`;
}

function _stepDots(current) {
  return [1,2,3].map(i =>
    `<div style="width:${i===current?20:6}px;height:6px;border-radius:3px;
      background:${i===current?'var(--accent)':'#333'};
      transition:width 0.3s;"></div>`
  ).join('');
}

export function _renderSetupStep() {
  const el = document.getElementById('setup-content');
  if (!el) return;

  const GOAL_META = {
    muscle: { label: 'BUILD MUSCLE', sub: 'Gain strength & size', icon: '💪' },
    fat:    { label: 'LOSE FAT',     sub: 'Burn fat, keep muscle', icon: '🔥' },
    fit:    { label: 'STAY FIT',     sub: 'Maintain & feel great', icon: '⚡' },
  };

  if (_setupStep === 1) {
    el.innerHTML = `
      <div style="flex:1;display:flex;flex-direction:column;padding:48px 24px 40px;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:3px;color:var(--accent);margin-bottom:4px;">GAINZ</div>
        <div style="font-size:22px;font-weight:700;color:var(--text);margin-bottom:6px;">Let's set you up.</div>
        <div style="font-size:13px;color:var(--dim);margin-bottom:32px;">Takes 30 seconds. You can change any of this later.</div>

        <div style="font-size:10px;letter-spacing:2px;color:var(--muted);margin-bottom:12px;">YOUR NAME (OPTIONAL)</div>
        <input id="setup-name" class="input" type="text" placeholder="e.g. Mike" value="${_setupData.name||''}"
          style="margin-bottom:32px;font-size:16px;"
          oninput="_setupData.name=this.value.trim()"/>

        <div style="font-size:10px;letter-spacing:2px;color:var(--muted);margin-bottom:12px;">WHAT'S YOUR MAIN GOAL?</div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:auto;">
          ${Object.entries(GOAL_META).map(([key, g]) => `
            <button onclick="_setupData.goal='${key}';_renderSetupStep();"
              style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-radius:14px;cursor:pointer;text-align:left;
                background:${_setupData.goal===key?'rgba(232,213,160,0.1)':'var(--bg2)'};
                border:2px solid ${_setupData.goal===key?'var(--accent)':'var(--border2)'};
                transition:all 0.15s;">
              <span style="font-size:24px;">${g.icon}</span>
              <div>
                <div style="font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:1.5px;color:${_setupData.goal===key?'var(--accent)':'var(--text)'};">${g.label}</div>
                <div style="font-size:11px;color:var(--dim);margin-top:1px;">${g.sub}</div>
              </div>
              ${_setupData.goal===key?`<div style="margin-left:auto;color:var(--accent);font-size:18px;">✓</div>`:''}
            </button>`).join('')}
        </div>

        <div style="margin-top:32px;">
          <div style="display:flex;justify-content:center;gap:6px;margin-bottom:20px;">${_stepDots(1)}</div>
          <button class="btn primary" onclick="_setupGoNext()"
            style="${!_setupData.goal?'opacity:0.4;pointer-events:none;':''}">
            NEXT →
          </button>
        </div>
      </div>`;
  }

  if (_setupStep === 2) {
    const showPace = _setupData.goal !== 'fit';
    const paceOptions = _setupData.goal === 'muscle'
      ? [0.25, 0.5, 1]
      : [0.5, 1, 1.5, 2];
    const defaultRate = _setupData.goal === 'muscle' ? 0.5 : 1;
    if (!_setupData.weeklyRate) _setupData.weeklyRate = defaultRate;

    el.innerHTML = `
      <div style="flex:1;display:flex;flex-direction:column;padding:48px 24px 40px;">
        <div style="font-size:22px;font-weight:700;color:var(--text);margin-bottom:6px;">Your weight</div>
        <div style="font-size:13px;color:var(--dim);margin-bottom:24px;">We'll use this to calculate your exact calorie target.</div>

        <div style="font-size:10px;letter-spacing:2px;color:var(--muted);margin-bottom:8px;">CURRENT WEIGHT</div>
        <div style="position:relative;margin-bottom:20px;">
          <input id="setup-bw" class="input" type="number" inputmode="decimal" placeholder="185"
            value="${_setupData.bodyweight||''}"
            style="font-size:24px;text-align:center;padding-right:48px;"
            oninput="_setupData.bodyweight=parseFloat(this.value)||0;_updateStep2Preview();"/>
          <span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:13px;color:var(--muted);pointer-events:none;">lb</span>
        </div>

        ${showPace ? `
        <div style="font-size:10px;letter-spacing:2px;color:var(--muted);margin-bottom:8px;">GOAL WEIGHT (OPTIONAL)</div>
        <div style="position:relative;margin-bottom:20px;">
          <input id="setup-goal-wt" class="input" type="number" inputmode="decimal" placeholder="${_setupData.goal==='muscle'?'195':'160'}"
            value="${_setupData.goalWeight||''}"
            style="font-size:24px;text-align:center;padding-right:48px;"
            oninput="_setupData.goalWeight=parseFloat(this.value)||0;_updateStep2Preview();"/>
          <span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:13px;color:var(--muted);pointer-events:none;">lb</span>
        </div>

        <div style="font-size:10px;letter-spacing:2px;color:var(--muted);margin-bottom:10px;">
          ${_setupData.goal==='muscle'?'WEEKLY GAIN TARGET':'WEEKLY LOSS TARGET'}
        </div>
        <div style="display:flex;gap:8px;margin-bottom:20px;">
          ${paceOptions.map(r=>`
            <button onclick="_setupData.weeklyRate=${r};_updateStep2Preview();_renderStep2Pace();"
              id="pace-btn-${String(r).replace('.','_')}"
              style="flex:1;padding:10px 4px;border-radius:10px;cursor:pointer;font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:1px;
                background:${_setupData.weeklyRate===r?'rgba(232,213,160,0.12)':'var(--bg2)'};
                border:2px solid ${_setupData.weeklyRate===r?'var(--accent)':'var(--border2)'};
                color:${_setupData.weeklyRate===r?'var(--accent)':'var(--muted)'};">
              ${r} lb
            </button>`).join('')}
        </div>` : ''}

        <div id="setup-step2-preview"></div>

        <div style="margin-top:auto;padding-top:24px;">
          <div style="display:flex;justify-content:center;gap:6px;margin-bottom:20px;">${_stepDots(2)}</div>
          <button class="btn primary" onclick="_setupGoNext()">NEXT →</button>
          <button class="btn ghost" onclick="_setupStep=1;_renderSetupStep();" style="margin-top:8px;">← BACK</button>
        </div>
      </div>`;
    setTimeout(() => { document.getElementById('setup-bw')?.focus(); }, 80);
    // Populate preview if we already have a weight (e.g. back-navigation)
    if (_setupData.bodyweight) _updateStep2Preview();
  }

  if (_setupStep === 3) {
    const t = _calcTargets(_setupData.goal, _setupData.bodyweight, _setupData.weeklyRate);
    const GOAL_META_LABEL = { muscle: 'BUILD MUSCLE', fat: 'LOSE FAT', fit: 'STAY FIT' };
    const rateLabel = _setupData.weeklyRate ? ` · ${_setupData.weeklyRate} lb/wk` : '';
    el.innerHTML = `
      <div style="flex:1;display:flex;flex-direction:column;padding:48px 24px 40px;">
        <div style="font-size:22px;font-weight:700;color:var(--text);margin-bottom:4px;">Your suggested targets</div>
        <div style="font-size:12px;color:var(--dim);margin-bottom:6px;">Based on: <span style="color:var(--accent);">${GOAL_META_LABEL[_setupData.goal]||''}</span>${_setupData.bodyweight?` · <span style="color:var(--muted);">${_setupData.bodyweight} lb</span>`:''}${rateLabel?`<span style="color:var(--dim);">${rateLabel}</span>`:''}</div>
        <div style="font-size:11px;color:var(--dim);margin-bottom:24px;">Adjust anything before saving — you can always change these later.</div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">
          ${[
            ['CALORIES','calories','var(--accent)','kcal', 'Daily energy target'],
            ['PROTEIN','protein','#52c87a','g', 'Aim for ~1g per lb bodyweight'],
            ['CARBS','carbs','#7aacff','g', 'Fuel for training'],
            ['FAT','fat','#ffb347','g', 'Hormones & recovery'],
          ].map(([lbl, key, color, unit, hint]) => `
            <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:12px;padding:12px;">
              <div style="font-size:9px;color:${color};letter-spacing:1.5px;margin-bottom:2px;">${lbl}</div>
              <div style="font-size:9px;color:var(--dim);margin-bottom:8px;">${hint}</div>
              <div style="position:relative;">
                <input id="st-${key}" type="number" inputmode="decimal" value="${t[key]}"
                  style="width:100%;background:var(--bg3);border:1px solid var(--border2);border-radius:8px;
                    color:${color};font-family:'Bebas Neue',sans-serif;font-size:26px;
                    padding:8px 28px 8px 8px;text-align:center;box-sizing:border-box;"
                  oninput=""/>
                <span style="position:absolute;right:6px;top:50%;transform:translateY(-50%);font-size:10px;color:var(--dim);pointer-events:none;">${unit}</span>
              </div>
            </div>`).join('')}
        </div>

        <div style="background:rgba(122,172,255,0.06);border:1px solid rgba(122,172,255,0.15);border-radius:10px;padding:12px 14px;margin-bottom:24px;">
          <div style="font-size:9px;color:#7aacff;letter-spacing:1.5px;margin-bottom:4px;">WATER GOAL</div>
          <div style="display:flex;align-items:center;gap:8px;">
            <input id="st-water" type="number" inputmode="decimal" value="${t.waterGoal}"
              style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:8px;
                color:#7aacff;font-family:'Bebas Neue',sans-serif;font-size:22px;
                padding:8px;text-align:center;box-sizing:border-box;" oninput=""/>
            <span style="font-size:12px;color:var(--dim);">oz / day</span>
          </div>
          ${_setupData.bodyweight ? `<div style="font-size:10px;color:var(--dim);margin-top:6px;">Based on ${_setupData.bodyweight} lb × 0.5 oz</div>` : ''}
        </div>

        <div style="display:flex;justify-content:center;gap:6px;margin-bottom:20px;">${_stepDots(3)}</div>
        <button class="btn primary" onclick="_setupSave()">SAVE & START →</button>
        <button class="btn ghost" onclick="_setupStep=2;_renderSetupStep();" style="margin-top:8px;">← BACK</button>
      </div>`;
  }
}

// Re-styles pace buttons in-place without re-rendering the whole step
export function _renderStep2Pace() {
  const paceOptions = _setupData.goal === 'muscle' ? [0.25, 0.5, 1] : [0.5, 1, 1.5, 2];
  paceOptions.forEach(r => {
    const btn = document.getElementById('pace-btn-' + String(r).replace('.','_'));
    if (!btn) return;
    const active = _setupData.weeklyRate === r;
    btn.style.background = active ? 'rgba(232,213,160,0.12)' : 'var(--bg2)';
    btn.style.borderColor = active ? 'var(--accent)' : 'var(--border2)';
    btn.style.color       = active ? 'var(--accent)'  : 'var(--muted)';
  });
}

export function _setupGoNext() {
  if (_setupStep === 1 && !_setupData.goal) return;
  _setupStep++;
  _renderSetupStep();
}

export function _setupSave() {
  // Read final values from inputs (user may have adjusted them)
  const cal  = parseInt(document.getElementById('st-calories')?.value) || 0;
  const pro  = parseInt(document.getElementById('st-protein')?.value)  || 0;
  const carb = parseInt(document.getElementById('st-carbs')?.value)    || 0;
  const fat  = parseInt(document.getElementById('st-fat')?.value)      || 0;
  const water= parseInt(document.getElementById('st-water')?.value)    || 64;

  // Save name
  if (_setupData.name) localStorage.setItem('gainz_user_name', _setupData.name);

  // Save goal
  if (_setupData.goal) localStorage.setItem('gainz_user_goal', _setupData.goal);

  // Save bodyweight
  if (_setupData.bodyweight && window.state) {
    if (!window.state.bodyweight) window.state.bodyweight = [];
    const hr = new Date().getHours();
    const timeOfDay = hr < 12 ? 'morning' : hr < 17 ? 'afternoon' : 'night';
    const dateStr = new Date().toISOString().slice(0, 10);
    window.state.bodyweight.unshift({ date: dateStr, timestamp: Date.now(), weight: _setupData.bodyweight, timeOfDay });
  }

  // Save macro targets
  if (window.state) {
    window.state.macroTargets = { calories: cal, protein: pro, carbs: carb, fat, waterGoal: water };
    window.saveAndSync?.();
  }

  // Mark setup done
  localStorage.setItem('gainz_setup_done', '1');

  // Hide setup, show cinematic
  const el = document.getElementById('setup-flow');
  if (el) { el.style.opacity = '0'; el.style.transition = 'opacity 0.4s'; setTimeout(() => { el.style.display = 'none'; el.style.opacity = ''; el.style.transition = ''; }, 400); }
  setTimeout(() => { showCinematic(); }, 200);
}

export function maybeShowSetup() {
  if (localStorage.getItem('gainz_setup_done')) return false;
  _setupStep = 1;
  // Mutate (don't reassign) so window._setupData reference stays valid
  Object.assign(_setupData, { name: '', goal: '', bodyweight: 0 });
  const el = document.getElementById('setup-flow');
  if (!el) return false;
  el.style.display = 'block';
  _renderSetupStep();
  return true;
}

// ── Cinematic power stats — one shown per app open ──
const CIN_STATS = [
  {
    lines: ['Exercise grows', 'new brain cells.'],
    punch: 'Literally.',
    size: 42,
    cites: [
      'Pereira et al., PNAS, 2007',
      'Erickson et al., PNAS, 2011',
      'Choi et al., Science, 2018',
      'Queensland Brain Institute, 2020',
      'Choi et al., Nature Metabolism, 2021',
      'Zhao et al., Aging Cell, 2025',
    ],
    kicker: ''
  },
  {
    lines: ['Six months of lifting reversed', 'age-related muscle decline.'],
    size: 36,
    cite: 'Melov et al., PLoS ONE, 2007',
    kicker: 'Your muscles remember how to be young.'
  },
  // #1 replacements — Alzheimer's/brain
  {
    lines: ['People who exercise regularly are', '45% less likely to develop dementia.'],
    size: 34,
    cite: 'Lancet Standing Commission on Dementia, 2024',
    kicker: 'Move your body. Protect your mind.'
  },
  {
    lines: ['Exercise builds new neural pathways.', 'Your brain gets stronger every time you train.'],
    size: 34,
    cite: 'Cotman & Berchtold, Trends in Neurosciences, 2002',
    kicker: ''
  },
  {
    lines: ['30 minutes of exercise changes', 'your brain chemistry for 24 hours.'],
    size: 36,
    cite: 'Basso & Suzuki, Brain Plasticity, 2017',
    kicker: 'One session. A full day of benefits.'
  },
  // #3 replacements — cells/biology
  {
    lines: ['Your body rebuilds 330 billion cells', 'every day. Exercise makes the new ones stronger.'],
    size: 32,
    cite: 'Sender et al., Cell, 2016',
    kicker: 'You are literally rebuilding yourself.'
  },
  {
    lines: ['After one workout, your blood carries', 'anti-inflammatory molecules for 48 hours.'],
    size: 34,
    cite: 'Hojman et al., J Physiology, 2019',
    kicker: 'Every rep is medicine.'
  },
  {
    lines: ['Exercise rewires your DNA expression.', 'You are programming your genes right now.'],
    size: 34,
    cite: 'Lindholm et al., Epigenetics, 2014',
    kicker: ''
  },
];

let cinTimer = null;
let cinCanDismiss = false; // prevent accidental early taps

export function maybeShowCinematic() {
  // Always show cinematic — it's a motivational moment every open
  showCinematic();
  return true;
}

function showCinematic() {
  const el = document.getElementById('cinematic-splash');
  const container = document.getElementById('cin-container');
  if (!el || !container) return;

  // Pick stat — first open always gets brain cells, then rotate
  const views = parseInt(localStorage.getItem('gainz_onboard_views') || '0');
  const stat = CIN_STATS[views % CIN_STATS.length];

  // Build particles (subtle floating embers)
  let particlesHTML = '<div class="cin-particles">';
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * 100;
    const delay = Math.random() * 6;
    const dur = 5 + Math.random() * 5;
    const size = 1 + Math.random() * 2;
    particlesHTML += `<div class="cin-particle" style="left:${x}%;bottom:-30vh;width:${size}px;height:${size}px;animation-delay:${delay}s;animation-duration:${dur}s;"></div>`;
  }
  particlesHTML += '</div>';

  // Build content — headline, optional punch line, optional kicker, cite last
  // If stat has rotating cites array, pick one based on view count
  const cite = stat.cites ? stat.cites[views % stat.cites.length] : stat.cite;
  const hasKicker = stat.kicker && stat.kicker.length > 0;
  const hasPunch = stat.punch && stat.punch.length > 0;
  container.innerHTML = particlesHTML +
    `<div class="cin-headline">${stat.lines.join('<br>')}</div>` +
    (hasPunch ? `<div class="cin-punch">${stat.punch}</div>` : '') +
    (hasKicker ? `<div class="cin-kicker">${stat.kicker}</div>` : '') +
    `<div class="cin-cite">${cite}</div>`;

  el.style.display = 'flex';
  el.classList.remove('cin-fade-out');
  el.style.opacity = '1';
  cinCanDismiss = false;
  // Allow dismiss after a brief moment (prevents accidental double-tap on app open)
  setTimeout(() => { cinCanDismiss = true; }, 500);

  const headline = container.querySelector('.cin-headline');
  const punch = container.querySelector('.cin-punch');
  const kicker = container.querySelector('.cin-kicker');
  const citeEl = container.querySelector('.cin-cite');

  let t = 800;
  setTimeout(() => headline.classList.add('show'), t);
  t += 2000;
  if (punch) { setTimeout(() => punch.classList.add('show'), t); t += 1600; }
  if (kicker) { setTimeout(() => kicker.classList.add('show'), t); t += 1600; }
  setTimeout(() => citeEl.classList.add('show'), t);
  t += 1200;
  setTimeout(() => headline.classList.add('pulse'), t);
  t += 600;
  // Fade out the text content first, then crossfade to onboarding
  cinTimer = setTimeout(() => {
    container.classList.add('cin-content-fade');
    cinCanDismiss = true; // auto-dismiss always allowed
    setTimeout(() => dismissCinematic(), 200);
  }, t);
}

export function skipCinematic() {
  // Instant skip — fast fade, no waiting
  if (cinTimer) { clearTimeout(cinTimer); cinTimer = null; }
  const el = document.getElementById('cinematic-splash');
  if (!el || el.style.display === 'none') return;
  el.style.transition = 'opacity 0.3s ease';
  el.style.opacity = '0';
  el.style.pointerEvents = 'none';
  setTimeout(() => { el.style.display = 'none'; }, 300);
  const ob = document.getElementById('onboard-splash');
  if (ob) { ob.style.display = 'none'; }
  const views = parseInt(localStorage.getItem('gainz_onboard_views') || '0') + 1;
  localStorage.setItem('gainz_onboard_views', String(views));
}

export function dismissCinematic() {
  if (!cinCanDismiss) return; // ignore early taps
  if (cinTimer) { clearTimeout(cinTimer); cinTimer = null; }
  const el = document.getElementById('cinematic-splash');
  if (!el || el.style.display === 'none') return;
  cinCanDismiss = false; // prevent double-dismiss

  // Smooth fade out cinematic — go straight to app
  el.classList.add('cin-fade-out');
  setTimeout(() => { el.style.display = 'none'; }, 1300);

  // Also hide onboarding if it was somehow showing
  const ob = document.getElementById('onboard-splash');
  if (ob) { ob.style.display = 'none'; }

  // Increment view count for quote rotation
  const views = parseInt(localStorage.getItem('gainz_onboard_views') || '0') + 1;
  localStorage.setItem('gainz_onboard_views', String(views));
}

// ── All onboarding cards — shuffled each time ──
const OB_CARDS = [
  { icon: '🧠', title: 'Your Personal Coach', body: 'GAINZ learns your patterns. <strong>Tracks muscle volume, flags imbalances,</strong> and recommends what to train next based on your history.' },
  { icon: '📚', title: 'Science-Backed', body: 'Every exercise has <strong>research-backed tips</strong> on form, rep ranges, and recovery. Real studies, not bro science.' },
  { icon: '🦖', title: 'Wild Stats', body: 'See your total tonnage compared to real objects. <strong>"You moved a literal T-Rex this month."</strong> PRs, streaks, and milestones tracked.' },
  { icon: '📈', title: 'Auto-Progression', body: 'GAINZ calculates your next weight automatically. <strong>Just show up and lift.</strong> It handles the programming.' },
  { icon: '🏆', title: 'PR Detection', body: 'Hit a new personal record? <strong>GAINZ catches it instantly</strong> — confetti, badges, and a full PR history to look back on.' },
  { icon: '👋', title: 'Zero Setup', body: 'No account. No login. No cloud. <strong>Your data stays on your phone.</strong> Open it and start lifting in 3 seconds.' },
  { icon: '🔁', title: 'Smart Start', body: 'Start a workout and <strong>your last session auto-loads.</strong> Same exercises, ready to beat. No setup required.' },
  { icon: '📋', title: 'Paste Any Log', body: 'Got notes from another app? <strong>Paste them in and AI parses it</strong> into structured workout history. Any format.' },
  { icon: '💪', title: 'Muscle Volume', body: 'See <strong>weekly sets per muscle group</strong> vs your max recoverable volume. Know exactly when to push harder or back off.' },
  { icon: '🔥', title: 'Streaks & Milestones', body: 'Track your consistency with <strong>day streaks, workout milestones,</strong> and weekly activity heat maps. Stay accountable.' },
];

const OB_SHOW_COUNT = 4; // cards per session
const OB_MAX_VIEWS = 10; // stop showing after this many app opens

// ── Carousel state ──
let obIdx = 0;
let obCardCount = OB_SHOW_COUNT;

function _obShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function _obSpawnParticles(container) {
  // Don't double-spawn
  if (container.querySelector('.ob-particles')) return;
  const wrap = document.createElement('div');
  wrap.className = 'ob-particles';
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'amb-particle';
    const x = Math.random() * 100;
    const delay = Math.random() * 8;
    const dur = 6 + Math.random() * 6;
    const size = 1 + Math.random() * 2;
    p.style.cssText = `left:${x}%;bottom:-10px;width:${size}px;height:${size}px;animation-delay:${delay}s;animation-duration:${dur}s;`;
    wrap.appendChild(p);
  }
  container.appendChild(wrap);
}

function _obBuildCards() {
  const track = document.getElementById('ob-cards-track');
  const dotsEl = document.getElementById('ob-dots');
  if (!track || !dotsEl) return;

  // First 3 cards are pinned in order, 4th is random from the rest
  const pinned = OB_CARDS.slice(0, 3);
  const rest = _obShuffle(OB_CARDS.slice(3));
  const cards = [...pinned, rest[0]];
  obCardCount = cards.length;

  track.innerHTML = cards.map(c => `
    <div class="ob-card">
      <div class="ob-card-icon">${c.icon}</div>
      <div class="ob-card-title">${c.title}</div>
      <div class="ob-card-body">${c.body}</div>
    </div>
  `).join('');

  dotsEl.innerHTML = cards.map((_, i) =>
    `<div class="ob-dot${i === 0 ? ' active' : ''}" id="ob-dot-${i}"></div>`
  ).join('');
}

export function showSplash() {
  const el = document.getElementById('onboard-splash');
  if (!el) return;
  _obBuildCards();
  _obSpawnParticles(el);
  el.style.display = 'flex';
  el.classList.remove('fade-out');
  // If no cinematic is covering us, fade in directly
  const cin = document.getElementById('cinematic-splash');
  if (!cin || cin.style.display === 'none') {
    requestAnimationFrame(() => { el.style.opacity = '1'; });
  }
  obIdx = 0;
  _obSnap(0, false);
  _obBindSwipe();
}

function _obSnap(i, animate) {
  const track = document.getElementById('ob-cards-track');
  if (!track) return;
  if (!animate) track.style.transition = 'none';
  else track.style.transition = 'transform 0.38s cubic-bezier(0.25,1,0.5,1)';
  track.style.transform = 'translateX(' + (-i * 100) + '%)';
  for (let j = 0; j < obCardCount; j++) {
    const d = document.getElementById('ob-dot-' + j);
    if (d) d.className = 'ob-dot' + (j === i ? ' active' : '');
  }
  obIdx = i;
}

function _obBindSwipe() {
  const wrap = document.getElementById('ob-cards-wrap');
  const track = document.getElementById('ob-cards-track');
  if (!wrap || !track) return;

  let startX = 0, startY = 0, dragging = false, lockAxis = null;
  let liveX = 0;

  wrap.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    dragging = true;
    lockAxis = null;
    track.style.transition = 'none';
  }, { passive: true });

  wrap.addEventListener('touchmove', e => {
    if (!dragging) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (!lockAxis) lockAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (lockAxis !== 'x') return;
    e.preventDefault();
    let raw = -obIdx * 100 + (dx / wrap.offsetWidth) * 100;
    const minPct = -(obCardCount - 1) * 100;
    if (raw > 0) raw = raw * 0.2;
    if (raw < minPct) raw = minPct + (raw - minPct) * 0.2;
    liveX = raw;
    track.style.transform = 'translateX(' + raw + '%)';
  }, { passive: false });

  wrap.addEventListener('touchend', e => {
    if (!dragging || lockAxis !== 'x') { dragging = false; return; }
    dragging = false;
    const dx = e.changedTouches[0].clientX - startX;
    const threshold = wrap.offsetWidth * 0.22;
    if (dx < -threshold && obIdx < obCardCount - 1) {
      _obSnap(obIdx + 1, true);
    } else if (dx > threshold && obIdx > 0) {
      _obSnap(obIdx - 1, true);
    } else if (obIdx === obCardCount - 1 && dx < -threshold * 0.6) {
      dismissSplash();
    } else {
      _obSnap(obIdx, true);
    }
  }, { passive: true });

  let mDown = false, mStartX = 0;
  wrap.addEventListener('mousedown', e => { mDown = true; mStartX = e.clientX; track.style.transition = 'none'; });
  wrap.addEventListener('mousemove', e => {
    if (!mDown) return;
    const dx = e.clientX - mStartX;
    let raw = -obIdx * 100 + (dx / wrap.offsetWidth) * 100;
    const minPct = -(obCardCount - 1) * 100;
    if (raw > 0) raw = raw * 0.2;
    if (raw < minPct) raw = minPct + (raw - minPct) * 0.2;
    track.style.transform = 'translateX(' + raw + '%)';
  });
  wrap.addEventListener('mouseup', e => {
    if (!mDown) return;
    mDown = false;
    const dx = e.clientX - mStartX;
    const threshold = wrap.offsetWidth * 0.22;
    if (dx < -threshold && obIdx < obCardCount - 1) _obSnap(obIdx + 1, true);
    else if (dx > threshold && obIdx > 0) _obSnap(obIdx - 1, true);
    else if (obIdx === obCardCount - 1 && dx < -threshold * 0.6) dismissSplash();
    else _obSnap(obIdx, true);
  });
  wrap.addEventListener('mouseleave', e => { if (mDown) { mDown = false; _obSnap(obIdx, true); } });
}

export function dismissSplash() {
  const el = document.getElementById('onboard-splash');
  if (!el) return;
  el.classList.add('fade-out');
  setTimeout(() => { el.style.display = 'none'; }, 500);
  const views = parseInt(localStorage.getItem('gainz_onboard_views') || '0') + 1;
  localStorage.setItem('gainz_onboard_views', String(views));
}

export function maybeShowSplash() {
  const views = parseInt(localStorage.getItem('gainz_onboard_views') || '0');
  if (views < OB_MAX_VIEWS) {
    showSplash();
  }
}

// ── Coach Tips (first-exercise walkthrough) ──
let coachTipShown = !!localStorage.getItem('gainz_seen_coach');
let coachTipStep = 0;
let coachTipEl = null;

const COACH_STEPS = [
  { selector: '.input', msg: 'Weight prefills from your last session. Adjust if needed.' },
  { selector: '.btn.ghost', msg: 'Tap to log the set. Rest timer auto-starts.' },
  { selector: '.tip-reopen', msg: 'Tap \ud83d\udcda for science-backed form & rest tips.' },
];

// activeWorkout passed in so this module doesn't need legacy scope access
export function maybeShowCoachTip(activeWorkout) {
  if (coachTipShown) return;
  if (!activeWorkout || activeWorkout.exercises.length !== 1) return;
  const exName = activeWorkout.exercises[0].name;
  setTimeout(() => {
    const card = document.getElementById('ex-' + sid(exName));
    if (!card) return;
    showCoachStep(card, exName, 0);
  }, 400);
}

function showCoachStep(card, exName, step) {
  removeCoachTip();
  if (step >= COACH_STEPS.length) {
    coachTipShown = true;
    localStorage.setItem('gainz_seen_coach', '1');
    return;
  }
  const { selector, msg } = COACH_STEPS[step];
  const target = card.querySelector(selector);
  if (!target) {
    showCoachStep(card, exName, step + 1);
    return;
  }
  const tip = document.createElement('div');
  tip.className = 'ex-coach-tip';
  tip.textContent = msg;
  tip.style.cssText = 'position:absolute;z-index:80;';
  const tRect = target.getBoundingClientRect();
  const cRect = card.getBoundingClientRect();
  tip.style.top = (tRect.bottom - cRect.top + 10) + 'px';
  tip.style.left = '12px';
  card.style.position = 'relative';
  card.appendChild(tip);
  coachTipEl = tip;
  coachTipStep = step;
  tip.addEventListener('click', () => {
    showCoachStep(card, exName, step + 1);
  });
}

export function removeCoachTip() {
  if (coachTipEl) { coachTipEl.remove(); coachTipEl = null; }
}
