// ═══════════════════════════════════════════
// FEATURE FLAGS & CONSTANTS
// ═══════════════════════════════════════════
export const FEATURES = {
  researchTips: true,
  progressiveOverload: true,
  hapticFeedback: true,
  confettiOnPR: true,
  screenWakeLock: true,
  offlineDetection: true,
  devMode: false,
};

export const SCHEMA_VERSION = 6;
export const VERSION = "v5.1";
export const GLOBAL_DEFAULT = 45;

export const SPLIT_COLORS = {
  Push:'var(--accent)', Pull:'var(--superset)', Legs:'var(--green)',
  Core:'var(--superset)', Chest:'var(--accent)', Back:'var(--superset)',
  Arms:'var(--accent)', Shoulders:'var(--superset)',
  Upper:'var(--accent)', Lower:'var(--green)', Full:'var(--muted)'
};

export const TAG_COLORS = {
  Push:"", Pull:"pull", Legs:"legs", Core:"core",
  Chest:"", Back:"pull", Arms:"arms", Shoulders:"shoulders",
  Upper:"", Lower:"legs", Full:"core"
};
