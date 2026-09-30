// RODILLOS COLOSALES (como los "Colossal Reels" de WMS): un tablero principal de 5×4 y, a su
// derecha, un tablero colosal de 5×12. 100 líneas (40 en el principal + 60 en el colosal).
//  · ORO DEL GIGANTE (como Giant's Gold): la habichuela es WILD apilado; un rodillo del principal
//    lleno de WILD se TRANSFIERE entero al mismo rodillo del colosal. Los huevos de oro (apilados,
//    solo en los rodillos 1, 3 y 5 de ambos tableros) en 3+ rodillos dan de 5 a 100 giros gratis
//    según cuántos huevos haya a la vista; en los giros gratis el colosal paga x2.
//  · ESPARTACO COLOSO (como Spartacus Super Colossal Reels): Espartaco es WILD apilado. Antes de
//    girar, algunos Espartacos de los rodillos 1–4 se vuelven SUPER ESPARTACO; puede caer un
//    MEGA WILD de 2 rodillos de ancho. Un rodillo lleno de WILD se transfiere al colosal y, si
//    llevaba un Super Espartaco, da un RE-GIRO con los WILD fijos (hasta 9 seguidos). El rodillo 5
//    del colosal tiene símbolos dobles y WILD con multiplicador x2…x25 (x50 y x100 en giros gratis).
//    3/4/5+ coliseos = 10/15/20 giros gratis.
import { glow, goldText, roundRect, rand, FONT, makeCanvas, boltPoints, drawBolt } from '../gfx.js?v=71';
import { ReelSet, LINES_5x3, weighted } from '../reels.js?v=71';

const COLS = 5, ROWS = 4, BIG_ROWS = 12;
// 40 líneas del tablero principal y 60 del colosal (20 por cada banda de 4 filas)
function mainLines() {
  const out = [], seen = new Set();
  const add = l => { const k = l.join(); if (!seen.has(k) && out.length < 40) { seen.add(k); out.push(l); } };
  [0, 1].forEach(b => LINES_5x3.forEach(L => add(L.map(r => r + b))));
  [[3, 3, 3, 3, 3], [0, 1, 2, 3, 3], [3, 2, 1, 0, 0], [0, 1, 2, 3, 2], [3, 2, 1, 0, 1], [0, 3, 0, 3, 0], [3, 0, 3, 0, 3], [1, 3, 1, 3, 1], [2, 0, 2, 0, 2], [0, 0, 3, 0, 0], [3, 3, 0, 3, 3]].forEach(add);
  return out;
}
export const LINES = mainLines();
export const BIG_LINES = [0, 4, 8].flatMap(b => LINES.slice(0, 20).map(L => L.map(r => r + b)));
const SCAT_REELS = [0, 2, 4];
// Huevos de oro a la vista → giros gratis (3 huevos = 5 giros … 40 o más = 100 giros)
const EGG_SPINS = [[40, 100], [35, 80], [30, 65], [25, 50], [20, 40], [16, 30], [13, 25], [10, 20], [8, 15], [7, 12], [6, 10], [5, 8], [4, 6], [3, 5]];
export const eggSpins = n => (EGG_SPINS.find(([m]) => n >= m) || [0, 5])[1];
export const MYSTERY_P = 1 / 260;

// ---------- Configuración de cada juego ----------
export const GIANT = {
  id: 'giant', name: 'Oro del Gigante', music: 'fairy', bonusMusic: 'fairyBonus',
  wild: 'bean', scatter: 'egg', scatName: 'rodillos con huevos de oro',
  high: ['giant', 'girl', 'harp', 'sack', 'cow', 'goose'], low: ['A', 'K', 'Q', 'J'],
  pay: {
    bean: [0, 0, 0, 50, 200, 1000], giant: [0, 0, 0, 40, 150, 750], girl: [0, 0, 0, 30, 120, 500], harp: [0, 0, 0, 25, 100, 300], sack: [0, 0, 0, 20, 80, 250],
    cow: [0, 0, 0, 15, 50, 150], goose: [0, 0, 0, 15, 40, 120], A: [0, 0, 0, 8, 25, 100], K: [0, 0, 0, 8, 20, 90], Q: [0, 0, 0, 5, 15, 75], J: [0, 0, 0, 5, 15, 60]
  },
  weights: { giant: 3, girl: 3.5, harp: 4, sack: 4.5, cow: 5, goose: 5, A: 10, K: 10, Q: 11, J: 13, bean: 0.8, egg: 1.4 },
  scale: 1.37,
  fullWild: { base: 0.006, free: 0.05 }, stackP: 0.3, wildStack: 0.14, eggStack: 0.35,
  colors: {
    giant: ['#e8c89a', '#8a5a2a'], girl: ['#bfe8a8', '#3a7a2a'], harp: ['#fff0b0', '#b8861a'], sack: ['#ffc0b0', '#a82a1a'], cow: ['#d8f0ff', '#3a7ab0'], goose: ['#fff8e0', '#c8a040'],
    A: ['#b02ad8', '#3a0a5a'], K: ['#f08a1a', '#6a2a04'], Q: ['#e0b010', '#6a4a04'], J: ['#2a7ae0', '#0a2a6a']
  },
  badge: {}, tall: ['giant', 'girl'],
  names: { bean: 'Habichuela mágica (WILD)', giant: 'Gigante', girl: 'Heroína', harp: 'Arpa dorada', sack: 'Saco de oro', cow: 'Vaca', goose: 'Cisne', egg: 'Huevo de oro (BONUS)', A: 'A', K: 'K', Q: 'Q', J: 'J' }
};
export const SPARTA = {
  id: 'spartacus', name: 'Espartaco Coloso', music: 'arena', bonusMusic: 'arenaBonus',
  wild: 'sparta', super: 'super', multWild: 'mw', scatter: 'colis', scatName: 'coliseos',
  high: ['helm', 'warrior', 'lion', 'net', 'chariot', 'sword'], low: ['A', 'K', 'Q', 'J'],
  pay: {
    sparta: [0, 0, 0, 50, 250, 1000], helm: [0, 0, 0, 40, 150, 600], warrior: [0, 0, 0, 35, 125, 500], lion: [0, 0, 0, 30, 100, 400], net: [0, 0, 0, 25, 90, 300],
    chariot: [0, 0, 0, 20, 75, 250], sword: [0, 0, 0, 20, 60, 200], A: [0, 0, 0, 10, 30, 100], K: [0, 0, 0, 10, 25, 100], Q: [0, 0, 0, 5, 20, 75], J: [0, 0, 0, 5, 15, 60]
  },
  weights: { helm: 3, warrior: 3.3, lion: 3.5, net: 4, chariot: 5, sword: 5, A: 8, K: 8, Q: 9, J: 10, sparta: 0.8, colis: 1.1, mw: 0.5 },
  scale: 0.97,
  fullWild: { base: 0.002, free: 0.012 }, mega: { base: 0.0025, free: 0.012 }, stackP: 0.3, wildStack: 0.1, superP: 0.25,
  mults: [[2, 40], [3, 25], [5, 18], [10, 10], [25, 4]], freeMults: [[2, 30], [3, 25], [5, 20], [10, 12], [25, 6], [50, 2], [100, 1]],
  colors: {
    warrior: ['#ffb0a0', '#8a1a0a'], lion: ['#c080ff', '#3a0a6a'], helm: ['#ffd0a0', '#8a3a0a'], net: ['#8ab0e0', '#0a1a3a'], chariot: ['#fff4d0', '#c8a050'], sword: ['#fff4d0', '#c8a050'],
    A: ['#ff6ae0', '#7a0a6a'], K: ['#ffa040', '#8a2a04'], Q: ['#ffe040', '#8a6a04'], J: ['#4a8aff', '#0a2a8a']
  },
  badge: {}, tall: ['warrior', 'helm'],
  names: { sparta: 'Espartaco (WILD)', super: 'Super Espartaco (WILD, da re-giro al transferirse)', mw: 'WILD x2…x25 (solo rodillo 5 del colosal)', helm: 'Espartaco', warrior: 'Guerrera', lion: 'León', net: 'Gladiador con mayal', chariot: 'Carro de guerra', sword: 'Escudo y gladius', colis: 'Coliseo (BONUS)', A: 'A', K: 'K', Q: 'Q', J: 'J' }
};

// ---------- Lógica pura (se puede simular sin pantalla) ----------
function pickMult(cfg, free) { const t = {}; (free ? cfg.freeMults : cfg.mults).forEach(([m, w]) => { t[m] = w; }); return +weighted(t); }
// big: tablero colosal. Los WILD con multiplicador solo existen en el rodillo 5 del colosal.
export function pickSym(cfg, c, free, big) {
  const w = Object.assign({}, cfg.weights);
  if (!SCAT_REELS.includes(c)) w[cfg.scatter] = 0;
  if (cfg.multWild && !(big && c === 4)) w[cfg.multWild] = 0;
  if (free) w[cfg.wild] *= 1.4;
  const k = weighted(w);
  return k === cfg.multWild ? { k, mult: pickMult(cfg, free) } : { k };
}
export const isWild = (cfg, k) => k === cfg.wild || k === cfg.super || k === cfg.multWild;
const fullCol = (cfg, n, k) => Array.from({ length: n }, () => ({ k: k || cfg.wild, full: true }));
// Rodillo del tablero principal: sueltos + (a veces) una pila de un símbolo alto o de WILD.
// Los huevos de oro también caen apilados; los coliseos, de a uno por rodillo.
export function mainColumn(cfg, c, free) {
  if (Math.random() < (free ? cfg.fullWild.free : cfg.fullWild.base)) return fullCol(cfg, ROWS);
  const col = []; let sc = false;
  for (let r = 0; r < ROWS; r++) { let s = pickSym(cfg, c, free, false); if (s.k === cfg.scatter && sc && !cfg.eggStack) s = { k: cfg.low[0] }; if (s.k === cfg.scatter) sc = true; col.push(s); }
  if (Math.random() < cfg.stackP) {
    const k = Math.random() < cfg.wildStack ? cfg.wild : cfg.high[Math.random() * cfg.high.length | 0];
    const h = 2 + (Math.random() * 3 | 0), r0 = Math.random() * (ROWS - h + 1) | 0;
    for (let r = r0; r < r0 + h; r++) if (col[r].k !== cfg.scatter) col[r] = { k };
  }
  if (cfg.eggStack && sc && Math.random() < cfg.eggStack) {
    const r = col.findIndex(s => s.k === cfg.scatter), h = 1 + (Math.random() * 3 | 0);
    for (let i = r; i < Math.min(ROWS, r + h); i++) col[i] = { k: cfg.scatter };
  }
  return col;
}
// Rodillo colosal: pilas de 2 a 4 filas del mismo símbolo. En Espartaco el rodillo 5 lleva
// 6 símbolos dobles (2 filas cada uno).
export function bigColumn(cfg, c, free) {
  const col = []; let sc = false;
  if (cfg.multWild && c === 4) {
    for (let i = 0; i < BIG_ROWS / 2; i++) {
      let s = pickSym(cfg, c, free, true); if (s.k === cfg.scatter) { if (sc) s = { k: cfg.low[i % cfg.low.length] }; else sc = true; }
      const id = Math.random(); col.push(Object.assign({ blk: id, dbl: true }, s), Object.assign({ blk: id, dbl: true }, s));
    }
    return col;
  }
  while (col.length < BIG_ROWS) {
    let s = pickSym(cfg, c, free, true);
    if (s.k === cfg.scatter) { if (sc) continue; sc = true; }
    const rem = BIG_ROWS - col.length;
    let h = s.k === cfg.scatter ? (cfg.eggStack ? 1 + (Math.random() * 3 | 0) : 2) : Math.random() < 0.25 ? 2 : Math.random() < 0.6 ? 3 : 4;
    h = Math.min(h, rem); if (rem - h === 1) h = h < 4 ? h + 1 : h - 1;
    const id = Math.random();
    for (let i = 0; i < h; i++) col.push(Object.assign({ blk: id }, s));
  }
  return col;
}
// Líneas: los WILD sustituyen a todo menos el BONUS; el WILD con multiplicador multiplica la línea.
export function evalLines(cfg, g, lines, lineBet, set, mult = 1) {
  const wins = [];
  lines.forEach((L, li) => {
    const cells = L.map((r, c) => g[c][r]), s = cells.map(x => x.k);
    if (s[0] === cfg.scatter) return;
    const base = s.find(k => !isWild(cfg, k)) || cfg.wild;
    let best = null;
    [base, cfg.wild].forEach(k => {
      if (!cfg.pay[k]) return;
      let n = 0;
      if (k === cfg.wild) while (n < COLS && isWild(cfg, s[n])) n++;
      else while (n < COLS && (s[n] === k || isWild(cfg, s[n]))) n++;
      let m = 1; for (let i = 0; i < n; i++) if (cells[i].mult) m = Math.max(m, cells[i].mult);
      const p = cfg.pay[k][n] * cfg.scale * lineBet * m * mult;
      if (p && (!best || p > best.win)) best = { li, line: L, n, k, win: p, set, m };
    });
    if (best) wins.push(best);
  });
  return wins;
}
// Rodillos con BONUS (de 6: 1, 3 y 5 de cada tablero) y cantidad de símbolos BONUS a la vista
export function countScatters(cfg, main, big) {
  let reels = 0, n = 0;
  SCAT_REELS.forEach(c => [main[c], big[c]].forEach(col => { const k = col.filter(s => s.k === cfg.scatter).length; if (k) reels++; n += k; }));
  return { reels, n };
}
// Tirada (sin animación). hold = columnas WILD fijas de un re-giro (Espartaco).
export function spinBoards(cfg, free, hold = []) {
  const main = [], big = [];
  for (let c = 0; c < COLS; c++) {
    if (hold.includes(c)) { main.push(fullCol(cfg, ROWS)); big.push(fullCol(cfg, BIG_ROWS)); continue; }
    main.push(mainColumn(cfg, c, free)); big.push(bigColumn(cfg, c, free));
  }
  let mega = -1;
  if (cfg.mega && Math.random() < (free ? cfg.mega.free : cfg.mega.base)) {
    const opts = [0, 1, 2, 3].filter(c => !hold.includes(c) && !hold.includes(c + 1));
    if (opts.length) {
      mega = opts[Math.random() * opts.length | 0];
      const k = Math.random() < 0.35 ? cfg.super : cfg.wild;
      [mega, mega + 1].forEach(c => { main[c] = Array.from({ length: ROWS }, () => ({ k, full: true, mega: true })); });
    }
  }
  // Antes del giro, algunos Espartacos de los rodillos 1–4 se vuelven Super Espartaco (máx. 4)
  if (cfg.super) {
    let n = 0;
    for (let c = 0; c < 4; c++) if (!hold.includes(c) && !main[c][0].mega) main[c].forEach((s, r) => { if (s.k === cfg.wild && n < 4 && Math.random() < cfg.superP) { main[c][r] = Object.assign({}, s, { k: cfg.super }); n++; } });
  }
  return { main, big, mega, hold: hold.slice() };
}
// Rodillos del principal llenos de WILD → se transfieren al colosal (los ya fijos no cuentan de nuevo)
export function transfers(cfg, b) {
  const out = []; let sup = false;
  b.main.forEach((col, c) => {
    if (b.hold.includes(c) || !col.every(s => isWild(cfg, s.k))) return;
    out.push(c); if (col.some(s => s.k === cfg.super)) sup = true;
    b.big[c] = fullCol(cfg, BIG_ROWS);
  });
  return { cols: out, respin: sup };
}
export function settle(cfg, b, bet, free) {
  const lb = bet / 100;
  const wm = evalLines(cfg, b.main, LINES, lb, 'main');
  const wb = evalLines(cfg, b.big, BIG_LINES, lb, 'big', free && cfg.eggStack ? 2 : 1);
  const wins = wm.concat(wb);
  return { wins, total: wins.reduce((a, w) => a + w.win, 0), scat: countScatters(cfg, b.main, b.big) };
}
// Progresivos: cantidad de rodillos transferidos al colosal en la jugada (con sus re-giros)
export const jackpotFor = n => ({ 2: 'mini', 3: 'minor', 4: 'major', 5: 'grand' })[Math.min(5, n)] || null;
export const spinsFor = (cfg, sc) => cfg.eggStack ? eggSpins(sc.n) : sc.reels >= 5 ? 20 : sc.reels === 4 ? 15 : 10;

// ---------- Arte (assets/colossal.webp y las imágenes de escenario, ver tools/build_colossal.py) ----------
let SHEET = null; const IMG = {};
const POS = { giant: 0, girl: 1, harp: 2, cow: 3, goose: 4, sack: 5, egg: 6, lion: 7, warrior: 8, helm: 9, chariot: 10, sword: 11, colis: 12, shield: 13, bust: 14 };
const TALL = { bean: 3000, sparta: 3100 };
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
export function loadColossalArt() {
  const one = (k, f) => loadImg('assets/' + f).then(i => { IMG[k] = i; }).catch(() => { });
  return Promise.all([loadImg('assets/colossal.webp').then(i => { SHEET = i; }), one('hero', 'giant_hero.webp'), one('sky', 'giant_sky.webp'), one('gheroine', 'giant_heroine.webp'), one('gsym', 'giant_sym.webp'), one('gscene', 'giant_scene.webp'), one('spsym', 'sparta_sym.webp'), one('sptall', 'sparta_tall.webp'), one('wartall', 'sparta_wtall.webp'), one('spscene', 'sparta_scene.webp')]).then(() => cache.clear());
}
// Recorte de la hoja: [sx, sy, sw, sh]
function src(k) { if (TALL[k] != null) return [TALL[k], 0, 100, 200]; return [POS[k] * 200 + 2, 2, 196, 196]; }
// Imagen que cubre un rectángulo (recorta lo que sobra), anclada en (ax, ay)
function cover(x, img, dx, dy, dw, dh, ax = 0.5, ay = 0.5) {
  if (!img) return;
  const s = Math.max(dw / img.width, dh / img.height), w = img.width * s, h = img.height * s;
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  x.drawImage(img, dx + (dw - w) * ax, dy + (dh - h) * ay, w, h);
}
// Espartaco: casillas de la hoja sparta_sym.webp (sacadas de las capturas de la máquina)
const GPT = { sack: 0, goose: 1, harp: 2, Q: 3, K: 4, J: 5, egg: 6, A: 7, cow: 8, bean: 9 };
// hoja de casillas de cada juego: [imagen, mapa]
const tilesOf = cfg => cfg.id === 'giant' ? [IMG.gsym, GPT] : [IMG.spsym, SPT];
const SPT = { lion: 0, chariot: 1, sword: 2, net: 3, K: 4, J: 5, Q: 6, A: 7, sparta: 8, super: 9, mw: 10, colis: 11 };
// Dibuja una figura de la hoja ajustada (sin deformar) dentro de un rectángulo
function art(x, k, dx, dy, dw, dh, f = 1, ay = 0.5) {
  if (SPT[k] != null && IMG.spsym) {
    const s = Math.min(dw, dh) * f; x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(IMG.spsym, SPT[k] * 200, 0, 200, 200, dx + (dw - s) / 2, dy + (dh - s) * ay, s, s); return;
  }
  if (!SHEET) return;
  const [sx, sy, sw, sh] = src(k), s = Math.min(dw / sw, dh / sh) * f, w = sw * s, h = sh * s;
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  x.drawImage(SHEET, sx, sy, sw, sh, dx + (dw - w) / 2, dy + (dh - h) * ay, w, h);
}
const cache = new Map();
function cached(key, w, h, fn) {
  w = Math.max(8, Math.round(w)); h = Math.max(8, Math.round(h)); const kk = key + '|' + w + '|' + h;
  let c = cache.get(kk); if (c) return c;
  c = makeCanvas(w, h); fn(c.getContext('2d'), w, h); if (SHEET) cache.set(kk, c); return c;
}
function label(x, cx, t, y, fs, maxW, fill = ['#fff8d0', '#f0b020'], stroke = '#2a0a00') {
  x.font = '900 ' + fs + 'px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  x.lineWidth = fs * 0.3; x.strokeStyle = stroke; x.strokeText(t, cx, y, maxW);
  const g = x.createLinearGradient(0, y - fs / 2, 0, y + fs / 2); g.addColorStop(0, fill[0]); g.addColorStop(1, fill[1]);
  x.fillStyle = g; x.fillText(t, cx, y, maxW);
}
function tile(x, w, h, c1, c2, rim = '#f5d27a', rr = 0.12) {
  const m = Math.min(w, h) * 0.04, g = x.createRadialGradient(w / 2, h * 0.4, 1, w / 2, h / 2, Math.max(w, h) * 0.7);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  roundRect(x, m, m, w - 2 * m, h - 2 * m, Math.min(w, h) * rr); x.fillStyle = g; x.fill();
  x.lineWidth = Math.min(w, h) * 0.04; x.strokeStyle = rim; x.stroke();
}
const RANKTXT = { A: 'A', K: 'K', Q: 'Q', J: 'J', ten: '10' };
function rankIcon(cfg, k, s, x) {
  const t = RANKTXT[k], [c1, c2] = cfg.colors[k], fs = s * (t.length > 1 ? 0.62 : 0.8), y = s * 0.53;
  const giant = cfg.id === 'giant';
  x.font = '900 ' + fs + 'px Georgia, "Times New Roman", serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  x.lineWidth = s * 0.1; x.strokeStyle = giant ? '#fff' : '#2a0a04'; x.strokeText(t, s / 2, y, s * 0.92);
  x.lineWidth = s * 0.04; x.strokeStyle = giant ? c2 : '#ffe8a0'; x.strokeText(t, s / 2, y, s * 0.92);
  const g = x.createLinearGradient(0, y - fs / 2, 0, y + fs / 2); g.addColorStop(0, giant ? '#fff' : '#fffbe8'); g.addColorStop(0.35, c1); g.addColorStop(1, c2);
  x.fillStyle = g; x.fillText(t, s / 2, y, s * 0.92);
  // gema o remache decorativo
  const gx = s * 0.8, gy = s * 0.2, gr = s * 0.07, gg = x.createRadialGradient(gx - gr * 0.3, gy - gr * 0.3, 1, gx, gy, gr);
  gg.addColorStop(0, '#fff'); gg.addColorStop(0.4, giant ? c1 : '#ffd24a'); gg.addColorStop(1, giant ? c2 : '#6a3a04');
  x.fillStyle = gg; x.beginPath(); x.arc(gx, gy, gr, 0, 7); x.fill();
}
const SUITS = { heart: 1, spade: 1, diamond: 1, club: 1 };
const isLow = (cfg, k) => cfg.low.includes(k);
// Personajes con imagen de cuerpo entero: [imagen, posición horizontal de la cara (0–1)]
const HEROES = { giant: ['hero', 0.4, [30, 0, 176, 176]], girl: ['gheroine', 0.5, [55, 30, 100, 100]], warrior: ['wartall', 0.5, [0, 14, 75, 75]], helm: ['sptall', 0.5, [4, 0, 100, 100]] };
const heroOf = k => HEROES[k] && IMG[HEROES[k][0]] ? HEROES[k] : null;
function suitPath(x, k, s) {
  const c = s / 2; x.beginPath();
  if (k === 'heart') { x.moveTo(c, s * 0.84); x.bezierCurveTo(s * 0.1, s * 0.5, s * 0.08, s * 0.16, c - s * 0.18, s * 0.16); x.bezierCurveTo(c - s * 0.06, s * 0.16, c, s * 0.26, c, s * 0.3); x.bezierCurveTo(c, s * 0.26, c + s * 0.06, s * 0.16, c + s * 0.18, s * 0.16); x.bezierCurveTo(s * 0.92, s * 0.16, s * 0.9, s * 0.5, c, s * 0.84); }
  else if (k === 'spade') { x.moveTo(c, s * 0.12); x.bezierCurveTo(s * 0.9, s * 0.46, s * 0.9, s * 0.72, c + s * 0.16, s * 0.7); x.bezierCurveTo(c + s * 0.06, s * 0.7, c + s * 0.03, s * 0.64, c + s * 0.02, s * 0.62); x.lineTo(c + s * 0.12, s * 0.88); x.lineTo(c - s * 0.12, s * 0.88); x.lineTo(c - s * 0.02, s * 0.62); x.bezierCurveTo(c - s * 0.03, s * 0.64, c - s * 0.06, s * 0.7, c - s * 0.16, s * 0.7); x.bezierCurveTo(s * 0.1, s * 0.72, s * 0.1, s * 0.46, c, s * 0.12); }
  else if (k === 'diamond') { x.moveTo(c, s * 0.1); x.quadraticCurveTo(c + s * 0.12, s * 0.35, s * 0.82, c); x.quadraticCurveTo(c + s * 0.12, s * 0.65, c, s * 0.9); x.quadraticCurveTo(c - s * 0.12, s * 0.65, s * 0.18, c); x.quadraticCurveTo(c - s * 0.12, s * 0.35, c, s * 0.1); }
  else { [[c, s * 0.3], [c - s * 0.19, s * 0.55], [c + s * 0.19, s * 0.55]].forEach(([px, py]) => { x.moveTo(px + s * 0.17, py); x.arc(px, py, s * 0.17, 0, 7); }); x.moveTo(c - s * 0.04, s * 0.55); x.lineTo(c - s * 0.12, s * 0.88); x.lineTo(c + s * 0.12, s * 0.88); x.lineTo(c + s * 0.04, s * 0.55); }
  x.closePath();
}
function suitIcon(cfg, k, s, x) {
  const [c1, c2] = cfg.colors[k];
  x.save(); x.shadowColor = 'rgba(0,0,0,0.55)'; x.shadowBlur = s * 0.05; x.shadowOffsetY = s * 0.02;
  suitPath(x, k, s); x.lineJoin = 'round'; x.lineWidth = s * 0.07; x.strokeStyle = '#1a0804'; x.stroke(); x.restore();
  suitPath(x, k, s); x.lineWidth = s * 0.03; x.strokeStyle = '#ffe8a0'; x.stroke();
  const g = x.createLinearGradient(0, s * 0.1, 0, s * 0.9); g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, c1); g.addColorStop(1, c2);
  x.fillStyle = g; x.fill();
  // brillo
  x.save(); suitPath(x, k, s); x.clip(); x.globalAlpha = 0.35; x.fillStyle = '#fff'; x.beginPath(); x.ellipse(s * 0.42, s * 0.3, s * 0.16, s * 0.08, -0.5, 0, 7); x.fill(); x.restore();
}
// Placa del WILD de Espartaco: logo "ESPARTACO · GLADIADOR DE ROMA" en bronce (dorada si es Super)
function logoTile(x, s, sup) {
  tile(x, s, s, sup ? '#ffe68a' : '#5a3418', sup ? '#9a5a08' : '#1e0c04', sup ? '#fff8d0' : '#d8a048', 0.06);
  if (sup) x.drawImage(glow('rgba(255,240,170,1)', 64), -s * 0.1, -s * 0.1, s * 1.2, s * 1.2);
  const fs = s * 0.21, y = s * 0.4;
  x.font = '900 ' + fs + 'px Georgia, "Times New Roman", serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  x.lineWidth = fs * 0.3; x.strokeStyle = '#1a0800'; x.strokeText('ESPARTACO', s / 2, y, s * 0.9);
  const g = x.createLinearGradient(0, y - fs / 2, 0, y + fs / 2); g.addColorStop(0, '#fff6d0'); g.addColorStop(0.45, '#e8a040'); g.addColorStop(0.55, '#b86a18'); g.addColorStop(1, '#fff0b0');
  x.fillStyle = g; x.fillText('ESPARTACO', s / 2, y, s * 0.9);
  // espada bajo el nombre
  x.strokeStyle = '#e8ecf4'; x.lineWidth = s * 0.025; x.lineCap = 'round'; x.beginPath(); x.moveTo(s * 0.2, s * 0.56); x.lineTo(s * 0.86, s * 0.56); x.stroke();
  x.fillStyle = '#f0c040'; x.fillRect(s * 0.16, s * 0.52, s * 0.035, s * 0.08); x.fillRect(s * 0.1, s * 0.545, s * 0.07, s * 0.03);
  x.font = '800 ' + s * 0.085 + 'px ' + FONT; x.fillStyle = sup ? '#4a2004' : '#f0d8a0'; x.fillText('GLADIADOR DE ROMA', s / 2, s * 0.66, s * 0.84);
  label(x, s / 2, sup ? 'SUPER WILD' : 'WILD', s * 0.84, s * 0.17, s * 0.9, sup ? ['#fff', '#ffb020'] : undefined);
}
// Icono cuadrado de cada símbolo (fondo transparente salvo WILD / BONUS)
export function symIcon(cfg, k, size, mult) {
  return cached(cfg.id + k + (mult || ''), size, size, (x, s) => {
    const [tImg, tMap] = tilesOf(cfg);
    if (tImg && tMap[k] != null) {
      x.imageSmoothingQuality = 'high'; x.drawImage(tImg, tMap[k] * 200, 0, 200, 200, 0, 0, s, s);
      if (k === 'mw') {
        // el marco del multiplicador lleva el valor que tocó (x2 … x100)
        const g = x.createRadialGradient(s / 2, s * 0.52, 1, s / 2, s * 0.52, s * 0.3); g.addColorStop(0, '#0a2a30'); g.addColorStop(1, '#020a0c');
        x.fillStyle = g; x.beginPath(); x.arc(s / 2, s * 0.52, s * 0.29, 0, 7); x.fill();
        const t = (mult || 2) + 'X', fs = s * (t.length > 3 ? 0.26 : t.length > 2 ? 0.32 : 0.4);
        x.font = '900 ' + fs + 'px Georgia, "Times New Roman", serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
        const tg = x.createLinearGradient(0, s * 0.35, 0, s * 0.7); tg.addColorStop(0, '#c0fff0'); tg.addColorStop(0.5, '#2ad0b0'); tg.addColorStop(1, '#0a6a5a');
        x.lineWidth = fs * 0.12; x.strokeStyle = '#012'; x.strokeText(t, s / 2, s * 0.54, s * 0.52); x.fillStyle = tg; x.fillText(t, s / 2, s * 0.54, s * 0.52);
      }
      return;
    }
    if (RANKTXT[k]) return rankIcon(cfg, k, s, x);
    if (SUITS[k]) return suitIcon(cfg, k, s, x);
    if (k === 'sparta' || k === 'super') return logoTile(x, s, k === 'super');
    x.save(); x.shadowColor = 'rgba(0,0,0,0.45)'; x.shadowBlur = s * 0.05; x.shadowOffsetY = s * 0.02;
    if (k === 'egg') { tile(x, s, s, '#9a4ae0', '#2a0a5a'); x.restore(); x.drawImage(glow('rgba(255,210,80,1)', 64), 0, 0, s, s); art(x, 'egg', 0, s * 0.02, s, s * 0.8, 0.9); label(x, s / 2, 'BONUS', s * 0.84, s * 0.19, s * 0.9); return; }
    if (k === 'bean') { tile(x, s, s, '#9aeaa0', '#1a6a2a'); x.restore(); art(x, 'bean', 0, 0, s, s * 0.86, 1.05); label(x, s / 2, 'WILD', s * 0.8, s * 0.26, s * 0.92); return; }
    if (k === 'mw') { tile(x, s, s, '#ffd870', '#6a2a04'); x.restore(); art(x, 'shield', 0, s * 0.02, s, s * 0.66, 0.95); label(x, s / 2, 'x' + (mult || 2), s * 0.76, s * 0.3, s * 0.92, ['#fff', '#ff5a2a']); return; }
    if (k === 'colis') { tile(x, s, s, '#ffe0a0', '#8a3a0a'); x.restore(); x.drawImage(glow('rgba(255,210,80,1)', 64), 0, 0, s, s); art(x, 'colis', 0, s * 0.04, s, s * 0.72, 0.95); label(x, s / 2, 'BONUS', s * 0.84, s * 0.19, s * 0.9); return; }
    if (heroOf(k)) {
      // retrato recortado de la misma imagen del personaje, en un marco de retrato
      const [key, , [sx, sy, sw, sh]] = heroOf(k), m = s * 0.05, r = s * 0.12;
      roundRect(x, m, m, s - 2 * m, s - 2 * m, r); x.fillStyle = '#000'; x.fill(); x.restore();
      x.save(); roundRect(x, m, m, s - 2 * m, s - 2 * m, r); x.clip(); x.imageSmoothingQuality = 'high'; x.drawImage(IMG[key], sx, sy, sw, sh, m, m, s - 2 * m, s - 2 * m); x.restore();
      x.lineWidth = s * 0.045; x.strokeStyle = k === 'giant' ? '#ffd24a' : k === 'girl' ? '#ff8ad0' : '#e8a050'; roundRect(x, m, m, s - 2 * m, s - 2 * m, r); x.stroke();
      return;
    }
    if (cfg.badge && cfg.badge[k]) {
      // óvalo de color detrás de la figura, como en la máquina
      const [c1, c2] = cfg.badge[k], g = x.createRadialGradient(s * 0.45, s * 0.38, 1, s / 2, s / 2, s * 0.5);
      g.addColorStop(0, c1); g.addColorStop(1, c2); x.fillStyle = g; x.beginPath(); x.ellipse(s / 2, s / 2, s * 0.46, s * 0.4, 0, 0, 7); x.fill();
      x.shadowColor = 'transparent'; x.lineWidth = s * 0.03; x.strokeStyle = '#fff4c8'; x.stroke();
      x.restore(); x.save(); x.shadowColor = 'rgba(0,0,0,0.45)'; x.shadowBlur = s * 0.05;
      art(x, k, 0, 0, s, s, 0.9); x.restore(); return;
    }
    art(x, k, 0, 0, s, s, 0.94); x.restore();
  });
}
export function colossalIconStyle(k) {
  if (GPT[k] != null && !RANKTXT[k]) return 'background-image:url(assets/giant_sym.webp);background-size:1000% 100%;background-position:' + (GPT[k] * 100 / 9).toFixed(3) + '% 0';
  if (SPT[k] != null) return 'background-image:url(assets/sparta_sym.webp);background-size:1200% 100%;background-position:' + (SPT[k] * 100 / 11).toFixed(3) + '% 0';
  const p = POS[k] != null ? POS[k] : POS.bust;
  return 'background-image:url(assets/colossal.webp);background-size:1600% 100%;background-position:' + (p * 100 / 15).toFixed(3) + '% 0';
}

function grad2(x, y0, y1, c0, c1) { const g = x.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, c0); g.addColorStop(1, c1); return g; }

// ---------- Juego ----------
class Colossal {
  constructor(app, cfg) {
    this.app = app; this.cfg = cfg; this.id = cfg.id;
    this.main = new ReelSet({ cols: COLS, rows: ROWS, pick: c => pickSym(cfg, c, this.inFree, false), drawSym: (x, s, px, py, w, h, o) => this.drawMain(x, s, px, py, w, h, o) });
    this.big = new ReelSet({ cols: COLS, rows: BIG_ROWS, pick: c => pickSym(cfg, c, this.inFree, true), drawSym: (x, s, px, py, w, h, o) => this.drawBigCell(x, s, px, py, w, h, o) });
    // Al abrir, el colosal ya muestra sus pilas
    for (let c = 0; c < COLS; c++) this.setColumn(this.big, c, bigColumn(cfg, c, false));
    this.freeLeft = 0; this.freeTotal = 0; this.inFree = false; this.fsTotal = 0;
    this.wins = null; this.winT = 0; this.time = 0; this.full = []; this.mega = -1; this.megaK = null;
    this.buy = { label: 'BONO', sub: b => app.fmt(b * 50), cost: b => b * 50, run: () => this.buyFree() };
  }
  setColumn(set, c, col) { set.grid[c] = col; set.columns[c].syms = [col[0]].concat(col); }
  get extra() { return this.inFree ? null : this.buy; }
  get freeRound() { return this.freeLeft > 0; }
  get freeCount() { return Math.max(1, this.freeTotal - this.freeLeft) + ' DE ' + this.freeTotal; }
  get keepWin() { return this.inFree; }
  get locked() { return this.inFree; }
  get animating() { return true; }

  // Como la máquina real: SIEMPRE lado a lado, el principal a la izquierda (con el escenario
  // encima) y el colosal a la derecha, ocupando todo el alto. También en el iPhone en vertical.
  resize(W, H) {
    this.W = W; this.H = H;
    const narrow = W / H < 0.78, pad = narrow ? 6 : 10, gap = narrow ? 10 : 18, tabs = 0;
    this.side = true;
    const b = (W - 2 * pad - gap) / 12.5, cw = b * 1.5, bcw = b;
    const bch = Math.min((H - 2 * pad - tabs) / BIG_ROWS, b * (narrow ? 1.7 : 1.15));
    const tot = bch * BIG_ROWS, ch = Math.min(cw * (narrow ? 1.05 : 0.86), (tot - gap - 40) / ROWS);
    const tw = cw * COLS + gap + bcw * COLS, x0 = (W - tw) / 2, y0 = (H - tot + tabs) / 2;
    Object.assign(this, { cw, ch, bcw, bch, mx: x0, my: y0 + tot - ch * ROWS, bx: x0 + cw * COLS + gap, by: y0 });
    this.banner = [x0, y0, cw * COLS, this.my - gap - y0];
    this.main.layout(this.mx, this.my, this.cw, this.ch);
    this.big.layout(this.bx, this.by, this.bcw, this.bch);
    this.bgCache = null;
  }
  // Marco de la máquina alrededor de cada tablero y fondo de las celdas
  frame(x, px, py, w, h, cw, big) {
    const giant = this.cfg.id === 'giant', L = this.app.light, f = 7;
    x.save(); x.shadowColor = 'rgba(0,0,0,0.6)'; x.shadowBlur = 14; x.shadowOffsetY = 4;
    roundRect(x, px - f, py - f, w + 2 * f, h + 2 * f, 9);
    const g = x.createLinearGradient(0, py - f, 0, py + h + f);
    if (giant && big) { g.addColorStop(0, '#fff0a0'); g.addColorStop(0.4, '#f0a020'); g.addColorStop(1, '#8a4a06'); }
    else if (giant) { g.addColorStop(0, '#a8743a'); g.addColorStop(0.5, '#6a3e14'); g.addColorStop(1, '#3a1e06'); }
    else { g.addColorStop(0, '#d8281a'); g.addColorStop(0.5, '#9a0c08'); g.addColorStop(1, '#4a0202'); }
    x.fillStyle = g; x.fill(); x.restore();
    x.strokeStyle = giant ? '#e8c070' : '#ff9a7a'; x.lineWidth = 1.5; roundRect(x, px - 2, py - 2, w + 4, h + 4, 4); x.stroke();
    // celdas: marfil (Gigante) o piedra roja oscura (Espartaco), rodillo por rodillo
    for (let c = 0; c < COLS; c++) {
      const cx = px + c * cw, cg = x.createLinearGradient(cx, 0, cx + cw, 0);
      if (giant) { cg.addColorStop(0, L ? '#fffdf6' : '#f3e8cf'); cg.addColorStop(0.5, L ? '#ffffff' : '#fffaf0'); cg.addColorStop(1, L ? '#f8eeda' : '#eadcb8'); }
      else { cg.addColorStop(0, '#b88a40'); cg.addColorStop(0.2, '#ecd49a'); cg.addColorStop(0.5, '#fff6d8'); cg.addColorStop(0.8, '#ecd49a'); cg.addColorStop(1, '#b88a40'); }
      x.fillStyle = cg; x.fillRect(cx, py, cw, h);
      if (c) { x.fillStyle = giant ? 'rgba(120,80,30,0.35)' : 'rgba(245,200,100,0.35)'; x.fillRect(cx - 0.75, py, 1.5, h); }
    }
    if (giant) this.vines(x, px - f, py - f, w + 2 * f, h + 2 * f, big);
  }
  // Enredaderas de habichuela sobre el marco de madera
  vines(x, px, py, w, h, big) {
    x.save(); x.lineCap = 'round';
    const leaf = (lx, ly, a, s) => { x.save(); x.translate(lx, ly); x.rotate(a); const g = x.createLinearGradient(0, -s, 0, s); g.addColorStop(0, '#9ae870'); g.addColorStop(1, '#2a7a1a'); x.fillStyle = g; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(s * 0.9, -s * 0.6, s * 1.8, 0); x.quadraticCurveTo(s * 0.9, s * 0.6, 0, 0); x.fill(); x.restore(); };
    const run = (pts, n) => {
      x.strokeStyle = '#2a6a14'; x.lineWidth = 4.5; x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.stroke();
      x.strokeStyle = '#6ac83a'; x.lineWidth = 2; x.stroke();
      for (let i = 1; i < pts.length - 1; i += n) leaf(pts[i][0], pts[i][1], (i % 2 ? -1 : 1) * 0.9 + (pts[i + 1][0] - pts[i - 1][0] > 0 ? 0 : Math.PI), 7);
    };
    const wave = (x0, y0, x1, y1, amp, k) => { const out = []; for (let i = 0; i <= 40; i++) { const t = i / 40, nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny), s = Math.sin(t * k) * amp; out.push([x0 + (x1 - x0) * t + nx / l * s, y0 + (y1 - y0) * t + ny / l * s]); } return out; };
    run(wave(px, py + h * 0.35, px, py - 2, 3, 9), 5);
    run(wave(px - 2, py, px + w * (big ? 0.5 : 0.4), py, 3, 11), 5);
    run(wave(px + w + 2, py + h * 0.22, px + w + 2, py, 3, 8), 6);
    run(wave(px, py + h, px + w * 0.28, py + h + 2, 3, 9), 6);
    x.restore();
  }
  // Escenario del juego (fondo completo + cuadro sobre el tablero principal)
  renderBg() {
    const { W, H, cfg } = this, dpr = this.app.dpr, L = this.app.light, cnv = makeCanvas(W * dpr, H * dpr), x = cnv.getContext('2d'); x.scale(dpr, dpr);
    if (cfg.id === 'giant') { x.fillStyle = '#2a5a1a'; x.fillRect(0, 0, W, H); cover(x, this.inFree ? IMG.sky : IMG.gscene, 0, 0, W, H, 0.4, 0.5); }
    else { x.fillStyle = '#6a4a2a'; x.fillRect(0, 0, W, H); cover(x, IMG.spscene, 0, 0, W, H, 0.3, 0.3); if (this.inFree) this.nightTint(x, 0, 0, W, H); }
    x.fillStyle = L ? 'rgba(255,250,240,0.2)' : 'rgba(10,4,20,0.35)'; x.fillRect(0, 0, W, H);
    const v = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, L ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.25)'); v.addColorStop(1, L ? 'rgba(255,250,235,0.35)' : 'rgba(0,0,0,0.7)');
    x.fillStyle = v; x.fillRect(0, 0, W, H);
    this.drawBanner(x);
    this.frame(x, this.mx, this.my, this.cw * COLS, this.ch * ROWS, this.cw, false);
    this.frame(x, this.bx, this.by, this.bcw * COLS, this.bch * BIG_ROWS, this.bcw, true);
    return cnv;
  }
  drawBanner(x) {
    const [bx, by, bw, bh] = this.banner, cfg = this.cfg, giant = cfg.id === 'giant';
    if (bh < 24) return;
    if (!giant) {
      // escenario de la máquina: cortina, brasero encendido, muro de piedra y el logo, sin marco
      x.save(); x.shadowColor = 'rgba(0,0,0,0.5)'; x.shadowBlur = 10; x.fillStyle = '#6a4a2a'; x.fillRect(bx, by, bw, bh); x.restore();
      x.save(); x.beginPath(); x.rect(bx, by, bw, bh); x.clip(); const im = IMG.spscene; if (im) { const sc = Math.max(bw / im.width, bh / im.height), ax = im.width * sc > bw + 1 ? Math.max(0, Math.min(1, (430 * sc - bw / 2) / (im.width * sc - bw))) : 0.5; cover(x, im, bx, by, bw, bh, ax, 0.4); } if (this.inFree) this.nightTint(x, bx, by, bw, bh); x.restore();
      return;
    }
    x.save(); x.shadowColor = 'rgba(0,0,0,0.6)'; x.shadowBlur = 12; roundRect(x, bx - 6, by - 6, bw + 12, bh + 12, 10);
    const g = x.createLinearGradient(0, by, 0, by + bh); if (giant) { g.addColorStop(0, '#a8743a'); g.addColorStop(1, '#4a2808'); } else { g.addColorStop(0, '#fff0b0'); g.addColorStop(0.5, '#c8901e'); g.addColorStop(1, '#6a3a06'); }
    x.fillStyle = g; x.fill(); x.restore();
    x.save(); roundRect(x, bx, by, bw, bh, 6); x.clip();
    if (giant) {
      // campo con la granja y la habichuela (juego base) o cielo con el castillo (giros gratis), como la máquina
      x.fillStyle = '#3a7a2a'; x.fillRect(bx, by, bw, bh);
      const im = IMG.gscene, top = im ? Math.min(bh, im.height * bw / im.width) : 0;
      if (this.inFree && IMG.sky) cover(x, IMG.sky, bx, by, bw, bh, 0.15, 0.6);
      else if (im) {
        x.imageSmoothingQuality = 'high';
        if (top >= bh) cover(x, im, bx, by, bw, bh, 0.4, 0.5);
        else {
          // debajo de la franja sigue el campo (las últimas filas estiradas) y se oscurece un poco
          // debajo del campo, las nubes con el castillo del gigante (arriba de la habichuela)
          if (IMG.sky) cover(x, IMG.sky, bx, by + top - 2, bw, bh - top + 2, 0.2, 0.55);
          x.drawImage(im, bx, by, bw, top);
          const gd = x.createLinearGradient(0, by + top - 2, 0, by + top + 18); gd.addColorStop(0, 'rgba(255,255,255,0.7)'); gd.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gd; x.fillRect(bx, by + top - 2, bw, 20);
        }
      }
      // cinta rosada con la regla del bono y el huevo de oro, abajo del cuadro
      const eh = Math.min(bh * 0.3, bw * 0.2, 70), ex = bx + 6, ey = by + bh - eh - 6;
      if (bh - top > eh + 10 || this.inFree) {
        x.drawImage(symIcon(cfg, 'egg', eh * this.app.dpr), ex, ey, eh, eh);
        const rx = ex + eh + 8, rw = bx + bw - rx - 8, rh = Math.min(eh * 0.8, 44), ry = ey + (eh - rh) / 2;
        const rg = x.createLinearGradient(0, ry, 0, ry + rh); rg.addColorStop(0, '#ff9ab0'); rg.addColorStop(1, '#c83a5a');
        x.fillStyle = rg; x.beginPath(); x.moveTo(rx, ry); x.lineTo(rx + rw, ry); x.lineTo(rx + rw - rh * 0.3, ry + rh / 2); x.lineTo(rx + rw, ry + rh); x.lineTo(rx, ry + rh); x.lineTo(rx + rh * 0.3, ry + rh / 2); x.closePath(); x.fill();
        x.strokeStyle = '#ffe0e8'; x.lineWidth = 1.5; x.stroke();
        const fs = Math.min(rh * 0.34, 15);
        x.fillStyle = '#fff8e0'; x.font = '800 ' + fs + 'px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText('3+ HUEVOS DE ORO EN 3 RODILLOS', rx + rw / 2, ry + rh * 0.32, rw * 0.82);
        x.fillText('DAN 5 A 100 GIROS GRATIS', rx + rw / 2, ry + rh * 0.7, rw * 0.82);
      }
      if (bh - top > eh + 110) { const lw = bw, ty = by + top + (bh - top - eh - 60) / 2; goldText(x, 'ORO DEL', bx + lw / 2, ty, Math.min(40, lw * 0.18), { maxW: lw * 0.9, stroke: '#2a1400', glowColor: '#8aff6a' }); goldText(x, 'GIGANTE', bx + lw / 2, ty + Math.min(44, lw * 0.2), Math.min(40, lw * 0.18), { maxW: lw * 0.9, stroke: '#2a1400', glowColor: '#8aff6a' }); }
    }
    x.restore();
  }
  // Símbolo del tablero principal
  drawMain(x, s, px, py, w, h, o) {
    if (!s) return;
    if (s.full && o && this.wildShown(this.main, o.c)) return;
    if (o && o.r >= 0 && this.stackCells && this.stackCells.has(o.c * 10 + o.r)) return;
    const dpr = this.app.dpr, size = Math.min(w, h) * 0.96;
    let sc = 1, a = 1; if (o && o.fx) { sc = o.fx.scale || 1; a = o.fx.alpha == null ? 1 : o.fx.alpha; }
    const d = size * sc, cx = px + w / 2, cy = py + h / 2;
    x.globalAlpha = a * (o && o.blur ? 0.75 : 1);
    if (s.k === this.cfg.scatter && !(o && o.blur)) this.scatGlow(x, cx, cy, w, h);
    const img = symIcon(this.cfg, s.k, size * dpr, s.mult);
    if (o && o.blur) x.drawImage(img, cx - d / 2, cy - d * 0.62, d, d * 1.24); else x.drawImage(img, cx - d / 2, cy - d / 2, d, d);
    x.globalAlpha = 1;
  }
  // Personajes apilados (2 a 4 filas) en el principal: una sola figura alta, como en la máquina
  computeStacks() {
    const cfg = this.cfg, out = [], cells = new Set();
    for (let c = 0; c < COLS; c++) {
      const col = this.main.columns[c]; if ((col.state !== 'idle' && col.state !== 'bounce') || this.wildShown(this.main, c)) continue;
      const g = this.main.grid[c]; let r = 0;
      while (r < ROWS) { let e = r + 1; while (e < ROWS && g[e].k === g[r].k) e++; if (e - r >= 2 && cfg.tall.includes(g[r].k)) { out.push({ c, r, n: e - r, k: g[r].k }); for (let i = r; i < e; i++) cells.add(c * 10 + i); } r = e; }
    }
    this.stacks = out; this.stackCells = cells;
  }
  drawStacks(x) {
    const w = this.curWin();
    (this.stacks || []).forEach(({ c, r, n, k }) => {
      const px = this.mx + c * this.cw, py = this.my + (r + this.main.columns[c].shift) * this.ch, pw = this.cw, ph = n * this.ch;
      let hit = false; if (w && w.set === 'main' && c < w.n && w.line[c] >= r && w.line[c] < r + n) hit = true;
      x.globalAlpha = w && !hit ? 0.4 : 1;
      if (heroOf(k)) this.heroPanel(x, px, py, pw, ph, n / 4, k);
      else this.charPanel(x, k, px, py, pw, ph);
      x.globalAlpha = 1;
    });
  }
  // Gigante de cuerpo entero: se ve la parte de arriba si la pila es corta
  heroPanel(x, px, py, w, h, frac, k, rim) {
    const [key, fx] = heroOf(k), img = IMG[key]; x.save(); roundRect(x, px + 1.5, py + 1.5, w - 3, h - 3, 6); x.clip();
    x.imageSmoothingQuality = 'high';
    if (this.cfg.id === 'spartacus') {
      // Espartaco y la guerrera se ven completos (de pies a cabeza) sobre su fondo azul, sin recortes
      x.fillStyle = '#0a1a4a'; x.fillRect(px, py, w, h);
      const s = Math.min(w / img.width, h / img.height), dw = img.width * s, dh = img.height * s;
      x.drawImage(img, px + (w - dw) / 2, py + (h - dh) / 2, dw, dh);
    } else {
      let sh = img.height * Math.max(0.3, frac), sw = sh * w / h;
      if (sw > img.width) { sw = img.width; sh = sw * h / w; }
      const sx = Math.max(0, Math.min(img.width - sw, img.width * fx - sw / 2));
      x.drawImage(img, sx, 0, sw, sh, px, py, w, h);
    }
    x.restore(); x.strokeStyle = rim || (k === 'girl' ? '#ff8ad0' : '#ffd24a'); x.lineWidth = 2.5; roundRect(x, px + 1.5, py + 1.5, w - 3, h - 3, 6); x.stroke();
  }
  // Heroína (marco rosado) o guerrera (arco de bronce) de tamaño completo en la pila
  charPanel(x, k, px, py, w, h) {
    const girl = k === 'girl';
    x.save(); roundRect(x, px + 1.5, py + 1.5, w - 3, h - 3, girl ? 8 : 4); x.clip();
    const g = x.createLinearGradient(0, py, 0, py + h); if (girl) { g.addColorStop(0, '#ffd0ec'); g.addColorStop(1, '#a8307a'); } else { g.addColorStop(0, '#3a0a06'); g.addColorStop(1, '#120402'); }
    x.fillStyle = g; x.fillRect(px, py, w, h);
    if (!girl) { x.fillStyle = 'rgba(255,190,90,0.18)'; x.beginPath(); x.moveTo(px + w * 0.12, py + h); x.lineTo(px + w * 0.12, py + w * 0.5); x.arc(px + w / 2, py + w * 0.5, w * 0.38, Math.PI, 0); x.lineTo(px + w * 0.88, py + h); x.fill(); }
    else { const seg = w * 2; for (let y = py + h; y > py - seg; y -= seg * 0.95) { x.globalAlpha = 0.55; art(x, 'bean', px, y - seg, w, seg, 1.1); } x.globalAlpha = 1; }
    const sz = Math.min(w * 1.02, 250 / this.app.dpr), cy = py + Math.min(h / 2, sz * 0.5 + h * 0.08);
    x.save(); x.shadowColor = 'rgba(0,0,0,0.5)'; x.shadowBlur = 8; art(x, k, px + (w - sz) / 2, cy - sz / 2, sz, sz, 1); x.restore();
    x.restore();
    x.strokeStyle = girl ? '#ff9ad8' : '#e8b060'; x.lineWidth = 3; roundRect(x, px + 1.5, py + 1.5, w - 3, h - 3, girl ? 8 : 4); x.stroke();
    x.strokeStyle = 'rgba(255,255,255,0.5)'; x.lineWidth = 1; roundRect(x, px + 4, py + 4, w - 8, h - 8, girl ? 6 : 3); x.stroke();
  }
  scatGlow(x, cx, cy, w, h) { x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.3 + 0.2 * Math.sin(this.time * 5); x.drawImage(glow('rgba(255,190,60,1)', 64), cx - w * 0.6, cy - h * 0.6, w * 1.2, h * 1.2); x.restore(); }
  wildShown(set, c) {
    const st = set.columns[c].state; if (st !== 'idle' && st !== 'bounce') return false;
    return this.full.includes(c) || (set === this.main && this.mega >= 0 && (this.mega === c || this.mega === c - 1));
  }
  // Celdas del colosal mientras giran (al parar se dibujan como pilas)
  drawBigCell(x, s, px, py, w, h, o) {
    if (!s || !o || !o.spinning) return;
    if (this.big.columns[o.c].state === 'bounce') return;
    const size = Math.min(w, h) * 0.92;
    x.globalAlpha = 0.8; x.drawImage(symIcon(this.cfg, s.k, size * this.app.dpr, s.mult), px + (w - size) / 2, py + h / 2 - size * 0.6, size, size * 1.2); x.globalAlpha = 1;
  }
  // Pilas del colosal: las figuras ocupan la pila completa; cartas y BONUS se repiten celda a celda
  drawBigBlocks(x) {
    const { bx, by, bcw, bch, cfg } = this, dpr = this.app.dpr, w = this.curWin();
    x.save(); x.beginPath(); x.rect(bx, by, bcw * COLS, bch * BIG_ROWS); x.clip();
    for (let c = 0; c < COLS; c++) {
      const col = this.big.columns[c]; if (col.state !== 'idle' && col.state !== 'bounce') continue;
      if (this.full.includes(c)) { this.drawTallWild(x, bx + c * bcw, by + col.shift * bch, bcw, bch * BIG_ROWS, c, true); continue; }
      const g = this.big.grid[c]; let r = 0;
      while (r < BIG_ROWS) {
        let e = r + 1; while (e < BIG_ROWS && g[e].k === g[r].k && g[e].blk === g[r].blk) e++;
        const s = g[r], hh = (e - r) * bch, py = by + (r + col.shift) * bch, px = bx + c * bcw;
        let hit = false; if (w && w.set === 'big') for (let rr = r; rr < e; rr++) if (w.line[c] === rr && c < w.n) hit = true;
        const pulse = hit ? 1 + 0.06 * Math.sin(this.winT * 11) : 1;
        x.globalAlpha = w && !hit ? 0.4 : 1;
        const perCell = (isLow(cfg, s.k) && !s.dbl) || (tilesOf(cfg)[1][s.k] != null && !s.dbl) || (s.k === cfg.scatter && cfg.eggStack);
        if (perCell) {
          for (let rr = r; rr < e; rr++) {
            const size = Math.min(bcw, bch) * 0.94 * pulse, cy = by + (rr + col.shift) * bch + bch / 2;
            if (s.k === cfg.scatter) this.scatGlow(x, px + bcw / 2, cy, bcw, bch);
            x.drawImage(symIcon(cfg, s.k, Math.min(bcw, bch) * 0.94 * dpr), px + bcw / 2 - size / 2, cy - size / 2, size, size);
          }
        } else {
          const cx = px + bcw / 2, cy = py + hh / 2;
          if (s.k === cfg.scatter) this.scatGlow(x, cx, cy, bcw, hh);
          if (heroOf(s.k) && hh > bch * 1.5) this.heroPanel(x, px, py, bcw, hh, Math.min(1, (e - r) / 4), s.k);
          else if (s.mult || isWild(cfg, s.k) || s.k === cfg.scatter || isLow(cfg, s.k) || tilesOf(cfg)[1][s.k] != null) { const size = Math.min(bcw, hh) * 0.96 * pulse; x.drawImage(symIcon(cfg, s.k, Math.min(bcw, hh) * 0.96 * dpr, s.mult), cx - size / 2, cy - size / 2, size, size); }
          else { const f = 0.96 * pulse, cap = 250 / dpr * pulse, ww = Math.min(bcw * f, cap), h2 = Math.min(hh * f, cap); x.save(); x.shadowColor = 'rgba(0,0,0,0.4)'; x.shadowBlur = 6; art(x, s.k, cx - ww / 2, cy - h2 / 2, ww, h2, 1); x.restore(); }
        }
        x.globalAlpha = 1; r = e;
      }
    }
    x.restore();
  }
  // Rodillo entero de WILD (principal o colosal) o MEGA WILD de 2 rodillos
  drawTallWild(x, px, py, w, h, c, big, mega, sup) {
    const { cfg, time } = this, giant = cfg.id === 'giant';
    x.save(); x.beginPath(); roundRect(x, px + 1.5, py + 1.5, w - 3, h - 3, 6); x.clip();
    const g = x.createLinearGradient(px, 0, px + w, 0);
    if (giant) { g.addColorStop(0, '#bff0ff'); g.addColorStop(0.5, '#e8fff0'); g.addColorStop(1, '#bff0ff'); }
    else if (sup) { g.addColorStop(0, '#a8600a'); g.addColorStop(0.5, '#ffe07a'); g.addColorStop(1, '#a8600a'); }
    else { g.addColorStop(0, '#4a0806'); g.addColorStop(0.5, '#b8281a'); g.addColorStop(1, '#4a0806'); }
    x.fillStyle = g; x.fillRect(px, py, w, h);
    const cellH = big ? this.bch : this.ch;
    if (giant) {
      // la habichuela sube por todo el rodillo con "WILD" en cada tramo (como la máquina)
      if (IMG.gsym) { x.imageSmoothingQuality = 'high'; for (let r = 0; r < Math.round(h / cellH); r++) x.drawImage(IMG.gsym, GPT.bean * 200 + 2, 52, 196, 96, px, py + r * cellH, w, cellH); }
    } else if (!mega) {
      // placas del logo "ESPARTACO" apiladas en todo el rodillo, como en la máquina
      const per = Math.max(1, Math.round(w * 0.85 / cellH)), n = Math.max(1, Math.round(h / (cellH * per))), sh = h / n, sz = Math.min(w, sh) * 0.98;
      for (let i = 0; i < n; i++) x.drawImage(symIcon(cfg, sup ? cfg.super : cfg.wild, sz * this.app.dpr), px + (w - sz) / 2, py + i * sh + (sh - sz) / 2, sz, sz);
    } else {
      if (IMG.sptall) { const img = IMG.sptall, s2 = Math.min(w / img.width, h / img.height); x.fillStyle = '#0a1a4a'; x.fillRect(px, py, w, h); x.imageSmoothingQuality = 'high'; x.drawImage(img, px + (w - img.width * s2) / 2, py + (h - img.height * s2) / 2, img.width * s2, img.height * s2); if (sup) { x.globalCompositeOperation = 'overlay'; x.fillStyle = 'rgba(255,200,60,0.45)'; x.fillRect(px, py, w, h); x.globalCompositeOperation = 'source-over'; } }
      else { const bs = Math.min(w * 0.92, h * 0.62); art(x, 'bust', px + (w - bs) / 2, py + h * 0.08, bs, bs, 1); }
    }
    x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.18 + 0.12 * Math.sin(time * 4 + c);
    x.drawImage(glow(giant ? 'rgba(160,255,160,1)' : 'rgba(255,200,90,1)', 64), px - w * 0.3, py, w * 1.6, h);
    x.restore();
    x.strokeStyle = giant ? '#6ad83a' : '#f5d27a'; x.lineWidth = 2.5; roundRect(x, px + 1.5, py + 1.5, w - 3, h - 3, 6); x.stroke();
    if (!giant && mega) goldText(x, mega ? (sup ? 'SUPER MEGA WILD' : 'MEGA WILD') : sup ? 'SUPER WILD' : 'WILD', px + w / 2, py + h - Math.min(h * 0.08, 18), Math.min(22, w * (mega ? 0.12 : 0.24)), { maxW: w * 0.94, glowColor: '#ff8a2e' });
  }
  update(dt) { if (this.fsIntro) this.fsIntro.t += dt; this.time += dt; this.main.update(dt); this.big.update(dt); if (this.wins) this.winT += dt; }
  get allLines() { return this.wins && this.wins.length > 1 && this.winT < 1.6; }
  curWin() { return this.wins && this.wins.length && !this.allLines ? this.wins[Math.floor((this.winT - (this.wins.length > 1 ? 1.6 : 0)) / 1.1) % this.wins.length] : null; }
  draw(x) {
    if (!this.W) return;
    if (!this.bgCache) this.bgCache = this.renderBg();
    x.drawImage(this.bgCache, 0, 0, this.W, this.H);
    const cfg = this.cfg;
    if (this.inFree && !cfg.eggStack) this.drawFsCounter(x);
    else if (this.inFree) {
      const [bx, by, bw, bh] = this.banner, t = 'GIRO GRATIS ' + this.freeCount + (cfg.eggStack ? ' · COLOSAL x2' : '');
      x.save(); x.fillStyle = 'rgba(0,0,0,0.55)'; roundRect(x, bx, by + bh - Math.min(30, bh * 0.4), bw, Math.min(30, bh * 0.4), 6); x.fill(); x.restore();
      goldText(x, t, bx + bw / 2, by + bh - Math.min(15, bh * 0.2), Math.min(16, bh * 0.26), { maxW: bw * 0.94 });
    }
    this.computeStacks();
    this.main.draw(x, (c, r) => this.cellFx(c, r));
    this.drawStacks(x);
    this.full.forEach(c => { if (this.wildShown(this.main, c) && !(this.mega >= 0 && (c === this.mega || c === this.mega + 1))) this.drawTallWild(x, this.mx + c * this.cw, this.my + this.main.columns[c].shift * this.ch, this.cw, this.ch * ROWS, c, false, false, this.superCols && this.superCols.includes(c)); });
    if (this.mega >= 0 && this.wildShown(this.main, this.mega + 1)) this.drawTallWild(x, this.mx + this.mega * this.cw, this.my, this.cw * 2, this.ch * ROWS, this.mega, false, true, this.megaK === cfg.super);
    this.big.draw(x, null);
    this.drawBigBlocks(x);
    this.drawElectric(x);
    if (this.wins) this.drawWin(x);
    if (this.fsIntro) this.drawFsIntro(x);
  }
  // En los giros gratis de Espartaco el cielo del atardecer pasa a azul de noche (el fuego se mantiene cálido)
  nightTint(x, px, py, w, h) {
    x.save(); x.globalCompositeOperation = 'hue'; x.fillStyle = 'rgba(40,90,220,0.85)'; x.fillRect(px, py, w, h);
    x.globalCompositeOperation = 'multiply'; x.fillStyle = 'rgba(120,150,230,0.6)'; x.fillRect(px, py, w, h); x.restore();
  }
  // Medallón azul con laureles y los giros gratis que quedan (abajo a la derecha del escenario)
  drawFsCounter(x) {
    const [bx, by, bw, bh] = this.banner, r = Math.min(bh * 0.2, bw * 0.13, 44), cx = bx + bw - r - 10, cy = by + bh - r - 10;
    x.save();
    const g = x.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r); g.addColorStop(0, '#5aa0ff'); g.addColorStop(1, '#0a2a8a');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); x.lineWidth = r * 0.12; x.strokeStyle = '#e8f4ff'; x.stroke();
    goldText(x, String(this.freeLeft), cx, cy, r * 0.95, { colors: ['#ffffff', '#fff8e0', '#e8d8a0', '#ffffff'], stroke: '#0a1a5a' });
    x.font = '800 ' + Math.max(8, r * 0.28) + 'px ' + FONT; x.textAlign = 'right'; x.textBaseline = 'middle'; x.fillStyle = '#fff4c0';
    x.fillText('GIROS', cx - r - 6, cy - r * 0.2); x.fillText('GRATIS', cx - r - 6, cy + r * 0.2);
    x.restore();
  }
  // Marco eléctrico azul alrededor de los rodillos que siguen girando con suspenso (como la máquina)
  drawElectric(x) {
    [[this.main, this.mx, this.my, this.cw, this.ch * ROWS], [this.big, this.bx, this.by, this.bcw, this.bch * BIG_ROWS]].forEach(([set, ox, oy, cw, h]) => {
      set.columns.forEach((col, c) => {
        if (!col.antic || (col.state !== 'spin' && col.state !== 'feeding')) return;
        const px = ox + c * cw, a = 0.7 + 0.3 * Math.sin(this.time * 30 + c);
        x.save(); x.globalCompositeOperation = 'lighter';
        x.fillStyle = 'rgba(80,160,255,0.16)'; x.fillRect(px, oy, cw, h);
        [[px, oy, px, oy + h], [px + cw, oy, px + cw, oy + h], [px, oy, px + cw, oy], [px, oy + h, px + cw, oy + h]].forEach(([x1, y1, x2, y2]) => {
          const pts = boltPoints(x1, y1, x2, y2, Math.max(6, cw * 0.12), 5); drawBolt(x, pts, 3.5, '#6ab8ff', a); drawBolt(x, pts, 1.3, '#ffffff', a);
        });
        x.restore();
      });
    });
  }
  // Entrada a giros gratis de Espartaco: destello blanco, estallido de brasas y medallón azul con laureles
  drawFsIntro(x) {
    const { W, H } = this, f = this.fsIntro, t = f.t;
    x.save();
    if (t < 0.9) { x.fillStyle = 'rgba(255,255,255,' + Math.min(1, t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.6 * 0.4) + ')'; x.fillRect(0, 0, W, H); }
    else {
      x.fillStyle = 'rgba(20,10,10,0.82)'; x.fillRect(0, 0, W, H);
      f.emb = f.emb || Array.from({ length: 90 }, () => ({ x: Math.random(), y: 0.55 + Math.random() * 0.5, v: 0.05 + Math.random() * 0.15, s: 1 + Math.random() * 3 }));
      f.emb.forEach(e => { const yy = (e.y - (t - 0.9) * e.v) * H; x.fillStyle = 'rgba(255,' + (120 + (e.s * 30 | 0)) + ',40,' + (0.5 + 0.5 * Math.sin(t * 8 + e.x * 20)) + ')'; x.beginPath(); x.arc(e.x * W, yy, e.s, 0, 7); x.fill(); });
      const k = Math.min(1, (t - 0.9) / 0.35), sc = 0.4 + 0.6 * (1 - Math.pow(1 - k, 3)), r = Math.min(W, H) * 0.17 * sc, cx = W / 2, cy = H * 0.42;
      x.drawImage(glow('rgba(140,190,255,1)', 64), cx - r * 2, cy - r * 2, r * 4, r * 4);
      const g = x.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r); g.addColorStop(0, '#5aa0ff'); g.addColorStop(1, '#0a2a8a');
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
      x.lineWidth = r * 0.12; x.strokeStyle = '#e8f4ff'; x.stroke(); x.lineWidth = r * 0.04; x.strokeStyle = '#6a9ad8'; x.beginPath(); x.arc(cx, cy, r * 0.84, 0, 7); x.stroke();
      // laureles
      x.fillStyle = '#e8f0ff';
      for (let side = -1; side <= 1; side += 2) for (let i = 0; i < 7; i++) { const a = Math.PI / 2 + side * (0.5 + i * 0.3), lx = cx + Math.cos(a) * r * 0.68, ly = cy + Math.sin(a) * r * 0.68; x.save(); x.translate(lx, ly); x.rotate(a + side * 0.9); x.beginPath(); x.ellipse(0, 0, r * 0.1, r * 0.04, 0, 0, 7); x.fill(); x.restore(); }
      goldText(x, String(f.n), cx, cy + r * 0.04, r * 0.95, { colors: ['#ffffff', '#fff8e0', '#e8d8a0', '#ffffff'], stroke: '#0a1a5a' });
      goldText(x, 'GIROS GRATIS', cx, cy + r * 1.55, Math.min(W * 0.1, r * 0.5), { maxW: W * 0.9, colors: ['#ffffff', '#fff4c0', '#e0b050', '#fff4c0'], stroke: '#3a1a00', glowColor: '#ff7a2a' });
      goldText(x, 'OTORGADOS', cx, cy + r * 2.1, Math.min(W * 0.08, r * 0.4), { maxW: W * 0.9, colors: ['#ffffff', '#fff4c0', '#e0b050', '#fff4c0'], stroke: '#3a1a00' });
    }
    x.restore();
  }
  cellFx(c, r) {
    const w = this.curWin(); if (!w) return null;
    if (w.set !== 'main') return { alpha: 0.4 };
    return c < w.n && w.line[c] === r ? { scale: 1 + 0.07 * Math.sin(this.winT * 11) } : { alpha: 0.4 };
  }
  drawWin(x) {
    if (this.allLines) {
      // como la máquina: primero todas las líneas ganadoras juntas, cada una de un color
      x.save(); x.lineJoin = 'round';
      this.wins.slice(0, 40).forEach((w, i) => {
        const main = w.set === 'main', ox = main ? this.mx : this.bx, oy = main ? this.my : this.by, ch = main ? this.ch : this.bch, cw = main ? this.cw : this.bcw;
        x.beginPath(); w.line.forEach((r, c) => { const px = ox + c * cw + cw / 2, py = oy + r * ch + ch / 2; c ? x.lineTo(px, py) : x.moveTo(ox - 5, py); });
        x.lineTo(ox + cw * COLS + 5, oy + w.line[COLS - 1] * ch + ch / 2);
        x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 4.5; x.stroke(); x.strokeStyle = 'hsl(' + (i * 47 % 360) + ',95%,60%)'; x.lineWidth = 2.5; x.stroke();
      });
      x.restore(); return;
    }
    const w = this.curWin(); if (!w) return;
    const main = w.set === 'main', ox = main ? this.mx : this.bx, oy = main ? this.my : this.by, ch = main ? this.ch : this.bch, cw = main ? this.cw : this.bcw;
    x.save(); x.globalCompositeOperation = this.app.light ? 'source-over' : 'lighter'; x.lineJoin = 'round';
    x.beginPath(); w.line.forEach((r, c) => { const px = ox + c * cw + cw / 2, py = oy + r * ch + ch / 2; c ? x.lineTo(px, py) : x.moveTo(ox - 5, py); });
    x.lineTo(ox + cw * COLS + 5, oy + w.line[COLS - 1] * ch + ch / 2);
    x.strokeStyle = 'rgba(220,80,20,0.55)'; x.lineWidth = 8; x.stroke(); x.strokeStyle = '#fff2b0'; x.lineWidth = 2.5; x.stroke();
    x.restore();
    const my = oy + (main ? ch * 2 : ch * (w.line[2] + 0.5));
    goldText(x, this.app.fmt(w.win) + (w.m > 1 ? ' (x' + w.m + ')' : ''), ox + cw * 2.5, my, Math.min(30, cw * 0.42), { glowColor: '#ff8a2e', maxW: cw * 5 });
  }
  center(set, c, r) { return set === 'main' ? [this.mx + c * this.cw + this.cw / 2, this.my + r * this.ch + this.ch / 2] : [this.bx + c * this.bcw + this.bcw / 2, this.by + r * this.bch + this.bch / 2]; }

  // Un giro (o re-giro) animado. Devuelve el tablero final ya con las transferencias hechas.
  async spinOnce(hold) {
    const app = this.app, sfx = app.sfx, cfg = this.cfg;
    const b = spinBoards(cfg, this.inFree, hold);
    if (app._forceScat) {
      app._forceScat = 0;
      [[b.main, 0], [b.big, 2], [b.main, 4]].forEach(([set, c]) => { if (hold.includes(c)) return; const r = set === b.main ? 1 : 4; set[c][r] = { blk: 'f' + c, k: cfg.scatter }; if (set === b.big && cfg.multWild && c === 4) set[c][5] = { blk: 'f' + c, k: cfg.scatter, dbl: true }; });
    }
    if (app._forceFull) { const n = app._forceFull; app._forceFull = 0; for (let c = 0; c < n; c++) if (!hold.includes(c)) b.main[c] = fullCol(cfg, ROWS, cfg.super && c === 0 ? cfg.super : cfg.wild); }
    if (app._forceMega && cfg.mega) { app._forceMega = 0; b.mega = 1; [1, 2].forEach(c => { b.main[c] = Array.from({ length: ROWS }, () => ({ k: cfg.super, full: true, mega: true })); }); }
    const tr = transfers(cfg, b);
    const scatIn = c => (b.main[c].some(s => s.k === cfg.scatter) ? 1 : 0) + (b.big[c].some(s => s.k === cfg.scatter) ? 1 : 0);
    const anticFrom = scatIn(0) + scatIn(2) >= 2 ? 4 : -1;
    sfx.spinStart(app.speed >= 2);
    this.main.start(app.speed); this.big.start(app.speed);
    if (anticFrom >= 0 && !cfg.eggStack) sfx.play('sparta_antic', { vol: 0.55, at: 0.6 });
    // los rodillos fijos del re-giro no giran
    hold.forEach(c => { [this.main, this.big].forEach(set => { const col = set.columns[c]; col.state = 'idle'; col.shift = 0; }); });
    const bigDone = this.big.stopTo(b.big, { anticFrom, minTime: 0.75 / (app.speed || 1), onStop: (c) => {
      sfx.reelStop(c, false);
      b.big[c].forEach((s, r) => { if (s.k === cfg.scatter && (r === 0 || b.big[c][r - 1].blk !== s.blk || cfg.eggStack)) { const [px, py] = this.center('big', c, r); sfx.bell(784 + c * 110, 0.9, 0.12); app.burst(px, py, 12, { type: 'spark', color: '#ffd24a', speed: 240, size: 10 }); } });
      if (b.big[c].some(s => s.mult)) sfx.multiplier(4);
    } });
    await this.main.stopTo(b.main, { anticFrom, onStop: (c) => {
      sfx.reelStop(c, false);
      if (tr.cols.includes(c) && !(b.mega >= 0 && c === b.mega)) {
        this.full.push(c); if (b.mega >= 0 && c === b.mega + 1) this.full.push(b.mega);
        if (b.main[c].some(s => s.k === cfg.super)) (this.superCols = this.superCols || []).push(c);
        const [px, py] = this.center('main', c, 1.5); sfx.whoosh(); sfx.bell(660 + this.full.length * 110, 1, 0.12);
        app.burst(px, py, 22, { type: 'spark', color: cfg.eggStack ? '#a8ffa8' : '#ffc04a', speed: 320, size: 12 }); app.flash(cfg.eggStack ? '#d8ffd0' : '#ffe0a0', 0.2);
      }
      if (b.mega >= 0 && b.mega + 1 === c) { this.mega = b.mega; this.megaK = b.main[c][0].k; const [px, py] = this.center('main', c, 1.5); sfx.thunder(0.5); app.shake(true); app.burst(px, py, 30, { type: 'spark', color: '#ffc04a', speed: 360, size: 14 }); app.flash('#ffe0a0', 0.35); }
      b.main[c].forEach((s, r) => { if (s.k === cfg.scatter) { const [px, py] = this.center('main', c, r); sfx.bell(784 + c * 110, 0.9, 0.12); app.burst(px, py, 12, { type: 'spark', color: '#ffd24a', speed: 240, size: 10 }); } });
    } });
    await bigDone;
    sfx.reelStop(4, true); sfx.anticipation(false);
    return { b, tr };
  }

  async play(bet) {
    const app = this.app, sfx = app.sfx, cfg = this.cfg;
    this.wins = null; this.full = []; this.mega = -1; this.megaK = null; this.superCols = [];
    const free = this.freeLeft > 0;
    if (free) this.freeLeft--;
    app.setSpinLabel(free ? 'GRATIS' : 'PARAR', free ? this.freeCount.toLowerCase() : '');
    let total = 0, hold = [], respins = 0, transferred = 0, sc = { reels: 0, n: 0 };
    for (;;) {
      const { b, tr } = await this.spinOnce(hold);
      transferred += tr.cols.length;
      if (tr.cols.length) app.message('<b>' + tr.cols.length + ' rodillo' + (tr.cols.length > 1 ? 's' : '') + ' WILD</b> transferido' + (tr.cols.length > 1 ? 's' : '') + ' al colosal');
      const res = settle(cfg, b, bet, this.inFree);
      if (res.scat.reels > sc.reels || (res.scat.reels === sc.reels && res.scat.n > sc.n)) sc = res.scat;
      if (res.wins.length) {
        this.wins = res.wins.sort((p, q) => q.win - p.win); this.winT = 0;
        sfx.win(res.total >= bet * 5 ? 2 : 0); app.addWin(res.total); total += res.total;
        app.flyCoins(this.W / 2, this.H / 2, Math.min(16, 3 + res.wins.length * 2));
        const nm = res.wins.filter(w => w.set === 'main').length, nb = res.wins.length - nm;
        app.message((respins ? 'Re-giro ' + respins + ' · ' : '') + 'Premio: <b>' + app.fmt(res.total) + '</b> · ' + (nm ? nm + ' en el principal' : '') + (nm && nb ? ' · ' : '') + (nb ? nb + ' en el colosal' : ''));
        await app.wait(Math.min(2200, 800 + res.wins.length * 150));
      } else if (!this.inFree && !respins && !tr.cols.length) app.message(this.hint);
      // Super Espartaco transferido → re-giro con los WILD fijos (hasta 9 seguidos)
      if (!tr.respin || respins >= 9) break;
      respins++; hold = hold.concat(tr.cols, b.mega >= 0 && tr.cols.includes(b.mega + 1) && !tr.cols.includes(b.mega) ? [b.mega] : []).filter((c, i, a) => a.indexOf(c) === i);
      await app.wait(300); this.wins = null;
      sfx.featureStart(); app.flash('#ffe0a0', 0.3);
      await app.banner('RE-GIRO', 'Super Espartaco: los WILD quedan fijos', { color: '#ffb03a', ms: 1300, voice: false });
      this.superCols = [];
      hold.forEach(c => { this.setColumn(this.main, c, fullCol(cfg, ROWS)); this.setColumn(this.big, c, fullCol(cfg, BIG_ROWS)); });
      this.full = hold.slice(); this.mega = -1;
    }
    const jp = jackpotFor(transferred);
    if (jp) { await app.wait(300); total += await app.awardJackpot(jp); }
    // BONO SORPRESA: rayos que completan el bono en un giro pagado
    if (!free && !this.inFree && sc.reels < 3 && (Math.random() < MYSTERY_P || app._forceMystery)) {
      app._forceMystery = false; await app.wait(300); this.wins = null;
      await app.mysteryIntro(cfg.eggStack ? 'Los rayos traen huevos de oro' : 'Los rayos levantan coliseos');
      const opts = []; SCAT_REELS.forEach(c => { opts.push(['main', c], ['big', c]); });
      for (let i = opts.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [opts[i], opts[j]] = [opts[j], opts[i]]; }
      let reels = 0, n = 0; const has = ([set, c]) => (set === 'main' ? this.main : this.big).grid[c].some(s => s.k === cfg.scatter);
      opts.forEach(o => { if (has(o)) { reels++; n += (o[0] === 'main' ? this.main : this.big).grid[o[1]].filter(s => s.k === cfg.scatter).length; } });
      for (const o of opts) {
        if (reels >= 3) break; if (has(o) || this.full.includes(o[1])) continue;
        const [set, c] = o, rs = set === 'main' ? this.main : this.big, r = set === 'main' ? 1 : (cfg.multWild && c === 4 ? 4 : 5);
        const s = { k: cfg.scatter, blk: 'm' + c }; rs.setCell(c, r, s); if (set === 'big' && cfg.multWild && c === 4) rs.setCell(c, 5, Object.assign({ dbl: true }, s)), s.dbl = true;
        reels++; n++;
        const [px, py] = this.center(set, c, r); app.strike(px, py, '#ffd24a'); sfx.bell(784 + reels * 110, 0.9, 0.12);
        await app.wait(320);
      }
      sc = { reels, n };
    }
    if (this.inFree) this.fsTotal += total;
    if (sc.reels >= 3) {
      await app.wait(500); this.wins = null;
      { const v = await app.bonusPay(sc.reels, bet, cfg.scatName); total += v; if (this.inFree) this.fsTotal += v; }
      sfx.featureStart(); app.flash('#ffd27a', 0.5); app.shake(true);
      const n = spinsFor(cfg, sc);
      if (this.inFree) { this.freeLeft += n; this.freeTotal += n; await app.banner('+' + n + ' GIROS', cfg.eggStack ? sc.n + ' huevos de oro' : 'Vuelven los coliseos', { color: '#ffb03a', ms: 1800 }); }
      else await this.startFree(n, sc);
    }
    const celebrated = this.inFree;
    if (this.inFree && this.freeLeft === 0 && free) {
      await app.wait(400);
      const fs = this.fsTotal;
      this.inFree = false; this.wins = null; this.bgCache = null;
      if (fs > 0) await app.celebrate(fs, bet, cfg.name.toUpperCase());
      sfx.stopMusic(); sfx.music(cfg.music);
      app.message('Giros gratis: <b>' + app.fmt(fs) + '</b>');
    }
    app.setSpinLabel(this.freeLeft ? 'GRATIS' : 'GIRAR', this.freeLeft ? (this.freeTotal - this.freeLeft + 1) + ' de ' + this.freeTotal : '');
    return { win: total, celebrated };
  }
  async startFree(n, sc) {
    const app = this.app, sfx = app.sfx, cfg = this.cfg;
    this.inFree = true; this.bgCache = null; this.freeLeft = n; this.freeTotal = n; this.fsTotal = 0;
    sfx.stopMusic();
    if (!cfg.eggStack) {
      sfx.play('sparta_fs', { vol: 0.9 }); this.fsIntro = { t: 0, n }; app.shake(true);
      await app.wait(3600); this.fsIntro = null;
    } else await app.banner(n + ' GIROS GRATIS', cfg.eggStack ? (sc ? sc.n + ' huevos de oro · ' : '') + 'el colosal paga x2' : 'WILD x2 a x100 en el rodillo 5 del colosal', { color: '#ff9a2e', ms: 2400 });
    sfx.music(cfg.bonusMusic);
    app.setSpinLabel('GRATIS', '1 de ' + this.freeTotal);
  }
  async buyFree() { this.app.sfx.featureStart(); await this.startFree(this.cfg.eggStack ? 10 : 10); return { win: 0, celebrated: true }; }
  slam() { this.main.slam(); this.big.slam(); }
  info(bet, fmt) {
    const cfg = this.cfg, lb = bet / 100, img = k => '<img class="ico" src="' + symIcon(cfg, k, 96, k === 'mw' ? 5 : 0).toDataURL('image/png') + '" alt="">';
    return '<h3>Cómo se juega</h3><ul>' + this.rules() +
      '<li><b>BONO</b>: compra 10 giros gratis por 50× la apuesta.</li></ul>' +
      '<h3>Pagos por línea (apuesta ' + fmt(bet) + ') · 3 / 4 / 5</h3><table>' +
      Object.keys(cfg.pay).map(k => '<tr><td>' + img(k) + '</td><td>' + cfg.names[k] + '</td><td>' + [3, 4, 5].map(n => fmt(cfg.pay[k][n] * cfg.scale * lb)).join(' · ') + '</td></tr>').join('') + '</table>';
  }
}

export class GiantGold extends Colossal {
  static id = 'giant';
  static name = 'Oro del Gigante';
  static music = 'fairy';
  static bonusMusic = 'fairyBonus';
  static iconStyle = colossalIconStyle;
  static lobby = {
    icons: ['girl', 'egg', 'giant'], c1: '#6ad86a', c2: '#1a3a5a', mechanic: 'Rodillos colosales · 100 líneas · como Giant\'s Gold',
    desc: 'Jack y las habichuelas mágicas: tablero de 5×4 y colosal de 5×12. Los rodillos llenos de habichuelas WILD se transfieren al colosal. Huevos de oro: de 5 a 100 giros gratis con el colosal x2.'
  };
  constructor(app) {
    super(app, GIANT);
    this.hint = 'La <b>habichuela</b> es WILD apilado: un rodillo lleno se <b>transfiere al colosal</b>. Huevos de oro en 3 rodillos = <b>5 a 100 giros gratis</b>.';
  }
  rules() {
    return '<li><b>Dos tableros</b>: principal de <b>5×4</b> (40 líneas) y <b>colosal de 5×12</b> (60 líneas) = <b>100 líneas</b>. Los dos giran a la vez y en el colosal los símbolos caen en <b>pilas</b>.</li>' +
      '<li><b>Habichuela mágica = WILD</b> apilado; sustituye a todo menos al huevo de oro. Si un rodillo del principal queda <b>lleno de WILD</b>, se <b>transfiere entero</b> al mismo rodillo del colosal.</li>' +
      '<li><b>Huevo de oro BONUS</b>, apilado, solo en los rodillos 1, 3 y 5 de ambos tableros. Con huevos en <b>3 o más rodillos</b> se ganan giros gratis según los huevos a la vista: <b>3 = 5 · 5 = 8 · 8 = 15 · 10 = 20 · 16 = 30 · 25 = 50 · 40 o más = 100 giros</b>.</li>' +
      '<li>En los giros gratis <b>todo lo que se gana en el colosal paga x2</b>, salen más habichuelas y los huevos pueden dar más giros.</li>' +
      '<li><b>Progresivos</b>: rodillos WILD transferidos a la vez · <b>2 = MINI · 3 = MINOR · 4 = MAJOR · 5 = GRAND</b>.</li>';
  }
}
export class Spartacus extends Colossal {
  static id = 'spartacus';
  static name = 'Espartaco Coloso';
  static music = 'arena';
  static bonusMusic = 'arenaBonus';
  static iconStyle = colossalIconStyle;
  static lobby = {
    icons: ['lion', 'colis', 'net'], c1: '#e84a2a', c2: '#3a1a08', mechanic: 'Súper rodillos colosales · 100 líneas · como Spartacus',
    desc: 'Gladiadores en el Coliseo: tablero de 5×4 y colosal de 5×12. Super Espartaco, MEGA WILD de 2 rodillos, transferencias con re-giro y WILD x2…x100 en el rodillo 5 del colosal.'
  };
  constructor(app) {
    super(app, SPARTA);
    this.hint = '<b>Espartaco</b> es WILD. Un rodillo lleno se transfiere al colosal; con <b>Super Espartaco</b> da <b>re-giro</b>. 3+ coliseos = <b>giros gratis</b>.';
  }
  rules() {
    return '<li><b>Dos tableros</b>: principal de <b>5×4</b> (40 líneas) y <b>colosal de 5×12</b> (60 líneas) = <b>100 líneas</b>. El <b>rodillo 5 del colosal</b> tiene <b>símbolos dobles</b>.</li>' +
      '<li><b>Espartaco = WILD</b> apilado. Antes de cada giro, hasta 4 Espartacos de los rodillos 1 a 4 del principal pueden volverse <b>Super Espartaco</b>.</li>' +
      '<li><b>MEGA WILD</b>: un Espartaco (o Super Espartaco) gigante de <b>2 rodillos de ancho</b> puede caer sobre los rodillos 1 a 4 del principal (uno por giro).</li>' +
      '<li><b>Transferencia</b>: un rodillo del principal <b>lleno de WILD</b> pasa entero al mismo rodillo del colosal. Si llevaba un <b>Super Espartaco</b>, hay un <b>RE-GIRO</b> con esos WILD fijos, hasta <b>9 re-giros</b> seguidos.</li>' +
      '<li><b>WILD con multiplicador</b> x2, x3, x5, x10 o x25 en el rodillo 5 del colosal; multiplica la línea. En los giros gratis también hay <b>x50 y x100</b>.</li>' +
      '<li><b>Coliseo BONUS</b> solo en los rodillos 1, 3 y 5 de ambos tableros: en <b>3 rodillos = 10 · 4 = 15 · 5 o 6 = 20 giros gratis</b>, que se pueden volver a ganar.</li>' +
      '<li><b>Progresivos</b>: rodillos transferidos al colosal en la jugada (con sus re-giros) · <b>2 = MINI · 3 = MINOR · 4 = MAJOR · 5 = GRAND</b>.</li>';
  }
}
