# Tooth template generator

This toolchain produces the tooth artwork the odontogram mounts: sixteen
permanent side views (11-18, 41-48) and sixteen occlusal views, one drawing per
position. Nothing is shared across the jaws — a lower molar is its own drawing,
not an upper one turned upside down.

## Two stages, two contracts

The chain has two stages, and the distinction matters for what each check
guarantees.

**`build.py` (+ `occlusal.py`) generates the DONORS** into `spender/`, from the
four canonical source drawings in `source/`. A donor carries the ~200 registered
clinical layers — caries, restorations, pulp, periodontal artwork, implants,
tissue layers, plan overlays — all warped together with the contour so they stay
registered. `spender/` is not versioned; it is reproducible at any time with
`npm run toothgen:spender`.

**`redraw_alle.py` / `redraw_occl.py` produce what ships.** They insert a
hand-drawn contour and pulp from `zeichnungen/` into the donor. The rule the
whole chain follows: *what is drawn gets inserted; only what nobody draws is
warped.* `redraw_plan.py` holds the target → drawing → donor tables and nothing
else, so a check never has to import a generator.

`fillings.py`, `gum.py`, `hoecker.py`, `fuellflaechen*.py`, `kauflaechen.py` and
`halsbaender.py` derive the surfaces a finding is charted on — the mesial,
distal, occlusal/incisal, buccal and lingual filling and caries areas, the
cervical bands, and the occlusal fields along the fissures.

`zeichnungen/` holds the drawings the second stage reads. They are in the
repository on purpose: without them the geometry could be measured but the
artwork could not be re-derived, and being able to re-derive it is the point of
having a generator. Set `TOOTHGEN_ZEICHNUNGEN` to work from a directory
elsewhere.

## Anatomical contract

`spec.py` records the relative total length, root fraction, crown-width ratio,
root count, furcation position, FDI assignments, column width and source figure
for each template. These measurements are the clinical source of truth.

`crown_width` (outline extent) and `silhouette_width` (tooth material) are
DIFFERENT measurements and must not be swapped: a crown width is the first, the
root that has to hold a canal is the second.

`ToothSpec.col_px` is the grid column the tooth stands in. `verify.py`
cross-checks every one of them against `grid-template-columns` in
`src/index.css`, so the artwork and the chart grid cannot drift apart.

Every generated template has its own paint-server namespace. Clinical layer ids
deliberately remain identical across templates, because the renderer uses them
as its activation contract.

## Verification

```bash
npm run toothgen:verify     # all three contracts
```

which runs:

- **`verify.py`** — the DONOR contract. XML validity, root topology and ratios,
  clinical id/tag parity, the common occlusal plane, `col_px` against
  `src/index.css`, and frozen SHA-256 digests of every geometry-bearing
  attribute outside `defs`.
- **`verify_redraw.py`** — the SHIPPED contract, unchanged by the donor checks:
  layer inventory identical to the donor, one continuous contour, the lumen
  inside the root, the implant body not stretched, the gum drawn for the column
  the tooth actually stands in, and the occlusal plane on one line.
- **`check_roundtrip.py`** — parsing and identity serialization preserve every
  path within tolerance.

Running the chain twice must produce byte-identical SVG assets.

## Sources

The proportions were read off the plates in Schumacher's *Odontographie* — the
root fractions by counting cells of the plate's line grid — and the mesiodistal
crown widths are the standard mean diameters (Wheeler; Ash & Nelson), averaged
over the positions each template serves. `spec.py` records which figure each
template goes back to.

The drawings in `zeichnungen/` are original work. No plate is reproduced here.

The generated SVGs keep the `Created by Zoltan Dul in 2026` MIT header: the
registered clinical layers in every template come from the four source drawings
in this repository.
