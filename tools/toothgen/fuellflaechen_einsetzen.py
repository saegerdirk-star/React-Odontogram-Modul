# Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
# Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
# Dirk Saeger, Malte Sussdorff 2026

"""Die abgeleiteten Fuellflaechen in die ausgelieferten Templates einsetzen.

Zweite Stufe zu `fuellflaechen.py`: dort entstehen die Grenzzuege in Dirks
Zeichnung, hier werden daraus Flaechen und in die Templates geschrieben.

WAS ERSETZT WIRD, je Flaeche (mesial, distal, okklusal/inzisal):

    filling-amalgam-*    filling-composite-*    filling-gic-*
    filling-temporary-*  subcaries-*            defect-*      -> neues `d`
    caries-*                                                  -> AFFIN gezogen

Die Kariesebene ist eine GRUPPE aus drei Pfaden - die Zeichnung der Laesion,
nicht ihr Umriss. Ihre Elemente werden in das neue Gebiet gezogen statt ersetzt:
erstens bliebe der Ebenenbestand sonst nicht gleich (`verify_redraw.py` prueft
das), zweitens ist die Textur nichts, was jemand zeichnet - und was niemand
zeichnet, wird gewarpt. Dieselbe Regel wie ueberall in diesem Werkzeug.

BUKKAL BLEIBT UNANGETASTET. Es gibt dafuer keinen gezeichneten Zug, und die
Seitenansicht hat ohnehin kein `lingual` - siehe die offene Frage im Bead.

DIE ABBILDUNG ZEICHNUNG -> TEMPLATE IST GEMESSEN, nicht angenommen: fuer jeden
der 26 wurde der gezeichnete Umriss gegen `tooth-base` des Templates gehalten,
einmal unveraendert und einmal an der eigenen Mitte y-gespiegelt. Oberkiefer und
Milchoberkiefer passen unveraendert (Abstand 0,000), Unterkiefer gespiegelt
(0,007 bis 0,030). Das ist dieselbe Spiegelung, die `redraw_apply.rahmen_dreher`
auf den Umriss legt.

UEBERLAPPUNG: jedes Gebiet wird um `UEBERLAPP` geweitet, bevor es zum Pfad wird.
Zwei Flaechen, die sich nur eine Kante teilen, lassen im Rendern eine Haarlinie
stehen; mo, od und mod muessen aber als EINE Restauration lesen.
"""
from __future__ import annotations

import re
import sys
from collections import deque
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fuellflaechen as ff   # noqa: E402
import hoecker              # noqa: E402
import redraw               # noqa: E402

TEMPLATES = Path(__file__).resolve().parents[2] / "src" / "assets" / "teeth-svgs"

# Zellen, um die ein Gebiet geweitet wird (bei 40 Zellen je Einheit = 0,1).
UEBERLAPP = 4
# Toleranz beim Vereinfachen des getrasterten Randes, in Zeicheneinheiten.
GLAETTE = 0.12

MATERIALIEN = ("amalgam", "composite", "gic", "temporary")
EINZELN = tuple(f"filling-{m}-" for m in MATERIALIEN) + ("subcaries-", "defect-")
GRUPPEN = ("caries-",)


def linien(zahn: str) -> list[np.ndarray]:
    """Die drei Grenzzuege - von Hand, wo vorhanden, sonst abgeleitet."""
    hand = ff.gezeichnet(zahn)
    abgeleitet = ff.pfade(zahn, ff.EBENE_ABGELEITET)
    aus = []
    for k in ("Füllung mesial", "Füllung distal", "Füllung okklusal"):
        d = hand.get(k) or abgeleitet.get(k)
        if d is None:
            raise ValueError(f"{zahn}: {k} fehlt")
        aus.append(redraw.polygon(d))
    return aus


def gebiete(zahn: str) -> tuple[dict[str, np.ndarray], tuple[float, float]]:
    """Die drei Flaechen als Rastermasken, benannt."""
    um, szg, occl, d, _kr = ff.masse(zahn)
    lin = linien(zahn)
    marke, gross, _fges, _zelle, (x0, y0) = hoecker.gebiete(
        um, lin, hoecker.verlaengere(lin, um))
    if len(gross) != 4:
        raise ValueError(f"{zahn}: {len(gross)} Gebiete statt vier")
    klein = sorted(gross, key=lambda g: -g[1])[1:]
    cy = {nr: np.nonzero(marke == nr)[0].mean() for nr, _ in klein}
    cx = {nr: np.nonzero(marke == nr)[1].mean() for nr, _ in klein}
    dritte = min(cy, key=cy.get) if d < 0 else max(cy, key=cy.get)
    rest = [k for k in cx if k != dritte]
    mesial = max(rest, key=lambda k: cx[k])
    distal = min(rest, key=lambda k: cx[k])
    if (cx[mesial] > cx[distal]) != ff.mesial_rechts(zahn):
        raise ValueError(f"{zahn}: mesial auf der falschen Seite")
    return ({"mesial": marke == mesial,
             "distal": marke == distal,
             "occlusal": marke == dritte}, (x0, y0))


def _weite(maske: np.ndarray, n: int) -> np.ndarray:
    """Die Maske um `n` Zellen weiten - vier Nachbarn je Durchgang."""
    m = maske.copy()
    for _ in range(n):
        w = m.copy()
        w[1:, :] |= m[:-1, :]
        w[:-1, :] |= m[1:, :]
        w[:, 1:] |= m[:, :-1]
        w[:, :-1] |= m[:, 1:]
        m = w
    return m


# Nachbarn im Uhrzeigersinn, beginnend LINKS - die Reihenfolge ist Teil des
# Verfahrens und nicht Geschmack: die Moore-Verfolgung sucht ab dem Nachbarn,
# aus dem sie gekommen ist, im Uhrzeigersinn weiter.
NACHBARN = [(0, -1), (-1, -1), (-1, 0), (-1, 1),
            (0, 1), (1, 1), (1, 0), (1, -1)]


def _rand(maske: np.ndarray) -> np.ndarray:
    """Den Rand einer Maske ablaufen - Moore-Nachbarschaft.

    Der Ruecksprungindex ist die Stelle, an der der erste Versuch scheiterte:
    nach einem Schritt in Richtung `i` liegt der Vorgaenger in Richtung
    `(i + 4) % 8`, und ab DORT wird weitergesucht. Mit einem um eins
    verschobenen Index laeuft die Verfolgung zwischen zwei Zellen hin und her
    und liefert vier Punkte statt eines Randes.
    """
    h, b = maske.shape
    ys, xs = np.nonzero(maske)
    y0 = int(ys.min())
    start = (y0, int(xs[ys == y0].min()))

    def gesetzt(p):
        return 0 <= p[0] < h and 0 <= p[1] < b and maske[p]

    zug = [start]
    hier = start
    rueck = 0                       # links vom Start ist Hintergrund
    for _ in range(8 * int(maske.sum()) + 16):
        for k in range(1, 9):
            i = (rueck + k) % 8
            dy, dx = NACHBARN[i]
            kand = (hier[0] + dy, hier[1] + dx)
            if gesetzt(kand):
                rueck = (i + 4) % 8
                hier = kand
                break
        else:
            break
        zug.append(hier)
        if hier == start:
            break
    return np.array(zug, dtype=float)


def _vereinfache(P: np.ndarray, tol: float) -> np.ndarray:
    """Douglas-Peucker, iterativ, damit lange Raender die Rekursion nicht sprengen."""
    behalten = np.zeros(len(P), dtype=bool)
    behalten[0] = behalten[-1] = True
    stapel = [(0, len(P) - 1)]
    while stapel:
        a, b = stapel.pop()
        if b <= a + 1:
            continue
        A, B = P[a], P[b]
        r = B - A
        n = float(np.hypot(*r))
        seg = P[a + 1:b]
        if n < 1e-12:
            abst = np.hypot(seg[:, 0] - A[0], seg[:, 1] - A[1])
        else:
            abst = np.abs(r[0] * (A[1] - seg[:, 1]) - (A[0] - seg[:, 0]) * r[1]) / n
        i = int(np.argmax(abst))
        if abst[i] > tol:
            k = a + 1 + i
            behalten[k] = True
            stapel += [(a, k), (k, b)]
    return P[behalten]


def polygon(zahn: str, maske: np.ndarray, ursprung: tuple[float, float]) -> np.ndarray:
    """Eine Rastermaske als Polygon in ZEICHENkoordinaten."""
    x0, y0 = ursprung
    rand = _rand(_weite(maske, UEBERLAPP))
    P = np.column_stack([x0 + rand[:, 1] / hoecker.AUFLOESUNG,
                         y0 + rand[:, 0] / hoecker.AUFLOESUNG])
    return _vereinfache(P, GLAETTE)


def nach_template(zahn: str, P: np.ndarray) -> np.ndarray:
    """Zeichen- in Templatekoordinaten - Unterkiefer an der eigenen Mitte gespiegelt."""
    um = redraw.polygon(ff.pfade(zahn)["Umriss"])
    if not _gespiegelt(zahn, um):
        return P
    cy = float(um[:, 1].min() + um[:, 1].max()) / 2.0
    return np.column_stack([P[:, 0], 2.0 * cy - P[:, 1]])


def _gespiegelt(zahn: str, um: np.ndarray) -> bool:
    txt = (TEMPLATES / f"{zahn}.svg").read_text()
    tpl = redraw.polygon(redraw.tooth_base_d(txt))

    def abstand(A):
        return float(np.mean([np.hypot(tpl[:, 0] - p[0], tpl[:, 1] - p[1]).min()
                              for p in A[::9]]))
    cy = float(um[:, 1].min() + um[:, 1].max()) / 2.0
    gesp = np.column_stack([um[:, 0], 2.0 * cy - um[:, 1]])
    return abstand(gesp) < abstand(um)


def _entdoppeln(P: np.ndarray) -> np.ndarray:
    """Aufeinanderfolgende gleiche Punkte werfen - Reste der Randverfolgung."""
    behalten = [0]
    for i in range(1, len(P)):
        if abs(P[i, 0] - P[behalten[-1], 0]) > 5e-3 or abs(P[i, 1] - P[behalten[-1], 1]) > 5e-3:
            behalten.append(i)
    return P[behalten]


def _d(P: np.ndarray) -> str:
    """Zwei Nachkommastellen, weil die Kette mit `prec=2` serialisiert.

    Mit drei Stellen geschrieben, meldete `check_roundtrip.py` an 54_occl eine
    Abweichung von 0,106 gegen eine Schranke von 0,10 - die Datei wurde beim
    Nachserialisieren auf zwei Stellen gerundet und wich damit von sich selbst
    ab. Mit zwei Stellen ist der Umlauf exakt (0,0000 gemessen). Dazu fielen
    doppelte Punkte auf, die die Randverfolgung stehen laesst; eine Strecke der
    Laenge null hilft niemandem.
    """
    Q = _entdoppeln(P)
    return "M" + " ".join(f"{x:.2f},{y:.2f}" for x, y in Q) + "Z"


def _points(P: np.ndarray) -> str:
    return " ".join(f"{x:.2f},{y:.2f}" for x, y in _entdoppeln(P))


def _affin(d: str, alt: np.ndarray, neu: np.ndarray) -> str:
    """Einen Pfad aus dem alten in das neue Gebiet ziehen - Rechteck auf Rechteck."""
    import svgpath
    ax0, ax1 = alt[:, 0].min(), alt[:, 0].max()
    ay0, ay1 = alt[:, 1].min(), alt[:, 1].max()
    nx0, nx1 = neu[:, 0].min(), neu[:, 0].max()
    ny0, ny1 = neu[:, 1].min(), neu[:, 1].max()
    sx = (nx1 - nx0) / max(ax1 - ax0, 1e-9)
    sy = (ny1 - ny0) / max(ay1 - ay0, 1e-9)
    return svgpath.warp_path_d(d, lambda x, y: (nx0 + (x - ax0) * sx,
                                                ny0 + (y - ay0) * sy))


def einsetzen(zahn: str) -> dict[str, int]:
    masken, ursprung = gebiete(zahn)
    datei = TEMPLATES / f"{zahn}.svg"
    txt = datei.read_text()
    gezaehlt: dict[str, int] = {}
    for flaeche, maske in masken.items():
        P = nach_template(zahn, polygon(zahn, maske, ursprung))
        neu_d = _d(P)
        n = 0
        for vorsatz in EINZELN:
            ident = vorsatz + flaeche
            m = (re.search(r'<(?:path|polygon)\b(?:(?!/>).)*?id="' + ident + r'"(?:(?!/>).)*?/>',
                           txt, re.S))
            if not m:
                continue
            alt = m.group(0)
            # Die Defektebenen sind `<polygon points=...>` und keine Pfade - in
            # ALLEN 26 Templates, gezaehlt. Wer nur `d` ersetzt, laesst sie
            # stumm stehen und merkt es nicht, weil der Zaehler trotzdem stimmt.
            if ' d="' in alt:
                ersetzt = re.sub(r'\sd="[^"]*"', ' d="' + neu_d + '"', alt, count=1)
            elif ' points="' in alt:
                ersetzt = re.sub(r'\spoints="[^"]*"',
                                 ' points="' + _points(P) + '"', alt, count=1)
            else:
                continue
            txt = txt.replace(alt, ersetzt, 1)
            n += 1
        for vorsatz in GRUPPEN:
            ident = vorsatz + flaeche
            g = re.search(r'(<g[^>]*id="' + ident + r'"[^>]*>)(.*?)(</g>)', txt, re.S)
            if not g:
                continue
            innen = g.group(2)
            ds = re.findall(r'\sd="([^"]+)"', innen)
            if not ds:
                continue
            alle = np.vstack([redraw.polygon(x) for x in ds])
            neu_innen = innen
            for x in ds:
                neu_innen = neu_innen.replace(f'd="{x}"', f'd="{_affin(x, alle, P)}"', 1)
            txt = txt.replace(g.group(0), g.group(1) + neu_innen + g.group(3), 1)
            n += 1
        gezaehlt[flaeche] = n
    datei.write_text(txt)
    return gezaehlt


if __name__ == "__main__":
    ziele = sys.argv[1:] or (ff.SEITENZAEHNE + ff.FRONTZAEHNE)
    for z in ziele:
        n = einsetzen(z)
        print(f"{z}: " + "  ".join(f"{k} {v} Ebenen" for k, v in n.items()))
