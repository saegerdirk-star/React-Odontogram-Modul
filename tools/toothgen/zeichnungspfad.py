"""Wo die HANDZEICHNUNGEN liegen - an EINER Stelle.

Die zweite Stufe der Kette (`redraw_alle.py` / `redraw_occl.py`) setzt einen
gezeichneten Umriss und eine gezeichnete Pulpa in einen erzeugten SPENDER ein.
Ihre Eingabe ist also kein Code, sondern eine Zeichnung, und `verify_redraw.py`
braucht dieselben Dateien, um das Ergebnis dagegen zu messen.

Deshalb liegen die Zeichnungen im Repository, unter `tools/toothgen/zeichnungen`:
sonst koennte man die Geometrie nachmessen, das Ergebnis aber nicht neu
herleiten - und genau das Nachvollziehen ist der Zweck des Generators.

Wer an den Zeichnungen ARBEITET, hat sie ausserhalb liegen. Dafuer gibt es
TOOTHGEN_ZEICHNUNGEN; ist die Variable gesetzt, gewinnt sie. Ein absoluter Pfad
im Code waere genau der Grund, warum die Kette auf einem anderen Rechner nicht
laeuft.
"""
from __future__ import annotations

import os
from pathlib import Path

_STANDARD = Path(__file__).resolve().parent / "zeichnungen"

ZEICHNUNGEN = Path(os.environ["TOOTHGEN_ZEICHNUNGEN"]).expanduser() \
    if os.environ.get("TOOTHGEN_ZEICHNUNGEN") else _STANDARD
