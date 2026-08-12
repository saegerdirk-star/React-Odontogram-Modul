// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026

/**
 * Bead odontogram-wxt — cervical involvement of a filling or a caries lesion.
 *
 * The whole point of the axis is what it must NOT do. BEMA counts the four or
 * five regular surfaces to pick a position tier and records the cervix as a
 * suffix on one of them ("vz"/"47", "lz"/"57"); a sixth surface would report
 * "multi-surface" where the truth is "single-surface with a cervical marker".
 * So the surface-count assertion below is not a nice-to-have — it is the
 * feature.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  __setToothStateForTest, __getToothStateForTest, __resetChartStateForTest,
  __importStatusForTest, __collectExportPayloadForTest,
  __cervicalInvolvementAppliesForTest, __syncCervicalIndicatorForTest,
  getCervicalSurfaces, setCervicalInvolvement, getFillingSurfaceCount,
  applyCervicalInvolvement, VALID_CERVICAL_SURFACES,
  getToothStateSummary, getOdontogramSummary, getStatusChart,
} from "../odontogram";
import { buildFhirBundle } from "../fhir/toFhir";
import { parseFhirBundle } from "../fhir/fromFhir";
import { buildDentalDeBundle } from "../fhir/toFhirDentalDe";
import { PAYLOAD_VERSION } from "../fhir/types";
import { setI18nLanguage, t } from "../i18n/useI18n";

type Any = Record<string, any>;

const FILLED_BUCCAL = { toothSelection: "tooth-base", fillingSurfaceMaterials: { buccal: "composite" } };

beforeEach(() => {
  __resetChartStateForTest();
  setI18nLanguage("en");
});

describe("the cervix is a marker on a surface, never a surface", () => {
  it("is offered only on the two surfaces it borders", () => {
    expect(Array.from(VALID_CERVICAL_SURFACES).sort()).toEqual(["buccal", "lingual"]);
  });

  it("leaves the surface count a fee mapping reads untouched", () => {
    __setToothStateForTest(16, FILLED_BUCCAL);
    expect(getFillingSurfaceCount(16)).toBe(1);
    setCervicalInvolvement(16, "buccal", true);
    expect(getCervicalSurfaces(16)).toEqual(["buccal"]);
    // The whole bead in one line: a vestibular filling that reaches the neck
    // is still a SINGLE-surface filling.
    expect(getFillingSurfaceCount(16)).toBe(1);
  });

  it("does not appear among the filled surfaces either", () => {
    __setToothStateForTest(16, FILLED_BUCCAL);
    setCervicalInvolvement(16, "buccal", true);
    const s = __getToothStateForTest(16)! as Any;
    expect(Object.keys(s.fillingSurfaceMaterials)).toEqual(["buccal"]);
  });
});

describe("the setter's gates", () => {
  it("stores the marker on a filled vestibular surface", () => {
    __setToothStateForTest(16, FILLED_BUCCAL);
    setCervicalInvolvement(16, "buccal", true);
    expect(getCervicalSurfaces(16)).toEqual(["buccal"]);
  });

  it("stores it on a caried surface that carries no filling", () => {
    __setToothStateForTest(24, { toothSelection: "tooth-base", caries: ["caries-lingual"] });
    setCervicalInvolvement(24, "lingual", true);
    expect(getCervicalSurfaces(24)).toEqual(["lingual"]);
  });

  it("is a silent no-op on a surface the cervix does not border", () => {
    __setToothStateForTest(16, { toothSelection: "tooth-base", fillingSurfaceMaterials: { occlusal: "amalgam" } });
    setCervicalInvolvement(16, "occlusal", true);
    expect(getCervicalSurfaces(16)).toEqual([]);
  });

  it("is a silent no-op on a bare surface — there is nothing to qualify", () => {
    __setToothStateForTest(16, { toothSelection: "tooth-base" });
    setCervicalInvolvement(16, "buccal", true);
    expect(getCervicalSurfaces(16)).toEqual([]);
  });

  it("clears back off again", () => {
    __setToothStateForTest(16, FILLED_BUCCAL);
    setCervicalInvolvement(16, "buccal", true);
    setCervicalInvolvement(16, "buccal", false);
    expect(getCervicalSurfaces(16)).toEqual([]);
  });

  it("reports both surfaces in the canonical order", () => {
    __setToothStateForTest(16, {
      toothSelection: "tooth-base",
      fillingSurfaceMaterials: { buccal: "composite", lingual: "composite" },
    });
    setCervicalInvolvement(16, "lingual", true);
    setCervicalInvolvement(16, "buccal", true);
    expect(getCervicalSurfaces(16)).toEqual(["buccal", "lingual"]);
  });
});

describe("a marker whose finding is gone goes dormant, not stale", () => {
  it("is not reported once the surface loses its filling and its caries", () => {
    __setToothStateForTest(16, {
      toothSelection: "tooth-base",
      fillingSurfaceMaterials: { buccal: "composite" },
      cervicalSurfaces: ["buccal"],
    });
    expect(getCervicalSurfaces(16)).toEqual(["buccal"]);
    __setToothStateForTest(16, { toothSelection: "tooth-base", cervicalSurfaces: ["buccal"] });
    expect(getCervicalSurfaces(16)).toEqual([]);
    // ...but it is still STORED, so restoring the filling restores the finding
    // rather than silently discarding what was charted.
    expect((__getToothStateForTest(16) as Any).cervicalSurfaces).toEqual(["buccal"]);
  });

  it("applies only where the surface actually carries something", () => {
    const bare = { fillingSurfaceMaterials: new Map(), caries: new Set() };
    const filled = { fillingSurfaceMaterials: new Map([["buccal", "composite"]]), caries: new Set() };
    const caried = { fillingSurfaceMaterials: new Map(), caries: new Set(["caries-lingual"]) };
    expect(__cervicalInvolvementAppliesForTest(bare, "buccal")).toBe(false);
    expect(__cervicalInvolvementAppliesForTest(filled, "buccal")).toBe(true);
    expect(__cervicalInvolvementAppliesForTest(caried, "lingual")).toBe(true);
    expect(__cervicalInvolvementAppliesForTest(filled, "occlusal")).toBe(false);
  });
});

describe("the write helper the popup uses", () => {
  it("sets and clears on an already-gated state object", () => {
    const s: Any = { cervicalSurfaces: new Set() };
    applyCervicalInvolvement(s, "buccal", true);
    expect(s.cervicalSurfaces.has("buccal")).toBe(true);
    applyCervicalInvolvement(s, "buccal", false);
    expect(s.cervicalSurfaces.has("buccal")).toBe(false);
  });

  it("ignores a surface the cervix does not border", () => {
    const s: Any = { cervicalSurfaces: new Set() };
    applyCervicalInvolvement(s, "mesial", true);
    expect(s.cervicalSurfaces.size).toBe(0);
  });
});

describe("payload", () => {
  it("is at the version this axis was added in", () => {
    expect(PAYLOAD_VERSION).toBe("2.25");
  });

  it("emits nothing at all when no surface carries the marker", () => {
    __setToothStateForTest(16, FILLED_BUCCAL);
    const teeth = __collectExportPayloadForTest().teeth as Any;
    expect("cervicalSurfaces" in teeth[16]).toBe(false);
  });

  it("round-trips through export and import", () => {
    __setToothStateForTest(16, FILLED_BUCCAL);
    setCervicalInvolvement(16, "buccal", true);
    const payload = getStatusChart();
    expect((payload.teeth as Any)["16"].cervicalSurfaces).toEqual(["buccal"]);
    __resetChartStateForTest();
    expect(getCervicalSurfaces(16)).toEqual([]);
    __importStatusForTest(payload);
    expect(getCervicalSurfaces(16)).toEqual(["buccal"]);
  });

  it("drops a hand-edited surface no control could ever author", () => {
    __importStatusForTest({
      version: PAYLOAD_VERSION, globals: {}, teeth: {
        "16": {
          toothSelection: "tooth-base",
          fillingSurfaceMaterials: { occlusal: "amalgam", buccal: "composite" },
          cervicalSurfaces: ["occlusal", "buccal", "bogus"],
        },
      },
    } as Any);
    expect((__getToothStateForTest(16) as Any).cervicalSurfaces).toEqual(["buccal"]);
  });

  it("survives a legacy payload that never knew the field", () => {
    __importStatusForTest({
      version: "2.23", globals: {}, teeth: { "16": { toothSelection: "tooth-base" } },
    } as Any);
    expect(getCervicalSurfaces(16)).toEqual([]);
  });
});

describe("where a clinician reads the chart", () => {
  const section = (key: string) =>
    (getOdontogramSummary().sections.find((s) => s.key === key)?.items ?? []).join(" | ");

  it("names the finding in the tooth tooltip", () => {
    __setToothStateForTest(16, FILLED_BUCCAL);
    setCervicalInvolvement(16, "buccal", true);
    expect(getToothStateSummary(16).join(" | ")).toContain(t("cervical.label"));
  });

  it("keeps it out of the tooltip once the finding it qualifies is gone", () => {
    __setToothStateForTest(16, { toothSelection: "tooth-base", cervicalSurfaces: ["buccal"] });
    expect(getToothStateSummary(16).join(" | ")).not.toContain(t("cervical.label"));
  });

  it("qualifies the filling on the whole-mouth summary", () => {
    __setToothStateForTest(16, FILLED_BUCCAL);
    setCervicalInvolvement(16, "buccal", true);
    expect(section("fillings")).toContain(t("cervical.label"));
  });

  it("qualifies a caries lesion on the whole-mouth summary instead", () => {
    __setToothStateForTest(24, { toothSelection: "tooth-base", caries: ["caries-lingual"] });
    setCervicalInvolvement(24, "lingual", true);
    expect(section("caries")).toContain(t("cervical.label"));
    // and never twice for one surface
    expect(section("fillings")).not.toContain(t("cervical.label"));
  });

  it("has a label in every UI language", () => {
    for(const lang of ["hu","en","de","es","it","sk","pl","ru","pt-BR","zh","ar","fr"]){
      setI18nLanguage(lang as never);
      // an untranslated key falls through as the key itself
      expect(t("cervical.label")).not.toBe("cervical.label");
      expect(t("cervical.hint")).not.toBe("cervical.hint");
      expect(t("cervical.yes")).not.toBe("cervical.yes");
      expect(t("cervical.no")).not.toBe("cervical.no");
    }
  });
});

describe("the surface-cell badge", () => {
  function cell(value: string): HTMLElement {
    const label = document.createElement("label");
    label.className = "surface-cell";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = value;
    label.appendChild(input);
    return label;
  }

  it("marks a filling cell whose surface reaches the neck", () => {
    const c = cell("buccal");
    __syncCervicalIndicatorForTest(c, {
      cervicalSurfaces: new Set(["buccal"]),
      fillingSurfaceMaterials: new Map([["buccal", "composite"]]),
      caries: new Set(),
    });
    expect(c.getAttribute("data-cervical")).toBe("z");
  });

  it("marks a caries cell too, whose checkbox value is prefixed", () => {
    const c = cell("caries-lingual");
    __syncCervicalIndicatorForTest(c, {
      cervicalSurfaces: new Set(["lingual"]),
      fillingSurfaceMaterials: new Map(),
      caries: new Set(["caries-lingual"]),
    });
    expect(c.getAttribute("data-cervical")).toBe("z");
  });

  it("carries no badge where the marker does not apply", () => {
    const c = cell("buccal");
    __syncCervicalIndicatorForTest(c, {
      cervicalSurfaces: new Set(["buccal"]),
      fillingSurfaceMaterials: new Map(),
      caries: new Set(),
    });
    expect(c.hasAttribute("data-cervical")).toBe(false);
  });
});

describe("FHIR", () => {
  it("round-trips through the legacy dialect as a per-surface boolean", () => {
    __setToothStateForTest(16, FILLED_BUCCAL);
    setCervicalInvolvement(16, "buccal", true);
    const bundle = buildFhirBundle(__collectExportPayloadForTest());
    const parsed = parseFhirBundle(bundle);
    expect(parsed.teeth["16"].cervicalSurfaces).toEqual(["buccal"]);
  });

  it("emits it as one Observation, not as an extra surface code", () => {
    __setToothStateForTest(16, FILLED_BUCCAL);
    setCervicalInvolvement(16, "buccal", true);
    const bundle = buildFhirBundle(__collectExportPayloadForTest()) as Any;
    const obs = (bundle.entry ?? [])
      .map((e: Any) => e.resource)
      .filter((r: Any) => r?.resourceType === "Observation")
      .filter((r: Any) => (r.code?.coding ?? []).some((c: Any) => c.code === "cervical-involvement"));
    expect(obs).toHaveLength(1);
    expect(obs[0].component).toHaveLength(1);
    expect(obs[0].component[0].valueBoolean).toBe(true);
  });

  it("is reported at the canonical dialect's boundary rather than invented", () => {
    __setToothStateForTest(16, FILLED_BUCCAL);
    setCervicalInvolvement(16, "buccal", true);
    const { report } = buildDentalDeBundle(__collectExportPayloadForTest() as never, {});
    const entry = report.unmapped.find((e) => e.field === "cervicalSurfaces");
    expect(entry).toBeDefined();
    expect(entry!.tooth).toBe("16");
    expect(entry!.value).toBe("buccal");
  });

  it("says nothing about the boundary when nothing is charted", () => {
    __setToothStateForTest(16, FILLED_BUCCAL);
    const { report } = buildDentalDeBundle(__collectExportPayloadForTest() as never, {});
    expect(report.unmapped.some((e) => e.field === "cervicalSurfaces")).toBe(false);
  });
});
