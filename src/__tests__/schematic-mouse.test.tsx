// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger 2026
//
// Mouse entry in the schematic view (Dirk, 25.09.2026: "Die Eingabe per Maus
// funktioniert nicht korrekt"). A surface or canal zone covers nearly every
// pixel of a tooth, so the FIRST click on a tooth must only select it — it used
// to write caries (top view) or cycle a root filling (root) on the way. And a
// click is a TOGGLE: the same finding on the same surface again takes it off,
// where before a click could only add. Real shell, no mocks: the chain runs
// App -> SchematicChart -> toggleSurfaceShorthand -> applyToSelected.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, cleanup, waitFor, act } from "@testing-library/react";
import OdontogramShell from "../App";
import { __resetChartStateForTest, getToothDisplayState } from "../odontogram";

beforeEach(() => {
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false, media: query, onchange: null,
        addListener() {}, removeListener() {},
        addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false,
      }),
    });
  }
  if (!("ResizeObserver" in window)) {
    Object.defineProperty(window, "ResizeObserver", {
      writable: true,
      value: class { observe() {} unobserve() {} disconnect() {} },
    });
  }
});

afterEach(async () => {
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  cleanup();
  __resetChartStateForTest();
});

const click = async (sel: string) => {
  const el = document.querySelector(sel);
  expect(el, sel).not.toBeNull();
  await act(async () => { el!.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
};
const caries = (t: number) => getToothDisplayState(t).caries;
const canals = (t: number) => getToothDisplayState(t).endoCanals;

describe("schematic view: mouse entry", () => {
  it("first click selects only; the next click enters; the same click again takes it off", async () => {
    render(<OdontogramShell />);
    await waitFor(() => {
      expect(document.querySelectorAll("#toothGrid .tooth-tile.side-view").length).toBeGreaterThan(0);
    }, { timeout: 30000 });
    await act(async () => { (document.getElementById("appViewSchematic") as HTMLElement).click(); });
    await waitFor(() => expect(document.querySelector("svg.schematic-chart")).not.toBeNull());

    const occl16 = '.schematic-surf-hit[data-tooth="16"][data-surf="o"]';
    await click(occl16);
    expect(document.querySelector('.schematic-hit.is-active[data-tooth="16"]')).not.toBeNull();
    expect(caries(16)).toEqual([]);                          // selected, nothing written

    await click(occl16);
    expect(caries(16)).toEqual(["caries-occlusal"]);         // now it enters

    await click(occl16);
    expect(caries(16)).toEqual([]);                          // and a second click takes it off

    // A root of a tooth that is NOT selected: select only, no root filling.
    const root46 = '.schematic-canal-hit[data-tooth="46"]';
    await click(root46);
    expect(document.querySelector('.schematic-hit.is-active[data-tooth="46"]')).not.toBeNull();
    expect(Object.keys(canals(46))).toEqual([]);
    await click(root46);
    expect(Object.values(canals(46)).flat()).toContain("filling");
  }, 90000);
});
