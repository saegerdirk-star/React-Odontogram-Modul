"""Graft a drawn root from one source template onto the crown of another.

Template 15, the single-rooted premolar, was produced by redrawing the two roots
of source 14 as one. That conversion is what put the reported defects into the
asset: a step where the new root was butt-joined at a single height, and the
walls of the two old canals surviving above that joint (odontogram-ay4).

Source 13 already contains what the conversion was trying to synthesise - a
genuinely single root, drawn, with one canal, its own contour and its own lumen
layers. Grafting it removes both defects by construction rather than by
correction, and it also supplies a DRAWN cervical transition, which is where the
kink Dirk reported actually lives.

The graft is per layer and keeps source 14's element and id order intact, so the
generated template still matches its source id for id and the SVG parity
fingerprint is untouched. Only `d` attributes change.
"""

from __future__ import annotations

import re

import roots
import svgpath

# Layers whose two premolar copies exist because the source has two ROOTS. The
# crown keeps both - a premolar has two cusps and therefore two pulp horns - and
# only the deep one receives the canal. Nothing is emptied and no id disappears.
TWIN_LUMEN_DEEP = ("tooth-healthy-pulp-2", "tooth-inflam-pulp-base-2")
TWIN_LUMEN_SHALLOW = ("tooth-healthy-pulp-1", "tooth-inflam-pulp-base-1")
TWIN_LUMEN_DONOR = {
    "tooth-healthy-pulp-2": "tooth-healthy-pulp",
    "tooth-inflam-pulp-base-2": "tooth-inflam-pulp-base1",
}

# One root still has a mesial and a distal surface, so both markers stay; the
# donor's single shape is placed on each side of the new root.
TWIN_SURFACE_DONOR = {
    "endo-resorption-distal": ("endo-resorption", False),
    "endo-resorption-mesial": ("endo-resorption", True),
}

# An implant is a fixture, not a root, and the bone around it follows the
# fixture rather than an anatomical apex. These layers keep the host's own
# drawing, which also leaves the template's IMPLANT_CEJ_Y anchor where it was.
NO_GRAFT = ("implant", "peri-implant")

ELEMENT_RE = re.compile(r"<(path|polygon|g|/g)([^>]*?)>")


def _dist(a, b) -> float:
    return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5


def apical_walk(d: str, y_cut: float):
    """The contour of `d` below `y_cut`, as (entry, exit, points, segs, rest).

    Returns None when the path does not cross `y_cut` exactly twice, or when
    neither walk direction stays apical - the caller then leaves the layer as it
    is rather than guessing.
    """

    segs, rest = roots._contour_of(d)
    if len(segs) < 4:
        return None
    crossings = roots._crossings_of(segs, y_cut)
    if len(crossings) != 2:
        return None
    for c1, c2 in ((crossings[0], crossings[1]), (crossings[1], crossings[0])):
        pts = roots._walk(segs, c1, c2)
        if not pts:
            continue
        if min(p[1] for p in pts) < y_cut - 1.5 and max(p[1] for p in pts) <= y_cut + 0.6:
            return c1, c2, pts, segs, rest
    return None


def graft_apical(d_host: str, d_donor: str, y_cut: float, mapfn) -> str | None:
    """Replace the host's geometry below `y_cut` with the donor's."""

    host = apical_walk(d_host, y_cut)
    if host is None:
        return None
    c1, c2, _, segs, rest = host

    donor = apical_walk(svgpath.warp_path_d(d_donor, mapfn), y_cut)
    if donor is None:
        return None
    pts = list(donor[2])

    pa, pb = c1[2], c2[2]
    if _dist(pts[0], pa) > _dist(pts[-1], pa):
        pts.reverse()
    # Force the two ends onto the host's own crossings. The map already matches
    # the widths at the cervical line, so this is a nudge of a fraction of a
    # unit - and it is what guarantees no step survives at the joint.
    pts[0], pts[-1] = pa, pb
    return roots._splice(segs, c1, c2, roots._catmull_cubics(pts), rest)


def _clip_halfplane(sub, y_cut: float, keep_above: bool):
    """Sutherland-Hodgman against one horizontal edge."""

    def inside(p):
        return p[1] >= y_cut if keep_above else p[1] <= y_cut

    out = []
    n = len(sub)
    for i in range(n):
        a, b = sub[i], sub[(i + 1) % n]
        ia, ib = inside(a), inside(b)
        if ia:
            out.append(a)
        if ia != ib and abs(b[1] - a[1]) > 1e-12:
            t = (y_cut - a[1]) / (b[1] - a[1])
            out.append((a[0] + t * (b[0] - a[0]), y_cut))
    return out


def _polygons_to_d(polys) -> str:
    parts = []
    for poly in polys:
        if len(poly) < 3:
            continue
        head = f"M{poly[0][0]:.2f},{poly[0][1]:.2f}"
        body = "".join(f"L{x:.2f},{y:.2f}" for x, y in poly[1:])
        parts.append(head + body + "Z")
    return "".join(parts)


def clip_graft(d_host: str, d_donor: str | None, y_cut: float, mapfn) -> str | None:
    """Keep the host above `y_cut`, take the donor below it.

    The fallback for every layer the contour splice cannot handle - anything
    that crosses the cervical line more than twice, which is exactly what a pair
    of canals does. It butt-joins at one height, but for a lumen that joint lies
    inside the pulp chamber where nothing shows, and it removes a twin structure
    by construction: below the cut only the donor's single shape exists.
    """

    above = [_clip_halfplane(s, y_cut, True) for s in roots._polylines(d_host)]
    below = []
    if d_donor is not None:
        mapped = svgpath.warp_path_d(d_donor, mapfn)
        below = [_clip_halfplane(s, y_cut, False) for s in roots._polylines(mapped)]
    out = _polygons_to_d([p for p in above + below if len(p) >= 3])
    return out or None


def layer_index(txt: str) -> dict[str, str]:
    """Map a layer key to its `d`. Elements without an id of their own are keyed
    by their enclosing group and their position in it, so the two structurally
    parallel sources line up."""

    out: dict[str, str] = {}
    stack: list[str] = []
    counts: dict[str, int] = {}

    def repl(m):
        head, attrs = m.group(1), m.group(2)
        if head == "g":
            if not attrs.rstrip().endswith("/"):
                idm = re.search(r'\sid="([^"]+)"', attrs)
                stack.append(idm.group(1) if idm else "")
            return m.group(0)
        if head == "/g":
            if stack:
                stack.pop()
            return m.group(0)
        dm = re.search(r'\sd="([^"]+)"', attrs)
        if not dm:
            return m.group(0)
        idm = re.search(r'\sid="([^"]+)"', attrs)
        if idm:
            key = idm.group(1)
        else:
            group = stack[-1] if stack else ""
            counts[group] = counts.get(group, 0) + 1
            key = f"{group}#{counts[group]}"
        out.setdefault(key, dm.group(1))
        return m.group(0)

    ELEMENT_RE.sub(repl, re.sub(r"<defs>.*?</defs>", "", txt, flags=re.S))
    return out


def _contour_metrics(txt: str, cej: float):
    from build import silhouette_width, tooth_base_d

    d = tooth_base_d(txt)
    pts = [p for sub in roots._polylines(d) for p in sub]
    xs = [p[0] for p in pts]
    return (min(xs) + max(xs)) / 2.0, silhouette_width(d, cej), min(p[1] for p in pts)


def build_map(host_txt: str, donor_txt: str, cej_host: float, cej_donor: float):
    """The affine that carries the donor's root into the host's frame.

    Widths are matched AT THE CERVICAL LINE, which is what makes the joint
    continuous, and the root length is scaled to the host's, so the graft keeps
    the premolar's proportion and only takes the canine's shape.
    """

    cx_h, w_h, apex_h = _contour_metrics(host_txt, cej_host)
    cx_d, w_d, apex_d = _contour_metrics(donor_txt, cej_donor)
    sx = w_h / w_d
    sy = (cej_host - apex_h) / (cej_donor - apex_d)

    def fn(x: float, y: float):
        return (cx_h + (x - cx_d) * sx, cej_host + (y - cej_donor) * sy)

    def mirror(x: float, y: float):
        nx, ny = fn(x, y)
        return (2 * cx_h - nx, ny)

    return fn, mirror


def graft_root(
    host_txt: str,
    donor_txt: str,
    cej_host: float,
    cej_donor: float,
):
    """Rewrite every root-bearing layer of `host_txt` from `donor_txt`."""

    donor = layer_index(donor_txt)
    fn, mirror = build_map(host_txt, donor_txt, cej_host, cej_donor)

    grafted: list[str] = []
    closed: list[str] = []
    skipped: list[str] = []

    stack: list[str] = []
    counts: dict[str, int] = {}

    def repl(m):
        head, attrs = m.group(1), m.group(2)
        if head == "g":
            if not attrs.rstrip().endswith("/"):
                idm = re.search(r'\sid="([^"]+)"', attrs)
                stack.append(idm.group(1) if idm else "")
            return m.group(0)
        if head == "/g":
            if stack:
                stack.pop()
            return m.group(0)

        dm = re.search(r'\sd="([^"]+)"', attrs)
        if not dm:
            return m.group(0)
        idm = re.search(r'\sid="([^"]+)"', attrs)
        if idm:
            key = idm.group(1)
        else:
            group = stack[-1] if stack else ""
            counts[group] = counts.get(group, 0) + 1
            key = f"{group}#{counts[group]}"

        if key.startswith(NO_GRAFT) or (stack and stack[-1].startswith(NO_GRAFT)):
            return m.group(0)

        d = dm.group(1)
        pts = [p for sub in roots._polylines(d) for p in sub]
        if not pts:
            return m.group(0)
        if min(p[1] for p in pts) > cej_host - 1.0:
            return m.group(0)  # crown-only: nothing of it is root

        if key in TWIN_LUMEN_SHALLOW:
            # The premolar's second horn stays; its second canal does not.
            out = clip_graft(d, None, cej_host, fn)
            if out is not None:
                closed.append(key)
            else:
                skipped.append(key)
                return m.group(0)
        else:
            donor_key, flip = key, False
            if key in TWIN_LUMEN_DONOR:
                donor_key = TWIN_LUMEN_DONOR[key]
            elif key in TWIN_SURFACE_DONOR:
                donor_key, flip = TWIN_SURFACE_DONOR[key]
            d_donor = donor.get(donor_key)
            if d_donor is None:
                skipped.append(key)
                return m.group(0)
            mapping = mirror if flip else fn

            if max(p[1] for p in pts) <= cej_host + 0.5:
                # Root-only: nothing of the host belongs to the crown, so the
                # donor's layer replaces it outright.
                out = svgpath.warp_path_d(d_donor, mapping)
                grafted.append(key)
            else:
                out = graft_apical(d, d_donor, cej_host, mapping)
                if out is not None:
                    grafted.append(key)
                else:
                    out = clip_graft(d, d_donor, cej_host, mapping)
                    if out is None:
                        skipped.append(key)
                        return m.group(0)
                    closed.append(key)
        attrs2 = attrs.replace(dm.group(0), f' d="{out}"', 1)
        return f"<{head}{attrs2}>"

    body = ELEMENT_RE.sub(repl, host_txt)
    return body, grafted, closed, skipped
