// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
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
/** `PeriodontalObservationDE` — the six-site periodontal record for one tooth. */
export const DENTAL_DE_PERIODONTAL_PROFILE = `${DENTAL_DE_BASE}/StructureDefinition/periodontal-observation`;
/** `PeriImplantObservationDE` — the peri-implant record around one implant. */
export const DENTAL_DE_PERI_IMPLANT_PROFILE = `${DENTAL_DE_BASE}/StructureDefinition/peri-implant-observation`;
/** `DentalImplantDE` — the Device a `PeriImplantObservationDE` must focus on. */
export const DENTAL_DE_IMPLANT_DEVICE_PROFILE = `${DENTAL_DE_BASE}/StructureDefinition/dental-implant`;

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

/** `PeriodontalMeasurementSiteCS` — the six vendor-neutral probing positions. */
export const PERIODONTAL_SITE_SYSTEM = `${DENTAL_DE_BASE}/CodeSystem/periodontal-measurement-site`;
/** `PeriodontalIndexCS` — named periodontal instruments the audit kept local. */
export const PERIODONTAL_INDEX_SYSTEM = `${DENTAL_DE_BASE}/CodeSystem/periodontal-index`;
/** `GlickmanFurcationGradeCS` — the named Glickman 0/I/II/III/IV scale. */
export const GLICKMAN_FURCATION_SYSTEM = `${DENTAL_DE_BASE}/CodeSystem/glickman-furcation-grade`;
/** `PABefundTypeCS` — structured periodontal component types. */
export const PA_BEFUND_TYPE_SYSTEM = `${DENTAL_DE_BASE}/CodeSystem/pa-befund-type`;
/** `PeriImplantFindingCS` — peri-implant assessment/mobility identifiers. */
export const PERI_IMPLANT_FINDING_SYSTEM = `${DENTAL_DE_BASE}/CodeSystem/peri-implant-finding`;
/** `DentalImplantPropertyCS` — the quantity-valued physical properties a
 *  `DentalImplantDE` slices `Device.property` by. Read from the published
 *  CodeSystem (v0.41.6, active 2026-07-29), not derived. */
export const DENTAL_DE_IMPLANT_PROPERTY_SYSTEM = `${DENTAL_DE_BASE}/CodeSystem/dental-implant-property`;

/** `ToothSurfacesExt` — repeatable; ONE surface code per extension instance. */
export const TOOTH_SURFACES_EXT_URL = `${DENTAL_DE_BASE}/StructureDefinition/tooth-surfaces`;
/** `PeriodontalMeasurementSiteExt` — the probing site one component applies to. */
export const PERIODONTAL_SITE_EXT_URL = `${DENTAL_DE_BASE}/StructureDefinition/periodontal-measurement-site`;
/** `FdiToothNumberExt` — the FDI position a `DentalImplantDE` occupies. */
export const FDI_TOOTH_NUMBER_EXT_URL = `${DENTAL_DE_BASE}/StructureDefinition/fdi-tooth-number`;
/** HL7 Terminology FDI surface CodeSystem, the value space of `ToothSurfacesVS`. */
export const FDI_SURFACE_SYSTEM = "http://terminology.hl7.org/CodeSystem/FDI-surface";
/** SNOMED CT. */
export const SNOMED_SYSTEM = "http://snomed.info/sct";
/** LOINC. */
export const LOINC_SYSTEM = "http://loinc.org";
/** UCUM — the unit system every periodontal Quantity slice fixes. */
export const UCUM_SYSTEM = "http://unitsofmeasure.org";
/** HL7 Terminology `data-absent-reason`, the standard way to say a component
 *  was expected but carries no result. */
export const DATA_ABSENT_REASON_SYSTEM = "http://terminology.hl7.org/CodeSystem/data-absent-reason";

/** LOINC codes the periodontal profiles fix on their component slices. */
export const PERIO_LOINC = {
  /** `PeriodontalObservationDE.code` in the IG's own published example. */
  panel: "8704-9",
  probingDepth: "32910-2",
  /** Signed free-gingival-margin-to-CEJ distance. The SOLE source of truth for
   *  the engine's `perio.gm`; the SNOMED-coded recession component is derived
   *  from it as `max(margin, 0)` and never read back into it. */
  gingivalMarginToCej: "64043-3",
  plaquePresence: "34016-6",
} as const;

/** `PABefundTypeCS` codes the periodontal profiles fix. */
export const PA_BEFUND = {
  attachmentLoss: "attachment-loss",
  suppuration: "suppuration-on-probing",
} as const;

/** `PeriodontalIndexCS` codes the periodontal profiles fix. */
export const PERIODONTAL_INDEX = {
  gingivalIndex: "loe-silness-gingival-index",
  keratinizedGingivaWidth: "keratinized-gingiva-width",
  modifiedPlaqueIndex: "mombelli-modified-plaque-index",
  modifiedSulcusBleedingIndex: "mombelli-modified-sulcus-bleeding-index",
} as const;

/** `PeriImplantFindingCS` codes. */
export const PERI_IMPLANT_FINDING = {
  assessment: "assessment",
  implantMobility: "implant-mobility",
} as const;

/**
 * Engine `PERIO_SITES` -> `PeriodontalMeasurementSiteCS`. The two vocabularies
 * describe the SAME six positions in the same order, so this is an exact 1:1
 * rename with no clinical claim attached to it.
 */
export const PERIODONTAL_SITE_CODE = {
  MB: "mesiobuccal",
  B: "buccal",
  DB: "distobuccal",
  ML: "mesiolingual",
  L: "lingual",
  DL: "distolingual",
} as const;

/** Inverse of {@link PERIODONTAL_SITE_CODE}; unknown codes yield `undefined`. */
export function perioSiteFromCode(code: string): string | undefined {
  for (const [site, canonical] of Object.entries(PERIODONTAL_SITE_CODE)) {
    if (canonical === code) return site;
  }
  return undefined;
}

/**
 * `GlickmanFurcationGradeCS` codes indexed by the engine's integer grade.
 * Index 0 is the IG's explicit "assessed, no involvement" value — it is a
 * clinical result, never a stored engine grade (the engine stores 1..4 only).
 */
export const GLICKMAN_GRADE_CODE = ["0", "I", "II", "III", "IV"] as const;

/** Inverse of {@link GLICKMAN_GRADE_CODE}; unknown codes yield `undefined`. */
export function glickmanGradeFromCode(code: string): number | undefined {
  const index = (GLICKMAN_GRADE_CODE as readonly string[]).indexOf(code);
  return index < 0 ? undefined : index;
}

/**
 * `Device.identifier` system for the placeholder implant identity this adapter
 * has to mint. `PeriImplantObservationDE.focus` is 1..1 onto a `DentalImplantDE`
 * Device, and the editor may know an implant only by the FDI position it
 * occupies. A host that owns a device registry replaces this identifier with
 * its own; keeping the placeholder in a clearly adapter-owned URN keeps it from
 * being mistaken for a real device identity.
 *
 * Since odontogram-im1 the editor CAN know more. Where a UDI is recorded, the
 * device identifier it carries is emitted as a real identifier alongside this
 * one — a GTIN names the product globally, which a URN built from a tooth
 * number never could.
 */
export const IMPLANT_PLACEHOLDER_IDENTIFIER_SYSTEM = "urn:odontogram:dental-implant-position";

/** `Device.type` for an implant. `DentalImplantDE` leaves the type binding open
 *  (example-bound to DeviceType) and the IG's own example uses a text-only
 *  value, so no code is invented here either. */
export const IMPLANT_DEVICE_TYPE_TEXT = "Endosseous dental implant";

/** `DentalImplantPropertyCS` codes, verbatim from the published CodeSystem.
 *  Both are mustSupport slices of `Device.property` on `DentalImplantDE`, so
 *  the IG expects them whenever the practice knows them. */
export const IMPLANT_PROPERTY = {
  /** "Implant diameter" — nominal physical diameter of the dental implant. */
  diameter: "diameter",
  /** "Implant length" — nominal physical length of the dental implant. */
  length: "length",
} as const;

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
 * Fixed English texts the adapter uses for the concepts the IG carries as a
 * `DentalFindingDE`, and for the two restoration/endodontic assessments it
 * spells out rather than coding.
 *
 * They are `CodeableConcept.text` values, not codes: FHIR's own fallback for a
 * source assessment with no admitted concept. Shared by the emitter and the
 * reader so the canonical round-trip is exact — the reader recognizes them by
 * equality and never has to guess at free prose.
 */
export const FINDING_TEXT = {
  rootFillingComplete: "Root canal filling assessed as complete",
  rootFillingIncomplete: "Root canal filling assessed as incomplete",
  marginalLeakage: "Marginal leakage of the restoration",
  recurrentCaries: "Recurrent caries at a restoration margin",
  subcrownCaries: "Subcrown caries (caries beneath a restoration margin)",
  radiographicDepth: "Radiographic caries depth",
  coronalCaries: "Coronal caries observed",
  unscoredCaries: "Caries present, ICDAS score not recorded",
  clinicianNote: "Clinician note",
  implantPresent: "Dental implant present at this position",
  toothUnderGum: "Tooth retained under the gingiva (not erupted)",
  toothNotErupted: "Tooth not erupted",
  toothAbsent: "Tooth absent",
  missingAfterExtraction: "Missing after extraction",
  rootRemnant: "Root remnant (radix)",
  /** Prefix of a recurrent-caries value, followed by the CARS score. */
  carsScorePrefix: "CARS score ",
  /** Prefix of a subcrown-caries value, followed by the severity score. */
  severityScorePrefix: "Severity score ",
} as const;

/**
 * SNOMED CT concepts this adapter is allowed to emit. Every entry is admitted
 * by one of the IG's four clinical ValueSets AND has a meaning verified from an
 * authoritative source — see {@link SCT_PROVENANCE}, which records both facts
 * per code and is asserted by the dialect tests.
 */
export const VERIFIED_SCT = {
  toothPresent: "278661005",
  toothAbsent: "234948008",
  rootRemnant: "66569006",
  rootCanalFillingComplete: "718392007",
  restorationDefective: "109728009",
  // Bead odontogram-chz — widened coverage.
  rootCaries: "234975001",
  internalResorption: "52994003",
  externalResorption: "41918006",
  apicalPeriodontitis: "39273001",
  // Bead odontogram-5cz — the periodontal surface. These are not ValueSet
  // members chosen by this adapter: `PeriodontalObservationDE` and
  // `PeriImplantObservationDE` FIX them on their component slices, which is a
  // stronger admission than an extensible binding. Their meanings were still
  // verified before use — see SCT_PROVENANCE.
  //
  // Bead odontogram-18h — the IG corrected two of those fixed SCTIDs
  // (fhir-dental-de PRs #94-96, main at 27e0b7f), so both entries below moved.
  bleedingOnProbing: "249420004",
  gingivalRecession: "4356008",
  furcationInvolvementIndex: "771311009",
  plaqueIndexSilnessLoe: "251307008",
} as const;

/**
 * HISTORICAL NOTE (bead odontogram-5cz, closed by bead odontogram-18h).
 *
 * `PeriodontalObservationDE` used to fix `component[recession].code` to SNOMED
 * CT `6288001`, which `PeriodontalFindingCodesVS` published with the display
 * "Gingival recession". SNOMED CT International publishes `6288001` as
 * "Accretion on teeth" — a dental deposit, not a recession. Emitting a
 * recession measurement under it would have asserted a deposit finding the
 * source never made, so this adapter emitted no recession component at all and
 * recorded the refusal in a `REJECTED_SCT` table.
 *
 * The defect was reported to the IG (fdde-gu8k) and fixed in fhir-dental-de PR
 * #94: the slice now fixes `4356008` "Gingival recession", which is what SNOMED
 * actually publishes for the concept. The refusal is therefore obsolete, the
 * table is gone, and `VERIFIED_SCT.gingivalRecession` is emitted normally. The
 * verification trail lives on in {@link SCT_PROVENANCE}.
 *
 * The recession value itself stays DERIVED, not stored: the engine records the
 * SIGNED gingival margin, which rides LOINC `64043-3` ("Distance from the free
 * gingival margin, FGM, to the cement-enamel junction, CEJ Tooth [PhenX]"), and
 * recession is `max(margin, 0)`. That direction is one-way — the reader
 * restores the margin from `64043-3` alone and never from the recession
 * component, exactly as it ignores the derived attachment-loss component.
 */

/** Verification record for one admitted SNOMED CT concept. */
export interface SctProvenance {
  /** The SCTID, identical to its {@link VERIFIED_SCT} entry. */
  readonly code: string;
  /**
   * The concept's meaning as published by `verifiedBy`. Documentation only —
   * it is deliberately NOT emitted as `Coding.display`, because the IG omits
   * displays (they are licensed) and this adapter never puts a string on the
   * wire that the IG itself did not publish.
   */
  readonly meaning: string;
  /**
   * Where the IG admits the code: either the ValueSet
   * (`input/fsh/valuesets/<name>.fsh`) that contains it, or — for the
   * periodontal concepts added by bead odontogram-5cz — the profile that fixes
   * it on a component slice, which admits nothing else in that position.
   */
  readonly valueSet:
    | "ToothPresenceStateVS"
    | "RootEndodonticStateVS"
    | "RestorationStatusVS"
    | "ProstheticStateVS"
    | "PeriodontalObservationDE (fixed component code)"
    | "PeriodontalObservationDE / PeriImplantObservationDE (fixed component code)";
  /** Where the meaning was verified, in the order the sourcing rule requires. */
  readonly verifiedBy: string;
}

/**
 * WHERE EACH ADMITTED MEANING COMES FROM (bead odontogram-chz).
 *
 * The IG publishes its clinical SCTIDs without displays, so a code may only be
 * emitted once its meaning is established. Sources, in the order they were
 * consulted:
 *
 *   (a) the IG's own FSH, examples and `scripts/check-odontogram-contract.mjs`;
 *   (b) an authoritative read-only terminology lookup.
 *
 * For (b) the SNOMED International browser API (`browser.ihtsdotools.org`) is
 * behind a human-verification wall and could not be queried, so HL7's own
 * public FHIR terminology server `tx.fhir.org/r4` was used instead — serving
 * the SNOMED CT International edition, version `20250201`. Both the display
 * (`CodeSystem/$lookup`) and the hierarchy claims (`CodeSystem/$subsumes`,
 * `ValueSet/$expand` over `?fhir_vs=isa/<code>`) below come from that server.
 * A `$lookup` display is quoted verbatim; an `$expand` is cited by the members
 * that carry the argument, not reproduced in full — note that `$expand` over
 * `isa/<code>` is inclusive, so the queried concept itself is always among the
 * members it returns.
 *
 * GENERALIZATION RULE. Where an engine value's exact concept is NOT admitted by
 * the IG ValueSet, this adapter emits the nearest ADMITTED ancestor the engine
 * value provably entails, never a sibling and never a more specific concept.
 * Where an engine value spans two disjoint admitted concepts, their nearest
 * admitted common ancestor is used. The exact source assessment always stays in
 * `CodeableConcept.text`, so no precision is lost on the wire.
 */
export const SCT_PROVENANCE: Record<keyof typeof VERIFIED_SCT, SctProvenance> = {
  toothPresent: {
    code: "278661005",
    meaning: "Tooth present",
    valueSet: "ToothPresenceStateVS",
    verifiedBy:
      "IG examples CompleteChartPermanentTooth46 / CompleteChartDeciduousTooth75 / "
      + "CompleteChartIncompleteRootFilling11; tx.fhir.org $lookup 'Tooth present'.",
  },
  toothAbsent: {
    code: "234948008",
    meaning: "Tooth absent",
    valueSet: "ToothPresenceStateVS",
    verifiedBy:
      "IG examples CompleteChartProvisionalProsthesis15 / CompleteChartProstheticPosition14; "
      + "tx.fhir.org $lookup 'Tooth absent'.",
  },
  rootRemnant: {
    code: "66569006",
    meaning: "Retained dental root",
    valueSet: "ToothPresenceStateVS",
    verifiedBy:
      "IG example CompleteChartRootRemnant18 plus the contract assertion "
      + "'root-remnant state must use the admitted SNOMED CT concept'; "
      + "tx.fhir.org $lookup 'Retained dental root'.",
  },
  rootCanalFillingComplete: {
    code: "718392007",
    meaning: "Previously initiated endodontic therapy completed",
    valueSet: "RootEndodonticStateVS",
    verifiedBy:
      "IG example CompleteChartPermanentTooth46 plus the contract assertion on "
      + "'Root canal filling assessed as complete'; tx.fhir.org $lookup "
      + "'Previously initiated endodontic therapy completed'.",
  },
  restorationDefective: {
    code: "109728009",
    meaning: "Defective dental restoration",
    valueSet: "RestorationStatusVS",
    verifiedBy:
      "IG example CompleteChartPermanentTooth46 ('defective surface-qualified onlay'); "
      + "tx.fhir.org $lookup 'Defective dental restoration'. $expand isa/109728009 lists "
      + "278549007 'Leaking dental restoration', 109741008 'Fractured dental restoration', "
      + "109729001 'Overhang on tooth restoration' and 109735001 'Dental restoration failure "
      + "of marginal integrity' as descendants, and $subsumes shows 109735001 does NOT subsume "
      + "278549007 and 702645001 does NOT subsume 109741008 — so this parent, not one of the "
      + "specific admitted siblings, is the concept every engine defect value entails.",
  },
  rootCaries: {
    code: "234975001",
    meaning: "Root caries",
    valueSet: "RootEndodonticStateVS",
    verifiedBy:
      "Admitted by RootEndodonticStateVS; tx.fhir.org $lookup 'Root caries'. Exact for every "
      + "graded engine value (active / arrested / active-cavitated); the grade stays in text.",
  },
  internalResorption: {
    code: "52994003",
    meaning: "Internal resorption of tooth",
    valueSet: "RootEndodonticStateVS",
    verifiedBy:
      "Admitted by RootEndodonticStateVS; tx.fhir.org $lookup 'Internal resorption of tooth'. "
      + "Exact for the engine's `internal` value.",
  },
  externalResorption: {
    code: "41918006",
    meaning: "External resorption of tooth",
    valueSet: "RootEndodonticStateVS",
    verifiedBy:
      "Admitted by RootEndodonticStateVS; tx.fhir.org $lookup 'External resorption of tooth'. "
      + "$expand isa/41918006 lists 708463003 'Cervical root resorption' and 698192005 "
      + "'Invasive cervical resorption' as descendants, so the engine's `external-cervical` "
      + "value entails this admitted parent; the specific children are not admitted.",
  },
  apicalPeriodontitis: {
    code: "39273001",
    meaning: "Apical periodontitis",
    valueSet: "RootEndodonticStateVS",
    verifiedBy:
      "Admitted by RootEndodonticStateVS; tx.fhir.org $lookup 'Apical periodontitis'. "
      + "$expand isa/39273001 returns four members — 39273001 itself, 718052004 'Asymptomatic "
      + "periapical periodontitis', 718053009 'Symptomatic periapical periodontitis' and "
      + "1230140003 'Inflammatory lesion of periapical tissue surrounding dental implant' — so "
      + "the two AAE engine values entail this admitted parent while the abscess and condensing-"
      + "osteitis values do NOT and stay on text. The IG contract forbids coding an observed "
      + "radiolucency as a diagnosis; the engine's `apicalDx` IS the apical diagnosis, so no "
      + "such upgrade happens here.",
  },
  bleedingOnProbing: {
    code: "249420004",
    meaning: "Bleeding on probing of gingivae",
    valueSet: "PeriodontalObservationDE / PeriImplantObservationDE (fixed component code)",
    verifiedBy:
      "Fixed by both profiles on `component[bop]` and additionally listed in PeriodontalFindingCodesVS; "
      + "tx.fhir.org $lookup returns 'Bleeding on probing of gingivae' (FSN 'Bleeding on probing of "
      + "gingivae (finding)'), which is EXACT for the engine's per-site BOP axis. Bead odontogram-18h: "
      + "fhir-dental-de PR #94 moved this slice from 86276007 ('Bleeding gums', a generalization this "
      + "adapter emitted in v2.6.0-2.7.1) to 249420004, so the emitter now writes the exact concept and "
      + "the reader still accepts 86276007 from bundles those releases wrote.",
  },
  gingivalRecession: {
    code: "4356008",
    meaning: "Gingival recession",
    valueSet: "PeriodontalObservationDE (fixed component code)",
    verifiedBy:
      "Fixed by PeriodontalObservationDE on `component[recession]` and listed in "
      + "PeriodontalFindingCodesVS; tx.fhir.org $lookup over SNOMED CT International edition version "
      + "20250201 returns 'Gingival recession' (FSN 'Gingival recession (disorder)'). Bead "
      + "odontogram-5cz refused the SCTID this slice used to fix, 6288001, because the same server "
      + "returns 'Accretion on teeth' for it; fhir-dental-de PR #94 corrected the slice (fdde-gu8k), "
      + "so the refusal is retired and the recession derived from the signed margin is emitted.",
  },
  furcationInvolvementIndex: {
    code: "771311009",
    meaning: "Tooth furcation involvement index for assessment of periodontal disease",
    valueSet: "PeriodontalObservationDE (fixed component code)",
    verifiedBy:
      "Fixed by PeriodontalObservationDE on `component[furcation]`; tx.fhir.org $lookup returns "
      + "'Tooth furcation involvement index for assessment of periodontal disease'. Exact: the component "
      + "identifies the assessment scale and the Glickman grade rides in the value.",
  },
  plaqueIndexSilnessLoe: {
    code: "251307008",
    meaning: "Plaque index of Sillness and Loe",
    valueSet: "PeriodontalObservationDE (fixed component code)",
    verifiedBy:
      "Fixed by PeriodontalObservationDE on `component[plaqueIndex]`; tx.fhir.org $lookup returns "
      + "'Plaque index of Sillness and Loe'. Exact for the engine's Silness-Loe `pi` axis.",
  },
};

/**
 * Engine `rootCaries` -> admitted SNOMED concept. Each of the three graded
 * values IS root caries, so all three code to the same concept and the grade
 * itself — which has no admitted concept — stays in `.text`.
 *
 * This is a WHITELIST, not a not-`"none"` test, exactly like `resorptionSct`
 * and `apicalDxSct`. A value this build has never verified (a newer payload
 * version, or a malformed document) must fall back to text rather than acquire
 * a canonical SNOMED assertion nobody checked.
 */
export function rootCariesSct(value: string): string | undefined {
  switch (value) {
    case "active":
    case "arrested":
    case "active-cavitated":
      return VERIFIED_SCT.rootCaries;
    default: return undefined;
  }
}

/** Engine `resorptionType` -> admitted SNOMED concept. */
export function resorptionSct(value: string): string | undefined {
  switch (value) {
    case "internal": return VERIFIED_SCT.internalResorption;
    // External cervical resorption is a verified descendant of the admitted
    // parent; the exact subtype stays in `.text`.
    case "external-cervical": return VERIFIED_SCT.externalResorption;
    default: return undefined;
  }
}

/**
 * Engine `apicalDx` -> admitted SNOMED concept. Only the two values SNOMED
 * places under `39273001` are coded. An apical abscess and condensing osteitis
 * are NOT apical periodontitis and keep the text fallback.
 */
export function apicalDxSct(value: string): string | undefined {
  switch (value) {
    case "symptomatic-apical-periodontitis":
    case "asymptomatic-apical-periodontitis":
      return VERIFIED_SCT.apicalPeriodontitis;
    default: return undefined;
  }
}

/**
 * Engine restoration-integrity findings -> admitted SNOMED concept.
 *
 * `RestorationStatusVS` admits four concepts: `109728009` and three of its
 * children (`109729001` overhang, `109735001` marginal-integrity failure,
 * `702645001` cohesive failure). None of the engine's findings entails one of
 * those children:
 *
 *   - `crownLeakage` is a leaking restoration (`278549007`), which $subsumes
 *     reports is NOT under `109735001`;
 *   - `fillingDefect: "marginal"` reads "overhang / deficient margin" and so
 *     spans the disjoint `109729001` and `109735001`;
 *   - `fillingDefect: "fracture"` is a fractured restoration (`109741008`),
 *     which $subsumes reports is NOT under `702645001` (cohesive failure names
 *     a specific failure mode the engine value never states);
 *   - `fillingDefect: "wear"` has no admitted specific concept at all.
 *
 * All four therefore emit the admitted common ancestor, with the exact finding
 * preserved in `.text`.
 */
export function restorationStatusSct(): string {
  return VERIFIED_SCT.restorationDefective;
}

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
