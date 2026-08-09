# Browser-Messwerkzeug

`inspect.mjs` misst die **laufende** App über das Chrome DevTools Protocol.

Es ersetzt keinen Test. Es beantwortet die Fragen, die sich am Quelltext nicht
entscheiden lassen, weil erst der Browser Layout, Transformationen und
Ausrichtung auflöst. Zwei Fehler in der Zahnkarte wurden genau so gefunden — in
beiden Fällen las sich der Quelltext richtig:

- die Kauebene des Unterkiefers lief nicht durch, weil die um 180° gedrehten
  Kacheln unten bündig ausgerichtet waren und dadurch die Wurzelspitzen statt
  der Schneidekanten fluchteten;
- im Parodontal-Chart war je eine Zeile pro Kiefer auf dem Kopf, weil die
  Spiegelung nach Ansicht statt nach Kiefer entschieden wurde.

Keine Abhängigkeiten: `fetch` und `WebSocket` sind seit Node 22 eingebaut.

## Voraussetzungen

```sh
npm run dev

"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --remote-debugging-port=9222 \
  --window-size=1600,1300 http://localhost:5173/
```

Ein anderer Endpunkt lässt sich über `CDP_ENDPOINT` setzen.

## Kommandos

| Kommando | Antwort |
|---|---|
| `orientation` | Zeigen die Wurzeln je Band nach cranial oder caudal, und passt das zum Kiefer? Endet mit Exit-Code 1, wenn ein Band falsch herum steht. |
| `templates` | Welcher Zahn wird aus welchem Template gezeichnet — aus dem gerenderten DOM, nicht aus `TOOTH_TEMPLATE`. |
| `labels` | Die Zeilenbeschriftungen beider Bögen (Oberkiefer „Palatal …", Unterkiefer „Lingual …"). |
| `shot [datei] [selektor]` | Screenshot der Seite oder eines Elements. |

```sh
node tools/browser/inspect.mjs orientation
node tools/browser/inspect.mjs templates
node tools/browser/inspect.mjs shot arch.png "svg.perio-tooth-arch-buccal"
```

## Zwei Fallen, die im Skript dokumentiert sind

- **`getBoundingClientRect` berücksichtigt kein `clip-path`.** Seit die Wurzel im
  Parodontal-Chart als zweite, geclippte Kopie gezeichnet wird, überdecken sich
  die Rechtecke von Kronen- und Wurzelgruppe vollständig. `orientation` misst
  deshalb an der mm-Rasterbeschriftung, die konstruktionsbedingt von der SZG zur
  Wurzel hin läuft.
- **`Page.captureScreenshot`'s `clip` rechnet in Dokument-Koordinaten**,
  `getBoundingClientRect` in Fenster-Koordinaten. Ohne den Scroll-Versatz kommt
  ein leeres Bild heraus.
