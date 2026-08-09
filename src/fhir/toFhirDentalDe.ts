// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
//
// Canonical `fhir-dental-de` emitter (bead odontogram-3l1, AC3).
//
// Produces `OdontogramObservationDE`, `CariesObservationDE` and `DentalFindingDE`
// resources for the editor concepts the IG covers, following its field-level
// alignment matrix:
//
//   - "standard reuse" / "existing IG capability" -> a coded value, but ONLY
//     when the concept's identity is provable from the IG's own artifacts
//     (see `dentalDeCodesystems.ts`);
//   - "additive IG gap" -> `CodeableConcept.text` under the extensible binding,
//     which is the pattern the IG publishes and enforces;
//   - required bindings with no matching concept -> nothing is emitted and the
//     value is reported, because coercion would assert something false.
//
// PURE: no DOM, no network, no wall clock, no randomness. Identical input
// always yields byte-identical output.

import type {
  Bundle, Observation, Patient, CodeableConcept, Coding,
  OdontogramExportPayload, ToothRecord, FhirExportOptions,
  DentalDeConversionEntry, DentalDeConversionReport,
} from "./types";
import { LOCAL_VALUE_MAPS } from "./codesystems";
import { EXAM_CATEGORY, PLACEHOLDER_PATIENT_ID, PLACEHOLDER_PATIENT_FULLURL } from "./primitives";
import {
  DENTAL_DE_ODONTOGRAM_PROFILE, DENTAL_DE_CARIES_PROFILE, DENTAL_DE_FINDING_PROFILE,
  DENTAL_DE_COMPONENT_SYSTEM, DENTAL_DE_ASSESSMENT_SYSTEM, DENTAL_DE_CATEGORY_SYSTEM,
  DENTAL_DE_FDI_SYSTEM, DENTAL_DE_ICDAS_SYSTEM,
  DENTAL_DE_RESTORATION_TYPE_SYSTEM, DENTAL_DE_MATERIAL_SYSTEM,
  TOOTH_SURFACES_EXT_URL, FDI_SURFACE_SYSTEM, SNOMED_SYSTEM,
  ODONTO_COMPONENT, VERIFIED_SCT, FINDING_TEXT,
  toFdiSurface, restorationTypeCode, restorationMaterialCode,
  rootCariesSct, resorptionSct, apicalDxSct, restorationStatusSct,
} from "./dentalDeCodesystems";

// The `fhir/r4` component/extension types do not model the R4 `component.extension`
// slot the IG uses, so component nodes are assembled structurally.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

interface SurfaceExtension {
  url: string;
  valueCodeableConcept: CodeableConcept;
}

/** English display for an engine enum value; falls back to the raw value. */
function display(group: string, value: string): string {
  return LOCAL_VALUE_MAPS[group]?.[value]?.display ?? value;
}

function sct(code: string, text: string): CodeableConcept {
  const coding: Coding[] = [{ system: SNOMED_SYSTEM, code }];
  return { coding, text };
}

function textOnly(text: string): CodeableConcept {
  return { text };
}

function componentCode(code: string): CodeableConcept {
  return { coding: [{ system: DENTAL_DE_COMPONENT_SYSTEM, code }] };
}

function surfaceExtensions(surfaces: string[], fdi: string): SurfaceExtension[] {
  const out: SurfaceExtension[] = [];
  for (const surface of surfaces) {
    const code = toFdiSurface(surface, fdi);
    if (!code) continue;
    out.push({
      url: TOOTH_SURFACES_EXT_URL,
      valueCodeableConcept: { coding: [{ system: FDI_SURFACE_SYSTEM, code }] },
    });
  }
  return out;
}

const DENTAL_CATEGORY: CodeableConcept[] = [
  { coding: [{ system: DENTAL_DE_CATEGORY_SYSTEM, code: "dental", display: "Dental" }] },
  ...EXAM_CATEGORY,
];

function toothBodySite(fdi: string, surfaces: SurfaceExtension[] = []): CodeableConcept {
  const cc: Any = { coding: [{ system: DENTAL_DE_FDI_SYSTEM, code: fdi, display: fdi }] };
  if (surfaces.length) cc.extension = surfaces;
  return cc as CodeableConcept;
}

interface BuildContext {
  subjectRef: string;
  effective?: string;
  report: DentalDeConversionReport;
}

function reportText(ctx: BuildContext, entry: DentalDeConversionEntry): void {
  ctx.report.textFallback.push(entry);
}
function reportUnmapped(ctx: BuildContext, entry: DentalDeConversionEntry): void {
  ctx.report.unmapped.push(entry);
}

function baseCanonicalObservation(ctx: BuildContext, profile: string, code: CodeableConcept): Observation {
  const obs: Any = {
    resourceType: "Observation",
    meta: { profile: [profile] },
    status: "final",
    category: DENTAL_CATEGORY,
    code,
    subject: { reference: ctx.subjectRef },
  };
  if (ctx.effective) obs.effectiveDateTime = ctx.effective;
  return obs as Observation;
}

function assessmentCode(code: string): CodeableConcept {
  return { coding: [{ system: DENTAL_DE_ASSESSMENT_SYSTEM, code }] };
}

// ---------------------------------------------------------------------------
// OdontogramObservationDE
// ---------------------------------------------------------------------------

/** `component[toothPresence]` — 0..1, extensible binding. */
function presenceComponent(ctx: BuildContext, fdi: string, rec: ToothRecord): Any | undefined {
  const selection = rec.toothSelection ?? "";
  const substrate = rec.toothSubstrate ?? "";
  const value = (): CodeableConcept | undefined => {
    if (substrate === "radix") return sct(VERIFIED_SCT.rootRemnant, FINDING_TEXT.rootRemnant);
    switch (selection) {
      case "tooth-base":
      case "milktooth":
        return sct(VERIFIED_SCT.toothPresent, display("toothSelection", selection));
      case "none":
        return sct(VERIFIED_SCT.toothAbsent, FINDING_TEXT.toothAbsent);
      case "no-tooth-after-extraction":
        return sct(VERIFIED_SCT.toothAbsent, FINDING_TEXT.missingAfterExtraction);
      case "implant":
        // The IG models an implant as a Device (`DentalImplantDE`) with the
        // findings referring to it, not as a presence value. Emitting a coded
        // presence here would assert a tooth state the source never made.
        reportText(ctx, {
          tooth: fdi, field: "toothSelection", value: selection,
          reason: "Implant identity is a DentalImplantDE Device in the IG; the position state is preserved as text.",
        });
        return textOnly(FINDING_TEXT.implantPresent);
      case "tooth-under-gum":
        reportText(ctx, {
          tooth: fdi, field: "toothSelection", value: selection,
          reason: "No eruption/retention SNOMED concept in ToothPresenceStateVS is identifiable from the published IG artifacts.",
        });
        return textOnly(FINDING_TEXT.toothUnderGum);
      default:
        return undefined;
    }
  };
  const cc = value();
  if (!cc) return undefined;
  return { code: componentCode(ODONTO_COMPONENT.toothPresence), valueCodeableConcept: cc };
}

/** `component[rootEndodonticState]` — 0..*, extensible binding. */
function rootEndodonticComponents(ctx: BuildContext, fdi: string, rec: ToothRecord): Any[] {
  const out: Any[] = [];
  const push = (cc: CodeableConcept) =>
    out.push({ code: componentCode(ODONTO_COMPONENT.rootEndodonticState), valueCodeableConcept: cc });

  const endo = rec.endo ?? "none";
  if (endo && endo !== "none") {
    if (endo === "endo-filling") {
      push(sct(VERIFIED_SCT.rootCanalFillingComplete, FINDING_TEXT.rootFillingComplete));
    } else {
      reportText(ctx, {
        tooth: fdi, field: "endo", value: endo,
        reason: "No exact admitted concept for this endodontic state; the source assessment is retained as text.",
      });
      push(textOnly(
        endo === "endo-filling-incomplete"
          ? FINDING_TEXT.rootFillingIncomplete
          : display("endo", endo),
      ));
    }
  }

  // Bead odontogram-chz: root caries, resorption and apical periodontitis are
  // admitted by RootEndodonticStateVS and their meanings are verified in
  // `SCT_PROVENANCE`, so they carry a coding. The graded/subtyped source value
  // always stays in `.text`, which keeps the read-back exact.
  const rootCaries = rec.rootCaries ?? "none";
  if (rootCaries && rootCaries !== "none") {
    const code = rootCariesSct(rootCaries);
    if (code) {
      push(sct(code, display("rootCaries", rootCaries)));
    } else {
      reportText(ctx, {
        tooth: fdi, field: "rootCaries", value: rootCaries,
        reason: "This root-caries value is not one this build verified against RootEndodonticStateVS; the source value is retained as text.",
      });
      push(textOnly(display("rootCaries", rootCaries)));
    }
  }

  const resorption = rec.resorptionType ?? "none";
  if (resorption && resorption !== "none") {
    const code = resorptionSct(resorption);
    if (code) {
      push(sct(code, display("resorptionType", resorption)));
    } else {
      reportText(ctx, {
        tooth: fdi, field: "resorptionType", value: resorption,
        reason: "RootEndodonticStateVS admits no concept this resorption value entails; the source value is retained as text.",
      });
      push(textOnly(display("resorptionType", resorption)));
    }
  }

  const apical = rec.apicalDx ?? "normal";
  if (apical && apical !== "normal") {
    const code = apicalDxSct(apical);
    if (code) {
      // The IG's contract check forbids coding a raw radiographic finding as a
      // diagnosed apical periodontitis. `apicalDx` IS the chart's apical
      // diagnosis, so coding it upgrades nothing; only the two values SNOMED
      // places under the admitted concept are coded.
      push(sct(code, display("apicalDx", apical)));
    } else {
      reportText(ctx, {
        tooth: fdi, field: "apicalDx", value: apical,
        reason: "An apical abscess or condensing osteitis is not subsumed by the admitted apical-periodontitis concept; the observed chart value is retained as text.",
      });
      push(textOnly(display("apicalDx", apical)));
    }
  }

  const periapical = rec.periapicalType ?? "none";
  if (periapical && periapical !== "none") {
    reportText(ctx, {
      tooth: fdi, field: "periapicalType", value: periapical,
      reason: "Periapical lesion subtype qualifies a diagnosis (DentalConditionDE); the observed value is retained as text.",
    });
    push(textOnly(display("periapicalType", periapical)));
  }

  return out;
}

/** Indirect restoration: type + material components, surface-qualified. */
function restorationComponents(ctx: BuildContext, fdi: string, rec: ToothRecord): Any[] {
  const out: Any[] = [];
  const restorationType = rec.restorationType ?? "none";
  if (!restorationType || restorationType === "none") return out;

  const surfaces = Array.isArray(rec.fillingSurfaces)
    ? rec.fillingSurfaces.filter((s): s is string => typeof s === "string")
    : [];
  const ext = surfaceExtensions(surfaces, fdi);

  const typeCode = restorationTypeCode(restorationType, rec.toothSelection);
  if (typeCode) {
    const comp: Any = {
      code: componentCode(ODONTO_COMPONENT.restorationType),
      valueCodeableConcept: {
        coding: [{ system: DENTAL_DE_RESTORATION_TYPE_SYSTEM, code: typeCode }],
        text: display("restorationType", restorationType),
      },
    };
    if (ext.length) comp.extension = ext;
    out.push(comp);
  } else {
    reportUnmapped(ctx, {
      tooth: fdi, field: "restorationType", value: restorationType,
      reason: "RestorationTypeVS has a required binding and contains no matching concept; the value stays in the UI-domain document.",
    });
  }

  const material = rec.restorationMaterial ?? "none";
  if (material && material !== "none") {
    const materialCode = restorationMaterialCode(material);
    if (materialCode) {
      const comp: Any = {
        code: componentCode(ODONTO_COMPONENT.restorationMaterial),
        valueCodeableConcept: {
          coding: [{ system: DENTAL_DE_MATERIAL_SYSTEM, code: materialCode }],
          text: display("restorationMaterial", material),
        },
      };
      if (ext.length) comp.extension = ext;
      out.push(comp);
    } else {
      reportUnmapped(ctx, {
        tooth: fdi, field: "restorationMaterial", value: material,
        reason: "DentalMaterialVS has a required binding and contains no matching concept; the value stays in the UI-domain document.",
      });
    }
  }

  return out;
}

/** `component[restorationStatus]` — 0..*, extensible: leakage and defects. */
function restorationStatusComponents(ctx: BuildContext, fdi: string, rec: ToothRecord): Any[] {
  const out: Any[] = [];
  const restorationType = rec.restorationType ?? "none";

  // Bead odontogram-chz: every integrity finding below is a defective dental
  // restoration, the concept `RestorationStatusVS` admits as the common
  // ancestor of leakage, overhang/deficient margin, fracture and wear. The
  // exact finding stays in `.text` — see `restorationStatusSct`.
  if (rec.crownLeakage === true && (restorationType === "crown" || restorationType === "bridge")) {
    out.push({
      code: componentCode(ODONTO_COMPONENT.restorationStatus),
      valueCodeableConcept: sct(restorationStatusSct(), FINDING_TEXT.marginalLeakage),
    });
  }

  const defects = rec.fillingDefect;
  if (defects && typeof defects === "object") {
    for (const [surface, value] of Object.entries(defects)) {
      if (typeof value !== "string" || !value || value === "none") continue;
      const ext = surfaceExtensions([surface], fdi);
      const comp: Any = {
        code: componentCode(ODONTO_COMPONENT.restorationStatus),
        valueCodeableConcept: sct(restorationStatusSct(), display("fillingDefect", value)),
      };
      if (ext.length) comp.extension = ext;
      out.push(comp);
    }
  }

  return out;
}

/** `component[prostheticState]` — 0..*, extensible. */
function prostheticComponents(ctx: BuildContext, fdi: string, rec: ToothRecord): Any[] {
  const prosthesis = rec.prosthesis ?? "none";
  if (!prosthesis || prosthesis === "none") return [];
  reportText(ctx, {
    tooth: fdi, field: "prosthesis", value: prosthesis,
    reason: "Prosthesis identity is a DentalProsthesisDE/ImplantSuprastructureDE Device in the IG; the observed position state is retained as text.",
  });
  return [{
    code: componentCode(ODONTO_COMPONENT.prostheticState),
    valueCodeableConcept: textOnly(display("prosthesis", prosthesis)),
  }];
}

// ---------------------------------------------------------------------------
// CariesObservationDE and DentalFindingDE
// ---------------------------------------------------------------------------

/** Surfaces carrying a filling — their caries severity is a CARS recurrent
 *  score, which `ICDASCariesScoreCS` explicitly scopes out. */
function filledSurfaces(rec: ToothRecord): Set<string> {
  const out = new Set<string>();
  const fsm = rec.fillingSurfaceMaterials;
  if (fsm && typeof fsm === "object") {
    for (const [surface, material] of Object.entries(fsm)) {
      if (typeof material === "string" && material && material !== "none") out.add(surface);
    }
  }
  return out;
}

function cariesObservations(ctx: BuildContext, fdi: string, rec: ToothRecord): Observation[] {
  const surfaces = Array.isArray(rec.caries)
    ? rec.caries.filter((v): v is string => typeof v === "string")
    : [];
  if (surfaces.length === 0) return [];

  const severity = (rec.cariesSeverity && typeof rec.cariesSeverity === "object")
    ? rec.cariesSeverity
    : {};
  const filled = filledSurfaces(rec);
  const out: Observation[] = [];

  for (const raw of surfaces) {
    const surface = raw.replace(/^caries-/, "");
    const score = severity[surface];

    if (surface === "subcrown") {
      // No FDI-surface counterpart; routed to a DentalFindingDE below.
      continue;
    }
    if (filled.has(surface)) {
      // Recurrent caries: routed to a DentalFindingDE below.
      continue;
    }
    const fdiSurface = toFdiSurface(surface, fdi);
    if (!fdiSurface) {
      reportUnmapped(ctx, {
        tooth: fdi, field: "caries", value: surface,
        reason: "No HL7 FDI-surface code corresponds to this engine surface key.",
      });
      continue;
    }
    if (typeof score !== "number") {
      reportText(ctx, {
        tooth: fdi, field: "caries", value: surface,
        reason: "CariesObservationDE requires an ICDAS score; the unscored surface is retained as a text finding.",
      });
      const finding = baseCanonicalObservation(ctx, DENTAL_DE_FINDING_PROFILE, textOnly(FINDING_TEXT.coronalCaries));
      (finding as Any).bodySite = toothBodySite(fdi, surfaceExtensions([surface], fdi));
      (finding as Any).valueCodeableConcept = textOnly(FINDING_TEXT.unscoredCaries);
      out.push(finding);
      continue;
    }
    const obs = baseCanonicalObservation(
      ctx, DENTAL_DE_CARIES_PROFILE, assessmentCode("icdas-caries-assessment"),
    );
    (obs as Any).bodySite = toothBodySite(fdi, surfaceExtensions([surface], fdi));
    (obs as Any).valueCodeableConcept = {
      coding: [{ system: DENTAL_DE_ICDAS_SYSTEM, code: String(score) }],
    };
    out.push(obs);
  }
  return out;
}

/** Findings the odontogram profile has no slice for, per the IG matrix:
 *  recurrent (CARS) caries, subcrown caries and radiographic caries depth. */
function extraFindings(ctx: BuildContext, fdi: string, rec: ToothRecord): Observation[] {
  const out: Observation[] = [];
  const severity = (rec.cariesSeverity && typeof rec.cariesSeverity === "object")
    ? rec.cariesSeverity
    : {};
  const surfaces = Array.isArray(rec.caries)
    ? rec.caries.filter((v): v is string => typeof v === "string").map((v) => v.replace(/^caries-/, ""))
    : [];
  const filled = filledSurfaces(rec);

  const finding = (codeText: string, valueText: string, surface?: string): Observation => {
    const obs = baseCanonicalObservation(ctx, DENTAL_DE_FINDING_PROFILE, textOnly(codeText));
    (obs as Any).bodySite = toothBodySite(fdi, surface ? surfaceExtensions([surface], fdi) : []);
    (obs as Any).valueCodeableConcept = textOnly(valueText);
    return obs;
  };

  for (const surface of surfaces) {
    if (surface === "subcrown") {
      const score = severity[surface];
      reportText(ctx, {
        tooth: fdi, field: "caries", value: surface,
        reason: "Subcrown caries has no HL7 FDI-surface code; emitted as a DentalFindingDE text finding.",
      });
      out.push(finding(
        FINDING_TEXT.subcrownCaries,
        typeof score === "number" ? `${FINDING_TEXT.severityScorePrefix}${score}` : "Present",
      ));
      continue;
    }
    if (filled.has(surface)) {
      const score = severity[surface];
      reportText(ctx, {
        tooth: fdi, field: "cariesSeverity", value: `${surface}:${score ?? "unscored"}`,
        reason: "Recurrent caries on a restored surface is not an ICDAS value (ICDASCariesScoreCS scopes restoration status out); emitted as a DentalFindingDE text finding.",
      });
      out.push(finding(
        FINDING_TEXT.recurrentCaries,
        typeof score === "number" ? `${FINDING_TEXT.carsScorePrefix}${score}` : "Present",
        surface,
      ));
    }
  }

  const radiographic = rec.radiographicDepth;
  if (radiographic && typeof radiographic === "object") {
    for (const [surface, value] of Object.entries(radiographic)) {
      if (typeof value !== "string" || !value || value === "none") continue;
      reportText(ctx, {
        tooth: fdi, field: "radiographicDepth", value: `${surface}:${value}`,
        reason: "The IG carries radiographic caries depth on DentalFindingDE with an EXTERNAL finding code the editor does not hold; the source grade is retained as text and never mislabelled as ICDAS.",
      });
      out.push(finding(
        FINDING_TEXT.radiographicDepth,
        display("radiographicDepth", value),
        surface,
      ));
    }
  }

  return out;
}

/** Axes the editor holds that this adapter does not project into the canonical
 *  bundle at all. Reported so a consumer sees the boundary explicitly. */
const UNPROJECTED_AXES: Array<[keyof ToothRecord, string, string]> = [
  ["pulpDx", "normal", "Pulp diagnosis is a PulpSensibilityObservationDE/DentalConditionDE in the IG, outside the odontogram profile."],
  ["pulpLatin", "none", "Latin pulp subtype has no IG counterpart; preserved in the UI-domain document."],
  ["periImplant", "none", "Peri-implant status is a PeriImplantObservationDE focused on a DentalImplantDE Device."],
  ["wearEdge", "none", "Tooth wear is a DentalFindingDE with external terminology the editor does not hold."],
  ["wearCervical", "none", "Tooth wear is a DentalFindingDE with external terminology the editor does not hold."],
  ["discoloration", "none", "Discoloration is a DentalFindingDE with external terminology the editor does not hold."],
  ["mobility", "none", "Tooth mobility is a periodontal finding carried by PeriodontalObservationDE."],
  ["orthoAppliance", "none", "Orthodontic appliances are carried by care plans and Devices in the IG."],
  ["orthoDrift", "none", "Orthodontic position findings are carried by external terminology in the IG."],
  ["orthoVertical", "none", "Orthodontic position findings are carried by external terminology in the IG."],
];

function reportUnprojected(ctx: BuildContext, fdi: string, rec: ToothRecord): void {
  for (const [field, skip, reason] of UNPROJECTED_AXES) {
    const value = rec[field];
    if (typeof value !== "string" || !value || value === skip) continue;
    reportUnmapped(ctx, { tooth: fdi, field: String(field), value, reason });
  }
  if (rec.perio || rec.furcation || rec.plaque || rec.pi || rec.gi || rec.mpi || rec.mbi || typeof rec.kg === "number") {
    reportUnmapped(ctx, {
      tooth: fdi, field: "perio", value: "charted",
      reason: "Periodontal measurements belong to PeriodontalObservationDE/PeriImplantObservationDE; use the legacy dialect's periodontal panel until that surface is canonicalized.",
    });
  }
  const fsm = rec.fillingSurfaceMaterials;
  if (fsm && typeof fsm === "object") {
    for (const [surface, material] of Object.entries(fsm)) {
      if (typeof material !== "string" || !material || material === "none") continue;
      reportUnmapped(ctx, {
        tooth: fdi, field: "fillingSurfaceMaterials", value: `${surface}:${material}`,
        reason: "DentalMaterialCS covers laboratory work only; direct filling materials have no concept under its required binding.",
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert a UI-domain document into a canonical `fhir-dental-de` collection
 * Bundle, together with a report of everything the IG gives no coded value for.
 *
 * Pure and tolerant: malformed input yields an empty bundle rather than a throw.
 */
export function buildDentalDeBundle(
  payload: OdontogramExportPayload,
  options: FhirExportOptions = {},
): { bundle: Bundle; report: DentalDeConversionReport } {
  const report: DentalDeConversionReport = { textFallback: [], unmapped: [] };
  const teeth = payload && typeof payload === "object" && payload.teeth && typeof payload.teeth === "object"
    ? payload.teeth
    : {};
  const subjectRef = options.subject ?? PLACEHOLDER_PATIENT_FULLURL;
  // Bead odontogram-2vd: the examination's own effective time is the most
  // specific answer to "when was this observed", so it outranks the report
  // header's `case.examDate` — which predates it and stays the fallback, so
  // every existing document keeps exporting exactly the date it did before.
  const effective = options.effectiveDateTime
    ?? payload?.examination?.effectiveDateTime
    ?? payload?.case?.examDate;
  const ctx: BuildContext = { subjectRef, effective, report };

  const entries: Bundle["entry"] = [];
  if (!options.subject) {
    const patient: Patient = { resourceType: "Patient", id: PLACEHOLDER_PATIENT_ID };
    entries.push({ fullUrl: PLACEHOLDER_PATIENT_FULLURL, resource: patient });
  }
  if (!effective) {
    reportUnmapped(ctx, {
      tooth: "*", field: "effectiveDateTime", value: "",
      reason: "DentalFindingDE requires Observation.effective[x]; supply FhirExportOptions.effectiveDateTime, examination.effectiveDateTime or case.examDate to make the bundle profile-conformant.",
    });
  }

  for (const [fdi, recRaw] of Object.entries(teeth)) {
    const rec = (recRaw && typeof recRaw === "object" ? recRaw : {}) as ToothRecord;

    const components: Any[] = [];
    const presence = presenceComponent(ctx, fdi, rec);
    if (presence) components.push(presence);
    components.push(...rootEndodonticComponents(ctx, fdi, rec));
    components.push(...restorationComponents(ctx, fdi, rec));
    components.push(...restorationStatusComponents(ctx, fdi, rec));
    components.push(...prostheticComponents(ctx, fdi, rec));

    // `odonto-1`: an odontogram observation must carry at least one component.
    if (components.length > 0) {
      const obs = baseCanonicalObservation(
        ctx, DENTAL_DE_ODONTOGRAM_PROFILE, assessmentCode("odontogram-assessment"),
      );
      (obs as Any).bodySite = toothBodySite(fdi);
      (obs as Any).component = components;
      entries.push({ resource: obs });
    }

    for (const obs of cariesObservations(ctx, fdi, rec)) entries.push({ resource: obs });
    for (const obs of extraFindings(ctx, fdi, rec)) entries.push({ resource: obs });

    if (typeof rec.note === "string" && rec.note.trim().length > 0) {
      const obs = baseCanonicalObservation(ctx, DENTAL_DE_FINDING_PROFILE, textOnly(FINDING_TEXT.clinicianNote));
      (obs as Any).bodySite = toothBodySite(fdi);
      (obs as Any).note = [{ text: rec.note }];
      entries.push({ resource: obs });
    }

    reportUnprojected(ctx, fdi, rec);
  }

  return { bundle: { resourceType: "Bundle", type: "collection", entry: entries }, report };
}
