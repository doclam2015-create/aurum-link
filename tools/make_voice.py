#!/usr/bin/env python3
"""Genera las grabaciones del locutor (voz masculina de show) en assets/voice/.

Usa Piper (TTS neuronal libre, `pip install piper-tts imageio-ffmpeg`) con las voces
es-carlfm-x-low (español, hombre) y en-us-ryan-high (inglés, hombre), descargadas de
https://github.com/rhasspy/piper/releases/tag/v0.0.2 en la carpeta indicada por --models.
Cada frase se estira (palabras de premio largas), se baja de tono, se comprime y lleva eco de estadio.
Escribe assets/voice/<clave>.mp3 y assets/voice/index.json (texto normalizado -> clave).
"""
import argparse, json, os, re, subprocess, sys, tempfile, unicodedata
import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()

def norm(t):
    t = t.lower().replace('+', 'más ')
    t = re.sub(r'[¡!¿?.,]', ' ', t)
    return re.sub(r'\s+', ' ', t).strip()

NUM = {3: 'tres', 4: 'cuatro', 5: 'cinco', 6: 'seis', 7: 'siete', 8: 'ocho', 9: 'nueve', 10: 'diez', 11: 'once', 12: 'doce',
       13: 'trece', 14: 'catorce', 15: 'quince', 16: 'dieciséis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve', 20: 'veinte'}

# clave, idioma, texto que dice, textos (normalizados) que reemplaza, estilo ('hype' = muy estirado)
PHRASES = [
    ('bono', 'es', '¡Boooonooo!', ['bono'], 'hype'),
    ('bono_sorpresa', 'es', '¡Booono sorpresa!', ['bono sorpresa'], 'hype'),
    ('multiplicador', 'es', '¡Multiplicadooor!', ['multiplicador'], 'hype'),
    ('por_dos', 'es', '¡Todas las bolas, por dos!', ['todas las bolas por dos'], 'show'),
    ('estampida', 'es', '¡Estampidaaa!', ['estampida'], 'hype'),
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
STYLE = {'hype': (2.4, 0.9), 'show': (1.25, 0.93)}

def render(models, key, lang, text, style, out):
    ls, pitch = STYLE[style]
    if lang == 'en': pitch *= 0.8
    with tempfile.TemporaryDirectory() as d:
        wav = os.path.join(d, 'a.wav')
        subprocess.run([sys.executable, '-m', 'piper', '-m', os.path.join(models, MODEL[lang]), '-f', wav,
                        '--length-scale', str(ls), '--noise-scale', '0.5', '--noise-w-scale', '0.6'],
                       input=text.encode(), check=True, capture_output=True)
        sr = 16000 if lang == 'es' else 22050
        af = ('silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,'
              'highpass=f=75,asetrate=%d,aresample=24000,atempo=%.4f,'
              'equalizer=f=180:t=q:w=1:g=4,equalizer=f=3000:t=q:w=1.2:g=3,'
              'acompressor=threshold=-22dB:ratio=5:attack=4:release=90:makeup=4,'
              'aecho=0.85:0.55:70|140:0.22|0.12,apad=pad_dur=0.25,loudnorm=I=-11:TP=-1:LRA=7') % (int(sr * pitch), 1 / pitch * (0.78 if style == 'hype' else 1))
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
