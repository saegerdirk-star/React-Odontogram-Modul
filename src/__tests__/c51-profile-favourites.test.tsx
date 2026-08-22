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
import { t } from "../i18n/useI18n";
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
    // Gegen den tatsaechlichen Bestand pruefen, nicht gegen eine feste Liste:
    // aus dem FRWin-Katalog kommen laufend weitere Verfahren dazu, und ein
    // ID-fester Test waere bei jedem neuen rot.
    const alleIds = PROFILES.map(p => p.id);
    expect(others.map(p => p.id)).toEqual([...alleIds].sort((a, b) => a.localeCompare(b)));
    expect(others).toHaveLength(PROFILES.length);
  });

  it("sortiert nach dem AUFGELOESTEN Namen, nicht nach der id", () => {
    // Ein Aufloeser, der die Namen GEGEN die id-Ordnung stellt, muss die
    // Ausgabe entsprechend drehen — sonst haengt die Sortierung heimlich doch
    // an der id. Jedem Profil ein Label geben, das der id-Reihenfolge
    // entgegenlaeuft (Index von hinten als Buchstabe), und pruefen, dass die
    // Ausgabe die umgekehrte id-Reihenfolge ist.
    const ids = PROFILES.map(p => p.id).sort((a, b) => a.localeCompare(b));
    const label = (id: string) => String.fromCharCode(90 - ids.indexOf(id)); // Z, Y, X, ...
    const gedreht = orderProfiles(p => label(p.id));
    expect(gedreht.others.map(p => p.id)).toEqual([...ids].reverse());
  });

  it("Favoriten kommen in eine eigene Gruppe, auch dort alphabetisch", () => {
    const { favourites, others } = orderProfiles(p => p.id, ["ricketts", "hasund"]);
    expect(favourites.map(p => p.id)).toEqual(["hasund", "ricketts"]);
    // die anderen sind alle uebrigen Verfahren, alphabetisch
    const uebrig = PROFILES.map(p => p.id).filter(id => id !== "hasund" && id !== "ricketts");
    expect(others.map(p => p.id)).toEqual(uebrig.sort((a, b) => a.localeCompare(b)));
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
  // Seit odontogram-c51.3 (Powell) gruppiert der Waehler nach MEDIUM:
  // Fernroentgen vs. Fotostat. Powell ist das Foto-Verfahren, alle anderen sind
  // Film. Innerhalb jeder Gruppe stehen die Favoriten oben, dann alphabetisch.
  const filmIds = () =>
    orderProfiles(pr => t(pr.labelKey), [], PROFILES.filter(pr => (pr.medium ?? "film") === "film")).others.map(pr => pr.id);
  const photoIds = () =>
    orderProfiles(pr => t(pr.labelKey), [], PROFILES.filter(pr => pr.medium === "photo")).others.map(pr => pr.id);

  it("gruppiert nach Medium: Fernroentgen und Fotostat", () => {
    render(<CephalometryCard />);
    const sel = document.getElementById("cephProfile") as HTMLSelectElement;
    const gruppen = [...sel.querySelectorAll("optgroup")];
    expect(gruppen).toHaveLength(2);
    expect([...gruppen[0].querySelectorAll("option")].map(o => o.value)).toEqual(filmIds());
    expect([...gruppen[1].querySelectorAll("option")].map(o => o.value)).toEqual(photoIds());
    // Powell steht in der Foto-Gruppe, nicht bei den Film-Verfahren.
    expect(photoIds()).toContain("powell");
    expect(filmIds()).not.toContain("powell");
  });

  it("ein Favorit steht INNERHALB seiner Medium-Gruppe oben", () => {
    setCephFavourite("ricketts", true);   // Ricketts ist ein Film-Verfahren
    render(<CephalometryCard />);
    const sel = document.getElementById("cephProfile") as HTMLSelectElement;
    const film = [...sel.querySelectorAll("optgroup")][0];
    expect([...film.querySelectorAll("option")][0].getAttribute("value")).toBe("ricketts");
  });

  it("jedes Verfahren erscheint genau einmal, in seiner Medium-Gruppe", () => {
    render(<CephalometryCard />);
    const sel = document.getElementById("cephProfile") as HTMLSelectElement;
    expect(sel.options).toHaveLength(PROFILES.length);
    expect([...sel.options].map(o => o.value).sort())
      .toEqual([...filmIds(), ...photoIds()].sort());
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
