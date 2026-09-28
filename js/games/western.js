// DUELO DEL OESTE · 5x3, 20 líneas, pueblo del desierto de noche.
// WILDS CAMINANTES: cada cartel de SE BUSCA que cae da un RE-GIRO GRATIS y en cada re-giro
// avanza un rodillo a la izquierda hasta salir del tablero. Mientras quede alguno en pantalla
// se sigue re-girando. 3/4/5/6+ forajidos a la vez = MINI/MINOR/MAJOR/GRAND.
// 3+ estrellas de sheriff = 10 giros gratis donde cada forajido en una línea la multiplica x2.
import { S, sym, glow, goldText, roundRect, ease, rand, FONT, makeCanvas } from '../gfx.js?v=36';
import { ReelSet, LINES_5x3, weighted } from '../reels.js?v=36';

const COLS = 5, ROWS = 3;
export const PAY = {
  bull: [0, 0, 0, 50, 150, 500], diamond: [0, 0, 0, 40, 120, 400], bell: [0, 0, 0, 30, 90, 300], seven: [0, 0, 0, 25, 75, 250],
  K: [0, 0, 0, 10, 30, 100], Q: [0, 0, 0, 10, 25, 80], J: [0, 0, 0, 5, 20, 60], ten: [0, 0, 0, 5, 15, 50]
};
export const SCALE = 0.25;
export const WEIGHTS = { bull: 3, diamond: 4, bell: 5, seven: 5, K: 9, Q: 9, J: 10, ten: 10, wild: 0.75, star: 1.25 };
export const FREE_W = Object.assign({}, WEIGHTS, { wild: 1.15, star: 0.8 });
const ICON = { bull: S.BULL, diamond: S.DIAMOND, bell: S.BELL, seven: S.SEVEN, K: S.K, Q: S.Q, J: S.J, ten: S.TEN };
export const MYSTERY_P = 1 / 150;
export const JP_BY_COUNT = n => n >= 6 ? 'grand' : n === 5 ? 'major' : n === 4 ? 'minor' : n === 3 ? 'mini' : null;
export function pickSym(free) { return { k: weighted(free ? FREE_W : WEIGHTS) }; }
export function pickPlain(free) { let s; do s = pickSym(free); while (s.k === 'wild'); return s; }

// Líneas: el wild sustituye a todo menos la estrella; en giros gratis cada wild de la línea la duplica
export function evalLines(g, lineBet, free) {
  const wins = [];
  LINES_5x3.forEach((L, li) => {
    const s = L.map((r, c) => g[c][r].k);
    const base = s.find(k => k !== 'wild');
    let n = 0, wilds = 0;
    const k = base || 'bull';
    if (base && !PAY[base]) return;
    while (n < COLS && (s[n] === k || s[n] === 'wild')) { if (s[n] === 'wild') wilds++; n++; }
    const p = PAY[k][n] * SCALE;
    if (p) wins.push({ li, line: L, n, k, win: p * lineBet * (free && wilds ? Math.pow(2, wilds) : 1) });
  });
  return wins;
}

// Íconos propios dibujados (cacheados por tamaño)
const cache = new Map();
function wantedIcon(size) {
  size = Math.round(size); const key = 'w' + size;
  if (cache.has(key)) return cache.get(key);
  const c = makeCanvas(size, size), x = c.getContext('2d'), m = size * 0.08, w = size - 2 * m, h = size - 2 * m;
  let g = x.createLinearGradient(0, m, 0, m + h);
  g.addColorStop(0, '#f6e2b0'); g.addColorStop(1, '#d6b070');
  x.save(); x.translate(size / 2, size / 2); x.rotate(-0.04); x.translate(-size / 2, -size / 2);
  x.fillStyle = g; x.fillRect(m, m, w, h);
  x.strokeStyle = '#7a4a1a'; x.lineWidth = size * 0.03; x.strokeRect(m, m, w, h);
  // bordes quemados
  x.fillStyle = 'rgba(120,70,20,0.25)'; x.fillRect(m, m, w, size * 0.04); x.fillRect(m, m + h - size * 0.04, w, size * 0.04);
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#4a2408';
  x.font = '900 ' + size * 0.15 + 'px ' + FONT; x.fillText('SE BUSCA', size / 2, m + h * 0.14, w * 0.9);
  // Silueta con sombrero
  const cx = size / 2, cy = m + h * 0.48;
  x.fillStyle = '#3a1c06';
  x.beginPath(); x.ellipse(cx, cy - size * 0.09, size * 0.24, size * 0.045, 0, 0, 7); x.fill();
  x.beginPath(); x.moveTo(cx - size * 0.1, cy - size * 0.1); x.lineTo(cx - size * 0.08, cy - size * 0.2); x.lineTo(cx + size * 0.08, cy - size * 0.2); x.lineTo(cx + size * 0.1, cy - size * 0.1); x.fill();
  x.beginPath(); x.arc(cx, cy, size * 0.085, 0, 7); x.fill();
  x.fillStyle = '#b8231a'; x.fillRect(cx - size * 0.085, cy + size * 0.02, size * 0.17, size * 0.045);
  // WILD
  x.font = '900 ' + size * 0.2 + 'px ' + FONT;
  x.lineWidth = size * 0.04; x.strokeStyle = '#fff2c8'; x.strokeText('WILD', cx, m + h * 0.84);
  x.fillStyle = '#b8231a'; x.fillText('WILD', cx, m + h * 0.84);
  x.restore();
  cache.set(key, c); return c;
}
function starIcon(size) {
  size = Math.round(size); const key = 's' + size;
  if (cache.has(key)) return cache.get(key);
  const c = makeCanvas(size, size), x = c.getContext('2d'), cx = size / 2, cy = size / 2, R = size * 0.46, r = R * 0.52;
  const pts = [];
  for (let i = 0; i < 12; i++) { const a = -Math.PI / 2 + i * Math.PI / 6, rr = i % 2 ? r : R * 0.86; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  let g = x.createRadialGradient(cx - R * 0.3, cy - R * 0.3, 1, cx, cy, R);
  g.addColorStop(0, '#fff6c8'); g.addColorStop(0.45, '#f0b429'); g.addColorStop(1, '#8a5206');
  x.fillStyle = g; x.beginPath(); pts.forEach(([px, py], i) => i ? x.lineTo(px, py) : x.moveTo(px, py)); x.closePath(); x.fill();
  x.lineWidth = size * 0.025; x.strokeStyle = '#5a3000'; x.stroke();
  // bolitas en las puntas
  for (let i = 0; i < 12; i += 2) { const [px, py] = pts[i]; x.fillStyle = '#ffd24a'; x.beginPath(); x.arc(px, py, size * 0.045, 0, 7); x.fill(); x.stroke(); }
  x.fillStyle = '#7a4206'; x.beginPath(); x.arc(cx, cy, r * 0.8, 0, 7); x.fill();
  x.font = '900 ' + size * 0.12 + 'px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#ffe9a8';
  x.fillText('SHERIFF', cx, cy + 1, r * 1.5);
  cache.set(key, c); return c;
}

export default class Western {
  static id = 'western';
  static name = 'Duelo del Oeste';
  static music = 'western';
  static lobby = {
    icons: [S.BULL, S.SEVEN, S.BELL], c1: '#d9822b', c2: '#2a1030', mechanic: 'Wilds caminantes con re-giros',
    desc: 'Pueblo del desierto. Cada forajido WILD da un re-giro y camina un rodillo a la izquierda hasta salir. Varios a la vez = jackpots.'
  };
  constructor(app) {
    this.app = app; this.id = Western.id;
    this.hint = 'Cada forajido <b>WILD</b> da un <b>re-giro</b> y camina a la izquierda. 3 estrellas = <b>giros gratis</b>.';
    this.reels = new ReelSet({ cols: COLS, rows: ROWS, pick: () => pickPlain(this.inFree), drawSym: (x, s, px, py, w, h, o) => this.drawSym(x, s, px, py, w, h, o) });
    this.walkers = [];
    this.freeLeft = 0; this.inFree = false; this.fsTotal = 0;
    this.wins = null; this.winT = 0; this.time = 0; this.dust = [];
    this.buy = { label: 'BONO', sub: b => app.fmt(b * 40), cost: b => b * 40, run: () => this.buyFree() };
  }
  get extra() { return this.inFree ? null : this.buy; }
  get freeRound() { return this.freeLeft > 0; }
  get keepWin() { return this.inFree; }
  get locked() { return this.inFree; }
  get animating() { return true; }

  resize(W, H) {
    this.W = W; this.H = H;
    const top = 36;
    const cw = Math.min((W - 30) / COLS, (H - top - 20) / ROWS * 1.1);
    const ch = Math.min(cw * 0.95, (H - top - 20) / ROWS);
    this.cw = cw; this.ch = ch; this.top = top;
    this.gx = (W - cw * COLS) / 2; this.gy = top + (H - top - ch * ROWS) / 2;
    this.reels.layout(this.gx, this.gy, cw, ch);
    this.bgCache = null;
  }
  // Escenario: cielo nocturno, luna, mesetas, cactus y pueblo (pre-renderizado)
  renderBg() {
    const { W, H, gx, gy, cw, ch } = this, dpr = this.app.dpr, L = this.app.light;
    const cnv = makeCanvas(W * dpr, H * dpr), x = cnv.getContext('2d');
    x.scale(dpr, dpr);
    let g = x.createLinearGradient(0, 0, 0, H);
    if (L) { g.addColorStop(0, '#8fc8ff'); g.addColorStop(0.55, '#ffd9a0'); g.addColorStop(1, '#e0a060'); }
    else { g.addColorStop(0, '#0a0a2a'); g.addColorStop(0.45, '#3a1a4a'); g.addColorStop(0.7, '#b8502a'); g.addColorStop(1, '#3a1a0a'); }
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    if (!L) for (let i = 0; i < 90; i++) { x.fillStyle = 'rgba(255,255,255,' + rand(0.3, 0.9) + ')'; x.fillRect(Math.random() * W, Math.random() * H * 0.5, 1.4, 1.4); }
    // Luna (o sol en modo claro)
    const mx = W * 0.8, my = H * 0.14, mr = Math.min(W, H) * 0.07;
    x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.6; x.drawImage(glow(L ? 'rgba(255,230,150,1)' : 'rgba(220,230,255,1)', 64), mx - mr * 3, my - mr * 3, mr * 6, mr * 6); x.restore();
    x.fillStyle = L ? '#fff3c0' : '#f4f0e0'; x.beginPath(); x.arc(mx, my, mr, 0, 7); x.fill();
    if (!L) { x.fillStyle = 'rgba(180,170,150,0.5)'; [[0.3, -0.2, 0.2], [-0.3, 0.25, 0.15], [0.1, 0.4, 0.1]].forEach(([a, b, s]) => { x.beginPath(); x.arc(mx + a * mr, my + b * mr, s * mr, 0, 7); x.fill(); }); }
    // Mesetas
    const mesa = (x0, w, h, col) => { const y = H * 0.72; x.fillStyle = col; x.beginPath(); x.moveTo(x0, y); x.lineTo(x0 + w * 0.15, y - h); x.lineTo(x0 + w * 0.85, y - h); x.lineTo(x0 + w, y); x.fill(); };
    mesa(-W * 0.1, W * 0.5, H * 0.16, L ? '#c07040' : '#4a1e14'); mesa(W * 0.55, W * 0.6, H * 0.12, L ? '#b06038' : '#3e180e');
    // Suelo
    g = x.createLinearGradient(0, H * 0.72, 0, H);
    g.addColorStop(0, L ? '#e0b070' : '#5a2c10'); g.addColorStop(1, L ? '#c08848' : '#1e0c04');
    x.fillStyle = g; x.fillRect(0, H * 0.72, W, H * 0.28);
    // Pueblo: fachadas del saloon
    const town = L ? '#6a3a1a' : '#1a0a04';
    x.fillStyle = town;
    [[0.02, 0.1, 0.12], [0.12, 0.08, 0.16], [0.78, 0.1, 0.14], [0.88, 0.12, 0.11]].forEach(([a, w, h]) => {
      const bx = W * a, bw = W * w, bh = H * h, by = H * 0.74 - bh;
      x.fillRect(bx, by, bw, bh); x.fillRect(bx + bw * 0.15, by - bh * 0.18, bw * 0.7, bh * 0.2);
      x.fillStyle = L ? 'rgba(255,220,120,0.6)' : 'rgba(255,190,80,0.8)';
      x.fillRect(bx + bw * 0.2, by + bh * 0.3, bw * 0.2, bh * 0.2); x.fillRect(bx + bw * 0.6, by + bh * 0.3, bw * 0.2, bh * 0.2);
      x.fillStyle = town;
    });
    // Cactus
    const cactus = (cx, base, h) => {
      x.strokeStyle = L ? '#2f6a24' : '#0e2a10'; x.lineCap = 'round'; x.lineWidth = h * 0.16;
      x.beginPath(); x.moveTo(cx, base); x.lineTo(cx, base - h); x.stroke();
      x.lineWidth = h * 0.11;
      x.beginPath(); x.moveTo(cx, base - h * 0.45); x.lineTo(cx - h * 0.28, base - h * 0.45); x.lineTo(cx - h * 0.28, base - h * 0.75); x.stroke();
      x.beginPath(); x.moveTo(cx, base - h * 0.6); x.lineTo(cx + h * 0.25, base - h * 0.6); x.lineTo(cx + h * 0.25, base - h * 0.85); x.stroke();
    };
    cactus(W * 0.08, H * 0.97, H * 0.16); cactus(W * 0.93, H * 0.95, H * 0.13); cactus(W * 0.3, H * 0.99, H * 0.08);
    // Marco de madera con clavos
    const bw = cw * COLS, bh = ch * ROWS;
    roundRect(x, gx - 12, gy - 12, bw + 24, bh + 24, 8);
    g = x.createLinearGradient(0, gy - 12, 0, gy + bh + 12);
    g.addColorStop(0, '#a8662a'); g.addColorStop(0.5, '#6a3a12'); g.addColorStop(1, '#9a5a22');
    x.fillStyle = g; x.fill();
    x.strokeStyle = 'rgba(40,20,5,0.5)'; x.lineWidth = 1;
    for (let i = 0; i < 5; i++) { const yy = gy - 12 + (bh + 24) * (i + 0.5) / 5; x.beginPath(); x.moveTo(gx - 12, yy); x.lineTo(gx - 2, yy + 3); x.stroke(); x.beginPath(); x.moveTo(gx + bw + 2, yy); x.lineTo(gx + bw + 12, yy + 3); x.stroke(); }
    x.fillStyle = '#d8c8a8';
    [[gx - 6, gy - 6], [gx + bw + 6, gy - 6], [gx - 6, gy + bh + 6], [gx + bw + 6, gy + bh + 6]].forEach(([px, py]) => { x.beginPath(); x.arc(px, py, 2.5, 0, 7); x.fill(); });
    roundRect(x, gx - 3, gy - 3, bw + 6, bh + 6, 5);
    g = x.createLinearGradient(0, gy, 0, gy + bh);
    if (L) { g.addColorStop(0, '#fff6e6'); g.addColorStop(1, '#f0dcc0'); } else { g.addColorStop(0, '#24120a'); g.addColorStop(0.5, '#3a1e0e'); g.addColorStop(1, '#1c0c04'); }
    x.fillStyle = g; x.fill();
    x.strokeStyle = L ? 'rgba(120,70,30,0.3)' : 'rgba(255,190,120,0.18)';
    for (let c = 1; c < COLS; c++) { x.beginPath(); x.moveTo(gx + c * cw, gy); x.lineTo(gx + c * cw, gy + bh); x.stroke(); }
    return cnv;
  }
  drawSym(x, s, px, py, w, h, o) {
    const dpr = this.app.dpr, size = Math.min(w, h) * 0.9;
    let sc = 1, a = 1;
    if (o && o.fx) { sc = o.fx.scale || 1; a = o.fx.alpha == null ? 1 : o.fx.alpha; }
    const d = size * sc, cx = px + w / 2, cy = py + h / 2;
    x.globalAlpha = a;
    if (s.k === 'star') {
      if (!(o && o.blur)) { x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = a * (0.35 + 0.2 * Math.sin(this.time * 5)); x.drawImage(glow('rgba(255,200,60,1)', 64), cx - w * 0.6, cy - h * 0.6, w * 1.2, h * 1.2); x.restore(); x.globalAlpha = a; }
      x.drawImage(starIcon(size * dpr), cx - d / 2, cy - d / 2, d, d);
    } else if (s.k === 'wild') x.drawImage(wantedIcon(size * dpr), cx - d / 2, cy - d / 2, d, d);
    else if (o && o.blur) x.drawImage(sym(ICON[s.k], size * dpr, 'b'), cx - d / 2, cy - d * 0.675, d, d * 1.35);
    else x.drawImage(sym(ICON[s.k], size * dpr), cx - d / 2, cy - d / 2, d, d);
    x.globalAlpha = 1;
  }
  update(dt) {
    this.time += dt; this.reels.update(dt);
    if (this.wins) this.winT += dt;
    this.walkers.forEach(w => { if (w.mv < 1) w.mv = Math.min(1, w.mv + dt * 2.5 * this.app.speed); w.t += dt; });
    for (let i = this.dust.length - 1; i >= 0; i--) { const d = this.dust[i]; d.t += dt; d.x += d.vx * dt; d.y += d.vy * dt; if (d.t > d.life) this.dust.splice(i, 1); }
  }
  draw(x) {
    if (!this.W) return; // aún sin medidas (primer cuadro)
    const { gx, gy, cw, ch, W, time } = this, dpr = this.app.dpr, bw = cw * COLS;
    if (!this.bgCache) this.bgCache = this.renderBg();
    x.drawImage(this.bgCache, 0, 0, W, this.H);
    const title = this.inFree ? 'GIROS GRATIS · ' + this.freeLeft + ' · FORAJIDOS x2' : (this.walkers.length ? 'RE-GIRO · ' + this.walkers.length + ' FORAJIDO' + (this.walkers.length > 1 ? 'S' : '') : 'DUELO DEL OESTE · 20 LÍNEAS');
    goldText(x, title, W / 2, gy - this.top / 2 - 4, Math.min(15, bw * 0.045), { maxW: bw * 0.9 });
    this.reels.draw(x, (c, r) => this.cellFx(c, r));
    // Forajidos caminantes (encima de los rodillos)
    x.save(); x.beginPath(); x.rect(gx - 3, gy - 3, bw + 6, ch * ROWS + 6); x.clip();
    this.walkers.forEach(w => {
      const c = w.from + (w.c - w.from) * ease.outCubic(w.mv), px = gx + c * cw, py = gy + w.r * ch;
      x.fillStyle = this.app.light ? 'rgba(255,240,210,0.95)' : 'rgba(40,18,6,0.92)'; x.fillRect(px + 1, py + 1, cw - 2, ch - 2);
      x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.45 + 0.2 * Math.sin(time * 5 + w.r);
      x.drawImage(glow('rgba(255,140,40,1)', 64), px - cw * 0.2, py - ch * 0.2, cw * 1.4, ch * 1.4); x.restore();
      const bob = w.mv < 1 ? Math.abs(Math.sin(w.mv * Math.PI * 3)) * ch * 0.06 : 0;
      const size = Math.min(cw, ch) * 0.92, d = size * (w.t < 0.3 ? ease.outBack(w.t / 0.3) : 1);
      x.drawImage(wantedIcon(size * dpr), px + cw / 2 - d / 2, py + ch / 2 - d / 2 - bob, d, d);
      if (this.inFree) {
        roundRect(x, px + cw - 28, py + 3, 25, 16, 8); x.fillStyle = '#ffd24a'; x.fill();
        x.font = '900 11px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#3a1000'; x.fillText('x2', px + cw - 15.5, py + 11.5);
      }
    });
    x.restore();
    // Polvo al caminar
    this.dust.forEach(d => { x.globalAlpha = 0.5 * (1 - d.t / d.life); x.fillStyle = '#d8b080'; x.beginPath(); x.arc(d.x, d.y, d.s * (1 + d.t * 2), 0, 7); x.fill(); });
    x.globalAlpha = 1;
    if (this.wins) this.drawWins(x);
  }
  cellFx(c, r) {
    if (!this.wins || !this.wins.length) return null;
    const w = this.wins[Math.floor(this.winT / 1.1) % this.wins.length];
    return w.cells.some(([cc, rr]) => cc === c && rr === r) ? { scale: 1 + 0.07 * Math.sin(this.winT * 11) } : { alpha: 0.45 };
  }
  drawWins(x) {
    const w = this.wins[Math.floor(this.winT / 1.1) % this.wins.length], { gx, gy, cw, ch } = this;
    x.save(); x.globalCompositeOperation = 'lighter'; x.lineJoin = 'round';
    x.beginPath(); w.line.forEach((r, c) => { const px = gx + c * cw + cw / 2, py = gy + r * ch + ch / 2; c ? x.lineTo(px, py) : x.moveTo(gx - 6, py); });
    x.lineTo(gx + cw * COLS + 6, gy + w.line[COLS - 1] * ch + ch / 2);
    x.strokeStyle = 'rgba(255,140,40,0.45)'; x.lineWidth = 12; x.stroke(); x.strokeStyle = '#fff2b0'; x.lineWidth = 3; x.stroke();
    x.restore();
    goldText(x, this.app.fmt(w.win), gx + cw * 2.5, gy + ch * 1.5, Math.min(36, cw * 0.42), { glowColor: '#ff8a2e' });
  }
  cellCenter(c, r) { return [this.gx + c * this.cw + this.cw / 2, this.gy + r * this.ch + this.ch / 2]; }

  async play(bet) {
    const app = this.app, sfx = app.sfx, lineBet = bet / 20;
    this.wins = null;
    const free = this.freeLeft > 0;
    if (free) this.freeLeft--;
    app.setSpinLabel(free ? 'GRATIS' : 'PARAR', free ? this.freeLeft + ' restantes' : '');
    let total = 0, maxWalk = 0, maxStars = 0, respin = 0;
    do {
      // Los forajidos avanzan un rodillo a la izquierda; los del rodillo 1 se van
      if (respin) {
        this.wins = null;
        this.walkers.forEach(w => { w.from = w.c; w.c--; w.mv = 0; });
        const gone = this.walkers.filter(w => w.c < 0);
        this.walkers = this.walkers.filter(w => w.c >= 0);
        gone.forEach(w => { const [px, py] = this.cellCenter(0, w.r); app.burst(px - this.cw * 0.6, py, 10, { type: 'spark', color: '#ffb060', speed: 200, size: 8 }); });
        this.walkers.forEach(w => { const [px, py] = this.cellCenter(w.from, w.r); for (let i = 0; i < 5; i++) this.dust.push({ x: px + rand(-10, 10), y: py + this.ch * 0.4, vx: rand(10, 40), vy: rand(-20, -5), s: rand(2, 4), t: 0, life: 0.6 }); });
        sfx.thud(1); sfx.whoosh();
        app.setSpinLabel('RE-GIRO', this.walkers.length ? this.walkers.length + ' forajido' + (this.walkers.length > 1 ? 's' : '') : '');
        await app.wait(450);
      }
      const final = [];
      for (let c = 0; c < COLS; c++) { final.push([]); for (let r = 0; r < ROWS; r++) final[c].push(pickSym(this.inFree)); }
      if (app._force && !respin) { app._force = false; [0, 2, 4].forEach(c => { final[c][1] = { k: 'star' }; }); }
      if (app._forceWild && !respin) { app._forceWild = false; [2, 3, 4].forEach((c, i) => { final[c][i] = { k: 'wild' }; }); }
      // Bajo los forajidos no cae otro wild
      this.walkers.forEach(w => { if (final[w.c][w.r].k === 'wild') final[w.c][w.r] = pickPlain(this.inFree); });
      sfx.spinStart(app.speed >= 2);
      this.reels.start(app.speed);
      await this.reels.stopTo(final, {
        onStop: (c, last) => {
          sfx.reelStop(c, last);
          final[c].forEach((s, r) => {
            const [px, py] = this.cellCenter(c, r);
            if (s.k === 'wild') { sfx.thud(3); sfx.zap(0.2, 0.15); app.burst(px, py, 14, { type: 'spark', color: '#ff9a40', speed: 260, size: 10 }); }
            if (s.k === 'star') { sfx.bell(784 + c * 110, 0.9, 0.12); app.burst(px, py, 12, { type: 'spark', color: '#ffd24a', speed: 240, size: 10 }); }
          });
        }
      });
      // Los wilds nuevos se vuelven forajidos caminantes
      final.forEach((col, c) => col.forEach((s, r) => {
        if (s.k !== 'wild') return;
        this.walkers.push({ c, r, from: c, mv: 1, t: 0 });
        const p = pickPlain(this.inFree); final[c][r] = p; this.reels.setCell(c, r, p);
      }));
      const grid = final.map((col, c) => col.map((s, r) => this.walkers.some(w => w.c === c && w.r === r) ? { k: 'wild' } : s));
      maxWalk = Math.max(maxWalk, this.walkers.length);
      maxStars = Math.max(maxStars, grid.flat().filter(s => s.k === 'star').length);
      const wins = evalLines(grid, lineBet, this.inFree).map(w => ({ ...w, cells: w.line.slice(0, w.n).map((r, c) => [c, r]) }));
      const sum = wins.reduce((a, w) => a + w.win, 0);
      if (wins.length) {
        this.wins = wins; this.winT = 0;
        sfx.win(sum >= bet * 5 ? 2 : 0); app.addWin(sum); total += sum;
        app.flyCoins(this.gx + this.cw * 2.5, this.gy + this.ch * 1.5, Math.min(14, 3 + wins.length * 2));
        app.message((respin ? 'Re-giro ' + respin + ' · ' : '') + 'Premio: <b>' + app.fmt(sum) + '</b>');
        await app.wait(Math.min(1600, 600 + wins.length * 250));
      } else if (!respin && !this.walkers.length && !this.inFree) app.message(this.hint);
      if (this.walkers.length) app.message('¡' + this.walkers.length + ' forajido' + (this.walkers.length > 1 ? 's' : '') + ' en el pueblo! <b>Re-giro gratis</b>');
      respin++;
    } while (this.walkers.length && respin < 40);
    this.walkers = [];
    // Jackpot por forajidos simultáneos
    const jp = JP_BY_COUNT(maxWalk);
    if (jp) { await app.wait(300); total += await app.awardJackpot(jp); }
    if (this.inFree) this.fsTotal += total;
    // Estrellas de sheriff
    let stars = maxStars;
    if (!free && !this.inFree && stars < 3 && (Math.random() < MYSTERY_P || app._forceMystery)) {
      app._forceMystery = false;
      await app.wait(300);
      this.wins = null;
      await app.mysteryIntro('El sheriff reparte estrellas');
      const cols = [0, 1, 2, 3, 4];
      for (let i = cols.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [cols[i], cols[j]] = [cols[j], cols[i]]; }
      const grid = this.reels.grid;
      stars = grid.flat().filter(s => s.k === 'star').length;
      while (stars < 3 && cols.length) {
        const c = cols.pop(); if (grid[c].some(s => s.k === 'star')) continue;
        const r = Math.random() * 3 | 0, s = { k: 'star' };
        this.reels.setCell(c, r, s); stars++;
        const [px, py] = this.cellCenter(c, r);
        app.strike(px, py, '#ffd24a'); sfx.bell(784 + stars * 110, 0.9, 0.12);
        await app.wait(320);
      }
    }
    if (stars >= 3) {
      await app.wait(600);
      this.wins = null;
      if (this.inFree) {
        this.freeLeft += 5; sfx.featureStart();
        await app.banner('+5 GIROS', 'Llega la caballería', { color: '#ffb03a', ms: 1500 });
      } else await this.startFree();
    }
    const celebrated = this.inFree;
    if (this.inFree && this.freeLeft === 0 && free) {
      await app.wait(400);
      const fs = this.fsTotal;
      this.inFree = false; this.wins = null;
      if (fs > 0) await app.celebrate(fs, bet, 'DUELO AL ATARDECER');
      sfx.stopMusic(); sfx.music(Western.music);
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
    await app.banner('10 GIROS GRATIS', 'Más forajidos y cada uno duplica su línea', { color: '#ff9a2e', ms: 2400 });
    sfx.music('bonus');
    app.setSpinLabel('GRATIS', this.freeLeft + ' restantes');
  }
  async buyFree() { await this.startFree(); return { win: 0, celebrated: true }; }
  slam() { this.reels.slam(); }
  info(bet, fmt) {
    const ic = i => '<i class="ico" style="background-position:' + (i % 6) * 20 + '% ' + Math.floor(i / 6) * 25 + '%"></i>', lb = bet / 20;
    return '<h3>Cómo se juega</h3><ul><li><b>5 rodillos × 3 filas, 20 líneas</b>. Pagan 3+ iguales desde la izquierda.</li>' +
      '<li><b>Forajido WILD</b> (cartel SE BUSCA): sustituye a todo menos la estrella y da un <b>re-giro gratis</b>. En cada re-giro <b>camina un rodillo a la izquierda</b>; al salir del rodillo 1 se va. Mientras quede alguno en el tablero se sigue re-girando, y los nuevos que caen se suman.</li>' +
      '<li>Jackpots por forajidos <b>a la vez</b> en el tablero: <b>3 = MINI · 4 = MINOR · 5 = MAJOR · 6+ = GRAND</b>.</li>' +
      '<li><b>3+ estrellas de sheriff</b> = <b>10 giros gratis</b>: caen más forajidos y <b>cada uno duplica</b> la línea en la que participa (x2, x4, x8…). 3 estrellas en giros gratis = +5.</li>' +
      '<li><b>BONO</b>: compra los giros gratis por 40× la apuesta.</li></ul>' +
      '<h3>Pagos por línea (apuesta ' + fmt(bet) + ') · 3 / 4 / 5</h3><table>' +
      Object.keys(PAY).map(k => '<tr><td>' + ic(ICON[k]) + '</td><td>' + labelOf(k) + '</td><td>' + [3, 4, 5].map(n => fmt(PAY[k][n] * SCALE * lb)).join(' · ') + '</td></tr>').join('') + '</table>';
  }
}
function labelOf(k) { return { bull: 'Bisonte', diamond: 'Pepita', bell: 'Campana', seven: '7', K: 'K', Q: 'Q', J: 'J', ten: '10' }[k]; }
