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
AUTHORED_GEOMETRY_SHA256 = {
    "11": "6372efd50de3e153953892b66d2b13cb643408c98054ebe1e591b99f021a6caa",
    "12": "95cb14201400172323e2ad8cc0db1ae67c90e0bfbebeeca744930b814e2cabf0",
    "13": "49822c6e67781377314fe18d52d5404084ac38d75737daa4189f76047645a887",
    "14": "0ccb435b66a6bb8e5778eeed6135fc77f143bf6d352918f3cc90471675f0f584",
    # Re-taken again on 2026-08-10 for odontogram-ay4: template 15's root is
    # grafted from source 13 instead of converted from source 14's two roots.
    "15": "9a76672b5ed49872cb68128eee4cf09385d5962bc8355a326af6235c34a41890",
    "16": "a0cc25bff09788ccc4cf9c2534a1642a6e7b0e946ae032d55b312c5140a7c142",
    "17": "ab9a9b3f1822f187cdbf6656d56a92f9eb219ce1cded139d4252bb57f7e75e2e",
    "31": "d968484c4189c1b3cb5a4084bb26bb2c85d2a0975831c7f4c8399547e086d4a7",
    "46": "869b326cd2f9ac36eef948c22397a6e6332f874df5c805deebdde2683151e4ac",
    # Primary dentition, taken on 2026-08-10 after Dirk read the rendered
    # dentition in the running chart and accepted it. Until then these eight
    # were deliberately unfrozen, which the digest check reports as a state
    # rather than a fault - a drawing does not have to pass a digest before it
    # may exist, it has to pass the dentist (odontogram-0ak, odontogram-e0a).
    "51": "4b892d1808a323ce3fc1e7c1c6b4225c902d8d4884c374a1295974c8f6552fff",
    "52": "0e12cf13fb53692e52bf290634bde1e6cd4272ffb92d40162bc9e41cf68f72f0",
    "53": "d6f50515ae3fa8949762669c4a54a1fe4cab41864a7f87e975e0b0935edb0af4",
    # 54 re-taken after Bild 91 moved its cervix from 38% to 31% of tooth height.
    "54": "e8c65f5bcfa7b9d4b58b283a06af2cbd57400977a80c7c93d928db114639b794",
    # 55 re-taken after Bild 92 moved its cervix from 40% to 38%.
    "55": "15ff78bdf8e8ca72f5a36b92ffcdca868e2deefca8591913d82c08282ccecc86",
    "71": "c61d8c328e89c9a3fcbd8298516e4fe0695d57a3ea346281c6c6f2d2b567709c",
    "74": "2850a21fed18f9dbbb3da438239e9de5c04707adfc13fe1b566caf61bba693b0",
    "75": "790e74749c64f4f00bb09680964a1b1670272a470a1493e7acb6934d9db4bd43",
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
