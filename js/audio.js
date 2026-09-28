// Motor de sonido 100 % sintetizado con Web Audio (sin archivos, cero latencia de carga).
// Pensado para Safari iOS: se desbloquea con el primer toque y se suspende en segundo plano.
const AC = window.AudioContext || window.webkitAudioContext;

class Sfx {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.musicOn = true;
    this.volume = 0.9;
    this.sfxVol = 0.9;
    this.musicVol = 0.55;
    this._loops = {};
    this._music = null;
  }

  unlock() {
    if (!AC) return;
    if (!this.ctx) {
      const ctx = new AC({ latencyHint: 'interactive' });
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.enabled ? this.volume : 0;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 5;
      comp.attack.value = 0.003; comp.release.value = 0.2;
      this.master.connect(comp); comp.connect(ctx.destination);
      this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = this.sfxVol; this.sfxBus.connect(this.master);
      this.musicBus = ctx.createGain(); this.musicBus.gain.value = this.musicVol; this.musicBus.connect(this.master);
      // Reverb corta generada (sala de casino)
      this.verb = ctx.createConvolver();
      this.verb.buffer = this._impulse(1.6, 2.8);
      this.verbSend = ctx.createGain(); this.verbSend.gain.value = 0.28;
      this.verbSend.connect(this.verb); this.verb.connect(this.master);
      this.noiseBuf = this._noise(2);
      this.crackleBuf = this._crackle(1.2);
      // Buffer silencioso: requisito de iOS para habilitar el audio
      const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource();
      s.buffer = b; s.connect(ctx.destination); s.start(0);
    }
    if (this.ctx.state !== 'running') this.ctx.resume();
  }

  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }
  resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume(); }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.setTargetAtTime(on ? this.volume : 0, this.ctx.currentTime, 0.05);
  }

  setVolumes(sfxV, musicV) {
    this.sfxVol = sfxV; this.musicVol = musicV;
    if (this.ctx) {
      this.sfxBus.gain.setTargetAtTime(sfxV, this.ctx.currentTime, 0.05);
      this.musicBus.gain.setTargetAtTime(musicV, this.ctx.currentTime, 0.05);
    }
  }

  get ok() { return !!(this.ctx && this.enabled && this.ctx.state === 'running'); }
  get t() { return this.ctx.currentTime; }

  _impulse(sec, decay) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }
  _noise(sec) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  _crackle(sec) {
    // Chisporroteo eléctrico: impulsos dispersos de amplitud aleatoria
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    let burst = 0;
    for (let i = 0; i < len; i++) {
      if (Math.random() < 0.0009) burst = 200 + Math.random() * 900;
      if (burst > 0) { burst--; d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.5 ? 1 : 0.3); }
      else d[i] = Math.random() < 0.004 ? (Math.random() * 2 - 1) : 0;
    }
    return b;
  }

  // --- Primitivas ---
  tone(freq, dur, { type = 'sine', vol = 0.2, at = 0, attack = 0.005, slide = 0, verb = 0, dest } = {}) {
    if (!this.ok) return;
    const ctx = this.ctx, t0 = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || this.sfxBus);
    if (verb) { const s = ctx.createGain(); s.gain.value = verb; g.connect(s); s.connect(this.verbSend); }
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  noise(dur, { at = 0, vol = 0.3, type = 'bandpass', freq = 1000, q = 1, freqEnd = 0, buf, verb = 0 } = {}) {
    if (!this.ok) return;
    const ctx = this.ctx, t0 = ctx.currentTime + at, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = buf || this.noiseBuf; s.loop = true;
    f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(this.sfxBus);
    if (verb) { const v = ctx.createGain(); v.gain.value = verb; g.connect(v); v.connect(this.verbSend); }
    s.start(t0, Math.random()); s.stop(t0 + dur + 0.05);
  }
  bell(freq, dur = 1.2, vol = 0.12, at = 0) {
    // Campana metálica: parciales inarmónicos
    [1, 2.76, 5.4, 8.93].forEach((m, i) => this.tone(freq * m, dur / (1 + i * 0.8), { vol: vol / (1 + i * 1.4), at, verb: 0.6 }));
  }

  // --- Efectos de juego ---
  click() { this.tone(1800, 0.04, { type: 'square', vol: 0.05 }); }
  button() { this.tone(660, 0.06, { type: 'triangle', vol: 0.12 }); this.tone(990, 0.08, { type: 'sine', vol: 0.08, at: 0.03 }); }

  spinStart(turbo) {
    if (!this.ok) return;
    this.noise(0.25, { vol: 0.25, freq: 300, freqEnd: 2400, q: 2 });
    this.tone(180, 0.2, { type: 'triangle', vol: 0.15, slide: 2.2 });
    this.startLoop('reels', turbo ? 1.35 : 1);
  }
  startLoop(name, rate = 1) {
    if (!this.ok || this._loops[name]) return;
    const ctx = this.ctx, g = ctx.createGain(), f = ctx.createBiquadFilter(), s = ctx.createBufferSource();
    s.buffer = this.noiseBuf; s.loop = true;
    f.type = 'bandpass'; f.frequency.value = 900 * rate; f.Q.value = 0.8;
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 14 * rate; lg.gain.value = 0.05;
    lfo.connect(lg); lg.connect(g.gain);
    g.gain.value = 0.06;
    s.connect(f); f.connect(g); g.connect(this.sfxBus);
    s.start(); lfo.start();
    this._loops[name] = { s, lfo, g };
  }
  stopLoop(name) {
    const l = this._loops[name]; if (!l) return;
    delete this._loops[name];
    const t = this.ctx.currentTime;
    l.g.gain.cancelScheduledValues(t); l.g.gain.setTargetAtTime(0, t, 0.05);
    l.s.stop(t + 0.3); l.lfo.stop(t + 0.3);
  }
  reelStop(i = 0, last = false) {
    this.tone(150 - i * 6, 0.16, { type: 'sine', vol: 0.4, slide: 0.45 });
    this.noise(0.05, { vol: 0.25, freq: 3200, q: 2 });
    this.tone(420 + i * 30, 0.05, { type: 'triangle', vol: 0.08, at: 0.01 });
    if (last) this.stopLoop('reels');
  }
  anticipation(on) {
    if (!this.ok) return;
    if (on && !this._antic) {
      const ctx = this.ctx, o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o2.type = 'sawtooth'; o.frequency.value = 110; o2.frequency.value = 111.5;
      o.frequency.linearRampToValueAtTime(330, ctx.currentTime + 3);
      o2.frequency.linearRampToValueAtTime(333, ctx.currentTime + 3);
      f.type = 'lowpass'; f.frequency.value = 400; f.frequency.linearRampToValueAtTime(2600, ctx.currentTime + 3); f.Q.value = 8;
      g.gain.value = 0.0001; g.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 0.4);
      o.connect(f); o2.connect(f); f.connect(g); g.connect(this.sfxBus);
      o.start(); o2.start();
      this._antic = { o, o2, g };
    } else if (!on && this._antic) {
      const a = this._antic, t = this.ctx.currentTime; this._antic = null;
      a.g.gain.setTargetAtTime(0, t, 0.06); a.o.stop(t + 0.4); a.o2.stop(t + 0.4);
    }
  }
  ballLand(n = 0) {
    const f = 523.25 * Math.pow(2, (n % 12) / 12);
    this.bell(f, 1.0, 0.14);
    this.tone(f * 2, 0.25, { type: 'triangle', vol: 0.05, at: 0.02 });
    this.zap(0.18, 0.12);
  }
  zap(dur = 0.35, vol = 0.18, at = 0) {
    this.noise(dur, { at, vol, buf: this.crackleBuf, type: 'highpass', freq: 1800, q: 0.7 });
    this.noise(dur * 0.6, { at, vol: vol * 0.6, type: 'bandpass', freq: 5000, freqEnd: 1200, q: 4 });
  }
  thunder(vol = 0.7) {
    this.noise(2.2, { vol, type: 'lowpass', freq: 900, freqEnd: 60, q: 0.5, verb: 0.5 });
    this.tone(70, 1.1, { type: 'sine', vol: 0.5, slide: 0.4 });
    this.zap(0.6, 0.3);
  }
  rowUnlock(level = 0) {
    this.thunder(0.6);
    const base = 392 * Math.pow(2, level / 6);
    [1, 1.25, 1.5, 2].forEach((m, i) => this.tone(base * m, 0.9, { type: 'triangle', vol: 0.12, at: 0.25 + i * 0.07, verb: 0.5 }));
  }
  featureStart() {
    this.thunder(0.8);
    const seq = [392, 523, 659, 784, 1047, 1319];
    seq.forEach((f, i) => { this.tone(f, 0.5, { type: 'sawtooth', vol: 0.06, at: 0.3 + i * 0.09, verb: 0.4 }); this.bell(f, 0.8, 0.07, 0.3 + i * 0.09); });
    this.brass([261.6, 329.6, 392, 523.3], 0.95, 1.2);
  }
  brass(chord, at = 0, dur = 1) {
    if (!this.ok) return;
    const ctx = this.ctx, t0 = ctx.currentTime + at;
    const f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'lowpass'; f.frequency.setValueAtTime(500, t0); f.frequency.exponentialRampToValueAtTime(3500, t0 + 0.12); f.frequency.exponentialRampToValueAtTime(1200, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    f.connect(g); g.connect(this.sfxBus);
    const v = ctx.createGain(); v.gain.value = 0.5; g.connect(v); v.connect(this.verbSend);
    chord.forEach(fr => [0, 4].forEach(dt => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = dt - 2;
      o.connect(f); o.start(t0); o.stop(t0 + dur + 0.05);
    }));
  }
  win(level = 0) {
    const notes = [523, 659, 784, 1047, 1319];
    notes.slice(0, 3 + Math.min(2, level)).forEach((f, i) => this.bell(f, 0.8, 0.1, i * 0.08));
  }
  coin(at = 0) {
    const f = 2400 + Math.random() * 1200;
    this.tone(f, 0.12, { type: 'square', vol: 0.03, at });
    this.tone(f * 1.5, 0.25, { vol: 0.06, at: at + 0.02, verb: 0.3 });
  }
  tick(p = 0) { this.tone(900 + p * 900, 0.035, { type: 'triangle', vol: 0.06 }); }
  collect(n = 0) {
    const f = 440 * Math.pow(2, Math.min(n, 24) / 12);
    this.tone(f, 0.18, { type: 'triangle', vol: 0.12 });
    this.tone(f * 2, 0.3, { vol: 0.07, at: 0.04, verb: 0.4 });
  }
  bigWin(level = 1) {
    const chords = [[261.6, 329.6, 392], [349.2, 440, 523.3], [392, 493.9, 587.3], [523.3, 659.3, 784, 1046.5]];
    chords.forEach((c, i) => this.brass(c, i * 0.32, i === 3 ? 1.8 : 0.4));
    this.tone(65, 0.5, { vol: 0.5, slide: 0.5 }); this.tone(65, 0.5, { vol: 0.5, slide: 0.5, at: 0.96 });
    for (let i = 0; i < 6 + level * 4; i++) this.coin(0.4 + i * 0.09);
  }
  // Jackpot: sirena + carillón + metales; más largo cuanto mayor el nivel (0 mini … 3 grand)
  jackpot(level = 1) {
    this.thunder(0.5 + level * 0.1);
    this.siren(1.2 + level * 0.6);
    const n = 10 + level * 6;
    for (let i = 0; i < n; i++) this.bell([784, 988, 1175, 1568, 1976][i % 5], 1.2, 0.09, 0.2 + i * 0.11);
    const ch = [[261.6, 329.6, 392, 523.3], [293.7, 370, 440, 587.3], [329.6, 415.3, 493.9, 659.3], [392, 493.9, 587.3, 784]];
    for (let i = 0; i <= level; i++) this.brass(ch[i], 0.3 + i * 0.45, i === level ? 2.4 : 0.5);
    for (let i = 0; i < 8 + level * 8; i++) this.coin(0.5 + i * 0.07);
  }
  siren(dur = 1.5) {
    if (!this.ok) return;
    const ctx = this.ctx, t0 = ctx.currentTime, o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = 880; lfo.frequency.value = 5; lg.gain.value = 260;
    lfo.connect(lg); lg.connect(o.frequency);
    f.type = 'lowpass'; f.frequency.value = 2400;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.06, t0 + 0.05); g.gain.setValueAtTime(0.06, t0 + dur - 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(f); f.connect(g); g.connect(this.sfxBus);
    o.start(t0); lfo.start(t0); o.stop(t0 + dur + 0.05); lfo.stop(t0 + dur + 0.05);
  }
  shatter(n = 1) {
    this.noise(0.35, { vol: 0.25, type: 'highpass', freq: 4000, q: 0.5, verb: 0.4 });
    for (let i = 0; i < 5; i++) this.tone(2000 + Math.random() * 3000, 0.3, { vol: 0.04, at: Math.random() * 0.15, verb: 0.5 });
    this.tone(200 + n * 40, 0.25, { type: 'triangle', vol: 0.1, slide: 0.5 });
  }
  thud(i = 0) { this.tone(110 + i * 8, 0.12, { vol: 0.25, slide: 0.5 }); this.noise(0.04, { vol: 0.08, freq: 2000 }); }
  whoosh() { this.noise(0.5, { vol: 0.25, freq: 400, freqEnd: 3000, q: 1.5 }); }
  fire() { this.noise(0.9, { vol: 0.3, type: 'lowpass', freq: 2500, freqEnd: 300, q: 0.3 }); this.tone(90, 0.6, { type: 'sawtooth', vol: 0.06, slide: 0.6 }); }
  wheelTick() { this.tone(1500, 0.03, { type: 'square', vol: 0.05 }); this.noise(0.02, { vol: 0.08, freq: 4000 }); }
  sticky() { this.tone(330, 0.4, { type: 'sawtooth', vol: 0.07, slide: 2 }); this.bell(988, 0.8, 0.1, 0.1); }
  multiplier(m) { this.bell(660 * Math.pow(2, Math.min(m, 12) / 12), 1.0, 0.14); this.zap(0.2, 0.1); }

  // --- Música de fondo: batería + bajo + acordes con "pump" + arpegio + campanas ---
  music(style) {
    this.stopMusic();
    if (!this.ok || !this.musicOn || !style) return;
    const M = 'm', J = 'M';
    const styles = {
      // Xtension Link: disco-funk dorado
      disco: { bpm: 122, root: 45, prog: [[0, M], [8, J], [3, J], [10, J]], kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', bass: [0, 0, 12, 0, 0, 12, 7, 10], arp: 'up', lead: 'square', pad: 'sawtooth', bells: 0.25 },
      // Avalancha: cristalino, lento, mucha reverb
      ice: { bpm: 88, root: 50, prog: [[0, M], [8, J], [3, J], [10, J]], kick: 'x.......x.......', snare: '................', hat: '....x.......x...', bass: [0, -1, -1, -1, 7, -1, -1, -1], arp: 'updown', lead: 'triangle', pad: 'sine', bells: 0.6 },
      // Rueda de Fuego: rápido, frigio, agresivo
      fire: { bpm: 142, root: 40, prog: [[0, J], [1, J], [0, J], [-2, J]], kick: 'x..x..x.x..x..x.', snare: '....x.......x..x', hat: 'xxxxxxxxxxxxxxxx', bass: [0, 0, 12, 0, 1, 0, 12, 0], arp: 'down', lead: 'sawtooth', pad: 'sawtooth', bells: 0.1 },
      // Legión: épico, timbales, metales
      rome: { bpm: 96, root: 36, prog: [[0, M], [8, J], [3, J], [10, J]], kick: 'x.....x.x.......', snare: '....x.......x.xx', hat: '..x...x...x...x.', bass: [0, -1, 0, 7, 0, -1, 3, 7], arp: 'up', lead: 'triangle', pad: 'sawtooth', bells: 0.2, toms: true },
      // Toro Dorado: western/country, galope
      ranch: { bpm: 112, root: 43, prog: [[0, J], [5, J], [7, J], [0, J]], kick: 'x..x..x.x..x..x.', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', bass: [0, -1, 7, -1, 0, -1, 7, 5], arp: 'up', lead: 'triangle', pad: 'sawtooth', bells: 0.3 },
      // Caminos del Dragón: escala pentatónica oriental
      orient: { bpm: 100, root: 45, prog: [[0, M], [5, M], [3, J], [10, J]], kick: 'x.......x.x.....', snare: '....x.......x...', hat: '..x...x...x...xx', bass: [0, -1, 7, -1, 10, -1, 7, 3], arp: 'updown', lead: 'triangle', pad: 'sine', bells: 0.55, toms: true },
      // Bonos: eufórico en mayor
      bonus: { bpm: 150, root: 48, prog: [[0, J], [7, J], [9, M], [5, J]], kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.xxx.xxx.xxx.xx', bass: [0, 12, 0, 12, 7, 12, 0, 12], arp: 'up', lead: 'square', pad: 'sawtooth', bells: 0.45 }
    }, st = styles[style];
    if (!st) return;
    const ctx = this.ctx, step = 60 / st.bpm / 4; // semicorcheas
    const bus = ctx.createGain(); bus.gain.value = 0.0001; bus.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + 2);
    bus.connect(this.musicBus);
    const vs = ctx.createGain(); vs.gain.value = 0.35; bus.connect(vs); vs.connect(this.verbSend);
    // Bus de acordes con compresión lateral (bombeo al ritmo del bombo)
    const padBus = ctx.createGain(); padBus.gain.value = 0.5; padBus.connect(bus);
    const padF = ctx.createBiquadFilter(); padF.type = 'lowpass'; padF.frequency.value = 1400; padF.Q.value = 2; padF.connect(padBus);
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 700; lfo.connect(lg); lg.connect(padF.frequency); lfo.start();
    const m = { bus, lfo, next: ctx.currentTime + 0.12, i: 0, timer: 0 };
    const hz = n => 440 * Math.pow(2, (n - 69) / 12);
    const env = (g, t, a, v, d) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + d); };
    const osc = (type, f, t, d, v, dest, a = 0.005, det = 0) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f; o.detune.value = det;
      env(g, t, a, v, d); o.connect(g); g.connect(dest); o.start(t); o.stop(t + d + 0.05); return o;
    };
    const kick = t => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); env(g, t, 0.002, 0.9, 0.35); o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.4);
      padBus.gain.setTargetAtTime(0.12, t, 0.005); padBus.gain.setTargetAtTime(0.5, t + 0.06, 0.08); };
    const noiseHit = (t, type, freq, d, v, q = 1) => { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = this.noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q; env(g, t, 0.001, v, d); s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random()); s.stop(t + d + 0.05); };
    const snare = t => { noiseHit(t, 'bandpass', 1900, 0.18, 0.35, 0.8); osc('triangle', 190, t, 0.1, 0.25, bus); };
    const hat = (t, open) => noiseHit(t, 'highpass', 8000, open ? 0.22 : 0.05, open ? 0.12 : 0.08);
    const tom = (t, f) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.5, t + 0.3); env(g, t, 0.003, 0.5, 0.45); o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.5); };
    const chordNotes = (c) => { const r = st.root + 12 + c[0]; return [r, r + (c[1] === M ? 3 : 4), r + 7]; };
    const tick = () => {
      while (m.next < ctx.currentTime + 0.3) {
        const i = m.i, t = m.next, s16 = i % 16, bar = Math.floor(i / 16) % st.prog.length, ch = st.prog[bar], notes = chordNotes(ch);
        if (st.kick[s16] === 'x') kick(t);
        if (st.snare[s16] === 'x') snare(t);
        if (st.hat[s16] === 'x') hat(t, style === 'disco' && s16 % 4 === 2);
        if (st.toms && s16 >= 12 && (i / 16 | 0) % 4 === 3) tom(t, [220, 180, 150, 120][s16 - 12]);
        // Bajo en corcheas
        if (s16 % 2 === 0) { const b = st.bass[(s16 / 2) % 8]; if (b >= 0) { osc('sawtooth', hz(st.root + ch[0] + b), t, step * 1.7, 0.16, bus, 0.004); osc('sine', hz(st.root + ch[0] + b - 12), t, step * 1.8, 0.25, bus); } }
        // Acordes al inicio de cada compás
        if (s16 === 0) notes.concat([notes[0] + 12]).forEach(n => { [-9, 9].forEach(d => osc(st.pad, hz(n), t, step * 15.5, 0.05, padF, 0.25, d)); });
        // Arpegio
        const idx = st.arp === 'down' ? 3 - (s16 % 4) : st.arp === 'updown' ? [0, 1, 2, 3, 2, 1][s16 % 6] : s16 % 4;
        const an = (notes.concat([notes[0] + 12]))[idx] + 12;
        if (style !== 'ice' || s16 % 2 === 0) osc(st.lead, hz(an), t, step * 0.9, st.lead === 'sawtooth' ? 0.035 : 0.045, bus);
        // Campanitas brillantes
        if (Math.random() < st.bells * 0.25) { const f = hz(notes[Math.random() * 3 | 0] + 36); osc('sine', f, t, 0.9, 0.035, bus); osc('sine', f * 2.76, t, 0.4, 0.012, bus); }
        m.next += step; m.i = (i + 1) % (16 * st.prog.length * 4);
      }
    };
    tick(); m.timer = setInterval(tick, 80);
    this._music = m;
  }
  stopMusic() {
    const m = this._music; if (!m) return;
    this._music = null; clearInterval(m.timer);
    const t = this.ctx.currentTime; m.bus.gain.setTargetAtTime(0.0001, t, 0.25);
    setTimeout(() => { try { m.bus.disconnect(); m.lfo.stop(); } catch (e) { } }, 1500);
  }
}

export const sfx = new Sfx();
