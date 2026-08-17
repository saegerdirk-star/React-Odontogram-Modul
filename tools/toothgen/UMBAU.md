# Anatomie-Umbau: Stand und naechste Schritte

Branch `feat/anatomie-neuzeichnung`. Stand 17.08.2026.

## Der Modellumbau ist durch

Alle 40 Templates liegen im Repo, das Modell kennt je eine Vorlage pro Position,
und `spec.py` musste dafuer nicht angefasst werden. **Offen ist genau eines: die
Boegen zusammengesetzt ansehen** - alle ernsten Fehler dieser Arbeit haben so
angefangen, und kein einziger haette ein Tor rot gemacht.

Die Kette hat jetzt ZWEI Stufen, und das ist der wichtigste Unterschied zu
vorher:

```
npm run toothgen:spender   # build.py + occlusal.py -> tools/toothgen/spender/
npm run toothgen:redraw    # Dirks Zeichnungen hinein -> src/assets/teeth-svgs/
npm run toothgen:verify    # verify.py (Spender) + verify_redraw.py (Ausgeliefertes)
```

`tools/toothgen/spender/` ist nicht versioniert und wird in etwa 30 Sekunden neu
gebaut; es ist byte-genau reproduzierbar, und die eingefrorenen Digests in
`verify.py` sind der Beweis. Der Ordner MUSS getrennt bleiben: zeigte das
Umzeichnen wieder auf `src/assets`, verformte der zweite Lauf ein bereits
umgezeichnetes Template ein zweites Mal - und zwar lautlos, weil der Umriss ja
eingesetzt wird und der Zahn danach richtig aussieht.

`redraw_plan.py` haelt beide Tabellen (Ziel -> Zeichnung -> Spender) allein und
ohne numpy, damit `verify_redraw.py` den Spender ablesen kann, ohne den
Generator zu laden, den es prueft.

### Was die Digests angeht: nichts einzufrieren

Der alte Plan sagte "Digests EINMAL neu einfrieren". Das hat sich erledigt und
zwar besser: `verify.py` misst weiter den SPENDER-Satz, und der ist unveraendert
- `AUTHORED_GEOMETRY_SHA256` stimmt Zahn fuer Zahn wie vorher. Was ausgeliefert
wird, ist Dirks Zeichnung, und die gegen Schumachers Zahlen zu messen hiesse dem
Zahnarzt die Vorlage vorzuhalten. Ihr Vertrag steht in `verify_redraw.py` und
prueft das, was beim Umzeichnen wirklich schiefgehen kann.

### Drei Fehler, die der Umbau selbst gefunden hat

Alle drei waren an den harten Vertraegen gruen, alle drei haetten im Bogen
gestanden:

* **Das Implantat wurde mit dem Zahn gedehnt.** Am Sechser auf die doppelte
  Laenge, die Plattform elf Einheiten in die Krone hinauf - und `IMPLANT_CEJ_Y`
  in `src/perioGraphic.ts` haengt genau an dieser Plattform. Ein Fabrikteil
  folgt der Wurzel STARR, dieselbe Regel, die die Stifte schon hatten.
* **Die Kauebene streute um zehn Einheiten.** Die Spender liegen alle auf 8,00
  ueber dem Rahmenrand, Dirks Zeichnungen zwischen 3,6 und 13,7. Kein
  Anatomieproblem, ein Rahmenproblem: der Rahmen bekommt jetzt genau so viel
  Hoehe, dass die GEZEICHNETE Kaukante wieder auf 8,00 liegt, und das
  Zahnfleisch wird gegen diese Kante gezeichnet statt gegen die nominelle.
* **Die Kauflaechen-Kacheln trugen den Namen der Seitenansicht.** `tpl-16` an
  beiden, gleiche Spezifitaet, und die Groessenregel der Seitenansicht gewann.
  Das galt schon vorher fuer 14, 16 und 46 und haette jetzt jeden Seitenzahn
  getroffen. Sie heissen jetzt `tpl-16-occl`.

### Zwei Faktoren sind ersatzlos weg

Beide waren dazu da, eine GELIEHENE Zeichnung als die Position lesbar zu machen,
an der sie stand - und beide wuerden jetzt eine richtige Zeichnung verbiegen:
der Breitenfaktor 0,8 fuer den seitlichen Schneidezahn in der Parodontalkarte
und die Kachelskalierung 0,9 fuer den unteren Milcheckzahn.

### Eine Luecke, bewusst offen

Die vier Milchmolaren-Kauflaechen (`54_occl`, `55_occl`, `84_occl`, `85_occl`)
sind erzeugt und ausgeliefert, aber noch nicht montiert: eine Kauflaechen-Kachel
wird in `buildGrid` EINMAL gebaut und, anders als die Seitenansicht, nie wieder
umgehaengt. Das war vorher genauso - ein Milchmolar zeigte immer die bleibende
Kauflaeche -, es ist also nichts kaputtgegangen; es ist die eine Stelle, an der
"je eine Vorlage pro Position" noch nicht gilt.

## HIER GEHT ES WEITER: Hoecker und Fuellungsflaechen aus den Fissuren

Entschieden am 18.08.2026. Dirk zeichnet die Kauflaeche jetzt als **Umriss plus
Fissurenlinien** - `~/dev/Odontogram-Anatomie/17_occl_fissuren.svg` ist die erste
fertige Vorlage dieser Art (1 geschlossener Umriss, 4 offene Linien, keine
Hoeckerflaechen mehr).

**Warum diese Richtung:** aus Flaechen Linien zu machen ist muehsam, aus Linien
Flaechen zu machen ist ein geloestes Problem. Umriss plus Fissuren zerlegen die
Kauflaeche in Gebiete, und jedes Gebiet IST ein Hoecker. Daraus faellt beides
zugleich ab - die Hoecker als Flaechen, und die Fuellungsflaechen entlang der
Fissur, also entlang der Praeparationsgrenze statt entlang Schumachers
Zeichnung. Heute sind die Fuellungsflaechen von Hand in `tools/toothgen/source/`
gezeichnet und werden nur radial auf Dirks Umriss gezogen; sie wissen von seiner
Kauflaeche nichts.

**Gemessen an 17_occl_fissuren.svg:** jede Verzweigung sitzt (0,11 bis 0,23
Einheiten - path25/26/27 stossen als T auf path24). Frei bleiben genau die FUENF
AEUSSEREN Enden, 4,5 bis 12,3 Einheiten vor dem Rand. Das ist Anatomie und kein
Mangel: eine Fissur endet vor der Randleiste. Beim ersten Messen habe ich das
als Anschlussfehler gelesen, weil ich nach Dateireihenfolge nummeriert hatte -
die Zahl allein sagt nicht, ob ein freies Ende nach innen oder nach aussen
zeigt.

**Dirks Entscheidung (Variante 2):** der Generator verlaengert jedes freie Ende
geradlinig bis zum Umriss. Mit der Einschraenkung, die den Preis wegnimmt: die
Verlaengerung ist eine HILFSLINIE fuer die Zerlegung und wird NICHT in `fissure`
mitgeliefert. Sonst stuende auf der Kauflaeche eine erfundene Fissur, wo
anatomisch die Randleiste durchlaeuft.

Zu tun:

1. Zerlegung: Umriss + Fissuren + Verlaengerungen -> Gebiete. Die
   Verlaengerungen nur in der Zerlegung fuehren, nie im Ergebnis.
2. Hoecker als Flaechen aus den Gebieten.
3. Fuellungsflaechen daraus ableiten - okklusal der Bereich um die
   Fissurenkreuzung, MO/OD nehmen den jeweiligen Randbereich dazu. Heute macht
   `fillings.stretch_to_band` nur den Anschluss; die Flaechen selbst sind
   Handzeichnung aus `source/`.
4. Erst wenn das steht, lohnt es, die uebrigen Kauflaechen so neu zu zeichnen.

## Offen aus dem 17.08.2026, ausserhalb dieser Ableitung

* **Vestibulaer/palatinal an den MOLAREN-Kauflaechen** ist ungeprueft. Bei den
  vier Praemolaren war es vertauscht (`SPIEGELN_OCCL` in `redraw_plan.py`, ein
  Eintrag je Template). WICHTIG, weil es dreimal danebenging: gespiegelt werden
  muss das FERTIGE Template, nicht die Zeichnung - von Dirk kommen nur Umriss
  und Fissurenlinien, das Hoeckerrelief kommt vom Spender und wird radial
  daraufgezogen. Die Orientierung steht uebrigens auf jeder Vorlage
  angeschrieben (vestibulaer oben, lingual unten, mesial rechts, distal links);
  damit ist sie auszurechnen statt zu probieren.
* **Die Kauflaeche von 14** misst mesiodistal 58 px, dieselbe Strecke in der
  Seitenansicht 35 px. Zwei Zeichnungen desselben Zahns, die sich widersprechen.
* **Die vier Milchmolaren-Kauflaechen** sind erzeugt, aber nicht montiert.

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
