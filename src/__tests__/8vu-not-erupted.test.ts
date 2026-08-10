import { describe, it, expect, beforeEach } from "vitest";
import {
  __applyDentitionPresetForTest,
  __resetChartStateForTest,
  getOdontogramSummary,
  getStatusChart,
  setPlanChart,
  getPlanChart,
  __setToothStateForTest,
} from "../odontogram";
import { buildFhirBundle } from "../fhir/toFhir";
import { parseFhirBundle } from "../fhir/fromFhir";
import { buildDentalDeBundle } from "../fhir/toFhirDentalDe";
import { applyDentalDeResource, isDentalDeResource } from "../fhir/fromFhirDentalDe";

/**
 * odontogram-8vu: a position whose tooth has not erupted is not a missing
 * tooth. Nothing was lost and nothing is absent that ought to be there.
 */

const UNERUPTED_IN_PRIMARY = [16, 17, 18, 26, 27, 28, 36, 37, 38, 46, 47, 48];

beforeEach(() => __resetChartStateForTest());

describe("teeth that have not erupted", () => {
  it("AC1: a milk dentition reports no missing teeth", () => {
    __applyDentitionPresetForTest("primary");
    const summary = getOdontogramSummary();
    // The whole point. Before this, a healthy four-year-old's chart read
    // "teeth marked missing (12): 18, 17, 16, ...".
    expect(summary.missingList).toBeNull();
    expect(summary.uneruptedList).toContain("12");
  });

  it("AC1: a mixed dentition reports no missing teeth either", () => {
    __applyDentitionPresetForTest("mixed");
    expect(getOdontogramSummary().missingList).toBeNull();
  });

  it("keeps saying 'missing' where a tooth really is missing", () => {
    // The distinction has to cut both ways, or it is only a rename. An adult
    // who lost 36 must still read as having a missing tooth.
    __setToothStateForTest(36, { toothSelection: "none" });
    const summary = getOdontogramSummary();
    expect(summary.missingList).not.toBeNull();
    expect(summary.missingList).toContain("36");
    expect(summary.uneruptedList).toBeNull();
  });

  it("tells the two apart in the same mouth", () => {
    // A nine-year-old who lost a milk molar early: 75 gone, the second molars
    // not yet erupted. One line each, and neither swallows the other.
    __applyDentitionPresetForTest("mixed");
    __setToothStateForTest(35, { toothSelection: "none" });
    const summary = getOdontogramSummary();
    expect(summary.missingList).toContain("35");
    expect(summary.uneruptedList).not.toBeNull();
    expect(summary.uneruptedList).not.toContain("35");
  });

  it("AC2: the six-year molars stay individually addable", () => {
    __applyDentitionPresetForTest("primary");
    const chart = getStatusChart();
    for (const slot of [16, 26, 36, 46]) {
      expect(chart.teeth[String(slot)].toothSelection).toBe("not-erupted");
    }
    // Adding one leaves the other three unerupted - the six-year molars do not
    // erupt together.
    chart.teeth["16"] = { toothSelection: "tooth-base" } as never;
    setPlanChart(chart as never);
    const back = getPlanChart().teeth;
    expect(back["16"].toothSelection).toBe("tooth-base");
    for (const slot of [26, 36, 46]) {
      expect(back[String(slot)].toothSelection).toBe("not-erupted");
    }
  });

  it("AC3: the distinction survives the legacy FHIR round trip", () => {
    __applyDentitionPresetForTest("primary");
    const payload = getStatusChart();
    const back = parseFhirBundle(buildFhirBundle(payload as never));
    for (const slot of UNERUPTED_IN_PRIMARY) {
      expect(back.teeth[String(slot)]?.toothSelection, `slot ${slot}`).toBe("not-erupted");
    }
  });

  it("AC3: and the canonical one", () => {
    __applyDentitionPresetForTest("primary");
    const { bundle } = buildDentalDeBundle(getStatusChart() as never);
    const teeth: Record<string, Record<string, unknown>> = {};
    for (const e of bundle.entry ?? []) {
      if (isDentalDeResource(e.resource)) applyDentalDeResource(teeth as never, e.resource);
    }
    for (const slot of UNERUPTED_IN_PRIMARY) {
      expect(teeth[String(slot)]?.toothSelection, `slot ${slot}`).toBe("not-erupted");
    }
  });

  it("is never silently dropped from the canonical export", () => {
    // Emitting nothing would be worse than emitting text: an absent record
    // hydrates to `tooth-base`, so the position would arrive as a permanent
    // tooth. The IG has no eruption concept, so the gap is reported.
    __applyDentitionPresetForTest("primary");
    const { report } = buildDentalDeBundle(getStatusChart() as never);
    const noted = report.textFallback.filter((e) => e.value === "not-erupted");
    expect(noted.length).toBe(UNERUPTED_IN_PRIMARY.length);
  });
});
