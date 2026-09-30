# Genera assets/colossal.webp (símbolos de Oro del Gigante y Espartaco Coloso) desde assets/src/colossal/
# y los fondos assets/giant_bg.webp y assets/sparta_bg.webp.
# Hoja de 3000×200: casillas de 200×200. Las 14 primeras son cuadradas; la 15.ª lleva las dos
# figuras altas (habichuela en x=2800 y Espartaco de cuerpo entero en x=2900, 100×200 cada una).
import sys; sys.path.insert(0, 'tools')
from PIL import Image
from build_themes import flood_key, fit, T
SRC = 'assets/src/colossal/'
SQ = ['giant', 'girl', 'harp', 'cow', 'goose', 'sack', 'egg', 'lion', 'warrior', 'helm', 'chariot', 'sword', 'colis', 'shield']
TALL = ['bean', 'sparta']
white = lambda p: min(p) > 232
A = Image.new('RGBA', (T * (len(SQ) + 1), T), (0, 0, 0, 0))
for n, k in enumerate(SQ):
    im = flood_key(Image.open(SRC + k + '.jpg').convert('RGB'), white)
    A.alpha_composite(fit(im, pad=4), (n * T, 0))
for n, k in enumerate(TALL):
    im = flood_key(Image.open(SRC + k + '.jpg').convert('RGB'), white)
    im = im.crop(im.getbbox()); w, h = im.size; s = min(96 / w, 196 / h)
    im = im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    A.alpha_composite(im, (len(SQ) * T + n * 100 + (100 - im.width) // 2, (T - im.height) // 2))
A.save('assets/colossal.webp', 'WEBP', quality=86, method=6)
for k in ('giant_bg', 'sparta_bg'):
    Image.open(SRC + k + '.jpg').convert('RGB').save('assets/' + k + '.webp', 'WEBP', quality=90, method=6)
print(SQ + TALL, A.size)
