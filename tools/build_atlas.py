from PIL import Image, ImageChops
T=200
ref=Image.open('assets/src/reference-symbols.png').convert('RGBA')
sym=Image.open('assets/src/symbols.png').convert('RGB')
def tile(im,i,m=0):
    # m: margen extra (fracción de celda) para no cortar puntas que sobresalen de la cuadrícula
    s=im.size[0]/4; c,r=i%4,i//4; W,H=im.size
    return im.crop((max(0,int((c-m)*s)),max(0,int((r-m)*s)),min(W,int((c+1+m)*s)),min(H,int((r+1+m)*s))))
def component(t,thr=70):
    # Conserva solo la figura conectada al centro (descarta trozos de símbolos vecinos)
    from collections import deque
    a=t.getchannel('A'); w,h=a.size; px=a.load()
    seen=bytearray(w*h); q=deque()
    cx,cy=w//2,h//2
    best=None
    for d in range(0,min(w,h)//4):
        for (x,y) in ((cx+d,cy),(cx-d,cy),(cx,cy+d),(cx,cy-d)):
            if px[x,y]>thr: best=(x,y); break
        if best: break
    if not best: return t
    q.append(best); seen[best[1]*w+best[0]]=1
    while q:
        x,y=q.popleft()
        for nx,ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
            if 0<=nx<w and 0<=ny<h and not seen[ny*w+nx] and px[nx,ny]>thr:
                seen[ny*w+nx]=1; q.append((nx,ny))
    m=Image.frombytes('L',(w,h),bytes(255 if v else 0 for v in seen))
    from PIL import ImageFilter
    m=m.filter(ImageFilter.MaxFilter(9))  # conserva el borde suave
    t.putalpha(ImageChops.multiply(a,m)); return t
def clean(t):
    a=t.getchannel('A').point(lambda v:0 if v<10 else v)
    t.putalpha(a); return t
def key(t,cut=0.93):
    t=t.convert('RGBA'); px=t.load(); w,h=t.size
    for y in range(h):
        for x in range(w):
            r,g,b,_=px[x,y]; m=max(r,g,b)
            a=max(0,min(255,int((m-30)*255/45))) if y<h*cut else 0
            px[x,y]=(r,g,b,a)
    return t
def runs(v):
    best=(0,0,0);start=None
    for i,x in enumerate(v+[0]):
        if x>0 and start is None: start=i
        if x==0 and start is not None:
            tot=sum(v[start:i])
            if tot>best[2]: best=(start,i,tot)
            start=None
    return best[:2]
def isolate(t):
    a=t.getchannel('A'); w,h=a.size; px=a.load()
    rows=[sum(1 for x in range(w) if px[x,y]>40) for y in range(h)]
    rows=[r if r>1 else 0 for r in rows]
    y0,y1=runs(rows)
    cols=[sum(1 for y in range(y0,y1) if px[x,y]>40) for x in range(w)]
    cols=[c if c>1 else 0 for c in cols]
    x0,x1=runs(cols)
    return t.crop((x0,y0,x1,y1))
def fit(t,pad=6,bbox_only=False):
    if not bbox_only: t=isolate(t)
    bb=t.getchannel('A').point(lambda v:v if v>40 else 0).getbbox(); t=t.crop(bb)
    w,h=t.size; k=(T-2*pad)/max(w,h)
    t=t.resize((max(1,round(w*k)),max(1,round(h*k))),Image.LANCZOS)
    o=Image.new('RGBA',(T,T),(0,0,0,0)); o.alpha_composite(t,((T-t.size[0])//2,(T-t.size[1])//2)); return o
tiles=[]
# ref: 0 emperor 1 queen 2 geisha 3 plum 4 bell 5 orange 6 melon 7 grapes 8 seven 9 cherry 10 bstar 11 gstar 12 rstar 13 sun 14 upgrade 15 burst
for i in range(16): tiles.append(fit(component(clean(tile(ref,i,0.12))),bbox_only=True))
# sym: 0 ten 1 J 2 Q 3 K 5 crown 9 clover 10 dragon 11 snowflake 13 diamond 14 bull 15 phoenix
for i in [0,1,2,3,5,9,10,11,13,14,15]: tiles.append(fit(key(tile(sym,i),0.84 if i==11 else 0.93)))
cols=6; rows=(len(tiles)+cols-1)//cols
A=Image.new('RGBA',(cols*T,rows*T),(0,0,0,0))
for n,t in enumerate(tiles): A.alpha_composite(t,((n%cols)*T,(n//cols)*T))
A.save('assets/symbols.webp','WEBP',quality=78,method=6)
print(len(tiles),A.size)
