// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
//
// Bead odontogram-2vd, AC2 (exchange side): suppuration finally leaves the
// engine, and a gap in the examination is exported as FHIR's own
// `dataAbsentReason` — never as a renderer-invented "could not probe" finding
// code. Assessed-normal is exported as an explicit negative/zero result.

import { describe, it, expect } from "vitest";
import { buildFhirBundle } from "../fhir/toFhir";
import { LOCAL_SYSTEM } from "../fhir/codesystems";
import type { OdontogramExportPayload } from "../fhir/types";

const LOINC = "http://loinc.org";
const DAR_SYSTEM = "http://terminology.hl7.org/CodeSystem/data-absent-reason";
const COMPONENT_BODYSITE_EXTENSION_URL =
  "http://hl7.org/fhir/5.0/StructureDefinition/extension-Observation.component.bodySite";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function panelFor(bundle: ReturnType<typeof buildFhirBundle>, tooth: string): Any {
  return (bundle.entry ?? [])
    .map((e) => e.resource as Any)
    .find(
      (r) => r?.resourceType === "Observation"
        && r.code?.coding?.some((c: Any) => c.system === LOINC && c.code === "74029-0")
        && r.bodySite?.coding?.[0]?.code === tooth,
    );
}

function componentsWithLocalCode(panel: Any, code: string): Any[] {
  return (panel?.component ?? []).filter((c: Any) =>
    c.code?.coding?.some((x: Any) => x.system === LOCAL_SYSTEM && x.code === code));
}

function componentsWithLoinc(panel: Any, code: string): Any[] {
  return (panel?.component ?? []).filter((c: Any) =>
    c.code?.coding?.some((x: Any) => x.system === LOINC && x.code === code));
}

function siteOf(component: Any): string | undefined {
  const cc = component.extension?.find((e: Any) => e.url === COMPONENT_BODYSITE_EXTENSION_URL)?.valueCodeableConcept;
  return cc?.coding?.find((c: Any) => c.system === LOCAL_SYSTEM)?.code;
}

function payload(tooth: Record<string, unknown>): OdontogramExportPayload {
  return { version: "2.21", globals: {}, teeth: { "16": tooth } } as OdontogramExportPayload;
}

describe("suppuration on probing reaches the FHIR export", () => {
  it("emits an explicit boolean per charted site", () => {
    const bundle = buildFhirBundle(payload({
      perio: { pd: { MB: 5, B: 3 }, gm: {}, bop: [], sup: ["MB"] },
    }));
    const panel = panelFor(bundle, "16");
    const sup = componentsWithLocalCode(panel, "perio-sup");
    expect(sup).toHaveLength(2);
    expect(sup.find((c) => siteOf(c) === "perio-site:MB").valueBoolean).toBe(true);
    expect(sup.find((c) => siteOf(c) === "perio-site:B").valueBoolean).toBe(false);
  });

  it("emits nothing for a site that was never probed", () => {
    const bundle = buildFhirBundle(payload({ perio: { pd: { MB: 5 }, gm: {}, bop: [], sup: [] } }));
    const sup = componentsWithLocalCode(panelFor(bundle, "16"), "perio-sup");
    expect(sup).toHaveLength(1);
    expect(siteOf(sup[0])).toBe("perio-site:MB");
  });
});

describe("an unavailable measurement is exported as dataAbsentReason", () => {
  it("maps not-assessed to not-performed and carries no value", () => {
    const bundle = buildFhirBundle(payload({ assessment: { "pd:MB": "not-assessed" } }));
    const pd = componentsWithLoinc(panelFor(bundle, "16"), "32910-2");
    expect(pd).toHaveLength(1);
    expect(pd[0].valueQuantity).toBeUndefined();
    expect(pd[0].dataAbsentReason.coding[0]).toMatchObject({ system: DAR_SYSTEM, code: "not-performed" });
    expect(siteOf(pd[0])).toBe("perio-site:MB");
  });

  it("maps unmeasurable to unknown and not-applicable to not-applicable", () => {
    const bundle = buildFhirBundle(payload({
      assessment: { "pd:B": "unmeasurable", "plaque:buccal": "not-applicable" },
    }));
    const panel = panelFor(bundle, "16");
    expect(componentsWithLoinc(panel, "32910-2")[0].dataAbsentReason.coding[0].code).toBe("unknown");
    expect(componentsWithLocalCode(panel, "plaque-surface")[0].dataAbsentReason.coding[0].code).toBe("not-applicable");
  });

  it("never emits a renderer-local code for the reason itself", () => {
    const bundle = buildFhirBundle(payload({ assessment: { "pd:MB": "unmeasurable" } }));
    const pd = componentsWithLoinc(panelFor(bundle, "16"), "32910-2")[0];
    for (const coding of pd.dataAbsentReason.coding) {
      expect(coding.system).toBe(DAR_SYSTEM);
    }
  });

  it("a measurement always wins over a recorded gap", () => {
    const bundle = buildFhirBundle(payload({
      perio: { pd: { MB: 4 }, gm: {}, bop: [], sup: [] },
      assessment: { "pd:MB": "unmeasurable" },
    }));
    const pd = componentsWithLoinc(panelFor(bundle, "16"), "32910-2");
    expect(pd).toHaveLength(1);
    expect(pd[0].valueQuantity).toMatchObject({ value: 4, unit: "mm" });
    expect(pd[0].dataAbsentReason).toBeUndefined();
  });
});

describe("assessed-normal is exported as a real negative result", () => {
  it("exports an explicit false for the boolean axes", () => {
    const bundle = buildFhirBundle(payload({
      assessment: { "bop:MB": "assessed", "sup:MB": "assessed", "plaque:buccal": "assessed" },
    }));
    const panel = panelFor(bundle, "16");
    expect(componentsWithLocalCode(panel, "perio-bop")[0].valueBoolean).toBe(false);
    expect(componentsWithLocalCode(panel, "perio-sup")[0].valueBoolean).toBe(false);
    expect(componentsWithLocalCode(panel, "plaque-surface")[0].valueBoolean).toBe(false);
  });

  it("exports grade 0 for the graded axes, never an absent key", () => {
    const bundle = buildFhirBundle(payload({
      assessment: { "furcation:buccal": "assessed", "pi:mesial": "assessed" },
    }));
    const panel = panelFor(bundle, "16");
    expect(componentsWithLoinc(panel, "34015-8")[0].valueInteger).toBe(0);
    expect(componentsWithLocalCode(panel, "plaque-index-silness-loe")[0].valueInteger).toBe(0);
  });

  it("builds the panel for a tooth whose only record is the assessment itself", () => {
    const bundle = buildFhirBundle(payload({ assessment: { "pd:MB": "unmeasurable" } }));
    expect(panelFor(bundle, "16")).toBeTruthy();
  });

  it("reports a recorded mobility gap instead of dropping it", () => {
    const bundle = buildFhirBundle(payload({ assessment: { mobility: "unmeasurable" } }));
    const mobility = componentsWithLocalCode(panelFor(bundle, "16"), "tooth-mobility");
    expect(mobility).toHaveLength(1);
    expect(mobility[0].dataAbsentReason.coding[0].code).toBe("unknown");
  });

  it("lets a charted gingival margin of zero out-rank a stale gap", () => {
    const bundle = buildFhirBundle(payload({
      perio: { pd: { MB: 4 }, gm: { MB: 0 }, bop: [], sup: [] },
      assessment: { "gm:MB": "unmeasurable" },
    }));
    const panel = panelFor(bundle, "16");
    expect((panel.component ?? []).some((c: Any) => c.dataAbsentReason)).toBe(false);
  });

  it("adds nothing at all to a chart that records no assessment", () => {
    const bundle = buildFhirBundle(payload({ perio: { pd: { MB: 4 }, gm: {}, bop: ["MB"], sup: [] } }));
    const panel = panelFor(bundle, "16");
    expect((panel.component ?? []).some((c: Any) => c.dataAbsentReason)).toBe(false);
  });
});

describe("the examination's effective time reaches the canonical dialect", () => {
  it("prefers examination.effectiveDateTime over the report header's exam date", async () => {
    const { buildDentalDeBundle } = await import("../fhir/toFhirDentalDe");
    const { bundle } = buildDentalDeBundle({
      version: "2.21",
      globals: {},
      teeth: { "11": { toothSelection: "none" } },
      case: { examDate: "2020-01-01" },
      examination: { effectiveDateTime: "2026-06-30" },
    } as OdontogramExportPayload);
    const obs = (bundle.entry ?? []).map((e) => e.resource as Any).find((r) => r?.resourceType === "Observation");
    expect(obs.effectiveDateTime).toBe("2026-06-30");
  });

  it("still falls back to the report header's exam date", async () => {
    const { buildDentalDeBundle } = await import("../fhir/toFhirDentalDe");
    const { bundle } = buildDentalDeBundle({
      version: "2.21",
      globals: {},
      teeth: { "11": { toothSelection: "none" } },
      case: { examDate: "2020-01-01" },
    } as OdontogramExportPayload);
    const obs = (bundle.entry ?? []).map((e) => e.resource as Any).find((r) => r?.resourceType === "Observation");
    expect(obs.effectiveDateTime).toBe("2020-01-01");
  });
});
