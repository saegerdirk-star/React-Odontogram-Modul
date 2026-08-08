// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
//
// Bead odontogram-3l1 / AC3: the public FHIR conversion surface emits
// canonical `fhir-dental-de` profile and extension semantics for the editor
// concepts the IG covers, reads those canonical resources back, and still
// accepts the repository's previously supported legacy bundle representation.
//
// Canonical identifiers are taken from the published IG definition on
// fhir-dental-de main (PR #93, merge 2a352fc): `OdontogramObservationDE`
// (`odontogram-observation`), `CariesObservationDE` (`caries-observation`),
// `OdontogramComponentCS`, `DentalAssessmentTypeCS`, `ToothIdentificationFDICS`,
// `ICDASCariesScoreCS`, `RestorationTypeCS`, `DentalMaterialCS`, and
// `ToothSurfacesExt` over HL7 `FDI-surface`.

import { describe, it, expect } from "vitest";
import { buildFhirBundle } from "../fhir/toFhir";
import { parseFhirBundle } from "../fhir/fromFhir";
import { buildDentalDeBundle } from "../fhir/toFhirDentalDe";
import {
  DENTAL_DE_ODONTOGRAM_PROFILE,
  DENTAL_DE_CARIES_PROFILE,
  DENTAL_DE_FINDING_PROFILE,
  DENTAL_DE_COMPONENT_SYSTEM,
  DENTAL_DE_ASSESSMENT_SYSTEM,
  DENTAL_DE_FDI_SYSTEM,
  DENTAL_DE_ICDAS_SYSTEM,
  DENTAL_DE_RESTORATION_TYPE_SYSTEM,
  DENTAL_DE_MATERIAL_SYSTEM,
  DENTAL_DE_CATEGORY_SYSTEM,
  TOOTH_SURFACES_EXT_URL,
  FDI_SURFACE_SYSTEM,
} from "../fhir/dentalDeCodesystems";
import type { Bundle, Observation, OdontogramExportPayload } from "../fhir/types";
import { LOCAL_SYSTEM } from "../fhir/codesystems";

const EFFECTIVE = "2026-08-08";

function resources(bundle: Bundle): Observation[] {
  return (bundle.entry ?? [])
    .map((e) => e.resource)
    .filter((r): r is Observation => !!r && r.resourceType === "Observation");
}

function byProfile(bundle: Bundle, profile: string): Observation[] {
  return resources(bundle).filter((o) => (o.meta?.profile ?? []).includes(profile));
}

function toothOf(obs: Observation): string | undefined {
  return obs.bodySite?.coding?.find((c) => c.system === DENTAL_DE_FDI_SYSTEM)?.code;
}

function component(obs: Observation, code: string) {
  return (obs.component ?? []).find((c) =>
    (c.code?.coding ?? []).some((x) => x.system === DENTAL_DE_COMPONENT_SYSTEM && x.code === code),
  );
}

function surfacesOf(node: { extension?: Array<{ url?: string; valueCodeableConcept?: unknown }> } | undefined): string[] {
  return (node?.extension ?? [])
    .filter((e) => e.url === TOOTH_SURFACES_EXT_URL)
    .map((e) => {
      const cc = e.valueCodeableConcept as { coding?: Array<{ system?: string; code?: string }> } | undefined;
      return cc?.coding?.find((c) => c.system === FDI_SURFACE_SYSTEM)?.code ?? "";
    })
    .filter(Boolean);
}

const RESTORED_TOOTH: OdontogramExportPayload = {
  version: "2.20",
  globals: {},
  teeth: {
    "46": {
      toothSelection: "tooth-base",
      endo: "endo-filling",
      restorationType: "onlay",
      restorationMaterial: "emax",
    },
  },
};

describe("odontogram-3l1 AC3: canonical fhir-dental-de emission", () => {
  it("keeps the legacy dialect as the default output of buildFhirBundle", () => {
    const legacy = buildFhirBundle(RESTORED_TOOTH);
    const explicit = buildFhirBundle(RESTORED_TOOTH, { dialect: "legacy" });
    expect(JSON.stringify(legacy)).toBe(JSON.stringify(explicit));
    // The legacy dialect keeps the engine-local finding coding.
    const codes = resources(legacy).flatMap((o) => (o.code?.coding ?? []).map((c) => c.system));
    expect(codes).toContain(LOCAL_SYSTEM);
  });

  it("emits an OdontogramObservationDE with the canonical profile, code, category and bodySite", () => {
    const bundle = buildFhirBundle(RESTORED_TOOTH, {
      dialect: "dental-de",
      subject: "Patient/pat-1",
      effectiveDateTime: EFFECTIVE,
    });
    const odonto = byProfile(bundle, DENTAL_DE_ODONTOGRAM_PROFILE);
    expect(odonto).toHaveLength(1);
    const obs = odonto[0];

    expect(obs.status).toBe("final");
    expect(obs.subject?.reference).toBe("Patient/pat-1");
    expect(obs.effectiveDateTime).toBe(EFFECTIVE);
    expect(toothOf(obs)).toBe("46");
    expect((obs.code?.coding ?? [])).toContainEqual(
      expect.objectContaining({ system: DENTAL_DE_ASSESSMENT_SYSTEM, code: "odontogram-assessment" }),
    );
    expect((obs.category ?? []).flatMap((c) => c.coding ?? [])).toContainEqual(
      expect.objectContaining({ system: DENTAL_DE_CATEGORY_SYSTEM, code: "dental" }),
    );
    // The odontogram profile forbids Observation.value[x].
    expect(obs.valueCodeableConcept).toBeUndefined();
    expect(obs.valueBoolean).toBeUndefined();
  });

  it("emits tooth presence, root/endodontic state, restoration type and material components", () => {
    const bundle = buildFhirBundle(RESTORED_TOOTH, { dialect: "dental-de", effectiveDateTime: EFFECTIVE });
    const obs = byProfile(bundle, DENTAL_DE_ODONTOGRAM_PROFILE)[0];

    const presence = component(obs, "tooth-presence");
    expect(presence?.valueCodeableConcept?.coding?.[0]).toEqual(
      expect.objectContaining({ system: "http://snomed.info/sct", code: "278661005" }),
    );

    const endo = component(obs, "root-endodontic-state");
    expect(endo?.valueCodeableConcept?.coding?.[0]).toEqual(
      expect.objectContaining({ system: "http://snomed.info/sct", code: "718392007" }),
    );

    const type = component(obs, "restoration-type");
    expect(type?.valueCodeableConcept?.coding?.[0]).toEqual(
      expect.objectContaining({ system: DENTAL_DE_RESTORATION_TYPE_SYSTEM, code: "onlay" }),
    );

    const material = component(obs, "restoration-material");
    expect(material?.valueCodeableConcept?.coding?.[0]).toEqual(
      expect.objectContaining({ system: DENTAL_DE_MATERIAL_SYSTEM, code: "lithiumdisilikat" }),
    );
  });

  it("uses CodeableConcept.text under the extensible bindings instead of inventing a code", () => {
    const bundle = buildFhirBundle(
      {
        version: "2.20",
        globals: {},
        teeth: { "11": { toothSelection: "tooth-base", endo: "endo-filling-incomplete" } },
      },
      { dialect: "dental-de", effectiveDateTime: EFFECTIVE },
    );
    const obs = byProfile(bundle, DENTAL_DE_ODONTOGRAM_PROFILE)[0];
    const endo = component(obs, "root-endodontic-state");
    expect(endo?.valueCodeableConcept?.coding).toBeUndefined();
    expect(endo?.valueCodeableConcept?.text).toMatch(/incomplete/i);
    // No engine-local coding is ever presented as canonical Dental-DE terminology.
    const systems = JSON.stringify(bundle);
    expect(systems).not.toContain(LOCAL_SYSTEM);
  });

  it("maps a root remnant and a missing tooth to their canonical presence codes", () => {
    const bundle = buildFhirBundle(
      {
        version: "2.20",
        globals: {},
        teeth: {
          "18": { toothSelection: "tooth-base", toothSubstrate: "radix" },
          "25": { toothSelection: "none" },
        },
      },
      { dialect: "dental-de", effectiveDateTime: EFFECTIVE },
    );
    const all = byProfile(bundle, DENTAL_DE_ODONTOGRAM_PROFILE);
    const radix = all.find((o) => toothOf(o) === "18");
    const missing = all.find((o) => toothOf(o) === "25");
    expect(component(radix!, "tooth-presence")?.valueCodeableConcept?.coding?.[0]?.code).toBe("66569006");
    expect(component(missing!, "tooth-presence")?.valueCodeableConcept?.coding?.[0]?.code).toBe("234948008");
  });

  it("carries restoration surfaces on the repeatable ToothSurfacesExt, one code per extension", () => {
    const bundle = buildFhirBundle(
      {
        version: "2.20",
        globals: {},
        teeth: {
          "46": {
            toothSelection: "tooth-base",
            restorationType: "inlay",
            restorationMaterial: "zircon",
            fillingSurfaces: ["mesial", "occlusal"],
          },
        },
      },
      { dialect: "dental-de", effectiveDateTime: EFFECTIVE },
    );
    const obs = byProfile(bundle, DENTAL_DE_ODONTOGRAM_PROFILE)[0];
    expect(surfacesOf(component(obs, "restoration-type"))).toEqual(["M", "O"]);
    expect(surfacesOf(component(obs, "restoration-material"))).toEqual(["M", "O"]);
  });

  it("emits CariesObservationDE per surface with ICDAS scores and tooth-aware surface codes", () => {
    const bundle = buildFhirBundle(
      {
        version: "2.20",
        globals: {},
        teeth: {
          "46": {
            toothSelection: "tooth-base",
            caries: ["caries-occlusal"],
            cariesSeverity: { occlusal: 4 },
          },
          "11": {
            toothSelection: "tooth-base",
            caries: ["caries-occlusal", "caries-buccal"],
            cariesSeverity: { occlusal: 2, buccal: 5 },
          },
        },
      },
      { dialect: "dental-de", effectiveDateTime: EFFECTIVE },
    );
    const caries = byProfile(bundle, DENTAL_DE_CARIES_PROFILE);
    expect(caries.length).toBe(3);

    const posterior = caries.find((o) => toothOf(o) === "46")!;
    expect((posterior.code?.coding ?? [])).toContainEqual(
      expect.objectContaining({ system: DENTAL_DE_ASSESSMENT_SYSTEM, code: "icdas-caries-assessment" }),
    );
    expect(posterior.valueCodeableConcept?.coding?.[0]).toEqual(
      expect.objectContaining({ system: DENTAL_DE_ICDAS_SYSTEM, code: "4" }),
    );
    expect(surfacesOf(posterior.bodySite)).toEqual(["O"]);

    // Anterior tooth: the occlusal surface is INCISAL in FDI-surface terms.
    const anteriorOcclusal = caries.find(
      (o) => toothOf(o) === "11" && surfacesOf(o.bodySite).includes("I"),
    );
    expect(anteriorOcclusal).toBeDefined();
    expect(anteriorOcclusal!.valueCodeableConcept?.coding?.[0]?.code).toBe("2");

    const anteriorBuccal = caries.find(
      (o) => toothOf(o) === "11" && surfacesOf(o.bodySite).includes("B"),
    );
    expect(anteriorBuccal!.valueCodeableConcept?.coding?.[0]?.code).toBe("5");
  });

  it("routes recurrent caries, subcrown caries and radiographic depth through DentalFindingDE, never ICDAS", () => {
    const { bundle, report } = buildDentalDeBundle(
      {
        version: "2.20",
        globals: {},
        teeth: {
          "46": {
            toothSelection: "tooth-base",
            caries: ["caries-occlusal", "caries-subcrown"],
            cariesSeverity: { occlusal: 3, subcrown: 2 },
            fillingSurfaces: ["occlusal"],
            fillingSurfaceMaterials: { occlusal: "composite" },
            rootCaries: "active",
            radiographicDepth: { occlusal: "D2" },
          },
        },
      },
      { effectiveDateTime: EFFECTIVE },
    );
    // The occlusal surface carries a filling, so its severity is a CARS
    // recurrent-caries score; ICDASCariesScoreCS scopes restoration status out.
    expect(byProfile(bundle, DENTAL_DE_CARIES_PROFILE)).toHaveLength(0);

    const findings = byProfile(bundle, DENTAL_DE_FINDING_PROFILE);
    const texts = findings.map((o) => o.code?.text ?? "");
    expect(texts.some((t) => /recurrent caries/i.test(t))).toBe(true);
    expect(texts.some((t) => /subcrown/i.test(t))).toBe(true);
    expect(texts.some((t) => /radiographic/i.test(t))).toBe(true);
    // Root caries rides the odontogram profile's extensible root/endodontic slice.
    const odonto = byProfile(bundle, DENTAL_DE_ODONTOGRAM_PROFILE)[0];
    const rootStates = (odonto.component ?? [])
      .filter((c) => (c.code?.coding ?? []).some((x) => x.code === "root-endodontic-state"))
      .map((c) => c.valueCodeableConcept?.text ?? "");
    expect(rootStates.some((t) => /root caries/i.test(t))).toBe(true);

    // Everything emitted as text under an extensible binding is reported, so a
    // consumer can see it is a source assessment and not a coded concept.
    const textFields = report.textFallback.map((u) => u.field);
    expect(textFields).toContain("rootCaries");
    expect(textFields).toContain("radiographicDepth");
    expect(textFields).toContain("cariesSeverity");
    for (const entry of [...report.textFallback, ...report.unmapped]) {
      expect(entry.tooth).toBe("46");
      expect(entry.reason).toBeTruthy();
    }
  });

  it("omits an unmapped material rather than forcing it into the required binding", () => {
    const { bundle, report } = buildDentalDeBundle(
      {
        version: "2.20",
        globals: {},
        teeth: { "46": { toothSelection: "tooth-base", restorationType: "crown", restorationMaterial: "telescope" } },
      },
      { effectiveDateTime: EFFECTIVE },
    );
    const obs = byProfile(bundle, DENTAL_DE_ODONTOGRAM_PROFILE)[0];
    expect(component(obs, "restoration-type")?.valueCodeableConcept?.coding?.[0]?.code).toBe("krone");
    expect(component(obs, "restoration-material")).toBeUndefined();
    expect(report.unmapped.map((u) => u.field)).toContain("restorationMaterial");
  });

  it("emits crown leakage and filling defects on the extensible restoration-status slice", () => {
    const bundle = buildFhirBundle(
      {
        version: "2.20",
        globals: {},
        teeth: {
          "46": {
            toothSelection: "tooth-base",
            restorationType: "crown",
            crownLeakage: true,
          },
          "36": {
            toothSelection: "tooth-base",
            fillingSurfaceMaterials: { occlusal: "composite" },
            fillingDefect: { occlusal: "marginal" },
          },
        },
      },
      { dialect: "dental-de", effectiveDateTime: EFFECTIVE },
    );
    const all = byProfile(bundle, DENTAL_DE_ODONTOGRAM_PROFILE);
    const leaking = all.find((o) => toothOf(o) === "46")!;
    expect(component(leaking, "restoration-status")?.valueCodeableConcept?.text).toMatch(/leakage/i);

    const defective = all.find((o) => toothOf(o) === "36")!;
    const status = (defective.component ?? []).find((c) =>
      (c.code?.coding ?? []).some((x) => x.code === "restoration-status"),
    );
    expect(status?.valueCodeableConcept?.text).toMatch(/marginal/i);
    expect(surfacesOf(status)).toEqual(["O"]);
  });

  it("stays pure: identical input yields byte-identical output", () => {
    const a = buildFhirBundle(RESTORED_TOOTH, { dialect: "dental-de", effectiveDateTime: EFFECTIVE });
    const b = buildFhirBundle(RESTORED_TOOTH, { dialect: "dental-de", effectiveDateTime: EFFECTIVE });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("odontogram-3l1 AC3: canonical read-back and legacy tolerance", () => {
  it("reads a canonical bundle back into the UI-domain document", () => {
    const bundle = buildFhirBundle(RESTORED_TOOTH, { dialect: "dental-de", effectiveDateTime: EFFECTIVE });
    const payload = parseFhirBundle(bundle);
    expect(payload.teeth["46"].toothSelection).toBe("tooth-base");
    expect(payload.teeth["46"].restorationType).toBe("onlay");
    expect(payload.teeth["46"].restorationMaterial).toBe("emax");
    expect(payload.teeth["46"].endo).toBe("endo-filling");
  });

  it("reads canonical caries observations back, including combo and incisal surface codes", () => {
    const bundle: Bundle = {
      resourceType: "Bundle",
      type: "collection",
      entry: [
        {
          resource: {
            resourceType: "Observation",
            meta: { profile: [DENTAL_DE_CARIES_PROFILE] },
            status: "final",
            code: { coding: [{ system: DENTAL_DE_ASSESSMENT_SYSTEM, code: "icdas-caries-assessment" }] },
            subject: { reference: "Patient/x" },
            bodySite: {
              coding: [{ system: DENTAL_DE_FDI_SYSTEM, code: "46" }],
              extension: [
                {
                  url: TOOTH_SURFACES_EXT_URL,
                  valueCodeableConcept: { coding: [{ system: FDI_SURFACE_SYSTEM, code: "MOD" }] },
                },
              ],
            },
            valueCodeableConcept: { coding: [{ system: DENTAL_DE_ICDAS_SYSTEM, code: "3" }] },
          } as Observation,
        },
        {
          resource: {
            resourceType: "Observation",
            meta: { profile: [DENTAL_DE_CARIES_PROFILE] },
            status: "final",
            code: { coding: [{ system: DENTAL_DE_ASSESSMENT_SYSTEM, code: "icdas-caries-assessment" }] },
            subject: { reference: "Patient/x" },
            bodySite: {
              coding: [{ system: DENTAL_DE_FDI_SYSTEM, code: "11" }],
              extension: [
                {
                  url: TOOTH_SURFACES_EXT_URL,
                  valueCodeableConcept: { coding: [{ system: FDI_SURFACE_SYSTEM, code: "I" }] },
                },
                {
                  url: TOOTH_SURFACES_EXT_URL,
                  valueCodeableConcept: { coding: [{ system: FDI_SURFACE_SYSTEM, code: "V" }] },
                },
              ],
            },
            valueCodeableConcept: { coding: [{ system: DENTAL_DE_ICDAS_SYSTEM, code: "5" }] },
          } as Observation,
        },
      ],
    };
    const payload = parseFhirBundle(bundle);
    expect(payload.teeth["46"].caries?.sort()).toEqual(
      ["caries-distal", "caries-mesial", "caries-occlusal"].sort(),
    );
    expect(payload.teeth["46"].cariesSeverity).toEqual({ mesial: 3, occlusal: 3, distal: 3 });
    // I maps back to the engine's "occlusal" key; V (vestibular) to "buccal".
    expect(payload.teeth["11"].caries?.sort()).toEqual(["caries-buccal", "caries-occlusal"].sort());
    expect(payload.teeth["11"].cariesSeverity).toEqual({ occlusal: 5, buccal: 5 });
  });

  it("reads back every text-fallback value the canonical emitter writes", () => {
    const payload: OdontogramExportPayload = {
      version: "2.20",
      globals: {},
      teeth: {
        "46": {
          toothSelection: "tooth-base",
          endo: "endo-filling-incomplete",
          rootCaries: "active",
          resorptionType: "internal",
          apicalDx: "chronic-apical-abscess",
          periapicalType: "cyst",
          prosthesis: "removable-partial",
          restorationType: "crown",
          crownLeakage: true,
          fillingSurfaceMaterials: { occlusal: "composite" },
          fillingDefect: { occlusal: "marginal" },
          radiographicDepth: { distal: "D2" },
          note: "Review at recall.",
        },
      },
    };
    const bundle = buildFhirBundle(payload, { dialect: "dental-de", effectiveDateTime: EFFECTIVE });
    const back = parseFhirBundle(bundle).teeth["46"];

    expect(back.toothSelection).toBe("tooth-base");
    expect(back.endo).toBe("endo-filling-incomplete");
    expect(back.rootCaries).toBe("active");
    expect(back.resorptionType).toBe("internal");
    expect(back.apicalDx).toBe("chronic-apical-abscess");
    expect(back.periapicalType).toBe("cyst");
    expect(back.prosthesis).toBe("removable-partial");
    expect(back.restorationType).toBe("crown");
    expect(back.crownLeakage).toBe(true);
    expect(back.fillingDefect).toEqual({ occlusal: "marginal" });
    expect(back.radiographicDepth).toEqual({ distal: "D2" });
    expect(back.note).toBe("Review at recall.");
  });

  it("reads back recurrent and subcrown caries emitted as DentalFindingDE", () => {
    const payload: OdontogramExportPayload = {
      version: "2.20",
      globals: {},
      teeth: {
        "46": {
          toothSelection: "tooth-base",
          caries: ["caries-occlusal", "caries-subcrown", "caries-distal"],
          cariesSeverity: { occlusal: 3, subcrown: 2, distal: 5 },
          fillingSurfaceMaterials: { occlusal: "composite" },
        },
      },
    };
    const bundle = buildFhirBundle(payload, { dialect: "dental-de", effectiveDateTime: EFFECTIVE });
    const back = parseFhirBundle(bundle).teeth["46"];

    expect(back.caries?.sort()).toEqual(
      ["caries-distal", "caries-occlusal", "caries-subcrown"].sort(),
    );
    // The occlusal surface is restored, and its CARS score survives even though
    // it was NOT emitted as an ICDAS value.
    expect(back.cariesSeverity).toEqual({ occlusal: 3, subcrown: 2, distal: 5 });
  });

  it("still accepts the previously supported legacy bundle representation", () => {
    const legacy = buildFhirBundle(RESTORED_TOOTH);
    const payload = parseFhirBundle(legacy);
    // The legacy dialect skips the default `tooth-base` selection (hydrateState
    // re-applies it); the clinical axes must still come back unchanged.
    expect(payload.teeth["46"].toothSelection).toBeUndefined();
    expect(payload.teeth["46"].restorationType).toBe("onlay");
    expect(payload.teeth["46"].restorationMaterial).toBe("emax");
    expect(payload.teeth["46"].endo).toBe("endo-filling");
  });

  it("reads a mixed legacy + canonical bundle without dropping either half", () => {
    const legacy = buildFhirBundle(
      { version: "2.20", globals: {}, teeth: { "36": { toothSelection: "implant" } } },
    );
    const canonical = buildFhirBundle(RESTORED_TOOTH, { dialect: "dental-de", effectiveDateTime: EFFECTIVE });
    const mixed: Bundle = {
      resourceType: "Bundle",
      type: "collection",
      entry: [...(legacy.entry ?? []), ...(canonical.entry ?? [])],
    };
    const payload = parseFhirBundle(mixed);
    expect(payload.teeth["36"].toothSelection).toBe("implant");
    expect(payload.teeth["46"].restorationType).toBe("onlay");
  });
});
