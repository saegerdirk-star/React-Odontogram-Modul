// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
//
// Bead odontogram-dma: what holds a removable denture to a natural tooth.
//
// A removable denture could be charted, but nothing that HOLDS it: a natural
// abutment tooth was offered an empty prosthesis list, and clasp, attachment
// and bar appeared nowhere in the repository. So a combined fixed-removable
// case was half-chartable — the telescopic crown on the abutment yes, the
// partial denture at the gap yes, but not that the two belong together.
//
// Dirk's structure (2026-08-11), which is three anchorings rather than one
// axis, and its correction the same day:
//
//   Klammer    any present tooth — crowned or not; a crown is neither
//              required nor a bar to it
//   Geschiebe  requires a crown, because it is built into one
//   Steg       between crowned teeth
//
// Only the attachment and the bar are gated on a restoration; the clasp is
// gated on the tooth being there.
//
// This module is DOM-free on purpose, like `bridgeOverlay.ts` — it is the
// derivation, and the renderer and the tests both call it.

/** What holds the denture to this tooth. ONE value, never a set. */
export type RetentionValue = "none" | "clasp" | "attachment" | "bar-abutment";

/** The side the element engages, as charly records it (`<Kl` / `Kl>`). */
export type RetentionSide = "none" | "mesial" | "distal" | "both";

/** The shape this module needs off a tooth's state. */
export interface RetentionStateLike {
  toothSelection?: string;
  restorationType?: string;
  restorationMaterial?: string;
  retention?: string;
}

/** Reads a tooth's state by FDI number; `undefined` for a tooth never charted. */
export type GetRetentionState = (toothNo: number) => RetentionStateLike | undefined;

/** A present NATURAL tooth. An implant carries its retention on the existing
 *  `prosthesis` axis (locator / bar / bar-denture), which is why it is absent
 *  here — one question, one place to answer it. */
function isPresentNatural(state: RetentionStateLike | undefined): boolean {
  const sel = state?.toothSelection;
  return sel === "tooth-base" || sel === "milktooth";
}

/** Whether the tooth carries a crown an element could be built into. A bridge
 *  pillar counts: it is crowned, whatever else the bridge is doing. */
function isCrowned(state: RetentionStateLike | undefined): boolean {
  const r = state?.restorationType;
  return r === "crown" || r === "bridge";
}

/**
 * The retention elements this tooth can actually carry, in picker order.
 *
 * `none` is always offered; the rest follow the three anchorings above. The
 * list is what the UI shows AND what the setter validates against, so a
 * control can never offer something the setter would silently drop.
 */
export function retentionOptions(state: RetentionStateLike | undefined): RetentionValue[] {
  if(!isPresentNatural(state)) return ["none"];
  const out: RetentionValue[] = ["none", "clasp"];
  if(isCrowned(state)) out.push("attachment", "bar-abutment");
  return out;
}

/** Whether `value` may be stored on a tooth in `state`. */
export function retentionAllowed(state: RetentionStateLike | undefined, value: string): boolean {
  return retentionOptions(state).includes(value as RetentionValue);
}

/**
 * A telescopic crown IS a retention element, clinically — an inner crown
 * inside an outer one, and the denture holds on it. It stays a crown MATERIAL
 * in the model, which is what it is and what already draws as a double
 * contour; this is the one place that recognises it when the summary or an
 * export asks.
 *
 * It also keeps Dirk's exclusion rule true without a special case: a telescope
 * abutment carries no clasp because its retention IS the crown.
 */
export function isTelescopeRetention(state: RetentionStateLike | undefined): boolean {
  return isCrowned(state) && state?.restorationMaterial === "telescope";
}

/** Whether the tooth holds a denture at all, by element or by telescope. */
export function hasRetention(state: RetentionStateLike | undefined): boolean {
  const r = state?.retention;
  return (!!r && r !== "none" && retentionAllowed(state, r)) || isTelescopeRetention(state);
}

/**
 * Derive the bar (Steg) spans from per-tooth state — never stored, exactly as
 * `detectBridgeSpans` derives a bridge run.
 *
 * It differs from a bridge span in ONE way, and the difference is anatomical
 * rather than stylistic: a bridge is continuous, so its span is a run of
 * ADJACENT bridge teeth. A bar crosses the edentulous space it exists to span,
 * so its abutments are almost never adjacent — requiring adjacency would break
 * every real bar into nothing. Within an arch the abutments are therefore
 * taken in arch order and connected from the first to the last, whatever is
 * (or is not) between them.
 *
 * Documented limitation, the same one `detectBridgeSpans` carries and for the
 * same reason: two separate bars in one arch merge into a single run, because
 * state carries no per-bar grouping id. A bar per arch is the norm; a second
 * one would need a grouping id and that is a bigger change than this bead.
 *
 * @param arches - Tooth numbers per arch, in arch order.
 * @returns One array of abutment numbers per arch that has at least two.
 */
export function detectBarSpans(arches: number[][], getState: GetRetentionState): number[][] {
  const spans: number[][] = [];
  for(const arch of arches){
    const abutments = arch.filter((tn) => {
      const s = getState(tn);
      return s?.retention === "bar-abutment" && retentionAllowed(s, "bar-abutment");
    });
    if(abutments.length >= 2) spans.push(abutments);
  }
  return spans;
}

/** charly's own shorthand, so the chart reads the way Dirk's records do:
 *  `<Kl` engages mesially, `Kl>` distally, `<Kl>` both. */
const RETENTION_MARK: Record<string, string> = {
  clasp: "Kl", attachment: "G", "bar-abutment": "St",
};

/**
 * The tile marker for a tooth's retention element — charly's notation, with
 * the engaged side as the chevrons around it. Returns `""` when the tooth
 * carries no element (or one its own state does not allow).
 */
export function retentionMark(state: RetentionStateLike | undefined, side: string): string {
  const value = state?.retention;
  if(!value || value === "none" || !retentionAllowed(state, value)) return "";
  const mark = RETENTION_MARK[value];
  if(!mark) return "";
  if(side === "mesial") return `<${mark}`;
  if(side === "distal") return `${mark}>`;
  if(side === "both") return `<${mark}>`;
  return mark;
}
