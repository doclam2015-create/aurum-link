// Motor de rodillos genérico con giro continuo, frenado escalonado, rebote y anticipación.
import { ease } from './gfx.js?v=74';

export class ReelSet {
  constructor({ cols, rows, pick, drawSym }) {
    this.cols = cols; this.rows = rows; this.pick = pick; this.drawSym = drawSym;
    this.x = 0; this.y = 0; this.cw = 60; this.ch = 60;
    this.columns = [];
    this.grid = [];
    for (let c = 0; c < cols; c++) {
      const syms = [];
      for (let r = 0; r <= rows; r++) syms.push(pick(c));
      this.columns.push({ syms, shift: 0, state: 'idle', speed: 0, feed: [], t: 0, bounce: 1, antic: false });
      this.grid.push(syms.slice(1));
    }
    this.spinning = false;
    this.time = 0;
    this._resolve = null;
  }
  // Reemplaza el símbolo visible de una celda (para efectos como el Bono Sorpresa)
  setCell(c, r, sym) { this.grid[c][r] = sym; this.columns[c].syms[r + 1] = sym; }
  layout(x, y, cw, ch) { this.x = x; this.y = y; this.cw = cw; this.ch = ch; }

  // speed: 0.5 (lento) … 3 (muy rápido)
  start(speed = 1) {
    if (speed === true) speed = 2; else if (!speed) speed = 1;
    this.speed = speed; this.spinning = true; this.time = 0; this.slammed = false;
    this.maxSpeed = 22 * Math.sqrt(speed);
    this.columns.forEach((col, c) => {
      col.state = 'windup'; col.t = -c * 0.06 / speed; col.speed = 0; col.feed = []; col.antic = false; col.stopAt = Infinity; col.bounce = 1;
    });
  }

  // Programa el frenado. `anticFrom`: índice de rodillo desde el cual se alarga la espera (suspenso).
  stopTo(final, { minTime, anticFrom = -1, onStop } = {}) {
    this.final = final; this.onStop = onStop;
    const sp = this.speed || 1;
    const base = minTime != null ? minTime : 0.6 / sp;
    const gap = 0.18 / sp;
    let t = base;
    this.columns.forEach((col, c) => {
      if (anticFrom >= 0 && c >= anticFrom) { t += 1.4 / Math.sqrt(sp); col.antic = true; }
      col.stopAt = this.time + t + (this.slammed ? -10 : 0);
      t += gap;
    });
    return new Promise(res => { this._resolve = res; });
  }
  // Toque durante el giro: detener todo ya
  slam() {
    if (!this.spinning || !this.final) return;
    this.slammed = true;
    this.columns.forEach(col => { if (col.state !== 'bounce' && col.state !== 'idle') col.stopAt = Math.min(col.stopAt, this.time); col.antic = false; });
  }
  get anticipating() { return this.columns.some(c => c.antic && c.state !== 'bounce' && c.state !== 'idle'); }

  update(dt) {
    if (!this.spinning) return;
    this.time += dt;
    let allDone = true;
    this.columns.forEach((col, c) => {
      col.t += dt;
      if (col.state === 'windup') {
        allDone = false;
        if (col.t < 0) return;
        // Pequeño retroceso antes de arrancar
        const k = Math.min(1, col.t / 0.12);
        col.shift = -0.18 * Math.sin(k * Math.PI / 2);
        if (k >= 1) { col.state = 'spin'; col.speed = 0; }
        return;
      }
      if (col.state === 'spin' || col.state === 'feeding') {
        allDone = false;
        const target = col.antic && this.time > col.stopAt - 1.4 ? this.maxSpeed * 1.25 : this.maxSpeed;
        col.speed = Math.min(target, col.speed + 140 * dt);
        if (col.state === 'spin' && this.time >= col.stopAt && this.final) {
          col.state = 'feeding';
          const f = this.final[c];
          col.feed = [];
          for (let r = this.rows - 1; r >= 0; r--) col.feed.push(f[r]);
          col.feed.push(this.pick(c));
        }
        col.shift += col.speed * dt;
        while (col.shift >= 1) {
          col.shift -= 1;
          if (col.state === 'feeding') {
            if (col.feed.length) {
              col.syms.unshift(col.feed.shift()); col.syms.pop();
              if (!col.feed.length) {
                // Última unidad ya colocada: aterrizar exacto con rebote
                col.state = 'bounce'; col.shift = 0; col.bounce = 0;
                this.grid[c] = col.syms.slice(1);
                col.antic = false;
                if (this.onStop) this.onStop(c, c === this.cols - 1 || this.columns.every((o, i) => i === c || o.state === 'bounce' || o.state === 'idle'));
                break;
              }
            }
          } else {
            col.syms.unshift(this.pick(c)); col.syms.pop();
          }
        }
        return;
      }
      if (col.state === 'bounce') {
        col.bounce = Math.min(1, col.bounce + dt / 0.32);
        const b = col.bounce;
        col.shift = 0.16 * Math.exp(-b * 6) * Math.sin(b * Math.PI * 2.4) * (1 - b);
        if (b >= 1) { col.state = 'idle'; col.shift = 0; }
        else allDone = false;
      }
    });
    if (allDone && this.final) {
      this.spinning = false;
      const r = this._resolve; this._resolve = null; this.final = null;
      if (r) r();
    }
  }

  // Dibuja las columnas; `fx(c,r)` puede devolver {scale, alpha, dim, glow}
  draw(x, fx) {
    const { cols, rows, cw, ch } = this;
    x.save();
    x.beginPath(); x.rect(this.x, this.y, cw * cols, ch * rows); x.clip();
    for (let c = 0; c < cols; c++) {
      const col = this.columns[c], moving = col.state === 'spin' || col.state === 'feeding';
      const blur = moving && col.speed > 10;
      for (let k = 0; k <= rows; k++) {
        const s = col.syms[k];
        const py = this.y + (k - 1 + col.shift) * ch;
        if (py > this.y + rows * ch || py + ch < this.y) continue;
        const r = k - 1;
        this.drawSym(x, s, this.x + c * cw, py, cw, ch, { c, r, blur, spinning: col.state !== 'idle', fx: (!this.spinning && fx && r >= 0) ? fx(c, r) : null });
      }
    }
    x.restore();
  }
}

// Líneas de pago estándar 5x3 (índice de fila por rodillo)
export const LINES_5x3 = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2], [1, 0, 1, 2, 1], [1, 2, 1, 0, 1], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2],
  [1, 1, 0, 1, 1], [1, 1, 2, 1, 1], [0, 2, 0, 2, 0], [2, 0, 2, 0, 2], [0, 2, 2, 2, 0]
];
export const LINES_3x3 = [[1, 1, 1], [0, 0, 0], [2, 2, 2], [0, 1, 2], [2, 1, 0]];

export function weighted(table) {
  let tot = 0; for (const k in table) tot += table[k];
  let r = Math.random() * tot;
  for (const k in table) { r -= table[k]; if (r < 0) return k; }
  return Object.keys(table)[0];
}
export function weightedIdx(weights) {
  let tot = 0; for (const w of weights) tot += w;
  let r = Math.random() * tot;
  for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r < 0) return i; }
  return weights.length - 1;
}
export const sleep = ms => new Promise(r => setTimeout(r, ms));
