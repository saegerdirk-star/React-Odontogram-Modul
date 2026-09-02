// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Created by Zoltan Dul (https://github.com/ZoliQua) 2025-2026

import { type OdontogramExportPayload } from "./types";
import { parseDentalCoreBundle } from "./fromFhirDentalCore";

export class DentalCoreBundleRejectedError extends Error {
  constructor() {
    super("Rejected Dental Core bundle: the marker, version, or contained resources are unsupported");
    this.name = "DentalCoreBundleRejectedError";
  }
}

/**
 * Invert the supported Dental Core collection Bundle. The seam is strict:
 * every foreign, unsupported, or malformed input throws instead of being
 * interpreted as an empty chart.
 */
export function parseFhirBundle(bundle: unknown): OdontogramExportPayload {
  const dentalCore = parseDentalCoreBundle(bundle);
  if (dentalCore) return dentalCore;
  throw new DentalCoreBundleRejectedError();
}
