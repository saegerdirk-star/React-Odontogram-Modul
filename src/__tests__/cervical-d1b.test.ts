// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026

/**
 * Bead odontogram-d1b — cervical fillings and caries on all four sides, and a
 * cervical finding whose side the source does not record.
 *
 * Charly (pvs-adapter-charly PR #117): of 621 cervical fillings 134 sit mesial
 * or distal and 257 have no proven side. Dirk's rule: "im Befund nichts
 * behaupten, was wir nicht genau wissen" — so the unknown side is an open
 * finding, never drawn on a surface and never counted as one.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { PAYLOAD_VERSION } from "../document";
import { buildDentalCoreBundle, parseDentalCoreBundle, UnsupportedDentalCoreContentError } from "../fhir";
import type { OdontogramExportPayload } from "../fhir/types";
import {
  __resetChartStateForTest, __setToothStateForTest, __getToothStateForTest,
  getCervicalSurfaces, setCervicalInvolvement, getCervicalSideUnknown, setCervicalSideUnknown,
  getFillingSurfaceCount, getToothStateSummary, getToothDisplayState, getStatusChart,
} from "../odontogram";
import { buildSchematicSvg, laneTokens } from "../schematicGraphic";

const options = { subject: "Patient/example", effectiveDateTime: "2026-10-03T09:00:00Z" };
const filling = (surfaces: string[], material = "composite") => ({
  fillingSurfaces: surfaces,
  fillingSurfaceMaterials: Object.fromEntries(surfaces.map((x) => [x, material])),
});

beforeEach(() => { __resetChartStateForTest(); });

describe("cervical involvement on all four sides", () => {
  it("takes mesial and distal now (charly mz/dz), still never occlusal", () => {
    __setToothStateForTest(16, filling(["mesial", "distal", "occlusal"]));
    setCervicalInvolvement(16, "mesial", true);
    setCervicalInvolvement(16, "distal", true);
    setCervicalInvolvement(16, "occlusal", true);
    expect(getCervicalSurfaces(16)).toEqual(["mesial", "distal"]);
  });

  it("is still a marker, not a surface: the surface count does not move", () => {
    __setToothStateForTest(16, { ...filling(["mesial"]), cervicalSurfaces: ["mesial"] });
    expect(getFillingSurfaceCount(16)).toBe(1);
  });

  it("survives a hand-written payload with mesial/distal", () => {
    __setToothStateForTest(26, { ...filling(["distal"], "amalgam"), cervicalSurfaces: ["distal", "occlusal"] });
    expect(__getToothStateForTest(26)?.cervicalSurfaces).toEqual(["distal"]);
  });
});

describe("cervical, side not documented", () => {
  it("is set and cleared per kind on a present tooth", () => {
    setCervicalSideUnknown(36, "filling", true);
    setCervicalSideUnknown(36, "caries", true);
    expect(getCervicalSideUnknown(36)).toEqual(["filling", "caries"]);
    setCervicalSideUnknown(36, "caries", false);
    expect(getCervicalSideUnknown(36)).toEqual(["filling"]);
  });

  it("is refused where there is no tooth to have a neck", () => {
    __setToothStateForTest(36, { toothSelection: "implant" });
    setCervicalSideUnknown(36, "filling", true);
    __setToothStateForTest(37, { toothSelection: "none" });
    setCervicalSideUnknown(37, "filling", true);
    expect(getCervicalSideUnknown(36)).toEqual([]);
    expect(getCervicalSideUnknown(37)).toEqual([]);
  });

  it("never counts as a surface and never claims one", () => {
    __setToothStateForTest(36, { cervicalSideUnknown: ["filling"] });
    expect(getFillingSurfaceCount(36)).toBe(0);
    expect(getCervicalSurfaces(36)).toEqual([]);
  });

  it("says so in the tooltip", () => {
    __setToothStateForTest(36, { cervicalSideUnknown: ["filling", "caries"] });
    expect(getToothStateSummary(36).join(" | ")).toMatch(/Cervical, side not documented \(filling, caries\)/);
  });

  it("is omitted from the document when empty, kept when set", () => {
    expect(getStatusChart().teeth["36"]?.cervicalSideUnknown).toBeUndefined();
    __setToothStateForTest(36, { cervicalSideUnknown: ["caries", "bogus"] });
    expect(getStatusChart().teeth["36"]?.cervicalSideUnknown).toEqual(["caries"]);
    expect(PAYLOAD_VERSION).toBe("2.48");
  });
});

describe("schematic view", () => {
  it("draws a cervical band only on a surface that carries the finding", () => {
    __setToothStateForTest(16, { ...filling(["mesial", "buccal"]), cervicalSurfaces: ["buccal"] });
    __setToothStateForTest(15, { caries: ["caries-mesial"], cervicalSurfaces: ["mesial"] });
    const svg = buildSchematicSvg(getToothDisplayState);
    const bands = svg.match(/class="schem-cervical" data-surf="[a-z]+"/g) ?? [];
    // 16's mesial filling has no marker, so it gets no band
    expect(bands.map((b) => b.slice(-8)).sort()).toEqual(['"buccal"', '"mesial"']);
  });

  it("colours NO zone for an unknown side — it only appears in the shorthand lane", () => {
    __setToothStateForTest(36, { cervicalSideUnknown: ["filling"] });
    const svg = buildSchematicSvg(getToothDisplayState);
    expect(svg).not.toContain("schem-cervical");
    expect(laneTokens(36, getToothDisplayState(36))[0].map((t) => t.t)).toEqual(["z?"]);
  });

  it("writes charly's suffix after the surface in the lane", () => {
    __setToothStateForTest(16, { ...filling(["mesial", "occlusal", "buccal"]), cervicalSurfaces: ["buccal"] });
    __setToothStateForTest(15, { caries: ["caries-mesial"], cervicalSurfaces: ["mesial"] });
    expect(laneTokens(16, getToothDisplayState(16))[0][0].t).toBe("K movz");
    expect(laneTokens(15, getToothDisplayState(15))[0][0].t).toBe("c mz");
  });
});

describe("Dental Core", () => {
  it("round-trips a mesial and a distal marker (the decoder used to reject the bundle)", () => {
    const source: OdontogramExportPayload = {
      version: PAYLOAD_VERSION, globals: {},
      teeth: { "16": { ...filling(["mesial", "distal"]), cervicalSurfaces: ["mesial", "distal"] } },
    };
    expect(parseDentalCoreBundle(buildDentalCoreBundle(source, options))).toMatchObject(source);
  });

  it("refuses an unknown side explicitly rather than dropping it (no carrier before fdc-w9z)", () => {
    const source: OdontogramExportPayload = {
      version: PAYLOAD_VERSION, globals: {},
      teeth: { "36": { cervicalSideUnknown: ["filling"] } },
    };
    expect(() => buildDentalCoreBundle(source, options)).toThrow(UnsupportedDentalCoreContentError);
  });
});
