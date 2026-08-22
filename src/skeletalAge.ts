// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Bead odontogram-c51.4: skeletal age — how much growth is left.
//
// DEPENDENCY-FREE and PURE, like `cephalometry.ts`, `modelAnalysis.ts` and
// `perioClassification.ts`: nothing from the engine, no module-level mutable
// state, no `Date`/`Math.random`. Callable from live state or a payload.
//
// TWO SOURCES, ONE ANSWER. Skeletal age answers "how much growing is left",
// and there are two ways to read it:
//
//   1. CVM — cervical vertebral maturation (Hassel & Farman), read off the
//      SAME lateral cephalogram c51.2 already handles. No extra radiograph.
//   2. The HAND-WRIST film — the gold standard (the Muenster dissertation says
//      so in as many words). Dirk's practice uses Fishman's SMI (11 stages),
//      chosen 22.08.2026. It is not in the FRWin catalogue; the hand film is a
//      different radiograph.
//
// They are two readings of the SAME quantity, so — exactly like the film-vs-
// photo overlap in c51.3 — the record keeps them SEPARATE and says which one a
// value came from. This module derives the shared answer (remaining growth,
// where the pubertal peak sits) from either or both, and reports whether the
// two agree when both are charted.
//
// THE TABLE, and the ONE reason both scales speak the same language: Fishman's
// eleven SMIs map onto Hassel & Farman's six CVM stages in fixed pairs, so a
// hand-film stage resolves to a CVM stage and then to the same remaining-growth
// band. That mapping and the bands are from the Muenster dissertation (Erdmann
// 2007, Kap. 2.2, tabulating Hassel & Farman) — the Hassel & Farman original
// was not read, and the source string says so.

export type CvmStage =
  | "none" | "cvm-1" | "cvm-2" | "cvm-3" | "cvm-4" | "cvm-5" | "cvm-6";

export type SmiStage =
  | "none"
  | "smi-1" | "smi-2" | "smi-3" | "smi-4" | "smi-5" | "smi-6"
  | "smi-7" | "smi-8" | "smi-9" | "smi-10" | "smi-11";

/** Where the pubertal growth peak sits relative to the charted maturity. */
export type PeakRelation = "ahead" | "at" | "past";

export const SOURCE_SKELETAL =
  "Cervical stages and the SMI<->CVM correspondence after Hassel & Farman, as "
  + "tabulated by Erdmann 2007 (Diss. med. dent., Universitaet Muenster, Kap. 2.2); "
  + "the Hassel & Farman original was not read here.";

/** One CVM stage: its remaining-growth band, the SMIs it pairs with, its name. */
interface CvmRow {
  /** Remaining growth as a percent range (Erdmann 2007). */
  remaining: { low: number; high: number };
  /** The Fishman SMI stages that fall in this CVM stage. */
  smis: number[];
  /** i18n key for the phase name. */
  phaseKey: string;
}

// The six CVM stages in order. `smis` are the Fishman pairs; the peak of the
// pubertal spurt coincides with CVM 3-4 (SMI 5-8), so 1-2 is ahead of it and
// 5-6 is past it.
const CVM_TABLE: Record<Exclude<CvmStage, "none">, CvmRow> = {
  "cvm-1": { remaining: { low: 80, high: 100 }, smis: [1, 2], phaseKey: "skeletal.phase.initiation" },
  "cvm-2": { remaining: { low: 65, high: 85 }, smis: [3, 4], phaseKey: "skeletal.phase.acceleration" },
  "cvm-3": { remaining: { low: 25, high: 65 }, smis: [5, 6], phaseKey: "skeletal.phase.transition" },
  "cvm-4": { remaining: { low: 20, high: 30 }, smis: [7, 8], phaseKey: "skeletal.phase.deceleration" },
  "cvm-5": { remaining: { low: 5, high: 10 }, smis: [9, 10], phaseKey: "skeletal.phase.maturation" },
  "cvm-6": { remaining: { low: 0, high: 0 }, smis: [11], phaseKey: "skeletal.phase.completion" },
};

/** All CVM stages in charting order (without `none`). */
export const CVM_STAGES = Object.keys(CVM_TABLE) as Exclude<CvmStage, "none">[];

/** All SMI stages 1..11 in order (without `none`). */
export const SMI_STAGES: Exclude<SmiStage, "none">[] =
  Array.from({ length: 11 }, (_, i) => `smi-${i + 1}` as Exclude<SmiStage, "none">);

/** The CVM stage a Fishman SMI number falls into (its fixed pair). */
export function smiToCvm(smi: SmiStage): Exclude<CvmStage, "none"> | null {
  if (smi === "none") return null;
  const n = Number(smi.slice(4));
  for (const [cvm, row] of Object.entries(CVM_TABLE)) {
    if (row.smis.includes(n)) return cvm as Exclude<CvmStage, "none">;
  }
  return null;
}

/** Where the peak sits for a CVM stage: 1-2 ahead, 3-4 at, 5-6 past. */
function peakOf(cvm: Exclude<CvmStage, "none">): PeakRelation {
  const n = Number(cvm.slice(4));
  return n <= 2 ? "ahead" : n <= 4 ? "at" : "past";
}

export interface SkeletalMaturity {
  /** What was charted, verbatim. */
  cvm: CvmStage;
  smi: SmiStage;
  /** The CVM the hand-film stage maps to (null when no SMI charted). */
  cvmFromHand: Exclude<CvmStage, "none"> | null;
  /** The CVM the derivation SETTLES ON — the charted CVM wins over the mapped one. */
  effectiveCvm: Exclude<CvmStage, "none"> | null;
  /** Remaining growth band, or null when nothing is charted. */
  remaining: { low: number; high: number } | null;
  /** i18n key for the phase name of the effective CVM. */
  phaseKey: string | null;
  /** Where the pubertal peak sits, or null when nothing is charted. */
  peak: PeakRelation | null;
  /** Both sources charted AND they disagree about which CVM stage it is. */
  disagree: boolean;
}

/**
 * Derive the shared skeletal-age answer from either or both readings.
 *
 * The CHARTED cervical stage wins over the one the hand film maps to — a value
 * read directly is not overruled by a mapping — but when both are present and
 * point at different CVM stages, `disagree` says so rather than hiding it, the
 * same way c51.2 surfaces the individual-vs-population sagittal conflict instead
 * of resolving it.
 */
export function deriveSkeletalMaturity(input: { cvm?: CvmStage; smi?: SmiStage }): SkeletalMaturity {
  const cvm: CvmStage = input.cvm ?? "none";
  const smi: SmiStage = input.smi ?? "none";
  const cvmFromHand = smiToCvm(smi);
  const chartedCvm = cvm === "none" ? null : (cvm as Exclude<CvmStage, "none">);
  const effectiveCvm = chartedCvm ?? cvmFromHand;
  const row = effectiveCvm ? CVM_TABLE[effectiveCvm] : null;
  return {
    cvm, smi, cvmFromHand,
    effectiveCvm,
    remaining: row ? { ...row.remaining } : null,
    phaseKey: row ? row.phaseKey : null,
    peak: effectiveCvm ? peakOf(effectiveCvm) : null,
    disagree: chartedCvm !== null && cvmFromHand !== null && chartedCvm !== cvmFromHand,
  };
}
