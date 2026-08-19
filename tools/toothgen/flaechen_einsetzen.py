# Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
# Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
# Dirk Saeger, Malte Sussdorff 2026

"""DRITTE STUFE: die Flaechen einsetzen, auf denen ein Befund erhoben wird.

Warum es diese Datei gibt: die Stufe stand in keinem Skript. `npm run
toothgen:redraw` baute die Spender und setzte Umriss und Pulpa ein - und hoerte
dort auf. Wer den dokumentierten Befehl benutzte, verlor die abgeleiteten
Fuell- und Kariesflaechen LAUTLOS: die Templates fielen auf die Spenderformen
zurueck, und weil beide gueltiges SVG sind, meldete kein Vertrag etwas. Am
19.08.2026 ist genau das passiert.

Die Stufe ist eigenstaendig, weil ihre Eingabe eine andere ist: sie leitet die
Flaechen AUS dem bereits eingesetzten Umriss ab. Vorher gibt es nichts, woraus
sie sie ableiten koennte.

    fuellflaechen_einsetzen   mesial, distal, okklusal/inzisal, bukkal, lingual
                              in die Seitenansichten
    halsbaender               caries-root und caries-subcrown als Baender am Hals
    kauflaechen               dieselben fuenf Flaechen in die Kauflaechenansicht,
                              entlang der gezeichneten Fissuren
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import fuellflaechen as ff          # noqa: E402
import fuellflaechen_einsetzen as fe  # noqa: E402
import halsbaender as hb            # noqa: E402
import kauflaechen as kf            # noqa: E402
import redraw_plan as rp            # noqa: E402


def main() -> int:
    seiten = ff.SEITENZAEHNE + ff.FRONTZAEHNE
    print(f"Seitenansichten: {len(seiten)}")
    for z in seiten:
        n = fe.einsetzen(z)
        b = hb.einsetzen(z)
        print(f"  {z:4} " + "  ".join(f"{k} {v}" for k, v in n.items())
              + "   Baender " + " ".join(f"{k.split('-')[1]} {v:.2f}" for k, v in b.items()))

    print(f"Kauflaechen: {len(rp.PLAN_OCCL)}")
    for ziel in rp.PLAN_OCCL:
        n = kf.einsetzen(ziel)
        print(f"  {ziel:10} " + "  ".join(f"{k} {v}" for k, v in n.items()))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
