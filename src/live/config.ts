// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Bead odontogram-6fi: live-mode configuration.
//
// DOM-free and dependency-free on purpose — the resolution takes the
// environment record and the query string as ARGUMENTS rather than reading
// `import.meta.env` and `location.search` itself, so the precedence rule is
// testable without a browser and without a build-time environment.
//
// The library itself never sees this module: it lives under `src/live`, which
// is neither reachable from `src/index.ts` nor part of the published artifact.

/** The Vite environment keys the live mode reads. All are optional at the type level. */
export interface LiveEnv {
  VITE_AIDBOX_BASE_URL?: string;
  VITE_AIDBOX_CLIENT_ID?: string;
  VITE_AIDBOX_CLIENT_SECRET?: string;
  VITE_DEFAULT_PATIENT_ID?: string;
}

/** A complete live-mode configuration: a server, a scoped machine client, a patient. */
export interface LiveConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  patientId: string;
}

/**
 * Either a usable configuration, or the list of what has to be supplied first.
 *
 * Deliberately ONE shape with optional members rather than a discriminated
 * union: this repository compiles with `strict: false`, where a `ok: true` /
 * `ok: false` literal discriminant does not narrow.
 */
export interface LiveConfigResult {
  ok: boolean;
  config?: LiveConfig;
  /** Empty when `ok`. Names every missing key at once when not. */
  missing: string[];
  /** Present but unusable — a value that is there and still cannot be used. */
  invalid: string[];
}

/**
 * The FHIR id grammar, `[A-Za-z0-9-.]{1,64}`.
 *
 * Checked BEFORE anything is requested, because the patient id goes straight
 * into a request path: `../../admin/console` escapes `/fhir` altogether and
 * carries the Basic credential with it. A path is not the place to discover
 * that an id was never an id.
 */
const FHIR_ID = /^[A-Za-z0-9.-]{1,64}$/;

/** The label used for the patient, which has two sources and therefore two names. */
export const PATIENT_CONFIG_LABEL = "VITE_DEFAULT_PATIENT_ID (or ?patient=<id>)";

/** A value that is only whitespace is not a value — it is a missing one. */
function cleaned(value: string | undefined): string | undefined {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * The patient the live mode charts. The URL wins over the environment: the
 * environment default is what a developer starts with, the URL is what they
 * asked for on this load.
 */
export function resolvePatientId(env: LiveEnv, search: string): string | undefined {
  const fromUrl = cleaned(new URLSearchParams(search).get("patient") ?? undefined);
  return fromUrl ?? cleaned(env.VITE_DEFAULT_PATIENT_ID);
}

/**
 * Resolve the whole configuration, naming every missing piece at once. A live
 * mode with half a configuration must not boot: the missing half is a server
 * URL or a credential, and guessing either writes patient data somewhere
 * nobody named.
 */
export function resolveLiveConfig(env: LiveEnv, search: string): LiveConfigResult {
  const baseUrl = cleaned(env.VITE_AIDBOX_BASE_URL)?.replace(/\/+$/, "");
  const clientId = cleaned(env.VITE_AIDBOX_CLIENT_ID);
  const clientSecret = cleaned(env.VITE_AIDBOX_CLIENT_SECRET);
  const patientId = resolvePatientId(env, search);
  const missing: string[] = [];
  const invalid: string[] = [];
  if (!baseUrl) missing.push("VITE_AIDBOX_BASE_URL");
  if (!clientId) missing.push("VITE_AIDBOX_CLIENT_ID");
  if (!clientSecret) missing.push("VITE_AIDBOX_CLIENT_SECRET");
  if (!patientId) missing.push(PATIENT_CONFIG_LABEL);
  else if (!FHIR_ID.test(patientId)) {
    invalid.push(`The patient id "${patientId}" is not a FHIR id (${FHIR_ID.source}) and is refused before any request`);
  }
  if (missing.length || invalid.length) return { ok: false, missing, invalid };
  return { ok: true, missing: [], invalid: [], config: { baseUrl, clientId, clientSecret, patientId } };
}
