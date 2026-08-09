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
  SNOMED_SYSTEM,
  VERIFIED_SCT,
  SCT_PROVENANCE,
  rootCariesSct,
  resorptionSct,
  apicalDxSct,
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
    // Bead odontogram-chz: root caries is an admitted, verified concept, so it
    // is coded and no longer a text fallback.
    expect(report.textFallback.map((u) => u.field)).not.toContain("rootCaries");

    // Everything emitted as text under an extensible binding is reported, so a
    // consumer can see it is a source assessment and not a coded concept.
    const textFields = report.textFallback.map((u) => u.field);
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

  it("reads back the newly coded root/restoration values unchanged (odontogram-chz)", () => {
    const payload: OdontogramExportPayload = {
      version: "2.20",
      globals: {},
      teeth: {
        "46": {
          toothSelection: "tooth-base",
          rootCaries: "arrested",
          resorptionType: "external-cervical",
          apicalDx: "symptomatic-apical-periodontitis",
          restorationType: "crown",
          crownLeakage: true,
          fillingSurfaceMaterials: { occlusal: "composite", buccal: "composite" },
          fillingDefect: { occlusal: "fracture", buccal: "wear" },
        },
      },
    };
    const bundle = buildFhirBundle(payload, { dialect: "dental-de", effectiveDateTime: EFFECTIVE });
    const back = parseFhirBundle(bundle).teeth["46"];

    expect(back.rootCaries).toBe("arrested");
    expect(back.resorptionType).toBe("external-cervical");
    expect(back.apicalDx).toBe("symptomatic-apical-periodontitis");
    expect(back.crownLeakage).toBe(true);
    expect(back.fillingDefect).toEqual({ occlusal: "fracture", buccal: "wear" });
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

// ---------------------------------------------------------------------------
// odontogram-chz: widened SNOMED coverage
// ---------------------------------------------------------------------------

/**
 * The complete membership of the IG artifacts this adapter may draw codes from,
 * transcribed from `input/fsh/valuesets/<name>.fsh` and
 * `input/fsh/profiles/<name>.fsh` in `fhir-dental-de` at commit `27e0b7f`
 * (bead odontogram-18h; previously `2a352fc`). Pinning the membership here —
 * rather than only the ValueSet NAMES — is what makes the provenance assertion
 * an external constraint: a code added to `VERIFIED_SCT` that the IG does not
 * actually admit fails this test instead of passing it.
 */
const ADMITTED_VALUE_SET_MEMBERS: Record<string, string[]> = {
  ToothPresenceStateVS: ["278661005", "234948008", "66569006", "110294004", "5639000", "234972003"],
  RootEndodonticStateVS: ["234975001", "41918006", "52994003", "39273001", "718392007"],
  RestorationStatusVS: ["109728009", "109729001", "109735001", "702645001"],
  ProstheticStateVS: [
    "278630001", "278631002", "699710002", "699828007", "699856002", "699857006",
    "702529006", "702530001", "710783007", "710784001", "711285008",
  ],
  // Bead odontogram-5cz: the periodontal profiles do not bind a ValueSet on
  // these positions — they FIX the SCTID on the component slice, which admits
  // nothing else there. The lists below are the fixed codes of each profile.
  // Bead odontogram-18h: IG PR #94 corrected recession `6288001` -> `4356008`
  // and bleeding on probing `86276007` -> `249420004` on both profiles.
  "PeriodontalObservationDE (fixed component code)": [
    "4356008", "249420004", "771311009", "109728009", "251307008",
  ],
  "PeriodontalObservationDE / PeriImplantObservationDE (fixed component code)": ["249420004"],
};

/**
 * The SNOMED CT membership of `PeriodontalFindingCodesVS`, transcribed from
 * `input/fsh/valuesets/PeriodontalFindingCodesVS.fsh` at `27e0b7f`.
 *
 * This ValueSet is NOT the admission source for the periodontal component
 * codes — the profiles FIX those on their slices, which is stronger, and the
 * two sets are deliberately not identical (`251307008`, fixed on
 * `component[plaqueIndex]`, is not a ValueSet member). It is pinned because IG
 * PR #94 rewrote it in the same change: it now carries the corrected
 * `4356008` and `249420004`, publishes no displays at all (SNOMED displays are
 * licensed), and dropped the localized/generalized alveolar-bone-loss members
 * `427936003` and `428245007`, because extent is a separate axis
 * (`ebz-par-ausmass-verteilung`).
 */
const PERIODONTAL_FINDING_CODES_VS_SCT = [
  "109629007", "4356008", "249420004", "771311009", "109728009", "2556008", "109706009",
];

/** Every SNOMED coding anywhere in a bundle (components and values alike). */
function snomedCodings(bundle: Bundle): Array<{ system?: string; code?: string; display?: string }> {
  const out: Array<{ system?: string; code?: string; display?: string }> = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (!node || typeof node !== "object") return;
    const rec = node as Record<string, unknown>;
    if (rec.system === SNOMED_SYSTEM && typeof rec.code === "string") {
      out.push(rec as { system?: string; code?: string; display?: string });
    }
    for (const value of Object.values(rec)) walk(value);
  };
  walk(bundle.entry ?? []);
  return out;
}

function rootStates(obs: Observation): Array<{ code?: string; text?: string }> {
  return (obs.component ?? [])
    .filter((c) => (c.code?.coding ?? []).some((x) => x.code === "root-endodontic-state"))
    .map((c) => ({
      code: c.valueCodeableConcept?.coding?.find((x) => x.system === SNOMED_SYSTEM)?.code,
      text: c.valueCodeableConcept?.text,
    }));
}

function restorationStates(obs: Observation): Array<{ code?: string; text?: string; surfaces: string[] }> {
  return (obs.component ?? [])
    .filter((c) => (c.code?.coding ?? []).some((x) => x.code === "restoration-status"))
    .map((c) => ({
      code: c.valueCodeableConcept?.coding?.find((x) => x.system === SNOMED_SYSTEM)?.code,
      text: c.valueCodeableConcept?.text,
      surfaces: surfacesOf(c),
    }));
}

describe("odontogram-chz: verified SNOMED coverage", () => {
  it("every widened SCTID is admitted by the IG artifact its provenance names and carries no invented display", () => {
    // Nothing is emitted that the provenance table does not account for.
    for (const [key, code] of Object.entries(VERIFIED_SCT)) {
      const entry = SCT_PROVENANCE[key as keyof typeof VERIFIED_SCT];
      expect(entry, `missing provenance for ${key}`).toBeDefined();
      expect(entry.code).toBe(code);
      expect(entry.meaning.length).toBeGreaterThan(0);
      expect(entry.verifiedBy.length).toBeGreaterThan(0);
      // The named ValueSet must exist AND actually admit this code.
      const members = ADMITTED_VALUE_SET_MEMBERS[entry.valueSet];
      expect(members, `unknown ValueSet ${entry.valueSet} for ${key}`).toBeDefined();
      expect(members, `${entry.valueSet} does not admit ${code}`).toContain(code);
    }

    const payload: OdontogramExportPayload = {
      version: "2.20",
      globals: {},
      teeth: {
        "46": {
          toothSelection: "tooth-base",
          endo: "endo-filling",
          rootCaries: "active",
          resorptionType: "internal",
          apicalDx: "asymptomatic-apical-periodontitis",
          restorationType: "crown",
          crownLeakage: true,
        },
        "18": { toothSelection: "tooth-base", toothSubstrate: "radix" },
        "25": { toothSelection: "none" },
      },
    };
    const { bundle } = buildDentalDeBundle(payload, { effectiveDateTime: EFFECTIVE });
    const codings = snomedCodings(bundle);
    expect(codings.length).toBeGreaterThan(0);
    const admitted = new Set<string>(Object.values(VERIFIED_SCT));
    for (const coding of codings) {
      expect(admitted, `unadmitted SCTID ${coding.code}`).toContain(coding.code);
      // The IG publishes these SCTIDs without displays because the displays are
      // licensed; inventing one would put an unverified string on the wire.
      expect(coding.display).toBeUndefined();
    }
  });

  it("codes only whitelisted engine values and leaves an unrecognized one on text", () => {
    // Every mapper is a whitelist, not a not-"none" test: a value whose meaning
    // was never verified must never acquire a canonical SNOMED assertion, even
    // if a later payload version introduces it.
    expect(rootCariesSct("none")).toBeUndefined();
    expect(rootCariesSct("")).toBeUndefined();
    expect(rootCariesSct("rampant")).toBeUndefined();
    for (const value of ["active", "arrested", "active-cavitated"]) {
      expect(rootCariesSct(value)).toBe("234975001");
    }
    expect(resorptionSct("replacement")).toBeUndefined();
    expect(apicalDxSct("condensing-osteitis")).toBeUndefined();

    const { bundle, report } = buildDentalDeBundle(
      {
        version: "2.20",
        globals: {},
        // An unrecognized value stands in for a future payload version the
        // installed adapter has not verified yet.
        teeth: { "46": { toothSelection: "tooth-base", rootCaries: "rampant" } },
      },
      { effectiveDateTime: EFFECTIVE },
    );
    const obs = byProfile(bundle, DENTAL_DE_ODONTOGRAM_PROFILE)[0];
    expect(rootStates(obs)).toEqual([{ code: undefined, text: "rampant" }]);
    expect(report.textFallback.map((e) => e.field)).toContain("rootCaries");
  });

  it("codes root caries, resorption and apical periodontitis on the root-endodontic slice", () => {
    const { bundle } = buildDentalDeBundle(
      {
        version: "2.20",
        globals: {},
        teeth: {
          "46": {
            toothSelection: "tooth-base",
            rootCaries: "active-cavitated",
            resorptionType: "internal",
            apicalDx: "symptomatic-apical-periodontitis",
          },
          "36": {
            toothSelection: "tooth-base",
            resorptionType: "external-cervical",
            apicalDx: "asymptomatic-apical-periodontitis",
          },
        },
      },
      { effectiveDateTime: EFFECTIVE },
    );
    const all = byProfile(bundle, DENTAL_DE_ODONTOGRAM_PROFILE);
    const upper = rootStates(all.find((o) => toothOf(o) === "46")!);
    const lower = rootStates(all.find((o) => toothOf(o) === "36")!);

    // Root caries: the admitted concept is exact for every graded engine value,
    // and the grade itself survives in `.text`.
    expect(upper).toContainEqual({ code: "234975001", text: "Active cavitated root caries" });
    // Internal resorption: an exact admitted concept.
    expect(upper).toContainEqual({ code: "52994003", text: "Internal root resorption" });
    // Apical periodontitis: the admitted parent of both AAE variants.
    expect(upper).toContainEqual({ code: "39273001", text: "Symptomatic apical periodontitis" });
    expect(lower).toContainEqual({ code: "39273001", text: "Asymptomatic apical periodontitis" });
    // External cervical resorption is a descendant of the admitted parent, so
    // the parent is emitted and the exact source value stays in `.text`.
    expect(lower).toContainEqual({ code: "41918006", text: "External cervical root resorption" });
  });

  it("codes crown leakage and filling defects as defective dental restoration", () => {
    const { bundle } = buildDentalDeBundle(
      {
        version: "2.20",
        globals: {},
        teeth: {
          "46": { toothSelection: "tooth-base", restorationType: "crown", crownLeakage: true },
          "36": {
            toothSelection: "tooth-base",
            fillingSurfaceMaterials: { occlusal: "composite", buccal: "composite", distal: "composite" },
            fillingDefect: { occlusal: "marginal", buccal: "fracture", distal: "wear" },
          },
        },
      },
      { effectiveDateTime: EFFECTIVE },
    );
    const all = byProfile(bundle, DENTAL_DE_ODONTOGRAM_PROFILE);

    const leakage = restorationStates(all.find((o) => toothOf(o) === "46")!);
    expect(leakage).toHaveLength(1);
    expect(leakage[0].code).toBe("109728009");
    expect(leakage[0].text).toMatch(/leakage/i);

    const defects = restorationStates(all.find((o) => toothOf(o) === "36")!);
    expect(defects).toHaveLength(3);
    for (const defect of defects) expect(defect.code).toBe("109728009");
    // Surface qualification is untouched by the widened coding.
    expect(defects.map((d) => d.surfaces).sort()).toEqual([["B"], ["D"], ["O"]].sort());
  });

  it("drops newly coded fields from textFallback and keeps the unverifiable ones", () => {
    const { report } = buildDentalDeBundle(
      {
        version: "2.20",
        globals: {},
        teeth: {
          "46": {
            toothSelection: "tooth-base",
            rootCaries: "active",
            resorptionType: "external-cervical",
            apicalDx: "symptomatic-apical-periodontitis",
            restorationType: "crown",
            crownLeakage: true,
            fillingSurfaceMaterials: { occlusal: "composite" },
            fillingDefect: { occlusal: "marginal" },
          },
          "36": {
            toothSelection: "tooth-under-gum",
            endo: "endo-filling-incomplete",
            apicalDx: "chronic-apical-abscess",
            periapicalType: "cyst",
            prosthesis: "removable-partial",
          },
        },
      },
      { effectiveDateTime: EFFECTIVE },
    );
    const coded = report.textFallback.filter((e) => e.tooth === "46").map((e) => e.field);
    expect(coded).not.toContain("rootCaries");
    expect(coded).not.toContain("resorptionType");
    expect(coded).not.toContain("apicalDx");
    expect(coded).not.toContain("crownLeakage");
    expect(coded).not.toContain("fillingDefect");

    const stillText = report.textFallback.filter((e) => e.tooth === "36").map((e) => e.field);
    expect(stillText).toContain("toothSelection");
    expect(stillText).toContain("endo");
    expect(stillText).toContain("apicalDx");
    expect(stillText).toContain("periapicalType");
    expect(stillText).toContain("prosthesis");
    for (const entry of report.textFallback) expect(entry.reason).toBeTruthy();
  });

  it("read-back is unchanged and prosthetic/eruption values stay text", () => {
    const payload: OdontogramExportPayload = {
      version: "2.20",
      globals: {},
      teeth: {
        "46": {
          toothSelection: "tooth-under-gum",
          prosthesis: "removable-full",
          apicalDx: "acute-apical-abscess",
        },
      },
    };
    const { bundle } = buildDentalDeBundle(payload, { effectiveDateTime: EFFECTIVE });
    const obs = byProfile(bundle, DENTAL_DE_ODONTOGRAM_PROFILE)[0];

    // ToothPresenceStateVS's remaining members are eruption timing/disturbance
    // concepts; the engine has no value that entails any of them.
    expect(component(obs, "tooth-presence")?.valueCodeableConcept?.coding).toBeUndefined();
    // ProstheticStateVS admits denture failure findings only; the engine's
    // `prosthesis` axis names a device type, which the IG carries as a Device.
    expect(component(obs, "prosthetic-state")?.valueCodeableConcept?.coding).toBeUndefined();
    // An apical abscess is not subsumed by the admitted apical-periodontitis
    // concept, so it stays text.
    expect(rootStates(obs)).toContainEqual({ code: undefined, text: "Acute apical abscess" });

    const back = parseFhirBundle(bundle).teeth["46"];
    expect(back.toothSelection).toBe("tooth-under-gum");
    expect(back.prosthesis).toBe("removable-full");
    expect(back.apicalDx).toBe("acute-apical-abscess");
  });
});

// ---------------------------------------------------------------------------
// odontogram-18h: the IG's SNOMED cleanup (fhir-dental-de PRs #94-96, 27e0b7f)
// ---------------------------------------------------------------------------

describe("odontogram-18h: IG ValueSet pins at 27e0b7f", () => {
  it("draws every periodontal SNOMED code from a slice the IG fixes and carries no display", () => {
    const payload: OdontogramExportPayload = {
      version: "2.21",
      globals: {},
      teeth: {
        // A fully charted natural molar and an implant position, so every
        // SNOMED code either periodontal profile can carry is on the wire.
        "16": {
          toothSelection: "tooth-base",
          perio: {
            pd: { MB: 5, B: 4, DB: 5, ML: 4, L: 3, DL: 4 },
            gm: { MB: 2, B: -1, DB: 0 },
            bop: ["MB"],
            sup: ["MB"],
          },
          furcation: { buccal: 2 },
          plaque: ["buccal"],
          pi: { buccal: 2 },
          gi: { buccal: 1 },
          kg: 4,
        },
        "36": {
          toothSelection: "implant",
          perio: { pd: { MB: 4 }, gm: {}, bop: ["MB"], sup: [] },
          mpi: { buccal: 1 },
          mbi: { buccal: 2 },
        },
      },
    } as OdontogramExportPayload;
    const { bundle } = buildDentalDeBundle(payload, { effectiveDateTime: EFFECTIVE });

    const perioProfiles = [
      "https://fhir.cognovis.de/dental/StructureDefinition/periodontal-observation",
      "https://fhir.cognovis.de/dental/StructureDefinition/peri-implant-observation",
    ];
    const perioCodings = perioProfiles
      .flatMap((profile) => byProfile(bundle, profile))
      .flatMap((o) => (o.component ?? []))
      .flatMap((c) => [...(c.code?.coding ?? []), ...(c.valueCodeableConcept?.coding ?? [])])
      .filter((c) => c.system === SNOMED_SYSTEM);

    // The fixed component codes of the two periodontal profiles are the
    // admission source; every SNOMED code on the wire must be one of them.
    const fixedPerioCodes = [
      ...ADMITTED_VALUE_SET_MEMBERS["PeriodontalObservationDE (fixed component code)"],
      ...ADMITTED_VALUE_SET_MEMBERS[
        "PeriodontalObservationDE / PeriImplantObservationDE (fixed component code)"],
    ];
    expect(perioCodings.length).toBeGreaterThan(0);
    for (const coding of perioCodings) {
      expect(fixedPerioCodes, `unadmitted periodontal SCTID ${coding.code}`).toContain(coding.code);
      expect(coding.display).toBeUndefined();
    }

    // The two concepts this bead adopts are additionally ValueSet members, so a
    // regression in either artifact is visible here.
    for (const code of [VERIFIED_SCT.bleedingOnProbing, VERIFIED_SCT.gingivalRecession]) {
      expect(PERIODONTAL_FINDING_CODES_VS_SCT).toContain(code);
      expect(perioCodings.map((c) => c.code)).toContain(code);
    }
  });

  it("keeps the retired codes out of the pins and out of the wire", () => {
    for (const retired of ["6288001", "86276007", "427936003", "428245007"]) {
      expect(PERIODONTAL_FINDING_CODES_VS_SCT).not.toContain(retired);
      expect(Object.values(VERIFIED_SCT)).not.toContain(retired);
      for (const members of Object.values(ADMITTED_VALUE_SET_MEMBERS)) {
        expect(members, retired).not.toContain(retired);
      }
    }
  });
});
