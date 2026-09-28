// Utilidades gráficas: atlas de símbolos, caché de sprites por tamaño, bolas doradas,
// rayos, partículas y textos dorados. Todo se pre-renderiza para que cada frame en iOS
// sea solo drawImage sin escalado (lo más barato para la GPU de Safari).

export const S = {
  EMPEROR: 0, QUEEN: 1, GEISHA: 2, PLUM: 3, BELL: 4, ORANGE: 5, MELON: 6, GRAPES: 7,
  SEVEN: 8, CHERRY: 9, BSTAR: 10, GSTAR: 11, RSTAR: 12, SUN: 13, UPGRADE: 14, BURST: 15,
  TEN: 16, J: 17, Q: 18, K: 19, WILD: 20, CLOVER: 21, DRAGON: 22, SNOW: 23, DIAMOND: 24,
  BULL: 25, PHOENIX: 26
};
const TILE = 200, ATLAS_COLS = 6;
export const FONT = '"Avenir Next", "Avenir", "Helvetica Neue", "Arial Black", system-ui, sans-serif';

let atlas = null;
export function loadAtlas(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { atlas = img; res(img); };
    img.onerror = rej;
    img.src = src;
  });
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return c;
}

const cache = new Map();
export function clearSpriteCache() { cache.clear(); }

// Símbolo del atlas al tamaño exacto (en píxeles de dispositivo)
export function sym(id, size, variant = 'n') {
  size = Math.round(size);
  const key = id + '|' + size + '|' + variant;
  let c = cache.get(key);
  if (c) return c;
  if (variant === 'b') {
    // Desenfoque de movimiento vertical: varias copias con alfa decreciente
    const base = sym(id, size, 'n'), h = Math.round(size * 1.35);
    c = makeCanvas(size, h);
    const x = c.getContext('2d');
    const n = 7;
    for (let i = 0; i < n; i++) {
      x.globalAlpha = 0.24;
      x.drawImage(base, 0, (h - size) * (i / (n - 1)));
    }
  } else if (variant === 'd') {
    const base = sym(id, size, 'n');
    c = makeCanvas(size, size);
    const x = c.getContext('2d');
    x.drawImage(base, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = 'rgba(8,4,20,0.62)';
    x.fillRect(0, 0, size, size);
  } else if (variant === 'g') {
    // Versión "brillante" para celebraciones
    const base = sym(id, size, 'n');
    c = makeCanvas(size, size);
    const x = c.getContext('2d');
    x.drawImage(base, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = 'rgba(255,240,190,0.35)';
    x.fillRect(0, 0, size, size);
  } else if (variant === 'blue') {
    // 7 azul generado del 7 rojo (rotación de matiz por píxel, una sola vez)
    const base = sym(id, size, 'n');
    c = makeCanvas(size, size);
    const x = c.getContext('2d');
    x.drawImage(base, 0, 0);
    const d = x.getImageData(0, 0, size, size), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      const r = p[i], g = p[i + 1], b = p[i + 2];
      if (r > g * 1.25 && r > b * 1.25) { p[i] = b * 0.6; p[i + 1] = g * 0.9 + r * 0.25; p[i + 2] = Math.min(255, r * 1.15); }
    }
    x.putImageData(d, 0, 0);
  } else {
    c = makeCanvas(size, size);
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = 'high';
    if (atlas) {
      // Reducción en pasos para calidad (evita aliasing en Safari)
      let src = atlas, sx = (id % ATLAS_COLS) * TILE, sy = Math.floor(id / ATLAS_COLS) * TILE, sw = TILE;
      if (size < TILE / 2) {
        const mid = makeCanvas(TILE / 2, TILE / 2), mx = mid.getContext('2d');
        mx.imageSmoothingQuality = 'high';
        mx.drawImage(atlas, sx, sy, TILE, TILE, 0, 0, TILE / 2, TILE / 2);
        src = mid; sx = 0; sy = 0; sw = TILE / 2;
      }
      x.drawImage(src, sx, sy, sw, sw, 0, 0, size, size);
    }
  }
  cache.set(key, c);
  return c;
}

// Sprite de brillo radial (para partículas aditivas)
export function glow(color, size = 64) {
  const key = 'glow|' + color + '|' + size;
  let c = cache.get(key);
  if (c) return c;
  c = makeCanvas(size, size);
  const x = c.getContext('2d'), g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  cache.set(key, c);
  return c;
}

const BALL_COLORS = {
  gold: ['#fffdf0', '#fff39a', '#f7c533', '#c27a12', '#5c3406', '#ffe9a0'],
  blue: ['#f0fbff', '#9fe7ff', '#2d8cf0', '#133e9c', '#07123f', '#bdf1ff'],
  green: ['#f4fff2', '#aaf5a0', '#34c24d', '#12702a', '#062a10', '#c8ffc0'],
  cyan: ['#f0ffff', '#9ff3ff', '#1fb7d8', '#0b5f83', '#04213a', '#c0fbff'],
  purple: ['#fdf2ff', '#ecaaff', '#b53ae6', '#5d1591', '#200536', '#f3c8ff'],
  red: ['#fff2f0', '#ffb0a0', '#ef3b2c', '#8e1111', '#340404', '#ffd0c0'],
  ice: ['#ffffff', '#dff6ff', '#8fd3ff', '#3a7fc8', '#0f2a5a', '#e8fbff']
};

// Bola metálica brillante con etiqueta (valor o jackpot)
export function ball(kind, label, size, sub) {
  size = Math.round(size);
  const key = 'ball|' + kind + '|' + label + '|' + (sub || '') + '|' + size;
  let c = cache.get(key);
  if (c) return c;
  c = makeCanvas(size, size);
  const x = c.getContext('2d'), r = size * 0.46, cx = size / 2, cy = size / 2;
  const col = BALL_COLORS[kind] || BALL_COLORS.gold;
  // Sombra de contacto
  let g = x.createRadialGradient(cx, cy + r * 0.2, r * 0.6, cx, cy + r * 0.2, r * 1.08);
  g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy + r * 0.12, r * 1.08, 0, 7); x.fill();
  // Cuerpo
  g = x.createRadialGradient(cx - r * 0.35, cy - r * 0.45, r * 0.05, cx, cy, r);
  g.addColorStop(0, col[0]); g.addColorStop(0.2, col[1]); g.addColorStop(0.55, col[2]); g.addColorStop(0.85, col[3]); g.addColorStop(1, col[4]);
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
  // Luz de rebote inferior
  g = x.createRadialGradient(cx + r * 0.2, cy + r * 0.75, 0, cx + r * 0.2, cy + r * 0.75, r * 0.7);
  g.addColorStop(0, col[5] + 'aa'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
  // Aro
  x.lineWidth = Math.max(1, size * 0.018); x.strokeStyle = col[5]; x.globalAlpha = 0.8;
  x.beginPath(); x.arc(cx, cy, r - x.lineWidth / 2, 0, 7); x.stroke(); x.globalAlpha = 1;
  // Reflejo especular
  x.save(); x.translate(cx - r * 0.32, cy - r * 0.5); x.rotate(-0.5);
  g = x.createRadialGradient(0, 0, 0, 0, 0, r * 0.42);
  g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.scale(1, 0.55); x.beginPath(); x.arc(0, 0, r * 0.42, 0, 7); x.fill(); x.restore();
  // Etiqueta
  if (label) {
    const isJ = /^(MINI|MINOR|MAJOR|GRAND)$/.test(label) || sub;
    let fs = size * (label.length > 5 ? 0.2 : label.length > 3 ? 0.25 : 0.3);
    if (isJ) fs = size * 0.19;
    x.font = '900 ' + fs + 'px ' + FONT;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    const ty = sub ? cy - size * 0.1 : cy + size * 0.02;
    x.lineJoin = 'round';
    x.lineWidth = fs * 0.28; x.strokeStyle = 'rgba(40,18,0,0.9)'; x.strokeText(label, cx, ty);
    const tg = x.createLinearGradient(0, ty - fs / 2, 0, ty + fs / 2);
    tg.addColorStop(0, '#ffffff'); tg.addColorStop(0.5, '#fff6c8'); tg.addColorStop(1, '#ffd35a');
    x.fillStyle = tg; x.fillText(label, cx, ty);
    if (sub) {
      const fs2 = size * 0.17;
      x.font = '900 ' + fs2 + 'px ' + FONT;
      x.lineWidth = fs2 * 0.3; x.strokeText(sub, cx, cy + size * 0.16);
      x.fillStyle = '#fff'; x.fillText(sub, cx, cy + size * 0.16);
    }
  }
  cache.set(key, c);
  return c;
}

// --- Easing ---
export const ease = {
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inCubic: t => t * t * t,
  outBack: t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outElastic: t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1,
  inOut: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  outBounce: t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375; return n * (t -= 2.625 / d) * t + 0.984375; }
};
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);

export function roundRect(x, px, py, w, h, r) {
  x.beginPath();
  x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r);
  x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath();
}

// Texto dorado con contorno, usado en banners y premios
export function goldText(x, text, px, py, size, { align = 'center', colors, stroke = '#3a1600', glowColor, maxW } = {}) {
  x.font = '900 ' + size + 'px ' + FONT;
  x.textAlign = align; x.textBaseline = 'middle'; x.lineJoin = 'round';
  if (maxW) {
    const w = x.measureText(text).width;
    if (w > maxW) { size *= maxW / w; x.font = '900 ' + size + 'px ' + FONT; }
  }
  if (glowColor) {
    x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.5;
    x.lineWidth = size * 0.5; x.strokeStyle = glowColor; x.strokeText(text, px, py); x.restore();
  }
  x.lineWidth = size * 0.22; x.strokeStyle = stroke; x.strokeText(text, px, py);
  const g = x.createLinearGradient(0, py - size / 2, 0, py + size / 2);
  const c = colors || ['#fffbe6', '#ffe27a', '#f0a81c', '#fff2b0'];
  g.addColorStop(0, c[0]); g.addColorStop(0.45, c[1]); g.addColorStop(0.55, c[2]); g.addColorStop(1, c[3]);
  x.fillStyle = g; x.fillText(text, px, py);
}

// --- Rayos (desplazamiento de punto medio) ---
export function boltPoints(x1, y1, x2, y2, disp, detail = 6) {
  let pts = [[x1, y1], [x2, y2]];
  for (let k = 0; k < detail; k++) {
    const next = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
      const off = (Math.random() - 0.5) * disp;
      next.push([mx - dy / len * off, my + dx / len * off], b);
    }
    pts = next; disp *= 0.55;
  }
  return pts;
}
export function drawBolt(x, pts, width, color = '#7fe3ff', alpha = 1) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  x.lineJoin = 'round'; x.lineCap = 'round';
  x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
  x.globalAlpha = 0.22 * alpha; x.strokeStyle = color; x.lineWidth = width * 5; x.stroke();
  x.globalAlpha = 0.55 * alpha; x.lineWidth = width * 2.2; x.stroke();
  x.globalAlpha = alpha; x.strokeStyle = '#ffffff'; x.lineWidth = width * 0.8; x.stroke();
  x.restore();
}
export function bolt(x, x1, y1, x2, y2, width, color, alpha = 1, branch = true) {
  const d = Math.hypot(x2 - x1, y2 - y1);
  const pts = boltPoints(x1, y1, x2, y2, d * 0.35, d > 200 ? 7 : 5);
  drawBolt(x, pts, width, color, alpha);
  if (branch && d > 60) {
    for (let i = 0; i < 2; i++) {
      const p = pts[Math.floor(pts.length * (0.25 + Math.random() * 0.5))];
      const ang = Math.atan2(y2 - y1, x2 - x1) + (Math.random() - 0.5) * 1.6, l = d * (0.15 + Math.random() * 0.2);
      drawBolt(x, boltPoints(p[0], p[1], p[0] + Math.cos(ang) * l, p[1] + Math.sin(ang) * l, l * 0.4, 4), width * 0.5, color, alpha * 0.8);
    }
  }
}

// Arcos eléctricos alrededor de una bola
export function electricRing(x, cx, cy, r, width, color = '#8feaff', alpha = 1) {
  const n = 2 + (Math.random() * 2 | 0);
  for (let i = 0; i < n; i++) {
    const a0 = Math.random() * Math.PI * 2, a1 = a0 + 0.6 + Math.random() * 1.2, steps = 7, pts = [];
    for (let k = 0; k <= steps; k++) {
      const a = a0 + (a1 - a0) * k / steps, rr = r * (1 + (Math.random() - 0.3) * 0.16);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    drawBolt(x, pts, width, color, alpha);
  }
}

// --- Partículas ---
export class Particles {
  constructor() { this.list = []; }
  get active() { return this.list.length > 0; }
  add(p) {
    if (this.list.length > 420) return;
    this.list.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, g: 0, life: 1, age: 0, size: 10, rot: 0, vr: 0, drag: 0, color: '#ffd76a', type: 'spark', alpha: 1 }, p));
  }
  burst(x, y, n, opts = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = (opts.speed || 300) * (0.3 + Math.random() * 0.7);
      this.add(Object.assign({}, opts, { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opts.lift || 0), life: (opts.life || 0.9) * (0.6 + Math.random() * 0.6), size: (opts.size || 10) * (0.6 + Math.random() * 0.8), rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12 }));
    }
  }
  update(dt) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.age += dt;
      if (p.age >= p.life) { L[i] = L[L.length - 1]; L.pop(); continue; }
      if (p.target) {
        // Vuelo guiado hacia un punto (monedas al medidor de premio)
        const t = p.age / p.life, e = ease.inCubic(t);
        p.x = p.sx + (p.target[0] - p.sx) * e + Math.sin(t * Math.PI) * p.arc;
        p.y = p.sy + (p.target[1] - p.sy) * e - Math.sin(t * Math.PI) * Math.abs(p.arc) * 0.6;
      } else {
        p.vy += p.g * dt;
        if (p.drag) { const k = Math.pow(1 - p.drag, dt * 60); p.vx *= k; p.vy *= k; }
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
      p.rot += p.vr * dt;
    }
  }
  draw(x) {
    const L = this.list;
    if (!L.length) return;
    x.save();
    for (let i = 0; i < L.length; i++) {
      const p = L[i], t = p.age / p.life, fade = t < 0.8 ? 1 : 1 - (t - 0.8) / 0.2;
      x.globalAlpha = p.alpha * fade;
      if (p.type === 'spark' || p.type === 'ember') {
        x.globalCompositeOperation = 'lighter';
        const s = p.size * (p.type === 'ember' ? 1 - t * 0.6 : 1);
        x.drawImage(glow(p.color), p.x - s, p.y - s, s * 2, s * 2);
      } else if (p.type === 'coin') {
        x.globalCompositeOperation = 'source-over';
        const sx = Math.abs(Math.cos(p.rot)) + 0.08, s = p.size;
        const img = ball('gold', '', 48);
        x.drawImage(img, p.x - s * sx, p.y - s, s * 2 * sx, s * 2);
      } else if (p.type === 'shard') {
        x.globalCompositeOperation = 'lighter';
        x.save(); x.translate(p.x, p.y); x.rotate(p.rot);
        x.fillStyle = p.color; x.beginPath();
        x.moveTo(0, -p.size); x.lineTo(p.size * 0.45, p.size * 0.3); x.lineTo(-p.size * 0.35, p.size * 0.6); x.closePath(); x.fill();
        x.restore();
      } else if (p.type === 'ring') {
        x.globalCompositeOperation = 'lighter';
        x.strokeStyle = p.color; x.lineWidth = p.width * (1 - t);
        x.beginPath(); x.arc(p.x, p.y, p.size + (p.grow || 200) * ease.outCubic(t), 0, 7); x.stroke();
      } else if (p.type === 'text') {
        x.globalCompositeOperation = 'source-over';
        const sc = t < 0.15 ? ease.outBack(t / 0.15) : 1;
        goldText(x, p.text, p.x, p.y - t * 30, p.size * sc, { colors: p.colors });
      } else if (p.type === 'bolt') {
        if (Math.random() < 0.85) bolt(x, p.x1, p.y1, p.x2, p.y2, p.w || 2.5, p.color, p.alpha * fade);
      } else if (p.type === 'snow') {
        x.globalCompositeOperation = 'lighter';
        x.drawImage(glow('rgba(200,235,255,0.9)', 32), p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
      }
    }
    x.restore();
  }
}

// Bola de jackpot estilo gabinete: bola dorada con banda de color (MINI/MINOR/MAJOR/GRAND) y "+ valor"
const JP_BAND = { mini: ['#7dff8f', '#16a52c', '#064a12'], minor: ['#8fe6ff', '#1680d6', '#05305e'], major: ['#f0a8ff', '#9a27d6', '#3b0757'], grand: ['#ff9c8a', '#e0231a', '#5a0404'] };
export function jackpotBall(jp, valueText, size) {
  size = Math.round(size);
  const key = 'jpball|' + jp + '|' + valueText + '|' + size;
  let c = cache.get(key);
  if (c) return c;
  c = makeCanvas(size, size);
  const x = c.getContext('2d'), cx = size / 2, cy = size / 2, r = size * 0.46;
  x.drawImage(ball('gold', '', size), 0, 0);
  // Banda superior (casquete) recortada al círculo
  const col = JP_BAND[jp] || JP_BAND.mini;
  x.save(); x.beginPath(); x.arc(cx, cy, r * 0.98, 0, 7); x.clip();
  const top = cy - r, bandH = r * 0.95;
  let g = x.createLinearGradient(0, top, 0, top + bandH);
  g.addColorStop(0, col[0]); g.addColorStop(0.45, col[1]); g.addColorStop(1, col[2]);
  x.fillStyle = g;
  x.beginPath(); x.moveTo(cx - r * 1.1, top); x.lineTo(cx + r * 1.1, top); x.lineTo(cx + r * 1.1, top + bandH); x.quadraticCurveTo(cx, top + bandH * 1.18, cx - r * 1.1, top + bandH); x.closePath(); x.fill();
  x.strokeStyle = '#fff6c8'; x.lineWidth = size * 0.025;
  x.beginPath(); x.moveTo(cx - r * 1.1, top + bandH); x.quadraticCurveTo(cx, top + bandH * 1.18, cx + r * 1.1, top + bandH); x.stroke();
  // brillo sobre la banda
  g = x.createRadialGradient(cx - r * 0.3, top + bandH * 0.3, 1, cx - r * 0.3, top + bandH * 0.3, r * 0.6);
  g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, size, cy);
  x.restore();
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  let fs = size * (jp === 'grand' || jp === 'major' || jp === 'minor' ? 0.2 : 0.22);
  x.font = '900 ' + fs + 'px ' + FONT;
  const label = jp.toUpperCase(), ly = cy - r * 0.42;
  x.lineWidth = fs * 0.3; x.strokeStyle = col[2]; x.strokeText(label, cx, ly);
  x.fillStyle = '#ffffff'; x.fillText(label, cx, ly);
  // "+" y valor
  x.font = '900 ' + size * 0.14 + 'px ' + FONT;
  x.lineWidth = size * 0.04; x.strokeStyle = '#4a2200'; x.strokeText('+', cx, cy + r * 0.08);
  x.fillStyle = '#fff3a0'; x.fillText('+', cx, cy + r * 0.08);
  fs = size * (valueText.length > 5 ? 0.18 : 0.22);
  x.font = '900 ' + fs + 'px ' + FONT;
  x.lineWidth = fs * 0.28; x.strokeStyle = 'rgba(40,18,0,0.95)'; x.strokeText(valueText, cx, cy + r * 0.52);
  g = x.createLinearGradient(0, cy + r * 0.4, 0, cy + r * 0.65);
  g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#ffd35a');
  x.fillStyle = g; x.fillText(valueText, cx, cy + r * 0.52);
  cache.set(key, c);
  return c;
}

// Íconos especiales del bono: 'launch' (esfera eléctrica que lanza bolas) y 'upgrade' (monedas con flecha)
export function specialIcon(kind, size) {
  size = Math.round(size);
  const key = 'special|' + kind + '|' + size;
  let c = cache.get(key);
  if (c) return c;
  c = makeCanvas(size, size);
  const x = c.getContext('2d'), cx = size / 2, cy = size / 2, r = size * 0.44;
  // Disco azul eléctrico
  let g = x.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#5fb8ff'); g.addColorStop(0.6, '#1546b8'); g.addColorStop(1, '#071a55');
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
  x.lineWidth = size * 0.035; x.strokeStyle = '#bfe8ff'; x.stroke();
  x.lineWidth = size * 0.015; x.strokeStyle = '#ffffff'; x.beginPath(); x.arc(cx, cy, r * 0.9, 0, 7); x.stroke();
  x.lineCap = 'round'; x.lineJoin = 'round';
  if (kind === 'launch') {
    // Rayos radiales en zigzag
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + 0.2, r0 = r * 0.42, r1 = r * 1.0;
      x.beginPath();
      for (let k = 0; k <= 4; k++) {
        const rr = r0 + (r1 - r0) * k / 4, off = (k % 2 ? 1 : -1) * 0.14;
        const px = cx + Math.cos(a + off) * rr, py = cy + Math.sin(a + off) * rr;
        k ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      x.strokeStyle = 'rgba(160,230,255,0.6)'; x.lineWidth = size * 0.06; x.stroke();
      x.strokeStyle = '#ffffff'; x.lineWidth = size * 0.022; x.stroke();
    }
    // Núcleo dorado
    x.drawImage(ball('gold', '', r * 0.95), cx - r * 0.475, cy - r * 0.475, r * 0.95, r * 0.95);
  } else {
    // Pila de monedas
    const cw = r * 0.62, ch = r * 0.2;
    for (let i = 0; i < 5; i++) {
      const py = cy + r * 0.45 - i * ch * 0.75, px = cx - r * 0.12 + (i % 2 ? 1 : -1) * r * 0.03;
      g = x.createLinearGradient(px - cw, 0, px + cw, 0);
      g.addColorStop(0, '#8a5206'); g.addColorStop(0.3, '#ffe27a'); g.addColorStop(0.6, '#f0b12c'); g.addColorStop(1, '#8a5206');
      x.fillStyle = g; x.beginPath(); x.ellipse(px, py, cw, ch, 0, 0, 7); x.fill();
      x.strokeStyle = '#5a3000'; x.lineWidth = size * 0.012; x.stroke();
    }
    // Flecha curva hacia arriba
    x.strokeStyle = '#ffffff'; x.lineWidth = size * 0.07;
    x.beginPath(); x.moveTo(cx - r * 0.55, cy + r * 0.55); x.quadraticCurveTo(cx + r * 0.1, cy + r * 0.2, cx + r * 0.45, cy - r * 0.45); x.stroke();
    x.fillStyle = '#ffffff';
    x.beginPath(); x.moveTo(cx + r * 0.72, cy - r * 0.72); x.lineTo(cx + r * 0.15, cy - r * 0.55); x.lineTo(cx + r * 0.6, cy - r * 0.12); x.closePath(); x.fill();
    x.strokeStyle = '#2a7bff'; x.lineWidth = size * 0.02;
    x.beginPath(); x.moveTo(cx - r * 0.55, cy + r * 0.55); x.quadraticCurveTo(cx + r * 0.1, cy + r * 0.2, cx + r * 0.45, cy - r * 0.45); x.stroke();
  }
  // Reflejo
  g = x.createRadialGradient(cx - r * 0.35, cy - r * 0.45, 1, cx - r * 0.35, cy - r * 0.45, r * 0.5);
  g.addColorStop(0, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
  cache.set(key, c);
  return c;
}
