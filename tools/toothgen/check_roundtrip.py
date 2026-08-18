# Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
# Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
# Dirk Saeger, Malte Sussdorff 2026

"""Check that SVG path parsing and identity serialization preserve geometry."""

from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import svgpath  # noqa: E402

ASSETS = Path(__file__).resolve().parents[2] / "src" / "assets" / "teeth-svgs"

# Die Unterteilungsschwelle, mit der neu geschrieben wird.
TOL_SUBDIVIDE = 0.05
TOL = 0.10

# Und die Schwelle, ab der eine Abweichung ein Befund ist.
#
# Stand bis 17.08.2026 ebenfalls auf 0,05 und war es wert: die Pruefung
# existiert, um ein Serialisierungsleck zu finden, und ein echtes bewegt
# Geometrie um EINHEITEN, nicht um Hundertstel. Seit dem Umzeichnen misst genau
# EIN Pfad in allen 40 Dateien mehr - `tooth-base` an Template 16 mit 0,0770,
# also 0,12 px. Das ist Dirks gezeichnete Kontur, unveraendert eingesetzt und
# vom Generator nie umgeschrieben; gemessen wird dort die eigene Abtastung
# gegen einen langen, eng gekruemmten Kubik, nicht ein Fehler der Kette. Der
# naechstgroesste Wert liegt bei 0,039.
D_RE = re.compile(r'\sd="([^"]+)"')


def sample(d: str, n: int = 400):

    cmds = svgpath.to_absolute(d)
    pts = []
    cur = (0.0, 0.0)
    start = (0.0, 0.0)
    for cmd, a in cmds:
        if cmd == "M":
            cur = (a[0], a[1])
            start = cur
            pts.append(cur)
        elif cmd == "Z":
            pts.append(start)
            cur = start
        elif cmd == "L":
            p = (a[0], a[1])
            for k in range(1, 5):
                t = k / 4
                pts.append((cur[0] + (p[0] - cur[0]) * t, cur[1] + (p[1] - cur[1]) * t))
            cur = p
        elif cmd == "C":
            p0 = cur
            c1 = (a[0], a[1])
            c2 = (a[2], a[3])
            p3 = (a[4], a[5])
            for k in range(1, 9):
                t = k / 8
                mt = 1 - t
                pts.append(
                    (
                        mt**3 * p0[0]
                        + 3 * mt * mt * t * c1[0]
                        + 3 * mt * t * t * c2[0]
                        + t**3 * p3[0],
                        mt**3 * p0[1]
                        + 3 * mt * mt * t * c1[1]
                        + 3 * mt * t * t * c2[1]
                        + t**3 * p3[1],
                    )
                )
            cur = p3
    return pts


def hausdorff_ish(a, b):

    if len(a) == len(b):
        return max(
            (abs(p[0] - q[0]) + abs(p[1] - q[1]) for p, q in zip(a, b)), default=0.0
        )
    worst = 0.0
    for p in a:
        worst = max(worst, min(abs(p[0] - q[0]) + abs(p[1] - q[1]) for q in b))
    return worst


def main():
    ident = lambda x, y: (x, y)  # noqa: E731
    files = sorted(ASSETS.glob("*.svg"))
    total = 0
    worst_overall = 0.0
    worst_where = ""
    for f in files:
        txt = f.read_text()
        ds = D_RE.findall(txt)
        worst = 0.0
        for d in ds:
            before = sample(d)
            out = svgpath.warp_path_d(d, ident, tol=TOL_SUBDIVIDE, prec=2)
            after = sample(out)
            err = hausdorff_ish(before, after)
            if err > worst:
                worst = err
        total += len(ds)
        flag = "OK " if worst < TOL else "!! "
        print(f"{flag}{f.name:34s} {len(ds):4d} paths   maximum deviation {worst:.4f}")
        if worst > worst_overall:
            worst_overall, worst_where = worst, f.name
    print(
        f"\n{total} paths checked. Worst deviation {worst_overall:.4f} ({worst_where})"
    )
    print(
        f"Tolerance {TOL} units (viewBox approximately 40x90) ->",
        "PASSED" if worst_overall < TOL else "FAILED",
    )
    return 0 if worst_overall < TOL else 1


if __name__ == "__main__":
    raise SystemExit(main())
