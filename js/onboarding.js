// ═══════════════════════════════════════════
// ONBOARDING — Cinematic intro + Splash carousel + coach tips
// ═══════════════════════════════════════════

// ── Cinematic power stats — one shown per app open ──
const CIN_STATS = [
  {
    lines: ['Exercise grows', 'new brain cells.'],
    punch: 'Literally.',
    size: 42,
    cites: [
      'Pereira et al., PNAS, 2007',
      'Erickson et al., PNAS, 2011',
      'Choi et al., Science, 2018',
      'Queensland Brain Institute, 2020',
      'Choi et al., Nature Metabolism, 2021',
      'Zhao et al., Aging Cell, 2025',
    ],
    kicker: ''
  },
  {
    lines: ['People who strength train', 'live 23% longer.'],
    size: 38,
    cite: 'Stamatakis et al., British Journal of Sports Medicine, 2018',
    kicker: 'Every rep is an investment.'
  },
  {
    lines: ['Your cells are 9 years younger', 'when you exercise.'],
    size: 36,
    cite: 'Tucker, Preventive Medicine, 2017',
    kicker: 'You are literally turning back time.'
  },
  {
    lines: ['One year of lifting reverses', '20 years of muscle loss.'],
    size: 36,
    cite: 'Melov et al., PLoS ONE, 2007',
    kicker: 'It is never too late.'
  },
  {
    lines: ['Exercise is the only proven way', 'to prevent Alzheimer\'s.'],
    size: 34,
    cite: 'Ahlskog et al., Mayo Clinic Proceedings, 2011',
    kicker: 'Your brain needs your body.'
  },
];

let cinTimer = null;

export function maybeShowCinematic() {
  const views = parseInt(localStorage.getItem('gainz_onboard_views') || '0');
  if (views >= 10) {
    // Hide cinematic overlay so app is visible
    const el = document.getElementById('cinematic-splash');
    if (el) el.style.display = 'none';
    return false;
  }
  showCinematic();
  return true;
}

function showCinematic() {
  const el = document.getElementById('cinematic-splash');
  const container = document.getElementById('cin-container');
  if (!el || !container) return;

  // Pick stat — first open always gets brain cells, then rotate
  const views = parseInt(localStorage.getItem('gainz_onboard_views') || '0');
  const stat = CIN_STATS[views % CIN_STATS.length];

  // Build particles (subtle floating embers)
  let particlesHTML = '<div class="cin-particles">';
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * 100;
    const delay = Math.random() * 6;
    const dur = 5 + Math.random() * 5;
    const size = 1 + Math.random() * 2;
    particlesHTML += `<div class="cin-particle" style="left:${x}%;bottom:-10px;width:${size}px;height:${size}px;animation-delay:${delay}s;animation-duration:${dur}s;"></div>`;
  }
  particlesHTML += '</div>';

  // Build content — headline, optional punch line, optional kicker, cite last
  // If stat has rotating cites array, pick one based on view count
  const cite = stat.cites ? stat.cites[views % stat.cites.length] : stat.cite;
  const hasKicker = stat.kicker && stat.kicker.length > 0;
  const hasPunch = stat.punch && stat.punch.length > 0;
  container.innerHTML = particlesHTML +
    `<div class="cin-headline">${stat.lines.join('<br>')}</div>` +
    (hasPunch ? `<div class="cin-punch">${stat.punch}</div>` : '') +
    (hasKicker ? `<div class="cin-kicker">${stat.kicker}</div>` : '') +
    `<div class="cin-cite">${cite}</div>`;

  el.style.display = 'flex';
  el.classList.remove('cin-fade-out');
  el.style.opacity = '1';

  const headline = container.querySelector('.cin-headline');
  const punch = container.querySelector('.cin-punch');
  const kicker = container.querySelector('.cin-kicker');
  const citeEl = container.querySelector('.cin-cite');

  let t = 800;
  setTimeout(() => headline.classList.add('show'), t);
  t += 2000;
  if (punch) { setTimeout(() => punch.classList.add('show'), t); t += 1600; }
  if (kicker) { setTimeout(() => kicker.classList.add('show'), t); t += 1600; }
  setTimeout(() => citeEl.classList.add('show'), t);
  t += 1200;
  setTimeout(() => headline.classList.add('pulse'), t);
  t += 600;
  // Fade out the text content first, then crossfade to onboarding
  cinTimer = setTimeout(() => {
    container.classList.add('cin-content-fade');
    setTimeout(() => dismissCinematic(), 200);
  }, t);
}

export function dismissCinematic() {
  if (cinTimer) { clearTimeout(cinTimer); cinTimer = null; }
  const el = document.getElementById('cinematic-splash');
  if (!el || el.style.display === 'none') return;

  // Prepare onboarding underneath (invisible)
  maybeShowSplash();

  // Start cinematic background fade out
  el.classList.add('cin-fade-out');

  // Delay GAINZ appearing so it emerges as cinematic dissolves
  const ob = document.getElementById('onboard-splash');
  requestAnimationFrame(() => { if (ob) ob.style.opacity = '1'; });

  setTimeout(() => { el.style.display = 'none'; }, 1500);
}

// ── All onboarding cards — shuffled each time ──
const OB_CARDS = [
  { icon: '🧠', title: 'Your Personal Coach', body: 'GAINZ learns your patterns. <strong>Tracks muscle volume, flags imbalances,</strong> and recommends what to train next based on your history.' },
  { icon: '📚', title: 'Science-Backed', body: 'Every exercise has <strong>research-backed tips</strong> on form, rep ranges, and recovery. Real studies, not bro science.' },
  { icon: '🦖', title: 'Wild Stats', body: 'See your total tonnage compared to real objects. <strong>"You moved a literal T-Rex this month."</strong> PRs, streaks, and milestones tracked.' },
  { icon: '📈', title: 'Auto-Progression', body: 'GAINZ calculates your next weight automatically. <strong>Just show up and lift.</strong> It handles the programming.' },
  { icon: '🏆', title: 'PR Detection', body: 'Hit a new personal record? <strong>GAINZ catches it instantly</strong> — confetti, badges, and a full PR history to look back on.' },
  { icon: '👋', title: 'Zero Setup', body: 'No account. No login. No cloud. <strong>Your data stays on your phone.</strong> Open it and start lifting in 3 seconds.' },
  { icon: '🔁', title: 'Smart Start', body: 'Start a workout and <strong>your last session auto-loads.</strong> Same exercises, ready to beat. No setup required.' },
  { icon: '📋', title: 'Paste Any Log', body: 'Got notes from another app? <strong>Paste them in and AI parses it</strong> into structured workout history. Any format.' },
  { icon: '💪', title: 'Muscle Volume', body: 'See <strong>weekly sets per muscle group</strong> vs your max recoverable volume. Know exactly when to push harder or back off.' },
  { icon: '🔥', title: 'Streaks & Milestones', body: 'Track your consistency with <strong>day streaks, workout milestones,</strong> and weekly activity heat maps. Stay accountable.' },
];

const OB_SHOW_COUNT = 4; // cards per session
const OB_MAX_VIEWS = 10; // stop showing after this many app opens

// ── Carousel state ──
let obIdx = 0;
let obCardCount = OB_SHOW_COUNT;

function _obShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function _obSpawnParticles(container) {
  // Don't double-spawn
  if (container.querySelector('.ob-particles')) return;
  const wrap = document.createElement('div');
  wrap.className = 'ob-particles';
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'amb-particle';
    const x = Math.random() * 100;
    const delay = Math.random() * 8;
    const dur = 6 + Math.random() * 6;
    const size = 1 + Math.random() * 2;
    p.style.cssText = `left:${x}%;bottom:-10px;width:${size}px;height:${size}px;animation-delay:${delay}s;animation-duration:${dur}s;`;
    wrap.appendChild(p);
  }
  container.appendChild(wrap);
}

function _obBuildCards() {
  const track = document.getElementById('ob-cards-track');
  const dotsEl = document.getElementById('ob-dots');
  if (!track || !dotsEl) return;

  // First 3 cards are pinned in order, 4th is random from the rest
  const pinned = OB_CARDS.slice(0, 3);
  const rest = _obShuffle(OB_CARDS.slice(3));
  const cards = [...pinned, rest[0]];
  obCardCount = cards.length;

  track.innerHTML = cards.map(c => `
    <div class="ob-card">
      <div class="ob-card-icon">${c.icon}</div>
      <div class="ob-card-title">${c.title}</div>
      <div class="ob-card-body">${c.body}</div>
    </div>
  `).join('');

  dotsEl.innerHTML = cards.map((_, i) =>
    `<div class="ob-dot${i === 0 ? ' active' : ''}" id="ob-dot-${i}"></div>`
  ).join('');
}

export function showSplash() {
  const el = document.getElementById('onboard-splash');
  if (!el) return;
  _obBuildCards();
  _obSpawnParticles(el);
  el.style.display = 'flex';
  el.classList.remove('fade-out');
  // If no cinematic is covering us, fade in directly
  const cin = document.getElementById('cinematic-splash');
  if (!cin || cin.style.display === 'none') {
    requestAnimationFrame(() => { el.style.opacity = '1'; });
  }
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
  for (let j = 0; j < obCardCount; j++) {
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
    const minPct = -(obCardCount - 1) * 100;
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
    if (dx < -threshold && obIdx < obCardCount - 1) {
      _obSnap(obIdx + 1, true);
    } else if (dx > threshold && obIdx > 0) {
      _obSnap(obIdx - 1, true);
    } else if (obIdx === obCardCount - 1 && dx < -threshold * 0.6) {
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
    const minPct = -(obCardCount - 1) * 100;
    if (raw > 0) raw = raw * 0.2;
    if (raw < minPct) raw = minPct + (raw - minPct) * 0.2;
    track.style.transform = 'translateX(' + raw + '%)';
  });
  wrap.addEventListener('mouseup', e => {
    if (!mDown) return;
    mDown = false;
    const dx = e.clientX - mStartX;
    const threshold = wrap.offsetWidth * 0.22;
    if (dx < -threshold && obIdx < obCardCount - 1) _obSnap(obIdx + 1, true);
    else if (dx > threshold && obIdx > 0) _obSnap(obIdx - 1, true);
    else if (obIdx === obCardCount - 1 && dx < -threshold * 0.6) dismissSplash();
    else _obSnap(obIdx, true);
  });
  wrap.addEventListener('mouseleave', e => { if (mDown) { mDown = false; _obSnap(obIdx, true); } });
}

export function dismissSplash() {
  const el = document.getElementById('onboard-splash');
  if (!el) return;
  el.classList.add('fade-out');
  setTimeout(() => { el.style.display = 'none'; }, 500);
  const views = parseInt(localStorage.getItem('gainz_onboard_views') || '0') + 1;
  localStorage.setItem('gainz_onboard_views', String(views));
}

export function maybeShowSplash() {
  const views = parseInt(localStorage.getItem('gainz_onboard_views') || '0');
  if (views < OB_MAX_VIEWS) {
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
