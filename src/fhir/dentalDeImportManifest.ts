import type { ToothRecord } from "../document";

export type DentalDeCarrier =
  | "odontogram-observation"
  | "caries-observation"
  | "dental-finding"
  | "periodontal-observation"
  | "peri-implant-observation"
  | "dental-implant"
  | "none";

export interface DentalDeImportManifestEntry {
  field: keyof ToothRecord;
  carrier: DentalDeCarrier;
  support: "canonical" | "unsupported" | "legacy" | "derived";
  roundTrip: boolean;
}

const row = (
  field: keyof ToothRecord,
  carrier: DentalDeCarrier,
  support: DentalDeImportManifestEntry["support"],
): DentalDeImportManifestEntry => ({ field, carrier, support, roundTrip: support === "canonical" });
const canonical = (field: keyof ToothRecord, carrier: DentalDeCarrier) => row(field, carrier, "canonical");
const unsupported = (field: keyof ToothRecord, carrier: DentalDeCarrier = "none") => row(field, carrier, "unsupported");
const legacy = (field: keyof ToothRecord) => row(field, "none", "legacy");
const derived = (field: keyof ToothRecord) => row(field, "none", "derived");

/**
 * Exhaustive field-to-carrier contract. `satisfies Record<keyof ToothRecord, …>`
 * makes a newly serialized field a compile error until its Dental-DE policy is
 * declared. Unsupported fields are never silently claimed as round-trippable.
 */
const MANIFEST_BY_FIELD = {
  toothSelection: canonical("toothSelection", "odontogram-observation"),
  toothSubstrate: canonical("toothSubstrate", "odontogram-observation"),
  endo: canonical("endo", "odontogram-observation"),
  rootCaries: canonical("rootCaries", "odontogram-observation"),
  resorptionType: canonical("resorptionType", "odontogram-observation"),
  apicalDx: canonical("apicalDx", "odontogram-observation"),
  periapicalType: canonical("periapicalType", "odontogram-observation"),
  restorationType: canonical("restorationType", "odontogram-observation"),
  restorationMaterial: canonical("restorationMaterial", "odontogram-observation"),
  fillingSurfaces: canonical("fillingSurfaces", "odontogram-observation"),
  crownLeakage: canonical("crownLeakage", "odontogram-observation"),
  fillingDefect: canonical("fillingDefect", "dental-finding"),
  prosthesis: canonical("prosthesis", "odontogram-observation"),
  caries: canonical("caries", "caries-observation"),
  cariesSeverity: canonical("cariesSeverity", "caries-observation"),
  radiographicDepth: canonical("radiographicDepth", "dental-finding"),
  perio: canonical("perio", "periodontal-observation"),
  furcation: canonical("furcation", "periodontal-observation"),
  plaque: canonical("plaque", "periodontal-observation"),
  pi: canonical("pi", "periodontal-observation"),
  gi: canonical("gi", "periodontal-observation"),
  mpi: canonical("mpi", "peri-implant-observation"),
  mbi: canonical("mbi", "peri-implant-observation"),
  kg: canonical("kg", "periodontal-observation"),
  implantProduct: canonical("implantProduct", "dental-implant"),
  note: canonical("note", "dental-finding"),
  assessment: unsupported("assessment", "periodontal-observation"),

  endoResection: unsupported("endoResection", "dental-finding"),
  mods: unsupported("mods", "dental-finding"),
  calculus: unsupported("calculus", "periodontal-observation"),
  fissureSealing: unsupported("fissureSealing", "dental-finding"),
  contactMesial: unsupported("contactMesial", "dental-finding"),
  contactDistal: unsupported("contactDistal", "dental-finding"),
  wearEdge: unsupported("wearEdge", "dental-finding"),
  wearCervical: unsupported("wearCervical", "dental-finding"),
  discoloration: unsupported("discoloration", "dental-finding"),
  periImplant: unsupported("periImplant", "peri-implant-observation"),
  cejVisibility: unsupported("cejVisibility", "periodontal-observation"),
  rootConcavity: unsupported("rootConcavity", "periodontal-observation"),
  gingivalThickness: unsupported("gingivalThickness", "periodontal-observation"),
  millerClass: unsupported("millerClass", "periodontal-observation"),
  orthoAppliance: unsupported("orthoAppliance", "dental-finding"),
  orthoDrift: unsupported("orthoDrift", "dental-finding"),
  orthoVertical: unsupported("orthoVertical", "dental-finding"),
  orthoRotation: unsupported("orthoRotation", "dental-finding"),
  brokenMesial: unsupported("brokenMesial", "dental-finding"),
  brokenIncisal: unsupported("brokenIncisal", "dental-finding"),
  brokenDistal: unsupported("brokenDistal", "dental-finding"),
  extractionWound: unsupported("extractionWound", "dental-finding"),
  extractionPlan: unsupported("extractionPlan", "dental-finding"),
  parapulpalPin: unsupported("parapulpalPin", "dental-finding"),
  crownReplace: unsupported("crownReplace", "dental-finding"),
  crownNeeded: unsupported("crownNeeded", "dental-finding"),
  missingClosed: unsupported("missingClosed", "dental-finding"),
  bridgePillar: unsupported("bridgePillar", "dental-finding"),
  mobility: unsupported("mobility", "periodontal-observation"),
  pulpDx: unsupported("pulpDx", "dental-finding"),
  pulpLatin: unsupported("pulpLatin", "dental-finding"),
  cervicalSurfaces: unsupported("cervicalSurfaces", "dental-finding"),
  retention: unsupported("retention", "dental-finding"),
  retentionSide: unsupported("retentionSide", "dental-finding"),
  fillingSurfaceMaterials: unsupported("fillingSurfaceMaterials", "odontogram-observation"),
  customStates: unsupported("customStates"),

  cariesActiveDepth: derived("cariesActiveDepth"),
  fillingMaterial: derived("fillingMaterial"),
  cariesDepths: legacy("cariesDepths"),
  secondaryCaries: legacy("secondaryCaries"),
} satisfies Record<keyof ToothRecord, DentalDeImportManifestEntry>;

export const DENTAL_DE_IMPORT_MANIFEST: readonly DentalDeImportManifestEntry[] =
  Object.values(MANIFEST_BY_FIELD);
