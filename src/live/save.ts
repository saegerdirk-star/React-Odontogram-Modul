// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Bead odontogram-6fi: running a write plan.
//
// Thin ON PURPOSE. Everything that decides what is written and under which id
// lives in `./writePlan.ts` and is pure; this module only performs the writes
// in the order the plan gives them and stops at the first failure.
//
// NO SILENT PARTIAL SUCCESS. The transport SPI has no transaction bundle and no
// PATCH, so the resources written before a failure stay written. That cannot be
// prevented here — it can only be REPORTED, which is why the failure carries
// the op and the HTTP status, and why the caller shows both.

import type { WriteOp, WritePlan } from "./writePlan";

export interface WriteFailure {
  op: WriteOp;
  message: string;
  status?: number;
}

export interface WriteResult {
  written: WriteOp[];
  failure?: WriteFailure;
}

/** Only the write half of the gateway, so a test needs no server and no client. */
export interface WriteTarget {
  put(path: string, resource: unknown): Promise<unknown>;
  delete(path: string): Promise<unknown>;
}

/** What the last load attempt left behind, as far as saving is concerned. */
export interface LoadOutcome {
  /** The patient that load was for. */
  patientId: string;
  parsed: boolean;
  truncated?: string[];
  error?: string;
}

/**
 * Whether saving may be offered at all.
 *
 * A save overwrites what is on the server with what is on screen, so it is
 * allowed only when what is on screen actually CAME from the server, for THIS
 * patient, whole and undamaged. A 403, a 500, a codec rejection or a truncated
 * read each leave a blank or stale session behind, and saving from one of those
 * writes that blankness over the authoritative chart — the one failure mode in
 * this whole mode that destroys data rather than failing to record it.
 *
 * Pure, so the rule can be pinned by a test instead of by clicking.
 */
export function isSaveAllowed(input: { busy: boolean; patientId: string; load?: LoadOutcome }): boolean {
  const { busy, patientId, load } = input;
  if (busy || !load) return false;
  if (load.patientId !== patientId) return false;
  return load.parsed && !load.error && !(load.truncated?.length ?? 0);
}

function statusOf(error: unknown): number | undefined {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : undefined;
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function executeWritePlan(target: WriteTarget, plan: WritePlan): Promise<WriteResult> {
  const written: WriteOp[] = [];
  for (const op of plan.ops) {
    try {
      // A removal is as much part of the save as a write, and fails as visibly.
      if (op.method === "DELETE") await target.delete(op.path);
      else await target.put(op.path, op.resource);
    } catch (error) {
      return { written, failure: { op, message: messageOf(error), status: statusOf(error) } };
    }
    written.push(op);
  }
  return { written };
}
