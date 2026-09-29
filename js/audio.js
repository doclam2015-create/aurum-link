// Motor de sonido 100 % sintetizado con Web Audio (sin archivos, cero latencia de carga).
// Pensado para Safari iOS: se desbloquea con el primer toque y se suspende en segundo plano.
const AC = window.AudioContext || window.webkitAudioContext;

// Elige la voz más clara: primero las versiones de alta calidad (iOS "Mejorada"/"Premium"), luego por nombre
const HQ = /enhanced|premium|mejorada/i;
const MALE = /aaron|arthur|daniel|gordon|nathan|alex|fred|male|rishi|tom|evan|jorge|juan|diego|carlos|enrique|pablo/i;
const HYPE = /^¡?\s*(bono|big|awesome|super|súper|mega|epic|jackpot|mini|minor|major|grand|multiplicador|estampida)/i;
const BAD = /siri|novelty|eloquence|bad news|bells|boing|bubbles|cellos|jester|organ|trinoids|whisper|zarvox|albert|bahh|superstar|wobble|good news/i;
function pickVoice(vs, pref, regional) {
  vs = vs.filter(v => !BAD.test(v.name + ' ' + v.voiceURI) && v.localService !== false);
  if (!vs.length) return null;
  const hq = vs.filter(v => HQ.test(v.name));
  for (const pool of [hq, vs]) {
    for (const n of pref) { const v = pool.find(v => v.name.indexOf(n) >= 0); if (v) return v; }
    const r = pool.find(v => regional.test(v.lang)); if (r) return r;
  }
  return vs[0];
}

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
    this.theme = null; // 'china' (Sueño Rojo) · 'snow' (Reino de Nieve): cambia los efectos
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
      this.samples = this.samples || {}; this._decode();
      this.crackleBuf = this._crackle(1.2);
      this.brownBuf = this._brown(4);
      // Buffer silencioso: requisito de iOS para habilitar el audio
      const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource();
      s.buffer = b; s.connect(ctx.destination); s.start(0);
      // iOS solo habla si la primera frase se pide dentro de un toque
    }
    this.unlockSpeech();
    if (this.ctx.state !== 'running') this.ctx.resume();
  }

  // Voz del anuncio (BIG WIN…): síntesis de voz del sistema, en inglés como en las máquinas
  say(text) {
    try {
      if (!this.enabled || !window.speechSynthesis || !text) return;
      const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.92; u.pitch = 0.75; u.volume = Math.min(1, this.sfxVol * 1.1);
      const v = this._voice(); if (v) u.voice = v;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (e) { }
  }
  // Voz de locutor de casino para las grandes ganancias
  _voice() {
    const vs = speechSynthesis.getVoices().filter(v => /^en[-_](US|GB|AU)/i.test(v.lang));
    // Locutor de show: voces masculinas primero
    return pickVoice(vs, ['Aaron', 'Arthur', 'Daniel', 'Gordon', 'Nathan', 'Alex', 'Fred', 'Google UK English Male', 'Rishi', 'Tom', 'Evan', 'Samantha', 'Google US English'], /^en[-_](US|GB)/i);
  }
  // Varias frases seguidas, cada una con su tono: más agudo y rápido suena más entusiasta
  _voiceEs() {
    const vs = speechSynthesis.getVoices().filter(v => /^es/i.test(v.lang));
    return pickVoice(vs, ['Jorge', 'Juan', 'Diego', 'Carlos', 'Enrique', 'Pablo', 'Google español de Estados Unidos', 'Paulina', 'Monica', 'Mónica', 'Google español'], /^es[-_](MX|US|CL|419|ES)/i);
  }
  // lang 'es' usa una voz en español (anuncios de bonos y giros); por defecto inglés como en los casinos
  announce(lines, lang = 'en', o = {}) {
    try {
      if (!this.enabled || !window.speechSynthesis) return;
      // Safari iOS ignora lo que se habla justo después de cancel(): solo se corta si hay algo sonando y se espera un poco
      const ss = speechSynthesis;
      ss.cancel();
      clearTimeout(this._sayT);
      this._sayT = setTimeout(() => this._speakLines(lines, lang), 120);
      this._duck(lines.length, o.sfx !== false);
    } catch (e) { }
  }
  // iOS: se habilita con una frase pedida dentro de un toque; se repite en cada toque hasta confirmar que habló
  unlockSpeech() {
    try {
      const ss = window.speechSynthesis; if (!ss || this._speechOk) return;
      ss.getVoices();
      const u = new SpeechSynthesisUtterance('hola'); u.volume = 0.01; u.rate = 2; u.lang = 'es-ES';
      u.onstart = u.onend = () => { this._speechOk = true; };
      ss.cancel(); ss.speak(u);
    } catch (e) { }
  }
  _speakLines(lines, lang, plain = false) {
    try {
      const ss = speechSynthesis; if (ss.paused) ss.resume();
      // plain: sin elegir voz (la del sistema para el idioma), respaldo si la voz elegida no suena
      const v = plain ? null : (lang === 'es' ? this._voiceEs() : this._voice());
      let started = false;
      lines.forEach(([text, pitch, rate]) => {
        // Tono casi natural y ritmo pausado: los tonos muy agudos o rápidos deforman las palabras
        const u = new SpeechSynthesisUtterance(text); u.lang = v ? v.lang : (lang === 'es' ? 'es-ES' : 'en-US');
        // Voz grave de presentador; las palabras de premio se alargan (¡Booono!, Biiig win!) hablando muy lento
        const male = !v || MALE.test(v.name), hype = HYPE.test(text) && text.length <= 22;
        u.pitch = (male ? 0.88 : 0.72) + Math.max(-0.04, Math.min(0.06, (pitch - 1) * 0.2));
        u.rate = hype ? 0.5 : Math.min(0.8, rate * 0.92); u.volume = 1;
        if (v) u.voice = v;
        u.onstart = () => { started = true; this._speechOk = true; };
        ss.speak(u);
      });
      // Si en 1,5 s no empezó a hablar, reintenta con la voz por defecto del sistema
      if (!plain) setTimeout(() => { if (!started && !ss.speaking) { ss.cancel(); setTimeout(() => this._speakLines(lines, lang, true), 60); } }, 1500);
    } catch (e) { }
  }
  // Nombre de la voz que se usará (para Ajustes)
  voiceName(lang = 'es') { try { const v = lang === 'es' ? this._voiceEs() : this._voice(); return v ? v.name : 'predeterminada del sistema'; } catch (e) { return '—'; } }
  // Baja la música y los efectos mientras habla el locutor
  _duck(n, sfxToo = true) {
    try {
      const lines = { length: n };
      if (this.ctx) { const t = this.ctx.currentTime; this.musicBus.gain.cancelScheduledValues(t); this.musicBus.gain.setTargetAtTime(this.musicVol * 0.06, t, 0.05); this.musicBus.gain.setTargetAtTime(this.musicVol, t + 2.4 + lines.length * 1.5, 0.4);
        // En los bonos baja menos para que la fanfarria siga sonando, pero la voz queda encima
        const sb = this.sfxBus.gain; sb.cancelScheduledValues(t); sb.setTargetAtTime(this.sfxVol * (sfxToo ? 0.18 : 0.4), t + 0.1, 0.06); sb.setTargetAtTime(this.sfxVol, t + 1.4 + lines.length * 1.4, 0.3); }
    } catch (e) { }
  }
  // Campana clásica de tragamonedas (timbre metálico que repica mientras cuenta el premio)
  slotBell(i = 0, at = 0, vol = 0.06) {
    const f = i % 2 ? 2637 : 2093;
    [1, 2.76, 5.4].forEach((m, j) => this.tone(f * m, 0.35 - j * 0.08, { vol: vol / (1 + j * 1.5), at, attack: 0.001, verb: 0.2 }));
    this.noise(0.015, { at, vol: vol * 0.6, type: 'highpass', freq: 6000 });
  }
  // Timbre repicando (como la campana de un gabinete al pagar)
  bellRing(dur = 1.2, vol = 0.06, at = 0) { const n = Math.round(dur / 0.055); for (let i = 0; i < n; i++) this.slotBell(i, at + i * 0.055, vol * (i < n - 4 ? 1 : 0.5)); }
  // Premios chicos y medianos: arpegio alegre + monedas + campanilla
  winJingle(level = 0) {
    if (!this.ok) return;
    const notes = level ? [523.3, 659.3, 784, 1046.5, 1318.5, 1568] : [659.3, 784, 1046.5, 1318.5];
    notes.forEach((f, i) => { this.tone(f, 0.22, { type: 'square', vol: 0.035, at: i * 0.07 }); this.tone(f * 2, 0.3, { type: 'triangle', vol: 0.05, at: i * 0.07, verb: 0.3 }); });
    this.bellRing(level ? 1.1 : 0.5, 0.045, 0.1);
    if (level) { this.noise(1.2, { at: 0.35, vol: 0.12, type: 'highpass', freq: 6000, q: 0.4, verb: 0.5 }); this.tone(1568, 0.2, { type: 'sine', vol: 0.05, at: 0.45, slide: 1.4 }); }
  }
  // Sube de categoría el cartel (BIG → AWESOME → SUPER): barrido ascendente y golpe de platillo
  tierUp(level = 2) {
    if (!this.ok) return;
    this.noise(0.55, { vol: 0.25, type: 'bandpass', freq: 400, freqEnd: 6000, q: 1.5 });
    this.tone(200, 0.55, { type: 'sawtooth', vol: 0.06, slide: 4 });
    this.noise(1.8, { at: 0.5, vol: 0.3, type: 'highpass', freq: 5000, q: 0.4, verb: 0.6 });
    this.tone(50, 0.7, { vol: 0.6, at: 0.5, slide: 0.5 });
    this.brass(level >= 3 ? [587.3, 740, 880, 1174.7] : [523.3, 659.3, 784, 1046.5], 0.5, 0.9);
    this.bellRing(1.4, 0.05, 0.55);
  }
  // Fuego artificial: silbido de subida y estallido con chisporroteo
  firework(at = 0, vol = 0.18, launch = 0.5) {
    if (!this.ok) return;
    this.tone(900 + Math.random() * 400, launch, { type: 'sine', vol: vol * 0.25, at, slide: 2.4 });
    this.noise(launch, { at, vol: vol * 0.15, type: 'bandpass', freq: 2500, freqEnd: 6000, q: 5 });
    const b = at + launch;
    this.noise(0.9, { at: b, vol: vol * 1.4, buf: this.brownBuf, type: 'lowpass', freq: 700, freqEnd: 90, q: 0.6, verb: 0.7 });
    this.noise(0.08, { at: b, vol: vol, type: 'highpass', freq: 1200, q: 0.5 });
    this.noise(0.9, { at: b + 0.12, vol: vol * 0.35, buf: this.crackleBuf, type: 'highpass', freq: 3000, q: 0.6, verb: 0.4 });
  }
  // Entrada a un bono: sirena corta, redoble, platillo, fanfarria ascendente, timbre y público
  bonusFanfare(big = true) {
    if (!this.ok) return;
    this._fanfareT = performance.now();
    if (big) this.siren(0.9);
    const n = big ? 18 : 10;
    for (let i = 0; i < n; i++) { const at = i * 0.035; this.noise(0.05, { at, vol: 0.08 + 0.18 * i / n, type: 'bandpass', freq: 1800, q: 0.8 }); }
    const h = n * 0.035;
    this.noise(2, { at: h, vol: 0.3, type: 'highpass', freq: 5000, q: 0.4, verb: 0.6 });
    this.tone(55, 0.8, { vol: 0.6, at: h, slide: 0.5 });
    this.tataam(h, big ? 1.35 : 0.9, big ? 1.9 : 1.1);
    this.bellRing(big ? 1.6 : 0.8, 0.05, h);
    if (big) [0, 1].forEach(w => this.tone(1900 + w * 300, 0.35, { vol: 0.06, at: h + 0.5 + w * 0.45, slide: 1.35 }));
    if (big) [[700, 3], [1150, 4], [2400, 5]].forEach(([f, q], i) => this.crowd(2.4, 0.09, h + 0.1, f, q, i));
  }
  // Parafernalia de gran premio: redoble, platillo, bocinas, silbatos y público que celebra
  hype(level = 1) {
    if (!this.ok) return;
    const k = level; // 1 BIG · 2 AWESOME · 3 SUPER
    // Redoble de tambor en crescendo que remata con platillo
    const n = 10 + k * 4;
    for (let i = 0; i < n; i++) { const at = i * (0.6 / n); this.noise(0.05, { at, vol: 0.06 + 0.2 * i / n, type: 'bandpass', freq: 1800, q: 0.8 }); this.tone(190, 0.04, { vol: 0.05 + 0.1 * i / n, at, slide: 0.7 }); }
    const hit = 0.62;
    this.noise(2.2, { at: hit, vol: 0.32, type: 'highpass', freq: 5500, q: 0.4, verb: 0.6 });   // platillo
    this.tone(55, 0.8, { vol: 0.6, at: hit, slide: 0.5 });                                    // bombo
    // Bocina de estadio (acorde de sierras con vibrato)
    const blasts = k + 1;
    for (let b = 0; b < blasts; b++) {
      const at = hit + 0.05 + b * 0.42, len = b === blasts - 1 ? 0.75 : 0.3;
      [466.2, 587.3, 698.5].forEach(f => { this.tone(f, len, { type: 'sawtooth', vol: 0.05, at, attack: 0.02 }); this.tone(f * 1.006, len, { type: 'square', vol: 0.02, at, attack: 0.02 }); });
    }
    // Silbatos que suben
    for (let w = 0; w < k + 1; w++) this.tone(1900 + w * 250, 0.35, { type: 'sine', vol: 0.06, at: hit + 0.3 + w * 0.5, slide: 1.35 });
    // Público: murmullo que crece en un vítor (bandas de "vocales" moduladas) y aplausos
    const cr = 1.6 + k * 0.7;
    [[700, 3], [1150, 4], [2400, 5]].forEach(([f, q], i) => this.crowd(cr, 0.07 + k * 0.025, hit + 0.1, f, q, i));
    for (let i = 0; i < 26 + k * 18; i++) this.noise(0.03, { at: hit + 0.2 + Math.random() * cr, vol: 0.03 + Math.random() * 0.05, type: 'bandpass', freq: 1500 + Math.random() * 2500, q: 1.2 });
  }
  crowd(dur, vol, at, freq, q, seed) {
    const ctx = this.ctx, t0 = ctx.currentTime + at, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = this.noiseBuf; s.loop = true; f.type = 'bandpass'; f.Q.value = q;
    f.frequency.setValueAtTime(freq * 0.8, t0); f.frequency.linearRampToValueAtTime(freq * 1.15, t0 + dur * 0.3); f.frequency.linearRampToValueAtTime(freq, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.25);
    g.gain.setValueAtTime(vol, t0 + dur * 0.55); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    // Oscilación lenta: las voces de la multitud suben y bajan
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 3 + seed * 1.7; lg.gain.value = freq * 0.12;
    lfo.connect(lg); lg.connect(f.frequency); lfo.start(t0); lfo.stop(t0 + dur + 0.1);
    s.connect(f); f.connect(g); g.connect(this.sfxBus);
    const v = ctx.createGain(); v.gain.value = 0.4; g.connect(v); v.connect(this.verbSend);
    s.start(t0, Math.random()); s.stop(t0 + dur + 0.1);
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
  _brown(sec) {
    // Ruido marrón (grave y profundo): base del retumbo de los truenos
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; } }
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

  // --- Instrumentos temáticos ---
  // Gong chino: parciales graves inarmónicos con batido y cola larga
  gong(freq = 110, dur = 3, vol = 0.3, at = 0) {
    [1, 1.48, 2.02, 2.73, 3.6, 4.9].forEach((m, i) => this.tone(freq * m * (1 + (Math.random() - 0.5) * 0.004), dur / (1 + i * 0.35), { vol: vol / (1 + i * 0.9), at, attack: 0.012 + i * 0.01, verb: 0.9 }));
    this.noise(0.25, { at, vol: vol * 0.5, type: 'lowpass', freq: 900, q: 0.5 });
  }
  // Bloque de madera (muyu)
  wood(at = 0, vol = 0.18, f = 900) { this.tone(f, 0.06, { type: 'square', vol: vol * 0.5, at, attack: 0.001 }); this.tone(f * 1.5, 0.05, { vol, at, attack: 0.001 }); this.noise(0.03, { at, vol: vol * 0.8, freq: f * 2.2, q: 6 }); }
  // Cuerda pulsada tipo guzheng: ataque brillante, leve bajada de afinación y cola corta
  pluck(freq, at = 0, vol = 0.12, dur = 0.9) {
    if (!this.ok) return;
    const ctx = this.ctx, t0 = ctx.currentTime + at, f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'lowpass'; f.frequency.setValueAtTime(freq * 8, t0); f.frequency.exponentialRampToValueAtTime(freq * 1.5, t0 + dur * 0.6);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    f.connect(g); g.connect(this.sfxBus); const v = ctx.createGain(); v.gain.value = 0.5; g.connect(v); v.connect(this.verbSend);
    ['sawtooth', 'triangle'].forEach((ty, i) => { const o = ctx.createOscillator(); o.type = ty; o.frequency.setValueAtTime(freq * (1.012 + i * 0.002), t0); o.frequency.exponentialRampToValueAtTime(freq, t0 + 0.08); o.connect(f); o.start(t0); o.stop(t0 + dur + 0.05); });
  }
  // Celesta / caja de música: seno con parciales altos y mucha reverb
  celesta(freq, at = 0, vol = 0.1, dur = 1.3) {
    this.tone(freq, dur, { vol, at, attack: 0.002, verb: 0.8 });
    this.tone(freq * 4, dur * 0.35, { vol: vol * 0.3, at, attack: 0.002, verb: 0.8 });
    this.tone(freq * 6.8, dur * 0.18, { vol: vol * 0.12, at, attack: 0.002 });
  }
  // Cascabeles de trineo: ráfaga de ruido agudo con varios golpecitos
  jingle(at = 0, vol = 0.1) { for (let i = 0; i < 4; i++) { this.noise(0.07, { at: at + i * 0.018, vol: vol * (1 - i * 0.2), type: 'bandpass', freq: 6500 + Math.random() * 2500, q: 7 }); } this.tone(5200 + Math.random() * 800, 0.12, { vol: vol * 0.25, at }); }
  // Petardos: estallidos secos al azar
  firecrackers(n = 14, at = 0, vol = 0.3) { for (let i = 0; i < n; i++) { const t = at + i * 0.06 + Math.random() * 0.05; this.noise(0.05, { at: t, vol: vol * (0.5 + Math.random() * 0.5), type: 'highpass', freq: 1500, q: 0.7 }); this.tone(180 + Math.random() * 120, 0.05, { type: 'square', vol: vol * 0.25, at: t, slide: 0.4 }); } }
  // Viento helado: ruido filtrado que sube y baja
  wind(dur = 1.6, vol = 0.18, at = 0) { this.noise(dur, { at, vol, type: 'bandpass', freq: 500, freqEnd: 1800, q: 3, verb: 0.4 }); this.noise(dur * 0.8, { at: at + 0.2, vol: vol * 0.6, type: 'bandpass', freq: 1400, freqEnd: 600, q: 5 }); }
  // Aullido de lobo: voz que sube, sostiene con vibrato y cae, con un poco de aire
  // Muestras de audio (WAV generados en tools/): se descargan al inicio y se decodifican al activar el audio
  preload(name, url) {
    this._raw = this._raw || {}; this.samples = this.samples || {};
    fetch(url).then(r => r.ok ? r.arrayBuffer() : null).then(b => { if (b) { this._raw[name] = b; this._decode(); } }).catch(() => { });
  }
  _decode() {
    if (!this.ctx || !this._raw) return;
    Object.keys(this._raw).forEach(k => { const b = this._raw[k]; delete this._raw[k]; this.ctx.decodeAudioData(b).then(buf => { this.samples[k] = buf; }).catch(() => { }); });
  }
  play(name, { at = 0, vol = 1, rate = 1, verb = 0 } = {}) {
    const buf = this.samples && this.samples[name]; if (!this.ok || !buf) return false;
    const ctx = this.ctx, t0 = ctx.currentTime + at, s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = buf; s.playbackRate.value = rate; g.gain.value = vol;
    s.connect(g); g.connect(this.sfxBus);
    if (verb) { const v = ctx.createGain(); v.gain.value = verb; g.connect(v); v.connect(this.verbSend); }
    s.start(t0); return true;
  }
  // Aullido: grabación sintetizada con detalle (assets/sfx/howl.wav); variación de tono en cada uso
  howl(at = 0, vol = 0.22, f0 = 330) {
    if (this.play('howl', { at, vol: Math.min(1, vol * 3.2), rate: (f0 / 330) * (0.94 + Math.random() * 0.1), verb: 0.25 })) return;
    this._howlSynth(at, vol, f0);
  }
  _howlSynth(at = 0, vol = 0.22, f0 = 330) {
    if (!this.ok) return;
    const ctx = this.ctx, t0 = ctx.currentTime + at, d = 2.2, o = ctx.createOscillator(), o2 = ctx.createOscillator(), vib = ctx.createOscillator(), vg = ctx.createGain(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o2.type = 'sine';
    [o, o2].forEach((os, i) => { const m = i ? 2 : 1; os.frequency.setValueAtTime(f0 * 0.7 * m, t0); os.frequency.exponentialRampToValueAtTime(f0 * 1.35 * m, t0 + 0.45); os.frequency.setValueAtTime(f0 * 1.35 * m, t0 + 1.4); os.frequency.exponentialRampToValueAtTime(f0 * 0.8 * m, t0 + d); });
    vib.frequency.value = 5; vg.gain.value = f0 * 0.02; vib.connect(vg); vg.connect(o.frequency); vg.connect(o2.frequency);
    f.type = 'bandpass'; f.frequency.value = f0 * 2.6; f.Q.value = 1.4;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.3); g.gain.setValueAtTime(vol, t0 + 1.5); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(this.sfxBus);
    const v = ctx.createGain(); v.gain.value = 0.9; g.connect(v); v.connect(this.verbSend);
    [o, o2, vib].forEach(n => { n.start(t0); n.stop(t0 + d + 0.05); });
    this.noise(d * 0.8, { at: at + 0.1, vol: vol * 0.12, type: 'bandpass', freq: f0 * 3, q: 2 });
  }
  // Tambor de ceremonia
  drum(at = 0, vol = 0.5, f = 90) { this.tone(f, 0.35, { vol, at, slide: 0.55, attack: 0.003 }); this.noise(0.08, { at, vol: vol * 0.3, type: 'lowpass', freq: 900, q: 0.7 }); }
  // Escalas pentatónicas de los temas
  _scale(i) {
    const china = [0, 2, 4, 7, 9], snow = [0, 3, 5, 7, 10], sc = this.theme === 'snow' || this.theme === 'wolf' ? snow : china, base = this.theme === 'snow' ? 293.66 : 220;
    return base * Math.pow(2, (sc[((i % 5) + 5) % 5] + 12 * Math.floor(i / 5)) / 12);
  }

  // --- Efectos de juego ---
  click() { this.tone(1800, 0.04, { type: 'square', vol: 0.05 }); }
  button() { this.tone(660, 0.06, { type: 'triangle', vol: 0.12 }); this.tone(990, 0.08, { type: 'sine', vol: 0.08, at: 0.03 }); }

  spinStart(turbo) {
    if (!this.ok) return;
    if (this.theme === 'china') { [0, 1, 2, 3, 4, 5].forEach(i => this.pluck(this._scale(i), i * 0.035, 0.07, 0.5)); this.startLoop('reels', turbo ? 1.35 : 1); return; }
    if (this.theme === 'wolf') { this.drum(0, 0.35, 110); this.drum(0.08, 0.25, 90); this.noise(0.35, { vol: 0.12, type: 'highpass', freq: 5000, q: 0.6 }); this.startLoop('reels', turbo ? 1.35 : 1); return; }
    if (this.theme === 'gold') { this.noise(0.3, { vol: 0.22, freq: 400, freqEnd: 5000, q: 3 }); this.tone(220, 0.25, { type: 'sawtooth', vol: 0.08, slide: 2 }); this.coin(0.05); this.startLoop('reels', turbo ? 1.35 : 1); return; }
    if (this.theme === 'snow') { this.wind(0.6, 0.14); [7, 6, 5, 4].forEach((n, i) => this.celesta(this._scale(n), i * 0.04, 0.035, 0.6)); this.startLoop('reels', turbo ? 1.35 : 1); return; }
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
    if (this.theme === 'wolf') { this.drum(0, 0.45, 96 - i * 4); this.noise(0.05, { vol: 0.18, freq: 2600, q: 2 }); if (last) this.stopLoop('reels'); return; }
    if (this.theme === 'gold') { this.tone(120 - i * 5, 0.18, { vol: 0.5, slide: 0.4 }); this.noise(0.05, { vol: 0.25, freq: 3000, q: 2 }); this.tone(1760 + i * 110, 0.15, { vol: 0.05, verb: 0.3 }); if (last) this.stopLoop('reels'); return; }
    if (this.theme === 'china') { this.wood(0, 0.2, 820 + i * 60); this.tone(95, 0.2, { vol: 0.35, slide: 0.5 }); if (last) this.stopLoop('reels'); return; }
    if (this.theme === 'snow') { this.celesta(this._scale(5 + i), 0, 0.05, 0.5); this.tone(130 - i * 5, 0.14, { vol: 0.3, slide: 0.5 }); this.noise(0.04, { vol: 0.12, type: 'highpass', freq: 6000 }); if (last) this.stopLoop('reels'); return; }
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
    if (this.theme === 'china') { this.gong(220 * Math.pow(2, [0, 2, 4, 7, 9][n % 5] / 12), 1.4, 0.1); this.pluck(this._scale(5 + n % 10), 0.02, 0.07); this.zap(0.15, 0.08); return; }
    if (this.theme === 'snow') { this.celesta(this._scale(5 + n % 10), 0, 0.12); this.celesta(this._scale(10 + n % 10), 0.05, 0.05); this.noise(0.2, { vol: 0.08, type: 'highpass', freq: 7000, verb: 0.5 }); this.zap(0.12, 0.06); return; }
    const f = 523.25 * Math.pow(2, (n % 12) / 12);
    this.bell(f, 1.0, 0.14);
    this.tone(f * 2, 0.25, { type: 'triangle', vol: 0.05, at: 0.02 });
    this.zap(0.18, 0.12);
  }
  zap(dur = 0.35, vol = 0.18, at = 0) {
    this.noise(dur, { at, vol, buf: this.crackleBuf, type: 'highpass', freq: 1800, q: 0.7 });
    this.noise(dur * 0.6, { at, vol: vol * 0.6, type: 'bandpass', freq: 5000, freqEnd: 1200, q: 4 });
  }
  // Retumbo que "rueda": ruido marrón filtrado con varias oleadas irregulares de volumen
  rumble(dur = 3, vol = 0.5, at = 0, cutoff = 220) {
    if (!this.ok) return;
    const ctx = this.ctx, t0 = ctx.currentTime + at, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = this.brownBuf; s.loop = true;
    f.type = 'lowpass'; f.frequency.setValueAtTime(cutoff * 2.2, t0); f.frequency.exponentialRampToValueAtTime(cutoff * 0.45, t0 + dur); f.Q.value = 0.7;
    f2.type = 'highshelf'; f2.frequency.value = 400; f2.gain.value = -8;
    g.gain.setValueAtTime(0.0001, t0);
    // oleadas: cada una sube rápido y cae lento, más débiles hacia el final
    let t = t0 + 0.02; const n = 3 + (Math.random() * 3 | 0);
    for (let i = 0; i < n && t < t0 + dur - 0.3; i++) {
      const peak = vol * (1 - i / (n + 1)) * (0.6 + Math.random() * 0.4);
      g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), t + 0.06 + Math.random() * 0.18);
      t += 0.35 + Math.random() * (dur / n);
      g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak * 0.25), Math.min(t, t0 + dur - 0.2));
    }
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(f2); f2.connect(g); g.connect(this.sfxBus);
    const v = ctx.createGain(); v.gain.value = 0.6; g.connect(v); v.connect(this.verbSend);
    s.start(t0, Math.random() * 2); s.stop(t0 + dur + 0.1);
  }
  // Chasquido del rayo: estallido seco de banda ancha + desgarro que baja
  crack(vol = 0.5, at = 0) {
    this.noise(0.035, { at, vol, type: 'highpass', freq: 900, q: 0.5 });
    this.noise(0.06, { at: at + 0.03, vol: vol * 0.7, type: 'bandpass', freq: 3200, q: 0.8 });
    this.noise(0.4, { at: at + 0.02, vol: vol * 0.45, buf: this.crackleBuf, type: 'bandpass', freq: 2600, freqEnd: 500, q: 0.9 });
    this.noise(0.25, { at: at + 0.04, vol: vol * 0.6, type: 'lowpass', freq: 1200, freqEnd: 150, q: 0.5 });
  }
  // Trueno realista: chasquido cercano y retumbo largo que rueda
  thunder(vol = 0.7) {
    this.crack(vol * 0.75);
    this.rumble(3.2, vol * 0.9, 0.05, 240);
    this.tone(48, 1.4, { type: 'sine', vol: vol * 0.35, slide: 0.6, at: 0.05, attack: 0.03 });
  }
  // Rayo corto con trueno para cada bola cobrada (sube de tono con el conteo)
  // Cada bola cobrada: chasquido + retumbo. Los retumbos se encadenan como una tormenta;
  // se van atenuando para no saturar cuando hay muchas bolas seguidas
  lightning(n = 0, big = false) {
    const k = big ? 1 : Math.max(0.6, 1 - n * 0.02);
    // estallido: doble chasquido seco y golpe grave que se siente
    this.crack((big ? 1 : 0.8) * k);
    this.crack((big ? 0.7 : 0.5) * k, 0.07);
    this.tone(58, big ? 1.2 : 0.7, { type: 'sine', vol: (big ? 0.9 : 0.7) * k, slide: 0.5, attack: 0.004 });
    this.tone(110, 0.35, { type: 'triangle', vol: 0.4 * k, slide: 0.45, attack: 0.003 });
    // retumbo largo y fuerte (con cuerpo en medios para que se oiga en el parlante del teléfono)
    this.rumble(big ? 4 : 2.6 + Math.random() * 0.8, (big ? 1.2 : 0.8) * k, 0.03 + Math.random() * 0.05, big ? 260 : 320);
    this.noise(big ? 1.4 : 0.9, { at: 0.05, vol: 0.35 * k, type: 'bandpass', freq: 450, freqEnd: 140, q: 0.8, verb: 0.5 });
  }
  // Cortina / barrera que sube (o baja): roce de tela, poleas y tope al enrollarse
  // kind: 'fabric' (tela lacada), 'ice' (placa de hielo), 'glass' (barrera de vidrio con riel)
  curtain(rows = 1, kind = 'fabric', up = true, dur = 0.6) {
    if (!this.ok) return;
    const ctx = this.ctx, t0 = ctx.currentTime, d = Math.max(0.2, dur), k = Math.min(1, 0.45 + rows * 0.13);
    // Barrido con envolvente (sube y se apaga), no un golpe de ruido
    const sweep = (buf, type, f0, f1, q, vol, at = 0, len = d) => {
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), t = t0 + at;
      s.buffer = buf; s.loop = true; f.type = type; f.Q.value = q;
      f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + len);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + len * 0.25);
      g.gain.setValueAtTime(vol, t + len * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.08);
      s.connect(f); f.connect(g); g.connect(this.sfxBus);
      const v = ctx.createGain(); v.gain.value = 0.25; g.connect(v); v.connect(this.verbSend);
      s.start(t, Math.random()); s.stop(t + len + 0.15);
    };
    const vol = (up ? 1 : 0.55) * k;
    const lo = up ? 1 : 1.6, hi = up ? 1.6 : 1; // al subir el roce se vuelve más agudo; al bajar, más grave
    if (kind === 'ice') {
      sweep(this.noiseBuf, 'bandpass', 2600 * lo, 2600 * hi * 1.6, 3, 0.1 * vol);        // placa deslizando
      sweep(this.crackleBuf, 'highpass', 3500, 5000, 0.7, 0.08 * vol);                   // crujido del hielo
      sweep(this.brownBuf, 'lowpass', 300, 180, 0.7, 0.2 * vol); // arrastre grave
      if (up) { [0, 1, 2].forEach(i => this.celesta(this._scale(9 + i * 2), d * 0.85 + i * 0.05, 0.04)); this.noise(0.25, { at: d, vol: 0.06, type: 'highpass', freq: 7000, verb: 0.5 }); }
      else this.tone(160, 0.2, { vol: 0.12 * vol, at: d, slide: 0.6 });
      return;
    }
    if (kind === 'glass') {
      sweep(this.noiseBuf, 'bandpass', 900 * lo, 900 * hi * 1.8, 2, 0.12 * vol);          // aire
      sweep(this.brownBuf, 'lowpass', 260, 160, 0.8, 0.22 * vol); // motor del riel
      this.tone(up ? 70 : 90, d, { type: 'sawtooth', vol: 0.025 * vol, slide: up ? 1.5 : 0.7 });
      // Traqueteo del riel metálico
      const n = Math.round(4 + rows * 3);
      for (let i = 0; i < n; i++) { const at = d * (i / n) * (0.7 + 0.3 * i / n); this.noise(0.025, { at, vol: 0.05 * vol, freq: 3800 + Math.random() * 900, q: 8 }); }
      this.tone(up ? 180 : 130, 0.18, { vol: 0.2 * vol, at: d, slide: 0.5 }); this.noise(0.06, { at: d, vol: 0.1 * vol, freq: 2400, q: 3 });
      return;
    }
    // Tela: roce + frufrú + cuerda en la polea + tope del rollo
    sweep(this.noiseBuf, 'bandpass', 500 * lo, 500 * hi * 2.2, 0.9, 0.2 * vol);
    sweep(this.crackleBuf, 'bandpass', 2200, 3400, 1.2, 0.1 * vol, 0.03);
    sweep(this.noiseBuf, 'highpass', 4500, 6500, 0.6, 0.05 * vol, 0.05, d * 0.9);
    const n = Math.round(3 + rows * 2.5);
    for (let i = 0; i < n; i++) {
      const at = d * 0.08 + d * 0.8 * Math.pow(i / n, up ? 0.8 : 1.2);
      this.tone(1150 + (up ? i * 25 : -i * 20), 0.03, { type: 'triangle', vol: 0.03 * vol, at, attack: 0.002 });
      this.noise(0.02, { at, vol: 0.035 * vol, freq: 2600, q: 6 });
    }
    this.tone(up ? 150 : 110, 0.22, { vol: 0.18 * vol, at: d, slide: 0.55 });        // el rollo llega al tope
    this.noise(0.12, { at: d, vol: 0.08 * vol, type: 'lowpass', freq: 900, q: 0.6 });
    if (up && this.theme === 'china') this.bell(1760, 0.6, 0.04, d + 0.03);             // borlas / cascabel
  }
  rowUnlock(level = 0) {
    if (this.theme === 'china') { this.gong(98 * Math.pow(2, level / 12), 2.2, 0.35); [0, 1, 2, 3].forEach(i => this.pluck(this._scale(5 + level + i), 0.2 + i * 0.07, 0.1)); return; }
    if (this.theme === 'snow') { this.shatter(level); this.wind(1, 0.12); [0, 1, 2, 3].forEach(i => this.celesta(this._scale(5 + level + i), 0.15 + i * 0.07, 0.08)); return; }
    this.thunder(0.6);
    const base = 392 * Math.pow(2, level / 6);
    [1, 1.25, 1.5, 2].forEach((m, i) => this.tone(base * m, 0.9, { type: 'triangle', vol: 0.12, at: 0.25 + i * 0.07, verb: 0.5 }));
  }
  // Trompetas de la entrada: se omiten si enseguida suena la fanfarria del bono (no se tapan)
  _fsBrass(chord, at, dur) { setTimeout(() => { if (performance.now() - (this._fanfareT || 0) < 600) return; this.brass(chord, Math.max(0, at - 0.04), dur); }, 40); }
  featureStart() {
    if (this.theme === 'wolf') { this.howl(0, 0.3, 320); for (let i = 0; i < 10; i++) this.drum(0.2 + i * 0.16, 0.5, i % 2 ? 80 : 110); this._fsBrass([220, 261.6, 329.6, 440], 1.6, 1.4); return; }
    if (this.theme === 'china') { this.gong(82, 3.5, 0.5); this.firecrackers(18, 0.3); [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(i => this.pluck(this._scale(i + 3), 0.9 + i * 0.06, 0.09)); this._fsBrass([293.7, 370, 440, 587.3], 1.5, 1.4); return; }
    if (this.theme === 'snow') { this.wind(2.4, 0.22); this.shatter(3); for (let i = 0; i < 12; i++) this.celesta(this._scale(14 - i), 0.3 + i * 0.07, 0.07); for (let i = 0; i < 8; i++) this.jingle(0.4 + i * 0.12, 0.08); this._fsBrass([293.7, 349.2, 440, 587.3], 1.3, 1.6); return; }
    this.thunder(0.8);
    const seq = [392, 523, 659, 784, 1047, 1319];
    seq.forEach((f, i) => { this.tone(f, 0.5, { type: 'sawtooth', vol: 0.06, at: 0.3 + i * 0.09, verb: 0.4 }); this.bell(f, 0.8, 0.07, 0.3 + i * 0.09); });
    this._fsBrass([261.6, 329.6, 392, 523.3], 0.95, 1.2);
  }
  // Fanfarria de trompetas "ta-taaaam": golpe corto y acorde largo sostenido con vibrato y timbal
  tataam(at = 0, vol = 1, hold = 1.9) {
    if (!this.ok) return;
    const ctx = this.ctx;
    const horn = (chord, t, dur, peak, vib) => {
      const t0 = ctx.currentTime + t, f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = 'lowpass'; f.Q.value = 1.2;
      f.frequency.setValueAtTime(700, t0); f.frequency.exponentialRampToValueAtTime(4200, t0 + 0.07); f.frequency.exponentialRampToValueAtTime(2600, t0 + Math.min(0.5, dur));
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + 0.03);
      g.gain.setTargetAtTime(peak * 0.75, t0 + 0.06, 0.08);
      g.gain.setValueAtTime(peak * 0.75, t0 + dur * 0.72); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      f.connect(g); g.connect(this.sfxBus);
      const v = ctx.createGain(); v.gain.value = 0.6; g.connect(v); v.connect(this.verbSend);
      let lfo = null;
      if (vib) { lfo = ctx.createOscillator(); const lg = ctx.createGain(); lfo.frequency.value = 5.5; lg.gain.setValueAtTime(0, t0); lg.gain.linearRampToValueAtTime(14, t0 + 0.5); lfo.connect(lg); lfo.start(t0); lfo.stop(t0 + dur + 0.05); lfo._g = lg; }
      chord.forEach(fr => [-6, 0, 7].forEach(dt => {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = dt;
        if (lfo) lfo._g.connect(o.detune);
        o.connect(f); o.start(t0); o.stop(t0 + dur + 0.05);
      }));
    };
    // "ta" (sol mayor, corto)  →  "taaaam" (do mayor brillante, sostenido)
    horn([392, 493.9, 587.3, 784], at, 0.2, 0.1 * vol, false);
    horn([523.3, 659.3, 784, 1046.5], at + 0.24, hold, 0.13 * vol, true);
    horn([130.8, 261.6], at + 0.24, hold, 0.09 * vol, false);
    // Timbales y platillo en cada golpe
    this.tone(98, 0.35, { vol: 0.5 * vol, at, slide: 0.7 });
    this.tone(65.4, hold * 0.6, { vol: 0.65 * vol, at: at + 0.24, slide: 0.8, verb: 0.4 });
    this.noise(hold, { at: at + 0.24, vol: 0.22 * vol, type: 'highpass', freq: 6000, q: 0.4, verb: 0.6 });
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
    if (this.theme === 'wolf') { for (let i = 0; i < 3 + level * 2; i++) this.tone(this._scale(5 + i) , 0.35, { type: 'triangle', vol: 0.09, at: i * 0.08, verb: 0.5 }); this.drum(0, 0.4, 100); if (level >= 2) this.howl(0.2, 0.18, 360); return; }
    if (this.theme === 'gold') { const ch = [[261.6, 329.6, 392], [293.7, 370, 440], [329.6, 415.3, 493.9]]; this.brass(ch[Math.min(2, level)], 0, 0.35); this.brass(ch[Math.min(2, level)].map(f => f * 1.5), 0.18, 0.5); for (let i = 0; i < 3 + level * 2; i++) this.coin(0.1 + i * 0.07); return; }
    if (this.theme === 'china') { for (let i = 0; i < 4 + level * 2; i++) this.pluck(this._scale(5 + i), i * 0.07, 0.1); if (level >= 2) this.gong(147, 2, 0.2); return; }
    if (this.theme === 'snow') { for (let i = 0; i < 4 + level * 2; i++) this.celesta(this._scale(5 + i), i * 0.07, 0.09); if (level >= 1) this.jingle(0.1, 0.09); return; }
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
    this.hype(level);
    if (this.theme === 'china') { this.gong(98, 3, 0.4); this.firecrackers(10 + level * 6, 0.2, 0.22); }
    if (this.theme === 'snow') { for (let i = 0; i < 10 + level * 4; i++) this.jingle(i * 0.11, 0.07); this.wind(1.5, 0.12); }
    const chords = [[261.6, 329.6, 392], [349.2, 440, 523.3], [392, 493.9, 587.3], [523.3, 659.3, 784, 1046.5]];
    chords.forEach((c, i) => this.brass(c, i * 0.32, i === 3 ? 1.8 : 0.4));
    this.tone(65, 0.5, { vol: 0.5, slide: 0.5 }); this.tone(65, 0.5, { vol: 0.5, slide: 0.5, at: 0.96 });
    for (let i = 0; i < 6 + level * 4; i++) this.coin(0.4 + i * 0.09);
  }
  // Jackpot: sirena + carillón + metales; más largo cuanto mayor el nivel (0 mini … 3 grand)
  jackpot(level = 1) {
    if (this.theme === 'china') { this.gong(73, 4, 0.45); this.firecrackers(20 + level * 8, 0.4, 0.25); }
    if (this.theme === 'snow') { for (let i = 0; i < 16; i++) this.celesta(this._scale(16 - i), 0.2 + i * 0.05, 0.06); for (let i = 0; i < 10; i++) this.jingle(0.3 + i * 0.1, 0.07); }
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
      // Códice del Sol: tambores tribales y flautas
      jungle: { bpm: 104, root: 41, prog: [[0, M], [10, J], [8, J], [7, M]], kick: 'x..x....x..x....', snare: '......x.......x.', hat: 'x.xx.xx.x.xx.xx.', bass: [0, -1, 0, 3, -1, 5, -1, 7], arp: 'updown', lead: 'triangle', pad: 'sine', bells: 0.3, toms: true },
      // Arrecife: suave, acuático
      ocean: { bpm: 84, root: 52, prog: [[0, J], [9, M], [5, J], [7, J]], kick: 'x.......x.......', snare: '................', hat: '....x.......x...', bass: [0, -1, -1, 7, -1, -1, 5, -1], arp: 'up', lead: 'sine', pad: 'sine', bells: 0.65 },
      // Duelo del Oeste: galope con guitarra
      western: { bpm: 118, root: 40, prog: [[0, M], [5, M], [7, J], [0, M]], kick: 'x..x..x.x..x..x.', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', bass: [0, -1, 7, -1, 0, -1, 7, -1], arp: 'down', lead: 'triangle', pad: 'sawtooth', bells: 0.15 },
      // Galaxia: sintetizador espacial
      space: { bpm: 92, root: 38, prog: [[0, M], [3, J], [10, J], [5, M]], kick: 'x.......x.......', snare: '....x.......x...', hat: '..x...x...x...x.', bass: [0, -1, 12, -1, 7, -1, 10, -1], arp: 'updown', lead: 'sawtooth', pad: 'sine', bells: 0.5 },
      // Sueño Rojo: pentatónica china, guzheng en arpegio, erhu en la melodía, bloque de madera y gong
      china: { bpm: 90, root: 50, prog: [[0, J], [9, M], [7, J], [0, J]], kick: 'x.......x..x....', snare: '................', hat: '................', bass: [0, -1, 7, -1, 9, -1, 7, -1], arp: 'updown', lead: 'pluck', pad: 'sine', bells: 0.1, toms: true,
        scale: [0, 2, 4, 7, 9], mel: 'erhu', wood: 'x..x..x...x.x...', gong: 4,
        melody: [5, -1, 6, 7, 6, 5, 3, -2, 2, 3, 5, -2, 3, 2, 0, -2, 3, 5, 6, 8, 7, 6, 5, -2, 6, 5, 3, 2, 3, -2, -2, -1] },
      chinaBonus: { bpm: 132, root: 50, prog: [[0, J], [7, J], [9, M], [5, J]], kick: 'x...x...x...x...', snare: '....x.......x...', hat: '................', bass: [0, 12, 7, 12, 9, 12, 7, 12], arp: 'up', lead: 'pluck', pad: 'sine', bells: 0.2, toms: true,
        scale: [0, 2, 4, 7, 9], mel: 'dizi', wood: 'x.xxx.xxx.xxx.xx', gong: 1,
        melody: [5, 6, 7, 8, 7, 6, 5, 3, 5, 6, 7, -2, 6, 5, 6, -2, 7, 8, 10, 8, 7, 6, 5, 6, 7, 6, 5, 3, 5, -2, -2, -1] },
      // Reino de Nieve: caja de música/celesta, cascabeles de trineo y viento helado
      snow: { bpm: 78, root: 50, prog: [[0, M], [8, J], [3, J], [10, J]], kick: 'x.......x.......', snare: '................', hat: '................', bass: [0, -1, -1, -1, 7, -1, -1, -1], arp: 'updown', lead: 'celesta', pad: 'sine', bells: 0.5,
        scale: [0, 3, 5, 7, 10], mel: 'celesta', jingle: '....x.......x.x.', wind: true,
        melody: [5, -2, 7, -2, 8, -2, 7, 6, 5, -2, -2, 3, 4, -2, -2, -1, 3, -2, 5, -2, 6, -2, 5, 4, 4, -2, -2, 2, 1, -2, -2, -1] },
      snowBonus: { bpm: 124, root: 50, prog: [[0, J], [5, J], [7, J], [0, J]], kick: 'x...x...x...x...', snare: '....x.......x...', hat: '................', bass: [0, 12, 7, 12, 0, 12, 7, 12], arp: 'up', lead: 'celesta', pad: 'sine', bells: 0.5,
        scale: [0, 2, 4, 7, 9], mel: 'celesta', jingle: 'x.x.x.x.x.x.x.x.', wind: true,
        melody: [5, 7, 8, 7, 5, 7, 8, 10, 9, -2, 8, 7, 6, -2, 5, -2, 6, 8, 9, 8, 6, 8, 9, 11, 10, -2, 9, 8, 7, -2, -2, -1] },
      // Xtension Link: disco-funk dorado con melodía de sintetizador
      gold: { bpm: 124, root: 45, prog: [[0, M], [8, J], [3, J], [10, J]], kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', bass: [0, 12, 0, 12, 7, 12, 10, 12], arp: 'up', lead: 'square', pad: 'sawtooth', bells: 0.3,
        scale: [0, 3, 5, 7, 10], mel: 'synth', claps: true,
        melody: [5, -2, 7, 8, 7, 5, 3, -2, 5, -2, 7, 8, 10, -2, 8, 7, 8, -2, 7, 5, 7, -2, 3, 5, 3, 2, 3, 5, 5, -2, -2, -1] },
      goldBonus: { bpm: 140, root: 48, prog: [[0, J], [7, J], [9, M], [5, J]], kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.xxx.xxx.xxx.xx', bass: [0, 12, 0, 12, 7, 12, 0, 12], arp: 'up', lead: 'square', pad: 'sawtooth', bells: 0.45,
        scale: [0, 2, 4, 7, 9], mel: 'synth', claps: true,
        melody: [5, 7, 8, 10, 8, 7, 5, -2, 6, 8, 9, -2, 8, 7, 6, -2, 7, 9, 10, 12, 10, 9, 7, -2, 8, 7, 6, 5, 5, -2, -2, -1] },
      // Carrera del Lobo: flauta nativa, tambores de ceremonia y sonajas
      wolf: { bpm: 84, root: 45, prog: [[0, M], [10, J], [8, J], [7, M]], kick: 'x.......x.x.....', snare: '................', hat: '..x...x...x...x.', bass: [0, -1, -1, 7, -1, -1, 10, -1], arp: 'updown', lead: 'triangle', pad: 'sine', bells: 0.15, toms: true,
        scale: [0, 3, 5, 7, 10], mel: 'dizi', wood: 'x...x..xx...x...',
        melody: [7, -2, 8, 7, 5, -2, -2, -1, 5, 7, 8, -2, 10, -2, 8, -2, 7, -2, 5, 3, 5, -2, -2, -1, 3, 5, 7, 5, 3, -2, 2, -2] },
      wolfBonus: { bpm: 128, root: 45, prog: [[0, M], [8, J], [10, J], [7, M]], kick: 'x..x..x.x..x..x.', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', bass: [0, 12, 0, 7, 0, 12, 10, 7], arp: 'up', lead: 'triangle', pad: 'sawtooth', bells: 0.25, toms: true,
        scale: [0, 3, 5, 7, 10], mel: 'dizi', wood: 'x.xxx.xxx.xxx.xx',
        melody: [5, 7, 8, 10, 8, 7, 5, -2, 7, 8, 10, -2, 12, -2, 10, 8, 7, 8, 10, 8, 7, 5, 3, -2, 5, 7, 5, 3, 2, -2, -2, -1] },
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
    // Instrumentos de los temas (van al bus de música)
    const pluckM = (f, t, v, d = step * 5) => { const fl = ctx.createBiquadFilter(), g = ctx.createGain(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(f * 8, t); fl.frequency.exponentialRampToValueAtTime(f * 1.5, t + d * 0.6); env(g, t, 0.004, v, d); fl.connect(g); g.connect(bus);
      ['sawtooth', 'triangle'].forEach((ty, k) => { const o = ctx.createOscillator(); o.type = ty; o.frequency.setValueAtTime(f * (1.012 + k * 0.002), t); o.frequency.exponentialRampToValueAtTime(f, t + 0.08); o.connect(fl); o.start(t); o.stop(t + d + 0.05); }); };
    const celestaM = (f, t, v, d = 1.2) => { osc('sine', f, t, d, v, bus, 0.002); osc('sine', f * 4, t, d * 0.35, v * 0.3, bus, 0.002); osc('sine', f * 6.8, t, d * 0.18, v * 0.1, bus, 0.002); };
    // Erhu / dizi: voz sostenida con vibrato y leve deslizamiento hacia la nota
    const voiceM = (f, t, d, v, breathy) => { const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain(), vib = ctx.createOscillator(), vg = ctx.createGain();
      o.type = breathy ? 'triangle' : 'sawtooth'; o.frequency.setValueAtTime(f * 0.97, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.07);
      vib.frequency.value = 5.5; vg.gain.value = f * 0.012; vib.connect(vg); vg.connect(o.frequency);
      fl.type = 'lowpass'; fl.frequency.value = breathy ? 3200 : 1900; fl.Q.value = 2;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.07); g.gain.setValueAtTime(v, t + Math.max(0.08, d - 0.08)); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(fl); fl.connect(g); g.connect(bus); o.start(t); vib.start(t); o.stop(t + d + 0.05); vib.stop(t + d + 0.05);
      if (breathy) noiseHit(t, 'bandpass', f * 2, d * 0.5, v * 0.25, 3); };
    // Sintetizador principal (disco): dos dientes de sierra desafinados con filtro que se abre
    const synthM = (f, t, d, v) => { const fl = ctx.createBiquadFilter(), g = ctx.createGain(); fl.type = 'lowpass'; fl.Q.value = 4;
      fl.frequency.setValueAtTime(f * 2, t); fl.frequency.exponentialRampToValueAtTime(f * 7, t + 0.05); fl.frequency.exponentialRampToValueAtTime(f * 3, t + d);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.setValueAtTime(v * 0.8, t + Math.max(0.02, d - 0.06)); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      [-8, 8].forEach(det => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(fl); o.start(t); o.stop(t + d + 0.05); });
      fl.connect(g); g.connect(bus); };
    const clapM = t => { [0, 0.012, 0.024].forEach(dt => noiseHit(t + dt, 'bandpass', 1400, 0.09, 0.18, 1.5)); };
    const woodM = t => { osc('square', 880, t, 0.05, 0.05, bus, 0.001); osc('sine', 1320, t, 0.05, 0.12, bus, 0.001); };
    const jingleM = t => { for (let k = 0; k < 3; k++) noiseHit(t + k * 0.018, 'bandpass', 6500 + Math.random() * 2500, 0.07, 0.07 * (1 - k * 0.25), 7); };
    const gongM = (t, f = 82) => [1, 1.48, 2.02, 2.73].forEach((mm, k) => osc('sine', f * mm, t, 3 / (1 + k * 0.4), 0.09 / (1 + k), bus, 0.015));
    const scaleHz = d => hz(st.root + 24 + st.scale[((d % 5) + 5) % 5] + 12 * Math.floor(d / 5));
    // Viento de fondo continuo (Reino de Nieve)
    if (st.wind) { const ws = ctx.createBufferSource(), wf = ctx.createBiquadFilter(), wg = ctx.createGain(), wl = ctx.createOscillator(), wlg = ctx.createGain();
      ws.buffer = this.noiseBuf; ws.loop = true; wf.type = 'bandpass'; wf.frequency.value = 700; wf.Q.value = 2.5; wg.gain.value = 0.05;
      wl.frequency.value = 0.11; wlg.gain.value = 450; wl.connect(wlg); wlg.connect(wf.frequency);
      ws.connect(wf); wf.connect(wg); wg.connect(bus); ws.start(); wl.start(); m.wind = [ws, wl]; }
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
        if (st.lead === 'pluck') { if (s16 % 2 === 0) pluckM(hz(an), t, 0.05); }
        else if (st.lead === 'celesta') { if (s16 % 2 === 0) celestaM(hz(an + 12), t, 0.03); }
        else if (style !== 'ice' || s16 % 2 === 0) osc(st.lead, hz(an), t, step * 0.9, st.lead === 'sawtooth' ? 0.035 : 0.045, bus);
        // Percusión de los temas
        if (st.wood && st.wood[s16] === 'x') woodM(t);
        if (st.jingle && st.jingle[s16] === 'x') jingleM(t);
        if (st.claps && (s16 === 4 || s16 === 12)) clapM(t);
        if (st.gong && s16 === 0 && (i / 16 | 0) % st.gong === 0) gongM(t);
        // Melodía en corcheas (-1 silencio, -2 sostiene la nota anterior)
        if (st.melody && s16 % 2 === 0) {
          const L = st.melody.length, e = (i / 2 | 0) % L, d = st.melody[e];
          if (d >= 0) { let n = 1; while (st.melody[(e + n) % L] === -2 && n < 8) n++;
            const dur = step * 2 * n, f = scaleHz(d);
            if (st.mel === 'celesta') celestaM(f, t, 0.06, Math.max(0.8, dur));
            else if (st.mel === 'synth') synthM(f, t, dur * 0.9, 0.045);
            else voiceM(f, t, dur * 0.95, st.mel === 'dizi' ? 0.05 : 0.055, st.mel === 'dizi'); }
        }
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
    if (m.wind) setTimeout(() => { try { m.wind.forEach(n => n.stop()); } catch (e) { } }, 1500);
    const t = this.ctx.currentTime; m.bus.gain.setTargetAtTime(0.0001, t, 0.25);
    setTimeout(() => { try { m.bus.disconnect(); m.lfo.stop(); } catch (e) { } }, 1500);
  }
}

export const sfx = new Sfx();
