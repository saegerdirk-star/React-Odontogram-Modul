// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Bead odontogram-6fi: the live-mode chrome.
//
// Minimal on purpose — a patient line, Load, Save, a status line and the load
// report, wrapped around the unchanged `OdontogramShell`. The shell is driven
// through the odontogram-3l1 session boundary (`createOdontogramSession` +
// `session` prop), so live mode is a HOST of the library here, not a fork of
// it: everything below the session API is the same code the demo app runs.
//
// The strings are plain English and stay in this file. They are app chrome, not
// library UI — putting them through `src/i18n/translations.ts` would grow the
// library's twelve-language surface for a developer tool.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import OdontogramShell from "../App";
import { createOdontogramSession } from "../session";
import type { OdontogramSession } from "../session";
import { createAidboxGateway } from "./aidbox";
import { resolveLiveConfig } from "./config";
import type { LiveConfig } from "./config";
import { loadPatientChart } from "./load";
import type { LoadReport } from "./load";
import { buildWritePlan } from "./writePlan";
import type { SkippedResource } from "./writePlan";
import { executeWritePlan, isSaveAllowed } from "./save";
import type { LoadOutcome } from "./save";

type Status =
  | { kind: "idle" }
  | { kind: "busy"; text: string }
  | { kind: "ok"; text: string }
  | { kind: "error"; text: string };

/**
 * Today, in the LOCAL calendar. `toISOString()` is UTC, so west of Greenwich it
 * dates an evening examination to the day before — and an examination date is
 * read as the day the patient sat in the chair.
 */
function today(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const panel: React.CSSProperties = {
  border: "1px solid #d0d0d0",
  borderRadius: "6px",
  padding: "0.75rem 1rem",
  margin: "0 0 1rem",
  fontFamily: "system-ui, sans-serif",
  fontSize: "0.9rem",
};

function SetupHint({ missing, invalid }: { missing: string[]; invalid: string[] }) {
  return (
    <div style={{ ...panel, maxWidth: "48rem", margin: "2rem auto" }}>
      <h1 style={{ fontSize: "1.1rem", margin: "0 0 0.5rem" }}>Aidbox live mode is not configured</h1>
      <p style={{ margin: "0 0 0.5rem" }}>
        Copy <code>.env.example</code> to <code>.env</code> and supply the missing values, then restart the dev server.
        A patient can also be named on the URL as <code>?patient=&lt;id&gt;</code>.
      </p>
      <ul>{missing.map((key) => <li key={key}><code>{key}</code></li>)}</ul>
      {invalid.length > 0 && (
        <ul>{invalid.map((problem) => <li key={problem} style={{ color: "#b3261e" }}>{problem}</li>)}</ul>
      )}
      <p style={{ margin: "0.5rem 0 0" }}>
        Use the scoped machine client only. See <code>docs/aidbox-live-mode.md</code>.
      </p>
    </div>
  );
}

function ReportPanel({ report, skipped }: { report?: LoadReport; skipped: SkippedResource[] }) {
  if (!report && !skipped.length) return null;
  return (
    <div style={panel}>
      {report && (
        <div>
          <strong>Load report:</strong>{" "}
          {report.fetched} resource(s) read, {report.dentalCore} offered to the Dental Core codec,{" "}
          {report.unsupported.length} not supported.
          {report.error && <div style={{ color: "#b3261e" }}>{report.error}</div>}
          {report.truncated?.length ? (
            <div style={{ color: "#b3261e" }}>
              <strong>Partial read:</strong> the search for {report.truncated.join(", ")} hit the page budget.
              Saving is disabled — writing back from a partial chart would drop the findings that were never read.
            </div>
          ) : null}
          {report.unsupported.length > 0 && (
            <ul>
              {report.unsupported.map((entry) => (
                <li key={entry.reference}>
                  <code>{entry.reference}</code>
                  {entry.profile ? <> — profile <code>{entry.profile}</code></> : null}
                  <> — {entry.reason}</>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {skipped.length > 0 && (
        <div>
          <strong>Not written:</strong>
          <ul>
            {skipped.map((entry) => (
              <li key={`${entry.resourceType}:${entry.identityKey}`}>
                <code>{entry.identityKey || entry.resourceType}</code> — {entry.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function LiveChart({ config }: { config: LiveConfig }) {
  const session = useMemo<OdontogramSession>(
    () => createOdontogramSession(null, { fhir: { dialect: "dental-core" } }),
    [],
  );
  const gateway = useMemo(() => createAidboxGateway(config), [config]);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [report, setReport] = useState<LoadReport | undefined>(undefined);
  const [skipped, setSkipped] = useState<SkippedResource[]>([]);
  // What the LAST load attempt left behind. Saving hangs on this and on
  // nothing else — see `isSaveAllowed`.
  const [loadOutcome, setLoadOutcome] = useState<LoadOutcome | undefined>(undefined);
  // The date every written resource is stamped with. It comes from the loaded
  // examination where there is one, so a re-save does not re-date the chart.
  const effectiveRef = useRef<string>(today());

  const load = useCallback(async () => {
    setStatus({ kind: "busy", text: `Loading Patient/${config.patientId} ...` });
    setSkipped([]);
    setLoadOutcome(undefined);
    try {
      const result = await loadPatientChart(gateway, config.patientId);
      setReport(result.report);
      setLoadOutcome({
        patientId: config.patientId,
        parsed: result.report.parsed && !!result.document,
        truncated: result.report.truncated,
        error: result.report.error,
      });
      if (!result.document) {
        setStatus({ kind: "error", text: result.report.error ?? "Nothing could be charted" });
        return;
      }
      effectiveRef.current = result.document.examination?.effectiveDateTime ?? today();
      session.setDocument(result.document);
      if (result.report.error) {
        setStatus({ kind: "error", text: result.report.error });
        return;
      }
      setStatus({ kind: "ok", text: `Loaded Patient/${config.patientId}` });
    } catch (error) {
      // A transport failure is a failed load like any other: it must reach the
      // save gate, or a 403 would leave Save enabled over a blank session.
      setLoadOutcome({ patientId: config.patientId, parsed: false, error: message(error) });
      setStatus({ kind: "error", text: `Load failed: ${message(error)}` });
    }
  }, [config.patientId, gateway, session]);

  const save = useCallback(async () => {
    setStatus({ kind: "busy", text: "Saving ..." });
    try {
      const plan = buildWritePlan({
        document: session.getDocument(),
        patientId: config.patientId,
        effectiveDateTime: effectiveRef.current,
      });
      setSkipped(plan.skipped);
      const result = await executeWritePlan(gateway, plan);
      if (result.failure) {
        const { op, status: httpStatus, message: text } = result.failure;
        setStatus({
          kind: "error",
          text: `${op.method} ${op.path} failed${httpStatus ? ` (HTTP ${httpStatus})` : ""}: ${text}. `
            + `${result.written.length} operation(s) had already run — the chart on the server is partially updated.`,
        });
        return;
      }
      setStatus({ kind: "ok", text: `Saved ${result.written.length} resource(s) for Patient/${config.patientId}` });
    } catch (error) {
      setStatus({ kind: "error", text: `Save failed: ${message(error)}` });
    }
  }, [config.patientId, gateway, session]);

  useEffect(() => { void load(); }, [load]);

  const busy = status.kind === "busy";
  // Saving is offered ONLY after one clean load of this patient. What is on
  // screen is what would be written, so it has to have come from the server,
  // whole: a failed load, a codec rejection or a partial read each leave a
  // blank or stale session that would be written over the real chart.
  const saveAllowed = isSaveAllowed({ busy, patientId: config.patientId, load: loadOutcome });
  const statusColor = status.kind === "error" ? "#b3261e" : status.kind === "ok" ? "#1b5e20" : "inherit";

  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ ...panel, display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <strong>Aidbox live mode</strong>
        <span>Patient/<code>{config.patientId}</code></span>
        <span style={{ opacity: 0.7 }}>{config.baseUrl}</span>
        <button type="button" onClick={() => void load()} disabled={busy}>Load</button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={!saveAllowed}
          title={saveAllowed ? undefined : "Saving needs one clean, complete load of this patient first"}
        >
          Save
        </button>
        <span role="status" style={{ color: statusColor }}>
          {status.kind === "idle" ? "" : status.text}
        </span>
      </div>
      <ReportPanel report={report} skipped={skipped} />
      <OdontogramShell session={session} enableNotes />
    </div>
  );
}

export default function LiveApp() {
  const resolved = useMemo(
    () => resolveLiveConfig(import.meta.env as Record<string, string | undefined>, window.location.search),
    [],
  );
  if (!resolved.ok) return <SetupHint missing={resolved.missing} invalid={resolved.invalid} />;
  return <LiveChart config={resolved.config} />;
}
