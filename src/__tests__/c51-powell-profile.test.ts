// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Bead odontogram-c51.3: die Fotostat-Analyse nach Powell, gemessen am
// PROFILFOTO statt am Fernroentgenbild. Aus dem FRWin-Katalog uebernommen.
//
// DIE ENTSCHEIDUNG, DIE HIER FESTGEHALTEN IST (Dirk: "Bau A"): Powell wird in
// die Kephalometrie-Karte gefaltet, aber das MEDIUM steht am Datensatz. Eine
// Weichteilgroesse kommt in beiden Medien vor - der Datensatz muss sagen, woher
// ein Wert stammt. Das leistet `medium: "photo"` an jeder Messgroesse und am
// Profil, und der Waehler gruppiert danach.
import { describe, it, expect } from "vitest";
import { LANDMARKS, MEASURES, PROFILES, measure, normFor, profileMeasures } from "../cephalometry";

const powell = PROFILES.find(p => p.id === "powell")!;

describe("das Verfahren", () => {
  it("steht im Katalog und ist ein FOTO-Verfahren gegen die Frankfurter Horizontale", () => {
    expect(powell).toBeDefined();
    expect(powell.medium).toBe("photo");
    expect(powell.referenceFrame).toBe("frankfurt");
  });

  it("die Fernroentgen-Verfahren bleiben Film (kein oder film)", () => {
    for (const id of ["hasund", "ricketts", "jarabak", "steiner"]) {
      const p = PROFILES.find(x => x.id === id)!;
      expect(p.medium ?? "film").toBe("film");
    }
  });

  it("zeigt die acht Messgroessen des Auswertungsbogens", () => {
    expect(profileMeasures("powell").map(m => m.id)).toEqual([
      "PowellFacP", "PowellNFr", "PowellNFa", "PowellNM", "PowellMC",
      "PowellNasomental", "PowellNL", "PowellNeck",
    ]);
  });

  it("bringt die drei Weichteilpunkte mit, jede Messgroesse ueber vorhandenen Punkten", () => {
    const ids = new Set(LANDMARKS.map(l => l.id));
    for (const pt of ["gb", "ce", "ctg"]) expect(ids.has(pt), pt).toBe(true);
    for (const m of profileMeasures("powell")) {
      for (const pt of m.points) expect(ids.has(pt), `${m.id} -> ${pt}`).toBe(true);
    }
  });
});

describe("jede Powell-Messgroesse traegt medium photo", () => {
  it("und das ist der Datensatz, der sagt, woher der Wert stammt", () => {
    for (const m of profileMeasures("powell")) expect(m.medium).toBe("photo");
  });
});

describe("die Normwerte, wie der Katalog sie fuehrt", () => {
  const erwartet: [string, number | null, number | null][] = [
    ["PowellFacP", 90, null], ["PowellNFr", 122.5, 7.5], ["PowellNFa", 35, 5],
    ["PowellNM", 126, 6], ["PowellMC", 87.5, 7.5],
    ["PowellNasomental", null, null], ["PowellNL", 100, 10], ["PowellNeck", 54, 6],
  ];
  for (const [id, norm, sd] of erwartet) {
    it(`${id}: ${norm ?? "kein"}${sd === null ? "" : " ± " + sd}`, () => {
      const n = normFor(id, "powell")!;
      expect(n.norm).toBe(norm);
      expect(n.sd).toBe(sd);
    });
  }
});

describe("die Sourcing-Regel", () => {
  it("keine genannte Quelle (FRWin nennt keine), aber ein Wortlaut ohne Behauptung", () => {
    for (const m of profileMeasures("powell")) {
      expect(m.source).toMatch(/WITHOUT a cited source/);
      expect(m.source).not.toMatch(/FRWin/i);
    }
  });

  it("lokale Schluessel eindeutig, keine erfundene LOINC/SNOMED", () => {
    for (const m of profileMeasures("powell")) {
      expect(m.coding.loinc).toBeUndefined();
      expect(m.coding.snomed).toBeUndefined();
    }
    const alle = MEASURES.map(m => m.coding.local);
    expect(new Set(alle).size).toBe(alle.length);
  });
});
