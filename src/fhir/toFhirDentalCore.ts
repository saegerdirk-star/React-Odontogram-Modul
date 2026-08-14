import type { Bundle, BundleEntry, CarePlan, Condition, Device, Observation, Procedure, Provenance, Resource, ServiceRequest } from "fhir/r4";
import type { FhirExportOptions, OdontogramExportPayload, ToothRecord } from "./types";
import { DentalChartStateProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Observation_DentalChartState";
import { DentalClinicalProvenanceProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Provenance_DentalClinicalProvenance";
import { DentalDeviceProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Device_DentalDevice";
import { DentalFindingProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Observation_DentalFinding";
import { DentalProcedureProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Procedure_DentalProcedure";
import { DentalRiskEvidenceProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Observation_DentalRiskEvidence";
import { DentalServiceRequestProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/ServiceRequest_DentalServiceRequest";
import { CHART_MAPPINGS, COMPONENT_SYSTEM, DENTAL_CORE, DENTAL_CORE_BUNDLE_IDENTIFIER, DENTAL_CORE_PROFILES, FDI_SYSTEM, isDentalCoreDiagnosis, isDentalCoreFdi, isDentalCoreRiskValue, PROPERTY_SYSTEM, PROVENANCE_SYSTEM, VALUE_SYSTEM } from "./dentalCoreContract";

const subjectReference = (options: FhirExportOptions): string => options.subject ?? "urn:uuid:odontogram-subject";
const effective = (payload: OdontogramExportPayload, options: FhirExportOptions): string => {
  const value = options.effectiveDateTime ?? payload.examination?.effectiveDateTime ?? payload.case?.examDate;
  if (!value) throw new Error("Dental Core export requires an effective date from the export options or examination context");
  return value;
};
const coding = (system: string, code: string) => ({ system, code });
const profile = (id: keyof typeof DENTAL_CORE_PROFILES) => [DENTAL_CORE_PROFILES[id]];
const generated = <T>(profileType: { apply(resource: never): { toResource(): unknown } }, resource: T): T =>
  profileType.apply(resource as never).toResource() as T;

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

function chartState(record: ToothRecord, fdi: string, payload: OdontogramExportPayload, options: FhirExportOptions, plan: boolean): Observation | undefined {
  const component = chartComponents(record);
  if (!component?.length) return undefined;
  return generated(DentalChartStateProfile, {
    resourceType: "Observation",
    id: `dental-core-chart-${plan ? "plan-" : ""}${fdi}`,
    meta: { profile: profile("dental-chart-state") },
    status: "final",
    code: { coding: [coding(COMPONENT_SYSTEM, "chart-state")] },
    subject: { reference: subjectReference(options) },
    effectiveDateTime: effective(payload, options),
    bodySite: { coding: [coding(FDI_SYSTEM, fdi)] },
    ...(plan ? { basedOn: [{ reference: "CarePlan/dental-core-plan" }] } : {}),
    component,
  });
}

function procedure(record: ToothRecord, fdi: string, payload: OdontogramExportPayload, options: FhirExportOptions): Procedure[] {
  const result: Procedure[] = [];
  const procedures: Array<[boolean | undefined, string]> = [[record.endoResection, "Apicoectomy or root-end resection"], [record.fissureSealing, "Fissure sealing"]];
  for (const [index, [flag, text]] of procedures.entries()) {
    if (!flag) continue;
    result.push(generated(DentalProcedureProfile, { resourceType: "Procedure", id: `dental-core-procedure-${fdi}-${index}`, meta: { profile: profile("dental-procedure") }, status: "completed", code: { text }, subject: { reference: subjectReference(options) }, performedDateTime: effective(payload, options), bodySite: [{ coding: [coding(FDI_SYSTEM, fdi)] }] }));
  }
  return result;
}

function devices(record: ToothRecord, fdi: string, options: FhirExportOptions): Device[] {
  const types = [
    record.orthoAppliance && record.orthoAppliance !== "none" ? `Orthodontic ${record.orthoAppliance}` : undefined,
    record.parapulpalPin ? "Parapulpal pin" : undefined,
    record.bridgePillar ? "Bridge abutment" : undefined,
    record.retention && record.retention !== "none" ? `Prosthesis retention ${record.retention}` : undefined,
  ].filter((value): value is string => Boolean(value));
  return types.map((text, index) => generated(DentalDeviceProfile, {
    resourceType: "Device", id: `dental-core-device-${fdi}-${index}`, meta: { profile: profile("dental-device") }, status: "active",
    type: { text }, patient: { reference: subjectReference(options) },
    extension: [{ url: DENTAL_CORE_PROFILES["tooth-position"], valueCoding: coding(FDI_SYSTEM, fdi) }],
  }));
}

function observedFindings(record: ToothRecord, fdi: string, payload: OdontogramExportPayload, options: FhirExportOptions): Observation[] {
  const excluded = new Set(["endoResection", "fissureSealing", "orthoAppliance", "parapulpalPin", "bridgePillar", "retention", "retentionSide", "mods", "pulpLatin"]);
  return CHART_MAPPINGS.flatMap((mapping) => {
    if (excluded.has(mapping.field) || !Object.prototype.hasOwnProperty.call(record, mapping.field)) return [];
    const raw = record[mapping.field];
    if (raw === false || raw === mapping.defaultValue || raw === "none" || raw === "unknown" || (Array.isArray(raw) && raw.length === 0)) return [];
    const finding: Observation = {
      resourceType: "Observation", id: `dental-core-finding-${fdi}-${mapping.property}`, meta: { profile: profile("dental-finding") }, status: "final",
      code: { coding: [coding(PROPERTY_SYSTEM, mapping.property)] }, subject: { reference: subjectReference(options) },
      effectiveDateTime: effective(payload, options), bodySite: { coding: [coding(FDI_SYSTEM, fdi)] },
    };
    if (typeof raw === "boolean") finding.valueBoolean = raw;
    else if (typeof raw === "string") {
      const value = mapping.values?.[raw];
      if (value) finding.valueCodeableConcept = { coding: [coding(VALUE_SYSTEM, value)] };
    }
    return finding.valueBoolean !== undefined || finding.valueCodeableConcept ? [generated(DentalFindingProfile, finding)] : [];
  });
}

function plannedRequest(fdi: string, record: ToothRecord, options: FhirExportOptions): ServiceRequest | undefined {
  if (!Object.keys(record).length) return undefined;
  return generated(DentalServiceRequestProfile, {
    resourceType: "ServiceRequest", id: `dental-core-request-${fdi}`, meta: { profile: profile("dental-service-request") },
    status: "active", intent: "plan", basedOn: [{ reference: "CarePlan/dental-core-plan" }],
    code: { text: "Requested dental state change" }, subject: { reference: subjectReference(options) },
    bodySite: [{ coding: [coding(FDI_SYSTEM, fdi)] }],
  });
}

function riskEvidence(payload: OdontogramExportPayload, options: FhirExportOptions): Observation[] {
  const values = [
    ["cigarettes-per-day", payload.case?.cigarettesPerDay, "integer"],
    ["periodontitis-attributed-tooth-loss", payload.case?.toothLossPerio, "integer"],
    ["maximum-radiographic-bone-loss", payload.case?.maxRblPercent, "percent"],
  ] as const;
  return values.flatMap(([code, value, kind]) => typeof value !== "number" || !isDentalCoreRiskValue(code, value) ? [] : [generated(DentalRiskEvidenceProfile, {
    resourceType: "Observation" as const, id: `dental-core-${code}`, meta: { profile: profile("dental-risk-evidence") }, status: "final" as const,
    code: { coding: [coding(COMPONENT_SYSTEM, code)] }, subject: { reference: subjectReference(options) }, effectiveDateTime: effective(payload, options),
    ...(kind === "integer" ? { valueInteger: value } : { valueQuantity: { value, system: "http://unitsofmeasure.org", code: "%", unit: "%" } }),
  })]);
}

function diagnosis(payload: OdontogramExportPayload, options: FhirExportOptions): Resource[] {
  const selected = payload.case?.diagnosisOverride;
  if (!selected || !isDentalCoreDiagnosis(selected)) return [];
  const condition: Condition = { resourceType: "Condition", id: "dental-core-periodontal-diagnosis", meta: { tag: [coding(VALUE_SYSTEM, selected)] }, clinicalStatus: { coding: [coding("http://terminology.hl7.org/CodeSystem/condition-clinical", "active")] }, verificationStatus: { coding: [coding("http://terminology.hl7.org/CodeSystem/condition-ver-status", "confirmed")] }, code: { text: selected }, subject: { reference: subjectReference(options) }, recordedDate: effective(payload, options) };
  const clinician = payload.examination?.recorder ?? payload.examination?.performer;
  const provenance: Provenance = generated(DentalClinicalProvenanceProfile, { resourceType: "Provenance", id: "dental-core-clinical-provenance", meta: { profile: profile("dental-clinical-provenance") }, target: [{ reference: "Condition/dental-core-periodontal-diagnosis" }], recorded: effective(payload, options), activity: { coding: [coding(PROVENANCE_SYSTEM, "clinician-selected")] }, agent: [{ who: clinician ? { reference: clinician } : { display: "Unspecified clinician" } }] });
  return [condition, provenance];
}

export function buildDentalCoreBundle(payload: OdontogramExportPayload, options: FhirExportOptions = {}): Bundle {
  const safe = payload && typeof payload === "object" ? payload : ({ version: "", teeth: {} } as OdontogramExportPayload);
  const entries: BundleEntry[] = [];
  if (!options.subject) entries.push({ fullUrl: "urn:uuid:odontogram-subject", resource: { resourceType: "Patient", id: "odontogram-subject" } });
  for (const [fdi, record] of Object.entries(safe.teeth ?? {}).filter(([fdi]) => isDentalCoreFdi(fdi))) {
    const chart = chartState(record, fdi, safe, options, false);
    if (chart) entries.push({ resource: chart });
    for (const resource of [...procedure(record, fdi, safe, options), ...devices(record, fdi, options), ...observedFindings(record, fdi, safe, options)]) entries.push({ resource });
  }
  if (safe.plan && Object.keys(safe.plan).length) {
    const activity = Object.entries(safe.plan)
      .filter(([fdi, record]) => isDentalCoreFdi(fdi) && Object.keys(record).length > 0)
      .map(([fdi]) => ({ reference: { reference: `ServiceRequest/dental-core-request-${fdi}` } }));
    const plan: CarePlan = {
      resourceType: "CarePlan", id: "dental-core-plan", status: "active", intent: "plan",
      subject: { reference: subjectReference(options) }, ...(activity.length ? { activity } : {}),
    };
    entries.push({ resource: plan });
  }
  for (const [fdi, record] of Object.entries(safe.plan ?? {}).filter(([fdi]) => isDentalCoreFdi(fdi))) {
    const chart = chartState(record, fdi, safe, options, true);
    if (chart) entries.push({ resource: chart });
    const request = plannedRequest(fdi, record, options);
    if (request) entries.push({ resource: request });
  }
  for (const resource of [...riskEvidence(safe, options), ...diagnosis(safe, options)]) entries.push({ resource });
  return { resourceType: "Bundle", type: "collection", identifier: { system: DENTAL_CORE, value: DENTAL_CORE_BUNDLE_IDENTIFIER }, entry: entries };
}
