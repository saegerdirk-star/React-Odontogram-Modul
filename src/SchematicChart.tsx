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
 *  - The FIRST click on a tooth only selects it. Clicking a SURFACE zone of a
 *    tooth that is already selected enters a finding there via
 *    `applyShorthand` (filling with the armed material, else caries) — the same
 *    token the keypad's surface keys emit, so it batches over the whole
 *    selection exactly like the anatomical surface-cross checkboxes.
 *  - Clicking a root canal of a selected tooth cycles its endo state (or moves
 *    a resected root).
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  onStateChange,
  getToothDisplayState,
  getToothStateSummary,
  cycleEndoCanal,
  setRootResection,
  handleChartKeydown,
  formatToothLabel,
  getWisdomVisible,
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
    // Same number and same hidden wisdom teeth as the anatomical chart.
    const WISDOM = new Set([18, 28, 38, 48]);
    const rebuild = () => setSvg(buildSchematicSvg(getToothDisplayState, {
      label: formatToothLabel,
      hidden: (tn) => !getWisdomVisible() && WISDOM.has(tn),
    }));
    rebuild();
    return onStateChange(rebuild);
  }, []);

  // Keyboard entry (Dirk, 25.09.2026 — charly works by keyboard): the schematic
  // view has no focusable tooth tile, so the keys are taken at the document
  // while this view is mounted and handed to the engine's shorthand
  // (`handleChartKeydown`: buffer, Tab walk, arrows, Enter, Esc, Cmd+Z). Typing
  // in a field or a dialog is left alone, and a key a tile already handled
  // (the hidden anatomical grid keeps its own listeners) is not taken twice.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const el = e.target as Element | null;
      if (el?.closest?.("input, textarea, select, [contenteditable=''], [contenteditable='true'], [role='dialog'], #toothGrid")) return;
      handleChartKeydown(e);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Re-stamp the active columns after EVERY render, not only when `svg` or
  // `selected` change: React can re-apply the innerHTML on a render where
  // neither did, which wiped the highlight while the tooth stayed selected
  // (seen after a key that wrote nothing, 25.09.2026). The classes are derived
  // from `selected` alone, so re-deriving them each time is always right.
  useLayoutEffect(() => {
    const root = wrapRef.current;
    if (!root) return;
    root.querySelectorAll(".schematic-hit.is-active").forEach((e) => e.classList.remove("is-active"));
    root.querySelectorAll(".is-armed").forEach((e) => e.classList.remove("is-armed"));
    for (const tn of selected) {
      root.querySelector(`.schematic-hit[data-tooth="${tn}"]`)?.classList.add("is-active");
      // Only a SELECTED tooth's surfaces and canals take input (see onClick);
      // mark them so the hover highlight shows only where a click enters a finding.
      root.querySelectorAll(`.schematic-surf-hit[data-tooth="${tn}"], .schematic-canal-hit[data-tooth="${tn}"]`)
        .forEach((e) => e.classList.add("is-armed"));
    }
  });

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
          // A surface or canal zone covers nearly every pixel of a tooth, so it
          // enters a finding ONLY on a tooth that is already selected. The first
          // click on a tooth selects it and writes nothing — before, it wrote
          // caries (top view) or cycled a root filling (root) on the way to
          // selecting it, so choosing a tooth by mouse charted a finding
          // (Dirk, 25.09.2026: "Die Eingabe per Maus funktioniert nicht korrekt").
          const armed = (el: HTMLElement | null) =>
            !!el?.dataset.tooth && selected.includes(Number(el.dataset.tooth)) && !e.shiftKey && !e.metaKey && !e.ctrlKey;
          // 1) a surface zone of a selected tooth → enter a finding there
          const surfEl = (e.target as Element | null)?.closest?.("[data-surf]") as HTMLElement | null;
          if (armed(surfEl) && surfEl?.dataset.tooth && surfEl.dataset.surf) {
            onSurface(Number(surfEl.dataset.tooth), surfEl.dataset.surf);
            return;
          }
          // 2) a root canal of a selected tooth → cycle endo (or move a resected root)
          const canalEl = (e.target as Element | null)?.closest?.("[data-canal]") as HTMLElement | null;
          if (armed(canalEl) && canalEl?.dataset.tooth && canalEl.dataset.canal) {
            const tn = Number(canalEl.dataset.tooth);
            const canal = canalEl.dataset.canal;
            const rr = getToothDisplayState(tn).rootResection;
            if (rr === "hemisection" || rr === "amputation") setRootResection(tn, rr, canal);
            else cycleEndoCanal(tn, canal);
            return;
          }
          // 3) otherwise select — plain / shift-range / ctrl-toggle (also the first
          //    click on a surface or canal of a tooth that is not selected yet)
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
            {/* the number the chart shows (numbering system, 74 for a milk tooth on 34) */}
            <div className="schematic-tooltip-title">{formatToothLabel(tip.tn)}</div>
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
