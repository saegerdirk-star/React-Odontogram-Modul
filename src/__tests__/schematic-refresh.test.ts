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
    const ys = [...svg().matchAll(/<text x="71" y="([0-9.]+)" text-anchor="end" font-size="11" font-weight="600"[^>]*>K</g)]
      .map(m => Number(m[1]));
    expect(ys.sort((a, b) => a - b)).toEqual([14, 97]);
  });
});
