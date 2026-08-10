import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { OCCLUSAL_TEMPLATE } from "../odontogram";

/**
 * odontogram-vlw AC2: mesial must point toward the arch midline on every
 * occlusal tile. It never was asserted - the composition of a 180-degree
 * rotation for the lower jaw with a horizontal mirror for quadrants 2 and 4 was
 * only ever checked by eye.
 *
 * The landmark comes from the drawing itself: every template carries a
 * `mesial-shape` and a `distal-shape` path - the geometry the per-surface
 * caries and filling layers are built on - so which side is mesial is a
 * measurement, not an assumption.
 */

const svg = (tpl: number) =>
  readFileSync(resolve(__dirname, `../assets/teeth-svgs/${tpl}_occl.svg`), "utf8");

/** The x of a layer's starting point, in template units.
 *
 *  The absolute `M` coordinate, not a centroid. Averaging the numbers in path
 *  data looks reasonable and is wrong: the data is mostly RELATIVE commands
 *  with numbers that are not x,y pairs at all ("c2.7.2,2.7-14.6"), so a naive
 *  pair regex reads coordinates that do not exist. It put mesial on the wrong
 *  side of this very drawing. The starting point needs no parser and lies
 *  inside the shape, which is all this test needs to decide a side.
 *
 *  The id is anchored with its closing quote because several ids contain one
 *  another - `caries-mesial` sits inside `subcaries-mesial`. */
function layerStartX(markup: string, id: string): number {
  const m = new RegExp(`id="${id}"[^>]*?\\sd="M(-?\\d+\\.?\\d*)`).exec(markup);
  if (!m) throw new Error(`layer ${id} not found, or its path does not start with an absolute M`);
  return Number(m[1]);
}

function viewBoxCentreX(markup: string): number {
  const vb = /viewBox="([^"]+)"/.exec(markup)![1].split(/\s+/).map(Number);
  return vb[0] + vb[2] / 2;
}

/**
 * Which screen side mesial ends up on, given the tile's composition.
 * A horizontal mirror flips x; a 180-degree rotation flips x as well (and y).
 */
function mesialSideOnScreen(tpl: number, rot: number, mirror: boolean): "left" | "right" {
  const markup = svg(tpl);
  const drawnRight = layerStartX(markup, "mesial-shape") > viewBoxCentreX(markup);
  const flips = (rot === 180 ? 1 : 0) + (mirror ? 1 : 0);
  const right = flips % 2 === 0 ? drawnRight : !drawnRight;
  return right ? "right" : "left";
}

/**
 * The side the arch midline lies on for a given tooth, in the chart's own
 * layout: the upper row runs 18→11 then 21→28, the lower 48→41 then 31→38. So
 * for the right quadrants (1 and 4) the midline is to the right of each tile,
 * and for the left quadrants (2 and 3) it is to the left.
 */
const midlineSide = (toothNo: number): "left" | "right" =>
  Math.floor(toothNo / 10) === 1 || Math.floor(toothNo / 10) === 4 ? "right" : "left";

describe("occlusal tiles", () => {
  it("draws mesial to one side and distal to the other in each template", () => {
    // The premise of everything below: the landmark is real and unambiguous.
    for (const tpl of [14, 16]) {
      const markup = svg(tpl);
      const centre = viewBoxCentreX(markup);
      const mesial = layerStartX(markup, "mesial-shape");
      const distal = layerStartX(markup, "distal-shape");
      expect(mesial > centre, `template ${tpl}: mesial right of centre`).toBe(true);
      expect(distal < centre, `template ${tpl}: distal left of centre`).toBe(true);
    }
  });

  it("puts mesial toward the arch midline on every tile", () => {
    for (const [toothNo, map] of OCCLUSAL_TEMPLATE) {
      expect(
        mesialSideOnScreen(map.tpl, map.rot, map.mirror),
        `tooth ${toothNo}`,
      ).toBe(midlineSide(toothNo));
    }
  });

  it("covers every posterior tooth and nothing else", () => {
    const expected = [14, 15, 16, 17, 18, 24, 25, 26, 27, 28,
      34, 35, 36, 37, 38, 44, 45, 46, 47, 48];
    expect([...OCCLUSAL_TEMPLATE.keys()].sort((a, b) => a - b)).toEqual(expected);
  });

  it("mirrors the two halves of each arch against each other", () => {
    // A contralateral pair must be composed to opposite handedness, or one of
    // the two is drawn as if it came from the other side of the mouth.
    for (const [right, left] of [[14, 24], [16, 26], [34, 44], [36, 46]]) {
      const r = OCCLUSAL_TEMPLATE.get(right)!;
      const l = OCCLUSAL_TEMPLATE.get(left)!;
      expect(r.tpl, `${right}/${left} share a drawing`).toBe(l.tpl);
      expect(r.mirror === l.mirror, `${right}/${left} handedness`).toBe(false);
    }
  });
});
