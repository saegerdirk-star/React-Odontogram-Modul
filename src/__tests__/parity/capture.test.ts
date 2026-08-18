// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Created by Zoltan Dul (https://github.com/ZoliQua) 2025-2026

import { test } from "vitest";
import { runCapture } from "./capture";
// Guarded: the normal suite skips this; only `npm run parity:capture` (which sets
// PARITY_CAPTURE) runs it, so the frozen goldens are never re-captured accidentally.
//
// Generous timeout: capturing 4000+ SVG fingerprints via jsdom parsing takes
// about a minute and a half here. Each case parses its template into a fresh
// jsdom Document, so the run also needs a raised heap:
//
//   NODE_OPTIONS=--max-old-space-size=16384 npm run parity:capture
//
// Node's default limit (~4 GB) is not enough for the full 32-template matrix.
test.skipIf(!process.env.PARITY_CAPTURE)("capture frozen parity fixtures (one-time)", () => {
  runCapture();
}, 300000);
