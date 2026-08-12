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
  | { ok: false; code: "incompatible" | "loss"; message: string; report: DentalDeConversionReport };

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

function applyEditMetadata(resource: ResourceLike, options: DentalDeExportOptions): void {
  const observation = resource as ResourceLike & {
    encounter?: { reference: string };
    performer?: Array<{ reference: string }>;
  };
  if (resource.resourceType !== "Observation") return;
  if (options.encounter) observation.encounter = { reference: options.encounter };
  if (options.author) observation.performer = [{ reference: options.author }];
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
    subject: options.patient,
    effectiveDateTime: options.effectiveDateTime,
  });
  const changed = changedSlots(imported.document, odontogramState);
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
  const previousSupported = new Map<string, { resource: ResourceLike; fullUrl?: string }>();
  const retainedEntries: NonNullable<Bundle["entry"]> = [];
  for (const entry of previousEntries) {
    const resource = entry.resource as ResourceLike | undefined;
    if (!resource || !supported(resource)) {
      retainedEntries.push(structuredClone(entry));
      continue;
    }
    const slot = documentSlot(tooth(resource));
    if (slot && !changed.has(slot)) {
      retainedEntries.push(structuredClone(entry));
      continue;
    }
    previousSupported.set(resourceKey(resource), { resource, fullUrl: entry.fullUrl });
  }

  const changes: DentalDeChangeSet = { added: [], updated: [], removed: [] };
  const nextEntries: NonNullable<Bundle["entry"]> = [...retainedEntries];
  for (const entry of generated.bundle.entry ?? []) {
    const next = structuredClone(entry.resource) as ResourceLike | undefined;
    if (!next) continue;
    const slot = documentSlot(tooth(next));
    if (slot && !changed.has(slot)) continue;
    const key = resourceKey(next);
    const previous = previousSupported.get(key);
    if (!previous) {
      applyEditMetadata(next, options);
      changes.added.push(change(next, key));
      nextEntries.push({ resource: next as Resource });
      continue;
    }
    previousSupported.delete(key);
    next.id = previous.resource.id;
    next.meta = { ...next.meta, ...previous.resource.meta };
    const isChanged = clinicalValue(next) !== clinicalValue(previous.resource);
    if (isChanged) {
      applyEditMetadata(next, options);
      changes.updated.push(change(next, key));
      nextEntries.push({ ...(previous.fullUrl ? { fullUrl: previous.fullUrl } : {}), resource: next as Resource });
    } else {
      nextEntries.push({ ...(previous.fullUrl ? { fullUrl: previous.fullUrl } : {}), resource: structuredClone(previous.resource) as Resource });
    }
  }

  for (const [key, previous] of previousSupported) {
    changes.removed.push(change(previous.resource, key));
  }

  return {
    ok: true,
    bundle: { resourceType: "Bundle", type: "collection", entry: nextEntries },
    changes,
    report: generated.report,
    compatibility: DENTAL_DE_COMPATIBILITY,
  };
}
