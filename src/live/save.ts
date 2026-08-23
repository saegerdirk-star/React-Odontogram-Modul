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
      await target.put(op.path, op.resource);
    } catch (error) {
      return { written, failure: { op, message: messageOf(error), status: statusOf(error) } };
    }
    written.push(op);
  }
  return { written };
}
