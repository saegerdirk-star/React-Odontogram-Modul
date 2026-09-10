#!/usr/bin/env node
// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
//
// Bead odontogram-wt5: emit representative OBSERVED and PLANNED Dental Core
// collections to /tmp for the HL7 validator. Not a public package export.

import { writeFileSync } from "node:fs";
import { PAYLOAD_VERSION } from "../src/document";
import { buildDentalCoreBundle } from "../src/fhir/toFhirDentalCore";
import type { OdontogramExportPayload } from "../src/fhir/types";

const options = { subject: "Patient/example", effectiveDateTime: "2026-08-14T17:00:31Z" };

function observed(): OdontogramExportPayload {
  return {
    version: PAYLOAD_VERSION,
    globals: {},
    teeth: {
      "16": {
        caries: ["caries-occlusal"],
        cariesSeverity: { occlusal: 5 },
        pulpDx: "necrosis",
        apicalDx: "acute-apical-abscess",
      },
      "26": { restorationType: "crown", restorationMaterial: "zircon" },
      "36": { endo: "endo-filling" },
    },
  };
}

function planned(): OdontogramExportPayload {
  return {
    ...observed(),
    plan: { "36": { restorationType: "crown", restorationMaterial: "zircon" } },
  };
}

const observedPath = "/tmp/odontogram-wt5-observed-dental-core.json";
const plannedPath = "/tmp/odontogram-wt5-planned-dental-core.json";
writeFileSync(observedPath, JSON.stringify(buildDentalCoreBundle(observed(), options), null, 2));
writeFileSync(plannedPath, JSON.stringify(buildDentalCoreBundle(planned(), options), null, 2));
process.stdout.write(`${observedPath}\n${plannedPath}\n`);
