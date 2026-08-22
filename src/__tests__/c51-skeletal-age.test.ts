// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Bead odontogram-c51.4: skeletal age. Dirk fragte "was ist mit der
// Handwurzelaufnahme?" und waehlte am 22.08.2026 Fishmans SMI dafuer.
//
// WAS HIER FESTGEHALTEN IST:
//   1. Die Muenster-Tabelle (Erdmann 2007, nach Hassel & Farman): pro CVM-
//      Stadium das Restwachstum und die zugehoerigen Fishman-SMI-Paare. Sie
//      steht sonst nirgends im Code.
//   2. Dass die elf SMIs sich auf die sechs CVM-Stadien in festen Paaren
//      abbilden - der Grund, warum Hand und FRS dieselbe Sprache sprechen.
//   3. Dass ein DIREKT abgelesener CVM-Wert einen aus der Hand ABGELEITETEN
//      schlaegt, und ein Widerspruch beider gemeldet statt aufgeloest wird.
//   4. Die Beleg-Regel: die Quelle nennt Erdmann 2007 und sagt, dass das
//      Hassel-&-Farman-Original nicht gelesen wurde.
import { describe, it, expect } from "vitest";
import {
  deriveSkeletalMaturity, smiToCvm, CVM_STAGES, SMI_STAGES, SOURCE_SKELETAL,
} from "../skeletalAge";

describe("die SMI<->CVM-Abbildung", () => {
  it("elf SMIs, sechs CVM-Stadien", () => {
    expect(SMI_STAGES).toHaveLength(11);
    expect(CVM_STAGES).toHaveLength(6);
  });

  it("bildet die Fishman-Paare der Muenster-Tabelle ab", () => {
    const paare: [string, string][] = [
      ["smi-1", "cvm-1"], ["smi-2", "cvm-1"],
      ["smi-3", "cvm-2"], ["smi-4", "cvm-2"],
      ["smi-5", "cvm-3"], ["smi-6", "cvm-3"],
      ["smi-7", "cvm-4"], ["smi-8", "cvm-4"],
      ["smi-9", "cvm-5"], ["smi-10", "cvm-5"],
      ["smi-11", "cvm-6"],
    ];
    for (const [smi, cvm] of paare) expect(smiToCvm(smi as any)).toBe(cvm);
    expect(smiToCvm("none")).toBeNull();
  });
});

describe("das Restwachstum je Stadium (Erdmann 2007)", () => {
  const bands: [string, number, number][] = [
    ["cvm-1", 80, 100], ["cvm-2", 65, 85], ["cvm-3", 25, 65],
    ["cvm-4", 20, 30], ["cvm-5", 5, 10], ["cvm-6", 0, 0],
  ];
  for (const [cvm, low, high] of bands) {
    it(`${cvm}: ${low}-${high} %`, () => {
      const m = deriveSkeletalMaturity({ cvm: cvm as any });
      expect(m.remaining).toEqual({ low, high });
    });
  }
});

describe("der pubertaere Gipfel", () => {
  it("1-2 bevorstehend, 3-4 erreicht, 5-6 vorbei", () => {
    expect(deriveSkeletalMaturity({ cvm: "cvm-1" }).peak).toBe("ahead");
    expect(deriveSkeletalMaturity({ cvm: "cvm-2" }).peak).toBe("ahead");
    expect(deriveSkeletalMaturity({ cvm: "cvm-3" }).peak).toBe("at");
    expect(deriveSkeletalMaturity({ cvm: "cvm-4" }).peak).toBe("at");
    expect(deriveSkeletalMaturity({ cvm: "cvm-5" }).peak).toBe("past");
    expect(deriveSkeletalMaturity({ cvm: "cvm-6" }).peak).toBe("past");
  });
});

describe("zwei Quellen, eine Antwort", () => {
  it("nichts erfasst = keine Antwort", () => {
    const m = deriveSkeletalMaturity({});
    expect(m.remaining).toBeNull();
    expect(m.peak).toBeNull();
    expect(m.effectiveCvm).toBeNull();
    expect(m.disagree).toBe(false);
  });

  it("nur die Hand: das Stadium wird auf CVM abgebildet und liefert das Band", () => {
    const m = deriveSkeletalMaturity({ smi: "smi-6" });     // -> cvm-3
    expect(m.cvmFromHand).toBe("cvm-3");
    expect(m.effectiveCvm).toBe("cvm-3");
    expect(m.remaining).toEqual({ low: 25, high: 65 });
    expect(m.disagree).toBe(false);
  });

  it("der DIREKT abgelesene CVM schlaegt den aus der Hand abgeleiteten", () => {
    // Hand -> cvm-2, aber am FRS direkt cvm-4 abgelesen: cvm-4 gewinnt.
    const m = deriveSkeletalMaturity({ cvm: "cvm-4", smi: "smi-3" });
    expect(m.effectiveCvm).toBe("cvm-4");
    expect(m.remaining).toEqual({ low: 20, high: 30 });
  });

  it("stimmen beide ueberein, ist es kein Widerspruch", () => {
    const m = deriveSkeletalMaturity({ cvm: "cvm-3", smi: "smi-5" }); // smi-5 -> cvm-3
    expect(m.disagree).toBe(false);
  });

  it("weichen beide ab, wird es GEMELDET statt aufgeloest", () => {
    const m = deriveSkeletalMaturity({ cvm: "cvm-2", smi: "smi-9" }); // smi-9 -> cvm-5
    expect(m.disagree).toBe(true);
    expect(m.effectiveCvm).toBe("cvm-2");   // der direkte Wert gilt trotzdem
    expect(m.cvmFromHand).toBe("cvm-5");
  });
});

describe("die Beleg-Regel", () => {
  it("die Quelle nennt Erdmann 2007 und dass das Original nicht gelesen wurde", () => {
    expect(SOURCE_SKELETAL).toMatch(/Erdmann 2007/);
    expect(SOURCE_SKELETAL).toMatch(/not read/);
    expect(SOURCE_SKELETAL).toMatch(/Hassel & Farman/);
  });
});
