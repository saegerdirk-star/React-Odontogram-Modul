// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
//
// Bead odontogram-5cz: the canonical `dental-de` dialect emits the periodontal
// examination against `PeriodontalObservationDE` / `PeriImplantObservationDE`
// instead of reporting it as unmapped.
//
// Canonical identifiers are taken from the published IG definition on
// fhir-dental-de main (merge 2a352fc): `PeriodontalObservationDE`
// (`periodontal-observation`), `PeriImplantObservationDE`
// (`peri-implant-observation`), `DentalImplantDE` (`dental-implant`),
// `PeriodontalMeasurementSiteCS`/`-Ext`, `PeriodontalIndexCS`,
// `GlickmanFurcationGradeCS`, `PABefundTypeCS`, `PeriImplantFindingCS`,
// `FdiToothNumberExt`, and `ToothSurfacesExt` over HL7 `FDI-surface`.

import { describe, it, expect } from "vitest";
import { buildFhirBundle } from "../fhir/toFhir";
import { parseFhirBundle } from "../fhir/fromFhir";
import { buildDentalDeBundle } from "../fhir/toFhirDentalDe";
import {
  DENTAL_DE_PERIODONTAL_PROFILE,
  DENTAL_DE_PERI_IMPLANT_PROFILE,
  DENTAL_DE_IMPLANT_DEVICE_PROFILE,
  DENTAL_DE_FDI_SYSTEM,
  PERIODONTAL_SITE_SYSTEM,
  PERIODONTAL_SITE_EXT_URL,
  PERIODONTAL_INDEX_SYSTEM,
  GLICKMAN_FURCATION_SYSTEM,
  PA_BEFUND_TYPE_SYSTEM,
  PERI_IMPLANT_FINDING_SYSTEM,
  FDI_TOOTH_NUMBER_EXT_URL,
  TOOTH_SURFACES_EXT_URL,
  FDI_SURFACE_SYSTEM,
  SNOMED_SYSTEM,
  LOINC_SYSTEM,
  UCUM_SYSTEM,
  DATA_ABSENT_REASON_SYSTEM,
  PERIO_LOINC,
  PA_BEFUND,
  PERIODONTAL_INDEX,
  PERI_IMPLANT_FINDING,
  PERIODONTAL_SITE_CODE,
  GLICKMAN_GRADE_CODE,
  VERIFIED_SCT,
  SCT_PROVENANCE,
  REJECTED_SCT,
} from "../fhir/dentalDeCodesystems";
import type { Bundle, Observation, OdontogramExportPayload } from "../fhir/types";

const EFFECTIVE = "2026-08-09";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function payloadOf(teeth: Record<string, Any>, extra: Partial<OdontogramExportPayload> = {}): OdontogramExportPayload {
  return { version: "2.21", globals: {}, teeth, ...extra } as OdontogramExportPayload;
}

function byProfile(bundle: Bundle, profile: string): Observation[] {
  return (bundle.entry ?? [])
    .map((e) => e.resource as Any)
    .filter((r): r is Observation => !!r && r.resourceType === "Observation"
      && ((r.meta?.profile ?? []) as string[]).includes(profile));
}

function devices(bundle: Bundle): Any[] {
  return (bundle.entry ?? []).map((e) => e.resource as Any).filter((r) => r?.resourceType === "Device");
}

function comps(obs: Observation, system: string, code: string): Any[] {
  return ((obs.component ?? []) as Any[]).filter((c) =>
    (c.code?.coding ?? []).some((x: Any) => x.system === system && x.code === code));
}

function siteOf(comp: Any): string | undefined {
  const ext = (comp.extension ?? []).find((e: Any) => e.url === PERIODONTAL_SITE_EXT_URL);
  return ext?.valueCodeableConcept?.coding?.find((c: Any) => c.system === PERIODONTAL_SITE_SYSTEM)?.code;
}

function surfaceOf(comp: Any): string | undefined {
  const ext = (comp.extension ?? []).find((e: Any) => e.url === TOOTH_SURFACES_EXT_URL);
  return ext?.valueCodeableConcept?.coding?.find((c: Any) => c.system === FDI_SURFACE_SYSTEM)?.code;
}

/** A fully charted natural molar: six sites, signed margins, bleeding,
 *  suppuration, two furcation entrances, plaque, PI, GI and keratinized width. */
const MOLAR_16: Record<string, Any> = {
  toothSelection: "tooth-base",
  perio: {
    pd: { MB: 5, B: 4, DB: 5, ML: 4, L: 3, DL: 4 },
    gm: { MB: 2, B: -1, DB: 0 },
    bop: ["MB", "DB"],
    sup: ["MB"],
  },
  furcation: { buccal: 2, mesial: 1 },
  plaque: ["buccal", "mesial"],
  pi: { buccal: 2 },
  gi: { buccal: 1 },
  kg: 4,
};

/** An implant position with the peri-implant examination Dental-DE defines. */
const IMPLANT_36: Record<string, Any> = {
  toothSelection: "implant",
  perio: { pd: { MB: 4, B: 3 }, gm: {}, bop: ["MB"], sup: [] },
  mpi: { buccal: 1 },
  mbi: { buccal: 2 },
  kg: 3,
};

describe("bead odontogram-5cz — canonical periodontal emission (AC1)", () => {
  it("emits one PeriodontalObservationDE per charted natural tooth with the IG's identifiers", () => {
    const { bundle } = buildDentalDeBundle(payloadOf({ "16": MOLAR_16 }), { effectiveDateTime: EFFECTIVE });
    const panels = byProfile(bundle, DENTAL_DE_PERIODONTAL_PROFILE);
    expect(panels).toHaveLength(1);
    const panel = panels[0] as Any;

    expect(panel.code.coding).toContainEqual({ system: LOINC_SYSTEM, code: PERIO_LOINC.panel });
    expect(panel.status).toBe("final");
    expect(panel.effectiveDateTime).toBe(EFFECTIVE);
    expect(panel.bodySite.coding).toContainEqual({ system: DENTAL_DE_FDI_SYSTEM, code: "16", display: "16" });
  });

  it("carries six-site probing depth as UCUM mm with the periodontal-measurement-site extension", () => {
    const { bundle } = buildDentalDeBundle(payloadOf({ "16": MOLAR_16 }), { effectiveDateTime: EFFECTIVE });
    const panel = byProfile(bundle, DENTAL_DE_PERIODONTAL_PROFILE)[0];
    const pd = comps(panel, LOINC_SYSTEM, PERIO_LOINC.probingDepth);
    expect(pd).toHaveLength(6);
    expect(pd.map(siteOf)).toEqual([
      PERIODONTAL_SITE_CODE.MB, PERIODONTAL_SITE_CODE.B, PERIODONTAL_SITE_CODE.DB,
      PERIODONTAL_SITE_CODE.ML, PERIODONTAL_SITE_CODE.L, PERIODONTAL_SITE_CODE.DL,
    ]);
    expect(pd[0].valueQuantity).toEqual({ value: 5, unit: "mm", system: UCUM_SYSTEM, code: "mm" });
  });

  it("emits the signed gingival margin, derived attachment loss, bleeding and suppuration", () => {
    const { bundle } = buildDentalDeBundle(payloadOf({ "16": MOLAR_16 }), { effectiveDateTime: EFFECTIVE });
    const panel = byProfile(bundle, DENTAL_DE_PERIODONTAL_PROFILE)[0];

    const gm = comps(panel, LOINC_SYSTEM, PERIO_LOINC.gingivalMarginToCej);
    expect(gm.map((c) => [siteOf(c), c.valueQuantity.value])).toEqual([
      [PERIODONTAL_SITE_CODE.MB, 2], [PERIODONTAL_SITE_CODE.B, -1], [PERIODONTAL_SITE_CODE.DB, 0],
    ]);

    const cal = comps(panel, PA_BEFUND_TYPE_SYSTEM, PA_BEFUND.attachmentLoss);
    expect(cal).toHaveLength(6);
    // CAL = pd + gm; the margin defaults to 0 on a charted site with no margin.
    expect(cal.map((c) => c.valueQuantity.value)).toEqual([7, 3, 5, 4, 3, 4]);

    const bop = comps(panel, SNOMED_SYSTEM, VERIFIED_SCT.bleedingOnProbing);
    expect(bop).toHaveLength(6);
    expect(bop.map((c) => c.valueBoolean)).toEqual([true, false, true, false, false, false]);

    const sup = comps(panel, PA_BEFUND_TYPE_SYSTEM, PA_BEFUND.suppuration);
    expect(sup.map((c) => c.valueBoolean)).toEqual([true, false, false, false, false, false]);
  });

  it("emits the Glickman furcation grade with its FDI entrance and the surface indices", () => {
    const { bundle } = buildDentalDeBundle(payloadOf({ "16": MOLAR_16 }), { effectiveDateTime: EFFECTIVE });
    const panel = byProfile(bundle, DENTAL_DE_PERIODONTAL_PROFILE)[0];

    const furcation = comps(panel, SNOMED_SYSTEM, VERIFIED_SCT.furcationInvolvementIndex);
    expect(furcation).toHaveLength(2);
    const graded = furcation.map((c) => [
      surfaceOf(c),
      c.valueCodeableConcept.coding.find((x: Any) => x.system === GLICKMAN_FURCATION_SYSTEM)?.code,
    ]);
    expect(graded).toContainEqual(["B", GLICKMAN_GRADE_CODE[2]]);
    expect(graded).toContainEqual(["M", GLICKMAN_GRADE_CODE[1]]);

    const plaque = comps(panel, LOINC_SYSTEM, PERIO_LOINC.plaquePresence);
    expect(plaque.map((c) => [surfaceOf(c), c.valueBoolean])).toEqual([["M", true], ["B", true]]);

    const pi = comps(panel, SNOMED_SYSTEM, VERIFIED_SCT.plaqueIndexSilnessLoe);
    expect(pi.map((c) => [surfaceOf(c), c.valueInteger])).toEqual([["B", 2]]);

    const gi = comps(panel, PERIODONTAL_INDEX_SYSTEM, PERIODONTAL_INDEX.gingivalIndex);
    expect(gi.map((c) => [surfaceOf(c), c.valueInteger])).toEqual([["B", 1]]);

    const kg = comps(panel, PERIODONTAL_INDEX_SYSTEM, PERIODONTAL_INDEX.keratinizedGingivaWidth);
    expect(kg).toHaveLength(1);
    expect(siteOf(kg[0])).toBe(PERIODONTAL_SITE_CODE.B);
    expect(kg[0].valueQuantity).toEqual({ value: 4, unit: "mm", system: UCUM_SYSTEM, code: "mm" });
  });

  it("emits no periodontal resource for a tooth with no periodontal data", () => {
    const { bundle } = buildDentalDeBundle(
      payloadOf({ "16": { toothSelection: "tooth-base" } }), { effectiveDateTime: EFFECTIVE },
    );
    expect(byProfile(bundle, DENTAL_DE_PERIODONTAL_PROFILE)).toHaveLength(0);
    expect(byProfile(bundle, DENTAL_DE_PERI_IMPLANT_PROFILE)).toHaveLength(0);
  });
});

describe("bead odontogram-5cz — canonical peri-implant emission (AC1)", () => {
  it("routes an implant position to PeriImplantObservationDE focused on a DentalImplantDE Device", () => {
    const { bundle } = buildDentalDeBundle(payloadOf({ "36": IMPLANT_36 }), { effectiveDateTime: EFFECTIVE });
    expect(byProfile(bundle, DENTAL_DE_PERIODONTAL_PROFILE)).toHaveLength(0);

    const panels = byProfile(bundle, DENTAL_DE_PERI_IMPLANT_PROFILE);
    expect(panels).toHaveLength(1);
    const panel = panels[0] as Any;
    expect(panel.code.coding).toContainEqual({
      system: PERI_IMPLANT_FINDING_SYSTEM, code: PERI_IMPLANT_FINDING.assessment,
    });

    const implants = devices(bundle);
    expect(implants).toHaveLength(1);
    const device = implants[0];
    expect((device.meta?.profile ?? [])).toContain(DENTAL_DE_IMPLANT_DEVICE_PROFILE);
    expect(device.status).toBe("active");
    expect(device.type.text).toBeTruthy();
    expect(device.identifier?.length).toBeGreaterThan(0);
    expect(device.extension).toContainEqual({ url: FDI_TOOTH_NUMBER_EXT_URL, valueCode: "36" });

    const deviceEntry = (bundle.entry ?? []).find((e) => (e.resource as Any)?.resourceType === "Device");
    expect(panel.focus).toEqual([{ reference: deviceEntry?.fullUrl }]);
  });

  it("carries the Mombelli indices, implant probing, bleeding and keratinized width", () => {
    const { bundle } = buildDentalDeBundle(payloadOf({ "36": IMPLANT_36 }), { effectiveDateTime: EFFECTIVE });
    const panel = byProfile(bundle, DENTAL_DE_PERI_IMPLANT_PROFILE)[0];

    expect(comps(panel, LOINC_SYSTEM, PERIO_LOINC.probingDepth)).toHaveLength(2);
    expect(comps(panel, SNOMED_SYSTEM, VERIFIED_SCT.bleedingOnProbing).map((c) => c.valueBoolean))
      .toEqual([true, false]);

    const mpi = comps(panel, PERIODONTAL_INDEX_SYSTEM, PERIODONTAL_INDEX.modifiedPlaqueIndex);
    expect(mpi.map((c) => [surfaceOf(c), c.valueInteger])).toEqual([["B", 1]]);
    const mbi = comps(panel, PERIODONTAL_INDEX_SYSTEM, PERIODONTAL_INDEX.modifiedSulcusBleedingIndex);
    expect(mbi.map((c) => [surfaceOf(c), c.valueInteger])).toEqual([["B", 2]]);
    expect(comps(panel, PERIODONTAL_INDEX_SYSTEM, PERIODONTAL_INDEX.keratinizedGingivaWidth)).toHaveLength(1);
  });

  it("does not emit a gingival-margin or attachment-loss component around an implant", () => {
    const { bundle, report } = buildDentalDeBundle(
      payloadOf({ "36": { ...IMPLANT_36, perio: { ...IMPLANT_36.perio, gm: { MB: 1 } } } }),
      { effectiveDateTime: EFFECTIVE },
    );
    const panel = byProfile(bundle, DENTAL_DE_PERI_IMPLANT_PROFILE)[0];
    expect(comps(panel, LOINC_SYSTEM, PERIO_LOINC.gingivalMarginToCej)).toHaveLength(0);
    expect(comps(panel, PA_BEFUND_TYPE_SYSTEM, PA_BEFUND.attachmentLoss)).toHaveLength(0);
    expect(report.unmapped.some((e) => e.tooth === "36" && e.field === "perio.gm")).toBe(true);
  });
});

describe("bead odontogram-5cz — verified terminology (AC2)", () => {
  it("records the verification provenance of every SNOMED concept the periodontal emitter uses", () => {
    for (const key of ["bleedingOnProbing", "furcationInvolvementIndex", "plaqueIndexSilnessLoe"] as const) {
      const entry = SCT_PROVENANCE[key];
      expect(entry.code).toBe(VERIFIED_SCT[key]);
      expect(entry.meaning.length).toBeGreaterThan(0);
      expect(entry.verifiedBy).toMatch(/tx\.fhir\.org/);
    }
  });

  it("refuses the IG's recession SCTID and carries the margin on LOINC 64043-3 instead", () => {
    expect(REJECTED_SCT.gingivalRecession.code).toBe("6288001");
    expect(REJECTED_SCT.gingivalRecession.verifiedMeaning).toBe("Accretion on teeth");
    expect(REJECTED_SCT.gingivalRecession.verifiedBy).toMatch(/tx\.fhir\.org/);

    const { bundle, report } = buildDentalDeBundle(payloadOf({ "16": MOLAR_16 }), { effectiveDateTime: EFFECTIVE });
    const codings = byProfile(bundle, DENTAL_DE_PERIODONTAL_PROFILE)
      .flatMap((o) => ((o.component ?? []) as Any[]))
      .flatMap((c) => (c.code?.coding ?? []) as Any[]);
    expect(codings.some((c) => c.code === REJECTED_SCT.gingivalRecession.code)).toBe(false);
    expect(codings.some((c) => c.system === LOINC_SYSTEM && c.code === PERIO_LOINC.gingivalMarginToCej)).toBe(true);
    expect(report.unmapped.some((e) => e.field === "perio.recession")).toBe(true);
  });

  it("never puts an unverified display string on a periodontal coding", () => {
    const { bundle } = buildDentalDeBundle(payloadOf({ "16": MOLAR_16, "36": IMPLANT_36 }), {
      effectiveDateTime: EFFECTIVE,
    });
    const codings = [
      ...byProfile(bundle, DENTAL_DE_PERIODONTAL_PROFILE),
      ...byProfile(bundle, DENTAL_DE_PERI_IMPLANT_PROFILE),
    ]
      .flatMap((o) => ((o.component ?? []) as Any[]))
      .flatMap((c) => [...((c.code?.coding ?? []) as Any[]), ...((c.valueCodeableConcept?.coding ?? []) as Any[])]);
    expect(codings.length).toBeGreaterThan(0);
    for (const coding of codings) expect(coding.display).toBeUndefined();
  });
});

describe("bead odontogram-5cz — assessment status (AC3)", () => {
  const ASSESSED: Record<string, Any> = {
    toothSelection: "tooth-base",
    perio: { pd: { MB: 3 }, gm: {}, bop: [], sup: [] },
    assessment: {
      "bop:B": "assessed",
      "plaque:buccal": "assessed",
      "pi:buccal": "assessed",
      "gi:buccal": "assessed",
      "furcation:buccal": "assessed",
      "pd:DB": "unmeasurable",
      "pd:ML": "not-assessed",
      "furcation:lingual": "not-applicable",
    },
  };

  it("expresses assessed-normal as an explicit negative or zero result", () => {
    const { bundle } = buildDentalDeBundle(payloadOf({ "16": ASSESSED }), { effectiveDateTime: EFFECTIVE });
    const panel = byProfile(bundle, DENTAL_DE_PERIODONTAL_PROFILE)[0];

    const bopB = comps(panel, SNOMED_SYSTEM, VERIFIED_SCT.bleedingOnProbing)
      .find((c) => siteOf(c) === PERIODONTAL_SITE_CODE.B);
    expect(bopB.valueBoolean).toBe(false);

    expect(comps(panel, LOINC_SYSTEM, PERIO_LOINC.plaquePresence)[0].valueBoolean).toBe(false);
    expect(comps(panel, SNOMED_SYSTEM, VERIFIED_SCT.plaqueIndexSilnessLoe)[0].valueInteger).toBe(0);
    expect(comps(panel, PERIODONTAL_INDEX_SYSTEM, PERIODONTAL_INDEX.gingivalIndex)[0].valueInteger).toBe(0);

    const furcation = comps(panel, SNOMED_SYSTEM, VERIFIED_SCT.furcationInvolvementIndex)
      .find((c) => surfaceOf(c) === "B");
    expect(furcation.valueCodeableConcept.coding).toContainEqual({
      system: GLICKMAN_FURCATION_SYSTEM, code: GLICKMAN_GRADE_CODE[0],
    });
  });

  it("expresses a gap as a standard dataAbsentReason with no value", () => {
    const { bundle } = buildDentalDeBundle(payloadOf({ "16": ASSESSED }), { effectiveDateTime: EFFECTIVE });
    const panel = byProfile(bundle, DENTAL_DE_PERIODONTAL_PROFILE)[0];
    const pd = comps(panel, LOINC_SYSTEM, PERIO_LOINC.probingDepth);

    const unmeasurable = pd.find((c) => siteOf(c) === PERIODONTAL_SITE_CODE.DB);
    expect(unmeasurable.valueQuantity).toBeUndefined();
    expect(unmeasurable.dataAbsentReason.coding).toContainEqual({
      system: DATA_ABSENT_REASON_SYSTEM, code: "unknown",
    });

    const notAssessed = pd.find((c) => siteOf(c) === PERIODONTAL_SITE_CODE.ML);
    expect(notAssessed.dataAbsentReason.coding).toContainEqual({
      system: DATA_ABSENT_REASON_SYSTEM, code: "not-performed",
    });

    const notApplicable = comps(panel, SNOMED_SYSTEM, VERIFIED_SCT.furcationInvolvementIndex)
      .find((c) => surfaceOf(c) === "L");
    expect(notApplicable.dataAbsentReason.coding).toContainEqual({
      system: DATA_ABSENT_REASON_SYSTEM, code: "not-applicable",
    });
  });

  it("satisfies the profile invariant: every component has a value or a dataAbsentReason", () => {
    const { bundle } = buildDentalDeBundle(
      payloadOf({ "16": { ...MOLAR_16, ...ASSESSED }, "36": IMPLANT_36 }), { effectiveDateTime: EFFECTIVE },
    );
    const all = [
      ...byProfile(bundle, DENTAL_DE_PERIODONTAL_PROFILE),
      ...byProfile(bundle, DENTAL_DE_PERI_IMPLANT_PROFILE),
    ].flatMap((o) => ((o.component ?? []) as Any[]));
    expect(all.length).toBeGreaterThan(0);
    for (const c of all) {
      const hasValue = Object.keys(c).some((k) => k.startsWith("value"));
      expect(hasValue || !!c.dataAbsentReason).toBe(true);
      expect(hasValue && !!c.dataAbsentReason).toBe(false);
    }
  });
});

describe("bead odontogram-5cz — canonical round-trip (AC4)", () => {
  it("reads a canonical periodontal bundle back into the same periodontal payload", () => {
    const payload = payloadOf({ "16": MOLAR_16, "36": IMPLANT_36 });
    const bundle = buildFhirBundle(payload, { dialect: "dental-de", effectiveDateTime: EFFECTIVE });
    const back = parseFhirBundle(bundle);

    const molar = back.teeth["16"] as Any;
    expect(molar.perio.pd).toEqual(MOLAR_16.perio.pd);
    expect(molar.perio.gm).toEqual(MOLAR_16.perio.gm);
    expect(molar.perio.bop.sort()).toEqual(["DB", "MB"]);
    expect(molar.perio.sup).toEqual(["MB"]);
    expect(molar.furcation).toEqual(MOLAR_16.furcation);
    expect(molar.plaque.sort()).toEqual(["buccal", "mesial"]);
    expect(molar.pi).toEqual(MOLAR_16.pi);
    expect(molar.gi).toEqual(MOLAR_16.gi);
    expect(molar.kg).toBe(4);

    const implant = back.teeth["36"] as Any;
    expect(implant.perio.pd).toEqual(IMPLANT_36.perio.pd);
    expect(implant.perio.bop).toEqual(["MB"]);
    expect(implant.mpi).toEqual(IMPLANT_36.mpi);
    expect(implant.mbi).toEqual(IMPLANT_36.mbi);
    expect(implant.kg).toBe(3);
  });

  it("ignores absent results and derived attachment loss on read-back", () => {
    const payload = payloadOf({
      "16": {
        toothSelection: "tooth-base",
        perio: { pd: { MB: 3 }, gm: {}, bop: [], sup: [] },
        assessment: { "pd:DB": "unmeasurable", "furcation:buccal": "assessed" },
      },
    });
    const bundle = buildFhirBundle(payload, { dialect: "dental-de", effectiveDateTime: EFFECTIVE });
    const molar = parseFhirBundle(bundle).teeth["16"] as Any;
    expect(molar.perio.pd).toEqual({ MB: 3 });
    expect(molar.perio.gm).toEqual({});
    // Glickman grade 0 is "assessed, no involvement" — never a stored grade.
    expect(molar.furcation ?? {}).toEqual({});
  });

  it("still parses a bundle mixing the canonical and legacy representations", () => {
    const payload = payloadOf({ "16": MOLAR_16 });
    const canonical = buildFhirBundle(payload, { dialect: "dental-de", effectiveDateTime: EFFECTIVE });
    const legacy = buildFhirBundle(payload);
    const mixed: Bundle = {
      resourceType: "Bundle",
      type: "collection",
      entry: [...(canonical.entry ?? []), ...(legacy.entry ?? [])],
    };
    const molar = parseFhirBundle(mixed).teeth["16"] as Any;
    expect(molar.perio.pd).toEqual(MOLAR_16.perio.pd);
    expect(molar.toothSelection).toBe("tooth-base");
  });

  it("tolerates a malformed canonical periodontal resource without throwing", () => {
    const broken: Bundle = {
      resourceType: "Bundle",
      type: "collection",
      entry: [{
        resource: {
          resourceType: "Observation",
          meta: { profile: [DENTAL_DE_PERIODONTAL_PROFILE] },
          status: "final",
          code: { coding: [{ system: LOINC_SYSTEM, code: PERIO_LOINC.panel }] },
          bodySite: { coding: [{ system: DENTAL_DE_FDI_SYSTEM, code: "16" }] },
          component: [
            { code: { coding: [{ system: LOINC_SYSTEM, code: PERIO_LOINC.probingDepth }] } },
            { code: { coding: [{ system: LOINC_SYSTEM, code: PERIO_LOINC.probingDepth }] }, valueQuantity: { value: "x" } },
          ],
        } as Any,
      }],
    };
    expect(() => parseFhirBundle(broken)).not.toThrow();
  });
});

describe("bead odontogram-5cz — conversion-report boundary (AC5)", () => {
  it("no longer reports the canonicalized periodontal axes as unmapped", () => {
    const { report } = buildDentalDeBundle(payloadOf({ "16": MOLAR_16, "36": IMPLANT_36 }), {
      effectiveDateTime: EFFECTIVE,
    });
    expect(report.unmapped.some((e) => e.field === "perio" && e.value === "charted")).toBe(false);
    for (const field of ["perio.pd", "perio.bop", "furcation", "plaque", "pi", "gi", "kg", "mpi", "mbi"]) {
      expect(report.unmapped.some((e) => e.tooth === "16" && e.field === field)).toBe(false);
    }
  });

  it("reports the deferred mucogingival axes with a reason", () => {
    const { report } = buildDentalDeBundle(
      payloadOf({
        "16": {
          toothSelection: "tooth-base",
          perio: { pd: { MB: 3 }, gm: {}, bop: [], sup: [] },
          cejVisibility: "detectable",
          rootConcavity: "mild",
          gingivalThickness: "thin",
          millerClass: "ii",
        },
      }),
      { effectiveDateTime: EFFECTIVE },
    );
    for (const field of ["cejVisibility", "rootConcavity", "gingivalThickness", "millerClass"]) {
      const entry = report.unmapped.find((e) => e.tooth === "16" && e.field === field);
      expect(entry, field).toBeDefined();
      expect(entry!.reason.length).toBeGreaterThan(20);
    }
  });
});

describe("bead odontogram-5cz — the legacy dialect is untouched (AC6)", () => {
  it("emits the unchanged engine-local periodontal panel in the legacy dialect", () => {
    const legacy = buildFhirBundle(payloadOf({ "16": MOLAR_16, "36": IMPLANT_36 }));
    expect(byProfile(legacy, DENTAL_DE_PERIODONTAL_PROFILE)).toHaveLength(0);
    expect(devices(legacy)).toHaveLength(0);
    const panels = (legacy.entry ?? [])
      .map((e) => e.resource as Any)
      .filter((r) => (r?.code?.coding ?? []).some((c: Any) => c.code === "74029-0"));
    expect(panels).toHaveLength(2);
  });
});
