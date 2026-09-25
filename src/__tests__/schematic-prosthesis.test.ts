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
    // Form D: versorgt (neutral) with a DASHED edge — removable, not fixed
    expect(svg).toContain('fill="#aab8ca" stroke="#4f6179" stroke-width="2.6" stroke-linejoin="round" stroke-dasharray="4 3"');
    expect(svg).toContain(">e<");        // "ersetzt" badge
  });

  it("a plain missing tooth is an 'f', its top view a faint dashed outline", () => {
    __setToothStateForTest(24, { toothSelection: "none" });
    const svg = buildSchematicSvg(getToothDisplayState);
    expect(svg).toContain(">f</text>");
    expect(svg).toContain('stroke="#c3cbd6" stroke-width="1.2" stroke-dasharray="3 4"');
    expect(svg).not.toContain("stroke-dasharray=\"4 3\"");   // no denture tooth
  });
});
