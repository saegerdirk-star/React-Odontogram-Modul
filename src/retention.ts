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
  /** An implant records a bar here, not on `retention` — see `isBarAbutment`. */
  prosthesis?: string;
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
    const abutments = arch.filter((tn) => isBarAbutment(getState(tn)));
    if(abutments.length >= 2) spans.push(abutments);
  }
  return spans;
}

/**
 * Whether this tooth holds a bar — by EITHER route.
 *
 * A natural abutment records it on `retention`; an implant records it on the
 * `prosthesis` axis it already had (`bar` / `bar-denture`), and that stays the
 * right place for an implant. But one bar can rest on both — Dirk confirms
 * implant and natural abutments occur mixed in one case (2026-08-11) — and a
 * bar that only saw half its abutments would be drawn short, or not at all.
 *
 * So the DERIVATION reads both, while neither axis gains a value the other
 * already owns: one clinical bar, one drawn element, each tooth kind still
 * answering where it answered before.
 */
export function isBarAbutment(state: RetentionStateLike | undefined): boolean {
  if(state?.retention === "bar-abutment" && retentionAllowed(state, "bar-abutment")) return true;
  const p = state?.prosthesis;
  return state?.toothSelection === "implant" && (p === "bar" || p === "bar-denture");
}

/** charly's own shorthand, read off its finding keypad (screenshot, Dirk
 *  2026-08-11) rather than paraphrased: the clasp is `<Kl` / `Kl>`, the
 *  attachment `( G` / `G )`, and the bar is written `ste`.
 *
 *  The BRACKET SHAPE is part of the vocabulary, not decoration — angle for the
 *  clasp, round for the attachment — which is why it is a per-element pair and
 *  not one shared chevron. `ste` carries no bracket: a bar is not a thing that
 *  engages one side of one tooth, it runs between abutments, and its side is
 *  the span (see `detectBarSpans`). */
const RETENTION_MARK: Record<string, { mark: string; open: string; close: string }> = {
  clasp: { mark: "Kl", open: "<", close: ">" },
  attachment: { mark: "G", open: "( ", close: " )" },
  "bar-abutment": { mark: "ste", open: "", close: "" },
};

/**
 * The tile marker for a tooth's retention element, in charly's notation with
 * the engaged side as the bracket around it. Returns `""` when the tooth
 * carries no element (or one its own state does not allow).
 */
export function retentionMark(state: RetentionStateLike | undefined, side: string): string {
  const value = state?.retention;
  if(!value || value === "none" || !retentionAllowed(state, value)) return "";
  const spec = RETENTION_MARK[value];
  if(!spec) return "";
  const { mark, open, close } = spec;
  if(!open) return mark;                              // the bar takes no bracket
  if(side === "mesial") return `${open}${mark}`;
  if(side === "distal") return `${mark}${close}`;
  if(side === "both") return `${open}${mark}${close}`;
  return mark;
}

// ---------------------------------------------------------------------------
// The bar as it is DRAWN
// ---------------------------------------------------------------------------
//
// A bar is not a property of one tooth, it connects them — the same shape the
// bridge overlay already has, so it borrows that geometry rather than growing a
// second one. Two things differ, both clinical:
//
//   - it rides HIGHER than a bridge saddle, because a bar sits at the gingival
//     margin between the abutments rather than replacing a crown;
//   - it is drawn as ONE run from the first abutment to the last, so the gap it
//     spans reads as a bar and not as a row of separate pieces.

/** A tile's box in grid-relative coordinates, as `bridgeOverlay` reports it. */
export interface RetentionRect { x: number; y: number; width: number; height: number }

/** A single bar to draw, in grid-relative coordinates. */
export interface RetentionBar { x: number; y: number; width: number; height: number }

/** Where the bar sits down the tile, as a fraction of tile height. Higher than
 *  the bridge saddle's 0.72: a bar sits at the gingival margin, not where a
 *  crown would be. Mirrored about the tile mid-line for the lower arch, exactly
 *  as `SADDLE_Y_FRACTION_LOWER` does. */
export const BAR_Y_FRACTION = 0.62;
/** Bar thickness as a fraction of tile height. */
export const BAR_THICKNESS = 0.055;

/**
 * Compute one bar per span, running from the first abutment's centre to the
 * last's — NOT one piece per inter-tile gap. A bar crossing an edentulous space
 * drawn gap-by-gap would break at every tile boundary, which is exactly the
 * failure `detectBridgeSpans` exists to prevent for bridges.
 *
 * Guards mirror `computeBridgeBars`: a missing or zero-sized tile (occlusal
 * view, collapsed arch) is skipped rather than throwing, and a non-positive
 * width is skipped too.
 */
export function computeRetentionBars(
  spans: number[][],
  rectFor: (toothNo: number) => RetentionRect | null,
): RetentionBar[] {
  const bars: RetentionBar[] = [];
  for(const span of spans){
    const rects = span.map(rectFor).filter((r): r is RetentionRect => !!r && r.width > 0 && r.height > 0);
    if(rects.length < 2) continue;
    const isLower = span[0] >= 31;
    const yFraction = isLower ? 1 - BAR_Y_FRACTION : BAR_Y_FRACTION;
    const xs = rects.map((r) => r.x + r.width / 2);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const width = x1 - x0;
    if(width <= 0) continue;
    const ref = rects[0];
    const height = ref.height * BAR_THICKNESS;
    const midY = ref.y + ref.height * yFraction;
    bars.push({ x: x0, y: midY - height / 2, width, height });
  }
  return bars;
}

// ---------------------------------------------------------------------------
// The clasp as it is DRAWN
// ---------------------------------------------------------------------------
//
// Dirk asked for a drawn clasp rather than a text marker, "rein aus Gewohnheit"
// — and habit is the right argument here: he reads these charts every day, and
// a notation he has to translate is a notation that slows him down.
//
// No template carries clasp artwork, so the hook is drawn in the SAME
// grid-level overlay as the bar, off the SAME tile geometry. That keeps it out
// of the per-tooth SVG entirely (parity-safe) and means the hook and the bar
// can never disagree about where a tooth is.

/** Which SIDE of the screen a tooth's mesial surface faces. Mesial points
 *  toward the arch midline, so it is the left edge in quadrants 2 and 3 and
 *  the right edge in 1 and 4 — the same rule the perio chart's diamond tiles
 *  follow, stated once per module rather than shared through a UI file. */
export function mesialIsLeft(toothNo: number): boolean {
  const quadrant = Math.floor(toothNo / 10);
  return quadrant === 2 || quadrant === 3;
}

/** One drawn clasp hook, in grid-relative coordinates. */
export interface ClaspGlyph {
  /** Path data for the hook, already placed. */
  d: string;
  /** Stroke width, scaled to the tile. */
  width: number;
}

/** Where down the tile the hook sits, as a fraction of tile height.
 *
 *  Deliberately the SAME fraction the bridge saddle uses, because that constant
 *  already answers this exact question — it is where a crown sits on the tile —
 *  and a clasp arm engages the crown, not the root. Mirrored for the lower
 *  arch, like every other overlay fraction here. */
const CLASP_Y_FRACTION = 0.72;

/** Hook RADIUS as a fraction of tile width.
 *
 *  Small on purpose. A clasp arm hugs the proximal contour of one crown; drawn
 *  large it sweeps across the occlusal surface and reads as a blob sitting on
 *  the tooth rather than as an arm gripping it — which is exactly what a first
 *  attempt at 0.42 of tile WIDTH looked like on the running chart. At 0.115 the
 *  whole circle is under a quarter of the tile, so the hook stays on the crown
 *  it belongs to and never reaches its neighbour. */
const CLASP_RADIUS = 0.115;
/** How far the hook's centre sits inside the crown edge, in radii. >1 keeps the
 *  entire arc inside the tile. */
const CLASP_INSET = 1.35;
/** Half the arc's opening, in degrees: the gap that makes the shape read as a
 *  hook rather than a ring. */
const CLASP_GAP_HALF = 52;

/**
 * Build the hook path for ONE engaged side of one tooth.
 *
 * A near-closed circular arc whose OPENING faces the crown's centre, so the arm
 * reads as gripping the tooth rather than pointing away from it. `sideIsLeft`
 * is resolved by the caller from {@link mesialIsLeft}, so this function never
 * needs to know FDI numbering.
 */
function claspPath(rect: RetentionRect, isLower: boolean, sideIsLeft: boolean): ClaspGlyph {
  const r = rect.width * CLASP_RADIUS;
  const yF = isLower ? 1 - CLASP_Y_FRACTION : CLASP_Y_FRACTION;
  const cy = rect.y + rect.height * yF;
  const edge = sideIsLeft ? rect.x : rect.x + rect.width;
  const inward = sideIsLeft ? 1 : -1;
  const cx = edge + inward * r * CLASP_INSET;
  // The belly of the arc points at the GINGIVA and the opening faces
  // occlusally (Dirk, 2026-08-11) — that is the way a clasp arm actually runs,
  // sweeping under the survey line toward the gum. Which screen direction that
  // is depends on the arch, not on the side: the lower arch draws crowns up and
  // gum down, the upper the other way about. In SVG angles, 90° is screen-down
  // and 270° screen-up, so the GAP sits opposite the gingiva.
  const gap = isLower ? 270 : 90;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const at = (deg: number) => [
    (cx + r * Math.cos(rad(deg))).toFixed(2),
    (cy + r * Math.sin(rad(deg))).toFixed(2),
  ];
  const [x0, y0] = at(gap + CLASP_GAP_HALF);
  const [x1, y1] = at(gap - CLASP_GAP_HALF);
  // Sweep the LONG way round (large-arc), so what is drawn is the hook and not
  // the little gap itself.
  const d = `M ${x0} ${y0} A ${r.toFixed(2)} ${r.toFixed(2)} 0 1 1 ${x1} ${y1}`;
  return { d, width: Math.max(1.1, r * 0.52) };
}

/**
 * The clasp hooks to draw across the whole chart: one per engaged side, so a
 * clasp recorded as engaging both sides draws two.
 *
 * Guards mirror the bar's: a missing or zero-sized tile is skipped rather than
 * throwing.
 */
export function computeClaspGlyphs(
  teeth: number[],
  getState: GetRetentionState,
  rectFor: (toothNo: number) => RetentionRect | null,
  getSide: (toothNo: number) => string,
): ClaspGlyph[] {
  const out: ClaspGlyph[] = [];
  for(const toothNo of teeth){
    const state = getState(toothNo);
    if(state?.retention !== "clasp" || !retentionAllowed(state, "clasp")) continue;
    const rect = rectFor(toothNo);
    if(!rect || rect.width <= 0 || rect.height <= 0) continue;
    const side = getSide(toothNo);
    const mesialLeft = mesialIsLeft(toothNo);
    const isLower = toothNo >= 31;
    const sides: boolean[] =
      side === "mesial" ? [mesialLeft] :
      side === "distal" ? [!mesialLeft] :
      side === "both" ? [true, false] :
      [!mesialLeft];                  // unrecorded: draw where a clasp usually sits
    for(const sideIsLeft of sides) out.push(claspPath(rect, isLower, sideIsLeft));
  }
  return out;
}
