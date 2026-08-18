// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul

// Per-template LAYER INVENTORY, frozen.
//
// The SVG-fingerprint oracle renders six representative templates through the
// full case matrix. With one drawing per position that no longer reaches every
// template: a stray `data-active`, or a surface id misspelled in artwork nothing
// else renders, would pass CI unseen.
//
// Running the full matrix on all 32 was tried and measured — 4133 fingerprints,
// a 9.8 MB fixture, and more than 8 GB of heap for `npm test`, because every
// case parses its template into a fresh jsdom Document. A GitHub-hosted runner
// has 7 GB, so that road is closed whatever a dev machine can do.
//
// What a template can get wrong ON ITS OWN is its set of layer ids — that set is
// the renderer's activation contract. Checking it costs ONE parse per template
// instead of a hundred, and it catches exactly the class of mistake the
// fingerprints would have caught here.
//
// The inventories are deliberately NOT all equal: an incisor carries no
// `fissure-sealing` layer, a molar no `milktooth-beauty-1`. Anatomy decides what
// a drawing contains, so each template gets its own frozen list.
//
// `defs` ids are excluded: paint servers are namespaced per template
// (`toothgen-N-…`) and carry no clinical meaning.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = import.meta.url;

export const TEMPLATE_FILES: readonly string[] = [
  "11", "12", "13", "14", "15", "16", "17", "18",
  "41", "42", "43", "44", "45", "46", "47", "48",
  "11_occl", "12_occl", "13_occl", "14_occl", "15_occl", "16_occl", "17_occl", "18_occl",
  "41_occl", "42_occl", "43_occl", "44_occl", "45_occl", "46_occl", "47_occl", "48_occl",
];

export function templateIds(name: string): string[] {
  const text = readFileSync(
    fileURLToPath(new URL(`../../assets/teeth-svgs/${name}.svg`, here)),
    "utf8",
  );
  const withoutDefs = text.replace(/<defs[\s\S]*?<\/defs>/g, "");
  const ids = Array.from(withoutDefs.matchAll(/\bid="([^"]+)"/g)).map((m) => m[1]);
  return Array.from(new Set(ids)).sort();
}
