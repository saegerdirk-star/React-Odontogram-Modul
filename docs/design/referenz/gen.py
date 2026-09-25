import math
W=1216; CELL=76
UP=[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28]
LO=[48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38]
def cls(n):
    d=n%10
    return 'front' if d<=3 else ('pm' if d<=5 else 'mol')
def nroots(n):
    d=n%10; up=n//10 in (1,2)
    if d>=6: return 3 if up else 2
    if d==4 and up: return 2
    return 1
# test findings
F={
 18:{'missing':1},28:{'missing':1},48:{'missing':1},38:{'unerupted':1},
 16:{'crown':'gold','badge':'K','lane':['K G','']},
 15:{'caries':'mo','lane':['c mo','']},
 14:{'fill':('comp','do'),'lane':['Kst do','']},
 12:{'fill':('amal','m'),'lane':['Am m','']},
 11:{'veneer':'emax','badge':'V','lane':['V Ker','']},
 21:{'caries':'v','lane':['c v','']},
 24:{'crown':'gradia','badge':'K','bridge':1,'lane':['K Kst','']},
 25:{'crown':'gradia','badge':'B','bridge':1,'pontic':1,'lane':['B Kst','']},
 26:{'crown':'gradia','badge':'B','bridge':1,'lane':['B Kst','']},
 47:{'crown':'emax','badge':'K','wf':1,'post':1,'lane':['K Ker','WF St']},
 46:{'caries':'mod','x':1,'lane':['c mod','x']},
 45:{'wf':1,'apical':1,'lane':['','WF']},
 33:{'caries':'l','lane':['c l','']},
 36:{'crown':'zirk','badge':'K','implant':1,'lane':['K Ker','i']},
}
SEL=16
MAT={ # A palette: fill, edge, hatch
 'gold':('#e0a21c','#7a5200',0),'amal':('#838c95','#3f474f',0),'comp':('#f1e2bb','#9c7a3a',0),
 'emax':('#ead6b3','#8a6a3a',1),'zirk':('#86b6da','#2f5f86',1),'gradia':('#93c25a','#46701c',0)}
THEMES={
 'light':dict(bg='#f3f6fb',band='#e5eaf1',tooth='#ffffff',ink='#26344d',inner='#26344d',num='#34425a',
   selbg='#26344d',selfg='#ffffff',mid='#b3bdcb',missing='#56657c',missline='#c3cbd6',unerupt='#5f6e85',
   caries='#d32f2f',cariesedge='#8e1b1b',wf='#e07b16',post='#6b737b',neutral='#aab8ca',neutraledge='#4f6179',
   lane='#26344d',lanec='#b3261e',x='#b70000'),
 'dark':dict(bg='#11151b',band='#181e27',tooth='#eef1f5',ink='#0b0e12',inner='#5b677a',num='#c5cdd8',
   selbg='#eef1f5',selfg='#11151b',mid='#3a4352',missing='#95a0b0',missline='#3a4352',unerupt='#a3adbb',
   caries='#e5392e',cariesedge='#8e1b1b',wf='#f28c28',post='#7d858c',neutral='#9aabc2',neutraledge='#43556e',
   lane='#d2d9e3',lanec='#ff8a80',x='#ff5a4f'),
}
def occl(c):
    if c=='mol': return (6,6,70,62,11),(25,23,51,45,5)
    if c=='pm': return (13,8,63,60,18),(29,24,47,44,6)
    return (12,17,64,51,8),(23,29,53,39,3)
def rr(b,extra=''):
    x0,y0,x1,y1,r=b; return f'<rect x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}" rx="{r}" {extra}/>'
def surf_poly(o,i,side):
    x0,y0,x1,y1,_=o; a,b,c,d,_=i
    P={'top':[(x0,y0),(x1,y0),(c,b),(a,b)],'bottom':[(x0,y1),(x1,y1),(c,d),(a,d)],
       'left':[(x0,y0),(x0,y1),(a,d),(a,b)],'right':[(x1,y0),(x1,y1),(c,d),(c,b)]}[side]
    return 'M'+' L'.join(f'{p[0]},{p[1]}' for p in P)+' Z'
def side_of(n,s):
    q=n//10; up=q in (1,2,5,6)
    if s=='v': return 'top' if up else 'bottom'
    if s=='l': return 'bottom' if up else 'top'
    towards_mid_right = q in (1,4,5,8)
    if s=='m': return 'right' if towards_mid_right else 'left'
    if s=='d': return 'left' if towards_mid_right else 'right'
def crown_path(c):
    a,b=(7,69) if c=='mol' else (19,57)
    m=(a+b)/2
    return f'M{a},16 Q{a},7 {m},7 Q{b},7 {b},16 L{b},41.4 L{a},41.4 Z',a,b
def roots(c,n):
    a,b=(7,69) if c=='mol' else (19,57)
    g=2.5; w=(b-a-g*(n-1))/n; out=[]
    for k in range(n):
        l=a+k*(w+g); r=l+w; t=(l+r)/2
        out.append((f'M{l:.1f},41.4 L{r:.1f},41.4 L{t+2.2:.1f},89 Q{t:.1f},93 {t-2.2:.1f},89 Z',t))
    return out
IMPLANT='M28.0,41.4 L31.0,47.1 L29.2,52.9 L32.2,58.6 L30.4,64.3 L33.5,70.1 L31.7,75.8 L34.7,81.5 L32.9,87.3 L35.9,93.0 L40.1,93.0 L43.1,87.3 L41.3,81.5 L44.3,75.8 L42.5,70.1 L45.6,64.3 L43.8,58.6 L46.8,52.9 L45.0,47.1 L48.0,41.4 Z'

def render(theme='light', neutral=False, lane=False, fpath=None):
    T=THEMES[theme]; lane_h=36 if lane else 0
    def mfill(m):
        if neutral: return T['neutral'],T['neutraledge'],0
        return MAT[m]
    U_side=0; U_lane=100; U_occ=100+lane_h
    nu=U_occ+82; nl=U_occ+102
    L_occ=U_occ+108; L_lane=L_occ+64; L_side=L_occ+64+lane_h
    H=L_side+114
    o=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="system-ui,-apple-system,Segoe UI,sans-serif">']
    o.append('<defs>')
    for m,(f,e,h) in MAT.items():
        o.append(f'<pattern id="h-{m}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="{f}"/><line x1="0" y1="0" x2="0" y2="5" stroke="{e}" stroke-width="1" opacity="0.45"/></pattern>')
    o.append('</defs>')
    o.append(f'<rect x="0" y="0" width="{W}" height="{H}" fill="{T["bg"]}"/>')
    o.append(f'<rect x="2" y="{U_occ}" width="{W-4}" height="{L_occ+68-U_occ}" rx="14" fill="{T["band"]}"/>')
    o.append(f'<line x1="608" y1="4" x2="608" y2="{H-4}" stroke="{T["mid"]}" stroke-width="1.2"/>')
    def paint(m):
        f,e,h=mfill(m); return (f'url(#h-{m})' if h else f), e
    def draw_side(n,x,y0,up):
        d=F.get(n,{}); c=cls(n); out=[]
        cp,a,b=crown_path(c)
        tr=f'translate({x},{y0+100}) scale(1,-1)' if up else f'translate({x},{y0})'
        if d.get('missing'):
            cx=x+38; cy=(y0+76) if up else (y0+28)
            out.append(f'<text x="{cx}" y="{cy+11}" text-anchor="middle" font-size="32" font-weight="600" fill="{T["missing"]}">f</text>')
            return out
        if d.get('unerupted'):
            sh=(-10 if up else 10)
            g=f'<g transform="translate({x},{y0+100+sh}) scale(1,-1)">' if up else f'<g transform="translate({x},{y0+sh})">'
            st=f'fill="none" stroke="{T["unerupt"]}" stroke-width="1.7" stroke-dasharray="0.1 4" stroke-linecap="round"'
            out.append(g+f'<path d="{cp}" {st}/>'+''.join(f'<path d="{p}" {st}/>' for p,_ in roots(c,nroots(n)))+'</g>')
            return out
        g=[f'<g transform="{tr}">']
        base=f'stroke="{T["ink"]}" stroke-width="2" stroke-linejoin="round"'
        if d.get('implant'):
            g.append(f'<path d="{IMPLANT}" fill="{"#8d96a1" if theme=="dark" else "#dfe4e8"}" stroke="{T["post"]}" stroke-width="1.5" stroke-linejoin="round"/>')
        elif not d.get('pontic'):
            for p,t in roots(c,nroots(n)):
                g.append(f'<path d="{p}" fill="{T["tooth"]}" {base}/>')
        if 'crown' in d:
            f,e=paint(d['crown'])
            g.append(f'<path d="{cp}" fill="{f}" stroke="{e}" stroke-width="2.6" stroke-linejoin="round"/>')
        else:
            g.append(f'<path d="{cp}" fill="{T["tooth"]}" {base}/>')
        if 'veneer' in d:
            f,e=paint(d['veneer'])
            g.append(f'<rect x="{a+3}" y="10" width="{b-a-6}" height="29" rx="3" fill="{f}" stroke="{e}" stroke-width="1.6"/>')
        if d.get('wf'):
            for p,t in roots(c,nroots(n)):
                g.append(f'<line x1="{t:.1f}" y1="43" x2="{t:.1f}" y2="90" stroke="{T["wf"]}" stroke-width="3.6" stroke-linecap="round"/>')
                if d.get('post'):
                    g.append(f'<line x1="{t:.1f}" y1="43" x2="{t:.1f}" y2="66" stroke="{T["post"]}" stroke-width="4.6" stroke-linecap="round"/>')
        if d.get('apical'):
            t=roots(c,1)[0][1]
            g.append(f'<circle cx="{t}" cy="89" r="6.5" fill="{T["caries"]}" opacity="0.85"/>')
        if d.get('x'):
            g.append(f'<g stroke="{T["x"]}" stroke-width="2" stroke-linecap="round"><line x1="12" y1="10" x2="64" y2="90"/><line x1="64" y1="10" x2="12" y2="90"/></g>')
        g.append('</g>')
        out+=g
        if not lane and d.get('badge'):
            by=(y0+54) if up else (y0+54)
            bx=x+b+4 if b<69 else x+72
            out.append(f'<text x="{x+73}" y="{(y0+98) if up else (y0+14)}" text-anchor="end" font-size="13" font-weight="700" fill="{T["ink"] if theme=="light" else T["num"]}">{d["badge"]}</text>')
        return out
    def draw_occl(n,x,y0):
        d=F.get(n,{}); c=cls(n); ob,ib=occl(c); out=[f'<g transform="translate({x},{y0})">']
        if d.get('missing'):
            out.append(rr(ob,f'fill="none" stroke="{T["missline"]}" stroke-width="1.2" stroke-dasharray="3 4"'))
            out.append('</g>'); return out
        if d.get('unerupted'):
            out.append(rr(ob,f'fill="none" stroke="{T["unerupt"]}" stroke-width="1.7" stroke-dasharray="0.1 4" stroke-linecap="round"'))
            out.append('</g>'); return out
        cid=f'c{n}{theme}{int(neutral)}{int(lane)}'
        out.append(f'<clipPath id="{cid}">{rr(ob)}</clipPath>')
        crown='crown' in d
        if crown:
            f,e=paint(d['crown']); out.append(rr(ob,f'fill="{f}"'))
        else:
            out.append(rr(ob,f'fill="{T["tooth"]}"'))
        g=[f'<g clip-path="url(#{cid})">']
        def surfaces(code):
            return [s for s in code if s in 'mvdl'], ('o' in code)
        if 'fill' in d:
            m,code=d['fill']; f,e=paint(m); ss,oc=surfaces(code)
            for s in ss: g.append(f'<path d="{surf_poly(ob,ib,side_of(n,s))}" fill="{f}" stroke="{e}" stroke-width="1.6" stroke-linejoin="round"/>')
        if 'caries' in d:
            ss,oc=surfaces(d['caries'])
            for s in ss: g.append(f'<path d="{surf_poly(ob,ib,side_of(n,s))}" fill="{T["caries"]}" stroke="{T["cariesedge"]}" stroke-width="1.2" stroke-linejoin="round"/>')
        # full diagonals
        x0,y0_,x1,y1,_=ob; a,b,cc,dd,_=ib
        lc=T['inner'] if not crown else (paint(d['crown'])[1])
        g.append(f'<g stroke="{lc}" stroke-width="1.1" opacity="0.8"><line x1="{a}" y1="{b}" x2="{x0}" y2="{y0_}"/><line x1="{cc}" y1="{b}" x2="{x1}" y2="{y0_}"/><line x1="{a}" y1="{dd}" x2="{x0}" y2="{y1}"/><line x1="{cc}" y1="{dd}" x2="{x1}" y2="{y1}"/></g>')
        g.append('</g>'); out+=g
        # center
        cf=T['tooth']; ce=T['inner']; cw=1.3
        if crown: cf='none'; ce=paint(d['crown'])[1]; cw=1.1
        if 'fill' in d and 'o' in d['fill'][1]: cf,ce=paint(d['fill'][0]); cw=1.6
        if 'caries' in d and 'o' in d['caries']: cf,ce=T['caries'],T['cariesedge']; cw=1.4
        out.append(rr(ib,f'fill="{cf}" stroke="{ce}" stroke-width="{cw}"'))
        if c=='front': out.append(f'<line x1="{ib[0]+1}" y1="34" x2="{ib[2]-1}" y2="34" stroke="{ce if crown else T["ink"]}" stroke-width="1.4"/>')
        if crown:
            f,e=paint(d['crown']); out.append(rr(ob,f'fill="none" stroke="{e}" stroke-width="3.4"'))
        else:
            out.append(rr(ob,f'fill="none" stroke="{T["ink"]}" stroke-width="1.9"'))
        out.append('</g>'); return out
    # bridges
    def bridge(xa,xb,occy,sidey,m):
        f,e=paint(m)
        o.append(f'<rect x="{xa}" y="{occy}" width="{xb-xa}" height="10" fill="{f}" stroke="{e}" stroke-width="1.2"/>')
        o.append(f'<rect x="{xa-6}" y="{sidey}" width="{xb-xa+12}" height="10" fill="{f}" stroke="{e}" stroke-width="1.2"/>')
    # 24(pm 13..63)-25(pm)-26(mol 6..70) cells 11,12,13
    bridge(11*CELL+63,12*CELL+13,U_occ+29,U_side+70.8,'gradia')
    bridge(12*CELL+63,13*CELL+6,U_occ+29,U_side+70.8,'gradia')
    for i,n in enumerate(UP):
        x=i*CELL
        o+=draw_side(n,x,U_side,True); o+=draw_occl(n,x,U_occ)
    for i,n in enumerate(LO):
        x=i*CELL
        o+=draw_occl(n,x,L_occ); o+=draw_side(n,x,L_side,False)
    # numbers
    for i,(nu_,nl_) in enumerate(zip(UP,LO)):
        cx=i*CELL+38
        for n,y in ((nu_,nu),(nl_,nl)):
            if n==SEL:
                o.append(f'<rect x="{cx-17}" y="{y-14.5}" width="34" height="19" rx="9.5" fill="{T["selbg"]}"/>')
                o.append(f'<text x="{cx}" y="{y}" text-anchor="middle" font-size="14" font-weight="700" fill="{T["selfg"]}">{n}</text>')
            else:
                o.append(f'<text x="{cx}" y="{y}" text-anchor="middle" font-size="14" font-weight="600" fill="{T["num"]}">{n}</text>')
    if lane:
        for row,ly in ((UP,U_lane),(LO,L_lane)):
            for i,n in enumerate(row):
                ln=F.get(n,{}).get('lane')
                if not ln: continue
                cx=i*CELL+38
                for k,t in enumerate(ln):
                    if not t: continue
                    col=T['lanec'] if t.startswith('c ') or t=='x' else T['lane']
                    o.append(f'<text x="{cx}" y="{ly+15+k*14}" text-anchor="middle" font-size="12" font-weight="600" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" fill="{col}">{t}</text>')
    o.append('</svg>')
    s='\n'.join(o)
    if fpath: open(fpath,'w').write(s)
    return H
if __name__=='__main__':
    import sys
    for name,kw in (('A',dict(theme='light')),('B',dict(theme='light',neutral=True,lane=True)),('C',dict(theme='dark',neutral=True,lane=True))):
        h=render(fpath=f'/home/claude/gen/var{name}.svg',**kw); print(name,h)
