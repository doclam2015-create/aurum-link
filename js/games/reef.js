// ARRECIFE DE GEMAS · 7x7, pagos por GRUPOS (5+ iguales conectados en horizontal/vertical).
// Los grupos ganadores estallan en burbujas y caen gemas nuevas (cascadas). Cada casilla donde
// estalla un grupo queda MARCADA; si vuelve a estallar ahí se enciende un multiplicador x2 que
// se duplica cada vez (x4, x8 … x128). Un grupo sobre casillas encendidas se multiplica por la
// suma de sus multiplicadores. 3+ perlas = giros gratis donde las marcas NO se borran.
import { S, sym, ball, glow, goldText, roundRect, rand, FONT, makeCanvas } from '../gfx.js?v=76';
import { weighted } from '../reels.js?v=76';

const COLS = 7, ROWS = 7;
// Pago (× apuesta) según tamaño del grupo: 5, 6, 7, 8, 9-10, 11-12, 13-14, 15+
export const PAY = {
  diamond: [1, 1.5, 2.5, 4, 6, 10, 20, 50],
  rstar: [0.6, 1, 1.5, 2.5, 4, 7, 12, 30],
  bstar: [0.5, 0.75, 1.2, 2, 3, 5, 9, 20],
  gstar: [0.4, 0.6, 1, 1.5, 2.5, 4, 7, 15],
  clover: [0.3, 0.5, 0.8, 1.2, 2, 3, 5, 10],
  plum: [0.2, 0.3, 0.5, 0.8, 1.2, 2, 3.5, 7]
};
export const SCALE = 1.4;
export const WEIGHTS = { diamond: 8, rstar: 10, bstar: 12, gstar: 13, clover: 15, plum: 17, pearl: 0.55 };
const FREE_W = Object.assign({}, WEIGHTS, { pearl: 0.22 });
const ICON = { diamond: S.DIAMOND, rstar: S.RSTAR, bstar: S.BSTAR, gstar: S.GSTAR, clover: S.CLOVER, plum: S.PLUM };
export const MYSTERY_P = 1 / 150;
const MAXM = 128;
export function sizeIdx(n) { return n >= 15 ? 7 : n >= 13 ? 6 : n >= 11 ? 5 : n >= 9 ? 4 : n - 5; }

// Grupos conectados (4 vecinos) de 5+ símbolos iguales. grid[c][r] = {k}
export function clusters(grid) {
  const seen = grid.map(col => col.map(() => false)), out = [];
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
    const s = grid[c][r];
    if (seen[c][r] || !s || !PAY[s.k]) continue;
    const k = s.k, cells = [], st = [[c, r]]; seen[c][r] = true;
    while (st.length) {
      const [x, y] = st.pop(); cells.push([x, y]);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || seen[nx][ny]) continue;
        const o = grid[nx][ny]; if (!o || o.k !== k) continue;
        seen[nx][ny] = true; st.push([nx, ny]);
      }
    }
    if (cells.length >= 5) out.push({ k, cells, n: cells.length });
  }
  return out;
}
// Multiplicador de un grupo: suma de las casillas encendidas que toca (mínimo 1)
export function clusterMult(cells, marks) {
  let m = 0; cells.forEach(([c, r]) => { if (marks[c][r] >= 2) m += marks[c][r]; });
  return Math.max(1, m);
}
// Marca / enciende / duplica las casillas donde estalla un grupo
export function applyMarks(cells, marks) {
  cells.forEach(([c, r]) => { const v = marks[c][r]; marks[c][r] = v === 0 ? 1 : v === 1 ? 2 : Math.min(MAXM, v * 2); });
}

export default class Reef {
  static id = 'reef';
  static name = 'Arrecife de Gemas';
  static music = 'ocean';
  static lobby = {
    icons: [S.DIAMOND, S.BSTAR, S.CLOVER], c1: '#27c6d9', c2: '#06284a', mechanic: 'Grupos + casillas multiplicadoras',
    desc: '7×7: grupos de 5+ gemas conectadas pagan y estallan. Donde estallan quedan marcas que se vuelven multiplicadores de hasta x128.'
  };
  constructor(app) {
    this.app = app; this.id = Reef.id;
    this.hint = 'Grupos de <b>5+ gemas</b> conectadas pagan. Las casillas marcadas se vuelven <b>multiplicadores</b>. 3 perlas = <b>giros gratis</b>.';
    this.marks = []; for (let c = 0; c < COLS; c++) this.marks.push(new Array(ROWS).fill(0));
    this.grid = [];
    for (let c = 0; c < COLS; c++) { this.grid.push([]); for (let r = 0; r < ROWS; r++) this.grid[c].push(this.cell(r, r)); }
    this.freeLeft = 0; this.fsTotal = 0; this.inFree = false;
    this.time = 0; this.moving = false; this.leaving = null;
    this.bubbles = []; for (let i = 0; i < 26; i++) this.bubbles.push({ x: Math.random(), y: Math.random(), s: rand(2, 6), v: rand(0.03, 0.09), p: Math.random() * 6 });
    this.fish = []; for (let i = 0; i < 4; i++) this.fish.push({ x: Math.random(), y: rand(0.1, 0.95), v: rand(0.02, 0.05) * (Math.random() < 0.5 ? -1 : 1), s: rand(6, 11), c: ['#ffb347', '#ff6b8a', '#7ce0ff', '#ffe066'][i] });
    this.buy = { label: 'BONO', sub: b => app.fmt(b * 45), cost: b => b * 45, run: () => this.buyFree() };
  }
  get extra() { return this.inFree ? null : this.buy; }
  get freeRound() { return this.freeLeft > 0; }
  get keepWin() { return this.inFree; }
  get locked() { return this.inFree; }
  get animating() { return true; } // agua animada

  cell(r, y, k) { return { k: k || weighted(this.inFree ? FREE_W : WEIGHTS), y, ty: r, vy: 0, die: 0, hl: 0 }; }

  resize(W, H) {
    this.W = W; this.H = H;
    const head = Math.max(34, H * 0.06);
    const cs = Math.min((W - 20) / COLS, (H - head - 22) / ROWS);
    this.cs = cs; this.head = head;
    this.gx = (W - cs * COLS) / 2; this.gy = head + (H - head - cs * ROWS) / 2;
    this.bgCache = null;
  }
  // Fondo marino pre-renderizado: rayos de luz, arena, corales y algas
  renderBg() {
    const { gx, gy, cs, W, H } = this, dpr = this.app.dpr, L = this.app.light;
    const cnv = makeCanvas(W * dpr, H * dpr), x = cnv.getContext('2d');
    x.scale(dpr, dpr);
    let g = x.createLinearGradient(0, 0, 0, H);
    if (L) { g.addColorStop(0, '#bff3ff'); g.addColorStop(1, '#5fb8d8'); } else { g.addColorStop(0, '#0a5a86'); g.addColorStop(0.6, '#063555'); g.addColorStop(1, '#021a2e'); }
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // Rayos de sol bajo el agua
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const sx = W * (0.1 + i * 0.17);
      g = x.createLinearGradient(0, 0, 0, H * 0.9);
      g.addColorStop(0, 'rgba(180,240,255,0.16)'); g.addColorStop(1, 'rgba(180,240,255,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(sx, 0); x.lineTo(sx + W * 0.06, 0); x.lineTo(sx + W * 0.2, H); x.lineTo(sx + W * 0.08, H); x.fill();
    }
    x.restore();
    // Arena
    g = x.createLinearGradient(0, H * 0.86, 0, H);
    g.addColorStop(0, L ? '#f1d99a' : '#8a6a36'); g.addColorStop(1, L ? '#d8b86a' : '#4a3414');
    x.fillStyle = g; x.beginPath(); x.moveTo(0, H * 0.9);
    for (let i = 0; i <= 10; i++) x.lineTo(W * i / 10, H * (0.88 + 0.02 * Math.sin(i * 1.7)));
    x.lineTo(W, H); x.lineTo(0, H); x.fill();
    // Corales y algas a los lados
    const coral = (cx, base, h, col) => {
      x.strokeStyle = col; x.lineCap = 'round';
      const branch = (px, py, ang, len, w) => {
        if (len < 4) return;
        const nx = px + Math.cos(ang) * len, ny = py + Math.sin(ang) * len;
        x.lineWidth = w; x.beginPath(); x.moveTo(px, py); x.lineTo(nx, ny); x.stroke();
        branch(nx, ny, ang - 0.45, len * 0.72, w * 0.72); branch(nx, ny, ang + 0.4, len * 0.68, w * 0.72);
      };
      branch(cx, base, -Math.PI / 2, h * 0.35, Math.max(3, h * 0.07));
    };
    coral(W * 0.05, H * 0.95, H * 0.3, L ? '#ff7a8a' : '#d8456a');
    coral(W * 0.95, H * 0.96, H * 0.26, L ? '#ffa24a' : '#e07a2a');
    coral(W * 0.16, H * 0.98, H * 0.18, L ? '#c77dff' : '#9a4ad8');
    coral(W * 0.86, H * 0.98, H * 0.2, L ? '#ff7a8a' : '#c83a5a');
    // Marco de la cuadrícula: coral dorado
    const pw = cs * COLS, ph = cs * ROWS;
    roundRect(x, gx - 8, gy - 8, pw + 16, ph + 16, 18);
    g = x.createLinearGradient(gx, gy, gx + pw, gy + ph);
    g.addColorStop(0, '#ffe9a8'); g.addColorStop(0.5, '#3ec9d6'); g.addColorStop(1, '#ffe9a8');
    x.fillStyle = g; x.fill();
    roundRect(x, gx - 3, gy - 3, pw + 6, ph + 6, 13);
    g = x.createLinearGradient(0, gy, 0, gy + ph);
    if (L) { g.addColorStop(0, 'rgba(240,252,255,0.95)'); g.addColorStop(1, 'rgba(200,236,250,0.95)'); }
    else { g.addColorStop(0, 'rgba(4,40,70,0.9)'); g.addColorStop(1, 'rgba(2,22,44,0.94)'); }
    x.fillStyle = g; x.fill();
    return cnv;
  }

  update(dt) {
    this.time += dt;
    this.bubbles.forEach(b => { b.y -= b.v * dt; if (b.y < -0.05) { b.y = 1.05; b.x = Math.random(); } });
    this.fish.forEach(f => { f.x += f.v * dt; if (f.x > 1.1) f.x = -0.1; if (f.x < -0.1) f.x = 1.1; });
    let moving = false;
    for (let c = 0; c < COLS; c++) {
      let landedNow = false;
      this.grid[c].forEach(s => {
        if (s.die) s.die += dt;
        if (s.y < s.ty || s.vy !== 0) {
          moving = true;
          s.vy += 60 * this.app.speed * dt; s.y += s.vy * dt;
          if (s.y >= s.ty) {
            s.y = s.ty;
            if (s.vy > 6) { s.vy = -s.vy * 0.15; if (!s.landedOnce) { s.landedOnce = true; landedNow = true; } } else s.vy = 0;
          }
        }
      });
      if (landedNow) this.app.sfx.thud(c);
    }
    if (this.leaving) {
      this.leaving.forEach(col => col.forEach(s => { s.vy += 60 * dt; s.y += s.vy * dt; }));
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
    const { gx, gy, cs, W, H, time } = this, dpr = this.app.dpr;
    if (!this.bgCache) this.bgCache = this.renderBg();
    x.drawImage(this.bgCache, 0, 0, W, H);
    // Peces
    this.fish.forEach(f => {
      const px = f.x * W, py = f.y * H + Math.sin(time * 2 + f.s) * 6, d = f.v > 0 ? 1 : -1;
      x.fillStyle = f.c; x.globalAlpha = 0.75;
      x.beginPath(); x.ellipse(px, py, f.s * 1.6, f.s, 0, 0, 7); x.fill();
      x.beginPath(); x.moveTo(px - d * f.s * 1.4, py); x.lineTo(px - d * f.s * 2.6, py - f.s * 0.9); x.lineTo(px - d * f.s * 2.6, py + f.s * 0.9); x.fill();
      x.globalAlpha = 1;
    });
    const pw = cs * COLS, ph = cs * ROWS;
    // Casillas marcadas / multiplicadores
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      const m = this.marks[c][r], px = gx + c * cs, py = gy + r * cs;
      if (!m) continue;
      roundRect(x, px + 2, py + 2, cs - 4, cs - 4, 8);
      if (m === 1) { x.fillStyle = 'rgba(90,220,255,0.18)'; x.fill(); x.strokeStyle = 'rgba(140,235,255,0.55)'; x.lineWidth = 1.5; x.stroke(); }
      else {
        const k = Math.log2(m) / 7;
        x.fillStyle = 'rgba(255,' + Math.round(210 - k * 150) + ',' + Math.round(80 - k * 60) + ',' + (0.3 + k * 0.25) + ')'; x.fill();
        x.strokeStyle = '#ffe08a'; x.lineWidth = 2; x.stroke();
      }
    }
    // Gemas
    x.save(); x.beginPath(); x.rect(gx - 3, gy - 3, pw + 6, ph + 6); x.clip();
    const drawCell = (s, c) => {
      if (!s) return;
      const size = cs * 0.86;
      let sc = 1, a = 1;
      if (s.hl) sc = 1 + 0.1 * Math.sin(time * 14);
      if (s.die) { sc = 1 - Math.min(1, s.die * 2.5) * 0.7; a = Math.max(0, 1 - s.die * 3.3); }
      const px = gx + c * cs + cs / 2, py = gy + s.y * cs + cs / 2, d = size * sc;
      if (s.hl || s.k === 'pearl') {
        x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = (s.hl ? 0.6 : 0.3 + 0.15 * Math.sin(time * 4 + c)) * a;
        x.drawImage(glow(s.k === 'pearl' ? 'rgba(160,240,255,1)' : 'rgba(255,230,140,1)', 64), px - cs * 0.7, py - cs * 0.7, cs * 1.4, cs * 1.4); x.restore();
      }
      x.globalAlpha = a;
      if (s.k === 'pearl') { const bd = cs * 0.92 * sc; x.drawImage(ball('cyan', '', cs * 0.92 * dpr), px - bd / 2, py - bd / 2, bd, bd); }
      else x.drawImage(sym(ICON[s.k], size * dpr, s.hl ? 'g' : 'n'), px - d / 2, py - d / 2, d, d);
      x.globalAlpha = 1;
    };
    if (this.leaving) this.leaving.forEach((col, c) => col.forEach(s => drawCell(s, c)));
    this.grid.forEach((col, c) => col.forEach(s => drawCell(s, c)));
    x.restore();
    // Etiquetas de multiplicador encima de las gemas
    x.font = '900 ' + Math.max(10, cs * 0.26) + 'px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      const m = this.marks[c][r]; if (m < 2) continue;
      const px = gx + c * cs + cs - cs * 0.22, py = gy + r * cs + cs * 0.2;
      x.lineWidth = 3; x.strokeStyle = '#4a1c00'; x.strokeText('x' + m, px, py);
      x.fillStyle = '#fff3b0'; x.fillText('x' + m, px, py);
    }
    // Burbujas
    x.save(); x.globalCompositeOperation = 'lighter';
    this.bubbles.forEach(b => {
      const bx = b.x * W + Math.sin(time * 1.5 + b.p) * 8, by = b.y * H;
      x.globalAlpha = 0.5; x.strokeStyle = '#d8f8ff'; x.lineWidth = 1;
      x.beginPath(); x.arc(bx, by, b.s, 0, 7); x.stroke();
      x.globalAlpha = 0.7; x.fillStyle = '#ffffff'; x.beginPath(); x.arc(bx - b.s * 0.35, by - b.s * 0.35, b.s * 0.25, 0, 7); x.fill();
    });
    x.restore();
    // Cabecera
    const hy = gy - 8 - this.head / 2;
    const t = this.inFree ? 'GIROS GRATIS · ' + this.freeLeft + ' · MARCAS FIJAS' : 'GRUPOS DE 5+ · MULTIPLICADORES HASTA x128';
    goldText(x, t, W / 2, hy, Math.min(14, pw * 0.04), { maxW: pw, colors: ['#fff', '#e8fbff', '#7fe0ff', '#fff'], stroke: '#032a44', glowColor: '#3ec9d6' });
  }

  async drop(bet) {
    this.leaving = this.grid.map(col => col.map(s => Object.assign(s, { vy: 2 + Math.random() * 2, die: 0, hl: 0 })));
    this.grid = [];
    for (let c = 0; c < COLS; c++) {
      this.grid.push([]);
      for (let r = 0; r < ROWS; r++) {
        const s = this.cell(r, r - ROWS - 1.2 - c * 0.6 / this.app.speed - (ROWS - r) * 0.1);
        s.landedOnce = false;
        if (this.app._force && r === 3 && c % 2 === 0 && c < 6) s.k = 'pearl';
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
    if (free) this.freeLeft--;
    else if (!this.inFree) this.marks.forEach(col => col.fill(0));
    app.setSpinLabel(free ? 'GRATIS' : 'GIRAR', free ? this.freeLeft + ' restantes' : '');
    sfx.whoosh();
    await this.drop(bet);
    let total = 0, cascade = 0, bigCluster = false;
    while (true) {
      const cl = clusters(this.grid);
      if (!cl.length) break;
      let amount = 0;
      const parts = [];
      cl.forEach(g => {
        const m = clusterMult(g.cells, this.marks), v = PAY[g.k][sizeIdx(g.n)] * SCALE * bet * m;
        amount += v; parts.push(g.n + '× ' + label(g.k) + (m > 1 ? ' x' + m : ''));
        if (g.n >= 15) bigCluster = true;
        g.cells.forEach(([c, r]) => { this.grid[c][r].hl = 1; });
      });
      sfx.win(Math.min(2, cascade));
      app.message(parts.join(' · ') + ' = <b>' + app.fmt(amount) + '</b>');
      await app.wait(700);
      sfx.shatter(cascade);
      cl.forEach(g => {
        applyMarks(g.cells, this.marks);
        g.cells.forEach(([c, r]) => {
          const s = this.grid[c][r]; s.die = 0.001; s.hl = 0;
          const px = this.gx + c * this.cs + this.cs / 2, py = this.gy + r * this.cs + this.cs / 2;
          app.burst(px, py, 4, { type: 'ring', color: '#bff4ff', size: 4, grow: this.cs * 0.6, width: 2, life: 0.45, speed: 40 });
        });
      });
      const top = cl.reduce((a, g) => Math.max(a, clusterMult(g.cells, this.marks)), 1);
      if (top > 1) sfx.multiplier(Math.min(12, Math.log2(top) * 2));
      app.popText(this.gx + this.cs * COLS / 2, this.gy + this.cs * ROWS / 2, app.fmt(amount), 32, ['#fff', '#e8fbff', '#7fe0ff', '#fff']);
      app.flyCoins(this.gx + this.cs * COLS / 2, this.gy + this.cs * ROWS / 2, 8, 'spark', '#9fefff');
      total += amount; app.addWin(amount);
      if (this.inFree) this.fsTotal += amount;
      await app.wait(380);
      // Gravedad
      for (let c = 0; c < COLS; c++) {
        const keep = this.grid[c].filter(s => !s.die);
        const missing = ROWS - keep.length, col = [];
        for (let i = 0; i < missing; i++) { const s = this.cell(i, i - missing - 0.5 - c * 0.12); s.landedOnce = false; col.push(s); }
        keep.forEach((s, i) => { s.ty = missing + i; s.landedOnce = s.y === s.ty; });
        this.grid[c] = col.concat(keep);
      }
      this.moving = true;
      await this.settle();
      cascade++;
    }
    // MINI: un grupo de 15 o más
    if (bigCluster) { const v = await app.awardJackpot('mini'); total += v; if (this.inFree) this.fsTotal += v; }
    let pearls = this.grid.flat().filter(s => s.k === 'pearl').length;
    if (!free && !this.inFree && pearls < 3 && (Math.random() < MYSTERY_P || app._forceMystery)) {
      app._forceMystery = false;
      await app.mysteryIntro('Los rayos traen perlas del fondo');
      const cand = [];
      this.grid.forEach((col, c) => col.forEach((s, r) => { if (s.k !== 'pearl') cand.push([c, r]); }));
      for (let i = cand.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [cand[i], cand[j]] = [cand[j], cand[i]]; }
      while (pearls < 3 && cand.length) {
        const [c, r] = cand.pop();
        this.grid[c][r].k = 'pearl'; pearls++;
        app.strike(this.gx + c * this.cs + this.cs / 2, this.gy + r * this.cs + this.cs / 2, '#bff4ff');
        sfx.bell(880 + pearls * 110, 0.9, 0.12);
        await app.wait(320);
      }
    }
    if (pearls >= 3) {
      this.grid.forEach(col => col.forEach(s => { if (s.k === 'pearl') s.hl = 1; }));
      sfx.featureStart();
      await app.wait(600);
      { const v = await app.bonusPay(pearls, bet, 'perlas'); total += v; if (this.inFree) this.fsTotal += v; }
      // 5 perlas = MINOR · 6 = MAJOR · 7+ = GRAND
      const jp = pearls >= 7 ? 'grand' : pearls === 6 ? 'major' : pearls === 5 ? 'minor' : null;
      if (jp) { const v = await app.awardJackpot(jp); total += v; if (this.inFree) this.fsTotal += v; }
      if (this.inFree) {
        this.freeLeft += 5;
        await app.banner('+5 GIROS', 'Más perlas del arrecife', { color: '#5fe0f0', ms: 1500 });
      } else await this.startFree(pearls >= 5 ? 15 : pearls === 4 ? 12 : 10, total);
      this.grid.forEach(col => col.forEach(s => { s.hl = 0; }));
    }
    const celebrated = this.inFree;
    if (this.inFree && this.freeLeft === 0 && free) {
      await app.wait(500);
      const fs = this.fsTotal;
      this.inFree = false;
      if (fs > 0) await app.celebrate(fs, bet, 'TESORO DEL ARRECIFE');
      sfx.stopMusic(); sfx.music(Reef.music);
      app.message('Giros gratis: <b>' + app.fmt(fs) + '</b>');
    } else if (!total && !this.inFree) app.message(this.hint);
    app.setSpinLabel(this.freeLeft ? 'GRATIS' : 'GIRAR', this.freeLeft ? this.freeLeft + ' restantes' : '');
    return { win: total, celebrated };
  }
  async startFree(n, carry = 0) {
    const app = this.app, sfx = app.sfx;
    sfx.featureStart(); app.flash('#bff4ff', 0.6); app.shake(true);
    this.inFree = true; this.freeLeft = n; this.fsTotal = carry;
    sfx.stopMusic();
    await app.banner(n + ' GIROS GRATIS', 'Las marcas y multiplicadores no se borran', { color: '#3ec9d6', ms: 2600 });
    sfx.music('bonus');
    // Regalo inicial: 6 casillas encendidas en x2
    for (let i = 0; i < 6; i++) {
      const c = Math.random() * COLS | 0, r = Math.random() * ROWS | 0;
      this.marks[c][r] = Math.max(2, this.marks[c][r]);
      app.strike(this.gx + c * this.cs + this.cs / 2, this.gy + r * this.cs + this.cs / 2, '#ffe08a');
      sfx.multiplier(2 + i);
      await app.wait(220);
    }
    app.setSpinLabel('GRATIS', this.freeLeft + ' restantes');
  }
  async buyFree() {
    this.marks.forEach(col => col.fill(0));
    await this.startFree(10);
    return { win: 0, celebrated: true };
  }
  slam() { }
  info(bet, fmt) {
    const ic = i => '<i class="ico" style="background-position:' + (i % 6) * 20 + '% ' + Math.floor(i / 6) * 25 + '%"></i>';
    return '<h3>Cómo se juega</h3><ul>' +
      '<li>Cuadrícula <b>7 × 7</b> sin líneas: <b>5 o más gemas iguales conectadas</b> en horizontal o vertical forman un grupo y pagan.</li>' +
      '<li><b>Cascadas</b>: los grupos estallan en burbujas y caen gemas nuevas, que pueden formar más grupos.</li>' +
      '<li><b>Casillas marcadas</b>: donde estalla un grupo la casilla queda marcada. Si vuelve a estallar ahí se enciende <b>x2</b>, y cada nuevo estallido lo <b>duplica</b> (x4, x8 … <b>x128</b>). Un grupo se multiplica por la <b>suma</b> de los multiplicadores que toca.</li>' +
      '<li>En el juego base las marcas se borran en cada giro. <b>3 / 4 / 5+ perlas</b> = <b>10 / 12 / 15 giros gratis</b> que empiezan con <b>6 casillas en x2</b> y donde las marcas <b>se mantienen</b> todo el bono. 3 perlas en giros gratis = +5.</li>' +
      '<li>Jackpots: grupo de <b>15+ gemas = MINI</b>, <b>5 perlas = MINOR</b>, <b>6 = MAJOR</b>, <b>7+ = GRAND</b>.</li>' +
      '<li><b>BONO</b>: compra 10 giros gratis por 45× la apuesta.</li></ul>' +
      '<h3>Pagos (apuesta ' + fmt(bet) + ') · 5 / 8 / 11-12 / 15+</h3><table>' +
      Object.keys(PAY).map(k => '<tr><td>' + ic(ICON[k]) + '</td><td>' + label(k) + '</td><td>' + [0, 3, 5, 7].map(i => fmt(PAY[k][i] * SCALE * bet)).join(' · ') + '</td></tr>').join('') + '</table>';
  }
}
function label(k) { return { diamond: 'Diamante', rstar: 'Estrella roja', bstar: 'Estrella azul', gstar: 'Estrella verde', clover: 'Trébol', plum: 'Ciruela' }[k]; }
