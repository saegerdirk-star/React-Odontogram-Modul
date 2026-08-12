// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// The controlled-integration boundary in one place (bead odontogram-3l1).
//
// A host owns an `OdontogramDocument` — the versioned JSON `exportStatus()`
// writes and `importStatus()` reads — and drives one mounted odontogram through
// an `OdontogramSession`. That is the entire contract:
//
//     const session = createOdontogramSession(savedDocument);
//     <OdontogramShell session={session} onDocumentChange={save} />
//     session.getDocument();          // read
//     session.setDocument(next);      // write
//     session.subscribe(listener);    // observe
//
// WHAT STAYS OUT. This module exists to make the boundary legible and testable,
// so it must stay free of transport concerns: no HTTP client, no server URL, no
// authentication, no audit provenance, no persistence. Converting the document
// to FHIR is a separate, PURE, optional step (`src/fhir/`), and sending the
// result anywhere is the host's job, never this package's.
//
// The implementation lives in `./odontogram` because it owns the clinical state;
// this module is the documented public surface for it.

export {
  createOdontogramSession,
  getDefaultOdontogramSession,
  getActiveOdontogramSession,
} from "./odontogram";

export type { OdontogramSession, OdontogramDocument } from "./odontogram";
