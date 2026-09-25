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

// Since Form D (docs/design/schematic-form-d.md, 25.09.2026) the arch shows a
// restoration as "versorgt" in ONE neutral tone and caries as the only
// saturated surface colour, so "separately colourable" now means: every
// surface is its own zone, filled or carious on its own.
const zones = (svg: string, fill: string) => svg.split(`fill="${fill}" stroke=`).length - 1;

describe("anterior incisal-edge Draufsicht", () => {
  it("keeps all five surfaces as distinct zones on an anterior tooth", () => {
    // mesial + distal caries, buccal + lingual filled, incisal filled
    __setToothStateForTest(11, {
      caries: ["caries-mesial", "caries-distal"],
      fillingSurfaces: ["buccal", "lingual", "occlusal"],
      fillingSurfaceMaterials: { buccal: "amalgam", lingual: "gic", occlusal: "composite" },
    });
    const svg = buildSchematicSvg(getToothDisplayState);
    expect(zones(svg, "#d32f2f")).toBe(2);    // caries: mesial and distal, two zones
    expect(zones(svg, "#aab8ca")).toBe(3);    // versorgt: buccal, lingual, and the incisal field
  });

  it("uses the incisal-edge geometry only for anteriors, not molars", () => {
    __setToothStateForTest(11, {}); // anterior
    __setToothStateForTest(16, {}); // molar
    const svg = buildSchematicSvg(getToothDisplayState);
    // Form D inner fields: incisor 23..53 x 29..37 (a flat incisal bar, r 3),
    // molar 25..51 x 23..45 (a table, r 8) — drawn as rounded-rect paths
    expect(svg).toContain('d="M26,29 L50,29'); // incisor incisal bar
    expect(svg).toContain('d="M33,23 L43,23'); // molar occlusal table
  });
});
