// ═══════════════════════════════════════════
// OPENING SEQUENCE — ARCHIVED (not in use)
// Cinematic splash + splash carousel
// Removed from app because it caused startup hangs
// and friction on every open. Setup flow kept in onboarding.js.
// To restore: copy sections back into onboarding.js,
// add HTML back to index.html (see comments below),
// re-add imports/exports in main.js.
// ═══════════════════════════════════════════

// ── HTML that was in index.html ──────────────────────────────────────────────
/*
<!-- CINEMATIC SPLASH — remove display:none to re-enable -->
<div id="cinematic-splash" style="display:flex;" onclick="dismissCinematic()">
  <div class="cin-container" id="cin-container">
    <div style="font-family:'Bebas Neue',system-ui,sans-serif;font-size:52px;letter-spacing:6px;color:#e8d5a0;line-height:1;">GAINZ</div>
  </div>
  <div class="cin-skip" onclick="event.stopPropagation();skipCinematic()">SKIP</div>
</div>

<!-- ONBOARDING SPLASH CAROUSEL -->
<div id="onboard-splash" style="display:none;" onclick="dismissSplash()">
  <div class="ob-logo">GAINZ</div>
  <div class="ob-tagline">Track. Progress. Dominate.</div>
  <div class="ob-cards-wrap" id="ob-cards-wrap" onclick="event.stopPropagation()">
    <div class="ob-cards-track" id="ob-cards-track"></div>
  </div>
  <div class="ob-dots" id="ob-dots"></div>
  <div style="font-family:'DM Sans',sans-serif;font-size:10px;letter-spacing:2px;color:var(--dim);margin-top:10px;opacity:0;animation:obSlideIn 0.8s ease 4.2s forwards;">SWIPE OR TAP TO SKIP</div>
  <button class="ob-skip" onclick="dismissSplash()">SKIP →</button>
</div>
*/

// ── main.js imports that were removed ───────────────────────────────────────
/*
import {
  showSplash, dismissSplash, maybeShowSplash,       // splash carousel
  maybeShowCinematic, dismissCinematic, skipCinematic, // cinematic
  ...
} from './onboarding.js';

// And in Object.assign(window, {...}):
showSplash, dismissSplash, maybeShowSplash,
maybeShowCinematic, dismissCinematic, skipCinematic,
*/

// ── app-legacy.js call that was removed ─────────────────────────────────────
/*
// In init(), after render():
// First open: setup flow → cinematic. All other opens: cinematic directly.
if (!maybeShowSetup()) {
  maybeShowCinematic();
}
*/

// ── _setupSave originally called showCinematic after setup ───────────────────
/*
// At the end of _setupSave():
// Hide setup, show cinematic
const el = document.getElementById('setup-flow');
if (el) { el.style.opacity = '0'; el.style.transition = 'opacity 0.4s'; setTimeout(() => { el.style.display = 'none'; el.style.opacity = ''; el.style.transition = ''; }, 400); }
setTimeout(() => { showCinematic(); }, 200);
// Replaced with: just hide setup, no cinematic
*/


// ═══════════════════════════════════════════
// CINEMATIC CODE (from onboarding.js lines ~317-481)
// ═══════════════════════════════════════════

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
    lines: ['Six months of lifting reversed', 'age-related muscle decline.'],
    size: 36,
    cite: 'Melov et al., PLoS ONE, 2007',
    kicker: 'Your muscles remember how to be young.'
  },
  {
    lines: ['People who exercise regularly are', '45% less likely to develop dementia.'],
    size: 34,
    cite: 'Lancet Standing Commission on Dementia, 2024',
    kicker: 'Move your body. Protect your mind.'
  },
  {
    lines: ['Exercise builds new neural pathways.', 'Your brain gets stronger every time you train.'],
    size: 34,
    cite: 'Cotman & Berchtold, Trends in Neurosciences, 2002',
    kicker: ''
  },
  {
    lines: ['30 minutes of exercise changes', 'your brain chemistry for 24 hours.'],
    size: 36,
    cite: 'Basso & Suzuki, Brain Plasticity, 2017',
    kicker: 'One session. A full day of benefits.'
  },
  {
    lines: ['Your body rebuilds 330 billion cells', 'every day. Exercise makes the new ones stronger.'],
    size: 32,
    cite: 'Sender et al., Cell, 2016',
    kicker: 'You are literally rebuilding yourself.'
  },
  {
    lines: ['After one workout, your blood carries', 'anti-inflammatory molecules for 48 hours.'],
    size: 34,
    cite: 'Hojman et al., J Physiology, 2019',
    kicker: 'Every rep is medicine.'
  },
  {
    lines: ['Exercise rewires your DNA expression.', 'You are programming your genes right now.'],
    size: 34,
    cite: 'Lindholm et al., Epigenetics, 2014',
    kicker: ''
  },
];

let cinTimer = null;
let cinCanDismiss = false;

export function maybeShowCinematic() {
  showCinematic();
  return true;
}

function showCinematic() {
  const el = document.getElementById('cinematic-splash');
  const container = document.getElementById('cin-container');
  if (!el || !container) return;

  const views = parseInt(localStorage.getItem('gainz_onboard_views') || '0');
  const stat = CIN_STATS[views % CIN_STATS.length];

  let particlesHTML = '<div class="cin-particles">';
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * 100;
    const delay = Math.random() * 6;
    const dur = 5 + Math.random() * 5;
    const size = 1 + Math.random() * 2;
    particlesHTML += `<div class="cin-particle" style="left:${x}%;bottom:-30vh;width:${size}px;height:${size}px;animation-delay:${delay}s;animation-duration:${dur}s;"></div>`;
  }
  particlesHTML += '</div>';

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
  cinCanDismiss = false;
  setTimeout(() => { cinCanDismiss = true; }, 500);

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
  cinTimer = setTimeout(() => {
    container.classList.add('cin-content-fade');
    cinCanDismiss = true;
    setTimeout(() => dismissCinematic(), 200);
  }, t);
}

export function skipCinematic() {
  if (cinTimer) { clearTimeout(cinTimer); cinTimer = null; }
  const el = document.getElementById('cinematic-splash');
  if (!el || el.style.display === 'none') return;
  el.style.transition = 'opacity 0.3s ease';
  el.style.opacity = '0';
  el.style.pointerEvents = 'none';
  setTimeout(() => { el.style.display = 'none'; }, 300);
  const ob = document.getElementById('onboard-splash');
  if (ob) { ob.style.display = 'none'; }
  const views = parseInt(localStorage.getItem('gainz_onboard_views') || '0') + 1;
  localStorage.setItem('gainz_onboard_views', String(views));
}

export function dismissCinematic() {
  if (!cinCanDismiss) return;
  if (cinTimer) { clearTimeout(cinTimer); cinTimer = null; }
  const el = document.getElementById('cinematic-splash');
  if (!el || el.style.display === 'none') return;
  cinCanDismiss = false;
  el.classList.add('cin-fade-out');
  setTimeout(() => { el.style.display = 'none'; }, 1300);
  const ob = document.getElementById('onboard-splash');
  if (ob) { ob.style.display = 'none'; }
  const views = parseInt(localStorage.getItem('gainz_onboard_views') || '0') + 1;
  localStorage.setItem('gainz_onboard_views', String(views));
}


// ═══════════════════════════════════════════
// SPLASH CAROUSEL CODE (from onboarding.js lines ~483-670)
// ═══════════════════════════════════════════

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

const OB_SHOW_COUNT = 4;
const OB_MAX_VIEWS = 10;

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
