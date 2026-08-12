// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Canonical `fhir-dental-de` reader (bead odontogram-3l1, AC3).
//
// Reads `OdontogramObservationDE` and `CariesObservationDE` resources back into
// the UI-domain document. Detection is by canonical identifiers only
// (`meta.profile`, the `DentalAssessmentTypeCS` code, or an
// `OdontogramComponentCS` component code), so a legacy bundle is never
// misparsed and a bundle containing BOTH representations reads correctly.
//
// PURE: no DOM, no network, no wall clock, no randomness.

import type { ToothRecord } from "./types";
import { LOCAL_VALUE_MAPS } from "./codesystems";
import { slotForPrimaryFdi } from "../utils/numbering";
import {
  DENTAL_DE_ODONTOGRAM_PROFILE, DENTAL_DE_CARIES_PROFILE, DENTAL_DE_FINDING_PROFILE,
  DENTAL_DE_PERIODONTAL_PROFILE, DENTAL_DE_PERI_IMPLANT_PROFILE,
  FINDING_TEXT,
  DENTAL_DE_COMPONENT_SYSTEM, DENTAL_DE_ASSESSMENT_SYSTEM,
  DENTAL_DE_FDI_SYSTEM, DENTAL_DE_ICDAS_SYSTEM,
  DENTAL_DE_RESTORATION_TYPE_SYSTEM, DENTAL_DE_MATERIAL_SYSTEM,
  TOOTH_SURFACES_EXT_URL, FDI_SURFACE_SYSTEM, SNOMED_SYSTEM,
  PERIODONTAL_SITE_SYSTEM, PERIODONTAL_SITE_EXT_URL, PERIODONTAL_INDEX_SYSTEM,
  GLICKMAN_FURCATION_SYSTEM, LOINC_SYSTEM, PA_BEFUND_TYPE_SYSTEM,
  PERIO_LOINC, PERIODONTAL_INDEX, PA_BEFUND, perioSiteFromCode, glickmanGradeFromCode,
  ODONTO_COMPONENT, VERIFIED_SCT, fromFdiSurface,
  DENTAL_DE_IMPLANT_DEVICE_PROFILE, DENTAL_DE_IMPLANT_PROPERTY_SYSTEM,
  FDI_TOOTH_NUMBER_EXT_URL, IMPLANT_PROPERTY,
} from "./dentalDeCodesystems";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

interface CodingLike { system?: string; code?: string }
interface ConceptLike { coding?: CodingLike[]; text?: string; extension?: Any[] }

function codeIn(concept: unknown, system: string): string | undefined {
  const coding = (concept as ConceptLike | undefined)?.coding;
  if (!Array.isArray(coding)) return undefined;
  return coding.find((c) => c?.system === system && typeof c.code === "string")?.code;
}

function conceptText(concept: unknown): string | undefined {
  const text = (concept as ConceptLike | undefined)?.text;
  return typeof text === "string" && text ? text : undefined;
}

/** Engine surface keys carried by a node's repeatable ToothSurfacesExt. */
function surfacesOf(node: unknown): string[] {
  const ext = (node as { extension?: Any[] } | undefined)?.extension;
  if (!Array.isArray(ext)) return [];
  const out: string[] = [];
  for (const e of ext) {
    if (e?.url !== TOOTH_SURFACES_EXT_URL) continue;
    const code = codeIn(e?.valueCodeableConcept, FDI_SURFACE_SYSTEM);
    if (!code) continue;
    for (const surface of fromFdiSurface(code)) if (!out.includes(surface)) out.push(surface);
  }
  return out;
}

/** True when the resource is a canonical Dental-DE odontogram, caries or
 *  finding resource — every profile this repository's canonical emitter can
 *  produce, so the round-trip reads back everything it writes. */
export function isDentalDeResource(res: unknown): boolean {
  const r = res as {
    resourceType?: string; meta?: { profile?: unknown }; code?: unknown; component?: Any[];
  } | undefined;
  // odontogram-im1: the implant's own identity is a Device, not an Observation.
  // Reading it back is what keeps a product from being lost on a round trip.
  if (r?.resourceType === "Device") {
    const prof = Array.isArray(r.meta?.profile) ? (r.meta!.profile as string[]) : [];
    return prof.includes(DENTAL_DE_IMPLANT_DEVICE_PROFILE);
  }
  if (!r || r.resourceType !== "Observation") return false;
  const profiles = Array.isArray(r.meta?.profile) ? (r.meta!.profile as string[]) : [];
  if (
    profiles.includes(DENTAL_DE_ODONTOGRAM_PROFILE)
    || profiles.includes(DENTAL_DE_CARIES_PROFILE)
    || profiles.includes(DENTAL_DE_FINDING_PROFILE)
    || profiles.includes(DENTAL_DE_PERIODONTAL_PROFILE)
    || profiles.includes(DENTAL_DE_PERI_IMPLANT_PROFILE)
  ) return true;
  const assessment = codeIn(r.code, DENTAL_DE_ASSESSMENT_SYSTEM);
  if (assessment === "odontogram-assessment" || assessment === "icdas-caries-assessment") return true;
  return (r.component ?? []).some((c) => !!codeIn(c?.code, DENTAL_DE_COMPONENT_SYSTEM));
}

/**
 * Reverse of the emitter's `display(group, value)` lookup.
 *
 * The emitter writes an English display string as `CodeableConcept.text`
 * wherever the IG has no coded value; this reads that exact string back to the
 * engine enum. It is an equality lookup against the SAME table the emitter
 * used, per group — never a heuristic on free prose, and never cross-group, so
 * an unrelated text simply does not resolve.
 */
const DISPLAY_TO_VALUE: Record<string, Record<string, string>> = {};
function valueFromDisplay(group: string, text: string): string | undefined {
  let reverse = DISPLAY_TO_VALUE[group];
  if (!reverse) {
    reverse = {};
    for (const [value, entry] of Object.entries(LOCAL_VALUE_MAPS[group] ?? {})) {
      // "none"/"normal" displays are never emitted (the emitter skips them), so
      // they are excluded to keep the reverse map unambiguous.
      if (value === "none" || value === "normal") continue;
      reverse[entry.display] = value;
    }
    DISPLAY_TO_VALUE[group] = reverse;
  }
  return reverse[text];
}

/** Trailing integer of a "<prefix><n>" value string, e.g. "CARS score 3". */
function scoreAfter(text: string, prefix: string): number | undefined {
  if (!text.startsWith(prefix)) return undefined;
  const n = Number(text.slice(prefix.length).trim());
  return Number.isFinite(n) ? n : undefined;
}

function addCariesSurface(rec: ToothRecord, surface: string, score?: number): void {
  const caries = (rec.caries ??= []);
  const key = `caries-${surface}`;
  if (!caries.includes(key)) caries.push(key);
  if (typeof score === "number") (rec.cariesSeverity ??= {})[surface] = score;
}

/** Reverse of the emitter's restoration-type mapping. */
function restorationTypeFromCode(code: string): string | undefined {
  switch (code) {
    case "krone": case "implantat-krone": return "crown";
    case "inlay": return "inlay";
    case "onlay": return "onlay";
    case "veneer": return "veneer";
    case "brueckenglied": case "brueckenanker": case "implantat-bruecke": return "bridge";
    default: return undefined;
  }
}

/** Reverse of the emitter's material mapping. */
function restorationMaterialFromCode(code: string): string | undefined {
  switch (code) {
    case "lithiumdisilikat": return "emax";
    case "zirkon": return "zircon";
    case "komposit": return "gradia";
    case "vmk": return "metal-ceramic";
    case "edelmetall": return "gold";
    default: return undefined;
  }
}

/**
 * Presence value -> engine `toothSelection` / `toothSubstrate`. Only concepts
 * this adapter itself emits are decoded; anything else leaves the record
 * untouched rather than being guessed at.
 */
function applyPresence(rec: ToothRecord, value: unknown): void {
  const sctCode = codeIn(value, SNOMED_SYSTEM);
  const text = conceptText(value) ?? "";
  if (sctCode === VERIFIED_SCT.toothPresent) {
    rec.toothSelection = text === "Primary (deciduous) tooth" ? "milktooth" : "tooth-base";
    return;
  }
  if (sctCode === VERIFIED_SCT.rootRemnant) {
    rec.toothSelection = "tooth-base";
    rec.toothSubstrate = "radix";
    return;
  }
  if (sctCode === VERIFIED_SCT.toothAbsent) {
    rec.toothSelection = text === FINDING_TEXT.missingAfterExtraction
      ? "no-tooth-after-extraction"
      : "none";
    return;
  }
  if (text === FINDING_TEXT.implantPresent) { rec.toothSelection = "implant"; return; }
  if (text === FINDING_TEXT.toothUnderGum) { rec.toothSelection = "tooth-under-gum"; return; }
  if (text === FINDING_TEXT.toothNotErupted) { rec.toothSelection = "not-erupted"; return; }
}

// ---------------------------------------------------------------------------
// Bead odontogram-5cz: canonical periodontal read-back
// ---------------------------------------------------------------------------

/** The probing site one component applies to, as the engine's own site key. */
function perioSiteOf(comp: unknown): string | undefined {
  const ext = (comp as { extension?: Any[] } | undefined)?.extension;
  if (!Array.isArray(ext)) return undefined;
  for (const e of ext) {
    if (e?.url !== PERIODONTAL_SITE_EXT_URL) continue;
    const code = codeIn(e?.valueCodeableConcept, PERIODONTAL_SITE_SYSTEM);
    if (code) return perioSiteFromCode(code);
  }
  return undefined;
}

/** The single index surface one component applies to. */
function indexSurfaceOf(comp: unknown): string | undefined {
  return surfacesOf(comp)[0];
}

/**
 * Every SNOMED CT concept that has ever carried bleeding on probing in a bundle
 * this repository wrote (bead odontogram-18h).
 *
 * `PeriodontalObservationDE` and `PeriImplantObservationDE` fixed
 * `component[bop].code` to `86276007` until fhir-dental-de PR #94 corrected it
 * to `249420004`; releases v2.6.0-2.7.1 of this library emitted the former.
 * Reading is deliberately tolerant of both — a bundle written by an installed
 * older release must not silently lose its bleeding sites, and BOP is a boolean
 * whose absence reads as "did not bleed" rather than as an error. Emission is
 * NOT tolerant: only {@link VERIFIED_SCT.bleedingOnProbing} is ever written.
 */
const ACCEPTED_BOP_SCT = new Set([VERIFIED_SCT.bleedingOnProbing, "86276007"]);

function numericValue(comp: Any): number | undefined {
  const value = comp?.valueQuantity?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function integerValue(comp: Any): number | undefined {
  const value = comp?.valueInteger;
  return typeof value === "number" && Number.isInteger(value) ? value : undefined;
}

function perioRecord(rec: ToothRecord): NonNullable<ToothRecord["perio"]> {
  return (rec.perio ??= { pd: {}, gm: {}, bop: [], sup: [] });
}

function pushOnce(list: string[], value: string): void {
  if (!list.includes(value)) list.push(value);
}

/** Read one `PeriodontalObservationDE` / `PeriImplantObservationDE` back into
 *  the tooth record. Absent results (`dataAbsentReason`) and the derived
 *  attachment-loss components carry no engine state and are skipped; the
 *  engine's assessment-status map is not restored here, exactly as the legacy
 *  dialect does not restore it either. */
function applyPeriodontalResource(rec: ToothRecord, components: Any[]): void {
  for (const comp of components) {
    const site = perioSiteOf(comp);
    const surface = indexSurfaceOf(comp);

    if (codeIn(comp?.code, LOINC_SYSTEM) === PERIO_LOINC.probingDepth) {
      const value = numericValue(comp);
      if (site && value !== undefined) perioRecord(rec).pd[site] = value;
      continue;
    }
    if (codeIn(comp?.code, LOINC_SYSTEM) === PERIO_LOINC.gingivalMarginToCej) {
      const value = numericValue(comp);
      if (site && value !== undefined) perioRecord(rec).gm[site] = value;
      continue;
    }
    if (codeIn(comp?.code, LOINC_SYSTEM) === PERIO_LOINC.plaquePresence) {
      if (surface && comp?.valueBoolean === true) pushOnce((rec.plaque ??= []), surface);
      continue;
    }
    const sctCode = codeIn(comp?.code, SNOMED_SYSTEM);
    if (sctCode !== undefined && ACCEPTED_BOP_SCT.has(sctCode)) {
      if (site && comp?.valueBoolean === true) pushOnce(perioRecord(rec).bop, site);
      continue;
    }
    // Gingival recession is DERIVED output — `max(gm, 0)` — exactly like the
    // attachment-loss component below it. The signed margin on LOINC 64043-3 is
    // the sole source of truth for `perio.gm`, so this component is recognized
    // and deliberately discarded: reading it back would let two components write
    // one field (making the result depend on component order), and at a site
    // with no margin it would chart a measurement the source never recorded,
    // where the engine's convention is that an absent margin means "not
    // charted".
    if (sctCode === VERIFIED_SCT.gingivalRecession) continue;
    if (sctCode === VERIFIED_SCT.plaqueIndexSilnessLoe) {
      const grade = integerValue(comp);
      if (surface && grade !== undefined && grade > 0) (rec.pi ??= {})[surface] = grade;
      continue;
    }
    if (sctCode === VERIFIED_SCT.furcationInvolvementIndex) {
      const code = codeIn(comp?.valueCodeableConcept, GLICKMAN_FURCATION_SYSTEM);
      const grade = code === undefined ? undefined : glickmanGradeFromCode(code);
      // Glickman Grade 0 is "assessed, no involvement" — a result, never a
      // stored engine grade, so it must not resurrect a furcation entry.
      if (surface && grade !== undefined && grade > 0) (rec.furcation ??= {})[surface] = grade;
      continue;
    }
    const index = codeIn(comp?.code, PERIODONTAL_INDEX_SYSTEM);
    if (index === PERIODONTAL_INDEX.gingivalIndex) {
      const grade = integerValue(comp);
      if (surface && grade !== undefined && grade > 0) (rec.gi ??= {})[surface] = grade;
      continue;
    }
    if (index === PERIODONTAL_INDEX.modifiedPlaqueIndex) {
      const grade = integerValue(comp);
      if (surface && grade !== undefined && grade > 0) (rec.mpi ??= {})[surface] = grade;
      continue;
    }
    if (index === PERIODONTAL_INDEX.modifiedSulcusBleedingIndex) {
      const grade = integerValue(comp);
      if (surface && grade !== undefined && grade > 0) (rec.mbi ??= {})[surface] = grade;
      continue;
    }
    if (index === PERIODONTAL_INDEX.keratinizedGingivaWidth) {
      const value = numericValue(comp);
      if (value !== undefined) rec.kg = value;
      continue;
    }
    if (codeIn(comp?.code, PA_BEFUND_TYPE_SYSTEM) === PA_BEFUND.suppuration) {
      if (site && comp?.valueBoolean === true) pushOnce(perioRecord(rec).sup, site);
    }
  }
}

/** Apply one canonical resource to the accumulating tooth records. */

/**
 * Read a `DentalImplantDE` Device back onto its tooth (odontogram-im1).
 *
 * The position comes from `FdiToothNumberExt`, not from a bodySite - a Device
 * has none. Nothing here is required: a Device with only the placeholder
 * identifier says an implant is present and nothing more, which is a complete
 * record for one that arrived with the patient, so it sets `toothSelection`
 * and leaves the product absent.
 *
 * The DERIVED fields are not read back from where they were written twice.
 * `lotNumber` and `expirationDate` are re-read from the carrier by the engine's
 * own normalizer, exactly as the recession/margin rule works in this dialect:
 * two elements must never write one field.
 */
function applyImplantDevice(teeth: Record<string, ToothRecord>, dev: Any): void {
  const ext = (Array.isArray(dev.extension) ? dev.extension : [])
    .find((e: Any) => e?.url === FDI_TOOTH_NUMBER_EXT_URL);
  const fdi = typeof ext?.valueCode === "string" ? ext.valueCode : undefined;
  if (!fdi) return;
  const slot = slotForPrimaryFdi(fdi);
  const key = slot === null ? fdi : String(slot);
  const rec = (teeth[key] ??= {});
  rec.toothSelection = "implant";

  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const product: Any = {};
  const manufacturer = str(dev.manufacturer);
  if (manufacturer) product.manufacturer = manufacturer;
  const system = str(dev.modelNumber)
    ?? str((Array.isArray(dev.deviceName) ? dev.deviceName[0]?.name : undefined));
  if (system) product.system = system;

  const carrier = Array.isArray(dev.udiCarrier) ? dev.udiCarrier[0] : undefined;
  const udi = str(carrier?.carrierHRF);
  if (udi) product.udi = udi;
  const di = str(carrier?.deviceIdentifier);
  if (di) product.deviceIdentifier = di;
  // Only where the carrier does not supply them - otherwise the normalizer's
  // re-read is the single source and these would be a second writer.
  if (!udi) {
    const lot = str(dev.lotNumber);
    if (lot) product.lot = lot;
    const expiry = str(dev.expirationDate);
    if (expiry) product.expiry = expiry;
  }
  const serial = str(dev.serialNumber);
  if (serial) product.serial = serial;

  for (const prop of Array.isArray(dev.property) ? dev.property : []) {
    const code = codeIn(prop?.type, DENTAL_DE_IMPLANT_PROPERTY_SYSTEM);
    const q = Array.isArray(prop?.valueQuantity) ? prop.valueQuantity[0] : prop?.valueQuantity;
    const value = typeof q?.value === "number" && Number.isFinite(q.value) ? q.value : undefined;
    if (value === undefined) continue;
    if (code === IMPLANT_PROPERTY.diameter) product.diameterMm = value;
    if (code === IMPLANT_PROPERTY.length) product.lengthMm = value;
  }

  if (Object.keys(product).length > 0) (rec as Any).implantProduct = product;
}

export function applyDentalDeResource(
  teeth: Record<string, ToothRecord>,
  res: unknown,
): void {
  const r = res as {
    meta?: { profile?: unknown };
    code?: unknown; bodySite?: unknown; valueCodeableConcept?: unknown;
    component?: Any[]; note?: Array<{ text?: unknown }>;
  };
  if ((res as Any)?.resourceType === "Device") {
    applyImplantDevice(teeth, res as Any);
    return;
  }
  const coded = codeIn(r.bodySite, DENTAL_DE_FDI_SYSTEM);
  if (!coded) return;
  // A deciduous tooth is charted in its successor's slot here but leaves as its
  // own FDI number, so 51-85 comes back to 11-45 and the record is marked as a
  // milk tooth. Doing it at the key, before anything is written, means every
  // axis the bundle carries for that tooth lands on one record rather than
  // splitting between 51 and 11 (odontogram-e0a).
  const slot = slotForPrimaryFdi(coded);
  const fdi = slot === null ? coded : String(slot);
  const rec = (teeth[fdi] ??= {});
  if (slot !== null) rec.toothSelection = "milktooth";

  const profiles = Array.isArray(r.meta?.profile) ? (r.meta!.profile as string[]) : [];
  if (
    profiles.includes(DENTAL_DE_PERIODONTAL_PROFILE)
    || profiles.includes(DENTAL_DE_PERI_IMPLANT_PROFILE)
  ) {
    applyPeriodontalResource(rec, r.component ?? []);
    return;
  }

  const assessment = codeIn(r.code, DENTAL_DE_ASSESSMENT_SYSTEM);

  if (assessment === "icdas-caries-assessment") {
    const score = codeIn(r.valueCodeableConcept, DENTAL_DE_ICDAS_SYSTEM);
    const surfaces = surfacesOf(r.bodySite);
    if (surfaces.length === 0) return;
    const numeric = Number(score);
    const parsed = score !== undefined && Number.isFinite(numeric) ? numeric : undefined;
    for (const surface of surfaces) addCariesSurface(rec, surface, parsed);
    return;
  }

  if (Array.isArray(r.note) && typeof r.note[0]?.text === "string") {
    rec.note = r.note[0].text as string;
  }

  // DentalFindingDE carries the concepts the odontogram profile has no slice
  // for. The emitter writes a fixed English `code.text` for each; read it back
  // by equality against the SAME constants, never by guessing at free prose.
  const codeText = conceptText(r.code);
  if (codeText) {
    const valueText = conceptText(r.valueCodeableConcept) ?? "";
    const surfaces = surfacesOf(r.bodySite);
    switch (codeText) {
      case FINDING_TEXT.recurrentCaries: {
        const score = scoreAfter(valueText, FINDING_TEXT.carsScorePrefix);
        for (const surface of surfaces) addCariesSurface(rec, surface, score);
        return;
      }
      case FINDING_TEXT.subcrownCaries: {
        const score = scoreAfter(valueText, FINDING_TEXT.severityScorePrefix);
        addCariesSurface(rec, "subcrown", score);
        return;
      }
      case FINDING_TEXT.coronalCaries: {
        for (const surface of surfaces) addCariesSurface(rec, surface);
        return;
      }
      case FINDING_TEXT.radiographicDepth: {
        const depth = valueFromDisplay("radiographicDepth", valueText);
        if (depth) {
          const map = (rec.radiographicDepth ??= {});
          for (const surface of surfaces) map[surface] = depth;
        }
        return;
      }
      case FINDING_TEXT.clinicianNote:
        return; // the note itself was applied above
      default:
        break;
    }
  }

  for (const comp of r.component ?? []) {
    const slice = codeIn(comp?.code, DENTAL_DE_COMPONENT_SYSTEM);
    if (!slice) continue;
    const value = comp?.valueCodeableConcept;
    const text = conceptText(value) ?? "";

    switch (slice) {
      case ODONTO_COMPONENT.toothPresence:
        applyPresence(rec, value);
        break;

      case ODONTO_COMPONENT.rootEndodonticState: {
        // The slice is 0..* and carries five independent engine axes, each
        // emitted as its own component. Resolve the text against exactly the
        // groups the emitter draws from, in that order.
        if (codeIn(value, SNOMED_SYSTEM) === VERIFIED_SCT.rootCanalFillingComplete) {
          rec.endo = "endo-filling";
          break;
        }
        if (text === FINDING_TEXT.rootFillingIncomplete) {
          rec.endo = "endo-filling-incomplete";
          break;
        }
        const endo = valueFromDisplay("endo", text);
        if (endo) { rec.endo = endo; break; }
        const rootCaries = valueFromDisplay("rootCaries", text);
        if (rootCaries) { rec.rootCaries = rootCaries; break; }
        const resorption = valueFromDisplay("resorptionType", text);
        if (resorption) { rec.resorptionType = resorption; break; }
        const apical = valueFromDisplay("apicalDx", text);
        if (apical) { rec.apicalDx = apical; break; }
        const periapical = valueFromDisplay("periapicalType", text);
        if (periapical) rec.periapicalType = periapical;
        break;
      }

      case ODONTO_COMPONENT.restorationType: {
        const code = codeIn(value, DENTAL_DE_RESTORATION_TYPE_SYSTEM);
        const mapped = code ? restorationTypeFromCode(code) : undefined;
        if (mapped) rec.restorationType = mapped;
        const surfaces = surfacesOf(comp);
        if (surfaces.length) rec.fillingSurfaces = surfaces;
        break;
      }

      case ODONTO_COMPONENT.restorationMaterial: {
        const code = codeIn(value, DENTAL_DE_MATERIAL_SYSTEM);
        const mapped = code ? restorationMaterialFromCode(code) : undefined;
        if (mapped) rec.restorationMaterial = mapped;
        break;
      }

      case ODONTO_COMPONENT.restorationStatus: {
        if (text === FINDING_TEXT.marginalLeakage) { rec.crownLeakage = true; break; }
        const defect = valueFromDisplay("fillingDefect", text);
        if (defect) {
          const map = (rec.fillingDefect ??= {});
          for (const surface of surfacesOf(comp)) map[surface] = defect;
        }
        break;
      }

      case ODONTO_COMPONENT.prostheticState: {
        const prosthesis = valueFromDisplay("prosthesis", text);
        if (prosthesis) rec.prosthesis = prosthesis;
        break;
      }

      default:
        break;
    }
  }

  // THE NUMBER DECIDES THE DENTITION. In FDI, 51-85 IS a deciduous tooth - the
  // notation carries the classification, so a present tooth at such a position
  // cannot be a permanent one whatever a presence component says. Our own
  // emitter marks it with a "Primary (deciduous) tooth" display text and reads
  // back correctly either way, but a foreign bundle writing a plain "tooth
  // present" used to arrive as a permanent incisor.
  //
  // Only PRESENCE is overruled. A bundle stating the position is absent, an
  // implant, or unerupted is describing that position, not contradicting the
  // numbering, and is left alone.
  if (slot !== null && rec.toothSelection === "tooth-base") {
    rec.toothSelection = "milktooth";
  }
}
