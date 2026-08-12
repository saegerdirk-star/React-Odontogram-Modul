// Bead odontogram-c51.1 — a bench for looking at the model-analysis card.
//
// Deliberately NOT wired into src/main.tsx: where the card finally lives is
// c51's decision (the third clinical view), and this bench must not pre-empt
// it. Everything here is scaffolding around the real component — the card
// itself is production code and needs no props.
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "../../src/index.css";
import { ModelAnalysisCard } from "../../src/ModelAnalysisCard";
import { setToothWidth, resetToothWidths, setReadOnly, setNumberingSystem } from "../../src/odontogram";
import { setI18nLanguage } from "../../src/i18n/useI18n";
import type { Language } from "../../src/i18n/translations";

/** The reference model measurement supplied with the bead. Widths only. */
const REFERENCE: Record<number, number> = {
  16: 10.5, 15: 6.5, 14: 7.1, 13: 8.1, 12: 7.1, 11: 8.7,
  21: 8.8, 22: 7.0, 23: 8.1, 24: 7.1, 25: 6.4, 26: 10.5,
  46: 11.4, 45: 6.8, 44: 6.8, 43: 7.0, 42: 6.2, 41: 5.8,
  31: 5.8, 32: 6.2, 33: 7.0, 34: 6.8, 35: 6.8, 36: 11.4,
};

const LANGS: Language[] = ["de", "en", "hu", "ar"];

function Bench() {
  const [lang, setLang] = useState<Language>("de");
  useEffect(() => { setI18nLanguage(lang); }, []);
  const [ro, setRo] = useState(false);
  return (
    <div style={{ padding: 20, maxWidth: 980, margin: "0 auto", display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", fontSize: 13 }}>
        <button onClick={() => { for (const [n, w] of Object.entries(REFERENCE)) setToothWidth(Number(n), w); }}>
          Referenzfall füllen
        </button>
        <button onClick={() => resetToothWidths()}>Leeren</button>
        <label>
          Sprache{" "}
          <select value={lang} onChange={e => { const l = e.target.value as Language; setLang(l); setI18nLanguage(l); }}>
            {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <label>
          Nummerierung{" "}
          <select onChange={e => setNumberingSystem(e.target.value as never)}>
            <option value="fdi">FDI</option>
            <option value="universal">Universal</option>
            <option value="palmer">Palmer</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={ro} onChange={e => { setRo(e.target.checked); setReadOnly(e.target.checked); }} />
          {" "}read-only
        </label>
      </div>
      <ModelAnalysisCard />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode><Bench /></React.StrictMode>,
);
