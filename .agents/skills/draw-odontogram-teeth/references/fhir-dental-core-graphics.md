# FHIR Dental Core and Graphics Boundary

## Verify the published artifact and the local adapter

The current public verification source is the [FHIR Dental Core implementation guide](https://fhir.cognovis.de/dental-core/). It is a Trial Use publication and may change independently of this repository. Before mapping a new finding, verify the current published profile, value set, extension cardinality, and terminology binding there, then compare the result with the local adapter anchors in `src/fhir/dentalCoreContract.ts`, export behavior in `src/fhir/toFhirDentalCore.ts`, and registry metadata in `src/registry/axes.ts`.

Perform a capability and drift check, not an assumption: record the published artifact version or retrieval date, the local canonical URL/profile/value-set expectation, and whether the adapter can represent the requested identity, surface, and finding. A mismatch is `unmapped/drifting`; report it with the source value and reason for follow-up. Do not silently derive a code from an SVG ID, display label, or another code system.

## Semantic chain

| Concern | Semantic layer | Renderer layer |
|---|---|---|
| Tooth identity | FDI tooth-position coding and the engine tooth record | Selected template/view for that tooth |
| Surface-specific finding | Finding or assessment with repeatable tooth-surface qualifiers | Surface artwork or overlay only |
| Finding value and terminology | Published code/binding where admitted; text fallback where the adapter deliberately preserves unadmitted source content | Stable SVG group or leaf ID that activates graphics |
| Presentation | No geometry in FHIR | Paths, transforms, paint servers, visibility, and namespaces |

The FHIR `tooth-surfaces` extension is repeatable: emit one published surface code per extension instance when the current profile supports the finding. For example, the local adapter emits a surface-specific caries assessment only after it can map an engine surface to the HL7 FDI surface vocabulary and has the required ICDAS score. Other supported surface findings can be represented by the appropriate published profile or a `Dental Finding` profile, according to the checked artifact and adapter capability.

## Fail closed at the boundary

FHIR carries identity, observations, qualifiers, and terminology; it does not carry tooth paths, root proportions, view boxes, paint-server IDs, or renderer visibility rules. SVG layer IDs are renderer state and must never be exported as FHIR codes.

Use an admitted published code only when the current IG and local adapter both support it. When the IG accepts text for an unrepresented source assessment, preserve the exact source assessment as text through the adapter's established fallback. When no mapping is admitted, or a published artifact has drifted beyond local capability, report the concept as unmapped/drifting and stop the semantic mapping work until the adapter change is separately reviewed. Never invent FHIR codes, SNOMED concepts, surface codes, or geometry.
