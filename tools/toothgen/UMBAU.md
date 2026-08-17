# Anatomie-Umbau: Stand und naechste Schritte

Branch `feat/anatomie-neuzeichnung`. Stand 17.08.2026, Abend.

## SOFORT LESEN: hier geht es weiter

**40 Templates sind fertig erzeugt und liegen in `/tmp/Neu`** - 16 bleibende
Seitenansichten, 10 Milchzaehne, 14 Kauflaechen. **Kein einziges ist im Repo.**
Erzeugt werden sie mit zwei Aufrufen, beide wiederholbar:

```
python3 tools/toothgen/redraw_alle.py /tmp/Neu     # 26 Seitenansichten
python3 tools/toothgen/redraw_occl.py  /tmp/Neu    # 14 Kauflaechen
```

Beide Skripte tragen ihren Plan als Tabelle (`PLAN`): je Ziel die Zeichnung und
den SPENDER, von dem die rund 200 klinischen Ebenen kommen. Dauer zusammen etwa
vier Minuten.

Der Modellumbau selbst ist NICHT begonnen. Er ist als EIN Block zu machen,
sonst muessen die Digests zweimal eingefroren werden. Reihenfolge:

1. **Die 40 Dateien nach `src/assets/teeth-svgs`.** Dabei ausmustern: `31.svg`,
   `71.svg`, `74.svg`, `75.svg`, `34_occl.svg` - ihre Positionen haben jetzt
   eigene Templates.
2. **`src/odontogram.ts`**: `TOOTH_TEMPLATE` auf je eine Position (11-18 und
   41-48, Gegenseite weiter durch `mirror`), `PRIMARY_TEMPLATE` auf 51-55 und
   81-85, `OCCLUSAL_TEMPLATE` auf die 14. Der untere Milcheckzahn lief bisher
   auf dem OBEREN (53) - das ist der auffaelligste Einzelfall.
3. **`src/perioGraphic.ts`**: die `TemplateNo`-Union erweitern. Der Compiler
   erzwingt danach beide Ankerkarten (`CEJ_Y`, `IMPLANT_CEJ_Y`) - je Template
   ein Wert, gemessen an der koronalen Kante von `gum-base`.
4. **`tools/toothgen/spec.py`**: Eintraege fuer die neuen Templates in `SPECS`
   und `PRIMARY_SPECS`, `col_px` gegen `grid-template-columns` in
   `src/index.css` pruefen (verify.py tut das).
5. **Digests EINMAL neu einfrieren** in `verify.py`, dann `npm test`,
   `npx tsc -b --noEmit`, `check_roundtrip.py`, `npm run build`.
6. **Die Parity-Fingerabdruecke** aendern sich zwangslaeufig - sie haengen an
   den alten Templates. Die Verschiebung VORLEGEN, nicht stillschweigend neu
   einfrieren; sonst ist genau die Pruefung wertlos, die vor unbemerkten
   Aenderungen schuetzt.
7. **Die Boegen zusammengesetzt ansehen lassen.** Alle ernsten Fehler dieses
   Tages haben so angefangen, und kein einziger haette ein Tor rot gemacht.

## Die Regel, aus der alles andere folgt

**Was gezeichnet ist, wird EINGESETZT. Gewarpt wird nur, was niemand zeichnet.**

Erst galt sie fuer die Pulpa, dann fuer den Zahnumriss, dann okklusal. Jeder
Fehler dieses Tages, der etwas gekostet hat, kam daher, dass sie an einer Stelle
noch nicht galt. Umgekehrt gilt sie NICHT unbegrenzt: das Veneer sollte nach
demselben Muster abgeleitet werden und wurde dadurch schlechter - siehe
`veneer_aus`.

## Was heute gemessen wurde und was es wert war

Die harten Vertraege - id, class, opacity, `data-active`, viewBox,
Gradientenzahl - waren an jedem einzelnen Fehler dieses Tages GRUEN. Sie sehen
die klinisch wichtigen Fehler nicht. Was sie sieht:

* **Ueberstand** - wie weit ragt eine Ebene ueber den Zahn hinaus. Fand die
  Frontzaehne mit 63 Einheiten Ausreisser und die Milchmolaren mit 68.
* **Ordnungsspruenge** - laeuft der Bildpunkt monoton auf der Zielkontur
  weiter? Sieht das Verheddern der Wurzeln, das jeder Abstandsmedian verdeckt.
* **Faltung** - Jacobi-Determinante INNERHALB der Kontur.

Und drei Warnungen zu den Messungen selbst, alle heute bezahlt:

* Eine Kennzahl, die ihr Ziel nicht kennt, macht Fehler, die es nicht gibt.
  "Wie viel der Veneerkante liegt auf der Kontur" hatte den Sollwert null und
  wurde als Mangel gelesen.
* `polygon()` liest ein `d` mit zwei Teilpfaden als EINEN Ring, und ein
  Innen/Aussen-Test auf Randpunkten ist ein Muenzwurf.
* Wo eine Messung ueberrascht, erst die Messung pruefen.

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
