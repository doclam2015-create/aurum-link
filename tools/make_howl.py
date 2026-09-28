# Genera assets/sfx/howl.wav: aullido de lobo sintetizado con detalle (sin grabaciones externas).
# Modelo acústico de un aullido real: tono casi puro (fundamental 300-700 Hz) con pocos armónicos,
# subida inicial suave, deriva lenta e irregular de la altura, vibrato leve, un "quiebre" hacia
# arriba, caída final, aire en el ataque, resonancia de la boca y eco de bosque.
# Dos lobos: el segundo entra después, más agudo y más lejos. Uso: python3 tools/make_howl.py
import numpy as np
from scipy.signal import butter, lfilter, fftconvolve
from scipy.io import wavfile
SR = 22050
rng = np.random.default_rng(7)

def smooth_noise(n, cutoff):
    b, a = butter(2, cutoff / (SR / 2))
    x = lfilter(b, a, rng.standard_normal(n))
    return x / (np.abs(x).max() + 1e-9)

def howl(dur, f_lo, f_hi, f_end, brk_t, brk_df, amp):
    n = int(dur * SR); t = np.arange(n) / SR
    rise = 1 / (1 + np.exp(-(t - 0.55) * 7))                     # subida en S
    fall = 1 / (1 + np.exp(-(t - (dur - 0.9)) * 5))              # caída final
    f = f_lo + (f_hi - f_lo) * rise
    f = f + brk_df / (1 + np.exp(-(t - brk_t) * 30))             # quiebre de la voz
    f = f * (1 - fall) + f_end * fall
    f = f * (1 + 0.035 * smooth_noise(n, 1.2))                   # deriva lenta
    f = f * (1 + 0.009 * np.sin(2 * np.pi * (4.3 + 0.6 * smooth_noise(n, 0.5)) * t))  # vibrato leve
    f = f * (1 + 0.004 * smooth_noise(n, 40))                    # micro-inestabilidad (jitter)
    ph = 2 * np.pi * np.cumsum(f) / SR
    # pocos armónicos, más débiles cuando sube la altura
    h = [1.0, 0.22, 0.07, 0.025]
    tone = sum(w * np.sin((k + 1) * ph + k * 0.7) * (1 - 0.25 * k * rise) for k, w in enumerate(h))
    env = np.clip(t / 0.4, 0, 1) ** 1.6 * np.clip((dur - t) / 0.7, 0, 1) ** 1.3
    env = env * (1 + 0.12 * smooth_noise(n, 3))                  # temblor de volumen
    # aire: ruido centrado en el doble de la fundamental, más fuerte al inicio
    b, a = butter(2, [600 / (SR / 2), 3200 / (SR / 2)], btype='band')
    breath = lfilter(b, a, rng.standard_normal(n)) * (0.05 + 0.12 * np.exp(-t / 0.35))
    sig = (tone * 0.92 + breath) * env * amp
    # resonancia de la boca (paso banda suave alrededor de 1 kHz) mezclada con la señal directa
    b, a = butter(2, [500 / (SR / 2), 1800 / (SR / 2)], btype='band')
    return 0.6 * sig + 0.6 * lfilter(b, a, sig)

total = 6.2
out = np.zeros(int(total * SR))
w1 = howl(4.6, 300, 540, 380, 2.1, 55, 1.0)
out[:len(w1)] += w1
w2 = howl(4.2, 420, 660, 470, 2.6, -40, 0.42)                  # segundo lobo, más lejos
off = int(1.3 * SR); out[off:off + len(w2)] += w2[:len(out) - off]
# eco de bosque: respuesta con reflexiones tempranas y cola que decae
ir_n = int(2.4 * SR); ti = np.arange(ir_n) / SR
ir = rng.standard_normal(ir_n) * np.exp(-ti / 0.55)
b, a = butter(2, 3500 / (SR / 2)); ir = lfilter(b, a, ir)
ir[0] = 12.0
for d, g in [(0.045, 3), (0.11, 2), (0.19, 1.2)]: ir[int(d * SR)] += g
ir /= np.abs(ir).sum() ** 0.5
wet = fftconvolve(out, ir)[:len(out)]
mix = out * 0.75 + wet * 0.32
# atenuar graves muy bajos y normalizar
b, a = butter(1, 120 / (SR / 2), btype='high'); mix = lfilter(b, a, mix)
fade = np.clip((len(mix) - np.arange(len(mix))) / (0.4 * SR), 0, 1); mix *= fade
mix = mix / np.abs(mix).max() * 0.89
wavfile.write('assets/sfx/howl.wav', SR, (mix * 32767).astype(np.int16))
print('howl.wav', round(len(mix) / SR, 2), 's')
