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
