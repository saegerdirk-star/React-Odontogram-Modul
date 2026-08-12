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
  ])("rejects %s before hydration", (_name, input, code) => {
    const result = importDentalDeBundle(input);
    expect(result).toEqual(expect.objectContaining({ ok: false, code }));
  });
});
