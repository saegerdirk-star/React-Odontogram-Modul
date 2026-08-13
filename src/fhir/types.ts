// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Created by Zoltan Dul (https://github.com/ZoliQua) 2025-2026

import type { Bundle, Observation, Patient, Condition, CodeableConcept, Coding } from "fhir/r4";

export type { Bundle, Observation, Patient, Condition, CodeableConcept, Coding };
export type {
  ToothRecord,
  OdontogramExportPayload,
  ExaminationContextRecord,
  ExaminationSnapshotRecord,
  OdontogramDocument,
} from "../document";
export { PAYLOAD_VERSION } from "../document";

/** Which FHIR representation the optional adapter produces. */
export type FhirDialect = "legacy" | "dental-de" | "dental-core";

/** Options for buildFhirBundle and exportFhir. */
export interface FhirExportOptions {
  subject?: string;
  dialect?: FhirDialect;
  effectiveDateTime?: string;
}

/** One document value the canonical Dental-DE conversion could not code. */
export interface DentalDeConversionEntry {
  tooth: string;
  field: string;
  value: string;
  reason: string;
}

/** Conversion evidence for values represented as text or left unmapped. */
export interface DentalDeConversionReport {
  textFallback: DentalDeConversionEntry[];
  unmapped: DentalDeConversionEntry[];
}
