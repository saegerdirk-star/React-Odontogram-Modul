// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
//
// Canonical identifiers of the `fhir-dental-de` implementation guide
// (`de.cognovis.fhir.dental`, canonical base `https://fhir.cognovis.de/dental`).
//
// SOURCING RULE (bead odontogram-3l1). Every URL and every code below is copied
// verbatim from the published IG definition; nothing here is invented, guessed
// or derived from a renderer enum. Two categories exist:
//
//   1. STRUCTURAL identifiers (profiles, component codes, assessment types,
//      FDI tooth positions, ICDAS scores, restoration types, materials). These
//      are IG-owned and fully enumerable from its CodeSystems.
//   2. CLINICAL SNOMED CT concepts. The IG deliberately publishes SCTIDs
//      WITHOUT displays, because the displays are licensed. Only the concepts
//      whose meaning is provable from the IG's own published examples and its
//      `scripts/check-odontogram-contract.mjs` assertions are listed here. Any
//      other clinical value is emitted as `CodeableConcept.text` under the
//      relevant EXTENSIBLE binding — which is the pattern the IG itself uses
//      and enforces (see `CompleteChartIncompleteRootFilling11`,
//      `CompleteChartPartiallyErupted48`, `CompleteChartLostRestoration25`,
//      `CompleteChartProvisionalProsthesis15`).
//
// Guessing an SCTID would be worse than a text value: text preserves the exact
// source assessment, an invented code silently asserts something else.

/** IG canonical base. */
export const DENTAL_DE_BASE = "https://fhir.cognovis.de/dental";

/** `OdontogramObservationDE` — observed state for one FDI position. */
export const DENTAL_DE_ODONTOGRAM_PROFILE = `${DENTAL_DE_BASE}/StructureDefinition/odontogram-observation`;
/** `CariesObservationDE` — surface-specific ICDAS coronal caries score. */
export const DENTAL_DE_CARIES_PROFILE = `${DENTAL_DE_BASE}/StructureDefinition/caries-observation`;
/** `DentalFindingDE` — the canonical carrier for observed tooth/surface detail
 *  that is not one of the odontogram profile's own component slices. */
export const DENTAL_DE_FINDING_PROFILE = `${DENTAL_DE_BASE}/StructureDefinition/dental-finding`;

/** `OdontogramComponentCS` — structural component identifiers (NOT clinical). */
export const DENTAL_DE_COMPONENT_SYSTEM = `${DENTAL_DE_BASE}/CodeSystem/odontogram-component`;
/** `DentalAssessmentTypeCS` — stable assessment-profile identifiers. */
export const DENTAL_DE_ASSESSMENT_SYSTEM = `${DENTAL_DE_BASE}/CodeSystem/dental-assessment-type`;
/** `DentalCategoryCS` — the `dental` Observation category required by DentalFindingDE. */
export const DENTAL_DE_CATEGORY_SYSTEM = `${DENTAL_DE_BASE}/CodeSystem/dental-category`;
/** `ToothIdentificationFDICS` — FDI/ISO 3950 tooth positions. */
export const DENTAL_DE_FDI_SYSTEM = `${DENTAL_DE_BASE}/CodeSystem/tooth-identification-fdi`;
/** `ICDASCariesScoreCS` — ICDAS II coronal lesion scores 0..6. */
export const DENTAL_DE_ICDAS_SYSTEM = `${DENTAL_DE_BASE}/CodeSystem/icdas-caries-score`;
/** `RestorationTypeCS` — laboratory restoration/prosthetic construction types. */
export const DENTAL_DE_RESTORATION_TYPE_SYSTEM = `${DENTAL_DE_BASE}/CodeSystem/restoration-type`;
/** `DentalMaterialCS` — laboratory restoration materials. */
export const DENTAL_DE_MATERIAL_SYSTEM = `${DENTAL_DE_BASE}/CodeSystem/dental-material`;

/** `ToothSurfacesExt` — repeatable; ONE surface code per extension instance. */
export const TOOTH_SURFACES_EXT_URL = `${DENTAL_DE_BASE}/StructureDefinition/tooth-surfaces`;
/** HL7 Terminology FDI surface CodeSystem, the value space of `ToothSurfacesVS`. */
export const FDI_SURFACE_SYSTEM = "http://terminology.hl7.org/CodeSystem/FDI-surface";
/** SNOMED CT. */
export const SNOMED_SYSTEM = "http://snomed.info/sct";

/** Component slice codes of `OdontogramObservationDE` (`OdontogramComponentCS`). */
export const ODONTO_COMPONENT = {
  toothPresence: "tooth-presence",
  rootEndodonticState: "root-endodontic-state",
  restorationType: "restoration-type",
  restorationMaterial: "restoration-material",
  restorationStatus: "restoration-status",
  prostheticState: "prosthetic-state",
} as const;

/**
 * SNOMED CT concepts whose meaning is PROVABLE from the IG's own published
 * artifacts. Each entry names the artifact that fixes its meaning.
 *
 * - `278661005` — present tooth. `CompleteChartPermanentTooth46`,
 *   `CompleteChartDeciduousTooth75`, `CompleteChartIncompleteRootFilling11`.
 * - `234948008` — absent tooth position. `CompleteChartProvisionalProsthesis15`
 *   and `CompleteChartProstheticPosition14` (positions carrying a prosthesis).
 * - `66569006` — root remnant. `CompleteChartRootRemnant18` plus the contract
 *   assertion "root-remnant state must use the admitted SNOMED CT concept".
 * - `718392007` — completed root-canal filling. `CompleteChartPermanentTooth46`
 *   plus the contract assertion on "Root canal filling assessed as complete".
 * - `109728009` — defective restoration. `CompleteChartPermanentTooth46`
 *   ("defective surface-qualified lithium-disilicate onlay").
 */
export const VERIFIED_SCT = {
  toothPresent: "278661005",
  toothAbsent: "234948008",
  rootRemnant: "66569006",
  rootCanalFillingComplete: "718392007",
  restorationDefective: "109728009",
} as const;

/**
 * HL7 FDI-surface codes. `I` (incisal) and `O` (occlusal) are POSITION
 * dependent, `V` (vestibular) is a synonym of the buccal aspect, and the combo
 * codes are multi-surface shorthands the IG's ValueSet admits.
 */
export const FDI_SURFACE = {
  mesial: "M",
  distal: "D",
  buccal: "B",
  lingual: "L",
  occlusal: "O",
  incisal: "I",
} as const;

/** Combo FDI-surface codes, expanded to their single-surface members. */
const FDI_SURFACE_COMBOS: Record<string, string[]> = {
  MO: ["M", "O"],
  DO: ["D", "O"],
  DI: ["D", "I"],
  MOD: ["M", "O", "D"],
};

/**
 * Anterior positions (incisors and canines) in FDI notation: the last digit is
 * 1, 2 or 3 in every quadrant, permanent and deciduous alike. Kept local to the
 * FHIR adapter on purpose — importing the engine's `isAnteriorTooth` would
 * couple the pure codec to the stateful editor module (AC4).
 */
export function isAnteriorFdi(fdi: string): boolean {
  const position = Number(fdi) % 10;
  return position >= 1 && position <= 3;
}

/**
 * Map an engine surface key to its HL7 FDI-surface code for a given tooth.
 * The engine stores `"occlusal"` for the biting surface of every tooth; FDI
 * calls that surface INCISAL on an anterior tooth, so the emitted code is
 * position-aware. `"subcrown"` has no FDI-surface counterpart and returns
 * `undefined` (its caller reports it instead of inventing a code).
 */
export function toFdiSurface(surface: string, fdi: string): string | undefined {
  switch (surface) {
    case "mesial": return FDI_SURFACE.mesial;
    case "distal": return FDI_SURFACE.distal;
    case "buccal": return FDI_SURFACE.buccal;
    case "lingual": return FDI_SURFACE.lingual;
    case "occlusal": return isAnteriorFdi(fdi) ? FDI_SURFACE.incisal : FDI_SURFACE.occlusal;
    default: return undefined;
  }
}

/**
 * Inverse of {@link toFdiSurface}, tolerant of every code in `ToothSurfacesVS`.
 * `I` folds back onto the engine's `"occlusal"` key (the stored key is
 * position-independent) and `V` onto `"buccal"`; combo codes expand to their
 * members. Unknown codes yield an empty list rather than a guess.
 */
export function fromFdiSurface(code: string): string[] {
  const upper = String(code || "").toUpperCase();
  const members = FDI_SURFACE_COMBOS[upper] ?? [upper];
  const out: string[] = [];
  for (const m of members) {
    switch (m) {
      case "M": out.push("mesial"); break;
      case "D": out.push("distal"); break;
      case "B": case "V": out.push("buccal"); break;
      case "L": out.push("lingual"); break;
      case "O": case "I": out.push("occlusal"); break;
      default: break;
    }
  }
  return out;
}

/**
 * Engine `restorationType` -> `RestorationTypeCS`. The binding is REQUIRED, so
 * an unmapped value is omitted and reported instead of being coerced.
 * `bridge` and `crown` resolve differently on an implant position and on a
 * pontic (gap) position, which is exactly what the CodeSystem distinguishes.
 */
export function restorationTypeCode(
  restorationType: string,
  toothSelection: string | undefined,
): string | undefined {
  const onImplant = toothSelection === "implant";
  const onGap = toothSelection === "none" || toothSelection === "no-tooth-after-extraction";
  switch (restorationType) {
    case "crown": return onImplant ? "implantat-krone" : "krone";
    case "inlay": return "inlay";
    case "onlay": return "onlay";
    case "veneer": return "veneer";
    case "bridge":
      if (onImplant) return "implantat-bruecke";
      return onGap ? "brueckenglied" : "brueckenanker";
    default: return undefined;
  }
}

/**
 * Engine `restorationMaterial` -> `DentalMaterialCS`. Only material classes the
 * CodeSystem's own definitions name explicitly are mapped:
 * `lithiumdisilikat` ("z.B. IPS e.max"), `zirkon`, `komposit` ("laborgefertigter
 * Komposit" — the engine's Gradia), `vmk` ("Verblend-Metall-Keramik", i.e. PFM)
 * and `edelmetall` ("Edelmetall-Legierung (Gold, Platin)").
 *
 * Deliberately UNMAPPED: `metal` (ambiguous between `nem` and `edelmetall`),
 * `telescope` (a construction type, not a material — `RestorationTypeCS#teleskop`)
 * and `temporary` (a lifecycle state, not a material). Direct filling materials
 * (amalgam, composite, GIC) are absent from `DentalMaterialCS`, which covers
 * laboratory work only.
 */
export function restorationMaterialCode(material: string): string | undefined {
  switch (material) {
    case "emax": return "lithiumdisilikat";
    case "zircon": return "zirkon";
    case "gradia": return "komposit";
    case "metal-ceramic": return "vmk";
    case "gold": return "edelmetall";
    default: return undefined;
  }
}
