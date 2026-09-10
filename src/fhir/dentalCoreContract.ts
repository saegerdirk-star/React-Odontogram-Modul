import type { ToothRecord } from "../document";
import { DENTAL_CORE_PACKAGE } from "@cognovis/fhir-sdk/dental-core";
import {
  DE_COGNOVIS_FHIR_DENTAL_CORE_EXTENSIONS,
  DE_COGNOVIS_FHIR_DENTAL_CORE_PACKAGE,
  DE_COGNOVIS_FHIR_DENTAL_CORE_PROFILES,
} from "@cognovis/fhir-sdk/canonicals";
import { isFdiTooth } from "../utils/numbering";

export const DENTAL_CORE = DE_COGNOVIS_FHIR_DENTAL_CORE_PROFILES.DentalChartState.replace(
  /\/StructureDefinition\/dental-chart-state$/,
  "",
);
export const DENTAL_CORE_PACKAGE_VERSION = DENTAL_CORE_PACKAGE.version;
export const DENTAL_CORE_BUNDLE_IDENTIFIER = `odontogram-dental-core-${DENTAL_CORE_PACKAGE_VERSION}`;

void DE_COGNOVIS_FHIR_DENTAL_CORE_PACKAGE;

function kebabFromSdkName(name: string): string {
  return name.replace(/Ext$/, "").replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

export const DENTAL_CORE_PROFILES = {
  ...Object.fromEntries(
    Object.entries(DE_COGNOVIS_FHIR_DENTAL_CORE_PROFILES).map(([name, url]) => [kebabFromSdkName(name), url]),
  ),
  ...Object.fromEntries(
    Object.entries(DE_COGNOVIS_FHIR_DENTAL_CORE_EXTENSIONS).map(([name, url]) => [kebabFromSdkName(name), url]),
  ),
} as Record<string, string>;

export const PROPERTY_SYSTEM = `${DENTAL_CORE}/CodeSystem/dental-chart-property`;
export const VALUE_SYSTEM = `${DENTAL_CORE}/CodeSystem/dental-chart-value`;
export const COMPONENT_SYSTEM = `${DENTAL_CORE}/CodeSystem/dental-component`;
export const PROVENANCE_SYSTEM = `${DENTAL_CORE}/CodeSystem/dental-provenance-activity`;
export const FDI_SYSTEM = `${DENTAL_CORE}/CodeSystem/tooth-position-fdi`;

export const isOdontogramFdi = (value: string): boolean => isFdiTooth(value);

export const isDentalCoreDiagnosis = (value: string): boolean =>
  ["health", "gingivitis", "periodontitis"].includes(value);

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
  omitDefault?: boolean;
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
  { field: "sensibility", property: "pulp-sensibility-test", kind: "enum", defaultValue: "none", omitDefault: true, values: identity("none", "vital", "no-response", "questionable") },
  { field: "percussion", property: "percussion-test", kind: "enum", defaultValue: "none", omitDefault: true, values: identity("none", "negative", "sensitive") },
  { field: "eruptionStage", property: "tooth-eruption-stage", kind: "enum", defaultValue: "none", omitDefault: true, values: identity("none", "emerging", "half-crown", "full-crown") },
  { field: "rootFracture", property: "root-fracture", kind: "enum", defaultValue: "none", omitDefault: true, values: identity("none", "vertical", "horizontal") },
  { field: "rootPostType", property: "root-post-type", kind: "enum", defaultValue: "none", omitDefault: true, values: { none: "none", "glass-fiber": "glass-fiber-post", metal: "metal-post" } },
] as const;

export const mappingsByProperty = new Map<string, ChartMapping[]>();
for (const mapping of CHART_MAPPINGS) {
  const mappings = mappingsByProperty.get(mapping.property) ?? [];
  mappings.push(mapping);
  mappingsByProperty.set(mapping.property, mappings);
}

const mappedValueCodes = new Set<string>(
  CHART_MAPPINGS.flatMap((mapping) => Object.values(mapping.values ?? {})),
);

export function isMappedChartProperty(code: string): boolean {
  return mappingsByProperty.has(code);
}

export function isMappedChartValue(code: string): boolean {
  return mappedValueCodes.has(code);
}

const ADMITTED_CORE_PROFILES = new Set<string>([
  DENTAL_CORE_PROFILES["dental-caries-finding"],
  DENTAL_CORE_PROFILES["dental-chart-state"],
  DENTAL_CORE_PROFILES["dental-clinical-provenance"],
  DENTAL_CORE_PROFILES["dental-device"],
  DENTAL_CORE_PROFILES["dental-finding"],
  DENTAL_CORE_PROFILES["dental-gingival-recession-assessment"],
  DENTAL_CORE_PROFILES["dental-implant"],
  DENTAL_CORE_PROFILES["dental-peri-implant-finding"],
  DENTAL_CORE_PROFILES["dental-periodontal-finding"],
  DENTAL_CORE_PROFILES["dental-procedure"],
  DENTAL_CORE_PROFILES["dental-risk-evidence"],
  DENTAL_CORE_PROFILES["dental-service-request"],
  DENTAL_CORE_PROFILES["dental-target-chart-state"],
  DENTAL_CORE_PROFILES["dental-tooth-state"],
]);

const codeAt = (
  concept: { coding?: Array<{ system?: string; code?: string }> } | undefined,
  system: string,
): string | undefined => concept?.coding?.find((coding) => coding.system === system)?.code;

/**
 * A Dental Core resource whose profile or chart property/value codes sit
 * outside this odontogram's mappings. Live load lists those as unsupported
 * instead of rejecting the rest of the collection.
 */
export function unmappedDentalCoreReason(resource: {
  resourceType?: unknown;
  meta?: { profile?: unknown };
  component?: unknown;
  code?: { coding?: Array<{ system?: string; code?: string }> };
}): string | undefined {
  const profiles = Array.isArray(resource.meta?.profile)
    ? resource.meta.profile.filter((value): value is string => typeof value === "string")
    : [];
  const coreProfiles = profiles.filter((profile) => Object.values(DENTAL_CORE_PROFILES).includes(profile));
  if (!coreProfiles.length) return undefined;
  if (!coreProfiles.some((profile) => ADMITTED_CORE_PROFILES.has(profile))) {
    return `Dental Core profile ${coreProfiles[0]} is outside this odontogram's mappings`;
  }
  if (resource.resourceType !== "Observation") return undefined;
  if (coreProfiles.includes(DENTAL_CORE_PROFILES["dental-chart-state"])) {
    const components = Array.isArray(resource.component) ? resource.component : [];
    for (const component of components) {
      if (!component || typeof component !== "object") continue;
      const item = component as {
        code?: { coding?: Array<{ system?: string; code?: string }> };
        valueCodeableConcept?: { coding?: Array<{ system?: string; code?: string }> };
      };
      const property = codeAt(item.code, PROPERTY_SYSTEM);
      if (property && !isMappedChartProperty(property)) {
        return `Chart property ${property} is outside this odontogram's mappings`;
      }
      const coded = codeAt(item.valueCodeableConcept, VALUE_SYSTEM);
      if (property && coded) {
        const mappingValues = (mappingsByProperty.get(property) ?? []).flatMap((mapping) => Object.values(mapping.values ?? {}));
        if (mappingValues.length && !mappingValues.includes(coded)) {
          return `Chart value ${coded} is outside this odontogram's mappings`;
        }
      }
    }
  }
  if (coreProfiles.includes(DENTAL_CORE_PROFILES["dental-finding"])) {
    const property = codeAt(resource.code, PROPERTY_SYSTEM);
    if (property && !isMappedChartProperty(property)) {
      return `Finding property ${property} is outside this odontogram's mappings`;
    }
  }
  return undefined;
}

/** Split the former combined endodontic post values into two orthogonal axes. */
export function normalizeLegacyRootPost(record: ToothRecord): ToothRecord {
  if (record.endo !== "endo-glass-pin" && record.endo !== "endo-metal-pin") return record;
  const inferredPost = record.endo === "endo-glass-pin" ? "glass-fiber" : "metal";
  return {
    ...record,
    endo: "endo-filling",
    rootPostType: record.rootPostType && record.rootPostType !== "none"
      ? record.rootPostType
      : inferredPost,
  };
}
