# Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
# Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
# Dirk Saeger, Malte Sussdorff 2026

"""Zerfaellt jede Kauflaeche noch in dieselben Hoecker?

EIGENES SKRIPT, und zwar unter `python3`, nicht unter `uv run` wie die uebrigen
Pruefungen: die Zerlegung laeuft ueber `hoecker.gebiete()` und braucht numpy,
und die uv-Umgebung hat es nicht. Dieselbe Trennung wie bei den Generatoren -
wer numpy braucht, laeuft unter python3.

    python3 tools/toothgen/verify_hoecker.py

Laeuft in npm run toothgen:verify mit.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import hoecker as hk        # noqa: E402
import kauflaechen as kf    # noqa: E402

ASSETS = Path(__file__).resolve().parents[2] / "src" / "assets" / "teeth-svgs"

# ---------------------------------------------------------------------------
# Der Hoeckerbestand jeder Kauflaeche - die Pruefung, die am 20.08.2026 gefehlt
# hat.
#
# An diesem Tag ging beim Versuch, die Praemolaren-Kauflaechen auf ihre
# Kronenbreite zu ziehen, ZWEIMAL das Fissurenmuster kaputt, und kein Vertrag
# hat es gesehen. Der Ebenenbestand stimmte, die Kontur war durchgehend, die
# Kauebene lag auf einer Linie, und die `fissure`-Ebene zaehlte weiter dieselbe
# Zahl Pfade - sie war nur skaliert. Was falsch war, sass eine Ebene weiter:
# `redraw_occl` erkennt den Umriss als DEN PFAD MIT DEN MEISTEN PUNKTEN, und
# nach einer Neuserialisierung kann ein Hoecker ihn ueberholen. Dann wird ein
# Hoecker zum Umriss erklaert und alles uebrige darauf gewarpt.
#
# Gesehen hat es Dirk im Bild, beide Male. Diese Tabelle ist der Versuch, das
# vor ihm zu sehen.
#
# Gemessen wird an der AUSGELIEFERTEN Vorlage, nicht an der Zeichnung: Umriss
# (`background-cusp`) und `fissure`-Ebene werden mit `hoecker.gebiete()` per
# Flutfuellung in Gebiete zerlegt - jedes Gebiet ist ein Hoecker oder eine
# Randleiste. Festgehalten sind ihre Zahl und ihre Flaechenanteile.
#
# Die Zahl muss GENAU stimmen; sie ist das, was beim Zusammenbrechen der
# Zerlegung als erstes springt. Die Anteile duerfen um TOL_ANTEIL wandern - die
# Kette ist nicht bit-genau wiederholbar (ein Lauf ohne Aenderung verschiebt
# Koordinaten um bis zu 0,02 Einheiten), und ein Rasterverfahren traegt das
# weiter.
#
# Anatomisch lesen sich die Zahlen so: Frontzahn zwei Felder (die Schneidekante
# teilt die Draufsicht), Praemolar vier (zwei Hoecker, zwei Randleisten), Molar
# sechs. Der obere Siebener hat vier - der distopalatinale Hoecker ist dort
# zurueckgebildet, und das steht so auch in der Zeichnung.
HOECKER: dict[str, tuple[int, list[float]]] = {
    "11_occl": (2, [0.596, 0.398]),
    "12_occl": (2, [0.559, 0.435]),
    "13_occl": (2, [0.513, 0.481]),
    "14_occl": (4, [0.461, 0.331, 0.114, 0.088]),
    "15_occl": (4, [0.410, 0.347, 0.138, 0.098]),
    "16_occl": (6, [0.276, 0.225, 0.206, 0.166, 0.079, 0.040]),
    "17_occl": (4, [0.385, 0.283, 0.250, 0.074]),
    "18_occl": (6, [0.261, 0.240, 0.216, 0.125, 0.093, 0.055]),
    "41_occl": (2, [0.649, 0.343]),
    "42_occl": (2, [0.576, 0.417]),
    "43_occl": (2, [0.503, 0.491]),
    "44_occl": (4, [0.553, 0.178, 0.140, 0.123]),
    "45_occl": (4, [0.383, 0.380, 0.122, 0.110]),
    "46_occl": (6, [0.325, 0.184, 0.173, 0.152, 0.094, 0.062]),
    "47_occl": (6, [0.275, 0.243, 0.217, 0.148, 0.053, 0.051]),
    "48_occl": (6, [0.300, 0.225, 0.209, 0.160, 0.057, 0.040]),
    "51_occl": (2, [0.600, 0.392]),
    "52_occl": (2, [0.616, 0.376]),
    "53_occl": (2, [0.521, 0.472]),
    "54_occl": (5, [0.319, 0.276, 0.274, 0.080, 0.040]),
    "55_occl": (5, [0.357, 0.243, 0.220, 0.129, 0.027]),
    "81_occl": (2, [0.500, 0.488]),
    "82_occl": (2, [0.586, 0.404]),
    "83_occl": (2, [0.576, 0.416]),
    "84_occl": (5, [0.345, 0.254, 0.149, 0.124, 0.119]),
    "85_occl": (7, [0.218, 0.209, 0.202, 0.161, 0.103, 0.059, 0.032]),
}

# Wie weit ein Flaechenanteil wandern darf, bevor es ein Befund ist.
TOL_ANTEIL = 0.03


def pruefe_hoecker(failures: list[str]) -> None:
    """Zerfaellt jede Kauflaeche noch in dieselben Gebiete?

    Braucht rund eineinhalb Sekunden je Vorlage - das ist der Preis der
    Flutfuellung und er ist es wert, denn diese Zerlegung ist das, woraus die
    Fuellungsflaechen entstehen. Wandert sie, wandern die Befundflaechen mit.
    """
    print("\nHoeckerbestand je Kauflaeche")
    for ziel, (soll_n, soll_anteile) in sorted(HOECKER.items()):
        if not (ASSETS / f"{ziel}.svg").exists():
            failures.append(f"{ziel}: Vorlage fehlt")
            continue
        try:
            umriss, fissuren, _r, _c = kf.lies(ziel)
            hilfs = hk.verlaengere(fissuren, umriss)
            _marke, gross, kau, zelle, _u = hk.gebiete(umriss, fissuren, hilfs)
        except Exception as e:                                  # noqa: BLE001
            failures.append(f"{ziel}: Hoecker nicht bestimmbar - {type(e).__name__}: {e}")
            continue
        ist_anteile = sorted((n * zelle / kau for _nr, n in gross), reverse=True)
        marke = "OK"
        if len(gross) != soll_n:
            marke = "!!"
            failures.append(
                f"{ziel}: {len(gross)} Gebiete statt {soll_n} - die Kauflaeche "
                f"zerfaellt nicht mehr in dieselben Hoecker")
        else:
            for i, (ist, soll) in enumerate(zip(ist_anteile, soll_anteile)):
                if abs(ist - soll) > TOL_ANTEIL:
                    marke = "!!"
                    failures.append(
                        f"{ziel}: Gebiet {i + 1} hat {ist:.1%} statt {soll:.1%} "
                        f"der Kauflaeche (erlaubt sind {TOL_ANTEIL:.0%})")
        print(f"  {marke} {ziel:10} {len(gross)} Gebiete   "
              + "  ".join(f"{a:.1%}" for a in ist_anteile))




def main() -> int:
    failures: list[str] = []
    pruefe_hoecker(failures)
    print()
    if failures:
        print(f"{len(failures)} Problem(e):")
        for x in failures:
            print("  !!", x)
        return 1
    print("Hoeckerbestand unveraendert.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
