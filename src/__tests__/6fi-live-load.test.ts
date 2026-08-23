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
    // The stable sort rides on the first request; the next link carries it on.
    expect(requests[0]).toBe(`/Observation?subject=Patient%2F${PATIENT}&_sort=_id`);
    expect(requests[1]).toBe("/Observation?page=2");
  });

  it("stops at the page budget and SAYS the result is partial", async () => {
    let served = 0;
    const transport = {
      async request() {
        // Distinct ids per page: the assembly is DISTINCT-counted, so a page
        // repeating one resource would collapse instead of exhausting the budget.
        served += 1;
        return {
          resourceType: "Bundle",
          entry: [{ resource: { resourceType: "Observation", id: `page-${served}` } }],
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
        incomplete: false,
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

// ---------------------------------------------------------------------------
// The whole-mouth round trip, and the silent partial that broke it.
//
// The failure the acceptance run hit is invisible at session scale: a mouth
// with four findings is 8 resources and fits in one page, while the app's own
// save of a normalised mouth is 128 — TWO pages at Aidbox's default page size
// of 100. Measured on the live fixture, `Observation/...tooth-state-16` was
// entry number 100, the first entry of page two: a load that lost that page
// PARSED CLEANLY and showed tooth 16 with no filling. A partial read that
// reads as a whole chart is the worst outcome available here, because the next
// save writes it back.
// ---------------------------------------------------------------------------

import { normalizeOdontogramDocument } from "../odontogram";

/** A normalised whole mouth (32 teeth) carrying ONE composite filling on 16. */
function wholeMouthDocument(): OdontogramDocument {
  const document = normalizeOdontogramDocument({ version: PAYLOAD_VERSION, globals: {}, teeth: {} } as OdontogramDocument);
  document.teeth["16"] = {
    ...document.teeth["16"],
    fillingSurfaces: ["occlusal"],
    fillingSurfaceMaterials: { occlusal: "composite" },
  };
  return document;
}

/** What the server holds after that document is saved once. */
function wholeMouthResources(): Record<string, unknown>[] {
  const plan = buildWritePlan({ document: wholeMouthDocument(), patientId: PATIENT, effectiveDateTime: EFFECTIVE });
  const byPath = new Map<string, Record<string, unknown>>();
  for (const op of plan.ops) {
    if (op.method === "DELETE") byPath.delete(op.path);
    else byPath.set(op.path, op.resource as unknown as Record<string, unknown>);
  }
  return [...byPath.values()];
}

describe("odontogram-6fi: the whole-mouth round trip", () => {
  it("saves and reads back a normalised mouth of more than one page", () => {
    const resources = wholeMouthResources();
    expect(resources.length).toBeGreaterThan(100);
    const result = assembleLoadResult({
      patientId: PATIENT,
      resources: [{ resourceType: "Patient", id: PATIENT }, ...resources],
    });
    expect(result.report.parsed).toBe(true);
    expect(result.document?.teeth["16"]).toMatchObject({
      fillingSurfaces: ["occlusal"],
      fillingSurfaceMaterials: { occlusal: "composite" },
    });
  });

  it("says WHY the codec rejected a collection instead of only that it did", () => {
    const resources = wholeMouthResources();
    // One resource that belongs to somebody else is enough to make the codec
    // refuse the whole collection. The report has to name it.
    const poisoned = resources.map((resource, index) =>
      index === 40 ? { ...resource, subject: { reference: "Patient/somebody-else" } } : resource);
    const result = assembleLoadResult({
      patientId: PATIENT,
      resources: [{ resourceType: "Patient", id: PATIENT }, ...poisoned],
    });
    expect(result.report.parsed).toBe(false);
    expect(result.report.rejectedAt).toBe(`Observation/${poisoned[40].id as string}`);
    expect(result.report.error).toContain(poisoned[40].id as string);
  });
});

describe("odontogram-6fi: a page that never arrives", () => {
  const patient = { resourceType: "Patient", id: PATIENT };

  it("fails the load when the server says there are more resources than arrived", async () => {
    const gateway = {
      async readPatient() { return patient; },
      async search(resourceType: string) {
        const resources = resourceType === "Observation" ? (wholeMouthResources().slice(0, 100) as unknown[]) : [];
        return { resources, truncated: false, expected: resourceType === "Observation" ? 128 : 0, incomplete: resourceType === "Observation" };
      },
      async put() { return {}; },
      async delete() { return {}; },
    };
    const result = await loadPatientChart(gateway, PATIENT);
    // It would otherwise PARSE — that is the whole danger.
    expect(result.report.parsed).toBe(false);
    expect(result.document).toBeUndefined();
    expect(result.report.error).toMatch(/incomplete|partial/i);
    expect(result.report.incomplete).toEqual(["Observation"]);
  });

  it("lets a mid-search transport failure fail the load instead of returning a partial", async () => {
    const gateway = {
      async readPatient() { return patient; },
      async search() { throw Object.assign(new Error("Active Storage for 'null' not found"), { status: 500 }); },
      async put() { return {}; },
      async delete() { return {}; },
    };
    await expect(loadPatientChart(gateway, PATIENT)).rejects.toThrow(/Active Storage/);
  });
});

describe("odontogram-6fi: searchAllPages counts what the server promised", () => {
  function pagingTransport(pages: Array<{ ids: string[]; next?: string; total?: number }>) {
    let call = 0;
    return {
      async request() {
        const page = pages[Math.min(call++, pages.length - 1)];
        return {
          resourceType: "Bundle",
          total: page.total,
          entry: page.ids.map((id) => ({ resource: { resourceType: "Observation", id } })),
          ...(page.next ? { link: [{ relation: "next", url: page.next }] } : {}),
        };
      },
    };
  }

  it("reports an incomplete read when fewer resources arrive than the server counted", async () => {
    const transport = pagingTransport([{ ids: ["a", "b"], total: 128 }]);
    const page = await searchAllPages(transport, "Observation", {});
    expect(page.resources).toHaveLength(2);
    expect(page.expected).toBe(128);
    expect(page.incomplete).toBe(true);
  });

  it("is complete when the count matches", async () => {
    const transport = pagingTransport([
      { ids: ["a", "b"], total: 3, next: "http://localhost:8081/fhir/Observation?_page=2" },
      { ids: ["c"], total: 3 },
    ]);
    const page = await searchAllPages(transport, "Observation", {});
    expect(page.resources).toHaveLength(3);
    expect(page.incomplete).toBe(false);
  });

  it("does not claim completeness when the server reports no total", async () => {
    const transport = pagingTransport([{ ids: ["a"] }]);
    const page = await searchAllPages(transport, "Observation", {});
    expect(page.expected).toBeUndefined();
    expect(page.incomplete).toBe(false);
  });

  it("never swallows a page failure into a partial result", async () => {
    let call = 0;
    const transport = {
      async request() {
        call += 1;
        if (call === 1) {
          return {
            resourceType: "Bundle",
            total: 2,
            entry: [{ resource: { resourceType: "Observation", id: "a" } }],
            link: [{ relation: "next", url: "http://localhost:8081/fhir/Observation?_page=2" }],
          };
        }
        throw Object.assign(new Error("Active Storage for 'null' not found"), { status: 500 });
      },
    };
    await expect(searchAllPages(transport, "Observation", {})).rejects.toThrow(/Active Storage/);
  });
});

// ---------------------------------------------------------------------------
// Pagination without a stable sort.
//
// The acceptance run saw the SAME server state reject on roughly five loads out
// of six, with a different `rejectedAt` each time — which reads exactly like an
// order-sensitive codec. It is not: measured, `parseDentalCoreBundle` accepts
// all 24 seeded permutations of that very fixture, and all 30 of a synthetic
// one.
//
// What actually happens is that Aidbox paginates WITHOUT a stable sort. Two
// pages of a 128-resource search return 128 resources of which only 100 to 118
// are DISTINCT: some come twice, and just as many never come at all. Measured
// over six consecutive two-page fetches of the standing fixture: 27, 28, 10,
// 12, 10 and 18 duplicates. The codec rejects a collection carrying a duplicate
// id, so the load fails — and which resource duplicates varies per fetch, which
// is why `rejectedAt` moved.
//
// The count check could not catch it: 128 arrived against a total of 128. It is
// the DISTINCT count that matters.
// ---------------------------------------------------------------------------

describe("odontogram-6fi: pagination without a stable sort", () => {
  function unstableTransport(pages: string[][], total: number) {
    const seen: Array<Record<string, string | string[]> | undefined> = [];
    let call = 0;
    return {
      seen,
      async request(_method: string, _path: string, init?: { query?: Record<string, string | string[]> }) {
        seen.push(init?.query);
        const page = pages[Math.min(call++, pages.length - 1)];
        return {
          resourceType: "Bundle",
          total,
          entry: page.map((id) => ({ resource: { resourceType: "Observation", id } })),
          ...(call < pages.length ? { link: [{ relation: "next", url: `http://localhost:8081/fhir/Observation?_page=${call + 1}` }] } : {}),
        };
      },
    };
  }

  it("asks the server for a stable order, so the pages cannot overlap", async () => {
    const transport = unstableTransport([["a", "b"]], 2);
    await searchAllPages(transport, "Observation", { subject: "Patient/p-1" });
    expect(transport.seen[0]).toMatchObject({ subject: "Patient/p-1", _sort: "_id" });
  });

  it("counts DISTINCT resources, so a duplicate cannot pass as a complete read", async () => {
    // 4 resources arrive against a total of 4 — but one of them twice, so one
    // of the four never arrived at all.
    const transport = unstableTransport([["a", "b"], ["b", "c"]], 4);
    const page = await searchAllPages(transport, "Observation", {});
    expect(page.resources).toHaveLength(3);
    expect(page.expected).toBe(4);
    expect(page.incomplete).toBe(true);
  });

  it("never hands the codec the same resource twice", async () => {
    const transport = unstableTransport([["a", "b"], ["b", "c"]], 3);
    const page = await searchAllPages(transport, "Observation", {});
    const ids = (page.resources as Array<{ id: string }>).map((resource) => resource.id);
    expect(ids).toEqual(["a", "b", "c"]);
    expect(page.incomplete).toBe(false);
  });

  it("fails the load when a duplicate means a resource is missing", async () => {
    const resources = wholeMouthResources();
    const gateway = {
      async readPatient() { return { resourceType: "Patient", id: PATIENT }; },
      async search(resourceType: string) {
        if (resourceType !== "Observation") return { resources: [], truncated: false, incomplete: false };
        // One resource duplicated in place of another, exactly as the unstable
        // pagination produced it.
        const served = [...resources.slice(0, resources.length - 1), resources[0]];
        const distinct = [...new Map(served.map((r) => [`${r.resourceType}/${r.id}`, r])).values()];
        return { resources: distinct as unknown[], truncated: false, expected: resources.length, incomplete: distinct.length < resources.length };
      },
      async put() { return {}; },
      async delete() { return {}; },
    };
    const result = await loadPatientChart(gateway, PATIENT);
    expect(result.report.parsed).toBe(false);
    expect(result.document).toBeUndefined();
    expect(result.report.incomplete).toEqual(["Observation"]);
  });
});

describe("odontogram-6fi: the codec is not order-sensitive", () => {
  // Recorded because it was suspected and disproved: the fix belongs at the
  // pagination, not at a canonical sort before the parse.
  function shuffled<T>(items: T[], seed: number): T[] {
    let state = seed;
    const random = () => {
      state |= 0; state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const out = [...items];
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  it("reads a whole mouth back from any order the server returns it in", () => {
    const resources = wholeMouthResources();
    for (let seed = 1; seed <= 12; seed += 1) {
      const result = assembleLoadResult({
        patientId: PATIENT,
        resources: [{ resourceType: "Patient", id: PATIENT }, ...shuffled(resources, seed)],
      });
      expect(result.report.parsed, `seed ${seed}: ${result.report.error ?? ""}`).toBe(true);
      expect(result.document?.teeth["16"], `seed ${seed}`).toMatchObject({ fillingSurfaces: ["occlusal"] });
    }
  });
});
