# Genera assets/colossal.webp (símbolos de Oro del Gigante y Espartaco Coloso) desde assets/src/colossal/.
# Los personajes y escenarios salen de las portadas y capturas que compartió el usuario (ver abajo).
# Hoja de 3200×200: casillas de 200×200. Las 15 primeras son cuadradas; la 16.ª lleva las dos
# figuras altas (habichuela en x=3000 y Espartaco de cuerpo entero en x=3100, 100×200 cada una).
import sys; sys.path.insert(0, 'tools')
from PIL import Image
from build_themes import flood_key, fit, T
cream = lambda p: p[0] > 185 and p[1] > 160 and p[2] > 110 and p[0] - p[2] < 120
# crema del Gigante: algo amarillento (el blanco puro del cisne y de los bordes de las letras se conserva)
gcream = lambda p: p[0] > 190 and p[1] > 175 and p[2] > 120 and 10 < p[0] - p[2] < 110
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
# heroína de cuerpo entero sobre la habichuela, como cae apilada en el rodillo colosal de la máquina
Image.open(SRC + 'ref_giant_p12.webp').convert('RGB').crop((663, 72, 710, 405)).save('assets/giant_girltall.webp', 'WEBP', quality=92, method=6)
# Espartaco Coloso: todo sale de las capturas de la máquina que compartió el usuario.
#   sparta_sym.webp   hoja de 2400×200: lion, chariot, sword (escudo+gladius), net (gladiador con mayal),
#                     K, J, Q, A, sparta (placa WILD), super (placa azul), mw (marco del multiplicador),
#                     colis (Coliseo BONUS, generado en Canva al estilo de la máquina)
#   sparta_tall.webp  Espartaco de cuerpo entero en su marco azul (personaje apilado y MEGA WILD)
#   sparta_wtall.webp la guerrera de cuerpo entero
#   sparta_scene.webp escenario: cortina, brasero, muro de piedra y logo (cuadro sobre el principal y fondo)
A = Image.open(SRC + 'ref_sparta_play1.webp').convert('RGB'); B = Image.open(SRC + 'ref_sparta_play2.webp').convert('RGB')
SP = [('lion', A, (18, 383, 112, 452)), ('chariot', B, (945, 385, 1088, 500)), ('sword', A, (918, 190, 1062, 305)), ('net', B, (940, 80, 1087, 222)),
      ('K', B, (385, 387, 465, 448)), ('J', B, (58, 462, 130, 522)), ('Q', B, (503, 387, 572, 448)), ('A', A, (770, 130, 822, 172)),
      ('sparta', Image.open(SRC + 'sparta_wild.png').convert('RGB'), (0, 0, 105, 73)), ('super', A, (918, 28, 1062, 168)), ('mw', B, (940, 228, 1088, 376)),
      ('colis', Image.open(SRC + 'colis_sparta.jpg').convert('RGB'), (0, 0, 200, 200))]
sheet = Image.new('RGBA', (T * len(SP), T), (0, 0, 0, 0))
for n, (k, im, box) in enumerate(SP):
    c = im.crop(box); w, h = c.size; f = (T - 4) / max(w, h)
    c = c.resize((round(w * f), round(h * f)), Image.LANCZOS)
    if f > 2: c = c.filter(ImageFilter.UnsharpMask(radius=2, percent=70, threshold=2))
    c = flood_key(c, cream) if k in ('chariot', 'sword', 'K', 'J', 'Q', 'A') else c.convert('RGBA')
    sheet.alpha_composite(c, (n * T + (T - c.width) // 2, (T - c.height) // 2))
sheet.save('assets/sparta_sym.webp', 'WEBP', quality=90, method=6)
def dewatermark(im, boxes, thr=7):
    """Borra la marca de agua semitransparente (texto claro) dentro de las cajas: detecta los píxeles
    más claros que su entorno y los rellena con inpainting."""
    import numpy as np, cv2
    a = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR); g = cv2.cvtColor(a, cv2.COLOR_BGR2GRAY)
    diff = cv2.subtract(g, cv2.medianBlur(g, 15)); mask = np.zeros_like(g)
    for x0, y0, x1, y1 in boxes: mask[y0:y1, x0:x1] = (diff[y0:y1, x0:x1] > thr) * 255
    mask = cv2.dilate(mask, np.ones((3, 3), np.uint8), iterations=1)
    a = cv2.inpaint(a, mask, 4, cv2.INPAINT_TELEA)
    return Image.fromarray(cv2.cvtColor(a, cv2.COLOR_BGR2RGB))
# Espartaco: la misma figura aparece dos veces en la captura; la marca de agua de la primera (junto a la cara)
# se tapa con ese mismo trozo de la segunda copia, que ahí está limpia (sin borrar ni deformar la cara).
t1 = A.crop((345, 385, 452, 676)); t2 = A.crop((455, 385, 562, 676))
t1.paste(t2.crop((0, 40, 44, 100)), (0, 40))
t1.save('assets/sparta_tall.webp', 'WEBP', quality=92, method=6)
dewatermark(A.crop((682, 225, 757, 630)), [(45, 320, 75, 365)]).save('assets/sparta_wtall.webp', 'WEBP', quality=92, method=6)
scene = dewatermark(A.crop((0, 0, 592, 372)), [(280, 60, 352, 135)])
# sin la barra roja bajo el logo: se tapa con la hilera de piedra de abajo (ahí van el coliseo y los personajes)
scene.paste(scene.crop((300, 214, 568, 250)), (300, 177))
scene.save('assets/sparta_scene.webp', 'WEBP', quality=90, method=6)
print('escenarios listos', [k for k, _, _ in SP])

# Oro del Gigante: símbolos y escenario sacados de las capturas de la máquina que compartió el usuario.
#   giant_sym.webp    hoja de 2000×200: sack, goose, harp, Q, K, J, egg, A, cow, bean (WILD)
#   giant_scene.webp  campo con la granja y la habichuela (cuadro sobre el tablero principal)
GP = {n: Image.open(SRC + 'ref_giant_p%s.webp' % n).convert('RGB') for n in ('11', '12', '13', '14')}
GS = [('sack', '12', (82, 116, 152, 160)), ('goose', '12', (82, 161, 152, 208)), ('harp', '12', (155, 207, 225, 254)), ('Q', '12', (300, 207, 371, 254)),
      ('K', '12', (300, 255, 371, 300)), ('J', '12', (82, 255, 152, 300)), ('egg', '12', (374, 255, 444, 300)), ('A', '13', (84, 118, 144, 159)),
      ('cow', '14', (166, 162, 235, 209)), ('bean', '11', (17, 134, 97, 188))]
gs = Image.new('RGBA', (T * len(GS), T), (0, 0, 0, 0))
for n, (k, src, box) in enumerate(GS):
    c = GP[src].crop(box); w, h = c.size; f = (T - 4) / max(w, h)
    c = c.resize((round(w * f), round(h * f)), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2, percent=70, threshold=2))
    c = c.convert('RGBA') if k in ('egg', 'bean') else flood_key(c, gcream)
    gs.alpha_composite(c, (n * T + (T - c.width) // 2, (T - c.height) // 2))
gs.save('assets/giant_sym.webp', 'WEBP', quality=90, method=6)
GP['12'].crop((22, 12, 440, 112)).save('assets/giant_scene.webp', 'WEBP', quality=92, method=6)
print('gigante listo', [k for k, _, _ in GS])

