// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026

/**
 * SCHEMATIC chart view (Dirk, 24.08.2026) — a separate renderer over the same
 * case state, like PerioChart. Pinned dir="ltr" so tooth geometry never
 * mirrors under RTL.
 *
 * Phase 1 was display-only. Phase 2 (bead odontogram-ip3) makes it EDITABLE
 * without a second mutation path: a click on a tooth selects it through
 * `selectToothInChart`, which drives the very control panel App.tsx relocates
 * BELOW this chart in the schematic view — so every edit still runs through the
 * existing wired controls and the DS-1 gate. Hovering a tooth shows the full
 * finding text (`getToothStateSummary`), the same lines the anatomical tile
 * tooltip carries; the schematic glyph stays the terse overview.
 */
import { useEffect, useRef, useState } from "react";
import {
  onStateChange,
  getToothDisplayState,
  getToothStateSummary,
} from "./odontogram";
import { buildSchematicSvg } from "./schematicGraphic";

/** Nearest ancestor carrying `data-tooth` — the transparent per-column hit rect
 *  the schematic SVG lays over both the side glyph and the occlusal box. */
function toothAt(target: EventTarget | null): number | null {
  const el = (target as Element | null)?.closest?.("[data-tooth]") as HTMLElement | null;
  if (!el) return null;
  const n = Number(el.dataset.tooth);
  return Number.isFinite(n) ? n : null;
}

export default function SchematicChart({
  selected,
  onSelect,
}: {
  selected: number | null;
  onSelect: (toothNo: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState("");
  const [tip, setTip] = useState<{ tn: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const rebuild = () => setSvg(buildSchematicSvg(getToothDisplayState));
    rebuild();
    return onStateChange(rebuild);
  }, []);

  // Re-stamp the active column after every (re)build. dangerouslySetInnerHTML
  // rewrites the SVG whenever `svg` changes, wiping the class; this puts it back.
  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return;
    root.querySelectorAll(".schematic-hit.is-active").forEach((e) => e.classList.remove("is-active"));
    if (selected != null) {
      root.querySelector(`.schematic-hit[data-tooth="${selected}"]`)?.classList.add("is-active");
    }
  }, [svg, selected]);

  return (
    <div className="schematic-chart-outer">
      <div
        className="schematic-chart-wrap"
        dir="ltr"
        ref={wrapRef}
        onClick={(e) => {
          const tn = toothAt(e.target);
          if (tn == null) return;
          onSelect(tn);
        }}
        onMouseMove={(e) => {
          const tn = toothAt(e.target);
          setTip(tn == null ? null : { tn, x: e.clientX, y: e.clientY });
        }}
        onMouseLeave={() => setTip(null)}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {tip && (() => {
        const lines = getToothStateSummary(tip.tn);
        return (
          <div
            className="schematic-tooltip"
            style={{ left: tip.x + 14, top: tip.y + 14 }}
            role="tooltip"
          >
            <div className="schematic-tooltip-title">{tip.tn}</div>
            {lines.length
              ? lines.map((l, i) => (
                  <div key={i} className="schematic-tooltip-line">{l}</div>
                ))
              : <div className="schematic-tooltip-line schematic-tooltip-empty">–</div>}
          </div>
        );
      })()}
    </div>
  );
}
