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

/** Options for buildFhirBundle and exportFhir. */
export interface FhirExportOptions {
  subject?: string;
  effectiveDateTime?: string;
}
