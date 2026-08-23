// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Bead odontogram-6fi, seam 3: the read path.
//
// Two properties, both of which a live mode gets wrong by default:
//
//   1. A search answers in PAGES. A loader that reads the first page silently
//      shows a partial mouth, which is worse than showing none.
//   2. The Dental Core codec is ALL-OR-NOTHING: one resource it does not know
//      makes `parseDentalCoreBundle` reject the whole bundle. A practice server
//      carries foreign dental resources — the charly adapter's `ze-befund`
//      Observations are the case this bead names — so they are partitioned out
//      and REPORTED (id + profile), never silently dropped and never fed to the
//      codec, where they would take the rest of the chart down with them.

import { describe, it, expect } from "vitest";
import { PAYLOAD_VERSION } from "../document";
import type { OdontogramDocument } from "../document";
import { buildWritePlan } from "../live/writePlan";
import { searchAllPages } from "../live/aidbox";
import { assembleLoadResult, loadPatientChart } from "../live/load";

const PATIENT = "p-1";
const EFFECTIVE = "2026-08-23";

const CHARLY_PROFILE = "https://fhir.cognovis.de/dental/StructureDefinition/dental-finding";

/** A tooth finding exactly as the charly adapter emits it (bead odontogram-6fi recon). */
function charlyObservation(): Record<string, unknown> {
  return {
    resourceType: "Observation",
    id: "charly-tooth-11",
    meta: { profile: [CHARLY_PROFILE] },
    status: "final",
    code: { coding: [{ system: "https://fhir.cognovis.de/dental/CodeSystem/ze-befund", code: "4198" }] },
    subject: { reference: `Patient/${PATIENT}` },
    valueString: "4198",
    extension: [{ url: "https://fhir.cognovis.de/dental/StructureDefinition/fdi-tooth-number", valueCode: "11" }],
  };
}

function chartedDocument(): OdontogramDocument {
  return {
    version: PAYLOAD_VERSION,
    globals: {},
    teeth: {
      "16": { caries: ["caries-occlusal"], cariesSeverity: { occlusal: 5 } },
      "26": { restorationType: "crown", restorationMaterial: "zircon", crownReplace: true },
      "36": { endo: "endo-filling" },
    },
    plan: { "36": { restorationType: "crown", restorationMaterial: "zircon" } },
  } as OdontogramDocument;
}

/**
 * The resources a server would hold after this document was saved once — the
 * LAST write per path, since the CarePlan is written twice (bare, then
 * complete) to break the plan's reference cycle.
 */
function savedResources(): Record<string, unknown>[] {
  const byPath = new Map<string, Record<string, unknown>>();
  for (const op of buildWritePlan({ document: chartedDocument(), patientId: PATIENT, effectiveDateTime: EFFECTIVE }).ops) {
    byPath.set(op.path, op.resource as unknown as Record<string, unknown>);
  }
  return [...byPath.values()];
}

describe("odontogram-6fi: paged search", () => {
  it("follows the next link until the server stops offering one", async () => {
    const requests: string[] = [];
    const transport = {
      async request(_method: string, path: string, init?: { query?: Record<string, string | string[]> }) {
        requests.push(`${path}${init?.query ? `?${new URLSearchParams(init.query as Record<string, string>)}` : ""}`);
        if (path === "/Observation") {
          return {
            resourceType: "Bundle",
            entry: [{ resource: { resourceType: "Observation", id: "a" } }],
            link: [{ relation: "next", url: "http://localhost:8081/fhir/Observation?page=2" }],
          };
        }
        return { resourceType: "Bundle", entry: [{ resource: { resourceType: "Observation", id: "b" } }] };
      },
    };
    const page = await searchAllPages(transport, "Observation", { subject: `Patient/${PATIENT}` });
    expect(page.resources.map((resource) => (resource as { id: string }).id)).toEqual(["a", "b"]);
    expect(page.truncated).toBe(false);
    expect(requests[0]).toBe(`/Observation?subject=Patient%2F${PATIENT}`);
    expect(requests[1]).toBe("/Observation?page=2");
  });

  it("stops at the page budget and SAYS the result is partial", async () => {
    const transport = {
      async request() {
        return {
          resourceType: "Bundle",
          entry: [{ resource: { resourceType: "Observation", id: "loop" } }],
          link: [{ relation: "next", url: "http://localhost:8081/fhir/Observation?page=1" }],
        };
      },
    };
    const page = await searchAllPages(transport, "Observation", {}, 3);
    expect(page.resources).toHaveLength(3);
    // Silence here would show a partial mouth as if it were the whole one.
    expect(page.truncated).toBe(true);
  });
});

// Reviewer 2's claim, checked rather than assumed: the codec pairs a
// `diagnosisOverride` Condition with a clinical Provenance and REQUIRES both on
// read (`if (diagnosis || provenance) ... if (!provenance) return undefined`).
// A Provenance is outside the write policy, while the Condition has no
// unresolved outgoing reference of its own — so without a companion rule the
// Condition is written alone and the next load rejects the WHOLE chart.
describe("odontogram-6fi: a resource whose required companion is not written", () => {
  function diagnosisDocument(): OdontogramDocument {
    return { ...chartedDocument(), case: { diagnosisOverride: "periodontitis" } } as OdontogramDocument;
  }

  it("does not write the periodontal-diagnosis Condition without its Provenance", () => {
    const plan = buildWritePlan({ document: diagnosisDocument(), patientId: PATIENT, effectiveDateTime: EFFECTIVE });
    expect(plan.ops.some((op) => op.identityKey === "Condition/periodontal-diagnosis")).toBe(false);
    const skipped = plan.skipped.find((entry) => entry.identityKey === "Condition/periodontal-diagnosis");
    expect(skipped?.reason).toMatch(/Provenance/i);
  });

  it("keeps the rest of that chart loadable — the whole point of not writing it", () => {
    const plan = buildWritePlan({ document: diagnosisDocument(), patientId: PATIENT, effectiveDateTime: EFFECTIVE });
    const byPath = new Map<string, Record<string, unknown>>();
    for (const op of plan.ops) byPath.set(op.path, op.resource as unknown as Record<string, unknown>);
    const result = assembleLoadResult({
      patientId: PATIENT,
      resources: [{ resourceType: "Patient", id: PATIENT }, ...byPath.values()],
    });
    expect(result.report.parsed).toBe(true);
    expect(result.document?.teeth["16"]).toMatchObject({ caries: ["caries-occlusal"] });
  });
});

describe("odontogram-6fi: a truncated search reaches the load report", () => {
  const gateway = {
    async readPatient() { return { resourceType: "Patient", id: PATIENT }; },
    async search(resourceType: string) {
      return {
        resources: resourceType === "Observation" ? (savedResources() as unknown[]) : [],
        truncated: resourceType === "Observation",
      };
    },
    async put() { return {}; },
    async delete() { return {}; },
  };

  it("names the resource type whose search was cut short", async () => {
    const result = await loadPatientChart(gateway, PATIENT);
    expect(result.report.truncated).toEqual(["Observation"]);
    expect(result.report.error).toMatch(/partial|truncat/i);
  });
});

describe("odontogram-6fi: assembling a load", () => {
  it("hydrates the charted document back out of the saved resources", () => {
    const result = assembleLoadResult({
      patientId: PATIENT,
      resources: [{ resourceType: "Patient", id: PATIENT }, ...savedResources()],
    });
    expect(result.report.parsed).toBe(true);
    expect(result.document?.teeth["16"]).toMatchObject({ caries: ["caries-occlusal"], cariesSeverity: { occlusal: 5 } });
    expect(result.document?.teeth["26"]).toMatchObject({ restorationType: "crown", restorationMaterial: "zircon" });
    expect(result.document?.plan?.["36"]).toMatchObject({ restorationType: "crown" });
  });

  it("carries the server ids back, so the next save updates instead of duplicating", () => {
    const result = assembleLoadResult({
      patientId: PATIENT,
      resources: [{ resourceType: "Patient", id: PATIENT }, ...savedResources()],
    });
    const identities = result.document?.fhirIdentity?.resources ?? {};
    expect(Object.keys(identities).length).toBeGreaterThan(0);
    const replan = buildWritePlan({ document: result.document!, patientId: PATIENT, effectiveDateTime: EFFECTIVE });
    const original = buildWritePlan({ document: chartedDocument(), patientId: PATIENT, effectiveDateTime: EFFECTIVE });
    expect(replan.ops.map((op) => op.path).sort()).toEqual(original.ops.map((op) => op.path).sort());
  });

  it("lists a charly-dialect Observation as unsupported instead of dropping it", () => {
    const result = assembleLoadResult({
      patientId: PATIENT,
      resources: [{ resourceType: "Patient", id: PATIENT }, ...savedResources(), charlyObservation()],
    });
    expect(result.report.parsed).toBe(true);
    expect(result.report.unsupported).toEqual([
      expect.objectContaining({
        reference: "Observation/charly-tooth-11",
        profile: CHARLY_PROFILE,
      }),
    ]);
    expect(result.report.unsupported[0].reason).toMatch(/not part of the Dental Core contract/i);
  });

  it("still charts the supported findings when a foreign resource sits beside them", () => {
    const result = assembleLoadResult({
      patientId: PATIENT,
      resources: [{ resourceType: "Patient", id: PATIENT }, ...savedResources(), charlyObservation()],
    });
    expect(result.document?.teeth["16"]).toMatchObject({ caries: ["caries-occlusal"] });
    expect(result.report.dentalCore).toBe(savedResources().length + 1);
  });

  it("reports a chart with nothing in it as an empty load, not as a failure", () => {
    const result = assembleLoadResult({ patientId: PATIENT, resources: [{ resourceType: "Patient", id: PATIENT }] });
    expect(result.report.parsed).toBe(true);
    expect(result.report.unsupported).toEqual([]);
    expect(result.document?.teeth).toEqual({});
  });

  it("says so visibly when the codec rejects the supported resources", () => {
    const broken = savedResources().map((resource, index) =>
      index === 0 ? { ...resource, subject: { reference: "Patient/someone-else" } } : resource);
    const result = assembleLoadResult({
      patientId: PATIENT,
      resources: [{ resourceType: "Patient", id: PATIENT }, ...broken],
    });
    expect(result.report.parsed).toBe(false);
    expect(result.document).toBeUndefined();
    expect(result.report.error).toMatch(/reject/i);
  });
});
