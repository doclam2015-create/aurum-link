// Caché offline: la app funciona sin conexión una vez abierta.
const CACHE = 'aurum-v21';
const FILES = ['./', './index.html', './css/app.css?v=21', './js/app.js?v=21', './js/audio.js', './js/gfx.js', './js/reels.js',
  './js/games/xlink.js', './js/games/avalanche.js', './js/games/firewheel.js', './js/games/legion.js',
  './assets/symbols.webp', './icon-180.png', './icon-512.png', './manifest.webmanifest'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Red primero para que las actualizaciones lleguen; caché si no hay conexión.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then(r => r || caches.match('./index.html'))));
});
