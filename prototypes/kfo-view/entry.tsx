import React from "react";
import { createRoot } from "react-dom/client";
import "../../src/index.css";
import KfoViewPrototype from "./KfoViewPrototype";

const rootElement = document.getElementById("root");

if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <KfoViewPrototype />
    </React.StrictMode>,
  );
}
