# Genera assets/colossal.webp (símbolos de Oro del Gigante y Espartaco Coloso) desde assets/src/colossal/.
# Los escenarios se dibujan en vectores (js/games/scenes.js), no son imágenes.
# Hoja de 3200×200: casillas de 200×200. Las 15 primeras son cuadradas; la 16.ª lleva las dos
# figuras altas (habichuela en x=3000 y Espartaco de cuerpo entero en x=3100, 100×200 cada una).
import sys; sys.path.insert(0, 'tools')
from PIL import Image
from build_themes import flood_key, fit, T
SRC = 'assets/src/colossal/'
SQ = ['giant', 'girl', 'harp', 'cow', 'goose', 'sack', 'egg', 'lion', 'warrior', 'helm', 'chariot', 'sword', 'colis', 'shield', 'bust']
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
print(SQ + TALL, A.size)

# Escenarios a partir de las portadas que compartió el usuario (solo zonas sin logo ni marca de agua):
#   giant_hero.webp     gigante de cuerpo entero con cielo (personaje alto y escenario)
#   giant_sky.webp      nubes con el castillo y el huevo de oro (fondo)
#   sparta_hero.webp    Espartaco con escudo y espada (cuadro y MEGA WILD)
#   sparta_heroine.webp la guerrera con dos espadas (cuando cae apilada)
#   sparta_bg.webp      cielo, mar y rocas del centro; donde estaba el logo queda un degradado suave
from PIL import ImageFilter, ImageDraw
ref = Image.open(SRC + 'ref_giant.jpg').convert('RGB')
ref.crop((494, 60, 800, 599)).save('assets/giant_hero.webp', 'WEBP', quality=90, method=6)
ref.crop((0, 292, 410, 599)).save('assets/giant_sky.webp', 'WEBP', quality=88, method=6)
sp = Image.open(SRC + 'ref_sparta2.webp').convert('RGB')
sp.crop((0, 40, 248, 541)).save('assets/sparta_hero.webp', 'WEBP', quality=90, method=6)
sp.crop((735, 60, 960, 541)).save('assets/sparta_heroine.webp', 'WEBP', quality=90, method=6)
bg = sp.crop((262, 0, 640, 541)).copy(); w, h = bg.size; y0, y1 = 92, 428; px = bg.load()
for x in range(w):
    a, b = px[x, y0], px[x, y1]
    for y in range(y0, y1):
        t = (y - y0) / (y1 - y0); px[x, y] = tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
mask = Image.new('L', (w, h), 0); ImageDraw.Draw(mask).rectangle((0, y0 - 10, w, y1 + 10), fill=255)
bg = Image.composite(bg.filter(ImageFilter.GaussianBlur(18)), bg, mask.filter(ImageFilter.GaussianBlur(10)))
bg.save('assets/sparta_bg.webp', 'WEBP', quality=88, method=6)
print('escenarios listos')
