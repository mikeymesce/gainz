// ═══════════════════════════════════════════
// APP LEGACY — Main application logic
// Constants & utils loaded via js/main.js (ES module)
// which sets them on window before this script runs.
// ═══════════════════════════════════════════

// ── Action Dispatcher ──
function dispatch(action, payload = {}) {
  if (FEATURES.devMode) console.log('[GAINZ dispatch]', action, payload);
  save();
  render();
}

// ── Computed Stats Cache ──
let statsCache = { dirty: true, tonnage: 0, prCount: 0, lastCalc: 0 };
window.statsCache = statsCache;

// ═══════════════════════════════════════════

let activeTheme = localStorage.getItem("gainz_theme")||"dark";
function applyTheme(t){
  document.documentElement.classList.remove('theme-light','theme-pink');
  if(t==='light') document.documentElement.classList.add('theme-light');
  else if(t==='pink') document.documentElement.classList.add('theme-pink');
  activeTheme=t;
  localStorage.setItem('gainz_theme',t);
}

// ── State load with validation + migration ──
let _rawState = null;
try {
  _rawState = JSON.parse(localStorage.getItem("gainz_v5") || "null");
} catch(e) {
  logDebug("❌ State parse error — resetting to defaults");
  setTimeout(()=>showToast("Data restored to defaults"), 500);
}
let state = migrateState(_rawState);
let activeWorkout = null;
let screen = "start";
let historyDetail = null;
let progressEx = null;
let collapsedEx = new Set();
let doneExSet   = new Set(); // exercises marked done this session
let renamingEx = null;

// Expose state and mutable vars for extracted modules
window.state = state;
Object.defineProperty(window, 'activeWorkout', {
  get() { return activeWorkout; }, set(v) { activeWorkout = v; }, configurable: true
});
Object.defineProperty(window, 'appScreen', {
  get() { return screen; }, set(v) { screen = v; }, configurable: true
});
Object.defineProperty(window, 'historyDetail', {
  get() { return historyDetail; }, set(v) { historyDetail = v; }, configurable: true
});
Object.defineProperty(window, 'histEditMode', {
  get() { return histEditMode; }, set(v) { histEditMode = v; }, configurable: true
});
// Apply theme after state vars initialized
applyTheme(activeTheme);
// Navigation helper for modules that can't access `screen` (let, not on window)
function navigateTo(s, tab) { screen = s; if(tab !== undefined) meTab = tab; render(); }

// ── Timer Bar Tap → Scroll to Exercise ──
function scrollToTimerEx(){
  const name = getTimerExercise();
  if(!name) return;
  if(screen !== "log"){ screen = "log"; render(); }
  setTimeout(()=>{
    const el = document.getElementById("ex-" + sid(name));
    if(el) el.scrollIntoView({behavior:"smooth", block:"center"});
  }, 80);
}

// ── Cloud Sync UI Handlers ──
function friendlyAuthError(msg){
  const m=(msg||'').toLowerCase();
  if(m.includes('invalid login')) return 'Wrong email or password. Try again.';
  if(m.includes('email not confirmed')) return 'Check your email and click the confirmation link first.';
  if(m.includes('already registered')||m.includes('already been registered')) return 'That email already has an account. Try signing in instead.';
  if(m.includes('invalid email')) return 'That doesn\'t look like a valid email address.';
  if(m.includes('weak password')||m.includes('at least')) return 'Password needs to be at least 6 characters.';
  if(m.includes('rate limit')||m.includes('too many')) return 'Too many attempts. Wait a minute and try again.';
  if(m.includes('network')||m.includes('fetch')) return 'No internet connection. Try again when you\'re back online.';
  return msg||'Something went wrong. Try again.';
}
async function cloudSignIn(){
  const email=document.getElementById('sync-email')?.value?.trim();
  const pass=document.getElementById('sync-pass')?.value;
  if(!email||!pass){showToast('Enter email and password');return;}
  const errEl=document.getElementById('sync-error');
  const {error}=await signIn(email,pass);
  if(error){
    if(errEl){errEl.textContent=friendlyAuthError(error.message);errEl.style.display='block';}
    return;
  }
  showToast('Signed in — syncing...');
  const cloud=await syncFromCloud();
  if(cloud){
    Object.assign(state,migrateState(cloud));
    localStorage.setItem('gainz_v5',JSON.stringify(state));
    showToast('Data synced from cloud');
  }
  render();
}
async function cloudSignUp(){
  const email=document.getElementById('sync-email')?.value?.trim();
  const pass=document.getElementById('sync-pass')?.value;
  if(!email){showToast('Enter your email');return;}
  if(!pass||pass.length<6){showToast('Password needs at least 6 characters');return;}
  const errEl=document.getElementById('sync-error');
  const {error}=await signUp(email,pass);
  if(error){
    if(errEl){errEl.textContent=friendlyAuthError(error.message);errEl.style.display='block';}
    return;
  }
  showToast('Check your email for the confirmation link!');
  if(errEl){errEl.textContent='✓ Account created! Check your email inbox (and spam) for a confirmation link. Once confirmed, come back and sign in.';errEl.style.display='block';errEl.style.color='var(--green)';}
}
async function cloudResetPw(){
  const email=document.getElementById('sync-email')?.value?.trim();
  if(!email){showToast('Type your email above first');return;}
  const {error}=await resetPassword(email);
  if(error){showToast(friendlyAuthError(error.message));return;}
  showToast('Password reset email sent — check your inbox');
}
async function cloudSignOut(){
  await signOut();
  showToast('Signed out');
  render();
}
async function cloudSyncNow(){
  showToast('Syncing...');
  const cloud=await syncFromCloud();
  if(cloud){
    Object.assign(state,migrateState(cloud));
    localStorage.setItem('gainz_v5',JSON.stringify(state));
    showToast('Data pulled from cloud');
    render();
  } else {
    await syncToCloud();
    showToast('Data pushed to cloud');
    render();
  }
}

// ── Sync on App Load ──
setTimeout(async ()=>{
  if(!syncFromCloud) return;
  try{
    const cloud=await syncFromCloud();
    if(cloud){
      Object.assign(state,migrateState(cloud));
      localStorage.setItem('gainz_v5',JSON.stringify(state));
      render();
    }
  }catch(e){console.warn('[GAINZ] Load sync failed:',e);}
},1000);

// ═══════════════════════════════════════════
// EXERCISE PICKER — persistent, never rebuilt
// This is the fix. The picker sheet lives in the
// DOM permanently. We only update its list content,
// never destroy it. iOS Safari can always find it.
// ═══════════════════════════════════════════
let pickerFilter = "all";

function setPickerFilter(f){
  pickerFilter = f;
  document.getElementById("filter-all").classList.toggle("active", f==="all");
  document.getElementById("filter-research").classList.toggle("active", f==="research");
  document.getElementById("filter-stacks").classList.toggle("active", f==="stacks");
  const customBar = document.getElementById("ex-picker-custom");
  if(customBar) customBar.style.display = f==="stacks" ? "none" : "";
  rebuildPickerList();
}

function rebuildPickerList(){
  if(!activeWorkout) return;
  const list = document.getElementById("ex-picker-list");
  if(pickerFilter==="stacks"){
    const stacks = state.stacks||[];
    if(!stacks.length){
      list.innerHTML = `<div style="color:var(--dim);font-size:13px;padding:16px 0;text-align:center;">No stacks yet.<br><span style="font-size:11px;color:var(--muted);">Build one in Settings → Stacks.</span></div>`;
      return;
    }
    list.innerHTML = stacks.map(st=>{
      const already = activeWorkout.exercises.map(e=>e.name);
      const newCount = st.exercises.filter(e=>!already.includes(e)).length;
      return `<button class="pick-btn stack-btn" data-stack="${st.id}" style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;">
        <div style="text-align:left;">
          <div style="font-size:13px;font-weight:600;">${st.name}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px;">${st.exercises.join(", ")}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;margin-left:10px;">
          <div style="font-size:11px;color:var(--accent);">+${newCount}</div>
          <div style="font-size:9px;color:var(--dim);">exercises</div>
        </div>
      </button>`;
    }).join("");
    return;
  }
  let avail = activeWorkout.split==="Quick"
    ? [...new Set(Object.values(ALL_SPLITS).flat())].filter(e=>!activeWorkout.exercises.find(x=>x.name===e))
    : (ALL_SPLITS[activeWorkout.split]||[]).filter(e=>!activeWorkout.exercises.find(x=>x.name===e));
  if(pickerFilter==="research") avail = avail.filter(e=>!!RESEARCH_TIPS[e]);
  const hasRes = ex => !!RESEARCH_TIPS[ex];
  list.innerHTML = avail.map(ex=>
    `<button class="pick-btn${hasRes(ex)?" has-research":""}" data-ex="${ex}">${ex}${hasRes(ex)?`<span class="pick-badge">📚</span>`:""}</button>`
  ).join("") + (avail.length===0 ? `<div style="color:var(--dim);font-size:13px;padding:8px 0;">${pickerFilter==="research"?"No researched exercises left to add!":"All exercises added!"}</div>` : "");
}

function openPicker(){
  if(!activeWorkout) return;
  rebuildPickerList();
  document.getElementById("ex-picker").classList.add("open");
  document.getElementById("custom-ex-input").value="";
}

// Research Library
function closePicker(){
  swappingEx=null;
  document.getElementById("ex-picker").classList.remove("open");
}

// Single event listener on the persistent list — never removed
document.getElementById("ex-picker-list").addEventListener("click", function(e){
  const btn = e.target.closest(".pick-btn");
  if(!btn) return;
  // Stack tap
  const stackId = btn.getAttribute("data-stack");
  if(stackId){
    const st = (state.stacks||[]).find(s=>s.id===stackId);
    if(st){ closePicker(); applyStack(st); }
    return;
  }
  // Single exercise tap
  const name = btn.getAttribute("data-ex");
  if(name){
    closePicker();
    if(swappingEx){ swapExercise(swappingEx, name); swappingEx=null; }
    else addExercise(name);
  }
});

// ─── STACKS ─────────────────────────────────────
function applyStack(st){
  if(!activeWorkout||!st) return;
  const already = activeWorkout.exercises.map(e=>e.name);
  const toAdd = st.exercises.filter(e=>!already.includes(e));
  toAdd.forEach(name=>addExercise(name));
  const skipped = st.exercises.length - toAdd.length;
  if(toAdd.length) showToast(toAdd.length + " exercise" + (toAdd.length>1?"s":"") + " added" + (skipped?" ("+skipped+" already in workout)":""));
  else showToast("All exercises already in workout");
  logDebug("⚡ Stack applied: " + st.name);
}
function stackId(){ return Math.random().toString(36).slice(2,9); }
function openNewStackModal(){
  const allEx = [...new Set(Object.values(ALL_SPLITS).flat())];
  showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:14px;">NEW STACK</div>
    <input id="stack-name-input" class="input" placeholder="Stack name (e.g. Core, Finisher…)" style="font-size:14px;margin-bottom:12px;" maxlength="30"/>
    <div style="font-size:10px;letter-spacing:1.5px;color:var(--dim);margin-bottom:8px;">PICK EXERCISES</div>
    <div id="stack-ex-grid" style="display:flex;flex-wrap:wrap;gap:6px;max-height:200px;overflow-y:auto;margin-bottom:16px;">
      ${allEx.map(ex=>`<button class="stack-ex-chip" data-ex="${ex}" onclick="toggleStackChip(this)">${ex}</button>`).join("")}
    </div>
    <div style="font-size:10px;color:var(--dim);margin-bottom:14px;">Or add a custom exercise:</div>
    <div style="display:flex;gap:8px;margin-bottom:16px;">
      <input id="stack-custom-input" class="input" placeholder="custom…" style="font-size:13px;flex:1;" maxlength="50"/>
      <button class="btn ghost small" onclick="addCustomStackChip()">ADD</button>
    </div>
    <div style="display:flex;gap:8px;">
      <button class="btn ghost" onclick="hideModal()" style="flex:1;">CANCEL</button>
      <button class="btn primary" onclick="saveNewStack()" style="flex:1;">SAVE STACK</button>
    </div>
  `);
  setTimeout(()=>document.getElementById("stack-name-input")?.focus(), 80);
}
function toggleStackChip(btn){
  btn.classList.toggle("selected");
}
function addCustomStackChip(){
  const inp = document.getElementById("stack-custom-input");
  const val = sanitize(inp?.value||"");
  if(!val) return;
  const grid = document.getElementById("stack-ex-grid");
  if(!grid) return;
  // avoid duplicate chips
  const existing = Array.from(grid.querySelectorAll(".stack-ex-chip")).map(b=>b.getAttribute("data-ex"));
  if(existing.includes(val)){ showToast("Already in list"); return; }
  const chip = document.createElement("button");
  chip.className = "stack-ex-chip selected";
  chip.setAttribute("data-ex", val);
  chip.textContent = val;
  chip.onclick = function(){ this.classList.toggle("selected"); };
  grid.appendChild(chip);
  if(inp) inp.value = "";
}
function saveNewStack(){
  const nameEl = document.getElementById("stack-name-input");
  const name = sanitize(nameEl?.value||"").trim();
  if(!name){ showToast("Give your stack a name"); return; }
  const chips = document.querySelectorAll(".stack-ex-chip.selected");
  const exercises = Array.from(chips).map(b=>b.getAttribute("data-ex")).filter(Boolean);
  if(!exercises.length){ showToast("Pick at least one exercise"); return; }
  if(!state.stacks) state.stacks=[];
  state.stacks.push({id:stackId(), name, exercises});
  save(); hideModal(); render();
  showToast("Stack saved: " + name);
  logDebug("⚡ Stack created: " + name);
}
function openEditStackModal(id){
  const st = (state.stacks||[]).find(s=>s.id===id);
  if(!st) return;
  const allEx = [...new Set(Object.values(ALL_SPLITS).flat())];
  // merge: standard + any custom ones already in this stack
  const merged = [...new Set([...allEx, ...st.exercises])];
  showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:14px;">EDIT STACK</div>
    <input id="stack-name-input" class="input" value="${st.name}" style="font-size:14px;margin-bottom:12px;" maxlength="30"/>
    <div style="font-size:10px;letter-spacing:1.5px;color:var(--dim);margin-bottom:8px;">EXERCISES</div>
    <div id="stack-ex-grid" style="display:flex;flex-wrap:wrap;gap:6px;max-height:200px;overflow-y:auto;margin-bottom:16px;">
      ${merged.map(ex=>`<button class="stack-ex-chip${st.exercises.includes(ex)?" selected":""}" data-ex="${ex}" onclick="toggleStackChip(this)">${ex}</button>`).join("")}
    </div>
    <div style="font-size:10px;color:var(--dim);margin-bottom:14px;">Or add a custom exercise:</div>
    <div style="display:flex;gap:8px;margin-bottom:16px;">
      <input id="stack-custom-input" class="input" placeholder="custom…" style="font-size:13px;flex:1;" maxlength="50"/>
      <button class="btn ghost small" onclick="addCustomStackChip()">ADD</button>
    </div>
    <div style="display:flex;gap:8px;">
      <button class="btn ghost" onclick="hideModal()" style="flex:1;">CANCEL</button>
      <button class="btn primary" onclick="saveEditStack('${id}')" style="flex:1;">SAVE</button>
    </div>
  `);
}
function saveEditStack(id){
  const st = (state.stacks||[]).find(s=>s.id===id);
  if(!st) return;
  const nameEl = document.getElementById("stack-name-input");
  const name = sanitize(nameEl?.value||"").trim();
  if(!name){ showToast("Name required"); return; }
  const chips = document.querySelectorAll(".stack-ex-chip.selected");
  const exercises = Array.from(chips).map(b=>b.getAttribute("data-ex")).filter(Boolean);
  if(!exercises.length){ showToast("Pick at least one exercise"); return; }
  st.name=name; st.exercises=exercises;
  save(); hideModal(); render();
  showToast("Stack updated");
}
function deleteStack(id){
  if(!confirm("Delete this stack?")) return;
  state.stacks = (state.stacks||[]).filter(s=>s.id!==id);
  save(); render();
  showToast("Stack deleted");
}
// ─────────────────────────────────────────────────

function addCustomExercise(){
  const inp = document.getElementById("custom-ex-input");
  const name = (inp?.value||"").trim();
  if(!name || !activeWorkout) return;
  if(activeWorkout.exercises.find(e=>e.name===name)) return;
  closePicker();
  addExercise(name);
}

// ═══════════════════════════════════════════
// GENERAL MODAL
// ═══════════════════════════════════════════
function showModal(h){ document.getElementById("modal-inner").innerHTML=h; document.getElementById("modal").classList.add("open"); }
function hideModal(){ document.getElementById("modal").classList.remove("open"); }

function showRestEditor(ex){
  const cur=state.exerciseRests[ex]??GLOBAL_DEFAULT;
  showModal(`
    <div style="font-size:13px;color:var(--accent);margin-bottom:14px;">${ex}</div>
    <span class="label">REST (seconds)</span>
    <input class="input" type="number" id="rest-inp" value="${cur}" inputmode="numeric" style="margin-bottom:14px;"/>
    <button class="btn primary" onclick="saveRest(${esc(ex)})">SAVE</button>
    <button class="btn ghost" onclick="hideModal()">CANCEL</button>
  `);
  setTimeout(()=>document.getElementById("rest-inp")?.focus(),100);
}
function saveRest(ex){
  const v=parseInt(document.getElementById("rest-inp").value);
  if(v>0){ state.exerciseRests[ex]=v; save(); }
  hideModal(); render();
}
function confirmFinish(){
  const exCount=activeWorkout.exercises.length;
  const setCount=activeWorkout.exercises.reduce((a,e)=>a+e.sets.length,0);
  const totalVol=activeWorkout.exercises.reduce((a,e)=>a+vol(e.sets),0);
  const prCount=activeWorkout.exercises.reduce((a,e)=>a+e.sets.filter(s=>s.pr).length,0);
  const durMs=Date.now()-activeWorkout.startTime;
  const durMins=Math.round(durMs/60000);
  showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:14px;">FINISH WORKOUT?</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px;">
      <div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:12px;padding:12px;text-align:center;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--accent);line-height:1;">${totalVol>0?totalVol.toLocaleString():"—"}</div>
        <div style="font-size:8px;color:var(--muted);letter-spacing:1px;margin-top:3px;text-transform:uppercase;">LB Moved</div>
      </div>
      <div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:12px;padding:12px;text-align:center;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--accent);line-height:1;">${durMins}m</div>
        <div style="font-size:8px;color:var(--muted);letter-spacing:1px;margin-top:3px;text-transform:uppercase;">Duration</div>
      </div>
      <div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:12px;padding:12px;text-align:center;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--accent);line-height:1;">${setCount}</div>
        <div style="font-size:8px;color:var(--muted);letter-spacing:1px;margin-top:3px;text-transform:uppercase;">Sets</div>
      </div>
      <div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:12px;padding:12px;text-align:center;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;color:${prCount>0?'#52c87a':'var(--dim)'};line-height:1;">${prCount>0?prCount:'—'}</div>
        <div style="font-size:8px;color:var(--muted);letter-spacing:1px;margin-top:3px;text-transform:uppercase;">PR${prCount!==1?'s':''}</div>
      </div>
    </div>
    <button class="btn primary" onclick="hideModal();finishWorkout()">FINISH ✓</button>
    <button class="btn ghost" onclick="hideModal()" style="margin-top:8px;">KEEP GOING</button>
  `);
}

// ═══════════════════════════════════════════
// RENAME
// ═══════════════════════════════════════════
function startRename(n){
  renamingEx=n; render();
  setTimeout(()=>{ const i=document.getElementById("rin-"+sid(n)); if(i){i.focus();i.select();} },50);
}
function commitRename(old){
  const i=document.getElementById("rin-"+sid(old)); if(!i) return;
  const nw=i.value.trim();
  if(!nw||nw===old||!activeWorkout){ renamingEx=null; render(); return; }
  // Prevent duplicate names
  if(activeWorkout.exercises.some(e=>e.name===nw)){ renamingEx=null; render(); return; }
  // Rename the exercise and update any ssPair references
  activeWorkout.exercises=activeWorkout.exercises.map(e=>{
    let updated=e;
    if(e.name===old) updated={...updated,name:nw};
    if(e.ssPair===old) updated={...updated,ssPair:nw};
    return updated;
  });
  // Migrate exerciseRests
  if(state.exerciseRests[old]!==undefined){ state.exerciseRests[nw]=state.exerciseRests[old]; delete state.exerciseRests[old]; save(); }
  // Migrate collapsed state
  if(collapsedEx.has(old)){ collapsedEx.delete(old); collapsedEx.add(nw); }
  // Update name-keyed UI state
  if(activeSSPrompt===old) activeSSPrompt=nw;
  if(ssPickerOpen===old) ssPickerOpen=nw;
  if(exMenuOpen===old) exMenuOpen=nw;
  renamingEx=null; render();
}
function cancelRename(){ renamingEx=null; render(); }
function openRenameSplit(key){
  const cur=splitName(key);
  showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:14px;">${key.toUpperCase()} &rsaquo; RENAME</div>
    <input id="rename-split-input" class="input" value="${cur}" style="font-size:15px;margin-bottom:16px;" maxlength="20" placeholder="e.g. Upper, Lower, Chest..."/>
    <div style="display:flex;gap:8px;">
      <button class="btn ghost" onclick="hideModal()" style="flex:1;">CANCEL</button>
      <button class="btn primary" onclick="commitRenameSplit('${key}')" style="flex:1;">SAVE</button>
    </div>
  `);
  setTimeout(()=>{ const el=document.getElementById('rename-split-input'); if(el){el.focus();el.select();} },80);
}
function commitRenameSplit(key){
  const input=document.getElementById('rename-split-input');
  if(!input) return;
  const val=sanitize(input.value)||key;
  if(!state.splitNames) state.splitNames={Push:"Push",Pull:"Pull",Legs:"Legs"};
  state.splitNames[key]=val||key;
  save(); hideModal(); render();
  logDebug("✏ Renamed split: "+key+" -> "+val);
}

// ═══════════════════════════════════════════
// WORKOUT ACTIONS
// ═══════════════════════════════════════════
let setHistory=[];
let autoSaveInterval=null;
let histFilter='All';
let histSearchTerm='';
let workoutSummary=null;
let funStatIdx=-1; // -1 = use daily rotation, 0+ = manual cycle
let expandedLastSession=new Set();
let activeSSPrompt=null; // name of exercise user should do next in superset
let ssPickerOpen=null;  // exercise name whose SS picker is open
let exMenuOpen=null;    // exercise name whose ⋮ overflow menu is open
let histEditMode=false;
let histEditDirty=false; // track if edits were made
let histEditSnapshot=null; // snapshot before editing
let meTab="history";
let progressSearch="";
function quickStart(){
  const splits=getActiveSplits();
  const EXTRAS=[
    {key:'_cardio',label:'Cardio',icon:'🏃',color:'#26de81',action:'openCardioLog()'},
    {key:'HIIT',label:'HIIT',icon:'⚡',color:'#ff4757'},
    {key:'Yoga',label:'Yoga',icon:'🧘',color:'#7ecba1'},
    {key:'Jiu Jitsu',label:'BJJ',icon:'🥋',color:'#5b8fff'},
    {key:'Rock Climbing',label:'Climb',icon:'🧗',color:'#e8c050'},
    {key:'Cycle Bar',label:'Cycle',icon:'🚴',color:'#ff6b35'},
    {key:'Core Power',label:'Core Pwr',icon:'🔥',color:'#a78bfa'},
    {key:'Kettlebell',label:'Kettlebell',icon:'🏋️',color:'#e8c050'},
  ];
  const rec=getRec();
  const splitBtns=splits.map(s=>{
    const isRec=s===rec;
    return `<button onclick="hideModal();startWorkout('${s}')" style="flex:1;min-width:70px;background:${isRec?'rgba(232,213,160,0.1)':'var(--bg3)'};border:1px solid ${isRec?'var(--accent)':'var(--border2)'};border-radius:12px;padding:12px 8px;cursor:pointer;text-align:center;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:15px;color:${isRec?'var(--accent)':'var(--muted)'};">${splitName(s)}</div>
      ${isRec?'<div style="font-size:7px;color:var(--accent);margin-top:2px;">SUGGESTED</div>':''}
    </button>`;
  }).join('');
  const extraBtns=EXTRAS.map(e=>`
    <button onclick="hideModal();${e.action||"startWorkout('"+e.key+"')"}" style="background:${e.color}11;border:1px solid ${e.color}33;border-radius:10px;padding:8px 12px;cursor:pointer;text-align:center;">
      <span style="font-size:14px;">${e.icon}</span>
      <span style="font-size:11px;color:${e.color};margin-left:4px;">${e.label}</span>
    </button>`).join('');

  showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:14px;">START WORKOUT</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;">${splitBtns}</div>
    <div style="font-size:8px;letter-spacing:2px;color:var(--dim);margin-bottom:8px;">ACTIVITIES</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">${extraBtns}</div>
    <button onclick="hideModal();startWorkout('Quick')" class="btn ghost" style="width:100%;">QUICK START — ALL EXERCISES</button>
    <button class="btn ghost" onclick="hideModal()" style="width:100%;margin-top:8px;color:var(--dim);">CANCEL</button>
  `);
}
function startWorkout(split){
  activeWorkout={split,exercises:[],startTime:Date.now(),notes:""};
  setHistory=[];
  screen="log";
  startWoTimer();
  requestWakeLock();
  logDebug("🏋️ Workout started: " + split);
  // Auto-save every 20s during workout
  clearInterval(autoSaveInterval);
  autoSaveInterval=setInterval(()=>{
    if(activeWorkout){ try{ localStorage.setItem("gainz_recovery",JSON.stringify(activeWorkout)); }catch(e){} }
    else{ clearInterval(autoSaveInterval); }
  },20000);
  // Smart Start: auto-load exercises from last same-split workout
  const lastSame=state.workouts.find(w=>w.split===split);
  if(lastSame){
    lastSame.exercises.forEach(e=>addExercise(e.name));
    render();
    showToast('Loaded last '+splitName(split)+' day');
  } else {
    render();
    setTimeout(openPicker, 100);
  }
}
function initSwipeCollapse(){
  const content=document.getElementById("content");
  if(!content||content._swipeInited) return;
  content._swipeInited=true;
  let tx=0,ty=0,target=null;
  content.addEventListener("touchstart",function(e){
    tx=e.touches[0].clientX; ty=e.touches[0].clientY; target=e.target;
  },{passive:true});
  content.addEventListener("touchend",function(e){
    const dx=e.changedTouches[0].clientX-tx;
    const dy=e.changedTouches[0].clientY-ty;
    if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5){
      // Find nearest card
      const card=target.closest(".card[id^='ex-']");
      if(card&&activeWorkout){
        const id=card.id.replace("ex-","");
        const ex=activeWorkout.exercises.find(e=>sid(e.name)===id);
        if(ex&&!collapsedEx.has(ex.name)){
          collapsedEx.add(ex.name);
          card.style.transition="transform 0.2s ease,opacity 0.2s ease";
          card.style.transform="translateX("+(dx>0?"60px":"-60px")+")";
          card.style.opacity="0.3";
          setTimeout(()=>render(),180);
        }
      }
    }
  },{passive:true});
}
function initSetSwipes(){
  document.querySelectorAll(".set-row[data-ex]").forEach(row=>{
    if(row._swipeInited) return;
    row._swipeInited=true;
    let tx=0,ty=0;
    row.addEventListener("touchstart",e=>{tx=e.touches[0].clientX;ty=e.touches[0].clientY;},{passive:true});
    row.addEventListener("touchend",e=>{
      const dx=e.changedTouches[0].clientX-tx;
      const dy=e.changedTouches[0].clientY-ty;
      if(dx<-55&&Math.abs(dy)<40){
        const exName=row.dataset.ex;
        const idx=parseInt(row.dataset.idx);
        if(!isNaN(idx)&&exName){
          haptic("medium");
          row.style.transition="transform 0.2s,opacity 0.2s";
          row.style.transform="translateX(-80px)";
          row.style.opacity="0.2";
          setTimeout(()=>deleteSet(exName,idx),160);
        }
      }
    },{passive:true});
  });
}
function addExercise(name){
  if(!activeWorkout||activeWorkout.exercises.find(e=>e.name===name)) return;
  const isBW=BW_EXERCISES.has(name);
  activeWorkout.exercises.push({name,sets:[],superset:false,ssPair:null,bwMode:isBW,notes:"",warmupNext:false});
  render();
  setTimeout(()=>{ const el=document.getElementById("ex-"+sid(name)); if(el) el.scrollIntoView({behavior:"smooth",block:"center"}); },80);
  maybeShowCoachTip(activeWorkout);
}
function logSet(n){
  const id=sid(n);
  const ex=activeWorkout.exercises.find(e=>e.name===n);
  const bw=ex?.bwMode;
  const wEl=document.getElementById("w-"+id);
  const rEl=document.getElementById("r-"+id);
  let w=bw?"BW":(wEl?.value||wEl?.placeholder||"").trim();
  let r=(rEl?.value||rEl?.placeholder||"").trim();
  // If fields empty, fall back: last set this session → last session → default 135/10
  const lastThisSession=ex?.sets?.length?ex.sets[ex.sets.length-1]:null;
  const lastSession=getLastSession(n);
  const fallback=lastThisSession||lastSession?.sets?.slice(-1)[0];
  if(!bw){
    if(!w&&fallback&&!fallback.bw) w=fallback.weight;
    if(!w) w="135";
  }
  if(!r&&fallback) r=fallback.reps;
  if(!r) r="10";
  if(!r||((!bw)&&!w)){ showToast("Enter weight and reps first"); return; }
  const isWarmup=!!activeWorkout.exercises.find(e=>e.name===n)?.warmupNext;
  const wasPR=!bw&&isPR(n,w,isWarmup,activeWorkout);
  const newSet={weight:bw?"BW":w,reps:r,time:Date.now(),bw:!!bw,pr:wasPR||undefined,warmup:isWarmup||undefined};
  // reset warmupNext after consuming it
  const _ex=activeWorkout.exercises.find(e=>e.name===n);
  if(_ex) _ex.warmupNext=false;
  if(ex) ex.sets.push(newSet);
  setHistory.push({exerciseName:n,set:newSet});
  // crash recovery save
  try{ localStorage.setItem("gainz_recovery", JSON.stringify(activeWorkout)); }catch(e){}
  haptic("light");
  // Superset flow: after logging, prompt partner; start rest after both have logged
  if(ex?.superset && ex?.ssPair){
    const wasPrompted=activeSSPrompt===n;
    if(wasPrompted){
      // Both done this round — rest using the LONGER of the two exercise rest settings
      const restA=state.exerciseRests[n]??GLOBAL_DEFAULT;
      const restB=state.exerciseRests[ex.ssPair]??GLOBAL_DEFAULT;
      const rest=Math.max(restA,restB);
      startTimerRaw(rest, n.toUpperCase());
      activeSSPrompt=ex.ssPair; // after rest, go back to partner
    } else {
      // First exercise done — no timer, just prompt partner
      activeSSPrompt=ex.ssPair;
    }
    render();
    setTimeout(()=>{ const el=document.getElementById('ex-'+sid(ex.ssPair)); if(el) el.scrollIntoView({behavior:'smooth',block:'center'}); },100);
  } else {
    startTimer(n);
  }
  logDebug("✅ Set logged: " + n + " " + (bw?"BW":w) + "x" + r);
  // Auto-credit reps to 30-day challenge if active
  if(state.challenge && state.challenge.active){
    const nameLower=n.toLowerCase();
    const repsNum=parseInt(r)||0;
    if(repsNum>0){
      if(/push[\s-]?up/.test(nameLower)){
        addChallengeQuickSilent('push', repsNum);
        logDebug("🎯 Challenge: +" + repsNum + " push-ups from workout");
      } else if(/squat/i.test(nameLower)){
        addChallengeQuickSilent('sit', repsNum);
        logDebug("🎯 Challenge: +" + repsNum + " squats from workout");
      } else if(state.challenge.secondEx!=='squats' && /sit[\s-]?up|crunch|ab\s?wheel/.test(nameLower)){
        addChallengeQuickSilent('sit', repsNum);
        logDebug("🎯 Challenge: +" + repsNum + " sit-ups from workout");
      }
    }
  }
  render();
  if(wasPR){
    haptic("pr");
    confetti();
    logDebug("🏆 PR: " + n + " @ " + w + "lb");
    setTimeout(()=>{ const c=document.getElementById("ex-"+sid(n)); if(c){c.classList.add("pr-flash");setTimeout(()=>c.classList.remove("pr-flash"),1300);} },50);
  }
}
function undoLastSet(){
  if(!setHistory.length){showToast("Nothing to undo");return;}
  const last=setHistory.pop();
  const ex=activeWorkout?.exercises.find(e=>e.name===last.exerciseName);
  if(ex&&ex.sets.length) ex.sets.pop();
  haptic("medium");
  logDebug("↩ Undo set: " + last.exerciseName);
  dispatch("UNDO_SET");
}
function sameAsLast(n){
  const last=getLastSession(n); if(!last||!last.sets.length) return;
  const s=last.sets[last.sets.length-1];
  const id=sid(n);
  const wi=document.getElementById("w-"+id);
  const ri=document.getElementById("r-"+id);
  if(wi&&!s.bw) wi.value=s.weight;
  if(ri) ri.value=s.reps;
}

function deleteSet(exName,idx){
  const ex=activeWorkout?.exercises.find(e=>e.name===exName);
  if(ex){ ex.sets.splice(idx,1); render(); }
}
let dropInputOpen=null; // {exName, setIdx}
function openDropInput(exName,setIdx){
  dropInputOpen={exName,setIdx};
  render();
  setTimeout(()=>{const el=document.getElementById('drop-w');if(el)el.focus();},100);
}
function closeDropInput(){ dropInputOpen=null; render(); }
function addDrop(exName,setIdx){
  const ex=activeWorkout?.exercises.find(e=>e.name===exName);
  if(!ex) return;
  const set=ex.sets[setIdx];
  if(!set) return;
  const w=(document.getElementById('drop-w')?.value||'').trim();
  const r=(document.getElementById('drop-r')?.value||'').trim();
  if(!w||!r){showToast('Enter weight and reps');return;}
  if(!set.drops) set.drops=[];
  set.drops.push({weight:w,reps:r});
  haptic('light');
  try{localStorage.setItem('gainz_recovery',JSON.stringify(activeWorkout));}catch(e){}
  logDebug('↳ Drop added: '+exName+' set '+(setIdx+1)+' → '+w+'lb x '+r);
  dropInputOpen={exName,setIdx}; // keep open for more drops
  render();
}
function toggleSauna(){
  if(activeWorkout.sauna) activeWorkout.sauna=null;
  else activeWorkout.sauna={minutes:0,tempF:0};
  render();
}
function deleteDrop(exName,setIdx,dropIdx){
  const ex=activeWorkout?.exercises.find(e=>e.name===exName);
  if(!ex) return;
  const set=ex.sets[setIdx];
  if(set&&set.drops){ set.drops.splice(dropIdx,1); if(!set.drops.length) delete set.drops; }
  render();
}
function deleteExerciseConfirm(name){
  if(!confirm("Remove "+name+"?")) return;
  deleteExercise(name);
}
function deleteExercise(name){
  if(!activeWorkout) return;
  activeWorkout.exercises=activeWorkout.exercises.filter(e=>e.name!==name);
  // also remove from setHistory
  setHistory=setHistory.filter(s=>s.exerciseName!==name);
  collapsedEx.delete(name);
  doneExSet.delete(name);
  logDebug("🗑 Exercise removed: "+name);
  showToast(name+" removed");
  render();
}
function moveExercise(name,dir){
  if(!activeWorkout) return;
  const idx=activeWorkout.exercises.findIndex(e=>e.name===name);
  if(idx===-1) return;
  const newIdx=idx+dir;
  if(newIdx<0||newIdx>=activeWorkout.exercises.length) return;
  const arr=activeWorkout.exercises;
  [arr[idx],arr[newIdx]]=[arr[newIdx],arr[idx]];
  render();
}
function logBW(w){
  const val=parseFloat(w);
  if(!val||val<50||val>500){showToast("Enter a valid weight (50–500 lbs)");return;}
  if(!state.bodyweight) state.bodyweight=[];
  const hr=new Date().getHours();
  const timeOfDay=hr<12?'morning':hr<17?'afternoon':'night';
  state.bodyweight.unshift({date:today(),timestamp:Date.now(),weight:val,timeOfDay});
  state.bodyweight=state.bodyweight.slice(0,90);
  saveAndSync();
  showToast("Bodyweight logged ✓ ("+timeOfDay+")");
  render();
}
function openWeighIn(){
  const last=state.bodyweight&&state.bodyweight[0]?state.bodyweight[0].weight:'';
  const hr=new Date().getHours();
  const timeLabel=hr<12?'Morning':hr<17?'Afternoon':'Night';
  showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:4px;">WEIGH IN</div>
    <div style="font-size:10px;color:var(--dim);margin-bottom:14px;">${timeLabel} check-in</div>
    <input id="bw-inp" type="number" class="input" placeholder="${last||'185'}" value="" step="0.1"
      style="text-align:center;font-family:'Bebas Neue',sans-serif;font-size:36px;margin-bottom:6px;"
      inputmode="decimal"/>
    <div style="font-size:10px;color:var(--dim);text-align:center;margin-bottom:16px;">lbs</div>
    <button class="btn primary" onclick="const v=document.getElementById('bw-inp').value;logBW(v);hideModal();">LOG WEIGHT</button>
    <button class="btn ghost" onclick="hideModal()" style="margin-top:8px;">CANCEL</button>
  `);
  setTimeout(()=>{const i=document.getElementById('bw-inp');if(i)i.focus();},100);
}
function updateNote(n,val){
  const ex=activeWorkout?.exercises.find(e=>e.name===n);
  if(ex) ex.notes=val;
}
function toggleLastSession(n){ expandedLastSession.has(n)?expandedLastSession.delete(n):expandedLastSession.add(n); render(); }
function toggleSS(n){ if(!activeWorkout) return; activeWorkout.exercises=activeWorkout.exercises.map(e=>e.name===n?{...e,superset:!e.superset}:e); render(); }
function openPairModal(nameA){
  // Toggle inline picker instead of modal
  ssPickerOpen = ssPickerOpen===nameA ? null : nameA;
  render();
}
function pairSS(nameA, nameB){
  if(!activeWorkout) return;
  // Clear any existing pairs involving either exercise
  activeWorkout.exercises=activeWorkout.exercises.map(e=>{
    if(e.ssPair===nameA||e.ssPair===nameB) return {...e,superset:false,ssPair:null};
    return e;
  });
  // Set new pair on both
  activeWorkout.exercises=activeWorkout.exercises.map(e=>{
    if(e.name===nameA) return {...e,superset:true,ssPair:nameB};
    if(e.name===nameB) return {...e,superset:true,ssPair:nameA};
    return e;
  });
  activeSSPrompt=null; // first log of either exercise starts the alternation
  showToast('⚡ Superset: '+nameA+' + '+nameB);
  render();
}
function unpairSS(name){
  if(!activeWorkout) return;
  const ex=activeWorkout.exercises.find(e=>e.name===name);
  const partner=ex?.ssPair;
  activeWorkout.exercises=activeWorkout.exercises.map(e=>{
    if(e.name===name||e.name===partner) return {...e,superset:false,ssPair:null};
    return e;
  });
  activeSSPrompt=null;
  render();
}
function calcPlates(totalLbs){
  // Standard bar = 45lb. Returns plates each side.
  const barWeight=45;
  const plates=[45,35,25,10,5,2.5];
  let remaining=(parseFloat(totalLbs)-barWeight)/2;
  if(remaining<0) return null;
  const result=[];
  for(const p of plates){
    const count=Math.floor(remaining/p);
    if(count>0){ result.push({plate:p,count}); remaining=Math.round((remaining-p*count)*100)/100; }
  }
  if(remaining>0.1) return null; // can't make exact weight
  return result;
}
function openPlateCalc(name){
  const id=sid(name);
  const wEl=document.getElementById("w-"+id);
  const w=wEl?.value||(activeWorkout?.exercises.find(e=>e.name===name)?.sets?.slice(-1)[0]?.weight||"");
  const plates=w?calcPlates(w):null;
  const platesHtml=plates?plates.map(p=>`<span style="display:inline-flex;align-items:center;gap:4px;background:var(--bg3);border-radius:8px;padding:6px 12px;font-size:13px;font-weight:600;color:var(--text);">${p.count}×<span style="color:var(--accent);">${p.plate}</span></span>`).join("")
    :"<span style='color:var(--dim);font-size:12px;'>Can't make exact weight with standard plates.</span>";
  showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:6px;">PLATE CALCULATOR</div>
    <div style="font-size:22px;font-weight:700;color:var(--accent);margin-bottom:4px;">${w||"—"}lb</div>
    <div style="font-size:10px;color:var(--dim);margin-bottom:16px;">45lb bar · each side</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:20px;">${platesHtml}</div>
    <button class="btn ghost" onclick="hideModal()">CLOSE</button>
  `);
}
function toggleWarmup(n){ if(!activeWorkout) return; activeWorkout.exercises=activeWorkout.exercises.map(e=>e.name===n?{...e,warmupNext:!e.warmupNext}:e); render(); }
function toggleBW(n){ if(!activeWorkout) return; activeWorkout.exercises=activeWorkout.exercises.map(e=>e.name===n?{...e,bwMode:!e.bwMode}:e); render(); }
function toggleCollapse(n){ collapsedEx.has(n)?collapsedEx.delete(n):collapsedEx.add(n); render(); }

function nextExercise(name){
  doneExSet.add(name);
  collapsedEx.add(name);
  haptic('medium');
  const exercises = activeWorkout?.exercises || [];
  const idx = exercises.findIndex(e=>e.name===name);
  const next = exercises[idx+1];
  if(next){
    collapsedEx.delete(next.name);
    // Start travel timer: next exercise rest + 30s buffer for moving between stations
    const baseRest = state.exerciseRests[next.name] ?? GLOBAL_DEFAULT;
    const travelRest = baseRest + 30;
    startTimerRaw(travelRest, ('→ ' + next.name).toUpperCase());
    render();
    setTimeout(()=>{
      const el = document.getElementById('ex-'+sid(next.name));
      if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
    }, 80);
  } else {
    // Last exercise — collapse and open picker to add more
    render();
    setTimeout(openPicker, 100);
  }
}
function dismissSummary(){
  workoutSummary=null;
  const el=document.getElementById("wo-summary");
  if(el){ el.style.animation="summaryOut 0.3s ease forwards"; setTimeout(()=>{ workoutSummary=null; el.remove(); render(); try{ maybeShowSignupNudge(); }catch(e){ console.error('[GAINZ] signup nudge error:',e); } },280); }
  else { render(); try{ maybeShowSignupNudge(); }catch(e){ console.error('[GAINZ] signup nudge error:',e); } }
}
async function maybeShowSignupNudge(){
  // Show every time if not signed in
  try{
    const user=await getUser();
    if(user) return; // already signed in
  }catch(e){ return; }
  showModal(`
    <div style="text-align:center;">
      <div style="font-size:28px;margin-bottom:8px;">🔒</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--accent);letter-spacing:2px;margin-bottom:8px;">PROTECT YOUR DATA</div>
      <div style="font-size:12px;color:var(--muted);line-height:1.6;margin-bottom:16px;">
        Your workout data only lives on this device right now. If you clear your browser or delete the app, <span style="color:var(--text);">it's gone forever.</span><br><br>
        Create a free account to back it up. Takes 10 seconds.
      </div>
      <input id="nudge-email" class="input" type="email" placeholder="email" style="margin-bottom:8px;font-size:13px;" autocomplete="email"/>
      <input id="nudge-pass" class="input" type="password" placeholder="password (6+ characters)" style="margin-bottom:4px;font-size:13px;" autocomplete="new-password"/>
      <div id="nudge-status" style="font-size:11px;color:var(--dim);margin-bottom:12px;display:none;line-height:1.5;"></div>
      <button id="nudge-signup-btn" onclick="nudgeSignUp()" class="btn primary" style="width:100%;">CREATE ACCOUNT</button>
      <button onclick="nudgeSignIn()" class="btn ghost" style="width:100%;margin-top:8px;">ALREADY HAVE ONE — SIGN IN</button>
      <button onclick="hideModal();" style="background:none;border:none;color:var(--dim);font-size:10px;margin-top:12px;cursor:pointer;font-family:'DM Sans',sans-serif;">Maybe later</button>
    </div>
  `);
}
async function enableNotifications(){
  try{
    if(window.OneSignalDeferred){
      OneSignalDeferred.push(async function(OneSignal){
        await OneSignal.Slidedown.promptPush();
      });
      showToast('Notifications enabled — you\'ll get daily reminders');
    } else {
      showToast('Notifications not available');
    }
  }catch(e){ showToast('Could not enable notifications'); }
}
async function nudgeSignUp(){
  const email=document.getElementById('nudge-email')?.value?.trim();
  const pass=document.getElementById('nudge-pass')?.value;
  const status=document.getElementById('nudge-status');
  const btn=document.getElementById('nudge-signup-btn');
  if(!email){if(status){status.textContent='Enter your email';status.style.color='var(--danger)';status.style.display='block';}return;}
  if(!pass||pass.length<6){if(status){status.textContent='Password needs at least 6 characters';status.style.color='var(--danger)';status.style.display='block';}return;}
  if(btn) btn.textContent='CREATING...';
  const {error}=await signUp(email,pass);
  if(error){
    if(status){status.textContent=friendlyAuthError(error.message);status.style.color='var(--danger)';status.style.display='block';}
    if(btn) btn.textContent='CREATE ACCOUNT';
    return;
  }
  // Show success state inline instead of closing modal
  if(status){
    status.innerHTML='✅ <strong>Account created!</strong><br>Check your email inbox (and spam folder) for a confirmation link.<br><br>Once you click the link, come back here and tap <strong>Sign In</strong> below.';
    status.style.color='var(--green)';
    status.style.display='block';
  }
  if(btn){btn.textContent='✓ CHECK YOUR EMAIL';btn.disabled=true;btn.style.opacity='0.5';}
}
async function nudgeSignIn(){
  const email=document.getElementById('nudge-email')?.value?.trim();
  const pass=document.getElementById('nudge-pass')?.value;
  const status=document.getElementById('nudge-status');
  if(!email||!pass){if(status){status.textContent='Enter email and password';status.style.color='var(--danger)';status.style.display='block';}return;}
  const {data,error}=await signIn(email,pass);
  if(error){
    if(status){status.textContent=friendlyAuthError(error.message);status.style.color='var(--danger)';status.style.display='block';}
    return;
  }
  hideModal();
  showToast('Signed in — your data is now backed up 🔒');
  const cloud=await syncFromCloud();
  if(cloud){ Object.assign(state,migrateState(cloud)); localStorage.setItem('gainz_v5',JSON.stringify(state)); }
  await syncToCloud();
  render();
}
function editWorkoutDuration(){
  if(!workoutSummary) return;
  const curMins=Math.round(workoutSummary.duration/60000);
  const curH=Math.floor(curMins/60);
  const curM=curMins%60;
  showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:14px;">EDIT DURATION</div>
    <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:16px;">
      <input id="dur-h" type="number" inputmode="numeric" min="0" max="23" value="${curH}"
        style="width:60px;text-align:center;font-family:'Bebas Neue',sans-serif;font-size:36px;background:var(--bg2);border:1px solid var(--border2);border-radius:12px;color:var(--text);padding:8px;"/>
      <span style="font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--muted);">h</span>
      <input id="dur-m" type="number" inputmode="numeric" min="0" max="59" value="${curM}"
        style="width:60px;text-align:center;font-family:'Bebas Neue',sans-serif;font-size:36px;background:var(--bg2);border:1px solid var(--border2);border-radius:12px;color:var(--text);padding:8px;"/>
      <span style="font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--muted);">m</span>
    </div>
    <button class="btn primary" onclick="saveDurationEdit()">SAVE</button>
    <button class="btn ghost" onclick="hideModal()" style="margin-top:8px;">CANCEL</button>
  `);
}
function saveDurationEdit(){
  const h=parseInt(document.getElementById('dur-h').value)||0;
  const m=parseInt(document.getElementById('dur-m').value)||0;
  const newDur=(h*60+m)*60000;
  if(newDur<=0){ hideModal(); return; }
  workoutSummary.duration=newDur;
  // Update in saved history too
  const saved=state.workouts.find(w=>w.timestamp===workoutSummary.timestamp);
  if(saved) saved.duration=newDur;
  saveImmediate();
  hideModal();
  // Update the displayed duration
  const durMins=h*60+m;
  const durStr=durMins>=60?h+"h "+m+"m":durMins+"min";
  const el=document.getElementById('summary-dur');
  if(el) el.textContent=durStr;
}
function renderWorkoutSummary(){
  const w=workoutSummary;
  if(!w) return "";
  if(!w.exercises||!Array.isArray(w.exercises)){ console.error('[GAINZ] workoutSummary has no exercises'); return ""; }
  try{
  const prCount=w.exercises.reduce((a,e)=>a+(e.sets?e.sets.filter(s=>s.pr).length:0),0);
  const setCount=w.exercises.reduce((a,e)=>a+(e.sets?e.sets.length:0),0);
  const durMins=Math.round((w.duration||0)/60000);
  const durStr=durMins>=60?Math.floor(durMins/60)+"h "+( durMins%60)+"m":durMins+"min";
  // Compare to last same-split workout (second in history since this one was just pushed)
  const prev=w.split?state.workouts.slice(1).find(x=>x.split===w.split):null;
  const volDiff=prev?(w.totalVolume||0)-(prev.totalVolume||0):null;
  const volDiffEl=volDiff!==null?`<span style="font-size:12px;font-weight:600;color:${volDiff>0?'var(--green)':volDiff<0?'var(--red)':'var(--muted)'}">${volDiff>0?'+':''}${volDiff.toLocaleString()}lb vs last ${splitName(w.split)}</span>`:'';
  const prLine=prCount>0?`<div style="font-size:13px;color:var(--accent);margin-top:8px;font-weight:600;">🏆 ${prCount} new PR${prCount>1?'s':''} today</div>`:'';
  // Heaviest lift this session
  const allSetsFlat=w.exercises.flatMap(e=>(e.sets||[]).filter(s=>!s.bw&&!s.warmup).map(s=>({name:e.name,weight:parseFloat(s.weight)||0,reps:parseInt(s.reps)||0})));
  const heaviest=allSetsFlat.length?allSetsFlat.reduce((a,b)=>a.weight>b.weight?a:b):null;

  // Tonnage fun comparison
  const COMPARISONS=[
    {lbs:500,label:"a grand piano lid"},{lbs:2000,label:"a horse"},{lbs:4000,label:"a baby elephant"},
    {lbs:8000,label:"a hippo"},{lbs:15000,label:"a school bus"},{lbs:33000,label:"a literal T-Rex"},
    {lbs:80000,label:"a space shuttle"},{lbs:200000,label:"a blue whale"},
  ];
  let tonComp=null;
  if(w.totalVolume>0){
    for(const c of COMPARISONS) if(w.totalVolume>=c.lbs) tonComp=c;
  }

  // 3 Pillars — rotating post-workout tips: nutrition, sleep, exercise
  // Tips with myth:true get a "MYTH BUSTED" label
  const PILLAR_TIPS = [
    { pillar: 'NUTRITION', icon: '🥩', tips: [
      { myth: true, tip: '"You need protein within 30 minutes of lifting." Nope. A 2025 meta-analysis of 65 studies found protein timing has zero effect on muscle gains. Just hit your daily target.', src: 'Liao et al., Nutrients, 2025' },
      { tip: 'Creatine (3–5g/day) is the most studied and effective strength supplement. Take it daily — timing doesn\'t matter.', src: 'Kreider et al., J Int Soc Sports Nutr, 2017' },
      { tip: 'You need ~0.7–1g of protein per pound of bodyweight daily to build muscle. Spread it across 3–5 meals.', src: 'Morton et al., Br J Sports Med, 2018' },
      { myth: true, tip: '"Your body can only absorb 30g of protein per meal." Wrong. Subjects given 100g protein post-workout used it all — muscle protein synthesis was significantly higher with no ceiling.', src: 'Trommelen et al., Cell Reports Medicine, 2023' },
      { myth: true, tip: '"High protein damages your kidneys." No evidence of this in healthy adults — even at extreme intakes. This myth comes from guidelines for people who already have kidney disease.', src: 'Antonio et al., J Int Soc Sports Nutr, 2024' },
      { myth: true, tip: '"You have to eat perfectly clean to get results." Flexible dieting (80/20) produces the same body composition results as strict dieting — with better long-term adherence.', src: 'Conlin et al., J Int Soc Sports Nutr, 2021' },
      { tip: 'Carbs after training refill glycogen stores faster. Pair them with protein for best recovery.', src: 'Kerksick et al., J Int Soc Sports Nutr, 2017' },
      { tip: 'Dehydration impairs performance — don\'t wait until you\'re thirsty. Stay hydrated throughout the day, not just at the gym.', src: 'Judelson et al., Sports Med, 2007' },
      { tip: 'Caffeine 30–60 min before lifting improves strength and endurance by 3–7%. But skip it within 8 hours of bedtime.', src: 'Grgic et al., Br J Sports Med, 2020' },
    ]},
    { pillar: 'SLEEP', icon: '😴', tips: [
      { tip: 'Getting less than 6 hours of sleep drops testosterone by 10–15% and kills recovery. Protect your sleep.', src: 'Leproult & Van Cauter, JAMA, 2011' },
      { tip: 'Growth hormone peaks during deep sleep. Consistent bedtime = more deep sleep = more gains.', src: 'Van Cauter & Plat, Sleep, 1996' },
      { tip: 'Cool your room to 65–68°F (18–20°C). Core temp drop is one of the strongest triggers for deep sleep.', src: 'Harding et al., Energy & Buildings, 2020' },
      { tip: 'Stop screens 30–60 min before bed. Blue light suppresses melatonin by up to 50%.', src: 'Chang et al., PNAS, 2015' },
      { myth: true, tip: '"Falling asleep instantly means you\'re a good sleeper." Actually, it\'s a sign of sleep deprivation. Healthy sleep onset takes 15–20 minutes.', src: 'Robbins et al., Sleep Health, 2019' },
      { myth: true, tip: '"Everyone needs exactly 8 hours." A study of 5,000 people across 20 countries found optimal sleep varies by individual — from 6h18m to 7h52m. Find YOUR number.', src: 'UBC/UVic Cross-Cultural Study, 2025' },
      { myth: true, tip: '"Evening workouts ruin your sleep." Wrong — exercise at ANY time of day improves sleep quality. Only very intense training within 1 hour of bed has a small effect.', src: 'Stutz et al., Sports Med, 2019' },
      { tip: 'Naps of 20–30 min improve afternoon performance without wrecking nighttime sleep.', src: 'Waterhouse et al., J Sports Sci, 2007' },
      { tip: 'One bad night of sleep reduces pain tolerance and increases perceived effort. Prioritize sleep like you prioritize training.', src: 'Krause et al., J Neurosci, 2019' },
    ]},
    { pillar: 'EXERCISE', icon: '💪', tips: [
      { tip: 'Progressive overload is the #1 driver of muscle growth. Add weight, reps, or sets over time — not all at once.', src: 'Schoenfeld, J Strength Cond Res, 2010' },
      { tip: 'Training a muscle 2x per week produces more growth than 1x, even with the same total volume.', src: 'Schoenfeld et al., Sports Med, 2016' },
      { tip: 'Rest 2–3 min between heavy compound sets. Short rest sounds tough but actually reduces your gains.', src: 'Schoenfeld et al., J Strength Cond Res, 2016' },
      { myth: true, tip: '"You have to lift heavy to build muscle." Light weights with high reps build equal muscle — as long as you go close to failure. Effort matters more than load.', src: 'Schoenfeld et al., J Strength Cond Res, 2017' },
      { myth: true, tip: '"Soreness means you had a good workout." 33% of study subjects had zero soreness but still had significant muscle growth. DOMS doesn\'t correlate with gains.', src: 'Nosaka et al., Scand J Med Sci Sports, 2002' },
      { myth: true, tip: '"Ice baths after every workout speed recovery." They actually blunt the inflammatory response your muscles need to adapt. Chronic use reduces long-term gains.', src: 'Roberts et al., J Physiology, 2015' },
      { myth: true, tip: '"Missed a week? You lost your gains." Muscle memory is real. Your muscle cells keep extra nuclei for years — you regain lost muscle WAY faster than you originally built it.', src: 'Gundersen, Front Physiol, 2016' },
      { myth: true, tip: '"You\'re too old to build muscle." People in their 60s and 70s doubled their strength in just 12 weeks of training. It is literally never too late to start.', src: 'Peterson et al., Med Sci Sports Exerc, 2010' },
      { tip: 'Eccentric (lowering) phase matters. Control the weight for 2–3 seconds on the way down for maximum growth stimulus.', src: 'Schoenfeld et al., Eur J Sport Sci, 2017' },
      { tip: 'Deload every 4–6 weeks. Cutting volume in half for a week lets your body supercompensate and come back stronger.', src: 'Pritchard et al., J Strength Cond Res, 2015' },
    ]},
  ];
  // Workout-specific tips based on what you just did
  const SPLIT_TIPS={
    Push:[{tip:'Your chest, shoulders, and triceps need 48-72 hours to fully recover. Hit Pull or Legs tomorrow.',src:'Schoenfeld et al., Sports Med, 2016'},{tip:'Overhead pressing builds shoulders AND improves bench press. Don\'t skip it.',src:'Kompf & Arandjelovic, J Strength Cond Res, 2017'}],
    Pull:[{tip:'Training a muscle twice per week builds more than once — even with the same total sets. Hit back again in a few days.',src:'Schoenfeld et al., Sports Med, 2016'},{tip:'Grip strength limits your pulls. Try straps on heavy sets so your back gives out before your hands.',src:'Practical strength training application'},{tip:'Your lats are the widest muscle in your body. Most people undertrain them.',src:'Wernbom et al., Sports Med, 2007'},{tip:'Rows build posture. Posture builds presence. Keep pulling.',src:'Howe et al., Musculoskeletal Science and Practice, 2022'}],
    Legs:[{tip:'Leg day builds the largest muscles in your body. Consistent lower-body training is one of the best investments in long-term strength and metabolic health.',src:'Kraemer & Ratamess, Sports Med, 2005'},{tip:'Stretch your quads and hip flexors tonight. Leg day tightness is real and affects your next session.',src:'Behm & Chaouachi, Eur J Appl Physiol, 2011'}],
    Core:[
      // Existing core tips
      {title:'Core → Compound',tip:'Your core just got stronger. That transfers directly to bigger squats, deadlifts, and overhead presses.',src:'Kibler et al., Sports Med, 2006'},
      {title:'Back Pain Shield',tip:'Core stability training reduces lower back injury risk. Multiple meta-analyses confirm it\'s more effective than general exercise for preventing back pain.',src:'Steffens et al., JAMA Internal Med, 2016'},
      {title:'Endurance > Strength',tip:'Core endurance matters more than core strength for preventing low back pain. Train for time under tension, not max load.',src:'McGill, Low Back Disorders, 2016'},
      {title:'Spine-Friendly Core',tip:'Anti-extension exercises (planks, ab wheel, dead bugs) activate the core with significantly less spinal compression than crunches and sit-ups.',src:'Escamilla et al., Physical Therapy, 2010'},
      {title:'Plank Diminishing Returns',tip:'Holding a plank beyond 60 seconds has minimal additional benefit. Short holds (10-30 sec) with harder progressions are more effective.',src:'McGill, Low Back Disorders, 2016'},
      {title:'Squats Aren\'t Enough',tip:'Squats and deadlifts train your core as a stabilizer, but not through full range of motion. They\'re not a complete substitute for direct core work.',src:'Martuscello et al., J Strength Cond Res, 2013'},
      {title:'Six-Pack Math',tip:'Ab visibility is determined by body fat percentage, not core training volume. For most men: 10-14%. For most women: 16-20%.',src:'Jackson & Pollock, Br J Nutrition, 1978'},
      {myth:true,title:'Spot Reduction',tip:'You cannot spot-reduce belly fat by doing ab exercises. This has been tested and disproven multiple times.',src:'Vispute et al., J Strength Cond Res, 2011'},
      {title:'Frequency Sweet Spot',tip:'Core training 2-4x per week is sufficient. Daily core work is unnecessary and may impair recovery.',src:'Schoenfeld et al., Sports Med, 2016'},
      {title:'Brace, Don\'t Suck In',tip:'The transverse abdominis acts like a natural weight belt, stabilizing your spine. Train it by bracing — not sucking in.',src:'Hodges & Richardson, Experimental Brain Research, 1997'},
      {myth:true,title:'Sit-Ups Are Overrated',tip:'Sit-ups are a poor core exercise. They recruit hip flexors too much, compress the spine, and isolate abs less than alternatives.',src:'McGill, J Electromyography Kinesiology, 2003'},
      {title:'The Big Three',tip:'The bird dog, side plank, and curl-up (McGill\'s Big Three) are the safest and most effective core exercises for spinal health.',src:'McGill, Low Back Disorders, 2016'},
      {myth:true,title:'Bosu Ball Hype',tip:'Unstable surfaces (Bosu balls) increase core activation slightly but reduce force production so much that they\'re worse for building core strength.',src:'Behm et al., J Strength Cond Res, 2010'},
      {title:'Balance Booster',tip:'Core training improves balance and athletic performance across all age groups. Multiple meta-analyses confirm this.',src:'Granacher et al., Sports Med, 2013'},
      {title:'35 Muscles Deep',tip:'The core is roughly 35 muscles — not just your six-pack. It includes obliques, erector spinae, multifidus, diaphragm, and pelvic floor.',src:'Kibler et al., Sports Med, 2006'},
      // New core tips — science
      {title:'Lower Ab Targeting',tip:'Hanging leg raises activate lower abs way more than crunches. If you want to target that lower ab region, hang and lift.',src:'Contreras et al., Strength & Conditioning Journal, 2014'},
      {title:'Breathe to Activate',tip:'Exhaling hard during the crunch phase increases ab activation by ~20%. Breathe out forcefully as you curl up.',src:'Ishida et al., J Physical Therapy Science, 2012'},
      {title:'Anti-Rotation King',tip:'The Pallof press is one of the best anti-rotation exercises — it trains your obliques to resist movement, which is how your core actually works in sports and life.',src:'Hibbs et al., Sports Med, 2008'},
      {title:'Stealth Core Work',tip:'Farmer\'s walks are elite core training in disguise. They challenge anti-lateral flexion, grip, and total-body stability all at once.',src:'McGill et al., J Strength Cond Res, 2009'},
      {title:'Overload Your Abs',tip:'Cable crunches let you progressively overload your abs the same way you overload chest or back. Your abs respond to added resistance.',src:'Schoenfeld & Contreras, Strength & Conditioning Journal, 2011'},
      {title:'Train All 3 Planes',tip:'Training core through all 3 planes (flexion, rotation, lateral flexion) beats single-plane work for functional strength.',src:'Huxel Bliven & Anderson, Sports Health, 2013'},
      // New core tips — myths
      {myth:true,title:'Volume ≠ Visibility',tip:'"More ab exercises = faster six-pack." A study had people do abs 5x/week for 6 weeks — zero change in belly fat. Diet drives visibility, training drives strength.',src:'Vispute et al., J Strength Cond Res, 2011'},
      {myth:true,title:'Wrong Bracing Cue',tip:'"Suck your belly button to your spine." That only activates the transverse abdominis in isolation. For real lifting, push your abs OUT against your belt — 360-degree brace.',src:'Grenier & McGill, Clinical Biomechanics, 2007'},
      {myth:true,title:'Machines vs. Bodyweight',tip:'"Ab machines are better than bodyweight." EMG studies show the ab wheel and hanging leg raises outperform most gym machines for activation.',src:'Escamilla et al., Physical Therapy, 2006'},
      {myth:true,title:'The Burn Myth',tip:'"You need to feel a burn for abs to grow." The burn is just metabolic waste buildup. Mechanical tension drives growth — abs are no different from any other muscle.',src:'Schoenfeld, J Strength Cond Res, 2010'},
      {myth:true,title:'Twisting Won\'t Shrink',tip:'"Twisting with weight shrinks your waist." Weighted oblique work can actually build thicker obliques, making your waist wider. For a smaller waist, focus on diet and anti-rotation.',src:'Contreras & Schoenfeld, Strength & Conditioning Journal, 2011'},
      // New core tips — recovery
      {title:'Fast Recoverers',tip:'Abs recover faster than most muscles — high slow-twitch fiber ratio. 24-48 hours rest is usually enough.',src:'Haggmark & Thorstensson, Acta Physiologica Scandinavica, 1979'},
      {title:'Hip Flexor Check',tip:'Hip flexors sore after core day? Too many sit-up variations. Switch to planks and dead bugs — your actual abs will thank you.',src:'McGill, Low Back Disorders, 2016'},
      {title:'Walk It Off',tip:'Walking after a hard core session reduces next-day stiffness. Light movement increases blood flow without adding training stress.',src:'Dupuy et al., Front Physiology, 2018'},
      {title:'Roll the Upper Back',tip:'Foam roll your upper back (not lower) after core work to release tension from all that bracing.',src:'Cheatham et al., Int J Sports Physical Therapy, 2015'},
      {title:'Breathe to Recover',tip:'Deep belly breaths after core training help your trunk muscles relax and downregulate. Five slow breaths, fully exhale each time.',src:'Ma et al., Front Psychology, 2017'},
      // New core tips — fun facts
      {title:'One Muscle',tip:'Your rectus abdominis is one continuous muscle — the "pack" lines are just connective tissue bands crossing it.',src:'Moore & Dalley, Clinically Oriented Anatomy, 2013'},
      {title:'Genetics = Pack Count',tip:'Whether you have a 4-pack, 6-pack, or 8-pack is 100% genetic. Set before birth, can\'t be changed by training.',src:'Standring, Gray\'s Anatomy, 2020'},
      {title:'Brain Fires First',tip:'Your brain fires core stabilizers ~30 milliseconds BEFORE any limb movement to protect your spine.',src:'Hodges & Richardson, Experimental Brain Research, 1997'},
      {title:'Nature\'s Lifting Belt',tip:'Obliques form a natural X-brace — external and internal run opposite diagonals, like nature\'s lifting belt.',src:'Urquhart et al., J Electromyography Kinesiology, 2005'},
    ],
    Quick:[{tip:'Quick sessions still count. Consistency beats intensity every time.',src:'Androulakis-Korakakis et al., Sports Med, 2020'}],
  };
  const splitTips=SPLIT_TIPS[w.split]||[];
  const hasSplitTip=splitTips.length>0&&Math.random()<0.4; // 40% chance to show split-specific tip
  const splitTip=splitTips.length>0?splitTips[state.workouts.length%splitTips.length]:null;

  // Rotate pillars: use workout count to cycle nutrition → sleep → exercise
  const woCount2=Math.max(1,state.workouts.length); // guard against 0
  const pillarIdx = (woCount2 - 1) % PILLAR_TIPS.length;
  const pillarObj = PILLAR_TIPS[pillarIdx];
  const pillar = (hasSplitTip&&w.split)?{pillar:w.split.toUpperCase()+' DAY',icon:'🎯'}:pillarObj;
  const tipIdx = pillarObj&&pillarObj.tips?Math.floor((woCount2 - 1) / PILLAR_TIPS.length) % pillarObj.tips.length:0;
  const pillarTip = (hasSplitTip&&splitTip)?splitTip:(pillarObj&&pillarObj.tips&&pillarObj.tips[tipIdx])?pillarObj.tips[tipIdx]:{tip:'Keep showing up. Consistency beats everything.',src:'',myth:false};

  // Workout count milestone
  const woCount=state.workouts.length;
  const milestones=[500,250,200,150,100,75,50,25,10,5];
  const milestone=milestones.find(m=>woCount===m);
  return `<div id="wo-summary" style="position:fixed;inset:0;background:var(--bg);z-index:300;overflow-y:auto;animation:summaryIn 0.35s ease;">
    <div style="max-width:430px;margin:0 auto;padding:24px 16px 48px;">
      <div style="text-align:center;padding:28px 0 20px;">
        <div style="font-size:36px;margin-bottom:8px;">🎉</div>
        <div style="font-size:8px;letter-spacing:3px;color:var(--muted);margin-bottom:6px;text-transform:uppercase;">Workout Complete</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:48px;letter-spacing:1px;line-height:1;color:var(--text);">${splitName(w.split)} Day</div>
        <div style="font-size:11px;color:var(--dim);margin-top:4px;">${w.date}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">
        <div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:14px;padding:16px;text-align:center;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:32px;color:var(--accent);line-height:1;">${w.totalVolume>0?w.totalVolume.toLocaleString():'—'}</div>
          <div style="font-size:8px;color:var(--muted);letter-spacing:1.5px;margin-top:4px;text-transform:uppercase;">LB Moved</div>
          <div style="margin-top:4px;">${volDiffEl}</div>
        </div>
        <div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:14px;padding:16px;text-align:center;cursor:pointer;" onclick="editWorkoutDuration()">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:32px;color:var(--accent);line-height:1;" id="summary-dur">${durStr}</div>
          <div style="font-size:8px;color:var(--muted);letter-spacing:1.5px;margin-top:4px;text-transform:uppercase;">Duration ✎</div>
        </div>
        <div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:14px;padding:16px;text-align:center;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:32px;color:var(--accent);line-height:1;">${w.exercises.length}</div>
          <div style="font-size:8px;color:var(--muted);letter-spacing:1.5px;margin-top:4px;text-transform:uppercase;">Exercises</div>
        </div>
        <div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:14px;padding:16px;text-align:center;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:32px;color:var(--accent);line-height:1;">${setCount}</div>
          <div style="font-size:8px;color:var(--muted);letter-spacing:1.5px;margin-top:4px;text-transform:uppercase;">Sets</div>
        </div>
      </div>
      ${prLine}
      ${heaviest?`<div style="background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:16px;margin-top:16px;text-align:center;">
        <div style="font-size:9px;letter-spacing:2px;color:var(--dim);text-transform:uppercase;margin-bottom:6px;">Heaviest Lift</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--accent);line-height:1;">${heaviest.weight}lb x ${heaviest.reps}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px;">${heaviest.name}</div>
      </div>`:''}
      ${w.sauna?`<div style="background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:16px;margin-top:16px;text-align:center;">
        <div style="font-size:9px;letter-spacing:2px;color:var(--dim);text-transform:uppercase;margin-bottom:6px;">🧖 Sauna</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--accent);line-height:1;">${w.sauna.minutes} min${w.sauna.tempF?' @ '+w.sauna.tempF+'°F':''}</div>
      </div>`:''}
      ${tonComp?`<div style="text-align:center;margin-top:14px;font-size:12px;color:var(--muted);">You moved more than ${tonComp.label} today.</div>`:''}
      ${milestone?`<div style="background:rgba(232,213,160,0.08);border:1px solid rgba(232,213,160,0.2);border-radius:14px;padding:16px;margin-top:16px;text-align:center;">
        <div style="font-size:28px;margin-bottom:4px;">🎯</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:24px;color:var(--accent);">WORKOUT #${milestone}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px;">Milestone unlocked</div>
      </div>`:''}
      <div style="background:#0f0f12;border:1px solid ${pillarTip.myth?'rgba(232,213,160,0.25)':'#1e1e24'};border-radius:14px;padding:16px;margin-top:16px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span style="font-size:9px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;">${pillar.icon} ${pillar.pillar}</span>
          ${pillarTip.myth?'<span style="font-size:8px;letter-spacing:1.5px;color:var(--accent);background:rgba(232,213,160,0.1);padding:2px 6px;border-radius:4px;">MYTH BUSTED</span>':''}
        </div>
        ${pillarTip.title?`<div style="font-family:'Bebas Neue',sans-serif;font-size:16px;color:var(--accent);margin-bottom:4px;">${pillarTip.title}</div>`:''}
        <div style="font-size:13px;color:var(--text);line-height:1.5;">${pillarTip.tip}</div>
        <div style="font-size:9px;color:var(--dim);margin-top:8px;font-style:italic;">${pillarTip.src}</div>
      </div>
      <button class="btn primary" onclick="dismissSummary()" style="width:100%;margin-top:12px;font-size:13px;">DONE ✓</button>
    </div>
  </div>`;
  }catch(sumErr){ console.error('[GAINZ] renderWorkoutSummary error:',sumErr); workoutSummary=null; return ""; }
}
function detectSplit(exercises){
  const exNames=exercises.map(e=>e.name);
  let best=null, bestCount=0;
  for(const [split,splitExercises] of Object.entries(ALL_SPLITS)){
    const count=exNames.filter(n=>splitExercises.includes(n)).length;
    if(count>bestCount){ bestCount=count; best=split; }
  }
  return best;
}
function finishQuickWorkout(chosenSplit){
  hideModal();
  activeWorkout.split=chosenSplit;
  finishWorkout();
}
function finishWorkout(){
  if(!activeWorkout.exercises.length){ showModal(`<div style="font-size:13px;color:var(--accent);margin-bottom:14px;">Log at least one exercise first 💪</div><button class="btn ghost" onclick="hideModal()">OK</button>`); return; }
  // Quick Start: ask user to categorize before saving
  if(activeWorkout.split==="Quick"){
    const detected=detectSplit(activeWorkout.exercises);
    const splits=Object.keys(ALL_SPLITS);
    showModal(`
      <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:14px;">CATEGORIZE WORKOUT</div>
      <div style="font-size:13px;color:var(--dim);margin-bottom:16px;">What type of session was this?</div>
      ${splits.map(s=>`<button class="btn ghost" onclick="finishQuickWorkout('${s}')" style="width:100%;margin-bottom:8px;${s===detected?'border-color:var(--accent);color:var(--accent);':''}">
        ${splitName(s)}${s===detected?' ← suggested':''}
      </button>`).join('')}
      <button class="btn ghost" onclick="finishQuickWorkout('Quick')" style="width:100%;margin-top:4px;color:var(--dim);">Keep as "Quick"</button>
    `);
    return;
  }
  const yest=new Date(); yest.setDate(yest.getDate()-1);
  const streak=state.lastWorkoutDate===yest.toDateString()?state.streak+1:state.lastWorkoutDate===todayStr()?state.streak:1;
  const notesEl=document.getElementById("session-notes"); if(notesEl) activeWorkout.notes=notesEl.value;
  // Capture sauna inputs
  if(activeWorkout.sauna){
    const sMin=document.getElementById('sauna-min'); if(sMin) activeWorkout.sauna.minutes=parseInt(sMin.value)||0;
    const sTemp=document.getElementById('sauna-temp'); if(sTemp) activeWorkout.sauna.tempF=parseInt(sTemp.value)||0;
    if(!activeWorkout.sauna.minutes&&!activeWorkout.sauna.tempF) activeWorkout.sauna=null;
  }
  const w={...activeWorkout,date:today(),timestamp:Date.now(),duration:Date.now()-activeWorkout.startTime,totalVolume:activeWorkout.exercises.reduce((a,e)=>a+vol(e.sets),0),sauna:activeWorkout.sauna||null};
  state.workouts.unshift(w); state.streak=streak; state.lastWorkoutDate=todayStr();
  if(state.workouts.length>500) state.workouts=state.workouts.slice(0,500);
  saveAndSync();
  // Auto-save as template for this split (silent)
  if(!state.templates) state.templates=[];
  const existingIdx=state.templates.findIndex(t=>t.split===activeWorkout.split);
  const autoTmpl={
    id:existingIdx>=0?state.templates[existingIdx].id:stackId(),
    name:splitName(activeWorkout.split)+' Day',
    split:activeWorkout.split,
    exercises:activeWorkout.exercises.map(e=>({name:e.name,sets:e.sets.length||3})),
    savedAt:Date.now()
  };
  if(existingIdx>=0) state.templates[existingIdx]=autoTmpl;
  else state.templates.unshift(autoTmpl);
  if(state.templates.length>20) state.templates=state.templates.slice(0,20);
  saveImmediate();
  clearInterval(autoSaveInterval);
  try{ localStorage.removeItem("gainz_recovery"); }catch(e){}
  releaseWakeLock();
  haptic("medium");
  logDebug("🏁 Workout finished: " + w.split + " · " + w.exercises.length + " exercises");
  const finishedW=w;
  activeWorkout=null; setHistory=[]; skipTimer(); stopWoTimer(); collapsedEx.clear(); doneExSet.clear();
  workoutSummary=finishedW; screen="start"; render();
}

function editWorkoutTime(){
  if(!activeWorkout) return;
  const elapsed=Date.now()-activeWorkout.startTime;
  const mins=Math.round(elapsed/60000);
  const hrs=Math.floor(mins/60);
  const m=mins%60;
  showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:14px;">ADJUST WORKOUT TIME</div>
    <div style="font-size:12px;color:var(--dim);margin-bottom:12px;">Current: ${hrs>0?hrs+'h ':''}${m}m</div>
    <div style="display:flex;gap:8px;margin-bottom:16px;">
      <div style="flex:1;">
        <div style="font-size:9px;color:var(--dim);margin-bottom:4px;">HOURS</div>
        <input id="edit-wo-hrs" type="number" class="input" inputmode="numeric" value="${hrs}" min="0" style="text-align:center;font-size:20px;"/>
      </div>
      <div style="flex:1;">
        <div style="font-size:9px;color:var(--dim);margin-bottom:4px;">MINUTES</div>
        <input id="edit-wo-min" type="number" class="input" inputmode="numeric" value="${m}" min="0" max="59" style="text-align:center;font-size:20px;"/>
      </div>
    </div>
    <button class="btn primary" style="width:100%;" onclick="applyWorkoutTime()">SET TIME</button>
    <button class="btn ghost" style="width:100%;margin-top:8px;" onclick="hideModal()">CANCEL</button>
  `);
}
function applyWorkoutTime(){
  const h=parseInt(document.getElementById('edit-wo-hrs')?.value)||0;
  const m=parseInt(document.getElementById('edit-wo-min')?.value)||0;
  const newElapsed=(h*60+m)*60000;
  activeWorkout.startTime=Date.now()-newElapsed;
  try{localStorage.setItem('gainz_recovery',JSON.stringify(activeWorkout));}catch(e){}
  startWoTimer();
  hideModal();
  showToast('Workout time updated');
}
function abandonWorkout(){
  showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:12px;">LEAVE WORKOUT?</div>
    <div style="font-size:13px;color:var(--text);margin-bottom:20px;">This will discard everything from this session. Nothing will be saved.</div>
    <button class="btn primary" style="background:var(--danger);border-color:var(--danger);" onclick="activeWorkout=null;setHistory=[];skipTimer();stopWoTimer();collapsedEx.clear();doneExSet.clear();try{localStorage.removeItem('gainz_recovery');}catch(e){}screen='start';hideModal();render();">LEAVE WITHOUT SAVING</button>
    <button class="btn ghost" onclick="hideModal()" style="margin-top:8px;">KEEP WORKING</button>
  `);
}

// ═══════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════
function goBack(){
  if(progressEx){ progressEx=null; render(); return; }
  if(historyDetail){
    if(histEditMode&&histEditDirty){
      toggleHistEdit(); // will show save/discard modal
      return;
    }
    historyDetail=null; histEditMode=false; histEditDirty=false; histEditSnapshot=null; render(); return;
  }
  if(screen==="prHistory"){ screen="settings"; render(); return; }
  if(screen==="settings"){ screen="start"; render(); return; }
  if(screen==="log" && activeWorkout){ abandonWorkout(); return; }
}

function updateBackBtn(){
  const btn = document.getElementById("back-btn");
  if(!btn) return;
  const show = progressEx || historyDetail || screen==="settings" || screen==="log" || screen==="prHistory";
  btn.classList.toggle("visible", !!show);
}

let prevStateSnapshot="";
function render(){
  const renderStart=performance.now();
  prevStateSnapshot=JSON.stringify(state);
  document.getElementById("streak-el").textContent=`🔥 ${state.streak}`;
  renderNav();
  updateBackBtn();
  const c=document.getElementById("content");
  const scrollY=window.scrollY||0;
  try{
    if(screen==="start") c.innerHTML=renderHome();
    else if(screen==="log") c.innerHTML=renderLog();
    else if(screen==="me") c.innerHTML=renderMe();
    else if(screen==="settings"){ c.innerHTML=renderSettings(); setTimeout(()=>{ if(typeof renderSyncUI==='function') renderSyncUI(); },50); }
    else if(screen==="programBuilder") c.innerHTML=renderProgramBuilder();
    else if(screen==="prHistory") c.innerHTML=renderPRHistory();
  }catch(e){ console.error('[GAINZ render]',screen,e); c.innerHTML=`<div style="padding:20px;color:var(--danger);">Render error: ${e.message}</div>`; }
  if(screen==="log"){
    window.scrollTo(0,scrollY);
    setTimeout(initSwipeCollapse,0);
    setTimeout(initSetSwipes,0);
  }
  const sf=document.getElementById("sticky-finish");
  if(sf){
    const show=screen==="log"&&activeWorkout&&activeWorkout.exercises.length>0;
    sf.style.display=show?"block":"none";
    const ub=document.getElementById("sticky-undo");
    if(ub) ub.style.display=setHistory.length?"block":"none";
  }
  if(screen==="me") window.scrollTo(0,scrollY);
  // Inject summary overlay if active
  if(workoutSummary&&screen==="start"){
    const existing=document.getElementById("wo-summary");
    if(!existing){ try{ const el=document.createElement("div"); el.innerHTML=renderWorkoutSummary(); if(el.firstChild) document.body.appendChild(el.firstChild); }catch(sumErr){ console.error('[GAINZ] renderWorkoutSummary error:',sumErr); workoutSummary=null; } }
  } else {
    const stale=document.getElementById("wo-summary");
    if(stale) stale.remove();
  }
  if(screen==="start"){ setTimeout(initCarouselFade,0); setTimeout(maybeShowHomeTour,300); }
  if(FEATURES.devMode){const t=performance.now()-renderStart;if(t>16)console.warn(`[GAINZ] render() took ${t.toFixed(1)}ms`);}
}

function renderNav(){
  const nav=document.getElementById("nav");
  const tabs=[
    ["start","▲","START"],
    ["me","◎","ME"],
    ["settings","⚙","MORE"]
  ];
  if(activeWorkout) tabs.splice(1,0,["log","●","LOG"]);
  nav.innerHTML=tabs.map(([s,ic,lb])=>{
    const isActive=screen===s||(s==="settings"&&screen==="prHistory");
    const isLog=s==="log";
    const glowing=activeWorkout&&isLog;
    return `<button class="nav-btn ${isActive?"active":""}" onclick="screen='${s}';historyDetail=null;progressEx=null;render()" style="">
      <span class="icon" style="${glowing?"color:var(--accent);":""}">${glowing?"●":ic}</span>
      <span style="${glowing?"color:var(--accent);":""}">${lb}</span>
    </button>`;
  }).join("");
}

function renderBodyHeatmap(){
  const sets=getWeeklyMuscleSets();

  function glowStyle(muscle){
    const s=sets[muscle]||0;
    const info=MRV[muscle];
    if(!info) return {bg:'rgba(255,255,255,0.04)',color:'var(--dim)',shadow:'none',label:muscle};
    if(s===0) return {bg:'rgba(255,255,255,0.04)',color:'var(--dim)',shadow:'none',label:info.label};
    const pct=s/info.mrv;
    if(s<info.mev){
      return {bg:'rgba(232,213,160,0.08)',color:'rgba(232,213,160,0.5)',shadow:'0 0 6px rgba(232,213,160,0.15)',label:info.label};
    } else if(pct<=0.7){
      return {bg:'rgba(232,213,160,0.15)',color:'var(--accent)',shadow:'0 0 10px rgba(232,213,160,0.25)',label:info.label};
    } else {
      return {bg:'rgba(232,213,160,0.25)',color:'var(--accent)',shadow:'0 0 16px rgba(232,213,160,0.4)',label:info.label};
    }
  }

  function fill(muscle){
    const g=glowStyle(muscle);
    const s=sets[muscle]||0;
    if(s===0) return 'rgba(255,255,255,0.05)';
    const info=MRV[muscle];
    const pct=info?s/info.mrv:0;
    if(pct>=0.7) return 'rgba(232,213,160,0.7)';
    if(s>=info.mev) return 'rgba(232,213,160,0.4)';
    return 'rgba(232,213,160,0.15)';
  }
  function glow(muscle){
    const s=sets[muscle]||0;
    const info=MRV[muscle];
    if(!info||s===0) return '';
    const pct=s/info.mrv;
    const r=pct>=0.7?12:pct>=info.mev/info.mrv?6:0;
    return r?`filter="url(#muscleGlow${r})"`:''
  }
  function label(muscle,x,y){
    const s=sets[muscle]||0;
    const info=MRV[muscle];
    if(!info) return '';
    return `<text x="${x}" y="${y}" text-anchor="middle" style="font-size:7px;fill:${s>0?'rgba(232,213,160,0.8)':'rgba(255,255,255,0.2)'};font-family:DM Sans,sans-serif;">${info.label} ${s}/${info.mrv}</text>`;
  }

  return `<div style="margin-bottom:16px;">
    <div style="font-size:8px;letter-spacing:3px;color:var(--muted);text-transform:uppercase;margin-bottom:10px;border-bottom:1px solid #1e1e24;padding-bottom:8px;">This Week · Body Map</div>
    <div class="card" style="padding:16px 12px;text-align:center;">
      <svg viewBox="0 0 200 340" style="max-width:220px;margin:0 auto;">
        <defs>
          <filter id="muscleGlow6"><feGaussianBlur stdDeviation="3" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="muscleGlow12"><feGaussianBlur stdDeviation="6" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <!-- Body outline -->
        <ellipse cx="100" cy="28" rx="18" ry="22" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.08)" stroke-width="0.5"/>
        <!-- Neck -->
        <rect x="93" y="48" width="14" height="12" rx="4" fill="rgba(255,255,255,0.04)"/>
        <!-- Shoulders -->
        <ellipse cx="62" cy="72" rx="22" ry="10" fill="${fill('shoulders')}" ${glow('shoulders')}/>
        <ellipse cx="138" cy="72" rx="22" ry="10" fill="${fill('shoulders')}" ${glow('shoulders')}/>
        ${label('shoulders',100,68)}
        <!-- Chest -->
        <rect x="72" y="65" width="56" height="35" rx="8" fill="${fill('chest')}" ${glow('chest')}/>
        ${label('chest',100,88)}
        <!-- Biceps -->
        <ellipse cx="46" cy="110" rx="10" ry="22" fill="${fill('biceps')}" ${glow('biceps')}/>
        ${label('biceps',30,112)}
        <!-- Triceps -->
        <ellipse cx="154" cy="110" rx="10" ry="22" fill="${fill('triceps')}" ${glow('triceps')}/>
        ${label('triceps',170,112)}
        <!-- Back (behind chest, shown as side strips) -->
        <rect x="68" y="100" width="64" height="40" rx="6" fill="${fill('back')}" ${glow('back')}/>
        ${label('back',100,124)}
        <!-- Forearms -->
        <ellipse cx="40" cy="148" rx="7" ry="18" fill="rgba(255,255,255,0.04)"/>
        <ellipse cx="160" cy="148" rx="7" ry="18" fill="rgba(255,255,255,0.04)"/>
        <!-- Core/waist -->
        <rect x="76" y="140" width="48" height="30" rx="6" fill="rgba(255,255,255,0.04)"/>
        <!-- Glutes -->
        <ellipse cx="88" cy="182" rx="18" ry="14" fill="${fill('glutes')}" ${glow('glutes')}/>
        <ellipse cx="112" cy="182" rx="18" ry="14" fill="${fill('glutes')}" ${glow('glutes')}/>
        ${label('glutes',100,186)}
        <!-- Quads -->
        <ellipse cx="85" cy="230" rx="16" ry="35" fill="${fill('quads')}" ${glow('quads')}/>
        <ellipse cx="115" cy="230" rx="16" ry="35" fill="${fill('quads')}" ${glow('quads')}/>
        ${label('quads',100,225)}
        <!-- Hamstrings (behind quads, shown offset) -->
        <ellipse cx="85" cy="240" rx="12" ry="28" fill="${fill('hamstrings')}" opacity="0.6" ${glow('hamstrings')}/>
        <ellipse cx="115" cy="240" rx="12" ry="28" fill="${fill('hamstrings')}" opacity="0.6" ${glow('hamstrings')}/>
        ${label('hamstrings',100,255)}
        <!-- Calves -->
        <ellipse cx="85" cy="295" rx="10" ry="22" fill="rgba(255,255,255,0.04)"/>
        <ellipse cx="115" cy="295" rx="10" ry="22" fill="rgba(255,255,255,0.04)"/>
        <!-- Feet -->
        <ellipse cx="85" cy="325" rx="10" ry="6" fill="rgba(255,255,255,0.04)"/>
        <ellipse cx="115" cy="325" rx="10" ry="6" fill="rgba(255,255,255,0.04)"/>
      </svg>
      <div style="display:flex;justify-content:center;gap:16px;margin-top:8px;">
        <div style="display:flex;align-items:center;gap:4px;"><div style="width:8px;height:8px;border-radius:2px;background:rgba(255,255,255,0.05);border:1px solid #1e1e24;"></div><span style="font-size:8px;color:var(--dim);">Rest</span></div>
        <div style="display:flex;align-items:center;gap:4px;"><div style="width:8px;height:8px;border-radius:2px;background:rgba(232,213,160,0.4);"></div><span style="font-size:8px;color:var(--dim);">Active</span></div>
        <div style="display:flex;align-items:center;gap:4px;"><div style="width:8px;height:8px;border-radius:2px;background:rgba(232,213,160,0.7);box-shadow:0 0 6px rgba(232,213,160,0.4);"></div><span style="font-size:8px;color:var(--dim);">Near MRV</span></div>
      </div>
    </div>
  </div>`;
}

function renderMuscleFatigue(){
  const sets=getWeeklyMuscleSets();
  // Only show muscles that have ANY sets this week OR are relevant to this week's splits
  const weekStart=new Date(); weekStart.setDate(weekStart.getDate()-weekStart.getDay()); weekStart.setHours(0,0,0,0);
  const trainedSplits=new Set(state.workouts.filter(w=>new Date(w.timestamp)>=weekStart).map(w=>w.split));
  // Show muscles touched this week, or all if none yet
  const relevantMuscles=Object.keys(MRV).filter(m=>sets[m]>0);
  if(!relevantMuscles.length) return "";

  const rows=relevantMuscles.map(m=>{
    const info=MRV[m];
    const s=sets[m]||0;
    const pct=Math.min(s/info.mrv,1);
    const status=s===0?"none":s<info.mev?"low":s<=info.mrv*0.7?"good":s<=info.mrv?"high":"over";
    const colors={none:"var(--dim)",low:"#5b8fff",good:"var(--green)",high:"var(--accent)",over:"var(--red)"};
    const labels={none:"—",low:"Under MEV",good:"Good",high:"Near MRV",over:"Exceeded"};
    const color=colors[status];
    const barW=Math.round(pct*100);
    return `<div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span style="font-size:12px;color:var(--text);">${info.label}</span>
        <span style="font-size:11px;color:${color};font-weight:600;">${s} sets <span style="font-weight:400;color:var(--dim);">/ ${info.mrv} MRV</span></span>
      </div>
      <div style="height:5px;background:var(--bg3);border-radius:3px;overflow:hidden;">
        <div style="height:100%;width:${barW}%;background:${color};border-radius:3px;transition:width 0.4s ease;"></div>
      </div>
      <div style="font-size:9px;color:${color};margin-top:2px;letter-spacing:0.5px;">${labels[status]}</div>
    </div>`;
  }).join("");

  return `<div style="font-size:8px;letter-spacing:3px;color:var(--muted);text-transform:uppercase;margin:20px 0 10px;border-bottom:1px solid #1e1e24;padding-bottom:8px;">This Week · Muscle Volume</div>
  <div class="card">
    <div style="font-size:10px;color:var(--dim);margin-bottom:14px;line-height:1.5;">Sets per muscle group vs maximum recoverable volume (MRV). Source: Israetel et al., RP Strength.</div>
    ${rows}
    <div style="font-size:9px;color:var(--dim);margin-top:4px;">MEV = minimum effective volume · MRV = max recoverable volume</div>
  </div>`;
}
let _funStatPool=null; // cached by render()
function cycleFunStat(){
  funStatIdx++;
  if(!_funStatPool||!_funStatPool.length) return;
  const stat=_funStatPool[funStatIdx%_funStatPool.length];
  // Update insight card directly — no full render()
  const card=document.querySelector('.sb-insight');
  if(!card) return;
  const valEl=card.querySelector('.sb-insight-val');
  const labelEl=card.querySelector('.sb-insight-label');
  const subEl=card.querySelector('.sb-insight-sub');
  if(valEl) valEl.textContent=stat.val;
  if(labelEl) labelEl.textContent=stat.label;
  if(subEl){
    if(stat.sub){ subEl.textContent=stat.sub; subEl.style.display=''; }
    else { subEl.textContent=''; subEl.style.display='none'; }
  } else if(stat.sub){
    const s=document.createElement('div');
    s.className='sb-insight-sub';
    s.textContent=stat.sub;
    labelEl.parentNode.appendChild(s);
  }
}

function initCarouselFade(){
  const wrap=document.getElementById('split-carousel');
  const track=document.getElementById('split-carousel-track');
  if(!wrap||!track||wrap._fadeInited) return;
  wrap._fadeInited=true;

  // Suppress clicks after drag — track whether a real drag happened
  let didDrag=false;
  wrap.addEventListener('click',e=>{
    if(didDrag){ e.stopPropagation(); e.preventDefault(); didDrag=false; }
  },true);

  // Duplicate pills for infinite loop
  const original=track.innerHTML;
  track.innerHTML=original+original;
  const halfWidth=track.scrollWidth/2;

  // Collect pill positions (centers relative to track start)
  const pills=track.querySelectorAll('.split-pill');
  const pillCenters=[];
  pills.forEach(p=>{
    pillCenters.push(p.offsetLeft+p.offsetWidth/2);
  });

  let offset=0;
  const wrapCenter=wrap.offsetWidth/2;

  function applyPos(animate){
    track.style.transition=animate?'transform 0.35s cubic-bezier(0.25,1,0.5,1)':'none';
    track.style.transform='translateX('+offset+'px)';
    updateFade();
  }

  function wrapOffset(){
    if(offset<-halfWidth) offset+=halfWidth;
    else if(offset>0) offset-=halfWidth;
  }

  // Snap: find pill closest to center and shift offset so it's exactly centered
  function snapToNearest(){
    wrapOffset();
    let bestDist=Infinity, bestOffset=offset;
    pillCenters.forEach(pc=>{
      const pillScreenPos=pc+offset;
      const dist=Math.abs(pillScreenPos-wrapCenter);
      if(dist<bestDist){
        bestDist=dist;
        bestOffset=offset-(pillScreenPos-wrapCenter);
      }
    });
    offset=bestOffset;
    wrapOffset();
    applyPos(true);
  }

  function updateFade(){
    const allPills=wrap.querySelectorAll('.split-pill');
    const rect=wrap.getBoundingClientRect();
    const center=rect.left+rect.width/2;
    let closestPill=null, closestDist=Infinity;
    allPills.forEach(p=>{
      const pr=p.getBoundingClientRect();
      const pillCenter=pr.left+pr.width/2;
      const dist=Math.abs(pillCenter-center);
      const pillW=pr.width;
      const t=Math.min(1,dist/(pillW*0.8));
      const opacity=Math.max(0.15,1-t*0.85);
      const scale=Math.max(0.88,1-t*0.12);
      p.style.opacity=opacity;
      p.style.transform='scale('+scale+')';
      p.style.transition='opacity 0.15s,transform 0.15s';
      // Track center pill for glow + label
      const inner=p.querySelector('.split-pill-inner');
      if(inner){
        if(!inner._origBorder) inner._origBorder=inner.style.borderColor||'';
        const isCenter=dist<pillW*0.4;
        inner.style.boxShadow=isCenter?'0 0 18px rgba(232,213,160,0.3), 0 0 6px rgba(232,213,160,0.15) inset':'none';
        inner.style.borderColor=isCenter?'rgba(232,213,160,0.45)':inner._origBorder;
      }
      if(dist<closestDist){ closestDist=dist; closestPill=p; }
    });
    // Update label
    const label=document.getElementById('carousel-label');
    if(label&&closestPill){
      label.textContent=closestPill.dataset.label||'';
    }
  }

  // Momentum / inertia
  let velocity=0, lastX=0, lastTime=0, momentumRAF=null;

  function coast(){
    velocity*=0.92; // friction
    offset+=velocity;
    wrapOffset();
    track.style.transition='none';
    track.style.transform='translateX('+offset+'px)';
    updateFade();
    if(Math.abs(velocity)>0.5){
      momentumRAF=requestAnimationFrame(coast);
    } else {
      snapToNearest();
    }
  }
  function startCoast(){
    if(Math.abs(velocity)>2){
      momentumRAF=requestAnimationFrame(coast);
    } else {
      snapToNearest();
    }
  }
  function stopCoast(){
    if(momentumRAF){ cancelAnimationFrame(momentumRAF); momentumRAF=null; }
  }

  // Touch
  let startX=0,startY=0,dragging=false,lockAxis=null,startOffset=0;
  wrap.addEventListener('touchstart',e=>{
    stopCoast();
    startX=e.touches[0].clientX; startY=e.touches[0].clientY;
    lastX=startX; lastTime=Date.now();
    startOffset=offset; dragging=true; lockAxis=null;
    velocity=0;
    track.style.transition='none';
  },{passive:true});
  wrap.addEventListener('touchmove',e=>{
    if(!dragging) return;
    const dx=e.touches[0].clientX-startX;
    const dy=e.touches[0].clientY-startY;
    if(!lockAxis) lockAxis=Math.abs(dx)>Math.abs(dy)?'x':'y';
    if(lockAxis!=='x') return;
    e.preventDefault();
    if(Math.abs(dx)>5) didDrag=true;
    const now=Date.now();
    const dt=now-lastTime||1;
    velocity=(e.touches[0].clientX-lastX)/(dt/16);
    lastX=e.touches[0].clientX; lastTime=now;
    offset=startOffset+dx;
    wrapOffset();
    track.style.transform='translateX('+offset+'px)';
    updateFade();
  },{passive:false});
  wrap.addEventListener('touchend',()=>{
    dragging=false;
    startCoast();
  },{passive:true});

  // Mouse (trackpad / desktop)
  let mDown=false,mStartX=0,mStartOffset=0;
  wrap.addEventListener('mousedown',e=>{
    stopCoast();
    mDown=true; mStartX=e.clientX; mStartOffset=offset;
    lastX=e.clientX; lastTime=Date.now(); velocity=0;
    track.style.transition='none'; wrap.style.cursor='grabbing';
    e.preventDefault();
  });
  wrap.addEventListener('mousemove',e=>{
    if(!mDown) return;
    if(Math.abs(e.clientX-mStartX)>5) didDrag=true;
    const now=Date.now();
    const dt=now-lastTime||1;
    velocity=(e.clientX-lastX)/(dt/16);
    lastX=e.clientX; lastTime=now;
    offset=mStartOffset+(e.clientX-mStartX);
    wrapOffset();
    track.style.transform='translateX('+offset+'px)';
    updateFade();
  });
  wrap.addEventListener('mouseup',()=>{
    if(!mDown) return;
    mDown=false; wrap.style.cursor='grab';
    startCoast();
  });
  wrap.addEventListener('mouseleave',()=>{
    if(mDown){ mDown=false; wrap.style.cursor='grab'; startCoast(); }
  });
  wrap.style.cursor='grab';

  // Start with first pill centered
  if(pillCenters.length){
    offset=wrapCenter-pillCenters[0];
    wrapOffset();
  }
  applyPos(false);
}

// ── Home Tour — instructional bubbles on first visit ──
const HOME_TOUR_STEPS=[
  {sel:'.sb-hero',msg:'Your Daily Workout',desc:'GAINZ picks the best split for today based on your history. Tap to jump right in.',pos:'below'},
  {sel:'.sb-insight',msg:'Tips & Stats',desc:'Tap to cycle through science-backed tips and your personal training stats. The more you train, the better these get.',pos:'below'},
  {sel:'#split-carousel',msg:'Browse Workouts',desc:'Swipe through your program splits and other workout types. Tap any to start.',pos:'below'},
  {sel:'.sb-header-date',msg:'Workout Calendar',desc:'Tap the date to see which days you trained this month at a glance.',pos:'below'},
  {sel:'#nav',msg:'Explore the Tabs',desc:'Log workouts, review history, import old data from photos or text, and track your stats. Dive in.',pos:'above'},
];
let homeTourStep=-1;
let homeTourEl=null;

function maybeShowHomeTour(){
  if(localStorage.getItem('gainz_seen_home_tour')) return;
  if(homeTourStep>=0) return; // already showing
  homeTourStep=0;
  showHomeTourStep();
}

function showHomeTourStep(){
  removeHomeTour();
  if(homeTourStep>=HOME_TOUR_STEPS.length){
    localStorage.setItem('gainz_seen_home_tour','1');
    homeTourStep=-1;
    return;
  }
  const step=HOME_TOUR_STEPS[homeTourStep];

  // For nav tab steps, find the actual nav button
  let target;
  if(step.navTab!==undefined){
    const navBtns=document.querySelectorAll('.nav-btn');
    target=navBtns[step.navTab];
  } else {
    target=document.querySelector(step.sel);
  }
  if(!target){ homeTourStep++; showHomeTourStep(); return; }

  const content=document.querySelector('.content');
  if(!content) return;

  // Create overlay to dim background
  const overlay=document.createElement('div');
  overlay.id='home-tour-overlay';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:90;';
  overlay.addEventListener('click',advanceHomeTour);
  document.body.appendChild(overlay);

  // Highlight target by raising it above overlay
  target.style.position='relative';
  target.style.zIndex='91';
  target._tourHighlight=true;

  // Step counter
  const stepNum=homeTourStep+1;
  const totalSteps=HOME_TOUR_STEPS.length;

  // Create tooltip
  const tip=document.createElement('div');
  tip.className='home-tour-tip';
  // Progress dots instead of numbers
  const dots=[...Array(HOME_TOUR_STEPS.length)].map((_,i)=>
    `<span style="display:inline-block;width:${i===homeTourStep?'16px':'5px'};height:5px;border-radius:3px;background:${i===homeTourStep?'#1a1510':'rgba(26,21,16,0.25)'};transition:all 0.2s;"></span>`
  ).join('');
  tip.innerHTML=`
    <div class="home-tour-title">${step.msg}</div>
    <div class="home-tour-desc">${step.desc||''}</div>
    <div style="display:flex;gap:4px;justify-content:center;margin-top:8px;">${dots}</div>
  `;

  const tRect=target.getBoundingClientRect();

  if(step.pos==='above'){
    // Nav tabs — position tooltip fixed above the target
    tip.style.position='fixed';
    tip.style.bottom=(window.innerHeight-tRect.top+10)+'px';
    tip.style.left='50%';
    tip.style.transform='translateX(-50%)';
    tip.classList.add('arrow-down');
    document.body.appendChild(tip);
  } else {
    const contentRect=content.getBoundingClientRect();
    tip.style.top=(tRect.bottom-contentRect.top+content.scrollTop+10)+'px';
    tip.style.left='50%';
    tip.style.transform='translateX(-50%)';
    tip.classList.add('arrow-up');
    content.style.position='relative';
    content.appendChild(tip);
    // Scroll tooltip into view if it's off-screen
    requestAnimationFrame(()=>{
      const tipRect=tip.getBoundingClientRect();
      if(tipRect.bottom>window.innerHeight-80){
        content.scrollBy({top:tipRect.bottom-window.innerHeight+100,behavior:'smooth'});
      }
    });
  }
  homeTourEl=tip;
}

function advanceHomeTour(){
  homeTourStep++;
  showHomeTourStep();
}

function removeHomeTour(){
  // Remove overlay
  const ov=document.getElementById('home-tour-overlay');
  if(ov) ov.remove();
  // Remove tooltip
  if(homeTourEl){ homeTourEl.remove(); homeTourEl=null; }
  // Reset highlighted targets
  document.querySelectorAll('[style]').forEach(el=>{
    if(el._tourHighlight){ el.style.zIndex=''; el._tourHighlight=false; }
  });
}

// Home calendar widget — moved to js/home-calendar.js


function renderThisWeek(){
  const weekStart=new Date();
  weekStart.setDate(weekStart.getDate()-weekStart.getDay());
  weekStart.setHours(0,0,0,0);
  const thisWeek=state.workouts.filter(w=>new Date(w.timestamp)>=weekStart);
  if(!thisWeek.length) return '';
  const totalVol=thisWeek.reduce((a,w)=>a+(w.totalVolume||0),0);
  const totalSets=thisWeek.reduce((a,w)=>a+w.exercises.reduce((b,e)=>b+e.sets.length,0),0);
  const totalMin=Math.round(thisWeek.reduce((a,w)=>a+(w.duration||0),0)/60000);
  const prCount=thisWeek.reduce((a,w)=>a+w.exercises.reduce((b,e)=>b+e.sets.filter(s=>s.pr).length,0),0);
  const splits=[...new Set(thisWeek.map(w=>splitName(w.split)))];
  return `<div style="background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:14px;margin-bottom:10px;">
    <div style="font-size:8px;letter-spacing:2.5px;color:var(--muted);text-transform:uppercase;margin-bottom:10px;">THIS WEEK</div>
    <div style="display:flex;gap:8px;margin-bottom:8px;">
      <div style="flex:1;background:#0f0f12;border:1px solid #1e1e24;border-radius:10px;padding:10px;text-align:center;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:24px;color:var(--accent);line-height:1;">${thisWeek.length}</div>
        <div style="font-size:8px;color:var(--dim);letter-spacing:1px;margin-top:2px;">WORKOUTS</div>
      </div>
      <div style="flex:1;background:#0f0f12;border:1px solid #1e1e24;border-radius:10px;padding:10px;text-align:center;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:24px;color:var(--accent);line-height:1;">${totalVol>0?Math.round(totalVol/1000)+'k':'—'}</div>
        <div style="font-size:8px;color:var(--dim);letter-spacing:1px;margin-top:2px;">LB MOVED</div>
      </div>
      <div style="flex:1;background:#0f0f12;border:1px solid #1e1e24;border-radius:10px;padding:10px;text-align:center;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:24px;color:var(--accent);line-height:1;">${totalMin}</div>
        <div style="font-size:8px;color:var(--dim);letter-spacing:1px;margin-top:2px;">MINUTES</div>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:10px;color:var(--dim);">${splits.join(' · ')}</div>
      <div style="display:flex;gap:6px;font-size:10px;">
        ${prCount?`<span style="color:var(--accent);">🏆 ${prCount} PR${prCount!==1?'s':''}</span>`:''}
        <span style="color:var(--muted);">${totalSets} sets</span>
      </div>
    </div>
  </div>`;
}

function renderTemplateQuickLaunch(){
  const templates=state.templates||[];
  if(!templates.length) return '';
  return `<div style="margin-bottom:10px;">
    <div style="font-size:8px;letter-spacing:2.5px;color:var(--muted);text-transform:uppercase;margin-bottom:8px;">QUICK START FROM TEMPLATE</div>
    <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch;">
      ${templates.slice(0,6).map(t=>`<button onclick="loadTemplate('${t.id}')" style="flex-shrink:0;background:var(--bg2);border:1px solid var(--border2);border-radius:10px;padding:10px 14px;cursor:pointer;text-align:left;min-width:120px;">
        <div style="font-size:12px;color:var(--text);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;">${t.name}</div>
        <div style="font-size:9px;color:var(--dim);margin-top:3px;">${t.exercises.length} exercises</div>
      </button>`).join('')}
    </div>
  </div>`;
}

function renderHome(){
  const rec=getRec();
  const lw=state.workouts[0];
  const lw2=state.workouts[1];

  const streak=state.streak||0;
  const lastSplit=lw?splitName(lw.split):"--";
  const prevSplit=lw2?lw2.split:"--";

  let daysRest="--";
  if(state.lastWorkoutDate){
    const last=new Date(state.lastWorkoutDate);
    const diff=Math.floor((new Date()-last)/(1000*60*60*24));
    daysRest=diff===0?"Today":diff+"d";
  }

  const weekStart=new Date();
  weekStart.setDate(weekStart.getDate()-weekStart.getDay());
  weekStart.setHours(0,0,0,0);
  const thisWeek=state.workouts.filter(w=>new Date(w.timestamp)>=weekStart).length;

  // ── Fun rotating stat ──
  const allSets=state.workouts.flatMap(w=>(w.exercises||[]).flatMap(e=>(e.sets||[])));
  const allTimeTonnage=state.workouts.reduce((a,w)=>a+(w.totalVolume||0),0);

  // Tonnage comparisons
  const COMPARISONS=[
    {lbs:4000,label:"a baby elephant"},
    {lbs:8000,label:"a hippo"},
    {lbs:33000,label:"a literal T-Rex"},
    {lbs:40000,label:"a school bus"},
    {lbs:80000,label:"a space shuttle"},
    {lbs:900000,label:"the Statue of Liberty"},
    {lbs:2000000,label:"a blue whale x3"},
  ];
  let comp=COMPARISONS[0];
  for(const c of COMPARISONS){ if(allTimeTonnage>=c.lbs) comp=c; }
  const compCount=allTimeTonnage>0?Math.floor(allTimeTonnage/comp.lbs):0;

  // Favorite exercise by frequency
  const exFreq={};
  state.workouts.forEach(w=>w.exercises.forEach(e=>{ exFreq[e.name]=(exFreq[e.name]||0)+1; }));
  const favEx=Object.entries(exFreq).sort((a,b)=>b[1]-a[1])[0];

  // Most trained split this month
  const monthStart=new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const splitFreq={}; getActiveSplits().forEach(s=>splitFreq[s]=0);
  state.workouts.filter(w=>new Date(w.timestamp)>=monthStart).forEach(w=>{ if(splitFreq[w.split]!==undefined) splitFreq[w.split]++; });
  const topSplit=Object.entries(splitFreq).sort((a,b)=>b[1]-a[1])[0];

  // Volume vs 7 days ago
  const sevenDaysAgo=new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate()-7);
  const recentVol=state.workouts.filter(w=>new Date(w.timestamp)>=sevenDaysAgo).reduce((a,w)=>a+(w.totalVolume||0),0);
  const olderVol=state.workouts.filter(w=>{const d=new Date(w.timestamp);return d<sevenDaysAgo && d>=new Date(sevenDaysAgo.getTime()-7*86400000);}).reduce((a,w)=>a+(w.totalVolume||0),0);
  const volDelta=olderVol>0?Math.round(((recentVol-olderVol)/olderVol)*100):null;

  // Total PRs (approximate — count sessions where totalVolume exceeds all prior)
  let prCount=0;
  state.workouts.forEach((w,i)=>{
    const prior=state.workouts.slice(i+1).filter(p=>p.split===w.split);
    if(prior.length===0) return;
    if(w.totalVolume>Math.max(...prior.map(p=>p.totalVolume))) prCount++;
  });

  // Longest rest ever used
  const restVals=Object.values(state.exerciseRests||{});
  const longestRest=restVals.length?Math.max(...restVals):null;

  // Days trained this month
  const daysThisMonth=state.workouts.filter(w=>new Date(w.timestamp)>=monthStart).length;

  // Estimated 1RM on top lift (Epley formula)
  let best1RM=null, best1RMex="";
  state.workouts.forEach(w=>w.exercises.forEach(e=>e.sets.forEach(s=>{
    if(!s.bw && parseFloat(s.weight)>0 && parseInt(s.reps)>0){
      const orm=est1RM(s.weight,s.reps);
      if(!best1RM||orm>best1RM.val){ best1RM={val:orm,ex:e.name}; }
    }
  })));

  // Consistency score — % of days this week that had a workout
  const daysInWeek=Math.min(new Date().getDay()||7,7);
  const consistency=daysInWeek>0?Math.round((thisWeek/daysInWeek)*100):0;

  // Build stat pool — only include stats with actual data
  const funStats=[];
  if(allTimeTonnage>0) funStats.push({val:allTimeTonnage.toLocaleString()+"lb",label:"All-time tonnage",sub:compCount>0?`That's ${compCount}x ${comp.label}`:""});
  if(favEx) funStats.push({val:favEx[0],label:"Your ride-or-die",sub:`Logged ${favEx[1]}x`});
  if(topSplit&&topSplit[1]>0) funStats.push({val:splitName(topSplit[0])+" Day",label:"Most trained this month",sub:`${topSplit[1]} sessions`});
  if(volDelta!==null) funStats.push({val:(volDelta>=0?"+":"")+volDelta+"%",label:"Volume vs last week",sub:volDelta>=0?"Trending up":"Back it up"});
  if(prCount>0) funStats.push({val:prCount,label:"PRs set",sub:"All time"});
  if(longestRest) funStats.push({val:longestRest+"s",label:"Longest rest timer",sub:"Patience is a virtue"});
  if(daysThisMonth>0) funStats.push({val:daysThisMonth,label:"Sessions this month",sub:daysThisMonth>=10?"Beast mode":"Keep stacking"});
  if(best1RM) funStats.push({val:best1RM.val+"lb",label:"Est. 1RM",sub:best1RM.ex});
  if(thisWeek>0) funStats.push({val:consistency+"%",label:"Consistency this week",sub:consistency>=80?"On fire":"Room to grow"});

  // Avg rest last workout vs all-time avg rest
  const lastWoRests=lw?lw.exercises.map(e=>state.exerciseRests[e.name]||45):[];
  const lastWoAvgRest=lastWoRests.length?Math.round(lastWoRests.reduce((a,b)=>a+b,0)/lastWoRests.length):null;
  const allRestVals=Object.values(state.exerciseRests||{});
  const allTimeAvgRest=allRestVals.length?Math.round(allRestVals.reduce((a,b)=>a+b,0)/allRestVals.length):null;
  if(lastWoAvgRest&&allTimeAvgRest) funStats.push({val:lastWoAvgRest+"s",label:"Avg rest last workout",sub:"All-time avg: "+allTimeAvgRest+"s"});

  // Avg workout duration all-time
  const durWorkouts=state.workouts.filter(w=>w.duration&&w.duration>0);
  const avgDurMs=durWorkouts.length?durWorkouts.reduce((a,w)=>a+w.duration,0)/durWorkouts.length:null;
  if(avgDurMs){
    const avgMins=Math.round(avgDurMs/60000);
    funStats.push({val:avgMins+"min",label:"Avg workout length",sub:avgMins<45?"Keep it tight":"Putting in work"});
  }

  // Longest workout ever
  const longestWo=durWorkouts.length?durWorkouts.reduce((a,w)=>w.duration>a.duration?w:a,durWorkouts[0]):null;
  if(longestWo){
    const lMins=Math.round(longestWo.duration/60000);
    funStats.push({val:lMins+"min",label:"Longest session ever",sub:splitName(longestWo.split)+" day"});
  }

  // Shortest workout ever (min 5 min to exclude accidents)
  const shortWo=durWorkouts.filter(w=>w.duration>=5*60000);
  const fastestWo=shortWo.length?shortWo.reduce((a,w)=>w.duration<a.duration?w:a,shortWo[0]):null;
  if(fastestWo){
    const fMins=Math.round(fastestWo.duration/60000);
    funStats.push({val:fMins+"min",label:"Fastest session",sub:"In and out"});
  }

  // Total time under bar all-time
  const totalDurMs=durWorkouts.reduce((a,w)=>a+w.duration,0);
  if(totalDurMs>0){
    const totalHrs=Math.round(totalDurMs/3600000*10)/10;
    funStats.push({val:totalHrs+"hrs",label:"Total time training",sub:totalHrs>=100?"Certified gym rat":totalHrs>=50?"Committed":"Just getting started"});
  }

  // Avg sets per workout
  const avgSets=state.workouts.length?Math.round(state.workouts.reduce((a,w)=>a+w.exercises.reduce((b,e)=>b+e.sets.length,0),0)/state.workouts.length):null;
  if(avgSets) funStats.push({val:avgSets,label:"Avg sets per session",sub:avgSets>=20?"High volume":"Focused"});

  // Most productive day of week
  const dayTotals={0:0,1:0,2:0,3:0,4:0,5:0,6:0};
  const dayCounts={0:0,1:0,2:0,3:0,4:0,5:0,6:0};
  const dayNames=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  state.workouts.forEach(w=>{ const d=new Date(w.timestamp).getDay(); dayTotals[d]+=(w.totalVolume||0); dayCounts[d]++; });
  const dayAvgs=Object.entries(dayCounts).filter(([,c])=>c>0).map(([d,c])=>({day:parseInt(d),avg:dayTotals[d]/c}));
  const bestDay=dayAvgs.length?dayAvgs.reduce((a,b)=>b.avg>a.avg?b:a):null;
  if(bestDay) funStats.push({val:dayNames[bestDay.day],label:"Your strongest day",sub:"By avg volume"});

  const emptyTips=[
    {val:"66 days",label:"That's how long it takes a gym habit to stick",sub:"Lally et al. 2010 · You just need to start"},
    {val:"10 sets",label:"Per muscle per week triggers growth. That's it.",sub:"Schoenfeld et al. 2017"},
    {val:"225 lb",label:"Avg intermediate bench press",sub:"Log yours and track the climb"},
    {val:"315 lb",label:"Avg intermediate squat",sub:"The king of all lifts"},
    {val:"1,000 lb",label:"The 1,000 lb club",sub:"Squat + bench + deadlift combined"},
    {val:"48 hrs",label:"Your muscles grow for 2 days after lifting",sub:"Every session keeps building"},
    {val:"1 g/lb",label:"Daily protein target for max gains",sub:"The one rule that works"},
    {val:"3× /wk",label:"Hitting each muscle 2–3x is optimal",sub:"Frequency > volume"},
    {val:"7–9 hrs",label:"Sleep is the #1 legal steroid",sub:"Muscle repairs while you rest"},
    {val:"+2.5%",label:"Add weight each week = linear gains",sub:"Progressive overload is king"},
    {val:"~45 min",label:"Avg effective workout length",sub:"Quality over quantity"},
    {val:"💪",label:"You're already ahead of most people",sub:"Just by being here"},
    {val:"12 wks",label:"Noticeable strength gains in 12 weeks",sub:"Consistency is the cheat code"},
  ];
  // Mix tips into real stats pool (every 3rd slot is a tip)
  const mixed=[];
  let ti=0;
  // Build pool: habit tip first, then real stats mixed with tips
  const pool=[emptyTips[0]]; // "66 days" is always first
  funStats.forEach((s,i)=>{ pool.push(s); if((i+1)%3===0) pool.push(emptyTips[(ti++)%emptyTips.length]); });
  // Append remaining tips that weren't mixed in
  emptyTips.forEach((t,i)=>{ if(i>0&&!pool.includes(t)) pool.push(t); });

  _funStatPool=pool; // cache for cycleFunStat
  let funStat;
  if(funStatIdx>=0){
    funStat=pool[funStatIdx%pool.length];
  } else {
    funStat=pool[0]; // always show "66 days" on first load
  }

  // Split glow colors for scoreboard
  const SPLIT_GLOWS={Push:'rgba(255,80,60,0.12)',Pull:'rgba(139,114,224,0.12)',Legs:'rgba(82,200,122,0.10)',Core:'rgba(60,180,200,0.10)',Chest:'rgba(255,80,60,0.12)',Back:'rgba(100,140,220,0.10)',Arms:'rgba(139,114,224,0.14)',Shoulders:'rgba(232,213,160,0.08)',Upper:'rgba(255,80,60,0.10)',Lower:'rgba(82,200,122,0.10)',Full:'rgba(180,180,180,0.07)'};
  const splitGlow=SPLIT_GLOWS[rec]||'rgba(232,213,160,0.08)';

  // Last time this specific split was trained
  const lastThisSplit=state.workouts.find(w=>w.split===rec);
  const lastLine=lastThisSplit
    ?`${lastThisSplit.date}  ·  ${lastThisSplit.exercises.length} exercises  ·  ${lastThisSplit.totalVolume>0?lastThisSplit.totalVolume.toLocaleString()+' lb':'BW'}`
    :`First time — let's go`;

  // Greeting + motivational phrase
  const hr=new Date().getHours();
  const greetWord=hr<12?'Morning':hr<17?'Afternoon':'Evening';
  const PHRASES=['Earn it.','No shortcuts.','One more rep.','Stay hungry.','Build something.','Be relentless.','Outwork yesterday.','Trust the grind.','Show up daily.','Prove them wrong.','Own the day.','Keep stacking.','Never settle.','Discipline wins.','Stay locked in.','Get after it.','Rise and grind.','No excuses.','Push harder.','Be uncommon.','Stay the course.','Grind now. Shine later.','Make it count.','Respect the process.','Keep going.','Almost there.','You chose this.','Embrace the suck.','Built different.','Level up.','Day by day.','Stronger today.','Iron sharpens iron.','Find the edge.','Make it burn.','Heavy metal therapy.','Control the weight.','Mind over matter.','Break through.','Leave it all.','Zero regrets.','Hard work pays.','Sweat equity.','Raise the bar.','Never enough.','Beast mode.','Go deeper.','More in the tank.','Pain is temporary.','Gains are forever.','Earn your shower.','The bar won\'t lift itself.','Results require reps.','Consistency is king.','Your future self thanks you.','No days off.','Train insane.','Be the hardest worker.','Obsessed or average.','Winners train.','Fall in love with the process.','Attack the day.','Relentless pursuit.','Be dangerous.','Make them notice.','Silence the doubt.','Prove it daily.','Comfort is the enemy.','Hard choices. Easy life.','Stay savage.','Unbreakable.','Forge ahead.','Lead by example.','Commit fully.','Finish strong.','Set the standard.','No looking back.','Hungry and humble.','Dominate.','Create your legacy.','Maximum effort.','Chase greatness.','Become the weapon.','Every rep matters.','Progress not perfection.','Stay in the fight.','Build your empire.','The grind is the gift.','Suffer now. Win later.','Wake up dangerous.','You vs you.','Never retreat.','Always forward.','Stand on business.','Lock in.','Execute.','Ship it.','Do the work.','Get uncomfortable.','Become undeniable.'];
  const phraseIdx=Math.floor(Date.now()/3600000)%PHRASES.length;
  const phrase=PHRASES[phraseIdx];

  // Active workout banner
  const banner=activeWorkout?`
    <div class="active-banner" onclick="screen='log';render()" style="margin-bottom:12px;">
      <div><span class="active-dot"></span><span style="font-size:13px;color:var(--accent)">IN PROGRESS</span>
        <div style="font-size:11px;color:var(--muted);margin-top:3px;">${splitName(activeWorkout.split)} · ${activeWorkout.exercises.length} exercises</div>
      </div>
      <span style="color:var(--accent)">&#8594;</span>
    </div>`:"";

  // Streak dots — last 7 days
  const now=Date.now();
  const streakDots=[...Array(7)].map((_,i)=>{
    const dayAgo=(6-i)*86400000;
    const dayStart=now-dayAgo-((now-dayAgo)%86400000);
    const dayEnd=dayStart+86400000;
    const hit=state.workouts.some(w=>w.timestamp>=dayStart&&w.timestamp<dayEnd);
    return `<div class="sb-dot${hit?'':' off'}"></div>`;
  }).join('');



  // Best 1RM stat — for the second stat box
  const statColor2=best1RM?'#52c87a':'var(--accent)';

  // One-liner fun stat
  const funLine=funStat.sub?`${funStat.val} ${funStat.label.toLowerCase()} — ${funStat.sub.toLowerCase()}`:`${funStat.val} ${funStat.label.toLowerCase()}`;

  return `
    ${banner}
    <div class="sb-header">
      <div>
        <div class="sb-header-time">${greetWord}.</div>
        <div style="font-size:10px;color:var(--dim);letter-spacing:1px;margin-top:2px;">${phrase}</div>
      </div>
      <div style="text-align:right;">
        <button class="sb-header-date" onclick="toggleHomeCal()" style="cursor:pointer;background:var(--bg2);border:1px solid var(--border2);border-radius:10px;padding:6px 12px;font-family:'DM Sans',sans-serif;">
          <div style="font-size:12px;color:var(--text);">📅 ${today()} ${homeCalOpen?'▲':'▼'}</div>
          ${!homeCalOpen?'<div style="font-size:8px;color:var(--dim);letter-spacing:1px;margin-top:2px;">TAP FOR CALENDAR</div>':''}
        </button>
      </div>
    </div>

    ${buildHomeCal()}

    <div class="sb-hero" style="--split-glow:${splitGlow};" onclick="startWorkout('${rec}')">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
        <div>
          <div style="font-size:8px;letter-spacing:3px;color:var(--accent);text-transform:uppercase;opacity:0.7;margin-bottom:4px;">Recommended today</div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:56px;letter-spacing:2px;line-height:1;color:var(--text);">${splitName(rec).toUpperCase()}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:6px;letter-spacing:0.5px;">Day</div>
        </div>
        <div style="text-align:right;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:40px;color:#ff5038;line-height:1;">${streak||0}</div>
          <div style="font-size:8px;letter-spacing:2px;color:#ff5038;text-transform:uppercase;margin-top:3px;">Streak</div>
          <div style="display:flex;gap:3px;margin-top:8px;justify-content:flex-end;">${streakDots}</div>
        </div>
      </div>
      ${(()=>{
        const entry=ensureTodaySupp();
        const wOz=entry.waterOz||0;
        const wGoal=state.waterGoal||100;
        const wPct=Math.min(100,Math.round((wOz/wGoal)*100));
        const goalHit=wOz>=wGoal;
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;" onclick="event.stopPropagation();">
          <div class="water-bar${goalHit?' goal-hit':''}" onclick="addWater(8);render();" style="flex:1;" title="${wOz}/${wGoal}oz">
            <div class="water-fill" style="width:${wPct}%;">
              <div class="water-wave"></div>
              <div class="water-wave2"></div>
              <div class="water-wave3"></div>
            </div>
          </div>
          <button onclick="event.stopPropagation();addWater(16);render();" style="background:none;border:1px solid rgba(232,213,160,0.2);border-radius:8px;padding:4px 6px;cursor:pointer;font-size:12px;flex-shrink:0;" title="+16oz bottle">🫗</button>
        </div>`;
      })()}
      <div style="font-size:11px;color:var(--dim);margin-bottom:14px;">${lastLine}</div>
      ${(()=>{const est=estimateDuration(rec);return est?`<div style="font-size:10px;color:var(--muted);margin-bottom:12px;letter-spacing:0.5px;">⏱ ~${est} min avg</div>`:''})()}
      <div style="display:flex;gap:8px;">
        <button class="sb-rec-cta" onclick="event.stopPropagation();startWorkout('${rec}')" style="flex:1;">
          START ${splitName(rec).toUpperCase()} DAY &nbsp;&#8594;
        </button>
        <button onclick="event.stopPropagation();quickStart()" style="background:none;border:1px solid rgba(232,213,160,0.25);border-radius:12px;padding:13px 16px;color:var(--accent);font-family:'Bebas Neue',sans-serif;font-size:13px;letter-spacing:2px;cursor:pointer;flex-shrink:0;">QUICK START</button>
      </div>
    </div>

    ${renderThisWeek()}

    ${renderTemplateQuickLaunch()}

    ${renderDailyCheckin()}

    ${renderChallenge()}
`;
}



// ═══════════════════════════════════════════
// FEATURE 1 — SAVED TEMPLATES
// ═══════════════════════════════════════════
function saveAsTemplate(){
  if(!activeWorkout||!activeWorkout.exercises.length) return;
  const name = `${splitName(activeWorkout.split)} (${today()})`;
  const t = {
    id: stackId(),
    name,
    split: activeWorkout.split,
    exercises: activeWorkout.exercises.map(e=>({name:e.name,sets:e.sets.length||3})),
    savedAt: Date.now()
  };
  if(!state.templates) state.templates=[];
  state.templates.unshift(t);
  if(state.templates.length>20) state.templates=state.templates.slice(0,20);
  saveImmediate();
  showToast('📋 Template saved');
}
function loadTemplate(id){
  const t=(state.templates||[]).find(t=>t.id===id);
  if(!t) return;
  if(!activeWorkout) startWorkoutSilent(t.split);
  t.exercises.forEach(e=>addExercise(e.name));
  screen='log'; render();
  showToast('📋 Loaded: '+t.name);
}
function startWorkoutSilent(split){
  activeWorkout={split,exercises:[],startTime:Date.now(),notes:''};
  setHistory=[];
  startWoTimer(); requestWakeLock();
  clearInterval(autoSaveInterval);
  autoSaveInterval=setInterval(()=>{
    if(activeWorkout) try{localStorage.setItem('gainz_recovery',JSON.stringify(activeWorkout));}catch(e){}
    else clearInterval(autoSaveInterval);
  },20000);
}
function deleteTemplate(id){
  state.templates=(state.templates||[]).filter(t=>t.id!==id);
  saveImmediate(); render();
}
function renameTemplate(id){
  const t=(state.templates||[]).find(t=>t.id===id);
  if(!t) return;
  showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:12px;">RENAME TEMPLATE</div>
    <input id="tmpl-name-inp" class="input" value="${t.name.replace(/"/g,'&quot;')}" style="margin-bottom:12px;"/>
    <button class="btn primary" onclick="const v=document.getElementById('tmpl-name-inp').value.trim();if(v){const t=(state.templates||[]).find(t=>t.id==='${id}');if(t){t.name=v;saveImmediate();render();}hideModal();}">SAVE</button>
    <button class="btn ghost" onclick="hideModal()" style="margin-top:8px;">CANCEL</button>
  `);
}

// Supplements, Daily Check-in, Cardio — moved to js/daily-tracking.js

// ═══════════════════════════════════════════
// WEEKLY REPORT CARD — Generated Sunday
// ═══════════════════════════════════════════
function getWeeklyReport(){
  const now=new Date();
  // Get the last completed week (Sun-Sat)
  const thisWeekStart=new Date(now); thisWeekStart.setDate(now.getDate()-now.getDay()); thisWeekStart.setHours(0,0,0,0);
  const lastWeekStart=new Date(thisWeekStart); lastWeekStart.setDate(lastWeekStart.getDate()-7);
  const lastWeekEnd=new Date(thisWeekStart);

  const weekWo=state.workouts.filter(w=>{const d=new Date(w.timestamp);return d>=lastWeekStart&&d<lastWeekEnd;});
  const prevWeekStart=new Date(lastWeekStart); prevWeekStart.setDate(prevWeekStart.getDate()-7);
  const prevWo=state.workouts.filter(w=>{const d=new Date(w.timestamp);return d>=prevWeekStart&&d<lastWeekStart;});

  if(!weekWo.length) return null;

  const totalVol=weekWo.reduce((a,w)=>a+(w.totalVolume||0),0);
  const prevVol=prevWo.reduce((a,w)=>a+(w.totalVolume||0),0);
  const volChange=prevVol>0?Math.round(((totalVol-prevVol)/prevVol)*100):null;
  const totalDur=weekWo.reduce((a,w)=>a+(w.duration||0),0);
  const prCount=weekWo.reduce((a,w)=>a+w.exercises.reduce((b,e)=>b+e.sets.filter(s=>s.pr).length,0),0);
  const splits=weekWo.map(w=>splitName(w.split));
  const weekCardio=(state.cardio||[]).filter(c=>{const d=new Date(c.timestamp);return d>=lastWeekStart&&d<lastWeekEnd;});
  const cardioMins=weekCardio.reduce((a,c)=>a+c.minutes,0);
  const creatineDays=(state.supplements||[]).filter(s=>{
    // Match by parsing the date string against the week range
    const parts=s.date; // "Sun, Mar 22" format
    if(!s.creatine||s.creatine<=0) return false;
    return s.timestamp&&new Date(s.timestamp)>=lastWeekStart&&new Date(s.timestamp)<lastWeekEnd;
  }).length;

  return {
    workouts:weekWo.length,
    totalVol,volChange,
    totalDur:Math.round(totalDur/60000),
    prCount,splits,
    cardioMins,creatineDays,
    weekLabel:lastWeekStart.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' – '+new Date(lastWeekEnd.getTime()-86400000).toLocaleDateString('en-US',{month:'short',day:'numeric'})
  };
}
function renderWeeklyReport(){
  // Only show on Sunday, or if they haven't dismissed it yet this week
  const now=new Date();
  const dismissKey='gainz_report_dismissed_'+now.getFullYear()+'_'+Math.ceil((now.getTime()-new Date(now.getFullYear(),0,1).getTime())/604800000);
  if(localStorage.getItem(dismissKey)) return '';

  const r=getWeeklyReport();
  if(!r) return '';

  const grade=r.workouts>=5?'A':r.workouts>=4?'A-':r.workouts>=3?'B+':r.workouts>=2?'B':r.workouts>=1?'C':'D';

  return `<div style="background:linear-gradient(135deg,rgba(232,213,160,0.06),rgba(232,213,160,0.02));border:1px solid rgba(232,213,160,0.15);border-radius:14px;padding:16px;margin-bottom:12px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <div style="font-size:9px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;">Weekly Report · ${r.weekLabel}</div>
      <button onclick="localStorage.setItem('${dismissKey}','1');render();" style="background:none;border:none;color:var(--dim);font-size:12px;cursor:pointer;">✕</button>
    </div>
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:48px;color:var(--accent);line-height:1;">${grade}</div>
      <div>
        <div style="font-size:13px;color:var(--text);">${r.workouts} workout${r.workouts!==1?'s':''} · ${r.totalDur} min</div>
        <div style="font-size:11px;color:var(--muted);">${r.totalVol.toLocaleString()} lb moved${r.volChange!==null?' · '+(r.volChange>=0?'+':'')+r.volChange+'% vs prior wk':''}</div>
      </div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;font-size:11px;">
      ${r.prCount?`<span style="color:var(--accent);">🏆 ${r.prCount} PR${r.prCount!==1?'s':''}</span>`:''}
      ${r.cardioMins?`<span style="color:var(--green);">🏃 ${r.cardioMins} min cardio</span>`:''}
      <span style="color:var(--muted);">💊 Creatine ${r.creatineDays}/7 days</span>
      <span style="color:var(--dim);">Splits: ${[...new Set(r.splits)].join(', ')}</span>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════
// FEATURE 4 — DURATION ESTIMATE
// ═══════════════════════════════════════════
function estimateDuration(split){
  const past=state.workouts.filter(w=>w.split===split&&w.duration>0);
  if(!past.length) return null;
  const avg=past.reduce((a,w)=>a+w.duration,0)/past.length;
  return Math.round(avg/60000); // minutes
}

// ═══════════════════════════════════════════
// FEATURE 5 — EXERCISE SWAP
// ═══════════════════════════════════════════
let swappingEx = null;
function openSwapPicker(name){
  swappingEx = name;
  // Reuse the exercise picker in swap mode
  openPicker();
  const header = document.getElementById('ex-picker-header');
  if(header){
    const title = header.querySelector('div');
    if(title) title.textContent = 'SWAP: '+name.toUpperCase();
  }
}
function swapExercise(oldName, newName){
  if(!activeWorkout||oldName===newName) return;
  if(activeWorkout.exercises.find(e=>e.name===newName)){
    showToast(newName+' already in workout'); return;
  }
  const isBW=BW_EXERCISES.has(newName);
  activeWorkout.exercises=activeWorkout.exercises.map(e=>
    e.name===oldName ? {...e,name:newName,bwMode:isBW} : e
  );
  // migrate rest/collapse/done state
  if(state.exerciseRests[oldName]!==undefined){
    state.exerciseRests[newName]=state.exerciseRests[oldName];
  }
  if(collapsedEx.has(oldName)){collapsedEx.delete(oldName);collapsedEx.add(newName);}
  if(doneExSet.has(oldName)){doneExSet.delete(oldName);doneExSet.add(newName);}
  swappingEx=null;
  save(); render();
  showToast('↔ Swapped to '+newName);
}

// ═══════════════════════════════════════════
// FEATURE 3 — MILESTONES
// ═══════════════════════════════════════════
const MILESTONE_DEFS = [
  { id:'first_workout',  icon:'🏋️', name:'First Rep',       desc:'Complete your first workout',          check: s=>s.workouts.length>=1 },
  { id:'workouts_10',    icon:'💪', name:'In the Habit',    desc:'Complete 10 workouts',                 check: s=>s.workouts.length>=10 },
  { id:'workouts_50',    icon:'🔥', name:'Fifty Deep',      desc:'Complete 50 workouts',                 check: s=>s.workouts.length>=50 },
  { id:'workouts_100',   icon:'💯', name:'Century Club',    desc:'Complete 100 workouts',                check: s=>s.workouts.length>=100 },
  { id:'streak_7',       icon:'📅', name:'Week Warrior',    desc:'7-day workout streak',                 check: s=>s.streak>=7 },
  { id:'streak_30',      icon:'🗓️', name:'Iron Month',     desc:'30-day workout streak',                check: s=>s.streak>=30 },
  { id:'first_pr',       icon:'🏆', name:'New Record',      desc:'Log your first PR',                    check: s=>s.workouts.some(w=>w.exercises.some(e=>e.sets.some(s=>s.pr))) },
  { id:'pr_10',          icon:'🥇', name:'PR Machine',      desc:'Log 10 PRs across any exercise',       check: s=>{let n=0;s.workouts.forEach(w=>w.exercises.forEach(e=>e.sets.forEach(s=>{if(s.pr)n++;})));return n>=10;} },
  { id:'tonnage_100k',   icon:'⚖️', name:'100K Club',      desc:'Lift 100,000 lb total across all workouts', check: s=>s.workouts.reduce((a,w)=>a+(w.totalVolume||0),0)>=100000 },
  { id:'tonnage_1m',     icon:'🚀', name:'One Million',     desc:'Lift 1,000,000 lb total',              check: s=>s.workouts.reduce((a,w)=>a+(w.totalVolume||0),0)>=1000000 },
  { id:'exercises_20',   icon:'📚', name:'Exercise Curious',desc:'Log 20 different exercises ever',      check: s=>{const ex=new Set(s.workouts.flatMap(w=>w.exercises.map(e=>e.name)));return ex.size>=20;} },
  { id:'splits_all',     icon:'🗺️', name:'Split Sampler',  desc:'Complete every split type at least once', check: s=>{const done=new Set(s.workouts.map(w=>w.split));return getActiveSplits().every(sp=>done.has(sp));} },
];
function getMilestonesStatus(){
  return MILESTONE_DEFS.map(m=>({...m, unlocked: m.check(state)}));
}
function renderMilestones(){
  const ms=getMilestonesStatus();
  const unlocked=ms.filter(m=>m.unlocked);
  const locked=ms.filter(m=>!m.unlocked);
  const pct=Math.round(unlocked.length/ms.length*100);
  return `
    <div style="margin-bottom:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <div style="font-size:11px;color:var(--muted);letter-spacing:1px;">${unlocked.length} / ${ms.length} unlocked</div>
        <div style="font-size:11px;color:var(--accent);">${pct}%</div>
      </div>
      <div style="height:4px;background:var(--bg3);border-radius:2px;">
        <div style="height:100%;width:${pct}%;background:var(--accent);border-radius:2px;transition:width .4s ease;"></div>
      </div>
    </div>
    ${unlocked.length?`
      <div style="font-size:8px;letter-spacing:3px;color:var(--accent);text-transform:uppercase;margin-bottom:10px;">Unlocked</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px;">
        ${unlocked.map(m=>`
          <div style="background:rgba(232,213,160,0.06);border:1px solid rgba(232,213,160,0.15);border-radius:12px;padding:12px;">
            <div style="font-size:22px;margin-bottom:6px;">${m.icon}</div>
            <div style="font-size:12px;font-weight:600;color:var(--accent);">${m.name}</div>
            <div style="font-size:10px;color:var(--dim);margin-top:2px;line-height:1.4;">${m.desc}</div>
          </div>`).join('')}
      </div>
    `:''}
    <div style="font-size:8px;letter-spacing:3px;color:var(--muted);text-transform:uppercase;margin-bottom:10px;">Locked</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      ${locked.map(m=>`
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:12px;opacity:0.5;">
          <div style="font-size:22px;margin-bottom:6px;filter:grayscale(1);">${m.icon}</div>
          <div style="font-size:12px;font-weight:600;color:var(--muted);">${m.name}</div>
          <div style="font-size:10px;color:var(--dim);margin-top:2px;line-height:1.4;">${m.desc}</div>
        </div>`).join('')}
    </div>
  `;
}

// ═══════════════════════════════════════════
// FEATURE 2 — WEEKLY VOLUME TARGETS (renders in ME tab)
// ═══════════════════════════════════════════
function getWeeklyVolumeByMuscle(){
  // Returns { muscleKey: totalLbs } for this week
  const weekStart=new Date(); weekStart.setDate(weekStart.getDate()-weekStart.getDay()); weekStart.setHours(0,0,0,0);
  const weekWorkouts=state.workouts.filter(w=>new Date(w.timestamp)>=weekStart);
  // Map exercises to muscle groups via split membership
  const EXERCISE_MUSCLE={};
  Object.entries(ALL_SPLITS).forEach(([split,exes])=>{
    const muscle = split==='Push'?'Chest/Tris/Delts':split==='Pull'?'Back/Biceps':split==='Legs'?'Legs/Glutes':
      split==='Core'?'Core':split==='Chest'?'Chest/Tris/Delts':split==='Back'?'Back/Biceps':
      split==='Arms'?'Arms':split==='Shoulders'?'Shoulders':split==='Upper'?'Chest/Tris/Delts':
      split==='Lower'?'Legs/Glutes':'Full Body';
    exes.forEach(ex=>{ if(!EXERCISE_MUSCLE[ex]) EXERCISE_MUSCLE[ex]=muscle; });
  });
  const totals={};
  weekWorkouts.forEach(w=>w.exercises.forEach(e=>{
    const muscle=EXERCISE_MUSCLE[e.name]||'Other';
    totals[muscle]=(totals[muscle]||0)+vol(e.sets);
  }));
  return totals;
}

// ─── Split / Program Builder ────────────────────────────────────────────
function openProgramBuilder(){
  screen = "programBuilder";
  render();
}
function closeProgramBuilder(){
  screen = "settings";
  render();
}
function customAddDay(key){
  if(!state.customSplits) state.customSplits=[];
  state.customSplits.push(key);
  state.program="custom";
  saveImmediate();
  render();
}
function customRemoveDay(idx){
  if(!state.customSplits) return;
  state.customSplits.splice(idx,1);
  state.program="custom";
  saveImmediate();
  render();
}
function customMoveDay(idx, dir){
  const arr=state.customSplits||[];
  const j=idx+dir;
  if(j<0||j>=arr.length) return;
  [arr[idx],arr[j]]=[arr[j],arr[idx]];
  state.customSplits=arr;
  state.program="custom";
  saveImmediate();
  render();
}
function applyPreset(key){
  state.program=key;
  state.customSplits=[...(PROGRAMS[key]?.splits||[])];
  saveImmediate();
  screen="settings";
  render();
  showToast("✓ "+PROGRAMS[key].label);
}
function renderProgramBuilder(){
  const active = state.program||"ppl";
  const seq = active==="custom" ? (state.customSplits||[]) : (PROGRAMS[active]?.splits||[]);
  const COLORS={Push:"#c05050",Pull:"#8b72e0",Legs:"#52c87a",Core:"#5098c8",Chest:"#c05050",Back:"#8b72e0",Arms:"#c87852",Shoulders:"#c8b870",Upper:"#c05050",Lower:"#52c87a",Full:"#b0b0b0"};

  const presetCards = Object.entries(PROGRAMS).filter(([k])=>k!=="custom").map(([key,p])=>{
    const isActive = active===key && active!=="custom";
    return `<div onclick="applyPreset('${key}')" style="padding:14px;border-radius:14px;cursor:pointer;
      border:1.5px solid ${isActive?'var(--accent)':'var(--border2)'};
      background:${isActive?'var(--accentFaint)':'var(--bg2)'};
      margin-bottom:8px;transition:all .15s;">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:22px;">${p.emoji}</span>
        <div style="flex:1;">
          <div style="font-size:14px;font-weight:600;color:${isActive?'var(--accent)':'var(--text)'};">${p.label}</div>
          <div style="font-size:10px;color:var(--dim);margin-top:1px;">${p.days} · ${p.desc}</div>
        </div>
        ${isActive?'<span style="color:var(--accent);font-size:12px;">✓</span>':''}
      </div>
      <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px;">
        ${p.splits.map(s=>`<span style="font-size:10px;padding:3px 8px;border-radius:20px;
          background:${COLORS[s]||'#888'}22;color:${COLORS[s]||'#888'};border:1px solid ${COLORS[s]||'#888'}44;">${s}</span>`).join('')}
      </div>
    </div>`;
  }).join('');

  const isCustom = active==="custom";
  const allDayTypes = Object.keys(SPLIT_META);
  const dayChips = allDayTypes.map(key=>{
    const m=SPLIT_META[key];
    const col=COLORS[key]||'#888';
    return `<div onclick="customAddDay('${key}')" style="padding:10px 12px;border-radius:12px;cursor:pointer;
      background:${col}18;border:1px solid ${col}44;text-align:left;transition:all .12s;">
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="font-size:14px;">${m.icon}</span>
        <span style="font-size:13px;font-weight:600;color:${col};">${key}</span>
      </div>
      <div style="font-size:10px;color:var(--dim);margin-top:2px;">${m.desc}</div>
    </div>`;
  }).join('');

  const seqRows = seq.map((s,i)=>{
    const col=COLORS[s]||'#888';
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);">
      <div style="width:28px;height:28px;border-radius:8px;background:${col}22;border:1px solid ${col}44;
        display:flex;align-items:center;justify-content:center;font-size:10px;color:${col};font-weight:700;flex-shrink:0;">
        ${i+1}
      </div>
      <div style="flex:1;">
        <div style="font-size:13px;color:var(--text);">${s}</div>
        <div style="font-size:10px;color:var(--dim);">${SPLIT_META[s]?.desc||''}</div>
      </div>
      <div style="display:flex;gap:4px;">
        <button onclick="customMoveDay(${i},-1)" ${i===0?'disabled':''} style="background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:5px 8px;color:${i===0?'var(--dim)':'var(--muted)'};cursor:pointer;font-size:12px;">↑</button>
        <button onclick="customMoveDay(${i},1)" ${i===seq.length-1?'disabled':''} style="background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:5px 8px;color:${i===seq.length-1?'var(--dim)':'var(--muted)'};cursor:pointer;font-size:12px;">↓</button>
        <button onclick="customRemoveDay(${i})" style="background:none;border:1px solid transparent;border-radius:6px;padding:5px 8px;color:var(--dim);cursor:pointer;font-size:13px;">✕</button>
      </div>
    </div>`;
  }).join('');

  return `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
      <button onclick="closeProgramBuilder()" style="background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer;padding:0;">‹</button>
      <div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:1px;">Your Program</div>
        <div style="font-size:10px;color:var(--muted);letter-spacing:1px;">Choose a preset or build your own</div>
      </div>
    </div>

    <div style="font-size:8px;letter-spacing:3px;color:var(--muted);margin-bottom:10px;text-transform:uppercase;">Presets</div>
    ${presetCards}

    <div style="font-size:8px;letter-spacing:3px;color:var(--muted);margin:20px 0 10px;text-transform:uppercase;">Build Your Own</div>
    <div style="font-size:11px;color:var(--dim);margin-bottom:12px;">Tap a day type to add it to your sequence.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px;">${dayChips}</div>

    ${seq.length ? `
      <div style="font-size:8px;letter-spacing:3px;color:var(--muted);margin-bottom:10px;text-transform:uppercase;">
        Your Sequence ${isCustom?'<span style="color:var(--accent);margin-left:6px;">✏️ Custom</span>':''}
      </div>
      <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:0 14px;">
        ${seqRows}
      </div>
      ${isCustom?`<button onclick="saveImmediate();closeProgramBuilder();" style="width:100%;margin-top:14px;padding:14px;border:none;border-radius:12px;background:var(--accent);color:#1a1510;font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:2px;cursor:pointer;">SAVE CUSTOM PROGRAM ✓</button>`:''}
    ` : `<div style="padding:20px;text-align:center;color:var(--dim);font-size:12px;">Tap day types above to build your sequence</div>`}
  `;
}

function buildBWChart(){
  const bw=(state.bodyweight||[]).slice().reverse(); // oldest first
  if(bw.length<2) return '';
  const W=320, H=120, padL=40, padR=12, padT=10, padB=24;
  const IW=W-padL-padR, IH=H-padT-padB;
  const vals=bw.map(e=>e.weight);
  const minV=Math.min(...vals)-2, maxV=Math.max(...vals)+2;
  const range=maxV-minV||1;
  function px(i){ return padL+(i/(bw.length-1))*IW; }
  function py(v){ return padT+IH-((v-minV)/range)*IH; }
  const lineCoords=bw.map((e,i)=>`${px(i).toFixed(1)},${py(e.weight).toFixed(1)}`).join(' ');
  const firstX=px(0).toFixed(1), lastX=px(bw.length-1).toFixed(1), baseY=(padT+IH).toFixed(1);
  const areaPath=`M${firstX},${baseY} `+bw.map((e,i)=>`L${px(i).toFixed(1)},${py(e.weight).toFixed(1)}`).join(' ')+` L${lastX},${baseY} Z`;
  // Y labels
  const steps=3;
  const stepSize=range/steps;
  const yLabels=[...Array(steps+1)].map((_,i)=>{
    const v=Math.round(minV+stepSize*i);
    const yy=py(v).toFixed(1);
    return `<line x1="${padL}" y1="${yy}" x2="${W-padR}" y2="${yy}" stroke="#1e1e24" stroke-width="1"/>
      <text x="${padL-4}" y="${(parseFloat(yy)+3).toFixed(1)}" text-anchor="end" font-size="8" fill="#3a3630">${v}</text>`;
  }).join('');
  // X labels (first and last date)
  const xLabels=[0,bw.length-1].map(i=>{
    const d=bw[i].date; const parts=(d||'').split(' ');
    const lbl=parts.length>=3?parts[1]+' '+parts[2]:d;
    return `<text x="${px(i).toFixed(1)}" y="${H-4}" text-anchor="${i===0?'start':'end'}" font-size="8" fill="#3a3630">${lbl}</text>`;
  }).join('');
  // Dots
  const dots=bw.map((e,i)=>{
    const isLast=i===bw.length-1;
    return `<circle cx="${px(i).toFixed(1)}" cy="${py(e.weight).toFixed(1)}" r="${isLast?4:2}" fill="${isLast?'var(--accent)':'rgba(232,213,160,0.4)'}"/>`;
  }).join('');
  // Delta
  const delta=vals[vals.length-1]-vals[0];
  const deltaStr=delta>0?`+${delta.toFixed(1)}`:delta.toFixed(1);
  const deltaColor=Math.abs(delta)<0.5?'var(--muted)':delta>0?'var(--accent)':'var(--green)';
  return `<div style="margin-top:12px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <span style="font-size:9px;letter-spacing:2px;color:var(--dim);text-transform:uppercase;">Trend</span>
      <span style="font-size:11px;color:${deltaColor};font-weight:600;">${deltaStr} lb</span>
    </div>
    <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:12px;padding:8px 6px 2px;">
      <svg width="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="display:block;">
        <defs><linearGradient id="bwGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(232,213,160,0.12)"/><stop offset="100%" stop-color="rgba(232,213,160,0)"/>
        </linearGradient></defs>
        ${yLabels}${xLabels}
        <path d="${areaPath}" fill="url(#bwGrad)"/>
        <polyline points="${lineCoords}" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linejoin="round"/>
        ${dots}
      </svg>
    </div>
  </div>`;
}

function renderSettings(){
  const defaultRest = state.defaultRest || 45;
  const prog = state.program || "ppl";

  const sectionHead = (label) =>
    `<div style="font-size:8px;letter-spacing:3px;color:var(--muted);margin:22px 0 8px;text-transform:uppercase;border-bottom:1px solid #1e1e24;padding-bottom:8px;">${label}</div>`;

  // ── Program selector — opens builder sheet ──
  const activeProg = PROGRAMS[prog];
  const activeSplits = getActiveSplits();
  const PCOLORS={Push:"#c05050",Pull:"#8b72e0",Legs:"#52c87a",Core:"#5098c8",Chest:"#c05050",Back:"#8b72e0",Arms:"#c87852",Shoulders:"#c8b870",Upper:"#c05050",Lower:"#52c87a",Full:"#b0b0b0"};
  const programCards = `<div onclick="openProgramBuilder()" style="padding:16px 18px;border-radius:14px;border:1.5px solid var(--border2);background:var(--bg2);cursor:pointer;display:flex;align-items:center;gap:14px;">
    <span style="font-size:28px;">${activeProg?.emoji||'✏️'}</span>
    <div style="flex:1;">
      <div style="font-size:14px;font-weight:600;color:var(--accent);">${activeProg?.label||'Custom'}</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">
        ${activeSplits.map(s=>`<span style="font-size:10px;padding:2px 8px;border-radius:20px;background:${PCOLORS[s]||'#888'}22;color:${PCOLORS[s]||'#888'};border:1px solid ${PCOLORS[s]||'#888'}44;">${s}</span>`).join('')}
      </div>
    </div>
    <span style="color:var(--muted);font-size:14px;">›</span>
  </div>`;

  // ── Active splits rename rows ──
  const splitRows = getActiveSplits().map(key =>
    `<div onclick="openRenameSplit('${key}')" style="display:flex;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid var(--border);cursor:pointer;">
      <span style="font-size:16px;width:22px;text-align:center;flex-shrink:0;">✎</span>
      <span style="flex:1;">
        <span style="font-size:13px;color:var(--text);">${splitName(key)}</span>
        ${splitName(key)!==key?`<span style="font-size:10px;color:var(--dim);margin-left:6px;">(${key})</span>`:''}
      </span>
      <span style="font-size:12px;color:var(--dim);">›</span>
    </div>`
  ).join('');

  // ── Stacks ──
  const stackRows = (state.stacks||[]).length === 0
    ? `<div style="padding:14px 0;font-size:13px;color:var(--dim);">No stacks yet</div>`
    : (state.stacks||[]).map(st =>
        `<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);">
          <span style="font-size:16px;width:22px;text-align:center;flex-shrink:0;">⚡</span>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;color:var(--text);">${st.name}</div>
            <div style="font-size:10px;color:var(--dim);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${st.exercises.join(' · ')}</div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;">
            <button onclick="event.stopPropagation();openEditStackModal('${st.id}')" style="background:var(--bg3);border:1px solid var(--border2);border-radius:8px;color:var(--muted);font-family:inherit;font-size:10px;padding:5px 10px;cursor:pointer;letter-spacing:0.5px;">EDIT</button>
            <button onclick="event.stopPropagation();deleteStack('${st.id}')" style="background:none;border:1px solid transparent;border-radius:8px;color:var(--dim);font-family:inherit;font-size:14px;padding:4px 8px;cursor:pointer;line-height:1;">✕</button>
          </div>
        </div>`
      ).join('');

  return `
    <div style="font-family:'Bebas Neue',sans-serif;font-size:36px;letter-spacing:1px;margin-bottom:2px;">More</div>
    <div style="font-size:10px;color:var(--muted);letter-spacing:2px;margin-bottom:4px;text-transform:uppercase;">Settings & Preferences</div>

    ${sectionHead('Notifications')}
    <div class="card" style="padding:14px 18px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:13px;color:var(--text);">Daily Reminders</div>
          <div style="font-size:10px;color:var(--dim);margin-top:2px;">Workout, creatine, weigh-in reminders</div>
        </div>
        <button onclick="enableNotifications()" class="btn ghost small" id="notif-btn">ENABLE</button>
      </div>
    </div>

    ${sectionHead('Theme')}
    <div style="display:flex;gap:8px;">
      <button onclick="applyTheme('dark');render();" style="flex:1;background:${activeTheme==='dark'?'rgba(232,213,160,0.1)':'#0f0f12'};border:1px solid ${activeTheme==='dark'?'var(--accent)':'#1e1e24'};border-radius:10px;padding:12px;text-align:center;cursor:pointer;">
        <div style="font-size:18px;margin-bottom:4px;">🌙</div>
        <div style="font-size:10px;color:${activeTheme==='dark'?'var(--accent)':'var(--muted)'};">Dark</div>
      </button>
      <button onclick="applyTheme('light');render();" style="flex:1;background:${activeTheme==='light'?'rgba(138,115,64,0.1)':'#0f0f12'};border:1px solid ${activeTheme==='light'?'var(--accent)':'#1e1e24'};border-radius:10px;padding:12px;text-align:center;cursor:pointer;">
        <div style="font-size:18px;margin-bottom:4px;">☀️</div>
        <div style="font-size:10px;color:${activeTheme==='light'?'var(--accent)':'var(--muted)'};">Light</div>
      </button>
      <button onclick="applyTheme('pink');render();" style="flex:1;background:${activeTheme==='pink'?'rgba(232,160,184,0.1)':'#0f0f12'};border:1px solid ${activeTheme==='pink'?'#e8a0b8':'#1e1e24'};border-radius:10px;padding:12px;text-align:center;cursor:pointer;">
        <div style="font-size:18px;margin-bottom:4px;">🌸</div>
        <div style="font-size:10px;color:${activeTheme==='pink'?'#e8a0b8':'var(--muted)'};">Pink</div>
      </button>
    </div>

    ${sectionHead('Program')}
    ${programCards}

    ${sectionHead('Workout')}
    <div class="card" style="padding:0 18px;">
      <div style="display:flex;align-items:center;gap:14px;padding:14px 0;">
        <span style="font-size:16px;width:22px;text-align:center;flex-shrink:0;">⏱</span>
        <div style="flex:1;">
          <div style="font-size:13px;color:var(--text);">Default Rest</div>
          <div style="font-size:10px;color:var(--dim);margin-top:2px;">Applied to new exercises</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <button class="t-adj" onclick="state.defaultRest=Math.max(15,(state.defaultRest||45)-15);save();render();">−15</button>
          <span style="color:var(--accent);font-size:15px;font-weight:600;min-width:34px;text-align:center;">${defaultRest}s</span>
          <button class="t-adj" onclick="state.defaultRest=(state.defaultRest||45)+15;save();render();">+15</button>
        </div>
      </div>
    </div>

    ${sectionHead('Splits')}
    <div class="card" style="padding:0 18px;">
      ${splitRows}
      <div style="font-size:10px;color:var(--dim);padding:10px 0 4px;">Display names only — history stays intact</div>
    </div>

    ${sectionHead('Stacks')}
    <div class="card" style="padding:0 18px;">
      ${stackRows}
      <button class="btn ghost" onclick="openNewStackModal()" style="width:100%;margin:10px 0 4px;font-size:11px;">+ NEW STACK</button>
    </div>

    ${sectionHead('Templates')}
    <div class="card" style="padding:0 18px;">
      ${(()=>{
        const tmpls=state.templates||[];
        if(!tmpls.length) return '<div style="padding:14px 0;font-size:13px;color:var(--dim);">No templates yet. Templates are auto-saved when you finish a workout.</div>';
        return tmpls.map(t=>`
          <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);">
            <span style="font-size:18px;width:24px;text-align:center;flex-shrink:0;">📋</span>
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;color:var(--text);">${t.name}</div>
              <div style="font-size:10px;color:var(--dim);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.exercises.map(e=>e.name).join(' · ')}</div>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0;">
              <button onclick="event.stopPropagation();loadTemplate('${t.id}')" style="background:var(--accentFaint);border:1px solid var(--accent);border-radius:8px;color:var(--accent);font-family:inherit;font-size:10px;padding:5px 10px;cursor:pointer;letter-spacing:0.5px;">LOAD</button>
              <button onclick="event.stopPropagation();renameTemplate('${t.id}')" style="background:var(--bg3);border:1px solid var(--border2);border-radius:8px;color:var(--muted);font-family:inherit;font-size:10px;padding:5px 10px;cursor:pointer;">✎</button>
              <button onclick="event.stopPropagation();deleteTemplate('${t.id}')" style="background:none;border:1px solid transparent;border-radius:8px;color:var(--dim);font-family:inherit;font-size:14px;padding:4px 8px;cursor:pointer;line-height:1;">✕</button>
            </div>
          </div>`).join('');
      })()}
    </div>

    ${sectionHead('Body Weight')}
    <div class="card" style="padding:14px 18px;">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:${(state.bodyweight||[]).length?'12px':'0'};">
        <input class="input" id="bw-input" type="number" placeholder="lbs" inputmode="decimal"
          style="font-size:16px;flex:1;padding:10px 14px;"/>
        <button onclick="logBW(document.getElementById('bw-input').value)"
          style="background:var(--accent);color:#080808;border:none;border-radius:12px;padding:11px 18px;font-family:'Bebas Neue',sans-serif;font-size:15px;letter-spacing:2px;cursor:pointer;flex-shrink:0;">LOG</button>
      </div>
      ${(state.bodyweight||[]).slice(0,5).map((e,i)=>`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;${i<Math.min((state.bodyweight||[]).length,5)-1?'border-bottom:1px solid #1e1e24;':''}">
          <span style="font-size:11px;color:var(--muted);">${e.date}</span>
          <span style="font-family:'Bebas Neue',sans-serif;font-size:18px;color:var(--accent);">${e.weight} lb</span>
        </div>`).join('')}
      ${buildBWChart()}
    </div>

    ${sectionHead('Import')}
    <div style="margin-bottom:24px;">
      <button onclick="openImportModal()" style="width:100%;padding:13px;background:var(--bg3);border:1px solid var(--border2);border-radius:12px;color:var(--muted);font-family:inherit;font-size:11px;letter-spacing:1.5px;cursor:pointer;text-align:left;display:flex;align-items:center;gap:10px;">
        <span style="font-size:16px;">📋</span>
        <div>
          <div style="color:var(--text);font-size:12px;letter-spacing:1px;margin-bottom:2px;">PASTE WORKOUT LOG</div>
          <div style="color:var(--dim);font-size:10px;font-weight:400;letter-spacing:0px;">Any format — AI parses your notes into history</div>
        </div>
      </button>
    </div>

    ${sectionHead('Records')}
    <button onclick="screen='prHistory';render();" style="width:100%;padding:14px 18px;background:var(--bg2);border:1px solid var(--border2);border-radius:12px;color:var(--muted);font-family:inherit;font-size:12px;letter-spacing:1px;cursor:pointer;display:flex;align-items:center;gap:10px;text-align:left;">
      <span style="font-size:18px;">🏆</span>
      <div>
        <div style="color:var(--text);font-size:12px;letter-spacing:1px;margin-bottom:2px;">PR HISTORY</div>
        <div style="color:var(--dim);font-size:10px;font-weight:400;letter-spacing:0;">All your personal records over time</div>
      </div>
    </button>

    ${typeof renderCloudSyncCard==='function'?renderCloudSyncCard(sectionHead):''}

    ${sectionHead('Data')}
    <div style="display:flex;gap:8px;margin-bottom:8px;">
      <button onclick="exportData()" style="flex:1;padding:13px;background:var(--bg3);border:1px solid var(--border2);border-radius:12px;color:var(--muted);font-family:inherit;font-size:11px;letter-spacing:1px;cursor:pointer;">↑ EXPORT</button>
      <button onclick="if(confirm('Clear all data? Cannot be undone.')){localStorage.removeItem('gainz_v5');location.reload();}" style="flex:1;padding:13px;background:rgba(192,64,74,0.06);border:1px solid rgba(192,64,74,0.2);border-radius:12px;color:var(--danger);font-family:inherit;font-size:11px;letter-spacing:1px;cursor:pointer;">✕ CLEAR DATA</button>
    </div>

    <div style="text-align:center;margin-top:36px;color:var(--dim);font-size:10px;letter-spacing:1.5px;padding-bottom:8px;">GAINZ v6 · Made for gains</div>
  `;
}


function renderPRHistory(){
  // Collect all PRs across all workouts
  const prs=[];
  state.workouts.forEach(w=>{
    w.exercises.forEach(e=>{
      e.sets.forEach(s=>{
        if(s.pr&&!s.bw&&!s.warmup){
          prs.push({name:e.name,weight:parseFloat(s.weight),reps:parseInt(s.reps),date:w.date,timestamp:w.timestamp,split:w.split});
        }
      });
    });
  });

  if(!prs.length) return `
    <div style="font-family:'Bebas Neue',sans-serif;font-size:36px;letter-spacing:1px;margin-bottom:4px;">PR History</div>
    <div style="color:var(--dim);font-size:13px;padding:40px 0;text-align:center;">No PRs yet. Go set some records.</div>`;

  // Group by exercise, keep best per exercise + full timeline
  const byExercise={};
  prs.forEach(p=>{
    if(!byExercise[p.name]) byExercise[p.name]=[];
    byExercise[p.name].push(p);
  });

  // Sort exercises by most recent PR
  const exerciseNames=Object.keys(byExercise).sort((a,b)=>{
    const latestA=Math.max(...byExercise[a].map(p=>p.timestamp));
    const latestB=Math.max(...byExercise[b].map(p=>p.timestamp));
    return latestB-latestA;
  });

  // Summary stats
  const totalPRs=prs.length;
  const uniqueExercises=exerciseNames.length;
  const latestPR=prs.reduce((a,b)=>a.timestamp>b.timestamp?a:b);

  const cards=exerciseNames.map(name=>{
    const exPrs=byExercise[name].sort((a,b)=>b.timestamp-a.timestamp);
    const best=exPrs.reduce((a,b)=>a.weight>b.weight?a:b);
    const bestE1RM=exPrs.reduce((a,b)=>est1RM(a.weight,a.reps)>est1RM(b.weight,b.reps)?a:b);
    const e1rm=Math.round(est1RM(bestE1RM.weight,bestE1RM.reps));

    const timeline=exPrs.slice(0,6).map((p,i)=>{
      const isBest=p.weight===best.weight;
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;${i<Math.min(exPrs.length,6)-1?'border-bottom:1px solid var(--border);':''}">
        <span style="font-size:11px;color:var(--dim);">${p.date}</span>
        <span style="font-size:12px;color:${isBest?'var(--accent)':'var(--muted)'};font-weight:${isBest?'700':'400'};">${p.weight}lb x ${p.reps}</span>
      </div>`;
    }).join('');

    return `<div class="card" style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--text);">${name}</div>
          <div style="font-size:10px;color:var(--dim);margin-top:2px;">${exPrs.length} PR${exPrs.length>1?'s':''}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--accent);line-height:1;">${best.weight}lb</div>
          <div style="font-size:9px;color:var(--dim);margin-top:2px;">Est 1RM: ${e1rm}lb</div>
        </div>
      </div>
      ${timeline}
      ${exPrs.length>6?`<div style="font-size:10px;color:var(--dim);text-align:center;margin-top:6px;">+${exPrs.length-6} more</div>`:''}
    </div>`;
  }).join('');

  return `
    <div style="font-family:'Bebas Neue',sans-serif;font-size:36px;letter-spacing:1px;margin-bottom:4px;">PR History</div>
    <div style="font-size:11px;color:var(--dim);margin-bottom:18px;">Every personal record you've set</div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:18px;">
      <div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:12px;padding:12px;text-align:center;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:26px;color:var(--accent);line-height:1;">${totalPRs}</div>
        <div style="font-size:8px;color:var(--muted);letter-spacing:1px;margin-top:3px;text-transform:uppercase;">Total PRs</div>
      </div>
      <div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:12px;padding:12px;text-align:center;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:26px;color:var(--accent);line-height:1;">${uniqueExercises}</div>
        <div style="font-size:8px;color:var(--muted);letter-spacing:1px;margin-top:3px;text-transform:uppercase;">Exercises</div>
      </div>
      <div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:12px;padding:12px;text-align:center;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:16px;color:var(--accent);line-height:1;">${latestPR.weight}lb</div>
        <div style="font-size:8px;color:var(--muted);letter-spacing:1px;margin-top:3px;text-transform:uppercase;">Latest</div>
        <div style="font-size:8px;color:var(--dim);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${latestPR.name}</div>
      </div>
    </div>

    ${cards}
  `;
}

// inlineChallengeAdd + renderInlineChallenge — Moved to js/challenge.js
function renderLog(){
  if(!activeWorkout) return "";
  const totalV=activeWorkout.exercises.reduce((a,e)=>a+vol(e.sets),0);

  const logHeader=`<div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:18px;">
    <div>
      <div style="font-size:8px;letter-spacing:3px;color:var(--muted);text-transform:uppercase;margin-bottom:2px;">In Progress</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:42px;letter-spacing:1px;line-height:1;">${splitName(activeWorkout.split)}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--accent);line-height:1;">${totalV>0?totalV.toLocaleString()+' lb':''}</div>
      <div style="font-size:9px;color:var(--muted);letter-spacing:1px;margin-top:2px;">${totalV>0?'volume':''}</div>
    </div>
  </div>`;
  const cards=activeWorkout.exercises.map(e=>{
    const id=sid(e.name);
    const isCollapsed=collapsedEx.has(e.name);
    const v=vol(e.sets);

    const isDone=doneExSet.has(e.name);
    if(isCollapsed){
      return `<div class="card" id="ex-${id}" onclick="toggleCollapse(${esc(e.name)})" style="cursor:pointer;opacity:${isDone?'0.7':'1'};">
        <div class="collapsed-row">
          <div>
            <div class="collapsed-name" style="display:flex;align-items:center;gap:7px;">
              ${isDone?`<span style="color:var(--green);font-size:13px;">✓</span>`:''}
              ${e.name}${e.superset?` <span class="tag sstag">⚡${e.ssPair||'SS'}</span>`:''}
            </div>
            <div class="collapsed-meta">${e.sets.length} set${e.sets.length!==1?'s':''}${v>0?` · ${v.toLocaleString()}lb`:''}</div>
          </div>
          <span style="color:var(--dim);font-size:12px;">▼ edit</span>
        </div>
      </div>`;
    }

    const restFmt=fmt(state.exerciseRests[e.name]??GLOBAL_DEFAULT);
    const lastSess=getLastSession(e.name);
    const lastV=lastSess?vol(lastSess.sets):null;
    const delta=lastV!==null&&v>0?v-lastV:null;
    const deltaEl=delta!==null?`<span class="vol-delta ${delta>0?"up":delta<0?"down":"same"}">${delta>0?"+":""}${delta.toLocaleString()}lb</span>`:"";
    const ssOn=e.superset, bwOn=e.bwMode;
    const isRenaming=renamingEx===e.name;
    const nameEl=isRenaming
      ?`<input class="ex-name-input" id="rin-${id}" value="${e.name.replace(/"/g,'&quot;')}" onblur="commitRename(${esc(e.name)})" onkeydown="if(event.key==='Enter')commitRename(${esc(e.name)});if(event.key==='Escape')cancelRename();"/>`
      :`<span class="ex-name" onclick="toggleCollapse(${esc(e.name)})" style="cursor:pointer;">${e.name}</span>`;
    const renBtn=""; // moved to overflow menu
    const exIdx=activeWorkout.exercises.findIndex(e2=>e2.name===e.name);
    const upBtn=""; const downBtn=""; // moved to overflow menu
    const delExBtn=""; // moved to overflow menu
    // Overflow "⋮" menu — reorder, rename, delete tucked away
    const overflowMenuOpen=exMenuOpen===e.name;
    const overflowMenu=`<div style="position:relative;display:inline-block;">
      <button class="icon-btn" onclick="exMenuOpen=exMenuOpen===${JSON.stringify(e.name)}?null:${JSON.stringify(e.name)};render();" style="font-size:16px;padding:2px 6px;">⋮</button>
      ${overflowMenuOpen?`<div style="position:absolute;right:0;top:100%;z-index:50;background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:6px;min-width:140px;box-shadow:0 4px 16px rgba(0,0,0,0.4);">
        ${exIdx>0?`<button onclick="moveExercise(${esc(e.name)},-1);exMenuOpen=null;render();" style="display:block;width:100%;padding:8px 12px;background:none;border:none;color:var(--muted);font-family:'DM Sans',sans-serif;font-size:12px;text-align:left;cursor:pointer;">↑ Move up</button>`:''}
        ${exIdx<activeWorkout.exercises.length-1?`<button onclick="moveExercise(${esc(e.name)},1);exMenuOpen=null;render();" style="display:block;width:100%;padding:8px 12px;background:none;border:none;color:var(--muted);font-family:'DM Sans',sans-serif;font-size:12px;text-align:left;cursor:pointer;">↓ Move down</button>`:''}
        <button onclick="startRename(${esc(e.name)});exMenuOpen=null;" style="display:block;width:100%;padding:8px 12px;background:none;border:none;color:var(--muted);font-family:'DM Sans',sans-serif;font-size:12px;text-align:left;cursor:pointer;">✎ Rename</button>
        <button onclick="swappingEx=${JSON.stringify(e.name)};exMenuOpen=null;openPicker();" style="display:block;width:100%;padding:8px 12px;background:none;border:none;color:var(--muted);font-family:'DM Sans',sans-serif;font-size:12px;text-align:left;cursor:pointer;">↔ Swap exercise</button>
        <div style="height:1px;background:var(--border);margin:4px 0;"></div>
        <button onclick="deleteExerciseConfirm(${esc(e.name)});exMenuOpen=null;" style="display:block;width:100%;padding:8px 12px;background:none;border:none;color:var(--danger);font-family:'DM Sans',sans-serif;font-size:12px;text-align:left;cursor:pointer;">🗑 Remove</button>
      </div>`:''}
    </div>`;

    const setRows=e.sets.map((s,i)=>{
      const dropRows=s.drops?s.drops.map((d,di)=>`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 12px 4px 28px;font-size:11px;color:var(--dim);">
          <span>↳ ${d.weight}lb × ${d.reps}</span>
          <button class="set-del" onclick="deleteDrop(${esc(e.name)},${i},${di})" style="font-size:9px;">✕</button>
        </div>`).join(''):'';
      const dropOpen=dropInputOpen&&dropInputOpen.exName===e.name&&dropInputOpen.setIdx===i;
      const dropForm=dropOpen?`
        <div style="display:flex;align-items:center;gap:6px;padding:6px 12px 6px 28px;">
          <input id="drop-w" class="input" type="number" inputmode="decimal" placeholder="lb" style="width:60px;font-size:13px;padding:6px 8px;text-align:center;"/>
          <span style="color:var(--dim);font-size:11px;">×</span>
          <input id="drop-r" class="input" type="number" inputmode="numeric" placeholder="reps" style="width:50px;font-size:13px;padding:6px 8px;text-align:center;"/>
          <button class="btn ghost" onclick="addDrop(${esc(e.name)},${i})" style="padding:5px 10px;font-size:11px;">+</button>
          <button class="set-del" onclick="closeDropInput()" style="font-size:11px;">✕</button>
        </div>`:'';
      const setVol=(!s.bw&&!s.warmup)?parseFloat(s.weight)*parseInt(s.reps)+(s.drops?s.drops.reduce((a,d)=>a+(parseFloat(d.weight)||0)*(parseInt(d.reps)||0),0):0):0;
      return `
      <div class="set-row" data-ex="${e.name.replace(/"/g,'&quot;')}" data-idx="${i}">
        <span style="display:flex;align-items:center;gap:6px;">
          ${s.warmup?`<span style="font-size:9px;background:rgba(100,160,255,0.15);border:1px solid rgba(100,160,255,0.3);border-radius:4px;padding:1px 5px;color:#7aacff;font-weight:700;letter-spacing:1px;">W</span>`:""}
          ${s.pr?`<span class="pr-ticket">PR</span>`:""}
          ${s.drops?`<span style="font-size:9px;background:rgba(232,213,160,0.15);border:1px solid rgba(232,213,160,0.3);border-radius:4px;padding:1px 5px;color:var(--accent);font-weight:700;letter-spacing:1px;">DROP</span>`:""}
          Set ${i+1}: ${s.bw?"BW":s.weight+"lb"} × ${s.reps}
        </span>
        <span style="display:flex;align-items:center;gap:6px;">
          ${(!s.bw&&!s.warmup&&setVol)?`<span class="set-vol">${setVol.toLocaleString()}lb</span>`:""}
          <button style="background:none;border:none;color:var(--dim);font-size:9px;padding:2px 4px;cursor:pointer;letter-spacing:0.5px;" onclick="event.stopPropagation();openDropInput(${esc(e.name)},${i})">+DROP</button>
          <button class="set-del" onclick="deleteSet(${esc(e.name)},${i})">✕</button>
        </span>
      </div>${dropRows}${dropForm}`;
    }).join("");

    const isExpanded=!expandedLastSession.has(e.name); // default open, toggle to hide
    const lastHint=lastSess&&lastSess.sets.length?`
      <div class="hint-row" style="flex-wrap:wrap;gap:4px;">
        <button class="hint-btn" onclick="toggleLastSession(${esc(e.name)})" style="font-size:10px;padding:3px 8px;color:var(--dim);">${isExpanded?'▲ hide last':'▼ show last session'}</button>
      </div>
      ${isExpanded?`<div style="background:var(--bg3);border-radius:8px;padding:8px 10px;margin-bottom:8px;">
        <div style="font-size:9px;letter-spacing:1.5px;color:var(--dim);margin-bottom:6px;">LAST SESSION</div>
        ${lastSess.sets.map((s,si)=>`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid var(--border);">
            <span style="font-size:11px;color:var(--muted);">Set ${si+1}: ${s.bw?"BW":s.weight+"lb"} × ${s.reps}</span>
            <span style="display:flex;align-items:center;gap:5px;">
              ${s.pr?`<span class="pr-ticket">PR</span>`:""}
              ${!s.bw?`<span style="font-size:10px;color:var(--dim);">${(parseFloat(s.weight)*parseInt(s.reps)).toLocaleString()}lb</span>`:""}
            </span>
          </div>`).join("")}
        <button class="hint-btn" onclick="sameAsLast(${esc(e.name)})" style="margin-top:8px;width:100%;text-align:center;">USE LAST SET</button>
      </div>`:""}
    `:"";

    // Pre-fill: match set-for-set from last session
    // If logging set 3, prefill from last session's set 3 (not just the last set)
    const lastSetThisSession = e.sets.length>0 ? e.sets[e.sets.length-1] : null;
    const nextSetIdx = e.sets.length; // the set about to be logged
    const lastSessMatchingSet = lastSess?.sets?.[nextSetIdx]; // same set # from last time
    const lastSessFallback = lastSess?.sets?.slice(-1)[0]; // fallback to last set if fewer sets last time

    const prefillR = (lastSetThisSession || lastSessMatchingSet || lastSessFallback)?.reps || "10";

    // Progressive overload suggestion — only shown before first set of session
    const suggestion = !lastSetThisSession ? getSuggestedWeight(e.name) : null;
    const prefillW = lastSetThisSession && !lastSetThisSession.bw
      ? lastSetThisSession.weight
      : suggestion ? String(suggestion.weight)
      : lastSessMatchingSet && !lastSessMatchingSet.bw ? lastSessMatchingSet.weight
      : (lastSessFallback?.bw ? "" : lastSessFallback?.weight || "135");

    const overloadBadge = !bwOn && !lastSetThisSession && suggestion ? (
      suggestion.same
        ? `<div style="font-size:11px;color:var(--muted);margin-bottom:8px;">↔ Same weight — hit more reps to progress</div>`
        : `<div style="font-size:11px;color:var(--green);margin-bottom:8px;">↑ +${suggestion.pct}% vs last session · ${suggestion.weight}lb suggested</div>`
    ) : "";

    const weightInput=bwOn
      ?`<div class="col"><span class="label">WEIGHT</span><div style="background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:10px 12px;font-size:14px;color:var(--dim);">BW</div></div>`
      :`<div class="col"><span class="label" style="display:flex;justify-content:space-between;align-items:center;">WEIGHT (lb)<button onclick="openPlateCalc(${esc(e.name)})" style="background:none;border:none;color:var(--dim);font-size:11px;cursor:pointer;padding:0;font-family:'DM Sans',sans-serif;letter-spacing:0.5px;" title="Plate calculator">🔧</button></span><input class="input" type="number" id="w-${id}" value="" placeholder="${prefillW}" onfocus="if(!this.value){this.value=this.placeholder;}this.select();" inputmode="decimal"/></div>`;

    const tipPanel=buildTipPanel(e.name);
    const reopenBtn=getTips(e.name)&&!hasTipShown(e.name)?`<button class="tip-reopen" onclick="openTip(${esc(e.name)});render();" title="Research tips" style="font-size:11px;letter-spacing:1px;color:var(--dim);opacity:0.5;">📚</button>`:"";

    const isSSPrompt=activeSSPrompt===e.name;
    const ssPairName=e.ssPair;
    const pickerOpen=ssPickerOpen===e.name;
    const otherExes=activeWorkout.exercises.filter(ex2=>ex2.name!==e.name);
    const inlinePicker=pickerOpen?`<div style="margin-top:8px;padding:12px;background:rgba(139,114,224,0.08);border:1px solid rgba(139,114,224,0.3);border-radius:12px;"><div style="font-size:9px;letter-spacing:2px;color:var(--superset);margin-bottom:8px;text-transform:uppercase;">Pair with</div><div style="display:flex;flex-direction:column;gap:6px;">${otherExes.map(ox=>{const ip=ox.name===ssPairName;return '<button onclick="'+(ip?'unpairSS('+esc(e.name)+');ssPickerOpen=null;render();':'pairSS('+esc(e.name)+','+esc(ox.name)+');ssPickerOpen=null;')+'" style="padding:10px 14px;border-radius:10px;text-align:left;cursor:pointer;border:1px solid '+(ip?'var(--superset)':'var(--border)')+';background:'+(ip?'rgba(139,114,224,0.12)':'var(--bg2)')+';color:'+(ip?'var(--superset)':'var(--muted)')+';font-family:\'DM Sans\',sans-serif;font-size:12px;display:flex;justify-content:space-between;align-items:center;"><span>'+ox.name+'</span>'+(ip?'<span style="font-size:10px;opacity:0.7;">✓ tap to remove</span>':'')+'</button>';}).join('')}</div></div>`:'';
    const ssPromptBanner=isSSPrompt?`<div style="margin-bottom:10px;padding:12px 16px;background:var(--superset);border-radius:10px;display:flex;align-items:center;gap:10px;"><span style="font-size:18px;">⚡</span><div><div style="font-size:13px;font-weight:700;color:#fff;">YOUR TURN</div><div style="font-size:10px;color:rgba(255,255,255,0.75);margin-top:1px;">Log your set, then switch back</div></div></div>`:'';
    const ssPartnerTag=ssPairName?`<span class="tag sstag" style="cursor:pointer;" onclick="openPairModal(${esc(e.name)})">⚡ ${ssPairName}</span>`:'';
    return `<div class="card${ssOn?" ss-card":""}${isSSPrompt?" ss-prompt":""}" id="ex-${id}" style="${ssPairName?'border-left:3px solid var(--superset);':''}">
      <div class="ex-header">
        ${nameEl}${overflowMenu}
        ${ssPartnerTag}
        ${reopenBtn}

      </div>
      ${ssPromptBanner}
      ${inlinePicker}
      ${tipPanel}
      ${setRows}
      ${lastHint}
      ${overloadBadge}
      <div class="row" style="margin-top:10px;">
        ${weightInput}
        <div class="col"><span class="label">REPS</span><input class="input" type="number" id="r-${id}" value="" placeholder="${prefillR}" onfocus="if(!this.value){this.value=this.placeholder;}this.select();" inputmode="numeric"/></div>
      </div>
      <button class="btn ghost" onclick="logSet(${esc(e.name)})" style="${isSSPrompt?'border-color:var(--superset)44;color:var(--superset);':''}">+ LOG SET${ssOn&&ssPairName?' ⚡':ssOn?' (no rest)':''}</button>
      ${(()=>{
        const isLast=activeWorkout.exercises.findIndex(e2=>e2.name===e.name)===activeWorkout.exercises.length-1;
        const nextEx=!isLast?activeWorkout.exercises[activeWorkout.exercises.findIndex(e2=>e2.name===e.name)+1]:null;
        const nextRest=nextEx?(state.exerciseRests[nextEx.name]??GLOBAL_DEFAULT)+30:0;
        return isLast
          ? `<button onclick="nextExercise(${esc(e.name)})"
              style="width:100%;margin-top:10px;padding:13px;border:none;border-radius:12px;
              background:rgba(232,213,160,0.1);color:var(--accent);
              font-family:'Bebas Neue',sans-serif;font-size:15px;letter-spacing:2.5px;cursor:pointer;">
              NEXT EXERCISE →
            </button>`
          : `<button onclick="nextExercise(${esc(e.name)})"
              style="width:100%;margin-top:10px;padding:13px;border:none;border-radius:12px;
              background:rgba(74,200,138,0.1);color:var(--green);
              font-family:'Bebas Neue',sans-serif;font-size:15px;letter-spacing:2px;cursor:pointer;
              display:flex;align-items:center;justify-content:center;gap:10px;">
              <span style="font-size:13px;">→</span>
              NEXT: ${nextEx.name.toUpperCase()}
              <span style="font-size:10px;color:var(--dim);font-family:'DM Sans',sans-serif;letter-spacing:0;margin-left:4px;">+${fmt(nextRest)}</span>
            </button>`;
      })()}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;flex-wrap:wrap;gap:6px;">
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${activeWorkout.exercises.length>1?`<button class="pill${ssOn?" ss-on":""}" onclick="openPairModal(${esc(e.name)})"><span class="pill-dot"></span>${ssPairName?"⚡ "+ssPairName:"⚡ SUPERSET"}</button>`:""}
          <button class="pill${e.warmupNext?" ss-on":""}" onclick="toggleWarmup(${esc(e.name)})" style="${e.warmupNext?"background:rgba(100,160,255,0.12);border-color:rgba(100,160,255,0.3);color:#7aacff;":""}">W WARMUP</button>
          <button class="pill${bwOn&&!BW_EXERCISES.has(e.name)?" ss-on":""}" onclick="toggleBW(${esc(e.name)})" style="${bwOn&&!BW_EXERCISES.has(e.name)?"background:rgba(232,213,160,0.1);border-color:var(--accent);color:var(--accent);":""}">BW</button>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          ${deltaEl}
          ${v>0?`<span style="font-size:11px;color:var(--dim)">${v.toLocaleString()}lb</span>`:""}
          <button style="background:none;border:none;color:var(--dim);font-size:10px;cursor:pointer;font-family:'DM Sans',sans-serif;" onclick="showRestEditor(${esc(e.name)})">⏱${restFmt}</button>
        </div>
      </div>
      ${e.notes ? `<textarea class="notes-inp" rows="1" oninput="updateNote(${esc(e.name)},this.value);this.style.height='auto';this.style.height=this.scrollHeight+'px';" style="height:auto;">${e.notes}</textarea>` : `<button onclick="this.replaceWith((()=>{const t=document.createElement('textarea');t.className='notes-inp';t.placeholder='notes...';t.rows=1;t.oninput=function(){updateNote(${JSON.stringify(e.name)},this.value);this.style.height='auto';this.style.height=this.scrollHeight+'px';};t.focus();return t;})())" style="background:none;border:none;color:var(--dim);font-size:11px;cursor:pointer;padding:4px 0;font-family:'DM Sans',sans-serif;letter-spacing:0.5px;">+ add note</button>`}
    </div>`;
  }).join("");

  return `
    <div class="btn-row" style="margin-bottom:16px;">
      <div>
        <span class="tag ${TAG_COLORS[activeWorkout.split]||""}">${splitName(activeWorkout.split).toUpperCase()}</span>
        ${totalV>0?`<div style="font-size:11px;color:var(--accent);margin-top:4px;">${totalV.toLocaleString()}lb total</div>`:""}
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button class="btn ghost small" onclick="abandonWorkout()" style="font-size:11px;padding:6px 10px;color:var(--danger);border-color:var(--danger)33;">✕</button>
        ${setHistory.length>0?`<button class="btn ghost small" onclick="undoLastSet()" style="font-size:11px;padding:6px 10px;">↩ UNDO</button>`:""}
        <button class="btn primary small" id="finish-btn-anchor" onclick="confirmFinish()">FINISH ✓</button>
      </div>
    </div>
    ${renderInlineChallenge()}
    ${logHeader}
    ${cards.length?cards:`<div style="padding:40px 0;text-align:center;">
      <div style="font-size:32px;margin-bottom:12px;">💪</div>
      <div style="font-size:15px;color:var(--muted);margin-bottom:4px;">Ready to work</div>
      <div style="font-size:12px;color:var(--dim);">Tap below to add your first exercise</div>
      ${(state.templates||[]).length?`
      <div style="margin-top:24px;padding-top:20px;border-top:1px solid #1e1e24;">
        <div style="font-size:9px;letter-spacing:2.5px;color:var(--muted);text-transform:uppercase;margin-bottom:12px;">OR LOAD A TEMPLATE</div>
        <div style="display:flex;flex-direction:column;gap:8px;max-width:280px;margin:0 auto;">
          ${(state.templates||[]).slice(0,5).map(t=>`<button onclick="loadTemplate('${t.id}')" style="background:var(--bg3);border:1px solid var(--border2);border-radius:12px;padding:12px 16px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;"><span>${t.name}</span><span style="font-size:10px;color:var(--muted);">${t.exercises.length} exercises</span></button>`).join("")}
        </div>
      </div>`:""}
    </div>`}
    <button class="btn ${activeWorkout.exercises.length?"ghost":"primary"}" onclick="openPicker()" style="margin-top:4px;">+ ADD EXERCISE</button>
    ${activeWorkout.exercises.length>0?`
    <div style="margin-top:16px;padding-top:14px;border-top:1px solid #1e1e24;">
      <div style="font-size:8px;letter-spacing:2.5px;color:var(--muted);text-transform:uppercase;margin-bottom:8px;">Session Notes</div>
      <textarea id="session-notes" class="notes-inp" placeholder="How'd it feel? Sleep, energy, notes..." rows="2"
        oninput="activeWorkout.notes=this.value;"
        style="font-size:12px;color:var(--muted);padding:10px 0;border-bottom:1px solid #1e1e24;width:100%;background:none;resize:none;outline:none;border:none;border-bottom:1px solid #1e1e24;font-family:'DM Sans',sans-serif;">${activeWorkout.notes||""}</textarea>
    </div>
    <div style="margin-top:14px;padding-top:14px;border-top:1px solid #1e1e24;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <div style="font-size:8px;letter-spacing:2.5px;color:var(--muted);text-transform:uppercase;">Sauna</div>
        <button onclick="toggleSauna()" style="background:${activeWorkout.sauna?'var(--accent)':'#1e1e24'};border:none;border-radius:12px;width:40px;height:22px;position:relative;cursor:pointer;transition:background 0.2s;">
          <span style="position:absolute;top:2px;${activeWorkout.sauna?'right:2px':'left:2px'};width:18px;height:18px;background:${activeWorkout.sauna?'#080808':'#666'};border-radius:50%;transition:all 0.2s;"></span>
        </button>
      </div>
      ${activeWorkout.sauna?`
      <div style="display:flex;gap:10px;align-items:center;">
        <div style="flex:1;">
          <div style="font-size:9px;color:var(--dim);margin-bottom:4px;">Minutes</div>
          <input id="sauna-min" type="number" inputmode="numeric" value="${activeWorkout.sauna.minutes||''}" placeholder="15"
            oninput="activeWorkout.sauna.minutes=parseInt(this.value)||0;"
            style="width:100%;font-size:16px;text-align:center;background:var(--bg2);border:1px solid var(--border2);border-radius:10px;color:var(--text);padding:8px;font-family:'DM Sans',sans-serif;"/>
        </div>
        <div style="flex:1;">
          <div style="font-size:9px;color:var(--dim);margin-bottom:4px;">Temp (°F)</div>
          <input id="sauna-temp" type="number" inputmode="numeric" value="${activeWorkout.sauna.tempF||''}" placeholder="180"
            oninput="activeWorkout.sauna.tempF=parseInt(this.value)||0;"
            style="width:100%;font-size:16px;text-align:center;background:var(--bg2);border:1px solid var(--border2);border-radius:10px;color:var(--text);padding:8px;font-family:'DM Sans',sans-serif;"/>
        </div>
      </div>`:''}
    </div>
    <div style="height:80px;"></div>`:""}
  `;
}

// ── HISTORY EDIT HELPERS ──
function toggleHistEdit(){
  if(!histEditMode){
    // Entering edit mode — take snapshot
    histEditMode=true;
    histEditDirty=false;
    histEditSnapshot=JSON.parse(JSON.stringify(historyDetail));
    render();
  } else {
    // Leaving edit mode
    if(histEditDirty){
      showModal(`
        <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:12px;">SAVE CHANGES?</div>
        <div style="font-size:13px;color:var(--text);margin-bottom:20px;">You edited this workout. Save your changes?</div>
        <button class="btn primary" onclick="confirmHistEdit(true)">SAVE CHANGES</button>
        <button class="btn ghost" onclick="confirmHistEdit(false)" style="margin-top:8px;">DISCARD</button>
      `);
    } else {
      histEditMode=false;
      render();
    }
  }
}
function confirmHistEdit(save){
  hideModal();
  if(!save&&histEditSnapshot){
    // Revert to snapshot
    const wIdx=state.workouts.indexOf(historyDetail);
    if(wIdx>=0){
      state.workouts[wIdx]=histEditSnapshot;
      historyDetail=state.workouts[wIdx];
    }
    saveImmediate();
    showToast('Changes discarded');
  } else {
    saveImmediate();
    showToast('Workout updated');
  }
  histEditMode=false;
  histEditSnapshot=null;
  histEditDirty=false;
  render();
}
function deleteWorkout(idx){
  showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:12px;">DELETE WORKOUT?</div>
    <div style="font-size:13px;color:var(--text);margin-bottom:20px;">This can't be undone.</div>
    <button class="btn primary" style="background:var(--danger);border-color:var(--danger);" onclick="state.workouts.splice(${idx},1);saveImmediate();historyDetail=null;hideModal();render();">DELETE</button>
    <button class="btn ghost" onclick="hideModal()" style="margin-top:8px;">CANCEL</button>
  `);
}
function _histRecalc(wIdx){
  state.workouts[wIdx].totalVolume=state.workouts[wIdx].exercises.reduce((a,e)=>a+vol(e.sets),0);
  historyDetail=state.workouts[wIdx];
  histEditDirty=true;
  render();
}
function histSaveSet(wIdx, exName, sIdx, w, r){
  const ex=state.workouts[wIdx]?.exercises.find(e=>e.name===exName);
  if(!ex||!ex.sets[sIdx]) return;
  ex.sets[sIdx].weight=w;
  ex.sets[sIdx].reps=r;
  _histRecalc(wIdx);
}
function histDeleteSet(wIdx, exName, sIdx){
  const ex=state.workouts[wIdx]?.exercises.find(e=>e.name===exName);
  if(!ex) return;
  ex.sets.splice(sIdx,1);
  _histRecalc(wIdx);
}
function histDeleteExercise(wIdx, exName){
  if(!confirm('Remove '+exName+' from this workout?')) return;
  state.workouts[wIdx].exercises=state.workouts[wIdx].exercises.filter(e=>e.name!==exName);
  _histRecalc(wIdx);
}
function histAddSet(wIdx, exName){
  const ex=state.workouts[wIdx]?.exercises.find(e=>e.name===exName);
  if(!ex) return;
  const last=ex.sets[ex.sets.length-1];
  ex.sets.push(last?{...last,pr:false,warmup:false}:{weight:'135',reps:'10',bw:false,pr:false,time:Date.now()});
  _histRecalc(wIdx);
}
function histEditDuration(wIdx){
  const w=state.workouts[wIdx];
  if(!w) return;
  const curMins=Math.round((w.duration||0)/60000);
  const curH=Math.floor(curMins/60);
  const curM=curMins%60;
  showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:14px;">EDIT DURATION</div>
    <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:16px;">
      <input id="hdur-h" type="number" inputmode="numeric" min="0" max="23" value="${curH}"
        style="width:60px;text-align:center;font-family:'Bebas Neue',sans-serif;font-size:36px;background:var(--bg2);border:1px solid var(--border2);border-radius:12px;color:var(--text);padding:8px;"/>
      <span style="font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--muted);">h</span>
      <input id="hdur-m" type="number" inputmode="numeric" min="0" max="59" value="${curM}"
        style="width:60px;text-align:center;font-family:'Bebas Neue',sans-serif;font-size:36px;background:var(--bg2);border:1px solid var(--border2);border-radius:12px;color:var(--text);padding:8px;"/>
      <span style="font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--muted);">m</span>
    </div>
    <button class="btn primary" onclick="saveHistDuration(${wIdx})">SAVE</button>
    <button class="btn ghost" onclick="hideModal()" style="margin-top:8px;">CANCEL</button>
  `);
}
function saveHistDuration(wIdx){
  const h=parseInt(document.getElementById('hdur-h').value)||0;
  const m=parseInt(document.getElementById('hdur-m').value)||0;
  const newDur=(h*60+m)*60000;
  if(newDur<=0){ hideModal(); return; }
  state.workouts[wIdx].duration=newDur;
  if(historyDetail===state.workouts[wIdx]||state.workouts.indexOf(historyDetail)===wIdx) historyDetail=state.workouts[wIdx];
  histEditDirty=true;
  saveImmediate();
  hideModal();
  showToast('Duration updated');
  render();
}
function histEditDate(wIdx){
  const w=state.workouts[wIdx];
  if(!w) return;
  const d=w.timestamp?new Date(w.timestamp):new Date();
  const isoDate=d.toISOString().slice(0,10);
  showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:14px;">EDIT DATE</div>
    <input id="hdate-val" type="date" value="${isoDate}"
      style="width:100%;background:var(--bg2);border:1px solid var(--border2);border-radius:12px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:16px;padding:10px;margin-bottom:16px;box-sizing:border-box;"/>
    <button class="btn primary" onclick="saveHistDate(${wIdx})">SAVE</button>
    <button class="btn ghost" onclick="hideModal()" style="margin-top:8px;">CANCEL</button>
  `);
}
function saveHistDate(wIdx){
  const val=document.getElementById('hdate-val').value;
  if(!val){ hideModal(); return; }
  const d=new Date(val+'T12:00:00');
  const displayDate=d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  state.workouts[wIdx].date=displayDate;
  state.workouts[wIdx].timestamp=d.getTime();
  if(state.workouts.indexOf(historyDetail)===wIdx) historyDetail=state.workouts[wIdx];
  histEditDirty=true;
  saveImmediate();
  hideModal();
  showToast('Date updated');
  render();
}
function histEditSplit(wIdx){
  const w=state.workouts[wIdx];
  if(!w) return;
  const allSplits=Object.keys(ALL_SPLITS);
  const opts=allSplits.map(s=>`<option value="${s}"${w.split===s?' selected':''}>${splitName(s)}</option>`).join('');
  showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:14px;">EDIT WORKOUT TYPE</div>
    <select id="hsplit-val"
      style="width:100%;background:var(--bg2);border:1px solid var(--border2);border-radius:12px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:16px;padding:10px;margin-bottom:16px;box-sizing:border-box;">
      ${opts}
    </select>
    <button class="btn primary" onclick="saveHistSplit(${wIdx})">SAVE</button>
    <button class="btn ghost" onclick="hideModal()" style="margin-top:8px;">CANCEL</button>
  `);
}
function saveHistSplit(wIdx){
  const val=document.getElementById('hsplit-val').value;
  if(!val){ hideModal(); return; }
  state.workouts[wIdx].split=val;
  if(state.workouts.indexOf(historyDetail)===wIdx) historyDetail=state.workouts[wIdx];
  histEditDirty=true;
  saveImmediate();
  hideModal();
  showToast('Workout type updated');
  render();
}
function histSaveNotes(wIdx,val){
  const trimmed=val.trim();
  const w=state.workouts[wIdx];
  if(!w) return;
  if((w.notes||'')===(trimmed)) return;
  state.workouts[wIdx].notes=trimmed||null;
  if(state.workouts.indexOf(historyDetail)===wIdx) historyDetail=state.workouts[wIdx];
  histEditDirty=true;
  saveImmediate();
}
// ── Weekly Volume Wave Chart ──
function renderVolumeWave(){
  if(!state.workouts||!state.workouts.length) return '';
  const now=new Date();
  const weeks=12;
  const weekBuckets=[];
  const todayDay=now.getDay();
  const mondayOffset=todayDay===0?6:todayDay-1;
  const currentMonday=new Date(now);
  currentMonday.setDate(currentMonday.getDate()-mondayOffset);
  currentMonday.setHours(0,0,0,0);
  for(let i=weeks-1;i>=0;i--){
    const start=new Date(currentMonday);
    start.setDate(start.getDate()-i*7);
    const end=new Date(start);
    end.setDate(end.getDate()+7);
    const label=`${start.getMonth()+1}/${start.getDate()}`;
    const vol=state.workouts
      .filter(w=>{const t=new Date(w.timestamp);return t>=start&&t<end;})
      .reduce((sum,w)=>sum+(w.totalVolume||0),0);
    weekBuckets.push({label,vol,start,end});
  }
  if(weekBuckets.every(b=>b.vol===0)) return '';
  const currentWeekVol=weekBuckets[weekBuckets.length-1].vol;
  const lastWeekVol=weekBuckets[weekBuckets.length-2].vol;
  const trend=currentWeekVol>lastWeekVol?'up':currentWeekVol<lastWeekVol?'down':'flat';
  const trendIcon=trend==='up'?'\u2191':trend==='down'?'\u2193':'\u2192';
  const trendColor=trend==='up'?'#52c87a':trend==='down'?'#e85454':'var(--muted)';
  const W=320,H=120,padT=10,padB=24;
  const chartW=W;
  const chartH=H-padT-padB;
  const maxVol=Math.max(...weekBuckets.map(b=>b.vol),1);
  const points=weekBuckets.map((b,i)=>{
    const x=(i/(weeks-1))*chartW;
    const y=padT+chartH-(b.vol/maxVol)*chartH;
    return {x,y};
  });
  const linePoints=points.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPoints=linePoints+` ${points[points.length-1].x.toFixed(1)},${(padT+chartH).toFixed(1)} ${points[0].x.toFixed(1)},${(padT+chartH).toFixed(1)}`;
  const xLabels=weekBuckets.map((b,i)=>{
    if(i%2!==0&&i!==weeks-1) return '';
    const x=(i/(weeks-1))*chartW;
    return `<text x="${x.toFixed(1)}" y="${H-2}" fill="var(--dim)" font-size="8" text-anchor="middle" font-family="DM Sans,sans-serif">${b.label}</text>`;
  }).join('');
  const dots=points.map((p,i)=>{
    if(weekBuckets[i].vol===0) return '';
    const isCurrent=i===weeks-1;
    return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${isCurrent?4:2.5}" fill="${isCurrent?'var(--accent)':'rgba(232,213,160,0.6)'}" stroke="${isCurrent?'var(--accent)':'none'}" stroke-width="1"/>`;
  }).join('');
  return `<div class="card" style="margin-bottom:16px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <div style="font-size:8px;letter-spacing:3px;color:var(--muted);text-transform:uppercase;">Weekly Volume</div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--accent);line-height:1;">${currentWeekVol>0?currentWeekVol.toLocaleString():'0'}<span style="font-size:11px;color:var(--dim);margin-left:2px;">lb</span></span>
        <span style="font-size:14px;color:${trendColor};line-height:1;">${trendIcon}</span>
      </div>
    </div>
    <svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" style="display:block;">
      <defs>
        <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      <polygon points="${areaPoints}" fill="url(#volGrad)"/>
      <polyline points="${linePoints}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      ${dots}
      ${xLabels}
    </svg>
  </div>`;
}

// ── Top Exercises with Sparklines ──
function renderTopExercises(){
  if(!state.workouts||!state.workouts.length) return '';

  // Build frequency map and weight history per exercise
  const exData={};
  state.workouts.forEach(w=>{
    (w.exercises||[]).forEach(e=>{
      if(!exData[e.name]) exData[e.name]={count:0,sessions:[]};
      exData[e.name].count++;
      // Best weight in this session (non-bodyweight sets only)
      const weights=(e.sets||[]).filter(s=>!s.bw).map(s=>parseFloat(s.weight)||0);
      const bestW=weights.length?Math.max(...weights):0;
      if(bestW>0) exData[e.name].sessions.push(bestW);
    });
  });

  // Sort by frequency, take top 5
  const sorted=Object.entries(exData).sort((a,b)=>b[1].count-a[1].count);
  const top5=sorted.slice(0,5);
  if(!top5.length) return '';

  // Build sparkline SVG for an array of values
  function sparkSVG(vals){
    const recent=vals.slice(-8);
    if(recent.length<2) return '<svg width="80" height="24"></svg>';
    const min=Math.min(...recent), max=Math.max(...recent);
    const range=max-min||1;
    const w=80, h=24, padY=3;
    const points=recent.map((v,i)=>{
      const x=Math.round((i/(recent.length-1))*w);
      const y=Math.round(padY+(1-(v-min)/range)*(h-padY*2));
      return x+','+y;
    });
    // Determine trend color: green if last > first, dim if flat/down
    const trendUp=recent[recent.length-1]>recent[0];
    const lineColor=trendUp?'#52c87a':'var(--muted)';
    const dotColor=trendUp?'#52c87a':'var(--accent)';
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="overflow:visible;">
      <polyline points="${points.join(' ')}" fill="none" stroke="${lineColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${points[points.length-1].split(',')[0]}" cy="${points[points.length-1].split(',')[1]}" r="2.5" fill="${dotColor}"/>
    </svg>`;
  }

  const cards=top5.map(([name,data],idx)=>{
    const bestWeight=data.sessions.length?Math.max(...data.sessions):0;
    const spark=sparkSVG(data.sessions);
    const rank=idx+1;
    return `<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:#0f0f12;border:1px solid #1e1e24;border-radius:14px;margin-bottom:8px;box-shadow:0 0 15px rgba(232,213,160,0.1);cursor:pointer;" onclick="progressEx=${esc(name)};render()">
      <div style="width:22px;height:22px;border-radius:50%;background:rgba(232,213,160,0.12);border:1px solid rgba(232,213,160,0.25);display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:13px;color:var(--accent);flex-shrink:0;">${rank}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;color:var(--text);font-family:'DM Sans',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</div>
        <div style="font-size:9px;color:var(--dim);margin-top:2px;letter-spacing:0.5px;">${data.count} session${data.count!==1?'s':''}</div>
      </div>
      <div style="flex-shrink:0;">${spark}</div>
      <div style="text-align:right;flex-shrink:0;min-width:50px;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:18px;color:var(--accent);line-height:1;">${bestWeight>0?bestWeight:'BW'}</div>
        <div style="font-size:8px;color:var(--dim);letter-spacing:0.5px;margin-top:1px;">${bestWeight>0?'lb best':'only'}</div>
      </div>
    </div>`;
  }).join('');

  return `<div style="margin-bottom:16px;">
    <div style="font-size:8px;letter-spacing:3px;color:var(--muted);text-transform:uppercase;margin-bottom:10px;border-bottom:1px solid #1e1e24;padding-bottom:8px;">Top Lifts</div>
    ${cards}
  </div>`;
}

function renderYearGrid(){
  if(!state.workouts||!state.workouts.length) return '';
  const today=new Date(); today.setHours(0,0,0,0);
  const displayStart=new Date(today); displayStart.setDate(displayStart.getDate()-364);
  displayStart.setDate(displayStart.getDate()-displayStart.getDay());
  const volMap={};
  let workoutCount=0;
  state.workouts.forEach(w=>{
    const d=new Date(w.timestamp); d.setHours(0,0,0,0);
    const key=d.toDateString();
    volMap[key]=(volMap[key]||0)+(w.totalVolume||0);
    if(d>=displayStart&&d<=today) workoutCount++;
  });
  const volumes=Object.values(volMap).filter(v=>v>0).sort((a,b)=>a-b);
  const p33=volumes.length?volumes[Math.floor(volumes.length*0.33)]:0;
  const p66=volumes.length?volumes[Math.floor(volumes.length*0.66)]:0;
  function cellColor(vol){
    if(!vol||vol===0) return '#1a1a1a';
    if(vol<=p33) return 'rgba(232,213,160,0.2)';
    if(vol<=p66) return 'rgba(232,213,160,0.5)';
    return 'rgba(232,213,160,0.9)';
  }
  const totalDays=Math.floor((today-displayStart)/(1000*60*60*24))+1;
  const totalWeeks=Math.ceil(totalDays/7);
  const cells=[];
  for(let w=0;w<totalWeeks;w++){
    cells[w]=[];
    for(let d=0;d<7;d++){
      const date=new Date(displayStart);
      date.setDate(date.getDate()+w*7+d);
      if(date>today){ cells[w][d]={empty:true}; }
      else { const key=date.toDateString(); const vol=volMap[key]||0; cells[w][d]={date,vol,color:cellColor(vol)}; }
    }
  }
  const mnths=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let monthLabels='';
  let lastMonth=-1;
  for(let w=0;w<totalWeeks;w++){
    const date=new Date(displayStart); date.setDate(date.getDate()+w*7);
    const m=date.getMonth();
    if(m!==lastMonth){ monthLabels+=`<div style="position:absolute;left:${w*14}px;top:0;font-size:8px;color:var(--dim);letter-spacing:0.5px;white-space:nowrap;">${mnths[m]}</div>`; lastMonth=m; }
  }
  const dayLabels=['','M','','W','','F',''];
  const dayLabelHtml=dayLabels.map(l=>`<div style="height:12px;font-size:8px;color:var(--dim);display:flex;align-items:center;justify-content:flex-end;padding-right:4px;box-sizing:border-box;">${l}</div>`).join('');
  let gridHtml='';
  for(let d=0;d<7;d++){
    let rowHtml='';
    for(let w=0;w<totalWeeks;w++){
      const cell=cells[w][d];
      if(cell.empty){ rowHtml+=`<div style="width:12px;height:12px;"></div>`; }
      else { const isToday=cell.date.toDateString()===today.toDateString(); rowHtml+=`<div style="width:12px;height:12px;border-radius:2px;background:${cell.color};${isToday?'outline:1px solid var(--accent);outline-offset:-1px;':''}"></div>`; }
    }
    gridHtml+=`<div style="display:flex;gap:2px;">${rowHtml}</div>`;
  }
  return `<div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:14px;padding:16px;margin-bottom:16px;overflow-x:auto;">
    <div style="font-size:8px;letter-spacing:3px;color:var(--muted);text-transform:uppercase;margin-bottom:12px;">Activity</div>
    <div style="display:flex;gap:0;">
      <div style="display:flex;flex-direction:column;gap:2px;flex-shrink:0;width:18px;margin-top:16px;">${dayLabelHtml}</div>
      <div style="flex:1;min-width:0;">
        <div style="position:relative;height:14px;margin-bottom:4px;">${monthLabels}</div>
        <div style="display:flex;flex-direction:column;gap:2px;">${gridHtml}</div>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;">
      <div style="font-size:10px;color:var(--dim);">${workoutCount} workout${workoutCount!==1?'s':''} in the last year</div>
      <div style="display:flex;align-items:center;gap:3px;">
        <span style="font-size:8px;color:var(--dim);">Less</span>
        <div style="width:10px;height:10px;border-radius:2px;background:#1a1a1a;"></div>
        <div style="width:10px;height:10px;border-radius:2px;background:rgba(232,213,160,0.2);"></div>
        <div style="width:10px;height:10px;border-radius:2px;background:rgba(232,213,160,0.5);"></div>
        <div style="width:10px;height:10px;border-radius:2px;background:rgba(232,213,160,0.9);"></div>
        <span style="font-size:8px;color:var(--dim);">More</span>
      </div>
    </div>
  </div>`;
}

function renderMe(){
  // Sub-screens within Me
  if(historyDetail) return renderHistDetail();
  if(progressEx) return renderProgDetail();

  // meTab is module-level

  // ── Tabs ──
  const tabs=[["history","HISTORY"],["progress","PROGRESS"],["milestones","MEDALS"]];
  const tabBtns=tabs.map(([key,lbl])=>`
    <button onclick="meTab='${key}';if('${key}'!=='progress') progressSearch='';render()"
      style="flex:1;padding:10px 0;background:none;border:none;border-bottom:2px solid ${meTab===key?"var(--accent)":"transparent"};
      color:${meTab===key?"var(--accent)":"var(--muted)"};font-family:'DM Sans',sans-serif;font-size:11px;letter-spacing:2px;cursor:pointer;">${lbl}</button>
  `).join("");

  // ── Stats strip ──
  const streak=state.streak||0;
  const weekStart=new Date(); weekStart.setDate(weekStart.getDate()-weekStart.getDay()); weekStart.setHours(0,0,0,0);
  const thisWeek=state.workouts.filter(w=>new Date(w.timestamp)>=weekStart).length;
  const allTimeTonnage=state.workouts.reduce((a,w)=>a+(w.totalVolume||0),0);
  let best1RM=null;
  state.workouts.forEach(w=>(w.exercises||[]).forEach(e=>(e.sets||[]).forEach(s=>{
    if(!s.bw&&parseFloat(s.weight)>0&&parseInt(s.reps)>0){
      const v=est1RM(s.weight,s.reps);
      if(!best1RM||v>best1RM.val) best1RM={val:v,ex:e.name};
    }
  })));

  const weeklyReport=renderWeeklyReport();
  const creatineWeek=suppWeekCount('creatine');
  const statsStrip=`${weeklyReport}<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-bottom:16px;">
    <div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:14px;text-align:center;padding:14px 8px;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:36px;color:var(--accent);line-height:1;">${streak}</div>
      <div style="font-size:8px;color:var(--muted);letter-spacing:1.5px;margin-top:3px;text-transform:uppercase;">Streak</div>
    </div>
    <div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:14px;text-align:center;padding:14px 8px;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:36px;color:var(--accent);line-height:1;">${thisWeek}</div>
      <div style="font-size:8px;color:var(--muted);letter-spacing:1.5px;margin-top:3px;text-transform:uppercase;">This Week</div>
    </div>
    <div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:14px;text-align:center;padding:14px 8px;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:36px;color:#52c87a;line-height:1;">${creatineWeek}/7</div>
      <div style="font-size:8px;color:var(--muted);letter-spacing:1.5px;margin-top:3px;text-transform:uppercase;">Creatine</div>
    </div>
    <div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:14px;text-align:center;padding:14px 8px;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:${best1RM?'26':'36'}px;color:#52c87a;line-height:1;">${best1RM?best1RM.val+"lb":"—"}</div>
      <div style="font-size:8px;color:var(--muted);letter-spacing:1.5px;margin-top:3px;text-transform:uppercase;">Best 1RM</div>
      ${best1RM?`<div style="font-size:8px;color:var(--dim);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${best1RM.ex}</div>`:""}
    </div>
  </div>`;

  // ── Year activity grid ──
  const yearGrid=renderYearGrid();

  // ── Body heatmap ──
  const bodyHeatmap=renderBodyHeatmap();

  // ── Fatigue card (always visible at top) ──
  const fatigue=renderMuscleFatigue();

  // ── Tab content ──
  let tabContent="";
  if(meTab==="milestones"){
    tabContent = renderMilestones();
  } else if(meTab==="history"){
    if(!state.workouts.length){
      tabContent=`<div style="color:var(--dim);font-size:13px;padding:20px 0;">No workouts yet. Go lift. 💪</div>`;
    } else {
      const allSplits=[...new Set([...getActiveSplits(),...state.workouts.map(w=>w.split)])];
      const filterSplits=["All",...allSplits];
      const filterBtns=filterSplits.map(s=>`<button onclick="histFilter=${esc(s)};render()"
        style="background:${histFilter===s?"rgba(232,213,160,0.15)":"var(--bg3)"};border:1px solid ${histFilter===s?"var(--accent)":"var(--border2)"};
        border-radius:20px;color:${histFilter===s?"var(--accent)":"var(--muted)"};font-family:inherit;font-size:11px;letter-spacing:1px;padding:6px 14px;cursor:pointer;"
        >${s.toUpperCase()}</button>`).join("");
      let filtered=histFilter==="All"?state.workouts:state.workouts.filter(w=>w.split===histFilter);
      if(histSearchTerm&&histSearchTerm.trim()){
        const q=histSearchTerm.toLowerCase();
        filtered=filtered.filter(w=>w.exercises.some(e=>e.name.toLowerCase().includes(q)));
      }
      const cards=filtered.map(w=>{
        const idx=state.workouts.indexOf(w);
        const exNames=w.exercises.slice(0,3).map(e=>e.name).join(" · ")+(w.exercises.length>3?" +"+(w.exercises.length-3):"");
        const prCount=w.exercises.reduce((a,e)=>a+e.sets.filter(s=>s.pr).length,0);
        return `<div class="card" style="cursor:pointer;" onclick="historyDetail=state.workouts[${idx}];render()">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
            <div>
              <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:0.5px;line-height:1;color:var(--text);">${splitName(w.split)}</div>
              <div style="font-size:10px;color:var(--muted);margin-top:3px;letter-spacing:0.5px;">${w.date}${w.duration?` · ${fmtMs(w.duration)}`:""}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              ${prCount>0?`<span style="font-size:10px;background:rgba(232,213,160,0.12);border:1px solid rgba(232,213,160,0.3);border-radius:10px;padding:2px 8px;color:var(--accent);">🏆 ${prCount}</span>`:""}
              <button onclick="event.stopPropagation();deleteWorkout(${idx})" style="background:none;border:none;color:var(--dim);font-size:14px;cursor:pointer;padding:2px 4px;line-height:1;" title="Delete">🗑</button>
            </div>
          </div>
          <div style="font-size:11px;color:var(--muted);margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${exNames}</div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:18px;color:var(--accent);letter-spacing:0.5px;">${w.totalVolume>0?w.totalVolume.toLocaleString()+' lb':'BW only'}</div>
        </div>`;
      }).join("");
      const histSearch=`<div style="position:relative;margin-bottom:10px;">
        <input id="hist-search" class="input" placeholder="Search by exercise..." value="${histSearchTerm||''}"
          oninput="histSearchTerm=this.value;render()" style="font-size:13px;padding:10px 14px;"/>
        ${histSearchTerm?`<button onclick="histSearchTerm='';render()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--dim);font-size:16px;cursor:pointer;">✕</button>`:''}
      </div>`;
      const calHeatMap=(()=>{
        const today=new Date(); today.setHours(0,0,0,0);
        const weeks=8;
        const days=weeks*7;
        const startDate=new Date(today); startDate.setDate(startDate.getDate()-days+1);
        const dayCounts={};
        state.workouts.forEach(w=>{
          const d=new Date(w.timestamp); d.setHours(0,0,0,0);
          const key=d.toDateString();
          dayCounts[key]=(dayCounts[key]||0)+1;
        });
        const cells=[];
        for(let i=0;i<days;i++){
          const d=new Date(startDate); d.setDate(d.getDate()+i);
          const key=d.toDateString();
          const count=dayCounts[key]||0;
          const isToday=d.toDateString()===new Date().toDateString();
          const opacity=count===0?0.06:count===1?0.3:count>=2?0.6:0.15;
          cells.push(`<div style="width:12px;height:12px;border-radius:2px;background:${count>0?'var(--accent)':'var(--border)'};opacity:${count>0?opacity:0.3};${isToday?'border:1px solid var(--accent);':''}"></div>`);
        }
        const grid=[];
        for(let row=0;row<7;row++){
          const rowCells=[];
          for(let col=0;col<weeks;col++){
            const idx=col*7+row;
            rowCells.push(idx<cells.length?cells[idx]:'<div style="width:12px;height:12px;"></div>');
          }
          grid.push(`<div style="display:flex;gap:2px;">${rowCells.join('')}</div>`);
        }
        const dayLabels=['M','T','W','T','F','S','S'];
        const labelCol=dayLabels.map(d=>`<div style="width:12px;height:12px;font-size:7px;color:var(--dim);display:flex;align-items:center;justify-content:center;">${d}</div>`).join('');
        return `<div style="margin-bottom:16px;">
          <div style="font-size:8px;letter-spacing:3px;color:var(--muted);text-transform:uppercase;margin-bottom:8px;">Last ${weeks} weeks</div>
          <div style="display:flex;gap:2px;justify-content:center;">
            <div style="display:flex;flex-direction:column;gap:2px;margin-right:2px;">${labelCol}</div>
            <div style="display:flex;flex-direction:column;gap:2px;">${grid.join('')}</div>
          </div>
        </div>`;
      })();
      tabContent=histSearch+`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">${filterBtns}</div>`+calHeatMap+(filtered.length?cards:`<div style="color:var(--dim);font-size:13px;">No ${histFilter} workouts yet.</div>`);
    }
  } else {
    // PROGRESS tab — search + top 5 + grouped by split
    const loggedEx=new Set(state.workouts.flatMap(w=>w.exercises.map(e=>e.name)));
    if(!loggedEx.size){
      tabContent=`<div style="color:var(--dim);font-size:13px;padding:20px 0;">Log some workouts first.</div>`;
    } else {
      const exFreqMap={};
      state.workouts.forEach(w=>w.exercises.forEach(e=>{ exFreqMap[e.name]=(exFreqMap[e.name]||0)+1; }));
      const top5=[...loggedEx].sort((a,b)=>(exFreqMap[b]||0)-(exFreqMap[a]||0)).slice(0,5);

      const exCard=(ex)=>{
        const logs=state.workouts.flatMap(w=>w.exercises.filter(e=>e.name===ex));
        const allW=logs.flatMap(e=>e.sets.filter(s=>!s.bw).map(s=>parseFloat(s.weight)||0));
        const best1rm=logs.flatMap(e=>e.sets.filter(s=>!s.bw)).reduce((m,s)=>Math.max(m,est1RM(s.weight,s.reps)),0);
        const sessions=logs.length;
        return `<div style="display:flex;align-items:center;padding:11px 0;border-bottom:1px solid var(--border);cursor:pointer;" onclick="progressEx=${esc(ex)};render()">
          <div style="flex:1;">
            <div style="font-size:13px;color:var(--text);">${ex}</div>
            <div style="font-size:10px;color:var(--dim);margin-top:2px;">${sessions} session${sessions!==1?"s":""}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:12px;color:var(--accent);font-weight:600;">${best1rm>0?best1rm+"lb est.":"BW"}</div>
            <div style="font-size:9px;color:var(--dim);margin-top:1px;">${best1rm>0?"1RM":"bodyweight"}</div>
          </div>
          <span style="color:var(--dim);font-size:13px;margin-left:10px;">›</span>
        </div>`;
      };

      // Search bar
      const searchBar=`<div style="position:relative;margin-bottom:14px;">
        <input id="prog-search" class="input" placeholder="Search exercises... (try: Bench Press, Squat)" value="${progressSearch||""}"
          oninput="progressSearch=this.value;render()" style="font-size:13px;padding:11px 14px;"/>
        ${progressSearch?`<button onclick="progressSearch='';render()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--dim);font-size:16px;cursor:pointer;padding:4px;">✕</button>`:''}
      </div>`;

      let filteredContent='';
      if(progressSearch&&progressSearch.trim()){
        const q=progressSearch.toLowerCase();
        const matches=[...loggedEx].filter(ex=>ex.toLowerCase().includes(q));
        filteredContent=matches.length
          ?`<div class="card" style="padding:0 18px;">${matches.map(exCard).join("")}</div>`
          :`<div style="color:var(--dim);font-size:13px;padding:16px 0;">No exercises match "${progressSearch}"</div>`;
      } else {
        // Top 5 + full split groups
        const groups=getActiveSplits().map(split=>({
          split,exercises:(ALL_SPLITS[split]||[]).filter(ex=>loggedEx.has(ex))
        })).filter(g=>g.exercises.length>0);
        const programEx=new Set(getActiveSplits().flatMap(s=>ALL_SPLITS[s]||[]));
        const otherEx=[...loggedEx].filter(ex=>!programEx.has(ex));
        if(otherEx.length) groups.push({split:"Other",exercises:otherEx});
        const top5Section=`<div style="font-size:8px;letter-spacing:3px;color:var(--muted);margin-bottom:8px;text-transform:uppercase;border-bottom:1px solid #1e1e24;padding-bottom:8px;">Most Trained</div>
          <div class="card" style="padding:0 18px;margin-bottom:8px;">${top5.map(exCard).join("")}</div>`;
        const allSection=groups.map(g=>`
          <div style="font-size:8px;letter-spacing:2px;color:var(--muted);margin:16px 0 6px;text-transform:uppercase;">${splitName(g.split)}</div>
          <div class="card" style="padding:0 18px;">${g.exercises.map(exCard).join("")}</div>
        `).join("");
        filteredContent=top5Section+allSection;
      }
      tabContent=searchBar+filteredContent;
    }
  }
  // Templates
  const tmplList = (state.templates||[]);
  const templatesSection = tmplList.length ? `
    <div style="font-size:8px;letter-spacing:3px;color:var(--muted);text-transform:uppercase;margin:20px 0 10px;border-bottom:1px solid #1e1e24;padding-bottom:8px;">Saved Templates</div>
    ${tmplList.map(t=>`
      <div style="display:flex;align-items:center;gap:10px;padding:12px 0;border-bottom:1px solid var(--border);">
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.name}</div>
          <div style="font-size:10px;color:var(--dim);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.exercises.map(e=>e.name).join(' · ')}</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button onclick="loadTemplate('${t.id}')" style="background:var(--accentFaint);border:1px solid var(--accent);border-radius:8px;color:var(--accent);font-family:inherit;font-size:10px;padding:5px 10px;cursor:pointer;letter-spacing:0.5px;">LOAD</button>
          <button onclick="renameTemplate('${t.id}')" style="background:var(--bg3);border:1px solid var(--border2);border-radius:8px;color:var(--muted);font-family:inherit;font-size:10px;padding:5px 8px;cursor:pointer;">✎</button>
          <button onclick="deleteTemplate('${t.id}')" style="background:none;border:1px solid transparent;border-radius:8px;color:var(--dim);font-family:inherit;font-size:14px;padding:4px 8px;cursor:pointer;line-height:1;">✕</button>
        </div>
      </div>`).join('')}
  ` : '';

  return `<div style="font-family:'Bebas Neue',sans-serif;font-size:36px;letter-spacing:1px;margin-bottom:2px;">Me</div><div style="font-size:10px;color:var(--muted);letter-spacing:2px;margin-bottom:16px;text-transform:uppercase;">Progress & History</div>
  ${statsStrip}
  ${bodyHeatmap}
  ${fatigue}
  ${renderVolumeWave()}
  ${renderTopExercises()}
  ${yearGrid}
  <div style="display:flex;border-bottom:1px solid var(--border);margin-bottom:16px;margin-top:16px;">${tabBtns}</div>
  ${tabContent}
  ${templatesSection}`;
}


function renderHistDetail(){
  const w=historyDetail;
  const wIdx=state.workouts.indexOf(w);
  const edit=histEditMode;

  const exCards=w.exercises.map(e=>{
    const rows=e.sets.map((s,i)=>{
      if(edit){
        return `<div class="set-row" style="gap:6px;">
          <span style="font-size:11px;color:var(--dim);flex-shrink:0;">Set ${i+1}</span>
          ${s.bw
            ?`<span style="font-size:12px;color:var(--muted);flex:1;">BW</span>`
            :`<input type="number" id="hw-${wIdx}-${sid(e.name)}-${i}" value="${s.weight}" inputmode="decimal"
               style="width:64px;background:var(--bg3);border:1px solid var(--border2);border-radius:6px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:12px;padding:4px 6px;text-align:center;"
               onblur="histSaveSet(${wIdx},${esc(e.name)},${i},this.value,document.getElementById('hr-${wIdx}-${sid(e.name)}-${i}').value)"/>`
          }
          <span style="font-size:12px;color:var(--dim)">×</span>
          <input type="number" id="hr-${wIdx}-${sid(e.name)}-${i}" value="${s.reps}" inputmode="numeric"
             style="width:52px;background:var(--bg3);border:1px solid var(--border2);border-radius:6px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:12px;padding:4px 6px;text-align:center;"
             onblur="histSaveSet(${wIdx},${esc(e.name)},${i},${s.bw?`'bw'`:`document.getElementById('hw-${wIdx}-${sid(e.name)}-${i}').value`},this.value)"/>
          <button onclick="histDeleteSet(${wIdx},${esc(e.name)},${i})"
            style="margin-left:auto;background:none;border:1px solid var(--border2);border-radius:6px;padding:3px 8px;color:var(--danger);font-size:10px;cursor:pointer;font-family:'DM Sans',sans-serif;">✕</button>
        </div>`;
      }
      const histDropRows=s.drops?s.drops.map(d=>`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 12px 4px 28px;font-size:11px;color:var(--dim);">
          <span>↳ ${d.weight}lb × ${d.reps}</span>
        </div>`).join(''):'';
      return `<div class="set-row">
        <span style="display:flex;align-items:center;gap:6px;">
          ${s.warmup?`<span style="font-size:9px;background:rgba(100,160,255,0.15);border:1px solid rgba(100,160,255,0.3);border-radius:4px;padding:1px 5px;color:#7aacff;font-weight:700;">W</span>`:""}
          ${s.pr?`<span class="pr-ticket">PR</span>`:""}
          ${s.drops?`<span style="font-size:9px;background:rgba(232,213,160,0.15);border:1px solid rgba(232,213,160,0.3);border-radius:4px;padding:1px 5px;color:var(--accent);font-weight:700;">DROP</span>`:""}
          Set ${i+1}: ${s.bw?"BW":s.weight+"lb"} × ${s.reps}
        </span>
        ${!s.bw&&!s.warmup?`<span class="set-vol">${(parseFloat(s.weight)*parseInt(s.reps)).toLocaleString()}lb</span>`:""}
      </div>${histDropRows}`;
    }).join("");

    return `<div class="card${e.superset?" ss-card":""}">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
        <span style="font-size:13px;color:var(--text);flex:1;">${e.name}</span>
        ${e.superset?`<span class="tag sstag">⚡SS</span>`:""}
        ${e.bwMode?`<span style="font-size:10px;color:var(--green)">BW</span>`:""}
        ${edit?`<button onclick="histDeleteExercise(${wIdx},${esc(e.name)})"
          style="background:none;border:1px solid var(--border2);border-radius:6px;padding:3px 8px;color:var(--danger);font-family:inherit;font-size:10px;cursor:pointer;">REMOVE</button>`:""}
      </div>
      ${rows}
      ${edit?`<button onclick="histAddSet(${wIdx},${esc(e.name)})"
        style="width:100%;margin-top:8px;background:none;border:1px dashed var(--border2);border-radius:6px;padding:6px;color:var(--dim);font-family:inherit;font-size:11px;cursor:pointer;letter-spacing:1px;">+ ADD SET</button>`:""}
      ${e.notes&&!edit?`<div style="font-size:11px;color:var(--dim);margin-top:6px;font-style:italic;">${e.notes}</div>`:""}
      ${vol(e.sets)>0?`<div style="border-top:1px solid var(--border);margin-top:8px;padding-top:8px;font-size:12px;color:var(--accent);">${vol(e.sets).toLocaleString()} lb</div>`:""}
    </div>`;
  }).join("");

  const prCount=w.exercises.reduce((a,e)=>a+e.sets.filter(s=>s.pr).length,0);
  const setCount=w.exercises.reduce((a,e)=>a+e.sets.length,0);

  const sessionNotes=edit
    ?`<div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:12px;padding:12px 14px;margin-bottom:14px;"><div style="font-size:8px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;margin-bottom:6px;">Session Notes</div><textarea id="hist-notes-${wIdx}" rows="3" placeholder="Add notes…" style="width:100%;background:var(--bg3);border:1px solid var(--border2);border-radius:8px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:12px;padding:8px;resize:vertical;box-sizing:border-box;line-height:1.5;" onblur="histSaveNotes(${wIdx},this.value)">${w.notes||''}</textarea></div>`
    :w.notes?`<div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:12px;padding:12px 14px;margin-bottom:14px;"><div style="font-size:8px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;margin-bottom:6px;">Session Notes</div><div style="font-size:12px;color:var(--muted);line-height:1.5;">${w.notes}</div></div>`:'';
  const saunaCard=w.sauna?`<div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:12px;padding:12px 14px;margin-bottom:14px;"><div style="font-size:8px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;margin-bottom:6px;">🧖 Sauna</div><div style="font-size:14px;color:var(--text);">${w.sauna.minutes} min${w.sauna.tempF?' @ '+w.sauna.tempF+'°F':''}</div></div>`:'';
  return `
    <div style="display:flex;justify-content:space-between;margin-bottom:16px;align-items:center;flex-wrap:wrap;gap:8px;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:32px;letter-spacing:1px;line-height:1;${edit?'cursor:pointer;':''}" ${edit?`onclick="histEditSplit(${wIdx})"`:''}>${splitName(w.split)}${edit?' ✎':''}</div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:10px;color:var(--dim);${edit?'cursor:pointer;text-decoration:underline dotted;':''}" ${edit?`onclick="histEditDate(${wIdx})"`:''}>${w.date}${edit?' ✎':''}${w.duration?` · ${fmtMs(w.duration)}`:""}</span>
        <button onclick="toggleHistEdit()"
          style="background:${edit?"rgba(232,213,160,0.1)":"none"};border:1px solid ${edit?"var(--accent)":"var(--border2)"};border-radius:6px;padding:4px 10px;color:${edit?"var(--accent)":"var(--muted)"};font-family:inherit;font-size:11px;cursor:pointer;">
          ${edit?"✓ DONE":"✏️ EDIT"}
        </button>
        ${edit?`<button onclick="deleteWorkout(${wIdx})"
          style="background:none;border:1px solid var(--border2);border-radius:6px;padding:4px 10px;color:var(--danger);font-family:inherit;font-size:11px;cursor:pointer;">🗑 DELETE</button>`:""}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-bottom:16px;">
      <div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:12px;text-align:center;padding:12px 6px;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--accent);line-height:1;">${w.totalVolume>0?Math.round(w.totalVolume/1000)+"k":"—"}</div>
        <div style="font-size:7px;color:var(--muted);letter-spacing:1px;margin-top:3px;text-transform:uppercase;">LB</div>
      </div>
      <div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:12px;text-align:center;padding:12px 6px;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--accent);line-height:1;">${setCount}</div>
        <div style="font-size:7px;color:var(--muted);letter-spacing:1px;margin-top:3px;text-transform:uppercase;">Sets</div>
      </div>
      <div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:12px;text-align:center;padding:12px 6px;${edit?'cursor:pointer;':''}" ${edit?`onclick="histEditDuration(${wIdx})"`:''}>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--accent);line-height:1;">${w.duration?Math.round(w.duration/60000)+"m":"—"}</div>
        <div style="font-size:7px;color:var(--muted);letter-spacing:1px;margin-top:3px;text-transform:uppercase;">Time${edit?' ✎':''}</div>
      </div>
      <div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:12px;text-align:center;padding:12px 6px;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:${prCount>0?"#52c87a":"var(--dim)"};line-height:1;">${prCount>0?prCount:"—"}</div>
        <div style="font-size:7px;color:var(--muted);letter-spacing:1px;margin-top:3px;text-transform:uppercase;">PRs</div>
      </div>
    </div>
    ${sessionNotes}
    ${saunaCard}
    ${exCards}`;
}

function renderProgDetail(){
  const ex=progressEx;
  const sessions=state.workouts.slice().reverse().filter(w=>w.exercises.find(e=>e.name===ex));
  const bests=sessions.map(w=>Math.max(0,...w.exercises.find(e=>e.name===ex).sets.filter(s=>!s.bw).map(s=>parseFloat(s.weight)||0)));
  const maxW=Math.max(...bests,1);
  const allTimeBest=Math.max(...bests,0);
  // Best 1RM estimate across all sessions
  const best1RM=sessions.reduce((best,w)=>{
    const e=w.exercises.find(e=>e.name===ex);
    const rm=Math.max(0,...e.sets.filter(s=>!s.bw).map(s=>est1RM(s.weight,s.reps)));
    return Math.max(best,rm);
  },0);
  const totalPRs=sessions.reduce((a,w)=>a+w.exercises.find(e=>e.name===ex).sets.filter(s=>s.pr).length,0);
  const chart=buildProgChart(sessions,ex);
  const summaryCard=allTimeBest>0?`<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px;text-align:center;">
      <div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:14px;padding:14px 8px;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:26px;color:var(--accent);line-height:1;">${allTimeBest}lb</div>
        <div style="font-size:7px;color:var(--muted);letter-spacing:1px;margin-top:3px;text-transform:uppercase;">Best Set</div>
      </div>
      <div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:14px;padding:14px 8px;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:26px;color:#52c87a;line-height:1;">${best1RM}lb</div>
        <div style="font-size:7px;color:var(--muted);letter-spacing:1px;margin-top:3px;text-transform:uppercase;">Est. 1RM</div>
      </div>
      <div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:14px;padding:14px 8px;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:26px;color:var(--accent);line-height:1;">${sessions.length}</div>
        <div style="font-size:7px;color:var(--muted);letter-spacing:1px;margin-top:3px;text-transform:uppercase;">Sessions</div>
      </div>
    </div>
    ${chart?`<div style="margin-bottom:16px;">${chart}</div>`:''}  `:'' ;
    const rows=sessions.map((w,i)=>{
    const e=w.exercises.find(e=>e.name===ex);
    const b=bests[i],v=vol(e.sets),pct=Math.min(100,(b/maxW)*100);
    const setList=e.sets.map((s,si)=>`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid var(--border);">
        <span style="font-size:11px;color:var(--muted);">Set ${si+1}: ${s.bw?"BW":s.weight+"lb"} × ${s.reps}</span>
        <span style="display:flex;align-items:center;gap:5px;">
          ${s.pr?`<span class="pr-ticket">PR</span>`:""}
          ${!s.bw?`<span style="font-size:10px;color:var(--dim);">${(parseFloat(s.weight)*parseInt(s.reps)).toLocaleString()}lb</span>`:""}
        </span>
      </div>`).join("");
    return `<div class="card">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:10px;color:var(--dim)">${w.date}</span>
        <div style="display:flex;gap:8px;align-items:center;">
          ${v>0?`<span style="font-size:11px;color:var(--muted)">${v.toLocaleString()}lb</span>`:""}
          <span style="font-family:'Bebas Neue',sans-serif;font-size:16px;color:var(--accent);letter-spacing:0.5px;">${b>0?b+"lb":"BW"}</span>
        </div>
      </div>
      ${b>0?`<div class="prog-bg" style="margin-bottom:8px;"><div class="prog-fill" style="width:${pct}%"></div></div>`:""}
      ${setList}
    </div>`;
  }).join("");
  return `
    <div style="font-family:'Bebas Neue',sans-serif;font-size:42px;letter-spacing:1px;line-height:1;margin-bottom:6px;">${ex}</div>
    ${summaryCard}
    ${rows||"<div style='color:var(--dim);font-size:13px;'>No data yet.</div>"}`;
}

// Tests, debug panel, logo handlers — moved to js/tests.js
// (see js/tests.js for all unit tests, debug panel, and logo handlers)

/*— REMOVED: ~380 lines of tests, debug, logo handlers —*/

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════

// ── Crash Recovery Check ──
function recoverWorkout(recovered){
  // Find the last set timestamp to cap idle time
  let lastSetTime=recovered.startTime;
  for(const ex of (recovered.exercises||[])){
    for(const s of (ex.sets||[])){
      if(s.time&&s.time>lastSetTime) lastSetTime=s.time;
    }
  }
  const idleMs=Date.now()-lastSetTime;
  const MAX_IDLE=15*60*1000; // 15 minutes — anything beyond this is "app was closed"
  if(idleMs>MAX_IDLE){
    // Shift startTime forward so elapsed time = (lastSetTime - original startTime) + 15min buffer
    const activeTime=lastSetTime-recovered.startTime+MAX_IDLE;
    recovered.startTime=Date.now()-activeTime;
  }
  activeWorkout=recovered;
  screen='log';
  document.getElementById('recovery-banner').remove();
  localStorage.removeItem('gainz_recovery');
  startWoTimer();
  render();
}
(function checkCrashRecovery(){
  try{
    const rec=localStorage.getItem("gainz_recovery");
    if(rec&&!activeWorkout){
      const recovered=JSON.parse(rec);
      // Store for recoverWorkout to use
      window._pendingRecovery=recovered;
      const lastSetTime=recovered.exercises?.reduce((t,ex)=>Math.max(t,...(ex.sets||[]).map(s=>s.time||0)),recovered.startTime)||recovered.startTime;
      const idleMin=Math.round((Date.now()-lastSetTime)/60000);
      const idleLabel=idleMin>60?Math.round(idleMin/60)+'h ago':idleMin+'m ago';
      const banner=document.createElement("div");
      banner.id="recovery-banner";
      banner.style.cssText="position:fixed;top:0;left:0;right:0;background:#1e1815;border-bottom:1px solid var(--accent);padding:calc(14px + env(safe-area-inset-top)) 16px 14px;z-index:9998;display:flex;align-items:center;justify-content:space-between;font-size:12px;font-family:'DM Sans',sans-serif;color:var(--text);";
      banner.innerHTML=`<span style="color:var(--accent);">⚠ Recover workout? <span style="color:var(--dim);font-size:10px;">(last set ${idleLabel})</span></span><div style="display:flex;gap:8px;"><button onclick="recoverWorkout(window._pendingRecovery)" style="background:var(--accent);color:#0a0a0a;border:none;border-radius:6px;padding:5px 10px;font-size:11px;font-weight:600;cursor:pointer;">YES</button><button onclick="localStorage.removeItem('gainz_recovery');document.getElementById('recovery-banner').remove();" style="background:transparent;color:var(--muted);border:1px solid var(--border2);border-radius:6px;padding:5px 10px;font-size:11px;cursor:pointer;">DISCARD</button></div>`;
      document.body.appendChild(banner);
      logDebug("⚠ Crash recovery available (last set "+idleLabel+")");
    }
  }catch(e){}
})();



// ?reset in URL clears onboarding flags every load (just refresh to re-test)
if(location.search.includes('reset')){
  localStorage.removeItem('gainz_seen_onboard');
  localStorage.removeItem('gainz_onboard_views');
  localStorage.removeItem('gainz_seen_coach');
  localStorage.removeItem('gainz_seen_home_tour');
}
checkOnline();
runTests();
initTestsAndDebug();
render();
// Cinematic shows first, then chains into onboarding carousel
if (!maybeShowCinematic()) {
  maybeShowSplash();
}
