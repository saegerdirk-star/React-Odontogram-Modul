// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026

/**
 * DOM-free renderer for the SCHEMATIC chart view (Dirk, 24.08.2026): a second,
 * toggleable representation of the findings, geometric and deliberately NOT
 * charly (own shapes). Per tooth two stacked glyphs:
 *   - a SIDE view = crown 2/5 of length + roots 3/5, crown facing the occlusal
 *     plane (middle), roots outward; root count from `rootsOf`;
 *   - a TOP view with five surfaces (o in the centre, m/d/v/l around it).
 *
 * The shapes are "Zahnform D" and the colours "Variante B" from the Claude
 * Design handoff (docs/design/schematic-form-d.md, 25.09.2026, Dirk's pick):
 * crowns hinting at cusps, a barrel-shaped top view per tooth class (molar,
 * premolar, canine — its own rhombus — and incisor), roots that start at a neck
 * narrower than the crown and end at tips that splay on molars; restorations
 * shown as "versorgt" in ONE neutral tone at the arch (the material moves to
 * the shorthand lane and a later single-tooth view), caries the only saturated
 * surface colour, and a band behind the top views and the tooth numbers. Every
 * value is the handoff's; `docs/design/referenz/` holds the scripts they came
 * from. Light and dark are two palettes, not an inversion.
 *
 * Pure string generation over a `getState` reader (`ToothDisplayState`). No
 * odontogram state, no payload/FHIR change, and the anatomical view's SVG
 * fingerprints never see this view.
 */
import { rootsOf, type ToothDisplayState } from "./odontogram";
import { bridgeConstructions } from "./bridgeOverlay";

// Arch order (occlusal-to-occlusal in the middle): upper side glyphs point their
// roots UP, lower point DOWN.
export const UPPER_ARCH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const LOWER_ARCH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

// Cell geometry — unchanged by Form D (the handoff keeps the 76-wide column,
// the 100-high side cell and the 68-high top-view cell).
const CELL_W = 76;
const SIDE_H = 100;
const OCCL_H = 68;
const ARCH_W = UPPER_ARCH.length * CELL_W;   // 1216
const MID_X = ARCH_W / 2;                    // 608: the midline
/** Height of the shorthand lane between side view and top view. */
const LANE_H = 36;

// Side view, drawn for the LOWER jaw (crown up); the upper jaw is the same
// drawing flipped with translate(0,100) scale(1,-1).
const TOP_Y = 7;          // incisal / occlusal edge
const CERV_Y = 41.4;      // cervical line: crown 2/5 of the length
const TIP_Y = 93.5;       // root apex

// --- palettes (handoff "Farben"; the extras below it keep findings the
// handoff did not draw in the same key) -----------------------------------
export type SchematicTheme = "light" | "dark";
interface Palette {
  tooth: string; ink: string; inner: string; num: string; mid: string; band: string;
  missing: string; missLine: string; unerupt: string;
  caries: string; cariesEdge: string; wf: string; wfTemp: string; post: string;
  neutral: string; neutralEdge: string; extraction: string;
  lane: string; laneCaries: string; implantFill: string; implantEdge: string;
  selBg: string; selFg: string;
  calculus: string; gumFill: string; gumLine: string; metal: string;
  marginOverhang: string; marginFilling: string; stumpFill: string;
}
const PALETTES: Record<SchematicTheme, Palette> = {
  light: {
    tooth: "#ffffff", ink: "#26344d", inner: "#26344d", num: "#34425a", mid: "#b3bdcb", band: "#e5eaf1",
    missing: "#56657c", missLine: "#c3cbd6", unerupt: "#5f6e85",
    caries: "#d32f2f", cariesEdge: "#8e1b1b", wf: "#e07b16", wfTemp: "#6fa8dc", post: "#6b737b",
    neutral: "#aab8ca", neutralEdge: "#4f6179", extraction: "#b70000",
    lane: "#26344d", laneCaries: "#b3261e", implantFill: "#dfe4e8", implantEdge: "#6b737b",
    selBg: "#26344d", selFg: "#ffffff",
    calculus: "#bfa15c", gumFill: "#e9b8b1", gumLine: "#cf9089", metal: "#7b838c",
    marginOverhang: "#555d66", marginFilling: "#4a7fb5", stumpFill: "#eef1f5",
  },
  dark: {
    tooth: "#eef1f5", ink: "#0b0e12", inner: "#5b677a", num: "#c5cdd8", mid: "#3a4352", band: "#181e27",
    missing: "#95a0b0", missLine: "#3a4352", unerupt: "#a3adbb",
    caries: "#e5392e", cariesEdge: "#8e1b1b", wf: "#f28c28", wfTemp: "#8ab8e6", post: "#7d858c",
    neutral: "#9aabc2", neutralEdge: "#43556e", extraction: "#ff5a4f",
    lane: "#d2d9e3", laneCaries: "#ff8a80", implantFill: "#8d96a1", implantEdge: "#7d858c",
    selBg: "#eef1f5", selFg: "#11151b",
    calculus: "#cdb06e", gumFill: "#b98a84", gumLine: "#d9a29b", metal: "#9aa2aa",
    marginOverhang: "#6b737b", marginFilling: "#7aa6d6", stumpFill: "#2a313b",
  },
};

/** Canal names for a tooth — rootsOf, or ["single"] for a single-rooted tooth.
 *  The key set of `endoCanals`. */
export function toothCanals(toothNo: number): string[] {
  const r = rootsOf(toothNo);
  return r.length ? r : ["single"];
}
/** Map the legacy whole-tooth `endo` scalar to a per-canal findings array, so a
 *  tooth without per-canal detail still renders as before (uniform on every canal). */
function legacyEndoFindings(endo: string): string[] {
  switch (endo) {
    case "endo-filling": return ["filling"];
    case "endo-filling-incomplete": return ["incomplete"];
    case "endo-medical-filling": return ["temporary"];
    case "endo-glass-pin":
    case "endo-metal-pin": return ["filling", "post"];
    default: return [];
  }
}
// mesial faces the arch midline: on the LEFT for quadrants 2/3, RIGHT for 1/4.
function mesialOnLeft(toothNo: number): boolean {
  const q = Math.floor(toothNo / 10);
  return q === 2 || q === 3;
}
function isUpperSlot(toothNo: number): boolean {
  const q = Math.floor(toothNo / 10);
  return q === 1 || q === 2;
}

// ---------------------------------------------------------------------------
// Milk teeth (charly's MZ). A `milktooth` sits on the PERMANENT position — 55
// on 15 — which is how the engine keys it; the chart draws what it IS. Form D
// derives it from its permanent counterpart instead of drawing it anew
// (handoff "Milchzähne"): primary molar 4/5 -> molar, canine -> canine,
// incisor -> incisor; narrower, crown-heavy, primary molar roots splayed past
// the crown (three upper, two lower: `rootsOf` of the PRIMARY number).
// ---------------------------------------------------------------------------
/** The primary (deciduous) FDI number for a permanent position: 15 -> 55. */
export function primaryNumber(toothNo: number): number {
  return (Math.floor(toothNo / 10) + 4) * 10 + (toothNo % 10);
}

// ---------------------------------------------------------------------------
// Form D — one shape model per tooth, read by the drawing, the click zones,
// the bridge connectors and the pocket-depth layer alike.
// ---------------------------------------------------------------------------
type Kind = "mol" | "pm" | "can" | "inc";
function kindOf(toothNo: number, milk: boolean): Kind {
  const d = toothNo % 10;
  if (d <= 2) return "inc";
  if (d === 3) return "can";          // the canine has its own top view (Dirk, 25.09.2026)
  if (d <= 5) return milk ? "mol" : "pm";
  return "mol";
}
const D_CROWN: Record<Kind, string> = {
  mol: "M12,41.4 C8,34 6,26 7,18 Q10,6 22,7 Q31,8 38,13 Q45,8 54,7 Q66,6 69,18 C70,26 68,34 64,41.4 Z",
  pm: "M23,41.4 C20,34 18,25 19,19 Q24,8 38,6 Q52,8 57,19 C58,25 56,34 53,41.4 Z",
  can: "M25,41.4 C21,33 19,24 20,17 Q27,10 38,5 Q49,10 56,17 C57,24 55,33 51,41.4 Z",
  inc: "M26,41.4 C22,32 20,20 20,10 Q20,7 23,7 L53,7 Q56,7 56,10 C56,20 54,32 50,41.4 Z",
};
/** Left/right extent of the crown (widest), for connectors and the veneer. */
const D_CROWN_X: Record<Kind, [number, number]> = { mol: [7, 69], pm: [19, 57], can: [20, 56], inc: [20, 56] };
const D_NECK: Record<Kind, [number, number]> = { mol: [12, 64], pm: [23, 53], can: [25, 51], inc: [26, 50] };
const D_TIPS: Record<Kind, [number, number]> = { mol: [13, 63], pm: [26, 50], can: [38, 38], inc: [38, 38] };
const D_OCC: Record<Kind, string> = {
  mol: "M10,10 Q38,3 66,10 Q73,34 66,58 Q38,65 10,58 Q3,34 10,10 Z",
  pm: "M15,34 A23,27 0 1 0 61,34 A23,27 0 1 0 15,34 Z",
  can: "M14,34 Q20,17 38,13 Q56,17 62,34 Q56,51 38,55 Q20,51 14,34 Z",
  inc: "M11,28 Q38,12 65,28 Q62,46 38,51 Q14,46 11,28 Z",
};
/** Inner field (the occlusal surface / incisal edge): x0, y0, x1, y1, radius. */
const D_INNER: Record<Kind, [number, number, number, number, number]> = {
  mol: [25, 23, 51, 45, 8], pm: [30, 24, 46, 44, 7], can: [28, 29, 48, 39, 5], inc: [23, 29, 53, 37, 3],
};

/** Transform every coordinate pair of a path made of M/L/C/Q/Z commands. */
function mapPath(d: string, fx: (x: number) => number, fy: (y: number) => number): string {
  return d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_m, x, y) =>
    `${+fx(+x).toFixed(2)},${+fy(+y).toFixed(2)}`);
}
function bboxOf(d: string): [number, number, number, number] {
  const xs: number[] = [], ys: number[] = [];
  for (const m of d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)) { xs.push(+m[1]); ys.push(+m[2]); }
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

interface ToothShape {
  kind: Kind; milk: boolean; upper: boolean;
  crown: string; crownX: [number, number]; neck: [number, number]; tips: [number, number];
  n: number;                         // drawn root count
  fy: (y: number) => number;         // canonical permanent y -> drawn y
  top: number; cerv: number; apex: number;
  occ: string; bbox: [number, number, number, number]; inner: [number, number, number, number, number];
}
function toothShape(toothNo: number, s: ToothDisplayState): ToothShape {
  const milk = s.toothSelection === "milktooth";
  const kind = kindOf(toothNo, milk);
  const upper = isUpperSlot(toothNo);
  const n = Math.max(1, rootsOf(milk ? primaryNumber(toothNo) : toothNo).length);
  let crown = D_CROWN[kind], crownX = D_CROWN_X[kind], neck = D_NECK[kind], tips = D_TIPS[kind];
  let occ = D_OCC[kind];
  let inner = D_INNER[kind];
  let fy = (y: number) => y;
  if (milk) {
    // narrower (0.84 molar, 0.86 anterior) and crown-heavy: crown 7..41.4 ->
    // 7..37.86, root 41.4..93 -> 37.86..74 (the former milk-tooth height)
    const sx = kind === "mol" ? 0.84 : 0.86;
    const fx = (x: number) => 38 + (x - 38) * sx;
    fy = (y: number) => (y <= CERV_Y ? 7 + (y - 7) * 0.897 : 37.86 + (y - CERV_Y) * 0.7004);
    crown = mapPath(crown, fx, fy);
    crownX = [fx(crownX[0]), fx(crownX[1])];
    neck = [fx(neck[0]), fx(neck[1])];
    tips = kind === "mol" ? [9, 67] : [38, 38];
    const fo = (x: number) => 38 + (x - 38) * 0.82, go = (y: number) => 34 + (y - 34) * 0.82;
    occ = mapPath(occ, fo, go);
    inner = [fo(inner[0]), go(inner[1]), fo(inner[2]), go(inner[3]), inner[4] * 0.82];
  }
  // lower jaw: the labial bulge of incisor, canine and molar top views faces
  // OUTWARD — mirror about y = 34 (the premolar is symmetric)
  if (!upper && kind !== "pm") occ = mapPath(occ, (x) => x, (y) => 68 - y);
  const bbox: [number, number, number, number] = kind === "pm" && !milk ? [15, 7, 61, 61] : bboxOf(occ);
  return {
    kind, milk, upper, crown, crownX, neck, tips, n, fy, occ, bbox, inner,
    top: fy(TOP_Y), cerv: fy(CERV_Y), apex: fy(TIP_Y),
  };
}

interface Root { d: string; l: number; r: number; mid: number; tip: number }
/** The drawn roots: the neck split into n parts 2 apart, tips spread over the
 *  tip range. `shorten` < 1 pulls every apex toward the neck (a WSR cut). */
function rootsOfShape(sh: ToothShape, shorten = 1): Root[] {
  const [l0, r0] = sh.neck, gap = sh.n > 1 ? 2 : 0;
  const w = (r0 - l0 - gap * (sh.n - 1)) / sh.n;
  const Y = (y: number) => (sh.cerv + (sh.fy(y) - sh.cerv) * shorten).toFixed(2);
  const out: Root[] = [];
  for (let i = 0; i < sh.n; i++) {
    const l = l0 + i * (w + gap), r = l + w;
    const t = sh.n === 1 ? (sh.tips[0] + sh.tips[1]) / 2 : sh.tips[0] + i * (sh.tips[1] - sh.tips[0]) / (sh.n - 1);
    const f = (v: number) => v.toFixed(2);
    const d = `M${f(l)},${Y(CERV_Y)} C${f(l)},${Y(60)} ${f(t - 4)},${Y(80)} ${f(t - 1.6)},${Y(90)} Q${f(t)},${Y(TIP_Y)} ${f(t + 1.6)},${Y(90)} C${f(t + 4)},${Y(80)} ${f(r)},${Y(60)} ${f(r)},${Y(CERV_Y)} Z`;
    out.push({ d, l, r, mid: (l + r) / 2, tip: t });
  }
  return out;
}

// Single implant screw: a tapered body from wTop (cervical) to wBot (apex) with
// a zig-zag thread edge on both sides — reads unmistakably as a screw, unlike
// horizontal hatching over the natural roots (Dirk, 24.08.2026).
function screwPath(cx: number, wTop: number, wBot: number, yTop: number, yBot: number): string {
  const amp = 2.4;
  const n = Math.max(4, Math.round((yBot - yTop) / 6));
  const half = (i: number) => (wTop / 2) + ((wBot / 2) - (wTop / 2)) * (i / n);
  const jag = (i: number) => (i % 2 === 0 ? 0 : amp);
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) pts.push(`${(cx - half(i) + jag(i)).toFixed(1)},${(yTop + (yBot - yTop) * i / n).toFixed(1)}`);
  for (let i = n; i >= 0; i--) pts.push(`${(cx + half(i) - jag(i)).toFixed(1)},${(yTop + (yBot - yTop) * i / n).toFixed(1)}`);
  return "M" + pts.join(" L") + " Z";
}

function isMissing(s: ToothDisplayState): boolean {
  return s.toothSelection === "none" || s.toothSelection === "no-tooth-after-extraction";
}
function isReplaced(s: ToothDisplayState): boolean {
  return isMissing(s) && (s.prosthesis === "removable-partial" || s.prosthesis === "removable-full");
}
function isCrowned(s: ToothDisplayState): boolean {
  return s.restorationType === "crown" || s.restorationType === "bridge";
}

// ---------------------------------------------------------------------------
// Side glyph, drawn in canonical (lower-jaw) coordinates and flipped for the
// upper jaw; text is added after the flip so it never reads upside down.
// ---------------------------------------------------------------------------
function sideGlyph(toothNo: number, s: ToothDisplayState, crownDown: boolean, P: Palette): string {
  const cx = CELL_W / 2;
  const sh = toothShape(toothNo, s);
  const { top, cerv, apex } = sh;
  const [nl, nr] = sh.neck, nw = nr - nl;             // neck span: cervical findings sit on it
  const sel = s.toothSelection, sub = s.toothSubstrate, rt = s.restorationType;
  const missing = isMissing(s);
  const implant = sel === "implant";
  const pontic = missing && rt === "bridge";
  // Ersetzter Zahn (charly `e`): a gap replaced by a removable denture — a
  // floating crown like a pontic, its edge dashed (removable, not fixed).
  const replaced = isReplaced(s);
  const radix = sub === "radix";
  const crowned = isCrowned(s);
  const flip = (g: string) => (crownDown ? `<g transform="translate(0,${SIDE_H}) scale(1,-1)">${g}</g>` : g);

  // Missing: no side view, a large "f" on crown height (tomedo's letter,
  // handoff "Zustände") — it read too close to the not-erupted outline before.
  if (missing && !pontic && !replaced) {
    const y = crownDown ? 87 : 39;
    return `<text x="${cx}" y="${y}" text-anchor="middle" font-size="32" font-weight="600" fill="${P.missing}">f</text>`;
  }
  const roots = rootsOf(toothNo);
  const removes = s.rootResection === "hemisection" || s.rootResection === "amputation";
  const removedIdx = removes && s.rootResectionRoot ? roots.indexOf(s.rootResectionRoot) : -1;
  const shorten = s.endoResection ? 0.76 : 1;
  const apexEff = cerv + (apex - cerv) * shorten;
  const parts: string[] = [];

  // Not erupted: the full outline, dotted, 10 deeper in the jaw (away from the
  // occlusal plane). Nothing is in the mouth, so no finding sits on it.
  if (sel === "not-erupted") {
    const st = `fill="none" stroke="${P.unerupt}" stroke-width="1.7" stroke-dasharray="0.1 4" stroke-linecap="round"`;
    parts.push(`<g transform="translate(0,10)"><path d="${sh.crown}" ${st}/>${rootsOfShape(sh).map(r => `<path d="${r.d}" ${st}/>`).join("")}</g>`);
    return flip(parts.join(""));
  }

  const ink = `stroke="${P.ink}" stroke-width="2" stroke-linejoin="round"`;
  // roots — an IMPLANT has none: a screw body; a pontic / denture tooth has none
  if (!pontic && !replaced) {
    if (implant) {
      // Implantatposition: center | mesial | distal | both (mesial toward the midline)
      const off = (nw / 2) * 0.55;
      const mx = mesialOnLeft(toothNo) ? -off : off;
      const both = s.implantPosition === "both";
      const dxs = s.implantPosition === "mesial" ? [mx] : s.implantPosition === "distal" ? [-mx] : both ? [mx, -mx] : [0];
      const wTop = both ? 13 : 20, wBot = both ? 6 : 9;
      for (const dx of dxs) parts.push(`<path d="${screwPath(cx + dx, wTop, wBot, cerv, apex)}" fill="${P.implantFill}" stroke="${P.implantEdge}" stroke-width="1.5" stroke-linejoin="round"/>`);
    } else {
      const rs = rootsOfShape(sh, shorten);
      rs.forEach((r, i) => {
        if (i === removedIdx) {
          // removed root: a faint dashed stump + a red cut line at the neck
          const stump = rootsOfShape(sh, 0.18)[i];
          parts.push(`<path d="${stump.d}" fill="${P.stumpFill}" stroke="${P.missLine}" stroke-width="1.2" stroke-dasharray="2 2"/>`);
          parts.push(`<line x1="${r.l.toFixed(1)}" y1="${(cerv + 1).toFixed(1)}" x2="${r.r.toFixed(1)}" y2="${(cerv + 1).toFixed(1)}" stroke="${P.extraction}" stroke-width="2" stroke-linecap="round"/>`);
          return;
        }
        parts.push(`<path d="${r.d}" fill="${P.tooth}" ${ink}/>`);
      });
      // WSR: a red line across each retained root's shortened apex
      if (s.endoResection) {
        rs.forEach((r, i) => {
          if (i === removedIdx) return;
          parts.push(`<line x1="${(r.tip - 5).toFixed(1)}" y1="${apexEff.toFixed(1)}" x2="${(r.tip + 5).toFixed(1)}" y2="${apexEff.toFixed(1)}" stroke="${P.extraction}" stroke-width="2" stroke-linecap="round"/>`);
        });
      }
      // premolarisation: the tooth split, both roots kept — a line through it
      if (s.rootResection === "premolarisation" && sh.n >= 2) {
        parts.push(`<line x1="${cx}" y1="${(top + 3).toFixed(1)}" x2="${cx}" y2="${(apexEff - 2).toFixed(1)}" stroke="${P.marginOverhang}" stroke-width="1.4" stroke-dasharray="3 2"/>`);
      }
    }
  }
  // crown: "versorgt" in the neutral tone with a ring in its edge colour; a
  // natural crown white; a radix has none; a denture tooth's edge is dashed
  if (!radix) {
    if (crowned || pontic || replaced) {
      const dash = replaced ? ` stroke-dasharray="4 3"` : "";
      parts.push(`<path d="${sh.crown}" fill="${P.neutral}" stroke="${P.neutralEdge}" stroke-width="2.6" stroke-linejoin="round"${dash}/>`);
    } else {
      parts.push(`<path d="${sh.crown}" fill="${P.tooth}" ${ink}/>`);
    }
  }
  // veneer: a panel on the crown's labial face
  if (rt === "veneer") {
    const [cl, cr] = sh.crownX;
    parts.push(`<rect x="${(cl + 7).toFixed(1)}" y="${(top + 3).toFixed(1)}" width="${(cr - cl - 14).toFixed(1)}" height="${(cerv - top - 4.5).toFixed(1)}" rx="3" fill="${P.neutral}" stroke="${P.neutralEdge}" stroke-width="1.6"/>`);
  }
  // crown fracture (substrate "broken" and/or charly's 3-way severity): a crack
  // down the crown — hairline, zig-zag, or a gap of two jagged lines
  if ((sub === "broken" || s.crownFractureType !== "none") && !radix && !pontic) {
    const yA = top + 3, yB = cerv - 1, steps = 4;
    const sev = s.crownFractureType;
    const amp = sev === "crack" ? 2 : 5;
    const sw = sev === "crack" ? 1.2 : sev === "fracture" ? 2.6 : 1.8;
    const jag = (o: number) => {
      const pts: string[] = [];
      for (let i = 0; i <= steps; i++) pts.push(`${(cx + o + (i % 2 === 0 ? -amp : amp)).toFixed(1)},${(yA + (yB - yA) * (i / steps)).toFixed(1)}`);
      return `<polyline points="${pts.join(" ")}" fill="none" stroke="${P.ink}" stroke-width="${sw}" stroke-linejoin="round"/>`;
    };
    if (sev === "fracture") { parts.push(jag(-1.5)); parts.push(jag(1.5)); }
    else parts.push(jag(0));
  }
  // calculus (charly's Zahnstein): deposits at the neck, on the crown side
  if (s.calculus) {
    parts.push(`<rect x="${nl.toFixed(1)}" y="${(cerv - 4).toFixed(1)}" width="${nw.toFixed(1)}" height="4" rx="1.5" fill="${P.calculus}"/>`);
    for (let i = 0; i < 3; i++) parts.push(`<circle cx="${(nl + nw * (0.25 + i * 0.25)).toFixed(1)}" cy="${(cerv - 2).toFixed(1)}" r="2.2" fill="${P.calculus}"/>`);
  }
  // eruption (charly's D) and a tooth under the gum: a gum band over the part
  // of the crown still submerged — tip-first, emerging -> half -> full
  if (s.eruptionStage !== "none" || sel === "tooth-under-gum") {
    const eruptedFrac = sel === "tooth-under-gum" ? 0 : s.eruptionStage === "emerging" ? 0.2 : s.eruptionStage === "half-crown" ? 0.5 : 0.8;
    const [cl, cr] = sh.crownX;
    const gumY = top + (cerv - top) * eruptedFrac;
    parts.push(`<rect x="${cl.toFixed(1)}" y="${gumY.toFixed(1)}" width="${(cr - cl).toFixed(1)}" height="${(cerv - gumY).toFixed(1)}" fill="${P.gumFill}" opacity="0.6"/>`);
    parts.push(`<line x1="${cl.toFixed(1)}" y1="${gumY.toFixed(1)}" x2="${cr.toFixed(1)}" y2="${gumY.toFixed(1)}" stroke="${P.gumLine}" stroke-width="1.2"/>`);
  }
  // retention (bead odontogram-dma): a clasp hook, a bar, or an attachment block
  if (s.retention === "clasp" || s.retention === "attachment" || s.retention === "bar-abutment") {
    const [cl, cr] = sh.crownX;
    if (s.retention === "bar-abutment") {
      parts.push(`<rect x="${(cl - 2).toFixed(1)}" y="${(cerv - 1).toFixed(1)}" width="${(cr - cl + 4).toFixed(1)}" height="3" rx="1.5" fill="${P.metal}"/>`);
    } else if (s.retention === "attachment") {
      parts.push(`<rect x="${cx - 3}" y="${(cerv - 2).toFixed(1)}" width="6" height="5" fill="${P.metal}"/>`);
    } else {
      const left = mesialOnLeft(toothNo);
      const ex = left ? cl : cr, dir = left ? -1 : 1;
      parts.push(`<path d="M${ex.toFixed(1)},${(cerv - 9).toFixed(1)} Q${(ex + dir * 5).toFixed(1)},${(cerv - 3).toFixed(1)} ${(ex + dir * 1).toFixed(1)},${(cerv + 3).toFixed(1)}" fill="none" stroke="${P.metal}" stroke-width="2" stroke-linecap="round"/>`);
    }
  }
  // Wurzelkappe (charly): a metal coping over a root remnant
  if (s.rootCap && radix) {
    parts.push(`<path class="schem-rootcap" d="M${nl.toFixed(1)},${cerv} Q${cx},${(cerv - 11).toFixed(1)} ${nr.toFixed(1)},${cerv} Z" fill="${P.implantFill}" stroke="${P.metal}" stroke-width="1.4" stroke-linejoin="round"/>`);
  }
  // root caries: a red band across the root just below the cervical line
  if (s.rootCaries !== "none") {
    const op = s.rootCaries === "active" ? 0.5 : s.rootCaries === "arrested" ? 0.7 : 1;
    parts.push(`<rect x="${nl.toFixed(1)}" y="${cerv}" width="${nw.toFixed(1)}" height="6" fill="${P.caries}" opacity="${op}"/>`);
  }
  // endo PER CANAL: WF and post coexist; an untreated canal draws nothing. The
  // engine keys canals by the PERMANENT position (`rootsOf(15)` = one canal for
  // the 55 standing there); a primary molar draws two or three roots, so its
  // one canal key is projected onto every drawn root.
  let anyFill = false, anyPost = false;
  if (!implant && !pontic && !replaced) {
    const rs = rootsOfShape(sh);
    const canalKeys = toothCanals(toothNo);
    const canals = canalKeys.length === 1 && rs.length > 1 ? Array<string>(rs.length).fill(canalKeys[0]) : canalKeys;
    const legacy = legacyEndoFindings(s.endo);
    const retained = canals.filter((_n, i) => i !== removedIdx);
    const hasDetail = canals.some((name) => s.endoCanals[name]?.length > 0);
    const hasCanalPost = canals.some((name) => s.endoCanals[name]?.includes("post"));
    const fallbackPostCanal = hasDetail && !hasCanalPost && s.rootPostType !== "none"
      ? retained.find((name) => s.endoCanals[name]?.length > 0) ?? retained[0]
      : undefined;
    canals.forEach((name, i) => {
      if (i === removedIdx) return;   // a removed root has no canal to fill
      const canalFindings = (s.endoCanals[name] && s.endoCanals[name].length) ? s.endoCanals[name] : legacy;
      // tooth-level post: with no canal detail on every canal, else on one
      const includeToothPost = s.rootPostType !== "none" && (!hasDetail || name === fallbackPostCanal);
      const f = includeToothPost && !canalFindings.includes("post") ? [...canalFindings, "post"] : canalFindings;
      if (!f.length) return;
      const r = rs[Math.min(i, rs.length - 1)];
      // the canal runs from the neck's middle to the root's tip
      const xAt = (y: number) => r.mid + (r.tip - r.mid) * ((y - cerv) / (apex - cerv));
      const y0 = cerv + 1.6;
      if (f.includes("filling") || f.includes("temporary") || f.includes("incomplete")) {
        anyFill = true;
        const frac = f.includes("incomplete") ? 0.78 : 0.91;
        const col = f.includes("temporary") ? P.wfTemp : P.wf;
        const yb = Math.min(cerv + (apex - cerv) * frac, apexEff - 1.5);
        parts.push(`<line class="schem-wf" x1="${r.mid.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${xAt(yb).toFixed(1)}" y2="${yb.toFixed(1)}" stroke="${col}" stroke-width="3.6" stroke-linecap="round"/>`);
      }
      if (f.includes("post")) {
        anyPost = true;
        const yb = Math.min(cerv + (apex - cerv) * 0.47, apexEff - 1.5);
        parts.push(`<line class="schem-post" x1="${r.mid.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${xAt(yb).toFixed(1)}" y2="${yb.toFixed(1)}" stroke="${P.post}" stroke-width="4.6" stroke-linecap="round"/>`);
      }
    });
  }
  // diseased pulp (only when not endo-treated): a red dot at the crown base
  if (s.pulpDx !== "normal" && !anyFill && !anyPost && !pontic && !replaced && !implant) {
    parts.push(`<circle cx="${cx}" cy="${(cerv - 5).toFixed(1)}" r="3" fill="${P.caries}"/>`);
  }
  // apical lesion at the apex, three-way (Dirk, 24.08.2026): cyst = ring,
  // abscess = disc with rays, otherwise a disc (granuloma / Beherdung). A
  // lesion on a NAMED root sits at that root's tip.
  if (s.apicalDx !== "normal" && !pontic && !replaced) {
    const rs = rootsOfShape(sh, shorten);
    const ai = s.apicalRoot ? roots.indexOf(s.apicalRoot) : -1;
    const ax = ai >= 0 && rs[ai] ? rs[ai].tip : rs.length === 1 ? rs[0].tip : cx;
    const ay = apexEff - 4.5, r = 6.5;
    if (s.periapicalType === "cyst") {
      parts.push(`<circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="${r}" fill="${P.tooth}" stroke="${P.caries}" stroke-width="1.6"/>`);
    } else if (s.apicalDx.includes("abscess")) {
      const rays = Array.from({ length: 8 }, (_, k) => {
        const a = (k / 8) * Math.PI * 2;
        return `<line x1="${(ax + Math.cos(a) * r).toFixed(1)}" y1="${(ay + Math.sin(a) * r).toFixed(1)}" x2="${(ax + Math.cos(a) * (r + 3)).toFixed(1)}" y2="${(ay + Math.sin(a) * (r + 3)).toFixed(1)}" stroke="${P.caries}" stroke-width="1.2"/>`;
      }).join("");
      parts.push(`${rays}<circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="${r}" fill="${P.caries}" opacity="0.85"/>`);
    } else {
      parts.push(`<circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="${r}" fill="${P.caries}" opacity="0.85"/>`);
    }
  }
  // crown marginal leakage: a red dashed line on the cervical margin
  if (s.crownLeakage && crowned) {
    parts.push(`<line x1="${nl.toFixed(1)}" y1="${cerv}" x2="${nr.toFixed(1)}" y2="${cerv}" stroke="${P.caries}" stroke-width="1.6" stroke-dasharray="2 2"/>`);
  }
  // typed + sided crown-margin finding (charly überstehend/Karies/Füllung)
  if (s.crownMarginType !== "none" && crowned) {
    const col = s.crownMarginType === "caries" ? P.caries : s.crownMarginType === "overhang" ? P.marginOverhang : P.marginFilling;
    const mLeft = mesialOnLeft(toothNo);
    let x1 = nl, x2 = nr;
    if (s.crownMarginSide === "mesial") { if (mLeft) x2 = cx; else x1 = cx; }
    else if (s.crownMarginSide === "distal") { if (mLeft) x1 = cx; else x2 = cx; }
    parts.push(`<line x1="${x1.toFixed(1)}" y1="${cerv}" x2="${x2.toFixed(1)}" y2="${cerv}" stroke="${col}" stroke-width="2.4" stroke-linecap="round"/>`);
    if (s.crownMarginType === "overhang") parts.push(`<rect x="${(((x1 + x2) / 2) - 2).toFixed(1)}" y="${(cerv - 1).toFixed(1)}" width="4" height="3" fill="${col}"/>`);
  }
  // extraction (charly's x): two lines over the side view
  if (s.extractionPlan) {
    parts.push(`<g stroke="${P.extraction}" stroke-width="2" stroke-linecap="round"><line x1="12" y1="10" x2="64" y2="90"/><line x1="64" y1="10" x2="12" y2="90"/></g>`);
  }

  // Upright text, added AFTER the flip: only the mobility grade stays at the
  // tooth. The restoration, endo and resection codes moved to the shorthand
  // lane (handoff: "Die Kürzel an der Krone (K/B/V) entfallen damit").
  const rootY = crownDown ? 14 : SIDE_H - 4;
  const anno: string[] = [];
  const mob = { m1: "I", m2: "II", m3: "III" }[s.mobility] ?? "";
  if (mob) anno.push(`<text x="5" y="${rootY}" font-size="10" fill="${P.num}">${mob}</text>`);
  void anyFill; void anyPost;

  return flip(parts.join("")) + anno.join("");
}

// ---------------------------------------------------------------------------
// Shorthand lane (handoff "Kürzelzeile"): per tooth up to two lines in charly's
// vocabulary — Dirk's rule for the open point: the lane shows WHAT ONE WOULD
// TYPE to enter the finding, material first (`G k` gold crown, `K do`
// composite filling, `c mo` caries; `cK3 mo` with a stage). That settles the
// K conflict by itself: lower `k` is the crown, upper `K` the composite.
// Line 1: restoration, fillings, caries; line 2: endo and everything else.
// Where the table has no key (metal-ceramic, a veneer, GIC) the lane uses the
// short name charly prints.
// ---------------------------------------------------------------------------
export interface LaneToken { t: string; red?: boolean }
const REST_KEY: Record<string, string> = { gradia: "K", gold: "G", emax: "E", zircon: "Zir", metal: "NEM", "metal-ceramic": "VMK", temporary: "prov" };
const FILL_KEY: Record<string, string> = { amalgam: "A", composite: "K", gic: "GIZ", temporary: "prov" };
const SURF_ORDER = ["mesial", "occlusal", "distal", "buccal", "lingual"];
const SURF_CH: Record<string, string> = { mesial: "m", occlusal: "o", distal: "d", buccal: "v", lingual: "l" };
const STAGE_KEY: Record<number, string> = { 2: "K1", 3: "K2", 4: "K3", 5: "K4", 6: "K5" };
const surfCode = (list: string[]) => SURF_ORDER.filter((x) => list.includes(x)).map((x) => SURF_CH[x]).join("");
const join = (...xs: (string | undefined)[]) => xs.filter(Boolean).join(" ");

export function laneTokens(toothNo: number, s: ToothDisplayState): [LaneToken[], LaneToken[]] {
  const l1: LaneToken[] = [], l2: LaneToken[] = [];
  const sel = s.toothSelection, rt = s.restorationType, mat = s.restorationMaterial;
  void toothNo;
  if (sel === "not-erupted") return [l1, l2];
  if (isReplaced(s)) {
    l1.push({ t: "e" });
  } else if (isMissing(s)) {
    if (rt === "bridge") l1.push({ t: join(REST_KEY[mat], "b") });
    if (s.missingClosed) l2.push({ t: ")L(" });
    if (rt !== "bridge") return [l1, l2];
  } else {
    // restoration (an abutment is typed as a crown: Dirk's "Pfeiler = Krone")
    if (rt === "crown" || rt === "bridge") l1.push({ t: mat === "telescope" ? "t" : join(REST_KEY[mat], "k") });
    else if (rt === "onlay") l1.push({ t: join(REST_KEY[mat], "TK", surfCode(s.onlayCoverage)) });
    else if (rt === "inlay") l1.push({ t: join(REST_KEY[mat], surfCode(s.inlayCoverage) || "I") });
    else if (rt === "veneer") l1.push({ t: join(REST_KEY[mat], "V") });
    // direct fillings, one token per material
    const byMat = new Map<string, string[]>();
    for (const surf of s.fillingSurfaces) {
      const m = s.fillingSurfaceMaterials[surf] ?? "composite";
      byMat.set(m, [...(byMat.get(m) ?? []), surf]);
    }
    for (const [m, list] of byMat) l1.push({ t: join(FILL_KEY[m] ?? m, surfCode(list)) });
    // caries: `c` + the stage when every carious surface has the same one
    const car = SURF_ORDER.filter((x) => s.caries.includes(`caries-${x}`));
    if (car.length) {
      const sev = car.map((x) => s.cariesSeverity[x]);
      const stage = sev.every((v) => v != null && v === sev[0]) ? (STAGE_KEY[sev[0]] ?? "") : "";
      l1.push({ t: `c${stage} ${surfCode(car)}`, red: true });
    }
  }
  if (sel === "implant") l2.push({ t: "i" });
  const endo = s.endo === "endo-filling" || s.endo === "endo-glass-pin" || s.endo === "endo-metal-pin" ? "wf"
    : s.endo === "endo-filling-incomplete" ? "WFi"
    : s.endo === "endo-medical-filling" ? "Twf"
    : Object.values(s.endoCanals).some((f) => f.includes("filling")) ? "wf"
    : Object.values(s.endoCanals).some((f) => f.includes("incomplete")) ? "WFi"
    : Object.values(s.endoCanals).some((f) => f.includes("temporary")) ? "Twf" : "";
  if (endo) l2.push({ t: endo });
  if (s.rootPostType !== "none" || Object.values(s.endoCanals).some((f) => f.includes("post"))) l2.push({ t: "Sti" });
  // charly's `Hem`; amputation and premolarisation have no key — their short names
  const res = { hemisection: "Hem", amputation: "Amp", premolarisation: "Prä" }[s.rootResection];
  if (res) l2.push({ t: res });
  if (s.endoResection) l2.push({ t: "Res" });   // charly's Res = Wurzelspitzenresektion
  if (s.rootFracture !== "none") l2.push({ t: "Fra" });
  if (s.apicalDx !== "normal") l2.push({ t: s.periapicalType === "cyst" ? "Zys" : "Be", red: true });
  if (s.toothSubstrate === "radix") l2.push({ t: "WR" });
  if (s.toothSubstrate === "broken") l2.push({ t: "Fr" });
  if (s.calculus) l2.push({ t: "Zst" });
  const d = { emerging: "D1", "half-crown": "D2", "full-crown": "D3" }[s.eruptionStage];
  if (d) l2.push({ t: d });
  const ret = { clasp: "Kl", attachment: "Gesch", "bar-abutment": "Steg" }[s.retention];
  if (ret) l2.push({ t: ret });
  const sens = { vital: "+", "no-response": "−", questionable: "?" }[s.sensibility];
  if (sens) l2.push({ t: sens });
  if (s.percussion === "sensitive") l2.push({ t: "p" });
  if (s.extractionPlan) l2.push({ t: "x", red: true });
  return [l1, l2];
}
/** At most ~10 monospace characters fit a 76-wide cell; a longer line ends in
 *  "…" (the hover read-out has the full finding). */
const LANE_MAX = 10;
function laneLine(tokens: LaneToken[], x: number, y: number, P: Palette): string {
  if (!tokens.length) return "";
  let used = 0; const spans: string[] = [];
  for (const [i, tok] of tokens.entries()) {
    const sep = i > 0 ? " " : "";
    let text = sep + tok.t;
    if (used + text.length > LANE_MAX) {
      const room = LANE_MAX - used - 1;
      text = room > 0 ? text.slice(0, room) + "…" : "…";
      spans.push(`<tspan fill="${tok.red ? P.laneCaries : P.lane}">${escapeXml(text)}</tspan>`);
      break;
    }
    used += text.length;
    spans.push(`<tspan fill="${tok.red ? P.laneCaries : P.lane}">${escapeXml(text)}</tspan>`);
  }
  return `<text class="schem-lane" x="${x}" y="${y}" text-anchor="middle" font-size="12" font-weight="600" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" xml:space="preserve">${spans.join("")}</text>`;
}

// ---------------------------------------------------------------------------
// Top view. Each surface is a quadrilateral from two corners of the outline's
// frame (its bounding box grown by 3) to two corners of the inner field,
// clipped to the outline; the four separators run from the inner field's
// corners all the way to the frame. ONE geometry source for the drawing, the
// fills and the click zones.
// ---------------------------------------------------------------------------
type Side = "top" | "bottom" | "left" | "right";
/** Which side of the drawn box a surface is on: v/l by jaw, m/d by quadrant. */
function sideOf(toothNo: number, surf: string): Side {
  const upper = isUpperSlot(toothNo);
  if (surf === "buccal") return upper ? "top" : "bottom";
  if (surf === "lingual") return upper ? "bottom" : "top";
  const mesialRight = !mesialOnLeft(toothNo);
  if (surf === "mesial") return mesialRight ? "right" : "left";
  return mesialRight ? "left" : "right";
}
function surfaceShapes(toothNo: number, sh: ToothShape): Record<string, string> {
  const [bx0, by0, bx1, by1] = sh.bbox;
  const x0 = bx0 - 3, y0 = by0 - 3, x1 = bx1 + 3, y1 = by1 + 3;
  const [a, b, c, d] = sh.inner;
  const poly = (pts: [number, number][]) => "M" + pts.map(([x, y]) => `${+x.toFixed(2)},${+y.toFixed(2)}`).join(" L") + " Z";
  const quad: Record<Side, string> = {
    top: poly([[x0, y0], [x1, y0], [c, b], [a, b]]),
    bottom: poly([[x0, y1], [x1, y1], [c, d], [a, d]]),
    left: poly([[x0, y0], [x0, y1], [a, d], [a, b]]),
    right: poly([[x1, y0], [x1, y1], [c, d], [c, b]]),
  };
  const out: Record<string, string> = { occlusal: poly([[a, b], [c, b], [c, d], [a, d]]) };
  for (const surf of ["mesial", "distal", "buccal", "lingual"]) out[surf] = quad[sideOf(toothNo, surf)];
  return out;
}
function rrectPath(x0: number, y0: number, x1: number, y1: number, r: number): string {
  const f = (v: number) => +v.toFixed(2);
  return `M${f(x0 + r)},${f(y0)} L${f(x1 - r)},${f(y0)} Q${f(x1)},${f(y0)} ${f(x1)},${f(y0 + r)} L${f(x1)},${f(y1 - r)} Q${f(x1)},${f(y1)} ${f(x1 - r)},${f(y1)} L${f(x0 + r)},${f(y1)} Q${f(x0)},${f(y1)} ${f(x0)},${f(y1 - r)} L${f(x0)},${f(y0 + r)} Q${f(x0)},${f(y0)} ${f(x0 + r)},${f(y0)} Z`;
}

function occlBox(toothNo: number, s: ToothDisplayState, P: Palette): string {
  const sh = toothShape(toothNo, s);
  const cx = CELL_W / 2;
  const parts: string[] = [];
  if (isReplaced(s)) {
    // a removable-denture tooth: versorgt, its edge dashed (removable)
    parts.push(`<path d="${sh.occ}" fill="${P.neutral}" stroke="${P.neutralEdge}" stroke-width="2.4" stroke-dasharray="4 3" stroke-linejoin="round"/>`);
    return parts.join("");
  }
  if (isMissing(s) && s.restorationType !== "bridge") {
    parts.push(`<path d="${sh.occ}" fill="none" stroke="${P.missLine}" stroke-width="1.2" stroke-dasharray="3 4"/>`);
    return parts.join("");
  }
  // nothing of it in the mouth (not erupted, under the gum): a dotted outline
  if (s.toothSelection === "not-erupted" || s.toothSelection === "tooth-under-gum") {
    parts.push(`<path d="${sh.occ}" fill="none" stroke="${P.unerupt}" stroke-width="1.7" stroke-dasharray="0.1 4" stroke-linecap="round"/>`);
    return parts.join("");
  }
  const crowned = isCrowned(s);
  const shapes = surfaceShapes(toothNo, sh);
  const clipId = `occlClip-${toothNo}`;
  parts.push(`<clipPath id="${clipId}"><path d="${sh.occ}"/></clipPath>`);
  // the table is TOOTH (white), or versorgt under a crown
  parts.push(`<path d="${sh.occ}" fill="${crowned ? P.neutral : P.tooth}"/>`);
  const inClip: string[] = [];
  // partial restorations (onlay / inlay / veneer coverage) and fillings:
  // versorgt; caries on top — the only saturated surface colour
  const coverage = s.restorationType === "onlay" ? s.onlayCoverage
    : s.restorationType === "inlay" ? s.inlayCoverage
    : s.restorationType === "veneer" ? s.veneerCoverage : [];
  const outer = ["mesial", "distal", "buccal", "lingual"];
  for (const surf of outer) {
    if (coverage.includes(surf) || s.fillingSurfaces.includes(surf)) {
      const cls = coverage.includes(surf) ? "schem-coverage" : "schem-fill";
      inClip.push(`<path class="${cls}" d="${shapes[surf]}" fill="${P.neutral}" stroke="${P.neutralEdge}" stroke-width="1.6" stroke-linejoin="round"/>`);
    }
  }
  for (const surf of outer) {
    if (s.caries.includes(`caries-${surf}`)) {
      inClip.push(`<path class="schem-caries" d="${shapes[surf]}" fill="${P.caries}" stroke="${P.cariesEdge}" stroke-width="1.2" stroke-linejoin="round"/>`);
    }
  }
  // separators: from the inner field's corners to the frame
  const [bx0, by0, bx1, by1] = sh.bbox;
  const x0 = bx0 - 3, y0 = by0 - 3, x1 = bx1 + 3, y1 = by1 + 3;
  const [a, b, c, d, r] = sh.inner;
  const sep = crowned ? P.neutralEdge : P.inner;
  inClip.push(`<g stroke="${sep}" stroke-width="1.1" opacity="0.8"><line x1="${a}" y1="${b}" x2="${x0}" y2="${y0}"/><line x1="${c}" y1="${b}" x2="${x1}" y2="${y0}"/><line x1="${a}" y1="${d}" x2="${x0}" y2="${y1}"/><line x1="${c}" y1="${d}" x2="${x1}" y2="${y1}"/></g>`);
  parts.push(`<g clip-path="url(#${clipId})">${inClip.join("")}</g>`);
  // the inner field (occlusal surface / incisal edge)
  let cf = P.tooth, ce = P.inner, cw = 1.3, cls = "";
  if (crowned) { cf = "none"; ce = P.neutralEdge; cw = 1.1; }
  if (coverage.includes("occlusal") || s.fillingSurfaces.includes("occlusal")) {
    cf = P.neutral; ce = P.neutralEdge; cw = 1.6; cls = coverage.includes("occlusal") ? "schem-coverage" : "schem-fill";
  }
  if (s.caries.includes("caries-occlusal")) { cf = P.caries; ce = P.cariesEdge; cw = 1.4; cls = "schem-caries"; }
  parts.push(`<path${cls ? ` class="${cls}"` : ""} d="${rrectPath(a, b, c, d, Math.min(r, (d - b) / 2, (c - a) / 2))}" fill="${cf}" stroke="${ce}" stroke-width="${cw}"/>`);
  if (sh.kind === "inc" || sh.kind === "can") {
    parts.push(`<line x1="${a + 1}" y1="${(b + d) / 2}" x2="${c - 1}" y2="${(b + d) / 2}" stroke="${crowned ? P.neutralEdge : P.ink}" stroke-width="1.4"/>`);
  }
  // the outline, a ring in the edge colour under a crown
  parts.push(`<path d="${sh.occ}" fill="none" stroke="${crowned ? P.neutralEdge : P.ink}" stroke-width="${crowned ? 3.4 : 1.9}" stroke-linejoin="round"/>`);
  // charly Funktion: premature contact = dot, interference = chevron, overload = ring
  const fn = s.occlusalFunction;
  const cy = OCCL_H / 2;
  if (fn && fn !== "none") {
    if (fn === "premature") parts.push(`<circle class="schem-occl-fn" cx="${cx}" cy="${cy}" r="3.4" fill="${P.caries}"/>`);
    else if (fn === "interference") parts.push(`<path class="schem-occl-fn" d="M${cx - 4},${cy - 4} L${cx + 3},${cy} L${cx - 4},${cy + 4}" fill="none" stroke="${P.caries}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`);
    else parts.push(`<circle class="schem-occl-fn" cx="${cx}" cy="${cy}" r="5" fill="none" stroke="${P.caries}" stroke-width="2"/>`);
  }
  return parts.join("");
}

/** Transparent, CLICKABLE surface zones over the top view — one per surface,
 *  carrying `data-tooth` and `data-surf` (the shorthand char m/o/d/v/l). The
 *  same geometry as `occlBox` (both read `surfaceShapes`). */
function occlSurfaceHits(toothNo: number, s: ToothDisplayState): string {
  const shapes = surfaceShapes(toothNo, toothShape(toothNo, s));
  const chars: [string, string][] = [["buccal", "v"], ["lingual", "l"], ["occlusal", "o"], ["mesial", "m"], ["distal", "d"]];
  return chars.map(([surf, ch]) =>
    `<path class="schematic-surf-hit" data-tooth="${toothNo}" data-surf="${ch}" d="${shapes[surf]}" fill="transparent"/>`).join("");
}

// ---------------------------------------------------------------------------
// Pocket depths as lines over the side view, like charly's PA curves (Dirk,
// 25.09.2026) — but with the WHO probe's two thresholds instead of charly's
// even 2 mm grid: 3.5 mm (the probe's band starts: PSI code 3) and 5.5 mm (the
// band disappears: code 4, the one that matters), drawn differently from each
// other. Display only, from the six probed sites the periodontal chart records.
//
// Depth is measured from the tooth's cervical line, which stands in for the
// gingival margin: what is plotted is the PROBING DEPTH, so the thresholds read
// directly. The scale is nominal (a drawn root = 10 mm, chosen for legibility)
// — the roots are schematic, not to scale; exact values stay in the periodontal
// view.
// ---------------------------------------------------------------------------
const POCKET_ROOT_MM = 10;
const MM_PX = (TIP_Y - CERV_Y) / POCKET_ROOT_MM;
const WHO_BAND_TOP = 3.5, WHO_BAND_BOTTOM = 5.5;
const POCKET_INK = "#7b3fb0";
const WHO_TOP_INK = "#d98f4a", WHO_BOTTOM_INK = "#c62828";
const BUCCAL_SITES = ["MB", "B", "DB"] as const, ORAL_SITES = ["ML", "L", "DL"] as const;

function pocketLayer(
  teeth: number[], getState: GetDisplayState, upper: boolean, sideY: number,
  pocketDepths: (tn: number) => Record<string, number>, hidden: (tn: number) => boolean,
): string {
  const drawable = (tn: number) => {
    const sel = getState(tn).toothSelection;
    return !hidden(tn) && sel !== "none" && sel !== "no-tooth-after-extraction" && sel !== "not-erupted" && sel !== "tooth-under-gum";
  };
  // arch y of a depth below the cervical line (the upper side view is flipped)
  const yAt = (tn: number, mm: number) => {
    const sh = toothShape(tn, getState(tn));
    const yc = sh.cerv + Math.min(mm, POCKET_ROOT_MM + 2) * MM_PX;
    return sideY + (upper ? SIDE_H - yc : yc);
  };
  const out: string[] = [];
  // the two WHO reference lines, one short segment per present tooth so they
  // follow a milk tooth's shorter crown too
  teeth.forEach((tn, i) => {
    if (!drawable(tn)) return;
    const x1 = i * CELL_W + 2, x2 = (i + 1) * CELL_W - 2;
    const y35 = yAt(tn, WHO_BAND_TOP).toFixed(1), y55 = yAt(tn, WHO_BAND_BOTTOM).toFixed(1);
    out.push(`<line class="schem-who-35" x1="${x1}" y1="${y35}" x2="${x2}" y2="${y35}" stroke="${WHO_TOP_INK}" stroke-width="1" stroke-dasharray="1.5 3" stroke-linecap="round" opacity="0.9"/>`);
    out.push(`<line class="schem-who-55" x1="${x1}" y1="${y55}" x2="${x2}" y2="${y55}" stroke="${WHO_BOTTOM_INK}" stroke-width="1.6" opacity="0.75"/>`);
  });
  // one line per aspect through the probed sites, in arch order; an uncharted
  // site or an absent tooth breaks it
  const line = (sites: readonly string[], oral: boolean) => {
    const runs: string[][] = []; let run: string[] = [];
    const dots: string[] = [];
    const flush = () => { if (run.length > 1) runs.push(run); run = []; };
    teeth.forEach((tn, i) => {
      if (!drawable(tn)) { flush(); return; }
      const pd = pocketDepths(tn) ?? {};
      const sh = toothShape(tn, getState(tn));
      const halfW = (sh.crownX[1] - sh.crownX[0]) / 2;
      // left-to-right on screen: mesial first where mesial is on the left
      const ordered = mesialOnLeft(tn) ? [sites[0], sites[1], sites[2]] : [sites[2], sites[1], sites[0]];
      ordered.forEach((site, k) => {
        const v = pd[site];
        if (typeof v !== "number") { flush(); return; }
        const x = i * CELL_W + CELL_W / 2 + (k - 1) * halfW * 0.76;
        const y = yAt(tn, v);
        run.push(`${x.toFixed(1)},${y.toFixed(1)}`);
        const col = v > WHO_BAND_BOTTOM ? WHO_BOTTOM_INK : v > WHO_BAND_TOP ? WHO_TOP_INK : POCKET_INK;
        dots.push(oral
          ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.3" fill="#fff" stroke="${col}" stroke-width="1.3"/>`
          : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.4" fill="${col}"/>`);
      });
    });
    flush();
    const dash = oral ? ` stroke-dasharray="4 3"` : "";
    for (const r of runs) out.push(`<polyline class="schem-pocket${oral ? " is-oral" : ""}" points="${r.join(" ")}" fill="none" stroke="${POCKET_INK}" stroke-width="1.5"${dash} stroke-linejoin="round" opacity="${oral ? 0.75 : 0.95}"/>`);
    out.push(...dots);
  };
  line(ORAL_SITES, true);
  line(BUCCAL_SITES, false);
  return `<g class="schem-pocket-layer" pointer-events="none">${out.join("")}</g>`;
}

// ---------------------------------------------------------------------------
// Whole chart. Top to bottom (handoff "Maße der Anordnung"): upper side view,
// [shorthand lane], upper top view, the two number rows back to back on the
// occlusal plane, lower top view, [lane], lower side view — a band behind the
// top views and numbers, a vertical midline between 11/21 and 41/31.
// ---------------------------------------------------------------------------
export type GetDisplayState = (toothNo: number) => ToothDisplayState;

export interface SchematicOptions {
  /** The label printed for a tooth (numbering system + milk remap);
   *  default: FDI, milk teeth as their primary number. */
  label?: (toothNo: number) => string;
  /** A tooth drawn as nothing — wisdom teeth switched off. */
  hidden?: (toothNo: number) => boolean;
  /** Probing depths per site (`getToothPerio(tn).pd`). Given, the pocket-depth
   *  layer is drawn over the side views; omitted, it is not. */
  pocketDepths?: (toothNo: number) => Record<string, number>;
  /** Light or dark palette (two feature sets, not an inversion). */
  theme?: SchematicTheme;
}
function escapeXml(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface Layout { uSide: number; uOcc: number; nu: number; nl: number; lOcc: number; lSide: number; split: number; bandY: number; bandH: number; H: number }
function layout(): Layout {
  const uSide = 0, uOcc = SIDE_H + LANE_H;
  const nu = uOcc + 82, nl = uOcc + 102;
  const lOcc = uOcc + 108, lSide = lOcc + OCCL_H - 4 + LANE_H;
  return {
    uSide, uOcc, nu, nl, lOcc, lSide,
    split: (nu + nl) / 2 - 4,
    bandY: uOcc, bandH: lOcc + OCCL_H - uOcc,
    H: lSide + SIDE_H + 8,
  };
}

function archRows(teeth: number[], getState: GetDisplayState, upper: boolean, opts: SchematicOptions, P: Palette, L: Layout): string {
  // A hidden tooth (wisdom teeth switched off in Settings, as on the anatomical
  // grid) keeps its column but draws nothing and takes no click.
  const hidden = opts.hidden ?? (() => false);
  const label = opts.label ?? ((tn: number) =>
    String(getState(tn).toothSelection === "milktooth" ? primaryNumber(tn) : tn));
  const sideY = upper ? L.uSide : L.lSide;
  const occlY = upper ? L.uOcc : L.lOcc;
  const numY = upper ? L.nu : L.nl;
  // The number the chart SHOWS: numbering system and milk remap, like every
  // tooth number the anatomical chart prints.
  // A selected tooth shows its number as a PILL (handoff: the main selection
  // marker). Both faces are drawn; the view shows one by stamping
  // `.is-selected` (SchematicChart), so selecting needs no rebuild.
  const nums = teeth.map((tn, i) => {
    if (hidden(tn)) return "";
    const x = i * CELL_W + CELL_W / 2, txt = escapeXml(label(tn));
    const pw = Math.max(34, txt.length * 9 + 12);
    return `<text class="schem-num" data-tooth="${tn}" x="${x}" y="${numY}" text-anchor="middle" font-size="14" font-weight="600" fill="${P.num}">${txt}</text>`
      + `<g class="schem-num-sel" data-tooth="${tn}"><rect x="${x - pw / 2}" y="${numY - 14.5}" width="${pw}" height="19" rx="9.5" fill="${P.selBg}"/>`
      + `<text x="${x}" y="${numY}" text-anchor="middle" font-size="14" font-weight="700" fill="${P.selFg}">${txt}</text></g>`;
  }).join("");
  const rowSide = teeth.map((tn, i) => {
    if (hidden(tn)) return "";
    return `<g transform="translate(${i * CELL_W},${sideY})">${sideGlyph(tn, getState(tn), /*crownDown*/ upper, P)}</g>`;
  }).join("");
  const rowOccl = teeth.map((tn, i) => hidden(tn) ? "" :
    `<g transform="translate(${i * CELL_W},${occlY})">${occlBox(tn, getState(tn), P)}</g>`).join("");
  // the shorthand lane between side view and top view
  const laneY = upper ? SIDE_H : L.lOcc + OCCL_H - 4;
  const lanes = teeth.map((tn, i) => {
    if (hidden(tn)) return "";
    const [a, b] = laneTokens(tn, getState(tn));
    const x = i * CELL_W + CELL_W / 2;
    return laneLine(a, x, laneY + 15, P) + laneLine(b, x, laneY + 29, P);
  }).join("");
  // Brücke: the members of each bridge (abutment crowns + pontics, from the same
  // `bridgeConstructions` the anatomical overlay draws) are JOINED — between
  // neighbouring top views and neighbouring side-view crowns, versorgt. Drawn
  // BEFORE the rows so the teeth lie on top and only the joint shows.
  const connectors: string[] = [];
  for (const span of bridgeConstructions(getState)) {
    if (!teeth.includes(span[0])) continue;
    for (let k = 0; k + 1 < span.length; k++) {
      const a = teeth.indexOf(span[k]), b = teeth.indexOf(span[k + 1]);
      if (a < 0 || b !== a + 1) continue;
      const sa = toothShape(span[k], getState(span[k])), sb = toothShape(span[k + 1], getState(span[k + 1]));
      const ox1 = a * CELL_W + sa.bbox[2] - 2, ox2 = b * CELL_W + sb.bbox[0] + 2;
      connectors.push(`<rect class="schematic-bridge" x="${ox1.toFixed(1)}" y="${occlY + 29}" width="${(ox2 - ox1).toFixed(1)}" height="10" fill="${P.neutral}" stroke="${P.neutralEdge}" stroke-width="1.2"/>`);
      const sx1 = a * CELL_W + sa.crownX[1] - 3, sx2 = b * CELL_W + sb.crownX[0] + 3;
      const mid = ((sa.top + sa.cerv) / 2 + (sb.top + sb.cerv) / 2) / 2;
      const cy = upper ? SIDE_H - mid : mid;
      connectors.push(`<rect class="schematic-bridge" x="${sx1.toFixed(1)}" y="${(sideY + cy - 5).toFixed(1)}" width="${(sx2 - sx1).toFixed(1)}" height="10" fill="${P.neutral}" stroke="${P.neutralEdge}" stroke-width="1.2"/>`);
    }
  }
  // Clicks: one transparent rect per tooth column — the upper arch from the top
  // to between the number rows, the lower from there to the bottom — laid LAST
  // so it captures the click for the side view, the lane and the top view.
  const hy0 = upper ? 0 : L.split, hy1 = upper ? L.split : L.H;
  const hits = teeth.map((tn, i) => hidden(tn) ? "" :
    `<rect class="schematic-hit" data-tooth="${tn}" x="${i * CELL_W}" y="${hy0}" width="${CELL_W}" height="${hy1 - hy0}" rx="6" fill="transparent"/>`).join("");
  // Endo per canal: a hit rect over each canal's ROOT region, on top of the
  // column rect; only on a present natural/milk tooth — an implant has no canal.
  const canalHits = teeth.map((tn, i) => {
    const s = getState(tn);
    if (hidden(tn)) return "";
    if (s.toothSelection !== "tooth-base" && s.toothSelection !== "milktooth") return "";
    const sh = toothShape(tn, s);
    const canals = toothCanals(tn);
    const rs = rootsOfShape(sh);
    const rootTop = upper ? SIDE_H - sh.apex : sh.cerv;   // upper is flipped -> roots up
    const rh = sh.apex - sh.cerv;
    return canals.map((name, j) => {
      // one key per drawn root, or (a primary molar) one key over all of them
      const [l, r] = canals.length === rs.length ? [rs[j].l, rs[j].r] : sh.neck;
      return `<rect class="schematic-canal-hit" data-tooth="${tn}" data-canal="${name}" x="${(i * CELL_W + l).toFixed(1)}" y="${(sideY + rootTop).toFixed(1)}" width="${(r - l).toFixed(1)}" height="${rh.toFixed(1)}" fill="transparent"/>`;
    }).join("");
  }).join("");
  // Verblockung: a grey bar over each run of >=2 adjacent splinted teeth, near
  // the crown edge of the side row — the finding the anatomical overlay draws.
  const splintBars: string[] = [];
  {
    const y = sideY + SIDE_H * (upper ? 0.72 : 0.28);
    let run: number[] = [];
    const flush = () => {
      if (run.length >= 2) {
        const i0 = teeth.indexOf(run[0]), i1 = teeth.indexOf(run[run.length - 1]);
        const x = i0 * CELL_W + 8, wBar = (i1 - i0) * CELL_W + CELL_W - 16;
        splintBars.push(`<rect class="schem-splint" x="${x}" y="${(y - 2.5).toFixed(1)}" width="${wBar}" height="5" rx="2.5" fill="${P.metal}" stroke="${P.post}" stroke-width="0.75"/>`);
      }
      run = [];
    };
    teeth.forEach(tn => { if (getState(tn).splinted) run.push(tn); else flush(); });
    flush();
  }
  // Schiene (occlusal splint): a translucent guard band over the top views of
  // each run of teeth under the appliance (a splint may sit on one tooth).
  const splintGuard: string[] = [];
  {
    const y = occlY + OCCL_H / 2;
    let run: number[] = [];
    const flush = () => {
      if (run.length >= 1) {
        const i0 = teeth.indexOf(run[0]), i1 = teeth.indexOf(run[run.length - 1]);
        const x = i0 * CELL_W + 6, wBar = (i1 - i0) * CELL_W + CELL_W - 12;
        splintGuard.push(`<rect x="${x}" y="${(y - 9).toFixed(1)}" width="${wBar}" height="18" rx="8" fill="#7fb3d5" fill-opacity="0.4" stroke="#4a7fb5" stroke-width="0.75"/>`);
      }
      run = [];
    };
    teeth.forEach(tn => { if (getState(tn).occlusalSplint) run.push(tn); else flush(); });
    flush();
  }
  // Clickable surface zones over the top view, laid LAST, only on a tooth that
  // carries surfaces (present natural/milk tooth).
  const surfHits = teeth.map((tn, i) => {
    const s = getState(tn);
    if (hidden(tn)) return "";
    if (s.toothSelection !== "tooth-base" && s.toothSelection !== "milktooth") return "";
    return `<g transform="translate(${i * CELL_W},${occlY})">${occlSurfaceHits(tn, s)}</g>`;
  }).join("");
  const pockets = opts.pocketDepths ? pocketLayer(teeth, getState, upper, sideY, opts.pocketDepths, hidden) : "";
  return nums + connectors.join("") + rowSide + rowOccl + lanes + pockets + hits + canalHits + splintBars.join("") + splintGuard.join("") + surfHits;
}

/** Full schematic chart as one standalone <svg> string. */
export function buildSchematicSvg(getState: GetDisplayState, opts: SchematicOptions = {}): string {
  const P = PALETTES[opts.theme ?? "light"];
  const L = layout();
  const band = `<rect class="schem-band" x="2" y="${L.bandY}" width="${ARCH_W - 4}" height="${L.bandH}" rx="14" fill="${P.band}"/>`;
  const midline = `<line x1="${MID_X}" y1="4" x2="${MID_X}" y2="${L.H - 4}" stroke="${P.mid}" stroke-width="1.2"/>`;
  const upper = archRows(UPPER_ARCH, getState, /*upper*/ true, opts, P, L);
  const lower = archRows(LOWER_ARCH, getState, /*upper*/ false, opts, P, L);
  // No width/height attribute: the size is set in CSS (max-width AND max-height),
  // so the chart can be capped to a share of the VIEWPORT HEIGHT and the finding
  // dock always fits below it on a laptop screen (Dirk, 31.08.2026).
  return `<svg class="schematic-chart" viewBox="0 0 ${ARCH_W} ${L.H}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system,system-ui,sans-serif">${band}${midline}${upper}${lower}</svg>`;
}
