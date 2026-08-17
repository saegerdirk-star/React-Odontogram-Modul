# Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
# Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
# Dirk Saeger, Malte Sussdorff 2026

"""Take a hand-redrawn tooth outline and pull the whole template onto it.

The ~200 clinical layers are NOT rebuilt. They are carried: `16_fertig.svg` from
the earlier round holds exactly the same 203 ids as the shipped `16.svg`, and
only the `d` attributes differ. That is also why the SVG parity fingerprint
survives - it records id, opacity and class, and none of those move. `graft.py`
states the same contract for its own, narrower transplant.

What was missing was the map from the old outline to the new one. `make_warp` in
build.py only bends vertically, which is enough to derive one tooth class from
another but not to follow a redrawn contour.

CORRESPONDENCE runs over HEIGHT, not over arc length.

Arc length was the first attempt and it is wrong even for an incisor, which the
eye does not catch. On 11 the old outline is 34.7 wide and the redrawn one 21.4;
the wide one therefore spends much more of its perimeter on the near-horizontal
stretches, so a point at 40 percent of the old perimeter sits at a quite
different height than one at 40 percent of the new. The outline still matched
exactly - it is pinned - but the interior sheared: measured along the axis, the
local vertical stretch fell to 0.29 in the middle of the tooth and rose to 2.26
in the crown. The pulp came out 35 percent shorter and ended halfway down the
root, which is what Dirk saw.

A tooth corresponds by height. For each of N heights the outline is cut and its
left and right edge paired with the left and right edge at the matching height
of the other outline. Heights are matched relative to three landmarks - apex,
cervical line, incisal or occlusal edge - so the cervix maps to the cervix even
when the two teeth divide their length differently.

Anchors add the horizontal counterpart, and only multi-rooted teeth need them:
at a height that cuts three roots there are six edges, and which of them belongs
to which is not decided by position alone. `<n>_anker_alt.svg` / `_neu.svg` name
the root tips and the notches between them, so the runs can be matched in order.

DISPLACEMENT. A thin-plate spline over the paired points. It interpolates the
contour exactly and stays smooth inside, which matters because every layer in
the tooth rides on the same field and a kink would show up in all of them at
once.

NOT WARPED: `gum-base` and `bone-base`. Those are drawn in final frame
coordinates by `gum.py` - a papilla is shared between two neighbours and belongs
to the column, not to the tooth. Dragging them along with a redrawn root would
tear the gum line apart across the arch.
"""
from __future__ import annotations

import re
import numpy as np

import svgpath

NICHT_VERFORMEN = ("gum-base", "bone-base")


def polygon(d: str, schritt: float = 0.35) -> np.ndarray:
    pts = [(a[-2], a[-1]) for c, a in svgpath.subdivide(svgpath.to_absolute(d), max_dy=schritt)
           if c != "Z"]
    P = np.asarray(pts, float)
    if len(P) > 1 and np.allclose(P[0], P[-1]):
        P = P[:-1]
    return P


def im_uhrzeigersinn(P: np.ndarray) -> np.ndarray:
    f = sum(P[i][0]*P[(i+1) % len(P)][1] - P[(i+1) % len(P)][0]*P[i][1]
            for i in range(len(P)))
    return P if f < 0 else np.roll(P[::-1], 1, axis=0)


def _bogenlaenge(P: np.ndarray) -> np.ndarray:
    d = np.sqrt((np.diff(np.vstack([P, P[:1]]), axis=0) ** 2).sum(1))
    return np.concatenate([[0.0], np.cumsum(d)])


def abtasten(P: np.ndarray, n: int, start: int = 0) -> np.ndarray:
    """n Punkte, gleichmaessig nach Bogenlaenge, ab Index `start`."""
    Q = np.roll(P, -start, axis=0)
    s = _bogenlaenge(Q)
    ziel = np.linspace(0.0, s[-1], n, endpoint=False)
    out = []
    for t in ziel:
        k = int(np.clip(np.searchsorted(s, t) - 1, 0, len(Q) - 1))
        a, b = Q[k], Q[(k + 1) % len(Q)]
        seg = max(1e-9, s[k + 1] - s[k])
        out.append(a + (b - a) * ((t - s[k]) / seg))
    return np.asarray(out)


def _naechster(P: np.ndarray, p) -> int:
    return int(np.argmin(((P - np.asarray(p)) ** 2).sum(1)))


def paare(P_alt: np.ndarray, P_neu: np.ndarray,
          anker_alt=None, anker_neu=None, pro_abschnitt: int = 14):
    """Korrespondierende Punktpaare auf beiden Konturen.

    Ohne Anker: ein Abschnitt ueber die ganze Kontur, Start am apikalsten Punkt.
    Mit Ankern: je Ankerintervall ein eigener Abschnitt.
    """
    A = im_uhrzeigersinn(P_alt)
    B = im_uhrzeigersinn(P_neu)
    if not anker_alt:
        sA = int(np.argmin(A[:, 1]))
        sB = int(np.argmin(B[:, 1]))
        n = pro_abschnitt * 5
        return abtasten(A, n, sA), abtasten(B, n, sB)

    namen = [k for k in anker_alt if k in anker_neu]
    iA = sorted(((_naechster(A, anker_alt[k]), k) for k in namen))
    reihenfolge = [k for _, k in iA]
    iB = {k: _naechster(B, anker_neu[k]) for k in namen}

    pa, pb = [], []
    for j, k in enumerate(reihenfolge):
        k2 = reihenfolge[(j + 1) % len(reihenfolge)]
        a0, a1 = iA[j][0], iA[(j + 1) % len(iA)][0]
        b0, b1 = iB[k], iB[k2]
        segA = A[a0:a1] if a1 > a0 else np.vstack([A[a0:], A[:a1]])
        segB = B[b0:b1] if b1 > b0 else np.vstack([B[b0:], B[:b1]])
        if len(segA) < 2 or len(segB) < 2:
            continue
        m = pro_abschnitt
        pa.append(abtasten(np.vstack([segA, segA[:1]]), m))
        pb.append(abtasten(np.vstack([segB, segB[:1]]), m))
    return np.vstack(pa), np.vstack(pb)


class Spline:
    """Thin-Plate-Spline ueber Punktpaare. Interpoliert die Stuetzstellen exakt.

    AUSSERHALB der Stuetzstellen geht er in die Affinabbildung ueber. Ein
    Thin-Plate-Spline waechst dort sonst unbegrenzt, und ein Zahn traegt reichlich
    Ebenen, die ueber seinen Rand hinausreichen: Veneerraender, Bruecken- und
    Implantatverbinder, Zahnstein, die Kronenrand-Leckage. Am Einunddreissiger
    landeten sie bis zu 63 Einheiten neben einem 17 Einheiten breiten Zahn -
    als Strich, der aus der Krone haengt. Dirk: "die Umrisslinie ist nicht sauber
    an der Krone".

    Der radiale Anteil wird deshalb mit dem Abstand zur naechsten Stuetzstelle
    ausgeblendet, der affine bleibt. Innen aendert sich nichts - dort ist der
    Abstand klein und das Gewicht 1, die Kontur wird weiterhin exakt getroffen.
    """

    def __init__(self, quelle: np.ndarray, ziel: np.ndarray, glaettung: float = 0.0,
                 zaehmen: bool = True):
        self.Q = np.asarray(quelle, float)
        spanne = float(max(np.ptp(self.Q[:, 0]), np.ptp(self.Q[:, 1]))) if len(self.Q) else 0.0
        self.d0 = 0.25 * spanne if zaehmen else float("inf")
        self.d1 = 0.70 * spanne if zaehmen else float("inf")
        n = len(self.Q)
        d2 = ((self.Q[:, None, :] - self.Q[None, :, :]) ** 2).sum(-1)
        K = np.where(d2 > 0, d2 * np.log(np.maximum(d2, 1e-12)) * 0.5, 0.0)
        if glaettung:
            K = K + np.eye(n) * glaettung
        P = np.hstack([np.ones((n, 1)), self.Q])
        L = np.zeros((n + 3, n + 3))
        L[:n, :n] = K
        L[:n, n:] = P
        L[n:, :n] = P.T
        Y = np.zeros((n + 3, 2))
        Y[:n] = np.asarray(ziel, float)
        self.W = np.linalg.solve(L, Y)

    def __call__(self, x: float, y: float):
        p = np.array([x, y], float)
        d2 = ((self.Q - p) ** 2).sum(1)
        affin = self.W[-3] + self.W[-2] * x + self.W[-1] * y
        nah = float(np.sqrt(d2.min()))
        if nah >= self.d1:
            return float(affin[0]), float(affin[1])
        U = np.where(d2 > 0, d2 * np.log(np.maximum(d2, 1e-12)) * 0.5, 0.0)
        radial = U @ self.W[:len(self.Q)]
        if nah > self.d0:
            radial = radial * 0.5 * (1.0 + np.cos(np.pi * (nah - self.d0) / (self.d1 - self.d0)))
        v = affin + radial
        return float(v[0]), float(v[1])


def tooth_base_d(txt: str) -> str:
    m = (re.search(r'<path[^>]*\sid="tooth-base"[^>]*\sd="([^"]+)"', txt)
         or re.search(r'<path[^>]*\sd="([^"]+)"[^>]*\sid="tooth-base"', txt))
    if not m:
        raise ValueError("kein tooth-base im Template")
    return m.group(1)


def _kanten(P, y: float):
    """Schnittpunkte mit der Waagerechten y, von links nach rechts.

    `P` darf eine Kontur ODER eine Liste von Konturen sein. Mehrere Konturen
    werden ueber ihre KANTEN vereinigt, nicht ueber ihre Punkte: Punkte
    aneinanderzuhaengen (`np.vstack`) macht aus zwei Formen eine, deren
    Waagerechte das Ende der einen mit dem Anfang der anderen verbindet, und
    die Laeufe sind dann frei erfunden. Am oberen Sechser ist das der
    Unterschied zwischen "Kammer, zwei bukkale Kanaele, palatinaler Kanal" und
    einem Gebilde, das es nicht gibt.
    """
    xs = []
    for Q in (P if isinstance(P, (list, tuple)) else [P]):
        n = len(Q)
        for i in range(n):
            x1, y1 = Q[i]
            x2, y2 = Q[(i + 1) % n]
            if (y1 - y) * (y2 - y) < 0:
                t = (y - y1) / (y2 - y1)
                xs.append(x1 + (x2 - x1) * t)
    return sorted(xs)


def _alle(P):
    return list(P) if isinstance(P, (list, tuple)) else [np.asarray(P, float)]


def region(pfade, schritt: float = 0.35):
    """Die Pfade einer Ebene, die den UMRISS bilden - innere Zeichnung faellt weg.

    Eine Pulpaebene enthaelt nicht nur ihren Rand. Am Template des oberen
    Sechsers ist `tooth-healthy-pulp` eine <g> aus zwei Pfaden: dem ganzen
    Pulpaumriss samt aller drei Kanaele und, darin liegend, der Zeichnung des
    Kammerbodens. Dirk zeichnet dieselbe Pulpa anders zerlegt - Kammer mit den
    beiden bukkalen Kanaelen als einen Pfad, den palatinalen Kanal als zweiten,
    weil der hinter den anderen liegt.

    Die beiden Zerlegungen paarweise zuzuordnen geht deshalb nicht; nach der
    Breite zugeordnet traf der Kammerboden auf den palatinalen Kanal und die
    Pulpa zerfaserte in Spitzen. Was auf beiden Seiten dasselbe ist, ist die
    REGION. Ein Pfad, der ganz innerhalb eines anderen liegt, ist Zeichnung und
    gehoert nicht zum Rand - der palatinale Kanal ragt oben aus dem anderen
    heraus und bleibt, der Kammerboden liegt drin und faellt weg.
    """
    Ps = [polygon(d, schritt) for d in pfade]
    aussen = []
    for i, P in enumerate(Ps):
        if not any(j != i and _liegt_in(P, Q) for j, Q in enumerate(Ps)):
            aussen.append(P)
    return aussen or Ps


def _liegt_in(P: np.ndarray, Q: np.ndarray) -> bool:
    """Liegt JEDER Punkt von P innerhalb von Q?"""
    if not (Q[:, 0].min() <= P[:, 0].min() and P[:, 0].max() <= Q[:, 0].max()
            and Q[:, 1].min() <= P[:, 1].min() and P[:, 1].max() <= Q[:, 1].max()):
        return False
    kanten = list(zip(Q, np.roll(Q, -1, axis=0)))
    for x, y in P:
        n = 0
        for (x0, y0), (x1, y1) in kanten:
            if (y0 > y) != (y1 > y) and x0 + (y - y0) * (x1 - x0) / (y1 - y0) > x:
                n += 1
        if n % 2 == 0:
            return False
    return True


def _laeufe(xs):
    """Kanten paarweise zu Abschnitten - eine gefuellte Zeile hat gerade viele."""
    return [(xs[i], xs[i + 1]) for i in range(0, len(xs) - 1, 2)]


def stufen_profil(P, n: int = 1200):
    """Die Hoehen, auf denen sich die Zahl der Laeufe aendert.

    Ein Lauf ist ein gefuelltes Stueck einer Waagerechten. Von der Wurzelspitze
    her gezaehlt geht der obere Sechser 1 -> 2 -> 3 (die drei Wurzeln treten
    nacheinander auf), spaeter 3 -> 1 (Furkation) und in der Krone noch einmal
    1 -> 2 -> 1 (die Hoeckerkerbe). Diese Folge IST der Bauplan des Zahns.
    """
    y0 = min(float(Q[:, 1].min()) for Q in _alle(P))
    y1 = max(float(Q[:, 1].max()) for Q in _alle(P))
    ys = np.linspace(y0 + 1e-4, y1 - 1e-4, n)
    k = [len(_laeufe(_kanten(P, y))) for y in ys]
    st = [((ys[i] + ys[i - 1]) / 2, k[i - 1], k[i]) for i in range(1, n) if k[i] != k[i - 1]]

    # Kerben, die zu klein sind, um Anatomie zu sein, wieder herausnehmen.
    # Am Template des Einunddreissigers gibt es auf halber Hoehe eine Delle von
    # einer Einheit, in Dirks Zeichnung an der Schneidekante eine von 0,05 -
    # `laufmarken` hat die beiden miteinander gepaart und damit die Zahnmitte
    # auf die Schneidekante abgebildet. Der Umriss sass danach immer noch
    # (Median 0,03), das Innere war zerrissen: Ebenen der Krone landeten 50
    # Einheiten neben dem Zahn.
    mindest = 0.025 * (y1 - y0)
    while True:
        for i in range(len(st) - 1):
            if st[i + 1][0] - st[i][0] < mindest and st[i + 1][2] == st[i][1]:
                del st[i:i + 2]
                break
        else:
            break
    return st


def baender(P, n: int = 1600):
    """Die Zweigbaender einer Kontur - Wurzeln und Hoecker, je mit ihren Spitzen.

    Ein Zweigband ist ein Hoehenabschnitt, in dem die Kontur in mehrere Laeufe
    zerfaellt: die drei Wurzeln zwischen Spitze und Furkation, die Hoecker
    zwischen Fissur und Kaukante. Je Zweig werden sein x-Bereich an der Gabel
    und die Hoehe seiner eigenen Spitze zurueckgegeben.

    Das braucht es, weil eine Hoehe allein die Wurzeln nicht auseinanderhaelt.
    Am oberen Sechser ist im Template die AEUSSERE Wurzel die laengste
    (Spitze 14,7 gegen 16,9 in der Mitte), in Dirks Zeichnung die MITTLERE, der
    palatinale Kanal (11,0 gegen 13,0 aussen) - anatomisch richtig, und beim
    oberen Molaren die laengste Wurzel ueberhaupt. Eine Zuordnung ueber die
    Hoehe paart dann die laengste mit der laengsten, also aussen mit Mitte, und
    zieht die Wurzelspitze quer ueber den Zahn. Genau das war im Bild zu sehen.

    Die Spitzenseite eines Bandes ist die dem Zahnende zugewandte - Wurzeln
    zeigen nach apikal, Hoecker nach okklusal.
    """
    ys = np.linspace(min(float(Q[:, 1].min()) for Q in _alle(P)),
                     max(float(Q[:, 1].max()) for Q in _alle(P)), n)
    k = [len(_laeufe(_kanten(P, y))) for y in ys]
    out = []
    i = 0
    while i < n:
        if k[i] < 2:
            i += 1
            continue
        j = i
        while j + 1 < n and k[j + 1] >= 2:
            j += 1
        spitzen_unten = (ys[i] - ys[0]) <= (ys[-1] - ys[j])
        gabel = ys[j] if spitzen_unten else ys[i]
        # Die Zweige dort ablesen, wo es die MEISTEN gibt - nicht an der Gabel.
        # An der Gabel sind am oberen Sechser schon zwei Wurzeln verschmolzen.
        # Aber nicht auf einer einzelnen Hoehe: wo eine Kontur sich streift,
        # zerfaellt sie fuer eine Zeile in Splitter von 0,02 Einheiten Breite,
        # und die Pulpa bekam so vier "Wurzeln". Also die LAENGSTE zusammen-
        # haengende Strecke mit der hoechsten Laufzahl, und daraus die Mitte.
        hoch = max(k[i:j + 1])
        laengste, lauf = (i, i), None
        for t in range(i, j + 2):
            if t <= j and k[t] == hoch:
                lauf = lauf or t
            elif lauf is not None:
                if t - lauf > laengste[1] - laengste[0]:
                    laengste = (lauf, t)
                lauf = None
        breit = (laengste[0] + laengste[1]) // 2
        gesamt = max(float(Q[:, 0].max()) for Q in _alle(P)) \
            - min(float(Q[:, 0].min()) for Q in _alle(P))
        start = [(a, b) for a, b in _laeufe(_kanten(P, ys[breit]))
                 if b - a >= 0.02 * gesamt]     # Splitter sind keine Wurzeln
        if len(start) < 2:
            i = j + 1
            continue

        # Jeden Zweig ZEILE FUER ZEILE verfolgen statt ihn an einer festen
        # x-Spanne wiederzuerkennen. Ein Wurzelkanal ist schmal und laeuft
        # schraeg; die Spanne, unter der er in der Mitte liegt, trifft ihn oben
        # nicht mehr, und seine Spitze wurde 35 Einheiten zu tief gemeldet.
        # Nebenertrag: so bekommt jeder Zweig seine EIGENE Gabelhoehe, und
        # damit bleiben zwei verschieden tiefe Furkationen erhalten.
        spuren = [{ys[breit]: r} for r in start]
        enden = {}
        for schritt in (-1, +1):
            lebt = set(range(len(start)))
            jetzt = dict(enumerate(start))
            t = breit
            while lebt and 0 <= t + schritt < n:
                t += schritt
                laeufe = _laeufe(_kanten(P, ys[t]))
                gefunden = {}
                for z in sorted(lebt):
                    l0, r0 = jetzt[z]
                    treffer = [(l, r) for l, r in laeufe if l < r0 and l0 < r]
                    if len(treffer) != 1:
                        lebt.discard(z)
                        enden.setdefault((z, schritt), ys[t - schritt])
                        continue
                    gefunden[z] = treffer[0]
                for lauf, zs in _nach_lauf(gefunden).items():
                    if len(zs) > 1:            # verschmolzen: hier endet der Zweig
                        for z in zs:
                            lebt.discard(z)
                            enden.setdefault((z, schritt), ys[t - schritt])
                for z in sorted(lebt):
                    jetzt[z] = gefunden[z]
                    spuren[z][ys[t]] = gefunden[z]
            for z in lebt:
                enden.setdefault((z, schritt), ys[t])

        # Ein Zweig endet spaetestens an der Gabel des Bandes. Sonst laeuft die
        # letzte ueberlebende Wurzel weiter durch den ganzen Zahn: ihre Nachbarn
        # sind schon verschmolzen, also findet sie niemanden mehr, mit dem sie
        # verschmelzen koennte.
        zur_spitze = -1 if spitzen_unten else 1
        grenze = (min if spitzen_unten else max)
        zweige = [{"spur": spuren[z],
                   "spitze": enden[(z, zur_spitze)],
                   "gabel": grenze(enden[(z, -zur_spitze)], gabel)}
                  for z in range(len(start))]
        out.append({"gabel": gabel, "spitzen_unten": spitzen_unten, "zweige": zweige})
        i = j + 1
    return out


def _auf(zweige, ziel: int, spitzen_unten: bool):
    """Zweige zusammenlegen, bis es nur noch `ziel` viele sind.

    Die beiden Zeichnungen loesen nicht gleich fein auf. Die Pulpa des oberen
    Sechsers traegt im Template VIER Kanallaeufe - der mesiobukkale ist geteilt
    gezeichnet -, Dirk zeichnet drei. Ungleiche Zahlen liessen die Zuordnung auf
    die blosse Hoehe zurueckfallen, und dann kreuzten sich die Kanaele.

    Zusammengelegt wird von der MITTE her, wie in `laufmarken` von beiden Enden
    gepaart wird: die aeusseren Zweige sind eindeutig - die mesiale und die
    distale Wurzel sind in beiden Zeichnungen dieselben -, mehrdeutig ist nur,
    was dazwischen liegt. Nach dem naechstliegenden Spitzenpaar zu gehen war
    falsch und legte den linken mit dem mittleren Kanal zusammen; die Pulpa lief
    dann seitlich aus dem Zahn heraus.
    """
    z = list(zweige)
    while len(z) > ziel >= 1:
        mitte = (len(z) - 1) / 2.0
        i = min(range(len(z) - 1), key=lambda t: abs((t + 0.5) - mitte))
        a, b = z[i], z[i + 1]
        spur = {}
        for h in set(a["spur"]) | set(b["spur"]):
            la, lb = a["spur"].get(h), b["spur"].get(h)
            paare = [p for p in (la, lb) if p]
            spur[h] = (min(p[0] for p in paare), max(p[1] for p in paare))
        aussen, innen = (min, max) if spitzen_unten else (max, min)
        z[i:i + 2] = [{"spur": spur,
                       "spitze": aussen(a["spitze"], b["spitze"]),
                       "gabel": innen(a["gabel"], b["gabel"])}]
    return z


def _nach_lauf(gefunden):
    d = {}
    for z, lauf in gefunden.items():
        d.setdefault(lauf, []).append(z)
    return d


def laufmarken(P_alt, P_neu):
    """Marken aus den beiden Laufprofilen - ohne dass jemand sie ansteckt.

    Bisher kamen die Hoehenmarken nur aus der Zervikallinie und aus den von
    Hand gesetzten Ankern. Das reichte nicht: wo eine Zeile im Template drei
    Wurzeln schneidet und in der Zeichnung eine, faellt `paare_ueber_hoehe` auf
    die Gesamtbreite zurueck, und der Sprung zwischen zwei benachbarten Zeilen
    faltet das Feld. Am oberen Sechser betraf das 8 von 40 Zeilen, und man sieht
    es: die Wurzelspitzen verheddern sich und die Kauflaeche schiesst quer aus
    dem Zahn.

    Beide Profile werden von BEIDEN ENDEN her gepaart - Wurzelspitzen und
    Hoeckerkerbe sind eindeutig. Was in der Mitte uebrig bleibt, ist die
    Mehrdeutigkeit, und die ist immer dieselbe: das Template laesst beide
    Furkationen auf EINER Hoehe zusammenfallen (3 -> 1), Dirk zeichnet sie
    getrennt (3 -> 2, dann 2 -> 1). Der Ueberschuss wird zu einer Marke
    gemittelt, statt so zu tun als koenne ein Hoehenfeld zwei Hoehen aus einer
    machen.

    Damit sind die Furkationsanker fuer die Hoehe entbehrlich; die Zervikallinie
    kommt weiter aus Dirks gezeichneter SZG-Linie.
    """
    A, B = stufen_profil(P_alt), stufen_profil(P_neu)

    def lage(P, y):
        y0 = min(float(Q[:, 1].min()) for Q in _alle(P))
        y1 = max(float(Q[:, 1].max()) for Q in _alle(P))
        return (y - y0) / (y1 - y0)

    n = min(len(A), len(B))
    vorne = 0
    while vorne < n and A[vorne][1:] == B[vorne][1:]:
        vorne += 1
    hinten = 0
    while hinten < n - vorne and A[-1 - hinten][1:] == B[-1 - hinten][1:]:
        hinten += 1
    ma = [t[0] for t in A[:vorne]]
    mb = [t[0] for t in B[:vorne]]
    mitte_a = A[vorne:len(A) - hinten]
    mitte_b = B[vorne:len(B) - hinten]
    if mitte_a and mitte_b:
        ma.append(sum(t[0] for t in mitte_a) / len(mitte_a))
        mb.append(sum(t[0] for t in mitte_b) / len(mitte_b))
    ma += [t[0] for t in A[len(A) - hinten:]]
    mb += [t[0] for t in B[len(B) - hinten:]]

    # Zwei Marken, die auf sehr verschiedener relativer Hoehe sitzen, beschreiben
    # nicht dieselbe Struktur. Die Paarung laeuft ueber die Reihenfolge, und wo
    # die beiden Folgen baulich verschieden sind, ist die Reihenfolge kein
    # Argument. Ein Viertel der Zahnhoehe Unterschied ist reichlich - die
    # Furkation des Sechsers wandert um 0,16 und bleibt drin, die falsch
    # gepaarten Kerben des Einunddreissigers lagen 0,32 auseinander.
    paare = [(a, b) for a, b in zip(ma, mb)
             if abs(lage(P_alt, a) - lage(P_neu, b)) <= 0.25]
    return [a for a, _ in paare], [b for _, b in paare]


def mitteln(marken_alt, marken_neu, nah: float = 0.0):
    """Marken paarweise ordnen und je Hoehenebene zu EINER Marke mitteln.

    Zwei Fehler, die beide an 16 aufgefallen sind, werden hier abgefangen.

    Der erste war meiner: die beiden Listen wurden vorher UNABHAENGIG sortiert.
    Sie gehoeren aber paarweise zusammen. An 16 liegen die beiden Furkations-
    anker im Template auf 39,26 und 39,31, in Dirks Zeichnung auf 24,72 und
    30,19 - getrennt sortiert wurde daraus 39,26 -> 24,72 und 39,31 -> 30,19,
    also ein Intervall von 0,05 Einheiten auf eines von 5,47 gedehnt. Faktor
    110, und das Feld faltet sich.

    Der zweite ist eine Grenze des Verfahrens, keine Nachlaessigkeit. Die
    Zuordnung laeuft ueber die HOEHE, und eine Hoehe kann nur auf EINE Hoehe
    abgebildet werden. Am oberen Sechser fallen die mesiale und die distale
    Furkation im alten Template auf dieselbe Hoehe; Dirk hat sie 5,8 Einheiten
    auseinander gezeichnet. Kein Hoehenfeld kann die beiden trennen. Statt so
    zu tun als koennte es das, wird die Ebene gemittelt - dieselbe Entscheidung,
    die Dirk fuer die Zervikallinie getroffen hat: "Wir mitteln den
    geschwungenen Verlauf zu einer Linie. Das wird ein Odontogram und kein
    Anatomie-Lehrbuch."

    `nah` ist der Abstand, unter dem zwei alte Hoehen als eine Ebene gelten.
    Umkehrungen werden immer zusammengefasst, auch ueber `nah` hinaus - eine
    nicht monotone Marke ist keine Marke, sondern ein Widerspruch.
    """
    paare = sorted((float(a), float(b)) for a, b in zip(marken_alt or [], marken_neu or []))
    gruppen: list[list[list[float]]] = []
    for a, b in paare:
        if gruppen:
            ga, gb = gruppen[-1]
            wenn_nah = a - sum(ga) / len(ga) <= nah
            wenn_verkehrt = b <= sum(gb) / len(gb)
            if wenn_nah or wenn_verkehrt:
                ga.append(a); gb.append(b)
                continue
        gruppen.append([[a], [b]])
    return ([sum(ga) / len(ga) for ga, _ in gruppen],
            [sum(gb) / len(gb) for _, gb in gruppen])


def paare_ueber_hoehe(P_alt, P_neu, marken_alt=None, marken_neu=None,
                      stufen: int = 40, rand: float = 0.015):
    """Punktpaare nach HOEHE statt nach Bogenlaenge.

    `marken_*` sind Hoehen, die aufeinander abgebildet werden sollen - Apex,
    Zahnhals, Schneidekante, und bei mehrwurzeligen Zaehnen die Furkation.
    Dazwischen wird linear interpoliert, sodass die Zervix auf die Zervix
    trifft, auch wenn die beiden Zaehne ihre Laenge verschieden aufteilen.
    """
    A, B = _alle(P_alt), _alle(P_neu)
    ya0 = min(float(P[:, 1].min()) for P in A); ya1 = max(float(P[:, 1].max()) for P in A)
    yb0 = min(float(P[:, 1].min()) for P in B); yb1 = max(float(P[:, 1].max()) for P in B)
    ma, mb = mitteln(marken_alt, marken_neu, nah=0.03 * (ya1 - ya0))
    stuetz_a = [ya0] + ma + [ya1]
    stuetz_b = [yb0] + mb + [yb1]

    def hoehe(y):
        return float(np.interp(y, stuetz_a, stuetz_b))

    # Zeilen dicht an jede Marke legen. Gleichmaessig verteilt liegen sie 1,6
    # Einheiten auseinander, und eine Wurzelspitze ist kaum hoeher - die Kappe
    # bekam keine einzige Stuetzstelle und der Spline erfand sie. Genau dort
    # brach das Ergebnis: die Spitzen des oberen Sechsers verhedderten sich und
    # die Kauflaeche schnitt als Sehne quer durch. Eine Marke IST der Uebergang,
    # an dem eine Wurzel oder ein Hoecker anfaengt; eine Zeile knapp darunter
    # fasst die neu auftretende Kontur an ihrer schmalsten Stelle.
    saum = 0.004 * (ya1 - ya0)
    hoehen = [ya0 + f * (ya1 - ya0) for f in np.linspace(rand, 1.0 - rand, stufen)]
    for m in ma:
        hoehen += [m - saum, m + saum]

    # Zweigbaender: jede Wurzel bekommt ihre EIGENE Hoehenzuordnung, von ihrer
    # eigenen Spitze zur gemeinsamen Gabel. Sonst trifft die laengste Wurzel des
    # einen Zahns die laengste des anderen, und am oberen Sechser sind das
    # verschiedene Wurzeln - siehe baender().
    paarige = []
    for ba, bb in zip(baender(A), baender(B)):
        za, zb = ba["zweige"], bb["zweige"]
        ziel = min(len(za), len(zb))
        za, zb = _auf(za, ziel, ba["spitzen_unten"]), _auf(zb, ziel, bb["spitzen_unten"])
        if len(za) == len(zb):
            paarige.append(({**ba, "zweige": za}, {**bb, "zweige": zb}))

    def aus_spur(zweig, y):
        """Der Lauf des Zweiges auf Hoehe y - aus seiner eigenen Spur."""
        spur = zweig["spur"]
        lo, hi = min(zweig["spitze"], zweig["gabel"]), max(zweig["spitze"], zweig["gabel"])
        if not lo <= y <= hi:
            return None
        nah = min(spur, key=lambda h: abs(h - y))
        return spur[nah]

    qa, qb = [], []
    for ya in sorted(h for h in hoehen if ya0 < h < ya1):
        la = _laeufe(_kanten(A, ya))
        if not la:
            continue
        je_zweig = []
        for ba, bb in paarige:
            for za, zb in zip(ba["zweige"], bb["zweige"]):
                sa, ga = za["spitze"], za["gabel"]
                if abs(ga - sa) < 1e-6:
                    continue
                t = (ya - sa) / (ga - sa)
                if not 0.0 <= t <= 1.0:
                    continue
                sb, gb = zb["spitze"], zb["gabel"]
                yb_j = sb + t * (gb - sb)
                pa, pb = aus_spur(za, ya), aus_spur(zb, yb_j)
                if pa and pb:
                    je_zweig.append((pa, ya, pb, yb_j))
        if je_zweig:
            for (a0, a1), y_a, (b0, b1), y_b in je_zweig:
                qa.append((a0, y_a)); qb.append((b0, y_b))
                qa.append((a1, y_a)); qb.append((b1, y_b))
            continue

        yb = hoehe(ya)
        lb = _laeufe(_kanten(B, yb))
        if not lb:
            continue
        if len(la) != len(lb):
            # Zeile schneidet verschieden viele Wurzeln - auf die Gesamtbreite
            # zurueckfallen, statt Laeufe falsch zu paaren.
            la = [(la[0][0], la[-1][1])]
            lb = [(lb[0][0], lb[-1][1])]
        for (a0, a1), (b0, b1) in zip(la, lb):
            qa.append((a0, ya)); qb.append((b0, yb))
            qa.append((a1, ya)); qb.append((b1, yb))
            if a1 - a0 > 4.0:
                qa.append(((a0 + a1) / 2, ya)); qb.append(((b0 + b1) / 2, yb))
    return np.asarray(qa), np.asarray(qb)
