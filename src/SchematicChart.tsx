// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026

/**
 * SCHEMATIC chart view (Dirk, 24.08.2026) — a separate renderer over the same
 * case state, like PerioChart. Phase 1: DISPLAY ONLY. Rebuilds its SVG on every
 * state change; pinned dir="ltr" so tooth geometry never mirrors under RTL.
 */
import { useEffect, useState } from "react";
import { onStateChange, getToothDisplayState } from "./odontogram";
import { buildSchematicSvg } from "./schematicGraphic";

export default function SchematicChart() {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    const rebuild = () => setSvg(buildSchematicSvg(getToothDisplayState));
    rebuild();
    return onStateChange(rebuild);
  }, []);
  return (
    <div className="schematic-chart-wrap" dir="ltr"
         dangerouslySetInnerHTML={{ __html: svg }} />
  );
}
