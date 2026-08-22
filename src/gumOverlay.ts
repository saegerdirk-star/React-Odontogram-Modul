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
      // Gestempelt, damit ein spaeterer Aufsatz den Klon wiederfindet. Am
      // ORIGINAL in der Kachel laesst sich nicht messen: die Baender sind dort
      // `display:none`, und ein ausgeblendetes Element hat keine Ausdehnung.
      // Genau daran ist die Halsverschattung gescheitert, bevor sie am
      // 20.08.2026 wieder herausgenommen wurde.
      huelle.dataset.tooth = String((kachel as HTMLElement).dataset.tooth ?? "");
      huelle.dataset.layer = id;
      huelle.appendChild(quelle.cloneNode(true));
      overlay.appendChild(huelle);
    }
  }

  papillenluecken(grid, overlay, gridRect, kacheln);
  bruchlinien(grid, gridRect, kacheln);
  // Die Halsverschattung ist am 20.08.2026 wieder ENTFERNT worden. Sie sass
  // falsch, und zwar nicht durch einen Rechenfehler: sie haengt am gezeichneten
  // Zahnfleischrand, und dessen Hoehe stimmt selbst noch nicht (das Band steht
  // zu weit koronal und ist zu hoch - siehe den Bead zur Zahnfleischhoehe).
  // Einen Schatten an einen Rand zu legen, der noch wandert, heisst den Fehler
  // zu verdoppeln. Sie kommt wieder, wenn der Rand sitzt.
}

/** Bead odontogram-gry: das SCHWARZE DREIECK.
 *
 *  Der Befund heisst so, und die Form ist nicht gewaehlt, sondern gegeben: wo
 *  die Papille zurueckgegangen ist, bleibt zwischen zwei Zaehnen ein Raum, den
 *  oben die beiden zusammenlaufenden Kronen begrenzen und unten der
 *  Zahnfleischrand. Basis am Zahnfleisch, Spitze am Kontaktpunkt. Je weiter die
 *  Papille zurueckgeht, desto groesser wird er - deshalb tragen Hoehe UND
 *  Breite die Klasse nach Nordland & Tarnow.
 *
 *  Dirk, 19.08.2026, zu charlys Tastenfeld: "das Dreieck IST die Papille."
 *
 *  IN EINER AUFLAGE VOR DEN KACHELN, wie die Bruchlinie. Hinter ihnen gezeichnet
 *  waere sie fast unsichtbar: am Kontaktpunkt beruehren sich die beiden Kronen,
 *  und durch bleibt dort nur der vier Bildpunkte breite Rasterspalt. Genau so
 *  sah es im ersten Versuch aus - ein dunkler Splitter statt eines Dreiecks.
 *  Und der Ort stimmt auch so: ein schwarzes Dreieck sieht man VOR den Zaehnen,
 *  nicht zwischen ihnen hindurch.
 *
 *  Die Hoehe des Zahnfleischrandes wird GEMESSEN, am Klon in der
 *  Zahnfleischauflage. Am Original in der Kachel geht es nicht - dort ist das
 *  Band `display:none` und liefert Nullen. Ein Bruchteil der Kachelhoehe stand
 *  hier einen Zug lang, aus der Bruchlinie uebernommen; im Bild sassen die
 *  Dreiecke daraufhin mitten im Knochen. Seit dem 20.08.2026 haengt die
 *  Bandhoehe ohnehin an der Schmelz-Zement-Grenze des jeweiligen Zahns
 *  (odontogram-x8k), eine geschaetzte Hoehe laege also auch noch je Zahn anders
 *  daneben. */
function papillenluecken(grid: HTMLElement, band: SVGSVGElement, gridRect: DOMRect,
                         kacheln: ArrayLike<Element>): void {
  let auflage = grid.querySelector(":scope > svg.papilla-marks") as SVGSVGElement | null;
  const betroffen = Array.from(kacheln).filter((k) => {
    const el = k as HTMLElement;
    return el.classList.contains("side-view")
      && (el.dataset.papillaLeft || el.dataset.papillaRight);
  });
  if(betroffen.length === 0){
    if(auflage) auflage.remove();
    return;
  }
  if(!auflage){
    auflage = document.createElementNS(SVG_NS, "svg");
    auflage.setAttribute("class", "papilla-marks");
    auflage.setAttribute("aria-hidden", "true");
    grid.appendChild(auflage);
  }
  while(auflage.firstChild) auflage.removeChild(auflage.firstChild);
  auflage.setAttribute("viewBox", `0 0 ${gridRect.width} ${gridRect.height}`);

  // WIEVIEL DER PAPILLE FEHLT, und wie breit die Luecke dabei wird.
  //
  // Dirk, 22.08.2026: "das Dreieck wird mit dem Grad von 1 zu 3 groesser und
  // soll die Papilla verdecken. Dazu muesste es nach meinem Verstaendnis aber
  // tiefer sitzen, besonders bei Grad 3."
  //
  // Er hat recht, und gemessen war es schlimmer als es aussah: das Dreieck sass
  // VOLLSTAENDIG AUSSERHALB des Zahnfleischs, auf der Kronenseite, und beruehrte
  // die Papillenspitze nur mit seiner Basis (16: Band y 119..139, Dreieck 139
  // bis 151). Es verdeckte also nichts - und je hoeher der Grad, desto weiter
  // WEG vom Zahnfleisch reichte es. Genau umgekehrt zu dem, was ein Rueckgang
  // ist.
  //
  // Richtig herum: die Papille IST ein Dreieck mit der Spitze am Kontaktpunkt.
  // Faellt sie zurueck, verschwindet ihr KORONALER Teil, und der fehlende Teil
  // ist wieder ein Dreieck - Spitze koronal, nach apikal breiter werdend, und
  // umso tiefer, je hoeher die Klasse. Das Mal liegt deshalb AUF dem Band, mit
  // der Spitze an der Papillenspitze.
  //
  // Die Tiefe ist ein ANTEIL der gemessenen Bandhoehe, keine feste Zahl - seit
  // 2.25.0 haengt das Band an der eigenen Zervikallinie jedes Zahns, und eine
  // feste Zahl waere am Einundvierziger etwas anderes als am Dreier. Nordland &
  // Tarnow III heisst "die Papille ist weg", also die volle Hoehe.
  const TIEFE: Record<string, number> = { "1": 0.35, "2": 0.65, "3": 1.0 };
  const HALBBREITE: Record<string, number> = { "1": 3, "2": 4, "3": 5 };
  const GRID_GAP = 4;   // `gap` an `.tooth-arch` in src/index.css

  for(const kachel of betroffen){
    const el = kachel as HTMLElement;
    const r = el.getBoundingClientRect();
    if(r.width === 0) continue;
    const oben = !!kachel.closest(".upper-arch");
    const x0 = r.left - gridRect.left;
    const oberkante = r.top - gridRect.top;

    const klon = band.querySelector(
      `g[data-tooth="${el.dataset.tooth}"][data-layer="gum-base"]`) as SVGGElement | null;
    let rand = oberkante + r.height * (oben ? 0.46 : 0.54);   // Rueckfall ohne Layout
    let bandhoehe = r.height * 0.13;                          // desgleichen
    // `getBoundingClientRect`, NICHT `getBBox`: letzteres misst im eigenen
    // Koordinatensystem des Elements, also VOR seiner eigenen Transformation -
    // und genau die setzt den Klon erst ins Raster. Gemessen kam damit
    // (3,3 | 42,7) heraus, wo (196 | 331) steht.
    const kasten = klon && typeof klon.getBoundingClientRect === "function"
      ? klon.getBoundingClientRect() : null;
    if(kasten && kasten.height > 0){
      rand = (oben ? kasten.bottom : kasten.top) - gridRect.top;
      bandhoehe = kasten.height;
    }

    for(const [seite, klasse] of [["links", el.dataset.papillaLeft ?? ""],
                                  ["rechts", el.dataset.papillaRight ?? ""]] as const){
      if(!klasse) continue;
      // Die Mitte des Gelenks liegt in der RASTERLUECKE zwischen zwei Kacheln,
      // nicht auf der Kachelkante - eine halbe Luecke daneben.
      const gelenk = seite === "links" ? x0 - GRID_GAP / 2 : x0 + r.width + GRID_GAP / 2;
      const hoehe = bandhoehe * (TIEFE[klasse] ?? TIEFE["1"]);
      const halb = HALBBREITE[klasse] ?? HALBBREITE["1"];
      // Die SPITZE sitzt an der Papillenspitze und zeigt zum Kontaktpunkt - im
      // Oberkiefer nach unten, im Unterkiefer nach oben. Die BASIS liegt so viel
      // weiter apikal, wie die Klasse sagt, also IM Band.
      const basis = oben ? rand - hoehe : rand + hoehe;
      const dreieck = document.createElementNS(SVG_NS, "path");
      dreieck.setAttribute("d",
        `M${gelenk - halb},${basis}L${gelenk + halb},${basis}L${gelenk},${rand}Z`);
      // GRAU, nicht schwarz: der klinische Name ist zwar das schwarze Dreieck,
      // aber im Odontogramm ist Schwarz schon die Bruchlinie, und eine Farbe
      // traegt hier ueberall Bedeutung. Grau ist der Raum, der leer ist.
      dreieck.setAttribute("fill", "#8d8d8d");
      dreieck.setAttribute("opacity", "0.85");
      auflage.appendChild(dreieck);
    }
  }
}

/** Bead odontogram-t6y: die Bruchlinie durch die Wurzel.
 *
 *  Dirk, 20.08.2026: "Bei einer Wurzelfraktur sollte eine Bruchlinie durch die
 *  Wurzel gezeichnet werden, bei mehrwurzeligen Zaehnen per Schalter zwischen
 *  den Wurzeln wechselbar." Schwarz, weil ein Bruch keine Farbe hat und weil
 *  jede Farbe hier schon etwas anderes bedeutet.
 *
 *  In der Auflage VOR den Kacheln, aus demselben Grund wie die
 *  Halsverschattung: sie liegt AUF dem Zahn. Ausserhalb der Zahn-SVG und damit
 *  ausserhalb jedes Vertrags - keine neue Ebene, kein neuer Fingerabdruck, kein
 *  Generatorlauf.
 *
 *  LAENGS laeuft die Linie mit der Wurzel, QUER quer darueber. Das ist der
 *  Unterschied, der klinisch zaehlt: die Laengsfraktur ist der
 *  Extraktionsgrund.
 *
 *  Die Seite kommt aus `data-fracture-side`, das odontogram.ts setzt - eine
 *  Seitenansicht kennt links und rechts, nicht mesial und distal, und mesial
 *  liegt je nach Quadrant anders. */
function bruchlinien(grid: HTMLElement, gridRect: DOMRect,
                     kacheln: ArrayLike<Element>): void {
  let auflage = grid.querySelector(":scope > svg.fracture-lines") as SVGSVGElement | null;
  const betroffen = Array.from(kacheln).filter(
    (k) => (k as HTMLElement).dataset.fractureKind);
  if(betroffen.length === 0){
    if(auflage) auflage.remove();
    return;
  }
  if(!auflage){
    auflage = document.createElementNS(SVG_NS, "svg");
    auflage.setAttribute("class", "fracture-lines");
    auflage.setAttribute("aria-hidden", "true");
    grid.appendChild(auflage);
  }
  while(auflage.firstChild) auflage.removeChild(auflage.firstChild);
  auflage.setAttribute("viewBox", `0 0 ${gridRect.width} ${gridRect.height}`);

  for(const kachel of betroffen){
    const el = kachel as HTMLElement;
    const art = el.dataset.fractureKind;          // "vertical" | "horizontal"
    const seite = el.dataset.fractureSide || "mitte";
    const svg = kachel.querySelector("svg");
    if(!svg) continue;
    const r = (kachel as HTMLElement).getBoundingClientRect();
    if(r.width === 0) continue;
    const oben = !!kachel.closest(".upper-arch");

    // Verankert an der KACHEL, nicht an `gum-base`: das ist in der Kachel
    // ausgeblendet und liefert Nullen - daran ist diese Linie beim ersten
    // Versuch quer durch das ganze Odontogramm gelaufen.
    const x0 = r.left - gridRect.left;
    const oberkante = r.top - gridRect.top;
    const hals = oberkante + r.height * (oben ? 0.46 : 0.54);
    const apex = oben ? oberkante + r.height * 0.08
                      : oberkante + r.height * 0.92;

    // Wo quer ueber die Kachel: links, rechts oder auf dem Stamm.
    const mitte = x0 + r.width * (seite === "links" ? 0.32 : seite === "rechts" ? 0.68 : 0.5);
    const halb = r.width * 0.17;

    const linie = document.createElementNS(SVG_NS, "line");
    if(art === "vertical"){
      // Laengs: vom Zahnhals bis kurz vor den Apex.
      linie.setAttribute("x1", String(mitte));
      linie.setAttribute("y1", String(hals));
      linie.setAttribute("x2", String(mitte));
      linie.setAttribute("y2", String(apex));
    }else{
      // Quer: auf halbem Weg zwischen Hals und Apex.
      const y = (hals + apex) / 2;
      linie.setAttribute("x1", String(mitte - halb));
      linie.setAttribute("y1", String(y));
      linie.setAttribute("x2", String(mitte + halb));
      linie.setAttribute("y2", String(y));
    }
    linie.setAttribute("stroke", "#111");
    linie.setAttribute("stroke-width", "1.6");
    linie.setAttribute("stroke-linecap", "round");
    auflage.appendChild(linie);
  }
}

