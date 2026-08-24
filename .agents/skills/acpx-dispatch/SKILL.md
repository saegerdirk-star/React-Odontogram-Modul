---
name: acpx-dispatch
description: >-
  Use for agent-shell ACPX execution and session-status inspection through the
  installed `ccore acpx` command. Run mode owns session preparation, output
  extraction, telemetry, and approve-all worktree confinement; status mode is
  read-only. Never use this skill for model/provider routing, prompt composition,
  review policy, verdict validation, or adapter updates.
requires_standards: [mcp-client-timeout]
---

# ACPX Dispatch

This is the narrow ACPX 0.13 agent-shell gateway. The caller gives run mode one
complete prompt file and exact transport choices. It does not add a role prompt,
inject standards, choose a model, decide a route, or interpret the answer.

The transport itself is owned by the installed `ccore` CLI, not by this skill.
This skill is policy-only: it states when to dispatch, what the caller must decide
before dispatching, and how to read the result. It ships no scripts.

Requires `ccore` 2026.8.3 or newer for the transport. Model resolution is
intentionally outside this skill and ccore.

Agent-shell execution goes through this gateway so every invocation receives:

- one bounded immutable transport-evidence file for the invocation;
- one file containing only the terminal assistant answer;
- transport usage/failure telemetry in the Library metrics database;
- refusal of `approve-all` in a main checkout.

Direct operational `acpx` commands are denied by the installed DCG pack. Only
`acpx --help` and `acpx --version` remain direct diagnostics.

## Runtime ownership

Adapter registration and adapter-package updates belong to the operator and
`macmaint`, not to this skill or to `ccore`. This skill ships no provisioning
step and pins no package version.

`ccore acpx` refuses ACPX older than 0.13.0, dispatches to whatever agent name the
ambient ACPX configuration defines, and fails loudly when an adapter command is
missing. A failure of that kind is an environment stop for the operator, not
something a caller works around.

## Session-first contract

Persistent execution is the default. `ccore acpx run` runs `sessions ensure`,
applies the caller's exact model and reasoning settings to that session, and then
calls `prompt`.

- Omit `--session` for ACPX's cwd-scoped default session.
- Pass a stable `--session <name>` for an independently monitorable workstream.
- Pass `--exec` only when the caller deliberately wants a temporary one-shot
  session without persistence, queueing, history, or status.
- `--exec` cannot be combined with `--session` or an effort override.
- `--max-turns` and `--maxturns` are refused. Use `--timeout` only when transport
  time itself must be bounded.

## Invocation

```text
ccore acpx run \
  --agent <adapter> \
  --model <exact-adapter-model-id> \
  --reasoning <adapter-supported-effort|none> \
  --session <stable-name> \
  --cwd <linked-worktree> \
  --caller <stable-workflow-id> \
  --prompt-file <complete-prompt-file> \
  --permissions <approve-reads|approve-all|deny-all> \
  --events-file <unique-run.events.ndjson> \
  --answer-file <unique-run.answer.md>
```

`--harness`, `--reasoning-effort`, `--evidence-file`, and `--verdict-file` are
compatibility aliases. Omitting `run` keeps the legacy default action; new callers
name the action explicitly and use the primary option names above.

Direct single-bead review callers invoke this gateway with their complete natural-language
prompt and `permissions=approve-all`; that permission lets a reviewer run verification
commands inside the linked worktree. An Executive Pack aggregate review caller instead
uses the permission binding from its Pack contract. In both cases the reviewer remains
behaviorally read-only. `ccore acpx` stays transport-only and enforces that
`approve-all` is used only inside a linked worktree.

## Reasoning effort

`--reasoning none` means "leave the adapter default in place": no effort config
option is set and the prompt still runs. Pass it whenever the caller has no effort
preference, instead of inventing a value.

Any other value is checked against the values the prepared session advertises for
the adapter's effort config option. An unsupported effort fails before the effort
is set and before any model turn, and the failure names the adapter, the config
option id, the rejected value, and the advertised alternatives. Do not maintain a
per-adapter effort vocabulary in a caller; the session is the authority.

Session setup reports a failure by step name — `sessions-ensure`, `set-mode`,
`set-model`, `set-effort` — together with the exact ACPX subcommand that failed.
Read that step name before concluding anything about the remote agent: a setup
failure means no model turn happened at all.

## Outputs

`ccore acpx` is the exclusive writer of both output paths. They must be
distinct. Never instruct the remote agent to write either one. The remote agent
returns its answer through ACP; the transport extracts the adapter's `final_answer`
chunks and atomically writes the answer file. For adapters without phase marks,
it falls back to all assistant-message chunks.

The transport hashes every non-blank ACP content line while streaming but does not copy an
unbounded provider transcript into the evidence artifact. It atomically writes one
small `cognovis.acpx-transport-evidence.v1` object containing non-blank content byte/event counts,
the complete content-stream digest, terminal session/stop data, and the exact answer digest.
This keeps immutable review evidence below the 256 KiB integrity cap even when provider
commentary is large; the separate answer file preserves the exact terminal verdict.

The process succeeds only when ACPX exits zero and emits both a stop reason and a
non-empty terminal assistant answer. File existence, non-empty transport evidence, or an idle
session is not completion proof. Transport success is not a semantic review verdict;
the caller reads and adjudicates the natural-language answer.

## Monitoring

Run long invocations through the calling harness's background execution. Inspect
the persistent ACPX session through the same gateway:

```text
ccore acpx status \
  --agent <adapter> \
  --cwd <worktree> \
  --session <stable-name>
```

Omit `--session` for the default session. Status returns JSON and only reports
`alive`, `idle`, `dead`, or `no-session`; it never ensures, configures, or prompts
a session and accepts no run-only options.
Do not retry a session failure as `--exec` and do not poll an output file as a
substitute for process/session state.

## Telemetry

Pass a stable `--caller` such as `bead-reviewer` or
`bead-execution-loop`. The transport inserts a start row and best-effort terminal
update in `acpx_dispatches` inside the canonical Library `metrics.db`.

Stored data is metadata only: caller, adapter, execution/session mode, exact
model and reasoning input, permissions, ACPX version, duration, outcome, exit
state, failed setup step with its exit code and bounded stderr tail, event/token
counts, and answer size. Prompts, answers, event content, and artifact paths are
never stored. A missing, locked, or malformed database never changes the dispatch
result.

## Resources

- `ccore acpx run|status`: the installed transport, session setup, output
  extraction, boundary checks, and telemetry. Source and tests live in
  `cognovis/ccore` (`src/ccore/capabilities/acpx.py`, `tests/test_acpx.py`).
- `tests/acpx-dispatch.test.md`: behavioral fixtures for this skill's policy.
