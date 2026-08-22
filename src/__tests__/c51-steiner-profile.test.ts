// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Bead odontogram-c51.2, viertes Verfahren. Steiner, aus dem FRWin-Katalog der
// Praxis uebernommen, den Dirk am 22.08.2026 zugaenglich gemacht hat.
//
// DIE ENTSCHEIDUNG, DIE HIER FESTGEHALTEN IST — und sie ist eine
// Grundsatzentscheidung, keine Zahl: der Katalog nennt zu KEINER Messgroesse
// eine Quelle, und Dirk hat entschieden, keine zu behaupten. FRWin als Quelle
// auszuzeichnen waere weder wahr noch unbedenklich (Copyright); eine
// Publikation zu zitieren, die niemand gelesen hat, verbietet die Sourcing-
// Regel ohnehin. Also: die Norm wird ausgeliefert, die Herkunft bleibt offen,
// der Anwender prueft selbst. Das `source`-Feld sagt genau das und wird dem
// Anwender nie gezeigt.
//
// Der Test haelt drei Dinge fest:
//   1. Die Normen, wie der Katalog sie fuehrt — sie stehen sonst nirgends.
//   2. Dass Steiners eigene Werte fuer die geTEILTEN Messgroessen (SNA/SNB/ANB,
//      die Inzisiviwerte) als Profil-Ueberschreibung reiten und den Bestand
//      NICHT anfassen: derselbe Mechanismus wie bei Ricketts' Fazialachse.
//   3. Dass die Quelle die Sourcing-Regel erfuellt, ohne eine zu erfinden.
import { describe, it, expect } from "vitest";
import { LANDMARKS, MEASURES, PROFILES, measure, normFor, profileMeasures } from "../cephalometry";

const steiner = PROFILES.find(p => p.id === "steiner")!;

describe("das Verfahren", () => {
  it("steht im Katalog der Profile und misst gegen die vordere Schaedelbasis", () => {
    expect(steiner).toBeDefined();
    expect(steiner.referenceFrame).toBe("anterior-cranial-base");
    expect(PROFILES.map(p => p.id)).toContain("steiner");
  });

  it("zeigt genau die fuenfzehn Messgroessen des Auswertungsbogens, in seiner Reihenfolge", () => {
    expect(profileMeasures("steiner").map(m => m.id)).toEqual([
      "SNA", "SNB", "ANB", "SteinerSND",
      "OK1NA_mm", "OK1NA_deg", "SteinerOK1SN",
      "UK1NB_mm", "UK1NB_deg", "PgNB",
      "Interincisal", "SNOccl", "SteinerGoGnSN",
      "SteinerSL", "SteinerSE",
    ]);
  });

  it("bringt die drei Messpunkte mit, die es vorher nicht gab", () => {
    const ids = new Set(LANDMARKS.map(l => l.id));
    for (const pt of ["D", "Ct", "Condp"]) expect(ids.has(pt), pt).toBe(true);
    for (const m of profileMeasures("steiner")) {
      for (const pt of m.points) expect(ids.has(pt), `${m.id} -> ${pt}`).toBe(true);
    }
  });
});

describe("die Normwerte, wie der Katalog sie fuehrt", () => {
  const erwartet: [string, number, number | null][] = [
    ["SNA", 82, 2], ["SNB", 80, 2], ["ANB", 2, 2],
    ["SteinerSND", 76, null],
    ["OK1NA_mm", 4, null], ["OK1NA_deg", 22, null], ["SteinerOK1SN", 103, null],
    ["UK1NB_mm", 4, null], ["UK1NB_deg", 25, null],
    ["Interincisal", 131, null], ["SNOccl", 14, null], ["SteinerGoGnSN", 32, null],
    ["SteinerSL", 51, null], ["SteinerSE", 21, null],
  ];
  for (const [id, norm, sd] of erwartet) {
    it(`${id}: ${norm}${sd === null ? "" : " ± " + sd}`, () => {
      const n = normFor(id, "steiner")!;
      expect(n.norm).toBe(norm);
      expect(n.sd).toBe(sd);
    });
  }

  it("Pg-NB steht im Bogen, aber ohne Zielwert — der Katalog gibt keinen", () => {
    expect(normFor("PgNB", "steiner")!.norm).toBeNull();
  });
});

describe("Steiners Werte reiten als Ueberschreibung, ohne den Bestand anzufassen", () => {
  it("SNA ist bei Steiner 82 ± 2, bei Hasund 82 ± 3, und ohne Profil der Bestand", () => {
    expect(normFor("SNA", "steiner")).toMatchObject({ norm: 82, sd: 2 });
    expect(normFor("SNA", "hasund")).toMatchObject({ norm: 82, sd: 3 });
    expect(normFor("SNA")!.sd).toBe(3);
  });

  it("der Interinzisalwinkel ist bei Steiner 131, bei Segner/Hasund 132", () => {
    expect(normFor("Interincisal", "steiner")!.norm).toBe(131);
    expect(normFor("Interincisal")!.norm).toBe(132);
  });

  it("die vier Inzisivi-Strecken/Winkel bekommen bei Steiner einen Wert, im Bestand keinen", () => {
    for (const id of ["OK1NA_mm", "OK1NA_deg", "UK1NB_mm", "UK1NB_deg"]) {
      expect(normFor(id, "steiner")!.norm).not.toBeNull();
      expect(normFor(id)!.norm).toBeNull();
    }
  });
});

describe("die Sourcing-Regel, ohne eine Quelle zu erfinden", () => {
  it("jede Steiner-eigene Messgroesse traegt eine Quelle, die keine Publikation behauptet", () => {
    for (const id of ["SteinerSND", "SteinerOK1SN", "SteinerGoGnSN", "SteinerSL", "SteinerSE"]) {
      const q = measure(id)!.source;
      expect(q.length).toBeGreaterThan(20);
      expect(q).toMatch(/WITHOUT a cited source/);
      expect(q).not.toMatch(/No publication produced/);
    }
  });

  it("die Quelle nennt NICHT FRWin als Herkunft (Dirks Copyright-Einwand)", () => {
    for (const m of MEASURES) {
      expect(m.source).not.toMatch(/FRWin/i);
    }
    for (const p of PROFILES) expect(p.source).not.toMatch(/FRWin/i);
  });

  it("keine erfundene LOINC/SNOMED-Kodierung, lokale Schluessel eindeutig", () => {
    for (const m of profileMeasures("steiner")) {
      expect(m.coding.loinc).toBeUndefined();
      expect(m.coding.snomed).toBeUndefined();
    }
    const alle = MEASURES.map(m => m.coding.local);
    expect(new Set(alle).size).toBe(alle.length);
  });
});
