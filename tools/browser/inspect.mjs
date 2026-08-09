#!/usr/bin/env node
// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
//
// Messwerkzeug fuer die LAUFENDE App. Kein Test-Ersatz: es beantwortet Fragen,
// die sich am Quelltext nicht entscheiden lassen, weil erst der Browser Layout,
// Transformationen und Ausrichtung aufloest. Zwei Fehler in der Zahnkarte sind
// genau so gefunden worden - der Quelltext las sich in beiden Faellen richtig.
//
// Keine Abhaengigkeiten: `fetch` und `WebSocket` sind seit Node 22 eingebaut,
// gesprochen wird das Chrome DevTools Protocol.
//
// Voraussetzungen:
//   npm run dev
//   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
//     --headless --disable-gpu --remote-debugging-port=9222 \
//     --window-size=1600,1300 http://localhost:5173/
//
// Aufruf:
//   node tools/browser/inspect.mjs templates
//   node tools/browser/inspect.mjs orientation
//   node tools/browser/inspect.mjs labels
//   node tools/browser/inspect.mjs shot [datei.png] [css-selektor]

const ENDPOINT = process.env.CDP_ENDPOINT || "http://127.0.0.1:9222";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connect() {
  let targets;
  try {
    targets = await (await fetch(`${ENDPOINT}/json`)).json();
  } catch {
    fail(`kein Browser auf ${ENDPOINT} erreichbar - siehe Kopf dieser Datei`);
  }
  const page = targets.find((t) => t.type === "page");
  if (!page) fail("kein Seiten-Target gefunden");

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  const pending = new Map();
  let id = 0;
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    const done = pending.get(m.id);
    if (done) { pending.delete(m.id); done(m); }
  };
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  const send = (method, params = {}) =>
    new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true });
    if (r.result?.exceptionDetails) fail(r.result.exceptionDetails.exception?.description || "Auswertung fehlgeschlagen");
    return r.result?.result?.value;
  };

  await send("Page.enable");
  return { send, evaluate, close: () => ws.close() };
}

function fail(msg) {
  console.error(`inspect: ${msg}`);
  process.exit(1);
}

/** Auf die Parodontal-Ansicht umschalten, falls sie nicht schon aktiv ist. Die
 *  Zahnkarte haengt an einem Umschalter, dessen DOM-Deckname noch
 *  `dentalChart` lautet - deshalb wird ueber den Text mitgesucht. */
async function showPerio({ evaluate }) {
  const ok = await evaluate(`(() => {
    if (document.querySelector('svg.perio-tooth-arch')) return true;
    const b = [...document.querySelectorAll('#appViewToggle button')]
      .find(x => /perio/i.test(x.id + x.textContent));
    if (!b) return false;
    b.click();
    return true;
  })()`);
  if (!ok) fail("Parodontal-Umschalter nicht gefunden");
  await sleep(2000);
}

// ---------------------------------------------------------------------------

/** Welcher Zahn wird aus welchem Template gezeichnet - aus dem gerenderten DOM,
 *  nicht aus TOOTH_TEMPLATE. Beantwortet Fragen der Art "nutzt der untere
 *  Molar wirklich die zweiwurzelige Form?". */
async function templates(cdp) {
  await showPerio(cdp);
  const rows = await cdp.evaluate(`JSON.stringify(
    [...document.querySelectorAll('svg.perio-tooth-arch')].map(svg => ({
      band: svg.getAttribute('class').replace('perio-tooth-arch ', ''),
      teeth: [...svg.querySelectorAll('[data-tooth][data-tpl]')]
        .map(g => g.getAttribute('data-tooth') + ':' + g.getAttribute('data-tpl')).join(' '),
    })))`);
  for (const r of JSON.parse(rows)) console.log(`${r.band}\n  ${r.teeth}`);
}

/** Zeigen die Wurzeln je Band nach cranial oder caudal, und stimmt das mit dem
 *  Kiefer ueberein?
 *
 *  Gemessen wird an der mm-Rasterbeschriftung, NICHT an den Begrenzungsrechtecken
 *  der Kronen-/Wurzelgruppen: `getBoundingClientRect` beruecksichtigt kein
 *  `clip-path`, und seit die Wurzel als zweite, geclippte Kopie gezeichnet wird,
 *  ueberdecken sich die beiden Rechtecke. Das Raster laeuft konstruktionsbedingt
 *  von der SZG zur Wurzel hin, ist also der verlaessliche Zeiger. */
async function orientation(cdp) {
  await showPerio(cdp);
  const rows = await cdp.evaluate(`JSON.stringify(
    [...document.querySelectorAll('svg.perio-tooth-arch')].map(svg => {
      const zahn = svg.querySelector('[data-tooth]')?.getAttribute('data-tooth');
      const texts = [...svg.querySelectorAll('text')]
        .map(n => ({ t: n.textContent.trim(), y: n.getBoundingClientRect().top }));
      const y5 = texts.find(x => x.t === '5'), y15 = texts.find(x => x.t === '15');
      const jaw = Number(zahn) < 30 ? 'OK' : 'UK';
      const dir = (!y5 || !y15) ? '?' : (y15.y < y5.y ? 'cranial' : 'caudal');
      return {
        jaw, tooth: zahn,
        band: svg.getAttribute('class').replace('perio-tooth-arch perio-tooth-arch-', ''),
        dir, want: jaw === 'OK' ? 'cranial' : 'caudal',
      };
    }))`);
  let bad = 0;
  for (const r of JSON.parse(rows)) {
    const ok = r.dir === r.want;
    if (!ok) bad++;
    console.log(`${ok ? "OK" : "!!"} ${r.jaw} ${r.band.padEnd(8)} (Zahn ${r.tooth}): Wurzel ${r.dir}, erwartet ${r.want}`);
  }
  console.log(bad ? `\n${bad} Band/Baender falsch herum` : "\nalle Baender richtig ausgerichtet");
  if (bad) process.exitCode = 1;
}

/** Die Zeilenbeschriftungen beider Boegen - Oberkiefer muss "Palatal ...",
 *  Unterkiefer "Lingual ..." tragen. */
async function labels(cdp) {
  await showPerio(cdp);
  const out = await cdp.evaluate(`JSON.stringify(
    [...document.querySelectorAll('*')]
      .filter(n => n.children.length === 0 && /^(Buccal|Palatal|Lingual)\\s/.test(n.textContent.trim()))
      .map(n => n.textContent.trim()))`);
  for (const l of JSON.parse(out)) console.log("  " + l);
}

/** Screenshot der Seite oder eines Elements.
 *
 *  Achtung: `Page.captureScreenshot`'s `clip` rechnet in DOKUMENT-Koordinaten,
 *  `getBoundingClientRect` liefert Fenster-Koordinaten. Ohne den Scroll-Versatz
 *  kommt ein leeres Bild heraus. */
async function shot(cdp, file = "shot.png", selector = null) {
  const clip = selector
    ? JSON.parse(await cdp.evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return 'null';
        el.scrollIntoView({ block: 'center' });
        const r = el.getBoundingClientRect();
        return JSON.stringify({
          x: Math.round(r.x + window.scrollX), y: Math.round(r.y + window.scrollY),
          width: Math.round(r.width), height: Math.round(r.height), scale: 1,
        });
      })()`))
    : null;
  if (selector && !clip) fail(`Selektor ohne Treffer: ${selector}`);
  if (clip) await sleep(500);
  const res = await cdp.send("Page.captureScreenshot", clip ? { format: "png", clip } : { format: "png" });
  const { writeFileSync } = await import("node:fs");
  writeFileSync(file, Buffer.from(res.result.data, "base64"));
  console.log(`geschrieben: ${file}`);
}

// ---------------------------------------------------------------------------

const [cmd, ...rest] = process.argv.slice(2);
const commands = { templates, orientation, labels, shot };
if (!cmd || !commands[cmd]) {
  console.error(`Aufruf: node tools/browser/inspect.mjs <${Object.keys(commands).join("|")}> [args]`);
  process.exit(1);
}
const cdp = await connect();
try {
  await commands[cmd](cdp, ...rest);
} finally {
  cdp.close();
}
