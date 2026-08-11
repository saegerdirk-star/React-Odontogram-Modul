"""Verify generated anatomy, clinical contracts, and frozen authored geometry."""

from __future__ import annotations

import math
import re
import sys
import hashlib
import xml.dom.minidom as minidom
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import roots  # noqa: E402
from build import ASSETS, SOURCE, curve_extent, tooth_base_d  # noqa: E402
from spec import PRIMARY_SPECS, SPECS, display_targets  # noqa: E402

TOL_FRAC = 0.015
TOL_LEN = 1.0
TOL_OCCL = 0.15

# A canal may be no wider than this fraction of the root at the same height.
# Generous against LUMEN_HALF_FRAC on purpose: several lumen layers overlap at
# the chamber, and the check is here to catch a canal that fills its root, not
# to re-assert the generator's own constant.
TOL_LUMEN_WIDTH = 0.80

# Apical widening tolerated per quarter unit through the cervical region.
TOL_CERVICAL_STEP = 0.03

# Direction change tolerated along the root shaft, in degrees per unit of
# contour, with the apical tip excluded because a root tip turns sharply by
# nature. The drawn templates measure 3.8 to 8.5 here.
TOL_SHAFT_TURN = 15.0
TIP_EXCLUDED = 3.5


def shaft_turn(base_d: str, apex: float, cej: float, chord: float = 1.0):
    """The sharpest direction change along the root outline.

    A kink is a discontinuity in DIRECTION, not in width, and nothing here
    measured direction: the contour checks ask only whether the outline widens
    again apically. Template 15 passed all of them while a clinician read a kink
    straight off the chart, and a first attempt at repairing it passed them
    while making the outline visibly worse. Measured over a chord rather than
    between adjacent sampled points, because at point spacing a wobble of a
    twentieth of a unit reads as eighty degrees and nothing is learnt.
    """

    pts = roots._polylines(base_d)[0]
    walk = [pts[0]]
    run = 0.0
    for a, b in zip(pts, pts[1:]):
        run += ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2) ** 0.5
        if run >= chord:
            walk.append(b)
            run = 0.0

    worst, worst_at = 0.0, None
    for a, b, c in zip(walk, walk[1:], walk[2:]):
        if not (apex + TIP_EXCLUDED < b[1] < cej + 0.5):
            continue
        v1 = (b[0] - a[0], b[1] - a[1])
        v2 = (c[0] - b[0], c[1] - b[1])
        l1 = (v1[0] ** 2 + v1[1] ** 2) ** 0.5
        l2 = (v2[0] ** 2 + v2[1] ** 2) ** 0.5
        if l1 < 0.3 or l2 < 0.3:
            continue
        cosine = (v1[0] * v2[0] + v1[1] * v2[1]) / (l1 * l2)
        angle = math.degrees(math.acos(max(-1.0, min(1.0, cosine))))
        if angle > worst:
            worst, worst_at = angle, b[1]
    return worst, worst_at


def lumen_extremes(txt: str, base_d: str, apex: float, cej: float):
    """How far the lumen reaches past the apex, and how wide it gets.

    Nothing measured lumen before this: verify.py passed on assets in which the
    pulp stood outside the root apex on the canine and a canal came out wider
    than the root containing it. The guard did not fail, it did not look
    (odontogram-66a, odontogram-0ak).
    """

    subs: list = []
    roots._lumen_paths(txt, lambda d: subs.extend(roots._polylines(d)) or None)
    if not subs:
        return None, None

    base = roots._polylines(base_d)
    overhang = apex - min(p[1] for s in subs for p in s)

    widest = 0.0
    for i in range(1, 20):
        y = cej - (cej - apex) * i / 20
        lumen_spans = roots.spans_at(subs, y)
        base_spans = roots.spans_at(base, y)
        if not lumen_spans or not base_spans:
            continue
        base_w = sum(b - a for a, b in base_spans)
        if base_w > 0.2:
            widest = max(widest, sum(b - a for a, b in lumen_spans) / base_w)
    return overhang, widest


# Re-taken on 2026-08-10 for odontogram-66a: the lumen repair moves lumen `d`
# attributes on all nine templates, which is an intended, reviewed correction,
# not drift. The previous set was captured on 2026-08-09 from
# origin/feat/tooth-anatomy-9-templates and is recorded in that bead.
# Re-taken on 2026-08-11 for odontogram-3y9: `root_frac` on all nine permanent
# templates is now Dirk's reading off the Odontographie plates, and the two
# display constants changed with it - `ROOT_DISPLAY_SCALE` 0.60 -> 0.75 (less
# root compression, as he asked) and the new `LENGTH_SPREAD` 0.45. Both move
# geometry on every template, primary ones included, and both are intended,
# reviewed corrections rather than drift. `OCCL_MARGIN` went 7.5 -> 8.0 in the
# same change because the longer crown region pushed gum past the old viewBox
# bottom. The previous set was taken on 2026-08-10 and is recorded below.
# Re-taken on 2026-08-11 for odontogram-qyc: `gum-base` and `bone-base` are no
# longer warped out of the source drawings, they are DRAWN by tools/toothgen/
# gum.py in each template's final coordinates. That was the only way to make the
# gingiva read as one line across the arch - a papilla is shared between two
# teeth, and two hand-drawn halves have no way to agree on its height. The same
# change levels the bone block and absorbs the viewBox rounding into the shift,
# so the occlusal plane lands exactly OCCL_MARGIN above the written bottom;
# both move geometry on every template. Intended, reviewed corrections. SVG
# fingerprint parity is byte-identical throughout - the fingerprint reads id,
# opacity and class, never geometry.
# 31 and 71 re-taken again the same day: the lower incisors now stand in a 31 px
# column instead of 44, so their gum papilla moves with the joint. That change
# is what puts the lower canine in the embrasure between the upper lateral and
# the upper canine, which is where the mouth puts it.
# Re-taken TWICE on 2026-08-11 for odontogram-5ca. First, `width_frac` was set
# from the standard mean mesiodistal crown diameters, since the values it had
# carried no source and did not agree with each other. Then the measurement the
# generator fits those targets against turned out to be broken: it flattened
# the outline through the Bezier ANCHORS instead of the curve, so a molar read
# 24.6 units wide where it is 40.0, and the templates drawn with the longest
# curves - the premolars and molars - had been scaled up by a third to make
# that undersized number match. Both are intended, reviewed corrections. Every
# template scales horizontally, so every digest moves.
# Re-taken again on 2026-08-11 for odontogram-3y9: LENGTH_SPREAD 0.45 -> 0.30.
# The apex line was still 15.1 px ragged, essentially all of it the canine
# standing proud of the second molars; at 0.30 it is 9.6 px and the canine is
# still visibly the longest tooth, which is what "almost equal" asked for. One
# constant, every template's length moves. Intended, reviewed correction.
AUTHORED_GEOMETRY_SHA256 = {
    "11": "144396a2d9d2c51ac4e1f905857cb3d133935ca1d0f6c06732e1d27ba8346e10",
    "12": "9fa7b90c58def903ea8a64847aba82bbb4273f7bd6722e0d1f844f60e48d77ec",
    "13": "78f490c0a26b6fd79d390800b4c6d03103967550cd03427fff6c29e1804257ab",
    # Re-taken for odontogram-1c0 on 2026-08-11: tpl 14 is drawn from BUCCAL
    # now - the two roots converge and the palatal tip drops - instead of the
    # proximal aspect the source draws. Intended, reviewed correction.
    "14": "b571f9176594e0a63a8885d74ab8194e65f85483ab8d8686048d6eb32917a525",
    # Re-taken again on 2026-08-10 for odontogram-ay4: template 15's root is
    # grafted from source 13 instead of converted from source 14's two roots.
    "15": "8d7e88a32e926ac793e07d80f89b227eb5f7931f383c8e82c4299ec04820152b",
    "16": "8e248bb7e47467e3c36a473205a2fab3f9f4217e634f02e4565822495a5800dc",
    "17": "d160f77008c245580f9521dd219f2f91f5ee45fca37fa5956a30cfca29d44443",
    "31": "72b0a2aee5a4ff899a9c2c85155d51a941fca62140fe14b7a6e0f6e6c83ea835",
    "46": "104996ed31bef30845aa8024076871a49d177bacd1703e758bd20c3acf5106b0",
    # Primary dentition, taken on 2026-08-10 after Dirk read the rendered
    # dentition in the running chart and accepted it. Until then these eight
    # were deliberately unfrozen, which the digest check reports as a state
    # rather than a fault - a drawing does not have to pass a digest before it
    # may exist, it has to pass the dentist (odontogram-0ak, odontogram-e0a).
    "51": "1e63ebdce62a29a40ee441ee962f3f5014a7cc82b0fd136391f51b98ea3df6f9",
    "52": "db37be336adbe6c2453ebb5abaf85b558f03ebda46216d14440b84bbab67a603",
    "53": "8ce2ba27c6769a0a02570e795a5953ac3dee654b8f76f768cd2df24d5ff94367",
    # 54 re-taken after Bild 91 moved its cervix from 38% to 31% of tooth height.
    "54": "d77049d162b47f7581508fa091faac111295c5b564c92d742e07e48775a54c44",
    # 55 re-taken after Bild 92 moved its cervix from 40% to 38%.
    "55": "070887e92d9906f2896e95b9e7a23831e10aaac6bd9d78d75f300f6591186025",
    "71": "3d10dba845b65cabba818c5b3ccfe842fab2b13c2349c2221e0361b938755140",
    "74": "c51272e7439616662b15f80cf52f2ba805391e0c45cea33ff1739e8e89e0bec8",
    "75": "b6f18fdf33717ed216191e21ceb5b4f40ec43a64e63e2702ec318c97eb4e11f7",
}

GEOMETRY_ATTRIBUTES = (
    "d",
    "points",
    "x",
    "y",
    "x1",
    "y1",
    "x2",
    "y2",
    "cx",
    "cy",
    "fx",
    "fy",
    "r",
    "rx",
    "ry",
    "width",
    "height",
    "transform",
)

# Geometry is not only expressible as an XML attribute. SVG 2 / CSS also accept
# several of these as CSS properties, so `style="transform: scale(2)"` moves a
# contour just as `transform="scale(2)"` does. Hashing attributes alone would
# leave that route unguarded and let authored anatomy drift while the frozen
# digest still matched. Only the geometry-bearing declarations are taken from
# `style`: the rest of it is paint, and paint is not what these digests freeze.
GEOMETRY_STYLE_PROPERTIES = frozenset(GEOMETRY_ATTRIBUTES)


def geometry_style(value: str) -> str:
    """The geometry-bearing declarations of a `style` attribute, normalized."""

    kept = []
    for declaration in value.split(";"):
        name, separator, setting = declaration.partition(":")
        if not separator:
            continue
        name = name.strip().lower()
        if name in GEOMETRY_STYLE_PROPERTIES:
            kept.append(f"{name}:{' '.join(setting.split())}")
    return ";".join(kept)


def clinical_ids(txt: str) -> list[str]:

    without_defs = re.sub(r"<defs>.*?</defs>", "", txt, flags=re.S)
    return re.findall(r'id="([^"]+)"', without_defs)


def geometry_digest(txt: str) -> str:

    root = ET.fromstring(txt)
    parts: list[str] = []

    def walk(node: ET.Element, inside_defs: bool = False) -> None:
        local_name = node.tag.rsplit("}", 1)[-1]
        blocked = inside_defs or local_name == "defs"
        if not blocked:
            values = "|".join(
                f"{name}={node.attrib[name]}"
                for name in GEOMETRY_ATTRIBUTES
                if name in node.attrib
            )
            styled = geometry_style(node.attrib.get("style", ""))
            if styled:
                values = f"{values}|style[{styled}]" if values else f"style[{styled}]"
            parts.append(f"{local_name}|{values}")
        for child in node:
            walk(child, blocked)

    walk(root)
    return hashlib.sha256("\n".join(parts).encode()).hexdigest()


def root_count(base_d: str, apex: float, cej: float) -> int:

    subs = roots._polylines(base_d)
    counts = []
    for f in (0.25, 0.35, 0.45, 0.55):
        y = apex + (cej - apex) * f
        sp = roots.spans_at(subs, y)

        merged = 1
        for a, b in zip(sp, sp[1:]):
            if b[0] - a[1] > 0.25:
                merged += 1
        counts.append(merged if sp else 0)
    return max(set(counts), key=counts.count)


def check_occlusal(out_dir: Path, failures: list[str]) -> None:
    """The occlusal templates: the proportion the generator was asked for, and
    every clinical layer of the drawing it came from.

    odontogram-vlw AC3 asks for the coordinate transformation to be verified
    here, not merely produced. AC4 asks for the clinical layer ids, hidden
    defaults and activation paths to survive it - an x-scale should preserve all
    of them, and this is what says so rather than assuming it.
    """

    from occlusal import OCCL_SPECS, outline_extent

    print(f"\n{'Occl':9s} {'Ratio b/m':>18s}  {'id/Tags':>8s}  {'hidden':>8s}")
    print("-" * 50)
    for spec in OCCL_SPECS:
        f = out_dir / f"{spec.key}.svg"
        if not f.exists():
            failures.append(f"{spec.key}: file is missing")
            continue
        txt = f.read_text()
        src = (SOURCE / f"{spec.src}.svg").read_text()

        w, h, _ = outline_extent(txt)
        ratio = h / w
        ok_r = abs(ratio - spec.ratio) <= 0.02

        ids_ok = clinical_ids(txt) == clinical_ids(src)
        tags_ok = re.findall(r"<(\w+)", txt) == re.findall(r"<(\w+)", src)
        # A layer switched off in the drawing must still be switched off here,
        # or a finding would render on a tooth nobody charted it on.
        hidden_ok = txt.count("display: none") == src.count("display: none")

        mark = lambda b: "OK" if b else "!!"  # noqa: E731
        print(
            f"{spec.key:9s} {mark(ok_r)} {ratio:5.2f} (target {spec.ratio:.2f})  "
            f"{mark(ids_ok and tags_ok):>8s}  {mark(hidden_ok):>8s}"
        )
        if not ok_r:
            failures.append(
                f"{spec.key}: outline ratio {ratio:.2f} instead of {spec.ratio:.2f}"
            )
        if not ids_ok:
            failures.append(f"{spec.key}: clinical id order differs from its drawing")
        if not tags_ok:
            failures.append(f"{spec.key}: element tags differ from its drawing")
        if not hidden_ok:
            failures.append(
                f"{spec.key}: {txt.count('display: none')} hidden defaults against "
                f"the drawing's {src.count('display: none')}"
            )


INDEX_CSS = ASSETS.parents[1] / "index.css"


def check_columns(specs, failures):
    """`ToothSpec.col_px` has to name a column the grid actually has.

    The gum puts its papilla half a column plus half a gap from the tooth's
    centre, which is what makes two neighbours peak on the same point without
    either knowing the other (see tools/toothgen/gum.py). That only holds while
    the number in the spec is the number in the stylesheet, and nothing else
    ties the two together - so widening a column in src/index.css and leaving
    the spec alone would silently walk every papilla off its joint. This is the
    check that says so.
    """
    try:
        css = INDEX_CSS.read_text()
    except OSError:
        failures.append(f"cannot read {INDEX_CSS}")
        return
    # Both arches, because they no longer have the same columns: the lower
    # incisors stand in 31 px where the upper ones stand in 44.
    decls = re.findall(r"grid-template-columns:([^;]+);", css, re.S)
    if not decls:
        failures.append("grid-template-columns not found in src/index.css")
        return
    have = {
        float(v)
        for d in decls
        for v in re.findall(r"minmax\([^,]+,\s*([\d.]+)px\)", d)
    }
    if not have:
        failures.append("no minmax() columns found in src/index.css")
        return
    print(f"\nGrid columns in src/index.css: {sorted(have)}")
    for s in specs:
        if s.col_px not in have:
            failures.append(
                f"{s.key}: col_px {s.col_px:g} is not a column the grid has "
                f"({sorted(have)}); the papilla would miss the joint"
            )


def main(argv):
    argv = list(argv)
    which = "permanent"
    for flag in ("--primary", "--all"):
        if flag in argv:
            which = flag[2:]
            argv.remove(flag)

    specs = []
    if which in ("permanent", "all"):
        specs += SPECS
    if which in ("primary", "all"):
        specs += PRIMARY_SPECS

    out_dir = Path(argv[1]) if len(argv) > 1 else ASSETS
    failures = []
    occl_offsets = []

    print(f"Checking {out_dir}\n")
    hdr = (
        f"{'Tpl':4s} {'Roots':>10s}  {'Root fraction':>20s}  {'Length':>14s}  "
        f"{'Lumen apex':>11s} {'Lumen width':>11s}  {'id/Tags':>8s}"
    )
    print(hdr)
    print("-" * len(hdr))

    for s in specs:
        f = out_dir / f"{s.key}.svg"
        if not f.exists():
            failures.append(f"{s.key}: file is missing")
            continue
        txt = f.read_text()
        try:
            minidom.parseString(txt)
        except Exception as e:
            failures.append(f"{s.key}: invalid XML ({e})")
            continue

        src = (SOURCE / f"{s.src_template}.svg").read_text()
        ids_ok = clinical_ids(src) == clinical_ids(txt)
        tags_ok = re.findall(r"<(\w+)", src) == re.findall(r"<(\w+)", txt)
        # A template with no recorded digest is not yet frozen, which is a
        # state, not a fault. The digests exist to report geometry that moved
        # when nobody meant it to; they are not a gate a new drawing has to pass
        # before it may exist (odontogram-0ak).
        frozen = AUTHORED_GEOMETRY_SHA256.get(s.key)
        geometry_ok = frozen is None or geometry_digest(txt) == frozen

        base_d = tooth_base_d(txt)
        x0, apex, x1, inc = curve_extent(base_d)
        vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', txt).group(1).split()]

        mm = re.search(r"<!-- toothgen:.*?\bcej=([-\d.]+)", txt)
        if not mm:
            failures.append(f"{s.key}: toothgen metadata block is missing")
            continue
        cej = float(mm.group(1))

        n_sub = len(roots._polylines(base_d))
        if n_sub != 1:
            failures.append(
                f"{s.key}: tooth-base contains {n_sub} subpaths; "
                f"the contour must be continuous"
            )

        if s.roots == 1:
            subs = roots._polylines(base_d)
            # A lumen may fall into several lobes inside the chamber, but below
            # the cervical line a single-rooted tooth has ONE canal. Anything
            # else is the twin structure of a two-rooted source surviving the
            # conversion, which is what template 15 shipped with
            # (odontogram-ay4).
            # Counted as a RUN over consecutive millimetre depths. A single
            # height with two spans is a shape - a post with a shoulder, one
            # mark of a hatch pattern - while surviving twin canals persist over
            # several units, which is how template 15 read: four spans holding
            # from the cervical line to four units below it.
            def lumen_spans(d):
                sub = roots._polylines(d)
                run = best = 0
                worst = 0
                depth = 1.0
                while cej - depth > apex + 1.0:
                    n = len(roots.spans_at(sub, cej - depth))
                    run = run + 1 if n > 1 else 0
                    best = max(best, run)
                    worst = max(worst, n)
                    depth += 1.0
                if best >= 2:
                    multi.append(worst)
                return None

            multi: list[int] = []
            roots._lumen_paths(txt, lumen_spans)
            if multi:
                failures.append(
                    f"{s.key}: {len(multi)} lumen layer(s) hold up to "
                    f"{max(multi)} spans over consecutive depths below the "
                    f"cervical line; the twin canals of the two-rooted source "
                    f"survive"
                )

            # The cervical region on its own fine grid. The coarse sweep below
            # starts at 8 % of root length and steps in whole units, so it
            # walked straight over template 15's step, which sat within the
            # first unit and measured 0.058 per quarter unit. Every other
            # single-rooted template measures 0.000 there, so the threshold is
            # read off a clean separation rather than guessed.
            prev_w, cerv_at = None, None
            y = cej
            while y > cej - 4.0 and y > apex:
                sp = roots.spans_at(subs, y)
                if len(sp) == 1:
                    w = sp[0][1] - sp[0][0]
                    if prev_w is not None and w > prev_w + TOL_CERVICAL_STEP:
                        cerv_at = y
                    prev_w = w
                y -= 0.25
            if cerv_at is not None:
                failures.append(
                    f"{s.key}: contour widens apically at CEJ-{cej - cerv_at:.2f}; "
                    f"a step sits in the cervical region"
                )

            turn, turn_at = shaft_turn(base_d, apex, cej)
            if turn > TOL_SHAFT_TURN:
                failures.append(
                    f"{s.key}: the root outline turns {turn:.0f} degrees at "
                    f"CEJ-{cej - turn_at:.1f}; the shaft is not continuous"
                )

            prev, step_at = None, None
            for k in range(24):
                y = cej - (cej - apex) * (0.01 + 0.95 * k / 23)
                sp = roots.spans_at(subs, y)
                if len(sp) != 1:
                    continue
                w = sp[0][1] - sp[0][0]
                if prev is not None and w > prev + 0.12:
                    step_at = y
                prev = w
            if step_at is not None:
                failures.append(
                    f"{s.key}: root widens apically again at y={step_at:.1f}; "
                    f"the contour contains a step"
                )

            raw = roots.spans_at(subs, (apex + cej) / 2)
            if len(raw) > 1:
                failures.append(
                    f"{s.key}: root splits into {len(raw)} spans at half height; "
                    f"the former two-root seam remains"
                )

        overhang, lumen_w = lumen_extremes(txt, base_d, apex, cej)
        if overhang is None:
            failures.append(f"{s.key}: no lumen layer found")
        else:
            if overhang > 0:
                failures.append(
                    f"{s.key}: lumen stands {overhang:.2f} outside the root apex"
                )
            if lumen_w > TOL_LUMEN_WIDTH:
                failures.append(
                    f"{s.key}: lumen reaches {lumen_w:.0%} of the root width; "
                    f"a canal is drawn as wide as the root that contains it"
                )

        n = root_count(base_d, apex, cej)
        frac = (cej - apex) / (inc - apex)
        length = inc - apex
        occl_offsets.append((s.key, vb[1] + vb[3] - inc))

        _, want_frac, _ = display_targets(s)

        ok_n = n == s.roots
        ok_f = abs(frac - want_frac) <= TOL_FRAC
        ok_l = True
        mark = lambda b: "OK" if b else "!!"  # noqa: E731
        ok_lo = overhang is not None and overhang <= 0
        ok_lw = lumen_w is not None and lumen_w <= TOL_LUMEN_WIDTH
        print(
            f"{s.key:4s} {mark(ok_n)} {n} (target {s.roots})  "
            f"{mark(ok_f)} {frac:5.1%} (target {want_frac:.0%}, anatomical {s.root_frac:.0%})  "
            f"{length:8.1f}  "
            f"{mark(ok_lo)} {overhang if overhang is not None else 0:+6.2f} "
            f"{mark(ok_lw)} {lumen_w if lumen_w is not None else 0:8.0%}  "
            f"{mark(ids_ok and tags_ok):>8s}"
        )
        if not ok_n:
            failures.append(f"{s.key}: {n} roots instead of {s.roots}")
        if not ok_f:
            failures.append(
                f"{s.key}: root fraction {frac:.1%} instead of {want_frac:.0%}"
            )
        if not ids_ok:
            failures.append(
                f"{s.key}: clinical id order differs from the source template"
            )
        if not tags_ok:
            failures.append(f"{s.key}: element tags differ from the source template")
        if not geometry_ok:
            failures.append(f"{s.key}: authored geometry changed")

    check_occlusal(out_dir, failures)
    check_columns(specs, failures)

    if occl_offsets:
        vals = [v for _, v in occl_offsets]
        spread = max(vals) - min(vals)
        print(
            f"\nOcclusal plane above viewBox bottom: {min(vals):.2f} .. {max(vals):.2f} "
            f"(spread {spread:.2f})"
        )
        if spread > TOL_OCCL:
            failures.append(
                f"occlusal plane spreads by {spread:.2f}; crowns do not align"
            )

    print()
    if failures:
        print(f"{len(failures)} problem(s):")
        for x in failures:
            print("  !!", x)
        return 1
    print("All checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
