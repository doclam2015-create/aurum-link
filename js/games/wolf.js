// CARRERA DEL LOBO · estilo "Wolf Run": 5 rodillos × 4 filas, 40 líneas, figuras hiperrealistas.
// WILDS APILADOS: el lobo aullando a la luna cae en pilas y puede llenar un rodillo entero.
// Los símbolos altos también caen apilados. Atrapasueños BONUS solo en los rodillos 2, 3 y 4:
// 3 = 5 giros gratis con WILDS APILADOS REFORZADOS (se repiten: +5).
// Progresivos: rodillos llenos de WILD a la vez → 2 MINI · 3 MINOR · 4 MAJOR · 5 GRAND.
import { S, glow, goldText, roundRect, rand, FONT, makeCanvas } from '../gfx.js?v=39';
import { ReelSet, LINES_5x3, weighted } from '../reels.js?v=39';

const COLS = 5, ROWS = 4;
// 40 líneas: los 20 patrones de 3 filas en las bandas de arriba y de abajo, sin repetir, más zigzags
function makeLines() {
  const out = [], seen = new Set();
  const add = l => { const k = l.join(); if (!seen.has(k) && out.length < 40) { seen.add(k); out.push(l); } };
  [0, 1].forEach(b => LINES_5x3.forEach(L => add(L.map(r => r + b))));
  [[3, 3, 3, 3, 3], [0, 1, 2, 3, 3], [3, 2, 1, 0, 0], [0, 1, 2, 3, 2], [3, 2, 1, 0, 1], [0, 3, 0, 3, 0], [3, 0, 3, 0, 3], [1, 3, 1, 3, 1], [2, 0, 2, 0, 2], [0, 0, 3, 0, 0], [3, 3, 0, 3, 3]].forEach(add);
  return out;
}
export const LINES = makeLines();
// Pago por línea (en apuestas por línea = apuesta / 40) · 3 / 4 / 5 iguales
export const PAY = {
  wild: [0, 0, 0, 100, 400, 1500], gray: [0, 0, 0, 60, 200, 800], white: [0, 0, 0, 50, 150, 600], black: [0, 0, 0, 40, 120, 450],
  eagle: [0, 0, 0, 25, 80, 250], bear: [0, 0, 0, 25, 70, 200],
  A: [0, 0, 0, 10, 30, 120], K: [0, 0, 0, 10, 25, 100], Q: [0, 0, 0, 8, 20, 80], J: [0, 0, 0, 5, 15, 60], ten: [0, 0, 0, 5, 12, 50], nine: [0, 0, 0, 4, 10, 40]
};
export const SCALE = 0.8; // calibrado por simulación: retorno total ~96 % (con jackpots y giros gratis)
const HIGH = ['gray', 'white', 'black', 'eagle', 'bear'];
export const WEIGHTS = { gray: 3, white: 3.5, black: 4, eagle: 5, bear: 5, A: 9, K: 9, Q: 10, J: 10, ten: 11, nine: 11, wild: 0.6, bonus: 4.6 };
// Probabilidad por rodillo de que el WILD llene el rodillo entero (en giros gratis, reforzado en 2-5)
export const FULL_WILD = { base: 0.022, free: 0.1 };
export const STACK_P = 0.28; // chance de una pila de símbolo alto (2 a 4) en un rodillo
export const JP_BY_FULL = n => n >= 5 ? 'grand' : n === 4 ? 'major' : n === 3 ? 'minor' : n === 2 ? 'mini' : null;
const NAMES = { wild: 'Lobo aullando (WILD)', gray: 'Lobo gris', white: 'Lobo blanco', black: 'Lobo negro', eagle: 'Tótem águila', bear: 'Tótem oso', A: 'A', K: 'K', Q: 'Q', J: 'J', ten: '10', nine: '9', bonus: 'Atrapasueños BONUS' };

// Símbolo al azar para un rodillo (sin BONUS fuera de los rodillos 2-4)
export function pickSym(c, free) {
  const w = c >= 1 && c <= 3 ? WEIGHTS : Object.assign({}, WEIGHTS, { bonus: 0 });
  return { k: weighted(free ? Object.assign({}, w, { wild: 1 }) : w) };
}
// Columna final: rodillo lleno de WILD, pila de un símbolo alto o símbolos sueltos (máx. 1 BONUS)
export function makeColumn(c, free) {
  const pFull = free ? (c === 0 ? FULL_WILD.base : FULL_WILD.free) : FULL_WILD.base;
  if (Math.random() < pFull) return Array.from({ length: ROWS }, () => ({ k: 'wild', full: true }));
  const col = []; let bonus = false;
  for (let r = 0; r < ROWS; r++) { let s = pickSym(c, free); if (s.k === 'bonus' && bonus) s = { k: 'nine' }; if (s.k === 'bonus') bonus = true; col.push(s); }
  if (Math.random() < STACK_P) {
    const k = Math.random() < (free ? 0.35 : 0.2) ? 'wild' : HIGH[Math.random() * HIGH.length | 0];
    const h = 2 + (Math.random() * 3 | 0), r0 = Math.random() * (ROWS - h + 1) | 0;
    for (let r = r0; r < r0 + h; r++) if (col[r].k !== 'bonus') col[r] = { k };
  }
  return col;
}
// Líneas: el WILD sustituye a todo menos el BONUS
export function evalLines(g, lineBet) {
  const wins = [];
  LINES.forEach((L, li) => {
    const s = L.map((r, c) => g[c][r].k);
    if (s[0] === 'bonus') return;
    const base = s.find(k => k !== 'wild') || 'wild';
    // Paga lo mejor entre la línea de WILD puros y la del símbolo base
    let best = null;
    [base, 'wild'].forEach(k => {
      if (!PAY[k]) return;
      let n = 0; while (n < COLS && (s[n] === k || s[n] === 'wild')) n++;
      if (k === 'wild') { n = 0; while (n < COLS && s[n] === 'wild') n++; }
      const p = PAY[k][n] * SCALE * lineBet;
      if (p && (!best || p > best.win)) best = { li, line: L, n, k, win: p };
    });
    if (best) wins.push(best);
  });
  return wins;
}

// ---------- Imágenes (assets/wolf.webp, ver tools/build_wolf.py) ----------
let SHEET = null;
const POS = { gray: 0, white: 1, black: 2, howl: 3, eagle: 4, bear: 5, dream: 6 };
export function loadWolfArt(src = 'assets/wolf.webp') {
  return new Promise((res, rej) => { const img = new Image(); img.decoding = 'async'; img.onload = () => { SHEET = img; res(img); }; img.onerror = rej; img.src = src; });
}
export function wolfIconStyle(k) { return 'background-image:url(assets/wolf.webp);background-size:700% 100%;background-position:' + (POS[k] * 100 / 6).toFixed(2) + '% 0'; }
function sheet(x, k, dx, dy, dw, dh, sx = 0, sy = 0, sw = 200, sh = 200) {
  if (!SHEET) return;
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  x.drawImage(SHEET, POS[k] * 200 + sx, sy, sw, sh, dx, dy, dw, dh);
}
const cache = new Map();
function cached(key, size, fn) {
  size = Math.round(size); const kk = key + '|' + size;
  let c = cache.get(kk); if (c) return c;
  c = makeCanvas(size, size); fn(c.getContext('2d'), size);
  if (SHEET) cache.set(kk, c);
  return c;
}
// Retrato de lobo con marco fino y esquinas de color (como en la máquina)
const FRAME = { gray: '#3a78c8', white: '#3a78c8', black: '#c83a3a' };
function portrait(k, size) {
  return cached('p' + k, size, (x, s) => {
    const m = s * 0.05;
    x.save(); x.shadowColor = 'rgba(40,20,0,0.45)'; x.shadowBlur = s * 0.04; x.shadowOffsetY = s * 0.015;
    x.fillStyle = '#fff'; x.fillRect(m, m, s - 2 * m, s - 2 * m); x.restore();
    sheet(x, k, m + s * 0.02, m + s * 0.02, s - 2 * m - s * 0.04, s - 2 * m - s * 0.04);
    const col = FRAME[k]; x.strokeStyle = col; x.lineWidth = s * 0.022; x.strokeRect(m + s * 0.012, m + s * 0.012, s - 2 * m - s * 0.024, s - 2 * m - s * 0.024);
    x.fillStyle = col; [[m, m], [s - m, m], [m, s - m], [s - m, s - m]].forEach(([px, py]) => x.fillRect(px - s * 0.035, py - s * 0.035, s * 0.07, s * 0.07));
    x.fillStyle = '#fff'; [[m, m], [s - m, m], [m, s - m], [s - m, s - m]].forEach(([px, py]) => x.fillRect(px - s * 0.015, py - s * 0.015, s * 0.03, s * 0.03));
  });
}
// Tótem o atrapasueños sobre un disco con rayos (como en la máquina)
function onDisc(k, size, c1, c2) {
  return cached('d' + k, size, (x, s) => {
    const cx = s / 2, cy = s / 2, R = s * 0.44;
    x.save(); x.translate(cx, cy);
    x.fillStyle = c1; x.beginPath(); for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, rr = i % 2 ? R * 0.86 : R; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); x.fill();
    x.fillStyle = c2; x.beginPath(); x.arc(0, 0, R * 0.72, 0, 7); x.fill();
    x.restore();
    x.save(); x.shadowColor = 'rgba(40,20,0,0.5)'; x.shadowBlur = s * 0.05; x.shadowOffsetY = s * 0.02;
    sheet(x, k, s * 0.04, s * 0.04, s * 0.92, s * 0.92); x.restore();
  });
}
function bonusIcon(size) {
  return cached('bonus', size, (x, s) => {
    const g = x.createLinearGradient(0, 0, 0, s); g.addColorStop(0, '#8a2a2a'); g.addColorStop(1, '#5a1414');
    x.fillStyle = g; x.fillRect(s * 0.03, s * 0.03, s * 0.94, s * 0.94);
    x.fillStyle = '#3a1a5a'; x.beginPath(); x.arc(s / 2, s * 0.46, s * 0.36, 0, 7); x.fill();
    sheet(x, 'dream', s * 0.1, s * 0.02, s * 0.8, s * 0.8);
    const fs = s * 0.24; x.font = '900 ' + fs + 'px Georgia, "Times New Roman", serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    x.lineWidth = fs * 0.3; x.strokeStyle = '#3a1800'; x.strokeText('Bonus', s / 2, s * 0.82);
    const tg = x.createLinearGradient(0, s * 0.7, 0, s * 0.94); tg.addColorStop(0, '#fff3a0'); tg.addColorStop(0.5, '#f0b429'); tg.addColorStop(1, '#a86a10');
    x.fillStyle = tg; x.fillText('Bonus', s / 2, s * 0.82);
  });
}
function wildIcon(size) {
  return cached('wild', size, (x, s) => {
    sheet(x, 'howl', s * 0.04, s * 0.04, s * 0.92, s * 0.92);
    x.strokeStyle = '#f0c040'; x.lineWidth = s * 0.04; x.strokeRect(s * 0.04, s * 0.04, s * 0.92, s * 0.92);
    wildLabel(x, s / 2, s * 0.85, s * 0.22);
  });
}
function wildLabel(x, cx, cy, fs) {
  x.font = '900 ' + fs + 'px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  x.lineWidth = fs * 0.3; x.strokeStyle = '#2a0a4a'; x.strokeText('WILD', cx, cy);
  const g = x.createLinearGradient(0, cy - fs / 2, 0, cy + fs / 2); g.addColorStop(0, '#fff8d0'); g.addColorStop(1, '#f0b020');
  x.fillStyle = g; x.fillText('WILD', cx, cy);
}
// Letras y números con relleno de colores y grecas en zigzag (estilo nativo)
const RANK = { A: ['A', '#e8401c'], K: ['K', '#2a8ad0'], Q: ['Q', '#9a3ad0'], J: ['J', '#2aa870'], ten: ['10', '#f0c020'], nine: ['9', '#f07a1c'] };
function rankIcon(k, size) {
  return cached('r' + k, size, (x, s) => {
    const [t, col] = RANK[k], fs = s * (t.length > 1 ? 0.62 : 0.78);
    x.font = '900 ' + fs + 'px "Arial Black", Impact, ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    x.lineWidth = s * 0.05; x.strokeStyle = 'rgba(60,30,10,0.8)'; x.strokeText(t, s / 2, s * 0.53, s * 0.9);
    x.fillStyle = col; x.fillText(t, s / 2, s * 0.53, s * 0.9);
    // grecas: bandas claras en zigzag solo sobre la letra
    x.globalCompositeOperation = 'source-atop';
    x.strokeStyle = 'rgba(255,255,255,0.45)'; x.lineWidth = s * 0.025;
    [0.36, 0.72].forEach(v => { x.beginPath(); for (let i = 0; i <= 12; i++) x.lineTo(s * i / 12, s * v + (i % 2 ? -1 : 1) * s * 0.03); x.stroke(); });
    x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(0, s * 0.62, s, s * 0.4);
    x.globalCompositeOperation = 'source-over';
  });
}
function symImg(k, size) {
  if (k === 'wild') return wildIcon(size);
  if (k === 'bonus') return bonusIcon(size);
  if (k === 'gray' || k === 'white' || k === 'black') return portrait(k, size);
  if (k === 'eagle') return onDisc('eagle', size, '#b8d8f0', '#dcecf8');
  if (k === 'bear') return onDisc('bear', size, '#b8e0c0', '#dcf0e0');
  return rankIcon(k, size);
}

export default class Wolf {
  static id = 'wolf';
  static name = 'Carrera del Lobo';
  static music = 'wolf';
  static bonusMusic = 'wolfBonus';
  static sfxTheme = 'wolf';
  static iconStyle = wolfIconStyle;
  static lobby = {
    icons: ['white', 'howl', 'black'], c1: '#c86ad8', c2: '#1c2a1a', mechanic: '40 líneas · wilds apilados · estilo Wolf Run',
    desc: 'Montañas y bosque de pinos con lobos hiperrealistas. Wilds apilados que llenan rodillos, giros gratis con wilds reforzados y 4 progresivos.'
  };
  constructor(app) {
    this.app = app; this.id = Wolf.id;
    this.hint = 'El <b>lobo aullando</b> es WILD y cae <b>apilado</b>. 3 atrapasueños = <b>5 giros gratis</b> con wilds reforzados.';
    this.reels = new ReelSet({ cols: COLS, rows: ROWS, pick: c => pickSym(c, this.inFree), drawSym: (x, s, px, py, w, h, o) => this.drawSym(x, s, px, py, w, h, o) });
    this.freeLeft = 0; this.freeTotal = 0; this.inFree = false; this.fsTotal = 0;
    this.wins = null; this.winT = 0; this.time = 0; this.fullCols = [];
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
    const top = 38;
    const cw = Math.min((W - 30) / COLS, (H - top - 16) / ROWS * 1.15);
    const ch = Math.min(cw * 0.92, (H - top - 16) / ROWS);
    this.cw = cw; this.ch = ch; this.top = top;
    this.gx = (W - cw * COLS) / 2; this.gy = top + (H - top - ch * ROWS) / 2;
    this.reels.layout(this.gx, this.gy, cw, ch);
    this.bgCache = null;
  }
  // Escenario: cielo lila, montañas nevadas, bosque de pinos y marco de madera con tablero crema
  renderBg() {
    const { W, H, gx, gy, cw, ch } = this, dpr = this.app.dpr, L = this.app.light;
    const cnv = makeCanvas(W * dpr, H * dpr), x = cnv.getContext('2d'); x.scale(dpr, dpr);
    let g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, L ? '#f0c8f0' : '#3a1a5a'); g.addColorStop(0.45, L ? '#d8a0d8' : '#7a3a8a'); g.addColorStop(1, L ? '#a8c8a0' : '#142a1a');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // montañas nevadas
    const mount = (y0, amp, col, snow) => {
      x.fillStyle = col; x.beginPath(); x.moveTo(0, H);
      const pts = []; for (let k = 0; k <= 10; k++) { const px = W * k / 10, py = y0 - Math.abs(Math.sin(k * 1.7 + y0)) * amp; pts.push([px, py]); x.lineTo(px, py); }
      x.lineTo(W, H); x.fill();
      if (snow) { x.fillStyle = 'rgba(255,255,255,0.7)'; pts.forEach(([px, py], i) => { if (i && py < y0 - amp * 0.6) { x.beginPath(); x.moveTo(px - W * 0.03, py + amp * 0.18); x.lineTo(px, py); x.lineTo(px + W * 0.03, py + amp * 0.18); x.fill(); } }); }
    };
    mount(H * 0.34, H * 0.16, L ? '#b890c8' : '#5a3a78', true); mount(H * 0.46, H * 0.12, L ? '#9a78b0' : '#3e2a5a', true);
    // pinos
    const pine = (px, base, h, col) => { x.fillStyle = col; for (let i = 0; i < 3; i++) { const w = h * (0.34 - i * 0.07), y = base - h * i * 0.28; x.beginPath(); x.moveTo(px - w, y); x.lineTo(px, y - h * 0.42); x.lineTo(px + w, y); x.fill(); } };
    for (let i = 0; i < 22; i++) pine(W * (i / 21) + rand(-8, 8), H * (0.62 + Math.random() * 0.06), H * rand(0.14, 0.22), L ? '#3a6a3a' : '#0e2a16');
    for (let i = 0; i < 16; i++) pine(W * (i / 15) + rand(-8, 8), H * (0.86 + Math.random() * 0.08), H * rand(0.16, 0.26), L ? '#2a5a2a' : '#081c0e');
    // marco de madera
    const bw = cw * COLS, bh = ch * ROWS;
    roundRect(x, gx - 11, gy - 11, bw + 22, bh + 22, 6);
    g = x.createLinearGradient(0, gy - 11, 0, gy + bh + 11); g.addColorStop(0, '#9a5a24'); g.addColorStop(0.5, '#5e3210'); g.addColorStop(1, '#8a4e1c');
    x.fillStyle = g; x.fill();
    x.strokeStyle = 'rgba(30,14,2,0.45)'; x.lineWidth = 1;
    for (let i = 0; i < 6; i++) { const yy = gy - 11 + (bh + 22) * (i + 0.5) / 6; x.beginPath(); x.moveTo(gx - 11, yy); x.lineTo(gx - 1, yy + 2); x.stroke(); x.beginPath(); x.moveTo(gx + bw + 1, yy); x.lineTo(gx + bw + 11, yy + 2); x.stroke(); }
    x.fillStyle = L ? '#fbf3d8' : '#efe2b8'; x.fillRect(gx, gy, bw, bh);
    x.strokeStyle = 'rgba(110,60,20,0.35)'; x.lineWidth = 1.5;
    for (let c = 1; c < COLS; c++) { x.beginPath(); x.moveTo(gx + c * cw, gy); x.lineTo(gx + c * cw, gy + bh); x.stroke(); }
    // plumas decorativas sobre el marco
    const feather = (px, py, a) => { x.save(); x.translate(px, py); x.rotate(a); const fg = x.createLinearGradient(0, 0, 26, 0); fg.addColorStop(0, '#f4ecd8'); fg.addColorStop(0.7, '#b87a3a'); fg.addColorStop(1, '#3a1a08'); x.fillStyle = fg; x.beginPath(); x.ellipse(13, 0, 14, 4, 0, 0, 7); x.fill(); x.restore(); };
    [[-0.35, -1], [-0.15, -1], [0.15, 1], [0.35, 1]].forEach(([u, d], i) => feather(W / 2 + u * bw, gy - 16, d > 0 ? -0.25 - i * 0.05 : Math.PI + 0.25 + i * 0.05));
    return cnv;
  }
  drawSym(x, s, px, py, w, h, o) {
    if (!s) return;
    if (s.full && o && !o.spinning && this.fullCols.includes(o.c)) return; // el rodillo lleno de WILD se dibuja como una sola figura alta
    const dpr = this.app.dpr, size = Math.min(w, h) * 0.94;
    let sc = 1, a = 1;
    if (o && o.fx) { sc = o.fx.scale || 1; a = o.fx.alpha == null ? 1 : o.fx.alpha; }
    const d = size * sc, cx = px + w / 2, cy = py + h / 2;
    x.globalAlpha = a * (o && o.blur ? 0.75 : 1);
    if (s.k === 'bonus' && !(o && o.blur)) { x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.3 + 0.2 * Math.sin(this.time * 5); x.drawImage(glow('rgba(255,190,60,1)', 64), cx - w * 0.6, cy - h * 0.6, w * 1.2, h * 1.2); x.restore(); x.globalAlpha = a; }
    const img = symImg(s.k, size * dpr);
    if (o && o.blur) x.drawImage(img, cx - d / 2, cy - d * 0.6, d, d * 1.2);
    else x.drawImage(img, cx - d / 2, cy - d / 2, d, d);
    x.globalAlpha = 1;
  }
  // Rodillo lleno de WILD: retrato alto del lobo aullando a la luna
  drawFullWild(x, c) {
    const { gx, gy, cw, ch, time } = this, px = gx + c * cw, h = ch * ROWS;
    x.save(); x.beginPath(); x.rect(px + 2, gy + 2, cw - 4, h - 4); x.clip();
    // recorte vertical centrado en el lobo (~1/3 de la imagen)
    const sw = 200 * (cw / h) * 1.0, sx = Math.max(0, Math.min(200 - sw, 66 - sw / 2));
    sheet(x, 'howl', px + 2, gy + 2, cw - 4, h - 4, sx, 0, sw, 200);
    x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.25 + 0.15 * Math.sin(time * 4 + c);
    x.drawImage(glow('rgba(200,160,255,1)', 64), px - cw * 0.3, gy, cw * 1.6, h);
    x.restore();
    x.strokeStyle = '#f0c040'; x.lineWidth = 3; x.strokeRect(px + 2.5, gy + 2.5, cw - 5, h - 5);
    wildLabel(x, px + cw / 2, gy + h - ch * 0.35, Math.min(22, cw * 0.3));
  }
  update(dt) { this.time += dt; this.reels.update(dt); if (this.wins) this.winT += dt; }
  draw(x) {
    if (!this.W) return;
    const { gx, gy, cw, W } = this, bw = cw * COLS;
    if (!this.bgCache) this.bgCache = this.renderBg();
    x.drawImage(this.bgCache, 0, 0, W, this.H);
    const title = this.inFree ? 'GIRO GRATIS ' + this.freeCount + ' · WILDS REFORZADOS' : 'CARRERA DEL LOBO · 40 LÍNEAS';
    goldText(x, title, W / 2, gy - this.top / 2 - 6, Math.min(15, bw * 0.045), { maxW: bw * 0.92, colors: ['#fff8d0', '#ffe08a', '#e8a020', '#fff0b0'], stroke: '#3a1800' });
    this.reels.draw(x, (c, r) => this.cellFx(c, r));
    this.fullCols.forEach(c => { if (this.reels.columns[c].state === 'idle') this.drawFullWild(x, c); });
    if (this.wins) this.drawWins(x);
  }
  cellFx(c, r) {
    if (!this.wins || !this.wins.length) return null;
    const w = this.wins[Math.floor(this.winT / 1.1) % this.wins.length];
    return w.line.slice(0, w.n).some((rr, cc) => cc === c && rr === r) ? { scale: 1 + 0.07 * Math.sin(this.winT * 11) } : { alpha: 0.45 };
  }
  drawWins(x) {
    const w = this.wins[Math.floor(this.winT / 1.1) % this.wins.length], { gx, gy, cw, ch } = this;
    x.save(); x.globalCompositeOperation = this.app.light ? 'source-over' : 'lighter'; x.lineJoin = 'round';
    x.beginPath(); w.line.forEach((r, c) => { const px = gx + c * cw + cw / 2, py = gy + r * ch + ch / 2; c ? x.lineTo(px, py) : x.moveTo(gx - 6, py); });
    x.lineTo(gx + cw * COLS + 6, gy + w.line[COLS - 1] * ch + ch / 2);
    x.strokeStyle = 'rgba(200,60,20,0.5)'; x.lineWidth = 11; x.stroke(); x.strokeStyle = '#fff2b0'; x.lineWidth = 3; x.stroke();
    x.restore();
    goldText(x, this.app.fmt(w.win), gx + cw * 2.5, gy + ch * 2, Math.min(36, cw * 0.42), { glowColor: '#ff8a2e' });
  }
  cellCenter(c, r) { return [this.gx + c * this.cw + this.cw / 2, this.gy + r * this.ch + this.ch / 2]; }

  async play(bet) {
    const app = this.app, sfx = app.sfx, lineBet = bet / 40;
    this.wins = null; this.fullCols = [];
    const free = this.freeLeft > 0;
    if (free) this.freeLeft--;
    app.setSpinLabel(free ? 'GRATIS' : 'PARAR', free ? this.freeCount.toLowerCase() : '');
    const final = [];
    for (let c = 0; c < COLS; c++) final.push(makeColumn(c, this.inFree));
    if (app._forceScat) { app._forceScat = 0; [1, 2, 3].forEach(c => { final[c][1] = { k: 'bonus' }; if (final[c][0].full) final[c] = final[c].map((s, r) => r === 1 ? { k: 'bonus' } : { k: 'nine' }); }); }
    if (app._forceFull) { const n = app._forceFull; app._forceFull = 0; for (let c = 0; c < n; c++) final[c] = Array.from({ length: ROWS }, () => ({ k: 'wild', full: true })); }
    // Suspenso si ya hay 2 BONUS en los rodillos 2 y 3
    let anticFrom = -1;
    if (final[1].some(s => s.k === 'bonus') && final[2].some(s => s.k === 'bonus')) anticFrom = 3;
    sfx.spinStart(app.speed >= 2);
    this.reels.start(app.speed);
    let full = 0;
    await this.reels.stopTo(final, {
      anticFrom,
      onStop: (c, last) => {
        sfx.reelStop(c, last);
        if (anticFrom >= 0) sfx.anticipation(!last && c >= 2);
        if (final[c][0].full) {
          full++; this.fullCols.push(c);
          const [px, py] = this.cellCenter(c, 1.5);
          sfx.howl(0, 0.2, 300 + full * 30); app.burst(px, py, 22, { type: 'spark', color: '#d8b0ff', speed: 320, size: 12 }); app.flash('#e8d0ff', 0.2);
        }
        final[c].forEach((s, r) => { if (s.k === 'bonus') { const [px, py] = this.cellCenter(c, r); sfx.bell(784 + c * 110, 0.9, 0.12); app.burst(px, py, 14, { type: 'spark', color: '#ffd24a', speed: 240, size: 10 }); } });
      }
    });
    sfx.anticipation(false);
    const wins = evalLines(final, lineBet);
    let total = wins.reduce((a, w) => a + w.win, 0);
    if (wins.length) {
      this.wins = wins; this.winT = 0;
      sfx.win(total >= bet * 5 ? 2 : 0); app.addWin(total);
      app.flyCoins(this.gx + this.cw * 2.5, this.gy + this.ch * 2, Math.min(14, 3 + wins.length * 2));
      app.message('Premio en ' + wins.length + ' línea' + (wins.length > 1 ? 's' : '') + ': <b>' + app.fmt(total) + '</b>' + (full ? ' · ' + full + ' rodillo' + (full > 1 ? 's' : '') + ' WILD' : ''));
      await app.wait(Math.min(2000, 700 + wins.length * 200));
    } else if (!this.inFree) app.message(this.hint);
    // Progresivos por rodillos llenos de WILD a la vez
    const jp = JP_BY_FULL(full);
    if (jp) { await app.wait(300); total += await app.awardJackpot(jp); }
    if (this.inFree) this.fsTotal += total;
    // Atrapasueños: 3 = 5 giros gratis (+5 si se repiten)
    const bonus = final.flat().filter(s => s.k === 'bonus').length;
    if (bonus >= 3) {
      await app.wait(500); this.wins = null;
      sfx.featureStart(); app.flash('#ffd27a', 0.5); app.shake(true);
      if (this.inFree) { this.freeLeft += 5; this.freeTotal += 5; await app.banner('+5 GIROS', 'Los atrapasueños vuelven a girar', { color: '#ffb03a', ms: 1800 }); }
      else await this.startFree();
    }
    const celebrated = this.inFree;
    if (this.inFree && this.freeLeft === 0 && free) {
      await app.wait(400);
      const fs = this.fsTotal;
      this.inFree = false; this.wins = null;
      if (fs > 0) await app.celebrate(fs, bet, 'CARRERA DEL LOBO');
      sfx.stopMusic(); sfx.music(Wolf.music);
      app.message('Giros gratis: <b>' + app.fmt(fs) + '</b>');
    }
    app.setSpinLabel(this.freeLeft ? 'GRATIS' : 'GIRAR', this.freeLeft ? (this.freeTotal - this.freeLeft + 1) + ' de ' + this.freeTotal : '');
    return { win: total, celebrated };
  }
  async startFree() {
    const app = this.app, sfx = app.sfx;
    this.inFree = true; this.freeLeft = 5; this.freeTotal = 5; this.fsTotal = 0;
    sfx.stopMusic();
    await app.banner('5 GIROS GRATIS', 'Wilds apilados reforzados · 3 atrapasueños = +5', { color: '#ff9a2e', ms: 2400 });
    sfx.music(Wolf.bonusMusic);
    app.setSpinLabel('GRATIS', '1 de ' + this.freeTotal);
  }
  async buyFree() { this.app.sfx.featureStart(); await this.startFree(); return { win: 0, celebrated: true }; }
  slam() { this.reels.slam(); }
  info(bet, fmt) {
    const lb = bet / 40, img = k => '<img class="ico" src="' + symImg(k, 96).toDataURL('image/png') + '" alt="">';
    return '<h3>Cómo se juega</h3><ul><li><b>5 rodillos × 4 filas, 40 líneas</b>. Pagan 3+ iguales desde la izquierda.</li>' +
      '<li><b>Lobo aullando = WILD</b>: sustituye a todo menos el BONUS y cae <b>apilado</b>. Puede <b>llenar un rodillo entero</b>.</li>' +
      '<li>Los lobos y tótems también caen en <b>pilas</b> de 2 a 4.</li>' +
      '<li><b>Progresivos</b>: rodillos llenos de WILD a la vez · <b>2 = MINI · 3 = MINOR · 4 = MAJOR · 5 = GRAND</b>.</li>' +
      '<li><b>3 atrapasueños BONUS</b> (solo en los rodillos 2, 3 y 4) = <b>5 giros gratis</b> con <b>wilds apilados reforzados</b> en los rodillos 2 a 5. Si vuelven a salir 3 se suman <b>+5</b>.</li>' +
      '<li><b>BONO</b>: compra los giros gratis por 50× la apuesta.</li></ul>' +
      '<h3>Pagos por línea (apuesta ' + fmt(bet) + ') · 3 / 4 / 5</h3><table>' +
      Object.keys(PAY).map(k => '<tr><td>' + img(k) + '</td><td>' + NAMES[k] + '</td><td>' + [3, 4, 5].map(n => fmt(PAY[k][n] * SCALE * lb)).join(' · ') + '</td></tr>').join('') + '</table>';
  }
}
