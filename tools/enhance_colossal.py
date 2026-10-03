"""Deja nítidos (Real-ESRGAN x4, ver upscale_esrgan.py) los personajes y los símbolos de los juegos
colosales, que salen de capturas pequeñas. Se corre después de build_colossal.py:
  python3 tools/enhance_colossal.py RealESRGAN_x4plus.pth"""
import sys
from PIL import Image
sys.path.insert(0, 'tools'); import upscale_esrgan as E
E.W.update(E.load_pth(sys.argv[1]))
# personajes: [archivo, factor final respecto del original]
for f, k in [('giant_girltall', 4), ('sparta_ctall', 4), ('sparta_wtall', 4), ('sparta_tall', 4), ('giant_heroine', 2), ('giant_hero', 2)]:
    p = 'assets/%s.webp' % f; im = Image.open(p).convert('RGB'); out = E.esrgan(im)
    if k != 4: out = out.resize((im.width * k, im.height * k), Image.LANCZOS)
    out.save(p, 'WEBP', quality=90, method=6); print(f, out.size, flush=True)
# hojas de símbolos (casillas de 200 px ampliadas desde recortes chicos): cada casilla se reduce a 100 px,
# se amplía x4 con la red y vuelve a 200 px; la transparencia se conserva
for f in ('giant_sym', 'sparta_sym'):
    p = 'assets/%s.webp' % f; sh = Image.open(p).convert('RGBA'); out = sh.copy()
    for x0 in range(0, sh.width, 200):
        t = sh.crop((x0, 0, x0 + 200, 200)); rgb = Image.new('RGB', t.size, (0, 0, 0)); rgb.paste(t, mask=t.split()[3])
        big = E.esrgan(rgb.resize((100, 100), Image.LANCZOS)).resize((200, 200), Image.LANCZOS).convert('RGBA'); big.putalpha(t.split()[3])
        out.paste(big, (x0, 0)); print(f, x0 // 200, flush=True)
    out.save(p, 'WEBP', quality=90, method=6)
