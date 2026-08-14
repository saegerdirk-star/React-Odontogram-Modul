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
    'import Odontogram from "react-advanced-odontogram";',
    'import { DentalCoreBundleRejectedError, buildDentalCoreBundle, buildFhirBundle, parseDentalCoreBundle, parseFhirBundle } from "react-advanced-odontogram/fhir";',
    'import type { FhirExportOptions, OdontogramExportPayload } from "react-advanced-odontogram/fhir";',
    "const options: FhirExportOptions = { subject: \"Patient/example\", effectiveDateTime: \"2026-08-12\" };",
    'const payload: OdontogramExportPayload = { version: "2.25", globals: {}, teeth: {} };',
    "void Odontogram;",
    "void buildDentalCoreBundle;",
    "void buildFhirBundle;",
    "void parseFhirBundle;",
    "void DentalCoreBundleRejectedError;",
    "void parseDentalCoreBundle;",
    "void options;",
    "void payload;",
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
