// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger 2026
//
// Keyboard entry in the schematic view (Dirk, 25.09.2026: "ich brauche auch
// die Tastatur wie in charly"). His recorded session: `k`, `k`, `m` typed and
// nothing happened — every key handler hung on the anatomical tile holding the
// focus, and the schematic view has none. Now the view takes the keys at the
// document (`handleChartKeydown`): Tab walks 18 -> 28, then 38 -> 48 and wraps,
// Shift+Tab steps back, a plain arrow moves the selection, a finding key
// applies to the selected tooth, Cmd/Strg+Z takes it back. Real shell, no mocks.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, cleanup, waitFor, act } from "@testing-library/react";
import OdontogramShell from "../App";
import { __resetChartStateForTest, getToothDisplayState, getSelectedTeeth } from "../odontogram";

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

const press = async (key: string, opts: KeyboardEventInit = {}, target: Element = document.body) => {
  await act(async () => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...opts }));
  });
};
const highlighted = () =>
  [...document.querySelectorAll(".schematic-hit.is-active")].map((e) => Number((e as HTMLElement).dataset.tooth));

describe("schematic view: keyboard entry", () => {
  it("Tab walks 18 -> 28 -> 38 -> 48, keys enter findings, arrows move, Cmd+Z undoes", async () => {
    render(<OdontogramShell />);
    await waitFor(() => {
      expect(document.querySelectorAll("#toothGrid .tooth-tile.side-view").length).toBeGreaterThan(0);
    }, { timeout: 30000 });
    await act(async () => { (document.getElementById("appViewSchematic") as HTMLElement).click(); });
    await waitFor(() => expect(document.querySelector("svg.schematic-chart")).not.toBeNull());

    await press("Tab");                                   // nothing selected -> the walk starts at 18
    expect(getSelectedTeeth()).toEqual([18]);
    expect(highlighted()).toEqual([18]);

    await press("x");                                     // a finding on its own applies at once
    expect(getToothDisplayState(18).extractionPlan).toBe(true);
    await press("z", { metaKey: true });                  // and Cmd+Z takes it back
    expect(getToothDisplayState(18).extractionPlan).toBe(false);

    await press("ArrowRight");                            // a plain arrow MOVES the selection here
    expect(getSelectedTeeth()).toEqual([17]);

    for (let i = 0; i < 14; i++) await press("Tab");      // 17 -> 28
    expect(getSelectedTeeth()).toEqual([28]);
    await press("Tab");                                   // the upper arch ends at 28, the walk goes on at 38
    expect(getSelectedTeeth()).toEqual([38]);
    await press("Tab", { shiftKey: true });               // Shift+Tab steps back
    expect(getSelectedTeeth()).toEqual([28]);

    // Typing while a keypad button holds the focus (the recorded case) still lands.
    const btn = document.querySelector(".schematic-keypad button") as HTMLElement;
    btn.focus();
    await press("x", {}, btn);
    expect(getToothDisplayState(28).extractionPlan).toBe(true);
  }, 90000);
});
