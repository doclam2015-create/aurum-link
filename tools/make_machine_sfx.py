# Recorta las grabaciones de máquinas reales (Gp*.m4a, Gran premio…) a su tramo más intenso
# de ~7 s, con fundido, normalizado y en mp3 mono liviano → assets/sfx/real_N.mp3
import subprocess, sys, glob, os, numpy as np, imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe(); SR = 24000; WIN = 7.0
src = sorted(glob.glob(os.path.join(sys.argv[1], '*.m4a')))
out = []
for i, f in enumerate(src):
    raw = subprocess.run([FF, '-v', 'error', '-i', f, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True).stdout
    a = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    hop = SR // 4; e = np.array([np.sqrt(np.mean(a[k:k + hop] ** 2) + 1e-9) for k in range(0, len(a) - hop, hop)])
    n = int(WIN * 4); best = int(np.argmax(np.convolve(e, np.ones(n), 'valid'))) if len(e) > n else 0
    t0 = best / 4; name = 'real_%d' % (len(out) + 1)
    subprocess.run([FF, '-v', 'error', '-y', '-ss', str(t0), '-t', str(WIN), '-i', f, '-ac', '1', '-ar', '44100',
                    '-af', 'highpass=f=70,afade=t=in:d=0.08,afade=t=out:st=%.2f:d=1.2,loudnorm=I=-14:TP=-1.5' % (WIN - 1.2),
                    '-b:a', '64k', 'assets/sfx/%s.mp3' % name], check=True)
    out.append(name); print(name, os.path.basename(f), 'desde %.1f s' % t0)
