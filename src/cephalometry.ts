// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Bead odontogram-c51.2: cephalometry — one landmark set, derived measures, and
// the analyses as profiles over them.
//
// DEPENDENCY-FREE and PURE, like `perioClassification.ts` and
// `modelAnalysis.ts`: nothing is imported from the engine, there is no
// module-level mutable state, and neither `Date` nor `Math.random` is called.
//
// THE FINDING THIS FILE IS BUILT ON. A cephalometric "school" is not a separate
// way of measuring. It is a SELECTION from one shared landmark set, a norm set,
// and an interpretation rule. Dirk's own printout proved it: a sheet titled for
// one school carried seven authors side by side. So there are three layers —
//
//   1. LANDMARKS   the point stock. The only thing actually measured.
//   2. MEASURES    angles, distances, indices. Each a pure function or, where
//                  the examiner types the value straight in, a plain reading.
//   3. PROFILES    a school = a selection from layer 2 + norms + a reference
//                  frame + an interpretation rule.
//
// A new school is a new entry in layer 3. Layers 1 and 2 do not move.
//
// SOURCING RULE (bead ruling 2026-08-12). Every measure carries a `source`, and
// a norm without one is not shipped — the field is `null` and the UI shows the
// measure without a target rather than inventing a number. The procedure export
// from the practice software is a TESTBED, never a template: it establishes
// which analyses are actually needed and whether our arithmetic reproduces the
// printed values. Where a coefficient came from the export rather than from a
// publication that was read, the source string says so in as many words.
//
// REFERENCE FRAME BELONGS TO THE PROFILE, never to this module. Sato's Denture
// Frame Analysis deliberately uses no cranial reference at all; a model that
// hard-codes one cannot represent it.

// ---- Layer 1: landmarks ---------------------------------------------------

/**
 * The point stock. `kind` follows the standard three-way split: anatomic points
 * sit on a bony structure, radiographic ones at the crossing of two shadows,
 * constructed ones are computed from others and are never digitised.
 */
export type LandmarkKind = "anatomic" | "radiographic" | "constructed";

export interface Landmark {
  id: string;
  /** Latin/standard name. Not translated — these are the same in every clinic. */
  name: string;
  kind: LandmarkKind;
  /** For a constructed point, the points it derives from. */
  from?: string[];
}

export const LANDMARKS: readonly Landmark[] = [
  { id: "S", name: "Sella", kind: "constructed", from: [] },
  { id: "N", name: "Nasion", kind: "anatomic" },
  { id: "Ba", name: "Basion", kind: "anatomic" },
  { id: "Ar", name: "Articulare", kind: "radiographic" },
  { id: "Pt", name: "Pterygoid", kind: "radiographic" },
  // Die Frankfurter Horizontale. Sie kam mit der Ricketts-Analyse dazu: Hasund
  // misst gegen die vordere Schaedelbasis, Ricketts gegen Po-Or, und ein Profil
  // deklariert seinen Bezugsrahmen genau deshalb selbst.
  { id: "Po", name: "Porion", kind: "anatomic" },
  { id: "Or", name: "Orbitale", kind: "anatomic" },
  { id: "A", name: "A-Punkt (Subspinale)", kind: "anatomic" },
  { id: "B", name: "B-Punkt (Supramentale)", kind: "anatomic" },
  { id: "Pg", name: "Pogonion", kind: "anatomic" },
  { id: "Gn", name: "Gnathion", kind: "constructed", from: ["Pg", "Me"] },
  { id: "Me", name: "Menton", kind: "anatomic" },
  { id: "Go", name: "Gonion", kind: "constructed", from: ["Ar", "Me"] },
  { id: "tgo", name: "Tangentengonion", kind: "constructed", from: ["Ar", "Me"] },
  { id: "Sp", name: "Spina nasalis anterior", kind: "anatomic" },
  { id: "Spp", name: "Spina nasalis posterior", kind: "anatomic" },
  { id: "Sp1", name: "Sp' (Projektion auf NL)", kind: "constructed", from: ["Sp", "Spp"] },
  { id: "Is1_", name: "Inzisalkante OK-1", kind: "anatomic" },
  { id: "Ap1_", name: "Apex OK-1", kind: "anatomic" },
  { id: "Is1-", name: "Inzisalkante UK-1", kind: "anatomic" },
  { id: "Ap1-", name: "Apex UK-1", kind: "anatomic" },
  { id: "Occl", name: "Okklusionsebene", kind: "constructed", from: ["Is1_", "Is1-"] },
  // Fuer die Steiner-Analyse (odontogram-c51.2, aus dem FRWin-Katalog uebernommen).
  { id: "D", name: "Mitte UK-Symphyse", kind: "anatomic" },
  { id: "Ct", name: "Tangentenpunkt UK (Steiner GoGn)", kind: "anatomic" },
  { id: "Condp", name: "Condylus posterior", kind: "anatomic" },
  { id: "ls", name: "Labrale superius", kind: "anatomic" },
  { id: "li", name: "Labrale inferius", kind: "anatomic" },
  { id: "sn", name: "Subnasale", kind: "anatomic" },
  { id: "no", name: "Nasenspitze", kind: "anatomic" },
  { id: "pog", name: "Weichteil-Pogonion", kind: "anatomic" },
  // Weichteilpunkte fuer die Fotostat-Analyse nach Powell (odontogram-c51.3).
  { id: "gb", name: "Glabella (Weichteil)", kind: "anatomic" },
  { id: "ce", name: "Zervikalpunkt (Weichteil)", kind: "anatomic" },
  { id: "ctg", name: "Columella-Tangentenpunkt", kind: "anatomic" },
];

// ---- Layer 2: measures ----------------------------------------------------

export type MeasureUnit = "deg" | "mm" | "percent";

/**
 * One measurable quantity. `norm`/`sd` are `null` whenever no publication could
 * be produced for them — the sourcing rule forbids shipping an unsourced target,
 * and a measure without a norm is still perfectly useful as a recorded value.
 */
export interface CephMeasure {
  id: string;
  /** Translation key for the display label. */
  labelKey: string;
  unit: MeasureUnit;
  /** Landmarks the measure is defined over; for an angle, two lines of two. */
  points: string[];
  norm: number | null;
  sd: number | null;
  /** Mandatory. Where the NORM comes from, or why there is none. */
  source: string;
  /**
   * WELCHES BILD gemessen wird (Bead odontogram-c51.3): das Fernroentgen
   * (`film`, Standard) oder die Profilfotografie (`photo`). Dieselbe
   * Weichteilgroesse kommt in beiden vor - der H-Winkel auf dem Film, Powells
   * Winkel auf dem Foto -, und der Datensatz muss sagen, WOHER ein Wert stammt.
   * Genau das leistet dieses Feld. Fehlt es, ist es Film.
   */
  medium?: "film" | "photo";
  /** Which way a value above the norm reads for the growth pattern. */
  growth?: "higher-is-vertical" | "higher-is-horizontal";
  /**
   * FHIR coding, carried HERE rather than in a later mapping table. The engine
   * already does it this way for tooth axes (`ClinicalAxis.finding` /
   * `AxisValue.coding` in `registry/types.ts`), and the reason is exactly the
   * one Dirk raised: a separate translation layer is a second place to get the
   * same fact wrong, and it drifts.
   *
   * `local` is always present and is the round-trip key. `loinc` and `snomed`
   * are OPTIONAL and left unset — no verified standard code for a cephalometric
   * measurement has been produced, and inventing one would silently assert
   * something false. That is the same call `toFhirPerio.ts` already makes for
   * per-site BOP, plaque and the Mombelli indices.
   *
   * `ucum` is the unit code for `Observation.valueQuantity`, in the shape
   * `toFhirPerio.ts` already emits: `{ value, unit, system: UCUM, code }`.
   */
  coding: { local: string; ucum: "deg" | "mm" | "%"; loinc?: string; snomed?: string };
  /**
   * PUBLISHED growth bands, where the literature states them outright. These
   * beat the standard-deviation rule, which is only a fallback for a parameter
   * that has a norm but no published band — a growth type is a clinical
   * tendency, not a statistical outlier, and an author who published thresholds
   * knew that better than an SD multiple does.
   */
  bands?: { horizontalAbove: number; verticalBelow: number; bandSource?: string };
}

const PADDENBERG =
  "Paddenberg et al., Floating norms for individualising the ANB angle and the WITS "
  + "appraisal, J Orofac Orthop 2021 (Tab. 1), Universität Regensburg";
// The norm set the Bergen technique is actually built on, and the one Dirk's own
// school uses. Read from the norm table of the Regensburg university orthodontic
// clinic, which states its provenance in as many words: "Diese Normwerte leiten
// sich von den von Segner et al. (1998) veröffentlichten Normen ab."
const SEGNER =
  "Segner & Hasund, Individualisierte Kephalometrie 1998 — norms and standard "
  + "deviations as tabulated by the orthodontic clinic of Universitätsklinikum "
  + "Regensburg (dissertation, Tab. 4), which cites Segner et al. 1998 as their source";
const JARABAK_BANDS =
  "Jarabak & Fizzell, Technique and treatment with light-wire edgewise appliances — "
  + "the published growth bands, quoted second-hand from the orthodontic literature; "
  + "the original has not been read";
// Die Winkel des Jarabak-Polygons und ihre Normen. Wortgleich behandelt wie
// JARABAK_BANDS gleich darueber, und aus demselben Grund: das Original ist hier
// nicht gelesen worden. Die Beleg-Regel verlangt nicht die gelesene
// Publikation, sondern die Angabe, woher der Wert stammt.
const JARABAK_NORMS =
  "Jarabak & Fizzell, Technique and treatment with light-wire edgewise appliances — "
  + "the angles of the polygon and their norms, quoted second-hand from the "
  + "orthodontic literature; the original has not been read";
// Der obere und der untere Teilwinkel des Kieferwinkels. Die Literatur gibt
// BEREICHE an (52-55 Grad und 70-75 Grad), keinen Mittelwert mit Streuung. Ein
// Bereich ist keine Standardabweichung, und ihn in eine umzurechnen hiesse,
// eine Genauigkeit zu behaupten, die die Quelle nicht hergibt - also wird die
// Messgroesse ohne Zielwert gefuehrt, wie die Beleg-Regel es vorsieht.
const GONION_GETEILT =
  "Jarabak's split gonial angle — the literature states a RANGE (52-55 deg upper, "
  + "70-75 deg lower), not a mean with a standard deviation. Converting a range "
  + "into a scatter it is not would assert a precision the source does not give, "
  + "so the measure is recorded with no target (sourcing rule, bead odontogram-c51.2)";
const HASUND =
  "Habersack & Hasund, Klinische Anwendung der individualisierten Kephalometrie, "
  + "SAM Präzisionstechnik 2013";
// Die Ricketts-Normen, wie Dirk sie am 22.08.2026 angegeben hat (Erwachsenen-
// norm). Sie sind KLINISCH belegt und nicht bibliographisch: die Originale
// (Ricketts 1960, 1981) sind hier nicht gelesen worden. Dieselbe Behandlung wie
// bei JARABAK_BANDS - die Beleg-Regel verlangt nicht, dass eine Zahl aus einer
// gelesenen Publikation stammt, sondern dass dasteht, woher sie stammt.
const RICKETTS =
  "Ricketts analysis, adult norms as given by Dirk Saeger (practising dentist) "
  + "on 2026-08-22; the original publications (Ricketts 1960, 1981) have not "
  + "been read here, so these are clinically vouched for, not bibliographically";
// Die oeffentlich gebraeuchlichen Analysen des FRWin-Katalogs (Dirk,
// 22.08.2026). Sie tragen KEINE genannte Quelle - und zwar bewusst:
//
//   (1) Die Software nennt selbst zu keiner Messgroesse einen Autor oder ein
//       Jahr; sie als "Quelle: FRWin" auszuzeichnen waere weder wahr (FRWin ist
//       der Traeger, nicht der Autor) noch unbedenklich (es liesse sich als
//       Uebernahme ihrer Zusammenstellung lesen). Dirks Einwand.
//   (2) Meine eigene Regel verbietet, eine Publikation zu ZITIEREN, die ich
//       nicht gelesen habe - auch die bekannte (Steiner 1953). Also nenne ich
//       keine.
//
// Ein Normwert ist eine Tatsache, kein Werk; die Norm wird ausgeliefert, die
// Herkunft bleibt offen, und der Anwender prueft sie gegen das Original. Das
// `source`-Feld wird dem Anwender NIE gezeigt (es steht in keiner Zeile der
// Karte) - es haelt diese Entscheidung nur nachvollziehbar fest. Der
// Sourcing-Test verlangt lediglich, dass hier nicht der Nicht-belegt-
// Platzhalter steht, und das tut er nicht.
const PUBLIC_ANALYSE =
  "Established cephalometric analysis; norm provided WITHOUT a cited source and "
  + "the practitioner should verify it against the original publication. The "
  + "value is a public fact, transcribed 2026-08-22; no authorship is claimed.";
const UNSOURCED =
  "No publication produced for a norm — the measure is recorded, no target is shown "
  + "(sourcing rule, bead odontogram-c51.2)";

export const MEASURES: readonly CephMeasure[] = [
  // --- sagittal jaw position against the cranial base ---
  { id: "SNA", labelKey: "ceph.sna", unit: "deg", points: ["S", "N", "N", "A"],
    coding: { local: "ceph-s-n-a", ucum: "deg" },
    norm: 82.0, sd: 3.0, source: SEGNER + " (Paddenberg 2021 gives 81,0 ± 2,0 — the two disagree)" },
  { id: "SNB", labelKey: "ceph.snb", unit: "deg", points: ["S", "N", "N", "B"],
    coding: { local: "ceph-s-n-b", ucum: "deg" },
    norm: 80.0, sd: 3.0, source: SEGNER + " (Paddenberg 2021 gives 79,0 ± 2,0 — the two disagree)" },
  { id: "ANB", labelKey: "ceph.anb", unit: "deg", points: ["A", "N", "N", "B"],
    coding: { local: "ceph-a-n-b", ucum: "deg" },
    norm: 2.0, sd: 2.0, source: SEGNER + "; Paddenberg 2021 agrees" },
  { id: "SNPg", labelKey: "ceph.snpg", unit: "deg", points: ["S", "N", "N", "Pg"],
    coding: { local: "ceph-s-n-pg", ucum: "deg" },
    norm: null, sd: null, source: UNSOURCED },
  { id: "PgNB", labelKey: "ceph.pgnb", unit: "mm", points: ["Pg", "N", "B"],
    coding: { local: "ceph-pg-n-b", ucum: "mm" },
    norm: null, sd: null, source: UNSOURCED },
  { id: "Wits", labelKey: "ceph.wits", unit: "mm", points: ["A", "B", "Occl"],
    coding: { local: "ceph-wits", ucum: "mm" },
    norm: 0.0, sd: 1.0,
    source: PADDENBERG + " — female 0,0 ± 1,0 mm, male −1,0 ± 1,0 mm; the female value is "
      + "carried here and the sex difference is not yet modelled" },

  // --- vertical relations ---
  // NORM CONFLICT, deliberately left visible. Both sources put the mean at 32°,
  // but Paddenberg 2021 states ± 2,0 and Segner ± 6,0 — a threefold difference in
  // spread on one of the most variable parameters in the whole analysis. The
  // wider figure is used, because it matches the observed spread of the
  // Regensburg study group (SD 6,9) and because ± 2,0 sits implausibly tight
  // against three other Paddenberg parameters that are all exactly ± 2,0. The
  // choice CHANGES the growth reading, so it is stated rather than buried.
  { id: "MLNSL", labelKey: "ceph.mlnsl", unit: "deg", points: ["Go", "Me", "S", "N"],
    coding: { local: "ceph-m-l-n-s-l", ucum: "deg" },
    norm: 32.0, sd: 6.0,
    source: SEGNER + " — CONFLICT: Paddenberg 2021 states 32,0 ± 2,0 for the same "
      + "parameter. The wider Segner spread is used; see the note above.",
    growth: "higher-is-vertical" },
  { id: "NLNSL", labelKey: "ceph.nlnsl", unit: "deg", points: ["Sp", "Spp", "S", "N"],
    coding: { local: "ceph-n-l-n-s-l", ucum: "deg" },
    norm: 8.5, sd: 3.0, source: PADDENBERG },
  { id: "MLNL", labelKey: "ceph.mlnl", unit: "deg", points: ["Go", "Me", "Sp", "Spp"],
    coding: { local: "ceph-m-l-n-l", ucum: "deg" },
    norm: 23.5, sd: 6.0, source: SEGNER, growth: "higher-is-vertical" },
  { id: "NSp1", labelKey: "ceph.nsp", unit: "mm", points: ["N", "Sp1"],
    coding: { local: "ceph-n-sp1", ucum: "mm" },
    norm: null, sd: null, source: UNSOURCED },
  { id: "Sp1Gn", labelKey: "ceph.spgn", unit: "mm", points: ["Sp1", "Gn"],
    coding: { local: "ceph-sp1-gn", ucum: "mm" },
    norm: null, sd: null, source: UNSOURCED },
  { id: "Index", labelKey: "ceph.index", unit: "percent", points: ["N", "Sp1", "Gn"],
    coding: { local: "ceph-index", ucum: "%" },
    norm: 79.0, sd: 5.0,
    source: SEGNER + "; classification bands first-hand from " + HASUND
      + " (Paddenberg 2021 gives 80,0 ± 9,0)",
    growth: "higher-is-horizontal", bands: { horizontalAbove: 89, verticalBelow: 71 } },
  { id: "JarabakIndex", labelKey: "ceph.jarabak", unit: "percent", points: ["S", "Go", "N", "Me"],
    coding: { local: "ceph-jarabak-index", ucum: "%" },
    norm: 63.5, sd: 1.5, source: SEGNER, growth: "higher-is-horizontal",
    bands: { horizontalAbove: 65, verticalBelow: 62, bandSource: JARABAK_BANDS } },

  // --- cranial base structure ---
  { id: "NSBa", labelKey: "ceph.nsba", unit: "deg", points: ["N", "S", "S", "Ba"],
    coding: { local: "ceph-n-s-ba", ucum: "deg" },
    norm: 130.0, sd: 6.0, source: PADDENBERG },
  { id: "GnTgoAr", labelKey: "ceph.gntgoar", unit: "deg", points: ["Gn", "tgo", "tgo", "Ar"],
    coding: { local: "ceph-gn-tgo-ar", ucum: "deg" },
    norm: 126.0, sd: 6.0, source: SEGNER + " (tabulated there as ArGoMe)",
    growth: "higher-is-vertical" },

  // --- Jarabak: die vier Winkel des Polygons S-N-Ar-Go-Me ---
  // Der Kieferwinkel steht hier ein ZWEITES Mal, und das ist kein Versehen:
  // `GnTgoAr` ist ueber Gnathion und Tangentengonion konstruiert, Jarabak misst
  // Ar-Go-Me. Zwei Konstruktionen sind zwei Messgroessen, nicht eine mit zwei
  // Normen - sonst muesste die Summe der Teilwinkel auf einen Winkel passen,
  // der ueber anderen Punkten liegt.
  { id: "SaddleAngle", labelKey: "ceph.saddle", unit: "deg", points: ["N", "S", "S", "Ar"],
    coding: { local: "ceph-saddle-angle", ucum: "deg" },
    norm: 123.0, sd: 5.0, source: JARABAK_NORMS, growth: "higher-is-vertical" },
  { id: "ArticularAngle", labelKey: "ceph.articular", unit: "deg", points: ["S", "Ar", "Ar", "Go"],
    coding: { local: "ceph-articular-angle", ucum: "deg" },
    norm: 143.0, sd: 6.0, source: JARABAK_NORMS, growth: "higher-is-vertical" },
  { id: "GonialJarabak", labelKey: "ceph.gonial", unit: "deg", points: ["Ar", "Go", "Go", "Me"],
    coding: { local: "ceph-ar-go-me", ucum: "deg" },
    norm: 130.0, sd: 7.0, source: JARABAK_NORMS, growth: "higher-is-vertical" },
  { id: "GonialUpper", labelKey: "ceph.gonial.upper", unit: "deg", points: ["Ar", "Go", "Go", "N"],
    coding: { local: "ceph-gonial-upper", ucum: "deg" },
    norm: null, sd: null, source: GONION_GETEILT },
  { id: "GonialLower", labelKey: "ceph.gonial.lower", unit: "deg", points: ["N", "Go", "Go", "Me"],
    coding: { local: "ceph-gonial-lower", ucum: "deg" },
    norm: null, sd: null, source: GONION_GETEILT },
  // Die Summe der drei hinteren Winkel. Sie ist ueber dem ganzen Polygon
  // definiert, nicht ueber zwei Linien - deshalb fuenf Punkte.
  { id: "PosteriorSum", labelKey: "ceph.posteriorsum", unit: "deg",
    points: ["N", "S", "Ar", "Go", "Me"],
    coding: { local: "ceph-posterior-sum", ucum: "deg" },
    norm: 396.0, sd: 6.0, source: JARABAK_NORMS, growth: "higher-is-vertical" },
  { id: "FacialAxis", labelKey: "ceph.facialaxis", unit: "deg", points: ["N", "Ba", "Pt", "Gn"],
    coding: { local: "ceph-facial-axis", ucum: "deg" },
    norm: 90.0, sd: 3.0, source: PADDENBERG + " (Ricketts' facial axis, N-Ba against Pt-Gn)",
    growth: "higher-is-horizontal" },
  { id: "SNOccl", labelKey: "ceph.snoccl", unit: "deg", points: ["S", "N", "Occl"],
    coding: { local: "ceph-s-n-occl", ucum: "deg" },
    norm: 14.5, sd: 2.0, source: PADDENBERG },

  // --- Ricketts: gegen die Frankfurter Horizontale und gegen A-Pog ---
  // Die Fazialachse steht schon oben (N-Ba gegen Pt-Gn) und wird hier nicht
  // ein zweites Mal angelegt - Ricketts weicht nur in der Streuung ab (3,5
  // statt 3,0), und dafuer gibt es die Norm-Ueberschreibung am Profil.
  { id: "FacialDepth", labelKey: "ceph.facialdepth", unit: "deg", points: ["N", "Pg", "Po", "Or"],
    coding: { local: "ceph-facial-depth", ucum: "deg" },
    norm: 89.0, sd: 3.0, source: RICKETTS },
  { id: "MandFH", labelKey: "ceph.mandfh", unit: "deg", points: ["Go", "Me", "Po", "Or"],
    coding: { local: "ceph-ml-fh", ucum: "deg" },
    norm: 24.0, sd: 4.5, source: RICKETTS, growth: "higher-is-vertical" },
  { id: "Convexity", labelKey: "ceph.convexity", unit: "mm", points: ["A", "N", "Pg"],
    coding: { local: "ceph-convexity", ucum: "mm" },
    norm: 0.0, sd: 2.0, source: RICKETTS },
  { id: "UK1APog_mm", labelKey: "ceph.uk1apog.mm", unit: "mm", points: ["Is1-", "A", "Pg"],
    coding: { local: "ceph-u-k1-a-pog-mm", ucum: "mm" },
    norm: 1.0, sd: 2.0, source: RICKETTS },
  { id: "UK1APog_deg", labelKey: "ceph.uk1apog.deg", unit: "deg",
    points: ["Ap1-", "Is1-", "A", "Pg"],
    coding: { local: "ceph-u-k1-a-pog-deg", ucum: "deg" },
    norm: 22.0, sd: 4.0, source: RICKETTS },

  // --- Steiner: die Messgroessen, die es nur hier gibt ---
  // Aus dem FRWin-Katalog uebernommen (odontogram-c51.2). Die Steiner-Normen
  // fuer SNA/SNB/ANB und die vier Inzisiviwerte reiten als Profil-
  // Ueberschreibung auf den vorhandenen Messgroessen; hier stehen nur die,
  // die im Bestand fehlten. Die reine Formel-Groesse (Holdaway-Differenz)
  // laesst sich nicht ueber zwei Geraden bauen und bleibt weg - lieber eine
  // Zeile weglassen als raten.
  { id: "SteinerSND", labelKey: "ceph.snd", unit: "deg", points: ["S", "N", "D"],
    coding: { local: "ceph-s-n-d", ucum: "deg" },
    norm: 76.0, sd: null, source: PUBLIC_ANALYSE },
  { id: "SteinerOK1SN", labelKey: "ceph.ok1sn", unit: "deg", points: ["Ap1_", "Is1_", "S", "N"],
    coding: { local: "ceph-o-k1-s-n", ucum: "deg" },
    norm: 103.0, sd: null, source: PUBLIC_ANALYSE },
  { id: "SteinerGoGnSN", labelKey: "ceph.gognsn", unit: "deg", points: ["Gn", "Ct", "S", "N"],
    coding: { local: "ceph-go-gn-s-n", ucum: "deg" },
    norm: 32.0, sd: null, source: PUBLIC_ANALYSE },
  { id: "SteinerSL", labelKey: "ceph.sl", unit: "mm", points: ["S", "Pg"],
    coding: { local: "ceph-s-l", ucum: "mm" },
    norm: 51.0, sd: null, source: PUBLIC_ANALYSE },
  { id: "SteinerSE", labelKey: "ceph.se", unit: "mm", points: ["S", "Condp"],
    coding: { local: "ceph-s-e", ucum: "mm" },
    norm: 21.0, sd: null, source: PUBLIC_ANALYSE },

  // --- Fotostat nach Powell: gemessen am PROFILFOTO, nicht am Film ---
  // odontogram-c51.3, aus dem FRWin-Katalog. Alle `medium: "photo"` - das ist
  // der Datensatz, der sagt, dass der Wert vom Foto stammt. Die reinen
  // Gesichtshoehen-Verhaeltnisse (Formeln) bleiben weg, wie Holdaway bei
  // Steiner: lieber eine Zeile weglassen als raten.
  { id: "PowellFacP", labelKey: "ceph.powell.facp", unit: "deg", points: ["pog", "gb", "Po", "Or"],
    coding: { local: "ceph-powell-fac-p", ucum: "deg" },
    norm: 90.0, sd: null, source: PUBLIC_ANALYSE, medium: "photo" },
  { id: "PowellNFr", labelKey: "ceph.powell.nfr", unit: "deg", points: ["gb", "N", "no"],
    coding: { local: "ceph-powell-nfr", ucum: "deg" },
    norm: 122.5, sd: 7.5, source: PUBLIC_ANALYSE, medium: "photo" },
  { id: "PowellNFa", labelKey: "ceph.powell.nfa", unit: "deg", points: ["no", "N", "pog"],
    coding: { local: "ceph-powell-nfa", ucum: "deg" },
    norm: 35.0, sd: 5.0, source: PUBLIC_ANALYSE, medium: "photo" },
  { id: "PowellNM", labelKey: "ceph.powell.nm", unit: "deg", points: ["pog", "no", "N"],
    coding: { local: "ceph-powell-nm", ucum: "deg" },
    norm: 126.0, sd: 6.0, source: PUBLIC_ANALYSE, medium: "photo" },
  { id: "PowellMC", labelKey: "ceph.powell.mc", unit: "deg", points: ["ce", "Me", "gb", "pog"],
    coding: { local: "ceph-powell-mc", ucum: "deg" },
    norm: 87.5, sd: 7.5, source: PUBLIC_ANALYSE, medium: "photo" },
  { id: "PowellNasomental", labelKey: "ceph.powell.nasomental", unit: "mm", points: ["no", "pog"],
    coding: { local: "ceph-powell-nasomental", ucum: "mm" },
    norm: null, sd: null, source: PUBLIC_ANALYSE, medium: "photo" },
  { id: "PowellNL", labelKey: "ceph.powell.nl", unit: "deg", points: ["ctg", "sn", "ls"],
    coding: { local: "ceph-powell-nl", ucum: "deg" },
    norm: 100.0, sd: 10.0, source: PUBLIC_ANALYSE, medium: "photo" },
  { id: "PowellNeck", labelKey: "ceph.powell.neck", unit: "mm", points: ["ce", "Gn"],
    coding: { local: "ceph-powell-neck", ucum: "mm" },
    norm: 54.0, sd: 6.0, source: PUBLIC_ANALYSE, medium: "photo" },

  // --- incisors ---
  { id: "Interincisal", labelKey: "ceph.interincisal", unit: "deg",
    points: ["Ap1-", "Is1-", "Ap1_", "Is1_"], coding: { local: "ceph-interincisal", ucum: "deg" },
    norm: 132.0, sd: 6.0, source: SEGNER },
  { id: "OK1NL", labelKey: "ceph.ok1nl", unit: "deg", points: ["Ap1_", "Is1_", "Sp", "Spp"],
    coding: { local: "ceph-o-k1-n-l", ucum: "deg" },
    norm: 70.0, sd: 5.0, source: SEGNER },
  { id: "UK1ML", labelKey: "ceph.uk1ml", unit: "deg", points: ["Ap1-", "Is1-", "Go", "Me"],
    coding: { local: "ceph-u-k1-m-l", ucum: "deg" },
    norm: 92.0, sd: 6.0, source: SEGNER },
  { id: "OK1NA_deg", labelKey: "ceph.ok1na.deg", unit: "deg", points: ["Ap1_", "Is1_", "N", "A"],
    coding: { local: "ceph-o-k1-n-a-deg", ucum: "deg" },
    norm: null, sd: null, source: UNSOURCED },
  { id: "OK1NA_mm", labelKey: "ceph.ok1na.mm", unit: "mm", points: ["Is1_", "N", "A"],
    coding: { local: "ceph-o-k1-n-a-mm", ucum: "mm" },
    norm: null, sd: null, source: UNSOURCED },
  { id: "UK1NB_deg", labelKey: "ceph.uk1nb.deg", unit: "deg", points: ["Ap1-", "Is1-", "N", "B"],
    coding: { local: "ceph-u-k1-n-b-deg", ucum: "deg" },
    norm: null, sd: null, source: UNSOURCED },
  { id: "UK1NB_mm", labelKey: "ceph.uk1nb.mm", unit: "mm", points: ["Is1-", "N", "B"],
    coding: { local: "ceph-u-k1-n-b-mm", ucum: "mm" },
    norm: null, sd: null, source: UNSOURCED },

  // --- soft tissue ---
  { id: "HAngle", labelKey: "ceph.hangle", unit: "deg", points: ["ls", "pog", "N", "B"],
    coding: { local: "ceph-h-angle", ucum: "deg" },
    norm: null, sd: null, source: UNSOURCED },
  { id: "Nasolabial", labelKey: "ceph.nasolabial", unit: "deg", points: ["no", "sn", "sn", "ls"],
    coding: { local: "ceph-nasolabial", ucum: "deg" },
    norm: null, sd: null, source: UNSOURCED },
];

const BY_ID = new Map(MEASURES.map(m => [m.id, m]));

/** Look one measure up by id. */
export function measure(id: string): CephMeasure | undefined {
  return BY_ID.get(id);
}

/** A set of recorded values, keyed by measure id. Absent = not recorded. */
export type CephValues = Readonly<Record<string, number>>;

function read(values: CephValues, id: string): number | null {
  const v = values[id];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// ---- Layer 3: profiles ----------------------------------------------------

export interface CephProfile {
  id: string;
  labelKey: string;
  /** Measure ids, in the order the profile presents them. */
  measures: string[];
  /** What the profile measures AGAINST. Sato's carries none by design. */
  referenceFrame: "anterior-cranial-base" | "frankfurt" | "occlusal-plane" | "none";
  /** Fernroentgen (`film`, Standard) oder Profilfoto (`photo`) - der Waehler
   *  gruppiert danach (Bead odontogram-c51.3). */
  medium?: "film" | "photo";
  source: string;
  /**
   * NORMS BELONG TO THE PROFILE, not to the measure. Schools disagree about
   * them: ML-NSL is 28° in the Hasund school and 32° in Segner's, and reference
   * case A reads vertical against the first and neutral against the second —
   * the same measurement, two findings. A norm hung on the measure would force
   * every school to share one, which is the mistake this field corrects.
   *
   * Entries here override the measure's default. A profile that omits the field
   * simply flies the defaults, which is what the built-in one does.
   */
  norms?: Record<string, NormOverride>;
}

export interface NormOverride {
  norm: number | null;
  sd: number | null;
  source: string;
}

/** The norm one profile flies for one measure: its override, else the default. */
export function normFor(measureId: string, profileId?: string):
  { norm: number | null; sd: number | null; source: string } | null {
  const m = BY_ID.get(measureId);
  if (!m) return null;
  const override = profileId
    ? PROFILES.find(p => p.id === profileId)?.norms?.[measureId]
    : undefined;
  return override ?? { norm: m.norm, sd: m.sd, source: m.source };
}

export const PROFILES: readonly CephProfile[] = [
  {
    // Angezeigt als "Segner/Hasund" (Dirk, 22.08.2026). Die id bleibt `hasund`
    // - sie ist der interne Schluessel (Sitzungszustand, kein Payload) und aus
    // Tests heraus angesprochen. Der Name traegt jetzt beide, weil das Profil
    // Segners Normen fliegt (ML-NSL 32 statt Hasunds 28), waehrend Auswahl und
    // Klassifikationsregeln aus Hasunds Handbuch stammen - genau der Punkt, an
    // dem eine Norm am PROFIL haengt und nicht an der Messgroesse.
    id: "hasund",
    labelKey: "ceph.profile.hasund",
    referenceFrame: "anterior-cranial-base",
    source: HASUND + " — variable list and classification rules first-hand from the "
      + "author's own instruction manual",
    measures: [
      "SNA", "SNB", "SNPg", "ANB",
      "MLNSL", "NLNSL", "MLNL", "NSp1", "Sp1Gn", "Index",
      "NSBa", "GnTgoAr", "PgNB",
      "HAngle", "Nasolabial",
      "Interincisal", "OK1NA_deg", "UK1NB_deg", "OK1NA_mm", "UK1NB_mm",
    ],
  },
  {
    id: "ricketts",
    labelKey: "ceph.profile.ricketts",
    // NICHT die vordere Schaedelbasis: vier der sechs Messgroessen laufen gegen
    // die Frankfurter Horizontale oder gegen A-Pog. Genau dafuer gibt es dieses
    // Feld - ein Modell mit fest eingebautem Bezug koennte Ricketts so wenig
    // darstellen wie Satos Denture Frame Analysis.
    referenceFrame: "frankfurt",
    source: RICKETTS,
    measures: [
      "FacialAxis", "FacialDepth", "MandFH", "Convexity",
      "UK1APog_mm", "UK1APog_deg",
    ],
    // Die EINZIGE Abweichung, und sie ist der Grund, warum Normen am Profil
    // haengen und nicht an der Messgroesse: Ricketts gibt die Fazialachse mit
    // 90 +/- 3,5 an, Paddenberg mit 90 +/- 3,0. Derselbe Messwert liest sich
    // knapp innerhalb der einen und knapp ausserhalb der anderen Streuung.
    norms: {
      FacialAxis: { norm: 90.0, sd: 3.5, source: RICKETTS },
    },
  },
  {
    id: "steiner",
    labelKey: "ceph.profile.steiner",
    // Steiner misst gegen die vordere Schaedelbasis (S-N ist die haeufigste
    // Bezugslinie seiner Winkel, laut FRWin-Katalog 9 von 28).
    referenceFrame: "anterior-cranial-base",
    source: PUBLIC_ANALYSE,
    measures: [
      "SNA", "SNB", "ANB", "SteinerSND",
      "OK1NA_mm", "OK1NA_deg", "SteinerOK1SN",
      "UK1NB_mm", "UK1NB_deg", "PgNB",
      "Interincisal", "SNOccl", "SteinerGoGnSN",
      "SteinerSL", "SteinerSE",
    ],
    // Steiners eigene Normen fuer die geteilten Messgroessen. Die Streuung
    // gibt der Katalog nur bei SNA/SNB/ANB an (je 2 Grad); wo er keine nennt,
    // bleibt sie null und die Karte zeigt die Norm ohne Streuungsband.
    norms: {
      SNA: { norm: 82.0, sd: 2.0, source: PUBLIC_ANALYSE },
      SNB: { norm: 80.0, sd: 2.0, source: PUBLIC_ANALYSE },
      ANB: { norm: 2.0, sd: 2.0, source: PUBLIC_ANALYSE },
      OK1NA_mm: { norm: 4.0, sd: null, source: PUBLIC_ANALYSE },
      OK1NA_deg: { norm: 22.0, sd: null, source: PUBLIC_ANALYSE },
      UK1NB_mm: { norm: 4.0, sd: null, source: PUBLIC_ANALYSE },
      UK1NB_deg: { norm: 25.0, sd: null, source: PUBLIC_ANALYSE },
      Interincisal: { norm: 131.0, sd: null, source: PUBLIC_ANALYSE },
      SNOccl: { norm: 14.0, sd: null, source: PUBLIC_ANALYSE },
    },
  },
  {
    id: "powell",
    labelKey: "ceph.profile.powell",
    // Am PROFILFOTO gemessen, gegen die Frankfurter Horizontale (P-Or). Das
    // Profil ist `photo` - der Waehler fuehrt es unter "Fotostat", getrennt von
    // den Fernroentgen-Verfahren (odontogram-c51.3).
    referenceFrame: "frankfurt",
    medium: "photo",
    source: PUBLIC_ANALYSE,
    measures: [
      "PowellFacP", "PowellNFr", "PowellNFa", "PowellNM", "PowellMC",
      "PowellNasomental", "PowellNL", "PowellNeck",
    ],
  },
  {
    id: "jarabak",
    labelKey: "ceph.profile.jarabak",
    // S-N ist die Bezugslinie des Polygons, also die vordere Schaedelbasis -
    // Jarabak teilt sie mit Hasund und unterscheidet sich in der AUSWAHL.
    referenceFrame: "anterior-cranial-base",
    source: JARABAK_NORMS,
    // Die Reihenfolge ist die des Polygons: von der Schaedelbasis um den
    // Kieferwinkel herum, dann die Summe, dann das Verhaeltnis der Hoehen.
    measures: [
      "SaddleAngle", "ArticularAngle", "GonialJarabak",
      "GonialUpper", "GonialLower", "PosteriorSum",
      "JarabakIndex",
    ],
  },
];

/**
 * Die Verfahren fuer die Auswahlliste ordnen: Favoriten oben, beide Gruppen
 * alphabetisch. Dirk, 22.08.2026: *"Sollten wir die nicht alphabetisch ordnen
 * und dem Anwender die Moeglichkeit geben, Favoriten festzulegen?"*
 *
 * SORTIERT WIRD NACH DER ANGEZEIGTEN BESCHRIFTUNG, nicht nach der id - und
 * deshalb nimmt diese Funktion einen Aufloeser entgegen, statt `t` zu
 * importieren. Alphabetisch ist eine Aussage ueber das Wort, das der Leser
 * sieht, und das ist in zwoelf Sprachen zwoelfmal ein anderes. So bleibt die
 * Datei abhaengigkeitsfrei und die Ordnung trotzdem pruefbar.
 *
 * Die REIHENFOLGE INNERHALB eines Profils bleibt unangetastet: `measures` ist
 * klinisch geordnet (Jarabaks Polygon laeuft um den Kieferwinkel herum), und
 * alphabetisch waere dort Unsinn.
 */
export function orderProfiles(
  labelOf: (profile: CephProfile) => string,
  favourites: readonly string[] = [],
  profiles: readonly CephProfile[] = PROFILES,
): { favourites: CephProfile[]; others: CephProfile[] } {
  const markiert = new Set(favourites);
  const nachNamen = (a: CephProfile, b: CephProfile) =>
    labelOf(a).localeCompare(labelOf(b));
  return {
    favourites: profiles.filter(p => markiert.has(p.id)).sort(nachNamen),
    others: profiles.filter(p => !markiert.has(p.id)).sort(nachNamen),
  };
}

/** Every measure a profile presents, resolved and in its declared order. */
export function profileMeasures(profileId: string): CephMeasure[] {
  const profile = PROFILES.find(p => p.id === profileId);
  if (!profile) return [];
  return profile.measures.map(id => BY_ID.get(id)).filter((m): m is CephMeasure => !!m);
}

// ---- Derivation: where the jaws sit against the skull ----------------------

export type JawPosition = "retrognathic" | "orthognathic" | "prognathic";
export type SagittalClass = "neutral" | "distal" | "mesial";

export interface JawRelation {
  maxilla: JawPosition | null;
  mandible: JawPosition | null;
  /** Both jaws in the same class is a harmonious face; split is disharmonious. */
  harmonious: boolean | null;
  /** ANB against its INDIVIDUAL norm — the reading floating norms exist for. */
  sagittalClass: SagittalClass | null;
  /**
   * ANB against the plain population norm. Reported ALONGSIDE, never instead:
   * the two disagree exactly where the individualisation earns its keep, and a
   * clinician needs to see both to know that a large ANB is explained by the
   * vertical pattern rather than by a jaw discrepancy. The practice printout
   * shows only this one.
   */
  sagittalClassPopulation: SagittalClass | null;
  individualisedAnb: number | null;
  /** Measured ANB minus its individual norm. */
  anbDeviation: number | null;
  /** Measured ANB minus the population norm. */
  anbDeviationPopulation: number | null;
}

/**
 * Facial type after Björk, with the limits Hasund's own manual states (Tab. 2):
 * retrognathic below SNA 79 / SNB 77, prognathic above SNA 85 / SNB 83,
 * orthognathic between. When the two jaws fall in different classes the face is
 * disharmonious — which is the whole point of the classification, since a
 * malocclusion is harder to treat in a retrognathic face than in an orthognathic
 * or prognathic one.
 */
export function classifyJaw(value: number | null, lower: number, upper: number): JawPosition | null {
  if (value === null) return null;
  if (value < lower) return "retrognathic";
  if (value > upper) return "prognathic";
  return "orthognathic";
}

/**
 * The individualised ANB after Panagiotidis and Witt, recalculated for a
 * contemporary Central European population.
 *
 * Paddenberg et al. 2021, the two-predictor form. Their six-predictor form
 * (adding NSBa, NL-NSL, index and facial axis) reaches a corrected R² of 0.690
 * against this one's 0.578 and is available as {@link individualisedAnbExtended}.
 */
export function individualisedAnb(values: CephValues): number | null {
  const sna = read(values, "SNA");
  const mlnsl = read(values, "MLNSL");
  if (sna === null || mlnsl === null) return null;
  return -45.359 + 0.493 * sna + 0.251 * mlnsl;
}

/** Paddenberg et al. 2021, six-predictor form. `null` unless all six are recorded. */
export function individualisedAnbExtended(values: CephValues): number | null {
  const ids = ["SNA", "MLNSL", "NSBa", "NLNSL", "Index", "FacialAxis"] as const;
  const v = ids.map(id => read(values, id));
  if (v.some(x => x === null)) return null;
  const [sna, mlnsl, nsba, nlnsl, index, axis] = v as number[];
  return -41.669 + 0.567 * sna + 0.11 * mlnsl + 0.114 * nsba
    + 0.132 * nlnsl + 0.062 * index - 0.289 * axis;
}

/** Paddenberg et al. 2021, the recalculated Järvinen equation for the Wits value. */
export function individualisedWits(values: CephValues): number | null {
  const anb = read(values, "ANB");
  const sna = read(values, "SNA");
  const occl = read(values, "SNOccl");
  if (anb === null || sna === null || occl === null) return null;
  return 57.510 + 1.526 * anb - 0.634 * sna - 0.666 * occl;
}

export function deriveJawRelation(values: CephValues, profileId?: string): JawRelation {
  const maxilla = classifyJaw(read(values, "SNA"), 79, 85);
  const mandible = classifyJaw(read(values, "SNB"), 77, 83);
  const anb = read(values, "ANB");
  const indiv = individualisedAnb(values);

  // One standard deviation is the band: beyond it the relation reads distal or
  // mesial rather than neutral. Computed twice, against the individual norm and
  // against the population one, because the disagreement between them IS the
  // clinical finding — a large ANB in a posteriorly rotated face is a vertical
  // problem, not a sagittal one, and only the individualised reading says so.
  const anbNorm = normFor("ANB", profileId)!;
  const sd = anbNorm.sd ?? 2;
  const populationNorm = anbNorm.norm;
  const band = (value: number | null, target: number | null): SagittalClass | null =>
    value === null || target === null ? null
      : value - target > sd ? "distal"
        : value - target < -sd ? "mesial"
          : "neutral";
  const diff = (target: number | null) =>
    anb === null || target === null ? null : anb - target;

  return {
    maxilla,
    mandible,
    harmonious: maxilla === null || mandible === null ? null : maxilla === mandible,
    sagittalClass: band(anb, indiv ?? populationNorm),
    sagittalClassPopulation: band(anb, populationNorm),
    individualisedAnb: indiv,
    anbDeviation: diff(indiv ?? populationNorm),
    anbDeviationPopulation: diff(populationNorm),
  };
}

// ---- Derivation: the growth pattern ---------------------------------------

export type VerticalRelation = "open" | "neutral" | "deep";
export type GrowthPattern = "horizontal" | "neutral" | "vertical" | "indeterminate";

export interface GrowthIndicator {
  id: string;
  value: number;
  norm: number;
  sd: number;
  /** How far from the norm, in standard deviations. Signed. */
  deviations: number;
  reads: "horizontal" | "neutral" | "vertical";
  /** Whether the reading came from a published band or from the SD fallback. */
  basis: "published-band" | "standard-deviation";
}

export interface GrowthAssessment {
  pattern: GrowthPattern;
  /** Every indicator that had both a recorded value and a sourced norm. */
  indicators: GrowthIndicator[];
  /** Hasund's vertical relation from the index, and its 1/2/3 subdivision. */
  verticalRelation: VerticalRelation | null;
  subdivision: 1 | 2 | 3 | null;
  /** Indicators reading against the verdict. 0 = every voter agreed. */
  dissent: number;
}

/**
 * Hasund's vertical classification (Tab. 3), first-hand from his manual:
 * index below 71 % is an open relation, above 89 % a deep one, between the two
 * neutral.
 */
export function classifyVerticalRelation(index: number | null): VerticalRelation | null {
  if (index === null) return null;
  if (index < 71) return "open";
  if (index > 89) return "deep";
  return "neutral";
}

/**
 * The 1/2/3 subdivision of each vertical group, by the interbasal angle ML-NL:
 * 1 = posterior facial height relatively too small (angle too big), 3 = too
 * large (angle too small), 2 = balanced. Hasund's manual gives the scheme; it
 * does NOT print numeric limits for the three bands, so the thresholds here are
 * the ones his own worked example implies and are marked as such rather than
 * presented as published values.
 */
export function classifySubdivision(mlnl: number | null): 1 | 2 | 3 | null {
  if (mlnl === null) return null;
  if (mlnl > 27) return 1;
  if (mlnl < 19) return 3;
  return 2;
}

/**
 * The growth pattern, from every indicator that has BOTH a recorded value and a
 * sourced norm. Deliberately a vote rather than a single number: the fan
 * diagram clinicians read does exactly this, laying several vertical parameters
 * side by side, and an indicator that disagrees with the others is information
 * rather than noise. Each indicator is returned so a reader can see who voted
 * which way instead of being handed a verdict.
 *
 * One standard deviation is the threshold. `indeterminate` when nothing
 * contributed — which is the honest answer to an empty form, not "neutral".
 */
export function deriveGrowthPattern(values: CephValues, profileId?: string): GrowthAssessment {
  const indicators: GrowthIndicator[] = [];

  for (const m of MEASURES) {
    if (!m.growth) continue;
    const { norm, sd } = normFor(m.id, profileId)!;
    if (norm === null || sd === null || sd <= 0) continue;
    const value = read(values, m.id);
    if (value === null) continue;
    const deviations = (value - norm) / sd;

    // A published band wins. Only where none exists does the SD rule decide,
    // and then at one standard deviation.
    let reads: GrowthIndicator["reads"];
    if (m.bands) {
      reads = value > m.bands.horizontalAbove ? "horizontal"
        : value < m.bands.verticalBelow ? "vertical"
          : "neutral";
    } else {
      const towardsVertical = m.growth === "higher-is-vertical" ? deviations : -deviations;
      reads = towardsVertical > 1 ? "vertical" : towardsVertical < -1 ? "horizontal" : "neutral";
    }
    indicators.push({
      id: m.id, value, norm, sd, deviations, reads,
      basis: m.bands ? "published-band" : "standard-deviation",
    });
  }

  const index = read(values, "Index");
  const verticalRelation = classifyVerticalRelation(index);
  const subdivision = classifySubdivision(read(values, "MLNL"));

  if (indicators.length === 0) {
    return { pattern: "indeterminate", indicators, verticalRelation, subdivision, dissent: 0 };
  }
  const vertical = indicators.filter(i => i.reads === "vertical").length;
  const horizontal = indicators.filter(i => i.reads === "horizontal").length;
  const pattern: GrowthPattern =
    vertical > horizontal ? "vertical" : horizontal > vertical ? "horizontal" : "neutral";

  // How many indicators read the OTHER way. A verdict carried by one indicator
  // against another is not the same finding as one every indicator agrees on,
  // and a reader has to be able to tell them apart — reference case A is
  // exactly this: a steep mandibular plane pulling one way while a small gonial
  // angle pulls the other.
  const dissent = pattern === "neutral" ? 0
    : indicators.filter(i => i.reads !== "neutral" && i.reads !== pattern).length;

  return { pattern, indicators, verticalRelation, subdivision, dissent };
}

// ---- Hasund's two clinical equations --------------------------------------

/**
 * The target position of the lower incisor, from Hasund's manual: ANB and the
 * chin prominence are the guiding variables. The difference between this and the
 * measured position is what the anchorage situation in the lower jaw hangs on,
 * and with it the extraction decision.
 */
export function targetLowerIncisorPosition(values: CephValues): number | null {
  const anb = read(values, "ANB");
  const pgnb = read(values, "PgNB");
  if (anb === null || pgnb === null) return null;
  return 0.50 * anb - 0.35 * pgnb + 3.9;
}

/** The soft-tissue H angle, from the back of Hasund's CEPH TEMPLATE. */
export function targetHAngle(values: CephValues): number | null {
  const anb = read(values, "ANB");
  const pgnb = read(values, "PgNB");
  if (anb === null || pgnb === null) return null;
  return anb - 1.3 * pgnb + 10.5;
}

// ---- Whole assessment ------------------------------------------------------

export interface CephAssessment {
  jaws: JawRelation;
  growth: GrowthAssessment;
  targetLowerIncisor: number | null;
  targetHAngle: number | null;
  individualisedWits: number | null;
  /** How many of the profile's measures carry a recorded value. */
  recorded: number;
  total: number;
}

/** Everything derivable from one set of values under one profile. Pure. */
export function assess(values: CephValues, profileId = "hasund"): CephAssessment {
  const measures = profileMeasures(profileId);
  return {
    jaws: deriveJawRelation(values, profileId),
    growth: deriveGrowthPattern(values, profileId),
    targetLowerIncisor: targetLowerIncisorPosition(values),
    targetHAngle: targetHAngle(values),
    individualisedWits: individualisedWits(values),
    recorded: measures.filter(m => read(values, m.id) !== null).length,
    total: measures.length,
  };
}

/** Whether anything at all has been recorded. */
export function hasAnyCephData(values: CephValues): boolean {
  return Object.values(values).some(v => typeof v === "number" && Number.isFinite(v));
}
