# Übergabe: schematische Ansicht – Zahnform D

Stand 25.09.2026. Entstanden im Canvas „Odontogramm-Schema Redesign“ (Claude Design), Zeichenflächen *Variante B*, *Variante C*, *Zahnform D*, *Zahnform D – Milchgebiss*, *Zahnform D – Wechselgebiss*. Vorschlagsort im Repo: `docs/design/schematic-form-d.md`.

Dirk hat entschieden: **Zahnform D** („anatomisch angedeutet“) mit der **Farbgebung von Variante B** (Material am Bogen zurückgenommen, Kürzelzeile). Variante C ist dieselbe Gestaltung als dunkles Thema. Die Entwürfe sind Vorlage, nicht Code: Alle Werte unten sind aus dem Referenzskript im Ordner `referenz/` erzeugt und so gemeint, wie sie dort stehen.

## Was sich ändert und was nicht

Unverändert bleiben: vier Reihen, Aufsichten innen, Zahnnummern Rücken an Rücken auf der Okklusionsebene, Mittellinie, Zellbreite 76 (Bogen 16 × 76 = 1216), Krone ⅖ zu Wurzel ⅗, Wurzelzahl je Zahn aus `rootsOf`, fünf Flächen m/o/d/v/l mit mesial zur Mitte, Tastenfeld, Zustand, Nutzlast, FHIR, anatomische Ansicht.

Neu sind die Umrissformen von Krone, Wurzel und Aufsicht (in `occlGeom` und der Wurzelgeometrie), die Farbwerte, eine Kürzelzeile, das „f“ für fehlende Zähne und die Auswahlpille an der Zahnnummer. Laut Marktschau sehen die SVG-Fingerabdrücke der Paritätstests die schematische Ansicht nicht; bitte trotzdem prüfen, bevor etwas angefasst wird.

## Koordinaten

Alle Maße im Zellsystem der bisherigen schematischen SVG: eine Zelle ist 76 breit. Seitenansicht in einem 100 hohen Feld, gezeichnet für den Unterkiefer (Krone oben, Kaukante bei y = 7, Zahnhals bei y = 41,4, Wurzelspitze bei y ≈ 93). Für den Oberkiefer wird dieselbe Geometrie mit `translate(0,100) scale(1,-1)` gespiegelt, wie heute. Aufsicht in einem Feld 76 × 68 (Mitte 38/34).

## Geometrie Form D (bleibendes Gebiss)

Zahnklassen: 1–2 Schneidezahn, 3 Eckzahn, 4–5 Prämolar, 6–8 Molar. **Neu gegenüber dem Übergabeblatt:** Der Eckzahn hat eine eigene Aufsicht (Raute). Das ist ein Vorschlag, den Dirk noch bestätigen soll; fällt er weg, nimmt der Eckzahn die Schneidezahn-Aufsicht.

#### Molar

```text
Krone (Seitenansicht):  M12,41.4 C8,34 6,26 7,18 Q10,6 22,7 Q31,8 38,13 Q45,8 54,7 Q66,6 69,18 C70,26 68,34 64,41.4 Z
Aufsicht:               M10,10 Q38,3 66,10 Q73,34 66,58 Q38,65 10,58 Q3,34 10,10 Z
Inneres Feld (o):       x 25–51, y 23–45, Radius 8
```

#### Prämolar

```text
Krone (Seitenansicht):  M23,41.4 C20,34 18,25 19,19 Q24,8 38,6 Q52,8 57,19 C58,25 56,34 53,41.4 Z
Aufsicht:               M15,34 A23,27 0 1 0 61,34 A23,27 0 1 0 15,34 Z
Inneres Feld (o):       x 30–46, y 24–44, Radius 7
```

#### Eckzahn

```text
Krone (Seitenansicht):  M25,41.4 C21,33 19,24 20,17 Q27,10 38,5 Q49,10 56,17 C57,24 55,33 51,41.4 Z
Aufsicht:               M14,34 Q20,17 38,13 Q56,17 62,34 Q56,51 38,55 Q20,51 14,34 Z
Inneres Feld (o):       x 28–48, y 29–39, Radius 5
```

#### Schneidezahn

```text
Krone (Seitenansicht):  M26,41.4 C22,32 20,20 20,10 Q20,7 23,7 L53,7 Q56,7 56,10 C56,20 54,32 50,41.4 Z
Aufsicht:               M11,28 Q38,12 65,28 Q62,46 38,51 Q14,46 11,28 Z
Inneres Feld (o):       x 23–53, y 29–37, Radius 3
```

Die Aufsicht der Schneide- und Eckzähne und die der Molaren wird für den **Unterkiefer vertikal gespiegelt** (um y = 34), damit die Labialwölbung nach außen zeigt. Der Prämolar ist symmetrisch.

Bei Front- und Eckzähnen liegt im inneren Feld zusätzlich die Schneidekante als waagerechte Linie (1,4).

### Wurzeln

Die Wurzeln setzen am **Zahnhals** an, der schmaler ist als die Krone, und enden an **Spitzen**, die bei Molaren weiter auseinanderliegen (Furkation):

| Klasse | Zahnhals x | Spitzen x |
|---|---|---|
| Molar | 12 – 64 | 13 – 63 (erste bis letzte Wurzel) |
| Prämolar | 23 – 53 | 26 – 50 |
| Eckzahn | 25 – 51 | 38 |
| Schneidezahn | 26 – 50 | 38 |

Der Hals wird in `n` gleich breite Abschnitte mit 2 Abstand geteilt (`n` aus `rootsOf`), die Spitzen gleichmäßig über den Spitzenbereich verteilt. Eine Wurzel mit Halsabschnitt `l…r` und Spitze `t`:

```text
M l,41.4  C l,60  t-4,80  t-1.6,90  Q t,93.5  t+1.6,90  C t+4,80  r,60  r,41.4 Z
```

Wurzelfüllung: Linie vom Halsmittelpunkt `((l+r)/2, 43)` zur Spitze `(t, 89)`. Stift: dieselbe Linie bis zur halben Strecke (y 66).

### Flächen der Aufsicht

Jede Fläche ist ein Viereck von zwei Ecken des Umrissrahmens (Bounding Box der Aufsicht, um 3 erweitert) zu zwei Ecken des inneren Feldes, **auf die Aufsicht geclippt**. Die vier Trennlinien laufen durchgehend von den Ecken des inneren Feldes bis zum Rahmen (heute enden sie als kurze Striche). Eine Geometriequelle für Zeichnung, Flächenfüllung und Klickzonen, wie in `occlGeom` angelegt.

Zuordnung Fläche → Seite:

| | oben | unten | zur Mitte | nach außen |
|---|---|---|---|---|
| Oberkiefer (Q1, Q2, Q5, Q6) | v | l | m | d |
| Unterkiefer (Q3, Q4, Q7, Q8) | l | v | m | d |

**Testfall:** Die Milchzahnquadranten 5–8 müssen genauso behandelt werden wie 1–4. Im Referenzskript fehlte das zunächst, und die distale Karies an 54 landete mesial. Bitte als eigenen Test aufnehmen: `54 c do` färbt die Fläche an der **Außenseite** des Bogens.

## Milchzähne

Milchzähne werden aus der Form D des bleibenden Gegenstücks abgeleitet (Milchmolar 4/5 → Molar, Eckzahn → Eckzahn, Schneidezahn → Schneidezahn), nicht eigens gezeichnet:

- **Krone und Wurzel horizontal** um x = 38 skaliert: Molar 0,84, Eckzahn und Schneidezahn 0,86.
- **Vertikal kronenbetont:** Krone y 7…41,4 → 7…37,86 (Faktor 0,897), Wurzel 41,4…93 → 37,86…74 (Faktor 0,70). Das entspricht der bisherigen Milchzahnhöhe.
- **Milchmolaren gespreizt:** Spitzen bei 9 – 67, also außerhalb der Krone; Oberkiefer 3 Wurzeln, Unterkiefer 2.
- **Aufsicht** gleichmäßig um (38/34) auf 0,82 skaliert, inneres Feld mit.

## Zustände

- **Fehlend:** keine Seitenansicht, stattdessen „f“ in 32 px, halbfett, zentriert auf Kronenhöhe. In der Aufsicht nur ein blasser gestrichelter Umriss (1,2, Strich 3 4).
- **Nicht durchgebrochen:** voller Umriss gepunktet (1,7, Strich 0.1 4, runde Enden), dunkler als heute, und **10 tiefer in den Kiefer** versetzt (vom Okklusionsniveau weg).
- **Krone:** Krone der Seitenansicht und ganze Aufsicht im Ton „versorgt“, Umriss als Ring in der Kantenfarbe (Seitenansicht 2,6, Aufsicht 3,4). Trennlinien bleiben dünn darüber.
- **Füllung:** Fläche im Ton „versorgt“ mit Kante 1,6.
- **Karies:** Fläche in Kariesrot mit dunkler Kante 1,2. Bleibt die einzige gesättigte Flächenfarbe.
- **Extraktion (x):** zwei Linien über die Seitenansicht, 2 breit.
- **Brücke:** Verbinder zwischen den Aufsichten (Höhe 10, auf halber Höhe) und zwischen den Kronen der Seitenansicht, im Ton „versorgt“.
- **Gewählter Zahn:** Nummer als Pille (34 × 19, Radius 9,5) in Linienfarbe, Ziffer weiß. Ersetzt den blauen Spaltenrahmen nicht zwingend, ist aber der Hauptmarker.

## Kürzelzeile

Zwischen Seitenansicht und Aufsicht, je Kiefer eine Zeile von 36 Höhe, je Zahn eine zentrierte Zelle, Monospace 12 px, halbfett, bis zu zwei Zeilen (Versorgung/Material, darunter Endo und Sonstiges). Kariescodes in einer eigenen Farbe. Die Kürzel an der Krone (K/B/V) entfallen damit.

**Offen für Dirk:** Die Kürzel im Entwurf (`K G`, `Kst do`, `Am m`, `V Ker`, `WF St`, `GIZ o`) sind Platzhalter. Laut Übergabeblatt ist großes K in charly Kunststoff, nicht Krone. Die Zeile muss das echte charly-Vokabular zeigen, dieselbe Schreibweise wie die Ablesezeile („cK3 mo“).

## Maße der Anordnung (Variante B)

Von oben: Seitenansicht OK 0–100, Kürzelzeile OK 100–136, Band beginnt 136, Aufsicht OK 136, Nummern OK Grundlinie 218, Nummern UK 238, Aufsicht UK 244, Band endet 312, Kürzelzeile UK 308–344, Seitenansicht UK 344–444. Gesamthöhe mit Rand 458. Das Band ist ein Rechteck mit Radius 14 über die volle Breite hinter den Aufsichten und Nummern.

## Farben

`--odon-*`-Namen sind Vorschläge; bitte an das bestehende Schema in `src/theme.ts` anpassen.

| Rolle | Hell | Dunkel |
|---|---|---|
| Grund | `#f3f6fb` | `#11151b` |
| Band hinter den Aufsichten | `#e5eaf1` | `#181e27` |
| Zahnfüllung | `#ffffff` | `#eef1f5` |
| Zahnumriss (2 / Aufsicht 1,9) | `#26344d` | `#0b0e12` |
| Trennlinien, inneres Feld | `#26344d`, 80 % | `#5b677a`, 80 % |
| Zahnnummer (14 px, 600) | `#34425a` | `#c5cdd8` |
| Auswahlpille / Ziffer | `#26344d` / `#ffffff` | `#eef1f5` / `#11151b` |
| Mittellinie | `#b3bdcb` | `#3a4352` |
| Versorgt: Fläche / Kante | `#aab8ca` / `#4f6179` | `#9aabc2` / `#43556e` |
| Karies: Fläche / Kante | `#d32f2f` / `#8e1b1b` | `#e5392e` / `#8e1b1b` |
| Wurzelfüllung (3,6) | `#e07b16` | `#f28c28` |
| Stift (4,6) | `#6b737b` | `#7d858c` |
| Extraktion | `#b70000` | `#ff5a4f` |
| „f“ fehlend | `#56657c` | `#95a0b0` |
| Umriss fehlend (Aufsicht) | `#c3cbd6` | `#3a4352` |
| Nicht durchgebrochen | `#5f6e85` | `#a3adbb` |
| Kürzelzeile / Kariescode | `#26344d` / `#b3261e` | `#d2d9e3` / `#ff8a80` |
| Implantat Fläche / Kante | `#dfe4e8` / `#6b737b` | `#8d96a1` / `#7d858c` |

Kontrast (WCAG): Zahnnummer auf Band 8,4 : 1 (heute 3,4 : 1), Kariescode 6,0 : 1, „f“ 5,5 : 1; dunkel: Nummer 10,4 : 1, Kürzel 12,9 : 1, Kariescode 8,0 : 1. Alle über 4,5 : 1.

Das dunkle Thema ist ein eigener Merkmalssatz, keine Invertierung (wie in der derec-Notiz vorgeschlagen).

## Material am Bogen

Variante B zeigt am Bogen nur „versorgt“. Die Materialfarben (Gold, Amalgam, Kunststoff, Keramik, Zirkon, Gradia) wandern in die Kürzelzeile und später in die Einzelzahnansicht. Falls Dirk das Material am Bogen doch behalten will, liegt als Alternative Variante A im Canvas: Materialtöne nach Helligkeit gestaffelt, Keramik schraffiert, jede Versorgung mit dunklerer Kante im eigenen Ton. Als Schalter umsetzbar, weil nur die Füllfarben wechseln.

## Referenz

`referenz/` enthält die drei Python-Skripte, mit denen die Entwürfe erzeugt wurden (`gen.py` Daten und Farben, `gen2.py` Formen D/E/F, `gen3.py` Milch- und Wechselgebiss). Sie sind ein Nachschlagewerk für Werte und Pfade, kein Vorbild für die Umsetzung in React. Dazu die fertigen SVGs der Entwürfe.

## Offene Punkte für Dirk

1. Eckzahn mit eigener Aufsicht (Raute) – ja oder nein.
2. Kürzelzeile im echten charly-Vokabular; K-Konflikt Krone/Kunststoff.
3. Material am Bogen zurücknehmen (B) oder behalten (A) – oder als Einstellung.
4. Blauer Spaltenrahmen bei Auswahl zusätzlich zur Pille oder nur die Pille.
