// ═══════════════════════════════════════════
// CHALLENGE — Simple monthly focus tracker
// ═══════════════════════════════════════════
import { todayStr, showToast } from './utils.js';

function parseDateKey(ds){
  const parts = ds.split(' ');
  const months = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
  return new Date(+parts[3], months[parts[1]], +parts[2]);
}
function dateKey(d){ return d.toDateString(); }

const CHALLENGE_TYPES = {
  pushups: { label:'PUSH-UPS', short:'push-ups', title:'Push-ups', target:100, unit:'reps', quick:[10,20,25,50] },
  abs: { label:'ABS', short:'abs', title:'Abs', target:100, unit:'reps', quick:[10,20,25,50] },
  prayer: { label:'PRAYER', short:'prayer', title:'Prayer', target:1, unit:'session', quick:[1] },
  breathing: { label:'BREATHING', short:'breathing', title:'Breathing', target:1, unit:'session', quick:[1] },
  journaling: { label:'JOURNALING', short:'journal', title:'Journaling', target:1, unit:'session', quick:[1] },
};
const CHALLENGE_TYPE_ORDER = Object.keys(CHALLENGE_TYPES);

let challengeLogDate = null;

Object.defineProperty(window, 'challengeLogDate', {
  get() { return challengeLogDate; },
  set(v) { challengeLogDate = v; },
  configurable: true
});

function _state() { return window.state; }
function _save() { window.save(); }
function _showModal(h) { window.showModal(h); }
function _hideModal() { window.hideModal(); }
function _render() { window.render(); }

function getChallengeMeta(ch){
  return CHALLENGE_TYPES[ch.type] || CHALLENGE_TYPES.pushups;
}

function ensureChallengeDay(ch, d){
  if(!ch.days[d] || typeof ch.days[d] !== 'object') ch.days[d] = {};
  const day = ch.days[d];
  if(typeof day.count !== 'number'){
    if(ch.type === 'pushups'){
      day.count = Number(day.pushups || 0);
      day.entries = Array.isArray(day.pushSets) ? [...day.pushSets] : [];
    } else if(ch.type === 'abs'){
      day.count = Number(day.situps || 0);
      day.entries = Array.isArray(day.sitSets) ? [...day.sitSets] : [];
    } else {
      day.count = 0;
      day.entries = [];
    }
  }
  if(!Array.isArray(day.entries)) day.entries = [];
  return day;
}

function isDayComplete(ch, day){
  const meta = getChallengeMeta(ch);
  return Number(day?.count || 0) >= meta.target;
}

function completedDays(ch, start, end){
  let count = 0;
  const cur = new Date(start.getTime());
  while(cur <= end){
    const day = ensureChallengeDay(ch, dateKey(cur));
    if(isDayComplete(ch, day)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function todayStatus(ch){
  const meta = getChallengeMeta(ch);
  const day = ensureChallengeDay(ch, todayStr());
  if(isDayComplete(ch, day)) return '✓ Done today';
  if(day.count > 0) {
    return meta.unit === 'reps'
      ? `${day.count}/${meta.target} ${meta.short}`
      : `${day.count}/${meta.target} ${meta.unit}${meta.target === 1 ? '' : 's'}`;
  }
  return 'Not yet today';
}

export function getChallengeState(){
  const state = _state();
  if(!state.challenge) state.challenge = { startDate:null, days:{}, active:false, type:'pushups' };
  if(!state.challenge.type) state.challenge.type = state.challenge.secondEx ? 'abs' : 'pushups';
  if(!state.challenge.days) state.challenge.days = {};
  return state.challenge;
}

export function setChallengeType(type){
  if(!CHALLENGE_TYPES[type]) return;
  const ch = getChallengeState();
  ch.type = type;
  _save();
  _render();
}

export function toggleChallengeEx(){
  const ch = getChallengeState();
  const idx = CHALLENGE_TYPE_ORDER.indexOf(ch.type);
  ch.type = CHALLENGE_TYPE_ORDER[(idx + 1) % CHALLENGE_TYPE_ORDER.length];
  _save();
  _render();
}

export function startChallenge(){
  const state = _state();
  const current = getChallengeState();
  state.challenge = {
    startDate: todayStr(),
    days: {},
    active: true,
    type: current.type || 'pushups'
  };
  challengeLogDate = null;
  _save();
  _render();
  showToast(`${getChallengeMeta(state.challenge).title} challenge started`);
}

export function challengeNavDay(offset){
  const ch = getChallengeState();
  const start = parseDateKey(ch.startDate);
  const cur = challengeLogDate ? parseDateKey(challengeLogDate) : new Date();
  cur.setDate(cur.getDate() + offset);
  if(cur > new Date()) return;
  if(cur < start) return;
  challengeLogDate = dateKey(cur);
  logChallengeDay();
}

export function logChallengeDay(){
  const ch = getChallengeState();
  if(!ch.active) return;
  const meta = getChallengeMeta(ch);
  const d = challengeLogDate || todayStr();
  const isToday = d === todayStr();
  const day = ensureChallengeDay(ch, d);
  const dateObj = parseDateKey(d);
  const dateLabel = isToday ? 'TODAY' : dateObj.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  const canGoNext = parseDateKey(d) < parseDateKey(todayStr());
  const done = isDayComplete(ch, day);
  const status = meta.unit === 'reps'
    ? `${day.count}/${meta.target} ${meta.short}`
    : `${day.count}/${meta.target} ${meta.unit}${meta.target === 1 ? '' : 's'}`;
  const entryRows = day.entries.map((entry, i) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;font-size:11px;color:var(--muted);">
      <span>${meta.unit === 'reps' ? `Entry ${i+1}: ${entry} reps` : `Entry ${i+1}: done`}</span>
      <button onclick="deleteChallengeSet('main',${i})" style="background:none;border:none;color:var(--dim);font-size:9px;cursor:pointer;">✕</button>
    </div>
  `).join('');
  const quickButtons = meta.quick.map(amount => `
    <button onclick="addChallengeQuick('main',${amount})" style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:8px;color:var(--accent);font-size:12px;cursor:pointer;">
      ${meta.unit === 'reps' ? `+${amount}` : 'DONE'}
    </button>
  `).join('');

  _showModal(`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <button onclick="challengeNavDay(-1)" style="background:none;border:none;color:var(--accent);font-size:16px;cursor:pointer;padding:4px 8px;">‹</button>
      <div style="font-size:11px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;">${dateLabel}</div>
      <button onclick="challengeNavDay(1)" style="background:none;border:none;color:${canGoNext?'var(--accent)':'var(--bg3)'};font-size:16px;cursor:pointer;padding:4px 8px;"${canGoNext?'':'disabled'}>›</button>
    </div>

    <div style="font-size:9px;letter-spacing:2px;color:var(--accent);text-transform:uppercase;margin-bottom:6px;">${meta.label}</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:8px;">${status}</div>
    <div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden;margin-bottom:10px;">
      <div style="height:100%;width:${Math.min(100,(day.count/meta.target)*100)}%;background:${done?'var(--green)':'var(--accent)'};border-radius:3px;transition:width 0.3s;"></div>
    </div>
    ${entryRows}
    <div style="display:flex;gap:6px;margin-top:8px;">
      ${quickButtons}
    </div>
    ${day.entries.length && meta.unit === 'reps' ? `<button onclick="addChallengeQuick('main',${day.entries[day.entries.length-1]})" style="width:100%;margin-top:6px;background:var(--accent);border:none;border-radius:6px;padding:8px;color:var(--bg);font-size:11px;font-weight:600;cursor:pointer;">Repeat +${day.entries[day.entries.length-1]}</button>` : ''}
    <button class="btn ghost" style="width:100%;margin-top:10px;" onclick="challengeLogDate=null;hideModal()">DONE</button>
  `);
}

export function addChallengeQuick(type, amount){
  const ch = getChallengeState();
  const d = challengeLogDate || todayStr();
  const day = ensureChallengeDay(ch, d);
  const meta = getChallengeMeta(ch);
  const entryValue = meta.unit === 'reps' ? amount : 1;
  day.entries.push(entryValue);
  day.count = day.entries.reduce((a, n) => a + n, 0);
  _save();
  if(isDayComplete(ch, day)) showToast('Challenge complete for today! 🔥');
  logChallengeDay();
}

export function addChallengeQuickSilent(type, amount){
  const ch = getChallengeState();
  if(!ch.active) return;
  const d = todayStr();
  const day = ensureChallengeDay(ch, d);
  const meta = getChallengeMeta(ch);
  const entryValue = meta.unit === 'reps' ? amount : 1;
  day.entries.push(entryValue);
  day.count = day.entries.reduce((a, n) => a + n, 0);
  _save();
}

export function addChallengeSet(type){
  addChallengeQuick(type, 1);
}

export function deleteChallengeSet(type, idx){
  const ch = getChallengeState();
  const d = challengeLogDate || todayStr();
  const day = ensureChallengeDay(ch, d);
  day.entries.splice(idx, 1);
  day.count = day.entries.reduce((a, n) => a + n, 0);
  _save();
  logChallengeDay();
}

export function resetChallenge(){
  _showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:12px;">RESET CHALLENGE?</div>
    <div style="font-size:13px;color:var(--text);margin-bottom:20px;">This will clear all progress.</div>
    <button class="btn primary" style="background:var(--danger);border-color:var(--danger);width:100%;" onclick="state.challenge={startDate:null,days:{},active:false,type:'pushups'};save();hideModal();render();">RESET</button>
    <button class="btn ghost" style="width:100%;margin-top:8px;" onclick="hideModal()">CANCEL</button>
  `);
}

function renderTypeChips(activeType){
  return CHALLENGE_TYPE_ORDER.map((type) => `
    <button onclick="setChallengeType('${type}')" style="padding:8px 10px;border-radius:999px;border:1px solid ${activeType===type?'rgba(232,213,160,0.28)':'var(--border2)'};background:${activeType===type?'rgba(232,213,160,0.08)':'var(--bg3)'};color:${activeType===type?'var(--accent)':'var(--muted)'};font-size:10px;letter-spacing:1px;cursor:pointer;">
      ${CHALLENGE_TYPES[type].title}
    </button>
  `).join('');
}

export function renderChallenge(){
  const ch = getChallengeState();
  const meta = getChallengeMeta(ch);
  if(!ch.active){
    return `<div style="width:100%;background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:14px;margin-bottom:10px;">
      <div style="font-size:9px;letter-spacing:2px;color:var(--accent);text-transform:uppercase;margin-bottom:6px;">MONTHLY CHALLENGE</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:10px;">Pick one focus to repeat all month.</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">${renderTypeChips(ch.type || 'pushups')}</div>
      <div style="font-size:10px;color:var(--dim);margin-bottom:10px;">Current: ${meta.title} · ${meta.target} ${meta.unit}</div>
      <button onclick="startChallenge()" class="btn primary" style="width:100%;font-size:13px;">START ${meta.title.toUpperCase()}</button>
    </div>`;
  }

  let start = parseDateKey(ch.startDate);
  const now = new Date();
  let dayNum = Math.floor((now - start) / 86400000) + 1;
  const startMonthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  if(now > startMonthEnd){
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const completed = completedDays(ch, start, lastMonthEnd);
    const totalNeeded = Math.floor((lastMonthEnd - start) / 86400000) + 1;
    if(completed !== totalNeeded){
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      ch.startDate = dateKey(firstOfMonth);
      ch.days = {};
      _save();
      start = firstOfMonth;
      dayNum = now.getDate();
    }
  }

  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const targetDays = Math.floor((endOfMonth - start) / 86400000) + 1;
  const daysCompleted = completedDays(ch, start, endOfMonth);
  const pct = Math.round((daysCompleted / targetDays) * 100);
  const todayDone = ensureChallengeDay(ch, todayStr());
  const todayComplete = isDayComplete(ch, todayDone);
  let challengeStreak = 0;
  const checkDate = new Date();
  if(!todayComplete) checkDate.setDate(checkDate.getDate() - 1);
  for(let i = 0; i < targetDays; i++){
    const ds = dateKey(checkDate);
    const day = ensureChallengeDay(ch, ds);
    if(isDayComplete(ch, day)){
      challengeStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  const dotSize = targetDays <= 31 ? 14 : targetDays <= 62 ? 10 : 8;
  const dots = [...Array(targetDays)].map((_, i) => {
    const dotDate = new Date(start.getTime());
    dotDate.setDate(dotDate.getDate() + i);
    const ds = dateKey(dotDate);
    const day = ensureChallengeDay(ch, ds);
    const done = isDayComplete(ch, day);
    const partial = day.count > 0 && !done;
    const isToday = ds === todayStr();
    const isPast = dotDate < new Date() && !isToday;
    const bg = done ? 'var(--green)' : partial ? 'var(--accent)' : isToday ? 'var(--accent)' : 'var(--bg3)';
    const opacity = done ? '1' : partial ? '0.5' : isToday ? '0.3' : isPast ? '0.15' : '0.1';
    return `<div style="width:${dotSize}px;height:${dotSize}px;border-radius:3px;background:${bg};opacity:${opacity};"></div>`;
  }).join('');

  const monthNames = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const isChained = start.getMonth() !== now.getMonth() || start.getFullYear() !== now.getFullYear();
  const label = isChained ? `${dayNum}-DAY STREAK · ${monthNames[now.getMonth()]}` : `${monthNames[now.getMonth()]} ${meta.title.toUpperCase()} · DAY ${dayNum}/${endOfMonth.getDate()}`;

  return `<div onclick="logChallengeDay()" style="background:var(--bg2);border:1px solid ${todayComplete?'rgba(82,200,122,0.3)':'var(--border2)'};border-radius:14px;padding:14px;margin-bottom:10px;cursor:pointer;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <div style="font-size:9px;letter-spacing:2px;color:var(--accent);text-transform:uppercase;">${label}</div>
      <button onclick="event.stopPropagation();resetChallenge()" style="background:none;border:none;color:var(--dim);font-size:9px;cursor:pointer;">✕</button>
    </div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:8px;">${meta.title} · ${meta.target} ${meta.unit}</div>
    <div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:10px;">${dots}</div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <div style="font-size:11px;color:var(--muted);">${daysCompleted}/${targetDays} days · ${pct}%${challengeStreak>1?' · 🔥 '+challengeStreak+' day streak':''}</div>
      <div style="font-size:11px;color:${todayComplete?'var(--green)':'var(--dim)'};">${todayStatus(ch)}</div>
    </div>
    <button onclick="event.stopPropagation();logChallengeDay()" class="btn ${todayComplete?'ghost':'primary'}" style="width:100%;font-size:13px;">${todayComplete?'UPDATE TODAY':'LOG TODAY'}</button>
  </div>`;
}

export function inlineChallengeAdd(type, reps){
  addChallengeQuickSilent(type, reps);
  const el = document.getElementById('inline-challenge');
  if(el){
    const ch = getChallengeState();
    const meta = getChallengeMeta(ch);
    const day = ensureChallengeDay(ch, todayStr());
    const label = document.getElementById('ic-main-label');
    const bar = document.getElementById('ic-main-bar');
    const done = isDayComplete(ch, day);
    if(label) label.textContent = `${meta.label} ${day.count}/${meta.target}`;
    if(bar) bar.style.width = Math.min(100, (day.count/meta.target)*100) + '%';
    if(bar) bar.style.background = done ? 'var(--green)' : 'var(--accent)';
    const badge = document.getElementById('ic-done');
    if(badge) badge.style.display = done ? 'inline' : 'none';
    if(done) el.style.borderColor = 'rgba(82,200,122,0.3)';
  }
}

export function renderInlineChallenge(){
  const state = _state();
  if(!state.challenge || !state.challenge.active) return '';
  const ch = getChallengeState();
  const meta = getChallengeMeta(ch);
  const day = ensureChallengeDay(ch, todayStr());
  const done = isDayComplete(ch, day);
  const buttons = meta.quick.map(amount => `
    <button onclick="inlineChallengeAdd('main',${amount})" style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:4px;padding:4px;color:var(--accent);font-size:10px;cursor:pointer;">
      ${meta.unit === 'reps' ? `+${amount}` : 'DONE'}
    </button>
  `).join('');

  return `<div id="inline-challenge" style="margin-bottom:12px;background:var(--bg2);border:1px solid ${done?'rgba(82,200,122,0.3)':'var(--border2)'};border-radius:12px;padding:10px 12px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <div style="font-size:8px;letter-spacing:2px;color:var(--accent);text-transform:uppercase;">DAILY CHALLENGE</div>
      <span id="ic-done" style="font-size:9px;color:var(--green);display:${done?'inline':'none'};">✓ DONE</span>
    </div>
    <div id="ic-main-label" style="font-size:8px;color:var(--dim);margin-bottom:3px;">${meta.label} ${day.count}/${meta.target}</div>
    <div style="height:4px;background:var(--bg3);border-radius:2px;overflow:hidden;margin-bottom:6px;">
      <div id="ic-main-bar" style="height:100%;width:${Math.min(100,(day.count/meta.target)*100)}%;background:${done?'var(--green)':'var(--accent)'};border-radius:2px;transition:width 0.2s;"></div>
    </div>
    <div style="display:flex;gap:3px;">${buttons}</div>
  </div>`;
}
