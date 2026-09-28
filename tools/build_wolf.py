# Genera assets/wolf.webp (símbolos de Carrera del Lobo) desde assets/src/wolf/.
# Hoja de 1400×200: 7 casillas de 200×200 en este orden:
#   gray, white, black, howl (retratos con fondo) · eagle, bear, dream (fondo blanco recortado)
import sys; sys.path.insert(0, 'tools')
from PIL import Image
from build_themes import flood_key, fit, T
SRC = 'assets/src/wolf/'
ORDER = ['gray', 'white', 'black', 'howl', 'eagle', 'bear', 'dream']
A = Image.new('RGBA', (T * len(ORDER), T), (0, 0, 0, 0))
for n, k in enumerate(ORDER):
    im = Image.open(SRC + k + '.jpg').convert('RGB')
    if k in ('eagle', 'bear', 'dream'): t = fit(flood_key(im, lambda p: min(p) > 228), pad=4)
    else: t = im.convert('RGBA').resize((T, T), Image.LANCZOS)
    A.alpha_composite(t, (n * T, 0))
A.save('assets/wolf.webp', 'WEBP', quality=84, method=6)
print(ORDER, A.size)
