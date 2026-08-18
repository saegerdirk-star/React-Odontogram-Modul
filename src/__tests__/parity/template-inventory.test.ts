// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { TEMPLATE_FILES, templateIds } from "./template-inventory";

const here = import.meta.url;
const golden: Record<string, string[]> = JSON.parse(
  readFileSync(fileURLToPath(new URL("./template-inventory.json", here)), "utf8"),
);

describe("every tooth template keeps its frozen layer inventory", () => {
  it("covers all 32 templates", () => {
    expect(TEMPLATE_FILES.length).toBe(32);
    expect(Object.keys(golden).sort()).toEqual([...TEMPLATE_FILES].sort());
  });

  for (const name of TEMPLATE_FILES) {
    it(`${name}.svg`, () => {
      expect(templateIds(name)).toEqual(golden[name]);
    });
  }
});
