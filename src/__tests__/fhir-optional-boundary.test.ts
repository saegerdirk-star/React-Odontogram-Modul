// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
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
    const packageJson = JSON.parse(source("package.json")) as { devDependencies?: Record<string, string> };

    expect(packageJson.devDependencies?.["@cognovis/fhir-release"]).toBe("0.2.4");
    expect(generator).toContain('name: "@cognovis/fhir-release", version: "0.2.4"');
    expect(generator).toContain("cognovis-fhir-release.manifest.json");
    expect(generator).toContain('entry.packageId === "de.cognovis.fhir.dental.core" && entry.scope === "estate"');
    expect(generator).toContain('dentalCoreClosure.version !== "0.6.0"');
    expect(generator).toContain("dental-core-contract.ts");
    expect(generator).not.toMatch(removedDialectPattern);
    expect(generator).not.toMatch(/de\.cognovis\.fhir\.dental"/i);
    expect(generator).toContain("@cognovis/codegen");
  });

  it("exposes one Dental Core seam without a selectable legacy implementation", () => {
    const publicTypes = source("src/fhir/types.ts");
    const publicEntry = source("src/fhir/index.ts");
    const session = source("src/odontogram.ts");

    expect(`${publicTypes}\n${publicEntry}\n${session}`).not.toMatch(/FhirDialect|resolveFhirDialect|UnsupportedFhirDialect/);
    expect(publicTypes).not.toMatch(/\bdialect\??:/);
    expect(session).not.toMatch(/\bdialect\s*:/);
    for (const removed of [
      "src/fhir/codesystems.ts",
      "src/fhir/iso3950.ts",
      "src/fhir/primitives.ts",
      "src/fhir/toFhirPerio.ts",
      "src/registry/fhir.ts",
      "src/registry/fromFhir.ts",
      "src/registry/legacyAxes.ts",
      "src/__tests__/legacy-fhir-golden.test.ts",
      "src/__tests__/fixtures/legacy-fhir-golden.json",
    ]) {
      expect(existsSync(resolve(root, removed)), removed).toBe(false);
    }
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

  it("documents the sole Dental Core contract and independent root posts in every language guide", () => {
    const guides = readdirSync(resolve(root, "lang"))
      .filter((name) => /^README-.*\.md$/.test(name))
      .map((name) => `lang/${name}`);

    expect(guides).toHaveLength(12);
    for (const guide of guides) {
      const text = source(guide);
      expect(text, guide).toContain("de.cognovis.fhir.dental.core#0.6.0");
      expect(text, guide).toContain("@cognovis/fhir-release@0.2.4");
      expect(text, guide).toContain("rootPostType");
    }

    const layoutGuides = guides.filter((guide) => source(guide).includes("`src/registry/`"));
    expect(layoutGuides).toHaveLength(11);
    for (const guide of layoutGuides) {
      const text = source(guide);
      for (const currentModule of [
        "toFhir.ts", "fromFhir.ts", "toFhirDentalCore.ts", "fromFhirDentalCore.ts", "dentalCoreContract.ts", "dentalCoreLocalCoding.ts",
      ]) expect(text, guide).toContain(currentModule);
      for (const removedModule of ["codesystems.ts", "primitives.ts", "registry/fhir.ts", "registry/fromFhir.ts", "fieldMappings.ts"]) {
        expect(text, guide).not.toContain(removedModule);
      }
    }

    const instructions = source("CLAUDE.md");
    for (const currentContract of [
      "dental-periodontal-finding", "dental-peri-implant-finding", "dental-gingival-recession-assessment",
      "32910-2", "64043-3", "34016-6", "771311009", "modified-plaque-index", "modified-sulcus-bleeding-index",
    ]) expect(instructions).toContain(currentContract);
    for (const obsoleteClaim of [
      "fieldMappings.ts", "periodontal-panel", "74029-0", "32911-0", "32912-8", "34015-8",
      "plaque-surface", "mod-plaque-index-mombelli", "mod-bleeding-index-mombelli", "component.bodySite` backport",
    ]) expect(instructions).not.toContain(obsoleteClaim);
  });
});
