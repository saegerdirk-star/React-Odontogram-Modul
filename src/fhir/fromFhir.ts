// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Created by Zoltan Dul (https://github.com/ZoliQua) 2025-2026

import type { OdontogramExportPayload, ToothRecord } from "./types";
import { parseFhirBundleFromRegistry } from "../registry/fromFhir";
import { isDentalDeResource, applyDentalDeResource } from "./fromFhirDentalDe";
import { parseDentalCoreBundle } from "./fromFhirDentalCore";
import { DENTAL_CORE } from "./dentalCoreContract";

export class DentalCoreBundleRejectedError extends Error {
  constructor() {
    super("Rejected Dental Core bundle: the marker, version, or contained resources are unsupported");
    this.name = "DentalCoreBundleRejectedError";
  }
}

function claimsDentalCore(input: unknown): boolean {
  const bundle = input as { resourceType?: unknown; identifier?: { system?: unknown; value?: unknown } };
  const value = bundle?.identifier?.value;
  return bundle?.resourceType === "Bundle" && (
    bundle.identifier?.system === DENTAL_CORE
    || (typeof value === "string" && value.startsWith("odontogram-dental-core-"))
  );
}

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
 * Tolerant of unrelated bad input. A Bundle that claims Dental Core but does
 * not satisfy the supported contract throws {@link DentalCoreBundleRejectedError}
 * instead of falling through to another dialect and returning an empty chart.
 */
export function parseFhirBundle(bundle: unknown): OdontogramExportPayload {
  const dentalCore = parseDentalCoreBundle(bundle);
  if (dentalCore) return dentalCore;
  if (claimsDentalCore(bundle)) throw new DentalCoreBundleRejectedError();
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
