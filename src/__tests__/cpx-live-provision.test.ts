// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Bead odontogram-cpx, seam 2: the provisioner writes only the scoped browser
// client into the ignored local .env. Operator credentials stay outside Vite.

import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PAYLOAD_VERSION } from "../document";
import type { OdontogramDocument } from "../document";
import { buildWritePlan } from "../live/writePlan";
import {
  SCOPED_CLIENT_ID,
  SCOPED_POLICY_ID,
  chooseLoadableDentalPatient,
  composeScopedEnv,
  desiredAccessPolicy,
  desiredClient,
  readExistingScopedSecret,
  rejectAdminEquivalentClient,
  resolveHomeCheckout,
  resolveOperatorCredentials,
  writeScopedEnv,
} from "../../tools/live-provision";

const SCOPED_KEYS = [
  "VITE_AIDBOX_BASE_URL",
  "VITE_AIDBOX_CLIENT_ID",
  "VITE_AIDBOX_CLIENT_SECRET",
  "VITE_DEFAULT_PATIENT_ID",
] as const;

describe("odontogram-cpx AC2: scoped live-mode provision", () => {
  it("composes an .env that names only the scoped browser credentials", () => {
    const text = composeScopedEnv({
      baseUrl: "http://localhost:58601",
      clientId: SCOPED_CLIENT_ID,
      clientSecret: "scoped-secret",
      patientId: "patient-17",
    });
    const keys = [...text.matchAll(/^([A-Z0-9_]+)=/gm)].map((match) => match[1]);
    expect(keys).toEqual([...SCOPED_KEYS]);
    expect(text).toContain("VITE_AIDBOX_CLIENT_ID=odontogram-live");
    expect(text).toContain("VITE_DEFAULT_PATIENT_ID=patient-17");
    expect(text).not.toMatch(/AIDBOX_ADMIN|BOX_ADMIN|VITE_AIDBOX_ADMIN|\broot\b/i);
  });

  it("refuses to write operator or admin credentials into .env or any VITE_* key", () => {
    const directory = mkdtempSync(join(tmpdir(), "odontogram-cpx-"));
    const target = join(directory, ".env");
    expect(() => writeScopedEnv(target, {
      VITE_AIDBOX_BASE_URL: "http://localhost:58601",
      VITE_AIDBOX_CLIENT_ID: SCOPED_CLIENT_ID,
      VITE_AIDBOX_CLIENT_SECRET: "scoped-secret",
      VITE_DEFAULT_PATIENT_ID: "patient-17",
      AIDBOX_ADMIN_PASSWORD: "operator-secret",
    })).toThrow(/admin|operator|VITE_/i);
    expect(() => writeScopedEnv(target, {
      VITE_AIDBOX_ADMIN_PASSWORD: "leaked",
      VITE_AIDBOX_BASE_URL: "http://localhost:58601",
      VITE_AIDBOX_CLIENT_ID: SCOPED_CLIENT_ID,
      VITE_AIDBOX_CLIENT_SECRET: "scoped-secret",
      VITE_DEFAULT_PATIENT_ID: "patient-17",
    })).toThrow(/admin|operator|VITE_/i);
    expect(() => writeScopedEnv(target, {
      VITE_AIDBOX_BASE_URL: "http://localhost:58601",
      VITE_AIDBOX_CLIENT_ID: "root",
      VITE_AIDBOX_CLIENT_SECRET: "scoped-secret",
      VITE_DEFAULT_PATIENT_ID: "patient-17",
    })).toThrow(/admin|scoped|odontogram-live/i);
  });

  it("writes only the four scoped Vite keys when the input is valid", () => {
    const directory = mkdtempSync(join(tmpdir(), "odontogram-cpx-"));
    const target = join(directory, ".env");
    writeScopedEnv(target, {
      VITE_AIDBOX_BASE_URL: "http://localhost:58601",
      VITE_AIDBOX_CLIENT_ID: SCOPED_CLIENT_ID,
      VITE_AIDBOX_CLIENT_SECRET: "scoped-secret",
      VITE_DEFAULT_PATIENT_ID: "patient-17",
    });
    const written = readFileSync(target, "utf8");
    const keys = [...written.matchAll(/^([A-Z0-9_]+)=/gm)].map((match) => match[1]);
    expect(keys).toEqual([...SCOPED_KEYS]);
    expect(written).toContain("VITE_AIDBOX_CLIENT_ID=odontogram-live");
  });

  it("describes exactly the odontogram-live HTTP Basic client", () => {
    const client = desiredClient("scoped-secret");
    expect(client).toMatchObject({
      resourceType: "Client",
      id: SCOPED_CLIENT_ID,
      secret: "scoped-secret",
      grant_types: ["basic"],
    });
    expect(client.grant_types).toEqual(["basic"]);
    expect(JSON.stringify(client)).not.toMatch(/client_credentials|engine":"allow"|AIDBOX_ADMIN/i);
    expect(() => rejectAdminEquivalentClient({
      id: SCOPED_CLIENT_ID,
      grant_types: ["client_credentials", "basic"],
    })).toThrow(/admin|scope|basic/i);
  });

  it("describes AccessPolicy odontogram-live-dental as Patient GET and dental writes only", () => {
    const policy = desiredAccessPolicy();
    expect(policy.resourceType).toBe("AccessPolicy");
    expect(policy.id).toBe(SCOPED_POLICY_ID);
    expect(policy.engine).toBe("matcho");
    expect(policy.link).toEqual([{ resourceType: "Client", id: SCOPED_CLIENT_ID }]);
    expect(JSON.stringify(policy)).not.toMatch(/"engine":"allow"/);
    expect(JSON.stringify(policy)).toMatch(/\/fhir\//);

    const clauses = policy.matcho?.["$one-of"] as Array<Record<string, unknown>>;
    expect(Array.isArray(clauses)).toBe(true);
    const patient = clauses.find((clause) => JSON.stringify(clause).includes("Patient"));
    const dental = clauses.find((clause) => JSON.stringify(clause).includes("Observation"));
    expect(patient).toEqual({
      uri: "#/fhir/Patient.*",
      "request-method": "get",
    });
    expect(dental).toEqual({
      uri: "#/fhir/(Observation|Condition|ServiceRequest|CarePlan).*",
      "request-method": { "$one-of": ["get", "put", "post", "delete"] },
    });
    expect(JSON.stringify(policy)).not.toMatch(/ImplementationGuide|Practitioner|Device|Provenance/);
    expect(JSON.stringify(policy)).not.toMatch(/\$regex|\$enum/);
  });

  it("reads operator credentials from the environment or PolarIS env file, never from VITE_*", () => {
    const directory = mkdtempSync(join(tmpdir(), "odontogram-cpx-"));
    const polarisEnv = join(directory, ".env");
    writeFileSync(polarisEnv, "AIDBOX_ADMIN_ID=operator\nAIDBOX_ADMIN_PASSWORD=from-file\n");
    expect(() => resolveOperatorCredentials({
      VITE_AIDBOX_CLIENT_SECRET: "browser-secret",
      VITE_AIDBOX_ADMIN_PASSWORD: "leaked",
    }, [])).toThrow(/VITE_|operator|admin/i);
    const fromEnv = resolveOperatorCredentials({
      AIDBOX_ADMIN_ID: "operator",
      AIDBOX_ADMIN_PASSWORD: "from-env",
    }, [polarisEnv]);
    expect(fromEnv).toEqual({ id: "operator", password: "from-env" });
    const fromFile = resolveOperatorCredentials({}, [polarisEnv]);
    expect(fromFile).toEqual({ id: "operator", password: "from-file" });
  });

  it("defaults Reetfurt and PolarIS checkouts from HOME and honors env overrides", () => {
    expect(resolveHomeCheckout({ HOME: "/tmp/devhome" }, "REETFURT_DIR", join("code", "mvz-reetfurt")))
      .toBe(join("/tmp/devhome", "code", "mvz-reetfurt"));
    expect(resolveHomeCheckout({ HOME: "/tmp/devhome" }, "POLARIS_DIR", join("code", "polaris", "platform")))
      .toBe(join("/tmp/devhome", "code", "polaris", "platform"));
    expect(resolveHomeCheckout(
      { HOME: "/tmp/devhome", REETFURT_DIR: "/opt/reetfurt", POLARIS_DIR: "/opt/polaris/platform" },
      "REETFURT_DIR",
      join("code", "mvz-reetfurt"),
    )).toBe("/opt/reetfurt");
    expect(resolveHomeCheckout(
      { HOME: "/tmp/devhome", POLARIS_DIR: "/opt/polaris/platform" },
      "POLARIS_DIR",
      join("code", "polaris", "platform"),
    )).toBe("/opt/polaris/platform");
  });

  it("does not choose a patient whose only dental Observations the codec rejects", () => {
    const rejected = {
      id: "dent-001",
      resources: [
        { resourceType: "Patient", id: "dent-001" },
        {
          resourceType: "Observation",
          id: "dent-001-obs-caries",
          meta: { profile: ["https://fhir.cognovis.de/dental-core/StructureDefinition/dental-caries-finding"] },
          status: "final",
          code: { text: "caries" },
          subject: { reference: "Patient/dent-001" },
        },
      ],
    };
    const foreignOnly = {
      id: "foreign-only",
      resources: [
        { resourceType: "Patient", id: "foreign-only" },
        {
          resourceType: "Observation",
          id: "charly-tooth-11",
          meta: { profile: ["https://fhir.cognovis.de/dental/StructureDefinition/dental-finding"] },
          status: "final",
          code: { coding: [{ system: "https://fhir.cognovis.de/dental/CodeSystem/ze-befund", code: "4198" }] },
          subject: { reference: "Patient/foreign-only" },
        },
      ],
    };
    const chartedDocument = {
      version: PAYLOAD_VERSION,
      globals: {},
      teeth: { "16": { caries: ["caries-occlusal"], cariesSeverity: { occlusal: 5 } } },
    } as OdontogramDocument;
    const chartedResources = buildWritePlan({
      document: chartedDocument,
      patientId: "charted",
      effectiveDateTime: "2026-09-02",
    }).ops.map((op) => op.resource as unknown as Record<string, unknown>);
    const charted = {
      id: "charted",
      resources: [{ resourceType: "Patient", id: "charted" }, ...chartedResources],
    };

    expect(chooseLoadableDentalPatient([rejected, foreignOnly, charted])).toBe("charted");
    expect(chooseLoadableDentalPatient([rejected, foreignOnly])).toBe("foreign-only");
    expect(() => chooseLoadableDentalPatient([rejected])).toThrow(/parse|Dental Core|reject/i);
  });

  it("mints a Client secret only when GET confirms the Client is absent", () => {
    expect(readExistingScopedSecret(200, { secret: "kept-secret" })).toEqual({
      reuse: true,
      secret: "kept-secret",
    });
    expect(readExistingScopedSecret(404, {})).toEqual({ reuse: false });
    expect(() => readExistingScopedSecret(500, { issue: [{ diagnostics: "boom" }] }))
      .toThrow(/500|refusing|mint|secret/i);
    expect(() => readExistingScopedSecret(401, {})).toThrow(/401|refusing|mint|secret/i);
    expect(() => readExistingScopedSecret(403, {})).toThrow(/403|refusing|mint|secret/i);
    expect(() => readExistingScopedSecret(200, { id: SCOPED_CLIENT_ID })).toThrow(/secret|refusing|mint/i);
    expect(() => readExistingScopedSecret(200, { secret: "__sha256:deadbeef" })).toThrow(
      /odontogram-live|plaintext|delete|non-retrievable|hash|digest/i,
    );
  });

  it("does not encode a machine-absolute home path in committed source", () => {
    const needle = ["/", "Users", "/", "malte"].join("");
    const tracked = execSync("git ls-files", { encoding: "utf8" })
      .split("\n")
      .filter((file) => file.length > 0)
      .filter((file) => file !== ".library.lock");
    const offenders = tracked.filter((file) => readFileSync(file, "utf8").includes(needle));
    expect(offenders).toEqual([]);
  });
});
