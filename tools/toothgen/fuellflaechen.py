# Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
# Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
# Dirk Saeger, Malte Sussdorff 2026

"""Approximal- und Kaukasten in der Seitenansicht - abgeleitet statt gezeichnet.

Dirk, 18.08.2026: "Nach dem Muster von 46 muesstest du in der Lage sein, bei
allen anderen Templates die distale und mesiale Flaeche als Pfad einzuzeichnen
und die Flaechen abzuleiten. Dann muss ich sie nicht selbst zeichnen."

WAS ABGELEITET WIRD UND WAS NICHT. Nur die SEITENZAEHNE. Am Molaren und
Praemolaren ist der Kasten eine Regel: die Axialwand laeuft dem Umriss in
festem Abstand nach, der Kasten reicht von knapp ueber der Schmelz-Zement-
Grenze bis an die Kaukante, und der Kaukasten haengt zwischen den beiden
Axialwaenden. Am FRONTZAHN gilt das nicht - dort begrenzen Gingivarand und
Inzisalkante, und die Fuellung schneidet die Schneidekante meist NICHT durch.
Die Regel dafuer ist nicht gemessen, also wird sie hier nicht angewandt.

DIE GRENZFRAGE, an der die ganze Konstruktion haengt (siehe `hoecker.py` fuer
die Zerlegung selbst): wem gehoert die Randleiste? Sie gehoert dem
APPROXIMALKASTEN. Deshalb laeuft die mesiale und die distale Linie oben
senkrecht bis an die KAUKANTE und nicht schraeg zur Ecke aus. Nur so fallen
alle sechs Befunde aus drei festen Formen richtig heraus: o laesst beide
Randleisten stehen, mo nur die distale, od nur die mesiale, mod keine. Liefe
die Kaulinie von Randleiste zu Randleiste, saehe mo aus wie mod - Dirks
Einwand vom 18.08.2026, und der Grund fuer diese Fassung.

Die Masse kommen aus der 46, der einzigen von Hand gezeichneten und von Dirk
geprueften. Gemessen wurde der Abstand der Wand zum Umriss ueber die Hoehe,
nicht die Wandlage zum weitesten Punkt: das erste ist die Groesse, aus der man
konstruiert, das zweite nur ihr Ergebnis an einer Stelle.

    Wandabstand   mesial 14,0..19,0 %, distal 8,6..14,9 % der Kronenbreite
    Kastenende    mesial 18 %, distal 22 % der Kronenhoehe ueber der SZG
    Kastenboden   38,6 % der Kronenhoehe unter der Kaukante

Dirk, 18.08.2026: "Mach mesial und distal symmetrisch." Also EIN Wert je
Groesse statt der Asymmetrie seiner Handzeichnung - die ist Hand und nicht
Absicht.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import redraw            # noqa: E402
import redraw_apply as ra  # noqa: E402

ZEICHNUNGEN = ra.ZEICHNUNGEN
EBENE_GEZEICHNET = "3 HIER ZEICHNEN"
EBENE_ABGELEITET = "4 FUELLFLAECHEN (abgeleitet)"

# Anteil der Kronenbreite, den die Axialwand vom Umriss einwaerts liegt.
WAND = 0.16
# Anteil der Kronenhoehe, um den das zervikale Kastenende ueber der SZG bleibt.
GINGIVAL = 0.20
# Anteil der Kronenhoehe, in dem die Wand senkrecht auf die Kaukante zulaeuft.
WENDE = 0.20
# Anteil der Kronenhoehe, in dem der Kaukasten seinen Boden hat.
BODEN = 0.39
# Frontzahn: Breite des Schneidekantenstreifens, Anteil der Kronenhoehe.
STREIFEN = 0.12

STIL = ("fill:none;stroke:#000000;stroke-width:1px;stroke-linecap:butt;"
        "stroke-linejoin:miter;stroke-opacity:1")

# Seitenzaehne: Praemolaren, Molaren, Milchmolaren. Die Frontzaehne fehlen
# absichtlich - siehe Modulkopf.
SEITENZAEHNE = ["14", "15", "16", "17", "18", "44", "45", "46", "47", "48",
                "54", "55", "84", "85"]

# Frontzaehne. Dirk, 18.08.2026: "An den Frontzaehnen gibt es kein okklusal.
# Stattdessen gibt es incisal. [...] Sobald die Schneidekante, die Incisalkante
# betroffen ist, muss ein Streifen dieser Kante gekennzeichnet werden. Der muss
# caudal der Incisalkante liegen, sollte nicht sehr breit sein und bei einer
# distal-buccal-lingual-incisal Fuellung oder Karies in dem Fall bis auf die
# mesiale Seite alles markieren."
#
# Daraus folgt der EINE Unterschied zur Seitenzahn-Konstruktion, und er sitzt
# genau an der Stelle, an der beim Seitenzahn die Randleiste vergeben wurde:
# dort gehoert die Randleiste dem Approximalkasten, hier gehoert die
# Schneidekante ihrem EIGENEN Streifen. Also laeuft die dritte Linie von Umriss
# zu Umriss statt von Wand zu Wand, und die Approximalwaende enden an ihr statt
# an der Kante. Damit bleibt die Schneidekante bei einer reinen m- oder
# d-Fuellung unmarkiert, und d+b+l+i markiert alles ausser mesial - beides so,
# wie er es beschrieben hat.
FRONTZAEHNE = ["11", "12", "13", "41", "42", "43",
               "51", "52", "53", "81", "82", "83"]


def _ebene(txt: str, label: str) -> str | None:
    m = re.search(r'<g[^>]*label="' + re.escape(label) + r'"[^>]*>(.*?)</g>', txt, re.S)
    return m.group(1) if m else None


def _slot(label: str) -> str | None:
    """Welchen der drei Zuege eine Beschriftung meint.

    Nachsichtig gegen Schreibweise: `okklusal`/`occlusal` und `inzisal`/
    `incisal` meinen denselben Platz - am Frontzahn HEISST die Flaeche inzisal,
    die Ebene im Template heisst weiterhin `occlusal`, und Dirk schreibt an den
    Zahn, was er dort sieht. Der Tippfehler `Fuelling` an der 53 faellt unter
    dieselbe Nachsicht; seine Zeichnung deshalb anzufassen waere Laerm.
    """
    t = label.lower()
    if "mesial" in t:
        return "Füllung mesial"
    if "distal" in t:
        return "Füllung distal"
    if any(w in t for w in ("okklusal", "occlusal", "inzisal", "incisal")):
        return "Füllung okklusal"
    return None


def pfade(zahn: str, ebene: str = EBENE_GEZEICHNET) -> dict[str, str]:
    """Umriss und benannte Zuege einer Zeichenebene.

    Der UMRISS ist der groesste geschlossene Pfad der Ebene und nicht "der ohne
    Beschriftung". Am 13er lag genau dort der Fehler: Dirk hat die Inzisallinie
    ohne Label gezeichnet, und der Leser hat sie fuer den Umriss gehalten - ein
    Zahn aus 61 Punkten und sechs Einheiten Hoehe.
    """
    txt = (ZEICHNUNGEN / f"{zahn}_zeichnen.svg").read_text()
    inner = _ebene(txt, ebene)
    if inner is None:
        return {}
    kandidaten: list[tuple[str, str | None]] = []
    for m in re.finditer(r"<path\b[^>]*?/>", inner, re.S):
        t = m.group(0)
        d = re.search(r'\sd="([^"]+)"', t)
        if not d:
            continue
        lab = re.search(r'inkscape:label="([^"]*)"', t)
        kandidaten.append((d.group(1), lab.group(1) if lab else None))
    aus: dict[str, str] = {}
    geschlossen = [(d, l) for d, l in kandidaten if "z" in d.lower() and l is None]
    if geschlossen:
        d = max(geschlossen, key=lambda k: len(k[0]))[0]
        aus["Umriss"] = d
    for d, l in kandidaten:
        if l is None:
            continue
        slot = _slot(l)
        if slot:
            aus[slot] = d
    return aus


def gezeichnet(zahn: str) -> dict[str, str]:
    """Nur die von HAND gezogenen Zuege - die schlagen jede Ableitung."""
    return {k: v for k, v in pfade(zahn).items() if k != "Umriss"}


def mesial_rechts(zahn: str) -> bool:
    """Auf welcher Seite mesial liegt - abgelesen, nicht geschlossen.

    Erste Quelle ist Dirks eigene Beschriftung in der Zeichnung; die steht
    bisher nur in den acht bleibenden UK-Zeichnungen. Wo sie fehlt, wird die
    Seite an den ANATOMISCH BENANNTEN Ebenen des ausgelieferten Templates
    gemessen: `filling-composite-mesial` gegen `-distal`. Die Zeichnung geht in
    der Seitenansicht ohne x-Spiegelung ins Template (der Unterkiefer wird
    vertikal gespiegelt, das laesst x unberuehrt), also gilt dieselbe Seite.
    """
    from verify_redraw import mesial_aus_zeichnung
    seite = mesial_aus_zeichnung(zahn)
    if seite is not None:
        return seite == "rechts"
    txt = (Path(__file__).resolve().parents[2] / "src" / "assets"
           / "teeth-svgs" / f"{zahn}.svg").read_text()

    def mitte(ident: str) -> float:
        m = (re.search(r'<[^>]*id="' + ident + r'"[^>]*?\sd="([^"]+)"', txt, re.S)
             or re.search(r'<[^>]*\sd="([^"]+)"[^>]*id="' + ident + r'"', txt, re.S))
        P = redraw.polygon(m.group(1))
        return float(P[:, 0].mean())

    return mitte("filling-composite-mesial") > mitte("filling-composite-distal")


def masse(zahn: str):
    """Umriss, SZG, Kaukante und die Richtung von der SZG zur Kaukante.

    Welche Seite die Krone ist, wird GEMESSEN und nicht angenommen: die Krone
    ist die kuerzere der beiden Strecken beidseits der SZG. Bei den
    Oberkiefer-Zeichnungen liegt sie unten, bei den Unterkiefer-Zeichnungen
    oben, und beide messen dieselben 36 Prozent - das ist die Probe darauf.
    """
    um = redraw.polygon(pfade(zahn)["Umriss"])
    szg = ra.szg(zahn)
    oben, unten = szg - um[:, 1].min(), um[:, 1].max() - szg
    d = -1.0 if oben < unten else 1.0          # Richtung SZG -> Kaukante
    occl = um[:, 1].min() if d < 0 else um[:, 1].max()
    krone = um[(um[:, 1] - szg) * d >= 0]
    return um, szg, occl, d, krone


def _rand_x(um: np.ndarray, y: float, rechts: bool, band: float) -> float | None:
    b = um[np.abs(um[:, 1] - y) < band]
    if len(b) == 0:
        return None
    return float(b[:, 0].max() if rechts else b[:, 0].min())


def wand(zahn: str, mesial: bool, ende: np.ndarray | None = None) -> np.ndarray:
    """Die Axialwand einer Approximalflaeche, zervikal beginnend.

    SEITENZAHN: der Zug folgt dem Umriss in festem Abstand, bis er `WENDE`
    unter der Kaukante steht, und geht von dort SENKRECHT auf die Kaukante zu.
    Der senkrechte Schluss ist die Grenzentscheidung aus dem Modulkopf: er
    schlaegt die Randleiste dem Approximalkasten zu.

    FRONTZAHN: der Zug endet auf der Streifenlinie und geht NICHT weiter. Die
    Schneidekante gehoert dem Streifen, nicht dem Kasten.
    """
    um, szg, occl, d, krone = masse(zahn)
    bw = float(krone[:, 0].max() - krone[:, 0].min())
    ch = abs(occl - szg)
    rechts = mesial == mesial_rechts(zahn)
    ein = WAND * bw * (-1.0 if rechts else 1.0)      # einwaerts

    y_ging = szg + d * GINGIVAL * ch
    y_wende = (ende[1] if ende is not None else occl - d * WENDE * ch)
    band = max(0.4, ch / 60.0)

    zug = []
    x_ging = _rand_x(um, y_ging, rechts, band)
    if x_ging is not None:
        zug.append((x_ging, y_ging))                 # zervikal AUF dem Umriss
    for t in np.linspace(0.0, 1.0, 14):
        y = y_ging + (y_wende - y_ging) * t
        x = _rand_x(um, y, rechts, band)
        if x is not None:
            zug.append((x + ein, y))
    P = np.array(zug, dtype=float)
    if ende is not None:
        return np.vstack([P, ende])          # endet AUF dem Streifen
    # Senkrecht auf die Kaukante - der Schnitt mit dem Umriss, nicht occl selbst:
    # die Kaukante ist ueber die Hoecker keine Gerade.
    import hoecker
    tr = hoecker._schnitt_mit_umriss(P[-1], np.array([0.0, d]), um)
    if tr is not None:
        P = np.vstack([P, tr])
    return P


def kaukasten(zahn: str, mes: np.ndarray, dis: np.ndarray) -> np.ndarray:
    """Der Kastenboden zwischen den beiden Axialwaenden, leicht durchhaengend."""
    _um, szg, occl, d, _krone = masse(zahn)
    ch = abs(occl - szg)
    y = occl - d * BODEN * ch
    a = mes[int(np.argmin(np.abs(mes[:, 1] - y)))]
    b = dis[int(np.argmin(np.abs(dis[:, 1] - y)))]
    t = np.linspace(0.0, 1.0, 6)
    sag = -d * 0.04 * ch                            # Durchhang von der Kaukante weg
    return np.column_stack([a[0] + (b[0] - a[0]) * t,
                            a[1] + (b[1] - a[1]) * t + sag * np.sin(np.pi * t)])


def _drin(P: np.ndarray, um: np.ndarray) -> np.ndarray:
    """Punkt-in-Polygon ueber den Strahlensatz, zeilenweise."""
    n = len(um)
    aus = np.zeros(len(P), dtype=bool)
    for k, (px, py) in enumerate(P):
        c = False
        j = n - 1
        for i in range(n):
            xi, yi = um[i]
            xj, yj = um[j]
            if (yi > py) != (yj > py) and px < (xj - xi) * (py - yi) / (yj - yi + 1e-12) + xi:
                c = not c
            j = i
        aus[k] = c
    return aus


def _kantenlauf(um, szg, occl, d):
    """Der Umrisslauf, der die Inzisalkante IST - vom mesialen zum distalen Winkel.

    Abgegrenzt ueber die Richtung des Umrisses, nicht ueber eine Hoehe: die
    Kante laeuft flach (|dx| > |dy|), die Approximalflaechen steil. Wo es
    umschlaegt, sitzt der Inzisalwinkel - und der ist die Ecke, die wir suchen.

    Eine Hoehenschwelle taugt hier nicht, und der Eckzahn zeigt warum: seine
    Kante sind zwei Schenkel, die von der Spitze weit nach zervikal laufen. Eine
    Waagrechte in 12 Prozent Kronenhoehe schneidet davon die Spitze ab und laesst
    die Schenkel bei den Approximalflaechen - 13, 43 und 53 fielen genau so mit
    fuenf statt vier Gebieten durch.
    """
    n = len(um)
    i0 = int(np.argmin(um[:, 1]) if d < 0 else np.argmax(um[:, 1]))

    def flach(i):
        a_, b_ = um[(i - 3) % n], um[(i + 3) % n]
        return abs(b_[0] - a_[0]) > abs(b_[1] - a_[1])

    vor = i0
    while flach((vor + 1) % n) and (vor - i0) % n < n // 3:
        vor = (vor + 1) % n
    zur = i0
    while flach((zur - 1) % n) and (i0 - zur) % n < n // 3:
        zur = (zur - 1) % n
    idx = [(zur + k) % n for k in range(((vor - zur) % n) + 1)]
    return um[idx]


def _nach_innen(P: np.ndarray, um: np.ndarray, w: float) -> np.ndarray:
    """Einen Umrisslauf um `w` nach innen versetzen - entlang der Normalen.

    Entlang der Normalen und nicht senkrecht nach unten: am Eckzahn steht die
    Kante schraeg, und ein senkrechter Versatz macht aus einem gleich breiten
    Streifen einen, der zur Spitze hin ausduennt.
    """
    T = np.gradient(P, axis=0)
    N = np.column_stack([-T[:, 1], T[:, 0]])
    N = N / (np.hypot(N[:, 0], N[:, 1])[:, None] + 1e-12)
    kand = P + N * w
    if not _drin(kand[len(kand) // 2:len(kand) // 2 + 1], um)[0]:
        kand = P - N * w
    return kand


def _drin(P: np.ndarray, um: np.ndarray) -> np.ndarray:
    """Punkt-in-Polygon ueber den Strahlensatz."""
    n = len(um)
    aus = np.zeros(len(P), dtype=bool)
    for k, (px, py) in enumerate(P):
        c = False
        j = n - 1
        for i in range(n):
            xi, yi = um[i]
            xj, yj = um[j]
            if (yi > py) != (yj > py) and px < (xj - xi) * (py - yi) / (yj - yi + 1e-12) + xi:
                c = not c
            j = i
        aus[k] = c
    return aus


def schneidestreifen(zahn: str):
    """Der Streifen unter der Schneidekante, und wo die Approximalwaende enden.

    Gibt den Streifenzug zurueck und die beiden Punkte, an denen die mesiale und
    die distale Wand ihn treffen sollen. Die Waende enden AUF dem Streifen und
    nicht an der Kante: so teilen Kasten und Streifen eine Strecke statt eines
    Punktes, und ihre Vereinigung ist ein Gebiet.
    """
    um, szg, occl, d, krone = masse(zahn)
    ch = abs(occl - szg)
    w = STREIFEN * ch
    kante = _kantenlauf(um, szg, occl, d)
    innen = _nach_innen(kante, um, w)
    zug = np.vstack([kante[:1], innen, kante[-1:]])   # A -> Versatz -> B
    rechts_zuerst = kante[0, 0] > kante[-1, 0]
    mes_ende = innen[0] if (rechts_zuerst == mesial_rechts(zahn)) else innen[-1]
    dis_ende = innen[-1] if (rechts_zuerst == mesial_rechts(zahn)) else innen[0]
    return zug, mes_ende, dis_ende


def _bis_grenze(P: np.ndarray, grenze: np.ndarray, d: float) -> np.ndarray:
    """Eine Wand an ihrem ERSTEN Schnitt mit der Streifenlinie abschneiden.

    Damit endet die Wand auf der Linie, die wirklich da ist - auch wenn Dirk sie
    selbst gezogen hat und sie deshalb nicht dort verlaeuft, wo eine Ableitung
    sie hingerechnet haette. Ohne das haetten Kasten und Streifen sich verfehlt.
    """
    G = grenze[np.argsort(grenze[:, 0])]
    gy = np.interp(P[:, 0], G[:, 0], G[:, 1])
    ueber = (P[:, 1] - gy) * d > 0.0          # inzisal der Linie
    if not ueber.any():
        return P
    i = int(np.argmax(ueber))
    if i == 0:
        return P[:1]
    a, b = P[i - 1], P[i]
    ga, gb = gy[i - 1], gy[i]
    t = (ga - a[1]) / ((b[1] - a[1]) - (gb - ga) + 1e-12)
    t = float(min(max(t, 0.0), 1.0))
    return np.vstack([P[:i], a + (b - a) * t])


def _d(P: np.ndarray) -> str:
    return "M " + " L ".join(f"{x:.4f} {y:.4f}" for x, y in P)


def schreibe(zahn: str) -> dict[str, np.ndarray]:
    """Die drei Zuege erzeugen und in die ABGELEITETE Ebene schreiben.

    Sie kommen NICHT in `3 HIER ZEICHNEN`. Was dort steht, hat Dirk gezogen;
    was hier steht, hat der Generator gerechnet, und die beiden duerfen sich
    nicht verwechseln lassen. Zeichnet er einen Zahn nach, gewinnt seine Ebene
    und diese wird ignoriert - loeschen muss er nichts.
    """
    front = zahn in FRONTZAEHNE
    hand = gezeichnet(zahn)
    _um, _szg, _occl, d, _kr = masse(zahn)
    if front:
        if "Füllung okklusal" in hand:
            # Von Hand gezogen - dann endet die Ableitung dort und nicht an
            # ihrer eigenen Rechnung. Genau dafuer ist die Ebenentrennung da.
            dritte = redraw.polygon(hand["Füllung okklusal"])
            mes = _bis_grenze(wand(zahn, mesial=True, ende=np.array([0.0, _occl])), dritte, d)
            dis = _bis_grenze(wand(zahn, mesial=False, ende=np.array([0.0, _occl])), dritte, d)
        else:
            dritte, mes_ende, dis_ende = schneidestreifen(zahn)
            mes = wand(zahn, mesial=True, ende=mes_ende)
            dis = wand(zahn, mesial=False, ende=dis_ende)
    else:
        mes = wand(zahn, mesial=True)
        dis = wand(zahn, mesial=False)
        dritte = kaukasten(zahn, mes, dis)
    # Der Ebenenname bleibt `okklusal` - das ist der Schluessel im Zustand, und
    # die Anzeige sagt am Frontzahn ohnehin "I"/inzisal (surfaceLetter()).
    zuege = {"Füllung mesial": mes, "Füllung distal": dis, "Füllung okklusal": dritte}
    # Was von Hand da ist, wird NICHT abgeleitet mitgeschrieben - sonst stuende
    # dieselbe Flaeche zweimal in der Datei und man muesste wissen, welche gilt.
    zuege = {k: v for k, v in zuege.items() if k not in hand}

    datei = ZEICHNUNGEN / f"{zahn}_zeichnen.svg"
    txt = datei.read_text()
    inhalt = "\n".join(
        f'    <path style="{STIL}" d="{_d(P)}" '
        f'id="abgeleitet-{zahn}-{i}" inkscape:label="{name}" />'
        for i, (name, P) in enumerate(zuege.items()))
    ebene = (f'  <g inkscape:groupmode="layer" id="ebene-fuellflaechen-{zahn}"\n'
             f'     inkscape:label="{EBENE_ABGELEITET}">\n{inhalt}\n  </g>')

    alt = re.search(r'\n?\s*<g[^>]*label="' + re.escape(EBENE_ABGELEITET) + r'"[^>]*>.*?</g>',
                    txt, re.S)
    if alt:
        txt = txt.replace(alt.group(0), "\n" + ebene, 1)
    else:
        txt = txt.replace("</svg>", ebene + "\n</svg>", 1)
    datei.write_text(txt)
    return zuege


if __name__ == "__main__":
    ziele = sys.argv[1:] or (SEITENZAEHNE + FRONTZAEHNE)
    for z in ziele:
        zuege = schreibe(z)
        um, szg, occl, d, krone = masse(z)
        print(f"{z}: Kronenbreite {krone[:,0].max()-krone[:,0].min():6.2f}  "
              f"Kronenhoehe {abs(occl-szg):6.2f}  "
              f"mesial {'rechts' if mesial_rechts(z) else 'links'}  "
              f"Knoten {[len(P) for P in zuege.values()]}")
