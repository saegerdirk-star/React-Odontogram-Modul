import type { Bundle, Observation, Resource } from "fhir/r4";
import { DentalChartStateProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Observation_DentalChartState";
import { DentalClinicalProvenanceProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Provenance_DentalClinicalProvenance";
import { DentalDeviceProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Device_DentalDevice";
import { DentalFindingProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Observation_DentalFinding";
import { DentalProcedureProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Procedure_DentalProcedure";
import { DentalRiskEvidenceProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Observation_DentalRiskEvidence";
import { DentalServiceRequestProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/ServiceRequest_DentalServiceRequest";
import type { OdontogramExportPayload, ToothRecord } from "./types";
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
  PROPERTY_SYSTEM,
  PROVENANCE_SYSTEM,
  VALUE_SYSTEM,
} from "./dentalCoreContract";

type ResourceRecord = Resource & Record<string, unknown>;
type GeneratedProfile = { from(resource: never): unknown };

const codeAt = (resource: { coding?: Array<{ system?: string; code?: string }> } | undefined, system: string) =>
  resource?.coding?.find((coding) => coding.system === system)?.code;
const inverse = (values: Record<string, string> | undefined, code: string) =>
  Object.entries(values ?? {}).find(([, mapped]) => mapped === code)?.[0];
const hasSingleProfile = (resource: ResourceRecord, expected: string): boolean =>
  Array.isArray(resource.meta?.profile) && resource.meta.profile.length === 1 && resource.meta.profile[0] === expected;
const validGeneratedProfile = (profile: GeneratedProfile, resource: ResourceRecord): boolean => {
  try {
    profile.from(resource as never);
    return true;
  } catch (error) {
    console.log("Dental Core generated profile rejected resource", resource.resourceType, resource.id, error);
    return false;
  }
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
  if (bundle?.resourceType !== "Bundle" || bundle.type !== "collection" || bundle.identifier?.system !== DENTAL_CORE || bundle.identifier?.value !== DENTAL_CORE_BUNDLE_IDENTIFIER || !Array.isArray(bundle.entry)) return undefined;
  const payload: OdontogramExportPayload = { version: "2.25", globals: {}, teeth: {} };
  const identifiers = new Set<string>();
  const placeholderPatients = bundle.entry.filter((entry) => {
    const resource = entry?.resource as ResourceRecord | undefined;
    return resource?.resourceType === "Patient";
  });
  if (placeholderPatients.length > 1 || (placeholderPatients.length === 1 && placeholderPatients[0]?.resource?.id !== "odontogram-subject")) return undefined;
  const hasPlaceholderPatient = placeholderPatients.length === 1;
  let expectedSubject: string | undefined = hasPlaceholderPatient ? "urn:uuid:odontogram-subject" : undefined;
  let hasPlan = false;
  let planActivities: Set<string> | undefined;
  const planRequests = new Set<string>();
  const plannedFdi = new Set<string>();
  const chartIds = new Set<string>();
  const findingIds = new Set<string>();
  const procedureIds = new Set<string>();
  const deviceIds = new Set<string>();
  const riskCodes = new Set<string>();
  const claims = new Map<string, string>();
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

  for (const entry of bundle.entry) {
    const resource = entry?.resource as ResourceRecord | undefined;
    if (!resource || resource.resourceType === "Patient" || resource.resourceType === "Provenance") continue;
    const subject = subjectReference(resource);
    if (!subject || (expectedSubject && expectedSubject !== subject)) return undefined;
    expectedSubject = subject;
  }

  for (const entry of bundle.entry) {
    const resource = entry?.resource as ResourceRecord | undefined;
    if (!resource || typeof resource.resourceType !== "string" || typeof resource.id !== "string" || !resource.id) return undefined;
    const key = `${resource.resourceType}/${resource.id}`;
    if (identifiers.has(key)) return undefined;
    identifiers.add(key);
    if (resource.resourceType === "Patient") {
      if (resource.id !== "odontogram-subject") return undefined;
      continue;
    }
    const subject = subjectReference(resource);
    if (resource.resourceType !== "Provenance" && (!subject || subject !== expectedSubject)) return undefined;
    if (resource.resourceType === "CarePlan") {
      if (resource.id !== "dental-core-plan" || resource.status !== "active" || resource.intent !== "plan" || !subject) return undefined;
      if (!Array.isArray(resource.activity)) return undefined;
      const activities = resource.activity.map((activity) => (activity as { reference?: { reference?: unknown } }).reference?.reference);
      if (activities.some((reference) => typeof reference !== "string" || !reference.startsWith("ServiceRequest/dental-core-request-"))) return undefined;
      planActivities = new Set(activities as string[]);
      if (planActivities.size !== activities.length) return undefined;
      hasPlan = true;
      continue;
    }
    if (resource.resourceType === "Condition") {
      if (resource.id !== "dental-core-periodontal-diagnosis" || diagnosis || !subject || !isIsoDateTime(resource.recordedDate)) return undefined;
      diagnosis = resource;
      continue;
    }
    if (resource.resourceType === "Provenance") {
      if (!hasSingleProfile(resource, DENTAL_CORE_PROFILES["dental-clinical-provenance"]) || !validGeneratedProfile(DentalClinicalProvenanceProfile, resource) || provenance || !clinicalDate(resource)) return undefined;
      provenance = resource;
      continue;
    }
    if (resource.resourceType === "Observation" && hasSingleProfile(resource, DENTAL_CORE_PROFILES["dental-chart-state"])) {
      if (!validGeneratedProfile(DentalChartStateProfile, resource) || resource.status !== "final" || codeAt(resource.code as { coding?: Array<{ system?: string; code?: string }> }, COMPONENT_SYSTEM) !== "chart-state" || !subject || !clinicalDate(resource)) return undefined;
      const fdi = bodySiteFdi(resource);
      if (!fdi || !isDentalCoreFdi(fdi)) return undefined;
      const planned = Array.isArray(resource.basedOn) && resource.basedOn.some((reference) => (reference as { reference?: unknown }).reference === "CarePlan/dental-core-plan");
      if (planned && !hasPlan) return undefined;
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
      continue;
    }
    if (resource.resourceType === "Observation" && hasSingleProfile(resource, DENTAL_CORE_PROFILES["dental-risk-evidence"])) {
      if (!validGeneratedProfile(DentalRiskEvidenceProfile, resource) || resource.status !== "final" || !subject || !clinicalDate(resource)) return undefined;
      const code = codeAt(resource.code as { coding?: Array<{ system?: string; code?: string }> }, COMPONENT_SYSTEM);
      const value = code === "maximum-radiographic-bone-loss" ? (resource.valueQuantity as { value?: unknown } | undefined)?.value : resource.valueInteger;
      if (!code || riskCodes.has(code) || typeof value !== "number" || !isDentalCoreRiskValue(code, value)) return undefined;
      riskCodes.add(code);
      payload.case ??= {};
      if (code === "cigarettes-per-day") payload.case.cigarettesPerDay = value;
      if (code === "periodontitis-attributed-tooth-loss") payload.case.toothLossPerio = value;
      if (code === "maximum-radiographic-bone-loss") payload.case.maxRblPercent = value;
      continue;
    }
    if (resource.resourceType === "Observation" && hasSingleProfile(resource, DENTAL_CORE_PROFILES["dental-finding"])) {
      if (!validGeneratedProfile(DentalFindingProfile, resource) || resource.status !== "final" || !subject) return undefined;
      const fdi = bodySiteFdi(resource);
      const property = codeAt(resource.code as { coding?: Array<{ system?: string; code?: string }> }, PROPERTY_SYSTEM);
      if (!fdi || !property || findingIds.has(`${fdi}:${property}`) || !isDentalCoreFdi(fdi)) return undefined;
      findingIds.add(`${fdi}:${property}`);
      const mapping = mappingsByProperty.get(property)?.find((candidate) => candidate.kind === "boolean" || candidate.kind === "enum");
      const coded = codeAt(resource.valueCodeableConcept as { coding?: Array<{ system?: string; code?: string }> }, VALUE_SYSTEM);
      const value = mapping?.kind === "boolean" ? (coded ? true : resource.valueBoolean) : inverse(mapping?.values, coded ?? "");
      if (!mapping || value === undefined || !claim(fdi, mapping.field, value) || !applyFinding((payload.teeth[fdi] ??= {}), resource)) return undefined;
      continue;
    }
    if (resource.resourceType === "Procedure" && hasSingleProfile(resource, DENTAL_CORE_PROFILES["dental-procedure"])) {
      if (!validGeneratedProfile(DentalProcedureProfile, resource) || resource.status !== "completed" || !subject) return undefined;
      const bodySite = Array.isArray(resource.bodySite) ? resource.bodySite[0] as { coding?: Array<{ system?: string; code?: string }> } | undefined : undefined;
      const fdi = codeAt(bodySite, FDI_SYSTEM);
      const text = (resource.code as { text?: unknown } | undefined)?.text;
      const field = text === "Apicoectomy or root-end resection" ? "endoResection" : text === "Fissure sealing" ? "fissureSealing" : undefined;
      if (!fdi || !field || procedureIds.has(`${fdi}:${field}`) || !isDentalCoreFdi(fdi) || !claim(fdi, field, true) || !applyProcedure((payload.teeth[fdi] ??= {}), resource)) return undefined;
      procedureIds.add(`${fdi}:${field}`);
      continue;
    }
    if (resource.resourceType === "Device" && hasSingleProfile(resource, DENTAL_CORE_PROFILES["dental-device"])) {
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
      continue;
    }
    if (resource.resourceType === "ServiceRequest" && hasSingleProfile(resource, DENTAL_CORE_PROFILES["dental-service-request"])) {
      if (!validGeneratedProfile(DentalServiceRequestProfile, resource) || resource.status !== "active" || resource.intent !== "plan" || !subject || !hasPlan) return undefined;
      const fdi = Array.isArray(resource.bodySite) ? codeAt(resource.bodySite[0] as { coding?: Array<{ system?: string; code?: string }> }, FDI_SYSTEM) : undefined;
      if (!fdi || !isDentalCoreFdi(fdi) || !Array.isArray(resource.basedOn) || !(resource.basedOn as Array<{ reference?: unknown }>).some((reference) => reference.reference === "CarePlan/dental-core-plan")) return undefined;
      if (resource.id !== `dental-core-request-${fdi}`) return undefined;
      if (planRequests.has(`ServiceRequest/${resource.id}`)) return undefined;
      planRequests.add(`ServiceRequest/${resource.id}`);
      (payload.plan ??= {})[fdi] ??= {};
      continue;
    }
    return undefined;
  }
  if (hasPlaceholderPatient && expectedSubject !== "urn:uuid:odontogram-subject") return undefined;
  if (hasPlan) {
    if (!planActivities || planActivities.size !== planRequests.size || [...planActivities].some((reference) => !planRequests.has(reference))) return undefined;
    if ([...plannedFdi].some((fdi) => !planRequests.has(`ServiceRequest/dental-core-request-${fdi}`))) return undefined;
  }
  if (diagnosis || provenance) {
    const selected = diagnosis?.meta?.tag?.find((tag) => tag.system === VALUE_SYSTEM)?.code;
    const activity = codeAt(provenance?.activity, PROVENANCE_SYSTEM);
    const target = (provenance?.target as Array<{ reference?: unknown }> | undefined)?.some((reference) => reference.reference === "Condition/dental-core-periodontal-diagnosis");
    if (!diagnosis || !provenance || !target || activity !== "clinician-selected" || !selected || !isDentalCoreDiagnosis(selected)) return undefined;
    payload.case = { ...payload.case, diagnosisOverride: selected };
  }
  return payload;
}
