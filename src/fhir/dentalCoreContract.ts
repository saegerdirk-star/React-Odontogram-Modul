import type { ToothRecord } from "../document";
import {
  DENTAL_CORE_CANONICAL,
  DENTAL_CORE_CODE_SYSTEM_CODES,
  DENTAL_CORE_CODE_SYSTEM_URLS,
  DENTAL_CORE_PACKAGE_VERSION,
  DENTAL_CORE_PROFILE_URLS,
} from "./generated/dental-core-contract";

export const DENTAL_CORE = DENTAL_CORE_CANONICAL;
export { DENTAL_CORE_PACKAGE_VERSION };
export const DENTAL_CORE_BUNDLE_IDENTIFIER = `odontogram-dental-core-${DENTAL_CORE_PACKAGE_VERSION}`;
export const DENTAL_CORE_PROFILES = DENTAL_CORE_PROFILE_URLS;
export const PROPERTY_SYSTEM = DENTAL_CORE_CODE_SYSTEM_URLS["dental-chart-property"];
export const VALUE_SYSTEM = DENTAL_CORE_CODE_SYSTEM_URLS["dental-chart-value"];
export const COMPONENT_SYSTEM = DENTAL_CORE_CODE_SYSTEM_URLS["dental-component"];
export const PROVENANCE_SYSTEM = DENTAL_CORE_CODE_SYSTEM_URLS["dental-provenance-activity"];
export const FDI_SYSTEM = DENTAL_CORE_CODE_SYSTEM_URLS["tooth-position-fdi"];

const propertyCodes = new Set<string>(DENTAL_CORE_CODE_SYSTEM_CODES["dental-chart-property"]);
const valueCodes = new Set<string>(DENTAL_CORE_CODE_SYSTEM_CODES["dental-chart-value"]);
const fdiCodes = new Set<string>(DENTAL_CORE_CODE_SYSTEM_CODES["tooth-position-fdi"]);

export const isDentalCoreFdi = (value: string): boolean => fdiCodes.has(value);
export const isDentalCoreProperty = (value: string): boolean => propertyCodes.has(value);
export const isDentalCoreValue = (value: string): boolean => valueCodes.has(value);
export const isDentalCoreDiagnosis = (value: string): boolean =>
  ["health", "gingivitis", "periodontitis"].includes(value) && isDentalCoreValue(value);

export function isDentalCoreRiskValue(code: string, value: number): boolean {
  if (!Number.isFinite(value)) return false;
  if (code === "cigarettes-per-day") return Number.isInteger(value) && value >= 0 && value <= 99;
  if (code === "periodontitis-attributed-tooth-loss") return Number.isInteger(value) && value >= 0 && value <= 32;
  if (code === "maximum-radiographic-bone-loss") return value >= 0 && value <= 100;
  return false;
}

type SupportedField = keyof ToothRecord;
export interface ChartMapping {
  field: SupportedField;
  property: string;
  kind: "boolean" | "enum" | "set";
  defaultValue?: string;
  values?: Record<string, string>;
}

const identity = (...values: string[]): Record<string, string> =>
  Object.fromEntries(values.map((value) => [value, value]));

export const CHART_MAPPINGS: readonly ChartMapping[] = [
  { field: "endoResection", property: "apicoectomy-performed", kind: "boolean" },
  { field: "mods", property: "legacy-tooth-modifier", kind: "set", values: { inflammation: "inflammation", parodontal: "periodontal-involvement", mobility: "mobility" } },
  { field: "periapicalType", property: "periapical-lesion-type", kind: "enum", defaultValue: "none", values: { none: "none", granuloma: "granuloma", cyst: "radicular-cyst", abscess: "periapical-abscess" } },
  { field: "fissureSealing", property: "fissure-sealant-state", kind: "boolean" },
  { field: "contactMesial", property: "mesial-contact-defect", kind: "boolean" },
  { field: "contactDistal", property: "distal-contact-defect", kind: "boolean" },
  { field: "wearEdge", property: "incisal-occlusal-wear-type", kind: "enum", defaultValue: "none", values: identity("none", "attrition", "erosion") },
  { field: "wearCervical", property: "cervical-wear-type", kind: "enum", defaultValue: "none", values: identity("none", "abrasion", "abfraction", "erosion") },
  { field: "discoloration", property: "tooth-discoloration-type", kind: "enum", defaultValue: "none", values: { none: "none", tetracycline: "tetracycline-staining", fluorosis: "fluorosis", nonvital: "nonvital-darkening", extrinsic: "extrinsic-staining", other: "other-discoloration" } },
  { field: "cejVisibility", property: "cej-identifiability", kind: "enum", defaultValue: "none", values: identity("none", "detectable", "not-detectable") },
  { field: "rootConcavity", property: "root-concavity-category", kind: "enum", defaultValue: "none", values: identity("none", "mild", "deep") },
  { field: "gingivalThickness", property: "unqualified-gingival-phenotype", kind: "enum", defaultValue: "unknown", values: { unknown: "none", thin: "thin", medium: "medium", thick: "thick" } },
  { field: "orthoAppliance", property: "orthodontic-appliance-type", kind: "enum", defaultValue: "none", values: identity("none", "bracket", "band") },
  { field: "orthoDrift", property: "horizontal-tooth-displacement", kind: "enum", defaultValue: "none", values: identity("none", "mesial", "distal") },
  { field: "orthoVertical", property: "vertical-tooth-displacement", kind: "enum", defaultValue: "none", values: identity("none", "extrusion", "intrusion") },
  { field: "orthoRotation", property: "tooth-rotation-present", kind: "boolean" },
  { field: "brokenMesial", property: "mesial-tooth-fracture-present", kind: "boolean" },
  { field: "brokenIncisal", property: "incisal-tooth-fracture-present", kind: "boolean" },
  { field: "brokenDistal", property: "distal-tooth-fracture-present", kind: "boolean" },
  { field: "extractionWound", property: "extraction-wound-present", kind: "boolean" },
  { field: "parapulpalPin", property: "parapulpal-pin-present", kind: "boolean" },
  { field: "missingClosed", property: "edentulous-space-closed", kind: "boolean" },
  { field: "bridgePillar", property: "bridge-abutment-role", kind: "boolean" },
  { field: "pulpLatin", property: "legacy-latin-pulp-diagnosis", kind: "enum", defaultValue: "none", values: identity("none", "pulpa-sana", "hyperaemia-pulpae", "pulpitis-acuta-serosa", "pulpitis-acuta-purulenta", "pulpitis-chronica-clausa", "pulpitis-chronica-ulcerosa", "pulpitis-chronica-hyperplastica", "necrosis-pulpae", "gangraena-pulpae") },
  { field: "resorptionType", property: "root-resorption-type", kind: "enum", defaultValue: "none", values: identity("none", "internal", "external-cervical") },
  { field: "retention", property: "prosthesis-retention-element", kind: "enum", defaultValue: "none", values: identity("none", "clasp", "attachment", "bar-abutment") },
  { field: "retentionSide", property: "retention-engaged-side", kind: "enum", defaultValue: "none", values: identity("none", "mesial", "distal", "both") },
] as const;

for (const mapping of CHART_MAPPINGS) {
  if (!isDentalCoreProperty(mapping.property)) throw new Error(`Unsupported Dental Core property mapping: ${mapping.property}`);
  for (const code of Object.values(mapping.values ?? {})) {
    if (!isDentalCoreValue(code)) throw new Error(`Unsupported Dental Core value mapping: ${code}`);
  }
}

export const mappingsByProperty = new Map<string, ChartMapping[]>();
for (const mapping of CHART_MAPPINGS) {
  const mappings = mappingsByProperty.get(mapping.property) ?? [];
  mappings.push(mapping);
  mappingsByProperty.set(mapping.property, mappings);
}
