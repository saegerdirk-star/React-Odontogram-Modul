// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026

/**
 * Bead odontogram-dma — what holds a removable denture to a natural tooth.
 *
 * Three anchorings, not one axis (Dirk, 2026-08-11, with his own correction
 * the same day): a clasp needs only the tooth to be there, an attachment and a
 * bar need a crown to be built into. And ONE value per tooth, never a set —
 * modelled as a set it would invite combinations that do not occur and then
 * need a rule to forbid them.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  __setToothStateForTest, __resetChartStateForTest, __importStatusForTest,
  getRetention, setRetention, getRetentionOptions, getBarSpans,
  getStatusChart, getToothStateSummary, getOdontogramSummary, setChartMode,
  VALID_RETENTION, VALID_RETENTION_SIDE,
} from "../odontogram";
import {
  retentionOptions, retentionAllowed, detectBarSpans, retentionMark,
  isTelescopeRetention, hasRetention,
} from "../retention";
import { PAYLOAD_VERSION } from "../fhir/types";
import { buildFhirBundle } from "../fhir/toFhir";
import { parseFhirBundle } from "../fhir/fromFhir";
import { buildDentalDeBundle } from "../fhir/toFhirDentalDe";
import { setI18nLanguage, t } from "../i18n/useI18n";

type Any = Record<string, any>;

const NATURAL = { toothSelection: "tooth-base" };
const CROWNED = { toothSelection: "tooth-base", restorationType: "crown", restorationMaterial: "gold" };
const TELESCOPE = { toothSelection: "tooth-base", restorationType: "crown", restorationMaterial: "telescope" };

beforeEach(() => {
  __resetChartStateForTest();
  setChartMode("status");
  setI18nLanguage("en");
});

describe("the three anchorings", () => {
  it("a clasp needs only the tooth to be there — a crown is no bar to it", () => {
    __setToothStateForTest(34, NATURAL);
    setRetention(34, "clasp", "distal");
    expect(getRetention(34)).toEqual({ retention: "clasp", side: "distal" });

    __setToothStateForTest(44, CROWNED);
    setRetention(44, "clasp");
    expect(getRetention(44).retention).toBe("clasp");
  });

  it("an attachment is built into a crown, so it needs one", () => {
    __setToothStateForTest(34, NATURAL);
    setRetention(34, "attachment");
    expect(getRetention(34).retention).toBe("none");

    __setToothStateForTest(34, CROWNED);
    setRetention(34, "attachment");
    expect(getRetention(34).retention).toBe("attachment");
  });

  it("a bar abutment needs a crown too", () => {
    __setToothStateForTest(33, NATURAL);
    setRetention(33, "bar-abutment");
    expect(getRetention(33).retention).toBe("none");

    __setToothStateForTest(33, CROWNED);
    setRetention(33, "bar-abutment");
    expect(getRetention(33).retention).toBe("bar-abutment");
  });

  it("offers exactly what the tooth can carry", () => {
    expect(retentionOptions({ toothSelection: "tooth-base" })).toEqual(["none", "clasp"]);
    expect(retentionOptions({ toothSelection: "tooth-base", restorationType: "crown" }))
      .toEqual(["none", "clasp", "attachment", "bar-abutment"]);
    // a bridge pillar is crowned, whatever else the bridge is doing
    expect(retentionOptions({ toothSelection: "tooth-base", restorationType: "bridge" }))
      .toContain("attachment");
  });

  it("offers nothing on a tooth that is not there", () => {
    expect(retentionOptions({ toothSelection: "none" })).toEqual(["none"]);
    expect(retentionOptions(undefined)).toEqual(["none"]);
  });

  it("leaves an implant to the prosthesis axis it already has", () => {
    // locator / bar / bar-denture are implant values on `prosthesis`; asking
    // the same question twice in two places is how the two answers drift.
    expect(retentionOptions({ toothSelection: "implant" })).toEqual(["none"]);
    __setToothStateForTest(36, { toothSelection: "implant" });
    setRetention(36, "clasp");
    expect(getRetention(36).retention).toBe("none");
  });

  it("the picker and the setter share one predicate", () => {
    const crowned = { toothSelection: "tooth-base", restorationType: "crown" };
    for(const v of ["none", "clasp", "attachment", "bar-abutment"]){
      expect(retentionAllowed(crowned, v)).toBe(retentionOptions(crowned).includes(v as never));
    }
  });
});

describe("one value per tooth, never a set", () => {
  it("choosing one replaces the other", () => {
    __setToothStateForTest(33, CROWNED);
    setRetention(33, "bar-abutment");
    setRetention(33, "clasp", "mesial");
    expect(getRetention(33)).toEqual({ retention: "clasp", side: "mesial" });
  });

  it("clearing the element clears the side with it", () => {
    __setToothStateForTest(34, NATURAL);
    setRetention(34, "clasp", "both");
    setRetention(34, "none");
    expect(getRetention(34)).toEqual({ retention: "none", side: "none" });
  });

  it("rejects a side it does not know rather than storing it", () => {
    __setToothStateForTest(34, NATURAL);
    setRetention(34, "clasp", "buccal");
    expect(getRetention(34).side).toBe("none");
  });

  it("has the four values and the four sides", () => {
    expect([...VALID_RETENTION].sort()).toEqual(["attachment", "bar-abutment", "clasp", "none"]);
    expect([...VALID_RETENTION_SIDE].sort()).toEqual(["both", "distal", "mesial", "none"]);
  });
});

describe("a telescope IS retention, without a second place to store it", () => {
  it("is recognised from the crown material", () => {
    expect(isTelescopeRetention(TELESCOPE)).toBe(true);
    expect(isTelescopeRetention(CROWNED)).toBe(false);
    expect(hasRetention(TELESCOPE)).toBe(true);
  });

  it("is named in the tooltip, so an abutment never reads as holding nothing", () => {
    __setToothStateForTest(34, TELESCOPE);
    expect(getToothStateSummary(34).join(" | ")).toContain(t("retention.telescope"));
  });
});

describe("the bar span is derived, never stored", () => {
  const arches = [[18, 17, 16, 15, 14, 13, 12, 11], [48, 47, 46, 45, 44, 43, 42, 41]];

  it("connects abutments ACROSS the gap they exist to span", () => {
    // The whole point of a bar: 43 and 13 hold it, the space between is
    // edentulous. Requiring adjacency the way a bridge does would find nothing.
    const state: Record<number, Any> = {
      13: { ...CROWNED, retention: "bar-abutment" },
      11: { ...CROWNED, retention: "bar-abutment" },
    };
    expect(detectBarSpans(arches, (tn) => state[tn])).toEqual([[13, 11]]);
  });

  it("needs at least two abutments to be a bar at all", () => {
    const state: Record<number, Any> = { 13: { ...CROWNED, retention: "bar-abutment" } };
    expect(detectBarSpans(arches, (tn) => state[tn])).toEqual([]);
  });

  it("keeps the arches apart", () => {
    const state: Record<number, Any> = {
      13: { ...CROWNED, retention: "bar-abutment" }, 11: { ...CROWNED, retention: "bar-abutment" },
      43: { ...CROWNED, retention: "bar-abutment" }, 41: { ...CROWNED, retention: "bar-abutment" },
    };
    expect(detectBarSpans(arches, (tn) => state[tn])).toEqual([[13, 11], [43, 41]]);
  });

  it("ignores an abutment whose tooth lost the crown that carried it", () => {
    const state: Record<number, Any> = {
      13: { ...CROWNED, retention: "bar-abutment" },
      11: { toothSelection: "tooth-base", retention: "bar-abutment" }, // crown gone
    };
    expect(detectBarSpans(arches, (tn) => state[tn])).toEqual([]);
  });

  it("is reachable from the chart", () => {
    __setToothStateForTest(13, CROWNED);
    __setToothStateForTest(11, CROWNED);
    setRetention(13, "bar-abutment");
    setRetention(11, "bar-abutment");
    expect(getBarSpans()).toEqual([[13, 11]]);
  });
});

describe("the tile marker follows charly's own notation", () => {
  it("puts the chevron on the side the element engages", () => {
    const clasp = { toothSelection: "tooth-base", retention: "clasp" };
    expect(retentionMark(clasp, "mesial")).toBe("<Kl");
    expect(retentionMark(clasp, "distal")).toBe("Kl>");
    expect(retentionMark(clasp, "both")).toBe("<Kl>");
    expect(retentionMark(clasp, "none")).toBe("Kl");
  });

  it("gives the attachment its own bracket shape — round, not angle", () => {
    // The bracket is part of charly's vocabulary, not decoration: `<Kl` vs `( G`.
    expect(retentionMark({ ...CROWNED, retention: "attachment" }, "mesial")).toBe("( G");
    expect(retentionMark({ ...CROWNED, retention: "attachment" }, "distal")).toBe("G )");
    expect(retentionMark({ ...CROWNED, retention: "attachment" }, "both")).toBe("( G )");
  });

  it("writes the bar the way charly does, and without a side bracket", () => {
    // A bar does not engage one side of one tooth; it runs between abutments,
    // and its "side" is the span.
    expect(retentionMark({ ...CROWNED, retention: "bar-abutment" }, "none")).toBe("ste");
    expect(retentionMark({ ...CROWNED, retention: "bar-abutment" }, "both")).toBe("ste");
  });

  it("shows nothing for an element the tooth cannot carry", () => {
    expect(retentionMark({ toothSelection: "tooth-base", retention: "attachment" }, "none")).toBe("");
    expect(retentionMark({ toothSelection: "none", retention: "clasp" }, "none")).toBe("");
  });
});

describe("payload", () => {
  it("is at the version this axis was added in", () => {
    expect(PAYLOAD_VERSION).toBe("2.25");
  });

  it("emits nothing when no tooth holds a denture", () => {
    __setToothStateForTest(34, NATURAL);
    const teeth = getStatusChart().teeth as Any;
    expect("retention" in teeth["34"]).toBe(false);
    expect("retentionSide" in teeth["34"]).toBe(false);
  });

  it("round-trips element and side", () => {
    __setToothStateForTest(34, NATURAL);
    setRetention(34, "clasp", "distal");
    const payload = getStatusChart();
    __resetChartStateForTest();
    __importStatusForTest(payload);
    expect(getRetention(34)).toEqual({ retention: "clasp", side: "distal" });
  });

  it("hydrates tolerantly, and the display gate catches what hydrate let through", () => {
    // Hydration is deliberately permissive, so an attachment can land on an
    // un-crowned tooth. It must then be invisible everywhere the control is.
    __importStatusForTest({
      version: PAYLOAD_VERSION, globals: {}, teeth: {
        "34": { toothSelection: "tooth-base", retention: "attachment", retentionSide: "mesial" },
      },
    } as never);
    expect(getRetention(34).retention).toBe("attachment");     // stored
    expect(getToothStateSummary(34).join(" | ")).not.toContain(t("retention.attachment"));
    expect(retentionMark({ toothSelection: "tooth-base", retention: "attachment" }, "mesial")).toBe("");
  });
});

describe("where a clinician reads it", () => {
  it("reads with the prosthetics, because that is the case it belongs to", () => {
    __setToothStateForTest(34, NATURAL);
    setRetention(34, "clasp", "distal");
    const items = getOdontogramSummary().sections.find((s) => s.key === "prosthetics")?.items ?? [];
    expect(items.join(" | ")).toContain(t("retention.clasp"));
    expect(items.join(" | ")).toContain(t("retentionSide.distal"));
  });

  it("has labels in every UI language", () => {
    for(const lang of ["hu","en","de","es","it","sk","pl","ru","pt-BR","zh","ar","fr"]){
      setI18nLanguage(lang as never);
      for(const k of ["retention.clasp","retention.attachment","retention.barAbutment",
                      "retention.telescope","retentionSide.mesial"]){
        expect(t(k)).not.toBe(k);
      }
    }
  });
});

describe("FHIR", () => {
  it("round-trips through the legacy dialect", () => {
    __setToothStateForTest(34, NATURAL);
    setRetention(34, "clasp", "distal");
    const parsed = parseFhirBundle(buildFhirBundle(getStatusChart() as never));
    expect(parsed.teeth["34"].retention).toBe("clasp");
    expect(parsed.teeth["34"].retentionSide).toBe("distal");
  });

  it("is reported at the canonical dialect's boundary rather than invented", () => {
    __setToothStateForTest(34, NATURAL);
    setRetention(34, "clasp", "distal");
    const { report } = buildDentalDeBundle(getStatusChart() as never, {});
    expect(report.unmapped.some((e) => e.field === "retention" && e.tooth === "34")).toBe(true);
  });
});

describe("one bar can rest on implants and natural teeth at once", () => {
  // Dirk, 2026-08-11: implant and natural abutments occur mixed in one case.
  const arches = [[13, 12, 11, 21, 22, 23], [43, 42, 41, 31, 32, 33]];
  const IMPLANT_BAR = { toothSelection: "implant", prosthesis: "bar" };

  it("counts an implant that records its bar on the prosthesis axis", async () => {
    const { isBarAbutment } = await import("../retention");
    expect(isBarAbutment(IMPLANT_BAR)).toBe(true);
    expect(isBarAbutment({ toothSelection: "implant", prosthesis: "bar-denture" })).toBe(true);
    expect(isBarAbutment({ toothSelection: "implant", prosthesis: "locator" })).toBe(false);
  });

  it("draws ONE bar across a mixed span, not two halves", async () => {
    const { detectBarSpans } = await import("../retention");
    const state: Any = {
      13: IMPLANT_BAR,
      11: { ...CROWNED, retention: "bar-abutment" },
    };
    expect(detectBarSpans(arches, (tn) => state[tn])).toEqual([[13, 11]]);
  });

  it("still lets each tooth kind answer where it always answered", async () => {
    const { retentionOptions: opts } = await import("../retention");
    // the implant's own axis is untouched — no second place to store a bar
    expect(opts(IMPLANT_BAR)).toEqual(["none"]);
  });
});

describe("the drawn clasp", () => {
  const rect = { x: 100, y: 0, width: 50, height: 200 };
  const rectFor = () => rect;

  it("draws one hook per engaged side", async () => {
    const { computeClaspGlyphs } = await import("../retention");
    const state: Any = { 34: { toothSelection: "tooth-base", retention: "clasp" } };
    const one = computeClaspGlyphs([34], (tn) => state[tn], rectFor, () => "distal");
    const two = computeClaspGlyphs([34], (tn) => state[tn], rectFor, () => "both");
    expect(one).toHaveLength(1);
    expect(two).toHaveLength(2);
  });

  it("puts mesial toward the arch midline on both sides of the arch", async () => {
    const { mesialIsLeft } = await import("../retention");
    expect(mesialIsLeft(23)).toBe(true);   // quadrant 2
    expect(mesialIsLeft(33)).toBe(true);   // quadrant 3
    expect(mesialIsLeft(13)).toBe(false);  // quadrant 1
    expect(mesialIsLeft(43)).toBe(false);  // quadrant 4
  });

  it("draws nothing for an attachment or a bar — only the clasp is a hook", async () => {
    const { computeClaspGlyphs } = await import("../retention");
    const state: Any = { 34: { ...CROWNED, retention: "attachment" } };
    expect(computeClaspGlyphs([34], (tn) => state[tn], rectFor, () => "both")).toEqual([]);
  });

  it("skips a tile that is missing or collapsed rather than throwing", async () => {
    const { computeClaspGlyphs } = await import("../retention");
    const state: Any = { 34: { toothSelection: "tooth-base", retention: "clasp" } };
    expect(computeClaspGlyphs([34], (tn) => state[tn], () => null, () => "both")).toEqual([]);
    expect(computeClaspGlyphs([34], (tn) => state[tn],
      () => ({ x: 0, y: 0, width: 0, height: 0 }), () => "both")).toEqual([]);
  });
});
