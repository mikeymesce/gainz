// GAINZ Auto-Update Service Worker
// Caches app files, checks for updates on every load,
// and refreshes automatically when new code is deployed.

const CACHE_NAME = 'gainz-v13';
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

// Install — cache all assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting(); // activate immediately
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== 'onesignal-sdk').map(k => caches.delete(k)))
    )
  );
  self.clients.claim(); // take control immediately
});

// Fetch — serve from cache, update in background
self.addEventListener('fetch', e => {
  // Skip non-GET, external requests, and OneSignal
  if (e.request.method !== 'GET') return;
  if (!e.request.url.includes('mikeymesce.github.io/gainz')) return;
  if (e.request.url.includes('onesignal')) return;
  if (e.request.url.includes('supabase')) return;
  if (e.request.url.includes('googleapis')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      // Return cached version immediately
      const fetchPromise = fetch(e.request).then(response => {
        // Update cache with fresh version
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => cached); // offline fallback to cache

      return cached || fetchPromise;
    })
  );
});

// Listen for update messages
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
