// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
//
// Bead odontogram-c51.2 — the cephalometric entry mask and its importer.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { CephalometryCard } from "../CephalometryCard";
import { setI18nLanguage } from "../i18n/useI18n";
import {
  getCephValue, getCephValues, setCephValue, resetCephValues, setReadOnly,
  __resetChartStateForTest,
} from "../odontogram";
import { profileMeasures } from "../cephalometry";

/** Reference case A, reduced to its measured values. */
const CASE_A: Record<string, number> = {
  SNA: 81.0, SNB: 76.6, ANB: 4.5, MLNSL: 37.6, NLNSL: 10.3, MLNL: 27.3,
  Index: 87.0, NSBa: 131.1, GnTgoAr: 119.4, PgNB: 2.3,
};

/** The column layout of a printed evaluation. */
const PRINTOUT = `SNA - Winkel      82,0°   81,0°   -1,0°
SNB - Winkel      80,0°   76,6°   -3,4°
ANB - Winkel       2,0°    4,5°   +2,5°
ML-NSL - Winkel   28,0°   37,6°   +9,6°
Nasolabialwinkel 110,0°`;

const field = (id: string) =>
  document.querySelector<HTMLInputElement>(`.ceph-input[data-measure="${id}"]`)!;

const type = (id: string, value: string) => {
  fireEvent.focus(field(id));
  fireEvent.change(field(id), { target: { value } });
};

const fill = (values: Record<string, number>) =>
  act(() => { for (const [k, v] of Object.entries(values)) setCephValue(k, v); });

beforeEach(() => {
  __resetChartStateForTest();
  resetCephValues();
  setReadOnly(false);
  setI18nLanguage("de");
});
afterEach(cleanup);

describe("the mask", () => {
  it("renders one row per measure of the active profile", () => {
    render(<CephalometryCard />);
    expect(document.querySelectorAll(".ceph-table tbody tr"))
      .toHaveLength(profileMeasures("hasund").length);
  });

  it("writes a typed value through to the engine, comma and all", () => {
    render(<CephalometryCard />);
    type("SNA", "81,0");
    expect(getCephValue("SNA")).toBe(81);
  });

  it("clearing a field un-records the measure rather than storing zero", () => {
    render(<CephalometryCard />);
    type("SNA", "81");
    type("SNA", "");
    expect(getCephValue("SNA")).toBeNull();
  });

  it("keeps a negative value, and survives a half-typed minus", () => {
    // ANB, not Wits: Wits is not part of the Hasund profile, so it has no row.
    // A negative ANB is a skeletal class III, which is exactly a value that has
    // to survive being typed one character at a time.
    render(<CephalometryCard />);
    type("ANB", "-");
    expect(field("ANB").value).toBe("-");
    type("ANB", "-2,3");
    expect(getCephValue("ANB")).toBe(-2.3);
  });

  it("shows a sourced norm with its SD, and a dash where no norm is sourced", () => {
    render(<CephalometryCard />);
    const norm = (id: string) =>
      document.querySelector(`tr[data-row="${id}"] .ceph-norm`)!.textContent;
    expect(norm("SNA")).toBe("82,0 ± 3,0");
    expect(norm("MLNSL")).toBe("32,0 ± 6,0");
    expect(norm("SNPg")).toBe("—");          // no publication produced
    expect(norm("HAngle")).toBe("—");
  });

  it("counts what is recorded against what the profile asks for", () => {
    render(<CephalometryCard />);
    expect(document.querySelector(".ceph-progress")!.textContent).toMatch(/^0 von/);
    fill(CASE_A);
    expect(document.querySelector(".ceph-progress")!.textContent)
      .toMatch(new RegExp(`^${Object.keys(CASE_A).length} von`));
  });

  it("read-only disables every field", () => {
    setReadOnly(true);
    render(<CephalometryCard />);
    expect(field("SNA").disabled).toBe(true);
  });
});

describe("the findings, live", () => {
  it("REFERENCE case A: names the facial type and the disharmony", () => {
    render(<CephalometryCard />);
    fill(CASE_A);
    const dd = Array.from(document.querySelectorAll(".ceph-findings dd")).map(d => d.textContent);
    expect(dd[0]).toBe("orthognath");
    expect(dd[1]).toBe("retrognath");
    expect(dd[2]).toBe("dysharmonisch");
  });

  it("REFERENCE case A: shows BOTH sagittal readings and flags that they differ", () => {
    render(<CephalometryCard />);
    fill(CASE_A);
    const dd = Array.from(document.querySelectorAll(".ceph-findings dd"));
    expect(dd[3].textContent).toMatch(/^neutral/);              // individual norm
    expect(dd[4].textContent).toMatch(/^distal/);               // population norm
    expect(dd[4].textContent).toMatch(/weicht von der individuellen Norm ab/);
    expect(dd[4].className).toMatch(/ceph-conflict/);
  });

  it("lists every growth indicator with its deviation and what decided it", () => {
    render(<CephalometryCard />);
    fill(CASE_A);
    const rows = Array.from(document.querySelectorAll(".ceph-indicators li"))
      .map(li => li.textContent);
    expect(rows.length).toBeGreaterThan(2);
    expect(rows.join(" ")).toMatch(/publiziertes Band/);
    expect(rows.join(" ")).toMatch(/Standardabweichung/);
  });

  it("an empty form says indeterminate, not neutral", () => {
    render(<CephalometryCard />);
    const dd = Array.from(document.querySelectorAll(".ceph-findings dd")).map(d => d.textContent);
    expect(dd[5]).toBe("unbestimmt");
  });
});

describe("importing from a printed evaluation", () => {
  const open = () => fireEvent.click(document.querySelector("#cephImportToggle")!);
  const paste = (text: string) =>
    fireEvent.change(document.querySelector(".ceph-import-text")!, { target: { value: text } });
  const rows = () => Array.from(document.querySelectorAll(".ceph-import-list li"));

  it("finds the measures and proposes the measurement column", () => {
    render(<CephalometryCard />);
    open();
    paste(PRINTOUT);
    expect(rows()).toHaveLength(5);
    const values = rows().map(li => li.querySelector(".ceph-import-value")!.textContent);
    expect(values.slice(0, 4)).toEqual(["81,0", "76,6", "4,5", "37,6"]);
  });

  it("SAFETY: a norm-only row starts unchecked and is marked uncertain", () => {
    render(<CephalometryCard />);
    open();
    paste(PRINTOUT);
    const nasolabial = rows()[4];
    expect(nasolabial.className).toMatch(/conf-low/);
    expect(nasolabial.querySelector("input")!.checked).toBe(false);
    expect(nasolabial.textContent).toMatch(/unsicher/i);
  });

  it("nothing reaches the chart until the reader applies it", () => {
    render(<CephalometryCard />);
    open();
    paste(PRINTOUT);
    expect(getCephValues()).toEqual({});          // parsed, not applied
    fireEvent.click(document.querySelector(".ceph-import-actions button")!);
    expect(getCephValue("SNA")).toBe(81);
    expect(getCephValue("MLNSL")).toBe(37.6);
  });

  it("...and the unchecked uncertain row is NOT applied", () => {
    render(<CephalometryCard />);
    open();
    paste(PRINTOUT);
    fireEvent.click(document.querySelector(".ceph-import-actions button")!);
    expect(getCephValue("Nasolabial")).toBeNull();   // the 110° norm never lands
  });

  it("a row the reader ticks IS applied, uncertain or not", () => {
    render(<CephalometryCard />);
    open();
    paste(PRINTOUT);
    fireEvent.click(rows()[4].querySelector("input")!);
    fireEvent.click(document.querySelector(".ceph-import-actions button")!);
    expect(getCephValue("Nasolabial")).toBe(110);
  });

  it("cancelling applies nothing and closes", () => {
    render(<CephalometryCard />);
    open();
    paste(PRINTOUT);
    const buttons = document.querySelectorAll(".ceph-import-actions button");
    fireEvent.click(buttons[1]);
    expect(getCephValues()).toEqual({});
    expect(document.querySelector("#cephImport")).toBeNull();
  });

  it("says so when it recognises nothing", () => {
    render(<CephalometryCard />);
    open();
    paste("Guten Tag, hier sind 42 Grüße");
    expect(rows()).toHaveLength(0);
    expect(document.querySelector(".ceph-import-empty")).not.toBeNull();
  });

  it("shows every candidate on the line, so the choice can be checked", () => {
    render(<CephalometryCard />);
    open();
    paste(PRINTOUT);
    expect(rows()[0].querySelector(".ceph-import-cands")!.textContent)
      .toBe("[82,0 · 81,0 · -1,0]");
  });
});
