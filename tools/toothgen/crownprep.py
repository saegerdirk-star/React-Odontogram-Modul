# Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
# Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
# Dirk Saeger, Malte Sussdorff 2026

"""Den beschliffenen Zahn (`tooth-crownprep`) AUS DEM UMRISS schneiden, an
einer Linie, die die Pulpa nie erreicht.

WARUM. Bis hierher war `tooth-crownprep` eine feste Spender-Silhouette, die die
Common-Transform (`roots.py`) auf Dirks Kontur warpte. Sie weiss NICHTS davon,
wo bei DIESEM Zahn die Pulpa liegt. Gemessen am 22.08.2026: am Eckzahn 13 und
am OK-4er 14 ragt das Pulpahorn 2,7 Einheiten OKKLUSAL ueber die Praep-Flaeche
hinaus - der seit 18.08. eingebaute Laufzeit-Clip kappt die Pulpa dann buendig,
und das liest sich als EROEFFNETE Pulpa. Dirk: "die Darstellung eines
beschliffenen Zahnes fuer eine Krone darf nicht die Pulpa anschneiden, wie es
schon war." Die uebrigen Zaehne liegen mit nur 2-2,5 Einheiten hauchduenn
darunter - und kippen mit, sobald die Pulpen als junger Erwachsener (hoehere
Hoerner) neu gezeichnet werden.

DIE LOESUNG (Dirks Wahl A). Die Praep-Linie wird PRO ZAHN aus der Pulpa
abgeleitet und der Stumpf wie bei `kronen.py` aus der Kontur GESCHNITTEN:

    praep_y = max( kronenspitze - REDUKTION,        # normale okklusale Reduktion
                   pulpadach     + DENTIN )          # aber nie naeher an die Pulpa

In der Rohvorlage steht die Wurzel oben, die Krone unten (`kronen.zervikal_y`),
die Kaukante liegt also bei GROESSEREM y. Ein GROESSERES `praep_y` heisst
weniger Reduktion, also weiter WEG von der Pulpa - deshalb `max`. Der Stumpf ist
alles APIKAL von `praep_y`, oben flach geschlossen; die Wurzel bleibt ganz.

Weil die Ableitung die GERADE EINGESETZTE Pulpa liest (Stufe zwei, vor dieser),
bleibt sie nach einer Neuzeichnung der Pulpen automatisch richtig: wandert das
Pulpadach, wandert die Praep-Linie mit.

NUR DIE SEITENANSICHT. Der beschliffene Zahn zeigt sich im Programm allein bei
`toothSelection === "tooth-base"` (Seitenansicht); die Kauflaechenansicht hat
keine Krone, die man in dieser Projektion abschleift, und keine Pulpa, die dort
angeschnitten wuerde. Die 26 `_occl`-Vorlagen bleiben unangetastet.

KEIN GEFRORENER VERTRAG. `verify.py`/`spec.py`/`redraw_plan.py` frieren die
Geometrie von `tooth-crownprep` nirgends ein (geprueft). `verify_redraw.py`
prueft weiter Umriss, Inventar und `bleibt_im_zahn` - der Stumpf ist ein
zusammenhaengender Pfad INNERHALB der Kontur und besteht sie unveraendert. Wie
`kronen.einsetzen` wird nur das `d` ersetzt; Ebene, id, Reihenfolge und Stil
bleiben, der Fingerabdruck sieht nichts.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import kronen as kr   # noqa: E402  - Umriss-Helfer, _d_von/polygon/als_d/_f

TEMPLATES = kr.TEMPLATES

# Normale okklusale/inzisale Reduktion, gemessen von der Kronenspitze, in
# Vorlagen-Einheiten. Der Zahn ist rund 3 Einheiten je mm hoch, das sind also
# gut 2 mm - der uebliche Abtrag fuer eine Vollkrone.
REDUKTION = 6.0

# Wieviel Dentin zwischen Praep-Flaeche und Pulpadach mindestens stehen bleibt.
# Rund 1,2 mm - so viel, dass die Pulpa GESCHLOSSEN bleibt, nicht mehr. Diese
# Zahl ist die eigentliche Aussage der Datei; Dirk kalibriert sie am Bild.
DENTIN = 3.5

# Unter dieser Restreduktion sieht ein Stumpf aus wie ein ganzer Zahn. Wird die
# Pulpa so hoch, dass selbst das nicht mehr bliebe, gewinnt die Sicherheit -
# aber bei den heutigen Pulpen tritt der Fall an keiner Vorlage ein.
MIN_REDUKTION = 2.0

# Wie stark die KRONENWAENDE nach okklusal zusammenlaufen (Dirks Wahl: leichte
# Konvergenz, damit der Stumpf sich als Praeparation liest). Ein Bruchteil der
# halben Kronenbreite: an der Praep-Kappe ist der Zahn um `KONVERGENZ` schmaler
# je Seite, an der Schmelz-Zement-Grenze gar nicht - dazwischen linear. NUR die
# Krone (oberhalb der Zervikallinie), NIE die Wurzel: `kronen.als_d`s
# `skalierung` schrumpfte die ganze Kette um die Schnittmitte und haette die
# Wurzel mitverjuengt.
KONVERGENZ = 0.14


def _pulpa_ds(txt: str) -> list[str]:
    """Alle Pfaddaten der gezeichneten Pulpa - am Molaren traegt
    `tooth-healthy-pulp` mehrere Kanaele als `-1`/`-2`."""
    ds: list[str] = []
    for pid in ("tooth-healthy-pulp", "milktooth-healthy-pulp"):
        for m in re.finditer(
            r'<path\b[^>]*\bid="' + re.escape(pid) + r'(?:-\d+)?"[^>]*\bd="([^"]+)"',
            txt,
        ):
            ds.append(m.group(1))
        # Der Umriss-Pfad selbst (ohne -N-Suffix), falls oben nichts traf.
        d = kr._d_von(txt, pid)
        if d and d not in ds:
            ds.append(d)
    return ds


def pulpadach_y(txt: str) -> float | None:
    """Der okklusal-naechste Punkt der Pulpa (groesstes y). None ohne Pulpa."""
    ymax = None
    for d in _pulpa_ds(txt):
        for _, y in kr.polygon(d):
            ymax = y if ymax is None else max(ymax, y)
    return ymax


def kette_apikal(pts, y_schnitt: float) -> list[tuple[float, float]] | None:
    """Das laengste zusammenhaengende Stueck des Umrisses APIKAL des Schnitts.

    Spiegelbild von `kronen.kette`: dort das koronale Stueck (y >= Schnitt),
    hier das apikale (y <= Schnitt). Der geschlossene Pfad kann ueber den
    Anfangspunkt hinweglaufen, deshalb wird der letzte Lauf an den ersten
    gehaengt, wenn beide am Rand liegen.
    """
    laeufe: list[list[tuple[float, float]]] = []
    akt: list[tuple[float, float]] = []
    for p in pts:
        if p[1] <= y_schnitt:
            akt.append(p)
        elif akt:
            laeufe.append(akt)
            akt = []
    if akt:
        if laeufe and pts and pts[0][1] <= y_schnitt:
            laeufe[0] = akt + laeufe[0]
        else:
            laeufe.append(akt)
    if not laeufe:
        return None
    k = max(laeufe, key=len)
    return k if len(k) >= 8 else None


def praep_y(txt: str, pos: int) -> float | None:
    """Die Hoehe der Praep-Flaeche in Vorlagenkoordinaten, oder None."""
    d = kr._d_von(txt, "tooth-base")
    if not d:
        return None
    pts = kr.polygon(d)
    spitze = max(p[1] for p in pts)                 # Kaukante/Inzisalkante
    ziel = spitze - REDUKTION                        # der uebliche Abtrag
    dach = pulpadach_y(txt)
    if dach is not None:
        ziel = max(ziel, dach + DENTIN)              # aber nie an die Pulpa
    # Immer eine sichtbare Reduktion lassen.
    ziel = min(ziel, spitze - MIN_REDUKTION)
    return ziel


def konvergent_d(k, y_schnitt: float, y_zervikal: float | None) -> str:
    """Die Kette, oben flach an `y_schnitt` geschlossen - mit den KRONENWAENDEN
    nach okklusal leicht zusammengelaufen.

    Die Verjuengung ramp linear von 0 an der Zervikallinie bis `KONVERGENZ` an
    der Praep-Kappe und zieht die Punkte zur Kronenachse `cx` (der Mitte der
    Kappe). Unterhalb der Zervikallinie - die Wurzel - passiert nichts. Ohne
    bekannte Zervikallinie faellt sie auf `kronen.als_d` (flach) zurueck.
    """
    a, b = k[0], k[-1]
    cx = (a[0] + b[0]) / 2.0
    if y_zervikal is None or y_schnitt <= y_zervikal:
        return kr.als_d(k, y_schnitt)
    spanne = y_schnitt - y_zervikal

    def zieh(p):
        if p[1] <= y_zervikal:
            return p                                  # Wurzel unangetastet
        frac = (p[1] - y_zervikal) / spanne           # 0 am Hals, 1 an der Kappe
        f = 1.0 - KONVERGENZ * frac
        return (cx + (p[0] - cx) * f, p[1])

    kk = [zieh(p) for p in k]
    aa, bb = kk[0], kk[-1]
    teile = [f"M{kr._f(bb[0])},{kr._f(y_schnitt)}", f"L{kr._f(aa[0])},{kr._f(y_schnitt)}"]
    teile += [f"L{kr._f(p[0])},{kr._f(p[1])}" for p in kk]
    teile.append("Z")
    return "".join(teile)


def stumpf_d(zahn: str) -> str | None:
    """Der beschliffene Zahn als Pfaddaten, oder None."""
    if zahn.endswith("_occl"):
        return None
    txt = (TEMPLATES / f"{zahn}.svg").read_text()
    d = kr._d_von(txt, "tooth-base")
    if not d:
        return None
    pts = kr.polygon(d)
    y = praep_y(txt, int(zahn))
    if y is None:
        return None
    k = kette_apikal(pts, y)
    if k is None:
        return None
    y_zervikal = kr.zervikal_y(pts, int(zahn))
    return konvergent_d(k, y, y_zervikal)


def einsetzen(zahn: str) -> dict[str, int]:
    """Den abgeleiteten Stumpf in `tooth-crownprep` schreiben (nur das `d`)."""
    neu = stumpf_d(zahn)
    if neu is None:
        return {"crownprep": 0}
    datei = TEMPLATES / f"{zahn}.svg"
    txt = datei.read_text()
    m = re.search(r'<path\b(?:(?!/>).)*?id="tooth-crownprep"(?:(?!/>).)*?/>', txt, re.S)
    if not m:
        return {"crownprep": 0}
    alt = m.group(0)
    if ' d="' not in alt:
        return {"crownprep": 0}
    txt = txt.replace(alt, re.sub(r'\sd="[^"]*"', ' d="' + neu + '"', alt, count=1), 1)
    datei.write_text(txt)
    return {"crownprep": 1}


def seitenzaehne() -> list[str]:
    """Jede Seitenansicht mit einem `tooth-crownprep` (bleibend und Milch)."""
    out = []
    for p in sorted(TEMPLATES.glob("*.svg")):
        if p.stem.endswith("_occl"):
            continue
        if 'id="tooth-crownprep"' in p.read_text():
            out.append(p.stem)
    return out


if __name__ == "__main__":
    for z in seitenzaehne():
        print(f"  {z:6} {einsetzen(z)}")
