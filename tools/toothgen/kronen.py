# Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
# Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
# Dirk Saeger, Malte Sussdorff 2026

"""Die Krone AUS DEM ZAHN schneiden, statt sie daneben zu zeichnen.

Dirk, 21.08.2026: *"Ich habe den Eindruck, wir muessen die Art, wie
Restaurationen gezeichnet werden, komplett ueberdenken. Wie waere es, die
normale Kronenform des Zahnes zu nutzen und einfach einzufaerben."*

WARUM. Bis hierher war jede Kronenkappe eine EIGENE Zeichnung im Spender, die
der Redraw auf Dirks Kontur verformte. Zwei Formen, die uebereinanderliegen
sollen und getrennt entstehen, koennen auseinanderlaufen - und an 46 taten sie
es: dort stand jede Kappe 9,4 Einheiten neben dem Zahn und lief bis in die
Nachbarkachel (odontogram-8i5). Eine Form, die AUS der Kontur geschnitten ist,
kann das nicht. Sie ist der Zahn.

DER SCHNITT liegt an der Schmelz-Zement-Grenze und braucht keine neue Zahl:
`redraw_plan.ZERVIKAL` haelt 26 am Bestand gemessene Hoehen, die
`verify_redraw.py` auf 0,15 Einheiten genau nachprueft. Die Kronenhoehe faellt
damit aus einer Tabelle, die es ohnehin geben muss, weil das Zahnfleischband
daran haengt - eine zweite Zahl neben ihr waere genau die Stelle, an der beide
auseinanderlaufen.

EINE ABLEITUNG AUS DEM UMRISS ALLEIN waere huebscher (der Hals ist die engste
Stelle zwischen der weitesten Kronenstelle und der Wurzel) und ist probiert
worden. Sie findet am mehrwurzeligen Zahn den APEX statt den Hals, weil die
Breite dort gegen null geht. Verworfen.

DIE KAUFLAECHENANSICHT hat keinen Hals, an dem man schneiden koennte - dort IST
die Krone der ganze Umriss der Kautafel (`background-cusp`). Also wird sie
genau der.

WAS HIER NICHT ANGEFASST WIRD: Inlay, Onlay und Veneer decken den Zahn nur
teilweise und lassen sich nicht aus seinem Umriss schneiden; beim Veneer ist
genau dieses Muster schon einmal gescheitert (siehe `veneer_aus`). Der
Brueckenverbinder steht ZWISCHEN zwei Zaehnen und gehoert keinem von beiden.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import redraw_plan as rp   # noqa: E402
import svgpath             # noqa: E402

TEMPLATES = Path(__file__).resolve().parents[2] / "src" / "assets" / "teeth-svgs"

# Die Materialien, deren Kappe die volle Krone ist. Die Liste steht hier und
# nicht in `registry/restorations.ts`, weil sie eine Aussage ueber die ASSETS
# ist: welche Ebenen es in einer Vorlage gibt. Ein Material ohne Ebene faellt
# beim Einsetzen still durch (`einsetzen` zaehlt, was es getroffen hat).
MATERIALIEN = ("emax", "gold", "gradia", "zircon", "metal", "metal-ceramic",
               "temporary")

# Volle Krone: dieselbe Form fuer alle.
VOLLE_KRONE = tuple(f"{m}-crown" for m in MATERIALIEN) + (
    "telescope-crown-outside",   # die AEUSSERE Teleskopkrone ist eine volle Krone
    "prosthesis-crown",
    "prosthesis-implant-crown",
)

# WAS SONST NOCH DIE FORM DER KRONE IST (Bead odontogram-7xl).
#
# `crown-needed-shape` und `crown-replace-shape` sind Kronen-SILHOUETTEN - die
# eine als rote Flaeche, die andere als blosse Linie. Sie stellen dieselbe Form
# dar wie die Kappe und wurden trotzdem gewarpt: an 46 stand die eine bis zu
# 9,1 Einheiten neben dem Zahn, die andere an neun Vorlagen bis 5,9. Sie kommen
# jetzt aus derselben Ableitung. Ihre Farben und ihre Strichstaerke bleiben, was
# sie waren - nur das `d` wird ersetzt.
SILHOUETTEN = ("crown-needed-shape", "crown-replace-shape")

# Die Kronenrand-Undichtigkeit sitzt AM RAND, und der Rand ist der Schnitt.
#
# Gewarpt lag sie ueberall anders: an 16 ueber die Zervikallinie gelegt (12,5
# Einheiten hoch), an 41 zehn Einheiten davon entfernt und nur 3 hoch, an 46
# fast ganz in der Krone. Ein Randbefund gehoert an den Rand, und der ist seit
# `kronen.py` eine bekannte Gerade. Sie wird deshalb als BALKEN darauf gezeichnet
# - dieselbe Ueberlegung wie bei `halsbaender.py`, das die Halsbaender rechnet
# statt sie zu verformen.
LECK = "crown-leakage"
# Wie hoch der Balken ist und wie er auf der Linie sitzt: etwas mehr nach
# koronal, denn eine Undichtigkeit zeigt sich am Kronenrand und laeuft an der
# Krone entlang, nicht in die Wurzel.
LECK_APIKAL = 0.8
LECK_KORONAL = 2.6

# Die INNERE Teleskopkrone: dieselbe Form, nach innen versetzt - der doppelte
# Umriss IST die Aussage dieser Restauration. Kein echter Parallelversatz,
# sondern eine Streckung um den Mittelpunkt der Zervikallinie: damit bleibt der
# Kronenrand stehen, wo er steht, und die Kappe wird nach koronal und seitlich
# schmaler. Bei einer Kronenbreite um 20 Einheiten liest sich das wie ein
# Teleskop; ein echter Offset waere hier Aufwand ohne sichtbaren Unterschied.
TELESKOP_INNEN = "telescope-crown-inside"
TELESKOP_VERSATZ = 1.3   # Einheiten, die die Kappe auf JEDER Seite schmaler wird

# Wie fein der Umriss abgetastet wird, bevor am Hals geschnitten wird. 0,25
# Einheiten sind gut ein Viertel der Strichstaerke - feiner bringt nur Punkte.
SCHRITT = 0.25

# Zwei Nachkommastellen. Die Kette serialisiert ohnehin bei prec=2 neu, und drei
# Stellen lassen `check_roundtrip.py` durchfallen.
PREC = 2


def _d_von(txt: str, pid: str) -> str | None:
    for pat in (r'<path[^>]*\sid="%s"[^>]*?\sd="([^"]+)"',
                r'<path[^>]*\sd="([^"]+)"[^>]*?\sid="%s"'):
        m = re.search(pat % re.escape(pid), txt)
        if m:
            return m.group(1)
    return None


def polygon(d: str, schritt: float = SCHRITT) -> list[tuple[float, float]]:
    """Der Umriss als Punktzug, in der Reihenfolge des Pfades."""
    cmds = svgpath.subdivide(svgpath.to_absolute(d), schritt)
    pts: list[tuple[float, float]] = []
    start = (0.0, 0.0)
    for cmd, a in cmds:
        if cmd == "M":
            start = (a[0], a[1])
            pts.append(start)
        elif cmd == "L":
            pts.append((a[0], a[1]))
        elif cmd == "C":
            pts.append((a[4], a[5]))
        elif cmd == "Z":
            if pts and pts[-1] != start:
                pts.append(start)
    return pts


def zervikal_y(pts, pos: int) -> float | None:
    """y der Schmelz-Zement-Grenze in Vorlagenkoordinaten.

    Die Rohvorlage steht Wurzel oben, Krone unten - die Kaukante liegt also bei
    GROESSEREM y, und `ZERVIKAL` ist die Hoehe der Zervikallinie ueber ihr.
    """
    z = rp.ZERVIKAL.get(pos)
    if z is None:
        return None
    return max(p[1] for p in pts) - float(z)


def kette(pts, y_schnitt: float) -> list[tuple[float, float]] | None:
    """Das laengste zusammenhaengende Stueck des Umrisses koronal des Schnitts.

    Zusammenhaengend, nicht "alle Punkte darueber": ein Umriss laeuft einmal
    herum, und ein Filter ueber alle Punkte wuerde Anfang und Ende des Zuges
    aneinanderkleben. Weil der Pfad geschlossen ist, kann das koronale Stueck
    ausserdem UEBER den Anfangspunkt hinweg laufen - deshalb wird der letzte
    Lauf an den ersten gehaengt, wenn beide am Rand liegen.
    """
    laeufe: list[list[tuple[float, float]]] = []
    akt: list[tuple[float, float]] = []
    for p in pts:
        if p[1] >= y_schnitt:
            akt.append(p)
        elif akt:
            laeufe.append(akt)
            akt = []
    if akt:
        if laeufe and pts and pts[0][1] >= y_schnitt:
            laeufe[0] = akt + laeufe[0]
        else:
            laeufe.append(akt)
    if not laeufe:
        return None
    k = max(laeufe, key=len)
    return k if len(k) >= 8 else None


def _f(v: float) -> str:
    s = f"{v:.{PREC}f}"
    if "." in s:
        s = s.rstrip("0").rstrip(".")
    return s or "0"


def als_d(k, y_schnitt: float, skalierung: float = 1.0) -> str:
    """Die Kette, am Hals gerade geschlossen.

    `skalierung` < 1 zieht die Kappe um den Mittelpunkt der Zervikallinie
    zusammen - das ist die innere Teleskopkrone.
    """
    a, b = k[0], k[-1]
    cx = (a[0] + b[0]) / 2.0
    if skalierung != 1.0:
        def z(p):
            return (cx + (p[0] - cx) * skalierung,
                    y_schnitt + (p[1] - y_schnitt) * skalierung)
        k = [z(p) for p in k]
        a, b = k[0], k[-1]
    teile = [f"M{_f(b[0])},{_f(y_schnitt)}", f"L{_f(a[0])},{_f(y_schnitt)}"]
    teile += [f"L{_f(p[0])},{_f(p[1])}" for p in k]
    teile.append("Z")
    return "".join(teile)


def krone(zahn: str) -> tuple[str, str] | None:
    """`(volle Krone, innere Teleskopkrone)` als Pfaddaten, oder None.

    Seitenansicht: aus `tooth-base`, am Hals geschnitten.
    Kauflaechenansicht: der Umriss der Kautafel selbst - dort gibt es keinen
    Hals, an dem man schneiden koennte, und die Krone bedeckt die ganze Tafel.
    """
    txt = (TEMPLATES / f"{zahn}.svg").read_text()
    if zahn.endswith("_occl"):
        d = _d_von(txt, "background-cusp")
        return (d, d) if d else None

    d = _d_von(txt, "tooth-base")
    if not d:
        return None
    pts = polygon(d)
    y = zervikal_y(pts, int(zahn))
    if y is None:
        return None
    k = kette(pts, y)
    if k is None:
        return None
    breite = max(p[0] for p in k) - min(p[0] for p in k)
    s = max(0.5, (breite - 2 * TELESKOP_VERSATZ) / breite) if breite > 0 else 1.0
    return als_d(k, y), als_d(k, y, s)


def leck_d(zahn: str, k) -> str | None:
    """Der Balken am Kronenrand, in den Grenzen der Krone an dieser Hoehe."""
    if zahn.endswith("_occl"):
        return None                      # eine Kautafel hat keinen Rand in dieser Ansicht
    txt = (TEMPLATES / f"{zahn}.svg").read_text()
    d = _d_von(txt, "tooth-base")
    if not d:
        return None
    pts = polygon(d)
    y = zervikal_y(pts, int(zahn))
    if y is None or not k:
        return None
    xs = [p[0] for p in k]
    x0, x1 = min(xs), max(xs)
    unten, oben = y - LECK_APIKAL, y + LECK_KORONAL
    return (f"M{_f(x0)},{_f(unten)}L{_f(x1)},{_f(unten)}"
            f"L{_f(x1)},{_f(oben)}L{_f(x0)},{_f(oben)}Z")


def txt_kette(zahn: str) -> str:
    """Der Vorlagentext - eigene Funktion nur, damit `einsetzen` ihn nicht
    zweimal von der Platte holt."""
    return (TEMPLATES / f"{zahn}.svg").read_text()


def einsetzen(zahn: str) -> dict[str, int]:
    """Die abgeleitete Krone in alle Kronenebenen einer Vorlage schreiben."""
    formen = krone(zahn)
    if formen is None:
        return {"kronen": 0}
    voll, innen = formen
    datei = TEMPLATES / f"{zahn}.svg"
    txt = datei.read_text()
    # Bead odontogram-7xl: die Silhouetten und der Randbalken kommen aus
    # derselben Ableitung.
    paare = [(i, voll) for i in VOLLE_KRONE] + [(TELESKOP_INNEN, innen)]
    paare += [(i, voll) for i in SILHOUETTEN]
    if not zahn.endswith("_occl"):
        pts = polygon(_d_von(txt_kette(zahn), "tooth-base") or "M0 0")
        y = zervikal_y(pts, int(zahn))
        kette_ = kette(pts, y) if y is not None else None
        balken = leck_d(zahn, kette_)
        if balken:
            paare.append((LECK, balken))
    n = 0
    for ident, neu in paare:
        m = re.search(r'<path\b(?:(?!/>).)*?id="' + re.escape(ident) + r'"(?:(?!/>).)*?/>',
                      txt, re.S)
        if not m:
            continue
        alt = m.group(0)
        if ' d="' not in alt:
            continue
        txt = txt.replace(alt, re.sub(r'\sd="[^"]*"', ' d="' + neu + '"', alt, count=1), 1)
        n += 1
    datei.write_text(txt)
    return {"kronen": n}


def alle() -> list[str]:
    """Jede Vorlage, die eine Krone tragen kann - Seiten- wie Kauflaechenansicht."""
    return sorted(p.stem for p in TEMPLATES.glob("*.svg"))


if __name__ == "__main__":
    for z in alle():
        print(f"  {z:10} {einsetzen(z)}")
