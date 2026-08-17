# Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
# Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
# Dirk Saeger, Malte Sussdorff 2026

"""Der Vertrag der AUSGELIEFERTEN Templates - der aus Dirks Zeichnungen.

`verify.py` misst, was `build.py` aus den Schumacher-Konturen baut, gegen die
Zahlen in `spec.py`. Das ist seit dem Umzeichnen der SPENDER-Satz. Was
ausgeliefert wird, ist Dirks Zeichnung, und dagegen zu messen, was Schumacher
sagt, hiesse dem Zahnarzt die Vorlage vorzuhalten.

Was hier steht, ist deshalb nicht dieselbe Pruefung noch einmal, sondern das,
was beim Umzeichnen schiefgehen KANN:

  * Der Ebenenbestand muss dem des Spenders entsprechen. Daran haengt der
    Parity-Fingerabdruck des Odontogramms - er liest id, opacity und class.
  * Der Umriss muss EIN durchgehender Zug sein. Dirk hat sie so gezeichnet;
    zwei Teilpfade heisst, dass beim Einsetzen etwas verlorenging.
  * Das Lumen muss im Zahn bleiben. Ein Wurzelkanal, der aus dem Apex ragt, ist
    der Fehler, den ein Feld ausserhalb seiner Stuetzstellen macht.
  * Das Implantat ist ein Fabrikteil: seine Plattform gehoert unter die
    Schmelz-Zement-Grenze, nicht in die Krone. Genau das ging beim ersten Lauf
    schief, und die Zervikallinie der Parodontalkarte haengt daran.
  * Die Spalte, in der das Zahnfleisch gezeichnet wurde, muss die Spalte sein,
    in der der Zahn steht - sonst verfehlt die Papille das Gelenk.
  * MO und OD muessen je EINE Flaeche sein, und die Kauebene muss ueber alle
    Templates auf einer Hoehe liegen. Beides uebernimmt verify.py unveraendert.

Aufruf:  uv run tools/toothgen/verify_redraw.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from xml.dom import minidom

sys.path.insert(0, str(Path(__file__).resolve().parent))
import roots  # noqa: E402
import spec  # noqa: E402
import verify  # noqa: E402
from build import ASSETS, SPENDER, curve_extent, tooth_base_d  # noqa: E402
from redraw_plan import PLAN, PLAN_OCCL  # noqa: E402

INDEX_CSS = ASSETS.parents[1] / "index.css"

# Ueberstand des Lumens ueber den Apex. Nicht null: der Umriss wird EINGESETZT,
# das Lumen mitgezogen, und beide sind damit unterschiedlich entstanden. Der
# gemessene Bestand liegt zwischen 1,7 und 13,3 Einheiten; ein Wert daneben
# heisst, dass ein Feld ausserhalb seiner Stuetzstellen extrapoliert hat.
TOL_UEBERSTAND = 15.0

# Wie weit der Implantatkoerper gegenueber dem Spender wachsen darf. Eine
# Aehnlichkeitsabbildung skaliert ihn um wenige Prozent; das volle Zahnfeld
# zog ihn am Sechser auf das Doppelte.
TOL_IMPLANTAT = 1.3


def _implantat_laenge(txt: str) -> float | None:
    im = re.search(r'<g id="implant-base".*?</g>', txt, re.S)
    if not im:
        return None
    pts = [p for d in re.findall(r'\sd="([^"]+)"', im.group(0))
           for s in roots._polylines(d) for p in s]
    return (max(p[1] for p in pts) - min(p[1] for p in pts)) if pts else None


def spalten_je_zahn() -> dict[int, float]:
    """Welche Spalte jeder Zahn in src/index.css bekommt.

    Die beiden Boegen stehen in der Reihenfolge, in der `buildGrid` die Kacheln
    setzt: 18..11, 21..28 und 48..41, 31..38.
    """
    css = INDEX_CSS.read_text()
    decls = re.findall(r"\.(upper|lower)-arch\{\s*grid-template-columns:([^;]+);", css, re.S)
    reihen = {
        "upper": [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
        "lower": [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],
    }
    out: dict[int, float] = {}
    for bogen, d in decls:
        breiten = [float(v) for v in re.findall(r"minmax\([^,]+,\s*([\d.]+)px\)", d)]
        if len(breiten) != 16:
            raise SystemExit(f"{bogen}-arch: {len(breiten)} Spalten statt 16")
        out.update(dict(zip(reihen[bogen], breiten)))
    return out


def position_von(key: str) -> int:
    """Der bleibende Zahn, auf dessen Platz dieses Template steht."""
    n = int(key)
    if 51 <= n <= 55:
        return n - 40
    if 81 <= n <= 85:
        return n - 40
    return n


def main() -> int:
    failures: list[str] = []
    spalten = spalten_je_zahn()
    occl_offsets: list[tuple[str, float]] = []

    kopf = f"{'Tpl':6s} {'Spender':8s} {'Zug':>4s} {'Ueberstand':>11s} {'Implantat':>11s}  {'id/Tags':>8s}"
    print(f"Pruefe {ASSETS}\n")
    print(kopf)
    print("-" * len(kopf))

    for key, (zeichnung, spender, *_rest) in PLAN.items():
        f = ASSETS / f"{key}.svg"
        if not f.exists():
            failures.append(f"{key}: Datei fehlt")
            continue
        txt = f.read_text()
        try:
            minidom.parseString(txt)
        except Exception as e:
            failures.append(f"{key}: ungueltiges XML ({e})")
            continue

        src = (SPENDER / f"{spender}.svg").read_text()
        ids_ok = verify.clinical_ids(src) == verify.clinical_ids(txt)
        tags_ok = re.findall(r"<(\w+)", src) == re.findall(r"<(\w+)", txt)

        stempel = re.search(r'data-tooth-template="([^"]+)"', txt)
        if not stempel or stempel.group(1) != key:
            failures.append(f"{key}: data-tooth-template nennt "
                            f"{stempel.group(1) if stempel else 'nichts'}")

        base_d = tooth_base_d(txt)
        n_sub = len(roots._polylines(base_d))
        if n_sub != 1:
            failures.append(f"{key}: tooth-base hat {n_sub} Teilpfade; "
                            f"der Umriss muss durchgehend sein")

        vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', txt).group(1).split()]
        m = re.search(r"<!-- toothgen:.*?\bcej=([-\d.]+)", txt)
        if not m:
            failures.append(f"{key}: toothgen-Kopf fehlt")
            continue
        cej = float(m.group(1))
        _, apex, _, inc = curve_extent(base_d)
        occl_offsets.append((key, vb[1] + vb[3] - inc))

        ueberstand, _lumen_w = verify.lumen_extremes(txt, base_d, apex, cej)
        if ueberstand is None:
            failures.append(f"{key}: keine Lumen-Ebene gefunden")
            ueberstand = 0.0
        elif ueberstand > TOL_UEBERSTAND:
            failures.append(f"{key}: Lumen steht {ueberstand:.2f} ueber den Apex hinaus")

        # Das Implantat ist ein Fabrikteil und darf sich nicht mit der Wurzel
        # dehnen, in die es gesetzt wird. Gemessen wird die LAENGE gegen die des
        # Spenders: eine Aehnlichkeitsabbildung skaliert sie gleichmaessig um
        # wenige Prozent, ein volles Feld zog sie am Sechser auf das Doppelte.
        laenge = _implantat_laenge(txt)
        laenge_sp = _implantat_laenge(src)
        streckung = None
        if laenge and laenge_sp:
            streckung = laenge / laenge_sp
            if not (1 / TOL_IMPLANTAT <= streckung <= TOL_IMPLANTAT):
                failures.append(
                    f"{key}: der Implantatkoerper misst das {streckung:.2f}-fache "
                    f"des Spenders; er wurde mit dem Zahn gedehnt statt starr "
                    f"abgebildet")

        # Die Spalte, in der das Zahnfleisch gezeichnet wurde, kommt aus der
        # Spec des SPENDERS - das Umzeichnen kennt keine eigene. Sie muss die
        # Spalte sein, in der dieses Template im Bogen steht.
        s_spec = spec.SPEC_BY_KEY.get(spender) or spec.PRIMARY_SPEC_BY_KEY[spender]
        soll = spalten.get(position_von(key))
        if soll is not None and float(s_spec.col_px) != soll:
            failures.append(
                f"{key}: Zahnfleisch fuer eine {s_spec.col_px:g} px breite Spalte "
                f"gezeichnet, steht aber in {soll:g} px; die Papille verfehlt das Gelenk")

        mark = lambda b: "OK" if b else "!!"  # noqa: E731
        gut_impl = streckung is None or 1 / TOL_IMPLANTAT <= streckung <= TOL_IMPLANTAT
        print(f"{key:6s} {spender:8s} {mark(n_sub == 1)} {n_sub} "
              f"{mark(ueberstand <= TOL_UEBERSTAND)} {ueberstand:8.2f} "
              f"{mark(gut_impl)} {'-' if streckung is None else f'{streckung:8.2f}'}  "
              f"{mark(ids_ok and tags_ok):>8s}")
        if not ids_ok:
            failures.append(f"{key}: die klinischen ids weichen vom Spender {spender} ab")
        if not tags_ok:
            failures.append(f"{key}: die Elementfolge weicht vom Spender {spender} ab")

    print(f"\n{'Kauflaeche':11s} {'Spender':9s}  {'id/Tags':>8s}")
    for key, (zeichnung, spender) in PLAN_OCCL.items():
        f = ASSETS / f"{key}.svg"
        if not f.exists():
            failures.append(f"{key}: Datei fehlt")
            continue
        txt = f.read_text()
        try:
            minidom.parseString(txt)
        except Exception as e:
            failures.append(f"{key}: ungueltiges XML ({e})")
            continue
        src = (SPENDER / f"{spender}.svg").read_text()
        ids_ok = verify.clinical_ids(src) == verify.clinical_ids(txt)
        tags_ok = re.findall(r"<(\w+)", src) == re.findall(r"<(\w+)", txt)
        stempel = re.search(r'data-tooth-template="([^"]+)"', txt)
        if not stempel or stempel.group(1) != key:
            failures.append(f"{key}: data-tooth-template nennt "
                            f"{stempel.group(1) if stempel else 'nichts'}")
        print(f"{key:11s} {spender:9s}  {'OK' if ids_ok and tags_ok else '!!':>8s}")
        if not ids_ok:
            failures.append(f"{key}: die klinischen ids weichen vom Spender {spender} ab")
        if not tags_ok:
            failures.append(f"{key}: die Elementfolge weicht vom Spender {spender} ab")

    verify.check_fillings(ASSETS, failures)

    if occl_offsets:
        vals = [v for _, v in occl_offsets]
        spread = max(vals) - min(vals)
        print(f"\nKauebene ueber dem viewBox-Rand: {min(vals):.2f} .. {max(vals):.2f} "
              f"(Streuung {spread:.2f})")
        if spread > verify.TOL_OCCL:
            failures.append(f"die Kauebene streut um {spread:.2f}; die Kronen stehen nicht auf einer Linie")

    print()
    if failures:
        print(f"{len(failures)} Problem(e):")
        for x in failures:
            print("  !!", x)
        return 1
    print("Alle Pruefungen bestanden.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
