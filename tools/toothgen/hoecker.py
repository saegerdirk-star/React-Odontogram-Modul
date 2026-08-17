# Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
# Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
# Dirk Saeger, Malte Sussdorff 2026

"""Hoecker aus den Fissuren - die Kauflaeche in Gebiete zerlegen.

Dirk zeichnet die Kauflaeche als Umriss plus Fissurenlinien. Umriss und Fissuren
zerlegen die Flaeche in Gebiete, und jedes Gebiet IST ein Hoecker. Damit faellt
beides zugleich ab, was heute fehlt: die Hoecker als Flaechen, und darauf
aufbauend Fuellungsflaechen, die entlang der Fissur liegen - also entlang der
Praeparationsgrenze - statt entlang einer Handzeichnung aus `source/`.

Aus Flaechen Linien zu machen waere der muehsame Weg; aus Linien Flaechen zu
machen ist der guenstige. Deshalb diese Richtung.

DIE VERLAENGERUNG, und warum sie noetig ist: eine Fissur endet vor der
Randleiste. Gemessen an `17_occl_fissuren.svg` sitzt jede Verzweigung auf 0,11
bis 0,23 Einheiten genau, aber die fuenf AEUSSEREN Enden hoeren 4,5 bis 12,3
Einheiten vor dem Rand auf. Das ist Anatomie und kein Mangel - nur zerlegen die
Linien die Flaeche dann nicht, alles laeuft zu einem Gebiet zusammen.

Dirks Entscheidung (18.08.2026, Variante 2): jedes freie Ende wird geradlinig
bis zum Umriss verlaengert. Die Verlaengerung ist eine HILFSLINIE fuer die
Zerlegung und gehoert NICHT in die ausgelieferte `fissure`-Ebene - sonst stuende
auf der Kauflaeche eine Fissur, wo anatomisch die Randleiste durchlaeuft.

GERASTERT, nicht als planare Arrangement-Struktur. Ein exaktes Arrangement muss
jeden Schnittpunkt zweier Bezierzuege loesen und bricht an genau den Stellen, an
denen eine Handzeichnung ungenau ist - an den T-Stoessen, die hier 0,11 bis 0,23
Einheiten Spiel haben. Ein Raster hat dieses Problem nicht: es fragt nur, was
zusammenhaengt. Der Preis ist die Aufloesung, und die ist bei 40 Zellen je
Einheit feiner als die Zeichnung selbst.
"""
from __future__ import annotations

import re
import sys
from collections import deque
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import redraw  # noqa: E402
import svgpath  # noqa: E402

ZEICHNUNGEN = Path.home() / "dev" / "Odontogram-Anatomie"

# Zellen je Zeicheneinheit.
AUFLOESUNG = 40

# Bis zu welchem Abstand ein Ende als ANGESCHLOSSEN gilt. Die gemessenen
# T-Stoesse liegen bei 0,11 bis 0,23; die freien Enden bei 4,5 und darueber. Die
# Schwelle liest sich aus dieser Luecke ab und ist nicht geschaetzt.
TOL_ANSCHLUSS = 0.6

# Ein Gebiet unter diesem Anteil der Kauflaeche ist kein Hoecker, sondern ein
# Rest an einer Kreuzung - die Linien haben Breite, und wo drei zusammenlaufen,
# bleibt ein Zwickel stehen.
MIN_ANTEIL = 0.02

# Wie die Vorlagen liegen, abgelesen von den Schumacher-Scans in den
# Zeichnungen selbst (18.08.2026) - nicht angenommen:
#
#   Oberkiefer  14 15 16 17 18:  vestibulaer OBEN,  lingual UNTEN
#   Unterkiefer 44 45 46 47 48:  lingual OBEN,      vestibulaer UNTEN
#
# Mesial liegt in BEIDEN Kiefern rechts, distal links. Die senkrechte Achse
# kippt also zwischen den Kiefern, die waagerechte nicht.
OBEN_IST_VESTIBULAER = {14, 15, 16, 17, 18, 24, 25, 26, 27, 28, 54, 55, 64, 65}

# Ab welchem Anteil der halben Ausdehnung eine Richtung genannt wird. Darunter
# liegt das Gebiet mittig und die Richtung waere geraten.
DEUTLICH = 0.22


def benenne(mitte, schwer, spanne, oben_vest: bool) -> str:
    """Ein Gebiet nach seiner LAGE benennen statt es zu nummerieren.

    Zwei Achsen, jede nur genannt, wenn sie deutlich ausschlaegt. Ein Hoecker
    liegt in einer Ecke und bekommt beide (mesiobukkal); eine Randleiste liegt
    seitlich auf halber Hoehe und bekommt nur eine (mesiale Randleiste).
    """
    dx = (schwer[0] - mitte[0]) / (spanne[0] / 2.0)
    dy = (schwer[1] - mitte[1]) / (spanne[1] / 2.0)
    waag = "mesial" if dx > DEUTLICH else "distal" if dx < -DEUTLICH else ""
    if abs(dy) <= DEUTLICH:
        senk = ""
    elif (dy < 0) == oben_vest:
        senk = "bukkal"
    else:
        senk = "lingual"
    if waag and senk:
        return f"{waag}o{senk}"
    if senk:
        return senk
    if waag:
        return f"{waag}e Randleiste"
    return "zentral"


def lies_zeichnung(datei: Path) -> tuple[np.ndarray, list[np.ndarray]]:
    """Umriss und Fissurenlinien aus einer `_zeichnen`-Datei.

    Dieselbe Regel, nach der `redraw_occl` liest: der laengste GESCHLOSSENE Pfad
    ist der Umriss, jeder OFFENE Pfad ist eine Fissur. Geschlossene Pfade
    daneben - Hoeckerflaechen aus aelteren Zeichnungen - werden hier ignoriert,
    denn sie sind genau das, was dieses Modul ersetzen soll.
    """
    txt = datei.read_text()
    m = re.search(r'<g[^>]*label="3 HIER ZEICHNEN"[^>]*>(.*?)</g>', txt, re.S)
    if not m:
        raise ValueError(f"{datei.name}: Ebene '3 HIER ZEICHNEN' fehlt")
    ds = re.findall(r'<path[^>]*\sd="([^"]+)"', m.group(1))
    if not ds:
        raise ValueError(f"{datei.name}: nichts in der Zeichenebene")
    geschlossen = [d for d in ds if d.rstrip().lower().endswith("z")]
    if not geschlossen:
        raise ValueError(f"{datei.name}: kein geschlossener Pfad, also kein Umriss")
    umriss = redraw.polygon(max(geschlossen, key=lambda d: len(redraw.polygon(d))))
    fissuren = [redraw.polygon(d) for d in ds if not d.rstrip().lower().endswith("z")]
    return umriss, fissuren


def _schnitt_mit_umriss(p: np.ndarray, richtung: np.ndarray,
                        umriss: np.ndarray) -> np.ndarray | None:
    """Wo trifft der Strahl von `p` in `richtung` den Umriss zuerst?"""
    a = umriss
    b = np.roll(umriss, -1, axis=0)
    d = b - a
    nenner = richtung[0] * d[:, 1] - richtung[1] * d[:, 0]
    gut = np.abs(nenner) > 1e-12
    if not gut.any():
        return None
    diff = a - p
    t = (diff[:, 0] * d[:, 1] - diff[:, 1] * d[:, 0]) / np.where(gut, nenner, 1.0)
    u = (diff[:, 0] * richtung[1] - diff[:, 1] * richtung[0]) / np.where(gut, nenner, 1.0)
    treffer = gut & (t > 1e-9) & (u >= 0.0) & (u <= 1.0)
    if not treffer.any():
        return None
    return p + richtung * float(t[treffer].min())


def verlaengere(fissuren: list[np.ndarray], umriss: np.ndarray) -> list[np.ndarray]:
    """Jedes freie Ende geradlinig bis zum Umriss ziehen - die Hilfslinien.

    Frei heisst: weiter als `TOL_ANSCHLUSS` von jeder anderen Fissur entfernt.
    Ein Ende, das als T-Stoss auf einer anderen Linie sitzt, bleibt unberuehrt.
    Die Richtung kommt aus den letzten Punkten des Zuges und nicht aus den
    beiden aeussersten: eine Handzeichnung zittert am Ende, und ein aus zwei
    Punkten genommener Winkel schickt die Hilfslinie quer ueber den Zahn.
    """
    aus: list[np.ndarray] = []
    for i, F in enumerate(fissuren):
        andere = [G for j, G in enumerate(fissuren) if j != i]
        for ende, blick in ((0, slice(0, 6)), (len(F) - 1, slice(-6, None))):
            p = F[ende]
            if andere and min(float(np.min(np.hypot(G[:, 0] - p[0], G[:, 1] - p[1])))
                              for G in andere) < TOL_ANSCHLUSS:
                continue                       # sitzt auf einer anderen Linie
            stueck = F[blick]
            r = p - (stueck[-1] if ende == 0 else stueck[0])
            n = float(np.hypot(*r))
            if n < 1e-9:
                continue
            treffer = _schnitt_mit_umriss(p, r / n, umriss)
            if treffer is not None:
                aus.append(np.vstack([p, treffer]))
    return aus


def _fuelle_polygon(umriss: np.ndarray, x0: float, y0: float,
                    breite: int, hoehe: int) -> np.ndarray:
    """Rasterbild des Polygoninneren, zeilenweise ueber die Schnittpunkte."""
    drin = np.zeros((hoehe, breite), dtype=bool)
    a, b = umriss, np.roll(umriss, -1, axis=0)
    for zeile in range(hoehe):
        y = y0 + (zeile + 0.5) / AUFLOESUNG
        trifft = ((a[:, 1] > y) != (b[:, 1] > y))
        if not trifft.any():
            continue
        ay, by = a[trifft, 1], b[trifft, 1]
        ax, bx = a[trifft, 0], b[trifft, 0]
        xs = np.sort(ax + (y - ay) / (by - ay) * (bx - ax))
        for k in range(0, len(xs) - 1, 2):
            i0 = int(np.ceil((xs[k] - x0) * AUFLOESUNG - 0.5))
            i1 = int(np.floor((xs[k + 1] - x0) * AUFLOESUNG - 0.5))
            if i1 >= i0:
                drin[zeile, max(i0, 0):min(i1 + 1, breite)] = True
    return drin


def _zeichne_linien(bild: np.ndarray, linien: list[np.ndarray],
                    x0: float, y0: float) -> None:
    """Die Sperren ins Raster stempeln, dicht genug fuer Zusammenhang."""
    hoehe, breite = bild.shape
    for L in linien:
        for k in range(len(L) - 1):
            p, q = L[k], L[k + 1]
            n = max(2, int(np.hypot(*(q - p)) * AUFLOESUNG * 2))
            for s in np.linspace(0.0, 1.0, n):
                pt = p + (q - p) * s
                cx = int((pt[0] - x0) * AUFLOESUNG)
                cy = int((pt[1] - y0) * AUFLOESUNG)
                bild[max(cy - 1, 0):cy + 2, max(cx - 1, 0):cx + 2] = False


def _verschmelze(marke, gezeichnet, hilfs, gross):
    """Randzwickel dem Nachbarn geben, an dem sie haengen.

    Eine Hilfslinie ist erfunden. Wo sie ein Stueck Randleiste abschneidet, das
    von keiner GEZEICHNETEN Fissur begrenzt wird, ist das kein Hoecker, sondern
    ein Rest der Konstruktion. Am 47er sind es drei Streifen mit 5 bis 6 Prozent
    neben vier Feldern mit 14 bis 24.

    Die Regel liest die Herkunft der Grenze und nicht ihre Groesse: ein Gebiet
    faellt weg, wenn es an JEDER seiner Grenzen nur durch Hilfslinien vom
    Nachbarn getrennt ist. Eine Flaechenschwelle traefe die Anatomie nur
    zufaellig - ein reduzierter distopalatinaler Hoecker misst am 17er 7,4
    Prozent und ist ein Hoecker.
    """
    hoehe, breite = marke.shape
    paar: dict[tuple[int, int], list[int]] = {}
    ys, xs = np.nonzero(gezeichnet | hilfs)
    for cy, cx in zip(ys, xs):
        nachbarn = set()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < hoehe and 0 <= nx < breite and marke[ny, nx]:
                    nachbarn.add(int(marke[ny, nx]))
        if len(nachbarn) < 2:
            continue
        n = sorted(nachbarn)
        for i in range(len(n)):
            for j in range(i + 1, len(n)):
                z = paar.setdefault((n[i], n[j]), [0, 0])
                z[0 if gezeichnet[cy, cx] else 1] += 1

    behalten = {nr for nr, _ in gross}
    while True:
        for nr, _n in sorted(gross, key=lambda g: g[1]):
            if nr not in behalten:
                continue
            kanten = [(k, v) for k, v in paar.items() if nr in k
                      and (k[0] if k[1] == nr else k[1]) in behalten]
            if not kanten or any(v[0] > 0 for _k, v in kanten):
                continue                       # eine gezeichnete Fissur begrenzt es
            ziel = max(kanten, key=lambda kv: kv[1][1])[0]
            ziel = ziel[0] if ziel[1] == nr else ziel[1]
            marke[marke == nr] = ziel
            behalten.discard(nr)
            for k in [k for k in paar if nr in k]:
                a, b = k
                a, b = (ziel if a == nr else a), (ziel if b == nr else b)
                if a != b:
                    z = paar.setdefault(tuple(sorted((a, b))), [0, 0])
                    z[0] += paar[k][0]
                    z[1] += paar[k][1]
                del paar[k]
            break
        else:
            break
    return [(nr, int((marke == nr).sum())) for nr in behalten]


def gebiete(umriss: np.ndarray, gezeichnet: list[np.ndarray],
            hilfslinien: list[np.ndarray] | None = None):
    """Die Kauflaeche in zusammenhaengende Gebiete zerlegen."""
    x0, y0 = umriss[:, 0].min() - 1.0, umriss[:, 1].min() - 1.0
    x1, y1 = umriss[:, 0].max() + 1.0, umriss[:, 1].max() + 1.0
    breite = int((x1 - x0) * AUFLOESUNG) + 1
    hoehe = int((y1 - y0) * AUFLOESUNG) + 1
    frei = _fuelle_polygon(umriss, x0, y0, breite, hoehe)
    gesamt = int(frei.sum())
    hilfslinien = hilfslinien or []
    # Getrennt stempeln: die Herkunft jeder Grenze wird spaeter gebraucht.
    vorher = frei.copy()
    _zeichne_linien(frei, gezeichnet, x0, y0)
    m_gez = vorher & ~frei
    vorher = frei.copy()
    _zeichne_linien(frei, hilfslinien, x0, y0)
    m_hilf = vorher & ~frei

    marke = np.zeros(frei.shape, dtype=np.int32)
    gefunden = []
    nr = 0
    for zy in range(hoehe):
        for zx in range(breite):
            if not frei[zy, zx] or marke[zy, zx]:
                continue
            nr += 1
            n = 0
            q = deque([(zy, zx)])
            marke[zy, zx] = nr
            while q:
                cy, cx = q.popleft()
                n += 1
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < hoehe and 0 <= nx < breite \
                            and frei[ny, nx] and not marke[ny, nx]:
                        marke[ny, nx] = nr
                        q.append((ny, nx))
            gefunden.append((nr, n))
    flaeche = 1.0 / (AUFLOESUNG * AUFLOESUNG)
    gross = [(nr, n) for nr, n in gefunden if n >= MIN_ANTEIL * gesamt]
    # `_verschmelze` laeuft NICHT. Sie stand hier einen Zug lang und war ein
    # Fehlschluss: die kleinen Gebiete am Rand sind keine Konstruktionsreste,
    # sondern die MESIALE und DISTALE RANDLEISTE. An allen vier Praemolaren
    # kommt dasselbe Muster heraus - zwei grosse Felder gegenueber (bukkal und
    # palatinal/lingual, 33 bis 55 Prozent) und zwei kleine seitlich (9 bis 14
    # Prozent) -, und Dirk hat es als richtig bestaetigt.
    #
    # Genau diese kleinen Gebiete sind das, wofuer die Zerlegung gebaut wird:
    # eine okklusale Fuellung ist die zentrale Grube, MO nimmt die mesiale
    # Randleiste dazu, OD die distale, MOD beide. Sie wegzuverschmelzen hiesse,
    # den Approximalkasten wegzuwerfen und danach zu schaetzen.
    #
    # Die Funktion bleibt stehen, weil ihre Begruendung die Warnung ist: eine
    # Flaechenschwelle taugt hier nicht (der reduzierte distopalatinale Hoecker
    # am 17er misst 7,4 Prozent), und eine Herkunftsregel taugt auch nicht,
    # solange nicht feststeht, WAS ein kleines Gebiet ist.
    return marke, gross, gesamt * flaeche, flaeche, (x0, y0)


def vorschau(datei: Path, ziel: Path) -> None:
    """Ein Bild zum Draufschauen - die Zerlegung, nicht die Zahlen.

    Die Gebiete werden als Raster eingefaerbt, der Umriss und die gezeichneten
    Fissuren voll, die HILFSLINIEN gestrichelt: so ist auf einen Blick zu sehen,
    welche Grenze Dirk gezogen hat und welche der Generator erfunden hat.
    """
    umriss, fissuren = lies_zeichnung(datei)
    hilfs = verlaengere(fissuren, umriss)
    marke, gross, _kau, zelle, (x0, y0) = gebiete(umriss, fissuren, hilfs)
    farben = ["#f6c9c0", "#c9dcf6", "#cfe9c9", "#f3e3b6", "#ddc9ea", "#c9e9e6", "#eed0e2"]
    x1 = x0 + marke.shape[1] / AUFLOESUNG
    y1 = y0 + marke.shape[0] / AUFLOESUNG
    aus = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0:.2f} {y0:.2f} '
           f'{x1-x0:.2f} {y1-y0:.2f}" width="{(x1-x0)*22:.0f}" height="{(y1-y0)*22:.0f}">',
           '<rect x="-999" y="-999" width="9999" height="9999" fill="#fff"/>']
    for k, (nr, n) in enumerate(sorted(gross, key=lambda g: -g[1])):
        ys, xs = np.nonzero(marke == nr)
        f = farben[k % len(farben)]
        # Zeilenweise zu Streifen zusammenfassen, sonst sind es 400 000 Rechtecke
        for zeile in np.unique(ys):
            r = np.sort(xs[ys == zeile])
            bruch = np.nonzero(np.diff(r) > 1)[0]
            for a, b in zip(np.r_[0, bruch + 1], np.r_[bruch, len(r) - 1]):
                aus.append(f'<rect x="{x0 + r[a]/AUFLOESUNG:.3f}" '
                           f'y="{y0 + zeile/AUFLOESUNG:.3f}" '
                           f'width="{(r[b]-r[a]+1)/AUFLOESUNG:.3f}" '
                           f'height="{1/AUFLOESUNG:.3f}" fill="{f}"/>')
        aus.append(f'<text x="{x0 + xs.mean()/AUFLOESUNG:.2f}" '
                   f'y="{y0 + ys.mean()/AUFLOESUNG:.2f}" font-size="2.4" '
                   f'text-anchor="middle" font-family="sans-serif">{k+1}</text>')
    def zug(P, stil):
        d = "M" + " L".join(f"{x:.2f},{y:.2f}" for x, y in P)
        aus.append(f'<path d="{d}" fill="none" {stil}/>')
    zug(np.vstack([umriss, umriss[:1]]), 'stroke="#333" stroke-width="0.5"')
    for F in fissuren:
        zug(F, 'stroke="#333" stroke-width="0.45"')
    for H in hilfs:
        zug(H, 'stroke="#c00" stroke-width="0.35" stroke-dasharray="0.9,0.7"')
    aus.append("</svg>")
    ziel.write_text("\n".join(aus))


def _bericht(datei: Path) -> int:
    umriss, fissuren = lies_zeichnung(datei)
    hilfs = verlaengere(fissuren, umriss)
    print(f"{datei.name}: Umriss {len(umriss)} Punkte, {len(fissuren)} Fissuren, "
          f"{len(hilfs)} Hilfslinien")
    for H in hilfs:
        print(f"   Hilfslinie von ({H[0][0]:5.2f}, {H[0][1]:5.2f}) "
              f"nach ({H[1][0]:5.2f}, {H[1][1]:5.2f})  Laenge {np.hypot(*(H[1]-H[0])):.2f}")
    _marke, gross, kau, zelle, _u = gebiete(umriss, fissuren, hilfs)
    bild = Path.home() / "Desktop" / "Odontogram-Ergebnisse" / f"{datei.stem} Hoecker.svg"
    bild.parent.mkdir(parents=True, exist_ok=True)
    vorschau(datei, bild)
    print(f"Bild: {bild}")
    zahn = int(re.match(r"(\d+)", datei.stem).group(1))
    oben_vest = zahn in OBEN_IST_VESTIBULAER
    mitte = ((umriss[:, 0].min() + umriss[:, 0].max()) / 2.0,
             (umriss[:, 1].min() + umriss[:, 1].max()) / 2.0)
    spanne = (float(np.ptp(umriss[:, 0])), float(np.ptp(umriss[:, 1])))
    print(f"\nKauflaeche {kau:.1f} Einheiten^2, {len(gross)} Gebiete:")
    for k, (nr, n) in enumerate(sorted(gross, key=lambda g: -g[1]), 1):
        ys, xs = np.nonzero(_marke == nr)
        schwer = (_u[0] + xs.mean() / AUFLOESUNG, _u[1] + ys.mean() / AUFLOESUNG)
        print(f"   {k}: {n * zelle:6.2f} Einheiten^2 ({n * zelle / kau:5.1%})  "
              f"{benenne(mitte, schwer, spanne, oben_vest)}")
    return 0


if __name__ == "__main__":
    ziel = sys.argv[1] if len(sys.argv) > 1 else "17_occl_fissuren"
    raise SystemExit(_bericht(ZEICHNUNGEN / f"{ziel}.svg"))
