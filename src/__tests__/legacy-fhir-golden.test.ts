import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildFhirBundle, parseFhirBundle } from "../fhir";
import type { OdontogramExportPayload } from "../fhir/types";

const testFileUrl = import.meta.url;
const golden = JSON.parse(
  readFileSync(fileURLToPath(new URL("./fixtures/legacy-fhir-golden.json", testFileUrl)), "utf8"),
) as {
  bundles: Array<{ name: string; bundle: unknown }>;
  parsed: Array<{ name: string; parsed: unknown }>;
};

const payloads: Record<string, OdontogramExportPayload> = {
  empty: { version: "1.4", teeth: {} },
  edentulous: { version: "1.4", globals: { edentulous: true }, teeth: {} },
  branches: {
    version: "1.4",
    teeth: {
      "11": { toothSelection: "tooth-base", caries: ["caries-occlusal"], cariesSeverity: { occlusal: 4 } },
      "12": {
        toothSelection: "tooth-base",
        fillingMaterial: "composite",
        fillingSurfaces: ["mesial", "occlusal"],
        fillingSurfaceMaterials: { mesial: "composite", occlusal: "amalgam" },
      },
      "13": { toothSelection: "tooth-base", calculus: true, extractionPlan: true },
      "14": { toothSelection: "none", missingClosed: true },
      "15": {
        toothSelection: "tooth-base",
        toothSubstrate: "crownprep",
        restorationType: "crown",
        restorationMaterial: "metal-ceramic",
      },
    },
  },
};

describe("upstream-bounded Legacy FHIR goldens", () => {
  it("preserves the selected upstream 250e439 export and parse fixtures", () => {
    for (const expected of golden.bundles) {
      const payload = payloads[expected.name];
      expect(payload, expected.name).toBeDefined();
      expect(buildFhirBundle(payload), expected.name).toEqual(expected.bundle);
    }

    for (const expected of golden.parsed) {
      const payload = payloads[expected.name];
      expect(payload, expected.name).toBeDefined();
      expect(parseFhirBundle(buildFhirBundle(payload), { dialect: "legacy" }), expected.name).toEqual(expected.parsed);
    }
  });
});
