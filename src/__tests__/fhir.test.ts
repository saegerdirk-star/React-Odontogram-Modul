import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { buildFhirBundle, DentalCoreBundleRejectedError, parseFhirBundle, UnsupportedDentalCoreContentError } from "../fhir";
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
import type { FhirDialect, OdontogramExportPayload } from "../fhir/types";
import { createOdontogramSession } from "../index";
import { __resetChartStateForTest, __setToothStateForTest, getStatusChart, importFhirBundle } from "../odontogram";

const options = { subject: "Patient/example", effectiveDateTime: "2026-08-14T17:00:31Z", dialect: "dental-core" as const };
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

describe("configured FHIR codecs", () => {
  it("uses an explicit Dental Core codec and roundtrips every emitted companion resource", () => {
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
    expect(parseFhirBundle(bundle, { dialect: "dental-core" })).toMatchObject(source);
  });

  it("preserves explicit false and mapped defaults without inventing omitted state", () => {
    const source: OdontogramExportPayload = {
      version: "2.25",
      globals: {},
      teeth: { "16": { endoResection: false, periapicalType: "none", retention: "none" } },
    };

    const parsed = parseFhirBundle(buildFhirBundle(source, options), { dialect: "dental-core" });
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
        const parsed = parseFhirBundle(buildFhirBundle(source, options), { dialect: "dental-core" });
        expect(parsed.teeth["16"]?.[mapping.field], `${mapping.field}=${String(value)}`).toEqual(source.teeth["16"]?.[mapping.field]);
      }
    }
  });

  it("accepts empty Core collections and rejects ambiguous Core collections", () => {
    const empty = buildFhirBundle({ version: "2.25", globals: {}, teeth: {} }, options);
    expect(parseFhirBundle(empty, { dialect: "dental-core" })).toEqual({ version: "2.25", globals: {}, teeth: {} });

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
      expect(() => parseFhirBundle(candidate, { dialect: "dental-core" })).toThrow(DentalCoreBundleRejectedError);
    }
  });

  it("keeps treatment-plan claims independent from the current chart", () => {
    const source: OdontogramExportPayload = {
      version: "2.25",
      globals: {},
      teeth: { "16": { retention: "clasp" } },
      plan: { "16": { retention: "attachment" } },
    };

    expect(parseFhirBundle(buildFhirBundle(source, options), { dialect: "dental-core" })).toMatchObject(source);
  });

  it("requires a truthful effective date for clinical content", () => {
    expect(() => buildFhirBundle(fixture(), { dialect: "dental-core" })).toThrow("Dental Core export requires an effective date");
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
    const foreign = { resourceType: "Bundle", identifier: { system: DENTAL_CORE, value: "odontogram-dental-core-unsupported" }, entry: [] };

    for (const candidate of [duplicate, unsupported, wrongCoding, foreign]) {
      expect(() => parseFhirBundle(candidate, { dialect: "dental-core" })).toThrow(DentalCoreBundleRejectedError);
    }
  });

  it("rejects a plan whose CarePlan activity does not resolve to a generated request", () => {
    const invalid = structuredClone(buildFhirBundle(fixture(), options));
    const plan = invalid.entry?.find((entry) => entry.resource?.resourceType === "CarePlan")?.resource as import("fhir/r4").CarePlan | undefined;
    if (plan) plan.activity = [{ reference: { reference: "ServiceRequest/not-generated" } }];

    expect(() => parseFhirBundle(invalid, { dialect: "dental-core" })).toThrow(DentalCoreBundleRejectedError);
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

  it("accepts an Aidbox-style collection that retains admitted profiles but replaces the bundle identifier", () => {
    const aidboxBundle = structuredClone(buildFhirBundle(fixture(), options));
    aidboxBundle.identifier = { system: "https://example.test/bundles", value: "aidbox-assembled" };
    const chart = aidboxBundle.entry?.find((entry) => entry.resource?.meta?.profile?.includes(DENTAL_CORE_PROFILES["dental-chart-state"]))?.resource;
    chart?.meta?.profile?.push("http://hl7.org/fhir/StructureDefinition/Observation");

    expect(parseFhirBundle(aidboxBundle, { dialect: "dental-core" })).toMatchObject({
      teeth: fixture().teeth,
      plan: fixture().plan,
      examination: { subject: options.subject, effectiveDateTime: options.effectiveDateTime },
    });
  });

  it("drives the Mira-style Aidbox Bundle through a Dental Core session and back to export", () => {
    const aidboxBundle = structuredClone(buildFhirBundle(fixture(), options));
    aidboxBundle.identifier = { system: "https://example.test/bundles", value: "aidbox-assembled" };
    const chart = aidboxBundle.entry?.find((entry) => entry.resource?.meta?.profile?.includes(DENTAL_CORE_PROFILES["dental-chart-state"]))?.resource;
    chart?.meta?.profile?.push("http://hl7.org/fhir/StructureDefinition/Observation");
    const session = createOdontogramSession(undefined, {
      fhir: { dialect: "dental-core", exportOptions: { subject: options.subject, effectiveDateTime: options.effectiveDateTime } },
    });

    expect(session.importFhirBundle(aidboxBundle)).toBe(true);
    expect(session.getDocument()).toMatchObject({
      teeth: fixture().teeth,
      plan: fixture().plan,
      case: fixture().case,
      examination: { subject: options.subject, effectiveDateTime: options.effectiveDateTime },
    });

    const exported = session.exportFhirBundle();
    expect(exported.identifier).toEqual({ system: DENTAL_CORE, value: DENTAL_CORE_BUNDLE_IDENTIFIER });
    expect(exported.entry?.map((entry) => (entry.resource as { subject?: { reference?: string } } | undefined)?.subject?.reference).filter(Boolean)).toEqual(
      expect.arrayContaining([options.subject]),
    );
    expect(exported.entry?.map((entry) => (entry.resource as { effectiveDateTime?: string } | undefined)?.effectiveDateTime).filter(Boolean)).toEqual(
      expect.arrayContaining([options.effectiveDateTime]),
    );
  });

  it("fails closed instead of silently dropping unsupported populated Core state", () => {
    const unsupported: OdontogramExportPayload = {
      version: "2.25",
      globals: {},
      teeth: { "16": { pulpDx: "necrosis" } },
    };

    expect(() => buildFhirBundle(unsupported, options)).toThrow(UnsupportedDentalCoreContentError);
    expect(() => buildFhirBundle({
      version: "2.25",
      globals: {},
      teeth: { "16": { toothSelection: "none" } },
    }, options)).toThrow("teeth.16.toothSelection");
  });

  it("publishes exactly the two supported dialect values", () => {
    expectTypeOf<FhirDialect>().toEqualTypeOf<"legacy" | "dental-core">();
  });
});

describe("configured FHIR sessions", () => {
  it("keeps the selected codec immutable and makes a rejected Core import non-destructive", () => {
    const source: OdontogramExportPayload = {
      version: "2.25",
      globals: {},
      teeth: { "16": { retention: "attachment", endoResection: true } },
      plan: { "16": { retention: "clasp" } },
      examination: { effectiveDateTime: "2026-08-14T17:00:31Z" },
    };
    const legacy = createOdontogramSession(source, { fhir: { dialect: "legacy" } });
    const dentalCore = createOdontogramSession(source, {
      fhir: {
        dialect: "dental-core",
        exportOptions: { subject: "Patient/mira", effectiveDateTime: "2026-08-14T17:00:31Z" },
      },
    });

    const legacyBundle = legacy.exportFhirBundle();
    const coreBundle = dentalCore.exportFhirBundle();

    expect(legacy.fhir.dialect).toBe("legacy");
    expect(dentalCore.fhir.dialect).toBe("dental-core");
    expect(legacy.importFhirBundle(legacyBundle)).toBe(true);
    expect(legacy.getDocument().teeth["16"]?.retention).toBeUndefined();
    expect(coreBundle.identifier).toEqual({ system: DENTAL_CORE, value: DENTAL_CORE_BUNDLE_IDENTIFIER });
    expect(dentalCore.importFhirBundle(coreBundle)).toBe(true);
    expect(dentalCore.getDocument()).toMatchObject({
      version: source.version,
      globals: source.globals,
      teeth: source.teeth,
      plan: source.plan,
    });
    const beforeRejectedImport = dentalCore.getDocument();
    expect(dentalCore.importFhirBundle(legacyBundle)).toBe(false);
    expect(dentalCore.getDocument()).toEqual(beforeRejectedImport);
  });

  it("rejects malformed Legacy input and admitted Core content without replacing the Legacy document", () => {
    const legacy = createOdontogramSession({ version: "2.25", globals: {}, teeth: { "16": { endoResection: true } } }, { fhir: { dialect: "legacy" } });
    const before = legacy.getDocument();
    const coreWithoutMarker = structuredClone(buildFhirBundle(fixture(), options));
    coreWithoutMarker.identifier = { system: "https://example.test/bundles", value: "assembled" };

    expect(legacy.importFhirBundle({ arbitrary: true })).toBe(false);
    expect(legacy.getDocument()).toEqual(before);
    expect(legacy.importFhirBundle({ resourceType: "Bundle", type: "collection", entry: [{ resource: { resourceType: "Patient", id: "unrelated" } }] })).toBe(false);
    expect(legacy.getDocument()).toEqual(before);
    expect(legacy.importFhirBundle(coreWithoutMarker)).toBe(false);
    expect(legacy.getDocument()).toEqual(before);
  });

  it("rejects a runtime dialect outside the public union at session construction", () => {
    expect(() => createOdontogramSession(undefined, { fhir: { dialect: "not-a-dialect" as FhirDialect } })).toThrow("Unsupported FHIR dialect");
  });

  it("keeps the upstream Legacy semantic roundtrip independent of newer Core-only state", () => {
    const source: OdontogramExportPayload = {
      version: "2.25",
      globals: {},
      teeth: { "16": { endoResection: true, fissureSealing: true, mods: ["mobility"] } },
    };
    const session = createOdontogramSession(source, { fhir: { dialect: "legacy" } });

    expect(session.importFhirBundle(session.exportFhirBundle())).toBe(true);
    expect(session.getDocument().teeth["16"]).toMatchObject(source.teeth["16"]);
  });
});
