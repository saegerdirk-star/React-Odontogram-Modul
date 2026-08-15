// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Created by Zoltan Dul (https://github.com/ZoliQua) 2025-2026

import type { Bundle, Observation, Patient, Condition, CodeableConcept, Coding, Resource } from "fhir/r4";

export type { Bundle, Observation, Patient, Condition, CodeableConcept, Coding };
export type {
  ToothRecord,
  OdontogramExportPayload,
  ExaminationContextRecord,
  ExaminationSnapshotRecord,
  OdontogramDocument,
  DentalCoreIdentity,
  DentalCoreResourceIdentity,
} from "../document";
export { PAYLOAD_VERSION } from "../document";

/** The supported FHIR representations. Dental Core is the strict Cognovis contract. */
export type FhirDialect = "legacy" | "dental-core";

/** Raised when an untyped runtime caller selects a representation that is not public. */
export class UnsupportedFhirDialectError extends Error {
  constructor() {
    super("Unsupported FHIR dialect");
    this.name = "UnsupportedFhirDialectError";
  }
}

/** Resolve untyped runtime input without ever silently selecting another codec. */
export function resolveFhirDialect(value: unknown, fallback: FhirDialect = "legacy"): FhirDialect {
  if (value === undefined) return fallback;
  if (value === "legacy" || value === "dental-core") return value;
  throw new UnsupportedFhirDialectError();
}

/** Options for buildFhirBundle and exportFhir. */
export interface FhirExportOptions {
  subject?: string;
  effectiveDateTime?: string;
  /** Host-owned patient-record resources carried and referenced, but never created by this codec. */
  sharedResources?: {
    diabetesStatus?: { resource: Resource; fullUrl?: string };
    hba1c?: { resource: Resource; fullUrl?: string };
    smokingStatus?: { resource: Resource; fullUrl?: string };
    edentulous?: { resource: Resource; fullUrl?: string };
  };
}

/** Selects a codec without allowing callers to invent a third dialect. */
export interface FhirCodecOptions {
  dialect?: FhirDialect;
}
