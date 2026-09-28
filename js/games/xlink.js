// XTENSION LINK · STARS UP
// Base: 5x3, 20 líneas. Las estrellas abren filas extra (verde +1, azul +2, roja +3) para ese giro,
// hasta 8 filas y 100 líneas. 6+ bolas doradas activan GOLDEN SPINS: las bolas quedan fijas,
// 3 giros que se reinician con cada bola nueva y filas que se desbloquean con rayos al
// acumular 8 · 12 · 17 · 23 · 30 bolas. Tablero lleno (40) = GRAND.
import { S, sym, ball, jackpotBall, specialIcon, spriteURL, bolt, electricRing, glow, goldText, roundRect, ease, rand, makeCanvas, FONT } from '../gfx.js?v=27';
import { ReelSet, LINES_5x3, weighted } from '../reels.js?v=27';

const COLS = 5, MAXR = 8, BASE_R = 3;
const THRESH = [8, 12, 17, 23, 30];
// Pago por línea (en apuestas por línea = apuesta/20)
export const PAY = {
  s7r: [0, 0, 0, 50, 200, 1000], s7b: [0, 0, 0, 30, 120, 500], bar: [0, 0, 0, 20, 70, 250],
  bell: [0, 0, 0, 15, 50, 200], melon: [0, 0, 0, 12, 40, 160], grapes: [0, 0, 0, 12, 40, 160],
  plum: [0, 0, 0, 8, 25, 100], orange: [0, 0, 0, 8, 25, 100], cherry: [0, 0, 2, 5, 20, 80]
};
const W_BASE = { s7r: 3, s7b: 4, bar: 5, bell: 7, melon: 8, grapes: 8, plum: 11, orange: 11, cherry: 12, ball: 6.15, g1: 1.1, g2: 0.6, g3: 0.3 };
const W_UP = Object.assign({}, W_BASE, { g1: 0, g2: 0, g3: 0, ball: 7.5 });
const VALS = [0.5, 1, 1.5, 2, 2.5, 4, 5, 8, 10, 25];
const VAL_W = [26, 22, 16, 10, 9, 6, 4, 2.5, 1.5, 0.3];
const JP_W = { mini: 2.2, minor: 0.8, major: 0.12, grand: 0.01 };
const ICON = { s7r: S.SEVEN, s7b: S.SEVEN, bell: S.BELL, melon: S.MELON, grapes: S.GRAPES, plum: S.PLUM, orange: S.ORANGE, cherry: S.CHERRY, g1: S.GSTAR, g2: S.BSTAR, g3: S.RSTAR };

// Líneas para N filas: los 20 patrones base desplazados por bandas (máx. 100)
const lineCache = {};
export function linesFor(rows) {
  if (lineCache[rows]) return lineCache[rows];
  const seen = new Set(), out = [];
  for (let b = rows - 3; b >= 0 && out.length < 100; b--) for (const L of LINES_5x3) {
    const l = L.map(r => r + b), k = l.join(); if (!seen.has(k) && out.length < 100) { seen.add(k); out.push(l); }
  }
  return (lineCache[rows] = out);
}

// Probabilidades de especiales dentro de Golden Spins (por bola que cae)
// Probabilidad de BONO SORPRESA por giro pagado
export const MYSTERY_P = 1 / 110;
export const SPECIAL_W = { extra: 0.05, launch: 0.07, upgrade: 0.055 };
// Bolas de giros extra: +1 … +5 (las más altas son más raras)
const EXTRA_N = [1, 2, 3, 4, 5], EXTRA_W = [38, 28, 18, 10, 6];
// jpBoost > 1 aumenta la chance de jackpot (bolas lanzadas por el Multiplicador)
export function makeBall(bet, inBonus, jpBoost = 1, noSpecial = false) {
  const r = Math.random() * 100;
  let acc = 0;
  for (const k in JP_W) {
    acc += JP_W[k] * jpBoost;
    if (r < acc) { const m = [1, 2, 3, 5][Math.random() * 4 | 0]; return { ball: true, jp: k, mult: m, value: m * bet }; }
  }
  if (inBonus && !noSpecial) {
    const q = Math.random();
    // Las especiales no tienen valor: entregan su efecto y desaparecen del tablero
    if (q < SPECIAL_W.extra) {
      let x = Math.random() * EXTRA_W.reduce((a, w) => a + w, 0), i = 0;
      while (i < EXTRA_N.length - 1 && (x -= EXTRA_W[i]) >= 0) i++;
      return { ball: true, extra: EXTRA_N[i], mult: 0, value: 0 };
    }
    if (q < SPECIAL_W.extra + SPECIAL_W.launch) return { ball: true, special: 'launch', mult: 0, value: 0 };
    if (q < SPECIAL_W.extra + SPECIAL_W.launch + SPECIAL_W.upgrade) return { ball: true, special: 'upgrade', mult: 0, value: 0 };
  }
  let t = 0; VAL_W.forEach(w => t += w);
  let x = Math.random() * t, i = 0;
  for (; i < VALS.length; i++) { x -= VAL_W[i]; if (x < 0) break; }
  const m = VALS[Math.min(i, VALS.length - 1)];
  return { ball: true, mult: m, value: m * bet };
}
function pickSym(w, bet) {
  const k = weighted(w);
  if (k === 'ball') return makeBall(bet, false);
  if (k[0] === 'g') return { k, star: +k[1] };
  return { k };
}
// Evalúa líneas sobre una cuadrícula [col][fila] (fila 0 = arriba)
export function evalLines(grid, rows, lineBet) {
  const wins = [];
  linesFor(rows).forEach((L, li) => {
    const first = grid[0][L[0]];
    if (!first || !first.k || !PAY[first.k]) return;
    let n = 1;
    while (n < COLS && grid[n][L[n]] && grid[n][L[n]].k === first.k) n++;
    const p = PAY[first.k][n];
    if (p) wins.push({ line: L, li, n, k: first.k, win: p * lineBet });
  });
  return wins;
}

export default class XLink {
  static id = 'xlink';
  static name = 'Xtension Link';
  static music = 'disco';
  static lobby = {
    icons: [S.SEVEN, S.RSTAR, S.MELON], c1: '#ff9d1c', c2: '#5a1580', mechanic: 'Filas que se expanden + Golden Spins',
    desc: 'Estrellas abren hasta 5 filas extra (100 líneas). 6 bolas = Golden Spins con rayos y 4 jackpots.'
  };

  constructor(app) {
    this.app = app;
    this.id = XLink.id;
    this.hint = '6 bolas doradas activan <b>GOLDEN SPINS</b>. Las ★ abren filas extra.';
    const drawSym = (x, s, px, py, w, h, o) => this.drawSym(x, s, px, py, w, h, o);
    this.base = new ReelSet({ cols: COLS, rows: BASE_R, pick: () => pickSym(W_BASE, app.bet), drawSym });
    this.upper = new ReelSet({ cols: COLS, rows: 5, pick: () => pickSym(W_UP, app.bet), drawSym });
    this.expand = 0;         // filas superiores activas en el juego base
    this.glass = [1, 1, 1, 1, 1]; // opacidad del vidrio por fila superior (0 = arriba)
    this.bonus = null;
    this.wins = null; this.winT = 0;
    this.time = 0;
    this.bolts = [];
    this.extra = {
      label: 'BONO', sub: b => app.fmt(b * 60),
      cost: b => b * 60, run: b => this.buyBonus(b)
    };
  }
  get animating() { return this.base.spinning || this.upper.spinning || !!this.bonus || this.bolts.length > 0 || !!this.wins; }
  get locked() { return !!this.bonus; }

  resize(W, H) {
    this.W = W; this.H = H;
    const top = 6, bottom = 6;
    const rail = Math.max(30, Math.min(56, W * 0.1));
    let cw = (W - rail * 2 - 8) / COLS;
    let ch = (H - top - bottom) / MAXR;
    ch = Math.min(ch, cw * 0.95);
    cw = Math.min(cw, ch * 1.25);
    this.cw = cw; this.ch = ch;
    this.bx = (W - cw * COLS) / 2; this.by = top + (H - top - bottom - ch * MAXR) / 2;
    this.rail = rail;
    this.bgCache = null; this.glassImg = null;
    this.base.layout(this.bx, this.by + ch * 5, cw, ch);
    this.upper.layout(this.bx, this.by, cw, ch);
  }

  // Fondo estático pre-renderizado (se regenera solo al cambiar tamaño)
  renderBg() {
    const { bx, by, cw, ch, W, H } = this, dpr = this.app.dpr;
    const c = makeCanvas(W * dpr, H * dpr), x = c.getContext('2d');
    x.scale(dpr, dpr);
    const bw = cw * COLS, bh = ch * MAXR, fr = 7;
    let g = x.createLinearGradient(0, by - fr, 0, by + bh + fr);
    g.addColorStop(0, '#ffcf6a'); g.addColorStop(0.5, '#d47a12'); g.addColorStop(1, '#ffc14d');
    roundRect(x, bx - fr, by - fr, bw + fr * 2, bh + fr * 2, 12); x.fillStyle = g; x.fill();
    const L = this.app.light;
    g = x.createLinearGradient(0, by, 0, by + bh);
    if (L) { g.addColorStop(0, '#f6f1ff'); g.addColorStop(0.62, '#e6dcfb'); g.addColorStop(1, '#d9ccf6'); }
    else { g.addColorStop(0, '#1b1566'); g.addColorStop(0.62, '#2b0f5c'); g.addColorStop(1, '#3a0d6a'); }
    x.fillStyle = g; x.fillRect(bx, by, bw, bh);
    x.strokeStyle = L ? 'rgba(120,80,200,0.35)' : 'rgba(80,190,255,0.35)'; x.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) { x.beginPath(); x.moveTo(bx + i * cw, by); x.lineTo(bx + i * cw, by + bh); x.stroke(); }
    for (let r = 0; r <= MAXR; r++) { x.beginPath(); x.moveTo(bx, by + r * ch); x.lineTo(bx + bw, by + r * ch); x.stroke(); }
    return c;
  }
  renderGlass() {
    const { cw, ch } = this, dpr = this.app.dpr;
    const c = makeCanvas(cw * COLS * dpr, ch * dpr), x = c.getContext('2d');
    x.scale(dpr, dpr);
    const g = x.createLinearGradient(0, 0, 0, ch);
    if (this.app.light) { g.addColorStop(0, 'rgba(205,195,245,0.86)'); g.addColorStop(1, 'rgba(180,165,235,0.9)'); }
    else { g.addColorStop(0, 'rgba(40,40,110,0.82)'); g.addColorStop(1, 'rgba(25,20,80,0.88)'); }
    x.fillStyle = g; x.fillRect(0, 0, cw * COLS, ch);
    for (let i = 0; i < COLS; i++) {
      const cx = i * cw + cw * 0.72, lg = x.createLinearGradient(cx - cw * 0.12, 0, cx + cw * 0.12, 0);
      lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(200,210,255,0.22)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = lg; x.fillRect(cx - cw * 0.12, 0, cw * 0.24, ch);
    }
    return c;
  }

  // ---------- Dibujo de símbolos ----------
  barSprite(size) {
    const key = size;
    this._bar = this._bar || {};
    if (this._bar[key]) return this._bar[key];
    const c = makeCanvas(size, size), x = c.getContext('2d'), m = size * 0.1;
    const g = x.createLinearGradient(0, m, 0, size - m);
    g.addColorStop(0, '#6d3fd0'); g.addColorStop(0.5, '#2a0f63'); g.addColorStop(1, '#5a2fb8');
    roundRect(x, m, size * 0.2, size - 2 * m, size * 0.6, size * 0.08); x.fillStyle = g; x.fill();
    x.lineWidth = size * 0.035; x.strokeStyle = '#d7c2ff'; x.stroke();
    x.font = '900 ' + size * 0.22 + 'px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle';
    ['BAR', 'BAR'].forEach((t, i) => {
      const y = size * (0.36 + i * 0.28);
      x.lineWidth = size * 0.04; x.strokeStyle = '#12052e'; x.strokeText(t, size / 2, y);
      const tg = x.createLinearGradient(0, y - size * 0.1, 0, y + size * 0.1);
      tg.addColorStop(0, '#ffffff'); tg.addColorStop(1, '#b9a4ff'); x.fillStyle = tg; x.fillText(t, size / 2, y);
    });
    return (this._bar[key] = c);
  }
  ballImg(s, size) {
    if (s.special) return specialIcon(s.special, size);
    if (s.jp) return s.value ? jackpotBall(s.jp, short(s.value), size) : ball({ mini: 'green', minor: 'cyan', major: 'purple', grand: 'red' }[s.jp], s.jp.toUpperCase(), size);
    if (s.extra) return ball('blue', '+' + s.extra, size, s.extra > 1 ? 'GIROS' : 'GIRO');
    return ball('gold', short(s.value), size);
  }
  drawSym(x, s, px, py, w, h, o) {
    if (!s) return;
    const dpr = this.app.dpr, size = Math.min(w, h) * (s.ball ? 1.02 : 0.86);
    let sc = 1, alpha = 1;
    if (o && o.fx) { sc = o.fx.scale || 1; alpha = o.fx.alpha == null ? 1 : o.fx.alpha; }
    const d = size * sc, cx = px + w / 2, cy = py + h / 2;
    x.globalAlpha = alpha;
    let img;
    if (s.ball) img = this.ballImg(s, size * dpr);
    else if (s.k === 'bar') img = this.barSprite(Math.round(size * dpr));
    else img = sym(ICON[s.k], size * dpr, o && o.blur ? 'b' : s.k === 's7b' ? 'blue' : 'n');
    if (o && o.blur && !s.ball && s.k !== 'bar') {
      if (s.k === 's7b') img = sym(ICON[s.k], size * dpr, 'b');
      x.drawImage(img, cx - d / 2, cy - d * 0.675, d, d * 1.35);
    } else x.drawImage(img, cx - d / 2, cy - d / 2, d, d);
    x.globalAlpha = 1;
  }

  // ---------- Bucle ----------
  update(dt) {
    this.time += dt;
    this.base.update(dt); this.upper.update(dt);
    for (let i = this.bolts.length - 1; i >= 0; i--) { this.bolts[i].t += dt; if (this.bolts[i].t > this.bolts[i].life) this.bolts.splice(i, 1); }
    if (this.wins) this.winT += dt;
    // Vidrio de filas superiores
    for (let i = 0; i < 5; i++) {
      const open = this.bonus ? i >= MAXR - this.bonus.rows : i >= 5 - this.expand;
      const tgt = open ? 0 : 1;
      this.glass[i] += (tgt - this.glass[i]) * Math.min(1, dt * 5);
    }
  }

  draw(x) {
    if (!this.W) return; // aún sin medidas (primer cuadro)
    const { bx, by, cw, ch, W, H, time } = this;
    const bw = cw * COLS, bh = ch * MAXR;
    if (!this.bgCache) this.bgCache = this.renderBg();
    x.drawImage(this.bgCache, 0, 0, W, H);
    if (this.bonus) this.drawBonus(x);
    else {
      this.upper.draw(x, (c, r) => this.cellFx(c, r + 5 - 5, true));
      this.base.draw(x, (c, r) => this.cellFx(c, r, false));
    }
    this.drawGlass(x);
    // Marco de área activa
    const act = this.bonus ? this.bonus.rows : BASE_R + this.expand;
    const ay = by + (MAXR - act) * ch;
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = this.bonus ? 'rgba(120,220,255,0.9)' : 'rgba(90,200,255,0.75)'; x.lineWidth = 3;
    x.strokeRect(bx + 1.5, ay + 1.5, bw - 3, act * ch - 3);
    x.globalAlpha = 0.3 + 0.2 * Math.sin(time * 4); x.lineWidth = 8; x.strokeRect(bx, ay, bw, act * ch);
    x.restore();
    if (this.wins) this.drawWins(x);
    this.drawRails(x);
    // Rayos activos
    this.bolts.forEach(b => {
      const a = 1 - b.t / b.life;
      if (Math.random() < 0.8) bolt(x, b.x1, b.y1, b.x2, b.y2, b.w || 2.2, b.color || '#86e8ff', a);
    });
    if (this.base.anticipating) {
      x.save(); x.globalCompositeOperation = 'lighter';
      this.base.columns.forEach((col, c) => {
        if (!col.antic || col.state === 'idle' || col.state === 'bounce') return;
        const px = bx + c * cw;
        x.globalAlpha = 0.5 + 0.3 * Math.sin(time * 18);
        x.drawImage(glow('rgba(255,190,40,0.9)', 64), px - cw * 0.3, this.base.y - ch * 0.3, cw * 1.6, ch * 3.6);
        if (Math.random() < 0.5) bolt(x, px, this.base.y, px + cw, this.base.y + ch * 3, 1.5, '#ffd76a', 0.8, false);
      });
      x.restore();
    }
  }

  cellFx(c, r, upper) {
    if (!this.wins || !this.wins.length) return null;
    const w = this.wins[Math.floor(this.winT / 1.1) % this.wins.length];
    const row = upper ? r : r + 5;
    const on = w.cells.some(([cc, rr]) => cc === c && rr === row);
    return on ? { scale: 1 + 0.08 * Math.sin(this.winT * 10) } : { alpha: 0.45 };
  }

  drawWins(x) {
    const w = this.wins[Math.floor(this.winT / 1.1) % this.wins.length];
    if (!w || !w.cells) return;
    const { bx, by, cw, ch } = this;
    x.save(); x.globalCompositeOperation = 'lighter'; x.lineJoin = 'round'; x.lineCap = 'round';
    x.beginPath();
    w.line.forEach((rr, c) => { const px = bx + c * cw + cw / 2, py = by + rr * ch + ch / 2; c ? x.lineTo(px, py) : x.moveTo(px - cw / 2, py); });
    x.lineTo(bx + COLS * cw, by + w.line[COLS - 1] * ch + ch / 2);
    x.strokeStyle = 'rgba(255,210,80,0.35)'; x.lineWidth = 12; x.stroke();
    x.strokeStyle = '#fff3b0'; x.lineWidth = 3; x.stroke();
    w.cells.forEach(([c, r]) => { x.strokeStyle = '#ffe27a'; x.lineWidth = 3; x.strokeRect(bx + c * cw + 3, by + r * ch + 3, cw - 6, ch - 6); });
    x.restore();
    if (w.win) goldText(x, this.app.fmt(w.win), bx + cw * 2.5, by + (w.line[2] + 0.5) * ch, Math.min(34, cw * 0.5));
  }

  drawGlass(x) {
    const { bx, by, cw, ch, time } = this;
    for (let i = 0; i < 5; i++) {
      const a = this.glass[i];
      if (a < 0.02) continue;
      if (!this.glassImg) this.glassImg = this.renderGlass();
      x.globalAlpha = a;
      x.drawImage(this.glassImg, bx, by + i * ch, cw * COLS, ch);
      x.globalAlpha = 1;
    }
    // Reflejo que recorre el vidrio
    const locked = this.glass.filter(v => v > 0.5).length;
    if (locked) {
      x.save(); x.beginPath(); x.rect(bx, by, cw * COLS, ch * locked); x.clip();
      const sx = bx + ((time * 90) % (cw * COLS * 2.2)) - cw * 1.2;
      x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.18;
      x.fillStyle = '#b8c8ff';
      x.beginPath(); x.moveTo(sx, by); x.lineTo(sx + cw * 0.6, by); x.lineTo(sx - cw * 0.8, by + ch * locked); x.lineTo(sx - cw * 1.4, by + ch * locked); x.fill();
      x.restore();
    }
  }

  drawRails(x) {
    const { bx, by, cw, ch, rail, time } = this;
    const b = this.bonus, count = b ? b.count : 0;
    const lx = bx - 7 - rail / 2 - 1;
    // Marcadores de umbral (filas 4..8 desde abajo)
    THRESH.forEach((t, i) => {
      const row = MAXR - 4 - i, cy = by + row * ch + ch / 2;
      const reached = b && b.rows >= 4 + i;
      const next = b && !reached && (i === 0 || b.rows >= 3 + i);
      const w = Math.min(rail - 6, 40), h = Math.min(ch * 0.62, 30);
      roundRect(x, lx - w / 2, cy - h / 2, w, h, 6);
      const g = x.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
      if (next) { g.addColorStop(0, '#ff5a4a'); g.addColorStop(1, '#8b0c0c'); }
      else if (reached) { g.addColorStop(0, '#ffe68a'); g.addColorStop(1, '#b8740e'); }
      else { g.addColorStop(0, '#3b3446'); g.addColorStop(1, '#141019'); }
      x.fillStyle = g; x.fill();
      x.lineWidth = 1.5; x.strokeStyle = next ? '#ffd0c0' : '#8a7a5c'; x.stroke();
      x.font = '900 ' + Math.min(16, h * 0.6) + 'px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = reached ? '#3a1d00' : '#fff'; x.fillText(String(t), lx, cy + 1);
      if (next) { x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.4 + 0.3 * Math.sin(time * 6); x.drawImage(glow('rgba(255,80,60,0.9)', 64), lx - w, cy - h, w * 2, h * 2); x.restore(); }
    });
    // Orbe ACUMULADOS
    const oy = by + (MAXR - 1.5) * ch, orr = Math.min(rail * 0.46, ch * 0.7);
    let g = x.createRadialGradient(lx - orr * 0.3, oy - orr * 0.4, 1, lx, oy, orr);
    g.addColorStop(0, '#ffb0b0'); g.addColorStop(0.35, '#e0242c'); g.addColorStop(1, '#4a0205');
    x.fillStyle = g; x.beginPath(); x.arc(lx, oy, orr, 0, 7); x.fill();
    x.lineWidth = 2; x.strokeStyle = '#ffd7a0'; x.stroke();
    x.fillStyle = '#fff'; x.font = '900 ' + orr * 0.8 + 'px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(String(count), lx, oy - orr * 0.1, orr * 1.6);
    x.font = '800 ' + Math.max(7, orr * 0.3) + 'px ' + FONT; x.fillText('BOLAS', lx, oy + orr * 0.55, orr * 1.5);
    this.orb = [lx, oy];
    // Caja GIROS RESTANTES
    const rx = bx + cw * COLS + 7 + rail / 2 + 1, ry = by + (MAXR - 1.5) * ch;
    const bw2 = Math.min(rail - 4, 48), bh2 = Math.min(ch * 1.3, 64);
    roundRect(x, rx - bw2 / 2, ry - bh2 / 2, bw2, bh2, 8);
    g = x.createLinearGradient(0, ry - bh2 / 2, 0, ry + bh2 / 2); g.addColorStop(0, '#2f7bff'); g.addColorStop(1, '#0a2a8a');
    x.fillStyle = g; x.fill(); x.lineWidth = 2; x.strokeStyle = '#bfe0ff'; x.stroke();
    x.fillStyle = '#fff'; x.font = '900 ' + bh2 * 0.45 + 'px ' + FONT;
    x.fillText(String(b ? b.spins : 0), rx, ry - bh2 * 0.1, bw2 * 0.9);
    x.font = '800 ' + Math.max(7, bh2 * 0.14) + 'px ' + FONT;
    x.fillText('GIROS', rx, ry + bh2 * 0.3, bw2 * 0.9);
    if (b && b.spinsFlash > 0) { x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = b.spinsFlash; x.drawImage(glow('rgba(90,170,255,1)', 64), rx - bw2, ry - bh2, bw2 * 2, bh2 * 2); x.restore(); b.spinsFlash -= 0.03; }
    this.spinBox = [rx, ry];
  }

  // ---------- Juego base ----------
  cellCenter(c, row) { return [this.bx + c * this.cw + this.cw / 2, this.by + row * this.ch + this.ch / 2]; }

  async play(bet) {
    const app = this.app, sfx = app.sfx;
    this.wins = null; this.expand = 0;
    const final = [];
    for (let c = 0; c < COLS; c++) { final.push([]); for (let r = 0; r < BASE_R; r++) final[c].push(pickSym(W_BASE, bet)); }
    // Suspenso: si los primeros rodillos ya traen 4+ bolas
    let anticFrom = -1, acc = 0;
    for (let c = 0; c < COLS - 1; c++) { acc += final[c].filter(s => s.ball).length; if (acc >= 4 && anticFrom < 0) anticFrom = c + 1; }
    sfx.spinStart(app.speed >= 2);
    app.setSpinLabel('PARAR');
    this.base.start(app.speed);
    let landed = 0;
    await this.base.stopTo(final, {
      anticFrom,
      onStop: (c, last) => {
        sfx.reelStop(c, last);
        if (this.base.anticipating) sfx.anticipation(true);
        final[c].forEach((s, r) => {
          const [px, py] = this.cellCenter(c, r + 5);
          if (s.ball) { sfx.ballLand(landed++); app.burst(px, py, 10, { color: '#ffd76a', speed: 220, size: 8 }); }
          if (s.star) { app.burst(px, py, 12, { color: ['', '#6cff8a', '#6cc8ff', '#ff6a6a'][s.star], speed: 260, size: 9 }); sfx.tone(880 + s.star * 220, 0.3, { type: 'triangle', vol: 0.1 }); }
        });
        if (last) sfx.anticipation(false);
      }
    });
    sfx.anticipation(false);
    // Expansión por estrellas
    const stars = final.flat().reduce((a, s) => a + (s.star || 0), 0);
    let grid = final.map(col => col.slice());
    if (stars > 0) {
      const k = Math.min(5, stars);
      await app.wait(250);
      final.forEach((col, c) => col.forEach((s, r) => {
        if (!s.star) return;
        const [x1, y1] = this.cellCenter(c, r + 5), [x2, y2] = this.cellCenter(c, 5 - k);
        this.bolts.push({ x1, y1, x2, y2, t: 0, life: 0.9, w: 2.4 });
      }));
      sfx.rowUnlock(k);
      app.flash('#9fe8ff', 0.35); app.shake(false);
      this.expand = k;
      app.message('¡Estrellas! <b>+' + k + ' fila' + (k > 1 ? 's' : '') + '</b> · ' + linesFor(BASE_R + k).length + ' líneas');
      for (let i = 0; i < k; i++) { const [px, py] = this.cellCenter(2, 4 - i); app.burst(px, py, 18, { type: 'shard', color: '#bfe6ff', speed: 300, size: 7, g: 500 }); }
      await app.wait(400);
      const up = [];
      for (let c = 0; c < COLS; c++) { up.push([]); for (let r = 0; r < 5; r++) up[c].push(pickSym(W_UP, bet)); }
      sfx.spinStart(app.speed >= 2);
      this.upper.start(app.speed);
      await this.upper.stopTo(up, {
        onStop: (c, last) => {
          sfx.reelStop(c, last);
          up[c].forEach((s, r) => { if (s.ball && r >= 5 - k) { sfx.ballLand(landed++); const [px, py] = this.cellCenter(c, r); app.burst(px, py, 10, { color: '#ffd76a', speed: 220, size: 8 }); } });
        }
      });
      grid = up.map((col, c) => col.slice(5 - k).concat(final[c]));
    }
    const rows = BASE_R + this.expand;
    // Premios de líneas
    const lineBet = bet / 20;
    const wins = evalLines(grid, rows, lineBet);
    let total = 0;
    const off = MAXR - rows;
    if (wins.length) {
      total = wins.reduce((a, w) => a + w.win, 0);
      this.wins = wins.map(w => ({ line: w.line.map(r => r + off), win: w.win, cells: w.line.slice(0, w.n).map((r, c) => [c, r + off]) }));
      this.winT = 0;
      sfx.win(total >= bet * 5 ? 2 : 0);
      app.addWin(total);
      app.message('Premio en ' + wins.length + ' línea' + (wins.length > 1 ? 's' : '') + ': <b>' + app.fmt(total) + '</b>');
      const [px, py] = this.cellCenter(2, MAXR - 2);
      app.flyCoins(px, py, Math.min(14, 4 + wins.length * 2));
    } else if (stars === 0) app.message(this.hint);
    // Bolas en área activa
    const balls = [];
    grid.forEach((col, c) => col.forEach((s, r) => { if (s.ball) balls.push({ c, row: r + off, s }); }));
    // BONO SORPRESA: rayos convierten casillas en bolas hasta completar 6
    if (balls.length < 6 && (Math.random() < MYSTERY_P || app._forceMystery)) {
      app._forceMystery = false;
      await app.wait(wins.length ? 900 : 300);
      this.wins = null;
      await app.mysteryIntro('Los rayos traen bolas doradas');
      const free = [];
      for (let c = 0; c < COLS; c++) for (let r = 0; r < BASE_R; r++) if (!final[c][r].ball) free.push([c, r]);
      for (let i = free.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [free[i], free[j]] = [free[j], free[i]]; }
      while (balls.length < 6 && free.length) {
        const [c, r] = free.pop(), sb = makeBall(bet, false);
        this.base.setCell(c, r, sb); final[c][r] = sb;
        balls.push({ c, row: r + 5, s: sb });
        const [px, py] = this.cellCenter(c, r + 5);
        app.strike(px, py); sfx.ballLand(balls.length);
        await app.wait(280);
      }
      await app.wait(400);
    }
    if (balls.length >= 6) {
      await app.wait(wins.length ? 1400 : 500);
      this.wins = null;
      const bw = await this.golden(bet, balls, rows);
      total += bw;
      app.setSpinLabel('GIRAR');
      return { win: total, celebrated: bw > 0 };
    }
    if (balls.length >= 4) app.message(balls.length + ' bolas… ¡faltan ' + (6 - balls.length) + ' para Golden Spins!');
    app.setSpinLabel('GIRAR');
    if (wins.length) await app.wait(Math.min(2200, 700 + wins.length * 350));
    return { win: total };
  }

  async buyBonus(bet) {
    const app = this.app;
    this.wins = null; this.expand = 0;
    app.sfx.whoosh();
    const pos = [];
    while (pos.length < 6) { const c = Math.random() * 5 | 0, r = 5 + (Math.random() * 3 | 0); if (!pos.some(p => p.c === c && p.row === r)) pos.push({ c, row: r }); }
    const balls = pos.map(p => ({ c: p.c, row: p.row, s: makeBall(bet, false) }));
    // Colocar bolas en la cuadrícula base para verlas llegar
    balls.forEach(b => { this.base.grid[b.c][b.row - 5] = b.s; this.base.columns[b.c].syms[b.row - 5 + 1] = b.s; });
    for (let i = 0; i < balls.length; i++) { const [px, py] = this.cellCenter(balls[i].c, balls[i].row); app.sfx.ballLand(i); app.burst(px, py, 14, { color: '#ffd76a', speed: 260, size: 9 }); await app.wait(160); }
    const w = await this.golden(bet, balls, BASE_R);
    app.setSpinLabel('GIRAR');
    return { win: w, celebrated: w > 0 };
  }

  // ---------- GOLDEN SPINS ----------
  async golden(bet, balls, rowsStart) {
    const app = this.app, sfx = app.sfx;
    const cells = [];
    for (let r = 0; r < MAXR; r++) { cells.push([]); for (let c = 0; c < COLS; c++) cells[r].push(null); }
    let rows = BASE_R;
    // Filas iniciales activas según bolas acumuladas y expansión de estrellas
    const b = { cells, rows: Math.max(rows, rowsStart), count: 0, spins: 3, spinning: new Map(), spinsFlash: 0, filler: [] };
    balls.forEach(o => { cells[o.row][o.c] = Object.assign({ t: 0 }, o.s, o.s.jp ? {} : {}); b.count++; });
    while (b.rows < MAXR && b.count >= THRESH[b.rows - 3]) b.rows++;
    // Símbolos de relleno atenuados para celdas vacías
    for (let r = 0; r < MAXR; r++) { b.filler.push([]); for (let c = 0; c < COLS; c++) b.filler[r].push(pickSym(W_UP, bet)); }
    this.expand = 0;
    sfx.stopMusic();
    app.flash('#fff2b0', 0.7); app.shake(true);
    sfx.featureStart();
    this.bonus = b;
    await app.banner('GOLDEN SPINS', 'Las bolas quedan fijas · 3 giros', { color: '#ffb52e', ms: 2300 });
    sfx.music('bonus');
    app.setSpinLabel('BONO', 'GOLDEN SPINS');
    app.message('Cada bola nueva reinicia los giros a <b>3</b>. Llena el tablero para el <b>GRAND</b>.');

    const total = COLS * MAXR;
    while (b.spins > 0 && b.count < total) {
      b.spins--;
      const empties = [];
      for (let r = MAXR - b.rows; r < MAXR; r++) for (let c = 0; c < COLS; c++) if (!cells[r][c]) empties.push([c, r]);
      if (!empties.length) break;
      empties.forEach(([c, r]) => b.spinning.set(r * COLS + c, { t: 0 }));
      sfx.spinStart(app.speed >= 2);
      await app.wait(600);
      empties.sort((a, z) => a[0] - z[0] || z[1] - a[1]);
      // Probabilidad por celda: más difícil con tablero grande
      const p = 0.062 - Math.min(0.022, b.count * 0.0009);
      let got = 0, plus = 0;
      const step = Math.max(35, Math.min(90, 900 / empties.length)) / app.speed;
      for (let i = 0; i < empties.length; i++) {
        const [c, r] = empties[i];
        b.spinning.delete(r * COLS + c);
        if (cells[r][c]) continue; // ya llenada por un Multiplicador
        if (Math.random() < p || app._forceBall || app._forceSpecial) {
          let s = makeBall(bet, true);
          if (app._forceSpecial) {
            const f = app._forceSpecial; app._forceSpecial = null;
            s = typeof f === 'number' ? { ball: true, extra: f, mult: 0, value: 0 } : { ball: true, special: f, mult: 0, value: 0 };
          }
          const cell = cells[r][c] = Object.assign({ t: 0 }, s);
          const special = !!(s.extra || s.special);
          got++;
          if (!special) b.count++;
          sfx.ballLand(b.count);
          const [px, py] = this.cellCenter(c, r);
          app.burst(px, py, 16, { color: '#ffe07a', speed: 280, size: 10 });
          app.burst(px, py, 1, { type: 'ring', color: '#8feaff', size: 10, grow: this.cw, width: 5, life: 0.5, speed: 0 });
          this.bolts.push({ x1: this.orb[0], y1: this.orb[1], x2: px, y2: py, t: 0, life: 0.35, w: 1.8 });
          if (s.extra) {
            await app.wait(250);
            b.spins += s.extra; plus += s.extra; b.spinsFlash = 1; sfx.multiplier(4);
            this.bolts.push({ x1: px, y1: py, x2: this.spinBox[0], y2: this.spinBox[1], t: 0, life: 0.5, w: 2.4, color: '#8fc8ff' });
            app.popText(px, py - 20, '+' + s.extra + (s.extra > 1 ? ' GIROS' : ' GIRO'), 22);
          }
          if (s.special === 'launch') { got += await this.launch(c, r, bet); }
          if (s.special === 'upgrade') await this.upgrade(c, r);
          // Las bolas especiales desaparecen tras entregar su efecto
          if (special) await this.vanish(c, r, cell);
          await app.wait(step * 2);
        } else {
          if (i % 3 === 0) sfx.reelStop(c % 5);
          await app.wait(step * 0.6);
        }
      }
      sfx.stopLoop('reels');
      // Cada bola nueva reinicia a 3 y los giros extra se suman encima del reinicio
      if (got) { b.spins = Math.max(b.spins - plus, 3) + plus; b.spinsFlash = 1; sfx.tone(1200, 0.2, { type: 'triangle', vol: 0.1 }); }
      // Desbloqueo de filas
      while (b.rows < MAXR && b.count >= THRESH[b.rows - 3]) {
        await app.wait(250);
        const newRow = MAXR - b.rows - 1;
        const [mx, my] = [this.bx - 7 - this.rail / 2, this.by + newRow * this.ch + this.ch / 2];
        this.bolts.push({ x1: mx, y1: my, x2: this.bx + this.cw * COLS, y2: my, t: 0, life: 1.1, w: 3 });
        this.bolts.push({ x1: this.orb[0], y1: this.orb[1], x2: mx, y2: my, t: 0, life: 0.8, w: 2 });
        sfx.rowUnlock(b.rows - 3);
        app.flash('#bff4ff', 0.55); app.shake(true);
        for (let c = 0; c < COLS; c++) { const [px, py] = this.cellCenter(c, newRow); app.burst(px, py, 10, { type: 'shard', color: '#cfeeff', speed: 320, size: 8, g: 700 }); }
        b.rows++;
        app.popText(this.bx + this.cw * 2.5, my, '¡FILA ' + b.rows + ' ACTIVA!', 26, ['#fff', '#aef', '#39f', '#dff']);
        app.message('¡Rayo! Fila <b>' + b.rows + '</b> desbloqueada · ' + (b.rows * COLS) + ' posiciones');
        await app.wait(900);
      }
      await app.wait(250);
    }
    b.spinning.clear();
    // Cobro de bolas
    app.message('Cobrando bolas…');
    await app.wait(500);
    let sum = 0, n = 0;
    const full = b.count >= total;
    for (let c = 0; c < COLS; c++) for (let r = MAXR - 1; r >= 0; r--) {
      const s = cells[r][c]; if (!s) continue;
      let v = s.value || 0;
      s.collect = 1;
      const [px, py] = this.cellCenter(c, r);
      if (s.jp) { v += await app.awardJackpot(s.jp); if (s.value) app.addWin(s.value); }
      else app.addWin(v);
      sfx.collect(n++);
      app.flyCoins(px, py, 3, 'spark');
      app.popText(px, py, short(v), 20);
      sum += v;
      await app.wait(130);
      s.collect = 0; s.done = true;
    }
    if (full) sum += await app.awardJackpot('grand');
    await app.wait(400);
    await app.celebrate(sum, bet, 'GOLDEN SPINS');
    this.bonus = null;
    this.expand = 0;
    sfx.stopMusic(); sfx.music(XLink.music);
    app.message('Golden Spins pagó <b>' + app.fmt(sum) + '</b>');
    return sum;
  }

  // MULTIPLICADOR: lanza bolas (con chance de jackpot) a todas las casillas vacías adyacentes
  async launch(c0, r0, bet) {
    const app = this.app, sfx = app.sfx, b = this.bonus, cells = b.cells;
    const me = cells[r0][c0];
    await app.wait(250);
    me.charge = 1;
    sfx.thunder(0.5); sfx.siren(0.7);
    app.flash('#9fe8ff', 0.4); app.shake(true);
    app.message('¡<b>MULTIPLICADOR</b>! Lanza bolas a las casillas vecinas');
    const [ox, oy] = this.cellCenter(c0, r0);
    app.burst(ox, oy, 1, { type: 'ring', color: '#9feaff', size: 10, grow: this.cw * 1.6, width: 8, life: 0.6, speed: 0 });
    await app.wait(450);
    let n = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const r = r0 + dr, c = c0 + dc;
      if ((!dr && !dc) || c < 0 || c >= COLS || r < MAXR - b.rows || r >= MAXR || cells[r][c]) continue;
      const s = makeBall(bet, true, 3, true);
      cells[r][c] = Object.assign({ t: 0 }, s);
      b.spinning.delete(r * COLS + c);
      b.count++; n++;
      const [px, py] = this.cellCenter(c, r);
      this.bolts.push({ x1: ox, y1: oy, x2: px, y2: py, t: 0, life: 0.5, w: 2.6 });
      sfx.zap(0.3, 0.2); sfx.ballLand(b.count);
      app.burst(px, py, 14, { color: s.jp ? '#fff4b0' : '#ffe07a', speed: 300, size: 10 });
      if (s.jp) { sfx.bell(1568, 1, 0.14); app.popText(px, py - 18, s.jp.toUpperCase() + '!', 20); }
      await app.wait(160);
    }
    me.charge = 0;
    app.popText(ox, oy, n ? '+' + n + ' BOLAS' : 'SIN ESPACIO', 22, ['#fff', '#bff0ff', '#3aa8ff', '#e8fbff']);
    return n;
  }
  // UPGRADE: duplica el valor de todas las bolas del tablero
  async upgrade(c0, r0) {
    const app = this.app, sfx = app.sfx, cells = this.bonus.cells;
    await app.wait(250);
    const [ox, oy] = this.cellCenter(c0, r0);
    sfx.featureStart(); app.flash('#ffe8a0', 0.4);
    app.message('¡<b>UPGRADE</b>! Todas las bolas duplican su valor');
    app.burst(ox, oy, 1, { type: 'ring', color: '#ffd76a', size: 10, grow: this.cw * 3, width: 10, life: 0.8, speed: 0 });
    await app.wait(400);
    let k = 0;
    for (let r = 0; r < MAXR; r++) for (let c = 0; c < COLS; c++) {
      const s = cells[r][c];
      if (!s || s.special || !s.value || (r === r0 && c === c0)) continue;
      s.value *= 2; s.t = 0;
      const [px, py] = this.cellCenter(c, r);
      this.bolts.push({ x1: ox, y1: oy, x2: px, y2: py, t: 0, life: 0.3, w: 1.4, color: '#ffd76a' });
      app.popText(px, py - 14, 'x2', 18);
      sfx.collect(k++);
      await app.wait(70);
    }
  }
  // Retira una bola especial del tablero con una pequeña animación; la casilla queda libre
  async vanish(c, r, s) {
    const app = this.app, cells = this.bonus.cells;
    await app.wait(200);
    const [px, py] = this.cellCenter(c, r);
    s.vanish = 0.001;
    app.burst(px, py, 14, { type: 'spark', color: s.extra ? '#8fc8ff' : s.special === 'upgrade' ? '#ffd76a' : '#bff4ff', speed: 260, size: 10 });
    app.sfx.zap(0.2, 0.15);
    await app.wait(320);
    if (cells[r][c] === s) cells[r][c] = null;
  }

  drawBonus(x) {
    const b = this.bonus, { bx, by, cw, ch, time } = this;
    const dpr = this.app.dpr;
    for (let r = 0; r < MAXR; r++) for (let c = 0; c < COLS; c++) {
      const px = bx + c * cw, py = by + r * ch, s = b.cells[r][c], active = r >= MAXR - b.rows;
      if (s) {
        s.t += 1 / 60;
        if (s.vanish) s.vanish = Math.min(1, s.vanish + 1 / 18);
        const pop = s.t < 0.35 ? ease.outBack(s.t / 0.35) : 1;
        const pulse = s.collect ? 1.2 : 1 + Math.sin(time * 3 + c + r) * 0.02;
        const size = Math.min(cw, ch) * 1.02, d = size * pop * pulse * (s.vanish ? 1 + s.vanish * 0.5 : 1);
        const img = this.ballImg(s, size * dpr);
        x.globalAlpha = s.vanish ? Math.max(0, 1 - s.vanish) : s.done ? 0.55 : 1;
        x.drawImage(img, px + cw / 2 - d / 2, py + ch / 2 - d / 2, d, d);
        x.globalAlpha = 1;
        if (s.vanish) continue;
        if (!s.done && Math.random() < 0.45) electricRing(x, px + cw / 2, py + ch / 2, size * 0.47, 1.2, s.jp ? '#ffe36a' : '#7fe0ff', 0.8);
        if (s.special || s.charge) { electricRing(x, px + cw / 2, py + ch / 2, size * 0.52, 1.8, s.special === 'upgrade' ? '#ffd76a' : '#bff4ff', 1); if (s.charge) electricRing(x, px + cw / 2, py + ch / 2, size * 0.7, 2.4, '#ffffff', 1); }
      } else if (active) {
        const spin = b.spinning.get(r * COLS + c);
        if (spin) {
          x.save(); x.beginPath(); x.rect(px, py, cw, ch); x.clip();
          const k = Math.floor(time * 22 + c * 3 + r * 7);
          const f = b.filler[(k) % MAXR][(k + c) % COLS];
          const off = ((time * 22) % 1) * ch;
          [0, 1].forEach(j => { if (f.ball) return; const img = f.k === 'bar' ? this.barSprite(Math.round(cw * 0.8 * dpr)) : sym(ICON[f.k] || S.CHERRY, cw * 0.8 * dpr, 'b'); x.globalAlpha = 0.55; x.drawImage(img, px + cw * 0.1, py - ch + off + j * ch, cw * 0.8, ch * 1.1); });
          x.restore(); x.globalAlpha = 1;
        } else {
          const f = b.filler[r][c];
          if (!f.ball && f.k) {
            const size = Math.min(cw, ch) * 0.8;
            const img = f.k === 'bar' ? this.barSprite(Math.round(size * dpr)) : sym(ICON[f.k], size * dpr, 'd');
            x.globalAlpha = 0.55; x.drawImage(img, px + cw / 2 - size / 2, py + ch / 2 - size / 2, size, size); x.globalAlpha = 1;
          }
        }
      }
    }
  }

  slam() { this.base.slam(); this.upper.slam(); }

  info(bet, fmt) {
    const lb = bet / 20;
    const row = (k, name, icon) => '<tr><td>' + icon + '</td><td>' + name + '</td><td>' + [3, 4, 5].map(n => PAY[k][n] ? fmt(PAY[k][n] * lb) : '—').join(' · ') + '</td></tr>';
    const ic = i => '<i class="ico" style="background-position:' + (i % 6) * 20 + '% ' + Math.floor(i / 6) * 25 + '%"></i>';
    const img = (c, t) => '<figure><img src="' + spriteURL(c) + '" alt=""><figcaption>' + t + '</figcaption></figure>';
    const gallery = '<div class="gallery">' +
      ['mini', 'minor', 'major', 'grand'].map(j => img(jackpotBall(j, short(bet * 2), 144), j.toUpperCase() + ' + valor')).join('') +
      img(specialIcon('launch', 144), 'Multiplicador') + img(specialIcon('upgrade', 144), 'Upgrade') + img(ball('blue', '+1…5', 144, 'GIROS'), '+1 a +5 giros') + '</div>';
    return '<h3>Bolas especiales de Golden Spins</h3>' + gallery + '<h3>Cómo se juega</h3><ul>' +
      '<li><b>5 rodillos × 3 filas, 20 líneas</b>. Pagan 3+ símbolos iguales desde la izquierda.</li>' +
      '<li><b>Estrellas ★</b>: verde abre 1 fila, azul 2, roja 3 (se suman, máx. 5) solo para ese giro. Hasta <b>100 líneas</b>.</li>' +
      '<li><b>6+ bolas doradas</b> en el área activa activan <b>GOLDEN SPINS</b>.</li>' +
      '<li>En Golden Spins las bolas quedan fijas, tienes <b>3 giros</b> y cada bola nueva los reinicia a 3. Las bolas azules <b>+1 · +2 · +3 · +4 · +5 GIROS</b> suman esos giros encima del reinicio.</li>' +
      '<li>Las bolas especiales (<b>+GIROS</b>, <b>Multiplicador</b> y <b>Upgrade</b>) entregan su efecto y <b>desaparecen</b>: la casilla queda libre para que caiga otra bola.</li>' +
      '<li>Al acumular <b>8 · 12 · 17 · 23 · 30</b> bolas un rayo desbloquea una fila más (hasta 8 filas, 40 posiciones).</li>' +
      '<li>Bolas <b>MINI · MINOR · MAJOR · GRAND</b> pagan su jackpot progresivo <b>+ el valor</b> que muestran. Tablero lleno = <b>GRAND</b>.</li>' +
      '<li><b>Multiplicador</b> (esfera eléctrica): lanza bolas a todas las casillas vacías vecinas, con mucha más chance de jackpot.</li>' +
      '<li><b>Upgrade</b> (monedas con flecha): duplica el valor de todas las bolas del tablero.</li>' +
      '<li><b>BONO</b>: compra Golden Spins directo por 60× la apuesta.</li></ul>' +
      '<h3>Tabla de pagos (apuesta ' + fmt(bet) + ')</h3><table>' +
      row('s7r', '7 rojo', ic(S.SEVEN)) + row('s7b', '7 azul', ic(S.SEVEN)) + row('bar', 'BAR', '<i class="ico bar">BAR</i>') +
      row('bell', 'Campana', ic(S.BELL)) + row('melon', 'Sandía', ic(S.MELON)) + row('grapes', 'Uvas', ic(S.GRAPES)) +
      row('plum', 'Ciruela', ic(S.PLUM)) + row('orange', 'Naranja', ic(S.ORANGE)) + row('cherry', 'Cereza (2+: ' + fmt(PAY.cherry[2] * lb) + ')', ic(S.CHERRY)) + '</table>';
  }
}

export function short(v) {
  v = Math.round(v);
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace('.', ',') + 'M';
  if (v >= 1e4) return '$' + (v / 1e3).toFixed(v >= 1e5 ? 0 : 1).replace('.', ',') + 'K';
  return '$' + v.toLocaleString('es-CL');
}
