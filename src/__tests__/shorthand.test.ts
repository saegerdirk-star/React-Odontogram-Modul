// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Bead odontogram-t8y: die Abbildung Kuerzel -> Achse, geprueft ohne Browser.
//
// Was hier festgehalten wird, ist nicht die Umsetzung, sondern die ABLESUNG
// von charlys Tastenfeld: dass `d` distal heisst und `D` etwas ganz anderes,
// dass `Twf` nicht als `T`+`wf` zerfaellt, und dass das Material VOR dem
// Befund steht. Bricht einer dieser Tests, ist die Kurzschrift falsch
// abgebildet - nicht der Kode unschoen.
import { describe, it, expect } from "vitest";
import {
  parseShorthand, tokenizeShorthand, SHORTHAND_DE, SHORTHAND_PENDING,
  nextChartTooth, CHARTING_ORDER, ARCH_ROWS,
} from "../shorthand";

describe("Zerlegung: laengste Uebereinstimmung, Gross- und Kleinschreibung", () => {
  it("liest Twf als EIN Kuerzel, nicht als T und wf", () => {
    expect(tokenizeShorthand("Twf")).toEqual(["Twf"]);
  });

  it("unterscheidet t (Teleskop) von TK (Teilkrone)", () => {
    expect(tokenizeShorthand("t")).toEqual(["t"]);
    expect(tokenizeShorthand("TK")).toEqual(["TK"]);
  });

  it("unterscheidet d (distal) von D (Durchbruch)", () => {
    const klein = parseShorthand("Am d");
    expect(klein.edits).toEqual([
      { kind: "surfaces", target: "filling", surfaces: ["distal"], material: "amalgam" },
    ]);
    const gross = parseShorthand("D");
    expect(gross.edits).toEqual([]);
    expect(gross.pending).toEqual([{ token: "D", bead: "odontogram-0n8" }]);
  });

  it("liest o.B. nicht als okklusale Flaeche", () => {
    expect(tokenizeShorthand("o.B.")).toEqual(["o.B."]);
    expect(parseShorthand("o.B.").edits).toEqual([{ kind: "reset" }]);
  });

  it("kommt ohne Trennzeichen aus und vertraegt welche", () => {
    expect(tokenizeShorthand("Am mod")).toEqual(["Am", "m", "o", "d"]);
    expect(tokenizeShorthand("Ammod")).toEqual(["Am", "m", "o", "d"]);
  });
});

describe("Das Material steht VOR dem Befund und bleibt stehen", () => {
  it("Dirks Beispiel: G, dann k - die Krone ist aus Gold", () => {
    const r = parseShorthand("G k");
    expect(r.material).toBe("G");
    expect(r.edits).toEqual([
      { kind: "axis", field: "restorationType", value: "crown" },
      { kind: "axis", field: "restorationMaterial", value: "gold" },
    ]);
  });

  it("gibt den Modus zurueck, damit der Aufrufer ihn weitertraegt", () => {
    const erst = parseShorthand("Am");
    expect(erst.edits).toEqual([]);
    const dann = parseShorthand("mod", { material: erst.material });
    expect(dann.edits).toEqual([
      { kind: "surfaces", target: "filling", surfaces: ["mesial", "occlusal", "distal"], material: "amalgam" },
    ]);
  });

  it("eine blosse Flaechenkette IST eine Fuellung", () => {
    const r = parseShorthand("Kst mo");
    expect(r.edits).toEqual([
      { kind: "surfaces", target: "filling", surfaces: ["mesial", "occlusal"], material: "composite" },
    ]);
  });

  it("Gold auf Flaechen ist KEINE Fuellung, sondern ein Inlay", () => {
    // charly sagt dasselbe, ohne es auszusprechen: seine eigene Planungstabelle
    // schreibt "Fuellung n-flaechig Gold / Teilkrone".
    const r = parseShorthand("G od");
    expect(r.edits).toEqual([
      { kind: "axis", field: "restorationType", value: "inlay" },
      { kind: "axis", field: "restorationMaterial", value: "gold" },
    ]);
  });

  it("Flaechen ohne gewaehltes Material raten nichts, sondern melden", () => {
    const r = parseShorthand("mod");
    expect(r.edits).toEqual([]);
    expect(r.unknown).toEqual(["mesial", "occlusal", "distal"]);
  });
});

describe("Karies", () => {
  it("c oeffnet den Lauf, die Stufe schliesst ihn", () => {
    const r = parseShorthand("c mod K3");
    expect(r.edits).toEqual([
      { kind: "surfaces", target: "caries", surfaces: ["mesial", "occlusal", "distal"], severity: 4 },
    ]);
  });

  it("eine Stufe allein bedeutet Karies, auch ohne c", () => {
    // Auf dem Tastenfeld ist K1..K5 nur ueber den Kariesschalter erreichbar.
    const r = parseShorthand("o K5");
    expect(r.edits).toEqual([
      { kind: "surfaces", target: "caries", surfaces: ["occlusal"], severity: 6 },
    ]);
  });

  it("Karies ohne Stufe ist zulaessig - die Stufe ist ein Zusatz", () => {
    const r = parseShorthand("c v");
    expect(r.edits).toEqual([
      { kind: "surfaces", target: "caries", surfaces: ["buccal"], severity: null },
    ]);
  });

  it("c schlaegt das gesetzte Material - Karies ist keine Fuellung", () => {
    const r = parseShorthand("Am c o");
    expect(r.edits).toEqual([
      { kind: "surfaces", target: "caries", surfaces: ["occlusal"], severity: null },
    ]);
    expect(r.material).toBe("Am");
  });
});

describe("Die Materialtasten sind Einzelbuchstaben", () => {
  it("A K G E schalten Amalgam, Kunststoff, Gold, Keramik", () => {
    expect(parseShorthand("A").material).toBe("Am");
    expect(parseShorthand("K").material).toBe("Kst");
    expect(parseShorthand("G").material).toBe("G");
    expect(parseShorthand("E").material).toBe("Ker");
  });

  it("die Beschriftung des Tastenfelds tut es auch", () => {
    expect(parseShorthand("Am").material).toBe(parseShorthand("A").material);
    expect(parseShorthand("Kst").material).toBe(parseShorthand("K").material);
    expect(parseShorthand("Ker").material).toBe(parseShorthand("E").material);
  });

  it("K3 bleibt die Kariesstufe, nicht Kunststoff plus 3", () => {
    expect(tokenizeShorthand("K3")).toEqual(["K3"]);
    expect(parseShorthand("c o K3").edits).toEqual([
      { kind: "surfaces", target: "caries", surfaces: ["occlusal"], severity: 4 },
    ]);
  });

  it("K ist Kunststoff, k ist die Krone", () => {
    expect(parseShorthand("K").edits).toEqual([]);
    expect(parseShorthand("k").edits).toEqual([{ kind: "axis", field: "restorationType", value: "crown" }]);
  });

  it("eine Taste hat zwei Lesarten: Fuellung und Restauration", () => {
    // Kunststoff auf Flaechen ist eine Composite-Fuellung...
    expect(parseShorthand("K mo").edits).toEqual([
      { kind: "surfaces", target: "filling", surfaces: ["mesial", "occlusal"], material: "composite" },
    ]);
    // ...derselbe Tastendruck an einer Krone ist Gradia.
    expect(parseShorthand("K k").edits).toEqual([
      { kind: "axis", field: "restorationType", value: "crown" },
      { kind: "axis", field: "restorationMaterial", value: "gradia" },
    ]);
  });
});

describe("Brueckenglied und Prothesenzahn sind zwei verschiedene Achsen", () => {
  it("b ist die Bruecke, e der Prothesenzahn", () => {
    expect(parseShorthand("b").edits).toEqual([
      { kind: "axis", field: "toothSelection", value: "none" },
      { kind: "axis", field: "restorationType", value: "bridge" },
    ]);
    expect(parseShorthand("e").edits).toEqual([
      { kind: "axis", field: "toothSelection", value: "none" },
      { kind: "axis", field: "prosthesis", value: "removable-partial" },
    ]);
  });

  it("e schreibt NIE eine feste Restauration daneben", () => {
    // Die Registry verbietet die Kombination: entweder feste Restauration
    // oder Prothese, nie beides.
    for(const eingabe of ["e", "K e", "G e", "E e", "A e"]){
      const felder = parseShorthand(eingabe).edits
        .filter(e => e.kind === "axis").map(e => (e as { field: string }).field);
      expect(felder, eingabe).not.toContain("restorationType");
      expect(felder, eingabe).not.toContain("restorationMaterial");
    }
  });

  it("der Materialmodus bleibt stehen, auch wenn e ihn nicht braucht", () => {
    const r = parseShorthand("K e");
    expect(r.material).toBe("Kst");
  });
});

describe("Ganzer Zahn", () => {
  it("bildet die Kuerzel ab, die Dirk selbst genannt hat", () => {
    expect(parseShorthand("k").edits).toEqual([{ kind: "axis", field: "restorationType", value: "crown" }]);
    expect(parseShorthand("x").edits).toEqual([{ kind: "axis", field: "extractionPlan", value: true }]);
    expect(parseShorthand("o.B.").edits).toEqual([{ kind: "reset" }]);
  });

  it("t nennt sein eigenes Material und laesst sich vom Modus nicht ueberschreiben", () => {
    expect(parseShorthand("G t").edits).toEqual([
      { kind: "axis", field: "restorationType", value: "crown" },
      { kind: "axis", field: "restorationMaterial", value: "telescope" },
    ]);
  });

  it("ein Material ohne Restaurations-Lesart erfindet keines", () => {
    expect(parseShorthand("A k").edits).toEqual([
      { kind: "axis", field: "restorationType", value: "crown" },
    ]);
  });

  it("ONL und charlys TK meinen dasselbe Onlay", () => {
    expect(parseShorthand("ONL").edits).toEqual(parseShorthand("TK").edits);
  });

  it("Zys qualifiziert die apikale Diagnose, statt allein zu stehen", () => {
    expect(parseShorthand("Zys").edits).toEqual([
      { kind: "axis", field: "apicalDx", value: "asymptomatic-apical-periodontitis" },
      { kind: "axis", field: "periapicalType", value: "cyst" },
    ]);
  });

  it("WR ist der Wurzelrest, R die noch heimatlose Wurzelkappe", () => {
    expect(parseShorthand("WR").edits).toEqual([{ kind: "axis", field: "toothSubstrate", value: "radix" }]);
    expect(parseShorthand("R").pending).toEqual([{ token: "R", bead: "" }]);
  });

  it("die Endo-Kuerzel treffen die richtigen Werte", () => {
    expect(parseShorthand("wf").edits).toEqual([{ kind: "axis", field: "endo", value: "endo-filling" }]);
    expect(parseShorthand("WFi").edits).toEqual([{ kind: "axis", field: "endo", value: "endo-filling-incomplete" }]);
    expect(parseShorthand("Twf").edits).toEqual([{ kind: "axis", field: "endo", value: "endo-medical-filling" }]);
    expect(parseShorthand("Res").edits).toEqual([{ kind: "axis", field: "endoResection", value: true }]);
  });
});

describe("Was wir verstehen, aber nicht ablegen koennen", () => {
  it("meldet die Vitalitaetspruefung als offen, nicht als unbekannt", () => {
    const r = parseShorthand("+ - ? p");
    expect(r.edits).toEqual([]);
    expect(r.unknown).toEqual([]);
    expect(r.pending.map(p => p.token)).toEqual(["+", "-", "?", "p"]);
    expect(new Set(r.pending.map(p => p.bead))).toEqual(new Set(["odontogram-fu1"]));
  });

  it("nennt fuer jede offene Taste den Bead, der ihr ein Ziel gibt", () => {
    expect(parseShorthand("Fra").pending[0].bead).toBe("odontogram-t6y");
    expect(parseShorthand("Hem").pending[0].bead).toBe("odontogram-ca0");
    expect(parseShorthand("D").pending[0].bead).toBe("odontogram-0n8");
  });

  it("trennt einen Tippfehler von einer offenen Taste", () => {
    const r = parseShorthand("qq");
    expect(r.unknown).toEqual(["q", "q"]);
    expect(r.pending).toEqual([]);
  });

  it("z hat keine Flaeche bei uns und wird nicht heimlich zu buccal", () => {
    const r = parseShorthand("Am z");
    expect(r.edits).toEqual([]);
    expect(r.pending.map(p => p.token)).toEqual(["z"]);
  });
});

describe("Die Tabelle selbst", () => {
  it("hat keine Taste doppelt in beiden Tabellen", () => {
    const doppelt = Object.keys(SHORTHAND_DE).filter(k => k in SHORTHAND_PENDING);
    expect(doppelt).toEqual([]);
  });

  it("schreibt jede Achsen-Taste auf ein Feld, das defaultState kennt", async () => {
    // Ein Kuerzel, das auf ein Feld zeigt, das es nicht gibt, faellt sonst erst
    // beim ersten Tastendruck auf.
    const felder = new Set<string>();
    for(const e of Object.values(SHORTHAND_DE)){
      if(e.kind === "axis") felder.add(e.field);
      if(e.kind === "axes") for(const x of e.edits) felder.add(x.field);
    }
    const bekannt = new Set([
      "toothSelection", "toothSubstrate", "restorationType", "restorationMaterial",
      "endo", "endoResection", "apicalDx", "periapicalType",
      "extractionPlan", "missingClosed", "prosthesis",
    ]);
    for(const f of felder) expect(bekannt.has(f), `unbekanntes Feld: ${f}`).toBe(true);
  });
});

describe("Der Gang durch das Gebiss: Tabulator vor, Shift-Tabulator zurueck", () => {
  it("faengt bei 18 an", () => {
    expect(CHARTING_ORDER[0]).toBe(18);
    expect(nextChartTooth(null)).toBe(18);
  });

  it("laeuft den Bogen entlang, wie er dasteht", () => {
    expect(nextChartTooth(18)).toBe(17);
    expect(nextChartTooth(11)).toBe(21);   // ueber die Mitte
    expect(nextChartTooth(28)).toBe(38);   // um den Mund herum, nicht zeilenweise
    expect(nextChartTooth(31)).toBe(41);
  });

  it("Shift-Tabulator geht denselben Weg zurueck", () => {
    expect(nextChartTooth(17, -1)).toBe(18);
    expect(nextChartTooth(21, -1)).toBe(11);
    expect(nextChartTooth(38, -1)).toBe(28);
  });

  it("laeuft um: hinter 38 kommt wieder 18", () => {
    // Ein Rundgang durch den Mund ist ein Rundgang. Am letzten Zahn
    // stehenzubleiben hiesse, zur Maus zu greifen, um von vorn anzufangen.
    expect(nextChartTooth(48)).toBe(18);
    expect(nextChartTooth(18, -1)).toBe(48);
  });

  it("ueberspringt, was nicht da ist - etwa ausgeblendete Weisheitszaehne", () => {
    const ohneWeisheit = (n: number) => ![18, 28, 38, 48].includes(n);
    expect(nextChartTooth(null, 1, ohneWeisheit)).toBe(17);
    expect(nextChartTooth(27, 1, ohneWeisheit)).toBe(37);
    expect(nextChartTooth(47, 1, ohneWeisheit)).toBe(17);
  });

  it("gibt null zurueck, wenn gar nichts da ist", () => {
    expect(nextChartTooth(18, 1, () => false)).toBe(null);
  });

  it("k dann Tabulator dann b: Krone und Brueckenglied am Nachbarn", () => {
    // Dirks Ausnahme k-b, als Gebaerde: zwei Tastenfolgen, ein Sprung.
    const zahn = 16;
    expect(parseShorthand("G k").edits).toContainEqual(
      { kind: "axis", field: "restorationType", value: "crown" });
    const nachbar = nextChartTooth(zahn);
    expect(nachbar).toBe(15);
    expect(parseShorthand("b").edits).toContainEqual(
      { kind: "axis", field: "restorationType", value: "bridge" });
  });

  it("geht um den Mund, nicht der Anzeige nach", () => {
    // Die untere Zeile wird von 48 nach 38 GEZEICHNET, aber von 38 nach 48
    // BEGANGEN. Die beiden Reihenfolgen sind absichtlich verschieden.
    expect(ARCH_ROWS[1][0]).toBe(48);
    expect(CHARTING_ORDER[16]).toBe(38);
    expect(CHARTING_ORDER[CHARTING_ORDER.length - 1]).toBe(48);
  });

  it("traegt genau die 32 Zaehne, und jeden einmal", () => {
    expect(CHARTING_ORDER.length).toBe(32);
    expect(new Set(CHARTING_ORDER).size).toBe(32);
    expect(ARCH_ROWS.length).toBe(2);
  });
});
