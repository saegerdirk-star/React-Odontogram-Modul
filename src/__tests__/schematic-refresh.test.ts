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
import { buildSchematicSvg } from "../schematicGraphic";

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
  it("a crown fills the occlusal box as well as the side-view crown", () => {
    const gold = 'fill="#e0a80d"';
    const before = count(svg(), gold);
    __setToothStateForTest(16, { restorationType: "crown", restorationMaterial: "gold" });
    expect(count(svg(), gold) - before).toBe(2);   // side crown + top view
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

describe("schematic: restoration badge at the crown end", () => {
  it("upper arch (flipped): the K sits at the bottom of the side cell, lower arch at the top", () => {
    __setToothStateForTest(16, { restorationType: "crown", restorationMaterial: "gold" });
    __setToothStateForTest(46, { restorationType: "crown", restorationMaterial: "gold" });
    const ys = [...svg().matchAll(/<text class="schem-badge" x="71" y="([0-9.]+)" text-anchor="end" font-size="11" font-weight="600"[^>]*>K</g)]
      .map(m => Number(m[1]));
    expect(ys.sort((a, b) => a - b)).toEqual([14, 97]);
  });
});

describe("schematic: milk teeth, not erupted, numbering, hidden wisdom teeth (25.09.2026 review)", () => {
  it("a milk tooth on 15 is drawn as 55, with a primary-molar top view", () => {
    __setToothStateForTest(15, { toothSelection: "milktooth" });
    const s = svg();
    expect(s).toContain(">55<");
    expect(s).not.toMatch(/>15</);
    // primary molar box 52 wide (x0 = 12) — not the 50-wide premolar box of the slot (x0 = 13)
    expect(buccalLeftX(s, 15)).toBe(12);
  });

  it("an upper primary molar draws three roots, a lower two (premolar slot: one)", () => {
    // White tooth shapes (crowns + roots) all carry this exact attribute run;
    // the difference between two states is the number of roots added.
    const shapes = () => count(svg(), 'fill="#fff" stroke="#3b4a63" stroke-width="1.6" stroke-linejoin="round"');
    const permanent = shapes();
    __setToothStateForTest(15, { toothSelection: "milktooth" });   // 55: 3 roots instead of 1
    expect(shapes() - permanent).toBe(2);
    __setToothStateForTest(45, { toothSelection: "milktooth" });   // 85: 2 roots instead of 1
    expect(shapes() - permanent).toBe(3);
  });

  it("a tooth not erupted yet is a faint dotted outline and takes no surface click", () => {
    __setToothStateForTest(17, { toothSelection: "not-erupted" });
    const s = svg();
    expect(s).toContain('stroke-dasharray="1 3"');
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
