// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
//
// Bead odontogram-sjr: the restoration colours are choosable.
//
// The colours odontogram-58n shipped are the DEFAULTS, not the only answer.
// Every restoration fill in the generated assets is now
// `fill: var(--odon-rest-gold, #e0a80d)` and the like, so choosing a colour is
// setting a custom property — the cascade repaints, and no JavaScript runs in
// the render path at all. An unconfigured chart is byte-identical to before,
// because nothing is set and every fallback is the shipped colour.
//
// This module is DOM-free apart from one setter, so the derivation can be
// tested without a browser.

/** A colour a practice can choose. `vars` is what it drives; the first entry's
 *  default is what a picker shows when nothing has been chosen. */
export interface PaletteEntry {
  /** Stable key: the settings id, the storage key, and the i18n suffix. */
  key: string;
  /** CSS custom properties this entry writes, in order. */
  vars: string[];
  /** The shipped colour(s) — `vars[i]`'s fallback in the assets. */
  defaults: string[];
  /** How the entry's remaining vars follow the picked colour. */
  kind: "flat" | "ramp" | "lightened";
}

/** The lighter anterior telescope connector is a DELIBERATE contrast, not
 *  drift, so it is derived from the posterior tone rather than unified away or
 *  given a second picker nobody would think to touch. */
const ANTERIOR_LIGHTEN = 0.22;

export const RESTORATION_PALETTE: PaletteEntry[] = [
  { key: "gold",          kind: "flat", vars: ["--odon-rest-gold"],          defaults: ["#e0a80d"] },
  { key: "gradia",        kind: "flat", vars: ["--odon-rest-gradia"],        defaults: ["#57b285"] },
  { key: "zircon",        kind: "flat", vars: ["--odon-rest-zircon"],        defaults: ["#cfe3ee"] },
  { key: "metal",         kind: "flat", vars: ["--odon-rest-metal"],         defaults: ["#0051bf"] },
  { key: "temporary",     kind: "flat", vars: ["--odon-rest-temporary"],     defaults: ["#fff"] },
  {
    key: "telescope", kind: "lightened",
    vars: ["--odon-rest-telescope", "--odon-rest-telescope-connector", "--odon-rest-telescope-connector-anterior"],
    defaults: ["#0051bf", "#0051bf", "#388aca"],
  },
  { key: "telescopeInner", kind: "flat", vars: ["--odon-rest-telescope-inner"], defaults: ["#aaa"] },
  { key: "composite",     kind: "flat", vars: ["--odon-fill-composite"],     defaults: ["#2f7a4d"] },
  { key: "amalgam",       kind: "flat", vars: ["--odon-fill-amalgam"],       defaults: ["#aaa"] },
  { key: "gic",           kind: "flat", vars: ["--odon-fill-gic"],           defaults: ["#f9ae94"] },
  { key: "fillTemporary", kind: "flat", vars: ["--odon-fill-temporary"],     defaults: ["#fff"] },
  { key: "dentureTooth",  kind: "flat", vars: ["--odon-rest-denture-tooth"], defaults: ["#a8ddb9"] },
  { key: "dentureBase",   kind: "flat", vars: ["--odon-rest-denture-base"],  defaults: ["#f9ae94"] },
  {
    // e.max and metal-ceramic paint from a NINE-stop ramp, and the lightness
    // sweep across it is what makes them read as ceramic rather than as a flat
    // blob. Flattening them to one colour would have been the cheap answer and
    // the wrong one (Dirk chose to derive instead).
    key: "emax", kind: "ramp",
    vars: Array.from({ length: 9 }, (_, i) => `--odon-rest-emax-${i}`),
    defaults: ["#fff", "#fdf3ea", "#f9d8b9", "#f5c18f", "#f2ae6c", "#f09f52", "#ef953f", "#ee8f33", "#ee8d30"],
  },
  {
    key: "metalCeramic", kind: "ramp",
    vars: Array.from({ length: 9 }, (_, i) => `--odon-rest-metal-ceramic-${i}`),
    defaults: ["#feff5f", "#f9fc60", "#edf564", "#d8ea6b", "#bbd975", "#95c482", "#68ab91", "#328da3", "#0071b5"],
  },
];

const BY_KEY = new Map(RESTORATION_PALETTE.map((e) => [e.key, e]));

// ---------------------------------------------------------------------------
// Colour maths — pure, so the derivation is testable without a browser
// ---------------------------------------------------------------------------

/** Parse `#rgb`/`#rrggbb` into 0-1 channels, or `null`. */
export function parseHex(value: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((value || "").trim());
  if(!m) return null;
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
}

function toHex(rgb: [number, number, number]): string {
  const c = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0");
  return `#${c(rgb[0])}${c(rgb[1])}${c(rgb[2])}`;
}

function rgbToHsl([r, g, b]: [number, number, number]): [number, number, number] {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if(d === 0) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if(max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if(max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToRgb([h, s, l]: [number, number, number]): [number, number, number] {
  if(s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number) => {
    let x = t; if(x < 0) x += 1; if(x > 1) x -= 1;
    if(x < 1 / 6) return p + (q - p) * 6 * x;
    if(x < 1 / 2) return q;
    if(x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return [hue(h + 1 / 3), hue(h), hue(h - 1 / 3)];
}

/** Lighten toward white by `amount` (0-1). */
export function lighten(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if(!rgb) return hex;
  const [h, s, l] = rgbToHsl(rgb);
  return toHex(hslToRgb([h, s, l + (1 - l) * amount]));
}

/**
 * Re-hue a nine-stop ramp to a picked colour while KEEPING its lightness
 * sweep, which is the part that carries the ceramic look. Each stop takes the
 * picked hue, keeps its own lightness, and keeps its saturation in proportion
 * to the ramp's most saturated end — so a stop that was near-white stays
 * near-white and the ramp still reads as depth rather than as a stripe.
 *
 * Returns the defaults unchanged for an unparsable colour, rather than
 * throwing or emitting black.
 */
export function deriveRamp(defaults: string[], picked: string): string[] {
  const target = parseHex(picked);
  if(!target) return [...defaults];
  const [th, ts] = rgbToHsl(target);
  const parsed = defaults.map(parseHex);
  const hsl = parsed.map((p) => (p ? rgbToHsl(p) : null));
  // The ramp's own saturation reference: its most saturated stop, which is the
  // material's actual colour. Dividing by it keeps the sweep's SHAPE while the
  // picked colour sets its overall intensity.
  const refS = hsl.reduce((max, v) => (v && v[1] > max ? v[1] : max), 0) || 1;
  return defaults.map((d, i) => {
    const v = hsl[i];
    if(!v) return d;
    const [, s, l] = v;
    return toHex(hslToRgb([th, Math.min(1, (s / refS) * ts), l]));
  });
}

/** Every CSS variable an entry writes for a picked colour, in `vars` order. */
export function resolveEntry(entry: PaletteEntry, picked: string): string[] {
  if(entry.kind === "ramp") return deriveRamp(entry.defaults, picked);
  if(entry.kind === "lightened"){
    // crown, connector, and the anterior connector derived from it
    return [picked, picked, lighten(picked, ANTERIOR_LIGHTEN)];
  }
  return entry.vars.map(() => picked);
}

// ---------------------------------------------------------------------------
// Session state
// ---------------------------------------------------------------------------

/** Chosen colours by entry key. A key absent means "the shipped default", so
 *  an untouched palette writes NOTHING and every fallback applies. */
let chosen: Record<string, string> = {};

/** The entry a key names, or `undefined`. */
export function paletteEntry(key: string): PaletteEntry | undefined { return BY_KEY.get(key); }

/** The colour a picker should show for `key` — the chosen one, else the
 *  shipped default. */
export function restorationColour(key: string): string {
  const entry = BY_KEY.get(key);
  if(!entry) return "";
  // A ramp's picker shows the material's own colour, its most saturated end,
  // not the near-white stop the ramp happens to start from.
  const fallback = entry.kind === "ramp" ? entry.defaults[entry.defaults.length - 1] : entry.defaults[0];
  return chosen[key] ?? fallback;
}

/** Every chosen colour. A copy — a caller cannot mutate the palette through it. */
export function getRestorationPalette(): Record<string, string> { return { ...chosen }; }

/** Choose a colour, or clear it back to the shipped default with `null`.
 *  Ignores an unknown key or an unparsable colour rather than storing it. */
export function setRestorationColourValue(key: string, hex: string | null): boolean {
  const entry = BY_KEY.get(key);
  if(!entry) return false;
  if(hex === null){
    if(!(key in chosen)) return false;
    delete chosen[key];
    return true;
  }
  if(!parseHex(hex)) return false;
  if(chosen[key] === hex) return false;
  chosen[key] = hex;
  return true;
}

/** Drop every choice. Returns whether anything was chosen. */
export function resetRestorationPaletteValues(): boolean {
  const had = Object.keys(chosen).length > 0;
  chosen = {};
  return had;
}

/** Replace the whole palette (host restore). Unknown keys and bad colours are
 *  dropped rather than stored — the same tolerant contract every hydrate here
 *  follows. */
export function setRestorationPaletteValues(next: Record<string, string> | null | undefined): void {
  chosen = {};
  if(!next || typeof next !== "object") return;
  for(const [k, v] of Object.entries(next)){
    if(typeof v === "string") setRestorationColourValue(k, v);
  }
}

/**
 * Write the palette onto `root` as custom properties.
 *
 * A key with no choice REMOVES its properties rather than writing the default
 * back: the asset's own `var(..., #hex)` fallback is the default, and writing
 * it again would leave a chart that merely looks unconfigured while carrying
 * inline properties that outlive a reset.
 */
export function applyRestorationPalette(root: { style: CSSStyleDeclaration } | null | undefined): void {
  if(!root?.style) return;
  for(const entry of RESTORATION_PALETTE){
    const picked = chosen[entry.key];
    if(!picked){
      for(const v of entry.vars) root.style.removeProperty(v);
      continue;
    }
    const values = resolveEntry(entry, picked);
    entry.vars.forEach((v, i) => root.style.setProperty(v, values[i] ?? picked));
  }
}
