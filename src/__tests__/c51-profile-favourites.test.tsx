// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Bead odontogram-c51.2. Dirk, 22.08.2026: *"Sollten wir die nicht alphabetisch
// ordnen und dem Anwender die Moeglichkeit geben, Favoriten festzulegen?"*
//
// DREI EIGENSCHAFTEN, und die dritte ist die, die es zu einer Entscheidung
// macht statt zu einer Umsortierung:
//
//   1. Sortiert wird nach der ANGEZEIGTEN Beschriftung, nicht nach der id.
//      Alphabetisch ist eine Aussage ueber das Wort, das der Leser sieht, und
//      das ist in zwoelf Sprachen zwoelfmal ein anderes. Deshalb nimmt
//      `orderProfiles` einen Aufloeser entgegen, statt `t` zu importieren.
//   2. Favoriten stehen oben, in einer eigenen Gruppe — aber die Gruppen
//      erscheinen nur, wenn es ueberhaupt Favoriten gibt.
//   3. DER ERSTE FAVORIT ZIEHT DIE KARTE AUF SICH, solange niemand
//      ausdruecklich gewaehlt hat. Nach einer ausdruecklichen Wahl nie wieder,
//      auch dann nicht, wenn spaeter ein Favorit dazukommt: eine Wahl, die
//      sich unter der Hand aendert, ist schlimmer als gar keine Voreinstellung.
import { describe, it, expect, beforeEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { CephalometryCard } from "../CephalometryCard";
import { orderProfiles, PROFILES } from "../cephalometry";
import {
  getCephFavourites, setCephFavourite, isCephFavourite,
  getCephProfileId, setCephProfileId, isCephProfileChosen,
  resetCephProfilePreferences,
} from "../odontogram";

beforeEach(() => {
  cleanup();
  document.body.innerHTML = "";
  resetCephProfilePreferences();
});

describe("orderProfiles: rein, und nach dem angezeigten Wort", () => {
  it("ohne Favoriten steht alles in einer Gruppe, alphabetisch", () => {
    const { favourites, others } = orderProfiles(p => p.id);
    expect(favourites).toEqual([]);
    expect(others.map(p => p.id)).toEqual(["hasund", "jarabak", "ricketts"]);
  });

  it("sortiert nach dem AUFGELOESTEN Namen, nicht nach der id", () => {
    // Ein Aufloeser, der die Namen umdreht, muss die Reihenfolge umdrehen —
    // sonst haengt die Sortierung heimlich doch an der id.
    const rueckwaerts = orderProfiles(p => ({ hasund: "C", jarabak: "B", ricketts: "A" })[p.id]!);
    expect(rueckwaerts.others.map(p => p.id)).toEqual(["ricketts", "jarabak", "hasund"]);
  });

  it("Favoriten kommen in eine eigene Gruppe, auch dort alphabetisch", () => {
    const { favourites, others } = orderProfiles(p => p.id, ["ricketts", "hasund"]);
    expect(favourites.map(p => p.id)).toEqual(["hasund", "ricketts"]);
    expect(others.map(p => p.id)).toEqual(["jarabak"]);
  });

  it("kennt keine unbekannte id und verliert kein Profil", () => {
    const { favourites, others } = orderProfiles(p => p.id, ["gibtsnicht"]);
    expect(favourites).toEqual([]);
    expect(others).toHaveLength(PROFILES.length);
  });

  it("laesst die Messgroessen INNERHALB eines Profils in Ruhe", () => {
    // Jarabaks Reihenfolge ist die des Polygons; alphabetisch waere Unsinn.
    const j = orderProfiles(p => p.id).others.find(p => p.id === "jarabak")!;
    expect(j.measures[0]).toBe("SaddleAngle");
    expect(j.measures[j.measures.length - 1]).toBe("JarabakIndex");
  });
});

describe("die Markierung selbst", () => {
  it("setzen, lesen, wieder nehmen", () => {
    expect(getCephFavourites()).toEqual([]);
    setCephFavourite("ricketts", true);
    expect(isCephFavourite("ricketts")).toBe(true);
    expect(getCephFavourites()).toEqual(["ricketts"]);
    setCephFavourite("ricketts", false);
    expect(getCephFavourites()).toEqual([]);
  });

  it("eine leere id bewirkt nichts", () => {
    setCephFavourite("", true);
    expect(getCephFavourites()).toEqual([]);
  });
});

describe("wer die Karte auf sich zieht", () => {
  it("ohne Favorit und ohne Wahl bleibt es beim Anfangsverfahren", () => {
    render(<CephalometryCard />);
    expect(getCephProfileId()).toBe("hasund");
    expect(isCephProfileChosen()).toBe(false);
  });

  it("ein Favorit zieht die Karte auf sich, solange niemand gewaehlt hat", () => {
    setCephFavourite("jarabak", true);
    render(<CephalometryCard />);
    expect(getCephProfileId()).toBe("jarabak");
    // ... und das gilt weiterhin nicht als ausdrueckliche Wahl
    expect(isCephProfileChosen()).toBe(false);
  });

  it("nach einer ausdruecklichen Wahl zieht ein spaeterer Favorit NICHT mehr", () => {
    setCephProfileId("ricketts");
    expect(isCephProfileChosen()).toBe(true);
    setCephFavourite("jarabak", true);
    render(<CephalometryCard />);
    expect(getCephProfileId()).toBe("ricketts");
  });

  it("bei zwei Favoriten gewinnt der alphabetisch erste, nicht der zuerst markierte", () => {
    setCephFavourite("ricketts", true);
    setCephFavourite("jarabak", true);
    render(<CephalometryCard />);
    expect(getCephProfileId()).toBe("jarabak");   // Jarabak < Ricketts
  });
});

describe("die Auswahlliste in der Karte", () => {
  it("ohne Favoriten keine Gruppen — eine Ueberschrift ueber der einzigen Gruppe sagt nichts", () => {
    render(<CephalometryCard />);
    const sel = document.getElementById("cephProfile") as HTMLSelectElement;
    expect(sel.querySelectorAll("optgroup")).toHaveLength(0);
    expect([...sel.options].map(o => o.value)).toEqual(["hasund", "jarabak", "ricketts"]);
  });

  it("mit Favorit zwei Gruppen, der Favorit oben", () => {
    setCephFavourite("ricketts", true);
    render(<CephalometryCard />);
    const sel = document.getElementById("cephProfile") as HTMLSelectElement;
    const gruppen = [...sel.querySelectorAll("optgroup")];
    expect(gruppen).toHaveLength(2);
    expect([...gruppen[0].querySelectorAll("option")].map(o => o.value)).toEqual(["ricketts"]);
    expect([...gruppen[1].querySelectorAll("option")].map(o => o.value)).toEqual(["hasund", "jarabak"]);
  });

  it("sind ALLE Verfahren Favoriten, entfaellt die zweite Gruppe", () => {
    for (const p of PROFILES) setCephFavourite(p.id, true);
    render(<CephalometryCard />);
    const sel = document.getElementById("cephProfile") as HTMLSelectElement;
    expect(sel.querySelectorAll("optgroup")).toHaveLength(1);
    expect(sel.options).toHaveLength(PROFILES.length);
  });
});

describe("der Stern", () => {
  it("zeigt den Zustand des GEWAEHLTEN Verfahrens und schaltet ihn um", () => {
    render(<CephalometryCard />);
    const stern = document.getElementById("cephFavourite") as HTMLButtonElement;
    expect(stern.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(stern);
    expect(isCephFavourite(getCephProfileId())).toBe(true);
    expect((document.getElementById("cephFavourite") as HTMLButtonElement)
      .getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(document.getElementById("cephFavourite")!);
    expect(isCephFavourite(getCephProfileId())).toBe(false);
  });

  it("folgt dem Wechsel des Verfahrens", () => {
    setCephFavourite("jarabak", true);
    render(<CephalometryCard />);
    // Die Karte steht jetzt auf Jarabak, also ist der Stern gefuellt.
    expect((document.getElementById("cephFavourite") as HTMLButtonElement)
      .getAttribute("aria-pressed")).toBe("true");

    const sel = document.getElementById("cephProfile") as HTMLSelectElement;
    fireEvent.change(sel, { target: { value: "hasund" } });
    expect((document.getElementById("cephFavourite") as HTMLButtonElement)
      .getAttribute("aria-pressed")).toBe("false");
  });
});

describe("Zuruecksetzen", () => {
  it("raeumt Markierungen und Wahl", () => {
    setCephFavourite("ricketts", true);
    setCephProfileId("jarabak");
    resetCephProfilePreferences();
    expect(getCephFavourites()).toEqual([]);
    expect(getCephProfileId()).toBe("hasund");
    expect(isCephProfileChosen()).toBe(false);
  });
});
