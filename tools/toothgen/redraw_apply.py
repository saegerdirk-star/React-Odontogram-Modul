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


PULPA_MUSTER = re.compile(r"(pulp|endo|parapulpal)", re.I)
MILCH_MUSTER = re.compile(r"milktooth", re.I)


def pulpa_ebenen(txt: str):
    """Ebenen, die der Pulpa folgen - Pulpitis, Wurzelfuellung, Stifte.

    Die milktooth-Ebenen bleiben aussen vor: sie sind der alte Behelf, mit dem
    ein Milchzahn im Template seines Nachfolgers gezeichnet wurde, und gehoeren
    nicht zu dieser Pulpa.
    """
    out = []
    for m in re.finditer(r'\sid="([^"]+)"', txt):
        i = m.group(1)
        if i.startswith("toothgen-"):
            continue
        if PULPA_MUSTER.search(i) and not MILCH_MUSTER.search(i):
            out.append(i)
    return out


def verforme_je_element(txt: str, feld_fuer):
    """Jedes d-Attribut mit dem Feld verformen, das fuer sein Element gilt.

    `feld_fuer(ids)` bekommt die id des Elements und die seiner umgebenden
    Gruppen und gibt eine Warp-Funktion zurueck - oder None, dann bleibt das
    Element unveraendert. So koennen Zahn, Pulpa und Zahnfleisch in EINEM
    Durchgang verschieden behandelt werden, ohne Bloecke herauszuschneiden.
    """
    out = []
    stapel = []
    pos = 0
    for m in re.finditer(r"<(/?)(\w+)([^>]*?)(/?)>", txt):
        out.append(txt[pos:m.start()])
        pos = m.end()
        schliessend, tag, attrs, selbst = m.groups()
        if schliessend:
            if tag == "g" and stapel:
                stapel.pop()
            out.append(m.group(0))
            continue
        ident = re.search(r'\sid="([^"]+)"', attrs)
        eigen = ident.group(1) if ident else None
        kette = [x for x in stapel + [eigen] if x]
        d = re.search(r'\sd="([^"]+)"', attrs)
        if d:
            fn = feld_fuer(kette)
            if fn is not None:
                ersetzt = svgpath.warp_path_d(d.group(1), fn)
                # d sucht INNERHALB von attrs - die Indizes sind schon relativ.
                attrs = attrs[:d.start(1)] + ersetzt + attrs[d.end(1):]
        out.append(f"<{tag}{attrs}{selbst}>")
        if tag == "g" and not selbst:
            stapel.append(eigen)
    out.append(txt[pos:])
    return "".join(out)


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

    # Zuordnung ueber die HOEHE, nicht ueber die Bogenlaenge. Der erste Versuch
    # lief ueber den Umfang und scherte das Innere: die Pulpa kam 35 Prozent
    # kuerzer heraus und endete auf halber Wurzel. Siehe redraw.py.
    s_spec = spec.SPEC_BY_KEY[template]
    ya0, ya1 = float(alt[:, 1].min()), float(alt[:, 1].max())
    oben = zahn[0] in "12"
    cej_alt = ya0 + s_spec.root_frac * (ya1 - ya0) if oben \
        else ya1 - s_spec.root_frac * (ya1 - ya0)
    cej_neu = szg(zahn)

    marken_alt, marken_neu = [cej_alt], [cej_neu]
    if mit_ankern:
        aa = anker(ZEICHNUNGEN / f"{zahn}_anker_alt.svg")
        an = anker(ZEICHNUNGEN / f"{zahn}_anker_neu.svg")
        for k in sorted(aa):
            if k.startswith("K") and k in an:
                marken_alt.append(aa[k][1])
                marken_neu.append(an[k][1])

    A, B = redraw.paare_ueber_hoehe(alt, neu, marken_alt, marken_neu)
    zahn_feld = redraw.Spline(A, B, glaettung=1e-3)

    # Zweites Feld fuer die Pulpa: die pulpanahen Ebenen folgen Dirks
    # gezeichneter Kammer, nicht dem Aussenumriss. Ohne das traegt der Zahn
    # weiterhin die alte Pulpa, nur mitgezogen.
    pulpa_feld = None
    pz = ZEICHNUNGEN / f"{zahn}_pulpa_zeichnen.svg"
    if pz.exists():
        gez = re.findall(r'<path[^>]*\sd="([^"]+)"',
                         _ebene(pz.read_text(), "3 PULPA HIER ZEICHNEN"))
        m = (re.search(r'<path[^>]*\sid="tooth-healthy-pulp"[^>]*\sd="([^"]+)"', txt)
             or re.search(r'<path[^>]*\sd="([^"]+)"[^>]*\sid="tooth-healthy-pulp"', txt))
        if gez and m:
            alt_p = redraw.polygon(m.group(1))
            neu_p = redraw.polygon(gez[0]) if len(gez) == 1 else np.vstack(
                [redraw.polygon(g) for g in gez])
            PA, PB = redraw.paare_ueber_hoehe(alt_p, neu_p, stufen=30)
            pulpa_feld = redraw.Spline(PA, PB, glaettung=1e-3)

    p_ids = set(pulpa_ebenen(txt)) if pulpa_feld else set()

    def feld_fuer(kette):
        if any(k in redraw.NICHT_VERFORMEN for k in kette):
            return None                      # Zahnfleisch, Knochen: neu gezeichnet
        if p_ids and any(k in p_ids for k in kette):
            return lambda x, y: pulpa_feld(x, y)
        return lambda x, y: zahn_feld(x, y)

    out = verforme_je_element(txt, feld_fuer)

    # Zahnfleisch und Knochen NEU zeichnen statt mitziehen. Sie gehoeren der
    # Spalte, nicht dem Zahn - die Papille ist zwischen zwei Nachbarn EINE
    # Struktur auf EINER Hoehe. gum.py zeichnet sie in Endkoordinaten.
    vb = re.search(r'viewBox="([^"]*)"', txt).group(1)
    hoehe = float(vb.split()[3])
    occl = hoehe - build.OCCL_MARGIN
    cx = float(np.mean([neu[:, 0].min(), neu[:, 0].max()]))
    band = neu[np.abs(neu[:, 1] - cej_neu) < 1.5]
    if len(band) < 2:
        band = neu
    neck_half = float(band[:, 0].max() - band[:, 0].min()) / 2.0
    return build.replace_gum(out, occl, cej_neu, cx, neck_half, float(s_spec.col_px))
