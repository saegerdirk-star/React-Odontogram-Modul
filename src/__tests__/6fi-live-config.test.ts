// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Bead odontogram-6fi, seam 1: the live-mode configuration is resolved from the
// environment and the URL, and a missing piece is REPORTED rather than guessed.
// A live mode that boots against half a configuration writes patient data to a
// server nobody named.

import { describe, it, expect } from "vitest";
import { resolveLiveConfig, resolvePatientId } from "../live/config";

const fullEnv = {
  VITE_AIDBOX_BASE_URL: "http://localhost:8081",
  VITE_AIDBOX_CLIENT_ID: "odontogram-live",
  VITE_AIDBOX_CLIENT_SECRET: "s3cret",
  VITE_DEFAULT_PATIENT_ID: "from-env",
};

describe("odontogram-6fi: live-mode patient selection", () => {
  it("lets the ?patient= URL parameter win over the environment default", () => {
    expect(resolvePatientId(fullEnv, "?patient=from-url")).toBe("from-url");
  });

  it("falls back to the environment default when the URL names no patient", () => {
    expect(resolvePatientId(fullEnv, "")).toBe("from-env");
    expect(resolvePatientId(fullEnv, "?other=1")).toBe("from-env");
  });

  it("treats a blank ?patient= as absent instead of as an empty id", () => {
    expect(resolvePatientId(fullEnv, "?patient=%20%20")).toBe("from-env");
    expect(resolvePatientId({}, "?patient=")).toBeUndefined();
  });

  it("trims surrounding whitespace off both sources", () => {
    expect(resolvePatientId({}, "?patient=%20p-1%20")).toBe("p-1");
    expect(resolvePatientId({ VITE_DEFAULT_PATIENT_ID: " p-2 " }, "")).toBe("p-2");
  });
});

describe("odontogram-6fi: live-mode configuration", () => {
  it("resolves a complete environment plus patient into a usable configuration", () => {
    const result = resolveLiveConfig(fullEnv, "?patient=p-9");
    expect(result.ok).toBe(true);
    expect(result.config).toEqual({
      baseUrl: "http://localhost:8081",
      clientId: "odontogram-live",
      clientSecret: "s3cret",
      patientId: "p-9",
    });
  });

  it("strips a trailing slash off the base URL so paths never double up", () => {
    const result = resolveLiveConfig({ ...fullEnv, VITE_AIDBOX_BASE_URL: "http://localhost:8081/" }, "");
    expect(result.ok && result.config.baseUrl).toBe("http://localhost:8081");
  });

  it("names every missing key instead of crashing", () => {
    const result = resolveLiveConfig({ VITE_AIDBOX_BASE_URL: "http://localhost:8081" }, "");
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual([
      "VITE_AIDBOX_CLIENT_ID",
      "VITE_AIDBOX_CLIENT_SECRET",
      "VITE_DEFAULT_PATIENT_ID (or ?patient=<id>)",
    ]);
  });

  it("reports a missing patient alone when the server credentials are complete", () => {
    const withoutPatient = { ...fullEnv, VITE_DEFAULT_PATIENT_ID: undefined };
    const result = resolveLiveConfig(withoutPatient, "");
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(["VITE_DEFAULT_PATIENT_ID (or ?patient=<id>)"]);
  });

  it("treats a whitespace-only credential as missing, not as a credential", () => {
    const result = resolveLiveConfig({ ...fullEnv, VITE_AIDBOX_CLIENT_SECRET: "   " }, "");
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(["VITE_AIDBOX_CLIENT_SECRET"]);
  });
});
