// GAINZ Auto-Update Service Worker
// Caches app files, checks for updates on every load,
// and refreshes automatically when new code is deployed.

const CACHE_NAME = 'gainz-v16';
const ASSETS = [
  '/gainz/',
  '/gainz/index.html',
  '/gainz/styles.css',
  '/gainz/js/main.js',
  '/gainz/js/app-legacy.js',
  '/gainz/js/config.js',
  '/gainz/js/data.js',
  '/gainz/js/utils.js',
  '/gainz/js/state.js',
  '/gainz/js/timers.js',
  '/gainz/js/audio.js',
  '/gainz/js/onboarding.js',
  '/gainz/js/import.js',
  '/gainz/js/persistence.js',
  '/gainz/js/workout-logic.js',
  '/gainz/js/research-tips.js',
  '/gainz/js/progress-chart.js',
  '/gainz/js/supabase.js',
  '/gainz/js/challenge.js',
  '/gainz/js/daily-tracking.js',
  '/gainz/js/home-calendar.js',
  '/gainz/js/tests.js',
  '/gainz/js/nutrition.js',
];

// Install — cache all assets, bypassing browser HTTP cache
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(ASSETS.map(url =>
        fetch(url, { cache: 'reload' }).then(res => {
          if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
          return cache.put(url, res);
        })
      ))
    )
  );
  self.skipWaiting();
});

// Activate — wipe ALL old caches (including any stale gainz-v* caches),
// claim clients immediately, then force a full reload so fresh files load.
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== 'onesignal-sdk')
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => clients.forEach(c => c.navigate(c.url)))
  );
});

// Fetch — network-first for navigation, stale-while-revalidate for assets
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.includes('mikeymesce.github.io/gainz')) return;
  if (e.request.url.includes('onesignal')) return;
  if (e.request.url.includes('supabase')) return;
  if (e.request.url.includes('googleapis')) return;

  // Navigation requests (HTML pages) — always try network first
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request, { cache: 'reload' })
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // JS/CSS assets — network first, fall back to cache
  e.respondWith(
    fetch(e.request, { cache: 'reload' })
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});

// Listen for update messages
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
