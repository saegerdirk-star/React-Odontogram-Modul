// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Hemisektion/Amputation/Prämolarisierung (rootResection + rootResectionRoot)
// and WSR (endoResection) in the SCHEMATIC view. The anatomical view already
// renders both (hemisection clip/overlay, endo-resection layer); these pin the
// display-state projection and the schematic glyph, the "both views" gap.
import { describe, it, expect } from "vitest";
import {
  __setToothStateForTest,
  getToothDisplayState,
} from "../odontogram";
import { buildSchematicSvg } from "../schematicGraphic";

describe("root resection + WSR — projection + schematic", () => {
  it("projects rootResection / rootResectionRoot / endoResection", () => {
    __setToothStateForTest(16, { rootResection: "hemisection", rootResectionRoot: "mesiobuccal", endoResection: true });
    const d = getToothDisplayState(16);
    expect(d.rootResection).toBe("hemisection");
    expect(d.rootResectionRoot).toBe("mesiobuccal");
    expect(d.endoResection).toBe(true);
  });

  it("draws a Hem badge + a red cut line for a hemisection", () => {
    __setToothStateForTest(16, { rootResection: "hemisection", rootResectionRoot: "distobuccal" });
    const svg = buildSchematicSvg(getToothDisplayState);
    expect(svg).toContain(">Hem<");
    expect(svg).toContain("#b70000"); // red cut line
  });

  it("draws a WSR badge for an apicoectomy, and combines with Hem", () => {
    __setToothStateForTest(46, { rootResection: "amputation", rootResectionRoot: "mesial", endoResection: true });
    const svg = buildSchematicSvg(getToothDisplayState);
    expect(svg).toContain(">Amp·WSR<");
  });

  it("draws a WSR badge on its own", () => {
    __setToothStateForTest(36, { endoResection: true });
    const svg = buildSchematicSvg(getToothDisplayState);
    expect(svg).toContain(">WSR<");
  });

  it("marks a premolarisation with its own badge (no root removed)", () => {
    __setToothStateForTest(36, { rootResection: "premolarisation" });
    const d = getToothDisplayState(36);
    expect(d.rootResectionRoot).toBe(""); // premolarisation removes no root
    const svg = buildSchematicSvg(getToothDisplayState);
    expect(svg).toContain(">Prä<");
  });
});
