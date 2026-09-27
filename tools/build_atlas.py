from PIL import Image, ImageChops
T=200
ref=Image.open('assets/src/reference-symbols.png').convert('RGBA')
sym=Image.open('assets/src/symbols.png').convert('RGB')
def tile(im,i):
    s=im.size[0]/4; c,r=i%4,i//4
    return im.crop((int(c*s),int(r*s),int((c+1)*s),int((r+1)*s)))
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
def fit(t,pad=6):
    t=isolate(t); bb=t.getchannel('A').getbbox(); t=t.crop(bb)
    w,h=t.size; k=(T-2*pad)/max(w,h)
    t=t.resize((max(1,round(w*k)),max(1,round(h*k))),Image.LANCZOS)
    o=Image.new('RGBA',(T,T),(0,0,0,0)); o.alpha_composite(t,((T-t.size[0])//2,(T-t.size[1])//2)); return o
tiles=[]
# ref: 0 emperor 1 queen 2 geisha 3 plum 4 bell 5 orange 6 melon 7 grapes 8 seven 9 cherry 10 bstar 11 gstar 12 rstar 13 sun 14 upgrade 15 burst
for i in range(16): tiles.append(fit(clean(tile(ref,i))))
# sym: 0 ten 1 J 2 Q 3 K 5 crown 9 clover 10 dragon 11 snowflake 13 diamond 14 bull 15 phoenix
for i in [0,1,2,3,5,9,10,11,13,14,15]: tiles.append(fit(key(tile(sym,i),0.84 if i==11 else 0.93)))
cols=6; rows=(len(tiles)+cols-1)//cols
A=Image.new('RGBA',(cols*T,rows*T),(0,0,0,0))
for n,t in enumerate(tiles): A.alpha_composite(t,((n%cols)*T,(n//cols)*T))
A.save('assets/symbols.webp','WEBP',quality=78,method=6)
print(len(tiles),A.size)
