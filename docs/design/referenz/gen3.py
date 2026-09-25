import re
src=open('gen2.py').read().split("for st in 'DEF':")[0]
exec(src)
_shapes=shapes
def is_milk(n): return n//10 in (5,6,7,8)
def perm_eq(n):
    q,d=n//10,n%10
    return (q-4)*10+(6 if d>=4 else d)
def tpath(d,fx,fy):
    toks=re.split(r'([A-Za-z])',d); out=[]; cmd=''
    for t in toks:
        if re.fullmatch(r'[A-Za-z]',t or ''): cmd=t; out.append(t); continue
        v=list(map(float,re.findall(r'-?\d+\.?\d*',t)))
        if not v: out.append(t); continue
        out.append(' '.join(f'{fx(v[i]):.2f},{fy(v[i+1]):.2f}' for i in range(0,len(v),2)))
    return ''.join(out)
def fy_side(y): return 7+(y-7)*0.897 if y<=41.4 else 37.86+(y-41.4)*0.7004
def shapes(style,n):
    if not is_milk(n): return _shapes(style,n)
    pe=perm_eq(n); s=_shapes(style,pe); k=s['kind']
    sx={'mol':0.84,'can':0.86,'inc':0.86}[k]
    fx=lambda x: 38+(x-38)*sx
    crown=tpath(s['crown'],fx,fy_side)
    # roots: milk molars spread
    up=n//10 in (5,6); nr=3 if (k=='mol' and up) else (2 if k=='mol' else 1)
    neck=(fx({'mol':12,'can':25,'inc':26}[k]),fx({'mol':64,'can':51,'inc':50}[k]))
    tips={'mol':(9,67),'can':(38,38),'inc':(38,38)}[k]
    def root(l,r,t): return f'M{l:.1f},41.4 C{l:.1f},60 {t-4:.1f},80 {t-1.6:.1f},90 Q{t:.1f},93.5 {t+1.6:.1f},90 C{t+4:.1f},80 {r:.1f},60 {r:.1f},41.4 Z'
    gap=2.0 if nr>1 else 0; w=(neck[1]-neck[0]-gap*(nr-1))/nr; rs=[]
    for i in range(nr):
        l=neck[0]+i*(w+gap); r=l+w
        t=38 if nr==1 else tips[0]+i*(tips[1]-tips[0])/(nr-1)
        rs.append((tpath(root(l,r,t),lambda x:x,fy_side),(l+r)/2,t))
    so=0.82; fo=lambda x:38+(x-38)*so; go=lambda y:34+(y-34)*so
    occ=tpath(s['occ'],fo,go)
    a,b,c,d,rr_=s['inner']; inner=(round(fo(a),1),round(go(b),1),round(fo(c),1),round(go(d),1),rr_*so)
    x0,y0,x1,y1=s['bbox']; bbox=(fo(x0),go(y0),fo(x1),go(y1))
    return dict(crown=crown,roots=rs,occ=occ,bbox=bbox,inner=inner,kind=k)
# milk-aware side coords: WF etc unaffected in test data.
_nroots=nroots
def run(name,up,lo,findings,sel):
    global UP,LO,F,SEL
    UP,LO,F,SEL=up,lo,findings,sel
    H=render2('D',f'{name}.svg')
    s=open(f'{name}.svg').read()
    s=s.replace(f'viewBox="0 0 {W} {H}" width="{W}" height="{H}"',f'viewBox="0 0 {W} {H+8}" width="{W}" height="{H+8}"')
    s=s.replace(f'<rect x="0" y="0" width="{W}" height="{H}" fill="{THEMES["light"]["bg"]}"/>',f'<rect x="0" y="0" width="{W}" height="{H+8}" fill="{THEMES["light"]["bg"]}"/><g transform="translate(0,8)">',1)
    s=s.replace('</svg>','</g></svg>')
    open(f'{name}.svg','w').write(s); return H+8
UNE={'unerupted':1}
milch_up=[18,17,16,55,54,53,52,51,61,62,63,64,65,26,27,28]
milch_lo=[48,47,46,85,84,83,82,81,71,72,73,74,75,36,37,38]
fm={n:UNE for n in (18,17,16,26,27,28,48,47,46,36,37,38)}
fm[54]={'caries':'do','lane':['c do','']}
fm[75]={'fill':('comp','o'),'lane':['GIZ o','']}
print('milch',run('milchD',milch_up,milch_lo,fm,54))
w_up=[18,17,16,55,54,53,12,11,21,22,63,64,65,26,27,28]
w_lo=[48,47,46,85,84,83,42,41,31,32,73,74,75,36,37,38]
fw={n:UNE for n in (18,17,27,28,48,47,37,38)}
print('wechsel',run('wechselD',w_up,w_lo,fw,None))
