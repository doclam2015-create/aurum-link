# Genera assets/colossal.webp (símbolos de Oro del Gigante y Espartaco Coloso) desde assets/src/colossal/.
# Los personajes y escenarios salen de las portadas y capturas que compartió el usuario (ver abajo).
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
#   giant_heroine.webp  la heroína trepando la habichuela (de la portada)
from PIL import ImageFilter, ImageDraw
ref = Image.open(SRC + 'ref_giant.jpg').convert('RGB')
ref.crop((494, 60, 800, 599)).save('assets/giant_hero.webp', 'WEBP', quality=90, method=6)
ref.crop((0, 292, 410, 599)).save('assets/giant_sky.webp', 'WEBP', quality=88, method=6)
# heroína de Oro del Gigante, trepando la habichuela
# (portada nítida de 500×500: solo la parte de arriba, antes del logo)
Image.open(SRC + 'ref_giant2.png').convert('RGB').crop((140, 0, 340, 205)).save('assets/giant_heroine.webp', 'WEBP', quality=92, method=6)
# Espartaco Coloso: todo sale de las capturas de la máquina que compartió el usuario.
#   sparta_sym.webp   hoja de 2200×200: lion, chariot, sword (escudo+gladius), net (gladiador con mayal),
#                     K, J, Q, A, sparta (placa WILD), super (placa azul), mw (marco del multiplicador)
#   sparta_tall.webp  Espartaco de cuerpo entero en su marco azul (personaje apilado y MEGA WILD)
#   sparta_wtall.webp la guerrera de cuerpo entero
#   sparta_scene.webp escenario: cortina, brasero, muro de piedra y logo (cuadro sobre el principal y fondo)
A = Image.open(SRC + 'ref_sparta_play1.webp').convert('RGB'); B = Image.open(SRC + 'ref_sparta_play2.webp').convert('RGB')
SP = [('lion', A, (18, 383, 112, 452)), ('chariot', B, (945, 385, 1088, 500)), ('sword', A, (918, 190, 1062, 305)), ('net', B, (940, 80, 1087, 222)),
      ('K', B, (385, 387, 465, 448)), ('J', B, (58, 462, 130, 522)), ('Q', B, (503, 387, 572, 448)), ('A', A, (770, 130, 822, 172)),
      ('sparta', B, (372, 603, 470, 668)), ('super', A, (918, 28, 1062, 168)), ('mw', B, (940, 228, 1088, 376))]
sheet = Image.new('RGBA', (T * len(SP), T), (0, 0, 0, 0))
for n, (k, im, box) in enumerate(SP):
    c = im.crop(box); w, h = c.size; f = (T - 4) / max(w, h)
    c = c.resize((round(w * f), round(h * f)), Image.LANCZOS)
    if f > 2: c = c.filter(ImageFilter.UnsharpMask(radius=2, percent=70, threshold=2))
    sheet.paste(c, (n * T + (T - c.width) // 2, (T - c.height) // 2))
sheet.save('assets/sparta_sym.webp', 'WEBP', quality=90, method=6)
A.crop((345, 385, 452, 686)).save('assets/sparta_tall.webp', 'WEBP', quality=92, method=6)
A.crop((682, 225, 757, 630)).save('assets/sparta_wtall.webp', 'WEBP', quality=92, method=6)
A.crop((0, 0, 600, 372)).save('assets/sparta_scene.webp', 'WEBP', quality=90, method=6)
print('escenarios listos', [k for k, _, _ in SP])
