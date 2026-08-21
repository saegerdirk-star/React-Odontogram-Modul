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
import svgpath  # noqa: E402
import spec  # noqa: E402
import verify  # noqa: E402
from build import ASSETS, PX_PER_UNIT, SPENDER, curve_extent, tooth_base_d  # noqa: E402
from redraw_plan import (GRID_GAP, PLAN, PLAN_OCCL, SPALTEN,  # noqa: E402
                         ZERVIKAL, ZUSCHLAG)

INDEX_CSS = ASSETS.parents[1] / "index.css"
ZEICHNUNGEN = Path.home() / "dev" / "Odontogram-Anatomie"

# Ueberstand des Lumens ueber den Apex. Nicht null: der Umriss wird EINGESETZT,
# das Lumen mitgezogen, und beide sind damit unterschiedlich entstanden. Der
# gemessene Bestand liegt zwischen 1,7 und 13,3 Einheiten; ein Wert daneben
# heisst, dass ein Feld ausserhalb seiner Stuetzstellen extrapoliert hat.
TOL_UEBERSTAND = 15.0

# Wie weit der Implantatkoerper gegenueber dem Spender wachsen darf. Eine
# Aehnlichkeitsabbildung skaliert ihn um wenige Prozent; das volle Zahnfeld
# zog ihn am Sechser auf das Doppelte.
TOL_IMPLANTAT = 1.3

# Wie weit die gemessene Zervikallinie von `ZERVIKAL` abweichen darf. Die Kette
# ist nicht bitgenau wiederholbar - ein Lauf ohne Aenderung verschiebt
# Koordinaten um bis zu 0,02 Einheiten -, also kann hier nicht auf die Stelle
# geprueft werden. 0,15 laesst das Rauschen durch und faengt eine geaenderte
# Zeichnung.
TOL_ZERVIKAL = 0.15


def _implantat_laenge(txt: str) -> float | None:
    im = re.search(r'<g id="implant-base".*?</g>', txt, re.S)
    if not im:
        return None
    pts = [p for d in re.findall(r'\sd="([^"]+)"', im.group(0))
           for s in roots._polylines(d) for p in s]
    return (max(p[1] for p in pts) - min(p[1] for p in pts)) if pts else None


def mesial_aus_zeichnung(zahn: str) -> str | None:
    """Auf welcher Seite die Zeichnung selbst "mesial" oder "m" anschreibt.

    Dirk hat es an 46 drangeschrieben, und diese eine Beschriftung hat einen
    Schluss widerlegt, auf dem die Haelfte der Unterkiefer-Geometrie stand: aus
    seiner Ankerkonvention war abgeleitet worden, mesial liege links - es liegt
    rechts. Wo eine Beschriftung da ist, wird sie gelesen und nicht gedeutet.

    Gibt "rechts", "links" oder None zurueck (keine Beschriftung gefunden).
    """
    datei = ZEICHNUNGEN / f"{zahn}_zeichnen.svg"
    if not datei.exists():
        return None
    txt = datei.read_text()
    beschriftet = None
    for m in re.finditer(r'<text[^>]*\sx="([-\d.]+)"[^>]*>(.*?)</text>', txt, re.S):
        wort = re.sub(r"<[^>]+>", "", m.group(2)).strip().lower()
        if wort in ("m", "mesial"):
            beschriftet = float(m.group(1))
    if beschriftet is None:
        return None
    # Die Mitte OHNE numpy, denn `verify_redraw` soll ohne den Generator laufen,
    # den es prueft: die Mitte des viewBox der ZEICHNUNG. Fuer links oder rechts
    # reicht das, und es ist der einzige Wert, der ohne Pfad-Auswertung stimmt.
    #
    # Der erste Versuch nahm die Zahlen der Pfaddaten paarweise als x und y -
    # falsch, weil Inkscape relativ schreibt und `h`/`v` nur EINE Zahl tragen.
    # Er meldete mesial links, wo es rechts steht.
    vb = re.search(r'viewBox="([^"]+)"', txt)
    if not vb:
        return None
    teile = [float(v) for v in vb.group(1).split()]
    mitte = teile[0] + teile[2] / 2.0
    return "rechts" if beschriftet > mitte else "links"


def _kronenbreite(txt: str, cej: float, inc: float) -> float | None:
    """Die groesste mesiodistale Kronenbreite, in CSS-Pixeln.

    Zwischen Schmelz-Zement-Grenze und Kaukante gemessen, an der KURVE - das ist
    die Stelle, an der zwei Nachbarn einander beruehren.
    """
    d = tooth_base_d(txt)
    breit = 0.0
    n = 80
    for i in range(n):
        y = cej + (inc - 0.5 - cej) * i / (n - 1)
        xs = roots.crossings_at(d, y)
        if len(xs) >= 2:
            breit = max(breit, xs[-1] - xs[0])
    return breit * PX_PER_UNIT if breit else None


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


# Ebenen, die ueber die Kontur hinausragen DUERFEN, weil sie nicht zum Zahn
# gehoeren: Knochen und Zahnfleisch reichen zu den Nachbarn, ein Verbinder und
# ein Steg spannen ueber die Luecke, Zyste, Granulom und Abszess liegen im
# Knochen, die Lockerungspfeile stehen neben dem Zahn, und das Implantatzubehoer
# sitzt auf ihm statt in ihm.
DARF_HINAUS = re.compile(
    r'bridge-connector|prosthesis-connector|implant-bar|gum-base|bone-base'
    r'|gum-line|prosthesis-implant-gum|implant-connector|implant-locator-screw'
    r'|implant-healing-abutment-connector'
    r'|abscess|cysta|granuloma|peri-implant|parodontal|calculus|denture'
    r'|mobility|arrow|contact-point|crown-leakage')

# Wie weit eine Ebene ueber die Kontur hinausstehen darf.
#
# NICHT geraten, sondern an der Verteilung abgelesen: ueber alle 4294 Ebenen
# des ausgelieferten Satzes liegt der Median bei -0,64 (also innerhalb), 99 %
# liegen unter 1,59 - und darueber klafft eine Luecke bis zu einem Haufen von
# gut zwei Dutzend Ebenen zwischen 3 und 9,6. Der Grenzwert liegt in dieser
# Luecke. Null waere falsch: Umriss und Ebene entstehen unterschiedlich (der
# eine wird EINGESETZT, die andere gewarpt), eine Strichstaerke Spiel ist
# normal.
TOL_INNERHALB = 3.0

# WAS HEUTE SCHON NEBEN DEM ZAHN STEHT.
#
# Die Pruefung faengt den Fall, sie behebt ihn nicht - und ein Vertrag, der von
# Anfang an rot ist, prueft nichts mehr. Also eingefroren, wie die Digests
# daneben: gemeldet wird, was NICHT in dieser Liste steht. Und ebenso gemeldet
# wird, was darin steht und inzwischen sauber ist, damit die Liste nur kuerzer
# werden kann.
#
# Die 23 Eintraege an 46 sind odontogram-8i5: dort hat der Warp eine ganze
# Ebenenfamilie um 9,3 Einheiten nach distal geschoben. Die elf Kronen dieser
# Familie sind seit der Ableitung (`kronen.py`) heraus; was bleibt, sind die
# Bruchvarianten, die Fissurenversiegelung, der Abrieb, Inlay und Veneer.
BEKANNTE_UEBERSTAENDE: set[tuple[str, str]] = {
    ("11", "endo-glass-pin"),   # 5.24
    ("11", "endo-metal-pin"),   # 5.24
    ("12", "endo-glass-pin"),   # 3.28
    ("12", "endo-metal-pin"),   # 3.28
    ("15", "endo-glass-pin"),   # 3.52
    ("15", "endo-metal-pin"),   # 3.57
    ("16", "endo-filling"),   # 8.14
    ("16", "endo-medical-filling"),   # 8.14
    ("16", "tooth-under-gum"),   # 5.63
    ("18", "tooth-under-gum"),   # 3.64
    ("44", "endo-glass-pin"),   # 4.63
    ("46", "crown-needed-path"),   # 4.78
    ("46", "crown-needed-shape"),   # 9.12
    ("46", "crown-replace-shape"),   # 9.12
    ("46", "emax-inlay"),   # 7.39
    ("46", "emax-veneer"),   # 7.98
    ("46", "fissure-sealing-occlusal"),   # 9.21
    ("46", "gold-inlay"),   # 7.39
    ("46", "gold-veneer"),   # 7.98
    ("46", "gradia-inlay"),   # 7.39
    ("46", "gradia-veneer"),   # 7.98
    ("46", "temporary-inlay"),   # 7.39
    ("46", "temporary-veneer"),   # 7.98
    ("46", "tooth-base-beauty-2"),   # 5.59
    ("46", "tooth-broken-distal"),   # 9.24
    ("46", "tooth-broken-distal-incisal"),   # 3.34
    ("46", "tooth-broken-incisal"),   # 9.26
    ("46", "tooth-broken-mesial"),   # 9.32
    ("46", "tooth-broken-mesial-distal"),   # 9.31
    ("46", "tooth-broken-mesial-distal-incisal"),   # 8.42
    ("46", "tooth-broken-mesial-incisal"),   # 9.23
    ("46", "tooth-bruxism-wear"),   # 9.29
    ("46", "zircon-inlay"),   # 7.39
    ("46", "zircon-veneer"),   # 7.98
    ("55", "endo-filling"),   # 8.54
    ("55", "endo-medical-filling"),   # 8.54
    ("55", "pulp-inflam-path-1"),   # 9.64
    ("55", "tooth-inflam-pulp-base-2"),   # 4.32
    ("83", "endo-glass-pin"),   # 3.77
    ("83", "endo-metal-pin"),   # 3.77
    ("84", "endo-resection"),   # 3.14
    ("85", "tooth-inflam-pulp-base-2"),   # 6.4
}


def _x_bereich(d: str):
    xs = []
    for cmd, a in svgpath.to_absolute(d):
        v = a if isinstance(a, (list, tuple)) else []
        for i in range(0, len(v) - 1, 2):
            xs.append(v[i])
    return (min(xs), max(xs)) if xs else None


def bleibt_im_zahn(txt: str, key: str, failures: list) -> set[tuple[str, str]]:
    """Steht eine Ebene neben dem Zahn, statt auf ihm?

    DIE PRUEFUNG, DIE GEFEHLT HAT. An 46 standen 35 Ebenen bis zu 9,4 Einheiten
    neben der Kontur - jede Kronenkappe lief bis in die Nachbarkachel hinein.
    Kein Vertrag hat es gemeldet: der Ebenenbestand war unveraendert, die Kontur
    war eine durchgehende Linie, das Lumen lag in der Wurzel, die Kauebene stand
    auf einer Hoehe. Der Schaden sass eine Ebene weiter (odontogram-8i5).

    Geprueft wird nur WAAGERECHT. Senkrecht ragt vieles zu Recht hinaus - eine
    Wurzelspitzenresektion sitzt unter dem Apex, ein Stift ragt darueber -, und
    eine Liste von Ausnahmen, die laenger ist als die Regel, prueft nichts mehr.

    Gibt zurueck, welche bekannten Ueberstaende hier wirklich noch stehen.
    """
    kontur = None
    for pid in ("tooth-base", "background-cusp"):
        for pat in (r'<path[^>]*\sid="%s"[^>]*?\sd="([^"]+)"',
                    r'<path[^>]*\sd="([^"]+)"[^>]*?\sid="%s"'):
            m = re.search(pat % pid, txt)
            if m:
                kontur = _x_bereich(m.group(1))
                break
        if kontur:
            break
    if kontur is None:
        return set()
    gesehen: set[tuple[str, str]] = set()
    for m in re.finditer(r'<path\b(?:(?!/>).)*?\sid="([^"]+)"(?:(?!/>).)*?/>', txt, re.S):
        ident = m.group(1)
        if DARF_HINAUS.search(ident):
            continue
        d = re.search(r'\sd="([^"]+)"', m.group(0))
        if not d:
            continue
        b = _x_bereich(d.group(1))
        if b is None:
            continue
        ueber = max(kontur[0] - b[0], b[1] - kontur[1])
        if ueber <= TOL_INNERHALB:
            continue
        gesehen.add((key, ident))
        if (key, ident) in BEKANNTE_UEBERSTAENDE:
            continue
        failures.append(
            f"{key}: {ident} steht {ueber:.2f} Einheiten neben der Kontur; "
            f"die Ebene wurde neben den Zahn gewarpt")
    return gesehen


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

        # Die Spalte, mit der das Zahnfleisch gezeichnet wurde (`SPALTEN`), muss
        # die Spalte sein, die das Gitter dieser Position gibt - sonst verfehlt
        # die Papille das Gelenk.
        pos = position_von(key)
        soll, hat = spalten.get(pos), SPALTEN.get(pos)
        if soll is not None and hat is not None and float(hat) != soll:
            failures.append(
                f"{key}: Zahnfleisch fuer eine {hat:g} px breite Spalte gezeichnet, "
                f"steht aber in {soll:g} px; die Papille verfehlt das Gelenk")

        # Und die Hoehe, auf der das Band sitzt, muss die Zervikallinie sein,
        # die dieser Zahn wirklich hat. `redraw_plan.ZERVIKAL` ist die Tabelle,
        # aus der das Band gezeichnet wird, und sie ist eingefroren wie
        # `_KRONE`: aendert sich eine Zeichnung, ohne dass sie nachgezogen wird,
        # steht die Girlande des Nachbarn auf einer Hoehe, die es nicht mehr
        # gibt - und zwar lautlos, denn beide Baender waeren gueltiges SVG.
        soll_cej = ZERVIKAL.get(int(key))
        if soll_cej is not None and abs((inc - cej) - soll_cej) > TOL_ZERVIKAL:
            failures.append(
                f"{key}: Schmelz-Zement-Grenze steht {inc - cej:.2f} ueber der "
                f"Kaukante, ZERVIKAL sagt {soll_cej:.2f}; das Zahnfleischband "
                f"ist gegen eine Hoehe gezeichnet, die der Zahn nicht hat")

        # Spalte plus Spalt minus dem Zuschlag muss die gezeichnete Kronenbreite
        # sein. Ohne Zuschlag heisst das: die Nachbarn beruehren sich an ihren
        # Kontaktpunkten. Mit Zuschlag stehen sie um genau diesen einen Wert
        # auseinander - und weil er fuer ALLE gleich ist, hebt er sich an jedem
        # Kontakt auf und die Klasse-I-Verzahnung bleibt, wo sie ist. Was der
        # Test verhindert, ist ein je Zahn verschiedener Abstand.
        #
        # Nur fuer die BLEIBENDEN. Ein Milchzahn steht auf dem Platz seines
        # Nachfolgers - das ist das Modell, ein Milchgebiss hat keine eigenen
        # Spalten - und ist dort mal schmaler (81 misst 20,5 px in einer 24er
        # Spalte), mal breiter (85 misst 50,7 in 37). Von ihm zu verlangen, dass
        # er anstoesst, hiesse verlangen, dass er so breit ist wie sein
        # Nachfolger, und das ist er nicht.
        if hat is not None and int(key) < 50:
            krone = _kronenbreite(txt, cej, inc)
            if krone is not None and abs(krone - (hat + GRID_GAP - ZUSCHLAG)) > 1.5:
                failures.append(
                    f"{key}: Krone {krone:.1f} px breit, Spalte plus Spalt minus "
                    f"Zuschlag aber {hat + GRID_GAP - ZUSCHLAG:.1f} px; dieser Zahn "
                    f"steht anders zu seinen Nachbarn als alle uebrigen")

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

    # Wo eine Zeichnung "mesial" oder "m" anschreibt, wird sie GELESEN.
    #
    # Die Kette setzt voraus, dass mesial in jeder Zeichnung rechts liegt - wie
    # im Spender. Steht es links, muss zusaetzlich waagerecht gespiegelt werden,
    # sonst zeichnet das Odontogramm mesial nach distal. Genau dieser Fall hat
    # einen halben Tag gekostet, weil er aus der Ankerkonvention ERSCHLOSSEN
    # statt abgelesen wurde.
    beschriftet = 0
    for key in PLAN:
        seite = mesial_aus_zeichnung(key)
        if seite is None:
            continue
        beschriftet += 1
        if seite != "rechts":
            failures.append(
                f"{key}: die Zeichnung schreibt mesial LINKS an, die Kette setzt "
                f"rechts voraus; ohne waagerechte Spiegelung wird mesial nach "
                f"distal gezeichnet")
    print(f"\nZeichnungen mit mesial-Beschriftung: {beschriftet} von {len(PLAN)}"
          + ("" if beschriftet == len(PLAN) else "  (die uebrigen werden angenommen)"))

    # Bead odontogram-5hm/-8i5: bleibt jede Ebene INNERHALB des Zahns?
    innen_geprueft = 0
    noch_da: set[tuple[str, str]] = set()
    for datei in sorted(ASSETS.glob("*.svg")):
        noch_da |= bleibt_im_zahn(datei.read_text(), datei.stem, failures)
        innen_geprueft += 1
    behoben = BEKANNTE_UEBERSTAENDE - noch_da
    print(f"\nAuf Ueberstand geprueft: {innen_geprueft} Vorlagen, "
          f"{len(noch_da)} von {len(BEKANNTE_UEBERSTAENDE)} bekannten stehen noch")
    for key, ident in sorted(behoben):
        failures.append(
            f"{key}: {ident} steht NICHT mehr neben der Kontur - aus "
            f"BEKANNTE_UEBERSTAENDE streichen, sonst deckt die Liste einen "
            f"kuenftigen Fehler zu")

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
