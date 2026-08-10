import { describe, it, expect } from "vitest";
import { primaryFdiForSlot, slotForPrimaryFdi } from "../utils/numbering";
import { buildDentalDeBundle } from "../fhir/toFhirDentalDe";
import { applyDentalDeResource, isDentalDeResource } from "../fhir/fromFhirDentalDe";
import {
  DENTAL_DE_ODONTOGRAM_PROFILE, DENTAL_DE_FDI_SYSTEM, DENTAL_DE_COMPONENT_SYSTEM,
  SNOMED_SYSTEM, ODONTO_COMPONENT, VERIFIED_SCT,
} from "../fhir/dentalDeCodesystems";

/**
 * odontogram-e0a: a deciduous tooth is charted in its successor's slot, so the
 * payload key is a permanent number. FDI has its own numbers for the deciduous
 * dentition and a reader outside this engine cannot recover them from the key,
 * so the translation has to happen at the export boundary.
 */

const payload = (teeth: Record<string, unknown>) => ({
  version: "2.21",
  globals: {},
  teeth,
} as never);

/** Read a whole bundle back the way the importer does: resource by resource,
 *  into one shared teeth map. */
const readBack = (bundle: { entry?: Array<{ resource?: unknown }> }) => {
  const teeth: Record<string, Record<string, unknown>> = {};
  for (const e of bundle.entry ?? []) {
    if (isDentalDeResource(e.resource)) applyDentalDeResource(teeth as never, e.resource);
  }
  return teeth;
};

const fdiCodes = (bundle: { entry?: Array<{ resource?: unknown }> }): string[] => {
  const out: string[] = [];
  for (const e of bundle.entry ?? []) {
    const site = (e.resource as { bodySite?: { coding?: Array<{ code?: string }> } })?.bodySite;
    for (const c of site?.coding ?? []) if (c.code) out.push(c.code);
  }
  return out;
};

describe("primary FDI identity", () => {
  describe("the pure conversion", () => {
    it("moves the quadrant and keeps the position", () => {
      expect(primaryFdiForSlot(11)).toBe(51);
      expect(primaryFdiForSlot(25)).toBe(65);
      expect(primaryFdiForSlot(31)).toBe(71);
      expect(primaryFdiForSlot(45)).toBe(85);
    });

    it("refuses a position with no deciduous predecessor", () => {
      // A first permanent molar erupts behind the primary dentition and
      // replaces nothing, so there is no number to translate to.
      for (const slot of [16, 17, 18, 26, 36, 46, 48]) {
        expect(primaryFdiForSlot(slot)).toBeNull();
      }
    });

    it("inverts exactly", () => {
      for (const slot of [11, 12, 13, 14, 15, 21, 25, 31, 35, 41, 45]) {
        expect(slotForPrimaryFdi(primaryFdiForSlot(slot)!)).toBe(slot);
      }
      expect(slotForPrimaryFdi(11)).toBeNull();
      expect(slotForPrimaryFdi(99)).toBeNull();
    });
  });

  describe("the canonical dental-de boundary", () => {
    it("exports a milk tooth under its own FDI number", () => {
      const { bundle } = buildDentalDeBundle(
        payload({ "11": { toothSelection: "milktooth" } }),
      );
      const codes = fdiCodes(bundle);
      expect(codes).toContain("51");
      expect(codes).not.toContain("11");
    });

    it("leaves a permanent tooth's number alone", () => {
      const { bundle } = buildDentalDeBundle(
        payload({ "11": { toothSelection: "tooth-base" } }),
      );
      expect(fdiCodes(bundle)).toContain("11");
      expect(fdiCodes(bundle)).not.toContain("51");
    });

    it("never invents a deciduous number for a molar slot", () => {
      // Nothing should chart a milk tooth at position 6, but a tolerant reader
      // may hand us one, and 56 is not an FDI number.
      const { bundle } = buildDentalDeBundle(
        payload({ "16": { toothSelection: "milktooth" } }),
      );
      const codes = fdiCodes(bundle);
      expect(codes).toContain("16");
      expect(codes.some((c) => c.startsWith("5"))).toBe(false);
    });

    it("reads a deciduous number back into the successor's slot", () => {
      const { bundle } = buildDentalDeBundle(
        payload({ "11": { toothSelection: "milktooth" }, "46": { toothSelection: "tooth-base" } }),
      );
      const back = { teeth: readBack(bundle) };
      expect(Object.keys(back.teeth)).toContain("11");
      expect(Object.keys(back.teeth)).not.toContain("51");
      expect(back.teeth["11"].toothSelection).toBe("milktooth");
      expect(back.teeth["46"].toothSelection).toBe("tooth-base");
    });

    it("keeps every axis of one tooth on one record across the round trip", () => {
      // The translation happens at the key, before anything is written, so a
      // bundle carrying several axes for 51 cannot split between 51 and 11.
      const { bundle } = buildDentalDeBundle(
        payload({
          "14": {
            toothSelection: "milktooth",
            caries: ["caries-occlusal"],
            restorationType: "crown",
          },
        }),
      );
      expect(fdiCodes(bundle).every((c) => c === "54")).toBe(true);

      const rec = readBack(bundle)["14"] as Record<string, never>;
      expect(rec.toothSelection).toBe("milktooth");
      expect(rec.caries).toContain("caries-occlusal");
      expect(rec.restorationType).toBe("crown");
    });
  });
});

describe("the FDI number decides the dentition", () => {
  // Dirk, 2026-08-10: "Mit der FDI Klassifikation legen wir fest, ob das ein
  // Milchzahn oder ein bleibender ist." The notation carries the
  // classification, so a present tooth at 51-85 is deciduous whatever a
  // bundle's own presence text says.
  const odontogramResource = (fdi: string, sct: string, text: string) => ({
    resourceType: "Observation",
    meta: { profile: [DENTAL_DE_ODONTOGRAM_PROFILE] },
    bodySite: { coding: [{ system: DENTAL_DE_FDI_SYSTEM, code: fdi }] },
    component: [{
      code: { coding: [{ system: DENTAL_DE_COMPONENT_SYSTEM, code: ODONTO_COMPONENT.toothPresence }] },
      valueCodeableConcept: { coding: [{ system: SNOMED_SYSTEM, code: sct }], text },
    }],
  });

  it("reads a foreign 51 as a milk tooth even without the deciduous text", () => {
    const teeth: Record<string, Record<string, unknown>> = {};
    applyDentalDeResource(teeth as never, odontogramResource("51", VERIFIED_SCT.toothPresent, "Tooth present") as never);
    expect(teeth["11"].toothSelection).toBe("milktooth");
  });

  it("still reads a permanent number as permanent", () => {
    const teeth: Record<string, Record<string, unknown>> = {};
    applyDentalDeResource(teeth as never, odontogramResource("11", VERIFIED_SCT.toothPresent, "Tooth present") as never);
    expect(teeth["11"].toothSelection).toBe("tooth-base");
  });

  it("does not overrule a position that is absent rather than present", () => {
    // "Absent at 51" describes the position; it does not contradict the
    // numbering, so it must not be turned into a present milk tooth.
    const teeth: Record<string, Record<string, unknown>> = {};
    applyDentalDeResource(
      teeth as never,
      odontogramResource("51", VERIFIED_SCT.toothAbsent, "Tooth absent") as never,
    );
    expect(teeth["11"].toothSelection).not.toBe("milktooth");
  });
});
