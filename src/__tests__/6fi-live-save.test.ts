// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Cognovis fork - https://github.com/cognovis/React-Odontogram-Modul
// Dirk Saeger, Malte Sussdorff 2026
//
// Bead odontogram-6fi, seam 5: the executor.
//
// The transport SPI carries no transaction bundle, so a save is a SEQUENCE of
// single-resource writes and a failure halfway through leaves the earlier ones
// on the server. That risk is real and named in the bead's pre-mortem; what is
// forbidden is hiding it. The executor stops at the first failure and reports
// WHICH write failed, with the HTTP status — never a silent partial success.

import { describe, it, expect } from "vitest";
import { executeWritePlan } from "../live/save";
import type { WriteOp } from "../live/writePlan";

function op(id: string): WriteOp {
  return {
    method: "PUT",
    path: `/Observation/${id}`,
    resourceType: "Observation",
    id,
    identityKey: `Observation/tooth-state/${id}`,
    resource: { resourceType: "Observation", id } as WriteOp["resource"],
  };
}

describe("odontogram-6fi: executing a write plan", () => {
  it("writes every op in order and reports them all as written", async () => {
    const seen: string[] = [];
    const gateway = { async put(path: string) { seen.push(path); return {}; } };
    const result = await executeWritePlan(gateway, { ops: [op("a"), op("b")], skipped: [] });
    expect(seen).toEqual(["/Observation/a", "/Observation/b"]);
    expect(result.written).toHaveLength(2);
    expect(result.failure).toBeUndefined();
  });

  it("stops at the first failure and names the op and the status", async () => {
    const seen: string[] = [];
    const gateway = {
      async put(path: string) {
        seen.push(path);
        if (path.endsWith("/b")) throw Object.assign(new Error("Forbidden"), { status: 403 });
        return {};
      },
    };
    const result = await executeWritePlan(gateway, { ops: [op("a"), op("b"), op("c")], skipped: [] });
    expect(seen).toEqual(["/Observation/a", "/Observation/b"]);
    expect(result.written.map((written) => written.id)).toEqual(["a"]);
    expect(result.failure?.op.id).toBe("b");
    expect(result.failure?.status).toBe(403);
    expect(result.failure?.message).toMatch(/Forbidden/);
  });

  it("survives an error carrying no status", async () => {
    const gateway = { async put() { throw new Error("network down"); } };
    const result = await executeWritePlan(gateway, { ops: [op("a")], skipped: [] });
    expect(result.failure?.status).toBeUndefined();
    expect(result.failure?.message).toMatch(/network down/);
  });
});
