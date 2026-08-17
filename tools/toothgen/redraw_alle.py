# Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
# Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
# Dirk Saeger, Malte Sussdorff 2026

"""Alle Templates aus den Zeichnungen erzeugen - eines je Position.

Dirk, 17.08.2026: "Wir haben Zeichnungen fuer je 2 mal 8 bleibende Zaehne und
2 mal 5 Milchzaehne und diese Templates benutzen wir auch. Die Logik muss
demnach geaendert werden."

Bisher teilen sich mehrere Positionen ein Template: 18 zeichnet sich als 17,
43 als oberer Eckzahn, die unteren Praemolaren als 15, der untere Milcheckzahn
sogar als OBERER (53). Das war eine Notloesung, solange es nur neun Zeichnungen
gab. Jetzt gibt es 26, und jede Position bekommt ihre eigene.

  bleibend:  11 12 13 14 15 16 17 18   und   41 42 43 44 45 46 47 48
  Milch:     51 52 53 54 55            und   81 82 83 84 85

Die Gegenseite entsteht weiterhin durch Spiegeln (21 aus 11, 31 aus 41, 61 aus
51, 71 aus 81), das aendert sich nicht - nur wird nicht mehr ueber die
Kiefermitte hinweg geteilt.

SPENDER: ein neues Template hat noch keine Datei, aus der die rund 200
klinischen Ebenen kommen koennten. Sie kommen vom naechsten Verwandten - dem
Zahn derselben Klasse, dessen Ebenenbestand passt. Der Umriss und die Pulpa
stammen ohnehin aus Dirks Zeichnung; der Spender liefert nur, was niemand
zeichnet.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import redraw_apply  # noqa: E402

# Ziel-Template -> (Zeichnung, Spender, Anker vorhanden)
PLAN: dict[str, tuple[str, str, bool]] = {
    # Oberkiefer, bleibend
    "11": ("11", "11", False),
    "12": ("12", "12", False),
    "13": ("13", "13", False),
    "14": ("14", "14", True),
    "15": ("15", "15", False),
    "16": ("16", "16", True),
    "17": ("17", "17", True),
    "18": ("18", "17", True),
    # Unterkiefer, bleibend
    "41": ("41", "31", False),
    "42": ("42", "31", False),
    "43": ("43", "13", False),
    "44": ("44", "15", False),
    "45": ("45", "15", False),
    "46": ("46", "46", True),
    "47": ("47", "46", True),
    "48": ("48", "46", True),
    # Oberkiefer, Milch
    "51": ("51", "51", False),
    "52": ("52", "52", False),
    "53": ("53", "53", False),
    "54": ("54", "54", False),
    "55": ("55", "55", False),
    # Unterkiefer, Milch
    "81": ("81", "71", False),
    "82": ("82", "71", False),
    "83": ("83", "53", False),
    "84": ("84", "74", False),
    "85": ("85", "75", False),
}


def erzeuge(ziel: str, ordner: Path) -> str:
    zahn, spender, anker = PLAN[ziel]
    txt = redraw_apply.umzeichnen(zahn, spender, anker)
    # Der Stempel muss das ZIEL nennen, nicht den Spender - `isPrimaryTemplate`
    # und `syncToothTemplate` lesen ihn, und eine zweite Tabelle daneben waere
    # genau die Sorte Doppelung, die auseinanderlaeuft.
    txt = txt.replace(f'data-tooth-template="{spender}"', f'data-tooth-template="{ziel}"', 1)
    # Die Gradienten-ids tragen den Spendernamen und muessen je Datei eindeutig
    # bleiben, sonst greift in einem Dokument mit mehreren Zaehnen der falsche.
    txt = txt.replace(f"toothgen-{spender}-", f"toothgen-{ziel}-")
    (ordner / f"{ziel}.svg").write_text(txt)
    return txt


if __name__ == "__main__":
    ordner = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/Alle")
    ordner.mkdir(parents=True, exist_ok=True)
    for ziel in sys.argv[2:] or list(PLAN):
        try:
            txt = erzeuge(ziel, ordner)
            print(f"{ziel}: ok, {len(txt)} Zeichen", flush=True)
        except Exception as e:
            print(f"{ziel}: FEHLER {type(e).__name__}: {e}", flush=True)
