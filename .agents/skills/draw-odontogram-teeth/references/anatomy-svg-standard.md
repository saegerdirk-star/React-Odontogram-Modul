# Anatomy and SVG Authoring Standard

## Scope and evidence

Use this standard only for the repository's tooth templates. Start with a cited clinical source or a supplied clinical review for the requested FDI tooth, dentition, view, and eruption or root-development state. Record clinical facts separately from display decisions: proportions, stroke widths, and view-box placement serve legibility and are not anatomy claims.

Permanent and primary dentitions are distinct templates. A primary tooth is not a uniformly scaled permanent tooth: use its own crown proportions, cervical constriction, root divergence, root length, and furcation placement. Identify the crown landmarks that distinguish the requested class before drawing: incisal edge or cusp pattern, contact regions, cervical line, root trunk, root count, root separation, and apices.

## Construct anatomy deliberately

1. Define a symmetric reference axis and crown landmarks for the requested view; mirror only where the clinical tooth class permits it.
2. Draw the outer crown and each outer root contour as anatomy. Root topology includes count, emergence from the cervical/root-trunk region, divergence, convergence, and terminal apices.
3. Draw canal or lumen paths independently inside the root contours. Endodontic material is a separate clinical overlay; neither a canal nor a filling may substitute for an outer root contour.
4. Keep the periodontal anchors coherent with the anatomy: crown-neck transition, bone contour, gum contour, root exposure, and apical space must keep their established relative positions.
5. Confirm orientation against the renderer's template/view convention before finalizing mesial, distal, buccal, lingual, palatal, occlusal, or incisal-facing artwork.

## Preserve the SVG contract

Inspect the target template and its focused tests before editing. Keep stable clinical layer IDs and group structure unless the renderer, registry, and tests are changed through separate work. Existing dormant clinical leaves must remain hidden by default; container groups that the renderer activates must not be hidden in a way that prevents descendants from displaying.

Keep paint servers, clip paths, masks, filters, markers, and referenced IDs instance-safe. Reused templates need distinct or renderer-namespaced IDs so `url(#...)` references cannot collide across teeth. Preserve transforms and view-box conventions under the owning generator or source template. Do not use a filename, renderer layer ID, or CSS selector as clinical terminology.

## Generator and verification discipline

Check whether `tools/toothgen` exists before relying on it. This checkout has no `tools/toothgen`; do not claim that it does. In a checkout that supplies it, treat its specification and deterministic build/verification steps as the owner of generated output: change the declared source inputs, regenerate, and do not hand-edit the generated SVG.

For any authored or regenerated template, verify the focused asset and layer checks, inspect the rendered orientation and hidden defaults, and compare deterministic fingerprints or round-trip output when repository tooling provides them. Add or update focused tests for a changed contract. Keep renderer graphical layers separate from the semantic mapping decision in the next reference.
