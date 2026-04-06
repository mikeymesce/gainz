// ═══════════════════════════════════════════
// CHALLENGE — 30-Day Push-up & Sit-up Challenge
// ═══════════════════════════════════════════
import { todayStr, showToast } from './utils.js';

// Convert a toDateString() key to a Date reliably (avoids spec-ambiguous parsing)
function parseDateKey(ds){
  // toDateString() format: "Mon Mar 31 2026"
  const parts=ds.split(' '); // ['Mon','Mar','31','2026']
  const months={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
  return new Date(+parts[3], months[parts[1]], +parts[2]);
}
// Get toDateString() for a Date object (no parsing ambiguity)
function dateKey(d){ return d.toDateString(); }

// ── Module-level state ──
let challengeLogDate = null;

// Expose challengeLogDate on window so inline onclick handlers can set it
Object.defineProperty(window, 'challengeLogDate', {
  get() { return challengeLogDate; },
  set(v) { challengeLogDate = v; },
  configurable: true
});

// Helper accessors — these read from window at call time,
// after app-legacy.js has loaded and defined them.
function _state() { return window.state; }
function _save() { window.save(); }
function _showModal(h) { window.showModal(h); }
function _hideModal() { window.hideModal(); }
function _render() { window.render(); }

// ── Challenge Functions ──
// NOTE: The second exercise data is always stored under `situps`/`sitSets` keys,
// regardless of whether the user chose sit-ups or BW squats. This avoids
// data migration when toggling. The `secondEx` field controls display labels only.

export function getChallengeState(){
  const state = _state();
  if(!state.challenge) state.challenge={startDate:null,days:{},active:false};
  if(!state.challenge.secondEx) state.challenge.secondEx='situps';
  return state.challenge;
}
export function startChallenge(){
  const state = _state();
  state.challenge={startDate:todayStr(),days:{},active:true};
  _save(); _render();
  showToast('30-day challenge started! 💪');
}
export function toggleChallengeEx(){
  const ch=getChallengeState();
  ch.secondEx=ch.secondEx==='situps'?'squats':'situps';
  _save(); logChallengeDay();
}
export function challengeNavDay(offset){
  const ch=getChallengeState();
  const start=parseDateKey(ch.startDate);
  const cur=challengeLogDate?parseDateKey(challengeLogDate):new Date();
  cur.setDate(cur.getDate()+offset);
  if(cur>new Date()) return;
  if(cur<start) return;
  challengeLogDate=dateKey(cur);
  logChallengeDay();
}
export function logChallengeDay(){
  const ch=getChallengeState();
  if(!ch.active) return;
  const d=challengeLogDate||todayStr();
  const isToday=d===todayStr();
  if(!ch.days[d]) ch.days[d]={pushups:0,situps:0,pushSets:[],sitSets:[]};
  if(!ch.days[d].pushSets) ch.days[d].pushSets=[];
  if(!ch.days[d].sitSets) ch.days[d].sitSets=[];
  const day=ch.days[d];
  const exLabel=ch.secondEx==='squats'?'BW SQUATS':'SIT-UPS';
  const exLabelShort=ch.secondEx==='squats'?'squat':'sit';
  const otherLabel=ch.secondEx==='squats'?'Sit-ups':'BW Squats';
  const dateObj=parseDateKey(d);
  const dateLabel=isToday?'TODAY':dateObj.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  const canGoNext=parseDateKey(d)<parseDateKey(todayStr());

  const pushSetRows=day.pushSets.map((s,i)=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;font-size:11px;color:var(--muted);">
      <span>Set ${i+1}: ${s} reps</span>
      <button onclick="deleteChallengeSet('push',${i})" style="background:none;border:none;color:var(--dim);font-size:9px;cursor:pointer;">✕</button>
    </div>`).join('');
  const sitSetRows=day.sitSets.map((s,i)=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;font-size:11px;color:var(--muted);">
      <span>Set ${i+1}: ${s} reps</span>
      <button onclick="deleteChallengeSet('sit',${i})" style="background:none;border:none;color:var(--dim);font-size:9px;cursor:pointer;">✕</button>
    </div>`).join('');

  _showModal(`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <button onclick="challengeNavDay(-1)" style="background:none;border:none;color:var(--accent);font-size:16px;cursor:pointer;padding:4px 8px;">‹</button>
      <div style="font-size:11px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;">${dateLabel}</div>
      <button onclick="challengeNavDay(1)" style="background:none;border:none;color:${canGoNext?'var(--accent)':'var(--bg3)'};font-size:16px;cursor:pointer;padding:4px 8px;"${canGoNext?'':'disabled'}>›</button>
    </div>

    <div style="display:flex;gap:10px;margin-bottom:10px;">
      <div style="flex:1;">
        <div style="font-size:9px;color:var(--dim);margin-bottom:4px;">PUSH-UPS · ${day.pushups}/100</div>
        <div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden;margin-bottom:6px;">
          <div style="height:100%;width:${Math.min(100,day.pushups)}%;background:${day.pushups>=100?'var(--green)':'var(--accent)'};border-radius:3px;transition:width 0.3s;"></div>
        </div>
        ${pushSetRows}
        <div style="display:flex;gap:4px;margin-top:4px;">
          <button onclick="addChallengeQuick('push',5)" style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:6px;color:var(--accent);font-size:12px;cursor:pointer;">+5</button>
          <button onclick="addChallengeQuick('push',10)" style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:6px;color:var(--accent);font-size:12px;cursor:pointer;">+10</button>
          <button onclick="addChallengeQuick('push',20)" style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:6px;color:var(--accent);font-size:12px;cursor:pointer;">+20</button>
          <button onclick="addChallengeQuick('push',25)" style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:6px;color:var(--accent);font-size:12px;cursor:pointer;">+25</button>
        </div>
        ${day.pushSets.length?`<button onclick="addChallengeQuick('push',${day.pushSets[day.pushSets.length-1]})" style="width:100%;margin-top:4px;background:var(--accent);border:none;border-radius:6px;padding:6px;color:var(--bg);font-size:11px;font-weight:600;cursor:pointer;">Repeat +${day.pushSets[day.pushSets.length-1]}</button>`:''}
      </div>
      <div style="flex:1;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <div style="font-size:9px;color:var(--dim);">${exLabel} · ${day.situps}/100</div>
          <button onclick="toggleChallengeEx()" style="background:none;border:none;color:var(--accent);font-size:8px;cursor:pointer;padding:0;">↔ ${otherLabel}</button>
        </div>
        <div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden;margin-bottom:6px;">
          <div style="height:100%;width:${Math.min(100,day.situps)}%;background:${day.situps>=100?'var(--green)':'var(--accent)'};border-radius:3px;transition:width 0.3s;"></div>
        </div>
        ${sitSetRows}
        <div style="display:flex;gap:4px;margin-top:4px;">
          <button onclick="addChallengeQuick('sit',5)" style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:6px;color:var(--accent);font-size:12px;cursor:pointer;">+5</button>
          <button onclick="addChallengeQuick('sit',10)" style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:6px;color:var(--accent);font-size:12px;cursor:pointer;">+10</button>
          <button onclick="addChallengeQuick('sit',20)" style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:6px;color:var(--accent);font-size:12px;cursor:pointer;">+20</button>
          <button onclick="addChallengeQuick('sit',25)" style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:6px;color:var(--accent);font-size:12px;cursor:pointer;">+25</button>
        </div>
        ${day.sitSets.length?`<button onclick="addChallengeQuick('sit',${day.sitSets[day.sitSets.length-1]})" style="width:100%;margin-top:4px;background:var(--accent);border:none;border-radius:6px;padding:6px;color:var(--bg);font-size:11px;font-weight:600;cursor:pointer;">Repeat +${day.sitSets[day.sitSets.length-1]}</button>`:''}
      </div>
    </div>

    <button class="btn ghost" style="width:100%;margin-top:8px;" onclick="challengeLogDate=null;hideModal()">DONE</button>
  `);
}
export function addChallengeQuick(type,reps){
  const ch=getChallengeState();
  const d=challengeLogDate||todayStr();
  if(!ch.days[d]) ch.days[d]={pushups:0,situps:0,pushSets:[],sitSets:[]};
  if(!ch.days[d].pushSets) ch.days[d].pushSets=[];
  if(!ch.days[d].sitSets) ch.days[d].sitSets=[];
  if(type==='push'){
    ch.days[d].pushSets.push(reps);
    ch.days[d].pushups=ch.days[d].pushSets.reduce((a,r)=>a+r,0);
  } else {
    ch.days[d].sitSets.push(reps);
    ch.days[d].situps=ch.days[d].sitSets.reduce((a,r)=>a+r,0);
  }
  _save();
  if(ch.days[d].pushups>=100&&ch.days[d].situps>=100) showToast('Challenge complete! 🔥');
  logChallengeDay();
}
export function addChallengeQuickSilent(type,reps){
  const ch=getChallengeState();
  const d=todayStr();
  if(!ch.days[d]) ch.days[d]={pushups:0,situps:0,pushSets:[],sitSets:[]};
  if(!ch.days[d].pushSets) ch.days[d].pushSets=[];
  if(!ch.days[d].sitSets) ch.days[d].sitSets=[];
  if(type==='push'){
    ch.days[d].pushSets.push(reps);
    ch.days[d].pushups=ch.days[d].pushSets.reduce((a,r)=>a+r,0);
  } else {
    ch.days[d].sitSets.push(reps);
    ch.days[d].situps=ch.days[d].sitSets.reduce((a,r)=>a+r,0);
  }
  _save();
  if(ch.days[d].pushups>=100&&ch.days[d].situps>=100) showToast('Challenge complete for today! 🔥');
}
export function addChallengeSet(type){
  const ch=getChallengeState();
  const d=challengeLogDate||todayStr();
  if(!ch.days[d]) ch.days[d]={pushups:0,situps:0,pushSets:[],sitSets:[]};
  if(!ch.days[d].pushSets) ch.days[d].pushSets=[];
  if(!ch.days[d].sitSets) ch.days[d].sitSets=[];
  const inputId=type==='push'?'ch-push-reps':'ch-sit-reps';
  const reps=parseInt(document.getElementById(inputId)?.value)||0;
  if(!reps){showToast('Enter reps');return;}
  if(type==='push'){
    ch.days[d].pushSets.push(reps);
    ch.days[d].pushups=ch.days[d].pushSets.reduce((a,r)=>a+r,0);
  } else {
    ch.days[d].sitSets.push(reps);
    ch.days[d].situps=ch.days[d].sitSets.reduce((a,r)=>a+r,0);
  }
  _save();
  if(ch.days[d].pushups>=100&&ch.days[d].situps>=100) showToast('Challenge complete! 🔥');
  logChallengeDay();
}
export function deleteChallengeSet(type,idx){
  const ch=getChallengeState();
  const d=challengeLogDate||todayStr();
  if(!ch.days[d]) return;
  if(type==='push'){
    ch.days[d].pushSets.splice(idx,1);
    ch.days[d].pushups=ch.days[d].pushSets.reduce((a,r)=>a+r,0);
  } else {
    ch.days[d].sitSets.splice(idx,1);
    ch.days[d].situps=ch.days[d].sitSets.reduce((a,r)=>a+r,0);
  }
  _save(); logChallengeDay();
}
export function resetChallenge(){
  _showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:12px;">RESET CHALLENGE?</div>
    <div style="font-size:13px;color:var(--text);margin-bottom:20px;">This will clear all progress.</div>
    <button class="btn primary" style="background:var(--danger);border-color:var(--danger);width:100%;" onclick="state.challenge={startDate:null,days:{},active:false};save();hideModal();render();">RESET</button>
    <button class="btn ghost" style="width:100%;margin-top:8px;" onclick="hideModal()">CANCEL</button>
  `);
}
export function renderChallenge(){
  const ch=getChallengeState();
  if(!ch.active){
    return `<button onclick="startChallenge()" style="width:100%;background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:14px;margin-bottom:10px;cursor:pointer;text-align:center;">
      <div style="font-size:9px;letter-spacing:2px;color:var(--accent);text-transform:uppercase;margin-bottom:4px;">30-DAY CHALLENGE</div>
      <div style="font-size:12px;color:var(--muted);">100 push-ups + 100 reps daily</div>
      <div style="font-size:10px;color:var(--dim);margin-top:4px;">Tap to start</div>
    </button>`;
  }
  let start=parseDateKey(ch.startDate);
  let dayNum=Math.floor((new Date()-start)/86400000)+1;

  // ── Auto-reset / perfect month chaining ──
  // Count how many complete 30-day periods have passed
  if(dayNum>30){
    const periodsCompleted=Math.floor((dayNum-1)/30);
    // Check if ALL days from start through the last completed period boundary are perfect
    let allPerfect=true;
    for(let d=0;d<periodsCompleted*30;d++){
      const cd=new Date(start.getTime()); cd.setDate(cd.getDate()+d);
      const data=ch.days[dateKey(cd)];
      if(!data||data.pushups<100||data.situps<100){ allPerfect=false; break; }
    }
    if(!allPerfect){
      // Imperfect period — reset to fresh 30 days
      ch.startDate=todayStr();
      ch.days={};
      _save();
      showToast('New month, new challenge! 💪');
      start=parseDateKey(ch.startDate);
      dayNum=1;
    }
  }

  // Target = 30 × (consecutive perfect periods + 1)
  // e.g. perfect first 30 → target becomes 60, perfect 60 → 90, etc.
  const perfectPeriods=Math.floor((dayNum-1)/30); // periods fully behind us that were perfect (otherwise we'd have reset)
  const target=30*(perfectPeriods+1);

  const daysCompleted=Object.values(ch.days).filter(d=>d.pushups>=100&&d.situps>=100).length;
  const todayDone=ch.days[todayStr()];
  const todayComplete=todayDone&&todayDone.pushups>=100&&todayDone.situps>=100;
  const pct=Math.round((daysCompleted/target)*100);
  // Calculate challenge streak (consecutive days completed ending today or yesterday)
  let challengeStreak=0;
  const checkDate=new Date();
  if(!todayComplete) checkDate.setDate(checkDate.getDate()-1);
  for(let i=0;i<target;i++){
    const ds=checkDate.toDateString();
    const dd=ch.days[ds];
    if(dd&&dd.pushups>=100&&dd.situps>=100){ challengeStreak++; checkDate.setDate(checkDate.getDate()-1); }
    else break;
  }

  // Build day grid — scales dot size for extended challenges
  const dotSize=target<=30?14:target<=60?10:8;
  const dots=[...Array(target)].map((_,i)=>{
    const dotDate=new Date(start.getTime()); dotDate.setDate(dotDate.getDate()+i);
    const ds=dateKey(dotDate);
    const data=ch.days[ds];
    const done=data&&data.pushups>=100&&data.situps>=100;
    const partial=data&&(data.pushups>0||data.situps>0)&&!done;
    const isToday=ds===todayStr();
    const isPast=dotDate<new Date()&&!isToday;
    const bg=done?'var(--green)':partial?'var(--accent)':isToday?'var(--accent)':'var(--bg3)';
    const opacity=done?'1':partial?'0.5':isToday?'0.3':isPast?'0.15':'0.1';
    return `<div style="width:${dotSize}px;height:${dotSize}px;border-radius:3px;background:${bg};opacity:${opacity};"></div>`;
  }).join('');

  const label=target>30?`${target}-DAY STREAK · DAY ${dayNum}`:`30-DAY CHALLENGE · DAY ${Math.min(dayNum,30)}`;

  return `<div style="background:var(--bg2);border:1px solid ${todayComplete?'rgba(82,200,122,0.3)':'var(--border2)'};border-radius:14px;padding:14px;margin-bottom:10px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <div style="font-size:9px;letter-spacing:2px;color:var(--accent);text-transform:uppercase;">${label}</div>
      <button onclick="resetChallenge()" style="background:none;border:none;color:var(--dim);font-size:9px;cursor:pointer;">✕</button>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:10px;">${dots}</div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <div style="font-size:11px;color:var(--muted);">${daysCompleted}/${target} days · ${pct}%${challengeStreak>1?' · 🔥 '+challengeStreak+' day streak':''}</div>
      <div style="font-size:11px;color:${todayComplete?'var(--green)':'var(--dim)'};">${todayComplete?'✓ Done today':todayDone?todayDone.pushups+' push · '+todayDone.situps+' '+(ch.secondEx==='squats'?'squat':'sit'):'Not yet today'}</div>
    </div>
    <button onclick="logChallengeDay()" class="btn ${todayComplete?'ghost':'primary'}" style="width:100%;font-size:13px;">${todayComplete?'UPDATE TODAY':'LOG SOME WORK'}</button>
  </div>`;
}

export function inlineChallengeAdd(type,reps){
  addChallengeQuickSilent(type,reps);
  const el=document.getElementById('inline-challenge');
  if(el){
    const ch=getChallengeState();
    const d=todayStr();
    const day=ch.days[d]||{pushups:0,situps:0};
    const pLabel=document.getElementById('ic-push-label');
    const pBar=document.getElementById('ic-push-bar');
    const sLabel=document.getElementById('ic-sit-label');
    const sBar=document.getElementById('ic-sit-bar');
    if(pLabel) pLabel.textContent='PUSH-UPS '+day.pushups+'/100';
    if(pBar) pBar.style.width=Math.min(100,day.pushups)+'%';
    if(pBar) pBar.style.background=day.pushups>=100?'var(--green)':'var(--accent)';
    if(sLabel) sLabel.textContent=(ch.secondEx==='squats'?'SQUATS':'SIT-UPS')+' '+day.situps+'/100';
    if(sBar) sBar.style.width=Math.min(100,day.situps)+'%';
    if(sBar) sBar.style.background=day.situps>=100?'var(--green)':'var(--accent)';
    const done=day.pushups>=100&&day.situps>=100;
    const badge=document.getElementById('ic-done');
    if(badge) badge.style.display=done?'inline':'none';
    if(done) el.style.borderColor='rgba(82,200,122,0.3)';
  }
}
export function renderInlineChallenge(){
  const state = _state();
  if(!state.challenge||!state.challenge.active) return '';
  const ch=getChallengeState();
  const d=todayStr();
  if(!ch.days[d]) ch.days[d]={pushups:0,situps:0,pushSets:[],sitSets:[]};
  const day=ch.days[d];
  const exLabel=ch.secondEx==='squats'?'SQUATS':'SIT-UPS';
  const done=day.pushups>=100&&day.situps>=100;
  return `<div id="inline-challenge" style="margin-bottom:12px;background:var(--bg2);border:1px solid ${done?'rgba(82,200,122,0.3)':'var(--border2)'};border-radius:12px;padding:10px 12px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <div style="font-size:8px;letter-spacing:2px;color:var(--accent);text-transform:uppercase;">DAILY CHALLENGE</div>
      <span id="ic-done" style="font-size:9px;color:var(--green);display:${done?'inline':'none'};">✓ DONE</span>
    </div>
    <div style="display:flex;gap:8px;">
      <div style="flex:1;">
        <div id="ic-push-label" style="font-size:8px;color:var(--dim);margin-bottom:3px;">PUSH-UPS ${day.pushups}/100</div>
        <div style="height:4px;background:var(--bg3);border-radius:2px;overflow:hidden;margin-bottom:4px;">
          <div id="ic-push-bar" style="height:100%;width:${Math.min(100,day.pushups)}%;background:${day.pushups>=100?'var(--green)':'var(--accent)'};border-radius:2px;transition:width 0.2s;"></div>
        </div>
        <div style="display:flex;gap:3px;">
          <button onclick="inlineChallengeAdd('push',5)" style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:4px;padding:4px;color:var(--accent);font-size:10px;cursor:pointer;">+5</button>
          <button onclick="inlineChallengeAdd('push',10)" style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:4px;padding:4px;color:var(--accent);font-size:10px;cursor:pointer;">+10</button>
          <button onclick="inlineChallengeAdd('push',20)" style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:4px;padding:4px;color:var(--accent);font-size:10px;cursor:pointer;">+20</button>
          <button onclick="inlineChallengeAdd('push',25)" style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:4px;padding:4px;color:var(--accent);font-size:10px;cursor:pointer;">+25</button>
        </div>
      </div>
      <div style="flex:1;">
        <div id="ic-sit-label" style="font-size:8px;color:var(--dim);margin-bottom:3px;">${exLabel} ${day.situps}/100</div>
        <div style="height:4px;background:var(--bg3);border-radius:2px;overflow:hidden;margin-bottom:4px;">
          <div id="ic-sit-bar" style="height:100%;width:${Math.min(100,day.situps)}%;background:${day.situps>=100?'var(--green)':'var(--accent)'};border-radius:2px;transition:width 0.2s;"></div>
        </div>
        <div style="display:flex;gap:3px;">
          <button onclick="inlineChallengeAdd('sit',5)" style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:4px;padding:4px;color:var(--accent);font-size:10px;cursor:pointer;">+5</button>
          <button onclick="inlineChallengeAdd('sit',10)" style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:4px;padding:4px;color:var(--accent);font-size:10px;cursor:pointer;">+10</button>
          <button onclick="inlineChallengeAdd('sit',20)" style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:4px;padding:4px;color:var(--accent);font-size:10px;cursor:pointer;">+20</button>
          <button onclick="inlineChallengeAdd('sit',25)" style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:4px;padding:4px;color:var(--accent);font-size:10px;cursor:pointer;">+25</button>
        </div>
      </div>
    </div>
  </div>`;
}
