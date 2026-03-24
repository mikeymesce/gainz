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
}
setTimeout(dismissSplash,3500);

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

  // Sign-in prompt
  const signedIn=getSB()&&sbClient?'checking':'no';
  const signInBanner=`<div id="signin-banner"></div>`;

  return `
    ${signInBanner}
    <div style="text-align:center;margin-bottom:12px;">
      <div style="font-size:12px;color:var(--muted);">${greeting}, Morgan</div>
    </div>

    ${daysLeft>0?`
    <div style="background:linear-gradient(135deg,rgba(232,160,184,0.08),rgba(240,192,212,0.04));border:1px solid rgba(232,160,184,0.15);border-radius:16px;padding:14px;margin-bottom:12px;text-align:center;">
      <div style="font-size:8px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;margin-bottom:6px;">✈️ Trip Countdown</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:42px;color:var(--accent);line-height:1;">${daysLeft}</div>
      <div style="font-size:10px;color:var(--muted);margin-top:2px;">days left</div>
      ${lbsToGo>0?`<div style="font-size:11px;color:var(--text);margin-top:8px;">${lbsToGo.toFixed(1)} lb to go · <span style="color:var(--accent);">${lbsPerWeek} lb/week</span> to hit goal</div>`
      :`<div style="font-size:11px;color:var(--green);margin-top:8px;">Goal reached! 🎉</div>`}
    </div>`:''}

    <div class="card" style="text-align:center;">
      <div style="display:flex;justify-content:space-around;margin-bottom:12px;">
        <div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:36px;color:var(--accent);line-height:1;">${day.caloriesIn}</div>
          <div style="font-size:8px;color:var(--muted);letter-spacing:1px;margin-top:3px;">EATEN</div>
        </div>
        <div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:36px;color:var(--green);line-height:1;">${day.caloriesBurned}</div>
          <div style="font-size:8px;color:var(--muted);letter-spacing:1px;margin-top:3px;">BURNED</div>
        </div>
        <div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:36px;color:${net>0?'var(--text)':'var(--green)'};line-height:1;">${net}</div>
          <div style="font-size:8px;color:var(--muted);letter-spacing:1px;margin-top:3px;">NET</div>
        </div>
      </div>
    </div>

    ${stats?`
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--accent);line-height:1;">${stats.current} lb</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px;">${stats.totalLost>=0?stats.totalLost.toFixed(1)+' lb lost':''+Math.abs(stats.totalLost).toFixed(1)+' lb gained'}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:10px;color:var(--dim);">${Math.round(stats.progress)}% to goal</div>
          <div style="width:80px;margin-top:4px;">
            <div class="progress-track"><div class="progress-fill" style="width:${stats.progress}%;"></div></div>
          </div>
          <div style="font-size:9px;color:var(--dim);margin-top:2px;">${stats.toGo>0?stats.toGo.toFixed(1)+' lb to go':'Goal reached!'}</div>
        </div>
      </div>
    </div>`:''}

    <div style="font-size:8px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;margin-bottom:8px;">Today's meals</div>
    ${mealRows||'<div style="font-size:12px;color:var(--dim);margin-bottom:8px;">No meals logged yet</div>'}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
      <button class="btn primary" style="width:100%;" onclick="openQuickAdd()">+ ADD MEAL</button>
      <button class="btn ghost" style="width:100%;" onclick="openWeighIn()">${todayW?'⚖️ '+todayW.weight+' LB':'⚖️ WEIGH IN'}</button>
      <button class="btn ghost" style="width:100%;" onclick="openBurnedModal()">🔥 ${day.caloriesBurned} BURNED</button>
      <button class="btn ghost" style="width:100%;" onclick="openCaloriesConsumedModal()">🍽 ${day.caloriesIn} EATEN</button>
    </div>

    <div style="display:flex;gap:8px;margin-top:8px;">
      <button onclick="copyPrompt()" style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:14px;padding:10px;cursor:pointer;text-align:left;">
        <div style="font-size:10px;color:var(--accent);margin-bottom:2px;">ASK CHATGPT</div>
        <div style="font-size:9px;color:var(--dim);">Copy prompt → tell it what you ate</div>
      </button>
      <button onclick="openPasteResult()" style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:14px;padding:10px;cursor:pointer;text-align:left;">
        <div style="font-size:10px;color:var(--accent);margin-bottom:2px;">PASTE RESULT</div>
        <div style="font-size:9px;color:var(--dim);">Paste ChatGPT's answer here</div>
      </button>
    </div>

    ${state.streak>1?`<div style="text-align:center;margin-top:10px;font-size:11px;color:var(--accent);">🔥 ${state.streak} day weigh-in streak</div>`:''}
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

// ── Modals ──
function openQuickAdd(){
  showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:14px;">ADD MEAL</div>
    <input id="qa-name" class="input" placeholder="What did you eat?" style="margin-bottom:8px;"/>
    <input id="qa-cal" class="input" type="number" inputmode="numeric" placeholder="Calories" style="margin-bottom:14px;"/>
    <button class="btn primary" style="width:100%;" onclick="addMeal(document.getElementById('qa-name').value,document.getElementById('qa-cal').value);hideModal();">ADD</button>
    <button class="btn ghost" style="width:100%;margin-top:8px;" onclick="hideModal()">CANCEL</button>
    <div style="border-top:1px solid var(--border);margin-top:14px;padding-top:14px;">
      <div style="font-size:10px;color:var(--dim);margin-bottom:8px;">Don't know the calories?</div>
      <button class="btn ghost small" style="width:100%;" onclick="hideModal();copyPrompt();">COPY CHATGPT PROMPT</button>
    </div>
  `);
  setTimeout(()=>{const i=document.getElementById('qa-name');if(i)i.focus();},100);
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

// Check sign-in status and show banner if needed
async function checkSignInBanner(){
  const el=document.getElementById('signin-banner');
  if(!el) return;
  const user=await getUser();
  if(user){
    el.innerHTML='';
  } else {
    el.innerHTML=`
      <div style="background:rgba(232,160,184,0.08);border:1px solid rgba(232,160,184,0.2);border-radius:14px;padding:14px;margin-bottom:12px;">
        <div style="font-size:11px;color:var(--accent);font-weight:600;margin-bottom:6px;">Back up your data</div>
        <div style="font-size:10px;color:var(--muted);margin-bottom:10px;">Sign in so you never lose your progress</div>
        <div style="display:flex;gap:8px;">
          <input id="home-email" class="input" type="email" placeholder="email" style="flex:1;font-size:12px;padding:8px 10px;"/>
          <input id="home-pass" class="input" type="password" placeholder="password" style="flex:1;font-size:12px;padding:8px 10px;"/>
        </div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button onclick="document.getElementById('sync-email')||0;homeSignIn()" class="btn primary small" style="flex:1;">SIGN IN</button>
          <button onclick="homeSignUp()" class="btn ghost small" style="flex:1;">SIGN UP</button>
        </div>
      </div>`;
  }
}
async function homeSignIn(){
  const c=getSB(); if(!c){showToast('Sync not available');return;}
  const email=document.getElementById('home-email')?.value?.trim();
  const pass=document.getElementById('home-pass')?.value;
  if(!email||!pass){showToast('Enter email and password');return;}
  const {error}=await c.auth.signInWithPassword({email,password:pass});
  if(error){showToast('Error: '+error.message);return;}
  showToast('Signed in — syncing...');
  const cloud=await syncFromCloud();
  if(cloud){state={...defaultState(),...cloud};save();}
  render();
}
async function homeSignUp(){
  const c=getSB(); if(!c){showToast('Sync not available');return;}
  const email=document.getElementById('home-email')?.value?.trim();
  const pass=document.getElementById('home-pass')?.value;
  if(!email||!pass){showToast('Enter email and password');return;}
  const {error}=await c.auth.signUp({email,password:pass});
  if(error){showToast('Error: '+error.message);return;}
  showToast('Account created — check email to confirm, then sign in');
}

// ── Init ──
render();
setTimeout(checkSignInBanner,500);
