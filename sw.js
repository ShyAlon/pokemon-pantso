const CACHE_NAME = 'pokemon-bantso-v4';
const urlsToCache = [
  './',
  'index.html',
  'manifest.json',
  'icon.svg',
  'trainer.svg',
  'css/game.css',
  'js/db.js',
  'js/audio.js',
  'js/species.js',
  'js/state.js',
  'js/persist.js',
  'js/ui.js',
  'js/effects.js',
  'js/battle.js',
  'js/league.js',
  'js/forest.js',
  'js/team.js',
  'js/lore.js',
  'js/menu.js',
  'js/events.js',
  'js/app.js'
];

self.addEventListener('install', event => {
  console.log('[Bantso:SW] Installing — caching', urlsToCache.length, 'files');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache).catch(err => {
        console.warn('[Bantso:SW] Some files failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('[Bantso:SW] Activating — cleaning old caches');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[Bantso:SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => {
        return caches.match('./');
      });
    })
  );
});
