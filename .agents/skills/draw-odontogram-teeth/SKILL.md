---
name: draw-odontogram-teeth
description: >-
  use when: authoring or revising permanent or primary tooth and root SVG templates
  for this odontogram, including FHIR-Dental-DE mapping review; NOT for: changing
  clinical state, FHIR profiles, or general medical illustration; boundary: this
  repository-local skill preserves this renderer's SVG and adapter contracts.
requires_standards: [english-only, no-emoji, judge-layer]
compatibility: {}
metadata: {}
action_boundary:
  risk_class: reversible-write
  effect_type: filesystem
  proposal_schema: standard://judge-layer/proposals/action-proposal.v1
  judge: agent://judge-default
  requires_mandate: false
---

# Draw Odontogram Teeth

Produce provider-neutral, clinically grounded tooth SVG templates without breaking this odontogram's renderer or interoperability boundaries.

## Inputs

- Requested FDI tooth identity, dentition, view, and clinical evidence.
- Target asset, generator availability, and the proposed clinical finding or surface semantics.

## Outputs

- A generator-owned or explicitly authored SVG change with focused verification evidence.
- A mapping decision: supported, text-preserved, or reported as unmapped/drifting.

## Exclusions

- Do not change FHIR profiles, terminology bindings, engine state, or renderer behavior as part of drawing work.
- Do not treat an SVG layer ID as a clinical code or put SVG geometry in FHIR.

## Workflow

1. Read [the anatomy and SVG standard](references/anatomy-svg-standard.md); identify the tooth class and landmarks before editing.
2. Check for the repository generator before reuse, then retain generator ownership and verify its output contract.
3. Read [the FHIR-Dental-DE graphics boundary](references/fhir-dental-de-graphics.md) before any semantic mapping decision.
4. Apply the smallest template change, preserving registered layers, hidden defaults, namespaces, orientation, and periodontal anchors.
5. Run the repository's focused SVG checks and `quick_validate.py`; record unmapped or drifting concepts instead of guessing.

## Do NOT

- Hand-edit generated SVG output when a checked-in generator owns it.
- Reuse permanent anatomy for primary teeth, draw canals as external roots, or invent FHIR codes or geometry.

## Resources

| File | Purpose |
|---|---|
| `references/anatomy-svg-standard.md` | Clinical and renderer authoring standard. |
| `references/fhir-dental-de-graphics.md` | FHIR semantic boundary and drift procedure. |
| `tests/draw-odontogram-teeth.test.md` | Capability fixtures for this skill. |
| `quick_validate.py` | Deterministic local artifact validator. |
