// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Bead odontogram-6fi: the live-mode entry point, served by `npm run dev` at
// /live.html. It is a SECOND app entry beside `src/main.tsx`, never part of the
// library build — see `vite.lib.config.ts` and `tsconfig.build.json`.

import React from "react";
import { createRoot } from "react-dom/client";
import LiveApp from "./LiveApp";
import "../index.css";

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(
    <React.StrictMode>
      <LiveApp />
    </React.StrictMode>,
  );
}
