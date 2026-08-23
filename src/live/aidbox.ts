// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Bead odontogram-6fi: the ONLY module in this repository that talks to a
// server. It lives under `src/live`, which the library entry point cannot
// reach and the published artifact does not contain — the odontogram itself
// stays free of transport, exactly as bead odontogram-3l1 fixed it.
//
// WHICH FACTORY, AND WHY. `@polaris/sdk/fhir` re-exports a `createFhirDeClient`
// that performs an ADR-027 de-identification IG drift check at boot by reading
// `/ImplementationGuide`. The `odontogram-live` machine client is scoped by
// AccessPolicy to Patient/Observation/Condition/ServiceRequest/CarePlan and
// cannot read that endpoint, so the SDK facade cannot boot against it — and
// widening the client to admin scope is exactly what this bead forbids. The
// base factory in `@polaris/fhir-de` performs no boot call and is used instead;
// the transport SPI, `createFetchTransport` and `extractNextPageUrl` are the
// same code either way.

import { createFetchTransport, createFhirDeClient, extractNextPageUrl } from "@polaris/fhir-de";
import type { FhirTransport } from "@polaris/fhir-de";
import type { LiveConfig } from "./config";

/** Aidbox's FHIR endpoint sits under `/fhir` on the configured base URL. */
export function fhirBaseUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/fhir`;
}

/**
 * HTTP Basic, from the scoped machine client's id and secret. The credentials
 * come from the developer's `.env` (git-ignored) — never from a checked-in
 * file, and never from an admin account.
 */
export function basicAuthorization(clientId: string, clientSecret: string): string {
  // UTF-8 FIRST, then base64. `btoa` takes Latin-1 and throws an opaque
  // InvalidCharacterError on anything else — a secret with one non-Latin-1
  // character would fail as "live mode is broken" rather than as "this
  // credential needs encoding".
  const bytes = new TextEncoder().encode(`${clientId}:${clientSecret}`);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  const encode = typeof btoa === "function"
    ? btoa
    : (value: string) => Buffer.from(value, "binary").toString("base64");
  return `Basic ${encode(binary)}`;
}

export function createAidboxTransport(config: LiveConfig): FhirTransport {
  return createFetchTransport({
    baseUrl: fhirBaseUrl(config.baseUrl),
    headers: { Authorization: basicAuthorization(config.clientId, config.clientSecret) },
  });
}

/** How many pages a single search will follow before giving up. */
export const DEFAULT_MAX_PAGES = 50;

interface SearchPage {
  entry?: Array<{ resource?: unknown }>;
  link?: Array<{ relation?: string; url?: string }>;
}

export interface PagedSearchResult {
  resources: unknown[];
  /** The budget ran out with a next link still offered — the result is PARTIAL. */
  truncated: boolean;
}

/**
 * Read EVERY page of a search. A loader that stops after the first page shows a
 * partial mouth and says nothing about it, which reads as a chart rather than
 * as a truncated one. The page budget guards against a server whose next link
 * points at itself.
 *
 * Hitting that budget is REPORTED, not swallowed: the caller carries
 * `truncated` into the load report, so a partial read is never displayed as a
 * whole chart. The same silence this function exists to prevent must not come
 * back in through its own guard.
 */
export async function searchAllPages(
  transport: FhirTransport,
  resourceType: string,
  query: Record<string, string | string[]>,
  maxPages: number = DEFAULT_MAX_PAGES,
): Promise<PagedSearchResult> {
  const resources: unknown[] = [];
  let path = `/${resourceType}`;
  let pageQuery: Record<string, string | string[]> | undefined = query;
  for (let page = 0; page < maxPages; page += 1) {
    const bundle = (await transport.request("GET", path, pageQuery ? { query: pageQuery } : undefined)) as SearchPage | null;
    for (const entry of bundle?.entry ?? []) {
      if (entry?.resource) resources.push(entry.resource);
    }
    const next = extractNextPageUrl(bundle ?? undefined);
    if (!next) return { resources, truncated: false };
    path = next.startsWith("/") ? next : `/${next}`;
    pageQuery = undefined;
  }
  return { resources, truncated: true };
}

/** The read/write surface the live mode needs, and nothing beyond it. */
export interface AidboxGateway {
  readPatient(patientId: string): Promise<Record<string, unknown> | null>;
  search(resourceType: string, query: Record<string, string | string[]>): Promise<PagedSearchResult>;
  put(path: string, resource: unknown): Promise<unknown>;
  delete(path: string): Promise<unknown>;
}

/**
 * A pass-through "profile" so the typed `ResourceClient` can be used for the
 * one resource this mode reads by id. The Dental Core resources have their own
 * generated profile classes in `src/fhir/generated`, which are not shaped like
 * the SDK's `ProfileClass` — mapping them would be a second codec, so the raw
 * resource is what travels and `src/fhir` stays the only interpreter.
 */
const PassThroughPatient = {
  canonicalUrl: "http://hl7.org/fhir/StructureDefinition/Patient",
  from: (resource: { resourceType: string; id?: string }) => resource,
  createResource: () => ({ resourceType: "Patient" }),
};

export function createAidboxGateway(config: LiveConfig, transport: FhirTransport = createAidboxTransport(config)): AidboxGateway {
  const client = createFhirDeClient({ baseUrl: fhirBaseUrl(config.baseUrl), transport });
  const patients = client.forProfile(PassThroughPatient, "Patient");
  return {
    // `read` answers null on 404 — a patient id that does not exist is a
    // configuration mistake to report, not an exception to crash on.
    readPatient: async (patientId) => (await patients.read(patientId)) as Record<string, unknown> | null,
    search: (resourceType, query) => searchAllPages(transport, resourceType, query),
    put: (path, resource) => transport.request("PUT", path, { body: resource }),
    delete: (path) => transport.request("DELETE", path),
  };
}
