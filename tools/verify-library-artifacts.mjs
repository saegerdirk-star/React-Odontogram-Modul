// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const typeEntries = [
  packageJson.types,
  ...Object.values(packageJson.exports).flatMap((entry) => entry.types ? [entry.types] : []),
];

for (const typeEntry of typeEntries) {
  const artifact = resolve(root, typeEntry);
  if (!existsSync(artifact)) {
    throw new Error(`Missing declaration artifact: ${typeEntry}`);
  }
}

const consumerDirectory = mkdtempSync(join(root, ".odontogram-library-consumer-"));

try {
  writeFileSync(join(consumerDirectory, "consumer.ts"), [
    'import Odontogram, { createDentalDeOdontogramSession } from "react-advanced-odontogram";',
    'import { DENTAL_DE_COMPATIBILITY, DENTAL_DE_IMPORT_MANIFEST, importDentalDeBundle, exportDentalDeBundle } from "react-advanced-odontogram/fhir";',
    'import type { DentalDeExportOptions, SupportedDentalDeBundle } from "react-advanced-odontogram/fhir";',
    "const options: DentalDeExportOptions = { patient: \"Patient/example\", effectiveDateTime: \"2026-08-12\" };",
    "void Odontogram;",
    "void createDentalDeOdontogramSession;",
    "void importDentalDeBundle;",
    "void exportDentalDeBundle;",
    "void DENTAL_DE_COMPATIBILITY;",
    "void DENTAL_DE_IMPORT_MANIFEST;",
    "void (null as SupportedDentalDeBundle | null);",
    "void options;",
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
} finally {
  rmSync(consumerDirectory, { recursive: true, force: true });
}
