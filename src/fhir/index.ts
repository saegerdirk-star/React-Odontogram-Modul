/** Optional standalone FHIR adapter entry point. */
export { buildFhirBundle } from "./toFhir";
export { parseFhirBundle } from "./fromFhir";
export { buildDentalDeBundle } from "./toFhirDentalDe";
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
