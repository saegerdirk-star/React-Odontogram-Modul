# Aidbox live mode (bead odontogram-6fi)

A second app entry beside the library: given an Aidbox URL, a scoped machine
client and a PatientID, it loads that patient's odontogram from a running
Aidbox, renders it in the ordinary playground shell, and writes changes back as
Dental Core resources.

It is a **development tool served by the Vite dev server**, not a product. The
published library artifact does not contain it and does not depend on the SDK
(see "Boundary" below).

## Running it

```sh
cp .env.example .env       # fill in the scoped client's secret and a patient id
npm run dev                # then open http://localhost:5173/live.html
```

`?patient=<id>` on the URL always wins over `VITE_DEFAULT_PATIENT_ID`. A missing
or incomplete configuration renders a setup hint naming every missing key — it
never crashes and never guesses a server.

## Credentials

**Only the scoped machine client, never an admin.** `odontogram-live`
authenticates with HTTP Basic and is limited by an Aidbox AccessPolicy to
`GET/PUT/POST/PATCH` on `/fhir/Patient`, `/fhir/Observation`, `/fhir/Condition`,
`/fhir/ServiceRequest` and `/fhir/CarePlan`. That scope is the boundary of what
live mode can do, and the code below is written to it.

This app runs in a browser, so whatever stands in the `VITE_*` variables is
compiled into the served bundle and readable by anyone who can open the page.
That is acceptable for a scoped development client against a local Aidbox, and
it is exactly why it must never be more than that. `.env` is git-ignored;
`.env.example` carries no secret.

## Which SDK factory, and why not the facade

`@polaris/sdk/fhir` re-exports a `createFhirDeClient` that performs an ADR-027
de-identification IG drift check at boot, by reading `/ImplementationGuide`.
The scoped client cannot read that endpoint — measured against the local Aidbox
on 2026-08-23: `GET /fhir/Patient` answers `200`, `GET /fhir/ImplementationGuide`
answers `403` — so the facade cannot boot against it, and widening the client to
admin scope is precisely what this bead forbids. `src/live/aidbox.ts` therefore
uses the base factory from `@polaris/fhir-de`, which performs no boot call. The
transport SPI, `createFetchTransport` and `extractNextPageUrl` are the same code
either way.

## How a load works

1. `GET /fhir/Patient/{id}`. A patient that is not there is a configuration
   mistake worth naming, not an empty chart.
2. `Observation`, `Condition`, `ServiceRequest` and `CarePlan` are searched by
   `subject`, following `link[rel=next]` to the end (`searchAllPages`). A loader
   that reads only the first page shows a partial mouth and says nothing about
   it.
3. The results are **partitioned** (`partitionResources`) into what the Dental
   Core codec is offered and what it is not.
4. The admitted resources are assembled into one `collection` Bundle and read by
   `parseDentalCoreBundle`; the document is handed to the odontogram through the
   `OdontogramSession` API (bead odontogram-3l1).

The partition is not optional. `parseDentalCoreBundle` is **all-or-nothing**: it
returns `undefined` for a bundle carrying one resource it does not recognise, so
a single foreign resource would take the whole chart down with it.

Order matters twice inside the assembled bundle, because the codec reads it in
one pass: the `Patient` stands before the findings that reference it, and the
`CarePlan` before the plan-chart Observations, which are recognised as *planned*
by resolving their `basedOn` against a CarePlan the parser has already seen. A
server returns search results in whatever order it likes, so the order is
restored on assembly.

### What counts as Dental Core

* the `Patient` being charted;
* any resource carrying a profile from `DENTAL_CORE_PROFILES`;
* any resource carrying **no** profile whose id starts with this mode's
  deterministic prefix `odo-<patient>-` — the codec emits its `CarePlan` and its
  `Condition` without a `meta.profile`, and the id is what still identifies them
  as ours.

Everything else is reported, with its id, its profile and a reason.

## How a save works

`buildWritePlan` is a **pure** function: document plus patient plus examination
date in, an ordered list of single-resource `PUT`s out. `executeWritePlan` runs
them. Nothing that decides *what* is written or *under which id* touches the
network.

### The ids are derived, never minted

`buildDentalCoreBundle` already owns a resource-identity mechanism:
`payload.fhirIdentity.resources[key]`, keyed by a stable key such as
`Observation/tooth-state/16`, and `parseDentalCoreBundle` captures exactly those
keys back off a bundle. The plan therefore builds the bundle **twice**: once to
learn the codec's keys through the codec's own parser, then once more with one
deterministic id resolved per key (`odo-<patient>-<key>`, hashed where a key
would exceed the 64-character FHIR id limit). No second copy of the key scheme
lives in `src/live`.

Ids a load already brought back win over derived ones, so a chart that came from
another writer keeps its identity. This is what makes a re-save an **update**
rather than a duplicate: measured against the local Aidbox, saving the same
chart twice produces the same eight paths and the same eight resources.

### The CarePlan is written twice

Aidbox enforces referential integrity — a `PUT` naming a resource that does not
exist yet is rejected with `422 non-existent-resource`. The codec's plan
resources reference each other in a **cycle**: the `CarePlan` lists its
`ServiceRequest`s in `activity`, and each planned `ServiceRequest` is `basedOn`
that same CarePlan. No ordering resolves a cycle, and the transport SPI offers
neither a transaction bundle nor `PATCH`. So the CarePlan is written twice: once
bare (it then references only the patient), then the ServiceRequests, then the
complete CarePlan, then the Observations. The write order is
`Patient → Device → Procedure → ServiceRequest → CarePlan → Observation →
Condition → Provenance`, with the bare CarePlan ahead of all of it.

### No silent partial success

Because a save is a sequence of single-resource writes, a failure halfway
through leaves the earlier resources written. That cannot be prevented at this
layer — it can only be reported, and it is: the executor stops at the first
failure and the UI names the failed `PUT`, its HTTP status, and how many
resources were already written.

## Known limits

| Limit | Consequence |
|---|---|
| The scoped client may write only `Observation`, `Condition`, `ServiceRequest`, `CarePlan`. | A `Device` (implant or restoration product), a `Procedure` or a `Provenance` the codec emits is **not written**. It is listed under "Not written" in the UI, never dropped silently. |
| The same five types are all that is read. | Anything charted outside them does not come back. |
| A save is not atomic. | See above. |
| Foreign dental dialects are not read. | See the next section. |
| The examination date stamps the whole write. | It comes from the loaded examination where there is one, so a re-save does not re-date the chart; a fresh chart is stamped with today. |

## AC3: what the charly adapter emits, and why it is not charted

The charly PVS adapter (`~/code/pvs-adapter-charly`) writes tooth findings under
the **full dental IG**, not under Dental Core. Verified against that repository:

| | charly adapter | this odontogram (Dental Core) |
|---|---|---|
| Profile | `https://fhir.cognovis.de/dental/StructureDefinition/dental-finding` | `https://fhir.cognovis.de/dental-core/StructureDefinition/dental-tooth-state` and siblings |
| Finding code | `…/CodeSystem/ze-befund`, the **raw undecoded charly bitfield integer** as the code string, duplicated into `valueString` | `…/dental-core/CodeSystem/dental-component` plus a value from the odontogram code system |
| Tooth | extension `…/StructureDefinition/fdi-tooth-number` `valueCode` **and** a `bodySite` coding in `…/CodeSystem/tooth-identification-fdi` | `bodySite` coding in `…/dental-core/CodeSystem/tooth-position-fdi` |
| Surfaces | never emitted | per-surface caries and filling findings |
| Treatment plans | `CarePlan` (`dental-care-plan`), tooth information only as free text in activity descriptions | `CarePlan` + per-tooth `ServiceRequest` with a coded `bodySite` |

The delta is not a mapping gap that could be closed by widening a code list: the
finding itself is an **undecoded bitfield**. Decoding it is bead
`odontogram-wl8` and is deliberately out of scope here — a codec that guessed at
a bitfield would put invented findings on a patient's chart.

So live mode does what this bead's third acceptance criterion allows in that
case: it **counts and lists** these resources as not supported, with resource id
and profile, in the load report, and documents the delta here. The Dental Core
codec in `src/fhir` is not widened by one line.

Measured against the local Aidbox with one such Observation present beside a
saved chart:

```
"fetched": 9, "dentalCore": 8,
"unsupported": [ { "reference": "Observation/charly-smoke-11",
                   "profile": "https://fhir.cognovis.de/dental/StructureDefinition/dental-finding",
                   "reason": "The profile is not part of the Dental Core contract this odontogram reads" } ]
```

## Boundary (AC4)

The published artifact stays free of `@polaris/*`:

* both SDK packages are **devDependencies**; `dependencies` in `package.json` is
  unchanged;
* `@polaris` is imported by nothing outside `src/live`, and `fetch` is called by
  exactly one module, `src/live/aidbox.ts`;
* `src/live` is excluded from `tsconfig.build.json` and from the `vite-plugin-dts`
  include, so no SDK type reaches `dist`;
* `files` is still `["dist"]`, so neither `live.html` nor `src/live` is published;
* the library build's entry graph (`src/index.ts`, `src/fhir/index.ts`) cannot
  reach `src/live`.

`src/__tests__/6fi-live-boundary.test.ts` holds all of it.

The `@polaris` packages come from the Cognovis registry; the repo-local `.npmrc`
maps the scope, and authentication comes from the developer's own `~/.npmrc`.
