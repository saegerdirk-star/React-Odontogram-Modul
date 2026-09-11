#!/usr/bin/env node
// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
//
// Bead odontogram-wt5 AC2: env-gated HL7 Validator 6.10.1 run against
// representative OBSERVED and PLANNED Dental Core collections. Missing jar or
// IG is a skip (exit 0), not a CI failure. Does not commit fixtures or the jar.

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

const jar =
  process.env.FHIR_VALIDATOR_JAR ||
  join(homedir(), ".fhir", "validator_cli-6.10.1.jar");

function resolveIg() {
  if (process.env.FHIR_DENTAL_CORE_IG) return process.env.FHIR_DENTAL_CORE_IG;
  const packageDir = join(homedir(), ".fhir", "packages", "de.cognovis.fhir.dental.core#0.7.1");
  const tarball = "/tmp/de.cognovis.fhir.dental.core-0.7.1.tgz";
  if (existsSync(packageDir)) return packageDir;
  return tarball;
}

function skip(reason) {
  process.stdout.write(`fhir:validate skipped: ${reason}\n`);
  process.exit(0);
}

if (!existsSync(jar)) {
  skip(`validator jar not found (${jar}). Set FHIR_VALIDATOR_JAR.`);
}

const javaProbe = spawnSync("java", ["-version"], { encoding: "utf8" });
if (javaProbe.error) {
  skip(`java is not available (${javaProbe.error.message}).`);
}

const ig = resolveIg();
if (!existsSync(ig)) {
  skip(`Dental Core IG not found (${ig}). Set FHIR_DENTAL_CORE_IG.`);
}

const emit = spawnSync("npx", ["jiti", "tools/emit-hl7-validator-fixtures.ts"], {
  encoding: "utf8",
  stdio: "inherit",
});
if (emit.status !== 0) process.exit(emit.status ?? 1);

function validate(bundle) {
  const result = spawnSync(
    "java",
    ["-Xmx4g", "-jar", jar, bundle, "-version", "4.0.1", "-ig", ig, "-tx", "n/a", "-output-style", "compact"],
    { encoding: "utf8" },
  );
  const out = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  process.stdout.write(out);
  const errors = (out.match(/: Error -/g) ?? []).length;
  return { status: result.status ?? 1, errors };
}

const observed = validate("/tmp/odontogram-wt5-observed-dental-core.json");
const planned = validate("/tmp/odontogram-wt5-planned-dental-core.json");
process.stdout.write(
  `fhir:validate observed errors=${observed.errors} planned errors=${planned.errors}\n`,
);
if (observed.errors !== 0 || planned.errors !== 0) process.exit(1);
process.exit(0);
