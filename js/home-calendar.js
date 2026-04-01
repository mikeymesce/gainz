// ═══════════════════════════════════════════
// HOME CALENDAR — Calendar widget for home screen
// ═══════════════════════════════════════════
import { showToast, haptic } from './utils.js';

// ── Module-level state ──
let homeCalOpen = false;
let homeCalMonth = new Date().getMonth();
let homeCalYear = new Date().getFullYear();

Object.defineProperty(window, 'homeCalOpen', {
  get() { return homeCalOpen; }, set(v) { homeCalOpen = v; }, configurable: true
});
Object.defineProperty(window, 'homeCalMonth', {
  get() { return homeCalMonth; }, set(v) { homeCalMonth = v; }, configurable: true
});
Object.defineProperty(window, 'homeCalYear', {
  get() { return homeCalYear; }, set(v) { homeCalYear = v; }, configurable: true
});

function _state() { return window.state; }
function _saveAndSync() { window.saveAndSync(); }
function _showModal(h) { window.showModal(h); }
function _hideModal() { window.hideModal(); }
function _render() { window.render(); }
function _splitName(s) { return window.splitName(s); }

export function toggleHomeCal(){
  homeCalOpen=!homeCalOpen;
  const el=document.getElementById('home-cal');
  const arrow=document.getElementById('cal-arrow');
  if(el){
    if(homeCalOpen){
      el.innerHTML=buildHomeCalInner();
      el.style.maxHeight=el.scrollHeight+'px';
      el.style.opacity='1';
      el.style.marginTop='8px';
      el.style.marginBottom='12px';
      el.style.padding='16px';
    } else {
      el.style.maxHeight='0';
      el.style.opacity='0';
      el.style.marginTop='0';
      el.style.marginBottom='0';
      el.style.padding='0 16px';
    }
    if(arrow) arrow.textContent=homeCalOpen?'▲':'▼';
  }
}
export function homeCalNav(dir){
  homeCalMonth+=dir;
  if(homeCalMonth>11){homeCalMonth=0;homeCalYear++;}
  if(homeCalMonth<0){homeCalMonth=11;homeCalYear--;}
  const el=document.getElementById('home-cal');
  if(el){ el.innerHTML=buildHomeCalInner(); el.style.maxHeight=el.scrollHeight+'px'; }
}

function _calDateStr(year,month,day){
  return new Date(year,month,day).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
}
function _calGetSupp(year,month,day){
  const dateStr=_calDateStr(year,month,day);
  return (_state().supplements||[]).find(s=>s.date===dateStr);
}
function _calGetBW(year,month,day){
  const dateStr=_calDateStr(year,month,day);
  const entries=(_state().bodyweight||[]).filter(b=>b.date===dateStr);
  if(!entries.length) return null;
  const avg=entries.reduce((a,b)=>a+b.weight,0)/entries.length;
  return Math.round(avg*10)/10;
}
export function openCalDay(day){
  const state=_state();
  const dateStr=_calDateStr(homeCalYear,homeCalMonth,day);
  const wo=(state.workouts||[]).filter(w=>{const d=new Date(w.timestamp);return d.getDate()===day&&d.getMonth()===homeCalMonth&&d.getFullYear()===homeCalYear;});
  const supp=_calGetSupp(homeCalYear,homeCalMonth,day);
  const bwAvg=_calGetBW(homeCalYear,homeCalMonth,day);
  const hadCreatine=supp&&supp.creatine>0;
  const isFuture=new Date(homeCalYear,homeCalMonth,day)>new Date();

  let content=`<div style="font-family:'Bebas Neue',sans-serif;font-size:24px;color:var(--text);margin-bottom:14px;">${dateStr}</div>`;

  if(wo.length){
    content+=wo.map(w=>{
      const wIdx=state.workouts.indexOf(w);
      return `<div onclick="openCalWorkout(${wIdx})" style="background:rgba(232,213,160,0.08);border:1px solid rgba(232,213,160,0.2);border-radius:10px;padding:10px 12px;margin-bottom:8px;cursor:pointer;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="font-size:13px;color:var(--accent);font-weight:600;">${_splitName(w.split)} Day</div>
        <span style="font-size:10px;color:var(--dim);">tap to view/edit ›</span>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px;">${w.exercises.length} exercises · ${w.totalVolume?w.totalVolume.toLocaleString()+'lb':''}${w.duration?' · '+Math.round(w.duration/60000)+'min':''}</div>
    </div>`;
    }).join('');
  } else if(!isFuture){
    content+=`<div style="font-size:12px;color:var(--dim);margin-bottom:8px;">Rest day</div>`;
  }

  const dayCardio=(state.cardio||[]).filter(c=>{const d=new Date(c.timestamp);return d.getDate()===day&&d.getMonth()===homeCalMonth&&d.getFullYear()===homeCalYear;});
  if(dayCardio.length){
    content+=dayCardio.map(c=>`<div style="background:rgba(82,200,122,0.08);border:1px solid rgba(82,200,122,0.2);border-radius:10px;padding:8px 12px;margin-bottom:8px;">
      <span style="font-size:12px;color:var(--green);">${c.type} · ${c.minutes} min${c.distance?' · '+c.distance+' mi':''}</span>
    </div>`).join('');
  }

  if(!isFuture){
    content+=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
      <span style="font-size:12px;color:var(--muted);">⚖️</span>
      <input id="cal-bw-edit" type="number" class="input" inputmode="decimal" step="0.1"
        value="${bwAvg||''}" placeholder="Weight (lb)"
        style="flex:1;font-size:14px;text-align:center;padding:6px;"/>
      <button onclick="saveCalBW(${homeCalYear},${homeCalMonth},${day})" class="btn primary small" style="padding:6px 10px;">${bwAvg?'UPDATE':'LOG'}</button>
    </div>`;
  } else if(bwAvg){
    content+=`<div style="font-size:12px;color:var(--muted);margin-bottom:10px;">Scale: <span style="color:var(--text);font-weight:600;">${bwAvg} lb</span></div>`;
  }

  if(!isFuture){
    const waterOz=supp&&supp.waterOz?supp.waterOz:0;
    const vitList=window.getVitaminList();
    const vitsTaken=supp&&typeof supp.vitamins==='object'?vitList.filter(v=>supp.vitamins[v]).length:0;

    content+=`<div style="border-top:1px solid #1e1e24;margin-top:6px;padding-top:10px;">
      <div style="font-size:9px;letter-spacing:1.5px;color:var(--muted);margin-bottom:8px;">DAILY TRACKING</div>
      <div style="display:flex;gap:8px;margin-bottom:8px;">
        <div style="flex:1;min-width:0;background:${hadCreatine?'rgba(82,200,122,0.12)':'#0f0f12'};border:1px solid ${hadCreatine?'rgba(82,200,122,0.3)':'#1e1e24'};border-radius:8px;padding:8px;text-align:center;">
          <div style="display:flex;align-items:center;justify-content:center;gap:4px;">
            <button onclick="adjustCalCreatine(${homeCalYear},${homeCalMonth},${day},-2.5)" style="background:none;border:1px solid #1e1e24;border-radius:6px;width:24px;height:24px;color:var(--muted);font-size:14px;cursor:pointer;">−</button>
            <button onclick="toggleCalCreatine(${homeCalYear},${homeCalMonth},${day})" style="background:none;border:none;cursor:pointer;">
              <span style="font-size:13px;font-weight:700;color:${hadCreatine?'var(--green)':'var(--dim)'};">${hadCreatine?'✓ '+(supp.creatine)+'g':'0g'}</span>
            </button>
            <button onclick="adjustCalCreatine(${homeCalYear},${homeCalMonth},${day},2.5)" style="background:none;border:1px solid #1e1e24;border-radius:6px;width:24px;height:24px;color:var(--muted);font-size:14px;cursor:pointer;">+</button>
          </div>
          <div style="font-size:7px;color:var(--muted);margin-top:2px;">CREATINE</div>
        </div>
        <div style="flex:1;min-width:0;background:#0f0f12;border:1px solid #1e1e24;border-radius:8px;padding:8px;text-align:center;">
          <div style="display:flex;align-items:center;justify-content:center;gap:4px;">
            <button onclick="adjustCalWater(${homeCalYear},${homeCalMonth},${day},-8)" style="background:none;border:1px solid #1e1e24;border-radius:6px;width:24px;height:24px;color:var(--muted);font-size:14px;cursor:pointer;">−</button>
            <span style="font-size:13px;font-weight:700;color:${waterOz>=(state.waterGoal||100)?'var(--green)':'var(--accent)'};">💧${waterOz}oz</span>
            <button onclick="adjustCalWater(${homeCalYear},${homeCalMonth},${day},8)" style="background:none;border:1px solid #1e1e24;border-radius:6px;width:24px;height:24px;color:var(--muted);font-size:14px;cursor:pointer;">+</button>
          </div>
          <div style="font-size:7px;color:var(--muted);margin-top:2px;">WATER</div>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;">
        ${vitList.map(v=>{
          const on=supp&&typeof supp.vitamins==='object'&&supp.vitamins[v];
          const safe=v.replace(/'/g,"\\'");
          return `<button onclick="toggleCalVitamin(${homeCalYear},${homeCalMonth},${day},'${safe}')" style="background:${on?'rgba(82,200,122,0.12)':'#0f0f12'};border:1px solid ${on?'rgba(82,200,122,0.3)':'#1e1e24'};border-radius:6px;padding:4px 8px;cursor:pointer;">
            <span style="font-size:10px;color:${on?'var(--green)':'var(--dim)'};">${on?'✓ ':''}${v}</span>
          </button>`;
        }).join('')}
      </div>
    </div>`;
  }

  content+=`<button class="btn ghost" onclick="hideModal()" style="width:100%;margin-top:10px;">CLOSE</button>`;
  _showModal(content);
}
export function openCalWorkout(wIdx){
  const state=_state();
  const w=state.workouts[wIdx];
  if(!w) return;
  _hideModal();
  window.historyDetail=w;
  window.histEditMode=false;
  window.appScreen='me';
  _render();
}
function _ensureCalSupp(year,month,day){
  const state=_state();
  const dateStr=_calDateStr(year,month,day);
  if(!state.supplements) state.supplements=[];
  let entry=state.supplements.find(s=>s.date===dateStr);
  if(!entry){
    const dose=(state.supplements.find(s=>s.creatineDose)||{}).creatineDose||5;
    entry={date:dateStr,timestamp:new Date(year,month,day).getTime(),creatine:0,creatineDose:dose,vitamins:{},waterOz:0};
    state.supplements.unshift(entry);
  }
  if(!entry.vitamins||typeof entry.vitamins!=='object') entry.vitamins={};
  if(!entry.waterOz) entry.waterOz=0;
  return entry;
}
export function toggleCalVitamin(year,month,day,vitName){
  const entry=_ensureCalSupp(year,month,day);
  entry.vitamins[vitName]=!entry.vitamins[vitName];
  _saveAndSync();
  openCalDay(day);
  const el=document.getElementById('home-cal');
  if(el) el.innerHTML=buildHomeCalInner();
}
export function adjustCalWater(year,month,day,delta){
  const entry=_ensureCalSupp(year,month,day);
  entry.waterOz=Math.max(0,entry.waterOz+delta);
  _saveAndSync();
  openCalDay(day);
  const el=document.getElementById('home-cal');
  if(el) el.innerHTML=buildHomeCalInner();
}
export function saveCalBW(year,month,day){
  const state=_state();
  const val=parseFloat(document.getElementById('cal-bw-edit')?.value);
  if(!val||val<50||val>500){showToast('Enter a valid weight');return;}
  const dateStr=_calDateStr(year,month,day);
  if(!state.bodyweight) state.bodyweight=[];
  const existing=state.bodyweight.find(b=>b.date===dateStr);
  if(existing){ existing.weight=val; existing.timestamp=Date.now(); }
  else{
    state.bodyweight.push({date:dateStr,timestamp:new Date(year,month,day).getTime(),weight:val,timeOfDay:'edited'});
    state.bodyweight.sort((a,b)=>b.timestamp-a.timestamp);
  }
  _saveAndSync();
  showToast(val+' lb logged');
  openCalDay(day);
  const el=document.getElementById('home-cal');
  if(el) el.innerHTML=buildHomeCalInner();
}
export function adjustCalCreatine(year,month,day,delta){
  const entry=_ensureCalSupp(year,month,day);
  const newDose=Math.max(0,Math.round(((entry.creatine||0)+delta)*2)/2);
  entry.creatine=newDose;
  if(newDose>0) entry.creatineDose=newDose;
  _saveAndSync();
  openCalDay(day);
  const el=document.getElementById('home-cal');
  if(el) el.innerHTML=buildHomeCalInner();
}
export function toggleCalCreatine(year,month,day){
  const state=_state();
  const dateStr=_calDateStr(year,month,day);
  if(!state.supplements) state.supplements=[];
  let entry=state.supplements.find(s=>s.date===dateStr);
  if(!entry){
    const dose=(state.supplements.find(s=>s.creatineDose)||{}).creatineDose||5;
    entry={date:dateStr,timestamp:new Date(year,month,day).getTime(),creatine:0,creatineDose:dose,vitamins:{}};
    state.supplements.unshift(entry);
  }
  if(entry.creatine>0) entry.creatine=0;
  else entry.creatine=entry.creatineDose||5;
  _saveAndSync();
  haptic('light');
  openCalDay(day);
  const el=document.getElementById('home-cal');
  if(el) el.innerHTML=buildHomeCalInner();
}
export function buildHomeCalInner(){
  const state=_state();
  const mn=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const firstDay=new Date(homeCalYear,homeCalMonth,1).getDay();
  const daysInMonth=new Date(homeCalYear,homeCalMonth+1,0).getDate();
  const todayDate=new Date(); todayDate.setHours(0,0,0,0);

  const woDates={};
  state.workouts.forEach(w=>{
    const d=new Date(w.timestamp);
    if(d.getMonth()===homeCalMonth&&d.getFullYear()===homeCalYear){
      const key=d.getDate();
      if(!woDates[key]) woDates[key]=[];
      woDates[key].push(w);
    }
  });

  const creatineDays={};
  const bwDays={};
  for(let d=1;d<=daysInMonth;d++){
    const supp=_calGetSupp(homeCalYear,homeCalMonth,d);
    if(supp&&supp.creatine>0) creatineDays[d]=true;
    const bw=_calGetBW(homeCalYear,homeCalMonth,d);
    if(bw) bwDays[d]=bw;
  }

  const dayHeaders=['S','M','T','W','T','F','S'].map(d=>
    `<div style="font-size:9px;color:var(--dim);text-align:center;padding:4px 0;letter-spacing:1px;">${d}</div>`
  ).join('');

  const blanks=[...Array(firstDay)].map(()=>'<div></div>').join('');
  const days=[...Array(daysInMonth)].map((_,i)=>{
    const day=i+1;
    const wo=woDates[day];
    const isToday=day===todayDate.getDate()&&homeCalMonth===todayDate.getMonth()&&homeCalYear===todayDate.getFullYear();
    const hasWorkout=!!wo;
    const hasCreatine=!!creatineDays[day];
    const bw=bwDays[day];
    const bg=hasWorkout?'rgba(232,213,160,0.15)':'transparent';
    const border=isToday?'border:1px solid var(--accent);':'border:1px solid transparent;';
    const color=hasWorkout?'var(--accent)':isToday?'var(--text)':'var(--dim)';
    const woDot=hasWorkout?`<div style="width:4px;height:4px;border-radius:50%;background:var(--accent);display:inline-block;"></div>`:'';
    const crDot=hasCreatine?`<div style="width:4px;height:4px;border-radius:50%;background:#52c87a;display:inline-block;"></div>`:'';
    const dots=(woDot||crDot)?`<div style="display:flex;justify-content:center;gap:3px;margin-top:1px;">${woDot}${crDot}</div>`:'';
    const bwLabel=bw?`<div style="font-size:7px;color:var(--dim);margin-top:0;line-height:1;">${bw}</div>`:'';
    return `<div onclick="openCalDay(${day})" style="text-align:center;padding:4px 2px;border-radius:8px;background:${bg};${border}cursor:pointer;min-height:38px;" >
      <div style="font-size:12px;color:${color};font-weight:${hasWorkout?'600':'400'};">${day}</div>
      ${dots}
      ${bwLabel}
    </div>`;
  }).join('');

  const woCount=Object.keys(woDates).length;
  const crCount=Object.keys(creatineDays).length;
  const isCurrentMonth=homeCalMonth===new Date().getMonth()&&homeCalYear===new Date().getFullYear();

  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <button onclick="homeCalNav(-1)" style="background:none;border:none;color:var(--muted);font-size:16px;cursor:pointer;padding:4px 8px;">‹</button>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:18px;color:var(--text);letter-spacing:1px;">${mn[homeCalMonth]} ${homeCalYear}</div>
      <button onclick="homeCalNav(1)" style="background:none;border:none;color:var(--muted);font-size:16px;cursor:pointer;padding:4px 8px;">${isCurrentMonth?'':'›'}</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;">
      ${dayHeaders}${blanks}${days}
    </div>
    <div style="display:flex;justify-content:center;gap:12px;margin-top:10px;font-size:10px;color:var(--muted);">
      <span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent);vertical-align:middle;"></span> ${woCount} workout${woCount!==1?'s':''}</span>
      <span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#52c87a;vertical-align:middle;"></span> ${crCount} creatine</span>
    </div>`;
}

export function buildHomeCal(){
  const openStyle=homeCalOpen?'max-height:400px;opacity:1;padding:16px;margin-top:8px;margin-bottom:12px;':'max-height:0;opacity:0;padding:0 16px;margin-top:0;margin-bottom:0;';
  return `<div id="home-cal" style="background:var(--bg2);border:1px solid var(--border2);border-radius:14px;overflow:hidden;transition:max-height 0.35s cubic-bezier(0.25,1,0.5,1),opacity 0.3s ease,padding 0.35s ease,margin 0.35s ease;${openStyle}">
    ${homeCalOpen?buildHomeCalInner():''}
  </div>`;
}
