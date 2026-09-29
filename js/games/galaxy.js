// GALAXIA INFINITA · RODILLOS INFINITOS en el espacio profundo.
// Empieza con 3 rodillos de 3 filas y paga por formas desde la izquierda. Cada vez que un premio
// llega hasta el ÚLTIMO rodillo aparece uno nuevo a la derecha y gira solo, hasta 15 rodillos.
// Llegar a 8 / 10 / 12 / 15 rodillos = MINI / MINOR / MAJOR / GRAND.
// 3+ portales = 8 giros gratis con multiplicador que sube +1 por cada rodillo nuevo y no se reinicia.
import { S, sym, glow, goldText, roundRect, rand, FONT, makeCanvas } from '../gfx.js?v=54';
import { ReelSet, weighted } from '../reels.js?v=54';

const ROWS = 3, START = 3, MAXC = 15;
export const P = { sun: 1, diamond: 0.8, rstar: 0.6, bstar: 0.5, gstar: 0.4, snow: 0.4, K: 0.2, Q: 0.2, J: 0.15, ten: 0.15 };
// Factor según cuántos rodillos alcanza el premio (índice = rodillos)
export const NMULT = [0, 0, 0, 1, 2, 4, 7, 11, 16, 22, 30, 40, 55, 75, 100, 140];
export const SCALE = 19;
export const WEIGHTS = { sun: 2.5, diamond: 3.5, rstar: 4.5, bstar: 5, gstar: 5.5, snow: 5.5, K: 8, Q: 8, J: 9, ten: 9 };
const ICON = { sun: S.SUN, diamond: S.DIAMOND, rstar: S.RSTAR, bstar: S.BSTAR, gstar: S.GSTAR, snow: S.SNOW, K: S.K, Q: S.Q, J: S.J, ten: S.TEN };
export const MYSTERY_P = 1 / 150;
export const JP_BY_REELS = n => n >= 15 ? 'grand' : n >= 12 ? 'major' : n >= 10 ? 'minor' : n >= 8 ? 'mini' : null;
export function pickSym(c, free) {
  const w = Object.assign({}, WEIGHTS, { portal: free ? 1.3 : 2.6 });
  if (c >= 1) w.wild = free ? 2.2 : 1.6;
  return { k: weighted(w) };
}
// g[col][row]; paga por formas desde la izquierda con wild (rodillos 2+)
export function evalWays(g, bet) {
  const wins = [];
  for (const k in P) {
    let ways = 1, n = 0; const cells = [];
    for (let c = 0; c < g.length; c++) {
      let cnt = 0;
      g[c].forEach((s, r) => { if (s.k === k || (s.k === 'wild' && c > 0)) { cnt++; cells.push([c, r]); } });
      if (!cnt) break;
      ways *= cnt; n++;
    }
    if (n >= 3) wins.push({ k, n, ways, cells: cells.filter(([c]) => c < n), win: P[k] * NMULT[n] * SCALE * bet * ways / 10 });
  }
  return wins;
}

const cache = new Map();
// WILD: planeta con anillos
function planetIcon(size) {
  size = Math.round(size); const key = 'p' + size;
  if (cache.has(key)) return cache.get(key);
  const c = makeCanvas(size, size), x = c.getContext('2d'), cx = size / 2, cy = size / 2, r = size * 0.3;
  const ring = (front) => {
    x.save(); x.translate(cx, cy); x.rotate(-0.35);
    x.beginPath(); x.ellipse(0, 0, r * 1.55, r * 0.42, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
    x.lineWidth = size * 0.05; x.strokeStyle = '#ffd98a'; x.stroke();
    x.lineWidth = size * 0.018; x.strokeStyle = '#fff6d0'; x.stroke();
    x.restore();
  };
  ring(false);
  let g = x.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#ffd0ff'); g.addColorStop(0.4, '#b04ae0'); g.addColorStop(1, '#3a0a6a');
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
  x.save(); x.beginPath(); x.arc(cx, cy, r, 0, 7); x.clip();
  x.fillStyle = 'rgba(255,200,255,0.25)'; for (let i = -2; i <= 2; i++) x.fillRect(cx - r, cy + i * r * 0.33, r * 2, r * 0.1);
  x.restore();
  ring(true);
  const fs = size * 0.19;
  x.font = '900 ' + fs + 'px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = fs * 0.3; x.strokeStyle = '#2a0048'; x.strokeText('WILD', cx, cy + size * 0.36);
  x.fillStyle = '#fff'; x.fillText('WILD', cx, cy + size * 0.36);
  cache.set(key, c); return c;
}
// Dispersor: portal en espiral
function portalIcon(size) {
  size = Math.round(size); const key = 'o' + size;
  if (cache.has(key)) return cache.get(key);
  const c = makeCanvas(size, size), x = c.getContext('2d'), cx = size / 2, cy = size / 2, R = size * 0.44;
  let g = x.createRadialGradient(cx, cy, 1, cx, cy, R);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.2, '#9ff4ff'); g.addColorStop(0.55, '#2a6aff'); g.addColorStop(0.85, '#3a0a8a'); g.addColorStop(1, 'rgba(20,0,60,0)');
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.fill();
  x.lineCap = 'round';
  for (let a = 0; a < 3; a++) {
    x.beginPath();
    for (let t = 0; t < 1; t += 0.02) { const ang = a * 2.09 + t * 7, rr = R * 0.9 * t; const px = cx + Math.cos(ang) * rr, py = cy + Math.sin(ang) * rr; t ? x.lineTo(px, py) : x.moveTo(px, py); }
    x.strokeStyle = 'rgba(255,255,255,0.75)'; x.lineWidth = size * 0.03; x.stroke();
  }
  x.lineWidth = size * 0.03; x.strokeStyle = '#bff4ff'; x.beginPath(); x.arc(cx, cy, R * 0.92, 0, 7); x.stroke();
  const fs = size * 0.16;
  x.font = '900 ' + fs + 'px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = fs * 0.3; x.strokeStyle = '#0a0a3a'; x.strokeText('PORTAL', cx, cy + size * 0.34);
  x.fillStyle = '#e8fbff'; x.fillText('PORTAL', cx, cy + size * 0.34);
  cache.set(key, c); return c;
}

export default class Galaxy {
  static id = 'galaxy';
  static name = 'Galaxia Infinita';
  static music = 'space';
  static lobby = {
    icons: [S.SUN, S.BSTAR, S.SNOW], c1: '#8a5aff', c2: '#060a2a', mechanic: 'Rodillos infinitos',
    desc: 'Espacio profundo. Empieza con 3 rodillos y cada premio que llega al último agrega uno nuevo, hasta 15. Más rodillos = jackpots.'
  };
  constructor(app) {
    this.app = app; this.id = Galaxy.id;
    this.hint = 'Si un premio llega al <b>último rodillo</b>, aparece <b>uno nuevo</b>. 8 rodillos = MINI … 15 = GRAND.';
    const drawSym = (x, s, px, py, w, h, o) => this.drawSym(x, s, px, py, w, h, o);
    this.reels = [];
    for (let c = 0; c < MAXC; c++) this.reels.push(new ReelSet({ cols: 1, rows: ROWS, pick: () => pickSym(c, this.inFree), drawSym }));
    this.n = START; this.shown = START;
    this.freeLeft = 0; this.inFree = false; this.fsTotal = 0; this.mult = 1;
    this.wins = null; this.winT = 0; this.time = 0;
    this.stars = []; for (let i = 0; i < 110; i++) this.stars.push({ x: Math.random(), y: Math.random(), s: rand(0.5, 1.8), p: Math.random() * 6 });
    this.shoot = null;
    this.buy = { label: 'BONO', sub: b => app.fmt(b * 35), cost: b => b * 35, run: () => this.buyFree() };
  }
  get extra() { return this.inFree ? null : this.buy; }
  get freeRound() { return this.freeLeft > 0; }
  get keepWin() { return this.inFree; }
  get locked() { return this.inFree; }
  get animating() { return true; }

  resize(W, H) {
    this.W = W; this.H = H; this.bgCache = null;
    this.top = 38; this.bottom = 30;
    this.layout();
  }
  // Recalcula el tamaño de las celdas según cuántos rodillos hay (mínimo el ancho de 5)
  layout() {
    const { W, H, top, bottom } = this;
    const n = Math.max(5, this.n);
    const cw = Math.min((W - 20) / n, (H - top - bottom) / ROWS * 1.05);
    const ch = Math.min(cw, (H - top - bottom) / ROWS);
    this.cw = cw; this.ch = ch;
    this.gx = (W - cw * this.n) / 2; this.gy = top + (H - top - bottom - ch * ROWS) / 2;
    this.reels.forEach((rs, c) => rs.layout(this.gx + c * cw, this.gy, cw, ch));
  }
  renderBg() {
    const { W, H } = this, dpr = this.app.dpr, L = this.app.light;
    const cnv = makeCanvas(W * dpr, H * dpr), x = cnv.getContext('2d');
    x.scale(dpr, dpr);
    let g = x.createLinearGradient(0, 0, W, H);
    if (L) { g.addColorStop(0, '#d8d0ff'); g.addColorStop(1, '#a8c8ff'); } else { g.addColorStop(0, '#05041a'); g.addColorStop(0.5, '#0c0a34'); g.addColorStop(1, '#02010c'); }
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // Nebulosas
    const neb = (px, py, r, col) => { const gg = x.createRadialGradient(px, py, 0, px, py, r); gg.addColorStop(0, col); gg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gg; x.fillRect(px - r, py - r, r * 2, r * 2); };
    x.globalCompositeOperation = L ? 'multiply' : 'lighter';
    neb(W * 0.2, H * 0.25, W * 0.45, L ? 'rgba(200,150,255,0.5)' : 'rgba(150,40,200,0.35)');
    neb(W * 0.85, H * 0.7, W * 0.5, L ? 'rgba(120,200,255,0.5)' : 'rgba(20,140,220,0.3)');
    neb(W * 0.6, H * 0.15, W * 0.3, L ? 'rgba(255,170,200,0.4)' : 'rgba(255,60,140,0.2)');
    x.globalCompositeOperation = 'source-over';
    // Planeta grande con anillo en una esquina
    const pr = Math.min(W, H) * 0.16, px = W * 0.9, py = H * 0.9;
    g = x.createRadialGradient(px - pr * 0.4, py - pr * 0.4, pr * 0.1, px, py, pr);
    g.addColorStop(0, L ? '#ffd9b0' : '#ffb86a'); g.addColorStop(0.6, L ? '#e07a4a' : '#a8401a'); g.addColorStop(1, L ? '#8a3a1a' : '#2a0a04');
    x.fillStyle = g; x.beginPath(); x.arc(px, py, pr, 0, 7); x.fill();
    x.save(); x.translate(px, py); x.rotate(-0.3); x.strokeStyle = 'rgba(255,220,170,0.6)'; x.lineWidth = pr * 0.08;
    x.beginPath(); x.ellipse(0, 0, pr * 1.7, pr * 0.35, 0, Math.PI * 1.05, Math.PI * 1.95); x.stroke(); x.restore();
    // Luna pequeña
    x.fillStyle = L ? '#b8b0d8' : '#6a6a8a'; x.beginPath(); x.arc(W * 0.1, H * 0.12, Math.min(W, H) * 0.035, 0, 7); x.fill();
    return cnv;
  }
  drawSym(x, s, px, py, w, h, o) {
    const dpr = this.app.dpr, size = Math.min(w, h) * 0.9;
    let sc = 1, a = 1;
    if (o && o.fx) { sc = o.fx.scale || 1; a = o.fx.alpha == null ? 1 : o.fx.alpha; }
    const d = size * sc, cx = px + w / 2, cy = py + h / 2;
    x.globalAlpha = a;
    if (s.k === 'portal') {
      x.save(); x.translate(cx, cy); if (!(o && o.blur)) x.rotate(this.time * 1.5); x.drawImage(portalIcon(size * dpr), -d / 2, -d / 2, d, d); x.restore();
    } else if (s.k === 'wild') x.drawImage(planetIcon(size * dpr), cx - d / 2, cy - d / 2, d, d);
    else if (o && o.blur) x.drawImage(sym(ICON[s.k], size * dpr, 'b'), cx - d / 2, cy - d * 0.675, d, d * 1.35);
    else x.drawImage(sym(ICON[s.k], size * dpr), cx - d / 2, cy - d / 2, d, d);
    x.globalAlpha = 1;
  }
  update(dt) {
    this.time += dt;
    for (let c = 0; c < this.n; c++) this.reels[c].update(dt);
    if (this.wins) this.winT += dt;
    if (this.grow != null) this.grow = Math.min(1, this.grow + dt * 3);
    if (!this.shoot && Math.random() < dt * 0.25) this.shoot = { x: Math.random() * this.W, y: Math.random() * this.H * 0.4, t: 0 };
    if (this.shoot) { this.shoot.t += dt; if (this.shoot.t > 0.8) this.shoot = null; }
  }
  draw(x) {
    if (!this.W) return; // aún sin medidas (primer cuadro)
    const { W, H, gx, gy, cw, ch, time, n } = this, bw = cw * n, bh = ch * ROWS;
    if (!this.bgCache) this.bgCache = this.renderBg();
    x.drawImage(this.bgCache, 0, 0, W, H);
    // Estrellas titilantes y estrella fugaz
    x.fillStyle = this.app.light ? '#6a5aa8' : '#ffffff';
    this.stars.forEach(s => { x.globalAlpha = 0.35 + 0.35 * Math.sin(time * 2 + s.p); x.fillRect(s.x * W, s.y * H, s.s, s.s); });
    x.globalAlpha = 1;
    if (this.shoot) {
      const s = this.shoot, k = s.t / 0.8, sx = s.x + k * 180, sy = s.y + k * 90;
      const gg = x.createLinearGradient(sx - 60, sy - 30, sx, sy); gg.addColorStop(0, 'rgba(255,255,255,0)'); gg.addColorStop(1, 'rgba(255,255,255,' + (1 - k) + ')');
      x.strokeStyle = gg; x.lineWidth = 2; x.beginPath(); x.moveTo(sx - 60, sy - 30); x.lineTo(sx, sy); x.stroke();
    }
    // Título: rodillos, formas y multiplicador
    const t = (this.inFree ? 'GIROS ' + this.freeLeft + ' · x' + this.mult + ' · ' : '') + n + ' RODILLOS';
    goldText(x, t, W / 2, gy - this.top / 2 - 2, Math.min(15, W * 0.04), { maxW: W * 0.9, colors: ['#fff', '#f0e8ff', '#b08aff', '#fff'], stroke: '#14083a', glowColor: '#8a5aff' });
    // Tablero: marco de neón
    roundRect(x, gx - 8, gy - 8, bw + 16, bh + 16, 12);
    x.fillStyle = this.app.light ? 'rgba(255,255,255,0.75)' : 'rgba(8,6,30,0.82)'; x.fill();
    x.lineWidth = 2.5; x.strokeStyle = '#9a7aff'; x.stroke();
    x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.25 + 0.1 * Math.sin(time * 3); x.lineWidth = 7; x.stroke(); x.restore();
    x.strokeStyle = this.app.light ? 'rgba(90,60,180,0.25)' : 'rgba(170,150,255,0.2)'; x.lineWidth = 1;
    for (let c = 1; c < n; c++) { x.beginPath(); x.moveTo(gx + c * cw, gy); x.lineTo(gx + c * cw, gy + bh); x.stroke(); }
    // Rodillo nuevo: destello de aparición
    for (let c = 0; c < n; c++) {
      const rs = this.reels[c];
      if (c === n - 1 && this.grow != null && this.grow < 1) { x.save(); x.globalAlpha = this.grow; rs.draw(x, (cc, r) => this.cellFx(c, r)); x.restore(); }
      else rs.draw(x, (cc, r) => this.cellFx(c, r));
    }
    if (this.grow != null && this.grow < 1) {
      x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 1 - this.grow;
      x.drawImage(glow('rgba(170,140,255,1)', 64), gx + (n - 1) * cw - cw * 0.3, gy - ch * 0.3, cw * 1.6, bh + ch * 0.6); x.restore();
    }
    // Marcadores de jackpot bajo el tablero
    const marks = [[8, 'MINI', '#5dff7a'], [10, 'MINOR', '#5ad8ff'], [12, 'MAJOR', '#d77aff'], [15, 'GRAND', '#ff4a3a']];
    x.font = '800 ' + Math.min(11, W * 0.026) + 'px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'top';
    marks.forEach(([k, lbl, col], i) => {
      const px = W / 2 + (i - 1.5) * Math.min(115, W * 0.24), py = gy + bh + 12, on = n >= k;
      x.fillStyle = on ? col : 'rgba(220,210,255,0.55)';
      x.fillText(k + ' → ' + lbl, px, py);
    });
    if (this.wins) this.drawWins(x);
  }
  cellFx(c, r) {
    if (!this.wins || !this.wins.length) return null;
    const w = this.wins[Math.floor(this.winT / 1.2) % this.wins.length];
    return w.cells.some(([cc, rr]) => cc === c && rr === r) ? { scale: 1 + 0.07 * Math.sin(this.winT * 11) } : { alpha: 0.4 };
  }
  drawWins(x) {
    const w = this.wins[Math.floor(this.winT / 1.2) % this.wins.length], { gx, gy, cw, ch, n } = this;
    x.save(); x.globalCompositeOperation = 'lighter';
    w.cells.forEach(([c, r]) => { x.strokeStyle = '#d8c8ff'; x.lineWidth = 2; x.strokeRect(gx + c * cw + 2, gy + r * ch + 2, cw - 4, ch - 4); });
    x.restore();
    goldText(x, this.app.fmt(w.win), gx + cw * n / 2, gy + ch * 1.5, Math.min(36, cw * 0.6), { glowColor: '#8a5aff' });
    x.font = '800 12px ' + FONT; x.fillStyle = '#efe8ff'; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    x.fillText(w.n + ' rodillos · ' + w.ways + (w.ways === 1 ? ' forma' : ' formas'), gx + cw * n / 2, gy + ch * 1.5 + 28);
  }

  // Gira los rodillos [from, to) y devuelve sus símbolos finales
  async spinReels(from, to, force) {
    const app = this.app, sfx = app.sfx, sp = app.speed, out = [];
    sfx.spinStart(sp >= 2);
    await Promise.all(this.reels.slice(from, to).map((rs, i) => {
      const c = from + i, col = [];
      for (let r = 0; r < ROWS; r++) col.push(pickSym(c, this.inFree));
      if (force && force[c] != null) col[force[c]] = { k: 'portal' };
      out[c] = col;
      rs.start(sp);
      return rs.stopTo([col], {
        minTime: (0.5 + i * 0.16) / sp,
        onStop: () => {
          sfx.reelStop(c % 5, c === to - 1);
          col.forEach((s, r) => {
            if (s.k === 'portal') { sfx.bell(740 + (c % 5) * 110, 0.9, 0.12); app.burst(this.gx + c * this.cw + this.cw / 2, this.gy + r * this.ch + this.ch / 2, 14, { type: 'spark', color: '#9ff4ff', speed: 260, size: 10 }); }
          });
        }
      });
    }));
    return out;
  }

  async play(bet) {
    const app = this.app, sfx = app.sfx;
    this.wins = null;
    const free = this.freeLeft > 0;
    if (free) this.freeLeft--;
    app.setSpinLabel(free ? 'GRATIS' : 'PARAR', free ? this.freeLeft + ' restantes' : '');
    // Vuelve a 3 rodillos
    if (this.n !== START) { this.n = START; this.grow = null; this.layout(); }
    const force = app._force ? [1, 1, 1] : null; app._force = false;
    const forceGrow = app._forceGrow || 0; app._forceGrow = 0;
    const grid = await this.spinReels(0, START, force);
    // Ayuda de prueba: una fila de soles para que el premio crezca
    if (forceGrow) for (let c = 0; c < START; c++) { grid[c][1] = { k: 'sun' }; this.reels[c].setCell(0, 1, grid[c][1]); }
    // Crecimiento: mientras un premio llegue al último rodillo
    while (this.n < MAXC) {
      const wins = evalWays(grid.slice(0, this.n), bet);
      if (!wins.some(w => w.n === this.n)) break;
      this.wins = wins.filter(w => w.n === this.n); this.winT = 0;
      await app.wait(550);
      this.wins = null;
      this.n++; this.grow = 0; this.layout();
      if (this.inFree) { this.mult++; sfx.multiplier(this.mult); }
      sfx.whoosh(); sfx.bell(520 + this.n * 60, 0.7, 0.1);
      app.message('¡Rodillo <b>' + this.n + '</b>!' + (this.inFree ? ' Multiplicador <b>x' + this.mult + '</b>' : ''));
      const add = await this.spinReels(this.n - 1, this.n, null);
      grid[this.n - 1] = add[this.n - 1];
      // Ayuda de prueba: fuerza que el premio continúe
      if (forceGrow > 0 && this.n <= forceGrow) { const k = 'sun'; grid[this.n - 1][1] = { k }; this.reels[this.n - 1].setCell(0, 1, grid[this.n - 1][1]); }
    }
    const g = grid.slice(0, this.n);
    const wins = evalWays(g, bet);
    const mult = this.inFree ? this.mult : 1;
    let total = wins.reduce((a, w) => a + w.win, 0) * mult;
    if (wins.length) {
      wins.forEach(w => { w.win *= mult; });
      this.wins = wins; this.winT = 0;
      sfx.win(total >= bet * 5 ? 2 : 0); app.addWin(total);
      app.flyCoins(this.gx + this.cw * this.n / 2, this.gy + this.ch * 1.5, Math.min(16, 3 + wins.length * 2));
      app.message(wins.map(w => w.ways + '× ' + labelOf(w.k) + ' (' + w.n + ')').join(' · ') + (mult > 1 ? ' · x' + mult : '') + ' = <b>' + app.fmt(total) + '</b>');
    } else if (!this.inFree) app.message(this.hint);
    // Jackpot por rodillos alcanzados
    const jp = JP_BY_REELS(this.n);
    if (jp) { await app.wait(wins.length ? 1200 : 400); this.wins = null; total += await app.awardJackpot(jp); }
    if (this.inFree) this.fsTotal += total;
    // Portales
    let portals = g.flat().filter(s => s.k === 'portal').length;
    if (!free && !this.inFree && portals < 3 && (Math.random() < MYSTERY_P || app._forceMystery)) {
      app._forceMystery = false;
      await app.wait(wins.length ? 900 : 300);
      this.wins = null;
      await app.mysteryIntro('Se abren portales en el espacio');
      const cand = [];
      g.forEach((col, c) => col.forEach((s, r) => { if (s.k !== 'portal') cand.push([c, r]); }));
      for (let i = cand.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [cand[i], cand[j]] = [cand[j], cand[i]]; }
      while (portals < 3 && cand.length) {
        const [c, r] = cand.pop(), s = { k: 'portal' };
        g[c][r] = s; this.reels[c].setCell(0, r, s); portals++;
        app.strike(this.gx + c * this.cw + this.cw / 2, this.gy + r * this.ch + this.ch / 2, '#b8a0ff');
        sfx.bell(740 + portals * 110, 0.9, 0.12);
        await app.wait(320);
      }
    }
    if (portals >= 3) {
      await app.wait(wins.length ? 1100 : 400);
      this.wins = null;
      { const v = await app.bonusPay(portals, bet, 'portales'); total += v; if (this.inFree) this.fsTotal += v; }
      if (this.inFree) {
        this.freeLeft += 4; sfx.featureStart();
        await app.banner('+4 GIROS', 'Otro portal se abre', { color: '#9a7aff', ms: 1500 });
      } else await this.startFree();
    }
    if (wins.length && !this.inFree) await app.wait(Math.min(1800, 700 + wins.length * 300));
    else if (wins.length) await app.wait(800);
    const celebrated = this.inFree;
    if (this.inFree && this.freeLeft === 0 && free) {
      await app.wait(400);
      const fs = this.fsTotal;
      this.inFree = false; this.mult = 1; this.wins = null;
      if (fs > 0) await app.celebrate(fs, bet, 'VIAJE INTERESTELAR');
      sfx.stopMusic(); sfx.music(Galaxy.music);
      app.message('Giros gratis: <b>' + app.fmt(fs) + '</b>');
    }
    app.setSpinLabel(this.freeLeft ? 'GRATIS' : 'GIRAR', this.freeLeft ? this.freeLeft + ' restantes' : '');
    return { win: total, celebrated };
  }
  async startFree() {
    const app = this.app, sfx = app.sfx;
    sfx.featureStart(); app.flash('#c8b8ff', 0.6); app.shake(true);
    this.inFree = true; this.freeLeft = 8; this.fsTotal = 0; this.mult = 1;
    sfx.stopMusic();
    await app.banner('8 GIROS GRATIS', 'Cada rodillo nuevo suma +1 al multiplicador', { color: '#9a7aff', ms: 2400 });
    sfx.music('bonus');
    app.setSpinLabel('GRATIS', this.freeLeft + ' restantes');
  }
  async buyFree() { await this.startFree(); return { win: 0, celebrated: true }; }
  slam() { this.reels.forEach(r => r.slam()); }
  info(bet, fmt) {
    const ic = i => '<i class="ico" style="background-position:' + (i % 6) * 20 + '% ' + Math.floor(i / 6) * 25 + '%"></i>';
    return '<h3>Cómo se juega</h3><ul><li>Empieza con <b>3 rodillos de 3 filas</b>. Paga cualquier símbolo repetido en rodillos contiguos desde la izquierda, en cualquier fila (formas).</li>' +
      '<li><b>Rodillos infinitos</b>: si un premio llega hasta el <b>último rodillo</b>, aparece <b>uno nuevo a la derecha</b> y gira solo. Se repite mientras el premio siga llegando al final, hasta <b>15 rodillos</b>. Cuantos más rodillos alcance un premio, más paga.</li>' +
      '<li><b>Planeta WILD</b> (rodillos 2 en adelante) sustituye a todos menos el portal.</li>' +
      '<li>Jackpots por rodillos alcanzados: <b>8 = MINI · 10 = MINOR · 12 = MAJOR · 15 = GRAND</b>.</li>' +
      '<li><b>3+ portales</b> = <b>8 giros gratis</b>: cada rodillo nuevo suma <b>+1 al multiplicador</b>, que no se reinicia durante el bono. 3 portales en giros gratis = +4.</li>' +
      '<li><b>BONO</b>: compra los giros gratis por 35× la apuesta.</li></ul>' +
      '<h3>Pago por forma (apuesta ' + fmt(bet) + ') · 3 / 5 / 8 / 15 rodillos</h3><table>' +
      Object.keys(P).map(k => '<tr><td>' + ic(ICON[k]) + '</td><td>' + labelOf(k) + '</td><td>' + [3, 5, 8, 15].map(n => money2(P[k] * NMULT[n] * SCALE * bet / 10)).join(' · ') + '</td></tr>').join('') + '</table>';
  }
}
function money2(v) { return '$' + v.toLocaleString('es-CL', { maximumFractionDigits: v < 10 ? 2 : 0 }); }
function labelOf(k) { return { sun: 'Estrella', diamond: 'Diamante', rstar: 'Estrella roja', bstar: 'Estrella azul', gstar: 'Estrella verde', snow: 'Cristal', K: 'K', Q: 'Q', J: 'J', ten: '10' }[k]; }
