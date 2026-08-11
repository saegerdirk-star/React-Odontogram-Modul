/** Optional standalone FHIR adapter entry point. */
export { buildFhirBundle } from "./toFhir";
export { parseFhirBundle } from "./fromFhir";
export { buildDentalDeBundle } from "./toFhirDentalDe";
export type {
  FhirDialect,
  FhirExportOptions,
  OdontogramExportPayload,
  DentalDeConversionEntry,
  DentalDeConversionReport,
} from "./types";
