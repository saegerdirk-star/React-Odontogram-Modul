// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Bead odontogram-wt5: the FHIR layer is a Dental Core mapping over
// `@cognovis/fhir-sdk` only. No local codegen, no public JSON-bundle API.

import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const FHIR_SDK_CLIENT = "@cognovis/fhir-sdk/client";
const POLARIS_FHIR_DE = ["@polaris", "fhir-de"].join("/");

function read(relative: string): string {
  return readFileSync(resolve(root, relative), "utf8");
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = `${directory}/${name}`;
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

function trackedFiles(): string[] {
  return execSync("git ls-files", { cwd: root, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
}

const packageJson = JSON.parse(read("package.json")) as {
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  exports?: Record<string, unknown>;
  scripts?: Record<string, string>;
};

describe("odontogram-wt5: FHIR layer is SDK-only", () => {
  it("tracks no generated Dental Core sources and no generator", () => {
    const tracked = trackedFiles();
    expect(tracked.filter((path) => path.startsWith("src/fhir/generated/"))).toEqual([]);
    expect(tracked).not.toContain("tools/generate-dental-core-types.mjs");
    expect(tracked).not.toContain("src/fhir/toFhir.ts");
    expect(tracked).not.toContain("src/fhir/fromFhir.ts");
    expect(existsSync(resolve(root, "src/fhir/generated"))).toBe(false);
    expect(existsSync(resolve(root, "tools/generate-dental-core-types.mjs"))).toBe(false);
  });

  it("pins registry @cognovis/fhir-sdk 0.11.0 and drops codegen packages", () => {
    expect(packageJson.version).toBe("4.0.0");
    expect(packageJson.dependencies?.["@cognovis/fhir-sdk"]).toBe("0.11.0");
    expect(packageJson.devDependencies?.["@cognovis/fhir-sdk"]).toBeUndefined();
    expect(packageJson.dependencies?.["@cognovis/codegen"]).toBeUndefined();
    expect(packageJson.devDependencies?.["@cognovis/codegen"]).toBeUndefined();
    expect(packageJson.dependencies?.["@cognovis/fhir-release"]).toBeUndefined();
    expect(packageJson.devDependencies?.["@cognovis/fhir-release"]).toBeUndefined();
    expect(packageJson.scripts?.["fhir:generate"]).toBeUndefined();

    const lock = JSON.parse(read("package-lock.json")) as {
      packages?: Record<string, { version?: string; resolved?: string }>;
    };
    const sdk = lock.packages?.["node_modules/@cognovis/fhir-sdk"];
    expect(sdk?.version).toBe("0.11.0");
    expect(sdk?.resolved).not.toMatch(/file:vendor\//);
    expect(sdk?.resolved).toMatch(/^https:\/\/npm\.cognovis\.de\//);
    expect(existsSync(resolve(root, "vendor/cognovis-fhir-sdk-0.11.0.tgz"))).toBe(false);
  });

  it("does not publish a ./fhir JSON-bundle entry", () => {
    expect(packageJson.exports).not.toHaveProperty("./fhir");
    expect(read("vite.lib.config.ts")).not.toMatch(/fhir:\s*path\.resolve/);
    expect(read("src/fhir/index.ts")).not.toMatch(/buildFhirBundle|parseFhirBundle/);
  });

  it("imports Dental Core classes and canonicals from the SDK, never from a local generated tree", () => {
    const fhirAndLive = [
      ...sourceFiles(resolve(root, "src/fhir")),
      ...sourceFiles(resolve(root, "src/live")),
    ];
    const offenders = fhirAndLive.filter((path) =>
      /from\s+["'][^"']*generated[/\\]/.test(readFileSync(path, "utf8")),
    );
    expect(offenders).toEqual([]);

    const mapping = read("src/fhir/toFhirDentalCore.ts") + "\n" + read("src/fhir/fromFhirDentalCore.ts");
    expect(mapping).toMatch(/from\s+["']@cognovis\/fhir-sdk\/dental-core["']/);
    expect(read("src/fhir/dentalCoreContract.ts")).toMatch(/from\s+["']@cognovis\/fhir-sdk\/(?:dental-core|canonicals)["']/);
  });

  it("keeps @cognovis/fhir-sdk/client inside src/live and forbids a second FHIR client package", () => {
    const src = resolve(root, "src");
    const clientOffenders = sourceFiles(src)
      .filter((path) => !path.startsWith(`${src}/live/`) && !path.includes("/__tests__/"))
      .filter((path) => readFileSync(path, "utf8").includes(FHIR_SDK_CLIENT));
    expect(clientOffenders).toEqual([]);

    expect(read("src/live/aidbox.ts")).toMatch(new RegExp(`from\\s+["']${FHIR_SDK_CLIENT}["']`));

    const polarisHits = [
      ...Object.keys(packageJson.dependencies ?? {}),
      ...Object.keys(packageJson.devDependencies ?? {}),
    ].filter((name) => name === POLARIS_FHIR_DE || name.startsWith("@polaris/"));
    expect(polarisHits).toEqual([]);
  });
});
