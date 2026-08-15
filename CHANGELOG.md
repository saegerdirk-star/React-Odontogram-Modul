# Changelog

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
- Fixed Dental Core import/export to preserve host-owned resource IDs, version IDs, and bundle `fullUrl` values; relationships now resolve relative references and `fullUrl`, while new resources use transient `urn:uuid:` URLs without codec-owned persistent IDs.
