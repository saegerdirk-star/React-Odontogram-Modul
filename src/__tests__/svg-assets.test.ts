// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Created by Zoltan Dul (https://github.com/ZoliQua) 2025-2026

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL as NodeURL } from "node:url";
import { namespacePaintServers, OCCLUSAL_TEMPLATE, TOOTH_TEMPLATE } from "../odontogram";

const SIDE = ["11", "12", "13", "14", "15", "16", "17", "31", "46"] as const;
const POSTERIOR_SIDE = ["14", "15", "16", "17", "46"] as const;
const ALL = [...SIDE, "14_occl", "16_occl"] as const;

function readSvg(name: string): string {
  // Use Node's own URL (not the jsdom-provided global URL, which mis-resolves
  // relative `file:` URLs against `window.location` under the jsdom test
  // environment) so this always resolves relative to this test file on disk.
  const url = new NodeURL(`../assets/teeth-svgs/${name}.svg`, import.meta.url);
  return readFileSync(fileURLToPath(url), "utf8");
}

// Drawable leaf ids that are NEW clinical layers; each MUST carry inline
// display:none so the engine hides it at load (it is never toggled in SP1).
const NEW_LEAVES_ALL = [
  "metal-ceramic-crown", "metal-ceramic-bridge-connector",
  "gold-crown", "gold-bridge-connector",
  "gradia-crown", "gradia-bridge-connector",
  "crown-leakage",
];
const NEW_LEAVES_FRONT = ["caries-root", "fracture-horizontal-1", "fracture-vertical-1", "ortho-ring", "ortho-bracket", "arrow-up", "arrow-down"];

function clinicalElementIds(svg: string): string[] {
  const root = new DOMParser().parseFromString(svg, "image/svg+xml").documentElement;
  return Array.from(root.querySelectorAll(":scope > g [id]"), (element) => element.id);
}

function transformedX(x: number, width: number, placement: { rot: number; mirror: boolean }): number {
  let result = x;
  if (placement.rot === 180) result = width - result;
  if (placement.mirror) result = width - result;
  return result;
}

describe("installed tooth SVG assets", () => {
  it("every file carries SVG Version 2.5.0", () => {
    for (const n of ALL) expect(readSvg(n), n).toContain("SVG Version: 2.5.0");
  });

  it("no file still carries an old SVG version tag", () => {
    for (const n of ALL) {
      const s = readSvg(n);
      expect(s, n).not.toContain("SVG Version: 2.1");
      expect(s, n).not.toContain("Build 109"); // raw Illustrator tag must be gone
    }
  });

  it("16_occl uses prosthesis-connector, not the bridge-connector typo", () => {
    const s = readSvg("16_occl");
    expect(s).toContain('id="prosthesis-connector"');
    expect(s).not.toContain('id="prosthesis-bridge-connector"');
  });

  it("front teeth use the corrected 'incisal' broken-crown ids (no 'inicisal')", () => {
    for (const n of SIDE) {
      const s = readSvg(n);
      expect(s, n).not.toContain("inicisal");
      expect(s, n).toContain('id="tooth-broken-incisal"');
    }
  });

  it("all 7 broken-crown variant ids exist in each front template", () => {
    const variants = [
      "tooth-broken-mesial", "tooth-broken-distal", "tooth-broken-incisal",
      "tooth-broken-mesial-distal", "tooth-broken-mesial-incisal",
      "tooth-broken-distal-incisal", "tooth-broken-mesial-distal-incisal",
    ];
    for (const n of SIDE) {
      const s = readSvg(n);
      for (const v of variants) expect(s, `${n}:${v}`).toContain(`id="${v}"`);
    }
  });

  it("existing metal-crown layer is preserved (no visual change for crownMaterial=metal)", () => {
    for (const n of ALL) expect(readSvg(n), n).toContain('id="metal-crown"');
  });

  it("new dormant clinical leaves are hidden by default (display:none on the element or an ancestor)", () => {
    const isHiddenByDefault = (svg: string, id: string): boolean => {
      const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
      const start = doc.getElementById(id);
      for (let cur: Element | null = start; cur; cur = cur.parentElement) {
        if (/display\s*:\s*none/i.test(cur.getAttribute("style") || "")) return true;
      }
      return false;
    };
    for (const n of ALL) {
      const s = readSvg(n);
      for (const id of NEW_LEAVES_ALL) {
        if (s.includes(`id="${id}"`)) expect(isHiddenByDefault(s, id), `${n}:${id}`).toBe(true);
      }
    }
    for (const n of SIDE) {
      const s = readSvg(n);
      for (const id of NEW_LEAVES_FRONT) {
        if (s.includes(`id="${id}"`)) expect(isHiddenByDefault(s, id), `${n}:${id}`).toBe(true);
      }
    }
  });

  it("engine-toggled container groups are not display:none (plan/specials), so their children can be shown", () => {
    const containerNotHidden = (svg: string, id: string): boolean => {
      const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
      const el = doc.getElementById(id);
      if (!el) return true; // absent is fine (e.g. occlusal files have no `specials`)
      return !/display\s*:\s*none/i.test(el.getAttribute("style") || "");
    };
    for (const n of ALL) {
      const s = readSvg(n);
      for (const id of ["plan", "specials"]) {
        expect(containerNotHidden(s, id), `${n}:${id} container must not be display:none`).toBe(true);
      }
    }
  });

  it("base anatomy layers are present", () => {
    for (const n of SIDE) {
      const s = readSvg(n);
      for (const id of ["tooth-base", "bone-base", "gum-base"]) expect(s, `${n}:${id}`).toContain(`id="${id}"`);
    }
  });

  it("posterior side templates declare the generated anatomy and dimensions", () => {
    const expected = {
      "14": { roots: "2", viewBox: "0.0 0.0 39.8 79.7" },
      "15": { roots: "1", viewBox: "0.0 0.0 39.8 79.1" },
      "16": { roots: "3", viewBox: "0.0 0.0 42.9 72.6" },
      "17": { roots: "3", viewBox: "0.0 0.0 42.9 70.9" },
      "46": { roots: "2", viewBox: "0.0 0.0 42.9 77.1" },
    } as const;

    for (const template of POSTERIOR_SIDE) {
      const root = new DOMParser().parseFromString(readSvg(template), "image/svg+xml").documentElement;
      expect(root.getAttribute("data-root-count"), template).toBe(expected[template].roots);
      expect(root.getAttribute("viewBox"), template).toBe(expected[template].viewBox);
    }
  });

  it("maps each admitted posterior tooth class to its anatomy template", () => {
    for (const toothNo of [14, 24]) expect(TOOTH_TEMPLATE.get(toothNo)?.tpl).toBe(14);
    for (const toothNo of [15, 25, 34, 35, 44, 45]) expect(TOOTH_TEMPLATE.get(toothNo)?.tpl).toBe(15);
    for (const toothNo of [16, 26]) expect(TOOTH_TEMPLATE.get(toothNo)?.tpl).toBe(16);
    for (const toothNo of [17, 18, 27, 28]) expect(TOOTH_TEMPLATE.get(toothNo)?.tpl).toBe(17);
    for (const toothNo of [36, 37, 38, 46, 47, 48]) expect(TOOTH_TEMPLATE.get(toothNo)?.tpl).toBe(46);
  });

  it("keeps mesial occlusal geometry toward the arch midline in every quadrant", () => {
    for (const [toothNo, placement] of OCCLUSAL_TEMPLATE) {
      const svg = readSvg(`${placement.tpl}_occl`);
      const root = new DOMParser().parseFromString(svg, "image/svg+xml").documentElement;
      const width = Number(root.getAttribute("viewBox")?.split(/\s+/)[2]);
      const mesialX = Number(root.querySelector("#mesial-shape")?.getAttribute("d")?.match(/^M([\d.]+)/)?.[1]);
      const distalX = Number(root.querySelector("#distal-shape")?.getAttribute("d")?.match(/^M([\d.]+)/)?.[1]);
      const transformedMesial = transformedX(mesialX, width, placement);
      const transformedDistal = transformedX(distalX, width, placement);
      const viewerLeft = Math.floor(toothNo / 10) === 1 || Math.floor(toothNo / 10) === 4;
      expect(transformedMesial > transformedDistal, String(toothNo)).toBe(viewerLeft);
    }
  });

  it("preserves the complete clinical layer sequence for split posterior templates", () => {
    expect(clinicalElementIds(readSvg("12"))).toEqual(clinicalElementIds(readSvg("11")));
    expect(clinicalElementIds(readSvg("31"))).toEqual(clinicalElementIds(readSvg("11")));
    expect(clinicalElementIds(readSvg("15"))).toEqual(clinicalElementIds(readSvg("14")));
    expect(clinicalElementIds(readSvg("17"))).toEqual(clinicalElementIds(readSvg("16")));
    expect(clinicalElementIds(readSvg("46"))).toEqual(clinicalElementIds(readSvg("16")));
  });

  it("keeps paint-server ids unique across side-view templates", () => {
    const paintServerIds: string[] = [];
    for (const template of SIDE) {
      const root = new DOMParser().parseFromString(readSvg(template), "image/svg+xml").documentElement;
      paintServerIds.push(...Array.from(root.querySelectorAll("defs [id]"), (element) => element.id));
    }
    expect(new Set(paintServerIds).size).toBe(paintServerIds.length);
  });

  it("namespaces paint servers per rendered tooth without changing clinical ids", () => {
    const parser = new DOMParser();
    const first = parser.parseFromString(readSvg("15"), "image/svg+xml").documentElement;
    const second = first.cloneNode(true) as Element;
    const clinicalId = first.querySelector(":scope > g [id]")?.id;

    namespacePaintServers(first, "tooth-15-side-");
    namespacePaintServers(second, "tooth-25-side-");

    expect(first.querySelector(":scope > g [id]")?.id).toBe(clinicalId);
    expect(second.querySelector(":scope > g [id]")?.id).toBe(clinicalId);
    const ids = [...first.querySelectorAll("defs [id]"), ...second.querySelectorAll("defs [id]")].map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const root of [first, second]) {
      const defined = new Set(Array.from(root.querySelectorAll("defs [id]"), (element) => element.id));
      const references = Array.from(root.querySelectorAll("*"))
        .flatMap((element) => Array.from(element.attributes, (attribute) => attribute.value))
        .flatMap((value) => Array.from(value.matchAll(/url\(#([^)]+)\)/g), (match) => match[1]));
      expect(references.every((id) => defined.has(id))).toBe(true);
    }
  });
});
