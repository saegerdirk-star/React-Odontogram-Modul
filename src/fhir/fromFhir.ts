// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Created by Zoltan Dul (https://github.com/ZoliQua) 2025-2026

import { resolveFhirDialect, type FhirCodecOptions, type OdontogramExportPayload } from "./types";
import { parseFhirBundleFromRegistry } from "../registry/fromFhir";
import { parseDentalCoreBundle } from "./fromFhirDentalCore";
import { DENTAL_CORE, DENTAL_CORE_PROFILES } from "./dentalCoreContract";

const dentalCoreProfileValues = new Set<string>(Object.values(DENTAL_CORE_PROFILES));

export class DentalCoreBundleRejectedError extends Error {
  constructor() {
    super("Rejected Dental Core bundle: the marker, version, or contained resources are unsupported");
    this.name = "DentalCoreBundleRejectedError";
  }
}

/**
 * Invert the supported Dental Core collection Bundle. The boundary is strict:
 * every unsupported or malformed input throws instead of being interpreted as
 * another dialect or an empty chart.
 */
function claimsDentalCore(input: unknown): boolean {
  const candidate = input as {
    resourceType?: unknown;
    identifier?: { system?: unknown; value?: unknown };
    entry?: Array<{ resource?: { meta?: { profile?: unknown } } }>;
  };
  return candidate?.resourceType === "Bundle" && (
    candidate.identifier?.system === DENTAL_CORE
    || (typeof candidate.identifier?.value === "string" && candidate.identifier.value.startsWith("odontogram-dental-core-"))
    || candidate.entry?.some((entry) => Array.isArray(entry.resource?.meta?.profile)
      && entry.resource.meta.profile.some((profile) => typeof profile === "string" && dentalCoreProfileValues.has(profile))) === true
  );
}

function isLegacyBundle(input: unknown): input is { entry: Array<{ resource: { resourceType: string; id?: string } }> } {
  const candidate = input as { resourceType?: unknown; type?: unknown; entry?: unknown };
  return candidate?.resourceType === "Bundle"
    && candidate.type === "collection"
    && Array.isArray(candidate.entry)
    && candidate.entry.every((entry) => typeof (entry as { resource?: unknown })?.resource === "object"
      && typeof ((entry as { resource?: { resourceType?: unknown } }).resource?.resourceType) === "string");
}

function isEmptyLegacyBundle(bundle: { entry: Array<{ resource: { resourceType: string; id?: string } }> }): boolean {
  return bundle.entry.length === 0 || (bundle.entry.length === 1
    && bundle.entry[0]?.resource.resourceType === "Patient"
    && bundle.entry[0].resource.id === "odontogram-subject");
}

export function parseFhirBundle(bundle: unknown, options: FhirCodecOptions = {}): OdontogramExportPayload {
  const dialect = options.dialect === undefined ? undefined : resolveFhirDialect(options.dialect);
  const dentalCore = parseDentalCoreBundle(bundle);
  if (dialect === "dental-core") {
    if (dentalCore) return dentalCore;
    throw new DentalCoreBundleRejectedError();
  }
  if (dialect === undefined && dentalCore) return dentalCore;
  if (claimsDentalCore(bundle)) throw new DentalCoreBundleRejectedError();
  if (!isLegacyBundle(bundle)) throw new DentalCoreBundleRejectedError();
  const legacy = parseFhirBundleFromRegistry(bundle);
  if (Object.keys(legacy.teeth).length > 0 || Object.keys(legacy.globals ?? {}).length > 0 || isEmptyLegacyBundle(bundle)) return legacy;
  throw new DentalCoreBundleRejectedError();
}
