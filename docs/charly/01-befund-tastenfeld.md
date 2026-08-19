# charly, Reiter „Befunde" → 01-Befund: das Tastenfeld

Abgeschrieben von zwei Bildschirmabzügen (Dirk, 19.08.2026; die abgebildete
Karteikarte ist vom 28.02.2005):

* `01-befund-tastenfeld.png` — die Maske mit den Kariesstufen `K1 … K5`
* `01-befund-materialauswahl.png` — dieselbe Maske, auf die erweiterte
  Materialauswahl umgeschaltet

Grundlage für Bead **odontogram-t8y** — Befundeingabe über Kürzel statt Klickwege.
Was hier steht, ist **abgelesen**, nicht erfunden. Wo eine Bedeutung nicht auf der
Taste steht, ist sie als offen gekennzeichnet.

Die Auflösung kommt **nicht** aus der Datenbank: das Befund-Tastenfeld steht in
keiner Tabelle, es ist im Programm festverdrahtet (nachgesehen, siehe unten).
Sie kommt von Dirk. Aus der `solutiodb` stammen nur die beiden farbigen
Werteblöcke — `fuellmaterial` und `kariesstadien`.

## Der Rahmen

Fünf Befundarten stehen als Auswahlknöpfe über dem Schema:

    ( ) 01     ( ) MH     ( ) PA     ( ) FA     ( ) Impla

`01` ist der Zahnbefund — der, der unserem Odontogramm entspricht. Jede
Befundaufnahme trägt ein Datum (Auswahlliste rechts oben), es gibt also eine
Reihe datierter Befunde je Patient: dasselbe, was bei uns die
Untersuchungsablage (odontogram-2vd) ist.

Das Schema selbst zeigt je Zahn **zwei Ansichten übereinander** — Seitenansicht
und Kaufläche mit fünf Feldern — und darüber bzw. darunter eine
**Millimeterskala 2/4/6/8/10** für die Sondiertiefen. Also dieselbe Verbindung
von Zahnbild und Parodontalwerten, die wir im Dental Chart bauen.

## Reihe 1 — Zustand des Zahnes, Zeichen und Bilder

    ✏  o.B.  f  x  +  −  ?  p  )L(   [4 Bildtasten]  ▼  ↑  ↙  ↰  ←  ▬
    D  MZ  Milchzähne  −>

| Taste | gelesen als | Stand |
|---|---|---|
| `o.B.` | ohne Befund | sicher |
| `f` | fehlt | sehr wahrscheinlich |
| `x` | **zu extrahieren** | sicher — bei uns `extractionPlan` |
| `+` | **vital** | sicher |
| `−` | **keine Reaktion des Zahnes** | sicher |
| `?` | **Vitalität fraglich** | sicher |
| `p` | **perkussionsempfindlich** | sicher |
| `)L(` | **verengte Lücke bei Fehlen eines Zahnes** | sicher — bei uns `missingClosed` |
| ▼ | **Papillenverlust** — das braune Dreieck IST die Papille | sicher |
| ↑ ↙ ↰ ← | **Kippungszustände** | sicher — unsere KFO-Achsen `orthoDrift` / `orthoVertical` / `orthoRotation` |
| ▬ | ? | offen |
| `D` | **Durchbruchstadium, in DREI Stufen** | sicher — haben wir nicht |
| `MZ` / `Milchzähne` | Milchzahn, ganzes Milchgebiss | sicher |
| `−>` | weiter / nächste Seite des Tastenfelds | offen |

Die vier Bildtasten zeigen Zahn mit Klammern, ein Brückenglied-Gitter, einen
Bügel und ein `Fr` im Kasten — Prothetik und Fraktur als Bild statt als Kürzel.

## Reihe 2 — Restauration, Endodontie, Wurzel

    c  b  e  k  t  TK  R  i  FrW  wf  WFi  Sti  Twf  Res  Hem  Fra
    WR  Fur  FuA  Be  Zys

Aufgelöst von Dirk am 19.08.2026; was dort **sicher** steht, steht auf seine
Auskunft hin, nicht auf eine Vermutung.

| Taste | Bedeutung | Stand |
|---|---|---|
| `c` | Karies | wahrscheinlich |
| `b` | Brückenglied | sicher |
| `e` | ersetzt | sicher |
| `k` | Krone | sicher |
| `t` | **Teleskop** | sicher |
| `TK` | **Teilkrone** | sicher — Dirk plädiert dafür, das bei uns `ONL` (Onlay) zu nennen |
| `R` | **Wurzelkappe** | sicher — Dirk fragt, ob es die überhaupt noch gibt |
| `i` | Implantat | wahrscheinlich |
| `FrW` | **Fremdpraxis-Wurzel** | sicher — **brauchen wir nicht** |
| `wf` | Wurzelfüllung | wahrscheinlich |
| `WFi` | **insuffiziente Wurzelfüllung** | sicher — `endo-filling-incomplete` |
| `Sti` | **Wurzelfüllung UND Stiftaufbau** | sicher — `endo-glass-pin` / `endo-metal-pin` |
| `Twf` | **temporäre Wurzelfüllung** | sicher |
| `Res` | **Wurzelresektion** | sicher — `endoResection` |
| `Hem` | **Hemisektion** | sicher — haben wir nicht |
| `Fra` | **Wurzelfraktur** | sicher — haben wir nicht (unsere drei Bruchachsen meinen die Krone) |
| `WR` | **Wurzelrest** | sicher |
| `Fur` `FuA` | Furkation, Furkationsbefall | offen |
| `Be` | **beherdet — apikale Aufhellung** | sicher |
| `Zys` | **Zyste** | sicher — `periapicalType: cyst` |

Drei davon haben bei uns schon eine Achse und brauchen nur ein Kürzel:
`Be` ist `apicalDx`, `Twf` ist `endo-medical-filling`, `WR` ist der Substratwert
`radix`. `t` und `TK` liegen bei uns in **zwei verschiedenen** Achsen —
`restorationMaterial: telescope` gegen `restorationType: onlay` — was Dirks
Vorschlag `ONL` erklärt: `TK` sähe wie ein Geschwister von `t` aus, ist aber
keines.

## Reihe 3 — Flächen und Verankerung

    m  o  d  v  l  z    Fr  Pl    ( G   G )   <Kl  Kl>   [  VB  ]   ste  ScH

Die ersten sechs sind die **Flächen**: mesial, okklusal, distal, vestibulär,
lingual, zervikal. Das ist charlys Flächensatz — **sechs**, mit einer
zervikalen. Unserer hat fünf plus `subcrown`.

`( G` / `G )` ist das **Geschiebe**, `<Kl` / `Kl>` die **Klammer, mit der
Seitenrichtung in der Klammerform — analog zum Geschiebe** (Dirk, 19.08.2026).
Beide und `ste` sind bereits im Bestand: sie stehen
wörtlich in `RETENTION_MARK` (`src/retention.ts`), abgelesen am 11.08.2026 vom
Retentionstastenfeld. Geschiebe, Klammer, Steg — die Klammerform ist Vokabular.

`[ VB ]` ist in derselben Bauweise ein weiteres Verankerungselement, das wir
noch nicht führen. `Fr`, `Pl`, `ScH` sind offen.

## Reihe 4 — fünf Umschalter und ein wechselnder Block

    C   Am   G   Kst   Ker      [ Block, wechselt ]

Die fünf linken Tasten sind **keine Materialien, sondern Umschalter**. Sie
setzen, was der Block rechts daneben anbietet (Dirk, 19.08.2026):

* `C` schaltet auf die fünf **Kariesstufen** `K1 … K5`, als Rotrampe von
  blassrosa nach dunkelrot.
* `Am`, `G`, `Kst`, `Ker` schalten auf die **erweiterte Materialauswahl**.

Damit ist auch die Frage nach `C` beantwortet: es heißt Karies, nicht Composite
und nicht Zement.

### Die erweiterte Materialauswahl

Abgelesen vom zweiten Bildabzug, zwei Zeilen zu zehn Tasten:

    V    VK   Emp  KSK  Cer  PVK  PVL  IKg  IKi  IKm
    IKs  SB   Omn  Est  Cer  Flo  Zir  Ema  NEM  GIZ

Die Liste mischt **Kronenarten und Füllungsmaterialien** in einem Block —
`VK` (Verblendkrone) steht neben `GIZ` (Glasionomerzement). Ein Teil ist
lesbar (`Zir` Zirkon, `Ema` e.max, `NEM` Nichtedelmetall, `Flo` fließfähig,
`Emp` Empress), der Rest nicht: `IKg` / `IKi` / `IKm` / `IKs` gehören
offensichtlich zusammen, `PVK` / `PVL` ebenso, `SB`, `Omn`, `Est` und das
zweimal auftretende `Cer` sind offen. Auflösung über
`fuellmaterial.bezeichnung`.

Unser `restorationMaterial` führt acht Werte, unser `fillingMaterial` vier.
charly führt hier zwanzig in einem Topf — das ist eine **Produktliste**, keine
Materialklasse, und liegt damit näher an unserer Achse `implantProduct` als an
`restorationMaterial`. Ein Kürzel je Produkt einzuführen wäre der falsche
Weg: die Kürzeltabelle bildet auf **Achsen** ab, und welches e.max-Produkt es
war, ist eine andere Frage als ob die Krone Keramik ist.

Die Farben der Tasten liegen als Stammdaten daneben:

    fuellmaterial   lfdnr, kuerzel, bezeichnung, colorr, colorg, colorb
    kariesstadien   lfdnr, kuerzel, bezeichnung, colorr, colorg, colorb

Im abgebildeten Befund sind 16/26/47/46/36/37 orange (Gold), 16 mesial grün
(`Kst`), 38 grau (`Am`), 48 distal rot (Karies).

## Rechte Spalte — Parodont und Funktion

    Taschentiefe:   <3    <6    >6
    [ ] MU          [ ] Zahnstein
    Funktion:  [ ] MIOS   [ ] LIOS   [ ] Funktionsstörung

Die Sondiertiefe wird hier in **drei Klassen** eingegeben, nicht in
Millimetern — die Millimeterskala am Schema zeigt sie dann an. Unsere
`perio.pd` ist millimetergenau (1–15); die drei Klassen sind eine Vergröberung
davon, keine eigene Achse.

`MU` = Mundhygiene? offen. `Zahnstein` ist unser `calculus`.
`MIOS`/`LIOS` stehen bei uns schon in `befundfakau` (Funktionsanalyse) —
mediotrusiv/laterotrusiv, und damit außerhalb des Odontogramms.

## Was daraus für odontogram-t8y folgt

1. **Das Kürzel ist NUR der Eingabeweg — gespeichert wird etwas ganz anderes.**
   Das war meine erste Annahme und sie war falsch; siehe den Abschnitt
   „Was wirklich in der Datenbank steht" unten. charly bildet die Tastendrücke
   also selbst auf ein Feld je Merkmal ab. Genau die Bauweise, die der Bead für
   uns verlangt.
2. **Die Eingabe ist zustandsbehaftet, und der Zustand ist das MATERIAL.**
   Dirk, 19.08.2026: *"Bei charly wählt man das Material und gibt dann die
   Kürzel ein."* Reihe 4 ist also kein Nachsatz zur Befundtaste, sondern ein
   vorher gesetzter Modus, der stehen bleibt — wie eine gewählte Farbe, mit
   der man dann malt. Erst danach kommen Befund und Flächen. Das ist die
   Antwort auf die im Bead offene Frage nach der Verkettung, und sie fällt
   anders aus als vermutet:

       G           Material setzen, bleibt stehen
       k           Krone auf dem markierten Zahn, in Gold
       mod  K3     Flächen und Kariesstadium

   Für uns heißt das ein kleiner Eingabezustand neben der Zahnauswahl, kein
   Zustandsautomat je Befund.

3. **Drei Dinge kennt charly, die wir nicht führen:** die zervikale Fläche
   `z`, das Verankerungselement `[ VB ]`, und `befundkv` als dritte Ebene
   neben Befund und Planung. Eines brauchen wir ausdrücklich **nicht**:
   `FrW`, die Fremdpraxis-Wurzel.
4. **Nicht jeder Befund bekommt einen Buchstaben.** Dirk: *"Sicherlich lassen
   sich nicht alle Befunde mit nur einem Buchstaben erfassen."* charly selbst
   führt ein- bis dreistellige Kürzel nebeneinander (`k`, `TK`, `Twf`), der
   Parser muss also längste Übereinstimmung suchen und nicht Zeichen für
   Zeichen lesen. Bei 46 Achsen und 129 Werten wird ein Teil ohnehin nur über
   den Klickweg erreichbar bleiben — das ist kein Mangel, sondern die
   Arbeitsteilung: die Kürzel decken ab, was im Sekundentakt diktiert wird.
5. **Zwei Dinge führen wir feiner:** Sondiertiefe in Millimetern statt in drei
   Klassen, und Karies in sieben ICDAS-Stufen statt fünf.

## Was wirklich in der Datenbank steht

Nachgesehen am 19.08.2026 auf `dirk-charly-vm` (192.168.172.30), Datenbank
`solutiodb` im Behälter `charly-database-1`. Gelesen wurden ausschließlich
Stammdaten und **Werteverteilungen** — keine Patientenzeilen; die Datenbank
trägt 343 094 Befundzeilen und ist keine Demodatenbank.

### `befund01pa.zahn11 … zahn48` ist ein Stellencode, keine Kurzschrift

Die 64 Zeichen sind kein Text. Es ist eine **Zeichenkette fester Stellen**, je
Stelle ein Byte:

    Z00000000000000000000000000000000000000000     29 306 ×
    Z04¹00000000000000000000000000000000000000     20 705 ×
    Z00040010000000000000000000000000000000000      4 813 ×

Es gibt drei Längen nebeneinander — 40, 42 und 43 Zeichen — also drei
Programmstände in derselben Spalte. `Z` ist ein Vorsatz, `0` heißt „nichts".
Je Stelle steht ein Byte, dessen Bits mehrere Merkmale zugleich tragen: die
Alphabete der Stellen 19 und 22 laufen über fünfzig verschiedene Zeichen bis
weit über 127 hinaus, was auf einen Flächen-Bitsatz deutet. Drei Stellen (28,
36, 38, 40) sind in 106 824 gelesenen Zeilen **nie** belegt.

### Was das für den Adapter heißt

Dirk hat am 19.08.2026 entschieden, dass `pvs-adapter-charly` den Zahnbefund
tragen soll — **gebaut wird das von Dirk und Malte**, nicht hier. Was wir beim
Nachsehen gelernt haben, steht deshalb hier als Übergabe.

Der Adapter erzeugt heute zehn Ressourcenarten (Patient, Practitioner,
Organization, Encounter, Coverage, Appointment, Condition, ChargeItem,
ChargeItemDefinition, Task) und liest `patienten`, `bema`, `bemadaten`.
**Keine davon ist je Zahn**; `befund01pa` kommt nicht vor.

Drei denkbare Wege, und nur einer trägt:

    eHKP-REST      kann HKP und EBZ — Planung, nicht Befund       faellt aus
    Query-Service  liefert dieselbe Spalte per HTTP               gleiches Problem
    PostgreSQL     befund01pa.zahn11..48, der Stellencode         der einzige Weg

**Entziffern geht empirisch, nicht durch Raten.** An einem Testpatienten einen
einzigen Befund an einem einzigen Zahn setzen, die Zeichenkette vorher und
nachher vergleichen: welche Stelle sich ändert und auf welches Zeichen, ist die
Antwort ohne Vermutung. Bei rund sechzig Tasten und 43 Stellen ist das eine
Sitzung Fleißarbeit. Die Stellen **19 und 22** sind dabei die ergiebigsten —
ihre Alphabete laufen über fünfzig Zeichen weit über 127 hinaus, was auf
Flächen-Bitsätze deutet; setzt man `m`, `o`, `d`, `v`, `l`, `z` einzeln, fallen
die sechs Bits einzeln heraus. Die Stellen 28, 36, 38 und 40 waren in 106 824
gelesenen Zeilen nie belegt.

**Lesen ist harmlos, Schreiben nicht.** In die Datenbank eines fremden
Programms zurückzuschreiben geht an solutio vorbei; ändert charly beim nächsten
Programmstand die Kodierung, landet Unsinn in Patientenakten. Vor Schritt 3
gehört die Frage an solutio, ob es dafür eine Schnittstelle gibt.

Für das Odontogramm ändert das nichts an der Bauweise: die Bibliothek spricht
FHIR, der Adapter spricht charly. Eine Abhängigkeit zu einem Praxissystem
gehört nicht hier hinein.

### `grafeingabe` ist das falsche Tastenfeld

Die Tabelle hat 37 Zeilen, aber es sind die des **Planungs**-Reiters, nicht des
Befundes: `Krone Inceram`, `Füllung 3-flächig Amalgam`, `Extraktion / Ost`,
jeweils mit einer Behandlungs-Bitmaske. Das Befund-Tastenfeld selbst steht in
keiner Tabelle — es ist im Programm festverdrahtet. Die Bedeutung der Kürzel
bleibt damit das, was der Bead sagt: Dirks Tabelle.

### `fuellmaterial` — die erweiterte Materialauswahl, aufgelöst

     1 Am    Amalgam                              13 IKi   Implantatkrone mit ind. Abutment
     2 G     Gold                                 14 IKm   Implantatkrone mit Mesiostruktur
     3 Kst   Kunststoff                           15 IKs   Implantatkrone mit stand. Abutment
     4 Ker   Keramik                              16 SB    Schwebebrücke
     5 V     Veneer                               17 Omni  Omni
     6 VK    Vollkeramikstufenkrone gegossen      18 Esth  Esthelite
     7 Empr  Vollkeramikstufenkrone gepresst      19 Cer   Cerec
     8 KSK   Keramiksinterkrone                   20 Flow  Tetric flow
     9 CerK  Vollkeramikkrone Cerec               21 Zirk  Zirkonkeramikgerüst
    10 PVK   Provisorium Kurzzeit                 22 Emax  E-Max CAD
    11 PVL   Provisorium Langzeit                 23 NEM   NEM
    12 IKg   Implantatkrone geschraubt            24 GIZ   Glasionomerzement
                                                 25–32   Frei21 … Frei28

**Acht freie Plätze am Ende.** Die Liste ist also je Praxis erweiterbar, und
damit ist sie keine feste Werteliste, auf die man Kürzel festschreiben könnte.
Sie mischt außerdem drei verschiedene Dinge: Werkstoffe (`NEM`, `GIZ`),
Bauformen (`Schwebebrücke`, `Vollkeramikstufenkrone gepresst`) und
**Handelsnamen** (`Esthelite`, `Tetric flow`, `E-Max CAD`, `Cerec`).

Das bestätigt die Trennung, die Bead `odontogram-99h` vorschlägt: die Achse
`restorationMaterial` sagt, was für ein Werkstoff es ist; welches Produkt
verbaut wurde, ist eine zweite Angabe. Ein Kürzel je Zeile dieser Liste
einzuführen hieße, beides zu vermengen — und die acht freien Plätze zeigen,
dass die Liste dafür gar nicht stabil genug ist.

### `kariesstadien` — fünf Stufen ohne Begriff

    K1 … K5   „Kariesstadium 1" … „Kariesstadium 5"   Rotrampe 255,181,181 → 220,0,0

Die Datenbank sagt nicht, was eine Stufe bedeutet — nur ihre Nummer und ihre
Farbe. Unsere `cariesSeverity` ist an ICDAS 0–6 gebunden und trägt damit eine
Definition, die charly hier nicht hat.

## Was charly kann und wir nicht

Stand 19.08.2026, gegen die 46 Achsen der Registry geprüft — nicht geschätzt.

| charly | fehlende Achse bei uns | Gewicht |
|---|---|---|
| `+` vital · `−` keine Reaktion · `?` fraglich · `p` perkussionsempfindlich | **Sensibilitäts- und Perkussionsprüfung** — drei Werte plus die Perkussion daneben | schwer. Wir führen mit `pulpDx` und `apicalDx` die Schlussfolgerung, aber nicht den Test, der sie trägt — und `symptomatic` gegen `asymptomatic apical periodontitis` unterscheidet sich genau an der Perkussion |
| `Fra` Wurzelfraktur | **Wurzelfraktur** | schwer. `brokenMesial` / `brokenIncisal` / `brokenDistal` meinen die Krone; eine längs oder quer gebrochene Wurzel ist ein anderer Befund mit anderer Folge |
| `D` Durchbruchstadium, drei Stufen | **abgestufter Durchbruch** | mittel. Wir haben `not-erupted` als einen Wert von `toothSelection`, also durchgebrochen oder nicht. Für das Wechselgebiss ist gerade das Dazwischen der Befund — das betrifft auch Bead `odontogram-iqj` |
| `Hem` Hemisektion | **Hemisektion** | mittel. `endoResection` ist die Wurzelspitzenresektion, etwas anderes |
| `R` Wurzelkappe | — | gering; Dirk fragt selbst, ob es die noch gibt |
| `[ VB ]` | Verankerungselement neben Klammer, Geschiebe, Steg | offen, Bedeutung noch nicht geklärt |
| `z` zervikal | sechste Fläche | gering; unser Flächensatz hat fünf plus `subcrown` |
| ▼ Papillenverlust | **interdentaler Papillenverlust** | mittel, aber teilweise abgeleitet: unsere Cairo-Ableitung (`getToothRecessionType`, RT2/RT3) misst genau den interproximalen Attachmentverlust, der den Papillenverlust ausmacht. Was fehlt, ist der direkte Befund am Stuhl — man sieht die schwarze Dreiecklücke, bevor man sechs Stellen sondiert hat |

Und umgekehrt, damit die Rechnung ehrlich bleibt: wir führen die Sondiertiefe
millimetergenau statt in drei Klassen, die Karies in sieben ICDAS-Stufen mit
Definition statt in fünf nummerierten, dazu den gesamten parodontalen
Messwertsatz, die Untersuchungsablage und die Herkunftsableitung. Die Lücken
oben sind Lücken, keine Unterlegenheit.
