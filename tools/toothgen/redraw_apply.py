# Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
# Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
# Dirk Saeger, Malte Sussdorff 2026

"""Pull one shipped template onto its redrawn outline.

Reuses build.rewrite_svg, so gradients, circles and rects are carried the same
way the generator already carries them. Two layers are held back and put in
again unchanged: `gum-base` and `bone-base` are drawn in final frame coordinates
by gum.py, a papilla is shared between two neighbours, and dragging them along
with a redrawn root would tear the gum line apart across the arch.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
import build           # noqa: E402
import gum             # noqa: E402
import redraw          # noqa: E402
import spec            # noqa: E402
import svgpath         # noqa: E402

ZEICHNUNGEN = Path.home() / "dev" / "Odontogram-Anatomie"

# Die Spender liegen in ihrem EIGENEN Ordner, nicht bei den ausgelieferten
# Templates - siehe build.SPENDER. Zeigte das hier auf src/assets, verformte der
# zweite Lauf ein bereits umgezeichnetes Template ein zweites Mal, und zwar
# lautlos: der Umriss wird eingesetzt, also saehe der Zahn danach richtig aus,
# waehrend alles darin ein zweites Mal durch das Feld gelaufen waere.
ASSETS = build.SPENDER


def _ebene(txt: str, label: str) -> str:
    m = re.search(r'<g[^>]*label="' + re.escape(label) + r'"[^>]*>(.*?)</g>', txt, re.S)
    if not m:
        raise ValueError(f"Ebene {label!r} fehlt")
    return m.group(1)


def _pfad(txt: str) -> str:
    return re.search(r'\sd="([^"]+)"', txt).group(1)


def elemente_von(txt: str, ident: str) -> list[tuple[str, str]]:
    """Wie `pfade_von`, aber mit der id jedes Pfades."""
    m = re.search(r'<path[^>]*\sid="' + re.escape(ident) + r'"[^>]*?/?>', txt) \
        or re.search(r'<path[^>]*\sd="[^"]*"[^>]*\sid="' + re.escape(ident) + r'"[^>]*?/?>', txt)
    if m:
        d = re.search(r'\sd="([^"]+)"', m.group(0))
        return [(ident, d.group(1))] if d else []
    g = re.search(r'<g[^>]*\sid="' + re.escape(ident) + r'"[^>]*>', txt)
    if not g:
        return []
    tiefe, out = 0, []
    for t in re.finditer(r"<(/?)(\w+)([^>]*?)(/?)>", txt[g.end():]):
        schliessend, tag, attrs, selbst = t.groups()
        if tag == "g":
            if schliessend and tiefe == 0:
                break
            tiefe += -1 if schliessend else (0 if selbst else 1)
        d = re.search(r'\sd="([^"]+)"', attrs)
        i = re.search(r'\sid="([^"]+)"', attrs)
        if d and i and not schliessend:
            out.append((i.group(1), d.group(1)))
    return out


def umriss_id(txt: str, ident: str) -> str:
    """Die id des Pfades, der die Ebene UMRANDET - nicht ihrer Binnenzeichnung.

    Am Molaren traegt `tooth-healthy-pulp` zwei Pfade: `-2` den ganzen
    Pulpaumriss, `-1` die Zeichnung des Kammerbodens in einem anderen Rot.
    Dirks Zeichnung gehoert in den ersten. Am Schneidezahn ist die Ebene selbst
    der Pfad und die Frage stellt sich nicht.
    """
    stuecke = elemente_von(txt, ident)
    if not stuecke:
        raise ValueError(f"{ident} nicht gefunden")
    polys = {i: redraw.polygon(d) for i, d in stuecke}
    aussen = [i for i in polys
              if not any(j != i and redraw._liegt_in(polys[i], polys[j]) for j in polys)]
    if len(aussen) != 1:
        raise ValueError(f"{ident}: {len(aussen)} Umrisspfade, erwartet genau einer")
    return aussen[0]


def _wurzel_oben(P) -> bool:
    """Zeigen die Wurzeln nach oben, also zu kleinem y?

    Zuerst ueber die ZWEIGE: ein Zahn zerfaellt an seinem Wurzelende in mehrere
    Laeufe, und die Spitzen dieses Bandes zeigen nach apikal. Das ist Anatomie
    und keine Faustregel.

    Vorher stand hier ein Breitenvergleich - schmales Ende gleich Wurzel. Am
    Milchmolaren geht der schief: 54 misst oben 20,5 und unten 18,3, weil die
    Wurzeln weit gespreizt sind, und der Vergleich wird zum Muenzwurf. Er hat
    ihn verloren, 54 wurde gedreht und 55 nicht - zwei obere Milchmolaren, die
    Dirk am selben Tag gleich gezeichnet hat. Beides kann nicht stimmen, und
    genau daran hat er es gesehen: "54 ist komplett falsch mit der Pulpa."

    Nur wo es keine Zweige gibt - die einwurzeligen Zaehne - entscheidet weiter
    die Breite, und dort ist sie eindeutig (3,3 gegen 19,9 am Fuenfziger).
    """
    y0, y1 = float(P[:, 1].min()), float(P[:, 1].max())
    mittel = lambda b: sum(abs(z["spitze"] - z["gabel"]) for z in b["zweige"]) / len(b["zweige"])
    baender = redraw.baender(P)
    if baender:
        # Das Band mit den LAENGSTEN Zweigen ist das Wurzelband - aber nur, wenn
        # die auch die Laenge einer Wurzel haben. Die Hoeckerkerbe der Krone ist
        # ebenfalls ein Band; an einem einwurzeligen Zahn ist sie das einzige,
        # und ungeprueft gewann sie und drehte den Fuenfzehner auf den Kopf.
        lang = max(baender, key=mittel)
        if mittel(lang) >= 0.15 * (y1 - y0):
            return bool(lang["spitzen_unten"])
    breit = []
    for f in (0.05, 0.15, 0.85, 0.95):
        k = redraw._kanten(P, y0 + f * (y1 - y0))
        breit.append((k[-1] - k[0]) if len(k) >= 2 else 0.0)
    return (breit[0] + breit[1]) < (breit[2] + breit[3])


def rahmen_dreher(zeichnung, template):
    """Bringt eine Unterkiefer-Zeichnung in den Rahmen ihres Templates.

    Die Templates liegen alle mit der Wurzel nach OBEN; die Unterkiefer-
    Templates bekommen ihre Drehung erst beim Zeichnen des Bogens
    (`TOOTH_TEMPLATE`, rot 180). Dirk zeichnet den Unterkiefer dagegen
    anatomisch, Krone oben. Also muss die Zeichnung gedreht werden.

    DREHUNG, nicht Spiegelung - das ist der Unterschied zwischen richtig und
    mesial/distal vertauscht, und er ist an dieser Stelle schon einmal falsch
    gewesen. Entschieden hat es Dirks Ankerkonvention (17.08.2026): "Du hattest
    S1 auf distal. Wir sind also von distal nach mesial in der Nummerierung."

      * Gegenprobe an der Darstellungsmatrix des Moduls: Zahn 16 steht in der
        linken Bogenhaelfte, mesial zeigt also zur Mitte, nach RECHTS - und
        `TOOTH_TEMPLATE` nimmt Template 16 dafuer ungespiegelt. Im Template
        liegt mesial demnach rechts, distal links. Genau so stehen die S-Anker
        im `_alt`-File: S1 (distal) links. Die Konvention stimmt.
      * Dasselbe unten: Template 46 wird fuer Zahn 36 um 180 Grad gedreht
        verwendet, und bei 36 zeigt mesial nach links. Also liegt auch in
        Template 46 mesial rechts - und die S-Anker bestaetigen es.
      * In Dirks Zeichnungen von 46, 47 und 48 ist die S-Reihenfolge dagegen
        umgekehrt: mesial liegt LINKS. Die Zeichnung ist gegenueber dem
        Template also gespiegelt, und zusammen mit dem Kippen von Krone und
        Wurzel ergibt das die 180-Grad-Drehung.
      * Unabhaengig davon der Formabstand am unsymmetrischsten Zahn: 46 gedreht
        0,0404 gegen 0,0560 gekippt.

    Dass die H-Anker am Zahnhals ihre Reihenfolge dabei NICHT drehen, spricht
    nicht dagegen - sie tragen die Konvention nicht, sie sind schlicht die
    beiden Halspunkte.

    Gibt None zurueck, wenn Zeichnung und Template schon gleich herum liegen -
    der ganze Oberkiefer.
    """
    if _wurzel_oben(zeichnung) == _wurzel_oben(template):
        return None
    cx = float(zeichnung[:, 0].min() + zeichnung[:, 0].max()) / 2.0
    cy = float(zeichnung[:, 1].min() + zeichnung[:, 1].max()) / 2.0
    return lambda x, y: (2.0 * cx - x, 2.0 * cy - y)


def flaeche_zwischen(region, von: float, bis: float, schritt: float = 0.2) -> str | None:
    """Das Stueck einer Form zwischen zwei Hoehen, aus ihren eigenen Raendern.

    Zeile fuer Zeile die linke und die rechte Kante nehmen und zu einem
    geschlossenen Umriss zusammensetzen. Damit folgt die Flaeche der Form,
    aus der sie stammt, und nicht einer fremden.
    """
    ys = np.arange(min(von, bis), max(von, bis), schritt)
    links, rechts = [], []
    for y in ys:
        laeufe = redraw._laeufe(redraw._kanten(region, float(y)))
        if not laeufe:
            continue
        links.append((laeufe[0][0], float(y)))
        rechts.append((laeufe[-1][1], float(y)))
    if len(links) < 3:
        return None
    punkte = links + rechts[::-1]
    return ("M" + f"{punkte[0][0]:.2f},{punkte[0][1]:.2f}"
            + "".join(f"L{x:.2f},{y:.2f}" for x, y in punkte[1:]) + "Z")


def veneer_aus(alt_zahn, neu_zahn, alt_veneer):
    """Das Veneer aus dem GEZEICHNETEN Kronenumriss, nicht aus dem gewarpten.

    Dirk, 17.08.2026: "Bei Veneers ist es ganz einfach. Das Veneer bedeckt die
    labiale Flaeche und die haben wir dargestellt/gezeichnet."

    Genau so. In der Seitenansicht IST die labiale Flaeche der Kronenumriss;
    ein Veneer daran nachzubilden, statt es daraus zu nehmen, ist derselbe
    Umweg wie beim Zahnumriss selbst. Gemessen liegt die gewarpte Veneerform an
    den Seitenzaehnen zu 0 Prozent auf der Kontur - vorher wie nachher, also
    Altbestand und kein Schaden des Umbaus.

    NICHT IN GEBRAUCH, und der Grund ist eine Lehre. So gebaut - Zeile fuer
    Zeile die linke und die rechte Kante des neuen Umrisses - liegt die Form zu
    100 Prozent auf der Kontur, gegen 0 bis 15 Prozent vorher. Die Zahl ist
    hervorragend und das Bild ist falsch: das ausgelieferte Veneer ist ringsum
    EINGERUECKT, mit sichtbarem Zahnrand, und genau das macht es als Veneer
    kenntlich. Meine Kennzahl misst diesen Rand als Fehler und belohnt eine
    Form, die bis an die Zahnkante laeuft. Unten kommt dazu eine kantige
    Zeilenkante heraus, wo die Vorlage eine gerundete Form hat.

    Dirk hat am Eckzahn einen zweiten Grund gezeigt, unabhaengig vom Rand: "Das
    abgeleitete Veneer an 13 folgt zur Zahnkrone nicht dem Umriss." Die
    Zeilenabtastung schneidet oben und unten WAAGERECHT ab. Wo die Krone spitz
    zulaeuft - Eckzahnhoecker, Schneidekante -, steht die Zahnspitze unter der
    geraden Veneerkante hervor. Dieselbe Sehne, die an der Kauflaeche des
    Sechsundvierzigers quer durch die Krone lief; eine Zeilenkonstruktion kann
    ein spitzes Ende nicht abschliessen.

    Und dann war gar nichts zu tun. Richtig gemessen - nicht "wie viel liegt auf
    der Kontur", sondern "wie breit ist der eingerueckte Rand" - haelt die
    gewarpte Form ihn zu 59 bis 85 Prozent (Median 68). Er schrumpft, weil Dirks
    Kronen anders geschnitten sind und das Feld ihn mitzieht, aber er ist da.
    Die 0 Prozent, mit denen die Sache anfing, waren die richtige Antwort auf
    eine falsche Frage: fuer ein eingerruecktes Veneer IST null der Sollwert.

    Bleibt stehen als Warnung, nicht als Werkzeug.
    """
    ya0, ya1 = float(alt_zahn[:, 1].min()), float(alt_zahn[:, 1].max())
    yn0, yn1 = float(neu_zahn[:, 1].min()), float(neu_zahn[:, 1].max())
    va0, va1 = float(alt_veneer[:, 1].min()), float(alt_veneer[:, 1].max())
    anteil = lambda y: (y - ya0) / (ya1 - ya0)
    return flaeche_zwischen(neu_zahn,
                            yn0 + anteil(va0) * (yn1 - yn0),
                            yn0 + anteil(va1) * (yn1 - yn0))


def kammer_aus(region, schritt: float = 0.2) -> str | None:
    """Die Pulpakammer als Pfad - der breite Teil, bevor die Kanaele abgehen.

    Dirk, 17.08.2026: "Kann man nicht einfach den gesamten, breiten Bereich der
    Pulpa, bevor die Kanaele in die Wurzel abgehen, rot einzeichnen." Kann man,
    und es ist verlaesslicher als das Bisherige: die Kammerzeichnung des
    Templates wurde mit dem Pulpafeld verzogen und sass kantig in einer Kammer,
    die sie nie gesehen hat.

    Die Hoehe, auf der die Kanaele zusammenlaufen, ist die Gabel des apikalen
    Zweigbandes - dieselbe Groesse, mit der die Wurzeln einander zugeordnet
    werden. Koronal davon ist die gezeichnete Pulpa genau EIN Lauf, und aus
    dessen linker und rechter Kante Zeile fuer Zeile entsteht der Umriss.

    Gibt None zurueck, wo es keine Kammer in diesem Sinn gibt - ein
    einwurzeliger Zahn hat keine Gabel, und sein Template traegt darum auch
    keine eigene Kammerebene.
    """
    # Von der Krone her laufen, solange die Pulpa EIN Lauf ist. Genau das ist
    # die Kammer - und nichts anderes.
    #
    # Vorher stand hier die Gabel des Zweigbandes. Am Milchmolaren 84 saetzte
    # die 23 Einheiten zu weit apikal, und weil die Kammer aus der linken und
    # der rechten AUSSENkante je Zeile gebaut wird, fuellte sie den Spalt
    # ZWISCHEN den beiden Kanaelen mit auf. Dirks Wort dafuer: "Die Pulpa
    # franst aus." Die Kanaele sind dort haarduenn gezeichnet, und ein Band
    # laesst sich an haarduennen Laeufen nicht verlaesslich festmachen; die
    # Laufzahl dagegen schon.
    y_alle = redraw._alle(region)
    apikal = min(float(Q[:, 1].min()) for Q in y_alle)
    ende = max(float(Q[:, 1].max()) for Q in y_alle)
    # Nur eine AUFTEILUNG beendet den Lauf. Null Laeufe heisst bloss, dass die
    # Zeile die Form noch nicht trifft - an der ersten Zeile unter der Kaukante
    # ist das die Regel, und daran brach die Suche vorher sofort ab.
    gabel = apikal
    y = ende - schritt
    while y > apikal:
        if len(redraw._laeufe(redraw._kanten(region, y))) >= 2:
            gabel = y
            break
        y -= schritt
    if ende - gabel < schritt * 3 or gabel <= apikal:
        return None
    ys = np.arange(gabel, ende, schritt)
    links, rechts = [], []
    for y in ys:
        laeufe = redraw._laeufe(redraw._kanten(region, float(y)))
        if not laeufe:
            continue
        links.append((laeufe[0][0], float(y)))
        rechts.append((laeufe[-1][1], float(y)))
    if len(links) < 3:
        return None
    punkte = links + rechts[::-1]
    return ("M" + f"{punkte[0][0]:.2f},{punkte[0][1]:.2f}"
            + "".join(f"L{x:.2f},{y:.2f}" for x, y in punkte[1:]) + "Z")


def pfade_von(txt: str, ident: str) -> list[str]:
    """Alle d-Attribute einer Ebene - sie kann ein <path> ODER eine <g> sein.

    Am Schneidezahn ist `tooth-healthy-pulp` ein einzelner <path>; am Molaren
    ist es eine <g> mit `tooth-healthy-pulp-1` und `-2` darin. Die Suche kannte
    nur den <path>, fand am Molaren nichts und lief STILL weiter: ohne
    Pulpafeld wurde Dirks gezeichnete Kammer nie eingesetzt, und weil die
    Stift-Sicherung am selben Fund haengt, lief auch die nie. Kein Fehler, kein
    Hinweis, nur ein falsches Bild - deshalb wirft `umzeichnen` jetzt, wenn
    hier nichts herauskommt.
    """
    m = re.search(r'<path[^>]*\sid="' + re.escape(ident) + r'"[^>]*?/?>', txt) \
        or re.search(r'<path[^>]*\sd="[^"]*"[^>]*\sid="' + re.escape(ident) + r'"[^>]*?/?>', txt)
    if m:
        d = re.search(r'\sd="([^"]+)"', m.group(0))
        return [d.group(1)] if d else []
    g = re.search(r'<g[^>]*\sid="' + re.escape(ident) + r'"[^>]*>', txt)
    if not g:
        return []
    tiefe, pos, out = 0, g.end(), []
    for t in re.finditer(r"<(/?)(\w+)([^>]*?)(/?)>", txt[g.end():]):
        schliessend, tag, attrs, selbst = t.groups()
        if tag == "g":
            if schliessend and tiefe == 0:
                break
            tiefe += -1 if schliessend else (0 if selbst else 1)
        d = re.search(r'\sd="([^"]+)"', attrs)
        if d and not schliessend:
            out.append(d.group(1))
    return out


def _paaren(alt_d: list[str], neu_d: list[str]):
    """Alte und gezeichnete Pulpapfade einander zuordnen - der breite zum breiten.

    Am oberen Molaren zeichnet Dirk die Kammer mit den beiden bukkalen Kanaelen
    als einen Pfad und den palatinalen Kanal als zweiten, genau wie das Template
    sie fuehrt. Zusammengeworfen (`np.vstack`) ergaeben sie EIN Polygon, dessen
    Waagerechte das Ende des einen mit dem Anfang des anderen verbindet - die
    Laeufe sind dann frei erfunden. Also je Paar eine eigene Zuordnung.
    """
    if len(alt_d) != len(neu_d):
        raise ValueError(f"Pulpa: {len(alt_d)} Pfade im Template gegen "
                         f"{len(neu_d)} gezeichnete - nicht zuzuordnen")
    breit = lambda d: (lambda P: float(P[:, 0].max() - P[:, 0].min()))(redraw.polygon(d))
    return list(zip(sorted(alt_d, key=breit, reverse=True),
                    sorted(neu_d, key=breit, reverse=True)))


def anker(datei: Path):
    txt = datei.read_text()
    kopf = re.search(r'(<g[^>]*label="2 ANKER[^"]*"[^>]*>)(.*?)</g>', txt, re.S)
    tr = re.search(r'transform="translate\(([-\d.]+),?\s*([-\d.]+)?\)"', kopf.group(1))
    dx, dy = (float(tr.group(1)), float(tr.group(2) or 0)) if tr else (0.0, 0.0)
    out = {}
    for t in re.findall(r"<circle[^>]*?/?>", kopf.group(2)):
        i = re.search(r'\sid="([^"]+)"', t).group(1)
        ct = re.search(r'transform="translate\(([-\d.]+),?\s*([-\d.]+)?\)"', t)
        ex, ey = (float(ct.group(1)), float(ct.group(2) or 0)) if ct else (0.0, 0.0)
        out[i.split("-", 1)[1]] = (
            float(re.search(r'cx="([-\d.]+)"', t).group(1)) + dx + ex,
            float(re.search(r'cy="([-\d.]+)"', t).group(1)) + dy + ey,
        )
    return out


# Stifte muessen GERADE bleiben. Ein Thin-Plate-Spline biegt sie: am Elfer
# gemessen ging die Abweichung von der Geraden von 0,36 auf 5,07 Einheiten.
#
# Klinisch ist das kein Schoenheitsfehler. Ein krummer Stift, der die Kanalwand
# schneidet, liest sich als VIA FALSA - eine Perforation. Ein Stift darf ein
# Stueck ueber die Wurzelfuellung hinausstehen, aber die Wurzelkontur NIEMALS
# durchbrechen. Deshalb bekommt jede Stiftebene eine eigene Aehnlichkeits-
# abbildung: ihre Achse wird vom Pulpa-Feld mitgenommen, der Stift selbst nur
# gedreht, verschoben und gleichmaessig skaliert. Nachgewiesen: drei kollineare
# Punkte bleiben kollinear, Dreiecksflaeche exakt null.
#
# Drei weitere Vorgaben von Dirk (16.08.2026), die beim Setzen gelten:
#   * MILCHZAEHNE bekommen nie einen Stift.
#   * Eine gekruemmte Wurzel gibt es nur beim Molaren.
#   * Der Stift wird in den relativ GERADEN Kanal gezeichnet - im Oberkiefer den
#     palatinalen, im Unterkiefer den distalen. Bei den mehrwurzeligen Zaehnen
#     ist deshalb zu pruefen, ob die starre Abbildung ihn dort auch hinsetzt;
#     das Pulpa-Feld allein garantiert es nicht.
#
# Offen: ob eine tatsaechliche Via falsa als eigener Befund darstellbar sein
# soll, wenn sie an einem Zahn vorliegt.
STIFT_MUSTER = re.compile(r"pin", re.I)

PULPA_MUSTER = re.compile(r"(pulp|endo)", re.I)
# Parapulpaer heisst NEBEN der Pulpa - im Dentin, nicht im Kanal. Die Ebene
# folgt deshalb dem Zahn und nicht der Pulpa.
PARAPULPAL_MUSTER = re.compile(r"parapulpal", re.I)
MILCH_MUSTER = re.compile(r"milktooth", re.I)


def pulpa_ebenen(txt: str):
    """Ebenen, die der Pulpa folgen - Pulpitis, Wurzelfuellung, Stifte.

    Die milktooth-Ebenen bleiben aussen vor: sie sind der alte Behelf, mit dem
    ein Milchzahn im Template seines Nachfolgers gezeichnet wurde, und gehoeren
    nicht zu dieser Pulpa.
    """
    out = []
    for m in re.finditer(r'\sid="([^"]+)"', txt):
        i = m.group(1)
        if i.startswith("toothgen-"):
            continue
        if PULPA_MUSTER.search(i) and not MILCH_MUSTER.search(i):
            out.append(i)
    return out


def starr_aus(feld, P):
    """Aehnlichkeitsabbildung, die die ACHSE von P so bewegt wie `feld`.

    Nur Drehung, gleichmaessige Skalierung und Verschiebung - was gerade war,
    bleibt gerade. Die Achse wird ueber die beiden Endpunkte der Laengsausdehnung
    genommen und mit dem vollen Feld abgebildet; alles andere folgt starr.
    """
    i0 = int(np.argmin(P[:, 1])); i1 = int(np.argmax(P[:, 1]))
    a0, a1 = P[i0], P[i1]
    b0 = np.array(feld(*a0)); b1 = np.array(feld(*a1))
    va, vb = a1 - a0, b1 - b0
    la, lb = float(np.hypot(*va)), float(np.hypot(*vb))
    if la < 1e-9:
        return lambda x, y: feld(x, y)
    k = lb / la
    wa = np.arctan2(va[1], va[0]); wb = np.arctan2(vb[1], vb[0])
    dw = wb - wa
    c, s_ = np.cos(dw) * k, np.sin(dw) * k

    def f(x, y):
        d = np.array([x, y]) - a0
        return (float(b0[0] + c * d[0] - s_ * d[1]),
                float(b0[1] + s_ * d[0] + c * d[1]))
    return f


def verforme_je_element(txt: str, feld_fuer):
    """Jedes d-Attribut mit dem Feld verformen, das fuer sein Element gilt.

    `feld_fuer(ids)` bekommt die id des Elements und die seiner umgebenden
    Gruppen und gibt eine Warp-Funktion zurueck - oder None, dann bleibt das
    Element unveraendert. So koennen Zahn, Pulpa und Zahnfleisch in EINEM
    Durchgang verschieden behandelt werden, ohne Bloecke herauszuschneiden.
    """
    out = []
    stapel = []
    pos = 0
    for m in re.finditer(r"<(/?)(\w+)([^>]*?)(/?)>", txt):
        out.append(txt[pos:m.start()])
        pos = m.end()
        schliessend, tag, attrs, selbst = m.groups()
        if schliessend:
            if tag == "g" and stapel:
                stapel.pop()
            out.append(m.group(0))
            continue
        ident = re.search(r'\sid="([^"]+)"', attrs)
        eigen = ident.group(1) if ident else None
        kette = [x for x in stapel + [eigen] if x]
        d = re.search(r'\sd="([^"]+)"', attrs)
        if d:
            fn = feld_fuer(kette)
            if fn is not None:
                ersetzt = svgpath.warp_path_d(d.group(1), fn)
                # d sucht INNERHALB von attrs - die Indizes sind schon relativ.
                attrs = attrs[:d.start(1)] + ersetzt + attrs[d.end(1):]
        out.append(f"<{tag}{attrs}{selbst}>")
        if tag == "g" and not selbst:
            stapel.append(eigen)
    out.append(txt[pos:])
    return "".join(out)


def szg(zahn: str) -> float:
    """Die von Dirk gesetzte Zahnhalslinie, samt etwaiger Ebenen-Verschiebung.

    Inkscape legt eine Verschiebung gern als `transform` auf die EBENE statt in
    die Koordinate - bei 51 und 52 genau so passiert.
    """
    txt = (ZEICHNUNGEN / f"{zahn}_zeichnen.svg").read_text()
    m = re.search(r'(<g[^>]*label="[^"]*SZG[^"]*"[^>]*>)(.*?)</g>', txt, re.S)
    if m:
        tr = re.search(r'transform="translate\(([-\d.]+),?\s*([-\d.]+)?\)"', m.group(1))
        dy = float(tr.group(2) or 0) if tr else 0.0
        return float(re.search(r'y1="([-\d.]+)"', m.group(2)).group(1)) + dy
    return float(re.search(r'<line[^>]*y1="([-\d.]+)"', txt).group(1))


# Zeilenzahl der Zuordnung, je Template gemessen. EINE Zahl passt nicht fuer
# alle: 65 Zeilen bringen den Sechsundvierziger von 6,56 auf 2,80 herunter und
# treiben den Sechser von 2,63 auf 7,73 mit zwei Ordnungspruengen hoch. Das
# haengt daran, wie die Zeilen auf die Zweigstruktur des jeweiligen Zahns
# fallen. Statt einen Mittelwert zu waehlen, der beiden schadet, steht hier je
# Template der gemessene Wert.
STUFEN = {"46": 65}


def umzeichnen(zahn: str, template: str, mit_ankern: bool, stufen: int | None = None) -> str:
    txt = (ASSETS / f"{template}.svg").read_text()
    alt = redraw.polygon(redraw.tooth_base_d(txt))

    zeich = (ZEICHNUNGEN / f"{zahn}_zeichnen.svg").read_text()
    umriss_d = _pfad(_ebene(zeich, "3 HIER ZEICHNEN"))
    dreh = rahmen_dreher(redraw.polygon(umriss_d), alt)   # Unterkiefer: siehe dort
    if dreh:
        umriss_d = svgpath.warp_path_d(umriss_d, dreh)
    neu = redraw.polygon(umriss_d)

    # Zuordnung ueber die HOEHE, nicht ueber die Bogenlaenge. Der erste Versuch
    # lief ueber den Umfang und scherte das Innere: die Pulpa kam 35 Prozent
    # kuerzer heraus und endete auf halber Wurzel. Siehe redraw.py.
    # Milchzaehne haben ihre eigene Spec-Tabelle - acht eigene Templates
    # (51-55, 71, 74, 75), nicht die milktooth-Ebenen im Nachfolger.
    s_spec = spec.SPEC_BY_KEY.get(template) or spec.PRIMARY_SPEC_BY_KEY[template]
    ya0, ya1 = float(alt[:, 1].min()), float(alt[:, 1].max())
    oben = zahn[0] in "12"
    cej_alt = ya0 + s_spec.root_frac * (ya1 - ya0) if oben \
        else ya1 - s_spec.root_frac * (ya1 - ya0)
    cej_neu = szg(zahn)
    if dreh:
        cej_neu = dreh(0.0, cej_neu)[1]

    # Der Bauplan kommt aus den Konturen selbst - siehe redraw.laufmarken.
    lm_alt, lm_neu = redraw.laufmarken(alt, neu)
    marken_alt, marken_neu = [cej_alt] + lm_alt, [cej_neu] + lm_neu
    if mit_ankern:
        aa = anker(ZEICHNUNGEN / f"{zahn}_anker_alt.svg")
        an = anker(ZEICHNUNGEN / f"{zahn}_anker_neu.svg")
        if dreh:
            an = {k: dreh(*v) for k, v in an.items()}
        for k in sorted(aa):
            if k.startswith("K") and k in an:
                marken_alt.append(aa[k][1])
                marken_neu.append(an[k][1])

    A, B = redraw.paare_ueber_hoehe(alt, neu, marken_alt, marken_neu,
                                    stufen=stufen or STUFEN.get(template, 40))
    zahn_feld = redraw.Spline(A, B, glaettung=1e-3)

    # Der GEZEICHNETE Umriss wird eingesetzt, nicht nachgebildet.
    #
    # Dirk, 17.08.2026: "46 Kontur, warum nachgezeichnet, warum nicht die blaue
    # Linie nutzen. Es ist doch eine korrekte Kontur vorhanden. Wo ist dein
    # Denkfehler?" - Der Denkfehler war, das Template auf seine Kontur zu ziehen
    # und das Ergebnis dann gegen genau diese Kontur zu messen. Dieser Umweg
    # kann nur verlieren: die Kauflaeche kam als Sehne heraus, die Kronenlinie
    # von 14, 15, 16 und 17 verstuemmelt. `tooth-base` IST seine Zeichnung.
    #
    # Das Feld wird weiterhin gebraucht, aber nur noch fuer das, wofuer es je
    # gedacht war - die rund zweihundert Ebenen, die niemand nachzeichnet.
    # Dieselbe Entscheidung wie bei der Pulpa, nur eine Ebene frueher.
    unberuehrt: set[str] = {"tooth-base"}
    txt = re.sub(r'(<path[^>]*\sid="tooth-base"[^>]*\sd=")[^"]+(")',
                 lambda m: m.group(1) + umriss_d + m.group(2), txt, count=1)
    if umriss_d not in txt:
        txt = re.sub(r'(<path[^>]*\sd=")[^"]+("[^>]*\sid="tooth-base")',
                     lambda m: m.group(1) + umriss_d + m.group(2), txt, count=1)
    if umriss_d not in txt:
        raise ValueError("tooth-base: Pfad nicht ersetzt")

    # Das Veneer wird NOCH NICHT abgeleitet - `veneer_aus` steht bereit, taugt
    # aber so nicht. Siehe dort.

    # Zweites Feld fuer die Pulpa: die pulpanahen Ebenen folgen Dirks
    # gezeichneter Kammer, nicht dem Aussenumriss. Ohne das traegt der Zahn
    # weiterhin die alte Pulpa, nur mitgezogen.
    pulpa_feld = None
    R_alt = None
    pz = ZEICHNUNGEN / f"{zahn}_pulpa_zeichnen.svg"
    if pz.exists():
        gez = re.findall(r'<path[^>]*\sd="([^"]+)"',
                         _ebene(pz.read_text(), "3 PULPA HIER ZEICHNEN"))
        if dreh:
            gez = [svgpath.warp_path_d(g, dreh) for g in gez]
        alt_d = pfade_von(txt, "tooth-healthy-pulp")
        if not alt_d:
            raise ValueError(f"{template}.svg: tooth-healthy-pulp nicht gefunden")
        if not gez:
            raise ValueError(f"{zahn}_pulpa_zeichnen.svg: nichts in der Zeichenebene")
        R_alt, R_neu = redraw.region(alt_d), redraw.region(gez)
        PA, PB = redraw.paare_ueber_hoehe(R_alt, R_neu, stufen=30)
        pulpa_feld = redraw.Spline(PA, PB, glaettung=1e-3)

        # Das Pulpafeld PRUEFEN, bevor rund zwanzig Ebenen darauf reiten.
        #
        # An den Milchmolaren 54 und 55 teilt sich die gezeichnete Pulpa ganz
        # anders auf als die des Templates - bei 54 findet die Zuordnung gar
        # keine gemeinsame Marke. Das Feld wird dann unbrauchbar, und mit ihm
        # flogen Wurzelresorption, Resektion und Wurzelfuellung bis zu 68
        # Einheiten neben den Zahn. Die gezeichnete Pulpa selbst merkt davon
        # nichts, weil sie eingesetzt und nicht gerechnet wird - der Fehler
        # steckt genau in dem, was man nicht zeichnet und deshalb nicht ansieht.
        #
        # Geprueft wird das Naheliegende: bleibt die alte Pulpa, durch das Feld
        # geschickt, in der Naehe der gezeichneten? Wenn nicht, ist das
        # Zahnfeld die bessere schlechte Antwort - eine etwas zu grosse Pulpa
        # im Zahn ist harmlos, eine neben dem Zahn nicht.
        umschlag = np.vstack(R_neu)
        breit = float(np.ptp(umschlag[:, 0])), float(np.ptp(umschlag[:, 1]))
        probe = np.vstack([np.asarray([pulpa_feld(x, y) for x, y in Q[::7]]) for Q in R_alt])
        daneben = min(
            float(probe[:, 0].min() - (umschlag[:, 0].min() - breit[0])),
            float((umschlag[:, 0].max() + breit[0]) - probe[:, 0].max()),
            float(probe[:, 1].min() - (umschlag[:, 1].min() - breit[1])),
            float((umschlag[:, 1].max() + breit[1]) - probe[:, 1].max()),
        )
        if daneben < 0:
            pulpa_feld = None

        # Die gezeichnete Pulpa wird EINGESETZT, nicht angenaehert (Dirk,
        # 17.08.2026: "Da steckt eine Menge Arbeit drin"). Sie geht als
        # Teilpfade in denselben Pfad, der den Umriss schon trug - id,
        # data-active und style bleiben, also auch der Fingerabdruck aus id,
        # Deckkraft und class. Beide Teilpfade laufen gleichsinnig und
        # ueberlappen nur an der Kammerdecke; unter der Nonzero-Regel gibt das
        # ihre Vereinigung und kein Loch.
        #
        # Das Feld bleibt trotzdem noetig: die abgeleiteten Ebenen - Pulpitis,
        # Wurzelfuellung, Stifte und die Zeichnung des Kammerbodens - muessen in
        # DIESE Form hinein, und die zeichnet niemand einzeln nach.
        ziel = umriss_id(txt, "tooth-healthy-pulp")
        eingesetzt = " ".join(svgpath.serialize(svgpath.to_absolute(g), 2) for g in gez)
        txt = re.sub(r'(<path[^>]*\sid="' + re.escape(ziel) + r'"[^>]*\sd=")[^"]+(")',
                     lambda m: m.group(1) + eingesetzt + m.group(2), txt, count=1)
        if eingesetzt not in txt:
            txt = re.sub(r'(<path[^>]*\sd=")[^"]+("[^>]*\sid="' + re.escape(ziel) + r'")',
                         lambda m: m.group(1) + eingesetzt + m.group(2), txt, count=1)
        if eingesetzt not in txt:
            raise ValueError(f"{ziel}: Pfad nicht ersetzt")
        unberuehrt.add(ziel)

        # Und die zweite Ebene der Pulpa, wo es sie gibt, wird die KAMMER -
        # siehe kammer_aus. Bisher war das die verzogene Kammerzeichnung des
        # Templates; sie sass kantig in einer Kammer, die sie nie gesehen hat.
        kammer = kammer_aus(redraw.region(gez))
        uebrig = [i for i, _ in elemente_von(txt, "tooth-healthy-pulp") if i != ziel]
        if kammer and len(uebrig) == 1:
            k = uebrig[0]
            txt = re.sub(r'(<path[^>]*\sid="' + re.escape(k) + r'"[^>]*\sd=")[^"]+(")',
                         lambda m: m.group(1) + kammer + m.group(2), txt, count=1)
            if kammer not in txt:
                txt = re.sub(r'(<path[^>]*\sd=")[^"]+("[^>]*\sid="' + re.escape(k) + r'")',
                             lambda m: m.group(1) + kammer + m.group(2), txt, count=1)
            if kammer not in txt:
                raise ValueError(f"{k}: Kammer nicht eingesetzt")
            unberuehrt.add(k)

        # Die GESUNDE Pulpa ist durchgehend blassrosa.
        #
        # Dirk, 17.08.2026: "Ich denke, das dunkle Rot ist die grafische Anzeige
        # der Pulpitis, ob jetzt reversibel oder irreversibel. Ich moechte alle
        # 'gesunden' Pulpen komplett in der blassrosa Farbe."
        #
        # Er hat es an der Kammer gesehen, die ich am Morgen auf seinen Wunsch
        # flaechig gefuellt hatte - und zwar in `tooth-healthy-pulp-1`, dem
        # dunkleren Rot des Templates. Ein Zahn ohne Befund sah damit aus, als
        # haette er eine Pulpitis. Die Entzuendung hat ihre eigenen, schaltbaren
        # Ebenen (`tooth-inflam-pulp-base-1/2`, #ffa46a und #ff422a); ein
        # zweiter Rotton in der gesunden Pulpa konkurriert damit.
        #
        # Ueber die FUELLUNG, nicht ueber das Weglassen der Ebene: id, Deckkraft
        # und class bleiben, und der Fingerabdruck kennt nur diese drei. Neben-
        # ertrag: die vier einwurzeligen Templates (11, 12, 13, 31) fuehren nur
        # EINEN Pulpapfad und hatten das dunklere Rot noch nie - jetzt stimmen
        # sie mit den uebrigen ueberein, ohne dass ihnen eine id hinzugefuegt
        # werden muesste.
        blass = re.search(r'<path[^>]*\sid="' + re.escape(ziel) + r'"[^>]*style="[^"]*?fill:\s*([^;"]+)',
                          txt)
        if blass:
            for i, _ in elemente_von(txt, "tooth-healthy-pulp"):
                if i == ziel:
                    continue
                txt = re.sub(r'(<path[^>]*\sid="' + re.escape(i) + r'"[^>]*style="[^"]*?fill:\s*)[^;"]+',
                             lambda m: m.group(1) + blass.group(1).strip(), txt, count=1)

    p_ids = set(pulpa_ebenen(txt)) if pulpa_feld else set()

    # Eine pulpanahe Ebene, die groesstenteils AUSSERHALB der Pulpa liegt, folgt
    # dem Zahn und nicht der Pulpa. Dieselbe Regel wie beim parapulpaeren Stift,
    # nur allgemein: das Pulpafeld gilt innerhalb der Pulpa, draussen
    # extrapoliert es. Am Milchmolaren 55 flogen Wurzelresorption und Resektion
    # so 68 Einheiten neben einen 30 Einheiten breiten Zahn - beides Formen, die
    # an der Wurzelspitze sitzen und die Pulpa nur streifen.
    if p_ids and R_alt is not None:
        for i in sorted(p_ids):
            punkte = [redraw.polygon(d) for d in pfade_von(txt, i)]
            if not punkte:
                continue
            P = np.vstack(punkte)[::5]
            drin = np.zeros(len(P), bool)
            for Q in R_alt:
                drin |= np.array([redraw._liegt_in(np.array([p]), Q) for p in P])
            if drin.mean() < 0.5:
                p_ids.discard(i)

    # Stifte: je Ebene eine eigene starre Abbildung, aus ihrer eigenen Achse.
    #
    # Wovon die Abbildung ausgeht, entscheidet die LAGE des Stiftes, nicht sein
    # Name. Ein Wurzelstift steckt im Kanal und folgt der Pulpa. Ein PARA-
    # pulpaerer Stift steckt daneben, im Dentin - mit dem Pulpafeld gerechnet
    # wanderte er am Sechser um 14 Einheiten nach mesial, weil ein Spline
    # ausserhalb seiner Stuetzstellen frei extrapoliert. Er gehoert ans
    # Zahnfeld.
    stift_feld = {}
    for i in set(pulpa_ebenen(txt)) | {i for i, _ in elemente_von(txt, "endos")}:
        if not STIFT_MUSTER.search(i):
            continue
        ds = pfade_von(txt, i)              # auch der Stift ist mal <g>, mal <path>
        if not ds:
            continue
        im_kanal = pulpa_feld is not None and not PARAPULPAL_MUSTER.search(i)
        basis = (lambda x, y: pulpa_feld(x, y)) if im_kanal else (lambda x, y: zahn_feld(x, y))
        stift_feld[i] = starr_aus(basis, np.vstack([redraw.polygon(d) for d in ds]))

    # Ein Implantat ist ein Fabrikteil und dehnt sich nicht mit der Wurzel, in
    # die es gesetzt wird - derselbe Satz wie beim Stift, nur groesser. Gemessen
    # am Sechser: das Zahnfeld zog den Koerper von 47 auf 96 Einheiten Laenge,
    # die Plattform elf Einheiten ueber die Schmelz-Zement-Grenze hinauf und das
    # apikale Ende unter den viewBox-Rand. `IMPLANT_CEJ_Y` in
    # src/perioGraphic.ts haengt genau an dieser Plattform - die Zervikallinie
    # der Parodontalkarte laege damit im Kronendrittel.
    #
    # Die ganze Gruppe `implant` bekommt EINE Abbildung, nicht jede Ebene ihre
    # eigene: Aufbau und Koerper sind zusammengeschraubt, und zwei getrennt
    # gerechnete Aehnlichkeiten fuehren sie auseinander. Der Knochenabbau am
    # Implantat faehrt mit, weil er um den Koerper herum gezeichnet ist.
    implantat_ebenen = ("implant", "peri-implant-bone-loss")
    ds = [d for i in implantat_ebenen for d in pfade_von(txt, i)]
    implantat_feld = (
        starr_aus(lambda x, y: zahn_feld(x, y), np.vstack([redraw.polygon(d) for d in ds]))
        if ds else None
    )

    def feld_fuer(kette):
        if any(k in redraw.NICHT_VERFORMEN or k in unberuehrt for k in kette):
            return None                      # Zahnfleisch, Knochen, gezeichnete Pulpa
        for k in kette:
            if k in stift_feld:
                return stift_feld[k]         # gerade bleiben, siehe STIFT_MUSTER
        if implantat_feld is not None and any(k in implantat_ebenen for k in kette):
            return implantat_feld
        if p_ids and any(k in p_ids for k in kette):
            return lambda x, y: pulpa_feld(x, y)
        return lambda x, y: zahn_feld(x, y)

    out = verforme_je_element(txt, feld_fuer)

    # Zahnfleisch und Knochen NEU zeichnen statt mitziehen. Sie gehoeren der
    # Spalte, nicht dem Zahn - die Papille ist zwischen zwei Nachbarn EINE
    # Struktur auf EINER Hoehe. gum.py zeichnet sie in Endkoordinaten.
    # Die Kaukante ist die GEZEICHNETE, nicht die des Rahmens.
    #
    # Bisher stand hier `hoehe - OCCL_MARGIN`, also die Stelle, an der die
    # Kauebene im Spender lag. Bei Dirks Zeichnungen liegt sie woanders -
    # gemessen zwischen 3,6 und 13,7 Einheiten ueber dem Rand, wo alle Spender
    # auf 8,00 liegen. Das Zahnfleisch wurde damit gegen eine Ebene gezeichnet,
    # die der Zahn gar nicht hat, und im Bogen nebeneinander streuten die
    # Kronen um zehn Einheiten. Beides faellt weg, wenn der Zahn selbst sagt,
    # wo seine Kaukante ist.
    vb = [float(v) for v in re.search(r'viewBox="([^"]*)"', txt).group(1).split()]
    # Gemessen wird die KURVE, nicht der abgetastete Polygonzug: `polygon`
    # setzt alle 0,35 Einheiten einen Punkt und trifft den Scheitel einer
    # Waelbung nur zufaellig. `curve_extent` nimmt dieselbe Ausdehnung, die
    # verify_redraw nachher prueft - sonst streut die Kauebene um genau die
    # Differenz zwischen zwei Messungen desselben Randes.
    occl = build.curve_extent(umriss_d)[3]
    # Und der Rahmen bekommt genau so viel Hoehe, dass diese Kante wieder
    # OCCL_MARGIN ueber seinem unteren Rand liegt. Nur die HOEHE waechst oder
    # schrumpft, der obere Rand bleibt stehen - so kann am Apex nichts
    # abgeschnitten werden, und keine einzige Koordinate wird angefasst.
    hoehe = occl + build.OCCL_MARGIN - vb[1]
    cx = float(np.mean([neu[:, 0].min(), neu[:, 0].max()]))
    band = neu[np.abs(neu[:, 1] - cej_neu) < 1.5]
    if len(band) < 2:
        band = neu
    neck_half = float(band[:, 0].max() - band[:, 0].min()) / 2.0
    out = build.replace_gum(out, occl, cej_neu, cx, neck_half, float(s_spec.col_px))

    # Den Anschluss der Approximalfuellungen an die okklusale NEU rechnen, so
    # wie das Zahnfleisch neu gezeichnet wird.
    #
    # Dirks Frage: "Mir ist auch nicht klar, wie die Fuellungsflaechen
    # abgeleitet werden, oder Inlays." Sie sind von Hand gezeichnet, in
    # tools/toothgen/source. Was der Generator daran tut, ist der Anschluss:
    # `fillings.stretch_to_band` zieht die mesiale und die distale Flaeche bis
    # an die okklusale, damit MO/OD/MOD als EINE Restauration erscheint, und
    # skaliert dabei um die Mittellinie der Krone - um so viel, wie die Krone
    # dort schmaler geworden ist.
    #
    # Der Anschluss haengt also an der Krone, und die ist jetzt Dirks. Gewarpt
    # traegt er weiter die Krone des SPENDERS, und der Uebergang sitzt daneben.
    # `connect_fillings` bekommt die Kaukante des NEUEN Zahns, nicht die Ebene
    # des Rahmens - gestreckt wird auf das okklusale Band dieses Zahns.
    out = build.connect_fillings(out, occl)
    out = re.sub(r'(viewBox=")[^"]*(")',
                 lambda m: f"{m.group(1)}{vb[0]} {vb[1]} {vb[2]} {hoehe:.2f}{m.group(2)}",
                 out, count=1)
    return _stempel(out, zahn, cej_neu)


def _stempel(txt: str, zahn: str, cej: float) -> str:
    """Den toothgen-Kopf auf die NEUE Geometrie setzen.

    Der Kopf des Spenders ueberlebt das Umzeichnen sonst unveraendert, und er
    ist kein Kommentar: `verify.py` liest `cej=` daraus, und aus denselben
    Zahlen kommen die Ankertabellen `CEJ_Y` und `IMPLANT_CEJ_Y` in
    `src/perioGraphic.ts`. Ein Spenderwert dort waere ein Anker auf einem Zahn,
    den es nicht mehr gibt - die Zervikallinie der Parodontalkarte laege am
    falschen Ort, und zwar genau an dem Zahn, dessen Umriss am staerksten vom
    Spender abweicht.

    `cej` ist die von Dirk GEZEICHNETE Schmelz-Zement-Grenze, dieselbe, an der
    das Feld aufgehaengt und das Zahnfleisch neu gezeichnet wurde; Apex und
    Kaukante werden am fertigen `tooth-base` gemessen. `drawn=` haelt fest,
    wessen Zeichnung das ist - `src=` nennt weiterhin die Schumacher-Quelle des
    Spenders, aus der die uebrigen 200 Ebenen stammen.
    """
    P = redraw.polygon(redraw.tooth_base_d(txt))
    apex, inc = float(P[:, 1].min()), float(P[:, 1].max())
    werte = {
        "apex": f"{apex:.2f}",
        "cej": f"{cej:.2f}",
        "occl": f"{inc:.2f}",
        "root_frac": f"{(cej - apex) / (inc - apex):.4f}",
        "length": f"{inc - apex:.2f}",
    }

    def setze(m: re.Match) -> str:
        s = m.group(0)
        for k, v in werte.items():
            s = re.sub(rf"\b{k}=[-\d.]+", f"{k}={v}", s)
        return s.replace("<!-- toothgen:", f"<!-- toothgen: drawn={zahn}", 1)

    return re.sub(r"<!-- toothgen:.*?-->", setze, txt, count=1, flags=re.S)
