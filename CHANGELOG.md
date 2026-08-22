# Changelog

## 2.40.0 - 2026-08-22

### Jarabak als drittes FRS-Verfahren (Bead odontogram-c51.2)

Dirk, 22.08.2026: *"Und ja, bitte auch Jarabak."*

- **Das Polygon S-N-Ar-Go-Me, sieben Zeilen:** Sattelwinkel 123 +/- 5,
  Gelenkwinkel 143 +/- 6, Kieferwinkel 130 +/- 7, seine beiden Teilwinkel, die
  Summe der drei hinteren Winkel 396 +/- 6 und das Hoehenverhaeltnis, das es
  seit c51.2 schon gab. Ein Test prueft, dass die drei Einzelnormen auf die
  Normsumme aufgehen — 123 + 143 + 130 = 396.
- **Der Kieferwinkel steht jetzt ZWEIMAL, und das ist Absicht.** `GnTgoAr` ist
  ueber Gnathion und Tangentengonion konstruiert, Jarabaks ueber Ar-Go-Me. Zwei
  Konstruktionen sind zwei Messgroessen, keine mit zwei Normen: sonst muesste
  die Summe der beiden Teilwinkel auf einen Winkel passen, der ueber anderen
  Punkten liegt. Nur wo dieselbe Messgroesse zwei Normen traegt, greift die
  Ueberschreibung am Profil (so wie bei Ricketts' Fazialachse).
- **Die beiden Teilwinkel bekommen KEINEN Zielwert**, obwohl die Literatur
  Zahlen nennt: sie nennt BEREICHE (52-55 und 70-75 Grad), keinen Mittelwert
  mit Streuung. Einen Bereich in eine Standardabweichung umzurechnen behauptet
  eine Genauigkeit, die die Quelle nicht hergibt. Die Messgroesse wird also
  erfasst und ohne Ziel gezeigt, und die Quellenangabe sagt genau das — ein
  Test verlangt den Wortlaut. Ohne Norm stimmen sie auch beim Wachstumsmuster
  nicht mit ab.
- **Im Importer steht das Polygon VOR `GnTgoAr`**, und darin liegt die ganze
  Pointe: dessen Muster `/kieferwinkel/i` haette "Kieferwinkel, oberer Teil"
  sonst geschluckt, denn das erste Muster gewinnt. Der ungeteilte Kieferwinkel
  bleibt, wo er seit c51.2 steht.
- Quellenangabe wie bei den schon vorhandenen Jarabak-Baendern: zweithand aus
  der kieferorthopaedischen Literatur, das Original nicht gelesen. Payload
  weiterhin 2.32, SVG-Fingerabdruecke byte-identisch.

## 2.39.0 - 2026-08-22

### Ricketts als zweites FRS-Verfahren (Bead odontogram-c51.2)

Dirk, 22.08.2026: *"Ich sehe bei der KFO nur Hasund als FRS Analyse. Wollten
wir nicht mehr anbieten?"* Doch — der Bau war von Anfang an auf mehrere
angelegt (*"ein neues Verfahren ist ein neues Profil, die Messpunkte bleiben"*),
aber ausgeliefert war nur eines. Der Grund war die Beleg-Regel: einen zweiten
Normensatz, den ich zitieren konnte, gab es nicht. Dirk hat die sechs
Erwachsenennormen dann selbst geliefert.

- **Zwei neue Messpunkte, und sie sind der eigentliche Punkt:** Porion und
  Orbitale, also die FRANKFURTER HORIZONTALE. Hasund misst gegen die vordere
  Schaedelbasis, Ricketts gegen Po-Or — vier der sechs Messgroessen brauchen
  sie. Genau dafuer traegt ein Profil sein `referenceFrame` selbst.
- **Fuenf neue Messgroessen:** Fazialwinkel 89 +/- 3, Mandibularebene ML-FH
  24 +/- 4,5, Konvexitaet 0 +/- 2 mm, UK1 zu A-Pog 1 +/- 2 mm, UK1-Inklination
  zu A-Pog 22 +/- 4. Die Fazialachse gab es schon.
- **Die Fazialachse belegt, warum Normen am PROFIL haengen.** Ricketts gibt sie
  mit 90 +/- 3,5 an, Paddenberg mit 90 +/- 3,0 — dieselbe Messgroesse, zwei
  Streuungen. 93,3 Grad liegt innerhalb der einen und ausserhalb der anderen,
  und ein Test haelt genau das fest. Ricketts bekommt eine Norm-Ueberschreibung,
  der Bestand bleibt unangetastet.
- **Die Beleg-Regel ist gewahrt, nicht umgangen.** Die Quellenangabe sagt in
  genau diesen Worten, dass die Werte von Dirk stammen und die Originale
  (Ricketts 1960, 1981) hier nicht gelesen wurden — klinisch belegt, nicht
  bibliographisch. Dieselbe Behandlung wie bei `JARABAK_BANDS`. Ein Test
  verlangt den Wortlaut, damit niemand die Angabe spaeter stillschweigend zu
  einer gelesenen Publikation aufwertet.
- **Der Importer kennt die neuen Zeilen** — Winkel und Strecke zur selben
  Bezugslinie tragen das Suffix in BEIDEN Mustern, nie ein blosses
  "uk1-a-pog"; und "Fazialachse" und "Fazialwinkel" sind zwei verschiedene
  Messgroessen, was ein Test festhaelt.
- Die Mandibularebene stimmt beim Wachstumsmuster mit ab (steiler als die Norm
  liest vertikal). Kein neuer Zustand, keine Serialisierung, kein FHIR-Bundle:
  die Kephalometrie bleibt Sitzungszustand. Payload weiterhin 2.32,
  SVG-Fingerabdruecke byte-identisch.

## 2.38.0 - 2026-08-22

### Die Kieferorthopaedie wird die dritte Ansicht (Bead odontogram-c51)

Dirk, 22.08.2026, auf die Frage, wo die beiden KFO-Karten wohnen sollen:
*"wir machen eine dritte Ansicht / Knopf fuer Deutsch = KFO."* Damit sagt der
Titel des Beads endlich, was der Bau tut: *"Orthodontics is the third clinical
odontogram view."*

- **`ModelAnalysisCard` und `CephalometryCard` sind eingehaengt.** Beide waren
  seit c51.1 und c51.2 gebaut und geprueft, aber absichtlich nirgends montiert:
  wo sie wohnen, war eine Entscheidung und keine Aufgabe. Jetzt tragen sie eine
  eigene Ansicht.
- **Der Umschalter ueberlebt den Popup-Modus.** Er war bisher als GANZES an
  `perioViewMode` gehaengt, weil beide Felder vom Parodontalstatus handelten.
  Die KFO-Ansicht hat aber kein Dialogfenster, also bleibt der Umschalter
  stehen und nur das PARODONTALE Feld faellt weg; daneben steht dort weiterhin
  der Knopf, der den Parodontalstatus als Dialog oeffnet. Der Test, der
  frueher die Abwesenheit des ganzen Umschalters festhielt, prueft jetzt die
  Abwesenheit dieses einen Feldes.
- **Das Odontogramm wird nie ausgehaengt, nur ausgeblendet** — dieselbe
  Konstruktion wie beim Parodontalstatus und aus denselben zwei Gruenden: die
  einmalig gesetzten Zuhoerer aus `wireControls()`, und die Parität der
  SVG-Fingerabdruecke, die ein Neuaufbau in Frage stellen wuerde. Ebenso das
  rechte Bedienfeld: es ist neben der KFO-Ansicht ausgeblendet, nicht entfernt.
- **Zwei Karten nebeneinander, nicht eine ueber die volle Breite.** Gemessen
  bei 1900 Pixeln: eine Karte ueber beide Rasterspalten legt in der
  Modellauswertung 900 Pixel Leerraum zwischen "Norm" und "Ist", und der Balken
  steht am anderen Ende des Bildschirms als die Zahl, die er zeigt. Ab 1400
  Pixeln stehen sie deshalb nebeneinander (je rund 930), darunter gestapelt.
  Nachgemessen bei 1440, 1300, 1000 und 800 Pixeln: kein waagerechter
  Seitenueberlauf, und der Zahnbogen 16..26 passt bei 1440 gerade ohne eigenes
  Scrollen in seine Spalte.
- Der Knopf heisst auf Deutsch **KFO**, in den uebrigen elf Sprachen der
  ausgeschriebene Fachbegriff (`view.ortho`).
- **Der erste Knopf heisst auf Deutsch jetzt "Odontogramm"** (Dirk, 22.08.2026).
  Er trug das englische Wort, seit es ihn gibt. Der Produktname (`app.title`)
  bleibt unangetastet - der heisst so. Mitgezogen: die deutsche Beschreibung des
  Parodontal-Anzeigemodus in den Einstellungen, die den Umschalter noch als
  "Odontogram | Zahnstatus" fuehrte - beide Haelften stimmten nicht mehr, denn
  der Knopf heisst "Parodontalstatus" und es sind drei Felder. In den uebrigen
  acht Sprachen, die das blosse "Odontogram" ebenfalls tragen, steht es noch (im
  Ungarischen, Slowakischen und Polnischen ist es moeglicherweise richtig so).
- Nichts am Zustand, an der Serialisierung oder am FHIR-Bundle: die
  Modellauswertung und die Kephalometrie bleiben Sitzungszustand, weil c51 fuer
  sie keinen veroeffentlichten Dental-Core-Traeger belegen konnte. Payload
  weiterhin 2.32, SVG-Fingerabdruecke byte-identisch.

## 2.37.0 - 2026-08-22

### Das Onlay bekommt eine Seitenansicht (Bead odontogram-bbd)

Dirk, 21.08.2026: *"Onlay kann ueber 4 Flaechen gehen, z.B. modl, modv, odlv
usw."* — ein `modv` hat einen vestibulaeren Anteil, den man von der Seite sieht.
Und am 22.08.2026 die Groesse dazu: *"Das Onlay soll auf 2/3 der bukkalen
Flaeche reichen. Ich denke, das ist ein guter Kompromiss."*

- **`occlusalOnly` war nie eine Regel**, sondern die Beschreibung eines
  Bestands: die Ebenen `*-onlay` gibt es ausschliesslich in den
  Kauflaechenvorlagen. Das Gatter faellt weg.
- **Ohne eine einzige neue Zeichnung.** Seit die Krone aus der Kontur
  geschnitten wird (2.31.0), ist ein Onlay keine eigene FORM mehr, sondern die
  Krone ohne ihr zervikales Drittel. In der Seitenansicht schaltet
  `composeRestorationLayers` deshalb die KRONEN-Ebene ein, und der Schnitt kommt
  als `clip-path` von der Kachel — dieselbe Aufgabenteilung wie bei der
  Hemisektion, und aus demselben Grund: etwas wegzunehmen kann keine Auflage.
  In der Kauflaechenansicht bleibt es die gezeichnete Onlay-Ebene, denn dort ist
  die Form eine andere und sie EXISTIERT.
- **Eine Falle, am Bild gefunden.** Der Unterkiefer traegt seine Kaukante oben,
  das zervikale Drittel liegt dort also unten — man erwartet zwei
  kieferabhaengige Fassungen. Es ist aber EINE: die Kachel wird als Ganzes um
  180 Grad gedreht, mit einem transform-ATTRIBUT an einem Wrapper, und der
  Schnitt rechnet im EIGENEN Koordinatensystem des Elements, also VOR der
  Drehung. Dieselbe Falle wie beim Durchbruch, wo ein negatives `translateY`
  deshalb in beiden Kiefern "nach apikal" heisst.
- SVG-Fingerabdruecke unveraendert (die Kauflaechen-Aufnahmen sind es, die die
  Onlay-Zeilen der Matrix tragen), Nutzlast und FHIR unberuehrt.

## 2.36.2 - 2026-08-22

### Die Kurzschrift-Tests fallen nicht mehr aus Zeitmangel um

- Jeder dieser Tests montiert die volle Schale und tippt wirklich — allein
  braucht der schnellste 5 und der langsamste 43 Sekunden. Unter der Last der
  vollen Suite wird daraus ein Vielfaches: *"k wirkt sofort auf einer
  Mehrfachauswahl"* ist bei 30 s abgelaufen, allein gemessen 11 s.
- Ein Fehlschlag aus Zeitmangel sagt nichts ueber die Sache aus, sondern nur
  ueber die Auslastung der Maschine — und er kostet mehr, als er einbringt: die
  Suite wird rot, und wer das oft sieht, liest "1 failed" als normal (siehe
  odontogram-xtj). Alle sieben Fristen stehen jetzt auf 90 Sekunden, dreifach
  ueber dem gemessenen Bedarf unter Last.

## 2.36.1 - 2026-08-22

### Das Dreieck des Papillenverlusts lag NEBEN der Papille (Bead odontogram-gry)

Dirk, 22.08.2026: *"das Dreieck wird mit dem Grad von 1 zu 3 groesser und soll
die Papilla verdecken. Dazu muesste es nach meinem Verstaendnis aber tiefer
sitzen, besonders bei Grad 3."*

- **Gemessen war es schlimmer als es aussah.** Das Dreieck sass VOLLSTAENDIG
  AUSSERHALB des Zahnfleischs, auf der Kronenseite, und beruehrte die
  Papillenspitze nur mit seiner Basis — am Sechser spannte das Band y 119…139,
  das Dreieck lief von 139 bis 151. Es verdeckte also nichts. Und je hoeher der
  Grad, desto **weiter weg** vom Zahnfleisch reichte es: genau umgekehrt zu dem,
  was ein Rueckgang ist.
- **Richtig herum:** die Papille IST ein Dreieck mit der Spitze am Kontaktpunkt.
  Faellt sie zurueck, verschwindet ihr KORONALER Teil — und der fehlende Teil ist
  wieder ein Dreieck, Spitze koronal, nach apikal breiter, und umso tiefer, je
  hoeher die Klasse. Das Mal liegt jetzt AUF dem Band, mit der Spitze an der
  Papillenspitze und der Basis apikal davon.
- **Die Tiefe ist ein Anteil der gemessenen Bandhoehe** (0,35 / 0,65 / 1,0),
  keine feste Pixelzahl: seit 2.25.0 haengt das Band an der eigenen
  Zervikallinie jedes Zahns, und eine feste Zahl waere am Einundvierziger etwas
  anderes als am Dreier. Nordland & Tarnow III heisst "die Papille ist weg" —
  also die volle Hoehe.
- **Die Richtung war schon richtig** und bleibt: die Spitze zeigt zum
  Kontaktpunkt, im Oberkiefer nach unten, im Unterkiefer nach oben. Nachgemessen
  an 16 und 46, bevor etwas geaendert wurde.

## 2.36.0 - 2026-08-22

### Was im Kanal liegt, kommt aus dem Kanal (Bead odontogram-7xl, dritter Teil)

Dirk, 22.08.2026: *"Das muessen wir unbedingt richtig machen."*

- **Was es war.** Die Pulpa wird EINGESETZT — Dirk zeichnet sie —, alles was in
  ihr liegt wurde dagegen GEWARPT, mit einem eigenen Feld, dessen Stuetzstellen
  auf der Pulpakontur sitzen. Eine Wurzelfuellung ist aber etwas breiter als das
  Lumen und reicht bis an den Apex; ihre Punkte liegen teils AUSSERHALB der
  Stuetzstellen, und dort geht der Spline in die Affinabbildung ueber und
  driftet.
- **Gemessen am Sechser** stand die Wurzelfuellung 12,4 Einheiten rechts und
  18,1 unten ueber die Pulpa hinaus — im Bild ein blaues Gewirr quer ueber die
  Krone, das links aus der Kachel lief. Am Fuenfer fuellte der Glasstift die
  Krone aus und schickte einen Dorn unten aus dem Rahmen. **Und es war nicht
  neu:** byte-genau gegen den Stand von gestern Abend verglichen, identisch. Die
  neue Ueberstandspruefung hat es gefunden, nicht verursacht.
- **`tools/toothgen/endo.py`** leitet jetzt ab, was abzuleiten ist — dieselbe
  Bewegung wie bei der Krone, nur ein Feld weiter innen:

      endo-filling              das Lumen selbst
      endo-medical-filling      dasselbe (die Farbe unterscheidet sie)
      endo-filling-incomplete   das Lumen, apikal um 18 % verkuerzt
      endo-glass-pin            der koronale Teil des Kanals (45 %)
      endo-metal-pin            derselbe
      endo-resection            der abgetrennte Apex, aus der KONTUR

- **Jedes Stueck, nicht das laengste:** anders als beim Kronenschnitt werden
  beim Lumen ALLE zusammenhaengenden Teile behalten. Ein mehrwurzeliges Lumen
  faellt apikal in mehrere Kanaele auseinander, und eines wegzulassen hiesse,
  einen Kanal ungefuellt zu lassen. Sie stehen als Teilpfade in EINEM `d` — der
  Sechser hat drei Kanaele und trotzdem eine Wurzelfuellung.
- **`BEKANNTE_UEBERSTAENDE` schrumpft von 19 auf 5**, und keiner der fuenf ist
  mehr eine Endo-Ebene. Die Pruefung hat die vierzehn selbst zum Streichen
  angemeldet.

Nicht angefasst: der parapulpaere Stift steckt neben der Pulpa im Dentin und ist
aus ihr nicht zu schneiden; die Entzuendungsebenen sind eine Textur und keine
Form; die Resorptionen liegen an der Wurzelwand.

## 2.35.0 - 2026-08-22

### Der Lockerungsgrad als roemische Ziffer (Bead odontogram-7xl)

Dirk, 22.08.2026: *"Wir schreiben eine roemische Ziffer I - III in das Kaestchen
des Zahnes, unten in eine Ecke. Mir faellt nichts ein, wie man Lockerung sonst
graphisch darstellen koennte."*

- **Beim Bauen kam der eigentliche Grund dazu:** die Gruppe `mobility` hat GENAU
  ZWEI Kinder, `tooth-mobility-1` und `-2`, und beide standen immer auf aktiv.
  Eingeschaltet wurde die Gruppe als GANZES, unabhaengig vom Grad — **M1, M2 und
  M3 haben also seit jeher dasselbe Bild gezeichnet.** Der Grad war nie zu sehen.
  Die Ziffer ist damit nicht nur die huebschere Loesung, sondern die einzige, die
  ueberhaupt zeigt, was gemeint ist.
- `updateToothMobilityMark` schreibt `data-mobility` mit `I`/`II`/`III` an das
  DIV der Kachel; CSS zeichnet es unten links. **`::before`, weil die
  Retentionsmarke daneben `::after` benutzt** — beide sitzen an derselben Kachel
  und duerfen sich nicht verdraengen; jene steht mittig, diese in der Ecke.
- Nicht in der Kauflaechenansicht, wie die Retentionsmarke: die Kachel ist klein,
  und die Lockerung gehoert zum Zahn und nicht zu einer Ansicht.
- **Dieselbe Bedingung wie vorher die Ebene**: kein Implantat (osseointegriert,
  kein Desmodont), keine Luecke, keine frische Extraktionswunde.
- Der Regressionsschutz von SP15 stand vorher andersherum ("still renders the
  mobility glyph"). Er bleibt sinnvoll, nur ist sein Bezugspunkt ein anderer: es
  gibt keinen Glyphen mehr, den ein Implantat faelschlich zeigen koennte.
- Nutzlast, FHIR und Zusammenfassung unveraendert; die Marke steht ausserhalb des
  SVG, der Fingerabdruck sieht sie nicht.

## 2.34.1 - 2026-08-21

### Was die Form der Krone IST, kommt aus der Krone (Bead odontogram-7xl)

Der Rest dessen, was beim Extraktionskreuz aufgefallen war. Drei Ebenen stellen
die Krone dar und wurden trotzdem gewarpt:

- **`crown-needed-shape`** — die rote Flaeche ueber der Krone. Sie stand an 46
  bis zu 9,1 Einheiten neben dem Zahn und lief ueber das Zahnfleisch. Jetzt IST
  sie die abgeleitete Krone.
- **`crown-replace-shape`** — dieselbe Form als blosse Linie. Sie war die letzte
  Ebene, die nach der Reparatur des Verformungsfelds noch an neun Vorlagen bis
  5,9 Einheiten neben dem Zahn stand. Jetzt umfaehrt sie die Krone.
- **`crown-leakage`** — der Randbefund. Gewarpt lag er ueberall anders: an 16
  ueber die Zervikallinie gelegt und 12,5 Einheiten hoch, an 41 zehn Einheiten
  davon entfernt und nur 3 hoch, an 46 fast ganz in der Krone. Ein Randbefund
  gehoert an den Rand, und der ist seit `kronen.py` eine bekannte Gerade — er
  wird jetzt als BALKEN darauf gezeichnet, etwas mehr nach koronal, denn eine
  Undichtigkeit laeuft an der Krone entlang und nicht in die Wurzel. Dieselbe
  Ueberlegung wie bei `halsbaender.py`.

Farben, Strichstaerken und der Ebenenbestand bleiben unangetastet — ersetzt wird
nur das `d`. `verify_redraw.py` gruen, Fingerabdruecke byte-identisch.

**Was uebrig bleibt** und in odontogram-7xl steht: die neunzehn eingefrorenen
Ueberstaende sind jetzt AUSNAHMSLOS Ebenen am PULPAFELD — Stifte,
Wurzelfuellungen, Pulpitis, die Wurzelspitzenresektion. Das ist ein anderes Feld
und eine andere Frage. Und die Lockerungsgrade sehen weiterhin wie eine
Stachelreihe neben der Wurzel aus; ob das die beabsichtigte Darstellung ist,
muss Dirk am Bild sagen.

## 2.34.0 - 2026-08-21

### Auch die Fuellung darf ihr Produkt nennen (Bead odontogram-99h, zweiter Teil)

Dirk, 21.08.2026: *"Ja, beim Komposit machen wir es der Vollstaendigkeit halber
mit dazu, erlauben aber, dass es fehlt."*

- **JE MATERIAL, nicht je Flaeche.** Eine Spritze fuellt mehrere Flaechen, und
  ihre Charge gilt fuer alle davon — `mod` ist EINE Fuellung, nicht drei. Je
  Flaeche zu speichern hiesse, dieselbe Chargennummer dreimal zu fuehren und
  dreimal auseinanderlaufen zu lassen. **Ein** Satz je Zahn genuegt aber auch
  nicht: ein Zahn kann mesial Komposit und distal Glasionomer tragen, und das
  sind zwei Produkte. Also `fillingProducts: Record<material, Produkt>`.
- **Derselbe Satz wie bei der Laborarbeit** (`RestorationProduct`), damit es
  nicht zwei Formen fuer dieselbe Sache gibt — nur `lab` bleibt hier leer, eine
  direkte Fuellung entsteht am Stuhl.
- **UND ES GIBT KEINEN LUECKENHINWEIS.** Das ist der Unterschied zur
  Laborarbeit: dort meldet `isRestorationProductGap`, was diese Praxis
  eingegliedert hat, ohne dass etwas notiert ist. Eine Fuellung ohne
  Produktangabe ist dagegen nie ein Mangel — *"erlauben, dass es fehlt"* heisst,
  dass niemand daran erinnert wird. Es gibt schlicht kein Praedikat, das hier
  etwas melden koennte.
- **Die Vorschlagsliste ist EINE**: `knownProducts`/`knownLabs` lesen
  Laborarbeit und Fuellung aus demselben Chart, eine Praxis hat eine Liste und
  nicht zwei.
- FHIR: ein `Device` je Material, `type` das Fuellmaterial mit demselben lokalen
  Code wie im Befund, die Charge in `lotNumber`.
- Ein Block mit Materialwahl statt einem Block je Material: ein Zahn traegt fast
  immer eines, und wo er zwei traegt, waeren zwei gleich aussehende Bloecke
  uebereinander schwerer zu lesen als eine Auswahl.
- Nutzlast **2.31 → 2.32**, omit-when-empty, toleranter Import (ein fremdes
  Material faellt weg, ohne die uebrigen mitzureissen). Kein `svgLayer` →
  Fingerabdruecke byte-identisch.

**Nebenbei aufgeraeumt:** neunzehn Testdateien banden die Nutzlastversion als
Zeichenkette und mussten bei jeder Anhebung von Hand nachgezogen werden. Sie
lesen jetzt `PAYLOAD_VERSION`. Was eine solche Zusicherung sagen soll, ist "der
Export traegt die aktuelle Version" — und genau das sagt sie jetzt, statt eine
Zahl zu wiederholen, die anderswo steht.

## 2.33.0 - 2026-08-21

### WELCHES Produkt in der Restauration steckt (Bead odontogram-99h)

Die zweite Haelfte dessen, was `odontogram-im1` fuer das Implantat gebaut hat.
Dirk, 11.08.2026, gefragt, ob ein Befund die Klasse oder das Produkt tragen
soll: *"Die reine Klasse. Das Material ist eine separate Aussage."* — und am
21.08.2026, was daraus folgt: *"eine derartige Versorgung muss auch gueltig
sein, wenn sie nicht erhoben wird. Bei einem Eingangsbefund wird sie mit grosser
Wahrscheinlichkeit sowieso nicht zu ermitteln sein."*

- **`src/restorationProduct.ts`**, DOM-frei wie `implantProduct.ts` daneben, und
  es LEIHT dessen UDI-Leser statt ihn zu wiederholen. Felder: Hersteller,
  Produktname, **Zahnfarbe**, **Labor**, UDI, GTIN, Charge, Seriennummer,
  Verfall — jedes freiwillig.
- **Die Zahnfarbe steht bei der ARBEIT und nicht beim Zahn**: was bestellt und
  geliefert wurde. Und sie steht da, weil sie in der Praxis oft das Einzige ist,
  was ueberhaupt notiert wird — ein Feld, das haeufig gefuellt wird, traegt den
  Rest mit.
- **Die CHARGE ist der Grund fuer das Ganze.** Der Pruefstein aus dem Bead: wer
  *"welche Patienten tragen Los X"* nicht beantworten kann, hat das Problem
  nicht geloest, das dieses Feld rechtfertigt. Eine getippte Charge kann der UDI
  nicht widersprechen — der Traeger wird beim Speichern neu gelesen —, aber ohne
  Traeger bleibt sie stehen, denn nicht jedes Produkt bringt einen Barcode mit.
- **Eine Krone ohne Produktangabe ist ein VOLLSTAENDIGER Befund.**
  `isRestorationProductGap` zieht die Grenze wie `isImplantProductGap`: sie
  schweigt, solange es keine Eingangsuntersuchung gibt (ohne Vergleichspunkt
  waere die Warnung geraten), sie schweigt an Arbeit, die beim Eingang schon da
  war (der Patient hat sie mitgebracht), und sie meldet nur, was diese Praxis
  selbst eingegliedert hat. Abgeleitet aus dem Archiv (odontogram-ap7), nie ein
  zweites Kennzeichen daneben.
- **Kein Katalog.** `knownProducts` und `knownLabs` sammeln die Liste aus den
  eigenen Charts — derselbe Einwand wie beim Implantat, und er gilt hier
  genauso: es gibt hunderte Produkte, niemand traegt einen Katalog ein, also
  wird nichts eingetragen.
- **FHIR: ein eigenes `Device`**, nie eine Aufweitung des Materialcodes. Der
  Materialkatalog, in den wir exportieren, fuehrt KLASSEN und nennt Produkte nur
  als Beispiel innerhalb einer Klasse — er hat also genau Dirks Position
  eingenommen und hat kein Feld fuer das Produkt. Die Charge steht in
  `lotNumber`, dort wo ein Rueckruf sie sucht; `type` bleibt die Materialklasse
  mit demselben lokalen Code wie im Befund.
- Setter durch das DS-1-Gatter, Wache davor (`restorationProductAllowed`);
  omit-when-empty; toleranter Import. Nutzlast **2.30 → 2.31**.
- Kein `svgLayer` → SVG-Fingerabdruecke byte-identisch.

## 2.32.1 - 2026-08-21

### Die Schneidekante gehoert auch in die Draufsicht (Bead odontogram-qvr)

Dirk, 21.08.2026: *"Mach bitte bei Kronen in der Front, 13-23, 33-43 auch die
feine Zeichnung der Incisalkante mit in die okklusale Ansicht. Das sieht besser
aus."*

- Der erste Wurf (2.32.0) hatte die Front ausgenommen, mit der Begruendung, sie
  habe keine Fissuren. **Nachgesehen stimmt die Begruendung nicht:** jede
  Frontzahn-Draufsicht traegt beide Gruppen — vier Felder in `cusps`, drei Zuege
  in `fissure` —, und das IST die Zeichnung der Schneidekante. Einer Krone fehlt
  sie genauso wie dem Molaren sein Fissurenmuster.
- Also faellt das Gatter weg: jede Kauflaechenkachel zeigt ihr eigenes Relief im
  Material, vorn wie hinten. Kein neuer Weg, keine neue Regel — nur eine
  Bedingung weniger.

## 2.32.0 - 2026-08-21

### Fissuren und Hoecker auch unter der Krone (Bead odontogram-qvr)

Dirk, 21.08.2026: *"Bei Kronen und Onlays auf Praemolaren und Molaren sollte die
Fissur- und Hoeckerkonfiguration die wir haben auch in der Kauflaeche in dem
gewaehlten Material sichtbar sein. Das wuerde richtig elegant aussehen und das
hat sonst niemand."*

- **Gezeichnet wird nichts Neues.** Die Kauflaechenvorlage traegt die
  Hoeckerfelder laengst als eigene Formen (`g#cusps`, sechs beim Sechser) und
  die Fissuren als eigene Zuege (`g#fissure`) — und beide bleiben unter einer
  Restauration sogar AKTIV. Die Kappe deckt sie nur zu, weil sie im Dokument
  spaeter steht und die ganze Kautafel fuellt.
- Also wird ihr die Fuellung genommen und den Hoeckern gegeben:
  `syncOcclusalRelief` schreibt `data-occl-resto` mit dem Material an die
  Kachel — an das DIV, nicht ans SVG —, und die Regeln in `index.css` malen
  Tafelgrund, Hoeckerkuppeln und Fissuren aus diesem Material.
- **Kein Element wird geschaltet, keine id angefasst**: der SVG-Fingerabdruck
  haelt `id`, `opacity` und `class` fest und sieht davon nichts. Parität
  byte-identisch, Nutzlast und FHIR unberuehrt.
- **Die Fissurenfarbe ist der Materialton zu 45 % abgedunkelt**, ausgerechnet
  statt gesetzt: eine feste graue Linie sieht auf Gold wie ein Kratzer aus und
  auf Metall gar nicht.
- **Nur Seitenzaehne.** Eine Frontzahn-Draufsicht hat keine Fissuren; ihre zwei
  Felder sind die Schneidekante, und eine Krone darauf ist eine Kappe.
- Ein Fehler beim Bauen, den ein Test jetzt festhaelt: die erste Fassung war
  WENIGER spezifisch als die Hoeckerregel der Tiefenwirkung — die Goldkrone kam
  weiss heraus, weil `odonDepthCusp` gewann.

## 2.31.3 - 2026-08-21

### Das Extraktionskreuz wird gezeichnet, nicht abgebildet (Bead odontogram-7xl)

Dirk, 21.08.2026: *"Kannst du fuer X extrahieren auch ein einfaches X
drueberlegen?"*

- `starr_im_rahmen` hatte das Kreuz in 2.31.2 gerade gemacht — aber es blieb die
  Form, die im Spender gezeichnet ist: zwei leicht geschwungene Baender, deren
  Kreuzungspunkt hoch sitzt und deren Arme verschieden lang sind. Starr
  abgebildet ist das ein sauberes Abbild einer Form, die niemand als Kreuz
  gezeichnet hat.
- **Ein Kreuz ist keine Zeichnung, sondern eine Konstruktion:** die beiden
  Diagonalen eines Kastens. `tools/toothgen/symbole.py` rechnet sie aus dem
  Zahnkasten — Seitenansicht die Kontur, Kauflaeche die Tafel — und schreibt sie
  in die bestehende Ebene. Dieselbe Ueberlegung, aus der `gum.py` das
  Zahnfleisch in Endkoordinaten zeichnet und `halsbaender.py` die Halsbaender
  als Balken rechnet, statt beides zu warpen.
- **Unangetastet bleiben Ebene, id, Zahl und Reihenfolge der Pfade und ihr
  Stil** — ersetzt wird nur das `d`. Der Ebenenbestand bleibt damit identisch
  (`verify_redraw.py` prueft ihn gegen den Spender) und der SVG-Fingerabdruck
  ebenso; der haelt `id`, `opacity` und `class` fest, nicht die Geometrie.

## 2.31.2 - 2026-08-21

### Ein Symbol ist keine Anatomie (Bead odontogram-7xl)

Dirk, 21.08.2026, am Extraktionskreuz von 36: *"Das ist komplett verzogen."* Es
lief als zwei wellige Baender an den Wurzeln entlang statt als Kreuz.

- **Es war nicht nur das X.** Nachgemessen ueber alle 26 Seitenansichten, als
  Abweichung eines Striches von der Geraden zwischen seinen Endpunkten, bei
  Zaehnen um die 30 Einheiten Breite:

      extraction-plan     bis 49,13 (44)      tooth-mobility-2   bis 29,60 (44)
      crown-replace       bis 37,01 (16)      crown-needed-path  bis 25,33 (16)
      tooth-mobility-1    bis 27,76 (44)      crown-leakage      bis 28,10 (47)

- **Der Grund ist derselbe wie beim Implantatkoerper und beim Stift:** ein
  Thin-Plate-Spline biegt Geraden. Der Zahn DARF sich biegen, ein Symbol nicht —
  es bedeutet etwas, es stellt nichts dar. Beide anderen Faelle waren laengst
  ausgenommen (`starr_aus`), die Symbole nie.
- **`starr_im_rahmen`** bildet sie jetzt ab: gleichmaessige Skalierung und
  Verschiebung vom Kasten des Spenderumrisses auf den des eingesetzten,
  **ohne Drehung**. Zwei Zwischenstaende sind dabei verworfen worden, beide am
  Bild erkannt: `starr_aus` am Symbol selbst genommen leitet seine Drehung aus
  dessen eigener Laengsachse ab, und beim Kreuz ist das eine seiner Diagonalen —
  es kam gerade heraus, aber schief und halb aus der Kachel. An der Kontur
  genommen nahm es die Neigung des Zahns mit, und ein mitgeneigtes Kreuz ist
  kein Kreuz mehr.
- **Die gestern gebaute Pruefung hat einen eigenen Fehler von mir gefangen:**
  `crown-replace` stand zuerst als GRUPPE in der Symbolliste. Sie enthaelt aber
  nur `crown-replace-shape`, also genau die Kronen-Silhouette, die ich ausnehmen
  wollte — die stand danach an neun Vorlagen bis zu 5,9 Einheiten neben dem
  Zahn. Gefunden hat das nicht das Nachdenken, sondern `bleibt_im_zahn`, im
  ersten Lauf nach der Aenderung.
- Ausgenommen bleiben `crown-needed-shape`, `crown-replace-shape` und
  `crown-leakage`: die ersten beiden sind Kronen-Silhouetten, die dritte laeuft
  am Kronenrand entlang. Sie STELLEN etwas dar und gehoeren ans Zahnfeld.

Nutzlast, FHIR und SVG-Fingerabdruecke unberuehrt.

## 2.31.1 - 2026-08-21

### Warum es an 46 ueberhaupt einen Warp gab (Bead odontogram-8i5, behoben)

Dirks Frage nach der Kronenableitung: *"Warum haben wir ueberhaupt einen Warp an
46?"* Die Antwort ist die Ursache des Fehlers.

- **Ein Warp ist an JEDEM Zahn noetig**, nicht nur an 46: eine Vorlage traegt
  rund zweihundert klinische Ebenen — Karies, Fuellungen, Endo, Implantat,
  Zyste, Zahnstein. Gezeichnet werden Umriss und Pulpa. Alles andere kommt aus
  dem Spender und muss der neuen Kontur FOLGEN; dieses Folgen ist der Warp.
- **Was an 46 anders war, ist eine einzige Zahl:** `STUFEN["46"] = 65` gegen 40
  ueberall sonst — die Zahl der Hoehenzeilen, aus denen das Feld seine
  Stuetzstellen nimmt.
- **Sie stammt aus einer Zeit, die vorbei ist.** Die 65 wurden eingestellt, als
  der UMRISS noch gewarpt wurde; sie brachten 46 auf jener Messung von 6,56 auf
  2,80 herunter. Seit Dirks Frage vom 17.08.2026 (*"46 Kontur, warum
  nachgezeichnet, warum nicht die blaue Linie nutzen"*) wird der Umriss
  EINGESETZT, und die Pulpa ebenso. Die Groesse, fuer die die 65 einmal
  eingestellt wurden, haengt gar nicht mehr am Feld. Geblieben ist nur ihre
  Nebenwirkung.
- **Und die ist gemessen** — je mehr Zeilen, desto weiter treibt das Feld alles
  hinaus, was nicht eingesetzt wird:

      Stufen    Ebenen mehr als 3 Einheiten neben der Kontur    groesster
          20                                                0        0,00
          25                                                0        0,00
          30                                               25        5,21
          40                                               41        7,22
          50                                               44        8,79
          65                                               45       10,05

- **`STUFEN["46"]` steht jetzt auf 25.** Keine einzige Ebene steht mehr neben
  dem Zahn; Umriss, Lumen, Zahnfleischband, Okklusionsebene und Ebenenbestand
  sind unveraendert, weil sie alle nicht am Feld haengen.
- **Die neue Pruefung hat sich dabei selbst bewaehrt:** `BEKANNTE_UEBERSTAENDE`
  ist von 42 auf 19 Eintraege geschrumpft, und zwar nicht weil jemand daran
  gedacht haette — `verify_redraw.py` hat die 23 Eintraege an 46 selbst zum
  Streichen angemeldet, weil sie sauber geworden sind.

Damit ist odontogram-8i5 behoben, nicht umgangen. Die 24 Ebenen, die die
Kronenableitung nicht loesen konnte (Bruchvarianten, Fissurenversiegelung,
Abrieb, Inlay, Veneer), sitzen jetzt im Zahn. Payload, FHIR und
SVG-Fingerabdruecke sind unberuehrt.

## 2.31.0 - 2026-08-21

### Die Krone kommt aus dem Zahn (Bead odontogram-5hm)

Dirk, 21.08.2026: *"Ich habe den Eindruck, wir muessen die Art, wie
Restaurationen gezeichnet werden, komplett ueberdenken. Wie waere es, die
normale Kronenform des Zahnes zu nutzen und einfach einzufaerben."* — und nach
dem Entwurf: *"Ich finde B super, so bauen."*

- **`tools/toothgen/kronen.py`, dritte Stufe.** Bis hierher war jede Kronenkappe
  eine EIGENE Zeichnung im Spender, die der Redraw auf Dirks Kontur verformte.
  Zwei Formen, die uebereinanderliegen sollen und getrennt entstehen, koennen
  auseinanderlaufen — an 46 taten sie es um 9,4 Einheiten. Jetzt wird die Krone
  AUS der Kontur geschnitten: elf Kronenebenen je Vorlage, in allen 52.
- **Der Schnitt braucht keine neue Zahl.** `redraw_plan.ZERVIKAL` haelt 26 am
  Bestand gemessene Hoehen der Schmelz-Zement-Grenze, die `verify_redraw.py`
  ohnehin auf 0,15 Einheiten genau nachprueft — sie traegt schon das
  Zahnfleischband. Eine zweite Zahl daneben waere genau die Stelle, an der beide
  auseinanderlaufen. Eine Ableitung aus dem Umriss allein (der Hals als engste
  Stelle) ist probiert und verworfen: am mehrwurzeligen Zahn findet sie den
  APEX, weil die Breite dort gegen null geht.
- **Die Kauflaechenansicht hat keinen Hals** — dort IST die Krone der ganze
  Umriss der Kautafel (`background-cusp`), und genau der wird sie.
- **Die innere Teleskopkrone** entsteht aus derselben Form, um den Mittelpunkt
  der Zervikallinie zusammengezogen: der Kronenrand bleibt stehen, die Kappe
  wird nach koronal und seitlich schmaler. Der doppelte Umriss IST die Aussage
  dieser Restauration.
- **Gemessen:** Ueberstand der Krone ueber die Kontur ueber alle 26
  Seitenansichten jetzt zwischen -4,47 und -0,00. Vorher stand 46 bei +9,40.

### Und sie ist ein Koerper, keine Flaeche

- Neun radiale Verlaeufe in `App.tsx`, je einer fuer die Materialien, die bisher
  eine flache Farbe waren (e.max und Metallkeramik bringen ihre Neun-Stopp-Rampe
  aus der Vorlage mit). **Der mittlere Stopp IST die eingestellte Farbe** — das
  ist der Grund, warum diese Woelbung die Regel *"nur die Zahnsubstanz wird
  schattiert"* nicht bricht: die Aussage der Farbe bleibt unveraendert, sie wird
  nur beleuchtet. Alle drei Stopps laufen ueber die Palettenvariable, wer unter
  Einstellungen → Farben eine andere Farbe waehlt, bekommt IHRE Woelbung.
- **Zwei Schreibweisen je Stopp, mit Absicht:** das Attribut traegt den
  ausgerechneten Rueckfall, die Stilangabe das `color-mix`. Kennt ein Browser
  `color-mix` nicht, faellt die Stilangabe beim Einlesen weg und das Attribut
  greift — statt dass ein ungueltiger Farbwert die Krone schwarz macht.
- Nicht an den Schalter `odon-depth` gehaengt: jene Schattierung ist eine
  Lesehilfe, die man abstellen koennen muss; die Woelbung einer Krone ist die
  Materialdarstellung selbst.

### Die Pruefung, die gefehlt hat

- `verify_redraw.bleibt_im_zahn` prueft, ob eine Ebene WAAGERECHT innerhalb der
  Kontur bleibt. Das ist die Eigenschaft, deren Fehlen odontogram-8i5 lautlos
  hat entstehen lassen: Ebenenbestand, Kontur, Lumen und Okklusionsebene waren
  alle unveraendert — der Schaden sass eine Ebene weiter.
- **Der Grenzwert ist abgelesen, nicht geraten:** ueber alle 4294 Ebenen liegt
  der Median bei -0,64, 99 % unter 1,59, und darueber klafft eine Luecke bis zu
  einem Haufen zwischen 3 und 9,6. `TOL_INNERHALB` liegt in dieser Luecke.
- **42 bestehende Ueberstaende sind eingefroren** (`BEKANNTE_UEBERSTAENDE`), 23
  davon an 46 — ein Vertrag, der von Anfang an rot ist, prueft nichts mehr.
  Gemeldet wird auch, was in der Liste steht und inzwischen sauber ist, damit
  sie nur kuerzer werden kann.

### Was das NICHT loest

odontogram-8i5 wird kleiner, nicht erledigt. Von den 35 Ebenen, die an 46 neben
der Kontur standen, sind **11 die Kronenfamilie** und mit der Ableitung
verschwunden; **24 bleiben** — die sechs Bruchvarianten, die
Fissurenversiegelung, der Bruxismus-Abrieb, `crown-needed`/`crown-replace`,
Inlay und Veneer in je fuenf Materialien, `tooth-base-beauty-2`. Inlay, Onlay
und Veneer decken den Zahn nur teilweise und lassen sich nicht aus seinem
Umriss schneiden; beim Veneer ist genau dieses Muster schon einmal gescheitert
(`veneer_aus`).

Nutzlast, FHIR und die SVG-Fingerabdruecke sind unberuehrt: der Abdruck haelt
`id`, `opacity` und `class` fest, nicht die Geometrie und nicht die Fuellung.

## 2.30.0 - 2026-08-21

### Das Inlay ist wieder auffindbar (Bead odontogram-1u2)

Dirk, 18.08.2026: *"kein Goldinlay, kein Keramikinlay waehlbar oder ich finde es
nicht."* Sie WAREN waehlbar und sogar schon nach Art gruppiert. Gefunden hat er
sie trotzdem nicht, und daran waren zwei Dinge schuld:

- **Jede der sechs festen Gruppen begann mit demselben Wort** — "Fest: Krone",
  "Fest: Bruecke", "Fest: Inlay". Ein Wort, das auf jeder Ueberschrift steht,
  unterscheidet nichts und muss bei jedem Lesen uebersprungen werden. Die
  Ueberschrift ist jetzt die Art selbst; die herausnehmbaren behalten ihre
  eigene, denn DA liegt der Unterschied.
- **Die Zeile hiess nur "Gold"** — und ein `<select>` vergleicht getippte Zeichen
  AUSSCHLIESSLICH mit dem Text der OPTION, nie mit dem Label der `optgroup`. Wer
  "Gold" tippte, landete deshalb immer auf der Krone, und das Goldinlay war von
  der Tastatur aus ueberhaupt nicht erreichbar. Jetzt nennt jede Zeile ihre Art
  mit, und keine zwei Zeilen heissen mehr gleich.
- Der Text kommt aus `restorationSummaryLabel`, derselben Funktion, die Kurzinfo
  und Zusammenfassung benutzen — eine zweite Fassung derselben Beschriftung waere
  genau die Stelle, an der beide auseinanderlaufen. Ein Test haelt das fest.

### Das Provisorium bekommt eine Zahnfarbe

Dirk, 21.08.2026: *"Das Provisorium braucht eine Farbe. Normalerweise benutzt man
einen Kunststoff, der sich an einer Zahnfarbe Lumin A3 orientiert."*

- Weiss war keine Materialfarbe, sondern gar keine: auf weissem Grund blieb vom
  provisorischen Brueckenverbinder nur die Kontur uebrig — er sah aus, als fehle
  er. Aufgefallen ist das beim Durchsehen des Kronen- und Brueckenrenderings
  (odontogram-5hm).
- `--odon-rest-temporary` faellt jetzt auf `#c8b392` zurueck, den A3-Ton der
  VITA-classical-Reihe (frueher VITA Lumin Vacuum), aus dem gemessenen
  CIELAB-Mittel L* 74 / a* 2 / b* 20 nach sRGB gerechnet. Die Messungen streuen
  je nach Untersuchung um einige Einheiten — das ist also eine ANNAEHERUNG und
  kein Normwert, und deshalb steht sie als Vorgabe da, die jede Praxis unter
  Einstellungen → Farben durch ihre eigene ersetzt (odontogram-sjr).
- Reine Fuellfarbe: der SVG-Fingerabdruck haelt `id`/`opacity`/`class` fest, nicht
  `fill`. Nutzlast, FHIR und Parität sind unberuehrt.

## 2.29.2 - 2026-08-21

### Die Unterkiefer-Molaren standen in der PAR-Ansicht seitenverkehrt (Bead odontogram-ryn)

Dirk, 21.08.2026: *"In der PAR-Ansicht sind die Kauflaechen der UK Molaren
zwischen 3/4 Quadranten vertauscht."*

- **Die Ursache ist eine halb gelesene Angabe.** `TOOTH_TEMPLATE` beschreibt die
  Lage eines Zahns mit ZWEI Feldern, `rot` und `mirror`, und
  `getToothBaseGroupFromCache` las nur `mirror`. Eine Drehung um 180 Grad kippt
  aber BEIDE Achsen — ihre waagerechte Haelfte gehoert zur Spiegelung. Die
  tatsaechliche Seitigkeit ist `mirror XOR rot180`, und im Oberkiefer stimmen
  beide ueberein (dort ist `rot` gleich 0), im Unterkiefer nie:

  | | mirror | rot | gespiegelt |
  |---|---|---|---|
  | 11–18 | nein | 0 | nein |
  | 21–28 | ja | 0 | ja |
  | 41–48 | ja | 180 | **nein** |
  | 31–38 | nein | 180 | **ja** |

  Der Unterkiefer traegt diese Paarung, seit jede Position ihre eigene Zeichnung
  hat: Dirks untere Zeichnungen SIND Quadrant 4, `rahmen_dreher` dreht sie in den
  Rahmen, und `rot:180` nimmt die Drehung zurueck.
- **Beide Haelften waren auf einmal umgedreht** — deshalb sah jeder einzelne Zahn
  fuer sich plausibel aus, und erst das PAAR las sich als vertauscht.
- **Nachgemessen im laufenden Programm**, nicht aus dem Quelltext geschlossen: am
  unteren Molaren ist die mesiale Wurzel die laengere, also sagt die tiefere
  Haelfte, wo mesial liegt. Odontogramm (unbeanstandet) gegen PAR-Ansicht:

      Odontogramm   46/47 rechts   36/37 links
      PAR vorher    46/47 links    36/37 rechts     <- genau umgekehrt
      PAR nachher   46/47 rechts   36/37 links      <- deckungsgleich

- **Der bestehende Test deckte nur den Oberkiefer ab** (11 gegen 21) — dort, wo
  die falsche Regel zufaellig richtig liegt. Jetzt steht die Tabelle
  ausgeschrieben fuer alle 32 Positionen im Test, und ein zweiter haelt fest,
  dass die beiden Zaehne eines Paares Spiegelbilder sind und nicht Kopien.
- Gilt genauso fuer den SVG-/PDF-Export des Parodontalstatus — er baut ueber
  dieselbe Funktion. Keine Nutzlast-, FHIR- oder Fingerabdruck-Aenderung.
- Ausserdem: `package-lock.json` traegt wieder dieselbe Version wie
  `package.json`. Der Hygienetest `odontogram-z4y` haengt genau daran, und er war
  nach dem Sprung auf 2.29.1 rot.

## 2.29.1 - 2026-08-21

### Der PDF-Bericht erfindet kein Geburtsdatum mehr (Bead odontogram-in2)

`assemblePdf` setzte bei leeren Identitaetsfeldern Ersatzwerte ein und DRUCKTE
sie: `"John Doe"` und `"1980-01-01"`. Der Kommentar daneben nannte den Grund —
der Bericht solle "always read like a complete document".

- **Genau das ist der Fehler.** Ein Bericht, der wie ein vollstaendiges Dokument
  aussieht und ein erfundenes Geburtsdatum traegt, ist kein unvollstaendiger
  Befund, sondern ein falscher: wer ihn in die Hand bekommt, hat keine
  Moeglichkeit zu erkennen, dass das Datum nicht vom Patienten stammt. Bei
  `"John Doe"` faellt es noch auf, bei einem Datum nicht.
- Ein leeres Feld druckt jetzt `pdf.field.notSpecified` — "nicht angegeben" in
  der Sprache des Berichts. Der Schluessel lag in allen zwoelf Sprachen bereits
  vor und war nie benutzt worden.
- **Die Zeile bleibt stehen**, statt wegzufallen: eine fehlende Zeile liest sich
  als "hier ist nichts", eine beschriftete leere als "nicht erhoben".
- **Das UNTERSUCHUNGSDATUM ist die Ausnahme** und faellt weiterhin auf heute
  zurueck. Ein Bericht wird heute erstellt; das ist keine Erfindung ueber den
  Patienten.
- Das Geburtsdatum ist seit `odontogram-iqj` ausserdem kein reines Berichtsfeld
  mehr — der Gebissvorschlag liest es. Ein Ersatzwert von 1980 waere dort ein
  sechsundvierzigjaehriges Kind gewesen.
- Der Export gelingt unveraendert; Nutzlast, FHIR-Bundle und die
  SVG-Fingerabdruecke sind unberuehrt.

## 2.29.0 - 2026-08-21

### Die Dentition aus dem Alter VORSCHLAGEN (Bead odontogram-iqj)

Dirk, 19.08.2026: *"Wir brauchen einen Schalter, um das ganze Gebiss auf
Milchzahn zu stellen. Das koennte auch schon beim Auslesen des Geburtsdatums
geschehen (Alter < 6 alles Milchzaehne)."*

- **`src/dentition.ts`** (DOM-frei und ohne Import aus `odontogram.ts`, wie
  `shorthand.ts` und `perioClassification.ts`): `ageFromDob(dob, today)` und
  `suggestDentition(age)`. Das heutige Datum wird HEREINGEREICHT — eine
  Ableitung, die sich die Zeit selbst holt, ist nicht pruefbar und liefert an
  einem Fall, der morgen wieder geoeffnet wird, ein anderes Ergebnis, ohne dass
  jemand etwas geaendert haette.
- **Es SCHLAEGT VOR und wendet nie von selbst an.** Ein Preset setzt jeden Zahn
  auf `defaultState()` zurueck; wer ein Geburtsdatum nachtraegt, hat womoeglich
  schon befundet. Der Hinweis (`#dentitionSuggestion`) steht neben den
  Preset-Knoepfen, und erst sein Knopf wendet an — durch dieselbe DS-1-Bahn wie
  die Presets selbst. Ein Test haelt fest, dass ein gesetztes Geburtsdatum
  keinen einzigen Zahn anfasst.
- **`permanent` schlaegt gar nichts vor:** das bleibende Gebiss ist der
  Ausgangszustand, und ein Knopf, der dort den ganzen Mund zuruecksetzt, waere
  keine Uebernahme, sondern ein Verlust. Wer das will, hat "Alles zuruecksetzen"
  daneben.
- **Das Geburtsdatum geht dem eingetragenen Alter vor**, wo beide da sind: es
  ist die genauere Angabe und altert von selbst mit. Beide bleiben nebeneinander
  bestehen — `age` liest die Parodontalklassifikation, und es darf von Hand
  gesetzt werden, wenn nur das Alter bekannt ist. Damit ist auch die zweite
  Frage des Beads beantwortet.
- **Das Geburtsdatum ist jetzt ueberhaupt erreichbar.** Es stand bisher NUR im
  PDF-Export-Dialog — dort wird es eingetragen, wenn der Bericht schon fertig
  ist, und fuer einen Gebissvorschlag ist das zu spaet. Es gehoert zu den
  Patientendaten, und dort steht es nun (Parodontalstatus, Karte
  "Patientendaten").
- Die Altersgrenzen (unter 6 / 6 bis 12 / ab 13) stehen als FAUSTWERTE im
  Quelltext, mit der Begruendung daneben: die untere ist die harte — der
  Sechsjahrmolar bricht als erster bleibender Zahn durch, und zwar HINTER der
  Milchreihe, ohne dass ein Milchzahn dafuer ausfaellt. Die obere ist weicher.
  Dirk bestaetigt oder korrigiert sie; im Code steht eine Konstante.
- Payload unveraendert (2.30), kein `svgLayer`, Parity byte-gleich. 12 neue
  Tests.

### Nebenbefund, gemeldet statt behoben

`assemblePdf` druckt bei leeren Identitaetsfeldern **`John Doe` und
`1980-01-01`**, damit der Bericht "wie ein vollstaendiges Dokument" liest. Ein
Bericht mit einem erfundenen Geburtsdatum ist aber kein unvollstaendiger, er ist
ein falscher — und seit diesem Bead liest der Gebissvorschlag dieses Feld.
Angelegt als Bead; was auf dem Briefkopf steht, entscheidet Dirk.


## 2.28.4 - 2026-08-21

### Eine Zahl fuer alle Milchzaehne, aus ihrer eigenen Kronenbreite

Dirk, direkt nach 2.28.3: *"Die Milchzahnkrone 75 ist im Vergleich zu 36 zu
gross. Die muss kleiner werden."* Zusammen mit seiner vorigen Beobachtung
(*"Milchmolaren-Kauflaechen sind im Vergleich zu Eck und Schneidezaehnen zu
klein"*) legen die beiden die Zahl fest — jede allein tut es nicht.

- **Der Fehler in 2.28.3 war, die Milchmolaren wie die bleibenden zu
  behandeln.** Der Verkleinerungsfaktor 0,85 dort ist eine
  Lesbarkeitsentscheidung gegen die Wucht eines Sechsers: ein bleibender Molar
  ist 65 % breiter als der Eckzahn. Ein zweiter MILCHmolar ist nur 25 % breiter
  als der Milcheckzahn — derselbe Faktor dreht dort die Reihenfolge um und macht
  den Molaren kleiner als den Eckzahn. Ihn dagegen anzuheben, wie in 2.28.3
  geschehen, macht ihn groesser als den bleibenden Nachbarn.
- **Deshalb EINE Zahl fuer alle zehn Milchvorlagen**, gemessen an der wahren
  Kronenbreite der Seitenansicht: 1,35 Bildpunkte je Einheit. Gemessen (gemalte
  Tischbreite geteilt durch die wahre Kronenbreite):

      bleibende Molaren            1,16 - 1,21
      bleibende Front              1,53 - 1,64
      Milchfront (vorher)          1,66 - 1,94
      Milchmolaren (2.28.2)        1,19      zu klein neben der Milchfront
      Milchmolaren (2.28.3)        1,52 - 2,13  zu gross neben dem Sechser
      ALLE Milchzaehne (jetzt)     1,35

- Damit stimmt der Milchsatz **in sich** — 54 und 53 kommen fast gleich gross
  heraus, wie im Mund (7,1 gegen 7,0 mm) — **und gegen den bleibenden
  Nachbarn**: 85 misst 42 Bildpunkte gegen 46 des Sechsers, ist also sichtbar
  kleiner. 1,35 ist dabei die obere Grenze; bei 1,48 waeren die beiden gleich
  breit.
- **Der Preis steht im Quelltext:** die Milchfront wird kleiner als vorher. Sie
  stand als einzige Gruppe ueber allem anderen, und ohne sie herunterzunehmen
  ist die erste Beobachtung nicht zu erfuellen, ohne die zweite zu verletzen.
- Zehn Zahlen in `src/index.css`, sonst nichts.


## 2.28.3 - 2026-08-21

### Milchmolaren-Kauflaechen waren ein Drittel so gross wie die Milchfront

Dirk am Milchgebiss: *"Milchmolaren-Kauflaechen sind im Vergleich zu Eck und
Schneidezaehnen zu klein. Da muessen wir fuer die Milchzaehne ein anderes css
verwenden, wenn das moeglich ist. Das muss dann aber auch im Wechselgebiss
korrekt funktionieren."*

- **Der Grund ist das Spaltenmodell, kein Zeichenfehler.** Ein Milchzahn steht
  auf dem Platz seines Nachfolgers, und ein Milchmolar ist deutlich breiter als
  der Praemolar, dessen Spalte er einnimmt (85 misst 41,6 Einheiten in einer
  41-px-Spalte, 84 sogar 37,6 in 34). Die Kauflaeche fuellt aber die Kachel —
  also wird ausgerechnet der breiteste Milchzahn am staerksten gestaucht,
  waehrend der schmale Milchschneidezahn in seiner Spalte Luft hat. Gemessen,
  gemalte Tischbreite geteilt durch die wahre:

      bleibende Front      0,89 - 1,01
      bleibende Molaren    0,70 - 0,83
      Milchfront           1,01 - 1,18
      MILCHMOLAREN         0,34 - 0,44

- Die vier Zahlen heben sie auf **0,69 bis 0,75**, die Hoehe der bleibenden
  Molaren. Weiter geht es nicht: bei glatt 0,75 fuer alle vier ueberlappten
  sich 84 und 85 im Bild um sieben Bildpunkte, weil beide in den engsten
  Spalten des Bogens stehen; sie sind um genau diese sieben zurueckgenommen und
  beruehren sich nun. Oben reicht der Platz.
- **Im Wechselgebiss stimmt es von selbst**, und das ist keine zweite Regel: die
  Klasse haengt an der VORLAGE, und die Vorlage daran, was an der Position
  wirklich gechartet ist — nicht an einem Gebissmodus. Steht auf 84 ein
  Milchmolar, greift `tpl-84-occl`; steht dort der bleibende Praemolar, greift
  `tpl-44-occl`. Es gibt keinen Schalter, der falsch stehen koennte.
  Nachgemessen am Wechselgebiss-Preset: jede Position zieht die Vorlage ihres
  tatsaechlichen Zahns.
- Vier Zahlen in `src/index.css`, sonst nichts. Kein Generatorlauf, kein
  Fingerabdruck, keine Geometrie.


## 2.28.2 - 2026-08-21

### Milchfrontzaehne trugen in der Draufsicht das Relief eines Praemolaren

Dirk schaltet auf das Milchgebiss und zeigt, was er sieht: die Draufsichten der
Milchschneidezaehne und -eckzaehne mit einem verzweigten Fissurenmuster, wie es
ein Praemolar hat. Nachgemessen war es genau das.

- **Die Ursache ist ein ZWEITER Zweig im Spender.** Die Kauflaechenvorlagen der
  Frontzaehne kommen vom oberen ersten Praemolaren, und der bringt neben
  `tooth-base`/`fissure` auch einen Milchzahn-Zweig mit: `milktooth-base` mit
  `background-cusp1` und `fissure1`. Eingesetzt wurde Dirks Zeichnung nur in
  den ERSTEN. Der zweite wurde bloss mitgewarpt — und genau er ist es, den ein
  MILCHZAHN zeichnet.
- Bei den bleibenden Frontzaehnen faellt das nicht auf: dort ist der
  Milchzahn-Zweig totes Gewicht, weil ein Milchzahn seit dem 17.08.2026 seine
  eigene Vorlage hat. Bei 51, 52, 53, 81, 82, 83 ist er das Bild.
- **Nicht nur die Fissuren, auch der Umriss.** Gemessen kam
  `background-cusp1` durchweg rund 15 % zu breit heraus (an `11_occl` 24,46
  gegen 21,33 Einheiten), weil er als andere Form startet und vom Feld nur
  mitgezogen wird. Jetzt wird er EINGESETZT — dieselbe Regel wie ueberall in
  dieser Kette: *was gezeichnet ist, wird eingesetzt; gewarpt wird nur, was
  niemand zeichnet.*
- Die Milchmolaren waren nie betroffen: sie nehmen den Molaren als Spender, und
  der bringt gar keinen Milchzahn-Zweig mit.
- Nur `d`-Attribute aendern sich, keine id, keine Deckung, keine Klasse —
  **Parity byte-gleich**, `toothgen:verify` gruen.

### Ein Test hatte eine zu knappe Frist, nicht ein Problem

`shorthand-tastatur > Totalprothese` fiel unter der Last des vollen Laufs mit
42,4 s gegen eine Frist von 40 s. Nachgeprueft am Stand OHNE die Aenderung
dieses Tages faellt er genauso — die Grenze war zu knapp gesetzt, nicht der
Test langsamer geworden. Er klickt achtundzwanzig Kacheln einzeln durch `act()`;
90 s. Und sein Nachbar prueft die "verstanden, aber ohne Achse"-Meldung jetzt an
`z` statt an `D`: `D` hat seit 2.28.0 ein Ziel.


## 2.28.1 - 2026-08-21

### Die Durchbruchszeile stand in der falschen Karte

Sie sass bei "Wurzel und Parodontium", zwei Karten unter der Anwesenheit —
und dort sucht sie niemand. Der Durchbruchsstand beantwortet dieselbe Frage wie
"nicht durchgebrochen" in der Anwesenheitsliste, nur eine Stufe feiner; er steht
jetzt direkt darunter, in "Zahndetails". Nebenbei hat der Kommentar zur
Wurzelfraktur wieder seine Zeile gefunden, von der ihn zuerst der
Papillenverlust und dann der Durchbruch getrennt hatten.


## 2.28.0 - 2026-08-21

### Der Zahndurchbruch in Stufen statt als Schalter (Bead odontogram-0n8)

charlys Taste `D` zeigt das Stadium eines Zahndurchbruchs in DREI Stufen. Wir
hatten `not-erupted` — durchgebrochen oder nicht, ein Schalter. Fuer das
Wechselgebiss ist gerade das Dazwischen der Befund.

- **`eruptionStage`** (`emerging` / `half-crown` / `full-crown`), abgestuft nach
  dem **sichtbaren Kronenanteil**. Nicht nach dem Bezug zur Kauebene: die
  braeuchte den Antagonisten, und ihre dritte Stufe waere der Normalzustand.
  Payload **2.29 → 2.30**, weggelassen bei `none`.
- **Die Grenze zu `not-erupted` ist scharf und beide ueberschneiden sich
  nicht:** jenes heisst, dass gar nichts zu sehen ist, dieses stuft ab, was zu
  sehen IST. Die Leiter liest sich `not-erupted` → emerging → half-crown →
  full-crown → `none` (in Okklusion). Ein nicht durchgebrochener Zahn nimmt
  keine Stufe an, ein Implantat auch nicht — ein Fabrikteil bricht nicht durch.
- **Gezeichnet wird durch VERSCHIEBEN, nicht durch neue Zeichnung.** Dirk,
  21.08.2026: *"Wir setzen die Zahnkrone in Relation zum Kiefer und Zahnfleisch
  auf eine niedrigere Hoehe und maskieren die Wurzel, die sonst aus dem Kasten
  nach oben ragen wuerde."* Die Alternative — Krone ueber die Wurzel schieben —
  haette den Umriss in zwei Teile schneiden muessen; der ist EIN durchgehender
  Pfad, `verify_redraw.py` besteht darauf, und an Vorlage 14 allein kreuzen
  **41 Ebenen** die Schmelz-Zement-Grenze. Ausserdem wird ein durchbrechender
  Zahn nicht kuerzer, er wandert.
- **Verschoben werden die Geschwister von `g#base`** — jene Gruppe enthaelt
  genau `bone-base` und `gum-base`. Zahnfleisch und Knochen bleiben damit
  stehen, weil sie nicht mitgenommen werden KOENNEN, nicht weil jemand
  aufgepasst hat. Die Kieferdrehung haengt an einer Huelle als
  Transform-ATTRIBUT, die CSS-Regel greift eine Ebene tiefer und setzt sich
  darunter: ein negatives `translateY` heisst deshalb in BEIDEN Kiefern "nach
  apikal", eine Regel statt eines Falls je Bogen.
- **Die Strecke ist ein ANTEIL der Krone, keine feste Zahl** — und das ist
  gemessen, nicht geschaetzt: mit festen 20 Einheiten war an 14 nichts mehr zu
  sehen und an 13 mehr als die Haelfte. Die Kronen streuen von 16 Einheiten am
  unteren Milchschneidezahn bis 28,6 am Eckzahn, und im Wechselgebiss — dem
  einzigen Ort, an dem diese Achse gebraucht wird — stehen genau diese
  nebeneinander. `sichtbareKrone()` liest sie je Vorlage aus dem `d`-ATTRIBUT
  des Zahnfleischbandes und dem viewBox-Rand, nie aus dem Bild: eine Messung am
  gerenderten Zahn liefe in die eigene Verschiebung zurueck.
- Maskiert wird an der KACHELKANTE, nicht am Zahnfleisch: eine Wurzel, die im
  Knochen steht, ist genau das Bild, das ein Wechselgebiss zeigen soll.
- **Das Kuerzel `D` hat sein Ziel** (`D1`/`D2`/`D3`, Stufe als Ziffer wie `K3`
  bei der Karies). Damit ist `SHORTHAND_PENDING` bis auf `z` und `R` leer, und
  beide tragen keinen Bead, weil sie keinen bekommen: unser Flaechensatz kennt
  die zervikale Flaeche nicht, und ob es die Wurzelkappe noch gibt, fragt Dirk
  selbst.
- Kein neuer SVG-Layer, keine neue Zeichnung, kein Generatorlauf — **Parity
  byte-gleich**. Eigene Zeile in der "Was aendert sich"-Liste (ein Plan, der
  einen Zahn durchbrechen laesst, aendert nicht seine Anwesenheit). 14 neue
  Tests.


## 2.27.0 - 2026-08-21

### Eine Bruecke ohne Pfeiler ist kein Befund (Bead odontogram-5rv)

Dirk, 19.08.2026, beim Aufbau der Kuerzeltabelle: *"zu b gehoert irgendwo ein k,
oder links und rechts irgendwo jeweils ein k, k-b ist die Ausnahme, bedeutet
Krone mit schwebendem Brueckenglied."*

- **`checkBridgeSpans()`** (in `bridgeOverlay.ts`, DOM-frei wie die Ableitung
  daneben) sieht jede Spanne daraufhin an, wie sie getragen wird:
  `supported` (Pfeiler auf beiden Seiten der Gliederkette), `cantilever` (nur
  auf einer) oder `unsupported` (gar keiner). Ein Pfeiler ist ein VORHANDENER
  Zahn oder ein Implantat mit Krone oder Bruecke; ein Glied eine Luecke, die als
  Bruecke gechartet ist. Beide tragen denselben Achsenwert — nur
  `toothSelection` trennt sie, und genau das wurde bisher nirgends geprueft.
- **Der Pfeiler darf eine KRONE sein und steht dann NEBEN dem Lauf.** Dirks
  Regel sagt "irgendwo ein k", und eine Krone traegt `restorationType: "crown"`,
  faellt also aus `detectBridgeSpans` heraus. Die Pruefung nimmt deshalb die
  beiden unmittelbaren Bogennachbarn mit — ohne das haette sie jede
  krongetragene Bruecke im Mund angemeckert.
- **EIN Glied ist schon eine Bruecke.** `detectBridgeSpans` liefert nur Laeufe
  ab zwei Zaehnen, weil ein Sattel eine Luecke zwischen zwei Kacheln fuellt und
  dafuer zwei braucht. Die Pruefung stellt eine andere Frage: genau Dirks
  Ausnahmefall `k-b` ist ein Lauf der LAENGE EINS, sobald der Pfeiler als Krone
  gechartet ist, und waere sonst unbemerkt durchgefallen. Aufgefallen, weil der
  Test dafuer fehlschlug — nicht beim Lesen.
- **Sie MELDET, sie verhindert nichts.** Ein Befund wird in Bruchstuecken
  aufgenommen — erst das Glied, dann die Pfeiler —, und eine Eingabe zu
  blockieren, weil sie noch nicht fertig ist, waere am Stuhl unbrauchbar. Der
  Hinweis (`#bridgeSupportGap`) steht neben der Restaurationszeile und
  verschwindet, sobald die Pfeiler stehen. Vorbild ist `#implantProductGap`.
- **Die Schwebebruecke wird gefuehrt** (`cantilever` am Glied, Payload
  **2.28 → 2.29**, weggelassen wenn falsch). Ohne diese Angabe ist sie von einem
  halb eingegebenen Befund nicht zu unterscheiden, und der Hinweis stuende
  dauerhaft an einer fertigen Arbeit. charly fuehrt sie ebenfalls als eigenen
  Eintrag ("SB Schwebebruecke"). Ein Glied OHNE jeden Pfeiler bleibt gemeldet,
  auch als schwebend erklaert: schwebend heisst einseitig gelagert, nicht gar
  nicht gelagert.
- **Der Schalter und der Hinweis sassen zuerst in `#crownActionsRow`** — und die
  steht an einer LUECKE auf `display:none`, also genau dort, wo ein
  Brueckenglied steht. Im Quelltext war davon nichts zu sehen; gefunden beim
  Nachmessen in der laufenden App.
- Reine Ableitung ohne `svgLayer`: der Overlay zeichnet unveraendert weiter, was
  gechartet ist. **Parity byte-gleich.** 20 neue Tests.


## 2.26.0 - 2026-08-20

### Papillenverlust: der beobachtete Befund neben der Ableitung (Bead odontogram-gry)

charlys Befund-Tastenfeld hat ein Dreieck fuer den Papillenverlust — Dirk,
19.08.2026: *"das Dreieck IST die Papille."* Wir hatten den Befund halb.

- **`papillaLoss`**, je Zwischenraum eine Klasse nach Nordland & Tarnow (I–III):
  I unter dem Kontaktpunkt, II auf Hoehe oder apikal der approximalen, III auf
  Hoehe oder apikal der bukkalen Schmelz-Zement-Grenze. Payload **2.27 → 2.28**,
  weggelassen wo nichts beurteilt ist.
- **Warum nicht die vorhandene Ableitung reicht:** `getToothRecessionType`
  trennt Cairo RT2 von RT3 genau am interproximalen Attachmentverlust, und der
  IST der Papillenverlust — inhaltlich also richtig. Nur braucht sie SECHS
  sondierte Stellen. Das Dreieck sieht man, bevor die Sonde in der Hand war, und
  bei der Erstuntersuchung gibt es die sechs Stellen noch nicht. Wir fuehren die
  Ableitung, nicht die Beobachtung. Beide stehen jetzt nebeneinander, und keine
  ueberschreibt die andere.
- **`papillaSites(toothNo)`** nennt die Zwischenraeume einer Position,
  positionsbasiert wie `furcationEntrances`: der letzte Zahn im Bogen hat distal
  keinen Nachbarn. Ueber die Mittellinie hinweg gibt es die Papille sehr wohl —
  die zwischen 11 und 21 ist die, die am haeufigsten fehlt.
- **Zwei Nachbarn beschreiben dieselbe Papille von zwei Seiten**, und beide
  Beurteilungen bleiben stehen. Das ist kein Fehler des Modells: der
  Parodontalstatus zaehlt MB von 46 und DB von 47 seit jeher als zwei Stellen
  desselben Zwischenraums. Die Zusammenfassung zaehlt entsprechend je Zahn und
  Seite, weil Zusammenfassen hiesse zu entscheiden, welche der beiden gilt.
- **Eigener Waechter statt der Faehigkeitsmatrix** (`papillaLossAllowed`, vor
  der DS-1-Schranke wie bei `setRetention`): `perioAxisApplies` ist die Matrix
  des Sondierungsrasters, und dieser Befund steht absichtlich daneben. **Das
  IMPLANTAT ist eingeschlossen** — es hat keine Pulpa und keinen Rand gegen eine
  Schmelz-Zement-Grenze, aber sehr wohl eine Papille, und deren Verlust ist die
  haeufigste aesthetische Beschwerde nach einer Implantation.
- **Gezeichnet als graues Dreieck** in einer eigenen Auflage VOR den Kacheln
  (`svg.papilla-marks`), Basis am Zahnfleischrand, Spitze zum Kontaktpunkt, Hoehe
  und Breite nach der Klasse. Dirk, 20.08.2026: *"blende doch einfach ein graues
  Dreieck an die Stelle ein, wo die Papille fehlt, welches zwischen die Zaehne am
  Zahnhals passt."* Ausserhalb der Zahn-SVG, also kein neuer Fingerabdruck und
  kein Generatorlauf — **Parity byte-gleich**. Die Hoehe des Zahnfleischrandes
  wird am KLON in der Bandauflage gemessen, nicht geschaetzt: ein Bruchteil der
  Kachelhoehe setzte die Dreiecke im ersten Versuch mitten in den Knochen, und
  seit 2.25.0 haengt die Bandhoehe ohnehin je Zahn an dessen Schmelz-Zement-
  Grenze.
- Zeile im Parodontalstatus (ueber der Furkation, mit Ein-/Ausschalter in den
  Einstellungen), im PDF-/SVG-Export, im Kurzbericht am Zahn, im
  Ganzkiefer-Bericht und in der "Was aendert sich"-Liste. FHIR: eine Komponente
  an der bestehenden parodontalen Observation mit lokalem Code
  (`papilla-loss-nordland-tarnow`) — fuer den Papillenverlust liess sich kein
  LOINC und kein SNOMED-Code belegen, und einen zu erfinden hiesse Terminologie
  zu behaupten, ueber die diese Anzeige nicht verfuegt. Dieselbe Behandlung wie
  BOP je Stelle, Belag und die Mombelli-Indizes.
- **Nebenbei repariert:** `mesialIsLeft` kannte die Milchquadranten nicht (6
  steht oben links wie 2, 7 unten links wie 3). Eine Klammer an einem Milchzahn
  im zweiten oder dritten Quadranten haette an der falschen Seite gehangen.


## 2.25.0 - 2026-08-20

### Das Zahnfleisch sitzt auf der Schmelz-Zement-Grenze (Bead odontogram-x8k)

Dirk, 20.08.2026, zu einer Zeichnung auf dem laufenden Bogen (`docs/zahnfleisch/dirks-linien-2026-08-20.png`): *"So
stelle ich mir das Zahnfleisch vor; wie die schwarzen Linien laufen und die
gerade untere Linie sollte das caudale Ende der Gingiva sein."* Die Papillen
laufen also richtig - die apikale Kante des Bandes sass zu weit unten.

- **Beide Kanten des Bandes haengen jetzt an der Zervikallinie des Zahns**,
  statt auf je einer Zahl fuer den ganzen Bogen zu stehen. Der Kamm sitzt
  `CREST_BELOW_CEJ` = 3,85 Einheiten apikal der Schmelz-Zement-Grenze (aus
  Dirks Zeichnung an ihren vier Gelenken gemessen: 4,60 / 3,37 / 2,89 / 4,52,
  Mittel 3,85 - knapp einen Millimeter, wo der Knochen in Gesundheit auch
  steht). Die Papillenspitze steht bei `PAPILLA_FRAC` = 0,75 der Kronenlaenge
  ueber der Kauebene, also knapp unter dem Kontaktpunkt.
- **Warum ueberhaupt:** die Zervikallinie streut ueber den ausgelieferten Satz
  von 21,9 Einheiten (41) bis 28,6 (43) und bei den Milchzaehnen bis 16,1
  herunter. Gegen einen geraden Kamm bei 36,0 ergab das ein Band, das an 41
  achteinhalb Einheiten hoch war und am fast benachbarten 43 zwei; gegen eine
  gerade Papille bei 19,0 stand die Papille an ALLEN ZEHN Milchzaehnen apikal
  des eigenen Randes, die Girlande lief dort also verkehrt herum.
- **Die Bedingung, die vorher Konstanten erzwang, gilt nicht mehr.** Sie
  lautete: eine Papille gehoert zwei Zaehnen, und kein Template weiss, neben
  wem es steht. Seit dem 17.08.2026 gibt es eine Vorlage JE POSITION, der
  Nachbar ist also bekannt. Der Aufrufer reicht die Hoehe je GELENK herein,
  beide Nachbarn rechnen dieselbe - und treffen sich weiter auf einem Punkt.
- **Am Kamm ist das Gelenk das MINIMUM der beiden, nicht das Mittel.**
  Anatomisch ist das interdentale Septum die hoechste Stelle des Knochens.
  Zeichnerisch ist es die Bedingung, unter der die Kante ueber das Gelenk
  hinweg glatt bleibt: jedes Band steht drei Einheiten in die Nachbarspalte
  hinein, und sichtbar ist immer die apikalere Kante - faellt der Nachbar vom
  Gelenk aus, verdeckt er den Ueberstand ganz; steigt er an, steht dort eine
  Stufe. Gemessen waren es 1,2 Einheiten, im Bild deutlich zu sehen.
- **Nachgemessen, nicht geschaetzt:** ueber beide Boegen abgetastet hat die
  apikale Kante des Bandes KEINEN Sprung ueber 0,35 Einheiten mehr - vorher bis
  1,2. Genau diese Messung fordert der Bead, und zwar vor der Aenderung.
- **`redraw_plan.ZERVIKAL`** haelt die 26 Hoehen, eingefroren wie `_KRONE`;
  `verify_redraw.py` misst sie gegen die ausgelieferten Vorlagen nach, damit
  eine geaenderte Zeichnung nicht lautlos die Girlande des Nachbarn auf eine
  Hoehe stellt, die es nicht mehr gibt.
- Die SPENDER bleiben auf der alten flachen Regel und damit byte-gleich - ihr
  Band wird im Redraw ohnehin ueberschrieben, und siebzehn eingefrorene
  Geometrie-Pruefsummen fuer eine Form zu bewegen, die niemand sieht, waere der
  falsche Preis. Der Fingerabdruck des Odontogramms liest id, opacity und class
  und nie Geometrie: Parity byte-gleich, Payload unveraendert bei 2.27.


## 2.24.0 - 2026-08-20

### Wurzelfraktur und Hemisektion werden gezeichnet (Beads odontogram-t6y / -ca0)

Dirk, 20.08.2026: *"Bei einer Wurzelfraktur sollte eine Bruchlinie durch die
Wurzel gezeichnet werden, bei mehrwurzeligen Zaehnen per Schalter zwischen den
Wurzeln wechselbar. Bei der Hemisektion wird an der Furkation durchtrennt und
eine Wurzel entfernt. Auch hier muss die entfernte Wurzel umschaltbar sein."*

- **`rootsOf(toothNo)` BENENNT die Wurzeln einer Position**, statt sie zu
  zaehlen: oberer Molar mesiobukkal/distobukkal/palatinal, unterer
  mesial/distal, 14 und 24 bukkal/palatinal. Positionsbasiert wie
  `furcationEntrances` daneben. Leer heisst einwurzelig - dort zeigt die
  Bedienung den Schalter gar nicht erst.
- **Zwei Wurzelangaben** (`rootFractureRoot`, `rootResectionRoot`), gegen
  `rootsOf` geprueft: ein palatinaler Wert landet nie an einem unteren Molaren.
  Payload **2.26 -> 2.27**.
- **Die Bruchlinie** ist schwarz und liegt in einer Auflage VOR den Kacheln -
  eine Fraktur liegt auf dem Zahn. Laengs laeuft sie mit der Wurzel, quer
  darueber. Ausserhalb der Zahn-SVG, also kein neuer Fingerabdruck und kein
  Generatorlauf.
- **Die Hemisektion schneidet weg** (`clip-path` an der Kachel, Seite als
  `data-hemi-side`, Form in der CSS). Etwas wegzunehmen kann keine Auflage -
  eine Auflage legt auf.
- **Eine Wurzel wird vorbelegt**, wo der Zahn mehrere hat. "Nicht angegeben"
  heisst beim Zeichnen "Mitte", und die Mitte eines unteren Molaren liegt
  ZWISCHEN den Wurzeln; eine Hemisektion ohne benannte Wurzel zeigte gar nichts.
  Beides sah aus wie ein Fehler. Die Vorbelegung ist im Bild sofort sichtbar
  und mit einem Griff zu berichtigen.
- Die palatinale Wurzel eines Oberkiefermolaren kann NICHT weggeschnitten
  werden: in einer bukkalen Ansicht steht sie hinter der bukkalen und hat keine
  eigene Seite. Der Befund bleibt als Text stehen. Deshalb ist die Hemisektion
  in der Regel ein unterer Zahn.

### Die Halsverschattung ist wieder entfernt

Sie kam mit 2.22.0 und hat nie gezeichnet: sie mass an `gum-base`, und das ist
in der Kachel `display:none` - ein ausgeblendetes Element liefert Nullen. Nach
der Reparatur sass sie sichtbar falsch, und zwar nicht durch einen Rechenfehler:
sie haengt am gezeichneten Zahnfleischrand, und dessen Hoehe stimmt selbst noch
nicht (Bead **odontogram-x8k**). Einen Schatten an einen Rand zu legen, der noch
wandert, verdoppelt den Fehler. Koerperverlauf und Hoeckerkuppeln bleiben.

Derselbe Fehler hatte die Bruchlinie quer durch das ganze Odontogramm laufen
lassen. Beide Auflagen messen jetzt am KLON in der Bandauflage, der eine echte
Ausdehnung hat, oder an der Kachel - nie am ausgeblendeten Original.

### Behoben

- Die vier neuen Auswahlfelder (Sensibilitaet, Perkussion, Wurzelfraktur,
  resektives Verfahren) gehen absichtlich nicht ueber `applyToSelected`, weil
  die Sperren in den Settern sitzen. Dabei fehlte, was `applyToSelected` sonst
  mitmacht: neu zeichnen und die Auflagen erneuern. Der Zustand aenderte sich,
  das Bild nicht.

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
