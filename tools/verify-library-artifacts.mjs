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
    'import type { FhirExportOptions } from "react-advanced-odontogram/fhir";',
    "const options: FhirExportOptions = { dialect: \"legacy\" };",
    "void Odontogram;",
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
