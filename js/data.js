// ═══════════════════════════════════════════
// DATA — Exercise data, splits, programs, research tips
// ═══════════════════════════════════════════

// ── PROGRESSIVE OVERLOAD INCREMENTS ──
export const OVERLOAD_PCT = {
  "Squat": 5, "Deadlift": 5, "Romanian Deadlift": 5, "Leg Press": 5,
  "Hip Thrust": 5, "Barbell Row": 5,
  "Bench Press": 2.5, "Overhead Press": 2.5, "Incline Dumbbell Press": 2.5,
  "Lat Pulldown": 2.5, "Cable Row": 2.5, "Pull-ups": 2.5, "Dips": 2.5,
  "Tricep Pushdown": 2, "Lateral Raises": 2, "Chest Fly": 2,
  "Cable Crossover": 2, "Face Pulls": 2, "Bicep Curls": 2,
  "Hammer Curls": 2, "Leg Curl": 2, "Leg Extension": 2,
  "Calf Raises": 2, "Lunges": 2,
};
export const DEFAULT_OVERLOAD_PCT = 2.5;

// ── ALL EXERCISE GROUPS ──
export const ALL_SPLITS = {
  Push:     ["Bench Press","Overhead Press","Incline Dumbbell Press","Tricep Pushdown","Lateral Raises","Chest Fly","Cable Crossover","Dips"],
  Pull:     ["Deadlift","Barbell Row","Pull-ups","Lat Pulldown","Face Pulls","Bicep Curls","Hammer Curls","Cable Row"],
  Legs:     ["Squat","Romanian Deadlift","Leg Press","Leg Curl","Calf Raises","Lunges","Leg Extension","Hip Thrust"],
  Core:     ["Plank","Ab Wheel","Cable Crunch","Hanging Leg Raise","Russian Twist","Dead Bug","Pallof Press","Sit-ups"],
  Chest:    ["Bench Press","Incline Dumbbell Press","Chest Fly","Cable Crossover","Dips","Decline Press"],
  Back:     ["Deadlift","Barbell Row","Pull-ups","Lat Pulldown","Cable Row","Face Pulls"],
  Arms:     ["Bicep Curls","Hammer Curls","Tricep Pushdown","Skull Crushers","Cable Curl","Dips"],
  Shoulders:["Overhead Press","Lateral Raises","Face Pulls","Rear Delt Fly","Arnold Press"],
  Upper:    ["Bench Press","Barbell Row","Overhead Press","Pull-ups","Incline Dumbbell Press","Bicep Curls","Tricep Pushdown","Face Pulls"],
  Lower:    ["Squat","Romanian Deadlift","Leg Press","Leg Curl","Hip Thrust","Calf Raises","Lunges","Leg Extension"],
  Full:     ["Squat","Bench Press","Barbell Row","Overhead Press","Romanian Deadlift","Pull-ups","Bicep Curls","Tricep Pushdown"],
};

export const SPLIT_META = {
  Push:      { icon:"🔴", desc:"Chest · Triceps · Shoulders" },
  Pull:      { icon:"🟣", desc:"Back · Biceps · Rear Delts" },
  Legs:      { icon:"🟢", desc:"Quads · Hamstrings · Glutes" },
  Core:      { icon:"🔵", desc:"Abs · Obliques · Stability" },
  Chest:     { icon:"🔴", desc:"Chest-focused day" },
  Back:      { icon:"🟣", desc:"Back-focused day" },
  Arms:      { icon:"🟠", desc:"Biceps · Triceps" },
  Shoulders: { icon:"🟡", desc:"Delts · Traps" },
  Upper:     { icon:"🔴", desc:"Chest · Back · Shoulders · Arms" },
  Lower:     { icon:"🟢", desc:"Quads · Hamstrings · Glutes · Calves" },
  Full:      { icon:"⚪", desc:"Full-body compound day" },
};

export const PROGRAMS = {
  ppl:    { label:"Push / Pull / Legs",  emoji:"🔄", days:"3–4 days/wk", desc:"Classic strength + size split", splits:["Push","Pull","Legs","Core"] },
  bro:    { label:"Bro Split",           emoji:"💪", days:"5–6 days/wk", desc:"One muscle group per day",       splits:["Chest","Back","Shoulders","Arms","Legs","Core"] },
  ul:     { label:"Upper / Lower",       emoji:"⚡", days:"4 days/wk",   desc:"Great for strength & frequency", splits:["Upper","Lower","Upper","Lower"] },
  fullbody:{ label:"Full Body",          emoji:"🌐", days:"3 days/wk",   desc:"Max frequency, compound focus",  splits:["Full","Full","Full"] },
  arnold: { label:"Arnold Split",        emoji:"🏆", days:"6 days/wk",   desc:"Chest+Back / Shoulders+Arms / Legs", splits:["Chest","Back","Shoulders","Arms","Legs","Core"] },
  custom: { label:"Custom",             emoji:"✏️", days:"your choice", desc:"Build your own sequence",         splits:[] },
};

export const SPLIT = new Proxy({}, { get(_,k){ return ALL_SPLITS[k]||[]; } });
export const BW_EXERCISES = new Set(["Pull-ups","Dips","Lunges","Plank","Ab Wheel","Hanging Leg Raise","Russian Twist","Dead Bug","Sit-ups"]);
export const DEFAULT_RESTS = {Squat:90,Deadlift:120,"Romanian Deadlift":90,"Leg Press":90,"Barbell Row":90,"Bench Press":90,"Overhead Press":90,"Pull-ups":60,"Dips":60};

export const THEMES = { gainz: { label:'GAINZ', bg:'#0a0a0a', accent:'#e8d5a0' } };

// ── MUSCLE GROUP MRV ──
export const MRV = {
  chest:    { label:"Chest",     mrv:22, mev:10, icon:"🫁" },
  back:     { label:"Back",      mrv:25, mev:10, icon:"🔙" },
  shoulders:{ label:"Shoulders", mrv:26, mev:8,  icon:"💪" },
  biceps:   { label:"Biceps",    mrv:26, mev:8,  icon:"💪" },
  triceps:  { label:"Triceps",   mrv:18, mev:8,  icon:"💪" },
  quads:    { label:"Quads",     mrv:20, mev:8,  icon:"🦵" },
  hamstrings:{ label:"Hamstrings",mrv:20, mev:8,  icon:"🦵" },
  glutes:   { label:"Glutes",    mrv:16, mev:6,  icon:"🍑" },
};

export const EX_MUSCLES = {
  "Bench Press":           ["chest","triceps","shoulders"],
  "Overhead Press":        ["shoulders","triceps"],
  "Incline Dumbbell Press":["chest","shoulders","triceps"],
  "Tricep Pushdown":       ["triceps"],
  "Lateral Raises":        ["shoulders"],
  "Chest Fly":             ["chest"],
  "Cable Crossover":       ["chest"],
  "Dips":                  ["chest","triceps"],
  "Deadlift":              ["back","hamstrings","glutes"],
  "Barbell Row":           ["back","biceps"],
  "Pull-ups":              ["back","biceps"],
  "Lat Pulldown":          ["back","biceps"],
  "Face Pulls":            ["shoulders","back"],
  "Bicep Curls":           ["biceps"],
  "Hammer Curls":          ["biceps"],
  "Cable Row":             ["back","biceps"],
  "Squat":                 ["quads","glutes"],
  "Romanian Deadlift":     ["hamstrings","glutes"],
  "Leg Press":             ["quads","glutes"],
  "Leg Curl":              ["hamstrings"],
  "Calf Raises":           [],
  "Lunges":                ["quads","glutes"],
  "Leg Extension":         ["quads"],
  "Hip Thrust":            ["glutes","hamstrings"],
  "Plank":                 [],
  "Ab Wheel":              [],
  "Cable Crunch":          [],
  "Hanging Leg Raise":     [],
  "Russian Twist":         [],
  "Dead Bug":              [],
  "Pallof Press":          [],
  "Sit-ups":               [],
  "Skull Crushers":        ["triceps"],
  "Cable Curl":            ["biceps"],
  "Decline Press":         ["chest","triceps"],
  "Rear Delt Fly":         ["shoulders","back"],
  "Arnold Press":          ["shoulders","triceps"],
};

// Auto-detect muscle groups from exercise name keywords.
// Returns {muscles: [...], confidence: 'high'|'low'|'none'}
// High confidence: strong keyword match (e.g. "curl" → biceps)
// Low confidence: weak/ambiguous match (e.g. "press" could be chest or shoulders)
// None: no match at all
export function detectMusclesFromName(name){
  const n = (name||'').toLowerCase();
  // High confidence patterns — specific keywords
  const highPatterns = [
    { re: /bench|chest\s*press|pec\s*fly|pec\s*deck|chest\s*fly|cable\s*cross|incline\s*press|decline\s*press|push[\s-]?up|dip/i, muscles: ['chest','triceps'] },
    { re: /bicep|biceps|curl(?!.*tri)|preacher|concentration|ez[\s-]?bar\s*curl|hammer\s*curl/i, muscles: ['biceps'] },
    { re: /tricep|triceps|skull\s*crush|pushdown|press[\s-]?down|overhead\s*ext|french\s*press|close[\s-]?grip\s*bench/i, muscles: ['triceps'] },
    { re: /lat\s*pull|pull[\s-]?up|chin[\s-]?up|pull[\s-]?down/i, muscles: ['back','biceps'] },
    { re: /row(?!.*upright)|seated\s*row|cable\s*row|barbell\s*row|dumbbell\s*row|t[\s-]?bar|pendlay/i, muscles: ['back','biceps'] },
    { re: /deadlift|rack\s*pull/i, muscles: ['back','hamstrings','glutes'] },
    { re: /squat|leg\s*press|hack\s*squat|goblet/i, muscles: ['quads','glutes'] },
    { re: /leg\s*ext|quad/i, muscles: ['quads'] },
    { re: /leg\s*curl|hamstring|rdl|romanian|good\s*morning|nordic/i, muscles: ['hamstrings','glutes'] },
    { re: /hip\s*thrust|glute\s*bridge|glute\s*kick|glute/i, muscles: ['glutes','hamstrings'] },
    { re: /lunge|bulgarian|split\s*squat|step[\s-]?up/i, muscles: ['quads','glutes'] },
    { re: /lateral\s*raise|side\s*raise|rear\s*delt|face\s*pull|upright\s*row|shrug/i, muscles: ['shoulders'] },
    { re: /shoulder\s*press|overhead\s*press|ohp|military\s*press|arnold\s*press/i, muscles: ['shoulders','triceps'] },
    { re: /fly|flye|pec/i, muscles: ['chest'] },
    { re: /calf|calves|calf\s*raise/i, muscles: [] },
    { re: /ab\s|abs|crunch|sit[\s-]?up|plank|leg\s*raise|dead\s*bug|pallof|russian\s*twist|ab\s*wheel|core/i, muscles: [] },
  ];
  for(const p of highPatterns){
    if(p.re.test(n)) return { muscles: p.muscles, confidence: 'high' };
  }
  // Low confidence — broad keywords
  const lowPatterns = [
    { re: /press/i, muscles: ['chest','triceps','shoulders'] },
    { re: /pull/i, muscles: ['back','biceps'] },
    { re: /raise/i, muscles: ['shoulders'] },
    { re: /extension|ext/i, muscles: ['triceps'] },
    { re: /curl/i, muscles: ['biceps'] },
  ];
  for(const p of lowPatterns){
    if(p.re.test(n)) return { muscles: p.muscles, confidence: 'low' };
  }
  return { muscles: [], confidence: 'none' };
}

export const REST_RECS = {
  strength:  { label:"Strength Sets",  rest:"3–5 min", why:"CNS & phosphocreatine full recovery (Willardson 2006)", icon:"🏋️" },
  hypertrophy:{ label:"Hypertrophy Sets",rest:"1–2 min", why:"Metabolic stress + GH response optimised (Schoenfeld 2010)", icon:"💪" },
  endurance: { label:"Endurance/High-rep",rest:"30–60s", why:"Maintains glycolytic stimulus (NSCA guidelines)", icon:"🔥" },
  compound:  { label:"Heavy compounds (Squat/DL/Row)",rest:"3–5 min", why:"Multi-joint fatigue requires longer restoration", icon:"⚡" },
  isolation:  { label:"Isolation exercises",rest:"60–90s", why:"Smaller muscle mass, faster local recovery", icon:"🎯" },
};

export const TIP_CATEGORIES = [
  { key: "rest",          label: "⏱ Rest",      color: "#a0c8e8" },
  { key: "reps",          label: "🔢 Reps",      color: "#e8d5a0" },
  { key: "tempo",         label: "⏳ Tempo",     color: "#a78bfa" },
  { key: "technique",     label: "✓ Technique",  color: "#6ee7a0" },
  { key: "mistakes",      label: "⚠ Mistakes",   color: "#e07070" },
  { key: "lowHangingFruit",label: "💡 Quick Win", color: "#f0a070" }
];

export const RESEARCH_TIPS = {

  "Bench Press": {
    rest: { tip: "Strength (RPE 8\u201310, \u226585% 1RM): 3\u20135 min \u2014 full phosphocreatine resynthesis takes ~3 min; cutting short directly costs reps. Hypertrophy (RPE 7\u20139, 65\u201380%): 2\u20133 min. The old '60\u201390s for metabolic stress' rule is debunked \u2014 longer rest produced MORE hypertrophy too, not just strength. There's no scenario where shorter rest wins.", source: "Schoenfeld, Pope, Benik et al. \u2014 J Strength Cond Res 30(7), 2016", year: 2016 },
    reps: { tip: "5\u201310 reps per set is the sweet spot. Moderate loads (6\u201312 reps) produce similar hypertrophy to low loads when volume is matched \u2014 but feel better on your shoulders.", source: "Schoenfeld et al., J Strength Cond Res, 2017 meta-analysis", year: 2017 },
    tempo: { tip: "Don't artificially slow reps to increase time under tension \u2014 it forces you to drop weight, which kills gains. Control the descent (2s down), explode up.", source: "Legion Athletics / Federal Univ S\u00e3o Carlos, 2018", year: 2018 },
    technique: { tip: "Retract and depress your scapulae before unracking. Maintain slight arch, feet flat. Bar should touch lower chest, not throat.", source: "Mausehund & Krosshaug, J Strength Cond Res, 2023", year: 2023 },
    mistakes: { tip: "Most common mistake: flaring elbows to 90\u00b0. Keep elbows at 45\u201375\u00b0 from torso to reduce shoulder impingement and improve force transfer.", source: "Biomechanics research; Schoenfeld Lab", year: 2023 },
    lowHangingFruit: { tip: "Pause 1 second at the bottom on your last set. Eliminates bounce, increases pec activation, and builds strength out of the hole.", source: "NSCA / practical application consensus", year: 2022 }
  },

  "Squat": {
    rest: { tip: "3\u20135 min rest. Squats tax your CNS and cardiovascular system heavily. Short rest = velocity loss on subsequent sets = less total volume quality.", source: "Barbell Medicine meta-analysis; Gonz\u00e1lez-Hern\u00e1ndez et al., Sports Biomechanics, 2023", year: 2023 },
    reps: { tip: "4\u201310 reps works best for squats. Higher reps get limited by cardiovascular fatigue before muscle fatigue, reducing hypertrophic stimulus.", source: "Stronger by Science / Schoenfeld 2021 rep continuum re-examination", year: 2021 },
    tempo: { tip: "Controlled descent (2\u20133s) improves positional strength and quad activation. Don't bounce at the bottom \u2014 it offloads the quads exactly when you want them working.", source: "Carzoli et al., J Sports Sci, 2019 \u2014 eccentric phase duration effects", year: 2019 },
    technique: { tip: "Valsalva maneuver is non-negotiable on heavy sets: big breath into your belly, brace hard before descent, release at top. This creates intra-abdominal pressure that protects your spine.", source: "NSCA guidelines; consensus biomechanics literature", year: 2022 },
    mistakes: { tip: "Knee valgus (knees caving in) is the most common and dangerous squat error. Cue: 'spread the floor apart with your feet.' Strengthening glute medius fixes this long-term.", source: "GPP Foundation biomechanics analysis, 2025", year: 2025 },
    lowHangingFruit: { tip: "Hit full depth \u2014 top of thigh below parallel. Research shows greater quad and glute activation at full depth vs. partial squats. Use heel elevation if ankle mobility is limiting.", source: "NSCA; practical application consensus", year: 2022 }
  },

  "Deadlift": {
    rest: { tip: "3\u20135 min minimum. Deadlifts are the most systemically fatiguing exercise. Even 3 vs 5 min shows no difference \u2014 3 min is sufficient if you're not doing max singles.", source: "Barbell Medicine; Schoenfeld lab rest interval research", year: 2023 },
    reps: { tip: "4\u20138 reps is the range where technique holds and fatigue doesn't compromise the lift. High-rep deadlifts increase injury risk as form degrades before muscular failure.", source: "Stronger by Science practical recommendations", year: 2022 },
    tempo: { tip: "Pull the slack out of the bar before initiating the lift. This creates tension through your whole chain and prevents the dangerous 'jerk' off the floor that loads your spine unevenly.", source: "Biomechanics consensus; NSCA coaching cues", year: 2022 },
    technique: { tip: "Bar stays in contact with your legs the entire pull. The moment it drifts forward, your lower back takes over from your legs \u2014 that's how backs get hurt.", source: "Bakhshinejad et al., Sports Medicine Open, 2025 \u2014 kinematics review", year: 2025 },
    mistakes: { tip: "Don't jerk the bar off the floor. Take the slack out first: push feet into the floor and feel tension in the bar before it moves. This fires your lats and protects your spine.", source: "NSCA; powerlifting coaching consensus", year: 2022 },
    lowHangingFruit: { tip: "Squeeze your lats like you're trying to put them in your back pockets before you pull. This stabilizes the bar path and prevents it from drifting forward.", source: "Practical strength coaching consensus", year: 2022 }
  },

  "Overhead Press": {
    rest: { tip: "2\u20133 min. OHP is highly CNS-demanding. Short rest compromises bar speed on subsequent sets significantly more than bench press.", source: "Schoenfeld lab; rest interval meta-analysis application", year: 2024 },
    reps: { tip: "5\u201310 reps. OHP has a narrow technique window \u2014 higher reps tend to cause excessive lumbar extension as a compensation when the shoulder fatigues.", source: "Stronger by Science recommendations", year: 2022 },
    tempo: { tip: "Lower the bar under control to your clavicles/upper chest. Don't drop it \u2014 the eccentric is where a lot of shoulder stability is built.", source: "Practical application consensus", year: 2022 },
    technique: { tip: "Squeeze your glutes and brace your core before pressing. This prevents lower back hyperextension, which is the #1 OHP injury cause.", source: "NSCA coaching guidelines", year: 2022 },
    mistakes: { tip: "Pressing in front of your face instead of over your head. As the bar passes your forehead, move your head back slightly so the bar travels in a vertical line over your base of support.", source: "Biomechanics consensus; Starting Strength principles", year: 2022 },
    lowHangingFruit: { tip: "Add a slight lean back at the top if you want more upper chest and front delt. But keep your hips forward \u2014 lean from your upper thoracic, not your lower back.", source: "Practical coaching application", year: 2022 }
  },

  "Barbell Row": {
    rest: { tip: "2\u20133 min. Rows are compound and tax your lower back as a stabilizer \u2014 especially if your form breaks down on shorter rest.", source: "Rest interval research applied to compound pulls", year: 2023 },
    reps: { tip: "8\u201315 reps. Unlike squats and deadlifts, rows don't limit you cardiovascularly at higher reps, making the moderate-high rep range ideal for lat hypertrophy.", source: "Stronger by Science \u2014 rowing exercise rep range guide", year: 2022 },
    tempo: { tip: "Pause at the top for 1 second and squeeze your lats. Most people use too much momentum \u2014 the pause eliminates that and makes the muscle do the work.", source: "Practical hypertrophy coaching consensus", year: 2022 },
    technique: { tip: "Hinge to about 45\u00b0 or parallel \u2014 chest up, neutral spine. Pull to your lower chest/upper abdomen, not your neck. Elbows travel back and slightly out.", source: "NSCA; biomechanics of rowing movements", year: 2022 },
    mistakes: { tip: "Using too much hip drive turns rows into a partial deadlift. If you're bouncing your torso to get the bar up, the weight is too heavy \u2014 drop 20% and feel the lats.", source: "Practical coaching; hypertrophy application", year: 2022 },
    lowHangingFruit: { tip: "Initiate the pull by retracting your shoulder blade first, then pull with your elbow. This cue dramatically improves lat activation vs. leading with the arm.", source: "Mind-muscle connection research; practical coaching", year: 2023 }
  },

  "Pull-ups": {
    rest: { tip: "2 min between sets. Pull-ups are relatively short-duration efforts \u2014 2 min is enough to recover your lat strength for the next set.", source: "Rest interval research applied to bodyweight compound pulls", year: 2023 },
    reps: { tip: "5\u201310 controlled reps per set. Going to failure on every set accumulates fatigue quickly and degrades range of motion. Leave 1\u20132 reps in reserve on early sets.", source: "Proximity-to-failure research; Refalo et al., Sports Med, 2023", year: 2023 },
    tempo: { tip: "Full hang at the bottom \u2014 don't short-range it. Full extension at the bottom is where the lat gets its greatest stretch, which is a key driver of hypertrophy.", source: "Range of motion and hypertrophy research", year: 2023 },
    technique: { tip: "Depress and retract your scapulae at the start of each rep before pulling. This pre-activates the lats and reduces bicep dominance.", source: "NSCA; practical lat activation cues", year: 2022 },
    mistakes: { tip: "Kipping (using hip swing) to get reps reduces lat time under tension and increases shoulder injury risk. If you can't do strict reps, do band-assisted pull-ups instead.", source: "Injury risk research; practical coaching", year: 2022 },
    lowHangingFruit: { tip: "Add a 2-second dead hang between reps. Eliminates momentum, forces the lat to initiate each rep from scratch, and significantly increases difficulty without adding weight.", source: "Practical hypertrophy application", year: 2022 }
  },

  "Lat Pulldown": {
    rest: { tip: "90s\u20132 min is sufficient. Lat pulldowns are less systemically fatiguing than pull-ups \u2014 shorter rest is fine.", source: "Rest interval research; isolation vs compound application", year: 2023 },
    reps: { tip: "10\u201315 reps. The lat pulldown is an isolation-adjacent movement \u2014 higher reps and a strong mind-muscle connection produce better hypertrophy than heavy, low-rep sets.", source: "Schoenfeld hypertrophy rep range meta-analysis", year: 2021 },
    tempo: { tip: "3-second eccentric (letting the bar rise slowly) significantly increases lat hypertrophy vs. letting the weight stack crash back up.", source: "Time under tension and eccentric training research", year: 2022 },
    technique: { tip: "Slight lean back (15\u201320\u00b0), pull the bar to your upper chest. Initiate with your elbows driving down and back \u2014 not your hands pulling down.", source: "Practical lat activation cues; NSCA", year: 2022 },
    mistakes: { tip: "Behind-the-neck pulldowns are not worth the injury risk. They compress the cervical spine and impinge the shoulder. Front pulldowns are equally effective and safer.", source: "Injury risk literature; coaching consensus", year: 2022 },
    lowHangingFruit: { tip: "On the last set, after hitting your reps, do slow partial reps from the top half of the movement. This extends the set and keeps tension on the lat in its shortened position.", source: "Mechanical tension / partial rep research", year: 2023 }
  },

  "Romanian Deadlift": {
    rest: { tip: "2\u20133 min. RDLs heavily load the hamstrings eccentrically \u2014 they cause significant DOMS and need adequate rest between sets to maintain quality.", source: "Eccentric loading research; rest interval application", year: 2023 },
    reps: { tip: "8\u201312 reps. RDLs benefit from moderate reps to fully exploit the eccentric hamstring stretch. Very low reps don't give enough time under tension to maximize growth.", source: "Hypertrophy rep range application to hamstring exercises", year: 2022 },
    tempo: { tip: "3-second lowering phase is key. The stretch of the hamstring under load is where the growth stimulus is. Rushing the descent throws away the best part of the lift.", source: "Eccentric hypertrophy research", year: 2022 },
    technique: { tip: "Hinge at the hip, not the waist. Push your hips back as if closing a door with your butt. Maintain neutral spine and keep bar close to your legs throughout.", source: "NSCA; hamstring biomechanics consensus", year: 2022 },
    mistakes: { tip: "Going too deep and rounding your lower back at the bottom. Stop when you feel a strong hamstring stretch \u2014 that's your end range regardless of how far the bar travels.", source: "Injury prevention; practical coaching", year: 2022 },
    lowHangingFruit: { tip: "Pause 1\u20132 seconds at the bottom with the bar at shin level. This eliminates the stretch reflex, forces your hamstrings to initiate the pull from a dead stop, and maximizes hypertrophic stimulus.", source: "Practical strength and hypertrophy application", year: 2022 }
  },

  "Leg Press": {
    rest: { tip: "2\u20133 min. Leg press is less systemically fatiguing than squats, so 2 min is sufficient for most work sets.", source: "Rest interval research applied to machine vs free weight", year: 2023 },
    reps: { tip: "10\u201315 reps works well. Leg press allows higher reps safely since there's no spinal loading \u2014 take advantage of that range for quad and glute volume.", source: "Schoenfeld hypertrophy rep range; machine exercise application", year: 2021 },
    tempo: { tip: "Don't lock out your knees at the top \u2014 it offloads the muscle and puts all the force on your joint. Stop 10\u201315\u00b0 short of full extension.", source: "Joint safety; practical coaching consensus", year: 2022 },
    technique: { tip: "Foot position matters: higher foot placement = more glute/hamstring. Lower = more quad. Wider = more inner quad (VMO). Experiment to match your goals.", source: "Leg press biomechanics research", year: 2022 },
    mistakes: { tip: "Lifting your butt off the pad at the bottom \u2014 this shifts load to your lower back. Control the depth so your hips stay flat throughout the full range.", source: "Injury prevention; practical coaching", year: 2022 },
    lowHangingFruit: { tip: "Go deeper than you think you need to. A 2019 meta-analysis found greater range of motion consistently produces more hypertrophy. If your hips stay on the pad, go lower.", source: "Bloomquist et al. meta-analysis; ROM and hypertrophy research", year: 2023 }
  },

  "Hip Thrust": {
    rest: { tip: "90s\u20132 min. Hip thrusts primarily load the glutes in a shortened position \u2014 recovery is faster than compound spine-loading exercises.", source: "Rest interval research; glute-specific exercise application", year: 2023 },
    reps: { tip: "10\u201320 reps. Research by Contreras (the Glute Guy) consistently shows glutes respond better to higher rep ranges than most muscles \u2014 15 reps is a sweet spot.", source: "Contreras et al.; glute EMG and hypertrophy research", year: 2022 },
    tempo: { tip: "1\u20132 second hold at full hip extension (top of movement). The glute is maximally activated in its shortened position \u2014 the pause exploits this.", source: "EMG research on glute activation; Contreras lab", year: 2022 },
    technique: { tip: "Chin to chest, not looking at the ceiling. This maintains a neutral spine and prevents your lower back from taking over. Drive through your heels, not your toes.", source: "NSCA; Contreras coaching cues", year: 2022 },
    mistakes: { tip: "Hyperextending your lower back at the top. Your hips should be parallel to the floor at lockout \u2014 any more is lumbar extension, not glute activation.", source: "Injury prevention; practical coaching", year: 2022 },
    lowHangingFruit: { tip: "Add a resistance band around your knees to prevent valgus and increase glute medius activation throughout the movement. This turns a single-muscle exercise into a more complete glute builder.", source: "Glute activation research; practical application", year: 2022 }
  },

  "Bicep Curls": {
    rest: { tip: "60\u201390s is sufficient. Bicep curls are an isolation exercise with low systemic fatigue \u2014 long rest is unnecessary and kills your pump.", source: "Rest interval research; isolation exercise application", year: 2023 },
    reps: { tip: "10\u201315 reps. The bicep is a small muscle that responds well to moderate-to-high reps. Heavy low-rep curls are often more elbow joint than bicep.", source: "Schoenfeld hypertrophy meta-analysis; isolation exercise application", year: 2021 },
    tempo: { tip: "3-second eccentric (lowering) dramatically increases bicep hypertrophy. Most people drop the weight back down \u2014 that's throwing away the best growth stimulus.", source: "Eccentric overload research; time under tension for small muscles", year: 2022 },
    technique: { tip: "Supinate (rotate) your wrist as you curl up \u2014 turn your pinky toward the ceiling at the top. This fully contracts the bicep in its shortened position.", source: "Bicep anatomy; EMG research on supination", year: 2022 },
    mistakes: { tip: "Swinging your torso to lift the weight means the weight is too heavy. Drop 20% and do strict reps \u2014 your biceps don't know how much is on the bar, they only know tension.", source: "Practical hypertrophy coaching consensus", year: 2022 },
    lowHangingFruit: { tip: "At the top of each rep, externally rotate your wrist (pinky up) and squeeze for 1 second. This small change significantly improves peak contraction and bicep thickness over time.", source: "Supination and bicep activation research", year: 2022 }
  },

  "Tricep Pushdown": {
    rest: { tip: "60\u201390s. Like all isolation exercises, tricep pushdowns recover quickly \u2014 long rest breaks the pump and wastes time.", source: "Rest interval research; isolation exercise application", year: 2023 },
    reps: { tip: "12\u201320 reps. Triceps respond well to higher reps when isolation work is the goal. The pushdown is great for high-rep sets after compound pressing.", source: "Hypertrophy rep range; tricep isolation application", year: 2021 },
    tempo: { tip: "Slow the eccentric down to 2\u20133 seconds. Triceps are a large muscle group that responds especially well to time under tension in isolation exercises.", source: "Time under tension; tricep hypertrophy research", year: 2022 },
    technique: { tip: "Lock your elbows to your sides \u2014 they should not move during the set. If they're drifting, you're using your lats and shoulders to assist.", source: "NSCA; tricep isolation cues", year: 2022 },
    mistakes: { tip: "Leaning too far over the bar to use your bodyweight. This turns a tricep exercise into a pressing movement. Stay upright, elbows glued to your sides.", source: "Practical coaching; EMG research", year: 2022 },
    lowHangingFruit: { tip: "At the bottom of the rep (arms fully extended), squeeze hard for 1 second. This peak contraction in the shortened position is where tricep hypertrophy is maximized.", source: "Mechanical tension research; practical application", year: 2022 }
  },

  "Lateral Raises": {
    rest: { tip: "60\u201390s. Lateral raises cause minimal systemic fatigue \u2014 short rest maintains pump and metabolic stress which are particularly important for small muscles.", source: "Rest interval research; deltoid isolation application", year: 2023 },
    reps: { tip: "15\u201330 reps. Lateral delts are a small muscle with a short range of motion. Higher reps accumulate more time under tension than heavier, lower-rep sets.", source: "Schoenfeld; isolation small muscle hypertrophy application", year: 2021 },
    tempo: { tip: "2-second raise, 3-second lower. The lateral delt is most activated in the mid-range and shortened position \u2014 a controlled tempo keeps tension there longer.", source: "EMG research on lateral delt activation", year: 2022 },
    technique: { tip: "Lead with your elbows, not your wrists. Slight forward lean (10\u201315\u00b0) and slight internal rotation (pinky slightly higher than thumb) maximizes lateral delt activation over front delt.", source: "Deltoid anatomy and EMG research", year: 2022 },
    mistakes: { tip: "Going too heavy and shrugging your traps to get the weight up. The lateral delt only needs a few pounds of load \u2014 ego kills form here faster than any other exercise.", source: "Practical coaching; EMG on trap activation during heavy laterals", year: 2022 },
    lowHangingFruit: { tip: "Cable lateral raises outperform dumbbells for lateral delt hypertrophy because they maintain tension at the bottom of the movement where dumbbells have zero load.", source: "Cable vs dumbbell tension curve research; practical application", year: 2023 }
  },

  "Face Pulls": {
    rest: { tip: "60\u201390s. Face pulls are an accessory movement \u2014 short rest is fine and helps accumulate volume efficiently.", source: "Rest interval; accessory exercise application", year: 2023 },
    reps: { tip: "15\u201325 reps. Face pulls are a corrective and hypertrophy exercise \u2014 higher reps build the rear delt and rotator cuff more effectively than heavy low-rep sets.", source: "Rear delt and rotator cuff hypertrophy research", year: 2022 },
    tempo: { tip: "Pull slowly and hold for 2 seconds at full external rotation (hands behind ears). This is where the rear delt and external rotators are fully activated.", source: "EMG research on rear delt and rotator cuff activation", year: 2022 },
    technique: { tip: "Set cable at face height. Pull toward your face with elbows high and out, rotating your hands so thumbs point back at the finish. Think 'double bicep pose at face level.'", source: "NSCA; rotator cuff activation cues", year: 2022 },
    mistakes: { tip: "Pulling to your neck or chest instead of your face \u2014 this turns it into a row and loses all the external rotation benefit that makes face pulls valuable for shoulder health.", source: "Practical coaching; shoulder injury prevention", year: 2022 },
    lowHangingFruit: { tip: "Do 3 sets of face pulls for every pressing session. Research links rear delt and external rotator weakness to most shoulder impingement injuries in lifters who press frequently.", source: "Shoulder injury prevention literature", year: 2023 }
  },

  "Hammer Curls": {
    rest: { tip: "60\u201390s. Isolation exercise \u2014 short rest is fine.", source: "Rest interval; isolation exercise application", year: 2023 },
    reps: { tip: "10\u201315 reps. Hammer curls target the brachialis and brachioradialis \u2014 these muscles respond well to moderate rep ranges with controlled tempo.", source: "Brachialis hypertrophy research; arm development literature", year: 2022 },
    tempo: { tip: "2-second eccentric. The brachialis (the muscle that pushes your bicep up and makes arms look bigger) responds especially well to time under tension in the stretched position.", source: "Brachialis anatomy; eccentric loading research", year: 2022 },
    technique: { tip: "True neutral grip \u2014 thumb on top, not a supinated grip. The whole point of hammer curls is to shift load from the bicep to the brachialis. Rotating your wrist defeats the purpose.", source: "Anatomy; EMG research on brachialis activation", year: 2022 },
    mistakes: { tip: "Using the same weight as regular curls. The brachialis is typically weaker than your bicep \u2014 start lighter and focus on full range of motion.", source: "Practical coaching application", year: 2022 },
    lowHangingFruit: { tip: "Alternate arms instead of curling both simultaneously. This gives each arm a slightly longer time under tension per set and improves the mind-muscle connection.", source: "Practical hypertrophy coaching", year: 2022 }
  },

  "Cable Row": {
    rest: { tip: "90s\u20132 min. Cable rows are compound \u2014 especially taxing when done heavy with full range of motion.", source: "Rest interval; compound pull application", year: 2023 },
    reps: { tip: "10\u201315 reps. Cable rows allow constant tension through the full range \u2014 take advantage of that with moderate-to-high reps.", source: "Cable vs free weight tension; hypertrophy application", year: 2022 },
    tempo: { tip: "Let the cable stretch your lats fully at the front (3-second stretch), pull explosively, hold 1 second at the back. This eccentric stretch is what makes cable rows better than machine rows for hypertrophy.", source: "Cable tension curve; eccentric loading research", year: 2022 },
    technique: { tip: "Don't rock your torso back to help the pull. Initiate with your shoulder blade retracting, then pull your elbow back. Torso stays near vertical.", source: "NSCA; lat activation cues", year: 2022 },
    mistakes: { tip: "Short-ranging the movement \u2014 only pulling halfway. The full stretch at the front is where the lat gets its greatest elongation under load, which is the primary hypertrophic stimulus.", source: "Range of motion and hypertrophy research", year: 2023 },
    lowHangingFruit: { tip: "Try a wide overhand grip for upper lats, and a close neutral grip for lower lat thickness. Varying grip across sessions targets different portions of the lat for complete development.", source: "EMG research on grip width and lat activation", year: 2022 }
  },

  "Leg Curl": {
    rest: { tip: "90s\u20132 min. Leg curls cause significant hamstring fatigue that impacts set quality \u2014 don't rush.", source: "Rest interval; hamstring isolation application", year: 2023 },
    reps: { tip: "10\u201315 reps. Hamstrings respond particularly well to moderate-high rep ranges in isolation exercises, especially with a focus on the eccentric.", source: "Hamstring hypertrophy research; isolation application", year: 2022 },
    tempo: { tip: "3-second eccentric (lowering the weight). The hamstring's greatest growth stimulus is in the lengthened position under load \u2014 don't rush the negative.", source: "Eccentric hamstring loading research", year: 2022 },
    technique: { tip: "Point your toes slightly during the curl \u2014 this pre-stretches the gastrocnemius and allows the hamstrings to be the primary mover rather than sharing load with the calves.", source: "Hamstring anatomy; practical coaching", year: 2022 },
    mistakes: { tip: "Letting your hips rise off the pad to get more range of motion \u2014 this means your hamstrings can't fully contract. Keep hips flat and reduce the weight if needed.", source: "Injury prevention; practical coaching", year: 2022 },
    lowHangingFruit: { tip: "Seated leg curls produce more hamstring hypertrophy than lying leg curls because the hamstring is stretched at the hip joint simultaneously \u2014 double the stretch stimulus.", source: "Sitting vs lying leg curl hypertrophy research, 2022", year: 2022 }
  },

  "Leg Extension": {
    rest: { tip: "60\u201390s. Leg extensions are isolation \u2014 short rest is fine and helps maintain quad pump.", source: "Rest interval; isolation application", year: 2023 },
    reps: { tip: "12\u201320 reps. Quad isolation exercises respond well to higher rep ranges. Heavy low-rep leg extensions put excessive stress on the patellar tendon.", source: "Patellar tendon research; quad hypertrophy literature", year: 2022 },
    tempo: { tip: "Squeeze at the top for 1\u20132 seconds. The quad is fully shortened at full extension \u2014 that peak contraction is the most potent stimulus for quad hypertrophy in this movement.", source: "EMG research; peak contraction and hypertrophy", year: 2022 },
    technique: { tip: "Adjust the seat so your knee joint aligns with the machine's pivot point. Misalignment creates shearing forces on the knee. Most people sit too far back.", source: "Biomechanics; knee joint safety research", year: 2022 },
    mistakes: { tip: "Going so heavy that you can't reach full extension. Partial reps on leg extensions don't load the quad at its shortened position \u2014 the peak of the movement is the whole point.", source: "Practical coaching; range of motion research", year: 2022 },
    lowHangingFruit: { tip: "Internal foot rotation (pigeon-toed) increases activation of the vastus medialis (teardrop). External rotation (toes out) hits vastus lateralis. Alternate to build complete quad development.", source: "EMG research on foot position and quad activation", year: 2022 }
  },

  "Calf Raises": {
    rest: { tip: "45\u201360s. Calves recover quickly and respond better to higher frequency and shorter rest than almost any other muscle.", source: "Calf training research; practical application", year: 2022 },
    reps: { tip: "15\u201330 reps. Calves are predominantly slow-twitch muscle fibers and are adapted to endurance \u2014 they require higher reps and more volume than most muscles.", source: "Calf fiber type research; hypertrophy application", year: 2022 },
    tempo: { tip: "3-second hold at the bottom in full stretch \u2014 this is the most important cue for calf growth. Most people bounce through the stretch reflex and never actually lengthen the muscle.", source: "Calf hypertrophy research; stretch-mediated growth", year: 2023 },
    technique: { tip: "Full range of motion is critical for calves \u2014 complete stretch at the bottom, complete plantar flexion at the top. Half reps are why most people's calves don't grow.", source: "ROM and hypertrophy research; calf application", year: 2022 },
    mistakes: { tip: "Not stretching at the bottom. The calf (specifically the soleus) has been shown to grow significantly more with full-stretch calf raises vs. partial reps. This single fix can restart stalled calf growth.", source: "Stretch-mediated hypertrophy research; Kassiano et al., 2022", year: 2022 },
    lowHangingFruit: { tip: "Train calves more frequently \u2014 4\u20136x per week with moderate volume. They're used every time you walk and are adapted to high frequency. Most people who train them once a week are leaving gains on the table.", source: "Calf frequency and hypertrophy research", year: 2022 }
  },

  "Dips": {
    rest: { tip: "2 min. Dips are a compound bodyweight movement that tax the chest, triceps, and anterior delts together.", source: "Rest interval; compound bodyweight exercise application", year: 2023 },
    reps: { tip: "8\u201315 reps. Dips allow a wide rep range \u2014 weighted dips at 6\u201310 reps for strength, bodyweight at 10\u201320 for hypertrophy.", source: "Compound exercise hypertrophy application", year: 2022 },
    tempo: { tip: "3-second descent, controlled. The pec stretch at the bottom of a dip is one of the deepest available for the chest \u2014 don't rush past it.", source: "Eccentric loading; pec stretch research", year: 2022 },
    technique: { tip: "Lean slightly forward for more chest emphasis. Upright torso shifts emphasis to triceps. Both are valid \u2014 choose based on your goal that day.", source: "Dip biomechanics; EMG chest vs tricep activation", year: 2022 },
    mistakes: { tip: "Going too deep with poor shoulder mobility. If your shoulders don't have the range, dips can impinge the AC joint. Go to 90\u00b0 at the elbow, not past it, until you've built the mobility.", source: "Shoulder injury prevention; practical coaching", year: 2022 },
    lowHangingFruit: { tip: "Add weight with a dip belt before you hit 15 clean reps. Bodyweight dips above 15 reps lose tension on the muscle \u2014 progressive loading is the only way to keep growing.", source: "Progressive overload application; practical coaching", year: 2022 }
  },

  "Incline Dumbbell Press": {
    rest: { tip: "2 min. Similar demands to flat bench \u2014 compound upper chest/shoulder movement.", source: "Rest interval; compound press application", year: 2023 },
    reps: { tip: "8\u201315 reps. Incline DB press allows more range of motion than barbell \u2014 use that with moderate reps to maximize pec stretch and shoulder stability.", source: "Hypertrophy rep range; incline press application", year: 2022 },
    tempo: { tip: "3-second lowering phase \u2014 bring the dumbbells below chest level to maximize upper pec stretch. This is the biggest advantage of dumbbells over barbells on incline.", source: "Range of motion and hypertrophy; dumbbell vs barbell press", year: 2022 },
    technique: { tip: "15\u201330\u00b0 incline is optimal for upper chest activation. Most incline benches are set too high (45\u00b0+) which shifts emphasis to anterior delts over upper pecs.", source: "EMG research on incline angle and pec activation, Trebs et al.", year: 2022 },
    mistakes: { tip: "Flaring your elbows to 90\u00b0. Keep them at 45\u201360\u00b0 to the torso \u2014 same as flat bench. Flaring shifts load to anterior delts and stresses the shoulder capsule.", source: "Bench press biomechanics applied to incline", year: 2022 },
    lowHangingFruit: { tip: "At the bottom of each rep, pause for 1 second and feel the stretch across your upper chest. Most people rush past this point \u2014 the pause doubles the stimulus.", source: "Stretch position hypertrophy research", year: 2023 }
  },

  "Chest Fly": {
    rest: { tip: "60\u201390s. Isolation movement \u2014 short rest is sufficient.", source: "Rest interval; isolation application", year: 2023 },
    reps: { tip: "12\u201320 reps. Flyes are a stretch-emphasis isolation exercise \u2014 higher reps with a controlled tempo maximize the hypertrophic benefit.", source: "Isolation exercise hypertrophy application", year: 2022 },
    tempo: { tip: "The stretch is everything on a fly. Lower slowly (3\u20134s) and feel the pec lengthen fully. A fly without a full stretch is just a partial movement that doesn't justify the shoulder risk.", source: "Stretch-mediated hypertrophy; pec isolation research", year: 2023 },
    technique: { tip: "Slight bend in the elbows \u2014 fixed throughout the set. Think 'hugging a barrel.' The arms don't curl or extend; only the shoulder joint moves.", source: "Fly mechanics; practical coaching", year: 2022 },
    mistakes: { tip: "Turning flies into a press by bending your elbows more as the weight gets heavy. If you're bending your arms significantly, use lighter weight \u2014 the movement should be purely shoulder adduction.", source: "Practical coaching; exercise mechanics", year: 2022 },
    lowHangingFruit: { tip: "Cable flyes maintain constant tension through the entire range of motion \u2014 dumbbells have zero tension at the top. For hypertrophy, cable flyes are superior to dumbbell flyes.", source: "Cable vs dumbbell tension curve; hypertrophy research", year: 2023 }
  },

  "Cable Crossover": {
    rest: { tip: "60\u201390s. Isolation exercise \u2014 short rest is fine.", source: "Rest interval; isolation application", year: 2023 },
    reps: { tip: "12\u201320 reps. Cable crossovers are a finishing/detail movement \u2014 higher reps with a peak contraction squeeze are the goal.", source: "Isolation exercise hypertrophy application", year: 2022 },
    tempo: { tip: "Slow and controlled throughout. Pause and squeeze at the crossed-over finish position \u2014 this is where the pec is shortest and peak contraction is strongest.", source: "EMG research; peak contraction training", year: 2022 },
    technique: { tip: "Cable height matters: high cables target lower pec, low cables target upper pec, mid cables target mid pec. Vary the height across your program for complete chest development.", source: "EMG research on cable crossover angles", year: 2022 },
    mistakes: { tip: "Using too much weight and turning it into a swing. The cable crossover is a precision movement \u2014 your core and hips should be completely still.", source: "Practical coaching; isolation exercise application", year: 2022 },
    lowHangingFruit: { tip: "Cross your hands at the finish position (right hand over left, then left over right on alternating reps). This extra range of motion squeezes the pec even harder in its fully shortened position.", source: "Range of motion; peak contraction research", year: 2022 }
  },

  "Lunges": {
    rest: { tip: "90s\u20132 min. Lunges create significant unilateral fatigue and cardiovascular demand \u2014 don't rush.", source: "Rest interval; unilateral exercise application", year: 2023 },
    reps: { tip: "10\u201316 reps per leg (20\u201332 total). Lunges work best with moderate-to-high reps \u2014 the coordination and balance demand already adds difficulty at any weight.", source: "Unilateral exercise hypertrophy application", year: 2022 },
    tempo: { tip: "3-second descent. The quad and glute are loaded eccentrically on the way down \u2014 that's where the growth stimulus is. Don't just drop into the lunge.", source: "Eccentric loading; lunge biomechanics", year: 2022 },
    technique: { tip: "Front shin should be nearly vertical at the bottom. If your knee shoots way past your toe, your step is too short \u2014 increase step length to protect the knee and maximize glute load.", source: "Lunge biomechanics; injury prevention", year: 2022 },
    mistakes: { tip: "Letting your torso lean forward excessively. This shifts load from the quad/glute to the lower back. Keep your chest up and torso upright throughout.", source: "Practical coaching; injury prevention", year: 2022 },
    lowHangingFruit: { tip: "Bulgarian split squats are the superior alternative to walking lunges for hypertrophy \u2014 greater glute and quad activation with less balance distraction. Swap them in when you're ready.", source: "Unilateral exercise comparison research", year: 2023 }
  }

};
