// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { APIBuilder, prettyReport } from "@atomic-ehr/codegen";

const execFileAsync = promisify(execFile);
const dentalDePackage = { name: "de.cognovis.fhir.dental", version: "0.41.6" };
const dentalDeRemoteTgz = "https://fhir.cognovis.de/dental/package.tgz";
const dentalDeTgzSha256 = "80f17e02dba591697a4107f463ee3516f16f5f591cfb12f0174d5f472581947b";
const dentalDeStageDir = ".codegen-cache/dental-de";
const dentalDeStageFile = "de.cognovis.fhir.dental-0.41.6.tgz";
const fhirR4Core = { name: "hl7.fhir.r4.core", version: "4.0.1" };
const dentalDeCodegenArtifacts = [
  "StructureDefinition-dental-finding.json",
  "StructureDefinition-caries-observation.json",
  "StructureDefinition-periodontal-observation.json",
  "StructureDefinition-peri-implant-observation.json",
  "StructureDefinition-dental-implant.json",
  "StructureDefinition-fdi-tooth-number.json",
  "StructureDefinition-tooth-surfaces.json",
  "StructureDefinition-periodontal-measurement-site.json",
];

function withoutTargetProfiles(structureDefinition) {
  for (const element of [
    ...(structureDefinition.snapshot?.element ?? []),
    ...(structureDefinition.differential?.element ?? []),
  ]) {
    element.type = element.type?.map(({ targetProfile, ...type }) => type);
  }
  return structureDefinition;
}

async function verifyPackageArchive() {
  const response = await fetch(dentalDeRemoteTgz);
  if (!response.ok) throw new Error(`Failed to download ${dentalDeRemoteTgz}: HTTP ${response.status}`);

  const archive = Buffer.from(await response.arrayBuffer());
  const actualHash = createHash("sha256").update(archive).digest("hex");
  if (actualHash !== dentalDeTgzSha256) {
    throw new Error(`${dentalDePackage.name} archive SHA-256 mismatch: expected ${dentalDeTgzSha256}, received ${actualHash}`);
  }

  await mkdir(dentalDeStageDir, { recursive: true });
  const stagedArchive = join(dentalDeStageDir, dentalDeStageFile);
  const temporaryArchive = `${stagedArchive}.tmp`;
  await writeFile(temporaryArchive, archive);
  await rename(temporaryArchive, stagedArchive);

  const { stdout } = await execFileAsync("tar", ["-xzOf", stagedArchive, "package/package.json"]);
  const metadata = JSON.parse(stdout);
  if (metadata.name !== dentalDePackage.name || metadata.version !== dentalDePackage.version) {
    throw new Error(`Package metadata mismatch: expected ${dentalDePackage.name}@${dentalDePackage.version}, received ${String(metadata.name)}@${String(metadata.version)}`);
  }

  const extractedPackage = join(dentalDeStageDir, "package");
  await rm(extractedPackage, { force: true, recursive: true });
  await execFileAsync("tar", ["-xzf", stagedArchive, "-C", dentalDeStageDir]);

  const codegenPackage = join(dentalDeStageDir, "codegen-package");
  await rm(codegenPackage, { force: true, recursive: true });
  await mkdir(codegenPackage, { recursive: true });
  await writeFile(
    join(codegenPackage, "package.json"),
    JSON.stringify({ ...metadata, dependencies: {} }, null, 2),
  );
  await Promise.all(dentalDeCodegenArtifacts.map(async (artifact) => {
    const structureDefinition = withoutTargetProfiles(
      JSON.parse(await readFile(join(extractedPackage, artifact), "utf8")),
    );
    await writeFile(join(codegenPackage, artifact), JSON.stringify(structureDefinition));
  }));

  return codegenPackage;
}

const dentalCodegenPackage = await verifyPackageArchive();
const builder = new APIBuilder({ dropCanonicalManagerCache: true })
  .fromPackage(fhirR4Core.name, fhirR4Core.version)
  .localStructureDefinitions({ package: dentalDePackage, path: dentalCodegenPackage })
  .typescript({ generateProfile: true })
  .outputTo("src/fhir/generated")
  .cleanOutput(true)
  .throwException();

const report = await builder.generate();
await rm(join("src/fhir/generated/hl7-fhir-r4-core", "profiles"), { force: true, recursive: true });
const coreIndex = join("src/fhir/generated/hl7-fhir-r4-core", "index.ts");
await writeFile(coreIndex, (await readFile(coreIndex, "utf8")).replace('export * from "./profiles";\n', ""));
const dentalProfileDirectory = join("src/fhir/generated/de-cognovis-fhir-dental", "profiles");
for (const profileFile of await readdir(dentalProfileDirectory)) {
  if (!profileFile.endsWith(".ts")) continue;
  const profilePath = join(dentalProfileDirectory, profileFile);
  await writeFile(profilePath, (await readFile(profilePath, "utf8")).replace(/\n{2,}$/, "\n"));
}
console.log(prettyReport(report));
