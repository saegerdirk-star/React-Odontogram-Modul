import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { buildFhirBundle, DentalCoreBundleRejectedError, parseFhirBundle } from "../fhir";
import {
  CHART_MAPPINGS,
  DENTAL_CORE,
  DENTAL_CORE_BUNDLE_IDENTIFIER,
  DENTAL_CORE_PROFILES,
  PROPERTY_SYSTEM,
  VALUE_SYSTEM,
} from "../fhir/dentalCoreContract";
import {
  DENTAL_CORE_CODE_SYSTEM_CODES,
  DENTAL_CORE_CODE_SYSTEM_URLS,
  DENTAL_CORE_PACKAGE_NAME,
  DENTAL_CORE_PACKAGE_SHA512,
  DENTAL_CORE_PACKAGE_VERSION,
  DENTAL_CORE_PROFILE_URLS,
} from "../fhir/generated/dental-core-contract";
import type { OdontogramExportPayload } from "../fhir/types";
import { __resetChartStateForTest, __setToothStateForTest, getStatusChart, importFhirBundle } from "../odontogram";

const options = { subject: "Patient/example", effectiveDateTime: "2026-08-14T17:00:31Z" };
const testFileUrl = import.meta.url;

function fixture(): OdontogramExportPayload {
  return {
    version: "2.25",
    globals: {},
    teeth: {
      "16": {
        endoResection: true,
        mods: ["inflammation", "mobility"],
        periapicalType: "cyst",
        fissureSealing: true,
        wearEdge: "attrition",
        discoloration: "fluorosis",
        orthoAppliance: "bracket",
        orthoRotation: true,
        parapulpalPin: true,
        retention: "attachment",
        retentionSide: "both",
      },
    },
    plan: { "16": { rootConcavity: "deep" } },
    case: { cigarettesPerDay: 12, toothLossPerio: 2, maxRblPercent: 24, diagnosisOverride: "periodontitis" },
  };
}

describe("generated Dental Core contract", () => {
  it("pins the immutable published package and exposes its profiles and terminology", () => {
    expect(DENTAL_CORE_PACKAGE_NAME).toBe("de.cognovis.fhir.dental.core");
    expect(DENTAL_CORE_PACKAGE_VERSION).toBe("0.3.0");
    expect(DENTAL_CORE_PACKAGE_SHA512).toHaveLength(128);
    expect(DENTAL_CORE_PROFILE_URLS["dental-chart-state"]).toBe(`${DENTAL_CORE}/StructureDefinition/dental-chart-state`);
    expect(DENTAL_CORE_CODE_SYSTEM_URLS["dental-chart-property"]).toBe(PROPERTY_SYSTEM);
    expect(DENTAL_CORE_CODE_SYSTEM_URLS["dental-chart-value"]).toBe(VALUE_SYSTEM);
    expect(DENTAL_CORE_CODE_SYSTEM_CODES["tooth-position-fdi"]).toContain("16");
    for (const mapping of CHART_MAPPINGS) {
      expect(DENTAL_CORE_CODE_SYSTEM_CODES["dental-chart-property"]).toContain(mapping.property);
      for (const value of Object.values(mapping.values ?? {})) {
        expect(DENTAL_CORE_CODE_SYSTEM_CODES["dental-chart-value"]).toContain(value);
      }
    }
  });

  it("keeps the generated metadata free of copied terminology displays and definitions", () => {
    const contract = readFileSync(fileURLToPath(new URL("../fhir/generated/dental-core-contract.ts", testFileUrl)), "utf8");
    expect(contract).not.toMatch(/\"display\"|\"definition\"|\"designation\"/);
  });
});

describe("Dental Core-only FHIR API", () => {
  it("uses Dental Core by default and roundtrips every emitted companion resource", () => {
    const source = fixture();
    const bundle = buildFhirBundle(source, options);

    expect(bundle.identifier).toEqual({ system: DENTAL_CORE, value: DENTAL_CORE_BUNDLE_IDENTIFIER });
    expect(bundle.entry?.map((entry) => entry.resource?.meta?.profile?.[0]).filter(Boolean)).toEqual(expect.arrayContaining([
      DENTAL_CORE_PROFILES["dental-chart-state"],
      DENTAL_CORE_PROFILES["dental-procedure"],
      DENTAL_CORE_PROFILES["dental-device"],
      DENTAL_CORE_PROFILES["dental-finding"],
      DENTAL_CORE_PROFILES["dental-risk-evidence"],
      DENTAL_CORE_PROFILES["dental-service-request"],
      DENTAL_CORE_PROFILES["dental-clinical-provenance"],
    ]));
    expect(parseFhirBundle(bundle)).toMatchObject(source);
  });

  it("preserves explicit false and mapped defaults without inventing omitted state", () => {
    const source: OdontogramExportPayload = {
      version: "2.25",
      globals: {},
      teeth: { "16": { endoResection: false, periapicalType: "none", retention: "none" } },
    };

    const parsed = parseFhirBundle(buildFhirBundle(source, options));
    expect(parsed.teeth["16"]).toMatchObject(source.teeth["16"]);
    expect(parsed.teeth["17"]).toBeUndefined();
  });

  it("roundtrips every admitted chart value and every explicit boolean state", () => {
    for (const mapping of CHART_MAPPINGS) {
      const values = mapping.kind === "boolean" ? [true, false] : Object.keys(mapping.values ?? {});
      for (const value of values) {
        const source: OdontogramExportPayload = {
          version: "2.25",
          globals: {},
          teeth: { "16": { [mapping.field]: mapping.kind === "set" ? [value] : value } },
        };
        const parsed = parseFhirBundle(buildFhirBundle(source, options));
        expect(parsed.teeth["16"]?.[mapping.field], `${mapping.field}=${String(value)}`).toEqual(source.teeth["16"]?.[mapping.field]);
      }
    }
  });

  it("accepts empty Core collections and rejects ambiguous Core collections", () => {
    const empty = buildFhirBundle({ version: "2.25", globals: {}, teeth: {} }, options);
    expect(parseFhirBundle(empty)).toEqual({ version: "2.25", globals: {}, teeth: {} });

    const invalidType = structuredClone(buildFhirBundle(fixture(), options));
    invalidType.type = "transaction";
    const duplicateChart = structuredClone(buildFhirBundle(fixture(), options));
    const chart = duplicateChart.entry?.find((entry) => entry.resource?.meta?.profile?.includes(DENTAL_CORE_PROFILES["dental-chart-state"]))?.resource;
    if (chart) duplicateChart.entry?.push({ resource: { ...chart, id: "another-chart-for-the-same-tooth" } });
    const contradictory = structuredClone(buildFhirBundle(fixture(), options));
    const chartWithProcedure = contradictory.entry?.find((entry) => entry.resource?.meta?.profile?.includes(DENTAL_CORE_PROFILES["dental-chart-state"]))?.resource as import("fhir/r4").Observation | undefined;
    const endoProperty = CHART_MAPPINGS.find((mapping) => mapping.field === "endoResection")?.property;
    const component = chartWithProcedure?.component?.find((entry) => entry.code.coding?.[0]?.code === endoProperty);
    if (component) {
      delete component.valueCodeableConcept;
      component.valueBoolean = false;
    }

    for (const candidate of [invalidType, duplicateChart, contradictory]) {
      expect(() => parseFhirBundle(candidate)).toThrow(DentalCoreBundleRejectedError);
    }
  });

  it("keeps treatment-plan claims independent from the current chart", () => {
    const source: OdontogramExportPayload = {
      version: "2.25",
      globals: {},
      teeth: { "16": { retention: "clasp" } },
      plan: { "16": { retention: "attachment" } },
    };

    expect(parseFhirBundle(buildFhirBundle(source, options))).toMatchObject(source);
  });

  it("requires a truthful effective date for clinical content", () => {
    expect(() => buildFhirBundle(fixture())).toThrow("Dental Core export requires an effective date");
  });

  it("rejects malformed, duplicate, unsupported, and foreign-dialect bundles", () => {
    const valid = buildFhirBundle(fixture(), options);
    const duplicate = structuredClone(valid);
    duplicate.entry?.push(structuredClone(duplicate.entry?.[0]));
    const unsupported = structuredClone(valid);
    unsupported.entry?.push({ resource: { resourceType: "MedicationRequest", id: "unsupported", status: "active", intent: "order" } as never });
    const wrongCoding = structuredClone(valid);
    const chart = wrongCoding.entry?.find((entry) => entry.resource?.meta?.profile?.includes(DENTAL_CORE_PROFILES["dental-chart-state"]))?.resource as import("fhir/r4").Observation | undefined;
    if (chart?.component?.[0]?.code.coding?.[0]) chart.component[0].code.coding[0].code = "not-admitted";
    const foreign = { resourceType: "Bundle", identifier: { system: "https://fhir.cognovis.de/dental", value: "legacy" }, entry: [] };

    for (const candidate of [duplicate, unsupported, wrongCoding, foreign]) {
      expect(() => parseFhirBundle(candidate)).toThrow(DentalCoreBundleRejectedError);
    }
  });

  it("rejects a plan whose CarePlan activity does not resolve to a generated request", () => {
    const invalid = structuredClone(buildFhirBundle(fixture(), options));
    const plan = invalid.entry?.find((entry) => entry.resource?.resourceType === "CarePlan")?.resource as import("fhir/r4").CarePlan | undefined;
    if (plan) plan.activity = [{ reference: { reference: "ServiceRequest/not-generated" } }];

    expect(() => parseFhirBundle(invalid)).toThrow(DentalCoreBundleRejectedError);
  });

  it("does not replace the chart after a rejected import", () => {
    __resetChartStateForTest();
    __setToothStateForTest(16, { endoResection: true });
    const before = getStatusChart();
    const rejected = buildFhirBundle(fixture(), options);
    rejected.entry?.push({ resource: { resourceType: "MedicationRequest", id: "unsupported", status: "active", intent: "order" } as never });
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(importFhirBundle(rejected)).toBe(false);
    expect(getStatusChart()).toEqual(before);
    expect(error).toHaveBeenCalledWith(expect.stringMatching(/rejected Dental Core bundle/i));
    error.mockRestore();
  });
});
