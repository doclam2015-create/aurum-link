// LEGIÓN DORADA · 5x4, 1024 formas de ganar.
// Wild (corona) en rodillos 2-4. 3+ fénix = giros gratis (8/12/20). En giros gratis cada wild
// queda PEGADO con un multiplicador x2/x3 que se multiplica en cada forma ganadora.
import { S, sym, ball, jackpotBall, shortMoney, glow, goldText, roundRect, ease, rand, FONT } from '../gfx.js?v=55';
import { ReelSet, weighted } from '../reels.js?v=55';

const COLS = 5, ROWS = 4;
export const PAY = {
  emperor: [0, 0, 0, 25, 60, 200], bull: [0, 0, 0, 15, 40, 120], dragon: [0, 0, 0, 12, 30, 90], rstar: [0, 0, 0, 10, 25, 70],
  K: [0, 0, 0, 5, 12, 35], Q: [0, 0, 0, 5, 10, 30], J: [0, 0, 0, 4, 8, 22], ten: [0, 0, 0, 4, 8, 20]
};
const BASEW = { emperor: 4, bull: 6, dragon: 7, rstar: 8, K: 12, Q: 12, J: 14, ten: 14, phoenix: 1.25, coin: 0.9 };
export const MYSTERY_P = 1 / 140;
export const PICK_W = { mini: 60, minor: 28, major: 10, grand: 2 };
const JPC = { mini: 'green', minor: 'cyan', major: 'purple', grand: 'red' };
export const W_REEL = [0, 1, 2, 3, 4].map(c => Object.assign({}, BASEW, (c >= 1 && c <= 3) ? { wild: 2.2 } : {}));
const ICON = { emperor: S.EMPEROR, bull: S.BULL, dragon: S.DRAGON, rstar: S.RSTAR, K: S.K, Q: S.Q, J: S.J, ten: S.TEN, wild: S.WILD, phoenix: S.PHOENIX };
const UNIT = 1 / 110;

// g[col][row] = {k, m?}; devuelve ganadores por símbolo con multiplicador de wilds (producto por columna)
export function evalWays(g, bet) {
  const wins = [];
  for (const k in PAY) {
    let total = 1, n = 0; const cells = [];
    for (let c = 0; c < COLS; c++) {
      let sum = 0;
      g[c].forEach((s, r) => { if (s.k === k || (s.k === 'wild' && c > 0)) { sum += s.k === 'wild' ? (s.m || 1) : 1; cells.push([c, r]); } });
      if (!sum) break;
      total *= sum; n++;
    }
    if (n >= 3 && PAY[k][n]) {
      const keep = cells.filter(([c]) => c < n);
      wins.push({ k, n, ways: total, cells: keep, win: PAY[k][n] * UNIT * bet * total });
    }
  }
  return wins;
}

export default class Legion {
  static id = 'legion';
  static name = 'Legión Dorada';
  static music = 'rome';
  static lobby = {
    icons: [S.EMPEROR, S.WILD, S.PHOENIX], c1: '#ffc24a', c2: '#4a0d12', mechanic: '1024 formas + wilds pegajosos',
    desc: 'Sin líneas: 1024 formas de ganar. Los fénix dan giros gratis donde cada corona queda pegada con multiplicador.'
  };
  constructor(app) {
    this.app = app; this.id = Legion.id;
    this.hint = '<b>1024 formas</b> de ganar. 3 fénix = <b>giros gratis con wilds pegajosos</b>.';
    this.reels = new ReelSet({ cols: COLS, rows: ROWS, pick: c => ({ k: weighted(W_REEL[c]) }), drawSym: (x, s, px, py, w, h, o) => this.drawSym(x, s, px, py, w, h, o) });
    this.sticky = {}; this.freeLeft = 0; this.inFree = false; this.fsTotal = 0;
    this.wins = null; this.winT = 0; this.time = 0;
    this.extra = null;
  }
  get freeRound() { return this.freeLeft > 0; }
  get keepWin() { return this.inFree; }
  get locked() { return this.inFree; }
  get animating() { return this.reels.spinning || !!this.wins || this.inFree || !!this.pick; }

  resize(W, H) {
    this.W = W; this.H = H;
    const top = 38;
    const cw = Math.min((W - 24) / COLS, (H - top - 16) / ROWS * 1.05);
    const ch = Math.min(cw * 0.96, (H - top - 16) / ROWS);
    this.cw = cw; this.ch = ch; this.top = top;
    this.gx = (W - cw * COLS) / 2; this.gy = top + (H - top - ch * ROWS) / 2;
    this.reels.layout(this.gx, this.gy, cw, ch);
  }
  drawSym(x, s, px, py, w, h, o) {
    const dpr = this.app.dpr, size = Math.min(w, h) * 0.9;
    let sc = 1, a = 1;
    if (o && o.fx) { sc = o.fx.scale || 1; a = o.fx.alpha == null ? 1 : o.fx.alpha; }
    const d = size * sc, cx = px + w / 2, cy = py + h / 2;
    x.globalAlpha = a;
    if (s.k === 'coin') { const bd = Math.min(w, h) * 0.98 * sc; x.drawImage(ball('gold', 'JP', Math.min(w, h) * 0.98 * dpr), cx - bd / 2, cy - bd / 2, bd, bd); }
    else if (o && o.blur) x.drawImage(sym(ICON[s.k], size * dpr, 'b'), cx - d / 2, cy - d * 0.675, d, d * 1.35);
    else x.drawImage(sym(ICON[s.k], size * dpr), cx - d / 2, cy - d / 2, d, d);
    x.globalAlpha = 1;
  }
  update(dt) { this.time += dt; this.reels.update(dt); if (this.wins) this.winT += dt; }
  draw(x) {
    if (!this.W) return; // aún sin medidas (primer cuadro)
    const { gx, gy, cw, ch, W, time } = this;
    const bw = cw * COLS, bh = ch * ROWS;
    // Frontón romano
    x.save();
    let g = x.createLinearGradient(0, gy - 30, 0, gy);
    g.addColorStop(0, '#ffe7a3'); g.addColorStop(1, '#a8661b');
    x.fillStyle = g;
    x.beginPath(); x.moveTo(gx - 12, gy - 8); x.lineTo(W / 2, gy - this.top + 2); x.lineTo(gx + bw + 12, gy - 8); x.closePath(); x.fill();
    x.fillStyle = '#5a1010'; x.beginPath(); x.moveTo(gx + 14, gy - 11); x.lineTo(W / 2, gy - this.top + 10); x.lineTo(gx + bw - 14, gy - 11); x.closePath(); x.fill();
    x.restore();
    const title = this.inFree ? 'GIROS GRATIS · ' + this.freeLeft : '1024 FORMAS';
    goldText(x, title, W / 2, gy - 20, Math.min(15, bw * 0.045), { maxW: bw * 0.5 });
    // Marco
    roundRect(x, gx - 10, gy - 8, bw + 20, bh + 16, 10);
    g = x.createLinearGradient(gx, 0, gx + bw, 0);
    g.addColorStop(0, '#9c5a14'); g.addColorStop(0.5, '#ffe29a'); g.addColorStop(1, '#9c5a14');
    x.fillStyle = g; x.fill();
    g = x.createLinearGradient(0, gy, 0, gy + bh);
    if (this.app.light) { g.addColorStop(0, '#fffaf2'); g.addColorStop(0.5, '#f1e4d0'); g.addColorStop(1, '#fbf3e6'); }
    else { g.addColorStop(0, '#3a0a0e'); g.addColorStop(0.5, '#61141a'); g.addColorStop(1, '#2a0508'); }
    x.fillStyle = g; x.fillRect(gx - 2, gy, bw + 4, bh);
    x.strokeStyle = this.app.light ? 'rgba(140,90,30,0.3)' : 'rgba(255,210,120,0.25)'; x.lineWidth = 1;
    for (let c = 1; c < COLS; c++) { x.beginPath(); x.moveTo(gx + c * cw, gy); x.lineTo(gx + c * cw, gy + bh); x.stroke(); }
    this.reels.draw(x, (c, r) => this.cellFx(c, r));
    // Wilds pegajosos
    for (const key in this.sticky) {
      const s = this.sticky[key], c = key % COLS, r = Math.floor(key / COLS);
      const px = gx + c * cw, py = gy + r * ch;
      s.t = (s.t || 0) + 1 / 60;
      const pop = s.t < 0.4 ? ease.outBack(s.t / 0.4) : 1;
      x.fillStyle = 'rgba(60,8,10,0.95)'; x.fillRect(px + 1, py + 1, cw - 2, ch - 2);
      x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.55 + 0.25 * Math.sin(time * 5 + c);
      x.drawImage(glow('rgba(255,150,30,1)', 64), px - cw * 0.2, py - ch * 0.2, cw * 1.4, ch * 1.4); x.restore();
      const size = Math.min(cw, ch) * 0.9 * pop;
      x.drawImage(sym(S.WILD, Math.min(cw, ch) * 0.9 * this.app.dpr), px + cw / 2 - size / 2, py + ch / 2 - size / 2, size, size);
      roundRect(x, px + cw - 30, py + 3, 27, 18, 9); x.fillStyle = '#ffd24a'; x.fill(); x.strokeStyle = '#5a1a00'; x.lineWidth = 1.5; x.stroke();
      x.font = '900 12px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#3a1000'; x.fillText('x' + s.m, px + cw - 16.5, py + 12.5);
    }
    if (this.wins) this.drawWins(x);
    if (this.pick) this.drawPick(x);
  }
  cellFx(c, r) {
    if (!this.wins || !this.wins.length) return null;
    const w = this.wins[Math.floor(this.winT / 1.2) % this.wins.length];
    return w.cells.some(([cc, rr]) => cc === c && rr === r) ? { scale: 1 + 0.07 * Math.sin(this.winT * 11) } : { alpha: 0.4 };
  }
  drawWins(x) {
    const w = this.wins[Math.floor(this.winT / 1.2) % this.wins.length], { gx, gy, cw, ch } = this;
    x.save(); x.globalCompositeOperation = 'lighter';
    w.cells.forEach(([c, r]) => { x.strokeStyle = '#ffe07a'; x.lineWidth = 2.5; x.strokeRect(gx + c * cw + 3, gy + r * ch + 3, cw - 6, ch - 6); x.globalAlpha = 0.25; x.fillStyle = '#ffb040'; x.fillRect(gx + c * cw + 3, gy + r * ch + 3, cw - 6, ch - 6); x.globalAlpha = 1; });
    x.restore();
    goldText(x, this.app.fmt(w.win), gx + cw * 2.5, gy + ch * 2, Math.min(38, cw * 0.45), { glowColor: '#ffae2e' });
    x.font = '800 12px ' + FONT; x.fillStyle = '#ffe6b0'; x.textAlign = 'center';
    x.fillText(w.n + ' rodillos · ' + w.ways + (w.ways === 1 ? ' forma' : ' formas'), gx + cw * 2.5, gy + ch * 2 + 26);
  }

  async play(bet) {
    const app = this.app, sfx = app.sfx;
    this.wins = null;
    const free = this.freeLeft > 0;
    if (free) this.freeLeft--;
    app.setSpinLabel(free ? 'GRATIS' : 'PARAR', free ? this.freeLeft + ' restantes' : '');
    const final = [];
    for (let c = 0; c < COLS; c++) { final.push([]); for (let r = 0; r < ROWS; r++) final[c].push({ k: weighted(W_REEL[c]) }); }
    if (app._forceJp) { app._forceJp = false; [0, 2, 4].forEach(c => { final[c][0] = { k: 'coin' }; }); }
    if (app._force) { app._force = false; [0, 2, 4].forEach(c => { final[c][1] = { k: 'phoenix' }; }); if (this.inFree) [1, 2, 3].forEach(c => { final[c][2] = { k: 'wild' }; }); }
    let ph = 0, anticFrom = -1;
    for (let c = 0; c < COLS - 1; c++) { ph += final[c].some(s => s.k === 'phoenix') ? 1 : 0; if (ph >= 2 && anticFrom < 0) anticFrom = c + 1; }
    sfx.spinStart(app.speed >= 2);
    this.reels.start(app.speed);
    let wildsNew = 0;
    await this.reels.stopTo(final, {
      anticFrom,
      onStop: (c, last) => {
        sfx.reelStop(c, last);
        if (this.reels.anticipating) sfx.anticipation(true);
        final[c].forEach((s, r) => {
          const px = this.gx + c * this.cw + this.cw / 2, py = this.gy + r * this.ch + this.ch / 2;
          if (s.k === 'phoenix') { sfx.bell(660 + c * 110, 1, 0.12); app.burst(px, py, 16, { type: 'ember', color: '#ff8a20', speed: 280, size: 11, lift: 60 }); }
          if (s.k === 'wild' && this.inFree && !this.sticky[r * COLS + c]) {
            this.sticky[r * COLS + c] = { m: Math.random() < 0.9 ? 2 : 3, t: 0 }; wildsNew++;
            sfx.sticky(); app.burst(px, py, 20, { type: 'spark', color: '#ffb030', speed: 300, size: 10 });
          }
        });
        if (last) sfx.anticipation(false);
      }
    });
    sfx.anticipation(false);
    // Aplica pegajosos
    const grid = final.map((col, c) => col.map((s, r) => { const st = this.sticky[r * COLS + c]; return st ? { k: 'wild', m: st.m } : s; }));
    if (wildsNew) app.message('¡' + wildsNew + ' corona' + (wildsNew > 1 ? 's' : '') + ' pegada' + (wildsNew > 1 ? 's' : '') + '!');
    const wins = evalWays(grid, bet);
    let total = wins.reduce((a, w) => a + w.win, 0);
    if (wins.length) {
      this.wins = wins; this.winT = 0;
      sfx.win(total >= bet * 5 ? 2 : 0); app.addWin(total);
      app.flyCoins(this.gx + this.cw * 2.5, this.gy + this.ch * 2, Math.min(16, 3 + wins.length * 2));
      app.message(wins.map(w => w.ways + '× ' + labelOf(w.k)).join(' · ') + ' = <b>' + app.fmt(total) + '</b>');
      if (this.inFree) this.fsTotal += total;
    } else if (!this.inFree) app.message(this.hint);
    // Monedas de oro: 3+ = Tesoro del César (jackpot)
    const coins = grid.flat().filter(s => s.k === 'coin').length;
    if (coins >= 3) {
      await app.wait(wins.length ? 1200 : 400);
      this.wins = null;
      const v = await this.treasure(bet);
      total += v; if (this.inFree) this.fsTotal += v;
    }
    // Fénix
    let phoenix = grid.flat().filter(s => s.k === 'phoenix').length;
    // BONO SORPRESA: rayos invocan fénix hasta completar 3
    if (!free && !this.inFree && phoenix < 3 && (Math.random() < MYSTERY_P || app._forceMystery)) {
      app._forceMystery = false;
      await app.wait(wins.length ? 900 : 300);
      this.wins = null;
      await app.mysteryIntro('Los rayos invocan al fénix');
      const cand = [];
      grid.forEach((col, c) => col.forEach((s, r) => { if (s.k !== 'phoenix' && !this.sticky[r * COLS + c]) cand.push([c, r]); }));
      for (let i = cand.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [cand[i], cand[j]] = [cand[j], cand[i]]; }
      while (phoenix < 3 && cand.length) {
        const [c, r] = cand.pop(), ph = { k: 'phoenix' };
        grid[c][r] = ph; this.reels.setCell(c, r, ph); phoenix++;
        app.strike(this.gx + c * this.cw + this.cw / 2, this.gy + r * this.ch + this.ch / 2, '#ffb04a');
        sfx.bell(660 + phoenix * 110, 1, 0.12);
        await app.wait(320);
      }
    }
    if (!this.inFree && phoenix >= 3) {
      await app.wait(wins.length ? 1200 : 400);
      const n = phoenix >= 5 ? 20 : phoenix === 4 ? 12 : 8;
      this.wins = null;
      total += await app.bonusPay(phoenix, bet, 'fénix');
      sfx.featureStart(); app.flash('#ffcf70', 0.6); app.shake(true);
      this.inFree = true; this.freeLeft = n; this.fsTotal = 0; this.sticky = {};
      sfx.stopMusic();
      await app.banner(n + ' GIROS GRATIS', 'Cada corona queda pegada con multiplicador', { color: '#ff9a2e', ms: 2600 });
      sfx.music('bonus');
    } else if (this.inFree && phoenix >= 2) {
      { const v = await app.bonusPay(phoenix, bet, 'fénix', 2); total += v; this.fsTotal += v; }
      this.freeLeft += 3; sfx.featureStart();
      await app.banner('+3 GIROS', 'La legión avanza', { color: '#ff9a2e', ms: 1500 });
    }
    const celebrated = this.inFree;
    if (wins.length) await app.wait(Math.min(2000, 700 + wins.length * 350));
    if (this.inFree && this.freeLeft === 0 && free) {
      const fs = this.fsTotal;
      this.inFree = false; this.sticky = {}; this.wins = null;
      if (fs > 0) await app.celebrate(fs, bet, 'GLORIA DE ROMA');
      sfx.stopMusic(); sfx.music(Legion.music);
      app.message('Giros gratis: <b>' + app.fmt(fs) + '</b>');
    }
    app.setSpinLabel(this.freeLeft ? 'GRATIS' : 'GIRAR', this.freeLeft ? this.freeLeft + ' restantes' : '');
    return { win: total, celebrated };
  }
  slam() { this.reels.slam(); }

  // ---------- TESORO DEL CÉSAR: elige monedas hasta juntar 3 iguales ----------
  async treasure(bet) {
    const app = this.app, sfx = app.sfx;
    sfx.featureStart(); app.flash('#ffd35a', 0.6); app.shake(true);
    await app.banner('TESORO DEL CÉSAR', 'Elige monedas · 3 iguales ganan el jackpot', { color: '#ffc23a', ms: 2400 });
    const keys = Object.keys(PICK_W);
    const winner = weighted(PICK_W);
    // Secuencia: 2 del ganador + distractores (máx. 2 de cada otro) mezclados, y el ganador al final
    const seq = [winner, winner];
    keys.filter(k => k !== winner).forEach(k => { const n = Math.random() * 3 | 0; for (let i = 0; i < n; i++) seq.push(k); });
    for (let i = seq.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [seq[i], seq[j]] = [seq[j], seq[i]]; }
    seq.push(winner);
    const coins = [];
    for (let i = 0; i < 12; i++) coins.push({ jp: null, t: 0, flip: 0 });
    this.pick = { coins, winner: null, msg: 'Toca una moneda' };
    app.message('Toca las monedas. <b>3 iguales</b> ganan ese jackpot.');
    let idx = 0;
    while (idx < seq.length) {
      const i = await this.waitPick();
      const c = coins[i]; if (c.jp) continue;
      c.jp = seq[idx++]; c.flip = 0.001;
      sfx.coin(); sfx.bell(660 + idx * 60, 0.6, 0.1);
      const n = coins.filter(o => o.jp === c.jp).length;
      if (n === 2) sfx.anticipation(true), setTimeout(() => sfx.anticipation(false), 500);
      await app.wait(350);
    }
    // Revela el resto
    const left = keys.filter(k => k !== winner);
    coins.forEach(c => { if (!c.jp) { c.jp = left[Math.random() * left.length | 0]; c.dim = true; c.flip = 0.001; } });
    this.pick.winner = winner;
    await app.wait(700);
    const v = await app.awardJackpot(winner);
    await app.celebrate(v, bet, winner.toUpperCase());
    this.pick = null;
    return v;
  }
  waitPick() {
    return new Promise(res => {
      this.pick.res = res;
      // En automático (o sin toque) elige solo
      this.pick.timer = setTimeout(() => {
        const free = this.pick.coins.map((c, i) => c.jp ? -1 : i).filter(i => i >= 0);
        this.pick.res = null; res(free[Math.random() * free.length | 0]);
      }, this.app.auto ? 600 : 5000);
    });
  }
  pickLayout() {
    const { gx, gy, cw, ch } = this, bw = cw * COLS, bh = ch * ROWS;
    const s = Math.min(bw / 4, (bh - 10) / 3);
    return { s, x0: gx + (bw - s * 4) / 2, y0: gy + (bh - s * 3) / 2 + 5 };
  }
  onTap(x, y) {
    if (!this.pick || !this.pick.res) return;
    const { s, x0, y0 } = this.pickLayout();
    const c = Math.floor((x - x0) / s), r = Math.floor((y - y0) / s);
    if (c < 0 || c > 3 || r < 0 || r > 2) return;
    const i = r * 4 + c;
    if (this.pick.coins[i].jp) return;
    clearTimeout(this.pick.timer);
    const res = this.pick.res; this.pick.res = null; res(i);
  }
  drawPick(x) {
    const { gx, gy, cw, ch, time } = this, bw = cw * COLS, bh = ch * ROWS, dpr = this.app.dpr;
    x.fillStyle = 'rgba(20,4,6,0.86)'; x.fillRect(gx - 2, gy, bw + 4, bh);
    const { s, x0, y0 } = this.pickLayout();
    goldText(x, 'TESORO DEL CÉSAR', gx + bw / 2, gy + 14, Math.min(18, bw * 0.05), { maxW: bw * 0.9 });
    this.pick.coins.forEach((c, i) => {
      const px = x0 + (i % 4) * s + s / 2, py = y0 + Math.floor(i / 4) * s + s / 2;
      if (c.flip > 0 && c.flip < 1) c.flip = Math.min(1, c.flip + 1 / 60 / 0.35);
      const f = c.flip, sx = f > 0 ? Math.abs(Math.cos(f * Math.PI)) : 1, show = f >= 0.5;
      const size = s * 0.9 * (c.jp && this.pick.winner === c.jp && !c.dim ? 1 + 0.06 * Math.sin(time * 10) : 1);
      const img = show ? jackpotBall(c.jp, shortMoney(this.app.jackpot(c.jp)), s * 0.9 * dpr) : ball('gold', '?', s * 0.9 * dpr);
      x.globalAlpha = c.dim ? 0.35 : 1;
      x.drawImage(img, px - size * sx / 2, py - size / 2, size * sx, size);
      x.globalAlpha = 1;
      if (!c.jp && Math.sin(time * 3 + i) > 0.95) { x.save(); x.globalCompositeOperation = 'lighter'; x.drawImage(glow('rgba(255,220,120,1)', 32), px - s * 0.3, py - s * 0.45, s * 0.6, s * 0.6); x.restore(); }
    });
  }
  info(bet, fmt) {
    const ic = i => '<i class="ico" style="background-position:' + (i % 6) * 20 + '% ' + Math.floor(i / 6) * 25 + '%"></i>';
    return '<h3>Cómo se juega</h3><ul><li><b>5 × 4 con 1024 formas</b>: paga cualquier símbolo en rodillos contiguos desde la izquierda, en cualquier fila.</li>' +
      '<li>El premio se multiplica por el número de formas (p. ej. 2 en el rodillo 1 × 3 en el 2 × 1 en el 3 = 6 formas).</li>' +
      '<li><b>Corona WILD</b> en rodillos 2, 3 y 4, sustituye a todos menos al fénix.</li>' +
      '<li><b>3+ monedas JP</b> = <b>Tesoro del César</b>: elige monedas hasta juntar 3 iguales y gana ese jackpot progresivo (MINI · MINOR · MAJOR · GRAND).</li>' +
      '<li><b>3 / 4 / 5 fénix</b> = <b>8 / 12 / 20 giros gratis</b>. Cada corona que cae queda <b>pegada</b> con <b>x2 o x3</b>; los multiplicadores se multiplican entre sí. 2 fénix = +3 giros.</li></ul>' +
      '<h3>Pagos por forma (apuesta ' + fmt(bet) + ') · 3 / 4 / 5</h3><table>' +
      Object.keys(PAY).map(k => '<tr><td>' + ic(ICON[k]) + '</td><td>' + labelOf(k) + '</td><td>' + [3, 4, 5].map(n => fmt(PAY[k][n] * UNIT * bet)).join(' · ') + '</td></tr>').join('') + '</table>';
  }
}
function labelOf(k) { return { emperor: 'César', bull: 'Toro', dragon: 'Dragón', rstar: 'Estrella', K: 'K', Q: 'Q', J: 'J', ten: '10' }[k]; }
