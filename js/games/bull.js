// TORO DORADO · 5x3, 20 líneas + mecánica de RECOLECCIÓN.
// Monedas con valor caen en los rodillos 1-4; el TORO (solo rodillo 5) recoge el valor de
// todas las monedas visibles. Monedas MINI/MINOR/MAJOR/GRAND entregan su jackpot al ser recogidas.
// 3 tréboles (rodillos 1, 3 y 5) = ESTAMPIDA: 10 giros gratis donde cada toro sube el
// multiplicador de recolección (x1 → x2 → x3 …) y el toro aparece más seguido.
import { S, sym, ball, glow, goldText, roundRect, ease, rand, FONT } from '../gfx.js?v=74';
import { ReelSet, LINES_5x3, weighted } from '../reels.js?v=74';

const COLS = 5, ROWS = 3;
export const PAY = {
  diamond: [0, 0, 0, 40, 150, 600], seven: [0, 0, 0, 25, 90, 350], bell: [0, 0, 0, 15, 50, 180],
  K: [0, 0, 0, 8, 25, 80], Q: [0, 0, 0, 8, 20, 60], J: [0, 0, 0, 6, 15, 45], ten: [0, 0, 0, 6, 15, 45]
};
const BASEW = { diamond: 4, seven: 6, bell: 8, K: 12, Q: 12, J: 14, ten: 14 };
// Rodillos 1-4: monedas; 2-4: wild; 1, 3, 5: trébol; 5: toro
export function reelWeights(c, free) {
  const w = Object.assign({}, BASEW);
  if (c <= 3) w.coin = free ? 7 : 6;
  if (c >= 1 && c <= 3) w.wild = 2.4;
  if (c === 0 || c === 2 || c === 4) w.clover = free ? 0 : 3.2;
  if (c === 4) w.bull = free ? 16 : 6;
  return w;
}
const COIN_V = [0.5, 1, 1.5, 2, 3, 5, 10, 20], COIN_W = [30, 26, 16, 12, 8, 5, 2.5, 0.5];
const COIN_JP = { grand: 0.004, major: 0.03, minor: 0.25, mini: 0.9 }; // % por moneda
export const MYSTERY_P = 1 / 120;
const ICON = { diamond: S.DIAMOND, seven: S.SEVEN, bell: S.BELL, K: S.K, Q: S.Q, J: S.J, ten: S.TEN, wild: S.WILD, clover: S.CLOVER, bull: S.BULL };

export function makeCoin(bet) {
  const r = Math.random() * 100;
  let acc = 0;
  for (const jp in COIN_JP) { acc += COIN_JP[jp]; if (r < acc) return { k: 'coin', jp }; }
  let t = 0; COIN_W.forEach(w => t += w);
  let x = Math.random() * t, i = 0;
  for (; i < COIN_V.length - 1; i++) { x -= COIN_W[i]; if (x < 0) break; }
  return { k: 'coin', value: COIN_V[i] * bet };
}
export function pickSym(c, bet, free) {
  const k = weighted(reelWeights(c, free));
  return k === 'coin' ? makeCoin(bet) : { k };
}
// Líneas: wild sustituye a todo menos moneda, trébol y toro
export function evalLines(g, lineBet) {
  const wins = [];
  LINES_5x3.forEach((L, li) => {
    const s = L.map((r, c) => g[c][r].k);
    const base = s.find(k => k !== 'wild');
    if (!base || !PAY[base]) return;
    let n = 0;
    while (n < COLS && (s[n] === base || s[n] === 'wild')) n++;
    const p = PAY[base][n];
    if (p) wins.push({ li, line: L, n, k: base, win: p * lineBet });
  });
  return wins;
}

export default class Bull {
  static id = 'bull';
  static name = 'Toro Dorado';
  static music = 'ranch';
  static lobby = {
    icons: [S.BULL, S.DIAMOND, S.CLOVER], c1: '#e3a62a', c2: '#3a1c06', mechanic: 'Recolección: el toro junta las monedas',
    desc: 'Monedas con premio caen en los rodillos 1-4 y el toro del rodillo 5 las recoge todas. 3 tréboles = Estampida con multiplicador creciente.'
  };
  constructor(app) {
    this.app = app; this.id = Bull.id;
    this.hint = 'El <b>TORO</b> del rodillo 5 recoge todas las monedas. 3 ☘ = <b>ESTAMPIDA</b>.';
    this.reels = new ReelSet({ cols: COLS, rows: ROWS, pick: c => pickSym(c, app.bet, this.inFree), drawSym: (x, s, px, py, w, h, o) => this.drawSym(x, s, px, py, w, h, o) });
    this.freeLeft = 0; this.inFree = false; this.fsTotal = 0; this.mult = 1;
    this.wins = null; this.winT = 0; this.time = 0; this.dust = [];
    this.buy = { label: 'BONO', sub: b => app.fmt(b * 50), cost: b => b * 50, run: b => this.buyFree(b) };
  }
  // Botón de compra oculto durante los giros gratis
  get extra() { return this.inFree ? null : this.buy; }
  get freeRound() { return this.freeLeft > 0; }
  get keepWin() { return this.inFree; }
  get locked() { return this.inFree; }
  get animating() { return this.reels.spinning || !!this.wins || this.inFree || this.dust.length > 0; }

  resize(W, H) {
    this.W = W; this.H = H;
    const top = 34;
    const cw = Math.min((W - 24) / COLS, (H - top - 14) / ROWS * 1.1);
    const ch = Math.min(cw * 0.95, (H - top - 14) / ROWS);
    this.cw = cw; this.ch = ch; this.top = top;
    this.gx = (W - cw * COLS) / 2; this.gy = top + (H - top - ch * ROWS) / 2;
    this.reels.layout(this.gx, this.gy, cw, ch);
  }
  coinImg(s, size) {
    if (s.jp) return ball({ mini: 'green', minor: 'cyan', major: 'purple', grand: 'red' }[s.jp], s.jp.toUpperCase(), size);
    return ball('gold', short(s.value), size);
  }
  drawSym(x, s, px, py, w, h, o) {
    const dpr = this.app.dpr, size = Math.min(w, h) * 0.9;
    let sc = 1, a = 1;
    if (o && o.fx) { sc = o.fx.scale || 1; a = o.fx.alpha == null ? 1 : o.fx.alpha; }
    const cx = px + w / 2, cy = py + h / 2;
    x.globalAlpha = a;
    if (s.k === 'coin') {
      const d = Math.min(w, h) * 0.98 * sc * (s.pull ? 1 - s.pull * 0.6 : 1);
      if (!s.gone) x.drawImage(this.coinImg(s, Math.min(w, h) * 0.98 * dpr), cx - d / 2, cy - d / 2, d, d);
    } else {
      const d = size * sc;
      if (s.k === 'bull' && !(o && o.blur)) {
        x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = a * (0.35 + 0.2 * Math.sin(this.time * 5));
        x.drawImage(glow('rgba(255,190,60,1)', 64), cx - w * 0.65, cy - h * 0.65, w * 1.3, h * 1.3); x.restore(); x.globalAlpha = a;
      }
      if (o && o.blur) x.drawImage(sym(ICON[s.k], size * dpr, 'b'), cx - d / 2, cy - d * 0.675, d, d * 1.35);
      else x.drawImage(sym(ICON[s.k], size * dpr), cx - d / 2, cy - d / 2, d, d);
    }
    x.globalAlpha = 1;
  }
  update(dt) {
    this.time += dt; this.reels.update(dt);
    if (this.wins) this.winT += dt;
    for (let i = this.dust.length - 1; i >= 0; i--) { const d = this.dust[i]; d.t += dt; if (d.t > d.life) this.dust.splice(i, 1); }
  }
  draw(x) {
    if (!this.W) return; // aún sin medidas (primer cuadro)
    const { gx, gy, cw, ch, W, time } = this;
    const bw = cw * COLS, bh = ch * ROWS;
    // Letrero de madera
    const title = this.inFree ? 'ESTAMPIDA · ' + this.freeLeft + ' GIROS · x' + this.mult : 'TORO DORADO · 20 LÍNEAS';
    roundRect(x, W / 2 - bw * 0.36, gy - this.top + 2, bw * 0.72, this.top - 10, 8);
    let g = x.createLinearGradient(0, gy - this.top, 0, gy - 8);
    g.addColorStop(0, '#8a4f1c'); g.addColorStop(1, '#4a2408');
    x.fillStyle = g; x.fill(); x.strokeStyle = '#f0c060'; x.lineWidth = 1.5; x.stroke();
    goldText(x, title, W / 2, gy - this.top / 2 - 3, Math.min(14, bw * 0.042), { maxW: bw * 0.68 });
    // Marco
    roundRect(x, gx - 10, gy - 8, bw + 20, bh + 16, 12);
    g = x.createLinearGradient(gx, 0, gx + bw, 0);
    g.addColorStop(0, '#7a4a10'); g.addColorStop(0.5, '#ffdf8a'); g.addColorStop(1, '#7a4a10');
    x.fillStyle = g; x.fill();
    g = x.createLinearGradient(0, gy, 0, gy + bh);
    if (this.app.light) { g.addColorStop(0, '#fff8ea'); g.addColorStop(1, '#f0dcb8'); }
    else { g.addColorStop(0, '#2a1404'); g.addColorStop(0.5, '#452106'); g.addColorStop(1, '#1e0e02'); }
    x.fillStyle = g; x.fillRect(gx - 2, gy, bw + 4, bh);
    // Rodillo del toro resaltado
    x.fillStyle = this.app.light ? 'rgba(230,160,40,0.18)' : 'rgba(255,170,40,0.12)'; x.fillRect(gx + cw * 4, gy, cw, bh);
    x.strokeStyle = this.app.light ? 'rgba(140,90,30,0.3)' : 'rgba(255,210,120,0.22)'; x.lineWidth = 1;
    for (let c = 1; c < COLS; c++) { x.beginPath(); x.moveTo(gx + c * cw, gy); x.lineTo(gx + c * cw, gy + bh); x.stroke(); }
    this.reels.draw(x, (c, r) => this.cellFx(c, r));
    // Estelas de monedas hacia el toro
    x.save(); x.globalCompositeOperation = 'lighter';
    this.dust.forEach(d => {
      const k = ease.inOut(Math.min(1, d.t / d.life));
      const px = d.x1 + (d.x2 - d.x1) * k, py = d.y1 + (d.y2 - d.y1) * k - Math.sin(k * Math.PI) * ch * 0.6;
      x.globalAlpha = 1 - k * 0.3;
      x.drawImage(glow('rgba(255,200,60,1)', 64), px - cw * 0.3, py - cw * 0.3, cw * 0.6, cw * 0.6);
    });
    x.restore();
    if (this.wins) this.drawWins(x);
  }
  cellFx(c, r) {
    if (!this.wins || !this.wins.length) return null;
    const w = this.wins[Math.floor(this.winT / 1.1) % this.wins.length];
    return w.cells.some(([cc, rr]) => cc === c && rr === r) ? { scale: 1 + 0.07 * Math.sin(this.winT * 11) } : { alpha: 0.45 };
  }
  drawWins(x) {
    const w = this.wins[Math.floor(this.winT / 1.1) % this.wins.length], { gx, gy, cw, ch } = this;
    if (w.line) {
      x.save(); x.globalCompositeOperation = 'lighter'; x.lineJoin = 'round';
      x.beginPath(); w.line.forEach((r, c) => { const px = gx + c * cw + cw / 2, py = gy + r * ch + ch / 2; c ? x.lineTo(px, py) : x.moveTo(gx - 6, py); });
      x.lineTo(gx + cw * COLS + 6, gy + w.line[COLS - 1] * ch + ch / 2);
      x.strokeStyle = 'rgba(255,170,40,0.4)'; x.lineWidth = 12; x.stroke(); x.strokeStyle = '#fff2b0'; x.lineWidth = 3; x.stroke();
      x.restore();
    } else {
      x.save(); x.globalCompositeOperation = 'lighter';
      w.cells.forEach(([c, r]) => { x.strokeStyle = '#ffe07a'; x.lineWidth = 2.5; x.strokeRect(gx + c * cw + 3, gy + r * ch + 3, cw - 6, ch - 6); });
      x.restore();
    }
    goldText(x, this.app.fmt(w.win), gx + cw * 2.5, gy + ch * 1.5, Math.min(38, cw * 0.45), { glowColor: '#ffae2e' });
  }

  async play(bet) {
    const app = this.app, sfx = app.sfx;
    this.wins = null;
    const free = this.freeLeft > 0;
    if (free) this.freeLeft--;
    app.setSpinLabel(free ? 'GRATIS' : 'PARAR', free ? this.freeLeft + ' restantes' : '');
    const final = [];
    for (let c = 0; c < COLS; c++) { final.push([]); for (let r = 0; r < ROWS; r++) final[c].push(pickSym(c, bet, this.inFree)); }
    if (app._force) { app._force = false; [0, 2, 4].forEach(c => { final[c][1] = { k: 'clover' }; }); }
    if (app._forceBull) { app._forceBull = false; final[4][1] = { k: 'bull' }; final[1][0] = makeCoin(bet); final[2][2] = makeCoin(bet); }
    // Suspenso en el rodillo del toro si ya hay monedas
    const coinsBefore = final.slice(0, 4).flat().filter(s => s.k === 'coin').length;
    let cl = 0, anticFrom = -1;
    [0, 2].forEach(c => { if (final[c].some(s => s.k === 'clover')) cl++; });
    if (cl >= 2 && !this.inFree) anticFrom = 4;
    else if (coinsBefore >= 3) anticFrom = 4;
    sfx.spinStart(app.speed >= 2);
    this.reels.start(app.speed);
    await this.reels.stopTo(final, {
      anticFrom,
      onStop: (c, last) => {
        sfx.reelStop(c, last);
        if (this.reels.anticipating) sfx.anticipation(true);
        final[c].forEach((s, r) => {
          const [px, py] = this.cellCenter(c, r);
          if (s.k === 'coin') { sfx.coin(); app.burst(px, py, 8, { color: '#ffd76a', speed: 200, size: 8 }); }
          if (s.k === 'clover') { sfx.bell(784 + c * 110, 0.8, 0.12); app.burst(px, py, 14, { type: 'spark', color: '#6cff8a', speed: 260, size: 10 }); }
          if (s.k === 'bull') { sfx.thud(0); sfx.thud(2); app.shake(false); app.burst(px, py, 20, { type: 'spark', color: '#ffb030', speed: 300, size: 11 }); }
        });
        if (last) sfx.anticipation(false);
      }
    });
    sfx.anticipation(false);
    const grid = final;
    // Premios de líneas
    const wins = evalLines(grid, bet / 20).map(w => ({ ...w, cells: w.line.slice(0, w.n).map((r, c) => [c, r]) }));
    let total = wins.reduce((a, w) => a + w.win, 0);
    if (wins.length) {
      this.wins = wins; this.winT = 0;
      sfx.win(total >= bet * 5 ? 2 : 0); app.addWin(total);
      app.flyCoins(this.gx + this.cw * 2.5, this.gy + this.ch * 1.5, Math.min(14, 3 + wins.length * 2));
      app.message('Premio en ' + wins.length + ' línea' + (wins.length > 1 ? 's' : '') + ': <b>' + app.fmt(total) + '</b>');
    } else if (!this.inFree) app.message(this.hint);
    // Recolección del toro
    const bulls = [];
    grid[4].forEach((s, r) => { if (s.k === 'bull') bulls.push(r); });
    const coins = [];
    grid.forEach((col, c) => col.forEach((s, r) => { if (s.k === 'coin') coins.push({ c, r, s }); }));
    if (bulls.length && coins.length) {
      if (wins.length) await app.wait(1100);
      this.wins = null;
      for (const br of bulls) total += await this.collect(br, coins, bet);
    } else if (bulls.length && !coins.length && this.inFree) {
      // En Estampida el toro sube el multiplicador aunque no haya monedas
      this.mult++; sfx.multiplier(this.mult); app.message('Multiplicador de la estampida: <b>x' + this.mult + '</b>');
    }
    if (this.inFree) this.fsTotal += total;
    // Tréboles → Estampida
    let clovers = grid.flat().filter(s => s.k === 'clover').length;
    if (!free && !this.inFree && clovers < 3 && (Math.random() < MYSTERY_P || app._forceMystery)) {
      app._forceMystery = false;
      await app.wait(wins.length ? 900 : 300);
      this.wins = null;
      await app.mysteryIntro('Los rayos siembran tréboles');
      for (const c of [0, 2, 4]) {
        if (grid[c].some(s => s.k === 'clover')) continue;
        const r = Math.random() * 3 | 0, cs = { k: 'clover' };
        grid[c][r] = cs; this.reels.setCell(c, r, cs); clovers++;
        const [px, py] = this.cellCenter(c, r);
        app.strike(px, py, '#8cff9e'); sfx.bell(784 + clovers * 110, 0.8, 0.12);
        await app.wait(320);
      }
    }
    if (!this.inFree && clovers >= 3) {
      await app.wait(wins.length ? 1100 : 400);
      this.wins = null;
      total += await app.bonusPay(clovers, bet, 'tréboles');
      await this.startFree(10);
    }
    if (wins.length && !this.inFree) await app.wait(Math.min(1800, 700 + wins.length * 300));
    const celebrated = this.inFree;
    if (this.inFree && this.freeLeft === 0 && free) await this.endFree(bet);
    app.setSpinLabel(this.freeLeft ? 'GRATIS' : 'GIRAR', this.freeLeft ? this.freeLeft + ' restantes' : '');
    return { win: total, celebrated };
  }
  cellCenter(c, r) { return [this.gx + c * this.cw + this.cw / 2, this.gy + r * this.ch + this.ch / 2]; }

  async collect(br, coins, bet) {
    const app = this.app, sfx = app.sfx;
    const [bx, by] = this.cellCenter(4, br);
    sfx.featureStart(); app.flash('#ffd27a', 0.35);
    app.burst(bx, by, 1, { type: 'ring', color: '#ffc040', size: 10, grow: this.cw * 1.4, width: 8, life: 0.6, speed: 0 });
    app.message('¡El <b>TORO</b> recoge las monedas!' + (this.mult > 1 ? ' · <b>x' + this.mult + '</b>' : ''));
    await app.wait(400);
    let sum = 0, n = 0;
    for (const o of coins) {
      const [px, py] = this.cellCenter(o.c, o.r);
      this.dust.push({ x1: px, y1: py, x2: bx, y2: by, t: 0, life: 0.45 / app.speed });
      sfx.collect(n++);
      let v = o.s.value || 0;
      if (o.s.jp) v += await app.awardJackpot(o.s.jp);
      else app.popText(px, py, short(v), 20);
      sum += o.s.jp ? v : v * this.mult;
      if (!o.s.jp) app.addWin(v * this.mult);
      await app.wait(170);
      app.burst(bx, by, 6, { color: '#ffd76a', speed: 160, size: 8 });
    }
    app.popText(bx, by - 10, (this.mult > 1 ? 'x' + this.mult + ' ' : '') + short(sum), 24);
    app.flyCoins(bx, by, 10);
    sfx.win(sum >= bet * 5 ? 2 : 1);
    if (this.inFree) {
      this.mult++;
      await app.wait(300);
      sfx.multiplier(this.mult);
      app.popText(bx, by + 18, 'x' + this.mult, 26, ['#fff', '#ffe6a0', '#ff9a2e', '#fff3d0']);
    }
    await app.wait(700);
    return sum;
  }

  async startFree(n) {
    const app = this.app, sfx = app.sfx;
    sfx.featureStart(); app.flash('#b8ffb0', 0.6); app.shake(true);
    this.inFree = true; this.freeLeft = n; this.fsTotal = 0; this.mult = 1;
    sfx.stopMusic();
    await app.banner('ESTAMPIDA', n + ' giros gratis · cada toro sube el multiplicador', { color: '#ffb52e', ms: 2500 });
    sfx.music('bonus');
    app.setSpinLabel('GRATIS', this.freeLeft + ' restantes');
  }
  async endFree(bet) {
    const app = this.app, fs = this.fsTotal;
    this.inFree = false; this.wins = null; this.mult = 1;
    if (fs > 0) await app.celebrate(fs, bet, 'ESTAMPIDA');
    app.sfx.stopMusic(); app.sfx.music(Bull.music);
    app.message('Estampida pagó <b>' + app.fmt(fs) + '</b>');
  }
  async buyFree() {
    await this.startFree(10);
    return { win: 0, celebrated: true };
  }
  slam() { this.reels.slam(); }
  info(bet, fmt) {
    const ic = i => '<i class="ico" style="background-position:' + (i % 6) * 20 + '% ' + Math.floor(i / 6) * 25 + '%"></i>', lb = bet / 20;
    const names = { diamond: 'Diamante', seven: '7', bell: 'Campana', K: 'K', Q: 'Q', J: 'J', ten: '10' };
    return '<h3>Cómo se juega</h3><ul><li><b>5 rodillos × 3 filas, 20 líneas</b>. Pagan 3+ iguales desde la izquierda. La corona <b>WILD</b> (rodillos 2-4) sustituye símbolos normales.</li>' +
      '<li><b>Monedas</b> con premio (' + fmt(bet * 0.5) + ' a ' + fmt(bet * 20) + ') caen en los rodillos 1 a 4. Solas no pagan.</li>' +
      '<li>El <b>TORO</b> solo aparece en el rodillo 5 y <b>recoge el valor de todas las monedas</b> visibles. Monedas <b>MINI · MINOR · MAJOR · GRAND</b> entregan su jackpot progresivo.</li>' +
      '<li><b>3 tréboles ☘</b> (rodillos 1, 3 y 5) = <b>ESTAMPIDA</b>: 10 giros gratis. El toro aparece más seguido y <b>cada toro sube el multiplicador</b> de recolección (x1 → x2 → x3…) hasta el final.</li>' +
      '<li><b>ESTAMPIDA</b> (botón): compra los giros gratis por 50× la apuesta.</li></ul>' +
      '<h3>Pagos por línea (apuesta ' + fmt(bet) + ') · 3 / 4 / 5</h3><table>' +
      Object.keys(PAY).map(k => '<tr><td>' + ic(ICON[k]) + '</td><td>' + names[k] + '</td><td>' + [3, 4, 5].map(n => fmt(PAY[k][n] * lb)).join(' · ') + '</td></tr>').join('') + '</table>';
  }
}
function short(v) {
  v = Math.round(v);
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace('.', ',') + 'M';
  if (v >= 1e4) return '$' + (v / 1e3).toFixed(v >= 1e5 ? 0 : 1).replace('.', ',') + 'K';
  return '$' + v.toLocaleString('es-CL');
}
