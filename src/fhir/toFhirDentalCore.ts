import type { Bundle, BundleEntry, CarePlan, Condition, Device, Observation, Procedure, Provenance, Resource, ServiceRequest } from "fhir/r4";
import type { DentalCoreResourceIdentity, FhirExportOptions, OdontogramExportPayload, ToothRecord } from "./types";
import { DentalChartStateProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Observation_DentalChartState";
import { DentalClinicalProvenanceProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Provenance_DentalClinicalProvenance";
import { DentalCariesFindingProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Observation_DentalCariesFinding";
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
import { CHART_MAPPINGS, COMPONENT_SYSTEM, DENTAL_CORE, DENTAL_CORE_BUNDLE_IDENTIFIER, DENTAL_CORE_PROFILES, FDI_SYSTEM, isDentalCoreDiagnosis, isDentalCoreFdi, isDentalCoreRiskValue, PROPERTY_SYSTEM, PROVENANCE_SYSTEM, VALUE_SYSTEM } from "./dentalCoreContract";
import { LOCAL_SYSTEM } from "./codesystems";
import { LOCAL_VALUE_MAPS } from "../registry/valueCatalog";

export class UnsupportedDentalCoreContentError extends Error {
  constructor(field: string) {
    super(`Dental Core cannot faithfully represent populated field: ${field}`);
    this.name = "UnsupportedDentalCoreContentError";
  }
}

class DentalCoreIdentityResolver {
  private readonly resources: Record<string, DentalCoreResourceIdentity>;
  private readonly fullUrls = new Map<string, string>();
  private readonly usedFullUrls = new Set<string>();
  private generated = 0;

  constructor(payload: OdontogramExportPayload) {
    this.resources = payload.fhirIdentity?.resources ?? {};
    for (const identity of Object.values(this.resources)) {
      if (identity.fullUrl) this.usedFullUrls.add(identity.fullUrl);
    }
  }

  reference(key: string): string {
    const identity = this.resources[key];
    if (identity?.fullUrl) return identity.fullUrl;
    if (identity?.id) return `${key.split("/", 1)[0]}/${identity.id}`;
    return this.fullUrl(key);
  }

  entry<T extends Resource>(key: string, resource: T): BundleEntry {
    const identity = this.resources[key];
    const resolved = this.resource(key, resource);
    if (identity) return identity.fullUrl ? { fullUrl: identity.fullUrl, resource: resolved } : { resource: resolved };
    return { fullUrl: this.fullUrl(key), resource: resolved };
  }

  private resource<T extends Resource>(key: string, resource: T): T {
    const identity = this.resources[key];
    if (!identity) return resource;
    return {
      ...resource,
      ...(identity.id ? { id: identity.id } : {}),
      ...(identity.versionId ? { meta: { ...resource.meta, versionId: identity.versionId } } : {}),
    };
  }

  private fullUrl(key: string): string {
    const existing = this.fullUrls.get(key);
    if (existing) return existing;
    const imported = this.resources[key]?.fullUrl;
    if (imported) {
      this.fullUrls.set(key, imported);
      return imported;
    }
    let generated: string;
    do {
      this.generated += 1;
      generated = `urn:uuid:00000000-0000-4000-8000-${String(this.generated).padStart(12, "0")}`;
    } while (this.usedFullUrls.has(generated));
    this.usedFullUrls.add(generated);
    this.fullUrls.set(key, generated);
    return generated;
  }
}

const subjectReference = (options: FhirExportOptions, identity: DentalCoreIdentityResolver): string => options.subject ?? identity.reference("Patient/subject");
const effective = (payload: OdontogramExportPayload, options: FhirExportOptions): string => {
  const value = options.effectiveDateTime ?? payload.examination?.effectiveDateTime ?? payload.case?.examDate;
  if (!value) throw new Error("Dental Core export requires an effective date from the export options or examination context");
  return value;
};
const coding = (system: string, code: string) => ({ system, code });
const profile = (id: keyof typeof DENTAL_CORE_PROFILES) => [DENTAL_CORE_PROFILES[id]];
const generated = <T>(profileType: { apply(resource: never): { toResource(): unknown } }, resource: T): T =>
  profileType.apply(resource as never).toResource() as T;

const TOOTH_SURFACE_SYSTEM = "http://terminology.hl7.org/CodeSystem/FDI-surface";
const UCUM_SYSTEM = "http://unitsofmeasure.org";
const TOOTH_STATE_FIELDS = new Set<keyof ToothRecord>([
  "toothSelection", "endo", "fillingSurfaces", "fillingSurfaceMaterials", "fillingDefect",
  "prosthesis", "toothSubstrate", "restorationType", "restorationMaterial", "crownLeakage",
]);
const CARIES_FIELDS = new Set<keyof ToothRecord>(["caries", "cariesSeverity", "rootCaries"]);
const PERIODONTAL_FIELDS = new Set<keyof ToothRecord>(["calculus", "mobility", "perio", "furcation", "plaque", "pi", "gi", "kg"]);
const PERI_IMPLANT_FIELDS = new Set<keyof ToothRecord>(["periImplant", "mpi", "mbi"]);
const IMPLANT_FIELDS = new Set<keyof ToothRecord>(["implantProduct"]);
const RECESSION_FIELDS = new Set<keyof ToothRecord>(["millerClass"]);
const ADDITIONAL_FINDING_FIELDS = new Set<keyof ToothRecord>(["pulpDx", "apicalDx", "radiographicDepth", "cervicalSurfaces", "assessment", "note"]);
const SERVICE_REQUEST_FIELDS = new Set<keyof ToothRecord>(["extractionPlan", "crownReplace", "crownNeeded"]);
const PROFILE_FIELDS = new Set<keyof ToothRecord>([
  ...TOOTH_STATE_FIELDS, ...CARIES_FIELDS, ...PERIODONTAL_FIELDS, ...PERI_IMPLANT_FIELDS, ...IMPLANT_FIELDS, ...RECESSION_FIELDS,
  ...ADDITIONAL_FINDING_FIELDS, ...SERVICE_REQUEST_FIELDS,
]);
const supportedToothFields = new Set<keyof ToothRecord>([
  ...CHART_MAPPINGS.map((mapping) => mapping.field),
  ...PROFILE_FIELDS,
]);
const supportedCaseFields = new Set([
  "cigarettesPerDay", "toothLossPerio", "maxRblPercent", "diagnosisOverride",
  "examDate", "diabetesStatus", "hba1c", "smokingStatus",
]);
const supportedExaminationFields = new Set(["subject", "effectiveDateTime", "recorder"]);
const nonClinicalToothFields = new Set(["cariesActiveDepth", "fillingMaterial"]);
const nonClinicalGlobalFields = new Set(["wisdomVisible", "showBase", "occlusalVisible", "showHealthyPulp"]);

const SURFACE_CODES: Record<string, string> = {
  buccal: "B", lingual: "L", mesial: "M", distal: "D", occlusal: "O", incisal: "I", subcrown: "SC",
};
const SITE_CODES: Record<string, string> = {
  MB: "mesiobuccal-site", B: "buccal-site", DB: "distobuccal-site",
  ML: "mesiolingual-site", L: "lingual-site", DL: "distolingual-site",
};
const SURFACES = new Set(Object.keys(SURFACE_CODES));
const SITES = new Set(Object.keys(SITE_CODES));
const scalarMap = (value: unknown, validKey: (key: string) => boolean, validValue: (item: unknown) => boolean): boolean =>
  typeof value === "object" && value !== null && !Array.isArray(value)
  && Object.entries(value as Record<string, unknown>).every(([key, item]) => validKey(key) && validValue(item));

const localConcept = (code: string) => ({ coding: [coding(LOCAL_SYSTEM, code)] });
const bodySite = (fdi: string) => ({ coding: [coding(FDI_SYSTEM, fdi)] });
const surfaceExtension = (surface: string) => ({
  url: DENTAL_CORE_PROFILES["tooth-surface"],
  valueCoding: coding(TOOTH_SURFACE_SYSTEM, SURFACE_CODES[surface]),
});
const siteExtension = (site: string) => ({
  url: DENTAL_CORE_PROFILES["periodontal-site"],
  valueCoding: coding(COMPONENT_SYSTEM, SITE_CODES[site] ?? site),
});
const component = (
  code: string,
  valueCode: string,
  extensions: NonNullable<Observation["component"]>[number]["extension"] = [],
): NonNullable<Observation["component"]>[number] => ({
  code: { coding: [coding(COMPONENT_SYSTEM, code)] },
  valueCodeableConcept: localConcept(valueCode),
  ...(extensions.length ? { extension: extensions } : {}),
});

function hasOwn(record: ToothRecord, field: keyof ToothRecord): boolean {
  return Object.prototype.hasOwnProperty.call(record, field);
}

function hasAnyField(record: ToothRecord, fields: Set<keyof ToothRecord>): boolean {
  return [...fields].some((field) => hasOwn(record, field) && hasClinicalValue(record[field], String(field)));
}

function hasClinicalValue(value: unknown, field?: string): boolean {
  if (value === undefined || value === null || value === false || value === "") return false;
  if (typeof value === "string") {
    const emptyValues = field === "toothSelection"
      ? ["tooth-base"]
      : ["none", "unknown", "normal", "natural", "tooth-base"];
    return !emptyValues.includes(value);
  }
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.entries(value as Record<string, unknown>)
    .some(([nestedField, nestedValue]) => hasClinicalValue(nestedValue, nestedField));
  return true;
}

function validProfileField(field: keyof ToothRecord, value: unknown): boolean {
  if (["calculus", "crownLeakage"].includes(field)) return typeof value === "boolean";
  if (["extractionPlan", "crownReplace", "crownNeeded"].includes(field)) return typeof value === "boolean";
  if (["kg"].includes(field)) return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 15;
  if (["caries", "fillingSurfaces", "plaque"].includes(field)) {
    const group = field === "plaque" ? "fillingSurfaces" : field;
    return Array.isArray(value) && value.every((item) => typeof item === "string" && Boolean(LOCAL_VALUE_MAPS[group]?.[item]));
  }
  if (field === "cariesSeverity") return scalarMap(value, (key) => SURFACES.has(key), (item) => Number.isInteger(item) && (item as number) >= 0 && (item as number) <= 6);
  if (field === "radiographicDepth") return scalarMap(value, (key) => Boolean(LOCAL_VALUE_MAPS.fillingSurfaces?.[key]), (item) => typeof item === "string" && Boolean(LOCAL_VALUE_MAPS.radiographicDepth?.[item]));
  if (field === "cervicalSurfaces") return Array.isArray(value) && value.every((item) => item === "buccal" || item === "lingual");
  if (field === "assessment") return scalarMap(value, (key) => /^[A-Za-z0-9._:-]+$/.test(key), (item) => ["assessed", "not-assessed", "unmeasurable", "not-applicable"].includes(String(item)));
  if (field === "note") return typeof value === "string" && value.length > 0;
  if (field === "fillingSurfaceMaterials") return scalarMap(value, (key) => SURFACES.has(key) && key !== "subcrown", (item) => typeof item === "string" && Boolean(LOCAL_VALUE_MAPS.fillingMaterial?.[item]));
  if (field === "fillingDefect") return scalarMap(value, (key) => SURFACES.has(key) && key !== "subcrown", (item) => typeof item === "string" && Boolean(LOCAL_VALUE_MAPS.fillingDefect?.[item]));
  if (field === "furcation") return scalarMap(value, (key) => SURFACES.has(key) && key !== "subcrown", (item) => Number.isInteger(item) && (item as number) >= 1 && (item as number) <= 4);
  if (["pi", "gi", "mpi", "mbi"].includes(field)) return scalarMap(value, (key) => SURFACES.has(key) && key !== "subcrown", (item) => Number.isInteger(item) && (item as number) >= 0 && (item as number) <= 3);
  if (field === "perio") {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
    const perio = value as { pd?: unknown; gm?: unknown; bop?: unknown; sup?: unknown };
    return scalarMap(perio.pd, (key) => SITES.has(key), (item) => typeof item === "number" && item >= 1 && item <= 15)
      && scalarMap(perio.gm, (key) => SITES.has(key), (item) => typeof item === "number" && item >= -10 && item <= 20)
      && [perio.bop, perio.sup].every((items) => Array.isArray(items) && items.every((item) => typeof item === "string" && SITES.has(item)));
  }
  if (field === "implantProduct") {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
    const product = value as Record<string, unknown>;
    const allowed = new Set(["manufacturer", "system", "diameterMm", "lengthMm", "udi", "deviceIdentifier", "lot", "serial", "expiry"]);
    return Object.entries(product).every(([key, item]) => allowed.has(key) && (key === "diameterMm" || key === "lengthMm"
      ? typeof item === "number" && Number.isFinite(item) && item > 0
      : typeof item === "string"));
  }
  return typeof value === "string" && Boolean(LOCAL_VALUE_MAPS[String(field)]?.[value]);
}

function assertMappedTooth(record: ToothRecord, label: string): void {
  for (const [field, value] of Object.entries(record)) {
    if (nonClinicalToothFields.has(field)) continue;
    if (!supportedToothFields.has(field as keyof ToothRecord)) {
      if (hasClinicalValue(value, field)) throw new UnsupportedDentalCoreContentError(`${label}.${field}`);
      continue;
    }
    if (PROFILE_FIELDS.has(field as keyof ToothRecord)) {
      if (!validProfileField(field as keyof ToothRecord, value)) throw new UnsupportedDentalCoreContentError(`${label}.${field}`);
      continue;
    }
    const mapping = CHART_MAPPINGS.find((candidate) => candidate.field === field);
    if (!mapping) throw new UnsupportedDentalCoreContentError(`${label}.${field}`);
    if (mapping.kind === "boolean") {
      if (typeof value !== "boolean") throw new UnsupportedDentalCoreContentError(`${label}.${field}`);
    } else if (mapping.kind === "set") {
      if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !mapping.values?.[item])) {
        throw new UnsupportedDentalCoreContentError(`${label}.${field}`);
      }
    } else if (typeof value !== "string" || !mapping.values?.[value]) {
      throw new UnsupportedDentalCoreContentError(`${label}.${field}`);
    }
  }
  for (const surface of Object.keys(record.cariesSeverity ?? {})) {
    if (!(record.caries ?? []).includes(`caries-${surface}`)) throw new UnsupportedDentalCoreContentError(`${label}.cariesSeverity.${surface}`);
  }
  if (hasAnyField(record, PERI_IMPLANT_FIELDS) && record.toothSelection !== "implant" && !record.implantProduct) {
    const field = [...PERI_IMPLANT_FIELDS].find((candidate) => hasOwn(record, candidate) && hasClinicalValue(record[candidate], String(candidate)));
    if (field) throw new UnsupportedDentalCoreContentError(`${label}.${field}`);
  }
}

const sharedReferenceFields = ["diabetesStatus", "hba1c", "smokingStatus", "edentulous"] as const;
type SharedField = typeof sharedReferenceFields[number];

const sharedReference = (options: FhirExportOptions, field: SharedField): string | undefined => {
  const entry = options.sharedResources?.[field];
  if (!entry) return undefined;
  if (entry.fullUrl) return entry.fullUrl;
  return entry.resource.id ? `${entry.resource.resourceType}/${entry.resource.id}` : undefined;
};

const codingCode = (target: unknown, system: string): string | undefined =>
  (target as { coding?: Array<{ system?: string; code?: string }> } | undefined)?.coding?.find((item) => item.system === system)?.code;

const sharedFieldPopulated = (payload: OdontogramExportPayload, field: SharedField): boolean => {
  if (field === "edentulous") return payload.globals?.edentulous === true;
  if (!Object.prototype.hasOwnProperty.call(payload.case ?? {}, field)) return false;
  const value = payload.case?.[field];
  return value !== null && value !== undefined && value !== "unknown";
};

function sharedResourceMatches(payload: OdontogramExportPayload, options: FhirExportOptions, identity: DentalCoreIdentityResolver, field: SharedField): boolean {
  const resource = options.sharedResources?.[field]?.resource as Resource & Record<string, unknown> | undefined;
  if (!resource || !sharedReference(options, field)) return false;
  const resourceSubject = (resource.subject as { reference?: unknown } | undefined)?.reference;
  if (resourceSubject !== subjectReference(options, identity)) return false;
  if (field === "hba1c") {
    const value = (resource.valueQuantity as { value?: unknown; system?: string; code?: string } | undefined);
    return resource.resourceType === "Observation" && codingCode(resource.code, "http://loinc.org") === "4548-4"
      && value?.system === UCUM_SYSTEM && value.code === "%" && typeof value.value === "number"
      && value.value >= 3 && value.value <= 20 && value.value === payload.case?.hba1c;
  }
  if (field === "smokingStatus") {
    const status = payload.case?.smokingStatus;
    return resource.resourceType === "Observation" && codingCode(resource.code, "http://loinc.org") === "72166-2"
      && typeof status === "string" && ["never", "former", "current"].includes(status)
      && codingCode(resource.valueCodeableConcept, LOCAL_SYSTEM) === status;
  }
  if (field === "diabetesStatus") {
    const status = payload.case?.diabetesStatus;
    const refuted = codingCode(resource.verificationStatus, "http://terminology.hl7.org/CodeSystem/condition-ver-status") === "refuted";
    const coded = (resource.code as { coding?: Array<{ system?: string; code?: string }> } | undefined)?.coding?.some((item) => item.system && item.code);
    return resource.resourceType === "Condition" && Boolean(coded) && (status === "none" ? refuted : status === "present" && !refuted);
  }
  const coded = (resource.code as { coding?: Array<{ system?: string; code?: string }> } | undefined)?.coding?.some((item) => item.system && item.code);
  return resource.resourceType === "Condition" && Boolean(coded) && payload.globals?.edentulous === true;
}

function assertDentalCoreComplete(payload: OdontogramExportPayload, options: FhirExportOptions, identity: DentalCoreIdentityResolver): void {
  for (const [fdi, record] of Object.entries(payload.teeth ?? {})) {
    if (!isDentalCoreFdi(fdi) && hasClinicalValue(record)) throw new UnsupportedDentalCoreContentError(`teeth.${fdi}`);
    assertMappedTooth(record, `teeth.${fdi}`);
  }
  for (const [fdi, record] of Object.entries(payload.plan ?? {})) {
    if (!isDentalCoreFdi(fdi) && hasClinicalValue(record)) throw new UnsupportedDentalCoreContentError(`plan.${fdi}`);
    assertMappedTooth(record, `plan.${fdi}`);
    const unsupportedPlanField = [...IMPLANT_FIELDS, ...PERI_IMPLANT_FIELDS, ...SERVICE_REQUEST_FIELDS]
      .find((field) => hasOwn(record, field) && hasClinicalValue(record[field], String(field)));
    if (unsupportedPlanField) throw new UnsupportedDentalCoreContentError(`plan.${fdi}.${unsupportedPlanField}`);
  }
  for (const [field, value] of Object.entries(payload.case ?? {})) {
    if (!supportedCaseFields.has(field) && hasClinicalValue(value)) throw new UnsupportedDentalCoreContentError(`case.${field}`);
  }
  for (const [field, value] of Object.entries(payload.globals ?? {})) {
    if (field !== "edentulous" && !nonClinicalGlobalFields.has(field) && hasClinicalValue(value)) throw new UnsupportedDentalCoreContentError(`globals.${field}`);
  }
  for (const field of sharedReferenceFields) {
    if (sharedFieldPopulated(payload, field) && !sharedResourceMatches(payload, options, identity, field)) {
      throw new UnsupportedDentalCoreContentError(field === "edentulous" ? "globals.edentulous" : `case.${field}`);
    }
  }
  for (const [field, value] of Object.entries(payload.examination ?? {})) {
    if (!supportedExaminationFields.has(field) && hasClinicalValue(value)) throw new UnsupportedDentalCoreContentError(`examination.${field}`);
  }
}

function chartComponents(record: ToothRecord): Observation["component"] {
  const components: NonNullable<Observation["component"]> = [];
  for (const mapping of CHART_MAPPINGS) {
    const present = Object.prototype.hasOwnProperty.call(record, mapping.field);
    if (!present) continue;
    const raw = record[mapping.field];
    if (mapping.kind === "boolean") {
      if (typeof raw !== "boolean") continue;
      const coded = mapping.values?.true;
      components.push({
        code: { coding: [coding(PROPERTY_SYSTEM, mapping.property)] },
        ...(coded && raw ? { valueCodeableConcept: { coding: [coding(VALUE_SYSTEM, coded)] } } : { valueBoolean: raw }),
      });
      continue;
    }
    if (mapping.kind === "set") {
      if (!Array.isArray(raw)) continue;
      for (const value of raw) {
        const code = mapping.values?.[String(value)];
        if (code) components.push({ code: { coding: [coding(PROPERTY_SYSTEM, mapping.property)] }, valueCodeableConcept: { coding: [coding(VALUE_SYSTEM, code)] } });
      }
      continue;
    }
    if (typeof raw !== "string") continue;
    const code = mapping.values?.[raw];
    if (code) components.push({ code: { coding: [coding(PROPERTY_SYSTEM, mapping.property)] }, valueCodeableConcept: { coding: [coding(VALUE_SYSTEM, code)] } });
  }
  return components;
}

function chartState(record: ToothRecord, fdi: string, payload: OdontogramExportPayload, options: FhirExportOptions, identity: DentalCoreIdentityResolver, plan: boolean): Observation | undefined {
  const component = chartComponents(record);
  if (!component?.length) return undefined;
  return generated(DentalChartStateProfile, {
    resourceType: "Observation",
    meta: { profile: profile("dental-chart-state") },
    status: "final",
    code: { coding: [coding(COMPONENT_SYSTEM, "chart-state")] },
    subject: { reference: subjectReference(options, identity) },
    effectiveDateTime: effective(payload, options),
    bodySite: { coding: [coding(FDI_SYSTEM, fdi)] },
    ...(plan ? { basedOn: [{ reference: identity.reference("CarePlan/plan") }] } : {}),
    component,
  });
}

function procedure(record: ToothRecord, fdi: string, payload: OdontogramExportPayload, options: FhirExportOptions, identity: DentalCoreIdentityResolver): Array<[string, Procedure]> {
  const result: Array<[string, Procedure]> = [];
  const procedures: Array<[boolean | undefined, string]> = [[record.endoResection, "Apicoectomy or root-end resection"], [record.fissureSealing, "Fissure sealing"]];
  for (const [index, [flag, text]] of procedures.entries()) {
    if (!flag) continue;
    const field = index === 0 ? "endoResection" : "fissureSealing";
    result.push([`Procedure/${fdi}/${field}`, generated(DentalProcedureProfile, { resourceType: "Procedure", meta: { profile: profile("dental-procedure") }, status: "completed", code: { text }, subject: { reference: subjectReference(options, identity) }, performedDateTime: effective(payload, options), bodySite: [{ coding: [coding(FDI_SYSTEM, fdi)] }] })]);
  }
  return result;
}

function devices(record: ToothRecord, fdi: string, options: FhirExportOptions, identity: DentalCoreIdentityResolver): Array<[string, Device]> {
  const types: Array<[string, string | undefined]> = [
    ["orthoAppliance", record.orthoAppliance && record.orthoAppliance !== "none" ? `Orthodontic ${record.orthoAppliance}` : undefined],
    ["parapulpalPin", record.parapulpalPin ? "Parapulpal pin" : undefined],
    ["bridgePillar", record.bridgePillar ? "Bridge abutment" : undefined],
    ["retention", record.retention && record.retention !== "none" ? `Prosthesis retention ${record.retention}` : undefined],
  ];
  return types.flatMap(([field, text]) => !text ? [] : [[`Device/${fdi}/${field}`, generated(DentalDeviceProfile, {
    resourceType: "Device", meta: { profile: profile("dental-device") }, status: "active",
    type: { text }, patient: { reference: subjectReference(options, identity) },
    extension: [{ url: DENTAL_CORE_PROFILES["tooth-position"], valueCoding: coding(FDI_SYSTEM, fdi) }],
  })] as [string, Device]]);
}

function observedFindings(record: ToothRecord, fdi: string, payload: OdontogramExportPayload, options: FhirExportOptions, identity: DentalCoreIdentityResolver): Array<[string, Observation]> {
  const excluded = new Set(["endoResection", "fissureSealing", "orthoAppliance", "parapulpalPin", "bridgePillar", "retention", "retentionSide", "mods", "pulpLatin"]);
  return CHART_MAPPINGS.flatMap((mapping) => {
    if (excluded.has(mapping.field) || !Object.prototype.hasOwnProperty.call(record, mapping.field)) return [];
    const raw = record[mapping.field];
    if (raw === false || raw === mapping.defaultValue || raw === "none" || raw === "unknown" || (Array.isArray(raw) && raw.length === 0)) return [];
    const finding: Observation = {
      resourceType: "Observation", meta: { profile: profile("dental-finding") }, status: "final",
      code: { coding: [coding(PROPERTY_SYSTEM, mapping.property)] }, subject: { reference: subjectReference(options, identity) },
      effectiveDateTime: effective(payload, options), bodySite: { coding: [coding(FDI_SYSTEM, fdi)] },
    };
    if (typeof raw === "boolean") finding.valueBoolean = raw;
    else if (typeof raw === "string") {
      const value = mapping.values?.[raw];
      if (value) finding.valueCodeableConcept = { coding: [coding(VALUE_SYSTEM, value)] };
    }
    return finding.valueBoolean !== undefined || finding.valueCodeableConcept ? [[`Observation/finding/${fdi}/${mapping.property}`, generated(DentalFindingProfile, finding)]] : [];
  });
}

function toothState(record: ToothRecord, fdi: string, payload: OdontogramExportPayload, options: FhirExportOptions, identity: DentalCoreIdentityResolver, plan = false): Observation | undefined {
  if (!hasAnyField(record, TOOTH_STATE_FIELDS) && !hasOwn(record, "toothSelection")) return undefined;
  const components: NonNullable<Observation["component"]> = [
    component("tooth-presence", record.toothSelection ?? "tooth-base"),
  ];
  if (record.toothSubstrate) components.push(component("tooth-substrate", record.toothSubstrate));
  if (record.endo) components.push(component("root-endodontic-state", record.endo));
  if (record.restorationType) components.push(component("restoration-type", record.restorationType));
  if (record.restorationMaterial) components.push(component("restoration-material", record.restorationMaterial));
  if (record.prosthesis) components.push(component("prosthetic-state", record.prosthesis));
  for (const surface of record.fillingSurfaces ?? []) {
    components.push(component("restoration-type", "direct-filling", [surfaceExtension(surface)]));
  }
  for (const [surface, material] of Object.entries(record.fillingSurfaceMaterials ?? {})) {
    components.push(component("restoration-material", material, [surfaceExtension(surface)]));
  }
  for (const [surface, status] of Object.entries(record.fillingDefect ?? {})) {
    components.push(component("restoration-status", status, [surfaceExtension(surface)]));
  }
  if (record.crownLeakage) components.push(component("restoration-status", "crown-leakage"));
  return generated(DentalToothStateProfile, {
    resourceType: "Observation",
    meta: { profile: profile("dental-tooth-state") },
    status: "final",
    code: { coding: [coding(COMPONENT_SYSTEM, "tooth-presence")] },
    subject: { reference: subjectReference(options, identity) },
    effectiveDateTime: effective(payload, options),
    bodySite: bodySite(fdi),
    ...(plan ? { basedOn: [{ reference: identity.reference("CarePlan/plan") }] } : {}),
    component: components,
  } as Observation);
}

function cariesFindings(record: ToothRecord, fdi: string, payload: OdontogramExportPayload, options: FhirExportOptions, identity: DentalCoreIdentityResolver, plan = false): Array<[string, Observation]> {
  const findings = (record.caries ?? []).map((cariesCode): [string, Observation] => {
    const surface = cariesCode.replace(/^caries-/, "");
    const severity = record.cariesSeverity?.[surface];
    const finding = generated(DentalCariesFindingProfile, {
      resourceType: "Observation",
      meta: { profile: profile("dental-caries-finding") },
      status: "final",
      code: { coding: [coding("http://snomed.info/sct", "80967001")] },
      subject: { reference: subjectReference(options, identity) },
      effectiveDateTime: effective(payload, options),
      bodySite: { ...bodySite(fdi), extension: [surfaceExtension(surface)] },
      valueCodeableConcept: localConcept(severity === undefined ? "caries" : `caries-severity-${severity}`),
      ...(plan ? { basedOn: [{ reference: identity.reference("CarePlan/plan") }] } : {}),
    } as Observation);
    return [`Observation/caries/${plan ? "plan/" : ""}${fdi}/${surface}`, finding];
  });
  if (record.rootCaries && record.rootCaries !== "none") {
    findings.push([`Observation/caries/${plan ? "plan/" : ""}root/${fdi}`, generated(DentalCariesFindingProfile, {
      resourceType: "Observation", meta: { profile: profile("dental-caries-finding") }, status: "final",
      code: { coding: [coding("http://snomed.info/sct", "80967001")] }, subject: { reference: subjectReference(options, identity) },
      effectiveDateTime: effective(payload, options), bodySite: bodySite(fdi), valueCodeableConcept: localConcept(`root-caries-${record.rootCaries}`),
      ...(plan ? { basedOn: [{ reference: identity.reference("CarePlan/plan") }] } : {}),
    } as Observation)]);
  }
  return findings;
}

function additionalFindings(record: ToothRecord, fdi: string, payload: OdontogramExportPayload, options: FhirExportOptions, identity: DentalCoreIdentityResolver, plan = false): Array<[string, Observation]> {
  const common = () => ({
    resourceType: "Observation" as const, meta: { profile: profile("dental-finding") }, status: "final" as const,
    subject: { reference: subjectReference(options, identity) }, effectiveDateTime: effective(payload, options), bodySite: bodySite(fdi),
    ...(plan ? { basedOn: [{ reference: identity.reference("CarePlan/plan") }] } : {}),
  });
  const result: Array<[string, Observation]> = [];
  for (const field of ["pulpDx", "apicalDx"] as const) {
    const value = record[field];
    if (value) result.push([`Observation/additional/${plan ? "plan/" : ""}${fdi}/${field}`, generated(DentalFindingProfile, {
      ...common(), code: { coding: [coding(LOCAL_SYSTEM, field)] }, valueCodeableConcept: localConcept(value),
    })]);
  }
  for (const [surface, value] of Object.entries(record.radiographicDepth ?? {})) result.push([
    `Observation/additional/${plan ? "plan/" : ""}${fdi}/radiographicDepth/${surface}`,
    generated(DentalFindingProfile, { ...common(), code: { coding: [coding(LOCAL_SYSTEM, "radiographic-depth")] }, bodySite: { ...bodySite(fdi), extension: [surfaceExtension(surface)] }, valueCodeableConcept: localConcept(value) }),
  ]);
  for (const surface of record.cervicalSurfaces ?? []) result.push([
    `Observation/additional/${plan ? "plan/" : ""}${fdi}/cervicalSurfaces/${surface}`,
    generated(DentalFindingProfile, { ...common(), code: { coding: [coding(LOCAL_SYSTEM, "cervical-involvement")] }, bodySite: { ...bodySite(fdi), extension: [surfaceExtension(surface)] }, valueBoolean: true }),
  ]);
  for (const [point, value] of Object.entries(record.assessment ?? {})) result.push([
    `Observation/additional/${plan ? "plan/" : ""}${fdi}/assessment/${point}`,
    generated(DentalFindingProfile, { ...common(), code: { coding: [coding(LOCAL_SYSTEM, `assessment:${point}`)] }, valueCodeableConcept: localConcept(value) }),
  ]);
  if (record.note) result.push([`Observation/additional/${plan ? "plan/" : ""}${fdi}/note`, generated(DentalFindingProfile, {
    ...common(), code: { coding: [coding(LOCAL_SYSTEM, "odontogram-note")] }, note: [{ text: record.note }],
  })]);
  return result;
}

function requestedChanges(record: ToothRecord, fdi: string, options: FhirExportOptions, identity: DentalCoreIdentityResolver): Array<[string, ServiceRequest]> {
  return (["extractionPlan", "crownReplace", "crownNeeded"] as const).flatMap((field) => !record[field] ? [] : [[
    `ServiceRequest/change/${fdi}/${field}`,
    generated(DentalServiceRequestProfile, {
      resourceType: "ServiceRequest", meta: { profile: profile("dental-service-request") }, status: "active", intent: "order",
      code: { coding: [coding(LOCAL_SYSTEM, field)] }, subject: { reference: subjectReference(options, identity) }, bodySite: [{ coding: [coding(FDI_SYSTEM, fdi)] }],
    }),
  ] as [string, ServiceRequest]]);
}

function periodontalComponents(record: ToothRecord): NonNullable<Observation["component"]> {
  const components: NonNullable<Observation["component"]> = [];
  const quantity = (system: string, code: string, value: number, site: string) => ({
    code: { coding: [coding(system, code)] },
    extension: [siteExtension(site)],
    valueQuantity: { value, system: UCUM_SYSTEM, code: "mm", unit: "mm" },
  });
  for (const [site, value] of Object.entries(record.perio?.pd ?? {})) components.push(quantity("http://loinc.org", "32910-2", value, site));
  for (const [site, value] of Object.entries(record.perio?.gm ?? {})) components.push(quantity("http://loinc.org", "64043-3", value, site));
  for (const site of record.perio?.bop ?? []) components.push({ code: { coding: [coding("http://snomed.info/sct", "249420004")] }, extension: [siteExtension(site)], valueBoolean: true });
  for (const site of record.perio?.sup ?? []) components.push({ code: { coding: [coding(COMPONENT_SYSTEM, "suppuration-on-probing")] }, extension: [siteExtension(site)], valueBoolean: true });
  if (record.mobility && record.mobility !== "none") components.push({ code: { coding: [coding(LOCAL_SYSTEM, "tooth-mobility")] }, valueCodeableConcept: localConcept(record.mobility) });
  if (record.calculus) components.push({ code: { coding: [coding(LOCAL_SYSTEM, "calculus")] }, valueBoolean: true });
  for (const surface of record.plaque ?? []) components.push({ code: { coding: [coding("http://loinc.org", "34016-6")] }, extension: [surfaceExtension(surface)], valueBoolean: true });
  for (const [surface, value] of Object.entries(record.pi ?? {})) components.push({ code: { coding: [coding(COMPONENT_SYSTEM, "plaque-index")] }, extension: [surfaceExtension(surface)], valueInteger: value });
  for (const [surface, value] of Object.entries(record.gi ?? {})) components.push({ code: { coding: [coding(COMPONENT_SYSTEM, "gingival-index")] }, extension: [surfaceExtension(surface)], valueInteger: value });
  if (typeof record.kg === "number") components.push(quantity(COMPONENT_SYSTEM, "keratinized-gingiva-width", record.kg, "B"));
  for (const [entrance, value] of Object.entries(record.furcation ?? {})) components.push({ code: { coding: [coding("http://snomed.info/sct", "771311009")] }, extension: [surfaceExtension(entrance)], valueCodeableConcept: localConcept(`furcation-${value}`) });
  return components;
}

function periodontalFinding(record: ToothRecord, fdi: string, payload: OdontogramExportPayload, options: FhirExportOptions, identity: DentalCoreIdentityResolver, plan = false): Observation | undefined {
  const components = periodontalComponents(record);
  if (!components.length) return undefined;
  return generated(DentalPeriodontalFindingProfile, {
    resourceType: "Observation", meta: { profile: profile("dental-periodontal-finding") }, status: "final",
    code: { coding: [coding("http://loinc.org", "32910-2")] },
    subject: { reference: subjectReference(options, identity) }, effectiveDateTime: effective(payload, options),
    bodySite: bodySite(fdi), component: components,
    ...(plan ? { basedOn: [{ reference: identity.reference("CarePlan/plan") }] } : {}),
  } as Observation);
}

function implantDevice(record: ToothRecord, fdi: string, options: FhirExportOptions, identity: DentalCoreIdentityResolver): Device | undefined {
  if (record.toothSelection !== "implant" && !record.implantProduct) return undefined;
  const product = record.implantProduct ?? {};
  const identifiers = [
    product.deviceIdentifier ? { system: "urn:oid:2.51.1.1", value: product.deviceIdentifier } : undefined,
    product.udi ? { system: LOCAL_SYSTEM, value: product.udi } : undefined,
    !product.deviceIdentifier && !product.udi ? { system: "urn:ietf:rfc:3986", value: identity.reference(`Device/implant/${fdi}`) } : undefined,
  ].filter((value): value is { system: string; value: string } => Boolean(value));
  const properties = [
    typeof product.diameterMm === "number" ? {
      type: localConcept("implant-diameter"),
      valueQuantity: [{ value: product.diameterMm, system: UCUM_SYSTEM, code: "mm", unit: "mm" }],
    } : undefined,
    typeof product.lengthMm === "number" ? {
      type: localConcept("implant-length"),
      valueQuantity: [{ value: product.lengthMm, system: UCUM_SYSTEM, code: "mm", unit: "mm" }],
    } : undefined,
  ].filter(Boolean) as NonNullable<Device["property"]>;
  return generated(DentalImplantProfile, {
    resourceType: "Device", meta: { profile: profile("dental-implant") }, status: "active",
    identifier: identifiers, type: { coding: [coding("http://snomed.info/sct", "272159002")] },
    patient: { reference: subjectReference(options, identity) },
    extension: [{ url: DENTAL_CORE_PROFILES["tooth-position"], valueCoding: coding(FDI_SYSTEM, fdi) }],
    ...(product.manufacturer ? { manufacturer: product.manufacturer } : {}),
    ...(product.system ? { deviceName: [{ name: product.system, type: "model-name" }] } : {}),
    ...(product.lot ? { lotNumber: product.lot } : {}),
    ...(product.serial ? { serialNumber: product.serial } : {}),
    ...(product.expiry ? { expirationDate: product.expiry } : {}),
    ...(properties.length ? { property: properties } : {}),
  } as Device);
}

function periImplantFinding(record: ToothRecord, fdi: string, payload: OdontogramExportPayload, options: FhirExportOptions, identity: DentalCoreIdentityResolver): Observation | undefined {
  const components: NonNullable<Observation["component"]> = [];
  if (record.periImplant && record.periImplant !== "none") components.push({ code: { coding: [coding(LOCAL_SYSTEM, "peri-implant-status")] }, valueCodeableConcept: localConcept(record.periImplant) });
  for (const [surface, value] of Object.entries(record.mpi ?? {})) components.push({ code: { coding: [coding(COMPONENT_SYSTEM, "modified-plaque-index")] }, extension: [surfaceExtension(surface)], valueInteger: value });
  for (const [surface, value] of Object.entries(record.mbi ?? {})) components.push({ code: { coding: [coding(COMPONENT_SYSTEM, "modified-sulcus-bleeding-index")] }, extension: [surfaceExtension(surface)], valueInteger: value });
  if (!components.length) return undefined;
  return generated(DentalPeriImplantFindingProfile, {
    resourceType: "Observation", meta: { profile: profile("dental-peri-implant-finding") }, status: "final",
    code: { coding: [coding("http://loinc.org", "32910-2")] }, subject: { reference: subjectReference(options, identity) },
    effectiveDateTime: effective(payload, options), bodySite: bodySite(fdi),
    focus: [{ reference: identity.reference(`Device/implant/${fdi}`) }], component: components,
  } as Observation);
}

function recessionAssessment(record: ToothRecord, fdi: string, payload: OdontogramExportPayload, options: FhirExportOptions, identity: DentalCoreIdentityResolver, plan = false): Observation | undefined {
  if (!record.millerClass || record.millerClass === "none") return undefined;
  return generated(DentalGingivalRecessionAssessmentProfile, {
    resourceType: "Observation", meta: { profile: profile("dental-gingival-recession-assessment") }, status: "final",
    code: { coding: [coding(COMPONENT_SYSTEM, "gingival-recession-classification")] },
    subject: { reference: subjectReference(options, identity) }, effectiveDateTime: effective(payload, options),
    bodySite: { ...bodySite(fdi), extension: [surfaceExtension("buccal")] },
    component: [{ code: { coding: [coding(COMPONENT_SYSTEM, "miller-recession-classification")] }, valueCodeableConcept: { coding: [coding(`${DENTAL_CORE}/CodeSystem/miller-gingival-recession-1985`, record.millerClass.toUpperCase())] } }],
    ...(plan ? { basedOn: [{ reference: identity.reference("CarePlan/plan") }] } : {}),
  } as Observation);
}

function clinicalProfileResources(record: ToothRecord, fdi: string, payload: OdontogramExportPayload, options: FhirExportOptions, identity: DentalCoreIdentityResolver, plan = false): Array<[string, Resource]> {
  const resources: Array<[string, Resource]> = [];
  const state = toothState(record, fdi, payload, options, identity, plan);
  if (state) resources.push([`Observation/tooth-state/${plan ? "plan/" : ""}${fdi}`, state]);
  resources.push(...cariesFindings(record, fdi, payload, options, identity, plan));
  const periodontal = periodontalFinding(record, fdi, payload, options, identity, plan);
  if (periodontal) resources.push([`Observation/periodontal/${plan ? "plan/" : ""}${fdi}`, periodontal]);
  const recession = recessionAssessment(record, fdi, payload, options, identity, plan);
  if (recession) resources.push([`Observation/recession/${plan ? "plan/" : ""}${fdi}`, recession]);
  resources.push(...additionalFindings(record, fdi, payload, options, identity, plan));
  if (!plan) {
    const implant = implantDevice(record, fdi, options, identity);
    if (implant) resources.push([`Device/implant/${fdi}`, implant]);
    const periImplant = periImplantFinding(record, fdi, payload, options, identity);
    if (periImplant) resources.push([`Observation/peri-implant/${fdi}`, periImplant]);
  }
  return resources;
}

function plannedRequest(fdi: string, record: ToothRecord, options: FhirExportOptions, identity: DentalCoreIdentityResolver): ServiceRequest | undefined {
  if (!Object.keys(record).length) return undefined;
  return generated(DentalServiceRequestProfile, {
    resourceType: "ServiceRequest", meta: { profile: profile("dental-service-request") },
    status: "active", intent: "plan", basedOn: [{ reference: identity.reference("CarePlan/plan") }],
    code: { text: "Requested dental state change" }, subject: { reference: subjectReference(options, identity) },
    bodySite: [{ coding: [coding(FDI_SYSTEM, fdi)] }],
  });
}

function riskEvidence(payload: OdontogramExportPayload, options: FhirExportOptions, identity: DentalCoreIdentityResolver): Array<[string, Observation]> {
  const values = [
    ["cigarettes-per-day", payload.case?.cigarettesPerDay, "integer"],
    ["periodontitis-attributed-tooth-loss", payload.case?.toothLossPerio, "integer"],
    ["maximum-radiographic-bone-loss", payload.case?.maxRblPercent, "percent"],
  ] as const;
  return values.flatMap(([code, value, kind]) => typeof value !== "number" || !isDentalCoreRiskValue(code, value) ? [] : [[`Observation/risk/${code}`, generated(DentalRiskEvidenceProfile, {
    resourceType: "Observation" as const, meta: { profile: profile("dental-risk-evidence") }, status: "final" as const,
    code: { coding: [coding(COMPONENT_SYSTEM, code)] }, subject: { reference: subjectReference(options, identity) }, effectiveDateTime: effective(payload, options),
    ...(kind === "integer" ? { valueInteger: value } : { valueQuantity: { value, system: "http://unitsofmeasure.org", code: "%", unit: "%" } }),
  })] as [string, Observation]]);
}

function diagnosis(payload: OdontogramExportPayload, options: FhirExportOptions, identity: DentalCoreIdentityResolver): Array<[string, Resource]> {
  const selected = payload.case?.diagnosisOverride;
  if (!selected || !isDentalCoreDiagnosis(selected)) return [];
  const condition: Condition = { resourceType: "Condition", meta: { tag: [coding(VALUE_SYSTEM, selected)] }, clinicalStatus: { coding: [coding("http://terminology.hl7.org/CodeSystem/condition-clinical", "active")] }, verificationStatus: { coding: [coding("http://terminology.hl7.org/CodeSystem/condition-ver-status", "confirmed")] }, code: { text: selected }, subject: { reference: subjectReference(options, identity) }, recordedDate: effective(payload, options) };
  return [["Condition/periodontal-diagnosis", condition]];
}

function clinicalProvenance(payload: OdontogramExportPayload, options: FhirExportOptions, identity: DentalCoreIdentityResolver, target: string | undefined): Provenance | undefined {
  const clinician = payload.examination?.recorder;
  if (!target) {
    if (clinician) throw new UnsupportedDentalCoreContentError("examination.recorder");
    return undefined;
  }
  if (!clinician && !payload.case?.diagnosisOverride) return undefined;
  return generated(DentalClinicalProvenanceProfile, {
    resourceType: "Provenance", meta: { profile: profile("dental-clinical-provenance") },
    target: [{ reference: target }], recorded: provenanceInstant(payload, options),
    activity: { coding: [coding(PROVENANCE_SYSTEM, "clinician-selected")] },
    agent: [{ who: clinician ? { reference: clinician } : { display: "Unspecified clinician" } }],
  });
}

const provenanceInstant = (payload: OdontogramExportPayload, options: FhirExportOptions): string => {
  const value = effective(payload, options);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value;
};

function sharedResourceProvenance(payload: OdontogramExportPayload, options: FhirExportOptions): Array<[string, Provenance]> {
  return sharedReferenceFields.flatMap((field) => {
    const reference = sharedReference(options, field);
    if (!sharedFieldPopulated(payload, field) || !reference) return [];
    return [[`Provenance/shared/${field}`, generated(DentalClinicalProvenanceProfile, {
      resourceType: "Provenance", meta: { profile: profile("dental-clinical-provenance") },
      target: [{ reference }], recorded: provenanceInstant(payload, options),
      reason: [{ coding: [coding(LOCAL_SYSTEM, `shared-resource-${field}`)] }],
      agent: [{ who: { display: "Host system" } }],
    })]];
  });
}

function sharedResourceEntries(payload: OdontogramExportPayload, options: FhirExportOptions): BundleEntry[] {
  return sharedReferenceFields.flatMap((field) => {
    const entry = options.sharedResources?.[field];
    if (!sharedFieldPopulated(payload, field) || !entry) return [];
    return [{ ...(entry.fullUrl ? { fullUrl: entry.fullUrl } : {}), resource: structuredClone(entry.resource) }];
  });
}

export function buildDentalCoreBundle(payload: OdontogramExportPayload, options: FhirExportOptions = {}): Bundle {
  const safe = payload && typeof payload === "object" ? payload : ({ version: "", teeth: {} } as OdontogramExportPayload);
  const identity = new DentalCoreIdentityResolver(safe);
  assertDentalCoreComplete(safe, options, identity);
  const entries: BundleEntry[] = [];
  if (!options.subject) entries.push(identity.entry("Patient/subject", { resourceType: "Patient" }));
  for (const [fdi, record] of Object.entries(safe.teeth ?? {}).filter(([fdi]) => isDentalCoreFdi(fdi))) {
    const chart = chartState(record, fdi, safe, options, identity, false);
    if (chart) entries.push(identity.entry(`Observation/chart/status/${fdi}`, chart));
    for (const [key, resource] of [...procedure(record, fdi, safe, options, identity), ...devices(record, fdi, options, identity), ...observedFindings(record, fdi, safe, options, identity)]) entries.push(identity.entry(key, resource));
    for (const [key, resource] of clinicalProfileResources(record, fdi, safe, options, identity)) entries.push(identity.entry(key, resource));
    for (const [key, resource] of requestedChanges(record, fdi, options, identity)) entries.push(identity.entry(key, resource));
  }
  if (safe.plan && Object.keys(safe.plan).length) {
    const activity = Object.entries(safe.plan)
      .filter(([fdi, record]) => isDentalCoreFdi(fdi) && Object.keys(record).length > 0)
      .map(([fdi]) => ({ reference: { reference: identity.reference(`ServiceRequest/${fdi}`) } }));
    const plan: CarePlan = {
      resourceType: "CarePlan", status: "active", intent: "plan",
      subject: { reference: subjectReference(options, identity) }, ...(activity.length ? { activity } : {}),
    };
    entries.push(identity.entry("CarePlan/plan", plan));
  }
  for (const [fdi, record] of Object.entries(safe.plan ?? {}).filter(([fdi]) => isDentalCoreFdi(fdi))) {
    const chart = chartState(record, fdi, safe, options, identity, true);
    if (chart) entries.push(identity.entry(`Observation/chart/plan/${fdi}`, chart));
    const request = plannedRequest(fdi, record, options, identity);
    if (request) entries.push(identity.entry(`ServiceRequest/${fdi}`, request));
    for (const [key, resource] of clinicalProfileResources(record, fdi, safe, options, identity, true)) entries.push(identity.entry(key, resource));
  }
  for (const [key, resource] of [...riskEvidence(safe, options, identity), ...diagnosis(safe, options, identity)]) entries.push(identity.entry(key, resource));
  const diagnosisReference = safe.case?.diagnosisOverride ? identity.reference("Condition/periodontal-diagnosis") : undefined;
  const fallbackEntry = entries.find((entry) => entry.resource?.resourceType !== "Patient");
  const fallbackTarget = fallbackEntry?.fullUrl
    ?? (fallbackEntry?.resource?.id ? `${fallbackEntry.resource.resourceType}/${fallbackEntry.resource.id}` : undefined);
  const provenance = clinicalProvenance(safe, options, identity, diagnosisReference ?? fallbackTarget);
  if (provenance) entries.push(identity.entry("Provenance/clinical", provenance));
  entries.push(...sharedResourceEntries(safe, options));
  for (const [key, resource] of sharedResourceProvenance(safe, options)) entries.push(identity.entry(key, resource));
  return { resourceType: "Bundle", type: "collection", identifier: { system: DENTAL_CORE, value: DENTAL_CORE_BUNDLE_IDENTIFIER }, entry: entries };
}
