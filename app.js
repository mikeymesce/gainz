// ═══════════════════════════════════════════
// FEATURE FLAGS
// ═══════════════════════════════════════════
const FEATURES = {
  researchTips: true,
  progressiveOverload: true,
  hapticFeedback: true,
  confettiOnPR: true,
  screenWakeLock: true,
  offlineDetection: true,
  devMode: false,
};

const SCHEMA_VERSION = 6;

// ── Action Dispatcher ──
function dispatch(action, payload = {}) {
  if (FEATURES.devMode) console.log('[GAINZ dispatch]', action, payload);
  save();
  render();
}

// ── Computed Stats Cache ──
let statsCache = { dirty: true, tonnage: 0, prCount: 0, lastCalc: 0 };

// ═══════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════
const VERSION = "v5.1";

// ── PROGRESSIVE OVERLOAD INCREMENTS ──
// Based on exercise type and muscle group.
// Compounds (multi-joint, heavy): 5% — larger muscles, more room to grow
// Moderate compounds / upper body press: 2.5% — chest/shoulder/back pressing
// Isolation / small muscle: 2% — curls, raises, extensions — very limited range
// Source: 10% max/week rule (GymAware), 2-for-2 rule (NSCA/Baechle),
//         compound vs isolation loading research (Schoenfeld, Plotkin et al.)
const OVERLOAD_PCT = {
  // Heavy compounds — legs & back — 5%
  "Squat": 5,
  "Deadlift": 5,
  "Romanian Deadlift": 5,
  "Leg Press": 5,
  "Hip Thrust": 5,
  "Barbell Row": 5,
  // Moderate compounds — upper body press/pull — 2.5%
  "Bench Press": 2.5,
  "Overhead Press": 2.5,
  "Incline Dumbbell Press": 2.5,
  "Lat Pulldown": 2.5,
  "Cable Row": 2.5,
  "Pull-ups": 2.5,
  "Dips": 2.5,
  // Isolation / small muscle — 2%
  "Tricep Pushdown": 2,
  "Lateral Raises": 2,
  "Chest Fly": 2,
  "Cable Crossover": 2,
  "Face Pulls": 2,
  "Bicep Curls": 2,
  "Hammer Curls": 2,
  "Leg Curl": 2,
  "Leg Extension": 2,
  "Calf Raises": 2,
  "Lunges": 2,
};
const DEFAULT_OVERLOAD_PCT = 2.5; // fallback for custom exercises
// ── ALL EXERCISE GROUPS ──
const ALL_SPLITS = {
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
// All day-type metadata for the builder UI
const SPLIT_META = {
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
const PROGRAMS = {
  ppl:    { label:"Push / Pull / Legs",  emoji:"🔄", days:"3–4 days/wk", desc:"Classic strength + size split", splits:["Push","Pull","Legs","Core"] },
  bro:    { label:"Bro Split",           emoji:"💪", days:"5–6 days/wk", desc:"One muscle group per day",       splits:["Chest","Back","Shoulders","Arms","Legs","Core"] },
  ul:     { label:"Upper / Lower",       emoji:"⚡", days:"4 days/wk",   desc:"Great for strength & frequency", splits:["Upper","Lower","Upper","Lower"] },
  fullbody:{ label:"Full Body",          emoji:"🌐", days:"3 days/wk",   desc:"Max frequency, compound focus",  splits:["Full","Full","Full"] },
  arnold: { label:"Arnold Split",        emoji:"🏆", days:"6 days/wk",   desc:"Chest+Back / Shoulders+Arms / Legs", splits:["Chest","Back","Shoulders","Arms","Legs","Core"] },
  custom: { label:"Custom",             emoji:"✏️", days:"your choice", desc:"Build your own sequence",         splits:[] },
};
// Legacy alias — always equals the active splits for picker/progress compatibility
function getActiveSplits(){
  const prog = state.program || "ppl";
  if(prog === "custom") return state.customSplits && state.customSplits.length ? state.customSplits : ["Push","Pull","Legs"];
  return PROGRAMS[prog]?.splits || ["Push","Pull","Legs","Core"];
}
// SPLIT stays as a computed proxy for the current program's exercise lists
const SPLIT = new Proxy({}, { get(_,k){ return ALL_SPLITS[k]||[]; } });
const BW_EXERCISES = new Set(["Pull-ups","Dips","Lunges","Plank","Ab Wheel","Hanging Leg Raise","Russian Twist","Dead Bug","Sit-ups"]);
const DEFAULT_RESTS = {Squat:90,Deadlift:120,"Romanian Deadlift":90,"Leg Press":90,"Barbell Row":90,"Bench Press":90,"Overhead Press":90,"Pull-ups":60,"Dips":60};
// ── THEME ──
const THEMES = { gainz: { label:'GAINZ', bg:'#0a0a0a', accent:'#e8d5a0' } };
let activeTheme = localStorage.getItem("gainz_theme")||"gainz";
function applyTheme(t){ /* single theme */ }
const GLOBAL_DEFAULT = 45;
const SPLIT_COLORS={Push:'var(--accent)',Pull:'var(--superset)',Legs:'var(--green)',Core:'var(--superset)',Chest:'var(--accent)',Back:'var(--superset)',Arms:'var(--accent)',Shoulders:'var(--superset)',Upper:'var(--accent)',Lower:'var(--green)',Full:'var(--muted)'};

// ════════════════════════════════════════════════════════
// RESEARCH TIP DATABASE
// Sources: PubMed, Frontiers in Sports, Stronger by Science,
//          Schoenfeld Lab (CUNY Lehman), NSCA, Barbell Medicine
// Last updated: March 2026
// Each exercise gets tips across 6 categories:
//   rest, reps, tempo, technique, mistakes, lowHangingFruit
// ════════════════════════════════════════════════════════
const RESEARCH_TIPS = {

  "Bench Press": {
    rest: { tip: "Strength (RPE 8–10, ≥85% 1RM): 3–5 min — full phosphocreatine resynthesis takes ~3 min; cutting short directly costs reps. Hypertrophy (RPE 7–9, 65–80%): 2–3 min. The old '60–90s for metabolic stress' rule is debunked — longer rest produced MORE hypertrophy too, not just strength. There's no scenario where shorter rest wins.", source: "Schoenfeld, Pope, Benik et al. — J Strength Cond Res 30(7), 2016", year: 2016 },
    reps: { tip: "5–10 reps per set is the sweet spot. Moderate loads (6–12 reps) produce similar hypertrophy to low loads when volume is matched — but feel better on your shoulders.", source: "Schoenfeld et al., J Strength Cond Res, 2017 meta-analysis", year: 2017 },
    tempo: { tip: "Don't artificially slow reps to increase time under tension — it forces you to drop weight, which kills gains. Control the descent (2s down), explode up.", source: "Legion Athletics / Federal Univ São Carlos, 2018", year: 2018 },
    technique: { tip: "Retract and depress your scapulae before unracking. Maintain slight arch, feet flat. Bar should touch lower chest, not throat.", source: "Mausehund & Krosshaug, J Strength Cond Res, 2023", year: 2023 },
    mistakes: { tip: "Most common mistake: flaring elbows to 90°. Keep elbows at 45–75° from torso to reduce shoulder impingement and improve force transfer.", source: "Biomechanics research; Schoenfeld Lab", year: 2023 },
    lowHangingFruit: { tip: "Pause 1 second at the bottom on your last set. Eliminates bounce, increases pec activation, and builds strength out of the hole.", source: "NSCA / practical application consensus", year: 2022 }
  },

  "Squat": {
    rest: { tip: "3–5 min rest. Squats tax your CNS and cardiovascular system heavily. Short rest = velocity loss on subsequent sets = less total volume quality.", source: "Barbell Medicine meta-analysis; González-Hernández et al., Sports Biomechanics, 2023", year: 2023 },
    reps: { tip: "4–10 reps works best for squats. Higher reps get limited by cardiovascular fatigue before muscle fatigue, reducing hypertrophic stimulus.", source: "Stronger by Science / Schoenfeld 2021 rep continuum re-examination", year: 2021 },
    tempo: { tip: "Controlled descent (2–3s) improves positional strength and quad activation. Don't bounce at the bottom — it offloads the quads exactly when you want them working.", source: "Carzoli et al., J Sports Sci, 2019 — eccentric phase duration effects", year: 2019 },
    technique: { tip: "Valsalva maneuver is non-negotiable on heavy sets: big breath into your belly, brace hard before descent, release at top. This creates intra-abdominal pressure that protects your spine.", source: "NSCA guidelines; consensus biomechanics literature", year: 2022 },
    mistakes: { tip: "Knee valgus (knees caving in) is the most common and dangerous squat error. Cue: 'spread the floor apart with your feet.' Strengthening glute medius fixes this long-term.", source: "GPP Foundation biomechanics analysis, 2025", year: 2025 },
    lowHangingFruit: { tip: "Hit full depth — top of thigh below parallel. Research shows greater quad and glute activation at full depth vs. partial squats. Use heel elevation if ankle mobility is limiting.", source: "NSCA; practical application consensus", year: 2022 }
  },

  "Deadlift": {
    rest: { tip: "3–5 min minimum. Deadlifts are the most systemically fatiguing exercise. Even 3 vs 5 min shows no difference — 3 min is sufficient if you're not doing max singles.", source: "Barbell Medicine; Schoenfeld lab rest interval research", year: 2023 },
    reps: { tip: "4–8 reps is the range where technique holds and fatigue doesn't compromise the lift. High-rep deadlifts increase injury risk as form degrades before muscular failure.", source: "Stronger by Science practical recommendations", year: 2022 },
    tempo: { tip: "Pull the slack out of the bar before initiating the lift. This creates tension through your whole chain and prevents the dangerous 'jerk' off the floor that loads your spine unevenly.", source: "Biomechanics consensus; NSCA coaching cues", year: 2022 },
    technique: { tip: "Bar stays in contact with your legs the entire pull. The moment it drifts forward, your lower back takes over from your legs — that's how backs get hurt.", source: "Bakhshinejad et al., Sports Medicine Open, 2025 — kinematics review", year: 2025 },
    mistakes: { tip: "Don't jerk the bar off the floor. Take the slack out first: push feet into the floor and feel tension in the bar before it moves. This fires your lats and protects your spine.", source: "NSCA; powerlifting coaching consensus", year: 2022 },
    lowHangingFruit: { tip: "Squeeze your lats like you're trying to put them in your back pockets before you pull. This stabilizes the bar path and prevents it from drifting forward.", source: "Practical strength coaching consensus", year: 2022 }
  },

  "Overhead Press": {
    rest: { tip: "2–3 min. OHP is highly CNS-demanding. Short rest compromises bar speed on subsequent sets significantly more than bench press.", source: "Schoenfeld lab; rest interval meta-analysis application", year: 2024 },
    reps: { tip: "5–10 reps. OHP has a narrow technique window — higher reps tend to cause excessive lumbar extension as a compensation when the shoulder fatigues.", source: "Stronger by Science recommendations", year: 2022 },
    tempo: { tip: "Lower the bar under control to your clavicles/upper chest. Don't drop it — the eccentric is where a lot of shoulder stability is built.", source: "Practical application consensus", year: 2022 },
    technique: { tip: "Squeeze your glutes and brace your core before pressing. This prevents lower back hyperextension, which is the #1 OHP injury cause.", source: "NSCA coaching guidelines", year: 2022 },
    mistakes: { tip: "Pressing in front of your face instead of over your head. As the bar passes your forehead, move your head back slightly so the bar travels in a vertical line over your base of support.", source: "Biomechanics consensus; Starting Strength principles", year: 2022 },
    lowHangingFruit: { tip: "Add a slight lean back at the top if you want more upper chest and front delt. But keep your hips forward — lean from your upper thoracic, not your lower back.", source: "Practical coaching application", year: 2022 }
  },

  "Barbell Row": {
    rest: { tip: "2–3 min. Rows are compound and tax your lower back as a stabilizer — especially if your form breaks down on shorter rest.", source: "Rest interval research applied to compound pulls", year: 2023 },
    reps: { tip: "8–15 reps. Unlike squats and deadlifts, rows don't limit you cardiovascularly at higher reps, making the moderate-high rep range ideal for lat hypertrophy.", source: "Stronger by Science — rowing exercise rep range guide", year: 2022 },
    tempo: { tip: "Pause at the top for 1 second and squeeze your lats. Most people use too much momentum — the pause eliminates that and makes the muscle do the work.", source: "Practical hypertrophy coaching consensus", year: 2022 },
    technique: { tip: "Hinge to about 45° or parallel — chest up, neutral spine. Pull to your lower chest/upper abdomen, not your neck. Elbows travel back and slightly out.", source: "NSCA; biomechanics of rowing movements", year: 2022 },
    mistakes: { tip: "Using too much hip drive turns rows into a partial deadlift. If you're bouncing your torso to get the bar up, the weight is too heavy — drop 20% and feel the lats.", source: "Practical coaching; hypertrophy application", year: 2022 },
    lowHangingFruit: { tip: "Initiate the pull by retracting your shoulder blade first, then pull with your elbow. This cue dramatically improves lat activation vs. leading with the arm.", source: "Mind-muscle connection research; practical coaching", year: 2023 }
  },

  "Pull-ups": {
    rest: { tip: "2 min between sets. Pull-ups are relatively short-duration efforts — 2 min is enough to recover your lat strength for the next set.", source: "Rest interval research applied to bodyweight compound pulls", year: 2023 },
    reps: { tip: "5–10 controlled reps per set. Going to failure on every set accumulates fatigue quickly and degrades range of motion. Leave 1–2 reps in reserve on early sets.", source: "Proximity-to-failure research; Refalo et al., Sports Med, 2023", year: 2023 },
    tempo: { tip: "Full hang at the bottom — don't short-range it. Full extension at the bottom is where the lat gets its greatest stretch, which is a key driver of hypertrophy.", source: "Range of motion and hypertrophy research", year: 2023 },
    technique: { tip: "Depress and retract your scapulae at the start of each rep before pulling. This pre-activates the lats and reduces bicep dominance.", source: "NSCA; practical lat activation cues", year: 2022 },
    mistakes: { tip: "Kipping (using hip swing) to get reps reduces lat time under tension and increases shoulder injury risk. If you can't do strict reps, do band-assisted pull-ups instead.", source: "Injury risk research; practical coaching", year: 2022 },
    lowHangingFruit: { tip: "Add a 2-second dead hang between reps. Eliminates momentum, forces the lat to initiate each rep from scratch, and significantly increases difficulty without adding weight.", source: "Practical hypertrophy application", year: 2022 }
  },

  "Lat Pulldown": {
    rest: { tip: "90s–2 min is sufficient. Lat pulldowns are less systemically fatiguing than pull-ups — shorter rest is fine.", source: "Rest interval research; isolation vs compound application", year: 2023 },
    reps: { tip: "10–15 reps. The lat pulldown is an isolation-adjacent movement — higher reps and a strong mind-muscle connection produce better hypertrophy than heavy, low-rep sets.", source: "Schoenfeld hypertrophy rep range meta-analysis", year: 2021 },
    tempo: { tip: "3-second eccentric (letting the bar rise slowly) significantly increases lat hypertrophy vs. letting the weight stack crash back up.", source: "Time under tension and eccentric training research", year: 2022 },
    technique: { tip: "Slight lean back (15–20°), pull the bar to your upper chest. Initiate with your elbows driving down and back — not your hands pulling down.", source: "Practical lat activation cues; NSCA", year: 2022 },
    mistakes: { tip: "Behind-the-neck pulldowns are not worth the injury risk. They compress the cervical spine and impinge the shoulder. Front pulldowns are equally effective and safer.", source: "Injury risk literature; coaching consensus", year: 2022 },
    lowHangingFruit: { tip: "On the last set, after hitting your reps, do slow partial reps from the top half of the movement. This extends the set and keeps tension on the lat in its shortened position.", source: "Mechanical tension / partial rep research", year: 2023 }
  },

  "Romanian Deadlift": {
    rest: { tip: "2–3 min. RDLs heavily load the hamstrings eccentrically — they cause significant DOMS and need adequate rest between sets to maintain quality.", source: "Eccentric loading research; rest interval application", year: 2023 },
    reps: { tip: "8–12 reps. RDLs benefit from moderate reps to fully exploit the eccentric hamstring stretch. Very low reps don't give enough time under tension to maximize growth.", source: "Hypertrophy rep range application to hamstring exercises", year: 2022 },
    tempo: { tip: "3-second lowering phase is key. The stretch of the hamstring under load is where the growth stimulus is. Rushing the descent throws away the best part of the lift.", source: "Eccentric hypertrophy research", year: 2022 },
    technique: { tip: "Hinge at the hip, not the waist. Push your hips back as if closing a door with your butt. Maintain neutral spine and keep bar close to your legs throughout.", source: "NSCA; hamstring biomechanics consensus", year: 2022 },
    mistakes: { tip: "Going too deep and rounding your lower back at the bottom. Stop when you feel a strong hamstring stretch — that's your end range regardless of how far the bar travels.", source: "Injury prevention; practical coaching", year: 2022 },
    lowHangingFruit: { tip: "Pause 1–2 seconds at the bottom with the bar at shin level. This eliminates the stretch reflex, forces your hamstrings to initiate the pull from a dead stop, and maximizes hypertrophic stimulus.", source: "Practical strength and hypertrophy application", year: 2022 }
  },

  "Leg Press": {
    rest: { tip: "2–3 min. Leg press is less systemically fatiguing than squats, so 2 min is sufficient for most work sets.", source: "Rest interval research applied to machine vs free weight", year: 2023 },
    reps: { tip: "10–15 reps works well. Leg press allows higher reps safely since there's no spinal loading — take advantage of that range for quad and glute volume.", source: "Schoenfeld hypertrophy rep range; machine exercise application", year: 2021 },
    tempo: { tip: "Don't lock out your knees at the top — it offloads the muscle and puts all the force on your joint. Stop 10–15° short of full extension.", source: "Joint safety; practical coaching consensus", year: 2022 },
    technique: { tip: "Foot position matters: higher foot placement = more glute/hamstring. Lower = more quad. Wider = more inner quad (VMO). Experiment to match your goals.", source: "Leg press biomechanics research", year: 2022 },
    mistakes: { tip: "Lifting your butt off the pad at the bottom — this shifts load to your lower back. Control the depth so your hips stay flat throughout the full range.", source: "Injury prevention; practical coaching", year: 2022 },
    lowHangingFruit: { tip: "Go deeper than you think you need to. A 2019 meta-analysis found greater range of motion consistently produces more hypertrophy. If your hips stay on the pad, go lower.", source: "Bloomquist et al. meta-analysis; ROM and hypertrophy research", year: 2023 }
  },

  "Hip Thrust": {
    rest: { tip: "90s–2 min. Hip thrusts primarily load the glutes in a shortened position — recovery is faster than compound spine-loading exercises.", source: "Rest interval research; glute-specific exercise application", year: 2023 },
    reps: { tip: "10–20 reps. Research by Contreras (the Glute Guy) consistently shows glutes respond better to higher rep ranges than most muscles — 15 reps is a sweet spot.", source: "Contreras et al.; glute EMG and hypertrophy research", year: 2022 },
    tempo: { tip: "1–2 second hold at full hip extension (top of movement). The glute is maximally activated in its shortened position — the pause exploits this.", source: "EMG research on glute activation; Contreras lab", year: 2022 },
    technique: { tip: "Chin to chest, not looking at the ceiling. This maintains a neutral spine and prevents your lower back from taking over. Drive through your heels, not your toes.", source: "NSCA; Contreras coaching cues", year: 2022 },
    mistakes: { tip: "Hyperextending your lower back at the top. Your hips should be parallel to the floor at lockout — any more is lumbar extension, not glute activation.", source: "Injury prevention; practical coaching", year: 2022 },
    lowHangingFruit: { tip: "Add a resistance band around your knees to prevent valgus and increase glute medius activation throughout the movement. This turns a single-muscle exercise into a more complete glute builder.", source: "Glute activation research; practical application", year: 2022 }
  },

  "Bicep Curls": {
    rest: { tip: "60–90s is sufficient. Bicep curls are an isolation exercise with low systemic fatigue — long rest is unnecessary and kills your pump.", source: "Rest interval research; isolation exercise application", year: 2023 },
    reps: { tip: "10–15 reps. The bicep is a small muscle that responds well to moderate-to-high reps. Heavy low-rep curls are often more elbow joint than bicep.", source: "Schoenfeld hypertrophy meta-analysis; isolation exercise application", year: 2021 },
    tempo: { tip: "3-second eccentric (lowering) dramatically increases bicep hypertrophy. Most people drop the weight back down — that's throwing away the best growth stimulus.", source: "Eccentric overload research; time under tension for small muscles", year: 2022 },
    technique: { tip: "Supinate (rotate) your wrist as you curl up — turn your pinky toward the ceiling at the top. This fully contracts the bicep in its shortened position.", source: "Bicep anatomy; EMG research on supination", year: 2022 },
    mistakes: { tip: "Swinging your torso to lift the weight means the weight is too heavy. Drop 20% and do strict reps — your biceps don't know how much is on the bar, they only know tension.", source: "Practical hypertrophy coaching consensus", year: 2022 },
    lowHangingFruit: { tip: "At the top of each rep, externally rotate your wrist (pinky up) and squeeze for 1 second. This small change significantly improves peak contraction and bicep thickness over time.", source: "Supination and bicep activation research", year: 2022 }
  },

  "Tricep Pushdown": {
    rest: { tip: "60–90s. Like all isolation exercises, tricep pushdowns recover quickly — long rest breaks the pump and wastes time.", source: "Rest interval research; isolation exercise application", year: 2023 },
    reps: { tip: "12–20 reps. Triceps respond well to higher reps when isolation work is the goal. The pushdown is great for high-rep sets after compound pressing.", source: "Hypertrophy rep range; tricep isolation application", year: 2021 },
    tempo: { tip: "Slow the eccentric down to 2–3 seconds. Triceps are a large muscle group that responds especially well to time under tension in isolation exercises.", source: "Time under tension; tricep hypertrophy research", year: 2022 },
    technique: { tip: "Lock your elbows to your sides — they should not move during the set. If they're drifting, you're using your lats and shoulders to assist.", source: "NSCA; tricep isolation cues", year: 2022 },
    mistakes: { tip: "Leaning too far over the bar to use your bodyweight. This turns a tricep exercise into a pressing movement. Stay upright, elbows glued to your sides.", source: "Practical coaching; EMG research", year: 2022 },
    lowHangingFruit: { tip: "At the bottom of the rep (arms fully extended), squeeze hard for 1 second. This peak contraction in the shortened position is where tricep hypertrophy is maximized.", source: "Mechanical tension research; practical application", year: 2022 }
  },

  "Lateral Raises": {
    rest: { tip: "60–90s. Lateral raises cause minimal systemic fatigue — short rest maintains pump and metabolic stress which are particularly important for small muscles.", source: "Rest interval research; deltoid isolation application", year: 2023 },
    reps: { tip: "15–30 reps. Lateral delts are a small muscle with a short range of motion. Higher reps accumulate more time under tension than heavier, lower-rep sets.", source: "Schoenfeld; isolation small muscle hypertrophy application", year: 2021 },
    tempo: { tip: "2-second raise, 3-second lower. The lateral delt is most activated in the mid-range and shortened position — a controlled tempo keeps tension there longer.", source: "EMG research on lateral delt activation", year: 2022 },
    technique: { tip: "Lead with your elbows, not your wrists. Slight forward lean (10–15°) and slight internal rotation (pinky slightly higher than thumb) maximizes lateral delt activation over front delt.", source: "Deltoid anatomy and EMG research", year: 2022 },
    mistakes: { tip: "Going too heavy and shrugging your traps to get the weight up. The lateral delt only needs a few pounds of load — ego kills form here faster than any other exercise.", source: "Practical coaching; EMG on trap activation during heavy laterals", year: 2022 },
    lowHangingFruit: { tip: "Cable lateral raises outperform dumbbells for lateral delt hypertrophy because they maintain tension at the bottom of the movement where dumbbells have zero load.", source: "Cable vs dumbbell tension curve research; practical application", year: 2023 }
  },

  "Face Pulls": {
    rest: { tip: "60–90s. Face pulls are an accessory movement — short rest is fine and helps accumulate volume efficiently.", source: "Rest interval; accessory exercise application", year: 2023 },
    reps: { tip: "15–25 reps. Face pulls are a corrective and hypertrophy exercise — higher reps build the rear delt and rotator cuff more effectively than heavy low-rep sets.", source: "Rear delt and rotator cuff hypertrophy research", year: 2022 },
    tempo: { tip: "Pull slowly and hold for 2 seconds at full external rotation (hands behind ears). This is where the rear delt and external rotators are fully activated.", source: "EMG research on rear delt and rotator cuff activation", year: 2022 },
    technique: { tip: "Set cable at face height. Pull toward your face with elbows high and out, rotating your hands so thumbs point back at the finish. Think 'double bicep pose at face level.'", source: "NSCA; rotator cuff activation cues", year: 2022 },
    mistakes: { tip: "Pulling to your neck or chest instead of your face — this turns it into a row and loses all the external rotation benefit that makes face pulls valuable for shoulder health.", source: "Practical coaching; shoulder injury prevention", year: 2022 },
    lowHangingFruit: { tip: "Do 3 sets of face pulls for every pressing session. Research links rear delt and external rotator weakness to most shoulder impingement injuries in lifters who press frequently.", source: "Shoulder injury prevention literature", year: 2023 }
  },

  "Hammer Curls": {
    rest: { tip: "60–90s. Isolation exercise — short rest is fine.", source: "Rest interval; isolation exercise application", year: 2023 },
    reps: { tip: "10–15 reps. Hammer curls target the brachialis and brachioradialis — these muscles respond well to moderate rep ranges with controlled tempo.", source: "Brachialis hypertrophy research; arm development literature", year: 2022 },
    tempo: { tip: "2-second eccentric. The brachialis (the muscle that pushes your bicep up and makes arms look bigger) responds especially well to time under tension in the stretched position.", source: "Brachialis anatomy; eccentric loading research", year: 2022 },
    technique: { tip: "True neutral grip — thumb on top, not a supinated grip. The whole point of hammer curls is to shift load from the bicep to the brachialis. Rotating your wrist defeats the purpose.", source: "Anatomy; EMG research on brachialis activation", year: 2022 },
    mistakes: { tip: "Using the same weight as regular curls. The brachialis is typically weaker than your bicep — start lighter and focus on full range of motion.", source: "Practical coaching application", year: 2022 },
    lowHangingFruit: { tip: "Alternate arms instead of curling both simultaneously. This gives each arm a slightly longer time under tension per set and improves the mind-muscle connection.", source: "Practical hypertrophy coaching", year: 2022 }
  },

  "Cable Row": {
    rest: { tip: "90s–2 min. Cable rows are compound — especially taxing when done heavy with full range of motion.", source: "Rest interval; compound pull application", year: 2023 },
    reps: { tip: "10–15 reps. Cable rows allow constant tension through the full range — take advantage of that with moderate-to-high reps.", source: "Cable vs free weight tension; hypertrophy application", year: 2022 },
    tempo: { tip: "Let the cable stretch your lats fully at the front (3-second stretch), pull explosively, hold 1 second at the back. This eccentric stretch is what makes cable rows better than machine rows for hypertrophy.", source: "Cable tension curve; eccentric loading research", year: 2022 },
    technique: { tip: "Don't rock your torso back to help the pull. Initiate with your shoulder blade retracting, then pull your elbow back. Torso stays near vertical.", source: "NSCA; lat activation cues", year: 2022 },
    mistakes: { tip: "Short-ranging the movement — only pulling halfway. The full stretch at the front is where the lat gets its greatest elongation under load, which is the primary hypertrophic stimulus.", source: "Range of motion and hypertrophy research", year: 2023 },
    lowHangingFruit: { tip: "Try a wide overhand grip for upper lats, and a close neutral grip for lower lat thickness. Varying grip across sessions targets different portions of the lat for complete development.", source: "EMG research on grip width and lat activation", year: 2022 }
  },

  "Leg Curl": {
    rest: { tip: "90s–2 min. Leg curls cause significant hamstring fatigue that impacts set quality — don't rush.", source: "Rest interval; hamstring isolation application", year: 2023 },
    reps: { tip: "10–15 reps. Hamstrings respond particularly well to moderate-high rep ranges in isolation exercises, especially with a focus on the eccentric.", source: "Hamstring hypertrophy research; isolation application", year: 2022 },
    tempo: { tip: "3-second eccentric (lowering the weight). The hamstring's greatest growth stimulus is in the lengthened position under load — don't rush the negative.", source: "Eccentric hamstring loading research", year: 2022 },
    technique: { tip: "Point your toes slightly during the curl — this pre-stretches the gastrocnemius and allows the hamstrings to be the primary mover rather than sharing load with the calves.", source: "Hamstring anatomy; practical coaching", year: 2022 },
    mistakes: { tip: "Letting your hips rise off the pad to get more range of motion — this means your hamstrings can't fully contract. Keep hips flat and reduce the weight if needed.", source: "Injury prevention; practical coaching", year: 2022 },
    lowHangingFruit: { tip: "Seated leg curls produce more hamstring hypertrophy than lying leg curls because the hamstring is stretched at the hip joint simultaneously — double the stretch stimulus.", source: "Sitting vs lying leg curl hypertrophy research, 2022", year: 2022 }
  },

  "Leg Extension": {
    rest: { tip: "60–90s. Leg extensions are isolation — short rest is fine and helps maintain quad pump.", source: "Rest interval; isolation application", year: 2023 },
    reps: { tip: "12–20 reps. Quad isolation exercises respond well to higher rep ranges. Heavy low-rep leg extensions put excessive stress on the patellar tendon.", source: "Patellar tendon research; quad hypertrophy literature", year: 2022 },
    tempo: { tip: "Squeeze at the top for 1–2 seconds. The quad is fully shortened at full extension — that peak contraction is the most potent stimulus for quad hypertrophy in this movement.", source: "EMG research; peak contraction and hypertrophy", year: 2022 },
    technique: { tip: "Adjust the seat so your knee joint aligns with the machine's pivot point. Misalignment creates shearing forces on the knee. Most people sit too far back.", source: "Biomechanics; knee joint safety research", year: 2022 },
    mistakes: { tip: "Going so heavy that you can't reach full extension. Partial reps on leg extensions don't load the quad at its shortened position — the peak of the movement is the whole point.", source: "Practical coaching; range of motion research", year: 2022 },
    lowHangingFruit: { tip: "Internal foot rotation (pigeon-toed) increases activation of the vastus medialis (teardrop). External rotation (toes out) hits vastus lateralis. Alternate to build complete quad development.", source: "EMG research on foot position and quad activation", year: 2022 }
  },

  "Calf Raises": {
    rest: { tip: "45–60s. Calves recover quickly and respond better to higher frequency and shorter rest than almost any other muscle.", source: "Calf training research; practical application", year: 2022 },
    reps: { tip: "15–30 reps. Calves are predominantly slow-twitch muscle fibers and are adapted to endurance — they require higher reps and more volume than most muscles.", source: "Calf fiber type research; hypertrophy application", year: 2022 },
    tempo: { tip: "3-second hold at the bottom in full stretch — this is the most important cue for calf growth. Most people bounce through the stretch reflex and never actually lengthen the muscle.", source: "Calf hypertrophy research; stretch-mediated growth", year: 2023 },
    technique: { tip: "Full range of motion is critical for calves — complete stretch at the bottom, complete plantar flexion at the top. Half reps are why most people's calves don't grow.", source: "ROM and hypertrophy research; calf application", year: 2022 },
    mistakes: { tip: "Not stretching at the bottom. The calf (specifically the soleus) has been shown to grow significantly more with full-stretch calf raises vs. partial reps. This single fix can restart stalled calf growth.", source: "Stretch-mediated hypertrophy research; Kassiano et al., 2022", year: 2022 },
    lowHangingFruit: { tip: "Train calves more frequently — 4–6x per week with moderate volume. They're used every time you walk and are adapted to high frequency. Most people who train them once a week are leaving gains on the table.", source: "Calf frequency and hypertrophy research", year: 2022 }
  },

  "Dips": {
    rest: { tip: "2 min. Dips are a compound bodyweight movement that tax the chest, triceps, and anterior delts together.", source: "Rest interval; compound bodyweight exercise application", year: 2023 },
    reps: { tip: "8–15 reps. Dips allow a wide rep range — weighted dips at 6–10 reps for strength, bodyweight at 10–20 for hypertrophy.", source: "Compound exercise hypertrophy application", year: 2022 },
    tempo: { tip: "3-second descent, controlled. The pec stretch at the bottom of a dip is one of the deepest available for the chest — don't rush past it.", source: "Eccentric loading; pec stretch research", year: 2022 },
    technique: { tip: "Lean slightly forward for more chest emphasis. Upright torso shifts emphasis to triceps. Both are valid — choose based on your goal that day.", source: "Dip biomechanics; EMG chest vs tricep activation", year: 2022 },
    mistakes: { tip: "Going too deep with poor shoulder mobility. If your shoulders don't have the range, dips can impinge the AC joint. Go to 90° at the elbow, not past it, until you've built the mobility.", source: "Shoulder injury prevention; practical coaching", year: 2022 },
    lowHangingFruit: { tip: "Add weight with a dip belt before you hit 15 clean reps. Bodyweight dips above 15 reps lose tension on the muscle — progressive loading is the only way to keep growing.", source: "Progressive overload application; practical coaching", year: 2022 }
  },

  "Incline Dumbbell Press": {
    rest: { tip: "2 min. Similar demands to flat bench — compound upper chest/shoulder movement.", source: "Rest interval; compound press application", year: 2023 },
    reps: { tip: "8–15 reps. Incline DB press allows more range of motion than barbell — use that with moderate reps to maximize pec stretch and shoulder stability.", source: "Hypertrophy rep range; incline press application", year: 2022 },
    tempo: { tip: "3-second lowering phase — bring the dumbbells below chest level to maximize upper pec stretch. This is the biggest advantage of dumbbells over barbells on incline.", source: "Range of motion and hypertrophy; dumbbell vs barbell press", year: 2022 },
    technique: { tip: "15–30° incline is optimal for upper chest activation. Most incline benches are set too high (45°+) which shifts emphasis to anterior delts over upper pecs.", source: "EMG research on incline angle and pec activation, Trebs et al.", year: 2022 },
    mistakes: { tip: "Flaring your elbows to 90°. Keep them at 45–60° to the torso — same as flat bench. Flaring shifts load to anterior delts and stresses the shoulder capsule.", source: "Bench press biomechanics applied to incline", year: 2022 },
    lowHangingFruit: { tip: "At the bottom of each rep, pause for 1 second and feel the stretch across your upper chest. Most people rush past this point — the pause doubles the stimulus.", source: "Stretch position hypertrophy research", year: 2023 }
  },

  "Chest Fly": {
    rest: { tip: "60–90s. Isolation movement — short rest is sufficient.", source: "Rest interval; isolation application", year: 2023 },
    reps: { tip: "12–20 reps. Flyes are a stretch-emphasis isolation exercise — higher reps with a controlled tempo maximize the hypertrophic benefit.", source: "Isolation exercise hypertrophy application", year: 2022 },
    tempo: { tip: "The stretch is everything on a fly. Lower slowly (3–4s) and feel the pec lengthen fully. A fly without a full stretch is just a partial movement that doesn't justify the shoulder risk.", source: "Stretch-mediated hypertrophy; pec isolation research", year: 2023 },
    technique: { tip: "Slight bend in the elbows — fixed throughout the set. Think 'hugging a barrel.' The arms don't curl or extend; only the shoulder joint moves.", source: "Fly mechanics; practical coaching", year: 2022 },
    mistakes: { tip: "Turning flies into a press by bending your elbows more as the weight gets heavy. If you're bending your arms significantly, use lighter weight — the movement should be purely shoulder adduction.", source: "Practical coaching; exercise mechanics", year: 2022 },
    lowHangingFruit: { tip: "Cable flyes maintain constant tension through the entire range of motion — dumbbells have zero tension at the top. For hypertrophy, cable flyes are superior to dumbbell flyes.", source: "Cable vs dumbbell tension curve; hypertrophy research", year: 2023 }
  },

  "Cable Crossover": {
    rest: { tip: "60–90s. Isolation exercise — short rest is fine.", source: "Rest interval; isolation application", year: 2023 },
    reps: { tip: "12–20 reps. Cable crossovers are a finishing/detail movement — higher reps with a peak contraction squeeze are the goal.", source: "Isolation exercise hypertrophy application", year: 2022 },
    tempo: { tip: "Slow and controlled throughout. Pause and squeeze at the crossed-over finish position — this is where the pec is shortest and peak contraction is strongest.", source: "EMG research; peak contraction training", year: 2022 },
    technique: { tip: "Cable height matters: high cables target lower pec, low cables target upper pec, mid cables target mid pec. Vary the height across your program for complete chest development.", source: "EMG research on cable crossover angles", year: 2022 },
    mistakes: { tip: "Using too much weight and turning it into a swing. The cable crossover is a precision movement — your core and hips should be completely still.", source: "Practical coaching; isolation exercise application", year: 2022 },
    lowHangingFruit: { tip: "Cross your hands at the finish position (right hand over left, then left over right on alternating reps). This extra range of motion squeezes the pec even harder in its fully shortened position.", source: "Range of motion; peak contraction research", year: 2022 }
  },

  "Lunges": {
    rest: { tip: "90s–2 min. Lunges create significant unilateral fatigue and cardiovascular demand — don't rush.", source: "Rest interval; unilateral exercise application", year: 2023 },
    reps: { tip: "10–16 reps per leg (20–32 total). Lunges work best with moderate-to-high reps — the coordination and balance demand already adds difficulty at any weight.", source: "Unilateral exercise hypertrophy application", year: 2022 },
    tempo: { tip: "3-second descent. The quad and glute are loaded eccentrically on the way down — that's where the growth stimulus is. Don't just drop into the lunge.", source: "Eccentric loading; lunge biomechanics", year: 2022 },
    technique: { tip: "Front shin should be nearly vertical at the bottom. If your knee shoots way past your toe, your step is too short — increase step length to protect the knee and maximize glute load.", source: "Lunge biomechanics; injury prevention", year: 2022 },
    mistakes: { tip: "Letting your torso lean forward excessively. This shifts load from the quad/glute to the lower back. Keep your chest up and torso upright throughout.", source: "Practical coaching; injury prevention", year: 2022 },
    lowHangingFruit: { tip: "Bulgarian split squats are the superior alternative to walking lunges for hypertrophy — greater glute and quad activation with less balance distraction. Swap them in when you're ready.", source: "Unilateral exercise comparison research", year: 2023 }
  }

};

// Tip categories with display labels
const TIP_CATEGORIES = [
  { key: "rest",          label: "⏱ Rest",      color: "#a0c8e8" },
  { key: "reps",          label: "🔢 Reps",      color: "#e8d5a0" },
  { key: "tempo",         label: "⏳ Tempo",     color: "#a78bfa" },
  { key: "technique",     label: "✓ Technique",  color: "#6ee7a0" },
  { key: "mistakes",      label: "⚠ Mistakes",   color: "#e07070" },
  { key: "lowHangingFruit",label: "💡 Quick Win", color: "#f0a070" }
];
const TAG_COLORS = {Push:"",Pull:"pull",Legs:"legs",Core:"core",Chest:"",Back:"pull",Arms:"arms",Shoulders:"shoulders",Upper:"",Lower:"legs",Full:"core"};

// ── State load with validation + migration ──
let _rawState = null;
try {
  _rawState = JSON.parse(localStorage.getItem("gainz_v5") || "null");
} catch(e) {
  logDebug("❌ State parse error — resetting to defaults");
  setTimeout(()=>showToast("Data restored to defaults"), 500);
}
function migrateState(s) {
  if (!s) return { workouts:[], exerciseRests:{...DEFAULT_RESTS}, streak:0, lastWorkoutDate:null, splitNames:{Push:"Push",Pull:"Pull",Legs:"Legs",Core:"Core",Chest:"Chest",Back:"Back",Arms:"Arms",Shoulders:"Shoulders"}, stacks:[], program:"ppl", schemaVersion: SCHEMA_VERSION };
  if (!s.workouts) s.workouts = [];
  if (!s.exerciseRests) s.exerciseRests = {...DEFAULT_RESTS};
  if (s.streak === undefined) s.streak = 0;
  if (!s.lastWorkoutDate) s.lastWorkoutDate = null;
  if (!s.splitNames) s.splitNames = {};
  // Ensure all split display names exist
  const allSplitKeys=["Push","Pull","Legs","Core","Chest","Back","Arms","Shoulders","Upper","Lower","Full"];
  allSplitKeys.forEach(k=>{ if(!s.splitNames[k]) s.splitNames[k]=k; });
  if (!s.stacks) s.stacks = [];
  if (!s.program) s.program = "ppl";
  if (!s.bodyweight) s.bodyweight = [];
  if(!s.customSplits) s.customSplits = [...(PROGRAMS[s.program||'ppl']?.splits||['Push','Pull','Legs','Core'])];
  if(!s.templates) s.templates = [];
  s.schemaVersion = SCHEMA_VERSION;
  return s;
}
function splitName(key){ return (state.splitNames&&state.splitNames[key])||key; }
function setProgram(p){
  state.program=p;
  if(p !== "custom") state.customSplits = [...(PROGRAMS[p]?.splits||[])];
  saveImmediate();
  render();
  showToast('Switched to '+(PROGRAMS[p]?.label||p));
}
let state = migrateState(_rawState);
let activeWorkout = null;
let screen = "start";
let historyDetail = null;
let progressEx = null;
let dismissedTips = new Set();
let shownTips = new Set(); // tips explicitly opened by user (hidden by default mid-workout)
let activeTipCat = {};
let timerInterval = null;
let timerLeft = 0;
let woTimerInterval = null;
let woStartTime = null;
let collapsedEx = new Set();
let doneExSet   = new Set(); // exercises marked done this session
let renamingEx = null;

// ═══════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════
let saveTimer = null;
function _writeStorage(){ try{ localStorage.setItem('gainz_v5',JSON.stringify(state)); checkStorageQuota(); }catch(e){ logDebug('❌ Save failed: '+e.message); } }
function debouncedSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    _writeStorage();
  }, 300);
}
function saveImmediate() {
  clearTimeout(saveTimer);
  _writeStorage();
}
function save() { statsCache.dirty = true; debouncedSave(); logDebug("💾 save()"); }
function checkStorageQuota() {
  try {
    const used = new Blob([localStorage.getItem("gainz_v5") || ""]).size;
    if (used > 4 * 1024 * 1024) showToast("Storage nearly full — export your data in Settings");
  } catch(e) {}
}
function today(){ return new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}); }
function todayStr(){ return new Date().toDateString(); }
function fmt(s){ s=Math.max(0,s); return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`; }
function fmtMs(ms){ const s=Math.floor(ms/1000),m=Math.floor(s/60); return `${m}:${String(s%60).padStart(2,"0")}`; }
function vol(sets){ return sets.reduce((a,s)=>a+(s.bw||s.warmup?0:(parseFloat(s.weight)||0))*(parseInt(s.reps)||0),0); }
function est1RM(w,r){ const wn=parseFloat(w)||0,rn=parseInt(r)||1; return rn===1?Math.round(wn):Math.round(wn*(1+rn/30)); }
function sid(n){ return (n||"").replace(/[^a-zA-Z0-9]/g,"-"); }
// Safe string for onclick attrs - replaces " with &quot; so it doesn't break HTML attributes
function esc(v){ return JSON.stringify(v).replace(/"/g,'&quot;'); }
function sanitize(str){ return String(str||"").replace(/[<>"'`\\]/g,"").trim().slice(0,100); }

// ── Toast ──
function showToast(msg, duration=3000){
  const el=document.createElement("div");
  el.className="gainz-toast";
  el.textContent=msg;
  document.body.appendChild(el);
  requestAnimationFrame(()=>el.style.opacity="1");
  setTimeout(()=>{el.style.opacity="0";setTimeout(()=>el.remove(),200);},duration);
}

// ── Haptic ──
function haptic(type="light"){
  if(!FEATURES.hapticFeedback||!navigator.vibrate) return;
  const patterns={light:[10],medium:[20],heavy:[30,10,30],success:[10,50,10],pr:[30,20,30,20,60]};
  navigator.vibrate(patterns[type]||[10]);
}

// ── Confetti ──
function confetti(){
  if(!FEATURES.confettiOnPR) return;
  const colors=["#e8d5a0","#c8b070","#ffffff","#52c87a"];
  for(let i=0;i<30;i++){
    const el=document.createElement("div");
    el.style.cssText=`position:fixed;top:20%;left:${Math.random()*100}%;width:8px;height:8px;background:${colors[i%4]};border-radius:50%;pointer-events:none;z-index:9999;animation:confettiFall 1.2s ease-out forwards;animation-delay:${Math.random()*0.3}s`;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),1800);
  }
}

// ── Screen Wake Lock ──
let wakeLock=null;
async function requestWakeLock(){
  if(!FEATURES.screenWakeLock) return;
  try{ if("wakeLock" in navigator) wakeLock=await navigator.wakeLock.request("screen"); }catch(e){}
}
function releaseWakeLock(){ if(wakeLock){wakeLock.release();wakeLock=null;} }

// ── Offline Detection ──
function checkOnline(){
  if(!FEATURES.offlineDetection) return;
  if(!navigator.onLine) showToast("Offline — app works fine, fonts may not load");
}
window.addEventListener("offline",()=>showToast("Gone offline — data saves locally"));
window.addEventListener("online",()=>showToast("Back online"));

function getRec(){
  const sp=getActiveSplits();
  const last=state.workouts.slice(0,sp.length+2).map(w=>w.split);
  for(const s of sp) if(!last.includes(s)) return s;
  const c=sp.map(s=>last.filter(x=>x===s).length);
  return sp[c.indexOf(Math.min(...c))];
}
function getLastSession(name){
  for(const w of state.workouts){
    const e=w.exercises.find(e=>e.name===name);
    if(e&&e.sets.length) return e;
  }
  return null;
}
function isPR(name, weight, isWarmup){
  if(isWarmup) return false;
  if(!weight||isNaN(parseFloat(weight))) return false;
  const w=parseFloat(weight);
  // Check saved history
  for(const wo of state.workouts){
    const e=wo.exercises.find(e=>e.name===name);
    if(e) for(const s of e.sets) if(!s.bw&&!s.warmup&&parseFloat(s.weight)>=w) return false;
  }
  // Also check current session — can't PR at 207 if you just hit 210 this workout
  if(activeWorkout){
    const e=activeWorkout.exercises.find(e=>e.name===name);
    if(e) for(const s of e.sets) if(!s.bw&&!s.warmup&&parseFloat(s.weight)>=w) return false;
  }
  return true;
}

// ── MUSCLE GROUP MRV (well-established ranges only) ──
// Source: Israetel et al. "Scientific Principles of Hypertrophy Training" (RP Strength)
// Only muscles with strong consensus — excludes uncertain ones like forearms, traps
const MRV = {
  chest:    { label:"Chest",     mrv:20, mev:10, icon:"🫁" },
  back:     { label:"Back",      mrv:25, mev:10, icon:"🔙" },
  shoulders:{ label:"Shoulders", mrv:20, mev:16, icon:"💪" },
  biceps:   { label:"Biceps",    mrv:20, mev:14, icon:"💪" },
  triceps:  { label:"Triceps",   mrv:20, mev:10, icon:"💪" },
  quads:    { label:"Quads",     mrv:20, mev:8,  icon:"🦵" },
  hamstrings:{ label:"Hamstrings",mrv:20, mev:10, icon:"🦵" },
  glutes:   { label:"Glutes",    mrv:16, mev:8,  icon:"🍑" },
};
// Map exercises to primary muscle(s)
const EX_MUSCLES = {
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
function getWeeklyMuscleSets(){
  const weekStart=new Date(); weekStart.setDate(weekStart.getDate()-weekStart.getDay()); weekStart.setHours(0,0,0,0);
  const counts={};
  Object.keys(MRV).forEach(m=>counts[m]=0);
  state.workouts.filter(w=>new Date(w.timestamp)>=weekStart).forEach(w=>{
    w.exercises.forEach(e=>{
      const muscles=EX_MUSCLES[e.name]||[];
      const workSets=e.sets.filter(s=>!s.warmup).length;
      muscles.forEach((m,mi)=>{
        // Primary muscle gets full credit, secondaries get 0.5
        counts[m]=(counts[m]||0)+(mi===0?workSets:Math.ceil(workSets*0.5));
      });
    });
  });
  return counts;
}
// ── REST RECOMMENDATIONS (evidence-based) ──
const REST_RECS = {
  strength:  { label:"Strength Sets",  rest:"3–5 min", why:"CNS & phosphocreatine full recovery (Willardson 2006)", icon:"🏋️" },
  hypertrophy:{ label:"Hypertrophy Sets",rest:"1–2 min", why:"Metabolic stress + GH response optimised (Schoenfeld 2010)", icon:"💪" },
  endurance: { label:"Endurance/High-rep",rest:"30–60s", why:"Maintains glycolytic stimulus (NSCA guidelines)", icon:"🔥" },
  compound:  { label:"Heavy compounds (Squat/DL/Row)",rest:"3–5 min", why:"Multi-joint fatigue requires longer restoration", icon:"⚡" },
  isolation:  { label:"Isolation exercises",rest:"60–90s", why:"Smaller muscle mass, faster local recovery", icon:"🎯" },
};

// ── SUGGESTED WEIGHT (progressive overload) ──
// Logic: if you completed all reps in your last session's sets,
// suggest an increase based on exercise-specific percentage.
// Round to nearest 2.5lb (smallest standard plate increment).
// If you left reps on the table, suggest same weight.
function getSuggestedWeight(name){
  const last = getLastSession(name);
  if(!last || !last.sets.length) return null;
  // Only applies to weighted exercises
  const weightedSets = last.sets.filter(s => !s.bw && parseFloat(s.weight) > 0);
  if(!weightedSets.length) return null;

  const lastWeight = parseFloat(weightedSets[weightedSets.length-1].weight);
  const lastReps = parseInt(weightedSets[weightedSets.length-1].reps);
  if(!lastWeight || !lastReps) return null;

  // Check if all sets hit their reps (simple heuristic: last set completed)
  // If reps >= 8 for isolation or >= 5 for compounds, suggest increase
  // This mirrors the NSCA 2-for-2 rule spirit
  const pct = (OVERLOAD_PCT[name] ?? DEFAULT_OVERLOAD_PCT) / 100;
  const minRepsToProgress = (OVERLOAD_PCT[name] >= 5) ? 5 : 8;
  const shouldIncrease = lastReps >= minRepsToProgress;

  if(!shouldIncrease) return { weight: lastWeight, same: true };

  const raw = lastWeight * (1 + pct);
  // Round to nearest 2.5lb
  const rounded = Math.round(raw / 2.5) * 2.5;
  return { weight: rounded, same: false, pct: OVERLOAD_PCT[name] ?? DEFAULT_OVERLOAD_PCT };
}

// ═══════════════════════════════════════════
// AUDIO
// ═══════════════════════════════════════════
function playBeep(){
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    [[0,440,0.8],[1.0,523,0.8]].forEach(([start,freq,dur])=>{
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type="sine"; o.frequency.value=freq;
      g.gain.setValueAtTime(0,ctx.currentTime+start);
      g.gain.linearRampToValueAtTime(0.15,ctx.currentTime+start+0.12);
      g.gain.setValueAtTime(0.15,ctx.currentTime+start+dur-0.2);
      g.gain.linearRampToValueAtTime(0,ctx.currentTime+start+dur);
      o.start(ctx.currentTime+start); o.stop(ctx.currentTime+start+dur+0.05);
    });
  }catch(e){}
}

// ═══════════════════════════════════════════
// TIMERS
// ═══════════════════════════════════════════
function startTimer(exercise){
  const rest=state.exerciseRests[exercise]??GLOBAL_DEFAULT;
  timerLeft=rest;
  clearInterval(timerInterval);
  const bar=document.getElementById("timer-bar");
  bar.classList.add("active");
  document.getElementById("timer-label").textContent=exercise.toUpperCase();
  refreshTimerNum();
  let overCount=0;
  timerInterval=setInterval(()=>{
    timerLeft--;
    if(timerLeft>0){
      refreshTimerNum();
    } else if(timerLeft===0){
      clearInterval(timerInterval);
      playBeep();
      const d=document.getElementById("timer-display");
      if(d) d.innerHTML=`<div class="timer-done">✓ GO</div>`;
      // Count UP after zero — shows how long over rest
      timerInterval=setInterval(()=>{
        overCount++;
        const d2=document.getElementById("timer-display");
        if(d2) d2.innerHTML=`<div class="timer-num" id="timer-num" style="color:var(--muted);font-size:20px;">+${fmt(overCount)}</div>`;
      },1000);
    }
  },1000);
}
function refreshTimerNum(){ const e=document.getElementById("timer-num"); if(e) e.textContent=fmt(timerLeft); }
function adjTimer(d){ timerLeft=Math.max(5,timerLeft+d); refreshTimerNum(); }
function skipTimer(){ clearInterval(timerInterval); const b=document.getElementById("timer-bar"); if(b) b.classList.remove("active"); const d=document.getElementById("timer-display"); if(d) d.innerHTML=`<div class="timer-num" id="timer-num">0:00</div>`; }

function startWoTimer(){
  woStartTime=Date.now();
  clearInterval(woTimerInterval);
  const el=document.getElementById("wo-timer");
  el.style.display="block";
  woTimerInterval=setInterval(()=>{
    const el=document.getElementById("wo-timer");
    if(el&&woStartTime) el.textContent=fmtMs(Date.now()-woStartTime);
  },1000);
}
function stopWoTimer(){
  clearInterval(woTimerInterval); woStartTime=null;
  const el=document.getElementById("wo-timer"); if(el) el.style.display="none";
}

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
  let avail = (ALL_SPLITS[activeWorkout.split]||[]).filter(e=>!activeWorkout.exercises.find(x=>x.name===e));
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
let libOpenEx = null;
let libActiveCat = {};

// Apply theme after ALL state vars initialized
applyTheme(activeTheme);

function openLibrary(){
  const el = document.getElementById("res-library");
  const list = document.getElementById("res-library-list");
  const exercises = Object.keys(RESEARCH_TIPS).sort();
  list.innerHTML = exercises.map(ex=>{
    const isOpen = libOpenEx===ex;
    const firstTip = RESEARCH_TIPS[ex][TIP_CATEGORIES[0].key];
    const tabs = TIP_CATEGORIES.map(c=>{
      const active = (libActiveCat[ex]||TIP_CATEGORIES[0].key)===c.key;
      return `<button style="font-size:9px;padding:5px 10px;border-radius:8px;border:1px solid ${active?c.color:'#1e1e24'};background:${active?c.color+'22':'transparent'};color:${active?c.color:'var(--muted)'};font-family:'DM Sans',sans-serif;cursor:pointer;letter-spacing:1px;transition:all .15s;margin:2px;" onclick="libSetCat(${esc(ex)},${esc(c.key)});event.stopPropagation();">${c.label}</button>`;
    }).join("");
    const cat = libActiveCat[ex]||TIP_CATEGORIES[0].key;
    const tipData = RESEARCH_TIPS[ex][cat];
    return `<div class="lib-ex-card${isOpen?" open":""}" onclick="libToggle(${esc(ex)})">
      <div class="lib-ex-name">${ex}<span class="pick-badge">📚</span></div>
      ${!isOpen?`<div class="lib-ex-preview">${firstTip?firstTip.tip.slice(0,60)+"…":""}</div>`:""}
      <div class="lib-detail">
        <div class="lib-tab-row">${tabs}</div>
        ${tipData?`<div class="lib-tip-body">${tipData.tip}</div><div class="lib-tip-src">${tipData.source} (${tipData.year})</div>`:""}
      </div>
    </div>`;
  }).join("");
  el.classList.add("open");
}

function closeLibrary(){
  document.getElementById("res-library").classList.remove("open");
}

function libToggle(ex){
  libOpenEx = libOpenEx===ex ? null : ex;
  openLibrary();
}

function libSetCat(ex, cat){
  libActiveCat[ex]=cat;
  openLibrary();
}
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
    <button class="btn ghost" onclick="saveAsTemplate();hideModal();finishWorkout()" style="margin-top:8px;font-size:11px;">📋 SAVE AS TEMPLATE + FINISH</button>
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
  if(nw&&nw!==old&&activeWorkout){
    activeWorkout.exercises=activeWorkout.exercises.map(e=>e.name===old?{...e,name:nw}:e);
    if(state.exerciseRests[old]!==undefined){ state.exerciseRests[nw]=state.exerciseRests[old]; save(); }
    if(collapsedEx.has(old)){ collapsedEx.delete(old); collapsedEx.add(nw); }
  }
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
let workoutSummary=null;
let expandedLastSession=new Set();
let activeSSPrompt=null; // name of exercise user should do next in superset
let ssPickerOpen=null;  // exercise name whose SS picker is open
let exMenuOpen=null;    // exercise name whose ⋮ overflow menu is open
let histEditMode=false;
let meTab="history";
let progressSearch="";
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
  render();
  setTimeout(openPicker, 100);
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
  maybeShowCoachTip();
}
function logSet(n){
  const id=sid(n);
  const ex=activeWorkout.exercises.find(e=>e.name===n);
  const bw=ex?.bwMode;
  let w=bw?"BW":(document.getElementById("w-"+id)?.value||"").trim();
  let r=(document.getElementById("r-"+id)?.value||"").trim();
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
  const wasPR=!bw&&isPR(n,w,isWarmup);
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
      timerLeft=rest;
      clearInterval(timerInterval);
      const _bar=document.getElementById('timer-bar');
      if(_bar) _bar.classList.add('active');
      const _lbl=document.getElementById('timer-label');
      if(_lbl) _lbl.textContent=n.toUpperCase();
      refreshTimerNum();
      let _over=0;
      timerInterval=setInterval(()=>{
        timerLeft--;
        if(timerLeft>0){ refreshTimerNum(); }
        else if(timerLeft===0){
          clearInterval(timerInterval); playBeep();
          const _d=document.getElementById('timer-display');
          if(_d) _d.innerHTML='<div class="timer-done">✓ GO</div>';
          timerInterval=setInterval(()=>{ _over++; const _d2=document.getElementById('timer-display'); if(_d2) _d2.innerHTML='<div class="timer-num" id="timer-num" style="color:var(--muted);font-size:20px;">+'+fmt(_over)+'</div>'; },1000);
        }
      },1000);
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
function copyLastSet(n){
  const ex=activeWorkout?.exercises.find(e=>e.name===n);
  if(!ex||!ex.sets.length) return;
  const prev=ex.sets[ex.sets.length-1];
  const isWarmup=!!ex.warmupNext;
  const wasPR=!prev.bw&&!isWarmup&&isPR(n,prev.weight,false);
  const newSet={...prev,time:Date.now(),pr:wasPR||undefined,warmup:isWarmup||undefined};
  if(ex) ex.warmupNext=false;
  ex.sets.push(newSet);
  if(wasPR){ confetti(); haptic('pr'); showToast('New PR! '+prev.weight+'lb'); }
  else haptic('light');
  setHistory.push({exerciseName:n,setIndex:ex.sets.length-1});
  if(!prev.bw) startTimer(n);
  try{ localStorage.setItem('gainz_recovery',JSON.stringify(activeWorkout)); }catch(e){}
  logDebug('copyLastSet: '+n+' '+JSON.stringify(newSet));
  render();
}
function deleteSet(exName,idx){
  const ex=activeWorkout?.exercises.find(e=>e.name===exName);
  if(ex){ ex.sets.splice(idx,1); render(); }
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
  logDebug("🗑 Exercise removed: "+name);
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
  state.bodyweight.unshift({date:today(),timestamp:Date.now(),weight:val});
  state.bodyweight=state.bodyweight.slice(0,90);
  save();
  showToast("Bodyweight logged ✓");
  render();
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
    // Temporarily override timerLeft directly then start the interval
    timerLeft = travelRest;
    clearInterval(timerInterval);
    const bar = document.getElementById('timer-bar');
    if(bar) bar.classList.add('active');
    const lbl = document.getElementById('timer-label');
    if(lbl) lbl.textContent = ('→ ' + next.name).toUpperCase();
    refreshTimerNum();
    let overCount = 0;
    timerInterval = setInterval(()=>{
      timerLeft--;
      if(timerLeft > 0){
        refreshTimerNum();
      } else if(timerLeft === 0){
        clearInterval(timerInterval);
        playBeep();
        const d = document.getElementById('timer-display');
        if(d) d.innerHTML = `<div class="timer-done">✓ GO</div>`;
        timerInterval = setInterval(()=>{
          overCount++;
          const d2 = document.getElementById('timer-display');
          if(d2) d2.innerHTML = `<div class="timer-num" id="timer-num" style="color:var(--muted);font-size:20px;">+${fmt(overCount)}</div>`;
        }, 1000);
      }
    }, 1000);
    render();
    setTimeout(()=>{
      const el = document.getElementById('ex-'+sid(next.name));
      if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
    }, 80);
  } else {
    // Last exercise — collapse and scroll to finish
    render();
    setTimeout(()=>{
      const fin = document.getElementById('finish-btn-anchor');
      if(fin) fin.scrollIntoView({behavior:'smooth', block:'center'});
    }, 80);
  }
}
function repeatLastWorkout(){
  const last=state.workouts[0];
  if(!last) return;
  activeWorkout={split:last.split,exercises:[],startTime:Date.now()};
  setHistory=[];
  screen="log";
  startWoTimer();
  requestWakeLock();
  clearInterval(autoSaveInterval);
  autoSaveInterval=setInterval(()=>{
    if(activeWorkout){ try{ localStorage.setItem("gainz_recovery",JSON.stringify(activeWorkout)); }catch(e){} }
    else{ clearInterval(autoSaveInterval); }
  },20000);
  last.exercises.forEach(e=>addExercise(e.name));
  render(); // no picker
  showToast('↻ Loaded last '+splitName(last.split)+' day');
}
function dismissSummary(){
  workoutSummary=null;
  const el=document.getElementById("wo-summary");
  if(el){ el.style.animation="summaryOut 0.3s ease forwards"; setTimeout(()=>{ workoutSummary=null; render(); },280); }
  else render();
}
function renderWorkoutSummary(){
  const w=workoutSummary;
  if(!w) return "";
  const prCount=w.exercises.reduce((a,e)=>a+e.sets.filter(s=>s.pr).length,0);
  const setCount=w.exercises.reduce((a,e)=>a+e.sets.length,0);
  const durMins=Math.round(w.duration/60000);
  const durStr=durMins>=60?Math.floor(durMins/60)+"h "+( durMins%60)+"m":durMins+"min";
  // Compare to last same-split workout (second in history since this one was just pushed)
  const prev=state.workouts.slice(1).find(x=>x.split===w.split);
  const volDiff=prev?w.totalVolume-prev.totalVolume:null;
  const volDiffEl=volDiff!==null?`<span style="font-size:12px;font-weight:600;color:${volDiff>0?'var(--green)':volDiff<0?'var(--red)':'var(--muted)'}">${volDiff>0?'+':''}${volDiff.toLocaleString()}lb vs last ${splitName(w.split)}</span>`:'';
  const prLine=prCount>0?`<div style="font-size:13px;color:var(--accent);margin-top:8px;font-weight:600;">🏆 ${prCount} new PR${prCount>1?'s':''} today</div>`:'';
  const restRows=Object.values(REST_RECS).map(r=>`
    <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);">
      <span style="font-size:16px;flex-shrink:0;">${r.icon}</span>
      <div style="flex:1;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:12px;color:var(--text);font-weight:500;">${r.label}</span>
          <span style="font-size:13px;color:var(--accent);font-weight:700;flex-shrink:0;margin-left:8px;">${r.rest}</span>
        </div>
        <div style="font-size:10px;color:var(--dim);margin-top:3px;">${r.why}</div>
      </div>
    </div>`).join('');
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
        <div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:14px;padding:16px;text-align:center;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:32px;color:var(--accent);line-height:1;">${durStr}</div>
          <div style="font-size:8px;color:var(--muted);letter-spacing:1.5px;margin-top:4px;text-transform:uppercase;">Duration</div>
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
      <div style="margin-top:20px;">
        <div style="font-size:10px;letter-spacing:2px;color:var(--muted);margin-bottom:4px;">RECOMMENDED REST</div>
        <div style="font-size:10px;color:var(--dim);margin-bottom:12px;">Between sets · evidence-based</div>
        <div style="background:var(--bg2);border-radius:12px;padding:0 14px;">${restRows}</div>
      </div>
      <button class="btn primary" onclick="dismissSummary()" style="width:100%;margin-top:24px;font-size:13px;">DONE ✓</button>
    </div>
  </div>`;
}
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

function openImportModal(){
  importParsed=[]; importClarifications=[]; importAnswers={};
  importSelected=new Set(); importAddedCount=0; importStep='paste';
  document.getElementById('import-modal').style.display='block';
  document.body.style.overflow='hidden';
  renderImportStep();
}
function closeImportModal(){
  document.getElementById('import-modal').style.display='none';
  document.body.style.overflow='';
}
function renderImportStep(){
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
function importStartParse(){
  const raw=(document.getElementById('import-raw')||{}).value||'';
  if(!raw.trim()){ showToast('Paste some workout notes first'); return; }

  // ── Inner helpers (date, sets, split detection) ──────────────────────
  function parseDate(str){
    const m=str.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if(!m) return null;
    let mo=parseInt(m[1])-1, dy=parseInt(m[2]);
    let yr=m[3]?parseInt(m[3]):null;
    if(yr!==null){ if(yr<100) yr+=2000; } else { yr=2025; }
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
  const DATE_RE=/^\s*(?:\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)(?:\s|$)/;
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
      const datePart=trimmed.match(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/);
      const parsed=datePart?parseDate(datePart[1]):null;
      if(parsed){ saveWorkout(); curWorkout={...parsed,split:'Push',exercises:[],notes:''}; continue; }
    }

    if(!curWorkout) continue;

    // Set line?
    if(SET_RE.test(trimmed)){
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
          const words=cleaned.split(/\s+/);
          const hasAbbrev=/^[a-z]{1,5}$/.test(cleaned)||/\b[a-z]{2,4}\b/.test(cleaned);
          const shortEnough=words.length<=3;
          const isPlainFullName=words.length>=3 && words.every(w=>w.length>3) && !/[0-9]/.test(cleaned);

          if(!isPlainFullName && (hasAbbrev||shortEnough)){
            if(!unknowns.has(cleaned)){
              unknowns.set(cleaned,{rawTerm:trimmed, count:0});
            }
            unknowns.get(cleaned).count++;
          }
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
      <button onclick="importStep='paste';renderImportStep();" style="width:100%;padding:13px;background:var(--bg3);border:1px solid var(--border);border-radius:12px;color:var(--muted);font-family:inherit;font-size:11px;letter-spacing:1.5px;cursor:pointer;">← TRY AGAIN</button>`;
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
    if(importClarifications.length>=10) break;
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
    if(!answer || answer==='Skip') continue;

    if(q.type==='abbreviation' && q.affects_exercises){
      // Skip pseudo-answers
      if(answer==='Skip'||answer==='Skip (keep as-is)') continue;
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
function importToggle(i){
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
      <button onclick="importSelected=new Set(importParsed.map((_,i)=>i));renderImportStep();" style="padding:6px 12px;background:transparent;border:1px solid var(--border);border-radius:20px;color:var(--muted);font-family:'DM Sans',sans-serif;font-size:10px;letter-spacing:1px;cursor:pointer;">All</button>
      <button onclick="importSelected=new Set();renderImportStep();" style="padding:6px 12px;background:transparent;border:1px solid var(--border);border-radius:20px;color:var(--muted);font-family:'DM Sans',sans-serif;font-size:10px;letter-spacing:1px;cursor:pointer;">None</button>
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
    <button onclick="importStep='clarify';renderImportStep();" style="width:100%;margin-top:8px;padding:12px;background:transparent;border:1px solid var(--border);border-radius:12px;font-family:'DM Sans',sans-serif;font-size:11px;letter-spacing:1.5px;color:var(--dim);cursor:pointer;">${importClarifications.length?'← BACK TO QUESTIONS':'← PASTE DIFFERENT LOG'}</button>`;
}

// ── Step 3 → Write to state ─────────────────
function importCommit(){
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
        <button onclick="closeImportModal();screen='me';meTab='history';render();" style="width:100%;padding:14px;background:var(--accent);border:none;border-radius:12px;font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:3px;color:#080808;cursor:pointer;">VIEW HISTORY →</button>
        <button onclick="importParsed=[];importClarifications=[];importAnswers={};importSelected=new Set();importStep='paste';renderImportStep();" style="width:100%;padding:12px;background:transparent;border:1px solid var(--border);border-radius:12px;font-family:'DM Sans',sans-serif;font-size:11px;letter-spacing:1.5px;color:var(--muted);cursor:pointer;">IMPORT MORE</button>
      </div>
    </div>`;
}

// ═══════════════════════════════════════════
function exportData(){
  const json=JSON.stringify(state,null,2);
  const blob=new Blob([json],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download='gainz-backup-'+todayStr().replace(/[^a-z0-9]/gi,'-')+'.json';
  document.body.appendChild(a); a.click();
  setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},1000);
  showToast('Data exported ✓');
}
function finishWorkout(){
  if(!activeWorkout.exercises.length){ showModal(`<div style="font-size:13px;color:var(--accent);margin-bottom:14px;">Log at least one exercise first 💪</div><button class="btn ghost" onclick="hideModal()">OK</button>`); return; }
  const yest=new Date(); yest.setDate(yest.getDate()-1);
  const streak=state.lastWorkoutDate===yest.toDateString()?state.streak+1:state.lastWorkoutDate===todayStr()?state.streak:1;
  const notesEl=document.getElementById("session-notes"); if(notesEl) activeWorkout.notes=notesEl.value;
  const w={...activeWorkout,date:today(),timestamp:Date.now(),duration:Date.now()-activeWorkout.startTime,totalVolume:activeWorkout.exercises.reduce((a,e)=>a+vol(e.sets),0)};
  state.workouts.unshift(w); state.streak=streak; state.lastWorkoutDate=todayStr();
  if(state.workouts.length>500) state.workouts=state.workouts.slice(0,500);
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
  if(historyDetail){ historyDetail=null; histEditMode=false; render(); return; }
  if(screen==="settings"){ screen="start"; render(); return; }
  if(screen==="log" && activeWorkout){ abandonWorkout(); return; }
}

function updateBackBtn(){
  const btn = document.getElementById("back-btn");
  if(!btn) return;
  const show = progressEx || historyDetail || screen==="settings" || screen==="log";
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
  if(screen==="start") c.innerHTML=renderHome();
  else if(screen==="log") c.innerHTML=renderLog();
  else if(screen==="me") c.innerHTML=renderMe();
  else if(screen==="settings") c.innerHTML=renderSettings();
  else if(screen==="programBuilder") c.innerHTML=renderProgramBuilder();
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
    if(!existing){ const el=document.createElement("div"); el.innerHTML=renderWorkoutSummary(); document.body.appendChild(el.firstChild); }
  }
  if(FEATURES.devMode){const t=performance.now()-renderStart;if(t>16)console.warn(`[GAINZ] render() took ${t.toFixed(1)}ms`);}
}

function renderNav(){
  const nav=document.getElementById("nav");
  const tabs=[
    ["start","▲","START"],
    ["log","●","LOG"],
    ["me","◎","ME"],
    ["settings","⚙","MORE"]
  ];
  nav.innerHTML=tabs.map(([s,ic,lb])=>{
    const isActive=screen===s;
    const isLog=s==="log";
    const glowing=activeWorkout&&isLog;
    const logDisabled=isLog&&!activeWorkout;
    return `<button class="nav-btn ${isActive?"active":""}" onclick="screen='${s}';historyDetail=null;progressEx=null;render()" style="${logDisabled?"opacity:0.3;pointer-events:none;":""}">
      <span class="icon" style="${glowing?"color:var(--accent);":""}">${glowing?"●":ic}</span>
      <span style="${glowing?"color:var(--accent);":""}">${lb}</span>
    </button>`;
  }).join("");
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
    {lbs:33000,label:"a T-Rex"},
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
    {val:"Rest 2–3 min",label:"Between heavy sets",sub:"For max strength gains"},
    {val:"3–5 sets",label:"Per exercise is the sweet spot",sub:"Schoenfeld 2017"},
    {val:"Log it",label:"You can't improve what you don't track",sub:"First session unlocks stats"},
    {val:"Progressive overload",label:"Add weight or reps each week",sub:"The only rule that matters"},
    {val:"Compound first",label:"Squat, press, pull before isolation",sub:"Biggest bang per minute"},
    {val:"Sleep = gains",label:"Muscle repairs while you sleep",sub:"8 hrs beats any supplement"},
  ];
  // Mix tips into real stats pool (every 3rd slot is a tip)
  const mixed=[];
  let ti=0;
  funStats.forEach((s,i)=>{ mixed.push(s); if((i+1)%3===0) mixed.push(emptyTips[ti++%emptyTips.length]); });
  if(!mixed.length) mixed.push(...emptyTips);

  // No data: random each open. Has data: daily rotation through mixed pool.
  let funStat;
  if(!state.workouts.length){
    funStat=emptyTips[Math.floor(Math.random()*emptyTips.length)];
  } else {
    const dayOfYear=Math.floor((new Date()-new Date(new Date().getFullYear(),0,0))/(1000*60*60*24));
    funStat=mixed[dayOfYear%mixed.length];
  }

  // Split glow colors for scoreboard
  const SPLIT_GLOWS={Push:'rgba(255,80,60,0.12)',Pull:'rgba(139,114,224,0.12)',Legs:'rgba(82,200,122,0.10)',Core:'rgba(60,180,200,0.10)',Chest:'rgba(255,80,60,0.12)',Back:'rgba(100,140,220,0.10)',Arms:'rgba(139,114,224,0.14)',Shoulders:'rgba(232,213,160,0.08)',Upper:'rgba(255,80,60,0.10)',Lower:'rgba(82,200,122,0.10)',Full:'rgba(180,180,180,0.07)'};
  const splitGlow=SPLIT_GLOWS[rec]||'rgba(232,213,160,0.08)';

  // Last time this specific split was trained
  const lastThisSplit=state.workouts.find(w=>w.split===rec);
  const lastLine=lastThisSplit
    ?`${lastThisSplit.date}  ·  ${lastThisSplit.exercises.length} exercises  ·  ${lastThisSplit.totalVolume>0?lastThisSplit.totalVolume.toLocaleString()+' lb':'BW'}`
    :`First time — let's go`;

  // Greeting
  const hr=new Date().getHours();
  const greetWord=hr<12?'Morning':hr<17?'Afternoon':'Evening';

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

  // Other splits as pills
  const otherSplits=getActiveSplits().filter(s=>s!==rec);
  const pills=otherSplits.map(s=>{const est=estimateDuration(s);return `<button class="sb-pill" onclick="startWorkout('${s}')">${splitName(s).toUpperCase()}${est?` <span style="font-size:9px;opacity:0.6;">~${est}m</span>`:''}</button>`;}).join('');

  // Repeat last btn
  const lastWo=state.workouts[0];
  const repeatBtn=lastWo&&!activeWorkout&&lastWo.split!==rec
    ?`<button class="btn ghost" onclick="repeatLastWorkout()" style="width:100%;margin-top:6px;font-size:11px;letter-spacing:1px;padding:11px;">&#8635; Repeat last ${splitName(lastWo.split)} day</button>`
    :'';

  // Best 1RM stat — for the second stat box
  const statColor2=best1RM?'#52c87a':'var(--accent)';

  return `
    ${banner}
    <div class="sb-header">
      <div>
        <div class="sb-header-time">${greetWord}.</div>
      </div>
      <div style="text-align:right;">
        <div class="sb-header-date">${today()}</div>
      </div>
    </div>

    <div class="sb-streak">
      <div class="sb-streak-num">${streak||0}</div>
      <div class="sb-streak-right">
        <div class="sb-streak-label">Day Streak</div>
        <div class="sb-streak-sub">${streak>=3?'Keep it going':'Build the habit'}</div>
        <div class="sb-streak-dots">${streakDots}</div>
      </div>
    </div>

    <div class="sb-rec" style="--split-glow:${splitGlow};" onclick="startWorkout('${rec}')">
      <div class="sb-rec-label">&#9650; Recommended today</div>
      <div class="sb-rec-split">${splitName(rec).toUpperCase()}</div>
      <div class="sb-rec-day">Day</div>
      <div class="sb-rec-last">Last: ${lastLine}</div>
      ${(()=>{const est=estimateDuration(rec);return est?`<div style="font-size:10px;color:var(--muted);margin-bottom:12px;letter-spacing:0.5px;">⏱ ~${est} min avg</div>`:''})()}
      <button class="sb-rec-cta" onclick="event.stopPropagation();startWorkout('${rec}')">
        START ${splitName(rec).toUpperCase()} DAY &nbsp;&#8594;
      </button>
    </div>

    <div class="sb-stats">
      <div class="sb-stat">
        <div class="sb-stat-num">${thisWeek}</div>
        <div class="sb-stat-lbl">This week</div>
        <div class="sb-stat-sub">${daysRest==='Today'?'Last session today':`Last session ${daysRest} ago`}</div>
      </div>
      <div class="sb-stat">
        <div class="sb-stat-num" style="color:${statColor2};">${best1RM?best1RM.val+'lb':'—'}</div>
        <div class="sb-stat-lbl">Est. 1RM</div>
        <div class="sb-stat-sub">${best1RM?best1RM.ex:'No data yet'}</div>
      </div>
    </div>

    <div style="margin-bottom:12px;">
      <div style="font-size:8px;letter-spacing:3px;color:var(--muted);text-transform:uppercase;margin-bottom:10px;">Your split sequence</div>
      <div style="display:flex;align-items:center;gap:6px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none;">
        ${(()=>{
          const splits=getActiveSplits();
          const recIdx=splits.indexOf(rec);
          return splits.map((s,i)=>{
            const isToday=s===rec;
            const rel=i-recIdx;
            return `<div onclick="startWorkout('${s}')" style="flex-shrink:0;text-align:center;opacity:${Math.abs(rel)<=1?1:0.35};cursor:pointer;">
              <div style="font-family:'Bebas Neue',sans-serif;font-size:${isToday?'20':'15'}px;
                color:${isToday?'var(--accent)':'var(--muted)'};
                background:${isToday?'rgba(232,213,160,0.08)':'var(--bg2)'};
                border:1px solid ${isToday?'rgba(232,213,160,0.2)':'var(--border2)'};
                border-radius:10px;padding:10px 14px;min-width:62px;line-height:1.2;transition:opacity .12s;">
                ${splitName(s)}
              </div>
              <div style="font-size:7px;letter-spacing:1px;margin-top:4px;color:${isToday?'var(--accent)':rel===1?'var(--muted)':'var(--dim)'};"
              >${isToday?'TODAY':rel===1?'NEXT ›':rel===-1?'PREV':''}</div>
            </div>${i<splits.length-1?`<div style="color:#1e1e24;font-size:14px;flex-shrink:0;">›</div>`:''}`;          }).join('');        })()}
      </div>
    </div>
    ${pills?`<div class="sb-pills-label">Quick start</div><div class="sb-pills">${pills}</div>`:''}

    ${repeatBtn}

    <div class="sb-insight">
      <div class="sb-insight-val">${funStat.val}</div>
      <div>
        <div class="sb-insight-label">${funStat.label}</div>
        ${funStat.sub?`<div class="sb-insight-sub">${funStat.sub}</div>`:''}
      </div>
    </div>`;
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
        if(!tmpls.length) return '<div style="padding:14px 0;font-size:13px;color:var(--dim);">No templates yet. Finish a workout and tap \"Save as Template\".</div>';
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

    ${sectionHead('Data')}
    <div style="display:flex;gap:8px;margin-bottom:8px;">
      <button onclick="exportData()" style="flex:1;padding:13px;background:var(--bg3);border:1px solid var(--border2);border-radius:12px;color:var(--muted);font-family:inherit;font-size:11px;letter-spacing:1px;cursor:pointer;">↑ EXPORT</button>
      <button onclick="if(confirm('Clear all data? Cannot be undone.')){localStorage.removeItem('gainz_v5');location.reload();}" style="flex:1;padding:13px;background:rgba(192,64,74,0.06);border:1px solid rgba(192,64,74,0.2);border-radius:12px;color:var(--danger);font-family:inherit;font-size:11px;letter-spacing:1px;cursor:pointer;">✕ CLEAR DATA</button>
    </div>

    <div style="text-align:center;margin-top:36px;color:var(--dim);font-size:10px;letter-spacing:1.5px;padding-bottom:8px;">GAINZ v6 · Made for gains</div>
  `;
}

// ── Research Tip Helpers ──
function getTips(exName){
  return RESEARCH_TIPS[exName] || null;
}
function openTip(exName){
  shownTips.add(exName);
  dismissedTips.delete(exName);
  render();
}
function dismissTip(exName){
  shownTips.delete(exName);
  dismissedTips.add(exName);
  haptic("light");
  render();
}
function setTipCat(exName, cat){
  activeTipCat[exName]=cat;
  render();
}
function cycleTipCat(exName, dir){
  const cur=activeTipCat[exName]||TIP_CATEGORIES[0].key;
  const idx=TIP_CATEGORIES.findIndex(c=>c.key===cur);
  const next=TIP_CATEGORIES[(idx+dir+TIP_CATEGORIES.length)%TIP_CATEGORIES.length];
  activeTipCat[exName]=next.key;
  haptic("light");
  render();
}
function buildTipPanel(exName){
  const tips=getTips(exName);
  if(!tips) return "";
  if(!shownTips.has(exName)) return ""; // hidden by default
  const cat=activeTipCat[exName]||TIP_CATEGORIES[0].key;
  const catIdx=TIP_CATEGORIES.findIndex(c=>c.key===cat);
  const catData=tips[cat];

  const dots=TIP_CATEGORIES.map((_,i)=>`<div class="tip-dot${i===catIdx?' on':''}"></div>`).join('');

  let cite='';
  if(catData){
    const raw=catData.source||'';
    const authorPart=raw.split(/[,;]/)[0].trim();
    const shortAuthor=authorPart.length>28?authorPart.slice(0,28)+'…':authorPart;
    cite=`${shortAuthor} · ${catData.year}`;
  }

  return `<div class="tip-panel">
    <div class="tip-panel-head">
      <span class="tip-cite" style="opacity:0.5;">📚 research</span>
      <button class="tip-dismiss" onclick="dismissTip(${esc(exName)})">✕</button>
    </div>
    <div class="tip-text">${catData?catData.tip:'—'}</div>
    <div class="tip-footer">
      <div class="tip-dots">${dots}</div>
      <div style="display:flex;align-items:center;gap:8px;">
        ${cite?`<span class="tip-cite">${cite}</span>`:''}
        <div class="tip-nav-row">
          <button class="tip-nav" onclick="cycleTipCat(${esc(exName)},-1)">‹</button>
          <button class="tip-nav" onclick="cycleTipCat(${esc(exName)},1)">›</button>
        </div>
      </div>
    </div>
  </div>`;
}

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

    const setRows=e.sets.map((s,i)=>`
      <div class="set-row" data-ex="${e.name.replace(/"/g,'&quot;')}" data-idx="${i}">
        <span style="display:flex;align-items:center;gap:6px;">
          ${s.warmup?`<span style="font-size:9px;background:rgba(100,160,255,0.15);border:1px solid rgba(100,160,255,0.3);border-radius:4px;padding:1px 5px;color:#7aacff;font-weight:700;letter-spacing:1px;">W</span>`:""}
          ${s.pr?`<span class="pr-ticket">PR</span>`:""}
          Set ${i+1}: ${s.bw?"BW":s.weight+"lb"} × ${s.reps}
        </span>
        <span style="display:flex;align-items:center;gap:6px;">
          ${(!s.bw&&!s.warmup)?`<span class="set-vol">${(parseFloat(s.weight)*parseInt(s.reps)).toLocaleString()}lb</span>`:""}
          <button class="set-del" onclick="deleteSet(${esc(e.name)},${i})">✕</button>
        </span>
      </div>`).join("");

    const isExpanded=expandedLastSession.has(e.name);
    const lastHint=lastSess&&lastSess.sets.length?`
      <div class="hint-row" style="flex-wrap:wrap;gap:4px;">
        <button class="hint-btn" onclick="toggleLastSession(${esc(e.name)})" style="font-size:10px;padding:3px 8px;color:var(--dim);">${isExpanded?'▲ hide last':'Last: '+( lastSess.sets.slice(-1)[0].bw?'BW':lastSess.sets.slice(-1)[0].weight+'lb')+' × '+lastSess.sets.slice(-1)[0].reps+(isExpanded?'':' ▼')}</button>
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

    // Pre-fill: last set this session → overload suggestion → last session → sensible default
    const lastSetThisSession = e.sets.length>0 ? e.sets[e.sets.length-1] : null;
    const prefillR = (lastSetThisSession || lastSess?.sets?.slice(-1)[0])?.reps || "10";

    // Progressive overload suggestion — only shown before first set of session
    const suggestion = !lastSetThisSession ? getSuggestedWeight(e.name) : null;
    const prefillW = lastSetThisSession && !lastSetThisSession.bw
      ? lastSetThisSession.weight
      : suggestion ? String(suggestion.weight)
      : (lastSess?.sets?.slice(-1)[0]?.bw ? "" : lastSess?.sets?.slice(-1)[0]?.weight || "135");

    const overloadBadge = !bwOn && !lastSetThisSession && suggestion ? (
      suggestion.same
        ? `<div style="font-size:11px;color:var(--muted);margin-bottom:8px;">↔ Same weight — hit more reps to progress</div>`
        : `<div style="font-size:11px;color:var(--green);margin-bottom:8px;">↑ +${suggestion.pct}% vs last session · ${suggestion.weight}lb suggested</div>`
    ) : "";

    const weightInput=bwOn
      ?`<div class="col"><span class="label">WEIGHT</span><div style="background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:10px 12px;font-size:14px;color:var(--dim);">BW</div></div>`
      :`<div class="col"><span class="label" style="display:flex;justify-content:space-between;align-items:center;">WEIGHT (lb)<button onclick="openPlateCalc(${esc(e.name)})" style="background:none;border:none;color:var(--dim);font-size:11px;cursor:pointer;padding:0;font-family:'DM Sans',sans-serif;letter-spacing:0.5px;" title="Plate calculator">🔧</button></span><input class="input" type="number" id="w-${id}" value="${prefillW}" placeholder="135" inputmode="decimal"/></div>`;

    const tipPanel=buildTipPanel(e.name);
    const reopenBtn=getTips(e.name)&&!shownTips.has(e.name)?`<button class="tip-reopen" onclick="openTip(${esc(e.name)});render();" title="Research tips" style="font-size:11px;letter-spacing:1px;color:var(--dim);opacity:0.5;">📚</button>`:"";

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
        <div class="col"><span class="label">REPS</span><input class="input" type="number" id="r-${id}" value="${prefillR}" placeholder="10" inputmode="numeric"/></div>
      </div>
      <button class="btn ghost" onclick="logSet(${esc(e.name)})" style="${isSSPrompt?'border-color:var(--superset)44;color:var(--superset);':''}">+ LOG SET${ssOn&&ssPairName?' ⚡':ssOn?' (no rest)':''}</button>
      ${e.sets.length>0?(()=>{
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
      })():''}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;flex-wrap:wrap;gap:6px;">
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${activeWorkout.exercises.length>1?`<button class="pill${ssOn?" ss-on":""}" onclick="openPairModal(${esc(e.name)})"><span class="pill-dot"></span>${ssPairName?"⚡ "+ssPairName:"⚡ SUPERSET"}</button>`:""}
          <button class="pill${e.warmupNext?" ss-on":""}" onclick="toggleWarmup(${esc(e.name)})" style="${e.warmupNext?"background:rgba(100,160,255,0.12);border-color:rgba(100,160,255,0.3);color:#7aacff;":""}">W WARMUP</button>
          <button class="pill${bwOn&&!BW_EXERCISES.has(e.name)?" ss-on":""}" onclick="toggleBW(${esc(e.name)})" style="${bwOn&&!BW_EXERCISES.has(e.name)?"background:rgba(232,213,160,0.1);border-color:var(--accent);color:var(--accent);":""}">BW</button>
          <button class="pill${isDone?" ss-on":""}" onclick="doneExSet.has(${esc(e.name)})?doneExSet.delete(${esc(e.name)}):doneExSet.add(${esc(e.name)});render();" style="${isDone?"background:rgba(82,200,122,0.12);border-color:rgba(82,200,122,0.3);color:var(--green);":""}">✓ DONE</button>
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
        ${activeWorkout.exercises.length>0?`<button class="btn ghost small" onclick="saveAsTemplate()" style="font-size:11px;padding:6px 10px;" title="Save as template">📋</button>`:""}
        <button class="btn primary small" id="finish-btn-anchor" onclick="confirmFinish()">FINISH ✓</button>
      </div>
    </div>
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
    <div style="height:80px;"></div>`:""}
  `;
}

// ── HISTORY EDIT HELPERS ──
function deleteWorkout(idx){
  showModal(`
    <div style="font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:12px;">DELETE WORKOUT?</div>
    <div style="font-size:13px;color:var(--text);margin-bottom:20px;">This can't be undone.</div>
    <button class="btn primary" style="background:var(--danger);border-color:var(--danger);" onclick="state.workouts.splice(${idx},1);saveImmediate();historyDetail=null;hideModal();render();">DELETE</button>
    <button class="btn ghost" onclick="hideModal()" style="margin-top:8px;">CANCEL</button>
  `);
}
function histSaveSet(wIdx, exName, sIdx, w, r){
  const ex=state.workouts[wIdx]?.exercises.find(e=>e.name===exName);
  if(!ex||!ex.sets[sIdx]) return;
  ex.sets[sIdx].weight=w;
  ex.sets[sIdx].reps=r;
  // Recalc workout volume
  state.workouts[wIdx].totalVolume=state.workouts[wIdx].exercises.reduce((a,e)=>a+vol(e.sets),0);
  historyDetail=state.workouts[wIdx];
  saveImmediate(); render();
}
function histDeleteSet(wIdx, exName, sIdx){
  const ex=state.workouts[wIdx]?.exercises.find(e=>e.name===exName);
  if(!ex) return;
  ex.sets.splice(sIdx,1);
  state.workouts[wIdx].totalVolume=state.workouts[wIdx].exercises.reduce((a,e)=>a+vol(e.sets),0);
  historyDetail=state.workouts[wIdx];
  saveImmediate(); render();
}
function histDeleteExercise(wIdx, exName){
  if(!confirm('Remove '+exName+' from this workout?')) return;
  state.workouts[wIdx].exercises=state.workouts[wIdx].exercises.filter(e=>e.name!==exName);
  state.workouts[wIdx].totalVolume=state.workouts[wIdx].exercises.reduce((a,e)=>a+vol(e.sets),0);
  historyDetail=state.workouts[wIdx];
  saveImmediate(); render();
}
function histAddSet(wIdx, exName){
  const ex=state.workouts[wIdx]?.exercises.find(e=>e.name===exName);
  if(!ex) return;
  const last=ex.sets[ex.sets.length-1];
  ex.sets.push(last?{...last,pr:false,warmup:false}:{weight:'135',reps:'10',bw:false,pr:false,time:Date.now()});
  state.workouts[wIdx].totalVolume=state.workouts[wIdx].exercises.reduce((a,e)=>a+vol(e.sets),0);
  historyDetail=state.workouts[wIdx];
  saveImmediate(); render();
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

  const statsStrip=`<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px;">
    <div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:14px;text-align:center;padding:14px 8px;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:36px;color:var(--accent);line-height:1;">${streak}</div>
      <div style="font-size:8px;color:var(--muted);letter-spacing:1.5px;margin-top:3px;text-transform:uppercase;">Streak</div>
    </div>
    <div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:14px;text-align:center;padding:14px 8px;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:36px;color:var(--accent);line-height:1;">${thisWeek}</div>
      <div style="font-size:8px;color:var(--muted);letter-spacing:1.5px;margin-top:3px;text-transform:uppercase;">This Week</div>
    </div>
    <div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:14px;text-align:center;padding:14px 8px;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:${best1RM?'26':'36'}px;color:#52c87a;line-height:1;">${best1RM?best1RM.val+"lb":"—"}</div>
      <div style="font-size:8px;color:var(--muted);letter-spacing:1.5px;margin-top:3px;text-transform:uppercase;">Best 1RM</div>
      ${best1RM?`<div style="font-size:8px;color:var(--dim);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${best1RM.ex}</div>`:""}
    </div>
  </div>`;

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
      const filtered=histFilter==="All"?state.workouts:state.workouts.filter(w=>w.split===histFilter);
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
      tabContent=`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">${filterBtns}</div>${filtered.length?cards:`<div style="color:var(--dim);font-size:13px;">No ${histFilter} workouts yet.</div>`}`;
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
  ${fatigue}
  <div style="display:flex;border-bottom:1px solid var(--border);margin-bottom:16px;margin-top:${fatigue?"16px":"0"};">${tabBtns}</div>
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
      return `<div class="set-row">
        <span style="display:flex;align-items:center;gap:6px;">
          ${s.warmup?`<span style="font-size:9px;background:rgba(100,160,255,0.15);border:1px solid rgba(100,160,255,0.3);border-radius:4px;padding:1px 5px;color:#7aacff;font-weight:700;">W</span>`:""}
          ${s.pr?`<span class="pr-ticket">PR</span>`:""}
          Set ${i+1}: ${s.bw?"BW":s.weight+"lb"} × ${s.reps}
        </span>
        ${!s.bw&&!s.warmup?`<span class="set-vol">${(parseFloat(s.weight)*parseInt(s.reps)).toLocaleString()}lb</span>`:""}
      </div>`;
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

  const sessionNotes=w.notes?`<div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:12px;padding:12px 14px;margin-bottom:14px;"><div style="font-size:8px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;margin-bottom:6px;">Session Notes</div><div style="font-size:12px;color:var(--muted);line-height:1.5;">${w.notes}</div></div>`:'';
  return `
    <div style="display:flex;justify-content:space-between;margin-bottom:16px;align-items:center;flex-wrap:wrap;gap:8px;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:32px;letter-spacing:1px;line-height:1;">${splitName(w.split)}</div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:10px;color:var(--dim)">${w.date}${w.duration?` · ${fmtMs(w.duration)}`:""}</span>
        <button onclick="histEditMode=!histEditMode;render()"
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
      <div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:12px;text-align:center;padding:12px 6px;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--accent);line-height:1;">${w.duration?Math.round(w.duration/60000)+"m":"—"}</div>
        <div style="font-size:7px;color:var(--muted);letter-spacing:1px;margin-top:3px;text-transform:uppercase;">Time</div>
      </div>
      <div style="background:#0f0f12;border:1px solid #1e1e24;border-radius:12px;text-align:center;padding:12px 6px;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:${prCount>0?"#52c87a":"var(--dim)"};line-height:1;">${prCount>0?prCount:"—"}</div>
        <div style="font-size:7px;color:var(--muted);letter-spacing:1px;margin-top:3px;text-transform:uppercase;">PRs</div>
      </div>
    </div>
    ${sessionNotes}
    ${exCards}`;
}

// ─── Progress Chart (SVG, no libs) ──────────────────────────────────────
let progChartMode = "1rm"; // "1rm" | "vol"

function buildProgChart(sessions, exName){
  if(!sessions||sessions.length<2) return '';
  const W=320, H=160, padL=46, padR=12, padT=14, padB=32;
  const IW=W-padL-padR, IH=H-padT-padB;

  // Build data points
  const pts = sessions.map(w=>{
    const e = w.exercises.find(e=>e.name===exName);
    if(!e) return null;
    const rm = Math.max(0,...e.sets.filter(s=>!s.bw&&parseFloat(s.weight)>0).map(s=>est1RM(s.weight,s.reps)));
    const v  = vol(e.sets);
    return { date: w.date, ts: w.timestamp, rm, v };
  }).filter(Boolean);

  if(pts.length<2) return '';
  const vals  = pts.map(p=>progChartMode==="1rm"?p.rm:p.v).filter(v=>v>0);
  if(!vals.length) return '';

  const minV  = Math.min(...vals);
  const maxV  = Math.max(...vals);
  const range = maxV-minV||1;

  // Nice Y labels (4 gridlines)
  const step  = Math.ceil(range/3/5)*5||5;
  const yBase = Math.floor(minV/step)*step;
  const yTops = [yBase, yBase+step, yBase+step*2, yBase+step*3].filter(y=>y<=maxV+step);

  function px(i){ return padL + (i/(pts.length-1))*IW; }
  function py(v){ return padT + IH - ((v-yBase)/(yTops[yTops.length-1]-yBase||1))*IH; }

  // Polyline for main line
  const lineCoords = pts.map((p,i)=>{
    const v=progChartMode==="1rm"?p.rm:p.v;
    return v>0 ? `${px(i).toFixed(1)},${py(v).toFixed(1)}` : null;
  }).filter(Boolean).join(' ');

  // Area fill path
  const firstX=px(0).toFixed(1), lastX=px(pts.length-1).toFixed(1), baseY=(padT+IH).toFixed(1);
  const areaPath=`M${firstX},${baseY} ` + pts.map((p,i)=>{
    const v=progChartMode==="1rm"?p.rm:p.v;
    return v>0?`L${px(i).toFixed(1)},${py(v).toFixed(1)}`:'';
  }).filter(Boolean).join(' ') + ` L${lastX},${baseY} Z`;

  // Grid lines + Y labels
  const grids = yTops.map(y=>{
    const yy=py(y).toFixed(1);
    const lbl = progChartMode==="1rm" ? y+"lb" : y>=1000?(y/1000).toFixed(1)+"k":y+"lb";
    return `<line x1="${padL}" y1="${yy}" x2="${W-padR}" y2="${yy}" stroke="#1e1e24" stroke-width="1"/>
    <text x="${(padL-4).toFixed(0)}" y="${(parseFloat(yy)+3.5).toFixed(1)}" text-anchor="end" font-size="8" fill="#3a3630">${lbl}</text>`;
  }).join('');

  // X date labels — show first, middle, last
  const xIdxs = [0, Math.floor((pts.length-1)/2), pts.length-1].filter((v,i,a)=>a.indexOf(v)===i);
  const xLabels = xIdxs.map(i=>{
    const d=pts[i].date; const parts=d.split('-');
    const lbl=parts.length===3?parts[1]+'/'+parts[2].slice(0,2):d.slice(5);
    return `<text x="${px(i).toFixed(1)}" y="${(H-4).toFixed(0)}" text-anchor="middle" font-size="8" fill="#3a3630">${lbl}</text>`;
  }).join('');

  // Dots on data points
  const dots = pts.map((p,i)=>{
    const v=progChartMode==="1rm"?p.rm:p.v;
    if(!v) return '';
    const isLast=i===pts.length-1;
    return `<circle cx="${px(i).toFixed(1)}" cy="${py(v).toFixed(1)}" r="${isLast?4:2.5}" fill="${isLast?'var(--accent)':'rgba(232,213,160,0.4)'}" stroke="${isLast?'#1a1510':'none'}" stroke-width="${isLast?1.5:0}"/>`;
  }).join('');

  // Last value label
  const lastPt=pts[pts.length-1];
  const lastV=progChartMode==="1rm"?lastPt.rm:lastPt.v;
  const lastLbl=progChartMode==="1rm"?lastV+"lb":lastV>=1000?(lastV/1000).toFixed(1)+"k lb":lastV+"lb";
  const lx=px(pts.length-1), ly=py(lastV);
  const lblAnchor=lx>W*0.7?"end":"start";
  const lblOff=lx>W*0.7?-8:8;

  // Toggle buttons rendered as HTML below SVG (not inside SVG)
  const mode1=progChartMode==="1rm";
  const toggleHtml=`<div style="display:flex;gap:6px;justify-content:center;margin-bottom:10px;">
    <button onclick="progChartMode='1rm';render()" style="padding:5px 14px;border-radius:20px;font-family:'DM Sans',sans-serif;font-size:10px;letter-spacing:1px;cursor:pointer;border:1px solid ${mode1?'var(--accent)':'var(--border2)'};background:${mode1?'var(--accentFaint)':'var(--bg3)'};color:${mode1?'var(--accent)':'var(--muted)'};">EST. 1RM</button>
    <button onclick="progChartMode='vol';render()" style="padding:5px 14px;border-radius:20px;font-family:'DM Sans',sans-serif;font-size:10px;letter-spacing:1px;cursor:pointer;border:1px solid ${!mode1?'var(--accent)':'var(--border2)'};background:${!mode1?'var(--accentFaint)':'var(--bg3)'};color:${!mode1?'var(--accent)':'var(--muted)'};">VOLUME</button>
  </div>`;

  const svgHtml=`<svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block;overflow:visible;" preserveAspectRatio="xMidYMid meet">
    <defs>
      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(232,213,160,0.15)"/>
        <stop offset="100%" stop-color="rgba(232,213,160,0)"/>
      </linearGradient>
    </defs>
    ${grids}
    ${xLabels}
    <path d="${areaPath}" fill="url(#chartGrad)"/>
    <polyline points="${lineCoords}" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}
    <text x="${(lx+lblOff).toFixed(1)}" y="${(ly-7).toFixed(1)}" text-anchor="${lblAnchor}" font-size="9" fill="var(--accent)" font-weight="bold">${lastLbl}</text>
  </svg>`;

  return toggleHtml + `<div style="background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:12px 8px 4px;">${svgHtml}</div>`;
}

// legacy stub kept so nothing breaks
function buildSparkline(bests){ return ''; }
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

// ═══════════════════════════════════════════
// UNIT TESTS
// ═══════════════════════════════════════════
const TESTS=[], TEST_RESULTS={passed:0,failed:0,results:[]};
function test(name,fn){TESTS.push({name,fn});}
function assert(c,m){if(!c)throw new Error(m||"assertion failed");}
function assertEqual(a,b,m){if(a!==b)throw new Error(`${m||"assertEqual"}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);}
function assertContains(arr,val,m){if(!arr.includes(val))throw new Error(`${m||"assertContains"}: ${val} not found`);}

test("vol() empty sets = 0",()=>assertEqual(vol([]),0));
test("vol() weight×reps",()=>assertEqual(vol([{weight:"100",reps:"10",bw:false}]),1000));
test("vol() multiple sets",()=>assertEqual(vol([{weight:"135",reps:"8",bw:false},{weight:"145",reps:"6",bw:false}]),135*8+145*6));
test("vol() ignores BW sets",()=>assertEqual(vol([{weight:"BW",reps:"10",bw:true},{weight:"100",reps:"5",bw:false}]),500));
test("vol() all-BW = 0",()=>assertEqual(vol([{weight:"BW",reps:"12",bw:true}]),0));
test("fmt() 45s = 0:45",()=>assertEqual(fmt(45),"0:45"));
test("fmt() 90s = 1:30",()=>assertEqual(fmt(90),"1:30"));
test("fmt() 0 = 0:00",()=>assertEqual(fmt(0),"0:00"));
test("fmt() pads seconds",()=>assertEqual(fmt(61),"1:01"));
test("fmt() negative clamps to 0:00",()=>assertEqual(fmt(-5),"0:00"));
test("getRec() with no history = Push",()=>{const s=state.workouts;state.workouts=[];const r=getRec();state.workouts=s;assertEqual(r,"Push");});
test("getRec() after Push = Pull",()=>{const s=state.workouts;state.workouts=[{split:"Push"}];const r=getRec();state.workouts=s;assertEqual(r,"Pull");});
test("getRec() after Push+Pull = Legs",()=>{const s=state.workouts;state.workouts=[{split:"Pull"},{split:"Push"}];const r=getRec();state.workouts=s;assertEqual(r,"Legs");});
test("getRec() returns valid split",()=>assertContains(getActiveSplits(),getRec()));
test("isPR() true with no history",()=>{const s=state.workouts;state.workouts=[];const r=isPR("Bench Press","225");state.workouts=s;assert(r);});
test("isPR() false when weight exists",()=>{const s=state.workouts;state.workouts=[{exercises:[{name:"Bench Press",sets:[{weight:"225",reps:"5",bw:false}]}]}];const r=isPR("Bench Press","225");state.workouts=s;assert(!r);});
test("isPR() true for new heavier weight",()=>{const s=state.workouts;state.workouts=[{exercises:[{name:"Bench Press",sets:[{weight:"225",reps:"5",bw:false}]}]}];const r=isPR("Bench Press","235");state.workouts=s;assert(r);});
test("isPR() false for BW",()=>assert(!isPR("Pull-ups","BW")));
test("addExercise() adds to workout",()=>{const s=activeWorkout;activeWorkout={split:"Push",exercises:[],startTime:Date.now()};addExercise("Bench Press");assertEqual(activeWorkout.exercises.length,1);activeWorkout=s;if(!s)screen="start";});
test("addExercise() no duplicates",()=>{const s=activeWorkout;activeWorkout={split:"Push",exercises:[{name:"Bench Press",sets:[],superset:false,bwMode:false,notes:""}],startTime:Date.now()};addExercise("Bench Press");assertEqual(activeWorkout.exercises.length,1);activeWorkout=s;if(!s)screen="start";});
test("addExercise() BW auto-enabled for Pull-ups",()=>{const s=activeWorkout;activeWorkout={split:"Pull",exercises:[],startTime:Date.now()};addExercise("Pull-ups");assert(activeWorkout.exercises[0].bwMode);activeWorkout=s;if(!s)screen="start";});
test("deleteSet() removes correct index",()=>{const s=activeWorkout;activeWorkout={split:"Push",exercises:[{name:"Bench Press",sets:[{weight:"135",reps:"10",bw:false},{weight:"145",reps:"8",bw:false},{weight:"155",reps:"6",bw:false}],superset:false,bwMode:false,notes:""}],startTime:Date.now()};deleteSet("Bench Press",1);assertEqual(activeWorkout.exercises[0].sets.length,2);assertEqual(activeWorkout.exercises[0].sets[1].weight,"155");activeWorkout=s;if(!s)screen="start";});
test("toggleSS() flips superset",()=>{const s=activeWorkout;activeWorkout={split:"Push",exercises:[{name:"Bench Press",sets:[],superset:false,bwMode:false,notes:""}],startTime:Date.now()};toggleSS("Bench Press");assert(activeWorkout.exercises[0].superset);toggleSS("Bench Press");assert(!activeWorkout.exercises[0].superset);activeWorkout=s;if(!s)screen="start";});
test("toggleBW() flips bwMode",()=>{const s=activeWorkout;activeWorkout={split:"Pull",exercises:[{name:"Bicep Curls",sets:[],superset:false,bwMode:false,notes:""}],startTime:Date.now()};toggleBW("Bicep Curls");assert(activeWorkout.exercises[0].bwMode);activeWorkout=s;if(!s)screen="start";});
test("splits have 5+ exercises each",()=>{for(const[k,v]of Object.entries(SPLIT))assert(v.length>=5,k+" too short");});
test("all splits have exercises",()=>{const keys=["Push","Pull","Legs","Core","Chest","Back","Arms","Shoulders"];keys.forEach(k=>assert(ALL_SPLITS[k].length>0,"empty split: "+k));});
test("BW_EXERCISES exist in ALL_SPLITS",()=>{const all=Object.values(ALL_SPLITS).flat();for(const e of BW_EXERCISES)assertContains(all,e,`${e} missing`);});
test("GLOBAL_DEFAULT = 45",()=>assertEqual(GLOBAL_DEFAULT,45));
test("Deadlift rest = 120",()=>assertEqual(DEFAULT_RESTS["Deadlift"],120));
test("Squat rest = 90",()=>assertEqual(DEFAULT_RESTS["Squat"],90));

// ── STATS ENGINE UNIT TESTS ──
test("allTimeTonnage sums all workout volumes",()=>{
  const s=state.workouts;
  state.workouts=[{totalVolume:1000,exercises:[],timestamp:Date.now(),split:"Push",duration:3600000},{totalVolume:2000,exercises:[],timestamp:Date.now(),split:"Pull",duration:3600000}];
  const total=state.workouts.reduce((a,w)=>a+(w.totalVolume||0),0);
  assertEqual(total,3000);
  state.workouts=s;
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
  const ms=7200000+3600000; // 3hrs
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
  const s=state.workouts; const r=state.exerciseRests;
  state.workouts=[{exercises:[{name:"TestExA"},{name:"TestExB"}],totalVolume:0,timestamp:Date.now(),split:"Push"}];
  state.exerciseRests={"TestExA":60,"TestExB":90};
  const lw=state.workouts[0];
  const rests=lw.exercises.map(e=>state.exerciseRests[e.name]||45);
  const avg=Math.round(rests.reduce((a,b)=>a+b,0)/rests.length);
  assertEqual(avg,75);
  state.workouts=s; state.exerciseRests=r;
});

test("avgSetsPerSession rounds correctly",()=>{
  const workouts=[
    {exercises:[{sets:[1,2,3]},{sets:[1,2]}]},
    {exercises:[{sets:[1,2,3,4]}]},
  ];
  const avg=Math.round(workouts.reduce((a,w)=>a+w.exercises.reduce((b,e)=>b+e.sets.length,0),0)/workouts.length);
  assertEqual(avg,5);
});

test("thisWeek filter uses correct week boundary",()=>{
  const weekStart=new Date();
  weekStart.setDate(weekStart.getDate()-weekStart.getDay());
  weekStart.setHours(0,0,0,0);
  const now=Date.now();
  const old=weekStart.getTime()-86400000; // yesterday before week
  const workouts=[{timestamp:now},{timestamp:now},{timestamp:old}];
  const thisWeek=workouts.filter(w=>new Date(w.timestamp)>=weekStart).length;
  assertEqual(thisWeek,2);
});

test("bestDay finds highest avg volume day",()=>{
  const dayTotals={1:5000,3:8000,5:6000};
  const dayCounts={1:2,3:1,5:2};
  const dayAvgs=Object.entries(dayCounts).map(([d,c])=>({day:parseInt(d),avg:dayTotals[d]/c}));
  const best=dayAvgs.reduce((a,b)=>b.avg>a.avg?b:a);
  assertEqual(best.day,3); // day 3 has 8000/1 = 8000 avg, highest
});

test("consistency score clamps to 100",()=>{
  const thisWeek=5; const daysInWeek=5;
  const score=Math.round((thisWeek/daysInWeek)*100);
  assertEqual(score,100);
});

test("estimated 1RM Epley formula",()=>{
  // 225lb x 5 reps
  const w=225, r=5;
  const orm=Math.round(w*(1+r/30));
  assertEqual(orm,263);
});

test("tonnage comparison picks correct tier",()=>{
  const COMPARISONS=[
    {lbs:4000,label:"a baby elephant"},
    {lbs:8000,label:"a hippo"},
    {lbs:33000,label:"a T-Rex"},
  ];
  const tonnage=10000;
  let comp=COMPARISONS[0];
  for(const c of COMPARISONS){ if(tonnage>=c.lbs) comp=c; }
  assertEqual(comp.label,"a hippo");
});

test("funStats rotates by day of year",()=>{
  const pool=["a","b","c","d"];
  const dayOfYear=100;
  assertEqual(pool[dayOfYear%pool.length],"a");
});


function runTests(){
  TEST_RESULTS.passed=0;TEST_RESULTS.failed=0;TEST_RESULTS.results=[];
  for(const t of TESTS){
    try{t.fn();TEST_RESULTS.passed++;TEST_RESULTS.results.push({name:t.name,ok:true});}
    catch(e){TEST_RESULTS.failed++;TEST_RESULTS.results.push({name:t.name,ok:false,err:e.message});}
  }
  if(TEST_RESULTS.failed>0) console.warn(`[GAINZ] ${TEST_RESULTS.failed} test(s) failed`);
}

// ═══════════════════════════════════════════
// DEBUG PANEL
// ═══════════════════════════════════════════
let logoTaps=0,logoTimer=null,debugLog=[];
function logDebug(msg){
  const time=new Date().toLocaleTimeString();
  debugLog.unshift(`[${time}] ${msg}`);
  if(debugLog.length>50)debugLog.pop();
}
function openDebug(){
  document.getElementById("debug-panel").classList.add("open");
  document.getElementById("dbg-version").textContent=VERSION;
  document.getElementById("dbg-screen").textContent=screen;
  document.getElementById("dbg-split").textContent=activeWorkout?activeWorkout.split:"none";
  document.getElementById("dbg-exercises").textContent=activeWorkout?activeWorkout.exercises.map(e=>e.name).join(", ")||"none":"none";
  document.getElementById("dbg-workouts").textContent=state.workouts.length;
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
function closeDebug(){ document.getElementById("debug-panel").classList.remove("open"); }

// Logo: tap 5x → debug, long-press → theme popover
const logoEl = document.getElementById("logo-tap");
let logoPressTimer = null;
let logoLongPressed = false;


logoEl.addEventListener("mousedown", ()=>{
  logoLongPressed = false;
  logoEl.classList.add("pressing");
  logoPressTimer = setTimeout(()=>{ logoLongPressed=true; logoEl.classList.remove("pressing"); openThemePopover(); }, 600);
});
logoEl.addEventListener("touchstart", (e)=>{
  logoLongPressed = false;
  logoEl.classList.add("pressing");
  logoPressTimer = setTimeout(()=>{ logoLongPressed=true; logoEl.classList.remove("pressing"); openThemePopover(); }, 600);
},{passive:true});
logoEl.addEventListener("mouseup", ()=>{ clearTimeout(logoPressTimer); logoEl.classList.remove("pressing"); });
logoEl.addEventListener("touchend", ()=>{ clearTimeout(logoPressTimer); logoEl.classList.remove("pressing"); });

logoEl.addEventListener("click",()=>{
  if(logoLongPressed){ logoLongPressed=false; return; }
  logoTaps++;clearTimeout(logoTimer);
  if(logoTaps>=5){logoTaps=0;openDebug();return;}
  logoTimer=setTimeout(()=>logoTaps=0,2000);
});
window.onerror=function(msg,src,line){logDebug(`❌ ${msg} (line ${line})`);};

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
// ── Service Worker (blob URL — no separate file needed) ──
if("serviceWorker" in navigator){
  const swCode=`const CACHE='gainz-v1';const ASSETS=['/'];self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));`;
  const blob=new Blob([swCode],{type:"application/javascript"});
  navigator.serviceWorker.register(URL.createObjectURL(blob)).catch(()=>{});
}

// ── Crash Recovery Check ──
(function checkCrashRecovery(){
  try{
    const rec=localStorage.getItem("gainz_recovery");
    if(rec&&!activeWorkout){
      const recovered=JSON.parse(rec);
      const banner=document.createElement("div");
      banner.id="recovery-banner";
      banner.style.cssText="position:fixed;top:0;left:0;right:0;background:#1e1815;border-bottom:1px solid var(--accent);padding:12px 16px;z-index:9998;display:flex;align-items:center;justify-content:space-between;font-size:12px;font-family:'DM Sans',sans-serif;color:var(--text);";
      banner.innerHTML=`<span style="color:var(--accent);">⚠ Recover last workout?</span><div style="display:flex;gap:8px;"><button onclick="(function(){activeWorkout=${JSON.stringify(recovered).replace(/"/g,'&quot;')};screen='log';document.getElementById('recovery-banner').remove();localStorage.removeItem('gainz_recovery');startWoTimer();render();})()" style="background:var(--accent);color:#0a0a0a;border:none;border-radius:6px;padding:5px 10px;font-size:11px;font-weight:600;cursor:pointer;">YES</button><button onclick="localStorage.removeItem('gainz_recovery');document.getElementById('recovery-banner').remove();" style="background:transparent;color:var(--muted);border:1px solid var(--border2);border-radius:6px;padding:5px 10px;font-size:11px;cursor:pointer;">DISCARD</button></div>`;
      document.body.appendChild(banner);
      logDebug("⚠ Crash recovery available");
    }
  }catch(e){}
})();


// ═══════════════════════════════════════════
// ONBOARDING — swipe carousel
// ═══════════════════════════════════════════
let obIdx = 0;
const OB_COUNT = 4;

function showSplash() {
  const el = document.getElementById('onboard-splash');
  if (!el) return;
  el.style.display = 'flex';
  obIdx = 0;
  _obSnap(0, false);
  _obBindSwipe();
}

function _obSnap(i, animate) {
  const track = document.getElementById('ob-cards-track');
  if (!track) return;
  if (!animate) track.style.transition = 'none';
  else track.style.transition = 'transform 0.38s cubic-bezier(0.25,1,0.5,1)';
  track.style.transform = 'translateX(' + (-i * 100) + '%)';
  // dots
  for (let j = 0; j < OB_COUNT; j++) {
    const d = document.getElementById('ob-dot-' + j);
    if (d) d.className = 'ob-dot' + (j === i ? ' active' : '');
  }
  obIdx = i;
}

function _obBindSwipe() {
  const wrap = document.getElementById('ob-cards-wrap');
  const track = document.getElementById('ob-cards-track');
  if (!wrap || !track) return;

  let startX = 0, startY = 0, dragging = false, lockAxis = null;
  let liveX = 0;

  wrap.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    dragging = true;
    lockAxis = null;
    track.style.transition = 'none';
  }, { passive: true });

  wrap.addEventListener('touchmove', e => {
    if (!dragging) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (!lockAxis) lockAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (lockAxis !== 'x') return;
    e.preventDefault();
    // rubber-band at edges
    let raw = -obIdx * 100 + (dx / wrap.offsetWidth) * 100;
    const minPct = -(OB_COUNT - 1) * 100;
    if (raw > 0) raw = raw * 0.2;
    if (raw < minPct) raw = minPct + (raw - minPct) * 0.2;
    liveX = raw;
    track.style.transform = 'translateX(' + raw + '%)';
  }, { passive: false });

  wrap.addEventListener('touchend', e => {
    if (!dragging || lockAxis !== 'x') { dragging = false; return; }
    dragging = false;
    const dx = e.changedTouches[0].clientX - startX;
    const threshold = wrap.offsetWidth * 0.22;
    const vel = dx / (e.timeStamp - (e.timeStamp - 1)); // rough
    if (dx < -threshold && obIdx < OB_COUNT - 1) {
      _obSnap(obIdx + 1, true);
    } else if (dx > threshold && obIdx > 0) {
      _obSnap(obIdx - 1, true);
    } else if (obIdx === OB_COUNT - 1 && dx < -threshold * 0.6) {
      // swipe past last card → dismiss
      dismissSplash();
    } else {
      _obSnap(obIdx, true); // snap back
    }
  }, { passive: true });

  // Also support mouse drag for desktop testing
  let mDown = false, mStartX = 0;
  wrap.addEventListener('mousedown', e => { mDown = true; mStartX = e.clientX; track.style.transition = 'none'; });
  wrap.addEventListener('mousemove', e => {
    if (!mDown) return;
    const dx = e.clientX - mStartX;
    let raw = -obIdx * 100 + (dx / wrap.offsetWidth) * 100;
    const minPct = -(OB_COUNT - 1) * 100;
    if (raw > 0) raw = raw * 0.2;
    if (raw < minPct) raw = minPct + (raw - minPct) * 0.2;
    track.style.transform = 'translateX(' + raw + '%)';
  });
  wrap.addEventListener('mouseup', e => {
    if (!mDown) return;
    mDown = false;
    const dx = e.clientX - mStartX;
    const threshold = wrap.offsetWidth * 0.22;
    if (dx < -threshold && obIdx < OB_COUNT - 1) _obSnap(obIdx + 1, true);
    else if (dx > threshold && obIdx > 0) _obSnap(obIdx - 1, true);
    else if (obIdx === OB_COUNT - 1 && dx < -threshold * 0.6) dismissSplash();
    else _obSnap(obIdx, true);
  });
  wrap.addEventListener('mouseleave', e => { if (mDown) { mDown = false; _obSnap(obIdx, true); } });
}

function dismissSplash() {
  const el = document.getElementById('onboard-splash');
  if (!el) return;
  el.classList.add('fade-out');
  setTimeout(() => { el.style.display = 'none'; }, 500);
  localStorage.setItem('gainz_seen_onboard', '1');
}

function maybeShowSplash() {
  if (!localStorage.getItem('gainz_seen_onboard')) {
    showSplash();
  }
}

// ── First-exercise coach tip (one-time only) ──────────────────────────────
let coachTipShown = !!localStorage.getItem('gainz_seen_coach');
let coachTipStep = 0;
let coachTipEl = null;

function maybeShowCoachTip() {
  if (coachTipShown) return;
  if (!activeWorkout || activeWorkout.exercises.length !== 1) return;
  const exName = activeWorkout.exercises[0].name;
  // Wait for card to render
  setTimeout(() => {
    const card = document.getElementById('ex-' + sid(exName));
    if (!card) return;
    showCoachStep(card, exName, 0);
  }, 400);
}

const COACH_STEPS = [
  { selector: '.input', msg: 'Weight prefills from your last session. Adjust if needed.' },
  { selector: '.btn.ghost', msg: 'Tap to log the set. Rest timer auto-starts.' },
  { selector: '.tip-reopen', msg: 'Tap 📚 for science-backed form & rest tips.' },
];

function showCoachStep(card, exName, step) {
  removeCoachTip();
  if (step >= COACH_STEPS.length) {
    coachTipShown = true;
    localStorage.setItem('gainz_seen_coach', '1');
    return;
  }
  const { selector, msg } = COACH_STEPS[step];
  const target = card.querySelector(selector);
  if (!target) {
    showCoachStep(card, exName, step + 1);
    return;
  }
  const tip = document.createElement('div');
  tip.className = 'ex-coach-tip';
  tip.textContent = msg;
  tip.style.cssText = 'position:absolute;z-index:80;';
  // Position relative to target
  const tRect = target.getBoundingClientRect();
  const cRect = card.getBoundingClientRect();
  tip.style.top = (tRect.bottom - cRect.top + 10) + 'px';
  tip.style.left = '12px';
  card.style.position = 'relative';
  card.appendChild(tip);
  coachTipEl = tip;
  coachTipStep = step;
  tip.addEventListener('click', () => {
    showCoachStep(card, exName, step + 1);
  });
}

function removeCoachTip() {
  if (coachTipEl) { coachTipEl.remove(); coachTipEl = null; }
}

checkOnline();
runTests();
render();
maybeShowSplash();
