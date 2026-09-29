// CAMINOS DEL DRAGÓN · 6 rodillos de ALTURA VARIABLE (estilo "megaways").
// En cada giro cada rodillo muestra de 2 a 7 símbolos: las formas de ganar cambian
// (hasta 7^6 = 117.649). La LLAMARADA (wild, rodillos 2-5) trae multiplicador x2/x3/x5
// que se multiplica en cada forma. 4+ perlas = giros gratis con TODOS los rodillos al
// máximo (117.649 formas) y llamaradas más frecuentes.
import { S, sym, ball, glow, goldText, roundRect, FONT } from '../gfx.js?v=46';
import { ReelSet, weighted } from '../reels.js?v=46';

const COLS = 6, MAXH = 7;
export const PAY = {
  geisha: [0, 0, 0, 10, 25, 60, 150], dragon: [0, 0, 0, 8, 20, 45, 100], rstar: [0, 0, 0, 5, 12, 30, 60], gstar: [0, 0, 0, 4, 10, 25, 50],
  K: [0, 0, 0, 2, 5, 10, 25], Q: [0, 0, 0, 2, 5, 10, 25], J: [0, 0, 0, 1, 3, 8, 20], ten: [0, 0, 0, 1, 3, 8, 20]
};
export const UNIT = 1 / 112;
const BASEW = { geisha: 3, dragon: 4, rstar: 6, gstar: 7, K: 10, Q: 10, J: 12, ten: 12 };
export function reelWeights(c, free) {
  const w = Object.assign({}, BASEW, { pearl: free ? 0.3 : 1.7 });
  if (c >= 1 && c <= 4) w.wild = free ? 0.9 : 1.5;
  return w;
}
const H_VALS = [2, 3, 4, 5, 6, 7], H_W = [10, 20, 25, 22, 15, 8];
export const MYSTERY_P = 1 / 140;
const ICON = { geisha: S.GEISHA, dragon: S.DRAGON, rstar: S.RSTAR, gstar: S.GSTAR, K: S.K, Q: S.Q, J: S.J, ten: S.TEN, wild: S.BURST };

export function pickSym(c, free) {
  const k = weighted(reelWeights(c, free));
  if (k === 'wild') { const q = Math.random(); return { k, m: q < 0.6 ? 2 : q < 0.9 ? 3 : 5 }; }
  return { k };
}
export function pickHeight() { let t = 0; H_W.forEach(w => t += w); let x = Math.random() * t; for (let i = 0; i < H_VALS.length; i++) { x -= H_W[i]; if (x < 0) return H_VALS[i]; } return 7; }
// g[col] = lista (altura variable). Cada wild cuenta según su multiplicador.
export function evalWays(g, bet) {
  const wins = [];
  for (const k in PAY) {
    let total = 1, n = 0; const cells = [];
    for (let c = 0; c < COLS; c++) {
      let sum = 0;
      g[c].forEach((s, r) => { if (s.k === k || (s.k === 'wild' && c > 0)) { sum += s.k === 'wild' ? s.m : 1; cells.push([c, r]); } });
      if (!sum) break;
      total *= sum; n++;
    }
    if (n >= 3 && PAY[k][n]) wins.push({ k, n, ways: total, cells: cells.filter(([c]) => c < n), win: PAY[k][n] * UNIT * bet * total });
  }
  return wins;
}
export const waysOf = hs => hs.reduce((a, h) => a * h, 1);

export default class Dragon {
  static id = 'dragon';
  static name = 'Caminos del Dragón';
  static music = 'orient';
  static lobby = {
    icons: [S.DRAGON, S.GEISHA, S.BURST], c1: '#e8423a', c2: '#2a0636', mechanic: 'Rodillos variables · hasta 117.649 formas',
    desc: 'Cada rodillo cambia de altura en cada giro (2 a 7 símbolos). Llamaradas con multiplicador y giros gratis con todos los rodillos al máximo.'
  };
  constructor(app) {
    this.app = app; this.id = Dragon.id;
    this.hint = 'Los rodillos cambian de altura: <b>hasta 117.649 formas</b>. 4 perlas = <b>giros gratis</b>.';
    const drawSym = (x, s, px, py, w, h, o) => this.drawSym(x, s, px, py, w, h, o);
    this.reels = [];
    this.heights = [];
    for (let c = 0; c < COLS; c++) {
      this.reels.push(new ReelSet({ cols: 1, rows: MAXH, pick: () => pickSym(c, this.inFree), drawSym }));
      this.heights.push(pickHeight());
    }
    this.freeLeft = 0; this.inFree = false; this.fsTotal = 0;
    this.wins = null; this.winT = 0; this.time = 0;
    this.buy = { label: 'GIROS', sub: b => app.fmt(b * 70), cost: b => b * 70, run: b => this.buyFree(b) };
  }
  get extra() { return this.inFree ? null : this.buy; }
  get freeRound() { return this.freeLeft > 0; }
  get keepWin() { return this.inFree; }
  get locked() { return this.inFree; }
  get spinning() { return this.reels.some(r => r.spinning); }
  get animating() { return this.spinning || !!this.wins || this.inFree; }

  resize(W, H) {
    this.W = W; this.H = H;
    const top = 34, bottom = 22;
    const cw = Math.min((W - 24) / COLS, (H - top - bottom) / 4.6);
    const bh = Math.min(H - top - bottom, cw * 5.2);
    this.cw = cw; this.bh = bh; this.top = top;
    this.gx = (W - cw * COLS) / 2; this.gy = top + (H - top - bottom - bh) / 2;
    this.heights.forEach((h, c) => this.setHeight(c, h));
  }
  // Cambia la cantidad de símbolos visibles de un rodillo
  setHeight(c, h) {
    const rs = this.reels[c], col = rs.columns[0];
    this.heights[c] = h; rs.rows = h;
    while (col.syms.length < h + 1) col.syms.push(rs.pick(0));
    col.syms.length = h + 1;
    rs.grid[0] = col.syms.slice(1);
    rs.layout(this.gx + c * this.cw, this.gy, this.cw, this.bh / h);
  }
  drawSym(x, s, px, py, w, h, o) {
    const dpr = this.app.dpr, size = Math.min(w * 0.9, h * 0.94);
    let sc = 1, a = 1;
    if (o && o.fx) { sc = o.fx.scale || 1; a = o.fx.alpha == null ? 1 : o.fx.alpha; }
    const d = size * sc, cx = px + w / 2, cy = py + h / 2;
    x.globalAlpha = a;
    if (s.k === 'pearl') {
      if (!(o && o.blur)) { x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = a * (0.4 + 0.2 * Math.sin(this.time * 5)); x.drawImage(glow('rgba(255,80,60,1)', 64), cx - size * 0.8, cy - size * 0.8, size * 1.6, size * 1.6); x.restore(); x.globalAlpha = a; }
      x.drawImage(ball('red', '龍', size * dpr), cx - d / 2, cy - d / 2, d, d);
    } else if (o && o.blur) x.drawImage(sym(ICON[s.k], size * dpr, 'b'), cx - d / 2, cy - d * 0.675, d, d * 1.35);
    else {
      x.drawImage(sym(ICON[s.k], size * dpr), cx - d / 2, cy - d / 2, d, d);
      if (s.k === 'wild') {
        const bw = Math.max(18, size * 0.5), bh = Math.max(13, size * 0.3);
        roundRect(x, cx - bw / 2, cy + d / 2 - bh, bw, bh, bh / 2); x.fillStyle = '#ffd24a'; x.fill(); x.strokeStyle = '#5a1a00'; x.lineWidth = 1.5; x.stroke();
        x.font = '900 ' + bh * 0.72 + 'px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#3a1000';
        x.fillText('x' + s.m, cx, cy + d / 2 - bh / 2 + 1);
      }
    }
    x.globalAlpha = 1;
  }
  update(dt) { this.time += dt; this.reels.forEach(r => r.update(dt)); if (this.wins) this.winT += dt; }
  draw(x) {
    if (!this.W) return; // aún sin medidas (primer cuadro)
    const { gx, gy, cw, bh, W } = this, bw = cw * COLS;
    // Tejado de pagoda
    x.save();
    let g = x.createLinearGradient(0, gy - this.top, 0, gy);
    g.addColorStop(0, '#ff6a4a'); g.addColorStop(1, '#7a0a14');
    x.fillStyle = g;
    x.beginPath(); x.moveTo(gx - 16, gy - 6); x.quadraticCurveTo(gx + bw * 0.2, gy - 14, W / 2 - bw * 0.3, gy - this.top + 4);
    x.lineTo(W / 2 + bw * 0.3, gy - this.top + 4); x.quadraticCurveTo(gx + bw * 0.8, gy - 14, gx + bw + 16, gy - 6); x.closePath(); x.fill();
    x.strokeStyle = '#ffd27a'; x.lineWidth = 1.5; x.stroke();
    x.restore();
    const ways = waysOf(this.heights);
    const title = (this.inFree ? 'GIROS GRATIS · ' + this.freeLeft + ' · ' : '') + ways.toLocaleString('es-CL') + ' FORMAS';
    goldText(x, title, W / 2, gy - this.top / 2 + 1, Math.min(15, bw * 0.045), { maxW: bw * 0.6 });
    // Marco
    roundRect(x, gx - 10, gy - 6, bw + 20, bh + 12, 10);
    g = x.createLinearGradient(gx, 0, gx + bw, 0);
    g.addColorStop(0, '#8a1010'); g.addColorStop(0.5, '#ffcf6a'); g.addColorStop(1, '#8a1010');
    x.fillStyle = g; x.fill();
    g = x.createLinearGradient(0, gy, 0, gy + bh);
    if (this.app.light) { g.addColorStop(0, '#fff6f0'); g.addColorStop(1, '#f2dcd6'); }
    else { g.addColorStop(0, '#2a0618'); g.addColorStop(0.5, '#43102a'); g.addColorStop(1, '#1c0310'); }
    x.fillStyle = g; x.fillRect(gx - 2, gy, bw + 4, bh);
    x.strokeStyle = this.app.light ? 'rgba(150,40,40,0.3)' : 'rgba(255,190,140,0.22)'; x.lineWidth = 1;
    for (let c = 0; c < COLS; c++) {
      if (c) { x.beginPath(); x.moveTo(gx + c * cw, gy); x.lineTo(gx + c * cw, gy + bh); x.stroke(); }
      // separadores de celdas según la altura del rodillo
      const h = this.heights[c], ch = bh / h;
      if (!this.reels[c].spinning) for (let r = 1; r < h; r++) { x.beginPath(); x.moveTo(gx + c * cw + 4, gy + r * ch); x.lineTo(gx + (c + 1) * cw - 4, gy + r * ch); x.stroke(); }
    }
    this.reels.forEach((rs, c) => rs.draw(x, (cc, r) => this.cellFx(c, r)));
    // Altura de cada rodillo bajo el tablero
    x.font = '800 ' + Math.min(13, cw * 0.28) + 'px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'top';
    this.heights.forEach((h, c) => { x.fillStyle = h === MAXH ? '#ffd24a' : 'rgba(255,230,200,0.75)'; x.fillText(String(h), gx + c * cw + cw / 2, gy + bh + 8); });
    if (this.wins) this.drawWins(x);
  }
  cellFx(c, r) {
    if (!this.wins || !this.wins.length) return null;
    const w = this.wins[Math.floor(this.winT / 1.2) % this.wins.length];
    return w.cells.some(([cc, rr]) => cc === c && rr === r) ? { scale: 1 + 0.07 * Math.sin(this.winT * 11) } : { alpha: 0.4 };
  }
  drawWins(x) {
    const w = this.wins[Math.floor(this.winT / 1.2) % this.wins.length], { gx, gy, cw, bh } = this;
    x.save(); x.globalCompositeOperation = 'lighter';
    w.cells.forEach(([c, r]) => { const ch = bh / this.heights[c]; x.strokeStyle = '#ffe07a'; x.lineWidth = 2; x.strokeRect(gx + c * cw + 2, gy + r * ch + 2, cw - 4, ch - 4); });
    x.restore();
    goldText(x, this.app.fmt(w.win), gx + cw * 3, gy + bh / 2, Math.min(38, cw * 0.55), { glowColor: '#ff5a3a' });
    x.font = '800 12px ' + FONT; x.fillStyle = '#ffe6d0'; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    x.fillText(w.n + ' rodillos · ' + w.ways.toLocaleString('es-CL') + (w.ways === 1 ? ' forma' : ' formas'), gx + cw * 3, gy + bh / 2 + 28);
  }
  cellCenter(c, r) { const ch = this.bh / this.heights[c]; return [this.gx + c * this.cw + this.cw / 2, this.gy + r * ch + ch / 2]; }

  async play(bet) {
    const app = this.app, sfx = app.sfx;
    this.wins = null;
    const free = this.freeLeft > 0;
    if (free) this.freeLeft--;
    app.setSpinLabel(free ? 'GRATIS' : 'PARAR', free ? this.freeLeft + ' restantes' : '');
    const hs = [], final = [];
    for (let c = 0; c < COLS; c++) {
      const h = this.inFree ? MAXH : pickHeight();
      hs.push(h); final.push([]);
      for (let r = 0; r < h; r++) final[c].push(pickSym(c, this.inFree));
    }
    if (app._force) { app._force = false; [0, 1, 3, 5].forEach(c => { final[c][0] = { k: 'pearl' }; }); }
    // Suspenso: 3 perlas en los primeros rodillos
    let pe = 0, anticFrom = -1;
    for (let c = 0; c < COLS - 1; c++) { pe += final[c].filter(s => s.k === 'pearl').length; if (pe >= 3 && anticFrom < 0) anticFrom = c + 1; }
    sfx.spinStart(app.speed >= 2);
    const sp = app.speed;
    let extra = 0;
    await Promise.all(this.reels.map((rs, c) => {
      rs.start(sp);
      this.setHeight(c, hs[c]);
      if (anticFrom >= 0 && c >= anticFrom) extra += 1.4 / Math.sqrt(sp);
      const pr = rs.stopTo([final[c]], {
        minTime: (0.6 + c * 0.18) / sp + extra,
        onStop: () => {
          sfx.reelStop(c, c === COLS - 1);
          if (this.reels.some(r => r.anticipating)) sfx.anticipation(true); else sfx.anticipation(false);
          final[c].forEach((s, r) => {
            const [px, py] = this.cellCenter(c, r);
            if (s.k === 'pearl') { sfx.bell(740 + c * 110, 0.9, 0.12); app.burst(px, py, 14, { type: 'spark', color: '#ff7a5a', speed: 260, size: 10 }); }
            if (s.k === 'wild') { sfx.fire(); app.burst(px, py, 12, { type: 'ember', color: '#ffb030', speed: 240, size: 9 }); }
          });
        }
      });
      if (anticFrom >= 0 && c >= anticFrom) rs.columns[0].antic = true;
      return pr;
    }));
    sfx.anticipation(false);
    const wins = evalWays(final, bet);
    let total = wins.reduce((a, w) => a + w.win, 0);
    if (wins.length) {
      this.wins = wins; this.winT = 0;
      sfx.win(total >= bet * 5 ? 2 : 0); app.addWin(total);
      app.flyCoins(this.gx + this.cw * 3, this.gy + this.bh / 2, Math.min(16, 3 + wins.length * 2));
      app.message(wins.map(w => w.ways.toLocaleString('es-CL') + '× ' + labelOf(w.k)).join(' · ') + ' = <b>' + app.fmt(total) + '</b>');
    } else if (!this.inFree) app.message(this.hint);
    if (this.inFree) this.fsTotal += total;
    // Perlas
    let pearls = final.flat().filter(s => s.k === 'pearl').length;
    if (!free && !this.inFree && pearls < 4 && (Math.random() < MYSTERY_P || app._forceMystery)) {
      app._forceMystery = false;
      await app.wait(wins.length ? 900 : 300);
      this.wins = null;
      await app.mysteryIntro('El dragón escupe perlas');
      const cols = [0, 1, 2, 3, 4, 5].filter(c => !final[c].some(s => s.k === 'pearl'));
      for (let i = cols.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [cols[i], cols[j]] = [cols[j], cols[i]]; }
      while (pearls < 4 && cols.length) {
        const c = cols.pop(), r = Math.random() * this.heights[c] | 0, p = { k: 'pearl' };
        final[c][r] = p; this.reels[c].setCell(0, r, p); pearls++;
        const [px, py] = this.cellCenter(c, r);
        app.strike(px, py, '#ff9a7a'); sfx.bell(740 + pearls * 110, 0.9, 0.12);
        await app.wait(320);
      }
    }
    if (!this.inFree && pearls >= 4) {
      await app.wait(wins.length ? 1200 : 400);
      this.wins = null;
      total += await app.bonusPay(pearls, bet, 'perlas del dragón', 4);
      // 5 perlas = MINOR · 6 = MAJOR · 7+ = GRAND (además de los giros gratis)
      const jp = pearls >= 7 ? 'grand' : pearls === 6 ? 'major' : pearls === 5 ? 'minor' : null;
      if (jp) total += await app.awardJackpot(jp);
      await this.startFree(10 + (pearls - 4) * 2);
    } else if (this.inFree && pearls >= 3) {
      // 3 perlas en giros gratis = MINI + 5 giros
      const v = await app.awardJackpot('mini') + await app.bonusPay(pearls, bet, 'perlas del dragón'); total += v; this.fsTotal += v;
      this.freeLeft += 5; sfx.featureStart();
      await app.banner('+5 GIROS', 'Las perlas del dragón', { color: '#ff6a4a', ms: 1500 });
    }
    if (wins.length && !this.inFree) await app.wait(Math.min(2000, 700 + wins.length * 350));
    else if (wins.length) await app.wait(900);
    const celebrated = this.inFree;
    if (this.inFree && this.freeLeft === 0 && free) await this.endFree(bet);
    app.setSpinLabel(this.freeLeft ? 'GRATIS' : 'GIRAR', this.freeLeft ? this.freeLeft + ' restantes' : '');
    return { win: total, celebrated };
  }
  async startFree(n) {
    const app = this.app, sfx = app.sfx;
    sfx.featureStart(); app.flash('#ffb0a0', 0.6); app.shake(true);
    this.inFree = true; this.freeLeft = n; this.fsTotal = 0;
    sfx.stopMusic();
    await app.banner(n + ' GIROS GRATIS', 'Todos los rodillos al máximo · 117.649 formas', { color: '#ff5a3a', ms: 2600 });
    sfx.music('bonus');
    app.setSpinLabel('GRATIS', this.freeLeft + ' restantes');
  }
  async endFree(bet) {
    const app = this.app, fs = this.fsTotal;
    this.inFree = false; this.wins = null;
    if (fs > 0) await app.celebrate(fs, bet, 'FURIA DEL DRAGÓN');
    app.sfx.stopMusic(); app.sfx.music(Dragon.music);
    app.message('Giros gratis: <b>' + app.fmt(fs) + '</b>');
  }
  async buyFree() {
    await this.startFree(10);
    return { win: 0, celebrated: true };
  }
  slam() { this.reels.forEach(r => r.slam()); }
  info(bet, fmt) {
    const ic = i => '<i class="ico" style="background-position:' + (i % 6) * 20 + '% ' + Math.floor(i / 6) * 25 + '%"></i>';
    return '<h3>Cómo se juega</h3><ul><li><b>6 rodillos de altura variable</b>: en cada giro cada rodillo muestra de <b>2 a 7</b> símbolos. Las formas de ganar son la multiplicación de las alturas (se ven arriba, hasta <b>117.649</b>).</li>' +
      '<li>Paga cualquier símbolo repetido en rodillos contiguos desde la izquierda, en cualquier fila. El premio se multiplica por el número de formas.</li>' +
      '<li><b>LLAMARADA</b> (wild, rodillos 2 a 5) con <b>x2, x3 o x5</b>: sustituye y su multiplicador cuenta en cada forma.</li>' +
      '<li><b>4+ perlas del dragón</b> = <b>10 giros gratis</b> (+2 por cada perla extra) con <b>todos los rodillos al máximo</b> y más llamaradas.</li>' +
      '<li>Jackpots: <b>5 perlas = MINOR</b>, <b>6 = MAJOR</b>, <b>7 o más = GRAND</b>. En giros gratis, <b>3 perlas = MINI + 5 giros</b>.</li>' +
      '<li><b>GIROS</b> (botón): compra los giros gratis por 70× la apuesta.</li></ul>' +
      '<h3>Pago por forma (apuesta ' + fmt(bet) + ') · 3 / 4 / 5 / 6 rodillos</h3><table>' +
      Object.keys(PAY).map(k => '<tr><td>' + ic(ICON[k]) + '</td><td>' + labelOf(k) + '</td><td>' + [3, 4, 5, 6].map(n => money2(PAY[k][n] * UNIT * bet)).join(' · ') + '</td></tr>').join('') + '</table>';
  }
}
// Montos pequeños (pago por una sola forma) con hasta 2 decimales
function money2(v) { return '$' + v.toLocaleString('es-CL', { maximumFractionDigits: v < 10 ? 2 : 0 }); }
function labelOf(k) { return { geisha: 'Princesa', dragon: 'Dragón', rstar: 'Estrella roja', gstar: 'Estrella verde', K: 'K', Q: 'Q', J: 'J', ten: '10' }[k]; }
