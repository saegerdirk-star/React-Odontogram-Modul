import math, re
exec(open('gen.py').read().split("def render(")[0])  # reuse data, themes, helpers

def P(pts): return 'M'+' L'.join(f'{x},{y}' for x,y in pts)+' Z'
def bbox_of(d):
    nums=list(map(float,re.findall(r'-?\d+\.?\d*',d)))
    xs=nums[0::2]; ys=nums[1::2]; return min(xs),min(ys),max(xs),max(ys)
def ellipse(cx,cy,rx,ry):
    return f'M{cx-rx},{cy} A{rx},{ry} 0 1 0 {cx+rx},{cy} A{rx},{ry} 0 1 0 {cx-rx},{cy} Z'
def rrect(x0,y0,x1,y1,r):
    return f'M{x0+r},{y0} L{x1-r},{y0} Q{x1},{y0} {x1},{y0+r} L{x1},{y1-r} Q{x1},{y1} {x1-r},{y1} L{x0+r},{y1} Q{x0},{y1} {x0},{y1-r} L{x0},{y0+r} Q{x0},{y0} {x0+r},{y0} Z'
def flipy(d,cy=34):
    # mirror path vertically around cy (numbers are x,y pairs; A-commands handled by only using symmetric shapes)
    toks=re.split(r'([A-Za-z])',d); out=[]; cmd=''
    for t in toks:
        if re.fullmatch(r'[A-Za-z]',t or ''): cmd=t; out.append(t); continue
        nums=re.findall(r'-?\d+\.?\d*',t)
        if not nums: out.append(t); continue
        if cmd=='A': out.append(t); continue
        v=list(map(float,nums))
        for i in range(1,len(v),2): v[i]=2*cy-v[i]
        out.append(' '.join(f'{v[i]:g},{v[i+1]:g}' for i in range(0,len(v),2)))
    return ''.join(out)
def kind(n):
    d=n%10
    if d<=2: return 'inc'
    if d==3: return 'can'
    return 'pm' if d<=5 else 'mol'

# ---------- shape styles ----------
def shapes(style,n):
    k=kind(n); up=n//10 in (1,2); nr=nroots(n)
    S={}
    if style=='D':   # anatomisch angedeutet
        crown={'mol':'M12,41.4 C8,34 6,26 7,18 Q10,6 22,7 Q31,8 38,13 Q45,8 54,7 Q66,6 69,18 C70,26 68,34 64,41.4 Z',
               'pm':'M23,41.4 C20,34 18,25 19,19 Q24,8 38,6 Q52,8 57,19 C58,25 56,34 53,41.4 Z',
               'can':'M25,41.4 C21,33 19,24 20,17 Q27,10 38,5 Q49,10 56,17 C57,24 55,33 51,41.4 Z',
               'inc':'M26,41.4 C22,32 20,20 20,10 Q20,7 23,7 L53,7 Q56,7 56,10 C56,20 54,32 50,41.4 Z'}[k]
        neck={'mol':(12,64),'pm':(23,53),'can':(25,51),'inc':(26,50)}[k]
        tips={'mol':(13,63),'pm':(26,50),'can':(38,38),'inc':(38,38)}[k]
        def root(l,r,t): return f'M{l:.1f},41.4 C{l:.1f},60 {t-4:.1f},80 {t-1.6:.1f},90 Q{t:.1f},93.5 {t+1.6:.1f},90 C{t+4:.1f},80 {r:.1f},60 {r:.1f},41.4 Z'
        occ={'mol':'M10,10 Q38,3 66,10 Q73,34 66,58 Q38,65 10,58 Q3,34 10,10 Z',
             'pm':ellipse(38,34,23,27),
             'can':'M14,34 Q20,17 38,13 Q56,17 62,34 Q56,51 38,55 Q20,51 14,34 Z',
             'inc':'M11,28 Q38,12 65,28 Q62,46 38,51 Q14,46 11,28 Z'}[k]
        inner={'mol':(25,23,51,45,8),'pm':(30,24,46,44,7),'can':(28,29,48,39,5),'inc':(23,29,53,37,3)}[k]
    elif style=='E': # geometrisch
        crown={'mol':'M11,7 L65,7 L69,12 L64,41.4 L12,41.4 L7,12 Z',
               'pm':'M23,7 L53,7 L57,13 L52,41.4 L24,41.4 L19,13 Z',
               'can':'M20,15 L38,5 L56,15 L52,41.4 L24,41.4 Z',
               'inc':'M21,7 L55,7 L51,41.4 L25,41.4 Z'}[k]
        neck={'mol':(12,64),'pm':(24,52),'can':(24,52),'inc':(25,51)}[k]
        tips={'mol':(16,60),'pm':(29,47),'can':(38,38),'inc':(38,38)}[k]
        def root(l,r,t): return f'M{l:.1f},41.4 L{r:.1f},41.4 L{t+1.5:.1f},92 L{t-1.5:.1f},92 Z'
        occ={'mol':P([(18,6),(58,6),(70,18),(70,50),(58,62),(18,62),(6,50),(6,18)]),
             'pm':P([(38,6),(62,17),(62,51),(38,62),(14,51),(14,17)]),
             'can':P([(13,34),(38,13),(63,34),(38,55)]),
             'inc':P([(11,34),(21,19),(55,19),(65,34),(55,49),(21,49)])}[k]
        inner={'mol':(25,23,51,45,0.5),'pm':(29,24,47,44,0.5),'can':(30,28,46,40,0.5),'inc':(23,30,53,38,0.5)}[k]
    else:            # F rund
        crown={'mol':'M7,22 Q7,7 22,7 L54,7 Q69,7 69,22 L69,29 Q69,41.4 57,41.4 L19,41.4 Q7,41.4 7,29 Z',
               'pm':'M19,24 Q19,6 38,6 Q57,6 57,24 L57,30 Q57,41.4 46,41.4 L30,41.4 Q19,41.4 19,30 Z',
               'can':'M20,26 Q20,5 38,5 Q56,5 56,26 L56,31 Q56,41.4 46,41.4 L30,41.4 Q20,41.4 20,31 Z',
               'inc':'M20,16 Q20,7 29,7 L47,7 Q56,7 56,16 L56,31 Q56,41.4 46,41.4 L30,41.4 Q20,41.4 20,31 Z'}[k]
        neck={'mol':(10,66),'pm':(22,54),'can':(23,53),'inc':(23,53)}[k]
        tips={'mol':(15,61),'pm':(28,48),'can':(38,38),'inc':(38,38)}[k]
        def root(l,r,t):
            w=(r-l)/2
            return f'M{l:.1f},41.4 C{l:.1f},66 {t-w*0.55:.1f},92 {t:.1f},92 C{t+w*0.55:.1f},92 {r:.1f},66 {r:.1f},41.4 Z'
        occ={'mol':rrect(6,6,70,62,24),'pm':ellipse(38,34,25,26),
             'can':ellipse(38,34,22,21),'inc':rrect(11,20,65,48,14)}[k]
        inner={'mol':(25,23,51,45,11),'pm':(29,24,47,44,9),'can':(30,28,46,40,6),'inc':(23,30,53,38,4)}[k]
    if not up and k in ('inc','can','mol') and style=='D':
        occ=flipy(occ)
    # roots: split neck into nr parts, tips spread over tips range
    gap=2.0 if nr>1 else 0
    l0,r0=neck; w=(r0-l0-gap*(nr-1))/nr; rs=[]
    for i in range(nr):
        l=l0+i*(w+gap); r=l+w
        t=(tips[0]+tips[1])/2 if nr==1 else tips[0]+i*(tips[1]-tips[0])/(nr-1)
        rs.append((root(l,r,t),(l+r)/2,t))
    x0,y0,x1,y1=bbox_of(occ) if 'A' not in occ else {'pm':(38-25,34-26,38+25,34+26) if style=='F' else (15,7,61,61),'can':(16,13,60,55)}[k]
    return dict(crown=crown,roots=rs,occ=occ,bbox=(x0,y0,x1,y1),inner=inner,kind=k)

def render2(style,fpath,theme='light'):
    T=THEMES[theme]; lane_h=36
    NEU=(T['neutral'],T['neutraledge'])
    U_side=0; U_lane=100; U_occ=100+lane_h
    nu=U_occ+82; nl=U_occ+102
    L_occ=U_occ+108; L_lane=L_occ+64; L_side=L_occ+64+lane_h
    H=L_side+114
    o=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="system-ui,-apple-system,Segoe UI,sans-serif">']
    o.append(f'<rect x="0" y="0" width="{W}" height="{H}" fill="{T["bg"]}"/>')
    o.append(f'<rect x="2" y="{U_occ}" width="{W-4}" height="{L_occ+68-U_occ}" rx="14" fill="{T["band"]}"/>')
    o.append(f'<line x1="608" y1="4" x2="608" y2="{H-4}" stroke="{T["mid"]}" stroke-width="1.2"/>')
    ink=f'stroke="{T["ink"]}" stroke-width="2" stroke-linejoin="round"'
    def side(n,x,y0,up):
        d=F.get(n,{}); s=shapes(style,n); out=[]
        if d.get('missing'):
            cy=(y0+76) if up else (y0+28)
            out.append(f'<text x="{x+38}" y="{cy+11}" text-anchor="middle" font-size="32" font-weight="600" fill="{T["missing"]}">f</text>'); return out
        sh=0; st=ink
        if d.get('unerupted'):
            sh=10; st=f'fill="none" stroke="{T["unerupt"]}" stroke-width="1.7" stroke-dasharray="0.1 4" stroke-linecap="round"'
        tr=f'translate({x},{y0+100-sh}) scale(1,-1)' if up else f'translate({x},{y0+sh})'
        g=[f'<g transform="{tr}">']
        if d.get('unerupted'):
            g.append(f'<path d="{s["crown"]}" {st}/>'+''.join(f'<path d="{p}" {st}/>' for p,_,_ in s['roots']))
            g.append('</g>'); return out+g
        if d.get('implant'):
            g.append(f'<path d="{IMPLANT}" fill="#dfe4e8" stroke="{T["post"]}" stroke-width="1.5" stroke-linejoin="round"/>')
        elif not d.get('pontic'):
            for p,_,_ in s['roots']: g.append(f'<path d="{p}" fill="{T["tooth"]}" {ink}/>')
        if 'crown' in d:
            g.append(f'<path d="{s["crown"]}" fill="{NEU[0]}" stroke="{NEU[1]}" stroke-width="2.6" stroke-linejoin="round"/>')
        else:
            g.append(f'<path d="{s["crown"]}" fill="{T["tooth"]}" {ink}/>')
        if 'veneer' in d:
            g.append(f'<rect x="27" y="10" width="22" height="28" rx="3" fill="{NEU[0]}" stroke="{NEU[1]}" stroke-width="1.6"/>')
        if d.get('wf'):
            for p,m,t in s['roots']:
                g.append(f'<line x1="{m:.1f}" y1="43" x2="{t:.1f}" y2="89" stroke="{T["wf"]}" stroke-width="3.6" stroke-linecap="round"/>')
                if d.get('post'):
                    mx=m+(t-m)*0.5
                    g.append(f'<line x1="{m:.1f}" y1="43" x2="{mx:.1f}" y2="66" stroke="{T["post"]}" stroke-width="4.6" stroke-linecap="round"/>')
        if d.get('apical'):
            t=s['roots'][0][2]; g.append(f'<circle cx="{t}" cy="89" r="6.5" fill="{T["caries"]}" opacity="0.85"/>')
        if d.get('x'):
            g.append(f'<g stroke="{T["x"]}" stroke-width="2" stroke-linecap="round"><line x1="12" y1="10" x2="64" y2="90"/><line x1="64" y1="10" x2="12" y2="90"/></g>')
        g.append('</g>'); return out+g
    def occl_(n,x,y0):
        d=F.get(n,{}); s=shapes(style,n); out=[f'<g transform="translate({x},{y0})">']
        occ=s['occ']
        if d.get('missing'):
            out.append(f'<path d="{occ}" fill="none" stroke="{T["missline"]}" stroke-width="1.2" stroke-dasharray="3 4"/></g>'); return out
        if d.get('unerupted'):
            out.append(f'<path d="{occ}" fill="none" stroke="{T["unerupt"]}" stroke-width="1.7" stroke-dasharray="0.1 4" stroke-linecap="round"/></g>'); return out
        cid=f'o{style}{n}'
        out.append(f'<clipPath id="{cid}"><path d="{occ}"/></clipPath>')
        crown='crown' in d
        out.append(f'<path d="{occ}" fill="{NEU[0] if crown else T["tooth"]}"/>')
        x0,y0_,x1,y1=[x-3 if i<2 else x+3 for i,x in enumerate(s['bbox'])]
        a,b,c,dd,r=s['inner']; ob=(x0,y0_,x1,y1,0); ib=(a,b,c,dd,r)
        g=[f'<g clip-path="url(#{cid})">']
        def sp(code): return [q for q in code if q in 'mvdl'],('o' in code)
        if 'fill' in d:
            ss,_=sp(d['fill'][1])
            for q in ss: g.append(f'<path d="{surf_poly(ob,ib,side_of(n,q))}" fill="{NEU[0]}" stroke="{NEU[1]}" stroke-width="1.6" stroke-linejoin="round"/>')
        if 'caries' in d:
            ss,_=sp(d['caries'])
            for q in ss: g.append(f'<path d="{surf_poly(ob,ib,side_of(n,q))}" fill="{T["caries"]}" stroke="{T["cariesedge"]}" stroke-width="1.2" stroke-linejoin="round"/>')
        lc=NEU[1] if crown else T['inner']
        g.append(f'<g stroke="{lc}" stroke-width="1.1" opacity="0.8"><line x1="{a}" y1="{b}" x2="{x0}" y2="{y0_}"/><line x1="{c}" y1="{b}" x2="{x1}" y2="{y0_}"/><line x1="{a}" y1="{dd}" x2="{x0}" y2="{y1}"/><line x1="{c}" y1="{dd}" x2="{x1}" y2="{y1}"/></g>')
        g.append('</g>'); out+=g
        cf=T['tooth']; ce=T['inner']; cw=1.3
        if crown: cf='none'; ce=NEU[1]; cw=1.1
        if 'fill' in d and 'o' in d['fill'][1]: cf,ce=NEU; cw=1.6
        if 'caries' in d and 'o' in d['caries']: cf,ce=T['caries'],T['cariesedge']; cw=1.4
        out.append(f'<path d="{rrect(a,b,c,dd,min(r,(dd-b)/2,(c-a)/2))}" fill="{cf}" stroke="{ce}" stroke-width="{cw}"/>')
        if s['kind'] in ('inc','can'): out.append(f'<line x1="{a+1}" y1="{(b+dd)/2}" x2="{c-1}" y2="{(b+dd)/2}" stroke="{ce if crown else T["ink"]}" stroke-width="1.4"/>')
        out.append(f'<path d="{occ}" fill="none" stroke="{NEU[1] if crown else T["ink"]}" stroke-width="{3.4 if crown else 1.9}" stroke-linejoin="round"/>')
        out.append('</g>'); return out
    # bridges 24-25-26
    if any(F.get(n,{}).get('bridge') for n in (24,25,26))==False: pass
    def bx(n,side): b=shapes(style,n)['bbox']; return b[2] if side=='r' else b[0]
    for (na,ia),(nb,ib_) in ((((24,11),(25,12)),((25,12),(26,13))) if F.get(25,{}).get('bridge') else ()):
        xa=ia*CELL+bx(na,'r')-2; xb=ib_*CELL+bx(nb,'l')+2
        o.append(f'<rect x="{xa}" y="{U_occ+29}" width="{xb-xa}" height="10" fill="{NEU[0]}" stroke="{NEU[1]}" stroke-width="1.2"/>')
        o.append(f'<rect x="{xa-6}" y="{U_side+70.8}" width="{xb-xa+12}" height="10" fill="{NEU[0]}" stroke="{NEU[1]}" stroke-width="1.2"/>')
    for i,n in enumerate(UP): o+=side(n,i*CELL,U_side,True); o+=occl_(n,i*CELL,U_occ)
    for i,n in enumerate(LO): o+=occl_(n,i*CELL,L_occ); o+=side(n,i*CELL,L_side,False)
    for i,(a_,b_) in enumerate(zip(UP,LO)):
        cx=i*CELL+38
        for n,y in ((a_,nu),(b_,nl)):
            if n==SEL:
                o.append(f'<rect x="{cx-17}" y="{y-14.5}" width="34" height="19" rx="9.5" fill="{T["selbg"]}"/><text x="{cx}" y="{y}" text-anchor="middle" font-size="14" font-weight="700" fill="{T["selfg"]}">{n}</text>')
            else:
                o.append(f'<text x="{cx}" y="{y}" text-anchor="middle" font-size="14" font-weight="600" fill="{T["num"]}">{n}</text>')
    for row,ly in ((UP,U_lane),(LO,L_lane)):
        for i,n in enumerate(row):
            for k,t in enumerate(F.get(n,{}).get('lane',[])):
                if not t: continue
                col=T['lanec'] if t.startswith('c ') or t=='x' else T['lane']
                o.append(f'<text x="{i*CELL+38}" y="{ly+15+k*14}" text-anchor="middle" font-size="12" font-weight="600" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" fill="{col}">{t}</text>')
    o.append('</svg>'); open(fpath,'w').write('\n'.join(o)); return H
for st in 'DEF':
    print(st, render2(st,f'var{st}.svg'))
