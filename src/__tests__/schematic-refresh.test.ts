// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger 2026
//
// Schematic view after the market review (25.09.2026, docs/marktschau/README.md):
// a bridge is JOINED, a crown shows in the top
// view too, the top view's shape says the tooth class, and a restoration badge
// hangs on the crown end of the glyph in both arches. Pure string output, so the
// tests read the SVG string; state is reset before every test.
import { describe, it, expect, beforeEach } from "vitest";
import { __setToothStateForTest, __resetChartStateForTest, getToothDisplayState } from "../odontogram";
import { buildSchematicSvg, laneTokens } from "../schematicGraphic";

beforeEach(() => { __resetChartStateForTest(); });

const svg = () => buildSchematicSvg(getToothDisplayState);
const count = (s: string, needle: string) => s.split(needle).length - 1;
/** The d of the clickable buccal zone of one tooth — its path starts at the box's
 *  top-left corner, so the x there is the box's left edge in the cell. */
const buccalLeftX = (s: string, tooth: number) => {
  const m = s.match(new RegExp(`data-tooth="${tooth}" data-surf="v" d="M([0-9.]+),`));
  return m ? Number(m[1]) : NaN;
};

describe("schematic: bridge is joined", () => {
  it("Krone - Brückenglied - Krone draws one connector per joint in both rows", () => {
    __setToothStateForTest(24, { restorationType: "crown", restorationMaterial: "gold" });
    __setToothStateForTest(25, { toothSelection: "none", restorationType: "bridge", restorationMaterial: "gold" });
    __setToothStateForTest(26, { restorationType: "bridge", restorationMaterial: "gold" });
    // two joints (24-25, 25-26) x two rows (top view + side view)
    expect(count(svg(), 'class="schematic-bridge"')).toBe(4);
  });

  it("two single crowns side by side are not a bridge", () => {
    __setToothStateForTest(24, { restorationType: "crown", restorationMaterial: "gold" });
    __setToothStateForTest(25, { restorationType: "crown", restorationMaterial: "gold" });
    expect(count(svg(), 'class="schematic-bridge"')).toBe(0);
  });
});

describe("schematic: crown in the top view", () => {
  it("a crown fills the occlusal box as well as the side-view crown (versorgt)", () => {
    const versorgt = 'fill="#aab8ca"';
    const before = count(svg(), versorgt);
    __setToothStateForTest(16, { restorationType: "crown", restorationMaterial: "gold" });
    expect(count(svg(), versorgt) - before).toBe(2);   // side crown + top view
  });
});

describe("schematic: the top view's shape says the tooth class", () => {
  it("a premolar box is narrower than a molar box, an anterior wider than a premolar", () => {
    const s = svg();
    const molar = buccalLeftX(s, 16), premolar = buccalLeftX(s, 14), anterior = buccalLeftX(s, 11);
    // left edge further right = narrower box (all are centred in the same cell)
    expect(premolar).toBeGreaterThan(molar);
    expect(anterior).toBeLessThan(premolar);
  });
});

describe("schematic: shorthand lane — what one would type (Form D)", () => {
  const lane = (tn: number) => laneTokens(tn, getToothDisplayState(tn)).map(line => line.map(t => t.t).join(" "));
  it("material first, lower k the crown, upper K the composite", () => {
    __setToothStateForTest(16, { restorationType: "crown", restorationMaterial: "gold" });
    __setToothStateForTest(14, { fillingSurfaces: ["occlusal", "distal"], fillingSurfaceMaterials: { occlusal: "composite", distal: "composite" } });
    __setToothStateForTest(12, { fillingSurfaces: ["mesial"], fillingSurfaceMaterials: { mesial: "amalgam" } });
    expect(lane(16)).toEqual(["G k", ""]);
    expect(lane(14)).toEqual(["K od", ""]);
    expect(lane(12)).toEqual(["A m", ""]);
  });
  it("caries with and without a stage, marked as caries", () => {
    __setToothStateForTest(15, { caries: ["caries-mesial", "caries-occlusal"] });
    __setToothStateForTest(46, { caries: ["caries-mesial", "caries-occlusal", "caries-distal"], cariesSeverity: { mesial: 4, occlusal: 4, distal: 4 } });
    expect(lane(15)).toEqual(["c mo", ""]);
    expect(lane(46)).toEqual(["cK3 mod", ""]);
    expect(laneTokens(15, getToothDisplayState(15))[0][0].red).toBe(true);
  });
  it("bridge: abutments typed as crowns, the pontic as b; endo on the second line", () => {
    __setToothStateForTest(24, { restorationType: "crown", restorationMaterial: "zircon" });
    __setToothStateForTest(25, { toothSelection: "none", restorationType: "bridge", restorationMaterial: "zircon" });
    __setToothStateForTest(47, { endo: "endo-filling", rootPostType: "metal", restorationType: "crown", restorationMaterial: "emax" });
    expect(lane(24)).toEqual(["Zir k", ""]);
    expect(lane(25)).toEqual(["Zir b", ""]);
    expect(lane(47)).toEqual(["E k", "wf Sti"]);
  });
  it("a missing tooth has an empty lane (it shows a big f)", () => {
    __setToothStateForTest(18, { toothSelection: "none" });
    expect(lane(18)).toEqual(["", ""]);
    expect(svg()).toContain(">f</text>");
  });
});

describe("schematic: the selected tooth's number as a pill", () => {
  it("draws a hidden pill face beside every number, stamped by the view", () => {
    const s = svg();
    expect(count(s, 'class="schem-num"')).toBe(32);
    expect(count(s, 'class="schem-num-sel"')).toBe(32);
    expect(s).toContain('rx="9.5" fill="#26344d"');   // the light pill
  });
});

describe("schematic: milk teeth, not erupted, numbering, hidden wisdom teeth (25.09.2026 review)", () => {
  it("a milk tooth on 15 is drawn as 55, with a primary-molar top view", () => {
    const premolar = buccalLeftX(svg(), 15);          // the slot's permanent premolar
    __setToothStateForTest(15, { toothSelection: "milktooth" });
    const s = svg();
    expect(s).toContain(">55<");
    expect(s).not.toMatch(/>15</);
    // a primary MOLAR top view (the molar shape scaled 0.82) is wider than the
    // premolar of its slot: its frame starts further left
    expect(buccalLeftX(s, 15)).toBeLessThan(premolar);
  });

  it("an upper primary molar draws three roots, a lower two (premolar slot: one)", () => {
    // White tooth shapes (crowns + roots) all carry this exact attribute run;
    // the difference between two states is the number of roots added.
    const shapes = () => count(svg(), 'fill="#ffffff" stroke="#26344d" stroke-width="2" stroke-linejoin="round"');
    const permanent = shapes();
    __setToothStateForTest(15, { toothSelection: "milktooth" });   // 55: 3 roots instead of 1
    expect(shapes() - permanent).toBe(2);
    __setToothStateForTest(45, { toothSelection: "milktooth" });   // 85: 2 roots instead of 1
    expect(shapes() - permanent).toBe(3);
  });

  it("a tooth not erupted yet is a faint dotted outline and takes no surface click", () => {
    __setToothStateForTest(17, { toothSelection: "not-erupted" });
    const s = svg();
    expect(s).toContain('stroke-dasharray="0.1 4"');
    expect(s).not.toContain('data-tooth="17" data-surf=');
  });

  it("labels follow the caller (numbering system + milk remap), hidden teeth draw nothing", () => {
    const s = buildSchematicSvg(getToothDisplayState, {
      label: (tn) => `#${tn}`,
      hidden: (tn) => tn === 18,
    });
    expect(s).toContain(">#16<");
    expect(s).not.toContain('data-tooth="18"');
    expect(s).not.toContain(">#18<");
  });
});

describe("schematic: pocket depths as lines (WHO 3.5 / 5.5 mm)", () => {
  const pd: Record<number, Record<string, number>> = {
    16: { MB: 6, B: 3, DB: 7, ML: 4, L: 3, DL: 5 },
    15: { MB: 2, B: 2, DB: 3, ML: 3, L: 2, DL: 3 },
  };
  it("is drawn only when asked for", () => {
    expect(svg()).not.toContain("schem-pocket-layer");
    const s = buildSchematicSvg(getToothDisplayState, { pocketDepths: (tn) => pd[tn] ?? {} });
    expect(s).toContain("schem-pocket-layer");
  });

  it("draws both WHO reference lines per present tooth, and one line per aspect", () => {
    const s = buildSchematicSvg(getToothDisplayState, { pocketDepths: (tn) => pd[tn] ?? {} });
    expect(count(s, 'class="schem-who-55"')).toBe(32);
    expect(count(s, 'class="schem-who-35"')).toBe(32);
    // 16 and 15 are neighbours: one buccal and one oral run through both
    expect(count(s, 'class="schem-pocket"')).toBe(1);
    expect(count(s, 'class="schem-pocket is-oral"')).toBe(1);
  });

  it("colours a site by the WHO band: over 5.5 red, over 3.5 orange", () => {
    const s = buildSchematicSvg(getToothDisplayState, { pocketDepths: (tn) => pd[tn] ?? {} });
    expect(count(s, 'r="2.4" fill="#c62828"')).toBe(2);   // 16 MB 6, DB 7 (buccal)
    expect(count(s, 'stroke="#d98f4a" stroke-width="1.3"')).toBe(2);   // 16 ML 4, DL 5 (oral, hollow)
  });

  it("breaks at a missing tooth and skips it", () => {
    __setToothStateForTest(25, { toothSelection: "none" });
    const s = buildSchematicSvg(getToothDisplayState, { pocketDepths: () => ({ MB: 2, B: 2, DB: 2, ML: 2, L: 2, DL: 2 }) });
    expect(count(s, 'class="schem-who-55"')).toBe(31);
    // upper arch splits at 25 into two runs, lower stays one: 3 buccal runs
    expect(count(s, 'class="schem-pocket"')).toBe(3);
  });
});
