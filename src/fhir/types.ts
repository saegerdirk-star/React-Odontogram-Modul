// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Created by Zoltan Dul (https://github.com/ZoliQua) 2025-2026

import type { Bundle, Observation, Patient, Condition, CodeableConcept, Coding } from "fhir/r4";

export type { Bundle, Observation, Patient, Condition, CodeableConcept, Coding };

/** Per-tooth record as produced by the engine's serializeState(). */
export interface ToothRecord {
  toothSelection?: string;
  endoResection?: boolean;
  mods?: string[];
  periapicalType?: string;
  endo?: string;
  caries?: string[];
  cariesActiveDepth?: number;
  // SP6 Task 1: unified per-surface caries severity (0..6), read as ICDAS on a
  // primary surface and CARS on a recurrent one. Replaces `cariesDepths`.
  cariesSeverity?: Record<string, number>;
  // Retired SP5 fields, still accepted on legacy raw payloads for migration only.
  cariesDepths?: Record<string, number>;
  calculus?: boolean;
  fillingMaterial?: string;
  fillingSurfaces?: string[];
  fillingSurfaceMaterials?: Record<string, string>;
  fissureSealing?: boolean;
  contactMesial?: boolean;
  contactDistal?: boolean;
  wearEdge?: string;
  wearCervical?: string;
  // SP12 Task 1: tooth discoloration foundation (additive; see docs/superpowers
  // SP12 design). Enum axis, no svgLayer — see registry/axes.ts.
  discoloration?: string;
  periImplant?: string;
  // SP-perio PG-C Task 2: two per-tooth categorical DATA axes (payload >=2.14,
  // additive). `cejVisibility` (none|detectable|not-detectable) and
  // `rootConcavity` (none|mild|deep). Omitted entirely when `none` (skipValue),
  // so a tooth that never sets them stays byte-identical. Emitted via the
  // declarative FIELD_MAPPINGS enum path — no svgLayer, no render.
  cejVisibility?: string;
  // Bead odontogram-dma: the retention element holding a removable denture to
  // this tooth, and the side it engages. ONE value, never a set.
  retention?: string;
  retentionSide?: string;
  rootConcavity?: string;
  // SP-perio PG-D Task 3: gingival thickness phenotype (unknown|thin|medium|thick)
  // and Miller recession class (none|i|ii|iii|iv). Declarative enum axes like
  // `cejVisibility`/`rootConcavity` above, and — like them — deliberately NOT
  // projected into the canonical dental-de dialect (bead odontogram-5cz): the
  // IG's alignment matrix records that neither has an automatic migration.
  gingivalThickness?: string;
  millerClass?: string;
  // SP14 Task 1: orthodontic axes foundation (additive; see registry/axes.ts).
  orthoAppliance?: string;
  orthoDrift?: string;
  orthoVertical?: string;
  orthoRotation?: boolean;
  brokenMesial?: boolean;
  brokenIncisal?: boolean;
  brokenDistal?: boolean;
  extractionWound?: boolean;
  extractionPlan?: boolean;
  parapulpalPin?: boolean;
  crownReplace?: boolean;
  crownNeeded?: boolean;
  missingClosed?: boolean;
  bridgePillar?: boolean;
  prosthesis?: string;
  mobility?: string;
  toothSubstrate?: string;
  restorationType?: string;
  restorationMaterial?: string;
  crownLeakage?: boolean;
  // SP4 Task 1: pulp/apical/resorption diagnosis axes — see
  // docs/superpowers/specs/2026-07-13-odontogram-sp4-endo-pulp-diagnosis-design.md.
  // `pulpDx` is rendered/emitted (replaced the retired `pulpInflam` boolean,
  // SP4 Task 3); `pulpLatin`/`apicalDx` are still additive-only scaffolding.
  pulpDx?: string;
  pulpLatin?: string;
  apicalDx?: string;
  resorptionType?: string;
  // `rootCaries` is a normal enum axis. `radiographicDepth` (per-surface
  // none/E1/E2/D1/D2/D3) is a per-surface scalar map, independent of the
  // unified visual severity. `secondaryCaries` is a retired SP5 field, still
  // accepted on legacy raw payloads for migration only (folded into
  // `cariesSeverity` on hydrate).
  rootCaries?: string;
  secondaryCaries?: Record<string, number>;
  radiographicDepth?: Record<string, string>;
  // SP10 Task 1: per-surface filling-defect scalar map (none/marginal/fracture/wear),
  // modeled the same way as `radiographicDepth` above.
  fillingDefect?: Record<string, string>;
  // Bead odontogram-wxt: the surfaces whose finding — a filling, a caries
  // lesion, or both — extends into the cervical region (payload >=2.24).
  // A MEMBERSHIP list over buccal/lingual, present only when non-empty. It is
  // deliberately NOT a sixth surface: the cervix is a marker on an existing
  // surface (BEMA's "vz"/"lz" suffix), so it must never be counted into
  // `fillingSurfaceMaterials`, which is what a position tier reads.
  cervicalSurfaces?: string[];
  // SP-perio P1 Task 1: per-site periodontal probing data (payload >=2.12).
  // Present only when at least one of the 6 sites (PERIO_SITES in
  // odontogram.ts) is charted — omitted entirely otherwise. `pd` (probing
  // depth, mm) is the charting key: a site absent from `pd` is "not
  // charted", never zero. `gm` (gingival margin offset, mm; signed) defaults
  // to 0 when a charted site has no entry. CAL (pd + gm) is always derived,
  // never stored here. SP-perio P1 Task 3: emitted by FHIR EXPORT as a
  // periodontal-panel Observation (LOINC 74029-0) with per-site components —
  // see toFhirPerio.ts, called from buildFhirBundle() (toFhir.ts). FHIR
  // IMPORT (fromFhir.ts/registry/fromFhir.ts) does not read it back yet —
  // still JSON-payload-only round-trip until a later task.
  perio?: {
    pd: Record<string, number>;
    gm: Record<string, number>;
    bop: string[];
    sup: string[];
  };
  // SP-perio P2b Task 2: per-entrance Glickman furcation involvement grade
  // (I-IV, stored as integer 1-4; payload >=2.13). Present only when at
  // least one entrance is graded — omitted entirely otherwise. Entrance keys
  // are "mesial"/"distal"/"buccal"/"lingual"; the SET of entrances a given
  // tooth actually offers is position-dependent (`furcationEntrances()` in
  // odontogram.ts — upper molars have 3, lower molars 2, upper 1st
  // premolars 2, everything else 0). Emitted by FHIR EXPORT as additional
  // components (LOINC 34015-8) on the SAME periodontal-panel Observation
  // `perio` above uses (LOINC 74029-0) — see toFhirPerio.ts. FHIR IMPORT
  // does not read it back yet, same as `perio`.
  furcation?: Record<string, number>;
  // SP-perio P2b Task 3: O'Leary plaque-index per-surface presence (payload
  // >=2.13, additive — no version bump for this task). Present only when at
  // least one of the 4 fixed surfaces ("mesial"/"distal"/"buccal"/"lingual"
  // — the SAME set for every tooth, unlike `furcation`'s position-gated
  // entrance set) has plaque — omitted entirely otherwise. Membership in
  // this array means "plaque present on that surface"; a surface's absence
  // means "clean/not recorded" (never a stored false). Emitted by FHIR
  // EXPORT as additional boolean components on the SAME periodontal-panel
  // Observation `perio`/`furcation` above use — see toFhirPerio.ts. There is
  // no verified per-surface O'Leary LOINC code, so each component carries no
  // LOINC coding (engine-local code only), same treatment per-site BOP
  // already gets. FHIR IMPORT does not read it back yet, same as
  // `perio`/`furcation`.
  plaque?: string[];
  // SP-perio PG-D Task 1: Silness-Löe Plaque Index (`pi`) and Löe-Silness
  // Gingival Index (`gi`) — per-surface GRADED indices (1-3; payload >=2.15,
  // additive). Present only when at least one of the 4 fixed surfaces
  // ("mesial"/"distal"/"buccal"/"lingual" — the SAME set `plaque` uses) is
  // graded — omitted entirely otherwise. A surface absent from the record
  // means grade 0 (healthy), never a stored 0. Deliberately SEPARATE from
  // the O'Leary `plaque` boolean above (different clinical instrument; a
  // tooth can carry both independently). Emitted by FHIR EXPORT as
  // additional integer components on the SAME periodontal-panel Observation
  // `perio`/`furcation`/`plaque` above use — see toFhirPerio.ts. There is no
  // dedicated LOINC for either index, so each component carries no LOINC
  // coding (engine-local code only), same treatment per-site BOP and
  // per-surface plaque already get. FHIR IMPORT does not read it back yet,
  // same as `perio`/`furcation`/`plaque`.
  pi?: Record<string, number>;
  gi?: Record<string, number>;
  // SP-perio PG-D Task 2: keratinized gingiva width — a single per-tooth
  // BUCCAL mm scalar (integer 0-15; payload >=2.15, additive — no version
  // bump, Task 1 already bumped to 2.15). Present only when charted —
  // omitted entirely otherwise (never a stored 0 vs "uncharted" ambiguity).
  // Deliberately NOT per-site/per-surface unlike pi/gi/perio above. Emitted
  // by FHIR EXPORT as one additional valueQuantity (mm) component on the
  // SAME periodontal-panel Observation — see toFhirPerio.ts. No dedicated
  // LOINC, engine-local finding code only. FHIR IMPORT does not read it back
  // yet, same as perio/furcation/plaque/pi/gi.
  kg?: number;
  // SP-perio PG-E Task 1: peri-implant Mombelli indices — modified plaque
  // index (`mpi`) and modified sulcus bleeding index (`mbi`) — per-surface
  // GRADED (1-3; payload >=2.16, additive). Same shape/semantics as `pi`/`gi`
  // above (SAME 4 fixed surfaces, absence = grade 0/healthy, no dedicated
  // LOINC — engine-local components on the SAME periodontal-panel
  // Observation, see toFhirPerio.ts), but IMPLANT-ONLY: the setter is a
  // no-op on any tooth that isn't `toothSelection === "implant"` (enforced
  // at the odontogram.ts API layer, not by this type or FHIR export/import).
  // FHIR IMPORT does not read it back yet, same as pi/gi/perio/furcation/plaque.
  mpi?: Record<string, number>;
  mbi?: Record<string, number>;
  customStates?: Record<string, unknown>;
  note?: string;
}

/** The serialized odontogram export payload (matches exportStatus()'s object).
 *  `plan` (R2-A Task 2, payload >=2.11) is additive: present only when the
 *  PLAN chart has been initialized and differs from `teeth` (the STATUS
 *  chart, always the primary/required field). FHIR export/import (toFhir.ts/
 *  fromFhir.ts) reads only `teeth`/`globals` and ignores `plan` — the plan
 *  layer round-trips through the JSON payload only, not FHIR. */
export interface OdontogramExportPayload {
  version: string;
  globals?: Record<string, boolean>;
  teeth: Record<string, ToothRecord>;
  plan?: Record<string, ToothRecord>;
  case?: {
    age?: number;
    smokingStatus?: string;
    cigarettesPerDay?: number;
    diabetesStatus?: string;
    hba1c?: number;
    toothLossPerio?: number;
    maxRblPercent?: number;
    /** P4b Task 2: per-axis clinician overrides for the 2017 World Workshop
     *  periodontal classification (see `getPerioClassification()` in
     *  odontogram.ts) — one of the concrete enum values for that axis, or
     *  omitted when not overridden. */
    diagnosisOverride?: string;
    stageOverride?: string;
    gradeOverride?: string;
    extentOverride?: string;
    /** UI-3b/2.2.1 report identity. `patientName` and `patientDob` are NEVER
     *  emitted to FHIR; `examDate` (ISO `YYYY-MM-DD`) is the document's own
     *  observation time and is used as the canonical dialect's
     *  `Observation.effectiveDateTime` when the caller supplies none. */
    patientName?: string;
    patientDob?: string;
    examDate?: string;
  };
  /** Bead odontogram-2vd: WHICH examination this document is. Opaque
   *  host-owned identity strings plus an ISO effective date/date-time; absent
   *  entirely when no field is recorded (every document written before payload
   *  2.21). Distinct from `case.examDate`, which stays the PDF report header's
   *  date; `examination.effectiveDateTime` is the examination's clinical
   *  effective time and takes precedence where both are available. */
  examination?: ExaminationContextRecord;
  /** Bead odontogram-2vd: previously captured examinations, oldest first. Each
   *  entry is an INDEPENDENT dated snapshot of the whole-mouth findings — it is
   *  never a `plan`, and `plan` is never history. Absent when none was
   *  captured. */
  examinations?: ExaminationSnapshotRecord[];
}

/** Serialized examination identity/context (omit-when-empty per field). */
export interface ExaminationContextRecord {
  id?: string;
  subject?: string;
  effectiveDateTime?: string;
  performer?: string;
  recorder?: string;
  encounter?: string;
  previousExaminationId?: string;
}

/** One archived examination: its own identity/context plus the whole-mouth
 *  findings and case context as they stood when it was captured. */
export interface ExaminationSnapshotRecord {
  examination: ExaminationContextRecord;
  /** Whole-mouth flags as they stood at capture time — notably the clinical
   *  `edentulous` finding, which is not per-tooth state. */
  globals: Record<string, boolean>;
  teeth: Record<string, ToothRecord>;
  case?: OdontogramExportPayload["case"];
}

/** The payload/document version this engine writes. Readers accept every
 *  earlier version (1.4 upwards) — see `isLegacyPayloadVersion()` and the
 *  per-axis hydration defaults in `odontogram.ts`. */
// 2.22 (odontogram-8vu): additive - `toothSelection` gains "not-erupted" for a
// position whose tooth has not erupted, distinct from "none", which means the
// tooth is missing. Nothing wrote the value before, so an older document is
// unaffected and needs no migration.
// 2.25 (odontogram-dma): additive - `retention` (none/clasp/attachment/
// bar-abutment) and `retentionSide`, what holds a removable denture to a
// natural tooth. Both omit-when-none, so a chart with no removable work is
// byte-identical apart from this version string.
// 2.24 (odontogram-wxt): additive - `cervicalSurfaces`, the surfaces whose
// filling or caries lesion extends into the cervical region. Omitted entirely
// when empty, so a document that never records it is byte-identical apart from
// this version string, and an older document needs no migration.
export const PAYLOAD_VERSION = "2.25";

/**
 * The UI-domain document (bead odontogram-3l1, AC2/AC4).
 *
 * This is the contract a host application owns: a versioned, JSON-serializable
 * snapshot of the editor's clinical state, structurally identical to what
 * `exportStatus()` writes and `importStatus()` reads. React state stays this
 * document; FHIR is a pure, optional projection of it produced by
 * {@link buildFhirBundle} and read back by `parseFhirBundle`.
 *
 * Deliberately an ALIAS of {@link OdontogramExportPayload} rather than a new
 * shape: every payload a consumer has already stored is already a valid
 * document, so adopting the controlled surface requires no migration.
 */
export type OdontogramDocument = OdontogramExportPayload;

/**
 * Which FHIR representation {@link buildFhirBundle} produces.
 *
 * - `"legacy"` (DEFAULT) — the engine-local representation this repository has
 *   always emitted. Kept as the default so existing consumers and stored
 *   bundles are unaffected; it is also the only dialect the round-trip golden
 *   fixtures describe.
 * - `"dental-de"` — canonical `fhir-dental-de` profiles, component slices and
 *   extensions. Opt-in, additive, and never emits an engine-local code as if it
 *   were canonical terminology.
 *
 * `parseFhirBundle` needs no dialect: it reads BOTH, including a bundle that
 * mixes them.
 */
export type FhirDialect = "legacy" | "dental-de";

/** Options for buildFhirBundle / exportFhir. */
export interface FhirExportOptions {
  /**
   * FHIR reference string for the subject, e.g. "Patient/123".
   * When omitted, a placeholder Patient resource is added to the Bundle and
   * referenced by every Observation.
   */
  subject?: string;
  /**
   * Target FHIR representation. Defaults to `"legacy"` — see {@link FhirDialect}.
   */
  dialect?: FhirDialect;
  /**
   * `Observation.effective[x]` for the canonical dialect, which requires it
   * (`DentalFindingDE.effective[x] 1..1`). An explicit ISO date/dateTime keeps
   * the conversion PURE — the adapter never reads the wall clock. When omitted,
   * the document's `case.examDate` is used; when that is absent too, the
   * observations carry no effective time and the omission is reported.
   */
  effectiveDateTime?: string;
}

/**
 * One editor concept the canonical `fhir-dental-de` conversion could not emit
 * as a coded value. Reported rather than silently dropped or silently coerced
 * (bead odontogram-3l1 compatibility strategy).
 */
export interface DentalDeConversionEntry {
  /** FDI position, or `"*"` for a document-level concern. */
  tooth: string;
  /** The engine field the value came from. */
  field: string;
  /** The engine value, preserved verbatim in the UI-domain document. */
  value: string;
  /** Why it could not be emitted as a coded canonical value. */
  reason: string;
}

/**
 * What the canonical conversion did with the parts of the document the IG does
 * not give a coded value for.
 *
 * - `textFallback` — emitted canonically as `CodeableConcept.text` under an
 *   EXTENSIBLE binding. This is the IG's own sanctioned pattern; the source
 *   assessment is preserved exactly and no code is invented.
 * - `unmapped` — not emitted at all, because the target element has a REQUIRED
 *   binding with no matching concept, or the IG routes the concept to a
 *   resource this adapter does not build. The value stays in the UI-domain
 *   document and round-trips through JSON.
 */
export interface DentalDeConversionReport {
  textFallback: DentalDeConversionEntry[];
  unmapped: DentalDeConversionEntry[];
}
