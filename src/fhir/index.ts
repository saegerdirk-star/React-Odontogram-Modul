// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026

/** Optional standalone FHIR adapter entry point. */
export { buildFhirBundle } from "./toFhir";
export { DentalCoreBundleRejectedError, parseFhirBundle } from "./fromFhir";
export { buildDentalCoreBundle, UnsupportedDentalCoreContentError } from "./toFhirDentalCore";
export { parseDentalCoreBundle } from "./fromFhirDentalCore";
export {
  DENTAL_CORE_CANONICAL,
  DENTAL_CORE_CODE_SYSTEM_URLS,
} from "./generated/dental-core-contract";
export {
  DENTAL_CORE_PROFILES,
  DENTAL_CORE_PACKAGE_VERSION,
} from "./dentalCoreContract";
export type {
  FhirExportOptions,
  OdontogramExportPayload,
} from "./types";
