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

## Der naechste Schritt

**16 durchlaufen lassen** - dreiwurzelig, mit Ankern, der schwierigste Fall.

```
python3 -c "import sys; sys.path.insert(0,'tools/toothgen'); import redraw_apply;
open('/tmp/16_neu.svg','w').write(redraw_apply.umzeichnen('16','16',True))"
```

Drei Pruefungen daran, in dieser Reihenfolge:

1. **Dehnung entlang der Achse** muss nahe bei 1 liegen. Das ist die Pruefung,
   die den schwersten Fehler des Tages gefunden haette und die keine der harten
   Vertragspruefungen leistet - siehe unten.
2. **Sitzt der Stift im palatinalen Kanal?** Dirks Vorgabe: der Stift gehoert in
   den geraden Kanal, oben palatinal, unten distal. Bei einem dreiwurzeligen
   Zahn entscheidet das Pulpa-Feld allein nicht, wo er landet.
3. **Bild ansehen** und Dirk zeigen. Die drei Fehler des Tages hat alle er
   gefunden, keiner davon meine Pruefsummen.

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
