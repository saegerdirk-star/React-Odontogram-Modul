// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Bead odontogram-c51.2: reading cephalometric values out of an evaluation
// someone else printed.
//
// IT TAKES TEXT, NOT A PDF, and that is the whole design. Pasting from a PDF
// viewer works today with no dependency at all; a PDF file reader, if one is
// ever added, produces text and feeds this same function. One parser, one set
// of tests, and the heavy part stays optional. Reversing that — building a PDF
// reader with parsing inside it — would have bought a megabyte of library for a
// feature that a clipboard already provides.
//
// NOTHING IS APPLIED WITHOUT CONFIRMATION, and that is not politeness. A
// printed evaluation has three number columns — norm, measurement, deviation —
// and some rows carry only the norm. `Nasolabialwinkel 110,0°` on Dirk's own
// sheet is a norm with no measurement beside it; an importer that grabbed the
// first number would file 110° as a finding. So every line reports how sure it
// is and the caller confirms. An import that quietly writes a wrong number into
// a clinical chart is far worse than one that asks.

import { MEASURES } from "./cephalometry";

/** One value found in the text, with everything needed to judge it. */
export interface ParsedValue {
  measureId: string;
  /** The label as it appeared, so a reader can see what was matched. */
  label: string;
  /** The number this parse proposes. */
  value: number;
  /** Every number on the line, in order — the evidence for the choice. */
  candidates: number[];
  /**
   * `high` when the line had the full norm/measurement/deviation triple and the
   * measurement column is unambiguous. `low` when it did not, which on a
   * three-column sheet usually means the row carries a norm and nothing else.
   */
  confidence: "high" | "low";
  line: string;
}

export interface ParseResult {
  values: ParsedValue[];
  /** Lines that carried numbers but matched no known measure. */
  unmatched: string[];
}

/**
 * Label patterns, longest and most specific FIRST — `ANB - Winkel` must not
 * swallow `ANB - Winkel (ind.)`, and `OK1-NA - Winkel` must not be taken for
 * `OK1-NA - Strecke`. Matching is accent- and case-insensitive and tolerates the
 * spacing a PDF text layer produces.
 */
const PATTERNS: { measureId: string; patterns: RegExp[] }[] = [
  { measureId: "Interincisal", patterns: [/ok1\s*-\s*uk1\s*-?\s*winkel/i, /interinzisalwinkel/i] },
  { measureId: "OK1NA_deg", patterns: [/ok1\s*-\s*na\s*-?\s*winkel/i] },
  { measureId: "UK1NB_deg", patterns: [/uk1\s*-\s*nb\s*-?\s*winkel/i] },
  { measureId: "OK1NA_mm", patterns: [/ok1\s*-\s*na\s*-?\s*strecke/i] },
  { measureId: "UK1NB_mm", patterns: [/uk1\s*-\s*nb\s*-?\s*strecke/i] },
  { measureId: "OK1NL", patterns: [/ok1\s*-\s*nl\s*-?\s*winkel/i, /\boi\s*\/\s*nl\b/i] },
  { measureId: "UK1ML", patterns: [/uk1\s*-\s*ml\s*-?\s*winkel/i, /\bui\s*\/\s*ml\b/i] },
  { measureId: "PgNB", patterns: [/pg\s*-\s*nb\s*-?\s*strecke/i] },
  { measureId: "SNPg", patterns: [/snpg\s*-?\s*winkel/i] },
  { measureId: "NSBa", patterns: [/nsba\s*-?\s*winkel/i, /sch[äa]delbasiswinkel/i] },
  { measureId: "GnTgoAr", patterns: [/gngoar\s*-?\s*winkel/i, /gn\s*-\s*tgo\s*-\s*ar/i, /argome/i, /kieferwinkel/i] },
  { measureId: "MLNSL", patterns: [/ml\s*-\s*nsl\s*-?\s*winkel/i] },
  { measureId: "NLNSL", patterns: [/nl\s*-\s*nsl\s*-?\s*winkel/i] },
  { measureId: "MLNL", patterns: [/ml\s*-\s*nl\s*-?\s*winkel/i] },
  { measureId: "NSp1", patterns: [/n\s*-\s*sp['’]?\s*-?\s*strecke/i] },
  { measureId: "Sp1Gn", patterns: [/sp['’]?\s*-\s*gn\s*-?\s*strecke/i] },
  { measureId: "HAngle", patterns: [/\bh\s*-\s*winkel/i] },
  { measureId: "Nasolabial", patterns: [/nasolabialwinkel/i] },
  { measureId: "FacialAxis", patterns: [/facislaxis/i, /fazialachse/i, /facial\s*axis/i] },
  { measureId: "JarabakIndex", patterns: [/jarabak/i, /^\s*ratio\b/i] },
  { measureId: "SNOccl", patterns: [/sn\s*-\s*occl/i, /okklusionsebene\s*-?\s*winkel/i] },
  { measureId: "Wits", patterns: [/\bwits\b/i] },
  { measureId: "Index", patterns: [/^\s*index\b/i, /hasund\s*-?\s*index/i] },
  { measureId: "SNA", patterns: [/sna\s*-?\s*winkel/i] },
  { measureId: "SNB", patterns: [/snb\s*-?\s*winkel/i] },
  { measureId: "ANB", patterns: [/anb\s*-?\s*winkel/i] },
];

const KNOWN = new Set(MEASURES.map(m => m.id));

/**
 * Numbers as a German evaluation prints them: `-1,0°`, `+24,3°`, `9,0mm`, `87,0%`.
 *
 * The lookbehind is load-bearing, and only the real printout showed why:
 * cephalometric labels are FULL of digits. `OK1-UK1 - Winkel` and `UK1-NB -
 * Strecke` both carry a `1` inside the label, and a naive number match cut the
 * label down to `OK` and lost every incisor row. A number only counts when it
 * does not follow a letter or another digit.
 */
const NUMBER = /(?<![\w,.])[+-]?\d+(?:[.,]\d+)?/g;

function numbersOn(line: string): number[] {
  const found = line.match(NUMBER) ?? [];
  return found
    .map(raw => Number(raw.replace(",", ".")))
    .filter(n => Number.isFinite(n));
}

/**
 * A line's label is whatever precedes its first number. Everything after is
 * columns, and the label is what identifies the measure.
 */
function labelOf(line: string): string {
  NUMBER.lastIndex = 0;
  const first = NUMBER.exec(line);
  NUMBER.lastIndex = 0;
  return (first === null ? line : line.slice(0, first.index)).trim();
}

function matchMeasure(label: string): string | null {
  for (const { measureId, patterns } of PATTERNS) {
    if (!KNOWN.has(measureId)) continue;
    for (const pattern of patterns) {
      if (pattern.test(label)) return measureId;
    }
  }
  return null;
}

/**
 * Pull cephalometric values out of pasted text.
 *
 * The column rule, from the shape a German evaluation actually prints: norm,
 * measurement, deviation. With three or more numbers the SECOND is the
 * measurement and the parse is confident. With fewer, the row is almost always
 * a norm with no measurement beside it — the first number is proposed so the
 * reader can see what was there, but flagged `low` so nothing lands
 * unchallenged.
 */
export function parseCephText(text: string): ParseResult {
  const values: ParsedValue[] = [];
  const unmatched: string[] = [];
  const seen = new Set<string>();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const candidates = numbersOn(line);
    if (candidates.length === 0) continue;

    const label = labelOf(line);
    if (!label) continue;

    // A line whose label carries "(ind.)" is a DERIVED value on the source
    // sheet, not a measurement. We compute our own; importing theirs would mix
    // two different equations into one record.
    if (/\(\s*ind\.?\s*\)/i.test(label)) continue;

    const measureId = matchMeasure(label);
    if (!measureId) {
      unmatched.push(line);
      continue;
    }
    // First match wins: an evaluation may print the same variable twice
    // (a follow-up column), and the first is the one being read.
    if (seen.has(measureId)) continue;
    seen.add(measureId);

    const confidence = candidates.length >= 3 ? "high" : "low";
    const value = confidence === "high" ? candidates[1] : candidates[0];
    values.push({ measureId, label, value, candidates, confidence, line });
  }

  return { values, unmatched };
}
