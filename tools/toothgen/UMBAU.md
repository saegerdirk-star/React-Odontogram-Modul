# Anatomie-Umbau: Stand und naechste Schritte

Branch `feat/anatomie-neuzeichnung`, abgezweigt von `6f40991` (Version 2.13.1).
Stand 16.08.2026, 21:15.

## Wo wir stehen

**Das Werkzeug traegt, das Ergebnis fehlt.** Drei Commits, und **kein einziges
Template im Repo ist angefasst**. Der bisherige Ertrag ist ein Probelauf an 11,
der nach `/tmp/` ging.

Gruene Grundlinie vor dem Umbau, auf diesem Branch gemessen:

| | |
|---|---|
| `npm test` | 1976 gruen, 1 uebersprungen |
| `uv run tools/toothgen/verify.py` | All checks passed |
| `uv run tools/toothgen/check_roundtrip.py` | 4516 Pfade, Abweichung 0,0000 |

Die Zeichnungen liegen in `~/dev/Odontogram-Anatomie` (eigenes Repo, privater
Remote). Der Zeichenablauf steht dort in `ANLEITUNG.md`.

## 16 ist durchgelaufen (17.08.)

Sechs Fehler, fuenf davon still. Der Befund im Einzelnen steht im Commit
`286f983`; hier nur, was daraus fuer die uebrigen Zaehne folgt.

**Der Umriss sitzt.** Median 0,04 Einheiten Abstand zu Dirks Kontur,
Ordnungsspruenge 0 (vorher 7). Drei Wurzeln, richtige Krone.

**Die Pulpa nicht.** Sie liegt im Zahn und haengt zusammen, aber ihre Kanaele
sitzen noch nicht in ihren Wurzeln - der mittlere ist zu breit und beult nach
distal aus. Das ist der naechste Schritt.

**Dabei eine Frage an Dirk, die vieles einfacher machen koennte:** Dirk hat die
Pulpa GEZEICHNET. Fuer `tooth-healthy-pulp` liesse sie sich direkt einsetzen,
statt die alte Pulpa auf sie zu ziehen. Ein Feld braucht es dann immer noch fuer
die abgeleiteten Ebenen - Pulpitis, Wurzelfuellung, Stifte -, aber die koennten
aus SEINER Form abgeleitet werden statt aus der alten gewarpt. Das ist eine
Entscheidung, keine Rechnung.

**Die Dehnungspruefung taugt nicht als Kriterium.** Gemessen: die Variante ohne
jeden Anker hatte die gleichmaessigste Dehnung von allen (0,98 bis 1,01) und die
Furkation 15 Einheiten daneben. Die Anker sind ja gerade dazu da, eine
Ungleichmaessigkeit zu erzwingen. Was zaehlt:

1. **Abstand des geschriebenen Pfades zu Dirks Kontur** - dicht abgetastet, und
   zwar der PFAD, nicht das Feld. Am Feld gemessen kam Median 0,016 heraus,
   waehrend der Zahn sichtbar zerrissen war.
2. **Ordnungsspruenge** - laeuft der Bildpunkt auf der Zielkontur monoton
   weiter? Das ist die Zahl, die das Verheddern der Wurzeln sieht; jeder
   Abstandsmedian bleibt dabei klein, weil jeder Punkt nahe an IRGENDEINER
   Stelle der Zielkontur liegt.
3. **Faltung** - Jacobi-Determinante des Feldes, INNERHALB der Kontur
   abgetastet. Ausserhalb faltet ein Spline immer, das sagt nichts.
4. **Sitzt der Stift im palatinalen Kanal?** Oben palatinal, unten distal.
5. **Bild ansehen** und Dirk zeigen.

## Danach, der Reihe nach

1. **Die uebrigen 14 bleibenden Zaehne.** Ohne Anker: 11, 12, 13, 15, 41, 42,
   43, 44, 45. Mit Ankern: 14, 16, 17, 18, 46, 47, 48.
2. **Die 10 Milchzaehne.** Templates 51-55, 71, 74, 75; Zuordnung der Positionen
   siehe `PRIMARY_TEMPLATE` in `src/odontogram.ts`.
3. **Die 14 Kauflaechen** - und dafuer gibt es **noch kein Verfahren**. Ihr
   Umriss ist geschlossen und rund, ohne Wurzeln und ohne Zervikallinie; die
   Zuordnung ueber die Hoehe greift dort nicht. Fuer die Fissuren gibt es eine
   radiale Uebertragung (`fissuren_uebertragen.py` im Zeichnungs-Repo), fuer den
   Umriss noch nichts.
4. **Modelaenderungen** (Verhalten, nicht nur Geometrie):
   * eigene Templates fuer **18**, **43** und die unteren Praemolaren - dort
     bedient ein geteiltes Template messbar verschiedene Zaehne
   * die **vier Milchzahn-Kauflaechen** in den Code: `TEMPLATES_OCCL`
     erweitern, eine Zuordnung Position -> Milchzahn-Okklusaltemplate,
     `addRowOccl` auf den Zustand schauen lassen, Nachladen wie
     `syncToothTemplate`. Fuenfteilige Liste in `ANLEITUNG.md`.
   * **`spec.py` nachfuehren**: zwei Muster in den Wurzelanteilen deuten darauf
     hin, dass die Normwerte und nicht die Zeichnungen nachzuziehen sind.
   * **Digests neu einfrieren** in `verify.py` - einmal fuer alles, nicht pro
     Teillieferung.

## Kauflaechen: was eingesetzt wird und was abgeleitet gehoert

Entschieden am 17.08.2026, nachdem `FISSURE_ALLOWED` nachgesehen war.

**Die Fissurenlinien tragen keinen Befund.** `fissure` ist eine reine
Zeichenebene. Was einen Befund traegt, ist `fissure-sealing-occlusal` an
`state.fissureSealing` - und diese Flaeche muss AUF den Fissuren liegen.
`FISSURE_ALLOWED` ist `{16,17,26,27,36,37,46,47}`: nur erste und zweite
bleibende Molaren, keine Praemolaren, keine Achter, keine Milchzaehne. Die
Kopplung betrifft also genau VIER Kauflaechen-Templates. Ueberall sonst koennen
Dirks Fissuren eingesetzt werden, ohne dass etwas synchron zu halten waere.

**Praemolaren: Fissuren bleiben LEER.** Dirk hat sie bewusst ohne gezeichnet,
weil die alten Templates vom Oberkiefermolaren abgeleitet waren. Das Feld wuerde
sonst weiterhin das Molarenmuster auf einen Praemolarenumriss ziehen - genau der
Fehler, den er vermeiden wollte. Lieber eine glatte Kauflaeche als eine falsche.
Nachzuzeichnen, wenn Zeit ist.

**Zur Leitlinienlage**, weil sie beim Entscheiden aufkam: die S3-Leitlinie
"Fissuren- und Grübchenversiegelung" (AWMF 083-002) wurde im **Maerz 2025**
ueberarbeitet und empfiehlt die Versiegelung weiter, aber selektiv - tiefes
Fissurenrelief und erhoehtes Kariesrisiko. Nicht obsolet, aber auch nicht mehr
flaechendeckend.

## Fuellungsflaechen, Inlays, Veneers - offene Frage

Dirks Frage vom 17.08.2026: "Mir ist auch nicht klar, wie die Fuellungsflaechen
abgeleitet werden, oder Inlays. Bei Veneers ist es ganz einfach. Das Veneer
bedeckt die labiale Flaeche und die haben wir dargestellt/gezeichnet."

Nachgesehen: die Fuellungsflaechen sind in `tools/toothgen/source/*.svg` von
Hand gezeichnet, NICHT abgeleitet. Der Generator formt sie nur nach -
`fillings.stretch_to_band` zieht die mesiale und die distale Flaeche bis an die
okklusale, damit MO/OD/MOD als EINE Restauration erscheint, und skaliert dabei
"um die Mittellinie der Krone, um so viel wie die Krone dort schmaler geworden
ist". Der Generator weiss also bereits, wie eine Fuellungsflaeche der Krone zu
folgen hat.

Daraus folgt zweierlei, und beides ist noch NICHT getan:

  * Nach dem Umzeichnen muss `build.connect_fillings` neu laufen, so wie
    `build.replace_gum` schon neu laeuft. Sonst sitzt der Anschluss der
    Approximalflaechen an die okklusale noch an der Krone des SPENDERS.
  * Das Veneer ist der Fall, den Dirk gleich richtig benannt hat: es bedeckt die
    labiale Flaeche, und die IST der gezeichnete Kronenumriss. Es gehoert also
    abgeleitet und nicht gewarpt - dieselbe Konstruktion wie die Pulpakammer.
    Gemessen liegt die Veneerform an den Seitenzaehnen zu 0 Prozent auf der
    Kontur, vorher wie nachher; das ist Altbestand und faellt mit der Ableitung
    von selbst weg.

## Versiegelung: schon schmal, schon stimmig - und was wirklich offen ist

Dirk auf die Frage schmal oder breit: "auf jeden Fall schmal". Gemessen ist sie
das bereits. `fissure-sealing-occlusal` ist keine eigene Flaeche, sondern
DIESELBE Geometrie wie `fissure`, nur in Blau und mit 2 px Strichbreite
gezeichnet - der Abstand zwischen beiden ist 0,00. Sie ist also so schmal wie
die Fissurenlinie selbst und wandert mit ihr, ohne dass etwas abzuleiten waere.
Beide Gruppen enthalten ANONYME Pfade, ihr Inhalt ist damit auch frei
austauschbar, ohne einen Vertragswert zu beruehren.

Offen ist etwas anderes, und es ist mehr Arbeit als gedacht: **Dirk zerlegt die
Kauflaeche in FLAECHEN, das Template in LINIEN.** Seine Molarenzeichnungen
tragen neben dem Aussenumriss elf geschlossene Formen - die Hoecker. Das
Template zeichnet stattdessen die Fissuren als offene Striche. Die Fissur ist in
seiner Zerlegung die gemeinsame GRENZE zweier Hoecker, also der Teil einer
Hoeckerkontur, der nicht auf dem Aussenumriss liegt.

Das laesst sich ableiten - innere Grenzsegmente sammeln und zusammensetzen -,
ist aber eine eigene Konstruktion und kein Einsetzen. Solange sie nicht steht,
bleiben Fissuren und Versiegelung gewarpt, und beide bleiben zueinander
stimmig, weil sie dieselbe Geometrie sind.

## Beim Zusammenbau anzusehen: Neigungen

Dirk, 17.08.2026: "12 kippt mit der Wurzel nach mesial bzw. die Schneidekante
ist nicht voellig horizontal. Da muessen wir darauf achten, wenn alles
zusammengesetzt ist."

Einzeln faellt so etwas kaum auf, im Bogen nebeneinander sofort. Damit es beim
Zusammenbau nicht beim Eindruck bleibt, hier die Messung an allen 16 bleibenden
Templates. Die Kante ist die Ausgleichsgerade durch die untersten 5 Prozent der
Kontur; der Versatz ist der Abstand zwischen der Mitte der Wurzelspitze und der
Mitte der Krone, in Prozent der Zahnbreite. **Beides sind Kantenmasse, keine
Achsenmasse** - die Achse eines Zahns aus dem Umriss abzuleiten geht schief,
sobald eine Wurzel seitlich steht (siehe die Warnung weiter unten).

  Tpl   Kante      Versatz        Tpl   Kante      Versatz
   11    1,4 Grad    8,0 %         41    0,1 Grad   -5,4 %
   12    3,6 Grad   -8,4 %  <--    42   -1,0 Grad   18,5 %
   13   -1,6 Grad  -10,5 %         43   -0,5 Grad    8,1 %
   14   -1,9 Grad   -0,3 %         44    1,5 Grad    9,3 %
   15   -0,2 Grad   20,4 %  <--    45    4,0 Grad   20,1 %  <--
   16    2,9 Grad   -1,0 %         46   -2,5 Grad    3,0 %
   17    1,5 Grad    5,8 %         47   -1,1 Grad   -2,7 %
   18    2,1 Grad   -6,3 %         48   -1,4 Grad   -8,5 %

12 ist mit 3,6 Grad die zweitschiefste Kante, und der Versatz zeigt bei ihm nach
der anderen Seite als bei seinem Nachbarn 11 (-8,4 gegen +8,0 Prozent) - im
Bogen stehen die beiden Wurzeln damit auseinander. **15 und 45 haben mit 20
Prozent den groessten Versatz ueberhaupt**, 45 zusaetzlich die schiefste Kante;
die beiden sind also mindestens so genau anzusehen wie 12.

Was davon Anatomie ist und was eine schiefe Unterlage, entscheidet Dirk am
zusammengesetzten Bogen. Die Zahlen sind nur dazu da, dass die Frage nicht
verlorengeht und dass eine Korrektur nachher messbar ist.

## Was nicht verlorengehen darf

**Die Frontzahn-Differenz ist von rund 10 auf 13,9 mm gewachsen.** Die
Klasse-I-Verzahnung im Odontogramm faellt aus den Zahnbreiten heraus und aus
nichts sonst; waechst die Differenz, wandert die Spitze von 43 nach mesial und
trifft die Nische zwischen oberem Zweier und Eckzahn nicht mehr. Treiber ist 41
mit 15,1 Spalten-Pixel gegen 42 mit 17,5. Massstab dafuer ist Bild 105/106
(S. 130), liegt als `Okklusion Beziehungen.pdf` im Bilderordner. Details in
`ANLEITUNG.md`.

**Via falsa als eigener Befund** - offene Frage von Dirk. Waere eine neue Achse
im Zustandsmodell, kein Zeichenthema. Aufzurufen, wenn der Umbau durch ist.

**Milchzaehne bekommen nie einen Stift.** Die Milchzahn-Templates tragen die
Stiftebenen trotzdem, weil alle Templates denselben Ebenenbestand haben. Sie
werden nur nie aktiviert.

## Messdisziplin

Die harten Vertraege - id, class, opacity, `data-active`, viewBox,
Gradientenzahl - waren an 11 die ganze Zeit korrekt, auch als das Innere des
Zahns zerrissen war. **Sie sehen die klinisch wichtigen Fehler nicht.** Deshalb
je Zahn zusaetzlich:

* **Dehnung entlang der Achse** (soll nahe 1): war beim Bogenlaengen-Fehler 0,29
  in der Zahnmitte und 2,26 in der Krone.
* **Pulpa gegen die gezeichnete** (Abstand und y-Bereich): war 35 Prozent zu
  kurz und endete auf halber Wurzel.
* **Stifte gerade** (drei kollineare Punkte bleiben kollinear).

Und eine Warnung zu den Messungen selbst: drei eigene Pruefungen waren an einem
Tag falsch, alle mit demselben Muster - Punktvergleiche nach der adaptiven
Unterteilung von `warp_path_d`, waagerechte Schnitte bei gedrehtem Objekt,
Hauptkomponenten bei geaenderter Punktdichte. Wo eine Messung ueberrascht, erst
die Messung pruefen.
