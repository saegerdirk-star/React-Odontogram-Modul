# Changelog

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
