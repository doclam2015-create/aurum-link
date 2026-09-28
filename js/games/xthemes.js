// Variantes de XTENSION LINK estilo "Red Dream" / "Snow Kingdom": misma mecánica de estrellas
// que abren filas y Golden Spins.
// Sueño Rojo paga por 243 FORMAS (hasta 32.768 con 8 filas), tiene WILD en los rodillos 2 a 4 y
// las filas cerradas son paneles rojos. Reino de Nieve paga por líneas y el hielo es una lámina escarchada.
//  · SUEÑO ROJO: pagoda roja, paneles lacados con borlas, rodillos de jade, cerezos en flor.
//  · REINO DE NIEVE: castillo de hielo, paneles escarchados, aurora, carámbanos y nevada.
import { S, glow, goldText, rand, FONT, makeCanvas } from '../gfx.js?v=32';
import XLink, { THEME, PAY, linesFor } from './xlink.js?v=32';

const MAXR = 8, BASE_R = 3;
// Filas activas → formas de ganar
function activeRows(g) { return g.bonus ? g.bonus.rows : BASE_R + g.expand; }
function waysText(g) { if (g.bonus) return Math.pow(g.bonus.rows, 5).toLocaleString('es-CL'); let w = 1; for (let c = 0; c < 5; c++) w *= BASE_R + g.colOpen(c); return w.toLocaleString('es-CL'); }
function linesText(g) { return String(linesFor(activeRows(g)).length); }
// Letrero lateral "243 FORMAS DE GANAR" (como en la máquina)
function waysBadge(x, cx, cy, w, text, col, txt, l1 = 'FORMAS', l2 = 'DE GANAR') {
  const h = w * 1.05;
  x.fillStyle = col[0]; x.fillRect(cx - w / 2, cy - h / 2, w, h);
  x.strokeStyle = col[1]; x.lineWidth = 1.5; x.strokeRect(cx - w / 2 + 1.5, cy - h / 2 + 1.5, w - 3, h - 3);
  x.fillStyle = txt; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '900 ' + Math.min(13, w * 0.3) + 'px ' + FONT; x.fillText(text, cx, cy - h * 0.18, w * 0.9);
  x.font = '800 ' + Math.min(7, w * 0.16) + 'px ' + FONT; x.fillText(l1, cx, cy + h * 0.12, w * 0.9); if (l2) x.fillText(l2, cx, cy + h * 0.3, w * 0.9);
}

// ---------- SUEÑO ROJO ----------
const RED = Object.assign({}, THEME, {
  ways: true, wild: 2.5, top: 34, bottom: 14, expand: 'random', perReel: true, ball: 1.12,
  icon: Object.assign({}, THEME.icon, { s7r: S.GEISHA, s7b: S.DRAGON, bar: S.PHOENIX, bell: S.BELL, melon: S.CLOVER, grapes: S.K, plum: S.Q, orange: S.J, cherry: S.TEN, wild: S.WILD }),
  variant: {},
  names: { s7r: 'Princesa', s7b: 'Dragón', bar: 'Fénix', bell: 'Campana de oro', melon: 'Jade', grapes: 'K', plum: 'Q', orange: 'J', cherry: '10' },
  frame: ['#ffd06a', '#c8141a', '#ffc04a'],
  board: ['#5a0a0e', '#7a0c12', '#4a0608'], boardL: ['#fff0e8', '#fbdcd2', '#f6cfc4'],
  baseBoard: ['#0f5030', '#0a3e24', '#06301a'], baseBoardL: ['#e4f6ea', '#cfeed8', '#bde4c8'],
  grid: 'rgba(255,200,110,0.28)', gridL: 'rgba(160,40,30,0.25)',
  panels: { col: ['#e0161c', '#8a0508'], border: '#ffd06a', tassel: '#ff2a1a' }
});

export class RedDream extends XLink {
  static id = 'reddream';
  static name = 'Sueño Rojo';
  static music = 'orient';
  static theme = RED;
  static lobby = {
    icons: [S.GEISHA, S.DRAGON, S.PHOENIX], c1: '#ff3a2a', c2: '#4a0406', mechanic: '243 formas + velos al azar · estilo Red Dream',
    desc: 'Pagoda roja con paneles lacados que se abren al azar. 243 formas (hasta 32.768), wilds y Golden Spins con 4 jackpots.'
  };
  constructor(app) {
    super(app);
    this.hint = '<b>243 formas</b>. Hasta <b>25 posiciones</b> se abren al azar. 6 bolas doradas = <b>GOLDEN SPINS</b>.';
    this.petals = []; for (let i = 0; i < 18; i++) this.petals.push({ x: Math.random(), y: Math.random(), v: rand(0.02, 0.05), s: rand(3, 5.5), p: Math.random() * 6, r: Math.random() * 6 });
  }
  get animating() { return true; }
  // Paisaje: cielo, pagodas lejanas y cerezos a los lados
  renderScene(x, W, H, L) {
    let g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, L ? '#bfe6ff' : '#3a6aa8'); g.addColorStop(0.6, L ? '#ffd8e8' : '#8a4a8a'); g.addColorStop(1, L ? '#c8ecc8' : '#2a4a3a');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const pagoda = (px, py, s) => {
      x.fillStyle = L ? 'rgba(120,70,90,0.45)' : 'rgba(40,20,50,0.6)';
      for (let i = 0; i < 4; i++) { const w = s * (1 - i * 0.2), y = py - i * s * 0.32; x.beginPath(); x.moveTo(px - w * 0.6, y); x.quadraticCurveTo(px, y - s * 0.22, px + w * 0.6, y); x.lineTo(px + w * 0.35, y - s * 0.12); x.lineTo(px - w * 0.35, y - s * 0.12); x.fill(); x.fillRect(px - w * 0.3, y, w * 0.6, s * 0.2); }
    };
    pagoda(W * 0.05, H * 0.45, W * 0.12); pagoda(W * 0.95, H * 0.62, W * 0.1);
    const blossom = (px, py, r) => { for (let i = 0; i < 14; i++) { x.fillStyle = ['#ffb8d0', '#ff8ab8', '#ffd0e0'][i % 3]; x.beginPath(); x.arc(px + rand(-r, r), py + rand(-r * 0.6, r * 0.6), rand(r * 0.18, r * 0.35), 0, 7); x.fill(); } };
    blossom(W * 0.03, H * 0.18, W * 0.07); blossom(W * 0.97, H * 0.3, W * 0.06); blossom(W * 0.04, H * 0.8, W * 0.06); blossom(W * 0.96, H * 0.9, W * 0.07);
  }
  decorate(x) {
    const { W, H, time, bx, by, cw, ch } = this, bw = cw * 5, top = this.T.top;
    // Techo de pagoda con aleros curvos sobre el tablero
    const ry = by - 9, rw = bw + 34;
    let g = x.createLinearGradient(0, ry - top + 6, 0, ry);
    g.addColorStop(0, '#ff5a3a'); g.addColorStop(1, '#8a0a0a');
    x.fillStyle = g;
    x.beginPath(); x.moveTo(W / 2 - rw / 2 - 8, ry - 12); x.quadraticCurveTo(W / 2 - rw / 2 + 20, ry - 2, W / 2 - rw * 0.3, ry - top + 12);
    x.lineTo(W / 2 + rw * 0.3, ry - top + 12); x.quadraticCurveTo(W / 2 + rw / 2 - 20, ry - 2, W / 2 + rw / 2 + 8, ry - 12); x.lineTo(W / 2 + rw / 2 - 6, ry); x.lineTo(W / 2 - rw / 2 + 6, ry); x.closePath(); x.fill();
    x.strokeStyle = '#ffd06a'; x.lineWidth = 2; x.stroke();
    goldText(x, 'SUEÑO ROJO · ' + waysText(this) + ' FORMAS', W / 2, ry - top / 2 + 4, Math.min(14, bw * 0.045), { maxW: bw * 0.62 });
    // Letreros laterales de formas de ganar (a la altura de las filas base)
    const yy = by + (MAXR - BASE_R + 0.45) * ch, wb = Math.min(this.rail - 6, 40);
    [bx - 7 - this.rail / 2, bx + bw + 7 + this.rail / 2].forEach(px => waysBadge(x, px, yy, wb, waysText(this), ['#1a0a06', '#ffd06a'], '#ffe9b0'));
    // Flores de cerezo sobre el borde inferior
    for (let i = 0; i < 9; i++) { const fx = bx - 10 + i * (bw + 20) / 8, fy = by + MAXR * ch + 6 + Math.sin(i * 1.7) * 3; x.fillStyle = ['#ff9ac0', '#ffc8dc', '#ff6aa8'][i % 3]; for (let k = 0; k < 5; k++) { const a = k * 1.2566 + i; x.beginPath(); x.arc(fx + Math.cos(a) * 4, fy + Math.sin(a) * 4, 3.2, 0, 7); x.fill(); } x.fillStyle = '#ffe06a'; x.beginPath(); x.arc(fx, fy, 2, 0, 7); x.fill(); }
    // Pétalos cayendo
    this.petals.forEach(p => {
      p.y += p.v / 60; if (p.y > 1.05) { p.y = -0.05; p.x = Math.random(); }
      const px = p.x * W + Math.sin(time * 1.2 + p.p) * 14, py = p.y * H;
      x.save(); x.translate(px, py); x.rotate(p.r + time * 0.8);
      x.fillStyle = 'rgba(255,170,200,0.85)'; x.beginPath(); x.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, 7); x.fill();
      x.restore();
    });
  }
}

// ---------- REINO DE NIEVE ----------
const SNOW = Object.assign({}, THEME, {
  ways: false, wild: 0, top: 30, bottom: 8, frost: true, expand: 'princess', ball: 0.93,
  // La Reina aparece en pilas que abren filas, así que paga menos que en la original
  pay: Object.assign({}, PAY, { s7r: [0, 0, 0, 1, 3, 10] }),
  tiles: ['rgba(90,120,255,0.16)', 'rgba(170,90,255,0.16)'],
  glass: ['rgba(110,170,240,0.78)', 'rgba(50,100,200,0.86)'], glassL: ['rgba(215,235,252,0.88)', 'rgba(185,215,245,0.92)'],
  icon: Object.assign({}, THEME.icon, { s7r: S.QUEEN, s7b: S.SNOW, bar: S.DIAMOND, bell: S.BELL, melon: S.SEVEN, grapes: S.K, plum: S.Q, orange: S.J, cherry: S.TEN, wild: S.WILD }),
  variant: { melon: 'blue' },
  names: { s7r: 'Reina de hielo', s7b: 'Copo real', bar: 'Diamante', bell: 'Campana de plata', melon: '7 de hielo', grapes: 'K', plum: 'Q', orange: 'J', cherry: '10' },
  frame: ['#f4fbff', '#7fb2d8', '#e6f4ff'],
  board: ['#0a1a4a', '#0c1e5a', '#081440'], boardL: ['#f7fcff', '#e2f1fb', '#d2e8f7'],
  baseBoard: ['#0a1440', '#0c1650', '#060c30'], baseBoardL: ['#eef4ff', '#dde6ff', '#ccd8fb'],
  grid: 'rgba(170,230,255,0.35)', gridL: 'rgba(60,120,190,0.3)',
  panels: null
});

export class SnowKingdom extends XLink {
  static id = 'snowking';
  static name = 'Reino de Nieve';
  static music = 'ice';
  static theme = SNOW;
  static lobby = {
    icons: [S.QUEEN, S.SNOW, S.DIAMOND], c1: '#bfe8ff', c2: '#0a2a6e', mechanic: 'La Reina abre filas · estilo Snow Kingdom',
    desc: 'Reino helado con nevada. Cada pila de 2 Reinas derrite el hielo y abre una fila (hasta 100 líneas). Golden Spins con 4 jackpots.'
  };
  constructor(app) {
    super(app);
    this.hint = 'Cada <b>pila de 2 Reinas</b> derrite el hielo y abre 1 fila. 6 bolas doradas = <b>GOLDEN SPINS</b>.';
    this.flakes = []; for (let i = 0; i < 55; i++) this.flakes.push({ x: Math.random(), y: Math.random(), v: rand(0.03, 0.09), s: rand(1.2, 3.2), p: Math.random() * 6 });
    this.icicles = []; for (let i = 0; i < 24; i++) this.icicles.push({ u: (i + Math.random() * 0.6) / 24, l: rand(0.35, 1) });
  }
  get animating() { return true; }
  // Cielo nocturno con aurora boreal y montañas nevadas
  renderScene(x, W, H, L) {
    let g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, L ? '#dff2ff' : '#061436'); g.addColorStop(1, L ? '#f4fbff' : '#0e2a5a');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.save(); x.globalCompositeOperation = L ? 'multiply' : 'lighter';
    [['rgba(90,255,190,0.2)', 0.05], ['rgba(120,170,255,0.18)', 0.18], ['rgba(200,120,255,0.14)', 0.3]].forEach(([col, yy], i) => {
      const gg = x.createLinearGradient(0, H * yy, 0, H * (yy + 0.14));
      gg.addColorStop(0, 'rgba(0,0,0,0)'); gg.addColorStop(0.5, col); gg.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = gg; x.beginPath(); x.moveTo(0, H * yy);
      for (let k = 0; k <= 12; k++) x.lineTo(W * k / 12, H * (yy + 0.04 * Math.sin(k * 0.9 + i)));
      x.lineTo(W, H * (yy + 0.16)); x.lineTo(0, H * (yy + 0.16)); x.fill();
    });
    x.restore();
    x.fillStyle = L ? '#cfe6f7' : '#1c3e70';
    x.beginPath(); x.moveTo(0, H); for (let k = 0; k <= 8; k++) x.lineTo(W * k / 8, H * (0.78 + (k % 2 ? -0.08 : 0.04))); x.lineTo(W, H); x.fill();
  }
  decorate(x) {
    const { W, H, time, bx, by, cw, ch } = this, bw = cw * 5;
    // Corona de hielo con el título
    goldText(x, 'REINO DE NIEVE · ' + linesText(this) + ' LÍNEAS', W / 2, by - this.T.top / 2 - 4, Math.min(14, bw * 0.045), { maxW: bw * 0.8, colors: ['#fff', '#eaf8ff', '#8fd0ff', '#fff'], stroke: '#0a2a5a', glowColor: '#7fc8ff' });
    const yy = by + (MAXR - BASE_R + 0.45) * ch, wb = Math.min(this.rail - 6, 40);
    [bx - 7 - this.rail / 2, bx + bw + 7 + this.rail / 2].forEach(px => waysBadge(x, px, yy, wb, linesText(this), ['#06183a', '#cfeeff'], '#eaf8ff', 'LÍNEAS', ''));
    // Carámbanos bajo el borde superior del marco
    x.fillStyle = this.app.light ? 'rgba(150,200,240,0.95)' : 'rgba(215,240,255,0.9)';
    this.icicles.forEach(ic => {
      const px = bx - 6 + ic.u * (bw + 12), len = 6 + ic.l * 12;
      x.beginPath(); x.moveTo(px - 3, by - 7); x.lineTo(px + 3, by - 7); x.lineTo(px, by - 7 + len); x.closePath(); x.fill();
    });
    // Nevada
    x.save(); x.globalCompositeOperation = 'lighter';
    const gl = glow('rgba(225,245,255,0.9)', 32);
    this.flakes.forEach(f => {
      f.y += f.v / 60; if (f.y > 1.03) { f.y = -0.03; f.x = Math.random(); }
      const px = f.x * W + Math.sin(time + f.p) * 10, py = f.y * H;
      x.drawImage(gl, px - f.s * 2, py - f.s * 2, f.s * 4, f.s * 4);
    });
    x.restore();
  }
}

// ---------- Símbolos dibujados para Sueño Rojo ----------
const art = new Map();
// Envuelve un dibujo con caché por tamaño; variante 'd' = atenuado (relleno del bono)
function drawn(name, fn) {
  return (size, v = 'n') => {
    const key = name + '|' + size + '|' + (v === 'd' ? 'd' : 'n');
    let c = art.get(key); if (c) return c;
    c = makeCanvas(size, size); const x = c.getContext('2d');
    fn(x, size);
    if (v === 'd') { x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(8,4,20,0.62)'; x.fillRect(0, 0, size, size); }
    art.set(key, c); return c;
  };
}
// Tetera y taza de porcelana blanca con dibujo azul
export const drawTea = drawn('tea', (x, s) => {
  const blue = '#1f4fb8';
  const porcelain = (cx, cy, rx, ry) => { const g = x.createRadialGradient(cx - rx * 0.35, cy - ry * 0.4, rx * 0.1, cx, cy, rx * 1.05); g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#e8eef8'); g.addColorStop(1, '#9fb0cc'); return g; };
  // Tetera
  const tx = s * 0.42, ty = s * 0.5, rx = s * 0.27, ry = s * 0.22;
  x.lineCap = 'round'; x.lineJoin = 'round';
  x.strokeStyle = '#c8d4e8'; x.lineWidth = s * 0.05;
  x.beginPath(); x.moveTo(tx + rx * 0.85, ty - ry * 0.1); x.quadraticCurveTo(tx + rx * 1.5, ty - ry * 0.1, tx + rx * 1.55, ty - ry * 0.9); x.stroke(); // pico
  x.beginPath(); x.arc(tx - rx * 1.02, ty - ry * 0.05, ry * 0.55, Math.PI * 0.5, Math.PI * 1.5); x.stroke(); // asa
  x.fillStyle = porcelain(tx, ty, rx, ry); x.beginPath(); x.ellipse(tx, ty, rx, ry, 0, 0, 7); x.fill();
  x.lineWidth = s * 0.012; x.strokeStyle = '#7a8ab0'; x.stroke();
  // tapa y perilla
  x.fillStyle = porcelain(tx, ty - ry, rx * 0.5, ry * 0.3); x.beginPath(); x.ellipse(tx, ty - ry * 0.95, rx * 0.5, ry * 0.25, 0, 0, 7); x.fill(); x.stroke();
  x.fillStyle = '#e8b830'; x.beginPath(); x.arc(tx, ty - ry * 1.25, s * 0.03, 0, 7); x.fill();
  // dibujo azul: flor y greca
  x.strokeStyle = blue; x.lineWidth = s * 0.014;
  x.beginPath(); x.ellipse(tx, ty + ry * 0.55, rx * 0.8, ry * 0.18, 0, 0.15, Math.PI - 0.15); x.stroke();
  x.fillStyle = blue;
  for (let i = 0; i < 5; i++) { const a = i * 1.2566; x.beginPath(); x.ellipse(tx + Math.cos(a) * s * 0.045, ty - ry * 0.05 + Math.sin(a) * s * 0.045, s * 0.03, s * 0.016, a, 0, 7); x.fill(); }
  x.fillStyle = '#e8b830'; x.beginPath(); x.arc(tx, ty - ry * 0.05, s * 0.018, 0, 7); x.fill();
  // Taza
  const cx = s * 0.78, cy = s * 0.74, cw = s * 0.15;
  x.fillStyle = porcelain(cx, cy, cw, cw);
  x.beginPath(); x.moveTo(cx - cw, cy - cw * 0.5); x.quadraticCurveTo(cx - cw * 0.9, cy + cw * 0.8, cx, cy + cw * 0.8); x.quadraticCurveTo(cx + cw * 0.9, cy + cw * 0.8, cx + cw, cy - cw * 0.5); x.closePath(); x.fill();
  x.strokeStyle = '#7a8ab0'; x.lineWidth = s * 0.012; x.stroke();
  x.fillStyle = '#8a4a1a'; x.beginPath(); x.ellipse(cx, cy - cw * 0.5, cw * 0.95, cw * 0.2, 0, 0, 7); x.fill();
  x.strokeStyle = blue; x.lineWidth = s * 0.012; x.beginPath(); x.moveTo(cx - cw * 0.8, cy + cw * 0.05); x.lineTo(cx + cw * 0.8, cy + cw * 0.05); x.stroke();
  // vapor
  x.strokeStyle = 'rgba(255,255,255,0.7)'; x.lineWidth = s * 0.015;
  x.beginPath(); x.moveTo(cx - cw * 0.2, cy - cw * 0.8); x.bezierCurveTo(cx - cw * 0.6, cy - cw * 1.2, cx + cw * 0.2, cy - cw * 1.4, cx - cw * 0.1, cy - cw * 1.9); x.stroke();
});
// Papiro: rollo rojo con varillas y el carácter 福 (suerte) en oro
export const drawScroll = drawn('scroll', (x, s) => {
  const top = s * 0.12, bot = s * 0.88, l = s * 0.24, r = s * 0.76;
  const g = x.createLinearGradient(l, 0, r, 0);
  g.addColorStop(0, '#9a0a0a'); g.addColorStop(0.5, '#e02a1a'); g.addColorStop(1, '#9a0a0a');
  x.fillStyle = g; x.fillRect(l, top + s * 0.04, r - l, bot - top - s * 0.08);
  x.strokeStyle = '#ffd06a'; x.lineWidth = s * 0.02; x.strokeRect(l + s * 0.04, top + s * 0.08, r - l - s * 0.08, bot - top - s * 0.16);
  const rod = y => { const gg = x.createLinearGradient(0, y - s * 0.035, 0, y + s * 0.035); gg.addColorStop(0, '#c88a3a'); gg.addColorStop(0.5, '#6a3a10'); gg.addColorStop(1, '#3a1a04'); x.fillStyle = gg; x.fillRect(l - s * 0.08, y - s * 0.035, r - l + s * 0.16, s * 0.07); x.fillStyle = '#ffd06a'; [l - s * 0.1, r + s * 0.1].forEach(ex => { x.beginPath(); x.arc(ex, y, s * 0.045, 0, 7); x.fill(); }); };
  rod(top + s * 0.02); rod(bot - s * 0.02);
  x.font = '900 ' + s * 0.36 + 'px "Songti SC","STSong","Noto Serif CJK SC","PingFang SC",serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = s * 0.03; x.strokeStyle = '#6a0404'; x.strokeText('福', s / 2, s / 2 + s * 0.02);
  const tg = x.createLinearGradient(0, s * 0.35, 0, s * 0.65); tg.addColorStop(0, '#fff3b0'); tg.addColorStop(1, '#e8a820');
  x.fillStyle = tg; x.fillText('福', s / 2, s / 2 + s * 0.02);
});
// Huevo de la suerte de jade sobre base dorada
export const drawEgg = drawn('egg', (x, s) => {
  const cx = s / 2, cy = s * 0.44, rx = s * 0.26, ry = s * 0.33;
  x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.35; x.drawImage(glow('rgba(80,255,150,1)', 64), cx - s * 0.45, cy - s * 0.45, s * 0.9, s * 0.9); x.restore();
  // base dorada
  let g = x.createLinearGradient(0, s * 0.7, 0, s * 0.9);
  g.addColorStop(0, '#ffe08a'); g.addColorStop(1, '#8a5206');
  x.fillStyle = g; x.beginPath(); x.moveTo(cx - s * 0.2, s * 0.9); x.lineTo(cx + s * 0.2, s * 0.9); x.lineTo(cx + s * 0.13, s * 0.74); x.lineTo(cx - s * 0.13, s * 0.74); x.closePath(); x.fill();
  x.fillStyle = '#ffd06a'; x.beginPath(); x.ellipse(cx, s * 0.74, s * 0.16, s * 0.035, 0, 0, 7); x.fill();
  // huevo
  g = x.createRadialGradient(cx - rx * 0.35, cy - ry * 0.4, rx * 0.1, cx, cy, ry * 1.1);
  g.addColorStop(0, '#d8ffe0'); g.addColorStop(0.35, '#3ec46a'); g.addColorStop(0.8, '#0e6a2e'); g.addColorStop(1, '#063a18');
  x.fillStyle = g;
  x.beginPath(); x.moveTo(cx, cy - ry); x.bezierCurveTo(cx + rx * 1.35, cy - ry, cx + rx * 1.2, cy + ry * 0.95, cx, cy + ry * 0.95); x.bezierCurveTo(cx - rx * 1.2, cy + ry * 0.95, cx - rx * 1.35, cy - ry, cx, cy - ry); x.fill();
  // vetas del jade y brillo
  x.strokeStyle = 'rgba(200,255,210,0.35)'; x.lineWidth = s * 0.012;
  x.beginPath(); x.moveTo(cx - rx * 0.6, cy + ry * 0.2); x.bezierCurveTo(cx - rx * 0.1, cy - ry * 0.1, cx + rx * 0.2, cy + ry * 0.5, cx + rx * 0.7, cy + ry * 0.1); x.stroke();
  x.fillStyle = 'rgba(255,255,255,0.75)'; x.beginPath(); x.ellipse(cx - rx * 0.4, cy - ry * 0.5, rx * 0.16, ry * 0.1, -0.6, 0, 7); x.fill();
});
RED.draw = { s7b: drawScroll, bar: drawTea, melon: drawEgg };
RED.names = Object.assign({}, RED.names, { s7b: 'Papiro de la suerte', bar: 'Tetera y taza', melon: 'Huevo de jade' });
