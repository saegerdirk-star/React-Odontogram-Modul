// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Bead odontogram-c51.2, drittes Verfahren. Dirk, 22.08.2026: *"Und ja, bitte
// auch Jarabak."*
//
// DREI DINGE, DIE HIER ENTSCHIEDEN WURDEN und die deshalb festgehalten sind:
//
//   1. DER KIEFERWINKEL STEHT ZWEIMAL, und das ist kein Versehen. `GnTgoAr` ist
//      ueber Gnathion und Tangentengonion konstruiert, Jarabaks ueber Ar-Go-Me.
//      Zwei Konstruktionen sind zwei Messgroessen, keine mit zwei Normen —
//      sonst muesste die Summe der beiden Teilwinkel auf einen Winkel passen,
//      der ueber anderen Punkten liegt.
//   2. DIE TEILWINKEL BEKOMMEN KEINEN ZIELWERT. Die Literatur gibt fuer sie
//      BEREICHE an (52-55 und 70-75 Grad), keinen Mittelwert mit Streuung. Ein
//      Bereich in eine Standardabweichung umzurechnen behauptet eine
//      Genauigkeit, die die Quelle nicht hergibt — also wird die Messgroesse
//      erfasst und ohne Ziel gezeigt, genau wie die Beleg-Regel es vorsieht.
//   3. IM IMPORTER STEHT DAS POLYGON VOR `GnTgoAr`. Dessen Muster
//      `/kieferwinkel/i` wuerde "Kieferwinkel, oberer Teil" sonst schlucken,
//      denn das erste Muster gewinnt.
import { describe, it, expect } from "vitest";
import { MEASURES, PROFILES, measure, normFor, profileMeasures, deriveGrowthPattern } from "../cephalometry";
import { parseCephText } from "../cephImport";

const jarabak = PROFILES.find(p => p.id === "jarabak")!;

describe("das Polygon", () => {
  it("steht neben Hasund und Ricketts im Profilkatalog", () => {
    // Die ARRAY-Reihenfolge ist belanglos - der Waehler sortiert nach dem
    // uebersetzten Namen (orderProfiles). Gepueft wird nur, dass es das Profil
    // gibt und die aelteren daneben stehen.
    expect(jarabak).toBeDefined();
    const ids = PROFILES.map(p => p.id);
    expect(ids).toContain("hasund");
    expect(ids).toContain("ricketts");
    expect(ids).toContain("jarabak");
  });

  it("misst gegen die vordere Schaedelbasis — S-N ist die Bezugslinie", () => {
    expect(jarabak.referenceFrame).toBe("anterior-cranial-base");
  });

  it("zeigt die sieben Zeilen in der Reihenfolge des Polygons", () => {
    expect(profileMeasures("jarabak").map(m => m.id)).toEqual([
      "SaddleAngle", "ArticularAngle", "GonialJarabak",
      "GonialUpper", "GonialLower", "PosteriorSum", "JarabakIndex",
    ]);
  });

  it("die drei belegten Winkel und das Hoehenverhaeltnis", () => {
    expect(normFor("SaddleAngle", "jarabak")).toMatchObject({ norm: 123, sd: 5 });
    expect(normFor("ArticularAngle", "jarabak")).toMatchObject({ norm: 143, sd: 6 });
    expect(normFor("GonialJarabak", "jarabak")).toMatchObject({ norm: 130, sd: 7 });
    expect(normFor("PosteriorSum", "jarabak")).toMatchObject({ norm: 396, sd: 6 });
    expect(normFor("JarabakIndex", "jarabak")).toMatchObject({ norm: 63.5, sd: 1.5 });
  });

  it("die Summe der drei Einzelnormen trifft die Normsumme", () => {
    const summe = ["SaddleAngle", "ArticularAngle", "GonialJarabak"]
      .reduce((a, id) => a + normFor(id, "jarabak")!.norm!, 0);
    expect(summe).toBe(normFor("PosteriorSum", "jarabak")!.norm);
  });
});

describe("der Kieferwinkel steht zweimal, ueber verschiedenen Punkten", () => {
  it("Jarabaks laeuft Ar-Go-Me, der bestehende Gn-tgo-Ar", () => {
    expect(measure("GonialJarabak")!.points).toEqual(["Ar", "Go", "Go", "Me"]);
    expect(measure("GnTgoAr")!.points).toEqual(["Gn", "tgo", "tgo", "Ar"]);
    expect(measure("GonialJarabak")!.norm).toBe(130);
    expect(measure("GnTgoAr")!.norm).toBe(126);
  });

  it("die Teilwinkel treffen sich in N und teilen sich das Gonion", () => {
    expect(measure("GonialUpper")!.points).toEqual(["Ar", "Go", "Go", "N"]);
    expect(measure("GonialLower")!.points).toEqual(["N", "Go", "Go", "Me"]);
  });
});

describe("die Beleg-Regel bei einem BEREICH statt einer Streuung", () => {
  it("die Teilwinkel werden ohne Zielwert gefuehrt", () => {
    for (const id of ["GonialUpper", "GonialLower"]) {
      const n = normFor(id, "jarabak")!;
      expect(n.norm).toBeNull();
      expect(n.sd).toBeNull();
    }
  });

  it("und die Quelle sagt WARUM — ein Bereich ist keine Standardabweichung", () => {
    for (const id of ["GonialUpper", "GonialLower"]) {
      const q = measure(id)!.source;
      expect(q).toMatch(/RANGE/);
      expect(q).toMatch(/not a mean with a standard deviation/);
    }
  });

  it("die belegten Winkel nennen sich zweithand, nicht gelesen", () => {
    for (const id of ["SaddleAngle", "ArticularAngle", "GonialJarabak", "PosteriorSum"]) {
      expect(measure(id)!.source).toMatch(/the original has not been read/);
    }
  });

  it("keine erfundene LOINC- oder SNOMED-Kodierung, lokale Schluessel eindeutig", () => {
    for (const m of profileMeasures("jarabak")) {
      expect(m.coding.loinc).toBeUndefined();
      expect(m.coding.snomed).toBeUndefined();
    }
    const alle = MEASURES.map(m => m.coding.local);
    expect(new Set(alle).size).toBe(alle.length);
  });
});

describe("das Wachstumsmuster", () => {
  it("ein grosser Sattel- und Gelenkwinkel liest vertikal", () => {
    const g = deriveGrowthPattern({ SaddleAngle: 133, ArticularAngle: 153 }, "jarabak");
    expect(g.indicators.find(i => i.id === "SaddleAngle")!.reads).toBe("vertical");
    expect(g.indicators.find(i => i.id === "ArticularAngle")!.reads).toBe("vertical");
    expect(g.pattern).toBe("vertical");
  });

  it("die Teilwinkel stimmen NICHT mit ab — ohne Norm keine Stimme", () => {
    const g = deriveGrowthPattern({ GonialUpper: 60, GonialLower: 80 }, "jarabak");
    expect(g.indicators).toHaveLength(0);
    expect(g.pattern).toBe("indeterminate");
  });
});

describe("der Importer", () => {
  it("der geteilte Kieferwinkel wird nicht vom ungeteilten geschluckt", () => {
    const r = parseCephText([
      "Kieferwinkel, oberer Teil     53,0°     55,8°     +2,8",
      "Kieferwinkel, unterer Teil    72,0°     74,1°     +2,1",
    ].join("\n"));
    const nach = Object.fromEntries(r.values.map(v => [v.measureId, v.value]));
    expect(nach["GonialUpper"]).toBe(55.8);
    expect(nach["GonialLower"]).toBe(74.1);
    expect(nach["GnTgoAr"]).toBeUndefined();
  });

  it("und der ungeteilte bleibt, wo er seit c51.2 steht", () => {
    const r = parseCephText("Kieferwinkel     126,0°     131,2°     +5,2");
    expect(r.values[0].measureId).toBe("GnTgoAr");
  });

  it("Sattel-, Gelenkwinkel und Winkelsumme", () => {
    const r = parseCephText([
      "Sattelwinkel      123,0°    119,4°    -3,6",
      "Gelenkwinkel      143,0°    147,7°    +4,7",
      "Winkelsumme       396,0°    398,3°    +2,3",
    ].join("\n"));
    const nach = Object.fromEntries(r.values.map(v => [v.measureId, v.value]));
    expect(nach["SaddleAngle"]).toBe(119.4);
    expect(nach["ArticularAngle"]).toBe(147.7);
    expect(nach["PosteriorSum"]).toBe(398.3);
  });
});
