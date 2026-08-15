// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Created by Zoltan Dul (https://github.com/ZoliQua) 2025-2026

import { resolveFhirDialect, type Bundle, type OdontogramExportPayload, type FhirCodecOptions, type FhirExportOptions } from "./types";
import { buildFhirBundleFromRegistry } from "../registry/fhir";
import { buildDentalCoreBundle } from "./toFhirDentalCore";
import { appendPerioCondition, appendPerioObservations } from "./toFhirPerio";

/**
 * Convert a serialized odontogram payload into a FHIR R4 collection Bundle.
 * Pure: no DOM, no network, no wall clock, and no alternate dialect. Clinical
 * content requires an effective date from the caller or examination context.
 */
export function buildFhirBundle(
  payload: OdontogramExportPayload,
  options: FhirExportOptions & FhirCodecOptions = {},
): Bundle {
  if (resolveFhirDialect(options.dialect) === "dental-core") return buildDentalCoreBundle(payload, options);
  const bundle = buildFhirBundleFromRegistry(payload, options);
  appendPerioObservations(bundle, payload, options);
  appendPerioCondition(bundle, payload, options);
  return bundle;
}
