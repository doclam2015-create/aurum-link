// AVALANCHA GLACIAL · SNOW KINGDOM
// 6x5, pagos en cualquier posición (8+ iguales). Los símbolos ganadores estallan en hielo y
// caen nuevos (cascadas). Multiplicador base x1→x2→x3→x5 por cascada. 4+ copos = 10 giros
// gratis con multiplicador progresivo que NO se reinicia (+1 por cada cascada ganadora).
import { S, sym, ball, jackpotBall, shortMoney, glow, goldText, roundRect, ease, rand, FONT, makeCanvas, electricRing } from '../gfx.js?v=60';
import { weighted } from '../reels.js?v=60';

const COLS = 6, ROWS = 5;
export const PAY = {
  queen: [3.65, 8.76, 18.26], diamond: [0.91, 3.65, 8.76], bstar: [0.73, 1.83, 5.84], gstar: [0.55, 0.73, 4.38],
  K: [0.37, 0.55, 3.65], Q: [0.29, 0.44, 2.92], J: [0.18, 0.37, 1.83], ten: [0.11, 0.29, 0.73]
};
export const WEIGHTS = { queen: 4, diamond: 7, bstar: 9, gstar: 11, K: 13, Q: 14, J: 16, ten: 18, snow: 2.1 };
const ICON = { queen: S.QUEEN, diamond: S.DIAMOND, bstar: S.BSTAR, gstar: S.GSTAR, K: S.K, Q: S.Q, J: S.J, ten: S.TEN, snow: S.SNOW };
const LADDER = [1, 2, 3, 5];
// Bolas de hielo con jackpot: muy raras, pagan su jackpot al final del giro
export const ORB_P = 0.00005;
export const MYSTERY_P = 1 / 150;
const ORB_JP = { mini: 70, minor: 22, major: 7, grand: 1 };
const ORB_COLOR = { mini: 'green', minor: 'cyan', major: 'purple', grand: 'red' };
export function tier(n) { return n >= 12 ? 2 : n >= 10 ? 1 : n >= 8 ? 0 : -1; }
export function evaluate(grid) {
  const count = {};
  grid.forEach(col => col.forEach(s => { if (s && PAY[s.k]) count[s.k] = (count[s.k] || 0) + 1; }));
  const wins = [];
  for (const k in count) { const t = tier(count[k]); if (t >= 0) wins.push({ k, n: count[k], pay: PAY[k][t] }); }
  return wins;
}

export default class Avalanche {
  static id = 'avalanche';
  static name = 'Avalancha Glacial';
  static music = 'ice';
  static lobby = {
    icons: [S.QUEEN, S.SNOW, S.DIAMOND], c1: '#6fd3ff', c2: '#0d2a6e', mechanic: 'Cascadas + multiplicador',
    desc: '8+ símbolos iguales en cualquier lugar pagan. Estallan en hielo, caen nuevos y el multiplicador sube.'
  };
  constructor(app) {
    this.app = app; this.id = Avalanche.id;
    this.hint = '8 o más iguales <b>en cualquier lugar</b> pagan. 4 ❄ = <b>10 giros gratis</b>.';
    this.grid = [];
    for (let c = 0; c < COLS; c++) { this.grid.push([]); for (let r = 0; r < ROWS; r++) this.grid[c].push(this.cell(r, r)); }
    this.mult = 1; this.freeLeft = 0; this.fsTotal = 0; this.inFree = false;
    this.snow = []; for (let i = 0; i < 40; i++) this.snow.push({ x: Math.random(), y: Math.random(), s: rand(1, 3), v: rand(0.02, 0.07) });
    this.time = 0; this.multPop = 0; this.moving = false;
    this.extra = null;
  }
  get freeRound() { return this.freeLeft > 0; }
  get keepWin() { return this.inFree; }
  get locked() { return this.inFree; }
  get animating() { return this.moving || this.grid.some(col => col.some(s => s && (s.die || s.hl))); }

  cell(r, y, k) {
    if (!k && (Math.random() < ORB_P || this.app._forceJp)) { this.app._forceJp = false; const m = [1, 2, 3][Math.random() * 3 | 0]; return { k: 'orb', jp: weighted(ORB_JP), value: m * this.app.bet, y, ty: r, vy: 0, die: 0, hl: 0 }; }
    return { k: k || weighted(WEIGHTS), y, ty: r, vy: 0, die: 0, hl: 0, landed: true };
  }

  resize(W, H) {
    this.W = W; this.H = H;
    const head = Math.max(46, H * 0.09);
    const cs = Math.min((W - 16) / COLS, (H - head - 12) / ROWS);
    this.cs = cs; this.head = head;
    this.gx = (W - cs * COLS) / 2; this.gy = head + (H - head - cs * ROWS) / 2;
    this.bgCache = null;
  }

  renderBg() {
    const { gx, gy, cs, W, H } = this, dpr = this.app.dpr;
    const cnv = makeCanvas(W * dpr, H * dpr), x = cnv.getContext('2d');
    x.scale(dpr, dpr);
    const pw = cs * COLS, ph = cs * ROWS;
    roundRect(x, gx - 8, gy - 8, pw + 16, ph + 16, 16);
    let g = x.createLinearGradient(0, gy - 8, 0, gy + ph + 8);
    g.addColorStop(0, '#e8f8ff'); g.addColorStop(0.5, '#7cc4f2'); g.addColorStop(1, '#d6f1ff');
    x.fillStyle = g; x.fill();
    roundRect(x, gx - 3, gy - 3, pw + 6, ph + 6, 12);
    const L = this.app.light;
    g = x.createLinearGradient(0, gy, 0, gy + ph);
    if (L) { g.addColorStop(0, '#f7fcff'); g.addColorStop(1, '#d4eafb'); }
    else { g.addColorStop(0, 'rgba(12,40,110,0.92)'); g.addColorStop(1, 'rgba(6,20,64,0.95)'); }
    x.fillStyle = g; x.fill();
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      roundRect(x, gx + c * cs + 2, gy + r * cs + 2, cs - 4, cs - 4, 8);
      x.fillStyle = L ? ((c + r) % 2 ? 'rgba(70,130,200,0.08)' : 'rgba(70,130,200,0.14)') : ((c + r) % 2 ? 'rgba(120,190,255,0.08)' : 'rgba(160,220,255,0.13)'); x.fill();
    }
    return cnv;
  }

  update(dt) {
    this.time += dt;
    this.multPop = Math.max(0, this.multPop - dt * 2);
    this.snow.forEach(f => { f.y += f.v * dt; f.x += Math.sin(this.time + f.s * 3) * 0.004 * dt * 10; if (f.y > 1) { f.y = -0.02; f.x = Math.random(); } });
    let moving = false;
    for (let c = 0; c < COLS; c++) {
      let landedNow = false;
      this.grid[c].forEach(s => {
        if (!s) return;
        if (s.die) s.die += dt;
        if (s.y < s.ty || s.vy !== 0) {
          moving = true;
          s.vy += 70 * this.app.speed * dt; s.y += s.vy * dt;
          if (s.y >= s.ty) {
            s.y = s.ty;
            if (s.vy > 6) { s.vy = -s.vy * 0.18; if (!s.landedOnce) { s.landedOnce = true; landedNow = true; } }
            else { s.vy = 0; }
          }
        }
      });
      if (landedNow) this.app.sfx.thud(c);
    }
    // Símbolos que salen por abajo
    if (this.leaving) {
      this.leaving.forEach(col => col.forEach(s => { s.vy += 70 * dt; s.y += s.vy * dt; }));
      if (this.leaving.every(col => col.every(s => s.y > ROWS + 1))) this.leaving = null; else moving = true;
    }
    this.moving = moving;
  }

  settle() {
    return new Promise(res => {
      const chk = () => { if (!this.moving && !this.leaving && this.grid.every(col => col.every(s => s.y === s.ty && s.vy === 0))) res(); else setTimeout(chk, 40); };
      setTimeout(chk, 60);
    });
  }

  draw(x) {
    if (!this.W) return; // aún sin medidas (primer cuadro)
    const { gx, gy, cs, W, H, time } = this;
    const dpr = this.app.dpr;
    // Nieve ambiente
    x.save(); x.globalCompositeOperation = 'lighter';
    const gl = glow('rgba(210,240,255,0.8)', 32);
    this.snow.forEach(f => x.drawImage(gl, f.x * W - f.s * 2, f.y * H - f.s * 2, f.s * 4, f.s * 4));
    x.restore();
    const pw = cs * COLS, ph = cs * ROWS;
    if (!this.bgCache) this.bgCache = this.renderBg();
    x.drawImage(this.bgCache, 0, 0, W, H);
    // Símbolos
    x.save(); x.beginPath(); x.rect(gx - 3, gy - 3, pw + 6, ph + 6); x.clip();
    const drawCell = (s, c) => {
      if (!s) return;
      const size = cs * 0.9;
      let sc = 1, a = 1;
      if (s.hl) sc = 1 + 0.1 * Math.sin(time * 14);
      if (s.die) { sc = 1 + s.die * 1.5; a = Math.max(0, 1 - s.die * 3.3); }
      if (s.k === 'snow') sc *= 1 + 0.05 * Math.sin(time * 4 + c);
      const px = gx + c * cs + cs / 2, py = gy + s.y * cs + cs / 2, d = size * sc;
      if (s.hl || s.k === 'snow') {
        x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = (s.hl ? 0.7 : 0.35) * a;
        x.drawImage(glow(s.k === 'snow' ? 'rgba(140,220,255,1)' : 'rgba(255,230,140,1)', 64), px - cs * 0.75, py - cs * 0.75, cs * 1.5, cs * 1.5); x.restore();
      }
      x.globalAlpha = a;
      if (s.k === 'orb') {
        const bd = cs * 1.02 * (1 + 0.04 * Math.sin(time * 5));
        x.drawImage(jackpotBall(s.jp, shortMoney(s.value || 0), cs * 1.02 * dpr), px - bd / 2, py - bd / 2, bd, bd);
        if (Math.random() < 0.6) electricRing(x, px, py, cs * 0.48, 1.3, '#bff2ff', 0.9);
      } else x.drawImage(sym(ICON[s.k], size * dpr, s.hl ? 'g' : 'n'), px - d / 2, py - d / 2, d, d);
      x.globalAlpha = 1;
    };
    if (this.leaving) this.leaving.forEach((col, c) => col.forEach(s => drawCell(s, c)));
    this.grid.forEach((col, c) => col.forEach(s => drawCell(s, c)));
    x.restore();
    // Cabecera: multiplicador y giros gratis
    const hy = this.gy - 8 - this.head / 2 - 2;
    const ladder = this.inFree ? null : LADDER;
    if (ladder) {
      const bw = Math.min(64, (pw - 20) / 4);
      ladder.forEach((m, i) => {
        const px = W / 2 + (i - 1.5) * (bw + 6), on = this.mult === m;
        roundRect(x, px - bw / 2, hy - 15, bw, 30, 15);
        x.fillStyle = on ? '#bff0ff' : 'rgba(20,50,110,0.8)'; x.fill();
        x.lineWidth = 2; x.strokeStyle = on ? '#fff' : '#5fa8e8'; x.stroke();
        x.font = '900 17px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillStyle = on ? '#0a2a66' : '#bfe6ff'; x.fillText('x' + m, px, hy + 1);
        if (on) { x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.5 + this.multPop; x.drawImage(glow('rgba(120,220,255,1)', 64), px - bw, hy - 30, bw * 2, 60); x.restore(); }
      });
    } else {
      const s = 30 * (1 + this.multPop * 0.6);
      goldText(x, 'x' + this.mult, W / 2, hy, s, { colors: ['#fff', '#dff6ff', '#6cc8ff', '#fff'], stroke: '#06224d', glowColor: '#4fc3ff' });
      x.font = '800 12px ' + FONT; x.textAlign = 'left'; x.fillStyle = '#d8f2ff';
      x.fillText('GIROS: ' + this.freeLeft, gx, hy);
      x.textAlign = 'right'; x.fillText('GANADO: ' + this.app.fmt(this.fsTotal), gx + pw, hy);
    }
  }

  async drop() {
    // Caen los símbolos anteriores y entran nuevos
    this.leaving = this.grid.map(col => col.map(s => Object.assign(s, { vy: 2 + Math.random() * 2, die: 0, hl: 0 })));
    this.grid = [];
    for (let c = 0; c < COLS; c++) {
      this.grid.push([]);
      for (let r = 0; r < ROWS; r++) {
        const s = this.cell(r, r - ROWS - 1.2 - c * 0.8 / this.app.speed - (ROWS - r) * 0.12);
        s.landedOnce = false; s.vy = 0;
        if (this.app._force && r === 2 && c < 4) s.k = 'snow';
        this.grid[c].push(s);
      }
    }
    this.app._force = false;
    this.moving = true;
    await this.settle();
  }

  async play(bet) {
    const app = this.app, sfx = app.sfx;
    const free = this.freeLeft > 0;
    if (free) { this.freeLeft--; } else { this.mult = 1; }
    app.setSpinLabel(free ? 'GRATIS' : 'GIRAR', free ? this.freeLeft + ' restantes' : '');
    sfx.whoosh();
    await this.drop();
    let total = 0, cascade = 0;
    while (true) {
      const wins = evaluate(this.grid.map(col => col.map(s => s)));
      if (!wins.length) break;
      const keys = new Set(wins.map(w => w.k));
      this.grid.forEach(col => col.forEach(s => { if (keys.has(s.k)) s.hl = 1; }));
      const base = wins.reduce((a, w) => a + w.pay * bet, 0), amount = base * this.mult;
      sfx.win(Math.min(2, cascade));
      app.message(wins.map(w => w.n + '× ' + label(w.k)).join(' · ') + (this.mult > 1 ? ' · <b>x' + this.mult + '</b>' : '') + ' = <b>' + app.fmt(amount) + '</b>');
      await app.wait(750);
      // Estallido de hielo
      sfx.shatter(cascade);
      this.grid.forEach((col, c) => col.forEach(s => {
        if (!s.hl) return;
        s.die = 0.001; s.hl = 0;
        const px = this.gx + c * this.cs + this.cs / 2, py = this.gy + s.y * this.cs + this.cs / 2;
        app.burst(px, py, 7, { type: 'shard', color: '#d5f3ff', speed: 380, size: 8, g: 900, life: 0.9 });
        app.burst(px, py, 3, { type: 'spark', color: '#8fd8ff', speed: 120, size: 12 });
      }));
      app.popText(this.gx + this.cs * COLS / 2, this.gy + this.cs * ROWS / 2, app.fmt(amount), 34, ['#fff', '#e8f8ff', '#7cd0ff', '#fff']);
      app.flyCoins(this.gx + this.cs * COLS / 2, this.gy + this.cs * ROWS / 2, 8, 'spark', '#9fe2ff');
      total += amount; app.addWin(amount);
      if (this.inFree) this.fsTotal += amount;
      await app.wait(380);
      // Gravedad: compactar columnas
      for (let c = 0; c < COLS; c++) {
        const keep = this.grid[c].filter(s => !s.die);
        const missing = ROWS - keep.length;
        const col = [];
        for (let i = 0; i < missing; i++) { const s = this.cell(i, i - missing - 0.5 - c * 0.15); s.landedOnce = false; col.push(s); }
        keep.forEach((s, i) => { s.ty = missing + i; s.landedOnce = s.y === s.ty; });
        this.grid[c] = col.concat(keep);
      }
      this.moving = true;
      await this.settle();
      cascade++;
      // Sube el multiplicador
      if (this.inFree) this.mult++;
      else this.mult = LADDER[Math.min(LADDER.length - 1, cascade)];
      this.multPop = 1; sfx.multiplier(this.mult);
    }
    // Bolas de jackpot
    for (let c = 0; c < COLS; c++) for (const s of this.grid[c]) {
      if (s.k !== 'orb' || s.paid) continue;
      s.paid = true; s.hl = 1;
      const v = (await app.awardJackpot(s.jp)) + (s.value || 0);
      if (s.value) app.addWin(s.value);
      total += v; if (this.inFree) this.fsTotal += v;
      s.hl = 0;
    }
    // Copos (dispersores)
    let snows = this.grid.flat().filter(s => s.k === 'snow').length;
    // BONO SORPRESA: rayos congelan casillas en copos hasta completar 4
    if (!free && !this.inFree && snows < 4 && (Math.random() < MYSTERY_P || app._forceMystery)) {
      app._forceMystery = false;
      await app.mysteryIntro('Los rayos congelan copos de nieve');
      const cand = [];
      this.grid.forEach((col, c) => col.forEach((s, r) => { if (s.k !== 'snow' && s.k !== 'orb') cand.push([c, r]); }));
      for (let i = cand.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [cand[i], cand[j]] = [cand[j], cand[i]]; }
      while (snows < 4 && cand.length) {
        const [c, r] = cand.pop();
        this.grid[c][r].k = 'snow'; snows++;
        app.strike(this.gx + c * this.cs + this.cs / 2, this.gy + r * this.cs + this.cs / 2, '#d6f4ff');
        sfx.shatter(snows);
        await app.wait(300);
      }
    }
    let celebrated = false;
    if (snows >= (this.inFree ? 3 : 4)) {
      this.grid.forEach(col => col.forEach(s => { if (s.k === 'snow') s.hl = 1; }));
      sfx.featureStart();
      await app.wait(600);
      { const v = await app.bonusPay(snows, bet, 'copos', this.inFree ? 3 : 4); total += v; if (this.inFree) this.fsTotal += v; }
      if (this.inFree) {
        this.freeLeft += 5;
        await app.banner('+5 GIROS', 'Avalancha extendida', { color: '#6cc8ff' });
      } else {
        this.freeLeft = 10; this.inFree = true; this.fsTotal = total; this.mult = 1;
        app.sfx.stopMusic();
        await app.banner('10 GIROS GRATIS', 'El multiplicador ya no se reinicia', { color: '#6cc8ff', ms: 2600 });
        app.sfx.music('bonus');
      }
      this.grid.forEach(col => col.forEach(s => { s.hl = 0; }));
    }
    if (this.inFree) celebrated = true;
    if (this.inFree && this.freeLeft === 0) {
      // Fin de giros gratis
      await app.wait(500);
      const fs = this.fsTotal;
      this.inFree = false; this.mult = 1;
      if (fs > 0) await app.celebrate(fs, bet, 'AVALANCHA TOTAL');
      app.sfx.stopMusic(); app.sfx.music(Avalanche.music);
      app.message('Giros gratis: <b>' + app.fmt(fs) + '</b>');
    } else if (!total && !this.inFree) app.message(this.hint);
    app.setSpinLabel(this.freeLeft ? 'GRATIS' : 'GIRAR', this.freeLeft ? this.freeLeft + ' restantes' : '');
    return { win: total, celebrated };
  }
  slam() { }
  info(bet, fmt) {
    const ic = i => '<i class="ico" style="background-position:' + (i % 6) * 20 + '% ' + Math.floor(i / 6) * 25 + '%"></i>';
    return '<h3>Cómo se juega</h3><ul>' +
      '<li>Cuadrícula <b>6 × 5</b> sin líneas: <b>8 o más símbolos iguales en cualquier posición</b> pagan.</li>' +
      '<li><b>Cascadas</b>: los ganadores estallan en hielo y caen símbolos nuevos, que pueden volver a ganar.</li>' +
      '<li>Multiplicador del juego base por cascada: <b>x1 → x2 → x3 → x5</b>.</li>' +
      '<li><b>Bolas MINI · MINOR · MAJOR · GRAND</b>: muy raras; pagan su jackpot progresivo <b>+ el valor</b> que muestran, al final del giro.</li>' +
      '<li><b>4+ copos ❄</b> = <b>10 giros gratis</b>. Ahí el multiplicador sube +1 en cada cascada y <b>no se reinicia</b> entre giros. 3+ copos = +5 giros.</li></ul>' +
      '<h3>Pagos (apuesta ' + fmt(bet) + ') · 8-9 / 10-11 / 12+</h3><table>' +
      Object.keys(PAY).map(k => '<tr><td>' + ic(ICON[k]) + '</td><td>' + label(k) + '</td><td>' + PAY[k].map(p => fmt(p * bet)).join(' · ') + '</td></tr>').join('') + '</table>';
  }
}
function label(k) { return { queen: 'Princesa', diamond: 'Diamante', bstar: 'Estrella azul', gstar: 'Estrella verde', K: 'K', Q: 'Q', J: 'J', ten: '10', snow: 'Copo' }[k]; }
