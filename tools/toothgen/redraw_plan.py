# Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
# Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
# Dirk Saeger, Malte Sussdorff 2026

"""Welche Zeichnung und welcher Spender hinter jedem Template stehen.

Dirk, 17.08.2026: "Wir haben Zeichnungen fuer je 2 mal 8 bleibende Zaehne und
2 mal 5 Milchzaehne und diese Templates benutzen wir auch. Die Logik muss
demnach geaendert werden."

Bis dahin teilten sich mehrere Positionen ein Template: 18 zeichnete sich als
17, 43 als oberer Eckzahn, die unteren Praemolaren als 15, der untere
Milcheckzahn sogar als OBERER (53). Das war eine Notloesung, solange es neun
Zeichnungen gab. Jetzt gibt es 26 plus 14 Kauflaechen, und jede Position bekommt
ihre eigene. Die Gegenseite entsteht weiterhin durch Spiegeln (21 aus 11, 31 aus
41, 61 aus 51, 71 aus 81) - nur wird nicht mehr ueber die Kiefermitte hinweg
geteilt.

SPENDER: ein neues Template hat noch keine Datei, aus der die rund 200
klinischen Ebenen kommen koennten. Sie kommen vom naechsten Verwandten - dem
Zahn derselben Klasse, dessen Ebenenbestand passt. Der Umriss und die Pulpa
stammen ohnehin aus Dirks Zeichnung; der Spender liefert nur, was niemand
zeichnet. Die Spender liegen in `tools/toothgen/spender`, NICHT bei den
ausgelieferten Templates - siehe build.SPENDER.

Dieses Modul haelt die beiden Tabellen ALLEIN, ohne numpy und ohne Generator:
`verify_redraw.py` liest den Spender jedes Templates hier ab, und eine Pruefung
soll nicht den Erzeuger laden muessen, den sie prueft.
"""
from __future__ import annotations

# Ziel-Template -> (Zeichnung, Spender, Anker vorhanden)
PLAN: dict[str, tuple[str, str, bool]] = {
    # Oberkiefer, bleibend
    "11": ("11", "11", False),
    "12": ("12", "12", False),
    "13": ("13", "13", False),
    "14": ("14", "14", True),
    "15": ("15", "15", False),
    "16": ("16", "16", True),
    "17": ("17", "17", True),
    "18": ("18", "17", True),
    # Unterkiefer, bleibend
    "41": ("41", "31", False),
    "42": ("42", "31", False),
    "43": ("43", "13", False),
    "44": ("44", "15", False),
    "45": ("45", "15", False),
    "46": ("46", "46", True),
    "47": ("47", "46", True),
    "48": ("48", "46", True),
    # Oberkiefer, Milch
    "51": ("51", "51", False),
    "52": ("52", "52", False),
    "53": ("53", "53", False),
    "54": ("54", "54", False),
    "55": ("55", "55", False),
    # Unterkiefer, Milch
    "81": ("81", "71", False),
    "82": ("82", "71", False),
    "83": ("83", "53", False),
    "84": ("84", "74", False),
    "85": ("85", "75", False),
}

# Ziel -> (Zeichnung, Spender)
PLAN_OCCL: dict[str, tuple[str, str]] = {
    "14_occl": ("14", "14_occl"), "15_occl": ("15", "14_occl"),
    "16_occl": ("16", "16_occl"), "17_occl": ("17", "16_occl"),
    "18_occl": ("18", "16_occl"),
    "44_occl": ("44", "34_occl"), "45_occl": ("45", "34_occl"),
    "46_occl": ("46", "46_occl"), "47_occl": ("47", "46_occl"),
    "48_occl": ("48", "46_occl"),
    # Die Milchmolaren nehmen den MOLAREN als Spender, nicht den Praemolaren -
    # auch der erste. Dirk, 17.08.2026: "84 und 54 haben das Template vom
    # Praemolaren, richtig? Da wuerde ich vorschlagen, dass wir das von 85 / 55
    # nutzen." Ein erster Milchmolar ist ein Molar; sein Fissurenmuster ist
    # keines mit zwei Hoeckern. Dieselbe Korrektur hatte er in der
    # Seitenansicht schon einmal angesagt.
    "54_occl": ("54", "16_occl"), "55_occl": ("55", "16_occl"),
    # FRONTZAHN-DRAUFSICHT, ab 18.08.2026. Dirk, nachdem charlys Weg (ein
    # geteiltes Schemafeld) verworfen wurde: "Wir bauen eine Draufsicht." Die
    # Tafeln der Odontographie tragen sie als Bild 32 d, samt Beschriftung
    # vestibulaer/lingual/mesial/distal - die Orientierung steht dort und wird
    # nicht geschlossen. Dirk beschriftet seine Zeichnung zusaetzlich mit `v`
    # und `m`.
    #
    # SPENDER ist der obere erste Praemolar: von allen Kauflaechenvorlagen hat
    # er den einfachsten Umriss und die wenigsten Hoecker. Was an ihm
    # Molarenanatomie ist, wird geleert - von seinen 144 Elementen haengen nur
    # 16 daran, die uebrigen 128 gehen unveraendert mit.
    "11_occl": ("11", "14_occl"), "12_occl": ("12", "14_occl"),
    "13_occl": ("13", "14_occl"),
    "41_occl": ("41", "34_occl"), "42_occl": ("42", "34_occl"),
    "43_occl": ("43", "34_occl"),
    # Milchfrontzaehne, 19.08.2026. Dieselben Spender wie die bleibenden
    # Frontzaehne: der Spender liefert die rund 200 klinischen Ebenen, die Form
    # kommt aus der Zeichnung. Tafeln: Bild 85/86 (51/52), 89 (53), 87/88
    # (81/82), 90 (83) - jede mit `d von okklusal`.
    "51_occl": ("51", "14_occl"), "52_occl": ("52", "14_occl"),
    "53_occl": ("53", "14_occl"),
    "81_occl": ("81", "34_occl"), "82_occl": ("82", "34_occl"),
    "83_occl": ("83", "34_occl"),
    "84_occl": ("84", "46_occl"), "85_occl": ("85", "46_occl"),
}

# Leer, und das ist der Endstand. Einen Zug lang standen die vier Praemolaren
# hier drin: ihre Fissuren wurden geleert statt mitgezogen, weil die alten
# Templates vom Oberkiefermolaren abgeleitet waren und ein Molarenmuster auf
# einem Praemolarenumriss laege. Nachgesehen war die Voraussetzung falsch - in
# `14_occl_zeichnen.svg` und `15_occl_zeichnen.svg` stehen je sechs Pfade in der
# Zeichenebene, ein Aussenumriss und fuenf Innenformen, wo der Molar zwoelf
# traegt. Dirk, 17.08.2026: "Fissuren sind in die 4 Templates eingezeichnet."
# Sein Relief war da, es wurde nur weggeworfen.
OHNE_FISSUREN: set[str] = set()


# Der Spalt zwischen zwei Kacheln (`gap` an `.tooth-arch` in src/index.css).
GRID_GAP = 4.0

# Die Spalte, in der jede Position steht, in CSS-Pixeln - und zwar so, dass sich
# die Nachbarn an ihren KONTAKTPUNKTEN beruehren.
#
# Dirk, 17.08.2026: "Kannst du die Zaehne so zusammenruecken, dass sie sich an
# den Kontaktpunkten beruehren?"
#
# Die Spalte ist die groesste mesiodistale Kronenbreite der GEZEICHNETEN Kontur
# (gemessen zwischen Schmelz-Zement-Grenze und Kaukante) minus dem Spalt, damit
# Spalte plus Spalt genau die Kronenbreite ergibt. Eine Regel, kein von Hand
# gesetzter Wert - dieselbe Bauart wie vorher, nur ohne den Zuschlag.
#
# Warum es noetig war: die alten Spalten stammten aus den ALTEN Templates. An
# der neu gezeichneten Kontur gemessen hatte der obere Schneidezahn 27 px Luft
# und der Sechser 14 - die Front stand auseinander, die Molaren standen fast
# zusammen. Genau das war im Bogen zu sehen.
#
# Die Klasse-I-Verzahnung faellt weiterhin aus den Zahnbreiten heraus und aus
# nichts sonst: der Zuschlag war auf beiden Seiten jedes Kontakts gleich und hob
# sich auf, also aendert sein Wegfall nichts an der Beziehung - nur der Bogen
# wird um die Summe der Zuschlaege schmaler.
# Und ein ZUSCHLAG auf jede Spalte, gleich gross fuer alle.
#
# Dirk, 17.08.2026: "Wir rutschen die Zaehne wieder etwas auseinander, dann ist
# mehr Platz fuer die okklusalen Ansichten." Bei 0 beruehren sich die Kronen an
# den Kontaktpunkten - das war der Ausgangspunkt und er stimmte -, aber die
# Kauflaeche muss in denselben Abstand passen, und an der engsten Stelle des
# Bogens blieben ihr 33 px.
#
# Gleich gross fuer alle ist die Bedingung, unter der die Klasse-I-Verzahnung
# erhalten bleibt: derselbe Zuschlag liegt auf BEIDEN Seiten jedes Kontakts und
# hebt sich auf, also bleibt zwischen 13 und 43 die anatomische Differenz
# stehen. Ein von Hand je Zahn gesetzter Wert taete genau das nicht.
ZUSCHLAG = 8

_KRONE: dict[int, int] = {
    11: 31, 12: 28, 13: 31, 14: 31, 15: 27, 16: 54, 17: 50, 18: 46,
    41: 20, 42: 24, 43: 29, 44: 26, 45: 33, 46: 58, 47: 53, 48: 50,
}
SPALTEN: dict[int, int] = {k: v + ZUSCHLAG for k, v in _KRONE.items()}

# Eine Zeichnung, die im Bogen zu schief steht, um eine Zehntel Grad genau
# gedreht - in Grad, gegen den Uhrzeigersinn im Bildrahmen.
#
# Dirk, 17.08.2026: "12 und 22 stehen zu gekippt." (22 ist dieselbe Zeichnung
# gespiegelt, eine Korrektur trifft beide.) Gemessen stand 12 mit 4,3 Grad
# schiefer Schneidekante und -25,4 % Wurzelversatz im Bogen - der groesste
# Versatz ueberhaupt, und der Nachbar 11 kippt mit +6,4 % zur ANDEREN Seite.
# Gedreht wird auf die waagerechte Schneidekante: das ist ein Kantenmass und
# damit belastbar, waehrend eine aus dem Umriss abgeleitete ACHSE dort schief
# geht, wo eine Wurzel seitlich steht.
#
# NOCH LEER, und das ist ein Befund: an 12 widersprechen sich die beiden Masse.
# Die Schneidekante steht 4,3 Grad schief, der Wurzelversatz betraegt -25,4 %,
# und sie zeigen in ENTGEGENGESETZTE Richtungen. Eine Drehung kann nur eines von
# beiden richten - auf die waagerechte Kante gedreht wandert die Wurzel noch
# weiter hinaus, auf die zentrierte Wurzel gedreht steht die Kante bei fast zehn
# Grad. Welches von beiden "zu gekippt" meint, entscheidet Dirk am Bild.
NEIGUNG: dict[str, float] = {
}


# Kauflaechen-Zeichnungen, die vestibulaer/palatinal vertauscht vorliegen und
# vor dem Einsetzen an der waagerechten Achse gespiegelt werden.
#
# Dirk, 17.08.2026: "Bei den oberen Praemolaren sind vestibulaer und palatinal
# vertauscht." Kein Drehfehler: `dreher` in redraw_occl.py prueft nur "gedreht
# oder nicht", und eine 180-Grad-Drehung wuerde mesial/distal mit vertauschen -
# das stimmt aber. Vertauscht ist allein die zweite Achse, und dafuer gibt es
# nur die Spiegelung.
#
# LEER, und das ist der Endstand. Drei Runden lang stand hier etwas drin -
# erst die oberen Praemolaren, dann alle vier, dann der ganze Unterkiefer - und
# jedes Mal lag es daneben, weil ich an der falschen Stelle gedreht habe.
#
# Die Zeichnungen liegen bereits anatomisch richtig: Oberkiefer bukkal oben,
# Unterkiefer bukkal unten, mesial bei beiden rechts (abgelesen von den
# Schumacher-Scans in den Zeichnungen selbst). Genau so gehoeren sie auch in den
# Bogen - fuer den rechten Quadranten ohne jede Transformation, fuer den linken
# nur gespiegelt. Was fehlte, war nicht eine Spiegelung beim Erzeugen, sondern
# die 180-Grad-Drehung im Bogen wegzunehmen: sie stammte aus der Zeit, als die
# unteren Kauflaechen vom OBERKIEFER-Template geliehen waren.
SPIEGELN_OCCL: set[str] = set()


# Die Hoehe der Schmelz-Zement-Grenze ueber der GEZEICHNETEN Kaukante, je
# Position, in Template-Einheiten. Gemessen am 20.08.2026 aus dem
# `toothgen:`-Stempel der ausgelieferten Vorlagen (`occl` minus `cej`) - also
# aus Dirks Zeichnungen und nicht aus einer Norm.
#
# Wozu: das Zahnfleischband haengt daran. Bis heute stand seine apikale Kante
# auf EINER Zahl fuer den ganzen Bogen (`gum.CREST_H`), die Zervikallinie aber
# streut zwischen 21,9 (41) und 28,6 (43) - und bei den Milchzaehnen bis auf
# 16,1 herunter. Ein gerader Kamm unter einer gewellten Zervikallinie ergibt ein
# Band, das an 41 achteinhalb Einheiten hoch ist und am Nachbarn 43 zwei; an
# einem Milchschneidezahn stand die Papille sogar APIKAL des eigenen Randes, die
# Girlande lief also verkehrt herum.
#
# Die Tabelle ist eingefroren wie `_KRONE`, und `verify_redraw.py` misst sie
# gegen die Vorlagen nach. Sie steht hier und nicht im Generator, damit eine
# Pruefung sie lesen kann, ohne einen Generator zu laden.
ZERVIKAL: dict[int, float] = {
    11: 24.69, 12: 27.51, 13: 26.98, 14: 24.25,
    15: 23.74, 16: 27.62, 17: 27.78, 18: 23.88,
    41: 21.93, 42: 22.80, 43: 28.57, 44: 25.03,
    45: 24.44, 46: 27.49, 47: 24.17, 48: 22.98,
    51: 20.12, 52: 16.33, 53: 21.14, 54: 16.48, 55: 16.17,
    81: 16.09, 82: 16.88, 83: 20.80, 84: 16.47, 85: 21.03,
}


def nachbarn(pos: int) -> tuple[int, int]:
    """Die beiden Nachbarn im Bogen: (distal, mesial).

    Im Rahmen einer Zeichnung liegt MESIAL rechts. Beide ausgelieferten Saetze
    sind Quadrant 1 und Quadrant 4, die Gegenseite entsteht durch Spiegeln, und
    in beiden faellt die Mitte des Bogens nach rechts.

    An den beiden Enden gibt es keinen Nachbarn, und der Zahn ist sein eigener:

    * ueber die Mittellinie hinweg steht der gespiegelte Zwilling (21 neben 11),
      der dieselbe Zeichnung ist und damit dieselbe Zervikallinie hat - das
      Gelenk stimmt also von selbst;
    * am hinteren Ende hoert der Bogen auf.

    Ein Milchzahn bekommt Milchzahn-Nachbarn. Im WECHSELGEBISS steht er
    tatsaechlich neben einem bleibenden, und dort springt die Linie - so wie sie
    im Mund an dieser Stelle auch springt.
    """
    q, p = divmod(pos, 10)
    letzte = 5 if q >= 5 else 8
    mesial = pos - 1 if p > 1 else pos
    distal = pos + 1 if p < letzte else pos
    return distal, mesial
