// BREAK FREE Auto-Update Service Worker
const CACHE_NAME = 'breakfree-v10';
const ASSETS = [
  '/gainz/breakfree/',
  '/gainz/breakfree/index.html',
  '/gainz/breakfree/styles.css',
  '/gainz/breakfree/app.js',
  '/gainz/breakfree/icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== 'onesignal-sdk').map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.includes('mikeymesce.github.io/gainz/breakfree')) return;
  if (e.request.url.includes('onesignal')) return;
  if (e.request.url.includes('supabase')) return;
  if (e.request.url.includes('api-ninjas')) return;
  if (e.request.url.includes('googleapis')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
