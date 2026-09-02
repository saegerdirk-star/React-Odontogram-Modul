// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Created by Zoltan Dul (https://github.com/ZoliQua) 2025-2026

import { type Bundle, type OdontogramExportPayload, type FhirExportOptions } from "./types";
import { buildDentalCoreBundle } from "./toFhirDentalCore";

/**
 * Convert a serialized odontogram payload into a FHIR R4 collection Bundle.
 * Dental Core is the sole FHIR contract. The projection is pure: no DOM, no
 * network, no wall clock, and no runtime implementation selection. Clinical
 * content requires an effective date from the caller or examination context.
 */
export function buildFhirBundle(
  payload: OdontogramExportPayload,
  options: FhirExportOptions = {},
): Bundle {
  return buildDentalCoreBundle(payload, options);
}
