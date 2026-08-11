/**
 * odontogram-im1 slice 4 — the implant reaches FHIR.
 *
 * Every element used here is defined by `DentalImplantDE`; the two property
 * codes are copied from the published `DentalImplantPropertyCS`. Nothing is
 * invented, which is this dialect's standing rule.
 */
import { describe, it, expect } from "vitest";
import { buildDentalDeBundle } from "../fhir/toFhirDentalDe";
import {
  DENTAL_DE_IMPLANT_DEVICE_PROFILE, DENTAL_DE_IMPLANT_PROPERTY_SYSTEM,
  IMPLANT_PROPERTY, IMPLANT_PLACEHOLDER_IDENTIFIER_SYSTEM,
} from "../fhir/dentalDeCodesystems";
import { PAYLOAD_VERSION } from "../fhir/types";

type Any = Record<string, any>;

function bundleFor(teeth: Any) {
  return buildDentalDeBundle(
    { version: PAYLOAD_VERSION, globals: {}, teeth } as never,
    { effectiveDateTime: "2026-08-11" } as Any,
  ).bundle as Any;
}
const devices = (b: Any) =>
  (b.entry ?? []).map((e: Any) => e.resource).filter((r: Any) => r?.resourceType === "Device");

const PRODUCT = {
  manufacturer: "Straumann", system: "BLX", diameterMm: 4.1, lengthMm: 10,
  udi: "(01)07612345678901(17)300630(10)LOT4711",
  deviceIdentifier: "07612345678901", lot: "LOT4711", expiry: "2030-06-30",
};

describe("a Device is emitted for every charted implant", () => {
  it("even when nothing at all is known about it", () => {
    const d = devices(bundleFor({ "36": { toothSelection: "implant" } }));
    expect(d).toHaveLength(1);
    expect(d[0].meta.profile).toEqual([DENTAL_DE_IMPLANT_DEVICE_PROFILE]);
    expect(d[0].identifier).toEqual([
      { system: IMPLANT_PLACEHOLDER_IDENTIFIER_SYSTEM, value: "36" },
    ]);
    // An implant that arrived with the patient is a COMPLETE record.
    expect(d[0].manufacturer).toBeUndefined();
    expect(d[0].lotNumber).toBeUndefined();
    expect(d[0].property).toBeUndefined();
  });

  it("and not for a natural tooth", () => {
    expect(devices(bundleFor({ "36": { toothSelection: "tooth-base" } }))).toHaveLength(0);
  });

  it("exactly once, even when peri-implant findings are also charted", () => {
    const b = bundleFor({
      "36": { toothSelection: "implant", implantProduct: PRODUCT, mpi: { buccal: 2 } },
    });
    expect(devices(b)).toHaveLength(1);
  });
});

describe("the product fills the elements the profile defines", () => {
  const d = devices(bundleFor({ "36": { toothSelection: "implant", implantProduct: PRODUCT } }))[0];

  it("carries manufacturer, model and name", () => {
    expect(d.manufacturer).toBe("Straumann");
    expect(d.modelNumber).toBe("BLX");
    expect(d.deviceName).toEqual([{ name: "BLX", type: "model-name" }]);
  });

  it("carries lot and expiry, which came out of the carrier", () => {
    expect(d.lotNumber).toBe("LOT4711");
    expect(d.expirationDate).toBe("2030-06-30");
  });

  it("carries the UDI in the element FHIR defines for it", () => {
    expect(d.udiCarrier).toEqual([
      { carrierHRF: PRODUCT.udi, deviceIdentifier: "07612345678901" },
    ]);
  });

  it("does NOT repeat the GTIN as a second identifier", () => {
    // It would need a system URI the IG does not define, and inventing one is
    // exactly what this dialect's sourcing rule forbids.
    expect(d.identifier).toHaveLength(1);
  });

  it("carries the dimensions as the two mustSupport property slices", () => {
    expect(d.property).toEqual([
      {
        type: { coding: [{ system: DENTAL_DE_IMPLANT_PROPERTY_SYSTEM, code: IMPLANT_PROPERTY.diameter }] },
        valueQuantity: [{ value: 4.1, unit: "mm", system: "http://unitsofmeasure.org", code: "mm" }],
      },
      {
        type: { coding: [{ system: DENTAL_DE_IMPLANT_PROPERTY_SYSTEM, code: IMPLANT_PROPERTY.length }] },
        valueQuantity: [{ value: 10, unit: "mm", system: "http://unitsofmeasure.org", code: "mm" }],
      },
    ]);
  });
});

describe("the peri-implant observation focuses on that Device", () => {
  it("points at the one the bundle carries, and does not mint a second", () => {
    const b = bundleFor({
      "36": { toothSelection: "implant", implantProduct: PRODUCT, mbi: { buccal: 1 } },
    });
    const obs = (b.entry ?? []).map((e: Any) => e.resource)
      .find((r: Any) => r?.resourceType === "Observation" && r.focus);
    const dev = b.entry.find((e: Any) => e.resource?.resourceType === "Device");
    expect(obs.focus).toEqual([{ reference: dev.fullUrl }]);
  });
});

describe("the round trip does not lose the implant", () => {
  it("reads the Device back onto its tooth", async () => {
    const { isDentalDeResource, applyDentalDeResource } = await import("../fhir/fromFhirDentalDe");
    const b = bundleFor({ "36": { toothSelection: "implant", implantProduct: PRODUCT } });
    const teeth: Any = {};
    for (const e of b.entry) {
      if (isDentalDeResource(e.resource)) applyDentalDeResource(teeth, e.resource);
    }
    expect(teeth["36"].toothSelection).toBe("implant");
    expect(teeth["36"].implantProduct).toEqual({
      manufacturer: "Straumann", system: "BLX", diameterMm: 4.1, lengthMm: 10,
      udi: PRODUCT.udi, deviceIdentifier: "07612345678901",
    });
  });

  it("reads an implant that carries nothing but its position", async () => {
    const { isDentalDeResource, applyDentalDeResource } = await import("../fhir/fromFhirDentalDe");
    const b = bundleFor({ "36": { toothSelection: "implant" } });
    const teeth: Any = {};
    for (const e of b.entry) {
      if (isDentalDeResource(e.resource)) applyDentalDeResource(teeth, e.resource);
    }
    expect(teeth["36"].toothSelection).toBe("implant");
    expect(teeth["36"].implantProduct).toBeUndefined();
  });
});
