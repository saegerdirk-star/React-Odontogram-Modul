# Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
# Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
# Dirk Saeger, Malte Sussdorff 2026

"""Halskaries und Karies unter der Krone - als Band am Zahnhals abgeleitet.

Dirk, 18.08.2026: "Zahnhalskaries muessen wir uns anschauen. Ich glaube das ist
auch gewarpt." Gemessen war es das, und deutlicher als bei den Fuellungen:

    caries-root       Versatz zur SZG  Median 5,1  maximal 19,5 (14er)
                      Breite/Halsbreite 0,90..1,57   Hoehe 3,0..32,4
    caries-subcrown   Versatz zur SZG  Median 5,7  maximal 11,1 (42er)
                      Breite/Halsbreite 0,66..1,02   Hoehe 3,1..24,2

Am 14er sass die "Halskaries" in der Furkation, am 16er war sie ein diagonaler
Schmier quer ueber die Schmelz-Zement-Grenze und dabei ZERRISSEN - ein grosses
Stueck mesial, ein abgetrenntes Splitterchen distal. Und eine Laesionshoehe, die
zwischen 3 und 32 Einheiten schwankt, ist kein Befund, sondern das
Verschiebungsfeld.

DIESE ABLEITUNG BRAUCHT NICHTS GEZEICHNETES. Umriss und Dirks SZG-Linie
genuegen: das Band ist die Scheibe des Zahns zwischen zwei Hoehen, seitlich vom
Umriss begrenzt. Es folgt dem Hals damit von selbst, ohne Versatzrechnung. Und
es gibt hier keine Grenzentscheidung wie bei den Approximalflaechen - das Band
schliesst an nichts an.

Analytisch und nicht gerastert: eine waagrechte Scheibe hat je Hoehe genau einen
linken und einen rechten Rand, den kann man ablesen. Der Umweg ueber das Raster
lohnt nur dort, wo sich Zuege kreuzen.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fuellflaechen as ff              # noqa: E402
import fuellflaechen_einsetzen as fe    # noqa: E402
import redraw                           # noqa: E402

# Hoehe der Baender, Anteil der Kronenhoehe.
HOEHE = 0.10

# Wo die Baender bezogen auf die SZG liegen, in Vielfachen ihrer eigenen Hoehe.
# Positiv ist koronal.
#
# Die Halskaries beginnt am Schmelz-Zement-Uebergang und frisst nach zervikal,
# also sitzt sie ueberwiegend unterhalb der Linie. Die Karies unter der Krone
# sitzt am Kronenrand, also darueber. Beide stossen an der SZG aneinander -
# was richtig ist, denn dort geht das eine ins andere ueber.
BAENDER = {
    "caries-root":     (+0.3, -0.7),
    "caries-subcrown": (+1.3, +0.3),
}


def band(zahn: str, oben: float, unten: float) -> np.ndarray:
    """Die Scheibe des Zahns zwischen zwei Hoehen, als geschlossenes Polygon."""
    um, szg, occl, d, _kr = ff.masse(zahn)
    ch = abs(occl - szg)
    h = HOEHE * ch
    y_a = szg + d * oben * h          # koronale Kante
    y_b = szg + d * unten * h         # zervikale Kante
    lo, hi = min(y_a, y_b), max(y_a, y_b)
    schritt = max(0.15, h / 12.0)
    ys = np.arange(lo, hi + schritt * 0.5, schritt)
    band_breite = max(0.35, ch / 70.0)
    links, rechts = [], []
    for y in ys:
        nah = um[np.abs(um[:, 1] - y) < band_breite]
        if len(nah) == 0:
            continue
        links.append((float(nah[:, 0].min()), float(y)))
        rechts.append((float(nah[:, 0].max()), float(y)))
    if len(links) < 2:
        raise ValueError(f"{zahn}: kein Hals zwischen {lo:.2f} und {hi:.2f}")
    return np.array(rechts + links[::-1], dtype=float)


def einsetzen(zahn: str) -> dict[str, float]:
    datei = fe.TEMPLATES / f"{zahn}.svg"
    txt = datei.read_text()
    bericht: dict[str, float] = {}
    for ident, (oben, unten) in BAENDER.items():
        P = fe.nach_template(zahn, band(zahn, oben, unten))
        m = re.search(r'<(?:path|polygon)\b(?:(?!/>).)*?id="' + ident + r'"(?:(?!/>).)*?/>',
                      txt, re.S)
        if not m:
            raise ValueError(f"{zahn}: {ident} nicht gefunden")
        alt = m.group(0)
        txt = txt.replace(alt, re.sub(r'\sd="[^"]*"', ' d="' + fe._d(P) + '"', alt, count=1), 1)
        bericht[ident] = float(np.ptp(P[:, 1]))
    datei.write_text(txt)
    return bericht


if __name__ == "__main__":
    ziele = sys.argv[1:] or (ff.SEITENZAEHNE + ff.FRONTZAEHNE)
    for z in ziele:
        b = einsetzen(z)
        print(f"{z}: " + "  ".join(f"{k.split('-')[1]} Hoehe {v:.2f}" for k, v in b.items()))
