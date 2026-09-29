import { sfx, usableVoices } from './audio.js?v=57';
import { loadAtlas, clearSpriteCache, Particles, goldText, ease, glow, clamp, FONT, rand } from './gfx.js?v=57';
import { sleep } from './reels.js?v=57';
import XLink from './games/xlink.js?v=57';
import Avalanche from './games/avalanche.js?v=57';
import FireWheel from './games/firewheel.js?v=57';
import Legion from './games/legion.js?v=57';
import Bull from './games/bull.js?v=57';
import Dragon from './games/dragon.js?v=57';
import Codex from './games/codex.js?v=57';
import Reef from './games/reef.js?v=57';
import Western from './games/western.js?v=57';
import Galaxy from './games/galaxy.js?v=57';
import { RedDream, SnowKingdom, loadThemeArt, sheetIconStyle } from './games/xthemes.js?v=57';
import Wolf, { loadWolfArt } from './games/wolf.js?v=57';

const GAMES = [XLink, RedDream, SnowKingdom, Wolf, Avalanche, FireWheel, Legion, Bull, Dragon, Codex, Reef, Western, Galaxy];
const BETS = [10, 20, 30, 50, 100, 200, 500];
const $ = id => document.getElementById(id);
const fmt = n => '$' + Math.round(n).toLocaleString('es-CL');
const SAVE_KEY = 'aurumlink.v2';
const VERSION = (new URL(import.meta.url).searchParams.get('v')) || 'dev';
const SPEEDS = [0.5, 0.75, 1, 1.5, 2, 3];
// Jackpots progresivos comunes a todos los juegos (múltiplos de la apuesta; crecen con cada giro)
// grow: cuánto sube cada pozo por jugada pagada (en apuestas). Con 100 jugadas el GRAND crece ~12 %
// y los demás ~30 %; al cobrarse vuelven a su base.
export const JACKPOTS = [
  { key: 'grand', label: 'GRAND', base: 1000, grow: 1.2, cls: 'grand', color: '#ff4a3a', level: 3 },
  { key: 'major', label: 'MAJOR', base: 100, grow: 0.35, cls: 'major', color: '#d77aff', level: 2 },
  { key: 'minor', label: 'MINOR', base: 30, grow: 0.1, cls: 'minor', color: '#5ad8ff', level: 1 },
  { key: 'mini', label: 'MINI', base: 15, grow: 0.05, cls: 'mini', color: '#5dff7a', level: 0 }
];

const state = {
  balance: 10000, betIdx: 2, game: null, sound: true, music: true, speed: 1, light: false, sfxVol: 0.9, musicVol: 0.55, jp: {}, stats: { spins: 0, bet: 0, won: 0, best: 0 }
};
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
  if (s && typeof s.balance === 'number' && isFinite(s.balance)) Object.assign(state, s);
} catch (e) { /* almacenamiento no disponible */ }
state.betIdx = clamp(state.betIdx | 0, 0, BETS.length - 1);
if (state.turbo) { state.speed = 2; delete state.turbo; }
if (!SPEEDS.includes(state.speed)) state.speed = 1;
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { } }

// ---------- Canvas ----------
const stage = $('stage'), gctx = stage.getContext('2d', { alpha: true });
const fxc = $('fx'), fctx = fxc.getContext('2d');
let DPR = Math.min(window.devicePixelRatio || 1, 2);
let W = 0, H = 0, FW = 0, FH = 0, boardRect = { left: 0, top: 0 };

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  const b = $('board').getBoundingClientRect();
  boardRect = b;
  W = Math.floor(b.width); H = Math.floor(b.height);
  stage.width = Math.round(W * DPR); stage.height = Math.round(H * DPR);
  stage.style.width = W + 'px'; stage.style.height = H + 'px';
  FW = window.innerWidth; FH = window.innerHeight;
  fxc.width = Math.round(FW * DPR); fxc.height = Math.round(FH * DPR);
  fxc.style.width = FW + 'px'; fxc.style.height = FH + 'px';
  clearSpriteCache();
  if (game) game.resize(W, H, DPR);
}

// ---------- App API expuesta a los juegos ----------
const fx = new Particles();
let game = null, busy = false, autoLeft = 0, overlay = null, flashA = 0, flashColor = '#fff', skipReq = false;
const meter = { win: 0, winShown: 0, credit: state.balance, creditShown: state.balance };

const app = {
  sfx, fx, fmt,
  get dpr() { return DPR; },
  get speed() { return state.speed; },
  get turbo() { return state.speed >= 2; },
  get light() { return state.light; },
  get auto() { return autoLeft > 0; },
  get bet() { return BETS[state.betIdx]; },
  get skip() { return skipReq; },
  message(t) { $('msg').innerHTML = t || ''; },
  // Cada premio suma al medidor y lanza monedas (se agrupan por cuadro, ver coinShower)
  addWin(v) { meter.win += v; if (v > 0) coinQ.win += v; },
  toFx(x, y) { return [boardRect.left + x, boardRect.top + y]; },
  winTarget() { const r = $('win').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; },
  // Monedas que vuelan desde el tablero al medidor de premio
  // (marca desde dónde salen las monedas del premio; si no hubo premio, lanza n monedas)
  flyCoins(x, y, n = 6) { coinQ.origin = app.toFx(x, y); coinQ.n = Math.max(coinQ.n, n); },
  // Rayo desde un punto del tablero hasta el medidor de premio (cobro de bolas)
  boltToWin(x, y, color = '#9fe8ff', w = 6) {
    const [a, b] = app.toFx(x, y), [tx, ty] = app.winTarget();
    // rayo principal grueso + dos hilos secundarios
    fx.add({ type: 'bolt', x1: a, y1: b, x2: tx, y2: ty, life: 0.45, w, color });
    fx.add({ type: 'bolt', x1: a, y1: b, x2: tx + rand(-14, 14), y2: ty, life: 0.3, w: w * 0.45, color });
    fx.add({ type: 'bolt', x1: a, y1: b, x2: tx + rand(-24, 24), y2: ty + rand(-8, 8), life: 0.22, w: w * 0.3, color: '#ffffff' });
    fx.burst(a, b, 12, { type: 'spark', color, speed: 300, size: 12 });
    fx.burst(tx, ty, 8, { color: '#fff4b0', speed: 220, size: 8 });
    fx.add({ type: 'ring', x: tx, y: ty, size: 6, grow: 60, width: 5, life: 0.4, color });
    const el = $('win'); el.classList.remove('zap'); void el.offsetWidth; el.classList.add('zap');
  },
  burst(x, y, n, opts) { const [a, b] = app.toFx(x, y); fx.burst(a, b, n, opts); },
  popText(x, y, text, size = 28, colors) { const [a, b] = app.toFx(x, y); fx.add({ type: 'text', text, x: a, y: b, life: 1.2, size, colors }); },
  flash(color = '#fff', a = 0.8) { flashColor = color; flashA = a; },
  // Parafernalia de la máquina al pagar: marquesina de ampolletas, reflectores, confeti y fuegos artificiales.
  // lvl 0 premio chico · 1 mediano · 2 BIG · 3 AWESOME · 4 SUPER
  party(lvl, dur) {
    party.lvl = Math.max(party.t < party.dur ? party.lvl : 0, lvl);
    party.dur = Math.max(party.dur - party.t, dur); party.t = 0;
    const m = $('win').parentNode; m.classList.add('hot'); m.style.setProperty('--hot', PARTY_COL[Math.min(4, party.lvl)][0]);
  },
  shake(strong) {
    const el = $('board'); el.classList.remove('shake', 'shake2'); void el.offsetWidth; el.classList.add(strong ? 'shake2' : 'shake');
  },
  jackpot(key) {
    const d = JACKPOTS.find(j => j.key === key); if (!d) return 0;
    return app.bet * (d.base + ((state.jp[game.id] && state.jp[game.id][key]) || 0));
  },
  // Entrega un jackpot con toda la ceremonia y lo reinicia. Devuelve el monto.
  async awardJackpot(key) {
    const d = JACKPOTS.find(j => j.key === key); if (!d) return 0;
    const v = app.jackpot(key);
    app.highlightPot(key); sfx.jackpot(d.level); app.flash(d.color, 0.6); app.shake(d.level >= 2);
    app.party(2 + d.level * 0.7 | 0, 2.5 + d.level * 0.7);
    setTimeout(() => sfx.announce([[d.label.charAt(0) + d.label.slice(1).toLowerCase() + ' jackpot!', 1.2, 0.8], ['Jackpot!', 1.3, 0.8]]), 500);
    await showOverlay({ kind: 'banner', title: d.label, sub: '¡JACKPOT! ' + fmt(v), color: d.color, dur: 1800 + d.level * 700, t: 0, jp: true });
    app.resetJackpot(key);
    app.addWin(v);
    return v;
  },
  resetJackpot(key) { if (state.jp[game.id]) state.jp[game.id][key] = 0; renderPots(true); },
  highlightPot(key) { const el = document.querySelector('.pot[data-k="' + key + '"]'); if (el) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); } },
  banner(title, sub, opts = {}) {
    // Entrada a bono con parafernalia y locutor; los "+N GIROS" (reactivación) son una versión corta
    const more = /^\+/.test(title);
    if (opts.voice !== false) {
      sfx.bonusFanfare(!more);
      app.party(more ? 1 : 3, (opts.ms || 2200) / 1000 + (more ? 0.4 : 1.2));
      const lines = more ? [['¡Bono!', 1.2, 0.8], [speakable(title) + '!', 1.2, 0.9]] : [['¡Bono!', 1.2, 0.8], ['¡Bono!', 1.3, 0.85], [speakable(title) + '!', 1.15, 0.9]];
      if (sub) lines.push([speakable(sub), 1.05, 0.95]);
      setTimeout(() => sfx.announce(lines, 'es', { sfx: false }), more ? 250 : 1100);
    }
    return showOverlay({ kind: 'banner', title, sub, color: opts.color || '#ffd35a', dur: opts.ms || 2200, t: 0 });
  },
  // Pago base al activar un bono o giros gratis, según cuántos símbolos de bono hay en pantalla:
  // el mínimo que lo activa paga 2×, uno más 10×, dos más 50×, tres o más 100× la apuesta
  async bonusPay(n, bet, name, min = 3) {
    const k = n - min; if (k < 0) return 0;
    const v = [2, 10, 50, 100][Math.min(3, k)] * bet;
    app.addWin(v); sfx.win(2);
    app.popText(W / 2, H * 0.45, n + ' ' + name + ' · ' + fmt(v), 26);
    app.message('<b>' + n + ' ' + name + '</b> pagan <b>' + fmt(v) + '</b>');
    await app.wait(1200);
    return v;
  },
  // Anuncio de premio: BIG WIN (5×) · AWESOME (15×) · SUPER WIN (40×), con monedas, fanfarria y voz
  celebrate(amount, bet, label) {
    // El cartel parte en BIG WIN y va subiendo de categoría a medida que cuenta (como en los casinos)
    const ratio = amount / bet, ti = TIERS.findIndex(tt => ratio >= tt[0]), fi = ti < 0 ? TIERS.length - 1 : ti;
    const steps = TIERS.length - 1 - fi, start = label ? fi : TIERS.length - 1, tier = TIERS[start];
    sfx.bigWin(TIERS.length - start); setTimeout(() => sfx.announce(tier[3]), 550);
    const dur = (label ? Math.max(4.5, TIERS[fi][4]) : TIERS[fi][4]) + (label ? 0 : steps * 1.3);
    app.party(2 + (TIERS.length - 1 - fi), dur + 0.8);
    return showOverlay({ kind: 'big', amount, bet, label, tier, ti: start, t: 0, dur });
  },
  setSpinLabel(t, sub) { $('spinLabel').textContent = t; $('spinSub').textContent = sub || ''; },
  wait(ms) { return sleep(ms / state.speed); },
  // Rayo que cae desde arriba sobre un punto del tablero
  strike(x, y, color = '#9feaff') {
    const [a, b] = app.toFx(x, y);
    fx.add({ type: 'bolt', x1: a + rand(-60, 60), y1: -10, x2: a, y2: b, life: 0.5, w: 2.8, color });
    fx.burst(a, b, 16, { type: 'spark', color, speed: 320, size: 11 });
    fx.add({ type: 'ring', x: a, y: b, size: 8, grow: 70, width: 6, life: 0.45, color });
    sfx.zap(0.4, 0.3); sfx.tone(90, 0.3, { vol: 0.35, slide: 0.5 });
  },
  // Presentación del BONO SORPRESA (aleatorio en cualquier giro pagado)
  async mysteryIntro(sub) {
    sfx.thunder(0.9); sfx.siren(1.2);
    app.flash('#d8f6ff', 0.85); app.shake(true);
    for (let i = 0; i < 5; i++) fx.add({ type: 'bolt', x1: rand(0, FW), y1: -10, x2: rand(0, FW), y2: rand(FH * 0.3, FH * 0.8), life: 0.6 + i * 0.1, w: 3, color: '#bff0ff' });
    sfx.bonusFanfare(true); app.party(3, 3);
    setTimeout(() => sfx.announce([['¡Bono sorpresa!', 1.2, 0.8], [speakable(sub || 'Los rayos activan el bono'), 1.05, 0.95]], 'es', { sfx: false }), 1100);
    await showOverlay({ kind: 'banner', title: '¡BONO SORPRESA!', sub: sub || 'Los rayos activan el bono', color: '#7fe0ff', dur: 2000, t: 0, jp: true });
  },
  pulseMeter(id) { const el = $(id); el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }
};

// ---------- Overlays de celebración en el canvas FX ----------
function showOverlay(o) {
  // Si quedara un cartel anterior pendiente, se resuelve para no dejar ninguna promesa colgada
  if (overlay && overlay.done) overlay.done();
  return new Promise(res => { o.done = res; overlay = o; skipReq = false; });
}
// Texto de cartel a frase hablada: "+5 GIROS" → "más 5 giros", sin símbolos
function speakable(t) {
  return String(t).replace(/<[^>]+>/g, '').replace(/\+\s*(\d)/g, 'más $1').replace(/[·•]/g, ',').replace(/×/g, ' por ').replace(/[¡!]/g, '').trim().toLowerCase();
}
// [desde × apuesta, palabra, colores, frases del locutor [texto, tono, velocidad], duración en s]
const TIERS = [[40, 'SUPER WIN', ['#fff', '#ff9bf5', '#b13cff', '#ffe0ff'], [['Super!', 1.2, 0.8], ['Super win!', 1.3, 0.8]], 5], [15, 'AWESOME!', ['#fff', '#8ff0ff', '#1b8cff', '#d9f8ff'], [['Awesome!', 1.2, 0.8], ['Awesome win!', 1.3, 0.85]], 4], [5, 'BIG WIN', null, [['Big win!', 1.15, 0.8], ['Big win!', 1.3, 0.85]], 3]];
const WIN_MIN = 5; // premio mínimo (× apuesta) que se anuncia
function drawOverlay(x, dt) {
  const o = overlay; if (!o) return;
  o.t += dt;
  const bigDur = o.kind === 'big' ? o.dur : o.dur / 1000;
  if (skipReq && o.kind === 'big' && o.t < bigDur - 1.2) { o.t = bigDur - 1.2; skipReq = false; }
  // Al tocar se salta el cartel. Antes quedaba o.t === bigDur con skipReq activo y la condición
  // "t > bigDur" nunca se cumplía: el cartel (invisible) no terminaba y el juego se congelaba.
  if (skipReq && o.kind === 'banner') { o.t = bigDur + 0.001; skipReq = false; }
  const t = o.t, inA = Math.min(1, t / 0.3), outA = Math.min(1, Math.max(0, (bigDur - t) / 0.35)), a = inA * outA;
  const cx = FW / 2, cy = FH * 0.44;
  x.save();
  x.globalAlpha = a * 0.72; x.fillStyle = '#05020a'; x.fillRect(0, 0, FW, FH);
  // Rayos de luz giratorios
  x.globalAlpha = a * 0.5; x.globalCompositeOperation = 'lighter';
  x.translate(cx, cy); x.rotate(t * 0.4);
  const rays = 14, R = Math.max(FW, FH);
  for (let i = 0; i < rays; i++) {
    x.rotate(Math.PI * 2 / rays);
    const g = x.createLinearGradient(0, 0, R * 0.7, 0);
    g.addColorStop(0, o.kind === 'big' ? 'rgba(255,200,80,0.55)' : 'rgba(120,220,255,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.beginPath(); x.moveTo(0, 0); x.lineTo(R, -R * 0.09); x.lineTo(R, R * 0.09); x.closePath(); x.fill();
  }
  x.setTransform(DPR, 0, 0, DPR, 0, 0);
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = a;
  const pop = ease.outBack(Math.min(1, t / 0.5));
  const size = Math.min(FW * 0.13, 64);
  if (o.kind === 'banner') {
    x.drawImage(glow(o.color, 128), cx - FW * 0.5, cy - size * 2, FW, size * 4);
    goldText(x, o.title, cx, cy - size * 0.35, size * pop * (1 + Math.sin(t * 5) * 0.03), { maxW: FW * 0.9, glowColor: o.color });
    if (o.jp) {
      if (Math.random() < 0.9) fx.add({ type: 'coin', x: rand(0, FW), y: -20, vx: rand(-40, 40), vy: rand(150, 350), g: 900, life: 2.2, size: rand(9, 16), vr: rand(6, 14) });
      if (Math.random() < 0.4) fx.add({ type: 'spark', x: rand(0, FW), y: rand(0, FH), vx: 0, vy: -30, life: 0.8, size: rand(8, 18), color: o.color });
    }
    if (o.sub) goldText(x, o.sub, cx, cy + size * 0.75, size * 0.42 * pop, { colors: ['#fff', '#fff', '#e8f6ff', '#fff'], stroke: '#10183a', maxW: FW * 0.9 });
    if (t > bigDur) finishOverlay();
  } else {
    const countT = clamp((t - 0.3) / Math.max(0.8, o.dur - 1.6), 0, 1), shown = o.amount * ease.outCubic(countT);
    // Sube de categoría cuando el conteo cruza 15× y 40× la apuesta
    if (o.ti > 0 && shown >= o.bet * TIERS[o.ti - 1][0]) {
      o.ti--; o.tier = TIERS[o.ti]; o.up = t;
      const lv = TIERS.length - o.ti;
      sfx.tierUp(lv); sfx.hype(lv); setTimeout(() => sfx.announce(o.tier[3]), 450);
      app.flash(o.ti === 0 ? '#ffb8ff' : '#bff4ff', 0.55); app.shake(true);
      fx.burst(cx, cy, 80, { type: 'spark', color: o.ti === 0 ? '#ff9bf5' : '#8ff0ff', speed: 800, life: 1.2, size: 16 });
      fx.add({ type: 'ring', x: cx, y: cy, size: 10, grow: FW * 0.7, width: 12, life: 0.7, color: '#fff' });
    }
    const tier = o.tier || TIERS[TIERS.length - 1];
    // Timbre de la máquina repicando mientras cuenta
    if (countT < 1 && t - (o.bellT || 0) > 0.07) { o.bellT = t; o.bi = (o.bi || 0) + 1; sfx.slotBell(o.bi, 0, 0.04); if (o.bi % 3 === 0) sfx.tick(countT); }
    if (countT >= 1 && !o.landed) { o.landed = true; sfx.win(3); fx.burst(cx, cy, 60, { type: 'spark', color: '#ffd76a', speed: 700, life: 1.2, size: 14 }); }
    // Lluvia de monedas
    if (Math.random() < 0.9) fx.add({ type: 'coin', x: rand(0, FW), y: -20, vx: rand(-40, 40), vy: rand(100, 300), g: 900, life: 2.2, size: rand(9, 16), vr: rand(6, 14) });
    if (Math.random() < 0.35) fx.add({ type: 'coin', x: cx + rand(-40, 40), y: FH + 20, vx: rand(-250, 250), vy: rand(-1100, -800), g: 1000, life: 2.2, size: rand(10, 18), vr: rand(6, 14) });
    if (o.label) goldText(x, o.label, cx, cy - size * 1.95, size * 0.42 * pop, { maxW: FW * 0.9, glowColor: '#ff9d2e' });
    const upPop = o.up != null && t - o.up < 0.5 ? 1 + 0.5 * (1 - ease.outBack((t - o.up) / 0.5)) : 1;
    goldText(x, tier[1], cx, cy - size * 1.05, size * 0.95 * pop * upPop * (1 + Math.sin(t * 6) * 0.05), { colors: tier[2], maxW: FW * 0.92, glowColor: '#ff9d2e' });
    goldText(x, fmt(shown), cx, cy + size * 0.35, size * 1.15 * pop, { maxW: FW * 0.92, glowColor: '#ffcc40' });
    x.font = '700 13px ' + FONT; x.fillStyle = 'rgba(255,255,255,0.6)'; x.textAlign = 'center';
    x.fillText('Toca para continuar', cx, cy + size * 1.6);
    if (t > o.dur) finishOverlay();
  }
  x.restore();
}
const party = { t: 1, dur: 0, lvl: 0, fw: 0, cf: 0 };
// Colores de ampolletas por nivel
const PARTY_COL = [['#ffd76a', '#fff3c0'], ['#ffd76a', '#ff5a4a'], ['#ffd76a', '#ff5a4a', '#5ad0ff'], ['#8ff0ff', '#1b8cff', '#ffffff', '#ffd76a'], ['#ff9bf5', '#b13cff', '#ffd76a', '#5ad0ff', '#7dff8f']];
function drawParty(x, dt) {
  party.t += dt;
  const on = party.t < party.dur;
  const m = $('win').parentNode;
  if (!on) { if (m.classList.contains('hot')) m.classList.remove('hot'); return; }
  const L = party.lvl, t = party.t, fade = Math.min(1, (party.dur - t) / 0.5, t / 0.15);
  const r = $('board').getBoundingClientRect(), cols = PARTY_COL[Math.min(4, L)];
  x.save(); x.globalCompositeOperation = 'lighter';
  // Reflectores que barren desde abajo (premios medianos en adelante)
  if (L >= 1) {
    const n = L >= 3 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const ox = n === 2 ? (i ? FW * 1.02 : -FW * 0.02) : [-FW * 0.02, FW / 2, FW * 1.02][i], oy = FH + 10;
      const ang = -Math.PI / 2 + Math.sin(t * (1.1 + i * 0.35) + i * 2) * 0.55 + (i === 0 ? 0.35 : i === n - 1 ? -0.35 : 0);
      x.save(); x.translate(ox, oy); x.rotate(ang);
      const len = FH * 1.2, g = x.createLinearGradient(0, 0, len, 0), c = cols[i % cols.length];
      g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.globalAlpha = 0.16 * fade * (0.8 + 0.2 * Math.sin(t * 9 + i)); x.fillStyle = g;
      x.beginPath(); x.moveTo(0, -8); x.lineTo(len, -len * 0.13); x.lineTo(len, len * 0.13); x.lineTo(0, 8); x.fill();
      x.restore();
    }
  }
  // Marquesina de ampolletas alrededor de los rodillos, persiguiéndose (más rápido cuanto mayor el premio)
  const pad = 7, step = 17, per = 2 * (r.width + r.height + pad * 4), n = Math.floor(per / step);
  const speed = 8 + L * 5, phase = Math.floor(t * speed), blink = L >= 3 && Math.floor(t * 6) % 2;
  const spr = cols.map(c => glow(c, 32));
  for (let i = 0; i < n; i++) {
    let d = i * per / n, px, py;
    const w = r.width + pad * 2, h = r.height + pad * 2, x0 = r.left - pad, y0 = r.top - pad;
    if (d < w) { px = x0 + d; py = y0; } else if ((d -= w) < h) { px = x0 + w; py = y0 + d; } else if ((d -= h) < w) { px = x0 + w - d; py = y0 + h; } else { d -= w; px = x0; py = y0 + h - d; }
    const lit = blink ? (i % 2 === 0) : ((i + phase) % 3 === 0);
    x.globalAlpha = fade * (lit ? 1 : 0.18);
    const sz = lit ? 11 : 6;
    x.drawImage(spr[(i + (L >= 2 ? phase >> 2 : 0)) % spr.length], px - sz, py - sz, sz * 2, sz * 2);
    if (lit) { x.globalAlpha = fade; x.fillStyle = '#fff'; x.beginPath(); x.arc(px, py, 1.8, 0, 7); x.fill(); }
  }
  x.restore();
  // Confeti y fuegos artificiales (premios grandes)
  if (L >= 1 && t < party.dur - 0.6) {
    party.cf += dt * (L === 1 ? 14 : 18 + L * 10);
    while (party.cf >= 1) {
      party.cf--;
      const c = ['#ff4a5a', '#ffd76a', '#5ad0ff', '#7dff8f', '#ff9bf5', '#ffffff'][Math.random() * 6 | 0];
      fx.add({ type: 'confetti', x: rand(0, FW), y: -10, vx: rand(-30, 30), vy: rand(80, 200), g: 60, drag: 0.02, life: 3, size: rand(6, 11), rot: rand(0, 6), vr: rand(-5, 5), color: c });
    }
  }
  if (L >= 2 && t < party.dur - 1) {
    party.fw -= dt;
    if (party.fw <= 0) {
      party.fw = rand(0.35, 0.7) / (L - 1);
      const c = cols[Math.random() * cols.length | 0], x1 = rand(FW * 0.12, FW * 0.88), up = rand(0.55, 0.8);
      sfx.firework(0, 0.12 + L * 0.02, up);
      fx.add({ type: 'rocket', x: x1, y: FH, vx: rand(-40, 40), vy: -FH * rand(0.95, 1.3), g: FH * 0.6, life: up, color: c,
        onEnd: p => {
          fx.burst(p.x, p.y, 34 + L * 6, { type: 'spark', color: c, speed: 260 + L * 30, life: 1.1, size: 9, g: 160, drag: 0.03 });
          fx.burst(p.x, p.y, 12, { type: 'spark', color: '#ffffff', speed: 120, life: 0.6, size: 7 });
          fx.add({ type: 'ring', x: p.x, y: p.y, size: 4, grow: 90, width: 3, life: 0.5, color: c });
        } });
    }
  }
}
function finishOverlay() { const o = overlay; overlay = null; skipReq = false; if (o && o.done) o.done(); }

// ---------- Bucle de render ----------
let last = performance.now(), frameSkip = 0, running = true;
// ---------- Monedas de premio ----------
// Todas las ganancias del cuadro se juntan en una sola lluvia: monedas que vuelan al medidor de
// PREMIO (más cuanto mayor el premio) y, desde 2× la apuesta, monedas que saltan hacia la pantalla.
const coinQ = { win: 0, n: 0, origin: null };
function coinShower() {
  if (!coinQ.win && !coinQ.n) return;
  const bet = app.bet || 1, r = coinQ.win / bet, tgt = app.winTarget();
  const b = $('board').getBoundingClientRect(), o = coinQ.origin || [b.left + b.width / 2, b.top + b.height / 2];
  const n = coinQ.win ? Math.round(clamp(4 + r * 2.2, 5, 34)) : coinQ.n;
  for (let i = 0; i < n; i++) {
    const sx = o[0] + rand(-b.width * 0.25, b.width * 0.25), sy = o[1] + rand(-b.height * 0.15, b.height * 0.15);
    fx.add({ type: 'coin', sx, sy, x: sx, y: sy, target: tgt, arc: rand(-110, 110), life: 0.6 + i * 0.035 + Math.random() * 0.2, size: rand(10, 14), vr: rand(8, 14) });
  }
  // Monedas hacia el espectador: salen del tablero, crecen girando y se desvanecen
  if (r >= 2) {
    const m = Math.round(clamp(r * 0.9, 3, 22));
    for (let i = 0; i < m; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(60, 220);
      fx.add({ type: 'zoom', x: o[0] + rand(-30, 30), y: o[1] + rand(-30, 30), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, g: 120, life: 0.9 + Math.random() * 0.5, size: rand(7, 11), grow: rand(5, 9), vr: rand(6, 12), rot: rand(0, 6) });
    }
  }
  if (coinQ.win) for (let i = 0; i < Math.min(9, 2 + (r | 0)); i++) sfx.coin(0.35 + i * 0.06);
  coinQ.win = 0; coinQ.n = 0; coinQ.origin = null;
}
function frame(now) {
  if (!running) return;
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.1) dt = 0.1;
  coinShower();
  // Contadores
  if (meter.winShown !== meter.win) {
    const d = meter.win - meter.winShown;
    meter.winShown = Math.abs(d) < 1 ? meter.win : meter.winShown + d * Math.min(1, dt * 7);
    $('win').textContent = fmt(meter.winShown);
  }
  if (meter.creditShown !== state.balance) {
    const d = state.balance - meter.creditShown;
    meter.creditShown = Math.abs(d) < 1 ? state.balance : meter.creditShown + d * Math.min(1, dt * 6);
    $('credit').textContent = fmt(meter.creditShown);
  }
  if (!game) return;
  game.update(dt);
  // Sin animación activa: dibujar a 30 fps para ahorrar batería
  const idle = !busy && !fx.active && !overlay && !game.animating;
  if (!idle || (frameSkip++ & 1) === 0) {
    gctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    gctx.clearRect(0, 0, W, H);
    game.draw(gctx);
  }
  fx.update(dt);
  const fxNeeded = fx.active || !!overlay || flashA > 0 || party.t < party.dur + 0.1;
  if (fxNeeded || fxDrawn) {
    fctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    fctx.clearRect(0, 0, FW, FH);
    drawParty(fctx, dt);
    if (overlay) drawOverlay(fctx, dt);
    fx.draw(fctx);
    if (flashA > 0) { fctx.globalAlpha = flashA; fctx.fillStyle = flashColor; fctx.fillRect(0, 0, FW, FH); fctx.globalAlpha = 1; flashA = Math.max(0, flashA - dt * 2.5); }
    fxDrawn = fxNeeded;
  }
}
let fxDrawn = false;

// ---------- HUD ----------
function renderPots(valuesOnly) {
  const pots = $('pots');
  const js = JACKPOTS;
  if (!valuesOnly || !pots.children.length) {
    pots.innerHTML = js.map(j => '<div class="pot ' + j.cls + '" data-k="' + j.key + '"><b>' + j.label + '</b><strong></strong></div>').join('');
  }
  // Los pozos suben contando hacia el valor nuevo; si bajan (se cobró o cambió la apuesta) saltan directo
  js.forEach(j => {
    const box = pots.querySelector('[data-k="' + j.key + '"]'), el = box && box.querySelector('strong'); if (!el) return;
    const v = app.jackpot(j.key), cur = potShown[j.key];
    if (cur == null || v < cur || !valuesOnly) { potShown[j.key] = v; potFrom[j.key] = v; el.textContent = fmt(v); return; }
    if (v > cur + 0.5) { potFrom[j.key] = cur; potTo[j.key] = v; potT0[j.key] = performance.now(); box.classList.remove('grow'); void box.offsetWidth; box.classList.add('grow'); if (!potAnim) potAnim = requestAnimationFrame(tickPots); }
  });
}
const potShown = {}, potFrom = {}, potTo = {}, potT0 = {};
let potAnim = 0;
function tickPots(now) {
  potAnim = 0; let more = false;
  JACKPOTS.forEach(j => {
    if (potTo[j.key] == null) return;
    const t = Math.min(1, (now - potT0[j.key]) / 900), v = potFrom[j.key] + (potTo[j.key] - potFrom[j.key]) * ease.outCubic(t);
    potShown[j.key] = v;
    const el = $('pots').querySelector('[data-k="' + j.key + '"] strong'); if (el) el.textContent = fmt(v);
    if (t < 1) more = true; else potTo[j.key] = null;
  });
  if (more) potAnim = requestAnimationFrame(tickPots);
}
function renderHud() {
  $('bet').textContent = fmt(app.bet);
  $('credit').textContent = fmt(meter.creditShown);
  $('speedVal').textContent = speedLabel(state.speed);
  $('btnTurbo').classList.toggle('on', state.speed >= 2);
  $('btnTheme').classList.toggle('on', state.light);
  $('btnSound').classList.toggle('off', !state.sound);
  $('btnAuto').classList.toggle('on', autoLeft > 0);
  $('autoCount').textContent = autoLeft > 0 ? (autoLeft === Infinity ? '∞' : autoLeft) : '';
  $('betDown').disabled = busy || game.locked; $('betUp').disabled = busy || game.locked;
  const ex = game.extra;
  $('btnExtra').hidden = !ex;
  if (ex) { $('extraLabel').textContent = ex.label; $('extraSub').textContent = ex.sub(app.bet); }
  renderPots(true);
}

function growJackpots() {
  const jp = state.jp[game.id] || (state.jp[game.id] = {});
  JACKPOTS.forEach(j => { jp[j.key] = (jp[j.key] || 0) + j.grow * (0.6 + Math.random() * 0.8); });
}

async function spin(paid = true) {
  sfx.unlock();
  if (busy) { skipReq = true; if (game.slam) game.slam(); return; }
  const bet = app.bet;
  const free = game.freeRound;
  if (paid && !free && state.balance < bet) { autoLeft = 0; renderHud(); openCredits(); return; }
  busy = true; document.body.classList.add('busy');
  if (!free) {
    state.balance -= bet; meter.creditShown = state.balance; $('credit').textContent = fmt(state.balance);
    state.stats.spins++; state.stats.bet += bet;
    growJackpots();
  }
  if (!game.keepWin) { meter.win = 0; meter.winShown = 0; $('win').textContent = fmt(0); }
  renderHud();
  let res;
  try { res = await game.play(bet); } catch (e) { console.error(e); res = { win: 0 }; }
  const win = res && res.win || 0;
  if (win > 0 && !res.celebrated && win >= bet * WIN_MIN) await app.celebrate(win, bet);
  else if (win > 0 && !res.celebrated) {
    // Premios chicos y medianos también se festejan: ampolletas, campana y arpegio; desde 2× "NICE WIN!"
    const r = win / bet, [bxc, byc] = (() => { const b = $('board').getBoundingClientRect(); return [b.width / 2, b.height * 0.42]; })();
    app.party(r >= 2 ? 1 : 0, r >= 2 ? 2.6 : 1.5);
    sfx.winJingle(r >= 2 ? 1 : 0);
    if (r >= 2) { app.popText(bxc, byc, 'NICE WIN!', 34, ['#fff', '#ffe28a', '#ff9d2e', '#fff3c0']); app.flash('#ffe8a0', 0.2); }
  }
  if (win > 0) {
    state.balance += win; state.stats.won += win; state.stats.best = Math.max(state.stats.best, win);
    app.pulseMeter('credit');
  }
  save();
  busy = false; document.body.classList.remove('busy');
  if (autoLeft > 0 && !game.freeRound) autoLeft--;
  renderHud();
  if (game.freeRound || autoLeft > 0) {
    await app.wait(game.freeRound ? 500 : 350);
    if (!busy && (game.freeRound || autoLeft > 0) && !document.hidden) spin();
  }
}

// ---------- Hojas (paneles) ----------
function openSheet(title, html) {
  $('sheetTitle').textContent = title; $('sheetBody').innerHTML = html;
  $('sheet').classList.add('open');
}
function closeSheet() { $('sheet').classList.remove('open'); }
function openCredits() {
  openSheet('Créditos agotados', '<p>Estos son créditos ficticios, sin valor real. ¿Recargar?</p><div class="choices"><button data-reload="10000">+ $10.000</button><button data-reload="50000">+ $50.000</button></div>');
}
function openAuto() {
  openSheet('Giros automáticos', '<p>Se detiene si no alcanza el crédito. Las funciones especiales se juegan solas.</p><div class="choices">' + [10, 25, 50, 100].map(n => '<button data-auto="' + n + '">' + n + '</button>').join('') + '<button data-auto="inf">∞</button></div>');
}
function openInfo() {
  openSheet(game.name, '<p class="surprise">⚡ <b>BONO SORPRESA:</b> en cualquier giro pagado pueden caer rayos que activan el bono de este juego al azar. En total el bono aparece cerca de 1 vez cada 60–90 giros.</p>' + game.info(app.bet, fmt) + '<p class="fine">Créditos ficticios de entretenimiento. Sin dinero real, sin compras. Guardado en este dispositivo.</p>');
}
function openInstall() {
  openSheet('Instalar en iPhone / iPad', '<ol class="steps"><li>Abre esta página en <b>Safari</b>.</li><li>Toca el botón <b>Compartir</b> <span class="kbd">⬆︎</span>.</li><li>Elige <b>Agregar a pantalla de inicio</b>.</li><li>Ábrela desde el ícono: se ejecuta a pantalla completa y funciona sin conexión.</li></ol><p class="fine">Si no oyes sonido, revisa que el interruptor de silencio del iPhone esté desactivado.</p>');
}

// Diseño automático: horizontal cuando el equipo está girado, vertical cuando está derecho
const landscapeMQ = window.matchMedia('(orientation: landscape)');
function applyLayout() {
  const h = window.innerWidth > window.innerHeight * 1.15;
  document.body.classList.toggle('layout-h', h);
  document.body.classList.toggle('layout-v', !h);
  requestAnimationFrame(resize);
}
function speedLabel(v) { return (v === 0.75 ? '¾' : v === 0.5 ? '½' : v === 1.5 ? '1½' : String(v)) + '×'; }
function setLight(on) {
  state.light = on; save();
  document.body.classList.toggle('light', on);
  if (game) game.resize(W, H, DPR);
  renderHud();
}
// Lista de voces instaladas para elegir el locutor (las masculinas primero)
function voiceSelect(id, re, current) {
  const male = /aaron|arthur|daniel|gordon|nathan|alex|fred|male|rishi|tom|evan|jorge|juan|diego|carlos|enrique|pablo|reed|eddy|rocko|grandpa|abuelo/i;
  const vs = usableVoices(re).sort((a, b) => (male.test(b.name) - male.test(a.name)) || a.name.localeCompare(b.name));
  if (!vs.length) return '<p class="fine">No hay voces instaladas para este idioma.</p>';
  return '<select id="' + id + '" class="vsel">' + vs.map(v => '<option value="' + v.voiceURI.replace(/"/g, '&quot;') + '"' + (v.name === current ? ' selected' : '') + '>' + (male.test(v.name) ? '♂ ' : '') + v.name + ' · ' + v.lang + '</option>').join('') + '</select>';
}
function openSettings() {
  const idx = SPEEDS.indexOf(state.speed);
  openSheet('Ajustes', '<div class="set"><label>Velocidad de giro <output id="setSpeedOut">' + speedLabel(state.speed) + '</output></label>' +
    '<input id="setSpeed" type="range" min="0" max="' + (SPEEDS.length - 1) + '" step="1" value="' + idx + '"><div class="set-scale"><span>Lenta</span><span>Normal</span><span>Muy rápida</span></div></div>' +
    '<div class="set"><label>Volumen de efectos</label><input id="setSfx" type="range" min="0" max="100" value="' + Math.round(state.sfxVol * 100) + '"></div>' +
    '<div class="set"><label>Volumen de música</label><input id="setMusic" type="range" min="0" max="100" value="' + Math.round(state.musicVol * 100) + '"></div>' +
    '<label class="set switch"><span>Música de fondo</span><input id="setMusicOn" type="checkbox"' + (state.music ? ' checked' : '') + '><i></i></label>' +
    '<label class="set switch"><span>Rodillos en modo claro</span><input id="setLight" type="checkbox"' + (state.light ? ' checked' : '') + '><i></i></label>' +
    '<label class="set switch"><span>Locutor grabado (voz de hombre)</span><input id="setRecVoice" type="checkbox"' + (state.recVoice !== false ? ' checked' : '') + '><i></i></label>' +
    '<div class="set voice"><label>Voz del iPhone (si el locutor grabado está apagado) · español</label>' + voiceSelect('setVoiceEs', /^es/i, sfx.voiceName('es')) +
    '<label>Voz del iPhone · inglés (Big win…)</label>' + voiceSelect('setVoiceEn', /^en/i, sfx.voiceName('en')) +
    '<button id="setVoiceTest" class="vtest" type="button">🔊 Probar voz</button>' +
    '<p class="fine">Para voz de hombre descarga <b>Jorge</b>, <b>Juan</b> o <b>Diego</b> (español) y <b>Aaron</b> o <b>Arthur</b> (inglés) en Ajustes del iPhone → Accesibilidad → Contenido leído → Voces; luego vuelve a abrir la app y elígelas aquí.</p>' +
    '<p class="fine">Si no se oye: sube el volumen, quita el modo silencio y revisa Ajustes del iPhone → Accesibilidad → Contenido leído → Voces.</p></div>' +
    '<p class="fine">También puedes cambiar la velocidad con el botón ⚡ y el modo claro/oscuro con ☀︎/☾ en la parte superior.</p>' +
    '<div class="ver"><small>Aurum Link</small><b>Versión ' + VERSION + '</b></div>');
}

// ---------- Lobby ----------
function buildLobby() {
  $('lobbyGrid').innerHTML = GAMES.map(G => {
    // Íconos: número = casilla del atlas; texto = imagen de la hoja de temas
    const icons = G.lobby.icons.map(i => typeof i === 'string' ? '<i class="art" style="' + (G.iconStyle ? G.iconStyle(i) : sheetIconStyle(i)) + '"></i>' : '<i style="background-position:' + (i % 6) * 20 + '% ' + Math.floor(i / 6) * 25 + '%"></i>').join('');
    return '<button class="card" data-game="' + G.id + '" style="--c1:' + G.lobby.c1 + ';--c2:' + G.lobby.c2 + '"><div class="icons">' + icons + '</div><b>' + G.name + '</b><em>' + G.lobby.mechanic + '</em><small>' + G.lobby.desc + '</small></button>';
  }).join('');
}
function openLobby() { if (busy) return; $('lobby').classList.add('open'); sfx.stopMusic(); }
function selectGame(id) {
  const G = GAMES.find(g => g.id === id) || GAMES[0];
  if (game && game.destroy) game.destroy();
  game = new G(app);
  sfx.theme = G.sfxTheme || null; // efectos de sonido propios del tema
  state.game = G.id; save();
  document.body.dataset.game = G.id;
  $('gameName').textContent = G.name;
  $('gameTag').textContent = G.lobby.mechanic;
  $('lobby').classList.remove('open');
  renderPots(false);
  meter.win = 0; meter.winShown = 0; $('win').textContent = fmt(0);
  requestAnimationFrame(() => { resize(); renderHud(); });
  app.message(game.hint || '');
  app.setSpinLabel('GIRAR');
  sfx.unlock();
  if (state.music) sfx.music(G.music);
}

// Al cambiar la apuesta, los montos visibles de bolas/monedas/orbes se ajustan en proporción
function rescaleValues(g, ratio) {
  if (!g || !isFinite(ratio) || ratio === 1) return;
  const seen = new Set();
  const fix = s => {
    if (!s || typeof s !== 'object' || seen.has(s)) return;
    seen.add(s);
    if (typeof s.value === 'number' && s.value > 0) { s.value = Math.round(s.value * ratio * 100) / 100; }
  };
  const walk = (v, d) => {
    if (!v || typeof v !== 'object' || d > 3) return;
    if (Array.isArray(v)) { v.forEach(e => Array.isArray(e) ? walk(e, d + 1) : fix(e)); return; }
    if (Array.isArray(v.columns) && Array.isArray(v.grid)) { v.columns.forEach(col => col.syms.forEach(fix)); walk(v.grid, d + 1); }
  };
  Object.keys(g).forEach(k => { if (k !== 'app') walk(g[k], 0); });
}

// ---------- Eventos ----------
function bind() {
  const tap = (id, fn) => $(id).addEventListener('click', e => { sfx.unlock(); fn(e); });
  $('btnSpin').addEventListener('pointerdown', e => { e.preventDefault(); if (autoLeft > 0 && !busy) { autoLeft = 0; renderHud(); } spin(); });
  const setBet = i => {
    if (busy || (game && game.locked)) return;
    const old = app.bet; state.betIdx = clamp(i, 0, BETS.length - 1);
    if (app.bet !== old) rescaleValues(game, app.bet / old);
    sfx.click(); renderHud(); save();
  };
  tap('betDown', () => setBet(state.betIdx - 1));
  tap('betUp', () => setBet(state.betIdx + 1));
  tap('btnTurbo', () => { state.speed = SPEEDS[(SPEEDS.indexOf(state.speed) + 1) % SPEEDS.length]; sfx.button(); renderHud(); save(); });
  tap('btnTheme', () => { setLight(!state.light); sfx.button(); });
  tap('btnSettings', openSettings);
  if (landscapeMQ.addEventListener) landscapeMQ.addEventListener('change', applyLayout); else landscapeMQ.addListener(applyLayout);
  tap('btnAuto', () => { if (autoLeft > 0) { autoLeft = 0; renderHud(); return; } if (!busy) openAuto(); });
  tap('btnInfo', openInfo);
  tap('btnLobby', openLobby);
  tap('btnSound', () => {
    state.sound = !state.sound; sfx.setEnabled(state.sound);
    if (state.sound && state.music) sfx.music(game.constructor.music); else sfx.stopMusic();
    renderHud(); save();
  });
  $('sheet').addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'setSpeed') { state.speed = SPEEDS[+t.value]; $('setSpeedOut').textContent = speedLabel(state.speed); renderHud(); }
    if (t.id === 'setSfx') state.sfxVol = +t.value / 100;
    if (t.id === 'setMusic') state.musicVol = +t.value / 100;
    sfx.setVolumes(state.sfxVol, state.musicVol);
    save();
  });
  $('sheet').addEventListener('click', e => {
    if (e.target.id !== 'setVoiceTest') return;
    // Dentro del toque: habilita la voz en iOS y la prueba
    sfx.unlock();
    if (sfx.recVoice !== false && sfx._clipKey('bono')) { sfx.announce([['¡Bono!', 1.2, 0.8], ['10 giros gratis', 1, 0.9], ['Big win!', 1.2, 0.8]], 'es'); return; }
    const ss = window.speechSynthesis;
    if (!ss) { e.target.textContent = 'Este navegador no tiene voz'; return; }
    ss.cancel(); const u = new SpeechSynthesisUtterance('¡Bono! Big win!'); u.lang = 'es-ES'; u.volume = 1; u.rate = 0.85;
    u.onstart = () => { sfx._speechOk = true; e.target.textContent = '🔊 Sonando…'; };
    u.onend = () => { e.target.textContent = '🔊 Probar voz'; sfx.announce([['¡Bono!', 1.2, 0.8], ['Big win!', 1.2, 0.8]], 'es'); };
    u.onerror = ev => { e.target.textContent = 'Error de voz: ' + (ev.error || '?'); };
    ss.speak(u);
  });
  $('sheet').addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'setMusicOn') { state.music = t.checked; sfx.musicOn = state.music; if (state.music) sfx.music(game.constructor.music); else sfx.stopMusic(); save(); }
    if (t.id === 'setLight') setLight(t.checked);
    if (t.id === 'setRecVoice') { state.recVoice = sfx.recVoice = t.checked; save(); sfx.unlock(); sfx.announce([['¡Bono!', 1.2, 0.8], ['Big win!', 1.2, 0.8]], 'es'); }
    if (t.id === 'setVoiceEs' || t.id === 'setVoiceEn') {
      if (t.id === 'setVoiceEs') state.voiceEs = sfx.voiceEs = t.value; else state.voiceEn = sfx.voiceEn = t.value;
      save(); sfx.unlock(); sfx.announce(t.id === 'setVoiceEs' ? [['¡Bono!', 1.2, 0.8], ['Diez giros gratis', 1, 0.9]] : [['Big win!', 1.2, 0.8]], t.id === 'setVoiceEs' ? 'es' : 'en');
    }
    if (t.id === 'setSfx') sfx.coin();
  });
  tap('btnInstall', openInstall);
  tap('btnExtra', async () => {
    if (busy || !game.extra) return;
    const cost = game.extra.cost(app.bet);
    if (state.balance < cost) { openCredits(); return; }
    busy = true; document.body.classList.add('busy');
    state.balance -= cost; meter.creditShown = state.balance; $('credit').textContent = fmt(state.balance); state.stats.bet += cost;
    meter.win = 0; meter.winShown = 0; renderHud();
    let res; try { res = await game.extra.run(app.bet); } catch (e) { console.error(e); res = { win: 0 }; }
    const win = res && res.win || 0;
    if (win >= app.bet * WIN_MIN && !res.celebrated) await app.celebrate(win, app.bet);
    state.balance += win; state.stats.won += win; save();
    busy = false; document.body.classList.remove('busy'); renderHud();
    if (game.freeRound) spin();
  });
  tap('sheetClose', closeSheet);
  $('sheet').addEventListener('click', e => {
    const t = e.target;
    if (t === $('sheet')) closeSheet();
    if (t.dataset.reload) { state.balance += +t.dataset.reload; save(); closeSheet(); sfx.bigWin(0); }
    if (t.dataset.auto) { autoLeft = t.dataset.auto === 'inf' ? Infinity : +t.dataset.auto; closeSheet(); renderHud(); spin(); }
  });
  $('lobbyGrid').addEventListener('click', e => { const c = e.target.closest('.card'); if (c) selectGame(c.dataset.game); });
  $('lobbyClose').addEventListener('click', () => { if (game) { $('lobby').classList.remove('open'); if (state.music) sfx.music(game.constructor.music); } });
  $('fx').addEventListener('pointerdown', () => { skipReq = true; });
  stage.addEventListener('pointerdown', e => { if (game && game.onTap && !overlay) { const r = stage.getBoundingClientRect(); game.onTap(e.clientX - r.left, e.clientY - r.top); } });
  document.addEventListener('pointerdown', () => { if (overlay) skipReq = true; }, true);
  document.addEventListener('keydown', e => { if (e.code === 'Space' && !$('sheet').classList.contains('open')) { e.preventDefault(); spin(); } });
  window.addEventListener('resize', applyLayout);
  // iOS actualiza las medidas con retraso tras girar: re-medir varias veces
  window.addEventListener('orientationchange', () => [100, 350, 700].forEach(t => setTimeout(applyLayout, t)));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { sfx.suspend(); running = false; autoLeft = 0; }
    else { sfx.resume(); running = true; last = performance.now(); requestAnimationFrame(frame); renderHud(); keepAwake(); }
  });
  // Pantalla siempre encendida mientras el juego está a la vista (se pide con el primer toque)
  document.addEventListener('pointerdown', keepAwake, { passive: true });
  // Evita el zoom por doble toque / gesto en iOS
  document.addEventListener('gesturestart', e => e.preventDefault());
  let lastTouch = 0;
  document.addEventListener('touchend', e => { const n = Date.now(); if (n - lastTouch < 350 && !e.target.closest('.sheet-body')) e.preventDefault(); lastTouch = n; }, { passive: false });
}

// ---------- Arranque ----------
// Wake Lock: evita que la pantalla se apague mientras se juega. El sistema lo suelta al salir
// de la app; se vuelve a pedir al regresar o al tocar la pantalla.
let wakeLock = null;
async function keepAwake() {
  if (wakeLock || document.hidden || !('wakeLock' in navigator)) return;
  try { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } catch (e) { wakeLock = null; }
}
async function boot() {
  sfx.enabled = state.sound; sfx.musicOn = state.music;
  sfx.setVolumes(state.sfxVol, state.musicVol);
  sfx.voiceEs = state.voiceEs || null; sfx.voiceEn = state.voiceEn || null; sfx.recVoice = state.recVoice !== false;
  document.body.classList.toggle('light', state.light);
  applyLayout();
  buildLobby();
  $('verLabel').textContent = 'v' + VERSION;
  bind();
  sfx.preload('howl', 'assets/sfx/howl.wav');
  sfx.loadVoice('assets/voice/');
  await Promise.all([loadAtlas('assets/symbols.webp').catch(e => console.warn('atlas', e)), loadThemeArt().catch(e => console.warn('temas', e)), loadWolfArt().catch(e => console.warn('lobo', e))]);
  $('loader').classList.add('gone');
  selectGame(state.game || GAMES[0].id);
  if (!state.game || !localStorage.getItem(SAVE_KEY + '.seen')) { openLobby(); try { localStorage.setItem(SAVE_KEY + '.seen', '1'); } catch (e) { } }
  requestAnimationFrame(frame);
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => { });
}
window.AURUM = { app, get game() { return game; }, state };
boot();
