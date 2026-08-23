// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Bead odontogram-6fi: turning the charted document into an ordered list of
// single-resource writes.
//
// PURE — no transport, no clock, no randomness. The executor in `./save.ts`
// runs what this returns; everything that decides WHAT is written and under
// WHICH id is decided here, so a re-save can be proved idempotent by a test
// instead of by watching a server.
//
// THE IDS ARE DERIVED, NEVER MINTED. `buildDentalCoreBundle` already owns a
// resource-identity mechanism: `payload.fhirIdentity.resources[key]` keyed by a
// stable key such as `Observation/tooth-state/16`, and `parseDentalCoreBundle`
// captures exactly those keys back off a bundle. So the plan builds the bundle
// once to LEARN its keys through the codec's own parser, derives one
// deterministic id per key, and builds again with those ids in place. No second
// copy of the codec's key scheme lives here — the codec tells us its keys.
//
// The transport SPI carries no transaction bundle and no PATCH, which is why
// this is a list of single-resource PUTs rather than one bundle POST. The
// consequence is honest and documented in docs/aidbox-live-mode.md: a failure
// halfway through leaves the earlier resources written.

import type { Bundle, BundleEntry, Resource } from "fhir/r4";
import type { DentalCoreResourceIdentity, OdontogramDocument } from "../document";
import { buildDentalCoreBundle } from "../fhir/toFhirDentalCore";
import { parseDentalCoreBundle } from "../fhir/fromFhirDentalCore";

/**
 * The resource types the scoped machine client may write. It mirrors the
 * Aidbox AccessPolicy for `odontogram-live` exactly — Patient is readable but
 * deliberately never written here, since the odontogram does not own the
 * patient record.
 */
export const WRITABLE_RESOURCE_TYPES = ["Observation", "Condition", "ServiceRequest", "CarePlan"] as const;

export type WritableResourceType = (typeof WRITABLE_RESOURCE_TYPES)[number];

/** A single-resource create-or-update. `path` is relative to the FHIR base URL. */
export interface WriteOp {
  method: "PUT";
  path: string;
  resourceType: string;
  id: string;
  identityKey: string;
  resource: Resource;
  /** A first, deliberately incomplete write that exists only to break a reference cycle. */
  bootstrap?: true;
}

/** A resource the codec emitted that this client is not allowed (or able) to write. */
export interface SkippedResource {
  resourceType: string;
  identityKey: string;
  reason: string;
}

export interface WritePlan {
  ops: WriteOp[];
  skipped: SkippedResource[];
}

export interface WritePlanInput {
  document: OdontogramDocument;
  patientId: string;
  /** The examination date the whole write is stamped with. Passed IN — a plan that reads the clock is untestable. */
  effectiveDateTime: string;
}

/** Raised when the codec cannot read back the bundle it just wrote, so no key scheme can be learned. */
export class WritePlanIdentityError extends Error {
  constructor() {
    super("Dental Core resource identities could not be resolved for this chart, so no stable write plan exists");
    this.name = "WritePlanIdentityError";
  }
}

/**
 * Write order. A resource is written after everything it REFERENCES, because a
 * server that enforces referential integrity (Aidbox does) rejects a PUT naming
 * a resource that is not there yet.
 *
 * The plan resources reference each other in a CYCLE: the CarePlan lists its
 * ServiceRequests in `activity`, and each planned ServiceRequest is `basedOn`
 * that same CarePlan. No ordering resolves a cycle, and the transport SPI
 * offers neither a transaction bundle nor PATCH — so the CarePlan is written
 * TWICE: once bare (it then references only the patient), and once complete
 * after its activities exist. See `bootstrapCarePlan` below.
 */
const WRITE_ORDER = ["Patient", "Device", "Procedure", "ServiceRequest", "CarePlan", "Observation", "Condition", "Provenance"];

const FHIR_ID_MAX = 64;

/** The prefix every id this mode mints carries, so a loader can recognise its own profile-less resources. */
export function liveIdPrefix(patientId: string): string {
  return `odo-${patientToken(patientId)}-`;
}

/**
 * The patient's share of an id, BOUNDED. A practice system may hand out a
 * patient identifier longer than a whole FHIR id, and a prefix that no longer
 * fits is a prefix the loader can no longer recognise — so a long one is
 * shortened deterministically rather than truncating the key behind it.
 */
function patientToken(patientId: string): string {
  const value = slug(patientId);
  return value.length <= 24 ? value : `${value.slice(0, 15)}-${shortHash(patientId)}`;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** FNV-1a, 32 bit — a short, stable discriminator for a key too long to spell out. */
function shortHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/**
 * One id per patient and identity key, readable where it fits and hashed where
 * it does not. A FHIR id is at most 64 characters, so a long key is truncated
 * and discriminated by a hash of the WHOLE key — two keys sharing a truncated
 * head still differ.
 */
export function deterministicResourceId(patientId: string, identityKey: string): string {
  const prefix = liveIdPrefix(patientId);
  const body = slug(identityKey);
  const plain = `${prefix}${body}`;
  if (plain.length <= FHIR_ID_MAX) return plain;
  const suffix = `-${shortHash(identityKey)}`;
  const room = Math.max(0, FHIR_ID_MAX - prefix.length - suffix.length);
  return `${prefix}${body.slice(0, room).replace(/-+$/, "")}${suffix}`;
}

/** The codec's own key scheme, learned by parsing the bundle it just produced. */
function identityKeysOf(bundle: Bundle): Map<string, string> {
  const parsed = parseDentalCoreBundle(bundle);
  const resources = parsed?.fhirIdentity?.resources;
  if (!resources) throw new WritePlanIdentityError();
  const byFullUrl = new Map<string, string>();
  for (const [key, identity] of Object.entries(resources)) {
    if (identity.fullUrl) byFullUrl.set(identity.fullUrl, key);
  }
  return byFullUrl;
}

function entryResourceType(entry: BundleEntry): string {
  return entry.resource?.resourceType ?? "";
}

function rank(resourceType: string): number {
  const index = WRITE_ORDER.indexOf(resourceType);
  return index === -1 ? WRITE_ORDER.length : index;
}

/**
 * Derive the ordered writes for a document.
 *
 * The bundle is built TWICE on purpose: once to learn the codec's identity
 * keys, once with a deterministic id resolved for every one of them. The second
 * build is what is written — its cross-resource references are then plain
 * `Type/id`, which is what a reader on the server can follow.
 */
export function buildWritePlan({ document, patientId, effectiveDateTime }: WritePlanInput): WritePlan {
  const options = { subject: `Patient/${patientId}`, effectiveDateTime };
  // The probe is built WITHOUT the document's own identities on purpose: an
  // entry that already carries a server id carries no generated fullUrl, and
  // the key map is read off those fullUrls. Stripping them first makes every
  // key visible; the known ids are merged back in below.
  const anonymous: OdontogramDocument = { ...document };
  delete anonymous.fhirIdentity;
  const probe = buildDentalCoreBundle(anonymous, options);
  if (!probe.entry?.length) return { ops: [], skipped: [] };
  const keysByFullUrl = identityKeysOf(probe);

  // Existing ids win: they came off the server on the last load, and a live
  // mode that renamed them would orphan the resources it read a moment ago.
  const known = document.fhirIdentity?.resources ?? {};
  const resources: Record<string, DentalCoreResourceIdentity> = {};
  const keyById = new Map<string, string>();
  for (const key of keysByFullUrl.values()) {
    // Only the id travels. The server owns `versionId`, and echoing a stale one
    // back into a PUT body asserts a version this client cannot vouch for.
    const id = known[key]?.id ?? deterministicResourceId(patientId, key);
    resources[key] = { id };
    keyById.set(`${key.split("/", 1)[0]}/${id}`, key);
  }

  const bundle = buildDentalCoreBundle({ ...document, fhirIdentity: { resources } }, options);
  const entries = [...(bundle.entry ?? [])].sort((left, right) => {
    const byRank = rank(entryResourceType(left)) - rank(entryResourceType(right));
    return byRank !== 0 ? byRank : String(left.resource?.id ?? "").localeCompare(String(right.resource?.id ?? ""));
  });

  const ops: WriteOp[] = [];
  const skipped: SkippedResource[] = [];
  for (const entry of entries) {
    const resource = entry.resource;
    if (!resource) continue;
    const resourceType = resource.resourceType;
    const id = resource.id;
    const identityKey = id ? keyById.get(`${resourceType}/${id}`) ?? "" : "";
    if (!id || !identityKey) {
      skipped.push({
        resourceType,
        identityKey,
        reason: "The Dental Core codec assigned this resource no stable identity, so it cannot be written under a repeatable id",
      });
      continue;
    }
    if (!(WRITABLE_RESOURCE_TYPES as readonly string[]).includes(resourceType)) {
      skipped.push({
        resourceType,
        identityKey,
        reason: `${resourceType} is outside the scoped machine client's write policy (${WRITABLE_RESOURCE_TYPES.join(", ")})`,
      });
      continue;
    }
    ops.push({ method: "PUT", path: `/${resourceType}/${id}`, resourceType, id, identityKey, resource });
  }
  const resolved = withResolvableReferences(ops, skipped, patientId);
  const bootstrap = bootstrapCarePlan(resolved.ops);
  return { ops: bootstrap ? [bootstrap, ...resolved.ops] : resolved.ops, skipped: resolved.skipped };
}

/** Every `reference` string anywhere inside a resource, at any depth. */
function referencesOf(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(referencesOf);
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const own = typeof record.reference === "string" ? [record.reference] : [];
  return [...own, ...Object.values(record).flatMap(referencesOf)];
}

/**
 * Drop every op that names a resource nobody writes.
 *
 * Aidbox enforces referential integrity, so such an op is rejected — and it is
 * rejected IN THE MIDDLE of the sequence, after earlier resources are already
 * on the server. Planning it means every save of that chart half-fails.
 *
 * The real case is the peri-implant finding: `toFhirDentalCore` gives it an
 * unconditional `focus` on the tooth's implant `Device`, and a Device is
 * outside this client's write policy — so the finding must follow the Device
 * into `skipped`. It also covers the reference the codec mints for a Device it
 * never emits (a peri-implant finding on an implant with no charted product),
 * which resolves to nothing at all.
 *
 * Dropping one op can strand another, so this runs to a fixpoint. The patient
 * is the one reference that needs no op: it lives on the server already and
 * this odontogram does not own it.
 *
 * NOT a codec change. The bundle `src/fhir` produces is untouched; what this
 * decides is only which of its resources this scoped client can carry.
 */
function withResolvableReferences(ops: WriteOp[], skipped: SkippedResource[], patientId: string): WritePlan {
  const carried = [...ops];
  const dropped = [...skipped];
  for (;;) {
    const written = new Set([`Patient/${patientId}`, ...carried.map((op) => `${op.resourceType}/${op.id}`)]);
    const index = carried.findIndex((op) =>
      referencesOf(op.resource).some((reference) => !written.has(reference)));
    if (index === -1) return { ops: carried, skipped: dropped };
    const [op] = carried.splice(index, 1);
    const unresolved = referencesOf(op.resource).filter((reference) => !written.has(reference));
    dropped.push({
      resourceType: op.resourceType,
      identityKey: op.identityKey,
      reason: `References ${unresolved.join(", ")}, which this client does not write — the server would reject the write`,
    });
  }
}

/**
 * The bare first write of a CarePlan that carries activities.
 *
 * It goes FIRST of everything, which it can: without `activity` a CarePlan
 * references nothing but the patient. Its ServiceRequests then have something
 * to be `basedOn`, and the complete CarePlan follows them.
 *
 * A re-save repeats both writes, so the end state is the same one every time —
 * the plan stays idempotent. What it is NOT is atomic: between the two writes
 * the CarePlan on the server briefly lists no activity. That is the same
 * partial-state window every single-resource write in this plan has, and it is
 * documented rather than hidden (docs/aidbox-live-mode.md).
 */
function bootstrapCarePlan(ops: WriteOp[]): WriteOp | undefined {
  const carePlan = ops.find((op) => op.resourceType === "CarePlan");
  if (!carePlan) return undefined;
  const { activity, ...bare } = carePlan.resource as Resource & { activity?: unknown[] };
  if (!Array.isArray(activity) || activity.length === 0) return undefined;
  return { ...carePlan, resource: bare as Resource, bootstrap: true };
}
