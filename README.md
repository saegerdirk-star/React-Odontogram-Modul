# 🦷 React Advanced Odontogram

[![npm](https://img.shields.io/npm/v/react-advanced-odontogram?style=for-the-badge&logo=npm&color=CB3837)](https://www.npmjs.com/package/react-advanced-odontogram)
[![Version](https://img.shields.io/badge/version-2.9.0-green?style=for-the-badge)](https://github.com/ZoliQua/React-Odontogram-Modul/releases)
[![License](https://img.shields.io/badge/license-MIT-orange?style=for-the-badge)](https://github.com/ZoliQua/React-Odontogram-Modul/blob/main/LICENSE)
[![DOI](https://raw.githubusercontent.com/ZoliQua/React-Odontogram-Modul/main/src/assets/zenodo.21156787.svg)](https://doi.org/10.5281/zenodo.21156787)

[![React](https://img.shields.io/badge/React-18%20%7C%2019-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

**📖 Full documentation is available per language:**

🇬🇧 [English](lang/README-en.md) · 🇩🇪 [Deutsch](lang/README-de.md) · 🇪🇸 [Español](lang/README-es.md) · 🇫🇷 [Français](lang/README-fr.md) · 🇮🇹 [Italiano](lang/README-it.md) · 🇭🇺 [Magyar](lang/README-hu.md) · 🇵🇱 [Polski](lang/README-pl.md) · 🇧🇷 [Português (BR)](lang/README-pt-br.md) · 🇸🇰 [Slovenčina](lang/README-sk.md) · 🇷🇺 [Русский](lang/README-ru.md) · 🇸🇦 [العربية](lang/README-ar.md) · 🇨🇳 [简体中文](lang/README-zh.md)

An interactive, SVG-based **dental odontogram (dental chart) editor** for **React + TypeScript** — with a full **periodontal charting module**, multi-surface caries/restorations, endodontic/prosthetic states, FDI/Universal/Palmer numbering, **HL7 FHIR R4** export/import, optional ICDAS scoring, and a 12-language UI.

🔗 **Live demo:** https://react-odontogram-modul.vercel.app/ \
📚 **API docs:** https://zoliqua.github.io/React-Odontogram-Modul/

![Odontogram editor preview](https://raw.githubusercontent.com/ZoliQua/React-Odontogram-Modul/main/lang/screenshot_en_odontogram.png)

---

## 📦 Installation

```bash
npm install react-advanced-odontogram react react-dom
```

**Requirements:** React **18 or 19** (peer dependency); a bundler that supports the `exports` field and ESM (Vite, webpack 5, Next.js, Rollup, esbuild, Parcel). The package is **ESM-only**.

## 🚀 Quick start

Render `OdontogramShell` and import the stylesheet **once**:

```tsx
import { OdontogramShell } from "react-advanced-odontogram";
import "react-advanced-odontogram/style.css";

export function Chart() {
  return <OdontogramShell language="en" numberingSystem="FDI" darkMode={false} />;
}
```

The imperative state API, the standalone `PerioChart` component, the guided tour, and all public types are named exports from the same entry point (`OdontogramShell` is also the default export):

```ts
import {
  OdontogramShell,        // also the default export
  PerioChart,             // standalone periodontal chart
  getOdontogramSummary,
  exportStatus, importStatus,   // JSON state serialization / hydration
  exportFhir, exportSvg, exportImage,
  setReadOnly, startIntroTour,
} from "react-advanced-odontogram";
```

> **SSR:** the component is client-only (reads the DOM on mount). In Next.js render it in a Client Component (`"use client"`) or via a client-only dynamic import.
> **Assets are self-contained** — tooth/icon SVGs are inlined into the bundle; there is no runtime asset fetch to configure.

## 🔌 Host integration: the UI-domain document

The component's clinical state is a **UI-domain document** — the same versioned
JSON `exportStatus()` writes and `importStatus()` reads. That document, not FHIR,
is what React state holds and what a host owns.

Bind an instance to an isolated **session** to initialize and observe it, and to
keep two mounted odontograms independent:

```tsx
import {
  OdontogramShell, createOdontogramSession,
  type OdontogramDocument, type OdontogramSession,
} from "react-advanced-odontogram";

const upper: OdontogramSession = createOdontogramSession(savedUpperDocument);
const lower: OdontogramSession = createOdontogramSession(savedLowerDocument);

<OdontogramShell session={upper} onDocumentChange={(doc) => save("upper", doc)} />
<OdontogramShell session={lower} onDocumentChange={(doc) => save("lower", doc)} />
```

`session.getDocument()` / `setDocument()` / `subscribe()` are the whole contract.
Passing a plain `document` prop instead makes the instance create and own a
private session seeded from it. Passing **neither** keeps the historical
standalone behaviour: the component runs on the process-wide default session and
every module-level entry point (`exportStatus`, `importStatus`, `getStatusChart`,
…) applies to it exactly as before — no migration is required.

> **One live editor at a time.** The interactive DOM editor is a single global
> engine bound to one tooth grid, so exactly one mounted instance drives it:
> that instance renders the chart and its session is the live one. The others
> render an inactive placeholder instead of a second copy of the engine's global
> element ids, and keep their own document — still fully readable and writable
> through their session API. Ownership passes to a waiting instance when the
> current one unmounts.

### FHIR is a pure, optional projection

FHIR conversion is a **pure adapter** over that document: no DOM, no network, no
wall clock, no randomness, and no transport or persistence concerns inside the
component. Two dialects are available:

```ts
import { buildFhirBundle, parseFhirBundle, buildDentalDeBundle } from "react-advanced-odontogram";

// Default: the engine-local representation this package has always emitted.
const legacy = buildFhirBundle(session.getDocument());

// Canonical fhir-dental-de (de.cognovis.fhir.dental) profiles and extensions.
const canonical = buildFhirBundle(session.getDocument(), {
  dialect: "dental-de",
  subject: "Patient/123",
  effectiveDateTime: "2026-08-08",
});

// Same canonical bundle, plus a report of everything the IG has no coded value for.
const { bundle, report } = buildDentalDeBundle(session.getDocument(), {
  effectiveDateTime: "2026-08-08",
});
```

The `dental-de` dialect emits `OdontogramObservationDE`, `CariesObservationDE`
and `DentalFindingDE` with the IG's `OdontogramComponentCS` slices, FDI tooth
identity and the repeatable `ToothSurfacesExt` (HL7 `FDI-surface`, tooth-aware —
the biting surface is coded `I` on an anterior tooth and `O` on a posterior one).
Where the IG defines no coded value it uses `CodeableConcept.text` under the
relevant extensible binding — never an invented code — and `report.textFallback`
/ `report.unmapped` name every such value so nothing degrades silently.

**Verified SNOMED coverage (from 2.5.0):** a clinical value is coded only when
the IG's own ValueSets admit the concept AND its meaning has been verified;
`SCT_PROVENANCE` in `dentalDeCodesystems.ts` records the admitting ValueSet and
the verification source for every emitted code. Root caries, internal and
external cervical root resorption, apical periodontitis and the
restoration-integrity findings are coded on that basis. The exact source
assessment always stays in `CodeableConcept.text`, and no `Coding.display` is
invented, because the IG omits displays.

**Canonical periodontal export (from 2.6.0):** a charted natural tooth exports a
`PeriodontalObservationDE` and an implant position a `PeriImplantObservationDE`
plus the `DentalImplantDE` device it focuses on — six-site probing depth, the
signed gingival-margin-to-CEJ level, derived attachment level, bleeding and
suppuration on probing, the Glickman furcation grade with its entrance, plaque
presence, the Silness-Loe and Loe-Silness indices, keratinized-gingiva width and
the Mombelli peri-implant indices, each qualified by the IG's
`PeriodontalMeasurementSiteExt` or `ToothSurfacesExt`. An assessed-normal finding
is an explicit `false`/`0`; a recorded gap is a standard `dataAbsentReason`. Gingival
recession (from 2.8.0) is emitted per site, but only where the signed margin
is an actual recession; the margin remains the source of truth, so an imported
recession component is never read back into it.

`parseFhirBundle` reads **both** dialects, including a bundle that mixes them, so
previously exported bundles keep importing unchanged.

Transport, authentication, audit and persistence stay outside this package: it
converts, it does not talk to a server.

## 🦷 Periodontal charting

![Full-mouth periodontal chart](https://raw.githubusercontent.com/ZoliQua/React-Odontogram-Modul/main/lang/screenshot_en_perio.png)

Per-site probing depth, gingival margin, bleeding **and suppuration** on probing at the six standard sites, with derived CAL, recession and whole-mouth %BOP; a graphical full-mouth perio chart (CEJ line, mm guide grid, pocket/margin curve, anatomical diamond index tiles), 2017 staging/grading, and per-site FHIR export (LOINC periodontal panel `74029-0`). Available as an `Odontogram | Periodontal Status` view toggle and as a separately-invocable `PerioChart` component.

An implant column supports the **peri-implant examination**: six-site probing depth, bleeding, suppuration, implant mobility and keratinized-tissue width, alongside the Mombelli mPI/mBI indices. Only the axes that need a CEJ — the gingival margin and the CAL derived from it — and the natural-tooth plaque indices stay inactive there.

### 🗓️ Dated examinations

A periodontal case is re-examined over years, so a document carries the examination's own
identity and an archive of earlier examinations:

```ts
setExaminationContext({
  id: "exam-2026-06-30", subject: "Patient/123", effectiveDateTime: "2026-06-30",
  performer: "Practitioner/dr-mueller", encounter: "Encounter/9912",
});

captureExamination({ effectiveDateTime: "2026-06-30" }); // archive today's findings
listExaminations();                                      // identities, oldest first
getExamination(id);                                      // one archived examination, detached
loadExamination(id);                                     // review it; the archive keeps it
startExamination({ effectiveDateTime: "2027-01-15" });   // links to the previous one
```

Each archived examination is an **independent snapshot** of the whole-mouth findings and case
context at capture time: later edits never reach into it, and capturing again files a follow-up
instead of overwriting the baseline a trend depends on. Status and plan keep meaning **current
versus proposed within one examination** — the plan chart is never history and is never part of
a snapshot. Every identity field is an opaque, host-owned string the component stores and
round-trips but never interprets; documents written before payload 2.21 carry none of this and
hydrate unchanged.

### 🔎 Assessed, not assessed, unmeasurable, not applicable

Periodontal charting stores findings, not the act of looking, so "probed, did not bleed" and
"nobody probed" used to look identical. Every axis in scope (PD, GM, BOP, suppuration, mobility,
furcation, plaque, PI, GI, mPI, mBI, KG) can say which it is:

```ts
setAssessmentStatus(16, "bop", "MB", "assessed");    // assessed-normal
setAssessmentStatus(16, "pd", "DB", "unmeasurable"); // the point exists, it could not be read
getAssessmentStatus(16, "mpi", "buccal");            // "not-applicable" on a natural tooth
perioAxisApplies(16, "gm");                          // true  — a natural tooth has a CEJ
perioAxisApplies(11, "gm");                          // false — once tooth 11 is an implant
```

Not-applicable is derived from what the tooth actually is, and a real measurement always wins
over a recorded gap. The same matrix, `perioAxisApplies()`, also governs the periodontal
setters, so a measurement the chart shows as inapplicable cannot be written through the API
either. On export an unavailable value becomes FHIR's own `dataAbsentReason` — never a
renderer-invented clinical code — and assessed-normal becomes an explicit `false` or grade `0`.

**Authoring (from 2.7.0):** an **Assessment status** toggle in the periodontal chart header
adds a companion row under every visible index row, with one cycle button per measurement point
— site, surface, furcation entrance, or the whole tooth. The rows are off by default. A point
that already holds a measurement is locked (the value is its own evidence of examination), and an
inapplicable position is disabled rather than silently ignored. Recorded statuses also appear in
the tooth tooltip and the whole-mouth periodontal summary.

## ✨ Highlights

- 🦷 Permanent / primary / implant / missing teeth; substrate, restorations (crown/inlay/onlay/veneer/bridge × materials), removable & implant prosthetics
- 🔍 Multi-surface caries & fillings (ICDAS / CARS severity, root & radiographic caries), endo & AAE pulp diagnosis, apical diagnosis, peri-implant status, wear, discoloration, orthodontics
- 🩺 Full periodontal module (see above) + 2017 classification
- 🔗 **HL7 FHIR R4** export/import; JSON export/import with migrations
- 🖼️ PNG / JPG / SVG chart export and a **PDF report** (jsPDF, lazy-loaded)
- 🔢 FDI / Universal / Palmer numbering · 🌐 12 UI languages (HU/EN/DE/ES/IT/SK/PL/RU/PT-BR/AR/ZH/FR, Arabic RTL) · 🎨 theming via `--odon-*` CSS variables · 🧩 plugin system · ⌨️ keyboard accessibility

## 📖 Documentation

Per-language guides are linked at the top of this file. Full API reference (TypeDoc):

📚 **https://zoliqua.github.io/React-Odontogram-Modul/**

## 📄 License & citation

MIT © Zoltán Dul. If you use this software in research, please cite it — see [`CITATION.cff`](CITATION.cff) and the [Zenodo record](https://doi.org/10.5281/zenodo.21156787).
