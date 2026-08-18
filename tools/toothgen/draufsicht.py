# Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
# Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
# Dirk Saeger, Malte Sussdorff 2026

"""Frontzahn-Draufsichten einlesen und auf Mass ziehen.

Dirk zeichnet, wie es ihm passt - auf dem Seitenscan in Scanaufloesung, in
einer Ebene, die "1" heisst, mit dem Label `Incisalkante`. Der Leser hat sich
danach zu richten und nicht umgekehrt. Erkannt wird deshalb ueber INHALT statt
ueber Namen:

    Umriss   = der laengste GESCHLOSSENE Pfad
    Linien   = alle OFFENEN Pfade
    Marken   = Textmarken `v`/`vestibulaer` und `m`/`mesial`, gross oder klein

DIE NORMALISIERUNG ist der eigentliche Zweck. Eine Draufsicht und die
Seitenansicht desselben Zahns muessen mesiodistal GLEICH breit sein, sonst
stimmt die Breitenprojektion nicht, mit der die bukkale Flaeche der
Seitenansicht aus der Kauflaeche kommt. Beim Zuschneiden der Vorlage laesst
sich das nicht treffen - an der 11 kamen 19,35 statt 21,0 Einheiten heraus, an
der 41 sind es 261 statt 15,24, weil Dirk auf dem Scan gezeichnet hat. Also
wird HINTERHER gezogen: der Umriss auf die Kronenbreite der Seitenansicht
skaliert und mittig in einen Rahmen gesetzt. Damit ist der Ausschnitt beim
Zeichnen gleichgueltig.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fuellflaechen as ff   # noqa: E402
import redraw                # noqa: E402
import svgpath               # noqa: E402

ZEICHNUNGEN = ff.ZEICHNUNGEN
RAND = 3.0          # Luft um den Zahn im normierten Rahmen, in Einheiten


def quelle(zahn: str) -> Path:
    """Die Handzeichnung - eigene Datei geht vor, sonst die Vorlage."""
    for name in (f"{zahn}_occl.svg", f"{zahn}_occl_zeichnen.svg"):
        p = ZEICHNUNGEN / name
        if p.exists():
            txt = p.read_text()
            if re.search(r'<path[^>]*\sd="[^"]*[Zz]"', txt):
                return p
    raise FileNotFoundError(f"{zahn}: keine gezeichnete Draufsicht")


def lies(zahn: str):
    """Umriss, Linien und Marken - ueber den Inhalt, nicht ueber Ebenennamen."""
    txt = quelle(zahn).read_text()
    ds = re.findall(r'<path\b[^>]*?\sd="([^"]+)"', txt)
    geschlossen = [d for d in ds if d.rstrip().lower().endswith("z")]
    if not geschlossen:
        raise ValueError(f"{zahn}: kein geschlossener Pfad, also kein Umriss")
    umriss = max(geschlossen, key=lambda d: len(redraw.polygon(d)))
    linien = [d for d in ds if not d.rstrip().lower().endswith("z")]
    marken: dict[str, tuple[float, float]] = {}
    for m in re.finditer(r'<text\b[^>]*?\sx="([-\d.]+)"[^>]*?\sy="([-\d.]+)"[^>]*>(.*?)</text>',
                         txt, re.S):
        wort = re.sub(r"<[^>]+>", "", m.group(3)).strip().lower()
        if wort.startswith("v"):
            marken["v"] = (float(m.group(1)), float(m.group(2)))
        elif wort.startswith("m"):
            marken["m"] = (float(m.group(1)), float(m.group(2)))
    return umriss, linien, marken


def pruefe_marken(zahn: str, umriss: str, marken: dict) -> list[str]:
    """Sagt die Zeichnung dasselbe wie die Konvention? Gibt Abweichungen zurueck.

    Gelesen statt geschlossen - genau die Probe, die der 36 gefehlt hat.
    Oberkiefer vestibulaer oben, Unterkiefer unten, mesial bei beiden rechts.
    """
    P = redraw.polygon(umriss)
    cx = float(P[:, 0].min() + P[:, 0].max()) / 2.0
    cy = float(P[:, 1].min() + P[:, 1].max()) / 2.0
    oben_erwartet = zahn[0] in "125"
    klagen = []
    if "v" in marken:
        if (marken["v"][1] < cy) != oben_erwartet:
            klagen.append(f"{zahn}: `v` steht {'unten' if marken['v'][1] > cy else 'oben'}, "
                          f"erwartet {'oben' if oben_erwartet else 'unten'}")
    else:
        klagen.append(f"{zahn}: keine `v`-Marke - Seite wird angenommen")
    if "m" in marken:
        if marken["m"][0] < cx:
            klagen.append(f"{zahn}: `m` steht links, erwartet rechts")
    else:
        klagen.append(f"{zahn}: keine `m`-Marke - Seite wird angenommen")
    return klagen


def normiere(zahn: str, breite: float | None = None) -> Path:
    """Die Zeichnung auf die Kronenbreite der Seitenansicht ziehen und ablegen.

    Schreibt `<zahn>_occl_norm.svg` - eine eigene Datei, damit weder Dirks
    Zeichnung noch die Vorlage ueberschrieben wird. `redraw_occl` liest sie
    vorrangig.
    """
    umriss, linien, marken = lies(zahn)
    if breite is None:
        _um, _szg, _occl, _d, krone = ff.masse(zahn)
        breite = float(krone[:, 0].max() - krone[:, 0].min())
    P = redraw.polygon(umriss)
    s = breite / float(P[:, 0].max() - P[:, 0].min())
    x0, y0 = float(P[:, 0].min()), float(P[:, 1].min())
    zieh = lambda x, y: ((x - x0) * s + RAND, (y - y0) * s + RAND)
    umriss_n = svgpath.warp_path_d(umriss, zieh)
    linien_n = [svgpath.warp_path_d(d, zieh) for d in linien]
    Q = redraw.polygon(umriss_n)
    W = float(Q[:, 0].max()) + RAND
    H = float(Q[:, 1].max()) + RAND
    pfade = "\n    ".join(
        [f'<path id="umriss" inkscape:label="Umriss" d="{umriss_n}" '
         f'style="fill:none;stroke:#000" />']
        + [f'<path id="linie{i}" inkscape:label="Incisal" d="{d}" '
           f'style="fill:none;stroke:#000" />' for i, d in enumerate(linien_n)])
    ziel = ZEICHNUNGEN / f"{zahn}_occl_norm.svg"
    ziel.write_text(f'''<?xml version="1.0" encoding="UTF-8"?>
<!-- normiert aus {quelle(zahn).name}: Umriss auf {breite:.2f} Einheiten
     mesiodistal, die Kronenbreite der Seitenansicht. NICHT von Hand aendern -
     `tools/toothgen/draufsicht.py normiere()` schreibt sie neu. -->
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
     viewBox="0 0 {W:.2f} {H:.2f}" width="{W:.2f}" height="{H:.2f}">
  <g inkscape:groupmode="layer" inkscape:label="3 HIER ZEICHNEN">
    {pfade}
  </g>
</svg>
''')
    return ziel


if __name__ == "__main__":
    for z in sys.argv[1:]:
        umriss, linien, marken = lies(z)
        for klage in pruefe_marken(z, umriss, marken):
            print("  !", klage)
        p = normiere(z)
        import re as _re
        d = _re.search(r'id="umriss"[^>]*\sd="([^"]+)"', p.read_text()).group(1)
        P = redraw.polygon(d)
        print(f"{z}: {len(linien)} Linie(n), normiert auf "
              f"{P[:,0].max()-P[:,0].min():.2f} x {P[:,1].max()-P[:,1].min():.2f} -> {p.name}")
