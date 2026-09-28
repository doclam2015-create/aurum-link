# Genera assets/themes.webp (símbolos de Sueño Rojo y Reino de Nieve) desde assets/src/themes/.
# Hoja de 1000×400: 10 casillas de 200×200 (5 columnas × 2 filas).
# Figuras con fondo liso (noble, tetera, papiro, loto) → fondo recortado (transparente).
# Retratos (Reino de Nieve y la noble de azul) → recorte cuadrado con su fondo (el marco de hielo se dibuja en el juego).
from PIL import Image, ImageFilter, ImageChops
from collections import deque
T = 200
SRC = 'assets/src/themes/'

def flood_key(im, is_bg, feather=2):
    """Quita el fondo conectado a los bordes (píxeles que cumplen is_bg)."""
    im = im.convert('RGBA'); w, h = im.size; px = im.load()
    seen = bytearray(w * h); q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))
    while q:
        x, y = q.popleft(); i = y * w + x
        if seen[i] or not is_bg(px[x, y][:3]): continue
        seen[i] = 1
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]: q.append((nx, ny))
    m = Image.frombytes('L', (w, h), bytes(0 if v else 255 for v in seen))
    m = m.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(feather * 0.6))
    im.putalpha(ImageChops.multiply(im.getchannel('A'), m)); return im

def near(c, tol):
    return lambda p: sum(abs(p[i] - c[i]) for i in range(3)) <= tol

def fit(im, pad=6):
    bb = im.getchannel('A').point(lambda v: 255 if v > 30 else 0).getbbox(); im = im.crop(bb)
    w, h = im.size; k = (T - 2 * pad) / max(w, h)
    im = im.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
    o = Image.new('RGBA', (T, T), (0, 0, 0, 0)); o.alpha_composite(im, ((T - im.size[0]) // 2, (T - im.size[1]) // 2)); return o

def square(im, box, size=T):
    return im.convert('RGBA').crop(box).resize((size, size), Image.LANCZOS)

tiles = {}
# Sueño Rojo
noble = Image.open(SRC + 'noble.jpg')
tiles['noble'] = fit(flood_key(noble, lambda p: min(p) > 232))
tea = Image.open(SRC + 'tea.jpg').convert('RGB')
tiles['tea'] = fit(flood_key(tea, near(tea.getpixel((4, 4)), 40)))
# Papiro: fondo de cuadros blanco/gris (poca saturación y claro)
tiles['scroll'] = fit(flood_key(Image.open(SRC + 'scroll.jpg'), lambda p: max(p) - min(p) < 14 and min(p) > 185))
tiles['lotus'] = fit(flood_key(Image.open(SRC + 'lotus.jpg'), lambda p: min(p) > 238, feather=3), pad=2)
# Reino de Nieve (retratos cuadrados)
tiles['wolf'] = square(Image.open(SRC + 'wolf.png'), (0, 0, 222, 222))
tiles['leopard'] = square(Image.open(SRC + 'leopard.jpg'), (92, 0, 392, 300))
tiles['falcon'] = square(Image.open(SRC + 'falcon.png'), (0, 0, 225, 225))
tiles['antelope'] = square(Image.open(SRC + 'antelope.jpg'), (6, 0, 212, 206))
lady = Image.open(SRC + 'lady.jpg')
# Noble de azul (Sueño Rojo): retrato con su fondo (el marco lacado se dibuja en el juego)
tiles['lady'] = square(lady, (0, 0, 189, 189))
tiles['snowflake'] = fit(flood_key(Image.open(SRC + 'snowflake.png').convert('RGB'), lambda p: min(p) > 238), pad=4)
ORDER = ['noble', 'tea', 'scroll', 'lotus', 'wolf', 'leopard', 'falcon', 'antelope', 'lady', 'snowflake']
A = Image.new('RGBA', (1000, 400), (0, 0, 0, 0))
for n, k in enumerate(ORDER): A.alpha_composite(tiles[k], ((n % 5) * T, (n // 5) * T))
A.save('assets/themes.webp', 'WEBP', quality=82, method=6)
print(ORDER, A.size)
