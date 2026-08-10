# Orthodontics findings view — design research for `odontogram-c51`

**Status:** design research, not a clinical decision-support specification.  
**Research date:** 2026-08-10  
**Scope:** clinical workflow and information architecture for the module's third internal
view; canonical Dental-DE authorability; an evidence-limited international product scan.

## Executive finding

**Prototype assumption requested by the product owner:** the accompanying HTML/React
concepts treat all planned `fhir-dental-de` KFO carrier beads as delivered within the next
three hours.  Their controls are therefore active and labelled **FHIR target contract**.
This forward-looking design assumption does not change the dated repository audit below;
the audit continues to distinguish what was published from what was only planned on
2026-08-10.

An Orthodontics workspace should be a **separate case-finding view with a small,
tooth-aligned finding area**, not an overlay on the Odontogram.  The primary clinical
sources distinguish (a) a bilateral molar/canine jaw-relation assessment in
Prämolarenbreiten (PB), (b) millimetre-based KIG measurements and classifications, and
(c) individual-tooth observations.  In particular, KIG must not be inferred from Angle
class or PB relation: the G-BA rule grades the greatest single-tooth deviation in mm and
states that the jaw relation is not system-relevant for that classification.[^gba-anl2]

The existing module supports this presentation boundary: it already has a segmented
Odontogram/Dental Chart switch with one isolated session document, and it has dormant,
present-natural-tooth-gated orthodontic artwork and controls.  It does **not** yet have a
third workspace or canonical serialization for its tooth-position/appliance axes.

The gating conclusion for implementation is important: the current published
Dental-DE carriers author only a small subset of the bead's desired surface.  No
published profile carries bilateral Angle + PB magnitude, raw overjet/overbite/open-bite,
midline, crossbite/scissors-bite, KIG group/method, model analysis, general tooth position,
or an individual appliance.  Terminology alone is not an authoring contract.  Until the
relevant profiles are published, those inputs must be disabled/non-authorable rather than
saved as local or `unmapped` persistence.

## Evidence and scope notes

Clinical and regulatory claims below are grounded in primary issuer/faculty sources.  The
market section uses only first-party vendor material and labels a statement as *observable*
only where the accessed page explicitly says it.  It does not infer clinical-chart fields
from a product image, a vendor comparison, or a secondary review.

The local FHIR assessment is read-only against
`/Users/malte/code/fhir/fhir-dental-de` at `e03b4454d7b27c73c8466ee0accc3d1ab7eda4c9`
(current local `main`).  The inspected attached worktree
`feat/fdde-k131/complete-carriers` was clean at `7380c2c`; it contains no unmerged KFO
finding-carrier implementation beyond `main`.

## Clinical shape and workflow

### 1. The clinical record is a repeated, layered assessment

The current DGKFO/DGZMK S2k guideline describes orthodontic diagnosis as repeated
assessment before and during treatment.  Its diagnostic structure includes history and
general findings, extraoral examination/photo analysis, intraoral examination and oral
hygiene evaluation, functional/habit assessment, model analysis, and radiologic base or
special diagnostics.[^awmf]  The KZBV patient workflow likewise puts clinical examination,
radiographs, photos, models, and functional findings before the individual treatment plan.[^kzbv]

For this bead, that supports the following information architecture:

1. A persistent host-provided patient/context header, examination date, author, and
   read-only state.
2. A **case findings** area for the current examination, ordered as occlusion, vertical/
   transverse findings, space/model analysis, and KIG.  It must never imply a derived
   diagnosis or treatment approval.
3. A **tooth findings** area that retains FDI and dentition, for eruption/presence and
   separately-gated appliance/position findings.
4. A concise, dated summary/history entry rather than a duplicate chart.  Images, models,
   and cephalometry are links/evidence for a case, not part of an Odontogram overlay.

This is a clinical workspace, not a billing workflow.  KIG-related GKV eligibility must be
shown as source-recorded classification only; the UI must not automatically derive or
promise coverage.

### 2. Case-level occlusion is bilateral and unit-sensitive

University teaching sources specify documenting occlusion for the canines and first molars
on the right and left sides.  The Leipzig course specifies both sites and sides; the Charité
form explains that a left and right jaw-half entry normally suffices and gives the molar and
canine reference relationships.[^leipzig][^charite]

Therefore, a future carrier-gated control should visually form a four-cell relation matrix:

| Relation site | Right | Left |
|---|---|---|
| First molar (16:46 / 26:36) | class, direction, magnitude, unit | class, direction, magnitude, unit |
| Canine (13:43 / 23:33) | class, direction, magnitude, unit | class, direction, magnitude, unit |

Keep a *neutral* state distinct from “not assessed”, and do not substitute a one-sided
value for the other side.  PB is a charting unit for the jaw relation; it has no exact UCUM
equivalent and must never be silently converted to mm.  The published teaching sources use
different PB step families (thirds versus quarters), so a capture surface needs an explicit
practice-configured set rather than inventing precision.[^leipzig][^charite]

### 3. KIG is a separate mm-based assessment

The G-BA KFO guideline's KIG framework uses the groups A, U, S, D, M, O, T, B, P, E, and K.
Its rules are measurement-specific: e.g., distal and mesial sagittal steps use incisor-based
millimetre measurements, and all tooth measurements are in mm.[^gba-kig][^gba-anl2]

Design consequences:

- Keep the recorded raw measurement, its unit, its method/site, and any assessed KIG
  group/grade visibly distinct.  A classification never replaces the measured finding.
- Do not co-locate a KIG badge in a tooth SVG.  A case-level KIG row belongs in the case
  findings area with its source/method and assessment status.
- Capture Angle/PB and KIG/mm independently.  The G-BA guidance explicitly says to measure
  the greatest clinical single-tooth deviation and that the jaw relation is not system-
  relevant for KIG; they must not derive one another.[^gba-anl2]
- Use no colour-only severity or eligibility signal.  A text label, code, value, unit, and
  explicit assessment status are required together.

### 4. Tooth-level findings remain tooth-aligned, with clinical gates

The guideline's intraoral/model/radiologic work supports retaining tooth-specific findings,
but the UI must make their status unambiguous:

- Present/erupted, delayed/unerupted, retained/impacted, absent, and implant are different
  states; “not assessed” is different again.
- Aplasia is an aetiological diagnosis, not another visual absence value.  It must be
  distinguishable from extracted/lost in both the tooth list and the case summary.
- Appliance, mesial/distal displacement, extrusion/intrusion, and rotation should appear
  only for a present natural tooth.  The current module already applies this exact gate to
  its existing orthodontic controls and artwork.
- A per-tooth glyph can confirm an explicitly charted tooth finding, but it must not stand
  in for a case-level measurement or a clinical interpretation.

## Recommended view composition

The proposal deliberately follows the module's existing compact card/select language instead
of importing a vendor-dashboard design.

1. **Header and view navigation.** Add Orthodontics as a third peer in the existing
   segmented control, alongside Odontogram and Dental Chart.  Preserve the shared session;
   the periodontal popup mode remains host configuration, not a reason to hide KFO.
2. **Case findings card.** A compact examination summary (date, author/context, status) and
   a left/right occlusion matrix.  Display each quantity with unit and source status; use
   chips only as redundant text labels, never as colour-only data.
3. **Bite and transverse/vertical card.** Separate raw overjet, overbite/open bite,
   midline direction/deviation, crossbite, and scissors bite.  These controls are display-
   only/blocked until their canonical FHIR carrier exists.
4. **Space, model analysis, and KIG card.** Separate arch crowding/TSALD and Bolton from the
   KIG assessment.  KIG is entered as clinician-assessed (group, grade, method), never
   calculated from other fields.  All currently lack a published carrier.
5. **Tooth findings card.** A selector/list retaining FDI plus dentition, with the existing
   dormant bracket/band, drift, vertical, and rotation affordances.  Absence/eruption and
   aetiology should precede appliance/position.  Only show valid controls under the shared
   present-tooth gate.
6. **Summary and history.** State “no finding charted” explicitly; do not hide an empty
   section.  Provide a read-only summary of only asserted values and a dated history hook.
   Audit evidence needs who/when/what and before/after values at the host persistence layer.

### Safety and accessibility constraints

- Retain patient identity in the host's persistent header; this standalone module should
  receive, not invent, patient identifiers.
- Use native labelled controls, immediate validation, keyboard navigation, visible focus,
  and text-plus-icon/pattern severity signals.  Numeric values always retain their unit and
  use German locale formatting when rendered.
- Offer `null`/clear and an explicit “not assessed” state where the FHIR contract permits;
  never turn blank input into normality.
- Make a carrier gate visible: “FHIR carrier not published — not authorable” is safer than
  accepting a value that cannot round-trip.

## Current module evidence

| Existing element | Evidence | Design implication |
|---|---|---|
| Peer clinical views | `src/App.tsx` renders the existing `#appViewToggle` segmented Odontogram/Dental Chart control and conditionally mounts `PerioChart` (`~771–893`). | Orthodontics should extend this peer navigation, not be another tooth-detail card or a periodontal popup. |
| Shared isolated document/session | `App` supports an `OdontogramSession` / versioned `OdontogramDocument` and mirrors state changes into the mounted peer view. | View changes must retain one KFO state in the same document. |
| Existing tooth controls | `src/App.tsx` `#orthoCard` has appliance, drift, vertical, and rotation controls; `src/odontogram.ts` `orthoAllowed()` permits only base or milk teeth. | Reuse the gating and form language in the tooth findings card; do not present controls for an absent/implant tooth. |
| Dormant artwork | `src/registry/svgLayers.ts` and `src/odontogram.ts` support bracket/band and mesial/distal/up/down/rotation layers. | Activate only for an asserted tooth finding in the KFO view; retain the bead's prohibition on case markers in the Odontogram SVG. |
| Current Dental-DE exporter | `src/fhir/toFhirDentalDe.ts` reports the current `orthoAppliance`, `orthoDrift`, and `orthoVertical` axes as unprojected.  Its presence adapter uses text fallbacks for `tooth-under-gum` and `not-erupted`. | The current UI shape is not permission to persist these values canonically.  Preserve no local fallback as a final export. |

## Dental-DE FHIR authorability

The following table distinguishes a terminology asset from an actual profile/extension carrier.
“Authorable” means that the field has a published, governed attachment point, not merely that a
CodeSystem exists in the repository.

| Finding family | Published canonical carrier now | Authorable now? | Present local/pending work | Missing or blocked condition |
|---|---|---:|---|---|
| KFO plan phase and coarse apparatus class | `DentalCarePlanDE.extension[kfoBehandlungsphase]` (`aktiv`, `retention`, `abschluss`) and `[kfoApparatusType]` (`festsitzend`, `herausnehmbar`) | Yes, **plan-level only** | Current `main` profile and example | Not an individual appliance or tooth attachment; no Device/profile link exists. |
| Angle class | `KfoAngleKlasseExt` on `Condition`, required values `I`, `II-1`, `II-2`, `III` | Yes, **one class only** | `ExampleKfoDiagnose` shows one value | No right/left, site, PB magnitude/unit, or separate canine/molar relation.  Do not use terminology-only `angle-klassifikation` to bypass this carrier. |
| KIG grade | `KfoKigPunkteExt` on `Condition` or `Claim`, integer `1..5` | Yes, **grade only** | `ExampleKfoDiagnose` demonstrates grade 4 | No group, combined finding, method, raw measurement, or evidence link at a governed KIG profile slice. |
| Tooth presence / eruption observation | `OdontogramObservationDE.component[toothPresence]`, FDI `bodySite`, extensible `ToothPresenceStateVS` | Partly | Current profile | Current module adapter lacks governed coded mappings for under-gum/not-erupted and uses text.  Aplasia is not a presence value. |
| Aplasia / hypodontia diagnosis | `DentalConditionDE.code` plus FDI `bodySite`; supporting observation can be linked through `evidence.detail` | Potentially, when a confirmed diagnosis and governed code are supplied | Current generic diagnosis carrier | No dedicated aplasia UI/projection fixture; do not equate a UI absence option with a confirmed diagnosis. |
| Raw overjet, overbite/open bite, midline, crossbite/scissors bite | None | **No** | KIG, sagittal-site/unit/grade terminology is present in the local IG, but no `KfoOcclusionObservationDE` profile is published | Needs a governed Observation profile/components, bindings, examples, import/export tests; no text/local-code workaround. |
| Bilateral Angle/PB relation | None | **No** | Terminology defines site (`molar/canine` × `left/right`), PB/mm units, and published magnitude codes | Needs a profile that binds class, site, magnitude, unit, and laterality together.  PB is not UCUM mm. |
| KIG group, combined KIG finding, and method | None | **No** | KIG `kig-indikationsgruppe`, `kig-befund`, `kig-schweregrad`, and `kig-messmethode` terminology exists | Needs a `KfoKigObservationDE`; the current integer extension is insufficient. |
| TSALD/crowding and Bolton | None | **No** | `crowding-severity` and `bolton-discrepancy-type` terminology exists | Needs a model-analysis Observation with raw quantities, arch/context, and coded interpretation. |
| Per-tooth drift, vertical movement, rotation | None | **No** | Module axes/artwork exist | Needs a FDI-qualified tooth-position Observation and governed terminology; `ImpactedToothObservationDE` Winter angulation is not a substitute. |
| Individual appliance / bracket/band identity | None | **No** | Coarse CarePlan apparatus type only | Needs a `KfoApplianceDeviceDE` and CarePlan linkage; do not synthesize a Device. |

### Local canonical evidence

- [KfoAngleKlasseExt.fsh](/Users/malte/code/fhir/fhir-dental-de/input/fsh/extensions/KfoAngleKlasseExt.fsh)
- [KfoKigPunkteExt.fsh](/Users/malte/code/fhir/fhir-dental-de/input/fsh/extensions/KfoKigPunkteExt.fsh)
- [DentalCarePlanDE.fsh](/Users/malte/code/fhir/fhir-dental-de/input/fsh/profiles/DentalCarePlanDE.fsh)
- [OdontogramObservationDE.fsh](/Users/malte/code/fhir/fhir-dental-de/input/fsh/profiles/OdontogramObservationDE.fsh)
- [DentalConditionDE.fsh](/Users/malte/code/fhir/fhir-dental-de/input/fsh/profiles/DentalConditionDE.fsh)
- [KFO carrier-gap analysis](/Users/malte/code/fhir/fhir-dental-de/plans/kfo-befund-gap-analysis.md)

The gap analysis proposes `KfoOcclusionObservationDE`, `KfoModelAnalysisObservationDE`,
`KfoKigObservationDE`, `KfoToothPositionObservationDE`, and `KfoApplianceDeviceDE`.  These are
design names in a planning document, **not** published profiles or current authoring authority.
No additional KFO carrier was found in the inspected local pending branch/worktree.

## International product scan — first-party evidence only

This is deliberately a pattern scan, not a procurement comparison.  Public pages rarely expose
the field-level clinical chart, and unavailable pages are not treated as negative evidence.

| Product / source | Observable workflow or IA pattern | Explicitly not established by the accessed source |
|---|---|---|
| [Ortho2 Edge Cloud](https://www.ortho2.com/our-solutions/edge-cloud/) | A central **Treatment Hub** combines patient information, rich text, treatment sequencing, pending appointments, treatment plans, and *historical tooth chart data*.  Its imaging product supports cephalometric tracing and multiple timepoints. | No public confirmation of Angle/PB, KIG, eruption aetiology, individual appliance charting, or FHIR/export semantics. |
| [Tops](https://www.topsortho.com/) | A single practice-management surface claims real-time treatment planning plus scheduling, insurance, payments, patient flow, and integrations. | No observable tooth-chart model, occlusion/Angle input, KIG-equivalent index, history structure, or interoperability format. |
| [OrthoRecords](https://www.orthorecords.com/compare) | A separate clinical-record layer combines photo comparison, doctor-verified AI cephalometric analysis, treatment proposals, and tracking from records to retention; it claims automatic Open Dental patient/appointment sync. | No claim that it has a tooth-level KFO findings chart, Angle/PB or KIG input, tooth-position data, or a standards-based clinical export.  Its competitor rows are not used as evidence about competitors. |
| [Dolphin Imaging](https://www.dolphinimaging.com/Product/Overview) | The accessible first-party page exposed navigation for an imaging viewer, German custom template, and orthodontic/pediatric dental FMX template. | The JavaScript-rendered product content did not disclose field-level chart behavior in this research pass; no inference is made. |
| Cloud 9 Ortho / Carestream OrthoTrac | Neither first-party product route was accessible in the research environment. | No capability conclusion.  A future review needs a vendor-provided manual, logged-in demo, or public first-party video/screenshot. |

### Market-scan implications

1. The most concrete comparable pattern is a **central treatment/finding hub with historical
   tooth-chart data**, not a case finding painted directly over the tooth chart.  This agrees
   with the clinical and bead boundary.
2. Timepoint-aware images and treatment sequencing belong beside the case finding/history,
   while the current bead keeps cephalometric tracing, 3-D models, and treatment simulation
   out of scope.
3. A module can serve as the clinical layer beside a host PMS, so it should expose a clean
   session document and canonical FHIR projection rather than absorb scheduling or billing.
4. No accessed vendor material is reliable evidence for a field-level KFO data model.
   Clinical primary sources and Dental-DE carrier contracts must decide the values and their
   persistence, not marketing screenshots or generic “treatment chart” claims.

## Implementation-ready implications for `odontogram-c51`

### Prototype variants

The prototype now exposes seven directly selectable layouts at the same `?prototype=kfo&variant=`
route. A–D cover a conventional findings form, an arch-first workbench, a guided examination,
and a dense expert matrix. A comparison with the additional Opus concepts found its proposed
findings form to be materially equivalent to A, so it was not duplicated. Three distinct
interaction structures were retained:

- **E — KIG matrix:** the 11 groups and valid grades are the primary workspace. Selection is
  explicitly clinician-confirmed; the view does not derive a KIG value from measurements.
- **F — Occlusion schema:** a standalone orthodontic arch diagram places bilateral relation
  flags, midlines, crossbite regions, and tooth-aligned cycle rows in anatomical context.
- **G — KFO cockpit:** summary metrics, domain tabs, and a finding feed provide a shell that can
  later accommodate longitudinal or aligner progress without changing the core findings forms.

All seven variants edit the same in-memory demo state. The A–G controls are always visible in the
floating switcher, including at mobile width.

- Preserve the bead's hard separation: case-level KFO data is rendered only in Orthodontics,
  never inside `#toothGrid` or a tooth SVG.
- Treat “complete KFO charting” as carrier-gated.  With the repository state inspected on this
  date, the feature cannot truthfully meet its canonical-round-trip criterion for most
  case-level and tooth-position fields.  The cross-repo FHIR carrier work is a release
  precondition, not an adapter task.
- When the carriers exist, use four distinct data presentations: bilateral relation matrix;
  raw dimensional measurement + explicit unit; clinician-assessed classification; and
  per-FDI tooth finding.  Never collapse them into one selector.
- Reuse existing present-tooth gating for the dormant tooth controls, retain FDI and dentition
  in every tooth-row label, and make “not assessed”, clear, and absent/etiology states
  explicit.
- Put clinician-entered values in the summary only when asserted; avoid automatic KIG,
  treatment, or coverage conclusions.

## Primary and first-party sources

[^awmf]: DGKFO/DGZMK, *S2k-Leitlinie: Ideale Zeitpunkte und Maßnahmen der kieferorthopädischen Diagnostik*, version 1.1 (2025), AWMF register 083-050. <https://register.awmf.org/assets/guidelines/083-050l_S2k_KFO_Diagnostik_2026-05.pdf>
[^kzbv]: KZBV, *Ablauf der kieferorthopädischen Behandlung*. <https://www.kzbv.de/patienten/medizinische-infos/zahnfehlstellungen/ablauf-der-kieferorthopaedischen-behandlung/>
[^gba-kig]: G-BA Kieferorthopädie-Richtlinie, Anlage 1 (KIG), official guideline attachment page. <https://www.g-ba.de/richtlinien/anlage/54/>
[^gba-anl2]: G-BA Kieferorthopädie-Richtlinie, Anlage 2. <https://www.g-ba.de/downloads/83-691-42/RL-Kieferorthop%C3%A4die-Anl2.pdf>
[^charite]: Charité — Universitätsmedizin Berlin, Abteilung für Kieferorthopädie, *Skript Befundbogen (Studenten)*. <https://kieferorthopaedie.charite.de/fileadmin/user_upload/microsites/m_cc03/kieferorthopaedie/Skript_Befundbogen_Studenten.pdf>
[^leipzig]: Universitätsklinikum Leipzig, *Kurs KFO I Teil I: Modellvermessung*. <https://www.uniklinikum-leipzig.de/einrichtungen/kieferorthopaedie/Freigegebene%20Dokumente/8.%20Semester%20Kurs%20KFO%20I%20Teil%201.pdf>

## Local sources consulted

- Bead `odontogram-c51` via `bd show odontogram-c51 --json` on 2026-08-10.
- Module sources at current worktree `feat/odontogram-c51/kfo-ansicht-mockups`, especially
  `src/App.tsx`, `src/odontogram.ts`, `src/registry/axes.ts`, and
  `src/fhir/toFhirDentalDe.ts`.
- `fhir-dental-de` local `main` commit `e03b4454d7b27c73c8466ee0accc3d1ab7eda4c9`, plus
  read-only inspection of `feat/fdde-k131/complete-carriers` at `7380c2c`.
