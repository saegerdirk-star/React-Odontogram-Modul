# Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
# Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
# Dirk Saeger, Malte Sussdorff 2026

"""Pull one shipped template onto its redrawn outline.

Reuses build.rewrite_svg, so gradients, circles and rects are carried the same
way the generator already carries them. Two layers are held back and put in
again unchanged: `gum-base` and `bone-base` are drawn in final frame coordinates
by gum.py, a papilla is shared between two neighbours, and dragging them along
with a redrawn root would tear the gum line apart across the arch.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
import build           # noqa: E402
import gum             # noqa: E402
import redraw          # noqa: E402
import spec            # noqa: E402
import svgpath         # noqa: E402

ZEICHNUNGEN = Path.home() / "dev" / "Odontogram-Anatomie"
ASSETS = Path(__file__).resolve().parents[2] / "src" / "assets" / "teeth-svgs"


def _ebene(txt: str, label: str) -> str:
    m = re.search(r'<g[^>]*label="' + re.escape(label) + r'"[^>]*>(.*?)</g>', txt, re.S)
    if not m:
        raise ValueError(f"Ebene {label!r} fehlt")
    return m.group(1)


def _pfad(txt: str) -> str:
    return re.search(r'\sd="([^"]+)"', txt).group(1)


def anker(datei: Path):
    txt = datei.read_text()
    kopf = re.search(r'(<g[^>]*label="2 ANKER[^"]*"[^>]*>)(.*?)</g>', txt, re.S)
    tr = re.search(r'transform="translate\(([-\d.]+),?\s*([-\d.]+)?\)"', kopf.group(1))
    dx, dy = (float(tr.group(1)), float(tr.group(2) or 0)) if tr else (0.0, 0.0)
    out = {}
    for t in re.findall(r"<circle[^>]*?/?>", kopf.group(2)):
        i = re.search(r'\sid="([^"]+)"', t).group(1)
        ct = re.search(r'transform="translate\(([-\d.]+),?\s*([-\d.]+)?\)"', t)
        ex, ey = (float(ct.group(1)), float(ct.group(2) or 0)) if ct else (0.0, 0.0)
        out[i.split("-", 1)[1]] = (
            float(re.search(r'cx="([-\d.]+)"', t).group(1)) + dx + ex,
            float(re.search(r'cy="([-\d.]+)"', t).group(1)) + dy + ey,
        )
    return out


def _halte_zurueck(txt: str, ids):
    """Layer mit diesen ids gegen Platzhalter tauschen; gibt (text, mapping)."""
    gehalten = {}
    for k, ident in enumerate(ids):
        m = re.search(r'<g[^>]*\sid="' + re.escape(ident) + r'"', txt)
        if not m:
            continue
        i = m.start()
        tiefe, j = 0, i
        while True:
            mm = re.compile(r"<g\b|</g>").search(txt, j)
            if not mm:
                break
            tiefe += 1 if mm.group(0) == "<g" else -1
            j = mm.end()
            if tiefe == 0:
                break
        marke = f"<!--HALT{k}-->"
        gehalten[marke] = txt[i:j]
        txt = txt[:i] + marke + txt[j:]
    return txt, gehalten


def szg(zahn: str) -> float:
    """Die von Dirk gesetzte Zahnhalslinie, samt etwaiger Ebenen-Verschiebung.

    Inkscape legt eine Verschiebung gern als `transform` auf die EBENE statt in
    die Koordinate - bei 51 und 52 genau so passiert.
    """
    txt = (ZEICHNUNGEN / f"{zahn}_zeichnen.svg").read_text()
    m = re.search(r'(<g[^>]*label="[^"]*SZG[^"]*"[^>]*>)(.*?)</g>', txt, re.S)
    if m:
        tr = re.search(r'transform="translate\(([-\d.]+),?\s*([-\d.]+)?\)"', m.group(1))
        dy = float(tr.group(2) or 0) if tr else 0.0
        return float(re.search(r'y1="([-\d.]+)"', m.group(2)).group(1)) + dy
    return float(re.search(r'<line[^>]*y1="([-\d.]+)"', txt).group(1))


def umzeichnen(zahn: str, template: str, mit_ankern: bool) -> str:
    txt = (ASSETS / f"{template}.svg").read_text()
    alt = redraw.polygon(redraw.tooth_base_d(txt))

    zeich = (ZEICHNUNGEN / f"{zahn}_zeichnen.svg").read_text()
    neu = redraw.polygon(_pfad(_ebene(zeich, "3 HIER ZEICHNEN")))

    aa = an = None
    if mit_ankern:
        aa = anker(ZEICHNUNGEN / f"{zahn}_anker_alt.svg")
        an = anker(ZEICHNUNGEN / f"{zahn}_anker_neu.svg")

    A, B = redraw.paare(alt, neu, aa, an)
    spline = redraw.Spline(A, B, glaettung=0.0)

    mitte = float(np.mean(alt[:, 0]))

    def ymap(y: float) -> float:
        return spline(mitte, y)[1]

    vb = re.search(r'viewBox="([^"]*)"', txt).group(1)
    vb_neu = tuple(float(v) for v in vb.split())

    gehalten_txt, gehalten = _halte_zurueck(txt, redraw.NICHT_VERFORMEN)
    out = build.rewrite_svg(gehalten_txt, lambda x, y: spline(x, y), ymap, vb_neu)
    for marke, block in gehalten.items():
        out = out.replace(marke, block)

    # Zahnfleisch und Knochen NEU zeichnen statt mitziehen. Sie gehoeren der
    # Spalte, nicht dem Zahn - die Papille ist zwischen zwei Nachbarn EINE
    # Struktur auf EINER Hoehe, und ein mitgezogener Rand kann sich mit dem
    # Nachbarn nicht darauf einigen. gum.py zeichnet sie in Endkoordinaten.
    s_spec = spec.SPEC_BY_KEY[template]
    hoehe = vb_neu[3]
    occl = hoehe - build.OCCL_MARGIN
    cej = szg(zahn)
    cx = float(np.mean([neu[:, 0].min(), neu[:, 0].max()]))
    band = neu[np.abs(neu[:, 1] - cej) < 1.5]
    if len(band) < 2:
        band = neu
    neck_half = float(band[:, 0].max() - band[:, 0].min()) / 2.0
    out = build.replace_gum(out, occl, cej, cx, neck_half, float(s_spec.col_px))
    return out
