import type { Bundle, Resource } from "fhir/r4";
import type { OdontogramDocument } from "../document";
import type { DentalDeConversionReport } from "./types";
import { buildDentalDeBundle } from "./toFhirDentalDe";
import { DENTAL_DE_COMPATIBILITY } from "./importDentalDe";
import type { DentalDeImportResult } from "./importDentalDe";
import {
  DENTAL_DE_ASSESSMENT_SYSTEM,
  DENTAL_DE_BASE,
  DENTAL_DE_FDI_SYSTEM,
  FDI_SURFACE_SYSTEM,
} from "./dentalDeCodesystems";
import { FDI_TOOTH_NUMBER_EXT_URL } from "./dentalDeCodesystems";
import { slotForPrimaryFdi } from "../utils/numbering";
import { DENTAL_DE_IMPORT_MANIFEST } from "./dentalDeImportManifest";
import type { DentalDeCarrier } from "./dentalDeImportManifest";

type ImportedDentalDe = Extract<DentalDeImportResult, { ok: true }>;

export interface DentalDeExportOptions {
  patient: string;
  effectiveDateTime: string;
  encounter?: string;
  author?: string;
}

export interface DentalDeResourceChange {
  key: string;
  resourceType: string;
  id?: string;
  versionId?: string;
}

export interface DentalDeChangeSet {
  added: DentalDeResourceChange[];
  updated: DentalDeResourceChange[];
  removed: DentalDeResourceChange[];
}

export type DentalDeExportResult =
  | {
      ok: true;
      bundle: Bundle;
      changes: DentalDeChangeSet;
      report: DentalDeConversionReport;
      compatibility: typeof DENTAL_DE_COMPATIBILITY;
    }
  | { ok: false; code: "incompatible"; message: string; report: DentalDeConversionReport };

interface ResourceLike {
  resourceType?: string;
  id?: string;
  meta?: { profile?: string[]; versionId?: string; lastUpdated?: string; [key: string]: unknown };
  bodySite?: { coding?: Array<{ system?: string; code?: string }>; extension?: unknown[] };
  code?: { coding?: Array<{ system?: string; code?: string }>; text?: string };
  subject?: { reference?: string };
}

function coding(resource: ResourceLike, system: string): string {
  return resource.code?.coding?.find((entry) => entry.system === system)?.code ?? "";
}

function tooth(resource: ResourceLike): string {
  if (resource.resourceType === "Device") {
    const extensions = (resource as ResourceLike & { extension?: Array<{ url?: string; valueCode?: string }> }).extension ?? [];
    return extensions.find((entry) => entry.url === FDI_TOOTH_NUMBER_EXT_URL)?.valueCode ?? "";
  }
  return resource.bodySite?.coding?.find((entry) => entry.system === DENTAL_DE_FDI_SYSTEM)?.code ?? "";
}

function surfaces(resource: ResourceLike): string {
  const serialized = JSON.stringify(resource.bodySite?.extension ?? []);
  const matches = [...serialized.matchAll(new RegExp(`${FDI_SURFACE_SYSTEM.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^}]*?\\"code\\":\\"([^\\"]+)`, "g"))];
  return matches.map((match) => match[1]).sort().join(",");
}

function supported(resource: ResourceLike): boolean {
  return (resource.meta?.profile ?? []).some((profile) => profile.startsWith(`${DENTAL_DE_BASE}/StructureDefinition/`));
}

function resourceKey(resource: ResourceLike): string {
  const profile = resource.meta?.profile?.find((entry) => entry.startsWith(`${DENTAL_DE_BASE}/StructureDefinition/`)) ?? "";
  const assessment = coding(resource, DENTAL_DE_ASSESSMENT_SYSTEM);
  const finding = resource.code?.text ?? "";
  if (resource.resourceType === "Device") return `${profile}|Device|${tooth(resource)}`;
  return `${profile}|${resource.resourceType ?? ""}|${tooth(resource)}|${assessment}|${finding}|${surfaces(resource)}`;
}

function clinicalValue(resource: ResourceLike): string {
  const copy = structuredClone(resource);
  delete copy.id;
  if (copy.meta) {
    delete copy.meta.versionId;
    delete copy.meta.lastUpdated;
  }
  return JSON.stringify(copy);
}

function change(resource: ResourceLike, key = resourceKey(resource)): DentalDeResourceChange {
  return {
    key,
    resourceType: resource.resourceType ?? "Resource",
    ...(resource.id ? { id: resource.id } : {}),
    ...(resource.meta?.versionId ? { versionId: resource.meta.versionId } : {}),
  };
}

function documentSlot(fdi: string): string {
  const primarySlot = slotForPrimaryFdi(fdi);
  return primarySlot === null ? fdi : String(primarySlot);
}

function changedSlots(before: OdontogramDocument, after: OdontogramDocument): Set<string> {
  const slots = new Set([...Object.keys(before.teeth), ...Object.keys(after.teeth)]);
  return new Set([...slots].filter((slot) =>
    JSON.stringify(before.teeth[slot] ?? {}) !== JSON.stringify(after.teeth[slot] ?? {}),
  ));
}

function affectedCarriers(before: OdontogramDocument, after: OdontogramDocument): Map<string, Set<DentalDeCarrier>> {
  const byField = new Map(DENTAL_DE_IMPORT_MANIFEST.map((entry) => [entry.field, entry]));
  const result = new Map<string, Set<DentalDeCarrier>>();
  const slots = new Set([...Object.keys(before.teeth), ...Object.keys(after.teeth)]);
  for (const slot of slots) {
    const previous = before.teeth[slot] ?? {};
    const next = after.teeth[slot] ?? {};
    const fields = new Set([...Object.keys(previous), ...Object.keys(next)] as Array<keyof typeof next>);
    const carriers = new Set<DentalDeCarrier>();
    for (const field of fields) {
      if (JSON.stringify(previous[field]) === JSON.stringify(next[field])) continue;
      const manifest = byField.get(field);
      if (manifest?.support === "canonical") carriers.add(manifest.carrier);
      if (field === "toothSelection") {
        carriers.add("dental-implant");
        carriers.add("periodontal-observation");
        carriers.add("peri-implant-observation");
      }
    }
    result.set(slot, carriers);
  }
  return result;
}

function carrierOf(resource: ResourceLike): DentalDeCarrier | undefined {
  const profile = resource.meta?.profile?.find((entry) => entry.startsWith(`${DENTAL_DE_BASE}/StructureDefinition/`));
  if (!profile) return undefined;
  if (profile.endsWith("/odontogram-observation")) return "odontogram-observation";
  if (profile.endsWith("/caries-observation")) return "caries-observation";
  if (profile.endsWith("/dental-finding")) return "dental-finding";
  if (profile.endsWith("/periodontal-observation")) return "periodontal-observation";
  if (profile.endsWith("/peri-implant-observation")) return "peri-implant-observation";
  if (profile.endsWith("/dental-implant")) return "dental-implant";
  return undefined;
}

function applyEditMetadata(resource: ResourceLike, options: DentalDeExportOptions): void {
  const observation = resource as ResourceLike & {
    encounter?: { reference: string };
    performer?: Array<{ reference: string }>;
  };
  if (resource.resourceType !== "Observation") return;
  if (options.encounter) observation.encounter = { reference: options.encounter };
  if (options.author) observation.performer = [{ reference: options.author }];
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value === undefined || value === null || value === false) return false;
  if (typeof value === "string") return !["", "none", "normal", "unknown"].includes(value);
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function appendUnsupportedLosses(
  report: DentalDeConversionReport,
  odontogramState: OdontogramDocument,
): void {
  const unsupported = DENTAL_DE_IMPORT_MANIFEST.filter((entry) => entry.support === "unsupported");
  for (const [tooth, record] of Object.entries(odontogramState.teeth)) {
    for (const entry of unsupported) {
      const value = record[entry.field];
      if (!hasMeaningfulValue(value)) continue;
      if (report.unmapped.some((item) => item.tooth === tooth && item.field === entry.field)) continue;
      report.unmapped.push({
        tooth,
        field: entry.field,
        value: typeof value === "string" ? value : JSON.stringify(value),
        reason: `The exhaustive Dental-DE carrier manifest classifies this field as unsupported by ${entry.carrier}.`,
      });
    }
  }
}

/**
 * Export one complete local save candidate. This function is pure and performs
 * no validation request or persistence; the host owns those operations.
 */
export function exportDentalDeBundle(
  imported: ImportedDentalDe,
  odontogramState: OdontogramDocument,
  options: DentalDeExportOptions,
): DentalDeExportResult {
  if (options.patient !== imported.patient.reference) {
    return {
      ok: false,
      code: "incompatible",
      message: "The export patient must match the imported session patient.",
      report: { textFallback: [], unmapped: [] },
    };
  }

  const generated = buildDentalDeBundle(odontogramState, {
    dialect: "dental-de",
    subject: imported.patient.sourceReference ?? options.patient,
    effectiveDateTime: options.effectiveDateTime,
  });
  appendUnsupportedLosses(generated.report, odontogramState);
  const changed = changedSlots(imported.document, odontogramState);
  const carriersBySlot = affectedCarriers(imported.document, odontogramState);
  if (changed.size === 0) {
    return {
      ok: true,
      bundle: structuredClone(imported.sourceBundle),
      changes: { added: [], updated: [], removed: [] },
      report: generated.report,
      compatibility: DENTAL_DE_COMPATIBILITY,
    };
  }
  const previousEntries = imported.sourceBundle.entry ?? [];
  const previousSupported = new Map<string, Array<{ resource: ResourceLike; fullUrl?: string }>>();
  const retainedEntries: NonNullable<Bundle["entry"]> = [];
  for (const entry of previousEntries) {
    const resource = entry.resource as ResourceLike | undefined;
    if (!resource || !supported(resource)) {
      retainedEntries.push(structuredClone(entry));
      continue;
    }
    const slot = documentSlot(tooth(resource));
    const carrier = carrierOf(resource);
    if (slot && (!changed.has(slot) || !carrier || !carriersBySlot.get(slot)?.has(carrier))) {
      retainedEntries.push(structuredClone(entry));
      continue;
    }
    const key = resourceKey(resource);
    const bucket = previousSupported.get(key) ?? [];
    bucket.push({ resource, fullUrl: entry.fullUrl });
    previousSupported.set(key, bucket);
  }

  const changes: DentalDeChangeSet = { added: [], updated: [], removed: [] };
  const nextEntries: NonNullable<Bundle["entry"]> = [...retainedEntries];
  for (const entry of generated.bundle.entry ?? []) {
    const next = structuredClone(entry.resource) as ResourceLike | undefined;
    if (!next) continue;
    const slot = documentSlot(tooth(next));
    const carrier = carrierOf(next);
    if (slot && (!changed.has(slot) || !carrier || !carriersBySlot.get(slot)?.has(carrier))) continue;
    const key = resourceKey(next);
    const bucket = previousSupported.get(key);
    const previous = bucket?.shift();
    if (!previous) {
      applyEditMetadata(next, options);
      changes.added.push(change(next, key));
      nextEntries.push({ resource: next as Resource });
      continue;
    }
    if (bucket?.length === 0) previousSupported.delete(key);
    next.id = previous.resource.id;
    next.meta = { ...next.meta, ...previous.resource.meta };
    const comparable = structuredClone(next) as ResourceLike & { effectiveDateTime?: string };
    const prior = previous.resource as ResourceLike & { effectiveDateTime?: string };
    if (prior.effectiveDateTime) comparable.effectiveDateTime = prior.effectiveDateTime;
    const isChanged = clinicalValue(comparable) !== clinicalValue(previous.resource);
    if (isChanged) {
      applyEditMetadata(next, options);
      changes.updated.push(change(next, key));
      nextEntries.push({ ...(previous.fullUrl ? { fullUrl: previous.fullUrl } : {}), resource: next as Resource });
    } else {
      nextEntries.push({ ...(previous.fullUrl ? { fullUrl: previous.fullUrl } : {}), resource: structuredClone(previous.resource) as Resource });
    }
  }

  for (const [key, previousEntries] of previousSupported) {
    for (const previous of previousEntries) changes.removed.push(change(previous.resource, key));
  }

  return {
    ok: true,
    bundle: { resourceType: "Bundle", type: "collection", entry: nextEntries },
    changes,
    report: generated.report,
    compatibility: DENTAL_DE_COMPATIBILITY,
  };
}
