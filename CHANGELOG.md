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
