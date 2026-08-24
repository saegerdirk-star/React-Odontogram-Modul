# Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
# Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
# Dirk Saeger, Malte Sussdorff 2026

"""Das Implantat SENKRECHT und MITTIG stellen (Dirk, 24.08.2026).

Dirk: "Die Implantate folgen offensichtlich der Ausrichtung der Wurzeln der
Zaehne. Das brauchen wir nicht. Es ist eine zweidimensionale Darstellung und wir
machen die genau senkrecht und mittig. Die Krone kommt oben drauf."

Der Schraubenkoerper `implant-base` ist je Vorlage entlang der WURZELACHSE des
Zahns gezeichnet - leicht gekippt (3-11 Grad) und ausser der Mitte (Schwerpunkt
bei 0,57-0,78 der Kachelbreite statt 0,5). Die KRONE dagegen sitzt schon mittig
(gemessen cx = 0,50), weil sie aus der zentrierten Kontur geschnitten wird
(`kronen.py`). Also muss nur die Schraube gerade und unter die Krone.

GEZEICHNET WIRD NICHTS NEUES und die Schraubenpfade bleiben unberuehrt: die
ganze `<g id="implant">`-Gruppe bekommt einen `transform`, der die Zeichnung um
den Schwerpunkt des Schraubenkoerpers senkrecht dreht und in x auf den
Zahnmittelpunkt (Schwerpunkt von `tooth-base`) schiebt. Weil der `transform` NUR
ein Attribut ist und `collectActiveLayers` id/opacity/class fingerabdruckt,
bleibt die Paritaet byte-identisch.

DIE ACHSE kommt aus `implant-base` (63 Pfade, der eigentliche Koerper), nicht aus
der ganzen Gruppe - die traegt auch die Attachments (Locator, Bar, Heilkappe)
und den nested `<g>`, der eine naive Regex an der falschen `</g>` abbrechen
laesst. Gemessen wird die Neigung als Linie vom Schwerpunkt des obersten zum
untersten Fuenftel (mittelt die Gewindebreite weg; PCA und diese Methode sind
sich auf 1 Grad einig, die Gewinde-Riffel taeuschen dem Auge mehr Neigung vor).

DAS VORZEICHEN ist fuer BEIDE Kiefer `+ang`: die SVG-Rotationsmatrix hier dreht
effektiv gegen den gemessenen Kippwinkel (am gerenderten Ergebnis kalibriert -
nach dem Lauf steht jede Schraube unter 1,5 Grad). Der Unterkiefer-Flip
(rotate180 + scale(-1,1)) sitzt eine Ebene HOEHER und laesst Senkrechtes
senkrecht; er spielt hier keine Rolle.

Idempotent: der `transform` wird aus den unveraenderten `implant-base`-Pfaden
gerechnet und ein vorhandener ueberschrieben - ein zweiter Lauf aendert nichts.
Nur die Seitenansicht: die Kauflaeche hat keine Schraubenachse.
"""
from __future__ import annotations

import math
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import kronen   # noqa: E402  (Pfadparser + _d_von)

TEMPLATES = Path(__file__).resolve().parents[2] / "src" / "assets" / "teeth-svgs"

# Der Schraubenkoerper ist fuer alle Positionen dieselbe (molarengrosse)
# Zeichnung. Ein Praemolaren- oder Eckzahn-Implantat ist SCHMALER (Dirk,
# 24.08.2026: "Mach die Implantate von 15, 14, 13 kleiner im Durchmesser, gilt
# vermutlich auch fuer 45, 44, 43"). Horizontale Stauchung um die Mittelachse,
# Laenge unveraendert - nur ein weiterer Faktor im transform, also parity-frei.
SCHMAL = {13, 14, 15, 43, 44, 45}
DURCHMESSER_SCHMAL = 0.70


def _group_inner(txt: str, gid: str) -> str | None:
    """Balancierter Inhalt von <g id=gid> ... </g> (nested-`<g>`-fest)."""
    m = re.search(r'<g id="' + re.escape(gid) + r'"[^>]*>', txt)
    if not m:
        return None
    i = m.end()
    depth = 1
    for mm in re.finditer(r'<g\b|</g>', txt[i:]):
        if mm.group(0) == "</g>":
            depth -= 1
            if depth == 0:
                return txt[i:i + mm.start()]
        else:
            depth += 1
    return None


def transform_fuer(txt: str, zahn: str) -> str | None:
    base = _group_inner(txt, "implant-base")
    if base is None:
        return None
    pts: list[tuple[float, float]] = []
    for d in re.findall(r'\sd="([^"]+)"', base):
        pts += kronen.polygon(d, 0.5)
    if len(pts) < 10:
        return None
    n = len(pts)
    mx = sum(p[0] for p in pts) / n
    my = sum(p[1] for p in pts) / n
    ys = sorted(pts, key=lambda p: p[1])
    k = max(5, n // 5)
    tcx = sum(p[0] for p in ys[:k]) / k
    tcy = sum(p[1] for p in ys[:k]) / k
    bcx = sum(p[0] for p in ys[-k:]) / k
    bcy = sum(p[1] for p in ys[-k:]) / k
    rot = math.atan2(bcx - tcx, bcy - tcy)      # Kippwinkel; Matrix dreht dagegen
    d_tb = kronen._d_von(txt, "tooth-base")
    tb = kronen.polygon(d_tb) if d_tb else pts
    tx = sum(p[0] for p in tb) / len(tb)         # Zielmitte = Zahnmittelpunkt
    ca, sa = math.cos(rot), math.sin(rot)
    e = tx - (ca * mx - sa * my)                 # Drehung um (mx,my) + x-Recenter
    f = my - (sa * mx + ca * my)
    # Schmale Positionen zusaetzlich horizontal um die Mittelachse (x=tx) stauchen.
    sx = DURCHMESSER_SCHMAL if _fdi(zahn) in SCHMAL else 1.0
    if sx != 1.0:
        e = sx * e + tx * (1.0 - sx)
        ca, sa = sx * ca, sa           # a=sx*ca, b=sa, c=-sx*sa, d=ca (Scale nach Rotation)
        return f"matrix({ca:.5f},{sa:.5f},{-sx * math.sin(rot):.5f},{math.cos(rot):.5f},{e:.3f},{f:.3f})"
    return (f"matrix({ca:.5f},{sa:.5f},{-sa:.5f},{ca:.5f},{e:.3f},{f:.3f})")


def _fdi(zahn: str) -> int:
    m = re.match(r"(\d+)", zahn)
    return int(m.group(1)) if m else -1


def einsetzen(zahn: str) -> int:
    """Den Aufricht-/Zentrier-Transform auf die implant-Gruppe schreiben."""
    if zahn.endswith("_occl"):
        return 0
    fp = TEMPLATES / f"{zahn}.svg"
    txt = fp.read_text()
    tr = transform_fuer(txt, zahn)
    if tr is None:
        return 0
    m = re.search(r'<g id="implant"[^>]*>', txt)
    if not m:
        return 0
    tag = m.group(0)
    neu = (re.sub(r'\stransform="[^"]*"', f' transform="{tr}"', tag)
           if "transform=" in tag else tag[:-1] + f' transform="{tr}">')
    fp.write_text(txt.replace(tag, neu, 1))
    return 1


def alle() -> list[str]:
    return sorted(p.stem for p in TEMPLATES.glob("*.svg") if not p.stem.endswith("_occl"))


if __name__ == "__main__":
    ziele = sys.argv[1:] or alle()
    n = sum(einsetzen(z) for z in ziele)
    print(f"Implantate senkrecht+mittig: {n} Vorlagen")
