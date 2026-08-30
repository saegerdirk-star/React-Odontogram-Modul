// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Schema Draufsicht: anterior teeth (13-23, 43-33) get an INCISAL-edge box
// instead of the molar occlusal square, but the FIVE surfaces (m/d/labial/
// palatal/incisal) must stay separately colourable (Dirk's acceptance
// condition, 30.08.2026).
import { describe, it, expect } from "vitest";
import { __setToothStateForTest, getToothDisplayState } from "../odontogram";
import { buildSchematicSvg } from "../schematicGraphic";

describe("anterior incisal-edge Draufsicht", () => {
  it("keeps all five surfaces as distinct coloured zones on an anterior tooth", () => {
    // mesial + distal caries (red), buccal amalgam, lingual GIC, incisal composite
    __setToothStateForTest(11, {
      caries: ["caries-mesial", "caries-distal"],
      fillingSurfaces: ["buccal", "lingual", "occlusal"],
      fillingSurfaceMaterials: { buccal: "amalgam", lingual: "gic", occlusal: "composite" },
    });
    const svg = buildSchematicSvg(getToothDisplayState);
    // four distinct fills present → the zones render independently, not merged
    expect(svg).toContain("#c62828"); // caries (mesial & distal)
    expect(svg).toContain("#9aa0a4"); // amalgam (buccal)
    expect(svg).toContain("#ecd9a6"); // GIC (lingual)
    expect(svg).toContain("#ece5d6"); // composite (incisal/occlusal)
  });

  it("uses the incisal-edge bar geometry only for anteriors, not molars", () => {
    __setToothStateForTest(11, {}); // anterior
    __setToothStateForTest(16, {}); // molar
    const svg = buildSchematicSvg(getToothDisplayState);
    // molar keeps the square occlusal + inner square (rx=4); anterior gets a
    // flatter box (boxH 30) with a wide incisal bar (inW 26, inH 9).
    expect(svg).toContain('width="26" height="9"'); // anterior incisal bar
    expect(svg).toContain('width="18" height="18"'); // molar occlusal square
  });
});
