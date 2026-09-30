// Escenarios vectoriales de los juegos colosales, dibujados en canvas a la resolución de la
// pantalla (nítidos a cualquier tamaño). Se pintan una sola vez en el fondo cacheado del juego.
//  · giantScene: cielo, nubes, castillo del gigante en las nubes, colinas, granja y la habichuela.
//  · spartaScene: atardecer, Coliseo con arcos, arena, columnas de mármol, cortinas y antorchas.

function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const lerp = (a, b, t) => a + (b - a) * t;
function grad(x, x0, y0, x1, y1, stops) { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach(([t, c]) => g.addColorStop(t, c)); return g; }

// ---------- Oro del Gigante ----------
function cloud(x, cx, cy, s, a = 1) {
  const puffs = [[-0.55, 0.12, 0.42], [-0.22, -0.12, 0.55], [0.18, -0.2, 0.62], [0.55, 0, 0.46], [0.02, 0.14, 0.5], [0.8, 0.16, 0.3], [-0.85, 0.2, 0.28]];
  x.save(); x.globalAlpha = a;
  x.fillStyle = 'rgba(120,160,210,0.45)';
  puffs.forEach(([dx, dy, r]) => { x.beginPath(); x.arc(cx + dx * s, cy + dy * s + s * 0.1, r * s, 0, 7); x.fill(); });
  puffs.forEach(([dx, dy, r]) => {
    const px = cx + dx * s, py = cy + dy * s, g = x.createRadialGradient(px - r * s * 0.3, py - r * s * 0.4, r * s * 0.1, px, py, r * s);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, '#f4f9ff'); g.addColorStop(1, '#d4e6f8');
    x.fillStyle = g; x.beginPath(); x.arc(px, py, r * s, 0, 7); x.fill();
  });
  x.restore();
}
function castle(x, cx, by, s) {
  const stone = grad(x, cx - s, 0, cx + s, 0, [[0, '#c8c0e8'], [0.5, '#f0ecff'], [1, '#a8a0d0']]);
  const roof = grad(x, 0, by - s * 1.6, 0, by - s * 0.8, [[0, '#8a6ae8'], [1, '#3a2a8a']]);
  const tower = (tx, w, h, rh) => {
    x.fillStyle = stone; x.fillRect(tx - w / 2, by - h, w, h);
    x.strokeStyle = 'rgba(80,70,140,0.35)'; x.lineWidth = s * 0.012;
    for (let yy = by - h + s * 0.08; yy < by; yy += s * 0.08) { x.beginPath(); x.moveTo(tx - w / 2, yy); x.lineTo(tx + w / 2, yy); x.stroke(); }
    x.fillStyle = roof; x.beginPath(); x.moveTo(tx - w * 0.62, by - h); x.lineTo(tx, by - h - rh); x.lineTo(tx + w * 0.62, by - h); x.closePath(); x.fill();
    x.fillStyle = '#e83a3a'; x.beginPath(); x.moveTo(tx, by - h - rh); x.lineTo(tx, by - h - rh - s * 0.18); x.lineTo(tx + s * 0.14, by - h - rh - s * 0.13); x.lineTo(tx, by - h - rh - s * 0.09); x.fill();
    x.strokeStyle = '#5a4a3a'; x.lineWidth = s * 0.015; x.beginPath(); x.moveTo(tx, by - h - rh); x.lineTo(tx, by - h - rh - s * 0.18); x.stroke();
    x.fillStyle = '#2a1a4a'; x.beginPath(); x.ellipse(tx, by - h * 0.62, w * 0.14, w * 0.22, 0, 0, 7); x.fill();
    x.fillStyle = 'rgba(255,220,120,0.9)'; x.beginPath(); x.ellipse(tx, by - h * 0.6, w * 0.08, w * 0.12, 0, 0, 7); x.fill();
  };
  // muralla con almenas
  x.fillStyle = stone; x.fillRect(cx - s * 0.9, by - s * 0.45, s * 1.8, s * 0.45);
  for (let i = 0; i < 9; i++) x.fillRect(cx - s * 0.9 + i * s * 0.2, by - s * 0.53, s * 0.11, s * 0.09);
  x.fillStyle = '#3a2a5a'; x.beginPath(); x.moveTo(cx - s * 0.14, by); x.lineTo(cx - s * 0.14, by - s * 0.22); x.arc(cx, by - s * 0.22, s * 0.14, Math.PI, 0); x.lineTo(cx + s * 0.14, by); x.fill();
  tower(cx - s * 0.78, s * 0.3, s * 0.95, s * 0.5); tower(cx + s * 0.78, s * 0.3, s * 0.95, s * 0.5);
  tower(cx - s * 0.36, s * 0.34, s * 1.25, s * 0.6); tower(cx + s * 0.36, s * 0.34, s * 1.25, s * 0.6);
  tower(cx, s * 0.42, s * 1.6, s * 0.75);
}
function hill(x, W, y0, amp, k, ph, c1, c2, H) {
  x.beginPath(); x.moveTo(0, H);
  for (let i = 0; i <= 60; i++) { const t = i / 60, px = t * W; x.lineTo(px, y0 + Math.sin(t * k + ph) * amp + Math.sin(t * k * 2.3 + ph * 1.7) * amp * 0.35); }
  x.lineTo(W, H); x.closePath(); x.fillStyle = grad(x, 0, y0 - amp, 0, H, [[0, c1], [1, c2]]); x.fill();
}
function tree(x, tx, ty, s, c) {
  x.fillStyle = '#5a3a1a'; x.fillRect(tx - s * 0.06, ty - s * 0.3, s * 0.12, s * 0.3);
  [[0, -0.55, 0.32], [-0.2, -0.4, 0.24], [0.2, -0.42, 0.25], [0, -0.75, 0.22]].forEach(([dx, dy, r]) => {
    const g = x.createRadialGradient(tx + dx * s - r * s * 0.3, ty + dy * s - r * s * 0.4, 1, tx + dx * s, ty + dy * s, r * s);
    g.addColorStop(0, c[0]); g.addColorStop(1, c[1]); x.fillStyle = g; x.beginPath(); x.arc(tx + dx * s, ty + dy * s, r * s, 0, 7); x.fill();
  });
}
function farmhouse(x, hx, hy, s) {
  // paredes con entramado de madera
  x.fillStyle = grad(x, hx, 0, hx + s, 0, [[0, '#f6e6c4'], [1, '#d8c098']]); x.fillRect(hx, hy - s * 0.5, s, s * 0.5);
  x.strokeStyle = '#6a3a14'; x.lineWidth = s * 0.03; x.strokeRect(hx, hy - s * 0.5, s, s * 0.5);
  [[0.33, 0], [0.66, 0]].forEach(([t]) => { x.beginPath(); x.moveTo(hx + s * t, hy - s * 0.5); x.lineTo(hx + s * t, hy); x.stroke(); });
  x.beginPath(); x.moveTo(hx, hy - s * 0.25); x.lineTo(hx + s, hy - s * 0.25); x.stroke();
  // techo de paja
  x.fillStyle = grad(x, 0, hy - s * 0.95, 0, hy - s * 0.45, [[0, '#f0c870'], [1, '#a8742a']]);
  x.beginPath(); x.moveTo(hx - s * 0.12, hy - s * 0.46); x.quadraticCurveTo(hx + s * 0.1, hy - s * 0.98, hx + s * 0.5, hy - s * 0.98); x.quadraticCurveTo(hx + s * 0.9, hy - s * 0.98, hx + s * 1.12, hy - s * 0.46); x.closePath(); x.fill();
  x.strokeStyle = 'rgba(110,70,20,0.45)'; x.lineWidth = s * 0.012;
  for (let i = 1; i < 14; i++) { const t = i / 14; x.beginPath(); x.moveTo(hx - s * 0.12 + t * s * 1.24, hy - s * 0.47); x.lineTo(hx + s * 0.1 + t * s * 0.8, hy - s * 0.92); x.stroke(); }
  // chimenea, puerta y ventanas
  x.fillStyle = '#8a5a3a'; x.fillRect(hx + s * 0.72, hy - s * 1.05, s * 0.1, s * 0.25);
  x.fillStyle = '#6a3a14'; x.fillRect(hx + s * 0.42, hy - s * 0.3, s * 0.16, s * 0.3);
  x.fillStyle = '#ffe07a'; [[0.12], [0.76]].forEach(([t]) => { x.fillRect(hx + s * t, hy - s * 0.4, s * 0.13, s * 0.11); });
  x.strokeStyle = '#6a3a14'; x.lineWidth = s * 0.018; [[0.12], [0.76]].forEach(([t]) => { x.strokeRect(hx + s * t, hy - s * 0.4, s * 0.13, s * 0.11); });
}
function leaf(x, lx, ly, ang, s) {
  x.save(); x.translate(lx, ly); x.rotate(ang);
  x.fillStyle = grad(x, 0, -s * 0.6, s * 1.6, s * 0.6, [[0, '#b8f070'], [0.5, '#5ac83a'], [1, '#1e7a1a']]);
  x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(s * 0.3, -s * 0.9, s * 1.5, -s * 0.8, s * 1.7, 0); x.bezierCurveTo(s * 1.5, s * 0.8, s * 0.3, s * 0.9, 0, 0); x.fill();
  x.strokeStyle = 'rgba(20,90,20,0.7)'; x.lineWidth = s * 0.07; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(s * 0.8, -s * 0.05, s * 1.6, 0); x.stroke();
  x.lineWidth = s * 0.035; for (let i = 1; i < 4; i++) { const t = i / 4; x.beginPath(); x.moveTo(s * 1.6 * t, 0); x.lineTo(s * 1.6 * t + s * 0.25, -s * 0.35 * (1 - t * 0.4)); x.moveTo(s * 1.6 * t, 0); x.lineTo(s * 1.6 * t + s * 0.25, s * 0.35 * (1 - t * 0.4)); x.stroke(); }
  x.restore();
}
function beanstalk(x, x0, y0, x1, y1, u) {
  const P = (t, ph) => [lerp(x0, x1, t) + Math.sin(t * Math.PI * 3.2 + ph) * u * 0.07 * (1 - t * 0.4), lerp(y0, y1, t)];
  [[0, '#1e6a14', '#5ac83a', 0.055], [2.2, '#2a8a1e', '#8ae05a', 0.035]].forEach(([ph, c1, c2, w]) => {
    for (let i = 0; i < 80; i++) {
      const t = i / 80, a = P(t, ph), b = P((i + 1.2) / 80, ph), lw = u * w * (1 - t * 0.65);
      x.strokeStyle = c1; x.lineWidth = lw; x.lineCap = 'round'; x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke();
      x.strokeStyle = c2; x.lineWidth = lw * 0.35; x.beginPath(); x.moveTo(a[0] - lw * 0.18, a[1]); x.lineTo(b[0] - lw * 0.18, b[1]); x.stroke();
    }
  });
  for (let i = 1; i < 12; i++) {
    const t = i / 12.5, [px, py] = P(t, 0), side = i % 2 ? 1 : -1, s = u * 0.075 * (1 - t * 0.45);
    leaf(x, px, py, side > 0 ? -0.35 : Math.PI + 0.35, s);
    // zarcillo en espiral
    x.strokeStyle = '#4aa82a'; x.lineWidth = Math.max(1, u * 0.006); x.beginPath();
    for (let k = 0; k < 30; k++) { const a = k * 0.4, r = s * 0.5 * (1 - k / 30); x.lineTo(px - side * s * 0.3 + Math.cos(a) * r * -side, py - s * 0.4 + Math.sin(a) * r); }
    x.stroke();
  }
}
export function giantScene(x, X, Y, W, H) {
  x.save(); x.beginPath(); x.rect(X, Y, W, H); x.clip(); x.translate(X, Y);
  const R = rng(11), u = Math.min(W, H * 1.6), hz = H * 0.66;
  x.fillStyle = grad(x, 0, 0, 0, hz, [[0, '#2a86dc'], [0.55, '#86ccff'], [1, '#e6f7ff']]); x.fillRect(0, 0, W, H);
  // sol
  const sg = x.createRadialGradient(W * 0.1, H * 0.08, 1, W * 0.1, H * 0.08, u * 0.35); sg.addColorStop(0, 'rgba(255,255,220,1)'); sg.addColorStop(0.2, 'rgba(255,245,180,0.7)'); sg.addColorStop(1, 'rgba(255,245,180,0)');
  x.fillStyle = sg; x.fillRect(0, 0, W, H);
  // nubes lejanas
  for (let i = 0; i < 7; i++) cloud(x, R() * W, H * (0.08 + R() * 0.3), u * (0.05 + R() * 0.05), 0.75);
  // castillo del gigante sobre una gran nube
  const cx = W * 0.72, cs = Math.min(u * 0.13, H * 0.16), cy = Math.max(H * 0.42, cs * 2.3);
  cloud(x, cx - cs * 1.2, cy + cs * 0.45, cs * 0.7); cloud(x, cx + cs * 1.25, cy + cs * 0.5, cs * 0.65);
  castle(x, cx, cy + cs * 0.1, cs);
  cloud(x, cx, cy + cs * 0.55, cs * 1.1);
  // colinas
  hill(x, W, hz - H * 0.05, H * 0.035, 5, 1, '#b8e0b0', '#8cc890', H);
  for (let i = 0; i < 14; i++) tree(x, R() * W, hz - H * 0.03 + R() * H * 0.03, u * 0.035, ['#6ab85a', '#2a6a2a']);
  hill(x, W, hz + H * 0.04, H * 0.04, 4, 2.4, '#8ad85a', '#4aa02a', H);
  // surcos de los campos
  x.strokeStyle = 'rgba(40,110,20,0.25)'; x.lineWidth = Math.max(1, u * 0.004);
  for (let i = 0; i < 10; i++) { const yy = hz + H * 0.08 + i * H * 0.025; x.beginPath(); x.moveTo(W * 0.4, yy); x.quadraticCurveTo(W * 0.7, yy - H * 0.02, W, yy + H * 0.01); x.stroke(); }
  // granja y árboles
  farmhouse(x, W * 0.08, hz + H * 0.12, u * 0.2);
  tree(x, W * 0.04, hz + H * 0.13, u * 0.09, ['#5ab84a', '#1e5a1e']); tree(x, W * 0.33, hz + H * 0.11, u * 0.07, ['#6ac85a', '#2a6a2a']);
  // la habichuela sube hasta el castillo
  beanstalk(x, W * 0.52, H + u * 0.02, cx - cs * 0.3, cy + cs * 0.7, u);
  hill(x, W, H * 0.9, H * 0.025, 6, 0.6, '#5ac83a', '#2a7a1a', H);
  // flores del primer plano
  for (let i = 0; i < 40; i++) { const fx = R() * W, fy = H * 0.9 + R() * H * 0.09, r = u * (0.004 + R() * 0.005); x.fillStyle = ['#ff5a7a', '#ffe04a', '#ffffff', '#ff9a3a'][i % 4]; x.beginPath(); x.arc(fx, fy, r, 0, 7); x.fill(); }
  x.restore();
}

// ---------- Espartaco Coloso ----------
function colosseum(x, cx, by, w, h) {
  const tiers = [0.3, 0.27, 0.25], attic = 0.18, N = 17;
  let y = by;
  const stoneG = (y0, y1) => grad(x, 0, y0, 0, y1, [[0, '#f4c080'], [1, '#b8703a']]);
  // cada piso: franja curva (los extremos bajan un poco, como un óvalo visto de frente)
  const curve = t => Math.pow(t, 2) * h * 0.06;
  tiers.forEach((th, k) => {
    const hh = h * th, y0 = y - hh;
    x.fillStyle = stoneG(y0, y);
    x.beginPath(); for (let i = 0; i <= 40; i++) { const t = i / 40 * 2 - 1; x.lineTo(cx + t * w / 2, y0 + curve(t)); } for (let i = 40; i >= 0; i--) { const t = i / 40 * 2 - 1; x.lineTo(cx + t * w / 2, y + curve(t)); } x.fill();
    for (let i = 0; i < N; i++) {
      const a0 = -Math.PI / 2 + (i + 0.5) / N * Math.PI, t = Math.sin(a0), aw = Math.cos(a0) * w / N * 1.25 * 0.62;
      const ax = cx + t * w / 2, ay1 = y + curve(t) - hh * 0.08, ah = hh * 0.7;
      if (aw < 1.5) continue;
      x.fillStyle = grad(x, 0, ay1 - ah, 0, ay1, [[0, '#4a1a08'], [1, '#8a3a10']]);
      x.beginPath(); x.moveTo(ax - aw / 2, ay1); x.lineTo(ax - aw / 2, ay1 - ah + aw / 2); x.arc(ax, ay1 - ah + aw / 2, aw / 2, Math.PI, 0); x.lineTo(ax + aw / 2, ay1); x.fill();
      x.fillStyle = 'rgba(255,190,90,0.35)'; x.fillRect(ax - aw * 0.12, ay1 - ah * 0.5, aw * 0.24, ah * 0.5);
      x.strokeStyle = 'rgba(255,230,180,0.5)'; x.lineWidth = Math.max(1, aw * 0.08); x.beginPath(); x.moveTo(ax + aw * 0.75, ay1); x.lineTo(ax + aw * 0.75, ay1 - hh * 0.8); x.stroke();
    }
    x.fillStyle = 'rgba(255,235,190,0.8)'; x.beginPath(); for (let i = 0; i <= 40; i++) { const t = i / 40 * 2 - 1; x.lineTo(cx + t * w / 2, y0 + curve(t)); } for (let i = 40; i >= 0; i--) { const t = i / 40 * 2 - 1; x.lineTo(cx + t * w / 2, y0 + curve(t) + hh * 0.06); } x.fill();
    y = y0;
  });
  // ático con ventanas rectangulares
  const hh = h * attic, y0 = y - hh;
  x.fillStyle = stoneG(y0, y); x.beginPath(); for (let i = 0; i <= 40; i++) { const t = i / 40 * 2 - 1; x.lineTo(cx + t * w / 2, y0 + curve(t)); } for (let i = 40; i >= 0; i--) { const t = i / 40 * 2 - 1; x.lineTo(cx + t * w / 2, y + curve(t)); } x.fill();
  for (let i = 0; i < N; i += 2) { const a0 = -Math.PI / 2 + (i + 0.5) / N * Math.PI, t = Math.sin(a0), aw = Math.cos(a0) * w / N * 0.5; if (aw < 1) continue; x.fillStyle = '#5a2208'; x.fillRect(cx + t * w / 2 - aw / 2, y0 + curve(t) + hh * 0.35, aw, hh * 0.3); }
}
function column(x, px, top, bot, w) {
  x.fillStyle = grad(x, px, 0, px + w, 0, [[0, '#8a7458'], [0.25, '#fff6e6'], [0.5, '#e8d8bc'], [0.8, '#b8a080'], [1, '#6a5438']]);
  x.fillRect(px, top + w * 0.35, w, bot - top - w * 0.6);
  x.strokeStyle = 'rgba(90,70,40,0.35)'; x.lineWidth = Math.max(1, w * 0.03);
  for (let i = 1; i < 6; i++) { x.beginPath(); x.moveTo(px + w * i / 6, top + w * 0.4); x.lineTo(px + w * i / 6, bot - w * 0.3); x.stroke(); }
  const cap = grad(x, 0, top, 0, top + w * 0.4, [[0, '#fff6e6'], [1, '#a88a60']]);
  x.fillStyle = cap; x.fillRect(px - w * 0.2, top, w * 1.4, w * 0.18); x.fillRect(px - w * 0.1, top + w * 0.18, w * 1.2, w * 0.18);
  x.beginPath(); x.arc(px - w * 0.1, top + w * 0.27, w * 0.12, 0, 7); x.arc(px + w * 1.1, top + w * 0.27, w * 0.12, 0, 7); x.fill();
  x.fillStyle = cap; x.fillRect(px - w * 0.15, bot - w * 0.3, w * 1.3, w * 0.3);
}
function torch(x, tx, ty, s) {
  x.fillStyle = grad(x, tx - s, 0, tx + s, 0, [[0, '#6a3a0a'], [0.5, '#f0c050'], [1, '#6a3a0a']]);
  x.beginPath(); x.moveTo(tx - s * 0.5, ty); x.lineTo(tx + s * 0.5, ty); x.lineTo(tx + s * 0.25, ty + s * 0.5); x.lineTo(tx - s * 0.25, ty + s * 0.5); x.fill();
  x.fillRect(tx - s * 0.08, ty + s * 0.5, s * 0.16, s * 1.2);
  const g = x.createRadialGradient(tx, ty - s * 0.3, 1, tx, ty - s * 0.2, s * 2.2); g.addColorStop(0, 'rgba(255,220,120,0.55)'); g.addColorStop(1, 'rgba(255,120,30,0)');
  x.fillStyle = g; x.beginPath(); x.arc(tx, ty - s * 0.2, s * 2.2, 0, 7); x.fill();
  [['#ff5a1a', 1], ['#ffb02a', 0.7], ['#fff2a0', 0.4]].forEach(([c, k]) => {
    x.fillStyle = c; x.beginPath(); x.moveTo(tx - s * 0.45 * k, ty); x.quadraticCurveTo(tx - s * 0.5 * k, ty - s * 0.7 * k, tx, ty - s * 1.4 * k); x.quadraticCurveTo(tx + s * 0.5 * k, ty - s * 0.7 * k, tx + s * 0.45 * k, ty); x.fill();
  });
}
function curtain(x, W, H, left) {
  const sx = left ? 0 : W, dir = left ? 1 : -1, gx = W * 0.2, gy = H * 0.62, top = H * 0.04;
  x.save();
  x.beginPath(); x.moveTo(sx, 0); x.lineTo(sx + dir * W * 0.3, 0);
  x.bezierCurveTo(sx + dir * W * 0.26, H * 0.2, sx + dir * gx * 1.1, gy * 0.6, sx + dir * gx * 0.55, gy);
  x.quadraticCurveTo(sx + dir * gx * 0.5, gy + H * 0.2, sx + dir * gx * 0.3, H); x.lineTo(sx, H); x.closePath();
  const g = x.createLinearGradient(sx, 0, sx + dir * W * 0.3, 0);
  for (let i = 0; i <= 10; i++) g.addColorStop(i / 10, i % 2 ? '#d8303a' : '#6a0610');
  x.fillStyle = g; x.fill();
  x.strokeStyle = '#f5c040'; x.lineWidth = Math.max(2, W * 0.006); x.stroke();
  // cordón y borla dorada
  const tx = sx + dir * gx * 0.6, ty = gy;
  x.strokeStyle = '#ffd060'; x.lineWidth = Math.max(2, W * 0.008); x.beginPath(); x.moveTo(sx, ty - H * 0.02); x.quadraticCurveTo(tx - dir * W * 0.02, ty + H * 0.03, tx, ty); x.stroke();
  x.fillStyle = grad(x, tx - 10, 0, tx + 10, 0, [[0, '#a8700a'], [0.5, '#fff0a0'], [1, '#a8700a']]);
  const ts = Math.max(8, W * 0.02); x.beginPath(); x.arc(tx, ty, ts * 0.45, 0, 7); x.fill();
  x.beginPath(); x.moveTo(tx - ts * 0.35, ty + ts * 0.3); x.lineTo(tx + ts * 0.35, ty + ts * 0.3); x.lineTo(tx + ts * 0.55, ty + ts * 1.6); x.lineTo(tx - ts * 0.55, ty + ts * 1.6); x.fill();
  x.restore();
  void top;
}
function valance(x, W, H) {
  const n = Math.max(4, Math.round(W / 140)), sw = W / n, d = Math.min(H * 0.12, sw * 0.4);
  for (let i = 0; i < n; i++) {
    const a = i * sw;
    x.fillStyle = grad(x, 0, 0, 0, d * 1.2, [[0, '#5a0408'], [0.6, '#c82a30'], [1, '#8a0a14']]);
    x.beginPath(); x.moveTo(a, 0); x.lineTo(a + sw, 0); x.lineTo(a + sw, d * 0.3); x.quadraticCurveTo(a + sw / 2, d * 1.4, a, d * 0.3); x.closePath(); x.fill();
    x.strokeStyle = '#f5c040'; x.lineWidth = Math.max(2, W * 0.005); x.beginPath(); x.moveTo(a + sw, d * 0.3); x.quadraticCurveTo(a + sw / 2, d * 1.4, a, d * 0.3); x.stroke();
  }
}
export function spartaScene(x, X, Y, W, H) {
  x.save(); x.beginPath(); x.rect(X, Y, W, H); x.clip(); x.translate(X, Y);
  const hz = H * 0.7, u = Math.min(W, H * 1.6);
  x.fillStyle = grad(x, 0, 0, 0, hz, [[0, '#2a0614'], [0.35, '#8a1e1a'], [0.7, '#e8641e'], [1, '#ffc060']]); x.fillRect(0, 0, W, H);
  const sg = x.createRadialGradient(W * 0.5, hz * 0.92, 1, W * 0.5, hz * 0.92, u * 0.5); sg.addColorStop(0, 'rgba(255,245,200,1)'); sg.addColorStop(0.12, 'rgba(255,220,130,0.8)'); sg.addColorStop(1, 'rgba(255,160,60,0)');
  x.fillStyle = sg; x.fillRect(0, 0, W, H);
  // rayos de luz
  x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.08; x.fillStyle = '#ffe0a0';
  for (let i = 0; i < 9; i++) { const a = -Math.PI * 0.95 + i * Math.PI * 0.11; x.beginPath(); x.moveTo(W * 0.5, hz * 0.92); x.lineTo(W * 0.5 + Math.cos(a) * u * 1.5, hz * 0.92 + Math.sin(a) * u * 1.5); x.lineTo(W * 0.5 + Math.cos(a + 0.05) * u * 1.5, hz * 0.92 + Math.sin(a + 0.05) * u * 1.5); x.fill(); }
  x.restore();
  colosseum(x, W * 0.5, hz, W * 0.86, H * 0.5);
  // muro del podio y arena
  x.fillStyle = grad(x, 0, hz, 0, hz + H * 0.06, [[0, '#6a2a10'], [1, '#3a1406']]); x.fillRect(0, hz, W, H * 0.06);
  for (let i = 0; i < 10; i++) { const bx = W * (i + 0.5) / 10; x.fillStyle = i % 2 ? '#b8231a' : '#d8a020'; x.fillRect(bx - W * 0.012, hz, W * 0.024, H * 0.045); }
  x.fillStyle = grad(x, 0, hz + H * 0.06, 0, H, [[0, '#f0c078'], [1, '#9a5a24']]); x.fillRect(0, hz + H * 0.06, W, H);
  x.strokeStyle = 'rgba(120,60,20,0.25)'; x.lineWidth = Math.max(1, u * 0.003);
  for (let i = 1; i < 6; i++) { const yy = hz + H * 0.06 + (H * 0.24) * Math.pow(i / 6, 1.5); x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke(); }
  // columnas, antorchas y cortinas
  const cw = Math.max(14, W * 0.055);
  column(x, W * 0.035, H * 0.16, H * 0.98, cw); column(x, W - W * 0.035 - cw, H * 0.16, H * 0.98, cw);
  torch(x, W * 0.035 + cw / 2, H * 0.1, cw * 0.55); torch(x, W - W * 0.035 - cw / 2, H * 0.1, cw * 0.55);
  curtain(x, W, H, true); curtain(x, W, H, false);
  valance(x, W, H);
  x.restore();
}
