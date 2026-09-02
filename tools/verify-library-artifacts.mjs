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
}

const consumerDirectory = mkdtempSync(join(root, ".odontogram-library-consumer-"));

try {
  writeFileSync(join(consumerDirectory, "consumer.ts"), [
    'import Odontogram from "react-advanced-odontogram";',
    'import { DentalCoreBundleRejectedError, MissingDentalCoreEffectiveDateError, buildDentalCoreBundle, buildFhirBundle, parseDentalCoreBundle, parseFhirBundle } from "react-advanced-odontogram/fhir";',
    'import type { FhirExportOptions, OdontogramExportPayload, ToothRecord } from "react-advanced-odontogram/fhir";',
    '// @ts-expect-error The removed legacy FHIR dialect is intentionally not public.',
    `import type { ${removedDialectSymbols.slice(0, 2).join(", ")} } from "react-advanced-odontogram/fhir";`,
    "const options: FhirExportOptions = { subject: \"Patient/example\", effectiveDateTime: \"2026-08-12\" };",
    'const payload: OdontogramExportPayload = { version: "2.25", globals: {}, teeth: {} };',
    'const resection: ToothRecord = { rootResection: "hemisection", rootResectionRoot: "mesial" };',
    "void Odontogram;",
    "void buildDentalCoreBundle;",
    "void buildFhirBundle;",
    "void parseFhirBundle;",
    "void DentalCoreBundleRejectedError;",
    "void MissingDentalCoreEffectiveDateError;",
    "void parseDentalCoreBundle;",
    "void options;",
    "void payload;",
    "void resection;",
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
