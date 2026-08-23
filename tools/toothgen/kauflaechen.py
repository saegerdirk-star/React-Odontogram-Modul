# Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
# Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
# Dirk Saeger, Malte Sussdorff 2026

"""Fuellflaechen in der Kauflaechenansicht - fuenf Flaechen statt drei.

Andere Konstruktion als in der Seitenansicht, weil die Ansicht eine andere
Frage stellt. Von der Seite sieht man den Zahn DURCH, also sind mesial und
distal Kaesten und die Kaufllaeche ein Boden. Von oben sieht man die Flaechen
NEBENEINANDER: mesial, distal, bukkal und lingual liegen als Baender am Rand,
und die okklusale Fuellung liegt in der Mitte - entlang der Fissuren, denn dort
verlaeuft die Praeparationsgrenze.

ALLES WIRD AUS DEM TEMPLATE GELESEN, nicht aus der Zeichnung: der Umriss steht
dort als `background-cusp`, und Dirks Fissuren hat `redraw_occl` schon
eingesetzt. Damit entfaellt die Abbildung Zeichnung -> Template samt ihrer
Fehlerquellen. Die vier Himmelsrichtungen kommen ebenfalls aus dem Template,
gemessen an den anatomisch benannten `filling-composite-*`-Ebenen: in allen
vierzehn liegt mesial rechts, distal links, bukkal oben, lingual unten.

DIE FISSUR WIRD NUR NACH MESIAL UND DISTAL VERLAENGERT. Eine okklusale Fuellung
laeuft der Zentralfissur nach bis an die Randleisten - deshalb muss sie die
mesiale und die distale Flaeche beruehren, sonst zerfaellt mo in zwei Inseln.
Nach bukkal und lingual laeuft sie NICHT: dort liegen die Hoecker, und eine
Fissur, die bis an den bukkalen Rand verlaengert wird, machte aus jeder
okklusalen Fuellung eine, die alles umfasst. Welche Verlaengerung wohin zeigt,
entscheidet die gemessene Richtung und keine Annahme.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fuellflaechen_einsetzen as fe   # noqa: E402
import hoecker                         # noqa: E402
import redraw                          # noqa: E402
import redraw_plan as rp               # noqa: E402

# Breite der Randbaender, Anteil der halben Zahnausdehnung in ihrer Richtung.
BAND = 0.22
# Halbe Breite des Fissurenbandes, in Zeicheneinheiten.
FISSUR = 1.5
# Groesster Zwickel, der einem Randband zugeschlagen wird, Anteil der Kauflaeche.
MAX_ZWICKEL = 0.03

# Wie weit ein Sektor um seine Richtung reicht (Grad).
SEKTOR = 52.0

FLAECHEN = ("mesial", "distal", "buccal", "lingual")

# Der Kauflaechen-Veneer: NUR der Rand nach vestibulaer (Dirk, 23.08.2026,
# "bei der Draufsicht nur den Rand nach vestibulaer"). Von oben gesehen ist das
# genau das bukkale Randband der Kautafel - dieselbe Maske, die `gebiete` ohnehin
# fuer die bukkale Fuellflaeche liefert.
VENEER = tuple(f"{m}-veneer" for m in ("emax", "gold", "gradia", "zircon", "temporary"))


def _teile(d: str) -> list[np.ndarray]:
    """Einen Pfad in seine Teilzuege zerlegen - `M` trennt sie."""
    aus = []
    for stueck in re.split(r"(?=[Mm])", d):
        if not stueck.strip():
            continue
        P = redraw.polygon(stueck)
        if len(P) > 1:
            aus.append(P)
    return aus


def lies(ziel: str):
    """Umriss, Fissurenzuege und die vier Richtungen - alles aus dem Template."""
    txt = (fe.TEMPLATES / f"{ziel}.svg").read_text()
    m = re.search(r'<(?:path|polygon)\b(?:(?!/>).)*?id="background-cusp"(?:(?!/>).)*?/>',
                  txt, re.S)
    umriss = redraw.polygon(re.search(r'\sd="([^"]+)"', m.group(0)).group(1))

    g = re.search(r'<g[^>]*id="fissure"[^>]*>(.*?)</g>', txt, re.S)
    fissuren: list[np.ndarray] = []
    for d in re.findall(r'\sd="([^"]+)"', g.group(1)):
        for P in _teile(d):
            if len(P) > 4 and P[:, 0].min() > -50:      # die -99 sind geleerte Ebenen
                fissuren.append(P)

    # Die Mitte ist die Mitte des UMSCHLIESSENDEN RECHTECKS, nicht der
    # Punktschwerpunkt: der Umriss ist ungleich dicht abgetastet und zieht den
    # Schwerpunkt um bis zu 1,3 Einheiten zur Seite - und damit alle vier
    # Sektoren mit.
    c = np.array([(umriss[:, 0].min() + umriss[:, 0].max()) / 2.0,
                  (umriss[:, 1].min() + umriss[:, 1].max()) / 2.0])
    richtung = _richtungen(ziel)
    return umriss, fissuren, richtung, c


def _richtungen(ziel: str) -> dict[str, np.ndarray]:
    """Die vier Himmelsrichtungen - aus der Konvention, nicht aus der Geometrie.

    Bis 18.08.2026 wurden sie an den anatomisch benannten
    `filling-composite-*`-Ebenen des Templates GEMESSEN. Das war doppelt falsch,
    und beides hat Dirk gefunden:

    Erstens liegen diese Ebenen seit dem Umbau vom 17.08. an der falschen Stelle.
    Damals wurden die Kauflaechen-ZEICHNUNGEN neu ausgerichtet (die Praemolaren
    bukkal/palatinal gespiegelt), die geerbten Fuellungsebenen aber nicht
    mitbewegt. Sie melden bukkal in allen vierzehn OBEN - fuer den Unterkiefer
    ist das die falsche Seite, und die 36 zeichnete lingual, wo bukkal befundet
    war.

    Zweitens sind es gewarpte Spenderformen, deren Schwerpunkte gar nicht in den
    Himmelsrichtungen liegen: am 16er zeigte "bukkal" auf (0,52 | -0,85) und
    "mesial" auf (0,51 | -0,86) - praktisch dieselbe Richtung. Deshalb sass das
    bukkale Band am 26er zu weit mesial.

    Es gilt, was `src/odontogram.ts` seit dem Umbau festhaelt und was aus Dirks
    Zeichnungen stammt: Oberkiefer bukkal oben, Unterkiefer bukkal unten, mesial
    bei beiden rechts. Bestaetigt an 36 und 26 im laufenden Bogen.
    """
    oben = ziel[0] in "125"                      # Oberkiefer, bleibend wie Milch
    return {
        "mesial":  np.array([1.0, 0.0]),
        "distal":  np.array([-1.0, 0.0]),
        "buccal":  np.array([0.0, -1.0 if oben else 1.0]),
        "lingual": np.array([0.0, 1.0 if oben else -1.0]),
    }


def _raster(umriss):
    x0, y0 = umriss[:, 0].min() - 2.0, umriss[:, 1].min() - 2.0
    x1, y1 = umriss[:, 0].max() + 2.0, umriss[:, 1].max() + 2.0
    A = hoecker.AUFLOESUNG
    breite = int((x1 - x0) * A) + 1
    hoehe = int((y1 - y0) * A) + 1
    innen = hoecker._fuelle_polygon(umriss, x0, y0, breite, hoehe)
    return innen, (x0, y0)


def _schrumpf(maske: np.ndarray, n: int) -> np.ndarray:
    return ~fe._weite(~maske, n)


def _loecher(maske: np.ndarray, innen: np.ndarray) -> np.ndarray:
    """Eingeschlossene freie Zellen im Zahn - von der Zahnkante nicht erreichbar.

    Geflutet wird INNERHALB des Zahns, von den freien Zellen aus, die an der
    Aussenkante liegen. Der erste Versuch flutete vom Bildrand ueber `~maske`:
    richtig gedacht, aber millionenfach Zellen ausserhalb des Zahns, und der
    Lauf stand. Der zweite flutete `innen & ~maske` ohne Startpunkt und meldete
    60 bis 76 Prozent der Zahnflaeche als Loch.
    """
    from collections import deque
    frei = innen & ~maske
    if not frei.any():
        return frei
    h, b = frei.shape
    kante = frei & ~_schrumpf(innen, 1)          # freie Zellen am Zahnrand
    gesehen = kante.copy()
    q = deque(zip(*np.nonzero(kante)))
    while q:
        cy, cx = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < b and frei[ny, nx] and not gesehen[ny, nx]:
                gesehen[ny, nx] = True
                q.append((ny, nx))
    return frei & ~gesehen


def _stuecke(maske: np.ndarray):
    """Die zusammenhaengenden Teile einer Maske, einzeln."""
    from collections import deque
    gesehen = np.zeros(maske.shape, dtype=bool)
    for y, x in zip(*np.nonzero(maske)):
        if gesehen[y, x]:
            continue
        teil = np.zeros(maske.shape, dtype=bool)
        q = deque([(y, x)])
        gesehen[y, x] = teil[y, x] = True
        while q:
            cy, cx = q.popleft()
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < maske.shape[0] and 0 <= nx < maske.shape[1] \
                        and maske[ny, nx] and not gesehen[ny, nx]:
                    gesehen[ny, nx] = teil[ny, nx] = True
                    q.append((ny, nx))
        yield teil


def _nur_groesste(maske: np.ndarray) -> np.ndarray:
    """Splitter wegwerfen, die beim Beschneiden am Randband abfallen.

    Eine Fissur, die schraeg in ein Randband laeuft, laesst dort ein paar Zellen
    stehen, wenn das Band sie abschneidet. Das ist kein Befund, sondern ein Rest
    der Konstruktion - am oberen Vierer war er als Fleck zu sehen. Behalten wird
    alles, was mindestens ein Zehntel des groessten Stuecks misst; ein
    Fissurenast darf ruhig klein sein, ein Splitter von fuenf Zellen nicht.
    """
    from collections import deque
    marke = np.zeros(maske.shape, dtype=np.int32)
    stuecke: list[tuple[int, int]] = []
    nr = 0
    for y, x in zip(*np.nonzero(maske)):
        if marke[y, x]:
            continue
        nr += 1
        n = 0
        q = deque([(y, x)])
        marke[y, x] = nr
        while q:
            cy, cx = q.popleft()
            n += 1
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < maske.shape[0] and 0 <= nx < maske.shape[1] \
                        and maske[ny, nx] and not marke[ny, nx]:
                    marke[ny, nx] = nr
                    q.append((ny, nx))
        stuecke.append((nr, n))
    if not stuecke:
        return maske
    gross = max(n for _, n in stuecke)
    behalten = {k for k, n in stuecke if n >= gross * 0.10}
    return np.isin(marke, list(behalten))


def gebiete(ziel: str) -> dict[str, np.ndarray]:
    umriss, fissuren, richtung, c = lies(ziel)
    innen, (x0, y0) = _raster(umriss)
    A = hoecker.AUFLOESUNG
    hoehe, breite = innen.shape
    yy, xx = np.mgrid[0:hoehe, 0:breite]
    px = x0 + xx / A
    py = y0 + yy / A

    aus: dict[str, np.ndarray] = {}

    # Randbaender: der Saum des Zahns, in Sektoren um die vier Richtungen.
    spanne = {f: float(np.max(np.abs((umriss - c) @ richtung[f]))) for f in FLAECHEN}
    kos = np.cos(np.radians(SEKTOR))
    laenge = np.hypot(px - c[0], py - c[1]) + 1e-12
    for f in FLAECHEN:
        tief = max(2, int(BAND * spanne[f] * A))
        saum = innen & ~_schrumpf(innen, tief)
        r = richtung[f]
        sektor = ((px - c[0]) * r[0] + (py - c[1]) * r[1]) / laenge >= kos
        aus[f] = saum & sektor

    # Okklusal: das Band um die Fissuren, nach mesial und distal verlaengert -
    # aber INNERHALB der Randbaender gehalten. Ohne diese Begrenzung liefe schon
    # eine reine okklusale Fuellung bis an die Approximalraender, und die
    # Kauflaechenansicht erzaehlte etwas anderes als die Seitenansicht, wo die
    # Randleiste ausdruecklich dem Approximalkasten gehoert. Die Ueberlappung am
    # Schluss stellt den Anschluss wieder her: mo und mod haengen zusammen, o
    # allein bleibt in der Mitte.
    # Verlaengert wird in ALLE Richtungen. Bis 18.08.2026 nur nach mesial und
    # distal, aus Sorge, eine okklusale Fuellung koennte sonst nach allen Seiten
    # ausufern. Gemessen war die Sorge kleiner als gedacht - das Band wird
    # ohnehin an den Randbaendern beschnitten und reicht nie bis an den Umriss -,
    # und der Preis war hoch: an fuenf Zaehnen (14 bukkal, 44/47/84/85 lingual)
    # zerfiel eine bo- oder lo-Fuellung in zwei Inseln, weil dort kein
    # gezeichneter Sulcus weit genug nach aussen laeuft. Dirk hat sich am
    # 18.08.2026 dafuer entschieden, lieber ueberall anzuschliessen.
    hilfs = hoecker.verlaengere(fissuren, umriss)
    rand = aus["mesial"] | aus["distal"] | aus["buccal"] | aus["lingual"]
    if not fissuren:
        # FRONTZAHN. Seine Draufsicht hat keine Fissur, der die Flaeche folgen
        # koennte - also ist die inzisale Flaeche schlicht das Feld zwischen den
        # vier Randbaendern. Kein Sonderfall, sondern derselbe Aufbau ohne die
        # Linie in der Mitte.
        aus["occlusal"] = fe._weite(innen & ~rand, fe.UEBERLAPP * 3) & innen
        return aus, (x0, y0)
    voll = np.ones_like(innen)
    hoecker._zeichne_linien(voll, fissuren + hilfs, x0, y0)
    linie = ~voll
    band = fe._weite(linie, max(2, int(FISSUR * A))) & innen
    aus["occlusal"] = fe._weite(band & innen & ~rand, fe.UEBERLAPP * 3) & innen & (band | ~rand)
    aus["occlusal"] = _nur_groesste(aus["occlusal"])

    # Eingeschlossene Zwickel zwischen einem Randband und dem Fissurenband
    # schlagen dem BAND zu. Dirk, 18.08.2026: "Hier sind weisse Flecken zwischen
    # der distalen Kante und der okklusalen Flaeche. Die koennen gern mit
    # eingefaerbt sein." Sie entstehen, wo ein Fissurenast schraeg in das Band
    # laeuft und dort beschnitten wird - kein Befund, sondern eine ausgefranste
    # Innenkante. Dem Band zugeschlagen und nicht der Kauflaeche, damit eine
    # einzelne d-Fuellung eine glatte Kante bekommt statt eines Zipfels.
    # NUR KLEINE Zwickel. Ohne Schranke verschluckt die Fuellung ganze Hoecker:
    # sobald das Fissurenband und ein Randband einen Hoecker einschliessen, ist
    # der formal ein Loch. Gemessen kam die linguale Flaeche so auf 29 bis 38
    # Prozent gegen 12 bis 20 bukkal - ein Drittel des Zahns, das niemand
    # befundet hat. Alles ueber der Schranke bleibt stehen und wird gemeldet.
    zelle = 1.0 / (A * A)
    kau = innen.sum() * zelle
    for f in FLAECHEN:
        loch = _loecher(aus[f] | aus["occlusal"], innen)
        if not loch.any():
            continue
        for teil in _stuecke(loch):
            if teil.sum() * zelle <= MAX_ZWICKEL * kau:
                aus[f] = aus[f] | teil
            else:
                print(f"  {ziel}: {f} laesst ein Gebiet von "
                      f"{100 * teil.sum() * zelle / kau:.1f}% stehen", file=sys.stderr)
    return aus, (x0, y0)


if __name__ == "__main__":
    for ziel in (sys.argv[1:] or list(rp.PLAN_OCCL)):
        g, _ = gebiete(ziel)
        ges = sum(v.sum() for v in g.values())
        print(f"{ziel:10s} " + "  ".join(f"{k[:4]} {100*v.sum()/max(ges,1):4.0f}%"
                                         for k, v in g.items()))


def einsetzen(ziel: str) -> dict[str, int]:
    """Die fuenf Flaechen in das Kauflaechen-Template schreiben.

    Wie in der Seitenansicht: Fuellungen, Sekundaerkaries und Defekt werden
    ERSETZT, die Karies wird in das neue Gebiet GEZOGEN. In den
    Kauflaechenvorlagen ist die Kariesebene mal eine Gruppe und mal ein
    einzelner Pfad - gezaehlt 42 gegen 28 -, gezogen wird sie in beiden Faellen.
    """
    g, ursprung = gebiete(ziel)
    datei = fe.TEMPLATES / f"{ziel}.svg"
    txt = datei.read_text()
    gezaehlt: dict[str, int] = {}
    bukkal_d: str | None = None
    for flaeche, maske in g.items():
        teile = fe.polygone(ziel, maske, ursprung)
        P = teile[0] if teile else np.zeros((0, 2))
        neu_d = fe._d_teile(teile)
        if flaeche == "buccal":
            bukkal_d = neu_d          # das vestibulaere Randband, fuers Veneer
        n = 0
        for vorsatz in fe.EINZELN:
            ident = vorsatz + flaeche
            m = re.search(r'<(?:path|polygon)\b(?:(?!/>).)*?id="' + ident
                          + r'"(?:(?!/>).)*?/>', txt, re.S)
            if not m:
                continue
            alt = m.group(0)
            if ' d="' in alt:
                ersetzt = re.sub(r'\sd="[^"]*"', ' d="' + neu_d + '"', alt, count=1)
            elif ' points="' in alt:
                ersetzt = re.sub(r'\spoints="[^"]*"',
                                 ' points="' + fe._points(P) + '"', alt, count=1)
            else:
                continue
            txt = txt.replace(alt, ersetzt, 1)
            n += 1
        ident = "caries-" + flaeche
        grp = re.search(r'(<g[^>]*id="' + ident + r'"[^>]*>)(.*?)(</g>)', txt, re.S)
        if grp:
            innen = grp.group(2)
            ds = re.findall(r'\sd="([^"]+)"', innen)
            if ds:
                alle = np.vstack([redraw.polygon(x) for x in ds])
                neu = innen
                for x in ds:
                    neu = neu.replace(f'd="{x}"', f'd="{fe._affin(x, alle, P)}"', 1)
                txt = txt.replace(grp.group(0), grp.group(1) + neu + grp.group(3), 1)
                n += 1
        else:
            m = re.search(r'<(?:path|polygon)\b(?:(?!/>).)*?id="' + ident
                          + r'"(?:(?!/>).)*?/>', txt, re.S)
            if m and ' d="' in m.group(0):
                alt = m.group(0)
                d = re.search(r'\sd="([^"]+)"', alt).group(1)
                gezogen = fe._affin(d, redraw.polygon(d), P)
                txt = txt.replace(alt, alt.replace(f'd="{d}"', f'd="{gezogen}"'), 1)
                n += 1
        gezaehlt[flaeche] = n
    # Das Veneer bekommt das bukkale Randband - nur der Rand nach vestibulaer.
    txt, gezaehlt["veneer"] = _veneer_schreiben(txt, bukkal_d)
    datei.write_text(txt)
    return gezaehlt


def _veneer_schreiben(txt: str, bukkal_d: str | None) -> tuple[str, int]:
    """Das bukkale Randband in alle Veneer-Ebenen schreiben."""
    nv = 0
    if not bukkal_d:
        return txt, 0
    for ident in VENEER:
        m = re.search(r'<(?:path|polygon)\b(?:(?!/>).)*?id="' + ident
                      + r'"(?:(?!/>).)*?/>', txt, re.S)
        if not m or ' d="' not in m.group(0):
            continue
        alt = m.group(0)
        txt = txt.replace(alt, re.sub(r'\sd="[^"]*"', ' d="' + bukkal_d + '"',
                                      alt, count=1), 1)
        nv += 1
    return txt, nv


def veneer_einsetzen(ziel: str) -> int:
    """NUR die Veneer-Ebene der Kauflaeche schreiben - das bukkale Randband -,
    ohne die Fuellflaechen anzufassen.

    Die Rasterableitung der Fuellflaechen ist nicht bit-reproduzierbar (0,02
    Einheiten Drift); ein voller `einsetzen`-Lauf schriebe sie mit Rauschen neu.
    Fuer den Veneer-Rollout wird deshalb nur die bukkale Maske gebraucht.
    """
    g, ursprung = gebiete(ziel)
    maske = g.get("buccal")
    if maske is None or not maske.any():
        return 0
    teile = fe.polygone(ziel, maske, ursprung)
    if not teile:
        return 0
    datei = fe.TEMPLATES / f"{ziel}.svg"
    txt, nv = _veneer_schreiben(datei.read_text(), fe._d_teile(teile))
    datei.write_text(txt)
    return nv


# Die bukkale Flaeche der SEITENANSICHT, aus der Kauflaeche projiziert.
#
# Dirk, 18.08.2026: "Kann man nicht die gleiche Breite der okklusalen Ansicht
# und die seitliche buccale Ansicht projizieren?" - Ja, und es ist die einzige
# Groesse, die beide Ansichten teilen: mesiodistal ist in der Kauflaechenansicht
# die x-Achse und in der Seitenansicht ebenso. Was die Kauflaeche NICHT hergibt,
# ist die Hoehe - von oben gesehen hat die bukkale Flaeche keine. Die bleibt
# eine Setzung und steht deshalb hier als Zahl.
#
# Bis dahin war die bukkale Flaeche der Seitenansicht das letzte Stueck, das
# noch aus dem Verschiebungsfeld kam: am 16er ein Fleck von 13 x 3,5 Einheiten
# in einer Krone von 36 x 28. Dirk: "Die Seitenansicht der buccalen Fuellung ist
# viel zu klein."
BUKKAL_OBEN = 0.36      # Anteil der Kronenhoehe unter der Kaukante
BUKKAL_UNTEN = 0.74     # ... bis hierhin


def bukkal_breite(zahn: str) -> tuple[float, float]:
    """Mesiodistale Ausdehnung der bukkalen Flaeche, als Anteil der Zahnbreite."""
    txt = (fe.TEMPLATES / f"{zahn}_occl.svg").read_text()

    def form(ident):
        m = re.search(r'<(?:path|polygon)\b(?:(?!/>).)*?id="' + ident
                      + r'"(?:(?!/>).)*?/>', txt, re.S)
        return redraw.polygon(re.search(r'\sd="([^"]+)"', m.group(0)).group(1))

    um = form("background-cusp")
    B = form("filling-composite-buccal")
    x0, x1 = um[:, 0].min(), um[:, 0].max()
    return ((B[:, 0].min() - x0) / (x1 - x0), (B[:, 0].max() - x0) / (x1 - x0))


def bukkal_seitenansicht(zahn: str) -> np.ndarray:
    """Die bukkale Flaeche in der Seitenansicht - Breite projiziert, Hoehe gesetzt."""
    import fuellflaechen as ff
    a, b = bukkal_breite(zahn)
    um, szg, occl, d, krone = ff.masse(zahn)
    ch = abs(occl - szg)
    x0, x1 = krone[:, 0].min(), krone[:, 0].max()
    xa, xb = x0 + a * (x1 - x0), x0 + b * (x1 - x0)
    # Von der Kaukante WEG nach zervikal, also gegen `d` - `d` zeigt von der
    # Zahnhalslinie zur Kaukante. Mit dem falschen Vorzeichen liegt das Band
    # ausserhalb des Zahns und der Zug bleibt leer.
    y_oben = occl - d * BUKKAL_OBEN * ch
    y_unten = occl - d * BUKKAL_UNTEN * ch
    lo, hi = min(y_oben, y_unten), max(y_oben, y_unten)
    schritt = max(0.2, ch / 24.0)
    band = max(0.4, ch / 60.0)
    oben, unten = [], []
    for y in np.arange(lo, hi + schritt * 0.5, schritt):
        nah = um[np.abs(um[:, 1] - y) < band]
        if len(nah) == 0:
            continue
        # an den Umriss anschmiegen, damit die Flaeche nicht herausragt
        li = max(float(nah[:, 0].min()), min(xa, xb))
        re_ = min(float(nah[:, 0].max()), max(xa, xb))
        if re_ <= li:
            continue
        oben.append((re_, float(y)))
        unten.append((li, float(y)))
    return np.array(oben + unten[::-1], dtype=float)


def bukkal_einsetzen(zahn: str) -> int:
    """Die projizierte bukkale Flaeche in die SEITENANSICHT schreiben.

    Nur die vierzehn Seitenzaehne - die zwoelf Frontzaehne haben keine
    Kauflaechenansicht, aus der sich eine Breite projizieren liesse, und ihre
    labiale Flaeche ist ohnehin eine andere Frage.
    """
    P = fe.nach_template(zahn, bukkal_seitenansicht(zahn))
    datei = fe.TEMPLATES / f"{zahn}.svg"
    txt = datei.read_text()
    n = 0
    for vorsatz in fe.EINZELN:
        ident = vorsatz + "buccal"
        m = re.search(r'<(?:path|polygon)\b(?:(?!/>).)*?id="' + ident
                      + r'"(?:(?!/>).)*?/>', txt, re.S)
        if not m:
            continue
        alt = m.group(0)
        if ' d="' in alt:
            ersetzt = re.sub(r'\sd="[^"]*"', ' d="' + fe._d(P) + '"', alt, count=1)
        elif ' points="' in alt:
            ersetzt = re.sub(r'\spoints="[^"]*"', ' points="' + fe._points(P) + '"',
                             alt, count=1)
        else:
            continue
        txt = txt.replace(alt, ersetzt, 1)
        n += 1
    grp = re.search(r'(<g[^>]*id="caries-buccal"[^>]*>)(.*?)(</g>)', txt, re.S)
    if grp:
        innen = grp.group(2)
        ds = re.findall(r'\sd="([^"]+)"', innen)
        if ds:
            alle = np.vstack([redraw.polygon(x) for x in ds])
            neu = innen
            for x in ds:
                neu = neu.replace(f'd="{x}"', f'd="{fe._affin(x, alle, P)}"', 1)
            txt = txt.replace(grp.group(0), grp.group(1) + neu + grp.group(3), 1)
            n += 1
    else:
        m = re.search(r'<(?:path|polygon)\b(?:(?!/>).)*?id="caries-buccal"(?:(?!/>).)*?/>',
                      txt, re.S)
        if m and ' d="' in m.group(0):
            alt = m.group(0)
            d = re.search(r'\sd="([^"]+)"', alt).group(1)
            txt = txt.replace(alt, alt.replace(f'd="{d}"',
                                               f'd="{fe._affin(d, redraw.polygon(d), P)}"'), 1)
            n += 1
    datei.write_text(txt)
    return n
