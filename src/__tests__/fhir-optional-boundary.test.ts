// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

function source(relative: string): string {
  return readFileSync(resolve(root, relative), "utf8");
}

const removedDialectPattern = new RegExp(["dental", "de"].join("-"), "i");

function distributableFiles(relative: string): string[] {
  return readdirSync(resolve(root, relative), { withFileTypes: true }).flatMap((entry) => {
    const child = `${relative}/${entry.name}`;
    if (entry.isDirectory()) return distributableFiles(child);
    return /\.(?:md|mjs|py|ts|tsx|json|ya?ml)$/i.test(entry.name) ? [child] : [];
  });
}

function executableCode(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/`(?:\\.|[^`\\])*`/g, '""')
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''");
}

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
    expect(source("src/fhir/index.ts")).not.toMatch(new RegExp(`${["Dental", "De"].join("")}|${removedDialectPattern.source}`));
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

  // Bead odontogram-6fi narrowed this invariant, deliberately and in one
  // direction only. What must stay out is the SHIPPED graph: `dependencies` is
  // what a consumer installs, and nothing commercial may appear there. The
  // Aidbox live mode (`src/live`, `live.html`) is a dev-server app beside the
  // library and needs the @polaris SDK to talk to a server at all — as a
  // devDependency, reachable from no library entry point, excluded from the
  // declaration build, and not in `files`. `6fi-live-boundary.test.ts` holds
  // that containment; here only the shipped graph is asserted.
  it("keeps commercial integration modules out of the shipped package graph", () => {
    const packageJson = JSON.parse(source("package.json")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    for (const prohibited of ["polaris", "mira", "aidbox"]) {
      expect(Object.keys(packageJson.dependencies ?? {}).some((name) => name.toLowerCase().includes(prohibited))).toBe(false);
    }
    // A development dependency may be the SDK, but never a host application.
    for (const prohibited of ["mira", "aidbox"]) {
      expect(Object.keys(packageJson.devDependencies ?? {}).some((name) => name.toLowerCase().includes(prohibited))).toBe(false);
    }
  });

  it("pins and verifies the released Dental Core generation input", () => {
    const generator = source("tools/generate-dental-core-types.mjs");

    expect(generator).toContain('name: "de.cognovis.fhir.dental.core", version: "0.3.0"');
    expect(generator).toContain("https://fhir.cognovis.de/dental-core/0.3.0/package.tgz");
    expect(generator).toContain("12e2292e8d3c33907cde013fb1730a79cd276e25076fad8399e1df1e1f1addbc9b20c81a504839f78c3102bfdaad3d460f4f969d98eae97a7f277dce604733cb");
    expect(generator).toContain("dental-core-contract.ts");
    expect(generator).not.toMatch(removedDialectPattern);
    expect(generator).not.toMatch(/de\.cognovis\.fhir\.dental"/i);
    expect(generator).toContain("@atomic-ehr/codegen");
  });

  it("contains no removed-dialect implementation, generated artifact, or documentation residue", () => {
    const residue = new RegExp([
      `\\b${["fhir", "dental", "de"].join("-")}\\b`,
      `\\b${["dental", "de"].join("[-_.]")}\\b`,
      `\\b${["de", "cognovis", "fhir", "dental"].join("\\.")}(?!\\.core\\b)`,
      ["\\bdental", "De(?!vice)"].join(""),
    ].join("|"), "i");
    const files = ["src", "tools", "docs", "lang", "prototypes", ".agents"]
      .flatMap(distributableFiles)
      .concat(["README.md", "CHANGELOG.md", "CLAUDE.md", "package.json"]);

    for (const file of files) {
      expect(source(file), `Removed dialect residue in ${file}`).not.toMatch(residue);
    }
  });
});
