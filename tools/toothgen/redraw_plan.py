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
    "84_occl": ("84", "46_occl"), "85_occl": ("85", "46_occl"),
}

# Praemolaren tragen KEINE Fissuren. Dirk hat sie bewusst ohne gezeichnet, weil
# die alten Templates vom Oberkiefermolaren abgeleitet waren; mitgezogen laege
# also weiterhin ein Molarenmuster auf einem Praemolaren. Lieber eine glatte
# Kauflaeche als eine falsche - nachzuzeichnen, wenn Zeit ist.
OHNE_FISSUREN = {"14_occl", "15_occl", "44_occl", "45_occl"}
