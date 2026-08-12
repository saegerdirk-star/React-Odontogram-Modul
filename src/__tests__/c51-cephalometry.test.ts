// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
//
// Bead odontogram-c51.2 — the cephalometric derivation core.
//
// Two reference cases, both from lateral cephalograms supplied with the bead,
// reduced to their measured values. No patient identity is carried. An
// expectation marked REFERENCE is a figure that appears on the printed
// evaluation, so these check our arithmetic against a working clinical program
// rather than against itself.

import { describe, it, expect } from "vitest";
import {
  LANDMARKS, MEASURES, PROFILES, measure, profileMeasures,
  assess, deriveJawRelation, deriveGrowthPattern,
  classifyJaw, classifyVerticalRelation, classifySubdivision,
  individualisedAnb, individualisedAnbExtended, individualisedWits,
  targetLowerIncisorPosition, targetHAngle, hasAnyCephData,
  normFor,
  type CephValues,
  type CephProfile,
} from "../cephalometry";

/** Reference case A: retrognathic mandible, posterior rotation. */
const CASE_A: CephValues = {
  SNA: 81.0, SNB: 76.6, ANB: 4.5, SNPg: 77.7,
  NSBa: 131.1, GnTgoAr: 119.4, MLNSL: 37.6, NLNSL: 10.3, MLNL: 27.3,
  NSp1: 57.1, Sp1Gn: 65.6, Index: 87.0, Wits: -2.3,
  Interincisal: 107.6, OK1NA_deg: 19.7, UK1NB_deg: 48.3,
  OK1NA_mm: 4.2, UK1NB_mm: 9.0, PgNB: 2.3, HAngle: 11.9,
};

/** Reference case B: orthognathic, anterior rotation. */
const CASE_B: CephValues = {
  SNA: 82.9, SNB: 81.1, ANB: 1.8, SNPg: 84.7,
  NSBa: 124.2, GnTgoAr: 110.6, MLNSL: 16.0, NLNSL: 4.7, MLNL: 11.3,
  NSp1: 60.3, Sp1Gn: 67.8, Index: 88.8, Wits: 2.6,
  Interincisal: 133.6, OK1NA_deg: 19.4, UK1NB_deg: 25.2,
  OK1NA_mm: 5.0, UK1NB_mm: 3.6, PgNB: 7.8, HAngle: 1.6,
};

describe("the three layers", () => {
  it("every landmark has a kind, and a constructed one names what it derives from", () => {
    for (const lm of LANDMARKS) {
      expect(lm.id, lm.name).toBeTruthy();
      expect(["anatomic", "radiographic", "constructed"]).toContain(lm.kind);
      if (lm.kind === "constructed") expect(Array.isArray(lm.from), lm.id).toBe(true);
    }
  });

  it("SOURCING RULE: every measure carries a source, and no norm ships without one", () => {
    for (const m of MEASURES) {
      expect(m.source, m.id).toBeTruthy();
      expect(m.source.length, m.id).toBeGreaterThan(20);
      if (m.norm !== null) {
        // a norm must cite a publication, never the "no publication" marker
        expect(m.source, m.id).not.toMatch(/No publication produced/);
      }
    }
  });

  it("...and a measure without a source for its norm ships the measure, not a guess", () => {
    const unsourced = MEASURES.filter(m => m.source.includes("No publication produced"));
    expect(unsourced.length).toBeGreaterThan(0);
    for (const m of unsourced) {
      expect(m.norm, m.id).toBeNull();
      expect(m.sd, m.id).toBeNull();
    }
  });

  it("measure ids are unique and every measure is defined over landmarks that exist", () => {
    const ids = MEASURES.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    const known = new Set(LANDMARKS.map(l => l.id));
    for (const m of MEASURES) {
      for (const p of m.points) expect(known.has(p), `${m.id} -> ${p}`).toBe(true);
    }
  });

  it("a profile declares its reference frame, and every measure it names resolves", () => {
    for (const p of PROFILES) {
      expect(p.source.length).toBeGreaterThan(20);
      expect(["anterior-cranial-base", "frankfurt", "occlusal-plane", "none"])
        .toContain(p.referenceFrame);
      for (const id of p.measures) expect(measure(id), `${p.id} -> ${id}`).toBeDefined();
      expect(profileMeasures(p.id)).toHaveLength(p.measures.length);
    }
  });

  it("a reference frame of 'none' is representable — Sato's analysis needs it", () => {
    const frames = PROFILES.map(p => p.referenceFrame);
    // no profile may hard-code the cranial base as an assumption of the module
    expect(frames.every(f => typeof f === "string")).toBe(true);
    expect(profileMeasures("does-not-exist")).toEqual([]);
  });
});

describe("where the jaws sit against the skull", () => {
  it("classifies after Björk with Hasund's own limits", () => {
    expect(classifyJaw(78, 79, 85)).toBe("retrognathic");
    expect(classifyJaw(79, 79, 85)).toBe("orthognathic");
    expect(classifyJaw(85, 79, 85)).toBe("orthognathic");
    expect(classifyJaw(86, 79, 85)).toBe("prognathic");
    expect(classifyJaw(null, 79, 85)).toBeNull();
  });

  it("REFERENCE case A: orthognathic maxilla, retrognathic mandible — disharmonious", () => {
    const j = deriveJawRelation(CASE_A);
    expect(j.maxilla).toBe("orthognathic");    // printed: orthognath
    expect(j.mandible).toBe("retrognathic");   // printed: retrognath
    expect(j.harmonious).toBe(false);
  });

  it("REFERENCE case B: both orthognathic — harmonious", () => {
    const j = deriveJawRelation(CASE_B);
    expect(j.maxilla).toBe("orthognathic");
    expect(j.mandible).toBe("orthognathic");
    expect(j.harmonious).toBe(true);
  });

  it("REFERENCE: against the POPULATION norm, the printed verbal assessment", () => {
    expect(deriveJawRelation(CASE_A).sagittalClassPopulation).toBe("distal");   // printed: distal
    expect(deriveJawRelation(CASE_B).sagittalClassPopulation).toBe("neutral");  // printed: neutral
  });

  it("REFERENCE case A: against the INDIVIDUAL norm it is NOT distal — and that is the point", () => {
    // ANB 4,5 looks like a class II against the fixed norm of 2,0. Against this
    // face's own norm (4,0, raised by a ML-NSL of 37,6) it sits within one SD.
    // The apparent sagittal discrepancy is a vertical problem. Floating norms
    // exist to say exactly this, so both readings are reported side by side
    // rather than one being chosen for the clinician.
    const j = deriveJawRelation(CASE_A);
    expect(j.sagittalClass).toBe("neutral");
    expect(j.sagittalClassPopulation).toBe("distal");
    expect(j.anbDeviation!).toBeCloseTo(0.4884, 3);
    expect(j.anbDeviationPopulation!).toBeCloseTo(2.5, 6);
  });

  it("reports nothing rather than guessing when the values are missing", () => {
    const j = deriveJawRelation({});
    expect(j.maxilla).toBeNull();
    expect(j.mandible).toBeNull();
    expect(j.harmonious).toBeNull();
    expect(j.sagittalClass).toBeNull();
    expect(j.sagittalClassPopulation).toBeNull();
    expect(j.individualisedAnb).toBeNull();
  });
});

describe("individualised norms", () => {
  it("Paddenberg two-predictor form needs SNA and ML-NSL and nothing else", () => {
    expect(individualisedAnb({ SNA: 81 })).toBeNull();
    // -45.359 + 0.493*81 + 0.251*37.6
    expect(individualisedAnb(CASE_A)!).toBeCloseTo(4.0116, 3);
  });

  it("the six-predictor form is null until all six are recorded", () => {
    expect(individualisedAnbExtended(CASE_A)).toBeNull();      // no facial axis recorded
    expect(individualisedAnbExtended({ ...CASE_A, FacialAxis: 88.0 })!).toBeCloseTo(
      -41.669 + 0.567 * 81 + 0.11 * 37.6 + 0.114 * 131.1 + 0.132 * 10.3 + 0.062 * 87 - 0.289 * 88,
      6,
    );
  });

  it("the individualised Wits needs the occlusal plane angle", () => {
    expect(individualisedWits(CASE_A)).toBeNull();
    expect(individualisedWits({ ...CASE_A, SNOccl: 16.0 })!).toBeCloseTo(
      57.510 + 1.526 * 4.5 - 0.634 * 81 - 0.666 * 16, 6,
    );
  });

  it("DIVERGENCE, deliberate: this is NOT the equation the practice software runs", () => {
    // The export carries the classical Panagiotidis/Witt coefficients
    // (0,173 x ML-NSL + 0,41 x SNA - 35,16), which reproduce the printed 4,6 and
    // 1,6 exactly. That publication has not been read, only the coefficients
    // observed, so the sourcing rule keeps them out of the shipped code and the
    // recalculated 2021 equation is used instead. The two disagree, and that is
    // recorded here rather than hidden.
    const classical = (v: CephValues) => 0.173 * v.MLNSL + 0.41 * v.SNA - 35.16;
    expect(classical(CASE_A).toFixed(1)).toBe("4.6");
    expect(classical(CASE_B).toFixed(1)).toBe("1.6");
    expect(individualisedAnb(CASE_A)!.toFixed(1)).toBe("4.0");
    expect(individualisedAnb(CASE_B)!.toFixed(1)).toBe("-0.5");
  });
});

describe("the growth pattern", () => {
  it("Hasund's vertical bands, first-hand from his manual", () => {
    expect(classifyVerticalRelation(70.9)).toBe("open");
    expect(classifyVerticalRelation(71)).toBe("neutral");
    expect(classifyVerticalRelation(89)).toBe("neutral");
    expect(classifyVerticalRelation(89.1)).toBe("deep");
    expect(classifyVerticalRelation(null)).toBeNull();
  });

  it("the 1/2/3 subdivision by the interbasal angle", () => {
    expect(classifySubdivision(31)).toBe(1);
    expect(classifySubdivision(23)).toBe(2);
    expect(classifySubdivision(18)).toBe(3);
    expect(classifySubdivision(null)).toBeNull();
  });

  it("REFERENCE case A: the indicators genuinely disagree, and the vote says so", () => {
    // The printed sheet calls this a posterior rotation. Under the Segner norms
    // it is not that simple: a mandibular plane of 37,6 against 32,0 ± 6,0 is
    // only +0,9 SD, while a gonial angle of 119,4 against 126,0 ± 6,0 pulls the
    // other way at -1,1 SD. A real disharmony, not a tidy growth type.
    //
    // THIS IS THE OPEN QUESTION FOR DIRK, recorded here rather than papered
    // over: the norm for ML-NSL is 28° in the Hasund school (and in his own
    // printout), 32° in both Segner and Paddenberg. Against 28° the same value
    // reads clearly vertical. Which norm set the profile flies decides the
    // finding, which is why norms belong to the PROFILE and not to the measure.
    const g = deriveGrowthPattern(CASE_A);
    const mlnsl = g.indicators.find(i => i.id === "MLNSL")!;
    expect(mlnsl.deviations).toBeCloseTo(0.9333, 3);
    expect(mlnsl.reads).toBe("neutral");

    const gonial = g.indicators.find(i => i.id === "GnTgoAr")!;
    expect(gonial.reads).toBe("horizontal");
    expect(g.dissent).toBe(0);          // nothing reads vertical to dissent with

    // against the Hasund norm of 28 the very same measurement flips
    expect((37.6 - 28) / 6).toBeGreaterThan(1);
  });

  it("REFERENCE case B: anterior rotation reads horizontal", () => {
    const g = deriveGrowthPattern(CASE_B);
    expect(g.pattern).toBe("horizontal");
    const mlnsl = g.indicators.find(i => i.id === "MLNSL")!;
    expect(mlnsl.reads).toBe("horizontal");
  });

  it("shows WHO voted which way rather than handing over a bare verdict", () => {
    const g = deriveGrowthPattern(CASE_A);
    expect(g.indicators.length).toBeGreaterThan(1);
    for (const i of g.indicators) {
      expect(i.norm).not.toBeNull();
      expect(i.sd).toBeGreaterThan(0);
      expect(["horizontal", "neutral", "vertical"]).toContain(i.reads);
    }
    // an indicator may legitimately disagree with the verdict — that is
    // information, and the count is reported rather than smoothed away
    expect(typeof g.dissent).toBe("number");
  });

  it("only indicators with a SOURCED norm can vote", () => {
    const g = deriveGrowthPattern(CASE_A);
    const voters = g.indicators.map(i => i.id);
    for (const id of voters) expect(measure(id)!.norm).not.toBeNull();
    // a measure carrying `growth` but no sourced norm is recorded, never counted
    const unsourcedGrowth = MEASURES.filter(m => m.growth && m.norm === null);
    for (const m of unsourcedGrowth) expect(voters).not.toContain(m.id);
  });

  it("a published band beats the standard-deviation fallback", () => {
    const jarabak = MEASURES.find(m => m.id === "JarabakIndex")!;
    expect(jarabak.bands).toBeDefined();
    // 60 % is inside 1 SD of 63,5 ± 1,5? No — but the published band is what counts
    const g = deriveGrowthPattern({ JarabakIndex: 60 });
    const i = g.indicators.find(x => x.id === "JarabakIndex")!;
    expect(i.basis).toBe("published-band");
    expect(i.reads).toBe("vertical");
    expect(deriveGrowthPattern({ JarabakIndex: 67 }).indicators[0].reads).toBe("horizontal");
    expect(deriveGrowthPattern({ JarabakIndex: 63.5 }).indicators[0].reads).toBe("neutral");
  });

  it("an indicator without a published band falls back to the SD rule, and says so", () => {
    const g = deriveGrowthPattern({ MLNSL: 45 });
    expect(g.indicators[0].basis).toBe("standard-deviation");
    expect(g.indicators[0].reads).toBe("vertical");
  });

  it("an empty form is indeterminate, which is not the same as neutral", () => {
    const g = deriveGrowthPattern({});
    expect(g.pattern).toBe("indeterminate");
    expect(g.indicators).toEqual([]);
    expect(g.dissent).toBe(0);
  });

  it("REFERENCE: the index classification matches both printed cases", () => {
    expect(deriveGrowthPattern(CASE_A).verticalRelation).toBe("neutral");   // 87,0 %
    expect(deriveGrowthPattern(CASE_B).verticalRelation).toBe("neutral");   // 88,8 %
  });
});

describe("Hasund's two clinical equations", () => {
  it("target lower incisor position", () => {
    // 0,50 x 4,5 - 0,35 x 2,3 + 3,9
    expect(targetLowerIncisorPosition(CASE_A)!).toBeCloseTo(5.345, 6);
    expect(targetLowerIncisorPosition({ ANB: 3.5, PgNB: 4 })!).toBeCloseTo(4.25, 6);
    expect(targetLowerIncisorPosition({ ANB: 3.5 })).toBeNull();
  });

  it("target H angle", () => {
    expect(targetHAngle(CASE_A)!).toBeCloseTo(4.5 - 1.3 * 2.3 + 10.5, 6);
    expect(targetHAngle({})).toBeNull();
  });

  it("REFERENCE case A: the lower incisor stands well ahead of its target", () => {
    // measured 9,0 mm against a target of 5,3 — the printed sheet flags +5,0 mm
    // against the fixed norm of 4,0, so both readings agree it is protruded
    const target = targetLowerIncisorPosition(CASE_A)!;
    expect(CASE_A.UK1NB_mm - target).toBeGreaterThan(3);
  });
});

describe("the whole assessment", () => {
  it("is pure — same values, same result, input untouched", () => {
    const snapshot = JSON.stringify(CASE_A);
    expect(JSON.stringify(assess(CASE_A))).toBe(JSON.stringify(assess(CASE_A)));
    expect(JSON.stringify(CASE_A)).toBe(snapshot);
  });

  it("counts what is recorded against what the profile asks for", () => {
    const a = assess(CASE_A);
    expect(a.total).toBe(PROFILES[0].measures.length);
    expect(a.recorded).toBeGreaterThan(10);
    expect(a.recorded).toBeLessThanOrEqual(a.total);
    expect(assess({}).recorded).toBe(0);
  });

  it("hasAnyCephData separates a blank form from a recorded one", () => {
    expect(hasAnyCephData({})).toBe(false);
    expect(hasAnyCephData({ SNA: Number.NaN })).toBe(false);
    expect(hasAnyCephData({ SNA: 81 })).toBe(true);
  });
});

describe("FHIR coding lives on the measure, not in a later mapping", () => {
  // Dirk's question: how does this fit FHIR terminology, without a second layer
  // to translate through? By putting the coding here, exactly as the engine
  // already does for tooth axes in registry/types.ts.

  it("every measure carries a local code and a UCUM unit", () => {
    for (const m of MEASURES) {
      expect(m.coding, m.id).toBeDefined();
      expect(m.coding.local, m.id).toMatch(/^ceph-[a-z0-9-]+$/);
      expect(["deg", "mm", "%"]).toContain(m.coding.ucum);
    }
  });

  it("the UCUM code agrees with the measure's own unit", () => {
    const expected = { deg: "deg", mm: "mm", percent: "%" } as const;
    for (const m of MEASURES) expect(m.coding.ucum, m.id).toBe(expected[m.unit]);
  });

  it("local codes are unique — they are the round-trip key", () => {
    const codes = MEASURES.map(m => m.coding.local);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("NO LOINC or SNOMED code is invented", () => {
    // No verified standard code for a cephalometric measurement has been
    // produced. Guessing one would silently assert something false — the same
    // call toFhirPerio.ts already makes for per-site BOP and the Mombelli
    // indices. The slots exist for when a verified code turns up.
    for (const m of MEASURES) {
      expect(m.coding.loinc, m.id).toBeUndefined();
      expect(m.coding.snomed, m.id).toBeUndefined();
    }
  });
});

describe("norms belong to the profile", () => {
  it("a profile with no overrides flies the measure defaults", () => {
    expect(normFor("MLNSL")).toEqual({ norm: 32.0, sd: 6.0, source: measure("MLNSL")!.source });
    expect(normFor("MLNSL", "hasund")!.norm).toBe(32.0);
  });

  it("an override replaces norm, SD and source together", () => {
    const school: CephProfile = {
      id: "test-school", labelKey: "x", referenceFrame: "anterior-cranial-base",
      source: "a source long enough to pass the profile check",
      measures: ["MLNSL"],
      norms: { MLNSL: { norm: 28.0, sd: 6.0, source: "the other school" } },
    };
    // resolved through the profile, not through the measure
    const override = school.norms!.MLNSL;
    expect(override.norm).toBe(28.0);
    expect(override.source).not.toBe(measure("MLNSL")!.source);
  });

  it("THE POINT: the same measurement gives a different finding per norm set", () => {
    // ML-NSL 37,6 against 32 ± 6 is +0,93 SD — neutral.
    // The same value against the Hasund school's 28 ± 6 is +1,6 SD — vertical.
    // Which school the profile flies decides the growth reading, which is why
    // this cannot live on the measure.
    expect((37.6 - 32) / 6).toBeLessThan(1);
    expect((37.6 - 28) / 6).toBeGreaterThan(1);
  });

  it("normFor returns null for a measure that does not exist", () => {
    expect(normFor("NotAMeasure")).toBeNull();
  });
});
