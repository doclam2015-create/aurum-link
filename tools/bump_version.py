#!/usr/bin/env python3
"""Sube la versión de caché en todos los archivos: python3 tools/bump_version.py 25
Así iOS/Safari descarga siempre la versión nueva de cada módulo."""
import re, sys, glob
v = sys.argv[1]
for f in glob.glob('js/**/*.js', recursive=True):
    s = open(f).read()
    n = re.sub(r"""(from\s+'[^']+?\.js)(\?v=\d+)?'""", r"\1?v=" + v + "'", s)
    open(f, 'w').write(n)
for f in ['index.html', 'sw.js']:
    s = open(f).read()
    s = re.sub(r'\?v=\d+', '?v=' + v, s)
    s = re.sub(r"aurum-v\d+", 'aurum-v' + v, s)
    open(f, 'w').write(s)
print('versión', v)
