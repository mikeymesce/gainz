// ═══════════════════════════════════════════
// BREAK FREE — Weight loss + calorie tracker
// "your body. your goal."
// ═══════════════════════════════════════════

const STORAGE_KEY = 'breakfree_data';

let state = loadState();
let screen = 'home';
let calMonth = new Date().getMonth();
let calYear = new Date().getFullYear();

function defaultState(){
  return {
    goalStart: 135,
    goalTarget: 115,
    entries: [],       // weigh-ins: {date, timestamp, weight}
    days: [],          // daily logs: {date, timestamp, meals:[], caloriesIn, caloriesBurned}
    streak: 0,
    lastWeighDate: null,
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
  const el=document.createElement('div'); el.className='toast'; el.textContent=msg;
  document.body.appendChild(el);
  requestAnimationFrame(()=>el.style.opacity='1');
  setTimeout(()=>{el.style.opacity='0';setTimeout(()=>el.remove(),200);},2500);
}
function showModal(html){
  document.getElementById('modal-inner').innerHTML=html;
  document.getElementById('modal').classList.add('open');
}
function hideModal(){ document.getElementById('modal').classList.remove('open'); }

// ── Splash ──
function dismissSplash(){
  const el=document.getElementById('splash'); if(!el) return;
  el.classList.add('fade-out');
  setTimeout(()=>{el.style.display='none';},500);
  localStorage.setItem('breakfree_seen_intro','1');
}
function saveSetupAndStart(){
  const start=parseFloat(document.getElementById('setup-start')?.value)||state.goalStart;
  const current=parseFloat(document.getElementById('setup-current')?.value);
  const goal=parseFloat(document.getElementById('setup-goal')?.value)||state.goalTarget;
  state.goalStart=start;
  state.goalTarget=goal;
  if(current&&current>=50&&current<=500){
    logWeight(current);
  }
  save();
  dismissSplash();
  render();
}
// Splash always stays until tapped — no auto-dismiss

// ── Day helpers ──
function getToday(){
  if(!state.days) state.days=[];
  let day=state.days.find(d=>d.date===today());
  if(!day){
    day={date:today(),timestamp:Date.now(),meals:[],caloriesIn:0,caloriesBurned:0};
    state.days.unshift(day);
  }
  return day;
}

function getTodayWeight(){
  return (state.entries||[]).find(e=>e.date===today());
}

// ── Weigh in ──
function logWeight(val){
  const weight=parseFloat(val);
  if(!weight||weight<50||weight>500){showToast('Enter a valid weight');return;}
  const existing=state.entries.find(e=>e.date===today());
  if(existing){ existing.weight=weight; existing.timestamp=Date.now(); }
  else{ state.entries.unshift({date:today(),timestamp:Date.now(),weight}); }
  if(state.entries.length>365) state.entries=state.entries.slice(0,365);
  // Streak
  if(state.lastWeighDate!==todayStr()){
    const y=new Date(); y.setDate(y.getDate()-1);
    state.streak=state.lastWeighDate===y.toDateString()?state.streak+1:1;
    state.lastWeighDate=todayStr();
  }
  save(); showToast(weight+' lb logged'); render();
}

// ── Meals ──
function addMeal(name,calories){
  const cal=parseInt(calories);
  if(!name||!cal){showToast('Enter meal and calories');return;}
  const day=getToday();
  day.meals.push({name,calories:cal,time:Date.now()});
  day.caloriesIn=day.meals.reduce((a,m)=>a+m.calories,0);
  save(); render();
}

function deleteMeal(idx){
  const day=getToday();
  day.meals.splice(idx,1);
  day.caloriesIn=day.meals.reduce((a,m)=>a+m.calories,0);
  save(); render();
}

function setBurned(val){
  const day=getToday();
  day.caloriesBurned=parseInt(val)||0;
  save(); render();
}

// ── ChatGPT prompt ──
const GPT_PROMPT = `Hey! You are my calorie tracker. I'm going to tell you exactly what I ate — please calculate the calories for each item. Be as accurate as possible based on typical serving sizes.

My daily calorie goal is to stay under 1,400 calories, especially on rest days when I don't work out. On days I exercise I have a little more room. If I'm getting close to the limit, give me a heads up at the bottom like "⚠️ You're at X total so far today — X left to stay under 1,400" but ONLY after the food list.

IMPORTANT: I'm copying the food list directly into my calorie tracking app. The food list MUST be in this exact format:

FOOD NAME | NUMBER

Rules:
- One item per line
- Use a | between the food name and the calorie number
- The number should be JUST the number, no "cal" or "kcal" after it
- Round to the nearest 10
- No totals, no explanations, no extra text in the food list
- If I give you multiple items, list each one separately

Example of EXACTLY what the food list should look like:
Chicken caesar salad | 520
Iced oat milk latte | 170
Two scrambled eggs with cheese | 280

Here's what I had:`;

function copyPrompt(){
  navigator.clipboard.writeText(GPT_PROMPT).then(()=>{
    showToast('Prompt copied — paste into ChatGPT');
  }).catch(()=>{
    // Fallback
    const ta=document.createElement('textarea');
    ta.value=GPT_PROMPT;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast('Prompt copied — paste into ChatGPT');
  });
}

function openPasteResult(){
  showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:6px;">PASTE CHATGPT RESULT</div>
    <div style="font-size:10px;color:var(--dim);margin-bottom:12px;">Paste the "MEAL | CALORIES" lines from ChatGPT</div>
    <textarea id="gpt-result" class="input" rows="5" placeholder="Grilled chicken salad | 450\nRice and beans | 380" style="margin-bottom:14px;"></textarea>
    <button class="btn primary" style="width:100%;" onclick="parseGptResult()">ADD MEALS</button>
    <button class="btn ghost" style="width:100%;margin-top:8px;" onclick="hideModal()">CANCEL</button>
  `);
}

function parseGptResult(){
  const raw=document.getElementById('gpt-result')?.value||'';
  const lines=raw.split('\n').filter(l=>l.includes('|'));
  let added=0;
  lines.forEach(line=>{
    const parts=line.split('|').map(s=>s.trim());
    if(parts.length>=2){
      const name=parts[0];
      const cal=parseInt(parts[1]);
      if(name&&cal>0){ addMeal(name,cal); added++; }
    }
  });
  hideModal();
  if(added) showToast(added+' meal'+(added>1?'s':'')+' added');
  else showToast('No meals found — check the format');
}

// ── Calendar helpers ──
function _calDateStr(y,m,d){
  return new Date(y,m,d).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
}
function _calGetDay(y,m,d){
  const ds=_calDateStr(y,m,d);
  return (state.days||[]).find(day=>day.date===ds);
}
function _calGetWeight(y,m,d){
  const ds=_calDateStr(y,m,d);
  return (state.entries||[]).find(e=>e.date===ds);
}
function calNav(dir){
  calMonth+=dir;
  if(calMonth>11){calMonth=0;calYear++;}
  if(calMonth<0){calMonth=11;calYear--;}
  render();
}
function openCalDay(day){
  const dateStr=_calDateStr(calYear,calMonth,day);
  const dayData=_calGetDay(calYear,calMonth,day);
  const weightData=_calGetWeight(calYear,calMonth,day);
  const isFuture=new Date(calYear,calMonth,day)>new Date();
  if(isFuture) return;

  const meals=dayData&&dayData.meals?dayData.meals:[];
  const calIn=dayData?dayData.caloriesIn||0:0;
  const calBurn=dayData?dayData.caloriesBurned||0:0;
  const net=calIn-calBurn;

  const mealRows=meals.map((m,i)=>`
    <div class="meal-card">
      <div style="font-size:12px;color:var(--text);">${m.name}</div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="font-size:14px;color:var(--accent);font-weight:600;">${m.calories}</span>
        <button onclick="deleteCalMeal('${dateStr}',${i})" style="background:none;border:none;color:var(--dim);font-size:9px;cursor:pointer;">✕</button>
      </div>
    </div>`).join('');

  showModal(`
    <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--text);margin-bottom:4px;">${dateStr}</div>

    ${weightData?`<div style="font-size:12px;color:var(--accent);margin-bottom:12px;">⚖️ ${weightData.weight} lb</div>`
    :`<div style="margin-bottom:12px;">
      <div style="display:flex;gap:8px;align-items:center;">
        <input id="cal-bw" class="input" type="number" inputmode="decimal" placeholder="Weight (lb)" style="flex:1;font-size:14px;text-align:center;" step="0.1"/>
        <button class="btn primary small" onclick="logCalWeight('${dateStr}',${calYear},${calMonth},${day})">LOG</button>
      </div>
    </div>`}

    <div style="display:flex;gap:8px;margin-bottom:12px;">
      <div style="flex:1;background:var(--bg3);border-radius:10px;padding:8px;text-align:center;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;color:var(--accent);">${calIn}</div>
        <div style="font-size:7px;color:var(--dim);letter-spacing:1px;">EATEN</div>
      </div>
      <div style="flex:1;background:var(--bg3);border-radius:10px;padding:8px;text-align:center;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;color:var(--green);">${calBurn}</div>
        <div style="font-size:7px;color:var(--dim);letter-spacing:1px;">BURNED</div>
      </div>
      <div style="flex:1;background:var(--bg3);border-radius:10px;padding:8px;text-align:center;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;color:var(--text);">${net}</div>
        <div style="font-size:7px;color:var(--dim);letter-spacing:1px;">NET</div>
      </div>
    </div>

    ${meals.length?`<div style="font-size:8px;letter-spacing:2px;color:var(--muted);margin-bottom:6px;">MEALS</div>${mealRows}`
    :'<div style="font-size:11px;color:var(--dim);margin-bottom:8px;">No meals logged</div>'}

    <div style="display:flex;gap:8px;margin-top:10px;">
      <button class="btn ghost small" style="flex:1;" onclick="hideModal();addCalMeal('${dateStr}',${calYear},${calMonth},${day})">+ ADD MEAL</button>
      <button class="btn ghost small" style="flex:1;" onclick="hideModal();editCalBurned('${dateStr}',${calYear},${calMonth},${day},${calBurn})">🔥 BURNED</button>
    </div>

    <button class="btn ghost" style="width:100%;margin-top:10px;" onclick="hideModal()">CLOSE</button>
  `);
}
function addCalMeal(dateStr,y,m,d){
  showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:14px;">ADD MEAL — ${dateStr}</div>
    <input id="cm-name" class="input" placeholder="What was eaten?" style="margin-bottom:8px;"/>
    <input id="cm-cal" class="input" type="number" inputmode="numeric" placeholder="Calories" style="margin-bottom:14px;"/>
    <button class="btn primary" style="width:100%;" onclick="saveCalMeal('${dateStr}',${y},${m},${d})">ADD</button>
    <button class="btn ghost" style="width:100%;margin-top:8px;" onclick="hideModal();openCalDay(${d})">BACK</button>
  `);
}
function saveCalMeal(dateStr,y,m,d){
  const name=document.getElementById('cm-name')?.value?.trim();
  const cal=parseInt(document.getElementById('cm-cal')?.value);
  if(!name||!cal){showToast('Enter meal and calories');return;}
  if(!state.days) state.days=[];
  let day=state.days.find(dd=>dd.date===dateStr);
  if(!day){
    day={date:dateStr,timestamp:new Date(y,m,d).getTime(),meals:[],caloriesIn:0,caloriesBurned:0};
    state.days.push(day);
    state.days.sort((a,b)=>b.timestamp-a.timestamp);
  }
  day.meals.push({name,calories:cal,time:Date.now()});
  day.caloriesIn=day.meals.reduce((a,mm)=>a+mm.calories,0);
  save(); hideModal(); openCalDay(d);
}
function deleteCalMeal(dateStr,idx){
  const day=(state.days||[]).find(dd=>dd.date===dateStr);
  if(!day) return;
  day.meals.splice(idx,1);
  day.caloriesIn=day.meals.reduce((a,mm)=>a+mm.calories,0);
  save(); hideModal();
  // Re-derive day number from dateStr to reopen
  render();
}
function editCalBurned(dateStr,y,m,d,current){
  showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:14px;">CALORIES BURNED — ${dateStr}</div>
    <input id="cb-inp" class="input" type="number" inputmode="numeric" value="${current||''}" placeholder="0"
      style="text-align:center;font-family:'Bebas Neue',sans-serif;font-size:32px;margin-bottom:14px;"/>
    <button class="btn primary" style="width:100%;" onclick="saveCalBurned('${dateStr}',${y},${m},${d})">SAVE</button>
    <button class="btn ghost" style="width:100%;margin-top:8px;" onclick="hideModal();openCalDay(${d})">BACK</button>
  `);
}
function saveCalBurned(dateStr,y,m,d){
  const val=parseInt(document.getElementById('cb-inp')?.value)||0;
  if(!state.days) state.days=[];
  let day=state.days.find(dd=>dd.date===dateStr);
  if(!day){
    day={date:dateStr,timestamp:new Date(y,m,d).getTime(),meals:[],caloriesIn:0,caloriesBurned:0};
    state.days.push(day);
    state.days.sort((a,b)=>b.timestamp-a.timestamp);
  }
  day.caloriesBurned=val;
  save(); hideModal(); openCalDay(d);
}
function logCalWeight(dateStr,y,m,d){
  const val=parseFloat(document.getElementById('cal-bw')?.value);
  if(!val||val<50||val>500){showToast('Enter a valid weight');return;}
  const existing=state.entries.find(e=>e.date===dateStr);
  if(existing){existing.weight=val;existing.timestamp=Date.now();}
  else{
    state.entries.push({date:dateStr,timestamp:new Date(y,m,d).getTime(),weight:val});
    state.entries.sort((a,b)=>b.timestamp-a.timestamp);
  }
  save(); hideModal(); openCalDay(d);
}

// ── Rendering ──
function render(){
  const c=document.getElementById('content');
  if(screen==='home') c.innerHTML=renderHome();
  else if(screen==='log') c.innerHTML=renderLog();
  else if(screen==='chart') c.innerHTML=renderChart();
  else if(screen==='settings') c.innerHTML=renderSettings();
  renderNav();
}

function renderNav(){
  const tabs=[
    ['home','◎','TODAY'],
    ['log','✚','LOG'],
    ['chart','📅','CALENDAR'],
    ['settings','⚙','MORE'],
  ];
  document.getElementById('nav').innerHTML=tabs.map(([key,icon,label])=>`
    <button class="nav-btn ${screen===key?'active':''}" onclick="screen='${key}';render()">
      <span class="icon">${icon}</span><span>${label}</span>
    </button>`).join('');
}

function renderHome(){
  const day=getToday();
  const todayW=getTodayWeight();
  const greeting=new Date().getHours()<12?'Good morning':new Date().getHours()<17?'Good afternoon':'Good evening';
  const net=day.caloriesIn-day.caloriesBurned;
  const stats=getWeightStats();

  // Countdown to trip — May 5, 2026 5:32 AM ET
  const tripDate=new Date('2026-05-05T05:32:00-04:00');
  const now=new Date();
  const msLeft=tripDate-now;
  const daysLeft=Math.max(0,Math.ceil(msLeft/86400000));
  const weeksLeft=Math.max(0.1,daysLeft/7);
  const currentWeight=stats?stats.current:state.goalStart;
  const lbsToGo=Math.max(0,currentWeight-state.goalTarget);
  const lbsPerWeek=weeksLeft>0?(lbsToGo/weeksLeft).toFixed(1):'0';

  // Today's meals
  const mealRows=day.meals.map((m,i)=>`
    <div class="meal-card">
      <div>
        <div style="font-size:13px;color:var(--text);">${m.name}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-family:'Bebas Neue',sans-serif;font-size:18px;color:var(--accent);">${m.calories}</span>
        <button onclick="deleteMeal(${i})" style="background:none;border:none;color:var(--dim);font-size:10px;cursor:pointer;">✕</button>
      </div>
    </div>`).join('');

  return `
    <div style="text-align:center;margin-bottom:14px;">
      <div style="font-size:12px;color:var(--muted);margin-bottom:2px;">${greeting}, Morgan</div>
      <div style="font-size:8px;letter-spacing:3px;color:var(--dim);text-transform:lowercase;">your body. your goal.</div>
    </div>

    ${(()=>{
      const budget=1500;
      const remaining=budget-day.caloriesIn+day.caloriesBurned;
      const used=Math.min(100,Math.max(0,((day.caloriesIn-day.caloriesBurned)/budget)*100));
      const overBudget=remaining<0;
      const barColor=overBudget?'var(--red)':remaining<300?'#e8c050':'var(--accent)';
      return `
    <div id="budget-card" class="card" style="text-align:center;">
      <div id="budget-num" style="font-family:'Bebas Neue',sans-serif;font-size:48px;color:${overBudget?'var(--red)':'var(--accent)'};line-height:1;">${remaining}</div>
      <div style="font-size:9px;color:var(--muted);letter-spacing:1.5px;margin-top:4px;">${overBudget?'OVER BUDGET':'CALORIES LEFT TODAY'}</div>
      <div style="margin:12px 0 10px;">
        <div class="progress-track" style="height:8px;">
          <div style="height:100%;width:${used}%;background:${barColor};border-radius:3px;transition:width 0.5s ease;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:8px;color:var(--dim);margin-top:4px;">
          <span>0</span>
          <span>${budget} cal budget</span>
        </div>
      </div>
      <div style="display:flex;justify-content:space-around;margin-bottom:${stats?'10':'0'}px;">
        <div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--accent);line-height:1;">${day.caloriesIn}</div>
          <div style="font-size:7px;color:var(--muted);letter-spacing:1px;margin-top:2px;">EATEN</div>
        </div>
        <div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--green);line-height:1;">${day.caloriesBurned}</div>
          <div style="font-size:7px;color:var(--muted);letter-spacing:1px;margin-top:2px;">BURNED</div>
        </div>
        <div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:${net>0?'var(--text)':'var(--green)'};line-height:1;">${net}</div>
          <div style="font-size:7px;color:var(--muted);letter-spacing:1px;margin-top:2px;">NET</div>
        </div>
      </div>
      ${stats?`<div style="border-top:1px solid var(--border);padding-top:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <div style="font-size:13px;color:var(--text);font-weight:600;">⚖️ ${stats.current} lb</div>
          <div style="font-size:10px;color:var(--dim);">${stats.toGo>0?stats.toGo.toFixed(1)+' lb to go':'Goal reached!'}</div>
        </div>
        <div style="height:12px;background:var(--bg3);border-radius:6px;overflow:hidden;">
          <div style="height:100%;width:${stats.progress}%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:6px;transition:width 0.5s ease;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:8px;color:var(--dim);margin-top:4px;">
          <span>${state.goalStart} lb</span>
          <span style="color:var(--accent);">${Math.round(stats.progress)}%</span>
          <span>${state.goalTarget} lb</span>
        </div>
      </div>`:''}
    </div>`;
    })()}

    ${(()=>{
      // Weekly report card — show on Sundays or if data exists
      const wrStart=new Date(); wrStart.setDate(wrStart.getDate()-wrStart.getDay()-7); wrStart.setHours(0,0,0,0);
      const wrEnd=new Date(); wrEnd.setDate(wrEnd.getDate()-wrEnd.getDay()); wrEnd.setHours(0,0,0,0);
      const wrDays=(state.days||[]).filter(d=>{const t=new Date(d.timestamp);return t>=wrStart&&t<wrEnd;});
      const wrDismiss='bf_report_'+wrStart.getTime();
      if(!wrDays.length||localStorage.getItem(wrDismiss)) return '';
      const wrAvg=Math.round(wrDays.reduce((a,d)=>a+(d.caloriesIn||0),0)/wrDays.length);
      const wrBurn=Math.round(wrDays.reduce((a,d)=>a+(d.caloriesBurned||0),0)/wrDays.length);
      const wrWeighIns=(state.entries||[]).filter(e=>{const t=new Date(e.timestamp);return t>=wrStart&&t<wrEnd;});
      const wrWeight=wrWeighIns.length?Math.round(wrWeighIns.reduce((a,e)=>a+e.weight,0)/wrWeighIns.length*10)/10:null;
      const wrPrevWeighIns=(state.entries||[]).filter(e=>{const t=new Date(e.timestamp);return t>=new Date(wrStart.getTime()-604800000)&&t<wrStart;});
      const wrPrevWeight=wrPrevWeighIns.length?Math.round(wrPrevWeighIns.reduce((a,e)=>a+e.weight,0)/wrPrevWeighIns.length*10)/10:null;
      const wrWeightChange=wrWeight&&wrPrevWeight?Math.round((wrWeight-wrPrevWeight)*10)/10:null;
      const under=wrAvg<=(state.calBudget||1500);
      const grade=wrDays.length>=6&&under?'A':wrDays.length>=4&&under?'B+':wrDays.length>=3?'B':'C';
      return `
      <div style="background:linear-gradient(135deg,rgba(232,160,184,0.08),rgba(240,192,212,0.04));border:1px solid rgba(232,160,184,0.15);border-radius:14px;padding:14px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div style="font-size:8px;letter-spacing:2px;color:var(--muted);">WEEKLY REPORT</div>
          <button onclick="localStorage.setItem('${wrDismiss}','1');render();" style="background:none;border:none;color:var(--dim);font-size:12px;cursor:pointer;">✕</button>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:40px;color:var(--accent);">${grade}</div>
          <div>
            <div style="font-size:12px;color:var(--text);">${wrDays.length} days tracked</div>
            <div style="font-size:10px;color:var(--muted);">Avg ${wrAvg} cal/day · ${wrBurn} burned</div>
          </div>
        </div>
        ${wrWeightChange!==null?`<div style="font-size:11px;color:${wrWeightChange<=0?'var(--green)':'var(--red)'};">${wrWeightChange<=0?'':'+'} ${wrWeightChange} lb this week${wrWeight?' · avg '+wrWeight+' lb':''}</div>`:''}
      </div>`;
    })()}

    <div style="font-size:8px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;margin-bottom:6px;margin-top:4px;">Today's meals</div>
    ${mealRows||'<div style="font-size:12px;color:var(--dim);margin-bottom:6px;">No meals logged yet</div>'}

    <button id="weighin-btn" onclick="openWeighIn()" style="width:100%;background:${todayW?'rgba(110,231,160,0.06)':'var(--bg3)'};border:1px solid ${todayW?'rgba(110,231,160,0.2)':'var(--border2)'};border-radius:14px;padding:12px 14px;margin-top:8px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;">
      <div>
        <div style="font-size:8px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;">Daily Weigh-In</div>
        <div style="font-size:13px;color:${todayW?'var(--green)':'var(--text)'};margin-top:3px;">${todayW?'✓ '+todayW.weight+' lb logged':'Tap to weigh in today'}</div>
      </div>
      <span style="font-size:20px;">${todayW?'✓':'⚖️'}</span>
    </button>

    <div style="display:flex;gap:8px;margin-top:8px;">
      <button class="btn primary" style="flex:1;" onclick="openQuickAdd()">+ ADD MEAL</button>
      <button class="btn ghost" style="flex:1;" onclick="openBurnedModal()">🔥 LOG BURNED</button>
    </div>

    <button id="gpt-btn" onclick="copyPrompt()" style="width:100%;background:linear-gradient(135deg,rgba(232,160,184,0.1),rgba(240,192,212,0.05));border:1px solid rgba(232,160,184,0.25);border-radius:14px;padding:12px 14px;margin-top:8px;cursor:pointer;display:flex;align-items:center;gap:12px;">
      <div style="font-size:24px;flex-shrink:0;">🤖</div>
      <div style="text-align:left;flex:1;">
        <div style="font-size:12px;color:var(--accent);font-weight:600;">Don't know the calories? Ask ChatGPT</div>
        <div style="font-size:9px;color:var(--dim);margin-top:2px;">Tap to copy prompt · paste into ChatGPT · paste answer below</div>
      </div>
    </button>
    <button onclick="openPasteResult()" style="width:100%;background:var(--bg3);border:1px solid var(--border2);border-radius:14px;padding:10px 14px;margin-top:6px;cursor:pointer;display:flex;align-items:center;gap:12px;">
      <div style="font-size:18px;flex-shrink:0;">📋</div>
      <div style="text-align:left;flex:1;">
        <div style="font-size:11px;color:var(--text);">Paste ChatGPT's answer here</div>
      </div>
    </button>

    ${state.streak>1?`<div style="text-align:center;margin-top:12px;font-size:11px;color:var(--accent);">🔥 ${state.streak} day weigh-in streak</div>`:''}

  `;
}

function renderLog(){
  return `
    <div style="font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:2px;margin-bottom:16px;">Log a Meal</div>

    <div class="card">
      <div style="font-size:11px;letter-spacing:1px;color:var(--accent);margin-bottom:12px;">OPTION 1 — QUICK ADD</div>
      <input id="meal-name" class="input" placeholder="What did you eat?" style="margin-bottom:8px;"/>
      <input id="meal-cal" class="input" type="number" inputmode="numeric" placeholder="Calories" style="margin-bottom:12px;"/>
      <button class="btn primary" style="width:100%;" onclick="addMeal(document.getElementById('meal-name').value,document.getElementById('meal-cal').value);document.getElementById('meal-name').value='';document.getElementById('meal-cal').value='';">ADD MEAL</button>
    </div>

    <div class="card">
      <div style="font-size:11px;letter-spacing:1px;color:var(--accent);margin-bottom:8px;">OPTION 2 — USE CHATGPT</div>
      <div style="font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:12px;">
        Don't know the calories? Let ChatGPT figure it out:
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <button class="btn ghost" style="width:100%;text-align:left;padding:12px 14px;" onclick="copyPrompt()">
          <div style="font-size:11px;color:var(--accent);margin-bottom:4px;">STEP 1</div>
          <div style="font-size:12px;color:var(--text);">Copy the prompt → paste into ChatGPT</div>
          <div style="font-size:10px;color:var(--dim);margin-top:2px;">Tap to copy</div>
        </button>
        <div style="text-align:center;font-size:10px;color:var(--dim);">Tell ChatGPT what you ate</div>
        <button class="btn ghost" style="width:100%;text-align:left;padding:12px 14px;" onclick="openPasteResult()">
          <div style="font-size:11px;color:var(--accent);margin-bottom:4px;">STEP 2</div>
          <div style="font-size:12px;color:var(--text);">Paste ChatGPT's answer back here</div>
          <div style="font-size:10px;color:var(--dim);margin-top:2px;">Tap to paste result</div>
        </button>
      </div>
    </div>

    <div class="card">
      <div style="font-size:11px;letter-spacing:1px;color:var(--accent);margin-bottom:8px;">ACTIVE CALORIES BURNED</div>
      <div style="font-size:10px;color:var(--dim);margin-bottom:8px;">Exercise, walking, workouts — not resting metabolism</div>
      <div style="display:flex;gap:8px;align-items:center;">
        <input id="burn-inp" class="input" type="number" inputmode="numeric" value="${getToday().caloriesBurned||''}" placeholder="0" style="flex:1;text-align:center;font-size:18px;"/>
        <button class="btn primary small" onclick="setBurned(document.getElementById('burn-inp').value)">SET</button>
      </div>
    </div>
  `;
}

function renderChart(){
  // Calendar
  const mn=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const firstDay=new Date(calYear,calMonth,1).getDay();
  const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
  const todayDate=new Date(); todayDate.setHours(0,0,0,0);
  const isCurrentMonth=calMonth===todayDate.getMonth()&&calYear===todayDate.getFullYear();

  const dayHeaders=['S','M','T','W','T','F','S'].map(d=>
    `<div style="font-size:9px;color:var(--dim);text-align:center;padding:4px 0;">${d}</div>`).join('');
  const blanks=[...Array(firstDay)].map(()=>'<div></div>').join('');
  const calDays=[...Array(daysInMonth)].map((_,i)=>{
    const day=i+1;
    const isToday=day===todayDate.getDate()&&isCurrentMonth;
    const dayData=_calGetDay(calYear,calMonth,day);
    const weightData=_calGetWeight(calYear,calMonth,day);
    const hasCal=dayData&&dayData.caloriesIn>0;
    const hasWeight=!!weightData;
    const bg=hasCal?'rgba(232,160,184,0.12)':'transparent';
    const border=isToday?'border:1px solid var(--accent);':'border:1px solid transparent;';
    const color=hasCal?'var(--accent)':isToday?'var(--text)':'var(--dim)';
    const dots=[];
    if(hasCal) dots.push('var(--accent)');
    if(hasWeight) dots.push('var(--green)');
    const dotHtml=dots.length?`<div style="display:flex;justify-content:center;gap:2px;margin-top:1px;">${dots.map(c=>`<div style="width:3px;height:3px;border-radius:50%;background:${c};"></div>`).join('')}</div>`:'';
    const wLabel=hasWeight?`<div style="font-size:6px;color:var(--dim);line-height:1;">${weightData.weight}</div>`:'';
    return `<div onclick="openCalDay(${day})" style="text-align:center;padding:3px 1px;border-radius:8px;background:${bg};${border}cursor:pointer;min-height:36px;">
      <div style="font-size:11px;color:${color};font-weight:${hasCal?'600':'400'};">${day}</div>
      ${dotHtml}${wLabel}
    </div>`;
  }).join('');

  const calendar=`
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <button onclick="calNav(-1)" style="background:none;border:none;color:var(--muted);font-size:16px;cursor:pointer;padding:4px 8px;">‹</button>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:16px;color:var(--text);letter-spacing:1px;">${mn[calMonth]} ${calYear}</div>
        <button onclick="calNav(1)" style="background:none;border:none;color:var(--muted);font-size:16px;cursor:pointer;padding:4px 8px;">${isCurrentMonth?'':'›'}</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;">${dayHeaders}${blanks}${calDays}</div>
      <div style="display:flex;justify-content:center;gap:12px;margin-top:8px;font-size:9px;color:var(--dim);">
        <span><span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--accent);vertical-align:middle;"></span> calories</span>
        <span><span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--green);vertical-align:middle;"></span> weigh-in</span>
      </div>
    </div>`;

  // Last 14 days of calories
  const last14=(state.days||[]).slice(0,14).reverse();
  const last14w=(state.entries||[]).slice(0,14).reverse();

  let calChart='';
  if(last14.length>=2){
    const maxCal=Math.max(...last14.map(d=>d.caloriesIn||0),1);
    calChart=last14.map(d=>{
      const h=Math.max(4,((d.caloriesIn||0)/maxCal)*100);
      const dayLabel=d.date.split(',')[0];
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:120px;">
        <div style="font-size:7px;color:var(--dim);margin-bottom:2px;">${d.caloriesIn||0}</div>
        <div style="width:100%;height:${h}%;background:linear-gradient(to top,var(--accent),var(--accent2));border-radius:4px 4px 0 0;min-height:4px;"></div>
        <div style="font-size:6px;color:var(--dim);margin-top:3px;">${dayLabel}</div>
      </div>`;
    }).join('');
  }

  let weightChart='';
  if(last14w.length>=2){
    const weights=last14w.map(e=>e.weight);
    const min=Math.min(...weights)-1;
    const max=Math.max(...weights)+1;
    const range=max-min||1;
    weightChart=last14w.map(e=>{
      const h=Math.max(8,((e.weight-min)/range)*100);
      const dayLabel=e.date.split(',')[0];
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:120px;">
        <div style="font-size:7px;color:var(--dim);margin-bottom:2px;">${e.weight}</div>
        <div style="width:100%;height:${h}%;background:linear-gradient(to top,var(--green),#a0e8c0);border-radius:4px 4px 0 0;min-height:4px;"></div>
        <div style="font-size:6px;color:var(--dim);margin-top:3px;">${dayLabel}</div>
      </div>`;
    }).join('');
  }

  // Weekly report
  const weekStart=new Date(); weekStart.setDate(weekStart.getDate()-weekStart.getDay()); weekStart.setHours(0,0,0,0);
  const weekDays=(state.days||[]).filter(d=>new Date(d.timestamp)>=weekStart);
  const weekAvgCal=weekDays.length?Math.round(weekDays.reduce((a,d)=>a+(d.caloriesIn||0),0)/weekDays.length):0;
  const weekAvgBurn=weekDays.length?Math.round(weekDays.reduce((a,d)=>a+(d.caloriesBurned||0),0)/weekDays.length):0;
  const weekAvgNet=weekAvgCal-weekAvgBurn;
  const weekWeighIns=(state.entries||[]).filter(e=>new Date(e.timestamp)>=weekStart);
  const weekAvgWeight=weekWeighIns.length?Math.round(weekWeighIns.reduce((a,e)=>a+e.weight,0)/weekWeighIns.length*10)/10:null;

  return `
    ${calendar}

    ${weekDays.length?`
    <div class="card">
      <div style="font-size:8px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;margin-bottom:12px;">This week</div>
      <div style="display:flex;gap:8px;">
        <div style="flex:1;background:var(--bg3);border-radius:10px;padding:10px;text-align:center;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--accent);">${weekAvgCal}</div>
          <div style="font-size:7px;color:var(--dim);letter-spacing:1px;margin-top:2px;">AVG EATEN</div>
        </div>
        <div style="flex:1;background:var(--bg3);border-radius:10px;padding:10px;text-align:center;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--green);">${weekAvgBurn}</div>
          <div style="font-size:7px;color:var(--dim);letter-spacing:1px;margin-top:2px;">AVG BURNED</div>
        </div>
        <div style="flex:1;background:var(--bg3);border-radius:10px;padding:10px;text-align:center;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--text);">${weekAvgNet}</div>
          <div style="font-size:7px;color:var(--dim);letter-spacing:1px;margin-top:2px;">AVG NET</div>
        </div>
      </div>
      ${weekAvgWeight?`<div style="text-align:center;margin-top:10px;font-size:11px;color:var(--muted);">Avg weight: ${weekAvgWeight} lb</div>`:''}
    </div>`:''}

    ${calChart?`
    <div class="card">
      <div style="font-size:8px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;margin-bottom:10px;">Calories · Last ${last14.length} days</div>
      <div style="display:flex;gap:3px;align-items:flex-end;">${calChart}</div>
    </div>`:'<div class="card"><div style="font-size:12px;color:var(--dim);text-align:center;">Log a few days to see trends</div></div>'}

    ${weightChart?`
    <div class="card">
      <div style="font-size:8px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;margin-bottom:10px;">Weight · Last ${last14w.length} weigh-ins</div>
      <div style="display:flex;gap:3px;align-items:flex-end;">${weightChart}</div>
    </div>`:''}
  `;
}

function renderSettings(){
  return `
    <div style="font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:2px;margin-bottom:16px;">Settings</div>

    <div class="card">
      <div style="font-size:9px;color:var(--dim);margin-bottom:6px;">Starting weight</div>
      <input id="set-start" class="input" type="number" value="${state.goalStart}" inputmode="decimal" style="text-align:center;font-size:18px;margin-bottom:12px;"/>
      <div style="font-size:9px;color:var(--dim);margin-bottom:6px;">Goal weight</div>
      <input id="set-goal" class="input" type="number" value="${state.goalTarget}" inputmode="decimal" style="text-align:center;font-size:18px;margin-bottom:14px;"/>
      <button class="btn primary" style="width:100%;" onclick="state.goalStart=parseFloat(document.getElementById('set-start').value)||135;state.goalTarget=parseFloat(document.getElementById('set-goal').value)||115;save();showToast('Saved');render();">SAVE</button>
    </div>

    <div class="card">
      <div style="font-size:9px;letter-spacing:2px;color:var(--muted);margin-bottom:10px;">CLOUD SYNC</div>
      <div id="sync-ui" style="font-size:12px;color:var(--dim);">Loading...</div>
    </div>

    <div class="card">
      <div style="font-size:9px;color:var(--dim);margin-bottom:6px;letter-spacing:1px;">NUTRITION API</div>
      <div style="font-size:10px;color:var(--dim);margin-bottom:8px;line-height:1.5;">Looks up calories for foods not in the built-in database. Free from <span style="color:var(--accent);">api-ninjas.com</span></div>
      <input id="api-key-inp" class="input" type="text" placeholder="Paste API key here" value="${state.apiKey||''}" style="font-size:12px;margin-bottom:8px;"/>
      <button class="btn ghost small" style="width:100%;" onclick="state.apiKey=document.getElementById('api-key-inp').value.trim();save();showToast(state.apiKey?'API key saved':'API key removed');">SAVE KEY</button>
    </div>

    <div class="card">
      <div style="font-size:9px;color:var(--dim);margin-bottom:8px;">Export data</div>
      <button class="btn ghost" style="width:100%;" onclick="exportData()">DOWNLOAD BACKUP</button>
    </div>

    <div style="text-align:center;margin-top:20px;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:3px;color:var(--dim);">BREAK FREE</div>
      <div style="font-size:9px;color:var(--dim);margin-top:4px;">your body. your goal.</div>
    </div>
  `;
  setTimeout(renderSyncUI, 50);
}

// ── Food Database ──
const FOOD_DB=[
{name:'Chicken Breast',calories:165,serving:'4 oz'},{name:'Chicken Thigh',calories:230,serving:'4 oz'},{name:'Chicken Wing',calories:100,serving:'1 wing'},{name:'Rotisserie Chicken',calories:220,serving:'4 oz'},{name:'Ground Turkey',calories:170,serving:'4 oz'},{name:'Turkey Breast',calories:135,serving:'4 oz'},{name:'Turkey Bacon',calories:60,serving:'2 slices'},{name:'Ground Beef 80/20',calories:310,serving:'4 oz'},{name:'Ground Beef 90/10',calories:200,serving:'4 oz'},{name:'Ribeye Steak',calories:450,serving:'6 oz'},{name:'Sirloin Steak',calories:210,serving:'6 oz'},{name:'Filet Mignon',calories:270,serving:'6 oz'},{name:'NY Strip Steak',calories:360,serving:'6 oz'},{name:'Salmon Fillet',calories:230,serving:'4 oz'},{name:'Canned Tuna',calories:100,serving:'1 can'},{name:'Shrimp',calories:100,serving:'4 oz'},{name:'Tilapia',calories:110,serving:'4 oz'},{name:'Cod',calories:100,serving:'4 oz'},{name:'Egg (whole)',calories:70,serving:'1 large'},{name:'Egg Whites',calories:17,serving:'1 large'},{name:'Hard Boiled Egg',calories:78,serving:'1 large'},{name:'Scrambled Eggs',calories:180,serving:'2 eggs'},{name:'Pork Chop',calories:230,serving:'6 oz'},{name:'Bacon',calories:90,serving:'2 slices'},{name:'Ham',calories:150,serving:'4 oz'},{name:'Sausage Link',calories:170,serving:'2 links'},{name:'Hot Dog',calories:190,serving:'1 frank'},{name:'Tofu',calories:90,serving:'4 oz'},{name:'Edamame',calories:190,serving:'1 cup'},{name:'Black Beans',calories:230,serving:'1 cup'},{name:'Chickpeas',calories:270,serving:'1 cup'},{name:'Lentils',calories:230,serving:'1 cup'},
{name:'White Rice',calories:205,serving:'1 cup'},{name:'Brown Rice',calories:215,serving:'1 cup'},{name:'Quinoa',calories:220,serving:'1 cup'},{name:'Spaghetti',calories:220,serving:'1 cup'},{name:'Penne Pasta',calories:220,serving:'1 cup'},{name:'Mac and Cheese',calories:380,serving:'1 cup'},{name:'Ramen Noodles',calories:380,serving:'1 packet'},{name:'White Bread',calories:75,serving:'1 slice'},{name:'Whole Wheat Bread',calories:80,serving:'1 slice'},{name:'Tortilla (flour)',calories:140,serving:'1 medium'},{name:'Tortilla (corn)',calories:60,serving:'1 small'},{name:'Bagel',calories:270,serving:'1 bagel'},{name:'English Muffin',calories:130,serving:'1 muffin'},{name:'Croissant',calories:230,serving:'1 croissant'},{name:'Oatmeal',calories:150,serving:'1 cup'},{name:'Baked Potato',calories:160,serving:'1 medium'},{name:'Mashed Potatoes',calories:210,serving:'1 cup'},{name:'French Fries',calories:365,serving:'medium'},{name:'Sweet Potato',calories:100,serving:'1 medium'},
{name:'Banana',calories:105,serving:'1 medium'},{name:'Apple',calories:95,serving:'1 medium'},{name:'Orange',calories:65,serving:'1 medium'},{name:'Grapes',calories:105,serving:'1 cup'},{name:'Strawberries',calories:50,serving:'1 cup'},{name:'Blueberries',calories:85,serving:'1 cup'},{name:'Watermelon',calories:45,serving:'1 cup'},{name:'Pineapple',calories:80,serving:'1 cup'},{name:'Mango',calories:100,serving:'1 cup'},{name:'Avocado',calories:240,serving:'1 medium'},
{name:'Broccoli',calories:55,serving:'1 cup'},{name:'Spinach',calories:7,serving:'1 cup raw'},{name:'Mixed Salad',calories:10,serving:'1 cup'},{name:'Carrots',calories:50,serving:'1 medium'},{name:'Tomato',calories:25,serving:'1 medium'},{name:'Bell Pepper',calories:30,serving:'1 medium'},{name:'Corn on the Cob',calories:90,serving:'1 ear'},{name:'Asparagus',calories:25,serving:'6 spears'},{name:'Green Beans',calories:35,serving:'1 cup'},
{name:'Whole Milk',calories:150,serving:'1 cup'},{name:'2% Milk',calories:120,serving:'1 cup'},{name:'Almond Milk',calories:30,serving:'1 cup'},{name:'Oat Milk',calories:120,serving:'1 cup'},{name:'Cheddar Cheese',calories:110,serving:'1 oz'},{name:'Mozzarella',calories:85,serving:'1 oz'},{name:'American Cheese',calories:100,serving:'1 slice'},{name:'Cream Cheese',calories:50,serving:'1 tbsp'},{name:'Cottage Cheese',calories:110,serving:'1/2 cup'},{name:'String Cheese',calories:80,serving:'1 stick'},{name:'Greek Yogurt',calories:130,serving:'1 cup'},{name:'Butter',calories:100,serving:'1 tbsp'},{name:'Ice Cream',calories:270,serving:'1 cup'},
{name:'Almonds',calories:165,serving:'1 oz'},{name:'Peanuts',calories:165,serving:'1 oz'},{name:'Cashews',calories:155,serving:'1 oz'},{name:'Walnuts',calories:185,serving:'1 oz'},{name:'Trail Mix',calories:140,serving:'1 oz'},{name:'Peanut Butter',calories:190,serving:'2 tbsp'},{name:'Almond Butter',calories:195,serving:'2 tbsp'},
{name:'Protein Bar',calories:210,serving:'1 bar'},{name:'Granola Bar',calories:140,serving:'1 bar'},{name:'Rice Cake',calories:35,serving:'1 cake'},{name:'Potato Chips',calories:150,serving:'1 oz'},{name:'Tortilla Chips',calories:140,serving:'1 oz'},{name:'Popcorn',calories:95,serving:'3 cups'},{name:'Hummus',calories:70,serving:'2 tbsp'},{name:'Dark Chocolate',calories:170,serving:'1 oz'},{name:'Oreos',calories:160,serving:'3 cookies'},{name:'Chocolate Chip Cookie',calories:220,serving:'1 large'},{name:'Brownie',calories:230,serving:'1 piece'},
{name:'Black Coffee',calories:5,serving:'8 oz'},{name:'Coffee with Cream',calories:60,serving:'8 oz'},{name:'Latte',calories:230,serving:'16 oz'},{name:'Cappuccino',calories:130,serving:'12 oz'},{name:'Iced Coffee',calories:120,serving:'16 oz'},{name:'Frappuccino',calories:380,serving:'16 oz'},{name:'Green Tea',calories:0,serving:'8 oz'},{name:'Coca-Cola',calories:140,serving:'12 oz'},{name:'Diet Coke',calories:0,serving:'12 oz'},{name:'Sprite',calories:140,serving:'12 oz'},{name:'Red Bull',calories:110,serving:'8.4 oz'},{name:'Gatorade',calories:140,serving:'20 oz'},{name:'Orange Juice',calories:110,serving:'8 oz'},{name:'Smoothie',calories:250,serving:'16 oz'},{name:'Protein Shake',calories:160,serving:'1 scoop + water'},{name:'Beer',calories:150,serving:'12 oz'},{name:'Light Beer',calories:105,serving:'12 oz'},{name:'Red Wine',calories:125,serving:'5 oz'},{name:'White Wine',calories:120,serving:'5 oz'},{name:'Margarita',calories:280,serving:'8 oz'},{name:'Vodka Soda',calories:100,serving:'1 drink'},
{name:'Pancakes',calories:175,serving:'2 medium'},{name:'Waffle',calories:220,serving:'1 large'},{name:'French Toast',calories:300,serving:'2 slices'},{name:'Omelet (cheese)',calories:300,serving:'3 egg'},{name:'Breakfast Burrito',calories:350,serving:'1 burrito'},{name:'Breakfast Sandwich',calories:400,serving:'1 sandwich'},{name:'Cereal with Milk',calories:220,serving:'1 cup + milk'},{name:'Granola',calories:200,serving:'1/2 cup'},{name:'Acai Bowl',calories:400,serving:'1 bowl'},{name:'Donut',calories:260,serving:'1 donut'},{name:'Muffin',calories:350,serving:'1 large'},
{name:'Big Mac',calories:580,serving:'1 sandwich'},{name:'McChicken',calories:400,serving:'1 sandwich'},{name:'Chicken McNuggets',calories:250,serving:'6 piece'},{name:'McDonald\'s Fries',calories:320,serving:'medium'},{name:'Whopper',calories:660,serving:'1 sandwich'},{name:'Chick-fil-A Sandwich',calories:440,serving:'1 sandwich'},{name:'Chick-fil-A Nuggets',calories:250,serving:'8 piece'},{name:'Subway 6" Turkey',calories:280,serving:'6 inch'},{name:'Taco Bell Crunchy Taco',calories:170,serving:'1 taco'},{name:'Taco Bell Burrito',calories:390,serving:'1 burrito'},{name:'Chipotle Burrito',calories:1000,serving:'1 burrito'},{name:'Chipotle Bowl',calories:700,serving:'1 bowl'},{name:'Pizza Slice (cheese)',calories:270,serving:'1 slice'},{name:'Pizza Slice (pepperoni)',calories:310,serving:'1 slice'},{name:'Popeyes Chicken Sandwich',calories:700,serving:'1 sandwich'},{name:'Five Guys Burger',calories:840,serving:'1 burger'},
{name:'Chicken Caesar Salad',calories:400,serving:'1 bowl'},{name:'Garden Salad',calories:70,serving:'1 bowl'},{name:'Cobb Salad',calories:550,serving:'1 bowl'},{name:'Grilled Chicken Sandwich',calories:420,serving:'1 sandwich'},{name:'BLT',calories:350,serving:'1 sandwich'},{name:'PB&J',calories:380,serving:'1 sandwich'},{name:'Grilled Cheese',calories:370,serving:'1 sandwich'},{name:'Chicken Stir Fry',calories:350,serving:'1.5 cups'},{name:'Chicken Alfredo',calories:600,serving:'1.5 cups'},{name:'Spaghetti and Meatballs',calories:500,serving:'1.5 cups'},{name:'Lasagna',calories:380,serving:'1 piece'},{name:'Chili',calories:250,serving:'1 cup'},{name:'Chicken Noodle Soup',calories:170,serving:'1 cup'},{name:'Chicken Wings',calories:430,serving:'6 wings'},{name:'Sushi Roll',calories:250,serving:'8 pieces'},{name:'Pho',calories:450,serving:'1 bowl'},{name:'Ramen Bowl',calories:500,serving:'1 bowl'},{name:'Fried Rice',calories:350,serving:'1 cup'},{name:'Chicken Quesadilla',calories:500,serving:'1 quesadilla'},{name:'Fish Tacos',calories:300,serving:'2 tacos'},{name:'Beef Tacos',calories:340,serving:'2 tacos'},
{name:'Ranch Dressing',calories:70,serving:'2 tbsp'},{name:'Mayo',calories:100,serving:'1 tbsp'},{name:'Ketchup',calories:20,serving:'1 tbsp'},{name:'BBQ Sauce',calories:30,serving:'1 tbsp'},{name:'Olive Oil',calories:120,serving:'1 tbsp'},{name:'Honey',calories:64,serving:'1 tbsp'},{name:'Maple Syrup',calories:52,serving:'1 tbsp'},
{name:'Cheesecake',calories:400,serving:'1 slice'},{name:'Chocolate Cake',calories:350,serving:'1 slice'},{name:'Apple Pie',calories:300,serving:'1 slice'},{name:'Milkshake',calories:550,serving:'16 oz'},{name:'Frozen Yogurt',calories:220,serving:'1 cup'},
// Morgan's staples + vegetarian
{name:'Greek Yogurt with Granola',calories:280,serving:'1 cup + 1/4 cup'},{name:'Greek Yogurt with Granola and Honey',calories:345,serving:'1 cup + 1/4 cup + 1 tbsp'},{name:'Greek Yogurt with Berries',calories:180,serving:'1 cup + 1/2 cup'},{name:'Greek Yogurt Parfait',calories:300,serving:'1 parfait'},{name:'Frozen Fruit Smoothie',calories:200,serving:'16 oz'},{name:'Frozen Berries',calories:70,serving:'1 cup'},{name:'Frozen Mango',calories:100,serving:'1 cup'},{name:'Frozen Acai Pack',calories:100,serving:'1 pack'},
{name:'Coffee with Oat Milk',calories:60,serving:'12 oz'},{name:'Oat Milk Latte',calories:170,serving:'16 oz'},{name:'Iced Oat Milk Latte',calories:170,serving:'16 oz'},{name:'Matcha Latte',calories:190,serving:'16 oz'},{name:'Chai Latte',calories:200,serving:'16 oz'},
{name:'Avocado Toast',calories:280,serving:'1 slice'},{name:'Avocado Toast with Egg',calories:350,serving:'1 slice + 1 egg'},{name:'Sweet Potato (baked)',calories:100,serving:'1 medium'},{name:'Sweet Potato Fries',calories:300,serving:'1 cup'},{name:'Roasted Sweet Potato',calories:115,serving:'1 cup'},
{name:'Salmon (baked)',calories:230,serving:'4 oz'},{name:'Grilled Salmon',calories:230,serving:'4 oz'},{name:'Salmon Bowl',calories:500,serving:'1 bowl'},{name:'Salmon with Rice',calories:435,serving:'4 oz + 1 cup'},
{name:'Roasted Vegetables',calories:100,serving:'1 cup'},{name:'Roasted Broccoli',calories:65,serving:'1 cup'},{name:'Sauteed Spinach',calories:60,serving:'1 cup'},{name:'Roasted Cauliflower',calories:60,serving:'1 cup'},{name:'Roasted Brussels Sprouts',calories:80,serving:'1 cup'},{name:'Steamed Vegetables',calories:50,serving:'1 cup'},{name:'Veggie Stir Fry',calories:150,serving:'1 cup'},{name:'Zucchini Noodles',calories:20,serving:'1 cup'},
{name:'Kale Salad',calories:120,serving:'2 cups'},{name:'Caesar Salad (no chicken)',calories:250,serving:'1 bowl'},{name:'Greek Salad',calories:200,serving:'1 bowl'},{name:'Spinach Salad',calories:150,serving:'2 cups'},{name:'Side Salad with Dressing',calories:120,serving:'1 side'},
{name:'Baby Carrots',calories:35,serving:'10 carrots'},{name:'Carrots and Hummus',calories:130,serving:'10 carrots + 2 tbsp'},{name:'Celery and Peanut Butter',calories:200,serving:'3 stalks + 2 tbsp'},{name:'Apple with Peanut Butter',calories:285,serving:'1 apple + 2 tbsp'},{name:'Banana with Peanut Butter',calories:295,serving:'1 banana + 2 tbsp'},{name:'Veggies and Dip',calories:100,serving:'1 cup + 2 tbsp'},
{name:'Veggie Burger',calories:250,serving:'1 patty'},{name:'Beyond Burger',calories:230,serving:'1 patty'},{name:'Impossible Burger',calories:240,serving:'1 patty'},{name:'Black Bean Burger',calories:200,serving:'1 patty'},{name:'Veggie Wrap',calories:300,serving:'1 wrap'},{name:'Veggie Bowl',calories:400,serving:'1 bowl'},
{name:'Overnight Oats',calories:300,serving:'1 cup'},{name:'Chia Pudding',calories:230,serving:'1 cup'},{name:'Acai Bowl',calories:400,serving:'1 bowl'},{name:'Smoothie Bowl',calories:350,serving:'1 bowl'},
{name:'Rice and Beans',calories:350,serving:'1 cup each'},{name:'Veggie Pasta',calories:350,serving:'1.5 cups'},{name:'Pesto Pasta',calories:450,serving:'1.5 cups'},{name:'Caprese Salad',calories:280,serving:'1 plate'},{name:'Bruschetta',calories:130,serving:'2 pieces'},
{name:'Cauliflower Rice',calories:25,serving:'1 cup'},{name:'Quinoa Bowl',calories:400,serving:'1 bowl'},{name:'Buddha Bowl',calories:450,serving:'1 bowl'},{name:'Grain Bowl',calories:500,serving:'1 bowl'},
{name:'Veggie Sushi',calories:200,serving:'8 pieces'},{name:'Avocado Roll',calories:220,serving:'8 pieces'},{name:'Cucumber Roll',calories:130,serving:'8 pieces'},
{name:'Banana Smoothie',calories:220,serving:'16 oz'},{name:'Green Smoothie',calories:180,serving:'16 oz'},{name:'Protein Smoothie',calories:280,serving:'16 oz'},
{name:'Ezekiel Bread',calories:80,serving:'1 slice'},{name:'Rice Cakes with PB',calories:130,serving:'2 cakes + 1 tbsp'},{name:'Dates with Almond Butter',calories:200,serving:'3 dates + 1 tbsp'},
{name:'Coconut Water',calories:45,serving:'8 oz'},{name:'Kombucha',calories:50,serving:'8 oz'},{name:'Sparkling Water',calories:0,serving:'12 oz'},
];

// ── CalorieNinjas API fallback ──
const NUTRITION_API_KEY='4jMmTZ7RitTyaK5QaIM6qvtiDwo331tfpFGOkpGM';
async function lookupCalories(query){
  const key=state.apiKey||NUTRITION_API_KEY;
  if(!key) return null;
  try{
    const resp=await fetch('https://api.api-ninjas.com/v1/nutrition?query='+encodeURIComponent(query),{
      headers:{'X-Api-Key':key}
    });
    if(!resp.ok) return null;
    const data=await resp.json();
    if(!data.items||!data.items.length) return null;
    return data.items.map(item=>({
      name:item.name.charAt(0).toUpperCase()+item.name.slice(1),
      calories:Math.round(item.calories),
      serving:Math.round(item.serving_size_g)+'g',
      protein:Math.round(item.protein_g),
      carbs:Math.round(item.carbohydrates_total_g),
      fat:Math.round(item.fat_total_g),
    }));
  }catch(e){ return null; }
}

let apiSearchTimer=null;

function searchFood(query){
  if(!query||query.length<2) return [];
  const q=query.toLowerCase();
  const exact=FOOD_DB.filter(f=>f.name.toLowerCase().startsWith(q));
  const partial=FOOD_DB.filter(f=>!f.name.toLowerCase().startsWith(q)&&f.name.toLowerCase().includes(q));
  return [...exact,...partial].slice(0,8);
}

function getRecentFoods(){
  const allMeals=(state.days||[]).flatMap(d=>d.meals||[]);
  const freq={};
  allMeals.forEach(m=>{ freq[m.name]=(freq[m.name]||0)+1; });
  return Object.entries(freq)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,6)
    .map(([name,count])=>{
      const db=FOOD_DB.find(f=>f.name===name);
      return {name,calories:db?db.calories:allMeals.find(m=>m.name===name)?.calories||0,serving:db?db.serving:'',count};
    });
}

function openServingPicker(name,baseCal,serving){
  showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:4px;">LOG FOOD</div>
    <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--text);margin-bottom:4px;">${name}</div>
    <div style="font-size:10px;color:var(--dim);margin-bottom:14px;">${serving} · ${baseCal} cal per serving</div>

    <div style="font-size:9px;color:var(--dim);margin-bottom:6px;letter-spacing:1px;">HOW MUCH?</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
      <button onclick="confirmServing('${name.replace(/'/g,"\\'")}',${baseCal},0.5)" class="btn ghost small">½ serving<br><span style="color:var(--accent);">${Math.round(baseCal*0.5)}</span></button>
      <button onclick="confirmServing('${name.replace(/'/g,"\\'")}',${baseCal},1)" class="btn ghost small" style="border-color:var(--accent);color:var(--accent);">1 serving<br><span style="color:var(--accent);">${baseCal}</span></button>
      <button onclick="confirmServing('${name.replace(/'/g,"\\'")}',${baseCal},1.5)" class="btn ghost small">1.5x<br><span style="color:var(--accent);">${Math.round(baseCal*1.5)}</span></button>
      <button onclick="confirmServing('${name.replace(/'/g,"\\'")}',${baseCal},2)" class="btn ghost small">2x<br><span style="color:var(--accent);">${Math.round(baseCal*2)}</span></button>
    </div>

    <div style="font-size:9px;color:var(--dim);margin-bottom:6px;letter-spacing:1px;">OR ENTER EXACT CALORIES</div>
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:14px;">
      <input id="sp-cal" class="input" type="number" inputmode="numeric" value="${baseCal}" style="flex:1;text-align:center;font-size:18px;"/>
      <span style="font-size:10px;color:var(--dim);">cal</span>
      <button class="btn primary small" onclick="addMeal('${name.replace(/'/g,"\\'")}',document.getElementById('sp-cal').value);hideModal();">LOG</button>
    </div>

    <button class="btn ghost" style="width:100%;" onclick="openQuickAdd()">BACK</button>
  `);
}

// ── Modals ──
function openQuickAdd(){
  const recent=getRecentFoods();
  const recentHtml=recent.length?`
    <div style="font-size:8px;letter-spacing:2px;color:var(--muted);margin-bottom:6px;">YOUR FREQUENT FOODS</div>
    ${recent.map(f=>`
      <button onclick="openServingPicker('${f.name.replace(/'/g,"\\'")}',${f.calories},'${(f.serving||'1 serving').replace(/'/g,"\\'")}')"
        style="width:100%;background:rgba(232,160,184,0.06);border:1px solid rgba(232,160,184,0.15);border-radius:10px;padding:8px 12px;margin-bottom:4px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;text-align:left;">
        <div style="font-size:12px;color:var(--text);">${f.name}</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:18px;color:var(--accent);">${f.calories}</div>
      </button>`).join('')}
    <div style="border-top:1px solid var(--border);margin:8px 0;"></div>`:'';

  showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:12px;">WHAT DID YOU EAT?</div>
    <input id="qa-search" class="input" placeholder="Start typing... chicken, pizza, latte..."
      oninput="updateFoodSearch()" autocomplete="off"
      style="margin-bottom:8px;font-size:15px;"/>
    <div id="food-results">${recentHtml}<div style="font-size:11px;color:var(--dim);padding:4px 0;">Or type to search 250+ foods...</div></div>
    <div id="qa-manual" style="display:none;margin-top:8px;border-top:1px solid var(--border);padding-top:10px;">
      <div style="font-size:9px;color:var(--dim);margin-bottom:6px;">NOT FOUND? ENTER MANUALLY</div>
      <div style="display:flex;gap:8px;align-items:center;">
        <input id="qa-name" class="input" placeholder="Food name" style="flex:2;font-size:13px;"/>
        <input id="qa-cal" class="input" type="number" inputmode="numeric" placeholder="Cal" style="flex:1;font-size:13px;text-align:center;"/>
        <button class="btn primary small" onclick="addMeal(document.getElementById('qa-name').value,document.getElementById('qa-cal').value);hideModal();">+</button>
      </div>
    </div>
    <button class="btn ghost" style="width:100%;margin-top:10px;" onclick="hideModal()">CANCEL</button>
  `);
  setTimeout(()=>{const i=document.getElementById('qa-search');if(i)i.focus();},100);
}

function updateFoodSearch(){
  const q=document.getElementById('qa-search')?.value||'';
  const results=searchFood(q);
  const el=document.getElementById('food-results');
  const manual=document.getElementById('qa-manual');
  if(!el) return;

  if(q.length<2){
    el.innerHTML='<div style="font-size:11px;color:var(--dim);padding:8px 0;">Type to search 250+ foods...</div>';
    if(manual) manual.style.display='none';
    return;
  }

  if(results.length){
    el.innerHTML=results.map(f=>`
      <button onclick="openServingPicker('${f.name.replace(/'/g,"\\'")}',${f.calories},'${f.serving.replace(/'/g,"\\'")}')"
        style="width:100%;background:var(--bg3);border:1px solid var(--border2);border-radius:10px;padding:10px 12px;margin-bottom:4px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;text-align:left;">
        <div>
          <div style="font-size:13px;color:var(--text);">${f.name}</div>
          <div style="font-size:9px;color:var(--dim);">${f.serving}</div>
        </div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;color:var(--accent);">${f.calories}</div>
      </button>`).join('');
    if(manual) manual.style.display='none';
  } else {
    // No local results — try API if key is set
    if(state.apiKey){
      el.innerHTML='<div style="font-size:11px;color:var(--dim);padding:8px 0;">Searching online...</div>';
      if(apiSearchTimer) clearTimeout(apiSearchTimer);
      apiSearchTimer=setTimeout(async()=>{
        const apiResults=await lookupCalories(q);
        // Check search field still has same query
        const currentQ=document.getElementById('qa-search')?.value||'';
        if(currentQ.toLowerCase()!==q.toLowerCase()) return;
        if(apiResults&&apiResults.length){
          el.innerHTML=`<div style="font-size:8px;letter-spacing:1px;color:var(--muted);margin-bottom:4px;">FROM NUTRITION API</div>`+
            apiResults.map(f=>`
            <button onclick="openServingPicker('${f.name.replace(/'/g,"\\'")}',${f.calories},'${f.serving.replace(/'/g,"\\'")}')"
              style="width:100%;background:var(--bg3);border:1px solid var(--border2);border-radius:10px;padding:10px 12px;margin-bottom:4px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;text-align:left;">
              <div>
                <div style="font-size:13px;color:var(--text);">${f.name}</div>
                <div style="font-size:9px;color:var(--dim);">${f.serving} · ${f.protein}g protein · ${f.carbs}g carbs · ${f.fat}g fat</div>
              </div>
              <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;color:var(--accent);">${f.calories}</div>
            </button>`).join('');
          if(manual) manual.style.display='none';
        } else {
          el.innerHTML='<div style="font-size:11px;color:var(--dim);padding:8px 0;">No matches found</div>';
          if(manual){ manual.style.display='block'; document.getElementById('qa-name').value=q; }
        }
      },500); // debounce API calls
    } else {
      el.innerHTML='<div style="font-size:11px;color:var(--dim);padding:8px 0;">No matches found</div>';
      if(manual){ manual.style.display='block'; document.getElementById('qa-name').value=q; }
    }
  }
}

function confirmServing(name,baseCal,multiplier){
  addMeal(name,Math.round(baseCal*multiplier));
  hideModal();
}

function openWeighIn(){
  const last=state.entries.length?state.entries[0].weight:'';
  const todayW=getTodayWeight();
  showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:14px;">WEIGH IN</div>
    <input id="bw-inp" type="number" class="input" placeholder="${last||'135'}" value="${todayW?todayW.weight:''}" step="0.1"
      style="text-align:center;font-family:'Bebas Neue',sans-serif;font-size:36px;margin-bottom:6px;"
      inputmode="decimal"/>
    <div style="font-size:10px;color:var(--dim);text-align:center;margin-bottom:14px;">lbs</div>
    <button class="btn primary" style="width:100%;" onclick="logWeight(document.getElementById('bw-inp').value);hideModal();">LOG WEIGHT</button>
    <button class="btn ghost" style="width:100%;margin-top:8px;" onclick="hideModal()">CANCEL</button>
  `);
  setTimeout(()=>{const i=document.getElementById('bw-inp');if(i)i.focus();},100);
}

function openCaloriesConsumedModal(){
  const day=getToday();
  showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:6px;">CALORIES EATEN TODAY</div>
    <div style="font-size:10px;color:var(--dim);margin-bottom:10px;">Total from ${day.meals.length} meal${day.meals.length!==1?'s':''}</div>
    <div style="font-family:'Bebas Neue',sans-serif;font-size:42px;color:var(--accent);text-align:center;margin-bottom:14px;">${day.caloriesIn}</div>
    ${day.meals.length?`<div style="margin-bottom:14px;">${day.meals.map((m,i)=>`
      <div class="meal-card">
        <span style="font-size:12px;color:var(--text);">${m.name}</span>
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:13px;color:var(--accent);">${m.calories}</span>
          <button onclick="deleteMeal(${i});hideModal();openCaloriesConsumedModal();" style="background:none;border:none;color:var(--dim);font-size:9px;cursor:pointer;">✕</button>
        </div>
      </div>`).join('')}</div>`:''}
    <button class="btn primary" style="width:100%;" onclick="hideModal();openQuickAdd();">+ ADD ANOTHER MEAL</button>
    <button class="btn ghost" style="width:100%;margin-top:8px;" onclick="hideModal()">CLOSE</button>
  `);
}
function openBurnedModal(){
  showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:14px;">ACTIVE CALORIES BURNED</div>
    <div style="font-size:10px;color:var(--dim);margin-bottom:10px;">Exercise, walking, workouts</div>
    <input id="burn-inp2" class="input" type="number" inputmode="numeric" value="${getToday().caloriesBurned||''}" placeholder="0"
      style="text-align:center;font-family:'Bebas Neue',sans-serif;font-size:36px;margin-bottom:14px;"/>
    <button class="btn primary" style="width:100%;" onclick="setBurned(document.getElementById('burn-inp2').value);hideModal();">SAVE</button>
    <button class="btn ghost" style="width:100%;margin-top:8px;" onclick="hideModal()">CANCEL</button>
  `);
}

// ── Stats ──
function getWeightStats(){
  if(!state.entries.length) return null;
  const current=state.entries[0].weight;
  const totalLost=state.goalStart-current;
  const toGo=current-state.goalTarget;
  const progress=Math.max(0,Math.min(100,(totalLost/(state.goalStart-state.goalTarget))*100));
  return {current,totalLost,toGo,progress};
}

function exportData(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download='breakfree-data.json'; a.click();
  URL.revokeObjectURL(url);
  showToast('Data exported');
}

// ═══════════════════════════════════════════
// CLOUD SYNC — Supabase auth + data backup
// ═══════════════════════════════════════════
const SB_URL='https://bvnkzimwskuruhdmzpbt.supabase.co';
const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2bmt6aW13c2t1cnVoZG16cGJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MTc3NzgsImV4cCI6MjA4OTE5Mzc3OH0.6layiAl75f5YeAQRzU55j41JBAS9_e1QL0tpq-l3DpE';
let sbClient=null;

function getSB(){
  if(sbClient) return sbClient;
  if(!window.supabase) return null;
  sbClient=window.supabase.createClient(SB_URL,SB_KEY);
  return sbClient;
}

async function getUser(){
  const c=getSB(); if(!c) return null;
  const {data}=await c.auth.getUser();
  return data?.user||null;
}

async function cloudSignIn(){
  const c=getSB(); if(!c){showToast('Sync not available');return;}
  const email=document.getElementById('sync-email')?.value?.trim();
  const pass=document.getElementById('sync-pass')?.value;
  if(!email||!pass){showToast('Enter email and password');return;}
  const {error}=await c.auth.signInWithPassword({email,password:pass});
  if(error){showToast('Error: '+error.message);return;}
  showToast('Signed in — syncing...');
  const cloud=await syncFromCloud();
  if(cloud){
    state={...defaultState(),...cloud};
    save();
  }
  render();
}

async function cloudSignUp(){
  const c=getSB(); if(!c){showToast('Sync not available');return;}
  const email=document.getElementById('sync-email')?.value?.trim();
  const pass=document.getElementById('sync-pass')?.value;
  if(!email||!pass){showToast('Enter email and password');return;}
  const {error}=await c.auth.signUp({email,password:pass});
  if(error){showToast('Error: '+error.message);return;}
  showToast('Account created — check email to confirm, then sign in');
}

async function cloudSignOut(){
  const c=getSB(); if(!c) return;
  await c.auth.signOut();
  showToast('Signed out');
  render();
}

async function cloudResetPw(){
  const c=getSB(); if(!c) return;
  const email=document.getElementById('sync-email')?.value?.trim();
  if(!email){showToast('Enter your email first');return;}
  const {error}=await c.auth.resetPasswordForEmail(email,{redirectTo:'https://mikeymesce.github.io/gainz/breakfree/'});
  if(error){showToast('Error: '+error.message);return;}
  showToast('Password reset email sent');
}

async function syncToCloud(){
  const c=getSB(); if(!c||!navigator.onLine) return;
  const user=await getUser(); if(!user) return;
  state._lastSyncedAt=Date.now();
  await c.from('user_state').upsert({user_id:user.id,state:state,updated_at:new Date().toISOString()},{onConflict:'user_id'});
}

async function syncFromCloud(){
  const c=getSB(); if(!c||!navigator.onLine) return null;
  const user=await getUser(); if(!user) return null;
  const {data}=await c.from('user_state').select('state').eq('user_id',user.id).single();
  return data?.state||null;
}

async function cloudSyncNow(){
  showToast('Syncing...');
  await syncToCloud();
  showToast('Synced ✓');
}

async function renderSyncUI(){
  const el=document.getElementById('sync-ui');
  if(!el) return;
  const user=await getUser();
  if(user){
    el.innerHTML=`
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <div style="width:8px;height:8px;border-radius:50%;background:var(--green);flex-shrink:0;"></div>
        <div style="font-size:12px;color:var(--text);">${user.email}</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button onclick="cloudSyncNow()" class="btn ghost small" style="flex:1;">SYNC NOW</button>
        <button onclick="cloudSignOut()" class="btn ghost small" style="color:var(--red);border-color:rgba(224,112,112,0.3);">SIGN OUT</button>
      </div>`;
  } else {
    el.innerHTML=`
      <div style="font-size:11px;color:var(--muted);margin-bottom:10px;">Sign in to back up your data</div>
      <input id="sync-email" class="input" type="email" placeholder="email" style="margin-bottom:8px;font-size:13px;"/>
      <input id="sync-pass" class="input" type="password" placeholder="password" style="margin-bottom:10px;font-size:13px;"/>
      <div style="display:flex;gap:8px;">
        <button onclick="cloudSignIn()" class="btn primary small" style="flex:1;">SIGN IN</button>
        <button onclick="cloudSignUp()" class="btn ghost small" style="flex:1;">SIGN UP</button>
      </div>
      <button onclick="cloudResetPw()" style="background:none;border:none;color:var(--dim);font-size:10px;margin-top:8px;cursor:pointer;font-family:'DM Sans',sans-serif;">Forgot password?</button>`;
  }
}

// Auto-sync after saving
const _origSave=save;
save=function(){
  _origSave();
  syncToCloud(); // fire and forget
};

// Auto-pull on load
setTimeout(async()=>{
  const cloud=await syncFromCloud();
  if(cloud&&cloud._lastSyncedAt&&(!state._lastSyncedAt||cloud._lastSyncedAt>state._lastSyncedAt)){
    state={...defaultState(),...cloud};
    _origSave();
    render();
  }
},1000);

// Sign-in popup on first load
async function checkSignInPopup(){
  if(localStorage.getItem('breakfree_guest')) return;
  const user=await getUser();
  if(user) return;
  showModal(`
    <div style="text-align:center;margin-bottom:16px;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:24px;color:var(--accent);letter-spacing:3px;">BREAK FREE</div>
      <div style="font-size:10px;color:var(--muted);margin-top:4px;">Sign in to save your progress</div>
    </div>
    <input id="pop-email" class="input" type="email" placeholder="email" style="margin-bottom:8px;font-size:13px;"/>
    <input id="pop-pass" class="input" type="password" placeholder="password" style="margin-bottom:12px;font-size:13px;"/>
    <div id="pop-error" style="font-size:10px;color:var(--red);margin-bottom:8px;display:none;"></div>
    <button onclick="popSignIn()" class="btn primary" style="width:100%;">SIGN IN</button>
    <button onclick="popSignUp()" class="btn ghost" style="width:100%;margin-top:8px;">CREATE ACCOUNT</button>
    <button onclick="popGuest()" style="background:none;border:none;color:var(--dim);font-size:11px;margin-top:14px;cursor:pointer;font-family:'DM Sans',sans-serif;letter-spacing:1px;width:100%;text-align:center;">CONTINUE AS GUEST</button>
  `);
}
async function popSignIn(){
  const c=getSB(); if(!c){showToast('Sync not available');return;}
  const email=document.getElementById('pop-email')?.value?.trim();
  const pass=document.getElementById('pop-pass')?.value;
  if(!email||!pass){showToast('Enter email and password');return;}
  const {error}=await c.auth.signInWithPassword({email,password:pass});
  if(error){const el=document.getElementById('pop-error');if(el){el.textContent=error.message;el.style.display='block';}return;}
  hideModal();
  showToast('Signed in — syncing...');
  const cloud=await syncFromCloud();
  if(cloud){state={...defaultState(),...cloud};save();}
  render();
}
async function popSignUp(){
  const c=getSB(); if(!c){showToast('Sync not available');return;}
  const email=document.getElementById('pop-email')?.value?.trim();
  const pass=document.getElementById('pop-pass')?.value;
  if(!email||!pass){showToast('Enter email and password');return;}
  const {error}=await c.auth.signUp({email,password:pass});
  if(error){const el=document.getElementById('pop-error');if(el){el.textContent=error.message;el.style.display='block';}return;}
  hideModal();
  showToast('Account created — check email to confirm, then sign in');
}
function popGuest(){
  localStorage.setItem('breakfree_guest','1');
  hideModal();
}

// ═══════════════════════════════════════════
// TOUR — Pink tip bubbles
// ═══════════════════════════════════════════
const TOUR_STEPS=[
  {sel:'#budget-num',title:'Your daily budget',desc:'This counts down from 1,500 as you eat. You\'ll always know exactly how many calories you have left today.',pos:'below'},
  {sel:'#weighin-btn',title:'Daily weigh-in',desc:'Tap here to log your weight. The progress bar tracks how close you are to your goal — watch it fill up over time.',pos:'below'},
  {sel:'#gpt-btn',title:'Don\'t know the calories?',desc:'Tap this to copy a prompt. Paste it into ChatGPT, tell it what you ate, and paste the answer back. Easy.',pos:'above'},
  {sel:'#nav',title:'Calendar & trends',desc:'The Calendar tab tracks everything — calories, weigh-ins, and how your eating actually impacts your weight day after day. Weekly reports with pretty graphs and shit.',pos:'above'},
];
let tourStep=-1;
let tourTipEl=null;

function maybeShowTour(){
  if(localStorage.getItem('bf_seen_tour')) return;
  if(tourStep>=0) return;
  tourStep=0;
  showTourStep();
}

function showTourStep(){
  removeTour();
  if(tourStep>=TOUR_STEPS.length){
    localStorage.setItem('bf_seen_tour','1');
    tourStep=-1;
    return;
  }
  const step=TOUR_STEPS[tourStep];
  const target=document.querySelector(step.sel);
  if(!target){tourStep++;showTourStep();return;}

  const content=document.querySelector('.content');
  if(!content) return;

  // Overlay
  const overlay=document.createElement('div');
  overlay.id='tour-overlay';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:90;';
  overlay.addEventListener('click',advanceTour);
  document.body.appendChild(overlay);

  // Highlight target
  target.style.position='relative';
  target.style.zIndex='91';
  target._tour=true;

  // Dots
  const dots=TOUR_STEPS.map((_,i)=>
    `<span style="display:inline-block;width:${i===tourStep?'14px':'5px'};height:5px;border-radius:3px;background:${i===tourStep?'#1a0a12':'rgba(26,10,18,0.25)'};transition:all 0.2s;"></span>`
  ).join('');

  // Tooltip
  const tip=document.createElement('div');
  tip.className='tour-tip';
  tip.innerHTML=`
    <div class="tour-title">${step.title}</div>
    <div class="tour-desc">${step.desc}</div>
    <div style="display:flex;gap:4px;justify-content:center;margin-top:8px;">${dots}</div>
    <div style="font-size:9px;text-align:center;margin-top:6px;opacity:0.5;">tap anywhere to continue</div>
  `;

  const tRect=target.getBoundingClientRect();
  if(step.pos==='above'){
    tip.style.position='fixed';
    tip.style.bottom=(window.innerHeight-tRect.top+10)+'px';
    tip.style.left='50%';
    tip.style.transform='translateX(-50%)';
    tip.classList.add('arrow-down');
    document.body.appendChild(tip);
  } else {
    const cRect=content.getBoundingClientRect();
    tip.style.top=(tRect.bottom-cRect.top+content.scrollTop+10)+'px';
    tip.style.left='50%';
    tip.style.transform='translateX(-50%)';
    tip.classList.add('arrow-up');
    content.style.position='relative';
    content.appendChild(tip);
    requestAnimationFrame(()=>{
      const tipR=tip.getBoundingClientRect();
      if(tipR.bottom>window.innerHeight-80){
        content.scrollBy({top:tipR.bottom-window.innerHeight+100,behavior:'smooth'});
      }
    });
  }
  tourTipEl=tip;
}

function advanceTour(){tourStep++;showTourStep();}

function removeTour(){
  const ov=document.getElementById('tour-overlay');
  if(ov) ov.remove();
  if(tourTipEl){tourTipEl.remove();tourTipEl=null;}
  document.querySelectorAll('[style]').forEach(el=>{
    if(el._tour){el.style.zIndex='';el._tour=false;}
  });
}

// ── Init ──
render();
setTimeout(()=>{
  checkSignInPopup();
  // Show tour after sign-in popup is handled
  setTimeout(maybeShowTour,1500);
},800);
