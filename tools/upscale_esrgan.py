"""Amplía imágenes x4 con Real-ESRGAN (RealESRGAN_x4plus) usando solo numpy, sin torch.
Uso: python3 tools/upscale_esrgan.py pesos.pth entrada.png salida.png [factor_final]
Los pesos se bajan de https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth
(se usó para dejar nítidos a los personajes de los juegos colosales, que venían de capturas pequeñas)."""
import sys, zipfile, pickle, numpy as np
from numpy.lib.stride_tricks import sliding_window_view
from PIL import Image

def load_pth(path):
    z = zipfile.ZipFile(path); pre = z.namelist()[0].split('/')[0]
    class U(pickle.Unpickler):
        def find_class(self, mod, name):
            if name == '_rebuild_tensor_v2':
                def f(storage, off, size, stride, *a):
                    if not size: return storage[off:off + 1].reshape(())
                    return np.lib.stride_tricks.as_strided(storage[off:], shape=size, strides=[s * 4 for s in stride]).copy()
                return f
            if name == 'OrderedDict':
                import collections; return collections.OrderedDict
            if name.endswith('Storage'): return name
            return super().find_class(mod, name)
        def persistent_load(self, pid):
            _, typ, key, loc, n = pid
            return np.frombuffer(z.read(f'{pre}/data/{key}'), dtype=np.float32)
    d = U(z.open(f'{pre}/data.pkl')).load()
    return d.get('params_ema', d.get('params', d))

W = {}
def conv(x, name, chunk=48):
    w, b = W[name + '.weight'], W[name + '.bias']; O, C = w.shape[:2]; wm = w.reshape(O, C * 9).T
    _, H, Wd = x.shape; xp = np.pad(x, ((0, 0), (1, 1), (1, 1)), mode='constant')
    out = np.empty((O, H, Wd), np.float32)
    for r in range(0, H, chunk):
        e = min(H, r + chunk); win = sliding_window_view(xp[:, r:e + 2], (3, 3), axis=(1, 2))  # C,h,W,3,3
        p = win.transpose(1, 2, 0, 3, 4).reshape(-1, C * 9)
        out[:, r:e] = (p @ wm + b).T.reshape(O, e - r, Wd)
    return out
lrelu = lambda x: np.where(x > 0, x, 0.2 * x)
def rdb(x, n):
    xs = [x]
    for i in range(1, 5): xs.append(lrelu(conv(np.concatenate(xs), f'{n}.conv{i}')))
    return conv(np.concatenate(xs), f'{n}.conv5') * 0.2 + x
def up(x): return x.repeat(2, axis=1).repeat(2, axis=2)
def esrgan(img):
    x = np.asarray(img.convert('RGB'), np.float32).transpose(2, 0, 1) / 255
    f = conv(x, 'conv_first'); b = f
    for i in range(23):
        o = b
        for j in (1, 2, 3): o = rdb(o, f'body.{i}.rdb{j}')
        b = o * 0.2 + b
    f = f + conv(b, 'conv_body')
    f = lrelu(conv(up(f), 'conv_up1')); f = lrelu(conv(up(f), 'conv_up2'))
    o = conv(lrelu(conv(f, 'conv_hr')), 'conv_last')
    return Image.fromarray((np.clip(o, 0, 1).transpose(1, 2, 0) * 255 + 0.5).astype(np.uint8))

if __name__ == '__main__':
    W.update(load_pth(sys.argv[1]))
    im = Image.open(sys.argv[2]); out = esrgan(im)
    if len(sys.argv) > 4: f = float(sys.argv[4]); out = out.resize((round(im.width * f), round(im.height * f)), Image.LANCZOS)
    out.save(sys.argv[3]); print(sys.argv[3], out.size)
