# Changelog

## 2.14.0 - 2026-08-17

- **One tooth template per position.** The nine permanent side-view drawings and
  eight deciduous ones became 16 and 10 — every position in the upper and lower
  right quadrant now has its own contour and its own pulp, hand-drawn by Dirk
  Saeger and inserted rather than warped; the opposite side is still the same
  drawing mirrored. The occlusal set grew from four to fourteen. Templates
  `31`, `71`, `74`, `75` and `34_occl` are retired: 18 no longer draws itself as
  17, 43 no longer as an upper canine, the lower premolars no longer as 15, and
  the lower primary canine no longer as the UPPER one.
- Removed the two scale factors that existed only to make a borrowed drawing
  read as the position it stood in: the perio chart's lateral-incisor width
  factor (0.8) and the lower-primary-canine tile scale (0.9).
- Fixed the implant fixture stretching with the tooth it is set into — a
  manufactured part now follows the root rigidly, the same rule the root posts
  already had. On template 16 the body had been drawn at twice its length, which
  put the implant platform in the crown and with it the perio chart's
  `IMPLANT_CEJ_Y` anchor.
- Fixed the occlusal plane scattering across the arch: each template's frame is
  now sized so the DRAWN incisal/occlusal edge sits a fixed distance above it,
  and the gingiva is drawn against that edge instead of the frame's nominal one.
- Occlusal tiles carry their own `tpl-<n>-occl` class, so a side view's
  per-template size rule can no longer win on an occlusal tile of the same name.
- The occlusal and deciduous templates are loaded on demand instead of being
  compiled into every consumer's module graph.
- Reworked the arch spacing so neighbouring crowns meet at their contact points:
  every column is the tooth's own drawn mesiodistal crown width plus one uniform
  slack of 8 px. The slack is the same for all sixteen, so it cancels at every
  contact and the Class I canine relationship still falls out of the tooth widths
  alone. The previous columns came from the templates the redraw replaced, which
  left the incisors 27 px apart and the molars 14.
- Fixed the lower arch rendering quadrant 3 in quadrant 4: the lower drawings are
  quadrant 4 and are rotated 180 degrees into the template frame, which flips
  left/right along with top/bottom, so the render must not mirror them again.
- Fixed each template's frame being centred on the frame rather than on the
  tooth: the crown's widest point — the contact point — now sits in the middle of
  the frame, and the gingival papilla is placed on that same point. Crowns sat up
  to 7.4 px off centre, which made neighbours drift into each other once the
  columns were tight enough to show it.
- Occlusal views: each frame is cropped to the drawn surface, they all render at
  one height, and the gum/bone context is dropped from them entirely — it carries
  no finding there (nothing toggles it) and only covered the neighbouring tooth.
  The four premolar drawings are mirrored buccal/palatal.
- Fissures drawn by hand are now INSERTED rather than warped from the donor, into
  both `fissure` and `fissure-sealing-occlusal`, so the sealing still lies exactly
  on the fissure.
- **Pulp diagnosis and root treatment are now a COLOUR, not a second shape.** A
  diseased pulp used to swap in `tooth-inflam-pulp` — a separate outline from the
  donor template, with flame sublayers — which never matched the pulp the
  dentist drew, so the pulp changed shape when a diagnosis was set. The drawn
  pulp now stays and is tinted per `pulpDx` / `pulpLatin`; an endodontically
  treated tooth is tinted in the root-filling colour and wins over a diagnosis
  (a treated tooth has no vital pulp). **This deliberately breaks the SP4
  migration guarantee that `pulpDx` renders byte-identical to the retired
  `pulpInflam` boolean** — `pulp-parity.test.ts` states the new contract. Fill is
  not part of the SVG fingerprint, so the tint itself is parity-safe; the changed
  layer activation is what moves it.
- Fillings, caries, defects and the pulp are clipped to the tooth shape that is
  actually shown (`clip-path`), so nothing can be drawn past the tooth surface
  and the pulp stays enclosed on a prepared, broken or radix tooth. The clip id
  is namespaced per tooth — all 32 live in one document, so a shared id would
  clip every tooth to its neighbour's outline.
- Occlusal tiles are no longer rotated in either jaw, and the lower side-view
  drawings are mirrored rather than rotated into the template frame. Both
  rotations dated from when the lower artwork was borrowed from the upper jaw; a
  180° rotation flips left/right along with top/bottom and therefore swapped
  mesial and distal. Mesial now faces the arch midline in all four quadrants, in
  both views, checked against the anatomically named `filling-composite-*`
  layers.
- Hand-drawn fissure lines are INSERTED into `fissure` and
  `fissure-sealing-occlusal` instead of being warped from the donor, each path
  made absolute before the group's paths are joined (Inkscape writes a relative
  `m`, so every fissure after the first landed displaced).
- `tools/toothgen/hoecker.py` derives the cusps as regions from the drawn
  outline plus fissures, extending each free fissure end to the outline as an
  auxiliary line that is used for the subdivision but never shipped.
- `tools/toothgen/build.py` writes to `tools/toothgen/spender/` instead of
  `src/assets/teeth-svgs`: the generated Schumacher templates are now the
  donor stage that the redraw takes its ~200 clinical layers from, not the
  shipped artwork. `tools/toothgen/verify_redraw.py` is the contract for what
  ships; `verify.py` and its frozen digests keep measuring the donors unchanged.

## 2.13.1 - 2026-08-16

- Fixed the shared smoking-status Observation (LOINC 72166-2) to accept the LOINC LL2201-3 / IPS Current Smoking Status answer codes alongside the engine-local codes on both export and import, so a real practice record passes through unchanged; unmappable answers such as "smoker, current status unknown" stay rejected.

## 2.13.0 - 2026-08-15

- Added lossless Dental Core export/import for the IG carrier contract, including tooth and root caries, restorations, endodontic and diagnostic findings, periodontal and peri-implant findings, implant identity, treatment requests, assessments, and notes.
- Unblocked examination recorder and case examination date handling while requiring explicit references for host-owned diabetes, HbA1c, smoking, and edentulous resources.
- Exported the Dental Core canonical URL, profile map, package version, and CodeSystem URLs from `react-advanced-odontogram/fhir`.

## 2.12.2 - 2026-08-15

- Fixed Dental Core import/export to preserve host-owned resource IDs, version IDs, and bundle `fullUrl` values; relationships now resolve relative references and `fullUrl`, while new resources use transient `urn:uuid:` URLs without codec-owned persistent IDs.

## 2.12.1 - 2026-08-15

- Declared `@types/fhir` as a published dependency so TypeScript consumers receive
  the public `fhir/r4` declarations transitively.

## 2.12.0 - 2026-08-15

- **Breaking:** removed the deprecated predecessor FHIR adapter, including its
  generated artifacts, `react-advanced-odontogram/fhir` import and export APIs
  and types, tests, and documentation. This is an intentional internal
  `2.12.0` migration release; consumers must use the documented `legacy` or
  `dental-core` session codec contract.
- Added the generated Dental Core-only FHIR contract for
  `de.cognovis.fhir.dental.core#0.3.0`.
- Added immutable per-session FHIR codec configuration: standalone sessions use upstream-compatible `legacy`, and hosts can explicitly select generated Dental Core `de.cognovis.fhir.dental.core#0.3.0`.
- Routed programmatic and built-in FHIR import/export through the same active session codec; Dental Core accepts profile-admitted Aidbox collection Bundles and rejects lossy, malformed, or cross-codec data without replacing the chart.
