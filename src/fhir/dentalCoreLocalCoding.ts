// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul

/**
 * Engine-owned codes carried inside admitted Dental Core profiles where the
 * released IG deliberately leaves the code open. This is not an alternate
 * FHIR representation or a public canonical catalogue.
 */
export const DENTAL_CORE_LOCAL_SYSTEM =
  "https://github.com/ZoliQua/React-Odontogram-Modul/fhir/CodeSystem/odontogram";

const LOINC_SYSTEM = "http://loinc.org";
type SmokingStatusValue = "never" | "former" | "current";

const SMOKING_ANSWER_CODES: Record<string, SmokingStatusValue> = {
  "LA18978-9": "never",
  "LA15920-4": "former",
  "LA18976-3": "current",
  "LA18977-1": "current",
  "LA18981-3": "current",
  "LA18982-1": "current",
};

const LOCAL_SMOKING_VALUES: readonly SmokingStatusValue[] = ["never", "former", "current"];

const smokingValue = (value: unknown): SmokingStatusValue | undefined =>
  LOCAL_SMOKING_VALUES.find((candidate) => candidate === value);

const answerValue = (code: string): SmokingStatusValue | undefined =>
  Object.prototype.hasOwnProperty.call(SMOKING_ANSWER_CODES, code)
    ? smokingValue(SMOKING_ANSWER_CODES[code])
    : undefined;

/** Resolve the host-owned smoking Observation without consulting display text. */
export function resolveSmokingStatus(concept: unknown): SmokingStatusValue | undefined {
  const coding = (concept as { coding?: Array<{ system?: string; code?: string }> } | undefined)?.coding;
  if (!Array.isArray(coding)) return undefined;
  let resolved: SmokingStatusValue | undefined;
  for (const item of coding) {
    const value = item?.system === DENTAL_CORE_LOCAL_SYSTEM
      ? smokingValue(item.code)
      : item?.system === LOINC_SYSTEM && item.code
        ? answerValue(item.code)
        : undefined;
    if (!value) continue;
    if (resolved && resolved !== value) return undefined;
    resolved = value;
  }
  return resolved;
}
