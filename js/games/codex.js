// CÓDICE DEL SOL · 5x3, 10 líneas, templo en la selva al atardecer.
// El CÓDICE es wild y dispersor a la vez: 3+ en cualquier lugar = 10 giros gratis. Antes de
// empezar se elige al azar un SÍMBOLO ESPECIAL; en los giros gratis, si aparece en suficientes
// rodillos se EXPANDE a todo el rodillo y paga en las 10 líneas aunque no esté contiguo.
import { S, sym, glow, goldText, roundRect, ease, rand, FONT, makeCanvas } from '../gfx.js?v=71';
import { ReelSet, LINES_5x3, weighted } from '../reels.js?v=71';

const COLS = 5, ROWS = 3, NL = 10;
const LINES = LINES_5x3.slice(0, NL);
// Pago por línea (en apuestas por línea = apuesta/10) según cantidad de iguales
export const PAY = {
  sun: [0, 0, 10, 100, 1000, 5000], dragon: [0, 0, 5, 40, 400, 2000],
  diamond: [0, 0, 0, 30, 100, 750], rstar: [0, 0, 0, 30, 100, 750],
  K: [0, 0, 0, 5, 40, 150], Q: [0, 0, 0, 5, 40, 150], J: [0, 0, 0, 5, 25, 100], ten: [0, 0, 0, 5, 25, 100]
};
export const SCALE = 0.82;
const SCAT = [0, 0, 0, 2, 20, 200]; // códices en cualquier lugar (× apuesta total)
export const WEIGHTS = { sun: 1.1, dragon: 1.6, diamond: 3.2, rstar: 3.2, K: 5.5, Q: 5.5, J: 6, ten: 6, codex: 0.78 };
const SPECIAL_W = { sun: 4, dragon: 7, diamond: 12, rstar: 12, K: 16, Q: 16, J: 16.5, ten: 16.5 };
const ICON = { sun: S.SUN, dragon: S.DRAGON, diamond: S.DIAMOND, rstar: S.RSTAR, K: S.K, Q: S.Q, J: S.J, ten: S.TEN };
export const MYSTERY_P = 1 / 150;
export const minReels = k => PAY[k][2] ? 2 : 3;

// Líneas: el códice sustituye a cualquier símbolo
export function evalLines(g, lineBet) {
  const wins = [];
  LINES.forEach((L, li) => {
    const s = L.map((r, c) => g[c][r].k);
    const base = s.find(k => k !== 'codex');
    if (!base) return; // 5 códices se pagan como dispersor
    let n = 0;
    while (n < COLS && (s[n] === base || s[n] === 'codex')) n++;
    const p = PAY[base][n] * SCALE;
    if (p) wins.push({ li, line: L, n, k: base, win: p * lineBet });
  });
  return wins;
}
export const scatterPay = (n, bet) => SCAT[Math.min(5, n)] * bet;
// Expansión: rodillos donde aparece el especial; paga en todas las líneas
export function expandPay(g, special, lineBet) {
  const reels = []; g.forEach((col, c) => { if (col.some(s => s.k === special)) reels.push(c); });
  if (reels.length < minReels(special)) return { reels: [], win: 0 };
  return { reels, win: PAY[special][reels.length] * SCALE * lineBet * NL };
}

// Ícono del códice: tablilla dorada con el sol grabado (cacheado por tamaño)
const codexCache = new Map();
function codexIcon(size) {
  size = Math.round(size);
  if (codexCache.has(size)) return codexCache.get(size);
  const c = makeCanvas(size, size), x = c.getContext('2d'), m = size * 0.08, w = size - 2 * m, h = size * 0.86;
  const top = (size - h) / 2;
  // Tapas del libro
  roundRect(x, m, top, w, h, size * 0.06);
  let g = x.createLinearGradient(m, top, m + w, top + h);
  g.addColorStop(0, '#6a2a08'); g.addColorStop(0.5, '#a8501a'); g.addColorStop(1, '#4a1a04');
  x.fillStyle = g; x.fill();
  x.lineWidth = size * 0.04; x.strokeStyle = '#ffd36a'; x.stroke();
  // Marco interior dorado
  roundRect(x, m + size * 0.07, top + size * 0.07, w - size * 0.14, h - size * 0.14, size * 0.04);
  x.lineWidth = size * 0.02; x.strokeStyle = '#ffe9a8'; x.stroke();
  // Sol grabado
  const cx = size / 2, cy = size / 2, r = size * 0.17;
  x.save(); x.translate(cx, cy);
  for (let i = 0; i < 12; i++) {
    x.rotate(Math.PI / 6);
    x.beginPath(); x.moveTo(-r * 0.25, -r * 1.05); x.lineTo(0, -r * 1.75); x.lineTo(r * 0.25, -r * 1.05); x.closePath();
    x.fillStyle = '#ffd24a'; x.fill();
  }
  x.restore();
  g = x.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r);
  g.addColorStop(0, '#fff8d0'); g.addColorStop(0.5, '#ffc83a'); g.addColorStop(1, '#b86a08');
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
  x.lineWidth = size * 0.015; x.strokeStyle = '#6a3000'; x.stroke();
  // Cara estilizada
  x.fillStyle = '#6a3000';
  x.beginPath(); x.arc(cx - r * 0.35, cy - r * 0.15, r * 0.12, 0, 7); x.arc(cx + r * 0.35, cy - r * 0.15, r * 0.12, 0, 7); x.fill();
  x.lineWidth = size * 0.012; x.beginPath(); x.arc(cx, cy + r * 0.2, r * 0.35, 0.2, Math.PI - 0.2); x.stroke();
  // Etiqueta
  const fs = size * 0.13;
  x.font = '900 ' + fs + 'px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = fs * 0.3; x.strokeStyle = '#3a1000'; x.strokeText('CÓDICE', cx, top + h - size * 0.13);
  x.fillStyle = '#ffe9a8'; x.fillText('CÓDICE', cx, top + h - size * 0.13);
  codexCache.set(size, c);
  return c;
}

export default class Codex {
  static id = 'codex';
  static name = 'Códice del Sol';
  static music = 'jungle';
  static lobby = {
    icons: [S.SUN, S.DRAGON, S.DIAMOND], c1: '#ff9a3a', c2: '#1d3a12', mechanic: 'Símbolo especial que se expande',
    desc: 'Templo en la selva. El Códice es wild y da 10 giros gratis con un símbolo especial que se expande y paga en todas las líneas.'
  };
  constructor(app) {
    this.app = app; this.id = Codex.id;
    this.hint = '3 <b>CÓDICES</b> = 10 giros gratis con <b>símbolo especial que se expande</b>.';
    this.reels = new ReelSet({ cols: COLS, rows: ROWS, pick: () => ({ k: weighted(WEIGHTS) }), drawSym: (x, s, px, py, w, h, o) => this.drawSym(x, s, px, py, w, h, o) });
    this.freeLeft = 0; this.inFree = false; this.fsTotal = 0; this.special = null;
    this.wins = null; this.winT = 0; this.time = 0; this.expanded = null; this.chooser = null;
    this.flies = []; for (let i = 0; i < 18; i++) this.flies.push({ x: Math.random(), y: rand(0.3, 1), p: Math.random() * 6, s: rand(1.5, 3) });
    this.buy = { label: 'BONO', sub: b => app.fmt(b * 60), cost: b => b * 60, run: () => this.buyFree() };
  }
  get extra() { return this.inFree ? null : this.buy; }
  get freeRound() { return this.freeLeft > 0; }
  get keepWin() { return this.inFree; }
  get locked() { return this.inFree; }
  get animating() { return true; } // luciérnagas y antorchas

  resize(W, H) {
    this.W = W; this.H = H;
    const top = 40;
    const cw = Math.min((W - 30) / COLS, (H - top - 20) / ROWS * 1.08);
    const ch = Math.min(cw * 0.95, (H - top - 20) / ROWS);
    this.cw = cw; this.ch = ch; this.top = top;
    this.gx = (W - cw * COLS) / 2; this.gy = top + (H - top - ch * ROWS) / 2;
    this.reels.layout(this.gx, this.gy, cw, ch);
    this.bgCache = null;
  }
  // Escenario: cielo de atardecer, pirámide escalonada y selva (pre-renderizado)
  renderBg() {
    const { W, H, gx, gy, cw, ch } = this, dpr = this.app.dpr, L = this.app.light;
    const cnv = makeCanvas(W * dpr, H * dpr), x = cnv.getContext('2d');
    x.scale(dpr, dpr);
    let g = x.createLinearGradient(0, 0, 0, H);
    if (L) { g.addColorStop(0, '#ffd9a0'); g.addColorStop(0.5, '#ffb070'); g.addColorStop(1, '#6a9a4a'); }
    else { g.addColorStop(0, '#2a0f3a'); g.addColorStop(0.35, '#a8381e'); g.addColorStop(0.55, '#f08a2a'); g.addColorStop(1, '#0e2a10'); }
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // Sol poniente
    const sy = H * 0.5;
    x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.9;
    x.drawImage(glow('rgba(255,190,80,1)', 128), W / 2 - W * 0.5, sy - W * 0.5, W, W); x.restore();
    x.fillStyle = L ? '#fff0b0' : '#ffd070'; x.beginPath(); x.arc(W / 2, sy, Math.min(W, H) * 0.12, 0, 7); x.fill();
    // Pirámide escalonada
    const base = H * 0.95, pw = Math.min(W * 0.95, (cw * COLS) * 1.5), steps = 7, sh = H * 0.07;
    for (let i = 0; i < steps; i++) {
      const w = pw * (1 - i / (steps + 1.5)), y = base - (i + 1) * sh;
      x.fillStyle = L ? (i % 2 ? '#8a6a44' : '#7a5a38') : (i % 2 ? '#3a2416' : '#2e1c10');
      x.fillRect(W / 2 - w / 2, y, w, sh + 1);
      x.fillStyle = L ? 'rgba(255,230,180,0.25)' : 'rgba(255,160,80,0.12)'; x.fillRect(W / 2 - w / 2, y, w, 2);
    }
    // Templo en la cima
    const tw = pw * 0.2, ty = base - steps * sh - sh * 1.4;
    x.fillStyle = L ? '#6a4a2a' : '#22140a'; x.fillRect(W / 2 - tw / 2, ty, tw, sh * 1.4);
    x.fillStyle = '#ffcf6a'; x.fillRect(W / 2 - tw * 0.12, ty + sh * 0.4, tw * 0.24, sh);
    // Selva: siluetas de hojas a los lados
    const leaf = (px, py, len, ang, col) => {
      x.save(); x.translate(px, py); x.rotate(ang); x.fillStyle = col;
      x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(len * 0.5, -len * 0.28, len, 0); x.quadraticCurveTo(len * 0.5, len * 0.28, 0, 0); x.fill(); x.restore();
    };
    const dark = L ? '#2f6a24' : '#06180a', mid = L ? '#3f8a30' : '#0c2a10';
    for (let i = 0; i < 14; i++) {
      leaf(0, H * (0.25 + i * 0.055), W * rand(0.18, 0.3), rand(-0.6, 0.5), i % 2 ? dark : mid);
      leaf(W, H * (0.22 + i * 0.056), W * rand(0.18, 0.3), Math.PI + rand(-0.5, 0.6), i % 2 ? mid : dark);
    }
    // Marco de piedra tallada
    const bw = cw * COLS, bh = ch * ROWS;
    roundRect(x, gx - 12, gy - 12, bw + 24, bh + 24, 10);
    g = x.createLinearGradient(0, gy - 12, 0, gy + bh + 12);
    g.addColorStop(0, '#d9b26a'); g.addColorStop(0.5, '#7a5226'); g.addColorStop(1, '#c8a058');
    x.fillStyle = g; x.fill();
    // Grecas del marco
    x.strokeStyle = 'rgba(60,30,5,0.6)'; x.lineWidth = 2;
    for (let i = 0; i < 16; i++) {
      const px = gx - 6 + i * (bw + 12) / 16;
      x.strokeRect(px, gy - 9, (bw + 12) / 16 - 3, 5); x.strokeRect(px, gy + bh + 4, (bw + 12) / 16 - 3, 5);
    }
    roundRect(x, gx - 3, gy - 3, bw + 6, bh + 6, 6);
    g = x.createLinearGradient(0, gy, 0, gy + bh);
    if (L) { g.addColorStop(0, '#fff8ea'); g.addColorStop(1, '#efdcb8'); } else { g.addColorStop(0, '#1e1206'); g.addColorStop(0.5, '#34200c'); g.addColorStop(1, '#180e04'); }
    x.fillStyle = g; x.fill();
    x.strokeStyle = L ? 'rgba(120,80,30,0.3)' : 'rgba(255,200,120,0.2)'; x.lineWidth = 1;
    for (let c = 1; c < COLS; c++) { x.beginPath(); x.moveTo(gx + c * cw, gy); x.lineTo(gx + c * cw, gy + bh); x.stroke(); }
    return cnv;
  }
  drawSym(x, s, px, py, w, h, o) {
    const dpr = this.app.dpr, size = Math.min(w, h) * 0.9;
    let sc = 1, a = 1;
    if (o && o.fx) { sc = o.fx.scale || 1; a = o.fx.alpha == null ? 1 : o.fx.alpha; }
    if (this.expanded && this.expanded.includes(o && o.c) && !(o && o.spinning)) return; // lo cubre la expansión
    const d = size * sc, cx = px + w / 2, cy = py + h / 2;
    x.globalAlpha = a;
    if (s.k === 'codex') {
      if (!(o && o.blur)) { x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = a * (0.35 + 0.2 * Math.sin(this.time * 4)); x.drawImage(glow('rgba(255,200,80,1)', 64), cx - w * 0.6, cy - h * 0.6, w * 1.2, h * 1.2); x.restore(); x.globalAlpha = a; }
      x.drawImage(codexIcon(size * dpr), cx - d / 2, cy - d / 2, d, d);
    } else if (o && o.blur) x.drawImage(sym(ICON[s.k], size * dpr, 'b'), cx - d / 2, cy - d * 0.675, d, d * 1.35);
    else x.drawImage(sym(ICON[s.k], size * dpr), cx - d / 2, cy - d / 2, d, d);
    if (this.inFree && s.k === this.special && !(o && o.blur)) { x.strokeStyle = '#ffe07a'; x.lineWidth = 2; x.strokeRect(px + 4, py + 4, w - 8, h - 8); }
    x.globalAlpha = 1;
  }
  update(dt) {
    this.time += dt; this.reels.update(dt);
    if (this.wins) this.winT += dt;
    if (this.expandAnim != null) this.expandAnim = Math.min(1, this.expandAnim + dt * 2.2);
    if (this.chooser) this.chooser.t += dt;
  }
  draw(x) {
    if (!this.W) return; // aún sin medidas (primer cuadro)
    const { gx, gy, cw, ch, W, H, time } = this, dpr = this.app.dpr;
    const bw = cw * COLS, bh = ch * ROWS;
    if (!this.bgCache) this.bgCache = this.renderBg();
    x.drawImage(this.bgCache, 0, 0, W, H);
    // Luciérnagas
    x.save(); x.globalCompositeOperation = 'lighter';
    this.flies.forEach(f => {
      const px = (f.x + Math.sin(time * 0.3 + f.p) * 0.03) * W, py = (f.y + Math.cos(time * 0.4 + f.p) * 0.02) * H;
      x.globalAlpha = 0.4 + 0.4 * Math.sin(time * 3 + f.p);
      x.drawImage(glow('rgba(220,255,120,1)', 32), px - f.s * 3, py - f.s * 3, f.s * 6, f.s * 6);
    });
    // Antorchas a los lados del tablero
    [gx - 20, gx + bw + 20].forEach((tx, i) => {
      const ty = gy - 18, fl = 1 + 0.15 * Math.sin(time * 13 + i * 2) + 0.1 * Math.sin(time * 7);
      x.globalAlpha = 0.85; x.drawImage(glow('rgba(255,140,30,1)', 64), tx - 22 * fl, ty - 30 * fl, 44 * fl, 50 * fl);
    });
    x.restore();
    // Cabecera
    const title = this.inFree ? 'GIROS GRATIS · ' + this.freeLeft : 'CÓDICE DEL SOL · 10 LÍNEAS';
    goldText(x, title, W / 2, gy - this.top / 2 - 4, Math.min(15, bw * 0.045), { maxW: bw * 0.7 });
    if (this.inFree && this.special) {
      const s = Math.min(26, this.top * 0.62), px = gx + bw - s / 2, py = gy - this.top / 2 - 4;
      x.font = '800 11px ' + FONT; x.textAlign = 'right'; x.textBaseline = 'middle'; x.fillStyle = '#ffe9b0';
      x.fillText('ESPECIAL', px - s * 0.6 - 2, py);
      x.drawImage(sym(ICON[this.special], s * dpr), px - s / 2, py - s / 2, s, s);
    }
    this.reels.draw(x, (c, r) => this.cellFx(c, r));
    // Expansión del especial
    if (this.expanded) {
      const k = ease.outCubic(this.expandAnim || 0);
      this.expanded.forEach(c => {
        const px = gx + c * cw, hh = bh * k, py = gy + (bh - hh) / 2;
        x.save(); x.beginPath(); x.rect(px, gy, cw, bh); x.clip();
        let g = x.createLinearGradient(0, py, 0, py + hh);
        g.addColorStop(0, 'rgba(255,220,120,0.55)'); g.addColorStop(0.5, 'rgba(255,170,40,0.75)'); g.addColorStop(1, 'rgba(255,220,120,0.55)');
        x.fillStyle = g; x.fillRect(px + 2, py, cw - 4, hh);
        const size = Math.min(cw, ch) * 0.9 * (1 + 0.04 * Math.sin(time * 8));
        for (let r = 0; r < ROWS; r++) {
          const cy = gy + r * ch + ch / 2; if (cy < py || cy > py + hh) continue;
          x.drawImage(sym(ICON[this.special], Math.min(cw, ch) * 0.9 * dpr), px + cw / 2 - size / 2, cy - size / 2, size, size);
        }
        x.restore();
        x.strokeStyle = '#fff2b0'; x.lineWidth = 3; x.strokeRect(px + 2, py, cw - 4, hh);
      });
    }
    if (this.wins) this.drawWins(x);
    if (this.chooser) this.drawChooser(x);
  }
  cellFx(c, r) {
    if (!this.wins || !this.wins.length) return null;
    const w = this.wins[Math.floor(this.winT / 1.1) % this.wins.length];
    if (!w.cells) return null;
    return w.cells.some(([cc, rr]) => cc === c && rr === r) ? { scale: 1 + 0.07 * Math.sin(this.winT * 11) } : { alpha: 0.45 };
  }
  drawWins(x) {
    const w = this.wins[Math.floor(this.winT / 1.1) % this.wins.length], { gx, gy, cw, ch } = this;
    if (w.line) {
      x.save(); x.globalCompositeOperation = 'lighter'; x.lineJoin = 'round';
      x.beginPath(); w.line.forEach((r, c) => { const px = gx + c * cw + cw / 2, py = gy + r * ch + ch / 2; c ? x.lineTo(px, py) : x.moveTo(gx - 6, py); });
      x.lineTo(gx + cw * COLS + 6, gy + w.line[COLS - 1] * ch + ch / 2);
      x.strokeStyle = 'rgba(255,150,40,0.45)'; x.lineWidth = 12; x.stroke(); x.strokeStyle = '#fff2b0'; x.lineWidth = 3; x.stroke();
      x.restore();
    }
    goldText(x, (w.label ? w.label + ' ' : '') + this.app.fmt(w.win), gx + cw * 2.5, gy + ch * 1.5, Math.min(36, cw * 0.42), { glowColor: '#ff8a2e', maxW: cw * 5 });
  }
  drawChooser(x) {
    const o = this.chooser, { W, H } = this, dpr = this.app.dpr;
    x.save();
    x.fillStyle = 'rgba(20,8,0,0.72)'; x.fillRect(0, 0, W, H);
    const keys = Object.keys(ICON), done = o.t >= o.dur;
    // Los símbolos pasan cada vez más lento hasta detenerse en el elegido
    const k = done ? o.final : keys[Math.floor(Math.pow(Math.min(1, o.t / o.dur), 0.45) * 40) % keys.length];
    const size = Math.min(W, H) * 0.34 * (done ? 1 + 0.06 * Math.sin(o.t * 8) : 1);
    x.globalCompositeOperation = 'lighter'; x.globalAlpha = done ? 0.9 : 0.5;
    x.drawImage(glow('rgba(255,190,60,1)', 128), W / 2 - size, H / 2 - size, size * 2, size * 2);
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    x.drawImage(sym(ICON[k], size * dpr), W / 2 - size / 2, H / 2 - size / 2, size, size);
    goldText(x, done ? 'SÍMBOLO ESPECIAL' : 'ELIGIENDO…', W / 2, H / 2 - size * 0.75, Math.min(26, W * 0.06), { maxW: W * 0.9 });
    if (done) goldText(x, 'Se expande y paga en todas las líneas', W / 2, H / 2 + size * 0.72, Math.min(15, W * 0.04), { maxW: W * 0.9, colors: ['#fff', '#fff', '#ffe9b0', '#fff'] });
    x.restore();
  }

  async play(bet) {
    const app = this.app, sfx = app.sfx, lineBet = bet / NL;
    this.wins = null; this.expanded = null;
    const free = this.freeLeft > 0;
    if (free) this.freeLeft--;
    app.setSpinLabel(free ? 'GRATIS' : 'PARAR', free ? this.freeLeft + ' restantes' : '');
    const final = [];
    for (let c = 0; c < COLS; c++) { final.push([]); for (let r = 0; r < ROWS; r++) final[c].push({ k: weighted(WEIGHTS) }); }
    if (app._force) { app._force = false; [0, 2, 4].forEach(c => { final[c][1] = { k: 'codex' }; }); }
    if (app._forceExpand && this.special) { app._forceExpand = false; [0, 1, 3, 4].forEach(c => { final[c][c % 3] = { k: this.special }; }); }
    let cx = 0, anticFrom = -1;
    for (let c = 0; c < COLS - 1; c++) { if (final[c].some(s => s.k === 'codex')) cx++; if (cx >= 2 && anticFrom < 0) anticFrom = c + 1; }
    sfx.spinStart(app.speed >= 2);
    this.reels.start(app.speed);
    await this.reels.stopTo(final, {
      anticFrom,
      onStop: (c, last) => {
        sfx.reelStop(c, last);
        if (this.reels.anticipating) sfx.anticipation(true);
        final[c].forEach((s, r) => {
          const px = this.gx + c * this.cw + this.cw / 2, py = this.gy + r * this.ch + this.ch / 2;
          if (s.k === 'codex') { sfx.bell(660 + c * 110, 1, 0.12); app.burst(px, py, 16, { type: 'spark', color: '#ffcf5a', speed: 280, size: 11 }); }
        });
        if (last) sfx.anticipation(false);
      }
    });
    sfx.anticipation(false);
    const wins = evalLines(final, lineBet).map(w => ({ ...w, cells: w.line.slice(0, w.n).map((r, c) => [c, r]) }));
    let total = wins.reduce((a, w) => a + w.win, 0);
    let codices = final.flat().filter(s => s.k === 'codex').length;
    const scat = scatterPay(codices, bet);
    if (scat) { wins.push({ win: scat, label: codices + ' CÓDICES', cells: cellsOf(final, 'codex') }); total += scat; }
    if (wins.length) {
      this.wins = wins; this.winT = 0;
      sfx.win(total >= bet * 5 ? 2 : 0); app.addWin(total);
      app.flyCoins(this.gx + this.cw * 2.5, this.gy + this.ch * 1.5, Math.min(14, 3 + wins.length * 2));
      app.message('Premio: <b>' + app.fmt(total) + '</b>');
    } else if (!this.inFree) app.message(this.hint);
    // Expansión en giros gratis
    if (this.inFree && this.special) {
      const ex = expandPay(final, this.special, lineBet);
      if (ex.win) {
        await app.wait(wins.length ? 1000 : 300);
        this.wins = null;
        this.expanded = ex.reels; this.expandAnim = 0;
        sfx.featureStart(); app.flash('#ffd27a', 0.4); app.shake(false);
        await app.wait(700);
        app.message('¡Expansión en ' + ex.reels.length + ' rodillos! Paga en las 10 líneas: <b>' + app.fmt(ex.win) + '</b>');
        app.popText(this.gx + this.cw * 2.5, this.gy + this.ch * 1.5, app.fmt(ex.win), 34);
        app.flyCoins(this.gx + this.cw * 2.5, this.gy + this.ch * 1.5, 12);
        sfx.win(ex.win >= bet * 10 ? 3 : 2);
        app.addWin(ex.win); total += ex.win;
        // Especial en los 5 rodillos: GRAND si es el sol, MINI con cualquier otro
        if (ex.reels.length === COLS) total += await app.awardJackpot(this.special === 'sun' ? 'grand' : 'mini');
        await app.wait(1200);
      }
    }
    if (this.inFree) this.fsTotal += total;
    // Códices → giros gratis
    if (!free && !this.inFree && codices < 3 && (Math.random() < MYSTERY_P || app._forceMystery)) {
      app._forceMystery = false;
      await app.wait(wins.length ? 900 : 300);
      this.wins = null;
      await app.mysteryIntro('Los rayos revelan códices');
      const cols = [0, 1, 2, 3, 4].filter(c => !final[c].some(s => s.k === 'codex'));
      for (let i = cols.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [cols[i], cols[j]] = [cols[j], cols[i]]; }
      while (codices < 3 && cols.length) {
        const c = cols.pop(), r = Math.random() * 3 | 0, s = { k: 'codex' };
        final[c][r] = s; this.reels.setCell(c, r, s); codices++;
        app.strike(this.gx + c * this.cw + this.cw / 2, this.gy + r * this.ch + this.ch / 2, '#ffd27a');
        sfx.bell(660 + codices * 110, 1, 0.12);
        await app.wait(320);
      }
    }
    if (codices >= 3) {
      await app.wait(wins.length ? 1100 : 400);
      this.wins = null; this.expanded = null;
      { const v = await app.bonusPay(codices, bet, 'códices'); total += v; if (this.inFree) this.fsTotal += v; }
      // 4 códices = MINOR · 5 = MAJOR
      if (codices >= 4) { const v = await app.awardJackpot(codices >= 5 ? 'major' : 'minor'); total += v; if (this.inFree) this.fsTotal += v; }
      if (this.inFree) {
        this.freeLeft += 10; sfx.featureStart();
        await app.banner('+10 GIROS', 'El códice se abre otra vez', { color: '#ffb03a', ms: 1600 });
      } else await this.startFree();
    }
    if (wins.length && !this.inFree) await app.wait(Math.min(1800, 700 + wins.length * 300));
    const celebrated = this.inFree;
    if (this.inFree && this.freeLeft === 0 && free) {
      await app.wait(400);
      const fs = this.fsTotal;
      this.inFree = false; this.special = null; this.expanded = null; this.wins = null;
      if (fs > 0) await app.celebrate(fs, bet, 'CÓDICE DEL SOL');
      sfx.stopMusic(); sfx.music(Codex.music);
      app.message('Giros gratis: <b>' + app.fmt(fs) + '</b>');
    }
    app.setSpinLabel(this.freeLeft ? 'GRATIS' : 'GIRAR', this.freeLeft ? this.freeLeft + ' restantes' : '');
    return { win: total, celebrated };
  }
  async startFree() {
    const app = this.app, sfx = app.sfx;
    sfx.featureStart(); app.flash('#ffd27a', 0.6); app.shake(true);
    this.inFree = true; this.freeLeft = 10; this.fsTotal = 0;
    sfx.stopMusic();
    await app.banner('10 GIROS GRATIS', 'El códice elige un símbolo especial', { color: '#ffb03a', ms: 2200 });
    this.special = weighted(SPECIAL_W);
    this.chooser = { t: 0, dur: 2.2 / Math.sqrt(app.speed), final: this.special };
    const ticker = setInterval(() => sfx.wheelTick(), 90);
    await app.wait(2200);
    clearInterval(ticker);
    sfx.jackpot(1);
    await app.wait(1500);
    this.chooser = null;
    sfx.music('bonus');
    app.message('Símbolo especial elegido. Se expande con ' + minReels(this.special) + '+ rodillos.');
    app.setSpinLabel('GRATIS', this.freeLeft + ' restantes');
  }
  async buyFree() {
    await this.startFree();
    return { win: 0, celebrated: true };
  }
  slam() { this.reels.slam(); }
  info(bet, fmt) {
    const ic = i => '<i class="ico" style="background-position:' + (i % 6) * 20 + '% ' + Math.floor(i / 6) * 25 + '%"></i>', lb = bet / NL;
    return '<h3>Cómo se juega</h3><ul><li><b>5 rodillos × 3 filas, 10 líneas</b>. Pagan iguales contiguos desde la izquierda.</li>' +
      '<li>El <b>CÓDICE</b> es <b>wild</b> (sustituye a todos) y <b>dispersor</b>: 3 / 4 / 5 en cualquier lugar pagan ' + [3, 4, 5].map(n => fmt(SCAT[n] * bet)).join(' / ') + ' y dan <b>10 giros gratis</b>.</li>' +
      '<li>Al empezar los giros gratis se elige un <b>SÍMBOLO ESPECIAL</b>. Si aparece en suficientes rodillos (2 para Sol y Dragón, 3 para los demás) se <b>expande</b> a todo el rodillo y paga en <b>las 10 líneas</b>, aunque los rodillos no estén juntos.</li>' +
      '<li>3 códices durante los giros gratis = <b>+10 giros</b>.</li>' +
      '<li>Jackpots: <b>4 códices = MINOR</b>, <b>5 = MAJOR</b>. Especial expandido en los <b>5 rodillos</b> = <b>MINI</b>, o el <b>GRAND</b> si el especial es el <b>Sol</b>.</li>' +
      '<li><b>BONO</b>: compra los giros gratis por 60× la apuesta.</li></ul>' +
      '<h3>Pagos por línea (apuesta ' + fmt(bet) + ') · 2 / 3 / 4 / 5</h3><table>' +
      Object.keys(PAY).map(k => '<tr><td>' + ic(ICON[k]) + '</td><td>' + labelOf(k) + '</td><td>' + [2, 3, 4, 5].map(n => PAY[k][n] ? fmt(PAY[k][n] * SCALE * lb) : '—').join(' · ') + '</td></tr>').join('') + '</table>';
  }
}
function cellsOf(g, k) { const out = []; g.forEach((col, c) => col.forEach((s, r) => { if (s.k === k) out.push([c, r]); })); return out; }
function labelOf(k) { return { sun: 'Sol', dragon: 'Serpiente dragón', diamond: 'Diamante', rstar: 'Estrella', K: 'K', Q: 'Q', J: 'J', ten: '10' }[k]; }
