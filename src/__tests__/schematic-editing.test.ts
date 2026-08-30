// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Schematic editing parity with the anatomical grid (Dirk, 30.08.2026): multi-
// tooth selection from the schematic (setChartSelection) and directly clickable
// occlusal SURFACE zones (data-surf) — both route through the existing paths
// (selectedTeeth + applyShorthand), no new mutation.
import { describe, it, expect } from "vitest";
import {
  __setToothStateForTest,
  getToothDisplayState,
  getSelectedTeeth,
} from "../odontogram";
import { buildSchematicSvg } from "../schematicGraphic";

// setChartSelection / selectToothInChart drive the control-panel DOM
// (updateSelectionUI → syncControlsFromState), so their multi-select behaviour
// is verified live (CDP) rather than headless. Here we only pin the DOM-free
// contract: getSelectedTeeth reads back an array.
describe("schematic multi-select", () => {
  it("getSelectedTeeth returns an array", () => {
    expect(Array.isArray(getSelectedTeeth())).toBe(true);
  });
});

describe("schematic clickable surface zones", () => {
  it("emits a data-surf hit for each of the five surfaces on a present tooth", () => {
    __setToothStateForTest(16, {});
    const svg = buildSchematicSvg(getToothDisplayState);
    for (const ch of ["m", "d", "v", "l", "o"]) {
      expect(svg).toContain(`data-tooth="16" data-surf="${ch}"`);
    }
    expect(svg).toContain('class="schematic-surf-hit"');
  });

  it("emits no surface hits for a missing tooth", () => {
    __setToothStateForTest(15, { toothSelection: "none" });
    const svg = buildSchematicSvg(getToothDisplayState);
    expect(svg).not.toContain('data-tooth="15" data-surf=');
  });
});
