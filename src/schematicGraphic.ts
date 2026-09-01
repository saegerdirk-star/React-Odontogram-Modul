// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026

/**
 * DOM-free renderer for the SCHEMATIC chart view (Dirk, 24.08.2026): a second,
 * toggleable representation of the findings, geometric and deliberately NOT
 * charly (own shapes). Per tooth two stacked glyphs like the anatomical layout:
 *   - a SIDE view = crown 2/5 of length + roots 3/5, crown facing the occlusal
 *     plane (middle), roots outward; crown width Front = premolar, molars wider;
 *     root count 1/2/3 from `rootsOf`; the roots fill the cervical at crown width.
 *   - a DRAUFSICHT = a rounded five-surface box (O centre, M/D/B/L outer).
 *
 * Pure string generation over a `getState` reader (`ToothDisplayState`). No new
 * odontogram state, no payload/FHIR change → parity-free. Phase 1 is DISPLAY
 * ONLY; interactivity is a later phase.
 */
import { rootsOf, isUpperTooth, isAnteriorTooth, type ToothDisplayState } from "./odontogram";

// Arch order (occlusal-to-occlusal in the middle): upper side glyphs point their
// roots UP, lower point DOWN.
export const UPPER_ARCH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const LOWER_ARCH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

const CELL_W = 60;                 // px per tooth column
const SIDE_H = 118;                // side-glyph cell height
const OCCL_H = 74;                 // occlusal-box cell height
const NUM_H = 18;                  // tooth-number row height

// Crown 2/5 : roots 3/5 of the tooth length.
const CROWN_FRAC = 2 / 5;
const TOOTH_LEN = 96;              // drawn tooth length inside the side cell
const CROWN_W_FRONT = 30;          // Front = Praemolar
const CROWN_W_MOLAR = 50;

// --- colours -------------------------------------------------------------
const INK = "#333";
const CARIES = "#c62828";
// direct filling materials
const FILL_COLORS: Record<string, string> = {
  amalgam: "#9aa0a4", composite: "#ece5d6", gic: "#ecd9a6", temporary: "#bcd4ec",
};
// crown/bridge materials (aligned to the anatomical crown tones)
const CROWN_COLORS: Record<string, string> = {
  emax: "#e2d6c4", gold: "#e0a80d", gradia: "#57b285", zircon: "#cfe3ee",
  metal: "#8fb3e0", "metal-ceramic": "#bbd975", telescope: "#d8c9a0", temporary: "#c8b392",
};
// endo per canal (charly WURZELZUSTAND): filling/temporary/incomplete + post.
const ENDO_FILL = "#d98f4a", ENDO_TEMP = "#bcd4ec", ENDO_POST = "#8a9096";
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

function isMolar(toothNo: number): boolean {
  const d = toothNo % 10;
  return d >= 6 && d <= 8;
}
function crownWidth(toothNo: number): number {
  return isMolar(toothNo) ? CROWN_W_MOLAR : CROWN_W_FRONT;
}
function rootCount(toothNo: number): number {
  return Math.max(1, rootsOf(toothNo).length);
}
// mesial faces the arch midline: on the LEFT for quadrants 2/3, RIGHT for 1/4.
function mesialOnLeft(toothNo: number): boolean {
  const q = Math.floor(toothNo / 10);
  return q === 2 || q === 3;
}

// ---------------------------------------------------------------------------
// Side glyph — crown + roots, drawn in a local box (cx = CELL_W/2). `crownDown`
// puts the crown at the bottom (upper arch, roots up); else crown at the top.
// ---------------------------------------------------------------------------
function crownPath(cx: number, w: number, top: number, cerv: number): string {
  const l = cx - w / 2, r = cx + w / 2;
  return `M${l},${top + 9} Q${l},${top} ${cx},${top} Q${r},${top} ${r},${top + 9} L${r},${cerv} L${l},${cerv} Z`;
}
function rootPaths(cx: number, w: number, cerv: number, apex: number, n: number): string[] {
  const l = cx - w / 2, r = cx + w / 2, gap = 2.5;
  const seg = (r - l - (n - 1) * gap) / n;
  const out: string[] = [];
  let x = l;
  for (let i = 0; i < n; i++) {
    const a = x, b = x + seg, mid = (a + b) / 2;
    out.push(`M${a.toFixed(1)},${cerv} L${b.toFixed(1)},${cerv} L${(mid + 2.2).toFixed(1)},${apex - 4} Q${mid.toFixed(1)},${apex} ${(mid - 2.2).toFixed(1)},${apex - 4} Z`);
    x = b + gap;
  }
  return out;
}

// Centre x of each root (same segmentation as rootPaths) — for endo canals.
function rootCenters(cx: number, w: number, n: number): number[] {
  const l = cx - w / 2, r = cx + w / 2, gap = 2.5;
  const seg = (r - l - (n - 1) * gap) / n;
  const out: number[] = [];
  let x = l;
  for (let i = 0; i < n; i++) { out.push(x + seg / 2); x += seg + gap; }
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

function sideGlyph(toothNo: number, s: ToothDisplayState, crownDown: boolean): string {
  const cx = CELL_W / 2;
  const w = crownWidth(toothNo);
  const n = rootCount(toothNo);
  const pad = (SIDE_H - TOOTH_LEN) / 2;
  // canonical: crown at top (pad .. pad+crownH), roots below
  const crownH = TOOTH_LEN * CROWN_FRAC;
  const top = pad, cerv = pad + crownH, apex = pad + TOOTH_LEN;
  const sel = s.toothSelection, sub = s.toothSubstrate, rt = s.restorationType;
  const missing = sel === "none" || sel === "no-tooth-after-extraction";
  const implant = sel === "implant";
  const pontic = missing && rt === "bridge";
  const radix = sub === "radix";
  const crowned = rt === "crown" || rt === "bridge";

  const parts: string[] = [];
  const stroke = `fill="#fff" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"`;
  let anyFill = false, anyPost = false;  // endo canals set these; the anno badge reads them (fn scope)
  // Resections (fn scope so the endo-canal loop below can respect them):
  //  - WSR (endoResection): the apex is cut, the tooth stays whole → each root
  //    is drawn SHORTER and a red line marks the cut.
  //  - Hemisection/Amputation: one root (rootResectionRoot) is REMOVED → its
  //    root is drawn as a faint stump and its canal is not filled.
  const roots = rootsOf(toothNo);
  const removes = s.rootResection === "hemisection" || s.rootResection === "amputation";
  const removedIdx = removes && s.rootResectionRoot ? roots.indexOf(s.rootResectionRoot) : -1;
  const apexEff = s.endoResection ? cerv + (apex - cerv) * 0.76 : apex;

  if (missing && !pontic) {
    // ghost outline only
    parts.push(`<path d="${crownPath(cx, w, top, cerv)}" fill="none" stroke="#c9c9c9" stroke-width="1.2" stroke-dasharray="3 3"/>`);
    for (const d of rootPaths(cx, w, cerv, apex, n)) parts.push(`<path d="${d}" fill="none" stroke="#c9c9c9" stroke-width="1.2" stroke-dasharray="3 3"/>`);
  } else {
    // crown fill
    let crownFill = "#fff";
    if (crowned) crownFill = CROWN_COLORS[s.restorationMaterial] ?? "#ddd";
    if (!radix && !pontic) {
      parts.push(`<path d="${crownPath(cx, w, top, cerv)}" fill="${crownFill}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`);
    } else if (pontic) {
      // floating crown, no roots
      parts.push(`<path d="${crownPath(cx, w, top, cerv)}" fill="${crownFill}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`);
    }
    // roots — an IMPLANT has none: a single screw body with a threaded (zig-zag)
    // edge, not the natural roots. Otherwise the data-driven root count.
    if (!pontic) {
      if (implant) {
        // Implantatposition: center | mesial | distal | both. mesial faces the
        // arch midline (mesialOnLeft, quadrant 2/3). "both" draws two narrower
        // screws (mesial + distal); the others one, offset by position.
        const off = (w / 2) * 0.55;
        const mx = mesialOnLeft(toothNo) ? -off : off;
        const both = s.implantPosition === "both";
        const dxs = s.implantPosition === "mesial" ? [mx]
          : s.implantPosition === "distal" ? [-mx]
          : both ? [mx, -mx] : [0];
        const wTop = both ? 13 : 20, wBot = both ? 6 : 9;
        for (const dx of dxs) parts.push(`<path d="${screwPath(cx + dx, wTop, wBot, cerv, apex)}" fill="#dfe4e8" stroke="#8a9096" stroke-width="1.5" stroke-linejoin="round"/>`);
      } else {
        const rds = rootPaths(cx, w, cerv, apexEff, n);
        const rcenters = rootCenters(cx, w, n);
        const rootHalf = (w / n) / 2;
        rds.forEach((d, i) => {
          if (i === removedIdx) {
            // removed root: faint dashed stump + a red cut line at the neck
            const stumpBot = cerv + (apex - cerv) * 0.18;
            parts.push(`<path d="${rootPaths(cx, w, cerv, stumpBot, n)[i]}" fill="#f2f2f2" stroke="#c9c9c9" stroke-width="1.2" stroke-dasharray="2 2"/>`);
            parts.push(`<line x1="${(rcenters[i] - rootHalf).toFixed(1)}" y1="${(cerv + 1).toFixed(1)}" x2="${(rcenters[i] + rootHalf).toFixed(1)}" y2="${(cerv + 1).toFixed(1)}" stroke="#b70000" stroke-width="2" stroke-linecap="round"/>`);
            return;
          }
          parts.push(`<path d="${d}" ${stroke}/>`);
        });
        // WSR: a red resection line across the shortened apex of each retained root
        if (s.endoResection) {
          rcenters.forEach((rc, i) => {
            if (i === removedIdx) return;
            parts.push(`<line x1="${(rc - rootHalf * 0.9).toFixed(1)}" y1="${apexEff.toFixed(1)}" x2="${(rc + rootHalf * 0.9).toFixed(1)}" y2="${apexEff.toFixed(1)}" stroke="#b70000" stroke-width="2" stroke-linecap="round"/>`);
          });
        }
        // premolarisation: both roots kept, the tooth is SPLIT — a vertical
        // separation line through crown and roots (no root removed).
        if (s.rootResection === "premolarisation" && n >= 2) {
          parts.push(`<line x1="${cx}" y1="${(top + 3).toFixed(1)}" x2="${cx}" y2="${(apexEff - 2).toFixed(1)}" stroke="#8a6d3b" stroke-width="1.4" stroke-dasharray="3 2"/>`);
        }
      }
    }
    // veneer: colour the buccal face (a strip on the crown)
    if (rt === "veneer") {
      parts.push(`<rect x="${cx - w / 2 + 2}" y="${top + 3}" width="${w - 4}" height="${(cerv - top) - 5}" rx="2" fill="${CROWN_COLORS[s.restorationMaterial] ?? "#e2d6c4"}" opacity="0.9"/>`);
    }
    const half = w / 2, crownH2 = cerv - top;
    // crown fracture (toothSubstrate "broken" and/or charly's 3-way severity in
    // crownFractureType): a crack down the crown — the CROWN is broken, as opposed
    // to `Fra`/rootFracture below. Severity modulates the line: crack = hairline,
    // split = jagged zig-zag, fracture = a wider jag drawn as a split gap.
    if ((sub === "broken" || s.crownFractureType !== "none") && !radix && !pontic) {
      const yA = top + 3, yB = cerv - 1, steps = 4;
      const sev = s.crownFractureType;
      const amp = sev === "crack" ? 2 : 5;
      const sw = sev === "crack" ? 1.2 : sev === "fracture" ? 2.6 : 1.8;
      const jag = (o: number) => {
        const pts: string[] = [];
        for (let i = 0; i <= steps; i++) pts.push(`${(cx + o + (i % 2 === 0 ? -amp : amp)).toFixed(1)},${(yA + (yB - yA) * (i / steps)).toFixed(1)}`);
        return `<polyline points="${pts.join(" ")}" fill="none" stroke="#222" stroke-width="${sw}" stroke-linejoin="round"/>`;
      };
      // a full "fracture" reads as a gap: two jagged lines a hair apart
      if (sev === "fracture") { parts.push(jag(-1.5)); parts.push(jag(1.5)); }
      else parts.push(jag(0));
    }
    // calculus (charly's Zahnstein): tan deposits at the cervical neck, on the
    // coronal side — distinct in colour and side from the red root-caries band.
    if (s.calculus) {
      parts.push(`<rect x="${cx - half}" y="${cerv - 4}" width="${w}" height="4" rx="1.5" fill="#bfa15c"/>`);
      for (let i = 0; i < 3; i++) parts.push(`<circle cx="${(cx - half + w * (0.25 + i * 0.25)).toFixed(1)}" cy="${cerv - 2}" r="2.2" fill="#bfa15c"/>`);
    }
    // eruption (charly's D): shade the still-submerged part of the crown (the
    // neck side) with a gum band — the tooth erupts tip-first, so the erupted
    // fraction grows emerging → half → full.
    if (s.eruptionStage !== "none") {
      const eruptedFrac = s.eruptionStage === "emerging" ? 0.2 : s.eruptionStage === "half-crown" ? 0.5 : 0.8;
      const gumY = top + crownH2 * eruptedFrac;
      parts.push(`<rect x="${cx - half}" y="${gumY.toFixed(1)}" width="${w}" height="${(cerv - gumY).toFixed(1)}" fill="#e9b8b1" opacity="0.6"/>`);
      parts.push(`<line x1="${cx - half}" y1="${gumY.toFixed(1)}" x2="${cx + half}" y2="${gumY.toFixed(1)}" stroke="#cf9089" stroke-width="1.2"/>`);
    }
    // retention (charly's clasp/bar pictures, bead odontogram-dma): a metal clasp
    // hook, a bar, or a rigid attachment block at the neck.
    if (s.retention === "clasp" || s.retention === "attachment" || s.retention === "bar-abutment") {
      const metal = "#7b838c";
      if (s.retention === "bar-abutment") {
        parts.push(`<rect x="${cx - half - 2}" y="${cerv - 1}" width="${w + 4}" height="3" rx="1.5" fill="${metal}"/>`);
      } else if (s.retention === "attachment") {
        parts.push(`<rect x="${cx - 3}" y="${cerv - 2}" width="6" height="5" fill="${metal}"/>`);
      } else {
        const ex = mesialOnLeft(toothNo) ? cx - half : cx + half, dir = mesialOnLeft(toothNo) ? -1 : 1;
        parts.push(`<path d="M${ex},${cerv - 9} Q${(ex + dir * 5).toFixed(1)},${cerv - 3} ${(ex + dir * 1).toFixed(1)},${cerv + 3}" fill="none" stroke="${metal}" stroke-width="2" stroke-linecap="round"/>`);
      }
    }
    // --- secondary finding symbols (canonical coords, flip WITH the tooth) ---
    const rootLen = apex - cerv;
    // Wurzelkappe (charly): a metal coping over the top of a root remnant — a
    // dome on the cervical line bulging into the (empty) crown space.
    if (s.rootCap && radix) {
      parts.push(`<path d="M${(cx - w / 2).toFixed(1)},${cerv} Q${cx},${(cerv - 11).toFixed(1)} ${(cx + w / 2).toFixed(1)},${cerv} Z" fill="#c7ccd0" stroke="#7b838c" stroke-width="1.4" stroke-linejoin="round"/>`);
    }
    // root caries: a red neck band across the root just below the cervical line
    if (s.rootCaries !== "none") {
      const op = s.rootCaries === "active" ? 0.5 : s.rootCaries === "arrested" ? 0.7 : 1;
      parts.push(`<rect x="${cx - w / 2}" y="${cerv}" width="${w}" height="6" fill="${CARIES}" opacity="${op}"/>`);
    }
    // endo PER CANAL: each root's canal carries a findings set {filling,
    // temporary, incomplete, post}. WF and post coexist (both drawn); an
    // untreated canal draws nothing (visible as an empty root). Falls back to
    // the legacy whole-tooth `endo` scalar when no per-canal detail is charted.
    const canals = toothCanals(toothNo);
    const centers = rootCenters(cx, w, canals.length);
    const legacy = legacyEndoFindings(s.endo);
    const hasPerCanalDetail = Object.values(s.endoCanals).some((findings) => findings.length > 0);
    if (!implant) {
      canals.forEach((name, i) => {
        if (i === removedIdx) return;   // a removed root has no canal to fill
        const canalFindings = (s.endoCanals[name] && s.endoCanals[name].length) ? s.endoCanals[name] : legacy;
        // A whole-tooth root-post value is a fallback only. Once any canal has
        // explicit detail, draw posts exclusively where that detail says
        // `post`; synthesizing the global value into every canal destroys the
        // per-canal distinction the schematic view exists to show.
        const f = !hasPerCanalDetail && s.rootPostType !== "none" && !canalFindings.includes("post")
          ? [...canalFindings, "post"]
          : canalFindings;
        if (!f.length) return;
        const rx = centers[i] ?? cx;
        if (f.includes("filling") || f.includes("temporary") || f.includes("incomplete")) {
          anyFill = true;
          const frac = f.includes("incomplete") ? 0.82 : 0.94;
          const col = f.includes("temporary") ? ENDO_TEMP : ENDO_FILL;
          const yb = Math.min(cerv + rootLen * frac, apexEff - 1);   // don't overshoot a WSR cut
          parts.push(`<line x1="${rx.toFixed(1)}" y1="${cerv + 1}" x2="${rx.toFixed(1)}" y2="${yb.toFixed(1)}" stroke="${col}" stroke-width="2.4" stroke-linecap="round"/>`);
        }
        if (f.includes("post")) {
          anyPost = true;
          const yb = Math.min(cerv + rootLen * 0.5, apexEff - 1);
          parts.push(`<line x1="${rx.toFixed(1)}" y1="${cerv + 1}" x2="${rx.toFixed(1)}" y2="${yb.toFixed(1)}" stroke="${ENDO_POST}" stroke-width="3.6" stroke-linecap="round"/>`);
        }
      });
    }
    const endoTreated = anyFill || anyPost;
    // diseased pulp (only when not endo-treated): a red dot at the crown base
    if (s.pulpDx !== "normal" && !endoTreated) {
      parts.push(`<circle cx="${cx}" cy="${cerv - 5}" r="3" fill="${CARIES}"/>`);
    }
    // apical lesion at the root apex, three-way (Dirk, 24.08.2026): a cyst is a
    // ring (defined border), an abscess a filled disc with rays (acute/pus),
    // otherwise a filled disc (granuloma / Beherdung).
    if (s.apicalDx !== "normal") {
      const ay = apex - 5, r = 6.5;
      // charly: a lesion on a NAMED root sits at that root's apex, not the centre.
      const aroots = rootsOf(toothNo);
      const acenters = rootCenters(cx, w, aroots.length || 1);
      const ai = s.apicalRoot ? aroots.indexOf(s.apicalRoot) : -1;
      const ax = ai >= 0 ? acenters[ai] : cx;
      if (s.periapicalType === "cyst") {
        parts.push(`<circle cx="${ax}" cy="${ay}" r="${r}" fill="#fff" stroke="${CARIES}" stroke-width="1.6"/>`);
      } else if (s.apicalDx.includes("abscess")) {
        const rays = Array.from({ length: 8 }, (_, k) => {
          const a = (k / 8) * Math.PI * 2;
          return `<line x1="${(ax + Math.cos(a) * r).toFixed(1)}" y1="${(ay + Math.sin(a) * r).toFixed(1)}" x2="${(ax + Math.cos(a) * (r + 3)).toFixed(1)}" y2="${(ay + Math.sin(a) * (r + 3)).toFixed(1)}" stroke="${CARIES}" stroke-width="1.2"/>`;
        }).join("");
        parts.push(`${rays}<circle cx="${ax}" cy="${ay}" r="${r}" fill="${CARIES}" opacity="0.85"/>`);
      } else {
        parts.push(`<circle cx="${ax}" cy="${ay}" r="${r}" fill="${CARIES}" opacity="0.8"/>`);
      }
    }
    // crown marginal leakage: a red dashed line on the cervical margin
    if (s.crownLeakage && crowned) {
      parts.push(`<line x1="${cx - w / 2}" y1="${cerv}" x2="${cx + w / 2}" y2="${cerv}" stroke="${CARIES}" stroke-width="1.6" stroke-dasharray="2 2"/>`);
    }
    // typed + sided crown-margin finding (charly überstehend/Karies/Füllung): a
    // coloured segment on the cervical margin over the affected side (mesial/
    // distal → half; buccal/lingual → whole), overhang adds a small ledge.
    if (s.crownMarginType !== "none" && crowned) {
      const col = s.crownMarginType === "caries" ? CARIES : s.crownMarginType === "overhang" ? "#555" : "#4a7fb5";
      const mLeft = mesialOnLeft(toothNo);
      let x1 = cx - w / 2, x2 = cx + w / 2;
      if (s.crownMarginSide === "mesial") { if (mLeft) x2 = cx; else x1 = cx; }
      else if (s.crownMarginSide === "distal") { if (mLeft) x1 = cx; else x2 = cx; }
      parts.push(`<line x1="${x1.toFixed(1)}" y1="${cerv}" x2="${x2.toFixed(1)}" y2="${cerv}" stroke="${col}" stroke-width="2.4" stroke-linecap="round"/>`);
      if (s.crownMarginType === "overhang") parts.push(`<rect x="${(((x1 + x2) / 2) - 2).toFixed(1)}" y="${(cerv - 1).toFixed(1)}" width="4" height="3" fill="${col}"/>`);
    }
  }
  // extraction cross over the whole glyph (symmetric → safe to flip)
  if (s.extractionPlan) {
    parts.push(`<g stroke="#b70000" stroke-width="2.2"><line x1="8" y1="${top}" x2="${CELL_W - 8}" y2="${apex}"/><line x1="${CELL_W - 8}" y1="${top}" x2="8" y2="${apex}"/></g>`);
  }

  let g = parts.join("");
  // flip vertically for the upper arch so roots point up / crown faces the middle
  if (crownDown) g = `<g transform="translate(0,${SIDE_H}) scale(1,-1)">${g}</g>`;

  // upright text annotations, added AFTER the flip so they never read upside down.
  const anno: string[] = [];
  const badge = crowned ? (rt === "bridge" ? "B" : "K") : rt === "veneer" ? "V" : rt === "onlay" ? "On" : rt === "inlay" ? "I" : "";
  if (badge) anno.push(`<text x="${CELL_W - 5}" y="14" text-anchor="end" font-size="11" font-weight="600" fill="${INK}">${badge}</text>`);
  if (!implant && (anyFill || anyPost)) {
    const t = anyFill && anyPost ? "WF·St" : anyPost ? "St" : "WF";
    anno.push(`<text x="${CELL_W - 5}" y="${SIDE_H - 4}" text-anchor="end" font-size="9" fill="#b5722f">${t}</text>`);
  }
  const mob = { m1: "I", m2: "II", m3: "III" }[s.mobility] ?? "";
  if (mob) anno.push(`<text x="5" y="${SIDE_H - 4}" font-size="10" fill="#666">${mob}</text>`);
  // resection labels (top-left): Hem/Amp/Prä for a split/removed root, WSR for
  // an apicoectomy — both can apply (a hemisected tooth can also carry a WSR).
  const resTxt = [
    s.rootResection === "hemisection" ? "Hem" : s.rootResection === "amputation" ? "Amp" : s.rootResection === "premolarisation" ? "Prä" : "",
    s.endoResection ? "WSR" : "",
  ].filter(Boolean).join("·");
  if (resTxt) anno.push(`<text x="5" y="14" font-size="9" fill="#b70000">${resTxt}</text>`);

  return g + anno.join("");
}

// ---------------------------------------------------------------------------
// Occlusal five-surface box. Surfaces: O centre, plus M/D/B/L outer zones.
// ---------------------------------------------------------------------------
const SURF_KEYS = ["mesial", "distal", "buccal", "lingual", "occlusal"] as const;
function surfaceColor(surf: string, s: ToothDisplayState): string | null {
  const filled = s.fillingSurfaces.includes(surf);
  const carious = s.caries.includes(`caries-${surf}`);   // caries Set keys are `caries-<surface>`
  if (filled) {
    const mat = s.fillingSurfaceMaterials[surf] ?? "composite";
    return FILL_COLORS[mat] ?? "#ece5d6";
  }
  if (carious) return CARIES;
  return null;
}

function occlBox(toothNo: number, s: ToothDisplayState): string {
  // box coords in a CELL_W x OCCL_H cell, centred. ANTERIOR teeth (13-23, 43-33)
  // have no occlusal table but an INCISAL EDGE — their top view is a wider,
  // flatter box whose centre is a horizontal incisal-edge BAR (mesiodistal)
  // rather than the molar occlusal square (Dirk, 30.08.2026).
  const anterior = isAnteriorTooth(toothNo);
  const bw = 44, cx = CELL_W / 2, cy = OCCL_H / 2;
  const boxW = bw, boxH = anterior ? 30 : bw;
  const inW = anterior ? 26 : 18, inH = anterior ? 9 : 18;
  const x0 = cx - boxW / 2, y0 = cy - boxH / 2;
  const ix0 = cx - inW / 2, iy0 = cy - inH / 2;
  const outerRx = anterior ? 6 : 8, innerRx = anterior ? 3 : 4;
  const missing = s.toothSelection === "none" || s.toothSelection === "no-tooth-after-extraction";
  const parts: string[] = [];
  if (missing && s.restorationType !== "bridge") {
    parts.push(`<rect x="${x0}" y="${y0}" width="${boxW}" height="${boxH}" rx="${outerRx}" fill="none" stroke="#c9c9c9" stroke-width="1.2" stroke-dasharray="3 3"/>`);
    return parts.join("");
  }
  // outer zones as coloured trapezoids between the inner region and the outer box.
  // B = top, L = bottom; the LEFT/RIGHT zones are mesial/distal by quadrant so
  // mesial always faces the arch midline (mesialOnLeft = quadrant 2/3). For an
  // anterior the inner region is the incisal bar, so buccal/lingual become thin
  // labial/palatal strips and the centre reads as the biting edge.
  const leftShape = `M${x0},${y0} L${x0},${y0 + boxH} L${ix0},${iy0 + inH} L${ix0},${iy0} Z`;
  const rightShape = `M${x0 + boxW},${y0} L${x0 + boxW},${y0 + boxH} L${ix0 + inW},${iy0 + inH} L${ix0 + inW},${iy0} Z`;
  const topShape = `M${x0},${y0} L${x0 + boxW},${y0} L${ix0 + inW},${iy0} L${ix0},${iy0} Z`;
  const botShape = `M${x0},${y0 + boxH} L${x0 + boxW},${y0 + boxH} L${ix0 + inW},${iy0 + inH} L${ix0},${iy0 + inH} Z`;
  const onLeft = mesialOnLeft(toothNo);
  const zones: [string, string][] = [
    ["buccal", topShape], ["lingual", botShape],
    [onLeft ? "mesial" : "distal", leftShape], [onLeft ? "distal" : "mesial", rightShape],
  ];
  // The zone trapezoids run to the SQUARE outer corners, but the outline is
  // rounded (rx=8) — so a coloured surface poked past the rounding (Dirk,
  // 24.08.2026). Clip the fills to the same rounded box the outline draws.
  const zonePaths: string[] = [];
  for (const [surf, shape] of zones) {
    const c = surfaceColor(surf, s);
    if (c) zonePaths.push(`<path d="${shape}" fill="${c}" opacity="0.9"/>`);
  }
  if (zonePaths.length) {
    const clipId = `occlClip-${toothNo}`;
    parts.push(`<clipPath id="${clipId}"><rect x="${x0}" y="${y0}" width="${boxW}" height="${boxH}" rx="${outerRx}"/></clipPath>`);
    parts.push(`<g clip-path="url(#${clipId})">${zonePaths.join("")}</g>`);
  }
  // Teilkrone pro Fläche (charly TEILKRONE1-4): mark the surfaces a partial crown
  // (onlay) covers with the crown material tone, so a partial onlay reads as
  // partial. Empty coverage = whole table, drawn as the "On" badge alone.
  if (s.restorationType === "onlay" && s.onlayCoverage.length) {
    const col = CROWN_COLORS[s.restorationMaterial] ?? "#cbb26b";
    const occlShape = `M${ix0},${iy0} h${inW} v${inH} h${-inW} Z`;
    const surfShape: Record<string, string> = {
      buccal: topShape, lingual: botShape, occlusal: occlShape,
      [onLeft ? "mesial" : "distal"]: leftShape,
      [onLeft ? "distal" : "mesial"]: rightShape,
    };
    const clipId = `onlayClip-${toothNo}`;
    const covered = s.onlayCoverage.map(surf => surfShape[surf]).filter(Boolean)
      .map(d => `<path d="${d}" fill="${col}" opacity="0.6" stroke="${INK}" stroke-width="0.8"/>`).join("");
    parts.push(`<clipPath id="${clipId}"><rect x="${x0}" y="${y0}" width="${boxW}" height="${boxH}" rx="${outerRx}"/></clipPath>`);
    parts.push(`<g clip-path="url(#${clipId})">${covered}</g>`);
  }
  const oc = surfaceColor("occlusal", s);
  parts.push(`<rect x="${x0}" y="${y0}" width="${boxW}" height="${boxH}" rx="${outerRx}" fill="none" stroke="${INK}" stroke-width="1.5"/>`);
  // Centre: the molar occlusal square, or the anterior incisal-edge bar. The bar
  // carries a slightly heavier top line — that is the biting edge itself.
  parts.push(`<rect x="${ix0}" y="${iy0}" width="${inW}" height="${inH}" rx="${innerRx}" fill="${oc ?? "#fff"}" stroke="${INK}" stroke-width="1.2"/>`);
  if (anterior) {
    parts.push(`<line x1="${ix0 + 1}" y1="${cy}" x2="${ix0 + inW - 1}" y2="${cy}" stroke="${INK}" stroke-width="1.4"/>`);
  } else {
    // short corner ticks (posterior only)
    const t = 6;
    parts.push(`<g stroke="${INK}" stroke-width="0.9">`
      + `<line x1="${ix0}" y1="${iy0}" x2="${ix0 - t}" y2="${iy0 - t}"/>`
      + `<line x1="${ix0 + inW}" y1="${iy0}" x2="${ix0 + inW + t}" y2="${iy0 - t}"/>`
      + `<line x1="${ix0}" y1="${iy0 + inH}" x2="${ix0 - t}" y2="${iy0 + inH + t}"/>`
      + `<line x1="${ix0 + inW}" y1="${iy0 + inH}" x2="${ix0 + inW + t}" y2="${iy0 + inH + t}"/></g>`);
  }
  // charly Funktion: an occlusal function marker at the table centre — premature
  // contact = a red dot, interference = a red chevron, overload = a red ring.
  const fn = s.occlusalFunction;
  if (fn && fn !== "none") {
    const red = "#c62828";
    if (fn === "premature") parts.push(`<circle cx="${cx}" cy="${cy}" r="3.4" fill="${red}"/>`);
    else if (fn === "interference") parts.push(`<path d="M${cx - 4},${cy - 4} L${cx + 3},${cy} L${cx - 4},${cy + 4}" fill="none" stroke="${red}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`);
    else parts.push(`<circle cx="${cx}" cy="${cy}" r="5" fill="none" stroke="${red}" stroke-width="2"/>`);
  }
  return parts.join("");
}

/** Transparent, CLICKABLE surface zones over the occlusal box — one per surface,
 *  carrying `data-tooth` and `data-surf` (the shorthand char m/o/d/v/l). Same
 *  geometry as `occlBox`; laid on TOP of the column hit rect so a click on a
 *  surface enters a finding there, a click elsewhere still selects the tooth. */
function occlSurfaceHits(toothNo: number): string {
  const anterior = isAnteriorTooth(toothNo);
  const bw = 44, cx = CELL_W / 2, cy = OCCL_H / 2;
  const boxW = bw, boxH = anterior ? 30 : bw;
  const inW = anterior ? 26 : 18, inH = anterior ? 9 : 18;
  const x0 = cx - boxW / 2, y0 = cy - boxH / 2;
  const ix0 = cx - inW / 2, iy0 = cy - inH / 2;
  const leftShape = `M${x0},${y0} L${x0},${y0 + boxH} L${ix0},${iy0 + inH} L${ix0},${iy0} Z`;
  const rightShape = `M${x0 + boxW},${y0} L${x0 + boxW},${y0 + boxH} L${ix0 + inW},${iy0 + inH} L${ix0 + inW},${iy0} Z`;
  const topShape = `M${x0},${y0} L${x0 + boxW},${y0} L${ix0 + inW},${iy0} L${ix0},${iy0} Z`;
  const botShape = `M${x0},${y0 + boxH} L${x0 + boxW},${y0 + boxH} L${ix0 + inW},${iy0 + inH} L${ix0},${iy0 + inH} Z`;
  const occlShape = `M${ix0},${iy0} h${inW} v${inH} h${-inW} Z`;
  const onLeft = mesialOnLeft(toothNo);
  // surface -> shorthand char: mesial m, distal d, buccal v, lingual l, occlusal o
  const zones: [string, string][] = [
    ["v", topShape], ["l", botShape], ["o", occlShape],
    [onLeft ? "m" : "d", leftShape], [onLeft ? "d" : "m", rightShape],
  ];
  return zones.map(([ch, d]) =>
    `<path class="schematic-surf-hit" data-tooth="${toothNo}" data-surf="${ch}" d="${d}" fill="transparent"/>`).join("");
}

// ---------------------------------------------------------------------------
// Whole chart.
// ---------------------------------------------------------------------------
export type GetDisplayState = (toothNo: number) => ToothDisplayState;

function archRows(teeth: number[], getState: GetDisplayState, sideOnTop: boolean): string {
  // returns two rows of <g> (side + occlusal) plus a number row; y-stacked
  const cols = teeth.length;
  const numY = 0, r1Y = NUM_H, r2Y = NUM_H + (sideOnTop ? SIDE_H : OCCL_H);
  const nums = teeth.map((tn, i) =>
    `<text x="${i * CELL_W + CELL_W / 2}" y="${NUM_H - 5}" text-anchor="middle" font-size="11" fill="#888">${tn}</text>`).join("");
  const rowSide = teeth.map((tn, i) => {
    const g = sideGlyph(tn, getState(tn), /*crownDown*/ isUpperTooth(tn));
    const y = sideOnTop ? r1Y : r2Y;
    return `<g transform="translate(${i * CELL_W},${y})">${g}</g>`;
  }).join("");
  const rowOccl = teeth.map((tn, i) => {
    const y = sideOnTop ? r2Y : r1Y;
    return `<g transform="translate(${i * CELL_W},${y})">${occlBox(tn, getState(tn))}</g>`;
  }).join("");
  // Phase 2 (odontogram-ip3): one transparent hit rect per tooth column, laid
  // LAST so it sits on top and captures the click for BOTH the side glyph and
  // the occlusal box. It carries `data-tooth`; the view delegates off that and
  // marks the active column via `.is-active` (stroke only, so the glyph stays
  // readable). No fill by default — it must not tint the drawing.
  const archH = NUM_H + SIDE_H + OCCL_H;
  const hits = teeth.map((tn, i) =>
    `<rect class="schematic-hit" data-tooth="${tn}" x="${i * CELL_W}" y="0" width="${CELL_W}" height="${archH}" rx="6" fill="transparent"/>`).join("");
  // Endo pro Kanal (odontogram-ip3 Folge): a hit rect over each canal's ROOT
  // region, laid ON TOP of the column rect. A click there cycles that canal
  // (data-canal); a click anywhere else still selects the tooth. Only on a
  // present natural/milk tooth — an implant has no canals.
  const canalHits = teeth.map((tn, i) => {
    const s = getState(tn);
    if(s.toothSelection !== "tooth-base" && s.toothSelection !== "milktooth") return "";
    const canals = toothCanals(tn), n = canals.length, w = crownWidth(tn);
    const centers = rootCenters(CELL_W / 2, w, n);
    const pad = (SIDE_H - TOOTH_LEN) / 2;
    const cerv = pad + TOOTH_LEN * CROWN_FRAC, apex = pad + TOOTH_LEN;
    const seg = w / n, rh = apex - cerv;
    const rootTop = isUpperTooth(tn) ? SIDE_H - apex : cerv;   // upper is flipped → roots up
    const sideY = sideOnTop ? r1Y : r2Y;
    return canals.map((name, j) => {
      const x = i * CELL_W + (centers[j] - seg / 2);
      return `<rect class="schematic-canal-hit" data-tooth="${tn}" data-canal="${name}" x="${x.toFixed(1)}" y="${(sideY + rootTop).toFixed(1)}" width="${seg.toFixed(1)}" height="${rh.toFixed(1)}" fill="transparent"/>`;
    }).join("");
  }).join("");
  // Verblockung: a grey bar over each run of >=2 adjacent splinted teeth in this
  // arch, near the crown (occlusal-facing) edge of the side row — the same finding
  // the anatomical splint overlay draws.
  const splintBars: string[] = [];
  {
    const sideY = sideOnTop ? r1Y : r2Y;
    const y = sideY + SIDE_H * (sideOnTop ? 0.72 : 0.28);
    let run: number[] = [];
    const flush = () => {
      if (run.length >= 2) {
        const i0 = teeth.indexOf(run[0]), i1 = teeth.indexOf(run[run.length - 1]);
        const x = i0 * CELL_W + 8, wBar = (i1 - i0) * CELL_W + CELL_W - 16;
        splintBars.push(`<rect x="${x}" y="${(y - 2.5).toFixed(1)}" width="${wBar}" height="5" rx="2.5" fill="#8a9096" stroke="#5c6166" stroke-width="0.75"/>`);
      }
      run = [];
    };
    teeth.forEach(tn => { if (getState(tn).splinted) run.push(tn); else flush(); });
    flush();
  }
  // Schiene (occlusal splint): a translucent guard band over the occlusal boxes
  // of each run of teeth under the appliance (minLen 1 — a splint may sit on one).
  const splintGuard: string[] = [];
  {
    const occlY = sideOnTop ? r2Y : r1Y;   // occlusal row y for this arch
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
  // Clickable surface zones over the occlusal box, laid LAST (above the column
  // hit) so a click on a surface enters a finding there; only on a tooth that
  // actually carries surfaces (present natural/milk tooth).
  const occlY = sideOnTop ? r2Y : r1Y;
  const surfHits = teeth.map((tn, i) => {
    const s = getState(tn);
    if (s.toothSelection !== "tooth-base" && s.toothSelection !== "milktooth") return "";
    return `<g transform="translate(${i * CELL_W},${occlY})">${occlSurfaceHits(tn)}</g>`;
  }).join("");
  return nums + rowSide + rowOccl + hits + canalHits + splintBars.join("") + splintGuard.join("") + surfHits;
}

/** Full schematic chart as one standalone <svg> string. Upper arch: side glyphs
 *  on top (roots up), occlusal below; lower arch: occlusal on top, side glyphs
 *  below (roots down) — the occlusal plane sits in the middle. */
export function buildSchematicSvg(getState: GetDisplayState): string {
  const w = UPPER_ARCH.length * CELL_W;
  const upperH = NUM_H + SIDE_H + OCCL_H;
  const lowerH = NUM_H + OCCL_H + SIDE_H;
  const gap = 10;
  const h = upperH + gap + lowerH;
  const upper = `<g transform="translate(0,0)">${archRows(UPPER_ARCH, getState, /*sideOnTop*/ true)}</g>`;
  const lower = `<g transform="translate(0,${upperH + gap})">${archRows(LOWER_ARCH, getState, /*sideOnTop*/ false)}</g>`;
  return `<svg class="schematic-chart" viewBox="0 0 ${w} ${h}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system,system-ui,sans-serif">${upper}${lower}</svg>`;
}
