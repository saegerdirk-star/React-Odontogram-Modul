// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
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
import {
  DENTAL_DE_ODONTOGRAM_PROFILE, DENTAL_DE_CARIES_PROFILE,
  DENTAL_DE_COMPONENT_SYSTEM, DENTAL_DE_ASSESSMENT_SYSTEM,
  DENTAL_DE_FDI_SYSTEM, DENTAL_DE_ICDAS_SYSTEM,
  DENTAL_DE_RESTORATION_TYPE_SYSTEM, DENTAL_DE_MATERIAL_SYSTEM,
  TOOTH_SURFACES_EXT_URL, FDI_SURFACE_SYSTEM, SNOMED_SYSTEM,
  ODONTO_COMPONENT, VERIFIED_SCT, fromFdiSurface,
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

/** True when the resource is a canonical Dental-DE odontogram/caries resource. */
export function isDentalDeResource(res: unknown): boolean {
  const r = res as {
    resourceType?: string; meta?: { profile?: unknown }; code?: unknown; component?: Any[];
  } | undefined;
  if (!r || r.resourceType !== "Observation") return false;
  const profiles = Array.isArray(r.meta?.profile) ? (r.meta!.profile as string[]) : [];
  if (profiles.includes(DENTAL_DE_ODONTOGRAM_PROFILE) || profiles.includes(DENTAL_DE_CARIES_PROFILE)) return true;
  const assessment = codeIn(r.code, DENTAL_DE_ASSESSMENT_SYSTEM);
  if (assessment === "odontogram-assessment" || assessment === "icdas-caries-assessment") return true;
  return (r.component ?? []).some((c) => !!codeIn(c?.code, DENTAL_DE_COMPONENT_SYSTEM));
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
    rec.toothSelection = /extraction/i.test(text) ? "no-tooth-after-extraction" : "none";
    return;
  }
  if (/implant/i.test(text)) { rec.toothSelection = "implant"; return; }
  if (/gingiva|not erupted/i.test(text)) { rec.toothSelection = "tooth-under-gum"; return; }
}

/** Apply one canonical resource to the accumulating tooth records. */
export function applyDentalDeResource(
  teeth: Record<string, ToothRecord>,
  res: unknown,
): void {
  const r = res as {
    code?: unknown; bodySite?: unknown; valueCodeableConcept?: unknown;
    component?: Any[]; note?: Array<{ text?: unknown }>;
  };
  const fdi = codeIn(r.bodySite, DENTAL_DE_FDI_SYSTEM);
  if (!fdi) return;
  const rec = (teeth[fdi] ??= {});

  const assessment = codeIn(r.code, DENTAL_DE_ASSESSMENT_SYSTEM);

  if (assessment === "icdas-caries-assessment") {
    const score = codeIn(r.valueCodeableConcept, DENTAL_DE_ICDAS_SYSTEM);
    const surfaces = surfacesOf(r.bodySite);
    if (surfaces.length === 0) return;
    const caries = (rec.caries ??= []);
    const severity = (rec.cariesSeverity ??= {});
    for (const surface of surfaces) {
      const key = `caries-${surface}`;
      if (!caries.includes(key)) caries.push(key);
      const numeric = Number(score);
      if (score !== undefined && Number.isFinite(numeric)) severity[surface] = numeric;
    }
    return;
  }

  if (Array.isArray(r.note) && typeof r.note[0]?.text === "string") {
    rec.note = r.note[0].text as string;
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
        if (codeIn(value, SNOMED_SYSTEM) === VERIFIED_SCT.rootCanalFillingComplete) {
          rec.endo = "endo-filling";
        } else if (/incomplete/i.test(text)) {
          rec.endo = "endo-filling-incomplete";
        }
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
        if (/leakage/i.test(text)) rec.crownLeakage = true;
        break;
      }

      default:
        break;
    }
  }
}
