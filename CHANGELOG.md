# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **A filling that reaches the neck can say so — without becoming a second
  surface.** (odontogram-wxt) The surface vocabulary has five entries, and
  nothing distinguished a vestibular filling from a vestibular filling that
  extends into the cervical region.

  The modelling question is the whole feature, and BEMA settles it: the cervical
  region is **not** a surface for fee purposes. The four or five regular
  surfaces determine the surface count and therefore the position tier
  (13a–d / 13e–h); the cervix is recorded as a **suffix on an existing
  surface** — "vz"/"47" vestibular including the cervix, "lz"/"57" lingual.
  A sixth surface would report "multi-surface" where the truth is
  "single-surface with a cervical marker". So `cervicalSurfaces` is a
  membership set over the vestibular and oral surfaces, never a surface value,
  and the new `getFillingSurfaceCount()` — the number a fee mapping would
  consume — reads `fillingSurfaceMaterials` and nothing else. A vestibular
  filling marked as reaching the neck counts **one**.

  There is no fee effect, and that is the point: the marker is documentation
  and justification. On a repeat filling it is what shows that no treatment
  error is implied, and it carries weight for more-than-three-surface fillings,
  incisal corner build-ups, and circumstances such as bruxism or pre-existing
  disease.

  It qualifies whichever finding the surface carries — a filling, a caries
  lesion, or both — so it is authored in the one popup both the caries cross
  and the filling cross open, offered only once the surface actually carries
  something. The cell then shows the BEMA suffix letter in its corner. It is
  read back in the tooth tooltip and, in the whole-mouth summary, on the line
  of the finding it qualifies (never on both at once).

  **Nothing is drawn on the chart, and that is a decision rather than an
  omission.** The side view has no lingual layer at all — the oral surface
  exists only in the occlusal view — so a marker drawn for a vestibular
  cervical filling and structurally impossible for an oral one would read as
  "no oral cervical involvement". A marker that is present for one surface and
  unavailable for the other is worse than none, and the finding's home is the
  written record anyway. SVG-fingerprint parity is therefore byte-identical.

  It travels the legacy FHIR dialect as one Observation with a per-surface
  boolean component — the surface is the component code and the marker its
  value, which is exactly the "suffix on a surface" relationship — and round
  trips. The canonical `dental-de` dialect gets no code for it: the IG's
  surface value set defines none, and its cervical concepts sit on
  `GingivaRecessionDE`, which describes the gingiva rather than a restoration
  reaching the neck. The marker is reported at the boundary instead, because
  the sourcing rule forbids minting one. Payload **2.23 → 2.24**, additive and
  omit-when-empty.

  Deliberately out of scope: a BEMA position mapping or any fee calculation
  (this delivers the charting attribute such a mapping would need; the mapping
  itself lives outside this engine), GOZ, whose cervical problem runs through a
  different mechanism entirely, and root caries — `rootCaries` describes caries
  **on** the root, not a filling involving the neck, and the two must not be
  conflated.

- **Which implant is in the tooth.** (odontogram-im1) `toothSelection: implant`
  says an implant is there; it does not say which one, and the two are different
  assertions. A tooth may now carry an `implantProduct` — manufacturer, system,
  diameter, length, and the UDI from the packaging, which is read for its device
  identifier, lot and expiry so nobody types those off a foil pouch.

  **Nothing is required, and an empty record is complete.** Record it when the
  practice places an implant; leave it open when the implant arrived with the
  patient, because not every patient carries an implant passport. The engine
  therefore never warns about an empty product: it cannot yet tell "we placed it
  and did not record it" from "it was already there and is unknown", and telling
  those apart is provenance — odontogram-ap7's axis, not a second flag grown
  here.

  It is authored in its own block under the peri-implant status, shown only
  when the tooth is an implant. Manufacturer and system are free text with a
  suggestion list gathered from what the practice has already placed — there
  are hundreds of implant systems and nobody would maintain a catalogue, so
  none is kept. Typing or scanning a UDI shows the lot and expiry it yielded,
  so a scan visibly does something.

  **It reaches FHIR**, and needed nothing invented to get there: `DentalImplantDE`
  already defines `manufacturer`, `lotNumber`, `expirationDate`, `serialNumber`,
  `modelNumber`, `deviceName` and `udiCarrier`, and slices `Device.property`
  into `diameter` and `length` as millimetre Quantities — both mustSupport,
  with their own published `DentalImplantPropertyCS`. The engine had been
  sending a Device with nothing in it but a placeholder identifier.

  The Device is now emitted for **every** charted implant. It used to be minted
  inside the peri-implant builder, so an implant with no peri-implant
  measurement produced no Device at all — and in an initial examination that is
  the commonest implant there is. The Device asserts *that* an implant is
  present, which is true whether or not the practice knows which one; the
  identity fields are then simply absent, and an omitted `lotNumber` says
  nothing false. The canonical reader takes it back, so a round trip keeps it.

  API: `getImplantProduct` / `setImplantProduct` (silent no-op on a natural
  tooth, guard before the DS-1 gate, mirroring the Mombelli indices) and
  `getChartedImplantProducts`. The systems list writes itself from the charts —
  there are hundreds of implant systems and nobody would maintain a catalogue,
  so a system typed once is offered from then on and the list stays the
  practice's own. Payload **2.22 → 2.23**, additive and omit-when-empty: a chart
  that names no implant is byte-identical apart from the version. No render
  change — which implant it is does not draw.

### Fixed

- **A milk dentition no longer reports twelve missing teeth.** The primary
  preset recorded the positions behind the deciduous dentition — 16–18, 26–28,
  36–38, 46–48 — as `none`, and `none` means *missing*. A healthy four-year-old's
  chart therefore read "teeth marked missing (12): 18, 17, 16, …": a finding no
  clinician made, produced by a preset, and carried into an export.

  Those teeth are not missing, they have not erupted, and the model had no way
  to say so — an unset position defaults to a permanent tooth, and the only way
  to show nothing was `none`. `toothSelection` gains **`not-erupted`**: it draws
  exactly what an empty position draws (verified — the SVG fingerprint of the
  new state is byte-identical to `none` on all eleven templates, and no existing
  fingerprint changed), it is counted and named separately from missing teeth in
  the whole-mouth summary, and both dentition presets use it.

  It survives both FHIR round trips. In the canonical dialect the IG publishes
  no eruption concept, so the state travels as text with the gap reported —
  emitting nothing would be worse, since an absent record hydrates back to a
  permanent tooth. Payload **2.21 → 2.22**, additive: nothing wrote the value
  before, so an older document needs no migration.

### Changed

- **Restoration colours name the material.** (odontogram-58n) A direct composite
  filling and a zirconia inlay were **exactly the same colour**, `#feffbf` — one
  is a filling and the other is lab work, and the chart could not tell them
  apart. Gold sat in the same yellow family, so yellow meant composite, zirconia
  *and* gold. Two further exact collisions were found while measuring: a GIC
  filling shared salmon with the denture saddle, and a metal crown shares blue
  with a telescopic one.

  The palette follows the material now, on the scheme Dirk gave: **gold reads
  gold**, and the **plastics are one green family separated by lightness** —
  direct composite dark, laboratory composite mid, the acrylic tooth of a
  removable denture light. Zirconia moves to a cool ceramic white.

  That last one also settles the bead's open question. "Replaced teeth in
  acrylic" needed no new material value after all: a removable denture's
  replacement tooth is its own layer (`prosthesis-crown`), so it takes the light
  green directly, and `restorationMaterial` is untouched. The saddle stays
  gum-coloured, which is what a denture base is.

  A colour change is parity-safe and digest-neutral by construction — the SVG
  fingerprint records id, opacity and class, and the frozen geometry digests
  hash geometry plus only geometry-bearing style properties. `fill` is in
  neither, and the full suite confirms it.

- **The ceramic and composite materials are named by their material class.**
  Two of the eight restoration materials were brand names and nothing else —
  `emax` and `gradia` — so a dentist looking for a ceramic inlay or a composite
  inlay found neither word anywhere in the picker and reported both as missing.
  They read *Lithium disilicate* and *Laboratory composite* now, in all twelve
  languages — the same class names the canonical `dental-de` `DentalMaterialCS`
  carries (`lithiumdisilikat`, `komposit`), so the label names what the export
  names. The product name is deliberately **not** in the label: which
  product was used is a separate assertion from what class of material it is,
  and a finding that travels to a colleague, an insurer or a FHIR consumer
  carries the class.

  This also closes the "composite inlay cannot be recorded" half of
  odontogram-00a. It could: `gradia` **is** an indirect laboratory composite,
  and the engine already knew it — `codesystems.ts` exports it as *Indirect
  composite (Gradia)* and the canonical `dental-de` dialect maps it to
  `komposit`. The material was recordable, exportable and correctly typed; only
  its label kept that secret. No new material value, no payload change, no
  migration.

- **The restoration dropdown is grouped by type.** It is 32 entries deep on a
  molar and was flat, so it hid what it contained: a dentist looking for a gold
  inlay met eight crowns and eight bridge units and gave up before reaching entry
  nineteen. The entries are now wrapped in `<optgroup>`s — *Fixed: Crown*,
  *Fixed: Bridge unit*, *Fixed: Inlay*, *Fixed: Onlay*, *Fixed: Veneer*,
  *Removable* — and each option carries only its material, since the group
  heading already names the type. Presentation only: every option `value` is
  unchanged, so the change handler, the state model and the payload know nothing
  about it.

- **An MO, OD or MOD filling is drawn as one restoration.** (odontogram-9cl)
  Each surface is its own layer and its own authored shape, and the shapes had
  been drawn independently: charting MOD lit three of them and the chart showed
  three separate blobs with tooth between them. Measured, every adjacent pair on
  every template and every material was **two** connected regions — not a seam
  that overlapped too little, but shapes that missed each other entirely, while
  their bounding boxes overlapped and made it look fine to any box-based check.

  The mesial and distal shapes are now stretched toward the occlusal one until
  they meet it, anchored at the far end — which on a side view is the floor of
  the box and must not move. That is what the cavity itself does: a proximal box
  on a posterior tooth is cut *through* the occlusal surface, and a mesial plus
  incisal restoration on an anterior tooth is a class IV, which is also one
  restoration. On the side view the stretch follows the crown as it narrows
  toward the cusp tips, so the overhang past the contour is what it always was,
  to within a tenth of a unit on every template.

  Both views and all four direct materials, permanent and primary. The state
  model is untouched — `fillingSurfaceMaterials` stays a per-surface map,
  because the surfaces are what a clinician charts and what FHIR carries; only
  the drawing changed. Parity byte-identical.

  `verify.py` gains a guard that fails when an MO or OD pair stops being one
  connected shape. It tests whether the two outlines actually share a point,
  not whether their areas or boxes overlap — the defect it was written for
  survived years of box-shaped agreement.

- **The apex line reads even, with the canine still the longest tooth.**
  `LENGTH_SPREAD` 0.45 → 0.30. Every crown tip already sat on one line; the
  APICAL ends did not, and the 15.1 px of raggedness was essentially one tooth —
  the canine standing proud of the second molars. It is 9.6 px now, and the
  canine is still visibly longest, which is what "almost equal" asked for.

  The constant is a display decision and is documented as one: it pulls every
  tooth's length toward the mean without touching `length_rel`, which stays the
  measured proportion. `CEJ_Y` and `IMPLANT_CEJ_Y` in `src/perioGraphic.ts` move
  with it, and the periodontal chart is unaffected in what it measures — its mm
  grid is its own scale and the restored roots still run well past 15 mm, so a
  deep pocket lands on drawn root. Parity byte-identical.

- **Crown widths follow the mesiodistal diameters they are meant to, and the
  generator can now measure a width.** Two defects, one behind the other.

  `width_frac` — the tooth's crown width as a fraction of its own length — was
  the one anatomical value in the generator that carried no source. It is now
  set from the standard mean mesiodistal crown diameters (Wheeler / Ash &
  Nelson), averaged over the positions each template serves and recorded in full
  in `tools/toothgen/spec.py`. Unlike `root_frac` and `length_rel` these are
  **not** read off the Odontographie plates: measuring a width automatically off
  those pages was attempted and abandoned, because it returned a fragment for
  one template and a clipped specimen for another.

  Fitting those targets then exposed the second defect. The generator measured a
  width by flattening the outline through the **Bézier anchors** rather than the
  curve, so a molar read 24.6 units wide where it is 40.0 — and every template
  had been scaled up to make that undersized number match. The error was largest
  exactly where the outline curves most between anchors, which is why the
  premolars and molars had come out about a third too wide while the incisors
  were close to right, and why it looked from the bounding boxes as though the
  posterior roots were splayed. `_crossings` now flattens through the same
  adaptive subdivision the rest of the generator uses, and `crown_width` (full
  extent, for a crown) is separated from `silhouette_width` (tooth material, for
  asking how wide the root holding a canal is).

  With both fixed, **every contact in the mouth is 9 to 11 px** — anterior and
  posterior, upper and lower — because each column is now simply its own tooth
  plus 6 px, one rule for all thirty-two positions. Rendering only; parity
  byte-identical.

- **The lower canine stands where the mouth puts it.** The two arches shared one
  column list, so every tooth sat directly above its antagonist — and a lower
  incisor is drawn 22.5 px wide against the upper central's 36.6. In a 44 px
  column that left the lower front standing 25 px apart while the upper front
  stood 11 px apart, and it put 43 and 13 on the same vertical, which the mouth
  never does.

  Each arch is its own grid now. The only difference between the two column
  lists is the four incisor columns, 44 px above and 31 px below, which closes
  the lower front to the same ~11 px the rest of that arch has. The rest follows
  on its own: four columns narrower by 13 px make the lower arch 52 px narrower,
  so centred it sits 26 px in on each side, and the tip of 43/33 comes to rest in
  the embrasure between the upper lateral incisor and the upper canine — the
  Class I canine relationship, arrived at by closing contacts rather than by
  being drawn in. Measured on the running chart: 43's centre at 565 px, the
  13/12 embrasure spanning 561 to 575.

  The 44 px touch-target floor is deliberately broken for those four columns. At
  31 px wide and a full row tall the tile is still well over the 24 × 24 px
  WCAG 2.5.8 asks for, and a lower incisor that is not 31 px wide is not a lower
  incisor. The tiles keep their ARIA option roles: each arch wrapper is
  `role="presentation"`, so the listbox still owns them directly.

- **The gingiva is one line across the arch.** Once the row closed up at the
  contact points the gum stopped being hidden by the gaps between the teeth and
  read as a row of separate red flames. The cause was not that the shapes failed
  to reach each other — measured, neighbouring gum outlines overlap by 2 to 21 px.
  The break was vertical: every template carried its own hand-drawn gum, each one
  correct on its own, and a papilla is *shared* between two teeth. Two halves
  coming from two different drawings have no way to agree on its height.

  Warping the drawn outlines into agreement was tried twice and does not work; a
  hand-drawn gum is almost entirely long cubics, and the ones carrying the
  papilla are exactly the ones a shift by x deforms. So `gum-base` and
  `bone-base` are now **drawn** by the generator (`tools/toothgen/gum.py`) in
  each template's final coordinates instead of warped out of the sources. The
  crest is one level line, the free gingival margin still dips to each tooth's
  own cervix, and the papillae land at one height because each template puts its
  peak half a column plus half a grid gap from its own centre — two neighbours
  therefore agree on the joint without either knowing which tooth it stands next
  to. `ToothSpec.col_px` records that column width, and `verify.py` now checks it
  against `grid-template-columns` in `src/index.css`, because nothing else ties
  the two together.

  Three alignment defects surfaced with it and are fixed: the tile SVG clipped at
  its viewBox (`overflow: visible`, so the drawing can bridge the 7 px the molar
  tiles stand apart), the viewBox height was rounded to one decimal *after* the
  occlusal plane was positioned from the bottom, and the CSS width and height per
  template were rounded to whole pixels independently, which gave each template a
  slightly different scale. Every shared line across the arch was stepping on all
  three.

  Rendering only — SVG-fingerprint parity is byte-identical, since the
  fingerprint reads id, opacity and class and never geometry. No payload, state
  or API change.

- **Tooth 14 is drawn from buccal like every other tooth.** The source template
  draws the two roots of the upper first premolar side by side, which can only
  be the *proximal* aspect: those roots separate bucco-palatally, along the line
  of sight. Teeth 14 and 24 were therefore the one pair in the chart shown from
  a different side of the mouth.

  Seen from buccal the palatal root stands behind the buccal one. Two transforms
  produce that, both applied to the tooth and canal layers only: the roots are
  pulled towards each other, and the palatal tip is dropped by a third of the
  root's apical length — a structure further from the viewer ends higher up the
  picture, which is what turns two prongs into depth. Restricting them to the
  tooth matters: applied template-wide, the convergence pinched the gum band and
  narrowed the whole tile.

  No new layer and nothing appended, so the SVG-fingerprint parity is untouched.
  An appended shape was tried first and cannot work — `tooth-base` is filled
  *and* stroked, so a closed subpath always strokes its base line somewhere
  across the tooth. The two roots are a notch in one contour rather than two
  shapes, so moving that notch leaves nothing to hide.

- **The arch closes up: teeth nearly meet at their contact points.** The grid
  gave all sixteen columns the same width (`repeat(16, 1fr)`) around drawings
  that are not the same width — a lower molar is drawn 65.5 px across, a lateral
  incisor 31.6 px — so the leftover space piled up toward the midline. Adjacent
  teeth stood 21 to 45 px apart, loosest exactly where contacts matter: the
  lateral incisor had gaps on either side worth about 1.4× its own width.

  Each column is now the widest tooth it has to hold plus 6 px, floored at 44 px
  so the narrowest tile stays a usable touch target. Measured on the chart, the
  gaps fell to **9–20 px** and the anterior segment from 43–45 px to 13–14 px.
  Both arches still share the columns, so a tooth and its antagonist stay
  aligned; that is why a column is sized by the wider of the two.

  Two things had to follow. The SVG canvas is wider than the tooth it holds —
  gum and bone are drawn wider than the crown, and on an incisor the tooth is
  only about 59 % of its own canvas — so the canvas is now wider than its
  column and must not shrink as a flex item, or the drawing scales down and the
  teeth get *smaller* instead of closer. It overflows instead, and neighbouring
  gum overlaps, which is what gum does. And the drawings now paint as one layer
  above all tile chrome, because a tile's translucent background would otherwise
  paint over its neighbour's overflow and punch white notches through the gum
  band. Tile borders, hover and selection are unchanged.

- **The teeth are drawn longer, and the row of apices is no longer ragged.**
  Two changes that look like one, kept apart on purpose because only the first
  is a matter of fact.

  The **root fractions are now measured**. Dirk read all nine permanent
  templates off the Odontographie plates — view a, mid-facial, counted in cells
  of the plate's own Linienraster — and the readings corrected two inversions
  the table had carried: the canine held a *lower* root fraction than the
  central incisor (0.60 against 0.62) where the plates give 0.642 against
  0.593, and the lower molar a lower one than the lower incisor (0.62 against
  0.68) where the plates give 0.680 against 0.640. The same counts independently
  confirm `length_rel`, agreeing to within 0.02 on six of nine templates, which
  is what established the Linienraster as one scale across an archive of
  photographs taken at different distances.

  The **apex line is a decision, not a correction**. Modelling the measured
  values showed the ragged apex line is not a defect: it *is* the anatomy — the
  canine really is about 14 % longer than the central incisor and 37 % longer
  than the second molar, and correcting the anatomy moved the spread by 3 px out
  of 33. An even apex line can therefore only be chosen, so it is chosen in the
  open: a new `LENGTH_SPREAD` (0.45) compresses the length *differences* between
  tooth classes toward their mean, per dentition, instead of anyone quietly
  editing `length_rel`.

  With `ROOT_DISPLAY_SCALE` raised 0.60 → 0.75, the measured result on the chart
  is teeth 9–20 % taller (the second molar gains the most, 84.8 → 101.7 px), the
  apex spread halved from 32.7 px to 15.4 px, the occlusal plane still on one
  line, and the canine still visibly the longest tooth. **Tooth widths are
  unchanged** — the length decision divides itself back out of `width_frac`, so
  a vertical choice cannot silently make the canine narrow and the molars wide.

  `src/perioGraphic.ts` follows in the same change, as it must:
  `ROOT_RESTORE_SCALE` stays the reciprocal (1/0.75), and `CANINE_ROOT_SCALE`
  is retired to 1.0 — it existed only to compensate for the canine root the
  templates used to under-state, and keeping it would re-impose that error in
  the one view where root length is actually read.

  SVG-fingerprint parity is unaffected (no layer added, removed or re-keyed);
  the frozen generator digests are re-taken, which is what they are for.

- **A telescope crown now reads as a double crown.** Primary and secondary crown
  were drawn as two filled shapes sharing an edge, so at chart size the pair
  merged into one blue cap with a grey centre — the very thing that distinguishes
  a telescope from a single crown was the one thing not visible. The inner crown
  carries a fine white outline under a `paint-order: stroke`, which puts the
  separating line *inside* the outer crown's blue band instead of widening the
  tooth. Style only: no geometry moved, so the frozen generator digests and the
  SVG fingerprints are unchanged (neither records `stroke` or `paint-order`).

### Added

- **The primary dentition has anatomy of its own.** A tooth charted as a milk
  tooth used to be its successor's permanent template with the embedded
  `milktooth-*` layers switched on — so the deciduous dentition was, literally,
  the permanent one with a smaller shape turned on inside it. Eight generated
  templates now cover all twenty primary teeth (51, 52, 53, 54, 55, 71, 74, 75;
  the arches mirror and the lower canine reuses the upper), and charting a tooth
  as a milk tooth mounts the deciduous drawing in its place. Switching back is
  the same operation, because the wanted template is derived from the state each
  time rather than remembered.

  The proportions are measured, not scaled down: each template carries its own
  root fraction, relative length and width, from the Odontographie plates where
  a plate exists. Two shape changes separate the dentitions and cannot be
  expressed as a number, so the generator applies them — the pulp is enlarged
  anchored on the horn tips, which stay where they are because they decide
  whether a preparation reads as an exposure, and the roots are splayed around
  the developing permanent germ and hooked back in at the tips, which is what
  makes them read as bulbous rather than merely wider.

  Where a dedicated primary drawing is mounted, it is drawn as an ordinary
  present tooth rather than through the `milktooth-*` layers. Those layers hold
  the legacy small tooth, and source 16 — which templates 55, 74 and 75 are
  built from — carries none at all. The substitution happens at the render call
  site only: the tooth is still charted as a milk tooth in the tooltip, the
  summary and the payload.

  The lower first primary molar was re-derived from Bild 93 after the plate
  arrived: it had been built from the permanent lower molar, which put its
  cervix at 38 % of tooth height where the photograph already shows the
  furcation. The page states outright that the SECOND primary molar is the
  scaled-down permanent molar, which is why 75 keeps that parent and 74 must not
  have had it.

### Fixed

- **Template 15 no longer reads as a converted tooth.** The single-rooted
  premolar was produced by redrawing source 14's two roots as one, and it still
  showed what it was made from: a step in the outer contour exactly on the join,
  and the walls of the old twin canals surviving through the first four units
  below the cervical line. Source 13 already contains what the conversion was
  trying to synthesise — a genuinely single root, drawn, with one canal and its
  own lumen layers — so it is grafted onto the premolar's two-cusped crown
  instead (new `tools/toothgen/graft.py`, requested per spec via
  `ToothSpec.graft_root_from`). Both defects go by construction rather than by
  correction, and the graft also supplies a drawn cervical transition, which is
  where the perceived kink actually lived.

  59 layers are regrafted. Where a layer crosses the cervical line exactly twice
  it is spliced smoothly into the host contour; where it crosses more often —
  which is precisely what a pair of canals does — the host is clipped above the
  cervical line and the donor taken below it. The premolar keeps BOTH pulp
  horns, because it has two cusps, and only the deeper chamber receives the
  canal, so no layer is emptied and no id disappears. The single root keeps both
  resorption markers, mesial and distal, since one root still has both surfaces.
  Implant layers are deliberately not grafted: an implant is a fixture, not a
  root, and the bone around it follows the fixture.

  `verify.py` measures both invariants now and names both defects on the
  previous asset: the contour on a quarter-unit grid through the cervical region,
  where the existing check started below the step and walked over it, and the
  lumen span count as a run over consecutive depths, so a post with a shoulder is
  not mistaken for a second canal. The apex clamp also learned to handle a lumen
  lying wholly beyond the apex, which cannot arise while a root is only
  transformed but does once one is grafted from a donor whose own lumen
  overhangs.

  Template 15's tile is 118 px instead of 128: the converted root left lumen
  standing above the apex and the viewBox had to reach up to it. Its geometry
  digest is re-taken; the other eight are untouched, which is itself the evidence
  that the graft is confined to this template. SVG parity fingerprints unchanged.

- **The pulp no longer stands outside the root, and a canal is no longer drawn
  as wide as the root that contains it.** Two separate mechanisms, both visible
  on the chart. The apical one was worst on the canine, where the pulp tip stood
  2.46 units clear of the root outline — it is already present in the source
  drawing and the generator amplified it, because it stretches the root to its
  measured proportion. `clamp_lumen_apex()` runs after the warp, since before it
  the amplification has not happened yet, and pulls each lumen back to one unit
  inside the apex anchored at its coronal end, so the chamber and the pulp horns
  do not move. All nine templates now end inside the root.

  The width one appears wherever the generator DRAWS root geometry instead of
  transforming it. `single_root_contour` took the new root's half-width from the
  silhouette at the cut, and for a pulp layer that cut necessarily lies where the
  two canals still meet — in the chamber, not in a canal — so template 15 came
  out with a lumen at 128 % of its own root width. Contours and lumen are now
  separated (`LUMEN_LAYERS`/`is_lumen()`), the conversion runs in two passes so
  the canal can be sized against the root that has to contain it, and the
  drawn palatal root of templates 16/17 gets a canal at `LUMEN_HALF_FRAC` of its
  own width rather than the contour's. Template 15 drops to 71 %, 16 and 17 from
  62 % to 42 %.

  Two `endo-` layers are deliberately NOT lumen: an apicoectomy is drawn across
  the apex and a resorption defect on the root surface, so both legitimately
  reach past the outline that contains a canal. Sweeping them in with the prefix
  would clamp a resection line into the root it is meant to cut off. This also
  corrects the numbers first reported for this defect, which were measured with
  those two layers included and were inflated by them.

  `verify.py` measures lumen now — apical overhang and width against the root at
  the same height. It did not before, which is how nine assets carrying the
  defect passed it. The frozen geometry digests are re-taken, since the repair
  changes coordinates on all nine templates; the SVG parity fingerprints are
  untouched, because no element, id, opacity or class changes.

- **The periodontal chart no longer draws one row of every jaw upside down.**
  Each arch is shown twice, once from the facial and once from the palatal or
  lingual side, and the two rows were oriented by ASPECT: the buccal row flipped,
  the palatal row left as drawn. That made them mirror images of one another, so
  in each jaw exactly one of the two contradicted the anatomy — an upper palatal
  row with its roots hanging downward, a lower buccal row with its roots rising
  upward. Orientation follows the JAW now: maxillary roots point cranially and
  mandibular roots caudally in both aspects alike, which is also how a paper
  periodontal chart is laid out. Both builders share one `buildArchAspectSvg`,
  so the two aspects cannot drift apart again, and the mm grid's label
  counter-flip follows the same condition.

  Two consequences worth knowing. The two rows of a jaw are no longer mirror
  images, so they are drawn alike and told apart by their labels and number rows
  rather than by orientation — the central index band no longer sits between two
  rows of crowns. And this deliberately reverses the arch-independent
  orientation introduced with the central-index-band redesign; the assertions
  that pinned it are rewritten to the jaw rule rather than deleted, so the
  reversal is visible in the test suite instead of silent.

  Found by measuring the running chart rather than by reading the code: for each
  band, the order of the mm-grid labels tells which way the root points, and
  that was checked against the band's jaw.

## [2.9.0] - 2026-08-09

### Fixed

- **Posterior teeth are drawn with the root anatomy of their own tooth class.**
  The permanent chart reused four stylized templates, so every premolar and
  every molar borrowed a contour from another tooth class and rendered the wrong
  number of roots. A chart that shows a three-rooted upper molar as a
  single-rooted shape is not a cosmetic issue: root count and root separation
  are what a clinician reads a furcation, an apical finding, or a planned
  extraction against. Nine templates now cover the classes the four could not
  express — the upper central incisor (11), the upper lateral incisor (12), the
  lower incisors (31), the canines (13), the two-rooted upper first premolar
  (14), the single-rooted premolars (15, covering 15/25 and every lower
  premolar), the three-rooted upper first molar (16), the more convergent upper
  second and third molars (17), and the two-rooted lower molars (46).
- **Occlusal artwork keeps mesial toward the arch midline in every quadrant.**
  The occlusal view had been deriving its rotation and mirroring from the
  side-view mapping, which only held while both views happened to share one
  template set. Occlusal placement is now its own mapping (`OCCLUSAL_TEMPLATE`),
  so contralateral teeth stay correctly mirrored independently of which
  side-view template a tooth uses.
- **Tooth artwork no longer bleeds between teeth in one rendered chart.** SVG
  resolves `url(#...)` document-wide, so 32 tooth instances cloned from the same
  template all pointed their gradients and clip paths at whichever definition
  the document happened to hold last. Every rendered instance now gets its own
  paint-server namespace. Clinical layer ids are deliberately left untouched,
  because state activation addresses them by name.
- **The periodontal chart measures against a full-length root again.** The
  odontogram deliberately draws roots shortened, since there the tooth is an
  icon. On the periodontal chart the tooth is the scale a probing depth is read
  against, and a shortened molar root ended at roughly 8 mm — putting exactly
  the pockets that matter into blank space above the drawn apex. The perio chart
  now restores the measured root length, and the canine's old elongation factor
  was removed because the canine is drawn from its own measured contour and no
  longer needs stretching to read as a canine.

### Added

- **`tools/toothgen` generates the tooth templates and verifies them.** The
  checked-in SVG assets are reproducible: `build.py` derives all nine templates
  from four canonical source drawings, `verify.py` re-measures root counts,
  root fractions, clinical id/tag parity and the shared occlusal plane against
  the recorded specification, and `check_roundtrip.py` independently confirms
  that parsing and serialization preserve every path. Frozen SHA-256 digests of
  every geometry-bearing attribute guard the authored anatomy, so technical
  maintenance cannot silently change a contour or a proportion. Available as
  `npm run toothgen:build` and `npm run toothgen:verify`.

### Notes

- The SVG rendering fingerprints were regenerated deliberately: new anatomy is
  the point of this release. The FHIR export golden and the JSON round-trip
  golden are byte-identical, because this release changes what a tooth looks
  like and nothing about what it means. The serialized payload version is
  unchanged, and no state field, enum value, or public prop changed.

## [2.8.0] - 2026-08-09

### Changed

- **The canonical `dental-de` FHIR export follows the implementation guide's
  SNOMED CT cleanup.** The guide corrected two of the concepts it fixes on its
  periodontal component slices, and the export now writes both of them. Bleeding
  on probing moved from `86276007` ("Bleeding gums", a generalization) to
  `249420004` ("Bleeding on probing of gingivae"), which is exact for the
  per-site bleeding this editor records, on the periodontal and the peri-implant
  observation alike. Import stayed deliberately tolerant: a bundle written by
  versions 2.6.0 to 2.7.1 carries the retired code and still reads back with
  every bleeding site intact — only emission changed. Both meanings were
  re-verified against a public terminology server before use, and no display
  string is ever put on the wire, because the guide publishes these concepts
  without one.

### Added

- **Gingival recession is exported again.** Version 2.4.0 had to refuse the
  concept the guide fixed on its recession component, because that code
  published as "Accretion on teeth" — a dental deposit, not a recession — so
  emitting a measurement under it would have asserted a finding no clinician
  made. The defect was reported and has been fixed in the guide, so the export
  now carries one recession component per probed site whose gingival margin is
  an actual recession, in millimetres, qualified by the measurement site. A
  margin at or below the gum-line reference, and a site with no recorded margin,
  produce no component: "no recession" and "not recorded" stay distinguishable.
  The peri-implant observation is unaffected — an implant has no
  cement-enamel junction to reference.
- Recession stays a DERIVED value, and the direction is one-way. The signed
  gingival margin remains the sole source of truth on import: a recession
  component is recognized and deliberately discarded, exactly like the derived
  attachment-loss component, so a round-trip can never chart a margin the source
  never recorded or let two components write one field.

### Fixed

- **A probing depth outside the clinical range no longer charts a site in the
  canonical export.** The editor treats a depth below 1 mm as "not probed" and
  un-charts the site, but the canonical exporter accepted any finite number, so
  a malformed imported document could put a probing depth, gingival margin,
  attachment level, bleeding point — and now a recession — on a site nobody ever
  probed. Such a site is now skipped entirely. Charts written by this editor are
  unaffected, because it never stores such a value.

Stored data, the export payload version (`2.21`), the legacy FHIR dialect and
every rendered chart are unchanged.

## [2.7.1] - 2026-08-09

### Fixed

- **Switching a mounted periodontal chart to read-only now really locks it.**
  Turning read-only mode on while the periodontal chart was open only dimmed it:
  the controls kept the enabled state they were built with, so a host or script
  clicking one could still write a probing depth, bleeding point, plaque
  surface, index grade or assessment status into a chart the user was no longer
  allowed to edit. Read-only mode now refreshes the open chart, so every control
  it shows — probing depth, gingival margin, bleeding, suppuration, mobility,
  furcation, plaque, PI, GI, keratinized width, gingival thickness, Miller
  class, mPI, mBI, CEJ visibility, root concavity and the assessment rows —
  becomes genuinely inert the moment the flag is set, and becomes editable again
  exactly where it was editable before when the flag is released. Nothing is
  unlocked that the tooth itself does not support: a tooth with no periodontium
  and an uncharted site stay disabled either way. The odontogram side of
  read-only mode is unchanged.

## [2.7.0] - 2026-08-09

### Added

- **The periodontal assessment status is now authorable.** Version 2.4.0 gave
  every periodontal and peri-implant axis an explicit assessment status —
  assessed (normal), not assessed, unmeasurable, not applicable — as public API
  and FHIR emission, but nothing in the UI could set it: only a host driving the
  API could. The periodontal chart now carries the missing control. A new
  **Assessment status** toggle in the chart header adds one companion row under
  every visible index row (probing depth, gingival margin, bleeding,
  suppuration, furcation, plaque, PI, GI, mPI, mBI, mobility, keratinized
  width), with one cycle button per measurement point — site, surface, furcation
  entrance, or the tooth as a whole — cycling not assessed → assessed →
  unmeasurable → not applicable → not assessed. The rows are **off by default**:
  recording that an axis was examined is a deliberate second pass over a chart,
  not something done while probing, so the chart is unchanged until the toggle
  is on.
- **The status is readable where the axes already are.** The per-tooth tooltip
  gains one line per recorded status, naming the index and measurement point it
  was recorded at ("Assessment – unmeasurable: PD (Mesio-buccal), Furcation
  (Buccal)"), and the whole-mouth periodontal summary gains a per-status count.
  Both are silent on a chart that never used the axis.
- Localized for every supported UI language (HU, EN, DE, ES, IT, SK, PL, RU,
  PT-BR, AR, ZH, FR), including the row's own "i" info popover explaining what
  each status means.

### Changed

- `isAssessmentCharted(toothNo, axis, qualifier)` is a new read-only export:
  whether an axis already holds a measurement at that point. A point that does
  is **locked** in the UI, because `getAssessmentStatus` resolves a measurement
  ahead of any recorded status — the value is its own evidence of examination,
  and offering a click the domain would discard reads as a broken control.
- The authoring path writes only through the existing `setAssessmentStatus`
  setter, so the capability matrix (`perioAxisApplies`), the read-only lock and
  the dual-state status/plan gate apply exactly as they do to every other
  periodontal edit — an inapplicable position is disabled, never merely ignored.
  Storage semantics are untouched: the payload version stays **2.21**,
  hydration/import stays as tolerant as before, and the odontogram's SVG
  rendering and FHIR golden output are byte-identical.

## [2.6.0] - 2026-08-09

### Added

- **The periodontal examination is now canonical in the `dental-de` export.**
  Until now the canonical dialect emitted no periodontal data at all — the whole
  surface was reported once per tooth in `DentalDeConversionReport.unmapped` and
  only the legacy dialect's engine-local periodontal panel carried it. A charted
  natural tooth now exports one `PeriodontalObservationDE`, and an implant
  position exports one `PeriImplantObservationDE` together with the
  `DentalImplantDE` Device it is required to focus on. Emitted with the IG's own
  identifiers: six-site probing depth (LOINC `32910-2`, UCUM `mm`), the signed
  free-gingival-margin-to-CEJ level (LOINC `64043-3`), derived clinical
  attachment level (`PABefundTypeCS#attachment-loss`), bleeding on probing
  (SNOMED CT `86276007`), suppuration on probing
  (`PABefundTypeCS#suppuration-on-probing`), Glickman furcation grade with its
  FDI entrance (SNOMED CT `771311009` +
  `GlickmanFurcationGradeCS`), O'Leary plaque presence (LOINC `34016-6`),
  the Silness-Loe plaque index (SNOMED CT `251307008`), the Loe-Silness
  gingival index, keratinized-gingiva width and the Mombelli mPI/mBI
  peri-implant indices (`PeriodontalIndexCS`). Every probing site is qualified by
  `PeriodontalMeasurementSiteExt`, whose six codes match the engine's own probing
  sites one-to-one; every surface and furcation entrance is qualified by
  `ToothSurfacesExt` over HL7 `FDI-surface`.
- **Recorded assessment status survives the mapping.** An assessed-normal
  finding exports as an explicit result — `false`, grade `0`, or the Glickman
  scale's own "Grade 0" — while not-assessed, unmeasurable and not-applicable
  export as a component with a standard HL7 `dataAbsentReason` and no value. Both
  profiles require every component to carry a result or a data-absent reason, and
  the export satisfies that invariant.
- **Canonical periodontal read-back.** `parseFhirBundle` reads a canonical
  periodontal bundle back into the same payload fields it was built from —
  per-site probing depth, gingival margin, bleeding and suppuration, furcation,
  plaque, PI, GI, keratinized width, mPI and mBI — with the dialect's existing
  tolerance policy, including a bundle that mixes the canonical and legacy
  representations.

### Changed

- **The gingival-recession component is deliberately not emitted.**
  `PeriodontalObservationDE` fixes its recession component to SNOMED CT
  `6288001` and labels it "Gingival recession", but that SCTID resolves to
  "Accretion on teeth" in the SNOMED CT International edition (version
  `20250201`, verified through HL7's public terminology server); gingival
  recession is `4356008`, which the IG does not admit. Emitting a recession
  measurement under `6288001` would assert a dental deposit, so no recession
  component is produced and the omission is reported. Nothing is lost: the
  engine stores the SIGNED margin and LOINC `64043-3` is an exact contract for
  it, from which recession is `max(margin, 0)`. The refusal and its evidence are
  recorded in the new `REJECTED_SCT` export.
- **A truthful conversion report.** The blanket "periodontal measurements are
  unmapped" entry is gone. What remains reported, per axis and with a reason, is
  what the IG's own alignment matrix leaves unresolved: CEJ visibility, root
  concavity, the gingival-thickness phenotype and the Miller recession class
  (no automatic renderer migration); the peri-implant margin and attachment
  level (they need a documented stable implant reference point the editor does
  not record); tooth mobility (the IG carries only the governed German PAR
  Lockerungsgrad scale); and any index charted on a position whose profile has
  no slice for it.
- **A placeholder implant device identity.** `PeriImplantObservationDE.focus` is
  mandatory, and the editor knows an implant only by the FDI position it
  occupies. The export therefore mints a deterministic placeholder
  `DentalImplantDE` with a clearly adapter-owned identifier system
  (`urn:odontogram:dental-implant-position`) and a text-only device type; a host
  that owns a device registry must replace it. Each one is listed in
  `DentalDeConversionReport.textFallback`.

The legacy dialect is unchanged and byte-identical; the payload version stays
`2.21` and no rendering changed.

## [2.5.0] - 2026-08-09

### Changed

- **Wider verified SNOMED coverage in the canonical `dental-de` export.** The
  canonical dialect used to emit only five SNOMED CT concepts and carried every
  other clinical value as `CodeableConcept.text`. Five more engine axes now
  export a coded value as well: root caries (`234975001`), internal root
  resorption (`52994003`), external cervical root resorption (`41918006`),
  symptomatic and asymptomatic apical periodontitis (`39273001`), and the
  restoration-integrity findings — crown marginal leakage and every
  per-surface filling defect (`109728009`). Each code is admitted by the IG's
  own `RootEndodonticStateVS` / `RestorationStatusVS`, and the exact source
  assessment still travels in `CodeableConcept.text`, so nothing that used to
  read back stops reading back and no text value changed.
- **Recorded verification provenance.** `src/fhir/dentalDeCodesystems.ts` now
  exports `SCT_PROVENANCE`, a per-code record naming the admitting IG ValueSet
  and where the concept's meaning was verified (the IG's own examples and
  contract script, plus read-only `$lookup` / `$subsumes` / `$expand` answers
  from HL7's public FHIR terminology server). A code with no recorded
  provenance is not emitted, and no `Coding.display` is invented — the IG omits
  displays because they are licensed.
- **Explicit boundary for what stays text.** Values with no concept they
  provably entail keep the text fallback and keep appearing in
  `DentalDeConversionReport.textFallback`: the remaining `ToothPresenceStateVS`
  members are eruption-timing/disturbance concepts no engine value entails; all
  of `ProstheticStateVS` describes denture failure findings while the engine's
  `prosthesis` axis names a device type; apical abscess and condensing osteitis
  are not subsumed by the admitted apical-periodontitis concept; and the
  incomplete-root-filling, endodontic-post and periapical-subtype values have
  no admitted counterpart.

## [2.4.0] - 2026-08-09

### Added

- **Examination identity and context.** A document can carry the examination it
  belongs to: `id`, `subject`, `effectiveDateTime`, `performer`, `recorder`,
  `encounter` and `previousExaminationId`, through `getExaminationContext()` /
  `setExaminationContext(patch)` / `resetExaminationContext()`. Every field is an
  opaque host-owned identity string the engine stores and round-trips but never
  interprets; `effectiveDateTime` is validated as an ISO date or date-time and a
  malformed value is a silent no-op, mirroring `setExamDate`.
- **Dated examination snapshots.** `captureExamination(patch?)` archives the
  STATUS findings plus the case context and examination identity of that moment;
  `listExaminations()`, `getExamination(id)`, `removeExamination(id)`,
  `loadExamination(id)` and `startExamination(patch?)` read, review, remove and
  succeed them. Each snapshot is independent — later edits never reach into an
  archived examination, and capturing again files a follow-up (linked through
  `previousExaminationId`) instead of overwriting the baseline a trend depends
  on; correcting an archived examination requires passing its `id` explicitly.
  Status and plan keep meaning current-versus-proposed within ONE examination:
  a snapshot never carries a `plan`, and capturing neither initializes the plan
  chart nor changes the chart mode.
- **Explicit assessment status per periodontal axis.** `AssessmentStatus`
  (`assessed` / `not-assessed` / `unmeasurable` / `not-applicable`) with
  `getAssessmentStatus()`, `setAssessmentStatus()`, `getToothAssessments()` and
  the capability matrix `perioAxisApplies(toothNo, axis)` over
  `PERIO_ASSESSMENT_AXES` (PD, GM, BOP, suppuration, mobility, furcation,
  plaque, PI, GI, mPI, mBI, KG). Assessed-normal ("probed, did not bleed") is
  now recordable instead of indistinguishable from "nobody probed";
  not-applicable is derived from what the tooth actually is and cannot be
  overridden; a real measurement always wins over a recorded gap. The default,
  `not-assessed`, is never stored, so an ordinary chart serializes unchanged.
- **Suppuration in the full-mouth periodontal chart.** A buccal and a
  palatal/lingual suppuration row per arch, charted through the existing
  `setPerioSite(..., { sup })` patch, with its own Settings → Periodontal
  visibility toggle, info popover, canonical index name and i18n in all 12
  languages. The standalone periodontal SVG/PNG/JPG/PDF export renders the same
  rows.
- **Peri-implant examination in the full-mouth chart.** An implant column now
  supports six-site probing depth, bleeding, suppuration, implant mobility and
  keratinized-tissue width alongside the Mombelli mPI/mBI indices. The axes that
  require a CEJ (gingival margin, and the CAL derived from it) and the
  natural-tooth plaque indices stay inactive there — one capability matrix
  (`perioAxisApplies`) now decides this for the assessment status, the grid and
  every interactive periodontal setter instead of a per-row guess in the view.
  An archived examination also carries the whole-mouth `globals` of its moment,
  so the clinical `edentulous` finding travels with the snapshot it belongs to.
- **Suppuration and absent-data reasons in the FHIR export.** The periodontal
  panel emits an explicit per-site suppuration boolean, and an explicitly
  recorded gap is emitted as FHIR's own `dataAbsentReason`
  (`http://terminology.hl7.org/CodeSystem/data-absent-reason`: `not-performed`
  for not assessed, `unknown` for unmeasurable, `not-applicable`) — never a
  renderer-invented clinical code. Assessed-normal is emitted as an explicit
  `false` or grade `0`.
- The canonical `dental-de` dialect now prefers `examination.effectiveDateTime`
  for `Observation.effective[x]`, falling back to `case.examDate` as before.

### Changed

- **Periodontal edits are refused where the tooth has no such measurement
  point.** `setPerioSite`, `setFurcation`, `setPlaque`, `setPlaqueIndex` /
  `setGingivalIndex`, `setKeratinizedWidth` and `setToothMobility` now consult
  `perioAxisApplies()`: probing a missing, unerupted or post-extraction position
  is a silent no-op, as is writing a gingival margin or a natural-tooth plaque
  index onto an implant, while an implant's probing depth, bleeding,
  suppuration, mobility and keratinized-tissue width are accepted. Hydration and
  import stay tolerant of foreign data as before, and the exporters keep
  reporting whatever is stored.
- Payload version **2.20 → 2.21** (additive): the top-level `examination` and
  `examinations` keys and the per-tooth `assessment` map, each omitted when
  empty. Documents written before 2.21 hydrate unchanged and gain no examination
  identity from the previously loaded case. The frozen SVG-fingerprint and
  FHIR-golden fixtures are byte-identical; the roundtrip golden changes only by
  its version string.

## [2.3.0] - 2026-08-08

### Added

- **Controlled integration through an explicit UI-domain document.** The
  clinical state a host owns is now a named contract — `OdontogramDocument`,
  structurally identical to the versioned JSON `exportStatus()` already wrote,
  so every stored payload is already a valid document.
- **Instance-isolated clinical sessions.** `createOdontogramSession(initial?)`
  returns an `OdontogramSession` with `getDocument()` / `setDocument(doc)` /
  `subscribe(listener)` / `activate()` / `release()`. Two sessions never share
  clinical state: an edit through one is invisible through the other, in both
  directions. `getDefaultOdontogramSession()` and
  `getActiveOdontogramSession()` expose the process-wide standalone state and
  the session currently live in the engine.
  A session swaps state through the SAME `collectExportPayload()` /
  `hydrateImportedCharts()` data path `exportStatus()`/`importStatus()` already
  use — no second serialization format and no change to how a chart renders.
- **`OdontogramShell` props `session`, `document` and `onDocumentChange`.**
  `session` binds an instance to an isolated session; `document` makes the
  instance create and own a private session seeded from it; `onDocumentChange`
  observes that instance's document.
- **Engine ownership across mounted instances.** The interactive DOM editor is
  a single global engine bound to one tooth grid, so exactly one mounted
  `OdontogramShell` drives it, and that owner is the instance whose session is
  live. A non-owning instance renders an inactive placeholder instead of a
  second copy of the engine's global element ids — which previously meant its
  chart could paint another instance's session data under its own heading —
  and keeps its own document, still readable and writable through its session
  API. Unmounting the owner hands the engine to a waiting instance instead of
  tearing it down underneath it.
- Whole-mouth `globals` (notably the clinical `edentulous` flag) now travel
  with the session document, so switching sessions cannot leave one case's
  edentulous state behind on another.
- **Canonical `fhir-dental-de` FHIR dialect.** `buildFhirBundle(payload, {
  dialect: "dental-de" })` and `buildDentalDeBundle(payload, options)` emit
  `OdontogramObservationDE`, `CariesObservationDE` and `DentalFindingDE` against
  the published `de.cognovis.fhir.dental` IG: `OdontogramComponentCS` component
  slices, `DentalAssessmentTypeCS` codes, `DentalCategoryCS` category, FDI tooth
  identity (`ToothIdentificationFDICS`), ICDAS scores (`ICDASCariesScoreCS`),
  `RestorationTypeCS` / `DentalMaterialCS` values, and the repeatable
  `ToothSurfacesExt` over HL7 `FDI-surface`.
  Surface coding is tooth-aware — the biting surface is `I` (incisal) on an
  anterior tooth and `O` (occlusal) on a posterior one; on import `I` folds back
  to the engine's `occlusal` key, `V` to `buccal`, and the combo codes
  `MO`/`DO`/`DI`/`MOD` split into their members.
- **Conversion report.** `buildDentalDeBundle` returns `{ bundle, report }`
  where `report.textFallback` lists every value emitted as
  `CodeableConcept.text` under an extensible binding and `report.unmapped` every
  value not emitted at all (required binding with no matching concept, or an axis
  the IG routes to a resource this adapter does not build), each with the tooth,
  the field, the preserved value and the reason. No renderer-local code is ever
  presented as canonical Dental-DE terminology and no SNOMED identifier is
  guessed: only the five concepts whose meaning is provable from the IG's own
  published examples and contract assertions are emitted as codes.
- **`FhirExportOptions.effectiveDateTime`** — the canonical dialect's
  `Observation.effective[x]`, falling back to the document's `case.examDate`.
  Explicit rather than derived, so the FHIR adapter stays pure and deterministic.
- New public exports: `createOdontogramSession`, `getDefaultOdontogramSession`,
  `getActiveOdontogramSession`, `buildFhirBundle`, `parseFhirBundle`,
  `buildDentalDeBundle`, and the types `OdontogramSession`, `OdontogramDocument`,
  `FhirDialect`, `DentalDeConversionEntry`, `DentalDeConversionReport`.

### Changed

- `parseFhirBundle` now reads BOTH representations — the previously supported
  legacy bundle and canonical `fhir-dental-de` resources — including a bundle
  that mixes them. Canonical resources are detected by their canonical
  identifiers only, so a legacy bundle is never misparsed. The canonical reader
  covers every profile the canonical emitter writes, including
  `DentalFindingDE`, and resolves each text-fallback value by exact equality
  against the same display table the emitter used — so the canonical round-trip
  restores root caries, resorption, apical and periapical findings, prosthetic
  state, filling defects, recurrent and subcrown caries, radiographic depth and
  clinician notes rather than dropping them.

### Compatibility

- `buildFhirBundle`'s default dialect stays `"legacy"`; its output and the
  frozen SVG-fingerprint, FHIR-golden and roundtrip-golden fixtures are
  byte-identical. No existing public export was removed or renamed.
- Omitting both `session` and `document` keeps the historical standalone
  behaviour on the process-wide default session, so no consumer has to migrate.
  A single mounted instance always owns the engine, exactly as before.
- Payload version is unchanged at **2.20**; no stored JSON needs rewriting.
- **Test doubles only:** the shell now calls `createEngineClaim`, `claimEngine`,
  `releaseEngine`, `ownsEngine` and `onEngineOwnerChange` on the engine module.
  A consumer that replaces the module with an explicit mock factory (rather
  than a partial mock over the real module) must add those five names. Runtime
  behaviour and the public API are unaffected.

## [2.2.1] - 2026-08-06

### Added

- **Per-tooth notes surfaced in the Tooth-information panel and the PDF report.**
  A new "Individual notes" row (above Caries, one line per tooth that carries a
  note) appears in the whole-mouth summary and, as its own section, in the PDF
  export — both gated on the notes-enabled setting and hidden when no tooth has
  a note. `getOdontogramSummary()` gains an `individualNotes` field;
  `hasAnyToothNote()` is exported.
- **PDF export dialog: patient date of birth.** New `patientDob` case-identity
  field (`setPatientDob`, ISO `YYYY-MM-DD`), shown 2nd in the header (after
  name, before exam date). Payload version **2.19 → 2.20** (additive,
  omit-when-empty).

### Changed

- **PDF export options split.** The former combined "Odontogram + description"
  checkbox is now two independently-selectable options (chart image /
  description), plus a third for the individual-notes section (disabled when no
  tooth has a note). The exam date now defaults to today (still editable), and
  the report renders with placeholder identity ("John Doe" / "1980-01-01") when
  fields are left empty, so export always succeeds.
- **Plan mode shows only plannable treatment.** Clinically status-only findings
  are hidden while the Plan chart is active: the base picker offers only
  Missing / Permanent / Implant; the Caries section, tooth wear, discoloration,
  and the whole periodontal block (mobility, 6-site probing grid,
  inflammation/parodontal mods, calculus, peri-implant status) are hidden; the
  pulp/endo picker keeps endodontic TREATMENT (root canal / post / apicoectomy /
  parapulpal pin) but hides pulp-diagnosis, apical-diagnosis, periapical-lesion,
  and root-resorption. Restoration, prosthesis, orthodontics, crown-need/replace
  and extraction-plan remain plannable.
- **Lower-arch bridge saddle geometry** re-anchored to the true geometric mirror
  of the (well-fitting) upper value (`1 - SADDLE_Y_FRACTION`) so both arches are
  consistent by construction.
- Module brand name is now **React Advanced Odontogram** (npm package name and
  GitHub repository unchanged).

### Fixed

- **Periodontal Status → Odontogram view no longer becomes unresponsive.** The
  odontogram control panel is kept mounted (CSS-hidden) while the Periodontal
  Status view is active, instead of being unmounted and re-mounted, so its
  one-shot event wiring survives the round-trip.
- **PDF export patient-name field now accepts spaces** (the input is buffered
  locally and committed on blur/export instead of being trimmed per keystroke).
- **Periodontal Status band labels** are centered — "▲ Buccal ▲" above the
  central index band and a new "▼ Lingual / Palatal ▼" below it, on both arches.

## [2.2.0] - 2026-08-06

### Added

- **French (`fr`) UI language** — 12 UI languages total (machine-translated,
  native-speaker review pending). Contributed via PR #13.
- Export `initOdontogram` and `destroyOdontogram` from public API
- Export `getStatusChart`, `getPlanChart`, and `setPlanChart` for programmatic state
  hydration
- Export `getChartMode` and `setChartMode` for chart-mode lifecycle control
- Export `setNumberingSystem` from public API
- Export `getPlanChanges` for status-vs-plan diff
- Export `openPerioOverlay`, `closePerioOverlay`, `isPerioOverlayOpen` for
  programmatic perio-chart control
- Export `hasAnyPerioData` for perio data presence check
- Export `exportStatus` and `importStatus` for JSON export/import
- Export `exportPdf`, `exportPerioImage`, `exportPerioSvg` for periodontal export
  formats

### Fixed

- `exportStatus` and `importStatus` were module-private despite being fully
  implemented — added missing `export` keyword

### Security

- Upgraded `jspdf` 4.1.0 → 4.2.1, resolving 3 high-severity advisories
  (SNYK-JS-JSPDF-15322679 / -15322681 / -15322684). Based on Snyk PR #11.

### Changed

- README restructured for npm: the per-language documentation links moved to the
  top of the root README; fixed the demo URL (`react-odontogram-modul.vercel.app`);
  French added across every language switcher and enumeration.

## [2.1.0] - 2026-08-04
### Changed
- **Slimmer install (dependency diet).** Removed three unused runtime
  dependencies (`react-router-dom`, `react-hook-form`, `nanoid`) — they were
  never imported by the library (verified against the built bundle). The only
  remaining runtime dependency is `jspdf`.
- **`jspdf` is now lazy-loaded.** `exportPdf()` loads jspdf via a dynamic
  `import("jspdf")` on the PDF-export path instead of a static top-level import,
  so consumers who never export a PDF no longer pull jspdf (and its
  html2canvas/dompurify deps) into their main bundle.
- **Single bundled type declaration.** The build now emits one
  `dist/index.d.ts` (via `vite-plugin-dts` + `@microsoft/api-extractor`)
  instead of a tree of per-file `.d.ts` — hides internal `__*ForTest`
  declarations and resolves cleanly under `node16`/`nodenext` module
  resolution (no more extensionless-relative-import warnings from
  are-the-types-wrong).
- **README restructured for npm.** The root `README.md` is now a concise,
  npm-friendly landing page with **absolute image URLs** (so screenshots and
  the DOI badge render on npmjs.com, which does not ship the repo's relative
  image paths). The full English and Spanish documentation moved to
  `lang/README-en.md` / `lang/README-es.md`; every language switcher was
  updated accordingly.
### Notes
- No runtime behavior, API, or payload change — full test suite green, SVG
  parity byte-identical. `jspdf` remains a regular dependency (still installed);
  only its loading is deferred.

## [2.0.2] - 2026-08-03
### Changed
- **npm package renamed** from `react-odontogram-modul` to
  **`react-advanced-odontogram`** — the previous name was too close to the
  unrelated `react-odontogram` package. Same version (2.0.2), same code; only
  the published package name changes. The old `react-odontogram-modul` name is
  deprecated on npm and points here. The display name ("React Odontogram
  Modul/Module"), the GitHub repository, and the demo URL are unchanged.
- **Docs:** every language README now shows a language-specific Overview
  screenshot (`lang/screenshot_<lang>_odontogram.png`) in place of the shared
  preview image, and a periodontal-chart screenshot
  (`lang/screenshot_<lang>_perio.png`) above the periodontal-charting feature.
  Version aligned to 2.0.2 across package.json, CITATION, README badges and the
  regenerated TypeDoc docs. No code, API, behavior, or payload change.

## [2.0.1] - 2026-08-03
### Changed
- **Docs:** added a live npm version badge (shields.io, links to
  npmjs.com/package/react-odontogram-modul) to every language README, placed
  just before the MIT license badge. Regenerated the TypeDoc API docs. No code,
  API, behavior, or payload change.

## [2.0.0] - 2026-08-03

First release published to npm as a consumable React component library
(`react-odontogram-modul`). This is a **major** version bump because the
distribution model changes — React becomes a peer dependency and the package
ships ESM-only — even though the component's runtime behavior, data model and
FHIR output are unchanged.

### Added
- **Publishable npm package.** The module can now be built and published as a
  consumable library, not only run as a demo app:
  - `npm run build:lib` (new `vite.lib.config.ts` + `tsconfig.build.json`)
    emits `dist/odontogram.js` (ESM), a single `dist/style.css`, and `.d.ts`
    types. The existing `npm run build` (demo/GitHub-Pages site) is unchanged.
  - `package.json` gains `exports` (`.` → types + `import`; `./style.css`),
    `main`/`module`/`types`, `files`, `sideEffects`, `engines`, and package
    metadata; `private: true` was removed.
  - New public entry `src/index.ts` exports `OdontogramShell` (default **and**
    named) plus everything `App.tsx` already surfaced.
  - React/ReactDOM moved to `peerDependencies` (`^18 || ^19`) to avoid a
    duplicate React in consumer bundles.
  - CI (`.github/workflows/ci.yml`) and tag-triggered npm publish
    (`.github/workflows/publish.yml`) with provenance; `.nvmrc`.
### Changed (BREAKING)
- **React / ReactDOM are now `peerDependencies`** (`^18 || ^19`) instead of
  regular dependencies — a consuming app must install `react` and `react-dom`
  itself. This prevents a duplicate React copy / "Invalid hook call" errors.
- **The package is ESM-only** — there is no CommonJS build. Consume it from a
  bundler that supports the `exports` field (Vite, webpack 5, Next.js, Rollup,
  esbuild, Parcel).
- **The stylesheet must be imported separately** —
  `import "react-odontogram-modul/style.css"`. It is no longer implied by
  importing the component.
### Changed
- **Tooth-template and inline-icon SVGs are now inlined into the JS bundle**
  (`?raw` imports) and parsed directly instead of being fetched at runtime from
  emitted asset URLs. This makes the built library self-contained and portable
  to any consumer bundler (previously the fetched hashed asset URLs would 404
  in a downstream app). Rendering is byte-identical — SVG-fingerprint parity is
  green.
### Notes
- Consumers must import the stylesheet once:
  `import "react-odontogram-modul/style.css"`. The package is
  **ESM-only** and targets bundler module resolution (Vite/webpack/Next/esbuild).
- **Known limitation:** engine state is a module-level singleton, so only one
  `<OdontogramShell>` instance per page is supported in this release.
- Behavior/derivation/serialization/FHIR are unchanged; payload version stays
  **2.19**.

## [1.50.0] - 2026-08-03
### Added
- **Arabic (`ar`) and Simplified Chinese (`zh`) UI languages** — 11 UI languages total (HU/EN/DE/ES/IT/SK/PL/RU/PT-BR/AR/ZH). Both ship the full 749-key translation block (matching Hungarian's key set, enforced by `translations.test.ts`), a `language.*` self-label, and an entry in the language switcher and `Language` union (`src/i18n/translations.ts`).
- **RTL layout for Arabic.** The app root mirrors to right-to-left whenever `ar` is active (`dir` reactive to the language, `RTL_LANGUAGES`/`isRtl()` in `src/App.tsx`), while the dental chart (`#toothGrid`) and the periodontal charts (`.dental-chart-column`, `.perio-fullgrid-scroll`, `[data-perio-arch]`) stay pinned `dir="ltr"` — both via the JSX `dir="ltr"` attribute and a defensive CSS `direction: ltr` rule — so tooth geometry, numbering, and mesial/distal orientation never flip.
- **Per-language READMEs** — `lang/README-ar.md` and `lang/README-zh.md`, added to every README language switcher.
- Both new languages are **machine-translated**; native-speaker review is pending.
### Notes
- UI/i18n/CSS-only — no change to `odontogram.ts` derivation/serialization, any `fhir/*` builder, or the SVG render itself. SVG-fingerprint, FHIR-golden, and roundtrip-golden parity fixtures are byte-identical to 1.49.0. Payload version stays **2.19**.

## [1.49.0] - 2026-08-03
### Added
- **Standalone periodontal chart export (SVG/PNG/JPG).** `buildPerioSvg()` (`src/perioExport.ts`) renders the FULL perio chart — tooth graphics, numeric rows, and the 2017 classification block — as one standalone vector SVG, built headlessly from the active chart's state (not from the mounted `PerioChart` DOM). `exportPerioSvg()` / `exportPerioImage("png"|"jpg")` download it, wired to three new export-menu items ("Perio SVG/PNG/JPG"); all three are disabled whenever `hasAnyPerioData()` is false.
- **`hasAnyPerioData()`** — true iff any periodontal axis is charted anywhere in the mouth. Drives the perio export auto-skip and disables the perio export-menu items on a blank chart.
- **PDF report export.** `exportPdf(opts)` (`src/perioPdf.ts`) assembles a jsPDF-native report — vector text via `.text()`, raster odontogram/perio-chart images via `.addImage()` — with **no svg2pdf.js dependency** (jsPDF was already a dependency; this is its first use). Sections are individually optional (`{patientData, odontogram, perioStatus, perioDescription}`); the two perio sections auto-skip whenever `hasAnyPerioData()` is false regardless of the requested options. A shared `rasterizeSvgToPng`/`rasterizeSvgToCanvas` helper (extracted from `exportImage`) is reused by `exportPerioImage` and `exportPdf`.
- **`ExportOptionsModal`** — the "PDF report…" export-settings dialog (mirrors `DualStateConfirm`'s focus-trapped dialog contract). Four section checkboxes (patient data, odontogram, perio status, perio description — default all ON; the two perio checkboxes are disabled with a "no perio data" hint when `hasAnyPerioData()` is false), plus patient-name and exam-date inputs wired straight to the case metadata.
- **Case metadata: patient name + exam date.** `caseMeta` gains `patientName` (trimmed string or `null`) and `examDate` (`YYYY-MM-DD` or `null`) — identity-only fields feeding the PDF report header, via `setPatientName`/`setExamDate`. Payload version **2.18 → 2.19** (additive). **Not** part of the FHIR export.
- **mPI/mBI implant-gating.** The peri-implant Mombelli indices (mPI/mBI) now render as rows only in an arch that contains at least one implant tooth, on both the live perio chart and the new SVG/PDF exports — an arch with no implants no longer shows two empty index rows.
- Disabled export-menu items get a dedicated CSS style (greyed out, matching the new `hasAnyPerioData()`-gated menu entries).
### Notes
- SVG-fingerprint and FHIR-golden parity fixtures are byte-identical to 1.48.0 (the new exports are additive, non-rendering paths; `patientName`/`examDate` are not FHIR fields). The roundtrip-golden fixture changes only by its version string (`2.18` → `2.19`).

## [1.48.0] - 2026-08-01
### Changed
- **Perio chart layout: central index band, split buccal/palatal graphics (UI-3a).** Each arch's tooth graphic is now drawn as **two separate SVGs** — a buccal aspect above, a palatal/lingual aspect below — instead of one continuous occlusal-to-occlusal arch, both sharing a **uniform crowns-to-band orientation** so the crowns of both aspects face the new **central perio index band** between them and the roots face outward toward the tooth-number rows. That band carries the indices shared across the whole tooth rather than split by aspect: **Miller recession class** moved to the very top of the arch (near the buccal aspect, replacing its previous per-tooth-row placement), and **Plaque/PI/GI/mPI/mBI** now render as a single **anatomical diamond tile** per tooth (buccal tip up, lingual tip down, mesial/distal on the middle row — swapped per side of the arch so mesial always points toward the midline) instead of four separate cross-shaped buttons. A `▲ Buccal … Lingual/Palatal ▼` label orients the band. The legacy single-arch builder (`buildArchGraphic`/`archOrientTransform`/`isUpperArch`) is retired in favor of the new split builders (`buildBuccalArchSvg`/`buildPalatalArchSvg`).
- Purely presentational, client-generated chart geometry — no change to `odontogram.ts` derivation/serialization, `perioClassification.ts`, or any `fhir/*` builder; the perio chart is not part of the golden fixtures. SVG-fingerprint, FHIR-golden, and roundtrip-golden fixtures are byte-identical to 1.47.0; payload version stays **2.18**.

## [1.47.0] - 2026-08-01
### Added
- **Settings → "Periodontal" tab.** A new Settings tab with 16 per-index show/hide toggles for the perio-chart rows — grouped **Pocket** (PD/GM/CAL/BOP), **Hygiene** (Plaque/PI/GI), **Mucogingival** (CEJ visibility/Root concavity/KG/GT), **Support** (Furcation/Mobility/Miller class), and **Peri-implant** (mPI/mBI) — each row with its own description, defaulting all-visible; deselecting a row hides it from the perio-chart grid. A second option lets index row labels display **translated** (the existing localized text, default) or **canonical** — a fixed English/Latin standard scientific name (e.g. "Modified Sulcus Bleeding Index (mBI)") shown identically regardless of the active UI language; the "i" info-button tooltips always stay localized in either mode.
- Both `perioRowVisibility` and `perioIndexNameMode` are session-level app preferences, following the same pattern as the existing `perioViewMode` setting — a module-level flag with a getter/setter that calls `notifyStateChange()` on change, wired into `SettingsModal.tsx`'s declarative tab registry.
- App-preferences only — neither flag is part of a tooth's state or the case-level metadata, so neither is ever serialized. `collectExportPayload`/`getPlanChart`/hydrate are unchanged, no `svgLayer` axis is touched by the flags themselves (only which existing rows/labels render), and no FHIR builder is touched. SVG-fingerprint, FHIR-golden, and roundtrip-golden fixtures are byte-identical; payload version stays **2.18**.

## [1.46.0] - 2026-08-01
### Changed
- **Periodontal view redesign, renamed "Periodontal Status".** The `Odontogram | Dental Chart` view toggle and the chart header now both read **"Periodontal Status"**. While that view is active, the right panel is no longer the odontogram's Controls panel — it's repurposed into a dedicated **perio-context sidebar** (`PerioSidebar`) carrying Patient data, the 2017 classification panel, and the whole-mouth periodontal summary, extracted out of the chart body and view-gated so it only shows in the periodontal view. The perio index rows (PD/GM/CAL/BOP + mobility + furcation + plaque) now show their **full names** instead of abbreviations, in **larger, more touch-friendly cells**. The arch chart itself now **dynamically scales to fill the available width** (a `ResizeObserver`-driven fill-scale through the shared `archToothLayout` geometry) instead of a fixed size, so it's responsive at any window size.
- Purely presentational — no change to `odontogram.ts` derivation/serialization, `perioClassification.ts`, or any `fhir/*` builder. SVG-fingerprint, FHIR-golden, and roundtrip-golden fixtures are byte-identical to 1.45.0; payload version stays **2.18**.

## [1.45.0] - 2026-08-01
### Added
- **2017 World Workshop periodontal classification (diagnosis/stage/grade/extent), derived-with-override.** A pure derivation core (`src/perioClassification.ts`) computes `diagnosis` (health/gingivitis/periodontitis, from interdental CAL ≥1mm at ≥2 non-adjacent teeth or the buccal/oral fallback, else %BOP-gated gingivitis), `stage` (I-IV, from worst interdental CAL / max radiographic bone loss %, escalated by PD ≥6mm or furcation ≥II, overridden to IV by ≥5 teeth lost to periodontitis), `grade` (A-C, from the %RBL÷age ratio modified by smoking/HbA1c risk buckets), and `extent` (localized/generalized/molar-incisor pattern) from the charted per-tooth perio data and the P4a case metadata. Four per-axis clinician overrides — `setDiagnosisOverride`/`setStageOverride`/`setGradeOverride`/`setExtentOverride` (each a valid enum value or `null` to clear/revert to derived) — let a clinician correct any single axis without touching the others; `getPerioClassification()` returns the final (override ?? derived) value per axis alongside the untouched `derived` result and an `overridden` flag per axis. Surfaced as a classification panel on the Dental Chart and a compact fragment on the whole-mouth periodontal summary line.
- **The engine's first FHIR `Condition`** — the 2017 World Workshop periodontitis/gingivitis diagnosis, BNO/ICD-10 K05.3 (chronic periodontitis) / K05.2 (molar-incisor-pattern periodontitis) / K05.1 (chronic gingivitis), emitted only when the final diagnosis is gingivitis or periodontitis (a "health" diagnosis emits nothing). `Condition.stage[]` carries one type-differentiated entry per applicable axis — periodontal stage (periodontitis + a concrete stage only), grade (whenever not indeterminate), extent (whenever applicable) — each an engine-local `type`/`summary` CodeableConcept pair (SNOMED deferred). `Condition.evidence[]` references smoking-status and HbA1c Observations, emitted only when those case-metadata fields are actually charted. Deterministic (fixed ids, no Date/random) — the four parity fixtures all derive `health` (no perio/case data charted), so they emit no Condition and the FHIR golden stays byte-identical; a diseased case does emit one (covered by `p4b-condition-fhir.test.ts`).
- Neither the classification derivation nor its overrides have an `svgLayer` → the odontogram render is unchanged, SVG-fingerprint parity byte-identical. Payload version **2.18** (additive — four new omit-when-default `caseMeta` override fields).

## [1.44.0] - 2026-07-31
### Added
- **Case-level metadata object.** The engine's first case-level object — a single shared block (not per-tooth, not dual-state, mirrors the top-level `globals` payload key), carrying patient **age**, **smoking status** (never/former/current, + cigarettes/day), **diabetes status** (none/present, + HbA1c %), and two perio summary stats: **teeth lost to periodontitis** and **max radiographic bone loss %**. Surfaced as a collapsible panel on the Dental Chart (7 controls, live-updating, read-only-aware) and as a compact fragment appended to the whole-mouth periodontal summary line (e.g. "Age 54 · current smoker (12/day) · diabetic (HbA1c 7.8%) · max RBL 45% · 3 teeth lost to perio") — only the fields actually charted are shown. Public API: `getCaseMeta()`, `setCaseAge`/`setSmokingStatus`/`setCigarettesPerDay`/`setDiabetesStatus`/`setHba1c`/`setToothLossPerio`/`setMaxRblPercent`, `resetCaseMeta()`. Both charts (status + plan) carry the same shared case block; cleared on Reset All.
- No FHIR representation yet — this is pure case-context data feeding the periodontal staging/grading classification that follows in the next sub-project. SVG-fingerprint parity byte-identical (no `svgLayer`, nothing renders on the odontogram). Payload version **2.17** (additive).

## [1.43.0] - 2026-07-31
### Added
- **Mombelli modified Plaque Index (mPI)** and **Mombelli modified Sulcus Bleeding Index (mBI)** — implant-only, per-surface graded findings (0-3, mesial/distal/buccal/lingual), each surfaced as a Dental Chart row with an info popup, in the tooth tooltip, and in the whole-mouth summary. Both are gated to implant teeth end-to-end — the setter no-ops on a non-implant tooth, and the Dental Chart cell is active only on an implant. Exported to FHIR as additional per-surface graded components on the per-tooth periodontal Observation (engine-local codes; no dedicated LOINC yet).
- Consolidated the Dental Chart's overlay whole-mouth read-out (`#perioOverlayReadout`) to also cover `pi`/`gi`/`kg` (previously only `bop`/`plaque` had one), closing a gap left over from the earlier graded-indices release.
- Neither axis has an `svgLayer` → the odontogram render is unchanged, SVG-fingerprint parity byte-identical. Payload version **2.16** (additive).

## [1.42.0] - 2026-07-31
### Added
- **Silness-Löe Plaque Index (PI)** and **Löe-Silness Gingival Index (GI)** — per-surface graded findings (0-3, mesial/distal/buccal/lingual), each surfaced as a heat-bucketed Dental Chart row, in the tooth tooltip, and in the whole-mouth summary. Exported to FHIR as additional per-surface graded components.
- **Keratinized gingiva width (KG)** — a per-tooth buccal measurement in mm (0-15), charted like the other mm-based perio findings, shown as a Dental Chart row, in the tooltip, and in the summary. Exported to FHIR.
- **Gingival thickness phenotype (GT)** — a per-tooth categorical finding (unknown / thin / medium / thick) and **Miller recession class** — a per-tooth categorical finding (none / i / ii / iii / iv), each as a Dental Chart row with an info popup, surfaced in the tooltip/summary, and exported to FHIR.
- All five axes are pure per-tooth data (no `svgLayer` → the odontogram render is unchanged, SVG-fingerprint parity byte-identical). Payload version **2.15** (additive).

## [1.41.0] - 2026-07-11
### Added
- **Cairo recession type** (RT1–RT3) — computed from the attachment levels already recorded (interproximal vs buccal CAL on a tooth with buccal recession) and shown as a Dental Chart overlay layer + in the tooth tooltip / whole-mouth summary. Derived, no new data.
- Two per-tooth findings: **CEJ visibility** (none / detectable / not-detectable — affects CAL/recession accuracy) and **root concavity** (none / mild / deep), each as a Dental Chart row with an info popup, surfaced in the summary, and exported to FHIR. Payload 2.14 (additive).

## [1.40.0] - 2026-07-11
### Added
- **Index switcher on the Dental Chart.** A toggle row highlights the teeth by a chosen periodontal measure — probing depth, CAL, recession, plaque, bleeding, or ≥5 mm/≥6 mm deep-pocket heat — repainting the same tooth diagram (one canvas, swappable layer). All layers are computed from the data you already entered (no new measurements); API `getPerioOverlayLayer()` / `setPerioOverlayLayer()`.
- **Info popups on the perio rows.** A small "i" icon on each row label (PD, GM, CAL, BOP, plaque, furcation, mobility) opens a short explanation of that index. No payload/FHIR change.

## [1.39.0] - 2026-07-11
### Changed
- **Smarter Status ↔ Plan editing.** After a plan exists, editing a tooth's **status** now updates the **plan** too — *as long as you haven't planned anything on that tooth yet* — so correcting the current reality no longer shows up as a planned change in the "What changes" box. If you edit the status of a tooth that **does** have planned changes, a **confirmation** appears first; on confirm the status change applies (and the plan stays as planned, so the difference is shown). Whole-mouth actions (Statuses presets, Edentulous, dentition presets) follow the same rule atomically — one confirmation, applied all-or-nothing. No payload/FHIR change.

## [1.38.0] - 2026-07-11
### Changed
- **Graphical Dental Chart polish.** The tooth arches now face **occlusal-to-occlusal** (upper crowns down, lower crowns up, like the odontogram); a **numbered millimeter guide grid** is drawn behind the teeth (a pocket's depth reads directly against the mm lines); the diagram is **larger and scales with the window**, with tighter tooth spacing; and an **implant graphic** is shown for implant teeth (instead of the natural tooth shape). No payload/FHIR change (the graphic reads template artwork into its own DOM — SVG-fingerprint parity byte-identical).
### Added
- Furcation and plaque status→plan changes now surface in the **"What changes"** box.

## [1.37.0] - 2026-07-11
### Added
- **Furcation** charting (Glickman I–IV, per entrance) on the teeth that have furcations — maxillary molars (3 entrances), mandibular molars (2), maxillary first premolars (2) — and **plaque** charting (O'Leary, per-surface presence → whole-mouth **plaque index PI%**), both as rows in the periodontal grid and the graphical Dental Chart, with a summary showing max furcation + PI%. Furcation is exported to FHIR (LOINC `34015-8`, per entrance). Public API: `setFurcation`/`getToothFurcation`/`furcationEntrances`, `setPlaque`/`getToothPlaque`. Payload version **2.13** (additive).
### Fixed
- Probing depths **10–15 mm** are now enterable via the keyboard (type `1` then a second digit; single digits `2`–`9` still auto-advance), so deep pockets no longer require the spinner.
- Toggling **read-only** while the periodontal chart is open now locks it live (previously the lock only applied to the main panel).

## [1.36.0] - 2026-07-11
### Added
- **Graphical periodontal chart ("Dental Chart" view).** The periodontal chart is now drawn like a real perio chart — the teeth rendered in a continuous arch (reusing the existing tooth artwork), with a red **CEJ reference line** and a **gingival-margin / pocket-depth curve** (a filled band) plotted over the teeth from the per-site data, the number rows (probing depth, gingival margin, CAL, bleeding, mobility) aligned in columns above/below the teeth, and a summary (avg PD, avg CAL, %BOP). Deep pockets visibly dip toward the root; recession shows the margin below the CEJ.
- **Presentation is switchable:** an `Odontogram | Dental Chart` **view toggle** (default) swaps the main chart area, and a **Settings option (`perioViewMode`)** can switch it back to the previous **popup** overlay. New API `getPerioViewMode()` / `setPerioViewMode()`. The perio chart remains a separately-invocable component (`PerioChart` export + `openPerioOverlay`/…) for host integration. The base odontogram is never re-rendered (hidden but mounted) — SVG parity byte-identical; no payload/FHIR change.

## [1.35.0] - 2026-07-11
### Added
- **Periodontal charting grid** — a full-mouth clinician-style perio chart: all teeth × 6 sites, with probing depth, gingival margin, bleeding-on-probing, derived CAL, and mobility, plus a whole-mouth summary (charted sites, %BOP, worst CAL, max PD). **Keyboard auto-advance** entry (type a probing-depth digit → focus jumps to the next site in charting order; arrows navigate; space toggles BOP; a leading `-` primes a negative gingival margin; clearing a depth un-charts the site).
- The perio chart is a **separately-invocable overlay** so a host application can call up the periodontal chart independently of the base odontogram: `PerioChart` is a named export, and `openPerioOverlay()` / `closePerioOverlay()` / `isPerioOverlayOpen()` drive it programmatically. It shares the same loaded case as the base chart (one case, two surfaces) and is dual-state aware. Render of the base odontogram is byte-identical (the overlay layers over it; no payload/FHIR change). Second sub-project of the periodontal arc; furcation + plaque follow in P2b.

## [1.34.0] - 2026-07-11
### Added
- **Periodontal charting — data core (6 sites/tooth).** Each tooth now carries a `perio` record with per-site **probing depth (PD)**, **gingival-margin position** (signed vs the CEJ), **bleeding on probing (BOP)**, and suppuration, over the six standard sites (MB/B/DB buccal, ML/L/DL lingual). **Clinical attachment level (CAL = PD + gingival margin)**, recession, and whole-mouth **%BOP** are derived (never stored). A minimal per-site input on the selected-tooth panel authors the data with a live CAL/%BOP read-out; the polished perio-chart grid follows in a later release. First sub-project of the periodontal-parameters arc.
- **Per-site FHIR export** for periodontal data — one periodontal-panel `Observation` (LOINC `74029-0`) per charted tooth, with per-site components for PD (`32910-2`), recession (`32911-0`), CAL (`32912-8`), and BOP; the tooth+probe-site qualifier is carried R4-conformantly via HL7's `component.bodySite` backport extension. SNOMED coding for periodontal findings is deferred (LOINC-primary for now); FHIR *import* of perio is deferred (it round-trips through the JSON payload).
- Public API: `setPerioSite()`, `getToothPerio()`, `getToothCal()`, `getPerioSummary()`, `getPerioChart()`. Payload version **2.12** (additive — a case with no perio data is byte-identical apart from the version bump). Dual-state aware: perio participates in the status/plan charts and the status→plan diff.

## [1.33.0] - 2026-07-11
### Added
- **Proposed styling** in Plan mode: any finding the plan *adds* relative to the current status (a planned crown, extraction, orthodontic movement, prosthesis, etc.) now renders with a distinct **dashed, tinted "proposed" outline**, so the plan chart reads as intent rather than fact. Findings unchanged from the status render solid as usual; a finding the plan *removes* simply doesn't appear. A small **"dashed = proposed" legend** shows in the chart card while Plan mode is active. Completes the round-2 Status/Plan split (after 1.31.0's dual-state core and 1.32.0's diff box).
- Render in **Status mode is byte-identical** to before — the proposed treatment runs only in Plan mode, through a non-fingerprinted style channel, and is fully reset when switching back to Status. No payload/FHIR change.

## [1.32.0] - 2026-07-11
### Added
- Status → Plan **diff** and a **"What changes"** box under the Tooth-information panel. When a plan differs from the current status, the box lists every difference per tooth and per treatment axis (presence, tooth substrate, restoration, prosthesis, planned crown, orthodontics, pulp/endo, apical) as a `tooth: axis  from → to` line, reusing the same human-readable labels the tooltip and whole-mouth summary already use. The box is hidden whenever no plan exists or the plan is identical to the status, and refreshes live as either chart is edited.
- New `getPlanChanges()` public API returning the structured status→plan diff (`{ toothNo, axis, from, to }[]`); the same list is now exposed on `getOdontogramSummary()` as `plannedChanges`. Render is byte-identical — the diff is a pure read-only comparison of the two charts. Second sub-project of the Status/Plan split (after 1.31.0's dual-state core).

## [1.31.0] - 2026-07-11
### Added
- Status ↔ Plan chart split: the chart now holds a separate current-**status** and a **plan** (intended post-treatment) state, switched by a `Status | Plan` toggle in the chart header (`#chartModeToggle`, with a `.plan-mode` visual cue on the chart card). The plan chart is lazily initialized as a deep copy of the status chart the first time plan mode is entered; later switches reuse whatever is already in the plan chart. Render is byte-identical to the single-chart render — the toggle only changes which chart is drawn.
- Per-state public API: `getChartMode()` / `setChartMode(mode)` to read/switch the active chart, and `getStatusChart()` / `getPlanChart()` / `setPlanChart(payload)` to read or write either chart's payload independently of which one is currently active. The existing single-state export (`exportStatus`/`exportFhir`) and import stay status-primary — they always target `charts.status`, not the active chart.
- The JSON export gains an additive `plan` section, emitted only when the plan chart has been initialized and differs from the status chart; payload version bumped to **2.11** (imports still accept legacy 1.4 through 2.10 and migrate automatically). A status-only case (the overwhelming majority) stays byte-identical apart from the version bump.
- Note: a diff / "what changes" summary between status and plan, and plan-specific rendering (e.g. planned orthodontic movement), are not part of this release and follow in later releases.

## [1.30.0] - 2026-07-11
### Fixed
- Peri-implant status (mucositis / peri-implantitis mild / moderate / severe) is now written to the exported chart. It was authored, rendered, summarized, and read back on import, but was omitted from `serializeState()`, so it was silently lost on JSON and FHIR export → import. It now round-trips like every other clinical axis (no payload-version change — additive and backward-compatible within 2.10).
### Changed
- Comprehensive documentation refresh. The README (English + all supported UI languages) now covers every clinical axis and setting added since v1.13 — pulp / apical diagnosis (with practical-Latin subtypes), root resorption, peri-implant status, the caries state-machine (ICDAS depth, CARS secondary caries, root caries, radiographic depth), per-surface filling defects, typed tooth wear, discoloration, per-tooth orthodontics, position-aware surface notation, the two-axis restoration model with removable prosthetics and multi-tooth bridge spans, and the tabbed Settings modal. The Status Export/Import field reference and payload version (2.10) are brought current, and the generated API reference (TypeDoc) is regenerated.

## [1.29.0] - 2026-07-11
### Fixed
- Changing the pulp-detail level (Settings) now live-refreshes the whole-mouth summary and per-tooth tooltips (previously stayed stale, showing the old Latin/AAE wording until the next tooth edit).
- Crown-leakage ("Marginal leakage") no longer shows in the tooltip or whole-mouth summary once a tooth's restoration control is hidden (radix/milktooth/extraction/under-gum) or its restoration is cleared — the summary gate now matches the `#crownLeakageRow` control's own visibility gate (`!restorationRowHidden(state)` AND `restorationType` crown/bridge) exactly, including for stale crown/bridge payloads reached via import/hydrate.
- Lower-arch bridge connector saddle bar position corrected (`SADDLE_Y_FRACTION_LOWER` 0.28 → 0.19).

## [1.28.0] - 2026-07-11
### Added
- Position-aware surface notation: caries/filling surface letters and labels now read incisal/labial/palatal on the relevant tooth positions (occlusal → incisal on anteriors; buccal → labial on anteriors; lingual → palatal on upper teeth, lingual on lower teeth), controlled by a new Settings → Tooth details "Surface notation" setting (simple / full, default full). Applies to the whole-mouth summary and to both the caries and filling-defect surface pickers (letter + caption).
- A filling-defect hint note on the Fillings card (e.g. "36 has a filling defect recorded."), parallel to the existing subcaries hint note.
### Changed
- The filling-defect popup's option list now stacks vertically (previously horizontal), matching the caries-depth popup layout.
- Summary and surface-picker letters now default to the anatomically-specific ("full") notation instead of the generic B/O/L set.

## [1.27.0] - 2026-07-11
### Fixed
- Implants and missing/gap teeth once again offer their full restoration/attachment picker: crown/bridge + healing-abutment/locator/locator-denture/bar/bar-denture on an implant; bridge-pontic + removable-partial/removable-full on a missing/gap tooth.
- Restoration row is now hidden on a `radix` substrate tooth (no restoration can be authored on a root remnant).
- Mobility control is now hidden on implant teeth.
- Bridge teeth render both the crown cap AND the saddle connector (previously the connector only).
- Bridge overlay connectors are now arch-aware, fixing a lower-arch misalignment (mirrored saddle-Y geometry for the lower arch).
- Adding a bridge via a Statuses preset now triggers the overlay recompute, so the connector renders immediately instead of requiring a follow-up edit.
- The periapical-inflammation modifier toggle now shows only on missing/extraction-socket teeth (hidden on present teeth and on implants, where `apicalDx`/`periImplant` already drive the periapical/peri-implant glyph).
- Filling defects are now explicitly labeled in the whole-mouth Fillings summary line, matching how secondary caries is labeled on the Caries line.
### Added
- Settings → new "Panels" tab: independently toggle the Statuses and Orthodontics whole-mouth panel visibility.
- The Caries and Secondary-caries settings tabs are merged into one "Caries" tab, with the CARS (secondary-caries) control moved above Radiographic depth.
### Note
- The tooth SVG assets were refreshed alongside this release (unified front dimensions + occlusal ortho-bracket/ring, SVG version 2.5.0) — byte-identical render, no functional change.

## [1.26.0] - 2026-07-11
### Added
- Per-tooth orthodontic charting: appliance (bracket/band), drift (mesial/distal), vertical movement (extrusion/intrusion), and rotation, reusing the dormant v2.5.0 ortho artwork (no new SVG). Shown on the chart, in the tooltip, and a new whole-mouth "Orthodontics" summary section.
### Migration
- Payload version 2.10 (imports 1.4–2.9 accepted). Additive — legacy charts carry no orthodontic findings.

## [1.25.0] - 2026-07-11
### Changed
- Tooth wear controls now sit on separate rows with the "Planned extraction" toggle below them (previously overflowed the panel).
### Added
- Settings → new "Tooth details" tab: a simple/complex detail level for tooth wear and for discoloration. Simple mode shows a yes/no toggle per finding (wear on → attrition/abrasion, discoloration on → other); complex mode (default) keeps the type/cause dropdowns. The stored value is preserved when switching levels.

## [1.24.0] - 2026-07-11
### Added
- Tooth discoloration: record a discolored natural crown by cause (tetracycline, fluorosis, non-vital darkening, extrinsic staining, or other/unknown) on permanent and milk teeth. The chart tints the crown a representative colour; shown in the tooltip and a new whole-mouth "Discoloration" summary section. Completes the surface & structural conditions set (filling defect, wear, discoloration).
### Migration
- Payload version 2.9 (imports 1.4–2.8 accepted). Additive — legacy charts carry no discoloration.

## [1.23.0] - 2026-07-11
### Changed
- Tooth wear is now recorded by clinical type per location: an incisal/occlusal wear type (attrition / erosion) and a cervical wear type (abrasion / abfraction / erosion), replacing the two on/off wear flags. Shown in the tooltip and a new whole-mouth "Wear" summary section.
### Migration
- Payload version 2.8 (imports 1.4–2.7 accepted). A legacy edge-wear flag becomes attrition; a legacy cervical-wear flag becomes abrasion. The chart rendering is unchanged for migrated data.

## [1.22.0] - 2026-07-11
### Added
- Per-surface filling defects for direct restorations: mark a filled surface as having a marginal defect, fracture/chip, or wear (independent of recurrent caries). Authored via a per-surface indicator on the Fillings card; shown in the tooltip and the whole-mouth summary; rendered on the chart.
### Migration
- Payload version 2.7 (imports 1.4–2.6 accepted). Additive — legacy charts carry no filling defects.

## [1.21.0] - 2026-07-11
### Added
- The per-tooth tooltip and the whole-mouth summary panel now surface the full set of clinical findings added since v1.16: pulp diagnosis, apical diagnosis (+ lesion subtype), root resorption, peri-implant status, graded root caries, calculus, crown marginal leakage, fracture, contact loss, and bruxism wear. A new "Diagnoses" section groups the pulp/apical/resorption/peri-implant findings; caries carries a coarse severity qualifier (superficial/moderate/deep).

## [1.20.0] - 2026-07-11
### Added
- Peri-implant status axis for implants: peri-implant health / mucositis / peri-implantitis with graded (mild/moderate/severe) crestal bone loss, shown as a dedicated selector on implants.
### Changed
- Implants no longer render the (clinically incorrect) periapical lesion glyph; their inflammation is expressed through the new peri-implant axis. Missing/extraction-socket teeth are unaffected.
- Removed the ad-hoc "Peri-implantitis" relabel of the periodontal-modifier checkbox (superseded by the dedicated axis).
### Migration
- Payload version 2.6 (imports 1.4–2.5 accepted). On import, an implant that carried the inflammation or periodontal modifier becomes peri-implant mucositis (no bone-loss grade is invented).

## [1.19.0] - 2026-07-11

### Changed
- **Merged Pulp/Endo status selector**: the endodontic-treatment (`endo`) and pulp-diagnosis (`pulpDx`) pickers are now one control; a root-treated tooth (`endo != none`) no longer carries a vital pulp diagnosis — the two fields are mutually exclusive, and on such a tooth `pulpDx` is normalized to `normal` with the diseased-pulp glyph suppressed.
- **Merged "Root and periodontium" card**: the separate "Root" and "Periodontium and inflammations" panels are consolidated into a single card.
- **Periapical lesion subtype reduced to granuloma/cyst**: the redundant "abscess" subtype is dropped (it is already covered by the apical diagnosis); the subtype selector (`none` / `granuloma` / `cyst`) is now shown only under symptomatic or asymptomatic apical periodontitis.
- **Reversible pulpitis** now renders a reduced pulp glyph.
- **Retired the duplicate "periapical inflammation" toggle** on present teeth; the apical diagnosis alone drives the periapical glyph.

### Migration
- JSON/FHIR export payload version bumped to **2.5**; imports still accept legacy 1.4–2.4 payloads and migrate them automatically. On import, a treated tooth's pulp diagnosis is normalized to `normal`, and a legacy `abscess` periapical-lesion subtype is dropped — folded into the apical diagnosis when the tooth carries the inflammation modifier, otherwise cleared, since the apical diagnosis already covers abscess.

## [1.18.0] - 2026-07-11

### Added
- **CARS 0–6 score names**: the secondary-caries picker now shows descriptive ICDAS-based names (Sound, First visual change in enamel, Distinct visual change in enamel, Localized enamel breakdown, Underlying dentin shadow, Distinct cavity, Extensive cavity) instead of raw numbers.
- **Root-caries severity opacity**: the `caries-root` artwork layer now renders at an opacity driven by `rootCaries` (`active` 0.5 / `arrested` 0.7 / `active-cavitated` full), instead of a flat opacity regardless of severity.
- **Fillings-panel subcaries summary line**: a line below the filling controls lists any selected tooth with recurrent (subcaries) caries and its surfaces, e.g. "36 (O) has subcaries set on its filling."
- **Anterior "incisal" surface label**: incisors and canines now label their occlusal surface "incisal" throughout the UI (picker, popup, summaries/tooltips); the stored surface key is unchanged (`occlusal`).
- **Contextual per-surface caries popup**: the surface-depth popup now shows only the severity group relevant to the surface's current state (the primary ICDAS-depth group on an unfilled surface, the CARS group on a filled one), instead of always showing both.

### Changed
- **Unified caries severity field**: the separate SP5 ICDAS-depth (`cariesDepths`) and CARS (`secondaryCaries`) fields are replaced by a single per-surface `cariesSeverity` (0–6), read as ICDAS depth on a primary (unfilled) surface and as a CARS score on a recurrent (filled) one. JSON/FHIR export payload version bumped to **2.4**; imports still accept legacy 1.4, 2.0, 2.1, 2.2, and 2.3 payloads and migrate them automatically.

### Fixed
- **Caries/subcaries is now a proper per-surface state machine**: recurrent caries renders the `subcaries-{surface}` layer at the surface's CARS severity and is no longer settable alongside primary caries on the same surface — a surface is always exactly one of primary caries, recurrent (subcaries), or sound, eliminating the previous ambiguity where both a `caries-{surface}` and a derived recurrent state could coexist.

## [1.17.0] - 2026-07-11

### Added
- **Root caries** clinical axis (`rootCaries`): none / active / arrested / active-cavitated — wires the previously dormant `caries-root` artwork layer on a present tooth's main-view templates.
- **Stored secondary (recurrent) caries score** (`secondaryCaries`): a per-surface CARS 0–6 score, rendered as the `subcaries-{surface}` layer's opacity (`0.30 + (score-1)/5 × 0.70`) — replaces the old render-time derivation from `caries ∩ fillingSurfaceMaterials`.
- **Radiographic caries depth** (`radiographicDepth`): a per-surface none / E1 / E2 / D1 / D2 / D3 finding, independent of the visual ICDAS depth scale — surfaced as a `data-radio` badge attribute on the surface indicator, and round-trips through FHIR via its own `radiographic-caries-depth` Observation.
- **Three caries granularity settings** (`secondaryCariesMode`, `rootCariesMode`, `radiographicDepthMode`) plus `cariesDepthEnabled`, letting the picker UI collapse each scale to a simpler view without losing the underlying stored value.
- **Tabbed Settings modal** (General / Caries / Secondary caries / Pulpa / Notes), replacing the previous flat settings dropdown.

### Changed
- JSON export payload bumped to **version 2.3**; imports still accept legacy 1.4, 2.0, 2.1, and 2.2 payloads and migrate them automatically (a migrated `caries ∩ fillingSurfaceMaterials` surface is promoted to the canonical "moderate" `secondaryCaries` score of 3, unless a stored score is already present).
- Secondary (recurrent) caries is now a **stored, scored** clinical finding (`secondaryCaries`), not derived at render/summary time from `caries ∩ fillingSurfaceMaterials`.

## [1.16.0] - 2026-07-11

### Added
- **AAE pulp diagnosis** clinical axis (`pulpDx`): normal / reversible pulpitis / irreversible pulpitis / necrosis — replaces the retired `pulpInflam` boolean, with a byte-identical SVG render for the migrated "inflamed pulp" case (on both permanent and milk-tooth branches).
- **Practical-Latin pulp subtypes** (`pulpLatin`): pulpa sana, hyperaemia pulpae, pulpitis acuta serosa/purulenta, pulpitis chronica clausa/ulcerosa/hyperplastica, necrosis pulpae, gangraena pulpae — surfaced through a new 3-level **pulp detail setting** (`pulpDetailLevel`: `simple` / `aae` / `latin`, default `aae`) that collapses the pulp picker to the appropriate vocabulary; `getPulpDetailLevel()`/`setPulpDetailLevel()` public API.
- **Apical diagnosis** clinical axis (`apicalDx`): normal / symptomatic apical periodontitis / asymptomatic apical periodontitis / acute apical abscess / chronic apical abscess / condensing osteitis — now drives the periapical glyph directly on a present tooth.
- **Root resorption type** (`resorptionType`): internal / external-cervical — replaces the retired `rootResorption` boolean, with a byte-identical SVG render (including the `inflammationHome` z-order lift when combined with an apical diagnosis).

### Changed
- JSON export payload bumped to **version 2.2**; imports still accept legacy 1.4, 2.0, and 2.1 payloads and migrate them automatically (`pulpInflam` → `pulpDx`, `rootResorption` → `resorptionType`, `mods.inflammation`/`periapicalType` → `apicalDx`).
- The periapical glyph is now driven by the `apicalDx` diagnosis axis, decoupled from the `mods.inflammation` modifier (existing `mods.inflammation` payloads still migrate to an equivalent `apicalDx` value; render is byte-identical for migrated states).
- The legacy `pulpInflam` and `rootResorption` boolean clinical axes are retired from the live state model (kept only as a read-only input-side migration path for legacy payloads).

## [1.15.0] - 2026-07-11

### Added
- New **`prosthesis`** clinical axis (healing-abutment / locator / locator-denture / bar / bar-denture / removable-partial / removable-full), orthogonal to `restorationType`×`restorationMaterial`, surfaced with a "Kivehető:" prefix in the combined restoration dropdown. Covers implant attachments (healing abutment, locator, bar, with or without an overdenture) and tooth-supported removable partial/full dentures — replacing the legacy `crownMaterial`/`bridgeUnit` attachment and removable values field-for-field (byte-identical render).
- **Implant fixed crowns** now join the `restorationType`×`restorationMaterial` model: implants are no longer gated away from crown/bridge restoration options, and render via composition (`{material}-{type}` layers) plus an implant connector layer, with `metal` migrating to `metal-ceramic` for implants too.
- Multi-tooth **bridge-span overlay**: consecutive bridge teeth (`restorationType: "bridge"` or `bridgePillar`) within one arch now render a single continuous gum-line saddle across the inter-tooth gaps, drawn as an engine-owned `<svg>` over the tooth grid. The overlay is purely presentational (derives spans from existing tooth state; no new state field), repositions on resize, and is included in SVG/PNG/JPG export.
- **Crown marginal-leakage toggle**: a new `crownLeakage` boolean clinical axis + tooth-editor checkbox, shown only for a crown or bridge restoration, activating the previously dormant `crown-leakage` artwork layer. Round-trips through FHIR export/import (`crown-leakage` finding) like any other boolean axis.

### Changed
- JSON export payload bumped to **version 2.1** (adds `prosthesis`, drops `crownMaterial`/`bridgeUnit`); imports still accept legacy 1.4 and 2.0 payloads and migrate them automatically (implant `crownMaterial` fixed crowns → `restorationType`+material; attachment/removable `crownMaterial`/`bridgeUnit` values → `prosthesis`).
- FHIR export now emits a `prosthesis` coding in place of the dropped attachment/removable `crown-material`/`bridge-unit` codings, restoring round-trip fidelity for implant attachments (locator/bar/healing-abutment) that SP3a had dropped from FHIR; implant crowns round-trip via the existing `restoration-type`/`restoration-material` codings.
- The legacy `crownMaterial`/`bridgeUnit` fields are fully retired from state, serialization, and the value-map registry (kept only as a read-only input-side migration path for legacy payloads).

### Fixed
- **Invalid restoration type/material combinations are now corrected on import**: a hand-edited or imported payload that pairs a restoration type with a material it doesn't support (e.g. an inlay in metal) is coerced to that type's first valid material (or dropped to no restoration if the type itself carries none), and a warning is surfaced — instead of silently persisting a combination the renderer would have drawn nothing for.
- **Implant fixed crowns from 2.0-format payloads are no longer silently dropped on import**: an implant crown serialized by an intermediate build as `{restorationType:"none", crownMaterial:<material>}` now correctly folds into `restorationType:"crown"` + that material (with `metal` → `metal-ceramic`), instead of vanishing.
- The combined restoration dropdown now actually lists the **"Kivehető:" (removable) `prosthesis` entries** (implant attachments for an implant tooth; removable partial/full dentures for a gap) and writes the `prosthesis` axis when one is chosen — previously only the "Fix:" half was wired and the removable prefix was unused.
- Selecting a "Kivehető:" prosthesis or a fixed restoration now keeps the two axes mutually exclusive (a tooth has **either** a fixed restoration **or** a prosthesis); import also enforces this coherence (restoration wins if a crafted payload sets both).
- **Stale `crownLeakage` is now cleared** when a restoration changes away from crown/bridge, preventing an orphaned `crown-leakage` finding on a non-crown tooth.

## [1.14.0] - 2026-07-11

### Added
- Two-dimensional restoration model: `restorationType` (crown/inlay/onlay/veneer/bridge) × `restorationMaterial` (e.max/gold/gradia/zirconia/metal/metal-ceramic/telescope/temporary), replacing the flat `crownMaterial` enum as the clinical axis.
- New `toothSubstrate` axis (natural/radix/broken/crownprep) describing the tooth's underlying structure, independent of any restoration placed on it.
- Gold, Gradia, and metal-ceramic (PFM) restoration materials, and inlay/onlay/veneer restoration types, wired from the previously dormant v2.5 artwork into charting.
- Combined, low-click restoration dropdown (type × material in a single control) in the tooth editor.
- Groundwork for crown-marginal-leakage findings (new axis values only; UI is not wired yet — deferred to a later stage).

### Changed
- Legacy `metal` crowns and bridges now migrate to `metal-ceramic` (PFM) on load; the pre-existing full-cast look is now the distinct `metal` restoration material.
- JSON export payload bumped to **version 2.0**; imports still accept legacy 1.4 payloads and migrate them automatically.
- FHIR export now emits `restoration-type` / `restoration-material` / `tooth-substrate` codings in place of the old `crown-material` coding.

### Removed
- The flat `crownMaterial` enum as a clinical axis (a legacy field of the same name is retained internally only to drive implant-attachment rendering, per the migration plan).

## [1.13.0] - 2026-07-11

### Changed
- Internal architecture: FHIR export/import, value validation, SVG clear-set + boolean-flag layer activation, and the stable UI option lists are now generated from a single declarative clinical-axis registry (`src/registry/`) instead of scattered ad-hoc maps. Behavior-preserving — the JSON payload (version 1.4) and FHIR output are byte-identical to 1.12.0, guarded by frozen parity goldens.

### Removed
- Dead code orphaned by the registry migration (unused SVG-group helpers, duplicated dependency literals, superseded `GROUPS` layer lists).

## [1.12.0] - 2026-07-11

### Changed
- Updated tooth SVG assets to artwork version 2.5.0 (new dental-material, orthodontic, planning, root-fracture, filling-defect and root-caries layers added as dormant layers; not yet wired into charting — see the architecture-constitution spec).

### Fixed
- Corrected the `inicisal` → `incisal` broken-crown layer-id typo across the engine and SVG assets.
- Fixed the `prosthesis-bridge-connector` → `prosthesis-connector` id in `16_occl.svg` so the removable-prosthesis connector renders in the occlusal view.

## [1.11.1] - 2026-07-10

Documentation accuracy and FHIR value-map consistency.

### Fixed
- Corrected the HL7 FHIR export claim in every README language variant (including
  the new pt-BR) and the CHANGELOG: the export emits local + ISO 3950 (permanent
  dentition) codings — SNOMED CT is not yet emitted (mapping planned). Aligned the
  `src/fhir/codesystems.ts` comments accordingly.

### Changed
- FHIR export: added the `crownprep` ("Prepared for crown") crown material to the
  local value map so it exports with a proper display; removed the obsolete
  `tooth-crownprep` tooth-selection value (it is now a crown material, not a base type).
- Extended the FHIR value-map test to cover `periapicalType`.
- `package.json` — version 1.11.0 → 1.11.1.

## [1.11.0] - 2026-07-10

Brazilian Portuguese (pt-BR) UI language.

### Added
- **Brazilian Portuguese (`pt-br`)** as a 9th UI language: full translation of every i18n key in `src/i18n/translations.ts`, added to the topbar language switcher (`LANGUAGE_OPTIONS` in `src/App.tsx`) and to the `Language` type. Localized `language.pt-br` display name added to all existing languages.
- New `lang/README-pt-br.md` (translated from the English README); the 🇧🇷 Português (BR) entry added to every README language switcher.

### Changed
- `package.json` — version 1.10.0 → 1.11.0.
- README language lists and API docs updated from `HU/EN/DE/ES/IT/SK/PL/RU` to include `PT-BR` across all languages.

## [1.10.0] - 2026-07-03

Tooth-information panel, dynamic subtitle, crown-prep type, SVG/z-order fixes, and a multilingual README overhaul.

### Added
- **Tooth information panel** — live textual summary of the whole chart: tooth counts, present/missing lists, and Caries (incl. secondary) / Fillings / Root canals / Prosthetics / Implants (only when present) / periodontal status. Shown by default; toggleable in the Settings menu. Plural-aware phrasing per language; refreshes live.
- New public API: `getOdontogramSummary()` (structured, localized summary) and `onStateChange(callback)` (subscribe to state changes; returns an unsubscribe function).
- Dynamic topbar subtitle reflecting the current language, numbering system, and light/dark mode.
- `crownprep` ("Prepared for crown") as a permanent-tooth crown material — moved from the Base dropdown into the Crown dropdown; mirrors the "broken" crown behavior and renders the crown-prep layer. Crown list reordered with `radix` first; default stays `natural` (Full crown).
- Standalone per-language README files under `lang/` (de, hu, it, sk, pl, ru); `README.md` keeps English + Spanish with a language switcher.
- ~40 new i18n keys × 8 languages (tooth-info panel, dynamic subtitle, implants, crown-prep label reuse).

### Changed
- Renamed the app to **React Advanced Odontogram** (from "…Editor Modul") across all languages.
- Re-normalized the tooth 14 SVG to the current layer format (typed periapical glyphs, calculus, subcaries, resorption, fissure sealing).
- Refined the Hungarian endodontic wording to precise clinical terms.
- CHANGELOG brought up to date (1.5.0–1.10.0); README rigorously reviewed to match current behavior.
- `package.json` — version 1.9.0 → 1.10.0.

### Fixed
- Global visibility toggles (wisdom/occlusal/bone/pulp/edentulous) and card collapse now use delegated listeners, so they survive React StrictMode's double mount instead of cancelling themselves out — this also restored the periodontal/periapical inflammation buttons.
- Inflammation glyph z-order: when `endo-resection` and/or `endo-resorption` is active together with an inflammation glyph, the inflammation group is lifted above the tooth group (keeping the lower-tooth mirror transform) so the glyph stays visible.
- Calculus row spacing in its default state; no tooth-base gloss on broken/radix crowns.

## [1.9.0] - 2026-07-01

Unified topbar icon row and optional ICDAS II caries scoring.

### Added
- Unified topbar icon row with a Settings menu (numbering, notes, ICDAS, tooth information).
- Optional **ICDAS II** per-surface caries scoring (0–6) via the `enableIcdas` prop / Settings toggle, with a numeric badge on scored surfaces; included in FHIR export.

### Changed
- Consolidated the topbar controls (intro, language, dark mode, settings, export, import) into a single icon row.

## [1.8.0] - 2026-06-30

Clinical marking layers, native SVG export, and per-surface caries depth.

### Added
- Clinical marking layers (v2.1.4 tooth SVGs): calculus, root resorption, secondary (recurrent) caries, and typed periapical lesions (granuloma / cyst / abscess).
- Per-surface caries depth (superficial / dentin / deep) with a depth selector and popup.
- Native SVG export of the chart; PNG/JPG now rasterize from the vector SVG.

### Fixed
- Lesion type options and filling cross size; clearer note icon; persistent note icon after tooth-number refresh; calculus toggle id collision.

## [1.7.0] - 2026-06-23

Export/Import dropdowns, FHIR import, progress overlay, intro tour, and periapical lesion types.

### Added
- Consolidated Export dropdown (Status JSON / FHIR / PNG / JPG) and an Import dropdown with status/FHIR routing.
- HL7 FHIR R4 import — parse self-produced FHIR Bundles back into chart state (round-trip).
- Phased progress overlay during image export.
- 12-step interactive intro tour.
- Periapical lesion entity type (granuloma / cyst / abscess).

## [1.6.0] - 2026-06-20

Cross-surface selection UI, mixed fillings, and PNG/JPG export.

### Added
- Cross/plus surface selection UI (B/M/O/D/L) for caries and fillings.
- Per-surface restoration materials (mixed fillings, e.g. buccal amalgam + distal composite); JSON schema 1.4 + FHIR support.
- Engine PNG/JPG export of the odontogram.

### Fixed
- Molar filters now include all molars; hide `tooth-base-beauty` gloss on implants.

## [1.5.0] - 2026-06-14

HL7 FHIR R4 export, MIT license, and English default language.

### Added
- **HL7 FHIR R4 export** — a collection Bundle of per-tooth Observations, ISO 3950 tooth coding for permanent dentition, and a local code system (SNOMED CT mapping planned).
- MIT LICENSE file (resolves #7).

### Changed
- Default UI language set to English.
- README completed with FHIR export documentation.

## [1.4.2] - 2026-03-22

Per-tooth notes with double-click editor, label icons, and JSON export/import.

### Added
- **Per-tooth notes system**
  - `note` field added to tooth state model (string, empty by default)
  - Double-click a tooth tile to open the note editor popover
  - Note editor positioned near the tooth tile with viewport clamping
  - Save and Delete buttons in the popover
  - Note icon (📝) displayed next to the tooth number in label cells
  - Note text included in hover tooltips with 📝 prefix
  - Notes included in JSON export/import (optional field, only when non-empty)
  - Touch support: "Note" button added to the zoom popover on touch devices
  - Read-only mode guard: note editor does not open in read-only mode
- New `enableNotes` prop on the `App` component (default `false` — opt-in)
- New `setNotesEnabled(value)` / `getNotesEnabled()` exported API functions
- 4 new i18n keys (`note.title`, `note.save`, `note.delete`, `note.placeholder`) × 8 languages = 32 new translations
- 2 new tests in `a11y.test.ts` for note i18n validation — total 163 tests across 9 files

### Changed
- JSON export/import version bumped from 1.2 to 1.3 (backward compatible — `note` field is optional)
- `src/odontogram.ts` — `note` in `defaultState()`/`serializeState()`/`hydrateState()`, `showNoteEditor()`/`hideNoteEditor()` functions, `dblclick` handler in `addTile()`, note button in zoom popover, `updateToothLabelNoteIcon()`, label icon refresh on import
- `src/App.tsx` — `enableNotes` prop, `setNotesEnabled`/`getNotesEnabled` imports and exports, sync useEffect
- `src/index.css` — note editor popover styles (`.odon-note-popover`, `.odon-note-backdrop`, `.odon-note-textarea`), note icon in label cells (`.tooth-note-icon`), dark mode overrides
- `src/i18n/translations.ts` — 32 new translation entries (4 keys × 8 languages)
- `src/__tests__/App.test.tsx` — mock updates for `setNotesEnabled`/`getNotesEnabled`
- `package.json` — version 1.4.1 → 1.4.2

## [1.4.1] - 2026-03-12

Keyboard accessibility (WCAG), read-only mode, and selection animations.

### Added
- **Keyboard accessibility (WCAG compliance)**
  - ARIA `listbox`/`option` roles on tooth grid and tiles
  - `aria-selected` attribute synced with selection state
  - `aria-multiselectable="true"` on the grid container
  - `aria-hidden="true"` and `tabindex="-1"` on decorative label rows
  - Enter/Space to toggle tooth selection
  - Arrow key navigation (Left/Right within row, Up/Down between upper/lower arches)
  - Escape to clear selection
  - `:focus-visible` outline styles in both light and dark mode
  - Wisdom teeth get `tabindex="-1"` and `aria-hidden` when hidden
- **Read-only mode**
  - New `readOnly` prop on the `App` component
  - New `setReadOnly(value)` / `getReadOnly()` exported API functions
  - When active: all click, touch, and keyboard interactions are disabled
  - Control panel is dimmed (`opacity: 0.5`, `pointer-events: none`)
  - Tooth tiles become non-interactive with `pointer-events: none`
  - All tiles get `tabindex="-1"` to remove from tab order
  - Useful for print, report, and view-only use cases
- **Selection animations**
  - Pulsing dashed border via `::after` pseudo-element (`odon-dash-pulse` keyframes)
  - Glowing `drop-shadow` effect on selected tooth SVGs (`odon-glow-pulse` keyframes)
  - Smooth `.25s ease` transitions for selection/deselection
  - Full dark mode support with separate keyframes (`odon-dash-pulse-dark`, `odon-glow-pulse-dark`)
  - `prefers-reduced-motion: reduce` support — static styles for motion-sensitive users
- New `readOnly.label` i18n key in all 8 languages (HU/EN/DE/ES/IT/SK/PL/RU)
- 7 new tests in `a11y.test.ts` — total 161 tests across 9 files

### Changed
- `src/odontogram.ts` — added `readOnly` state, `onToothKeydown()` handler, `navigateToTooth()` navigation, ARIA attributes in `addTile()`/`addLabelRow()`/`buildGrid()`/`updateSelectionUI()`/`updateToothTileVisibility()`, read-only guards in event handlers
- `src/App.tsx` — new `readOnly` prop, `setReadOnly`/`getReadOnly` imports and exports, sync useEffect
- `src/index.css` — selection animation keyframes and styles, focus-visible styles, read-only mode styles, dark mode overrides, prefers-reduced-motion media query
- `src/i18n/translations.ts` — 1 new key × 8 languages = 8 new translations
- `src/__tests__/App.test.tsx` — mock updates for `setReadOnly`/`getReadOnly`
- `package.json` — version 1.4.0 → 1.4.1

## [1.4.0] - 2026-03-10

Mobile touch UX interactions and custom SVG plugin system.

### Added
- **Mobile touch UX** (touch interactions)
  - Tap-to-zoom — touching a tooth displays a magnified SVG popover
  - Long-press (500ms) — context menu with tooth status summary
  - Pinch-to-zoom — two-finger zoom gesture on the tooth chart
  - Arch toggle navigation — switch between upper/lower arches on screens ≤600px
  - WCAG 44px touch targets via `@media (pointer: coarse)` media query
  - `touch-action: none` for precise gesture handling
  - 14 new i18n keys × 8 languages = 112 new translations (touch.zoom.*, touch.ctx.*, touch.arch.*, chart.hint.touch)
- **Custom SVG Plugin system** (`OdontogramPlugin`)
  - `OdontogramPlugin` type: `id`, `label`, `layer`, `renderSvg()`, optional `panelSection`
  - 3 layer priorities: `base` (z=0), `restoration` (z=3), `overlay` (z=6)
  - Plugin SVG injection into tooth `<g>` elements with z-index ordering
  - Per-tooth `customStates: Record<string, unknown>` for plugin data storage
  - State tooltip: displays all active statuses on tooth tiles
  - State validation with 5 rules — localized warnings for incompatible state combinations
  - JSON export/import version 1.1 → 1.2, with `customStates` support
  - 5 new warning keys × 8 languages = 40 new translations (warn.endoOnMissing, warn.fillingOnMissing, warn.crownReplaceNoCrown, warn.cariesOnMissing, warn.pillarNoCrown)
- 4 new public API functions: `registerPlugins()`, `setPluginState()`, `getPluginState()`, `getToothStateSummary()`
- New `plugins` prop on the `App` component
- `src/plugin.ts` — plugin type definitions (`OdontogramPlugin`, `PluginLayer`, `getQuadrant()`, `LAYER_Z`)
- 26 new tests in 2 files — total 154 tests in 8 files
  - `touch.test.ts` — 10 tests: touch i18n keys, placeholders, consistency
  - `plugin.test.ts` — 16 tests: `getQuadrant()`, `LAYER_Z`, plugin type, warning i18n keys
- `.warning-item` CSS styles (light + dark mode) for state validation warnings

### Changed
- `src/odontogram.ts` — touch event handlers, plugin overlay system, state tooltip, validation, JSON version 1.2
- `src/App.tsx` — `plugins` prop, plugin API exports (`registerPlugins`, `setPluginState`, `getPluginState`, `getToothStateSummary`)
- `src/i18n/translations.ts` — 152 new translation entries (14 touch + 5 warning keys × 8 languages), total 190+ keys per language
- `src/index.css` — touch UI styles (zoom popover, context menu, pinch zoom, arch toggle, WCAG targets) and warning styles
- `src/__tests__/App.test.tsx` — mock updates for new API exports
- `package.json` — version 1.3.0 → 1.4.0
- README.md — all 4 languages (EN/DE/ES/HU) updated with mobile UX and plugin system documentation

## [1.3.0] - 2026-03-09

Automated testing, API documentation, and custom theme configuration.

### Added
- **Vitest testing framework** — 128 tests in 6 files, full coverage of the public API
  - `numbering.test.ts` — FDI/Universal/Palmer conversion for all 32 adult + 20 deciduous teeth, edge cases
  - `translations.test.ts` — key consistency across all 8 languages, empty value checks, placeholder validation
  - `status_extras.test.ts` — 21 preset structure validations (arches, materials, teeth, overlaps)
  - `useI18n.test.ts` — `t()` translation function, language switching, listener system
  - `App.test.tsx` — rendering, controlled/standalone mode, dark mode, dropdowns
  - `theme.test.ts` — CSS custom property application, null/undefined handling
- **TypeDoc API documentation** — JSDoc comments on all exported types and functions
  - `typedoc.json` configuration with GitHub Pages support
  - `npm run docs` script to generate `docs/` directory
- **Theme configuration system** (`OdontogramThemeConfig`)
  - 8 color properties: `background`, `panel`, `card`, `text`, `muted`, `line`, `accent`, `accent2`
  - CSS custom properties (`--odon-*`) with fallback system — works with both Tailwind and vanilla CSS projects
  - New `themeConfig` prop on the `App` component
  - `applyThemeConfig()` utility function for runtime color overrides
  - Dark mode and theme config are fully compatible
- New npm scripts: `test`, `test:watch`, `test:coverage`, `docs`

### Changed
- `src/App.tsx` — new `themeConfig` prop, `OdontogramThemeConfig` export, `.odontogram-root` wrapper div for CSS custom properties
- `src/index.css` — CSS variables rewritten to `var(--odon-*, fallback)` format, new `.odontogram-root` and `.dark .odontogram-root` selectors
- `src/theme.ts` — new file: `OdontogramThemeConfig` type and `applyThemeConfig()` function
- `src/odontogram.ts` — JSDoc comments for public API functions (`initOdontogram`, `destroyOdontogram`, `setNumberingSystem`, `clearSelection`, `setWisdomVisible`, `setShowBase`, `setOcclusalVisible`, `setHealthyPulpVisible`)
- `src/i18n/translations.ts` — JSDoc comments for `Language` type and `translations` object
- `src/i18n/useI18n.ts` — JSDoc comments: `t()`, `getI18nLanguage()`, `setI18nLanguage()`, `onI18nChange()`, `useI18n()`
- `src/utils/numbering.ts` — JSDoc comments: `NumberingSystem` type, `toLabel()` function with examples
- `src/status_extras.ts` — JSDoc comment for `STATUS_EXTRAS` object
- `vitest.config.ts` — new file: Vitest configuration with jsdom environment
- `package.json` — version 1.2.0 → 1.3.0, new dev dependencies (vitest, @testing-library/react, @testing-library/jest-dom, jsdom, typedoc)

## [1.2.0] - 2026-03-06

Dark mode support with standalone and controlled integration modes.

### Added
- **Dark mode** — full light/dark theme switching with comprehensive CSS overrides for all UI elements
  - New toggle button in the topbar (sun/moon icon) placed between the language selector and numbering system selector
  - **Standalone mode**: omit `darkMode` prop — the component manages its own theme state, toggling the `.dark` class on `<html>`
  - **Controlled mode**: pass `darkMode` and `onDarkModeChange` props to let the parent application control the theme
- New component props: `darkMode?: boolean`, `onDarkModeChange?: (dark: boolean) => void`
- Dark mode i18n labels (`theme.light` / `theme.dark`) for all 8 supported languages (HU/EN/DE/ES/IT/SK/PL/RU)
- 40+ dark theme CSS overrides: topbar, chart header, panel, cards, buttons, inputs, selects, tooltips, scrollbars, tooth labels, selection filters, status presets, and all interactive elements
- `.btn-theme` CSS class for the dark mode toggle button styling

### Changed
- `src/App.tsx` — added dark mode state management (internal + controlled), toggle button rendering with sun/moon SVG icons, `.dark` class lifecycle management
- `src/index.css` — added `.dark` block with comprehensive CSS overrides for all color-sensitive selectors
- `src/i18n/translations.ts` — added `theme.light` and `theme.dark` translation keys for all 8 languages
- README.md updated with dark mode integration instructions, component props table, and topbar description in all 4 documentation languages (EN/DE/ES/HU)

## [1.1.0] - 2026-03-03

Multi-language expansion and README overhaul.

### Added
- 5 new UI languages: Spanish (ES), Italian (IT), Slovak (SK), Polish (PL), Russian (RU) — total: 8 languages
- Flag emojis (🇭🇺🇬🇧🇩🇪🇪🇸🇮🇹🇸🇰🇵🇱🇷🇺) in language switcher for each language
- 162 translation keys per language (previously 157, extended with `language.es/it/sk/pl/ru`)
- README sections in 4 languages: English, German, Spanish, Hungarian
- Download, version, license, React, and TypeScript badges in README
- Emoji-enhanced section headers throughout README
- CHANGELOG.md version tracking

### Fixed
- Dropdown localization bug: crown, bridge unit, endo, filling, and mobility select elements now properly update their labels when switching languages (previously only `toothSelect` and `statusExtraSelect` were refreshed)

### Changed
- `Language` type extended from `"hu" | "en" | "de"` to `"hu" | "en" | "de" | "es" | "it" | "sk" | "pl" | "ru"`
- `LANGUAGE_OPTIONS` in App.tsx extended from 3 to 8 entries
- README.md fully rewritten (was EN+HU, now EN/DE/ES/HU with badges and emojis)
- I18n references updated from "HU/EN/DE" to "HU/EN/DE/ES/IT/SK/PL/RU" across all documentation

## [1.0.0] - 2026-02-21

First stable release of the React Advanced Odontogram — an interactive, SVG-based dental chart editor.

### Added

#### Core
- Interactive SVG-based odontogram with per-tooth visualization
- Multi-tooth annotation and selection system
- Topbar toggle controls for layer visibility
- Exposed selection controls API (start unselected by default)

#### Visual Layers
- Crown replace, crown needed, missing closed
- Radix, endo-filling-incomplete, parapulpal pin
- SVG assets moved to src with asset-import based build

#### Integration
- Submodule-ready architecture for embedding in parent projects
- Vite + React + TypeScript build pipeline
- Stable TypeScript build config with resolved type errors

#### Documentation
- English README with usage instructions
- ISO dental notation reference PDFs
- GitHub Pages support

### Fixed
- Odontogram init lifecycle and import handling
- Topbar toggle buttons duplicate click bindings

[1.11.1]: https://github.com/ZoliQua/React-Odontogram-Modul/compare/v1.11.0...v1.11.1
[1.11.0]: https://github.com/ZoliQua/React-Odontogram-Modul/compare/v1.10.0...v1.11.0
[1.10.0]: https://github.com/ZoliQua/React-Odontogram-Modul/compare/v1.9.0...v1.10.0
[1.9.0]: https://github.com/ZoliQua/React-Odontogram-Modul/compare/v1.8.0...v1.9.0
[1.8.0]: https://github.com/ZoliQua/React-Odontogram-Modul/compare/v1.7.0...v1.8.0
[1.7.0]: https://github.com/ZoliQua/React-Odontogram-Modul/compare/v1.6.0...v1.7.0
[1.6.0]: https://github.com/ZoliQua/React-Odontogram-Modul/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/ZoliQua/React-Odontogram-Modul/compare/v1.4.2...v1.5.0
[1.4.2]: https://github.com/ZoliQua/React-Odontogram-Modul/compare/v1.4.1...v1.4.2
[1.4.1]: https://github.com/ZoliQua/React-Odontogram-Modul/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/ZoliQua/React-Odontogram-Modul/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/ZoliQua/React-Odontogram-Modul/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/ZoliQua/React-Odontogram-Modul/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/ZoliQua/React-Odontogram-Modul/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/ZoliQua/React-Odontogram-Modul/releases/tag/v1.0.0
