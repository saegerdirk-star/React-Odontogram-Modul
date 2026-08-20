// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Bead odontogram-fu1: die Pulpapruefung neben der Pulpadiagnose.
//
// Der Grund, aus dem es die Achsen gibt, steht in EINEM Satz: `apicalDx`
// unterscheidet symptomatische von asymptomatischer apikaler Parodontitis, und
// was diese beiden trennt, IST die Perkussionsempfindlichkeit. Wir fuehrten die
// Schlussfolgerung und nirgends den Test.
import { describe, it, expect, beforeEach } from "vitest";
import {
  setSensibility, getSensibility, setPercussion, getPercussion,
  sensibilityAllowed, percussionAllowed,
  getStatusChart, __resetChartStateForTest, __setToothStateForTest,
} from "../odontogram";

beforeEach(() => { __resetChartStateForTest(); });

describe("Zwei Achsen, nicht eine", () => {
  it("ein vitaler Zahn kann perkussionsempfindlich sein", () => {
    setSensibility(16, "vital");
    setPercussion(16, "sensitive");
    expect(getSensibility(16)).toBe("vital");
    expect(getPercussion(16)).toBe("sensitive");
  });

  it("die eine Achse raeumt die andere nicht", () => {
    setSensibility(16, "no-response");
    setPercussion(16, "negative");
    setSensibility(16, "questionable");
    expect(getPercussion(16)).toBe("negative");
  });
});

describe("`none` heisst NICHT GEPRUEFT", () => {
  it("ein unberuehrter Zahn ist nicht geprueft, nicht unauffaellig", () => {
    expect(getSensibility(11)).toBe("none");
    expect(getPercussion(11)).toBe("none");
  });

  it("geprueft und nicht klopfempfindlich ist ein eigener Befund", () => {
    // Genau der, an dem die AAE symptomatische von asymptomatischer apikaler
    // Parodontitis unterscheidet - waere er nicht von "nicht geprueft" zu
    // trennen, koennte man die Diagnose nicht begruenden.
    setPercussion(16, "negative");
    expect(getPercussion(16)).toBe("negative");
    expect(getPercussion(16)).not.toBe("none");
  });

  it("wird als NICHT gesetzt serialisiert und faellt aus der Nutzlast", () => {
    setSensibility(16, "vital");
    const teeth = getStatusChart().teeth as Record<string, Record<string, unknown>>;
    expect(teeth["16"].sensibility).toBe("vital");
    expect(teeth["16"].percussion).toBeUndefined();
    expect(teeth["11"]?.sensibility).toBeUndefined();
  });
});

describe("Wo gepruft werden kann", () => {
  it("am vorhandenen natuerlichen Zahn und am Milchzahn", () => {
    expect(sensibilityAllowed({ toothSelection: "tooth-base" })).toBe(true);
    expect(sensibilityAllowed({ toothSelection: "milktooth" })).toBe(true);
  });

  it("nicht an einer Luecke und nicht am Implantat - dort ist keine Pulpa", () => {
    expect(sensibilityAllowed({ toothSelection: "none" })).toBe(false);
    expect(sensibilityAllowed({ toothSelection: "implant" })).toBe(false);
  });

  it("die Perkussion geht weiter: ein Implantat laesst sich klopfen", () => {
    // Klopfempfindlichkeit ist dort ein periimplantaeres Zeichen.
    expect(percussionAllowed({ toothSelection: "implant" })).toBe(true);
    expect(percussionAllowed({ toothSelection: "none" })).toBe(false);
  });

  it("die Sperre steht VOR dem Gate - ein Implantat nimmt keine Sensibilitaet an", () => {
    __setToothStateForTest(16, { toothSelection: "implant" });
    setSensibility(16, "vital");
    expect(getSensibility(16)).toBe("none");
    // Die Perkussion nimmt es sehr wohl an.
    setPercussion(16, "sensitive");
    expect(getPercussion(16)).toBe("sensitive");
  });

  it("`none` darf immer geschrieben werden - sonst waere ein Wert nicht mehr wegzunehmen", () => {
    setPercussion(16, "sensitive");
    __setToothStateForTest(16, { toothSelection: "none", percussion: "sensitive" });
    setPercussion(16, "none");
    expect(getPercussion(16)).toBe("none");
  });
});

describe("Ungueltiges wird nicht angenommen", () => {
  it("ein erfundener Wert aendert nichts", () => {
    setSensibility(16, "vital");
    setSensibility(16, "halbvital");
    expect(getSensibility(16)).toBe("vital");
  });
});
