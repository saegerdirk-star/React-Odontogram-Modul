// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Bead odontogram-c51.2, zweites Verfahren. Dirk, 22.08.2026, auf die Frage,
// warum nur Hasund angeboten wird: er hat die sechs Ricketts-Normen selbst
// geliefert (Erwachsenennorm).
//
// WAS DIESER TEST FESTHAELT, und warum jedes Stueck davon:
//
//   1. Die Zahlen. Sechs Normen mit ihren Streuungen — sie stehen nirgends
//      sonst und niemand wuerde eine vertauschte Streuung am Bild bemerken.
//   2. Der Bezugsrahmen. Ricketts misst gegen die Frankfurter Horizontale,
//      nicht gegen die vordere Schaedelbasis. Vier der sechs Messgroessen
//      brauchen Po und Or, die es vorher nicht gab.
//   3. Die NORM-UEBERSCHREIBUNG. Die Fazialachse ist die einzige Messgroesse,
//      die beide Verfahren teilen, und sie ist genau der Fall, fuer den
//      `CephProfile.norms` gebaut wurde: 90 +/- 3,5 bei Ricketts gegen
//      90 +/- 3,0 bei Paddenberg. Derselbe Messwert liest sich knapp innerhalb
//      der einen und knapp ausserhalb der anderen Streuung — 93,3 ist der
//      Beleg dafuer.
//   4. Die BELEG-REGEL bleibt gewahrt. Die Normen sind klinisch belegt und
//      nicht bibliographisch, und die Quellenangabe sagt das in genau diesen
//      Worten. Der Test verlangt es, damit niemand sie spaeter stillschweigend
//      zu einer Publikation aufwertet, die nicht gelesen wurde.
import { describe, it, expect } from "vitest";
import {
  LANDMARKS, MEASURES, PROFILES, measure, normFor, profileMeasures,
  deriveGrowthPattern,
} from "../cephalometry";
import { parseCephText } from "../cephImport";

const ricketts = PROFILES.find(p => p.id === "ricketts")!;

describe("das Verfahren selbst", () => {
  it("steht neben Hasund und misst gegen die Frankfurter Horizontale", () => {
    expect(ricketts).toBeDefined();
    expect(ricketts.referenceFrame).toBe("frankfurt");
    expect(PROFILES.map(p => p.id)).toContain("hasund");
  });

  it("bringt Porion und Orbitale mit — ohne sie gibt es keine Frankfurter Horizontale", () => {
    const ids = LANDMARKS.map(l => l.id);
    expect(ids).toContain("Po");
    expect(ids).toContain("Or");
    // und jede Messgroesse des Profils ist ueber vorhandenen Punkten definiert
    const bekannt = new Set(ids);
    for (const m of profileMeasures("ricketts")) {
      for (const pt of m.points) expect(bekannt.has(pt), `${m.id} -> ${pt}`).toBe(true);
    }
  });

  it("zeigt genau die sechs Messgroessen, in Dirks Reihenfolge", () => {
    expect(profileMeasures("ricketts").map(m => m.id)).toEqual([
      "FacialAxis", "FacialDepth", "MandFH", "Convexity", "UK1APog_mm", "UK1APog_deg",
    ]);
  });
});

describe("die Normwerte, wie Dirk sie angegeben hat", () => {
  const erwartet: [string, number, number, string][] = [
    ["FacialAxis", 90, 3.5, "deg"],
    ["FacialDepth", 89, 3, "deg"],
    ["MandFH", 24, 4.5, "deg"],
    ["Convexity", 0, 2, "mm"],
    ["UK1APog_mm", 1, 2, "mm"],
    ["UK1APog_deg", 22, 4, "deg"],
  ];

  for (const [id, norm, sd, unit] of erwartet) {
    it(`${id}: ${norm} +/- ${sd} ${unit}`, () => {
      const n = normFor(id, "ricketts")!;
      expect(n.norm).toBe(norm);
      expect(n.sd).toBe(sd);
      expect(measure(id)!.unit).toBe(unit);
    });
  }
});

describe("die Fazialachse: warum Normen am Profil haengen", () => {
  it("Ricketts gibt 3,5, Paddenberg 3,0 — beide stehen, keine gewinnt global", () => {
    expect(normFor("FacialAxis", "ricketts")!.sd).toBe(3.5);
    expect(normFor("FacialAxis", "hasund")!.sd).toBe(3.0);
    expect(normFor("FacialAxis")!.sd).toBe(3.0);       // ohne Profil: der Bestand
  });

  it("und das aendert die Lesart: 93,3 liegt innerhalb der einen Streuung und ausserhalb der anderen", () => {
    const wert = 93.3;
    const r = normFor("FacialAxis", "ricketts")!;
    const p = normFor("FacialAxis")!;
    expect(Math.abs(wert - r.norm!) / r.sd!).toBeLessThan(1);
    expect(Math.abs(wert - p.norm!) / p.sd!).toBeGreaterThan(1);
  });
});

describe("die Beleg-Regel", () => {
  it("jede neue Messgroesse traegt eine Quelle, und sie nennt sich klinisch statt publiziert", () => {
    for (const id of ["FacialDepth", "MandFH", "Convexity", "UK1APog_mm", "UK1APog_deg"]) {
      const q = measure(id)!.source;
      expect(q.length).toBeGreaterThan(20);
      expect(q).toMatch(/have not\s+been read/);
      expect(q).toMatch(/Dirk Saeger/);
    }
  });

  it("keine erfundene LOINC- oder SNOMED-Kodierung, aber ein lokaler Schluessel und eine Einheit", () => {
    for (const m of profileMeasures("ricketts")) {
      expect(m.coding.local).toBeTruthy();
      expect(["deg", "mm", "%"]).toContain(m.coding.ucum);
      expect(m.coding.loinc).toBeUndefined();
      expect(m.coding.snomed).toBeUndefined();
    }
  });

  it("die lokalen Schluessel bleiben mouthweit eindeutig", () => {
    const alle = MEASURES.map(m => m.coding.local);
    expect(new Set(alle).size).toBe(alle.length);
  });
});

describe("das Wachstumsmuster", () => {
  it("die Mandibularebene stimmt mit ab: steiler als die Norm liest vertikal", () => {
    const steil = deriveGrowthPattern({ MandFH: 34 }, "ricketts");
    expect(steil.indicators.map(i => i.id)).toContain("MandFH");
    expect(steil.indicators.find(i => i.id === "MandFH")!.reads).toBe("vertical");

    const flach = deriveGrowthPattern({ MandFH: 14 }, "ricketts");
    expect(flach.indicators.find(i => i.id === "MandFH")!.reads).toBe("horizontal");
  });

  it("ein leeres Formular bleibt unbestimmt, nicht neutral", () => {
    expect(deriveGrowthPattern({}, "ricketts").pattern).toBe("indeterminate");
  });
});

describe("der Importer kennt die neuen Zeilen", () => {
  it("trennt Winkel und Strecke zur selben Bezugslinie", () => {
    const r = parseCephText([
      "UK1-A-Pog - Strecke        1,0mm       2,4mm      +1,4",
      "UK1-A-Pog - Winkel        22,0°       25,1°      +3,1",
    ].join("\n"));
    const nach = Object.fromEntries(r.values.map(v => [v.measureId, v.value]));
    expect(nach["UK1APog_mm"]).toBe(2.4);
    expect(nach["UK1APog_deg"]).toBe(25.1);
  });

  it("Fazialachse und Fazialwinkel werden nicht verwechselt", () => {
    const r = parseCephText([
      "Fazialachse       90,0°     88,2°     -1,8",
      "Fazialwinkel      89,0°     91,4°     +2,4",
    ].join("\n"));
    const nach = Object.fromEntries(r.values.map(v => [v.measureId, v.value]));
    expect(nach["FacialAxis"]).toBe(88.2);
    expect(nach["FacialDepth"]).toBe(91.4);
  });

  it("Mandibularebene und Konvexität", () => {
    const r = parseCephText([
      "ML-FH - Winkel     24,0°     29,5°     +5,5",
      "Konvexität          0,0mm     3,2mm     +3,2",
    ].join("\n"));
    const nach = Object.fromEntries(r.values.map(v => [v.measureId, v.value]));
    expect(nach["MandFH"]).toBe(29.5);
    expect(nach["Convexity"]).toBe(3.2);
  });
});
