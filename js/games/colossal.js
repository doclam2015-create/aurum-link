// RODILLOS COLOSALES (estilo WMS "Colossal Reels"): un tablero principal de 5×4 y, a su lado,
// un tablero colosal de 5×12 donde los símbolos caen en bloques gigantes. 100 líneas en total
// (40 en el principal + 60 en el colosal). Dos juegos comparten el motor:
//  · ORO DEL GIGANTE (estilo Giant's Gold): la habichuela es WILD apilado; un rodillo lleno de WILD
//    en el principal se TRANSFIERE entero al mismo rodillo del colosal. 3+ huevos de oro = 5 a 50
//    giros gratis con los premios del colosal x2. Progresivos: 2/3/4/5 rodillos WILD transferidos.
//  · ESPARTACO COLOSO (estilo Spartacus Super Colossal Reels): MEGA WILD de 2 rodillos de ancho en
//    el principal, Super Espartaco WILD con multiplicador x2…x25 (hasta x100 en giros gratis).
//    3/4/5+ coliseos = 8/12/20 giros gratis x2/x3/x5. Progresivos: 3/4/5/6+ Super Espartacos.
import { glow, goldText, roundRect, rand, FONT, makeCanvas } from '../gfx.js?v=60';
import { ReelSet, LINES_5x3, weighted } from '../reels.js?v=60';

const COLS = 5, ROWS = 4, BIG_ROWS = 12;
// 40 líneas del tablero principal (como Carrera del Lobo) y 60 del colosal (20 por cada banda de 4 filas)
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

// ---------- Configuración de cada juego ----------
export const GIANT = {
  id: 'giant', name: 'Oro del Gigante', music: 'fairy', bonusMusic: 'fairyBonus',
  wild: 'bean', scatter: 'egg', scatName: 'huevos de oro',
  high: ['giant', 'girl', 'harp', 'cow', 'goose'], low: ['A', 'K', 'Q', 'J', 'ten'],
  pay: {
    bean: [0, 0, 0, 60, 250, 1000], giant: [0, 0, 0, 50, 200, 750], girl: [0, 0, 0, 40, 150, 500], harp: [0, 0, 0, 30, 100, 400],
    cow: [0, 0, 0, 20, 60, 200], goose: [0, 0, 0, 20, 50, 150], A: [0, 0, 0, 10, 25, 100], K: [0, 0, 0, 10, 25, 100], Q: [0, 0, 0, 5, 15, 75], J: [0, 0, 0, 5, 15, 60], ten: [0, 0, 0, 5, 10, 50]
  },
  weights: { giant: 3, girl: 3.5, harp: 4, cow: 5, goose: 5, A: 8, K: 8, Q: 9, J: 9, ten: 10, bean: 0.8, egg: 1.1 },
  scale: 1.1,
  fullWild: { base: 0.022, free: 0.12 }, stackP: 0.3,
  spins: n => n >= 6 ? 50 : n === 5 ? 20 : n === 4 ? 10 : 5,
  colors: {
    giant: ['#8a5a2a', '#3a2008'], girl: ['#e86aa8', '#6a1840'], harp: ['#f0c040', '#7a4a06'], cow: ['#7ac8f0', '#1a4a6a'], goose: ['#f4e0a0', '#8a6a20'],
    A: ['#e84a2a'], K: ['#2a8ad0'], Q: ['#9a3ad0'], J: ['#2aa870'], ten: ['#f09a20']
  },
  emoji: { giant: '🧌', girl: '👩‍🦰', cow: '🐄', goose: '🦆' },
  names: { bean: 'Habichuela mágica (WILD)', giant: 'Gigante', girl: 'Heroína', harp: 'Arpa dorada', cow: 'Vaca', goose: 'Pato', egg: 'Huevo de oro (BONUS)', A: 'A', K: 'K', Q: 'Q', J: 'J', ten: '10' }
};
export const SPARTA = {
  id: 'spartacus', name: 'Espartaco Coloso', music: 'arena', bonusMusic: 'arenaBonus',
  wild: 'sparta', super: 'super', scatter: 'colis', scatName: 'coliseos',
  high: ['warrior', 'lion', 'helm', 'chariot', 'sword'], low: ['A', 'K', 'Q', 'J'],
  pay: {
    sparta: [0, 0, 0, 60, 250, 1000], warrior: [0, 0, 0, 50, 200, 750], lion: [0, 0, 0, 40, 150, 500], helm: [0, 0, 0, 30, 100, 300],
    chariot: [0, 0, 0, 25, 75, 250], sword: [0, 0, 0, 20, 60, 200], A: [0, 0, 0, 10, 30, 100], K: [0, 0, 0, 10, 25, 100], Q: [0, 0, 0, 5, 20, 75], J: [0, 0, 0, 5, 15, 60]
  },
  weights: { warrior: 3, lion: 3.5, helm: 4, chariot: 5, sword: 5, A: 8, K: 8, Q: 9, J: 10, sparta: 0.7, super: 0.2, colis: 0.95 },
  scale: 0.72,
  mega: { base: 0.05, free: 0.12 }, stackP: 0.3,
  mults: [[2, 40], [3, 25], [5, 18], [10, 10], [25, 4]], freeMults: [[2, 30], [3, 25], [5, 20], [10, 12], [25, 6], [50, 2], [100, 1]],
  spins: n => n >= 5 ? 20 : n === 4 ? 12 : 8, freeMult: n => n >= 5 ? 5 : n === 4 ? 3 : 2,
  colors: {
    warrior: ['#c83a2a', '#4a0a06'], lion: ['#e0a040', '#6a3a08'], helm: ['#a8b8c8', '#3a4a5a'], chariot: ['#d88a3a', '#5a2a08'], sword: ['#b8c8e0', '#2a3a5a'],
    A: ['#e8401c'], K: ['#d0a020'], Q: ['#b83ad0'], J: ['#2a90d0']
  },
  emoji: { warrior: '🦸‍♀️', lion: '🦁', helm: '🪖', chariot: '🐎', sword: '🗡️' },
  names: { sparta: 'Espartaco (WILD)', super: 'Super Espartaco (WILD x2…x25)', warrior: 'Guerrera', lion: 'León', helm: 'Guerrero del yelmo', chariot: 'Carro de guerra', sword: 'Espada', colis: 'Coliseo (BONUS)', A: 'A', K: 'K', Q: 'Q', J: 'J' }
};

// ---------- Lógica pura (se puede simular sin pantalla) ----------
function pickMult(cfg, free) { const t = {}; (free ? cfg.freeMults : cfg.mults).forEach(([m, w]) => { t[m] = w; }); return +weighted(t); }
export function pickSym(cfg, c, free, big) {
  const w = Object.assign({}, cfg.weights);
  if (!SCAT_REELS.includes(c)) w[cfg.scatter] = 0;
  if (cfg.super && !big) w[cfg.super] *= 0.5;
  if (free) w[cfg.wild] *= 1.4;
  const k = weighted(w);
  return k === cfg.super ? { k, mult: pickMult(cfg, free) } : { k };
}
const isWild = (cfg, k) => k === cfg.wild || (cfg.super && k === cfg.super);
// Rodillo del tablero principal: lleno de WILD, pila de un símbolo alto o sueltos (máx. 1 BONUS)
export function mainColumn(cfg, c, free) {
  if (cfg.fullWild && Math.random() < (free ? cfg.fullWild.free : cfg.fullWild.base)) return Array.from({ length: ROWS }, () => ({ k: cfg.wild, full: true }));
  const col = []; let sc = false;
  for (let r = 0; r < ROWS; r++) { let s = pickSym(cfg, c, free, false); if (s.k === cfg.scatter && sc) s = { k: cfg.low[0] }; if (s.k === cfg.scatter) sc = true; col.push(s); }
  if (Math.random() < cfg.stackP) {
    const k = Math.random() < 0.15 ? cfg.wild : cfg.high[Math.random() * cfg.high.length | 0];
    const h = 2 + (Math.random() * 3 | 0), r0 = Math.random() * (ROWS - h + 1) | 0;
    for (let r = r0; r < r0 + h; r++) if (col[r].k !== cfg.scatter) col[r] = { k };
  }
  return col;
}
// Rodillo colosal: bloques gigantes de 2 a 4 filas del mismo símbolo (máx. 1 BONUS por rodillo)
export function bigColumn(cfg, c, free) {
  const col = []; let sc = false;
  while (col.length < BIG_ROWS) {
    let s = pickSym(cfg, c, free, true);
    if (s.k === cfg.scatter) { if (sc) continue; sc = true; }
    const h = s.k === cfg.scatter || s.k === cfg.super ? Math.min(3, BIG_ROWS - col.length) : Math.min(BIG_ROWS - col.length, Math.random() < 0.25 ? 2 : Math.random() < 0.6 ? 3 : 4);
    let h2 = h; const rem = BIG_ROWS - col.length; if (rem - h2 === 1) h2 = h2 < 4 ? h2 + 1 : h2 - 1;
    const id = Math.random();
    for (let i = 0; i < h2; i++) col.push(Object.assign({ blk: id }, s));
  }
  return col;
}
// Líneas: WILD y Super WILD sustituyen a todo menos el BONUS. El Super multiplica la línea
// (el mayor multiplicador de la línea).
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
export function countScatters(cfg, main, big) {
  let n = 0; SCAT_REELS.forEach(c => { if (main[c].some(s => s.k === cfg.scatter)) n++; if (big[c].some(s => s.k === cfg.scatter)) n++; }); return n;
}
// Tirada completa (sin animación): tableros finales, rodillos WILD y MEGA WILD
export function spinBoards(cfg, free) {
  const main = [], big = [];
  for (let c = 0; c < COLS; c++) { main.push(mainColumn(cfg, c, free)); big.push(bigColumn(cfg, c, free)); }
  let mega = -1;
  if (cfg.mega && Math.random() < (free ? cfg.mega.free : cfg.mega.base)) {
    mega = Math.random() * 4 | 0;
    [mega, mega + 1].forEach(c => { main[c] = Array.from({ length: ROWS }, () => ({ k: cfg.wild, full: true, mega: true })); });
  }
  const full = [];
  if (cfg.fullWild) main.forEach((col, c) => { if (col[0].full) { full.push(c); big[c] = Array.from({ length: BIG_ROWS }, () => ({ k: cfg.wild, full: true })); } });
  return { main, big, full, mega };
}
export function settle(cfg, b, bet, free, fm = 1) {
  const lb = bet / 100;
  const wm = evalLines(cfg, b.main, LINES, lb, 'main', fm);
  const wb = evalLines(cfg, b.big, BIG_LINES, lb, 'big', fm * (free && cfg.fullWild ? 2 : 1));
  const wins = wm.concat(wb);
  const supers = cfg.super ? b.main.concat(b.big).flat().filter(s => s.k === cfg.super) : [];
  // En el colosal cada Super ocupa un bloque de 3 filas: se cuenta un Super por bloque
  const nSuper = cfg.super ? new Set(supers.map(s => s.blk || Math.random())).size : 0;
  const jp = cfg.fullWild ? ({ 2: 'mini', 3: 'minor', 4: 'major', 5: 'grand' })[b.full.length] || null
    : nSuper >= 6 ? 'grand' : nSuper === 5 ? 'major' : nSuper === 4 ? 'minor' : nSuper === 3 ? 'mini' : null;
  return { wins, total: wins.reduce((a, w) => a + w.win, 0), scat: countScatters(cfg, b.main, b.big), jp, nSuper };
}

// ---------- Arte (dibujado en canvas, cacheado por tamaño) ----------
const cache = new Map();
function cached(key, size, fn) {
  size = Math.max(8, Math.round(size)); const kk = key + '|' + size;
  let c = cache.get(kk); if (c) return c;
  c = makeCanvas(size, size); fn(c.getContext('2d'), size); cache.set(kk, c); return c;
}
function panel(x, s, c1, c2, rr = 0.14) {
  const m = s * 0.04, w = s - 2 * m, g = x.createLinearGradient(0, m, 0, m + w);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  x.save(); x.shadowColor = 'rgba(0,0,0,0.45)'; x.shadowBlur = s * 0.05; x.shadowOffsetY = s * 0.02;
  roundRect(x, m, m, w, w, s * rr); x.fillStyle = g; x.fill(); x.restore();
  x.lineWidth = s * 0.035; x.strokeStyle = '#f5d27a'; roundRect(x, m + s * 0.02, m + s * 0.02, w - s * 0.04, w - s * 0.04, s * rr * 0.8); x.stroke();
  x.globalAlpha = 0.18; x.fillStyle = '#fff'; x.beginPath(); x.ellipse(s / 2, s * 0.26, w * 0.42, s * 0.14, 0, 0, 7); x.fill(); x.globalAlpha = 1;
}
function emojiOn(x, s, e, y = 0.5, f = 0.62) {
  x.font = s * f + 'px "Apple Color Emoji","Noto Color Emoji","Segoe UI Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = 'rgba(0,0,0,0.4)'; x.shadowBlur = s * 0.04; x.fillText(e, s / 2, s * y); x.shadowBlur = 0;
}
function label(x, s, t, y, fs, fill = ['#fff8d0', '#f0b020'], stroke = '#2a0a00') {
  x.font = '900 ' + fs + 'px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  x.lineWidth = fs * 0.28; x.strokeStyle = stroke; x.strokeText(t, s / 2, y, s * 0.9);
  const g = x.createLinearGradient(0, y - fs / 2, 0, y + fs / 2); g.addColorStop(0, fill[0]); g.addColorStop(1, fill[1]);
  x.fillStyle = g; x.fillText(t, s / 2, y, s * 0.9);
}
const RANKTXT = { A: 'A', K: 'K', Q: 'Q', J: 'J', ten: '10' };
function rankIcon(cfg, k, size) {
  return cached(cfg.id + 'r' + k, size, (x, s) => {
    const t = RANKTXT[k], col = cfg.colors[k][0], fs = s * (t.length > 1 ? 0.6 : 0.76);
    x.font = '900 ' + fs + 'px Georgia, "Times New Roman", serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    x.lineWidth = s * 0.08; x.strokeStyle = '#fff4c8'; x.strokeText(t, s / 2, s * 0.54, s * 0.9);
    x.lineWidth = s * 0.03; x.strokeStyle = '#3a1a00'; x.strokeText(t, s / 2, s * 0.54, s * 0.9);
    const g = x.createLinearGradient(0, s * 0.2, 0, s * 0.85); g.addColorStop(0, '#fff'); g.addColorStop(0.35, col); g.addColorStop(1, '#2a0a00');
    x.fillStyle = g; x.fillText(t, s / 2, s * 0.54, s * 0.9);
  });
}
// Arpa dorada dibujada a mano
function harp(x, s) {
  x.save(); x.translate(s * 0.5, s * 0.52); x.scale(s / 100, s / 100);
  const g = x.createLinearGradient(-30, -35, 30, 35); g.addColorStop(0, '#fff3a0'); g.addColorStop(0.5, '#e8a820'); g.addColorStop(1, '#8a5206');
  x.strokeStyle = '#fff6d0'; x.lineWidth = 1.2; for (let i = 0; i < 7; i++) { const px = -18 + i * 6; x.beginPath(); x.moveTo(px, -24 + i * 3.2); x.lineTo(px, 28); x.stroke(); }
  x.lineCap = 'round'; x.strokeStyle = g; x.lineWidth = 7;
  x.beginPath(); x.moveTo(-24, 32); x.lineTo(-24, -26); x.quadraticCurveTo(0, -40, 24, -10); x.stroke();
  x.beginPath(); x.moveTo(-24, 32); x.lineTo(24, 32); x.stroke();
  x.lineWidth = 6; x.beginPath(); x.moveTo(24, -10); x.lineTo(24, 32); x.stroke();
  x.fillStyle = '#fff3a0'; x.beginPath(); x.arc(-24, -28, 5, 0, 7); x.fill();
  x.restore();
}
function eggIcon(cfg, size) {
  return cached(cfg.id + 'egg', size, (x, s) => {
    panel(x, s, '#3a2a6a', '#140a30');
    const cx = s / 2, cy = s * 0.44;
    x.drawImage(glow('rgba(255,200,60,1)', 64), cx - s * 0.45, cy - s * 0.45, s * 0.9, s * 0.9);
    const g = x.createRadialGradient(cx - s * 0.08, cy - s * 0.12, s * 0.02, cx, cy, s * 0.3);
    g.addColorStop(0, '#fffbe0'); g.addColorStop(0.4, '#f5c535'); g.addColorStop(1, '#8a5206');
    x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy, s * 0.2, s * 0.26, 0, 0, 7); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.7)'; x.beginPath(); x.ellipse(cx - s * 0.07, cy - s * 0.1, s * 0.04, s * 0.07, -0.4, 0, 7); x.fill();
    label(x, s, 'BONUS', s * 0.82, s * 0.2);
  });
}
function beanIcon(cfg, size) {
  return cached(cfg.id + 'bean', size, (x, s) => {
    panel(x, s, '#5ac85a', '#0e4a1a');
    x.save(); x.translate(s / 2, 0);
    x.strokeStyle = '#2a8a2a'; x.lineWidth = s * 0.07; x.lineCap = 'round';
    x.beginPath(); for (let i = 0; i <= 20; i++) { const t = i / 20, y = s * (0.92 - t * 0.82); x.lineTo(Math.sin(t * 9) * s * 0.1, y); } x.stroke();
    x.fillStyle = '#7ae07a';
    for (let i = 1; i < 6; i++) { const t = i / 6, y = s * (0.92 - t * 0.82), px = Math.sin(t * 9) * s * 0.1, d = i % 2 ? 1 : -1;
      x.beginPath(); x.ellipse(px + d * s * 0.1, y, s * 0.09, s * 0.04, d * 0.5, 0, 7); x.fill(); }
    x.restore();
    label(x, s, 'WILD', s * 0.78, s * 0.24);
  });
}
function spartaIcon(cfg, size, mult) {
  return cached(cfg.id + 'sp' + (mult || 0), size, (x, s) => {
    panel(x, s, mult ? '#ffd24a' : '#c82a1a', mult ? '#8a4a06' : '#3a0404');
    emojiOn(x, s, mult ? '⚔️' : '🛡️', 0.4, 0.5);
    label(x, s, mult ? 'x' + mult : 'WILD', s * 0.8, s * (mult ? 0.3 : 0.24), mult ? ['#fff', '#ff5a2a'] : undefined);
  });
}
function colisIcon(cfg, size) {
  return cached(cfg.id + 'colis', size, (x, s) => {
    panel(x, s, '#e8c890', '#6a4418');
    x.drawImage(glow('rgba(255,210,80,1)', 64), s * 0.1, s * 0.02, s * 0.8, s * 0.8);
    emojiOn(x, s, '🏛️', 0.42, 0.52);
    label(x, s, 'BONUS', s * 0.82, s * 0.2);
  });
}
export function symIcon(cfg, k, size, mult) {
  if (k === cfg.scatter) return cfg.id === 'giant' ? eggIcon(cfg, size) : colisIcon(cfg, size);
  if (k === 'bean') return beanIcon(cfg, size);
  if (k === 'sparta') return spartaIcon(cfg, size);
  if (k === 'super') return spartaIcon(cfg, size, mult || 2);
  if (RANKTXT[k]) return rankIcon(cfg, k, size);
  return cached(cfg.id + k, size, (x, s) => {
    const [c1, c2] = cfg.colors[k]; panel(x, s, c1, c2);
    if (k === 'harp') harp(x, s); else emojiOn(x, s, cfg.emoji[k], 0.52, 0.64);
  });
}
function iconStyleFor(cfg) {
  return k => { let url = ''; try { url = symIcon(cfg, k, 96).toDataURL('image/png'); } catch (e) { } return 'background-image:url(' + url + ');background-size:cover'; };
}

// ---------- Juego ----------
class Colossal {
  constructor(app, cfg) {
    this.app = app; this.cfg = cfg; this.id = cfg.id;
    this.main = new ReelSet({ cols: COLS, rows: ROWS, pick: c => pickSym(cfg, c, this.inFree, false), drawSym: (x, s, px, py, w, h, o) => this.drawMain(x, s, px, py, w, h, o) });
    this.big = new ReelSet({ cols: COLS, rows: BIG_ROWS, pick: c => pickSym(cfg, c, this.inFree, true), drawSym: (x, s, px, py, w, h, o) => this.drawBigCell(x, s, px, py, w, h, o) });
    // Al abrir, el colosal ya muestra bloques gigantes
    for (let c = 0; c < COLS; c++) { const col = bigColumn(cfg, c, false); this.big.columns[c].syms = [col[0]].concat(col); this.big.grid[c] = col; }
    this.freeLeft = 0; this.freeTotal = 0; this.inFree = false; this.fsTotal = 0; this.freeMult = 1;
    this.wins = null; this.winT = 0; this.time = 0; this.full = []; this.mega = -1;
    this.buy = { label: 'BONO', sub: b => app.fmt(b * 50), cost: b => b * 50, run: () => this.buyFree() };
  }
  get extra() { return this.inFree ? null : this.buy; }
  get freeRound() { return this.freeLeft > 0; }
  get freeCount() { return Math.max(1, this.freeTotal - this.freeLeft) + ' DE ' + this.freeTotal; }
  get keepWin() { return this.inFree; }
  get locked() { return this.inFree; }
  get animating() { return true; }

  resize(W, H) {
    this.W = W; this.H = H;
    const top = 34, avH = H - top - 12, avW = W - 24;
    // Opción A: lado a lado (celdas del principal cuadradas). Opción B: principal arriba y colosal abajo.
    const a = Math.min((avW - 12) / (COLS * 2), avH / ROWS);
    const bw = Math.min(avW / COLS, (avH - 12) / (ROWS * 2) * 1.12), bh = Math.min(bw * 0.92, (avH - 12) / (ROWS * 2));
    if (a >= Math.min(bw, bh)) {
      this.side = true; this.cw = a; this.ch = a;
      const tw = a * COLS * 2 + 12; this.mx = (W - tw) / 2; this.my = top + (avH - a * ROWS) / 2;
      this.bx = this.mx + a * COLS + 12; this.by = this.my; this.bch = a * ROWS / BIG_ROWS;
    } else {
      this.side = false; this.cw = bw; this.ch = bh;
      this.mx = (W - bw * COLS) / 2; this.my = top + (avH - bh * ROWS * 2 - 12) / 2;
      this.bx = this.mx; this.by = this.my + bh * ROWS + 12; this.bch = bh * ROWS / BIG_ROWS;
    }
    this.main.layout(this.mx, this.my, this.cw, this.ch);
    this.big.layout(this.bx, this.by, this.cw, this.bch);
    this.bgCache = null;
  }
  frame(x, px, py, w, h) {
    roundRect(x, px - 8, py - 8, w + 16, h + 16, 8);
    const g = x.createLinearGradient(0, py - 8, 0, py + h + 8); g.addColorStop(0, '#fff0b0'); g.addColorStop(0.5, '#c8901e'); g.addColorStop(1, '#7a4a06');
    x.fillStyle = g; x.fill(); x.fillStyle = this.app.light ? '#fbf3e0' : '#140c22'; x.fillRect(px, py, w, h);
    x.strokeStyle = 'rgba(200,150,60,0.25)'; x.lineWidth = 1;
    for (let c = 1; c < COLS; c++) { x.beginPath(); x.moveTo(px + c * this.cw, py); x.lineTo(px + c * this.cw, py + h); x.stroke(); }
  }
  renderBg() {
    const { W, H } = this, dpr = this.app.dpr, L = this.app.light, cnv = makeCanvas(W * dpr, H * dpr), x = cnv.getContext('2d'); x.scale(dpr, dpr);
    this.scenery(x, W, H, L);
    this.frame(x, this.mx, this.my, this.cw * COLS, this.ch * ROWS);
    this.frame(x, this.bx, this.by, this.cw * COLS, this.bch * BIG_ROWS);
    return cnv;
  }
  // Símbolo del tablero principal
  drawMain(x, s, px, py, w, h, o) {
    if (!s) return;
    if (s.full && o && this.wildShown(this.main, o.c)) return;
    const dpr = this.app.dpr, size = Math.min(w, h) * 0.94;
    let sc = 1, a = 1; if (o && o.fx) { sc = o.fx.scale || 1; a = o.fx.alpha == null ? 1 : o.fx.alpha; }
    const d = size * sc, cx = px + w / 2, cy = py + h / 2;
    x.globalAlpha = a * (o && o.blur ? 0.7 : 1);
    if (s.k === this.cfg.scatter && !(o && o.blur)) this.scatGlow(x, cx, cy, w, h);
    const img = symIcon(this.cfg, s.k, size * dpr, s.mult);
    if (o && o.blur) x.drawImage(img, cx - d / 2, cy - d * 0.6, d, d * 1.2); else x.drawImage(img, cx - d / 2, cy - d / 2, d, d);
    x.globalAlpha = 1;
  }
  scatGlow(x, cx, cy, w, h) { x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.3 + 0.2 * Math.sin(this.time * 5); x.drawImage(glow('rgba(255,190,60,1)', 64), cx - w * 0.6, cy - h * 0.6, w * 1.2, h * 1.2); x.restore(); }
  wildShown(set, c) { const st = set.columns[c].state; return (st === 'idle' || st === 'bounce') && (set === this.main ? this.full.includes(c) || (this.mega >= 0 && (this.mega === c || this.mega === c - 1)) : this.full.includes(c)); }
  // Celdas del colosal mientras giran: franjas de color (los bloques gigantes se dibujan al parar)
  drawBigCell(x, s, px, py, w, h, o) {
    if (!s || !o || !o.spinning) return;
    const st = this.big.columns[o.c].state; if (st === 'bounce') return;
    const col = this.cfg.colors[s.k] ? this.cfg.colors[s.k][0] : s.k === this.cfg.scatter ? '#ffd24a' : '#3ac83a';
    x.globalAlpha = 0.55; x.fillStyle = col; x.fillRect(px + w * 0.12, py + 1, w * 0.76, h - 2); x.globalAlpha = 1;
  }
  // Bloques gigantes del colosal (cada racha de símbolos iguales = una figura grande)
  drawBigBlocks(x) {
    const { bx, by, cw, bch, cfg } = this, dpr = this.app.dpr, w = this.curWin();
    x.save(); x.beginPath(); x.rect(bx, by, cw * COLS, bch * BIG_ROWS); x.clip();
    for (let c = 0; c < COLS; c++) {
      const col = this.big.columns[c]; if (col.state !== 'idle' && col.state !== 'bounce') continue;
      if (this.full.includes(c)) { this.drawTallWild(x, bx + c * cw, by + col.shift * bch, cw, bch * BIG_ROWS, c); continue; }
      const g = this.big.grid[c]; let r = 0;
      while (r < BIG_ROWS) {
        let e = r + 1; while (e < BIG_ROWS && g[e].k === g[r].k && g[e].blk === g[r].blk) e++;
        const s = g[r], hh = (e - r) * bch, py = by + (r + col.shift) * bch;
        let hit = false; if (w && w.set === 'big') for (let rr = r; rr < e; rr++) if (w.line[c] === rr && c < w.n) hit = true;
        const dim = w && !hit, pulse = hit ? 1 + 0.06 * Math.sin(this.winT * 11) : 1;
        const size = Math.min(cw, hh) * 0.96 * pulse, cx = bx + c * cw + cw / 2, cy = py + hh / 2;
        x.globalAlpha = dim ? 0.45 : 1;
        if (s.k === cfg.scatter) this.scatGlow(x, cx, cy, size, size);
        if (hh > cw * 1.05) { x.fillStyle = 'rgba(245,210,122,0.12)'; roundRect(x, bx + c * cw + 2, py + 2, cw - 4, hh - 4, 6); x.fill(); }
        x.drawImage(symIcon(cfg, s.k, Math.min(cw, hh) * 0.96 * dpr, s.mult), cx - size / 2, cy - size / 2, size, size);
        x.globalAlpha = 1; r = e;
      }
    }
    x.restore();
  }
  // Rodillo entero de WILD (principal o colosal) o MEGA WILD de 2 rodillos
  drawTallWild(x, px, py, w, h, c, mega) {
    const { cfg, time } = this;
    x.save(); x.beginPath(); roundRect(x, px + 2, py + 2, w - 4, h - 4, 8); x.clip();
    const g = x.createLinearGradient(0, py, 0, py + h);
    if (cfg.id === 'giant') { g.addColorStop(0, '#9ae8ff'); g.addColorStop(1, '#1a6a2a'); } else { g.addColorStop(0, '#ffcf6a'); g.addColorStop(1, '#6a0a04'); }
    x.fillStyle = g; x.fillRect(px, py, w, h);
    if (cfg.id === 'giant') {
      // la habichuela sube serpenteando por todo el rodillo
      const cx = px + w / 2; x.strokeStyle = '#2a8a2a'; x.lineWidth = w * 0.14; x.lineCap = 'round';
      x.beginPath(); for (let i = 0; i <= 40; i++) { const t = i / 40; x.lineTo(cx + Math.sin(t * 14 + time * 2) * w * 0.18, py + h * (1 - t)); } x.stroke();
      x.fillStyle = '#7ae07a';
      for (let i = 1; i < 12; i++) { const t = i / 12, lx = cx + Math.sin(t * 14 + time * 2) * w * 0.18, d = i % 2 ? 1 : -1; x.beginPath(); x.ellipse(lx + d * w * 0.16, py + h * (1 - t), w * 0.15, w * 0.06, d * 0.5, 0, 7); x.fill(); }
    } else {
      const s = Math.min(w, h * 0.5); x.font = s * 0.75 + 'px "Apple Color Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('🛡️', px + w / 2, py + h * 0.42);
    }
    x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.22 + 0.14 * Math.sin(time * 4 + c);
    x.drawImage(glow(cfg.id === 'giant' ? 'rgba(160,255,160,1)' : 'rgba(255,200,90,1)', 64), px - w * 0.3, py, w * 1.6, h);
    x.restore();
    x.strokeStyle = '#f5d27a'; x.lineWidth = 3; roundRect(x, px + 2.5, py + 2.5, w - 5, h - 5, 8); x.stroke();
    goldText(x, mega ? 'MEGA WILD' : 'WILD', px + w / 2, py + h - Math.min(h * 0.12, 26), Math.min(22, w * 0.26), { maxW: w * 0.92 });
  }
  update(dt) { this.time += dt; this.main.update(dt); this.big.update(dt); if (this.wins) this.winT += dt; }
  curWin() { return this.wins && this.wins.length ? this.wins[Math.floor(this.winT / 1.1) % this.wins.length] : null; }
  draw(x) {
    if (!this.W) return;
    if (!this.bgCache) this.bgCache = this.renderBg();
    x.drawImage(this.bgCache, 0, 0, this.W, this.H);
    const tw = this.side ? this.cw * COLS * 2 + 12 : this.cw * COLS, cfg = this.cfg;
    const title = this.inFree ? 'GIRO GRATIS ' + this.freeCount + (this.freeMult > 1 ? ' · x' + this.freeMult : cfg.fullWild ? ' · COLOSAL x2' : '') : cfg.name.toUpperCase() + ' · 100 LÍNEAS';
    goldText(x, title, this.W / 2, this.my - 22, Math.min(15, tw * 0.045), { maxW: tw * 0.95, colors: ['#fff8d0', '#ffe08a', '#e8a020', '#fff0b0'], stroke: '#3a1800' });
    this.main.draw(x, (c, r) => this.cellFx(c, r));
    this.full.forEach(c => { if (this.wildShown(this.main, c)) this.drawTallWild(x, this.mx + c * this.cw, this.my + this.main.columns[c].shift * this.ch, this.cw, this.ch * ROWS, c); });
    if (this.mega >= 0 && this.wildShown(this.main, this.mega + 1)) this.drawTallWild(x, this.mx + this.mega * this.cw, this.my, this.cw * 2, this.ch * ROWS, this.mega, true);
    this.big.draw(x, null);
    this.drawBigBlocks(x);
    if (this.wins) this.drawWin(x);
  }
  cellFx(c, r) {
    const w = this.curWin(); if (!w) return null;
    if (w.set !== 'main') return { alpha: 0.45 };
    return c < w.n && w.line[c] === r ? { scale: 1 + 0.07 * Math.sin(this.winT * 11) } : { alpha: 0.45 };
  }
  drawWin(x) {
    const w = this.curWin(); if (!w) return;
    const main = w.set === 'main', ox = main ? this.mx : this.bx, oy = main ? this.my : this.by, ch = main ? this.ch : this.bch, cw = this.cw;
    x.save(); x.globalCompositeOperation = this.app.light ? 'source-over' : 'lighter'; x.lineJoin = 'round';
    x.beginPath(); w.line.forEach((r, c) => { const px = ox + c * cw + cw / 2, py = oy + r * ch + ch / 2; c ? x.lineTo(px, py) : x.moveTo(ox - 5, py); });
    x.lineTo(ox + cw * COLS + 5, oy + w.line[COLS - 1] * ch + ch / 2);
    x.strokeStyle = 'rgba(220,80,20,0.5)'; x.lineWidth = 9; x.stroke(); x.strokeStyle = '#fff2b0'; x.lineWidth = 2.5; x.stroke();
    x.restore();
    const my = oy + (main ? ch * 2 : ch * (w.line[2] + 0.5));
    goldText(x, this.app.fmt(w.win) + (w.m > 1 ? ' (x' + w.m + ')' : ''), ox + cw * 2.5, my, Math.min(30, cw * 0.4), { glowColor: '#ff8a2e' });
  }
  center(set, c, r) { return set === 'main' ? [this.mx + c * this.cw + this.cw / 2, this.my + r * this.ch + this.ch / 2] : [this.bx + c * this.cw + this.cw / 2, this.by + r * this.bch + this.bch / 2]; }

  async play(bet) {
    const app = this.app, sfx = app.sfx, cfg = this.cfg;
    this.wins = null; this.full = []; this.mega = -1;
    const free = this.freeLeft > 0;
    if (free) this.freeLeft--;
    app.setSpinLabel(free ? 'GRATIS' : 'PARAR', free ? this.freeCount.toLowerCase() : '');
    const b = spinBoards(cfg, this.inFree);
    if (app._forceScat) {
      app._forceScat = 0;
      [[b.main, 0], [b.big, 2], [b.main, 4]].forEach(([set, c]) => { if (set[c][0].full) return; const r = set === b.main ? 1 : 4; set[c][r] = Object.assign({ blk: 'f' + c }, { k: cfg.scatter }); });
    }
    if (app._forceFull && cfg.fullWild) { const n = app._forceFull; app._forceFull = 0; b.full = []; for (let c = 0; c < n; c++) { b.main[c] = Array.from({ length: ROWS }, () => ({ k: cfg.wild, full: true })); b.big[c] = Array.from({ length: BIG_ROWS }, () => ({ k: cfg.wild, full: true })); b.full.push(c); } }
    if (app._forceMega && cfg.mega) { app._forceMega = 0; b.mega = 1; [1, 2].forEach(c => { b.main[c] = Array.from({ length: ROWS }, () => ({ k: cfg.wild, full: true, mega: true })); }); }
    // Suspenso si ya van 2 BONUS antes del último rodillo
    const scatIn = c => (b.main[c].some(s => s.k === cfg.scatter) ? 1 : 0) + (b.big[c].some(s => s.k === cfg.scatter) ? 1 : 0);
    const anticFrom = scatIn(0) + scatIn(2) >= 2 ? 4 : -1;
    sfx.spinStart(app.speed >= 2);
    this.main.start(app.speed); this.big.start(app.speed);
    // Los WILD transferidos se revelan en el colosal cuando para el rodillo del principal
    const transfer = [];
    const bigDone = this.big.stopTo(b.big, { anticFrom, minTime: 0.75 / (app.speed || 1), onStop: (c, last) => {
      sfx.reelStop(c, false);
      if (b.full.includes(c)) { this.full.includes(c) || this.full.push(c); }
      b.big[c].forEach((s, r) => { if (s.k === cfg.scatter && (r === 0 || b.big[c][r - 1].k !== cfg.scatter)) { const [px, py] = this.center('big', c, r + 1); sfx.bell(784 + c * 110, 0.9, 0.12); app.burst(px, py, 14, { type: 'spark', color: '#ffd24a', speed: 240, size: 10 }); } });
      if (cfg.super && b.big[c].some(s => s.k === cfg.super)) { sfx.multiplier(4); }
    } });
    await this.main.stopTo(b.main, { anticFrom, onStop: (c) => {
      sfx.reelStop(c, false);
      if (b.full.includes(c)) {
        this.full.push(c); transfer.push(c);
        const [px, py] = this.center('main', c, 1.5); sfx.whoosh(); sfx.bell(660 + transfer.length * 110, 1, 0.12);
        app.burst(px, py, 22, { type: 'spark', color: '#a8ffa8', speed: 320, size: 12 }); app.flash('#d8ffd0', 0.2);
      }
      if (b.mega >= 0 && b.mega + 1 === c) { this.mega = b.mega; const [px, py] = this.center('main', c, 1.5); sfx.thunder(0.5); app.shake(true); app.burst(px, py, 30, { type: 'spark', color: '#ffc04a', speed: 360, size: 14 }); app.flash('#ffe0a0', 0.35); }
      if (b.main[c].some(s => s.k === cfg.scatter)) { const r = b.main[c].findIndex(s => s.k === cfg.scatter), [px, py] = this.center('main', c, r); sfx.bell(784 + c * 110, 0.9, 0.12); app.burst(px, py, 14, { type: 'spark', color: '#ffd24a', speed: 240, size: 10 }); }
    } });
    await bigDone;
    sfx.reelStop(4, true); sfx.anticipation(false);
    if (transfer.length) app.message('<b>' + transfer.length + ' rodillo' + (transfer.length > 1 ? 's' : '') + ' WILD</b> transferido' + (transfer.length > 1 ? 's' : '') + ' al colosal');
    const res = settle(cfg, b, bet, this.inFree, this.inFree ? this.freeMult : 1);
    let total = res.total;
    if (res.wins.length) {
      this.wins = res.wins.sort((p, q) => q.win - p.win); this.winT = 0;
      sfx.win(total >= bet * 5 ? 2 : 0); app.addWin(total);
      app.flyCoins(this.W / 2, this.H / 2, Math.min(16, 3 + res.wins.length * 2));
      const nm = res.wins.filter(w => w.set === 'main').length, nb = res.wins.length - nm;
      app.message('Premio: <b>' + app.fmt(total) + '</b> · ' + (nm ? nm + ' en el principal' : '') + (nm && nb ? ' · ' : '') + (nb ? nb + ' en el colosal' : ''));
      await app.wait(Math.min(2200, 800 + res.wins.length * 150));
    } else if (!this.inFree) app.message(this.hint);
    if (res.jp) { await app.wait(300); total += await app.awardJackpot(res.jp); }
    if (this.inFree) this.fsTotal += total;
    if (res.scat >= 3) {
      await app.wait(500); this.wins = null;
      { const v = await app.bonusPay(res.scat, bet, cfg.scatName); total += v; if (this.inFree) this.fsTotal += v; }
      sfx.featureStart(); app.flash('#ffd27a', 0.5); app.shake(true);
      const n = cfg.spins(res.scat);
      if (this.inFree) { this.freeLeft += n; this.freeTotal += n; await app.banner('+' + n + ' GIROS', 'Vuelven los ' + cfg.scatName, { color: '#ffb03a', ms: 1800 }); }
      else await this.startFree(res.scat);
    }
    const celebrated = this.inFree;
    if (this.inFree && this.freeLeft === 0 && free) {
      await app.wait(400);
      const fs = this.fsTotal;
      this.inFree = false; this.wins = null; this.freeMult = 1;
      if (fs > 0) await app.celebrate(fs, bet, cfg.name.toUpperCase());
      sfx.stopMusic(); sfx.music(cfg.music);
      app.message('Giros gratis: <b>' + app.fmt(fs) + '</b>');
    }
    app.setSpinLabel(this.freeLeft ? 'GRATIS' : 'GIRAR', this.freeLeft ? (this.freeTotal - this.freeLeft + 1) + ' de ' + this.freeTotal : '');
    return { win: total, celebrated };
  }
  async startFree(nScat = 3) {
    const app = this.app, sfx = app.sfx, cfg = this.cfg, n = cfg.spins(nScat);
    this.inFree = true; this.freeLeft = n; this.freeTotal = n; this.fsTotal = 0;
    this.freeMult = cfg.freeMult ? cfg.freeMult(nScat) : 1;
    sfx.stopMusic();
    await app.banner(n + ' GIROS GRATIS', cfg.freeMult ? 'Todo paga x' + this.freeMult + ' · Super Espartaco hasta x100' : 'Premios del colosal x2 · wilds reforzados', { color: '#ff9a2e', ms: 2400 });
    sfx.music(cfg.bonusMusic);
    app.setSpinLabel('GRATIS', '1 de ' + this.freeTotal);
  }
  async buyFree() { this.app.sfx.featureStart(); await this.startFree(3); return { win: 0, celebrated: true }; }
  slam() { this.main.slam(); this.big.slam(); }
  info(bet, fmt) {
    const cfg = this.cfg, lb = bet / 100, img = k => '<img class="ico" src="' + symIcon(cfg, k, 96).toDataURL('image/png') + '" alt="">';
    return '<h3>Cómo se juega</h3><ul>' + this.rules() +
      '<li><b>BONO</b>: compra los giros gratis por 50× la apuesta.</li></ul>' +
      '<h3>Pagos por línea (apuesta ' + fmt(bet) + ') · 3 / 4 / 5</h3><table>' +
      Object.keys(cfg.pay).map(k => '<tr><td>' + img(k) + '</td><td>' + cfg.names[k] + '</td><td>' + [3, 4, 5].map(n => fmt(cfg.pay[k][n] * cfg.scale * lb)).join(' · ') + '</td></tr>').join('') + '</table>';
  }
}

export class GiantGold extends Colossal {
  static id = 'giant';
  static name = 'Oro del Gigante';
  static music = 'fairy';
  static bonusMusic = 'fairyBonus';
  static iconStyle = iconStyleFor(GIANT);
  static lobby = {
    icons: ['giant', 'egg', 'bean'], c1: '#6ad86a', c2: '#1a3a5a', mechanic: 'Rodillos colosales · 100 líneas · estilo Giant\'s Gold',
    desc: 'Jack y las habichuelas: tablero de 5×4 y otro colosal de 5×12. Los rodillos llenos de WILD se transfieren al colosal. Hasta 50 giros gratis con el colosal x2.'
  };
  constructor(app) {
    super(app, GIANT);
    this.hint = 'La <b>habichuela</b> es WILD apilado: un rodillo lleno se <b>transfiere al colosal</b>. 3+ huevos de oro = <b>giros gratis</b>.';
  }
  scenery(x, W, H, L) {
    let g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, L ? '#bfe8ff' : '#1a2a6a'); g.addColorStop(0.6, L ? '#e8f6ff' : '#4a6ab0'); g.addColorStop(1, L ? '#a8d890' : '#1a3a1a');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // nubes
    x.fillStyle = L ? 'rgba(255,255,255,0.9)' : 'rgba(220,230,255,0.35)';
    for (let i = 0; i < 9; i++) { const cx = rand(0, W), cy = rand(10, H * 0.5), r = rand(18, 40); [0, 1, 2].forEach(k => { x.beginPath(); x.arc(cx + (k - 1) * r * 0.9, cy + (k === 1 ? -r * 0.35 : 0), r * (k === 1 ? 1 : 0.75), 0, 7); x.fill(); }); }
    // castillo del gigante en las nubes
    x.fillStyle = L ? 'rgba(150,130,190,0.6)' : 'rgba(40,30,80,0.7)';
    const cx = W * 0.82, cy = H * 0.2; x.fillRect(cx - 30, cy - 20, 60, 30); [-30, -8, 16].forEach(d => { x.fillRect(cx + d, cy - 42, 14, 24); x.beginPath(); x.moveTo(cx + d - 3, cy - 42); x.lineTo(cx + d + 7, cy - 58); x.lineTo(cx + d + 17, cy - 42); x.fill(); });
    // habichuela gigante al costado
    x.strokeStyle = L ? '#3a9a3a' : '#1a6a2a'; x.lineWidth = 14; x.lineCap = 'round';
    x.beginPath(); for (let i = 0; i <= 30; i++) { const t = i / 30; x.lineTo(W * 0.06 + Math.sin(t * 10) * 12, H * (1 - t)); } x.stroke();
    x.fillStyle = L ? '#6ad86a' : '#2a8a3a'; for (let i = 1; i < 12; i++) { const t = i / 12, d = i % 2 ? 1 : -1; x.beginPath(); x.ellipse(W * 0.06 + Math.sin(t * 10) * 12 + d * 16, H * (1 - t), 16, 6, d * 0.5, 0, 7); x.fill(); }
  }
  rules() {
    return '<li><b>Dos tableros</b>: principal de <b>5×4</b> (40 líneas) y <b>colosal de 5×12</b> (60 líneas) = <b>100 líneas</b>. En el colosal los símbolos caen en <b>bloques gigantes</b>.</li>' +
      '<li><b>Habichuela mágica = WILD</b> apilado. Si llena un rodillo del principal, se <b>transfiere entero</b> al mismo rodillo del colosal.</li>' +
      '<li><b>Huevo de oro BONUS</b> solo en los rodillos 1, 3 y 5 de ambos tableros: <b>3 = 5 · 4 = 10 · 5 = 20 · 6 = 50 giros gratis</b>. En los giros gratis los premios del colosal pagan <b>x2</b> y salen más habichuelas.</li>' +
      '<li><b>Progresivos</b>: rodillos WILD transferidos a la vez · <b>2 = MINI · 3 = MINOR · 4 = MAJOR · 5 = GRAND</b>.</li>';
  }
}
export class Spartacus extends Colossal {
  static id = 'spartacus';
  static name = 'Espartaco Coloso';
  static music = 'arena';
  static bonusMusic = 'arenaBonus';
  static iconStyle = iconStyleFor(SPARTA);
  static lobby = {
    icons: ['sparta', 'colis', 'lion'], c1: '#e84a2a', c2: '#3a1a08', mechanic: 'Rodillos colosales · 100 líneas · estilo Spartacus',
    desc: 'Gladiadores en el Coliseo: tablero de 5×4 y otro colosal de 5×12. MEGA WILD de 2 rodillos, Super Espartaco con multiplicador hasta x100 y giros gratis x2/x3/x5.'
  };
  constructor(app) {
    super(app, SPARTA);
    this.hint = '<b>Espartaco</b> es WILD; el <b>Super Espartaco</b> multiplica la línea hasta <b>x25</b>. 3+ coliseos = <b>giros gratis</b>.';
  }
  scenery(x, W, H, L) {
    let g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, L ? '#ffd8a0' : '#3a0a08'); g.addColorStop(0.55, L ? '#f0a860' : '#8a2a10'); g.addColorStop(1, L ? '#e8c890' : '#2a1406');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // arcos del Coliseo en dos pisos
    x.fillStyle = L ? 'rgba(160,100,50,0.45)' : 'rgba(20,6,2,0.55)';
    [H * 0.22, H * 0.4].forEach((y0, k) => { const aw = 34 - k * 4; x.fillRect(0, y0, W, 4); for (let px = -10; px < W + aw; px += aw + 10) { x.beginPath(); x.moveTo(px, y0 + 60); x.lineTo(px, y0 + 22); x.arc(px + aw / 2, y0 + 22, aw / 2, Math.PI, 0); x.lineTo(px + aw, y0 + 60); x.fill(); } });
    // estandartes rojos
    for (let i = 0; i < 6; i++) { const px = W * (i + 0.5) / 6; x.fillStyle = i % 2 ? '#b8231a' : '#d8a020'; x.beginPath(); x.moveTo(px - 10, 0); x.lineTo(px + 10, 0); x.lineTo(px + 10, 46); x.lineTo(px, 38); x.lineTo(px - 10, 46); x.fill(); }
    // arena
    x.fillStyle = L ? 'rgba(230,190,120,0.7)' : 'rgba(90,50,20,0.6)'; x.fillRect(0, H * 0.86, W, H * 0.14);
  }
  rules() {
    return '<li><b>Dos tableros</b>: principal de <b>5×4</b> (40 líneas) y <b>colosal de 5×12</b> (60 líneas) = <b>100 líneas</b>. En el colosal los símbolos caen en <b>bloques gigantes</b>.</li>' +
      '<li><b>Espartaco = WILD</b>. <b>Super Espartaco</b> también es WILD y <b>multiplica</b> la línea x2, x3, x5, x10 o x25 (en giros gratis hasta <b>x100</b>).</li>' +
      '<li><b>MEGA WILD</b>: a veces cae un Espartaco gigante de <b>2 rodillos de ancho</b> en los rodillos 1 a 4 del principal (uno por giro).</li>' +
      '<li><b>Coliseo BONUS</b> solo en los rodillos 1, 3 y 5 de ambos tableros: <b>3 = 8 giros x2 · 4 = 12 giros x3 · 5 o 6 = 20 giros x5</b>.</li>' +
      '<li><b>Progresivos</b>: Super Espartacos a la vez · <b>3 = MINI · 4 = MINOR · 5 = MAJOR · 6+ = GRAND</b>.</li>';
  }
}
