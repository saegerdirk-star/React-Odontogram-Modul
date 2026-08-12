// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Canonical `fhir-dental-de` PERIODONTAL emitter (bead odontogram-5cz).
//
// The canonical dialect (toFhirDentalDe.ts, bead odontogram-3l1) previously
// reported the whole periodontal surface as unmapped, because the engine's only
// periodontal export (toFhirPerio.ts) speaks engine-local component codes that
// are meaningful in the LEGACY dialect only. The IG now publishes
// `PeriodontalObservationDE` and `PeriImplantObservationDE` with FIXED component
// slices, and its `PeriodontalMeasurementSiteCS` names exactly the engine's six
// probing sites, so the examination can be emitted canonically without the
// renderer inventing terminology.
//
// SOURCING RULE (unchanged from dentalDeCodesystems.ts): every identifier is
// copied from the published IG definition, and a fixed concept is emitted only
// once an authoritative lookup confirms the meaning the IG's label claims for
// it — see `SCT_PROVENANCE`.
//
// Bead odontogram-18h tracks the IG's SNOMED cleanup (fhir-dental-de PRs
// #94-96): bleeding on probing moved to `249420004`, and the corrected
// recession concept `4356008` retires the refusal bead odontogram-5cz recorded,
// so the recession derived from the signed margin is now emitted.
//
// SPLIT BY POSITION. A natural position yields one `PeriodontalObservationDE`.
// An implant position yields one `PeriImplantObservationDE` plus the
// `DentalImplantDE` Device it is required to focus on: the IG models the two as
// different examinations, and the CEJ-referenced margin the periodontal profile
// fixes does not exist around an implant.
//
// PURE: no DOM, no network, no wall clock, no randomness. Tolerant of malformed
// input — an unrecognized site, surface, grade or value is skipped, never thrown
// on, exactly like every other adapter in this directory.

import type { CodeableConcept, Observation, ToothRecord, DentalDeConversionEntry } from "./types";
import {
  DENTAL_DE_PERIODONTAL_PROFILE, DENTAL_DE_PERI_IMPLANT_PROFILE, DENTAL_DE_IMPLANT_DEVICE_PROFILE,
  PERIODONTAL_SITE_SYSTEM, PERIODONTAL_SITE_EXT_URL, PERIODONTAL_INDEX_SYSTEM,
  GLICKMAN_FURCATION_SYSTEM, PA_BEFUND_TYPE_SYSTEM, PERI_IMPLANT_FINDING_SYSTEM,
  FDI_TOOTH_NUMBER_EXT_URL, TOOTH_SURFACES_EXT_URL, FDI_SURFACE_SYSTEM,
  SNOMED_SYSTEM, LOINC_SYSTEM, UCUM_SYSTEM, DATA_ABSENT_REASON_SYSTEM,
  PERIO_LOINC, PA_BEFUND, PERIODONTAL_INDEX, PERI_IMPLANT_FINDING,
  PERIODONTAL_SITE_CODE, GLICKMAN_GRADE_CODE,
  IMPLANT_PLACEHOLDER_IDENTIFIER_SYSTEM, IMPLANT_DEVICE_TYPE_TEXT,
  VERIFIED_SCT, toFdiSurface,
  DENTAL_DE_IMPLANT_PROPERTY_SYSTEM, IMPLANT_PROPERTY,
} from "./dentalDeCodesystems";

// The `fhir/r4` types do not model `Observation.component.extension` (an R4
// BackboneElement slot the IG uses), nor a Device entry alongside Observations,
// so those nodes are assembled structurally.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/** The six probing sites, in the engine's charting order. Mirrored rather than
 *  imported so `fhir/` stays independent of the large `odontogram.ts` module,
 *  the same policy `toFhirPerio.ts` follows. */
const PERIO_SITES = ["MB", "B", "DB", "ML", "L", "DL"] as const;
type PerioSite = typeof PERIO_SITES[number];

/** The four index surfaces shared by plaque, PI, GI, mPI and mBI, and the
 *  entrance vocabulary furcation uses. */
const INDEX_SURFACES = ["mesial", "distal", "buccal", "lingual"] as const;
type IndexSurface = typeof INDEX_SURFACES[number];

/** Keratinized gingiva width is a single BUCCAL scalar in the engine, and the
 *  IG's slice qualifies it with a six-site measurement site. */
const KG_SITE: PerioSite = "B";

/**
 * The engine's clinical range for a probing depth: an integer 1-15 millimetres.
 * A value below the floor is the engine's own "un-chart this site" signal — a
 * probing depth of 0 is "not probed", not a reading — and a non-integer or
 * out-of-range value cannot have come from the editor at all.
 *
 * Mirrored here rather than imported, like `PERIO_SITES`, so this codec stays
 * independent of the stateful editor module. A site whose depth fails this test
 * is NOT charted, so it contributes no component at all: emitting a margin,
 * attachment loss, bleeding or recession there would state a finding about a
 * site the source never probed.
 */
const PD_MIN_MM = 1;
const PD_MAX_MM = 15;

function isChartedDepth(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value)
    && value >= PD_MIN_MM && value <= PD_MAX_MM;
}

/** The peri-implant examination Dental-DE defines. Mirrors `IMPLANT_PERIO_AXES`
 *  in odontogram.ts, minus `mobility`, which this dialect does not project. */
const IMPLANT_AXES = new Set(["pd", "bop", "sup", "kg", "mpi", "mbi"]);

/** Engine assessment status -> HL7 `data-absent-reason`. `assessed` is not here:
 *  an assessed-normal finding is a RESULT, not an absence. */
const DATA_ABSENT_REASON: Record<string, string> = {
  "not-assessed": "not-performed",
  unmeasurable: "unknown",
  "not-applicable": "not-applicable",
};

/** What the adapter needs from the canonical bundle builder. Passed in rather
 *  than imported so this module never depends on `toFhirDentalDe.ts` — the
 *  dependency runs one way only. */
export interface DentalDePerioContext {
  /** `Observation.subject` / `Device.patient` reference. */
  subjectRef: string;
  /** The canonical base Observation (profile, status, category, subject,
   *  effective time) every resource in this dialect shares. */
  baseObservation(profile: string, code: CodeableConcept): Observation;
  /** The canonical `Observation.bodySite` for an FDI position. */
  toothBodySite(fdi: string): CodeableConcept;
  reportUnmapped(entry: DentalDeConversionEntry): void;
  /** Emitted canonically, but with something the IG's own pattern allows in
   *  place of a code the editor does not hold. */
  reportText(entry: DentalDeConversionEntry): void;
}

/** One bundle entry this module contributes. */
export interface PerioBundleEntry {
  fullUrl?: string;
  resource: Any;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function loinc(code: string): CodeableConcept {
  return { coding: [{ system: LOINC_SYSTEM, code }] };
}
function sct(code: string): CodeableConcept {
  return { coding: [{ system: SNOMED_SYSTEM, code }] };
}
function localCode(system: string, code: string): CodeableConcept {
  return { coding: [{ system, code }] };
}
function mm(value: number): Any {
  return { value, unit: "mm", system: UCUM_SYSTEM, code: "mm" };
}

function siteExtension(site: PerioSite): Any {
  return {
    url: PERIODONTAL_SITE_EXT_URL,
    valueCodeableConcept: { coding: [{ system: PERIODONTAL_SITE_SYSTEM, code: PERIODONTAL_SITE_CODE[site] }] },
  };
}

/** The FDI-surface extension the index and furcation slices require. Returns
 *  `undefined` for a surface with no FDI-surface counterpart, whose component is
 *  then skipped rather than emitted without its mandatory qualifier. */
function surfaceExtension(surface: string, fdi: string): Any | undefined {
  const code = toFdiSurface(surface, fdi);
  if (!code) return undefined;
  return {
    url: TOOTH_SURFACES_EXT_URL,
    valueCodeableConcept: { coding: [{ system: FDI_SURFACE_SYSTEM, code }] },
  };
}

function dataAbsent(reason: string): Any {
  return { coding: [{ system: DATA_ABSENT_REASON_SYSTEM, code: reason }] };
}

// ---------------------------------------------------------------------------
// Reading the tooth record
// ---------------------------------------------------------------------------

interface PerioSource {
  pd: Record<string, unknown>;
  gm: Record<string, unknown>;
  bop: string[];
  sup: string[];
  chartedSites: PerioSite[];
  furcation: Array<[IndexSurface, number]>;
  plaque: IndexSurface[];
  pi: Array<[IndexSurface, number]>;
  gi: Array<[IndexSurface, number]>;
  mpi: Array<[IndexSurface, number]>;
  mbi: Array<[IndexSurface, number]>;
  kg?: number;
  assessment: Array<[string, string | null, string]>;
}

function gradedSurfaces(raw: unknown, min: number, max: number): Array<[IndexSurface, number]> {
  if (!raw || typeof raw !== "object") return [];
  const map = raw as Record<string, unknown>;
  const out: Array<[IndexSurface, number]> = [];
  for (const surface of INDEX_SURFACES) {
    const value = map[surface];
    if (isFiniteNumber(value) && Number.isInteger(value) && value >= min && value <= max) {
      out.push([surface, value]);
    }
  }
  return out;
}

function readPerioSource(rec: ToothRecord): PerioSource {
  const perio = rec.perio;
  const pd = perio && typeof perio.pd === "object" && perio.pd ? (perio.pd as Record<string, unknown>) : {};
  const gm = perio && typeof perio.gm === "object" && perio.gm ? (perio.gm as Record<string, unknown>) : {};
  const strings = (v: unknown): string[] =>
    Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === "string") : [];

  const plaqueRaw = strings(rec.plaque);
  const assessmentRaw = (rec as Any).assessment;
  const assessment: Array<[string, string | null, string]> = [];
  if (assessmentRaw && typeof assessmentRaw === "object") {
    for (const [key, status] of Object.entries(assessmentRaw as Record<string, unknown>)) {
      if (typeof status !== "string") continue;
      const at = key.indexOf(":");
      assessment.push([at < 0 ? key : key.slice(0, at), at < 0 ? null : key.slice(at + 1), status]);
    }
  }

  return {
    pd,
    gm,
    bop: strings(perio?.bop),
    sup: strings(perio?.sup),
    chartedSites: PERIO_SITES.filter((s) => isChartedDepth(pd[s])),
    furcation: gradedSurfaces(rec.furcation, 1, 4),
    plaque: INDEX_SURFACES.filter((s) => plaqueRaw.includes(s)),
    pi: gradedSurfaces(rec.pi, 1, 3),
    gi: gradedSurfaces(rec.gi, 1, 3),
    mpi: gradedSurfaces(rec.mpi, 1, 3),
    mbi: gradedSurfaces(rec.mbi, 1, 3),
    kg: isFiniteNumber(rec.kg) && Number.isInteger(rec.kg) && rec.kg >= 0 && rec.kg <= 15 ? rec.kg : undefined,
    assessment,
  };
}

function hasAnyPerioData(src: PerioSource): boolean {
  return src.chartedSites.length > 0 || src.furcation.length > 0 || src.plaque.length > 0
    || src.pi.length > 0 || src.gi.length > 0 || src.mpi.length > 0 || src.mbi.length > 0
    || src.kg !== undefined || src.assessment.length > 0;
}

// ---------------------------------------------------------------------------
// Assessment status -> component
// ---------------------------------------------------------------------------

/** The component code an axis reports under, so a measurement, an explicit
 *  negative and a recorded gap all speak the same vocabulary. */
function axisComponentCode(axis: string): CodeableConcept | undefined {
  switch (axis) {
    case "pd": return loinc(PERIO_LOINC.probingDepth);
    case "gm": return loinc(PERIO_LOINC.gingivalMarginToCej);
    case "bop": return sct(VERIFIED_SCT.bleedingOnProbing);
    case "sup": return localCode(PA_BEFUND_TYPE_SYSTEM, PA_BEFUND.suppuration);
    case "furcation": return sct(VERIFIED_SCT.furcationInvolvementIndex);
    case "plaque": return loinc(PERIO_LOINC.plaquePresence);
    case "pi": return sct(VERIFIED_SCT.plaqueIndexSilnessLoe);
    case "gi": return localCode(PERIODONTAL_INDEX_SYSTEM, PERIODONTAL_INDEX.gingivalIndex);
    case "mpi": return localCode(PERIODONTAL_INDEX_SYSTEM, PERIODONTAL_INDEX.modifiedPlaqueIndex);
    case "mbi": return localCode(PERIODONTAL_INDEX_SYSTEM, PERIODONTAL_INDEX.modifiedSulcusBleedingIndex);
    case "kg": return localCode(PERIODONTAL_INDEX_SYSTEM, PERIODONTAL_INDEX.keratinizedGingivaWidth);
    default: return undefined;
  }
}

/** How an axis states "examined, nothing to report". The quantitative axes have
 *  no normal-without-a-number, so they are absent here and an assessed-normal
 *  marker on them emits nothing — the same rule the legacy dialect applies. */
function assessedNormalValue(axis: string): Any | undefined {
  switch (axis) {
    case "bop": case "sup": case "plaque": return { valueBoolean: false };
    case "pi": case "gi": case "mpi": case "mbi": return { valueInteger: 0 };
    // The IG's Glickman scale names Grade 0 explicitly: assessed, no involvement.
    case "furcation":
      return { valueCodeableConcept: { coding: [{ system: GLICKMAN_FURCATION_SYSTEM, code: GLICKMAN_GRADE_CODE[0] }] } };
    default: return undefined;
  }
}

/** The measurement-point extension an axis's component carries. */
function axisQualifierExtension(axis: string, qualifier: string | null, fdi: string): Any | undefined {
  switch (axis) {
    case "pd": case "gm": case "bop": case "sup":
      return qualifier && (PERIO_SITES as readonly string[]).includes(qualifier)
        ? siteExtension(qualifier as PerioSite) : undefined;
    case "furcation": case "plaque": case "pi": case "gi": case "mpi": case "mbi":
      return qualifier && (INDEX_SURFACES as readonly string[]).includes(qualifier)
        ? surfaceExtension(qualifier, fdi) : undefined;
    case "kg":
      return siteExtension(KG_SITE);
    default: return undefined;
  }
}

// ---------------------------------------------------------------------------
// Component assembly
// ---------------------------------------------------------------------------

function component(code: CodeableConcept, body: Any, extension?: Any): Any {
  const out: Any = { code, ...body };
  if (extension) out.extension = [extension];
  return out;
}

interface PanelBuild {
  components: Any[];
  /** Which axis/qualifier pairs already carry a value, so a stale recorded
   *  status can never out-rank a measurement. */
  valued: Set<string>;
}

function valueKey(axis: string, qualifier: string | null): string {
  return qualifier === null ? axis : `${axis}:${qualifier}`;
}

/** The site-level components a natural tooth carries. */
function naturalSiteComponents(src: PerioSource, build: PanelBuild): void {
  const { components, valued } = build;
  for (const site of src.chartedSites) {
    components.push(component(loinc(PERIO_LOINC.probingDepth), { valueQuantity: mm(src.pd[site] as number) }, siteExtension(site)));
    valued.add(valueKey("pd", site));
  }
  // The signed free-gingival-margin-to-CEJ distance is emitted only where the
  // engine actually stores one. A charted site with no margin means "margin not
  // recorded", and the engine's own 0 default is a DERIVATION convenience, not a
  // measurement — emitting it would invent a reading and break the round-trip.
  for (const site of src.chartedSites) {
    const value = src.gm[site];
    if (!isFiniteNumber(value)) continue;
    components.push(component(loinc(PERIO_LOINC.gingivalMarginToCej), { valueQuantity: mm(value) }, siteExtension(site)));
    valued.add(valueKey("gm", site));
  }
  recessionComponents(src, build);
  for (const site of src.chartedSites) {
    const gmValue = src.gm[site];
    const cal = (src.pd[site] as number) + (isFiniteNumber(gmValue) ? gmValue : 0);
    components.push(component(localCode(PA_BEFUND_TYPE_SYSTEM, PA_BEFUND.attachmentLoss), { valueQuantity: mm(cal) }, siteExtension(site)));
  }
  bleedingAndSuppuration(src, build);
}

/**
 * Gingival recession, DERIVED from the signed margin as `max(gm, 0)` and
 * emitted only where that is an actual recession.
 *
 * A margin of zero or a coronal margin (a pseudopocket, `gm < 0`) is not a
 * recession, and a site with no recorded margin has nothing to derive from, so
 * neither produces a component — emitting `0 mm` everywhere would turn "not
 * recorded" and "no recession" into the same statement.
 *
 * `PeriImplantObservationDE` has no recession slice (an implant has no CEJ to
 * reference), so this runs on the natural-tooth panel only. The derivation is
 * one-way: the reader restores `perio.gm` from LOINC 64043-3 alone.
 */
function recessionComponents(src: PerioSource, build: PanelBuild): void {
  for (const site of src.chartedSites) {
    const value = src.gm[site];
    if (!isFiniteNumber(value) || value <= 0) continue;
    build.components.push(component(
      sct(VERIFIED_SCT.gingivalRecession), { valueQuantity: mm(value) }, siteExtension(site),
    ));
  }
}

/** Bleeding and suppuration are charted per probing site on BOTH profiles, with
 *  an explicit true/false so "charted, did not bleed" stays distinguishable from
 *  "never charted". */
function bleedingAndSuppuration(src: PerioSource, build: PanelBuild): void {
  const { components, valued } = build;
  for (const site of src.chartedSites) {
    components.push(component(sct(VERIFIED_SCT.bleedingOnProbing), { valueBoolean: src.bop.includes(site) }, siteExtension(site)));
    valued.add(valueKey("bop", site));
  }
  for (const site of src.chartedSites) {
    components.push(component(localCode(PA_BEFUND_TYPE_SYSTEM, PA_BEFUND.suppuration), { valueBoolean: src.sup.includes(site) }, siteExtension(site)));
    valued.add(valueKey("sup", site));
  }
}

function gradedComponents(
  entries: Array<[IndexSurface, number]>, code: CodeableConcept, axis: string, fdi: string, build: PanelBuild,
): void {
  for (const [surface, grade] of entries) {
    const ext = surfaceExtension(surface, fdi);
    if (!ext) continue;
    build.components.push(component(code, { valueInteger: grade }, ext));
    build.valued.add(valueKey(axis, surface));
  }
}

function keratinizedWidth(src: PerioSource, build: PanelBuild): void {
  if (src.kg === undefined) return;
  build.components.push(component(
    localCode(PERIODONTAL_INDEX_SYSTEM, PERIODONTAL_INDEX.keratinizedGingivaWidth),
    { valueQuantity: mm(src.kg) },
    siteExtension(KG_SITE),
  ));
  build.valued.add(valueKey("kg", null));
}

/** Turn the recorded assessment statuses into components, skipping any axis
 *  that already carries a value and any axis this profile has no slice for. */
function assessmentComponents(
  src: PerioSource, fdi: string, allowedAxis: (axis: string) => boolean, ctx: DentalDePerioContext, build: PanelBuild,
): void {
  for (const [axis, qualifier, status] of src.assessment) {
    const code = axisComponentCode(axis);
    if (!code || !allowedAxis(axis)) {
      ctx.reportUnmapped({
        tooth: fdi, field: "assessment", value: `${valueKey(axis, qualifier)}:${status}`,
        reason: "This axis has no component slice on the periodontal profile that applies to this position, so its recorded assessment status has no canonical carrier.",
      });
      continue;
    }
    if (build.valued.has(valueKey(axis, qualifier))) continue;
    const extension = axisQualifierExtension(axis, qualifier, fdi);
    if (!extension) continue;
    if (status === "assessed") {
      const normal = assessedNormalValue(axis);
      if (!normal) continue;
      build.components.push(component(code, normal, extension));
      continue;
    }
    const reason = DATA_ABSENT_REASON[status];
    if (!reason) continue;
    build.components.push(component(code, { dataAbsentReason: dataAbsent(reason) }, extension));
  }
}

// ---------------------------------------------------------------------------
// Boundary reporting
// ---------------------------------------------------------------------------

function reportForeignAxes(
  fdi: string, foreign: Array<[string, number]>, reason: string, ctx: DentalDePerioContext,
): void {
  for (const [field, count] of foreign) {
    if (count === 0) continue;
    ctx.reportUnmapped({ tooth: fdi, field, value: "charted", reason });
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build the canonical periodontal resources for one FDI position, or an empty
 * list when the tooth carries no periodontal data at all (the common case,
 * which is what keeps a chart without periodontal charting unchanged).
 */
export function buildDentalDePerioEntries(
  ctx: DentalDePerioContext, fdi: string, rec: ToothRecord,
): PerioBundleEntry[] {
  const src = readPerioSource(rec);
  if (!hasAnyPerioData(src)) return [];
  return rec.toothSelection === "implant"
    ? buildPeriImplant(ctx, fdi, src)
    : buildPeriodontal(ctx, fdi, src);
}

function buildPeriodontal(ctx: DentalDePerioContext, fdi: string, src: PerioSource): PerioBundleEntry[] {
  const build: PanelBuild = { components: [], valued: new Set() };

  naturalSiteComponents(src, build);

  for (const [entrance, grade] of src.furcation) {
    const ext = surfaceExtension(entrance, fdi);
    if (!ext) continue;
    build.components.push(component(
      sct(VERIFIED_SCT.furcationInvolvementIndex),
      { valueCodeableConcept: { coding: [{ system: GLICKMAN_FURCATION_SYSTEM, code: GLICKMAN_GRADE_CODE[grade] }] } },
      ext,
    ));
    build.valued.add(valueKey("furcation", entrance));
  }

  for (const surface of src.plaque) {
    const ext = surfaceExtension(surface, fdi);
    if (!ext) continue;
    build.components.push(component(loinc(PERIO_LOINC.plaquePresence), { valueBoolean: true }, ext));
    build.valued.add(valueKey("plaque", surface));
  }

  gradedComponents(src.pi, sct(VERIFIED_SCT.plaqueIndexSilnessLoe), "pi", fdi, build);
  gradedComponents(src.gi, localCode(PERIODONTAL_INDEX_SYSTEM, PERIODONTAL_INDEX.gingivalIndex), "gi", fdi, build);
  keratinizedWidth(src, build);

  assessmentComponents(src, fdi, (axis) => axis !== "mpi" && axis !== "mbi", ctx, build);

  reportForeignAxes(fdi, [["mpi", src.mpi.length], ["mbi", src.mbi.length]],
    "The Mombelli modified indices are peri-implant instruments; PeriodontalObservationDE has no slice for them and this position is not an implant.", ctx);

  if (build.components.length === 0) return [];

  const obs = ctx.baseObservation(DENTAL_DE_PERIODONTAL_PROFILE, loinc(PERIO_LOINC.panel)) as Any;
  obs.bodySite = ctx.toothBodySite(fdi);
  obs.component = build.components;
  return [{ resource: obs }];
}

function buildPeriImplant(ctx: DentalDePerioContext, fdi: string, src: PerioSource): PerioBundleEntry[] {
  const build: PanelBuild = { components: [], valued: new Set() };

  for (const site of src.chartedSites) {
    build.components.push(component(loinc(PERIO_LOINC.probingDepth), { valueQuantity: mm(src.pd[site] as number) }, siteExtension(site)));
    build.valued.add(valueKey("pd", site));
  }
  bleedingAndSuppuration(src, build);

  gradedComponents(src.mpi, localCode(PERIODONTAL_INDEX_SYSTEM, PERIODONTAL_INDEX.modifiedPlaqueIndex), "mpi", fdi, build);
  gradedComponents(src.mbi, localCode(PERIODONTAL_INDEX_SYSTEM, PERIODONTAL_INDEX.modifiedSulcusBleedingIndex), "mbi", fdi, build);
  keratinizedWidth(src, build);

  assessmentComponents(src, fdi, (axis) => IMPLANT_AXES.has(axis), ctx, build);

  // The engine's gingival margin is measured against the CEJ, which an implant
  // does not have. The IG's peri-implant equivalent is a signed level against a
  // documented stable implant reference point that the editor does not record,
  // and its alignment matrix leaves that reference deliberately unresolved.
  const chartedMargins = src.chartedSites.filter((s) => isFiniteNumber(src.gm[s])).length;
  if (chartedMargins > 0) {
    ctx.reportUnmapped({
      tooth: fdi, field: "perio.gm", value: "charted",
      reason: "PeriImplantObservationDE carries a mucosal-margin level relative to a REQUIRED documented stable implant reference point, which this editor does not record; a CEJ-referenced margin is not that measurement.",
    });
    ctx.reportUnmapped({
      tooth: fdi, field: "perio.cal", value: "derived",
      reason: "Clinical attachment level is derived from a CEJ-referenced margin, which does not exist around an implant; PeriImplantObservationDE has no attachment-loss slice.",
    });
  }

  reportForeignAxes(fdi, [
    ["furcation", src.furcation.length], ["plaque", src.plaque.length],
    ["pi", src.pi.length], ["gi", src.gi.length],
  ], "PeriImplantObservationDE has no slice for this natural-tooth periodontal instrument; the Mombelli indices are its peri-implant equivalent.", ctx);

  if (build.components.length === 0) return [];

  const obs = ctx.baseObservation(
    DENTAL_DE_PERI_IMPLANT_PROFILE, localCode(PERI_IMPLANT_FINDING_SYSTEM, PERI_IMPLANT_FINDING.assessment),
  ) as Any;
  obs.bodySite = ctx.toothBodySite(fdi);
  // The Device is emitted by the bundle builder for EVERY implant, so this only
  // points at it. It used to be minted here, which meant an implant with no
  // peri-implant measurement produced no Device at all - and in an initial
  // examination that is the commonest implant there is (odontogram-im1).
  obs.focus = [{ reference: implantDeviceFullUrl(fdi) }];
  obs.component = build.components;

  return [{ resource: obs }];
}

/** The in-bundle identity of the `DentalImplantDE` for one position. */
export function implantDeviceFullUrl(fdi: string): string {
  return `urn:uuid:odontogram-implant-${fdi}`;
}

/**
 * The `DentalImplantDE` Device for one implant position.
 *
 * Emitted for EVERY charted implant, whether or not anything else is known
 * about it. The Device asserts THAT an implant is present, which is true even
 * when the practice has no idea which one - an implant that arrived with the
 * patient is a complete record without a product (Dirk, 2026-08-11). The
 * identity fields are then simply absent; an omitted `lotNumber` says nothing
 * false and needs no `dataAbsentReason`.
 *
 * Every element used here is defined by the profile - manufacturer, lotNumber,
 * expirationDate, serialNumber, modelNumber, deviceName, udiCarrier, and
 * `property` sliced into `diameter` and `length` as mm Quantities, both
 * mustSupport. Nothing is invented (the sourcing rule in dentalDeCodesystems).
 */
export function buildImplantDevice(
  ctx: DentalDePerioContext, fdi: string, rec: ToothRecord,
): PerioBundleEntry {
  const p = (rec as Any).implantProduct as Any | undefined;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

  const device: Any = {
    resourceType: "Device",
    id: `odontogram-implant-${fdi}`,
    meta: { profile: [DENTAL_DE_IMPLANT_DEVICE_PROFILE] },
    extension: [{ url: FDI_TOOTH_NUMBER_EXT_URL, valueCode: fdi }],
    identifier: [{ system: IMPLANT_PLACEHOLDER_IDENTIFIER_SYSTEM, value: fdi }],
    status: "active",
    type: { text: IMPLANT_DEVICE_TYPE_TEXT },
    patient: { reference: ctx.subjectRef },
  };

  const manufacturer = str(p?.manufacturer);
  const system = str(p?.system);
  const udi = str(p?.udi);
  const di = str(p?.deviceIdentifier);
  const lot = str(p?.lot);
  const serial = str(p?.serial);
  const expiry = str(p?.expiry);
  const diameter = num(p?.diameterMm);
  const length = num(p?.lengthMm);

  if (manufacturer) device.manufacturer = manufacturer;
  if (system) {
    device.modelNumber = system;
    // `deviceName.type` is required by base Device; "model-name" is what a
    // system designation is.
    device.deviceName = [{ name: system, type: "model-name" }];
  }
  if (lot) device.lotNumber = lot;
  if (serial) device.serialNumber = serial;
  if (expiry) device.expirationDate = expiry;
  if (udi) {
    const carrier: Any = { carrierHRF: udi };
    if (di) carrier.deviceIdentifier = di;
    device.udiCarrier = [carrier];
  }
  // The GTIN is NOT repeated as a second `Device.identifier`. It would need a
  // system URI, the IG defines none, and picking one would be exactly the kind
  // of invention the sourcing rule forbids. `udiCarrier.deviceIdentifier` is
  // the element FHIR defines for it and it already carries it above.

  const property: Any[] = [];
  if (diameter !== undefined) {
    property.push({
      type: { coding: [{ system: DENTAL_DE_IMPLANT_PROPERTY_SYSTEM, code: IMPLANT_PROPERTY.diameter }] },
      valueQuantity: [mm(diameter)],
    });
  }
  if (length !== undefined) {
    property.push({
      type: { coding: [{ system: DENTAL_DE_IMPLANT_PROPERTY_SYSTEM, code: IMPLANT_PROPERTY.length }] },
      valueQuantity: [mm(length)],
    });
  }
  if (property.length) device.property = property;

  if (!manufacturer && !system && !udi && !lot && !expiry) {
    ctx.reportText({
      tooth: fdi, field: "implantDevice", value: device.id,
      reason: "No implant product is recorded, which is a complete record for an implant that arrived with the patient; the Device asserts the implant's presence and carries a placeholder identity a host with a device registry replaces.",
    });
  }

  return { fullUrl: implantDeviceFullUrl(fdi), resource: device };
}
