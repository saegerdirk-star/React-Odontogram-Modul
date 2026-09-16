// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger 2026
//
// Planalternativen (Phase 1): from ONE plan to N named alternatives against the
// same Befund. `charts.plan` / `planEditedTeeth` are ALIASES to the active
// alternative, so this file pins what changed - the store, the switch, the
// independence of alternatives, the import of `plans` and of a legacy single
// `plan` - while r2a-dual-state / ds1-* keep pinning that "the plan" still
// behaves exactly as before. The odontogram never classifies an alternative
// (Regelversorgung etc.): that is the HKP-Engine's job, downstream of the FHIR
// store (Dirk, 16.09.2026). Module state, no DOM; reset before every test.
import { describe, it, expect, beforeEach } from "vitest";
import {
  setChartMode, getChartMode,
  listPlans, createPlan, renamePlan, setActivePlan, deletePlan, getActivePlanId,
  __setToothStateForTest, __getPlanStateForTest,
  __hydrateImportedChartsForTest, __resetChartStateForTest,
} from "../odontogram";

beforeEach(() => { __resetChartStateForTest(); });

describe("Planalternativen - Modell", () => {
  it("startet ohne Plan", () => {
    expect(listPlans()).toEqual([]);
    expect(getActivePlanId()).toBeNull();
  });

  it("der erste Wechsel in den Plan-Modus legt 'Plan 1' als Kopie des Befunds an", () => {
    __setToothStateForTest(16, { restorationType: "crown", restorationMaterial: "gold" });
    setChartMode("plan");
    const plans = listPlans();
    expect(plans).toHaveLength(1);
    expect(plans[0].name).toBe("Plan 1");
    expect(getActivePlanId()).toBe(plans[0].id);
    expect(__getPlanStateForTest(16)?.restorationType).toBe("crown");
  });

  it("createPlan legt eine weitere Alternative an, aktiviert sie und kopiert den Befund", () => {
    __setToothStateForTest(16, { restorationType: "crown" });
    setChartMode("plan");
    const b = createPlan("Implantat");
    expect(listPlans().map((p) => p.name)).toEqual(["Plan 1", "Implantat"]);
    expect(getActivePlanId()).toBe(b.id);
    expect(__getPlanStateForTest(16)?.restorationType).toBe("crown");
  });

  it("Alternativen sind unabhaengig: eine Aenderung in einer landet nicht in der anderen", () => {
    setChartMode("plan");
    const a = getActivePlanId()!;
    const b = createPlan("B").id;
    __setToothStateForTest(16, { restorationType: "crown" });      // in B
    expect(__getPlanStateForTest(16)?.restorationType).toBe("crown");
    setActivePlan(a);
    expect(getActivePlanId()).toBe(a);
    expect(__getPlanStateForTest(16)?.restorationType ?? "none").toBe("none");
    setActivePlan(b);
    expect(__getPlanStateForTest(16)?.restorationType).toBe("crown");
  });

  it("renamePlan benennt um; leerer oder unbekannter Name/Id wird abgelehnt", () => {
    setChartMode("plan");
    const id = getActivePlanId()!;
    expect(renamePlan(id, "Bruecke")).toBe(true);
    expect(listPlans()[0].name).toBe("Bruecke");
    expect(renamePlan(id, "   ")).toBe(false);
    expect(listPlans()[0].name).toBe("Bruecke");
    expect(renamePlan("gibt-es-nicht", "x")).toBe(false);
  });

  it("deletePlan: die aktive loeschen aktiviert die naechste; die letzte loeschen laesst keinen Plan und kehrt zum Status zurueck", () => {
    setChartMode("plan");
    const a = getActivePlanId()!;
    const b = createPlan("B").id;
    expect(getActivePlanId()).toBe(b);
    expect(deletePlan(b)).toBe(true);
    expect(getActivePlanId()).toBe(a);
    expect(listPlans()).toHaveLength(1);
    expect(getChartMode()).toBe("plan");
    expect(deletePlan(a)).toBe(true);
    expect(listPlans()).toEqual([]);
    expect(getActivePlanId()).toBeNull();
    expect(getChartMode()).toBe("status");
    expect(deletePlan("x")).toBe(false);
  });

  it("setActivePlan mit unbekannter id ist false und aendert nichts", () => {
    setChartMode("plan");
    const a = getActivePlanId();
    expect(setActivePlan("nope")).toBe(false);
    expect(getActivePlanId()).toBe(a);
  });

  it("Reset raeumt alle Alternativen", () => {
    setChartMode("plan");
    createPlan("B");
    __resetChartStateForTest();
    expect(listPlans()).toEqual([]);
    expect(getActivePlanId()).toBeNull();
  });
});

describe("Planalternativen - Import", () => {
  it("ein Legacy-Dokument mit EINEM `plan` wird zu einer Alternative 'Plan 1'", () => {
    __hydrateImportedChartsForTest({
      version: "2.11", globals: {}, teeth: {},
      plan: { 16: { restorationType: "crown" } },
    });
    expect(listPlans().map((p) => p.name)).toEqual(["Plan 1"]);
    expect(__getPlanStateForTest(16)?.restorationType).toBe("crown");
  });

  it("`plans` importiert mehrere Alternativen und aktiviert die per activePlanId", () => {
    __hydrateImportedChartsForTest({
      version: "2.11", globals: {}, teeth: {},
      plans: [
        { id: "plan-1", name: "Bruecke", teeth: { 16: { restorationType: "bridge" } } },
        { id: "plan-2", name: "Implantat", teeth: { 16: { toothSelection: "implant" } } },
      ],
      activePlanId: "plan-2",
    });
    expect(listPlans().map((p) => [p.id, p.name])).toEqual([["plan-1", "Bruecke"], ["plan-2", "Implantat"]]);
    expect(getActivePlanId()).toBe("plan-2");
    expect(__getPlanStateForTest(16)?.toothSelection).toBe("implant");
    setActivePlan("plan-1");
    expect(__getPlanStateForTest(16)?.restorationType).toBe("bridge");
  });

  it("ohne `plan`/`plans` gibt es keinen Plan; ein vorheriger wird ersetzt", () => {
    setChartMode("plan"); createPlan("B");
    __hydrateImportedChartsForTest({ version: "2.11", globals: {}, teeth: {} });
    expect(listPlans()).toEqual([]);
    expect(getActivePlanId()).toBeNull();
  });

  it("neue ids kollidieren nicht mit importierten plan-N ids", () => {
    __hydrateImportedChartsForTest({
      version: "2.11", globals: {}, teeth: {},
      plans: [{ id: "plan-7", name: "X", teeth: {} }],
    });
    const created = createPlan("Y");
    expect(created.id).not.toBe("plan-7");
    expect(new Set(listPlans().map((p) => p.id)).size).toBe(2);
  });
});
