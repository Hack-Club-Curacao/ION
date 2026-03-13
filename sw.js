const CACHE = 'ion-v4';
const TILE_CACHE = 'ion-tiles-v4';
const API_CACHE = 'ion-api-v4';
const TILE_HOSTS = ['tile.openstreetmap.org','opentopomap.org','arcgisonline.com','stadiamaps.com'];
const API_HOSTS = ['open-meteo.com','worldtimeapi.org','nominatim.openstreetmap.org','opensky-network.org'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/index.html'])));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE && k !== TILE_CACHE && k !== API_CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Tile caching — cache first
  if (TILE_HOSTS.some(h => url.host.includes(h))) {
    e.respondWith(caches.open(TILE_CACHE).then(c =>
      c.match(e.request).then(r => r || fetch(e.request).then(nr => {
        if (nr.ok) c.put(e.request, nr.clone());
        return nr;
      }).catch(() => new Response('', {status: 503})))
    ));
    return;
  }
  // API — network first, cache fallback
  if (API_HOSTS.some(h => url.host.includes(h))) {
    e.respondWith(fetch(e.request).then(r => {
      if (r.ok) caches.open(API_CACHE).then(c => c.put(e.request, r.clone()));
      return r;
    }).catch(() => caches.match(e.request).then(r => r || new Response('{}', {headers: {'Content-Type':'application/json'}}))));
    return;
  }
  // App shell — cache first
  e.respondWith(caches.open(CACHE).then(c =>
    c.match(e.request).then(r => r || fetch(e.request).then(nr => {
      if (nr.ok && url.pathname !== '/') c.put(e.request, nr.clone());
      return nr;
    }).catch(() => caches.match('/index.html').then(r => r || new Response('Offline', {status: 503}))))
  ));
});
