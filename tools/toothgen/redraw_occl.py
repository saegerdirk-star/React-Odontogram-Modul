# Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
# Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
# Dirk Saeger, Malte Sussdorff 2026

"""Kauflaechen-Templates aus den Zeichnungen - der okklusale Zwilling zu
redraw_apply.

Derselbe Ablauf wie in der Seitenansicht, mit zwei Unterschieden:

  * Die Zuordnung laeuft RADIAL statt ueber die Hoehe (`redraw.paare_radial`).
    Eine Kauflaeche hat keine Achse, aber einen Mittelpunkt.
  * Es gibt kein Zahnfleisch, keine Zervikallinie und keine Pulpa. Damit
    entfallen `replace_gum`, die SZG-Linie und das zweite Feld.

Alles andere bleibt: der gezeichnete Umriss wird EINGESETZT, nicht nachgebildet,
und das Feld traegt nur die Ebenen, die niemand zeichnet.

FISSUREN. Dirks Zeichnungen enthalten neben dem Aussenumriss die Hoecker und
Fissuren - am Molaren elf weitere Pfade, am Praemolaren fuenf. Sie werden
vorerst NICHT eingesetzt, sondern mitgezogen. Der Grund steht in UMBAU.md: an
`fissure-sealing-occlusal` haengt ein Befund, und die Versiegelungsflaeche muss
auf den Fissuren liegen. Gewarpt bleiben beide zueinander stimmig; eingesetzt
waere nur die Fissur Dirks und die Versiegelung sasse daneben. Bei den
Praemolaren bleibt es ohnehin dabei - dort hat Dirk bewusst keine Fissuren
gezeichnet, weil die alten Templates vom Oberkiefermolaren abgeleitet waren.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
import redraw          # noqa: E402
import redraw_apply    # noqa: E402
import svgpath         # noqa: E402

ZEICHNUNGEN = redraw_apply.ZEICHNUNGEN
ASSETS = redraw_apply.ASSETS

# Ziel -> (Zeichnung, Spender)
PLAN: dict[str, tuple[str, str]] = {
    "14_occl": ("14", "14_occl"), "15_occl": ("15", "14_occl"),
    "16_occl": ("16", "16_occl"), "17_occl": ("17", "16_occl"),
    "18_occl": ("18", "16_occl"),
    "44_occl": ("44", "34_occl"), "45_occl": ("45", "34_occl"),
    "46_occl": ("46", "46_occl"), "47_occl": ("47", "46_occl"),
    "48_occl": ("48", "46_occl"),
    # Die Milchmolaren nehmen den MOLAREN als Spender, nicht den Praemolaren -
    # auch der erste. Dirk, 17.08.2026: "84 und 54 haben das Template vom
    # Praemolaren, richtig? Da wuerde ich vorschlagen, dass wir das von 85 / 55
    # nutzen." Ein erster Milchmolar ist ein Molar; sein Fissurenmuster ist
    # keines mit zwei Hoeckern. Dieselbe Korrektur hatte er in der
    # Seitenansicht schon einmal angesagt.
    "54_occl": ("54", "16_occl"), "55_occl": ("55", "16_occl"),
    "84_occl": ("84", "46_occl"), "85_occl": ("85", "46_occl"),
}


def _norm(P):
    Q = np.asarray(P, float).copy()
    for k in (0, 1):
        Q[:, k] = (Q[:, k] - Q[:, k].min()) / max(1e-9, np.ptp(Q[:, k]))
    return Q


def _abstand(P, Q):
    d = np.sqrt(((P[:, None, :] - Q[None, :, :]) ** 2).sum(-1))
    return float(max(d.min(1).mean(), d.min(0).mean()))


def dreher(zeichnung, template):
    """Dreht eine Kauflaechen-Zeichnung in den Rahmen ihres Templates.

    In der Seitenansicht entscheidet die Anatomie, wo die Wurzel liegt. Eine
    Kauflaeche hat keine Wurzel; hier entscheidet die FORM. Die unteren
    Kauflaechen-Templates werden im Bogen um 180 Grad gedreht verwendet
    (`OCCLUSAL_TEMPLATE`), Dirk zeichnet sie anatomisch - also ist die Frage,
    welche der beiden Lagen naeher an der Vorlage liegt. Bei einer Kauflaeche
    ist das entscheidbar, weil sie mesial breiter ist als distal.
    """
    A = _norm(template)
    ohne = _abstand(A, _norm(zeichnung))
    P = np.asarray(zeichnung, float)
    cx = float(P[:, 0].min() + P[:, 0].max()) / 2.0
    cy = float(P[:, 1].min() + P[:, 1].max()) / 2.0
    gedreht = np.column_stack([2 * cx - P[:, 0], 2 * cy - P[:, 1]])
    if _abstand(A, _norm(gedreht)) < ohne:
        return lambda x, y: (2.0 * cx - x, 2.0 * cy - y)
    return None


def umzeichnen(zahn: str, spender: str) -> str:
    txt = (ASSETS / f"{spender}.svg").read_text()
    ziel = redraw_apply.umriss_id(txt, "tooth-base")
    alt = redraw.polygon(dict(redraw_apply.elemente_von(txt, "tooth-base"))[ziel])

    ebene = redraw_apply._ebene(
        (ZEICHNUNGEN / f"{zahn}_occl_zeichnen.svg").read_text(), "3 HIER ZEICHNEN")
    ds = re.findall(r'<path[^>]*\sd="([^"]+)"', ebene)
    if not ds:
        raise ValueError(f"{zahn}_occl_zeichnen.svg: nichts in der Zeichenebene")
    # Der Aussenumriss ist der laengste Pfad - die uebrigen sind Hoecker und
    # Fissuren, die INNERHALB von ihm liegen.
    umriss_d = max(ds, key=lambda d: len(redraw.polygon(d)))
    dr = dreher(redraw.polygon(umriss_d), alt)
    if dr:
        umriss_d = svgpath.warp_path_d(umriss_d, dr)
    neu = redraw.polygon(umriss_d)

    A, B = redraw.paare_radial(alt, neu)
    feld = redraw.Spline(A, B, glaettung=1e-3)

    txt = re.sub(r'(<path[^>]*\sid="' + re.escape(ziel) + r'"[^>]*\sd=")[^"]+(")',
                 lambda m: m.group(1) + umriss_d + m.group(2), txt, count=1)
    if umriss_d not in txt:
        raise ValueError(f"{ziel}: Pfad nicht ersetzt")
    unberuehrt = {ziel}

    def feld_fuer(kette):
        # Zahnfleisch und Knochen bleiben unangetastet, genau wie in der
        # Seitenansicht: sie gehoeren der SPALTE und nicht dem Zahn, werden in
        # Endkoordinaten gezeichnet und teilen sich eine Papille mit dem
        # Nachbarn. Mitgezogen wellen sie sich, und die Baender zweier
        # Nachbarzaehne treffen einander nicht mehr.
        if any(k in unberuehrt or k in redraw.NICHT_VERFORMEN for k in kette):
            return None
        return lambda x, y: feld(x, y)

    return redraw_apply.verforme_je_element(txt, feld_fuer)


# Praemolaren tragen KEINE Fissuren. Dirk hat sie bewusst ohne gezeichnet, weil
# die alten Templates vom Oberkiefermolaren abgeleitet waren; mitgezogen laege
# also weiterhin ein Molarenmuster auf einem Praemolaren. Lieber eine glatte
# Kauflaeche als eine falsche - nachzuzeichnen, wenn Zeit ist.
OHNE_FISSUREN = {"14_occl", "15_occl", "44_occl", "45_occl"}


def leere_fissuren(txt: str) -> str:
    """Die Fissurenzeichnung entfernen, ohne einen Vertragswert anzufassen.

    Die Pfade in `<g id="fissure">` tragen keine eigene id - sie sind anonym.
    Ihr `d` durch eine entartete Strecke weit ausserhalb des viewBox zu
    ersetzen loescht also nichts, was der Fingerabdruck kennt: die Gruppe
    bleibt mit id und data-active stehen, nur ihr Inhalt zeichnet nicht mehr.
    Sie sind mit stumpfen Enden gestrichelt, ein entarteter Pfad hinterlaesst
    daher auch keinen Punkt.
    """
    m = re.search(r'(<g[^>]*\sid="fissure"[^>]*>)(.*?)(</g>)', txt, re.S)
    if not m:
        return txt
    innen = re.sub(r'(\sd=")[^"]+(")', lambda x: x.group(1) + "M-99,-99Z" + x.group(2), m.group(2))
    return txt[:m.start()] + m.group(1) + innen + m.group(3) + txt[m.end():]


def erzeuge(ziel: str, ordner: Path) -> str:
    zahn, spender = PLAN[ziel]
    txt = umzeichnen(zahn, spender)
    if ziel in OHNE_FISSUREN:
        txt = leere_fissuren(txt)
    txt = txt.replace(f'data-tooth-template="{spender}"', f'data-tooth-template="{ziel}"', 1)
    txt = txt.replace(f"toothgen-{spender}-", f"toothgen-{ziel}-")
    (ordner / f"{ziel}.svg").write_text(txt)
    return txt


if __name__ == "__main__":
    ordner = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/Neu")
    ordner.mkdir(parents=True, exist_ok=True)
    for ziel in sys.argv[2:] or list(PLAN):
        try:
            print(f"{ziel}: ok, {len(erzeuge(ziel, ordner))} Zeichen", flush=True)
        except Exception as e:
            print(f"{ziel}: FEHLER {type(e).__name__}: {e}", flush=True)
