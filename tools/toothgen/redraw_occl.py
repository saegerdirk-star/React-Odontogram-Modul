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
from redraw_plan import OHNE_FISSUREN, PLAN_OCCL as PLAN, SPIEGELN_OCCL  # noqa: E402

# Schmaler Rand um die zugeschnittene Kauflaeche, in Zeicheneinheiten.
RAND = 1.5

ZEICHNUNGEN = redraw_apply.ZEICHNUNGEN
ASSETS = redraw_apply.ASSETS



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


def umzeichnen(zahn: str, spender: str, ziel: str | None = None) -> str:
    txt = (ASSETS / f"{spender}.svg").read_text()
    ziel = redraw_apply.umriss_id(txt, "tooth-base")
    alt = redraw.polygon(dict(redraw_apply.elemente_von(txt, "tooth-base"))[ziel])

    # `_fissuren.svg` GEHT VOR, wenn es sie gibt.
    #
    # Dirk hat die Kauflaechen am 18.08.2026 neu gezeichnet - Umriss plus
    # Fissurenlinien, ohne die Hoeckerflaechen - und zwar in eigene Dateien.
    # Die alte `_zeichnen.svg` bleibt als Vorgeschichte liegen; sie hier weiter
    # zu lesen hiesse, die neue Zeichnung zu erzeugen und die alte
    # auszuliefern.
    # `_norm.svg` GEHT ALLEN VOR. Sie ist die von `draufsicht.py` auf die
    # Kronenbreite der Seitenansicht gezogene Fassung - noetig, weil Dirk seine
    # Frontzahn-Draufsichten direkt auf dem Seitenscan zeichnet und sie damit in
    # Scanaufloesung vorliegen (die 41 mass 261 Einheiten gegen 15,24 der
    # Seitenansicht). Ohne die Normalisierung stimmt die Breitenprojektion
    # nicht, mit der die bukkale Flaeche der Seitenansicht aus der Kauflaeche
    # kommt.
    quelle = ZEICHNUNGEN / f"{zahn}_occl_norm.svg"
    if not quelle.exists():
        quelle = ZEICHNUNGEN / f"{zahn}_occl_fissuren.svg"
    if not quelle.exists():
        quelle = ZEICHNUNGEN / f"{zahn}_occl_zeichnen.svg"
    ebene = redraw_apply._ebene(quelle.read_text(), "3 HIER ZEICHNEN")
    ds = re.findall(r'<path[^>]*\sd="([^"]+)"', ebene)
    if not ds:
        raise ValueError(f"{zahn}_occl_zeichnen.svg: nichts in der Zeichenebene")
    # Der Aussenumriss ist der laengste Pfad - die uebrigen sind Hoecker und
    # Fissuren, die INNERHALB von ihm liegen.
    umriss_d = max(ds, key=lambda d: len(redraw.polygon(d)))
    if (ziel or spender) in SPIEGELN_OCCL:
        # Die ZEICHNUNG waagerecht spiegeln, nicht das fertige Template.
        #
        # Dirks Unterkiefer-Vorlagen zeichnen LINGUAL nach oben, die Spender
        # bukkal - die Zeichnung muss also in den Rahmen des Spenders gekippt
        # werden, bevor Umriss und Fissuren eingesetzt werden. Wird stattdessen
        # das Ergebnis gespiegelt, kippen die Spender-Ebenen zur Zeichnung
        # herunter: beide stimmen dann zueinander, aber der ganze Zahn liegt
        # verkehrt im Rahmen, und die 180-Grad-Drehung des Bogens dreht ihn
        # obendrein wieder herum. Genau so kam der Unterkiefer mit bukkal nach
        # INNEN heraus.
        P = redraw.polygon(umriss_d)
        cy = float(P[:, 1].min() + P[:, 1].max()) / 2.0
        sp = lambda x, y, cy=cy: (x, 2.0 * cy - y)
        umriss_d = svgpath.warp_path_d(umriss_d, sp)
        ebene = re.sub(r'(<path[^>]*\sd=")([^"]+)(")',
                       lambda m: m.group(1) + svgpath.warp_path_d(m.group(2), sp) + m.group(3),
                       ebene)
    # `dreher` wird NICHT mehr gefragt. Es entschied ueber den Formabstand, ob
    # eine Zeichnung um 180 Grad zu drehen sei - eine Schaetzung, wo die Lage
    # inzwischen bekannt ist: der Oberkiefer liegt wie das Template, der
    # Unterkiefer ist senkrecht zu spiegeln (SPIEGELN_OCCL). Waagerecht stimmt
    # beides. Eine 180-Grad-Drehung wuerde mesial und distal mit vertauschen und
    # ist damit nie richtig.
    dr = None
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

    out = redraw_apply.verforme_je_element(txt, feld_fuer)
    # Der Umriss des MILCHZAHN-Zweiges, aus demselben Grund wie `fissure1`
    # unten. Er ist eine ZWEITE Kontur im Spender und wird vom Feld nur
    # mitgezogen: gemessen kam er dabei durchweg rund 15 % zu breit heraus
    # (an 11_occl 24,46 gegen 21,33 Einheiten), weil er als andere Form
    # startet. Eingesetzt statt gewarpt - dieselbe Regel wie ueberall hier.
    # Nicht jedes Kauflaechen-Template hat den Zweig: die Milchmolaren nehmen
    # den Molaren als Spender, und der bringt keinen mit.
    try:
        milch_id = redraw_apply.umriss_id(out, "milktooth-base")
    except ValueError:
        milch_id = ""
    if milch_id:
        out = re.sub(r'(<path[^>]*\sid="' + re.escape(milch_id) + r'"[^>]*\sd=")[^"]+(")',
                     lambda m: m.group(1) + umriss_d + m.group(2), out, count=1)
    fis = offene_pfade(ebene)
    if dr:
        fis = [svgpath.warp_path_d(d, dr) for d in fis]
    out = setze_fissuren(out, fis)

    # Den Rahmen auf die GEZEICHNETE Kauflaeche zuschneiden.
    #
    # Dirk, 17.08.2026: "So geht es nicht." - Alle Kauflaechen-Templates teilen
    # sich einen rund 79 px breiten Rahmen, egal welcher Zahn darin steht: beim
    # Praemolaren fuellt die Krone davon 35 px, beim Molaren 60. Seit die
    # Spalten aus den gezeichneten Kronenbreiten kommen (27 bis 58 px), schob
    # sich dieser Rahmen ueber beide Nachbarn, und die Kauflaechen-Reihen
    # zerfielen - dreimal hintereinander, weil ich an der Groesse geschraubt
    # habe statt am Rahmen.
    #
    # Zugeschnitten ist der Rahmen die Kauflaeche plus einem schmalen Rand,
    # womit er von selbst so breit ist wie die Spalte, in der er steht. Keine
    # Koordinate wird angefasst; das Zahnfleisch, das ueber den Rand hinaus
    # gezeichnet ist, wird dabei beschnitten - was richtig ist, denn es gehoert
    # der Spalte und setzt sich am Nachbarn fort.
    x0, y0, x1, y1 = neu[:, 0].min(), neu[:, 1].min(), neu[:, 0].max(), neu[:, 1].max()
    rand = RAND
    return re.sub(
        r'(viewBox=")[^"]*(")',
        lambda m: (f"{m.group(1)}{x0 - rand:.2f} {y0 - rand:.2f} "
                   f"{x1 - x0 + 2 * rand:.2f} {y1 - y0 + 2 * rand:.2f}{m.group(2)}"),
        out, count=1)




def offene_pfade(ebene: str) -> list[str]:
    """Die OFFENEN Pfade der Zeichenebene - Dirks Fissurenlinien.

    Seine Kauflaechen-Zeichnung enthaelt dreierlei: den Aussenumriss und die
    Hoeckerformen, beide geschlossen, und die Fissuren als offene Linien. Am
    Praemolaren ist es eine, am Molaren sind es fuenf - dieselbe Zahl, die das
    Molaren-Template traegt. Sie sind fertig gezeichnet und mussten nie
    abgeleitet werden; der Generator hat nur immer den laengsten Pfad genommen
    und den Rest verworfen (Dirk, 17.08.2026: "Ich habe doch alle Fissuren
    eingezeichnet.").
    """
    return [d for d in re.findall(r'<path[^>]*\sd="([^"]+)"', ebene)
            if not d.rstrip().lower().endswith("z")]


def setze_fissuren(txt: str, ds: list[str]) -> str:
    """Dirks Fissurenlinien EINSETZEN, in die Fissur und in die Versiegelung.

    Beide Gruppen tragen dieselbe Geometrie - die Versiegelung ist die Fissur in
    Blau und mit 2 px Strichbreite - und ihre Pfade sind ANONYM. Ihr Inhalt ist
    damit frei austauschbar, ohne einen Vertragswert zu beruehren: der
    Fingerabdruck liest id, opacity und class, und die Zahl der Elemente bleibt,
    weil alle Linien in den ERSTEN Pfad wandern (als Teilpfade, die einzeln
    gestrichen werden) und die uebrigen entarten. Dieselbe Mechanik, mit der die
    Praemolaren einen Zug lang geleert wurden.
    """
    if not ds:
        return txt
    # ABSOLUT machen, bevor sie zu einem Pfad werden.
    #
    # Inkscape schreibt jeden Pfad mit einem RELATIVEN `m` als erstem Befehl.
    # Aneinandergehaengt ist der Startpunkt jedes weiteren Teilzugs damit
    # relativ zum ENDE des vorigen - die zweite Fissur landet versetzt, die
    # dritte doppelt versetzt, und was herauskommt, hat mit der Zeichnung nichts
    # mehr zu tun. Dirk, 18.08.2026, beim Anblick des Ergebnisses: "was machst
    # du mit meinen Fissuren?"
    zusammen = " ".join(svgpath.warp_path_d(d, lambda x, y: (x, y)) for d in ds)
    # `fissure1` gehoert dem MILCHZAHN-Zweig, und der ist an den
    # Frontzahn-Draufsichten kein totes Gewicht: 51, 52, 53, 81, 82, 83 werden
    # als Milchzahn gezeichnet, also ist er genau das, was man sieht. Bis zum
    # 21.08.2026 stand er nicht in dieser Liste - die Milchfrontzaehne trugen
    # damit das gewarpte Praemolaren-Relief des Spenders statt Dirks
    # Schneidekante. Dirk hat es im Milchgebiss gesehen.
    for gid in ("fissure", "fissure-sealing-occlusal", "fissure1"):
        m = re.search(rf'(<g[^>]*\sid="{gid}"[^>]*>)(.*?)(</g>)', txt, re.S)
        if not m:
            continue
        n = [0]

        def ersetze(x):
            n[0] += 1
            return x.group(1) + (zusammen if n[0] == 1 else "M-99,-99Z") + x.group(2)

        innen = re.sub(r'(\sd=")[^"]+(")', ersetze, m.group(2))
        txt = txt[:m.start()] + m.group(1) + innen + m.group(3) + txt[m.end():]
    return txt


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


def spiegle_waagerecht(txt: str) -> str:
    """Das FERTIGE Template an der waagerechten Achse spiegeln.

    Dirk, 17.08.2026: "14, 15, 24, 25 stehen okklusal immer noch auf dem Kopf."

    Zweimal davor habe ich die ZEICHNUNG gespiegelt, und beide Male ohne
    Wirkung - aus gutem Grund: von Dirk kommen nur der Aussenumriss und die
    Fissurenlinien, das Hoeckerrelief und alle uebrigen Ebenen kommen vom
    SPENDER und werden radial auf seinen Umriss gezogen. Eine Verformung dreht
    nichts um; die vestibulaer/palatinale Lage bleibt die des Spenders, egal was
    vorher mit der Vorlage geschieht. Gespiegelt werden muss also, was am Ende
    dasteht - dort bekommen es alle Ebenen zugleich.

    Gespiegelt wird um die Mitte des viewBox, damit nichts aus dem Rahmen
    faellt. Zahnfleisch und Knochen sind zu diesem Zeitpunkt schon entleert,
    also gibt es keine Ebene, die ausgenommen werden muesste.
    """
    vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', txt).group(1).split()]
    cy = vb[1] + vb[3] / 2.0
    return redraw_apply.verforme_je_element(
        txt, lambda kette: (lambda x, y: (x, 2.0 * cy - y)))


def ohne_umgebung(txt: str) -> str:
    """Zahnfleisch und Knochen aus einer KAUFLAECHE entfernen.

    In der Seitenansicht tragen die beiden die Papille und das Knochenniveau als
    EINE Linie durch den Bogen - dort sind sie unverzichtbar. Von oben gesehen
    gibt es weder Papille noch Knochenniveau; das gelbe Feld und der rote Rand
    sind dort reine Umgebung, breiter gezeichnet als der Zahn, und haben nichts
    getan, ausser den Nachbarzahn zu verdecken.

    Nachgesehen, bevor sie fallen: beide stehen fest auf `data-active="1"`, kein
    Zustand schaltet sie, kein Befund haengt daran, und `perioGraphic.ts` wirft
    sie fuer seine Zahnreihe ausdruecklich mit derselben Begruendung weg.

    Entfernt wird der INHALT, nicht das Element: die Gruppen behalten id,
    data-active und class, nur ihre Pfade entarten zu einer Strecke weit
    ausserhalb des viewBox. Der Fingerabdruck liest id, opacity und class - er
    sieht davon nichts.
    """
    for gid in ("gum-base", "bone-base"):
        m = re.search(rf'(<g[^>]*\sid="{gid}"[^>]*>)(.*?)(</g>)', txt, re.S) \
            or re.search(rf'(<path[^>]*\sid="{gid}"[^>]*)()(/?>)', txt)
        if not m:
            continue
        innen = re.sub(r'(\sd=")[^"]+(")', lambda x: x.group(1) + "M-99,-99Z" + x.group(2),
                       m.group(0))
        txt = txt[:m.start()] + innen + txt[m.end():]
    return txt


def erzeuge(ziel: str, ordner: Path) -> str:
    zahn, spender = PLAN[ziel]
    txt = ohne_umgebung(umzeichnen(zahn, spender, ziel))
    if ziel in OHNE_FISSUREN:
        txt = leere_fissuren(txt)
    txt = txt.replace(f'data-tooth-template="{spender}"', f'data-tooth-template="{ziel}"', 1)
    # Auch im toothgen-Kopf, siehe redraw_alle. Eine Kauflaeche traegt keine
    # Zervikallinie, hier ist nur der Name zu berichtigen - und festzuhalten,
    # wessen Zeichnung eingesetzt wurde.
    txt = re.sub(rf"(<!-- toothgen:[^>]*?\btemplate=){re.escape(spender)}\b",
                 lambda m: m.group(1) + ziel, txt, count=1)
    txt = txt.replace("<!-- toothgen:", f"<!-- toothgen: drawn={zahn}", 1)
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
