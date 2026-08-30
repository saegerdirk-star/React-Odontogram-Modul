// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026

/**
 * SCHEMATIC chart view (Dirk, 24.08.2026) — a separate renderer over the same
 * case state, like PerioChart. Pinned dir="ltr" so tooth geometry never
 * mirrors under RTL.
 *
 * Editing (odontogram-ip3 and the 30.08.2026 UX pass): NO second mutation path.
 *  - Selecting teeth mirrors the anatomical grid — click / shift-range /
 *    ctrl-toggle / drag-select, all through `setChartSelection` (the same
 *    `selectedTeeth` the wired controls and `applyShorthand` read).
 *  - Clicking a SURFACE zone of the occlusal box enters a finding there via
 *    `applyShorthand` (filling with the armed material, else caries) — the same
 *    token the keypad's surface keys emit, so it batches over the whole
 *    selection exactly like the anatomical surface-cross checkboxes.
 *  - Clicking a root canal cycles its endo state (or moves a resected root).
 */
import { useEffect, useRef, useState } from "react";
import {
  onStateChange,
  getToothDisplayState,
  getToothStateSummary,
  cycleEndoCanal,
  setRootResection,
} from "./odontogram";
import { teethBetween } from "./shorthand";
import { buildSchematicSvg } from "./schematicGraphic";

function toothAt(target: EventTarget | null): number | null {
  const el = (target as Element | null)?.closest?.("[data-tooth]") as HTMLElement | null;
  if (!el) return null;
  const n = Number(el.dataset.tooth);
  return Number.isFinite(n) ? n : null;
}
function toothFromPoint(x: number, y: number): number | null {
  const el = document.elementFromPoint(x, y)?.closest?.("[data-tooth]") as HTMLElement | null;
  if (!el) return null;
  const n = Number(el.dataset.tooth);
  return Number.isFinite(n) ? n : null;
}

const DRAG_THRESHOLD = 4;

export default function SchematicChart({
  selected,
  primary,
  onSelectionChange,
  onSurface,
}: {
  /** The whole selection — every one gets the active highlight. */
  selected: number[];
  /** The active (primary) tooth — the range anchor for the next shift-select. */
  primary: number | null;
  onSelectionChange: (teeth: number[], primary: number) => void;
  onSurface: (toothNo: number, surfChar: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState("");
  const [tip, setTip] = useState<{ tn: number; x: number; y: number } | null>(null);
  // Drag-select bookkeeping (refs — no re-render while dragging).
  const drag = useRef<{ anchor: number; x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    const rebuild = () => setSvg(buildSchematicSvg(getToothDisplayState));
    rebuild();
    return onStateChange(rebuild);
  }, []);

  // Re-stamp the active columns after every (re)build (innerHTML wipes classes).
  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return;
    root.querySelectorAll(".schematic-hit.is-active").forEach((e) => e.classList.remove("is-active"));
    for (const tn of selected) {
      root.querySelector(`.schematic-hit[data-tooth="${tn}"]`)?.classList.add("is-active");
    }
  }, [svg, selected]);

  return (
    <div className="schematic-chart-outer">
      <div
        className="schematic-chart-wrap"
        dir="ltr"
        ref={wrapRef}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          const tn = toothAt(e.target);
          if (tn == null) return;
          drag.current = { anchor: tn, x: e.clientX, y: e.clientY, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < DRAG_THRESHOLD) return;
          d.moved = true;
          const over = toothFromPoint(e.clientX, e.clientY);
          if (over == null) return;
          const span = teethBetween(d.anchor, over);   // same-arch run, arch order
          if (span.length) onSelectionChange(span, over);
        }}
        onPointerUp={() => {
          if (drag.current?.moved) suppressClick.current = true;
          drag.current = null;
        }}
        onClick={(e) => {
          if (suppressClick.current) { suppressClick.current = false; return; }
          // 1) a surface zone → enter a finding there
          const surfEl = (e.target as Element | null)?.closest?.("[data-surf]") as HTMLElement | null;
          if (surfEl?.dataset.tooth && surfEl.dataset.surf) {
            onSurface(Number(surfEl.dataset.tooth), surfEl.dataset.surf);
            return;
          }
          // 2) a root canal → cycle endo (or move a resected root)
          const canalEl = (e.target as Element | null)?.closest?.("[data-canal]") as HTMLElement | null;
          if (canalEl?.dataset.tooth && canalEl.dataset.canal) {
            const tn = Number(canalEl.dataset.tooth);
            const canal = canalEl.dataset.canal;
            const rr = getToothDisplayState(tn).rootResection;
            if (rr === "hemisection" || rr === "amputation") setRootResection(tn, rr, canal);
            else cycleEndoCanal(tn, canal);
            return;
          }
          // 3) otherwise select — plain / shift-range / ctrl-toggle
          const tn = toothAt(e.target);
          if (tn == null) return;
          if (e.shiftKey && primary != null) {
            const span = teethBetween(primary, tn);
            onSelectionChange(span.length ? span : [tn], tn);
          } else if (e.metaKey || e.ctrlKey) {
            const set = new Set(selected);
            if (set.has(tn)) set.delete(tn); else set.add(tn);
            onSelectionChange([...set], tn);
          } else {
            onSelectionChange([tn], tn);
          }
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
