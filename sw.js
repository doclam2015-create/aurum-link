// Caché offline: la app funciona sin conexión una vez abierta.
const CACHE = 'aurum-v33';
const V = '?v=33';
const FILES = ['./', './index.html', './css/app.css' + V, './js/app.js' + V, './js/audio.js' + V, './js/gfx.js' + V, './js/reels.js' + V,
  './js/games/xlink.js' + V, './js/games/avalanche.js' + V, './js/games/firewheel.js' + V, './js/games/legion.js' + V, './js/games/bull.js' + V, './js/games/dragon.js' + V, './js/games/codex.js' + V, './js/games/reef.js' + V, './js/games/western.js' + V, './js/games/galaxy.js' + V, './js/games/xthemes.js' + V,
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
  e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then(r => r || caches.match('./index.html'))));
});
