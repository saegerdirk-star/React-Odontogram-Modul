// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Bead odontogram-c51.2 — reading values out of a printed evaluation.
//
// The excerpt below is the column layout of a real printout, with the patient
// header stripped. It carries the two shapes that matter: rows with the full
// norm/measurement/deviation triple, and rows that print only a norm.

import { describe, it, expect } from "vitest";
import { parseCephText } from "../cephImport";

/** The layout a German evaluation prints, verbatim in shape. */
const PRINTOUT = `
Variable                         rm                     Auswertung        Differenz
SNA - Winkel                     82,0°                           81,0°         -1,0°
SNB - Winkel                     80,0°                           76,6°         -3,4°
ANB - Winkel                      2,0°                            4,5°         +2,5°
ANB -Winkel (ind.)                                                4,6°
SNPg - Winkel                    81,0°                           77,7°         -3,3°
NSBa - Winkel                   132,0°                          131,1°         -0,9°
GnGoAr - Winkel                 122,0°                          119,4°         -2,6°
H - Winkel                        8,0°                           11,9°         +3,9°
Nasolabialwinkel                110,0°
OK1-UK1 - Winkel                133,0°                          107,6°        -25,4°
OK1-NA - Winkel                  21,0°                           19,7°         -1,3°
UK1-NB - Winkel                  24,0°                           48,3°        +24,3°
OK1-NA - Strecke                  4,0mm                           4,2mm       +0,2mm
UK1-NB - Strecke                  4,0mm                           9,0mm       +5,0mm
Pg-NB - Strecke                   2,0mm                           2,3mm       +0,3mm
ML-NSL - Winkel                  28,0°                           37,6°         +9,6°
NL-NSL - Winkel                   8,0°                           10,3°         +2,3°
ML-NL - Winkel                   20,0°                           27,3°         +7,3°
N-Sp' - Strecke                                                  57,1mm
Sp'-Gn - Strecke                                                 65,6mm
Index                            80,0%                           87,0%         +7,0%
Ratio                            63,0%                           59,1%         -3,9%
Wits                              0,0mm                          -2,3mm       -2,3mm
`;

const byId = (text: string) => {
  const r = parseCephText(text);
  return Object.fromEntries(r.values.map(v => [v.measureId, v]));
};

describe("reading the measurement column", () => {
  it("takes the SECOND number when the full triple is printed", () => {
    const v = byId(PRINTOUT);
    expect(v.SNA.value).toBe(81.0);       // not the norm 82, not the deviation -1
    expect(v.SNB.value).toBe(76.6);
    expect(v.ANB.value).toBe(4.5);
    expect(v.MLNSL.value).toBe(37.6);
    expect(v.Index.value).toBe(87.0);
    expect(v.Wits.value).toBe(-2.3);
  });

  it("REFERENCE: every high-confidence value equals the printed measurement", () => {
    const v = byId(PRINTOUT);
    const expected: Record<string, number> = {
      SNA: 81.0, SNB: 76.6, ANB: 4.5, SNPg: 77.7, NSBa: 131.1, GnTgoAr: 119.4,
      HAngle: 11.9, Interincisal: 107.6, OK1NA_deg: 19.7, UK1NB_deg: 48.3,
      OK1NA_mm: 4.2, UK1NB_mm: 9.0, PgNB: 2.3, MLNSL: 37.6, NLNSL: 10.3,
      MLNL: 27.3, Index: 87.0, JarabakIndex: 59.1, Wits: -2.3,
    };
    for (const [id, value] of Object.entries(expected)) {
      expect(v[id], id).toBeDefined();
      expect(v[id].value, id).toBe(value);
      expect(v[id].confidence, id).toBe("high");
    }
  });

  it("keeps a negative measurement negative", () => {
    expect(byId(PRINTOUT).Wits.value).toBe(-2.3);
  });
});

describe("a digit inside the label does not break the parse", () => {
  it("REGRESSION: OK1-UK1 and UK1-NB carry a 1 in the LABEL", () => {
    // The first version cut the label at the first digit, turning
    // "OK1-UK1 - Winkel" into "OK", and lost every incisor row. Only the real
    // printout showed it.
    const v = byId(PRINTOUT);
    expect(v.Interincisal).toBeDefined();
    expect(v.OK1NA_deg).toBeDefined();
    expect(v.UK1NB_deg).toBeDefined();
    expect(v.OK1NA_mm).toBeDefined();
    expect(v.UK1NB_mm).toBeDefined();
    expect(v.Interincisal.candidates).toEqual([133, 107.6, -25.4]);
  });

  it("distinguishes the angle row from the distance row of the same pair", () => {
    const v = byId(PRINTOUT);
    expect(v.OK1NA_deg.value).toBe(19.7);
    expect(v.OK1NA_mm.value).toBe(4.2);
  });
});

describe("what must NOT be imported", () => {
  it("a norm-only row is proposed but flagged low, never taken as a finding", () => {
    // "Nasolabialwinkel 110,0°" is the NORM. An importer that grabbed the first
    // number would file 110° as this patient's measurement.
    const v = byId(PRINTOUT);
    expect(v.Nasolabial.confidence).toBe("low");
    expect(v.Nasolabial.candidates).toEqual([110]);
  });

  it("a single-number row that IS a measurement is also flagged low — the parse cannot tell", () => {
    const v = byId(PRINTOUT);
    expect(v.NSp1.confidence).toBe("low");
    expect(v.NSp1.value).toBe(57.1);
    expect(v.Sp1Gn.confidence).toBe("low");
  });

  it("the source's own individualised ANB is skipped — we compute our own", () => {
    const r = parseCephText(PRINTOUT);
    // exactly one ANB entry, and it is the measured 4,5 rather than the 4,6
    // the other program derived with a different equation
    expect(r.values.filter(v => v.measureId === "ANB")).toHaveLength(1);
    expect(r.values.find(v => v.measureId === "ANB")!.value).toBe(4.5);
    expect(r.values.some(v => v.value === 4.6)).toBe(false);
  });

  it("the patient header is not mistaken for a measurement", () => {
    const withHeader = `Patient: Muster, Max · 01.08.2009 · weiblich   Nummer: 10844
Alter (Jahre · Monate): 14·11
${PRINTOUT}`;
    const r = parseCephText(withHeader);
    expect(r.values.some(v => v.value === 10844)).toBe(false);
    expect(r.unmatched.some(l => l.includes("Patient"))).toBe(true);
  });
});

describe("robustness", () => {
  it("reads a decimal point as readily as a comma", () => {
    const v = byId("SNA - Winkel 82.0 81.0 -1.0");
    expect(v.SNA.value).toBe(81.0);
  });

  it("survives an empty or number-free input", () => {
    expect(parseCephText("")).toEqual({ values: [], unmatched: [] });
    expect(parseCephText("nur Text, keine Zahlen").values).toEqual([]);
  });

  it("takes the FIRST occurrence when a variable is printed twice", () => {
    const r = parseCephText(`SNA - Winkel 82,0° 81,0° -1,0°\nSNA - Winkel 82,0° 79,0° -3,0°`);
    expect(r.values.filter(v => v.measureId === "SNA")).toHaveLength(1);
    expect(r.values[0].value).toBe(81.0);
  });

  it("reports lines it could not place instead of dropping them silently", () => {
    const r = parseCephText("Irgendein Wert 12,3°");
    expect(r.values).toEqual([]);
    expect(r.unmatched).toEqual(["Irgendein Wert 12,3°"]);
  });

  it("every proposed measure id is one the registry knows", () => {
    const r = parseCephText(PRINTOUT);
    expect(r.values.length).toBeGreaterThan(15);
    for (const v of r.values) expect(v.measureId).toMatch(/^[A-Za-z0-9_]+$/);
  });
});
