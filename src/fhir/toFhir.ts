// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Created by Zoltan Dul (https://github.com/ZoliQua) 2025-2026

import type { Bundle, OdontogramExportPayload, FhirExportOptions } from "./types";
import { buildDentalCoreBundle } from "./toFhirDentalCore";

/**
 * Convert a serialized odontogram payload into a FHIR R4 collection Bundle.
 * Pure: no DOM, no network, no wall clock, and no alternate dialect. Clinical
 * content requires an effective date from the caller or examination context.
 */
export function buildFhirBundle(payload: OdontogramExportPayload, options: FhirExportOptions = {}): Bundle {
  return buildDentalCoreBundle(payload, options);
}
