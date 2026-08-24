# Model Routing

Model selection for repository delivery is behavioral prompt policy. The initiating
prompt supplies one readable paragraph naming the implementation owner, Reviewer 1,
Reviewer 2, and fallback. Explicit caller wording overrides launcher defaults, provided
the implementation actor remains distinct and the required review perspectives remain
different-family.

STATUS: BEHAVIORAL POLICY. The repository delivery owner follows the role paragraph.
Transport proves session execution, not semantic role compliance. Normal Solo and
Executive Pack progression has no JSON role payload, route resolver, profile registry,
candidate selector, or deterministic model-selection choreography.

## Defaults

For a Codex-owned delivery, use a distinct `gpt-5.6-sol` implementation sub-agent with
medium reasoning, Opus as Reviewer 1, and Grok via Cursor as Reviewer 2. If either
review provider is unavailable, use a fresh GPT-5.6 reviewer with high reasoning only
when actor and family separation remain valid.

For a Claude-owned delivery, use a distinct Opus implementation sub-agent, a fresh
`gpt-5.6-sol` Reviewer 1 with high reasoning, and Grok via Cursor as Reviewer 2. If a
named review provider is unavailable, use a fresh Opus fallback only when actor and
family separation remain valid.

These are launcher defaults, not a registry. A compatible caller may name other actors
in the paragraph. It may not make the repository delivery owner the implementation
actor, reuse one actor for required distinct perspectives, or turn provider absence into
approval.

## Transport boundary

Agent-shell work uses the installed ACPX dispatcher with an exact adapter, advertised
model ID, reasoning effort, stable session, linked worktree, complete prompt file,
permissions, and unique event and answer files. A route names an adapter, never a shell
fragment. A review has no turn budget. Code reviewers receive worktree-confined
`approve-all` so they can run verification while remaining behaviorally read-only.

Persistent prompt execution is the default. One-shot execution requires an explicit
transport choice. A zero exit, terminal stop reason, and non-empty answer prove transport
completion only. Missing output, unavailable providers, or a non-passing semantic result
return control to the delivery owner and never authorize progression.

### Model identifiers

A route names a canonical model; what an adapter accepts is a
verified dispatch input. The two are sometimes the same string and sometimes not,
and which case applies is not something a caller can read off the alias.
`ccore model resolve grok-4.6 --via cursor` returns the bare `grok-4.6`, which
dispatches unchanged because ACPX normalizes it to the one advertised bracketed
identifier that matches it. So the caller takes the dispatch input from
`ccore model resolve <alias> [--via <agent>]`, whose deterministic table carries a
verification date per entry, instead of deciding which case applies. Guessing an
identifier from a provider CLI, a marketing name, or memory is not a substitute for
that lookup, and neither is assuming the alias must be rewritten.

The rules below were verified by live dispatch on 2026-08-17. A rule without such a
date is unverified and does not belong here.

- The cursor adapter advertises bracketed identifiers through its `model` configuration
  option, for example `grok-4.6[effort=high,fast=true]`.
  ACPX normalizes a bare name only when exactly one bracketed variant matches it.
  Provider-CLI identifiers, such as the `cursor-grok-4.6-high-fast` and `auto` values
  that `agent models` prints, are rejected with ACP error `-32602`. (2026-08-17)
- A persistent ACPX session keeps the model it was last set to, so the caller passes
  `--model` explicitly on every dispatch rather than relying on session state.
  (2026-08-17)

## Ownership

- The repository delivery owner chooses and prompts actors, sequences Beads, evaluates
  findings, owns callbacks, and invokes Session Close.
- The implementation owner remains one distinct persistent session for source changes
  and every accepted repair.
- Reviewer 1 supplies cumulative member coverage in an Executive Pack.
- Reviewer 2 supplies the complete different-family final adversarial perspective.
- Agentic acceptance, security, and applicable project-specific checks remain distinct
  evidence perspectives and never repair source.

Transport telemetry is operational evidence only. Role quality, perspective quality,
finding severity, and repair decisions remain caller-owned judgment.
