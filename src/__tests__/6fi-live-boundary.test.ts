// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Bead odontogram-cpx / odontogram-6fi AC4: the live mode is an APP beside the
// library, never a part of it. The published artifact must stay free of the
// FHIR client SDK, and the transport must stay out of everything the library
// entry point can reach. odontogram-cpx moves that client from the PolarIS
// package onto the provider-neutral Cognovis client surface.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const testFileUrl = import.meta.url;
const REPO_ROOT = fileURLToPath(new URL("../../", testFileUrl));
const SRC = `${REPO_ROOT}src`;
const FHIR_SDK_CLIENT = "@cognovis/fhir-sdk/client";
const POLARIS_FHIR_DE = ["@polaris", "fhir-de"].join("/");

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

function allTrackedTextFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    if (name === "node_modules" || name === "dist" || name === ".git") return [];
    const path = `${directory}/${name}`;
    if (statSync(path).isDirectory()) return allTrackedTextFiles(path);
    return /\.(?:tsx?|mjs|cjs|js|json)$/.test(name) ? [path] : [];
  });
}

const packageJson = JSON.parse(read("package.json")) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  files: string[];
};

describe("odontogram-cpx AC1: live mode uses the provider-neutral FHIR client", () => {
  it("keeps @cognovis/fhir-sdk in devDependencies only, never in dependencies", () => {
    expect(Object.keys(packageJson.dependencies).filter((name) => name.startsWith("@cognovis/fhir-sdk"))).toEqual([]);
    expect(Object.keys(packageJson.devDependencies)).toEqual(expect.arrayContaining(["@cognovis/fhir-sdk"]));
  });

  it("imports the client surface from live-mode sources", () => {
    expect(read("src/live/aidbox.ts")).toMatch(new RegExp(`from\\s+["']${FHIR_SDK_CLIENT}["']`));
  });

  it("forbids the PolarIS FHIR client package in source, tests, and the package manifest", () => {
    const manifestHits = [packageJson.dependencies, packageJson.devDependencies]
      .flatMap((block) => Object.keys(block ?? {}))
      .filter((name) => name === POLARIS_FHIR_DE);
    expect(manifestHits).toEqual([]);

    const lock = read("package-lock.json");
    expect(lock).not.toMatch(new RegExp(`"node_modules/${POLARIS_FHIR_DE.replace("/", "\\/")}"`));

    const offenders = allTrackedTextFiles(REPO_ROOT)
      .filter((path) => !path.endsWith("package-lock.json"))
      .filter((path) => readFileSync(path, "utf8").includes(POLARIS_FHIR_DE));
    expect(offenders).toEqual([]);
  });
});

describe("odontogram-6fi AC4: the published library carries no SDK", () => {
  it("keeps every PolarIS package out of dependencies", () => {
    expect(Object.keys(packageJson.dependencies).filter((name) => name.startsWith("@polaris/"))).toEqual([]);
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
      .filter((path) => /from\s+["']@(?:polaris|cognovis\/fhir-sdk)\//.test(readFileSync(path, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("is not reachable from the library entry point's own module graph", () => {
    for (const relative of ["src/index.ts", "src/App.tsx", "src/session.ts", "src/fhir/index.ts"]) {
      expect(read(relative), `${relative} must not import the live app`).not.toMatch(/from\s+["'][^"']*\/live\//);
      expect(read(relative), `${relative} must not import a FHIR client SDK`).not.toMatch(/@(?:polaris|cognovis\/fhir-sdk)\//);
    }
  });

  it("keeps the transport in one module: only src/live/aidbox.ts talks to the client SDK", () => {
    const fetchers = sourceFiles(`${SRC}/live`).filter((path) => {
      const text = readFileSync(path, "utf8");
      return /\bfetch\s*\(|@cognovis\/fhir-sdk\/client/.test(text);
    });
    expect(fetchers).toEqual([`${SRC}/live/aidbox.ts`]);
  });
});

const ADMIN_CREDENTIAL_KEY = /\bAIDBOX_ADMIN\b|\bBOX_ADMIN\b|\bVITE_AIDBOX_ADMIN\b/i;

describe("odontogram-6fi AC5: only the scoped machine client is documented", () => {
  it("names the scoped client and no admin credential in .env.example", () => {
    const example = read(".env.example");
    expect(example).toMatch(/VITE_AIDBOX_BASE_URL/);
    expect(example).toMatch(/VITE_AIDBOX_CLIENT_ID/);
    expect(example).toMatch(/VITE_AIDBOX_CLIENT_SECRET/);
    expect(example).toMatch(/VITE_DEFAULT_PATIENT_ID/);
    expect(example).toMatch(/scoped/i);
    expect(example).not.toMatch(ADMIN_CREDENTIAL_KEY);
  });

  it("keeps Vite config free of operator and admin credential keys", () => {
    for (const relative of ["vite.config.ts", "vite.lib.config.ts", "vitest.config.ts"]) {
      expect(read(relative), relative).not.toMatch(ADMIN_CREDENTIAL_KEY);
    }
  });

  it("keeps the real .env out of version control", () => {
    expect(read(".gitignore").split("\n").map((line) => line.trim())).toContain(".env");
  });
});
