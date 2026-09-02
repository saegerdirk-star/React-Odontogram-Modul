# Aidbox live mode (bead odontogram-cpx)

A second app entry beside the library: given an Aidbox URL, a scoped machine
client and a PatientID, it loads that patient's odontogram from a running
Aidbox, renders it in the ordinary playground shell, and writes changes back as
Dental Core resources.

It is a **development tool served by the Vite dev server**, not a product. The
published library artifact does not contain it and does not depend on the SDK
(see "Boundary" below).

The owner-native server is an isolated **Reetfurt local-UAT** instance, not
MIRA, not PolarIS runtime services, and not the shared isynet Aidbox on
`:8081`. The PolarIS checkout that still exposes `scripts/aidbox-stack.py` is
`/Users/malte/code/polaris/platform` — `~/code/polaris` is a monorepo and
fails `uat:local`. Always export `POLARIS_DIR=/Users/malte/code/polaris/platform`.

The praxis-store image identity for this workflow is recorded in
`mvz-reetfurt/config/praxis-store-image.json` (tag `state-3cc52d646206`, digest
`sha256:1062bb7528e071cb87b58e13da40a6a9c0469dd8ba9b2a4a190d46d8f5c04f1b`).
That file is not copied into this repository.

## Running it

```sh
cd /Users/malte/code/mvz-reetfurt
POLARIS_DIR=/Users/malte/code/polaris/platform bun run uat:local up --instance odontogram-cpx
POLARIS_DIR=/Users/malte/code/polaris/platform bun run uat:local status --instance odontogram-cpx

cd /path/to/React-Odontogram-Modul
npm run live:provision -- --instance odontogram-cpx
npm run dev                # then open http://localhost:5173/live.html
```

`live:provision` reads the persisted Reetfurt binding, uses operator
credentials from `AIDBOX_ADMIN_ID` / `AIDBOX_ADMIN_PASSWORD` or the PolarIS
isynet env file (never `VITE_*`), creates or reconciles `Client/odontogram-live`
and `AccessPolicy/odontogram-live-dental`, discovers a Patient that already has
dental Observations or Conditions, and writes only the scoped browser keys into
the ignored `.env`. A second run leaves the effective Client and AccessPolicy
unchanged.

`?patient=<id>` on the URL always wins over `VITE_DEFAULT_PATIENT_ID`. A missing
or incomplete configuration renders a setup hint naming every missing key — it
never crashes and never guesses a server.

## Credentials

**Only the scoped machine client, never an admin.** `odontogram-live`
authenticates with HTTP Basic and is limited by the Aidbox AccessPolicy
`odontogram-live-dental` to exactly:

| Resource type | Verbs |
|---|---|
| `Patient` | `GET` only |
| `Observation`, `Condition`, `ServiceRequest`, `CarePlan` | `GET`, `PUT`, `POST`, `DELETE` |

Nothing else, and nothing outside `/fhir`. The patient record is **read-only**
on purpose — the odontogram charts teeth, it does not own the patient — and a
`PUT /fhir/Patient/...` answers `403`, verified. `DELETE` is there because
clearing a finding has to remove its resource; without it a cleared finding
would reappear on the next load.

That scope is the boundary of what live mode can do, and the code below is
written to it.

This app runs in a browser, so whatever stands in the `VITE_*` variables is
compiled into the served bundle and readable by anyone who can open the page.
That is acceptable for a scoped development client against a local Aidbox, and
it is exactly why it must never be more than that. `.env` is git-ignored;
`.env.example` carries no secret.

## Which SDK factory, and why not the PolarIS facade

`@polaris/sdk/fhir` re-exports a `createFhirClient` that performs an ADR-027
de-identification IG drift check at boot, by reading `/ImplementationGuide`.
The scoped client cannot read that endpoint — measured against a local Aidbox:
`GET /fhir/Patient` answers `200`, `GET /fhir/ImplementationGuide` answers
`403` — so that PolarIS facade cannot boot against it, and widening the client
to admin scope is precisely what this mode forbids. `src/live/aidbox.ts`
therefore uses `createFhirClient` from `@cognovis/fhir-sdk/client`, which
performs no boot call. The deprecated `createFhirDeClient` alias is the same
factory. `createAidboxFhirClient` is a client-credentials factory and is not
used. The transport SPI, `createFetchTransport` and `extractNextPageUrl` are
used unchanged.

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

### A partial read is a FAILED read

Following `link[rel=next]` is not proof of completeness. A dropped connection, a
lost page, a link the server stops offering — each ends the loop quietly, and a
short read of a Dental Core chart **parses perfectly well**. It simply comes
back missing findings, renders as a chart, and the next save writes that gap
over the real one.

This is not hypothetical. Measured on the live fixture: the app's own
whole-mouth save is **128 Observations** against Aidbox's default page size of
**100**, and `Observation/…tooth-state-16` was entry number **100** — the first
entry of page two. A load that lost that page reported "Loaded" and showed tooth
16 with no filling. Session-scale testing could never see it: four findings are
eight resources and fit in one page.

So the assembly is COUNTED. `searchAllPages` reads `Bundle.total` and compares
it with what actually arrived; a short read sets `incomplete`, and
`loadPatientChart` then **withholds the document entirely** — the report says
the read was partial, nothing is charted, and the save gate stays shut. A page
that fails still throws, and must: the caller turns that into a failed load, not
into fewer teeth.

A server that reports no `total` cannot be checked this way, and live mode does
not pretend otherwise: `expected` stays undefined and `incomplete` stays false.

### The search asks for a stable order

**A paged search without a total order is not a search, it is a lottery.** The
server picks page one; if two rows rank equally it may order them differently
when it picks page two, so one resource arrives twice and another never arrives
at all. The FHIR spec does not require search results to be ordered, so this is
the server keeping its promise, not breaking it.

Measured against Aidbox on 2026-08-23 — six consecutive two-page fetches of the
same unchanged 128-resource chart:

| fetch | resources returned | DISTINCT | duplicates |
|---|---|---|---|
| 1 | 128 | 101 | 27 |
| 2 | 128 | 100 | 28 |
| 3 | 128 | 118 | 10 |
| 4 | 128 | 116 | 12 |
| 5 | 128 | 118 | 10 |
| 6 | 128 | 110 | 18 |

The codec refuses a collection carrying a duplicate id, so the load failed — and
because a different resource duplicated each time, the reported `rejectedAt`
moved between attempts, which reads exactly like an order-sensitive parser. It
is not one: `parseDentalCoreBundle` accepts all 24 seeded permutations of that
very fixture and all 30 of a synthetic whole mouth, and a test records that.

Two changes, either of which alone would have been half a fix:

* every paged search asks for `_sort=_id`, which made the same six fetches
  return 128 distinct resources every time (`_id` and not `_lastUpdated`: both
  measured stable, but two resources written in one save can share a timestamp
  and ids cannot collide);
* the assembly is kept DISTINCT by identity and completeness is counted in
  DISTINCT resources against the server's total — so a server that ignores the
  sort still cannot pass a holed read off as a whole one.

Before and after on the standing fixture: without the sort, 0 of 6 loads
parsed (each honestly reported as an incomplete read of 101–128 distinct against
128); with it, 10 of 10 loads parsed with all 32 teeth and the save gate open.

### Why a rejected load now says which resource

`parseDentalCoreBundle` answers `undefined` and carries no reason, which was the
single hardest thing about diagnosing a rejected load — the acceptance run had
"nothing was charted" and no way to ask why. On the failure path only, the load
now **measures** the reason: it grows the collection one resource at a time and
reports the first one that flips the parse, as `report.rejectedAt`. That is "the
first resource that cannot stand with the ones before it", which is not always
the guilty party — two resources can contradict each other — so the message says
*refuses*, not *is wrong*.

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

### The patient's share of an id is injective

A patient id becomes part of every resource id this mode writes, so two patients
must never produce the same token — otherwise their write paths coincide and one
chart silently overwrites the other. Sanitising alone does not give that:
`p.1` and `p-1` sanitise to the same thing, and so do `ABC` and `abc`, while all
four are valid FHIR ids, so no charset check catches it.

There are therefore exactly two forms, kept disjoint by the DOT, which the
pass-through charset excludes and the hashed form always contains:

* an id that is already a short slug (`^[a-z0-9-]{1,24}$`) passes through
  unchanged — every id in use stays stable and every path stays readable;
* anything else becomes `<sanitised head>.<hash of the raw id>`.

The residue is bounded and deliberate: two ids in the hashed form are separated
by a 32-bit hash, which is collision-resistant rather than strictly injective. A
FHIR id has 64 characters, and the identity key has to fit beside the patient.

The patient id is also validated against the FHIR id grammar
`[A-Za-z0-9-.]{1,64}` in `resolveLiveConfig`, **before any request is made** — it
goes straight into a request path, where `../../admin/console` would escape
`/fhir` altogether and carry the Basic credential with it.

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

### Clearing a finding deletes its resource

A chart is edited subtractively too, and a plan that only ever `PUT`s would make
a finding un-deletable: its resource would stay on the server and the next load
would read it straight back in.

The comparison is the codec's own identity KEY SET. A key the last load brought
back (`document.fhirIdentity.resources`) that this document no longer produces
belongs to a finding that was cleared, and its id is deleted. The patient is
never deleted, and neither is anything outside the write policy.

Deletes run **after** every write, so the resources that survive have already
been rewritten without their references to what is about to go. Their order is a
resource before the one it references — deliberately NOT the reverse of the
write order, which would put the CarePlan ahead of its ServiceRequests, and the
CarePlan is what two of the three plan relationships point at. Measured against
Aidbox on 2026-08-23, that server does not check incoming references on delete
(deleting a ServiceRequest still named by a CarePlan's `activity` answered
`200`), but an order that only works because a server is lenient is one server
away from being wrong.

### Saving is offered only after one clean load

`isSaveAllowed` is a pure rule with one job: a save may be offered only when
what is on screen actually came from the server, for THIS patient, whole. A
`403`, a `500`, a codec rejection or a truncated read each leave a blank or
stale session behind — and saving from one of those writes that blankness over
the authoritative chart. It is the one failure mode in this whole mode that
destroys data rather than failing to record it, so the button is disabled until
a load has completed cleanly.

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
| **A peri-implant finding is not saved either.** | `toFhirDentalCore` gives the peri-implant Observation an unconditional `focus` on the tooth's implant `Device`, and a `Device` is outside the write policy — so on a server that enforces referential integrity the finding could only fail. It follows its Device into "Not written" instead. In practice: `periImplant`, `mPI` and `mBI` **do not round-trip through live mode**. Everything else on that implant tooth (presence, restoration, caries, periodontal findings) does. |
| Any write naming a resource that is not itself written is dropped the same way. | The rule is general, not a special case for the implant Device: `buildWritePlan` runs to a fixpoint, so a finding stranded by a dropped finding is dropped too — with its unresolved reference named in the reason. |
| A search that hits the page budget (50 pages) yields a **partial** read. | The load report names the resource type, the UI shows a "Partial read" warning, and **Save is disabled** — writing back from a chart that was only partly read would silently omit the findings that were never loaded. |
| The same five types are all that is read. | Anything charted outside them does not come back. |
| A save is not atomic. | See above. |
| **The periodontal-diagnosis `Condition` is not written.** | The codec pairs a `case.diagnosisOverride` Condition with a clinical `Provenance` and requires BOTH when reading back; a `Provenance` is outside the write policy. Writing the Condition alone would not lose one finding — it would make the next load reject the WHOLE chart. So it follows its Provenance into "Not written", and `diagnosisOverride` does not round-trip through live mode. |
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

The published artifact stays free of the FHIR client SDK:

* `@cognovis/fhir-sdk` is a **devDependency**; `dependencies` in `package.json`
  is unchanged;
* that package is imported by nothing outside `src/live`, and the transport
  lives in exactly one module, `src/live/aidbox.ts`;
* `src/live` is excluded from `tsconfig.build.json` and from the `vite-plugin-dts`
  include, so no SDK type reaches `dist`;
* `files` is still `["dist"]`, so neither `live.html` nor `src/live` is published;
* the library build's entry graph (`src/index.ts`, `src/fhir/index.ts`) cannot
  reach `src/live`.

`src/__tests__/6fi-live-boundary.test.ts` holds all of it.

### The install-time cost of that boundary

`@cognovis/fhir-sdk` comes from the Cognovis registry; the repo-local `.npmrc`
maps the scope, and authentication comes from the developer's own `~/.npmrc`.

**This is not free for anyone who only wants the library.** Because the packages
are in `devDependencies` and in `package-lock.json`, a plain `npm ci` or
`npm install` in this repository now needs a credential for
`npm.cognovis.de` — every contributor and every CI job, whether or not they
ever open live mode. `npm ci --omit=dev` does not, and neither does consuming
the published package, whose `dependencies` are unchanged. If that cost stops
being worth it, the honest fix is to move `src/live` into its own workspace, not
to loosen the boundary.

## One round trip normalises the resource set

Observed, and benign as far as could be measured. The first save of a normalised
whole mouth writes 128 Observations; a load-then-save cycle then settles at 96
and stays there. Exactly 32 keys drop — one per tooth, the chart-state
Observation carrying `toothSelection`. The reason is an asymmetry in the codec,
not in this mode: a normalised document states `toothSelection: "tooth-base"`
explicitly, the parse does not restore that default, and the second save
therefore no longer emits it. A document without `toothSelection` is a present
tooth, so nothing clinical is lost — verified live across four cycles: 32 teeth
every time, values unchanged, and the shape stable from the second save onward.

It is recorded here rather than fixed, because fixing it means changing the
codec's emit/parse symmetry and this mode does not widen the codec.

## Two charts on one patient reject each other

Observed on the demo patient on 2026-08-23. It had been charted full-mouth by
one run and then partly overwritten by another that had NOT loaded first, so the
server held 262 resources: a `CarePlan` listing one activity beside 33 plan
`ServiceRequest`s from the earlier chart. `parseDentalCoreBundle` compares those
two counts and rejects the whole collection, so the load reports

```
"fetched": 262, "dentalCore": 262, "parsed": false,
"error": "The Dental Core codec rejected the assembled collection, so nothing was charted"
```

and Save stays disabled — which is exactly what the save gate is for, and the
reason it exists: the second run produced this state precisely BECAUSE it saved
without loading first, which the UI no longer allows. In normal use the removal
pass keeps the two in step, since a load-then-save cycle deletes what the
previous chart left behind.

Recovering such a patient means deleting the stale resources. Live mode does not
offer a "clear this patient" button and deliberately will not: it is a
destructive operation on a record it does not own.

## Observed while verifying against the local Aidbox

Under a real browser the first `GET /fhir/Patient/{id}` intermittently answers
`500` with "Active Storage for 'null' not found" — a keep-alive framing quirk of
this Aidbox build with browser connections, not a fault in the request. **Live
mode does not retry**: the load reports the failure and the Load button repeats
it. If that turns out to be routine rather than occasional, a bounded retry on
the patient read is the place to add one; until then, no code here claims a
resilience it does not have.
