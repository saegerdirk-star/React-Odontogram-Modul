import type { Bundle, BundleEntry, CarePlan, Condition, Device, Observation, Procedure, Provenance, Resource, ServiceRequest } from "fhir/r4";
import type { DentalCoreResourceIdentity, FhirExportOptions, OdontogramExportPayload, ToothRecord } from "./types";
import { DentalChartStateProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Observation_DentalChartState";
import { DentalClinicalProvenanceProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Provenance_DentalClinicalProvenance";
import { DentalDeviceProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Device_DentalDevice";
import { DentalFindingProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Observation_DentalFinding";
import { DentalProcedureProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Procedure_DentalProcedure";
import { DentalRiskEvidenceProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/Observation_DentalRiskEvidence";
import { DentalServiceRequestProfile } from "./generated/de-cognovis-fhir-dental-core/profiles/ServiceRequest_DentalServiceRequest";
import { CHART_MAPPINGS, COMPONENT_SYSTEM, DENTAL_CORE, DENTAL_CORE_BUNDLE_IDENTIFIER, DENTAL_CORE_PROFILES, FDI_SYSTEM, isDentalCoreDiagnosis, isDentalCoreFdi, isDentalCoreRiskValue, PROPERTY_SYSTEM, PROVENANCE_SYSTEM, VALUE_SYSTEM } from "./dentalCoreContract";

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

const supportedToothFields = new Set(CHART_MAPPINGS.map((mapping) => mapping.field));
const supportedCaseFields = new Set(["cigarettesPerDay", "toothLossPerio", "maxRblPercent", "diagnosisOverride"]);
const supportedExaminationFields = new Set(["subject", "effectiveDateTime"]);
const nonClinicalToothFields = new Set(["cariesActiveDepth", "fillingMaterial"]);

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

function assertMappedTooth(record: ToothRecord, label: string): void {
  for (const [field, value] of Object.entries(record)) {
    if (nonClinicalToothFields.has(field)) continue;
    if (!supportedToothFields.has(field as keyof ToothRecord)) {
      if (hasClinicalValue(value, field)) throw new UnsupportedDentalCoreContentError(`${label}.${field}`);
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
}

function assertDentalCoreComplete(payload: OdontogramExportPayload): void {
  for (const [fdi, record] of Object.entries(payload.teeth ?? {})) {
    if (!isDentalCoreFdi(fdi) && hasClinicalValue(record)) throw new UnsupportedDentalCoreContentError(`teeth.${fdi}`);
    assertMappedTooth(record, `teeth.${fdi}`);
  }
  for (const [fdi, record] of Object.entries(payload.plan ?? {})) {
    if (!isDentalCoreFdi(fdi) && hasClinicalValue(record)) throw new UnsupportedDentalCoreContentError(`plan.${fdi}`);
    assertMappedTooth(record, `plan.${fdi}`);
  }
  if (payload.globals?.edentulous === true) throw new UnsupportedDentalCoreContentError("globals.edentulous");
  for (const [field, value] of Object.entries(payload.case ?? {})) {
    if (!supportedCaseFields.has(field) && hasClinicalValue(value)) throw new UnsupportedDentalCoreContentError(`case.${field}`);
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
  const clinician = payload.examination?.recorder ?? payload.examination?.performer;
  const provenance: Provenance = generated(DentalClinicalProvenanceProfile, { resourceType: "Provenance", meta: { profile: profile("dental-clinical-provenance") }, target: [{ reference: identity.reference("Condition/periodontal-diagnosis") }], recorded: effective(payload, options), activity: { coding: [coding(PROVENANCE_SYSTEM, "clinician-selected")] }, agent: [{ who: clinician ? { reference: clinician } : { display: "Unspecified clinician" } }] });
  return [["Condition/periodontal-diagnosis", condition], ["Provenance/clinical", provenance]];
}

export function buildDentalCoreBundle(payload: OdontogramExportPayload, options: FhirExportOptions = {}): Bundle {
  const safe = payload && typeof payload === "object" ? payload : ({ version: "", teeth: {} } as OdontogramExportPayload);
  assertDentalCoreComplete(safe);
  const identity = new DentalCoreIdentityResolver(safe);
  const entries: BundleEntry[] = [];
  if (!options.subject) entries.push(identity.entry("Patient/subject", { resourceType: "Patient" }));
  for (const [fdi, record] of Object.entries(safe.teeth ?? {}).filter(([fdi]) => isDentalCoreFdi(fdi))) {
    const chart = chartState(record, fdi, safe, options, identity, false);
    if (chart) entries.push(identity.entry(`Observation/chart/status/${fdi}`, chart));
    for (const [key, resource] of [...procedure(record, fdi, safe, options, identity), ...devices(record, fdi, options, identity), ...observedFindings(record, fdi, safe, options, identity)]) entries.push(identity.entry(key, resource));
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
  }
  for (const [key, resource] of [...riskEvidence(safe, options, identity), ...diagnosis(safe, options, identity)]) entries.push(identity.entry(key, resource));
  return { resourceType: "Bundle", type: "collection", identifier: { system: DENTAL_CORE, value: DENTAL_CORE_BUNDLE_IDENTIFIER }, entry: entries };
}
