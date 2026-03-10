// ═══════════════════════════════════════════
// IMPORT — Workout log import system (paste → clarify → preview → done)
// ═══════════════════════════════════════════
// Reads from window: state, saveImmediate, haptic, showToast,
//                    SPLIT_COLORS, navigateTo

// ═══════════════════════════════════════════
// IMPORT MODAL  (paste → clarify → preview → done)
// ═══════════════════════════════════════════
let importApiKey        = '';   // set on first parse attempt
let importParsed        = [];   // workouts array after parse
let importClarifications= [];   // [{id,type,question,options,term?,affects_exercises?,affects_workouts?}]
let importAnswers       = {};   // id → chosen option string
let importSelected      = new Set();
let importAddedCount    = 0;
let importStep          = 'paste'; // paste | clarify | preview | done

export function openImportModal(){
  importParsed=[]; importClarifications=[]; importAnswers={};
  importSelected=new Set(); importAddedCount=0; importStep='paste';
  document.getElementById('import-modal').style.display='block';
  document.body.style.overflow='hidden';
  renderImportStep();
}
export function closeImportModal(){
  document.getElementById('import-modal').style.display='none';
  document.body.style.overflow='';
}
export function renderImportStep(){
  const body=document.getElementById('import-body');
  if(!body) return;
  if(importStep==='paste')    body.innerHTML=importPasteHTML();
  else if(importStep==='clarify'){ body.innerHTML=importClarifyHTML(); bindClarifyEvents(); }
  else if(importStep==='preview') body.innerHTML=importPreviewHTML();
  else                         body.innerHTML=importDoneHTML();
}

// ── Step 1: Paste ──────────────────────────
function importPasteHTML(){
  return `
    <div style="font-size:12px;color:var(--muted);line-height:1.7;margin-bottom:16px;">
      Paste your raw notes. Any format — dates, weights like <span style="color:var(--text);font-family:monospace;font-size:11px;">225x8x3</span>, abbreviations, messy text. AI reads it all.
    </div>
    <textarea id="import-raw" rows="13" style="width:100%;background:#09090c;border:1px solid var(--border);border-radius:12px;padding:14px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;line-height:1.6;resize:vertical;outline:none;transition:border-color .15s;" placeholder="1/12&#10;squat&#10;135x10, 225x10, 315x5x3&#10;bth 30x10x3&#10;&#10;1/14&#10;bench&#10;135x10, 185x8x3..."></textarea>
    <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;">
      <button onclick="importStartParse()" style="width:100%;padding:14px;background:var(--accent);border:none;border-radius:12px;font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:3px;color:#080808;cursor:pointer;">PARSE WORKOUTS →</button>
      <button onclick="closeImportModal()" style="width:100%;padding:12px;background:transparent;border:1px solid var(--border);border-radius:12px;font-family:'DM Sans',sans-serif;font-size:11px;letter-spacing:1.5px;color:var(--muted);cursor:pointer;">CANCEL</button>
    </div>`;
}

// ── Step 1 → Parse API call ─────────────────
export function importStartParse(){
  const raw=(document.getElementById('import-raw')||{}).value||'';
  if(!raw.trim()){ showToast('Paste some workout notes first'); return; }

  // ── Inner helpers (date, sets, split detection) ──────────────────────
  function parseDate(str){
    const m=str.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
    if(!m) return null;
    let mo=parseInt(m[1])-1, dy=parseInt(m[2]);
    let yr=m[3]?parseInt(m[3]):null;
    if(yr!==null){ if(yr<100) yr+=2000; } else { yr=new Date().getFullYear(); }
    const d=new Date(yr,mo,dy,12,0,0);
    if(isNaN(d)) return null;
    return { date:d.toDateString(), timestamp:d.getTime() };
  }
  function parseSets(line,isBW){
    const sets=[];
    const clean=line.replace(/\s*(slow|hard|heavy|easy|perfect|clean|good|bad|assisted|help|lol|drop set|last rep|warmup|w help|barely|crushed|solid|stop|bc|smh|poor|shakey|shaky|light|pause|slo|very|super|too|not|fail|felt|rpe).*$/i,'').trim();
    const tokens=clean.split(',').map(t=>t.trim()).filter(Boolean);
    for(const tok of tokens){
      const m3=tok.match(/^(\d+\.?\d*)\s*x\s*(\d+)\s*x\s*(\d+)$/i);
      if(m3){ const [,w,r,n]=m3; for(let i=0;i<parseInt(n);i++) sets.push({weight:w,reps:r,bw:false}); continue; }
      const m2=tok.match(/^(\d+\.?\d*)\s*x\s*(\d+)$/i);
      if(m2){ const [,w,r]=m2; sets.push({weight:w,reps:r,bw:false}); continue; }
      const m1=tok.match(/^(\d+)$/);
      if(m1){ sets.push({weight:'BW',reps:m1[1],bw:true}); continue; }
    }
    if(isBW) sets.forEach(s=>{ s.weight='BW'; s.bw=true; });
    return sets;
  }
  const SPLIT_KWS={
    Push:['bench','press','fly','flies','dip','push','chest','tricep','overhead','shoulder','lateral','front raise','side raise'],
    Pull:['pull','row','lat','curl','bicep','hammer','face pull','preacher','pulldown','cable row'],
    Legs:['squat','deadlift','rdl','romanian','leg press','leg curl','leg extension','lunge','hip thrust','calf','hamstring','glute','hex','trap bar','pistol','goblet'],
    Core:['plank','ab ','core','jackknife','crunch','russian','scissor','dead bug','bird dog','hanging leg','hanging raise','cable curl ab','leg raise','ab roller','windmill'],
  };
  function guessSplit(exNames){
    const joined=exNames.join(' ').toLowerCase();
    const scores={};
    for(const [sp,kws] of Object.entries(SPLIT_KWS)) scores[sp]=kws.filter(k=>joined.includes(k)).length;
    const best=Object.entries(scores).sort((a,b)=>b[1]-a[1]);
    return best[0][1]>0?best[0][0]:'Push';
  }
  const BW_EX=new Set(['pull-ups','push-ups','dips','pistol squat','hanging leg raise',
    'hanging raise','ab roller','plank','dead bug','bird dog','jackknives',
    'russian twist','scissors','pull up','push up','chin up','chin-up']);


  // ── Pure-JS parser — no network needed ──────────────────────────────────

  // Abbreviation dictionary (raw input → canonical name)
  // ── AUTO_RESOLVE: only unambiguous plural/spacing variants — zero guessing ──
  const AUTO_RESOLVE = {
    'pull ups':'Pull-ups','pull-ups':'Pull-ups','pullups':'Pull-ups','pull up':'Pull-ups',
    'chin up':'Pull-ups','chin-up':'Pull-ups','chinup':'Pull-ups',
    'push ups':'Push-ups','push-ups':'Push-ups','pushups':'Push-ups','push up':'Push-ups',
    'squats':'Squat','barbell squat':'Squat',
    'deadlifts':'Deadlift','dead lift':'Deadlift',
    'lunges':'Lunges','lunge':'Lunges',
    'dips':'Dips','dip':'Dips',
    'plank':'Plank','planks':'Plank',
    'crunches':'Crunches','crunch':'Crunches',
    'pull-up':'Pull-ups','push-up':'Push-ups',
    'pistol squats':'Pistol Squat','pistol squat':'Pistol Squat',
    'goblet squats':'Goblet Squat',
    'hip thrusts':'Hip Thrust',
    'calf raises':'Calf Raises','calf raise':'Calf Raises',
    'leg extensions':'Leg Extension','leg curls':'Leg Curl',
    'hammer curls':'Hammer Curls','hammer curl':'Hammer Curls',
    'face pulls':'Face Pulls','face pull':'Face Pulls',
    'lat pulldown':'Lat Pulldown','lat pull down':'Lat Pulldown',
    'lateral raises':'Lateral Raises','lateral raise':'Lateral Raises',
    'front raises':'Front Raises','front raise':'Front Raises',
    'side raises':'Lateral Raises','side raise':'Lateral Raises',
    'skull crushers':'Skull Crushers','skull crusher':'Skull Crushers',
    'preacher curls':'Preacher Curl','preacher curl':'Preacher Curl',
    'concentration curls':'Concentration Curl',
    'hanging leg raises':'Hanging Leg Raise','hanging leg raise':'Hanging Leg Raise',
    'hanging raises':'Hanging Leg Raise','hanging raise':'Hanging Leg Raise',
    'hanging ab raise':'Hanging Leg Raise','hanging ab':'Hanging Leg Raise',
    'hanging leg up':'Hanging Leg Raise',
    'ab roller':'Ab Roller','ab roll':'Ab Roller',
    'dead bug':'Dead Bug','bird dog':'Bird Dog',
    'jackknives':'Jackknives','jackknife':'Jackknives',
    'russian twist':'Russian Twist','russian twists':'Russian Twist',
    'scissors':'Scissors','side scissors':'Scissors',
    'kb swings':'Kettlebell Swing','kettlebell swings':'Kettlebell Swing',
    'renegade rows':'Renegade Row',
    'bulgarian split squat':'Bulgarian Split Squat','bulgarian split squats':'Bulgarian Split Squat',
    'barbell rows':'Barbell Row','barbell row':'Barbell Row',
    'cable rows':'Cable Row','cable row':'Cable Row',
    'incline dumbbell press':'Incline Dumbbell Press',
    'decline bench press':'Decline Bench Press',
    'overhead press':'Overhead Press',
    'military press':'Overhead Press',
    'bench press':'Bench Press',
    'leg press':'Leg Press',
    'leg extension':'Leg Extension',
    'leg curl':'Leg Curl',
    'hip thrust':'Hip Thrust',
    'romanian deadlift':'Romanian Deadlift',
    'trap bar deadlift':'Trap Bar Deadlift',
    'chest fly':'Chest Fly','chest flye':'Chest Fly',
    'cable crossover':'Cable Crossover',
    'bicep curls':'Bicep Curls','bicep curl':'Bicep Curls',
    'tricep pushdown':'Tricep Pushdown',
    'tricep overhead extension':'Tricep Overhead Extension',
    'arnold press':'Arnold Press',
    'farmers walk':'Farmers Walk','farmer carry':'Farmers Walk',
    'kettlebell swing':'Kettlebell Swing','kettlebell swings':'Kettlebell Swing',
    'kettlebell clean':'Kettlebell Clean',
    'kettlebell windmill':'Kettlebell Windmill',
    'dumbbell snatch':'Dumbbell Snatch',
    'dumbbell row':'Dumbbell Row',
    't-bar row':'T-Bar Row',
    'ab cable crunch':'Ab Cable Crunch',
    'preacher':'Preacher Curl',
    'incline bench press':'Incline Bench Press',
  };

  // ── SUGGEST: maps ambiguous terms to answer options shown in clarification questions ──
  // Used ONLY to generate choices — never to auto-rename anything
  const SUGGEST = {
    'bench':       ['Bench Press','Incline Bench Press','Decline Bench Press'],
    'db bench':    ['Bench Press','Incline Dumbbell Press','Decline Dumbbell Press'],
    'incline':     ['Incline Bench Press','Incline Dumbbell Press'],
    'incline db':  ['Incline Dumbbell Press','Incline Bench Press'],
    'incline dbs': ['Incline Dumbbell Press','Incline Bench Press'],
    'decline':     ['Decline Bench Press','Decline Dumbbell Press'],
    'ohp':         ['Overhead Press'],
    'rdl':         ['Romanian Deadlift','Stiff-Leg Deadlift'],
    'dl':          ['Deadlift','Romanian Deadlift'],
    'sldl':        ['Stiff-Leg Deadlift','Romanian Deadlift'],
    'bth':         ['Tricep Overhead Extension','Behind The Head Tricep'],
    'btb':         ['Tricep Overhead Extension','Behind The Back Tricep'],
    'oth':         ['Tricep Overhead Extension','One-arm Tricep Pushdown'],
    'cc':          ['Cable Crossover','Chest Fly','Cable Curls'],
    'cgbp':        ['Close-Grip Bench Press'],
    'cg':          ['Close-Grip Bench Press','Cable Curls','Close-Grip Pulldown'],
    'ng':          ['Neutral-Grip Pull-up','Neutral-Grip Lat Pulldown'],
    'ez':          ['EZ-Bar Curl','EZ-Bar Skullcrusher'],
    'jm':          ['JM Press (tricep compound)'],
    'ghr':         ['Glute Ham Raise'],
    'atg':         ['ATG Split Squat','Full-Range Squat'],
    'ss':          ['Shoulder Shrug','Superset label (not an exercise)'],
    'hex lift':    ['Trap Bar Deadlift'],
    'hex':         ['Trap Bar Deadlift','Hex Bar Deadlift'],
    'flies':       ['Chest Fly','Cable Crossover'],
    'fly':         ['Chest Fly','Cable Crossover'],
    'flyes':       ['Chest Fly','Cable Crossover'],
    'cable flies': ['Cable Crossover','Chest Fly'],
    'cable fly':   ['Cable Crossover','Chest Fly'],
    'curls':       ['Bicep Curls','Hammer Curls','Cable Curls'],
    'curl':        ['Bicep Curls','Hammer Curls','Cable Curls'],
    'db curls':    ['Bicep Curls','Hammer Curls'],
    'db curl':     ['Bicep Curls','Hammer Curls'],
    'db row':      ['Dumbbell Row','One-arm Dumbbell Row'],
    'single kb row':['Dumbbell Row','Kettlebell Row'],
    'back row':    ['Barbell Row','Cable Row','T-Bar Row'],
    'row':         ['Barbell Row','Cable Row','Dumbbell Row','T-Bar Row'],
    'rows':        ['Barbell Row','Cable Row','Dumbbell Row'],
    'pull down':   ['Lat Pulldown','Tricep Pushdown'],
    'pulldown':    ['Lat Pulldown','Tricep Pushdown'],
    'pull':        ['Pull-ups','Lat Pulldown','Cable Row'],
    'press':       ['Bench Press','Overhead Press','Incline Bench Press'],
    'shoulder press':['Overhead Press','Arnold Press','Seated Dumbbell Press'],
    'tri pull down':['Tricep Pushdown'],
    'tri pushdown': ['Tricep Pushdown'],
    'skull':       ['Skull Crushers'],
    'arnold':      ['Arnold Press'],
    'kb swing':    ['Kettlebell Swing'],
    'kb clean':    ['Kettlebell Clean'],
    'kb':          ['Kettlebell Swing','Kettlebell Clean','Kettlebell Press'],
    'db':          ['Dumbbell exercise — which one?'],
    'windmill':    ['Kettlebell Windmill'],
    'farmer lean': ['Farmers Walk','Suitcase Carry'],
    'ab cable curl':['Ab Cable Crunch','Cable Crunch'],
    'cable curls': ['Bicep Curls (cable)','Cable Crossover'],
    'lat pull':    ['Lat Pulldown'],
    'back pull down':['Lat Pulldown','Cable Row'],
    'shoulder t bar press':['T-Bar Press','Landmine Press'],
    't bar':       ['T-Bar Row','T-Bar Press'],
    'suspense push ups':['Push-ups (suspension)','TRX Push-ups'],
    'db snatch':   ['Dumbbell Snatch'],
    'db hamstring':['Romanian Deadlift','Dumbbell Leg Curl'],
    'sitting curls':['Bicep Curls (seated)','Hammer Curls (seated)'],
    'calves':      ['Calf Raises','Seated Calf Raises'],
    'calf':        ['Calf Raises','Seated Calf Raises'],
    'hamstring curls':['Leg Curl'],
    'pause reps':  ['Squat (pause)','Bench Press (pause)'],
    'pause squat': ['Squat (pause)'],
    'bw squat':    ['Squat (bodyweight)','Goblet Squat'],
    'machine row': ['Cable Row','T-Bar Row','Machine Row'],
    'back row machine':['Machine Row','Cable Row'],
    'cables upper':['Cable Crossover','High Cable Fly'],
    'oth cable pull down':['Tricep Pushdown','Overhead Tricep Cable'],
    'tri single pull down':['Tricep Pushdown (single arm)'],
    'close grip lat pull down':['Lat Pulldown (close grip)'],
    'pull down mid grip':['Lat Pulldown (mid grip)'],
    'concentration curls':['Concentration Curl'],
    'preacher':    ['Preacher Curl','EZ-Bar Preacher Curl'],
    'incline dumbbell press':['Incline Dumbbell Press'],
  };

  // ── normalizeName: ONLY uses AUTO_RESOLVE — never guesses ──────────────
  function normalizeName(raw){
    let r=raw.toLowerCase().trim().replace(/[-_]+/g,' ').replace(/\s+/g,' ');
    r=r.replace(/^superset\s+/,'').replace(/^ss\s+/,'');
    if(/ x /.test(r)) r=r.split(' x ')[0].trim();
    // Only resolve if unambiguous
    if(AUTO_RESOLVE[r]) return AUTO_RESOLVE[r];
    // Title-case the raw input as-is
    return raw.replace(/^(superset|ss)\s+/i,'').replace(/\s+x\s+.*/i,'')
              .replace(/\b\w/g,c=>c.toUpperCase()).trim();
  }

  // ── Line classification ───────────────────────────────────────────────
  const DATE_RE=/^\s*(?:\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)(?:\s|$)/;
  const SET_RE=/\d+\s*x\s*\d+|\d+\s*,\s*\d+/i;
  const IGNORE_RE=/^https?:|^http:|^www\.|^\s*[-*•]\s*\[|^\s*$|^my |^everyone |^same |^got sick|^sauna|^parents|^felt |^drank|^today|^been too long|^si$|^FORMFORMFORM/i;

  // ── Main parsing loop ─────────────────────────────────────────────────
  const lines=raw.split('\n');
  const workouts=[];
  const unknowns=new Map(); // cleaned term → {rawTerm, occurrences}

  let curWorkout=null;
  let curExercise=null;

  function saveExercise(){
    if(curExercise && curExercise.sets.length>0 && curWorkout){
      curWorkout.exercises.push({...curExercise,superset:false,ssPair:null,bwMode:false,notes:''});
    }
    curExercise=null;
  }
  function saveWorkout(){
    saveExercise();
    if(curWorkout && curWorkout.exercises.length>0){
      workouts.push(curWorkout);
    }
    curWorkout=null;
  }

  for(let li=0;li<lines.length;li++){
    const line=lines[li];
    const trimmed=line.trim();
    if(!trimmed) continue;
    if(IGNORE_RE.test(trimmed)) continue;

    // Date line?
    if(DATE_RE.test(trimmed)){
      const datePart=trimmed.match(/(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/);
      const parsed=datePart?parseDate(datePart[1]):null;
      if(parsed){ saveWorkout(); curWorkout={...parsed,split:'Push',exercises:[],notes:''}; continue; }
    }

    if(!curWorkout) continue;

    // Set line?
    if(SET_RE.test(trimmed)){
      // Check if this is a combined "exercise name + sets" line (e.g. "squat 225x5x3")
      const setStart=trimmed.search(/\d+\.?\d*\s*x\s*\d+/i);
      if(setStart>0){
        const namePart=trimmed.slice(0,setStart).trim();
        if(namePart && /[a-zA-Z]/.test(namePart) && namePart.split(/\s+/).length<=4){
          // This is "exercise sets" on one line — save previous exercise, start new one
          saveExercise();
          const normed=normalizeName(namePart);
          curExercise={name:normed, sets:[]};
          const setPart=trimmed.slice(setStart).trim();
          const isBW=BW_EX.has(curExercise.name.toLowerCase());
          curExercise.sets.push(...parseSets(setPart,isBW));
          // Track unknown if not auto-resolved
          let cleaned=namePart.toLowerCase().replace(/^superset\s+/,'').replace(/^ss\s+/,'').replace(/\s+x\s+.*/,'').trim();
          const wasAutoResolved=AUTO_RESOLVE[cleaned]!==undefined||AUTO_RESOLVE[namePart.toLowerCase()]!==undefined
            ||(()=>{const vals=Object.values(AUTO_RESOLVE); return vals.includes(normed);})();
          if(!wasAutoResolved){
            if(!unknowns.has(cleaned)) unknowns.set(cleaned,{rawTerm:namePart, count:0});
            unknowns.get(cleaned).count++;
          }
          continue;
        }
      }
      // Pure set line — add to current exercise
      if(!curExercise) continue;
      const isBW=BW_EX.has(curExercise.name.toLowerCase());
      curExercise.sets.push(...parseSets(trimmed,isBW));
      continue;
    }

    // Exercise name line?
    const hasLetter=/[a-zA-Z]/.test(trimmed);
    const wordCount=trimmed.split(/\s+/).length;
    if(hasLetter && wordCount<=6 && !/[.!?]{2}/.test(trimmed)){
      const lower=trimmed.toLowerCase();
      const isLabel=/^(superset|ss|warmup|cool down|drop set|notes?|rest|day|am|pm|morning|evening|night|jiu jitsu|hiit|sauna|stretch|cardio|stairs|light|heavy|norwegian|sprint|run|lift|HIIT|core)$/i.test(lower);
      if(!isLabel){
        saveExercise();
        const normed=normalizeName(trimmed);
        curExercise={name:normed, sets:[]};

        // ── Unknown detection — flag anything not AUTO_RESOLVED ──
        let cleaned=lower.replace(/^superset\s+/,'').replace(/^ss\s+/,'').replace(/\s+x\s+.*/,'').trim();
        // Check both the raw cleaned form AND the title-cased output
        const wasAutoResolved=AUTO_RESOLVE[cleaned]!==undefined||AUTO_RESOLVE[lower]!==undefined
          ||(()=>{const vals=Object.values(AUTO_RESOLVE); return vals.includes(normed);})();

        if(!wasAutoResolved){
          // Only flag if it looks like it could be an abbreviation or ambiguous term
          // Skip lines that are clearly full English names (3+ distinct words, no abbreviations)
          if(!unknowns.has(cleaned)){
              unknowns.set(cleaned,{rawTerm:trimmed, count:0});
            }
            unknowns.get(cleaned).count++;
        }
        continue;
      }
    }

    // Narrative / notes
    if(curWorkout && trimmed.length<120){
      const isNarrative=/felt|heavy|easy|tired|good|bad|sick|pain|shoulder|knee|form|energy|weak|strong|sore|note/i.test(trimmed.toLowerCase());
      if(isNarrative) curWorkout.notes=(curWorkout.notes+' '+trimmed).trim();
    }
  }
  saveWorkout();

  // Assign splits + volumes
  for(const w of workouts){
    w.split=guessSplit(w.exercises.map(e=>e.name));
    w.totalVolume=w.exercises.reduce((a,e)=>a+e.sets.reduce((b,s)=>b+(s.bw?0:(parseFloat(s.weight)||0)*(parseInt(s.reps)||0)),0),0);
    w.duration=null;
  }

  if(!workouts.length){
    document.getElementById('import-body').innerHTML=`
      <div style="background:rgba(192,64,74,0.08);border:1px solid rgba(192,64,74,0.2);border-radius:12px;padding:16px;margin-bottom:14px;">
        <div style="font-size:10px;color:var(--danger);letter-spacing:1.5px;margin-bottom:6px;text-transform:uppercase;">Nothing Found</div>
        <div style="font-size:12px;color:var(--muted);">Couldn't find workouts. Make sure your log has dates like 1/12 or 3/5/26, and exercises with sets.</div>
      </div>
      <button onclick="importGoToStep('paste')" style="width:100%;padding:13px;background:var(--bg3);border:1px solid var(--border);border-radius:12px;color:var(--muted);font-family:inherit;font-size:11px;letter-spacing:1.5px;cursor:pointer;">← TRY AGAIN</button>`;
    return;
  }

  // ── Keyword inference for truly novel terms ────────────────────────────
  function inferFromKeywords(r){
    if(/press|prs/.test(r))          return ['Bench Press','Overhead Press','Incline Bench Press'];
    if(/row|rows/.test(r))           return ['Barbell Row','Cable Row','Dumbbell Row'];
    if(/curl|curls/.test(r))         return ['Bicep Curls','Hammer Curls','Cable Curls'];
    if(/pull(?!down)|chin/.test(r))  return ['Pull-ups','Lat Pulldown','Cable Row'];
    if(/pulldown|pull down/.test(r)) return ['Lat Pulldown','Tricep Pushdown'];
    if(/fly|flies|flye/.test(r))     return ['Chest Fly','Cable Crossover'];
    if(/squat|sq(?!\w)/.test(r))     return ['Squat','Goblet Squat','Bulgarian Split Squat'];
    if(/dead|dl(?!\w)/.test(r))      return ['Deadlift','Romanian Deadlift','Trap Bar Deadlift'];
    if(/lunge|split/.test(r))        return ['Lunges','Bulgarian Split Squat'];
    if(/shrug/.test(r))              return ['Barbell Shrug','Dumbbell Shrug'];
    if(/raise/.test(r))              return ['Lateral Raises','Front Raises'];
    if(/ext(?:ension)?/.test(r))     return ['Tricep Pushdown','Leg Extension','Tricep Overhead Extension'];
    if(/push/.test(r))               return ['Tricep Pushdown','Push-ups'];
    if(/down/.test(r))               return ['Lat Pulldown','Tricep Pushdown'];
    if(/swing/.test(r))              return ['Kettlebell Swing'];
    if(/ab|core|crunch/.test(r))     return ['Ab Cable Crunch','Crunches','Hanging Leg Raise'];
    if(/leg/.test(r))                return ['Leg Press','Leg Curl','Leg Extension'];
    if(/calf|calve/.test(r))         return ['Calf Raises'];
    if(/hip/.test(r))                return ['Hip Thrust','Hip Abduction'];
    if(/back/.test(r))               return ['Barbell Row','Lat Pulldown','Cable Row'];
    if(/chest/.test(r))              return ['Bench Press','Chest Fly','Cable Crossover'];
    if(/shoulder/.test(r))           return ['Overhead Press','Lateral Raises','Front Raises'];
    if(/tri(?:cep)?/.test(r))        return ['Tricep Pushdown','Skull Crushers','Tricep Overhead Extension'];
    if(/bi(?:cep)?/.test(r))         return ['Bicep Curls','Hammer Curls'];
    return [];
  }

  importParsed=workouts.sort((a,b)=>a.timestamp-b.timestamp);

  // ── Build clarification questions ────────────────────────────────────
  importClarifications=[];
  const seenQ=new Set();

  // Q type 1: every unknown/ambiguous exercise term
  for(const [cleaned, info] of unknowns){
    if(importClarifications.length>=20) break;
    if(seenQ.has(cleaned)) continue;
    seenQ.add(cleaned);

    // Find matching exercises still in parsed workouts
    const normed=normalizeName(info.rawTerm);
    const affectedIdxs=[];
    importParsed.forEach((w,i)=>{
      if(w.exercises.some(e=>e.name===normed||e.name.toLowerCase()===cleaned)) affectedIdxs.push(i);
    });
    if(!affectedIdxs.length) continue;

    // Build options: SUGGEST options first, then common fallbacks, then keep-as-is
    const suggestOpts=SUGGEST[cleaned]||SUGGEST[info.rawTerm.toLowerCase()]||[];
    // Infer from keywords if no SUGGEST entry
    const inferred=suggestOpts.length?suggestOpts:inferFromKeywords(cleaned);
    // Always add "keep as-is" and "it's not an exercise" at the end
    const opts=[...new Set([
      ...inferred,
      normed!==info.rawTerm?normed:null,  // add normalized version if different
    ].filter(Boolean))];
    if(!opts.includes('Skip / Keep as-is')) opts.push('Skip / Keep as-is');

    importClarifications.push({
      id:'ex_'+cleaned.replace(/\s+/g,'_'),
      type:'abbreviation',
      question:`What is "${info.rawTerm}"?`,
      term:cleaned,
      note:`Appears ${info.count}x in your log`,
      options:opts,
      affects_exercises:[normed, cleaned, info.rawTerm]
    });
  }

  // Q type 2: ambiguous splits (tie or very low confidence)
  for(let i=0;i<importParsed.length && importClarifications.length<14;i++){
    const w=importParsed[i];
    const exNames=w.exercises.map(e=>e.name.toLowerCase()).join(' ');
    const scores={};
    for(const [sp,kws] of Object.entries(SPLIT_KWS)){
      scores[sp]=kws.filter(k=>exNames.includes(k)).length;
    }
    const sorted=Object.entries(scores).sort((a,b)=>b[1]-a[1]);
    const top=sorted[0][1], second=sorted[1][1];
    if(top===0||(top-second<=1)){
      const qId='split_'+i;
      if(!seenQ.has(qId)){
        seenQ.add(qId);
        const exList=w.exercises.slice(0,4).map(e=>e.name).join(', ');
        importClarifications.push({
          id:qId, type:'split',
          question:`Which split was this workout?`,
          note:w.date+' · '+exList,
          options:['Push','Pull','Legs','Core'],
          affects_workouts:[w.timestamp]
        });
      }
    }
  }

  importAnswers={};
  if(importClarifications.length>0){
    importStep='clarify';
  } else {
    importSelected=new Set(importParsed.map((_,i)=>i));
    importStep='preview';
  }
  renderImportStep();
}

// ── Step 2: Clarify ─────────────────────────
function importAnswerQ(id, answer){
  importAnswers[id]=answer;
  haptic('light');
  renderImportStep();
}

function importClarifyHTML(){
  const total=importClarifications.length;
  const answered=Object.keys(importAnswers).length;
  const allDone=answered>=total;
  const progressPct=Math.round((answered/Math.max(total,1))*100);

  const progressBar=`
    <div style="margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-size:10px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;">Quick Questions</div>
        <div style="font-size:10px;color:var(--dim);">${answered}/${total} answered</div>
      </div>
      <div style="height:2px;background:var(--border);border-radius:1px;">
        <div style="height:2px;background:var(--accent);border-radius:1px;width:${progressPct}%;transition:width .3s;"></div>
      </div>
    </div>`;

  const cards=importClarifications.map((q,qi)=>{
    const picked=importAnswers[q.id];
    const isSplit=q.type==='split';
    const typeLabel=isSplit?'AMBIGUOUS SPLIT':'UNKNOWN TERM';
    const typeColor=isSplit?'var(--superset)':'var(--accent)';

    const opts=(q.options||[]).map((opt,oi)=>{
      const sel=picked===opt;
      const isSkip=opt.startsWith('Skip');
      if(isSplit){
        const splitColors=SPLIT_COLORS;
        const sc=splitColors[opt]||'var(--muted)';
        return `<button
          data-qid="${q.id}" data-ans="${opt.replace(/"/g,'&quot;')}"
          style="flex:1;padding:10px 6px;border-radius:10px;border:2px solid ${sel?sc:'var(--border)'};
          background:${sel?sc+'33':'var(--bg2)'};color:${sel?sc:'var(--muted)'};
          font-family:'Bebas Neue',sans-serif;font-size:15px;letter-spacing:1px;cursor:pointer;">${opt}</button>`;
      }
      return `<button
        data-qid="${q.id}" data-ans="${opt.replace(/"/g,'&quot;')}"
        style="width:100%;padding:11px 14px;border-radius:10px;border:2px solid ${sel?'var(--accent)':'var(--border)'};
        background:${sel?'rgba(232,213,160,0.12)':'var(--bg2)'};
        color:${isSkip?'var(--dim)':(sel?'var(--accent)':'var(--muted)')};
        font-family:'DM Sans',sans-serif;font-size:12px;cursor:pointer;
        text-align:left;display:flex;align-items:center;gap:10px;">
        <span style="width:16px;height:16px;border-radius:50%;border:2px solid ${sel?'var(--accent)':'var(--border)'};
          background:${sel?'var(--accent)':'transparent'};flex-shrink:0;display:flex;
          align-items:center;justify-content:center;font-size:8px;color:#080808;">${sel?'✓':''}</span>
        <span style="${isSkip?'font-style:italic;':''}">${opt}</span>
      </button>`;
    }).join('');

    // Custom name input — only for abbreviation type
    const customVal=(!isSplit && picked && !(q.options||[]).includes(picked))?picked:'';
    const customInput=!isSplit?`
      <div style="margin-top:8px;">
        <div style="font-size:9px;letter-spacing:1.5px;color:var(--dim);margin-bottom:6px;text-transform:uppercase;">Or type your own name:</div>
        <div style="display:flex;gap:8px;">
          <input id="custom-${qi}" type="text" value="${customVal}"
            placeholder="e.g. Flat Dumbbell Press"
            style="flex:1;background:var(--bg2);border:1px solid var(--border);border-radius:10px;
            padding:10px 12px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:12px;outline:none;"
          />
          <button data-customqid="${q.id}" data-custominput="custom-${qi}"
            style="padding:10px 14px;background:var(--bg3);border:1px solid var(--border);
            border-radius:10px;color:var(--muted);font-family:'DM Sans',sans-serif;
            font-size:11px;letter-spacing:1px;cursor:pointer;white-space:nowrap;">USE THIS</button>
        </div>
      </div>`:'' ;

    const noteHTML=q.note?`<div style="font-size:10px;color:var(--dim);margin-bottom:10px;padding:6px 10px;background:rgba(255,255,255,0.03);border-radius:6px;">${q.note}</div>`:'';
    const doneTag=picked?`<div style="font-size:10px;color:var(--green);margin-top:10px;">✓ ${picked}</div>`:'';

    return `<div style="background:#09090c;border:2px solid ${picked?'rgba(232,213,160,0.2)':'var(--border)'};border-radius:14px;padding:16px;margin-bottom:12px;">
      <div style="font-size:8px;letter-spacing:2px;color:${typeColor};text-transform:uppercase;margin-bottom:6px;">${typeLabel}</div>
      <div style="font-size:13px;color:var(--text);margin-bottom:8px;line-height:1.5;font-weight:500;">${q.question}</div>
      ${noteHTML}
      <div style="${isSplit?'display:flex;gap:6px;':'display:flex;flex-direction:column;gap:6px;'}">${opts}</div>
      ${customInput}
      ${doneTag}
    </div>`;
  }).join('');

  const continueBtn=`<button id="clarify-continue"
    style="width:100%;padding:14px;background:${allDone?'var(--accent)':'rgba(232,213,160,0.45)'};border:none;border-radius:12px;
    font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:3px;color:#080808;cursor:pointer;">
    ${allDone?'CONTINUE &rarr;':'DONE &mdash; APPLY ANSWERS &rarr;'}
  </button>`;
  const skipBtn=`<button id="clarify-skip"
    style="width:100%;margin-top:8px;padding:11px;background:transparent;border:1px solid var(--border);
    border-radius:12px;font-family:'DM Sans',sans-serif;font-size:10px;letter-spacing:1.5px;color:var(--dim);cursor:pointer;">
    SKIP ALL &amp; CONTINUE
  </button>`;

  return progressBar+cards+continueBtn+skipBtn;
}

// Wire up clarify clicks via event delegation (called after innerHTML set)
function bindClarifyEvents(){
  const body=document.getElementById('import-body');
  if(!body) return;
  // Remove old listener by cloning
  const fresh=body.cloneNode(true);
  body.parentNode.replaceChild(fresh,body);
  fresh.addEventListener('click',function(e){
    // Option button
    const btn=e.target.closest('[data-qid]');
    if(btn){
      const qid=btn.getAttribute('data-qid');
      const ans=btn.getAttribute('data-ans');
      importAnswers[qid]=ans;
      haptic('light');
      renderImportStep();
      return;
    }
    // Custom "USE THIS" button
    const customBtn=e.target.closest('[data-customqid]');
    if(customBtn){
      const qid=customBtn.getAttribute('data-customqid');
      const inputId=customBtn.getAttribute('data-custominput');
      const inp=fresh.querySelector('#'+inputId);
      if(inp && inp.value.trim()){
        importAnswers[qid]=inp.value.trim();
        haptic('light');
        renderImportStep();
      }
      return;
    }
    // Continue / skip buttons
    if(e.target.closest('#clarify-continue')||e.target.closest('#clarify-skip')){
      importApplyAndPreview();
    }
  });
  // Allow pressing Enter in custom input fields
  fresh.querySelectorAll('input[id^="custom-"]').forEach(inp=>{
    inp.addEventListener('keydown',function(e){
      if(e.key==='Enter'){
        const useBtn=fresh.querySelector('[data-custominput="'+inp.id+'"]');
        if(useBtn) useBtn.click();
      }
    });
  });
}

// Apply clarification answers to importParsed, then show preview
function importApplyAndPreview(){
  for(const q of importClarifications){
    const answer=importAnswers[q.id];
    if(!answer || answer.startsWith('Skip')) continue;

    if(q.type==='abbreviation' && q.affects_exercises){
      // Replace matching exercise names in all workouts
      const targets=new Set((q.affects_exercises||[]).map(t=>t.toLowerCase()));
      importParsed=importParsed.map(w=>({
        ...w,
        exercises:w.exercises.map(e=>({
          ...e,
          name:targets.has(e.name.toLowerCase())?answer:e.name
        }))
      }));
    } else if(q.type==='split' && q.affects_workouts){
      const ts=new Set(q.affects_workouts);
      importParsed=importParsed.map(w=>({
        ...w,
        split:ts.has(w.timestamp)?answer:w.split
      }));
    } else if(q.type==='date' && q.affects_workouts){
      // Best effort — just store the answer in notes
      const ts=new Set(q.affects_workouts);
      importParsed=importParsed.map(w=>({
        ...w,
        date:ts.has(w.timestamp)?answer:w.date
      }));
    }
  }
  // Recompute volumes after name changes
  importParsed=importParsed.map(w=>{
    const totalVolume=w.exercises.reduce((a,e)=>a+e.sets.reduce((b,s)=>b+(s.bw?0:(parseFloat(s.weight)||0)*(parseInt(s.reps)||0)),0),0);
    return {...w,totalVolume};
  });

  importSelected=new Set(importParsed.map((_,i)=>i));
  importStep='preview';
  renderImportStep();
}

// ── Step 3: Preview ─────────────────────────
export function importToggle(i){
  if(importSelected.has(i)) importSelected.delete(i);
  else importSelected.add(i);
  renderImportStep();
}

function importPreviewHTML(){
  const sel=importSelected.size;
  const totalSets=importParsed.filter((_,i)=>importSelected.has(i))
    .reduce((a,w)=>a+w.exercises.reduce((b,e)=>b+e.sets.length,0),0);

  const summary=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">
      <div style="background:#09090c;border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:32px;color:var(--accent);line-height:1;">${sel}</div>
        <div style="font-size:8px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;margin-top:3px;">Workouts</div>
      </div>
      <div style="background:#09090c;border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:32px;color:var(--accent);line-height:1;">${totalSets}</div>
        <div style="font-size:8px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;margin-top:3px;">Total Sets</div>
      </div>
    </div>`;

  const selRow=`
    <div style="display:flex;gap:6px;margin-bottom:12px;">
      <button onclick="importSelectAll()" style="padding:6px 12px;background:transparent;border:1px solid var(--border);border-radius:20px;color:var(--muted);font-family:'DM Sans',sans-serif;font-size:10px;letter-spacing:1px;cursor:pointer;">All</button>
      <button onclick="importSelectNone()" style="padding:6px 12px;background:transparent;border:1px solid var(--border);border-radius:20px;color:var(--muted);font-family:'DM Sans',sans-serif;font-size:10px;letter-spacing:1px;cursor:pointer;">None</button>
    </div>`;

  const cards=importParsed.map((w,i)=>{
    const chk=importSelected.has(i);
    const exList=w.exercises.slice(0,3).map(e=>e.name).join(', ')+(w.exercises.length>3?` +${w.exercises.length-3}`:'');
    const sets=w.exercises.reduce((a,e)=>a+e.sets.length,0);
    const splitColors=SPLIT_COLORS;
    const sc=splitColors[w.split]||'var(--muted)';
    return `<div onclick="importToggle(${i})" style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:#09090c;border:1px solid ${chk?'rgba(232,213,160,0.25)':'var(--border)'};border-radius:12px;margin-bottom:8px;cursor:pointer;transition:border-color .15s;">
      <div style="width:20px;height:20px;border-radius:6px;border:1px solid ${chk?'var(--accent)':'var(--border)'};background:${chk?'var(--accent)':'transparent'};flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;color:#080808;">${chk?'✓':''}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:18px;line-height:1.1;color:${sc};">${w.split}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:1px;">${w.date}</div>
        <div style="font-size:10px;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px;">${exList||'—'}</div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:16px;color:var(--accent);">${w.totalVolume>0?w.totalVolume.toLocaleString()+'lb':'BW'}</div>
        <div style="font-size:9px;color:var(--dim);letter-spacing:1px;">${sets} set${sets!==1?'s':''}</div>
      </div>
    </div>`;
  }).join('');

  return summary+selRow+
    `<div style="max-height:320px;overflow-y:auto;margin-bottom:16px;">${cards}</div>
    <button onclick="importCommit()" ${sel===0?'disabled':''} style="width:100%;padding:14px;background:${sel>0?'var(--accent)':'var(--dim)'};border:none;border-radius:12px;font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:3px;color:#080808;cursor:${sel>0?'pointer':'not-allowed'};">
      IMPORT ${sel} WORKOUT${sel!==1?'S':''} →
    </button>
    <button onclick="importGoToStep('clarify')" style="width:100%;margin-top:8px;padding:12px;background:transparent;border:1px solid var(--border);border-radius:12px;font-family:'DM Sans',sans-serif;font-size:11px;letter-spacing:1.5px;color:var(--dim);cursor:pointer;">${importClarifications.length?'← BACK TO QUESTIONS':'← PASTE DIFFERENT LOG'}</button>`;
}

// ── Step 3 → Write to state ─────────────────
export function importCommit(){
  const toAdd=importParsed.filter((_,i)=>importSelected.has(i));
  if(!toAdd.length) return;
  importAddedCount=toAdd.length;
  const existTs=new Set(state.workouts.map(w=>w.timestamp));
  for(const w of toAdd){
    let ts=w.timestamp;
    while(existTs.has(ts)) ts+=1000;
    existTs.add(ts);
    state.workouts.push({
      split:w.split, date:w.date, timestamp:ts,
      duration:null, totalVolume:w.totalVolume,
      notes:w.notes||'', exercises:w.exercises
    });
  }
  state.workouts.sort((a,b)=>b.timestamp-a.timestamp);
  if(state.workouts.length>500) state.workouts=state.workouts.slice(0,500);
  saveImmediate();
  importStep='done';
  haptic('medium');
  renderImportStep();
}

// ── Step 4: Done ────────────────────────────
function importDoneHTML(){
  return `
    <div style="text-align:center;padding:32px 0;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:88px;color:var(--green);line-height:1;">${importAddedCount}</div>
      <div style="font-size:10px;letter-spacing:3px;color:var(--muted);text-transform:uppercase;margin-top:6px;">Workout${importAddedCount!==1?'s':''} Added</div>
      <div style="font-size:13px;color:var(--dim);margin-top:16px;line-height:1.6;">Your history is updated.</div>
      <div style="margin-top:32px;display:flex;flex-direction:column;gap:8px;">
        <button onclick="importViewHistory()" style="width:100%;padding:14px;background:var(--accent);border:none;border-radius:12px;font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:3px;color:#080808;cursor:pointer;">VIEW HISTORY →</button>
        <button onclick="importRestart()" style="width:100%;padding:12px;background:transparent;border:1px solid var(--border);border-radius:12px;font-family:'DM Sans',sans-serif;font-size:11px;letter-spacing:1.5px;color:var(--muted);cursor:pointer;">IMPORT MORE</button>
      </div>
    </div>`;
}

// ── Wrapper functions for onclick handlers ──
// (module-scoped variables aren't accessible from inline onclick)
export function importSelectAll(){
  importSelected=new Set(importParsed.map((_,i)=>i));
  renderImportStep();
}
export function importSelectNone(){
  importSelected=new Set();
  renderImportStep();
}
export function importGoToStep(step){
  importStep=step;
  renderImportStep();
}
export function importRestart(){
  importParsed=[]; importClarifications=[]; importAnswers={};
  importSelected=new Set(); importAddedCount=0; importStep='paste';
  renderImportStep();
}
export function importViewHistory(){
  closeImportModal();
  navigateTo('me', 'history');
}
