// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// EIN Zahnfleisch- und Knochenband je Bogen, hinter allen Zaehnen.
//
// Warum es das gibt: jede Zeichnung ist BREITER als ihre Spalte, und das mit
// Absicht - eine Papille gehoert zwei Zaehnen, und ohne Ueberstand ergibt die
// Gingiva keine durchgehende Linie ueber den Bogen. Gemessen am 19.08.2026:
//
//     Position 16   Spalte 62 px   Zeichnung 69,5 px    +3,8 px je Seite
//     Position 15   Spalte 35 px   Milchzahn 69,5 px   +17,2 px je Seite
//
// Jede Kachel traegt ihr eigenes SVG, und ein SVG wird als Ganzes gemalt: erst
// Knochen, dann Zahnfleisch, dann Zahn. Der Nachbar kommt in der Bogenreihenfolge
// DANACH - und sein undurchsichtiges Knochenband deckte die mesiale Flanke des
// vorherigen Zahns zu. Dirk: "Die mesiale Wurzel von 16 ist an ihrer breitesten
// Ausdehnung Richtung mesial leicht verdeckt. An den Milchzaehnen ist die
// Verdeckung deutlich" - dort steht ein Milchmolar in der Spalte eines
// Praemolaren, und der ist mesio-distal schmaler.
//
// Die Baender wandern deshalb aus den Kacheln in EINE Auflage hinter dem Raster.
// Damit malen alle Zaehne ueber alle Baender, unabhaengig von der Reihenfolge,
// und der Ueberstand bleibt erhalten, wo er hingehoert: unter dem Nachbarn.
//
// Der billige Weg waere gewesen, jede Kachel zweimal zu haengen (Baender auf
// z-index 1, Zahn auf 2). Das haette die Knotenzahl verdoppelt - rund 14.000
// werden 28.000 -, und die Kachelzahl ist bereits die groesste Last der
// Darstellung. Die Baender sind SECHS Elemente je Zahn, also kostet das Klonen
// hierher rund 190 Knoten. Gemessen, nicht geschaetzt.
//
// Vorbild ist `bridgeOverlay.ts`: eine eigene `<svg>`-Auflage ueber demselben
// Raster, damit es eine Quelle dafuer gibt, wo eine Kachel liegt.

const SVG_NS = "http://www.w3.org/2000/svg";

/** Die Ebenen, die den Bogen entlanglaufen statt zum Zahn zu gehoeren. */
export const BAND_LAYER_IDS = ["bone-base", "gum-base"] as const;

/** Die Transformkette von einer Ebene bis zur SVG-Wurzel, von aussen nach innen.
 *
 *  `rotate180` und `mirrorVertical` haengen ihre Transformation an eine Huelle
 *  UM den Inhalt. Wer nur die Bandebene klont, verliert sie - der Klon stuende
 *  im Unterkiefer auf dem Kopf. Deshalb wird die Kette mitgenommen statt sie
 *  aus `TOOTH_TEMPLATE` neu abzuleiten: gefragt ist, was tatsaechlich am Zahn
 *  haengt, nicht was daran haengen sollte. */
function transformKette(von: Element, bis: Element): string[] {
  const aus: string[] = [];
  for(let e: Element | null = von.parentElement; e && e !== bis; e = e.parentElement){
    const t = e.getAttribute?.("transform");
    if(t) aus.unshift(t);
  }
  return aus;
}

/**
 * Die Bandauflage (neu) zeichnen. Idempotent: sie wird bei jedem Aufruf geleert
 * und neu gefuellt, und sie legt nichts an, solange kein Raster steht.
 *
 * Der Zustand wird NICHT hier ausgewertet - gelesen wird `data-active` an der
 * Ebene selbst, so wie die Anzeige es hinterlassen hat. Ein fehlender Zahn hat
 * kein Band, und diese Auflage muss davon nichts wissen.
 */
export function renderGumOverlay(grid: HTMLElement | null): void {
  if(!grid) return;
  const kacheln = grid.querySelectorAll(".tooth-tile.side-view");
  let overlay = grid.querySelector(":scope > svg.gum-overlay") as SVGSVGElement | null;

  if(kacheln.length === 0){
    if(overlay) while(overlay.firstChild) overlay.removeChild(overlay.firstChild);
    return;
  }

  const gridRect = grid.getBoundingClientRect();
  if(gridRect.width === 0 || gridRect.height === 0) return;

  if(!overlay){
    overlay = document.createElementNS(SVG_NS, "svg");
    overlay.setAttribute("class", "gum-overlay");
    overlay.setAttribute("aria-hidden", "true");
    // GANZ nach vorne im DOM, damit die Auflage hinter jeder Kachel liegt: sie
    // traegt kein z-index, also entscheidet die Reihenfolge - und die Zeichnungen
    // stehen ohnehin auf z-index 1.
    grid.insertBefore(overlay, grid.firstChild);
  }
  while(overlay.firstChild) overlay.removeChild(overlay.firstChild);
  overlay.setAttribute("viewBox", `0 0 ${gridRect.width} ${gridRect.height}`);

  for(const kachel of Array.from(kacheln)){
    const svg = kachel.querySelector("svg");
    if(!svg) continue;
    const r = svg.getBoundingClientRect();
    if(r.width === 0 || r.height === 0) continue;
    const vb = (svg.getAttribute("viewBox") || "").trim().split(/\s+/).map(Number);
    if(vb.length !== 4 || vb.some((n) => !Number.isFinite(n))) continue;

    const sx = r.width / vb[2];
    const sy = r.height / vb[3];
    const gx = r.left - gridRect.left;
    const gy = r.top - gridRect.top;

    for(const id of BAND_LAYER_IDS){
      const quelle = svg.querySelector(`[id="${id}"]`);
      if(!quelle) continue;
      if(quelle.getAttribute("data-active") === "0") continue;

      const huelle = document.createElementNS(SVG_NS, "g");
      // Zuerst in das Raster setzen und skalieren, DANN die Kette des Zahns -
      // sie rechnet in viewBox-Koordinaten und muss deshalb innen stehen.
      huelle.setAttribute(
        "transform",
        `translate(${gx} ${gy}) scale(${sx} ${sy}) translate(${-vb[0]} ${-vb[1]}) `
          + transformKette(quelle, svg).join(" "),
      );
      huelle.appendChild(quelle.cloneNode(true));
      overlay.appendChild(huelle);
    }
  }

  halsVerschattung(grid, gridRect, kacheln);
}

/** Der weiche dunkle Saum dort, wo der Zahn ins Zahnfleisch eintritt.
 *
 *  Dirk, 20.08.2026, zur Frage nach der dritten Dimension. Von den drei
 *  Tiefenreizen ist das der staerkste: eine Zahnreihe ist ein Relief, und ein
 *  Relief erkennt man an dem, was es verschattet - nicht an seiner Woelbung.
 *
 *  VOR den Kacheln, nicht dahinter. Die Baender oben liegen hinter dem Raster,
 *  weil sie hinter den Zaehnen stehen; ein Schatten dagegen faellt AUF sie.
 *  Deshalb eine zweite Auflage, die zuletzt eingehaengt wird.
 *
 *  Ausserhalb der Zahn-SVG und damit ausserhalb jedes Vertrags: der
 *  Fingerabdruck laeuft ueber die Vorlagen, nicht ueber die Auflagen.
 *
 *  Die Hoehe kommt vom Zahnfleisch SELBST (`gum-base`, seine koronale Kante),
 *  nicht aus einer gesetzten Zahl - sonst wandert der Schatten, sobald die
 *  Gingiva sich aendert, und liegt an einem hochgezogenen Hals daneben. */
function halsVerschattung(grid: HTMLElement, gridRect: DOMRect,
                          kacheln: ArrayLike<Element>): void {
  let schatten = grid.querySelector(":scope > svg.gum-shade") as SVGSVGElement | null;
  const an = grid.classList.contains("odon-depth");
  if(!an){
    if(schatten) schatten.remove();
    return;
  }
  if(!schatten){
    schatten = document.createElementNS(SVG_NS, "svg");
    schatten.setAttribute("class", "gum-shade");
    schatten.setAttribute("aria-hidden", "true");
    grid.appendChild(schatten);          // zuletzt = vorne
  }
  while(schatten.firstChild) schatten.removeChild(schatten.firstChild);
  schatten.setAttribute("viewBox", `0 0 ${gridRect.width} ${gridRect.height}`);

  const defs = document.createElementNS(SVG_NS, "defs");
  for(const [id, y1, y2] of [["odonHalsAb", "0", "1"], ["odonHalsAuf", "1", "0"]] as const){
    const g = document.createElementNS(SVG_NS, "linearGradient");
    g.setAttribute("id", id);
    g.setAttribute("x1", "0"); g.setAttribute("x2", "0");
    g.setAttribute("y1", y1); g.setAttribute("y2", y2);
    for(const [off, op] of [["0", "0.20"], ["0.45", "0.06"], ["1", "0"]] as const){
      const st = document.createElementNS(SVG_NS, "stop");
      st.setAttribute("offset", off);
      st.setAttribute("stop-color", "#5a4038");
      st.setAttribute("stop-opacity", op);
      g.appendChild(st);
    }
    defs.appendChild(g);
  }
  schatten.appendChild(defs);

  // Wie weit der Schatten koronal reicht, als Anteil der Kachelhoehe.
  const TIEFE = 0.11;

  for(const kachel of Array.from(kacheln)){
    const svg = kachel.querySelector("svg");
    if(!svg) continue;
    const gum = svg.querySelector('[id="gum-base"]');
    if(!gum || gum.getAttribute("data-active") === "0") continue;
    const rk = (kachel as HTMLElement).getBoundingClientRect();
    const rg = (gum as SVGGraphicsElement).getBoundingClientRect();
    if(rk.width === 0 || rg.height === 0) continue;

    // Oberkiefer: Krone nach unten, der Schatten faellt also nach unten.
    const oben = !!kachel.closest(".upper-arch");
    const hoehe = rk.height * TIEFE;
    const y = oben ? rg.bottom - gridRect.top : rg.top - gridRect.top - hoehe;

    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", String(rk.left - gridRect.left));
    rect.setAttribute("y", String(y));
    rect.setAttribute("width", String(rk.width));
    rect.setAttribute("height", String(hoehe));
    rect.setAttribute("fill", `url(#${oben ? "odonHalsAb" : "odonHalsAuf"})`);
    schatten.appendChild(rect);
  }
}
