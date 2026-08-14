import type { Bundle, Condition, Observation, Provenance, Resource } from "fhir/r4";
import type { OdontogramExportPayload, ToothRecord } from "./types";
import { COMPONENT_SYSTEM, DENTAL_CORE, DENTAL_CORE_BUNDLE_IDENTIFIER, FDI_SYSTEM, isDentalCoreFdi, isDentalCoreRiskValue, mappingsByProperty, PROFILE, PROPERTY_SYSTEM, PROVENANCE_SYSTEM, VALUE_SYSTEM } from "./dentalCoreContract";

const codeAt = (resource: { coding?: Array<{ system?: string; code?: string }> } | undefined, system: string) => resource?.coding?.find((coding) => coding.system === system)?.code;
const inverse = (values: Record<string, string> | undefined, code: string) => Object.entries(values ?? {}).find(([, mapped]) => mapped === code)?.[0];
const hasProfile = (resource: Resource, name: string): boolean => resource.meta?.profile?.includes(`${PROFILE}/${name}`) ?? false;

function isSupportedResource(resource: Resource): boolean {
  switch (resource.resourceType) {
    case "Patient": return resource.id === "odontogram-subject";
    case "CarePlan": return resource.id === "dental-core-plan";
    case "Condition": return resource.id === "dental-core-periodontal-diagnosis";
    case "Observation": return hasProfile(resource, "dental-chart-state") || hasProfile(resource, "dental-risk-evidence") || hasProfile(resource, "dental-finding");
    case "Procedure": return hasProfile(resource, "dental-procedure");
    case "Device": return hasProfile(resource, "dental-device");
    case "ServiceRequest": return hasProfile(resource, "dental-service-request");
    case "Provenance": return hasProfile(resource, "dental-clinical-provenance");
    default: return false;
  }
}

function applyChart(record: ToothRecord, observation: Observation): void {
  for (const component of observation.component ?? []) {
    const property = codeAt(component.code, PROPERTY_SYSTEM);
    const candidates = property ? mappingsByProperty.get(property) : undefined;
    if (!candidates?.length) continue;
    const coded = codeAt(component.valueCodeableConcept, VALUE_SYSTEM);
    const mapping = candidates.find((candidate) => candidate.kind !== "boolean" || !candidate.values?.true || candidate.values.true === coded) ?? candidates[0];
    if (mapping.kind === "boolean") {
      if (coded && mapping.values?.true === coded) (record as Record<string, unknown>)[mapping.field] = true;
      else if (typeof component.valueBoolean === "boolean") (record as Record<string, unknown>)[mapping.field] = component.valueBoolean;
      continue;
    }
    if (!coded) continue;
    const source = inverse(mapping.values, coded);
    if (!source) continue;
    if (mapping.kind === "set") {
      const values = ((record as Record<string, unknown>)[mapping.field] as string[] | undefined) ?? [];
      if (!values.includes(source)) values.push(source);
      (record as Record<string, unknown>)[mapping.field] = values;
    } else (record as Record<string, unknown>)[mapping.field] = source;
  }
}

export function parseDentalCoreBundle(input: unknown): OdontogramExportPayload | undefined {
  const bundle = input as Bundle;
  if (
    bundle?.resourceType !== "Bundle"
    || bundle.identifier?.system !== DENTAL_CORE
    || bundle.identifier?.value !== DENTAL_CORE_BUNDLE_IDENTIFIER
  ) return undefined;
  const payload: OdontogramExportPayload = { version: "2.25", globals: {}, teeth: {} };
  for (const entry of bundle.entry ?? []) {
    const resource = entry.resource as Resource | undefined;
    if (!resource) continue;
    if (!isSupportedResource(resource)) return undefined;
    if (resource.resourceType === "Observation" && resource.meta?.profile?.includes(`${PROFILE}/dental-chart-state`)) {
      const observation = resource as Observation;
      const fdi = codeAt(observation.bodySite, FDI_SYSTEM);
      if (!fdi || !isDentalCoreFdi(fdi)) return undefined;
      const plan = observation.basedOn?.some((reference) => reference.reference === "CarePlan/dental-core-plan") ?? false;
      const target = plan ? (payload.plan ??= {}) : payload.teeth;
      applyChart((target[fdi] ??= {}), observation);
    }
    if (resource.resourceType === "Observation" && resource.meta?.profile?.includes(`${PROFILE}/dental-risk-evidence`)) {
      const observation = resource as Observation;
      const code = codeAt(observation.code, COMPONENT_SYSTEM);
      const value = code === "maximum-radiographic-bone-loss" ? observation.valueQuantity?.value : observation.valueInteger;
      if (!code || typeof value !== "number" || !isDentalCoreRiskValue(code, value)) return undefined;
      payload.case ??= {};
      if (code === "cigarettes-per-day") payload.case.cigarettesPerDay = value;
      if (code === "periodontitis-attributed-tooth-loss") payload.case.toothLossPerio = value;
      if (code === "maximum-radiographic-bone-loss") payload.case.maxRblPercent = value;
    }
  }
  const clinicianSelected = (bundle.entry ?? []).some((entry) => entry.resource?.resourceType === "Provenance" && codeAt((entry.resource as Provenance).activity, PROVENANCE_SYSTEM) === "clinician-selected");
  if (clinicianSelected) {
    const condition = (bundle.entry ?? []).map((entry) => entry.resource).find((resource) => resource?.resourceType === "Condition" && resource.id === "dental-core-periodontal-diagnosis");
    const selected = condition?.resourceType === "Condition" ? (condition as Condition).meta?.tag?.find((tag) => tag.system === VALUE_SYSTEM)?.code : undefined;
    if (["health", "gingivitis", "periodontitis"].includes(selected ?? "")) (payload.case ??= {}).diagnosisOverride = selected;
  }
  return payload;
}
