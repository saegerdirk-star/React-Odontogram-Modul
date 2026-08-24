# Test Fixture: acpx-dispatch

## Test 1 — Session-first dispatch

**Input:** "Use the Library ACPX transport for a long-running review."

**Expected behavior:**

- The calling workflow chooses the harness and exact model before invocation.
- The shim runs `sessions ensure` and `prompt`.
- Omitting `--session` uses the cwd-scoped default session; a stable name selects
  a named stream.
- The command uses unique `--events-file` and `--answer-file` paths.

**Pass criteria:** No implicit `exec`, model alias resolution, or review-family
decision occurs in the shim.

## Test 2 — Intentional one-shot execution

**Input:** "Run this as an intentional one-shot with no session history."

**Expected behavior:** The caller passes `--exec` explicitly. Combining it with
`--session` or an effort override fails before ACPX starts.

**Pass criteria:** `exec` appears only after explicit opt-in and never as a
fallback from a session error.

## Test 3 — Exclusive transport outputs

**Input:** A caller names run-bound event and answer files.

**Expected behavior:**

- The remote prompt never asks the agent to write either path.
- The shim hashes the complete raw stream into bounded immutable evidence and
  atomically writes the exact terminal answer.
- A missing terminal ACP result is a transport failure, not a clean review.

**Pass criteria:** Both outputs are produced by the shim and semantic validation
remains caller-owned.

## Test 4 — Session observability

**Input:** The long-running dispatch needs a liveness check.

**Expected behavior:** Query `ccore acpx status --agent <agent>
[--session <name>]` and interpret only `alive`, `idle`, `dead`, or `no-session`.
The query does not ensure or configure a session. Do not use
`sessions show` or file size as liveness/completion signals.

**Pass criteria:** Candidate-bound terminal answer plus bounded transport evidence
remain the completion proof even when the provider stream exceeds 256 KiB.

## Test 5 — Version floor

**Input:** The ambient executable reports ACPX 0.12.x.

**Expected behavior:** Fail before session preparation with a diagnostic requiring
0.13.0 or newer.

**Pass criteria:** The shim enforces the 0.13.0 floor and no code path silently
falls back to 0.12 semantics.

## Test 6 — Non-blocking aggregate telemetry

**Input:** A caller invokes the shim with `--caller bead-reviewer`.

**Expected behavior:** The shim inserts and terminally updates one
`acpx_dispatches` row in the canonical Library `metrics.db`. The row contains
metadata and counters, never prompt, answer, event content, or artifact paths.

**Pass criteria:** Success and failure outcomes are queryable by caller, harness,
and execution mode; a metrics database failure does not change the dispatch.

## Test 7 — Turn budgets are refused

**Input:** A caller adds `--max-turns 3` or `--maxturns 3` to either action.

**Expected behavior:** Argument validation fails before ACPX starts and points to
`--timeout` as the only supported time bound.

**Pass criteria:** No constructed ACPX command contains a turn-budget option.

## Test 8 — Direct ACPX execution is denied

**Input:** An agent shell invokes an operational command such as `acpx claude exec`.

**Expected behavior:** The provider-session DCG pack denies the command and names
`ccore acpx run` or `status` as the replacement. Help/version remains allowed.

**Pass criteria:** Direct execution and status probes are denied across common
wrappers while `ccore acpx` invocations pass the same corpus.

## Test 9 — Absent effort override

**Input:** A caller with no effort preference passes `--reasoning none`.

**Expected behavior:** No effort config option is set on the session and the prompt
still runs. An unsupported effort instead fails before any model turn, naming the
adapter, the config option id, the rejected value, and the advertised alternatives.

**Pass criteria:** No caller maintains its own per-adapter effort vocabulary, and a
setup failure is reported by step name rather than as an opaque session error.
