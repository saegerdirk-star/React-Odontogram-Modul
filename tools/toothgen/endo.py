# Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
# Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
# Dirk Saeger, Malte Sussdorff 2026

"""Was im Kanal liegt, kommt AUS dem Kanal.

Bead odontogram-7xl, dritter und letzter Teil. Dirk, 22.08.2026: *"Das muessen
wir unbedingt richtig machen."*

WAS ES WAR. Die Pulpa wird EINGESETZT - Dirk zeichnet sie -, alles was in ihr
liegt wurde dagegen GEWARPT, mit einem eigenen Feld, dessen Stuetzstellen auf
der Pulpakontur sitzen. Eine Wurzelfuellung ist aber etwas breiter als das Lumen
und reicht bis an den Apex; ihre Punkte liegen also teils AUSSERHALB der
Stuetzstellen, und dort geht der Spline in die Affinabbildung ueber und driftet.

Gemessen am Sechser stand die Wurzelfuellung 12,4 Einheiten rechts und 18,1
unten ueber die Pulpa hinaus - im Bild ein blaues Gewirr quer ueber die Krone,
das links aus der Kachel lief. Am Fuenfer fuellte der Glasstift die Krone aus
und schickte einen Dorn unten aus dem Rahmen.

DIE ANTWORT IST DIESELBE WIE BEI DER KRONE, nur ein Feld weiter innen: eine
Wurzelfuellung IST der Kanal, gefuellt. Sie laesst sich aus dem eingesetzten
Lumen schneiden, so wie die Krone aus der eingesetzten Kontur - und dann kann
sie nicht mehr danebenliegen.

    endo-filling              das Lumen selbst
    endo-medical-filling      dasselbe (die Farbe unterscheidet sie)
    endo-filling-incomplete   das Lumen, apikal verkuerzt
    endo-glass-pin            der koronale Teil des Kanals
    endo-metal-pin            derselbe
    endo-resection            der abgetrennte Apex, aus der KONTUR

WAS HIER NICHT ANGEFASST WIRD: der parapulpaere Stift steckt neben der Pulpa im
Dentin und ist aus ihr nicht zu schneiden; die Entzuendungsebenen sind eine
Textur und keine Form; die Resorptionen liegen an der Wurzelwand.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import kronen   # noqa: E402  - polygon(), _f() und _d_von() liegen dort

TEMPLATES = kronen.TEMPLATES

# Die Ebenen, die das ganze Lumen sind.
VOLL = ("endo-filling", "endo-medical-filling")

# Wie weit eine UNVOLLSTAENDIGE Wurzelfuellung vor dem Apex endet, als Anteil
# der Lumenhoehe. 0,18 heisst: die apikalen achtzehn Prozent bleiben leer - weit
# genug, dass man es auf einer 60 Pixel hohen Kachel sieht, nah genug, dass es
# als "kurz" und nicht als "halb" liest.
UNVOLLSTAENDIG = 0.18

# Wieviel des Kanals ein STIFT einnimmt, von koronal gerechnet. Ein Wurzelstift
# reicht ueblicherweise etwa zur Haelfte in die Wurzel; 0,45 der Lumenhoehe
# trifft das und laesst apikal Platz fuer die Wurzelfuellung, die darunter
# bleibt.
STIFT = 0.45
STIFTE = ("endo-glass-pin", "endo-metal-pin")

# Die Wurzelspitzenresektion: der abgetrennte Apex, als Anteil der WURZELhoehe.
# Sie wird aus der Kontur geschnitten und nicht aus dem Lumen - abgetrennt wird
# die Wurzelspitze, nicht der Kanal.
RESEKTION = 0.13


def _pulpa_ds(txt: str) -> list[str]:
    """Die Pfaddaten des eingesetzten Lumens - Gruppe wie Einzelpfad."""
    g = re.search(r'<g[^>]*\sid="tooth-healthy-pulp"[^>]*>(.*?)</g>', txt, re.S)
    if g:
        return re.findall(r'\sd="([^"]+)"', g.group(1))
    d = kronen._d_von(txt, "tooth-healthy-pulp")
    return [d] if d else []


def _laeufe(pts, y_schnitt: float, koronal: bool) -> list[list[tuple[float, float]]]:
    """Alle zusammenhaengenden Stuecke eines Punktzugs auf EINER Seite des Schnitts.

    Anders als `kronen.kette` wird hier nicht das laengste Stueck genommen,
    sondern jedes: ein mehrwurzeliges Lumen faellt apikal in mehrere Kanaele
    auseinander, und ein Stueck davon wegzulassen hiesse, einen Kanal
    ungefuellt zu lassen.
    """
    drin = (lambda p: p[1] >= y_schnitt) if koronal else (lambda p: p[1] <= y_schnitt)
    out: list[list[tuple[float, float]]] = []
    akt: list[tuple[float, float]] = []
    for p in pts:
        if drin(p):
            akt.append(p)
        elif akt:
            out.append(akt)
            akt = []
    if akt:
        out.append(akt)
    return [k for k in out if len(k) >= 6]


def _als_d(laeufe, y_schnitt: float) -> str:
    """Jedes Stueck an der Schnittlinie gerade geschlossen, alle in EINEM Pfad.

    Mehrere Teilpfade in einem `d` sind fuer eine Fuellung genau richtig: der
    Zahn hat drei Kanaele und trotzdem EINE Wurzelfuellung.
    """
    teile = []
    for k in laeufe:
        a, b = k[0], k[-1]
        teile.append(f"M{kronen._f(b[0])},{kronen._f(y_schnitt)}"
                     f"L{kronen._f(a[0])},{kronen._f(y_schnitt)}"
                     + "".join(f"L{kronen._f(p[0])},{kronen._f(p[1])}" for p in k)
                     + "Z")
    return "".join(teile)


def formen(zahn: str) -> dict[str, str]:
    """Die abgeleiteten Formen je Ebenen-id. Leer, wo nichts abzuleiten ist."""
    if zahn.endswith("_occl"):
        return {}                     # eine Kautafel zeigt keinen Kanal
    txt = (TEMPLATES / f"{zahn}.svg").read_text()
    ds = _pulpa_ds(txt)
    if not ds:
        return {}
    teile = [kronen.polygon(d) for d in ds]
    alle = [p for t in teile for p in t]
    if len(alle) < 12:
        return {}
    y_apex, y_kau = min(p[1] for p in alle), max(p[1] for p in alle)
    hoehe = y_kau - y_apex
    if hoehe <= 0:
        return {}

    voll = "".join(d for d in ds)      # das Lumen, woertlich
    out: dict[str, str] = {i: voll for i in VOLL}

    y_kurz = y_apex + hoehe * UNVOLLSTAENDIG
    kurz = [k for t in teile for k in _laeufe(t, y_kurz, True)]
    if kurz:
        out["endo-filling-incomplete"] = _als_d(kurz, y_kurz)

    y_stift = y_kau - hoehe * STIFT
    stift = [k for t in teile for k in _laeufe(t, y_stift, True)]
    if stift:
        for i in STIFTE:
            out[i] = _als_d(stift, y_stift)

    # Die Resektion aus der KONTUR: der abgetrennte Apex.
    kd = kronen._d_von(txt, "tooth-base")
    if kd:
        kpts = kronen.polygon(kd)
        ky_apex = min(p[1] for p in kpts)
        ky_hals = kronen.zervikal_y(kpts, int(zahn))
        if ky_hals is not None and ky_hals > ky_apex:
            y_res = ky_apex + (ky_hals - ky_apex) * RESEKTION
            res = _laeufe(kpts, y_res, False)
            if res:
                out["endo-resection"] = _als_d(res, y_res)
    return out


def einsetzen(zahn: str) -> dict[str, int]:
    """Die abgeleiteten Formen in die Vorlage schreiben."""
    f = formen(zahn)
    if not f:
        return {"endo": 0}
    datei = TEMPLATES / f"{zahn}.svg"
    txt = datei.read_text()
    n = 0
    for ident, neu in f.items():
        m = re.search(r'<path\b(?:(?!/>).)*?\sid="' + re.escape(ident) + r'"(?:(?!/>).)*?/>',
                      txt, re.S)
        if not m or ' d="' not in m.group(0):
            continue
        txt = txt.replace(m.group(0),
                          re.sub(r'\sd="[^"]*"', ' d="' + neu + '"', m.group(0), count=1), 1)
        n += 1
    datei.write_text(txt)
    return {"endo": n}


if __name__ == "__main__":
    for z in kronen.alle():
        print(f"  {z:10} {einsetzen(z)}")
