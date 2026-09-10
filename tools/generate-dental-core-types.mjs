import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { Buffer } from "node:buffer";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { promisify } from "node:util";
import { APIBuilder, prettyReport } from "@cognovis/codegen";

const execFileAsync = promisify(execFile);
const fhirReleaseProjection = { name: "@cognovis/fhir-release", version: "0.2.9" };
const fhirReleaseManifestPath = join("node_modules", "@cognovis", "fhir-release", "cognovis-fhir-release.manifest.json");
const fhirReleaseManifest = JSON.parse(await readFile(fhirReleaseManifestPath, "utf8"));
if (fhirReleaseManifest.projectionVersion !== fhirReleaseProjection.version) {
  throw new Error(`FHIR release projection mismatch: expected ${fhirReleaseProjection.version}, received ${String(fhirReleaseManifest.projectionVersion)}`);
}
const localCandidateArchive = process.env.DENTAL_CORE_PACKAGE_TGZ
  ? resolve(process.env.DENTAL_CORE_PACKAGE_TGZ)
  : undefined;
const localCandidateBytes = localCandidateArchive ? await readFile(localCandidateArchive) : undefined;
const localCandidateExpectedSha256 = process.env.DENTAL_CORE_PACKAGE_SHA256;
if (localCandidateArchive && !/^[a-f0-9]{64}$/.test(localCandidateExpectedSha256 ?? "")) {
  throw new Error("DENTAL_CORE_PACKAGE_SHA256 must contain the expected lowercase SHA-256 for the local candidate archive");
}
if (localCandidateBytes) {
  const actualSha256 = createHash("sha256").update(localCandidateBytes).digest("hex");
  if (actualSha256 !== localCandidateExpectedSha256) {
    throw new Error(`Local Dental Core candidate SHA-256 mismatch: expected ${localCandidateExpectedSha256}, received ${actualSha256}`);
  }
}
const dentalCoreClosure = fhirReleaseManifest.closure?.find((entry) =>
  entry.packageId === "de.cognovis.fhir.dental.core" && entry.scope === "estate");
if (!localCandidateArchive && (!dentalCoreClosure || dentalCoreClosure.version !== "0.7.1" || typeof dentalCoreClosure.integrity !== "string")) {
  throw new Error("FHIR release projection does not contain the Dental Core 0.7.1 estate package");
}
const localCandidateMetadata = localCandidateArchive
  ? JSON.parse((await execFileAsync("tar", ["-xzOf", localCandidateArchive, "package/package.json"])).stdout)
  : undefined;
const dentalCorePackage = localCandidateMetadata
  ? { name: localCandidateMetadata.name, version: localCandidateMetadata.version }
  : { name: dentalCoreClosure.packageId, version: dentalCoreClosure.version };
const dentalCoreRemoteTgz = `https://npm.cognovis.de/${dentalCorePackage.name}/-/${dentalCorePackage.name}-${dentalCorePackage.version}.tgz`;
const dentalCoreTgzSha512 = dentalCoreClosure
  ? Buffer.from(dentalCoreClosure.integrity.replace(/^sha512-/, ""), "base64").toString("hex")
  : undefined;
const dentalCoreStageDir = ".codegen-cache/dental-core";
const dentalCoreStageFile = `${dentalCorePackage.name}-${dentalCorePackage.version}.tgz`;
const dentalCoreGeneratedRoot = "src/fhir/generated";
const dentalCoreContractPath = join(dentalCoreGeneratedRoot, "dental-core-contract.ts");
const fhirR4Core = { name: "hl7.fhir.r4.core", version: "4.0.1" };

function withoutTargetProfiles(structureDefinition) {
  for (const element of [
    ...(structureDefinition.snapshot?.element ?? []),
    ...(structureDefinition.differential?.element ?? []),
  ]) {
    element.type = element.type?.map(({ targetProfile, ...type }) => type);
  }
  return structureDefinition;
}

function asIdentifier(value) {
  return value.replace(/[^A-Za-z0-9]+(.)/g, (_, next) => next.toUpperCase());
}

function codeSystemCodes(resource) {
  const result = [];
  const visit = (concepts) => {
    for (const concept of concepts ?? []) {
      if (typeof concept.code === "string") result.push(concept.code);
      visit(concept.concept);
    }
  };
  visit(resource.concept);
  return result.sort();
}

async function writeGeneratedContract(extractedPackage, metadata) {
  const packageFiles = (await readdir(extractedPackage)).sort();
  const profileResources = await Promise.all(packageFiles
    .filter((file) => file.startsWith("StructureDefinition-") && file.endsWith(".json"))
    .map(async (file) => JSON.parse(await readFile(join(extractedPackage, file), "utf8"))));
  const codeSystemResources = await Promise.all(packageFiles
    .filter((file) => file.startsWith("CodeSystem-") && file.endsWith(".json"))
    .map(async (file) => JSON.parse(await readFile(join(extractedPackage, file), "utf8"))));
  const profiles = Object.fromEntries(profileResources
    .filter((resource) => typeof resource.id === "string" && typeof resource.url === "string")
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((resource) => [resource.id, resource.url]));
  const codeSystems = Object.fromEntries(codeSystemResources
    .filter((resource) => typeof resource.id === "string" && typeof resource.url === "string")
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((resource) => [resource.id, resource.url]));
  const codeSystemCodesById = Object.fromEntries(codeSystemResources
    .filter((resource) => typeof resource.id === "string")
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((resource) => [resource.id, codeSystemCodes(resource)]));
  const content = [
    "// Generated by tools/generate-dental-core-types.mjs. Do not edit.",
    `export const DENTAL_CORE_PACKAGE_NAME = ${JSON.stringify(metadata.name)} as const;`,
    `export const DENTAL_CORE_PACKAGE_VERSION = ${JSON.stringify(metadata.version)} as const;`,
    `export const DENTAL_CORE_PACKAGE_ARCHIVE_URL = ${JSON.stringify(localCandidateArchive ? `local-candidate:${basename(localCandidateArchive)}` : dentalCoreRemoteTgz)} as const;`,
    `export const DENTAL_CORE_PACKAGE_SOURCE = ${JSON.stringify(localCandidateArchive ? "local-candidate" : "released-projection")} as const;`,
    `export const DENTAL_CORE_PACKAGE_SHA256 = ${JSON.stringify(metadata.sha256)} as const;`,
    `export const DENTAL_CORE_PACKAGE_SHA512 = ${JSON.stringify(metadata.sha512)} as const;`,
    `export const FHIR_RELEASE_PROJECTION_PACKAGE = ${JSON.stringify(fhirReleaseProjection.name)} as const;`,
    `export const FHIR_RELEASE_PROJECTION_VERSION = ${JSON.stringify(fhirReleaseProjection.version)} as const;`,
    `export const FHIR_RELEASE_PROJECTION_IDENTITY = ${JSON.stringify(fhirReleaseManifest.identity)} as const;`,
    `export const FHIR_RELEASE_PROJECTION_CLOSURE_DIGEST = ${JSON.stringify(fhirReleaseManifest.closureDigest)} as const;`,
    localCandidateArchive
      ? "export const DENTAL_CORE_CLOSURE_ENTRY = null;"
      : `export const DENTAL_CORE_CLOSURE_ENTRY = ${JSON.stringify(dentalCoreClosure, null, 2)} as const;`,
    `export const DENTAL_CORE_CANONICAL = ${JSON.stringify(metadata.canonical)} as const;`,
    `export const DENTAL_CORE_PROFILE_URLS = ${JSON.stringify(profiles, null, 2)} as const;`,
    `export const DENTAL_CORE_CODE_SYSTEM_URLS = ${JSON.stringify(codeSystems, null, 2)} as const;`,
    `export const DENTAL_CORE_CODE_SYSTEM_CODES = ${JSON.stringify(codeSystemCodesById, null, 2)} as const;`,
    "",
  ].join("\n");
  await writeFile(dentalCoreContractPath, content);
}

async function normalizeGeneratedWhitespace(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return normalizeGeneratedWhitespace(path);
    if (!entry.isFile() || !entry.name.endsWith(".ts")) return undefined;
    const content = await readFile(path, "utf8");
    const normalized = content.replace(/\n{2,}$/u, "\n");
    if (normalized !== content) await writeFile(path, normalized);
    return undefined;
  }));
}

async function verifyPackageArchive() {
  const archive = localCandidateBytes
    ? localCandidateBytes
    : await (async () => {
      const response = await fetch(dentalCoreRemoteTgz);
      if (!response.ok) throw new Error(`Failed to download ${dentalCoreRemoteTgz}: HTTP ${response.status}`);
      return Buffer.from(await response.arrayBuffer());
    })();
  const actualHash = createHash("sha512").update(archive).digest("hex");
  const actualSha256 = createHash("sha256").update(archive).digest("hex");
  if (!localCandidateArchive && actualHash !== dentalCoreTgzSha512) {
    throw new Error(`${dentalCorePackage.name} archive SHA-512 mismatch: expected ${dentalCoreTgzSha512}, received ${actualHash}`);
  }

  await mkdir(dentalCoreStageDir, { recursive: true });
  const stagedArchive = join(dentalCoreStageDir, localCandidateArchive ? basename(localCandidateArchive) : dentalCoreStageFile);
  const temporaryArchive = `${stagedArchive}.tmp`;
  await writeFile(temporaryArchive, archive);
  await rename(temporaryArchive, stagedArchive);

  const { stdout } = await execFileAsync("tar", ["-xzOf", stagedArchive, "package/package.json"]);
  const metadata = JSON.parse(stdout);
  if (metadata.name !== dentalCorePackage.name || metadata.version !== dentalCorePackage.version) {
    throw new Error(`Package metadata mismatch: expected ${dentalCorePackage.name}@${dentalCorePackage.version}, received ${String(metadata.name)}@${String(metadata.version)}`);
  }

  const extractedPackage = join(dentalCoreStageDir, "package");
  await rm(extractedPackage, { force: true, recursive: true });
  await execFileAsync("tar", ["-xzf", stagedArchive, "-C", dentalCoreStageDir]);

  const codegenPackage = join(dentalCoreStageDir, "codegen-package");
  await rm(codegenPackage, { force: true, recursive: true });
  await mkdir(codegenPackage, { recursive: true });
  await writeFile(join(codegenPackage, "package.json"), JSON.stringify({ ...metadata, dependencies: {} }, null, 2));
  const structureDefinitions = (await readdir(extractedPackage))
    .filter((file) => file.startsWith("StructureDefinition-") && file.endsWith(".json"))
    .sort();
  for (const artifact of structureDefinitions) {
    const structureDefinition = withoutTargetProfiles(JSON.parse(await readFile(join(extractedPackage, artifact), "utf8")));
    await writeFile(join(codegenPackage, artifact), JSON.stringify(structureDefinition));
  }
  await writeGeneratedContract(extractedPackage, { ...metadata, sha256: actualSha256, sha512: actualHash });
  return { codegenPackage, metadata, sha256: actualSha256, sha512: actualHash };
}

const verifiedPackage = await verifyPackageArchive();
const builder = new APIBuilder({ dropCanonicalManagerCache: true })
  .fromPackage(fhirR4Core.name, fhirR4Core.version)
  .localStructureDefinitions({ package: dentalCorePackage, path: verifiedPackage.codegenPackage })
  .typescript({ generateProfile: true })
  .outputTo(dentalCoreGeneratedRoot)
  .cleanOutput(true)
  .throwException();

const report = await builder.generate();
await rm(join(dentalCoreGeneratedRoot, "hl7-fhir-r4-core", "profiles"), { force: true, recursive: true });
const coreIndex = join(dentalCoreGeneratedRoot, "hl7-fhir-r4-core", "index.ts");
await writeFile(coreIndex, (await readFile(coreIndex, "utf8")).replace(/^export \* from "\.\/profiles(?:\/index\.js)?";\n/mu, ""));
await writeGeneratedContract(join(dentalCoreStageDir, "package"), {
  ...verifiedPackage.metadata,
  sha256: verifiedPackage.sha256,
  sha512: verifiedPackage.sha512,
});
await normalizeGeneratedWhitespace(dentalCoreGeneratedRoot);
console.log(prettyReport(report));
