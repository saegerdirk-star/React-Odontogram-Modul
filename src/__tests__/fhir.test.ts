import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  buildDentalCoreBundle,
  buildFhirBundle,
  DENTAL_CORE_CANONICAL,
  DENTAL_CORE_CODE_SYSTEM_URLS as PUBLIC_DENTAL_CORE_CODE_SYSTEM_URLS,
  DENTAL_CORE_PACKAGE_VERSION as PUBLIC_DENTAL_CORE_PACKAGE_VERSION,
  DENTAL_CORE_PROFILES as PUBLIC_DENTAL_CORE_PROFILES,
  DentalCoreBundleRejectedError,
  parseDentalCoreBundle,
  parseFhirBundle,
  UnsupportedDentalCoreContentError,
} from "../fhir";
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
import { __importStatusForTest, __resetChartStateForTest, __setToothStateForTest, getStatusChart, importFhirBundle } from "../odontogram";

const options = { subject: "Patient/example", effectiveDateTime: "2026-08-14T17:00:31Z", dialect: "dental-core" as const };
const testFileUrl = import.meta.url;

function fixture(): OdontogramExportPayload {
  return {
    version: "2.26",
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

function clinicalFixture(): OdontogramExportPayload {
  return {
    version: "2.26",
    globals: { wisdomVisible: true, showBase: true, occlusalVisible: true, showHealthyPulp: true },
    teeth: {
      "16": {
        caries: ["caries-occlusal", "caries-mesial"],
        cariesSeverity: { occlusal: 5, mesial: 2 },
        rootCaries: "active",
        fillingSurfaces: ["distal", "buccal"],
        fillingSurfaceMaterials: { distal: "composite", buccal: "gic" },
        pulpDx: "necrosis",
        apicalDx: "acute-apical-abscess",
        radiographicDepth: { distal: "D2" },
        cervicalSurfaces: ["buccal"],
        assessment: { pulp: "assessed" },
        note: "Monitor distal restoration",
      },
      "15": {
        toothSelection: "implant",
        periImplant: "peri-implantitis-moderate",
        mpi: { buccal: 2 },
        mbi: { mesial: 3 },
        millerClass: "ii",
        implantProduct: {
          manufacturer: "Example Implants",
          system: "Example Line",
          diameterMm: 4.1,
          lengthMm: 10,
          udi: "(01)07612345678901(17)300630(10)LOT4711",
          deviceIdentifier: "07612345678901",
          lot: "LOT4711",
          serial: "SERIAL-15",
          expiry: "2030-06-30",
        },
      },
      "17": { toothSelection: "none", extractionPlan: true },
      "26": { restorationType: "crown", restorationMaterial: "zircon", crownReplace: true },
      "36": { endo: "endo-filling", crownNeeded: true },
      "46": {
        mobility: "m2",
        perio: { pd: { MB: 5, B: 4 }, gm: { MB: 1, B: 0 }, bop: ["MB"], sup: [] },
      },
    },
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

  it("exports the Dental Core compatibility constants from the public FHIR entry point", () => {
    expect(DENTAL_CORE_CANONICAL).toBe(DENTAL_CORE);
    expect(PUBLIC_DENTAL_CORE_PROFILES).toBe(DENTAL_CORE_PROFILES);
    expect(PUBLIC_DENTAL_CORE_PACKAGE_VERSION).toBe(DENTAL_CORE_PACKAGE_VERSION);
    expect(PUBLIC_DENTAL_CORE_CODE_SYSTEM_URLS).toBe(DENTAL_CORE_CODE_SYSTEM_URLS);
  });

  it("keeps the generated metadata free of copied terminology displays and definitions", () => {
    const contract = readFileSync(fileURLToPath(new URL("../fhir/generated/dental-core-contract.ts", testFileUrl)), "utf8");
    expect(contract).not.toMatch(/"display"|"definition"|"designation"/);
  });
});

describe("configured FHIR codecs", () => {
  it("exports a clinically populated chart through the canonical carrier profiles and roundtrips source values", () => {
    const source = clinicalFixture();
    const bundle = buildDentalCoreBundle(source, options);
    const profiles = bundle.entry?.flatMap((entry) => entry.resource?.meta?.profile ?? []) ?? [];

    expect(profiles).toEqual(expect.arrayContaining([
      DENTAL_CORE_PROFILES["dental-tooth-state"],
      DENTAL_CORE_PROFILES["dental-caries-finding"],
      DENTAL_CORE_PROFILES["dental-periodontal-finding"],
      DENTAL_CORE_PROFILES["dental-implant"],
      DENTAL_CORE_PROFILES["dental-peri-implant-finding"],
      DENTAL_CORE_PROFILES["dental-gingival-recession-assessment"],
    ]));

    const parsed = parseDentalCoreBundle(bundle);
    expect(parsed).toBeDefined();
    expect(parsed?.teeth).toEqual(source.teeth);
  });

  it("uses recorder and case exam date while leaving shared patient resources host-owned", () => {
    const base: OdontogramExportPayload = {
      version: "2.26",
      globals: { edentulous: true },
      teeth: { "16": { endo: "endo-filling" } },
      case: {
        examDate: "2026-08-15",
        diabetesStatus: "none",
        hba1c: 6.4,
        smokingStatus: "former",
      },
      examination: { subject: "Patient/example", recorder: "Practitioner/recorder" },
    };
    const sharedResources = (diabetesStatus: "none" | "present") => ({
      diabetesStatus: { fullUrl: "https://aidbox.example/fhir/Condition/host-diabetes", resource: { resourceType: "Condition" as const, id: "host-diabetes", subject: { reference: "Patient/example" }, code: { coding: [{ system: "https://issuer.example/diagnosis", code: "diabetes" }] }, verificationStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-ver-status", code: diabetesStatus === "none" ? "refuted" : "confirmed" }] } } },
      hba1c: { fullUrl: "https://aidbox.example/fhir/Observation/host-hba1c", resource: { resourceType: "Observation" as const, id: "host-hba1c", status: "final" as const, code: { coding: [{ system: "http://loinc.org", code: "4548-4" }] }, subject: { reference: "Patient/example" }, valueQuantity: { value: 6.4, system: "http://unitsofmeasure.org", code: "%" } } },
      smokingStatus: { fullUrl: "https://aidbox.example/fhir/Observation/host-smoking", resource: { resourceType: "Observation" as const, id: "host-smoking", status: "final" as const, code: { coding: [{ system: "http://loinc.org", code: "72166-2" }] }, subject: { reference: "Patient/example" }, valueCodeableConcept: { coding: [{ system: "https://github.com/ZoliQua/React-Odontogram-Modul/fhir/CodeSystem/odontogram", code: "former" }] } } },
      edentulous: { fullUrl: "https://aidbox.example/fhir/Condition/host-edentulous", resource: { resourceType: "Condition" as const, id: "host-edentulous", subject: { reference: "Patient/example" }, code: { coding: [{ system: "https://issuer.example/diagnosis", code: "edentulous" }] } } },
    });

    const cases = (["none", "present"] as const).map((diabetesStatus) => {
      const resources = sharedResources(diabetesStatus);
      const bundle = buildDentalCoreBundle({ ...base, case: { ...base.case, diabetesStatus } }, { subject: "Patient/example", sharedResources: resources });
      return { bundle, diabetesStatus, resources };
    });
    for (const { bundle, diabetesStatus, resources } of cases) {
      const provenances = bundle.entry?.filter((entry) => entry.resource?.resourceType === "Provenance").map((entry) => entry.resource as import("fhir/r4").Provenance) ?? [];
      const provenance = provenances.find((resource) => resource.agent[0]?.who.reference === "Practitioner/recorder");
      const dated = bundle.entry?.find((entry) => "effectiveDateTime" in (entry.resource ?? {}))?.resource as import("fhir/r4").Observation | undefined;
      expect(provenance?.agent[0]?.who.reference).toBe("Practitioner/recorder");
      expect(provenance?.recorded).toBe("2026-08-15T00:00:00Z");
      expect(dated?.effectiveDateTime).toBe("2026-08-15");
      expect(provenances.flatMap((resource) => resource.target.map((target) => target.reference))).toEqual(expect.arrayContaining(Object.values(resources).map((entry) => entry.fullUrl)));
      const parsed = parseDentalCoreBundle(bundle);
      expect(parsed?.examination?.recorder).toBe("Practitioner/recorder");
      expect(parsed?.case).toMatchObject({ diabetesStatus, hba1c: 6.4, smokingStatus: "former" });
      expect(parsed?.globals.edentulous).toBe(true);
      const sharedProvenanceUrls = bundle.entry?.filter((entry) => entry.resource?.resourceType === "Provenance" && (entry.resource as import("fhir/r4").Provenance).agent[0]?.who.display === "Host system").map((entry) => entry.fullUrl);
      const rebuilt = buildDentalCoreBundle(parsed!, { subject: "Patient/example", sharedResources: resources });
      expect(rebuilt.entry?.filter((entry) => entry.resource?.resourceType === "Provenance" && (entry.resource as import("fhir/r4").Provenance).agent[0]?.who.display === "Host system").map((entry) => entry.fullUrl)).toEqual(sharedProvenanceUrls);
    }
    expect(cases[0].bundle.entry?.map((entry) => entry.resource?.resourceType)).toEqual(
      cases[1].bundle.entry?.map((entry) => entry.resource?.resourceType),
    );
  });

  it("accepts a shared smoking status coded with the LOINC LL2201-3 answer list", () => {
    const base: OdontogramExportPayload = {
      version: "2.26",
      globals: {},
      teeth: { "16": { toothSelection: "tooth-base", endo: "endo-filling" } },
      case: {},
    };
    const exportOptions = { subject: "Patient/example", effectiveDateTime: "2026-08-16T00:00:00Z" };
    const smokingCoded = (coding: Array<{ system: string; code: string }>) => ({
      smokingStatus: {
        fullUrl: "https://praxis.example/fhir/Observation/host-smoking",
        resource: {
          resourceType: "Observation" as const,
          id: "host-smoking",
          status: "final" as const,
          meta: { profile: ["https://praxis.example/fhir/praxis/StructureDefinition/smoking-status-de"] },
          code: { coding: [{ system: "http://loinc.org", code: "72166-2" }] },
          subject: { reference: "Patient/example" },
          valueCodeableConcept: { coding },
        },
      },
    });
    const smokingResource = (answer: string, system = "http://loinc.org") => smokingCoded([{ system, code: answer }]);
    const localCoding = (code: string) => ({ system: "https://github.com/ZoliQua/React-Odontogram-Modul/fhir/CodeSystem/odontogram", code });

    const accepted: Array<[string, "never" | "former" | "current"]> = [
      ["LA18978-9", "never"],
      ["LA15920-4", "former"],
      ["LA18976-3", "current"],
      ["LA18977-1", "current"],
      ["LA18981-3", "current"],
      ["LA18982-1", "current"],
    ];
    for (const [answer, status] of accepted) {
      const payload = { ...base, case: { smokingStatus: status } };
      const sharedResources = smokingResource(answer);
      const bundle = buildDentalCoreBundle(payload, { ...exportOptions, sharedResources });
      expect(parseDentalCoreBundle(bundle)?.case?.smokingStatus).toBe(status);
    }

    // The engine-local answer coding keeps working alongside the LOINC one.
    const localShared = {
      smokingStatus: {
        fullUrl: "https://praxis.example/fhir/Observation/host-smoking",
        resource: {
          resourceType: "Observation" as const,
          id: "host-smoking",
          status: "final" as const,
          code: { coding: [{ system: "http://loinc.org", code: "72166-2" }] },
          subject: { reference: "Patient/example" },
          valueCodeableConcept: { coding: [{ system: "https://github.com/ZoliQua/React-Odontogram-Modul/fhir/CodeSystem/odontogram", code: "former" }] },
        },
      },
    };
    const localBundle = buildDentalCoreBundle({ ...base, case: { smokingStatus: "former" } }, { ...exportOptions, sharedResources: localShared });
    expect(parseDentalCoreBundle(localBundle)?.case?.smokingStatus).toBe("former");

    // Unmappable answers and payload/answer disagreements stay rejected.
    for (const answer of ["LA18979-7", "LA18980-5"]) {
      expect(() => buildDentalCoreBundle({ ...base, case: { smokingStatus: "current" } }, { ...exportOptions, sharedResources: smokingResource(answer) }))
        .toThrow("case.smokingStatus");
    }
    expect(() => buildDentalCoreBundle({ ...base, case: { smokingStatus: "current" } }, { ...exportOptions, sharedResources: smokingResource("LA15920-4") }))
      .toThrow("case.smokingStatus");
    expect(() => buildDentalCoreBundle({ ...base, case: { smokingStatus: "former" } }, { ...exportOptions, sharedResources: smokingResource("8517006", "http://snomed.info/sct") }))
      .toThrow("case.smokingStatus");

    // Two recognised codings must agree; a disagreement is rejected outright.
    expect(() => buildDentalCoreBundle({ ...base, case: { smokingStatus: "former" } }, {
      ...exportOptions,
      sharedResources: smokingCoded([localCoding("former"), { system: "http://loinc.org", code: "LA18978-9" }]),
    })).toThrow("case.smokingStatus");
    const agreeing = buildDentalCoreBundle({ ...base, case: { smokingStatus: "former" } }, {
      ...exportOptions,
      sharedResources: smokingCoded([localCoding("former"), { system: "http://loinc.org", code: "LA15920-4" }]),
    });
    expect(parseDentalCoreBundle(agreeing)?.case?.smokingStatus).toBe("former");

    // An answer naming an Object.prototype member is not a code: rejected on both paths.
    for (const hostile of ["__proto__", "constructor", "toString", "hasOwnProperty"]) {
      expect(() => buildDentalCoreBundle({ ...base, case: { smokingStatus: "former" } }, { ...exportOptions, sharedResources: smokingResource(hostile) }))
        .toThrow("case.smokingStatus");
    }

    // A bundle whose shared answer is replaced after export is rejected whole, never
    // parsed with the field silently dropped or filled from a prototype member.
    for (const answer of ["LA18980-5", "__proto__", "constructor"]) {
      const exported = buildDentalCoreBundle({ ...base, case: { smokingStatus: "former" } }, { ...exportOptions, sharedResources: smokingResource("LA15920-4") });
      const shared = exported.entry?.find((entry) => entry.fullUrl === "https://praxis.example/fhir/Observation/host-smoking")?.resource as import("fhir/r4").Observation | undefined;
      expect(shared).toBeDefined();
      shared!.valueCodeableConcept = { coding: [{ system: "http://loinc.org", code: answer }] };
      expect(parseDentalCoreBundle(exported)).toBeUndefined();
    }
  });

  it("preserves identities for newly supported clinical profiles and assigns bundle-local identity to new ones", () => {
    const imported = buildDentalCoreBundle(clinicalFixture(), options);
    const replacement = new Map<string, string>();
    for (const [index, entry] of (imported.entry ?? []).entries()) {
      if (entry.resource?.resourceType === "Patient") continue;
      const previousFullUrl = entry.fullUrl;
      entry.resource!.id = `host-${index}`;
      entry.resource!.meta = { ...entry.resource!.meta, versionId: `v-${index}` };
      entry.fullUrl = `https://aidbox.example/fhir/${entry.resource!.resourceType}/host-${index}`;
      if (previousFullUrl) replacement.set(previousFullUrl, entry.fullUrl);
    }
    for (const entry of imported.entry ?? []) {
      const resource = entry.resource as { focus?: Array<{ reference?: string }> } | undefined;
      for (const focus of resource?.focus ?? []) {
        if (focus.reference) focus.reference = replacement.get(focus.reference) ?? focus.reference;
      }
    }

    const parsed = parseDentalCoreBundle(imported);
    expect(parsed).toBeDefined();
    const rebuilt = buildDentalCoreBundle(parsed!, options);
    for (const original of imported.entry ?? []) {
      if (original.resource?.resourceType === "Patient") continue;
      const matching = rebuilt.entry?.find((entry) => entry.fullUrl === original.fullUrl);
      expect(matching?.resource?.id, original.fullUrl).toBe(original.resource?.id);
      expect(matching?.resource?.meta?.versionId, original.fullUrl).toBe(original.resource?.meta?.versionId);
    }

    parsed!.teeth["14"] = { endo: "endo-filling" };
    const withNewResource = buildDentalCoreBundle(parsed!, options);
    const newEntries = withNewResource.entry?.filter((entry) => !entry.resource?.id) ?? [];
    expect(newEntries.length).toBeGreaterThan(0);
    expect(newEntries.every((entry) => /^urn:uuid:/.test(entry.fullUrl ?? ""))).toBe(true);
  });

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
      version: "2.26",
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
          version: "2.26",
          globals: {},
          teeth: { "16": { [mapping.field]: mapping.kind === "set" ? [value] : value } },
        };
        const parsed = parseFhirBundle(buildFhirBundle(source, options), { dialect: "dental-core" });
        expect(parsed.teeth["16"]?.[mapping.field], `${mapping.field}=${String(value)}`).toEqual(source.teeth["16"]?.[mapping.field]);
      }
    }
  });

  it("accepts empty Core collections and rejects ambiguous Core collections", () => {
    const empty = buildFhirBundle({ version: "2.26", globals: {}, teeth: {} }, options);
    expect(parseFhirBundle(empty, { dialect: "dental-core" })).toEqual({ version: "2.26", globals: {}, teeth: {} });

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
      version: "2.26",
      globals: {},
      teeth: { "16": { retention: "clasp" } },
      plan: { "16": {
        retention: "attachment",
        pulpDx: "reversible-pulpitis",
        rootCaries: "arrested",
        radiographicDepth: { mesial: "E2" },
        cervicalSurfaces: ["lingual"],
        assessment: { pulp: "not-assessed" },
        note: "Review at next visit",
      } },
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

  it("preserves opaque Aidbox identity and resolves its internal relations through a configured Dental Core session", () => {
    const aidboxBundle = structuredClone(buildFhirBundle(fixture(), options));
    const entries = aidboxBundle.entry ?? [];
    const replacement = new Map<string, string>();
    const expectedIdentity = new Map<string, { id: string; versionId: string; fullUrl: string }>();

    for (const [index, entry] of entries.entries()) {
      const resource = entry.resource as { resourceType: string; id?: string; meta?: { versionId?: string } };
      const original = `${resource.resourceType}/${resource.id}`;
      const originalFullUrl = entry.fullUrl;
      const id = `aidbox-${index + 1}`;
      const fullUrl = `https://aidbox.example/fhir/${resource.resourceType}/${id}`;
      const versionId = `version-${index + 1}`;
      replacement.set(original, fullUrl);
      if (originalFullUrl) replacement.set(originalFullUrl, fullUrl);
      expectedIdentity.set(fullUrl, { id, versionId, fullUrl });
      resource.id = id;
      resource.meta = { ...resource.meta, versionId };
      entry.fullUrl = fullUrl;
    }

    for (const entry of entries) {
      const resource = entry.resource as {
        basedOn?: Array<{ reference?: string }>;
        activity?: Array<{ reference?: { reference?: string } }>;
        target?: Array<{ reference?: string }>;
      };
      for (const reference of Array.isArray(resource.basedOn) ? resource.basedOn : []) {
        if (reference.reference) reference.reference = replacement.get(reference.reference) ?? reference.reference;
      }
      for (const activity of Array.isArray(resource.activity) ? resource.activity : []) {
        const reference = activity.reference?.reference;
        if (reference && activity.reference) activity.reference.reference = replacement.get(reference) ?? reference;
      }
      for (const target of Array.isArray(resource.target) ? resource.target : []) {
        if (target.reference) target.reference = replacement.get(target.reference) ?? target.reference;
      }
    }

    const session = createOdontogramSession(undefined, {
      fhir: { dialect: "dental-core", exportOptions: { subject: options.subject, effectiveDateTime: options.effectiveDateTime } },
    });

    expect(session.importFhirBundle(aidboxBundle)).toBe(true);
    const document = session.getDocument() as OdontogramExportPayload & {
      fhirIdentity?: { resources?: Record<string, { id?: string; versionId?: string; fullUrl?: string }> };
    };
    expect(Object.values(document.fhirIdentity?.resources ?? {})).toEqual(expect.arrayContaining([...expectedIdentity.values()]));
    expect(Object.keys(document.fhirIdentity?.resources ?? {})).toHaveLength(expectedIdentity.size);
    expect(JSON.parse(JSON.stringify(document))).toEqual(document);

    const exported = session.exportFhirBundle();
    expect(Object.fromEntries((exported.entry ?? []).map((entry) => [entry.fullUrl, {
      id: entry.resource?.id,
      versionId: entry.resource?.meta?.versionId,
      fullUrl: entry.fullUrl,
    }]))).toEqual(Object.fromEntries(expectedIdentity));
    const exportedPlan = exported.entry?.find((entry) => entry.resource?.resourceType === "CarePlan")?.resource as import("fhir/r4").CarePlan | undefined;
    const exportedRequest = exported.entry?.find((entry) => entry.resource?.resourceType === "ServiceRequest")?.resource as import("fhir/r4").ServiceRequest | undefined;
    const exportedPlannedChart = exported.entry?.find((entry) => entry.resource?.resourceType === "Observation" && Array.isArray((entry.resource as import("fhir/r4").Observation | undefined)?.basedOn))?.resource as import("fhir/r4").Observation | undefined;
    const exportedCondition = exported.entry?.find((entry) => entry.resource?.resourceType === "Condition")?.resource as import("fhir/r4").Condition | undefined;
    const exportedProvenance = exported.entry?.find((entry) => entry.resource?.resourceType === "Provenance")?.resource as import("fhir/r4").Provenance | undefined;
    const exportedPlanFullUrl = exported.entry?.find((entry) => entry.resource === exportedPlan)?.fullUrl;
    const exportedRequestFullUrl = exported.entry?.find((entry) => entry.resource === exportedRequest)?.fullUrl;
    const exportedConditionFullUrl = exported.entry?.find((entry) => entry.resource === exportedCondition)?.fullUrl;
    expect(exportedPlan?.activity?.[0]?.reference?.reference).toBe(exportedRequestFullUrl);
    expect(exportedRequest?.basedOn?.[0]?.reference).toBe(exportedPlanFullUrl);
    expect(exportedPlannedChart?.basedOn?.[0]?.reference).toBe(exportedPlanFullUrl);
    expect(exportedProvenance?.target?.[0]?.reference).toBe(exportedConditionFullUrl);

    const changed = session.getDocument();
    changed.teeth["17"] = { endoResection: true };
    session.setDocument(changed);
    const withNewResource = session.exportFhirBundle();
    const newEntries = (withNewResource.entry ?? []).filter((entry) => !expectedIdentity.has(entry.fullUrl ?? ""));
    expect(newEntries).not.toHaveLength(0);
    expect(newEntries.every((entry) => !entry.resource?.id && /^urn:uuid:/.test(entry.fullUrl ?? ""))).toBe(true);
    expect(new Set(newEntries.map((entry) => entry.fullUrl)).size).toBe(newEntries.length);
  });

  it("clears a live session's imported identity when a status import replaces its document", () => {
    const session = createOdontogramSession({
      version: "2.26",
      globals: {},
      teeth: { "16": { endoResection: true } },
      fhirIdentity: { resources: { "Observation/chart/status/16": { id: "host-a-chart", versionId: "17", fullUrl: "https://aidbox.example/fhir/Observation/host-a-chart" } } },
    }, { fhir: { dialect: "dental-core", exportOptions: options } });

    session.activate();
    try {
      __importStatusForTest({ version: "2.26", globals: {}, teeth: { "16": { fissureSealing: true } } });
      expect(session.getDocument().fhirIdentity).toBeUndefined();
    } finally {
      session.release();
    }
  });

  it("keeps relative references for imported persistent resources without entry fullUrls", () => {
    const relativeBundle = structuredClone(buildFhirBundle(fixture(), options));
    const references = new Map<string, string>();
    for (const [index, entry] of (relativeBundle.entry ?? []).entries()) {
      const resource = entry.resource as { resourceType: string; id?: string; meta?: { versionId?: string } };
      const relative = `${resource.resourceType}/persistent-${index + 1}`;
      if (entry.fullUrl) references.set(entry.fullUrl, relative);
      resource.id = `persistent-${index + 1}`;
      resource.meta = { ...resource.meta, versionId: `version-${index + 1}` };
      delete entry.fullUrl;
    }
    for (const entry of relativeBundle.entry ?? []) {
      const resource = entry.resource as {
        basedOn?: Array<{ reference?: string }>;
        activity?: Array<{ reference?: { reference?: string } }>;
        target?: Array<{ reference?: string }>;
      };
      for (const reference of Array.isArray(resource.basedOn) ? resource.basedOn : []) {
        if (reference.reference) reference.reference = references.get(reference.reference) ?? reference.reference;
      }
      for (const activity of Array.isArray(resource.activity) ? resource.activity : []) {
        const reference = activity.reference?.reference;
        if (reference && activity.reference) activity.reference.reference = references.get(reference) ?? reference;
      }
      for (const target of Array.isArray(resource.target) ? resource.target : []) {
        if (target.reference) target.reference = references.get(target.reference) ?? target.reference;
      }
    }

    const session = createOdontogramSession(undefined, {
      fhir: { dialect: "dental-core", exportOptions: options },
    });
    expect(session.importFhirBundle(relativeBundle)).toBe(true);

    const exported = session.exportFhirBundle();
    expect((exported.entry ?? []).every((entry) => entry.fullUrl === undefined)).toBe(true);
    const plan = exported.entry?.find((entry) => entry.resource?.resourceType === "CarePlan")?.resource as import("fhir/r4").CarePlan | undefined;
    const request = exported.entry?.find((entry) => entry.resource?.resourceType === "ServiceRequest")?.resource as import("fhir/r4").ServiceRequest | undefined;
    const plannedChart = exported.entry?.find((entry) => entry.resource?.resourceType === "Observation" && Array.isArray((entry.resource as import("fhir/r4").Observation | undefined)?.basedOn))?.resource as import("fhir/r4").Observation | undefined;
    const condition = exported.entry?.find((entry) => entry.resource?.resourceType === "Condition")?.resource as import("fhir/r4").Condition | undefined;
    const provenance = exported.entry?.find((entry) => entry.resource?.resourceType === "Provenance")?.resource as import("fhir/r4").Provenance | undefined;
    expect(plan?.activity?.[0]?.reference?.reference).toBe(`ServiceRequest/${request?.id}`);
    expect(request?.basedOn?.[0]?.reference).toBe(`CarePlan/${plan?.id}`);
    expect(plannedChart?.basedOn?.[0]?.reference).toBe(`CarePlan/${plan?.id}`);
    expect(provenance?.target?.[0]?.reference).toBe(`Condition/${condition?.id}`);
  });

  it("fails closed instead of silently dropping unsupported populated Core state", () => {
    const unsupported: OdontogramExportPayload = {
      version: "2.26",
      globals: {},
      teeth: { "16": { customStates: { "unsupported-clinical-state": true } } },
    };

    expect(() => buildFhirBundle(unsupported, options)).toThrow(UnsupportedDentalCoreContentError);
    expect(() => buildFhirBundle(unsupported, options)).toThrow("teeth.16.customStates");
  });

  it("rejects hostile clinical profile values and incomplete choice slices", () => {
    const bundle = buildDentalCoreBundle(clinicalFixture(), options);
    const toothState = bundle.entry?.find((entry) => entry.resource?.meta?.profile?.includes(DENTAL_CORE_PROFILES["dental-tooth-state"]))?.resource as import("fhir/r4").Observation;
    const presence = toothState.component?.find((component) => component.code.coding?.some((coding) => coding.code === "tooth-presence"));
    presence!.valueCodeableConcept!.coding![0].code = "not-an-editor-value";
    expect(parseDentalCoreBundle(bundle)).toBeUndefined();

    const missingValue = buildDentalCoreBundle(clinicalFixture(), options);
    const missingState = missingValue.entry?.find((entry) => entry.resource?.meta?.profile?.includes(DENTAL_CORE_PROFILES["dental-tooth-state"]))?.resource as import("fhir/r4").Observation;
    const missingPresence = missingState.component?.find((component) => component.code.coding?.some((coding) => coding.code === "tooth-presence"));
    delete missingPresence!.valueCodeableConcept;
    expect(parseDentalCoreBundle(missingValue)).toBeUndefined();

    const invalidSurface = buildDentalCoreBundle(clinicalFixture(), options);
    const fillingState = invalidSurface.entry?.find((entry) => {
      const resource = entry.resource as import("fhir/r4").Observation | undefined;
      return resource?.meta?.profile?.includes(DENTAL_CORE_PROFILES["dental-tooth-state"])
        && resource.bodySite?.coding?.some((coding) => coding.code === "16");
    })?.resource as import("fhir/r4").Observation;
    const surfaceComponent = fillingState.component?.find((component) => component.extension?.length);
    surfaceComponent!.extension![0].valueCoding!.system = "http://snomed.info/sct";
    expect(parseDentalCoreBundle(invalidSurface)).toBeUndefined();

    const invalidRange = buildDentalCoreBundle(clinicalFixture(), options);
    const periodontal = invalidRange.entry?.find((entry) => entry.resource?.meta?.profile?.includes(DENTAL_CORE_PROFILES["dental-periodontal-finding"]))?.resource as import("fhir/r4").Observation;
    const probingDepth = periodontal.component?.find((component) => component.code.coding?.some((coding) => coding.code === "32910-2"));
    probingDepth!.valueQuantity!.value = 9999;
    expect(parseDentalCoreBundle(invalidRange)).toBeUndefined();
  });

  it("roundtrips subcrown caries and refuses orphaned severity or peri-implant state", () => {
    const subcrown: OdontogramExportPayload = {
      version: "2.26", globals: {}, teeth: { "16": { caries: ["caries-subcrown"], cariesSeverity: { subcrown: 3 } } },
    };
    expect(parseDentalCoreBundle(buildDentalCoreBundle(subcrown, options))?.teeth).toEqual(subcrown.teeth);
    expect(() => buildDentalCoreBundle({ ...subcrown, teeth: { "16": { cariesSeverity: { occlusal: 4 } } } }, options)).toThrow("teeth.16.cariesSeverity.occlusal");
    expect(() => buildDentalCoreBundle({ ...subcrown, teeth: { "16": { periImplant: "mucositis" } } }, options)).toThrow("teeth.16.periImplant");
  });

  it("fails closed for plan-only implant fields, targetless recorder, performer, and invalid kg", () => {
    const empty: OdontogramExportPayload = { version: "2.26", globals: {}, teeth: {} };
    expect(() => buildDentalCoreBundle({ ...empty, plan: { "15": { toothSelection: "implant", implantProduct: { system: "Line" } } } }, options)).toThrow("plan.15.implantProduct");
    expect(() => buildDentalCoreBundle({ ...empty, examination: { recorder: "Practitioner/recorder" } }, options)).toThrow("examination.recorder");
    expect(() => buildDentalCoreBundle({ ...empty, teeth: { "16": { endo: "endo-filling" } }, examination: { performer: "Practitioner/performer" } }, options)).toThrow("examination.performer");
    expect(() => buildDentalCoreBundle({ ...empty, teeth: { "16": { kg: 42 } } }, options)).toThrow("teeth.16.kg");
  });

  it("treats unknown or cleared shared fields as uncharted and rejects hostile shared carriers", () => {
    const source: OdontogramExportPayload = {
      version: "2.26", globals: {}, teeth: { "16": { endo: "endo-filling" } },
      case: { diabetesStatus: "unknown", hba1c: null as unknown as number, smokingStatus: "unknown" },
    };
    expect(() => buildDentalCoreBundle(source, options)).not.toThrow();

    const sharedBase: OdontogramExportPayload = {
      version: "2.26", globals: {}, teeth: { "16": { endo: "endo-filling" } }, case: { hba1c: 6.4 },
    };
    const hba1c = { fullUrl: "https://aidbox.example/fhir/Observation/hba1c", resource: {
      resourceType: "Observation" as const, id: "hba1c", status: "final" as const,
      code: { coding: [{ system: "http://loinc.org", code: "4548-4" }] }, subject: { reference: "Patient/example" },
      valueQuantity: { value: 6.4, system: "http://unitsofmeasure.org", code: "%" },
    } };
    const valid = buildDentalCoreBundle(sharedBase, { ...options, sharedResources: { hba1c } });
    const invalidRange = structuredClone(valid);
    const observation = invalidRange.entry?.find((entry) => entry.fullUrl === hba1c.fullUrl)?.resource as import("fhir/r4").Observation;
    observation.valueQuantity!.value = -5;
    expect(parseDentalCoreBundle(invalidRange)).toBeUndefined();

    const wrongPatientImport = structuredClone(valid);
    const importedObservation = wrongPatientImport.entry?.find((entry) => entry.fullUrl === hba1c.fullUrl)?.resource as import("fhir/r4").Observation;
    importedObservation.subject!.reference = "Patient/someone-else";
    expect(parseDentalCoreBundle(wrongPatientImport)).toBeUndefined();

    const wrongPatient = structuredClone(hba1c);
    wrongPatient.resource.subject.reference = "Patient/someone-else";
    expect(() => buildDentalCoreBundle(sharedBase, { ...options, sharedResources: { hba1c: wrongPatient } })).toThrow("case.hba1c");

    const diagnosisBundle = buildDentalCoreBundle(fixture(), options);
    const diagnosis = diagnosisBundle.entry?.find((entry) => entry.resource?.resourceType === "Condition");
    const sharedProvenance = structuredClone(valid.entry?.find((entry) => entry.resource?.resourceType === "Provenance" && (entry.resource as import("fhir/r4").Provenance).agent[0]?.who.display === "Host system"));
    sharedProvenance!.fullUrl = "urn:uuid:00000000-0000-4000-8000-999999999999";
    (sharedProvenance!.resource as import("fhir/r4").Provenance).reason = [{ coding: [{ system: "https://github.com/ZoliQua/React-Odontogram-Modul/fhir/CodeSystem/odontogram", code: "shared-resource-edentulous" }] }];
    (sharedProvenance!.resource as import("fhir/r4").Provenance).target = [{ reference: diagnosis!.fullUrl }];
    diagnosisBundle.entry?.push(sharedProvenance!);
    expect(parseDentalCoreBundle(diagnosisBundle)).toBeUndefined();
  });

  it("publishes exactly the two supported dialect values", () => {
    expectTypeOf<FhirDialect>().toEqualTypeOf<"legacy" | "dental-core">();
  });
});

describe("configured FHIR sessions", () => {
  it("keeps the selected codec immutable and makes a rejected Core import non-destructive", () => {
    const source: OdontogramExportPayload = {
      version: "2.26",
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
    const legacy = createOdontogramSession({ version: "2.26", globals: {}, teeth: { "16": { endoResection: true } } }, { fhir: { dialect: "legacy" } });
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
      version: "2.26",
      globals: {},
      teeth: { "16": { endoResection: true, fissureSealing: true, mods: ["mobility"] } },
    };
    const session = createOdontogramSession(source, { fhir: { dialect: "legacy" } });

    expect(session.importFhirBundle(session.exportFhirBundle())).toBe(true);
    expect(session.getDocument().teeth["16"]).toMatchObject(source.teeth["16"]);
  });
});
