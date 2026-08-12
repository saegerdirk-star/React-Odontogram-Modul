import type { Bundle, Resource } from "fhir/r4";
import type { OdontogramDocument } from "../document";
import { PAYLOAD_VERSION } from "../document";
import { parseFhirBundle } from "./fromFhir";
import {
  DENTAL_DE_CARIES_PROFILE,
  DENTAL_DE_FINDING_PROFILE,
  DENTAL_DE_IMPLANT_DEVICE_PROFILE,
  DENTAL_DE_ODONTOGRAM_PROFILE,
  DENTAL_DE_PERIODONTAL_PROFILE,
  DENTAL_DE_PERI_IMPLANT_PROFILE,
} from "./dentalDeCodesystems";
import { LOCAL_SYSTEM } from "./codesystems";
import { isDentalDeResource } from "./fromFhirDentalDe";

export const DENTAL_DE_COMPATIBILITY = {
  package: "de.cognovis.fhir.dental",
  version: "0.41.6",
  canonical: "https://fhir.cognovis.de/dental",
  fhirVersion: "4.0.1",
} as const;

export type DentalDeImportFailureCode =
  | "malformed"
  | "incomplete"
  | "incompatible"
  | "unsupported";

export interface DentalDePatientIdentity {
  reference: string;
  sourceReference?: string;
  resourceId?: string;
}

export type DentalDeImportResult =
  | {
      ok: true;
      document: OdontogramDocument;
      patient: DentalDePatientIdentity;
      compatibility: typeof DENTAL_DE_COMPATIBILITY;
      sourceBundle: Bundle;
    }
  | {
      ok: false;
      code: DentalDeImportFailureCode;
      message: string;
    };

const SUPPORTED_PROFILES = new Set([
  DENTAL_DE_ODONTOGRAM_PROFILE,
  DENTAL_DE_CARIES_PROFILE,
  DENTAL_DE_FINDING_PROFILE,
  DENTAL_DE_PERIODONTAL_PROFILE,
  DENTAL_DE_PERI_IMPLANT_PROFILE,
  DENTAL_DE_IMPLANT_DEVICE_PROFILE,
]);

interface ResourceEnvelope {
  resourceType?: unknown;
  id?: unknown;
  meta?: { profile?: unknown };
  subject?: { reference?: unknown };
  patient?: { reference?: unknown };
  code?: { coding?: Array<{ system?: unknown }> };
}

function failure(code: DentalDeImportFailureCode, message: string): DentalDeImportResult {
  return { ok: false, code, message };
}

function profilesOf(resource: ResourceEnvelope): string[] {
  return Array.isArray(resource.meta?.profile)
    ? resource.meta.profile.filter((profile): profile is string => typeof profile === "string")
    : [];
}

function patientResourceReference(resource: ResourceEnvelope, fullUrl: unknown): string | undefined {
  if (resource.resourceType !== "Patient" || typeof resource.id !== "string" || !resource.id) return undefined;
  return typeof fullUrl === "string" && fullUrl ? fullUrl : `Patient/${resource.id}`;
}

/**
 * Validate and convert the exact Dental-DE collection Bundle supported by this
 * package. Conversion is pure: callers receive a detached document only after
 * every structural, profile, and patient-ownership check succeeds.
 */
export function importDentalDeBundle(input: unknown): DentalDeImportResult {
  if (!input || typeof input !== "object") return failure("malformed", "Expected a FHIR R4 Bundle object.");
  const candidate = input as { resourceType?: unknown; type?: unknown; entry?: unknown };
  if (candidate.resourceType !== "Bundle" || candidate.type !== "collection" || !Array.isArray(candidate.entry)) {
    return failure("malformed", "Expected a FHIR R4 collection Bundle with entries.");
  }
  if (candidate.entry.length === 0) return failure("incomplete", "The Bundle contains no Dental-DE clinical resources.");

  const patientAliases = new Map<string, string>();
  const clinicalSubjects = new Set<string>();
  let canonicalClinicalResources = 0;

  for (const rawEntry of candidate.entry) {
    if (!rawEntry || typeof rawEntry !== "object") return failure("malformed", "Every Bundle entry must be an object.");
    const entry = rawEntry as { fullUrl?: unknown; resource?: unknown };
    if (!entry.resource || typeof entry.resource !== "object") return failure("malformed", "Every Bundle entry must carry a resource.");
    const resource = entry.resource as ResourceEnvelope;
    if (typeof resource.resourceType !== "string") return failure("malformed", "Every resource must declare resourceType.");

    const patientReference = patientResourceReference(resource, entry.fullUrl);
    if (patientReference && typeof resource.id === "string") {
      patientAliases.set(patientReference, `Patient/${resource.id}`);
      patientAliases.set(`Patient/${resource.id}`, `Patient/${resource.id}`);
      continue;
    }

    const profiles = profilesOf(resource);
    const isLegacyClinical = resource.resourceType === "Observation"
      && resource.code?.coding?.some((entry) => entry.system === LOCAL_SYSTEM);
    if (isLegacyClinical) {
      return failure("unsupported", "Legacy renderer FHIR resources cannot be mixed into a canonical Dental-DE session.");
    }
    const canonicalProfiles = profiles.filter((profile) => profile.startsWith(`${DENTAL_DE_COMPATIBILITY.canonical}/StructureDefinition/`));
    if (canonicalProfiles.length === 0) {
      if (isDentalDeResource(resource)) {
        return failure("unsupported", "Every consumed Dental-DE clinical resource must declare a supported canonical profile.");
      }
      continue;
    }
    if (canonicalProfiles.some((profile) => !SUPPORTED_PROFILES.has(profile))) {
      return failure("unsupported", "The Bundle contains a Dental-DE profile unsupported by this package version.");
    }
    canonicalClinicalResources += 1;
    const reference = resource.resourceType === "Device"
      ? resource.patient?.reference
      : resource.subject?.reference;
    if (resource.resourceType === "Device") {
      if (typeof reference !== "string" || !reference) {
        return failure("incomplete", "Every Dental-DE implant Device must identify its patient.");
      }
      clinicalSubjects.add(reference);
    } else {
      if (typeof reference !== "string" || !reference) {
        return failure("incomplete", "Every Dental-DE clinical resource must identify its patient subject.");
      }
      clinicalSubjects.add(reference);
    }
  }

  if (canonicalClinicalResources === 0) {
    return failure("unsupported", "The Bundle contains no supported Dental-DE clinical profile.");
  }
  if (clinicalSubjects.size === 0) return failure("incomplete", "The Bundle does not identify a patient.");

  const normalizedSubjects = new Set(
    [...clinicalSubjects].map((reference) => patientAliases.get(reference) ?? reference),
  );
  if (normalizedSubjects.size !== 1) {
    return failure("incompatible", "All Dental-DE resources must belong to one patient.");
  }
  const normalizedReference = [...normalizedSubjects][0];
  const sourceReference = clinicalSubjects.size === 1 ? [...clinicalSubjects][0] : normalizedReference;

  const odontogramState = parseFhirBundle(input as Bundle);
  odontogramState.version = PAYLOAD_VERSION;
  return {
    ok: true,
    document: odontogramState,
    patient: {
      reference: normalizedReference,
      ...(sourceReference !== normalizedReference ? { sourceReference } : {}),
    },
    compatibility: DENTAL_DE_COMPATIBILITY,
    sourceBundle: structuredClone(input as Bundle),
  };
}

export type SupportedDentalDeBundle = Bundle;
export type SupportedDentalDeResource = Resource;
