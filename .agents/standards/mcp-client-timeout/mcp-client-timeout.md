---
domain: mcp-client-timeout
description: Client-side MCP idle timeouts on long-running delegated sessions are transport artifacts, not work failures — never retry the dispatch, recover the handle, and poll external state instead.
---

# MCP Client Timeout

> **Scope**: Dev-plane standard for orchestration skills/agents that dispatch long-running work (implementer or reviewer sessions) through delegation transports. Recurred across 4+ beads with the retired private MCP gateway; the rules are transport-generic and apply to ACPX dispatches.

## Core facts

| Fact | Detail |
| --- | --- |
| The client timeout is independent of the server budget | MCP clients apply a default idle timeout (~300s, no progress heartbeat) that is unrelated to any `timeout_sec` requested from the tool. A long high-effort turn reliably "fails" client-side while the server-side session keeps running and completes. |
| A timeout is not a dead session | After a client-side timeout the delegated process is usually still alive and committing. Treating the timeout as failure produces false aborts; observed sessions completed autonomously long after the client gave up. |
| Retrying the dispatch is the real hazard | Re-issuing the start/continue call after a timeout creates a second, concurrent session against the same worktree and run ID. This escalated into a live incident: two processes writing the same files concurrently. The timeout itself loses nothing; the retry corrupts state. |
| The handle survives outside the transport | Session identity is recoverable from the dispatch's on-disk state (state file or dispatch record), so a lost tool-call result does not orphan the session. Progress is then observed via a status poll, not a new dispatch. |
| External state is the ground truth | Whether delegated work is alive or done is decided by polling its observable output — git HEAD advancing in the target worktree, `git status`/`git log` for the expected commits, workspace or process state — never by the transport's error surface. |
| Exit signals decouple from work quality | A PARTIAL or non-zero exit (e.g. from an infra stall in a background thread) says nothing about the produced code. The diff and tests are verified independently before the result is rejected or retried. |

## Mitigation

A per-server client timeout override above the longest expected turn removes the
false-failure window at the source; the behavioral rules above remain the
fallback wherever the default applies.
