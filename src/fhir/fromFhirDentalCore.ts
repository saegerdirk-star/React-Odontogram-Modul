import type { Bundle, Observation, Resource } from "fhir/r4";
import { PAYLOAD_VERSION } from "../document";
import { DentalChartStateProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Observation_DentalChartState";
import { DentalCariesFindingProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Observation_DentalCariesFinding";
import { DentalClinicalProvenanceProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Provenance_DentalClinicalProvenance";
import { DentalDeviceProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Device_DentalDevice";
import { DentalFindingProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Observation_DentalFinding";
import { DentalGingivalRecessionAssessmentProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Observation_DentalGingivalRecessionAssessment";
import { DentalImplantProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Device_DentalImplant";
import { DentalPeriImplantFindingProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Observation_DentalPeriImplantFinding";
import { DentalPeriodontalFindingProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Observation_DentalPeriodontalFinding";
import { DentalProcedureProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Procedure_DentalProcedure";
import { DentalRiskEvidenceProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Observation_DentalRiskEvidence";
import { DentalServiceRequestProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/ServiceRequest_DentalServiceRequest";
import { DentalToothStateProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Observation_DentalToothState";
import { LOCAL_SYSTEM, resolveSmokingStatus } from "./codesystems";
import { LOCAL_VALUE_MAPS } from "../registry/valueCatalog";
import type { DentalCoreResourceIdentity, OdontogramExportPayload, ToothRecord } from "./types";
import {
  COMPONENT_SYSTEM,
  DENTAL_CORE,
  DENTAL_CORE_BUNDLE_IDENTIFIER,
  DENTAL_CORE_PROFILES,
  FDI_SYSTEM,
  isDentalCoreDiagnosis,
  isDentalCoreFdi,
  isDentalCoreProperty,
  isDentalCoreRiskValue,
  isDentalCoreValue,
  mappingsByProperty,
  normalizeLegacyRootPost,
  PROPERTY_SYSTEM,
  PROVENANCE_SYSTEM,
  VALUE_SYSTEM,
} from "./dentalCoreContract";

const dentalCoreProfileValues = new Set<string>(Object.values(DENTAL_CORE_PROFILES));

type ResourceRecord = Resource & Record<string, unknown>;
type GeneratedProfile = { from(resource: never): unknown };
type ResourceEntry = { resource: ResourceRecord; fullUrl?: string };

const codeAt = (resource: { coding?: Array<{ system?: string; code?: string }> } | undefined, system: string) =>
  resource?.coding?.find((coding) => coding.system === system)?.code;
const inverse = (values: Record<string, string> | undefined, code: string) =>
  Object.entries(values ?? {}).find(([, mapped]) => mapped === code)?.[0];
const hasAdmittedProfileResource = (resource: ResourceRecord, expected: string): boolean =>
  Array.isArray(resource.meta?.profile)
  && resource.meta.profile.includes(expected)
  && resource.meta.profile.every((profile) => typeof profile !== "string" || profile === expected || !dentalCoreProfileValues.has(profile));
const validGeneratedProfile = (profile: GeneratedProfile, resource: ResourceRecord): boolean => {
  try {
    profile.from(resource as never);
    return true;
  } catch (error) {
    console.log("Dental Core generated profile rejected resource", resource.resourceType, resource.id, error);
    return false;
  }
};
const validGeneratedChoiceSliceProfile = (profile: GeneratedProfile, resource: ResourceRecord): boolean => {
  // Atomic EHR codegen currently validates sliced value[x] fields through a synthetic
  // `value` alias even though generated setters emit the proper valueCodeableConcept.
  // Normalize only the validation clone; the FHIR resource itself is never changed.
  const normalized = structuredClone(resource);
  const components = Array.isArray(normalized.component) ? normalized.component as Array<Record<string, unknown>> : [];
  for (const item of components) {
    if (item.valueCodeableConcept !== undefined && item.value === undefined) item.value = item.valueCodeableConcept;
  }
  return validGeneratedProfile(profile, normalized);
};
const subjectReference = (resource: ResourceRecord): string | undefined => {
  const reference = resource.subject ?? resource.patient;
  return typeof (reference as { reference?: unknown } | undefined)?.reference === "string"
    ? (reference as { reference: string }).reference
    : undefined;
};
const bodySiteFdi = (resource: ResourceRecord): string | undefined =>
  codeAt(resource.bodySite as { coding?: Array<{ system?: string; code?: string }> } | undefined, FDI_SYSTEM);
const isIsoDateTime = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(value);
const clinicalDate = (resource: ResourceRecord): boolean =>
  isIsoDateTime(resource.effectiveDateTime) || isIsoDateTime(resource.performedDateTime) || isIsoDateTime(resource.recorded);

const TOOTH_SURFACE_SYSTEM = "http://terminology.hl7.org/CodeSystem/FDI-surface";
const SURFACE_VALUES: Record<string, string> = { B: "buccal", L: "lingual", M: "mesial", D: "distal", O: "occlusal", I: "incisal", SC: "subcrown" };
const SITE_VALUES: Record<string, string> = {
  "mesiobuccal-site": "MB", "buccal-site": "B", "distobuccal-site": "DB",
  "mesiolingual-site": "ML", "lingual-site": "L", "distolingual-site": "DL",
};

const extensionCoding = (target: unknown, url: string): { system?: string; code?: string } | undefined => {
  const extensions = (target as { extension?: Array<{ url?: string; valueCoding?: { system?: string; code?: string } }> } | undefined)?.extension;
  return extensions?.find((extension) => extension.url === url)?.valueCoding;
};
const componentSurface = (target: unknown): string | undefined => {
  const value = extensionCoding(target, DENTAL_CORE_PROFILES["tooth-surface"]);
  return value?.system === TOOTH_SURFACE_SYSTEM ? SURFACE_VALUES[value.code ?? ""] : undefined;
};
const componentSite = (target: unknown): string | undefined => {
  const value = extensionCoding(target, DENTAL_CORE_PROFILES["periodontal-site"]);
  return value?.system === COMPONENT_SYSTEM ? SITE_VALUES[value.code ?? ""] : undefined;
};
const localValue = (target: unknown): string | undefined =>
  codeAt(target as { coding?: Array<{ system?: string; code?: string }> } | undefined, LOCAL_SYSTEM);
const hasExtension = (target: unknown, url: string): boolean =>
  Array.isArray((target as { extension?: unknown } | undefined)?.extension)
  && ((target as { extension: Array<{ url?: unknown }> }).extension).some((extension) => extension.url === url);
const isLocalValue = (group: string, value: string | undefined): value is string =>
  Boolean(value && LOCAL_VALUE_MAPS[group]?.[value]);

function applySharedResource(payload: OdontogramExportPayload, field: string, resource: ResourceRecord): boolean {
  if (field === "hba1c") {
    const quantity = resource.valueQuantity as { value?: unknown; system?: string; code?: string } | undefined;
    if (resource.resourceType !== "Observation" || codeAt(resource.code as { coding?: Array<{ system?: string; code?: string }> }, "http://loinc.org") !== "4548-4"
      || quantity?.system !== "http://unitsofmeasure.org" || quantity.code !== "%" || typeof quantity.value !== "number" || !Number.isFinite(quantity.value)
      || quantity.value < 3 || quantity.value > 20) return false;
    payload.case = { ...payload.case, hba1c: quantity.value };
    return true;
  }
  if (field === "smokingStatus") {
    const value = resolveSmokingStatus(resource.valueCodeableConcept);
    if (resource.resourceType !== "Observation" || codeAt(resource.code as { coding?: Array<{ system?: string; code?: string }> }, "http://loinc.org") !== "72166-2"
      || !value) return false;
    payload.case = { ...payload.case, smokingStatus: value };
    return true;
  }
  if (field === "diabetesStatus") {
    const coded = (resource.code as { coding?: Array<{ system?: string; code?: string }> } | undefined)?.coding?.some((item) => item.system && item.code);
    if (resource.resourceType !== "Condition" || !coded || resource.meta?.tag?.some((tag) => tag.system === VALUE_SYSTEM)) return false;
    const refuted = codeAt(resource.verificationStatus as { coding?: Array<{ system?: string; code?: string }> }, "http://terminology.hl7.org/CodeSystem/condition-ver-status") === "refuted";
    payload.case = { ...payload.case, diabetesStatus: refuted ? "none" : "present" };
    return true;
  }
  if (field === "edentulous" && resource.resourceType === "Condition") {
    const coded = (resource.code as { coding?: Array<{ system?: string; code?: string }> } | undefined)?.coding?.some((item) => item.system && item.code);
    if (!coded || resource.meta?.tag?.some((tag) => tag.system === VALUE_SYSTEM)) return false;
    payload.globals = { ...payload.globals, edentulous: true };
    return true;
  }
  return false;
}

function applyToothState(record: ToothRecord, resource: ResourceRecord): boolean {
  const seenSingletons = new Set<string>();
  const seenSurfaceValues = new Set<string>();
  for (const item of (resource as unknown as Observation).component ?? []) {
    const kind = codeAt(item.code, COMPONENT_SYSTEM);
    const value = localValue(item.valueCodeableConcept);
    const surface = componentSurface(item);
    if (!kind || !value) return false;
    if (hasExtension(item, DENTAL_CORE_PROFILES["tooth-surface"]) && !surface) return false;
    if (surface && !LOCAL_VALUE_MAPS.fillingSurfaces?.[surface]) return false;
    const surfaceKey = surface ? `${kind}:${surface}` : undefined;
    if (surfaceKey && seenSurfaceValues.has(surfaceKey)) return false;
    if (surfaceKey) seenSurfaceValues.add(surfaceKey);
    if (kind === "tooth-presence") {
      if (seenSingletons.has(kind) || !isLocalValue("toothSelection", value)) return false;
      seenSingletons.add(kind);
      if (value !== "tooth-base") record.toothSelection = value;
    } else if (kind === "tooth-substrate") {
      if (seenSingletons.has(kind) || !isLocalValue("toothSubstrate", value)) return false;
      seenSingletons.add(kind);
      record.toothSubstrate = value;
    } else if (kind === "root-endodontic-state" && isLocalValue("endo", value)) record.endo = value;
    else if (kind === "restoration-type" && surface && value === "direct-filling") {
      (record.fillingSurfaces ??= []).push(surface);
    } else if (kind === "restoration-type" && !surface && isLocalValue("restorationType", value)) record.restorationType = value;
    else if (kind === "restoration-material" && surface && isLocalValue("fillingMaterial", value)) (record.fillingSurfaceMaterials ??= {})[surface] = value;
    else if (kind === "restoration-material" && !surface && isLocalValue("restorationMaterial", value)) record.restorationMaterial = value;
    else if (kind === "restoration-status" && surface && isLocalValue("fillingDefect", value)) (record.fillingDefect ??= {})[surface] = value;
    else if (kind === "restoration-status" && value === "crown-leakage") record.crownLeakage = true;
    else if (kind === "prosthetic-state" && isLocalValue("prosthesis", value)) record.prosthesis = value;
    else return false;
  }
  return seenSingletons.has("tooth-presence");
}

function applyCaries(record: ToothRecord, resource: ResourceRecord): boolean {
  const surface = componentSurface(resource.bodySite);
  const value = localValue(resource.valueCodeableConcept);
  if (!surface || !value) return false;
  const caries = `caries-${surface}`;
  if (!LOCAL_VALUE_MAPS.caries?.[caries]) return false;
  if ((record.caries ??= []).includes(caries)) return false;
  record.caries.push(caries);
  const severity = /^caries-severity-([0-6])$/.exec(value);
  if (severity) (record.cariesSeverity ??= {})[surface] = Number(severity[1]);
  else if (value !== "caries") return false;
  return true;
}

function applyPeriodontal(record: ToothRecord, resource: ResourceRecord): boolean {
  for (const item of (resource as unknown as Observation).component ?? []) {
    const loinc = codeAt(item.code, "http://loinc.org");
    const snomed = codeAt(item.code, "http://snomed.info/sct");
    const dental = codeAt(item.code, COMPONENT_SYSTEM);
    const local = codeAt(item.code, LOCAL_SYSTEM);
    const site = componentSite(item);
    const surface = componentSurface(item);
    if (hasExtension(item, DENTAL_CORE_PROFILES["periodontal-site"]) && !site) return false;
    if (hasExtension(item, DENTAL_CORE_PROFILES["tooth-surface"]) && !surface) return false;
    if (loinc === "32910-2" && site && typeof item.valueQuantity?.value === "number" && item.valueQuantity.value >= 1 && item.valueQuantity.value <= 15) ((record.perio ??= { pd: {}, gm: {}, bop: [], sup: [] }).pd)[site] = item.valueQuantity.value;
    else if (loinc === "64043-3" && site && typeof item.valueQuantity?.value === "number" && item.valueQuantity.value >= -10 && item.valueQuantity.value <= 20) ((record.perio ??= { pd: {}, gm: {}, bop: [], sup: [] }).gm)[site] = item.valueQuantity.value;
    else if (snomed === "249420004" && site && item.valueBoolean === true) (record.perio ??= { pd: {}, gm: {}, bop: [], sup: [] }).bop.push(site);
    else if (dental === "suppuration-on-probing" && site && item.valueBoolean === true) (record.perio ??= { pd: {}, gm: {}, bop: [], sup: [] }).sup.push(site);
    else if (local === "tooth-mobility") {
      const value = localValue(item.valueCodeableConcept);
      if (!isLocalValue("mobility", value)) return false;
      record.mobility = value;
    } else if (local === "calculus" && item.valueBoolean === true) record.calculus = true;
    else if (loinc === "34016-6" && surface && item.valueBoolean === true) (record.plaque ??= []).push(surface);
    else if (dental === "plaque-index" && surface && Number.isInteger(item.valueInteger) && item.valueInteger! >= 0 && item.valueInteger! <= 3) (record.pi ??= {})[surface] = item.valueInteger!;
    else if (dental === "gingival-index" && surface && Number.isInteger(item.valueInteger) && item.valueInteger! >= 0 && item.valueInteger! <= 3) (record.gi ??= {})[surface] = item.valueInteger!;
    else if (dental === "keratinized-gingiva-width" && typeof item.valueQuantity?.value === "number" && item.valueQuantity.value >= 0 && item.valueQuantity.value <= 15) record.kg = item.valueQuantity.value;
    else if (snomed === "771311009" && surface) {
      const value = /^furcation-([1-4])$/.exec(localValue(item.valueCodeableConcept) ?? "");
      if (!value) return false;
      (record.furcation ??= {})[surface] = Number(value[1]);
    } else return false;
  }
  return true;
}

function applyPeriImplant(record: ToothRecord, resource: ResourceRecord): boolean {
  for (const item of (resource as unknown as Observation).component ?? []) {
    const dental = codeAt(item.code, COMPONENT_SYSTEM);
    const local = codeAt(item.code, LOCAL_SYSTEM);
    const surface = componentSurface(item);
    if (hasExtension(item, DENTAL_CORE_PROFILES["tooth-surface"]) && !surface) return false;
    if (local === "peri-implant-status") {
      const value = localValue(item.valueCodeableConcept);
      if (!isLocalValue("periImplant", value)) return false;
      record.periImplant = value;
    } else if (dental === "modified-plaque-index" && surface && Number.isInteger(item.valueInteger) && item.valueInteger! >= 0 && item.valueInteger! <= 3) (record.mpi ??= {})[surface] = item.valueInteger!;
    else if (dental === "modified-sulcus-bleeding-index" && surface && Number.isInteger(item.valueInteger) && item.valueInteger! >= 0 && item.valueInteger! <= 3) (record.mbi ??= {})[surface] = item.valueInteger!;
    else return false;
  }
  return true;
}

function applyImplant(record: ToothRecord, resource: ResourceRecord): boolean {
  record.toothSelection = "implant";
  const product: NonNullable<ToothRecord["implantProduct"]> = {};
  if (typeof resource.manufacturer === "string") product.manufacturer = resource.manufacturer;
  const name = Array.isArray(resource.deviceName) ? (resource.deviceName[0] as { name?: unknown } | undefined)?.name : undefined;
  if (typeof name === "string") product.system = name;
  if (typeof resource.lotNumber === "string") product.lot = resource.lotNumber;
  if (typeof resource.serialNumber === "string") product.serial = resource.serialNumber;
  if (typeof resource.expirationDate === "string") product.expiry = resource.expirationDate;
  const identifiers = Array.isArray(resource.identifier) ? resource.identifier as Array<{ system?: string; value?: string }> : [];
  const deviceIdentifier = identifiers.find((identifier) => identifier.system === "urn:oid:2.51.1.1")?.value;
  const udi = identifiers.find((identifier) => identifier.system === LOCAL_SYSTEM && identifier.value !== undefined)?.value;
  if (deviceIdentifier) product.deviceIdentifier = deviceIdentifier;
  if (udi) product.udi = udi;
  const properties = Array.isArray(resource.property) ? resource.property as Array<{
    type?: { coding?: Array<{ system?: string; code?: string }> };
    valueQuantity?: Array<{ value?: unknown; system?: string; code?: string }>;
  }> : [];
  const seenProperties = new Set<string>();
  for (const property of properties) {
    const kind = codeAt(property.type, LOCAL_SYSTEM);
    const quantity = property.valueQuantity?.[0];
    if (!kind || seenProperties.has(kind) || quantity?.system !== "http://unitsofmeasure.org" || quantity.code !== "mm" || typeof quantity.value !== "number" || !Number.isFinite(quantity.value) || quantity.value <= 0) return false;
    seenProperties.add(kind);
    if (kind === "implant-diameter") product.diameterMm = quantity.value;
    else if (kind === "implant-length") product.lengthMm = quantity.value;
    else return false;
  }
  if (Object.keys(product).length) record.implantProduct = product;
  return true;
}

function applyRecession(record: ToothRecord, resource: ResourceRecord): boolean {
  if (hasExtension(resource.bodySite, DENTAL_CORE_PROFILES["tooth-surface"]) && !componentSurface(resource.bodySite)) return false;
  const item = ((resource as unknown as Observation).component ?? []).find((candidate) => codeAt(candidate.code, COMPONENT_SYSTEM) === "miller-recession-classification");
  const value = codeAt(item?.valueCodeableConcept, `${DENTAL_CORE}/CodeSystem/miller-gingival-recession-1985`);
  if (!value || !["I", "II", "III", "IV"].includes(value)) return false;
  record.millerClass = value.toLowerCase();
  return true;
}

function applyChart(record: ToothRecord, observation: Observation): boolean {
  const seen = new Set<string>();
  for (const component of observation.component ?? []) {
    const property = codeAt(component.code, PROPERTY_SYSTEM);
    if (!property || !isDentalCoreProperty(property)) return false;
    const candidates = mappingsByProperty.get(property);
    if (!candidates?.length) return false;
    const coded = codeAt(component.valueCodeableConcept, VALUE_SYSTEM);
    if (coded && !isDentalCoreValue(coded)) return false;
    const mapping = candidates.find((candidate) => candidate.kind !== "boolean" || !candidate.values?.true || candidate.values.true === coded) ?? candidates[0];
    const duplicateKey = mapping.kind === "set" ? `${property}:${coded ?? ""}` : property;
    if (seen.has(duplicateKey)) return false;
    seen.add(duplicateKey);
    if (mapping.kind === "boolean") {
      if (coded && mapping.values?.true === coded) (record as Record<string, unknown>)[mapping.field] = true;
      else if (typeof component.valueBoolean === "boolean") (record as Record<string, unknown>)[mapping.field] = component.valueBoolean;
      else return false;
      continue;
    }
    if (!coded) return false;
    const source = inverse(mapping.values, coded);
    if (!source) return false;
    if (mapping.kind === "set") {
      const values = ((record as Record<string, unknown>)[mapping.field] as string[] | undefined) ?? [];
      values.push(source);
      (record as Record<string, unknown>)[mapping.field] = values;
    } else (record as Record<string, unknown>)[mapping.field] = source;
  }
  return true;
}

function applyProcedure(record: ToothRecord, resource: ResourceRecord): boolean {
  const fdi = bodySiteFdi({ ...resource, bodySite: Array.isArray(resource.bodySite) ? resource.bodySite[0] : undefined });
  if (!fdi || !isDentalCoreFdi(fdi) || !clinicalDate(resource)) return false;
  const text = (resource.code as { text?: unknown } | undefined)?.text;
  if (text === "Apicoectomy or root-end resection") record.endoResection = true;
  else if (text === "Fissure sealing") record.fissureSealing = true;
  else return false;
  return true;
}

function applyDevice(record: ToothRecord, resource: ResourceRecord): boolean {
  const extension = Array.isArray(resource.extension) ? resource.extension : [];
  const position = extension.find((entry) => (
    entry as { url?: unknown }
  ).url === DENTAL_CORE_PROFILES["tooth-position"]) as { valueCoding?: { system?: string; code?: string } } | undefined;
  const fdi = position?.valueCoding?.system === FDI_SYSTEM ? position.valueCoding.code : undefined;
  if (!fdi || !isDentalCoreFdi(fdi)) return false;
  const text = (resource.type as { text?: unknown } | undefined)?.text;
  if (text === "Orthodontic bracket") record.orthoAppliance = "bracket";
  else if (text === "Orthodontic band") record.orthoAppliance = "band";
  else if (text === "Parapulpal pin") record.parapulpalPin = true;
  else if (text === "Bridge abutment") record.bridgePillar = true;
  else if (text === "Prosthesis retention clasp") record.retention = "clasp";
  else if (text === "Prosthesis retention attachment") record.retention = "attachment";
  else if (text === "Prosthesis retention bar-abutment") record.retention = "bar-abutment";
  else return false;
  return true;
}

function applyFinding(record: ToothRecord, resource: ResourceRecord): boolean {
  const fdi = bodySiteFdi(resource);
  const property = codeAt((resource.code as { coding?: Array<{ system?: string; code?: string }> } | undefined), PROPERTY_SYSTEM);
  const value = codeAt((resource.valueCodeableConcept as { coding?: Array<{ system?: string; code?: string }> } | undefined), VALUE_SYSTEM);
  if (!fdi || !isDentalCoreFdi(fdi) || !property || !isDentalCoreProperty(property) || !clinicalDate(resource)) return false;
  const booleanMapping = mappingsByProperty.get(property)?.find((candidate) => candidate.kind === "boolean");
  if (booleanMapping && typeof resource.valueBoolean === "boolean") {
    (record as Record<string, unknown>)[booleanMapping.field] = resource.valueBoolean;
    return true;
  }
  if (!value || !isDentalCoreValue(value)) return false;
  const mapping = mappingsByProperty.get(property)?.find((candidate) => candidate.kind === "enum" && candidate.values?.[inverse(candidate.values, value) ?? ""] === value);
  if (!mapping) return false;
  const source = inverse(mapping.values, value);
  if (!source) return false;
  (record as Record<string, unknown>)[mapping.field] = source;
  return true;
}

export function parseDentalCoreBundle(input: unknown): OdontogramExportPayload | undefined {
  const bundle = input as Bundle;
  if (bundle?.resourceType !== "Bundle" || bundle.type !== "collection" || !Array.isArray(bundle.entry)) return undefined;
  const hasBundleMarker = bundle.identifier?.system === DENTAL_CORE && bundle.identifier?.value === DENTAL_CORE_BUNDLE_IDENTIFIER;
  const hasAdmittedProfile = bundle.entry.some((entry) => {
    const profiles = (entry.resource as ResourceRecord | undefined)?.meta?.profile;
    return Array.isArray(profiles) && profiles.some((profile) => typeof profile === "string" && dentalCoreProfileValues.has(profile));
  });
  if (!hasBundleMarker && !hasAdmittedProfile) return undefined;
  // PAYLOAD_VERSION statt einer Zahl: hier stand "2.25" fest verdrahtet und
  // waere bei jedem Bump veraltet - ein importiertes Dokument haette dann eine
  // andere Version getragen als ein exportiertes, ohne dass sich am Inhalt
  // etwas unterscheidet (odontogram-fu1, 20.08.2026).
  const payload: OdontogramExportPayload = { version: PAYLOAD_VERSION, globals: {}, teeth: {} };
  const entriesByReference = new Map<string, ResourceEntry>();
  for (const entry of bundle.entry) {
    const resource = entry?.resource as ResourceRecord | undefined;
    if (!resource || typeof resource.resourceType !== "string") return undefined;
    const resolved = { resource, ...(typeof entry.fullUrl === "string" ? { fullUrl: entry.fullUrl } : {}) };
    if (typeof resource.id === "string" && resource.id) {
      const relative = `${resource.resourceType}/${resource.id}`;
      if (entriesByReference.has(relative)) return undefined;
      entriesByReference.set(relative, resolved);
    } else if (!resolved.fullUrl) return undefined;
    if (resolved.fullUrl) {
      if (entriesByReference.has(resolved.fullUrl)) return undefined;
      entriesByReference.set(resolved.fullUrl, resolved);
    }
  }
  const resolveReference = (reference: unknown): ResourceEntry | undefined =>
    typeof reference === "string" ? entriesByReference.get(reference) : undefined;
  const referencesResource = (reference: unknown, resource: ResourceRecord | undefined): boolean =>
    !!resource && resolveReference(reference)?.resource === resource;
  const identities: Record<string, DentalCoreResourceIdentity> = {};
  const captureIdentity = (key: string, entry: ResourceEntry, resource: ResourceRecord): void => {
    identities[key] = {
      ...(typeof resource.id === "string" && resource.id ? { id: resource.id } : {}),
      ...(typeof resource.meta?.versionId === "string" ? { versionId: resource.meta.versionId } : {}),
      ...(entry.fullUrl ? { fullUrl: entry.fullUrl } : {}),
    };
  };
  const sharedResourceFields = new Map<ResourceRecord, string>();
  const sharedProvenanceFields = new Map<ResourceRecord, string>();
  for (const entry of bundle.entry) {
    const resource = entry.resource as ResourceRecord;
    if (resource.resourceType !== "Provenance") continue;
    const sharedCode = codeAt(Array.isArray(resource.reason) ? resource.reason[0] as { coding?: Array<{ system?: string; code?: string }> } : undefined, LOCAL_SYSTEM);
    const field = sharedCode?.startsWith("shared-resource-") ? sharedCode.slice("shared-resource-".length) : undefined;
    if (!field || !["diabetesStatus", "hba1c", "smokingStatus", "edentulous"].includes(field)) continue;
    if (!hasAdmittedProfileResource(resource, DENTAL_CORE_PROFILES["dental-clinical-provenance"]) || !validGeneratedProfile(DentalClinicalProvenanceProfile, resource) || !clinicalDate(resource)) return undefined;
    const targets = Array.isArray(resource.target) ? resource.target as Array<{ reference?: unknown }> : [];
    const target = targets.length === 1 ? resolveReference(targets[0].reference)?.resource : undefined;
    if (!target || [...sharedResourceFields.values()].includes(field) || sharedResourceFields.has(target)) return undefined;
    sharedResourceFields.set(target, field);
    sharedProvenanceFields.set(resource, field);
  }
  const identifiers = new Set<string>();
  const patientEntries = [...new Set(entriesByReference.values())].filter((entry) => entry.resource.resourceType === "Patient");
  if (patientEntries.length > 1) return undefined;
  let expectedSubject: string | undefined;
  const effectiveDates = new Set<string>();
  let hasPlan = false;
  let planActivities: Set<ResourceRecord> | undefined;
  const planRequests = new Set<ResourceRecord>();
  const planRequestFdi = new Set<string>();
  const changeRequestIds = new Set<string>();
  const plannedFdi = new Set<string>();
  const chartIds = new Set<string>();
  const findingIds = new Set<string>();
  const procedureIds = new Set<string>();
  const deviceIds = new Set<string>();
  const profileIds = new Set<string>();
  const riskCodes = new Set<string>();
  const sharedFields = new Set<string>();
  const claims = new Map<string, string>();
  let carePlan: ResourceRecord | undefined;
  let diagnosis: ResourceRecord | undefined;
  let provenance: ResourceRecord | undefined;

  const claim = (fdi: string, field: string, value: unknown, chart: "status" | "plan" = "status"): boolean => {
    const key = `${chart}:${fdi}:${field}`;
    const encoded = JSON.stringify(value);
    const previous = claims.get(key);
    if (previous !== undefined && previous !== encoded) return false;
    claims.set(key, encoded);
    return true;
  };
  const mergeDecoded = (fdi: string, decoded: ToothRecord, planned: boolean): boolean => {
    const target = planned ? ((payload.plan ??= {})[fdi] ??= {}) : (payload.teeth[fdi] ??= {});
    for (const [field, value] of Object.entries(decoded)) {
      if (!claim(fdi, field, value, planned ? "plan" : "status")) return false;
      (target as Record<string, unknown>)[field] = value;
    }
    return true;
  };
  const isPlannedObservation = (resource: ResourceRecord): boolean | undefined => {
    const basedOn = Array.isArray(resource.basedOn) ? resource.basedOn as Array<{ reference?: unknown }> : [];
    if (!basedOn.length) return false;
    return carePlan && basedOn.some((reference) => referencesResource(reference.reference, carePlan)) ? true : undefined;
  };

  for (const entry of bundle.entry) {
    const resource = entry?.resource as ResourceRecord | undefined;
    if (!resource || resource.resourceType === "Patient" || resource.resourceType === "Provenance" || sharedResourceFields.has(resource)) continue;
    const subject = subjectReference(resource);
    if (!subject || (expectedSubject && expectedSubject !== subject && resolveReference(expectedSubject)?.resource !== resolveReference(subject)?.resource)) return undefined;
    expectedSubject = subject;
    const date = resource.effectiveDateTime ?? resource.performedDateTime ?? resource.recordedDate;
    if (isIsoDateTime(date)) effectiveDates.add(date);
  }

  for (const entry of bundle.entry) {
    const resource = entry?.resource as ResourceRecord | undefined;
    if (!resource || typeof resource.resourceType !== "string") return undefined;
    const resolvedEntry = (typeof resource.id === "string" && resource.id ? entriesByReference.get(`${resource.resourceType}/${resource.id}`) : undefined)
      ?? (typeof entry.fullUrl === "string" ? entriesByReference.get(entry.fullUrl) : undefined);
    if (!resolvedEntry) return undefined;
    const key = `${resource.resourceType}/${resource.id ?? entry.fullUrl}`;
    if (identifiers.has(key)) return undefined;
    identifiers.add(key);
    if (resource.resourceType === "Patient") {
      captureIdentity("Patient/subject", resolvedEntry, resource);
      continue;
    }
    const sharedField = sharedResourceFields.get(resource);
    if (sharedField) {
      const sharedSubject = subjectReference(resource);
      const expectedResource = expectedSubject ? resolveReference(expectedSubject)?.resource : undefined;
      const aliased = expectedResource !== undefined && expectedResource === resolveReference(sharedSubject)?.resource;
      if (!sharedSubject || (expectedSubject && expectedSubject !== sharedSubject && !aliased)) return undefined;
      expectedSubject ??= sharedSubject;
      if (!applySharedResource(payload, sharedField, resource)) return undefined;
      captureIdentity(`SharedResource/${sharedField}`, resolvedEntry, resource);
      continue;
    }
    const subject = subjectReference(resource);
    if (resource.resourceType !== "Provenance" && (!subject || subject !== expectedSubject)) return undefined;
    if (resource.resourceType === "CarePlan") {
      if (carePlan || resource.status !== "active" || resource.intent !== "plan" || !subject) return undefined;
      if (!Array.isArray(resource.activity)) return undefined;
      const activities = resource.activity.map((activity) => (activity as { reference?: { reference?: unknown } }).reference?.reference);
      const targets = activities.map(resolveReference);
      if (targets.some((target) => target?.resource.resourceType !== "ServiceRequest")) return undefined;
      planActivities = new Set(targets.map((target) => target?.resource as ResourceRecord));
      if (planActivities.size !== activities.length) return undefined;
      carePlan = resource;
      hasPlan = true;
      captureIdentity("CarePlan/plan", resolvedEntry, resource);
      continue;
    }
    if (resource.resourceType === "Condition") {
      if (diagnosis || !subject || !isIsoDateTime(resource.recordedDate)) return undefined;
      diagnosis = resource;
      captureIdentity("Condition/periodontal-diagnosis", resolvedEntry, resource);
      continue;
    }
    if (resource.resourceType === "Provenance") {
      if (!hasAdmittedProfileResource(resource, DENTAL_CORE_PROFILES["dental-clinical-provenance"]) || !validGeneratedProfile(DentalClinicalProvenanceProfile, resource) || !clinicalDate(resource)) return undefined;
      const shared = sharedProvenanceFields.get(resource);
      if (shared) {
        if (sharedFields.has(shared)) return undefined;
        sharedFields.add(shared);
        captureIdentity(`Provenance/shared/${shared}`, resolvedEntry, resource);
        continue;
      }
      if (provenance) return undefined;
      provenance = resource;
      captureIdentity("Provenance/clinical", resolvedEntry, resource);
      continue;
    }
    if (resource.resourceType === "Observation" && hasAdmittedProfileResource(resource, DENTAL_CORE_PROFILES["dental-tooth-state"])) {
      if (!validGeneratedChoiceSliceProfile(DentalToothStateProfile, resource) || resource.status !== "final" || !clinicalDate(resource)) return undefined;
      const fdi = bodySiteFdi(resource);
      const planned = isPlannedObservation(resource);
      if (!fdi || !isDentalCoreFdi(fdi) || planned === undefined || profileIds.has(`tooth-state:${planned}:${fdi}`)) return undefined;
      const decoded: ToothRecord = {};
      if (!applyToothState(decoded, resource) || !mergeDecoded(fdi, decoded, planned)) return undefined;
      profileIds.add(`tooth-state:${planned}:${fdi}`);
      if (planned) plannedFdi.add(fdi);
      captureIdentity(`Observation/tooth-state/${planned ? "plan/" : ""}${fdi}`, resolvedEntry, resource);
      continue;
    }
    if (resource.resourceType === "Observation" && hasAdmittedProfileResource(resource, DENTAL_CORE_PROFILES["dental-caries-finding"])) {
      if (!validGeneratedProfile(DentalCariesFindingProfile, resource) || resource.status !== "final" || !clinicalDate(resource)) return undefined;
      const fdi = bodySiteFdi(resource);
      const surface = componentSurface(resource.bodySite);
      const planned = isPlannedObservation(resource);
      const rootValue = !surface ? /^root-caries-(.+)$/.exec(localValue(resource.valueCodeableConcept) ?? "")?.[1] : undefined;
      if (rootValue) {
        if (!fdi || !isDentalCoreFdi(fdi) || planned === undefined || !LOCAL_VALUE_MAPS.rootCaries?.[rootValue] || profileIds.has(`root-caries:${planned}:${fdi}`)) return undefined;
        if (!mergeDecoded(fdi, { rootCaries: rootValue }, planned)) return undefined;
        profileIds.add(`root-caries:${planned}:${fdi}`);
        if (planned) plannedFdi.add(fdi);
        captureIdentity(`Observation/caries/${planned ? "plan/" : ""}root/${fdi}`, resolvedEntry, resource);
        continue;
      }
      if (!fdi || !surface || !isDentalCoreFdi(fdi) || planned === undefined || profileIds.has(`caries:${planned}:${fdi}:${surface}`)) return undefined;
      const decoded: ToothRecord = {};
      if (!applyCaries(decoded, resource)) return undefined;
      const target = planned ? ((payload.plan ??= {})[fdi] ??= {}) : (payload.teeth[fdi] ??= {});
      const caries = decoded.caries?.[0];
      const severity = decoded.cariesSeverity?.[surface];
      if (!caries || !claim(fdi, `caries:${surface}`, caries, planned ? "plan" : "status")) return undefined;
      (target.caries ??= []).push(caries);
      if (severity !== undefined) {
        if (!claim(fdi, `cariesSeverity:${surface}`, severity, planned ? "plan" : "status")) return undefined;
        (target.cariesSeverity ??= {})[surface] = severity;
      }
      profileIds.add(`caries:${planned}:${fdi}:${surface}`);
      if (planned) plannedFdi.add(fdi);
      captureIdentity(`Observation/caries/${planned ? "plan/" : ""}${fdi}/${surface}`, resolvedEntry, resource);
      continue;
    }
    if (resource.resourceType === "Observation" && hasAdmittedProfileResource(resource, DENTAL_CORE_PROFILES["dental-peri-implant-finding"])) {
      if (!validGeneratedProfile(DentalPeriImplantFindingProfile, resource) || resource.status !== "final" || !clinicalDate(resource)) return undefined;
      const fdi = bodySiteFdi(resource);
      const focus = Array.isArray(resource.focus) ? resource.focus as Array<{ reference?: unknown }> : [];
      const focused = focus.length === 1 ? resolveReference(focus[0].reference)?.resource : undefined;
      if (!fdi || !isDentalCoreFdi(fdi) || profileIds.has(`peri-implant:${fdi}`) || !focused || !hasAdmittedProfileResource(focused, DENTAL_CORE_PROFILES["dental-implant"])) return undefined;
      const decoded: ToothRecord = {};
      if (!applyPeriImplant(decoded, resource) || !mergeDecoded(fdi, decoded, false)) return undefined;
      profileIds.add(`peri-implant:${fdi}`);
      captureIdentity(`Observation/peri-implant/${fdi}`, resolvedEntry, resource);
      continue;
    }
    if (resource.resourceType === "Observation" && hasAdmittedProfileResource(resource, DENTAL_CORE_PROFILES["dental-periodontal-finding"])) {
      if (!validGeneratedProfile(DentalPeriodontalFindingProfile, resource) || resource.status !== "final" || !clinicalDate(resource)) return undefined;
      const fdi = bodySiteFdi(resource);
      const planned = isPlannedObservation(resource);
      if (!fdi || !isDentalCoreFdi(fdi) || planned === undefined || profileIds.has(`periodontal:${planned}:${fdi}`)) return undefined;
      const decoded: ToothRecord = {};
      if (!applyPeriodontal(decoded, resource) || !mergeDecoded(fdi, decoded, planned)) return undefined;
      profileIds.add(`periodontal:${planned}:${fdi}`);
      if (planned) plannedFdi.add(fdi);
      captureIdentity(`Observation/periodontal/${planned ? "plan/" : ""}${fdi}`, resolvedEntry, resource);
      continue;
    }
    if (resource.resourceType === "Observation" && hasAdmittedProfileResource(resource, DENTAL_CORE_PROFILES["dental-gingival-recession-assessment"])) {
      if (!validGeneratedChoiceSliceProfile(DentalGingivalRecessionAssessmentProfile, resource) || resource.status !== "final" || !clinicalDate(resource)) return undefined;
      const fdi = bodySiteFdi(resource);
      const planned = isPlannedObservation(resource);
      if (!fdi || !isDentalCoreFdi(fdi) || planned === undefined || profileIds.has(`recession:${planned}:${fdi}`)) return undefined;
      const decoded: ToothRecord = {};
      if (!applyRecession(decoded, resource) || !mergeDecoded(fdi, decoded, planned)) return undefined;
      profileIds.add(`recession:${planned}:${fdi}`);
      if (planned) plannedFdi.add(fdi);
      captureIdentity(`Observation/recession/${planned ? "plan/" : ""}${fdi}`, resolvedEntry, resource);
      continue;
    }
    if (resource.resourceType === "Observation" && hasAdmittedProfileResource(resource, DENTAL_CORE_PROFILES["dental-chart-state"])) {
      if (!validGeneratedProfile(DentalChartStateProfile, resource) || resource.status !== "final" || codeAt(resource.code as { coding?: Array<{ system?: string; code?: string }> }, COMPONENT_SYSTEM) !== "chart-state" || !subject || !clinicalDate(resource)) return undefined;
      const fdi = bodySiteFdi(resource);
      if (!fdi || !isDentalCoreFdi(fdi)) return undefined;
      const planned = Array.isArray(resource.basedOn) && resource.basedOn.some((reference) => referencesResource((reference as { reference?: unknown }).reference, carePlan));
      if (Array.isArray(resource.basedOn) && resource.basedOn.length && !planned) return undefined;
      const chartKey = `${planned ? "plan" : "status"}:${fdi}`;
      if (chartIds.has(chartKey)) return undefined;
      chartIds.add(chartKey);
      for (const component of (resource as unknown as Observation).component ?? []) {
        const property = codeAt(component.code, PROPERTY_SYSTEM);
        const mappings = property ? mappingsByProperty.get(property) : undefined;
        const coded = codeAt(component.valueCodeableConcept, VALUE_SYSTEM);
        const mapping = mappings?.find((candidate) => candidate.kind !== "boolean" || !candidate.values?.true || candidate.values.true === coded) ?? mappings?.[0];
        if (!mapping) return undefined;
        const value = mapping.kind === "boolean"
          ? (coded ? true : component.valueBoolean)
          : inverse(mapping.values, coded ?? "");
        if (value === undefined || (mapping.kind !== "set" && !claim(fdi, mapping.field, value, planned ? "plan" : "status"))) return undefined;
      }
      const target = planned ? (payload.plan ??= {}) : payload.teeth;
      if (!applyChart((target[fdi] ??= {}), resource as unknown as Observation)) return undefined;
      if (planned) plannedFdi.add(fdi);
      captureIdentity(`Observation/chart/${planned ? "plan" : "status"}/${fdi}`, resolvedEntry, resource);
      continue;
    }
    if (resource.resourceType === "Observation" && hasAdmittedProfileResource(resource, DENTAL_CORE_PROFILES["dental-risk-evidence"])) {
      if (!validGeneratedProfile(DentalRiskEvidenceProfile, resource) || resource.status !== "final" || !subject || !clinicalDate(resource)) return undefined;
      const code = codeAt(resource.code as { coding?: Array<{ system?: string; code?: string }> }, COMPONENT_SYSTEM);
      const value = code === "maximum-radiographic-bone-loss" ? (resource.valueQuantity as { value?: unknown } | undefined)?.value : resource.valueInteger;
      if (!code || riskCodes.has(code) || typeof value !== "number" || !isDentalCoreRiskValue(code, value)) return undefined;
      riskCodes.add(code);
      payload.case ??= {};
      if (code === "cigarettes-per-day") payload.case.cigarettesPerDay = value;
      if (code === "periodontitis-attributed-tooth-loss") payload.case.toothLossPerio = value;
      if (code === "maximum-radiographic-bone-loss") payload.case.maxRblPercent = value;
      captureIdentity(`Observation/risk/${code}`, resolvedEntry, resource);
      continue;
    }
    if (resource.resourceType === "Observation" && hasAdmittedProfileResource(resource, DENTAL_CORE_PROFILES["dental-finding"])) {
      if (!validGeneratedProfile(DentalFindingProfile, resource) || resource.status !== "final" || !subject) return undefined;
      const fdi = bodySiteFdi(resource);
      const property = codeAt(resource.code as { coding?: Array<{ system?: string; code?: string }> }, PROPERTY_SYSTEM);
      const local = codeAt(resource.code as { coding?: Array<{ system?: string; code?: string }> }, LOCAL_SYSTEM);
      if (local) {
        const planned = isPlannedObservation(resource);
        const surface = componentSurface(resource.bodySite);
        if (!fdi || !isDentalCoreFdi(fdi) || planned === undefined || (hasExtension(resource.bodySite, DENTAL_CORE_PROFILES["tooth-surface"]) && !surface)) return undefined;
        const target = planned ? ((payload.plan ??= {})[fdi] ??= {}) : (payload.teeth[fdi] ??= {});
        const scope = planned ? "plan" : "status";
        let key: string;
        if (local === "pulpDx" || local === "apicalDx") {
          const value = localValue(resource.valueCodeableConcept);
          if (!isLocalValue(local, value)) return undefined;
          key = local;
          if (!claim(fdi, key, value, scope)) return undefined;
          target[local] = value;
        } else if (local === "radiographic-depth" && surface) {
          const value = localValue(resource.valueCodeableConcept);
          if (!isLocalValue("radiographicDepth", value)) return undefined;
          key = `radiographicDepth:${surface}`;
          if (!claim(fdi, key, value, scope)) return undefined;
          (target.radiographicDepth ??= {})[surface] = value;
        } else if (local === "cervical-involvement" && (surface === "buccal" || surface === "lingual") && resource.valueBoolean === true) {
          key = `cervicalSurfaces:${surface}`;
          if (!claim(fdi, key, true, scope)) return undefined;
          (target.cervicalSurfaces ??= []).push(surface);
        } else if (local.startsWith("assessment:")) {
          const point = local.slice("assessment:".length);
          const value = localValue(resource.valueCodeableConcept);
          if (!/^[A-Za-z0-9._:-]+$/.test(point) || !value || !["assessed", "not-assessed", "unmeasurable", "not-applicable"].includes(value)) return undefined;
          key = `assessment:${point}`;
          if (!claim(fdi, key, value, scope)) return undefined;
          (target.assessment ??= {})[point] = value as "assessed" | "not-assessed" | "unmeasurable" | "not-applicable";
        } else if (local === "odontogram-note") {
          const notes = Array.isArray(resource.note) ? resource.note as Array<{ text?: unknown }> : [];
          const value = notes.length === 1 && typeof notes[0].text === "string" && notes[0].text ? notes[0].text : undefined;
          if (!value) return undefined;
          key = "note";
          if (!claim(fdi, key, value, scope)) return undefined;
          target.note = value;
        } else return undefined;
        const identityKey = `Observation/additional/${planned ? "plan/" : ""}${fdi}/${key.replace(":", "/")}`;
        if (profileIds.has(identityKey)) return undefined;
        profileIds.add(identityKey);
        if (planned) plannedFdi.add(fdi);
        captureIdentity(identityKey, resolvedEntry, resource);
        continue;
      }
      if (!fdi || !property || findingIds.has(`${fdi}:${property}`) || !isDentalCoreFdi(fdi)) return undefined;
      findingIds.add(`${fdi}:${property}`);
      const mapping = mappingsByProperty.get(property)?.find((candidate) => candidate.kind === "boolean" || candidate.kind === "enum");
      const coded = codeAt(resource.valueCodeableConcept as { coding?: Array<{ system?: string; code?: string }> }, VALUE_SYSTEM);
      const value = mapping?.kind === "boolean" ? (coded ? true : resource.valueBoolean) : inverse(mapping?.values, coded ?? "");
      if (!mapping || value === undefined || !claim(fdi, mapping.field, value) || !applyFinding((payload.teeth[fdi] ??= {}), resource)) return undefined;
      captureIdentity(`Observation/finding/${fdi}/${property}`, resolvedEntry, resource);
      continue;
    }
    if (resource.resourceType === "Procedure" && hasAdmittedProfileResource(resource, DENTAL_CORE_PROFILES["dental-procedure"])) {
      if (!validGeneratedProfile(DentalProcedureProfile, resource) || resource.status !== "completed" || !subject) return undefined;
      const bodySite = Array.isArray(resource.bodySite) ? resource.bodySite[0] as { coding?: Array<{ system?: string; code?: string }> } | undefined : undefined;
      const fdi = codeAt(bodySite, FDI_SYSTEM);
      const text = (resource.code as { text?: unknown } | undefined)?.text;
      const field = text === "Apicoectomy or root-end resection" ? "endoResection" : text === "Fissure sealing" ? "fissureSealing" : undefined;
      if (!fdi || !field || procedureIds.has(`${fdi}:${field}`) || !isDentalCoreFdi(fdi) || !claim(fdi, field, true) || !applyProcedure((payload.teeth[fdi] ??= {}), resource)) return undefined;
      procedureIds.add(`${fdi}:${field}`);
      captureIdentity(`Procedure/${fdi}/${field}`, resolvedEntry, resource);
      continue;
    }
    if (resource.resourceType === "Device" && hasAdmittedProfileResource(resource, DENTAL_CORE_PROFILES["dental-implant"])) {
      if (!validGeneratedProfile(DentalImplantProfile, resource) || resource.status !== "active") return undefined;
      const extension = Array.isArray(resource.extension) ? resource.extension : [];
      const position = extension.find((candidate) => (candidate as { url?: unknown }).url === DENTAL_CORE_PROFILES["tooth-position"]) as { valueCoding?: { system?: string; code?: string } } | undefined;
      const fdi = position?.valueCoding?.system === FDI_SYSTEM ? position.valueCoding.code : undefined;
      if (!fdi || !isDentalCoreFdi(fdi) || profileIds.has(`implant:${fdi}`)) return undefined;
      const decoded: ToothRecord = {};
      if (!applyImplant(decoded, resource) || !mergeDecoded(fdi, decoded, false)) return undefined;
      profileIds.add(`implant:${fdi}`);
      captureIdentity(`Device/implant/${fdi}`, resolvedEntry, resource);
      continue;
    }
    if (resource.resourceType === "Device" && hasAdmittedProfileResource(resource, DENTAL_CORE_PROFILES["dental-device"])) {
      if (!validGeneratedProfile(DentalDeviceProfile, resource) || resource.status !== "active" || !subject) return undefined;
      const extension = Array.isArray(resource.extension) ? resource.extension : [];
      const position = extension.find((entry) => (entry as { url?: unknown }).url === DENTAL_CORE_PROFILES["tooth-position"]) as { valueCoding?: { system?: string; code?: string } } | undefined;
      const fdi = position?.valueCoding?.system === FDI_SYSTEM ? position.valueCoding.code : undefined;
      const text = (resource.type as { text?: unknown } | undefined)?.text;
      if (typeof text !== "string") return undefined;
      const field = text === "Orthodontic bracket" || text === "Orthodontic band" ? "orthoAppliance" : text === "Parapulpal pin" ? "parapulpalPin" : text === "Bridge abutment" ? "bridgePillar" : text?.startsWith("Prosthesis retention ") ? "retention" : undefined;
      const value = text === "Orthodontic bracket" ? "bracket" : text === "Orthodontic band" ? "band" : text === "Parapulpal pin" || text === "Bridge abutment" ? true : text?.replace("Prosthesis retention ", "");
      if (!fdi || !field || value === undefined || deviceIds.has(`${fdi}:${field}`) || !isDentalCoreFdi(fdi) || !claim(fdi, field, value) || !applyDevice((payload.teeth[fdi] ??= {}), resource)) return undefined;
      deviceIds.add(`${fdi}:${field}`);
      captureIdentity(`Device/${fdi}/${field}`, resolvedEntry, resource);
      continue;
    }
    if (resource.resourceType === "ServiceRequest" && hasAdmittedProfileResource(resource, DENTAL_CORE_PROFILES["dental-service-request"])) {
      if (!validGeneratedProfile(DentalServiceRequestProfile, resource) || resource.status !== "active" || !subject) return undefined;
      const fdi = Array.isArray(resource.bodySite) ? codeAt(resource.bodySite[0] as { coding?: Array<{ system?: string; code?: string }> }, FDI_SYSTEM) : undefined;
      const change = codeAt(resource.code as { coding?: Array<{ system?: string; code?: string }> }, LOCAL_SYSTEM);
      if (resource.intent === "order" && change && ["extractionPlan", "crownReplace", "crownNeeded"].includes(change)) {
        if (!fdi || !isDentalCoreFdi(fdi) || changeRequestIds.has(`${fdi}:${change}`) || !claim(fdi, change, true)) return undefined;
        (payload.teeth[fdi] ??= {})[change as "extractionPlan" | "crownReplace" | "crownNeeded"] = true;
        changeRequestIds.add(`${fdi}:${change}`);
        captureIdentity(`ServiceRequest/change/${fdi}/${change}`, resolvedEntry, resource);
        continue;
      }
      if (resource.intent !== "plan" || !hasPlan) return undefined;
      if (!fdi || !isDentalCoreFdi(fdi) || !Array.isArray(resource.basedOn) || !(resource.basedOn as Array<{ reference?: unknown }>).some((reference) => referencesResource(reference.reference, carePlan))) return undefined;
      if (planRequestFdi.has(fdi)) return undefined;
      planRequests.add(resource);
      planRequestFdi.add(fdi);
      (payload.plan ??= {})[fdi] ??= {};
      captureIdentity(`ServiceRequest/${fdi}`, resolvedEntry, resource);
      continue;
    }
    return undefined;
  }
  if (hasPlan) {
    if (!planActivities || planActivities.size !== planRequests.size || [...planActivities].some((request) => !planRequests.has(request))) return undefined;
    if ([...plannedFdi].some((fdi) => !planRequestFdi.has(fdi))) return undefined;
  }
  if (diagnosis || provenance) {
    const selected = diagnosis?.meta?.tag?.find((tag) => tag.system === VALUE_SYSTEM)?.code;
    const activity = codeAt(provenance?.activity, PROVENANCE_SYSTEM);
    const targets = provenance?.target as Array<{ reference?: unknown }> | undefined;
    const target = diagnosis
      ? targets?.some((reference) => referencesResource(reference.reference, diagnosis))
      : targets?.some((reference) => resolveReference(reference.reference) !== undefined);
    if (!provenance || !target || activity !== "clinician-selected") return undefined;
    if (diagnosis) {
      if (!selected || !isDentalCoreDiagnosis(selected)) return undefined;
      payload.case = { ...payload.case, diagnosisOverride: selected };
    }
    const recorder = (Array.isArray(provenance.agent) ? provenance.agent[0] as { who?: { reference?: unknown } } : undefined)?.who?.reference;
    if (typeof recorder === "string") payload.examination = { ...payload.examination, recorder };
  }
  if (effectiveDates.size > 1) return undefined;
  if (expectedSubject && effectiveDates.size === 1) {
    payload.examination = { ...payload.examination, subject: expectedSubject, effectiveDateTime: [...effectiveDates][0] };
  }
  if (Object.keys(identities).length) payload.fhirIdentity = { resources: identities };
  for (const [fdi, record] of Object.entries(payload.teeth)) payload.teeth[fdi] = normalizeLegacyRootPost(record);
  if (payload.plan) {
    for (const [fdi, record] of Object.entries(payload.plan)) payload.plan[fdi] = normalizeLegacyRootPost(record);
  }
  return payload;
}
