// Variantes de XTENSION LINK estilo "Red Dream" / "Snow Kingdom": misma mecánica de estrellas
// que abren filas y Golden Spins.
// Sueño Rojo paga por 243 FORMAS (hasta 32.768 con 8 filas), tiene WILD en los rodillos 2 a 4 y
// las filas cerradas son paneles rojos. Reino de Nieve paga por líneas y el hielo es una lámina escarchada.
//  · SUEÑO ROJO: pagoda roja, paneles lacados con borlas, rodillos de jade, cerezos en flor.
//  · REINO DE NIEVE: castillo de hielo, paneles escarchados, aurora, carámbanos y nevada.
import { S, glow, goldText, rand, FONT, makeCanvas } from '../gfx.js?v=42';
import XLink, { THEME, PAY, linesFor } from './xlink.js?v=42';

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
  ways: true, wild: 2.5, top: 34, bottom: 14, expand: 'random', perReel: true, ball: 1.12, freeOpen: true,
  // Por formas no se paga con solo 2 "10" (daba premios de centavos)
  pay: Object.assign({}, PAY, { cherry: [0, 0, 0, 5, 20, 80] }),
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
  static music = 'china';
  static bonusMusic = 'chinaBonus';
  static sfxTheme = 'china';
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
    goldText(x, (this.inFree ? 'GIRO GRATIS ' + this.freeCount + ' · ' : 'SUEÑO ROJO · ') + waysText(this) + ' FORMAS', W / 2, ry - top / 2 + 4, Math.min(14, bw * 0.045), { maxW: bw * 0.62 });
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
  static music = 'snow';
  static bonusMusic = 'snowBonus';
  static sfxTheme = 'snow';
  static theme = SNOW;
  static lobby = {
    icons: [S.QUEEN, S.SNOW, S.DIAMOND], c1: '#bfe8ff', c2: '#0a2a6e', mechanic: 'La Reina abre filas · estilo Snow Kingdom',
    desc: 'Reino helado con lobos, leopardos y halcones. Cada Reina de 2 filas sube la cortina de hielo, en cadena (hasta 100 líneas). Giros gratis y Golden Spins.'
  };
  constructor(app) {
    super(app);
    this.hint = 'Cada <b>Reina de 2 filas</b> sube la cortina 1 fila, <b>en cadena</b>. 3 copos de nieve = <b>10 giros gratis</b>.';
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
    goldText(x, (this.inFree ? 'GIRO GRATIS ' + this.freeCount + ' · ' : 'REINO DE NIEVE · ') + linesText(this) + ' LÍNEAS', W / 2, by - this.T.top / 2 - 4, Math.min(14, bw * 0.045), { maxW: bw * 0.8, colors: ['#fff', '#eaf8ff', '#8fd0ff', '#fff'], stroke: '#0a2a5a', glowColor: '#7fc8ff' });
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

// ---------- Hoja de imágenes de los temas (assets/themes.webp, ver tools/build_themes.py) ----------
// 10 casillas de 200×200 en 5 columnas × 2 filas
let SHEET = null;
const SHEET_POS = { noble: 0, tea: 1, scroll: 2, lotus: 3, wolf: 4, leopard: 5, falcon: 6, antelope: 7, lady: 8, snowflake: 9 };
export function loadThemeArt(src = 'assets/themes.webp') {
  return new Promise((res, rej) => { const img = new Image(); img.decoding = 'async'; img.onload = () => { SHEET = img; res(img); }; img.onerror = rej; img.src = src; });
}
function sheetDraw(x, k, dx, dy, dw, dh) {
  const n = SHEET_POS[k]; x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  x.drawImage(SHEET, (n % 5) * 200, Math.floor(n / 5) * 200, 200, 200, dx, dy, dw, dh);
}
// Ícono del lobby desde la hoja de temas (estilo CSS)
export function sheetIconStyle(k) { const n = SHEET_POS[k]; return 'background-image:url(assets/themes.webp);background-size:500% 200%;background-position:' + (n % 5) * 25 + '% ' + Math.floor(n / 5) * 100 + '%'; }

// ---------- Símbolos dibujados para Sueño Rojo ----------
const art = new Map();
// Envuelve un dibujo con caché por tamaño; variante 'd' = atenuado (relleno del bono)
// needSheet: no se guarda en caché mientras la hoja de imágenes no haya cargado
function drawn(name, fn, needSheet = false) {
  return (size, v = 'n') => {
    const key = name + '|' + size + '|' + (v === 'd' ? 'd' : 'n');
    let c = art.get(key); if (c) return c;
    c = makeCanvas(size, size); const x = c.getContext('2d');
    if (needSheet && !SHEET) return c;
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

// ---------- Dispersores de giros gratis ----------
// Texto BONUS dorado sobre el símbolo
function bonusLabel(x, s, y, fill = ['#fff6c0', '#e8a820'], stroke = '#5a2a00') {
  const fs = s * 0.2;
  x.font = '900 ' + fs + 'px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  x.lineWidth = fs * 0.32; x.strokeStyle = stroke; x.strokeText('BONUS', s / 2, y);
  const g = x.createLinearGradient(0, y - fs / 2, 0, y + fs / 2); g.addColorStop(0, fill[0]); g.addColorStop(1, fill[1]);
  x.fillStyle = g; x.fillText('BONUS', s / 2, y);
}
// Flor de loto rosa y blanca
export const drawLotus = drawn('lotus', (x, s) => {
  const cx = s / 2, base = s * 0.66;
  x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.35; x.drawImage(glow('rgba(255,150,210,1)', 64), cx - s * 0.45, base - s * 0.5, s * 0.9, s * 0.8); x.restore();
  // hojas verdes
  x.fillStyle = '#2f9a4a';
  [-1, 1].forEach(d => { x.beginPath(); x.ellipse(cx + d * s * 0.22, base + s * 0.05, s * 0.2, s * 0.06, d * 0.25, 0, 7); x.fill(); });
  const petal = (ang, len, wid, c1, c2) => {
    x.save(); x.translate(cx, base); x.rotate(ang);
    const g = x.createLinearGradient(0, 0, 0, -len); g.addColorStop(0, c2); g.addColorStop(1, c1);
    x.fillStyle = g; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(wid, -len * 0.55, 0, -len); x.quadraticCurveTo(-wid, -len * 0.55, 0, 0); x.fill();
    x.strokeStyle = 'rgba(200,60,130,0.5)'; x.lineWidth = s * 0.008; x.stroke();
    x.restore();
  };
  // capa trasera, media y frontal
  [-1.25, -0.75, 0.75, 1.25].forEach(a => petal(a, s * 0.34, s * 0.12, '#ff9ac8', '#ffe6f2'));
  [-0.45, 0.45].forEach(a => petal(a, s * 0.42, s * 0.14, '#ff7ab8', '#fff0f6'));
  petal(0, s * 0.46, s * 0.15, '#ff5aa8', '#ffffff');
  x.fillStyle = '#ffd24a'; x.beginPath(); x.arc(cx, base - s * 0.05, s * 0.04, 0, 7); x.fill();
  bonusLabel(x, s, s * 0.86);
});
// Cristal de hielo facetado
export const drawCrystal = drawn('crystal', (x, s) => {
  const cx = s / 2, cy = s * 0.42, R = s * 0.3;
  x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.45; x.drawImage(glow('rgba(140,220,255,1)', 64), cx - s * 0.45, cy - s * 0.45, s * 0.9, s * 0.9); x.restore();
  const pts = []; for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3; pts.push([cx + Math.cos(a) * R * (i % 3 === 0 ? 1.25 : 0.85), cy + Math.sin(a) * R]); }
  // facetas
  for (let i = 0; i < 6; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % 6];
    const g = x.createLinearGradient(ax, ay, cx, cy);
    g.addColorStop(0, i % 2 ? '#bfe8ff' : '#6ab8ff'); g.addColorStop(1, i % 2 ? '#ffffff' : '#d8f2ff');
    x.fillStyle = g; x.beginPath(); x.moveTo(cx, cy); x.lineTo(ax, ay); x.lineTo(bx, by); x.closePath(); x.fill();
  }
  x.strokeStyle = '#ffffff'; x.lineWidth = s * 0.015; x.beginPath(); pts.forEach(([px, py], i) => i ? x.lineTo(px, py) : x.moveTo(px, py)); x.closePath(); x.stroke();
  x.strokeStyle = 'rgba(255,255,255,0.6)'; x.lineWidth = s * 0.008; pts.forEach(([px, py]) => { x.beginPath(); x.moveTo(cx, cy); x.lineTo(px, py); x.stroke(); });
  // destellos
  x.strokeStyle = '#ffffff'; x.lineWidth = s * 0.012;
  [[0.25, 0.2, 0.06], [0.78, 0.3, 0.045], [0.7, 0.62, 0.035]].forEach(([u, v, r]) => { const px = s * u, py = s * v; x.beginPath(); x.moveTo(px - s * r, py); x.lineTo(px + s * r, py); x.moveTo(px, py - s * r); x.lineTo(px, py + s * r); x.stroke(); });
  bonusLabel(x, s, s * 0.86, ['#ffffff', '#8fd0ff'], '#0a2a5a');
});
RED.scatter = { w: 1.6, name: 'flores de loto', color: '#ff7ab8', pay: [5, 20] };
RED.draw = Object.assign({}, RED.draw, { scat: drawLotus });
RED.names = Object.assign({}, RED.names, { scat: 'Flor de loto' });
SNOW.scatter = { w: 1.6, name: 'cristales de hielo', color: '#8fd8ff', pay: [5, 20] };
SNOW.draw = Object.assign({}, SNOW.draw || {}, { scat: drawCrystal });
SNOW.names = Object.assign({}, SNOW.names, { scat: 'Cristal de hielo' });

// ---------- Figuras emblema (dibujos propios, estilo azulejo de color) ----------
// Azulejo redondeado con degradado y brillo interior
function tile(x, s, c1, c2) {
  const m = s * 0.04, r = s * 0.12;
  const g = x.createLinearGradient(0, 0, s, s); g.addColorStop(0, c1); g.addColorStop(1, c2);
  x.beginPath(); x.moveTo(m + r, m); x.arcTo(s - m, m, s - m, s - m, r); x.arcTo(s - m, s - m, m, s - m, r); x.arcTo(m, s - m, m, m, r); x.arcTo(m, m, s - m, m, r); x.closePath();
  x.fillStyle = g; x.fill();
  x.save(); x.clip();
  const gl = x.createRadialGradient(s * 0.35, s * 0.3, 0, s * 0.35, s * 0.3, s * 0.7);
  gl.addColorStop(0, 'rgba(255,255,255,0.35)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gl; x.fillRect(0, 0, s, s);
  x.restore();
  x.lineWidth = s * 0.025; x.strokeStyle = 'rgba(255,255,255,0.55)'; x.stroke();
}
// Trazo de un polígono en coordenadas relativas (0..1)
function poly(x, s, pts, close = true) { x.beginPath(); pts.forEach(([u, v], i) => i ? x.lineTo(u * s, v * s) : x.moveTo(u * s, v * s)); if (close) x.closePath(); }
function furGrad(x, s, a, b) { const g = x.createLinearGradient(0, s * 0.1, 0, s * 0.95); g.addColorStop(0, a); g.addColorStop(1, b); return g; }

// LOBO: cabeza de frente, antifaz gris, hocico blanco y ojos ámbar, sobre violeta
export const drawWolf = drawn('wolf', (x, s) => {
  tile(x, s, '#8a5ad8', '#3a1a78');
  const ink = '#241a3a';
  // orejas en punta
  [-1, 1].forEach(d => {
    poly(x, s, [[0.5 + d * 0.1, 0.3], [0.5 + d * 0.3, 0.08], [0.5 + d * 0.33, 0.36]]);
    x.fillStyle = '#7a7890'; x.fill(); x.strokeStyle = ink; x.lineWidth = s * 0.012; x.stroke();
    poly(x, s, [[0.5 + d * 0.16, 0.3], [0.5 + d * 0.28, 0.15], [0.5 + d * 0.29, 0.33]]); x.fillStyle = '#e8d8e8'; x.fill();
  });
  // cabeza con mejillas anchas (pelaje hacia afuera)
  poly(x, s, [[0.5, 0.24], [0.66, 0.28], [0.8, 0.42], [0.86, 0.56], [0.76, 0.6], [0.8, 0.7], [0.66, 0.76], [0.58, 0.92], [0.5, 0.95], [0.42, 0.92], [0.34, 0.76], [0.2, 0.7], [0.24, 0.6], [0.14, 0.56], [0.2, 0.42], [0.34, 0.28]]);
  x.fillStyle = furGrad(x, s, '#f2f2fa', '#c0c0d4'); x.fill(); x.strokeStyle = ink; x.lineWidth = s * 0.012; x.stroke();
  // antifaz gris sobre la frente y entre los ojos
  poly(x, s, [[0.5, 0.25], [0.64, 0.3], [0.7, 0.44], [0.6, 0.5], [0.54, 0.6], [0.5, 0.64], [0.46, 0.6], [0.4, 0.5], [0.3, 0.44], [0.36, 0.3]]);
  x.fillStyle = '#6e6c86'; x.fill();
  // hocico blanco y nariz negra
  poly(x, s, [[0.44, 0.58], [0.56, 0.58], [0.6, 0.76], [0.5, 0.86], [0.4, 0.76]]); x.fillStyle = '#ffffff'; x.fill();
  x.fillStyle = '#141018'; x.beginPath(); x.ellipse(s * 0.5, s * 0.66, s * 0.055, s * 0.035, 0, 0, 7); x.fill();
  x.strokeStyle = '#141018'; x.lineWidth = s * 0.01; x.beginPath(); x.moveTo(s * 0.5, s * 0.69); x.lineTo(s * 0.5, s * 0.76); x.moveTo(s * 0.44, s * 0.79); x.quadraticCurveTo(s * 0.5, s * 0.76, s * 0.56, s * 0.79); x.stroke();
  // ojos ámbar rasgados
  [-1, 1].forEach(d => {
    x.save(); x.translate(s * (0.5 + d * 0.11), s * 0.45); x.rotate(d * 0.35);
    x.fillStyle = '#ffb81a'; x.beginPath(); x.ellipse(0, 0, s * 0.045, s * 0.022, 0, 0, 7); x.fill();
    x.fillStyle = '#141018'; x.beginPath(); x.arc(0, 0, s * 0.013, 0, 7); x.fill();
    x.strokeStyle = '#141018'; x.lineWidth = s * 0.008; x.beginPath(); x.ellipse(0, 0, s * 0.045, s * 0.022, 0, 0, 7); x.stroke();
    x.restore();
  });
});
// LEOPARDO DE LAS NIEVES: cabeza de frente con manchas, sobre rosa
export const drawLeopard = drawn('leopard', (x, s) => {
  tile(x, s, '#ff7ac0', '#8a1a6a');
  const cx = s / 2, cy = s * 0.52;
  // orejas
  [-1, 1].forEach(d => { x.beginPath(); x.ellipse(cx + d * s * 0.24, cy - s * 0.24, s * 0.09, s * 0.1, d * 0.4, 0, 7); x.fillStyle = '#e8e4f0'; x.fill(); x.fillStyle = '#c8a0b8'; x.beginPath(); x.ellipse(cx + d * s * 0.24, cy - s * 0.23, s * 0.045, s * 0.055, d * 0.4, 0, 7); x.fill(); });
  // cabeza
  x.beginPath(); x.ellipse(cx, cy, s * 0.3, s * 0.3, 0, 0, 7);
  x.fillStyle = furGrad(x, s, '#ffffff', '#c8c4d8'); x.fill();
  x.lineWidth = s * 0.012; x.strokeStyle = '#4a2a4a'; x.stroke();
  // manchas (rosetas)
  x.strokeStyle = '#3a3040'; x.lineWidth = s * 0.018;
  [[0.36, 0.34], [0.5, 0.3], [0.64, 0.34], [0.3, 0.5], [0.7, 0.5], [0.34, 0.66], [0.66, 0.66], [0.43, 0.4], [0.57, 0.4]].forEach(([u, v]) => { x.beginPath(); x.arc(u * s, v * s, s * 0.022, 0.3, 5.5); x.stroke(); });
  // ojos verdes
  [-1, 1].forEach(d => { x.fillStyle = '#9ad86a'; x.beginPath(); x.ellipse(cx + d * s * 0.1, cy - s * 0.02, s * 0.045, s * 0.03, 0, 0, 7); x.fill(); x.fillStyle = '#101010'; x.beginPath(); x.ellipse(cx + d * s * 0.1, cy - s * 0.02, s * 0.012, s * 0.026, 0, 0, 7); x.fill(); });
  // hocico, nariz y bigotes
  x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(cx, cy + s * 0.13, s * 0.1, s * 0.07, 0, 0, 7); x.fill();
  poly(x, s, [[0.46, 0.6], [0.54, 0.6], [0.5, 0.65]]); x.fillStyle = '#e07a9a'; x.fill();
  x.strokeStyle = '#6a5a6a'; x.lineWidth = s * 0.006;
  [-1, 1].forEach(d => [0, 1, 2].forEach(i => { x.beginPath(); x.moveTo(cx + d * s * 0.06, cy + s * (0.14 + i * 0.02)); x.lineTo(cx + d * s * 0.28, cy + s * (0.1 + i * 0.05)); x.stroke(); }));
});
// HALCÓN BLANCO: busto de perfil con pico ganchudo, sobre azul hielo
export const drawFalcon = drawn('falcon', (x, s) => {
  tile(x, s, '#4ac0ff', '#0a3a8a');
  const ink = '#1a3050';
  // cuerpo y cabeza de perfil mirando a la izquierda
  poly(x, s, [[0.3, 0.97], [0.3, 0.72], [0.36, 0.55], [0.34, 0.46], [0.36, 0.3], [0.46, 0.18], [0.6, 0.16], [0.7, 0.24], [0.74, 0.38], [0.78, 0.56], [0.86, 0.76], [0.9, 0.97]]);
  x.fillStyle = furGrad(x, s, '#ffffff', '#c8dcf0'); x.fill(); x.strokeStyle = ink; x.lineWidth = s * 0.012; x.stroke();
  // ala plegada con plumas
  poly(x, s, [[0.62, 0.5], [0.8, 0.56], [0.9, 0.8], [0.9, 0.97], [0.66, 0.97], [0.58, 0.7]]);
  x.fillStyle = '#dde8f4'; x.fill(); x.stroke();
  x.strokeStyle = 'rgba(30,60,100,0.5)'; x.lineWidth = s * 0.009;
  [0.62, 0.7, 0.78, 0.86].forEach(v => { x.beginPath(); x.moveTo(s * 0.62, s * v); x.quadraticCurveTo(s * 0.76, s * (v - 0.02), s * 0.88, s * (v + 0.06)); x.stroke(); });
  // pecho moteado
  x.fillStyle = 'rgba(40,60,90,0.55)';
  [[0.4, 0.62], [0.46, 0.7], [0.38, 0.78], [0.5, 0.8], [0.44, 0.88], [0.52, 0.6], [0.36, 0.9]].forEach(([u, v]) => { poly(x, s, [[u - 0.018, v - 0.01], [u, v + 0.012], [u + 0.018, v - 0.01]], false); x.lineWidth = s * 0.009; x.strokeStyle = 'rgba(40,60,90,0.6)'; x.stroke(); });
  // pico ganchudo amarillo y gris
  poly(x, s, [[0.36, 0.3], [0.24, 0.32], [0.18, 0.38], [0.21, 0.43], [0.25, 0.38], [0.3, 0.4], [0.35, 0.4]]);
  x.fillStyle = '#ffcc3a'; x.fill(); x.strokeStyle = ink; x.lineWidth = s * 0.01; x.stroke();
  poly(x, s, [[0.24, 0.32], [0.18, 0.38], [0.21, 0.43], [0.23, 0.37]]); x.fillStyle = '#3a4050'; x.fill();
  // ojo con anillo amarillo y "bigote" oscuro de halcón
  x.fillStyle = '#ffcc3a'; x.beginPath(); x.arc(s * 0.45, s * 0.3, s * 0.045, 0, 7); x.fill();
  x.fillStyle = '#0a0a10'; x.beginPath(); x.arc(s * 0.45, s * 0.3, s * 0.03, 0, 7); x.fill();
  x.fillStyle = '#ffffff'; x.beginPath(); x.arc(s * 0.44, s * 0.29, s * 0.009, 0, 7); x.fill();
  poly(x, s, [[0.43, 0.35], [0.5, 0.35], [0.46, 0.48], [0.41, 0.46]]); x.fillStyle = 'rgba(60,80,110,0.7)'; x.fill();
});
// ANTÍLOPE (gamuza): cabeza de perfil con cuernos curvos, sobre verde
export const drawChamois = drawn('chamois', (x, s) => {
  tile(x, s, '#2ec48a', '#0a5a3a');
  // montaña de fondo
  poly(x, s, [[0, 0.9], [0.3, 0.6], [0.5, 0.75], [0.75, 0.5], [1, 0.8], [1, 1], [0, 1]]); x.fillStyle = 'rgba(255,255,255,0.25)'; x.fill();
  // cuernos en gancho
  x.strokeStyle = '#1a1208'; x.lineCap = 'round'; x.lineWidth = s * 0.035;
  [[0.52, 0.02], [0.6, 0.03]].forEach(([dx, dy]) => { x.beginPath(); x.moveTo(s * dx, s * 0.3); x.quadraticCurveTo(s * (dx - 0.02), s * (0.08 + dy), s * (dx + 0.1), s * 0.1); x.stroke(); });
  // cabeza y cuello
  poly(x, s, [[0.72, 0.95], [0.74, 0.62], [0.66, 0.38], [0.6, 0.28], [0.48, 0.28], [0.36, 0.4], [0.24, 0.56], [0.22, 0.64], [0.3, 0.68], [0.42, 0.62], [0.46, 0.72], [0.44, 0.95]]);
  x.fillStyle = furGrad(x, s, '#e8c890', '#8a5a2a'); x.fill(); x.strokeStyle = '#3a2410'; x.lineWidth = s * 0.012; x.stroke();
  // franja oscura característica de la cara
  poly(x, s, [[0.56, 0.3], [0.5, 0.3], [0.36, 0.44], [0.28, 0.58], [0.34, 0.6], [0.44, 0.48]]); x.fillStyle = '#2a1a0a'; x.fill();
  // oreja, ojo y nariz
  poly(x, s, [[0.64, 0.32], [0.78, 0.24], [0.7, 0.38]]); x.fillStyle = '#c89a60'; x.fill(); x.stroke();
  x.fillStyle = '#ffffff'; x.beginPath(); x.arc(s * 0.5, s * 0.38, s * 0.022, 0, 7); x.fill();
  x.fillStyle = '#101010'; x.beginPath(); x.arc(s * 0.5, s * 0.38, s * 0.012, 0, 7); x.fill();
  x.beginPath(); x.arc(s * 0.245, s * 0.6, s * 0.015, 0, 7); x.fill();
});
// NOBLE CHINO: busto estilizado con túnica roja, cuello dorado y cinta roja en la frente
export const drawNoble = drawn('noble', (x, s) => {
  tile(x, s, '#ffcf8a', '#c8501a');
  const cx = s / 2;
  // túnica
  poly(x, s, [[0.12, 0.98], [0.2, 0.74], [0.38, 0.66], [0.62, 0.66], [0.8, 0.74], [0.88, 0.98]]);
  let g = x.createLinearGradient(0, s * 0.66, 0, s); g.addColorStop(0, '#e0281a'); g.addColorStop(1, '#8a0808');
  x.fillStyle = g; x.fill();
  x.strokeStyle = '#ffd06a'; x.lineWidth = s * 0.02; poly(x, s, [[0.4, 0.66], [0.5, 0.8], [0.6, 0.66]], false); x.stroke();
  x.fillStyle = '#ffd06a'; [0.78, 0.86, 0.94].forEach(v => { x.beginPath(); x.arc(cx + s * 0.04, s * v, s * 0.012, 0, 7); x.fill(); });
  // cuello y cabeza
  x.fillStyle = '#f0c8a0'; x.fillRect(cx - s * 0.06, s * 0.56, s * 0.12, s * 0.12);
  g = x.createRadialGradient(cx - s * 0.05, s * 0.38, s * 0.02, cx, s * 0.42, s * 0.18); g.addColorStop(0, '#ffe0c0'); g.addColorStop(1, '#d8a078');
  x.fillStyle = g; x.beginPath(); x.ellipse(cx, s * 0.42, s * 0.14, s * 0.17, 0, 0, 7); x.fill();
  // cabello, moño y cinta roja
  x.fillStyle = '#141014';
  x.beginPath(); x.ellipse(cx, s * 0.3, s * 0.155, s * 0.1, 0, Math.PI, Math.PI * 2); x.fill();
  x.fillRect(cx - s * 0.155, s * 0.3, s * 0.035, s * 0.22); x.fillRect(cx + s * 0.12, s * 0.3, s * 0.035, s * 0.22);
  x.beginPath(); x.arc(cx, s * 0.16, s * 0.055, 0, 7); x.fill();
  x.fillStyle = '#d8201a'; x.fillRect(cx - s * 0.155, s * 0.28, s * 0.31, s * 0.035);
  x.fillStyle = '#ffd06a'; x.beginPath(); x.arc(cx, s * 0.297, s * 0.016, 0, 7); x.fill();
  // rostro
  x.fillStyle = '#2a1a10';
  [-1, 1].forEach(d => { x.beginPath(); x.ellipse(cx + d * s * 0.055, s * 0.41, s * 0.022, s * 0.009, 0, 0, 7); x.fill(); x.fillRect(cx + d * s * 0.055 - s * 0.03, s * 0.375, s * 0.06, s * 0.008); });
  x.strokeStyle = '#a0603a'; x.lineWidth = s * 0.008; x.beginPath(); x.moveTo(cx, s * 0.43); x.lineTo(cx - s * 0.01, s * 0.48); x.lineTo(cx + s * 0.01, s * 0.48); x.stroke();
  x.strokeStyle = '#a0402a'; x.lineWidth = s * 0.01; x.beginPath(); x.moveTo(cx - s * 0.03, s * 0.52); x.quadraticCurveTo(cx, s * 0.535, cx + s * 0.03, s * 0.52); x.stroke();
});

// Símbolos y pagos según importancia
// Sueño Rojo: noble china > noble chino > tetera > papiro > huevo de jade > campanas > K > Q > J
RED.icon = Object.assign({}, RED.icon, { s7r: S.GEISHA, grapes: S.BELL, plum: S.K, orange: S.Q, cherry: S.J });
RED.draw = Object.assign({}, RED.draw, { s7b: drawNoble, bar: drawTea, bell: drawScroll, melon: drawEgg });
RED.names = Object.assign({}, RED.names, { s7r: 'Noble china', s7b: 'Noble chino', bar: 'Tetera y tazas', bell: 'Papiro de la suerte', melon: 'Huevo de la suerte', grapes: 'Campanas', plum: 'K', orange: 'Q', cherry: 'J' });
// Reino de Nieve: Reina > lobo > leopardo > halcón > antílope > K > Q > J > 10
SNOW.draw = Object.assign({}, SNOW.draw, { s7b: drawWolf, bar: drawLeopard, bell: drawFalcon, melon: drawChamois });
SNOW.variant = {};
SNOW.names = Object.assign({}, SNOW.names, { s7r: 'Reina de hielo', s7b: 'Lobo', bar: 'Leopardo de las nieves', bell: 'Halcón blanco', melon: 'Antílope' });
SNOW.pay = Object.assign({}, PAY, {
  s7r: [0, 0, 0, 30, 100, 400], s7b: [0, 0, 0, 25, 90, 300], bar: [0, 0, 0, 20, 70, 250], bell: [0, 0, 0, 15, 50, 200], melon: [0, 0, 0, 12, 40, 160],
  grapes: [0, 0, 0, 8, 25, 100], plum: [0, 0, 0, 8, 25, 100], orange: [0, 0, 0, 5, 20, 80], cherry: [0, 0, 2, 5, 20, 80]
});
// Calibrado por simulación (la Reina aparece en cadena y paga más): mismo equilibrio que la original
SNOW.lineScale = 0.58;
SNOW.ball = 0.99;
SNOW.scatter = Object.assign({}, SNOW.scatter, { w: 1.45 });

// ---------- Imágenes de los temas (reemplazan a los dibujos anteriores) ----------
// Figura recortada con sombra suave (Sueño Rojo)
const figure = k => drawn('img-' + k, (x, s) => {
  x.save(); x.shadowColor = 'rgba(0,0,0,0.55)'; x.shadowBlur = s * 0.05; x.shadowOffsetY = s * 0.02;
  sheetDraw(x, k, s * 0.02, s * 0.02, s * 0.96, s * 0.96); x.restore();
}, true);
// Retrato en azulejo de hielo (Reino de Nieve). ice: el fondo blanco del dibujo se tiñe celeste
function iceFrame(x, s, pad) {
  const m = s * pad, r = s * 0.1;
  x.beginPath(); x.moveTo(m + r, m); x.arcTo(s - m, m, s - m, s - m, r); x.arcTo(s - m, s - m, m, s - m, r); x.arcTo(m, s - m, m, m, r); x.arcTo(m, m, s - m, m, r); x.closePath();
}
const card = (k, ice) => drawn('card-' + k, (x, s) => {
  const m = s * 0.04;
  x.save(); x.shadowColor = 'rgba(0,10,40,0.6)'; x.shadowBlur = s * 0.05; x.shadowOffsetY = s * 0.02;
  iceFrame(x, s, 0.04); x.fillStyle = '#dff2ff'; x.fill(); x.restore();
  x.save(); iceFrame(x, s, 0.04); x.clip();
  if (ice) { const g = x.createLinearGradient(0, 0, 0, s); g.addColorStop(0, '#f2fbff'); g.addColorStop(1, '#a8d4f4'); x.fillStyle = g; x.fillRect(0, 0, s, s); x.globalCompositeOperation = 'multiply'; }
  sheetDraw(x, k, m, m, s - m * 2, s - m * 2);
  x.globalCompositeOperation = 'source-over';
  // brillo helado en la esquina
  const gl = x.createLinearGradient(0, 0, s * 0.6, s * 0.6); gl.addColorStop(0, 'rgba(255,255,255,0.35)'); gl.addColorStop(0.4, 'rgba(255,255,255,0)');
  x.fillStyle = gl; x.fillRect(0, 0, s, s); x.restore();
  // marco de hielo
  iceFrame(x, s, 0.04); const gb = x.createLinearGradient(0, 0, s, s); gb.addColorStop(0, '#ffffff'); gb.addColorStop(0.5, '#8fd0ff'); gb.addColorStop(1, '#e8f8ff');
  x.lineWidth = s * 0.045; x.strokeStyle = gb; x.stroke();
  iceFrame(x, s, 0.075); x.lineWidth = s * 0.01; x.strokeStyle = 'rgba(20,60,120,0.45)'; x.stroke();
}, true);
// Dispersor de Reino de Nieve: copo de nieve con BONUS
const drawSnowflake = drawn('snowflake', (x, s) => {
  x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.4; x.drawImage(glow('rgba(140,220,255,1)', 64), s * 0.05, 0, s * 0.9, s * 0.9); x.restore();
  sheetDraw(x, 'snowflake', s * 0.1, s * 0.02, s * 0.8, s * 0.8);
  bonusLabel(x, s, s * 0.86, ['#ffffff', '#8fd0ff'], '#0a2a5a');
}, true);

// Retrato en marco lacado rojo con borde dorado (la noble de azul de Sueño Rojo)
const lacquer = k => drawn('lacq-' + k, (x, s) => {
  x.save(); x.shadowColor = 'rgba(0,0,0,0.6)'; x.shadowBlur = s * 0.05; x.shadowOffsetY = s * 0.02;
  iceFrame(x, s, 0.03); const g = x.createLinearGradient(0, 0, s, s); g.addColorStop(0, '#e0281a'); g.addColorStop(1, '#6a0406'); x.fillStyle = g; x.fill(); x.restore();
  x.save(); iceFrame(x, s, 0.085); x.clip(); sheetDraw(x, k, s * 0.085, s * 0.085, s * 0.83, s * 0.83); x.restore();
  iceFrame(x, s, 0.085); x.lineWidth = s * 0.022; const gb = x.createLinearGradient(0, 0, 0, s); gb.addColorStop(0, '#fff0a8'); gb.addColorStop(0.5, '#e8a820'); gb.addColorStop(1, '#ffd06a'); x.strokeStyle = gb; x.stroke();
  // esquinas doradas
  x.fillStyle = '#ffd06a'; [[0.07, 0.07], [0.93, 0.07], [0.07, 0.93], [0.93, 0.93]].forEach(([u, v]) => { x.beginPath(); x.arc(s * u, s * v, s * 0.035, 0, 7); x.fill(); });
}, true);
// Sueño Rojo: noble china > noble de azul (símbolo propio del tema) > noble chino > taza > papiro…
RED.draw = Object.assign({}, RED.draw, { lady: lacquer('lady'), s7b: figure('noble'), bar: figure('tea'), bell: figure('scroll'), scat: figure('lotus') });
RED.names = Object.assign({}, RED.names, { lady: 'Noble de azul', bar: 'Taza de porcelana' });
// Sin campanas (grapes): así la noble de azul no diluye los premios
{ const { s7r, grapes, ...rest } = RED.pay; RED.pay = Object.assign({ s7r, lady: [0, 0, 0, 40, 150, 700] }, rest); }
RED.extraW = { lady: 3.5, grapes: 0 };
// Sin compensar: con la noble de azul y sin campanas paga ~20 % más que la versión anterior (simulado)
RED.waysScale = 1;
// Reino de Nieve (la Reina sigue siendo la del atlas): lobo, leopardo, halcón, antílope y copo de nieve BONUS
SNOW.draw = Object.assign({}, SNOW.draw, { s7b: card('wolf'), bar: card('leopard', true), bell: card('falcon', true), melon: card('antelope', true), scat: drawSnowflake });
SNOW.names = Object.assign({}, SNOW.names, { scat: 'Copo de nieve' });
SNOW.scatter = Object.assign({}, SNOW.scatter, { name: 'copos de nieve' });
RedDream.lobby.icons = [S.GEISHA, 'lady', 'noble'];
SnowKingdom.lobby.icons = ['wolf', S.QUEEN, 'leopard'];
