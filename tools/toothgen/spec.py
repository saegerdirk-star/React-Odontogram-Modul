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
    length_rel = s.length_rel * shrink
    root_frac = k * s.root_frac / shrink
    width_frac = s.width_frac / shrink
    return length_rel, root_frac, width_frac


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


if __name__ == "__main__":
    missing = check_coverage()
    print(f"{len(SPECS)} templates, {sum(len(s.teeth) for s in SPECS)} teeth assigned")
    for s in SPECS:
        print(
            f"  {s.key:3s} {s.label:32s} {s.roots} roots  root fraction {s.root_frac:.0%}"
            f"  relative length {s.length_rel:.2f}  <- {s.source}"
        )
    print("missing teeth:", missing or "none")
