// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Created by Zoltan Dul (https://github.com/ZoliQua) 2025-2026

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Bead odontogram-e8h: Content-Security-Policy fuer den ausgelieferten Demo-Build
// (uebernommen aus Zoltans upstream 7f86651). Spec-Politik plus drei additive
// Haertungen: `blob:` in img-src (der PNG/JPG/PDF-Export rastert das SVG ueber
// eine Blob-URL <img>), object-src 'none', base-uri 'self'. Geprueft an unserem
// Baum: keine externen Fonts, kein eval/Worker, kein data:-Font - `font-src
// 'self'` und `script-src 'self'` reichen; `style-src 'unsafe-inline'` bleibt
// noetig, weil die Anzeige inline-styles setzt und Vite das CSS inline einspeist.
// NUR im Build (`apply: "build"`): der Dev-Server braucht Vites Inline-Preamble.
const CSP_CONTENT =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; " +
  "object-src 'none'; base-uri 'self'";

function injectCsp() {
  return {
    name: "inject-csp",
    apply: "build" as const,
    transformIndexHtml() {
      return [{
        tag: "meta",
        attrs: { "http-equiv": "Content-Security-Policy", content: CSP_CONTENT },
        injectTo: "head-prepend" as const,
      }];
    },
  };
}

export default defineConfig({
  plugins: [react(), injectCsp()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
