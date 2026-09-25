# Marktschau: wie andere Programme das Odontogramm zeichnen

Angesehen am 25.09.2026 auf Dirks Frage, was die schematische Ansicht von den
Programmen lernen kann, die seine Leute kennen. Gelesen wurden
**Bildschirmabzüge aus Handbüchern und von Herstellerseiten** — kein Programm
wurde bedient. Die Bilder sind **nicht** ins Repository übernommen (Werbe- und
Handbuchabzüge der Hersteller, kein Rechteübergang); die Belegstellen stehen
unten. Die Schweizer App derec hat eine eigene, ausführlichere Notiz in
`~/dev/odontogram/docs/derec/README.md`.

## Was es gibt

| Programm | Stil | Aufbau | Eingabe |
|---|---|---|---|
| **charly** (solutio) | Pixel-Konstruktionszeichnung, kräftige Flächenfarben, Schraffur | 4 Reihen, Aufsichten innen, PA-Kurven an den Seitenansichten | Drag & Drop aufs Bild; Materialleiste oben, die die ganze Glyphenpalette live in das gewählte Material umfärbt |
| **DS-Win** (Dampsoft) | einfache Strichzeichnung auf Hellblau | 2 Reihen Miniaturen, dazu **ein großer Zahn links** mit Fünf-Flächen-Blume | Raster beschrifteter Schaltflächen, Materialliste mit Eigen/Fremd |
| **tomedo.Dental** | nur Kontur, ein Blau | 4 Reihen, Aufsichten innen, Zahnzahl-Reihe dazwischen, Mittellinie | Befundkürzel, Panel; Zoomregler |
| **Dentport** | halbrealistische Cartoon-Zähne, gelblich | 4 Reihen + violettes Knochenniveau-Band mit mm-Skala | Glyphen-Palette, Fünf-Flächen-Kasten, Kariesstufen KI–KV als Knöpfe |
| **CGM Z1.PRO** | zwei Welten: altes Schema (blau, Kleeblatt-Aufsicht) und „Premium Zahngrafik" (fast fotorealistisch auf lachsrotem Grund) | 4 Reihen | Kürzelliste in Reitern, Drag & Drop, Schnelleingabe („8er f", „Rest e") |
| **derec** | fotorealistisch, weiß auf Schwarz | 4 Reihen, Bogen als Randleiste in der Einzelzahnansicht | Kachelfeld |
| **ZahnarztRechner** (SW Computer) | — | — | — |

Zum ZahnarztRechner ist nichts veröffentlicht außer einem Absatz Werbetext.

## Was daraus folgt

**Alle bauen den Bogen in vier Reihen, die Aufsichten in der Mitte.** Oben die
Seitenansichten des Oberkiefers mit den Kronen nach unten, dann seine
Aufsichten, dann die des Unterkiefers, unten dessen Seitenansichten mit den
Kronen nach oben. Unsere schematische Ansicht war schon so gebaut — der
Befund der Schau hat das bestätigt, nicht verlangt.

**Die Aufsicht trägt den Flächenbefund, die Seitenansicht die Substanz.**
Karies, Füllung, Inlay werden in die Aufsicht gemalt; Wurzel, Wurzelfüllung,
Implantat, Knochenniveau stehen an der Seitenansicht. Eine Krone bedeckt den
ganzen Tisch und erscheint deshalb in BEIDEN — bei uns erschien sie nur in der
Seitenansicht.

**Realismus ist nicht, was gut aussehen lässt.** Die beiden neuesten Programme
gehen maximal auseinander — tomedo ins fast Abstrakte, derec ins
Fotorealistische — und beide wirken besser als charly und Z1 Premium. Was sie
teilen, ist **Farbdisziplin**: eine Linienfarbe, Farbe nur für Befunde, damit
ein Kanal für „hier musst du hinsehen" frei bleibt. Z1 Premium ist der
Gegenbeweis: die realistischsten Zähne der Runde und das unübersichtlichste
Bild, weil Plaque, Blutung, Zahnstein, KFO und Vitalität gleichzeitig
mitlaufen.

**Die Form der Aufsicht sagt die Zahnklasse.** tomedo zeichnet den Molaren als
Sechseck, den Prämolaren als Fünfeck, den Frontzahn gerundet; charly und
Dentport unterscheiden ebenfalls. Das ist Information und kostet nichts.

**Eine Brücke ist sichtbar verbunden** — tomedo mit grauen Balken zwischen den
Aufsichten, charly und Dentport über die Kronenfarbe.

**Eingegeben wird fast nie am Bild.** Nur charlys Drag & Drop arbeitet auf der
Zeichnung, und es ist das älteste Verfahren der Runde. DS-Win, Dentport, Z1 und
derec geben über Schaltflächen, Paletten oder Kacheln ein, meist mit einem
vergrößerten Einzelzahn daneben — dieselbe Richtung, in die
`SchematicKeypad.tsx` geht.

## Was davon umgesetzt ist (Branch `feat/schematic-refresh`)

Alles in `src/schematicGraphic.ts`, nichts an Zustand, Nutzlast, FHIR oder der
anatomischen Ansicht; die SVG-Fingerabdrücke der Paritätstests sehen die
schematische Ansicht nicht.

* **Zahnzahlen in die Mitte**, beide Reihen Rücken an Rücken auf der
  Okklusionsebene, dazu eine senkrechte **Mittellinie**.
* **Aufsichtsform nach Zahnklasse** — Molar breit und fast quadratisch,
  Prämolar schmaler und deutlich runder, Frontzahn flach mit Schneidekante.
  Eine Geometriequelle (`occlGeom`) statt drei Kopien für Zeichnung,
  Flächenfüllung und Klickzonen.
* **Krone auch in der Aufsicht**, im Materialton, die Flächenlinien bleiben
  dünn darüber.
* **Brücke verbunden** — Verbinder zwischen den Aufsichten und zwischen den
  Kronen der Seitenansicht, im Brückenmaterial, aus derselben
  `bridgeConstructions`-Ableitung, die die anatomische Ansicht zeichnet.
* **Eine Linienfarbe** (Schieferblau statt Fast-Schwarz), Hilfslinien und
  fehlende Zähne heller.
* Nebenbei behoben: im Oberkiefer standen die Kürzel K/B/V an den
  Wurzelspitzen statt an der Krone.

## Was seitdem übernommen ist (25.09.2026, derselbe Tag)

| Vorbild | übernommen |
|---|---|
| charly, tomedo, Dentport, derec: Aufsicht trägt Flächen, Seitenansicht Substanz | Krone auch in der Aufsicht; Aufsicht weiß gefüllt |
| tomedo: Form der Aufsicht nach Zahnklasse | `occlGeom` Molar / Prämolar / Front — und Milchmolar |
| tomedo, charly: Brücke sichtbar verbunden | Verbinder zwischen Aufsichten und Kronen |
| tomedo: eine Linienfarbe, Farbe nur für Befunde | Schieferblau statt Fast-Schwarz |
| charly (Gesamtmaske, `docs/charly/01-befund-gesamtmaske.png`): Proportionen | breite, niedrige Spalten; Schema volle Breite, Tastenfeld halb so hoch |
| charly: dichtes Tastenfeld, Kürzel klein beschriftet | kleine Tasten ohne Karten; `m o d v l` klein |
| charly: `C` vor Am/G/Kst/Ker | roter Karies-Schalter vorne in der Materialreihe |
| charly: Tastatur — Tab 18→28, 38→48, Kürzel, Flächen sofort, `mod K3` | Tastatur auch im Schema; Flächen wirken beim Tastendruck |
| charly `MZ`/`Milchzähne`, DS-Win Milchzahngebiss: Milchzähne als solche | Milchzähne kleiner, als 55 nummeriert, Milchmolar mit gespreizten Wurzeln; nicht Durchgebrochenes gepunktet |
| DS-Win, Dentport, derec: nicht auf der Zeichnung eingeben | erster Klick wählt nur aus; Eingabe über Tastenfeld und Tastatur |

Bewusst **nicht** übernommen: fotorealistische Zähne (derec, Z1 Premium) —
Lizenz- und Datenprojekt, und Z1 Premium zeigt, dass Realismus die
Übersicht nicht bringt.

## Was offen ist

* **Fehlender Zahn als Buchstabe** (tomedo: ein großes `f` statt eines
  Umrisses) — liest schneller als der gestrichelte Umriss, der dem
  „nicht durchgebrochen“-Umriss ähnelt.
* **Vorhanden vs. geplant** unterscheidet charly durch Schraffur (siehe
  `zahnschema_01`: schraffiert = geplant). Wir haben dafür den Plan-Modus mit
  gestrichelter Kontur in der anatomischen Ansicht, im Schema fehlt ein
  Gegenstück noch.
* **PA-Kurven an der Seitenansicht** (charly, Dentport) — im Schema bewusst
  weggelassen, weil die Parodontalansicht eigene Wege hat; offen, ob eine
  schlanke Taschentiefenlinie im Schema lohnt.
* **Material am Bogen zurücknehmen?** Die Farbdisziplin der Schau spricht
  dafür, das Material nur noch in der Einzelzahnansicht zu zeigen und am Bogen
  nur „versorgt" zu zeichnen. Das ist eine fachliche Entscheidung, keine
  gestalterische — offen für Dirk.
* **Dunkles Thema** (derec) als reiner Merkmalssatz.
* **Einzelzahn groß neben dem Bogen** (DS-Win, derec) und die
  **Kachel-Eingabe** — die eigentliche Arbeit, weil Interaktion.

## Belegstellen

* charly: <https://charlyupload.s3.amazonaws.com/uploads/charly-help/Content/hb_patient/zahnschema/zahnschemaArtGrafisch.htm>,
  <https://charlyupload.s3.amazonaws.com/uploads/charly-help/Content/hb_patient/zahnschema/zahnschemaGrafischeEingabe.htm>
* Dampsoft: <https://www.dampsoft.de/wp-content/uploads/2020/11/Anleitung-Der-Befund-im-DS-Win.pdf> (S. 2–4)
* tomedo: <https://support.tomedo.de/handbuch/tomedo/fachgruppen/dental/befundung/01_befund/>
* Dentport: <https://dentport.de/befunde/>
* CGM Z1.PRO: <https://www.cgm-dentalsysteme.de/medien/pdf/handbuch/handbuch-z1pro-behandlungserfassung.pdf> (S. 29 f., 100 f.)
* derec: <https://www.derec.ch/> (Werbeaufnahmen `front/images/demos/1–4.jpg`)
* ZahnarztRechner: <https://www.sw-computer.de/dental/praxissoftware/zahnarztrechner/>
