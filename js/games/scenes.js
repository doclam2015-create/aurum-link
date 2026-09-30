// Fondo vectorial de Espartaco Coloso (como la máquina): azul muy oscuro con bandas de greca
// romana, arco de bronce en la esquina y luz cálida. Se dibuja a la resolución de la pantalla.

function meander(x, y, W, u, color) {
  // greca continua: cada módulo es una espiral cuadrada
  x.save(); x.strokeStyle = color; x.lineWidth = Math.max(1.5, u * 0.14); x.lineJoin = 'miter';
  x.beginPath();
  for (let px = -u * 4; px < W + u * 4; px += u * 4) {
    x.moveTo(px, y + u * 3); x.lineTo(px, y); x.lineTo(px + u * 3, y); x.lineTo(px + u * 3, y + u * 2);
    x.lineTo(px + u, y + u * 2); x.lineTo(px + u, y + u); x.lineTo(px + u * 2, y + u); x.moveTo(px, y + u * 3); x.lineTo(px + u * 4, y + u * 3);
  }
  x.stroke();
  x.strokeStyle = color; x.lineWidth = Math.max(1, u * 0.08);
  x.beginPath(); x.moveTo(0, y - u * 0.7); x.lineTo(W, y - u * 0.7); x.moveTo(0, y + u * 3.7); x.lineTo(W, y + u * 3.7); x.stroke();
  x.restore();
}
export function spartaScene(x, X, Y, W, H, banner) {
  x.save(); x.beginPath(); x.rect(X, Y, W, H); x.clip(); x.translate(X, Y);
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0c1a38'); g.addColorStop(0.5, '#081228'); g.addColorStop(1, '#040814');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // bandas de greca en azul apagado
  const u = Math.max(4, Math.min(W, H) * (banner ? 0.022 : 0.012));
  for (let y = u * 2; y < H; y += u * 11) meander(x, y, W, u, 'rgba(70,120,200,0.28)');
  // luz cálida al centro y arco de bronce en la esquina superior izquierda
  const lg = x.createRadialGradient(W * 0.5, H * 0.45, 1, W * 0.5, H * 0.45, Math.max(W, H) * 0.6);
  lg.addColorStop(0, 'rgba(255,170,80,0.18)'); lg.addColorStop(1, 'rgba(255,170,80,0)'); x.fillStyle = lg; x.fillRect(0, 0, W, H);
  const r = Math.min(W, H) * (banner ? 0.75 : 0.5), bg = x.createLinearGradient(-r, 0, r, 0);
  bg.addColorStop(0, '#3a1e08'); bg.addColorStop(0.45, '#c88a3a'); bg.addColorStop(0.55, '#f0c070'); bg.addColorStop(1, '#5a3010');
  x.strokeStyle = bg; x.lineWidth = r * 0.12; x.beginPath(); x.arc(0, 0, r, 0, Math.PI / 2); x.stroke();
  x.strokeStyle = 'rgba(255,220,150,0.5)'; x.lineWidth = Math.max(1, r * 0.012); x.beginPath(); x.arc(0, 0, r - r * 0.06, 0, Math.PI / 2); x.stroke(); x.beginPath(); x.arc(0, 0, r + r * 0.06, 0, Math.PI / 2); x.stroke();
  // remaches en el arco
  x.fillStyle = '#ffe0a0'; for (let a = 0.08; a < Math.PI / 2; a += 0.16) { x.beginPath(); x.arc(Math.cos(a) * r, Math.sin(a) * r, r * 0.02, 0, 7); x.fill(); }
  const v = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)'); x.fillStyle = v; x.fillRect(0, 0, W, H);
  x.restore();
}
