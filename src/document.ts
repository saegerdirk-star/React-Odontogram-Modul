// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Created by Zoltan Dul (https://github.com/ZoliQua) 2025-2026
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026

import type { ImplantProduct } from "./implantProduct";

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
  rootConcavity?: string;
  // SP-perio PG-D Task 3: gingival thickness phenotype (unknown|thin|medium|thick)
  // and Miller recession class (none|i|ii|iii|iv). Declarative enum axes like
  // `cejVisibility`/`rootConcavity` above, and — like them — deliberately NOT
  // represented only when Dental Core has a generated, admitted mapping.
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
  // Bead odontogram-dma: the retention element holding a removable denture to
  // this tooth, and the side it engages. ONE value, never a set.
  retention?: string;
  retentionSide?: string;
  // SP-perio P1 Task 1: per-site periodontal probing data (payload >=2.12).
  // Present only when at least one of the 6 sites (PERIO_SITES in
  // odontogram.ts) is charted — omitted entirely otherwise. `pd` (probing
  // depth, mm) is the charting key: a site absent from `pd` is "not
  // charted", never zero. `gm` (gingival margin offset, mm; signed) defaults
  // to 0 when a charted site has no entry. CAL (pd + gm) is always derived,
  // never stored here.
  perio?: { pd: Record<string, number>; gm: Record<string, number>; bop: string[]; sup: string[] };
  // SP-perio P2b Task 2: per-entrance Glickman furcation involvement grade
  // (I-IV, stored as integer 1-4). Entrance keys are position-dependent.
  furcation?: Record<string, number>;
  // SP-perio P2b Task 3: O'Leary plaque-index per-surface presence. Membership
  // means plaque present; absence means clean/not recorded, never stored false.
  plaque?: string[];
  // SP-perio PG-D Task 1: Silness-Löe Plaque Index (`pi`) and Löe-Silness
  // Gingival Index (`gi`) are per-surface graded 1-3 axes. Absence means grade 0.
  pi?: Record<string, number>;
  gi?: Record<string, number>;
  // SP-perio PG-D Task 2: keratinized gingiva width is a single BUCCAL scalar.
  kg?: number;
  // SP-perio PG-E Task 1: implant-only modified plaque and sulcus bleeding
  // indices, per-surface graded 1-3. FHIR import does not read them back yet.
  mpi?: Record<string, number>;
  mbi?: Record<string, number>;
  implantProduct?: ImplantProduct;
  assessment?: Record<string, "assessed" | "not-assessed" | "unmeasurable" | "not-applicable">;
  customStates?: Record<string, unknown>;
  note?: string;
}

/** The serialized odontogram export payload (matches exportStatus()'s object).
 * `plan` is additive and FHIR export/import reads only `teeth`/`globals`. */
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
    /** P4b Task 2: per-axis clinician overrides for the 2017 World Workshop classification. */
    diagnosisOverride?: string;
    stageOverride?: string;
    gradeOverride?: string;
    extentOverride?: string;
    /** UI-3b/2.2.1 report identity. Patient data is never emitted to FHIR. */
    patientName?: string;
    patientDob?: string;
    examDate?: string;
  };
  /** Bead odontogram-2vd: opaque host-owned examination identity and effective time. */
  examination?: ExaminationContextRecord;
  /** Bead odontogram-2vd: independent, dated whole-mouth snapshots, oldest first. */
  examinations?: ExaminationSnapshotRecord[];
  /** Opaque host-owned Dental Core instance identity retained across an import/export cycle. */
  fhirIdentity?: DentalCoreIdentity;
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

/** One archived examination plus whole-mouth findings and case context at capture time. */
export interface ExaminationSnapshotRecord {
  examination: ExaminationContextRecord;
  /** Whole-mouth flags at capture time, notably clinical `edentulous`. */
  globals: Record<string, boolean>;
  teeth: Record<string, ToothRecord>;
  case?: OdontogramExportPayload["case"];
}

/** Opaque FHIR instance identity retained when a Dental Core collection is imported. */
export interface DentalCoreResourceIdentity {
  id?: string;
  versionId?: string;
  fullUrl?: string;
}

/** JSON-serializable sidecar for host-owned Dental Core resource identity. */
export interface DentalCoreIdentity {
  resources?: Record<string, DentalCoreResourceIdentity>;
}

/** The payload/document version this engine writes. Readers accept earlier versions. */
// 2.22 (odontogram-8vu): additive `not-erupted` tooth selection; no migration.
// 2.27 (odontogram-t6y / -ca0): additive - `rootFracture` (none/vertical/
// horizontal) and `rootResection` (none/hemisection/amputation/
// premolarisation). The three crown-fracture flags mean the CROWN; a broken
// root is a different finding with a different consequence, and vertical vs
// horizontal is the distinction that decides whether the tooth can be kept.
// `rootResection` is NOT `endoResection`: that is the apicoectomy, where the
// apex is cut and the tooth stays whole. Both omit-when-none.
// 2.26 (odontogram-fu1): additive - `sensibility` (none/vital/no-response/
// questionable) and `percussion` (none/negative/sensitive), the pulp tests
// themselves beside the AAE diagnosis they feed. `none` means NOT TESTED, not
// "unremarkable", which is why percussion carries its own `negative`: tested
// and not tender is a finding, not a missing one. Both omit-when-none, so a
// chart that records no test is byte-identical apart from this version string.
// 2.25 (odontogram-dma): additive - `retention` (none/clasp/attachment/
// bar-abutment) and `retentionSide`, what holds a removable denture to a
// natural tooth. Both omit-when-none, so a chart with no removable work is
// byte-identical apart from this version string.
// 2.24 (odontogram-wxt): additive - `cervicalSurfaces`, the surfaces whose
// filling or caries lesion extends into the cervical region. Omitted entirely
// when empty, so a document that never records it is byte-identical apart from
// this version string, and an older document needs no migration.
export const PAYLOAD_VERSION = "2.27";

/**
 * The UI-domain document (bead odontogram-3l1, AC2/AC4): a versioned,
 * JSON-serializable editor snapshot. Optional FHIR adapters project it without
 * changing the host-owned document contract.
 */
export type OdontogramDocument = OdontogramExportPayload;
