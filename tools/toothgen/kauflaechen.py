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
BAND = 0.30
# Halbe Breite des Fissurenbandes, in Zeicheneinheiten.
FISSUR = 1.5
# Wie weit ein Sektor um seine Richtung reicht (Grad).
SEKTOR = 52.0

FLAECHEN = ("mesial", "distal", "buccal", "lingual")


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

    c = umriss.mean(axis=0)
    richtung = {}
    for f in FLAECHEN:
        mm = re.search(r'<(?:path|polygon)\b(?:(?!/>).)*?id="filling-composite-' + f
                       + r'"(?:(?!/>).)*?/>', txt, re.S)
        P = redraw.polygon(re.search(r'\sd="([^"]+)"', mm.group(0)).group(1))
        v = P.mean(axis=0) - c
        richtung[f] = v / (np.hypot(*v) + 1e-12)
    return umriss, fissuren, richtung, c


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
    md = [richtung["mesial"], richtung["distal"]]
    hilfs = []
    for H in hoecker.verlaengere(fissuren, umriss):
        v = H[1] - H[0]
        v = v / (np.hypot(*v) + 1e-12)
        if max(float(v @ md[0]), float(v @ md[1])) > kos:
            hilfs.append(H)
    voll = np.ones_like(innen)
    hoecker._zeichne_linien(voll, fissuren + hilfs, x0, y0)
    linie = ~voll
    band = fe._weite(linie, max(2, int(FISSUR * A))) & innen
    rand = aus["mesial"] | aus["distal"] | aus["buccal"] | aus["lingual"]
    aus["occlusal"] = fe._weite(band & innen & ~rand, fe.UEBERLAPP * 3) & innen & (band | ~rand)
    aus["occlusal"] = _nur_groesste(aus["occlusal"])

    # Eingeschlossene Zwickel zwischen einem Randband und dem Fissurenband
    # schlagen dem BAND zu. Dirk, 18.08.2026: "Hier sind weisse Flecken zwischen
    # der distalen Kante und der okklusalen Flaeche. Die koennen gern mit
    # eingefaerbt sein." Sie entstehen, wo ein Fissurenast schraeg in das Band
    # laeuft und dort beschnitten wird - kein Befund, sondern eine ausgefranste
    # Innenkante. Dem Band zugeschlagen und nicht der Kauflaeche, damit eine
    # einzelne d-Fuellung eine glatte Kante bekommt statt eines Zipfels.
    for f in FLAECHEN:
        loch = _loecher(aus[f] | aus["occlusal"], innen)
        if loch.any():
            aus[f] = aus[f] | loch
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
    for flaeche, maske in g.items():
        P = fe._vereinfache(
            np.column_stack([ursprung[0] + fe._rand(maske)[:, 1] / hoecker.AUFLOESUNG,
                             ursprung[1] + fe._rand(maske)[:, 0] / hoecker.AUFLOESUNG]),
            fe.GLAETTE)
        neu_d = fe._d(P)
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
    datei.write_text(txt)
    return gezaehlt
