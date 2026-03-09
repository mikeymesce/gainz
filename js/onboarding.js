// ═══════════════════════════════════════════
// ONBOARDING — Splash carousel + coach tips
// ═══════════════════════════════════════════

// ── Carousel ──
let obIdx = 0;
const OB_COUNT = 4;

export function showSplash() {
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
    if (dx < -threshold && obIdx < OB_COUNT - 1) {
      _obSnap(obIdx + 1, true);
    } else if (dx > threshold && obIdx > 0) {
      _obSnap(obIdx - 1, true);
    } else if (obIdx === OB_COUNT - 1 && dx < -threshold * 0.6) {
      dismissSplash();
    } else {
      _obSnap(obIdx, true);
    }
  }, { passive: true });

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

export function dismissSplash() {
  const el = document.getElementById('onboard-splash');
  if (!el) return;
  el.classList.add('fade-out');
  setTimeout(() => { el.style.display = 'none'; }, 500);
  localStorage.setItem('gainz_seen_onboard', '1');
}

export function maybeShowSplash() {
  if (!localStorage.getItem('gainz_seen_onboard')) {
    showSplash();
  }
}

// ── Coach Tips (first-exercise walkthrough) ──
let coachTipShown = !!localStorage.getItem('gainz_seen_coach');
let coachTipStep = 0;
let coachTipEl = null;

const COACH_STEPS = [
  { selector: '.input', msg: 'Weight prefills from your last session. Adjust if needed.' },
  { selector: '.btn.ghost', msg: 'Tap to log the set. Rest timer auto-starts.' },
  { selector: '.tip-reopen', msg: 'Tap \ud83d\udcda for science-backed form & rest tips.' },
];

// activeWorkout passed in so this module doesn't need legacy scope access
export function maybeShowCoachTip(activeWorkout) {
  if (coachTipShown) return;
  if (!activeWorkout || activeWorkout.exercises.length !== 1) return;
  const exName = activeWorkout.exercises[0].name;
  setTimeout(() => {
    const card = document.getElementById('ex-' + sid(exName));
    if (!card) return;
    showCoachStep(card, exName, 0);
  }, 400);
}

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

export function removeCoachTip() {
  if (coachTipEl) { coachTipEl.remove(); coachTipEl = null; }
}
