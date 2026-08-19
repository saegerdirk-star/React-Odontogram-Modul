# Der Zahn-Vorlagengenerator

Jede der 52 Vorlagen unter `src/assets/teeth-svgs/` ist ERZEUGT. Keine wird von
Hand bearbeitet — eine Handänderung ist beim nächsten Lauf weg, und der
Vertrag, den `verify_redraw.py` prüft, kennt sie nicht.

Stand 19.08.2026. Wer hier etwas ändert, aktualisiert diese Datei mit; sie war
bis heute auf dem Stand von neun Vorlagen aus vier Quellzeichnungen und
beschrieb damit ein Werkzeug, das es so nicht mehr gibt.

## Was ausgeliefert wird

**Eine Zeichnung je Position**, seit dem 17.08.2026 — nichts wird mehr zwischen
den Kiefern geteilt:

    26 Seitenansichten     16 bleibende   11–18, 41–48
                           10 Milchzähne  51–55, 81–85
    26 Kauflächen          dieselben 26 Positionen, je als `<zahn>_occl.svg`
                            6 Frontzähne  11–13, 41–43   (Draufsicht)
                           10 Seitenzähne 14–18, 44–48
                            6 Milchfront  51–53, 81–83   (Draufsicht)
                            4 Milchmolar  54/55, 84/85

Die Gegenseite ist dieselbe Datei, gespiegelt (21 aus 11, 31 aus 41, 61 aus 51,
71 aus 81). Zugeordnet wird über `TOOTH_TEMPLATE`, `PRIMARY_TEMPLATE` und
`OCCLUSAL_TEMPLATE` in `src/odontogram.ts`.

## Drei Stufen, zwei Verträge

```
1  SPENDER      build.py + occlusal.py    ->  tools/toothgen/spender/
   npm run toothgen:spender
   Aus Schumachers Odontographie abgeleitete Vorlagen, die die rund
   200 klinischen Ebenen mitbringen. Nicht versioniert, reproduzierbar.

2  ZEICHNUNG    redraw_alle.py / redraw_occl.py
   Setzt Dirks gezeichnete Kontur und Pulpa in den SPENDER ein und
   schreibt, was ausgeliefert wird.

3  FLÄCHEN      flaechen_einsetzen.py
   npm run toothgen:flaechen
   Setzt die Flächen ein, auf denen ein Befund gechartet wird.
```

`npm run toothgen:redraw` läuft **alle drei**. Bis zum 19.08.2026 hörte es nach
der zweiten auf, und der dokumentierte Befehl warf die abgeleiteten Füllungs-
und Kariesflächen still auf die Formen des Spenders zurück — beides gültiges
SVG, also beschwerte sich kein Vertrag.

**Die Regel, auf die der ganze Bogen hinauslief: was gezeichnet ist, wird
EINGESETZT. Gewarpt wird nur, was niemand zeichnet.** Sie ist nicht unbegrenzt
— das Veneer nach demselben Muster abzuleiten machte es schlechter (siehe
`veneer_aus`).

## Warum die dritte Stufe eine eigene ist

Die Flächen eines Befundes sind AUS der gezeichneten Kontur abgeleitet und
lassen sich deshalb nicht aus einem Spender warpen. Sie kommen, nachdem die
Kontur steht:

- `fuellflaechen.py` leitet mesial/distal/okklusal (inzisal am Frontzahn) aus
  Dirks gezeichneten Kästen in die Ebene `4 FUELLFLAECHEN (abgeleitet)` ab —
  eine handgezeichnete Form schlägt immer eine abgeleitete
- `fuellflaechen_einsetzen.py` rastert diese Bereiche und schreibt sie in die
  ausgelieferte Vorlage. **Mit ZWEI Nachkommastellen serialisieren** — die
  Kette serialisiert bei `prec=2` neu, drei Stellen scheitern an
  `check_roundtrip.py`
- `kauflaechen.py` tut dasselbe für die Kauflächenansicht: schneidet den Tisch
  entlang der gezeichneten Fissuren und projiziert die bukkale BREITE zurück
  auf die Seitenansicht
- `halsbaender.py` zeichnet `caries-root` und `caries-subcrown` als
  rechnerische waagerechte Bänder am Zahnhals, statt sie zu warpen
- `draufsicht.py` liest eine Frontzahn-Draufsicht NACH INHALT (größter
  geschlossener Pfad = Umriss, offene Pfade = Linien), prüft Dirks `v`/`m`-
  Marken gegen die dokumentierte Ausrichtung und normiert sie auf die
  Kronenbreite der Seitenansicht als `<zahn>_occl_norm.svg`

## Die Module darunter

Werden von den obigen aufgerufen, nicht selbst gestartet:

    roots.py         Wurzeltopologie vor der gemeinsamen Transformation
    svgpath.py       Pfade lesen und schreiben
    graft.py         Einpflanzen
    hoecker.py       Flutfüllung: zerlegt einen gezeichneten Kautisch in Felder
    redraw_apply.py  das Einsetzen selbst
    redraw_plan.py   die Tabellen Ziel -> Zeichnung -> Spender, und sonst
                     nichts, damit eine Prüfung keinen Generator laden muss

`gum.py` ZEICHNET `gum-base` und `bone-base` geradeheraus in Endkoordinaten,
statt sie aus den Quellen zu warpen. Das ist der einzige Weg, die Gingiva über
den Bogen als eine Linie zu lesen: eine Papille gehört zwei Zähnen, und zwei
handgezeichnete Hälften können sich über ihre Höhe nicht einigen. Die Papille
sitzt eine halbe Spalte plus einen halben Rasterabstand von der Zahnmitte
entfernt, damit zwei Nachbarn denselben Punkt treffen; `ToothSpec.col_px` hält
diese Spaltenbreite und `verify.py` prüft sie gegen `grid-template-columns` in
`src/index.css`.

`fillings.py` streckt die mesiale und distale Füllungsform, bis sie die
okklusale berühren, damit MO/OD/MOD als EINE Restauration zeichnet
(`verify.py` schlägt fehl, wenn ein Paar aufhört, eine zusammenhängende Form zu
sein). Die bukkale Form bleibt absichtlich getrennt.

## Der anatomische Vertrag

`spec.py` hält je Klasse die Anatomie: Wurzelzahl, Wurzelanteil,
Kronenverhältnis, Furkation, FDI-Zuordnung und die Quellabbildung. Die Längen
und Verhältnisse sind aus den Tafeln der Odontographie abgezählt; die
mesiodistalen Kronenbreiten sind es NICHT — sie sind Mittelwerte aus Wheeler
und Ash & Nelson, weil das Ausmessen der Seiten nicht funktionierte.

`crown_width` (Ausdehnung des Umrisses) und `silhouette_width` (Zahnmaterial)
sind VERSCHIEDENE Messungen und dürfen nicht vertauscht werden: eine
Kronenbreite ist das erste, die Wurzel, die einen Kanal fassen muss, das
zweite.

## Prüfen

```bash
npm run toothgen:verify
```

läuft alle drei Prüfungen:

    verify.py           misst die SPENDER gegen spec.py und gegen
                        eingefrorene Geometrie-Prüfsummen. Vom Redraw
                        unberührt.
    verify_redraw.py    der Vertrag für das, was ausgeliefert wird:
                        Ebenenbestand identisch mit dem Spender, eine
                        durchgehende Kontur, das Lumen innerhalb der
                        Wurzel, der Implantatkörper ungestreckt, das
                        Zahnfleisch für die Spalte gezeichnet, in der der
                        Zahn wirklich steht, und die Okklusionsebene auf
                        einer Linie.
    check_roundtrip.py  beweist, dass Pfad-Serialisierung verlustfrei ist.
                        build.py zweimal laufen zu lassen muss byte-gleiche
                        Dateien ergeben.

## Fallstricke

- **`npm run toothgen:build` baut die Kauflächen NICHT mit.** Sie haben ein
  eigenes Skript, `uv run tools/toothgen/occlusal.py`. Wer das übersieht, hält
  eine Änderung an einer Quelle für wirkungslos — auf den sechsundzwanzig
  `_occl`-Dateien ist sie es dann auch.
- **`uv` und `python3` sind nicht austauschbar.** Die Skripte, die numpy
  benutzen, laufen unter `python3`, die Prüfskripte unter `uv run`. Die
  npm-Skripte oben haben das schon richtig herum.
- **Die Tafel-Abzüge von Schumacher gehören nicht ins Repository.** Sie lagen
  bis zum 18.08.2026 als eingebettete Rasterebene ("1 Schumacher (gesperrt)")
  in 40 der 46 Zeichnungen und wurden entfernt; das Erzeugnis blieb dabei
  byte-gleich. Was hier liegt, ist MIT-lizenziert.

## Farben der Restaurationen

Jede Restaurationsfüllung ist `fill: var(--odon-rest-<schlüssel>, #hex)`, und
die beiden Rampenmaterialien tragen das an jedem ihrer neun `<stop>`s. Eine
Farbe zu wählen heißt, eine benutzerdefinierte Eigenschaft am Wurzelelement zu
setzen; die Kaskade malt neu, und im Renderpfad läuft kein JavaScript. Nichts
gewählt heißt byte-gleich, weil nichts geschrieben wird und jeder Rückfallwert
die ausgelieferte Farbe ist. Geschlüsselt wird auf die EBENEN-ID, nie auf den
Hexwert — nur so bleiben zwei Kollisionen trennbar (GIC teilt `#f9ae94` mit der
Prothesenbasis, eine Metallkrone `#0051bf` mit einer teleskopierenden).
Bearbeitet wird in `tools/toothgen/source/*.svg`, danach neu erzeugen.
