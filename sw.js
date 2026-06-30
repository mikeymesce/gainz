// GAINZ Auto-Update Service Worker
// Caches app files, checks for updates on every load,
// and refreshes automatically when new code is deployed.

const CACHE_NAME = 'gainz-v17';
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

// Install — cache the app shell for fast, reliable opens.
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — wipe old caches and claim clients.
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== 'onesignal-sdk')
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

function updateCache(request) {
  return fetch(request).then(response => {
    if (response && response.ok) {
      const clone = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
    }
    return response;
  });
}

// Fetch — serve cached shell/assets first, then refresh quietly.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.includes('mikeymesce.github.io/gainz')) return;
  if (e.request.url.includes('onesignal')) return;
  if (e.request.url.includes('supabase')) return;
  if (e.request.url.includes('googleapis')) return;

  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match('/gainz/index.html').then(cached => {
        const networkRefresh = updateCache(e.request).catch(() => null);
        return cached || networkRefresh;
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkRefresh = updateCache(e.request).catch(() => null);
      return cached || networkRefresh;
    })
  );
});

// Listen for update messages
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
