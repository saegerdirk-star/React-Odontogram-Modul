# Test Fixture: draw-odontogram-teeth

## Permanent template — maxillary central incisor

**Input:** Add a permanent FDI 11 facial template from reviewed anatomy.

**Expected behavior:** The workflow identifies permanent incisors as their own anatomy class, plans an outer single-root contour separately from its canal and endodontic overlays, and preserves existing renderer layer IDs, hidden defaults, orientation, and namespace rules.

**Pass criteria:** The change follows the anatomy reference and focused SVG asset/layer checks pass.

## Primary template — maxillary primary molar

**Input:** Add a primary molar template with its root topology.

**Expected behavior:** The workflow rejects uniform scaling of a permanent molar and captures primary crown proportions, cervical constriction, root divergence, root separation, and furcation placement as distinct anatomy.

**Pass criteria:** The template is backed by primary-dentition evidence and its outer roots remain distinct from canals and endodontic content.

## Surface-specific finding — caries on an FDI surface

**Input:** Map a scored buccal caries finding for FDI 16.

**Expected behavior:** The workflow checks the current IG and local adapter, uses one repeatable tooth-surface qualifier for the published FDI surface, and keeps the related SVG overlay as presentation-only.

**Pass criteria:** The mapping is supported by the published artifact and local capability, with no SVG ID reused as a FHIR code.

## Unmapped or drifting FHIR concept

**Input:** Map a new renderer layer whose requested finding lacks a local adapter mapping or differs from the current IG.

**Expected behavior:** The workflow records the artifact/local capability mismatch as `unmapped/drifting` and does not guess a code, terminology, surface, or geometry mapping.

**Pass criteria:** The result names the source concept and reason for follow-up without changing FHIR semantics as part of the SVG work.

## Machine-readable contract

```json
{
  "cases": [
    {
      "id": "permanent-template",
      "input": {"fdi": "11", "dentition": "permanent", "view": "facial"},
      "assertions": [
        {"path": "references/anatomy-svg-standard.md", "must_include": ["Permanent and primary dentitions are distinct templates.", "outer root contour", "canal or lumen", "hidden by default"]}
      ]
    },
    {
      "id": "primary-template",
      "input": {"fdi": "54", "dentition": "primary", "view": "facial"},
      "assertions": [
        {"path": "references/anatomy-svg-standard.md", "must_include": ["not a uniformly scaled permanent tooth", "cervical constriction", "root divergence", "furcation placement"]}
      ]
    },
    {
      "id": "surface-specific-finding",
      "input": {"fdi": "16", "surface": "buccal", "finding": "scored-caries"},
      "assertions": [
        {"path": "references/fhir-dental-core-graphics.md", "must_include": ["tooth-surfaces", "repeatable", "one published surface code per extension instance", "SVG layer IDs are renderer state"]}
      ]
    },
    {
      "id": "unmapped-drifting",
      "input": {"concept": "new-renderer-layer", "adapter_capability": "absent", "expected_outcome": "report-unmapped-drifting"},
      "assertions": [
        {"path": "references/fhir-dental-core-graphics.md", "must_include": ["report the concept as unmapped/drifting and stop", "Never invent FHIR codes"]}
      ]
    }
  ]
}
```
