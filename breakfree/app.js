// ═══════════════════════════════════════════
// BREAK FREE — Weight loss tracker for Morgan
// "your body. your goal."
// ═══════════════════════════════════════════

const STORAGE_KEY = 'breakfree_data';
const GOAL_START = 135;
const GOAL_TARGET = 115;

// ── State ──
let state = loadState();
let screen = 'home';

function defaultState(){
  return {
    entries: [],       // {date, timestamp, weight, note}
    goalStart: GOAL_START,
    goalTarget: GOAL_TARGET,
    streak: 0,
    lastWeighDate: null,
    milestones: [],    // timestamps of milestones hit
  };
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return {...defaultState(), ...JSON.parse(raw)};
  }catch(e){}
  return defaultState();
}

function save(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){}
}

// ── Helpers ──
function today(){ return new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}); }
function todayStr(){ return new Date().toDateString(); }

function showToast(msg){
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(()=> el.style.opacity = '1');
  setTimeout(()=>{ el.style.opacity='0'; setTimeout(()=>el.remove(),200); }, 2500);
}

function showModal(html){
  document.getElementById('modal-inner').innerHTML = html;
  document.getElementById('modal').classList.add('open');
}
function hideModal(){
  document.getElementById('modal').classList.remove('open');
}

// ── Splash ──
function dismissSplash(){
  const el = document.getElementById('splash');
  if(!el) return;
  el.classList.add('fade-out');
  setTimeout(()=>{ el.style.display='none'; }, 500);
}
setTimeout(dismissSplash, 4000); // auto-dismiss after 4s

// ── Core Functions ──
function logWeight(val, note){
  const weight = parseFloat(val);
  if(!weight || weight < 50 || weight > 500){ showToast('Enter a valid weight'); return; }

  const todayEntry = state.entries.find(e => e.date === today());
  if(todayEntry){
    todayEntry.weight = weight;
    todayEntry.note = note || '';
    todayEntry.timestamp = Date.now();
  } else {
    state.entries.unshift({
      date: today(),
      timestamp: Date.now(),
      weight,
      note: note || ''
    });
  }

  // Streak
  if(state.lastWeighDate !== todayStr()){
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate()-1);
    state.streak = state.lastWeighDate === yesterday.toDateString() ? state.streak + 1 : 1;
    state.lastWeighDate = todayStr();
  }

  // Keep max 365 entries
  if(state.entries.length > 365) state.entries = state.entries.slice(0, 365);

  // Check milestones
  checkMilestones(weight);

  save();
  showToast(weight + ' lb logged');
  render();
}

function deleteEntry(idx){
  state.entries.splice(idx, 1);
  save();
  render();
}

function checkMilestones(weight){
  const lost = state.goalStart - weight;
  const milestoneMarks = [1, 2, 3, 5, 7, 10, 12, 15, 20];
  milestoneMarks.forEach(m => {
    if(lost >= m && !state.milestones.includes(m)){
      state.milestones.push(m);
      showToast('🎉 Milestone: ' + m + ' lbs lost!');
    }
  });
  if(weight <= state.goalTarget && !state.milestones.includes('goal')){
    state.milestones.push('goal');
    showToast('🏆 GOAL REACHED! You did it, Morgan!');
  }
}

// ── Stats ──
function getStats(){
  if(!state.entries.length) return null;
  const current = state.entries[0].weight;
  const totalLost = state.goalStart - current;
  const toGo = current - state.goalTarget;
  const progress = Math.max(0, Math.min(100, (totalLost / (state.goalStart - state.goalTarget)) * 100));

  // Weekly average
  const weekAgo = Date.now() - 7 * 86400000;
  const weekEntries = state.entries.filter(e => e.timestamp >= weekAgo);
  const weekAvg = weekEntries.length ? weekEntries.reduce((a,e) => a + e.weight, 0) / weekEntries.length : current;

  // 7-day change
  const sevenAgo = state.entries.find(e => e.timestamp <= weekAgo);
  const weekChange = sevenAgo ? current - sevenAgo.weight : null;

  // 30-day change
  const thirtyAgo = Date.now() - 30 * 86400000;
  const monthEntry = state.entries.find(e => e.timestamp <= thirtyAgo);
  const monthChange = monthEntry ? current - monthEntry.weight : null;

  return { current, totalLost, toGo, progress, weekAvg, weekChange, monthChange };
}

// ── Rendering ──
function render(){
  const c = document.getElementById('content');
  if(screen === 'home') c.innerHTML = renderHome();
  else if(screen === 'history') c.innerHTML = renderHistory();
  else if(screen === 'milestones') c.innerHTML = renderMilestones();
  renderNav();
}

function renderNav(){
  const nav = document.getElementById('nav');
  const tabs = [
    ['home', '◎', 'TODAY'],
    ['history', '☰', 'HISTORY'],
    ['milestones', '★', 'GOALS'],
  ];
  nav.innerHTML = tabs.map(([key, icon, label]) => `
    <button class="nav-btn ${screen===key?'active':''}" onclick="screen='${key}';render()">
      <span class="icon">${icon}</span>
      <span>${label}</span>
    </button>
  `).join('');
}

function renderHome(){
  const stats = getStats();
  const todayEntry = state.entries.find(e => e.date === today());
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  // Mini chart — last 14 days
  const chartDays = 14;
  const chartEntries = state.entries.slice(0, chartDays).reverse();
  let chart = '';
  if(chartEntries.length >= 2){
    const weights = chartEntries.map(e => e.weight);
    const min = Math.min(...weights) - 1;
    const max = Math.max(...weights) + 1;
    const range = max - min || 1;
    const bars = chartEntries.map(e => {
      const h = Math.max(8, ((e.weight - min) / range) * 100);
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:120px;">
        <div style="font-size:7px;color:var(--dim);margin-bottom:2px;">${e.weight}</div>
        <div class="chart-bar" style="width:100%;height:${h}%;"></div>
      </div>`;
    }).join('');
    chart = `<div class="card">
      <div style="font-size:8px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;margin-bottom:10px;">Last ${chartEntries.length} weigh-ins</div>
      <div style="display:flex;gap:3px;align-items:flex-end;">${bars}</div>
    </div>`;
  }

  return `
    <div style="text-align:center;margin-bottom:20px;">
      <div style="font-size:12px;color:var(--muted);margin-bottom:4px;">${greeting}, Morgan</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:3px;color:var(--dim);">your body. your goal.</div>
    </div>

    ${stats ? `
    <div class="card" style="text-align:center;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:56px;color:var(--accent);line-height:1;">${stats.current}</div>
      <div style="font-size:10px;color:var(--muted);letter-spacing:1px;margin-top:4px;">CURRENT · LBS</div>

      <div style="margin:16px 0;">
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--dim);margin-bottom:4px;">
          <span>${state.goalStart} lb start</span>
          <span>${state.goalTarget} lb goal</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${stats.progress}%;"></div>
        </div>
        <div style="font-size:11px;color:var(--accent);margin-top:6px;">${Math.round(stats.progress)}% there${stats.toGo > 0 ? ' · ' + stats.toGo.toFixed(1) + ' lb to go' : ' · GOAL REACHED! 🎉'}</div>
      </div>

      <div style="display:flex;gap:8px;margin-top:12px;">
        <div style="flex:1;background:var(--bg3);border-radius:10px;padding:10px;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:${stats.totalLost>=0?'var(--green)':'var(--red)'};">${stats.totalLost>=0?'-':'+'} ${Math.abs(stats.totalLost).toFixed(1)}</div>
          <div style="font-size:8px;color:var(--dim);letter-spacing:1px;margin-top:2px;">TOTAL</div>
        </div>
        ${stats.weekChange !== null ? `
        <div style="flex:1;background:var(--bg3);border-radius:10px;padding:10px;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:${stats.weekChange<=0?'var(--green)':'var(--red)'};">${stats.weekChange<=0?'':'+'}${stats.weekChange.toFixed(1)}</div>
          <div style="font-size:8px;color:var(--dim);letter-spacing:1px;margin-top:2px;">7 DAYS</div>
        </div>` : ''}
        ${stats.monthChange !== null ? `
        <div style="flex:1;background:var(--bg3);border-radius:10px;padding:10px;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:${stats.monthChange<=0?'var(--green)':'var(--red)'};">${stats.monthChange<=0?'':'+'}${stats.monthChange.toFixed(1)}</div>
          <div style="font-size:8px;color:var(--dim);letter-spacing:1px;margin-top:2px;">30 DAYS</div>
        </div>` : ''}
      </div>
    </div>
    ` : `
    <div class="card" style="text-align:center;padding:32px 16px;">
      <div style="font-size:28px;margin-bottom:12px;">⚖️</div>
      <div style="font-size:15px;color:var(--text);margin-bottom:4px;">Start your journey</div>
      <div style="font-size:12px;color:var(--dim);">Log your first weigh-in below</div>
    </div>
    `}

    ${chart}

    <button onclick="openWeighIn()" class="btn primary" style="width:100%;font-size:16px;padding:16px;">
      ${todayEntry ? '⚖️ UPDATE TODAY · ' + todayEntry.weight + ' LB' : '⚖️ WEIGH IN'}
    </button>

    ${state.streak > 1 ? `<div style="text-align:center;margin-top:12px;font-size:11px;color:var(--accent);">🔥 ${state.streak} day streak</div>` : ''}

    <button onclick="openSettings()" style="background:none;border:none;color:var(--dim);font-size:10px;margin-top:16px;cursor:pointer;font-family:'DM Sans',sans-serif;letter-spacing:1px;width:100%;text-align:center;">⚙ SETTINGS</button>
  `;
}

function renderHistory(){
  if(!state.entries.length){
    return `<div style="text-align:center;padding:40px 0;">
      <div style="font-size:28px;margin-bottom:12px;">📋</div>
      <div style="font-size:14px;color:var(--muted);">No entries yet</div>
      <div style="font-size:12px;color:var(--dim);margin-top:4px;">Weigh in from the Today tab</div>
    </div>`;
  }

  const rows = state.entries.map((e, i) => {
    const prev = state.entries[i+1];
    const diff = prev ? e.weight - prev.weight : null;
    const diffColor = diff === null ? 'var(--dim)' : diff <= 0 ? 'var(--green)' : 'var(--red)';
    const diffText = diff === null ? '' : (diff <= 0 ? '' : '+') + diff.toFixed(1) + ' lb';
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border);">
      <div>
        <div style="font-size:13px;color:var(--text);">${e.date}</div>
        ${e.note ? `<div style="font-size:10px;color:var(--dim);margin-top:2px;">${e.note}</div>` : ''}
      </div>
      <div style="text-align:right;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;color:var(--text);">${e.weight}</div>
        ${diffText ? `<div style="font-size:10px;color:${diffColor};">${diffText}</div>` : ''}
      </div>
    </div>`;
  }).join('');

  return `
    <div style="font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:2px;margin-bottom:16px;">History</div>
    ${rows}
  `;
}

function renderMilestones(){
  const totalLost = state.entries.length ? state.goalStart - state.entries[0].weight : 0;
  const milestoneMarks = [
    {lbs: 1, label: 'First pound down', icon: '✨'},
    {lbs: 2, label: '2 lbs gone', icon: '🌟'},
    {lbs: 3, label: '3 lbs lighter', icon: '💫'},
    {lbs: 5, label: '5 lb milestone', icon: '⭐'},
    {lbs: 7, label: '7 lbs shed', icon: '🔥'},
    {lbs: 10, label: 'Double digits!', icon: '🎉'},
    {lbs: 12, label: '12 lbs — almost there', icon: '💪'},
    {lbs: 15, label: '15 lbs — incredible', icon: '👑'},
    {lbs: 20, label: '20 lb transformation', icon: '🏆'},
  ];

  const goalReached = state.milestones.includes('goal');

  const rows = milestoneMarks.map(m => {
    const hit = totalLost >= m.lbs;
    return `<div class="milestone" style="opacity:${hit?'1':'0.4'};">
      <div style="font-size:20px;margin-bottom:4px;">${hit ? m.icon : '🔒'}</div>
      <div style="font-size:13px;color:${hit?'var(--accent)':'var(--dim)'};">${m.label}</div>
      <div style="font-size:10px;color:var(--dim);margin-top:2px;">-${m.lbs} lb</div>
    </div>`;
  }).join('');

  return `
    <div style="font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:2px;margin-bottom:6px;">Goals</div>
    <div style="font-size:11px;color:var(--muted);margin-bottom:16px;">${state.goalStart} lb → ${state.goalTarget} lb</div>

    ${goalReached ? `
    <div style="background:linear-gradient(135deg,rgba(201,160,220,0.1),rgba(167,139,250,0.05));border:1px solid rgba(201,160,220,0.3);border-radius:14px;padding:20px;text-align:center;margin-bottom:16px;">
      <div style="font-size:32px;margin-bottom:8px;">🏆</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--accent);">GOAL REACHED</div>
      <div style="font-size:12px;color:var(--muted);margin-top:4px;">You did it, Morgan. You broke free.</div>
    </div>` : ''}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      ${rows}
    </div>
  `;
}

// ── Modals ──
function openWeighIn(){
  const last = state.entries.length ? state.entries[0].weight : '';
  const todayEntry = state.entries.find(e => e.date === today());
  showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:14px;">WEIGH IN</div>
    <input id="bw-inp" type="number" class="input" placeholder="${last || '135'}" value="${todayEntry ? todayEntry.weight : ''}" step="0.1"
      style="text-align:center;font-family:'Bebas Neue',sans-serif;font-size:36px;margin-bottom:6px;"
      inputmode="decimal"/>
    <div style="font-size:10px;color:var(--dim);text-align:center;margin-bottom:10px;">lbs</div>
    <input id="bw-note" class="input" placeholder="note (optional)" style="font-size:12px;margin-bottom:14px;" value="${todayEntry && todayEntry.note ? todayEntry.note : ''}"/>
    <button class="btn primary" style="width:100%;" onclick="logWeight(document.getElementById('bw-inp').value, document.getElementById('bw-note').value);hideModal();">LOG WEIGHT</button>
    <button class="btn ghost" onclick="hideModal()" style="width:100%;margin-top:8px;">CANCEL</button>
  `);
  setTimeout(()=>{const i=document.getElementById('bw-inp');if(i)i.focus();},100);
}

function openSettings(){
  showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:14px;">SETTINGS</div>

    <div style="margin-bottom:14px;">
      <div style="font-size:9px;color:var(--dim);margin-bottom:4px;">Starting weight</div>
      <input id="set-start" type="number" class="input" value="${state.goalStart}" inputmode="decimal" style="font-size:16px;text-align:center;"/>
    </div>
    <div style="margin-bottom:14px;">
      <div style="font-size:9px;color:var(--dim);margin-bottom:4px;">Goal weight</div>
      <input id="set-goal" type="number" class="input" value="${state.goalTarget}" inputmode="decimal" style="font-size:16px;text-align:center;"/>
    </div>

    <button class="btn primary" style="width:100%;" onclick="saveSettings()">SAVE</button>
    <button class="btn ghost" onclick="hideModal()" style="width:100%;margin-top:8px;">CANCEL</button>

    <div style="border-top:1px solid var(--border);margin-top:16px;padding-top:16px;">
      <button onclick="exportData()" style="background:none;border:none;color:var(--dim);font-size:10px;cursor:pointer;font-family:'DM Sans',sans-serif;letter-spacing:1px;">EXPORT DATA</button>
    </div>
  `);
}

function saveSettings(){
  const start = parseFloat(document.getElementById('set-start').value) || state.goalStart;
  const goal = parseFloat(document.getElementById('set-goal').value) || state.goalTarget;
  state.goalStart = start;
  state.goalTarget = goal;
  save();
  hideModal();
  showToast('Settings saved');
  render();
}

function exportData(){
  const blob = new Blob([JSON.stringify(state, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'breakfree-data.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Data exported');
}

// ── Init ──
render();
