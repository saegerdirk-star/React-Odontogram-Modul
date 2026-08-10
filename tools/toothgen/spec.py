"""Literature-referenced anatomy and display targets for tooth generation.

Raw ratios remain the clinical source values. ``display_targets`` derives the
screen representation by applying one root-length compression factor without
changing relative tooth-class dimensions.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class ToothSpec:
    key: str
    label: str
    source: str
    src_template: int
    root_frac: float
    width_frac: float
    roots: int
    length_rel: float = 1.0
    furc_frac: float = 0.0
    teeth: tuple[int, ...] = field(default=())
    note: str = ""
    # Take the root from another source template instead of converting this
    # one's root count. See tools/toothgen/graft.py.
    graft_root_from: int | None = None
    # A primary tooth is not a permanent tooth drawn smaller. It carries its own
    # measured proportions above, and `primary` additionally requests the two
    # shape changes that separate the dentitions and cannot be expressed as
    # numbers: a relatively larger pulp, and roots that diverge around the
    # permanent germ. `size_scale` is the overall reduction on top of that.
    size_scale: float = 1.0
    primary: bool = False


SPECS: list[ToothSpec] = [
    ToothSpec(
        key="11",
        label="Upper central incisor",
        source="Fig. 32a (p. 49)",
        src_template=11,
        root_frac=0.62,
        width_frac=0.27,
        roots=1,
        length_rel=0.87,
        teeth=(11, 21),
    ),
    ToothSpec(
        key="12",
        label="Upper lateral incisor",
        source="Fig. 35a (p. 51)",
        src_template=11,
        root_frac=0.65,
        width_frac=0.24,
        roots=1,
        length_rel=0.815,
        teeth=(12, 22),
        note="narrower with a relatively longer root than the central incisor",
    ),
    ToothSpec(
        key="31",
        label="Lower incisor",
        source="Fig. 38a (p. 52)",
        src_template=11,
        root_frac=0.68,
        width_frac=0.19,
        roots=1,
        length_rel=0.759,
        teeth=(31, 32, 41, 42),
        note="smallest tooth in the dentition, distinctly narrow",
    ),
    ToothSpec(
        key="13",
        label="Canine",
        source="Fig. 45a (p. 61)",
        src_template=13,
        root_frac=0.60,
        width_frac=0.27,
        roots=1,
        length_rel=1.0,
        teeth=(13, 23, 33, 43),
        note="longest root in the dentition",
    ),
    ToothSpec(
        key="14",
        label="Upper first premolar",
        source="Fig. 54a (p. 71)",
        src_template=14,
        root_frac=0.62,
        width_frac=0.30,
        roots=2,
        length_rel=0.833,
        furc_frac=0.55,
        teeth=(14, 24),
        note="only regularly two-rooted premolar (Fig. 62, section 2.3.3)",
    ),
    ToothSpec(
        key="15",
        label="Single-rooted premolar",
        source="Fig. 56a (p. 73) / Fig. 62a (p. 78)",
        src_template=14,
        root_frac=0.63,
        width_frac=0.29,
        roots=1,
        length_rel=0.815,
        teeth=(15, 25, 34, 35, 44, 45),
        graft_root_from=13,
        note="two-cusped crown from the premolar, root from the canine - the "
        "only drawn single root in the sources; synthesising one out of two is "
        "what produced the seam and the twin canals (odontogram-ay4)",
    ),
    ToothSpec(
        key="16",
        label="Upper first molar",
        source="derived from Fig. 70a and Fig. 3",
        src_template=16,
        root_frac=0.60,
        width_frac=0.40,
        roots=3,
        length_rel=0.741,
        furc_frac=0.58,
        teeth=(16, 26),
        note="no dedicated scan available; derived from the second molar and overview plate",
    ),
    ToothSpec(
        key="17",
        label="Upper second/third molar",
        source="Fig. 70a (p. 88)",
        src_template=16,
        root_frac=0.60,
        width_frac=0.38,
        roots=3,
        length_rel=0.722,
        furc_frac=0.62,
        teeth=(17, 18, 27, 28),
        note="roots are more convergent than on the first molar",
    ),
    ToothSpec(
        key="46",
        label="Lower molar",
        source="Fig. 76a (p. 95)",
        src_template=16,
        root_frac=0.62,
        width_frac=0.40,
        roots=2,
        length_rel=0.796,
        furc_frac=0.62,
        teeth=(36, 37, 38, 46, 47, 48),
    ),
]

SPEC_BY_KEY = {s.key: s for s in SPECS}


ROOT_DISPLAY_SCALE = 0.6


def display_targets(
    s: ToothSpec, root_scale: float | None = None
) -> tuple[float, float, float]:

    k = ROOT_DISPLAY_SCALE if root_scale is None else root_scale

    shrink = (1.0 - s.root_frac) + k * s.root_frac
    length_rel = s.length_rel * s.size_scale * shrink
    root_frac = k * s.root_frac / shrink
    width_frac = s.width_frac / shrink
    return length_rel, root_frac, width_frac


PRIMARY_SIZE_SCALE = 0.8

PRIMARY_PULP_SCALE = 1.05

PRIMARY_ROOT_SPREAD = 1.25

# The lower primary canine is not drawn separately. It is template 53 rendered
# about a tenth smaller, which is the observed difference between the arches and
# saves a template that would otherwise differ in nothing else.
PRIMARY_LOWER_CANINE_SCALE = 0.9


PRIMARY_SPECS: list[ToothSpec] = [
    ToothSpec(
        key="51",
        label="Upper primary central incisor",
        source="derived from 11, Bild 83 (overview)",
        src_template=11,
        root_frac=0.62,
        width_frac=0.27,
        roots=1,
        length_rel=0.87,
        size_scale=PRIMARY_SIZE_SCALE,
        primary=True,
        teeth=(51, 61),
    ),
    ToothSpec(
        key="52",
        label="Upper primary lateral incisor",
        source="derived from 12, Bild 83 (overview)",
        src_template=11,
        root_frac=0.65,
        width_frac=0.24,
        roots=1,
        length_rel=0.815,
        size_scale=PRIMARY_SIZE_SCALE,
        primary=True,
        teeth=(52, 62),
    ),
    ToothSpec(
        key="53",
        label="Primary canine",
        source="Bild 89 (p. 111) / Bild 90 (p. 112) + Bild 83",
        src_template=13,
        root_frac=0.62,
        width_frac=0.30,
        roots=1,
        length_rel=1.0,
        size_scale=PRIMARY_SIZE_SCALE,
        primary=True,
        teeth=(53, 63, 73, 83),
        note="one drawing for both arches; the lower is rendered at "
        "PRIMARY_LOWER_CANINE_SCALE",
    ),
    ToothSpec(
        key="54",
        label="Upper first primary molar",
        source="Bild 91 (p. 113) + Bild 83",
        src_template=14,
        root_frac=0.60,
        width_frac=0.36,
        roots=3,
        length_rel=0.741,
        size_scale=PRIMARY_SIZE_SCALE,
        primary=True,
        teeth=(54, 64),
        note="three-rooted like every upper primary molar, unlike the "
        "two-rooted permanent premolar it is built from",
    ),
    ToothSpec(
        key="55",
        label="Upper second primary molar",
        source="Bild 83 (overview) + derived from 16",
        src_template=16,
        root_frac=0.60,
        width_frac=0.41,
        roots=3,
        length_rel=0.775,
        size_scale=PRIMARY_SIZE_SCALE,
        primary=True,
        teeth=(55, 65),
    ),
    ToothSpec(
        key="71",
        label="Lower primary incisor",
        source="derived from 31, Bild 83 (overview)",
        src_template=11,
        root_frac=0.68,
        width_frac=0.19,
        roots=1,
        length_rel=0.759,
        size_scale=PRIMARY_SIZE_SCALE,
        primary=True,
        teeth=(71, 72, 81, 82),
    ),
    ToothSpec(
        key="74",
        label="Lower first primary molar",
        source="Bild 93 (p. 117)",
        src_template=16,
        root_frac=0.69,
        width_frac=0.40,
        roots=2,
        length_rel=0.760,
        size_scale=PRIMARY_SIZE_SCALE,
        primary=True,
        teeth=(74, 84),
        note="root fraction read off Bild 93 by Dirk on 2026-08-10: the cervix "
        "runs as a wavy line and he takes 31% of tooth height as its mean, so "
        "the root is 0.69 - it was 0.62, derived from the permanent lower "
        "molar, which put the cervix at 38% where the photograph already shows "
        "the furcation. That parent was the mistake: the same page states that "
        "the SECOND primary molar is the scaled-down permanent molar, which is "
        "why 75 keeps it and this one does not",
    ),
    ToothSpec(
        key="75",
        label="Lower second primary molar",
        source="p. 117 section 3.4.3.2 + derived from 46",
        src_template=16,
        root_frac=0.62,
        width_frac=0.41,
        roots=2,
        length_rel=0.796,
        size_scale=PRIMARY_SIZE_SCALE,
        primary=True,
        teeth=(75, 85),
        note="the text on that page states it outright - the lower second "
        "primary molar is the scaled-down lower first permanent molar - so "
        "this one keeps 46 as its parent where 74 must not. Bild 94 itself "
        "was not supplied; the citation is the text, not the plate",
    ),
]

PRIMARY_SPEC_BY_KEY = {s.key: s for s in PRIMARY_SPECS}


def tooth_to_template() -> dict[int, str]:

    out: dict[int, str] = {}
    for s in SPECS:
        for t in s.teeth:
            out[t] = s.key
    return out


def check_coverage() -> list[int]:

    all_teeth = [q * 10 + i for q in (1, 2, 3, 4) for i in range(1, 9)]
    have = tooth_to_template()
    return [t for t in all_teeth if t not in have]


def primary_coverage() -> list[int]:

    all_teeth = [q * 10 + i for q in (5, 6, 7, 8) for i in range(1, 6)]
    have = {t for s in PRIMARY_SPECS for t in s.teeth}
    return [t for t in all_teeth if t not in have]


def _report(specs: list[ToothSpec], missing: list[int], title: str) -> None:
    print(
        f"{title}: {len(specs)} templates, "
        f"{sum(len(s.teeth) for s in specs)} teeth assigned"
    )
    for s in specs:
        print(
            f"  {s.key:3s} {s.label:32s} {s.roots} roots  root fraction {s.root_frac:.0%}"
            f"  relative length {s.length_rel:.2f}  <- {s.source}"
        )
    print("  missing teeth:", missing or "none")


if __name__ == "__main__":
    _report(SPECS, check_coverage(), "Permanent")
    print()
    _report(PRIMARY_SPECS, primary_coverage(), "Primary")
