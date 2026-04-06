// ═══════════════════════════════════════════
// DAILY TRACKING — Supplements, vitamins, water, cardio, daily check-in
// ═══════════════════════════════════════════
import { today, showToast, haptic } from './utils.js';

// Helper accessors — these read from window at call time,
// after app-legacy.js has loaded and defined them.
function _state() { return window.state; }
function _save() { window.save(); }
function _saveImmediate() { window.saveImmediate(); }
function _saveAndSync() { window.saveAndSync(); }
function _showModal(h) { window.showModal(h); }
function _hideModal() { window.hideModal(); }
function _render() { window.render(); }

// ═══════════════════════════════════════════
// SUPPLEMENTS — Daily creatine & vitamin tracking
// ═══════════════════════════════════════════
export const DEFAULT_VITAMINS=['Vitamin D','Magnesium','Fish Oil','Allergy Pill'];

export function getVitaminList(){
  return _state().vitaminTypes||DEFAULT_VITAMINS;
}
export function getTodaySupp(){
  const state=_state();
  const d=today();
  if(!state.supplements) state.supplements=[];
  return state.supplements.find(s=>s.date===d);
}
export function ensureTodaySupp(){
  const state=_state();
  if(!state.supplements) state.supplements=[];
  const d=today();
  let entry=state.supplements.find(s=>s.date===d);
  if(!entry){
    entry={date:d,timestamp:Date.now(),creatine:0,creatineDose:5,vitamins:{}};
    state.supplements.unshift(entry);
  }
  // Migrate old boolean vitamins to object
  if(typeof entry.vitamins==='boolean'){
    const old=entry.vitamins;
    entry.vitamins={};
    if(old) getVitaminList().forEach(v=>entry.vitamins[v]=true);
  }
  return entry;
}
export function toggleCreatine(){
  const entry=ensureTodaySupp();
  if(entry.creatine>0) entry.creatine=0;
  else entry.creatine=entry.creatineDose||5;
  _saveAndSync(); _render();
  if(entry.creatine>0) haptic('light');
}
export function toggleVitamin(name){
  const entry=ensureTodaySupp();
  entry.vitamins[name]=!entry.vitamins[name];
  _saveAndSync(); _render();
  if(entry.vitamins[name]) haptic('light');
}
export function toggleAllVitamins(){
  const entry=ensureTodaySupp();
  const list=getVitaminList();
  const allOn=list.every(v=>entry.vitamins[v]);
  list.forEach(v=>entry.vitamins[v]=!allOn);
  _saveAndSync(); _render();
  if(!allOn) haptic('light');
}
export function adjustCreatineDose(delta){
  const entry=ensureTodaySupp();
  const newDose=Math.max(2.5,Math.min(20,Math.round(((entry.creatineDose||5)+delta)*10)/10));
  entry.creatineDose=newDose;
  if(entry.creatine>0) entry.creatine=newDose;
  _saveAndSync();
}
export function addWater(oz){
  const entry=ensureTodaySupp();
  if(!entry.waterOz) entry.waterOz=0;
  entry.waterOz+=(oz||8);
  _saveAndSync(); _render();
  haptic('light');
}
export function removeWater(){
  const entry=ensureTodaySupp();
  if(!entry.waterOz||entry.waterOz<=0) return;
  entry.waterOz=Math.max(0,entry.waterOz-8);
  _saveAndSync(); _render();
}
export function adjustCreatine(){
  const entry=getTodaySupp();
  const currentDose=entry?entry.creatineDose||5:5;
  _showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:14px;">CREATINE DOSE</div>
    <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:18px;">
      <button class="btn ghost small" onclick="const i=document.getElementById('creatine-dose-inp');i.value=(Math.max(2.5,parseFloat(i.value)-2.5)).toFixed(1)" style="font-size:18px;padding:8px 14px;">−</button>
      <input id="creatine-dose-inp" type="number" class="input" value="${currentDose}" min="2.5" max="20" step="2.5"
        style="width:80px;text-align:center;font-family:'Bebas Neue',sans-serif;font-size:32px;"/>
      <button class="btn ghost small" onclick="const i=document.getElementById('creatine-dose-inp');i.value=(Math.min(20,parseFloat(i.value)+2.5)).toFixed(1)" style="font-size:18px;padding:8px 14px;">+</button>
    </div>
    <div style="font-size:10px;color:var(--dim);text-align:center;margin-bottom:16px;">grams per day</div>
    <button class="btn primary" onclick="saveCreatineDose()">SAVE</button>
    <button class="btn ghost" onclick="hideModal()" style="margin-top:8px;">CANCEL</button>
  `);
}
export function saveCreatineDose(){
  const val=parseFloat(document.getElementById('creatine-dose-inp').value)||5;
  const dose=Math.max(0.5,Math.min(20,Math.round(val*2)/2)); // snap to 0.5
  const entry=ensureTodaySupp();
  entry.creatineDose=dose;
  if(entry.creatine>0) entry.creatine=dose;
  _saveImmediate(); _hideModal(); _render();
  showToast('Creatine set to '+dose+'g');
}
export function openVitaminSettings(){
  const list=getVitaminList();
  _showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:14px;">MY VITAMINS</div>
    <div id="vit-list" style="margin-bottom:14px;">
      ${list.map((v,i)=>`
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <input class="input vit-name-inp" value="${v.replace(/"/g,'&quot;')}" style="flex:1;padding:10px 12px;font-size:13px;"/>
          <button class="btn ghost small" onclick="this.parentElement.remove()" style="color:var(--danger);border-color:var(--danger)44;padding:8px 10px;">✕</button>
        </div>
      `).join('')}
    </div>
    <button class="btn ghost" onclick="addVitaminRow()" style="margin-bottom:14px;font-size:11px;">+ ADD VITAMIN</button>
    <button class="btn primary" onclick="saveVitaminList()">SAVE</button>
    <button class="btn ghost" onclick="hideModal()" style="margin-top:8px;">CANCEL</button>
  `);
}
export function addVitaminRow(){
  const list=document.getElementById('vit-list');
  if(!list) return;
  const div=document.createElement('div');
  div.style.cssText='display:flex;align-items:center;gap:8px;margin-bottom:8px;';
  div.innerHTML=`
    <input class="input vit-name-inp" placeholder="Vitamin name" style="flex:1;padding:10px 12px;font-size:13px;"/>
    <button class="btn ghost small" onclick="this.parentElement.remove()" style="color:var(--danger);border-color:var(--danger)44;padding:8px 10px;">✕</button>
  `;
  list.appendChild(div);
  div.querySelector('input').focus();
}
export function saveVitaminList(){
  const state=_state();
  const inputs=document.querySelectorAll('.vit-name-inp');
  const names=[...inputs].map(i=>i.value.trim()).filter(Boolean);
  if(!names.length){ showToast('Add at least one vitamin'); return; }
  state.vitaminTypes=names;
  _saveImmediate(); _hideModal(); _render();
  showToast('Vitamins updated');
}
export function suppWeekCount(key){
  const state=_state();
  const weekStart=new Date();
  weekStart.setDate(weekStart.getDate()-weekStart.getDay());
  weekStart.setHours(0,0,0,0);
  return (state.supplements||[]).filter(s=>{
    const d=new Date(s.timestamp);
    if(d<weekStart) return false;
    if(key==='creatine') return s.creatine>0;
    // Vitamins: count day if ALL vitamins taken
    const list=getVitaminList();
    if(typeof s.vitamins==='object'&&s.vitamins) return list.every(v=>s.vitamins[v]);
    return s.vitamins===true;
  }).length;
}
export function renderSuppCard(){
  const state=_state();
  const entry=ensureTodaySupp();
  const creatineOn=entry.creatine>0;
  const dose=entry.creatineDose||5;
  const crWeek=suppWeekCount('creatine');
  const vitWeek=suppWeekCount('vitamins');
  const vitList=getVitaminList();
  const vitsTaken=typeof entry.vitamins==='object'?vitList.filter(v=>entry.vitamins[v]).length:0;
  const allVitsOn=vitsTaken===vitList.length;

  // Today's weigh-in
  const todayBW=(state.bodyweight||[]).find(b=>b.date===today());
  const hr=new Date().getHours();
  const timeLabel=hr<12?'Morning':hr<17?'Afternoon':'Night';

  return `
    <div style="display:flex;gap:10px;margin-bottom:10px;">
      <button onclick="toggleCreatine()" class="supp-toggle${creatineOn?' on':''}" style="flex:1;">
        <span class="supp-check">${creatineOn?'✓':''}</span>
        <span class="supp-label">Creatine</span>
        <span class="supp-dose" onclick="event.stopPropagation();adjustCreatine()">${dose}g</span>
        <span class="supp-week">${crWeek}/7 this week</span>
      </button>
      <div class="supp-toggle${allVitsOn?' on':''}" style="flex:1;" onclick="toggleAllVitamins()">
        <span class="supp-check">${allVitsOn?'✓':vitsTaken>0?vitsTaken+'/'+vitList.length:''}</span>
        <span class="supp-label">Vitamins</span>
        <div class="supp-vit-list">
          ${vitList.map(v=>{
            const on=typeof entry.vitamins==='object'&&entry.vitamins[v];
            const safe=v.replace(/"/g,'&quot;');
            return `<span class="supp-vit-chip${on?' on':''}" onclick="event.stopPropagation();toggleVitamin(&quot;${safe}&quot;)">${v}</span>`;
          }).join('')}
        </div>
        <span class="supp-week">${vitWeek}/7 this week</span>
        <span class="supp-edit-vits" onclick="event.stopPropagation();openVitaminSettings()">edit</span>
      </div>
    </div>
    <div class="supp-weighin" onclick="openWeighIn()">
      <span class="supp-weighin-icon">⚖️</span>
      ${todayBW
        ?`<span class="supp-weighin-val">${todayBW.weight} lbs</span><span class="supp-weighin-time">${todayBW.timeOfDay||timeLabel.toLowerCase()}</span>`
        :`<span class="supp-weighin-prompt">Weigh in · ${timeLabel}</span>`
      }
    </div>`;
}

// ═══════════════════════════════════════════
// DAILY CHECK-IN — Merged supplements + cardio + weigh-in
// ═══════════════════════════════════════════
export function renderDailyCheckin(){
  const state=_state();
  const entry=ensureTodaySupp();
  const creatineOn=entry.creatine>0;
  const dose=entry.creatineDose||5;
  const crWeek=suppWeekCount('creatine');
  const vitList=getVitaminList();
  const vitsTaken=typeof entry.vitamins==='object'?vitList.filter(v=>entry.vitamins[v]).length:0;
  const allVitsOn=vitsTaken===vitList.length;
  const todayBW=(state.bodyweight||[]).find(b=>b.date===today());

  const waterOz=entry.waterOz||0;

  // Build status indicators
  const items=[];
  items.push(creatineOn?'✓ Creatine':'Creatine');
  items.push(allVitsOn?'✓ Vitamins':vitsTaken>0?vitsTaken+'/'+vitList.length+' Vitamins':'Vitamins');
  items.push(todayBW?'✓ '+todayBW.weight+'lb':'Weigh-in');
  items.push(waterOz>0?'💧'+waterOz+'oz':'Water');
  const allDone=creatineOn&&allVitsOn&&todayBW;
  const subtitle=items.join(' · ');

  return `<button onclick="openDailyCheckin()" style="width:100%;background:${allDone?'rgba(82,200,122,0.06)':'var(--bg2)'};border:1px solid ${allDone?'rgba(82,200,122,0.2)':'var(--border2)'};border-radius:14px;padding:12px 14px;margin-bottom:10px;cursor:pointer;text-align:left;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
      <div style="font-size:9px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;">Daily Check-in</div>
      <span style="font-size:12px;color:var(--dim);">›</span>
    </div>
    <div style="font-size:11px;color:${allDone?'var(--green)':'var(--dim)'};">${subtitle}</div>
  </button>`;
}
export function openDailyCheckin(){
  const state=_state();
  const entry=ensureTodaySupp();
  const creatineOn=entry.creatine>0;
  const dose=entry.creatineDose||5;
  const crWeek=suppWeekCount('creatine');
  const vitList=getVitaminList();
  const vitsTaken=typeof entry.vitamins==='object'?vitList.filter(v=>entry.vitamins[v]).length:0;
  const allVitsOn=vitsTaken===vitList.length;
  const todayBW=(state.bodyweight||[]).find(b=>b.date===today());
  const last=state.bodyweight&&state.bodyweight[0]?state.bodyweight[0].weight:'';

  const waterOz=entry.waterOz||0;
  const allergyOn=typeof entry.vitamins==='object'&&entry.vitamins['Allergy Pill'];

  _showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:16px;">DAILY CHECK-IN</div>

    <div style="display:flex;gap:8px;margin-bottom:10px;overflow:hidden;">
      <div style="flex:1;min-width:0;background:${creatineOn?'rgba(82,200,122,0.12)':'#0f0f12'};border:1px solid ${creatineOn?'rgba(82,200,122,0.3)':'#1e1e24'};border-radius:10px;padding:10px 6px;text-align:center;">
        <div style="display:flex;align-items:center;justify-content:center;gap:4px;">
          <button onclick="adjustCreatineDose(-2.5);openDailyCheckin();" style="background:none;border:1px solid #1e1e24;border-radius:6px;width:24px;height:24px;color:var(--muted);font-size:14px;cursor:pointer;">−</button>
          <button onclick="toggleCreatine();openDailyCheckin();" style="background:none;border:none;cursor:pointer;">
            <div style="font-size:14px;font-weight:700;color:${creatineOn?'var(--green)':'var(--dim)'};">${creatineOn?'✓':''} ${dose}g</div>
          </button>
          <button onclick="adjustCreatineDose(2.5);openDailyCheckin();" style="background:none;border:1px solid #1e1e24;border-radius:6px;width:24px;height:24px;color:var(--muted);font-size:14px;cursor:pointer;">+</button>
        </div>
        <div style="font-size:7px;color:var(--muted);margin-top:3px;">CREATINE</div>
      </div>
      <div style="flex:1;min-width:0;background:#0f0f12;border:1px solid #1e1e24;border-radius:10px;padding:10px 6px;text-align:center;">
        <div style="display:flex;align-items:center;justify-content:center;gap:4px;">
          <button onclick="removeWaterCheckin();openDailyCheckin();" style="background:none;border:1px solid #1e1e24;border-radius:6px;width:24px;height:24px;color:var(--muted);font-size:14px;cursor:pointer;">−</button>
          <div style="font-size:14px;font-weight:700;color:${waterOz>=(state.waterGoal||100)?'var(--green)':'var(--accent)'};">💧${waterOz}</div>
          <button onclick="addWaterCheckin(8);openDailyCheckin();" style="background:none;border:1px solid #1e1e24;border-radius:6px;width:24px;height:24px;color:var(--muted);font-size:14px;cursor:pointer;">+</button>
        </div>
        <div style="font-size:7px;color:var(--muted);margin-top:3px;">${waterOz>=(state.waterGoal||100)?'✓ GOAL':'/'+(state.waterGoal||100)+'oz'}</div>
      </div>
    </div>

    <div style="margin-bottom:10px;">
      <div style="font-size:9px;color:var(--dim);margin-bottom:6px;letter-spacing:1px;">SUPPLEMENTS · ${vitsTaken}/${vitList.length}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${vitList.map(v=>{
          const on=typeof entry.vitamins==='object'&&entry.vitamins[v];
          const safe=v.replace(/'/g,"\\'");
          return `<button onclick="toggleVitamin('${safe}');openDailyCheckin();" style="background:${on?'rgba(82,200,122,0.12)':'#0f0f12'};border:1px solid ${on?'rgba(82,200,122,0.3)':'#1e1e24'};border-radius:8px;padding:6px 10px;cursor:pointer;">
            <span style="font-size:11px;color:${on?'var(--green)':'var(--dim)'};">${on?'✓ ':''}${v}</span>
          </button>`;
        }).join('')}
      </div>
    </div>

    <div style="margin-bottom:14px;">
      <div style="font-size:9px;color:var(--dim);margin-bottom:6px;">WEIGH IN${todayBW?' · logged '+todayBW.weight+'lb':''}</div>
      <div style="display:flex;gap:8px;align-items:center;">
        <input id="bw-inp" type="number" class="input" placeholder="${last||'185'}" value="" step="0.1"
          style="flex:1;text-align:center;font-family:'Bebas Neue',sans-serif;font-size:28px;"
          inputmode="decimal"/>
        <span style="font-size:12px;color:var(--dim);">lbs</span>
        <button class="btn primary small" onclick="const v=document.getElementById('bw-inp').value;if(v){logBW(v);openDailyCheckin();}">LOG</button>
      </div>
    </div>

    <div style="display:flex;gap:8px;">
      <button class="btn ghost" onclick="hideModal();render();" style="flex:3;">DONE</button>
      <button class="btn ghost" onclick="openCheckinSettings();" style="flex:1;color:var(--dim);">⚙</button>
    </div>
  `);
  setTimeout(()=>{const i=document.getElementById('bw-inp');if(i&&!todayBW)i.focus();},100);
}
export function openCheckinSettings(){
  const state=_state();
  const waterGoal=state.waterGoal||100;
  const creatineDose=(getTodaySupp()||{}).creatineDose||state._creatineDose||5;
  const vitList=getVitaminList();

  _showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:16px;">DAILY GOALS</div>

    <div style="margin-bottom:14px;">
      <div style="font-size:9px;color:var(--dim);margin-bottom:4px;letter-spacing:1px;">WATER GOAL (oz)</div>
      <input id="goal-water" type="number" class="input" value="${waterGoal}" inputmode="numeric" style="text-align:center;font-size:18px;"/>
    </div>

    <div style="margin-bottom:14px;">
      <div style="font-size:9px;color:var(--dim);margin-bottom:4px;letter-spacing:1px;">CREATINE DOSE (g)</div>
      <input id="goal-creatine" type="number" class="input" value="${creatineDose}" inputmode="decimal" step="2.5" style="text-align:center;font-size:18px;"/>
    </div>

    <div style="margin-bottom:14px;">
      <div style="font-size:9px;color:var(--dim);margin-bottom:4px;letter-spacing:1px;">MY SUPPLEMENTS</div>
      <div style="font-size:10px;color:var(--dim);margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;">Current: ${vitList.join(', ')}</div>
      <input id="goal-vits" class="input" value="${vitList.join(', ')}" placeholder="Vitamin D, Zinc, Fish Oil..." style="font-size:12px;width:100%;box-sizing:border-box;"/>
      <div style="font-size:8px;color:var(--dim);margin-top:4px;">Separate with commas</div>
    </div>

    <button class="btn primary" onclick="saveCheckinSettings()" style="width:100%;">SAVE</button>
    <button class="btn ghost" onclick="openDailyCheckin();" style="width:100%;margin-top:8px;">BACK</button>
  `);
}
export function saveCheckinSettings(){
  const state=_state();
  const water=parseInt(document.getElementById('goal-water')?.value)||100;
  const creatine=parseFloat(document.getElementById('goal-creatine')?.value)||5;
  const vitsRaw=document.getElementById('goal-vits')?.value||'';
  const vits=vitsRaw.split(',').map(v=>v.trim()).filter(v=>v.length>0);

  state.waterGoal=water;
  const entry=ensureTodaySupp();
  entry.creatineDose=Math.max(2.5,Math.min(20,Math.round(creatine/2.5)*2.5));
  if(entry.creatine>0) entry.creatine=entry.creatineDose;
  if(vits.length) state.vitaminTypes=vits;

  _saveImmediate();
  _hideModal();
  showToast('Goals saved');
  _render();
}

// ═══════════════════════════════════════════
// CARDIO — Quick cardio logging
// ═══════════════════════════════════════════
export const CARDIO_TYPES=['Run','Walk','Bike','Swim','Rowing','Elliptical','Stair Climber','Jump Rope','Hike','Sport'];

export function getTodayCardio(){
  const state=_state();
  if(!state.cardio) state.cardio=[];
  return state.cardio.filter(c=>c.date===today());
}
export function openCardioLog(){
  _showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:14px;">LOG CARDIO</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">
      ${CARDIO_TYPES.map(t=>`<button class="btn ghost small" onclick="document.getElementById('cardio-type').value='${t}';document.querySelectorAll('.cardio-type-btn').forEach(b=>b.style.borderColor='');this.style.borderColor='var(--accent)'" class="cardio-type-btn" style="font-size:11px;padding:6px 10px;">${t}</button>`).join('')}
    </div>
    <input id="cardio-type" class="input" placeholder="Activity" style="margin-bottom:10px;font-size:14px;" value="Run"/>
    <div style="display:flex;gap:10px;margin-bottom:10px;">
      <div style="flex:1;">
        <div style="font-size:9px;color:var(--dim);margin-bottom:4px;">Minutes</div>
        <input id="cardio-min" type="number" inputmode="numeric" class="input" placeholder="30" style="font-size:16px;text-align:center;"/>
      </div>
      <div style="flex:1;">
        <div style="font-size:9px;color:var(--dim);margin-bottom:4px;">Distance (mi)</div>
        <input id="cardio-dist" type="number" inputmode="decimal" class="input" placeholder="optional" style="font-size:16px;text-align:center;"/>
      </div>
    </div>
    <div style="margin-bottom:14px;">
      <div style="font-size:9px;color:var(--dim);margin-bottom:4px;">Notes (optional)</div>
      <input id="cardio-notes" class="input" placeholder="How'd it feel?" style="font-size:13px;"/>
    </div>
    <button class="btn primary" onclick="saveCardio()">LOG CARDIO</button>
    <button class="btn ghost" onclick="hideModal()" style="margin-top:8px;">CANCEL</button>
  `);
  setTimeout(()=>{const el=document.getElementById('cardio-min');if(el)el.focus();},100);
}
export function saveCardio(){
  const state=_state();
  const type=(document.getElementById('cardio-type')?.value||'').trim()||'Cardio';
  const mins=parseInt(document.getElementById('cardio-min')?.value)||0;
  const dist=parseFloat(document.getElementById('cardio-dist')?.value)||0;
  const notes=(document.getElementById('cardio-notes')?.value||'').trim();
  if(!mins){showToast('Enter how many minutes');return;}
  if(!state.cardio) state.cardio=[];
  state.cardio.unshift({
    date:today(),timestamp:Date.now(),
    type,minutes:mins,distance:dist||null,notes:notes||null
  });
  if(state.cardio.length>200) state.cardio=state.cardio.slice(0,200);
  _saveAndSync();
  _hideModal();
  haptic('light');
  showToast(type+' logged — '+mins+' min');
  _render();
}
export function deleteCardio(idx){
  const state=_state();
  if(!state.cardio) return;
  state.cardio.splice(idx,1);
  _saveImmediate(); _render();
}
export function renderCardioCard(){
  const state=_state();
  const todayEntries=getTodayCardio();
  const weekStart=new Date(); weekStart.setDate(weekStart.getDate()-weekStart.getDay()); weekStart.setHours(0,0,0,0);
  const weekCardio=(state.cardio||[]).filter(c=>new Date(c.timestamp)>=weekStart);
  const weekMins=weekCardio.reduce((a,c)=>a+c.minutes,0);

  return `<div style="background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:12px 14px;margin-bottom:10px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${todayEntries.length?'8':'0'}px;">
      <div style="font-size:9px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;">Cardio${weekMins>0?' · '+weekMins+' min this week':''}</div>
      <button onclick="openCardioLog()" style="background:none;border:1px solid var(--border2);border-radius:8px;padding:4px 10px;color:var(--accent);font-size:10px;font-family:'DM Sans',sans-serif;cursor:pointer;letter-spacing:1px;">+ LOG</button>
    </div>
    ${todayEntries.map((c,i)=>{
      const globalIdx=(state.cardio||[]).indexOf(c);
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;${i>0?'border-top:1px solid var(--border);':''}">
        <span style="font-size:12px;color:var(--text);">${c.type} · ${c.minutes} min${c.distance?' · '+c.distance+' mi':''}</span>
        <button onclick="deleteCardio(${globalIdx})" style="background:none;border:none;color:var(--dim);font-size:10px;cursor:pointer;">✕</button>
      </div>`;
    }).join('')}
  </div>`;
}
