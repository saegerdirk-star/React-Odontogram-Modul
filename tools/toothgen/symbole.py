# Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
# Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
# Dirk Saeger, Malte Sussdorff 2026

"""Symbole ZEICHNEN statt abbilden.

Dirk, 21.08.2026: *"Kannst du fuer X extrahieren auch ein einfaches X
drueberlegen?"*

WARUM DAS DIE RICHTIGE ANTWORT IST. `redraw_apply.starr_im_rahmen` hat das
Extraktionskreuz gerade gemacht - aber es bleibt die Form, die im Spender
gezeichnet wurde: zwei leicht geschwungene Baender, deren Kreuzungspunkt hoch
sitzt und deren Arme verschieden lang sind. Starr abgebildet ist das ein
sauberes Abbild einer Form, die niemand als Kreuz gezeichnet hat.

Ein Kreuz ist aber keine Zeichnung, sondern eine Konstruktion: die beiden
Diagonalen eines Kastens. Wer es konstruiert, bekommt es auf jeder Vorlage
richtig, ohne Feld, ohne Spender, ohne Drift - dieselbe Ueberlegung, aus der
`gum.py` das Zahnfleisch in Endkoordinaten zeichnet und `halsbaender.py` die
Halsbaender als Balken rechnet, statt beides zu warpen.

WAS UNANGETASTET BLEIBT: die Ebene, ihre id, ihre Zahl von Pfaden, ihre
Reihenfolge und ihr Stil. Ersetzt wird nur das `d` je Pfad. Damit bleibt der
Ebenenbestand identisch (`verify_redraw.py` prueft ihn gegen den Spender) und
der SVG-Fingerabdruck ebenso - der haelt `id`, `opacity` und `class` fest, nicht
die Geometrie.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import kronen   # noqa: E402  - polygon() und _d_von() liegen dort

TEMPLATES = kronen.TEMPLATES

# Wie weit das Kreuz innerhalb des Zahnkastens endet. Der Strich ist 3 Einheiten
# stark und stumpf abgeschnitten, ragt an einem Ende also 1,5 hinaus; 2,5 laesst
# ihn sichtbar innerhalb der Kachel enden, ohne dass das Kreuz kleiner wirkt als
# der Zahn.
EINZUG = 2.5

# Zwei Nachkommastellen - die Kette serialisiert bei prec=2 neu, drei Stellen
# lassen `check_roundtrip.py` durchfallen.
PREC = 2


def _f(v: float) -> str:
    s = f"{v:.{PREC}f}"
    if "." in s:
        s = s.rstrip("0").rstrip(".")
    return s or "0"


def kasten(zahn: str) -> tuple[float, float, float, float] | None:
    """Der Kasten des Zahns: Seitenansicht die Kontur, Kauflaeche die Tafel."""
    txt = (TEMPLATES / f"{zahn}.svg").read_text()
    ident = "background-cusp" if zahn.endswith("_occl") else "tooth-base"
    d = kronen._d_von(txt, ident)
    if not d:
        return None
    pts = kronen.polygon(d)
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


def kreuz(zahn: str) -> tuple[str, str] | None:
    """Die beiden Diagonalen als Pfaddaten, in der Reihenfolge des Spenders.

    Der erste Pfad laeuft in beiden Vorlagen von unten links nach oben rechts,
    der zweite von oben links nach unten rechts - abgelesen an den d-Anfaengen
    des Spenders, damit ein Blick in den Unterschied nicht ueber eine vertauschte
    Reihenfolge stolpert.
    """
    k = kasten(zahn)
    if k is None:
        return None
    x0, y0, x1, y1 = k
    x0, y0, x1, y1 = x0 + EINZUG, y0 + EINZUG, x1 - EINZUG, y1 - EINZUG
    if x1 <= x0 or y1 <= y0:
        return None
    return (f"M{_f(x0)},{_f(y1)}L{_f(x1)},{_f(y0)}",
            f"M{_f(x0)},{_f(y0)}L{_f(x1)},{_f(y1)}")


def einsetzen(zahn: str) -> dict[str, int]:
    """Das konstruierte Kreuz in `extraction-plan` schreiben."""
    formen = kreuz(zahn)
    if formen is None:
        return {"kreuz": 0}
    datei = TEMPLATES / f"{zahn}.svg"
    txt = datei.read_text()
    g = re.search(r'(<g[^>]*\sid="extraction-plan"[^>]*>)(.*?)(</g>)', txt, re.S)
    if not g:
        return {"kreuz": 0}
    innen = g.group(2)
    pfade = re.findall(r'<path[^>]*/>', innen)
    if len(pfade) != 2:
        # Zwei Striche, sonst ist es kein Kreuz mehr und hier ist der falsche
        # Ort, das zu entscheiden.
        return {"kreuz": 0}
    neu_innen = innen
    for alt, neu_d in zip(pfade, formen):
        neu_innen = neu_innen.replace(
            alt, re.sub(r'\sd="[^"]*"', ' d="' + neu_d + '"', alt, count=1), 1)
    datei.write_text(txt.replace(g.group(0), g.group(1) + neu_innen + g.group(3), 1))
    return {"kreuz": 2}


if __name__ == "__main__":
    for z in kronen.alle():
        print(f"  {z:10} {einsetzen(z)}")
