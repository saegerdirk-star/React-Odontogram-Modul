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

CORRESPONDENCE. Two contours, sampled by arc length from a common start, paired
in order. For a smooth front tooth that is enough - checked on 11, where the
correspondence lines run parallel and point 0 sits on the apex of both. For a
molar it is not: on 16 the lines cross the picture, because the root tips differ
in length and the notches in depth, so arc length distributes differently and
the pairing drifts from the first notch onward. There the split points come from
hand-set anchors (`<n>_anker_alt.svg` / `_neu.svg`), and arc length only has to
carry the stretch between two of them.

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
