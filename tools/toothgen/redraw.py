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
    """Thin-Plate-Spline ueber Punktpaare. Interpoliert die Stuetzstellen exakt."""

    def __init__(self, quelle: np.ndarray, ziel: np.ndarray, glaettung: float = 0.0):
        self.Q = np.asarray(quelle, float)
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
        U = np.where(d2 > 0, d2 * np.log(np.maximum(d2, 1e-12)) * 0.5, 0.0)
        v = U @ self.W[:len(self.Q)] + self.W[-3] + self.W[-2] * x + self.W[-1] * y
        return float(v[0]), float(v[1])


def tooth_base_d(txt: str) -> str:
    m = (re.search(r'<path[^>]*\sid="tooth-base"[^>]*\sd="([^"]+)"', txt)
         or re.search(r'<path[^>]*\sd="([^"]+)"[^>]*\sid="tooth-base"', txt))
    if not m:
        raise ValueError("kein tooth-base im Template")
    return m.group(1)


def _kanten(P: np.ndarray, y: float):
    """Schnittpunkte der Kontur mit der Waagerechten y, von links nach rechts."""
    xs = []
    n = len(P)
    for i in range(n):
        x1, y1 = P[i]
        x2, y2 = P[(i + 1) % n]
        if (y1 - y) * (y2 - y) < 0:
            t = (y - y1) / (y2 - y1)
            xs.append(x1 + (x2 - x1) * t)
    return sorted(xs)


def _laeufe(xs):
    """Kanten paarweise zu Abschnitten - eine gefuellte Zeile hat gerade viele."""
    return [(xs[i], xs[i + 1]) for i in range(0, len(xs) - 1, 2)]


def paare_ueber_hoehe(P_alt, P_neu, marken_alt=None, marken_neu=None,
                      stufen: int = 40, rand: float = 0.015):
    """Punktpaare nach HOEHE statt nach Bogenlaenge.

    `marken_*` sind Hoehen, die aufeinander abgebildet werden sollen - Apex,
    Zahnhals, Schneidekante, und bei mehrwurzeligen Zaehnen die Furkation.
    Dazwischen wird linear interpoliert, sodass die Zervix auf die Zervix
    trifft, auch wenn die beiden Zaehne ihre Laenge verschieden aufteilen.
    """
    A, B = np.asarray(P_alt, float), np.asarray(P_neu, float)
    ya0, ya1 = A[:, 1].min(), A[:, 1].max()
    yb0, yb1 = B[:, 1].min(), B[:, 1].max()
    ma = list(marken_alt) if marken_alt else []
    mb = list(marken_neu) if marken_neu else []
    stuetz_a = [ya0] + sorted(ma) + [ya1]
    stuetz_b = [yb0] + sorted(mb) + [yb1]

    def hoehe(y):
        return float(np.interp(y, stuetz_a, stuetz_b))

    qa, qb = [], []
    for f in np.linspace(rand, 1.0 - rand, stufen):
        ya = ya0 + f * (ya1 - ya0)
        yb = hoehe(ya)
        la, lb = _laeufe(_kanten(A, ya)), _laeufe(_kanten(B, yb))
        if not la or not lb:
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
