// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026

/** Optional standalone FHIR adapter entry point. */
export { buildFhirBundle } from "./toFhir";
export { DentalCoreBundleRejectedError, parseFhirBundle } from "./fromFhir";
export { buildDentalDeBundle } from "./toFhirDentalDe";
export { buildDentalCoreBundle } from "./toFhirDentalCore";
export { parseDentalCoreBundle } from "./fromFhirDentalCore";
export { importDentalDeBundle, DENTAL_DE_COMPATIBILITY } from "./importDentalDe";
export { DENTAL_DE_IMPORT_MANIFEST } from "./dentalDeImportManifest";
export type { DentalDeCarrier, DentalDeImportManifestEntry } from "./dentalDeImportManifest";
export { exportDentalDeBundle } from "./exportDentalDe";
export type {
  DentalDeChangeSet,
  DentalDeExportOptions,
  DentalDeExportResult,
  DentalDeResourceChange,
} from "./exportDentalDe";
export type {
  FhirDialect,
  FhirExportOptions,
  OdontogramExportPayload,
  DentalDeConversionEntry,
  DentalDeConversionReport,
} from "./types";
export type {
  DentalDeImportFailureCode,
  DentalDeImportResult,
  DentalDePatientIdentity,
  SupportedDentalDeBundle,
  SupportedDentalDeResource,
} from "./importDentalDe";
