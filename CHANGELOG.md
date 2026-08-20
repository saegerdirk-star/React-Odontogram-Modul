# Changelog

## 2.23.0 - 2026-08-20

### Die Pulpapruefung neben der Pulpadiagnose (Bead odontogram-fu1)

Der Grund in einem Satz: `apicalDx` unterscheidet symptomatische von
asymptomatischer apikaler Parodontitis, und was diese beiden trennt, IST die
Perkussionsempfindlichkeit. Wir fuehrten die Schlussfolgerung und nirgends den
Test. Gefunden beim Abgleich mit charlys Befundtastenfeld (`+`, `-`, `?`, `p`).

- **Zwei neue Registry-Enum-Achsen**, Nutzlast **2.25 -> 2.26** (additiv,
  omit-when-`none`):
  - `sensibility` — `none` | `vital` | `no-response` | `questionable`
  - `percussion` — `none` | `negative` | `sensitive`
- **ZWEI Achsen, nicht eine:** ein vitaler Zahn kann perkussionsempfindlich
  sein. In einer Achse waere das nicht darstellbar.
- **`none` heisst NICHT GEPRUEFT**, nicht "unauffaellig" - dieselbe
  Unterscheidung, auf der der ganze parodontale Teil besteht. Deshalb traegt
  die Perkussion einen eigenen Wert `negative`: geprueft und nicht
  klopfempfindlich ist ein Befund, kein fehlender, und ohne ihn liesse sich die
  Diagnose direkt darunter nicht begruenden.
- **Gattern:** `sensibilityAllowed` verlangt einen vorhandenen natuerlichen
  Zahn oder Milchzahn - ein Implantat hat keine Pulpa. `percussionAllowed` geht
  weiter und schliesst das Implantat EIN, wo Klopfempfindlichkeit ein
  periimplantaeres Zeichen ist. Beide Sperren stehen VOR dem DS-1-Gate (wie bei
  `setRetention`), gelten also auch fuer die Tastatur - eine Sperre, die nur im
  Bedienfeld haengt, ist keine.
- **Bedienung:** zwei Auswahlfelder auf der Karte "Wurzel und Parodont", und
  zwar VOR Pulpa und apikaler Diagnose - die Reihenfolge im Bedienfeld ist die
  Reihenfolge am Stuhl. Ausgeblendet, wo die Pruefung nicht geht.
- **Kurzschrift:** `+` `-` `?` `p` haben jetzt ein Ziel und verlassen
  `SHORTHAND_PENDING` (odontogram-t8y). Drei der sieben heimatlosen Tasten
  bleiben: `Fra`, `Hem`, `D`.
- **Kein Dental-Core-Eintrag.** Fuer diese beiden ist keine erzeugte
  Eigenschaft nachgewiesen, und eine zu erfinden verstiesse gegen dieselbe
  Regel, unter der odontogram-c51 keine unbelegte Norm ausliefert. Lokale Kodes
  in `fhir/codesystems.ts`, wie bei den parodontalen Achsen ohne verifizierten
  LOINC.
- Kein `svgLayer` - beide zeichnen nichts, die SVG-Fingerabdruck-Paritaet
  bleibt byte-identisch.

### Nebenbei behoben

- `fhir/fromFhirDentalCore.ts` trug die Nutzlastversion als Zahl `"2.25"` fest
  verdrahtet und waere bei jedem Bump veraltet gewesen: ein importiertes
  Dokument haette eine andere Version getragen als ein exportiertes, ohne
  Unterschied im Inhalt. Jetzt `PAYLOAD_VERSION`.

### i18n

- 14 neue Schluessel in allen zwoelf Sprachen (`sensibility.*`, `percussion.*`).

## 2.22.0 - 2026-08-20

### Tiefenwirkung: der Bogen liest sich als Relief statt als Scherenschnitt

Dirk, 20.08.2026: *"Das Odontogramm wirkt absolut zweidimensional. Koennte man
ueber optische Tricks an den Wurzeln und den anderen Flaechen die Illusion
einer dritten Dimension erzeugen?"* - und gleich danach die richtige Frage:
*"Aber das laesst sich alles an und abschalten?"*

Der Befund vorweg: die Zahnsubstanz war EINFARBIG. `tooth-base` traegt inline
`fill: #ebebeb`, und die Glanzebene `tooth-base-beauty` besteht aus zwei
FLACHEN Weissflaechen. Die elf linearen und acht radialen Verlaeufe im Template
gehoeren alle den Restaurationsmaterialien; dem Zahn selbst gehoerte keiner.

- **Ein Koerperverlauf quer ueber Krone und Wurzel** laesst beide als Zylinder
  lesen. SYMMETRISCH, und das ist kein Geschmack: der linke Quadrant ist
  derselbe Zahn gespiegelt, ein Verlauf mit heller und dunkler Seite haette dem
  Bogen zwei Lichtquellen gegeben. Der Saum sitzt in den aeusseren gut zehn
  Prozent - eine schmalere, dunklere Fassung wurde ausprobiert und verworfen:
  die Kontur hat ohnehin ihre eigene Linie, ein zweiter harter Rand daneben
  verdoppelt sie nur.
- **Eine Halsverschattung**, wo der Zahn ins Zahnfleisch eintritt, nach koronal
  auslaufend. Von den drei Tiefenreizen der staerkste - ein Relief erkennt man
  an dem, was es verschattet. Sie liegt in einer ZWEITEN Auflage VOR den
  Kacheln (`svg.gum-shade`): die Zahnfleischbaender liegen hinter dem Raster,
  weil sie hinter den Zaehnen stehen, ein Schatten dagegen faellt auf sie. Ihre
  Hoehe kommt vom Zahnfleisch selbst (koronale Kante von `gum-base`), nicht aus
  einer gesetzten Zahl - sonst laege sie daneben, sobald sich die Gingiva
  aendert.
- **Abschaltbar**: Einstellungen -> Zahndetails -> *Tiefenwirkung*
  (`getToothDepth`/`setToothDepth`). Ein Schalter fuer beides. Aus heisst: die
  Klasse `odon-depth` am Raster faellt weg, die Fuellungsregeln greifen nicht
  mehr, die Schattenauflage wird entfernt. Im Renderpfad laeuft dabei KEIN
  JavaScript - dieselbe Bauweise wie bei den Restaurationsfarben.
  Sitzungszustand wie `perioViewMode`, nie Teil der Nutzlast.

- **Hoecker als Kuppeln statt als Rampen.** Die Kauflaechenvorlagen tragen
  jedes Hoeckerfeld bereits als eigene Form - sechs beim Sechser -, aber mit
  einem LINEAREN Verlauf: hell auf der einen, dunkel auf der anderen Seite. Ein
  Hoecker ist eine Kuppel, und die liest man an einem radialen Verlauf. Zwei
  Fallen dabei umgangen: der Aussenumriss `background-cusp` bleibt unberuehrt
  (er traegt eine `id`), sonst bekaeme der ganze Tisch EINE grosse Kuppel statt
  sechs kleiner; und die Fissurenzuege bleiben es auch (`fill: none`) - eine
  Fuellung mit `!important` haette aus Strichen Flaechen gemacht und die
  Kauflaeche zugemalt.

**Die Grenze**: geschattet wird nur die ZAHNSUBSTANZ. Farbe traegt hier
Bedeutung - ueber eine Karies, eine Fuellung oder ein Material zu schattieren
hiesse zu veraendern, wie ein Befund gelesen wird. Bei den Hoeckern faellt das
von selbst richtig aus: sie liegen unter `tooth-base`, und liegt eine Krone
oder Fuellung darauf, ist diese Ebene abgeschaltet.

**Paritaetssicher von der Bauart her, nicht aus Versehen**:
`collectActiveLayers` ueberspringt alles unter `<defs>` und jedes
Verlaufselement, und es haelt nur `id`, `opacity` und `class` fest - die
Fuellung nicht. Was NICHT ginge, waere ein neues SICHTBARES Element mit `id`.
Geprueft, nicht angenommen.

### i18n

- Zwei neue Schluessel in allen zwoelf Sprachen: `settings.depth.label`,
  `settings.depth.desc`.

### Test

- `sp13-settings-tab.test.ts` hielt fest, dass der Reiter "Zahndetails" GENAU
  DREI Bedienelemente hat. Er prueft jetzt, dass DIESE DREI da sind und an
  ihren Werten haengen. Eine Zahl festzunageln haette jeden kuenftigen Schalter
  zu einem Fehlschlag gemacht, ohne dass an den dreien etwas falsch waere.

### Unveraendert

Keine Vorlage geaendert, kein Zustandsfeld, keine Nutzlast. Nutzlast bleibt
**2.25**, SVG-Fingerabdruck-Paritaet, FHIR-Gold und Rundlauf-Gold
byte-identisch.

## 2.21.0 - 2026-08-20

### Kauflaechen: wie gross sie DARGESTELLT werden (Bead odontogram-bn3)

Dirk, 20.08.2026: *"die Frontzaehne in der okklusalen Ansicht etwas groesser
und die Molaren etwas kleiner… Eckzaehne und Praemolaren natuerlich auch etwas
groesser."*

- **Eine Zahl je Position in `src/index.css`** (`--occl-scale` auf der
  `tpl-N-occl`-Kachel), in drei Gruppen: Front, Eckzaehne und Milchfront 1,25;
  Praemolaren 1,15; Molaren und Milchmolaren 0,85. Vorher stand die
  Kauflaechenreihe als Sprung da - winzige Frontzahnovale zwischen zwei
  Bloecken wuchtiger Molarentische; jetzt waechst sie vom Einser zum Sechser
  durch.
- Die Praemolaren haben eine EIGENE Zahl bekommen. Mit derselben 1,25 wie die
  Front standen sie fast so gross da wie ein Siebener, und ein Molarentisch ist
  deutlich groesser als ein Praemolarentisch.
- **Der Export zieht mit** (geprueft): `buildChartSvg` setzt jede Zahn-SVG ueber
  ihr `getBoundingClientRect()`, und eine CSS-Skalierung steckt in dieser Box.
  PNG, JPG, SVG und der PDF-Bericht zeigen dasselbe wie der Bildschirm.

**Warum in der CSS und nicht im Generator.** Es wurde an diesem Tag DREIMAL am
Erzeugnis versucht und ging dreimal schief. Die Fissuren einer Kauflaeche
kommen vom SPENDER und werden nur mitgezogen, nicht eingesetzt (der Grund steht
im Kopf von `tools/toothgen/redraw_occl.py`: an `fissure-sealing-occlusal`
haengt ein Befund, und die Versiegelungsflaeche muss auf den Fissuren liegen).
Der Umriss vertraegt deshalb keine grosse Aenderung - beim letzten Versuch
meldete `verify_hoecker.py` an sechs Vorlagen, dass die Kauflaeche nicht mehr in
dieselben Hoecker zerfaellt. Die Darstellungsgroesse ist aber gar keine Frage
der Geometrie.

### Der Hoeckerbestand jeder Kauflaeche wird geprueft

- **`tools/toothgen/verify_hoecker.py`** zerlegt jede AUSGELIEFERTE Kauflaeche
  per Flutfuellung (`hoecker.gebiete()` ueber `background-cusp` plus die
  `fissure`-Ebene) und vergleicht Zahl und Flaechenanteile der Gebiete gegen
  eine eingefrorene Tabelle. Laeuft in `npm run toothgen:verify` mit, unter
  `python3` statt `uv run` - die Zerlegung braucht numpy.
- Es gibt sie, weil an diesem Tag zweimal das Fissurenmuster kaputtging und
  KEIN Vertrag es sah: Ebenenbestand, Kontur, Kauebene und sogar die Zahl der
  Pfade in der `fissure`-Ebene waren unveraendert - das Falsche sass eine Ebene
  weiter. Gesehen hat es beide Male Dirk im Bild.
- Die Grundlinie ist selbst eine Probe, weil sie anatomisch stimmt: Frontzahn
  zwei Gebiete, Praemolar vier, Molar sechs, oberer Siebener vier (dort ist der
  distopalatinale Hoecker zurueckgebildet).
- Festgehalten dabei: **die Generatorkette ist nicht bit-genau wiederholbar.**
  Ein Lauf ohne jede Aenderung verschiebt Koordinaten um bis zu 0,02 Einheiten
  (208 Zahlen an 26 Dateien). `git status` kann also nicht sagen, ob ein Lauf
  etwas Echtes geaendert hat - deshalb sind die Flaechenanteile mit drei
  Prozentpunkten Toleranz eingefroren und nicht auf die Stelle.

### Unveraendert

Keine Vorlage geaendert, kein Zustandsfeld, keine Nutzlast. Nutzlast bleibt
**2.25**, SVG-Fingerabdruck-Paritaet, FHIR-Gold und Rundlauf-Gold
byte-identisch.

## 2.20.0 - 2026-08-20

### Die Kurzschrift ist einstellbar (Bead odontogram-t8y)

Zoltan Dul im Upstream-Issue, 19.08.2026, auf Dirks Frage nach der Bedienung:

> *"The one firm principle, whatever we add here: it has to be flexible and
> fully configurable in Settings, never hard-wired. If you want to build a
> keyboard-entry path, that is the bar. Someone who wants it can switch it on
> and shape it, and someone who does not never has to see it."*

Er hat ueber die Upstream-Frage hinaus recht. Buchstaben auf einer Kachel zu
tippen ist additiv - nichts sonst benutzt diese Tasten -, aber der
Tabulatorgang UEBERSCHREIBT eine Standard-Navigationstaste, und ein Chart, auf
dem niemand tippt, sollte das nicht muessen.

- Neuer Einstellungsreiter **Kuerzel** mit zwei Schaltern: `shorthandEnabled`
  und `shorthandTabWalk`, getrennt schaltbar
  (`getShorthandEnabled`/`setShorthandEnabled`,
  `getShorthandTabWalk`/`setShorthandTabWalk`). Aus heisst wirklich aus: kein
  Tastendruck kommt an, und der Tabulator verlaesst das Zahnschema wieder wie
  ueberall sonst - ein Test prueft `defaultPrevented`, nicht nur die Wirkung.
- **Abschalten raeumt auf.** Ein halb getipptes Kuerzel oder ein stehender
  Materialmodus duerfen den Schalter nicht ueberleben, sonst waere die naechste
  Krone nach dem Wiedereinschalten stillschweigend golden.
- **Die Kuerzeltabelle liegt offen** im Reiter, gruppiert nach Material,
  Flaechen und ganzem Zahn, dazu die Tasten ohne Ziel. Eine Kurzschrift, die
  man nicht nachschlagen kann, benutzt niemand. Die Beschriftungen kommen aus
  der bestehenden Achsen-Registry (`uiOptions[].labelKey`), es gibt also keine
  zweite Textsammlung in zwoelf Sprachen, die auseinanderlaufen koennte.
- **Beide Schalter stehen in diesem Fork auf AN**, weil dies Dirks Chart ist
  und er sie angefragt hat. Ein Wirt, der Zoltans Voreinstellung will, legt sie
  beim Einhaengen um. Sitzungszustand wie `perioViewMode`, nie Teil der
  Nutzlast.

### i18n

- 17 neue Schluessel in allen zwoelf Sprachen (`settings.tab.shorthand`,
  `settings.shorthand.*`).

### Unveraendert

Kein neues Zustandsfeld, kein Renderpfad. Nutzlast bleibt **2.25**,
SVG-Fingerabdruck-Paritaet, FHIR-Gold und Rundlauf-Gold byte-identisch.

## 2.19.0 - 2026-08-19

### Befundeingabe ueber Kuerzel (Bead odontogram-t8y)

Dirk: *"Die Bedienung der Befundeingabe ist denkbar schlecht. Ich bin es
gewohnt, Zaehne zu markieren und den Befund mit Kuerzeln einzugeben."* Bei 46
Achsen und 129 Werten ist die Zahl der Klickwege der eigentliche Engpass.

- **`src/shorthand.ts`** haelt die Abbildung Kuerzel -> Achse und den Parser,
  ohne DOM und ohne Zugriff auf `odontogram.ts`, wie `retention.ts` und
  `perioClassification.ts`. Der Grund ist der Bead selbst: verlangt sind DREI
  Eingangswege auf denselben Befundsatz - Tastatur, FHIR aus einem
  Praxissystem, Sprache. Laege die Tabelle im Tastaturbehandler, haetten die
  anderen beiden nichts zum Aufrufen, und es entstuende eine zweite Tabelle
  daneben.
- **Die Tabelle ist abgelesen, nicht erfunden.** Sie stammt von charlys
  01-Befund-Tastenfeld; die Abschrift samt beider Bildschirmabzuege liegt in
  `docs/charly/01-befund-tastenfeld.md`, die Bedeutungen sind von Dirk
  aufgeloest.
- **Das Material steht VOR dem Befund und bleibt stehen** - ein Modus, keine
  Ergaenzung. `G k` ist eine Goldkrone, `A mod` eine Amalgamfuellung ueber drei
  Flaechen. Eine Materialtaste hat dabei ZWEI Lesarten, weil `fillingMaterial`
  und `restorationMaterial` verschiedene Werteraeume haben: `K mo` ist eine
  Composite-Fuellung, `K k` eine Krone aus Gradia. Wo eine Lesart fehlt, wird
  keine erfunden.
- **Ein Tastendruck, der ein Befund ist, wirkt sofort.** Sechs Frontzaehne
  markieren und `k` druecken ist die ganze Gebaerde. Es wartet nur, was noch
  nicht vollstaendig sein kann: ein Laufoeffner (`c`, Flaechen) oder eine
  Taste, mit der eine laengere anfaengt.
- **Teil- oder Totalprothese steht nicht im Tastendruck**, sondern in der Zahl
  der markierten Zaehne (`dentureValueFor`).
- **Tabulator geht zum naechsten Zahn**, Umschalt+Tabulator zurueck, beginnend
  bei 18 und um den Mund herum (18-28, dann 38-48), mit Umlauf. Er bewegt die
  AUSWAHL, nicht nur den Fokus, damit der Zahn hervorgehoben ist, auf dem man
  gerade steht. Die Pfeiltasten bleiben unveraendert - sie sind die Landkarte,
  der Tabulator ist der Rundgang.
- **Sieben Tasten sind verstanden und noch nicht ablegbar** (`+ - ? p Fra Hem
  D`). Sie werden getrennt von Tippfehlern gemeldet, denn ein Tippfehler und
  eine noch fehlende Achse sind verschiedene Lagen. Die zugehoerigen Beads:
  odontogram-fu1, -t6y, -ca0, -0n8.
- Alles laeuft ueber `applyToSelected`, also durch das DS-1-Gate und auf die
  ganze Markierung. Kein neuer Mutationsweg.

### Zaehne durch Ziehen markieren (Bead odontogram-apn)

- **Ziehen mit gedrueckter Maustaste** ueber die Zaehne waehlt eine Spanne;
  Umschalt fuegt sie zur bestehenden Auswahl hinzu. `pointerdown/-move/-up`
  statt `mouse*`, damit Maus und Stift denselben Weg gehen und die vorhandene
  Beruehrungslogik unangetastet bleibt.
- **Die Spanne folgt dem BOGEN, nicht der Geometrie** (`teethBetween`). Ein
  Rechteck ueber die Kachelmitten greift bei zwei Boegen in den Gegenkiefer,
  sobald der Zeiger ein paar Pixel abweicht. Ueber die Mitte hinweg (13 nach
  23) ja, ueber den Kiefer nie.
- **Umschalt + Pfeiltaste erweitert die Auswahl**, Umschalt + Klick ebenso. Der
  Anker bleibt dabei stehen, sonst koennte Umschalt+Pfeil zurueck die Spanne
  nicht wieder verkleinern.
- Schwelle von 4 px, unter der ein Ziehen ein Klick bleibt; der Klick nach dem
  Loslassen wird einmalig unterdrueckt. Escape waehrend des Ziehens stellt die
  vorherige Auswahl wieder her.
- Reine Bedienung: alles laeuft weiter ueber `selectedTeeth` und
  `updateSelectionUI()`. Der Klickweg und die Pfeiltasten ohne Umschalt
  verhalten sich unveraendert.

### charly-Abgleich

- **`docs/charly/01-befund-tastenfeld.md`** haelt das Tastenfeld fest, samt
  dem, was der Blick in die `solutiodb` ergab: `befund01pa.zahn11..zahn48`
  speichert NICHT die Kurzschrift, sondern einen Stellencode mit bitweise
  gepackten Merkmalen in drei Laengen nebeneinander. Die erweiterte
  Materialauswahl (`fuellmaterial`, 32 Zeilen mit acht freien Plaetzen) ist
  eine Produktliste, keine Materialklasse.
- **Fuenf Befunde erhebt charly, fuer die unsere 46 Achsen kein Ziel haben.**
  Daraus die Beads odontogram-fu1 (Sensibilitaet und Perkussion), -t6y
  (Wurzelfraktur), -ca0 (Hemisektion), -0n8 (Durchbruch in Stufen), -gry
  (Papillenverlust) und -5rv (eine Bruecke ohne Pfeiler ist kein Befund).

### Widerruf der Kurzschrift

- **Cmd/Strg+Z nimmt die letzte Eingabe zurueck**, ueber alle Zaehne, die sie
  traf, zwanzig Schritte tief (`undoShorthand()`, `getShorthandUndoDepth()`).
  Der Bead verlangt einen Widerruf ausdruecklich: ohne ihn scheitert die
  Kurzschrift genau da, wofuer sie gebaut ist - ein Vertipper waere ueber die
  Klickwege zu berichtigen, die sie vermeiden soll.
- Ein Schritt sichert, was die Eingabe treffen KONNTE, nicht was sie traf:
  beide Charts und die Plan-Markierungen der betroffenen Zaehne. **Nicht durch
  `gateToothEdit`** - ein Widerruf ist keine neue Bearbeitung, sondern die
  Ruecknahme einer, und das Gate wuerde die Dual-State-Frage ein zweites Mal
  zu einer Entscheidung stellen, die gerade zurueckgenommen wurde.
- **Der Materialmodus gehoert zum Schritt.** `G k` zurueckgenommen darf Gold
  nicht stehen lassen, sonst waere die naechste Krone stillschweigend ebenfalls
  golden.
- Ein noch ungeschriebener Puffer wird zuerst geraeumt: er ist das Juengere.
- `resetShorthandInput()` raeumt Verlauf UND Eingabezustand ueberall dort, wo
  `planEditedTeeth` geraeumt wird. Ein Zuruecksetzen oder ein Import wechselt
  den Fall unter dem Tippenden; ein aufgehobener Schritt holte sonst Zaehne aus
  einem ANDEREN Fall zurueck.

### Eine Restauration ohne Material ist kein Befund

- `k` ohne gesetzten Materialmodus schrieb zwar `restorationType`, aber eine
  Krone ohne Material ist keine gueltige Restauration - der Zustand
  normalisierte sie wieder weg, und die Taste sah aus, als tue sie nichts. Der
  Zerleger meldet solche Tasten jetzt als `needsMaterial`, und die Anzeige sagt
  es. Gefunden hat das ein Test, der wirklich tippt.

### i18n

- Fuenf neue Schluessel in allen zwoelf Sprachen: `chart.hint.drag`,
  `shorthand.unknown`, `shorthand.pending`, `shorthand.nothingToUndo`,
  `shorthand.needsMaterial`.

### Dokumentation

- **`tools/toothgen/README.md` neu geschrieben.** Sie stand auf "neun Vorlagen
  aus vier Quellzeichnungen" und beschrieb damit ein Werkzeug, das es seit dem
  17.08.2026 nicht mehr gibt. Jetzt: 26 Seitenansichten und 26 Kauflaechen, die
  drei Generatorstufen mit ihren zwei Vertraegen, warum die dritte eine eigene
  ist, die Module darunter, der anatomische Vertrag und die drei Fallstricke
  (`toothgen:build` baut die Kauflaechen nicht mit; `uv` und `python3` sind
  nicht austauschbar; die Tafelabzuege gehoeren nicht ins Repository).

### Unveraendert

- **Kein neues Zustandsfeld.** Die Kurzschrift schreibt auf vorhandene Achsen,
  die Markierung ist reine Bedienung. Die Nutzlastversion bleibt **2.25**,
  SVG-Fingerabdruck-Paritaet, FHIR-Gold und Rundlauf-Gold sind byte-identisch.
- Der Materialmodus (`shorthandMaterial`) ist Sitzungszustand wie
  `perioViewMode` - nie Teil der Nutzlast.

## 2.18.0 - 2026-08-19

### Milchzahn-Draufsichten

- **Die sechs Milchfrontzaehne haben eine Draufsicht** (51/52/53, 81/82/83).
  Damit ist an einem Milchschneidezahn eine PALATINALE Flaeche befundbar - die
  Seitenansicht zeigt labial face-on und hat lingual ueberhaupt keine Ebene.
  Die Tafeln der Odontographie tragen alle sechs (Bild 85-90, je `d von
  okklusal`); eine Ableitung von 52/82 aus 51/81 war deshalb nicht noetig.
  Damit ist der Bestand vollstaendig: 26 Seitenansichten und 26 Kauflaechen,
  je eine Zeichnung fuer jede Position in beiden Gebissen.

### Die Kachel folgt dem Milchzahn

- **`syncOcclusalTemplate` tauscht die Kauflaechenkachel bei einem
  Zustandswechsel**, so wie `syncToothTemplate` es fuer die Seitenansicht tut.
  Bis dahin wurde eine Kauflaeche in `buildGrid` EINMAL gebaut und nie neu
  getemplatet: ein Milchmolar zeigte die Kauflaeche seines Nachfolgers, und die
  Milchfrontzaehne haetten es ebenso getan. "Ein Template je Position" gilt
  jetzt in beiden Ansichten.
- **`isPrimaryTemplate` liest den Stempel ohne die Endung `_occl`.** Eine
  Kauflaeche stempelt `51_occl`, die Tabelle haelt `51` - also galt eine
  Milchzahn-Draufsicht nicht als Milchzahn-Template, fiel in den alten
  milktooth-Zweig und zeigte die Form des SPENDERS: eine Praemolaren-Kauflaeche
  auf einem Milchschneidezahn, und bei den Milchmolaren gar nichts, weil
  `16_occl` keine milktooth-Ebene hat.

### Der Nachbar verdeckt den Zahn nicht mehr

- **Zahnfleisch und Knochen liegen in EINER Auflage hinter dem Raster**
  (`src/gumOverlay.ts`). Jede Zeichnung ist breiter als ihre Spalte - mit
  Absicht, sonst ergibt die Gingiva keine durchgehende Linie -, und weil die
  Kacheln in Bogenreihenfolge gemalt werden, deckte das undurchsichtige Band
  des Nachbarn die mesiale Flanke des vorherigen Zahns zu. Gemessen: +3,8 px je
  Seite an Position 16, +17,2 px dort, wo ein Milchmolar in der Spalte eines
  Praemolaren steht. Die Baender bleiben im Template und werden dort nur nicht
  mehr gemalt; die Auflage kostet rund 190 Knoten.

### Werkzeugkette

- **`npm run toothgen:redraw` laeuft bis zur dritten Stufe durch.** Sie stand in
  keinem Skript: der dokumentierte Befehl baute die Spender, setzte Umriss und
  Pulpa ein und hoerte auf - die abgeleiteten Fuell- und Kariesflaechen fielen
  dabei lautlos auf die Spenderformen zurueck, und weil beide gueltiges SVG
  sind, meldete kein Vertrag etwas. Neu: `tools/toothgen/flaechen_einsetzen.py`
  und `npm run toothgen:flaechen`.

## 2.17.2 - 2026-08-18

- Dokumentation nachgezogen, nachdem sie an drei Stellen etwas Falsches
  behauptete. `CLAUDE.md` nannte **14 Kauflaechen**, ausgeliefert werden **20** -
  die sechs Frontzahn-Draufsichten (11/12/13/41/42/43) fehlten in der
  Aufzaehlung, ebenso wie in der Warnung zu `occlusal.py` ("the four `_occl`
  assets"). Die Sprachliste nannte elf Sprachen, es sind zwoelf: `fr` steht
  laengst in `translations.ts` und `lang/README-fr.md` liegt da. Und
  `README.md` ist das englische Dach mit Verweisen auf alle zwoelf, nicht
  "English + Spanish".
- `tools/toothgen` ist als **drei** Stufen beschrieben statt als zwei. Die
  dritte setzt die Flaechen ein, auf denen ein Befund erhoben wird - sie werden
  AUS dem gezeichneten Umriss abgeleitet und lassen sich deshalb nicht aus einem
  Spender warpen. Die zehn bisher ungenannten Werkzeuge sind jetzt benannt:
  `fuellflaechen.py`, `fuellflaechen_einsetzen.py`, `kauflaechen.py`,
  `halsbaender.py`, `draufsicht.py` sowie `roots.py`, `svgpath.py`, `graft.py`,
  `hoecker.py`, `redraw_apply.py`.
- Die Frontzahn-Draufsicht steht jetzt in allen **zwoelf** READMEs, in der
  Uebersicht der jeweiligen Sprache, und als eigener Punkt in den Highlights
  von `README.md`. Sie ist keine API-Aenderung, aber eine neue Faehigkeit: eine
  palatinale Fuellung am Schneidezahn war vorher nirgends befundbar.

## 2.17.1 - 2026-08-18

- Fixed the pulp-visibility switch hiding a pulp that carries a LATIN diagnosis.
  `#btnPulpVisible` blendet die gesunde Pulpa aus und laesst eine befundete
  stehen - aber `pulpDiseased` las nur `pulpDx`, nicht `pulpLatin`. Wer mit dem
  Detailgrad `latin` arbeitet und `Gangraena pulpae` befundet, sah mit
  ausgeschaltetem Schalter keine Pulpa. Die FAERBUNG kannte die lateinische
  Achse laengst (sie hat einen eigenen Ton dafuer), die SICHTBARKEIT nicht.
  Bead odontogram-dl1; eine Diagnose ist ein Befund, und in welcher Vokabel sie
  gestellt wurde, aendert daran nichts.

## 2.17.0 - 2026-08-18

- **Die Frontzaehne haben eine Draufsicht.** Bis dahin bekam jede der zwoelf
  Frontzahn-Positionen eine leere Platzhalterkachel, und eine PALATINALE
  Fuellung liess sich nirgends befunden: die Seitenansicht zeigt die labiale
  Flaeche face-on, lingual gibt es dort ueberhaupt keine Ebene. Charly loest das
  mit einem geteilten Schemafeld, dessen Bedeutung aus der Position im Kaestchen
  kommt; das passt nicht zu einer anatomischen Zeichnung. Die Tafeln der
  Odontographie tragen die Draufsicht als Bild 32 d, Dirk hat sie fuer 11, 12,
  13, 41, 42 und 43 nachgezeichnet, die Gegenseite entsteht durch Spiegeln.
  Dieselben fuenf Flaechen wie am Seitenzahn - mesial, distal, vestibulaer,
  lingual und inzisal -, abgeleitet mit derselben Maschinerie.
- Die INZISALKANTE spielt in der Draufsicht die Rolle, die am Seitenzahn die
  Fissur hat: die inzisale Flaeche folgt ihr. Sie kommt aus Dirks Zeichnung und
  wird eingesetzt, nicht gewarpt.
- **`tools/toothgen/draufsicht.py`** liest eine Handzeichnung ueber ihren INHALT
  statt ueber Ebenennamen - laengster geschlossener Pfad ist der Umriss, offene
  Pfade sind Linien, `Incisal` wie `Incisalkante`, gross wie klein. Und es
  NORMALISIERT: der Umriss wird auf die Kronenbreite der Seitenansicht gezogen.
  Noetig, weil Dirk direkt auf dem Seitenscan zeichnet (die 41 mass 261
  Einheiten gegen 15,24) und weil sonst die Breitenprojektion nicht stimmt, mit
  der die bukkale Flaeche der Seitenansicht aus der Kauflaeche kommt. Damit ist
  der Ausschnitt beim Zeichnen gleichgueltig.
- Die Orientierungsmarken `v` und `m` der Zeichnung werden gegen die Konvention
  GEPRUEFT (Oberkiefer vestibulaer oben, Unterkiefer unten, mesial bei beiden
  rechts) und jede Abweichung gemeldet - dieselbe Probe, die beim Unterkiefer
  gefehlt hat, als die 36 lingual zeichnete, wo bukkal befundet war.
- **Drei Listen ueber dieselbe Frage sind zu zwei geworden und dann zu einer.**
  Welche Position eine Draufsicht hat, stand in `OCCLUSAL_TEMPLATE`, in einem
  handgepflegten Platzhaltersatz und in einer Vorladeliste. Die erste
  Frontzahn-Draufsicht war eingetragen, gemountet, ausgeliefert - und blieb
  unsichtbar, weil sie in den beiden anderen fehlte. Der Platzhaltersatz ist
  entfernt, die Vorladeliste wird abgeleitet.
- Ein fehlendes Template setzt jetzt eine leere Kachel statt gar keine. Ein
  `return` liess die Zelle ersatzlos entfallen und verschob das ganze Raster:
  unter Label 22 stand die 24.
- Die Draufsicht folgt in der Breite ihrer SPALTE statt einer festen Hoehe. Die
  feste Hoehe ging, solange nur Seitenzaehne eine Draufsicht hatten (Spalten von
  41 bis 58 px); ein unterer Einser misst 12,9 gegen 38,2 Einheiten beim unteren
  Sechser, und seine Draufsicht stand 50 px breit in einer 19 px breiten Spalte.
  Sie nutzt die Spalte bis auf einen Pixel Fuge aus, was den kleinen Zaehnen
  39 % Zuwachs bringt und den grossen 13 % - die Spreizung wird kleiner, ohne
  dass die Zuordnung Spalte = Zahn aufgegeben wird.

## 2.16.0 - 2026-08-18

- **Fuellflaechen in der Kauflaechenansicht**, fuenf statt drei: mesial, distal,
  bukkal und lingual liegen als Baender am Rand, okklusal laeuft der FISSUR nach
  - dort verlaeuft die Praeparationsgrenze. Andere Konstruktion als in der
  Seitenansicht, weil die Ansicht eine andere Frage stellt: von der Seite sieht
  man den Zahn durch, von oben liegen die Flaechen nebeneinander.
  `tools/toothgen/kauflaechen.py`, alle 14 Kauflaechenvorlagen, je Flaeche
  sieben Ebenen.
- Das Fissurenband bleibt INNERHALB der Randbaender und wird nur nach mesial und
  distal verlaengert. Ohne die Grenze liefe schon eine reine okklusale Fuellung
  bis an die Approximalraender, und die Kauflaechenansicht erzaehlte etwas
  anderes als die Seitenansicht, wo die Randleiste dem Approximalkasten gehoert;
  ohne die Beschraenkung der Verlaengerung reichte jede okklusale Fuellung ueber
  die Hoecker bis an alle Raender. mo, od und mod haengen trotzdem zusammen -
  das besorgt die Ueberlappung. Auf allen 14 geprueft.
- Alles wird aus dem TEMPLATE gelesen, nicht aus der Zeichnung: der Umriss steht
  dort als `background-cusp`, die Fissuren hat `redraw_occl` schon eingesetzt.
  Damit entfaellt die Abbildung Zeichnung -> Template. Die vier Richtungen sind
  an den anatomisch benannten `filling-composite-*`-Ebenen gemessen.
- Eingeschlossene Zwickel zwischen einem Randband und dem Fissurenband werden
  dem Band zugeschlagen - sie entstehen, wo ein Fissurenast schraeg in das Band
  laeuft und dort beschnitten wird, und sind eine ausgefranste Innenkante, kein
  Befund.
- **Korrigiert: bukkal und lingual waren im Unterkiefer vertauscht**, und die
  vier Himmelsrichtungen waren ueberhaupt verdreht. Sie wurden an den
  anatomisch benannten `filling-composite-*`-Ebenen des Templates gemessen -
  einer Quelle, die zweifach nicht taugt. Erstens sind diese Ebenen seit dem
  Umbau vom 17.08. nicht mitbewegt worden, als die Kauflaechen-ZEICHNUNGEN neu
  ausgerichtet wurden; sie melden bukkal in allen vierzehn OBEN, was fuer den
  Unterkiefer die falsche Seite ist. Zweitens sind es gewarpte Spenderformen,
  deren Schwerpunkte nicht in den Himmelsrichtungen liegen: am oberen Sechser
  zeigte "bukkal" auf (0,52 | -0,85) und "mesial" auf (0,51 | -0,86), praktisch
  dieselbe Richtung - deshalb sass das bukkale Band zu weit mesial. Es gilt
  jetzt die Konvention, die `src/odontogram.ts` seit dem Umbau festhaelt und die
  aus Dirks Zeichnungen stammt: Oberkiefer bukkal oben, Unterkiefer bukkal
  unten, mesial bei beiden rechts. Die Sektormitte ist die Mitte des
  umschliessenden Rechtecks statt des Punktschwerpunkts, der bis zu 1,3
  Einheiten daneben lag.
- **Korrigiert: eine Flaeche aus mehreren Teilen schrumpfte auf einen davon.**
  Die Randverfolgung laeuft EINE geschlossene Kontur ab, naemlich die der
  Komponente mit der obersten linken Zelle. An `85_occl` lag die in einem
  Splitter von 4,3 Einheiten neben einem Hauptteil von 118,8 - im Template stand
  danach eine bukkale Flaeche von 12 statt 80 Prozent der Zahnbreite. Jetzt wird
  jeder Teil als eigener Teilzug in dasselbe `d` geschrieben, und Teile unter 5
  Prozent des groessten fallen weg. Die Defektebenen sind `<polygon points>` und
  koennen keine Teilzuege; dort wird weiterhin nur der groesste Teil
  geschrieben.
- **Die bukkale Flaeche der SEITENANSICHT wird aus der Kauflaeche projiziert**
  (Dirks Vorschlag): mesiodistal ist in beiden Ansichten die x-Achse, also ist
  die Breite die eine Groesse, die sie teilen. Sie war bis dahin das letzte
  Stueck, das noch aus dem Verschiebungsfeld kam - am oberen Sechser ein Fleck
  von 13 x 3,5 Einheiten in einer Krone von 36 x 28. Die Hoehe kann die
  Kauflaeche nicht hergeben und bleibt eine Setzung (mittleres Kronendrittel,
  `BUKKAL_OBEN`/`BUKKAL_UNTEN`). Nur die vierzehn Seitenzaehne; die Frontzaehne
  haben keine Kauflaechenansicht.
- Die Fissuren werden in ALLE Richtungen bis zum Umriss verlaengert, nicht nur
  nach mesial und distal. Die Sorge, eine okklusale Fuellung koenne dadurch
  ausufern, war gemessen unbegruendet - das Band wird ohnehin an den Randbaendern
  beschnitten, und die okklusale Flaeche wurde im Mittel KLEINER. Es bleiben
  drei Zaehne ohne Anschluss (14 bukkal 0,37 Einheiten, 45 lingual 1,12, 44
  bukkal 3,14); der untere erste Praemolar hat anatomisch keine bukkale Fissur,
  und eine Schwelle im Generator soll darueber nicht entscheiden.
- Eingeschlossene Gebiete werden einem Randband nur bis zu 3 Prozent der
  Kauflaeche zugeschlagen. Ohne Schranke verschluckte die Regel ganze Hoecker -
  gemessen kam die linguale Flaeche auf 29 bis 38 Prozent gegen 12 bis 20
  bukkal. Was darueber liegt, bleibt stehen und wird beim Lauf gemeldet.

- Alle abgeleiteten Flaechen werden mit ZWEI Nachkommastellen geschrieben, weil
  die Kette mit `prec=2` serialisiert. Mit drei Stellen wich `54_occl` beim
  Nachserialisieren um 0,1060 von sich selbst ab und `check_roundtrip.py` fiel
  durch; mit zwei ist der Umlauf exakt. Doppelte Punkte aus der Randverfolgung
  werden dabei verworfen.

## 2.15.0 - 2026-08-18

- **Fuellungs- und Kariesflaechen kommen aus der Zeichnung statt aus dem
  Spender.** In allen 26 Seitenansichten sind die mesiale, distale und
  okklusale bzw. inzisale Flaeche neu gesetzt - je Flaeche sieben Ebenen (vier
  Fuellungsmaterialien, Sekundaerkaries, Defekt, Karies), 546 insgesamt. Die
  Karies ist eine Gruppe aus drei Pfaden und wird in das neue Gebiet GEZOGEN
  statt ersetzt: die Textur zeichnet niemand, und der Ebenenbestand muss gleich
  bleiben. Damit ist die schiefe distale Fuellung am unteren Sechser erledigt -
  sie stammte aus dem verzerrten Verschiebungsfeld und reichte bis 7 Einheiten
  aus dem Zahn heraus.
- Die Grenzen der Flaechen entstehen aus Umriss und Zahnhalslinie:
  `tools/toothgen/fuellflaechen.py` legt je Zahn drei Zuege in eine eigene
  Ebene `4 FUELLFLAECHEN (abgeleitet)` der Zeichnung, `fuellflaechen_einsetzen.py`
  macht daraus Flaechen und schreibt sie ins Template. Was von Hand gezeichnet
  ist, schlaegt die Ableitung und wird nicht daneben geschrieben.
- **Die Randleiste gehoert dem Approximalkasten, die Schneidekante ihrem
  eigenen Streifen.** Aus dieser einen Grenzentscheidung fallen alle sechs
  Befunde je Zahn richtig heraus: am Seitenzahn laesst o beide Randleisten
  stehen und mo nur die distale; am Frontzahn bleibt die Kante bei einer reinen
  m- oder d-Fuellung unmarkiert, und d+i markiert alles ausser mesial. Liefe die
  Kaulinie von Randleiste zu Randleiste, saehe mo aus wie mod.
- Benachbarte Flaechen ueberlappen um 0,1 Einheiten, damit mo, od und mod als
  EINE Restauration lesen und keine Haarlinie stehen bleibt.
- Die Abbildung Zeichnung -> Template ist gemessen, nicht angenommen: der
  gezeichnete Umriss wurde je Zahn gegen `tooth-base` gehalten, unveraendert und
  y-gespiegelt. Oberkiefer passt unveraendert, Unterkiefer gespiegelt.
- **Halskaries und Karies unter der Krone sind Baender am Zahnhals**, aus Umriss
  und Zahnhalslinie abgeleitet (`tools/toothgen/halsbaender.py`) statt aus dem
  Spender gewarpt. Sie brauchen nichts Gezeichnetes. Vorher sass die Halskaries
  im Mittel 5,1 und am oberen ersten Praemolaren 19,5 Einheiten neben der
  Schmelz-Zement-Grenze - am oberen Sechser war sie ein diagonaler Schmier quer
  darueber und dabei in zwei Stuecke zerrissen -, und ihre Hoehe schwankte
  zwischen 3 und 32 Einheiten. Jetzt liegt sie 0,3 bis 0,6 Einheiten zervikal
  der Linie, nimmt genau die Halsbreite ein und misst 1,7 bis 2,9 Einheiten. Die
  beiden Baender stossen an der Schmelz-Zement-Grenze aneinander, weil dort das
  eine ins andere uebergeht.
- **Karies wird rot gezeichnet statt fast schwarz.** Alle Kariesebenen trugen
  `#0a1018`; primaere Karies fuehrt jetzt `#b3261e` - den Ton, den `index.css`
  fuer tiefe Karies schon fuehrt -, Sekundaerkaries denselben Ton dunkler
  (`#721813`, gleicher Farbwinkel und gleiche Saettigung, Helligkeit von 0,41
  auf 0,26). Geaendert in `tools/toothgen/source/` UND in den ausgelieferten
  Templates, damit ein spaeterer Neuaufbau die Farbe nicht zurueckdreht.

- Die SVG-Fingerabdruecke sind unveraendert - der Abdruck liest `id`, `opacity`
  und `class`, geaendert wurden nur `d` und `points`.

## 2.14.0 - 2026-08-17

- **One tooth template per position.** The nine permanent side-view drawings and
  eight deciduous ones became 16 and 10 — every position in the upper and lower
  right quadrant now has its own contour and its own pulp, hand-drawn by Dirk
  Saeger and inserted rather than warped; the opposite side is still the same
  drawing mirrored. The occlusal set grew from four to fourteen. Templates
  `31`, `71`, `74`, `75` and `34_occl` are retired: 18 no longer draws itself as
  17, 43 no longer as an upper canine, the lower premolars no longer as 15, and
  the lower primary canine no longer as the UPPER one.
- Removed the two scale factors that existed only to make a borrowed drawing
  read as the position it stood in: the perio chart's lateral-incisor width
  factor (0.8) and the lower-primary-canine tile scale (0.9).
- Fixed the implant fixture stretching with the tooth it is set into — a
  manufactured part now follows the root rigidly, the same rule the root posts
  already had. On template 16 the body had been drawn at twice its length, which
  put the implant platform in the crown and with it the perio chart's
  `IMPLANT_CEJ_Y` anchor.
- Fixed the occlusal plane scattering across the arch: each template's frame is
  now sized so the DRAWN incisal/occlusal edge sits a fixed distance above it,
  and the gingiva is drawn against that edge instead of the frame's nominal one.
- Occlusal tiles carry their own `tpl-<n>-occl` class, so a side view's
  per-template size rule can no longer win on an occlusal tile of the same name.
- The occlusal and deciduous templates are loaded on demand instead of being
  compiled into every consumer's module graph.
- Reworked the arch spacing so neighbouring crowns meet at their contact points:
  every column is the tooth's own drawn mesiodistal crown width plus one uniform
  slack of 8 px. The slack is the same for all sixteen, so it cancels at every
  contact and the Class I canine relationship still falls out of the tooth widths
  alone. The previous columns came from the templates the redraw replaced, which
  left the incisors 27 px apart and the molars 14.
- Fixed the lower arch rendering quadrant 3 in quadrant 4: the lower drawings are
  quadrant 4 and are rotated 180 degrees into the template frame, which flips
  left/right along with top/bottom, so the render must not mirror them again.
- Fixed each template's frame being centred on the frame rather than on the
  tooth: the crown's widest point — the contact point — now sits in the middle of
  the frame, and the gingival papilla is placed on that same point. Crowns sat up
  to 7.4 px off centre, which made neighbours drift into each other once the
  columns were tight enough to show it.
- Occlusal views: each frame is cropped to the drawn surface, they all render at
  one height, and the gum/bone context is dropped from them entirely — it carries
  no finding there (nothing toggles it) and only covered the neighbouring tooth.
  The four premolar drawings are mirrored buccal/palatal.
- Fissures drawn by hand are now INSERTED rather than warped from the donor, into
  both `fissure` and `fissure-sealing-occlusal`, so the sealing still lies exactly
  on the fissure.
- **Pulp diagnosis and root treatment are now a COLOUR, not a second shape.** A
  diseased pulp used to swap in `tooth-inflam-pulp` — a separate outline from the
  donor template, with flame sublayers — which never matched the pulp the
  dentist drew, so the pulp changed shape when a diagnosis was set. The drawn
  pulp now stays and is tinted per `pulpDx` / `pulpLatin`; an endodontically
  treated tooth is tinted in the root-filling colour and wins over a diagnosis
  (a treated tooth has no vital pulp). **This deliberately breaks the SP4
  migration guarantee that `pulpDx` renders byte-identical to the retired
  `pulpInflam` boolean** — `pulp-parity.test.ts` states the new contract. Fill is
  not part of the SVG fingerprint, so the tint itself is parity-safe; the changed
  layer activation is what moves it.
- Fillings, caries, defects and the pulp are clipped to the tooth shape that is
  actually shown (`clip-path`), so nothing can be drawn past the tooth surface
  and the pulp stays enclosed on a prepared, broken or radix tooth. The clip id
  is namespaced per tooth — all 32 live in one document, so a shared id would
  clip every tooth to its neighbour's outline.
- Occlusal tiles are no longer rotated in either jaw, and the lower side-view
  drawings are mirrored rather than rotated into the template frame. Both
  rotations dated from when the lower artwork was borrowed from the upper jaw; a
  180° rotation flips left/right along with top/bottom and therefore swapped
  mesial and distal. Mesial now faces the arch midline in all four quadrants, in
  both views, checked against the anatomically named `filling-composite-*`
  layers.
- Hand-drawn fissure lines are INSERTED into `fissure` and
  `fissure-sealing-occlusal` instead of being warped from the donor, each path
  made absolute before the group's paths are joined (Inkscape writes a relative
  `m`, so every fissure after the first landed displaced).
- `tools/toothgen/hoecker.py` derives the cusps as regions from the drawn
  outline plus fissures, extending each free fissure end to the outline as an
  auxiliary line that is used for the subdivision but never shipped.
- `tools/toothgen/build.py` writes to `tools/toothgen/spender/` instead of
  `src/assets/teeth-svgs`: the generated Schumacher templates are now the
  donor stage that the redraw takes its ~200 clinical layers from, not the
  shipped artwork. `tools/toothgen/verify_redraw.py` is the contract for what
  ships; `verify.py` and its frozen digests keep measuring the donors unchanged.

## 2.13.1 - 2026-08-16

- Fixed the shared smoking-status Observation (LOINC 72166-2) to accept the LOINC LL2201-3 / IPS Current Smoking Status answer codes alongside the engine-local codes on both export and import, so a real practice record passes through unchanged; unmappable answers such as "smoker, current status unknown" stay rejected.

## 2.13.0 - 2026-08-15

- Added lossless Dental Core export/import for the IG carrier contract, including tooth and root caries, restorations, endodontic and diagnostic findings, periodontal and peri-implant findings, implant identity, treatment requests, assessments, and notes.
- Unblocked examination recorder and case examination date handling while requiring explicit references for host-owned diabetes, HbA1c, smoking, and edentulous resources.
- Exported the Dental Core canonical URL, profile map, package version, and CodeSystem URLs from `react-advanced-odontogram/fhir`.

## 2.12.2 - 2026-08-15

- Fixed Dental Core import/export to preserve host-owned resource IDs, version IDs, and bundle `fullUrl` values; relationships now resolve relative references and `fullUrl`, while new resources use transient `urn:uuid:` URLs without codec-owned persistent IDs.

## 2.12.1 - 2026-08-15

- Declared `@types/fhir` as a published dependency so TypeScript consumers receive
  the public `fhir/r4` declarations transitively.

## 2.12.0 - 2026-08-15

- **Breaking:** removed the deprecated predecessor FHIR adapter, including its
  generated artifacts, `react-advanced-odontogram/fhir` import and export APIs
  and types, tests, and documentation. This is an intentional internal
  `2.12.0` migration release; consumers must use the documented `legacy` or
  `dental-core` session codec contract.
- Added the generated Dental Core-only FHIR contract for
  `de.cognovis.fhir.dental.core#0.3.0`.
- Added immutable per-session FHIR codec configuration: standalone sessions use upstream-compatible `legacy`, and hosts can explicitly select generated Dental Core `de.cognovis.fhir.dental.core#0.3.0`.
- Routed programmatic and built-in FHIR import/export through the same active session codec; Dental Core accepts profile-admitted Aidbox collection Bundles and rejects lossy, malformed, or cross-codec data without replacing the chart.
