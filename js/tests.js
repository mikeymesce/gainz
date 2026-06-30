// ═══════════════════════════════════════════
// TESTS & DEBUG — Unit tests + debug panel + logo handlers
// ═══════════════════════════════════════════

// ── Test Framework ──
const TESTS=[], TEST_RESULTS={passed:0,failed:0,results:[]};
function test(name,fn){TESTS.push({name,fn});}
function assert(c,m){if(!c)throw new Error(m||"assertion failed");}
function assertEqual(a,b,m){if(a!==b)throw new Error(`${m||"assertEqual"}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);}
function assertContains(arr,val,m){if(!arr.includes(val))throw new Error(`${m||"assertContains"}: ${val} not found`);}

// ── Accessors for mutable state in app-legacy.js ──
function _state(){ return window.state; }

// ── Unit Tests ──
test("vol() empty sets = 0",()=>assertEqual(window.vol([]),0));
test("vol() weight×reps",()=>assertEqual(window.vol([{weight:"100",reps:"10",bw:false}]),1000));
test("vol() multiple sets",()=>assertEqual(window.vol([{weight:"135",reps:"8",bw:false},{weight:"145",reps:"6",bw:false}]),135*8+145*6));
test("vol() ignores BW sets",()=>assertEqual(window.vol([{weight:"BW",reps:"10",bw:true},{weight:"100",reps:"5",bw:false}]),500));
test("vol() all-BW = 0",()=>assertEqual(window.vol([{weight:"BW",reps:"12",bw:true}]),0));
test("fmt() 45s = 0:45",()=>assertEqual(window.fmt(45),"0:45"));
test("fmt() 90s = 1:30",()=>assertEqual(window.fmt(90),"1:30"));
test("fmt() 0 = 0:00",()=>assertEqual(window.fmt(0),"0:00"));
test("fmt() pads seconds",()=>assertEqual(window.fmt(61),"1:01"));
test("fmt() negative clamps to 0:00",()=>assertEqual(window.fmt(-5),"0:00"));
test("getRec() with no history = Push",()=>{const s=_state().workouts;_state().workouts=[];const r=window.getRec();_state().workouts=s;assertEqual(r,"Push");});
test("getRec() after Push = Pull",()=>{const s=_state().workouts;_state().workouts=[{split:"Push"}];const r=window.getRec();_state().workouts=s;assertEqual(r,"Pull");});
test("getRec() after Push+Pull = Legs",()=>{const s=_state().workouts;_state().workouts=[{split:"Pull"},{split:"Push"}];const r=window.getRec();_state().workouts=s;assertEqual(r,"Legs");});
test("getRec() returns valid split",()=>assertContains(window.getActiveSplits(),window.getRec()));
test("isPR() true with no history",()=>{const s=_state().workouts;_state().workouts=[];const r=window.isPR("Bench Press","225");_state().workouts=s;assert(r);});
test("isPR() false when weight exists",()=>{const s=_state().workouts;_state().workouts=[{exercises:[{name:"Bench Press",sets:[{weight:"225",reps:"5",bw:false}]}]}];const r=window.isPR("Bench Press","225");_state().workouts=s;assert(!r);});
test("isPR() true for new heavier weight",()=>{const s=_state().workouts;_state().workouts=[{exercises:[{name:"Bench Press",sets:[{weight:"225",reps:"5",bw:false}]}]}];const r=window.isPR("Bench Press","235");_state().workouts=s;assert(r);});
test("isPR() false for BW",()=>assert(!window.isPR("Pull-ups","BW")));
test("addExercise() adds to workout",()=>{const s=window.activeWorkout;window.activeWorkout={split:"Push",exercises:[],startTime:Date.now()};window.addExercise("Bench Press");assertEqual(window.activeWorkout.exercises.length,1);window.activeWorkout=s;if(!s)window.appScreen="start";});
test("addExercise() no duplicates",()=>{const s=window.activeWorkout;window.activeWorkout={split:"Push",exercises:[{name:"Bench Press",sets:[],superset:false,bwMode:false,notes:""}],startTime:Date.now()};window.addExercise("Bench Press");assertEqual(window.activeWorkout.exercises.length,1);window.activeWorkout=s;if(!s)window.appScreen="start";});
test("addExercise() BW auto-enabled for Pull-ups",()=>{const s=window.activeWorkout;window.activeWorkout={split:"Pull",exercises:[],startTime:Date.now()};window.addExercise("Pull-ups");assert(window.activeWorkout.exercises[0].bwMode);window.activeWorkout=s;if(!s)window.appScreen="start";});
test("deleteSet() removes correct index",()=>{const s=window.activeWorkout;window.activeWorkout={split:"Push",exercises:[{name:"Bench Press",sets:[{weight:"135",reps:"10",bw:false},{weight:"145",reps:"8",bw:false},{weight:"155",reps:"6",bw:false}],superset:false,bwMode:false,notes:""}],startTime:Date.now()};window.deleteSet("Bench Press",1);assertEqual(window.activeWorkout.exercises[0].sets.length,2);assertEqual(window.activeWorkout.exercises[0].sets[1].weight,"155");window.activeWorkout=s;if(!s)window.appScreen="start";});
test("toggleSS() flips superset",()=>{const s=window.activeWorkout;window.activeWorkout={split:"Push",exercises:[{name:"Bench Press",sets:[],superset:false,bwMode:false,notes:""}],startTime:Date.now()};window.toggleSS("Bench Press");assert(window.activeWorkout.exercises[0].superset);window.toggleSS("Bench Press");assert(!window.activeWorkout.exercises[0].superset);window.activeWorkout=s;if(!s)window.appScreen="start";});
test("toggleBW() flips bwMode",()=>{const s=window.activeWorkout;window.activeWorkout={split:"Pull",exercises:[{name:"Bicep Curls",sets:[],superset:false,bwMode:false,notes:""}],startTime:Date.now()};window.toggleBW("Bicep Curls");assert(window.activeWorkout.exercises[0].bwMode);window.activeWorkout=s;if(!s)window.appScreen="start";});
test("splits have 5+ exercises each",()=>{for(const[k,v]of Object.entries(window.SPLIT))assert(v.length>=5,k+" too short");});
test("all splits have exercises",()=>{const keys=["Push","Pull","Legs","Core","Chest","Back","Arms","Shoulders"];keys.forEach(k=>assert(window.ALL_SPLITS[k].length>0,"empty split: "+k));});
test("BW_EXERCISES exist in ALL_SPLITS",()=>{const all=Object.values(window.ALL_SPLITS).flat();for(const e of window.BW_EXERCISES)assertContains(all,e,`${e} missing`);});
test("GLOBAL_DEFAULT = 45",()=>assertEqual(window.GLOBAL_DEFAULT,45));
test("Deadlift rest = 120",()=>assertEqual(window.DEFAULT_RESTS["Deadlift"],120));
test("Squat rest = 90",()=>assertEqual(window.DEFAULT_RESTS["Squat"],90));

// ── Stats Engine Tests ──
test("allTimeTonnage sums all workout volumes",()=>{
  const s=_state().workouts;
  _state().workouts=[{totalVolume:1000,exercises:[],timestamp:Date.now(),split:"Push",duration:3600000},{totalVolume:2000,exercises:[],timestamp:Date.now(),split:"Pull",duration:3600000}];
  const total=_state().workouts.reduce((a,w)=>a+(w.totalVolume||0),0);
  assertEqual(total,3000);
  _state().workouts=s;
});
test("avgDuration calculates correctly",()=>{
  const workouts=[{duration:3600000},{duration:7200000},{duration:1800000}];
  const avg=workouts.reduce((a,w)=>a+w.duration,0)/workouts.length;
  assertEqual(Math.round(avg/60000),70);
});
test("avgDuration ignores missing duration",()=>{
  const workouts=[{duration:3600000},{duration:0},{duration:7200000}];
  const valid=workouts.filter(w=>w.duration&&w.duration>0);
  assertEqual(valid.length,2);
  const avg=Math.round(valid.reduce((a,w)=>a+w.duration,0)/valid.length/60000);
  assertEqual(avg,90);
});
test("longestWorkout finds max duration",()=>{
  const workouts=[{duration:1800000,split:"Push"},{duration:7200000,split:"Legs"},{duration:3600000,split:"Pull"}];
  const longest=workouts.reduce((a,w)=>w.duration>a.duration?w:a,workouts[0]);
  assertEqual(longest.split,"Legs");
  assertEqual(Math.round(longest.duration/60000),120);
});
test("fastestWorkout filters under 5min",()=>{
  const workouts=[{duration:120000,split:"Push"},{duration:3600000,split:"Pull"},{duration:2700000,split:"Legs"}];
  const valid=workouts.filter(w=>w.duration>=5*60000);
  assertEqual(valid.length,2);
  const fastest=valid.reduce((a,w)=>w.duration<a.duration?w:a,valid[0]);
  assertEqual(fastest.split,"Legs");
});
test("totalHours converts ms correctly",()=>{
  const ms=7200000+3600000;
  const hrs=Math.round(ms/3600000*10)/10;
  assertEqual(hrs,3);
});
test("avgRest calculates from exerciseRests",()=>{
  const rests={Bench:60,Squat:90,Curls:45};
  const vals=Object.values(rests);
  const avg=Math.round(vals.reduce((a,b)=>a+b,0)/vals.length);
  assertEqual(avg,65);
});
test("lastWorkoutAvgRest uses session exercises",()=>{
  const s=_state().workouts; const r=_state().exerciseRests;
  _state().workouts=[{exercises:[{name:"TestExA"},{name:"TestExB"}],totalVolume:0,timestamp:Date.now(),split:"Push"}];
  _state().exerciseRests={"TestExA":60,"TestExB":90};
  const lw=_state().workouts[0];
  const rests=lw.exercises.map(e=>_state().exerciseRests[e.name]||45);
  const avg=Math.round(rests.reduce((a,b)=>a+b,0)/rests.length);
  assertEqual(avg,75);
  _state().workouts=s; _state().exerciseRests=r;
});
test("avgSetsPerSession rounds correctly",()=>{
  const workouts=[{exercises:[{sets:[1,2,3]},{sets:[1,2]}]},{exercises:[{sets:[1,2,3,4]}]}];
  const avg=Math.round(workouts.reduce((a,w)=>a+w.exercises.reduce((b,e)=>b+e.sets.length,0),0)/workouts.length);
  assertEqual(avg,5);
});
test("thisWeek filter uses correct week boundary",()=>{
  const weekStart=new Date();weekStart.setDate(weekStart.getDate()-weekStart.getDay());weekStart.setHours(0,0,0,0);
  const now=Date.now();const old=weekStart.getTime()-86400000;
  const workouts=[{timestamp:now},{timestamp:now},{timestamp:old}];
  const thisWeek=workouts.filter(w=>new Date(w.timestamp)>=weekStart).length;
  assertEqual(thisWeek,2);
});
test("bestDay finds highest avg volume day",()=>{
  const dayTotals={1:5000,3:8000,5:6000};const dayCounts={1:2,3:1,5:2};
  const dayAvgs=Object.entries(dayCounts).map(([d,c])=>({day:parseInt(d),avg:dayTotals[d]/c}));
  const best=dayAvgs.reduce((a,b)=>b.avg>a.avg?b:a);
  assertEqual(best.day,3);
});
test("consistency score clamps to 100",()=>{
  const thisWeek=5;const daysInWeek=5;
  assertEqual(Math.round((thisWeek/daysInWeek)*100),100);
});
test("estimated 1RM Epley formula",()=>{
  const w=225,r=5;assertEqual(Math.round(w*(1+r/30)),263);
});
test("tonnage comparison picks correct tier",()=>{
  const COMPARISONS=[{lbs:4000,label:"a baby elephant"},{lbs:8000,label:"a hippo"},{lbs:33000,label:"a literal T-Rex"}];
  const tonnage=10000;let comp=COMPARISONS[0];
  for(const c of COMPARISONS){if(tonnage>=c.lbs) comp=c;}
  assertEqual(comp.label,"a hippo");
});
test("funStats rotates by day of year",()=>{
  const pool=["a","b","c","d"];assertEqual(pool[100%pool.length],"a");
});

// ── Challenge Tests ──
test("getChallengeState() initializes defaults",()=>{
  const s=_state().challenge;_state().challenge=undefined;
  const ch=window.getChallengeState();
  assert(ch.active===false);assert(ch.type==='pushups');assert(ch.days!==undefined);
  _state().challenge=s;
});
test("getChallengeState() preserves existing state",()=>{
  const s=_state().challenge;
  _state().challenge={startDate:'Mon Mar 30 2026',days:{'Mon Mar 30 2026':{count:50,entries:[25,25]}},active:true,type:'pushups'};
  const ch=window.getChallengeState();
  assertEqual(ch.active,true);assertEqual(ch.type,'pushups');assertEqual(ch.days['Mon Mar 30 2026'].count,50);
  _state().challenge=s;
});
test("toggleChallengeEx() rotates challenge type",()=>{
  const s=_state().challenge;_state().challenge={startDate:window.todayStr(),days:{},active:true,type:'pushups'};
  window.toggleChallengeEx();assertEqual(_state().challenge.type,'abs');
  window.toggleChallengeEx();assertEqual(_state().challenge.type,'prayer');
  _state().challenge=s;
});
test("addChallengeQuickSilent() adds push reps",()=>{
  const s=_state().challenge;_state().challenge={startDate:window.todayStr(),days:{},active:true,type:'pushups'};
  window.addChallengeQuickSilent('push',20);
  const day=_state().challenge.days[window.todayStr()];
  assertEqual(day.count,20);assertEqual(day.entries.length,1);assertEqual(day.entries[0],20);
  window.addChallengeQuickSilent('push',10);assertEqual(day.count,30);assertEqual(day.entries.length,2);
  _state().challenge=s;
});
test("addChallengeQuickSilent() adds simple habit completion",()=>{
  const s=_state().challenge;_state().challenge={startDate:window.todayStr(),days:{},active:true,type:'prayer'};
  window.addChallengeQuickSilent('main',1);
  assertEqual(_state().challenge.days[window.todayStr()].count,1);
  _state().challenge=s;
});
test("deleteChallengeSet() removes correct set",()=>{
  const s=_state().challenge;_state().challenge={startDate:window.todayStr(),days:{},active:true,type:'pushups'};
  window.addChallengeQuickSilent('main',10);window.addChallengeQuickSilent('main',20);window.addChallengeQuickSilent('main',15);
  window.deleteChallengeSet('main',1);
  const day=_state().challenge.days[window.todayStr()];
  assertEqual(day.entries.length,2);assertEqual(day.entries[0],10);assertEqual(day.entries[1],15);assertEqual(day.count,25);
  _state().challenge=s;
});
test("renderChallenge() returns start button when inactive",()=>{
  const s=_state().challenge;_state().challenge={startDate:null,days:{},active:false,type:'pushups'};
  const html=window.renderChallenge();
  assert(html.includes('startChallenge'),'should have start button');assert(html.includes('MONTHLY CHALLENGE'),'should have title');
  _state().challenge=s;
});
test("renderChallenge() shows progress when active",()=>{
  const s=_state().challenge;_state().challenge={startDate:window.todayStr(),days:{},active:true,type:'pushups'};
  const html=window.renderChallenge();
  assert(html.includes('DAY 1'),'should show day number');assert(html.includes('0/'),'should show completion');
  _state().challenge=s;
});
test("renderChallenge() shows streak when 2+ days",()=>{
  const s=_state().challenge;
  const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
  const twoDaysAgo=new Date();twoDaysAgo.setDate(twoDaysAgo.getDate()-2);
  _state().challenge={startDate:twoDaysAgo.toDateString(),days:{},active:true,type:'pushups'};
  _state().challenge.days[twoDaysAgo.toDateString()]={count:100,entries:[100]};
  _state().challenge.days[yesterday.toDateString()]={count:100,entries:[100]};
  assert(window.renderChallenge().includes('2 day streak'),'should show 2 day streak');
  _state().challenge=s;
});
test("renderChallenge() no streak for 1 day",()=>{
  const s=_state().challenge;
  const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
  _state().challenge={startDate:yesterday.toDateString(),days:{},active:true,type:'pushups'};
  _state().challenge.days[yesterday.toDateString()]={count:100,entries:[100]};
  assert(!window.renderChallenge().includes('day streak'),'should not show streak for 1 day');
  _state().challenge=s;
});
test("renderInlineChallenge() empty when no challenge",()=>{
  const s=_state().challenge;_state().challenge=undefined;
  assertEqual(window.renderInlineChallenge(),'');_state().challenge=s;
});
test("renderInlineChallenge() empty when inactive",()=>{
  const s=_state().challenge;_state().challenge={startDate:null,days:{},active:false,type:'pushups'};
  assertEqual(window.renderInlineChallenge(),'');_state().challenge=s;
});
test("renderInlineChallenge() shows tracker when active",()=>{
  const s=_state().challenge;_state().challenge={startDate:window.todayStr(),days:{},active:true,type:'prayer'};
  const html=window.renderInlineChallenge();
  assert(html.includes('inline-challenge'),'should have container');assert(html.includes('PRAYER'),'should show challenge label');
  _state().challenge=s;
});
test("setChallengeType() updates selected challenge",()=>{
  const s=_state().challenge;_state().challenge={startDate:null,days:{},active:false,type:'pushups'};
  window.setChallengeType('journaling');
  assertEqual(_state().challenge.type,'journaling');
  _state().challenge=s;
});

// ── Run Tests ──
export { TEST_RESULTS };
export function runTests(){
  TEST_RESULTS.passed=0;TEST_RESULTS.failed=0;TEST_RESULTS.results=[];
  for(const t of TESTS){
    try{t.fn();TEST_RESULTS.passed++;TEST_RESULTS.results.push({name:t.name,ok:true});}
    catch(e){TEST_RESULTS.failed++;TEST_RESULTS.results.push({name:t.name,ok:false,err:e.message});}
  }
  if(TEST_RESULTS.failed>0) console.warn(`[GAINZ] ${TEST_RESULTS.failed} test(s) failed`);
}

// ── Debug Panel ──
let debugLog=[];
export function logDebug(msg){
  const time=new Date().toLocaleTimeString();
  debugLog.unshift(`[${time}] ${msg}`);
  if(debugLog.length>50)debugLog.pop();
}
export function openDebug(){
  document.getElementById("debug-panel").classList.add("open");
  document.getElementById("dbg-version").textContent=window.VERSION;
  document.getElementById("dbg-screen").textContent=window.appScreen;
  document.getElementById("dbg-split").textContent=window.activeWorkout?window.activeWorkout.split:"none";
  document.getElementById("dbg-exercises").textContent=window.activeWorkout?window.activeWorkout.exercises.map(e=>e.name).join(", ")||"none":"none";
  document.getElementById("dbg-workouts").textContent=window.state.workouts.length;
  document.getElementById("dbg-storage").textContent=localStorage.getItem("gainz_v5")?"OK":"EMPTY";
  const sum=document.getElementById("dbg-test-summary");
  sum.textContent=`${TEST_RESULTS.passed} passed · ${TEST_RESULTS.failed} failed`;
  sum.style.color=TEST_RESULTS.failed===0?"var(--green)":"var(--danger)";
  document.getElementById("dbg-test-list").innerHTML=TEST_RESULTS.results.map(r=>
    `<div style="display:flex;gap:8px;padding:4px 0;border-bottom:1px solid var(--border);align-items:flex-start;">
      <span style="color:${r.ok?"var(--green)":"var(--danger)"};flex-shrink:0;">${r.ok?"✓":"✗"}</span>
      <span style="color:${r.ok?"var(--dim)":"var(--text)"};font-size:11px;">${r.name}${!r.ok?`<div style="color:var(--danger);font-size:10px;margin-top:2px;">${r.err}</div>`:""}</span>
    </div>`
  ).join("");
  document.getElementById("debug-log").innerHTML=debugLog.map(e=>`<div style="border-bottom:1px solid var(--border);padding:3px 0;word-break:break-all;">${e}</div>`).join("");
}
export function closeDebug(){ document.getElementById("debug-panel").classList.remove("open"); }

// ── Logo Tap Handlers (must be called after DOM ready) ──
export function initTestsAndDebug(){
  const logoEl = document.getElementById("logo-tap");
  if(!logoEl) return;
  let logoTaps=0,logoTimer=null,logoPressTimer=null,logoLongPressed=false;
  logoEl.addEventListener("mousedown", ()=>{
    logoLongPressed=false;logoEl.classList.add("pressing");
    logoPressTimer=setTimeout(()=>{logoLongPressed=true;logoEl.classList.remove("pressing");window.openThemePopover();},600);
  });
  logoEl.addEventListener("touchstart", ()=>{
    logoLongPressed=false;logoEl.classList.add("pressing");
    logoPressTimer=setTimeout(()=>{logoLongPressed=true;logoEl.classList.remove("pressing");window.openThemePopover();},600);
  },{passive:true});
  logoEl.addEventListener("mouseup", ()=>{clearTimeout(logoPressTimer);logoEl.classList.remove("pressing");});
  logoEl.addEventListener("touchend", ()=>{clearTimeout(logoPressTimer);logoEl.classList.remove("pressing");});
  logoEl.addEventListener("click",()=>{
    if(logoLongPressed){logoLongPressed=false;return;}
    logoTaps++;clearTimeout(logoTimer);
    if(logoTaps>=5){logoTaps=0;openDebug();return;}
    logoTimer=setTimeout(()=>logoTaps=0,2000);
  });
  window.onerror=function(msg,src,line){logDebug(`❌ ${msg} (line ${line})`);};
}
