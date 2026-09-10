// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
if (packageJson.exports["./fhir"]) {
  throw new Error("The published package must not expose a ./fhir JSON-bundle entry");
}
const typeEntries = [
  packageJson.types,
  ...Object.values(packageJson.exports).flatMap((entry) => entry.types ? [entry.types] : []),
];
const removedDialectSymbols = [
  ["Fhir", "Dialect"].join(""),
  ["Fhir", "CodecOptions"].join(""),
  ["Unsupported", "Fhir", "Dialect"].join(""),
];

for (const typeEntry of typeEntries) {
  const artifact = resolve(root, typeEntry);
  if (!existsSync(artifact)) {
    throw new Error(`Missing declaration artifact: ${typeEntry}`);
  }
  const declaration = readFileSync(artifact, "utf8");
  for (const removedSymbol of removedDialectSymbols) {
    if (declaration.includes(removedSymbol)) {
      throw new Error(`Removed FHIR dialect symbol ${removedSymbol} leaked into ${typeEntry}`);
    }
  }
  for (const leaked of ["buildFhirBundle", "parseFhirBundle", "exportFhirBundle", "importFhirBundle"]) {
    if (declaration.includes(leaked)) {
      throw new Error(`Removed JSON-bundle API ${leaked} leaked into ${typeEntry}`);
    }
  }
}

const consumerDirectory = mkdtempSync(join(root, ".odontogram-library-consumer-"));

try {
  writeFileSync(join(consumerDirectory, "consumer.ts"), [
    'import Odontogram from "react-advanced-odontogram";',
    "void Odontogram;",
    "",
  ].join("\n"));

  execFileSync("npx", [
    "tsc",
    "--noEmit",
    "--module", "NodeNext",
    "--moduleResolution", "NodeNext",
    "--target", "ES2022",
    "--skipLibCheck",
    join(consumerDirectory, "consumer.ts"),
  ], { cwd: root, stdio: "inherit" });

  writeFileSync(join(consumerDirectory, "forbidden.ts"), [
    'import { buildFhirBundle } from "react-advanced-odontogram/fhir";',
    "void buildFhirBundle;",
    "",
  ].join("\n"));

  let forbiddenFailed = false;
  try {
    execFileSync("npx", [
      "tsc",
      "--noEmit",
      "--module", "NodeNext",
      "--moduleResolution", "NodeNext",
      "--target", "ES2022",
      "--skipLibCheck",
      join(consumerDirectory, "forbidden.ts"),
    ], { cwd: root, stdio: "pipe" });
  } catch {
    forbiddenFailed = true;
  }
  if (!forbiddenFailed) {
    throw new Error("A consumer must not be able to import react-advanced-odontogram/fhir");
  }
} finally {
  rmSync(consumerDirectory, { recursive: true, force: true });
}
