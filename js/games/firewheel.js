// RUEDA DE FUEGO · clásico 3x3, 5 líneas.
// El WILD de fuego solo cae en el rodillo central: se expande a todo el rodillo y duplica
// las líneas donde participa. 3 soles = RUEDA DE FUEGO con multiplicadores y 4 jackpots.
import { S, sym, glow, goldText, roundRect, ease, rand, FONT } from '../gfx.js?v=69';
import { ReelSet, LINES_3x3, weighted, weightedIdx } from '../reels.js?v=69';

export const PAY = { seven: 60, bell: 24, melon: 18, grapes: 18, plum: 9, orange: 9, cherry: 6 };
const W_REEL = [
  { seven: 3, bell: 6, melon: 8, grapes: 8, plum: 11, orange: 11, cherry: 12, sun: 2.4 },
  { seven: 3, bell: 6, melon: 8, grapes: 8, plum: 11, orange: 11, cherry: 12, sun: 2.4, wild: 2.2 },
  { seven: 3, bell: 6, melon: 8, grapes: 8, plum: 11, orange: 11, cherry: 12, sun: 2.4 }
];
const ICON = { seven: S.SEVEN, bell: S.BELL, melon: S.MELON, grapes: S.GRAPES, plum: S.PLUM, orange: S.ORANGE, cherry: S.CHERRY, sun: S.SUN, wild: S.BURST };
export const MYSTERY_P = 1 / 90;
export const WHEEL = [
  { t: 'x10', m: 10, w: 20 }, { t: 'x20', m: 20, w: 12 }, { t: 'MINI', jp: 'mini', w: 8, col: '#34c24d' },
  { t: 'x15', m: 15, w: 16 }, { t: 'x50', m: 50, w: 6 }, { t: 'MINOR', jp: 'minor', w: 4, col: '#1fb7d8' },
  { t: 'x10', m: 10, w: 20 }, { t: 'x25', m: 25, w: 10 }, { t: 'MAJOR', jp: 'major', w: 1, col: '#b53ae6' },
  { t: 'x15', m: 15, w: 16 }, { t: 'x100', m: 100, w: 2 }, { t: 'GRAND', jp: 'grand', w: 0.25, col: '#ef3b2c' }
];

export function evalGrid(g, lineBet) {
  // g[col][row]; wild expandido ya aplicado
  const wins = [];
  LINES_3x3.forEach((L, li) => {
    const s = L.map((r, c) => g[c][r].k);
    const hasWild = s.includes('wild');
    const base = s.find(k => k !== 'wild');
    if (!base) { wins.push({ li, line: L, n: 3, win: PAY.seven * lineBet * 2 }); return; }
    if (base === 'sun') return;
    if (s.every(k => k === base || k === 'wild')) { wins.push({ li, line: L, n: 3, win: PAY[base] * lineBet * (hasWild ? 2 : 1) }); return; }
    if (s[0] === 'cherry' && (s[1] === 'cherry' || s[1] === 'wild')) wins.push({ li, line: L, n: 2, win: 2 * lineBet });
  });
  return wins;
}

export default class FireWheel {
  static id = 'firewheel';
  static name = 'Rueda de Fuego';
  static music = 'fire';
  static lobby = {
    icons: [S.SEVEN, S.BURST, S.SUN], c1: '#ff5a1f', c2: '#5c0a0a', mechanic: 'Clásica 3×3 + rueda de premios',
    desc: 'Tragamonedas clásica rápida. El wild de fuego se expande y duplica. 3 soles giran la rueda con jackpots.'
  };
  constructor(app) {
    this.app = app; this.id = FireWheel.id;
    this.hint = '<b>WILD</b> de fuego se expande y duplica. 3 ☀ = <b>RUEDA DE FUEGO</b>.';
    this.reels = new ReelSet({ cols: 3, rows: 3, pick: c => ({ k: weighted(W_REEL[c]) }), drawSym: (x, s, px, py, w, h, o) => this.drawSym(x, s, px, py, w, h, o) });
    this.embers = []; this.time = 0; this.fire = 0; this.wins = null; this.winT = 0; this.wheel = null;
    this.extra = null;
  }
  get animating() { return this.reels.spinning || this.fire > 0 || !!this.wheel || !!this.wins; }

  resize(W, H) {
    this.W = W; this.H = H;
    const cs = Math.min((W - 40) / 3, (H - 40) / 3.3);
    this.cs = cs; this.gx = (W - cs * 3) / 2; this.gy = (H - cs * 3) / 2 + 6;
    this.reels.layout(this.gx, this.gy, cs, cs);
  }
  drawSym(x, s, px, py, w, h, o) {
    const dpr = this.app.dpr, size = w * 0.84;
    let sc = 1, a = 1;
    if (o && o.fx) { sc = o.fx.scale || 1; a = o.fx.alpha == null ? 1 : o.fx.alpha; }
    if (s.k === 'wild' && this.expanded && o && !o.spinning) return; // lo dibuja la columna de fuego
    const d = size * sc, cx = px + w / 2, cy = py + h / 2;
    x.globalAlpha = a;
    if (o && o.blur) x.drawImage(sym(ICON[s.k], size * dpr, 'b'), cx - d / 2, cy - d * 0.675, d, d * 1.35);
    else {
      if (s.k === 'sun') { x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.4 + 0.2 * Math.sin(this.time * 5); x.drawImage(glow('rgba(255,180,40,1)', 64), cx - w * 0.6, cy - h * 0.6, w * 1.2, h * 1.2); x.restore(); x.globalAlpha = a; }
      x.drawImage(sym(ICON[s.k], size * dpr), cx - d / 2, cy - d / 2, d, d);
    }
    x.globalAlpha = 1;
  }
  update(dt) {
    this.time += dt;
    this.reels.update(dt);
    if (this.wins) this.winT += dt;
    // Brasas ambiente
    if (this.embers.length < 45 && Math.random() < 0.6) this.embers.push({ x: Math.random() * this.W, y: this.H + 5, vy: rand(-60, -130), vx: rand(-15, 15), life: rand(1.5, 3.5), age: 0, s: rand(2, 5) });
    this.embers.forEach(e => { e.age += dt; e.x += e.vx * dt + Math.sin(this.time * 3 + e.s) * 0.4; e.y += e.vy * dt; });
    this.embers = this.embers.filter(e => e.age < e.life);
    if (this.wheel) this.updateWheel(dt);
  }
  draw(x) {
    if (!this.W) return; // aún sin medidas (primer cuadro)
    const { gx, gy, cs, W, H, time } = this;
    // Brasas
    x.save(); x.globalCompositeOperation = 'lighter';
    this.embers.forEach(e => { x.globalAlpha = 1 - e.age / e.life; x.drawImage(glow('rgba(255,120,20,1)', 32), e.x - e.s * 2, e.y - e.s * 2, e.s * 4, e.s * 4); });
    x.restore();
    // Gabinete cromado
    const bw = cs * 3, bh = cs * 3;
    roundRect(x, gx - 14, gy - 14, bw + 28, bh + 28, 20);
    let g = x.createLinearGradient(0, gy - 14, 0, gy + bh + 14);
    g.addColorStop(0, '#fff1c9'); g.addColorStop(0.2, '#c98a2b'); g.addColorStop(0.5, '#6b2c05'); g.addColorStop(0.8, '#e2a13a'); g.addColorStop(1, '#fff0c0');
    x.fillStyle = g; x.fill();
    // Bombillas
    const bulbs = 22;
    for (let i = 0; i < bulbs; i++) {
      const t = i / bulbs, per = 2 * (bw + bh) + 56;
      let d = t * per, bx, by;
      const L = [bw + 28, bh + 28];
      if (d < L[0]) { bx = gx - 14 + d; by = gy - 14; } else if ((d -= L[0]) < L[1]) { bx = gx + bw + 14; by = gy - 14 + d; }
      else if ((d -= L[1]) < L[0]) { bx = gx + bw + 14 - d; by = gy + bh + 14; } else { d -= L[0]; bx = gx - 14; by = gy + bh + 14 - d; }
      const on = (Math.floor(time * 6) + i) % 3 === 0 || this.wheel;
      x.fillStyle = on ? '#fff6c0' : '#7a3a10'; x.beginPath(); x.arc(bx, by, 3.2, 0, 7); x.fill();
      if (on) { x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.6; x.drawImage(glow('rgba(255,200,80,1)', 32), bx - 9, by - 9, 18, 18); x.restore(); }
    }
    roundRect(x, gx - 4, gy - 4, bw + 8, bh + 8, 12);
    g = x.createLinearGradient(0, gy, 0, gy + bh);
    if (this.app.light) { g.addColorStop(0, '#fffaf0'); g.addColorStop(0.5, '#f3e3c5'); g.addColorStop(1, '#fffaf0'); }
    else { g.addColorStop(0, '#1a0703'); g.addColorStop(0.5, '#3a1408'); g.addColorStop(1, '#1a0703'); }
    x.fillStyle = g; x.fill();
    x.strokeStyle = this.app.light ? 'rgba(120,60,10,0.35)' : 'rgba(255,150,60,0.3)'; x.lineWidth = 2;
    for (let c = 1; c < 3; c++) { x.beginPath(); x.moveTo(gx + c * cs, gy); x.lineTo(gx + c * cs, gy + bh); x.stroke(); }
    // Sombra de cilindro
    this.reels.draw(x, (c, r) => this.cellFx(c, r));
    for (let c = 0; c < 3; c++) {
      g = x.createLinearGradient(0, gy, 0, gy + bh);
      g.addColorStop(0, 'rgba(60,20,0,0.45)'); g.addColorStop(0.18, 'rgba(0,0,0,0)'); g.addColorStop(0.82, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(60,20,0,0.45)');
      x.fillStyle = g; x.fillRect(gx + c * cs, gy, cs, bh);
    }
    // Columna de fuego (wild expandido)
    if (this.fire > 0 || this.expanded) {
      const px = gx + cs, k = this.expanded ? 1 : 0;
      x.save(); x.beginPath(); x.rect(px, gy, cs, bh); x.clip();
      g = x.createLinearGradient(0, gy + bh, 0, gy);
      g.addColorStop(0, 'rgba(255,60,0,0.95)'); g.addColorStop(0.5, 'rgba(255,150,20,0.85)'); g.addColorStop(1, 'rgba(255,230,120,0.7)');
      const hgt = bh * (this.expanded ? 1 : ease.outCubic(1 - this.fire));
      x.fillStyle = g; x.fillRect(px, gy + bh - hgt, cs, hgt);
      x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 10; i++) {
        const fx0 = px + cs * ((i * 37 % 10) / 10), fy = gy + bh - ((time * 180 + i * 53) % bh);
        x.globalAlpha = 0.5; x.drawImage(glow('rgba(255,120,10,1)', 64), fx0 - 20, fy - 30, 40, 60);
      }
      x.restore();
      if (k) {
        const d = cs * 1.15 * (1 + 0.05 * Math.sin(time * 8));
        x.drawImage(sym(S.BURST, cs * 1.15 * this.app.dpr), px + cs / 2 - d / 2, gy + bh / 2 - d / 2, d, d);
        goldText(x, 'WILD x2', px + cs / 2, gy + bh - 22, Math.min(26, cs * 0.28), { glowColor: '#ff5a00' });
      }
    }
    if (this.wins) this.drawWins(x);
    if (this.wheel) this.drawWheel(x);
  }
  cellFx(c, r) {
    if (!this.wins || !this.wins.length) return null;
    const w = this.wins[Math.floor(this.winT / 1.0) % this.wins.length];
    return w.line.slice(0, w.n).some((rr, cc) => cc === c && rr === r) ? { scale: 1 + 0.07 * Math.sin(this.winT * 12) } : { alpha: 0.5 };
  }
  drawWins(x) {
    const w = this.wins[Math.floor(this.winT / 1.0) % this.wins.length], { gx, gy, cs } = this;
    x.save(); x.globalCompositeOperation = 'lighter'; x.lineJoin = 'round';
    x.beginPath(); w.line.forEach((r, c) => { const px = gx + c * cs + cs / 2, py = gy + r * cs + cs / 2; c ? x.lineTo(px, py) : x.moveTo(gx - 10, py); });
    x.lineTo(gx + cs * 3 + 10, gy + w.line[2] * cs + cs / 2);
    x.strokeStyle = 'rgba(255,90,0,0.45)'; x.lineWidth = 14; x.stroke(); x.strokeStyle = '#fff2b0'; x.lineWidth = 3.5; x.stroke();
    x.restore();
    goldText(x, this.app.fmt(w.win), gx + cs * 1.5, gy + (w.line[1] + 0.5) * cs, Math.min(40, cs * 0.35), { glowColor: '#ff6a00' });
  }

  async play(bet) {
    const app = this.app, sfx = app.sfx;
    this.wins = null; this.expanded = false;
    const final = [0, 1, 2].map(c => [0, 1, 2].map(() => ({ k: weighted(W_REEL[c]) })));
    if (app._force) { app._force = false; [0, 1, 2].forEach(c => { final[c][c] = { k: 'sun' }; }); }
    const suns01 = final[0].concat(final[1]).filter(s => s.k === 'sun').length;
    sfx.spinStart(app.speed >= 2);
    app.setSpinLabel('PARAR');
    this.reels.start(app.speed);
    await this.reels.stopTo(final, {
      anticFrom: suns01 >= 2 ? 2 : -1,
      onStop: (c, last) => {
        sfx.reelStop(c, last);
        if (this.reels.anticipating) sfx.anticipation(true);
        final[c].forEach((s, r) => {
          const px = this.gx + c * this.cs + this.cs / 2, py = this.gy + r * this.cs + this.cs / 2;
          if (s.k === 'sun') { sfx.bell(880 + c * 220, 0.8, 0.12); app.burst(px, py, 14, { type: 'ember', color: '#ffb030', speed: 260, size: 10 }); }
        });
        if (last) sfx.anticipation(false);
      }
    });
    sfx.anticipation(false);
    // Wild expansivo
    const grid = final.map(col => col.slice());
    if (final[1].some(s => s.k === 'wild')) {
      sfx.fire(); app.shake(false);
      this.fire = 1;
      const t0 = performance.now();
      await new Promise(res => { const f = () => { this.fire = Math.max(0, 1 - (performance.now() - t0) / 600); if (this.fire > 0) requestAnimationFrame(f); else res(); }; f(); });
      this.expanded = true;
      grid[1] = [{ k: 'wild' }, { k: 'wild' }, { k: 'wild' }];
      app.burst(this.gx + this.cs * 1.5, this.gy + this.cs * 1.5, 30, { type: 'ember', color: '#ff7a1a', speed: 400, size: 12, lift: 100 });
    }
    const wins = evalGrid(grid, bet / 5);
    let total = wins.reduce((a, w) => a + w.win, 0);
    if (wins.length) {
      this.wins = wins; this.winT = 0;
      sfx.win(total >= bet * 5 ? 2 : 0); app.addWin(total);
      app.flyCoins(this.gx + this.cs * 1.5, this.gy + this.cs * 1.5, Math.min(14, 3 + wins.length * 2));
      app.message('Premio: <b>' + app.fmt(total) + '</b>' + (this.expanded ? ' · WILD x2' : ''));
    } else app.message(this.hint);
    let suns = grid.flat().filter(s => s.k === 'sun').length;
    // BONO SORPRESA: rayos de fuego encienden soles hasta completar 3
    if (suns < 3 && (Math.random() < MYSTERY_P || app._forceMystery)) {
      app._forceMystery = false;
      await app.wait(wins.length ? 900 : 300);
      this.wins = null;
      await app.mysteryIntro('Los rayos encienden los soles');
      const cand = [];
      for (let c = 0; c < 3; c++) if (c !== 1 || !this.expanded) for (let r = 0; r < 3; r++) if (grid[c][r].k !== 'sun') cand.push([c, r]);
      for (let i = cand.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [cand[i], cand[j]] = [cand[j], cand[i]]; }
      while (suns < 3 && cand.length) {
        const [c, r] = cand.pop(), sn = { k: 'sun' };
        grid[c][r] = sn; this.reels.setCell(c, r, sn); suns++;
        app.strike(this.gx + c * this.cs + this.cs / 2, this.gy + r * this.cs + this.cs / 2, '#ffc04a');
        sfx.bell(880 + suns * 220, 0.8, 0.12);
        await app.wait(320);
      }
    }
    let celebrated = false;
    if (suns >= 3) {
      await app.wait(wins.length ? 1300 : 500);
      this.wins = null;
      const w = await this.spinWheel(bet);
      total += w; celebrated = true;
    } else if (wins.length) await app.wait(Math.min(1800, 700 + wins.length * 300));
    app.setSpinLabel('GIRAR');
    return { win: total, celebrated: celebrated && total > 0 };
  }

  // ---------- Rueda ----------
  async spinWheel(bet) {
    const app = this.app, sfx = app.sfx;
    sfx.featureStart(); app.flash('#ffb040', 0.6); app.shake(true);
    await app.banner('RUEDA DE FUEGO', 'Gira por multiplicadores y jackpots', { color: '#ff7a1a', ms: 2000 });
    const idx = weightedIdx(WHEEL.map(s => s.w)), n = WHEEL.length, seg = Math.PI * 2 / n;
    // Ángulo final: el segmento idx queda bajo el puntero (arriba)
    const target = Math.PI * 2 * (6 + Math.floor(Math.random() * 2)) + (Math.PI * 2 - (idx * seg + seg / 2)) + rand(-seg * 0.35, seg * 0.35);
    this.wheel = { a: 0, from: 0, to: target, t: 0, dur: 5.5 / Math.sqrt(app.speed), lastSeg: -1, done: false, idx, show: 0 };
    sfx.whoosh();
    await new Promise(res => { this.wheel.res = res; });
    const s = WHEEL[idx];
    let v;
    if (s.jp) v = await app.awardJackpot(s.jp);
    else { v = s.m * bet; sfx.jackpot(1); app.flash('#fff', 0.5); await app.wait(700); app.addWin(v); }
    await app.celebrate(v, bet, s.jp ? s.t : 'RUEDA ' + s.t);
    this.wheel = null;
    return v;
  }
  updateWheel(dt) {
    const w = this.wheel; if (w.done) { w.show += dt; return; }
    w.t += dt;
    const k = Math.min(1, w.t / w.dur);
    w.a = w.from + (w.to - w.from) * ease.outCubic(k);
    const seg = Math.PI * 2 / WHEEL.length, cur = Math.floor(((Math.PI * 2 * 100 - w.a) % (Math.PI * 2)) / seg);
    if (cur !== w.lastSeg) { w.lastSeg = cur; this.app.sfx.wheelTick(); w.kick = 1; }
    w.kick = Math.max(0, (w.kick || 0) - dt * 8);
    if (k >= 1) { w.done = true; setTimeout(() => w.res && w.res(), 300); }
  }
  drawWheel(x) {
    const w = this.wheel, { W, H, time } = this;
    x.save();
    x.fillStyle = 'rgba(20,0,0,0.6)'; x.fillRect(0, 0, W, H);
    const R = Math.min(W, H) * 0.44, cx = W / 2, cy = H / 2 + 10, n = WHEEL.length, seg = Math.PI * 2 / n;
    x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.6;
    x.drawImage(glow('rgba(255,120,20,1)', 128), cx - R * 1.5, cy - R * 1.5, R * 3, R * 3);
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    x.translate(cx, cy); x.rotate(w.a - Math.PI / 2);
    WHEEL.forEach((s, i) => {
      const a0 = i * seg, a1 = a0 + seg;
      const g = x.createRadialGradient(0, 0, R * 0.2, 0, 0, R);
      const base = s.col || (i % 2 ? '#c2410c' : '#7c1d06');
      g.addColorStop(0, '#fff3c4'); g.addColorStop(0.35, base); g.addColorStop(1, base);
      x.fillStyle = g; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, R, a0, a1); x.closePath(); x.fill();
      x.strokeStyle = '#ffd98a'; x.lineWidth = 2; x.stroke();
      x.save(); x.rotate(a0 + seg / 2);
      x.font = '900 ' + R * (s.jp ? 0.1 : 0.13) + 'px ' + FONT; x.textAlign = 'right'; x.textBaseline = 'middle';
      x.lineWidth = 4; x.strokeStyle = '#2a0800'; x.strokeText(s.t, R * 0.9, 0);
      x.fillStyle = w.done && i === w.idx && Math.floor(time * 6) % 2 ? '#fff' : '#ffe9a8'; x.fillText(s.t, R * 0.9, 0);
      x.restore();
    });
    // Aro con luces
    x.lineWidth = R * 0.06; x.strokeStyle = '#8a4a0a'; x.beginPath(); x.arc(0, 0, R, 0, 7); x.stroke();
    x.rotate(-(w.a - Math.PI / 2));
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2, on = (Math.floor(time * 10) + i) % 2 === 0;
      x.fillStyle = on ? '#fff8d0' : '#b06010'; x.beginPath(); x.arc(Math.cos(a) * R, Math.sin(a) * R, R * 0.022, 0, 7); x.fill();
    }
    // Centro
    let g = x.createRadialGradient(-R * 0.05, -R * 0.05, 1, 0, 0, R * 0.2);
    g.addColorStop(0, '#fff7d0'); g.addColorStop(0.5, '#f0a020'); g.addColorStop(1, '#7a2a00');
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, R * 0.2, 0, 7); x.fill();
    x.drawImage(sym(S.SUN, R * 0.36 * this.app.dpr), -R * 0.18, -R * 0.18, R * 0.36, R * 0.36);
    // Puntero
    const kick = (w.kick || 0) * 0.3;
    x.save(); x.translate(0, -R - 6); x.rotate(kick);
    x.fillStyle = '#fff'; x.strokeStyle = '#7a1a00'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(-14, -18); x.lineTo(14, -18); x.lineTo(0, 16); x.closePath(); x.fill(); x.stroke();
    x.restore();
    x.restore();
  }
  slam() { this.reels.slam(); }
  info(bet, fmt) {
    const lb = bet / 5, ic = i => '<i class="ico" style="background-position:' + (i % 6) * 20 + '% ' + Math.floor(i / 6) * 25 + '%"></i>';
    const names = { seven: '7', bell: 'Campana', melon: 'Sandía', grapes: 'Uvas', plum: 'Ciruela', orange: 'Naranja', cherry: 'Cereza' };
    return '<h3>Cómo se juega</h3><ul><li><b>3 rodillos × 3 filas, 5 líneas</b> (3 horizontales y 2 diagonales).</li>' +
      '<li><b>WILD de fuego</b> (solo rodillo central): se expande a todo el rodillo, sustituye y <b>duplica</b> el premio.</li>' +
      '<li>2 cerezas desde la izquierda pagan ' + fmt(2 * lb) + '.</li>' +
      '<li><b>3 soles ☀</b> en cualquier posición activan la <b>RUEDA DE FUEGO</b>: multiplicadores ×10 a ×100 o jackpots MINI · MINOR · MAJOR · GRAND.</li></ul>' +
      '<h3>Pagos por línea (apuesta ' + fmt(bet) + ')</h3><table>' + Object.keys(PAY).map(k => '<tr><td>' + ic(ICON[k]) + '</td><td>' + names[k] + ' ×3</td><td>' + fmt(PAY[k] * lb) + '</td></tr>').join('') + '</table>';
  }
}
