// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026

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
