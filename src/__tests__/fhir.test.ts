// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Created by Zoltan Dul (https://github.com/ZoliQua) 2025-2026

import { readFileSync } from "node:fs";
import { describe, it, expect, vi } from "vitest";
import { LOCAL_VALUE_MAPS, LOCAL_SYSTEM, FDI_SYSTEM } from "../fhir/codesystems";

// Mirror of the engine's VALID_* sets (src/odontogram.ts:2145-2153).
// Kept here so the test fails loudly if a new enum value is added without a code.
const EXPECTED = {
  toothSelection: ["none","tooth-base","milktooth","implant","tooth-under-gum","no-tooth-after-extraction"],
  endo: ["none","endo-medical-filling","endo-filling","endo-filling-incomplete","endo-glass-pin","endo-metal-pin"],
  fillingMaterial: ["none","amalgam","composite","gic","temporary"],
  mobility: ["none","m1","m2","m3"],
  mods: ["inflammation","parodontal","mobility"],
  periapicalType: ["none","granuloma","cyst","abscess"],
  caries: ["caries-subcrown","caries-buccal","caries-lingual","caries-mesial","caries-distal","caries-occlusal"],
  fillingSurfaces: ["buccal","lingual","mesial","distal","occlusal"],
} as const;

describe("FHIR code systems", () => {
  it("exposes stable canonical URLs", () => {
    expect(LOCAL_SYSTEM).toMatch(/^https?:\/\//);
    expect(FDI_SYSTEM).toMatch(/iso|fdi|3950/i);
  });

  it("maps every enum value to a non-empty local code and display", () => {
    for (const [group, values] of Object.entries(EXPECTED)) {
      const map = LOCAL_VALUE_MAPS[group as keyof typeof LOCAL_VALUE_MAPS];
      expect(map, `missing value map for ${group}`).toBeDefined();
      for (const v of values) {
        const entry = map[v];
        expect(entry, `missing code for ${group}.${v}`).toBeDefined();
        expect(entry.code.length).toBeGreaterThan(0);
        expect(entry.display.length).toBeGreaterThan(0);
      }
    }
  });
});

import { FIELD_MAPPINGS } from "../fhir/fieldMappings";
import { LOCAL_VALUE_MAPS as MAPS } from "../fhir/codesystems";

describe("FHIR field mappings", () => {
  it("references only known value-map groups", () => {
    for (const m of FIELD_MAPPINGS) {
      if (m.kind !== "boolean") {
        expect(MAPS[m.valueGroup], `unknown valueGroup ${m.valueGroup}`).toBeDefined();
      }
      expect(m.findingCode.length).toBeGreaterThan(0);
      expect(m.findingDisplay.length).toBeGreaterThan(0);
    }
  });

  it("covers every serialized tooth field (mapped, surface, or special-cased)", () => {
    const mapped = new Set(FIELD_MAPPINGS.map((m) => m.field));
    const surfaceFields = new Set(
      FIELD_MAPPINGS.flatMap((m) => (m.kind === "restoration" ? [m.surfacesField] : [])),
    );
    // Handled outside FIELD_MAPPINGS by design (special-cased in buildFhirBundle):
    // fillingSurfaceMaterials is consumed inline by the restoration emitter (per-surface materials).
    // Handled outside FIELD_MAPPINGS by design: fillingSurfaceMaterials (consumed
    // inline by the restoration emitter) + caries depth. Task 4 retired the legacy
    // `crownMaterial`/`bridgeUnit` fields entirely (from state, serialize, and the
    // `bridgeUnit` FHIR mapping) — neither is emitted by serializeState() anymore.
    const SPECIAL = new Set(["customStates", "note", "fillingSurfaceMaterials", "cariesActiveDepth", "cariesDepths"]);
    // Full output of serializeState():
    const SERIALIZED = [
      "toothSelection", "pulpDx", "pulpLatin", "apicalDx", "endoResection", "mods", "periapicalType", "endo", "caries",
      "cariesActiveDepth", "cariesDepths", "calculus", "resorptionType",
      "fillingMaterial", "fillingSurfaces", "fillingSurfaceMaterials", "fissureSealing", "contactMesial", "contactDistal",
      "wearEdge", "wearCervical", "brokenMesial", "brokenIncisal", "brokenDistal",
      "extractionWound", "extractionPlan", "parapulpalPin", "crownReplace", "crownNeeded",
      "missingClosed", "bridgePillar", "prosthesis", "mobility",
      "toothSubstrate", "restorationType", "restorationMaterial", "crownLeakage",
      "customStates", "note",
    ];
    for (const f of SERIALIZED) {
      expect(
        mapped.has(f) || surfaceFields.has(f) || SPECIAL.has(f),
        `serialized field "${f}" is not covered by the FHIR export`,
      ).toBe(true);
    }
    expect(new Set(FIELD_MAPPINGS.map((m) => m.field)).size).toBe(FIELD_MAPPINGS.length); // no duplicates
  });
});

import { buildFhirBundle } from "../fhir/toFhir";
import { DentalCoreBundleRejectedError as PublicDentalCoreBundleRejectedError } from "../fhir";
import type { OdontogramExportPayload } from "../fhir/types";
import { DentalCoreBundleRejectedError, parseFhirBundle } from "../fhir/fromFhir";
import { parseDentalCoreBundle } from "../fhir/fromFhirDentalCore";
import { CHART_MAPPINGS } from "../fhir/dentalCoreContract";
import { __resetChartStateForTest, __setToothStateForTest, getStatusChart, importFhirBundle } from "../odontogram";

const emptyPayload: OdontogramExportPayload = { version: "1.3", globals: {}, teeth: {} };
const dentalCoreOptions = { dialect: "dental-core" as const, effectiveDateTime: "2026-08-13T12:00:00Z" };
const fhirTestFileUrl = import.meta.url;
const dentalCoreContract = JSON.parse(readFileSync(new URL("./dental-core-0.3.0-contract.json", fhirTestFileUrl), "utf8")) as {
  propertyCodes: string[];
  valueCodes: string[];
};

const DENTAL_CORE_VALUES: Record<string, unknown[]> = {
  endoResection: [true], mods: [["inflammation", "parodontal", "mobility"]],
  periapicalType: ["granuloma", "cyst", "abscess"], fissureSealing: [true], contactMesial: [true], contactDistal: [true],
  wearEdge: ["attrition", "erosion"], wearCervical: ["abrasion", "abfraction", "erosion"],
  discoloration: ["tetracycline", "fluorosis", "nonvital", "extrinsic", "other"],
  cejVisibility: ["detectable", "not-detectable"], rootConcavity: ["mild", "deep"], gingivalThickness: ["thin", "medium", "thick"],
  orthoAppliance: ["bracket", "band"], orthoDrift: ["mesial", "distal"], orthoVertical: ["extrusion", "intrusion"], orthoRotation: [true],
  brokenMesial: [true], brokenIncisal: [true], brokenDistal: [true], extractionWound: [true], parapulpalPin: [true], missingClosed: [true], bridgePillar: [true],
  pulpLatin: ["pulpa-sana", "hyperaemia-pulpae", "pulpitis-acuta-serosa", "pulpitis-acuta-purulenta", "pulpitis-chronica-clausa", "pulpitis-chronica-ulcerosa", "pulpitis-chronica-hyperplastica", "necrosis-pulpae", "gangraena-pulpae"],
  resorptionType: ["internal", "external-cervical"], retention: ["clasp", "attachment", "bar-abutment"], retentionSide: ["mesial", "distal", "both"],
};

describe("Dental Core 0.3 lossless carrier dialect", () => {
  it("exports the typed Dental Core rejection through the public FHIR entry", () => {
    expect(PublicDentalCoreBundleRejectedError).toBe(DentalCoreBundleRejectedError);
  });

  it("labels emitted bundles with the released Dental Core package version", () => {
    const bundle = buildFhirBundle({ version: "2.25", teeth: {} }, dentalCoreOptions);

    expect(bundle.identifier).toEqual({
      system: "https://fhir.cognovis.de/dental-core",
      value: "odontogram-dental-core-0.3.0",
    });
  });

  it("fails closed at the strict and public parser boundaries for unsupported Dental Core bundles", () => {
    const bundle = buildFhirBundle({ version: "2.25", teeth: { "16": { endoResection: true } } }, dentalCoreOptions);
    const misleadingMarker = structuredClone(bundle);
    misleadingMarker.identifier = { system: "https://example.invalid/dental-core", value: "odontogram-dental-core-0.3.0" };
    const unprofiled = {
      resourceType: "Bundle",
      identifier: bundle.identifier,
      entry: [{ resource: { resourceType: "Observation", status: "final" } }],
    };
    const unlistedType = {
      resourceType: "Bundle",
      identifier: bundle.identifier,
      entry: [{ resource: { resourceType: "MedicationRequest", id: "unsupported-medication", status: "active", intent: "order" } }],
    };
    const wrongPatientId = structuredClone(bundle);
    const patient = wrongPatientId.entry?.find((entry) => entry.resource?.resourceType === "Patient");
    if (patient?.resource) patient.resource.id = "other-patient";
    const oldMarker = structuredClone(bundle);
    oldMarker.identifier = { system: bundle.identifier?.system, value: "odontogram-dental-core-0.2.0" };

    for (const rejected of [misleadingMarker, unprofiled, unlistedType, wrongPatientId, oldMarker]) {
      expect(parseDentalCoreBundle(rejected)).toBeUndefined();
      expect(() => parseFhirBundle(rejected)).toThrow(/rejected Dental Core bundle/i);
    }
  });

  it("does not replace the current chart when UI import rejects a Dental Core bundle", () => {
    __resetChartStateForTest();
    __setToothStateForTest(16, { endoResection: true });
    const before = getStatusChart();
    const rejected = buildFhirBundle({ version: "2.25", teeth: { "16": { endoResection: true } } }, dentalCoreOptions);
    rejected.entry?.push({ resource: { resourceType: "MedicationRequest", status: "active", intent: "order" } as never });
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(importFhirBundle(rejected)).toBe(false);
    expect(getStatusChart()).toEqual(before);
    expect(error).toHaveBeenCalledWith(expect.stringMatching(/rejected Dental Core bundle/i));
    error.mockRestore();
  });

  it("omits invalid FDI, diagnosis, and out-of-range risk evidence values", () => {
    const bundle = buildFhirBundle({
      version: "2.25",
      teeth: { "99": { endoResection: true }, abc: { fissureSealing: true } },
      case: { cigarettesPerDay: -1, toothLossPerio: 33, maxRblPercent: 101, diagnosisOverride: "not-a-diagnosis" },
    } as OdontogramExportPayload, dentalCoreOptions);

    expect(JSON.stringify(bundle)).not.toContain('"code":"99"');
    expect(JSON.stringify(bundle)).not.toContain('"code":"abc"');
    expect(bundle.entry?.some((entry) => entry.resource?.resourceType === "Condition")).toBe(false);
    expect(bundle.entry?.some((entry) => entry.resource?.id?.startsWith("dental-core-cigarettes-per-day") || entry.resource?.id?.startsWith("dental-core-periodontitis-attributed-tooth-loss") || entry.resource?.id?.startsWith("dental-core-maximum-radiographic-bone-loss"))).toBe(false);
  });

  it("rejects out-of-range risk evidence on import", () => {
    const bundle = buildFhirBundle({ version: "2.25", teeth: {}, case: { cigarettesPerDay: 1 } }, dentalCoreOptions);
    const evidence = bundle.entry?.find((entry) => entry.resource?.id === "dental-core-cigarettes-per-day")?.resource as import("fhir/r4").Observation | undefined;
    if (evidence?.resourceType === "Observation") evidence.valueInteger = -1;

    expect(parseDentalCoreBundle(bundle)).toBeUndefined();
    expect(() => parseFhirBundle(bundle)).toThrow(/rejected Dental Core bundle/i);
  });

  it("requires an effective date when Dental Core content needs one", () => {
    expect(() => buildFhirBundle({ version: "2.25", teeth: { "16": { endoResection: true } } }, { dialect: "dental-core" })).toThrow(
      "Dental Core export requires an effective date from the export options or examination context",
    );
  });

  it("keeps every emitted chart property and value inside the released 0.3.0 CodeSystems", () => {
    const propertyCodes = new Set(dentalCoreContract.propertyCodes);
    const valueCodes = new Set(dentalCoreContract.valueCodes);

    for (const mapping of CHART_MAPPINGS) {
      expect(propertyCodes.has(mapping.property), `unknown Dental Core property ${mapping.property}`).toBe(true);
      for (const code of Object.values(mapping.values ?? {})) {
        expect(valueCodes.has(code), `unknown Dental Core value ${code}`).toBe(true);
      }
    }
  });

  for (const [field, values] of Object.entries(DENTAL_CORE_VALUES)) {
    for (const value of values) {
      it(`roundtrips ${field}=${JSON.stringify(value)}`, () => {
        const source = { version: "2.25", teeth: { "16": { [field]: value } } } as OdontogramExportPayload;
        const bundle = buildFhirBundle(source, { ...dentalCoreOptions, subject: "Patient/example" });
        expect(parseFhirBundle(bundle).teeth["16"]?.[field as keyof import("../document").ToothRecord]).toEqual(value);
      });
    }
  }

  for (const field of ["endoResection", "fissureSealing", "contactMesial", "contactDistal", "orthoRotation", "brokenMesial", "brokenIncisal", "brokenDistal", "extractionWound", "parapulpalPin", "missingClosed", "bridgePillar"]) {
    it(`preserves explicit false for ${field} while leaving omitted fields absent`, () => {
      const source = { version: "2.25", teeth: { "16": { [field]: false } } } as OdontogramExportPayload;
      const back = parseFhirBundle(buildFhirBundle(source, dentalCoreOptions));
      expect(back.teeth["16"]?.[field as keyof import("../document").ToothRecord]).toBe(false);
      expect(parseFhirBundle(buildFhirBundle({ version: "2.25", teeth: {} }, dentalCoreOptions)).teeth["16"]).toBeUndefined();
    });
  }

  for (const [field, value] of [["periapicalType", "none"], ["wearEdge", "none"], ["wearCervical", "none"], ["discoloration", "none"], ["cejVisibility", "none"], ["rootConcavity", "none"], ["gingivalThickness", "unknown"], ["orthoAppliance", "none"], ["orthoDrift", "none"], ["orthoVertical", "none"], ["pulpLatin", "none"], ["resorptionType", "none"], ["retention", "none"], ["retentionSide", "none"]] as const) {
    it(`preserves explicitly serialized default ${field}=${value}`, () => {
      const source = { version: "2.25", teeth: { "16": { [field]: value } } } as OdontogramExportPayload;
      expect(parseFhirBundle(buildFhirBundle(source, dentalCoreOptions)).teeth["16"]?.[field as keyof import("../document").ToothRecord]).toBe(value);
    });
  }

  it("roundtrips plan state, bounded case evidence, and clinician diagnosis override", () => {
    const source: OdontogramExportPayload = {
      version: "2.25", teeth: {}, plan: { "16": { retention: "attachment", retentionSide: "both" } },
      case: { cigarettesPerDay: 99, toothLossPerio: 32, maxRblPercent: 100, diagnosisOverride: "periodontitis" },
    };
    const bundle = buildFhirBundle(source, { ...dentalCoreOptions, subject: "Patient/example" });
    const back = parseFhirBundle(bundle);
    expect(back.plan?.["16"]).toMatchObject(source.plan?.["16"] ?? {});
    expect(back.case).toMatchObject(source.case ?? {});
    expect(bundle.entry?.find((entry) => entry.resource?.resourceType === "CarePlan")?.resource).toMatchObject({
      activity: [{ reference: { reference: "ServiceRequest/dental-core-request-16" } }],
    });
  });

  it("keeps a clinician diagnosis override as an unprofiled FHIR companion rather than claiming an incomplete Dental Core profile", () => {
    const bundle = buildFhirBundle({
      version: "2.25",
      teeth: {},
      case: { diagnosisOverride: "periodontitis" },
    }, dentalCoreOptions);

    const condition = bundle.entry?.find((entry) => entry.resource?.resourceType === "Condition")?.resource;
    const provenance = bundle.entry?.find((entry) => entry.resource?.resourceType === "Provenance")?.resource;

    expect(condition?.meta?.profile).toBeUndefined();
    expect(provenance?.meta?.profile).toContain(
      "https://fhir.cognovis.de/dental-core/StructureDefinition/dental-clinical-provenance",
    );
    expect(provenance).toMatchObject({ target: [{ reference: "Condition/dental-core-periodontal-diagnosis" }] });
  });

  it("emits truthful companion resources for performed work and retained devices", () => {
    const bundle = buildFhirBundle({ version: "2.25", teeth: { "16": { endoResection: true, fissureSealing: true, orthoAppliance: "bracket", parapulpalPin: true, bridgePillar: true, retention: "clasp", rootConcavity: "deep" } }, plan: { "16": { retention: "attachment" } } }, dentalCoreOptions);
    const resources = (bundle.entry ?? []).map((entry) => entry.resource?.resourceType);
    expect(resources.filter((type) => type === "Procedure")).toHaveLength(2);
    expect(resources.filter((type) => type === "Device")).toHaveLength(4);
    expect(resources).toContain("Observation");
    expect(resources).toContain("ServiceRequest");
  });
});

describe("buildFhirBundle — skeleton & subject", () => {
  it("returns a valid empty collection Bundle with a placeholder Patient", () => {
    const b = buildFhirBundle(emptyPayload);
    expect(b.resourceType).toBe("Bundle");
    expect(b.type).toBe("collection");
    const patients = (b.entry ?? []).filter((e) => e.resource?.resourceType === "Patient");
    expect(patients).toHaveLength(1);
  });

  it("uses the supplied subject and omits the placeholder Patient", () => {
    const b = buildFhirBundle(emptyPayload, { subject: "Patient/abc" });
    const patients = (b.entry ?? []).filter((e) => e.resource?.resourceType === "Patient");
    expect(patients).toHaveLength(0);
  });

  it("never throws on null/garbage input", () => {
    // Note: directive omitted on the null case because this engine's tsconfig
    // uses `strict: false`, so `null` is assignable here and would make
    // `@ts-expect-error` unused (TS2578). The runtime assertion is unchanged.
    expect(() => buildFhirBundle(null as unknown as OdontogramExportPayload)).not.toThrow();
    // @ts-expect-error intentional bad input
    const b = buildFhirBundle({ teeth: "nope" });
    expect(b.resourceType).toBe("Bundle");
  });
});

import { LOCAL_SYSTEM as LS, FDI_SYSTEM as FS } from "../fhir/codesystems";

function obsOf(b: ReturnType<typeof buildFhirBundle>) {
  return (b.entry ?? []).map((e) => e.resource).filter((r): r is NonNullable<typeof r> => r?.resourceType === "Observation") as import("fhir/r4").Observation[];
}

describe("buildFhirBundle — review fixes", () => {
  it("emits a chart-level edentulous Observation (no bodySite) when globals.edentulous is true", () => {
    const b = buildFhirBundle({ version: "1.3", globals: { edentulous: true }, teeth: {} });
    const ed = obsOf(b).find((o) => o.code.coding?.[0].code === "edentulous");
    expect(ed).toBeDefined();
    expect(ed?.valueBoolean).toBe(true);
    expect(ed?.bodySite).toBeUndefined();
  });

  it("does not emit edentulous when the flag is false/absent", () => {
    const b = buildFhirBundle({ version: "1.3", globals: { edentulous: false }, teeth: {} });
    expect(obsOf(b).some((o) => o.code.coding?.[0].code === "edentulous")).toBe(false);
  });

  it("maps primitive customStates and skips non-primitive shapes", () => {
    const b = buildFhirBundle({
      version: "1.3",
      teeth: { "11": { customStates: { pluginA: "hello", pluginB: 3, pluginC: true, pluginD: { nested: 1 } } } },
    });
    const custom = obsOf(b).filter((o) => o.code.coding?.[0].code?.startsWith("custom-state:"));
    expect(custom).toHaveLength(3); // pluginD (object) skipped
    expect(custom.find((o) => o.code.coding?.[0].code === "custom-state:pluginA")?.valueString).toBe("hello");
    expect(custom.find((o) => o.code.coding?.[0].code === "custom-state:pluginB")?.valueQuantity?.value).toBe(3);
    expect(custom.find((o) => o.code.coding?.[0].code === "custom-state:pluginC")?.valueBoolean).toBe(true);
  });

  it("gives set components an explicit valueBoolean and restoration components a per-surface material", () => {
    const b = buildFhirBundle({
      version: "1.3",
      teeth: { "21": { caries: ["caries-mesial"], fillingMaterial: "composite", fillingSurfaces: ["occlusal"] } },
    });
    const caries = obsOf(b).find((o) => o.code.coding?.[0].code === "caries");
    expect(caries?.component?.[0].valueBoolean).toBe(true);
    const rest = obsOf(b).find((o) => o.code.coding?.[0].code === "restoration");
    expect(rest?.component?.[0].code.coding?.[0].code).toBe("occlusal");
    expect(rest?.component?.[0].valueCodeableConcept?.coding?.[0].code).toBe("composite");
  });

  it("gives the placeholder Patient a fullUrl that every Observation.subject resolves to", () => {
    const b = buildFhirBundle({ version: "1.3", teeth: { "11": { mobility: "m1" } } });
    const patientEntry = (b.entry ?? []).find((e) => e.resource?.resourceType === "Patient");
    expect(patientEntry?.fullUrl).toBe("urn:uuid:odontogram-subject");
    const obs = obsOf(b);
    expect(obs.length).toBeGreaterThan(0);
    for (const o of obs) {
      expect(o.subject?.reference).toBe("urn:uuid:odontogram-subject");
    }
  });
});

describe("buildFhirBundle — mapping behavior", () => {
  it("emits an enum finding with correct tooth bodySite and skips defaults", () => {
    const b = buildFhirBundle({
      version: "1.3",
      teeth: {
        "11": { toothSelection: "implant" },
        "12": { toothSelection: "tooth-base" }, // default -> skipped
      },
    });
    const obs = obsOf(b);
    expect(obs).toHaveLength(1);
    expect(obs[0].bodySite?.coding?.[0].system).toBe(FS);
    expect(obs[0].bodySite?.coding?.[0].code).toBe("11");
    expect(obs[0].valueCodeableConcept?.coding?.[0].system).toBe(LS);
    expect(obs[0].valueCodeableConcept?.coding?.[0].code).toBe("implant");
  });

  it("emits caries as one Observation with a component per surface", () => {
    const b = buildFhirBundle({ version: "1.3", teeth: { "21": { caries: ["caries-mesial", "caries-occlusal"] } } });
    const caries = obsOf(b).filter((o) => o.code.coding?.[0].code === "caries");
    expect(caries).toHaveLength(1);
    expect(caries[0].component).toHaveLength(2);
    expect(caries[0].component?.map((c) => c.code.coding?.[0].code).sort()).toEqual(["caries-mesial", "caries-occlusal"]);
  });

  it("emits restoration with per-surface material components", () => {
    const b = buildFhirBundle({ version: "1.3", teeth: { "36": { fillingMaterial: "composite", fillingSurfaces: ["occlusal"] } } });
    const r = obsOf(b).filter((o) => o.code.coding?.[0].code === "restoration");
    expect(r).toHaveLength(1);
    // No top-level material value; material lives on each surface component.
    expect(r[0].valueCodeableConcept).toBeUndefined();
    expect(r[0].component?.[0].code.coding?.[0].code).toBe("occlusal");
    expect(r[0].component?.[0].valueCodeableConcept?.coding?.[0].code).toBe("composite");
  });

  it("emits boolean findings only when true", () => {
    const b = buildFhirBundle({ version: "1.3", teeth: { "46": { extractionPlan: true, crownNeeded: false } } });
    const codes = obsOf(b).map((o) => o.code.coding?.[0].code);
    expect(codes).toContain("extraction-planned");
    expect(codes).not.toContain("crown-needed");
  });

  it("attaches per-tooth note as an Observation note", () => {
    const b = buildFhirBundle({ version: "1.3", teeth: { "11": { note: "watch this tooth" } } });
    const note = obsOf(b).find((o) => o.code.coding?.[0].code === "tooth-note");
    expect(note?.note?.[0].text).toBe("watch this tooth");
  });

  it("tolerates unknown enum values via a local code, no throw", () => {
    const b = buildFhirBundle({ version: "2.0", teeth: { "11": { restorationMaterial: "future-material-xyz" } } });
    const cm = obsOf(b).find((o) => o.code.coding?.[0].code === "restoration-material");
    expect(cm?.valueCodeableConcept?.coding?.[0].code).toBe("future-material-xyz");
  });

  it("always includes a local coding and a status on every Observation", () => {
    const b = buildFhirBundle({ version: "1.3", teeth: { "11": { mobility: "m2" } } });
    for (const o of obsOf(b)) {
      expect(o.status).toBe("final");
      expect(o.code.coding?.some((c) => c.system === LS)).toBe(true);
    }
  });
});

describe("buildFhirBundle — per-surface restoration materials", () => {
  it("emits one component per surface carrying that surface's material", () => {
    const b = buildFhirBundle({
      version: "1.4",
      teeth: { "36": { fillingSurfaceMaterials: { buccal: "amalgam", distal: "composite" } } },
    });
    const rest = obsOf(b).find((o) => o.code.coding?.[0].code === "restoration");
    expect(rest).toBeDefined();
    const comps = rest?.component ?? [];
    expect(comps).toHaveLength(2);
    const bySurface = Object.fromEntries(
      comps.map((c) => [c.code.coding?.[0].code, c.valueCodeableConcept?.coding?.[0].code]),
    );
    expect(bySurface["buccal"]).toBe("amalgam");
    expect(bySurface["distal"]).toBe("composite");
  });

  it("still maps legacy single-material restorations (fillingMaterial + fillingSurfaces)", () => {
    const b = buildFhirBundle({
      version: "1.3",
      teeth: { "36": { fillingMaterial: "composite", fillingSurfaces: ["occlusal"] } },
    });
    const rest = obsOf(b).find((o) => o.code.coding?.[0].code === "restoration");
    expect(rest?.component?.[0].code.coding?.[0].code).toBe("occlusal");
    expect(rest?.component?.[0].valueCodeableConcept?.coding?.[0].code).toBe("composite");
  });
});
