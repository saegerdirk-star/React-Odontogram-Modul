// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Created by Zoltan Dul (https://github.com/ZoliQua) 2025-2026

/** UI value metadata used by the registry and renderer. Dental Core FHIR
 * terminology is generated from the published Core package. */

/** A stable renderer value and its display label. */
export interface CodeEntry {
  code: string;
  display: string;
}

/**
 * Local value maps, keyed by enum group then by enum value.
 * `display` strings are English (the export is language-neutral data).
 */
export const LOCAL_VALUE_MAPS: Record<string, Record<string, CodeEntry>> = {
  toothSelection: {
    "none": { code: "none", display: "No tooth status" },
    "tooth-base": { code: "tooth-base", display: "Present tooth" },
    "milktooth": { code: "milktooth", display: "Primary (deciduous) tooth" },
    "implant": { code: "implant", display: "Dental implant" },
    "tooth-under-gum": { code: "tooth-under-gum", display: "Tooth under gum" },
    "no-tooth-after-extraction": { code: "no-tooth-after-extraction", display: "Missing after extraction" },
    // Distinct from "none". A position whose tooth has not erupted is not a
    // missing tooth: nothing was lost and nothing is absent that should be
    // there. Recording it as `none` made a healthy four-year-old's chart report
    // twelve missing teeth (odontogram-8vu).
    "not-erupted": { code: "not-erupted", display: "Tooth not erupted" },
  },
  endo: {
    "none": { code: "none", display: "No endodontic treatment" },
    "endo-medical-filling": { code: "endo-medical-filling", display: "Endodontic medical filling" },
    "endo-filling": { code: "endo-filling", display: "Root canal filling" },
    "endo-filling-incomplete": { code: "endo-filling-incomplete", display: "Incomplete root canal filling" },
    "endo-glass-pin": { code: "endo-glass-pin", display: "Glass fiber post" },
    "endo-metal-pin": { code: "endo-metal-pin", display: "Metal post" },
  },
  fillingMaterial: {
    "none": { code: "none", display: "No filling" },
    "amalgam": { code: "amalgam", display: "Amalgam filling" },
    "composite": { code: "composite", display: "Composite filling" },
    "gic": { code: "gic", display: "Glass ionomer cement filling" },
    "temporary": { code: "temporary", display: "Temporary filling" },
  },
  prosthesis: {
    "none":              { code: "none",              display: "No prosthesis" },
    "healing-abutment":  { code: "healing-abutment",  display: "Healing abutment" },
    "locator":           { code: "locator",           display: "Locator attachment" },
    "locator-denture":   { code: "locator-denture",   display: "Locator overdenture" },
    "bar":               { code: "bar",               display: "Bar attachment" },
    "bar-denture":       { code: "bar-denture",       display: "Bar overdenture" },
    "removable-partial": { code: "removable-partial", display: "Partial removable denture" },
    "removable-full":    { code: "removable-full",    display: "Full removable denture" },
  },
  mobility: {
    "none": { code: "none", display: "No mobility" },
    "m1": { code: "m1", display: "Mobility grade 1" },
    "m2": { code: "m2", display: "Mobility grade 2" },
    "m3": { code: "m3", display: "Mobility grade 3" },
  },
  mods: {
    "inflammation": { code: "inflammation", display: "Inflammation" },
    "parodontal": { code: "parodontal", display: "Periodontal involvement" },
    "mobility": { code: "mobility", display: "Mobility" },
  },
  periapicalType: {
    "none": { code: "none", display: "No periapical lesion" },
    "granuloma": { code: "granuloma", display: "Periapical granuloma" },
    "cyst": { code: "cyst", display: "Radicular cyst" },
    "abscess": { code: "abscess", display: "Periapical abscess" },
  },
  caries: {
    "caries-subcrown": { code: "caries-subcrown", display: "Subcrown caries" },
    "caries-buccal": { code: "caries-buccal", display: "Buccal caries" },
    "caries-lingual": { code: "caries-lingual", display: "Lingual caries" },
    "caries-mesial": { code: "caries-mesial", display: "Mesial caries" },
    "caries-distal": { code: "caries-distal", display: "Distal caries" },
    "caries-occlusal": { code: "caries-occlusal", display: "Occlusal caries" },
  },
  fillingSurfaces: {
    "buccal": { code: "buccal", display: "Buccal surface" },
    "lingual": { code: "lingual", display: "Lingual surface" },
    "mesial": { code: "mesial", display: "Mesial surface" },
    "distal": { code: "distal", display: "Distal surface" },
    "occlusal": { code: "occlusal", display: "Occlusal surface" },
  },
  toothSubstrate: {
    "natural": { code: "natural", display: "Natural substrate" },
    "radix": { code: "radix", display: "Root remnant (radix)" },
    "broken": { code: "broken", display: "Broken tooth" },
    "crownprep": { code: "crownprep", display: "Prepared for crown" },
  },
  restorationType: {
    "none": { code: "none", display: "No restoration" },
    "crown": { code: "crown", display: "Crown" },
    "inlay": { code: "inlay", display: "Inlay" },
    "onlay": { code: "onlay", display: "Onlay" },
    "veneer": { code: "veneer", display: "Veneer" },
    "bridge": { code: "bridge", display: "Bridge unit" },
  },
  restorationMaterial: {
    "none": { code: "none", display: "No material" },
    "emax": { code: "emax", display: "Lithium disilicate (e.max)" },
    "gold": { code: "gold", display: "Gold" },
    "gradia": { code: "gradia", display: "Indirect composite (Gradia)" },
    "zircon": { code: "zircon", display: "Zirconia" },
    "metal": { code: "metal", display: "Full-cast metal" },
    "metal-ceramic": { code: "metal-ceramic", display: "Metal-ceramic (PFM)" },
    "telescope": { code: "telescope", display: "Telescopic crown" },
    "temporary": { code: "temporary", display: "Temporary" },
  },
  // SP4 Task 1: pulp/apical/resorption diagnosis axes (additive; not yet
  // rendered). See docs/superpowers/specs/2026-07-13-odontogram-sp4-endo-pulp-diagnosis-design.md.
  pulpDx: {
    "normal": { code: "normal", display: "Normal pulp" },
    "reversible-pulpitis": { code: "reversible-pulpitis", display: "Reversible pulpitis" },
    "irreversible-pulpitis": { code: "irreversible-pulpitis", display: "Irreversible pulpitis" },
    "necrosis": { code: "necrosis", display: "Pulp necrosis" },
  },
  // Practical clinical Latin pulp subtypes (spec §3.2); `display` is the Latin
  // label itself (language-neutral, identical across UI languages).
  pulpLatin: {
    "none": { code: "none", display: "No Latin pulp subtype" },
    "pulpa-sana": { code: "pulpa-sana", display: "Pulpa sana" },
    "hyperaemia-pulpae": { code: "hyperaemia-pulpae", display: "Hyperaemia pulpae" },
    "pulpitis-acuta-serosa": { code: "pulpitis-acuta-serosa", display: "Pulpitis acuta serosa" },
    "pulpitis-acuta-purulenta": { code: "pulpitis-acuta-purulenta", display: "Pulpitis acuta purulenta" },
    "pulpitis-chronica-clausa": { code: "pulpitis-chronica-clausa", display: "Pulpitis chronica clausa" },
    "pulpitis-chronica-ulcerosa": { code: "pulpitis-chronica-ulcerosa", display: "Pulpitis chronica ulcerosa (aperta)" },
    "pulpitis-chronica-hyperplastica": { code: "pulpitis-chronica-hyperplastica", display: "Pulpitis chronica hyperplastica (pulpa-polyp)" },
    "necrosis-pulpae": { code: "necrosis-pulpae", display: "Necrosis pulpae" },
    "gangraena-pulpae": { code: "gangraena-pulpae", display: "Gangraena pulpae" },
  },
  apicalDx: {
    "normal": { code: "normal", display: "No apical pathology" },
    "symptomatic-apical-periodontitis": { code: "symptomatic-apical-periodontitis", display: "Symptomatic apical periodontitis" },
    "asymptomatic-apical-periodontitis": { code: "asymptomatic-apical-periodontitis", display: "Asymptomatic apical periodontitis" },
    "acute-apical-abscess": { code: "acute-apical-abscess", display: "Acute apical abscess" },
    "chronic-apical-abscess": { code: "chronic-apical-abscess", display: "Chronic apical abscess" },
    "condensing-osteitis": { code: "condensing-osteitis", display: "Condensing osteitis" },
  },
  resorptionType: {
    "none": { code: "none", display: "No root resorption" },
    "internal": { code: "internal", display: "Internal root resorption" },
    "external-cervical": { code: "external-cervical", display: "External cervical root resorption" },
  },
  wearEdge: {
    "none": { code: "none", display: "No incisal/occlusal wear" },
    "attrition": { code: "attrition", display: "Attrition (tooth-to-tooth wear)" },
    "erosion": { code: "erosion", display: "Erosion (chemical/acid wear)" },
  },
  wearCervical: {
    "none": { code: "none", display: "No cervical wear" },
    "abrasion": { code: "abrasion", display: "Abrasion (mechanical cervical wear)" },
    "abfraction": { code: "abfraction", display: "Abfraction (cervical stress lesion)" },
    "erosion": { code: "erosion", display: "Erosion (chemical/acid wear)" },
  },
  discoloration: {
    "none": { code: "none", display: "No discoloration" },
    "tetracycline": { code: "tetracycline", display: "Tetracycline staining" },
    "fluorosis": { code: "fluorosis", display: "Dental fluorosis" },
    "nonvital": { code: "nonvital", display: "Non-vital (pulp-death) darkening" },
    "extrinsic": { code: "extrinsic", display: "Extrinsic staining" },
    "other": { code: "other", display: "Other / unknown discoloration" },
  },
  // SP14 Task 1: orthodontic axes foundation (registry/FHIR/i18n only; render
  // lands in SP14 Task 2). `orthoRotation` is a boolean axis (no value map).
  orthoAppliance: {
    "none": { code: "none", display: "No orthodontic appliance" },
    "bracket": { code: "bracket", display: "Fixed bracket" },
    "band": { code: "band", display: "Orthodontic band" },
  },
  orthoDrift: {
    "none": { code: "none", display: "No drift" },
    "mesial": { code: "mesial", display: "Mesial drift" },
    "distal": { code: "distal", display: "Distal drift" },
  },
  orthoVertical: {
    "none": { code: "none", display: "No vertical malposition" },
    "extrusion": { code: "extrusion", display: "Extrusion" },
    "intrusion": { code: "intrusion", display: "Intrusion" },
  },
  // SP5 Task 1: caries fields foundation (additive; not yet rendered). `rootCaries`
  // is a normal enum axis (registered in axes.ts/fieldMappings.ts). `secondaryCaries`
  // (CARS 0-6) and `radiographicDepth` are per-surface scalar maps handled the same
  // way `cariesDepths` is (special-cased outside AXES) — `secondaryCaries` has no
  // value-map group (a raw integer score, like ICDAS), `radiographicDepth` does.
  rootCaries: {
    "none": { code: "none", display: "No root caries" },
    "active": { code: "active", display: "Active root caries" },
    "arrested": { code: "arrested", display: "Arrested root caries" },
    "active-cavitated": { code: "active-cavitated", display: "Active cavitated root caries" },
  },
  // SP-perio PG-C Task 2: two per-tooth categorical DATA axes (registry/FHIR/
  // payload only; the Dental Chart rows/UI land in PG-C Task 3). NO svgLayer —
  // neither renders. Local codes only (no verified SNOMED/LOINC).
  // Bead odontogram-fu1: was am Zahn GEPRUEFT wurde, nicht was daraus
  // geschlossen wurde.
  //
  // `pulpDx` und `apicalDx` fuehren die Benennung nach AAE - sie sagen, was man
  // geschlossen hat. Der Test dahinter stand nirgends. Am schaerfsten sichtbar
  // an einer Stelle: `apicalDx` unterscheidet symptomatische von
  // asymptomatischer apikaler Parodontitis, und was diese beiden trennt, IST
  // die Perkussionsempfindlichkeit.
  //
  // ZWEI Achsen, nicht eine: ein vitaler Zahn kann perkussionsempfindlich sein.
  //
  // `none` heisst NICHT GEPRUEFT, nicht "unauffaellig" - dieselbe Unterscheidung,
  // auf der der ganze parodontale Teil besteht. Deshalb traegt die Perkussion
  // einen eigenen Wert `negative`: geprueft und nicht klopfempfindlich ist ein
  // Befund, kein fehlender.
  //
  // Abgelesen von charlys Befundtastenfeld (`+`, `-`, `?`, `p`), siehe
  // docs/charly/01-befund-tastenfeld.md.
  //
  // DIE PRUEFMETHODE GEHOERT NICHT DAZU - entschieden von Dirk am 20.08.2026,
  // und das ist eine Entscheidung, keine Luecke. Kaelte, elektrisch oder
  // Testkavitaet werden NICHT als eigene Angabe gefuehrt. Wer sie spaeter
  // "hilfsbereit" ergaenzt, hebt diese Entscheidung auf; wer sie braucht, holt
  // sie vorher ein.
  //
  // UND `pulpDx` WIRD AUS DIESEN ACHSEN NICHT ABGELEITET - ebenfalls entschieden
  // am 20.08.2026. Dirk: "Kaelteprobe stuetzt eine Diagnose. Auch ein
  // gangraenoeser Zahn kann dabei falsch positiv reagieren."
  //
  // Damit ist die Frage nicht eine des Geschmacks, sondern der Sache: ein Test,
  // der falsch positiv ausfallen kann, darf eine Diagnose STUETZEN und nicht
  // STELLEN. Beim Parodont leiten wir ab (`getPerioClassification`, abgeleitet
  // mit Uebersteuerung je Achse) - dort sind die Eingangsgroessen Messwerte in
  // Millimetern und keine Reizantworten. Der Unterschied liegt in der Natur der
  // Messung, nicht in der Bauweise, und deshalb ist es kein Widerspruch, dass
  // die beiden Stellen es verschieden halten.
  //
  // Die Pruefung und die Benennung stehen also nebeneinander, jede fuer sich,
  // und der Zusammenhang wird gelesen statt gerechnet.
  orthoBracketSide: {
    "buccal": { code: "buccal", display: "Bracket on the buccal/labial surface" },
    "lingual": { code: "lingual", display: "Bracket on the lingual/palatal surface" },
  },
  sensibility: {
    "none": { code: "none", display: "Sensibility not tested" },
    "vital": { code: "vital", display: "Vital response" },
    "no-response": { code: "no-response", display: "No response" },
    "questionable": { code: "questionable", display: "Questionable response" },
  },
  percussion: {
    "none": { code: "none", display: "Percussion not tested" },
    "negative": { code: "negative", display: "Percussion negative" },
    "sensitive": { code: "sensitive", display: "Percussion sensitive" },
  },
  // Bead odontogram-t6y: die WURZEL, nicht die Krone.
  //
  // `brokenMesial`, `brokenIncisal` und `brokenDistal` meinen alle drei die
  // KRONE, und `toothSubstrate: broken` die zerstoerte Krone. Eine gebrochene
  // Wurzel stand nirgends - ein anderer Befund mit anderer Folge.
  //
  // LAENGS ODER QUER ist der Unterschied, der zaehlt, und deshalb sind es zwei
  // Werte und kein Schalter: die Laengsfraktur ist der Extraktionsgrund, die
  // Querfraktur kann je nach Hoehe erhalten werden.
  // Bead odontogram-0n8: wie weit ein sichtbarer Zahn durchgebrochen ist,
  // gemessen am KRONENANTEIL, der ueber dem Zahnfleisch steht. Nicht am Bezug
  // zur Kauebene - die braeuchte den Antagonisten, und ihre dritte Stufe waere
  // der Normalzustand.
  eruptionStage: {
    "none": { code: "none", display: "Fully erupted or not assessed" },
    "emerging": { code: "emerging", display: "Emerging: cusp tip or incisal edge just visible" },
    "half-crown": { code: "half-crown", display: "About half the crown erupted" },
    "full-crown": { code: "full-crown", display: "Crown fully erupted, not yet in occlusion" },
  },
  rootFracture: {
    "none": { code: "none", display: "No root fracture" },
    "vertical": { code: "vertical", display: "Vertical root fracture" },
    "horizontal": { code: "horizontal", display: "Horizontal root fracture" },
  },
  rootPostType: {
    "none": { code: "none", display: "No root post" },
    "glass-fiber": { code: "glass-fiber", display: "Glass fiber root post" },
    "metal": { code: "metal", display: "Metal root post" },
  },
  // Bead odontogram-ca0: die drei resektiven Verfahren am mehrwurzeligen Zahn.
  //
  // NICHT dasselbe wie `endoResection` - das ist die Wurzelspitzenresektion,
  // die Spitze wird gekappt und der Zahn bleibt ganz. Hier wird er GETEILT.
  //
  // Alle drei in EINER Achse, weil sie einander ausschliessen und weil die
  // Abgrenzung sonst nirgends stuende:
  //   Hemisektion       geteilt, eine Haelfte samt Wurzel entfernt
  //   Wurzelamputation  Wurzel entfernt, die Krone bleibt ganz
  //   Praemolarisierung geteilt, BEIDE Haelften bleiben stehen
  rootResection: {
    "none": { code: "none", display: "No root resection" },
    "hemisection": { code: "hemisection", display: "Hemisection" },
    "amputation": { code: "amputation", display: "Root amputation" },
    "premolarisation": { code: "premolarisation", display: "Premolarisation" },
  },
  cejVisibility: {
    "none": { code: "none", display: "CEJ visibility not assessed" },
    "detectable": { code: "detectable", display: "CEJ detectable" },
    "not-detectable": { code: "not-detectable", display: "CEJ not detectable" },
  },
  rootConcavity: {
    "none": { code: "none", display: "No root concavity" },
    "mild": { code: "mild", display: "Mild root concavity" },
    "deep": { code: "deep", display: "Deep root concavity" },
  },
  // Bead odontogram-dma: what holds a removable denture to a natural tooth.
  // ONE value per tooth, not a set (Dirk, 2026-08-11): "a bar abutment does
  // not normally carry a clasp, a telescope abutment neither, but a single
  // tooth - crowned or not - does." Modelled as a set it would invite
  // combinations that do not occur and then need a rule to forbid them; as an
  // enum the exclusion falls out of the model itself.
  retention: {
    "none": { code: "none", display: "No retention element" },
    "clasp": { code: "clasp", display: "Clasp (Klammer)" },
    "attachment": { code: "attachment", display: "Attachment (Geschiebe)" },
    "bar-abutment": { code: "bar-abutment", display: "Bar abutment (Steg)" },
  },
  // The side the element engages. charly writes it as `<Kl` / `Kl>` and
  // `( G` / `G )`, so it is part of the finding rather than decoration.
  retentionSide: {
    "none": { code: "none", display: "Engaged side not recorded" },
    "mesial": { code: "mesial", display: "Engages mesially" },
    "distal": { code: "distal", display: "Engages distally" },
    "both": { code: "both", display: "Engages mesially and distally" },
  },
  // SP-perio PG-D Task 3: two per-tooth categorical DATA axes (registry/FHIR/
  // payload only; the Dental Chart rows/UI land in later PG-D tasks). NO
  // svgLayer — neither renders. Local codes only (no verified SNOMED/LOINC).
  gingivalThickness: {
    "unknown": { code: "unknown", display: "Gingival thickness not assessed" },
    "thin": { code: "thin", display: "Thin gingival phenotype" },
    "medium": { code: "medium", display: "Medium gingival phenotype" },
    "thick": { code: "thick", display: "Thick gingival phenotype" },
  },
  millerClass: {
    "none": { code: "none", display: "No recession class assigned" },
    "i": { code: "i", display: "Miller Class I" },
    "ii": { code: "ii", display: "Miller Class II" },
    "iii": { code: "iii", display: "Miller Class III" },
    "iv": { code: "iv", display: "Miller Class IV" },
  },
  periImplant: {
    "none": { code: "none", display: "Peri-implant health" },
    "mucositis": { code: "mucositis", display: "Peri-implant mucositis" },
    "peri-implantitis-mild": { code: "peri-implantitis-mild", display: "Peri-implantitis, mild bone loss" },
    "peri-implantitis-moderate": { code: "peri-implantitis-moderate", display: "Peri-implantitis, moderate bone loss" },
    "peri-implantitis-severe": { code: "peri-implantitis-severe", display: "Peri-implantitis, severe bone loss" },
  },
  radiographicDepth: {
    "none": { code: "none", display: "No radiographic caries depth recorded" },
    "E1": { code: "E1", display: "Enamel, outer half (E1)" },
    "E2": { code: "E2", display: "Enamel, inner half (E2)" },
    "D1": { code: "D1", display: "Dentin, outer third (D1)" },
    "D2": { code: "D2", display: "Dentin, middle third (D2)" },
    "D3": { code: "D3", display: "Dentin, inner third (D3)" },
  },
  fillingDefect: {
    "none": { code: "none", display: "No filling defect" },
    "marginal": { code: "marginal", display: "Marginal defect (overhang / deficient margin)" },
    "fracture": { code: "fracture", display: "Fractured / chipped filling" },
    "wear": { code: "wear", display: "Worn / deficient filling material" },
  },
};

/**
 * Verified SNOMED CT codes, keyed by "<group>:<value>".
 * CURRENTLY EMPTY — so no SNOMED coding is emitted by the export; the local
 * system is the only coding produced for clinical states. When entries are
 * added here (codes verified against the official SNOMED CT browser), they are
 * emitted as additional codings in the export. The mapper works with or without
 * entries — they are purely additive.
 */
export const SNOMED_CODES: Record<string, string> = {};
