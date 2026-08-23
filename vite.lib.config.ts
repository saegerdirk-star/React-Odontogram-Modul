// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Created by Zoltan Dul (https://github.com/ZoliQua) 2025-2026
//
// Library build config — produces the distributable npm package artifacts.
//
// Kept SEPARATE from `vite.config.ts` (the demo/GitHub-Pages app build) so
// `npm run build` keeps emitting the demo site unchanged, while
// `npm run build:lib` emits the consumable library. React and every runtime
// dependency are externalized so the bundle ships only this component's own
// code + inlined SVG/CSS — no second copy of React, no bundled jspdf.
// vite-plugin-dts emits bundled declarations for the root and FHIR entries.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    dts({
      // Bundled dist/index.d.ts and dist/fhir.d.ts declarations (via
      // @microsoft/api-extractor) instead of a tree of per-file .d.ts — hides internal __*ForTest declarations and
      // resolves cleanly under any moduleResolution (no extensionless relative
      // imports in the output). NOTE: vite-plugin-dts v5 calls this option
      // `bundleTypes` (v4 called it `rollupTypes`).
      bundleTypes: true,
      entryRoot: './src',
      tsconfigPath: './tsconfig.build.json',
      include: ['src'],
      // `src/live` is the Aidbox live-mode dev app (bead odontogram-6fi). It is
      // an entry beside the library, never a part of it: excluded here so no
      // @polaris SDK type can reach the published declarations.
      exclude: ['src/main.tsx', 'src/live/**', 'src/**/__tests__/**', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    lib: {
      entry: {
        index: path.resolve(__dirname, 'src/index.ts'),
        fhir: path.resolve(__dirname, 'src/fhir/index.ts'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => entryName === 'index' ? 'odontogram.js' : `${entryName}.js`,
      // Guarantee a stable, single stylesheet name (dist/style.css).
      cssFileName: 'style',
    },
    // One combined stylesheet instead of per-chunk CSS.
    cssCodeSplit: false,
    sourcemap: true,
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // Do NOT bundle React or the one runtime dep — the consumer provides
      // React (peer) and jspdf (dep, lazy-loaded via dynamic import).
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'jspdf',
      ],
    },
  },
})
