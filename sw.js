// Caché offline: la app funciona sin conexión una vez abierta.
const CACHE = 'aurum-v75';
const V = '?v=75';
const FILES = ['./', './index.html', './css/app.css' + V, './js/app.js' + V, './js/audio.js' + V, './js/gfx.js' + V, './js/reels.js' + V,
  './js/games/xlink.js' + V, './js/games/avalanche.js' + V, './js/games/firewheel.js' + V, './js/games/legion.js' + V, './js/games/bull.js' + V, './js/games/dragon.js' + V, './js/games/codex.js' + V, './js/games/reef.js' + V, './js/games/western.js' + V, './js/games/galaxy.js' + V, './js/games/xthemes.js' + V, './js/games/wolf.js' + V, './js/games/colossal.js' + V,
  './assets/symbols.webp', './assets/themes.webp', './assets/wolf.webp', './assets/colossal.webp', './assets/giant_hero.webp', './assets/giant_sky.webp', './assets/giant_heroine.webp', './assets/giant_sym.webp', './assets/giant_scene.webp', './assets/sparta_sym.webp', './assets/sparta_tall.webp', './assets/sparta_wtall.webp', './assets/sparta_scene.webp', './assets/sfx/howl.wav', './assets/sfx/bonus_in1.mp3', './assets/sfx/bonus_in2.mp3', './assets/sfx/levelup2.mp3', './assets/sfx/levelup3.mp3', './assets/sfx/coin_loop.mp3', './assets/sfx/jackpot2.mp3', './assets/sfx/jackpot3.mp3', './assets/sfx/youwin1.mp3', './assets/sfx/youwin2.mp3', './assets/sfx/youwin3.mp3', './assets/sfx/sparta_fs.mp3', './assets/sfx/sparta_antic.mp3', './assets/sfx/real_1.mp3', './assets/sfx/real_2.mp3', './assets/sfx/real_3.mp3', './assets/sfx/real_4.mp3', './assets/sfx/real_5.mp3', './assets/sfx/real_6.mp3', './assets/sfx/real_7.mp3', './assets/sfx/real_8.mp3', './assets/sfx/real_9.mp3', './assets/sfx/real_10.mp3', './assets/sfx/real_11.mp3', './assets/sfx/real_12.mp3', './assets/sfx/real_13.mp3', './assets/sfx/real_14.mp3', './assets/sfx/real_15.mp3', './assets/voice/index.json', './icon-180.png', './icon-512.png', './manifest.webmanifest'];
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
