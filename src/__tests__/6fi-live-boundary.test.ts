// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Bead odontogram-6fi, seam 4 / AC4: the live mode is an APP beside the
// library, never a part of it. The published artifact must stay free of the
// @polaris SDK, and the transport must stay out of everything the library
// entry point can reach — the invariant bead odontogram-3l1 established, held
// now against a second entry point that legitimately does talk to a server.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const testFileUrl = import.meta.url;
const REPO_ROOT = fileURLToPath(new URL("../../", testFileUrl));
const SRC = `${REPO_ROOT}src`;

function read(relative: string): string {
  return readFileSync(`${REPO_ROOT}${relative}`, "utf8");
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = `${directory}/${name}`;
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

const packageJson = JSON.parse(read("package.json")) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  files: string[];
};

describe("odontogram-6fi AC4: the published library carries no SDK", () => {
  it("keeps every @polaris package in devDependencies only", () => {
    expect(Object.keys(packageJson.dependencies).filter((name) => name.startsWith("@polaris/"))).toEqual([]);
    expect(Object.keys(packageJson.devDependencies)).toEqual(
      expect.arrayContaining(["@polaris/sdk", "@polaris/fhir-de"]),
    );
  });

  it("ships only dist/, so neither the live app nor its entry page is published", () => {
    expect(packageJson.files).toEqual(["dist"]);
  });

  it("keeps the declaration build out of src/live, so no SDK type reaches dist", () => {
    const buildConfig = JSON.parse(read("tsconfig.build.json")) as { exclude: string[] };
    expect(buildConfig.exclude).toContain("src/live");
  });
});

describe("odontogram-6fi AC4: the SDK stays inside src/live", () => {
  it("is imported by no source file outside src/live", () => {
    const offenders = sourceFiles(SRC)
      .filter((path) => !path.startsWith(`${SRC}/live/`) && !path.includes("/__tests__/"))
      .filter((path) => /from\s+["']@polaris\//.test(readFileSync(path, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("is not reachable from the library entry point's own module graph", () => {
    for (const relative of ["src/index.ts", "src/App.tsx", "src/session.ts", "src/fhir/index.ts"]) {
      expect(read(relative), `${relative} must not import the live app`).not.toMatch(/from\s+["'][^"']*\/live\//);
      expect(read(relative), `${relative} must not import the SDK`).not.toMatch(/@polaris\//);
    }
  });

  it("keeps the transport in one module: only src/live/aidbox.ts calls fetch", () => {
    const fetchers = sourceFiles(`${SRC}/live`).filter((path) => /\bfetch\s*\(|@polaris\/fhir-de/.test(readFileSync(path, "utf8")));
    expect(fetchers).toEqual([`${SRC}/live/aidbox.ts`]);
  });
});

describe("odontogram-6fi AC5: only the scoped machine client is documented", () => {
  it("names the scoped client and no admin credential in .env.example", () => {
    const example = read(".env.example");
    expect(example).toMatch(/VITE_AIDBOX_BASE_URL/);
    expect(example).toMatch(/VITE_AIDBOX_CLIENT_ID/);
    expect(example).toMatch(/VITE_AIDBOX_CLIENT_SECRET/);
    expect(example).toMatch(/VITE_DEFAULT_PATIENT_ID/);
    expect(example).toMatch(/scoped/i);
    expect(example).not.toMatch(/\bAIDBOX_ADMIN|\bBOX_ADMIN|\broot\b/i);
  });

  it("keeps the real .env out of version control", () => {
    expect(read(".gitignore").split("\n").map((line) => line.trim())).toContain(".env");
  });
});
