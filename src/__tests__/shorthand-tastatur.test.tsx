// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Bead odontogram-t8y: der Weg vom Tastendruck bis in den Zustand.
//
// `shorthand.test.ts` prueft die ABBILDUNG ohne Browser. Hier wird das Raster
// wirklich gebaut und wirklich getippt - denn die Abbildung kann stimmen und
// der Tastendruck trotzdem nirgends ankommen. Genau das war der Fehler, an dem
// die Milchzahn-Kauflaeche haengengeblieben ist: eine Tabelle zu lesen ist
// nicht dasselbe, wie das gebaute Raster zu befragen.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, cleanup, waitFor, act } from "@testing-library/react";
import OdontogramShell from "../App";
import { getStatusChart, getShorthandUndoDepth, __resetChartStateForTest } from "../odontogram";

beforeEach(() => {
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false, media: query, onchange: null,
        addListener() {}, removeListener() {},
        addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false,
      }),
    });
  }
  if (!("ResizeObserver" in window)) {
    Object.defineProperty(window, "ResizeObserver", {
      writable: true,
      value: class { observe() {} unobserve() {} disconnect() {} },
    });
  }
});

afterEach(async () => {
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  cleanup();
  __resetChartStateForTest();
});

function kachel(toothNo: number): HTMLElement {
  const el = document.querySelector<HTMLElement>(
    `#toothGrid .tooth-tile.side-view[data-tooth="${toothNo}"]`);
  if(!el) throw new Error(`keine Seitenansicht fuer ${toothNo}`);
  return el;
}

/** Tippt auf der Kachel, die gerade den Fokus hat - so wie am Stuhl. */
async function tippe(text: string, opts: { shift?: boolean } = {}){
  for(const key of text){
    const ziel = (document.activeElement as HTMLElement) ?? document.body;
    await act(async () => {
      ziel.dispatchEvent(new KeyboardEvent("keydown", {
        key, bubbles: true, cancelable: true, shiftKey: !!opts.shift,
      }));
    });
  }
}

async function taste(key: string, opts: { shift?: boolean; meta?: boolean } = {}){
  const ziel = (document.activeElement as HTMLElement) ?? document.body;
  await act(async () => {
    ziel.dispatchEvent(new KeyboardEvent("keydown", {
      key, bubbles: true, cancelable: true,
      shiftKey: !!opts.shift, metaKey: !!opts.meta,
    }));
  });
}

function zahn(toothNo: number): Record<string, unknown> {
  const teeth = getStatusChart().teeth as Record<string, Record<string, unknown>>;
  return teeth[String(toothNo)] ?? {};
}

async function raster(){
  render(<OdontogramShell />);
  await waitFor(() => {
    expect(document.querySelectorAll("#toothGrid .tooth-tile.side-view").length).toBeGreaterThan(0);
  }, { timeout: 30000 });
}

function anzeige(): HTMLElement | null {
  return document.getElementById("shorthandBuffer");
}

// FRISTEN, und warum sie so grosszuegig sind.
//
// Jeder dieser Tests montiert die volle Schale und tippt wirklich - allein
// braucht der schnellste 5 und der langsamste 43 Sekunden. Unter der Last der
// vollen Suite wird daraus ein Vielfaches: am 22.08.2026 ist "k wirkt sofort
// auf einer Mehrfachauswahl" bei 30 s abgelaufen, allein gemessen 11 s.
//
// Ein Fehlschlag aus Zeitmangel sagt nichts ueber die Sache aus, sondern nur
// ueber die Auslastung der Maschine - und er kostet mehr, als er einbringt:
// die Suite wird rot, und wer das oft sieht, liest "1 failed" als normal
// (siehe odontogram-xtj). Deshalb 90 Sekunden fuer alle, dreifach ueber dem
// gemessenen Bedarf unter Last.

describe("Kurzschrift auf der Tastatur", () => {
  it("k wirkt sofort auf einer Mehrfachauswahl - Dirks sechs Frontzaehne", async () => {
    await raster();
    // Sechs obere Frontzaehne markieren, wie mit gedrueckter Meta-Taste.
    for(const t of [13, 12, 11, 21, 22, 23]){
      await act(async () => {
        kachel(t).dispatchEvent(new MouseEvent("click", { bubbles: true, metaKey: true }));
      });
    }
    kachel(23).focus();
    // Keramik, dann Krone. Ein Anschlag je Taste, kein Enter hinterher.
    await tippe("Ek");
    for(const t of [13, 12, 11, 21, 22, 23]){
      expect(zahn(t).restorationType, `${t}`).toBe("crown");
      expect(zahn(t).restorationMaterial, `${t}`).toBe("emax");
    }
    // Ein nicht markierter Zahn bleibt unberuehrt.
    expect(zahn(24).restorationType ?? "none").toBe("none");
  }, 180000);

  it("Tabulator geht zum naechsten Zahn und nimmt die Auswahl mit", async () => {
    await raster();
    await act(async () => { kachel(16).dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    kachel(16).focus();
    await taste("Tab");
    expect(kachel(15).classList.contains("active")).toBe(true);
    expect(kachel(16).classList.contains("active")).toBe(false);
    await taste("Tab", { shift: true });
    expect(kachel(16).classList.contains("active")).toBe(true);
  }, 180000);

  it("k, Tabulator, b - Krone und Brueckenglied am Nachbarn", async () => {
    await raster();
    await act(async () => { kachel(16).dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    kachel(16).focus();
    await tippe("Gk");
    await taste("Tab");
    await tippe("b");
    expect(zahn(16).restorationType).toBe("crown");
    expect(zahn(16).restorationMaterial).toBe("gold");
    expect(zahn(15).toothSelection).toBe("none");
    expect(zahn(15).restorationType).toBe("bridge");
  }, 180000);

  it("eine Flaechenkette wird erst mit dem Tabulator wirksam, dann als EINE Fuellung", async () => {
    await raster();
    await act(async () => { kachel(36).dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    kachel(36).focus();
    await tippe("Amod");   // A wirkt sofort, m o d sammeln sich
    // Noch nichts geschrieben - die Kette ist offen.
    expect(zahn(36).fillingSurfaces ?? []).toEqual([]);
    await taste("Tab");
    const flaechen = zahn(36).fillingSurfaces as string[];
    expect(new Set(flaechen)).toEqual(new Set(["mesial", "occlusal", "distal"]));
  }, 180000);

  it("Totalprothese: alles markiert, ein e", async () => {
    await raster();
    const sichtbar = Array.from(
      document.querySelectorAll<HTMLElement>("#toothGrid .tooth-tile.side-view"))
      .filter(el => !el.classList.contains("wisdom-hidden") && !el.classList.contains("placeholder"))
      .map(el => Number(el.dataset.tooth));
    for(const t of sichtbar){
      await act(async () => {
        kachel(t).dispatchEvent(new MouseEvent("click", { bubbles: true, metaKey: true }));
      });
    }
    kachel(sichtbar[0]).focus();
    await tippe("e");
    for(const t of [11, 16, 31, 36]){
      expect(zahn(t).prosthesis, `${t}`).toBe("removable-full");
      expect(zahn(t).toothSelection, `${t}`).toBe("none");
    }
    // 90 Sekunden, nicht 40. Der Test klickt achtundzwanzig Kacheln EINZELN
    // durch `act()` und rendert danach das ganze Raster neu; allein braucht er
    // rund 42 Sekunden, unter der Last des vollen Laufs mehr. Gemessen am
    // 21.08.2026 faellt er bei 40 Sekunden auch OHNE jede Aenderung - die
    // Grenze war zu knapp gesetzt, nicht der Test zu langsam geworden.
  }, 180000);

  it("sagt es, wenn eine Taste nichts bewirkt hat", async () => {
    await raster();
    await act(async () => { kachel(16).dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    kachel(16).focus();
    // `z` ist charlys zervikale Flaeche - verstanden, aber unser Flaechensatz
    // hat sie nicht. Vorher stand hier `p` (bis odontogram-fu1) und dann `D`
    // (bis odontogram-0n8); beide haben inzwischen ein Ziel und taugen als
    // Beispiel nicht mehr. `z` und `R` sind die letzten zwei, und sie tragen
    // absichtlich keinen Bead.
    await tippe("z");
    await taste("Enter");
    expect(anzeige()?.classList.contains("notice")).toBe(true);
    expect(anzeige()?.textContent ?? "").toContain("z");
    expect(anzeige()?.classList.contains("empty")).toBe(false);
  }, 180000);

  it("meldet einen Tippfehler getrennt vom noch Fehlenden", async () => {
    await raster();
    await act(async () => { kachel(16).dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    kachel(16).focus();
    await tippe("q");
    await taste("Enter");
    const text = anzeige()?.textContent ?? "";
    expect(text).toContain("q");
    // Es ist die Unbekannt-Meldung, nicht die Noch-nicht-erfassbar-Meldung.
    // (Die Testumgebung laeuft auf Englisch.)
    expect(text).toContain("Unknown");
    expect(text).not.toContain("Not chartable");
  }, 180000);

  it("Escape raeumt den Puffer, bevor es die Auswahl raeumt", async () => {
    await raster();
    await act(async () => { kachel(16).dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    kachel(16).focus();
    await tippe("A");                       // wartet, weil Am daraus werden koennte
    await taste("Escape");
    expect(kachel(16).classList.contains("active")).toBe(true);
    await taste("Escape");
    expect(kachel(16).classList.contains("active")).toBe(false);
  }, 180000);
});
