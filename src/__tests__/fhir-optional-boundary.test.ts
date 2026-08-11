import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { FhirExportOptions } from "../fhir/index";

const root = process.cwd();

function source(relative: string): string {
  return readFileSync(resolve(root, relative), "utf8");
}

function executableCode(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/`(?:\\.|[^`\\])*`/g, '""')
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''");
}

const optionalFhirConsumerOptions: FhirExportOptions = { dialect: "legacy" };

describe("optional FHIR package boundary", () => {
  it("keeps the document contract independent from the FHIR adapter", () => {
    const documentSource = source("src/document.ts");
    const documentCode = executableCode(documentSource);

    expect(documentCode).not.toMatch(/from\s+["'][^"']*fhir/);
    expect(documentCode).not.toMatch(/https?:\/\//);
    expect(documentSource).toContain("export type OdontogramDocument");
    expect(documentSource).toContain("Per-tooth record as produced by the engine's serializeState().");
    expect(documentSource).toContain("The serialized odontogram export payload");
    expect(documentSource).toContain("Serialized examination identity/context");
    expect(documentSource).toContain("The payload/document version this engine writes");
  });

  it("publishes an optional FHIR entry without changing the root entry", () => {
    const packageJson = JSON.parse(source("package.json")) as {
      exports: Record<string, unknown>;
    };

    expect(packageJson.exports).toHaveProperty(".");
    expect(packageJson.exports).toHaveProperty("./fhir");
    expect(source("src/fhir/index.ts")).toContain("buildFhirBundle");
    expect(source("vite.lib.config.ts")).toContain("fhir: path.resolve");
    expect(optionalFhirConsumerOptions.dialect).toBe("legacy");
  });

  it("maps each package type entry to a declared library entry", () => {
    const packageJson = JSON.parse(source("package.json")) as {
      types: string;
      exports: Record<string, { types?: string }>;
    };
    const viteLibraryConfig = source("vite.lib.config.ts");

    expect(packageJson.types).toBe("./dist/index.d.ts");
    expect(packageJson.exports["."]?.types).toBe("./dist/index.d.ts");
    expect(packageJson.exports["./fhir"]?.types).toBe("./dist/fhir.d.ts");
    expect(viteLibraryConfig).toMatch(/index:\s*path\.resolve\(__dirname, ['"]src\/index\.ts['"]\)/);
    expect(viteLibraryConfig).toMatch(/fhir:\s*path\.resolve\(__dirname, ['"]src\/fhir\/index\.ts['"]\)/);
  });

  it("keeps document types and payload version in one source module", () => {
    const adapterTypes = source("src/fhir/types.ts");

    expect(adapterTypes).toContain('from "../document"');
    expect(adapterTypes).not.toContain("export interface ToothRecord");
    expect(adapterTypes).not.toContain("export const PAYLOAD_VERSION");
  });

  it("keeps commercial integration modules out of the package graph", () => {
    const packageJson = JSON.parse(source("package.json")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const packageNames = Object.keys({ ...packageJson.dependencies, ...packageJson.devDependencies });

    for (const prohibited of ["polaris", "mira", "aidbox"]) {
      expect(packageNames.some((name) => name.toLowerCase().includes(prohibited))).toBe(false);
    }
  });

  it("pins and verifies the released Dental-DE generation input", () => {
    const generator = source("tools/generate-dental-de-types.mjs");

    expect(generator).toContain('name: "de.cognovis.fhir.dental", version: "0.41.6"');
    expect(generator).toContain("https://fhir.cognovis.de/dental/package.tgz");
    expect(generator).toContain("80f17e02dba591697a4107f463ee3516f16f5f591cfb12f0174d5f472581947b");
    expect(generator).toContain("@atomic-ehr/codegen");
  });
});
