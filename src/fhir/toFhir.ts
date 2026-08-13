// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Created by Zoltan Dul (https://github.com/ZoliQua) 2025-2026

import type { Bundle, OdontogramExportPayload, FhirExportOptions } from "./types";
import { buildFhirBundleFromRegistry } from "../registry/fhir";
import { appendPerioObservations, appendPerioCondition } from "./toFhirPerio";
import { buildDentalDeBundle } from "./toFhirDentalDe";
import { buildDentalCoreBundle } from "./toFhirDentalCore";

/**
 * Convert a serialized odontogram payload into a FHIR R4 collection Bundle.
 * Pure: no DOM, no network. Tolerant of malformed input (never throws).
 *
 * SP-perio P1 Task 3: per-site periodontal probing (`ToothRecord.perio`)
 * does not fit the registry's one-field-per-tooth axis shape, so it is
 * appended by a bespoke builder (`appendPerioObservations`, toFhirPerio.ts)
 * AFTER the registry-driven per-tooth Observations below — a tooth with no
 * charted perio sites contributes nothing, so payloads without perio data
 * (including every existing parity fixture) are unaffected.
 *
 * SP-perio P4b Task 3: the engine's first FHIR Condition — the 2017 World
 * Workshop periodontitis/gingivitis diagnosis (ICD-10/BNO K05) — is appended
 * AFTER `appendPerioObservations` by `appendPerioCondition` (same file). A
 * payload whose final classification is "health" contributes nothing, so
 * every existing parity fixture (none of which derives a periodontal
 * diagnosis) is unaffected.
 *
 * Bead odontogram-3l1: `options.dialect` selects the representation. It
 * DEFAULTS to `"legacy"` — the shape described above and frozen in the
 * round-trip goldens — so no existing consumer or stored bundle is affected.
 * `"dental-de"` produces canonical `fhir-dental-de` profiles instead; use
 * {@link buildDentalDeBundle} directly when you also want the conversion
 * report naming everything the IG has no coded value for.
 */
export function buildFhirBundle(payload: OdontogramExportPayload, options: FhirExportOptions = {}): Bundle {
  if (options.dialect === "dental-de") return buildDentalDeBundle(payload, options).bundle;
  if (options.dialect === "dental-core") return buildDentalCoreBundle(payload, options);
  const bundle = buildFhirBundleFromRegistry(payload, options);
  appendPerioObservations(bundle, payload, options);
  appendPerioCondition(bundle, payload, options);
  return bundle;
}
