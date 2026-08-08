// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Created by Zoltan Dul (https://github.com/ZoliQua) 2025-2026

import type { OdontogramExportPayload, ToothRecord } from "./types";
import { parseFhirBundleFromRegistry } from "../registry/fromFhir";
import { isDentalDeResource, applyDentalDeResource } from "./fromFhirDentalDe";

/**
 * Invert buildFhirBundle: parse a FHIR R4 collection Bundle back into the
 * {version, globals, teeth} payload importStatus expects.
 *
 * Reads BOTH representations (bead odontogram-3l1, AC3):
 *
 * - the repository's previously supported LEGACY bundle, whose clinical states
 *   carry engine-local codings — unchanged behaviour, still the only shape the
 *   round-trip goldens describe;
 * - canonical `fhir-dental-de` resources, detected by their canonical
 *   identifiers (`meta.profile`, `DentalAssessmentTypeCS` code, or an
 *   `OdontogramComponentCS` component code).
 *
 * A bundle mixing the two reads correctly: the legacy pass ignores canonical
 * resources (they carry no engine-local finding code) and the canonical pass
 * ignores legacy ones. Canonical values are applied on top, so an explicitly
 * canonical assertion wins over a legacy one for the same tooth and axis.
 *
 * Tolerant of bad input: never throws.
 */
export function parseFhirBundle(bundle: unknown): OdontogramExportPayload {
  const payload = parseFhirBundleFromRegistry(bundle);

  const entries = (bundle as { entry?: unknown })?.entry;
  if (Array.isArray(entries)) {
    const teeth = payload.teeth as Record<string, ToothRecord>;
    for (const entry of entries) {
      const resource = (entry as { resource?: unknown })?.resource;
      if (!isDentalDeResource(resource)) continue;
      applyDentalDeResource(teeth, resource);
    }
  }
  return payload;
}
