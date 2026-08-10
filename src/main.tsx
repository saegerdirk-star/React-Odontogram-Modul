// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Created by Zoltan Dul (https://github.com/ZoliQua) 2025-2026

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import KfoViewPrototype from "./prototypes/KfoViewPrototype";
import "./index.css";

const prototypeParams = new URLSearchParams(window.location.search);
const showKfoPrototype = import.meta.env.DEV && prototypeParams.get("prototype") === "kfo";

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(
    <React.StrictMode>
      {showKfoPrototype ? <KfoViewPrototype /> : <App enableNotes />}
    </React.StrictMode>
  );
}
