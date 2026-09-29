#!/usr/bin/env python3
"""Genera las grabaciones del locutor (voz masculina de show) en assets/voice/.

Usa Piper (TTS neuronal libre, `pip install piper-tts imageio-ffmpeg`) con las voces
es-carlfm-x-low (español, hombre) y en-us-ryan-high (inglés, hombre), descargadas de
https://github.com/rhasspy/piper/releases/tag/v0.0.2 en la carpeta indicada por --models.
Cada frase se estira (palabras de premio largas), se baja de tono, se comprime y lleva eco de estadio.
Escribe assets/voice/<clave>.mp3 y assets/voice/index.json (texto normalizado -> clave).
"""
import argparse, json, os, re, subprocess, sys, tempfile, unicodedata
import imageio_ffmpeg, wave
import numpy as np

FF = imageio_ffmpeg.get_ffmpeg_exe()

def norm(t):
    t = t.lower().replace('+', 'más ')
    t = re.sub(r'[¡!¿?.,]', ' ', t)
    return re.sub(r'\s+', ' ', t).strip()

NUM = {3: 'tres', 4: 'cuatro', 5: 'cinco', 6: 'seis', 7: 'siete', 8: 'ocho', 9: 'nueve', 10: 'diez', 11: 'once', 12: 'doce',
       13: 'trece', 14: 'catorce', 15: 'quince', 16: 'dieciséis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve', 20: 'veinte'}

# clave, idioma, texto que dice, textos (normalizados) que reemplaza, estilo ('hype' = muy estirado)
PHRASES = [
    ('bono', 'es', '¡Bono!', ['bono'], 'hype'),
    ('bono_sorpresa', 'es', '¡Bono sorpresa!', ['bono sorpresa'], 'hype'),
    ('multiplicador', 'es', '¡Multiplicador!', ['multiplicador'], 'hype'),
    ('por_dos', 'es', '¡Todas las bolas, por dos!', ['todas las bolas por dos'], 'show'),
    ('estampida', 'es', '¡Estampida!', ['estampida'], 'hype'),
    ('rueda', 'es', '¡Rueda de fuego!', ['rueda de fuego'], 'show'),
    ('tesoro', 'es', '¡El tesoro del César!', ['tesoro del césar'], 'show'),
    ('golden', 'en', 'Golden Spins!', ['golden spins'], 'show'),
    ('big', 'en', 'Big win!', ['big win'], 'hype'),
    ('awesome', 'en', 'Awesome!', ['awesome'], 'hype'),
    ('awesome_win', 'en', 'Awesome win!', ['awesome win'], 'hype'),
    ('super', 'en', 'Super!', ['super'], 'hype'),
    ('super_win', 'en', 'Super win!', ['super win'], 'hype'),
    ('jackpot', 'en', 'Jackpot!', ['jackpot'], 'hype'),
] + [(j + '_jp', 'en', j.capitalize() + ' jackpot!', [j + ' jackpot'], 'hype') for j in ['mini', 'minor', 'major', 'grand']] \
  + [('giros_%d' % n, 'es', '¡%s giros gratis!' % NUM[n].capitalize(), ['%d giros gratis' % n], 'show') for n in range(3, 21)] \
  + [('mas_%d' % n, 'es', '¡Más %s giros!' % NUM[n], ['más %d giros' % n], 'show') for n in (3, 4, 5, 10)]

MODEL = {'es': 'es-carlfm-x-low.onnx', 'en': 'en-us-ryan-high.onnx'}
# length_scale (más alto = más lento/estirado), tono (1 = igual) por estilo e idioma
STYLE = {'hype': (1.35, 0.9), 'show': (1.25, 0.93)}

def stretch_first(src, dst, target=0.85, peak=1.3):
    """¡Suuuuuper win!: sostiene la primera vocal (primer tramo sonoro) ~target s repitiendo sus ciclos
    de voz (TD-PSOLA: conserva el timbre) con entonación exclamativa: sube hasta `peak`, vibrato y
    crescendo, y vuelve suave para enlazar con el resto de la palabra."""
    w = wave.open(src); sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float); w.close()
    fr = int(0.01 * sr); n = len(x) // fr
    en = np.array([np.sqrt(np.mean(x[q*fr:(q+1)*fr] ** 2)) for q in range(n)])
    zc = np.array([np.mean(np.abs(np.diff(np.sign(x[q*fr:(q+1)*fr])))) / 2 for q in range(n)])
    voiced = (en > 0.12 * en.max()) & (zc < 0.12)
    run, q = None, 0
    while q < n and run is None:
        if voiced[q]:
            e = q
            while e < n and voiced[e]: e += 1
            if e - q >= 4: run = (q, e)
            q = e
        else: q += 1
    if not run: return src
    r0, r1 = run
    # la vocal está en la primera mitad del tramo sonoro (en "bon" la o, no la n)
    c = int((r0 + 0.4 * (r1 - r0)) * fr)
    seg = x[c - 400 * sr // 16000: c + 400 * sr // 16000]; seg = seg - seg.mean()
    ac = np.correlate(seg, seg, 'full')[len(seg) - 1:]
    lo, hi = sr // 350, sr // 60; T = lo + int(np.argmax(ac[lo:hi]))
    # granos de 2 periodos alrededor de marcas de tono cercanas al centro de la vocal
    marks = [c + k * T for k in range(-2, 3) if c + k * T - T >= 0 and c + k * T + T < len(x)]
    win = np.hanning(2 * T)
    grains = [x[m - T:m + T] * win for m in marks]
    N = int(target * sr); out = np.zeros(N + 4 * T); t = 0.0; g = 0
    while t < N:
        u = t / N
        f = 1 + (peak - 1) * (np.sin(np.pi * min(1, u / 0.7) / 2) if u < 0.7 else 1 - 0.75 * (u - 0.7) / 0.3)
        f *= 1 + 0.03 * np.sin(2 * np.pi * 6 * t / sr) * min(1, u * 3)
        amp = 1 + 0.35 * min(1, u / 0.6)
        pos = int(t); out[pos:pos + 2 * T] += grains[g % len(grains)] * amp
        g += 1; t += T / f
    sus = out[T:N + T]
    # enlace: vocal natural hasta el centro, vocal sostenida, luego el resto (fundidos de 8 ms)
    fd = int(0.008 * sr); ramp = np.linspace(0, 1, fd)
    head, tail = x[:c].copy(), x[c:].copy()
    sus[:fd] = sus[:fd] * ramp + head[-fd:] * (1 - ramp); head = head[:-fd]
    tail[:fd] = tail[:fd] * ramp + sus[-fd:] * (1 - ramp); sus = sus[:-fd]
    y = np.concatenate([head, sus, tail * 1.15])
    y = np.clip(y / max(1, np.abs(y).max() / 30000), -32767, 32767).astype(np.int16)
    w = wave.open(dst, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(y.tobytes()); w.close()
    return dst

def render(models, key, lang, text, style, out):
    ls, pitch = STYLE[style]
    if lang == 'en': pitch *= 0.8
    with tempfile.TemporaryDirectory() as d:
        wav = os.path.join(d, 'a.wav')
        subprocess.run([sys.executable, '-m', 'piper', '-m', os.path.join(models, MODEL[lang]), '-f', wav,
                        '--length-scale', str(ls), '--noise-scale', '0.8' if style == 'hype' else '0.5', '--noise-w-scale', '0.9' if style == 'hype' else '0.6'],
                       input=text.encode(), check=True, capture_output=True)
        sr = 16000 if lang == 'es' else 22050
        if style == 'hype': wav = stretch_first(wav, os.path.join(d, 'b.wav'))
        af = ('silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,'
              'highpass=f=75,asetrate=%d,aresample=24000,atempo=%.4f,'
              'equalizer=f=180:t=q:w=1:g=4,equalizer=f=3000:t=q:w=1.2:g=3,'
              'acompressor=threshold=-22dB:ratio=5:attack=4:release=90:makeup=4,'
              'aecho=0.85:0.55:70|140:0.22|0.12,apad=pad_dur=0.25,loudnorm=I=-11:TP=-1:LRA=7') % (int(sr * pitch), 1 / pitch * (0.92 if style == 'hype' else 1))
        subprocess.run([FF, '-y', '-loglevel', 'error', '-i', wav, '-af', af, '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '48k', out], check=True)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--models', default='/tmp/tts'); ap.add_argument('--out', default=os.path.join(os.path.dirname(__file__), '..', 'assets', 'voice'))
    a = ap.parse_args(); os.makedirs(a.out, exist_ok=True)
    index = {}
    for key, lang, text, alias, style in PHRASES:
        render(a.models, key, lang, text, style, os.path.join(a.out, key + '.mp3'))
        for t in alias: index[norm(t)] = key
        print(key, end=' ', flush=True)
    with open(os.path.join(a.out, 'index.json'), 'w') as f: json.dump(index, f, ensure_ascii=False, indent=0)
    print('\n%d frases' % len(PHRASES))

if __name__ == '__main__': main()
