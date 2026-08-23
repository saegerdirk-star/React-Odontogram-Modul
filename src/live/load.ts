// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Bead odontogram-6fi: turning what a server holds for one patient into a
// charted document, plus an honest account of what could not be charted.
//
// `assembleLoadResult` is PURE — it takes resources that have already been
// fetched. `loadPatientChart` is the thin I/O shell around it.
//
// THE PARTITION IS THE POINT. `parseDentalCoreBundle` is all-or-nothing: it
// returns `undefined` for a bundle carrying one resource it does not recognise.
// A practice server carries dental resources in other dialects — the charly
// adapter's `ze-befund` Observations under the full dental IG are this bead's
// named case — so those are separated out BEFORE the codec sees them and are
// listed in the load report with their id and profile. Neither the codec nor
// this module learns to read them: the delta is documented in
// docs/aidbox-live-mode.md, and widening the codec is bead odontogram-wl8.

import type { Bundle } from "fhir/r4";
import type { OdontogramDocument } from "../document";
import { DENTAL_CORE, DENTAL_CORE_BUNDLE_IDENTIFIER, DENTAL_CORE_PROFILES } from "../fhir/dentalCoreContract";
import { parseDentalCoreBundle } from "../fhir/fromFhirDentalCore";
import type { AidboxGateway } from "./aidbox";
import { liveIdPrefix } from "./writePlan";

/** The resource types the scoped machine client may read for a patient's chart. */
export const SEARCHED_RESOURCE_TYPES = ["Observation", "Condition", "ServiceRequest", "CarePlan"] as const;

export interface UnsupportedResource {
  reference: string;
  profile?: string;
  reason: string;
}

export interface LoadReport {
  /** Everything the server handed over, including the patient. */
  fetched: number;
  /** How many of those the Dental Core codec was offered. */
  dentalCore: number;
  /** What was left over, named rather than dropped. */
  unsupported: UnsupportedResource[];
  parsed: boolean;
  error?: string;
}

export interface LoadResult {
  document?: OdontogramDocument;
  bundle: Bundle;
  report: LoadReport;
}

type ResourceRecord = Record<string, unknown> & {
  resourceType?: unknown;
  id?: unknown;
  meta?: { profile?: unknown };
};

const dentalCoreProfiles = new Set<string>(Object.values(DENTAL_CORE_PROFILES));

function profilesOf(resource: ResourceRecord): string[] {
  const profiles = resource.meta?.profile;
  return Array.isArray(profiles) ? profiles.filter((value): value is string => typeof value === "string") : [];
}

/**
 * Which resources the codec is offered.
 *
 * Three admissions, in this order:
 *   1. the patient itself, as the subject anchor every resource is checked against;
 *   2. anything carrying a Dental Core profile;
 *   3. anything carrying NO profile at all whose id this mode minted — the
 *      codec emits its CarePlan and its Condition without a `meta.profile`, and
 *      the deterministic id prefix is what still identifies them as ours.
 *
 * Everything else is foreign. A foreign resource is never guessed at: it is
 * reported with its id and its profile so a reader can see what is missing.
 */
export function partitionResources(patientId: string, resources: ResourceRecord[]): {
  core: ResourceRecord[];
  unsupported: UnsupportedResource[];
} {
  const prefix = liveIdPrefix(patientId);
  const core: ResourceRecord[] = [];
  const unsupported: UnsupportedResource[] = [];
  for (const resource of resources) {
    const resourceType = typeof resource?.resourceType === "string" ? resource.resourceType : "";
    const id = typeof resource?.id === "string" ? resource.id : "";
    const reference = id ? `${resourceType}/${id}` : resourceType || "(unknown resource)";
    const profiles = profilesOf(resource);
    if (!resourceType || !id) {
      unsupported.push({ reference, reason: "The server returned a resource with no type or no id" });
      continue;
    }
    if (resourceType === "Patient") {
      if (id === patientId) core.push(resource);
      else unsupported.push({ reference, reason: "A Patient other than the one being charted" });
      continue;
    }
    if (profiles.some((profile) => dentalCoreProfiles.has(profile))) {
      core.push(resource);
      continue;
    }
    if (profiles.length === 0 && id.startsWith(prefix)) {
      core.push(resource);
      continue;
    }
    unsupported.push({
      reference,
      ...(profiles.length ? { profile: profiles[0] } : {}),
      reason: profiles.length
        ? "The profile is not part of the Dental Core contract this odontogram reads"
        : "No profile, and not a resource this live mode wrote — not part of the Dental Core contract",
    });
  }
  return { core, unsupported };
}

/** Read order for the assembled collection — see the comment in `assembleLoadResult`. */
function loadRank(resource: ResourceRecord): number {
  if (resource.resourceType === "Patient") return 0;
  if (resource.resourceType === "CarePlan") return 1;
  if (resource.resourceType === "ServiceRequest") return 2;
  return 3;
}

export interface AssembleInput {
  patientId: string;
  resources: ResourceRecord[];
}

/** Assemble, parse, and report — without touching a network. */
export function assembleLoadResult({ patientId, resources }: AssembleInput): LoadResult {
  const { core, unsupported } = partitionResources(patientId, resources);
  // ORDER MATTERS, and in exactly two places. The codec reads a collection in
  // ONE pass: the patient has to stand before the findings that reference it,
  // and the CarePlan before the plan-chart Observations, because an Observation
  // is recognised as PLANNED by resolving its `basedOn` against a CarePlan the
  // parser has already seen. A server hands its search results back in whatever
  // order it likes, so the order is restored here.
  const ordered = [...core].sort((left, right) => loadRank(left) - loadRank(right));
  const bundle: Bundle = {
    resourceType: "Bundle",
    type: "collection",
    // The marker says what this collection IS. Without it a chart holding no
    // finding yet carries no admitted profile either, and the codec would
    // decline to read an empty mouth.
    identifier: { system: DENTAL_CORE, value: DENTAL_CORE_BUNDLE_IDENTIFIER },
    entry: ordered.map((resource) => ({ resource: resource as never })),
  };
  const document = parseDentalCoreBundle(bundle) as OdontogramDocument | undefined;
  const report: LoadReport = {
    fetched: resources.length,
    dentalCore: core.length,
    unsupported,
    parsed: document !== undefined,
    ...(document === undefined
      ? { error: "The Dental Core codec rejected the assembled collection, so nothing was charted" }
      : {}),
  };
  return { ...(document ? { document } : {}), bundle, report };
}

/**
 * Read one patient's chart off the server. The patient is read by id first: a
 * patient that is not there is a configuration mistake worth naming, not an
 * empty chart.
 */
export async function loadPatientChart(gateway: AidboxGateway, patientId: string): Promise<LoadResult> {
  const patient = await gateway.readPatient(patientId);
  const subject = `Patient/${patientId}`;
  const found: ResourceRecord[] = patient ? [patient as ResourceRecord] : [];
  for (const resourceType of SEARCHED_RESOURCE_TYPES) {
    const page = await gateway.search(resourceType, { subject });
    found.push(...(page as ResourceRecord[]));
  }
  const result = assembleLoadResult({ patientId, resources: found });
  if (patient) return result;
  return {
    ...result,
    report: { ...result.report, parsed: false, error: `No Patient/${patientId} on this server` },
    document: undefined,
  };
}
