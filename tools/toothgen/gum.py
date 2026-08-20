# Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
# Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
# Dirk Saeger, Malte Sussdorff 2026

"""Draw the gingiva so that the row shares one line.

The source drawings carry a hand-drawn gum outline per tooth. Each one is
correct on its own and none of them can be right together: the papilla between
two teeth is ONE structure at ONE height, and two halves coming from two
different drawings have no way to agree on that height. Warping the drawn
outlines into agreement was tried twice and is closed as a route - see the
notes in odontogram-qyc; a hand-drawn gum is almost entirely long cubics, and
the ones that carry the papilla are exactly the ones a shift by x deforms.

So the outline is drawn here instead, in the template's FINAL coordinates,
after the warp. Three facts make that possible:

* every template puts its occlusal plane the same distance above the viewBox
  bottom (``build.OCCL_MARGIN``, asserted by verify.py), so a height measured
  from the occlusal plane means the same thing in every template;
* each template knows the width of the grid column it stands in
  (``ToothSpec.col_px``), which is what lets it put the papilla on the joint
  rather than on its own edge; and
* ``collectActiveLayers`` fingerprints id, opacity and class - never geometry -
  so replacing the path data leaves SVG parity byte-identical.

The band has two boundaries, and both of them follow the tooth's own
cervical line:

    crest   \\____________/\\______________/\\____________  bone level
                    ___                       ___
    papilla ___/       \\_____________/       \\___  free gingival margin

BOTH used to be one number for the whole arch - ``CREST_H`` and ``PAPILLA_H``,
still here as the fallback the donors are drawn with. The reason they were
constants was that "a papilla is shared between two teeth, and neither template
knows which tooth it will stand next to". Since 2026-08-17 that is no longer
true: there is ONE template per position, so the neighbour IS known, and the
caller passes the height for each JOINT - the average of what the two
neighbours ask for. Both of them compute the same average, so they still meet
on one point, and the constraint that forced a flat line is gone.

What forced the change is what a flat line did under a cervical line that is
not flat. Measured over the shipped set (``redraw_plan.ZERVIKAL``), the cervix
runs from 21.9 units above the occlusal plane at 41 to 28.6 at 43 - and down to
16.1 on a deciduous incisor. Against a crest at a fixed 36.0 that gave a band
8.7 units tall at 41 and 3.1 at its neighbour 43; against a papilla at a fixed
19.0 the deciduous teeth came out with the papilla APICAL to their own margin,
so the scallop ran the wrong way round on all ten of them.

Dirk drew the line he wants on 20.08.2026 (``gum.png``): the papillae as they
already run, and a lower boundary a good deal coronal to where it was. Measured
off that drawing at its four joints, the crest sits 2.9 to 4.6 units apical to
the cervical line, mean 3.85 - which is ``CREST_BELOW_CEJ`` below.

Each transition is ONE cubic, and a smoothstep IS a cubic Bezier exactly
(control ordinates a, a, b, b over an evenly spaced abscissa), so it arrives at
the papilla with a horizontal tangent. That is what lets two neighbours meet
without a seam: both are flat where they touch, so their union has a smooth
peak instead of a corner or a step.

The bone is drawn here too, and for the same reason. Bone and gum are one
figure - the gum is draped over the crest - so redrawing one and leaving the
other would open white slivers wherever the two outlines stopped nesting. It is
the plain block it always was, but it now ends at the gum's own crest line, a
little coronal to it so the gum covers the join, and reaches the same distance
sideways so the row has no gaps to show through.
"""

from __future__ import annotations


# Heights above the occlusal plane, in template units.
#
# CREST_H and PAPILLA_H are the FALLBACK, used when no per-joint heights are
# passed. That is the case for the donors in build.py, and only there: the band
# a donor carries is overwritten in the redraw stage before anything ships, so
# leaving it on the old rule keeps `verify.py`'s frozen donor digests where
# they are instead of moving seventeen of them for a shape nobody sees.
CREST_H = 36.0
PAPILLA_H = 19.0

# What the shipped templates use instead, both measured against the tooth's OWN
# cervical line (`redraw_plan.ZERVIKAL`).
#
# CREST_BELOW_CEJ is how far apical of the cervix the bone-gum boundary sits.
# Read off Dirk's drawing of 20.08.2026 at its four joints: 4.60, 3.37, 2.89
# and 4.52 units, mean 3.85. Just under a millimetre at 4.048 units per mm,
# which is also where the alveolar crest sits in health.
CREST_BELOW_CEJ = 3.85

# PAPILLA_FRAC puts the papilla tip at a FRACTION of the crown length above the
# occlusal plane - just under the contact point, which is where a papilla ends.
# A proportion rather than an offset, so a long crown gets a long papilla and a
# milk tooth a short one; measured against the margin it gives 2.0 units on a
# deciduous incisor and 5.6 at the canine, and never a negative one, which the
# flat 19.0 could not manage. 0.75 keeps the permanent set within a unit or two
# of the papillae that are there today, which is the line Dirk confirmed.
PAPILLA_FRAC = 0.75


def papilla_h(cej_h: float) -> float:
    """Papilla tip height above the occlusal plane, from the crown length."""
    return cej_h * PAPILLA_FRAC


def crest_h(cej_h: float) -> float:
    """Bone-gum boundary height above the occlusal plane, from the cervix."""
    return cej_h + CREST_BELOW_CEJ

# Where the margin sits relative to THIS tooth's cervical line, and how far the
# dip runs sideways as a multiple of the tooth's own half width AT THAT HEIGHT.
# Just under 1, so the margin stays down until the tooth's outline lets go of
# it and only then rises: the gum is drawn behind the tooth, so this is what
# decides how much of the scallop is actually visible.
MARGIN_DOWN = 2.0
MARGIN_SPREAD = 0.92

# How steeply the margin leaves the tooth: the near control ordinate of the
# transition, as a fraction of the way to the tooth end. 1.0 would be flat.
TOOTH_END_SLOPE = 0.45

# How far past the papilla the band keeps going, so that two neighbours
# genuinely overlap there instead of meeting at a mathematical point. Both are
# flat over the whole overlap, so its width does not show.
EXT = 3.0

# How far the bone reaches coronally past the crest line, so the gum covers the
# join instead of abutting it and showing a hairline.
BONE_OVERLAP = 2.0

# Where the bone block ends apically. One number for the whole arch, for the
# same reason the crest is: the jaw does not step from tooth to tooth. It sits
# just inside the tallest template (tpl 14, 81.6 above the occlusal plane) and
# is drawn past the viewBox on every shorter one, which the row has the height
# for and `overflow: visible` on the tile SVG now lets through.
BONE_TOP_H = 81.0

# Grid gap between two tiles, in CSS pixels, and the scale that turns pixels
# into template units. Both mirror src/index.css and tools/toothgen/build.py.
GRID_GAP_PX = 4.0
PX_PER_UNIT = 1.62


def _ease(xa: float, ya: float, xb: float, yb: float, flat_b: bool = True) -> str:
    """One cubic from (xa,ya) to (xb,yb), horizontal at the ``a`` end.

    With ``flat_b`` it is horizontal at both ends: control ordinates ya, ya,
    yb, yb over an evenly spaced abscissa give y(t) = ya + (yb-ya)(3t^2-2t^3),
    which is the smoothstep itself and not an approximation of it. That is the
    papilla end, and it has to be flat so two neighbours meet without a corner.

    At the tooth end it must NOT be flat. A curve that arrives horizontal there
    leaves the crown's silhouette running sideways, and what shows beside the
    tooth is a squared-off tab rather than a margin hugging the neck. Dropping
    the near control ordinate to ``TOOTH_END_SLOPE`` of the way gives it a
    slope to come off the tooth with.
    """
    d = xb - xa
    c2 = yb if flat_b else ya + (yb - ya) * TOOTH_END_SLOPE
    return f"C{xa + d / 3:.2f},{ya:.2f} {xa + 2 * d / 3:.2f},{c2:.2f} {xb:.2f},{yb:.2f}"


def _rev_ease(xa: float, ya: float, xb: float, yb: float) -> str:
    """The mirror of ``_ease``: horizontal at the ``b`` end, sloped at ``a``."""
    d = xb - xa
    c1 = yb + (ya - yb) * TOOTH_END_SLOPE
    return f"C{xa + d / 3:.2f},{c1:.2f} {xa + 2 * d / 3:.2f},{yb:.2f} {xb:.2f},{yb:.2f}"


def half_pitch(col_px: float) -> float:
    """Half the distance to the neighbouring tooth, in template units."""
    return (col_px + GRID_GAP_PX) / 2.0 / PX_PER_UNIT


def _span(cx: float, neck_half: float, col_px: float):
    """Joint, margin-dip and outer x positions, left and right of ``cx``."""
    hp = half_pitch(col_px)
    xkn_l, xkn_r = cx - hp, cx + hp
    half = neck_half * MARGIN_SPREAD
    # A wide tooth in a narrow column can push the dip past the joint. Keep a
    # transition of at least a unit on each side so it never runs backwards.
    xma_l = max(cx - half, xkn_l + 1.0)
    xma_r = min(cx + half, xkn_r - 1.0)
    if xma_l >= xma_r:
        xma_l = xma_r = cx
    return xkn_l - EXT, xkn_l, xma_l, xma_r, xkn_r, xkn_r + EXT


def _crest_run(occl, cej, cx, crest, xa, xkn_a, xkn_b, xb, off=0.0) -> str:
    """Der Kammzug von ``xa`` nach ``xb``, als ``M...L...`` beginnend bei xa.

    Drei Dinge auf einmal, und jedes davon musste sein:

    * FLACH ueber den Ueberstand hinter dem Gelenk (``xa`` bis ``xkn_a``).
      Ohne das lief die geneigte Kante mit ihrer Neigung ueber das Gelenk
      hinaus weiter, waehrend der Nachbar dort mit seiner eigenen Neigung
      ankam - und an jeder Papille stand eine Stufe. Beide flach heisst: beide
      auf derselben Zahl, und der Ueberstand faellt zusammen. Dasselbe
      Argument wie oben an der Papille, nur an der anderen Kante.
    * Am GELENK die Zahl, die der Aufrufer aus beiden Nachbarn gemittelt hat.
    * In der MITTE die Hoehe, die dieser Zahn aus seiner eigenen Zervikallinie
      bekommt. Ohne diesen Punkt kaeme der Kamm nur bis zum Mittel der
      Nachbarn, und ein Zahn mit langer Krone zwischen zwei kurzen (43 steht
      zwischen 42 und 44) haette sein Band nie in voller Hoehe.
    """
    if crest is None:
        y = occl - CREST_H + off
        return f"M{xa:.2f},{y:.2f}L{xb:.2f},{y:.2f}"
    ya = occl - (crest[0] if xa < xb else crest[1]) + off
    yb = occl - (crest[1] if xa < xb else crest[0]) + off
    y_mitte = occl - crest_h(occl - cej) + off
    return (
        f"M{xa:.2f},{ya:.2f}"
        f"L{xkn_a:.2f},{ya:.2f}"
        f"L{cx:.2f},{y_mitte:.2f}"
        f"L{xkn_b:.2f},{yb:.2f}"
        f"L{xb:.2f},{yb:.2f}"
    )


def _paar(wert, fallback: float) -> tuple[float, float]:
    """``(links, rechts)`` aus einem Paar oder dem Rueckfallwert."""
    if wert is None:
        return fallback, fallback
    return float(wert[0]), float(wert[1])


def gum_path(
    occl: float,
    cej: float,
    cx: float,
    neck_half: float,
    col_px: float,
    pap: tuple[float, float] | None = None,
    crest: tuple[float, float] | None = None,
) -> str:
    """The gum band for one template, in that template's final coordinates.

    ``occl`` is the y of the occlusal plane, ``cej`` the y of the cervical
    line, ``cx`` the tooth's centre, ``neck_half`` its half width at the height
    the margin sits at, and ``col_px`` the width of its grid column.

    ``pap`` and ``crest`` are the papilla and crest heights above the occlusal
    plane AT THE TWO JOINTS, left and right. The caller averages them over the
    two neighbours, so both sides of a joint arrive at the same number and the
    line stays one line. Left them out and the flat fallback applies - see the
    note on the constants.
    """
    pap_l, pap_r = _paar(pap, PAPILLA_H)
    y_pap_l, y_pap_r = occl - pap_l, occl - pap_r
    y_marg = cej + MARGIN_DOWN
    xl, xkn_l, xma_l, xma_r, xkn_r, xr = _span(cx, neck_half, col_px)
    kamm = _crest_run(occl, cej, cx, crest, xl, xkn_l, xkn_r, xr)

    return (
        kamm
        + f"L{xr:.2f},{y_pap_r:.2f}"
        f"L{xkn_r:.2f},{y_pap_r:.2f}"
        + _ease(xkn_r, y_pap_r, xma_r, y_marg, flat_b=False)
        + f"L{xma_l:.2f},{y_marg:.2f}"
        + _rev_ease(xma_l, y_marg, xkn_l, y_pap_l)
        + f"L{xl:.2f},{y_pap_l:.2f}Z"
    )


def bone_path(
    occl: float,
    cx: float,
    col_px: float,
    crest: tuple[float, float] | None = None,
    cej: float | None = None,
) -> str:
    """The alveolar bone block, ending at the gum's own crest line.

    It follows the gum's crest joint for joint, for the reason the block is
    drawn here at all: bone and gum are one figure, and a level block under a
    crest that is no longer level would open a sliver at every embrasure.
    """
    if cej is None:
        cej = occl - CREST_H + CREST_BELOW_CEJ   # gibt genau CREST_H zurueck
    y_top = occl - BONE_TOP_H
    xl, xkn_l, _, _, xkn_r, xr = _span(cx, 0.0, col_px)
    # Rueckwaerts, weil der Block hier von rechts nach links geschlossen wird.
    kamm = _crest_run(occl, cej, cx, crest,
                      xr, xkn_r, xkn_l, xl, off=BONE_OVERLAP)
    return (
        f"M{xl:.2f},{y_top:.2f}"
        f"L{xr:.2f},{y_top:.2f}"
        + "L" + kamm[1:] + "Z"
    )
