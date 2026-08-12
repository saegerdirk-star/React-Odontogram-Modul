// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Bead odontogram-3l1 / AC1: existing standalone consumers and existing
// serialized odontogram payloads keep working through the current public entry
// points, with no required migration. Characterizes the pre-change public
// surface so the singleton extraction and the canonical FHIR dialect cannot
// silently move it.

import { describe, it, expect, beforeEach } from "vitest";
import * as publicApi from "../index";
import { buildFhirBundle } from "../fhir/toFhir";
import { parseFhirBundle } from "../fhir/fromFhir";
import fhirGolden from "./parity/fhir-golden.json";
import { payloadCases } from "./parity/matrix";
import {
  __resetChartStateForTest,
  __hydrateImportedChartsForTest,
  __collectExportPayloadForTest,
} from "../odontogram";

/** Every name the package exported before bead odontogram-3l1. A removal or
 *  rename here is a breaking change for the DentalQuoteCreator submodule
 *  integration and for any standalone consumer. */
const PRE_EXISTING_EXPORTS = [
  "default", "OdontogramShell", "PerioChart", "startIntroTour",
  "clearSelection", "setOcclusalVisible", "setWisdomVisible", "setShowBase",
  "setHealthyPulpVisible", "registerPlugins", "setPluginState", "getPluginState",
  "getToothStateSummary", "getOdontogramSummary", "formatToothLabel", "onStateChange",
  "setReadOnly", "getReadOnly", "setNotesEnabled", "getNotesEnabled",
  "setIcdasEnabled", "getIcdasEnabled", "setPulpDetailLevel", "getPulpDetailLevel",
  "setSecondaryCariesMode", "getSecondaryCariesMode", "setRootCariesMode", "getRootCariesMode",
  "setRadiographicDepthMode", "getRadiographicDepthMode", "setCariesDepthEnabled",
  "getCariesDepthEnabled", "setWearDetailLevel", "getWearDetailLevel",
  "setDiscolorationDetailLevel", "getDiscolorationDetailLevel",
  "setSurfaceNotation", "getSurfaceNotation", "exportFhir", "exportImage", "exportSvg",
  "setImportFormat", "getPerioViewMode", "setPerioViewMode",
  "getPerioRowVisibility", "setPerioRowVisibility",
  "getPerioIndexNameMode", "setPerioIndexNameMode",
  "isDualStateConfirmPending", "acceptDualStateConfirm", "cancelDualStateConfirm",
  "initOdontogram", "destroyOdontogram", "setNumberingSystem",
  "getChartMode", "setChartMode", "getStatusChart", "getPlanChart", "setPlanChart",
  "getPlanChanges", "openPerioOverlay", "closePerioOverlay", "isPerioOverlayOpen",
  "hasAnyPerioData", "exportStatus", "importStatus", "exportPdf",
  "exportPerioImage", "exportPerioSvg",
];

describe("odontogram-3l1 AC1: public entry points are preserved", () => {
  it("keeps every pre-existing named export", () => {
    for (const name of PRE_EXISTING_EXPORTS) {
      expect(publicApi, `missing public export: ${name}`).toHaveProperty(name);
    }
  });

  it("adds the controlled-integration surface additively", () => {
    for (const name of [
      "createOdontogramSession",
      "getDefaultOdontogramSession",
      "getActiveOdontogramSession",
      "buildFhirBundle",
      "parseFhirBundle",
      "buildDentalDeBundle",
    ]) {
      expect(publicApi, `missing new public export: ${name}`).toHaveProperty(name);
    }
  });
});

describe("odontogram-3l1 AC1: serialized payloads keep working", () => {
  beforeEach(() => {
    __resetChartStateForTest();
  });

  it("hydrates a legacy 1.4 payload without migration", () => {
    __hydrateImportedChartsForTest({
      version: "1.4",
      globals: {},
      teeth: { "46": { toothSelection: "tooth-base", caries: ["caries-occlusal"] } },
    });
    const out = __collectExportPayloadForTest();
    expect(out.teeth["46"].caries).toEqual(["caries-occlusal"]);
  });

  it("round-trips the current payload version through the default FHIR dialect", () => {
    const payload = {
      version: "2.20",
      globals: {},
      teeth: { "46": { toothSelection: "tooth-base", restorationType: "crown", restorationMaterial: "zircon" } },
    };
    const back = parseFhirBundle(buildFhirBundle(payload));
    expect(back.teeth["46"].restorationType).toBe("crown");
    expect(back.teeth["46"].restorationMaterial).toBe("zircon");
  });

  it("keeps the frozen legacy FHIR golden byte-identical", () => {
    const produced = payloadCases().map((p) => ({ name: p.name, bundle: buildFhirBundle(p.payload as never) }));
    expect(JSON.stringify(produced)).toBe(JSON.stringify(fhirGolden));
  });
});
