"""Genera los íconos de Piloto de Cookies (extensión y app)."""
from PIL import Image, ImageDraw, ImageFilter
import os, math

OUT = os.path.join(os.path.dirname(__file__), '..', 'extension', 'icons')
os.makedirs(OUT, exist_ok=True)
S = 1024

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def base():
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    grad = Image.new('RGB', (S, S))
    px = grad.load()
    c1, c2 = (16, 185, 129), (37, 99, 235)
    for y in range(S):
        for x in range(0, S, 4):
            t = (x * 0.45 + y * 0.55) / S
            col = lerp(c1, c2, min(1, t))
            for k in range(4):
                px[x + k, y] = col
    mask = Image.new('L', (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=230, fill=255)
    img.paste(grad, (0, 0), mask)
    # brillo superior
    gl = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(gl).ellipse([-200, -620, S + 200, 420], fill=(255, 255, 255, 38))
    img = Image.alpha_composite(img, Image.composite(gl, Image.new('RGBA', (S, S)), mask))
    return img

def cookie(img, cx, cy, r, color=(245, 196, 120), chip=(120, 72, 38), shadow=True, bite=True):
    layer = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color + (255,))
    if bite:
        br = r * 0.36
        for ang, rr in ((-40, 0.0), (-62, 0.18), (-18, 0.16)):
            a = math.radians(ang)
            bx, by = cx + math.cos(a) * r * (0.98 + rr * 0.2), cy + math.sin(a) * r * (0.98 + rr * 0.2)
            d.ellipse([bx - br, by - br, bx + br, by + br], fill=(0, 0, 0, 0))
    for (dx, dy, s) in ((-0.38, -0.12, 0.13), (0.05, 0.32, 0.12), (-0.18, 0.45, 0.09), (0.36, 0.12, 0.1), (-0.5, 0.25, 0.08), (0.02, -0.38, 0.08)):
        x, y, rr = cx + dx * r, cy + dy * r, s * r
        d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=chip + (255,))
    if shadow:
        sh = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        sh.paste((0, 0, 0, 90), (0, 0), layer.split()[3])
        sh = sh.filter(ImageFilter.GaussianBlur(24))
        img.alpha_composite(sh, (0, 18))
    img.alpha_composite(layer)

def check(img, cx, cy, r):
    d = ImageDraw.Draw(img)
    d.ellipse([cx - r - 14, cy - r - 14, cx + r + 14, cy + r + 14], fill=(255, 255, 255, 255))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(16, 185, 129, 255))
    w = int(r * 0.26)
    pts = [(cx - r * 0.45, cy + r * 0.02), (cx - r * 0.1, cy + r * 0.38), (cx + r * 0.5, cy - r * 0.34)]
    d.line(pts, fill=(255, 255, 255, 255), width=w, joint='curve')
    for p in (pts[0], pts[2]):
        d.ellipse([p[0] - w / 2, p[1] - w / 2, p[0] + w / 2, p[1] + w / 2], fill=(255, 255, 255, 255))

big = base()
cookie(big, 470, 520, 300)
check(big, 730, 730, 150)
for n in (16, 32, 48, 96, 128, 256, 512, 1024):
    big.resize((n, n), Image.LANCZOS).save(os.path.join(OUT, f'icon-{n}.png'))

# Ícono de barra: galleta con visto, fondo transparente
tb = Image.new('RGBA', (S, S), (0, 0, 0, 0))
cookie(tb, 470, 520, 420, color=(232, 170, 90), chip=(92, 52, 24), shadow=False)
check(tb, 760, 760, 190)
for n in (16, 19, 32, 38, 48):
    tb.resize((n, n), Image.LANCZOS).save(os.path.join(OUT, f'toolbar-{n}.png'))
print('ok')
