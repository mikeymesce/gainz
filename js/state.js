// ═══════════════════════════════════════════
// STATE — State migration logic
// ═══════════════════════════════════════════
import { SCHEMA_VERSION } from './config.js';
import { DEFAULT_RESTS, PROGRAMS } from './data.js';

export function migrateState(s) {
  if (!s) return { workouts:[], exerciseRests:{...DEFAULT_RESTS}, streak:0, lastWorkoutDate:null, splitNames:{Push:"Push",Pull:"Pull",Legs:"Legs",Core:"Core",Chest:"Chest",Back:"Back",Arms:"Arms",Shoulders:"Shoulders"}, stacks:[], program:"ppl", schemaVersion: SCHEMA_VERSION };
  if (!s.workouts) s.workouts = [];
  if (!s.exerciseRests) s.exerciseRests = {...DEFAULT_RESTS};
  if (s.streak === undefined) s.streak = 0;
  if (!s.lastWorkoutDate) s.lastWorkoutDate = null;
  if (!s.splitNames) s.splitNames = {};
  const allSplitKeys=["Push","Pull","Legs","Core","Chest","Back","Arms","Shoulders","Upper","Lower","Full"];
  allSplitKeys.forEach(k=>{ if(!s.splitNames[k]) s.splitNames[k]=k; });
  if (!s.stacks) s.stacks = [];
  if (!s.program) s.program = "ppl";
  if (!s.bodyweight) s.bodyweight = [];
  if(!s.customSplits) s.customSplits = [...(PROGRAMS[s.program||'ppl']?.splits||['Push','Pull','Legs','Core'])];
  if(!s.templates) s.templates = [];
  if(!s.supplements) s.supplements = [];
  if(!s.vitaminTypes) s.vitaminTypes = ['Vitamin D','Fish Oil','Multivitamin'];
  if(!s._localUpdatedAt) s._localUpdatedAt = Date.now();
  if(!s._lastSyncedAt) s._lastSyncedAt = 0;
  s.schemaVersion = SCHEMA_VERSION;
  return s;
}
