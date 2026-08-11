/**
 * FHIR-independent document contract owned by the odontogram editor.
 * Optional adapters translate this shape at their own boundary.
 */
export interface ToothRecord {
  toothSelection?: string; endoResection?: boolean; mods?: string[]; periapicalType?: string; endo?: string;
  caries?: string[]; cariesActiveDepth?: number; cariesSeverity?: Record<string, number>; cariesDepths?: Record<string, number>;
  calculus?: boolean; fillingMaterial?: string; fillingSurfaces?: string[]; fillingSurfaceMaterials?: Record<string, string>;
  fissureSealing?: boolean; contactMesial?: boolean; contactDistal?: boolean; wearEdge?: string; wearCervical?: string;
  discoloration?: string; periImplant?: string; cejVisibility?: string; rootConcavity?: string;
  gingivalThickness?: string; millerClass?: string; orthoAppliance?: string; orthoDrift?: string; orthoVertical?: string; orthoRotation?: boolean;
  brokenMesial?: boolean; brokenIncisal?: boolean; brokenDistal?: boolean; extractionWound?: boolean; extractionPlan?: boolean;
  parapulpalPin?: boolean; crownReplace?: boolean; crownNeeded?: boolean; missingClosed?: boolean; bridgePillar?: boolean;
  prosthesis?: string; mobility?: string; toothSubstrate?: string; restorationType?: string; restorationMaterial?: string; crownLeakage?: boolean;
  pulpDx?: string; pulpLatin?: string; apicalDx?: string; resorptionType?: string; rootCaries?: string;
  secondaryCaries?: Record<string, number>; radiographicDepth?: Record<string, string>; fillingDefect?: Record<string, string>;
  perio?: { pd: Record<string, number>; gm: Record<string, number>; bop: string[]; sup: string[] };
  furcation?: Record<string, number>; plaque?: string[]; pi?: Record<string, number>; gi?: Record<string, number>;
  kg?: number; mpi?: Record<string, number>; mbi?: Record<string, number>; customStates?: Record<string, unknown>; note?: string;
}

export interface ExaminationContextRecord {
  id?: string; subject?: string; effectiveDateTime?: string; performer?: string; recorder?: string; encounter?: string; previousExaminationId?: string;
}

export interface ExaminationSnapshotRecord {
  examination: ExaminationContextRecord;
  globals: Record<string, boolean>;
  teeth: Record<string, ToothRecord>;
  case?: OdontogramExportPayload["case"];
}

export interface OdontogramExportPayload {
  version: string;
  globals?: Record<string, boolean>;
  teeth: Record<string, ToothRecord>;
  plan?: Record<string, ToothRecord>;
  case?: { age?: number; smokingStatus?: string; cigarettesPerDay?: number; diabetesStatus?: string; hba1c?: number; toothLossPerio?: number; maxRblPercent?: number; diagnosisOverride?: string; stageOverride?: string; gradeOverride?: string; extentOverride?: string; patientName?: string; patientDob?: string; examDate?: string };
  examination?: ExaminationContextRecord;
  examinations?: ExaminationSnapshotRecord[];
}

export type OdontogramDocument = OdontogramExportPayload;
export const PAYLOAD_VERSION = "2.22";
