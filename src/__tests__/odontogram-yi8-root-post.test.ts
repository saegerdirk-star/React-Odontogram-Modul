import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PAYLOAD_VERSION } from "../document";
import { buildDentalCoreBundle, parseDentalCoreBundle } from "../fhir";
import type { OdontogramExportPayload, ToothRecord } from "../fhir/types";
import {
  __collectExportPayloadForTest,
  __getToothStateForTest,
  __hydrateImportedChartsForTest,
  __renderActiveLayers,
  __resetChartStateForTest,
  __setToothStateForTest,
  getToothDisplayState,
} from "../odontogram";
import { buildSchematicSvg } from "../schematicGraphic";

const options = {
  dialect: "dental-core" as const,
  subject: "Patient/example",
  effectiveDateTime: "2026-09-01T00:00:00Z",
};
const testFileUrl = import.meta.url;
const svgText = readFileSync(
  fileURLToPath(new URL("../assets/teeth-svgs/11.svg", testFileUrl)),
  "utf8",
);

describe("Dental Core 0.6 odontogram axes", () => {
  it("roundtrips sensibility, percussion, eruption stage, and oriented root fracture while omitting skip values", () => {
    const source: OdontogramExportPayload = {
      version: PAYLOAD_VERSION,
      globals: {},
      teeth: {
        "11": {
          sensibility: "questionable",
          percussion: "negative",
          eruptionStage: "half-crown",
          rootFracture: "horizontal",
        },
        "12": {
          sensibility: "none",
          percussion: "none",
          eruptionStage: "none",
          rootFracture: "none",
        },
      },
    };

    const bundle = buildDentalCoreBundle(source, options);
    const chartComponents = bundle.entry
      ?.filter((entry) => entry.resource?.resourceType === "Observation")
      .flatMap((entry) => (entry.resource as import("fhir/r4").Observation).component ?? []) ?? [];
    const propertyCodes = chartComponents.flatMap((component) =>
      component.code.coding?.map((coding) => coding.code) ?? [],
    );

    expect(propertyCodes).toEqual(expect.arrayContaining([
      "pulp-sensibility-test",
      "percussion-test",
      "tooth-eruption-stage",
      "root-fracture",
    ]));
    expect(propertyCodes.filter((code) => [
      "pulp-sensibility-test",
      "percussion-test",
      "tooth-eruption-stage",
      "root-fracture",
    ].includes(code ?? ""))).toHaveLength(4);
    expect(parseDentalCoreBundle(bundle)?.teeth["11"]).toEqual(source.teeth["11"]);
    expect(parseDentalCoreBundle(bundle)?.teeth["12"]).toBeUndefined();
  });

  it.each(["glass-fiber", "metal"])(
    "keeps an incomplete root filling and a %s post independent through FHIR",
    (rootPostType) => {
      __resetChartStateForTest();
      const tooth: ToothRecord = {
        endo: "endo-filling-incomplete",
        rootPostType,
      };
      __setToothStateForTest(11, { ...tooth });
      const source = __collectExportPayloadForTest();

      expect(source.teeth["11"]).toMatchObject(tooth);
      __hydrateImportedChartsForTest(JSON.parse(JSON.stringify(source)));
      expect(getToothDisplayState(11)).toMatchObject(tooth);

      const activeIds = __renderActiveLayers(svgText, 11, getToothDisplayState(11)).map((layer) => layer.id);
      expect(activeIds).toContain("endo-filling-incomplete");
      expect(activeIds).toContain(rootPostType === "glass-fiber" ? "endo-glass-pin" : "endo-metal-pin");
      const schematic = buildSchematicSvg(getToothDisplayState);
      expect(schematic).toContain("#d98f4a");
      expect(schematic).toContain("#8a9096");

      const parsed = parseDentalCoreBundle(buildDentalCoreBundle(source, options));

      expect(parsed?.teeth["11"]).toMatchObject(tooth);
    },
  );
});

describe("orthogonal root-post document and render model", () => {
  it.each([
    ["endo-glass-pin", "glass-fiber"],
    ["endo-metal-pin", "metal"],
  ])("migrates legacy %s documents and Dental Core content without writing the legacy enum again", (legacyEndo, rootPostType) => {
    __resetChartStateForTest();
    __setToothStateForTest(11, { endo: legacyEndo }, "2.44");

    expect(__getToothStateForTest(11)).toMatchObject({
      endo: "endo-filling",
      rootPostType,
    });
    expect(__collectExportPayloadForTest().teeth["11"]).toMatchObject({
      endo: "endo-filling",
      rootPostType,
    });
    expect(__collectExportPayloadForTest().teeth["11"].endo).not.toBe(legacyEndo);

    const legacySource: OdontogramExportPayload = {
      version: "2.44",
      globals: {},
      teeth: { "11": { endo: legacyEndo } },
    };
    const normalizedBundle = buildDentalCoreBundle(legacySource, options);
    expect(parseDentalCoreBundle(normalizedBundle)?.teeth["11"]).toMatchObject({
      endo: "endo-filling",
      rootPostType,
    });

    const legacyBundle = buildDentalCoreBundle({
      version: "2.44",
      globals: {},
      teeth: { "11": { endo: "endo-filling" } },
    }, options);
    const toothState = legacyBundle.entry?.find((entry) =>
      entry.resource?.resourceType === "Observation"
      && (entry.resource as import("fhir/r4").Observation).component?.some((component) =>
        component.code.coding?.some((coding) => coding.code === "root-endodontic-state")));
    const endoComponent = (toothState?.resource as import("fhir/r4").Observation | undefined)?.component?.find((component) =>
      component.code.coding?.some((coding) => coding.code === "root-endodontic-state"));
    const endoCoding = endoComponent?.valueCodeableConcept?.coding?.[0];
    expect(endoCoding).toBeDefined();
    endoCoding!.code = legacyEndo;
    expect(parseDentalCoreBundle(legacyBundle)?.teeth["11"]).toMatchObject({
      endo: "endo-filling",
      rootPostType,
    });
  });

  it.each([
    ["glass-fiber", "endo-glass-pin"],
    ["metal", "endo-metal-pin"],
  ])("renders an incomplete filling together with the %s post layer", (rootPostType, postLayer) => {
    const activeIds = __renderActiveLayers(svgText, 11, {
      endo: "endo-filling-incomplete",
      rootPostType,
    }).map((layer) => layer.id);

    expect(activeIds).toContain("endo-filling-incomplete");
    expect(activeIds).toContain(postLayer);
    expect(activeIds).not.toContain("endo-filling");
  });
});
