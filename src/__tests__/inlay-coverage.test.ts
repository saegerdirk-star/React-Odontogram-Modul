// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Inlay-Flächen für den Kostenplan (Dirk, 31.08.2026): ein Restaurationsmaterial
// auf Flächen ist ein INLAY, und die Flächen werden als `inlayCoverage`
// gespeichert (früher verworfen), damit die Engine „Inlay n-flächig" abrechnen
// kann. Plus die neuen Materialien Zirkon/NEM.
import { describe, it, expect } from "vitest";
import { parseShorthand, MATERIALS } from "../shorthand";
import {
  __setToothStateForTest,
  getToothDisplayState,
  getStatusChart,
  toggleInlaySurface,
  getInlayCoverage,
} from "../odontogram";
import { buildSchematicSvg } from "../schematicGraphic";

describe("materials: Zirkon + NEM", () => {
  it("map to the zircon and metal restoration materials", () => {
    expect(MATERIALS.Zir.restoration).toBe("zircon");
    expect(MATERIALS.NEM.restoration).toBe("metal");
    expect(MATERIALS.Zir.filling).toBeNull();
  });
});

describe("inlay from material + surfaces", () => {
  it("a restoration material on surfaces parses to an inlay AND records the surfaces", () => {
    const r = parseShorthand("Gmod");   // Gold on m/o/d
    // restorationType inlay + material gold
    expect(r.edits).toContainEqual({ kind: "axis", field: "restorationType", value: "inlay" });
    expect(r.edits).toContainEqual({ kind: "axis", field: "restorationMaterial", value: "gold" });
    // the surfaces are kept as the inlay's extent, not dropped
    const cov = r.edits.find(e => e.kind === "surfaces" && (e as { target: string }).target === "inlay-coverage");
    expect(cov).toBeTruthy();
    expect((cov as { surfaces: string[] }).surfaces.sort()).toEqual(["distal", "mesial", "occlusal"]);
  });

  it("Zirkon on surfaces gives a zircon inlay", () => {
    const r = parseShorthand("Ziro");   // Zirkon on occlusal
    expect(r.edits).toContainEqual({ kind: "axis", field: "restorationMaterial", value: "zircon" });
    expect(r.edits).toContainEqual({ kind: "axis", field: "restorationType", value: "inlay" });
  });
});

describe("inlayCoverage model + schema", () => {
  it("stores and serializes only on an inlay, omit-when-empty", () => {
    __setToothStateForTest(16, { restorationType: "inlay", restorationMaterial: "gold" });
    expect(getInlayCoverage(16)).toEqual([]);
    expect(getStatusChart().teeth["16"]?.inlayCoverage).toBeUndefined();
    __setToothStateForTest(16, { restorationType: "inlay", restorationMaterial: "gold", inlayCoverage: ["mesial", "occlusal", "distal"] });
    expect(getStatusChart().teeth["16"]?.inlayCoverage).toEqual(["mesial", "occlusal", "distal"]);
  });

  it("the setter only takes on an inlay", () => {
    __setToothStateForTest(26, { restorationType: "crown" });
    toggleInlaySurface(26, "occlusal");
    expect(getInlayCoverage(26)).toEqual([]);
    __setToothStateForTest(26, { restorationType: "inlay" });
    toggleInlaySurface(26, "occlusal");
    expect(getInlayCoverage(26)).toEqual(["occlusal"]);
  });

  it("draws the inlay surfaces in the schema occlusal box", () => {
    __setToothStateForTest(16, { restorationType: "inlay", restorationMaterial: "gold", inlayCoverage: ["occlusal"] });
    const svg = buildSchematicSvg(getToothDisplayState);
    expect(svg).toContain("inlayClip-16");
  });
});
