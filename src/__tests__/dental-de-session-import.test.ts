import { describe, expect, it } from "vitest";
import {
  createDentalDeOdontogramSession,
  createOdontogramSession,
  type OdontogramDocument,
} from "../App";
import { buildDentalDeBundle } from "../fhir/toFhirDentalDe";
import {
  DENTAL_DE_COMPATIBILITY,
  DENTAL_DE_IMPORT_MANIFEST,
  exportDentalDeBundle,
  importDentalDeBundle,
} from "../fhir";

const PATIENT = "Patient/patient-a";

function documentWithMissing(tooth: string): OdontogramDocument {
  return {
    version: "2.25",
    globals: {},
    teeth: { [tooth]: { toothSelection: "none" } },
  };
}

function canonicalBundle(document = documentWithMissing("11")) {
  const bundle = buildDentalDeBundle(document, {
    subject: PATIENT,
    effectiveDateTime: "2026-08-12",
  }).bundle;
  let sequence = 0;
  for (const entry of bundle.entry ?? []) {
    if (!entry.resource || entry.resource.resourceType === "Patient") continue;
    entry.resource.id = `existing-${++sequence}`;
    entry.resource.meta = { ...entry.resource.meta, versionId: "7" };
  }
  return bundle;
}

describe("odontogram-229 AC1/AC3: fail-closed canonical import", () => {
  it("publishes a unique machine-checkable field-to-carrier manifest", () => {
    const fields = DENTAL_DE_IMPORT_MANIFEST.map((entry) => entry.field);
    expect(new Set(fields).size).toBe(fields.length);
    expect(DENTAL_DE_IMPORT_MANIFEST.filter((entry) => entry.support === "canonical").every((entry) => entry.roundTrip)).toBe(true);
    for (const required of ["toothSelection", "caries", "perio", "mpi", "restorationType", "extractionPlan", "orthoAppliance"]) {
      expect(fields).toContain(required);
    }
    expect(DENTAL_DE_IMPORT_MANIFEST.find((entry) => entry.field === "assessment")).toEqual(
      expect.objectContaining({ support: "export-only", roundTrip: false }),
    );
  });
  it("creates an isolated read-only patient session from a canonical Bundle", () => {
    const result = createDentalDeOdontogramSession(canonicalBundle());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.patient.reference).toBe(PATIENT);
    expect(result.compatibility).toEqual(DENTAL_DE_COMPATIBILITY);
    expect(result.session.getDocument().teeth["11"].toothSelection).toBe("none");
    expect(result.session.readOnly).toBe(true);
    expect(result.session.persistence).toBe("disabled");
  });

  it("supports local edit, cancel, and explicit export without persistence", () => {
    const result = createDentalDeOdontogramSession(canonicalBundle(), { readOnly: false });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.readOnly).toBe(false);
    result.session.setDocument(documentWithMissing("46"));
    expect(result.session.dirty).toBe(true);
    result.session.cancel();
    expect(result.session.dirty).toBe(false);
    expect(result.session.getDocument().teeth["11"].toothSelection).toBe("none");

    result.session.setDocument(documentWithMissing("46"));
    const exported = result.session.export({ patient: PATIENT, effectiveDateTime: "2026-08-12" });
    expect(exported.ok).toBe(true);
    expect(result.session.persistence).toBe("disabled");
  });

  it("invalidates a destroyed patient session deterministically", () => {
    const result = createDentalDeOdontogramSession(canonicalBundle());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    result.session.destroy();
    expect(result.session.destroyed).toBe(true);
    expect(result.session.isActive()).toBe(false);
    expect(() => result.session.getDocument()).toThrow(/destroyed/i);
  });

  it("returns typed failures without replacing a last valid session", () => {
    const existing = createOdontogramSession(documentWithMissing("46"));
    const before = existing.getDocument();
    const result = importDentalDeBundle({ resourceType: "Bundle", type: "collection", entry: [] });

    expect(result).toEqual(expect.objectContaining({ ok: false, code: "incomplete" }));
    expect(existing.getDocument()).toEqual(before);
  });

  it("exports an unchanged session with stable identities and semantic equivalence", () => {
    const imported = importDentalDeBundle(canonicalBundle());
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;

    const exported = exportDentalDeBundle(imported, imported.document, {
      patient: PATIENT,
      effectiveDateTime: "2026-08-12",
    });

    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    expect(exported.changes).toEqual({ added: [], updated: [], removed: [] });
    expect(exported.report.unmapped).toEqual([]);
    const resource = exported.bundle.entry?.find((entry) => entry.resource?.resourceType === "Observation")?.resource;
    expect(resource?.id).toBe("existing-1");
    expect(resource?.meta?.versionId).toBe("7");
    const roundTrip = importDentalDeBundle(exported.bundle);
    expect(roundTrip.ok && roundTrip.document).toEqual(imported.document);
  });

  it("exports exactly one controlled update and retains unrelated source resources", () => {
    const source = canonicalBundle({
      version: "2.25",
      globals: {},
      teeth: {
        "11": { toothSelection: "none" },
        "46": { toothSelection: "tooth-base", restorationType: "crown", restorationMaterial: "zircon" },
      },
    });
    const imported = importDentalDeBundle(source);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    const edited = structuredClone(imported.document);
    edited.teeth["11"] = { toothSelection: "tooth-base" };

    const exported = exportDentalDeBundle(imported, edited, {
      patient: PATIENT,
      effectiveDateTime: "2026-08-12",
      author: "Practitioner/editor-1",
      encounter: "Encounter/enc-1",
    });

    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    expect(exported.changes.updated).toHaveLength(1);
    expect(exported.changes.added).toEqual([]);
    expect(exported.changes.removed).toEqual([]);
    expect(exported.changes.updated[0]).toEqual(expect.objectContaining({ id: "existing-1", versionId: "7" }));
    const roundTrip = importDentalDeBundle(exported.bundle);
    expect(roundTrip.ok && roundTrip.document.teeth["11"].toothSelection).toBe("tooth-base");
    expect(roundTrip.ok && roundTrip.document.teeth["46"]).toEqual(imported.document.teeth["46"]);
  });

  it.each([
    ["filling defect", {
      toothSelection: "tooth-base", fillingSurfaces: ["occlusal"],
      fillingSurfaceMaterials: { occlusal: "composite" }, fillingDefect: { occlusal: "fracture" },
    }, { fillingDefect: { occlusal: "fracture" } }],
    ["recurrent caries score", {
      toothSelection: "tooth-base", fillingSurfaces: ["occlusal"],
      fillingSurfaceMaterials: { occlusal: "composite" }, caries: ["caries-occlusal"],
      cariesSeverity: { occlusal: 4 },
    }, { caries: ["caries-occlusal"], cariesSeverity: { occlusal: 4 } }],
    ["peri-implant probing depth", {
      toothSelection: "implant", perio: { pd: { MB: 6 }, gm: { MB: 0 }, bop: [], sup: [] },
    }, { toothSelection: "implant" }],
  ])("exports a %s-only edit through its actual generated carrier", (_name, editedRecord, expectedRecord) => {
    const source = buildDentalDeBundle({
      version: "2.25", globals: {}, teeth: { "46": { toothSelection: editedRecord.toothSelection } },
    }, { subject: PATIENT, effectiveDateTime: "2025-01-01" }).bundle;
    const imported = importDentalDeBundle(source);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    const edited = structuredClone(imported.document);
    edited.teeth["46"] = editedRecord;

    const exported = exportDentalDeBundle(imported, edited, { patient: PATIENT, effectiveDateTime: "2026-08-12" });
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    expect(exported.changes.added.length + exported.changes.updated.length).toBeGreaterThan(0);
    const roundTrip = importDentalDeBundle(exported.bundle);
    expect(roundTrip.ok).toBe(true);
    if (!roundTrip.ok) return;
    expect(roundTrip.document.teeth["46"]).toEqual(expect.objectContaining(expectedRecord));
    if (_name === "peri-implant probing depth") {
      expect(roundTrip.document.teeth["46"].perio?.pd.MB).toBe(6);
    }
  });

  it("exports periodontal assessment status without reporting a false loss", () => {
    const imported = importDentalDeBundle(buildDentalDeBundle({
      version: "2.25", globals: {}, teeth: {
        "16": { toothSelection: "tooth-base", perio: { pd: { MB: 4 }, gm: {}, bop: [], sup: [] } },
      },
    }, { subject: PATIENT, effectiveDateTime: "2025-01-01" }).bundle);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    const edited = structuredClone(imported.document);
    edited.teeth["16"].assessment = { "pd:DB": "unmeasurable" };
    const exported = exportDentalDeBundle(imported, edited, { patient: PATIENT, effectiveDateTime: "2026-08-12" });
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    expect(exported.changes.updated.length + exported.changes.added.length).toBeGreaterThan(0);
    expect(exported.report.unmapped).not.toContainEqual(expect.objectContaining({ field: "assessment" }));
  });

  it("normalizes a direct public export before deciding whether resources changed", () => {
    const imported = importDentalDeBundle(canonicalBundle());
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    const normalized = structuredClone(imported.document);
    for (const quadrant of [1, 2, 3, 4]) {
      for (let position = 1; position <= 8; position += 1) {
        const slot = `${quadrant}${position}`;
        normalized.teeth[slot] ??= { toothSelection: "tooth-base" };
      }
    }
    const exported = exportDentalDeBundle(imported, normalized, { patient: PATIENT, effectiveDateTime: "2026-08-12" });
    expect(exported.ok && exported.changes).toEqual({ added: [], updated: [], removed: [] });
    expect(exported.ok && exported.bundle).toEqual(imported.sourceBundle);
  });

  it("reports a locally edited unsupported planned-care field as loss", () => {
    const imported = importDentalDeBundle(canonicalBundle());
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    const edited = structuredClone(imported.document);
    edited.teeth["11"].extractionPlan = true;
    const exported = exportDentalDeBundle(imported, edited, { patient: PATIENT, effectiveDateTime: "2026-08-12" });
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    expect(exported.report.unmapped).toContainEqual(expect.objectContaining({ tooth: "11", field: "extractionPlan" }));
  });

  it("deduplicates unsupported-field loss under the exported primary FDI number", () => {
    const source = buildDentalDeBundle({
      version: "2.25", globals: {}, teeth: { "11": { toothSelection: "milktooth" } },
    }, { subject: PATIENT, effectiveDateTime: "2025-01-01" }).bundle;
    const imported = importDentalDeBundle(source);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    const edited = structuredClone(imported.document);
    edited.teeth["11"].wearEdge = "attrition";
    const exported = exportDentalDeBundle(imported, edited, { patient: PATIENT, effectiveDateTime: "2026-08-12" });
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    expect(exported.report.unmapped.filter((entry) => entry.field === "wearEdge")).toEqual([
      expect.objectContaining({ tooth: "51" }),
    ]);
  });

  it("accounts for every duplicate source carrier as an explicit removal", () => {
    const source = canonicalBundle();
    const original = source.entry?.find((entry) => entry.resource?.resourceType === "Observation");
    expect(original?.resource?.resourceType).toBe("Observation");
    source.entry?.push({ resource: { ...structuredClone(original?.resource), id: "duplicate-2" } as import("fhir/r4").Observation });
    const imported = importDentalDeBundle(source);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    const edited = structuredClone(imported.document);
    edited.teeth["11"].toothSelection = "tooth-base";
    const exported = exportDentalDeBundle(imported, edited, { patient: PATIENT, effectiveDateTime: "2026-08-13" });
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    expect(exported.changes.removed).toContainEqual(expect.objectContaining({ id: "duplicate-2" }));
  });

  it("preserves an unrelated periodontal observation time when restoration changes", () => {
    const source = buildDentalDeBundle({
      version: "2.25", globals: {},
      teeth: { "16": { toothSelection: "tooth-base", restorationType: "crown", perio: { pd: { MB: 4 }, gm: { MB: 1 }, bop: [], sup: [] } } },
    }, { subject: PATIENT, effectiveDateTime: "2025-01-01" }).bundle;
    const imported = importDentalDeBundle(source);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    const edited = structuredClone(imported.document);
    edited.teeth["16"].restorationMaterial = "zircon";
    const exported = exportDentalDeBundle(imported, edited, { patient: PATIENT, effectiveDateTime: "2026-08-12" });
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    const perio = exported.bundle.entry?.map((entry) => entry.resource).find((resource) =>
      resource?.resourceType === "Observation" && resource.meta?.profile?.some((profile) => profile.endsWith("/periodontal-observation")),
    ) as import("fhir/r4").Observation | undefined;
    expect(perio?.effectiveDateTime).toBe("2025-01-01");
  });

  it("retains the source URN patient reference on regenerated resources", () => {
    const source = canonicalBundle();
    const sourceReference = "urn:uuid:patient-a";
    source.entry?.unshift({ fullUrl: sourceReference, resource: { resourceType: "Patient", id: "patient-a" } });
    for (const entry of source.entry ?? []) {
      if (entry.resource?.resourceType === "Observation") {
        (entry.resource as import("fhir/r4").Observation).subject = { reference: sourceReference };
      }
    }
    const imported = importDentalDeBundle(source);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    expect(imported.patient).toEqual({ reference: "Patient/patient-a", sourceReference });
    const edited = structuredClone(imported.document);
    edited.teeth["11"].toothSelection = "tooth-base";
    const exported = exportDentalDeBundle(imported, edited, { patient: "Patient/patient-a", effectiveDateTime: "2026-08-12" });
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    const observations = exported.bundle.entry?.map((entry) => entry.resource).filter((resource): resource is import("fhir/r4").Observation => resource?.resourceType === "Observation") ?? [];
    expect(observations.every((observation) => observation.subject?.reference === sourceReference)).toBe(true);
  });

  it("preserves each matched resource patient-reference form in a mixed-form Bundle", () => {
    const source = canonicalBundle({
      version: "2.25", globals: {}, teeth: {
        "11": { toothSelection: "none" }, "46": { toothSelection: "none" },
      },
    });
    const urn = "urn:uuid:patient-a";
    source.entry?.unshift({ fullUrl: urn, resource: { resourceType: "Patient", id: "patient-a" } });
    const observations = source.entry?.filter((entry) => entry.resource?.resourceType === "Observation") ?? [];
    (observations[0].resource as import("fhir/r4").Observation).subject = { reference: urn };
    (observations[1].resource as import("fhir/r4").Observation).subject = { reference: PATIENT };
    const expectedById = new Map(observations.map((entry) => {
      const observation = entry.resource as import("fhir/r4").Observation;
      return [observation.id, observation.subject?.reference];
    }));
    const imported = importDentalDeBundle(source);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    const edited = structuredClone(imported.document);
    edited.teeth["11"].toothSelection = "tooth-base";
    edited.teeth["46"].toothSelection = "tooth-base";
    const exported = exportDentalDeBundle(imported, edited, { patient: PATIENT, effectiveDateTime: "2026-08-12" });
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    for (const entry of exported.bundle.entry ?? []) {
      if (entry.resource?.resourceType !== "Observation" || !entry.resource.id) continue;
      const observation = entry.resource as import("fhir/r4").Observation;
      expect(observation.subject?.reference).toBe(expectedById.get(observation.id));
    }
  });

  it.each([
    ["malformed", null, "malformed"],
    ["wrong resource type", { resourceType: "Patient" }, "malformed"],
    ["legacy-only", { resourceType: "Bundle", type: "collection", entry: [{ resource: { resourceType: "Observation" } }] }, "unsupported"],
    ["mixed patients", (() => {
      const bundle = canonicalBundle();
      const observation = bundle.entry?.find((entry) => entry.resource?.resourceType === "Observation")?.resource;
      if (observation?.resourceType === "Observation") {
        bundle.entry?.push({
          resource: { ...observation, subject: { reference: "Patient/patient-b" } } as typeof observation,
        });
      }
      return bundle;
    })(), "incompatible"],
    ["legacy clinical resource", (() => {
      const bundle = canonicalBundle();
      bundle.entry?.push({ resource: {
        resourceType: "Observation", status: "final", code: { coding: [{ system: "https://github.com/ZoliQua/React-Odontogram-Modul/fhir/CodeSystem/odontogram", code: "caries" }] },
        subject: { reference: "Patient/patient-b" },
      } as import("fhir/r4").Observation });
      return bundle;
    })(), "unsupported"],
    ["foreign implant patient", (() => {
      const bundle = buildDentalDeBundle({ version: "2.25", globals: {}, teeth: { "36": { toothSelection: "implant" } } }, { subject: PATIENT, effectiveDateTime: "2026-08-12" }).bundle;
      const device = bundle.entry?.find((entry) => entry.resource?.resourceType === "Device")?.resource as import("fhir/r4").Device | undefined;
      if (device?.resourceType === "Device") device.patient = { reference: "Patient/patient-b" };
      return bundle;
    })(), "incompatible"],
    ["profile-less canonical-coded observation", (() => {
      const bundle = canonicalBundle();
      bundle.entry?.push({ resource: {
        resourceType: "Observation", status: "final",
        code: { coding: [{ system: "https://fhir.cognovis.de/dental/CodeSystem/dental-assessment-type", code: "odontogram-assessment" }] },
        subject: { reference: "Patient/patient-b" },
      } as import("fhir/r4").Observation });
      return bundle;
    })(), "unsupported"],
  ])("rejects %s before hydration", (_name, input, code) => {
    const result = importDentalDeBundle(input);
    expect(result).toEqual(expect.objectContaining({ ok: false, code }));
  });
});
