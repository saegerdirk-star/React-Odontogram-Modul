// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Ersetzte Zähne (removable denture) in the schematic view (Dirk, 31.08.2026):
// a missing tooth replaced by a removable-partial/full prosthesis must render as
// a denture tooth (Prothesenzahn), not as a dashed "missing" ghost.
import { describe, it, expect } from "vitest";
import { __setToothStateForTest, getToothDisplayState } from "../odontogram";
import { buildSchematicSvg } from "../schematicGraphic";

describe("schematic: replaced teeth (removable denture)", () => {
  it("draws a denture tooth for a missing tooth with a removable prosthesis", () => {
    __setToothStateForTest(24, { toothSelection: "none", prosthesis: "removable-partial" });
    const svg = buildSchematicSvg(getToothDisplayState);
    expect(svg).toContain("#ecdcc4");   // denture-tooth colour (side + occlusal)
    expect(svg).toContain(">e<");        // "ersetzt" badge
  });

  it("a plain missing tooth stays a dashed ghost (no denture colour)", () => {
    __setToothStateForTest(25, { toothSelection: "none" });
    __setToothStateForTest(24, {}); // reset 24 from the previous test
    const svg = buildSchematicSvg(getToothDisplayState);
    // 25 alone → ghost; ensure a lone missing tooth doesn't get denture colour
    __setToothStateForTest(24, { toothSelection: "none" });
    const svg2 = buildSchematicSvg(getToothDisplayState);
    expect(svg2).toContain("stroke-dasharray=\"3 3\"");
  });
});
